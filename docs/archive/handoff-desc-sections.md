# Handoff — finish the structured description sections rollout

You (a fresh Claude) are continuing an in-progress task in the **Neblux** project (`D:\LINKU\Neblux`). Read this whole file first. The prior session built the mechanism and converted 254 of 627 nodes; **your job is to convert the remaining 373 nodes** using the exact same, already-proven pipeline.

---

## 1. What this is

Neblux node detail panels show each node's English description. We replaced the old "wall of text" with **structured, collapsible, type-aware sections**:

- **① lead** — a one-sentence definition (always visible, the hook)
- **② substance** — concept/field: prose `core` ("The core idea"); person/event: a `works` list (person → "Notable works & ideas", event → "Key moments")
- **③ significance** — `impact` (concept "What it changed" / person "Legacy" / event "Aftermath")
- **④ links** — `Connections across fields`: one row per domain, colour-coded to the 12 canonical domains

The labels localise (en/zh/ja) but **content is English-only**. Non-English / unstructured copy falls back to a heuristic renderer, so nothing breaks.

## 2. Current state (as of commit 91e069a, deployed)

- **Done: 254 nodes** with structured `sections` — all 45 persons + all 212 original "narrative" nodes. All 10/10 on quality_check, validation passes.
- **Remaining: 373 nodes** = the "bridge" nodes (concept/field/event that already had `In <domain>,` structure). They currently render with the OLD heuristic ("Why it matters" / "Across fields", no type-aware labels, no colour). **There are NO persons left** — all 373 are concept (328) / field (25) / event (20), so the standard concept spec covers them.
- Goal: give these 373 the same `sections` treatment for full visual consistency.

## 3. Architecture (already built — do not rebuild)

- Source of truth: `data/all_nodes.json`. Each node may have an optional `sections` object:
  ```json
  "sections": { "lead": "...", "core": "...", "impact": "...",
                "links": [ {"d":"BIO","t":"..."}, ... ],
                "works": ["...", "..."]   // optional list; persons/events mainly
  }
  ```
- `vite.config.ts` splits `sections` out into `frontend/public/data/sections.json` at build (stripped from the slim topology, streamed at runtime like descriptions).
- `frontend/src/api.js` → `fetchGraphSections()` loads it.
- `frontend/src/app-main.js` and `frontend/src/explorer-main.js` each have `renderStructuredSections()` + `structLabel()` + `DOMAIN_NAME` (parallel copies — keep them in sync). They render sections when `LANG==='en' && enSectionsMap[id]`, else fall back to `descSectioned()` on flat text.
- Domain colours come from `DC` (window.NebluxTokens.DOMAIN_COLORS); names from `DOMAIN_NAME`.
- **You should NOT need to touch any JS/CSS/vite** — the mechanism is done. You only generate `sections` content data.

## 4. The pipeline (use exactly this)

### 4a. Generate the remaining worklist
```bash
python -c "import json; nodes=json.load(open('data/all_nodes.json',encoding='utf-8'))['nodes']; remain=[n['id'] for n in nodes if not n.get('sections') and (n.get('description') or '').strip()]; print(len(remain)); [print(','.join(remain[i:i+13])) for i in range(0,len(remain),13)]"
```
This prints ~29 chunks of 13 ids. (Re-run anytime; it always reflects what's left.)

### 4b. Spawn QA'd subagents
The agent spec is already written at **`data/_sections_spec.md`**. Spawn `general-purpose` agents, model `sonnet`, ~5 at a time. Each agent prompt should be short:
```
Read the full spec at D:\LINKU\Neblux\data\_sections_spec.md and follow it exactly. Work in D:\LINKU\Neblux.
Your assigned node IDs (13): <comma list>
Write your output JSON object to: D:\LINKU\Neblux\data\_sections_<name>.json
Reply ONLY: done data/_sections_<name>.json
```
(The spec contains the schema, hard rules, the data-dump command, and a gold example.)

### 4c. Merge, pre-fix, apply
```bash
# merge all chunk files + pre-fix the two most common quality_check breakers
python -c "import json,re,glob; m={}; [m.update(json.load(open(f,encoding='utf-8'))) for f in sorted(glob.glob('data/_sections_<wave>*.json'))]; \
[v.__setitem__('lead', re.sub(r'\bwas\b','is',re.sub(r'\bwere\b','are',v['lead'],count=1),count=1).replace('(c. ','(around ').replace(' c. ',' around ').replace('U.S.','American')) for v in m.values() if 'lead' in v]; \
json.dump(m,open('data/_sections_apply.json','w',encoding='utf-8'),ensure_ascii=False,indent=2); print('merged',len(m))"

python scripts/apply_sections.py data/_sections_apply.json
```
`apply_sections.py` injects `sections` AND regenerates a clean flat `description` (canonical `In <domain>,` prose, incl. works) so search/SEO/quality_check keep working. It backs up `all_nodes.json` first and skips anything outside 50–360 words.

### 4d. QA — must be 0 failures before deploy
```bash
python scripts/validate_nodes.py                      # expect [PASS]
python -c "import subprocess,json,sys; r=subprocess.run([sys.executable,'scripts/quality_check.py','--json'],capture_output=True); raw=r.stdout.decode('utf-8','replace'); lines=raw.splitlines(); js=next(i for i,l in enumerate(lines) if l.strip().startswith('[')); d=json.loads('\n'.join(lines[js:])); lk={n['id']:n for n in d}; ids=list(json.load(open('data/_sections_apply.json',encoding='utf-8')).keys()); fails=[(nid,lk[nid]['description']['scores']) for nid in ids if lk[nid]['description']['total']<10]; print('perfect',len(ids)-len(fails),'fails',len(fails)); [print(' ',n,s) for n,s in fails]"
```
Every node must end at **W=3 S=3 B=4 (total 10)**.

## 5. QA gotchas — the rules quality_check actually enforces (THIS is where fixes go)

When a node fails, the score tells you which axis. The recurring causes:

- **WHAT (W) = 1**: the first sentence has no accepted definition verb. The ONLY accepted verbs are `is`, `are`, `refers to`, `describes`, `studies`, `examines`, `measures`, `captures`, `represents`, `defines`. NOT accepted: **was, were, constitutes, refer to** (plural — note only "refers to" counts), denotes, etc. Also a **period-abbreviation in the first sentence** ("c. 300 BCE", "U.S.") splits the sentence early → W=1; replace with "around 300 BCE" / "American". Fix by editing the lead's verb.
- **SIGNIFICANCE (S) = 2** (means only 1 distinct keyword): need **≥2 DISTINCT** words from this exact list — `important, significance, transform, revolution, enable, foundation, fundamental, breakthrough, changed, shaped, critical, essential, powerful, key, major, impact, influence, advance, pioneer, solve, discover`. Gotchas: "influential" does NOT contain "influence"; "enabling"≠"enable"; "profound"/"enduring" are NOT on the list; two occurrences of the same word count once. Fix by adding a second real keyword to lead/core/impact (e.g. "fundamentally transformed").
- **BRIDGE (B) = 3** (means only 1 outside domain): need **≥2 link domains OUTSIDE the node's own** `domain` array. If all links are own-domain, swap two for outside ones. Domain keyword matching is by substring (e.g. "medical"→MED, "biology"→BIO).

Most fixes are one-line edits to `data/_sections_apply.json` (or per-chunk file), then re-run 4c+4d.

## 6. Deploy (only after 0 failures + visual check)

Master auto-deploys to Cloudflare Pages on push. Procedure:
```bash
npm run build                         # must succeed; emits sections.json
# (optional) verify a node renders: dev server is flaky — use preview_eval DOM reads, screenshots time out
git checkout -b feat/desc-sections-rest   # or reuse a branch; never commit straight to master
git add data/all_nodes.json
git commit -m "feat(content): structured sections for remaining bridge nodes"   # end with the Co-Authored-By trailer
git checkout master && git merge --ff-only <branch> && git push origin master
```
**Get the user's OK before the final merge+push** (their standing rule: branch → verify → visual approval → merge+push). Do batches of a few waves, QA, then one deploy — you don't have to deploy after every wave.

## 7. Hard constraints
- **Anti-hallucination is the top rule.** These descriptions restate existing facts; many source descriptions are truncated mid-sentence — finish only with widely-known certain facts, never invent dates/names/numbers. The subagent spec already says this; spot-check a few works/claims per wave.
- Only touch the English `description`/`sections`. Never change labels, relations, domains, connections, or zh/ja. (Verify with: `git diff data/all_nodes.json | grep -E '^[+-]' | grep -v '^[+-][+-]' | grep -cE '"(label|relation|domain|connections|type|id)"\s*:'` → must be 0.)
- Scratch files (`data/_sections_*.json`, `_restructure_ids.json`, `all_nodes_backup_*`) are gitignored — leave them.

## 8. Pointers
- Full background + the consolidated rule + progress: the auto-memory at `C:\Users\Riku\.claude\projects\D--LINKU-Neblux\memory\project-desc-sections.md` (and `feedback-desc-length-segmentation.md`, `feedback-deploy-safety.md`).
- Agent spec: `data/_sections_spec.md`.
- Apply script: `scripts/apply_sections.py`. QA: `scripts/validate_nodes.py`, `scripts/quality_check.py --json`.
- When done: all 627 nodes have `sections`; update the project memory and tell the user.
