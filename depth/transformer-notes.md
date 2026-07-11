# Transformer / Self-Attention Sample Notes

Depth id: `transformer`
Graph node: `deep_learning_concept`
Focus: `self-attention-one-head`
Status: draft (built to spec_version 0.2, cloned from the `fourier-series` golden sample)

## Reference Notes

- Vaswani et al. 2017, "Attention Is All You Need" (NeurIPS; arXiv:1706.03762), §3.2.1
  "Scaled Dot-Product Attention": `Attention(Q, K, V) = softmax(QK^T / √d_k) V`. This page
  implements the single-head, single-sentence form of exactly that equation; our `√d` is
  their `√d_k`. Cited at the section level, not to a specific page number.
- Jay Alammar, "The Illustrated Transformer" (jalammar.github.io) — the intuitive
  walkthrough this page's "it → animal" framing borrows its lineage from. Labeled here as a
  tutorial/secondary source, not the primary reference.
- Optional: Jurafsky & Martin, "Speech and Language Processing" (3rd ed. draft), the
  Transformers / self-attention chapter — cited at chapter level only, no page numbers.

## Formula Walkthrough

Formulas shown on the page:

```txt
score_ij = (q_i · k_j) / √d
w_ij     = softmax_j(score_ij) = exp(score_ij) / Σ_k exp(score_ik)
output_i = Σ_j  w_ij · v_j
```

with `d = 4`, so `√d = 2`.

- `q_i` (teal) — the token you clicked, asking "what am I looking for?" Same color as the
  selected token chip and the selected-row outline on the heatmap.
- `k_j` (amber) — what token `j` offers / represents. Same color as the heatmap columns and
  the stacked-bar segments.
- `q_i · k_j` — the raw match score between query `i` and key `j` (dot product over the 4
  feature axes).
- `√d` — the scaling constant, `= 2` for this toy `d = 4`. Keeps the softmax from saturating
  on a single cell. The page's optional `T` slider is a teaching-only generalization of the
  same idea (`w_ij = softmax_j(score_ij / T)`; real attention fixes this via `√d` alone and
  does not expose a temperature knob). In real models `d ≈ 64` per head, so `√d = 8`.
- `w_ij` (amber) — one heatmap cell, or one segment of the stacked bar. Every row of the
  matrix sums to 1 by construction (softmax).
- `v_j` — the content token `j` actually sends out once it's attended to. **This demo sets
  `v_j = k_j`** (values reuse the key vectors) purely so the page has one fewer table to
  show. Real transformers learn a separate value projection `W_V`; do not read `v = k` as
  a real-model fact.
- `output_i` (ink) — the blended vector after attention: `output_i = Σ_j w_ij · v_j`. For
  `it`, `output ≈ 0.83·v_cat + 0.07·v_it + …`, which lands almost entirely on the ENTITY
  axis — `it` has effectively taken on `cat`'s identity.

### Q/K/V table (hand-picked illustrative constants — not learned)

Feature axes: `[ENTITY, ACTION, STATE, GLUE]`.

| token   | key `k`      | query `q`        |
|---------|--------------|-------------------|
| The     | [0, 0, 0, 2] | [0, 0, 0, 1]      |
| cat     | [3, 0, 0, 0] | [0, 1.5, 1.5, 0]  |
| hid     | [0, 2, 0, 0] | [2, 0, 0, 0]      |
| because | [0, 0, 0, 2] | [0, 0, 0, 1]      |
| it      | [1, 0, 0, 1] | [2.5, 0, 0, 0]    |
| was     | [0, 0, 0, 2] | [0, 0, 1, 0.5]    |
| scared  | [0, 0, 2, 0] | [2, 0, 0, 0]      |

`v_j = k_j` for all tokens (see disclosure above). `Q ≠ K` is preserved deliberately — if
`Q = K` every token would attend mostly to itself, the opposite of the lesson.

### Reproduced weight table (`T = 1`, computed live in `transformer.js`, not hardcoded)

Rows = query token, columns = key token `[The, cat, hid, because, it, was, scared]`. Each
row sums to 1.000 (verified in a throwaway Node script during build, and again via a
`console.assert` self-check that runs once when the page loads):

```
The      .21 .08 .08 .21 .13 .21 .08
cat      .07 .07 .32 .07 .07 .07 .32
hid      .04 .72 .04 .04 .10 .04 .04
because  .21 .08 .08 .21 .13 .21 .08
it       .02 .83 .02 .02 .07 .02 .02
was      .15 .09 .09 .15 .12 .15 .25
scared   .04 .72 .04 .04 .10 .04 .04
```

Hand-check the headline numbers: `it → cat = 0.8336 ≈ 0.83`, `it → it = 0.0684 ≈ 0.07`,
`hid → cat = 0.7224 ≈ 0.72`, `scared → cat = 0.7224 ≈ 0.72`. Dropping the `√d` scale for the
`it` row (raw score `it·cat = 7.5`, no `/2`) pushes `it → cat` to `0.9906 ≈ 0.99` — the
saturation demo in the formal-section aside. All computed with the numerically-stable
softmax (subtract the row max before exponentiating); display values are rounded only for
rendering, never fed back into later computation.

## Scope Note — deliberately omitted

- **Multi-head attention.** This page is exactly one head.
- **Positional encoding.** Token order is not modeled; `q`/`k`/`v` carry no position
  information, so nothing here explains how a transformer knows word order.
- **Feed-forward sublayer, residual connections, layer normalization.** Not shown; this page
  stops at the attention output vector.
- **Stacking / depth.** A real transformer repeats attention blocks many times; this is a
  single step.
- **Training / learning.** `Q`, `K`, `V` are hand-picked constants chosen for legibility, not
  learned via gradient descent. The page and UI say this plainly and do not imply "this is
  how GPT was trained."
- **Masking** (e.g. causal/autoregressive masks). Not modeled — this is a bidirectional,
  unmasked read of a fixed sentence.
- **Softmax numerical-stability detail.** The stable (max-subtracted) form is used in the
  code but not explained on the page itself.
- **`v = k` simplification.** Explicitly disclosed above and in the UI gloss; real models
  learn an independent `W_V` projection.

## Manual QA Notes

- Rendering: static canvas, redrawn on demand (token/row selection, `T` slider input,
  resize) — no `requestAnimationFrame` loop. Matches the `fourier-series` golden sample's
  resize routine verbatim: `getBoundingClientRect` floored, zero-size guard (`w<2||h<2`),
  DPR clamped to `[1,2]`, integer backing store, `ctx.setTransform`, redraw wired to
  `ResizeObserver(canvas)` + window `resize`/`load`.
- CSP shape: all logic lives in external `transformer.js` (`<script src="./transformer.js"
  defer>`); the only inline `<script>` is `type="application/json" id="node-meta"`. No
  inline event handlers anywhere in `transformer.html` — every listener is wired via
  `addEventListener` in `transformer.js`.
- Controls: exactly two — the 7-token selector (real `<button>`s, `aria-pressed`, ≥44px
  touch targets, wraps on narrow screens) as the focal interaction, plus the optional `T`
  (temperature) slider labeled "T（實驗用）" with a ≥44px touch target. Clicking a heatmap
  row is wired as a secondary way to trigger the same selection.
- Two-color language: teal `--q` = query/selected-token/selected-row; amber `--k` =
  key/weight (heatmap cells, bar segments, `k`/`w` formula symbols); ink = output. Nothing
  else is colored.
- Accessibility: canvas `aria-label="自注意力權重熱圖"`; a DOM `<p id="readout"
  aria-live="polite">` restates the selected token and its top match in plain language for
  screen readers and as a fallback when heatmap cells are too small to read (e.g. ~375px
  wide); meaning never rests on color alone — the selected row also gets an outlined border
  and the max cell prints its numeric weight.
- Node-meta (`depth_id`/`node_id`/`spec_version`) matches the manifest entry the orchestrator
  will add.

## Riku Review

- Pending: five-minute student test + confirm the formula walkthrough and Q/K/V table read
  correctly against `transformer.js`.
- Until reviewed, keep `public: false`; not wired into Neblux navigation.
