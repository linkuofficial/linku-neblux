(() => {
    const canvas = document.getElementById('wave-canvas');
    const ctx = canvas.getContext('2d');
    const nInput = document.getElementById('n');
    const nValue = document.getElementById('n-value');

    const colors = {
        ink: '#eef4ff',
        grid: '#152136',
        axis: '#3a4a66',
        // C6 三重對應：合成波 teal ＝ N 滑桿色塊 ＝ 公式裡的 N；
        // 目標方波 amber 虛線 ＝ 公式裡的 ω（方波的週期由 ω 定義）＝ HTML 圖例色塊。
        synth: '#70e0c2',
        target: 'rgba(240, 193, 90, 0.8)',
        gap: 'rgba(240, 193, 90, 0.13)',
        labelBg: 'rgba(5, 7, 13, 0.78)',
    };

    const CYCLES = 2; // 畫面內顯示兩個完整週期
    const F = 4 / Math.PI;

    const state = { count: 1, width: 0, height: 0, dpr: 1 };

    // C7 增量顯形：N 改變時，把「剛加進來的第 N 顆」用 falloff 紫單獨畫出來，
    // 短暫顯示後淡出融入總和——讓「一層一層疊」的因果看得見。
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let newWave = 0;      // 0..1 透明度
    let newWaveN = 0;     // 顯形中的是第幾顆（1-based）
    let newWaveT0 = 0;
    let newWaveRaf = null;
    let newWaveTimer = null;

    function kickNewWave(count) {
        newWaveN = count;
        newWave = 1;
        newWaveT0 = performance.now();
        if (reduceMotion.matches) {
            // 不做動畫：靜態顯示一小段時間後單次重繪隱藏
            if (newWaveTimer) clearTimeout(newWaveTimer);
            newWaveTimer = setTimeout(() => { newWave = 0; render(); }, 1200);
            return;
        }
        if (newWaveRaf !== null) return;
        const loop = (now) => {
            newWave = Math.max(0, 1 - (now - newWaveT0) / 900);
            render();
            if (newWave > 0) newWaveRaf = requestAnimationFrame(loop);
            else newWaveRaf = null;
        };
        newWaveRaf = requestAnimationFrame(loop);
    }

    const theta = (xNorm) => 2 * Math.PI * CYCLES * xNorm;

    // 疊前 count 顆奇次弦波：n = 1,3,5,…,(2·count-1)
    const synth = (t, count) => {
        let s = 0;
        for (let k = 0; k < count; k += 1) {
            const n = 2 * k + 1;
            s += Math.sin(n * t) / n;
        }
        return F * s;
    };

    function layout() {
        const pad = Math.max(18, Math.min(46, state.width * 0.045));
        const ph = state.height - pad * 2;
        return { cx: pad, cy: state.height * 0.5, pw: state.width - pad * 2, ph, ws: ph * 0.3 };
    }

    function drawGrid(L) {
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= CYCLES * 2; i += 1) {
            const x = L.cx + (L.pw * i) / (CYCLES * 2);
            ctx.beginPath();
            ctx.moveTo(x, L.cy - L.ph / 2);
            ctx.lineTo(x, L.cy + L.ph / 2);
            ctx.stroke();
        }
        ctx.strokeStyle = colors.axis;
        ctx.beginPath();
        ctx.moveTo(L.cx, L.cy);
        ctx.lineTo(L.cx + L.pw, L.cy);
        ctx.stroke();
    }

    // 理想方波畫成乾淨階梯：每季 +1 / -1，轉角是垂直跳
    function drawTargetSquare(L) {
        const vals = [1, -1, 1, -1];
        ctx.strokeStyle = colors.target;
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        let x = L.cx;
        ctx.moveTo(x, L.cy - vals[0] * L.ws);
        for (let s = 0; s < 4; s += 1) {
            const y = L.cy - vals[s] * L.ws;
            const x1 = L.cx + ((s + 1) / 4) * L.pw;
            ctx.lineTo(x, y);   // 垂直跳到本季高度
            ctx.lineTo(x1, y);  // 水平走完本季
            x = x1;
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawSynth(L) {
        ctx.strokeStyle = colors.synth;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const samples = Math.max(360, Math.floor(L.pw));
        for (let i = 0; i <= samples; i += 1) {
            const xNorm = i / samples;
            const px = L.cx + xNorm * L.pw;
            const py = L.cy - synth(theta(xNorm), state.count) * L.ws;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    // 理想方波在 xNorm 的值（與 drawTargetSquare 同一套：兩週期＝四段 ±1 交替）
    const targetVal = (xNorm) => [1, -1, 1, -1][Math.min(3, Math.floor(xNorm * 4))];

    // 「還差多少」的淡色面積：沿合成波走過去、再沿目標方波走回來，圍出兩線之間的差距。
    // 交叉處形成的多葉形在 nonzero 填色規則下每葉都會被填到，正好是想要的效果。
    function drawGapFill(L) {
        const samples = Math.max(360, Math.floor(L.pw));
        ctx.fillStyle = colors.gap;
        ctx.beginPath();
        for (let i = 0; i <= samples; i += 1) {
            const xNorm = i / samples;
            const px = L.cx + xNorm * L.pw;
            const py = L.cy - synth(theta(xNorm), state.count) * L.ws;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        for (let i = samples; i >= 0; i -= 1) {
            const xNorm = i / samples;
            ctx.lineTo(L.cx + xNorm * L.pw, L.cy - targetVal(xNorm) * L.ws);
        }
        ctx.closePath();
        ctx.fill();
    }

    // 剛加入的第 N 顆單獨顯形（falloff 紫，與公式的遞減係數同色）
    function drawNewWave(L) {
        if (newWave <= 0 || newWaveN < 1) return;
        const n = 2 * (newWaveN - 1) + 1;
        ctx.strokeStyle = `rgba(183, 156, 240, ${(0.9 * newWave).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const samples = Math.max(360, Math.floor(L.pw));
        for (let i = 0; i <= samples; i += 1) {
            const xNorm = i / samples;
            const px = L.cx + xNorm * L.pw;
            const py = L.cy - (F * Math.sin(n * theta(xNorm)) / n) * L.ws;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    // Gibbs 突起標註：圈出轉角後第一個局部高峰，寫出目前衝過頭幾 %——
    // 新手才知道「該看哪裡」，也親眼看到它變窄但不消失。
    function drawGibbs(L) {
        const samples = 400;
        let prev = synth(theta(0), state.count);
        let curr = synth(theta(1 / samples), state.count);
        for (let i = 2; i <= samples; i += 1) {
            const next = synth(theta(i / samples), state.count);
            if (curr >= prev && curr > next) {
                const xNorm = (i - 1) / samples;
                const px = L.cx + xNorm * L.pw;
                const py = L.cy - curr * L.ws;
                ctx.strokeStyle = colors.ink;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(px, py, 9, 0, Math.PI * 2);
                ctx.stroke();

                const pct = Math.round((curr - 1) * 100);
                const label = state.count >= 4 ? `這個尖角不會消失（+${pct}%）` : `衝過頭 +${pct}%`;
                ctx.font = '600 12px system-ui, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                const tw = ctx.measureText(label).width;
                const lx = px + 14;
                const ly = py - 10;
                ctx.fillStyle = colors.labelBg;
                ctx.fillRect(lx - 4, ly - 10, tw + 8, 20);
                ctx.fillStyle = colors.ink;
                ctx.fillText(label, lx, ly + 1);
                return;
            }
            prev = curr;
            curr = next;
        }
    }

    function render() {
        if (state.width < 2 || state.height < 2) return; // 版面還沒算好就先不畫
        ctx.clearRect(0, 0, state.width, state.height);
        ctx.fillStyle = '#070b12';
        ctx.fillRect(0, 0, state.width, state.height);
        const L = layout();
        drawGrid(L);
        drawGapFill(L);
        drawTargetSquare(L);
        drawSynth(L);
        drawNewWave(L);
        drawGibbs(L);
    }

    function syncState() {
        const prev = state.count;
        state.count = Number(nInput.value);
        nValue.textContent = `${state.count} 顆`;
        if (state.count !== prev) kickNewWave(state.count);
        render();
    }

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        if (w < 2 || h < 2) return; // 版面還沒算好，交給 ResizeObserver 之後再叫
        state.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
        state.width = w;
        state.height = h;
        canvas.width = Math.round(w * state.dpr);
        canvas.height = Math.round(h * state.dpr);
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        render();
    }

    nInput.addEventListener('input', syncState);
    window.addEventListener('resize', resize);
    window.addEventListener('load', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    resize();
    syncState();
})();
