require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const { applyInvestmentDilution } = require("./services/capTable");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.disable("x-powered-by");
app.use(cors({ origin: FRONTEND_ORIGIN, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json({ limit: "100kb" }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "SFITS_DBMS_PRJ",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  queueLimit: 0,
  dateStrings: true,
});

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createToken() {
  return crypto.randomBytes(48).toString("base64url");
}

function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function publicError(res, status, message) {
  return res.status(status).json({ error: message });
}

function handleDbError(res, error) {
  console.error(error);
  if (error && error.code === "ER_DUP_ENTRY") return publicError(res, 409, "A record with the same unique value already exists.");
  if (error && error.code === "ER_NO_REFERENCED_ROW_2") return publicError(res, 400, "A referenced record does not exist.");
  return publicError(res, 500, "Internal server error.");
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return publicError(res, 401, "Authentication required.");

    const token = header.slice(7).trim();
    if (!token) return publicError(res, 401, "Authentication required.");

    const [rows] = await pool.execute(
      `SELECT u.user_id, u.username, u.email, u.role, i.investor_id
       FROM AUTH_SESSION s
       JOIN USERS u ON u.user_id = s.user_id
       LEFT JOIN INVESTOR i ON i.user_id = u.user_id
       WHERE s.token_hash = ? AND s.expires_at > NOW()`,
      [hashToken(token)],
    );

    if (rows.length === 0) return publicError(res, 401, "Session expired or invalid.");
    req.user = rows[0];
    next();
  } catch (error) {
    handleDbError(res, error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return publicError(res, 403, "You do not have permission for this action.");
    next();
  };
}

async function ownsStartup(userId, startupId) {
  const [rows] = await pool.execute(
    `SELECT s.startup_id
     FROM STARTUP s
     WHERE s.startup_id = ?
       AND (s.user_id = ? OR EXISTS (
         SELECT 1 FROM FOUNDER f WHERE f.startup_id = s.startup_id AND f.user_id = ?
       ))
     LIMIT 1`,
    [startupId, userId, userId],
  );
  return rows.length > 0;
}

async function getInvestorForUser(userId) {
  const [rows] = await pool.execute("SELECT * FROM INVESTOR WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0] || null;
}

async function latestSnapshot(connection, startupId) {
  const [rows] = await connection.execute(
    `SELECT eh.founder_id, eh.investor_id, eh.equity_percentage,
            f.founder_name, i.investor_name
     FROM EQUITY_HISTORY eh
     LEFT JOIN FOUNDER f ON f.founder_id = eh.founder_id
     LEFT JOIN INVESTOR i ON i.investor_id = eh.investor_id
     WHERE eh.startup_id = ?
       AND eh.recorded_at = (
         SELECT MAX(recorded_at) FROM EQUITY_HISTORY WHERE startup_id = ?
       )
     ORDER BY eh.ownership_id`,
    [startupId, startupId],
  );
  return rows;
}

async function writeSnapshot(connection, startupId, roundId, holders, recordedAt) {
  const total = holders.reduce((sum, holder) => sum + Number(holder.equity_percentage), 0);
  if (Math.abs(total - 100) > 0.01) throw new Error("CAP_TABLE_TOTAL_INVALID");

  for (const holder of holders) {
    await connection.execute(
      `INSERT INTO EQUITY_HISTORY
       (startup_id, round_id, founder_id, investor_id, equity_percentage, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        startupId,
        roundId,
        holder.founder_id || null,
        holder.investor_id || null,
        Number(holder.equity_percentage),
        recordedAt,
      ],
    );
  }
}

// -------------------- AUTH --------------------
app.post("/signup", async (req, res) => {
  const { username, email, password, role } = req.body || {};

  if (typeof username !== "string" || username.trim().length < 2 || username.trim().length > 100) return publicError(res, 400, "Username must contain 2-100 characters.");
  if (!validEmail(email)) return publicError(res, 400, "Invalid email address.");
  if (typeof password !== "string" || password.length < 8) return publicError(res, 400, "Password must contain at least 8 characters.");
  if (!["founder", "investor"].includes(role)) return publicError(res, 400, "Invalid account role.");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await connection.execute(
      "INSERT INTO USERS (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username.trim(), email.trim().toLowerCase(), passwordHash, role],
    );

    if (role === "investor") {
      await connection.execute(
        `INSERT INTO INVESTOR (investor_name, firm_name, investor_type, country, user_id)
         VALUES (?, 'Independent Investor', 'Angel', 'India', ?)`,
        [username.trim(), result.insertId],
      );
    }

    await connection.commit();
    return res.status(201).json({ message: "Signup successful" });
  } catch (error) {
    await connection.rollback();
    return handleDbError(res, error);
  } finally {
    connection.release();
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!validEmail(email) || typeof password !== "string") return publicError(res, 400, "Invalid login details.");

  try {
    const [users] = await pool.execute(
      `SELECT u.user_id, u.username, u.email, u.password, u.role, i.investor_id
       FROM USERS u
       LEFT JOIN INVESTOR i ON i.user_id = u.user_id
       WHERE LOWER(u.email) = LOWER(?) LIMIT 1`,
      [email.trim()],
    );

    if (users.length === 0) return publicError(res, 401, "Invalid email or password.");
    const user = users[0];
    const matches = await bcrypt.compare(password, user.password);
    if (!matches) return publicError(res, 401, "Invalid email or password.");

    // Legacy seed accounts are linked once at login if their email/name already matches.
    if (user.role === "founder") {
      await pool.execute(
        `UPDATE FOUNDER SET user_id = ?
         WHERE user_id IS NULL AND founder_email IS NOT NULL AND LOWER(founder_email) = LOWER(?)`,
        [user.user_id, user.email],
      );
    } else if (!user.investor_id) {
      const [investor] = await pool.execute(
        "SELECT investor_id FROM INVESTOR WHERE user_id IS NULL AND LOWER(investor_name) = LOWER(?) LIMIT 1",
        [user.username],
      );
      if (investor.length > 0) {
        await pool.execute("UPDATE INVESTOR SET user_id = ? WHERE investor_id = ?", [user.user_id, investor[0].investor_id]);
        user.investor_id = investor[0].investor_id;
      }
    }

    const token = createToken();
    await pool.execute(
      `INSERT INTO AUTH_SESSION (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [user.user_id, hashToken(token), SESSION_DAYS],
    );

    return res.json({
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      investor_id: user.investor_id || null,
      token,
    });
  } catch (error) {
    return handleDbError(res, error);
  }
});

app.post("/logout", requireAuth, async (req, res) => {
  try {
    const token = (req.headers.authorization || "").slice(7).trim();
    await pool.execute("DELETE FROM AUTH_SESSION WHERE token_hash = ?", [hashToken(token)]);
    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    return handleDbError(res, error);
  }
});

// -------------------- STARTUPS --------------------
app.post("/addStartup", requireAuth, requireRole("founder"), async (req, res) => {
  const { startup_name, founded_year, stage, industry_id, city, state, country } = req.body || {};
  if (!startup_name || !founded_year || !stage || !industry_id || !city || !state || !country) return publicError(res, 400, "All startup fields are required.");

  try {
    const [result] = await pool.execute(
      `INSERT INTO STARTUP
       (startup_name, founded_year, stage, industry_id, city, state, country, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [startup_name.trim(), founded_year, stage, industry_id, city.trim(), state.trim(), country.trim(), req.user.user_id],
    );
    return res.status(201).json({ message: "Startup added", startup_id: result.insertId });
  } catch (error) {
    return handleDbError(res, error);
  }
});

app.get("/startups/:user_id", requireAuth, async (req, res) => {
  if (Number(req.params.user_id) !== Number(req.user.user_id)) return publicError(res, 403, "You can only access your own startup workspace.");
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT s.*
       FROM STARTUP s
       LEFT JOIN FOUNDER f ON f.startup_id = s.startup_id
       WHERE s.user_id = ? OR f.user_id = ?
       ORDER BY s.startup_name`,
      [req.user.user_id, req.user.user_id],
    );
    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
});

// -------------------- FOUNDERS --------------------
app.post("/addFounder", requireAuth, requireRole("founder"), async (req, res) => {
  const { founders, startup_id } = req.body || {};
  if (!Array.isArray(founders) || founders.length === 0 || !Number.isInteger(Number(startup_id))) return publicError(res, 400, "Startup and founders are required.");

  const equityValues = founders.map((founder) => Number(founder.equity));
  if (equityValues.some((value) => !Number.isFinite(value) || value <= 0 || value > 100)) return publicError(res, 400, "Founder equity must be between 0 and 100%.");

  if (!(await ownsStartup(req.user.user_id, Number(startup_id)))) return publicError(res, 403, "You do not own this startup.");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingInvestments] = await connection.execute(
      `SELECT COUNT(*) AS count
       FROM INVESTMENT i
       JOIN FUNDING_ROUND fr ON fr.round_id = i.round_id
       WHERE fr.startup_id = ?`,
      [startup_id],
    );
    if (Number(existingInvestments[0].count) > 0) {
      await connection.rollback();
      return publicError(res, 409, "Founders cannot be added after investments have been recorded.");
    }

    const [existing] = await connection.execute("SELECT COALESCE(SUM(initial_equity), 0) AS total FROM FOUNDER WHERE startup_id = ? FOR UPDATE", [startup_id]);
    const total = Number(existing[0].total) + equityValues.reduce((a, b) => a + b, 0);
    if (total > 100.01) {
      await connection.rollback();
      return publicError(res, 400, "Founder ownership cannot exceed 100%.");
    }

    let [rounds] = await connection.execute("SELECT round_id FROM FUNDING_ROUND WHERE startup_id = ? ORDER BY round_date DESC LIMIT 1 FOR UPDATE", [startup_id]);
    let roundId;
    if (rounds.length === 0) {
      const [round] = await connection.execute(
        `INSERT INTO FUNDING_ROUND (round_type, round_date, target_funding, amount_raised, valuation, total_amount_raised, startup_id)
         VALUES ('Initial', CURDATE(), 0, 0, 0, 0, ?)`,
        [startup_id],
      );
      roundId = round.insertId;
    } else {
      roundId = rounds[0].round_id;
    }

    const [nowRows] = await connection.query("SELECT NOW(6) AS snapshot_time");
    const snapshotTime = nowRows[0].snapshot_time;

    for (const founder of founders) {
      let linkedUserId = null;
      if (validEmail(founder.email)) {
        const [users] = await connection.execute("SELECT user_id FROM USERS WHERE LOWER(email) = LOWER(?) LIMIT 1", [founder.email.trim()]);
        linkedUserId = users[0]?.user_id || null;
      }

      const [inserted] = await connection.execute(
        `INSERT INTO FOUNDER (founder_name, founder_email, founder_role, initial_equity, startup_id, user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [founder.name?.trim(), founder.email?.trim() || null, founder.role?.trim() || "Co-Founder", founder.equity, startup_id, linkedUserId],
      );

      await connection.execute(
        `INSERT INTO EQUITY_HISTORY (startup_id, round_id, founder_id, investor_id, equity_percentage, recorded_at)
         VALUES (?, ?, ?, NULL, ?, ?)`,
        [startup_id, roundId, inserted.insertId, founder.equity, snapshotTime],
      );
    }

    await connection.commit();
    res.status(201).json({ message: "All founders added" });
  } catch (error) {
    await connection.rollback();
    handleDbError(res, error);
  } finally {
    connection.release();
  }
});

app.get("/founders/:user_id", requireAuth, async (req, res) => {
  if (Number(req.params.user_id) !== Number(req.user.user_id)) return publicError(res, 403, "You can only access your own founder workspace.");
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT f.*, s.startup_name
       FROM FOUNDER f JOIN STARTUP s ON s.startup_id = f.startup_id
       WHERE s.user_id = ? OR f.user_id = ?
       ORDER BY s.startup_name, f.founder_name`,
      [req.user.user_id, req.user.user_id],
    );
    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
});

// -------------------- FUNDING --------------------
app.post("/addFunding", requireAuth, requireRole("founder"), async (req, res) => {
  const { startup_id, round_type, round_date, valuation, target_funding, total_amount_raised, amount_raised } = req.body || {};
  if (!(await ownsStartup(req.user.user_id, Number(startup_id)))) return publicError(res, 403, "You do not own this startup.");
  if (!validDate(round_date) || !round_type || !validPositiveNumber(valuation)) return publicError(res, 400, "Invalid funding round details.");

  const target = Number(target_funding ?? total_amount_raised ?? 0);
  const raised = Number(amount_raised ?? total_amount_raised ?? 0);
  if (!Number.isFinite(target) || target < 0 || !Number.isFinite(raised) || raised < 0 || raised > target && target > 0) return publicError(res, 400, "Invalid funding amounts.");

  try {
    const [rounds] = await pool.execute("SELECT round_type, round_date FROM FUNDING_ROUND WHERE startup_id = ? ORDER BY round_date", [startup_id]);
    const order = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C"];
    const newIndex = order.indexOf(round_type);
    if (newIndex < 0) return publicError(res, 400, "Invalid funding stage.");

    for (const existing of rounds) {
      const existingIndex = order.indexOf(existing.round_type);
      if (existingIndex >= 0 && existingIndex < newIndex && round_date < String(existing.round_date)) return publicError(res, 400, "Funding round dates must follow the funding-stage order.");
      if (existingIndex >= 0 && existingIndex > newIndex && round_date > String(existing.round_date)) return publicError(res, 400, "Funding round dates must follow the funding-stage order.");
    }

    const [result] = await pool.execute(
      `INSERT INTO FUNDING_ROUND (round_type, round_date, target_funding, amount_raised, valuation, total_amount_raised, startup_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [round_type, round_date, target, raised, valuation, raised, startup_id],
    );
    await pool.execute("UPDATE STARTUP SET stage = ? WHERE startup_id = ?", [round_type, startup_id]);
    res.status(201).json({ message: "Funding added", round_id: result.insertId });
  } catch (error) {
    handleDbError(res, error);
  }
});

app.get("/fundingRounds/:startup_id", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT round_id, round_type, round_date, target_funding, amount_raised, valuation FROM FUNDING_ROUND WHERE startup_id = ? ORDER BY round_date", [req.params.startup_id]);
    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
});

app.get("/funding/:user_id", requireAuth, async (req, res) => {
  if (Number(req.params.user_id) !== Number(req.user.user_id)) return publicError(res, 403, "You can only access your own funding data.");
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT fr.*, s.startup_name
       FROM FUNDING_ROUND fr JOIN STARTUP s ON s.startup_id = fr.startup_id
       LEFT JOIN FOUNDER f ON f.startup_id = s.startup_id
       WHERE s.user_id = ? OR f.user_id = ?
       ORDER BY fr.round_date`,
      [req.user.user_id, req.user.user_id],
    );
    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
});

// -------------------- INVESTORS --------------------
app.get("/investors", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT investor_id, investor_name, firm_name, investor_type, country
       FROM INVESTOR WHERE is_visible = 1 ORDER BY investor_name`,
    );
    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
});

app.post("/addInvestor", requireAuth, async (req, res) => {
  const { name, firm, type, country } = req.body || {};
  if (!name || !firm || !type || !country) return publicError(res, 400, "All investor fields are required.");
  try {
    const linkedUserId = req.user.role === "investor" ? req.user.user_id : null;
    const [result] = await pool.execute(
      `INSERT INTO INVESTOR (investor_name, firm_name, investor_type, country, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), firm.trim(), type, country.trim(), linkedUserId],
    );
    res.status(201).json({ message: "Investor added", investor_id: result.insertId });
  } catch (error) {
    handleDbError(res, error);
  }
});

app.put("/updateInvestor", requireAuth, async (req, res) => {
  const { id, name, firm, type, country } = req.body || {};
  try {
    const [rows] = await pool.execute("SELECT user_id FROM INVESTOR WHERE investor_id = ?", [id]);
    if (rows.length === 0) return publicError(res, 404, "Investor not found.");
    if (req.user.role === "investor" && Number(rows[0].user_id) !== Number(req.user.user_id)) return publicError(res, 403, "You can only update your own investor profile.");

    await pool.execute(
      "UPDATE INVESTOR SET investor_name = ?, firm_name = ?, investor_type = ?, country = ? WHERE investor_id = ?",
      [name.trim(), firm.trim(), type, country.trim(), id],
    );
    res.json({ message: "Investor updated" });
  } catch (error) {
    handleDbError(res, error);
  }
});

app.delete("/deleteInvestor/:id", requireAuth, requireRole("founder"), async (req, res) => {
  try {
    await pool.execute("UPDATE INVESTOR SET is_visible = 0 WHERE investor_id = ?", [req.params.id]);
    res.json({ message: "Investor hidden successfully" });
  } catch (error) {
    handleDbError(res, error);
  }
});

// -------------------- INVESTMENTS --------------------
app.post("/addInvestment", requireAuth, requireRole("investor"), async (req, res) => {
  const { round_id, amount, equity, deal_reference, investment_date } = req.body || {};
  const equityNumber = Number(equity);
  const amountNumber = Number(amount);
  if (!Number.isInteger(Number(round_id)) || !validPositiveNumber(amountNumber) || !Number.isFinite(equityNumber) || equityNumber <= 0 || equityNumber >= 100) return publicError(res, 400, "Invalid investment details.");
  if (investment_date && !validDate(investment_date)) return publicError(res, 400, "Invalid investment date.");

  const investor = await getInvestorForUser(req.user.user_id);
  if (!investor) return publicError(res, 403, "Your investor profile is not configured.");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rounds] = await connection.execute(
      `SELECT fr.round_id, fr.round_type, fr.startup_id, fr.amount_raised, fr.target_funding
       FROM FUNDING_ROUND fr WHERE fr.round_id = ? FOR UPDATE`,
      [round_id],
    );
    if (rounds.length === 0) throw Object.assign(new Error("Invalid funding round."), { statusCode: 400 });
    const round = rounds[0];
    if (round.round_type === "Initial") throw Object.assign(new Error("Investments cannot be recorded against the Initial round."), { statusCode: 400 });

    const [duplicate] = await connection.execute("SELECT investment_id FROM INVESTMENT WHERE investor_id = ? AND round_id = ? LIMIT 1", [investor.investor_id, round_id]);
    if (duplicate.length > 0) throw Object.assign(new Error("This investor already has an investment in this round."), { statusCode: 409 });

    const holders = await latestSnapshot(connection, round.startup_id);
    if (holders.length === 0) {
      const [founders] = await connection.execute("SELECT founder_id, initial_equity FROM FOUNDER WHERE startup_id = ?", [round.startup_id]);
      const founderTotal = founders.reduce((sum, founder) => sum + Number(founder.initial_equity), 0);
      if (Math.abs(founderTotal - 100) > 0.01) throw Object.assign(new Error("Startup cap table is not initialized to 100%."), { statusCode: 409 });
      holders.push(...founders.map((founder) => ({ founder_id: founder.founder_id, investor_id: null, equity_percentage: Number(founder.initial_equity) })));
    }

    const nextSnapshot = applyInvestmentDilution(holders, equityNumber, investor.investor_id, investor.investor_name);
    const [nowRows] = await connection.query("SELECT NOW(6) AS snapshot_time");
    const snapshotTime = nowRows[0].snapshot_time;

    await connection.execute(
      `INSERT INTO INVESTMENT (investor_id, round_id, amount_invested, equity_acquired, investment_date, deal_reference)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [investor.investor_id, round_id, Math.round(amountNumber), equityNumber, investment_date || new Date().toISOString().slice(0, 10), deal_reference?.trim() || null],
    );

    const newRaised = Number(round.amount_raised || 0) + amountNumber;
    await connection.execute(
      "UPDATE FUNDING_ROUND SET amount_raised = ?, total_amount_raised = ? WHERE round_id = ?",
      [newRaised, newRaised, round_id],
    );

    await writeSnapshot(connection, round.startup_id, round_id, nextSnapshot, snapshotTime);
    await connection.commit();
    res.status(201).json({ message: "Investment added successfully", investor_id: investor.investor_id });
  } catch (error) {
    await connection.rollback();
    if (error.statusCode) return publicError(res, error.statusCode, error.message);
    if (error.message === "CAP_TABLE_TOTAL_INVALID") return publicError(res, 409, "Investment would create an invalid cap table.");
    if (error.code === "ER_DUP_ENTRY") return publicError(res, 409, "This investor already has an investment in this round.");
    handleDbError(res, error);
  } finally {
    connection.release();
  }
});

app.get("/investments/:user_id", requireAuth, async (req, res) => {
  if (Number(req.params.user_id) !== Number(req.user.user_id)) return publicError(res, 403, "You can only access your own investment workspace.");
  try {
    const [rows] = await pool.execute(
      `SELECT inv.investor_name, fr.round_type, i.amount_invested, i.equity_acquired, i.investment_date, s.startup_name
       FROM INVESTMENT i
       JOIN INVESTOR inv ON inv.investor_id = i.investor_id
       JOIN FUNDING_ROUND fr ON fr.round_id = i.round_id
       JOIN STARTUP s ON s.startup_id = fr.startup_id
       JOIN FOUNDER f ON f.startup_id = s.startup_id
       WHERE s.user_id = ? OR f.user_id = ?
       ORDER BY i.investment_date DESC`,
      [req.user.user_id, req.user.user_id],
    );
    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
});

app.get("/getInvestor/:user_id", requireAuth, async (req, res) => {
  if (Number(req.params.user_id) !== Number(req.user.user_id)) return publicError(res, 403, "Access denied.");
  try {
    const investor = await getInvestorForUser(req.user.user_id);
    res.json({ investor_id: investor?.investor_id || null });
  } catch (error) {
    handleDbError(res, error);
  }
});

app.get("/myInvestments/:investor_id", requireAuth, async (req, res) => {
  try {
    const [owners] = await pool.execute("SELECT user_id FROM INVESTOR WHERE investor_id = ?", [req.params.investor_id]);
    if (owners.length === 0 || Number(owners[0].user_id) !== Number(req.user.user_id)) return publicError(res, 403, "You can only access your own portfolio.");
    const [rows] = await pool.execute(
      `SELECT s.startup_name, fr.round_type, i.amount_invested, i.equity_acquired, i.investment_date
       FROM INVESTMENT i JOIN FUNDING_ROUND fr ON fr.round_id = i.round_id JOIN STARTUP s ON s.startup_id = fr.startup_id
       WHERE i.investor_id = ? ORDER BY i.investment_date DESC`,
      [req.params.investor_id],
    );
    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
});

app.get("/investorSummary/:investor_id", requireAuth, async (req, res) => {
  try {
    const [owners] = await pool.execute("SELECT user_id FROM INVESTOR WHERE investor_id = ?", [req.params.investor_id]);
    if (owners.length === 0 || Number(owners[0].user_id) !== Number(req.user.user_id)) return publicError(res, 403, "Access denied.");
    const [rows] = await pool.execute(
      `SELECT COALESCE(SUM(amount_invested), 0) AS total_invested,
              COUNT(DISTINCT fr.startup_id) AS total_startups,
              COALESCE(SUM(equity_acquired), 0) AS total_equity
       FROM INVESTMENT i JOIN FUNDING_ROUND fr ON fr.round_id = i.round_id
       WHERE i.investor_id = ?`,
      [req.params.investor_id],
    );
    res.json(rows[0]);
  } catch (error) {
    handleDbError(res, error);
  }
});

// -------------------- CAP TABLE / ANALYTICS --------------------
app.get("/history/:startup_id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT eh.round_id, fr.round_type, fr.round_date,
              eh.founder_id, eh.investor_id,
              COALESCE(f.founder_name, i.investor_name) AS stakeholder,
              CASE WHEN eh.founder_id IS NULL THEN 'Investor' ELSE 'Founder' END AS stakeholder_type,
              eh.equity_percentage, eh.recorded_at
       FROM EQUITY_HISTORY eh
       JOIN FUNDING_ROUND fr ON fr.round_id = eh.round_id
       LEFT JOIN FOUNDER f ON f.founder_id = eh.founder_id
       LEFT JOIN INVESTOR i ON i.investor_id = eh.investor_id
       WHERE eh.startup_id = ?
       ORDER BY fr.round_date, eh.recorded_at, eh.ownership_id`,
      [req.params.startup_id],
    );
    res.json(rows.map((row) => ({
      ...row,
      stakeholder_label: row.stakeholder_type === "Founder" ? "Founder" : "Investor",
      equity_percentage: Number(row.equity_percentage),
    })));
  } catch (error) {
    handleDbError(res, error);
  }
});

app.get("/capTable/:startup_id", async (req, res) => {
  try {
    const rows = await latestSnapshot(pool, Number(req.params.startup_id));
    res.json(rows.map((row) => ({
      stakeholder: row.founder_name || row.investor_name,
      stakeholder_type: row.founder_id ? "Founder" : "Investor",
      stakeholder_label: row.founder_id ? "Founder" : "Investor",
      equity_percentage: Number(row.equity_percentage),
    })));
  } catch (error) {
    handleDbError(res, error);
  }
});

app.get("/capTableAtDate/:startup_id", async (req, res) => {
  const asOfDate = req.query.asOfDate;
  if (!validDate(asOfDate)) return publicError(res, 400, "asOfDate must use YYYY-MM-DD format.");
  try {
    const [rows] = await pool.execute(
      `SELECT eh.founder_id, eh.investor_id,
              COALESCE(f.founder_name, i.investor_name) AS stakeholder,
              CASE WHEN eh.founder_id IS NULL THEN 'Investor' ELSE 'Founder' END AS stakeholder_type,
              eh.equity_percentage
       FROM EQUITY_HISTORY eh
       LEFT JOIN FOUNDER f ON f.founder_id = eh.founder_id
       LEFT JOIN INVESTOR i ON i.investor_id = eh.investor_id
       WHERE eh.startup_id = ?
         AND eh.recorded_at = (
           SELECT MAX(recorded_at) FROM EQUITY_HISTORY
           WHERE startup_id = ? AND recorded_at < DATE_ADD(?, INTERVAL 1 DAY)
         )
       ORDER BY eh.ownership_id`,
      [req.params.startup_id, req.params.startup_id, asOfDate],
    );
    res.json(rows.map((row) => ({ ...row, stakeholder_label: row.stakeholder_type, equity_percentage: Number(row.equity_percentage) })));
  } catch (error) {
    handleDbError(res, error);
  }
});

app.get("/allRounds", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT fr.round_id, fr.round_type, fr.round_date, fr.valuation,
              fr.target_funding, fr.amount_raised, s.startup_id, s.startup_name, s.stage, s.city, s.country,
              COALESCE(x.investor_count, 0) AS investor_count
       FROM FUNDING_ROUND fr JOIN STARTUP s ON s.startup_id = fr.startup_id
       JOIN (SELECT startup_id, MAX(round_date) max_date FROM FUNDING_ROUND GROUP BY startup_id) latest
         ON latest.startup_id = fr.startup_id AND latest.max_date = fr.round_date
       LEFT JOIN (SELECT round_id, COUNT(DISTINCT investor_id) investor_count FROM INVESTMENT GROUP BY round_id) x
         ON x.round_id = fr.round_id
       ORDER BY s.startup_name`,
    );
    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
});

app.get("/startupDashboard/:startup_id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.startup_name, s.stage,
         (SELECT fr.round_type FROM FUNDING_ROUND fr WHERE fr.startup_id=s.startup_id AND fr.round_type <> 'Initial' ORDER BY fr.round_date DESC LIMIT 1) latest_round,
         (SELECT fr.valuation FROM FUNDING_ROUND fr WHERE fr.startup_id=s.startup_id ORDER BY fr.round_date DESC LIMIT 1) valuation,
         COALESCE((SELECT SUM(fr.amount_raised) FROM FUNDING_ROUND fr WHERE fr.startup_id=s.startup_id),0) total_funding,
         COALESCE((SELECT SUM(fr.target_funding) FROM FUNDING_ROUND fr WHERE fr.startup_id=s.startup_id),0) target_funding,
         (SELECT COUNT(DISTINCT i.investor_id) FROM INVESTMENT i JOIN FUNDING_ROUND fr ON fr.round_id=i.round_id WHERE fr.startup_id=s.startup_id) total_investors,
         COALESCE((SELECT SUM(eh.equity_percentage) FROM EQUITY_HISTORY eh WHERE eh.startup_id=s.startup_id AND eh.recorded_at=(SELECT MAX(recorded_at) FROM EQUITY_HISTORY WHERE startup_id=s.startup_id) AND eh.founder_id IS NOT NULL),0) founder_equity
       FROM STARTUP s WHERE s.startup_id=?`,
      [req.params.startup_id],
    );
    res.json(rows[0] || null);
  } catch (error) {
    handleDbError(res, error);
  }
});

// Investor-startup matching: industry fit is the primary signal; country adds a smaller preference.
app.get("/investorMatches/:startup_id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT i.investor_id, i.investor_name, i.firm_name, i.investor_type, i.country,
              CASE
                WHEN EXISTS (
                  SELECT 1 FROM INVESTOR_FOCUS_INDUSTRY fi
                  WHERE fi.investor_id=i.investor_id AND fi.industry_id=s.industry_id
                ) AND i.country=s.country THEN 100
                WHEN EXISTS (
                  SELECT 1 FROM INVESTOR_FOCUS_INDUSTRY fi
                  WHERE fi.investor_id=i.investor_id AND fi.industry_id=s.industry_id
                ) THEN 80
                WHEN i.country=s.country THEN 20
                ELSE 0
              END AS match_score
       FROM INVESTOR i CROSS JOIN STARTUP s
       WHERE s.startup_id=? AND i.is_visible=1
       ORDER BY match_score DESC, i.investor_name`,
      [req.params.startup_id],
    );
    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
});

app.get("/allStartups", async (req, res) => {
  const { industry_id, stage, country, q } = req.query;
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];

  if (industry_id) { conditions.push("s.industry_id = ?"); values.push(industry_id); }
  if (stage) { conditions.push("s.stage = ?"); values.push(stage); }
  if (country) { conditions.push("LOWER(s.country) = LOWER(?)"); values.push(country); }
  if (q) { conditions.push("(LOWER(s.startup_name) LIKE LOWER(?) OR LOWER(s.city) LIKE LOWER(?))"); values.push(`%${q}%`, `%${q}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  try {
    const [rows] = await pool.execute(
      `SELECT s.startup_id, s.startup_name, s.founded_year, s.stage, s.city, s.state, s.country, s.industry_id, ind.industry_name
       FROM STARTUP s JOIN INDUSTRY ind ON ind.industry_id=s.industry_id
       ${where} ORDER BY s.startup_name LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
    res.json(rows);
  } catch (error) {
    handleDbError(res, error);
  }
});

// Cleanup expired sessions without keeping authentication state in application memory.
setInterval(() => {
  pool.execute("DELETE FROM AUTH_SESSION WHERE expires_at <= NOW()").catch((error) => console.error("Session cleanup failed:", error.message));
}, 60 * 60 * 1000).unref();

app.use((req, res) => publicError(res, 404, "Endpoint not found."));

async function start() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    app.listen(PORT, () => console.log(`SFITS API running on http://localhost:${PORT}`));
  } catch (error) {
    console.error("Unable to connect to MySQL:", error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) start();

module.exports = { app, pool, start };
