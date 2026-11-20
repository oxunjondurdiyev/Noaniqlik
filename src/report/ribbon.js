/* ═══════════════════════════════════════════════════════════════
   REPORT/RIBBON.JS — "noaniqlik tasmasi" (P16): natijaning SVG ko'rinishi. Sof modul, DOM siz; skriptsiz SVG satri.
   Gorizontal o'q — y dan og'ish, U birligida. Hammasi HAQIQIY natijadan (dvigatel maydonlari): y, u_c, U, k;
   Monte-Karlo natijasi bo'lsa — uning intervallari (eng qisqa va simmetrik) va o'rtachasi.
   Bu yerda HISOB YO'Q — faqat chizish; yaxlitlash faqat yorliqlarda (./rounding.js, egasi qoidalari).

   Ref: JCGM 100:2008 §6.2.1 — U = k·u_c(y), Y = y ± U; G.1.3 — (Y − y)/u_c(y) ning taqsimoti normal deb olinadi
        (egri chiziq: N(y, u_c²) zichligi, formasi uchun; k dvigateldan olinadi, shu chizmadan EMAS).
        JCGM 101:2008 §7.7 — MCM qamrov intervali [y_low; y_high] (ehtimoliy simmetrik va eng qisqa).
   Eslatma: dvigatel MCM namunalarini / gistogrammasini qaytarmaydi (src/engine o'zgartirilmagan) — shuning uchun MCM
   uchun gistogramma EMAS, intervallar chiziladi (docs/RISKS.md R-29).
   CSP: uslub atributi yo'q — rang va chiziqlar CSS sinflari (src/css/results.css); matn esc() orqali.
═══════════════════════════════════════════════════════════════ */
import { roundResult, roundHalfAway } from './rounding.js';

const f2 = v => (Math.round(v * 100) / 100).toString();

/** Chizma geometriyasi (test uchun ochiq): W × H, ±U ramkasi [X0; X0 + SPAN] */
export const RIBBON = Object.freeze({ W: 720, H: 190, X0: 210, SPAN: 300, TOP: 18, BASE: 118 });

/**
 * @param {object} o
 * @param {number} o.y            baho
 * @param {number} o.uc           yig'indi standart noaniqlik u_c(y)
 * @param {number} o.U            kengaytirilgan noaniqlik
 * @param {boolean|string} [o.roundUp]  yaxlitlash rejimi (natijadagi r.roundUp)
 * @param {{low:number, high:number, symLow:number, symHigh:number, mean:number, interval?:string}} [o.mc] MCM natijasi
 * @param {(s:string)=>string} o.esc
 * @param {{title:string, lpu:string, mcShortest?:string, mcSymmetric?:string, mcMean?:string}} o.labels  tarjima qilingan yorliqlar
 * @returns {string} SVG (U > 0 va u_c > 0 bo'lmasa — bo'sh satr)
 */
export function ribbonSvg(o) {
  const { y, uc, U, esc } = o;
  if (!(U > 0) || !(uc > 0) || !isFinite(y) || !isFinite(U) || !isFinite(uc)) return '';
  const { W, H, X0, SPAN, TOP, BASE } = RIBBON;
  const mc = o.mc && [o.mc.low, o.mc.high, o.mc.symLow, o.mc.symHigh].every(Number.isFinite) ? o.mc : null;
  // o'q: og'ish U birligida; ±U har doim [X0; X0 + SPAN] da. MCM intervali sig'masa — o'q siqiladi (clip yo'q)
  const need = mc ? Math.max(Math.abs(mc.low - y), Math.abs(mc.high - y), Math.abs(mc.symLow - y), Math.abs(mc.symHigh - y)) / U : 0;
  const reach = Math.max(1, need);                     // ±U ramkasidan tashqariga chiqadigan eng katta nuqta
  const half = SPAN / 2, cx = X0 + half;
  const scale = reach > (cx - 12) / half ? (cx - 12) / (half * reach) : 1;   // sig'dirish
  const X = d => cx + (d / U) * half * scale;          // d — y dan og'ish (o'lchov birligida)
  const k = U / uc;
  // N(y, u_c²) zichligi (forma): balandlik eng yuqori nuqtaga me'yorlangan
  const top = TOP, base = BASE, hgt = base - top;
  const edge = Math.max(3.2, (cx - 12) / (half * scale) * k);   // chizma chetigacha, u_c birligida
  const N = 96;
  let d = '';
  for (let i = 0; i <= N; i++) {
    const z = -edge + (2 * edge * i) / N;
    const px = X(z * uc);
    if (px < 0 || px > W) continue;
    d += `${d ? 'L' : 'M'}${f2(px)} ${f2(base - hgt * Math.exp(-0.5 * z * z))}`;
  }
  const rr = roundResult(y, U, o.roundUp);
  const show = v => (Object.is(roundHalfAway(v, rr.decimals), -0) ? 0 : roundHalfAway(v, rr.decimals)).toFixed(rr.digits);
  const xl = X(-U), xr = X(U);
  const tick = (x, label, value, anchor) =>
    `<line class="ribbon-tick" x1="${f2(x)}" x2="${f2(x)}" y1="${base}" y2="${base + 6}"/>` +
    `<text class="ribbon-label" x="${f2(x)}" y="${base + 20}" text-anchor="${anchor}">${esc(label)}</text>` +
    `<text class="ribbon-value" x="${f2(x)}" y="${base + 36}" text-anchor="${anchor}">${esc(value)}</text>`;
  const bracket = (lo, hi, yy, cls, label) => {
    const a = X(lo - y), b = X(hi - y);
    return `<g class="${cls}" data-ribbon-interval="${cls.replace('ribbon-', '')}"><path d="M${f2(a)} ${yy - 5}V${yy + 5}M${f2(a)} ${yy}H${f2(b)}M${f2(b)} ${yy - 5}V${yy + 5}"/>` +
      `<text class="ribbon-note" x="${f2(Math.max(a, b) + 8)}" y="${yy + 4}">${esc(label)}</text></g>`;
  };
  const mcPart = mc
    ? bracket(mc.low, mc.high, base + 52, 'ribbon-mc-shortest', `${o.labels.mcShortest || ''} [${show(mc.low)}; ${show(mc.high)}]`) +
      bracket(mc.symLow, mc.symHigh, base + 66, 'ribbon-mc-symmetric', `${o.labels.mcSymmetric || ''} [${show(mc.symLow)}; ${show(mc.symHigh)}]`) +
      (Number.isFinite(mc.mean) ? `<path class="ribbon-mc-mean" data-ribbon-mc-mean="1" d="M${f2(X(mc.mean - y))} ${top}V${base}"/>` : '')
    : '';
  const height = mc ? H : base + 44;
  return `<svg class="ribbon" viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(o.labels.title)}" data-ribbon="1" data-ribbon-k="${esc(String(k))}">
    <rect class="ribbon-band" x="${f2(xl)}" y="${top - 6}" width="${f2(xr - xl)}" height="${base - top + 6}" rx="6"/>
    <path class="ribbon-curve" d="${d}"/>
    <g class="ribbon-scan-box" transform="translate(${f2(xl)} 0) scale(${f2((xr - xl) / 100)} 1)"><path class="ribbon-scan" d="M0 ${top - 6}V${base}"/></g>
    <line class="ribbon-axis" x1="8" x2="${W - 8}" y1="${base}" y2="${base}"/>
    <line class="ribbon-center" x1="${f2(cx)}" x2="${f2(cx)}" y1="${top - 6}" y2="${base}"/>
    ${tick(xl, 'y − U', show(y - U), 'middle')}${tick(cx, 'y', show(y), 'middle')}${tick(xr, 'y + U', show(y + U), 'middle')}
    <text class="ribbon-note ribbon-lpu" x="${f2(xr + 8)}" y="${top + 8}">${esc(o.labels.lpu)}</text>
    ${mcPart}
  </svg>`;
}
