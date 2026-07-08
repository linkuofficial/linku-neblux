(() => {
    const canvas = document.getElementById('wave-canvas');
    const ctx = canvas.getContext('2d');
    const nInput = document.getElementById('n');
    const nValue = document.getElementById('n-value');

    const colors = {
        ink: '#eef4ff',
        grid: '#152136',
        axis: '#3a4a66',
        target: 'rgba(150, 184, 255, 0.55)',
    };

    const CYCLES = 2; // 畫面內顯示兩個完整週期
    const F = 4 / Math.PI;

    const state = { count: 1, width: 0, height: 0, dpr: 1 };

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
        ctx.strokeStyle = colors.ink;
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

    function drawLegend(L) {
        let x = L.cx + 6;
        const y = L.cy - L.ph / 2 + 4;
        ctx.font = '13px system-ui, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillStyle = colors.target;
        ctx.fillText('目標方波', x, y);
        x += ctx.measureText('目標方波').width + 16;
        ctx.fillStyle = colors.ink;
        ctx.fillText('你疊出來的', x, y);
    }

    function render() {
        if (state.width < 2 || state.height < 2) return; // 版面還沒算好就先不畫
        ctx.clearRect(0, 0, state.width, state.height);
        ctx.fillStyle = '#070b12';
        ctx.fillRect(0, 0, state.width, state.height);
        const L = layout();
        drawGrid(L);
        drawTargetSquare(L);
        drawSynth(L);
        drawLegend(L);
    }

    function syncState() {
        state.count = Number(nInput.value);
        nValue.textContent = `${state.count} 顆`;
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
