# M-1 Integration Audit

Date: 2026-07-09  
Scope: read-only audit before implementing the Neblux depth layer.

## Findings

### Existing graph source

The graph source of truth is `data/all_nodes.json`.

Observed shape:

- root object with `meta.total` and `nodes`
- node fields include `id`, `label`, `type`, `domain`, `display_tags`, `description`, `connections`, `sections`
- graph relationships live inside `connections`
- learning prerequisite semantics are already represented by `learning_prerequisite` plus relation metadata

This does not match the v0.1 `nodes.seed.json` schema. A separate prereq-DAG registry would become a second source of truth.

### Build pipeline

`vite.config.ts` already has two important build-time layers:

- `copyDataPlugin()` copies/splits graph data into `frontend/public/data/`
- `staticHtmlPlugin()` generates static concept pages, trust pages, sitemap, and `graph.json`

Generated public artifacts are gitignored. This repo already treats static generated pages as build output rather than authored truth.

### CSP

`frontend/public/_headers` sets:

```txt
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'
```

Implication:

- executable inline script is not deployable
- same-origin external JS is deployable
- inline style is currently deployable
- JSON metadata script blocks are acceptable because they are not executed

### Target concept mapping

The v0.1 exact ids do not exist in `data/all_nodes.json`:

- `sine-wave`
- `fourier-series`
- `s-plane`
- `phasor`
- `laplace-transform`
- `transfer-function`
- `step-response`

Closest existing nodes:

| depth id | existing node id | confidence | note |
|---|---|---:|---|
| `sine-wave` | `oscillations_and_waves_concept` | medium | Broad physics/math wave node; no exact sine node exists. |
| `fourier-series` | `fourier_analysis_concept` | medium | Fourier analysis exists; series is a narrower focus. |
| `s-plane` | `control_theory_concept` | medium | s-plane is a control-theory subtopic; no exact pole/s-plane node exists. |

No `data/*.json` edit is required for M0. If exact graph nodes are needed later, that becomes a data change and should use the repo's review path.

## Decision

Proceed with `depth_manifest.json`, not `nodes.json`.

The manifest should attach depth pages to existing node ids and track only depth-page state. It must not duplicate graph labels, graph descriptions, or graph topology.

## Next Gate

M1 may start only after `validate-depth.mjs` passes. The first page should be built in a CSP-compatible shape from the beginning.
