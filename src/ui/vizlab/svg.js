/* ═══════════════════════════════════════════════════════════════
   VIZLAB/SVG.JS — P16: Vizual laboratoriya rasmlari (SVG satrlari). Sof modul, DOM siz.
   CSP: skript yo'q, `style` atributi yo'q — rang va chiziqlar faqat CSS sinflari (src/css/vizlab.css),
   geometriya — SVG atributlari. Matn faqat esc() orqali. Bu yerda natija HISOBLANMAYDI: barcha sonlar
   chaqiruvchidan (dvigatel natijasidan) keladi; normal egri chiziq shakli — faqat chizish uchun.
═══════════════════════════════════════════════════════════════ */

const f = v => (Math.round(v * 100) / 100).toString();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SQRT_2PI = Math.sqrt(2 * Math.PI);
/** N(m, s) zichligi — faqat egri chiziqni chizish uchun (m va s dvigateldan). */
export const bell = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * SQRT_2PI);

function bellPath(m, s, lo, hi, X, Y, steps = 96) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const x = lo + (hi - lo) * i / steps;
    d += `${i ? 'L' : 'M'}${f(X(x))} ${f(Y(bell(x, m, s)))}`;
  }
  return d;
}
const bracket = (x1, x2, y, cls) => `<path class="${cls}" d="M${f(x1)} ${y - 6}V${y + 6}M${f(x1)} ${y}H${f(x2)}M${f(x2)} ${y - 6}V${y + 6}"/>`;

/**
 * a) Monte-Karlo: gistogramma (ixtiyoriy, illustrativ), tushayotgan nuqtalar, GUM normal egri chizig'i N(y, u_c),
 *    LPU va MCM 95 % intervallari.
 * @param {object} o  { W, lo, hi, y, uc, yMax, gum:[lo,hi], mcm:[lo,hi]|null, hist?, dots?, title, lblLpu, lblMcm, fmt, esc }
 */
export function mcChartSvg(o) {
  const W = o.W, H = 300, L = 14, R = W - 14, T = 12, B = 196;
  const X = v => L + (clamp(v, o.lo, o.hi) - o.lo) / (o.hi - o.lo) * (R - L);
  const Y = d => B - clamp(d / o.yMax, 0, 1) * (B - T);
  let bars = '';
  if (o.hist && o.hist.n) {
    const bw = (R - L) / o.hist.bins;
    for (let i = 0; i < o.hist.bins; i++) {
      const d = o.hist.density(i);
      if (d > 0) bars += `<rect class="vz-bar" x="${f(L + i * bw + 0.5)}" y="${f(Y(d))}" width="${f(Math.max(bw - 1, 1))}" height="${f(B - Y(d))}"/>`;
    }
  }
  const dots = (o.dots || []).map(p => `<circle class="vz-dot" cx="${f(X(p.v))}" cy="${f(T + p.t * (p.land - T))}" r="2.5"/>`).join('');
  const curve = `<path class="vz-curve" d="${bellPath(o.y, o.uc, o.lo, o.hi, X, Y)}"/>`;
  const tick = (v, anchor) => `<text class="vz-tick" text-anchor="${anchor}" x="${f(X(v))}" y="${B + 16}">${o.esc(o.fmt(v))}</text>`;
  const iv = (pair, y, cls, label) => (pair
    ? `${bracket(X(pair[0]), X(pair[1]), y, cls)}<text class="vz-tick ${cls}-t" x="${L}" y="${y - 10}">${o.esc(label)}</text>`
    + `<text class="vz-tick" text-anchor="end" x="${R}" y="${y - 10}">${o.esc('[' + o.fmt(pair[0]) + '; ' + o.fmt(pair[1]) + ']')}</text>`
    : '');
  return `<svg class="vz-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.esc(o.title)}">`
    + `<line class="vz-axis" x1="${L}" x2="${R}" y1="${B}" y2="${B}"/>`
    + `<line class="vz-center" x1="${f(X(o.y))}" x2="${f(X(o.y))}" y1="${T}" y2="${B}"/>`
    + bars + curve + dots + tick(o.lo, 'start') + tick(o.y, 'middle') + tick(o.hi, 'end')
    + iv(o.gum, 244, 'vz-iv-lpu', o.lblLpu) + iv(o.mcm, 284, 'vz-iv-mcm', o.lblMcm) + '</svg>';
}

/**
 * b) Muvofiqlik: tolerans, qabul va himoya zonalari (decide() chegaralaridan), o'lchangan qiymat ± U va N(y, u).
 * @param {object} o  { W, lo, hi, d (decide natijasi), value, u, U, state, title, fmt, esc }
 */
export function zoneSvg(o) {
  const W = o.W, H = 190, L = 10, R = W - 10, T = 10, B = 128;
  const X = v => L + (clamp(v, o.lo, o.hi) - o.lo) / (o.hi - o.lo) * (R - L);
  const d = o.d, w = Math.abs(d.w);
  const peak = bell(o.value, o.value, o.u);
  const Y = p => B - (p / peak) * (B - T - 8);
  const band = (a, b, cls) => (b > a ? `<rect class="${cls}" x="${f(X(a))}" y="${T}" width="${f(X(b) - X(a))}" height="${B - T}"/>` : '');
  const lim = (v, cls, label) => `<line class="${cls}" x1="${f(X(v))}" x2="${f(X(v))}" y1="${T}" y2="${B + 6}"/><text class="vz-tick" text-anchor="middle" x="${f(X(v))}" y="${B + 20}">${o.esc(label)}</text><text class="vz-tick vz-tick-2" text-anchor="middle" x="${f(X(v))}" y="${B + 36}">${o.esc(o.fmt(v))}</text>`;
  const acc = d.w > 0 ? lim(d.acceptLower, 'vz-lim-a', 'A_L') + lim(d.acceptUpper, 'vz-lim-a', 'A_U') : '';
  return `<svg class="vz-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.esc(o.title)}">`
    + band(o.lo, Math.max(o.lo, d.lower - w), 'vz-z-reject') + band(Math.min(o.hi, d.upper + w), o.hi, 'vz-z-reject')
    + band(Math.max(o.lo, d.lower - w), d.acceptLower, 'vz-z-guard') + band(d.acceptUpper, Math.min(o.hi, d.upper + w), 'vz-z-guard')
    + band(d.acceptLower, d.acceptUpper, 'vz-z-accept')
    + `<path class="vz-curve" d="${bellPath(o.value, o.u, o.lo, o.hi, X, Y)}"/>`
    + lim(d.lower, 'vz-lim-t', 'T_L') + lim(d.upper, 'vz-lim-t', 'T_U') + acc
    + bracket(X(o.value - o.U), X(o.value + o.U), B - 14, 'vz-iv-lpu')
    + `<line class="vz-mark vz-st-${o.state}" x1="${f(X(o.value))}" x2="${f(X(o.value))}" y1="${T}" y2="${B}"/>`
    + `<circle class="vz-mark-dot vz-st-${o.state}" cx="${f(X(o.value))}" cy="${B - 14}" r="5"/>`
    + `<line class="vz-axis" x1="${L}" x2="${R}" y1="${B}" y2="${B}"/></svg>`;
}

/** b) Muvofiqlik ehtimoli o'lchagichi (yarim doira). pc — decide() dan. */
export function gaugeSvg(o) {
  const r = 78, len = Math.PI * r, p = clamp(o.pc, 0, 1);
  const arc = `M22 100A${r} ${r} 0 0 1 178 100`;
  return `<svg class="vz-svg vz-gauge" viewBox="0 0 200 116" role="img" aria-label="${o.esc(o.title)}">`
    + `<path class="vz-gauge-bg" d="${arc}"/>`
    + `<path class="vz-gauge-fg vz-st-${o.state}" d="${arc}" stroke-dasharray="${f(p * len)} ${f(len + 4)}"/>`
    + `<text class="vz-gauge-num" text-anchor="middle" x="100" y="92">${o.esc(o.text)}</text>`
    + `<text class="vz-tick" text-anchor="middle" x="100" y="112">p_c</text></svg>`;
}

/**
 * d) QC kartasi: x o'qi butun ketma-ketlik uzunligiga mahkamlangan (yangi nuqta kelganda eskilar siljimaydi).
 * @param {object} o  { W, total, values, limits:{center,ucl,lcl,uwl,lwl}, flagged, suppressed:Set<number>, title, pointLabel(i), esc }
 */
export function qcSvg(o) {
  const W = o.W, H = 250, L = 44, R = W - 40, T = 12, B = 222;
  const lim = o.limits, span = lim.ucl - lim.lcl;
  const y0 = lim.lcl - span * 0.14, y1 = lim.ucl + span * 0.14;
  const X = i => L + (i + 0.5) * (R - L) / o.total;
  const Y = v => T + (y1 - clamp(v, y0, y1)) * (B - T) / (y1 - y0);
  const hl = (v, cls, label) => `<line class="${cls}" x1="${L}" x2="${R}" y1="${f(Y(v))}" y2="${f(Y(v))}"/><text class="vz-tick" x="${R + 4}" y="${f(Y(v) + 4)}">${o.esc(label)}</text><text class="vz-tick" text-anchor="end" x="${L - 4}" y="${f(Y(v) + 4)}">${o.esc(String(v))}</text>`;
  const s = o.values;
  const path = s.length > 1 ? `<path class="vz-qc-path" d="${s.map((v, i) => `${i ? 'L' : 'M'}${f(X(i))} ${f(Y(v))}`).join('')}"/>` : '';
  const dots = s.map((v, i) => {
    const fired = (o.flagged[i] || []).length > 0, sup = o.suppressed.has(i);
    const cls = fired ? 'vz-qc-flag' : sup ? 'vz-qc-sup' : 'vz-qc-dot';
    const last = i === s.length - 1 ? ' vz-qc-new' : '';
    return `<g class="${cls}${last}"><circle cx="${f(X(i))}" cy="${f(Y(v))}" r="${fired || sup ? 6 : 3.5}"/>`
      + (fired ? `<path d="M${f(X(i) - 3)} ${f(Y(v) - 3)}l6 6m0 -6l-6 6"/>` : '')
      + `<title>${o.esc(o.pointLabel(i))}</title></g>`;
  }).join('');
  const step = Math.max(1, Math.ceil(o.total / (W < 480 ? 7 : 12)));
  let ticks = '';
  for (let i = 0; i < o.total; i++) if ((i % step === 0 && o.total - 1 - i >= step / 2) || i === o.total - 1) ticks += `<text class="vz-tick" text-anchor="middle" x="${f(X(i))}" y="${H - 8}">${i + 1}</text>`;
  return `<svg class="vz-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.esc(o.title)}">`
    + `<rect class="vz-plot" x="${L}" y="${T}" width="${R - L}" height="${B - T}"/>`
    + hl(lim.ucl, 'vz-qc-l3', '+3s') + hl(lim.uwl, 'vz-qc-l2', '+2s') + hl(lim.center, 'vz-qc-cl', 'CL') + hl(lim.lwl, 'vz-qc-l2', '−2s') + hl(lim.lcl, 'vz-qc-l3', '−3s')
    + path + dots + ticks + '</svg>';
}

/**
 * e) Korrelyatsiya: nuqtalar buluti (illustrativ) va 95 % ellips (gaussianRegion().ellipse). Ikkala o'q bir masshtabda.
 * @param {object} o  { points:[x,y][], center:[x,y], half, ellipse:{semiAxes,angle}, title, lblX, lblY, esc }
 */
export function cloudSvg(o) {
  const W = 320, H = 320, L = 30, R = W - 10, T = 10, B = H - 30;
  const [cx, cy] = o.center;
  const X = v => L + (v - (cx - o.half)) / (2 * o.half) * (R - L);
  const Y = v => B - (v - (cy - o.half)) / (2 * o.half) * (B - T);
  const pts = o.points.filter(p => Math.abs(p[0] - cx) < o.half && Math.abs(p[1] - cy) < o.half)
    .map(p => `<circle cx="${f(X(p[0]))}" cy="${f(Y(p[1]))}" r="2"/>`).join('');
  const e = o.ellipse, poly = [];
  for (let i = 0; i < 72; i++) {
    const t = i / 72 * 2 * Math.PI, ex = e.semiAxes[0] * Math.cos(t), ey = e.semiAxes[1] * Math.sin(t);
    poly.push(`${f(X(cx + ex * Math.cos(e.angle) - ey * Math.sin(e.angle)))},${f(Y(cy + ex * Math.sin(e.angle) + ey * Math.cos(e.angle)))}`);
  }
  return `<svg class="vz-svg vz-cloud" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.esc(o.title)}">`
    + `<rect class="vz-plot" x="${L}" y="${T}" width="${R - L}" height="${B - T}"/>`
    + `<line class="vz-center" x1="${f(X(cx))}" x2="${f(X(cx))}" y1="${T}" y2="${B}"/><line class="vz-center" x1="${L}" x2="${R}" y1="${f(Y(cy))}" y2="${f(Y(cy))}"/>`
    + `<g class="vz-cloud-pts">${pts}</g><polygon class="vz-ellipse" points="${poly.join(' ')}"/>`
    + `<text class="vz-tick" text-anchor="middle" x="${(L + R) / 2}" y="${H - 8}">${o.esc(o.lblX)}</text>`
    + `<text class="vz-tick" text-anchor="middle" x="12" y="${(T + B) / 2}" transform="rotate(-90 12 ${(T + B) / 2})">${o.esc(o.lblY)}</text></svg>`;
}

/** f) Ulush chizig'i (0…100 %). Manfiy ulush (korrelyatsiya hadi) — alohida sinf bilan, mutlaq qiymati chiziladi. */
export function shareBarSvg(share, esc, title) {
  const v = clamp(Math.abs(share || 0), 0, 100);
  return `<svg class="vz-share" viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label="${esc(title)}">`
    + `<rect class="vz-share-bg" width="100" height="8" rx="2"/><rect class="${share < 0 ? 'vz-share-neg' : 'vz-share-fg'}" width="${f(v)}" height="8" rx="2"/></svg>`;
}

/* ── c) Chegaraviy holatlar: tushuntirish chizmalari (sxematik — hech narsa hisoblanmagan) ── */
const B0 = 'M10 92C50 92 62 20 90 20S130 92 170 92';                 // simmetrik qo'ng'iroq
const SK = {
  // chiziqli bo'lmagan model: egri chiziq va urinma; chiqish taqsimoti qiyshayadi
  nonlinear: `<path class="vz-sk-axis" d="M14 96H186M14 96V10"/><path class="vz-curve" d="M20 90Q110 86 176 14"/><path class="vz-sk-dash" d="M52 96L160 44"/>`
    + `<path class="vz-sk-ghost" d="M190 30C182 44 168 52 168 60S182 76 190 90"/><path class="vz-sk-hot vz-anim-pulse" d="M190 14C186 30 164 42 164 56S184 74 190 90"/>`,
  // ustun normal bo'lmagan manba: natija to'g'ri burchakliga yaqin, normal egri chiziq mos kelmaydi
  dominant: `<path class="vz-sk-axis" d="M10 92H190"/><path class="vz-sk-dash" d="${B0}" transform="translate(10 0)"/>`
    + `<path class="vz-sk-hot vz-anim-pulse" d="M34 92L46 40H154L166 92"/>`,
  // fizik chegara: Y ≥ 0 — taqsimotning chegaradan narigi qismi mumkin emas
  bound: `<path class="vz-sk-axis" d="M10 92H190"/><path class="vz-curve" d="${B0}" transform="translate(-34 0)"/>`
    + `<path class="vz-sk-wall" d="M40 8V96"/><path class="vz-sk-fill vz-anim-pulse" d="M-24 92C4 92 22 62 40 40V92Z"/><text class="vz-tick" x="46" y="18">0</text>`,
  // kichik ν_eff: t-taqsimotning "dumlari" normalnikidan og'ir
  lownu: `<path class="vz-sk-axis" d="M10 92H190"/><path class="vz-sk-dash" d="M10 92C56 92 70 16 100 16S144 92 190 92"/>`
    + `<path class="vz-sk-hot vz-anim-pulse" d="M10 84C50 80 74 30 100 30S150 80 190 84"/>`,
};
export const SKETCHES = Object.freeze(Object.keys(SK));
export function sketchSvg(kind, esc, title) {
  return `<svg class="vz-svg vz-sketch" viewBox="0 0 200 104" role="img" aria-label="${esc(title)}">${SK[kind] || ''}</svg>`;
}
