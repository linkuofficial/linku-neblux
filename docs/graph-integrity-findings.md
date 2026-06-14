# Graph integrity findings — broken edges (2026-06-15)

Audit of `data/all_nodes.json` found **73 connection entries (51 unique targets)**
pointing to node IDs that do not exist in the 627-node graph.

## Impact / urgency: LOW (no crash, no visual effect)
Broken-target edges are **skipped identically at both layers**, so they currently
have *zero* effect on layout or rendering:
- build-time layout baking: `frontend/src/engine/layout.js:23` → `if (!ids.has(c.target)) continue;`
- runtime edge build: `frontend/src/app-main.js:647` → `if (!idSet.has(c.target)) continue;`

Because both layers already drop them, **removing these entries would be
layout-neutral** (the baked coordinates are computed from the filtered edge set).
Conversely, **remapping/adding** any of them to a real node *would* change the
force-directed layout (and thus the visual), so those need a visual check.

This was NOT auto-fixed: 38/51 are missing topics that look like an intended
content roadmap (deleting would erase intent), and the remaps change the visual
(can't verify headlessly). Decide per category below.

## Category A — wrong suffix, the node exists as `_field` (11) — likely real edges
The author linked `X_concept` but only `X_field` exists (or vice versa).
Remapping restores an intended edge **but changes the baked layout** → rebuild + visual check.

| broken target | should likely be |
|---|---|
| algebra_concept | algebra_field |
| calculus_concept | calculus_field |
| ecology_concept | ecology_field |
| evolution_concept | evolution_field |
| genetics_concept | genetics_field |
| geometry_concept | geometry_field |
| information_theory_concept | information_theory_field |
| neuroscience_concept | neuroscience_field |
| philosophy_of_science_concept | philosophy_of_science_field |
| political_philosophy_field | political_philosophy_concept |
| statistics_concept | statistics_field |

## Category B — singular/plural drift, a match exists (3) — likely real edges
| broken target | should likely be |
|---|---|
| cognitive_biases_concept | cognitive_bias_concept |
| paradigm_shift_concept | paradigm_shifts_concept |
| the_sublime_concept | sublime_concept |

## Category C — genuinely missing nodes (37) — content roadmap decision
These targets have no plausible existing node. Either **create the node** (if it
belongs in the graph) or **drop the edge** (if not). Do not auto-delete: several
look like intended future content.

anatomy_concept, automation_concept, axiomatic_system_concept, cell_biology_concept,
civil_engineering_concept, classical_mechanics_concept, climate_science_concept,
confucianism_concept, consciousness_concept, creativity_concept,
decolonization_of_history_concept, deep_learning_concept, democracy_concept,
distributed_systems_concept, electromagnetic_theory_concept, gene_expression_concept,
genetic_engineering_concept, genomics_concept, immunology_concept, learning_theory_concept,
narratology_concept, nature_vs_nurture_concept, non_euclidean_geometry_concept,
nuclear_fission_concept, numerical_analysis_concept, organic_chemistry_concept,
plate_tectonics_concept, recursion_concept, religion_concept, semiconductor_physics_concept,
sociology_field, stem_cell_biology_concept, stereochemistry_concept, structuralism_concept,
systems_biology_concept, systems_thinking_concept, taxonomy_concept

## How to act
- A + B (14 edges): if you confirm the remaps, update the `target` in the source
  nodes' `connections`, rebuild, and eyeball the graph (layout shifts slightly).
- C (37 edges): decide create-vs-drop per topic. Many (consciousness, democracy,
  organic_chemistry, classical_mechanics, deep_learning, immunology…) are strong
  candidate nodes if you expand coverage; otherwise drop the dangling edges.
- A `check_graph_integrity.py` screen could be added to catch this on future edits.
