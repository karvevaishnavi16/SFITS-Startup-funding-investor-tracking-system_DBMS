CREATE DATABASE IF NOT EXISTS SFITS_DBMS_PRJ;

USE SFITS_DBMS_PRJ;

-- Table 0: User login data
CREATE TABLE IF NOT EXISTS USERS (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('founder', 'investor') DEFAULT 'founder',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 1: INDUSTRY
CREATE TABLE IF NOT EXISTS INDUSTRY (
    industry_id INT AUTO_INCREMENT PRIMARY KEY,
    industry_name VARCHAR(100) NOT NULL UNIQUE
);

-- Table 2: STARTUP
CREATE TABLE IF NOT EXISTS STARTUP (
    startup_id INT AUTO_INCREMENT PRIMARY KEY,
    startup_name VARCHAR(100) NOT NULL UNIQUE,
    founded_year YEAR NOT NULL,
    stage ENUM('Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C') NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    country VARCHAR(50) NOT NULL,
    industry_id INT NOT NULL,
    user_id INT NULL,
    FOREIGN KEY (industry_id) REFERENCES INDUSTRY (industry_id),
    FOREIGN KEY (user_id) REFERENCES USERS (user_id),
    INDEX idx_startup_industry (industry_id),
    INDEX idx_startup_user (user_id)
);

-- Table 3: FOUNDER
CREATE TABLE IF NOT EXISTS FOUNDER (
    founder_id INT AUTO_INCREMENT PRIMARY KEY,
    founder_name VARCHAR(100) NOT NULL,
    founder_email VARCHAR(100) NULL,
    founder_role VARCHAR(50) NOT NULL,
    initial_equity DECIMAL(5, 2) NOT NULL,
    CONSTRAINT chk_initial_equity CHECK (initial_equity > 0 AND initial_equity <= 100),
    startup_id INT NOT NULL,
    user_id INT NULL,
    FOREIGN KEY (startup_id) REFERENCES STARTUP (startup_id),
    FOREIGN KEY (user_id) REFERENCES USERS (user_id),
    INDEX idx_founder_startup (startup_id),
    INDEX idx_founder_user (user_id)
);

-- Table 4: INVESTOR
CREATE TABLE IF NOT EXISTS INVESTOR (
    investor_id INT AUTO_INCREMENT PRIMARY KEY,
    investor_name VARCHAR(100) NOT NULL,
    firm_name VARCHAR(100) NOT NULL,
    investor_type ENUM('VC', 'Angel', 'Corporate', 'Private Equity', 'Hedge Fund', 'Family Office', 'Government', 'Accelerator', 'Incubator', 'Crowdfunding') NOT NULL,
    country VARCHAR(50) NOT NULL,
    user_id INT NULL,
    is_visible TINYINT(1) DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES USERS (user_id),
    INDEX idx_investor_user (user_id)
);

-- Table 5: FUNDING_ROUND
-- Canonical seed fields are target_funding and amount_raised.
-- total_amount_raised remains nullable temporarily for existing backend compatibility.
CREATE TABLE IF NOT EXISTS FUNDING_ROUND (
    round_id INT AUTO_INCREMENT PRIMARY KEY,
    round_type ENUM('Initial', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C') NOT NULL,
    round_date DATE NOT NULL,
    target_funding BIGINT UNSIGNED NULL DEFAULT NULL,
    amount_raised BIGINT UNSIGNED NULL DEFAULT NULL,
    valuation BIGINT UNSIGNED NOT NULL,
    total_amount_raised BIGINT UNSIGNED NULL DEFAULT NULL,
    startup_id INT NOT NULL,
    FOREIGN KEY (startup_id) REFERENCES STARTUP (startup_id),
    INDEX idx_funding_round_startup (startup_id)
);

-- Table 6: INVESTOR_FOCUS_INDUSTRY
CREATE TABLE IF NOT EXISTS INVESTOR_FOCUS_INDUSTRY (
    investor_id INT NOT NULL,
    industry_id INT NOT NULL,
    PRIMARY KEY (investor_id, industry_id),
    FOREIGN KEY (investor_id) REFERENCES INVESTOR (investor_id) ON DELETE CASCADE,
    FOREIGN KEY (industry_id) REFERENCES INDUSTRY (industry_id) ON DELETE CASCADE
);

-- Table 7: INVESTMENT
CREATE TABLE IF NOT EXISTS INVESTMENT (
    investment_id INT AUTO_INCREMENT PRIMARY KEY,
    investor_id INT NOT NULL,
    round_id INT NOT NULL,
    amount_invested BIGINT UNSIGNED NOT NULL,
    equity_acquired DECIMAL(5, 2) NOT NULL,
    investment_date DATE NOT NULL,
    deal_reference VARCHAR(255) NULL,
    CONSTRAINT chk_equity_acquired CHECK (equity_acquired > 0 AND equity_acquired <= 100),
    CONSTRAINT unique_investor_round UNIQUE (investor_id, round_id),
    FOREIGN KEY (investor_id) REFERENCES INVESTOR (investor_id),
    FOREIGN KEY (round_id) REFERENCES FUNDING_ROUND (round_id),
    INDEX idx_investment_investor (investor_id),
    INDEX idx_investment_round (round_id)
);

-- Table 8: EQUITY_HISTORY
CREATE TABLE IF NOT EXISTS EQUITY_HISTORY (
    ownership_id INT AUTO_INCREMENT PRIMARY KEY,
    startup_id INT NOT NULL,
    round_id INT NOT NULL,
    founder_id INT NULL,
    investor_id INT NULL,
    equity_percentage DECIMAL(5, 2) NOT NULL,
    CONSTRAINT chk_equity_percentage CHECK (equity_percentage > 0 AND equity_percentage <= 100),
    CONSTRAINT chk_stakeholder_type CHECK (
        (founder_id IS NOT NULL AND investor_id IS NULL) OR
        (founder_id IS NULL AND investor_id IS NOT NULL)
    ),
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (startup_id) REFERENCES STARTUP (startup_id),
    FOREIGN KEY (round_id) REFERENCES FUNDING_ROUND (round_id),
    FOREIGN KEY (founder_id) REFERENCES FOUNDER (founder_id),
    FOREIGN KEY (investor_id) REFERENCES INVESTOR (investor_id),
    INDEX idx_equity_history_startup (startup_id),
    INDEX idx_equity_history_round (round_id),
    INDEX idx_equity_history_founder (founder_id),
    INDEX idx_equity_history_investor (investor_id)
);

-- Table 9: EQUITY_HISTORY_AUDIT
CREATE TABLE IF NOT EXISTS EQUITY_HISTORY_AUDIT (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    ownership_id INT NOT NULL,
    startup_id INT NOT NULL,
    old_equity_percentage DECIMAL(5, 2) NULL,
    new_equity_percentage DECIMAL(5, 2) NULL,
    action_type ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DELIMITER $$
CREATE TRIGGER after_equity_insert
AFTER INSERT ON EQUITY_HISTORY
FOR EACH ROW
BEGIN
    INSERT INTO EQUITY_HISTORY_AUDIT (ownership_id, startup_id, old_equity_percentage, new_equity_percentage, action_type)
    VALUES (NEW.ownership_id, NEW.startup_id, NULL, NEW.equity_percentage, 'INSERT');
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER after_equity_update
AFTER UPDATE ON EQUITY_HISTORY
FOR EACH ROW
BEGIN
    IF OLD.equity_percentage != NEW.equity_percentage THEN
        INSERT INTO EQUITY_HISTORY_AUDIT (ownership_id, startup_id, old_equity_percentage, new_equity_percentage, action_type)
        VALUES (NEW.ownership_id, NEW.startup_id, OLD.equity_percentage, NEW.equity_percentage, 'UPDATE');
    END IF;
END$$
DELIMITER ;
