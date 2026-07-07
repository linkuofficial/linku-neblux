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
// and reintroduce the 404s P1-0 stanched.
//
// Build-time gate, NOT a hardcoded constant: it must be false everywhere the
// backend doesn't exist (local dev, `npm run dev`, the e2e server) so those
// environments make zero /api/echo calls and the dormancy + api-failure guards
// stay green. It is true ONLY when the production build sets VITE_ECHO_ENABLED=
// true — i.e. on Cloudflare Pages, where the D1 `DB` binding and the /api/echo
// function actually exist. Vite statically replaces the import.meta.env
// reference at build time; unset → undefined → false.
export const ECHO_ENABLED = import.meta.env.VITE_ECHO_ENABLED === "true";

// TELEMETRY_ENABLED gates the wonders funnel beacons (/api/event, P1-3): start /
// step / finish / drop / picker_view. Same build-time pattern as ECHO_ENABLED —
// false everywhere the backend doesn't exist (local dev, e2e) so those make zero
// /api/event calls and the dormancy + api-failure guards stay green (sendEvent
// short-circuits on the false constant — the sendBeacon call is never reached).
// True only when the production build sets
// VITE_TELEMETRY_ENABLED=true, where the D1 `DB` binding and /api/event exist.
// Every beacon is fire-and-forget and fails silently (ironclad rule 1); the data
// is anonymous aggregate only (ironclad rule 2).
export const TELEMETRY_ENABLED = import.meta.env.VITE_TELEMETRY_ENABLED === "true";
