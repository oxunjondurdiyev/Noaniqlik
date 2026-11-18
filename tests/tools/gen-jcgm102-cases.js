#!/usr/bin/env node
/* P07 — JCGM 102:2011 misollarini tests/cases/jcgm102/ ga yozish. Kutilgan qiymatlar FAQAT PDF dan (jadval va sahifa
   `ref` da). MCM misollarida tolerans = ½ oxirgi xona + 2·√2·s; s — bitta simulyatsiyaning urug'dan-urug'ga standart
   og'ishi, shu skript o'lchaydi (8 ta urug') va `tolerance.*.reason` ga yozadi. Tolerans "o'tkazish uchun" kengaytirilmaydi.
   Ishga tushirish: node tests/tools/gen-jcgm102-cases.js   (≈ 1–2 daqiqa; npm test tarkibiga kirmaydi). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');
const DIR = path.join(__dirname, '..', 'cases', 'jcgm102');
fs.mkdirSync(DIR, { recursive: true });
const DOC = 'JCGM 102:2011 (GUM-S2)';
const up2 = v => { if (!(v > 0)) return 0; const e = Math.floor(Math.log10(v)) - 1; return Number((Math.ceil(v / 10 ** e - 1e-9) * 10 ** e).toPrecision(2)); };
const fmt = v => String(Number(v.toPrecision(2))).replace('.', ',');
const write = c => fs.writeFileSync(path.join(DIR, c.id + '.json'), JSON.stringify(c, null, 2) + '\n');
const calc = state => ({ format: 'calc-state/v2', state });
const pick = (r, q) => {
  const i = s => r.symbols.indexOf(s), p = q.split('.');
  if (p[0] === 'y') return r.y[i(p[1])];
  if (p[0] === 'u') return r.u[i(p[1])];
  if (p[0] === 'r') return r.correlation[i(p[1])][i(p[2])];
  if (p[0] === 'one_minus_r') return 1 - r.correlation[i(p[1])][i(p[2])];
  if (q === 'kp') return r.coverageRegion.ellipsoid.kp;
  if (q === 'kq') return r.coverageRegion.rectangle.kq;
};
/** MCM misoli: expected {q: [value, halfDigit, ref]} → tolerans o'lchangan tarqoqlikdan */
function mcCase(base, spec, mc, expected, extraExpected, extraTol) {
  const rs = [];
  for (let s = 1; s <= 8; s++) rs.push(E.monteCarlo(spec, { ...mc, seed: s }));
  const exp = {}, tol = {};
  for (const [q, [value, half, ref]] of Object.entries(expected)) {
    const a = rs.map(r => pick(r, q)), mu = a.reduce((x, y) => x + y, 0) / a.length;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - mu) ** 2, 0) / (a.length - 1));
    exp[q] = { value, ref };
    tol[q] = { abs: up2(half + 2 * Math.SQRT2 * sd), reason: `½ oxirgi xona (${fmt(half)}) + 2·√2·s, s = ${fmt(sd)} — bitta simulyatsiyaning urug'dan-urug'ga standart og'ishi (8 ta urug', tests/tools/gen-jcgm102-cases.js)` };
  }
  write({ ...base, status: 'verified', modelSpec: spec, run: { method: 'monteCarlo', mc }, expected: { ...exp, ...(extraExpected || {}) }, tolerance: { ...tol, ...(extraTol || {}) } });
}
const half = d => 0.5 * 10 ** -d;

/* ── §9.2 additiv model: Y1 = X1 + X3, Y2 = X2 + X3 (Eq. 24) ── */
function additive(dist3, a3) {
  return calc({
    params: ['X1', 'X2', 'X3'], measurements: { X1: [0], X2: [0], X3: [0] }, directions: [],
    model: { formula: 'Y1 = X1 + X3', unit: '1' },
    outputs: [{ formula: 'Y1 = X1 + X3', unit: '1' }, { formula: 'Y2 = X2 + X3', unit: '1' }],
    settings: { paired: false, P: 0.95 }, covB: {},
    typeB: [
      { name: 'X1 ~ N(0, 1)', param: 'X1', halfWidth: 1, distribution: 'normal', k: 1 },
      { name: 'X2 ~ N(0, 1)', param: 'X2', halfWidth: 1, distribution: 'normal', k: 1 },
      dist3 === 'normal' ? { name: `X3 ~ N(0, ${a3}²)`, param: 'X3', halfWidth: a3, distribution: 'normal', k: 1 }
        : { name: `X3 ~ R(−${a3}·√3, ${a3}·√3) (standart og'ishi ${a3})`, param: 'X3', halfWidth: `${a3} * sqrt(3)`, distribution: 'rect' },
    ],
  });
}
const ADD = [
  { n: '9-2-2', sec: '9.2.2', tab: 'Table 3', page: '36', spec: additive('normal', 1), title: 'har bir X_i — standart Gauss',
    guf: [1.414, 1.414, 0.5], mcm: { y1: 0.000, y2: 0.000, u1: 1.416, u2: 1.415, r: 0.500, kp: 2.45, kq: 2.21 }, adaptM: 0.40e6, adaptRef: '0.35 × 10⁶ va 0.45 × 10⁶' },
  { n: '9-2-3', sec: '9.2.3', tab: 'Table 4', page: '39', spec: additive('rect', 1), title: 'X3 — to\'g\'ri burchakli (s.o. 1)',
    guf: [1.414, 1.414, 0.5], mcm: { y1: 0.001, y2: 0.001, u1: 1.414, u2: 1.414, r: 0.499, kp: 2.38, kq: 2.15 }, adaptM: 0.355e6, adaptRef: '0.36 × 10⁶ va 0.35 × 10⁶' },
  { n: '9-2-4', sec: '9.2.4', tab: 'Table 5', page: '41', spec: additive('rect', 3), title: 'X3 — to\'g\'ri burchakli (s.o. 3, ustun umumiy ta\'sir)',
    guf: [3.162, 3.162, 0.9], mcm: { y1: 0.003, y2: 0.002, u1: 3.161, u2: 3.161, r: 0.900, kp: 2.28, kq: 1.87 }, adaptM: 1.67e6, adaptRef: '1.49 × 10⁶ va 1.85 × 10⁶' },
];
for (const a of ADD) {
  const src = { doc: DOC, section: `${a.sec}, ${a.tab}`, page: a.page };
  const base = { domain: 'umumiy (o\'lchamsiz)', source: src };
  write({ id: `jcgm102-${a.n}-guf`, title: `JCGM 102 ${a.sec}: additiv ikki chiqishli model (${a.title}) — GUM yondashuvi, U_y = C_x U_x C_xᵀ`, status: 'verified', ...base, modelSpec: a.spec,
    run: { method: 'evaluate' },
    expected: {
      'y.Y1': { value: 0, ref: `${a.tab}, GUF: y1 = 0.000` }, 'y.Y2': { value: 0, ref: `${a.tab}, GUF: y2 = 0.000` },
      'u.Y1': { value: a.guf[0], ref: `${a.tab}, GUF: u(y1) = ${a.guf[0]}` }, 'u.Y2': { value: a.guf[1], ref: `${a.tab}, GUF: u(y2) = ${a.guf[1]}` },
      'r.Y1.Y2': { value: a.guf[2], ref: `${a.tab}, GUF: r(y1, y2) = ${a.guf[2].toFixed(3)}` },
      kp: { value: 2.45, ref: `${a.tab}, GUF: kp = 2.45 (Table 1, m = 2)` }, kq: { value: 2.24, ref: `${a.tab}, GUF: kq = 2.24 (Table 2, m = 2)` },
    },
    tolerance: { default: { abs: 0.0005, reason: 'manbadagi oxirgi xonaning yarmi (3 kasr xona)' }, 'y.Y1': { abs: 1e-12 }, 'y.Y2': { abs: 1e-12 },
      kp: { abs: 0.005, reason: 'manbadagi oxirgi xonaning yarmi (2 kasr xona)' }, kq: { abs: 0.005, reason: 'manbadagi oxirgi xonaning yarmi (2 kasr xona)' } } });
  const m = a.mcm, row = `${a.tab}, MCM (M = 1 × 10⁶)`;
  mcCase({ id: `jcgm102-${a.n}-mcm`, title: `JCGM 102 ${a.sec}: additiv ikki chiqishli model (${a.title}) — MCM, M = 10⁶`, ...base,
    notes: 'Manba Mersenne Twister ishlatgan (9.1.3) — bu yerda Wichmann–Hill, urug\' 20261110; bitta M = 10⁶ simulyatsiyasi ↔ bitta M = 10⁶ simulyatsiyasi.' },
    a.spec, { mode: 'fixed', M: 1000000 }, {
      'y.Y1': [m.y1, half(3), `${row}: y1 = ${m.y1.toFixed(3)}`], 'y.Y2': [m.y2, half(3), `${row}: y2 = ${m.y2.toFixed(3)}`],
      'u.Y1': [m.u1, half(3), `${row}: u(y1) = ${m.u1}`], 'u.Y2': [m.u2, half(3), `${row}: u(y2) = ${m.u2}`],
      'r.Y1.Y2': [m.r, half(3), `${row}: r(y1, y2) = ${m.r.toFixed(3)}`],
      kp: [m.kp, half(2), `${row}: kp = ${m.kp}`], kq: [m.kq, half(2), `${row}: kq = ${m.kq}`],
    });
  // Adaptiv protsedura (§7.8.3), n_dig = 3 (9.2.2.3) — oddiy MCM; sinovlar soni tartibi
  write({ id: `jcgm102-${a.n}-mcm-adaptive`, title: `JCGM 102 ${a.sec}: additiv model (${a.title}) — adaptiv MCM (§7.8.3, n_dig = 3)`, status: 'verified', ...base,
    source: { ...src, section: `${a.sec}, ${a.tab} (Adaptive MCM qatorlari); 9.2.2.3 (n_dig = 3)` }, modelSpec: a.spec,
    run: { method: 'monteCarlo', mc: { mode: 'adaptive', nDig: 3, validation: false } },
    expected: { M: { value: a.adaptM, ref: `${a.tab}, Adaptive MCM: M = ${a.adaptRef} (o'rtachasi)` }, converged: { value: 1, ref: `${a.sec}: adaptiv protsedura barqarorlashgan` },
      kp: { value: m.kp, ref: `${a.tab}, Adaptive MCM: kp = ${m.kp}` }, kq: { value: m.kq, ref: `${a.tab}, Adaptive MCM: kq = ${m.kq} (${a.n === '9-2-2' ? '2.22 va 2.21' : 'ikkala qo\'llanishda'})` },
      'r.Y1.Y2': { value: a.guf[2], ref: `${a.tab}, Adaptive MCM: r(y1, y2) = ${a.n === '9-2-2' ? '0.502 va 0.501' : a.n === '9-2-3' ? '0.500 va 0.502' : '0.900'}` } },
    tolerance: { M: { rel: 0.6, reason: 'M — tasodifiy kattalik (manbaning ikki qo\'llanishida ham har xil) — faqat tartibi (±60 %)' }, converged: { abs: 0 },
      kp: { abs: 0.01, reason: 'n_dig = 3: κ_p = 0,005 (7.8.2.7) + ½ oxirgi xona (0,005)' }, kq: { abs: a.n === '9-2-2' ? 0.015 : 0.01, reason: 'n_dig = 3: κ_q = 0,005 + ½ oxirgi xona (0,005)' + (a.n === '9-2-2' ? '; manbaning ikki qo\'llanishi 2,22 va 2,21' : '') },
      'r.Y1.Y2': { abs: 0.0075, reason: 'n_dig = 3: ρ (λ_max dan) = 0,0005 … 0,005 + manbaning ikki qo\'llanishi orasidagi farq (0,002) + ½ oxirgi xona' } },
    notes: 'Manba adaptiv protsedurada y, u, r, k_p va k_q ning barchasi barqarorlashishini talab qilgan (9.2.2.3) — dvigatel ham shunday (λ_max orqali r).' });
  // §8 tekshiruvi, n_dig = 2 (9.2.2.8): δ = ρ = κ = 0,05
  const okK = a.n === '9-2-2' ? 1 : 0;
  write({ id: `jcgm102-${a.n}-validation`, title: `JCGM 102 ${a.sec}: GUM natijasini MCM bilan tekshirish (§8, n_dig = 2)`, status: 'verified', ...base,
    source: { ...src, section: a.n === '9-2-2' ? '9.2.2.8' : a.n === '9-2-3' ? '9.2.3.4' : '9.2.4.4' }, modelSpec: a.spec,
    run: { method: 'monteCarlo', mc: { mode: 'adaptive', nDig: 2 } },
    expected: {
      'ok.y': { value: 1, ref: 'y1, y2 — tasdiqlangan' }, 'ok.u': { value: 1, ref: 'u(y1), u(y2) — tasdiqlangan' }, 'ok.lambdaMax': { value: 1, ref: 'r(y1, y2) — tasdiqlangan' },
      'ok.kp': { value: okK, ref: okK ? '9.2.2.8: natijalar ikkala holatda tasdiqlangan' : 'kp — tasdiqlanmagan ("the values for kp and kq were not validated")' },
      'ok.kq': { value: okK, ref: okK ? '9.2.2.8: kq qiymatlari ham talab qilingan raqamlargacha mos' : 'kq — tasdiqlanmagan' },
      validated: { value: okK, ref: okK ? '9.2.2.8: "The results obtained from the GUM uncertainty framework were validated in both instances"' : 'kp va kq tasdiqlanmagani uchun umumiy xulosa — tasdiqlanmagan' } },
    tolerance: { default: { abs: 0 } },
    notes: '9.2.2.8: n_dig = 2 → δ1 = δ2 = 0,05, ρ = 0,05, κp = κq = 0,05; MCM natijalari δ/5 bilan (8.3 Note 3).' });
}

/* ── §9.3 koordinata almashtirish: Y1 = √(X1² + X2²), Y2 = arctan(X2/X1) (Eq. 25) — GUM yondashuvi ── */
const T67 = { 0.001: [0.001, 0.010, 10.000], 0.010: [0.010, 0.010, 1.000], 0.100: [0.100, 0.010, 0.100] };
for (const r of [0, 0.9]) {
  for (const x1 of [0.001, 0.010, 0.100]) {
    const [y1, u1, u2] = T67[x1], tab = r ? 'Table 7' : 'Table 6', xs = String(x1).replace('0.', '').padEnd(3, '0');
    write({ id: `jcgm102-9-3-x${xs}-r${r ? '09' : '0'}-guf`,
      title: `JCGM 102 9.3: koordinata almashtirish (Dekart → qutb), x1 = ${x1.toFixed(3)}, r(x1, x2) = ${r} — GUM yondashuvi`, status: 'verified', domain: 'elektr (kompleks kattalik)',
      source: { doc: DOC, section: `${r ? '9.3.3.2' : '9.3.2'}, ${tab} (GUF qatori)`, page: r ? '45' : '44' },
      modelSpec: calc({ params: ['X1', 'X2'], measurements: { X1: [x1], X2: [0] }, directions: [], model: { formula: 'Y1 = sqrt(X1 ^ 2 + X2 ^ 2)', unit: '1' },
        outputs: [{ formula: 'Y1 = sqrt(X1 ^ 2 + X2 ^ 2)', unit: '1' }, { formula: 'Y2 = atan(X2 / X1)', unit: 'rad' }],
        settings: { paired: false, P: 0.95 }, covB: r ? { 'X1|X2': r * 0.01 * 0.01 } : {},
        typeB: [{ name: 'u(x1) = 0.010', param: 'X1', halfWidth: 0.01, distribution: 'normal', k: 1 }, { name: 'u(x2) = 0.010', param: 'X2', halfWidth: 0.01, distribution: 'normal', k: 1 }] }),
      run: { method: 'evaluate' },
      expected: { 'y.Y1': { value: y1, ref: `${tab}, x1 = ${x1.toFixed(3)}, GUF: y1 = ${y1.toFixed(3)}` }, 'y.Y2': { value: 0, ref: `${tab}, GUF: y2 = 0.000` },
        'u.Y1': { value: u1, ref: `${tab}, GUF: u(y1) = ${u1.toFixed(3)}` }, 'u.Y2': { value: u2, ref: `${tab}, GUF: u(y2) = ${u2.toFixed(3)}` },
        'r.Y1.Y2': { value: r, ref: `${tab}, GUF: r(y1, y2) = ${r.toFixed(3)}` } },
      tolerance: { default: { abs: 0.0005, reason: 'manbadagi oxirgi xonaning yarmi (3 kasr xona)' }, 'y.Y2': { abs: 1e-12 } },
      notes: 'Model x1 > 0 da arctan(X2/X1) ko\'rinishida (GUM yondashuvi uchun yetarli). MCM qatorlari (Table 6, 7) to\'rt kvadrantli arctan (atan2) bilan — alohida misollar: jcgm102-9-3-*-mcm (P07b).' });
  }
}

/* ── §9.3 MCM qatorlari (P07b): Y2 = atan2(X2, X1) — to'rt kvadrantli arktangens (§9.3.1.1, Eq. 25 izohi).
   Manba M = 10⁷ (§9.3.2.1.4); bu yerda M = 3·10⁶ — ikki chiqishli MCM ning xotira chegarasi (maxTrialsFor(2) ≈ 3,33·10⁶).
   Tolerans o'sha qoida bo'yicha: ½ oxirgi xona + 2·√2·s (s — M = 3·10⁶ dagi o'lchangan tarqoqlik, 8 ta urug'). ── */
const T6M = { 0.001: [0.013, -0.001, 0.007, 1.744, 0.000], 0.010: [0.015, 0.000, 0.008, 1.117, 0.000], 0.100: [0.101, 0.000, 0.010, 0.101, 0.000] };
const T7M = { 0.001: [0.012, -0.556, 0.008, 1.599, -0.070], 0.010: [0.015, -0.343, 0.008, 0.903, 0.352], 0.100: [0.101, -0.009, 0.010, 0.102, 0.882] };
for (const r of [0, 0.9]) {
  for (const x1 of [0.001, 0.010, 0.100]) {
    const [y1, y2, u1, u2, r12] = (r ? T7M : T6M)[x1], tab = r ? 'Table 7' : 'Table 6', xs = String(x1).replace('0.', '').padEnd(3, '0');
    const row = `${tab}, x1 = ${x1.toFixed(3)}, MCM (M = 10⁷)`;
    mcCase({ id: `jcgm102-9-3-x${xs}-r${r ? '09' : '0'}-mcm`,
      title: `JCGM 102 9.3: koordinata almashtirish (Dekart → qutb), x1 = ${x1.toFixed(3)}, r(x1, x2) = ${r} — MCM (atan2)`, domain: 'elektr (kompleks kattalik)',
      source: { doc: DOC, section: `${r ? '9.3.3.2' : '9.3.2'}, ${tab} (MCM qatori)`, page: r ? '45' : '44' },
      notes: 'Y2 = atan2(X2, X1) — to\'rt kvadrantli arktangens (§9.3.1.1). Manba M = 10⁷ va Mersenne Twister ishlatgan; bu yerda M = 3·10⁶ (ikki chiqishli MCM xotira chegarasi), Wichmann–Hill, urug\' 20261110.' },
    calc({ params: ['X1', 'X2'], measurements: { X1: [x1], X2: [0] }, directions: [], model: { formula: 'Y1 = sqrt(X1 ^ 2 + X2 ^ 2)', unit: '1' },
      outputs: [{ formula: 'Y1 = sqrt(X1 ^ 2 + X2 ^ 2)', unit: '1' }, { formula: 'Y2 = atan2(X2; X1)', unit: 'rad' }],
      settings: { paired: false, P: 0.95 }, covB: r ? { 'X1|X2': r * 0.01 * 0.01 } : {},
      typeB: [{ name: 'u(x1) = 0.010', param: 'X1', halfWidth: 0.01, distribution: 'normal', k: 1 }, { name: 'u(x2) = 0.010', param: 'X2', halfWidth: 0.01, distribution: 'normal', k: 1 }] }),
    { mode: 'fixed', M: 3e6 },
    { 'y.Y1': [y1, half(3), `${row}: y1 = ${y1.toFixed(3)}`], 'y.Y2': [y2, half(3), `${row}: y2 = ${y2.toFixed(3)}`],
      'u.Y1': [u1, half(3), `${row}: u(y1) = ${u1.toFixed(3)}`], 'u.Y2': [u2, half(3), `${row}: u(y2) = ${u2.toFixed(3)}`],
      'r.Y1.Y2': [r12, half(3), `${row}: r(y1, y2) = ${r12.toFixed(3)}`] });
  }
}

/* ── §9.4 qarshilik va reaktivlik: R, X, Z (Eq. 26), n = 6 (Table 8) ── */
const s94 = calc({
  params: ['V', 'I', 'phi'],
  measurements: { V: [5.007, 4.994, 5.005, 4.990, 4.999, 4.999], I: [19.663, 19.639, 19.640, 19.685, 19.678, 19.661], phi: [1.0456, 1.0438, 1.0468, 1.0428, 1.0433, 1.0445] },
  directions: [], model: { formula: 'R = V / I * 1000 * cos(phi)', unit: 'Ω' },
  outputs: [{ formula: 'R = V / I * 1000 * cos(phi)', unit: 'Ω' }, { formula: 'X = V / I * 1000 * sin(phi)', unit: 'Ω' }, { formula: 'Z = V / I * 1000', unit: 'Ω' }],
  settings: { paired: true, P: 0.95 }, covB: {}, typeB: [],
});
const src94 = { doc: DOC, section: '9.4, Table 8 (kuzatuvlar), Table 11 (natija)', page: '52–54' };
const yT = 'Table 8 dagi 6-to\'plam 1–5-to\'plamlar o\'rtachasining yaxlitlangan qiymati (φ: 1,044 5 — o\'rtacha 1,044 46), shuning uchun o\'rtachalar oxirgi xonada siljiydi: ½ oxirgi xona (0,0005) + shu siljish ta\'siri (≤ 0,001)';
write({ id: 'jcgm102-9-4-guf', title: 'JCGM 102 9.4: qarshilik va reaktivlikni bir vaqtda o\'lchash (R, X, Z) — GUM yondashuvi, n = 6', status: 'verified', domain: 'elektr', source: src94, modelSpec: s94,
  run: { method: 'evaluate' },
  expected: { 'y.R': { value: 127.732, ref: 'Table 11, GUF: R = 127.732 Ω' }, 'y.X': { value: 219.847, ref: 'Table 11, GUF: X = 219.847 Ω' }, 'y.Z': { value: 254.260, ref: 'Table 11, GUF: Z = 254.260 Ω' },
    'u.R': { value: 0.058, ref: 'Table 11, GUF: u(R) = 0.058 Ω' }, 'u.X': { value: 0.241, ref: 'Table 11, GUF: u(X) = 0.241 Ω' }, 'u.Z': { value: 0.193, ref: 'Table 11, GUF: u(Z) = 0.193 Ω' },
    'r.R.X': { value: -0.588, ref: 'Table 11, GUF: r(R, X) = −0.588' }, 'r.R.Z': { value: -0.485, ref: 'Table 11, GUF: r(R, Z) = −0.485' },
    'one_minus_r.X.Z': { value: 0.749e-2, ref: 'Table 11, GUF: 1 − r(X, Z) = 0.749 × 10⁻²' } },
  tolerance: { default: { abs: 0.0005, reason: 'manbadagi oxirgi xonaning yarmi' }, 'y.R': { abs: 0.0015, reason: yT }, 'y.X': { abs: 0.0015, reason: yT }, 'y.Z': { abs: 0.0015, reason: yT },
    'one_minus_r.X.Z': { abs: 0.5e-5, reason: 'manbadagi oxirgi xonaning yarmi (0,749 × 10⁻²)' } },
  notes: 'Kirishlar juftlangan kuzatuvlar (A tur, korrelyatsiya — JCGM 100:2008 5.2.3). U_y singular (Z² = R² + X², 9.4.2.3 Note 2) — outputs_singular topilmasi.' });
mcCase({ id: 'jcgm102-9-4-mcm', title: 'JCGM 102 9.4: R, X, Z — MCM, kirishlar ko\'p o\'lchovli t-taqsimot t₃(x̄, M/(νn)) (5.3.2), M = 10⁶', domain: 'elektr',
  source: { ...src94, section: '9.4.2.4 (ν = n − N = 3), Table 11 (MCM qatori)' },
  notes: 'ν = 3: dispersiya mavjud, lekin 4-moment cheksiz — u va r baholari sekin barqarorlashadi (tarqoqlik katta, toleransda hisobga olingan). Aniq qiymatlar — "Alt. GUF" qatori (V(X) = (n − 1)/(n − N − 2)·U_x): 0,130; 0,540; 0,431.' },
  s94, { mode: 'fixed', M: 1000000 }, {
    'y.R': [127.732, 0.0015, 'Table 11, MCM: R = 127.732 Ω'], 'y.X': [219.847, 0.0015, 'Table 11, MCM: X = 219.847 Ω'], 'y.Z': [254.260, 0.0015, 'Table 11, MCM: Z = 254.260 Ω'],
    'u.R': [0.130, half(3), 'Table 11, MCM: u(R) = 0.130 Ω'], 'u.X': [0.536, half(3), 'Table 11, MCM: u(X) = 0.536 Ω'], 'u.Z': [0.429, half(3), 'Table 11, MCM: u(Z) = 0.429 Ω'],
    'r.R.X': [-0.587, half(3), 'Table 11, MCM: r(R, X) = −0.587'], 'r.R.Z': [-0.482, half(3), 'Table 11, MCM: r(R, Z) = −0.482'],
    'one_minus_r.X.Z': [0.770e-2, 0.5e-5, 'Table 11, MCM: 1 − r(X, Z) = 0.770 × 10⁻²'],
  });
console.log('yozildi:', fs.readdirSync(DIR).length, 'fayl');
