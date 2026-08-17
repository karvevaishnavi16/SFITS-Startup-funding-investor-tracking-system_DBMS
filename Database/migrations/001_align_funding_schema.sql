USE SFITS_DBMS_PRJ;

-- Brings an existing SFITS database in line with the current schema/seed contract.
-- Safe to run on databases that already contain the original columns.

ALTER TABLE FUNDING_ROUND
    ADD COLUMN IF NOT EXISTS target_funding BIGINT UNSIGNED NULL DEFAULT NULL AFTER round_date,
    ADD COLUMN IF NOT EXISTS amount_raised BIGINT UNSIGNED NULL DEFAULT NULL AFTER target_funding;

ALTER TABLE INVESTMENT
    ADD COLUMN IF NOT EXISTS investment_date DATE NULL AFTER equity_acquired;

-- Backfill the canonical raised amount from the legacy column when available.
UPDATE FUNDING_ROUND
SET amount_raised = total_amount_raised
WHERE amount_raised IS NULL
  AND total_amount_raised IS NOT NULL;
