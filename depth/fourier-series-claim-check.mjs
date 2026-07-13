// fourier-series claim-source 數值驗證腳本（depth/fourier-series-claim-sources.md 的 [V] 來源）
//
// 用法：node depth/fourier-series-claim-check.mjs
// 退出碼 0 = 全部通過；1 = 任一 FAIL。
//
// 原則：F/CYCLES/theta/synth/targetVal 直接從出貨的 depth/fourier-series.js 原始碼
// 抽出執行（不抄寫、避免漂移）；對照組是獨立級數實作、Si(π) 數值積分出的
// Gibbs 極限，與方波收斂檢查。Terra 審查點名的三個缺測項（方波係數、
// N→(2N-1) 映射、Gibbs 極限值）都在這裡補上。

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, 'fourier-series.js'), 'utf8');

// 抽 const 一行宣告（含箭頭一行式）
function extractLine(name) {
    const m = src.match(new RegExp(`const ${name} = [^\\n]*;`));
    if (!m) throw new Error(`extractLine: ${name} not found`);
    return m[0];
}
// 抽 const NAME = (args) => { ... };（大括號配對）
function extractArrowBlock(name) {
    const sig = `const ${name} = `;
    const start = src.indexOf(sig);
    if (start === -1) throw new Error(`extractArrowBlock: ${name} not found`);
    const braceStart = src.indexOf('{', start);
    let depth = 0;
    for (let i = braceStart; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}') {
            depth -= 1;
            if (depth === 0) return `${src.slice(start, i + 1)};`;
        }
    }
    throw new Error(`extractArrowBlock: unbalanced braces for ${name}`);
}

const page = new Function(`
    ${extractLine('CYCLES')}
    ${extractLine('F')}
    ${extractLine('theta')}
    ${extractArrowBlock('synth')}
    ${extractLine('targetVal')}
    return { CYCLES, F, theta, synth, targetVal };
`)();

let failures = 0;
function check(id, ok, detail) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${detail}`);
    if (!ok) failures += 1;
}
function info(id, detail) {
    console.log(`INFO  ${id}  ${detail}`);
}

// ---------- F1 係數契約：synth ≡ (4/π)·Σ sin((2k+1)t)/(2k+1)，只含奇次項 ----------
{
    const ref = (t, count) => {
        let s = 0;
        for (let k = 0; k < count; k += 1) s += Math.sin((2 * k + 1) * t) / (2 * k + 1);
        return (4 / Math.PI) * s;
    };
    let m = 0;
    for (const N of [1, 2, 5, 13]) {
        for (let t = 0; t <= 4 * Math.PI; t += 0.01) m = Math.max(m, Math.abs(page.synth(t, N) - ref(t, N)));
    }
    check('F1a', m === 0, `synth ≡ (4/π)·Σ sin((2k+1)t)/(2k+1)（方波係數 4/(πn)、只有奇次諧波），逐點差 ${m}`);
    check('F1b', Math.abs(page.F - 4 / Math.PI) === 0, `F ＝ 4/π ＝ ${page.F.toFixed(10)}`);
}

// ---------- F2 N→(2N-1)：第 N 顆加進來的是第 (2N−1) 次諧波 ----------
{
    let m = 0;
    for (const N of [2, 3, 7, 13]) {
        const n = 2 * N - 1;
        for (let t = 0; t <= 2 * Math.PI; t += 0.01) {
            m = Math.max(m, Math.abs((page.synth(t, N) - page.synth(t, N - 1)) - page.F * Math.sin(n * t) / n));
        }
    }
    check('F2', m < 1e-15, `synth(·,N) − synth(·,N−1) ≡ (4/π)·sin((2N−1)t)/(2N−1)：滑桿的 N 顆＝最高第 (2N−1) 次諧波，最大差 ${m.toExponential(2)}`);
}

// ---------- F3 收斂：離開不連續點處逼近 ±1 方波 ----------
{
    let m = 0;
    for (let t = 0.3; t <= Math.PI - 0.3; t += 0.005) m = Math.max(m, Math.abs(page.synth(t, 400) - 1));
    for (let t = Math.PI + 0.3; t <= 2 * Math.PI - 0.3; t += 0.005) m = Math.max(m, Math.abs(page.synth(t, 400) - (-1)));
    check('F3', m < 0.01, `N=400 時離跳點 ≥0.3 rad 處 |synth − 方波| < 1%（最大 ${m.toExponential(2)}）——「逼近」而非「等於」，符合 Terra #3/#4 的措辭要求`);
}

// ---------- F4 Gibbs：過衝極限 = (2/π)·Si(π) − 1 ≈ 17.898%（相對 +1 平台）＝ 8.949%（相對跳幅 2） ----------
{
    // Si(π) 用 Simpson 積分獨立算出，不引用文獻數字
    const n = 200000;
    const h = Math.PI / n;
    let si = 0;
    const f = (t) => (t === 0 ? 1 : Math.sin(t) / t);
    for (let i = 0; i <= n; i += 1) si += f(i * h) * (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
    si *= h / 3;
    const gibbsLimit = (2 / Math.PI) * si - 1; // 相對 +1 平台的過衝
    info('F4', `Si(π) = ${si.toFixed(9)}（Simpson n=${n}）→ 極限過衝 = ${(gibbsLimit * 100).toFixed(4)}%（相對平台）＝ ${(gibbsLimit * 50).toFixed(4)}%（相對跳幅 2）`);

    const peakOf = (N) => {
        const M = 2 * N - 1;
        let peak = 0;
        const tEnd = (4 * Math.PI) / M;
        for (let i = 0; i <= 20000; i += 1) peak = Math.max(peak, page.synth((tEnd * i) / 20000, N));
        return peak;
    };
    const p800 = peakOf(800);
    check('F4a', Math.abs(p800 - 1 - gibbsLimit) < 5e-4, `N=800 峰值 ${p800.toFixed(6)} ≈ 1 + Gibbs 極限（差 ${Math.abs(p800 - 1 - gibbsLimit).toExponential(2)}）`);
    const peaks = [50, 200, 800].map(peakOf);
    const stay = peaks.every((p) => p - 1 > 0.175 && p - 1 < 0.182);
    check('F4b', stay, `N∈{50,200,800} 過衝 ${peaks.map((p) => ((p - 1) * 100).toFixed(2) + '%').join('、')}——變窄但不消失（尖角不會消失）`);
    // 頁面標籤 pct = round((峰−1)·100)：N=1 應顯示 +27%（4/π），N 稍大後穩定 +18%
    const p1 = peakOf(1);
    check('F4c', Math.abs(p1 - 4 / Math.PI) < 1e-9 && Math.round((p1 - 1) * 100) === 27, `N=1 峰值＝4/π=${p1.toFixed(6)} → 標籤 +27%`);
    const labels = [2, 3, 4, 5, 8, 13].map((N) => `${N}:${Math.round((peakOf(N) - 1) * 100)}%`);
    info('F4', `頁面「衝過頭 +N%」標籤走勢 ${labels.join('、')}（相對 +1 平台；換算相對跳幅要除以 2——Terra #26 的分母註記）`);
}

// ---------- F5 目標方波：兩週期、±1 交替、與 synth 的 theta 對齊 ----------
{
    check('F5a', page.CYCLES === 2, `CYCLES ＝ ${page.CYCLES}（畫面兩個完整週期）`);
    let ok = true;
    for (let x = 0.01; x < 1; x += 0.005) {
        const t = page.theta(x);
        const phase = ((t / Math.PI) % 2 + 2) % 2; // 0..2；[0,1)＝+1 半週、[1,2)＝−1 半週
        if (Math.abs(phase) < 0.02 || Math.abs(phase - 1) < 0.02 || Math.abs(phase - 2) < 0.02) continue; // 跳點附近不比
        const expected = phase < 1 ? 1 : -1;
        if (page.targetVal(x) !== expected) ok = false;
    }
    check('F5b', ok, 'targetVal（畫的虛線方波）與 synth 的 theta 相位逐點對齊（跳點除外）');
}

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
