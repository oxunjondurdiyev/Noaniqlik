/* ═══════════════════════════════════════════════════════════════
   LAB/CHART.JS — P11: QC kartasi SVG grafigi (Shewhart; ±2s, ±3s chegaralari; buzilgan nuqtalar belgilanadi).
   Sof modul: satr qaytaradi. CSP: skript yo'q, tashqi resurs yo'q; rang va chiziqlar — CSS sinflari (components.css).
   Matn faqat esc() orqali.
═══════════════════════════════════════════════════════════════ */

const f = v => (Math.round(v * 100) / 100).toString();

/**
 * @param {{series:number[], limits:{center,ucl,lcl,uwl,lwl}, flagged?:Object<number,string[]>, labels?:string[]}} m
 * @param {{esc:Function, title?:string, width?:number, height?:number, ruleLabel?:Function}} o
 */
export function qcChartSVG(m, o) {
  const esc = o.esc, W = o.width || 720, H = o.height || 260;
  const L = 56, R = 46, T = 14, B = 26;
  const s = m.series || [], lim = m.limits, flagged = m.flagged || {};
  if (!s.length || !lim) return '';
  const lo = Math.min(lim.lcl, ...s), hi = Math.max(lim.ucl, ...s);
  const pad = (hi - lo || 1) * 0.08, y0 = lo - pad, y1 = hi + pad;
  const X = i => L + (s.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (s.length - 1));
  const Y = v => T + (y1 - v) * (H - T - B) / (y1 - y0);
  const hline = (v, cls, label) => `<line class="${cls}" x1="${L}" x2="${W - R}" y1="${f(Y(v))}" y2="${f(Y(v))}"/><text class="qc-tick" x="${W - R + 4}" y="${f(Y(v) + 3)}">${esc(label)}</text><text class="qc-tick" text-anchor="end" x="${L - 4}" y="${f(Y(v) + 3)}">${esc(String(Number(v.toPrecision(5))))}</text>`;
  const lines = hline(lim.ucl, 'qc-l3', '+3s') + hline(lim.uwl, 'qc-l2', '+2s') + hline(lim.center, 'qc-cl', 'CL') + hline(lim.lwl, 'qc-l2', '−2s') + hline(lim.lcl, 'qc-l3', '−3s');
  const path = s.map((v, i) => `${i ? 'L' : 'M'}${f(X(i))} ${f(Y(v))}`).join(' ');
  const dots = s.map((v, i) => {
    const rules = flagged[i] || [];
    const label = `${i + 1}${m.labels && m.labels[i] ? ' · ' + m.labels[i] : ''}: ${Number(v.toPrecision(6))}${rules.length ? ' — ' + rules.map(r => (o.ruleLabel ? o.ruleLabel(r) : r)).join(', ') : ''}`;
    return rules.length
      ? `<g class="qc-flag" data-qc-flag="${esc(rules.join(' '))}" data-qc-index="${i}"><circle cx="${f(X(i))}" cy="${f(Y(v))}" r="6"/><path d="M${f(X(i) - 3)} ${f(Y(v) - 3)}l6 6m0 -6l-6 6"/><title>${esc(label)}</title></g>`
      : `<circle class="qc-dot" data-qc-index="${i}" cx="${f(X(i))}" cy="${f(Y(v))}" r="3"><title>${esc(label)}</title></circle>`;
  }).join('');
  const step = Math.max(1, Math.ceil(s.length / 12));
  const ticks = s.map((_, i) => (i % step === 0 || i === s.length - 1 ? `<text class="qc-tick" text-anchor="middle" x="${f(X(i))}" y="${H - 8}">${i + 1}</text>` : '')).join('');
  return `<svg class="qc-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || '')}">
    <rect class="qc-bg" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/>${lines}<path class="qc-path" d="${path}"/>${dots}${ticks}</svg>`;
}
