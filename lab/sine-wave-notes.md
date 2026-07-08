# Sine Wave Golden Sample Notes

Depth id: `sine-wave`  
Graph node: `oscillations_and_waves_concept`  
Status: M1 review sample

## Reference Notes

- OpenStax Precalculus 2e, 5.1 Angles: used for the radian/full-turn convention behind the `2π` factor.
  https://openstax.org/books/precalculus-2e/pages/5-1-angles
- Phase (waves), Wikipedia summary with NIST phase material: used as a secondary check that phase is an angle-like offset through a periodic cycle and that sinusoidal signals can be written with amplitude, frequency, and phase parameters.
  https://en.wikipedia.org/wiki/Phase_(waves)

## Formula Walkthrough

Formula used by the page:

```txt
y(t) = A sin(2π f t + φ)
```

- `A`: amplitude. In the canvas, this is the vertical distance from the center line to a crest. The amplitude slider changes that distance without moving the center line.
- `f`: frequency in hertz. In the canvas, raising `f` packs more cycles into the same horizontal span. The `2π` factor converts each cycle into one full radian turn.
- `t`: time. The animation advances `t`, which is why the curve flows even when the controls are untouched.
- `φ`: phase. In the canvas, changing `φ` shifts where the wave begins in its cycle. The curve keeps the same shape and frequency.

## Scope Note

This page teaches a single pure sinusoid. It does not cover:

- wave speed or wavelength in a physical medium
- damping, envelopes, or time-varying amplitude
- Fourier decomposition
- phasor/complex-number representation
- sampling, aliasing, or discrete-time signals

## Manual QA Notes

- CSP shape: page uses external `sine-wave.js`; inline script is only `type="application/json"` metadata.
- Controls: exactly three range inputs (`A`, `f`, `φ`); each has a ≥44px touch target (min-height 44px + touch-action manipulation), verified at 1280px desktop and 390px mobile.
- Formula appears only in the formal section.
- Mobile check: Playwright desktop/mobile pass; canvas nonblank, slider changes alter pixels, console/page errors empty. Temporary screenshots currently regenerated at `test-results/sine-wave-desktop.png` and `test-results/sine-wave-mobile.png`; `test-results/` is an ephemeral test-artifact directory and may be cleared by later Playwright/verify runs.

## Riku Review

Initial review: acceptable for this iteration（「還可以」）. This closes the M1 golden-sample pass as a review sample, not as a public launch.

Closeout boundary:

- Do not start M2 from this result without an explicit new task.
- Keep `sine-wave` mapped to `oscillations_and_waves_concept` until a reviewed data change creates a more exact graph node.
- Keep `public: false`; this page is not wired into Neblux navigation or deployment yet.

