# s-plane Sample Notes

Depth id: `s-plane`
Graph node: `control_theory_concept`
Status: M2 candidate page — pending control-theory correctness gate before `public: true`

## Reference Notes

Verification basis updated 2026-07-13 (Riku's ruling: no textbook framing — he owns no
control-theory textbook and doesn't need one; online authoritative sources are the basis, and the
residual concern is zh-Hant terminology, not source access):

- **The operative source list lives in `depth/s-plane-claim-sources.md`** — every formula and
  claim on this page is pinned there to openly accessible primary sources with printed equation
  numbers: MIT 2.14 handout “Understanding Poles and Zeros” (Eq. (2)/(4), (13)–(15), Fig. 4,
  §1.2–§1.3), Hallauer *Introduction to Linear Time-Invariant Dynamic Systems* (LibreTexts)
  §9.2/§9.6/§9.8 (Eq. (9.13), (9.29), (9.36), (9.37), (9.40)), OpenStax *University Physics*
  Vol. 1 §15.5, the official TAIPEI 101 observatory page, and TI SLVA301. A zh-Hant↔EN
  terminology table for the translation check sits at the end of that file.
- Ogata / Nise / Franklin are standard literature where the same prototype results appear, but
  they are **not** part of the verification path (no personal copies; superseded by the pinned
  open sources above).

## Formula Walkthrough

Formulas shown on the page (formal section):

```txt
H(s) = ωn² / ( s² + 2·ζ·ωn·s + ωn² )
poles (0<ζ<1): s = −ζ·ωn ± j·ωn·√(1 − ζ²) = −σ ± j·ω_d
step (underdamped): y(t) = 1 − ( e^(−ζ·ωn·t) / √(1 − ζ²) ) · sin( ω_d·t + φ ), ω_d = ωn·√(1−ζ²), φ = cos⁻¹ ζ
overshoot (0<ζ<1): M_p = exp( −ζ·π / √(1 − ζ²) )
```

- `ζ` (阻尼比, teal): the only shape control. `cos θ = ζ`, angle measured from the negative real
  axis to the pole. Determines whether the step response overshoots/rings and by how much.
- `ωn` (自然頻率, gold): pole distance from the origin (circle radius). Determines the clock speed
  only — it rescales time, it does **not** change the curve's shape. This is the load-bearing
  invariant the page is built to demonstrate: writing the response in normalized time
  `τ = ωn·t` gives `y(τ) = 1 − (e^(−ζτ)/√(1−ζ²))·sin(√(1−ζ²)·τ + φ)`, a function of `ζ` **alone**.
  `ωn` only re-enters when converting the fixed τ-axis tick marks back to seconds
  (`t = τ/ωn`) and when scaling the s-plane circle radius. The canvas draws the same
  360+ sample polyline in τ-space regardless of `ωn`; only the x-axis second-labels and the
  s-plane geometry move.
- `s`: complex frequency, the s-plane coordinate; a pole is where the denominator hits zero, drawn
  as a bright ✕.
- `σ = ζωn` (muted): real part magnitude = decay rate. Farther left = faster decay.
- `ω_d = ωn√(1−ζ²)` (muted): imaginary part = the system's actual (damped) oscillation frequency.
- `φ = cos⁻¹ ζ` (muted): phase offset that makes `y(0) = 0` come out correctly. Deliberately
  `arccos`, not `arctan` — `arctan(√(1−ζ²)/ζ)` blows up as `ζ → 0`, while `arccos(0) = π/2` correctly
  falls out of the undamped limit `y(τ) = 1 − cos(τ)`.
- `e^(−ζωn t)/√(1−ζ²)` (teal dashed envelope): the two curves `1 ± envelope` bound where the
  oscillation is allowed to live; they collapse toward 1 as `t` grows for any `ζ > 0`.
- `y(t)` (ink white): the response line, chasing the steady-state value 1.

Four regimes shown in a short list (not derived, just named + one line of intuition each): `ζ=0`
undamped (poles on the imaginary axis, oscillates forever, never settles), `0<ζ<1` underdamped
(overshoots then converges), `ζ=1` critical (repeated real pole, fastest non-oscillatory approach),
`ζ>1` overdamped (two real poles, no oscillation but dragged out by the slower one).

## Scope Note

This page teaches the standard LTI second-order prototype's step response only. It does not cover:

- higher-order systems or dominant-pole approximation
- transfer-function zeros / non-minimum-phase behavior
- non-unity DC gain (the page fixes `H(0) = 1`)
- state-space or MIMO representations
- discrete-time systems (z-plane)
- nonlinear or time-varying systems (assumes LTI, zero initial conditions, an ideal unit step)
- controller design (PID tuning, root locus as a design tool), disturbance rejection
- frequency-domain analysis (Bode, Nyquist)
- derivation of the closed-form step responses (stated and numerically verified here, not derived
  on the page)
- the right-half-plane / unstable case — the page restricts the slider to `ζ ≥ 0` (closed left
  half-plane only); RHP poles are out of scope.
- exact settling time: the page deliberately does **not** draw a settling-time marker. `t_s ≈
  4/(ζωn)` is a 2%-band *approximation* (Hallauer Eq. (9.40)), not an exact closed form, and presenting it as a
  precise on-canvas marker would misrepresent it as exact. Instead the canvas keeps the ±2% band
  (drawn directly from the `y=0.98..1.02` data window) and the envelope curves, which are exact and
  let the viewer eyeball settling without a fabricated-precision marker.

## Manual QA Notes

- CSP shape: page uses external `s-plane.js` (loaded `defer`); the only inline `<script>` is the
  `type="application/json"` `#node-meta` block. No inline event handlers (`onclick=` etc.) anywhere
  in `s-plane.html` — checked with a grep for `on[a-z]+=` and for any `<script>` tag that isn't the
  JSON meta block or the external `src=` tag.
- Rendering: render-on-demand only, no `requestAnimationFrame` loop. Both canvases redraw on
  slider `input`, on resize (`ResizeObserver` + window `load`/`resize`), and on any change to the
  formula-symbol interaction state (hover/focus/pin/unpin — see Part 3 below), following the
  fourier-series golden sample's resize routine verbatim: DPR clamped to `[1,2]`,
  `getBoundingClientRect` results floored, a zero-size guard (`if (w<2||h<2) return`) before ever
  touching `canvas.width/height`, and `ctx.setTransform(dpr,0,0,dpr,0,0)` after each resize. This
  avoids the hidden-tab / blank-canvas failure mode a live rAF loop would risk.
- Controls: exactly two range inputs (`ζ` 阻尼比, `ωn` 自然頻率), each `min-height: 44px` +
  `touch-action: manipulation` for touch targets.
- Readouts (Part 1 upgrade): the overshoot-percent label (`過衝 X%`) and the regime-name readout
  (`無阻尼`/`欠阻尼`/`臨界阻尼`/`過阻尼`, plus `無過衝` for ζ≥1) are drawn white (`COLORS.ink`) at
  `600 16px system-ui` — up from a 12px muted label. The overshoot label has a right-edge guard:
  `ctx.measureText(label).width` is checked against the plot's right padding, and when the label
  would overflow, it flips to right-aligned and draws to the left of the peak dot instead of the
  right. `labelY` is also clamped to `Math.max(L.padT + 14, py - 6)` as a defensive top guard —
  not currently reachable given `Y_MAX=2.2` and `%OS≤100%`, but it protects against a future
  `Y_MAX`/ζ-range change pushing the label above the plot.
- Colour language: `ζ` teal (`--zeta: #70e0c2`) and `ωn` gold (`--wn: #f0c15a`) are consistent
  across both canvases and the formula/gloss section; `σ`/`ω_d`/`φ` labels stay in the canvas
  `muted` tone by default and only brighten to ink white when their own symbol is the active
  highlight (never a control's accent colour); the overshoot-% and regime-name readouts are ink
  white by default (see Readouts above) and switch to ζ's teal only when `zeta` is the active
  highlight, since they're the ζ-driven read-out this page is built around; the response curve
  `y(t)` is ink white in both the canvas and the symbol gloss.
- Orientation copy (Part 2): a `.takeaway` one-liner under the intro states the page's single point
  up front ("這一頁只想讓你看見一件事：…"); a `.how-to` bridge line sits under the interactive
  section's `<h2>`, right before the reader reaches the sliders; and a `.canvas-caption` sits above
  each canvas naming what it shows — left = the pole / character-coordinate view
  (`極點：系統的性格座標`), right = the step response (`步階響應：把它推一下之後，怎麼反應`).
- Formula interactivity (Part 3): hovering, clicking, or keyboard-focusing a formula symbol
  highlights the matching element on both canvases plus a cue on the corresponding slider
  (`.control.is-cued`). Eight symbols total — `zeta, wn, sigma, wd, phi, s, envelope, y` — driven
  by `renderSplane(highlight)`/`renderStep(highlight)` taking the active symbol id (`null` for the
  default, unhighlighted render; the default math/rendering path is otherwise unchanged from the
  M2 baseline — highlighting only recolors/thickens already-drawn elements).
- The symbol-gloss `<dl>` is the canonical keyboard/AT interaction surface: its 8
  `<dt data-sym>` elements are the only `tabindex="0"` + `role="button"` stops (`aria-pressed`
  toggled on pin, `min-height: 44px` touch target). The inline `<span data-sym>` occurrences inside
  the formula lines are pointer-only — no `tabindex`/`role`, not tab stops — and are never nested
  inside another `data-sym` element (the color-only spans nested inside, e.g., the envelope term,
  deliberately omit `data-sym` so `closestSym()` can't pick up a spurious inner target).
- Three independent activation sources — `hoverSym` (pointer), `pinnedSym` (click/Enter/Space
  toggle), `focusSym` (keyboard focus) — are tracked separately so hovering elsewhere doesn't clear
  a keyboard focus or vice versa; the symbol actually rendered is `pinnedSym || hoverSym ||
  focusSym`. A pin persists while the reader adjusts the ζ/ωn sliders (the outside-click unpin
  handler explicitly ignores clicks inside `.lab-surface` and `.formal`); `Escape` always unpins.
- Two synced text surfaces accompany the canvas highlight: a fixed `aria-live="polite"`
  `.sym-explainer` line (falls back to the original hint copy when nothing is active) and a
  floating `.sym-tip` (`role="tooltip"`, `pointer-events: none`, position clamped to the viewport
  in `showTip()`). Both pull their text from the same `GLOSS` map used for each glossary `<dt>`'s
  `aria-label`.
- `:focus-visible` gets an explicit outline ring on the glossary `<dt>` stops
  (`.symbol-gloss dt[data-sym]:focus-visible`). The whole feature is static — no animation,
  transition, or rAF driving it — so `prefers-reduced-motion` is satisfied by construction, not by
  a separate media-query branch.
- Glossary text parity: each symbol's static `<dd>` description in the `<dl>` and its `GLOSS[...]`
  string (used by the tooltip, the explainer line, and the `aria-label`) are byte-identical per
  symbol — no wording drift between the static table and the interactive surfaces.
- s-plane equal-aspect check: data window is `Re∈[−6.5,1.5]` × `Im∈[−4,4]` (both spans = 8), scale
  computed as `min(availableWidth, availableHeight)/8` so `cos θ = ζ` reads geometrically true and
  poles-on-circle is not distorted by the canvas's actual pixel aspect ratio.
- Pole-fit across the full slider range: `ζ=0, ωn=3` → poles at `±j3`, inside the `Im∈[−4,4]`
  window; `ζ=1.2, ωn=3` → real poles at `r1,r2 = ζ∓√(ζ²−1) = 0.537, 1.863` (normalized), i.e.
  actual poles at `−1.61` and `−5.59`, both inside the `Re∈[−6.5,1.5]` window (the far pole sits at
  ≈−5.59, just inside the −6.5 edge as required by the brief).
- Node-meta: `{ "depth_id": "s-plane", "node_id": "control_theory_concept", "spec_version": "0.2" }`
  — matches the `depth_manifest.json` entry's `id`/`node_id`, and `spec_version` matches the
  manifest's top-level `"version": "0.2"`.
- Independent numeric cross-check (throwaway Node script, not shipped — see below).

### Numeric cross-check results

Run against the exact `stepResponse`/`overshootPct` functions copied out of `s-plane.js`:

- `%OS` sanity: ζ=0.3 → 37.23% (expect ≈37.2%), ζ=0.5 → 16.30% (expect ≈16.3%), ζ=0.707 → 4.33%
  (expect ≈4.3%). All match.
- `y(0)` for ζ∈{0, 0.3, 1, 1.2}: all `0` to floating-point noise (≤2.2e-16).
- `y'(0)` (forward finite difference) for the same four ζ: ≈5.0e-6 with step `h=1e-5` in every
  case — consistent with the analytic `y'(0)=0` (the residual is the expected `O(h)` truncation
  term from a nonzero `y''(0)`, not a bug).
- `y(τ=60)` (settling check) for ζ∈{0.3, 1, 1.2}: all `1.000000`. For **ζ=0** (undamped) `y(60) =
  1.952413` — this is mathematically correct, not a defect: an undamped system's poles sit exactly
  on the imaginary axis, so `y(t) = 1 − cos(t)` oscillates between 0 and 2 forever and never
  converges to 1. The page's own regime list says as much ("等幅震盪永不停"). Flagging this
  explicitly since a naive "y(∞)=1 for all ζ" check would misreport it as broken.
- Undamped closed form vs. direct `1 − cos(τ)`: exact match (diff `0` at τ = 0, π/2, π, 2π).
- RK4 numerical integration of `ẍ + 2ζωn ẋ + ωn² x = ωn²·1(t)`, `x(0)=ẋ(0)=0`, `wn=1` (so τ=t),
  `dt=0.0005`, against the closed form over `τ∈[0,18]`, for ζ ∈ {0, 0.05, 0.3, 0.5, 0.707, 0.9, 1,
  1.2, 2} (covering undamped, lightly/moderately/heavily underdamped, the critical boundary, and
  two overdamped points): max absolute difference across every regime is on the order of
  `1e-12`–`1e-14`, i.e. floating-point noise. Confirms the piecewise closed forms (underdamped,
  critical with the ε-guard, overdamped) all agree with direct numerical integration to plotting
  precision, including right at the `ζ=1` branch boundary.

## Riku Review

- Pending: Riku's line-by-line verification of every formula in the formal section — this page
  sits on his core academic track, so that review is a hard blocker, not a formality. Basis
  (updated 2026-07-13): row-by-row against the pinned open primary sources in
  `depth/s-plane-claim-sources.md` (with its zh-Hant↔EN terminology table), **not** a paper
  textbook. The numeric layer is already locked by `node depth/s-plane-claim-check.mjs`
  (24 checks, all passing).
- Status note: the 2026-07-12 triage published this page (`public: true`) with the unfinished
  line-by-line check knowingly accepted and logged in `depth/files/BACKLOG.md`; the pre-triage
  guidance to keep `public: false` until review is superseded by that decision. The page still has
  no in-site navigation entry.
- Do not widen scope (higher-order systems, root locus, frequency domain, etc.) from this result
  without an explicit new task — see Scope Note above for what is intentionally out.
