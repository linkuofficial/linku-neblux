(() => {
    const canvas = document.getElementById('wave-canvas');
    const ctx = canvas.getContext('2d');
    const ampInput = document.getElementById('amp');
    const freqInput = document.getElementById('freq');
    const speedInput = document.getElementById('speed');
    const phaseInput = document.getElementById('phase');
    const ampValue = document.getElementById('amp-value');
    const freqValue = document.getElementById('freq-value');
    const speedValue = document.getElementById('speed-value');
    const phaseValue = document.getElementById('phase-value');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const SPACE_METERS = 8;

    const colors = {
        ink: '#eef4ff',
        muted: '#7f8da5',
        grid: '#182338',
        axis: '#41516d',
        amp: '#70e0c2',
        freq: '#f0c15a',
        speed: '#9bbcff',
        phase: '#ef8f83',
        ghost: 'rgba(155, 188, 255, 0.22)',
    };

    const state = {
        amp: Number(ampInput.value),
        freq: Number(freqInput.value),
        speed: Number(speedInput.value),
        phase: Number(phaseInput.value),
        time: 0,
        width: 0,
        height: 0,
        dpr: 1,
    };

    function syncState() {
        state.amp = Number(ampInput.value);
        state.freq = Number(freqInput.value);
        state.speed = Number(speedInput.value);
        state.phase = Number(phaseInput.value);
        const period = 1 / state.freq;
        const wavelength = state.speed / state.freq;
        ampValue.textContent = state.amp.toFixed(2);
        freqValue.textContent = `${state.freq.toFixed(2)} Hz · T = ${period.toFixed(2)} s`;
        speedValue.textContent = `${state.speed.toFixed(1)} m/s · λ = ${wavelength.toFixed(2)} m`;
        phaseValue.textContent = `${(state.phase / Math.PI).toFixed(2)}π`;
    }

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        if (w < 2 || h < 2) return;
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
        for (let i = 0; i <= 10; i += 1) {
            const x = cx + (plotWidth * i) / 10;
            ctx.beginPath();
            ctx.moveTo(x, cy - plotHeight / 2);
            ctx.lineTo(x, cy + plotHeight / 2);
            ctx.stroke();
        }
        for (let i = 0; i <= 6; i += 1) {
            const y = cy - plotHeight / 2 + (plotHeight * i) / 6;
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

    function waveY(xMeters, amp, freq, phase, time, speed) {
        const angle = 2 * Math.PI * freq * (xMeters / speed - time) + phase;
        return Math.sin(angle) * amp;
    }

    function strokeWave(cx, cy, plotWidth, plotHeight, amp, freq, phase, time, speed, color, lineWidth) {
        const waveScale = plotHeight * 0.34;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const samples = Math.max(240, Math.floor(plotWidth));
        for (let i = 0; i <= samples; i += 1) {
            const xNorm = i / samples;
            const x = cx + xNorm * plotWidth;
            const y = cy - waveY(xNorm * SPACE_METERS, amp, freq, phase, time, speed) * waveScale;
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

    function drawWavelengthGuide(cx, cy, plotWidth, plotHeight) {
        const wavelength = state.speed / state.freq;
        const wavelengthFraction = wavelength / SPACE_METERS;
        const startX = cx;
        const endX = cx + Math.min(wavelengthFraction, 1) * plotWidth;
        const y = cy + plotHeight / 2 - 18;
        ctx.strokeStyle = colors.freq;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.moveTo(startX, y - 6);
        ctx.lineTo(startX, y + 6);
        if (wavelengthFraction <= 1) {
            ctx.moveTo(endX, y - 6);
            ctx.lineTo(endX, y + 6);
        } else {
            ctx.moveTo(endX - 8, y - 5);
            ctx.lineTo(endX, y);
            ctx.lineTo(endX - 8, y + 5);
        }
        ctx.stroke();
    }

    function drawPhaseMarker(cx, cy, plotWidth, plotHeight, time) {
        const waveScale = plotHeight * 0.34;
        const xNorm = 0.1;
        const x = cx + xNorm * plotWidth;
        const y = cy - waveY(xNorm * SPACE_METERS, state.amp, state.freq, state.phase, time, state.speed) * waveScale;
        ctx.strokeStyle = colors.phase;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(x, cy - plotHeight / 2);
        ctx.lineTo(x, cy + plotHeight / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = colors.phase;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawTag(x, y, color, text) {
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const sw = 9;
        const padX = 5;
        const h = 20;
        const tw = ctx.measureText(text).width;
        const boxW = padX * 2 + sw + 6 + tw;
        ctx.fillStyle = 'rgba(5, 7, 13, 0.82)';
        ctx.fillRect(x, y - h / 2, boxW, h);
        ctx.fillStyle = color;
        ctx.fillRect(x + padX, y - sw / 2, sw, sw);
        ctx.fillText(text, x + padX + sw + 6, y + 1);
    }

    function visibleExtremum(targetAngle, time) {
        const wavelength = state.speed / state.freq;
        const wavelengthFraction = wavelength / SPACE_METERS;
        let xNorm = (state.speed * time + wavelength * (targetAngle - state.phase) / (2 * Math.PI)) / SPACE_METERS;
        while (xNorm < 0.08) xNorm += wavelengthFraction;
        while (xNorm > 0.92) xNorm -= wavelengthFraction;
        return xNorm >= 0.08 && xNorm <= 0.92 ? xNorm : null;
    }

    function drawExtrema(cx, cy, plotWidth, plotHeight, time) {
        if (state.amp < 0.08) return;
        const waveScale = plotHeight * 0.34;
        const crest = visibleExtremum(Math.PI / 2, time);
        const trough = visibleExtremum(3 * Math.PI / 2, time);
        for (const [xNorm, label, sign] of [[crest, '波峰', 1], [trough, '波谷', -1]]) {
            if (xNorm === null) continue;
            const x = cx + xNorm * plotWidth;
            const y = cy - sign * state.amp * waveScale;
            ctx.fillStyle = colors.ink;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = '600 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = sign > 0 ? 'bottom' : 'top';
            ctx.fillText(label, x, y + (sign > 0 ? -8 : 8));
        }
    }

    function drawLabels(cx, cy, plotWidth, plotHeight) {
        ctx.fillStyle = colors.muted;
        ctx.font = '13px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('中心線', cx + 8, cy + 8);
        const waveScale = plotHeight * 0.34;
        const topClamp = cy - plotHeight / 2 + 12;
        drawTag(cx + 16, Math.max(topClamp, cy - state.amp * waveScale - 14), colors.amp, 'A 振幅');
        drawTag(cx + plotWidth * 0.58, topClamp + 12, colors.freq, 'f 頻率');
        drawTag(cx + plotWidth - 104, topClamp + 12, colors.speed, 'v 波速');
        drawTag(cx + plotWidth * 0.1 + 8, topClamp + 12, colors.phase, 'φ 相位');
        const wavelengthFraction = (state.speed / state.freq) / SPACE_METERS;
        drawTag(cx + Math.min(wavelengthFraction * plotWidth * 0.42, plotWidth - 110), cy + plotHeight / 2 - 34, colors.speed, wavelengthFraction <= 1 ? 'λ = v/f' : 'λ 超出畫面');
    }

    function draw(now) {
        if (state.width < 2 || state.height < 2) {
            requestAnimationFrame(draw);
            return;
        }
        const timeScale = reduceMotion.matches ? 0 : 0.00022;
        state.time = now * timeScale;
        ctx.clearRect(0, 0, state.width, state.height);
        ctx.fillStyle = '#070b12';
        ctx.fillRect(0, 0, state.width, state.height);

        const pad = Math.max(18, Math.min(46, state.width * 0.045));
        const cx = pad;
        const plotWidth = state.width - pad * 2;
        const cy = state.height * 0.5;
        const plotHeight = state.height - pad * 2;

        drawGrid(cx, cy, plotWidth, plotHeight);
        strokeWave(cx, cy, plotWidth, plotHeight, 1, 1, 0, state.time, 8, colors.ghost, 2);
        drawWavelengthGuide(cx, cy, plotWidth, plotHeight);
        strokeWave(cx, cy, plotWidth, plotHeight, state.amp, state.freq, state.phase, state.time, state.speed, colors.ink, 3);
        drawAmplitudeGuide(cx, cy, plotHeight);
        drawPhaseMarker(cx, cy, plotWidth, plotHeight, state.time);
        drawExtrema(cx, cy, plotWidth, plotHeight, state.time);
        drawLabels(cx, cy, plotWidth, plotHeight);

        requestAnimationFrame(draw);
    }

    [ampInput, freqInput, speedInput, phaseInput].forEach((input) => input.addEventListener('input', syncState));
    window.addEventListener('resize', resize);
    window.addEventListener('load', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    syncState();
    resize();
    requestAnimationFrame(draw);
})();
