# Fourier Series Sample Notes

Depth id: `fourier-series`
Graph node: `fourier_analysis_concept`
Status: M2 review sample (page 02 — pipeline validation)

## Reference Notes

- Square wave Fourier series, Wikipedia "Square wave": the ideal odd (±1) square wave equals
  `(4/π) Σ_{n odd} (1/n) sin(nωt)` — only odd harmonics, coefficient `4/(nπ)`.
  https://en.wikipedia.org/wiki/Square_wave
- Gibbs phenomenon, Wikipedia: the partial-sum overshoot near a jump does not vanish as the
  number of terms grows; it converges to about 8.95% (~9%) of the jump and only narrows.
  https://en.wikipedia.org/wiki/Gibbs_phenomenon

## Formula Walkthrough

Formula shown on the page (explicit expanding form):

```txt
方波(t) ≈ (4/π) [ sin(ωt) + (1/3) sin(3ωt) + (1/5) sin(5ωt) + … ]
```

- `N` (the only control, "疊幾顆弦波", 1→8): how many terms of the bracket are kept. The page sums
  the first `N` odd harmonics: n = 1, 3, 5, …, (2N−1).
- Only odd multiples of ω appear (1,3,5,…). An odd square wave has no even-harmonic content, so the
  bracket skips 2ω, 4ω, ….
- `1/n`: each term's amplitude weight. Higher harmonics are progressively shorter, so later terms
  only sharpen the corners rather than change the overall shape.
- `4/π ≈ 1.273`: the overall scale. It is why a single sine (N=1) already overshoots ±1 — its
  amplitude is 4/π, not 1.
- On the canvas: the bright white curve is the running sum (你疊出來的); the faint dashed blue step
  is the ideal ±1 target square (目標方波) the sum converges toward. Individual component waves are
  not drawn — they live in the formula bracket, keeping the canvas to two clean curves.

## Scope Note

This page teaches the odd square wave's harmonic build-up only. It does not cover:

- non-square targets (sawtooth, triangle, arbitrary periodic signals)
- even-harmonic content or waveforms without half-wave symmetry
- the complex/exponential form of the Fourier series
- convergence proofs, or L² vs pointwise convergence formalities
- the continuous Fourier transform (that is a separate depth page)
- why the Gibbs overshoot equals ~9% (stated as a fact, not derived here)

## Manual QA Notes

- Rendering: static canvas, redrawn on demand (on control input / resize), not a continuous rAF animation loop. The only motion is the user dragging `N`, so the Gibbs corner stays still to be studied. This also avoids the hidden-tab / throttled-rAF blank-canvas behavior.
- CSP shape: page uses external `fourier-series.js`; inline script is only `type="application/json"` metadata. No inline event handlers.
- Controls: exactly one — the `N` range input ("疊幾顆弦波", 1→8), with a ≥44px touch target.
- Canvas: exactly two curves (faint dashed target square + bright synth); no overlaid component curves.
- Formula appears only in the formal section; Gibbs phenomenon named only in the formal section, not in the observation tasks.
- Color language: `N` slider + the `N` reference in the formal text are teal; synthesized wave is ink white; target square is faint blue.
- Node-meta: `depth_id`/`node_id`/`spec_version` match the manifest entry.

## Riku Review

- Pending: five-minute student test + confirm the formula walkthrough reads correctly.
- Until reviewed, keep `public: false`; not wired into Neblux navigation.
