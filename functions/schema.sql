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

-- Funnel telemetry (P1-3): pure anonymous aggregate — one counter row per
-- distinct (event, tour, lang, step, is_return) combo, bumped +1 per beacon.
-- Deliberately NOT an append-only event log: no per-event rows, no timestamp, no
-- insertion order — so nothing can reconstruct an individual visitor's path
-- (DIRECTION ironclad rule 2: no account, no session id, no IP, no correlation).
-- `is_return` is a client-self-reported boolean (sessionStorage, cleared on tab
-- close) flagging a repeat start this session — meaningful only for event=start.
-- Sentinels: tour='' and step=0 where N/A (NULLs can't sit in a composite PK with
-- ON CONFLICT). `returning` is a SQLite keyword, hence the column name is_return.
CREATE TABLE IF NOT EXISTS event_count (
    event     TEXT    NOT NULL,            -- start | step | finish | drop | picker_view
    tour      TEXT    NOT NULL DEFAULT '', -- '' for picker_view
    lang      TEXT    NOT NULL DEFAULT '', -- en | zh | ja
    step      INTEGER NOT NULL DEFAULT 0,  -- 1-based beat; 0 for start/picker_view
    is_return INTEGER NOT NULL DEFAULT 0,  -- 1 = repeat start this session
    count     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (event, tour, lang, step, is_return)
);
