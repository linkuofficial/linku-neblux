// s-plane claim-source 數值驗證腳本（depth/s-plane-claim-sources.md 的 [V] 來源）
//
// 用法：node depth/s-plane-claim-check.mjs
// 退出碼 0 = 全部通過；1 = 任一 FAIL。INFO 行是邊界條件註記，不影響退出碼。
//
// 原則：不複製頁面公式再自己對自己——stepResponse/overshootPct/peakTau/regimeOf
// 四個純函式直接從出貨的 depth/s-plane.js 原始碼抽出執行（避免抄寫漂移），
// 對照組是獨立的 RK4 數值積分與封閉式恆等式。每個 check 對應 claim 表的列。

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, 's-plane.js'), 'utf8');

// ---------- 從 s-plane.js 抽出頂層 function（大括號配對，不用 regex 硬吃巢狀） ----------
function extractFn(name) {
    const sig = `function ${name}(`;
    const start = src.indexOf(sig);
    if (start === -1) throw new Error(`extractFn: ${name} not found in s-plane.js`);
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

const EPS = Number(src.match(/const EPS = ([0-9.e-]+);/)[1]); // 頁面自己的 ε-guard
function compile(name) {
    // stepResponse/overshootPct/regimeOf 引用頁面常數 EPS，注入同值
    return new Function('EPS', `${extractFn(name)}; return ${name};`)(EPS);
}
const stepResponse = compile('stepResponse');
const overshootPct = compile('overshootPct');
const peakTau = compile('peakTau');
const regimeOf = compile('regimeOf');

// ---------- 獨立對照組 ----------
// RK4 積分 ẍ + 2ζωn·ẋ + ωn²·x = ωn²·1(t)，x(0)=ẋ(0)=0（單位步階、零初始條件）
function rk4Step(zeta, wn, tauMax, dt, probe) {
    let x = 0;
    let v = 0;
    let t = 0;
    const ax = (x_, v_) => wn * wn * (1 - x_) - 2 * zeta * wn * v_;
    const out = [];
    let next = 0;
    while (t <= tauMax + 1e-12) {
        if (t >= next - 1e-12) {
            out.push([t, x]);
            next += probe;
        }
        const k1x = v, k1v = ax(x, v);
        const k2x = v + (dt / 2) * k1v, k2v = ax(x + (dt / 2) * k1x, v + (dt / 2) * k1v);
        const k3x = v + (dt / 2) * k2v, k3v = ax(x + (dt / 2) * k2x, v + (dt / 2) * k2v);
        const k4x = v + dt * k3v, k4v = ax(x + dt * k3x, v + dt * k3v);
        x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
        v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
        t += dt;
    }
    return out;
}

let failures = 0;
function check(id, ok, detail) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${detail}`);
    if (!ok) failures += 1;
}
function info(id, detail) {
    console.log(`INFO  ${id}  ${detail}`);
}

const ZETAS_UNDER = [0.05, 0.1, 0.2, 0.3, 0.5, Math.SQRT1_2, 0.9, 0.99];
const ZETAS_ALL = [0, 0.05, 0.3, 0.5, Math.SQRT1_2, 0.9, 0.999, 1, 1.001, 1.2, 2];

// ---------- C1 極點：根、半徑、角度、σ、ω_d、臨界重根、過阻尼實根 ----------
{
    // 複數多項式求值 s² + 2ζωn·s + ωn²，s = re + j·im
    const poly = (re, im, zeta, wn) => {
        const sqRe = re * re - im * im;
        const sqIm = 2 * re * im;
        return [sqRe + 2 * zeta * wn * re + wn * wn, sqIm + 2 * zeta * wn * im];
    };
    let maxResid = 0;
    let maxRadius = 0;
    let maxAngle = 0;
    for (const zeta of ZETAS_UNDER) {
        for (const wn of [1, 2, 3]) {
            const re = -zeta * wn;
            const im = wn * Math.sqrt(1 - zeta * zeta);
            const [pr, pi] = poly(re, im, zeta, wn);
            maxResid = Math.max(maxResid, Math.hypot(pr, pi));
            maxRadius = Math.max(maxRadius, Math.abs(Math.hypot(re, im) - wn));
            // θ 從負實軸量起：cos θ = |re|/半徑 = ζ
            maxAngle = Math.max(maxAngle, Math.abs(Math.abs(re) / Math.hypot(re, im) - zeta));
        }
    }
    check('C1a', maxResid < 1e-9, `欠阻尼極點 −ζωn±jωn√(1−ζ²) 代回 s²+2ζωns+ωn²，最大殘差 ${maxResid.toExponential(2)}`);
    check('C1b', maxRadius < 1e-12, `極點到原點距離＝ωn（圓半徑），最大偏差 ${maxRadius.toExponential(2)}`);
    check('C1c', maxAngle < 1e-12, `cos θ＝ζ（θ 從負實軸量起），最大偏差 ${maxAngle.toExponential(2)}`);
    // 臨界：s=−ωn 是重根（多項式值與導數皆 0）
    let critOk = true;
    for (const wn of [1, 2, 3]) {
        const [pr, pi] = poly(-wn, 0, 1, wn);
        const deriv = 2 * -wn + 2 * 1 * wn; // d/ds = 2s + 2ζωn at ζ=1
        if (Math.hypot(pr, pi) > 1e-12 || Math.abs(deriv) > 1e-12) critOk = false;
    }
    check('C1d', critOk, 'ζ=1 時 s=−ωn 為重根（值與導數皆為 0）');
    // 過阻尼：r1,r2 = ζ∓√(ζ²−1)，−r·ωn 為根、r1·r2=1、r1<1<r2
    let overOk = true;
    for (const zeta of [1.05, 1.2, 2]) {
        const disc = Math.sqrt(zeta * zeta - 1);
        const r1 = zeta - disc;
        const r2 = zeta + disc;
        for (const wn of [1, 2]) {
            for (const r of [r1, r2]) {
                const [pr, pi] = poly(-r * wn, 0, zeta, wn);
                if (Math.hypot(pr, pi) > 1e-9) overOk = false;
            }
        }
        if (Math.abs(r1 * r2 - 1) > 1e-12 || !(r1 < 1 && 1 < r2)) overOk = false;
    }
    check('C1e', overOk, 'ζ>1 兩實根 −(ζ∓√(ζ²−1))ωn 皆為根；r1·r2=1、r1<1<r2');
}

// ---------- C2 RK4 對照頁面 stepResponse（全 regime，含 ζ=1 分支邊界） ----------
{
    let worst = 0;
    let worstZeta = null;
    for (const zeta of ZETAS_ALL) {
        const sim = rk4Step(zeta, 1, 18, 5e-4, 0.05);
        let m = 0;
        for (const [tau, x] of sim) m = Math.max(m, Math.abs(x - stepResponse(tau, zeta)));
        if (m > worst) { worst = m; worstZeta = zeta; }
    }
    check('C2', worst < 5e-8, `RK4 獨立積分 vs 頁面閉式解，11 個 ζ（含 0、1、分支邊界）最大差 ${worst.toExponential(2)}（ζ=${worstZeta}）`);
}

// ---------- C3 y(0)=0、ẏ(0)=0；φ=arccos ζ 與 arctan 形式等價；ζ=0 極限 = 1−cos τ ----------
{
    let y0max = 0;
    let v0max = 0;
    for (const zeta of ZETAS_ALL) {
        y0max = Math.max(y0max, Math.abs(stepResponse(0, zeta)));
        const h = 1e-6;
        v0max = Math.max(v0max, Math.abs((stepResponse(h, zeta) - stepResponse(0, zeta)) / h));
    }
    check('C3a', y0max < 1e-12, `y(0)=0（φ=arccos ζ 的作用），最大 |y(0)| ${y0max.toExponential(2)}`);
    check('C3b', v0max < 1e-5, `ẏ(0)=0（前向差分 h=1e-6），最大 |ẏ(0)| ${v0max.toExponential(2)}`);
    let phiMax = 0;
    for (const zeta of ZETAS_UNDER) {
        phiMax = Math.max(phiMax, Math.abs(Math.acos(zeta) - Math.atan2(Math.sqrt(1 - zeta * zeta), zeta)));
    }
    check('C3c', phiMax < 1e-15, `φ=arccos ζ ≡ arctan(√(1−ζ²)/ζ)（0<ζ<1，與 Hallauer §9.8 同族 arctan 形式等價），最大差 ${phiMax.toExponential(2)}`);
    let cosMax = 0;
    for (let tau = 0; tau <= 18; tau += 0.05) {
        cosMax = Math.max(cosMax, Math.abs(stepResponse(tau, 0) - (1 - Math.cos(tau))));
    }
    check('C3d', cosMax < 1e-12, `ζ=0 極限：y(τ)=1−cos τ（arccos(0)=π/2 直接落出），最大差 ${cosMax.toExponential(2)}`);
}

// ---------- C4 頁面 sin(ω_d τ+φ) 形式 ≡ Hallauer Eq.(9.29) cos+sin 兩項形式 ----------
{
    let m = 0;
    for (const zeta of ZETAS_UNDER) {
        const wd = Math.sqrt(1 - zeta * zeta);
        for (let tau = 0; tau <= 18; tau += 0.1) {
            const hallauer = 1 - Math.exp(-zeta * tau) * (Math.cos(wd * tau) + (zeta / wd) * Math.sin(wd * tau));
            m = Math.max(m, Math.abs(stepResponse(tau, zeta) - hallauer));
        }
    }
    check('C4', m < 1e-12, `頁面正弦合成式 ≡ Hallauer Eq.(9.29) 兩項式，最大差 ${m.toExponential(2)}`);
}

// ---------- C5 過衝：Mp 公式 vs 數值峰；峰時 t_p=π/ω_d；ζ 越小衝越高；ζ=0 → 100% ----------
{
    let mpErr = 0;
    let tpErr = 0;
    for (const zeta of ZETAS_UNDER) {
        // 粗掃 + 峰附近細掃
        let peak = -Infinity;
        let peakAt = 0;
        const scan = (a, b, n) => {
            for (let i = 0; i <= n; i += 1) {
                const tau = a + ((b - a) * i) / n;
                const y = stepResponse(tau, zeta);
                if (y > peak) { peak = y; peakAt = tau; }
            }
        };
        scan(0, Math.min(60, peakTau(zeta) * 2 + 5), 60000);
        scan(Math.max(0, peakAt - 0.01), peakAt + 0.01, 4000);
        mpErr = Math.max(mpErr, Math.abs((peak - 1) * 100 - overshootPct(zeta)));
        tpErr = Math.max(tpErr, Math.abs(peakAt - peakTau(zeta)));
    }
    check('C5a', mpErr < 0.01, `Mp=exp(−ζπ/√(1−ζ²)) vs 數值峰高，最大差 ${mpErr.toExponential(2)} 個百分點`);
    check('C5b', tpErr < 1e-3, `第一峰位置 vs t_p=π/√(1−ζ²)（τ 域），最大差 ${tpErr.toExponential(2)}`);
    let mono = true;
    for (let i = 1; i < ZETAS_UNDER.length; i += 1) {
        if (!(overshootPct(ZETAS_UNDER[i]) < overshootPct(ZETAS_UNDER[i - 1]))) mono = false;
    }
    check('C5c', mono, 'ζ 越小過衝越高（Mp 對 ζ 嚴格遞減）');
    check('C5d', Math.abs(overshootPct(0) - 100) < 1e-12, `ζ=0 過衝 100%（1−cos τ 峰值 2），實得 ${overshootPct(0).toFixed(6)}%`);
    info('C5', `對照表引用值：%OS(0.3)=${overshootPct(0.3).toFixed(2)}%、%OS(0.5)=${overshootPct(0.5).toFixed(2)}%、%OS(1/√2)=${overshootPct(Math.SQRT1_2).toFixed(2)}%`);
}

// ---------- C6 ζ≥1 不過衝、單調趨近；第一個高峰只在 ζ<1 出現 ----------
{
    let ok = true;
    for (const zeta of [1, 1.001, 1.2, 2, 5]) {
        let prev = -Infinity;
        for (let tau = 0; tau <= 60; tau += 0.01) {
            const y = stepResponse(tau, zeta);
            if (y > 1 + 1e-9) ok = false;
            if (y < prev - 1e-9) ok = false;
            prev = y;
        }
    }
    check('C6a', ok, 'ζ≥1：y(τ) 不超過 1 且單調趨近（不晃）');
    const under = [0.9, 0.99].every((z) => {
        let peak = 0;
        for (let tau = 0; tau <= 60; tau += 0.005) peak = Math.max(peak, stepResponse(tau, z));
        return peak > 1;
    });
    check('C6b', under, 'ζ<1：必有第一個高峰冒出（>1）——「高峰從 ζ<1 開始」的分界');
}

// ---------- C7 包絡線：|y−1| ≤ e^(−ζτ)/√(1−ζ²)；ζ>0 收攏、ζ=0 不收攏 ----------
{
    let bound = true;
    for (const zeta of ZETAS_UNDER) {
        const denom = Math.sqrt(1 - zeta * zeta);
        for (let tau = 0; tau <= 18; tau += 0.01) {
            if (Math.abs(stepResponse(tau, zeta) - 1) > Math.exp(-zeta * tau) / denom + 1e-9) bound = false;
        }
    }
    check('C7a', bound, '欠阻尼震盪被關在 1±e^(−ζτ)/√(1−ζ²) 包絡線內');
    info('C7', '「逐漸收攏」只在 ζ>0 成立；ζ=0 時包絡線是常數 1（永不收攏）——對照表列為適用條件');
}

// ---------- C8 ωn 只縮放時間軸：全量綱 RK4 vs 正規化 τ=ωn·t ----------
{
    let m = 0;
    for (const zeta of [0.3, 1.2]) {
        for (const wn of [1, 2, 3]) {
            const sim = rk4Step(zeta, wn, 18 / wn, 5e-4 / wn, 0.05 / wn);
            for (const [t, x] of sim) m = Math.max(m, Math.abs(x - stepResponse(wn * t, zeta)));
        }
    }
    check('C8', m < 5e-8, `y(t; ζ, ωn) ≡ y(τ=ωn·t; ζ)：形狀只由 ζ 決定、ωn 只換秒數（刻度 t=τ/ωn），最大差 ${m.toExponential(2)}`);
}

// ---------- C9 實際震盪頻率 = ω_d（相鄰零交越間距 = π/ω_d） ----------
{
    let m = 0;
    for (const zeta of [0.05, 0.3, 0.6]) {
        const wd = Math.sqrt(1 - zeta * zeta);
        const crossings = [];
        let prev = stepResponse(0, zeta) - 1;
        for (let tau = 0.001; tau <= 40; tau += 0.001) {
            const cur = stepResponse(tau, zeta) - 1;
            if (prev < 0 && cur >= 0 || prev > 0 && cur <= 0) {
                // 線性內插零點
                crossings.push(tau - 0.001 + 0.001 * (Math.abs(prev) / (Math.abs(prev) + Math.abs(cur))));
            }
            prev = cur;
        }
        for (let i = 1; i < crossings.length; i += 1) {
            m = Math.max(m, Math.abs((crossings[i] - crossings[i - 1]) - Math.PI / wd));
        }
    }
    check('C9', m < 1e-2, `y−1 相鄰零交越間距 = π/ω_d（震盪頻率確為 ω_d），最大偏差 ${m.toExponential(2)}`);
}

// ---------- C10 過阻尼尾巴由較慢實極點主導（衰減率 → r1 = ζ−√(ζ²−1)） ----------
{
    let ok = true;
    for (const zeta of [1.2, 2]) {
        const r1 = zeta - Math.sqrt(zeta * zeta - 1);
        const a = 10;
        const b = 17;
        const slope = (Math.log(Math.abs(1 - stepResponse(b, zeta))) - Math.log(Math.abs(1 - stepResponse(a, zeta)))) / (b - a);
        if (Math.abs(-slope - r1) / r1 > 0.01) ok = false;
    }
    check('C10', ok, '過阻尼晚期 ln|1−y| 斜率 ≈ −r1（較慢極點 −r1ωn 主導拖尾，誤差 <1%）');
}

// ---------- C11 ±2% 帶安定：ζ≥1 族內臨界阻尼最快；過阻尼越大越慢 ----------
{
    const settle = (zeta) => {
        let last = 0;
        for (let tau = 0; tau <= 200; tau += 0.005) {
            if (Math.abs(stepResponse(tau, zeta) - 1) > 0.02) last = tau;
        }
        return last;
    };
    const zs = [1, 1.1, 1.2, 1.5, 2];
    const ts = zs.map(settle);
    let mono = true;
    for (let i = 1; i < ts.length; i += 1) if (!(ts[i] > ts[i - 1])) mono = false;
    check('C11', mono, `ζ≥1 族內 ±2% 安定時間隨 ζ 遞增（臨界最快：τ=${ts[0].toFixed(2)}；ζ=2 → τ=${ts[ts.length - 1].toFixed(2)}）`);
    const tUnder = settle(0.76);
    info('C11', `適用條件註記：帶最適阻尼在 ζ≈0.76（τ=${tUnder.toFixed(2)}）比 ζ=1（τ=${settle(1).toFixed(2)}）更快進 ±2% 帶，但有過衝——「最快貼住不晃」限定在不震盪族內`);
}

// ---------- C12 穩態值 1（ζ>0）；ζ=0 永不安定（等幅震盪） ----------
{
    let ok = true;
    for (const zeta of [0.05, 0.3, 1, 1.2, 2]) {
        // 包絡／單調性保證 τ→∞ 收斂到 1；取大 τ 實測
        if (Math.abs(stepResponse(600, zeta) - 1) > 1e-6) ok = false;
    }
    check('C12a', ok, 'ζ>0：y(τ→∞)=1（穩態＝步階大小，H(0)=1 的量綱體現）');
    let lo = Infinity;
    let hi = -Infinity;
    for (let tau = 500; tau <= 540; tau += 0.01) {
        const y = stepResponse(tau, 0);
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
    }
    check('C12b', hi > 1.99 && lo < 0.01, `ζ=0：τ∈[500,540] 仍在 [${lo.toFixed(3)}, ${hi.toFixed(3)}] 之間等幅震盪（永遠晃、永不安定）`);
}

// ---------- C13 regime 分界（含頁面 ε-guard 行為） ----------
{
    const ok = regimeOf(0) === 'undamped'
        && regimeOf(0.5) === 'underdamped'
        && regimeOf(1) === 'critical'
        && regimeOf(1 - EPS / 2) === 'critical'
        && regimeOf(1 + EPS / 2) === 'critical'
        && regimeOf(1.2) === 'overdamped';
    check('C13', ok, `regimeOf 分界：0→無阻尼、(0,1)→欠、|ζ−1|<${EPS}→臨界（ε-guard）、>1→過阻尼`);
    info('C13', `頁面「過衝 X%」標籤：t_p≤18 才畫；ζ>√(1−(π/18)²)≈0.9847 時第一峰落在 τ 窗外、不顯示標籤（誠實省略而非數值錯誤）`);
}

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
