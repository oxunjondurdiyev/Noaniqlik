/* TESTS/CROSSCHECK/NUM/LIB.JS — NIST Uncertainty Machine (NUM) bilan mustaqil o'zaro tekshiruv (P13 §5).
   • inputsFor(case): mavjud VERIFIED misoldan NUM ga kiritiladigan ma'lumot (model, kirish taqsimotlari, korrelyatsiya) —
     raqamlar misol faylidan va dvigatelning byudjetidan olinadi, qo'lda yozilmaydi (test fayllar bilan mosligini tekshiradi).
   • platformValues(case): platformaning o'z natijasi (LPU va MCM) — NUM natijalari bilan solishtirish uchun.
   • compare(file, platform): egasi kiritgan NUM natijalari (`status: "owner-run"`) bilan solishtirish.
   NUM ni bu kod ISHGA TUSHIRMAYDI va tarmoqqa chiqmaydi; NUM qo'llanmasi repoda yo'q — unverified. */
'use strict';
const path = require('node:path');
const E = require('../../../src/engine/index.js');

const SQRT3 = Math.sqrt(3);
/* Asos misollar: har bir tur uchun bittadan (mavjud verified case lar) */
const SELECTION = [
  { id: 'num-01-linear', case: 'jcgm101/jcgm101-9-2-2-mcm', kind: 'chiziqli model, Gauss kirishlar (GUM yetarli)' },
  { id: 'num-02-nonlinear', case: 'jcgm101/jcgm101-9-3-mcm', kind: 'nochiziqli model, Gauss va to\'g\'ri burchakli kirishlar' },
  { id: 'num-03-correlated', case: 'jcgm101/jcgm101-9-4-mcm-x001-r09', kind: 'korrelyatsiyali kirishlar (r = 0,9)' },
  { id: 'num-04-t-input', case: 'excel/excel-gas-p2-mc', kind: 't-taqsimotli kirish (A tur, n = 3 → ν = 2)' },
  { id: 'num-05-mcm-needed', case: 'jcgm101/jcgm101-9-4-mcm-x0-r0', kind: 'MCM ga muhtoj model (x = 0 da LPU yaroqsiz)' },
];
const loadCase = rel => require(path.join(__dirname, '..', '..', 'cases', rel + '.json'));

/** Misoldan NUM kirish ma'lumotlari. Bir kirishning har bir byudjet komponenti — alohida NUM o'zgaruvchisi. */
function inputsFor(c) {
  const r = E.evaluate(c.modelSpec);
  if (r.error) throw new Error(`${c.id}: ${r.error}`);
  const state = c.modelSpec.state;
  const vars = [], terms = {};
  for (const inp of r.inputs) {
    const rows = r.budget.filter(b => b.param === inp.name);
    terms[inp.name] = [];
    rows.forEach((b, i) => {
      const name = i === 0 ? inp.name : `${inp.name}_b${i}`;
      const center = i === 0 ? inp.mean : 0;
      let v;
      if (b.kind === 'A') v = { name, distribution: 'student-t', center, scale: b.u, df: b.nu };
      else if (b.dist === 'normal' && Number.isFinite(b.nu) && b.nu > 0) v = { name, distribution: 'student-t', center, scale: b.u, df: b.nu };
      else if (b.dist === 'normal') v = { name, distribution: 'gaussian', mean: center, sd: b.u };
      else if (b.dist === 'rect' || b.dist === 'resol') v = { name, distribution: 'rectangular', lower: center - b.u * SQRT3, upper: center + b.u * SQRT3 };
      else throw new Error(`${c.id}: ${b.dist} taqsimoti NUM tayyorlovchisida qo'llab-quvvatlanmaydi`);
      v.source = b.kind === 'A' ? `A tur: ${inp.n} ta kuzatuv (o'rtacha, s/√n, ν = n − 1)` : b.name;
      vars.push(v);
      terms[inp.name].push(name);
    });
  }
  // model: R ifodasi — har bir kirish o'z komponentlari yig'indisi bilan almashtiriladi
  let expr = state.model.formula.split('=').slice(1).join('=').trim();
  for (const [p, list] of Object.entries(terms)) if (list.length > 1) expr = expr.replace(new RegExp(`\\b${p}\\b`, 'g'), `(${list.join(' + ')})`);
  const correlations = Object.entries(state.covB || {}).map(([pair, cov]) => {
    const [a, b] = pair.split('|');
    const u = n => r.inputs.find(x => x.name === n).u;
    return { a, b, r: cov / (u(a) * u(b)) };
  });
  return { output: r.symbol, expression: expr, inputs: vars, correlations, coverage: r.P };
}

/** Platforma natijasi (solishtirish uchun): LPU va MCM (qat'iy M = 10⁶, standart urug'). */
function platformValues(c, M = 1e6) {
  const g = E.evaluate(c.modelSpec);
  const mc = E.monteCarlo(c.modelSpec, { mode: 'fixed', M, validation: false });
  return { 'gum.y': g.y, 'gum.u': g.uc, 'mc.mean': mc.mean, 'mc.sd': mc.uDefined === false ? null : mc.u,
    'mc.symLow': mc.symLow, 'mc.symHigh': mc.symHigh, 'mc.low': mc.low, 'mc.high': mc.high, M, u: g.uc };
}

/** Satr ko'rinishidagi son ("0.0754", "1.2e-4") → { value, half } — half: oxirgi ko'rsatilgan xonaning yarmi. */
function parseShown(text) {
  const s = String(text).trim();
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(s);
  if (!m || !(m[2] || m[3])) return null;
  const exp = m[4] ? Number(m[4]) : 0;
  return { value: Number(s), half: 0.5 * Math.pow(10, exp - (m[3] ? m[3].length : 0)) };
}

/* Tolerans: NUM chiqargan raqamlar soni (oxirgi xonaning ±½ i) + MCM tarqoqligi (ikki mustaqil MCM natijasi):
   o'rtacha — 4·√2·u/√M; standart og'ish — 4·√2·u/√(2M); interval uchlari — 4·√2·3·u/√M (kvantil bahosining xatosi o'rtachanikidan
   kattaroq: zichlik chetda kichik — 3 koeffitsiyenti loyiha qarori, egasi natijalarni kiritganda qayta ko'riladi — R-27). */
const MC_FACTOR = { 'mc.mean': 1, 'mc.sd': Math.SQRT1_2, 'mc.symLow': 3, 'mc.symHigh': 3, 'mc.low': 3, 'mc.high': 3 };

/** @returns {{ q, num, platform, tol, ok }[]} */
function compare(results, platform, nrep) {
  const out = [];
  const type = results.intervalType === 'shortest' ? ['mc.low', 'mc.high'] : ['mc.symLow', 'mc.symHigh'];
  const keys = { 'gum.y': 'gum.y', 'gum.u': 'gum.u', 'mc.mean': 'mc.mean', 'mc.sd': 'mc.sd', 'mc.low': type[0], 'mc.high': type[1] };
  const M = Math.min(Number(nrep) || platform.M, platform.M);
  for (const [q, key] of Object.entries(keys)) {
    if (results[q] === undefined || results[q] === null) continue;
    const shown = parseShown(results[q]);
    if (!shown) { out.push({ q, num: results[q], platform: platform[key], tol: 0, ok: false, note: 'son o\'qilmadi' }); continue; }
    if (platform[key] === null) { out.push({ q, num: shown.value, platform: null, tol: 0, ok: true, note: 'platformada aniqlanmagan (ν ≤ 2) — solishtirilmaydi' }); continue; }
    const mc = MC_FACTOR[key] ? 4 * Math.SQRT2 * MC_FACTOR[key] * platform.u / Math.sqrt(M) : 0;
    const tol = shown.half + mc;
    out.push({ q, num: shown.value, platform: platform[key], tol, ok: Math.abs(shown.value - platform[key]) <= tol });
  }
  return out;
}

module.exports = { SELECTION, loadCase, inputsFor, platformValues, compare, parseShown };
