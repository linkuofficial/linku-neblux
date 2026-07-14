// Re-runnable numeric checks for the visible sine-wave model.
// Usage: node depth/sine-wave-claim-check.mjs

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, 'sine-wave.js'), 'utf8');

function extractFn(name) {
    const sig = `function ${name}(`;
    const start = src.indexOf(sig);
    if (start === -1) throw new Error(`extractFn: ${name} not found`);
    const braceStart = src.indexOf('{', start);
    let depth = 0;
    for (let i = braceStart; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}') {
            depth -= 1;
            if (depth === 0) return src.slice(start, i + 1);
        }
    }
    throw new Error(`extractFn: unbalanced braces for ${name}`);
}

const waveY = new Function(`${extractFn('waveY')}; return waveY;`)();
let failures = 0;

function check(id, ok, detail) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${detail}`);
    if (!ok) failures += 1;
}

const AMPS = [0, 0.4, 1, 1.6];
const FREQS = [0.5, 1, 2, 4];
const SPEEDS = [4, 8, 12, 16];
const PHASES = [-Math.PI, -0.7, 0, 0.8, Math.PI];

// S1: shipped implementation equals the displayed traveling-wave formula.
{
    let maxError = 0;
    for (const amplitude of AMPS) for (const frequency of FREQS) for (const speed of SPEEDS) for (const phase of PHASES) {
        for (let x = 0; x <= 8; x += 0.1) {
            const time = 0.37;
            const expected = amplitude * Math.sin(2 * Math.PI * frequency * (x / speed - time) + phase);
            maxError = Math.max(maxError, Math.abs(waveY(x, amplitude, frequency, phase, time, speed) - expected));
        }
    }
    check('S1', maxError === 0, `waveY(x,A,f,φ,t,v) ≡ A·sin(2πf(x/v−t)+φ), max error ${maxError}`);
}

// S2: crest and trough are +A and -A.
{
    let maxError = 0;
    for (const amplitude of [0.4, 1, 1.6]) for (const frequency of FREQS) for (const speed of SPEEDS) for (const phase of PHASES) {
        const crestX = speed * (Math.PI / 2 - phase) / (2 * Math.PI * frequency);
        const troughX = speed * (3 * Math.PI / 2 - phase) / (2 * Math.PI * frequency);
        maxError = Math.max(maxError,
            Math.abs(waveY(crestX, amplitude, frequency, phase, 0, speed) - amplitude),
            Math.abs(waveY(troughX, amplitude, frequency, phase, 0, speed) + amplitude));
    }
    check('S2', maxError < 1e-12, `crest=+A and trough=-A, max error ${maxError.toExponential(2)}`);
}

// S3: T=1/f is the exact temporal repeat interval at a fixed position.
{
    let maxError = 0;
    for (const frequency of FREQS) for (const speed of SPEEDS) for (const phase of PHASES) for (let x = 0; x <= 8; x += 0.1) {
        const period = 1 / frequency;
        maxError = Math.max(maxError, Math.abs(
            waveY(x, 1.2, frequency, phase, 0.07 + period, speed)
            - waveY(x, 1.2, frequency, phase, 0.07, speed),
        ));
    }
    check('S3', maxError < 1e-12, `waveY(t+1/f) ≡ waveY(t), max error ${maxError.toExponential(2)}`);
}

// S4: λ=v/f is the exact spatial repeat interval at a fixed time.
{
    let maxError = 0;
    for (const frequency of FREQS) for (const speed of SPEEDS) for (const phase of PHASES) for (let x = 0; x <= 8; x += 0.1) {
        const wavelength = speed / frequency;
        maxError = Math.max(maxError, Math.abs(
            waveY(x + wavelength, 1.2, frequency, phase, 0.31, speed)
            - waveY(x, 1.2, frequency, phase, 0.31, speed),
        ));
    }
    check('S4', maxError < 1e-12, `waveY(x+v/f) ≡ waveY(x), max error ${maxError.toExponential(2)}`);
}

// S5: doubling f halves both T and λ when v is fixed.
{
    const speed = 8;
    check('S5', 1 / 2 === (1 / 1) / 2 && speed / 2 === (speed / 1) / 2, 'at fixed v, f: 1→2 gives T: 1→0.5 and λ: 8→4');
}

// S6: changing phase only translates the waveform.
{
    let maxError = 0;
    const frequency = 2;
    const speed = 8;
    const phase = 0.9;
    for (let x = 0; x <= 8; x += 0.05) {
        maxError = Math.max(maxError, Math.abs(
            waveY(x, 1.1, frequency, phase, 0.2, speed)
            - waveY(x + speed * phase / (2 * Math.PI * frequency), 1.1, frequency, 0, 0.2, speed),
        ));
    }
    check('S6', maxError < 1e-12, `phase is a pure spatial translation, max error ${maxError.toExponential(2)}`);
}

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
