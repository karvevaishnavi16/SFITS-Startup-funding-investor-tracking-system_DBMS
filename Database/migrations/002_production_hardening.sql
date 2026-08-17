USE SFITS_DBMS_PRJ;

-- Safe migration for databases created from an older SFITS schema.
-- Run this once before starting the hardened backend.

ALTER TABLE FUNDING_ROUND
    ADD COLUMN IF NOT EXISTS target_funding BIGINT UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_raised BIGINT UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE INVESTMENT
    ADD COLUMN IF NOT EXISTS investment_date DATE NULL;

UPDATE FUNDING_ROUND
SET target_funding = COALESCE(target_funding, total_amount_raised, 0),
    amount_raised = COALESCE(amount_raised, total_amount_raised, 0)
WHERE target_funding IS NULL OR amount_raised IS NULL;

UPDATE INVESTMENT
SET investment_date = COALESCE(investment_date, CURDATE())
WHERE investment_date IS NULL;

ALTER TABLE INVESTMENT
    MODIFY investment_date DATE NOT NULL;

CREATE TABLE IF NOT EXISTS AUTH_SESSION (
    session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USERS (user_id) ON DELETE CASCADE,
    INDEX idx_auth_session_user (user_id),
    INDEX idx_auth_session_expiry (expires_at)
);

CREATE INDEX idx_funding_round_date
    ON FUNDING_ROUND (startup_id, round_date);

CREATE INDEX idx_equity_history_snapshot
    ON EQUITY_HISTORY (startup_id, recorded_at);

CREATE INDEX idx_equity_audit_startup
    ON EQUITY_HISTORY_AUDIT (startup_id, changed_at);
