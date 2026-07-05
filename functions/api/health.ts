// Cloudflare Pages Function — GET /api/health
//
// P1-0 skeleton liveness probe: proves the Functions runtime is serving
// same-origin /api/* alongside the static site. Needs no D1/KV bindings, so it
// works the moment the Pages project has Functions enabled. Kept intentionally
// trivial — real endpoints (og, share, echo) arrive in P1-1/P1-2.
//
// Dependency-free on purpose: no @cloudflare/workers-types import (esbuild
// strips types at deploy; wrangler pages dev does not typecheck).
export function onRequestGet(): Response {
    return Response.json({ ok: true });
}
