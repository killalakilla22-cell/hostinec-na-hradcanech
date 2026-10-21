// Dependency-free inline SVG charts (single series): line with crosshair tooltip, bars with per-bar tooltip.
import { escapeHtml } from './ui.js';

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || step0;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

/** Responsive chart: re-renders on container resize. draw(width) returns SVG string. */
function responsive(container, draw, bindHover) {
  const render = () => {
    const w = Math.max(260, Math.floor(container.clientWidth));
    container.innerHTML = draw(w);
    bindHover?.(container, w);
  };
  render();
  let ro = null;
  if ('ResizeObserver' in window) {
    let last = container.clientWidth;
    ro = new ResizeObserver(() => {
      if (Math.abs(container.clientWidth - last) > 4) { last = container.clientWidth; render(); }
    });
    ro.observe(container);
  }
  return () => ro?.disconnect();
}

function tooltipEl(container) {
  let tip = container.querySelector('.chart-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    container.append(tip);
  }
  return tip;
}

/**
 * points: [{x: label string, y: number, tip: string}] in chronological order.
 */
export function lineChart(container, points, { height = 220, unit = '', yLabel = '' } = {}) {
  const pad = { t: 16, r: 16, b: 28, l: 40 };
  let geo = null;
  const draw = (W) => {
    const H = height;
    const ys = points.map((p) => p.y);
    const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
    const yMin = ticks[0], yMax = ticks[ticks.length - 1];
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const xAt = (i) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
    const yAt = (v) => pad.t + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;
    geo = { xAt, yAt, pad, H };
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join('');
    const area = `${path}L${xAt(points.length - 1).toFixed(1)},${pad.t + ih}L${xAt(0).toFixed(1)},${pad.t + ih}Z`;
    const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(iw / 70))));
    const lastI = points.length - 1;
    return `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(yLabel)}">
      <defs><linearGradient id="lc-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--chart-1)" stop-opacity=".22"/><stop offset="1" stop-color="var(--chart-1)" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map((t) => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${yAt(t)}" y2="${yAt(t)}"/><text class="axis" x="${pad.l - 8}" y="${yAt(t) + 4}" text-anchor="end">${escapeHtml(String(+t.toFixed(1)))}</text>`).join('')}
      ${points.map((p, i) => (i % labelEvery === 0 || i === lastI) && !(i !== lastI && lastI - i < labelEvery / 2)
        ? `<text class="axis" x="${xAt(i)}" y="${H - 8}" text-anchor="${i === 0 && points.length > 1 ? 'start' : i === lastI && points.length > 1 ? 'end' : 'middle'}">${escapeHtml(p.x)}</text>` : '').join('')}
      <path d="${area}" fill="url(#lc-grad)"/>
      <path d="${path}" class="line"/>
      ${points.map((p, i) => `<circle class="pt${i === lastI ? ' pt-last' : ''}" cx="${xAt(i)}" cy="${yAt(p.y)}" r="${i === lastI ? 5 : 3.5}"/>`).join('')}
      <text class="direct-label" x="${Math.min(xAt(lastI), W - pad.r)}" y="${yAt(points[lastI].y) - 12}" text-anchor="${points.length > 1 ? 'end' : 'middle'}">${escapeHtml(`${points[lastI].y}${unit}`)}</text>
      <line class="crosshair" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + ih}" visibility="hidden"/>
      <rect class="hit" x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="transparent"/>
    </svg>`;
  };
  const bind = (c, W) => {
    const svg = c.querySelector('svg');
    const tip = tooltipEl(c);
    const cross = svg.querySelector('.crosshair');
    const move = (clientX) => {
      const r = svg.getBoundingClientRect();
      const x = clientX - r.left;
      let best = 0, bd = Infinity;
      points.forEach((_, i) => { const d = Math.abs(geo.xAt(i) - x); if (d < bd) { bd = d; best = i; } });
      const px = geo.xAt(best), py = geo.yAt(points[best].y);
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.innerHTML = points[best].tip;
      tip.style.left = `${Math.min(Math.max(px, 60), W - 60)}px`;
      tip.style.top = `${py - 12}px`;
    };
    const hide = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); };
    svg.addEventListener('pointermove', (e) => move(e.clientX));
    svg.addEventListener('pointerdown', (e) => move(e.clientX));
    svg.addEventListener('pointerleave', hide);
  };
  return responsive(container, draw, bind);
}

/** bars: [{x: label, y: number, tip: string, highlight?: bool}] */
export function barChart(container, bars, { height = 200, yLabel = '' } = {}) {
  const pad = { t: 18, r: 8, b: 28, l: 28 };
  let geo = null;
  const draw = (W) => {
    const H = height;
    const max = Math.max(1, ...bars.map((b) => b.y));
    const ticks = niceTicks(0, max, Math.min(4, max)).filter((t) => Number.isInteger(t));
    const yMax = ticks[ticks.length - 1] || max;
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const slot = iw / bars.length;
    const bw = Math.max(6, Math.min(36, slot - 6));
    const yAt = (v) => pad.t + ih - (v / yMax) * ih;
    geo = { slot, pad };
    const labelEvery = Math.max(1, Math.ceil(bars.length / Math.max(2, Math.floor(iw / 44))));
    return `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(yLabel)}">
      ${ticks.map((t) => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${yAt(t)}" y2="${yAt(t)}"/><text class="axis" x="${pad.l - 6}" y="${yAt(t) + 4}" text-anchor="end">${t}</text>`).join('')}
      ${bars.map((b, i) => {
        const x = pad.l + i * slot + (slot - bw) / 2;
        const y = yAt(b.y);
        const h = pad.t + ih - y;
        const r = Math.min(4, bw / 2, h);
        const d = h <= 0 ? '' : `M${x},${pad.t + ih}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${pad.t + ih}Z`;
        return `${d ? `<path class="bar${b.highlight ? ' bar-hi' : ''}" data-i="${i}" d="${d}"/>` : ''}
          ${b.y > 0 && bw >= 14 ? `<text class="bar-val" x="${x + bw / 2}" y="${y - 5}" text-anchor="middle">${b.y}</text>` : ''}
          ${(i % labelEvery === 0 && (i === bars.length - 1 || bars.length - 1 - i >= labelEvery)) || i === bars.length - 1 ? `<text class="axis" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${escapeHtml(b.x)}</text>` : ''}`;
      }).join('')}
      <line class="baseline" x1="${pad.l}" x2="${W - pad.r}" y1="${pad.t + ih}" y2="${pad.t + ih}"/>
      <rect class="hit" x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="transparent"/>
    </svg>`;
  };
  const bind = (c, W) => {
    const svg = c.querySelector('svg');
    const tip = tooltipEl(c);
    const move = (clientX) => {
      const r = svg.getBoundingClientRect();
      const i = Math.min(bars.length - 1, Math.max(0, Math.floor((clientX - r.left - geo.pad.l) / geo.slot)));
      svg.querySelectorAll('.bar').forEach((b) => b.classList.toggle('bar-hover', Number(b.dataset.i) === i));
      tip.hidden = false;
      tip.innerHTML = bars[i].tip;
      const cx = geo.pad.l + i * geo.slot + geo.slot / 2;
      tip.style.left = `${Math.min(Math.max(cx, 60), W - 60)}px`;
      tip.style.top = `${geo.pad.t}px`;
    };
    svg.addEventListener('pointermove', (e) => move(e.clientX));
    svg.addEventListener('pointerdown', (e) => move(e.clientX));
    svg.addEventListener('pointerleave', () => { tip.hidden = true; svg.querySelectorAll('.bar-hover').forEach((b) => b.classList.remove('bar-hover')); });
  };
  return responsive(container, draw, bind);
}
