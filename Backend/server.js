// ================= IMPORTS =================
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// ================= AUTH MIDDLEWARE =================
const sessions = new Map();

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  const user = sessions.get(token);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = user;
  next();
}

// ================= DB =================
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "SFITS_DBMS_PRJ",
});

db.connect((err) => {
  if (err) return console.error(err);
  console.log("MySQL Connected");

  function ensureColumn(tableName, columnName, alterSql, done = () => {}) {
    db.query(
      `SHOW COLUMNS FROM ${tableName} LIKE ?`,
      [columnName],
      (showErr, showRes) => {
        if (showErr) {
          return console.warn(
            `Unable to inspect ${tableName} columns:`,
            showErr.sqlMessage || showErr.message,
          );
        }

        if (!showRes || showRes.length === 0) {
          db.query(alterSql, (alterErr) => {
            if (alterErr) {
              return console.error(
                `Failed to add ${tableName}.${columnName}:`,
                alterErr.sqlMessage || alterErr.message,
              );
            }
            console.log(`Added missing ${tableName}.${columnName} column`);
              done();
          });
        } else {
          done();
        }
      },
    );
  }

  ensureColumn(
    "FOUNDER",
    "founder_email",
    "ALTER TABLE FOUNDER ADD COLUMN founder_email VARCHAR(100) NULL",
  );

  ensureColumn(
    "FOUNDER",
    "user_id",
    "ALTER TABLE FOUNDER ADD COLUMN user_id INT NULL",
  );

  ensureColumn(
    "INVESTOR",
    "user_id",
    "ALTER TABLE INVESTOR ADD COLUMN user_id INT NULL",
  );

  ensureColumn(
    "STARTUP",
    "user_id",
    "ALTER TABLE STARTUP ADD COLUMN user_id INT NULL",
  );

  ensureColumn(
    "INVESTOR",
    "is_visible",
    "ALTER TABLE INVESTOR ADD COLUMN is_visible TINYINT(1) DEFAULT 1",
  );
  ensureColumn(
    "FUNDING_ROUND",
    "target_amount",
    "ALTER TABLE FUNDING_ROUND ADD COLUMN target_amount BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER total_amount_raised",
    () => ensureColumn(
      "FUNDING_ROUND",
      "amount_raised",
      "ALTER TABLE FUNDING_ROUND ADD COLUMN amount_raised BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER target_amount",
      () => ensureColumn(
        "FUNDING_ROUND",
        "status",
        "ALTER TABLE FUNDING_ROUND ADD COLUMN status ENUM('Open', 'Closed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Open' AFTER amount_raised",
        () => {
          db.query("UPDATE FUNDING_ROUND SET target_amount = total_amount_raised WHERE target_amount = 0");
          db.query(`UPDATE FUNDING_ROUND fr
            LEFT JOIN (
              SELECT round_id, COALESCE(SUM(amount_invested), 0) AS raised
              FROM INVESTMENT
              GROUP BY round_id
            ) i ON fr.round_id = i.round_id
            SET fr.amount_raised = COALESCE(i.raised, 0)`);
        },
      ),
    ),
  );

  db.query(`CREATE TABLE IF NOT EXISTS STARTUP_SNAPSHOT (
    startup_id INT PRIMARY KEY,
    business_model VARCHAR(255) NULL,
    problem_solving VARCHAR(255) NULL,
    target_market VARCHAR(255) NULL,
    product_summary VARCHAR(255) NULL,
    revenue_model VARCHAR(255) NULL,
    current_traction VARCHAR(255) NULL,
    future_plan VARCHAR(255) NULL,
    monthly_revenue BIGINT UNSIGNED DEFAULT 0,
    customer_count INT UNSIGNED DEFAULT 0,
    user_count INT UNSIGNED DEFAULT 0,
    growth_percentage DECIMAL(5, 2) DEFAULT 0,
    burn_rate BIGINT UNSIGNED DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (startup_id) REFERENCES STARTUP (startup_id) ON DELETE CASCADE
  )`);


  // Γ£à ONE-TIME FIX: Make sure all existing investors are visible
  db.query("UPDATE INVESTOR SET is_visible = 1 WHERE is_visible IS NULL OR is_visible = 0");


  // Seed INDUSTRY table if empty///////////////////////
  db.query("SELECT COUNT(*) AS cnt FROM INDUSTRY", (err, res) => {
    if (err)
      return console.warn("Could not check INDUSTRY table:", err.message);
    if (res[0].cnt === 0) {
      db.query(
        `INSERT IGNORE INTO INDUSTRY (industry_id, industry_name) VALUES
         (1,'FinTech'),(2,'HealthTech'),(3,'EdTech')`,
        (insertErr) => {
          if (insertErr)
            return console.error("Industry seed failed:", insertErr.message);
          console.log("Seeded INDUSTRY table");
        },
      );
    }
  });
});
////////////////////////////

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ================= HELPER =================

// ================= AUTH =================
app.post("/signup", (req, res) => {
  const { username, email, password, role } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).send("Invalid email address.");
  }

  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) return res.status(500).send("Error hashing password.");

    db.query(
      "INSERT INTO USERS (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hash, role],
      (err) => {
        if (err) return res.status(500).send(err.sqlMessage);
        res.send("Signup successful");
      }
    );
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).send("Invalid email address.");
  }

  db.query(
    `SELECT u.*, i.investor_id
     FROM USERS u
     LEFT JOIN INVESTOR i ON u.user_id = i.user_id
     WHERE u.email = ?`,
    [email],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage || "Login failed");
      if (result.length === 0) return res.status(401).send("Invalid email or password");

      const user = result[0];
      const sendLogin = (investorId) => {
        const token = crypto.randomBytes(32).toString("hex");
        sessions.set(token, { user_id: user.user_id, role: user.role });

        res.json({
          user_id: user.user_id,
          username: user.username,
          role: user.role,
          investor_id: investorId || null,
          token,
        });
      };

      const finishLogin = () => {
        if (user.email) {
          db.query(
            "UPDATE FOUNDER SET user_id = ? WHERE TRIM(LOWER(founder_email)) = TRIM(LOWER(?)) AND user_id IS NULL",
            [user.user_id, user.email],
            (updateErr) => {
              if (updateErr) console.warn("Founder auto-link failed:", updateErr.sqlMessage);
            },
          );
        }

        if (user.role === "investor" && !user.investor_id) {
          db.query(
            "UPDATE INVESTOR SET user_id = ? WHERE TRIM(LOWER(investor_name)) = TRIM(LOWER(?)) AND user_id IS NULL",
            [user.user_id, user.username],
            (linkErr) => {
              if (linkErr) {
                console.warn("Investor auto-link failed:", linkErr.sqlMessage);
                return sendLogin(null);
              }

              db.query(
                "SELECT investor_id FROM INVESTOR WHERE user_id = ? LIMIT 1",
                [user.user_id],
                (invErr, invRes) => {
                  if (invErr) {
                    console.warn("Investor fetch after auto-link failed:", invErr.sqlMessage);
                    return sendLogin(null);
                  }
                  sendLogin(invRes[0]?.investor_id || null);
                },
              );
            },
          );
          return;
        }

        sendLogin(user.investor_id);
      };

      bcrypt.compare(password, user.password, (compareErr, isMatch) => {
        const plainSeedMatch = password === user.password;
        if (!isMatch && !plainSeedMatch) {
          return res.status(401).send("Invalid email or password");
        }

        if (plainSeedMatch) {
          bcrypt.hash(password, 10, (hashErr, hash) => {
            if (!hashErr) {
              db.query("UPDATE USERS SET password=? WHERE user_id=?", [hash, user.user_id]);
            }
            finishLogin();
          });
          return;
        }

        if (compareErr) return res.status(500).send("Error comparing passwords");
        finishLogin();
      });
    },
  );
});
// ================= STARTUPS =================
app.post("/addStartup", requireAuth, (req, res) => {
  const {
    startup_name,
    founded_year,
    stage,
    industry_id,
    city,
    state,
    country,
    user_id,
    business_model,
    problem_solving,
    target_market,
    product_summary,
    revenue_model,
    current_traction,
    future_plan,
    monthly_revenue,
    customer_count,
    user_count,
    growth_percentage,
    burn_rate,
  } = req.body;

  db.query(
    `INSERT INTO STARTUP (startup_name, founded_year, stage, city, state, country, industry_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      startup_name,
      founded_year,
      stage,
      city,
      state,
      country,
      industry_id,
      user_id,
    ],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      db.query(
        `INSERT INTO STARTUP_SNAPSHOT
         (startup_id, business_model, problem_solving, target_market, product_summary, revenue_model, current_traction, future_plan, monthly_revenue, customer_count, user_count, growth_percentage, burn_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [result.insertId, business_model || null, problem_solving || null, target_market || null, product_summary || null, revenue_model || null, current_traction || null, future_plan || null, monthly_revenue || 0, customer_count || 0, user_count || 0, growth_percentage || 0, burn_rate || 0],
        (snapshotErr) => {
          if (snapshotErr) return res.status(500).send(snapshotErr.sqlMessage);
          res.send("Startup added");
        },
      );
    },
  );
});

// Γ£à RESTORED
app.get("/startups/:user_id", (req, res) => {
  db.query(
    `SELECT DISTINCT s.*
     FROM STARTUP s
     LEFT JOIN FOUNDER f ON s.startup_id = f.startup_id
     LEFT JOIN USERS u2 ON TRIM(LOWER(u2.email)) = TRIM(LOWER(f.founder_email))
     WHERE s.user_id = ? OR f.user_id = ? OR u2.user_id = ?`,
    [req.params.user_id, req.params.user_id, req.params.user_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.json(result);
    },
  );
});


app.put("/updateStartup", requireAuth, (req, res) => {
  const { startup_id, startup_name, founded_year, stage, industry_id, city, state, country } = req.body;
  db.query(
    `UPDATE STARTUP
     SET startup_name=?, founded_year=?, stage=?, city=?, state=?, country=?, industry_id=?
     WHERE startup_id=? AND user_id=?`,
    [startup_name, founded_year, stage, city, state, country, industry_id, startup_id, req.user.user_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      if (result.affectedRows === 0) return res.status(403).send("Startup not found or not allowed");
      res.send("Startup updated");
    },
  );
});

app.delete("/deleteStartup/:id", requireAuth, (req, res) => {
  db.query(
    "DELETE FROM STARTUP WHERE startup_id=? AND user_id=?",
    [req.params.id, req.user.user_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      if (result.affectedRows === 0) return res.status(403).send("Startup not found or not allowed");
      res.send("Startup deleted");
    },
  );
});

app.get("/startupSnapshot/:startup_id", requireAuth, (req, res) => {
  db.query(
    "SELECT * FROM STARTUP_SNAPSHOT WHERE startup_id=?",
    [req.params.startup_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.json(result[0] || {});
    },
  );
});

app.put("/startupSnapshot", requireAuth, (req, res) => {
  const fields = [
    "startup_id", "business_model", "problem_solving", "target_market", "product_summary",
    "revenue_model", "current_traction", "future_plan", "monthly_revenue", "customer_count",
    "user_count", "growth_percentage", "burn_rate",
  ];
  const values = fields.map((field) => req.body[field] ?? null);
  db.query(
    `INSERT INTO STARTUP_SNAPSHOT
     (startup_id, business_model, problem_solving, target_market, product_summary, revenue_model, current_traction, future_plan, monthly_revenue, customer_count, user_count, growth_percentage, burn_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       business_model=VALUES(business_model), problem_solving=VALUES(problem_solving), target_market=VALUES(target_market),
       product_summary=VALUES(product_summary), revenue_model=VALUES(revenue_model), current_traction=VALUES(current_traction),
       future_plan=VALUES(future_plan), monthly_revenue=VALUES(monthly_revenue), customer_count=VALUES(customer_count),
       user_count=VALUES(user_count), growth_percentage=VALUES(growth_percentage), burn_rate=VALUES(burn_rate)`,
    values,
    (err) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.send("Startup Snapshot saved");
    },
  );
});
// ================= FOUNDERS =================
app.post("/addFounder", requireAuth, (req, res) => {
  const { founders, startup_id } = req.body;

  if (!Array.isArray(founders) || founders.length === 0) {
    return res.status(400).send("No founders provided");
  }

  let totalNewEquity = 0;

  for (const founder of founders) {
    const equity = Number(founder.equity);
    if (Number.isNaN(equity) || equity <= 0) {
      return res.status(400).send("Founder equity must be a positive number");
    }

    totalNewEquity += equity;
  }

  if (totalNewEquity > 100) {
    return res
      .status(400)
      .send("Total equity for new founders cannot exceed 100%");
  }

  db.query(
    "SELECT COALESCE(SUM(initial_equity), 0) AS existing_total FROM FOUNDER WHERE startup_id=?",
    [startup_id],
    (err, existingRes) => {
      if (err) return res.status(500).send(err.sqlMessage);

      const existingTotal = existingRes[0]?.existing_total || 0;
      if (existingTotal + totalNewEquity > 100) {
        return res.status(400).send("Total founder equity cannot exceed 100%");
      }

      db.query("SELECT NOW() as now", (err, timeRes) => {
        if (err) return res.status(500).send(err.sqlMessage);

        const snapshotTime = timeRes[0].now;

        // ≡ƒöÑ STEP 1: GET OR CREATE ROUND (ONLY ONCE)
        db.query(
          "SELECT round_id FROM FUNDING_ROUND WHERE startup_id=? ORDER BY round_date DESC LIMIT 1",
          [startup_id],
          (err, roundRes) => {
            if (err) return res.status(500).send(err.sqlMessage);

            let round_id;

            if (roundRes.length === 0) {
              db.query(
                `INSERT INTO FUNDING_ROUND 
             (round_type, round_date, valuation, total_amount_raised, startup_id)
             VALUES ('Initial', CURDATE(), 0, 0, ?)`,
                [startup_id],
                (err2, insertRes) => {
                  if (err2) return res.status(500).send(err2.sqlMessage);

                  let round_id = insertRes.insertId;
                  insertAllFounders(round_id);
                },
              );
            } else {
              round_id = roundRes[0].round_id;
              insertAllFounders(round_id);
            }

            // ≡ƒöÑ STEP 2: INSERT FOUNDERS + EQUITY
            function insertAllFounders(round_id) {
              let completed = 0;

              founders.forEach((f) => {
                // Link the founder to an existing user account by email so the co-founder
                // can see the startup when they log in.
                db.query(
                  "SELECT user_id FROM USERS WHERE TRIM(LOWER(email)) = TRIM(LOWER(?))",
                  [f.email],
                  (err1, userRes) => {
                    if (err1) return res.status(500).send(err1.sqlMessage);

                    const founderUserId =
                      userRes.length > 0 ? userRes[0].user_id : null;
                    const founderEmail = f.email || null;

                    db.query(
                      `INSERT INTO FOUNDER 
                   (founder_name, founder_email, founder_role, initial_equity, startup_id, user_id)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                      [
                        f.name,
                        founderEmail,
                        f.role,
                        f.equity,
                        startup_id,
                        founderUserId,
                      ],
                      (err2, founderRes) => {
                        if (err2) return res.status(500).send(err2.sqlMessage);
                        const founder_id = founderRes.insertId;

                        // ✅ insert into EQUITY_HISTORY
                        db.query(
                          `INSERT INTO EQUITY_HISTORY
                       (startup_id, round_id, founder_id, investor_id, equity_percentage, recorded_at)
                       VALUES (?, ?, ?, NULL, ?, ?)`,
                          [
                            startup_id,
                            round_id, // ✅ dynamic
                            founder_id,
                            f.equity,
                            snapshotTime,
                          ],
                          (err3) => {
                            if (err3)
                              return res.status(500).send(err3.sqlMessage);

                            completed++;

                            if (completed === founders.length) {
                              res.send("All founders added");
                            }
                          },
                        );
                      },
                    );
                  },
                );
              });
            }
          },
        );
      });
    },
  );
});

// Γ£à RESTORED
app.get("/founders/:user_id", (req, res) => {
  const uid = req.params.user_id;
  db.query(
    `SELECT DISTINCT f.*, s.startup_name, COALESCE(u.email, f.founder_email) AS founder_email
     FROM FOUNDER f
     JOIN STARTUP s ON f.startup_id = s.startup_id
     LEFT JOIN USERS u ON f.user_id = u.user_id
     LEFT JOIN USERS u2 ON TRIM(LOWER(u2.email)) = TRIM(LOWER(f.founder_email))
     WHERE s.user_id = ?
       OR f.user_id = ?
       OR u2.user_id = ?
       OR f.startup_id IN (
            SELECT f2.startup_id FROM FOUNDER f2
            LEFT JOIN USERS u3 ON TRIM(LOWER(u3.email)) = TRIM(LOWER(f2.founder_email))
            WHERE f2.user_id = ? OR u3.user_id = ?
          )`,
    [uid, uid, uid, uid, uid],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.json(result);
    },
  );
});


app.put("/updateFounder", requireAuth, (req, res) => {
  const { founder_id, founder_name, founder_email, founder_role, initial_equity } = req.body;
  db.query(
    `UPDATE FOUNDER f
     JOIN STARTUP s ON f.startup_id = s.startup_id
     SET f.founder_name=?, f.founder_email=?, f.founder_role=?, f.initial_equity=?
     WHERE f.founder_id=? AND (s.user_id=? OR f.user_id=?)`,
    [founder_name, founder_email, founder_role, initial_equity, founder_id, req.user.user_id, req.user.user_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      if (result.affectedRows === 0) return res.status(403).send("Founder not found or not allowed");
      res.send("Founder updated");
    },
  );
});

app.delete("/deleteFounder/:id", requireAuth, (req, res) => {
  db.query(
    `DELETE f FROM FOUNDER f
     JOIN STARTUP s ON f.startup_id = s.startup_id
     WHERE f.founder_id=? AND (s.user_id=? OR f.user_id=?)`,
    [req.params.id, req.user.user_id, req.user.user_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      if (result.affectedRows === 0) return res.status(403).send("Founder not found or not allowed");
      res.send("Founder deleted");
    },
  );
});
// ================= FUNDING =================
app.post("/addFunding", requireAuth, (req, res) => {
  const { startup_id, round_type, round_date, valuation, total_amount_raised, target_amount, status } =
    req.body;

  // Get all existing funding rounds for this startup
  db.query(
    `SELECT round_type, round_date, status FROM FUNDING_ROUND WHERE startup_id = ? ORDER BY round_date ASC`,
    [startup_id],
    (err, existingRounds) => {
      if (err) return res.status(500).send(err.sqlMessage);

      const newDate = new Date(round_date);
      const roundOrder = [
        "Pre-Seed",
        "Seed",
        "Series A",
        "Series B",
        "Series C",
      ];
      const newRoundIndex = roundOrder.indexOf(round_type);

      // Validate date constraints
      if (existingRounds.length > 0) {
        // Find the latest existing round date
        const latestExistingDate = new Date(
          Math.max(...existingRounds.map((r) => new Date(r.round_date))),
        );

        // New round must be on or after the latest existing round
        if (newDate < latestExistingDate) {
          return res
            .status(400)
            .send(
              `New round date must be on or after the latest existing round (${latestExistingDate.toISOString().split("T")[0]})`,
            );
        }

        // If adding an earlier stage round, check against later stage rounds
        const laterRounds = existingRounds.filter(
          (r) => roundOrder.indexOf(r.round_type) > newRoundIndex,
        );

        if (laterRounds.length > 0) {
          const earliestLaterRoundDate = new Date(
            Math.min(...laterRounds.map((r) => new Date(r.round_date))),
          );

          if (newDate > earliestLaterRoundDate) {
            return res
              .status(400)
              .send(
                `${round_type} round (earlier stage) must be on or before the earliest later round (${earliestLaterRoundDate.toISOString().split("T")[0]})`,
              );
          }
        }
      }

      db.query(
        `INSERT INTO FUNDING_ROUND (round_type, round_date, valuation, total_amount_raised, target_amount, amount_raised, status, startup_id) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          round_type,
          new Date(round_date).toISOString().slice(0, 10),
          valuation,
          total_amount_raised || target_amount || 0,
          target_amount || total_amount_raised || 0,
          status || "Open",
          startup_id,
        ],
        (err) => {
          if (err) return res.status(500).send(err.sqlMessage);
          res.send("Funding added");
        },
      );
    },
  );
});

app.get("/fundingRounds/:startup_id", (req, res) => {
  db.query(
    `SELECT round_type, round_date, status FROM FUNDING_ROUND WHERE startup_id = ? ORDER BY round_date ASC`,
    [req.params.startup_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.json(result);
    },
  );
});

// Γ£à RESTORED
app.get("/funding/:user_id", (req, res) => {
  const uid = req.params.user_id;
  db.query(
    `SELECT DISTINCT fr.*, COALESCE(NULLIF(fr.target_amount, 0), fr.total_amount_raised) AS target_funding, fr.amount_raised, s.startup_name
     FROM FUNDING_ROUND fr
     JOIN STARTUP s ON fr.startup_id = s.startup_id
     LEFT JOIN FOUNDER f ON s.startup_id = f.startup_id
     LEFT JOIN USERS u2 ON TRIM(LOWER(u2.email)) = TRIM(LOWER(f.founder_email))
     WHERE s.user_id = ? OR f.user_id = ? OR u2.user_id = ?`,
    [uid, uid, uid],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.json(result);
    },
  );
});

app.get("/investors", (req, res) => {
  db.query(
    `SELECT investor_id, investor_name, firm_name, investor_type, country
     FROM INVESTOR
     WHERE is_visible = 1
     ORDER BY investor_name`,
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.json(result);
    },
  );
});

app.post("/addInvestor", requireAuth, (req, res) => {
  const { name, firm, type, country } = req.body;

  db.query(
    `INSERT INTO INVESTOR
     (investor_name, firm_name, investor_type, country)
     VALUES (?, ?, ?, ?)`,
    [name, firm, type, country],
    (err) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.send("Investor added");
    },
  );
});

app.put("/updateInvestor", requireAuth, (req, res) => {
  const { id, name, firm, type, country } = req.body;

  db.query(
    `UPDATE INVESTOR
     SET investor_name = ?, firm_name = ?, investor_type = ?, country = ?
     WHERE investor_id = ?`,
    [name, firm, type, country, id],
    (err) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.send("Investor updated");
    },
  );
});

app.delete("/deleteInvestor/:id", requireAuth, (req, res) => {
  const { id } = req.params;

  // Hide the investor instead of deleting (soft delete)
  db.query(
    `UPDATE INVESTOR SET is_visible = 0 WHERE investor_id = ?`,
    [id],
    (err) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.send("Investor hidden successfully");
    },
  );
});

app.get("/investments/:user_id", (req, res) => {
  db.query(
    `SELECT DISTINCT
      inv.investor_name,
      fr.round_type,
      i.amount_invested,
      i.equity_acquired
     FROM INVESTMENT i
     JOIN INVESTOR inv ON i.investor_id = inv.investor_id
     JOIN FUNDING_ROUND fr ON i.round_id = fr.round_id
     JOIN STARTUP s ON fr.startup_id = s.startup_id
     LEFT JOIN FOUNDER f ON s.startup_id = f.startup_id
     LEFT JOIN USERS u2 ON TRIM(LOWER(u2.email)) = TRIM(LOWER(f.founder_email))
     WHERE s.user_id = ? OR f.user_id = ? OR u2.user_id = ?`,
    [req.params.user_id, req.params.user_id, req.params.user_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.json(result);
    },
  );
});

// ================= INVESTMENT =================
app.post("/addInvestment", requireAuth, (req, res) => {
  const {
    round_id,
    user_id,
    investor_id: providedInvestorId,
    username,
    firm_name,
    country,
    amount,
    equity,
    deal_reference
  } = req.body;

  const equityNum = Number(equity);
  console.log("Incoming Investment:", req.body);

  db.beginTransaction((err) => {
    if (err) return res.status(500).send(err.sqlMessage);

    const rollbackAndSend = (error) => {
      db.rollback(() => {
        res.status(500).send(error.sqlMessage || error.message || error);
      });
    };

    db.query(
      "SELECT investor_id FROM INVESTOR WHERE user_id=? OR investor_id=?",
      [user_id, providedInvestorId || null],
      (err, invRes) => {
        if (err) return rollbackAndSend(err);

        let getInvestorPromise;
        if (invRes.length === 0) {
          getInvestorPromise = new Promise((resolve, reject) => {
            db.query(
              `INSERT INTO INVESTOR (investor_name, firm_name, investor_type, country, user_id) VALUES (?, ?, ?, ?, ?)`,
              [username || "Investor", firm_name || "Individual", "Angel", country || "India", user_id],
              (err2, result) => {
                if (err2) reject(err2);
                else resolve(result.insertId);
              }
            );
          });
        } else {
          getInvestorPromise = Promise.resolve(invRes[0].investor_id);
        }

        getInvestorPromise
          .then((investor_id) => {
            db.query("SELECT startup_id FROM FUNDING_ROUND WHERE round_id=?", [round_id], (err, r) => {
              if (err) return rollbackAndSend(err);
              if (r.length === 0) return rollbackAndSend("Invalid round");

              const startup_id = r[0].startup_id;

              db.query("SELECT NOW() as now", (err, timeRes) => {
                if (err) return rollbackAndSend(err);
                const snapshotTime = timeRes[0].now;

                db.query(
                  `SELECT founder_id, investor_id, equity_percentage
                   FROM (
                     SELECT *,
                            ROW_NUMBER() OVER (
                              PARTITION BY COALESCE(founder_id, investor_id)
                              ORDER BY recorded_at DESC
                            ) as rn
                     FROM EQUITY_HISTORY
                     WHERE startup_id=?
                   ) t
                   WHERE rn = 1`,
                  [startup_id],
                  (err, lastData) => {
                    if (err) return rollbackAndSend(err);

                    const factor = (100 - equityNum) / 100;
                    let historyQueries = [];

                    if (!lastData || lastData.length === 0) {
                      db.query(
                        "SELECT founder_id, initial_equity FROM FOUNDER WHERE startup_id=?",
                        [startup_id],
                        (err3, founders) => {
                          if (err3) return rollbackAndSend(err3);

                          if (founders && founders.length > 0) {
                            founders.forEach((founder) => {
                              historyQueries.push({
                                query: `INSERT INTO EQUITY_HISTORY (startup_id, round_id, founder_id, investor_id, equity_percentage, recorded_at) VALUES (?, ?, ?, NULL, ?, ?)`,
                                values: [startup_id, round_id, founder.founder_id, Number((founder.initial_equity * factor).toFixed(4)), snapshotTime],
                              });
                            });
                          }
                          // Add the new investor
                          historyQueries.push({
                            query: `INSERT INTO EQUITY_HISTORY (startup_id, round_id, founder_id, investor_id, equity_percentage, recorded_at) VALUES (?, ?, NULL, ?, ?, ?)`,
                            values: [startup_id, round_id, investor_id, equityNum, snapshotTime],
                          });
                          executeHistoryQueries();
                        }
                      );
                    } else {
                      let investorHandled = false;
                      lastData.forEach((row) => {
                        let newEquity = row.equity_percentage * factor;
                        if (row.investor_id === investor_id) {
                          newEquity += equityNum;
                          investorHandled = true;
                        }
                        historyQueries.push({
                          query: `INSERT INTO EQUITY_HISTORY (startup_id, round_id, founder_id, investor_id, equity_percentage, recorded_at) VALUES (?, ?, ?, ?, ?, ?)`,
                          values: [startup_id, round_id, row.founder_id, row.investor_id, Number(newEquity.toFixed(4)), snapshotTime],
                        });
                      });

                      if (!investorHandled) {
                        historyQueries.push({
                          query: `INSERT INTO EQUITY_HISTORY (startup_id, round_id, founder_id, investor_id, equity_percentage, recorded_at) VALUES (?, ?, NULL, ?, ?, ?)`,
                          values: [startup_id, round_id, investor_id, equityNum, snapshotTime],
                        });
                      }
                      executeHistoryQueries();
                    }

                    function executeHistoryQueries() {
                      Promise.all(
                        historyQueries.map(
                          (q) =>
                            new Promise((res, rej) =>
                              db.query(q.query, q.values, (e) => (e ? rej(e) : res()))
                            )
                        )
                      )
                        .then(() => {
                          db.query(
                            `INSERT INTO INVESTMENT (round_id, investor_id, amount_invested, equity_acquired, deal_reference) VALUES (?, ?, ?, ?, ?)`,
                            [round_id, investor_id, amount, equityNum, deal_reference || null],
                            (err) => {
                              if (err) return rollbackAndSend(err);

                              db.query("UPDATE FUNDING_ROUND SET amount_raised = amount_raised + ? WHERE round_id = ?", [amount, round_id], (raiseErr) => {
                                if (raiseErr) return rollbackAndSend(raiseErr);
                                db.commit((err) => {
                                  if (err) return rollbackAndSend(err);
                                  res.send("Investment record saved successfully");
                                });
                              });
                            }
                          );
                        })
                        .catch((e) => rollbackAndSend(e));
                    }
                  }
                );
              });
            });
          })
          .catch((e) => rollbackAndSend(e));
      }
    );
  });
});
// ================= CAP TABLE =================
app.get("/history/:startup_id", (req, res) => {
  const startupId = req.params.startup_id;

  db.query(
    `SELECT startup_id, startup_name, founded_year
     FROM STARTUP
     WHERE startup_id = ?`,
    [startupId],
    (startupErr, startupRes) => {
      if (startupErr) return res.status(500).send(startupErr.sqlMessage);
      if (startupRes.length === 0) return res.json([]);

      db.query(
        `SELECT founder_id, founder_name, founder_role, initial_equity
         FROM FOUNDER
         WHERE startup_id = ?
         ORDER BY founder_name`,
        [startupId],
        (founderErr, founders) => {
          if (founderErr) return res.status(500).send(founderErr.sqlMessage);

          db.query(
            `SELECT round_id, round_type, round_date
             FROM FUNDING_ROUND
             WHERE startup_id = ?
             ORDER BY
               CASE round_type
                 WHEN 'Initial' THEN 0
                 WHEN 'Pre-Seed' THEN 1
                 WHEN 'Seed' THEN 2
                 WHEN 'Series A' THEN 3
                 WHEN 'Series B' THEN 4
                 WHEN 'Series C' THEN 5
                 ELSE 6
               END,
               round_date ASC`,
            [startupId],
            (roundErr, rounds) => {
              if (roundErr) return res.status(500).send(roundErr.sqlMessage);

              db.query(
                `SELECT
                   i.round_id,
                   i.investor_id,
                   inv.investor_name,
                   i.equity_acquired
                 FROM INVESTMENT i
                 JOIN FUNDING_ROUND fr ON i.round_id = fr.round_id
                 JOIN INVESTOR inv ON i.investor_id = inv.investor_id
                 WHERE fr.startup_id = ?
                 ORDER BY fr.round_date ASC, inv.investor_name ASC`,
                [startupId],
                (investmentErr, investments) => {
                  if (investmentErr) {
                    return res.status(500).send(investmentErr.sqlMessage);
                  }

                  const startup = startupRes[0];
                  const historyRows = [];
                  const ownership = new Map();
                  const roundInvestments = investments.reduce(
                    (acc, investment) => {
                      if (!acc[investment.round_id])
                        acc[investment.round_id] = [];
                      acc[investment.round_id].push(investment);
                      return acc;
                    },
                    {},
                  );

                  founders.forEach((founder) => {
                    ownership.set(`Founder:${founder.founder_id}`, {
                      stakeholder_id: founder.founder_id,
                      stakeholder: founder.founder_name,
                      stakeholder_type: "Founder",
                      stakeholder_label: normalizeFounderLabel(
                        founder.founder_role,
                      ),
                      equity_percentage: Number(founder.initial_equity) || 0,
                    });
                  });

                  const hasExplicitInitial = rounds.some(
                    (round) => round.round_type === "Initial",
                  );

                  if (ownership.size > 0 && !hasExplicitInitial) {
                    const initialDate = `${startup.founded_year || new Date().getFullYear()}-01-01`;
                    historyRows.push(
                      ...buildSnapshotRows({
                        round_id: `INIT-${startupId}`,
                        round_type: "Initial",
                        round_date: initialDate,
                        ownership,
                      }),
                    );
                  }

                  rounds.forEach((round) => {
                    const roundEntries = roundInvestments[round.round_id] || [];

                    if (round.round_type === "Initial") {
                      if (ownership.size === 0 && roundEntries.length === 0) {
                        return;
                      }

                      if (roundEntries.length > 0) {
                        applyInvestmentsToOwnership(ownership, roundEntries);
                      }

                      historyRows.push(
                        ...buildSnapshotRows({
                          round_id: round.round_id,
                          round_type: round.round_type,
                          round_date: round.round_date,
                          ownership,
                        }),
                      );
                      return;
                    }

                    if (roundEntries.length > 0) {
                      applyInvestmentsToOwnership(ownership, roundEntries);
                    }

                    historyRows.push(
                      ...buildSnapshotRows({
                        round_id: round.round_id,
                        round_type: round.round_type,
                        round_date: round.round_date,
                        ownership,
                      }),
                    );
                  });

                  res.json(historyRows);
                },
              );
            },
          );
        },
      );
    },
  );

  function applyInvestmentsToOwnership(currentOwnership, roundEntries) {
    const totalRoundEquity = roundEntries.reduce(
      (sum, entry) => sum + (Number(entry.equity_acquired) || 0),
      0,
    );

    const dilutionFactor = (100 - totalRoundEquity) / 100;

    Array.from(currentOwnership.values()).forEach((holder) => {
      holder.equity_percentage = Number(
        (holder.equity_percentage * dilutionFactor).toFixed(4),
      );
    });

    roundEntries.forEach((entry) => {
      const key = `Investor:${entry.investor_id}`;
      const acquired = Number(entry.equity_acquired) || 0;

      if (currentOwnership.has(key)) {
        currentOwnership.get(key).equity_percentage = Number(
          (currentOwnership.get(key).equity_percentage + acquired).toFixed(4),
        );
      } else {
        currentOwnership.set(key, {
          stakeholder_id: entry.investor_id,
          stakeholder: entry.investor_name,
          stakeholder_type: "Investor",
          equity_percentage: acquired,
        });
      }
    });
  }

  function buildSnapshotRows({ round_id, round_type, round_date, ownership }) {
    return Array.from(ownership.values())
      .filter((holder) => holder.equity_percentage > 0)
      .sort((left, right) => left.stakeholder.localeCompare(right.stakeholder))
      .map((holder, index) => ({
        round_id,
        round_type,
        round_date,
        stakeholder_id: holder.stakeholder_id,
        stakeholder: holder.stakeholder,
        stakeholder_type: holder.stakeholder_type,
        stakeholder_label: holder.stakeholder_label || holder.stakeholder_type,
        equity_percentage: Number(holder.equity_percentage.toFixed(2)),
        recorded_at: `${round_date}T00:00:${String(index).padStart(2, "0")}.000Z`,
      }));
  }

  function normalizeFounderLabel(founderRole) {
    const roleText = String(founderRole || "").trim();
    const normalizedRole = roleText.toLowerCase();

    if (!normalizedRole) return "Founder";
    if (
      normalizedRole.includes("co-founder") ||
      normalizedRole.includes("cofounder")
    ) {
      return roleText;
    }
    if (normalizedRole.includes("founder")) {
      return roleText;
    }
    return `Co-Founder & ${roleText}`;
  }
});

// ================= EXTRA (USED IN UI) =================
app.get("/allRounds", (req, res) => {
  db.query(
    `SELECT
       fr.round_id,
       fr.round_type,
       fr.round_date,
       fr.valuation,
       COALESCE(NULLIF(fr.target_amount, 0), fr.total_amount_raised) AS target_funding,
       fr.status,
       s.startup_id,
       s.startup_name,
       s.stage,
       s.city,
       s.country,
       COALESCE(inv_summary.amount_raised, 0)   AS amount_raised,
       COALESCE(inv_summary.investor_count, 0)  AS investor_count
     FROM FUNDING_ROUND fr
     JOIN STARTUP s ON fr.startup_id = s.startup_id
     JOIN (
       SELECT startup_id, MAX(round_date) AS max_date
       FROM FUNDING_ROUND
       GROUP BY startup_id
     ) latest ON fr.startup_id = latest.startup_id
       AND fr.round_date = latest.max_date
     LEFT JOIN (
       SELECT i.round_id,
              SUM(i.amount_invested)       AS amount_raised,
              COUNT(DISTINCT i.investor_id) AS investor_count
       FROM INVESTMENT i
       GROUP BY i.round_id
     ) inv_summary ON inv_summary.round_id = fr.round_id
     ORDER BY s.startup_name`,
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.json(result);
    },
  );
});
app.get("/capTable/:startup_id", (req, res) => {
  const startup_id = req.params.startup_id;

  // Γ£à Show current equity state for each stakeholder
  db.query(
    `SELECT
      COALESCE(f.founder_name, i.investor_name) AS stakeholder,
      CASE WHEN eh.founder_id IS NOT NULL THEN 'Founder' ELSE 'Investor' END AS stakeholder_type,
      CASE
        WHEN eh.founder_id IS NOT NULL THEN
          CASE
            WHEN TRIM(COALESCE(f.founder_role, '')) = '' THEN 'Founder'
            WHEN LOWER(COALESCE(f.founder_role, '')) LIKE '%co-founder%' OR LOWER(COALESCE(f.founder_role, '')) LIKE '%cofounder%' THEN f.founder_role
            WHEN LOWER(COALESCE(f.founder_role, '')) LIKE '%founder%' THEN f.founder_role
            ELSE CONCAT('Co-Founder & ', f.founder_role)
          END
        ELSE 'Investor'
      END AS stakeholder_label,
      SUM(eh.equity_percentage) AS equity_percentage
    FROM (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(founder_id, investor_id), (CASE WHEN founder_id IS NOT NULL THEN 'Founder' ELSE 'Investor' END)
          ORDER BY recorded_at DESC
        ) AS rn
      FROM EQUITY_HISTORY
      WHERE startup_id=?
    ) eh
    LEFT JOIN FOUNDER f ON eh.founder_id = f.founder_id
    LEFT JOIN INVESTOR i ON eh.investor_id = i.investor_id
    WHERE eh.rn = 1
    GROUP BY stakeholder, stakeholder_type, stakeholder_label`,
    [startup_id],
    (err2, result) => {
      if (err2) return res.status(500).send(err2.sqlMessage);
      res.json(result);
    },
  );
});

app.get("/capTableAtDate/:startup_id", (req, res) => {
  const startup_id = req.params.startup_id;
  const asOfDate = req.query.asOfDate; // YYYY-MM-DD format expected

  if (!asOfDate) {
    return res.status(400).send("asOfDate query parameter is required.");
  }

  db.query(
    `SELECT
      COALESCE(f.founder_name, i.investor_name) AS stakeholder,
      CASE WHEN eh.founder_id IS NOT NULL THEN 'Founder' ELSE 'Investor' END AS stakeholder_type,
      CASE
        WHEN eh.founder_id IS NOT NULL THEN
          CASE
            WHEN TRIM(COALESCE(f.founder_role, '')) = '' THEN 'Founder'
            WHEN LOWER(COALESCE(f.founder_role, '')) LIKE '%co-founder%' OR LOWER(COALESCE(f.founder_role, '')) LIKE '%cofounder%' THEN f.founder_role
            WHEN LOWER(COALESCE(f.founder_role, '')) LIKE '%founder%' THEN f.founder_role
            ELSE CONCAT('Co-Founder & ', f.founder_role)
          END
        ELSE 'Investor'
      END AS stakeholder_label,
      SUM(eh.equity_percentage) AS equity_percentage
    FROM (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(founder_id, investor_id), (CASE WHEN founder_id IS NOT NULL THEN 'Founder' ELSE 'Investor' END)
          ORDER BY recorded_at DESC
        ) AS rn
      FROM EQUITY_HISTORY
      WHERE startup_id=? AND DATE(recorded_at) <= ?
    ) eh
    LEFT JOIN FOUNDER f ON eh.founder_id = f.founder_id
    LEFT JOIN INVESTOR i ON eh.investor_id = i.investor_id
    WHERE eh.rn = 1
    GROUP BY stakeholder, stakeholder_type, stakeholder_label`,
    [startup_id, asOfDate],
    (err2, result) => {
      if (err2) return res.status(500).send(err2.sqlMessage);
      res.json(result);
    },
  );
});
// ================= GET INVESTOR =================
app.get("/getInvestor/:user_id", (req, res) => {
  db.query(
    "SELECT investor_id FROM INVESTOR WHERE user_id=?",
    [req.params.user_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);

      if (result.length === 0) {
        return res.json({ investor_id: null });
      }

      res.json({ investor_id: result[0].investor_id });
    },
  );
});

// ================= MY INVESTMENTS =================
app.get("/myInvestments/:investor_id", (req, res) => {
  db.query(
    `SELECT 
      s.startup_name,
      fr.round_type,
      i.amount_invested,
      i.equity_acquired
     FROM INVESTMENT i
     JOIN FUNDING_ROUND fr ON i.round_id = fr.round_id
     JOIN STARTUP s ON fr.startup_id = s.startup_id
     WHERE i.investor_id = ?`,
    [req.params.investor_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.json(result);
    },
  );
});
// ================= INVESTOR SUMMARY =================
app.get("/investorSummary/:investor_id", (req, res) => {
  db.query(
    `SELECT 
      SUM(amount_invested) AS total_invested,
      COUNT(DISTINCT fr.startup_id) AS total_startups,
      SUM(equity_acquired) AS total_equity
     FROM INVESTMENT i
     JOIN FUNDING_ROUND fr ON i.round_id = fr.round_id
     WHERE i.investor_id = ?`,
    [req.params.investor_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);
      res.json(result[0]);
    },
  );
});

// ================= ALL STARTUPS =================
app.get("/allStartups", (req, res) => {
  db.query("SELECT * FROM STARTUP", (err, result) => {
    if (err) return res.status(500).send(err.sqlMessage);
    res.json(result);
  });
});
app.get("/startupDashboard/:startup_id", (req, res) => {
  const startup_id = req.params.startup_id;

  db.query(
    `SELECT 
      s.startup_name,
      s.stage,

      -- latest round
      (SELECT fr.round_type 
      FROM FUNDING_ROUND fr 
      WHERE fr.startup_id = s.startup_id 
      AND fr.round_type != 'Initial'
      ORDER BY fr.round_date DESC 
      LIMIT 1) AS latest_round,

      -- latest valuation
      (SELECT fr.valuation 
      FROM FUNDING_ROUND fr 
      WHERE fr.startup_id = s.startup_id 
      AND fr.valuation > 0
      ORDER BY fr.round_date DESC 
      LIMIT 1) AS valuation,

      -- Γ£à CORRECT total funding
      (SELECT COALESCE(SUM(i.amount_invested),0)
      FROM INVESTMENT i
      JOIN FUNDING_ROUND fr ON i.round_id = fr.round_id
      WHERE fr.startup_id = s.startup_id
      ) AS total_funding,

      (SELECT COALESCE(SUM(COALESCE(NULLIF(fr.target_amount, 0), fr.total_amount_raised)),0)
      FROM FUNDING_ROUND fr
      WHERE fr.startup_id = s.startup_id
      AND COALESCE(NULLIF(fr.target_amount, 0), fr.total_amount_raised) > 0
      ) AS target_funding,

      -- Γ£à CORRECT total investors
      (SELECT COUNT(DISTINCT i.investor_id)
      FROM INVESTMENT i
      JOIN FUNDING_ROUND fr ON i.round_id = fr.round_id
      WHERE fr.startup_id = s.startup_id
      ) AS total_investors,

      -- Γ£à latest founder equity (your logic is good ≡ƒæì)
      (
    SELECT COALESCE(SUM(equity_percentage),0)
    FROM (
      SELECT equity_percentage
      FROM (
        SELECT *,
              ROW_NUMBER() OVER (
                PARTITION BY founder_id
                ORDER BY recorded_at DESC
              ) as rn
        FROM EQUITY_HISTORY
        WHERE startup_id = s.startup_id AND founder_id IS NOT NULL
      ) t
      WHERE rn = 1
    ) latest
  ) AS founder_equity

    FROM STARTUP s
    WHERE s.startup_id = ?;`,
    [startup_id],
    (err, result) => {
      if (err) return res.status(500).send(err.sqlMessage);

      console.log("Dashboard Data:", result[0]); // ≡ƒöÑ DEBUG

      res.json(result[0]);
    },
  );
});

// ================= SERVER =================
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
  console.log("Backend file:", __filename);
  console.log("Working directory:", process.cwd());
});
















