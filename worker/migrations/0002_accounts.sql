-- Accounts for magic-link portability (issue 07 / T6).
-- One row per email. `canonical_user_id` is the id every device of this account resolves to after login
-- (set to the FIRST device's id — no data merge, the account simply adopts that device's memory).
CREATE TABLE IF NOT EXISTS accounts (
  email             TEXT    PRIMARY KEY,
  canonical_user_id TEXT    NOT NULL,
  created_at        INTEGER NOT NULL
);
