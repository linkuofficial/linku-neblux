(() => {
    // ---- Illustrative constants -------------------------------------------------
    // These Q/K/V vectors are hand-picked so the resulting attention pattern is
    // legible on a small screen. They are NOT learned weights from a trained model.
    // Feature axes (d = 4): [ENTITY, ACTION, STATE, GLUE].
    const TOKENS = ['The', 'cat', 'hid', 'because', 'it', 'was', 'scared'];

    const KEYS = {
        The: [0, 0, 0, 2],
        cat: [3, 0, 0, 0],
        hid: [0, 2, 0, 0],
        because: [0, 0, 0, 2],
        it: [1, 0, 0, 1],
        was: [0, 0, 0, 2],
        scared: [0, 0, 2, 0],
    };

    const QUERIES = {
        The: [0, 0, 0, 1],
        cat: [0, 1.5, 1.5, 0],
        hid: [2, 0, 0, 0],
        because: [0, 0, 0, 1],
        it: [2.5, 0, 0, 0],
        was: [0, 0, 1, 0.5],
        scared: [2, 0, 0, 0],
    };

    // v_j = k_j — a legibility simplification for this teaching page. Real
    // transformers learn a separate value projection W_V; see transformer-notes.md.
    const VALUES = KEYS;

    const D = 4;
    const SQRT_D = Math.sqrt(D); // = 2

    function dot(a, b) {
        let s = 0;
        for (let i = 0; i < a.length; i += 1) s += a[i] * b[i];
        return s;
    }

    // Numerically-stable softmax: subtract the row max before exponentiating.
    function softmaxStable(scores) {
        const max = Math.max(...scores);
        const exps = scores.map((s) => Math.exp(s - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map((e) => e / sum);
    }

    // Full 7x7 weight matrix: row i = query token i, col j = key token j.
    // score_ij = (q_i . k_j) / sqrt(d); w_ij = softmax_j(score_ij / T).
    // T = 1 reproduces the plain scaled-dot-product-attention formula.
    function computeMatrix(T) {
        return TOKENS.map((qt) => {
            const q = QUERIES[qt];
            const scores = TOKENS.map((kt) => dot(q, KEYS[kt]) / SQRT_D / T);
            return softmaxStable(scores);
        });
    }

    // Same computation without the sqrt(d) scaling — used only for the
    // "what if we skip scaling" demo aside, never for the live display.
    function computeRowNoScale(qToken) {
        const q = QUERIES[qToken];
        const scores = TOKENS.map((kt) => dot(q, KEYS[kt]));
        return softmaxStable(scores);
    }

    function argmax(arr) {
        let bi = 0;
        for (let i = 1; i < arr.length; i += 1) if (arr[i] > arr[bi]) bi = i;
        return bi;
    }

    // ---- Dev self-check (console only; not part of the UI) ----------------------
    // Confirms the spec numbers before anything is drawn.
    (function selfCheck() {
        const m = computeMatrix(1);
        m.forEach((row, i) => {
            const sum = row.reduce((a, b) => a + b, 0);
            console.assert(Math.abs(sum - 1) < 1e-9, `row ${TOKENS[i]} should sum to 1, got ${sum}`);
        });
        const itRow = m[TOKENS.indexOf('it')];
        const catIdx = TOKENS.indexOf('cat');
        console.assert(Math.abs(itRow[catIdx] - 0.83) < 0.01, `it->cat should be ~0.83, got ${itRow[catIdx]}`);
        const hidRow = m[TOKENS.indexOf('hid')];
        console.assert(Math.abs(hidRow[catIdx] - 0.72) < 0.01, `hid->cat should be ~0.72, got ${hidRow[catIdx]}`);
        const scaredRow = m[TOKENS.indexOf('scared')];
        console.assert(Math.abs(scaredRow[catIdx] - 0.72) < 0.01, `scared->cat should be ~0.72, got ${scaredRow[catIdx]}`);
        const itNoScale = computeRowNoScale('it');
        console.assert(Math.abs(itNoScale[catIdx] - 0.99) < 0.01, `it->cat without sqrt(d) should be ~0.99, got ${itNoScale[catIdx]}`);
    })();

    // ---- Symbol glossary text ---------------------------------------------------
    // One source of truth per symbol, shared by the <dt> aria-label, the floating
    // tooltip, and the fixed explainer line. Keys match every data-sym in the DOM.
    const GLOSS = {
        q: 'q_i 查詢向量：你點的那個字在「找什麼」。對應你選的字（teal）和熱圖裡它那一橫列。',
        k: 'k_j 鍵向量：每個字提供什麼、代表什麼。對應熱圖上緣那排、被看的七個字（amber）。',
        score: 'score_ij ＝ q_i·k_j／√d：還沒正規化的原始比對分數，就是選中那列七格的原始強度。',
        sqrtd: '√d ＝ 2：把分數縮小的縮放係數，擋住 softmax 太快押在同一格上（拿掉它 it→cat 會從 0.83 衝到 0.99）；跟下面的 T 滑桿是同一件事的教學版。',
        softmax: 'softmax：把一整列七個分數壓成加起來剛好等於 1 的比例——就是下面那條長條被剛好填滿。',
        w: 'w_ij 注意力權重：熱圖裡的一格、長條裡的一段；看得越重就越大，每一列的和＝1。',
        v: 'v_j 值向量：每個字真正送出去、被混進來的內容（這個 demo 用 v=k 簡化）；長條裡的每一段就是它們。',
        output: 'output_i：七個字的值照權重混合後、那個字更新後的新意思——就是下面那條長條，也是那句白話讀數。',
    };
    const DEFAULT_HINT = '把游標移到算式的符號上（手機點一下），看它對應畫面上的哪個東西。';

    // ---- Canvas + DOM wiring -----------------------------------------------------
    const canvas = document.getElementById('attn-canvas');
    const ctx = canvas.getContext('2d');
    const readout = document.getElementById('readout');
    const tInput = document.getElementById('t');
    const tValue = document.getElementById('t-value');
    const chips = Array.from(document.querySelectorAll('.token-chip'));
    const controlT = document.querySelector('.control-t');

    // ---- Formula symbol <-> canvas linkage ----
    const formalSection = document.querySelector('.formal');
    const symExplainer = document.querySelector('.sym-explainer');
    const symTip = document.querySelector('.sym-tip');
    const symEls = formalSection ? Array.from(formalSection.querySelectorAll('[data-sym]')) : [];
    // 詞彙表 <dt> ＝正式的鍵盤／AT 互動圖例（唯一的 role=button + tab 停點）。
    const glossEls = formalSection ? Array.from(formalSection.querySelectorAll('.symbol-gloss dt[data-sym]')) : [];

    const colors = {
        bg: '#070b12',
        ink: '#eef4ff',
        grid: '#152136',
        axis: '#3a4a66',
        muted: '#9ba8bd',
        q: '#70e0c2',
        k: '#f0c15a',
        labelBg: 'rgba(5, 7, 13, 0.78)',
        labelOnAmber: '#1b1406',
    };

    const state = {
        width: 0,
        height: 0,
        dpr: 1,
        selected: TOKENS.indexOf('it'), // default selection = "it"
        T: 1,
        matrix: computeMatrix(1),
        layout: null,
    };

    // 熱圖 hover：目前滑到的格子 {i, j}（i=看出去的字、j=被看的字），null=不在格上。
    // 白話浮籤（.cell-tip）跟著游標，格子本身加白框——白話與數字同時浮出。
    const cellTip = document.querySelector('.cell-tip');
    let hoverCell = null;

    // hover / focus / pin tracked independently; effective = pin > hover > focus.
    // pointerout clears only hover; focusout clears only focus.
    let hoverSym = null;
    let hoverEl = null;
    let focusSym = null;
    let focusEl = null;
    let pinnedSym = null;
    let pinnedEl = null;

    function effectiveSym() {
        return pinnedSym || hoverSym || focusSym;
    }

    function effectiveEl() {
        return pinnedEl || hoverEl || focusEl;
    }

    const clamp = (min, v, max) => Math.max(min, Math.min(max, v));

    function layout() {
        const pad = clamp(18, state.width * 0.045, 46);
        const availW = state.width - pad * 2;
        const availH = state.height - pad * 2;

        const barSectionH = availH * 0.22;
        const gridSectionH = availH - barSectionH;

        // 軸標直接寫 token 字（不用 1–7 數字），左欄與上緣要留得下「because」
        const topLabelH = clamp(18, gridSectionH * 0.1, 34);
        const leftLabelW = clamp(46, availW * 0.11, 78);

        const gridW = availW - leftLabelW;
        const gridH = gridSectionH - topLabelH;
        const cell = Math.max(1, Math.min(gridW, gridH) / 7);
        const gridSize = cell * 7;

        const gridX = pad + leftLabelW + (gridW - gridSize) / 2;
        const gridY = pad + topLabelH + (gridH - gridSize) / 2;

        const barCaptionH = clamp(16, barSectionH * 0.4, 22);
        const barH = clamp(16, barSectionH - barCaptionH - 6, 34);
        const barX = pad;
        const barW = availW;
        const barY = pad + gridSectionH + barCaptionH + 6;

        return { pad, cell, gridX, gridY, gridSize, barX, barY, barW, barH, barCaptionH, gridSectionH: pad + gridSectionH };
    }

    // highlight: the active symbol id (null = none). Every boost is additive and
    // guarded, so it is a no-op if the mapped element is not currently drawn.
    function drawHeatmap(L, matrix, selIdx, highlight) {
        // Cells: amber fill. Alpha is normalized to the matrix max and gamma-
        // stretched so the contrast reads even for low weights: darkest darker,
        // the brightest cell always at full amber. A tiny display floor keeps
        // "faint" distinguishable from "empty".
        let maxW = 0;
        for (let i = 0; i < 7; i += 1) {
            for (let j = 0; j < 7; j += 1) maxW = Math.max(maxW, matrix[i][j]);
        }
        for (let i = 0; i < 7; i += 1) {
            for (let j = 0; j < 7; j += 1) {
                const w = matrix[i][j];
                const alpha = 0.04 + 0.96 * Math.pow(w / maxW, 1.35);
                ctx.fillStyle = `rgba(240, 193, 90, ${alpha.toFixed(3)})`;
                ctx.fillRect(L.gridX + j * L.cell, L.gridY + i * L.cell, L.cell, L.cell);
            }
        }

        // 每格疊一個淡數字：亮度差之外的第二通道（色弱也讀得出深淺）。
        const numFont = Math.round(clamp(8, L.cell * 0.2, 12));
        ctx.font = `${numFont}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 7; i += 1) {
            for (let j = 0; j < 7; j += 1) {
                const w = matrix[i][j];
                const bright = w / maxW > 0.55;
                ctx.fillStyle = bright ? colors.labelOnAmber : 'rgba(238, 244, 255, 0.55)';
                ctx.fillText(w.toFixed(2), L.gridX + j * L.cell + L.cell / 2, L.gridY + i * L.cell + L.cell / 2);
            }
        }

        // Grid lines.
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let k = 0; k <= 7; k += 1) {
            const x = L.gridX + k * L.cell;
            ctx.beginPath();
            ctx.moveTo(x, L.gridY);
            ctx.lineTo(x, L.gridY + L.gridSize);
            ctx.stroke();
            const y = L.gridY + k * L.cell;
            ctx.beginPath();
            ctx.moveTo(L.gridX, y);
            ctx.lineTo(L.gridX + L.gridSize, y);
            ctx.stroke();
        }

        // 'w' (weights) → every cell is a weight: brighten the whole grid border.
        if (highlight === 'w') {
            ctx.strokeStyle = colors.k;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(L.gridX, L.gridY, L.gridSize, L.gridSize);
        }

        // 'k' (keys) → the columns/top axis are the "looked-at" tokens: amber top edge.
        if (highlight === 'k') {
            ctx.strokeStyle = colors.k;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(L.gridX, L.gridY);
            ctx.lineTo(L.gridX + L.gridSize, L.gridY);
            ctx.stroke();
        }

        // Selected row (the query). 'q' thickens the outline and tints the row.
        const qBoost = highlight === 'q';
        if (qBoost) {
            ctx.fillStyle = 'rgba(112, 224, 194, 0.12)';
            ctx.fillRect(L.gridX, L.gridY + selIdx * L.cell, L.gridSize, L.cell);
        }
        // Selected row outline (teal) — never rely on color alone: also drawn wider.
        ctx.strokeStyle = colors.q;
        ctx.lineWidth = qBoost ? 4 : 2.5;
        ctx.strokeRect(L.gridX + 1, L.gridY + selIdx * L.cell + 1, L.gridSize - 2, L.cell - 2);

        // 'score' (q·k, pre-softmax) → outline each cell in the selected row.
        if (highlight === 'score') {
            ctx.strokeStyle = colors.ink;
            ctx.lineWidth = 1.5;
            for (let j = 0; j < 7; j += 1) {
                ctx.strokeRect(L.gridX + j * L.cell + 1.5, L.gridY + selIdx * L.cell + 1.5, L.cell - 3, L.cell - 3);
            }
        }

        // Hovered cell: ink outline (the plain-language tip lives in the DOM cell-tip).
        if (hoverCell) {
            ctx.strokeStyle = colors.ink;
            ctx.lineWidth = 2;
            ctx.strokeRect(L.gridX + hoverCell.j * L.cell + 1, L.gridY + hoverCell.i * L.cell + 1, L.cell - 2, L.cell - 2);
        }

        // Ring the max cell in that row + print its weight.
        const row = matrix[selIdx];
        const maxJ = argmax(row);
        const cx = L.gridX + maxJ * L.cell;
        const cy = L.gridY + selIdx * L.cell;
        ctx.strokeStyle = colors.k;
        ctx.lineWidth = 3;
        ctx.strokeRect(cx + 2, cy + 2, L.cell - 4, L.cell - 4);

        const label = row[maxJ].toFixed(2);
        ctx.font = `${Math.round(clamp(11, L.cell * 0.28, 16))}px system-ui, sans-serif`;
        const tw = ctx.measureText(label).width;
        const lx = cx + L.cell / 2;
        const ly = cy - 8;
        const padX = 5;
        const padY = 3;
        ctx.fillStyle = colors.labelBg;
        ctx.fillRect(lx - tw / 2 - padX, ly - 12 - padY, tw + padX * 2, 14 + padY);
        ctx.fillStyle = colors.ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, lx, ly - 12);

        // Axis labels: the actual token words on both axes (no 1-7 numbers to
        // mentally translate). Top = keys (amber under 'k'); left = queries —
        // the selected row's word is always q-teal to match the row outline.
        const topColor = highlight === 'k' ? colors.k : colors.muted;
        const axisFont = Math.round(clamp(9, L.cell * 0.22, 12));
        ctx.font = `${axisFont}px system-ui, sans-serif`;
        // 窄格（手機）時最長的字擺不進一格寬，就斜著寫
        const rotateTop = ctx.measureText('because').width > L.cell - 6;
        for (let j = 0; j < 7; j += 1) {
            const cxx = L.gridX + j * L.cell + L.cell / 2;
            ctx.fillStyle = topColor;
            if (rotateTop) {
                ctx.save();
                ctx.translate(cxx, L.gridY - 4);
                ctx.rotate(-0.6);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(TOKENS[j], 0, 0);
                ctx.restore();
            } else {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(TOKENS[j], cxx, L.gridY - 4);
            }
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 7; i += 1) {
            const isSel = i === selIdx;
            ctx.fillStyle = isSel ? colors.q : (highlight === 'q' ? colors.q : colors.muted);
            ctx.font = `${isSel ? '700 ' : ''}${axisFont}px system-ui, sans-serif`;
            ctx.fillText(TOKENS[i], L.gridX - 8, L.gridY + i * L.cell + L.cell / 2);
        }
    }

    function drawStackedBar(L, row, selIdx, highlight) {
        const maxJ = argmax(row);
        const tokenLabel = TOKENS[selIdx];

        // Caption above the bar.
        ctx.fillStyle = colors.ink;
        ctx.font = `${Math.round(clamp(12, L.barCaptionH * 0.7, 16))}px system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`「${tokenLabel}」更新後的意思 ＝ 這些字的加權混合`, L.barX, L.barY - L.barCaptionH - 4);

        // Segments left-to-right in key order; widths are exactly proportional
        // to the weights, so the bar is always exactly full (rows sum to 1).
        // 'v' (values) → lift every segment so each token's content is visible.
        const vBoost = highlight === 'v';
        let x = L.barX;
        ctx.strokeStyle = colors.bg;
        ctx.lineWidth = 1;
        for (let j = 0; j < 7; j += 1) {
            const w = row[j] * L.barW;
            const alpha = j === maxJ ? 1 : (vBoost ? 0.7 : 0.42);
            ctx.fillStyle = `rgba(240, 193, 90, ${alpha})`;
            ctx.fillRect(x, L.barY, Math.max(0, w), L.barH);
            if (j > 0) {
                ctx.beginPath();
                ctx.moveTo(x, L.barY);
                ctx.lineTo(x, L.barY + L.barH);
                ctx.stroke();
            }
            x += w;
        }

        // Bar border. 'output'/'softmax' (the blend / the row-sum) → bright ink
        // border; 'w' (weights) → amber border. Otherwise the neutral axis colour.
        const barEmph = highlight === 'output' || highlight === 'softmax';
        const wBoost = highlight === 'w';
        ctx.strokeStyle = barEmph ? colors.ink : (wBoost ? colors.k : colors.axis);
        ctx.lineWidth = barEmph ? 2.5 : (wBoost ? 2 : 1);
        ctx.strokeRect(L.barX + 0.5, L.barY + 0.5, L.barW - 1, L.barH - 1);

        // 'w' → also brighten the segment separators (the individual weights).
        if (wBoost) {
            ctx.strokeStyle = colors.k;
            ctx.lineWidth = 1.5;
            let sx = L.barX;
            for (let j = 0; j < 7; j += 1) {
                if (j > 0) {
                    ctx.beginPath();
                    ctx.moveTo(sx, L.barY);
                    ctx.lineTo(sx, L.barY + L.barH);
                    ctx.stroke();
                }
                sx += row[j] * L.barW;
            }
        }

        // 'softmax' → annotate that the bar is exactly full (the row sums to 1).
        if (highlight === 'softmax') {
            ctx.fillStyle = colors.ink;
            ctx.font = `${Math.round(clamp(11, L.barCaptionH * 0.62, 14))}px system-ui, sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText('整列＝1', L.barX + L.barW, L.barY - L.barCaptionH - 4);
        }

        // Dominant segment label: token + weight, clamped inside the canvas.
        const segStart = L.barX + row.slice(0, maxJ).reduce((a, b) => a + b, 0) * L.barW;
        const segW = row[maxJ] * L.barW;
        const domLabel = `${TOKENS[maxJ]} ${row[maxJ].toFixed(2)}`;
        ctx.font = `${Math.round(clamp(11, L.barH * 0.42, 15))}px system-ui, sans-serif`;
        const lw = ctx.measureText(domLabel).width;
        let lx = segStart + segW / 2;
        lx = clamp(L.barX + lw / 2 + 4, lx, L.barX + L.barW - lw / 2 - 4);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Use a dark label when the segment is wide enough to hold it; otherwise
        // place a small pill above the bar so the text is never clipped/illegible.
        if (segW >= lw + 8) {
            ctx.fillStyle = colors.labelOnAmber;
            ctx.fillText(domLabel, lx, L.barY + L.barH / 2);
        } else {
            const py = L.barY - 6;
            ctx.fillStyle = colors.labelBg;
            ctx.fillRect(lx - lw / 2 - 5, py - 16, lw + 10, 18);
            ctx.fillStyle = colors.ink;
            ctx.textBaseline = 'bottom';
            ctx.fillText(domLabel, lx, py + 2);
        }
    }

    function updateReadout(selIdx, matrix) {
        const row = matrix[selIdx];
        const maxJ = argmax(row);
        readout.textContent = `從「${TOKENS[selIdx]}」看出去，最亮的是「${TOKENS[maxJ]}」（${row[maxJ].toFixed(2)}）。`;
    }

    function render(highlight) {
        if (state.width < 2 || state.height < 2) return; // layout not ready yet
        ctx.clearRect(0, 0, state.width, state.height);
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, state.width, state.height);

        const L = layout();
        state.layout = L;
        drawHeatmap(L, state.matrix, state.selected, highlight);
        drawStackedBar(L, state.matrix[state.selected], state.selected, highlight);
        updateReadout(state.selected, state.matrix);
    }

    function selectToken(idx) {
        state.selected = idx;
        chips.forEach((btn, i) => {
            const on = i === idx;
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            btn.classList.toggle('selected', on);
        });
        // refresh() re-applies the (possibly pinned) symbol cues to the new
        // selection and redraws with the current effective highlight.
        refresh();
    }

    // ---- Floating tooltip (viewport-clamped, flips below if it would overflow top) ----
    function showTip(el, text) {
        if (!symTip || !el) return;
        symTip.textContent = text;
        symTip.hidden = false;
        const margin = 8;
        const rect = el.getBoundingClientRect();
        const tipRect = symTip.getBoundingClientRect();
        let top = rect.top - tipRect.height - margin;
        if (top < margin) {
            top = rect.bottom + margin; // no room above → drop below
        }
        let left = rect.left + rect.width / 2 - tipRect.width / 2;
        left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));
        top = Math.min(top, window.innerHeight - tipRect.height - margin);
        symTip.style.left = `${left}px`;
        symTip.style.top = `${top}px`;
    }

    function hideTip() {
        if (!symTip) return;
        symTip.hidden = true;
    }

    // ---- Active symbol changed → refresh every linkage (legend class, explainer,
    // tooltip, DOM cues, canvas). ----
    function refresh() {
        const sym = effectiveSym();
        const el = effectiveEl();

        // is-active on all [data-sym] (formula spans + gloss dt) for cross-highlight.
        symEls.forEach((node) => {
            node.classList.toggle('is-active', node.dataset.sym === sym);
        });
        // aria-pressed only on the real role=button elements (the gloss <dt>).
        glossEls.forEach((node) => {
            node.setAttribute('aria-pressed', String(node.dataset.sym === pinnedSym));
        });

        if (symExplainer) {
            symExplainer.textContent = sym ? (GLOSS[sym] || '') : DEFAULT_HINT;
        }

        if (sym && el) {
            showTip(el, GLOSS[sym] || '');
        } else {
            hideTip();
        }

        // DOM-side cues: √d ↔ the T control; output ↔ the readout sentence;
        // q ↔ the selected token chip.
        if (controlT) controlT.classList.toggle('is-cued', sym === 'sqrtd');
        if (readout) readout.classList.toggle('is-cued', sym === 'output');
        chips.forEach((btn, i) => {
            btn.classList.toggle('is-cued', sym === 'q' && i === state.selected);
        });

        render(sym);
    }

    function closestSym(node) {
        return node && node.closest ? node.closest('[data-sym]') : null;
    }

    function setHover(sym, el) {
        if (hoverSym === sym && hoverEl === el) return;
        hoverSym = sym;
        hoverEl = el;
        refresh();
    }

    // Keyboard focus tracked independently: pointerout clears only hover,
    // focusout clears only focus — they never clear each other.
    function setFocus(sym, el) {
        if (focusSym === sym && focusEl === el) return;
        focusSym = sym;
        focusEl = el;
        refresh();
    }

    function togglePin(el) {
        const sym = el.dataset.sym;
        if (pinnedSym === sym) {
            pinnedSym = null;
            pinnedEl = null;
        } else {
            pinnedSym = sym;
            pinnedEl = el;
        }
        refresh();
    }

    function unpinAll() {
        if (pinnedSym === null) return;
        pinnedSym = null;
        pinnedEl = null;
        refresh();
    }

    function initSymInteractivity() {
        if (!formalSection || symEls.length === 0) return;

        // Only the gloss <dt> are keyboard tab stops + role=button (8 of them);
        // formula-line symbols keep pointer interaction only, never tab stops.
        glossEls.forEach((el) => {
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            el.setAttribute('aria-label', GLOSS[el.dataset.sym] || '');
            el.setAttribute('aria-pressed', 'false');
        });

        formalSection.addEventListener('pointerover', (e) => {
            const el = closestSym(e.target);
            if (!el) return;
            setHover(el.dataset.sym, el);
        });

        formalSection.addEventListener('pointerout', (e) => {
            const el = closestSym(e.target);
            if (!el) return;
            const toEl = closestSym(e.relatedTarget);
            if (toEl) setHover(toEl.dataset.sym, toEl);
            else setHover(null, null);
        });

        formalSection.addEventListener('focusin', (e) => {
            const el = closestSym(e.target);
            if (!el) return;
            setFocus(el.dataset.sym, el);
        });

        formalSection.addEventListener('focusout', (e) => {
            const el = closestSym(e.target);
            if (!el) return;
            const toEl = closestSym(e.relatedTarget);
            if (toEl) setFocus(toEl.dataset.sym, toEl);
            else setFocus(null, null);
        });

        formalSection.addEventListener('click', (e) => {
            const el = closestSym(e.target);
            if (!el) return;
            e.stopPropagation();
            togglePin(el);
        });

        formalSection.addEventListener('keydown', (e) => {
            const el = closestSym(e.target);
            if (!el) return;
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                togglePin(el);
            }
        });

        // Only a click that is neither a symbol nor inside the interactive surface
        // (chips / canvas / slider) nor inside the formal section unpins — so
        // adjusting T or selecting a token never drops a pin the user wanted kept.
        document.addEventListener('click', (e) => {
            const t = e.target;
            if (t.closest && (t.closest('[data-sym]') || t.closest('.lab-surface') || t.closest('.formal'))) return;
            unpinAll();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') unpinAll();
        });
    }

    chips.forEach((btn, i) => {
        btn.addEventListener('click', () => selectToken(i));
    });

    // Secondary interaction: clicking a heatmap row selects that query token.
    canvas.addEventListener('click', (evt) => {
        const L = state.layout;
        if (!L) return;
        const rect = canvas.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;
        if (x < L.gridX || x > L.gridX + L.gridSize || y < L.gridY || y > L.gridY + L.gridSize) return;
        const row = Math.floor((y - L.gridY) / L.cell);
        if (row >= 0 && row < 7) selectToken(row);
    });

    // 熱圖白話層：滑到哪一格，浮出「誰看誰＝多少」＋白框那一格。
    function cellAt(evt) {
        const L = state.layout;
        if (!L) return null;
        const rect = canvas.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;
        if (x < L.gridX || x > L.gridX + L.gridSize || y < L.gridY || y > L.gridY + L.gridSize) return null;
        return {
            i: Math.min(6, Math.max(0, Math.floor((y - L.gridY) / L.cell))),
            j: Math.min(6, Math.max(0, Math.floor((x - L.gridX) / L.cell))),
        };
    }

    canvas.addEventListener('pointermove', (evt) => {
        const cell = cellAt(evt);
        const changed = (cell === null) !== (hoverCell === null)
            || (cell && hoverCell && (cell.i !== hoverCell.i || cell.j !== hoverCell.j));
        hoverCell = cell;
        if (cellTip) {
            if (cell) {
                const w = state.matrix[cell.i][cell.j];
                cellTip.textContent = `「${TOKENS[cell.i]}」看「${TOKENS[cell.j]}」＝ ${w.toFixed(2)}`;
                cellTip.hidden = false;
                const margin = 10;
                let left = evt.clientX + 14;
                let top = evt.clientY - 34;
                left = Math.min(left, window.innerWidth - cellTip.offsetWidth - margin);
                top = Math.max(margin, top);
                cellTip.style.left = `${left}px`;
                cellTip.style.top = `${top}px`;
            } else {
                cellTip.hidden = true;
            }
        }
        if (changed) render(effectiveSym());
    });

    canvas.addEventListener('pointerleave', () => {
        if (hoverCell === null) return;
        hoverCell = null;
        if (cellTip) cellTip.hidden = true;
        render(effectiveSym());
    });

    tInput.addEventListener('input', () => {
        state.T = Number(tInput.value);
        tValue.textContent = state.T.toFixed(2);
        state.matrix = computeMatrix(state.T);
        render(effectiveSym()); // keep any pinned/hovered highlight while dragging
    });

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        if (w < 2 || h < 2) return; // layout not ready; ResizeObserver will retry
        state.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
        state.width = w;
        state.height = h;
        canvas.width = Math.round(w * state.dpr);
        canvas.height = Math.round(h * state.dpr);
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        render(effectiveSym());
    }

    window.addEventListener('resize', resize);
    window.addEventListener('load', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);

    // Initial state: chips reflect the default "it" selection immediately.
    chips.forEach((btn, i) => {
        const on = i === state.selected;
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.classList.toggle('selected', on);
    });
    initSymInteractivity();
    resize();
    refresh();
})();
