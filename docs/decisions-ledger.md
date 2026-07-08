# Neblux Decisions Ledger

> Small ledger for implementation decisions that are easy to forget but not large enough for a task brief. ROADMAP remains the execution checklist.

## 2026-07-08 — P1-3 Telemetry Guardrails

- P1-3 telemetry uses D1 `event_count` anonymous aggregate counters, not Analytics Engine and not append-only event logs. There is no timestamp, session id, IP, user id, or per-visitor path reconstruction.
- Local/e2e builds keep `VITE_TELEMETRY_ENABLED` off. Automated tests guard the dormant path; prod active-path verification is deferred until `[人工]` applies `functions/schema.sql` to D1 `neblux-echo` and enables `VITE_TELEMETRY_ENABLED=true` in Cloudflare Pages Production.
- After prod enablement, verify the five beacon paths manually with browser Network plus D1 queries: `picker_view`, `start`, `step`, `finish`, and `drop`.
- No rate limit is currently applied to `/api/event`; resulting numbers are internal trend signals only. Add Cloudflare rate limiting or a throttle before using these metrics as public evidence or before increasing abuse incentives.
- Function typechecking is not part of `npm run verify` yet. Adding a dedicated functions typecheck / active-path e2e gate is valid future hardening, but it touches backend verification scope and should be handled as a separate brief.