/* ═══════════════════════════════════════════════════════════════
   REPORT/ELLIPSE.JS — ikki chiqish uchun qamrov sohasi grafigi (SVG satri). Sof modul, DOM siz (P07).
   Ref: JCGM 102:2011 §6.5.2.3 — a) ellips (η − y)ᵀU_y⁻¹(η − y) = k_p² (Eq. 16); b) to'rtburchak y_j ± k_q·u(y_j);
        Figure 3 (22-bet) ko'rinishida. CSP: faqat atributlar (inline skript / hodisa yo'q); matn escape qilinadi.
═══════════════════════════════════════════════════════════════ */

const num = v => (Math.round(v * 100) / 100).toFixed(2);

/**
 * @param {object} o
 * @param {number[]} o.y                  markaz (y1, y2)
 * @param {{semiAxes:number[], angle:number}} [o.ellipse]   GUM ellipsi (gaussianRegion().ellipse)
 * @param {number[][]} [o.rectangle]      [[lo1, hi1], [lo2, hi2]]
 * @param {{semiAxes:number[], angle:number}} [o.ellipseMc] MCM ellipsi (ixtiyoriy, uzuq chiziq)
 * @param {string[]} o.labels             o'q yozuvlari (belgi va birlik) — escape qilinadi
 * @param {(s:string)=>string} o.esc
 * @param {(v:number)=>string} [o.fmt]    o'q qiymatlari formati
 * @returns {string} SVG
 */
export function ellipseSvg(o) {
  const W = 360, H = 300, L = 56, R = 14, T = 12, B = 40;
  const esc = o.esc, fmt = o.fmt || (v => String(Number(v.toPrecision(4))));
  const [cx, cy] = o.y;
  // chegaralar: ellips(lar) va to'rtburchakni qamraydigan quti
  let hx = 0, hy = 0;
  for (const e of [o.ellipse, o.ellipseMc]) {
    if (!e) continue;
    const [a, b] = e.semiAxes, c = Math.cos(e.angle), s = Math.sin(e.angle);
    hx = Math.max(hx, Math.sqrt(a * a * c * c + b * b * s * s));
    hy = Math.max(hy, Math.sqrt(a * a * s * s + b * b * c * c));
  }
  if (o.rectangle) { hx = Math.max(hx, (o.rectangle[0][1] - o.rectangle[0][0]) / 2); hy = Math.max(hy, (o.rectangle[1][1] - o.rectangle[1][0]) / 2); }
  if (!(hx > 0) || !(hy > 0) || !isFinite(hx) || !isFinite(hy)) return '';
  hx *= 1.12; hy *= 1.12;
  const sx = (W - L - R) / (2 * hx), sy = (H - T - B) / (2 * hy);
  const X = v => L + (v - (cx - hx)) * sx, Y = v => T + ((cy + hy) - v) * sy;
  const ell = (e, cls, dash) => {
    const [a, b] = e.semiAxes;
    // har xil masshtabli o'qlarda ellips nuqtalar bilan chiziladi (aylantirish + cho'zish)
    const pts = [];
    for (let i = 0; i <= 72; i++) {
      const t = i / 72 * 2 * Math.PI, ex = a * Math.cos(t), ey = b * Math.sin(t);
      const px = cx + ex * Math.cos(e.angle) - ey * Math.sin(e.angle), py = cy + ex * Math.sin(e.angle) + ey * Math.cos(e.angle);
      pts.push(`${num(X(px))},${num(Y(py))}`);
    }
    return `<polygon class="${cls}" points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="1.5"${dash ? ' stroke-dasharray="5 4"' : ''} />`;
  };
  const rect = o.rectangle
    ? `<rect class="region-rect" x="${num(X(o.rectangle[0][0]))}" y="${num(Y(o.rectangle[1][1]))}" width="${num((o.rectangle[0][1] - o.rectangle[0][0]) * sx)}" height="${num((o.rectangle[1][1] - o.rectangle[1][0]) * sy)}" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" />`
    : '';
  const tick = (v, axis) => (axis === 'x'
    ? `<line x1="${num(X(v))}" y1="${H - B}" x2="${num(X(v))}" y2="${H - B + 4}" stroke="currentColor" /><text x="${num(X(v))}" y="${H - B + 16}" font-size="10" text-anchor="middle" fill="currentColor">${esc(fmt(v))}</text>`
    : `<line x1="${L - 4}" y1="${num(Y(v))}" x2="${L}" y2="${num(Y(v))}" stroke="currentColor" /><text x="${L - 6}" y="${num(Y(v) + 3)}" font-size="10" text-anchor="end" fill="currentColor">${esc(fmt(v))}</text>`);
  const hx0 = hx / 1.12, hy0 = hy / 1.12;
  return `<svg class="region-plot" data-region-plot="1" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="none" stroke="currentColor" stroke-opacity="0.35" />` +
    [cx - hx0, cx, cx + hx0].map(v => tick(v, 'x')).join('') + [cy - hy0, cy, cy + hy0].map(v => tick(v, 'y')).join('') +
    rect + (o.ellipse ? ell(o.ellipse, 'region-ellipse', false) : '') + (o.ellipseMc ? ell(o.ellipseMc, 'region-ellipse-mc', true) : '') +
    `<circle cx="${num(X(cx))}" cy="${num(Y(cy))}" r="2.5" fill="currentColor" />` +
    `<text x="${num((L + W - R) / 2)}" y="${H - 6}" font-size="11" text-anchor="middle" fill="currentColor">${esc(o.labels[0])}</text>` +
    `<text x="12" y="${num((T + H - B) / 2)}" font-size="11" text-anchor="middle" fill="currentColor" transform="rotate(-90 12 ${num((T + H - B) / 2)})">${esc(o.labels[1])}</text>` +
    '</svg>';
}
