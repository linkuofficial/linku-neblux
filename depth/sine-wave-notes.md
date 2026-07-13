# Sine Wave Golden Sample Notes

Depth id: `sine-wave`  
Graph node: `oscillations_and_waves_concept`  
Status: content revision pending Riku review

## Teaching Decision (2026-07-13 revision 3)

The page now uses a one-dimensional traveling sinusoid with four controls:

1. **Amplitude `A`** and **frequency `f`** are the two primary controls.
2. **Wave speed `v`** is a physical propagation control; the canvas derives wavelength as `λ = v/f`.
3. **Period `T`** remains derived as `T = 1/f`.
4. **Phase `φ`** remains advanced and changes spatial starting position without changing amplitude, frequency, or wavelength.
5. Crest and trough remain labelled in both the static introduction and live canvas.

Desktop presents all four controls in one row. Mobile keeps one horizontal control rail instead of adding a second stacked row.

## Formula Walkthrough

```txt
y(x,t) = A sin[2πf(x/v - t) + φ]
T = 1/f
λ = v/f
```

- `A`: center-line-to-crest or center-line-to-trough distance.
- `f`: cycles per second in hertz.
- `T`: time for one cycle, derived from frequency.
- `v`: propagation speed in metres per second; at fixed `f`, increasing `v` increases `λ`.
- `φ`: initial position within the cycle; changing it translates the wave without changing amplitude, period, or wavelength.
- `x`: position across the fixed 8 m canvas window.
- `t`: time advanced by the animation.

## Scope Note

This page teaches one undamped, one-dimensional traveling sinusoid. The visible motion now uses the selected physical `v`; damping, Fourier decomposition, phasors, sampling, and aliasing remain outside scope.

## Manual QA Notes

- External `sine-wave.js`; inline script is metadata only.
- Four range inputs are present: `A`, `f`, physical `v`, and advanced `φ`.
- The frequency output derives `T`; the speed output derives `λ`.
- Crest and trough labels move with frequency, speed, phase, and animation time.
- `depth/sine-wave-claim-check.mjs` extracts the shipped `waveY()` and verifies formula, extrema, `T=1/f`, `λ=v/f`, and phase translation.

## Review Boundary

- Confirm that phase is visually secondary enough for the intended learner level.
- Keep this page mapped to `oscillations_and_waves_concept` until a reviewed data change creates a more exact node.
- Keep propagation limited to the visible one-dimensional traveling-wave model; link out rather than adding reflection, interference, dispersion, or medium-dependent speed.
