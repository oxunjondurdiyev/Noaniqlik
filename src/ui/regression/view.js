/* ═══════════════════════════════════════════════════════════════
   REGRESSION/VIEW.JS — P08: jadval va kichik SVG grafiklar (HTML satrlari).
   Sof modul: DOM'ga tegmaydi, Node'da test qilinadi. Har qanday qiymat ctx.esc (escHtml) orqali.
   ctx = { t(key), esc(value) }.
═══════════════════════════════════════════════════════════════ */
import { COLUMNS } from './parse.js';

const W = 560, H = 300, M = { l: 62, r: 16, t: 14, b: 40 };

/** Kalibrlash nuqtalari jadvali (x, u(x), y, u(y)) */
export function tableHTML(rows, ctx) {
  const head = COLUMNS.map(c => `<th>${ctx.esc(ctx.t('rg_col_' + c))}</th>`).join('');
  const body = rows.map((r, i) => `<tr data-rg-row="${i}"><td class="rg-idx">${i + 1}</td>${COLUMNS.map(c =>
    `<td><input type="text" inputmode="decimal" class="rg-cell" data-rg-row="${i}" data-rg-col="${c}" value="${ctx.esc(r[c] ?? '')}" autocomplete="off" /></td>`).join('')}
    <td><button type="button" class="btn btn-ghost btn-sm" data-rg-del="${i}" title="${ctx.esc(ctx.t('rg_del_row'))}" aria-label="${ctx.esc(ctx.t('rg_del_row'))}">×</button></td></tr>`).join('');
  return `<table class="data-table rg-table" id="rg-table"><thead><tr><th>#</th>${head}<th></th></tr></thead><tbody>${body}</tbody></table>`;
}

/* ─── SVG yordamchilari ─── */
function niceTicks(lo, hi, n = 5) {
  if (!(hi > lo)) { const d = Math.abs(lo) || 1; lo -= d / 2; hi += d / 2; }
  const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag, step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}
const tickText = v => String(Number(v.toPrecision(6)));
function padRange(lo, hi) {
  const d = (hi - lo) || Math.abs(hi) || 1;
  return [lo - 0.06 * d, hi + 0.06 * d];
}
function frame(xr, yr, ctx, xLabel, yLabel, inner, title, cls) {
  const sx = v => M.l + (v - xr[0]) / (xr[1] - xr[0]) * (W - M.l - M.r);
  const sy = v => H - M.b - (v - yr[0]) / (yr[1] - yr[0]) * (H - M.t - M.b);
  const xt = niceTicks(xr[0], xr[1]).filter(v => v >= xr[0] && v <= xr[1]);
  const yt = niceTicks(yr[0], yr[1]).filter(v => v >= yr[0] && v <= yr[1]);
  const f = v => v.toFixed(1);
  return `<svg class="rg-plot ${cls}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${ctx.esc(title)}" xmlns="http://www.w3.org/2000/svg">
    <title>${ctx.esc(title)}</title>
    ${yt.map(v => `<line class="rg-grid" x1="${M.l}" x2="${W - M.r}" y1="${f(sy(v))}" y2="${f(sy(v))}"/><text class="rg-tick" x="${M.l - 6}" y="${f(sy(v) + 3.5)}" text-anchor="end">${ctx.esc(tickText(v))}</text>`).join('')}
    ${xt.map(v => `<line class="rg-grid" y1="${M.t}" y2="${H - M.b}" x1="${f(sx(v))}" x2="${f(sx(v))}"/><text class="rg-tick" x="${f(sx(v))}" y="${H - M.b + 14}" text-anchor="middle">${ctx.esc(tickText(v))}</text>`).join('')}
    <rect class="rg-frame" x="${M.l}" y="${M.t}" width="${W - M.l - M.r}" height="${H - M.t - M.b}"/>
    <text class="rg-axis" x="${(M.l + W - M.r) / 2}" y="${H - 6}" text-anchor="middle">${ctx.esc(xLabel)}</text>
    <text class="rg-axis" x="12" y="${(M.t + H - M.b) / 2}" text-anchor="middle" transform="rotate(-90 12 ${(M.t + H - M.b) / 2})">${ctx.esc(yLabel)}</text>
    ${inner(sx, sy, f)}
  </svg>`;
}
const label = (name, unit) => (unit && unit !== '1' ? `${name}, ${unit}` : name);
function curveY(r, x) {
  const t = x - r.xRef;
  let s = 0;
  for (let j = r.params.length - 1; j >= 0; j--) s = s * t + r.params[j].value;
  return s;
}

/** Nuqtalar, ±u xatolik chiziqlari, moslangan egri chiziq, teskari va to'g'ri bashorat nuqtalari */
export function fitPlotSVG(r, ctx) {
  const P = r.points;
  const inv = (r.inverse || []).filter(q => !q.error), prd = (r.predictions || []).filter(q => !q.error);
  const xs = [...P.map(p => p.x - (p.ux || 0)), ...P.map(p => p.x + (p.ux || 0)), ...inv.map(q => q.x0), ...prd.map(q => q.x)];
  const xr = padRange(Math.min(...xs), Math.max(...xs));
  const N = 120, curve = [];
  for (let i = 0; i <= N; i++) { const x = xr[0] + (xr[1] - xr[0]) * i / N; curve.push([x, curveY(r, x)]); }
  const ys = [...P.map(p => p.y - (p.uy || 0)), ...P.map(p => p.y + (p.uy || 0)), ...curve.map(c => c[1]), ...inv.map(q => q.y0)];
  const yr = padRange(Math.min(...ys), Math.max(...ys));
  return frame(xr, yr, ctx, label('x', r.units.x), label('y', r.units.y), (sx, sy, f) => `
    <polyline class="rg-curve" fill="none" points="${curve.map(c => `${f(sx(c[0]))},${f(sy(c[1]))}`).join(' ')}"/>
    ${P.map(p => `${p.uy ? `<line class="rg-err" x1="${f(sx(p.x))}" x2="${f(sx(p.x))}" y1="${f(sy(p.y - p.uy))}" y2="${f(sy(p.y + p.uy))}"/>` : ''}${
      p.ux ? `<line class="rg-err" y1="${f(sy(p.y))}" y2="${f(sy(p.y))}" x1="${f(sx(p.x - p.ux))}" x2="${f(sx(p.x + p.ux))}"/>` : ''}<circle class="rg-pt" cx="${f(sx(p.x))}" cy="${f(sy(p.y))}" r="3.2"/>`).join('')}
    ${inv.map(q => `<line class="rg-inv" x1="${M.l}" x2="${f(sx(q.x0))}" y1="${f(sy(q.y0))}" y2="${f(sy(q.y0))}"/><line class="rg-inv" x1="${f(sx(q.x0))}" x2="${f(sx(q.x0))}" y1="${f(sy(q.y0))}" y2="${H - M.b}"/>
      <line class="rg-inv-u" x1="${f(sx(q.x0 - q.U))}" x2="${f(sx(q.x0 + q.U))}" y1="${f(sy(q.y0))}" y2="${f(sy(q.y0))}"/><circle class="rg-inv-pt" cx="${f(sx(q.x0))}" cy="${f(sy(q.y0))}" r="4"/>`).join('')}
    ${prd.map(q => `<line class="rg-inv-u" x1="${f(sx(q.x))}" x2="${f(sx(q.x))}" y1="${f(sy(q.y - q.U))}" y2="${f(sy(q.y + q.U))}"/><rect class="rg-prd-pt" x="${f(sx(q.x) - 3.5)}" y="${f(sy(q.y) - 3.5)}" width="7" height="7"/>`).join('')}`,
  ctx.t('rg_plot_fit'), 'rg-plot-fit');
}

/** Qoldiqlar grafigi: y_i − ŷ_i (x bo'yicha), nol chizig'i, ±u(y_i) chiziqlari */
export function residualPlotSVG(r, ctx) {
  const P = r.points, e = r.residuals;
  const xr = padRange(Math.min(...P.map(p => p.x)), Math.max(...P.map(p => p.x)));
  const lim = Math.max(...e.map((v, i) => Math.abs(v) + (P[i].uy || 0)), 1e-300);
  const yr = [-1.15 * lim, 1.15 * lim];
  return frame(xr, yr, ctx, label('x', r.units.x), ctx.t('rg_col_resid'), (sx, sy, f) => `
    <line class="rg-zero" x1="${M.l}" x2="${W - M.r}" y1="${f(sy(0))}" y2="${f(sy(0))}"/>
    ${P.map((p, i) => `${p.uy ? `<line class="rg-err" x1="${f(sx(p.x))}" x2="${f(sx(p.x))}" y1="${f(sy(e[i] - p.uy))}" y2="${f(sy(e[i] + p.uy))}"/>` : ''}<line class="rg-stem" x1="${f(sx(p.x))}" x2="${f(sx(p.x))}" y1="${f(sy(0))}" y2="${f(sy(e[i]))}"/><circle class="rg-pt" cx="${f(sx(p.x))}" cy="${f(sy(e[i]))}" r="3.2"/>`).join('')}`,
  ctx.t('rg_plot_res'), 'rg-plot-res');
}

export function plotsHTML(r, ctx) {
  return `<div class="rg-plots">
    <figure class="rg-figure">${fitPlotSVG(r, ctx)}<figcaption>${ctx.esc(ctx.t('rg_plot_fit'))}</figcaption></figure>
    <figure class="rg-figure">${residualPlotSVG(r, ctx)}<figcaption>${ctx.esc(ctx.t('rg_plot_res'))}</figcaption></figure>
  </div>`;
}
