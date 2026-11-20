/* ═══════════════════════════════════════════════════════════════
   LAB/CHART.JS — P11 / P16: QC kartasi SVG grafigi (Shewhart). ±1s / ±2s / ±3s zonalari — rangli tasmalar,
   ogohlantirish va rad etish nuqtalari kattaroq va rangli (shakli ham farq qiladi — rang yagona belgi emas),
   oxirgi nuqtada ishlagan qoida va z-ball yozuvi.
   Sof modul: satr qaytaradi. CSP: skript yo'q, tashqi resurs yo'q, style atributi yo'q; rang va chiziqlar —
   CSS sinflari (src/css/lab2.css; eski ko'rinish — components.css). Matn faqat esc() orqali.
   BU YERDA HISOB YO'Q: chegaralar, z-ballar va qoidalar — dvigateldan (src/engine/lab/qc.js, westgard.js) keladi;
   modul faqat chizadi va nuqtani "ok / warn / reject" holatiga ajratadi.
═══════════════════════════════════════════════════════════════ */

const f = v => (Math.round(v * 100) / 100).toString();
const fin = v => typeof v === 'number' && Number.isFinite(v);

/** z-ball matni: ishora + 2 o'nlik xona (faqat ko'rsatish; yaxlitlash hisobga ta'sir qilmaydi). */
export function zText(z) {
  if (!fin(z)) return '';
  const a = Math.abs(z).toFixed(2);
  return (z < 0 && Number(a) > 0 ? '−' : z > 0 ? '+' : '') + a;
}

/**
 * Har bir nuqtaning ko'rsatish holati — dvigatel natijasidan:
 *   reject — `flagged[i]` (westgard().flagged: rad etish qoidalari ishlagan);
 *   warn   — ±2s ogohlantirish chegarasidan tashqarida (1₂s) yoki 1₂s darvozasi to'xtatgan qoida oynasida (`suppressed`);
 *   ok     — qolganlari.
 * Ref: src/engine/lab/westgard.js — "1₂s alohida qoida sifatida berilmaydi — u ±2s ogohlantirish chegarasi"; chegara
 * QAT'IY tengsizlik bilan (|z| > 2), z — dvigatelga berilgan z-ballar (model.js::analyseQc → `z`). z berilmagan bo'lsa —
 * nuqta dvigatelning uwl / lwl chiziqlari bilan solishtiriladi (src/engine/lab/qc.js::limits).
 * @param {{series:number[], limits?:object, z?:number[], flagged?:Object<number,string[]>, suppressed?:{rule:string,indices:number[]}[]}} m
 * @returns {{state:'ok'|'warn'|'reject', rules:string[], warn:string[], z:number|null}[]}
 */
export function qcPointStates(m) {
  const s = (m && m.series) || [], lim = (m && m.limits) || {}, flagged = (m && m.flagged) || {}, z = (m && m.z) || [];
  const sup = {};
  for (const x of (m && m.suppressed) || []) for (const i of x.indices || []) if (typeof i === 'number') (sup[i] = sup[i] || []).push(x.rule);
  return s.map((v, i) => {
    const rules = flagged[i] || [];
    const zi = fin(z[i]) ? z[i] : null;
    const beyond = zi !== null ? Math.abs(zi) > 2 : (fin(lim.uwl) && fin(lim.lwl) ? v > lim.uwl || v < lim.lwl : false);
    const warn = [...(beyond ? ['1_2s'] : []), ...(sup[i] || [])];
    return { state: rules.length ? 'reject' : warn.length ? 'warn' : 'ok', rules, warn, z: zi };
  });
}

/**
 * @param {{series:number[], limits:{center,ucl,lcl,uwl,lwl,sigma?}, flagged?:Object<number,string[]>, labels?:string[],
 *          z?:number[], suppressed?:{rule:string,indices:number[]}[]}} m
 *   `z`, `suppressed`, `limits.sigma` — ixtiyoriy (P16): bo'lmasa grafik avvalgidek chiziladi (z yozuvisiz).
 * @param {{esc:Function, title?:string, width?:number, height?:number, ruleLabel?:Function}} o
 */
export function qcChartSVG(m, o) {
  const esc = o.esc, W = o.width || 720, H = o.height || 300;
  const L = 58, R = 44, T = 16, B = 28;
  const s = m.series || [], lim = m.limits;
  if (!s.length || !lim) return '';
  const rl = r => (o.ruleLabel ? o.ruleLabel(r) : r);
  // Ref: src/engine/lab/qc.js::limits — uwl = CL + 2·σ̂; σ̂ berilmagan (eski chaqiruv) bo'lsa shu ta'rifdan olinadi.
  const sigma = fin(lim.sigma) && lim.sigma > 0 ? lim.sigma : (lim.uwl - lim.center) / 2;
  const lo = Math.min(lim.lcl, ...s), hi = Math.max(lim.ucl, ...s);
  const pad = (hi - lo || 1) * 0.08, y0 = lo - pad, y1 = hi + pad;
  const X = i => L + (s.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (s.length - 1));
  const Y = v => T + (y1 - v) * (H - T - B) / (y1 - y0);
  const zone = (a, b, n) => (fin(a) && fin(b) && b > a
    ? `<rect class="qc-zone qc-z${n}" data-qc-band="${n}" x="${L}" y="${f(Y(b))}" width="${W - L - R}" height="${f(Y(a) - Y(b))}"/>` : '');
  const zones = fin(sigma) && sigma > 0
    ? zone(lim.uwl, lim.ucl, 3) + zone(lim.lcl, lim.lwl, 3) + zone(lim.center + sigma, lim.uwl, 2) + zone(lim.lwl, lim.center - sigma, 2) + zone(lim.center - sigma, lim.center + sigma, 1)
    : '';
  const hline = (v, cls, label) => `<line class="${cls}" x1="${L}" x2="${W - R}" y1="${f(Y(v))}" y2="${f(Y(v))}"/><text class="qc-tick" x="${W - R + 5}" y="${f(Y(v) + 3.5)}">${esc(label)}</text><text class="qc-tick" text-anchor="end" x="${L - 5}" y="${f(Y(v) + 3.5)}">${esc(String(Number(v.toPrecision(5))))}</text>`;
  const one = fin(sigma) && sigma > 0 ? hline(lim.center + sigma, 'qc-l1', '+1s') + hline(lim.center - sigma, 'qc-l1', '−1s') : '';
  const lines = hline(lim.ucl, 'qc-l3', '+3s') + hline(lim.uwl, 'qc-l2', '+2s') + one + hline(lim.center, 'qc-cl', 'CL') + hline(lim.lwl, 'qc-l2', '−2s') + hline(lim.lcl, 'qc-l3', '−3s');
  const path = s.map((v, i) => `${i ? 'L' : 'M'}${f(X(i))} ${f(Y(v))}`).join(' ');
  const st = qcPointStates(m);
  const dots = s.map((v, i) => {
    const p = st[i], x = X(i), y = Y(v);
    const names = p.state === 'reject' ? p.rules : p.warn;
    const label = `${i + 1}${m.labels && m.labels[i] ? ' · ' + m.labels[i] : ''}: ${Number(v.toPrecision(6))}${p.z !== null ? ' · z = ' + zText(p.z) : ''}${names.length ? ' — ' + names.map(rl).join(', ') : ''}`;
    if (p.state === 'reject') return `<g class="qc-flag" data-qc-flag="${esc(p.rules.join(' '))}" data-qc-state="reject" data-qc-index="${i}"><circle cx="${f(x)}" cy="${f(y)}" r="8"/><path d="M${f(x - 3.5)} ${f(y - 3.5)}l7 7m0 -7l-7 7"/><title>${esc(label)}</title></g>`;
    if (p.state === 'warn') return `<g class="qc-warn" data-qc-warn="${esc(p.warn.join(' '))}" data-qc-state="warn" data-qc-index="${i}"><circle cx="${f(x)}" cy="${f(y)}" r="6.5"/><path d="M${f(x)} ${f(y - 3.5)}v4M${f(x)} ${f(y + 2.5)}v1"/><title>${esc(label)}</title></g>`;
    return `<circle class="qc-dot" data-qc-state="ok" data-qc-index="${i}" cx="${f(x)}" cy="${f(y)}" r="3.5"><title>${esc(label)}</title></circle>`;
  }).join('');
  const step = Math.max(1, Math.ceil(s.length / 12));
  const ticks = s.map((_, i) => (i % step === 0 || i === s.length - 1 ? `<text class="qc-tick" text-anchor="middle" x="${f(X(i))}" y="${H - 9}">${i + 1}</text>` : '')).join('');
  // Oxirgi nuqta yozuvi: ishlagan qoida (bo'lsa) va z-ball. z — dvigatelga berilgan qiymat (m.z); yangi hisob emas.
  const n = s.length - 1, lp = st[n];
  const lastNames = lp.state === 'reject' ? lp.rules : lp.warn;
  const lastText = [lastNames.map(rl).join(', '), lp.z !== null ? 'z = ' + zText(lp.z) : ''].filter(Boolean).join(' · ');
  // yozuv foni: mono shrift (13 px ≈ 7,9 px / belgi) — kenglik belgilar sonidan; grafik maydonidan chiqmaydi
  const tw = lastText.length * 7.9 + 14, th = 22;
  const bx = Math.max(L + 2, Math.min(W - R - tw - 2, (s.length === 1 ? X(n) - tw / 2 : X(n) - 12 - tw)));
  // yozuv boshqa nuqtalarni yopmasin: avval nuqta ustida, to'qnashsa — ostida (ikkalasi ham band bo'lsa — ustida qoladi)
  const hits = y => s.some((v, i) => i !== n && X(i) > bx - 9 && X(i) < bx + tw + 9 && Y(v) > y - 9 && Y(v) < y + th + 9);
  const above = Y(s[n]) - 12 - th, below = Y(s[n]) + 12;
  const fitsA = above >= T, fitsB = below + th <= H - B;
  const by = fitsA && !hits(above) ? above : fitsB && !hits(below) ? below : fitsA ? above : below;
  const last = lastText
    ? `<g class="qc-last qc-last-${lp.state}" data-qc-last="${n}"><rect x="${f(bx)}" y="${f(by)}" width="${f(tw)}" height="${th}" rx="6"/><text text-anchor="middle" x="${f(bx + tw / 2)}" y="${f(by + 15.5)}">${esc(lastText)}</text></g>` : '';
  return `<svg class="qc-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || '')}">
    <rect class="qc-bg" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/>${zones}${lines}<path class="qc-path" d="${path}"/>${dots}${last}${ticks}</svg>`;
}
