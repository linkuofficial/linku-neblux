# Graph integrity — broken edges (found & resolved 2026-06-15)

An audit of `data/all_nodes.json` found **73 connection entries (51 unique
targets)** pointing to node IDs that did not exist in the 627-node graph. These
were skipped at both layers (`layout.js:23` build-time bake, `app-main.js:647`
runtime), so they never crashed or rendered — but they were dangling data.

## Resolution
Applied 2026-06-15 (see commit history). `check_graph_integrity.py` now reports
**0 ERROR, 0 WARN**; rebuild + E2E (13/13) confirmed the re-baked layout is
healthy.

### Remapped (21 edges → 14 targets): clear typos pointed at the real node
Author linked the wrong id variant; retargeted to the existing node.

| was | now |
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
| cognitive_biases_concept | cognitive_bias_concept |
| paradigm_shift_concept | paradigm_shifts_concept |
| the_sublime_concept | sublime_concept |

(Guards: no self-loop, no duplicate edge — both were 0 in practice.)

### Dropped (52 edges → 37 targets): no existing node
These pointed at topics with no node (consciousness, democracy, classical_mechanics,
organic_chemistry, deep_learning, immunology, genomics, climate_science, etc.).
Creating ~37 fully-translated nodes would be graph **expansion** (out of scope per
"不擴張"); remapping to an approximate node would fabricate a wrong relationship.
So the dangling edges were removed to make the data honest.

**If you later want any of those topics as real nodes**, add the node (with its
own sections/connections) and the inbound links can be re-authored — the dropped
edges are listed in git history (this commit's diff) for reference.

## Prevention
`scripts/check_graph_integrity.py` screens for broken edges / dup ids / self-loops
/ invalid enums on every future data edit.
