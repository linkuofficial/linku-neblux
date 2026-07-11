(() => {
    const canvas = document.getElementById('wave-canvas');
    const ctx = canvas.getContext('2d');
    const ampInput = document.getElementById('amp');
    const freqInput = document.getElementById('freq');
    const phaseInput = document.getElementById('phase');
    const ampValue = document.getElementById('amp-value');
    const freqValue = document.getElementById('freq-value');
    const phaseValue = document.getElementById('phase-value');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const colors = {
        ink: '#eef4ff',
        muted: '#7f8da5',
        grid: '#182338',
        axis: '#41516d',
        amp: '#70e0c2',
        freq: '#f0c15a',
        phase: '#ef7f72',
        ghost: 'rgba(155, 188, 255, 0.22)',
    };

    const state = {
        amp: Number(ampInput.value),
        freq: Number(freqInput.value),
        phase: Number(phaseInput.value),
        time: 0,
        width: 0,
        height: 0,
        dpr: 1,
    };

    function syncState() {
        state.amp = Number(ampInput.value);
        state.freq = Number(freqInput.value);
        state.phase = Number(phaseInput.value);
        ampValue.textContent = state.amp.toFixed(2);
        freqValue.textContent = `${state.freq.toFixed(2)} Hz`;
        phaseValue.textContent = `${(state.phase / Math.PI).toFixed(2)}π`;
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
    }

    function drawGrid(cx, cy, plotWidth, plotHeight) {
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        const verticalLines = 10;
        const horizontalLines = 6;
        for (let i = 0; i <= verticalLines; i += 1) {
            const x = cx + (plotWidth * i) / verticalLines;
            ctx.beginPath();
            ctx.moveTo(x, cy - plotHeight / 2);
            ctx.lineTo(x, cy + plotHeight / 2);
            ctx.stroke();
        }
        for (let i = 0; i <= horizontalLines; i += 1) {
            const y = cy - plotHeight / 2 + (plotHeight * i) / horizontalLines;
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx + plotWidth, y);
            ctx.stroke();
        }
        ctx.strokeStyle = colors.axis;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + plotWidth, cy);
        ctx.stroke();
    }

    function waveY(xNorm, amp, freq, phase, travel) {
        const angle = 2 * Math.PI * freq * xNorm + phase - travel;
        return Math.sin(angle) * amp;
    }

    function strokeWave(cx, cy, plotWidth, plotHeight, amp, freq, phase, travel, color, lineWidth) {
        const waveScale = plotHeight * 0.34;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const samples = Math.max(240, Math.floor(plotWidth));
        for (let i = 0; i <= samples; i += 1) {
            const xNorm = i / samples;
            const x = cx + xNorm * plotWidth;
            const y = cy - waveY(xNorm, amp, freq, phase, travel) * waveScale;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function drawAmplitudeGuide(cx, cy, plotHeight) {
        const waveScale = plotHeight * 0.34;
        const guideX = cx + 34;
        const top = cy - state.amp * waveScale;
        ctx.strokeStyle = colors.amp;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(guideX, cy);
        ctx.lineTo(guideX, top);
        ctx.stroke();
        ctx.fillStyle = colors.amp;
        ctx.beginPath();
        ctx.arc(guideX, top, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawPhaseMarker(cx, cy, plotWidth, plotHeight, travel) {
        const waveScale = plotHeight * 0.34;
        const xNorm = 0.12;
        const x = cx + xNorm * plotWidth;
        const y = cy - waveY(xNorm, state.amp, state.freq, state.phase, travel) * waveScale;
        ctx.strokeStyle = colors.phase;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, cy - plotHeight / 2);
        ctx.lineTo(x, cy + plotHeight / 2);
        ctx.stroke();
        ctx.fillStyle = colors.phase;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawFrequencyTicks(cx, cy, plotWidth, plotHeight) {
        const cycles = Math.max(1, Math.round(state.freq));
        const tickY = cy + plotHeight / 2 - 18;
        ctx.fillStyle = colors.freq;
        ctx.strokeStyle = colors.freq;
        ctx.lineWidth = 1.5;
        for (let i = 0; i <= cycles; i += 1) {
            const x = cx + (plotWidth * i) / cycles;
            ctx.beginPath();
            ctx.moveTo(x, tickY - 6);
            ctx.lineTo(x, tickY + 6);
            ctx.stroke();
        }
    }

    // C6 三重對應：畫面元素末端放「色塊＋名字」小籤（與滑桿標籤、公式符號同色），
    // 深色底墊片讓籤壓在線上也讀得清。
    function drawTag(x, y, color, text) {
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const sw = 9;
        const padX = 5;
        const h = 20;
        const tw = ctx.measureText(text).width;
        const boxW = padX * 2 + sw + 6 + tw;
        ctx.fillStyle = 'rgba(5, 7, 13, 0.78)';
        ctx.fillRect(x, y - h / 2, boxW, h);
        ctx.fillStyle = color;
        ctx.fillRect(x + padX, y - sw / 2, sw, sw);
        ctx.fillText(text, x + padX + sw + 6, y + 1);
    }

    function drawLabels(cx, cy, plotWidth, plotHeight) {
        ctx.fillStyle = colors.muted;
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('center', cx + 8, cy + 8);
        const waveScale = plotHeight * 0.34;
        const topClamp = cy - plotHeight / 2 + 12;
        drawTag(cx + 16, Math.max(topClamp, cy - state.amp * waveScale - 14), colors.amp, 'A 振幅');
        drawTag(cx + plotWidth - 88, cy + plotHeight / 2 - 32, colors.freq, 'f 頻率');
        drawTag(cx + plotWidth * 0.12 + 8, Math.max(topClamp, cy - plotHeight / 2 + 14), colors.phase, 'φ 相位');
    }

    function draw(now) {
        if (state.width < 2 || state.height < 2) { requestAnimationFrame(draw); return; } // 版面還沒算好
        const speed = reduceMotion.matches ? 0.00018 : 0.00055;
        state.time = now * speed;
        const travel = state.time * Math.PI * 2;
        ctx.clearRect(0, 0, state.width, state.height);
        ctx.fillStyle = '#070b12';
        ctx.fillRect(0, 0, state.width, state.height);

        const pad = Math.max(18, Math.min(46, state.width * 0.045));
        const cx = pad;
        const plotWidth = state.width - pad * 2;
        const cy = state.height * 0.5;
        const plotHeight = state.height - pad * 2;

        drawGrid(cx, cy, plotWidth, plotHeight);
        strokeWave(cx, cy, plotWidth, plotHeight, 1, 1, 0, travel, colors.ghost, 2);
        drawFrequencyTicks(cx, cy, plotWidth, plotHeight);
        strokeWave(cx, cy, plotWidth, plotHeight, state.amp, state.freq, state.phase, travel, colors.ink, 3);
        drawAmplitudeGuide(cx, cy, plotHeight);
        drawPhaseMarker(cx, cy, plotWidth, plotHeight, travel);
        drawLabels(cx, cy, plotWidth, plotHeight);

        requestAnimationFrame(draw);
    }

    [ampInput, freqInput, phaseInput].forEach((input) => input.addEventListener('input', syncState));
    window.addEventListener('resize', resize);
    window.addEventListener('load', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    syncState();
    resize();
    requestAnimationFrame(draw);
})();
