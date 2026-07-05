-- Neblux D1 schema (binding name: DB). Apply in the Cloudflare dashboard or via
--   npx wrangler d1 execute DB --file=functions/schema.sql
-- Anonymous aggregate counts only — DIRECTION ironclad rule 2 (no accounts, no
-- personal data). Populated by the P1-2 echo endpoint and tour-finish tracking.

-- Per-step "✨ echo" tallies (P1-2): one row per (tour, step).
CREATE TABLE IF NOT EXISTS echo (
    tour  TEXT    NOT NULL,
    step  INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tour, step)
);

-- Completed-tour tallies: one row per tour.
CREATE TABLE IF NOT EXISTS tour_finish (
    tour  TEXT    PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
);
