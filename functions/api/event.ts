// Cloudflare Pages Function — /api/event  (P1-3 "級3 遙測")
//
//   POST /api/event  {tour, event, lang, step, returning}  → bump a counter → {ok}
//
// Funnel telemetry: start / step / finish / drop / picker_view. Anonymous
// aggregate only (DIRECTION ironclad rule 2: no account, no session id, no IP,
// nothing identifying). Storage is a pure counter table — no per-event rows, no
// timestamp, no ordering — so an individual visitor's path can never be
// reconstructed. `returning` is a client-self-reported boolean (the tab's
// sessionStorage) flagging a repeat start this session; server-side it is only
// ever summed, never linked across events.
//
// Progressive enhancement (ironclad rule 1): the frontend beacons this only when
// TELEMETRY_ENABLED, and internal failures soft-fail with 200 {ok:false} so the
// browser logs no error and the tour is unaffected with the API down.
//
// Bindings (Cloudflare dashboard — [人工], see functions/schema.sql):
//   DB — D1 database (table `event_count`, shared with echo)
//
// Dependency-free like echo.ts / health.ts.

interface Env {
    DB: any; // D1Database
}

const EVENTS = new Set(['start', 'step', 'finish', 'drop', 'picker_view']);
const LANGS = new Set(['en', 'zh', 'ja']);

// tour id → step count, from the deployed /data/tour-index.json (single source of
// truth; memoized per isolate). Null on fetch failure → caller soft-fails.
let tourStepsMemo: Record<string, number> | null = null;
async function tourSteps(request: Request): Promise<Record<string, number> | null> {
    if (tourStepsMemo) return tourStepsMemo;
    try {
        const res = await fetch(new URL('/data/tour-index.json', request.url).toString());
        if (!res.ok) return null;
        const idx: any = await res.json();
        const map: Record<string, number> = {};
        for (const id of Object.keys(idx.tours || {})) {
            const t = idx.tours[id];
            map[id] = t && Array.isArray(t.steps) ? t.steps.length : 0;
        }
        tourStepsMemo = map;
        return map;
    } catch { return null; }
}

// Same-origin guard: reject a cross-site POST (browsers send Origin on those). A
// missing Origin (some same-origin beacons omit it) is allowed through.
function sameOrigin(request: Request): boolean {
    const origin = request.headers.get('Origin');
    if (!origin) return true;
    try { return new URL(origin).host === new URL(request.url).host; }
    catch { return false; }
}

export async function onRequestPost(
    { request, env }: { request: Request; env: Env },
): Promise<Response> {
    if (!sameOrigin(request)) return Response.json({ ok: false }, { status: 403 });

    let body: any;
    try { body = await request.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }

    const event = body && body.event;
    const lang = body && body.lang;
    const returning = body && Number(body.returning) === 1 ? 1 : 0;

    // Structural validation — the app never sends anything outside these; a bad
    // payload is a 400, not stored.
    if (!EVENTS.has(event)) return Response.json({ ok: false }, { status: 400 });
    if (!LANGS.has(lang)) return Response.json({ ok: false }, { status: 400 });

    try {
        const steps = await tourSteps(request);
        if (!steps) return Response.json({ ok: false }); // index unavailable → soft-fail (no browser error)

        let tour: string | null = null;
        let step: number | null = null;

        if (event !== 'picker_view') {
            tour = body && body.tour;
            if (!tour || !steps[tour]) return Response.json({ ok: false }, { status: 400 });
            if (event !== 'start') {
                // step / finish / drop carry a 1-based beat within the tour.
                const s = Number(body && body.step);
                if (!Number.isInteger(s) || s < 1 || s > steps[tour]) {
                    return Response.json({ ok: false }, { status: 400 });
                }
                step = s;
            }
        }

        // Pure aggregate: bump the counter for this (event, tour, lang, step,
        // is_return) combo. No per-event row, no timestamp — nothing to correlate
        // (ironclad rule 2). NULLs can't sit in a composite PK with ON CONFLICT, so
        // absent dims collapse to sentinels: tour='' (picker_view), step=0
        // (start/picker_view). Column is `is_return` (wire field `returning`;
        // RETURNING is a reserved SQLite keyword).
        await env.DB
            .prepare('INSERT INTO event_count (event, tour, lang, step, is_return, count) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(event, tour, lang, step, is_return) DO UPDATE SET count = count + 1')
            .bind(event, tour ?? '', lang, step ?? 0, returning)
            .run();
        return Response.json({ ok: true });
    } catch {
        // Internal failure (D1 binding missing/erroring). Soft-fail 200 {ok:false}
        // so the browser logs no console error and the tour degrades silently
        // (ironclad rule 1).
        return Response.json({ ok: false });
    }
}
