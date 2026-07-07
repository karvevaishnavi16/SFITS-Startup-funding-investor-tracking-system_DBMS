# 🚀 Startup Funding & Investor Tracking System (SFITS)

The **system of record** for founders and investors to log funding rounds, track equity dilution, and see exactly who owns what—after every round. Designed to simplify cap table management, SFITS provides a single source of truth for your company's ownership history.

> **Note:** The data seeded in this application is purely fictional and intended for demonstration purposes.

---

## 🚀 What It Does

| Feature | Description |
| --- | --- |
| **Cap Table Math** | Automatically recalculates ownership percentages across all stakeholders after every new investment. |
| **Historical Auditing** | Maintains an immutable `EQUITY_HISTORY` ledger tracking all changes to ownership over time. |
| **Secure Authentication** | Implements robust session-token auth for write operations, with bcrypt-hashed passwords. |
| **Investor Dashboard** | Dedicated views for investors to track their portfolio value across multiple startups. |
| **Founder Dashboard** | Dedicated views for founders to manage funding rounds and co-founder equity. |

---

## 👥 Roles

- **Founder** — registers a startup, manages rounds and co-founders
- **Investor** — browses active rounds, invests, tracks portfolio

---

## 🗃 Key DB Tables

`USERS` → `STARTUP` → `FOUNDER` → `FUNDING_ROUND` → `INVESTMENT` → `EQUITY_HISTORY`

---

## 🛠 Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Chart.js
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Security:** `bcrypt` (password hashing), `crypto` (session tokens), `dotenv` (environment variables)

---

## 🚀 Setup & Installation

### 1. Clone & switch branch

```bash
git clone https://github.com/karvevaishnavi16/SFITS_DBMS.git
cd SFITS_DBMS
git checkout final-fix
```

### 2. Install backend dependencies

```bash
cd Backend
npm install express mysql2 cors dotenv bcrypt
```

### 3. Configure MySQL & Environment

1. Create a MySQL database named `SFITS_DBMS_PRJ`.
2. In the `Backend/` folder, copy `.env.example` to create a new `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Update the `.env` file with your actual MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=SFITS_DBMS_PRJ
   ```
4. Run the `Database/schema.sql` script in MySQL to create the tables.
5. Run the `Database/seed.sql` script to populate the fictional seed data (all seed user passwords are set to `pass123`).

### 4. Start the development environment

From the root project directory:
```bash
npm run dev
```
- This will start the **Backend** (on port 5000) and the **Frontend** (on port 3000) simultaneously.
- The frontend will automatically open at `http://localhost:3000`.

### 5. Demo Accounts

You can log in with any of the fictional users from `seed.sql`. For example:
- **Founder:** `aarav@paynest.com` / `pass123`
- **Investor:** `rohan@northstar.com` / `pass123`
