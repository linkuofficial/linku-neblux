const TAU = Math.PI * 2;

export function gaussianDensity(x, sigma) {
  return Math.exp(-(x * x) / (2 * sigma * sigma)) / (sigma * Math.sqrt(TAU));
}

export function superpositionProbabilities(phase) {
  const bright = (1 + Math.cos(phase)) / 2;
  return { bright, dark: 1 - bright };
}

export function uncertaintyWidths(localization) {
  const t = Math.max(0, Math.min(1, localization));
  const position = 1.6 - 1.25 * t;
  const momentum = 0.5 / position;
  return { position, momentum, product: position * momentum };
}

export function tunnelingTransmission(width, energy = 0.35, barrier = 1) {
  if (!(width >= 0) || !(energy > 0) || !(barrier > energy)) return Number.NaN;
  const kappa = Math.sqrt(barrier - energy);
  const term = (barrier * barrier * Math.sinh(kappa * width) ** 2) / (4 * energy * (barrier - energy));
  return 1 / (1 + term);
}

export function spinProbabilities(angleDegrees) {
  const half = (angleDegrees * Math.PI) / 360;
  const up = Math.cos(half) ** 2;
  return { up, down: 1 - up };
}

export function singletOutcome(index) {
  let x = ((index + 1) * 0x9e3779b1) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  const left = (x & 1) === 0 ? 'up' : 'down';
  return { left, right: left === 'up' ? 'down' : 'up' };
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(300, Math.round(rect.width));
  const height = Math.max(260, Math.round(rect.height));
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function palette() {
  return {
    bg: '#070b12', ink: '#eef4ff', muted: '#9ba8bd', grid: '#223047',
    cyan: '#9bbcff', violet: '#b79cf0', amber: '#f0c15a', rose: '#ef7f72', green: '#70e0c2',
  };
}

function clear(ctx, width, height) {
  const c = palette();
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0d1420');
  gradient.addColorStop(1, c.bg);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function line(ctx, points, color, width = 2, dash = []) {
  if (!points.length) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, color) {
  ctx.save();
  ctx.font = '600 12px system-ui, "Noto Sans TC", sans-serif';
  const metrics = ctx.measureText(text);
  ctx.fillStyle = 'rgba(10,15,24,.92)';
  ctx.fillRect(x - 5, y - 14, metrics.width + 10, 21);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function axis(ctx, x1, y1, x2, y2, text) {
  const c = palette();
  ctx.save();
  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fillStyle = c.muted;
  ctx.font = '12px system-ui, "Noto Sans TC", sans-serif';
  ctx.fillText(text, x2 - ctx.measureText(text).width, y2 - 8);
  ctx.restore();
}

function seededUniform(index, seed) {
  let x = Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(seed + 3, 0x27d4eb2d);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function gaussianSample(index, sigma, seed = 1) {
  const u1 = Math.max(1e-7, seededUniform(index * 2, seed));
  const u2 = seededUniform(index * 2 + 1, seed);
  return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
}

function watch(canvas, draw) {
  const redraw = () => draw(fitCanvas(canvas));
  if (window.ResizeObserver) new ResizeObserver(redraw).observe(canvas);
  window.addEventListener('resize', redraw);
  redraw();
  return redraw;
}

function initWavefunction(root) {
  const canvas = root.querySelector('canvas');
  const input = root.querySelector('#wave-width');
  const value = root.querySelector('#wave-width-value');
  const result = root.querySelector('[data-result]');
  const draw = ({ ctx, width, height }) => {
    const c = palette();
    clear(ctx, width, height);
    const sigma = Number(input.value);
    const pad = 34;
    const split = Math.round(height * 0.58);
    axis(ctx, pad, split - 8, width - pad, split - 8, '位置 x');
    const curve = [];
    const density = [];
    let maxD = 0;
    for (let i = 0; i <= 220; i += 1) {
      const x = -4 + (8 * i) / 220;
      maxD = Math.max(maxD, gaussianDensity(x, sigma));
    }
    for (let i = 0; i <= 220; i += 1) {
      const x = -4 + (8 * i) / 220;
      const px = pad + (i / 220) * (width - pad * 2);
      const d = gaussianDensity(x, sigma);
      curve.push([px, split - 16 - Math.sqrt(d / maxD) * (split - 76)]);
      density.push([px, split - 16 - (d / maxD) * (split - 76)]);
    }
    line(ctx, curve, c.violet, 2, [6, 5]);
    line(ctx, density, c.cyan, 3);
    label(ctx, '機率密度 |ψ|²', pad + 8, 30, c.cyan);
    label(ctx, '波函數幅度 ψ', width - 142, 54, c.violet);

    const floor = height - 28;
    ctx.fillStyle = c.muted;
    ctx.font = '12px system-ui, "Noto Sans TC", sans-serif';
    ctx.fillText('80 次位置測量', pad, split + 25);
    for (let i = 0; i < 80; i += 1) {
      const sample = Math.max(-4, Math.min(4, gaussianSample(i, sigma, Math.round(sigma * 100))));
      const x = pad + ((sample + 4) / 8) * (width - pad * 2);
      const row = i % 5;
      ctx.beginPath();
      ctx.arc(x, floor - row * 12, 3, 0, TAU);
      ctx.fillStyle = i % 3 === 0 ? c.cyan : 'rgba(238,244,255,.72)';
      ctx.fill();
    }
  };
  const redraw = watch(canvas, draw);
  input.addEventListener('input', () => {
    const sigma = Number(input.value);
    value.textContent = sigma < 0.75 ? '集中' : sigma > 1.35 ? '分散' : '中等';
    result.textContent = sigma < 0.75
      ? '波函數壓窄後，重複測量的落點也集中；它仍沒有指定下一顆一定落在哪裡。'
      : sigma > 1.35
        ? '波函數展寬後，可能被測得的位置也散開；分布能預測群體，不給單次確定軌跡。'
        : '改變波函數的寬度，觀察 80 次測量如何跟著形成新的位置分布。';
    redraw();
  });
  input.dispatchEvent(new Event('input'));
}

function initSuperposition(root) {
  const canvas = root.querySelector('canvas');
  const input = root.querySelector('#relative-phase');
  const value = root.querySelector('#relative-phase-value');
  const result = root.querySelector('[data-result]');
  const draw = ({ ctx, width, height }) => {
    const c = palette();
    clear(ctx, width, height);
    const phase = Number(input.value);
    const p = superpositionProbabilities(phase);
    const cx = width * 0.48;
    const sourceX = 42;
    const topY = height * 0.28;
    const bottomY = height * 0.72;
    line(ctx, [[sourceX, height / 2], [width * 0.22, height / 2], [cx, topY], [width * 0.68, height / 2]], c.violet, 3);
    line(ctx, [[width * 0.22, height / 2], [cx, bottomY], [width * 0.68, height / 2]], c.cyan, 3);
    ctx.fillStyle = c.ink;
    ctx.beginPath(); ctx.arc(sourceX, height / 2, 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(width * 0.68, height / 2, 18, 0, TAU); ctx.stroke();
    label(ctx, '可能路徑 1', cx - 42, topY - 12, c.violet);
    label(ctx, '可能路徑 2', cx - 42, bottomY + 24, c.cyan);
    const barX = width * 0.78;
    const barW = Math.max(34, width * 0.07);
    const maxH = height * 0.52;
    const base = height * 0.78;
    ctx.fillStyle = 'rgba(170,199,226,.12)';
    ctx.fillRect(barX, base - maxH, barW, maxH);
    ctx.fillRect(barX + barW + 24, base - maxH, barW, maxH);
    ctx.fillStyle = c.green; ctx.fillRect(barX, base - maxH * p.bright, barW, maxH * p.bright);
    ctx.fillStyle = c.rose; ctx.fillRect(barX + barW + 24, base - maxH * p.dark, barW, maxH * p.dark);
    label(ctx, `亮口 ${Math.round(p.bright * 100)}%`, barX - 4, base + 25, c.green);
    label(ctx, `暗口 ${Math.round(p.dark * 100)}%`, barX + barW + 20, base + 25, c.rose);
  };
  const redraw = watch(canvas, draw);
  input.addEventListener('input', () => {
    const phase = Number(input.value);
    const p = superpositionProbabilities(phase);
    value.textContent = `${Math.round((phase / Math.PI) * 100) / 100}π`;
    result.textContent = `兩條可能路徑都存在，但重新合併時，亮口 ${Math.round(p.bright * 100)}%、暗口 ${Math.round(p.dark * 100)}%。振幅可以相長，也可以相消。`;
    redraw();
  });
  input.dispatchEvent(new Event('input'));
}

function drawDistribution(ctx, box, sigma, color, title) {
  const c = palette();
  const { x, y, width, height } = box;
  ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = c.muted; ctx.font = '12px system-ui, "Noto Sans TC", sans-serif'; ctx.fillText(title, x + 10, y + 20);
  const points = [];
  const max = gaussianDensity(0, sigma);
  for (let i = 0; i <= 150; i += 1) {
    const q = -3 + (6 * i) / 150;
    const d = gaussianDensity(q, sigma);
    points.push([x + 12 + (i / 150) * (width - 24), y + height - 18 - (d / max) * (height - 54)]);
  }
  line(ctx, points, color, 3);
}

function initUncertainty(root) {
  const canvas = root.querySelector('canvas');
  const input = root.querySelector('#localization');
  const value = root.querySelector('#localization-value');
  const result = root.querySelector('[data-result]');
  const draw = ({ ctx, width, height }) => {
    const c = palette();
    clear(ctx, width, height);
    const values = uncertaintyWidths(Number(input.value));
    const gap = width < 620 ? 18 : 34;
    if (width < 620) {
      drawDistribution(ctx, { x: 24, y: 22, width: width - 48, height: (height - 66) / 2 }, values.position, c.cyan, '位置分布 Δx');
      drawDistribution(ctx, { x: 24, y: 44 + (height - 66) / 2, width: width - 48, height: (height - 66) / 2 }, values.momentum, c.amber, '動量分布 Δp');
    } else {
      const w = (width - 48 - gap) / 2;
      drawDistribution(ctx, { x: 24, y: 34, width: w, height: height - 68 }, values.position, c.cyan, '位置分布 Δx');
      drawDistribution(ctx, { x: 24 + w + gap, y: 34, width: w, height: height - 68 }, values.momentum, c.amber, '動量分布 Δp');
    }
  };
  const redraw = watch(canvas, draw);
  input.addEventListener('input', () => {
    const values = uncertaintyWidths(Number(input.value));
    value.textContent = Number(input.value) < 0.34 ? '鬆散' : Number(input.value) > 0.66 ? '精準定位' : '中等';
    result.textContent = `位置寬度 Δx=${values.position.toFixed(2)}，動量寬度 Δp=${values.momentum.toFixed(2)}；這個高斯範例始終維持 ΔxΔp=${values.product.toFixed(2)}ℏ。`;
    redraw();
  });
  input.dispatchEvent(new Event('input'));
}

function initTunneling(root) {
  const canvas = root.querySelector('canvas');
  const input = root.querySelector('#barrier-width');
  const value = root.querySelector('#barrier-width-value');
  const result = root.querySelector('[data-result]');
  const draw = ({ ctx, width, height }) => {
    const c = palette();
    clear(ctx, width, height);
    const a = Number(input.value);
    const transmission = tunnelingTransmission(a);
    const base = height * 0.72;
    const barrierX = width * 0.46;
    const barrierW = Math.max(18, (a / 4) * width * 0.28);
    ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(28, base); ctx.lineTo(width - 28, base); ctx.stroke();
    ctx.fillStyle = 'rgba(255,198,109,.22)'; ctx.fillRect(barrierX, height * 0.2, barrierW, base - height * 0.2);
    ctx.strokeStyle = c.amber; ctx.lineWidth = 2; ctx.strokeRect(barrierX, height * 0.2, barrierW, base - height * 0.2);
    label(ctx, `勢壘寬度 ${a.toFixed(1)}`, barrierX, height * 0.16, c.amber);
    label(ctx, '固定能量 E', 34, base - 14, c.cyan);
    const total = 40;
    const passed = Math.round(total * transmission);
    for (let i = 0; i < total; i += 1) {
      const isPassed = i < passed;
      const groupIndex = isPassed ? i : i - passed;
      const groupCount = isPassed ? Math.max(1, passed) : Math.max(1, total - passed);
      const x = isPassed
        ? barrierX + barrierW + 24 + seededUniform(groupIndex, 5) * Math.max(10, width - barrierX - barrierW - 58)
        : 32 + seededUniform(groupIndex, 7) * Math.max(10, barrierX - 66);
      const y = base + 18 + (groupIndex % 4) * 13 + seededUniform(groupIndex, 9) * 3;
      ctx.fillStyle = isPassed ? c.green : 'rgba(238,244,255,.45)';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    }
    label(ctx, `穿透約 ${Math.round(transmission * 100)}%`, Math.min(width - 126, barrierX + barrierW + 18), base - 14, c.green);
  };
  const redraw = watch(canvas, draw);
  input.addEventListener('input', () => {
    const a = Number(input.value);
    const transmission = tunnelingTransmission(a);
    value.textContent = `${a.toFixed(1)}（相對單位）`;
    result.textContent = `勢壘加厚後，穿透率降到約 ${Math.round(transmission * 100)}%。它快速變小，但在有限寬度下不是突然被規則切成零。`;
    redraw();
  });
  input.dispatchEvent(new Event('input'));
}

function initSpin(root) {
  const canvas = root.querySelector('canvas');
  const input = root.querySelector('#magnet-angle');
  const value = root.querySelector('#magnet-angle-value');
  const result = root.querySelector('[data-result]');
  const draw = ({ ctx, width, height }) => {
    const c = palette();
    clear(ctx, width, height);
    const angle = Number(input.value);
    const p = spinProbabilities(angle);
    const sourceX = 40;
    const magnetX = width * 0.36;
    const screenX = width * 0.78;
    const cy = height / 2;
    ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(sourceX, cy); ctx.lineTo(magnetX - 28, cy); ctx.stroke();
    ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(sourceX, cy, 6, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(magnetX, cy); ctx.rotate((angle * Math.PI) / 180);
    ctx.fillStyle = 'rgba(255,143,179,.35)'; ctx.fillRect(-24, -62, 48, 52);
    ctx.fillStyle = 'rgba(94,231,242,.28)'; ctx.fillRect(-24, 10, 48, 52);
    ctx.fillStyle = c.rose; ctx.font = '700 14px system-ui, sans-serif'; ctx.fillText('N', -5, -29);
    ctx.fillStyle = c.cyan; ctx.fillText('S', -5, 44); ctx.restore();
    line(ctx, [[magnetX + 28, cy], [screenX, cy - height * 0.22]], c.rose, 2);
    line(ctx, [[magnetX + 28, cy], [screenX, cy + height * 0.22]], c.cyan, 2);
    const maxR = 28;
    ctx.fillStyle = c.rose; ctx.beginPath(); ctx.arc(screenX, cy - height * 0.22, 5 + maxR * Math.sqrt(p.up), 0, TAU); ctx.fill();
    ctx.fillStyle = c.cyan; ctx.beginPath(); ctx.arc(screenX, cy + height * 0.22, 5 + maxR * Math.sqrt(p.down), 0, TAU); ctx.fill();
    label(ctx, `上 +ℏ/2　${Math.round(p.up * 100)}%`, Math.min(width - 150, screenX + 36), cy - height * 0.22 + 4, c.rose);
    label(ctx, `下 −ℏ/2　${Math.round(p.down * 100)}%`, Math.min(width - 150, screenX + 36), cy + height * 0.22 + 4, c.cyan);
  };
  const redraw = watch(canvas, draw);
  input.addEventListener('input', () => {
    const angle = Number(input.value);
    const p = spinProbabilities(angle);
    value.textContent = `${angle}°`;
    result.textContent = `測量方向旋轉到 ${angle}°：上束約 ${Math.round(p.up * 100)}%、下束約 ${Math.round(p.down * 100)}%。比例連續變，但每顆仍只落在兩個離散出口。`;
    redraw();
  });
  input.dispatchEvent(new Event('input'));
}

function initEntanglement(root) {
  const canvas = root.querySelector('canvas');
  const button = root.querySelector('#measure-pair');
  const value = root.querySelector('#pair-count');
  const result = root.querySelector('[data-result]');
  let count = 6;
  const history = Array.from({ length: count }, (_, i) => singletOutcome(i));
  const draw = ({ ctx, width, height }) => {
    const c = palette();
    clear(ctx, width, height);
    const shown = history.slice(-10);
    const center = width / 2;
    ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(center, 24); ctx.lineTo(center, height - 26); ctx.stroke();
    label(ctx, '左邊', 26, 30, c.violet);
    label(ctx, '右邊', width - 72, 30, c.cyan);
    const rowGap = Math.min(30, (height - 70) / Math.max(1, shown.length));
    shown.forEach((pair, i) => {
      const y = 60 + i * rowGap;
      const leftUp = pair.left === 'up';
      const leftX = center - Math.min(150, width * 0.25);
      const rightX = center + Math.min(150, width * 0.25);
      ctx.strokeStyle = 'rgba(170,199,226,.22)'; ctx.beginPath(); ctx.moveTo(leftX + 14, y); ctx.lineTo(rightX - 14, y); ctx.stroke();
      ctx.fillStyle = leftUp ? c.rose : c.cyan; ctx.beginPath(); ctx.arc(leftX, y, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = leftUp ? c.cyan : c.rose; ctx.beginPath(); ctx.arc(rightX, y, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = c.ink; ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(leftUp ? '↑' : '↓', leftX - 4, y + 4);
      ctx.fillText(leftUp ? '↓' : '↑', rightX - 4, y + 4);
      ctx.fillStyle = c.muted; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(`#${count - shown.length + i + 1}`, center - 9, y + 4);
    });
  };
  const redraw = watch(canvas, draw);
  const sync = () => {
    const leftUp = history.filter((pair) => pair.left === 'up').length;
    value.textContent = `${count} 對`;
    result.textContent = `左邊向上 ${leftUp} 次、向下 ${count - leftUp} 次；單看左邊沒有固定答案，但 ${count} 對全部呈現左右相反。`;
    redraw();
  };
  button.addEventListener('click', () => {
    history.push(singletOutcome(count));
    count += 1;
    sync();
  });
  sync();
}

const initializers = {
  wavefunction: initWavefunction,
  superposition: initSuperposition,
  uncertainty: initUncertainty,
  tunneling: initTunneling,
  spin: initSpin,
  entanglement: initEntanglement,
};

export function initQuantumDepth(root = document.querySelector('[data-quantum-depth]')) {
  if (!root) return false;
  const id = root.dataset.quantumDepth;
  const initialize = initializers[id];
  if (!initialize) return false;
  initialize(root);
  root.dataset.ready = 'true';
  return true;
}

if (typeof document !== 'undefined') {
  const boot = () => initQuantumDepth();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
