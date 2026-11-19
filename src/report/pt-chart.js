/* ═══════════════════════════════════════════════════════════════
   PT-CHART.JS — P12: PT tarixi grafigi (vaqt bo'yicha ball; z-oila uchun ±2 / ±3 chiziqlari, E_n uchun ±1). Sof modul:
   satr qaytaradi. CSP: skript yo'q, tashqi resurs yo'q; ranglar — CSS sinflari (qc-* — P11 QC grafigi bilan bir xil).
   Trend qoidalari YO'Q (manba yo'q) — faqat ko'rsatish. Matn faqat esc() orqali.
═══════════════════════════════════════════════════════════════ */
import { PT_LIMITS } from '../engine/pt/index.js';

const f = v => (Math.round(v * 100) / 100).toString();

/**
 * @param {{id:string, date:string, score:number, primary:string, verdict:string}[]} rounds  (bitta oila: z-oila yoki E_n)
 * @param {{esc:Function, family:'z'|'En', title?:string, label?:Function, width?:number, height?:number}} o
 */
export function ptChartSVG(rounds, o) {
  const esc = o.esc, W = o.width || 720, H = o.height || 240;
  const L = 48, R = 40, T = 12, B = 26;
  const pts = (rounds || []).filter(r => Number.isFinite(r.score));
  if (!pts.length) return '';
  const lines = o.family === 'En' ? [[PT_LIMITS.en, 'qc-l3', '+1'], [-PT_LIMITS.en, 'qc-l3', '−1']]
    : [[PT_LIMITS.action, 'qc-l3', '+3'], [PT_LIMITS.warn, 'qc-l2', '+2'], [-PT_LIMITS.warn, 'qc-l2', '−2'], [-PT_LIMITS.action, 'qc-l3', '−3']];
  const lim = Math.max(...lines.map(l => Math.abs(l[0])));
  const hi = Math.max(lim, ...pts.map(p => p.score)), lo = Math.min(-lim, ...pts.map(p => p.score));
  const pad = (hi - lo) * 0.08, y0 = lo - pad, y1 = hi + pad;
  const X = i => L + (pts.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (pts.length - 1));
  const Y = v => T + (y1 - v) * (H - T - B) / (y1 - y0);
  const hl = (v, cls, label) => `<line class="${cls}" x1="${L}" x2="${W - R}" y1="${f(Y(v))}" y2="${f(Y(v))}"/><text class="qc-tick" x="${W - R + 4}" y="${f(Y(v) + 3)}">${esc(label)}</text>`;
  const grid = hl(0, 'qc-cl', '0') + lines.map(l => hl(...l)).join('');
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${f(X(i))} ${f(Y(p.score))}`).join(' ');
  const dots = pts.map((p, i) => {
    const label = `${p.id}${p.date ? ' · ' + p.date : ''}: ${p.primary} = ${Number(p.score.toPrecision(4))}${o.label ? ' — ' + o.label(p.verdict) : ''}`;
    return p.verdict === 'satisfactory'
      ? `<circle class="qc-dot" data-pt-index="${i}" cx="${f(X(i))}" cy="${f(Y(p.score))}" r="3"><title>${esc(label)}</title></circle>`
      : `<g class="qc-flag" data-pt-flag="${esc(p.verdict)}" data-pt-index="${i}"><circle cx="${f(X(i))}" cy="${f(Y(p.score))}" r="6"/><path d="M${f(X(i) - 3)} ${f(Y(p.score) - 3)}l6 6m0 -6l-6 6"/><title>${esc(label)}</title></g>`;
  }).join('');
  const step = Math.max(1, Math.ceil(pts.length / 10));
  const ticks = pts.map((p, i) => (i % step === 0 || i === pts.length - 1 ? `<text class="qc-tick" text-anchor="middle" x="${f(X(i))}" y="${H - 8}">${esc(p.id)}</text>` : '')).join('');
  return `<svg class="qc-chart" data-pt-chart="${o.family === 'En' ? 'En' : 'z'}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || '')}">
    <rect class="qc-bg" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/>${grid}<path class="qc-path" d="${path}"/>${dots}${ticks}</svg>`;
}

/** Raundlarni oilaga ajratish: E_n — alohida grafik (chegara ±1), z / z′ / ζ — bitta (±2 / ±3). */
export function ptChartFamilies(rounds) {
  const rs = rounds || [];
  return { z: rs.filter(r => r.primary !== 'En'), En: rs.filter(r => r.primary === 'En') };
}
