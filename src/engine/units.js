/* ═══════════════════════════════════════════════════════════════
   UNITS.JS — birliklar va o'lchamlik tahlili.
   O'lchamlik vektori: [L, M, T, I, Θ, N, J] (SI asosiy kattaliklari).
   Ref: JCGM GUM-6:2020 §11 (docs/references da hali yo'q — tekshirilmagan);
        SI Brochure, 9th ed. (2019) §2.3.3 (o'lchamlik), §3 (prefikslar), §5.4.7 (birligi bir bo'lgan kattaliklar).
   Birlik ko'rsatilmagan kattaliklar uchun tekshiruv o'tkazib yuboriladi (eski hisoblar avvalgidek).
═══════════════════════════════════════════════════════════════ */

const ZERO = [0, 0, 0, 0, 0, 0, 0];
const D = (L = 0, M = 0, T = 0, I = 0, TH = 0, N = 0, J = 0) => [L, M, T, I, TH, N, J];
export const DIM_NAMES = ['L', 'M', 'T', 'I', 'Θ', 'N', 'J'];

/* Asosiy va hosilaviy birliklar: factor — SI kogerent birlikka ko'paytuvchi;
   offset — affin birliklar (°C): T[K] = t[°C] + 273,15. */
const UNITS = {
  m: { dim: D(1), factor: 1 },
  g: { dim: D(0, 1), factor: 1e-3 },
  s: { dim: D(0, 0, 1), factor: 1 },
  A: { dim: D(0, 0, 0, 1), factor: 1 },
  K: { dim: D(0, 0, 0, 0, 1), factor: 1 },
  mol: { dim: D(0, 0, 0, 0, 0, 1), factor: 1 },
  cd: { dim: D(0, 0, 0, 0, 0, 0, 1), factor: 1 },
  Hz: { dim: D(0, 0, -1), factor: 1 },
  N: { dim: D(1, 1, -2), factor: 1 },
  Pa: { dim: D(-1, 1, -2), factor: 1 },
  J: { dim: D(2, 1, -2), factor: 1 },
  W: { dim: D(2, 1, -3), factor: 1 },
  C: { dim: D(0, 0, 1, 1), factor: 1 },
  V: { dim: D(2, 1, -3, -1), factor: 1 },
  'Ω': { dim: D(2, 1, -3, -2), factor: 1 },
  ohm: { dim: D(2, 1, -3, -2), factor: 1 },
  S: { dim: D(-2, -1, 3, 2), factor: 1 },
  F: { dim: D(-2, -1, 4, 2), factor: 1 },
  Wb: { dim: D(2, 1, -2, -1), factor: 1 },
  T: { dim: D(0, 1, -2, -1), factor: 1 },
  H: { dim: D(2, 1, -2, -2), factor: 1 },
  L: { dim: D(3), factor: 1e-3 },
  l: { dim: D(3), factor: 1e-3 },
  bar: { dim: D(-1, 1, -2), factor: 1e5 },
  min: { dim: D(0, 0, 1), factor: 60, noPrefix: true },
  h: { dim: D(0, 0, 1), factor: 3600, noPrefix: true },
  '°C': { dim: D(0, 0, 0, 0, 1), factor: 1, offset: 273.15, affine: true, noPrefix: true },
  '℃': { dim: D(0, 0, 0, 0, 1), factor: 1, offset: 273.15, affine: true, noPrefix: true },
  // Birligi bir bo'lgan kattaliklar (SI Brochure §5.4.7)
  '%': { dim: ZERO, factor: 1e-2, noPrefix: true },
  ppm: { dim: ZERO, factor: 1e-6, noPrefix: true },
  ppb: { dim: ZERO, factor: 1e-9, noPrefix: true },
  rad: { dim: ZERO, factor: 1 },
  sr: { dim: ZERO, factor: 1 },
  '°': { dim: ZERO, factor: Math.PI / 180, noPrefix: true },
  CFU: { dim: ZERO, factor: 1, noPrefix: true, count: true },   // sanoq birligi (mikrobiologiya)
  KOE: { dim: ZERO, factor: 1, noPrefix: true, count: true },
  'КОЕ': { dim: ZERO, factor: 1, noPrefix: true, count: true },
  dB: { dim: ZERO, factor: 1, noPrefix: true, log: true },      // logarifmik — ko'paytuvchi ma'nosiz
  '1': { dim: ZERO, factor: 1, noPrefix: true },
};

/* Hajmiy ulush va shunga o'xshash yozuvlar — butun satr sifatida (o'lchamsiz, % = 1e-2) */
const WHOLE = {
  '% об.': '%', '%об.': '%', '% об': '%', '%об': '%', 'об.%': '%', '% vol': '%', '%vol': '%', '% (V/V)': '%',
  '% hajm': '%', '% hajm.': '%', '% масс.': '%', '% mass': '%',
  'мм рт. ст.': null, // hozircha qo'llab-quvvatlanmaydi
};

// Ref: SI Brochure 9th ed., Table 7 (SI prefikslari)
const PREFIX = {
  Y: 1e24, Z: 1e21, E: 1e18, P: 1e15, T: 1e12, G: 1e9, M: 1e6, k: 1e3, h: 1e2, da: 1e1,
  d: 1e-1, c: 1e-2, m: 1e-3, 'µ': 1e-6, 'μ': 1e-6, u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15, a: 1e-18, z: 1e-21, y: 1e-24,
};

const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

function atom(sym) {
  if (UNITS[sym]) return UNITS[sym];
  for (const p of Object.keys(PREFIX).sort((a, b) => b.length - a.length)) {
    if (sym.startsWith(p) && sym.length > p.length) {
      const u = UNITS[sym.slice(p.length)];
      if (u && !u.noPrefix && !u.affine) return { ...u, factor: u.factor * PREFIX[p] };
    }
  }
  return null;
}

/**
 * Birlik matnini tahlil qilish: "mg/L", "m/s^2", "kg·m²·s⁻²", "°C", "% об.", "mol/L".
 * @returns {{dim:number[], factor:number, offset?:number, affine?:boolean, log?:boolean, text:string}|null}
 *          null — birlik ko'rsatilmagan yoki tanilmagan.
 */
export function parseUnit(text) {
  if (text === null || text === undefined) return null;
  let s = String(text).trim();
  if (!s) return null;
  if (Object.prototype.hasOwnProperty.call(WHOLE, s)) {
    if (WHOLE[s] === null) return null;
    s = WHOLE[s];
  }
  const whole = atom(s);
  if (whole) return { dim: [...whole.dim], factor: whole.factor, offset: whole.offset, affine: !!whole.affine, log: !!whole.log, text: String(text).trim() };
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, m => '^' + [...m].map(c => SUP[c]).join(''));
  // Ko'paytma/bo'linma: "a·b/c^2"
  const tokens = s.match(/[\/·*.\s]|[^\/·*.\s]+/g) || [];
  let dim = [...ZERO], factor = 1, sign = 1, any = false;
  for (const tk of tokens) {
    if (tk === '/') { sign = -1; continue; }
    if ('·*. '.includes(tk) || /^\s+$/.test(tk)) continue;
    const m = tk.match(/^(.+?)(?:\^?(-?\d+))?$/);
    if (!m) return null;
    let sym = m[1], exp = m[2] !== undefined ? Number(m[2]) : 1;
    if (m[2] !== undefined && !tk.includes('^') && atom(tk)) { sym = tk; exp = 1; }
    const u = atom(sym);
    if (!u || u.affine || u.log) return null; // affin/logarifmik birlik murakkab birlik ichida bo'lmaydi
    const e = sign * exp;
    dim = dim.map((d, i) => d + e * u.dim[i]);
    factor *= Math.pow(u.factor, e);
    any = true;
  }
  if (!any) return null;
  return { dim, factor, affine: false, log: false, text: String(text).trim() };
}

export const dimEqual = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-12);
export const isDimensionless = d => d.every(v => Math.abs(v) < 1e-12);
export function dimText(d) {
  if (!d) return '?';
  if (isDimensionless(d)) return '1';
  return d.map((e, i) => (Math.abs(e) < 1e-12 ? '' : DIM_NAMES[i] + (e === 1 ? '' : '^' + +e.toFixed(6)))).filter(Boolean).join('·');
}

/**
 * Qiymatni bir birlikdan boshqasiga o'tkazish. Affin birliklar (°C ↔ K): mutlaq harorat uchun
 * siljish qo'llaniladi, harorat FARQI (difference: true) uchun — faqat ko'paytuvchi.
 */
export function convert(value, from, to, { difference = false } = {}) {
  const a = typeof from === 'string' ? parseUnit(from) : from;
  const b = typeof to === 'string' ? parseUnit(to) : to;
  if (!a || !b) throw new Error('unit_unknown');
  if (!dimEqual(a.dim, b.dim)) throw new Error('unit_mismatch');
  const si = value * a.factor + (difference ? 0 : (a.offset || 0));
  return (si - (difference ? 0 : (b.offset || 0))) / b.factor;
}

/**
 * AST bo'yicha o'lchamlik tahlili.
 * @param {object} ast   parser.parse natijasi
 * @param {Object<string, ReturnType<typeof parseUnit>>} unitsByVar
 * @returns {{dim:number[]|null, problems:{code:string, detail:string, severity:'error'|'warning'}[]}}
 *   dim = null — noma'lum (kamida bitta kirish birliksiz).
 * Qoidalar: + va − da o'lchamliklar mos bo'lishi shart (aks holda xato); sonli o'zgarmas + / − da
 * istalgan o'lchamlik bilan mos deb olinadi, × / da — o'lchamsiz; exp, ln, log, sin… argumenti o'lchamsiz;
 * affin birlikli (°C) kattalik ko'paytirilsa — ogohlantirish (farq bo'lishi kerak).
 */
export function analyzeDimensions(ast, unitsByVar) {
  const problems = [];
  const text = n => (n.k === 'var' ? n.n : n.k === 'num' ? String(n.v) : '…');
  // Qaytaradi: { d: vector|null, c: o'zgarmasmi, aff: affin birlikli kattalikmi }
  function walk(n) {
    switch (n.k) {
      case 'num': return { d: [...ZERO], c: true, aff: false };
      case 'var': {
        const u = unitsByVar[n.n];
        return u ? { d: [...u.dim], c: false, aff: !!u.affine } : { d: null, c: false, aff: false };
      }
      case 'neg': return walk(n.a);
      case 'add': case 'sub': {
        const a = walk(n.a), b = walk(n.b);
        if (a.c) return { ...b, c: b.c };
        if (b.c) return a;
        if (a.d && b.d && !dimEqual(a.d, b.d)) {
          problems.push({ code: 'unit_mismatch', severity: 'error', detail: `${text(n.a)} [${dimText(a.d)}] ${n.k === 'add' ? '+' : '−'} ${text(n.b)} [${dimText(b.d)}]` });
          return { d: null, c: false, aff: false };
        }
        return { d: a.d && b.d ? a.d : null, c: false, aff: n.k === 'sub' ? false : (a.aff || b.aff) };
      }
      case 'mul': case 'div': {
        const a = walk(n.a), b = walk(n.b);
        for (const [x, node] of [[a, n.a], [b, n.b]]) {
          if (x.aff) problems.push({ code: 'unit_affine', severity: 'warning', detail: text(node) });
        }
        if (!a.d || !b.d) return { d: null, c: a.c && b.c, aff: false };
        const s = n.k === 'mul' ? 1 : -1;
        return { d: a.d.map((v, i) => v + s * b.d[i]), c: a.c && b.c, aff: false };
      }
      case 'pow': {
        const a = walk(n.a), b = walk(n.b);
        if (b.d && !isDimensionless(b.d)) problems.push({ code: 'unit_fn_arg', severity: 'error', detail: '^' + text(n.b) });
        if (!a.d) return { d: null, c: a.c && b.c, aff: false };
        if (isDimensionless(a.d)) return { d: [...ZERO], c: a.c && b.c, aff: false };
        if (n.b.k === 'num' || (n.b.k === 'neg' && n.b.a.k === 'num')) {
          const e = n.b.k === 'num' ? n.b.v : -n.b.a.v;
          return { d: a.d.map(v => v * e), c: a.c, aff: false };
        }
        problems.push({ code: 'unit_pow', severity: 'warning', detail: text(n.a) + '^…' });
        return { d: null, c: false, aff: false };
      }
      case 'fn': {
        const a = walk(n.a);
        if (n.f === 'sqrt') return { d: a.d ? a.d.map(v => v / 2) : null, c: a.c, aff: false };
        if (n.f === 'abs' || n.f === 'sign') return a;
        if (a.d && !isDimensionless(a.d)) {
          problems.push({ code: 'unit_fn_arg', severity: 'error', detail: `${n.f}(${text(n.a)}) [${dimText(a.d)}]` });
        }
        return { d: [...ZERO], c: a.c, aff: false };
      }
      default: return { d: null, c: false, aff: false };
    }
  }
  const r = walk(ast);
  return { dim: r.c ? null : r.d, problems };
}
