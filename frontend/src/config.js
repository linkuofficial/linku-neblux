// Frontend feature flags for progressive enhancement.
// DIRECTION ironclad rule 1: with the whole API dead, the site must still work.
//
// API_ENABLED gates every /api/* attempt the frontend makes. Default false: no
// backend is deployed, so landing/explorer skip /api entirely and read the
// static /data/*.json directly — no failed request, no console error, no wasted
// round-trip. Flip to true only once same-origin /api/* endpoints are actually
// live in production. The static fallback path stays wired either way, so the
// "API down → site works" guard (tests/e2e/api-failure.spec.ts) keeps passing.
export const API_ENABLED = false;
