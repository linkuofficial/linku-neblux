// Cloudflare Pages Function — /api/echo  (P1-2 "級1 迴響 ✨")
//
//   POST /api/echo  {tour, step}   → bump the per-beat resonance tally +1 → {ok, count}
//   GET  /api/echo?tour=<id>       → {ok, counts: {[step]: count}} for that tour
//
// Anonymous aggregate only (DIRECTION ironclad rule 2: no accounts, no PII). The
// only "identity" touched is the client IP, and it is SHA-256-hashed before use
// as an ephemeral throttle key — the raw address is never stored anywhere, never
// written to D1, never returned. Progressive enhancement: the frontend calls
// this only when API_ENABLED is true and fails silently, so with the API down
// the site is unchanged (ironclad rule 1).
//
// Valid tours + their exact step counts come from the built tour-index.json (the
// single source of truth — no drift with the frontend tour list; tours run 6–7
// steps, so a fixed bound can't validate them).
//
// Bindings (created in the Cloudflare dashboard — [人工], see functions/schema.sql):
//   DB       — D1 database (table `echo`)
//   THROTTLE — KV namespace (best-effort anti-spam; optional — missing → no throttle)
//
// Dependency-free like health.ts (no @cloudflare/workers-types import; esbuild
// strips the inline types at deploy; wrangler pages dev does not typecheck).

interface Env {
    DB: any;        // D1Database
    THROTTLE?: any; // KVNamespace
}

// tour id → step count, from the deployed /data/tour-index.json. Memoized per
// isolate. Null on fetch failure → the caller rejects (echo silently no-ops
// frontend-side, ironclad rule 1).
let tourStepsMemo: Record<string, number> | null = null;
async function tourSteps(request: Request): Promise<Record<string, number> | null> {
    if (tourStepsMemo) return tourStepsMemo;
    try {
        const res = await fetch(new URL('/data/tour-index.json', request.url).toString());
        if (!res.ok) return null;
        const idx: any = await res.json();
        // Null-proto map so a tour like "constructor"/"toString" can't hit an
        // inherited Object.prototype member and pass as a valid tour.
        const map: Record<string, number> = Object.create(null);
        for (const id of Object.keys(idx.tours || {})) {
            const t = idx.tours[id];
            map[id] = t && Array.isArray(t.steps) ? t.steps.length : 0;
        }
        tourStepsMemo = map;
        return map;
    } catch { return null; }
}

// Same-origin guard: browsers send Origin on a cross-site POST; reject those.
// A missing Origin (some same-origin beacons omit it) is allowed through.
function sameOrigin(request: Request): boolean {
    const origin = request.headers.get('Origin');
    if (!origin) return true;
    try { return new URL(origin).origin === new URL(request.url).origin; }
    catch { return false; }
}

// Salted SHA-256 of the IP, truncated — a stable per-client throttle token that
// never reveals or stores the raw address (ironclad rule 2, defense-in-depth).
async function throttleId(ip: string): Promise<string> {
    const data = new TextEncoder().encode('neblux-echo:' + ip);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

async function currentCount(env: Env, tour: string, step: number): Promise<number> {
    const row = await env.DB.prepare('SELECT count FROM echo WHERE tour = ? AND step = ?')
        .bind(tour, step).first();
    return row ? row.count : 0;
}

export async function onRequestPost(
    { request, env }: { request: Request; env: Env },
): Promise<Response> {
    if (!sameOrigin(request)) return Response.json({ ok: false }, { status: 403 });

    let body: any;
    try { body = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
    const tour = body && body.tour;
    const step = body && Number(body.step);
    try {
        const steps = await tourSteps(request);
        if (!steps) return Response.json({ ok: false });   // index unavailable → soft-fail (no browser error)
        const max = steps[tour];
        if (!max || !Number.isInteger(step) || step < 1 || step > max) {
            return Response.json({ ok: false }, { status: 400 });   // genuine bad input; the app never sends this
        }

        // Best-effort IP throttle: >3 bumps of the same (client, tour, step) per hour
        // → no-op (still 200). A missing KV binding just skips throttling.
        if (env.THROTTLE) {
            const id = await throttleId(request.headers.get('CF-Connecting-IP') || 'anon');
            const key = `${id}:${tour}:${step}`;
            const n = parseInt((await env.THROTTLE.get(key)) || '0', 10) || 0;
            if (n >= 3) {
                return Response.json({ ok: true, count: await currentCount(env, tour, step), throttled: true });
            }
            await env.THROTTLE.put(key, String(n + 1), { expirationTtl: 3600 });
        }

        const row = await env.DB
            .prepare('INSERT INTO echo (tour, step, count) VALUES (?, ?, 1) ON CONFLICT(tour, step) DO UPDATE SET count = count + 1 RETURNING count')
            .bind(tour, step)
            .first();
        return Response.json({ ok: true, count: row ? row.count : null });
    } catch {
        // Internal failure (D1/KV binding missing or erroring). Soft-fail with a
        // 200 {ok:false} so the browser logs no console error and the frontend
        // degrades silently — no ✨ (ironclad rule 1).
        return Response.json({ ok: false });
    }
}

export async function onRequestGet(
    { request, env }: { request: Request; env: Env },
): Promise<Response> {
    const tour = new URL(request.url).searchParams.get('tour');
    try {
        const steps = await tourSteps(request);
        if (!steps) return Response.json({ ok: false });                 // index unavailable → soft-fail
        if (!tour || !steps[tour]) return Response.json({ ok: false }, { status: 400 }); // bad param; app never sends
        const res = await env.DB.prepare('SELECT step, count FROM echo WHERE tour = ?').bind(tour).all();
        const counts: Record<string, number> = {};
        for (const r of (res && res.results ? res.results : [])) counts[r.step] = r.count;
        return Response.json({ ok: true, counts });
    } catch {
        // D1 missing/erroring → soft-fail 200 {ok:false}: no browser console error,
        // frontend shows no ✨ (ironclad rule 1).
        return Response.json({ ok: false });
    }
}
