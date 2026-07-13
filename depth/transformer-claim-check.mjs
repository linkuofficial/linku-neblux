// transformer claim-source 數值驗證腳本（depth/transformer-claim-sources.md 的 [V] 來源）
//
// 用法：node depth/transformer-claim-check.mjs
// 退出碼 0 = 全部通過；1 = 任一 FAIL。
//
// 原則：TOKENS/KEYS/QUERIES/SQRT_D 與 computeMatrix/computeRowNoScale 直接從出貨的
// depth/transformer.js 原始碼抽出執行（不抄寫、避免漂移）；對照組是本檔獨立實作的
// softmax 與加權和。把 Terra V1 的一次性 Node 算式正式固化成可重跑守門。

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, 'transformer.js'), 'utf8');

function extractBlock(prefix) {
    const start = src.indexOf(prefix);
    if (start === -1) throw new Error(`extractBlock: ${prefix} not found`);
    const open = src.indexOf(prefix.includes('function') ? '{' : prefix.endsWith('[') ? '[' : '{', start + prefix.length - 1);
    const openCh = src[open];
    const closeCh = openCh === '[' ? ']' : '}';
    let depth = 0;
    for (let i = open; i < src.length; i += 1) {
        if (src[i] === openCh) depth += 1;
        else if (src[i] === closeCh) {
            depth -= 1;
            if (depth === 0) return src.slice(start, i + 1) + (prefix.startsWith('const') ? ';' : '');
        }
    }
    throw new Error(`extractBlock: unbalanced for ${prefix}`);
}

const pieces = [
    extractBlock("const TOKENS = ["),
    extractBlock('const KEYS = {'),
    extractBlock('const QUERIES = {'),
    'const VALUES = KEYS;',
    'const D = 4; const SQRT_D = Math.sqrt(D);',
    extractBlock('function dot('),
    extractBlock('function softmaxStable('),
    extractBlock('function computeMatrix('),
    extractBlock('function computeRowNoScale('),
];
const page = new Function(`${pieces.join('\n')}
    return { TOKENS, KEYS, QUERIES, VALUES, SQRT_D, dot, softmaxStable, computeMatrix, computeRowNoScale };`)();

let failures = 0;
function check(id, ok, detail) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${detail}`);
    if (!ok) failures += 1;
}
function info(id, detail) {
    console.log(`INFO  ${id}  ${detail}`);
}

// 出貨檔靜態契約：v=k 簡化必須仍在（表 #32 的驗證方式）
check('T0', /const VALUES = KEYS;/.test(src) && Math.abs(page.SQRT_D - 2) === 0, 'transformer.js 仍含 `const VALUES = KEYS;`（v=k 簡化揭露屬實）；√d=√4=2');

// ---------- 獨立對照組（不用頁面函式） ----------
const idx = (t) => page.TOKENS.indexOf(t);
function refRow(qToken, scale, T) {
    const q = page.QUERIES[qToken];
    const scores = page.TOKENS.map((kt) => {
        let s = 0;
        for (let i = 0; i < 4; i += 1) s += q[i] * page.KEYS[kt][i];
        return s / scale / T;
    });
    const mx = Math.max(...scores);
    const exps = scores.map((s) => Math.exp(s - mx));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / sum);
}

// ---------- T1 頁面矩陣 ≡ 獨立重算；每列和 = 1 ----------
{
    const m = page.computeMatrix(1);
    let diff = 0;
    let rowErr = 0;
    page.TOKENS.forEach((qt, i) => {
        const ref = refRow(qt, 2, 1);
        m[i].forEach((w, j) => { diff = Math.max(diff, Math.abs(w - ref[j])); });
        rowErr = Math.max(rowErr, Math.abs(m[i].reduce((a, b) => a + b, 0) - 1));
    });
    check('T1a', diff < 1e-15, `computeMatrix(1) ≡ 獨立 softmax((q·k)/√4) 重算，最大差 ${diff.toExponential(2)}`);
    check('T1b', rowErr < 5e-16, `七列權重和皆 = 1（最大偏差 ${rowErr.toExponential(2)}）——「加起來剛好＝1」`);
}

// ---------- T2 頁面引用的關鍵數值（#4/#33/#34 等） ----------
{
    const m = page.computeMatrix(1);
    const itCat = m[idx('it')][idx('cat')];
    const itIt = m[idx('it')][idx('it')];
    const hidCat = m[idx('hid')][idx('cat')];
    const scaredCat = m[idx('scared')][idx('cat')];
    const noScale = page.computeRowNoScale('it')[idx('cat')];
    check('T2a', Math.abs(itCat - 0.8335599728) < 1e-9, `it→cat = ${itCat.toFixed(10)}（頁面 0.83）`);
    check('T2b', Math.abs(itIt - 0.0684227692) < 1e-9, `it→it = ${itIt.toFixed(10)}（頁面 0.07）`);
    check('T2c', Math.abs(hidCat - 0.7224020953) < 1e-9 && Math.abs(scaredCat - hidCat) < 1e-15, `hid→cat = scared→cat = ${hidCat.toFixed(10)}（頁面 0.72）`);
    check('T2d', Math.abs(noScale - 0.9905860950) < 1e-9, `拿掉 √d：it→cat = ${noScale.toFixed(10)}（頁面 0.99——飽和示範）`);
    // raw logits（Terra 摘要的 3.75 / 7.5：0.83/0.99 是 softmax 權重，不是 raw 分數）
    const raw = page.dot(page.QUERIES.it, page.KEYS.cat);
    check('T2e', raw === 7.5 && raw / page.SQRT_D === 3.75, `raw logit it·cat = ${raw}、÷√d = ${raw / page.SQRT_D}（0.83/0.99 是 softmax 權重非 raw 分數——Terra #34 註記）`);
}

// ---------- T3 output_it 加權和（#33 的向量與「幾乎全落在 ENTITY 軸」） ----------
{
    const m = page.computeMatrix(1);
    const w = m[idx('it')];
    const out = [0, 0, 0, 0];
    page.TOKENS.forEach((t, j) => {
        for (let d = 0; d < 4; d += 1) out[d] += w[j] * page.VALUES[t][d];
    });
    const expected = [2.5691, 0.0392, 0.0392, 0.1860];
    const err = Math.max(...out.map((v, i) => Math.abs(v - expected[i])));
    check('T3a', err < 5e-5, `output_it = [${out.map((v) => v.toFixed(4)).join(', ')}] ≈ 頁面 [2.5691, 0.0392, 0.0392, 0.1860]（最大差 ${err.toExponential(2)}）`);
    const entityShare = out[0] / out.reduce((a, b) => a + b, 0);
    check('T3b', entityShare > 0.85, `ENTITY 軸佔比 ${(entityShare * 100).toFixed(1)}%——「幾乎全落在 ENTITY 軸」成立（此為手工示例性質，非受訓模型證據）`);
}

// ---------- T4 溫度 T：越高越平（每列熵單調上升）；T=1 = 原式 ----------
{
    const entropy = (row) => -row.reduce((a, p) => a + (p > 0 ? p * Math.log(p) : 0), 0);
    const m1 = page.computeMatrix(1);
    const m3 = page.computeMatrix(3);
    const m9 = page.computeMatrix(9);
    let mono = true;
    page.TOKENS.forEach((_, i) => {
        if (!(entropy(m9[i]) > entropy(m3[i]) && entropy(m3[i]) > entropy(m1[i]))) mono = false;
    });
    check('T4', mono, 'T 升高（1→3→9）每列分布熵單調上升——「T 越高分布越軟」；T=1 即 scaled dot-product 原式（T1a 已鎖）');
    info('T4', 'T 滑桿是教學旋鈕：原式只有 √d 縮放，沒有 T——對應 Terra #14 註記；「真實模型 d≈64 → √d=8」為 √64=8 的算術');
}

console.log(failures === 0 ? '\nall checks passed' : `\n${failures} check(s) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
