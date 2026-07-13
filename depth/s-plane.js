(() => {
    const EPS = 1e-4;

    const COLORS = {
        ink: '#eef4ff',
        panel: '#070b12',
        grid: '#182338',
        axis: '#41516d',
        muted: '#7f8da5',
        zeta: '#70e0c2',
        wn: '#f0c15a',
    };

    const zetaInput = document.getElementById('zeta');
    const zetaValue = document.getElementById('zeta-value');
    const wnInput = document.getElementById('wn');
    const wnValue = document.getElementById('wn-value');

    const splaneCanvas = document.getElementById('splane-canvas');
    const splaneCtx = splaneCanvas.getContext('2d');
    const stepCanvas = document.getElementById('step-canvas');
    const stepCtx = stepCanvas.getContext('2d');

    const splaneState = { width: 0, height: 0, dpr: 1 };
    const stepState = { width: 0, height: 0, dpr: 1 };

    const state = { zeta: 0.3, wn: 2.0 };

    // C7 參數↔畫面連動強調：拉滑桿（或點個性縮圖）時，極點 ✕ 與 y(t) 曲線同拍
    // 脈衝一下，把「這個點決定那條線」的因果感做在畫面上。尊重 reduced-motion。
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let pulse = 0;       // 0..1，rAF 迴圈裡衰減
    let pulseT0 = 0;
    let pulseRaf = null;

    function kickPulse() {
        if (reduceMotion.matches) return;
        pulseT0 = performance.now();
        // 立即用 pulse=1 畫一幀：拉桿當下就看得到「點與線同拍」，不等下一個 rAF
        pulse = 1;
        renderSplane(activeSym);
        renderStep(activeSym);
        if (pulseRaf !== null) return;
        const loop = (now) => {
            pulse = Math.max(0, 1 - (now - pulseT0) / 600);
            renderSplane(activeSym);
            renderStep(activeSym);
            if (pulse > 0) pulseRaf = requestAnimationFrame(loop);
            else pulseRaf = null;
        };
        pulseRaf = requestAnimationFrame(loop);
    }

    // ---------- Part 3：公式符號 <-> 畫面的雙向連動由共用 depth/sym-tooltip.js 驅動 ----------
    // canvas 高亮／滑桿提示透過 window.__nebluxSymHook 接回；tip 文字改由 HTML
    // 的 data-tip／<dd> 供給（見 s-plane.html .symbol-gloss，文字與舊 GLOSS 逐字相同）。
    const controlZeta = document.querySelector('.control-zeta');
    const controlWn = document.querySelector('.control-wn');
    let activeSym = null; // 由 __nebluxSymHook 回報的當前作用中符號（pin > focus > hover）

    // ---------- text helper：每次都明講 baseline/align，不吃殘留狀態 ----------
    function drawText(ctx, str, x, y, color, align, baseline, font) {
        ctx.fillStyle = color;
        ctx.font = font || '12px system-ui, sans-serif';
        ctx.textAlign = align || 'left';
        ctx.textBaseline = baseline || 'alphabetic';
        ctx.fillText(str, x, y);
    }

    // ---------- 分類 + 數學核心（checkpoint #5/#7/#10/#11/#12） ----------
    function regimeOf(zeta) {
        if (zeta < EPS) return 'undamped';
        if (Math.abs(zeta - 1) < EPS) return 'critical'; // #11 ε-guard
        if (zeta < 1) return 'underdamped';
        return 'overdamped';
    }

    function regimeLabel(regime) {
        switch (regime) {
            case 'undamped': return '無阻尼';
            case 'underdamped': return '欠阻尼';
            case 'critical': return '臨界阻尼';
            default: return '過阻尼';
        }
    }

    // y(τ), τ = ωn·t —— 只吃 ζ 一個形狀參數（#10 ωn 不影響形狀）
    function stepResponse(tau, zeta) {
        if (Math.abs(zeta - 1) < EPS) {
            // 臨界阻尼收斂式，checkpoint #6
            return 1 - Math.exp(-tau) * (1 + tau);
        }
        if (zeta < 1) {
            // 欠阻尼／無阻尼：用 φ = arccos ζ（checkpoint #5，不用 arctan）
            const wdNorm = Math.sqrt(Math.max(0, 1 - zeta * zeta)); // never sqrt(negative), #11
            const phi = Math.acos(Math.min(1, Math.max(-1, zeta)));
            return 1 - (Math.exp(-zeta * tau) / wdNorm) * Math.sin(wdNorm * tau + phi);
        }
        // 過阻尼封閉解，checkpoint #7：r1,r2 = ζ∓√(ζ²−1)，r1·r2 = 1
        const disc = Math.sqrt(zeta * zeta - 1); // only for zeta>1, #11
        const r1 = zeta - disc;
        const r2 = zeta + disc;
        return 1 - (r2 * Math.exp(-r1 * tau) - r1 * Math.exp(-r2 * tau)) / (2 * disc);
    }

    // Mp（checkpoint #9），只在 0<=zeta<1 有意義（無阻尼 zeta=0 給 100%）
    function overshootPct(zeta) {
        if (zeta >= 1 - EPS) return 0;
        return 100 * Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta));
    }

    function peakTau(zeta) {
        return Math.PI / Math.sqrt(Math.max(1e-9, 1 - zeta * zeta));
    }

    // halo：Part 3e「s」符號被選取時，極點 ✕ 加一圈光暈（純疊加，不動原本的 ✕ 畫法）
    function drawPoleMark(ctx, x, y, halo) {
        if (pulse > 0) {
            // 連動脈衝：擴散淡出的圓環，強調「這個點」剛剛動了
            ctx.strokeStyle = `rgba(238, 244, 255, ${(0.95 * pulse).toFixed(3)})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(x, y, 9 + (1 - pulse) * 16, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (halo) {
            ctx.strokeStyle = 'rgba(238, 244, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 11, 0, Math.PI * 2);
            ctx.stroke();
        }
        const r = 6; // 臂長 ~12px
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x - r, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.moveTo(x - r, y + r);
        ctx.lineTo(x + r, y - r);
        ctx.stroke();
    }

    // ---------- s-plane：固定資料窗，等比例縮放（equal aspect 必須） ----------
    function splaneLayout() {
        const w = splaneState.width;
        const h = splaneState.height;
        const PAD = 16;
        // Keep equal aspect while leaving room for the farthest overdamped pole.
        // The previous -6.5..1.5 range pushed the imaginary axis to 81% width,
        // clipping the ωn circle and making the plot look visibly skewed.
        const reMin = -6, reMax = 4, imMin = -5, imMax = 5;
        const spanRe = reMax - reMin; // 10
        const spanIm = imMax - imMin; // 10
        const availW = Math.max(1, w - PAD * 2);
        const availH = Math.max(1, h - PAD * 2);
        const scale = Math.min(availW / spanRe, availH / spanIm);
        const boxW = spanRe * scale;
        const boxH = spanIm * scale;
        const offsetX = (w - boxW) / 2;
        const offsetY = (h - boxH) / 2;
        const toPxX = (re) => offsetX + (re - reMin) * scale;
        const toPxY = (im) => offsetY + (imMax - im) * scale;
        return {
            w, h, scale,
            toPxX, toPxY,
            boxLeft: offsetX, boxTop: offsetY,
            boxRight: offsetX + boxW, boxBottom: offsetY + boxH,
            originX: toPxX(0), originY: toPxY(0),
        };
    }

    // highlight：Part 3e 用的作用中符號 id（null＝沒有）。只加亮既有元素，不改幾何/數學。
    function renderSplane(highlight) {
        if (splaneState.width < 2 || splaneState.height < 2) return; // 版面還沒算好就先不畫
        const ctx = splaneCtx;
        const L = splaneLayout();
        const zeta = state.zeta;
        const wn = state.wn;
        const regime = regimeOf(zeta);

        ctx.clearRect(0, 0, splaneState.width, splaneState.height);
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(0, 0, splaneState.width, splaneState.height);

        // 左半平面淡底 + 標籤
        ctx.fillStyle = 'rgba(238, 244, 255, 0.045)';
        ctx.fillRect(L.boxLeft, L.boxTop, L.originX - L.boxLeft, L.boxBottom - L.boxTop);
        drawText(ctx, '左半平面＝穩定', L.boxLeft + 6, L.boxTop + 6, COLORS.muted, 'left', 'top');

        // 軸線
        ctx.strokeStyle = COLORS.axis;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(L.boxLeft, L.originY);
        ctx.lineTo(L.boxRight, L.originY);
        ctx.moveTo(L.originX, L.boxTop);
        ctx.lineTo(L.originX, L.boxBottom);
        ctx.stroke();
        drawText(ctx, 'Re(s)', L.boxRight - 4, L.originY - 10, COLORS.muted, 'right', 'middle');
        drawText(ctx, 'Im(s)', L.originX + 6, L.boxTop + 4, COLORS.muted, 'left', 'top');

        // 半徑 ωn 的淡圓（poles-on-circle 參考）—— ωn 被選取時整圈加亮
        const wnBoost = highlight === 'wn';
        ctx.strokeStyle = wnBoost ? COLORS.wn : 'rgba(240, 193, 90, 0.35)';
        ctx.lineWidth = wnBoost ? 2.5 : 1;
        ctx.beginPath();
        ctx.arc(L.originX, L.originY, wn * L.scale, 0, Math.PI * 2);
        ctx.stroke();

        const sHalo = highlight === 's';

        if (regime === 'overdamped') {
            // 兩個實極點，checkpoint #7 的 r1,r2（正規化），不在圓上、無角度圖可畫
            const disc = Math.sqrt(zeta * zeta - 1);
            const r1 = zeta - disc;
            const r2 = zeta + disc;
            const p1 = L.toPxX(-r1 * wn);
            const p2 = L.toPxX(-r2 * wn);
            drawPoleMark(ctx, p1, L.originY, sHalo);
            drawPoleMark(ctx, p2, L.originY, sHalo);
        } else if (regime === 'critical') {
            // 重極點於 -ωn，畫一個 ✕ + ×2 標籤
            const px = L.toPxX(-wn);
            const py = L.originY;
            drawPoleMark(ctx, px, py, sHalo);
            drawText(ctx, '×2', px + 8, py - 10, COLORS.muted, 'left', 'bottom');
        } else {
            // 無阻尼／欠阻尼：共軛極點對，含徑向線、θ 弧、σ/ω_d 虛線導引
            const sigma = zeta * wn;
            const wd = wn * Math.sqrt(Math.max(0, 1 - zeta * zeta));
            const poleX = L.toPxX(-sigma);
            const poleUpY = L.toPxY(wd);
            const poleDownY = L.toPxY(-wd);

            const zetaBoost = highlight === 'zeta';
            const phiBoost = highlight === 'phi';
            const sigmaBoost = highlight === 'sigma';
            const wdBoost = highlight === 'wd';

            // 徑向線：原點→上方極點（ζ＝強調；φ＝輕度提亮，同一條線兩種符號都指得到它）
            ctx.strokeStyle = zetaBoost ? COLORS.zeta : (phiBoost ? 'rgba(238, 244, 255, 0.8)' : 'rgba(127, 141, 165, 0.5)');
            ctx.lineWidth = zetaBoost ? 2.5 : (phiBoost ? 1.75 : 1);
            ctx.beginPath();
            ctx.moveTo(L.originX, L.originY);
            ctx.lineTo(poleX, poleUpY);
            ctx.stroke();

            // θ 弧：從負實軸掃到徑向線（cosθ=ζ）
            const dx = poleX - L.originX;
            const dy = poleUpY - L.originY;
            const angleEnd = Math.atan2(dy, dx); // 落在 [-π, -π/2]
            const arcR = Math.min(34, Math.max(14, wn * L.scale * 0.4));
            ctx.strokeStyle = zetaBoost ? COLORS.zeta : COLORS.muted;
            ctx.lineWidth = zetaBoost ? 2.5 : 1;
            ctx.beginPath();
            ctx.arc(L.originX, L.originY, arcR, -Math.PI, angleEnd);
            ctx.stroke();
            if (L.w >= 420) {
                const midAngle = (-Math.PI + angleEnd) / 2;
                const lx = L.originX + (arcR + 16) * Math.cos(midAngle);
                const ly = L.originY + (arcR + 16) * Math.sin(midAngle);
                drawText(ctx, 'cos θ = ζ', lx, ly, zetaBoost ? COLORS.zeta : COLORS.muted, 'center', 'middle');
            }

            // 虛線導引：σ（垂直落到實軸）+ ω_d（水平走到虛軸）——各自獨立加亮
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = sigmaBoost ? COLORS.ink : COLORS.muted;
            ctx.lineWidth = sigmaBoost ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(poleX, poleUpY);
            ctx.lineTo(poleX, L.originY);
            ctx.stroke();

            ctx.strokeStyle = wdBoost ? COLORS.ink : COLORS.muted;
            ctx.lineWidth = wdBoost ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(poleX, poleUpY);
            ctx.lineTo(L.originX, poleUpY);
            ctx.stroke();
            ctx.setLineDash([]);

            drawText(ctx, 'σ', poleX + 4, (poleUpY + L.originY) / 2, sigmaBoost ? COLORS.ink : COLORS.muted, 'left', 'middle');
            drawText(ctx, 'ω_d', (poleX + L.originX) / 2, poleUpY - 4, wdBoost ? COLORS.ink : COLORS.muted, 'center', 'bottom');

            drawPoleMark(ctx, poleX, poleUpY, sHalo);
            drawPoleMark(ctx, poleX, poleDownY, sHalo);
        }
    }

    // ---------- step response：固定 τ∈[0,18], y∈[0,2.2] ----------
    function stepLayout() {
        const w = stepState.width;
        const h = stepState.height;
        const padL = Math.max(34, Math.min(56, w * 0.07));
        const padR = Math.max(14, Math.min(28, w * 0.03));
        const padT = Math.max(16, Math.min(30, h * 0.08));
        const padB = Math.max(28, Math.min(44, h * 0.14));
        const pw = Math.max(1, w - padL - padR);
        const ph = Math.max(1, h - padT - padB);
        const TAU_MAX = 18;
        const Y_MAX = 2.2;
        const toPxX = (tau) => padL + (tau / TAU_MAX) * pw;
        const toPxY = (y) => padT + ph - (y / Y_MAX) * ph;
        return { w, h, padL, padR, padT, padB, pw, ph, toPxX, toPxY };
    }

    // highlight：同 renderSplane，只加亮既有元素。
    function renderStep(highlight) {
        if (stepState.width < 2 || stepState.height < 2) return; // 版面還沒算好就先不畫
        const ctx = stepCtx;
        const L = stepLayout();
        const zeta = state.zeta;
        const wn = state.wn;
        const regime = regimeOf(zeta);
        const ticks = [0, 6, 12, 18];

        ctx.clearRect(0, 0, stepState.width, stepState.height);
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(0, 0, stepState.width, stepState.height);

        // 淡格線
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ticks.forEach((t) => {
            const x = L.toPxX(t);
            ctx.moveTo(x, L.toPxY(2.2));
            ctx.lineTo(x, L.toPxY(0));
        });
        ctx.stroke();

        // ±2% 帶（checkpoint #12：不畫 settling-time 標記，只留帶 + 包絡）
        const bandTop = L.toPxY(1.02);
        const bandBottom = L.toPxY(0.98);
        ctx.fillStyle = 'rgba(127, 141, 165, 0.10)';
        ctx.fillRect(L.padL, bandTop, L.pw, bandBottom - bandTop);

        // 極淡的單位步階輸入
        ctx.strokeStyle = 'rgba(238, 244, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(L.toPxX(0), L.toPxY(0));
        ctx.lineTo(L.toPxX(0), L.toPxY(1));
        ctx.lineTo(L.toPxX(18), L.toPxY(1));
        ctx.stroke();

        // 穩態參考虛線 y=1
        ctx.strokeStyle = COLORS.muted;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(L.padL, L.toPxY(1));
        ctx.lineTo(L.padL + L.pw, L.toPxY(1));
        ctx.stroke();
        ctx.setLineDash([]);
        drawText(ctx, '1（穩態）', L.padL + 4, L.toPxY(1) - 4, COLORS.muted, 'left', 'bottom');

        // 包絡線：只在欠阻尼／無阻尼（zeta < 1）畫，避免 1/sqrt(1-zeta^2) 在 zeta->1 爆掉
        // envelope／sigma 被選取時，包絡線加粗加亮（sigma 是「可選」加成，見 spec 3e）
        const envelopeBoost = highlight === 'envelope' || highlight === 'sigma';
        if (zeta < 1 - EPS) {
            const denom = Math.sqrt(1 - zeta * zeta);
            const samples = Math.max(200, Math.floor(L.pw / 2));
            ctx.strokeStyle = envelopeBoost ? 'rgba(112, 224, 194, 0.9)' : 'rgba(112, 224, 194, 0.4)';
            ctx.lineWidth = envelopeBoost ? 2.5 : 1.5;
            ctx.setLineDash([5, 4]);
            [1, -1].forEach((sgn) => {
                ctx.beginPath();
                for (let i = 0; i <= samples; i += 1) {
                    const tau = (18 * i) / samples;
                    const yv = Math.min(2.2, Math.max(0, 1 + (sgn * Math.exp(-zeta * tau)) / denom));
                    const px = L.toPxX(tau);
                    const py = L.toPxY(yv);
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
            });
            ctx.setLineDash([]);
        }

        // 反應曲線 y(τ) —— y 被選取時加粗 + 淡淡發光
        const yBoost = highlight === 'y';
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = yBoost ? 4.5 : 3;
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        if (yBoost) {
            ctx.shadowColor = 'rgba(238, 244, 255, 0.65)';
            ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        const samples = Math.max(360, Math.floor(L.pw));
        for (let i = 0; i <= samples; i += 1) {
            const tau = (18 * i) / samples;
            const yv = Math.min(2.2, Math.max(0, stepResponse(tau, zeta)));
            const px = L.toPxX(tau);
            const py = L.toPxY(yv);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        if (yBoost) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        // 連動脈衝：曲線與極點 ✕ 同拍閃一下（同一條線疊加亮描，不是新形狀）
        if (pulse > 0) {
            ctx.strokeStyle = `rgba(238, 244, 255, ${(0.65 * pulse).toFixed(3)})`;
            ctx.lineWidth = 3.5 + 4 * pulse;
            ctx.beginPath();
            for (let i = 0; i <= samples; i += 1) {
                const tau = (18 * i) / samples;
                const yv = Math.min(2.2, Math.max(0, stepResponse(tau, zeta)));
                const px = L.toPxX(tau);
                const py = L.toPxY(yv);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // φ 被選取時：重描曲線起頭一小段（同一條線加粗，不是新形狀），只在 φ 有意義的欠阻尼／無阻尼範圍
        if (highlight === 'phi' && zeta < 1 - EPS) {
            const tEnd = Math.min(18, 3);
            const segSamples = 60;
            ctx.strokeStyle = COLORS.ink;
            ctx.lineWidth = 5;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let i = 0; i <= segSamples; i += 1) {
                const tau = (tEnd * i) / segSamples;
                const yv = Math.min(2.2, Math.max(0, stepResponse(tau, zeta)));
                const px = L.toPxX(tau);
                const py = L.toPxY(yv);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // 第一個高峰的點 + 即時過衝標籤（只在 zeta<1 且峰落在畫面內）
        // ζ 被選取時：這組讀數（此頁的重點結論）額外加亮成 teal + 放大
        const zetaBoostStep = highlight === 'zeta';
        if (zeta < 1 - EPS) {
            const tp = peakTau(zeta);
            if (tp <= 18) {
                const mp = overshootPct(zeta);
                const px = L.toPxX(tp);
                const py = L.toPxY(Math.min(2.2, 1 + mp / 100));
                ctx.fillStyle = zetaBoostStep ? COLORS.zeta : COLORS.muted;
                ctx.beginPath();
                ctx.arc(px, py, zetaBoostStep ? 6 : 3.5, 0, Math.PI * 2);
                ctx.fill();

                const label = `過衝 ${mp.toFixed(1)}%`;
                const labelFont = '600 16px system-ui, sans-serif';
                const labelColor = zetaBoostStep ? COLORS.zeta : COLORS.ink;
                ctx.font = labelFont;
                const textWidth = ctx.measureText(label).width;
                // 上緣防呆：夾住 labelY 不讓它跑到繪圖區頂端之上。
                // 現況本就安全（過衝≤100% → 峰值 y≤2.0 < Y_MAX 2.2，py 仍有餘裕），
                // 此夾制是守護未來若改 Y_MAX 或放寬 ζ 範圍時標籤不出界。
                const labelY = Math.max(L.padT + 14, py - 6);
                // 手機右邊界防呆：標籤會超出繪圖區右緣時，改畫在點的左邊（靠右對齊）
                if (px + 8 + textWidth > L.padL + L.pw) {
                    drawText(ctx, label, px - 8, labelY, labelColor, 'right', 'alphabetic', labelFont);
                } else {
                    drawText(ctx, label, px + 8, labelY, labelColor, 'left', 'alphabetic', labelFont);
                }
            }
        }

        // regime 名稱 + 無過衝（zeta>=1 時取代高峰標籤）—— 這頁的另一個重點讀數，放大＋白
        const readoutFont = '600 16px system-ui, sans-serif';
        drawText(ctx, regimeLabel(regime), L.padL, 6, COLORS.ink, 'left', 'top', readoutFont);
        if (zeta >= 1 - EPS) {
            drawText(ctx, '無過衝', L.padL, 26, COLORS.ink, 'left', 'top', readoutFont);
        }

        // x 軸刻度：固定 τ，標籤換算成秒 = τ/ωn —— ωn 被選取時提亮
        const wnBoostStep = highlight === 'wn';
        ticks.forEach((t) => {
            const x = L.toPxX(t);
            const seconds = t / wn;
            drawText(ctx, `${seconds.toFixed(1)}s`, x, L.toPxY(0) + 6, wnBoostStep ? COLORS.ink : COLORS.muted, 'center', 'top');
        });

        // 說明小字
        drawText(ctx, '時間軸：τ = ωn·t', L.padL, L.h - 6, COLORS.muted, 'left', 'bottom');
    }

    // ---------- resize（黃金樣本套路：DPR clamp、rect floor、零尺寸防呆、setTransform） ----------
    function resizeCanvas(canvas, ctx, st, onReady) {
        const rect = canvas.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        if (w < 2 || h < 2) return; // 版面還沒算好，交給 ResizeObserver 之後再叫
        st.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
        st.width = w;
        st.height = h;
        canvas.width = Math.round(w * st.dpr);
        canvas.height = Math.round(h * st.dpr);
        ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
        onReady();
    }

    function resizeAll() {
        resizeCanvas(splaneCanvas, splaneCtx, splaneState, () => renderSplane(activeSym));
        resizeCanvas(stepCanvas, stepCtx, stepState, () => renderStep(activeSym));
    }

    // 個性縮圖列：目前 ζ 落在哪種個性，該卡亮框；點卡直接把 ζ 設成該個性的代表值。
    const regimeCards = Array.from(document.querySelectorAll('.regime-card'));

    function syncRegimeCards() {
        const regime = regimeOf(state.zeta);
        regimeCards.forEach((card) => {
            const on = card.dataset.regime === regime;
            card.classList.toggle('is-current', on);
            card.setAttribute('aria-pressed', String(on));
        });
    }

    function syncState() {
        state.zeta = Number(zetaInput.value);
        state.wn = Number(wnInput.value);
        zetaValue.textContent = state.zeta.toFixed(2);
        wnValue.textContent = `${state.wn.toFixed(1)} rad/s`;
        syncRegimeCards();
        renderSplane(activeSym);
        renderStep(activeSym);
    }

    // ---------- Part 3：作用中符號改變時的畫布／滑桿提示連動 ----------
    // 呼叫時機、is-active／aria-pressed／tooltip／sym-explainer 全部交給
    // depth/sym-tooltip.js；這裡只補這頁特有的 canvas 高亮與 is-cued。
    function applySymHighlight(sym) {
        activeSym = sym;
        if (controlZeta) controlZeta.classList.toggle('is-cued', sym === 'zeta');
        if (controlWn) controlWn.classList.toggle('is-cued', sym === 'wn');
        renderSplane(sym);
        renderStep(sym);
    }
    window.__nebluxSymHook = applySymHighlight;

    zetaInput.addEventListener('input', () => { syncState(); kickPulse(); });
    wnInput.addEventListener('input', () => { syncState(); kickPulse(); });
    regimeCards.forEach((card) => {
        card.addEventListener('click', () => {
            zetaInput.value = card.dataset.zeta;
            syncState();
            kickPulse();
        });
    });
    window.addEventListener('resize', resizeAll);
    window.addEventListener('load', resizeAll);
    if (window.ResizeObserver) {
        new ResizeObserver(resizeAll).observe(splaneCanvas);
        new ResizeObserver(resizeAll).observe(stepCanvas);
    }
    resizeAll();
    syncState();
})();
