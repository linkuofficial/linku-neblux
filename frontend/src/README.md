# Frontend Modularization Staging (P1 Prep)

This directory is the staging area for extracting logic from frontend/app.html.

Planned extraction order:
1. api.ts: fetch wrappers and endpoint mapping
2. state.ts: UI/app state and localStorage guards
3. graph.ts: D3 rendering and simulation wiring

Current status:
- api.js extracted (network calls, retries, fallbacks)
- state.js extracted (safe IDs, learned-state storage helpers)
- graph.js extracted (prerequisite graph construction helpers)
- app-main.js extracted from app.html inline script (module entry)

P1 guardrail:
- Keep behavior identical while moving code.
- Move in small slices and verify with smoke + contract tests.
