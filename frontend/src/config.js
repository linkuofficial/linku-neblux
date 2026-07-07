// Frontend feature flags for progressive enhancement.
// DIRECTION ironclad rule 1: with the whole API dead, the site must still work.
//
// API_ENABLED gates the landing/explorer graph + i18n /api/* attempts
// (/api/graph/full, /api/i18n/*). Those endpoints are NOT deployed (functions/
// only ships echo + health), so this stays false: the two pages skip /api
// entirely and read the static /data/*.json directly — no failed request, no
// console error, no wasted round-trip. Flip to true only once those specific
// endpoints are actually live. The static fallback path stays wired either way,
// so the "API down → site works" guard (tests/e2e/api-failure.spec.ts) passes.
export const API_ENABLED = false;

// ECHO_ENABLED gates ONLY the wonders per-beat ✨ resonance (/api/echo, P1-2),
// which IS a deployed Pages Function. Split from API_ENABLED so echo can go live
// without making landing/explorer poke the (nonexistent) graph/i18n endpoints
// and reintroduce the 404s P1-0 stanched. Flip to true once the D1 `DB` binding
// is created and functions/schema.sql is applied. Every echo call fails silently
// (ironclad rule 1), so an early flip just shows no ✨ until DB exists.
export const ECHO_ENABLED = false;
