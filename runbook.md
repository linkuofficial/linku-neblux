# Nexus Alert and Rollback Runbook

## Scope

This runbook defines how to decide severity after receiving an alert and how to execute a safe rollback for Nexus.

## Inputs and Preconditions

- Service health endpoint: `http://127.0.0.1:8000/api/health`
- Metrics endpoint: `http://127.0.0.1:8000/api/metrics`
- Smoke command: `npm run smoke:notify`
- Rollback command: `npm run rollback -- --image <previous-image-tag>`

## Alert Decision Flow

1. Confirm if this is a release window.
2. Check service health quickly:
   - `GET /api/health` is not 200, treat as `SEV-1`.
   - Health is 200 but core user flow fails, treat as `SEV-2`.
3. Check metrics and logs:
   - 5xx rises continuously for 5 minutes: candidate rollback.
   - Neo4j connectivity errors cause fallback and user-facing degradation: candidate rollback.
   - Admin trigger burst only, but user flows are normal: investigate first, rollback usually not required.
4. Run `npm run smoke:notify` to validate current state.
5. Decide action:
   - If core flow unavailable or smoke fails repeatedly: rollback now.
   - If only non-critical degradation: monitor and patch forward.

## Rollback Trigger Conditions

Execute rollback immediately when any condition is true:

1. `/api/health` unstable for 10 minutes.
2. Core user flow (load/search/language switch) is unavailable.
3. 5xx persists and smoke cannot pass.
4. Neo4j-related failures cause sustained unusable responses.

## Rollback Command

Use Docker image rollback via npm script:

```bash
npm run rollback -- --image <previous-image-tag>
```

Optional arguments:

- `--container <name>`: target container name (default: `nexus`)
- `--port <host-port>`: published host port (default: `8000`)
- `--env-file <path>`: env file path (default: `.env`)
- `--dry-run`: print actions without changing runtime

Example:

```bash
npm run rollback -- --image nexus:2026-05-24-rc1 --container nexus --port 8000
```

## Rollback Execution Steps

1. Confirm previous stable image tag.
2. Run dry-run first:
   - `npm run rollback -- --image <previous-image-tag> --dry-run`
3. Execute actual rollback command.
4. Verify after rollback:
   - `GET /api/health` returns 200.
   - Run `npm run smoke:notify` and confirm `result=PASS`.
5. Keep degraded version frozen until root cause is documented.

## Post-Incident Checklist

1. Record timeline: alert time, decision time, rollback complete time.
2. Record impact scope: affected APIs/pages and duration.
3. Record root cause and immediate fix plan.
4. Create follow-up items to prevent recurrence.

## Quick Triage Matrix

- 5xx spike + health failing: rollback now.
- 5xx spike + health OK + smoke fails: rollback now.
- Neo4j fallback + user-facing search degraded: rollback if persists.
- Admin burst only + user flow normal: monitor and tighten guardrails.
