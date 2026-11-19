#!/usr/bin/env node
/* P07b — JCGM 102:2011 §9.5 (qarshilik termometri; oshkor bo'lmagan model h(Y, X) = 0) misollarini
   tests/cases/jcgm102/ ga yozish. Kutilgan qiymatlar FAQAT PDF dan: Table 12–16 (55–57-betlar), §9.5.2.5, §9.5.2.6.
   Tolerans — manbadagi oxirgi xonaning yarmi (deterministik hisob, Monte-Karlo yo'q).
   Ishga tushirish: node tests/tools/gen-jcgm102-implicit.js */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const DIR = path.join(__dirname, '..', 'cases', 'jcgm102');
const DOC = 'JCGM 102:2011 (GUM-S2)';
const write = c => fs.writeFileSync(path.join(DIR, c.id + '.json'), JSON.stringify(c, null, 2) + '\n');

// Table 12 (p. 55): baholar va standart noaniqliklar
const X = { R0: 99.99610, A: 0.0039096, B: -6.0e-7, RS: 99.99947 };
const U = { R0: 0.00050, A: 0.0000027, B: 1.1e-7, RS: 0.00010 };
const R_EST = 1.0780057, R_U = 0.0000050;
// Table 13 (p. 55): nolga teng bo'lmagan korrelyatsiya koeffitsiyentlari
const CORR = { 'R0|A': -0.155, 'R0|B': 0.092, 'A|B': -0.959 };
const covB = Object.fromEntries(Object.entries(CORR).map(([k, r]) => { const [a, b] = k.split('|'); return [k, r * U[a] * U[b]]; }));
const tb = (p, u) => ({ name: `u(${p})`, param: p, halfWidth: u, distribution: 'normal', k: 1 });
const base = { settings: { paired: false, P: 0.95 }, directions: [], covB };

/* ── §9.5.2: bitta harorat (N = 5, m = 1) ── */
write({
  id: 'jcgm102-9-5-2-single', title: 'JCGM 102 9.5.2: qarshilik termometri bilan bitta Selsiy haroratini o\'lchash — oshkor bo\'lmagan model (1 + Aθ + Bθ²)R0 − r·RS = 0',
  status: 'verified', domain: 'harorat', source: { doc: DOC, section: '9.5.2, Table 12, Table 13, Eq. (31)', page: '55–56' },
  notes: 'θ Nyuton usuli bilan (boshlang\'ich yaqinlashuv 20 °C); u(θ) — Eq. (8): C_y U_y C_yᵀ = C_x U_x C_xᵀ. Sezgirlik matritsalari c_y = 0,389 Ω/°C va C_x — tests/engine/implicit.test.js da (C_x ning uchinchi elementi bo\'yicha D-21).',
  modelSpec: { format: 'calc-state/v2', state: { ...base, params: ['R0', 'A', 'B', 'RS', 'r'],
    measurements: { R0: [X.R0], A: [X.A], B: [X.B], RS: [X.RS], r: [R_EST] },
    typeB: [...Object.keys(X).map(p => tb(p, U[p])), tb('r', R_U)],
    implicit: { unknowns: [{ name: 'θ', start: 20, unit: '°C' }], equations: ['(1 + A*θ + B*θ^2)*R0 - r*RS'] } } },
  run: { method: 'evaluate' },
  expected: { y: { value: 20.0232, ref: '§9.5.2.5 (p. 56): θ̂ = 20.023 2 °C' }, uc: { value: 0.0045, ref: '§9.5.2.6 (p. 56): u(θ̂) = 0.004 5 °C' } },
  tolerance: { default: { abs: 0.00005, reason: 'manbadagi oxirgi xonaning yarmi (4 kasr xona)' } },
});

/* ── §9.5.3: o'nta harorat (N = 14, m = 10) ── */
// Table 14 (p. 56): (r_j − 1)/10⁻⁷; u(r_j) = 50·10⁻⁷
const R14 = [53, 150054, 300055, 450056, 600056, 780057, 900058, 1050059, 1200060, 780057];
// Table 15 (p. 57): baholar va standart noaniqliklar, °C
const T15 = [0.0100, 3.8491, 7.6928, 11.5410, 15.3938, 20.0232, 23.1131, 26.9797, 30.8509, 20.0232];
const U15 = [0.0018, 0.0027, 0.0040, 0.0046, 0.0047, 0.0045, 0.0046, 0.0060, 0.0089, 0.0045];
// Table 16 (p. 57): korrelyatsiya koeffitsiyentlari (yuqori uchburchak, qatorma-qator)
const T16 = [
  [0.252, 0.127, 0.079, 0.059, 0.054, 0.056, 0.054, 0.050, 0.054],
  [0.815, 0.800, 0.755, 0.580, 0.312, -0.092, -0.358, 0.580],
  [0.902, 0.868, 0.691, 0.400, -0.057, -0.365, 0.691],
  [0.909, 0.766, 0.495, 0.040, -0.281, 0.766],
  [0.847, 0.629, 0.208, -0.115, 0.847],
  [0.841, 0.549, 0.264, 0.918],
  [0.812, 0.613, 0.841],
  [0.909, 0.549],
  [0.264],
];
const rn = R14.map((_, j) => `r${j + 1}`), tn = R14.map((_, j) => `θ${j + 1}`);
const expected = {}, tolerance = { default: { abs: 0.00005, reason: 'manbadagi oxirgi xonaning yarmi (Table 15 — 4 kasr xona)' } };
tn.forEach((t, j) => {
  expected[`y.${t}`] = { value: T15[j], ref: `Table 15 (p. 57): θ${j + 1} = ${T15[j].toFixed(4)} °C` };
  expected[`u.${t}`] = { value: U15[j], ref: `Table 15 (p. 57): u(θ${j + 1}) = ${U15[j].toFixed(4)} °C` };
});
T16.forEach((row, i) => row.forEach((v, k) => {
  const q = `r.${tn[i]}.${tn[i + 1 + k]}`;
  expected[q] = { value: v, ref: `Table 16 (p. 57): r(θ${i + 1}, θ${i + 2 + k}) = ${v.toFixed(3)}` };
  tolerance[q] = { abs: 0.0005, reason: 'manbadagi oxirgi xonaning yarmi (Table 16 — 3 kasr xona)' };
}));
write({
  id: 'jcgm102-9-5-3-several', title: 'JCGM 102 9.5.3: qarshilik termometri bilan o\'nta Selsiy haroratini o\'lchash — oshkor bo\'lmagan ko\'p o\'zgaruvchili model (N = 14, m = 10)',
  status: 'verified', domain: 'harorat', source: { doc: DOC, section: '9.5.3, Table 12–16, Eq. (32)', page: '56–57' },
  notes: 'h_j = (1 + Aθ_j + Bθ_j²)R0 − r_j·RS, j = 1…10. Boshlang\'ich yaqinlashuv — chiziqli (B = 0) baho, 1 °C gacha yaxlitlangan. Table 15 sarlavhasida 7-ustun "θ6" deb bosilgan (θ7 bo\'lishi kerak — tartib bo\'yicha).',
  modelSpec: { format: 'calc-state/v2', state: { ...base, params: ['R0', 'A', 'B', 'RS', ...rn],
    measurements: { R0: [X.R0], A: [X.A], B: [X.B], RS: [X.RS], ...Object.fromEntries(rn.map((n, j) => [n, [Number((1 + R14[j] * 1e-7).toFixed(7))]])) },
    typeB: [...Object.keys(X).map(p => tb(p, U[p])), ...rn.map(n => tb(n, R_U))],
    implicit: { unknowns: tn.map((t, j) => ({ name: t, start: Math.round(R14[j] * 1e-7 / X.A), unit: '°C' })), equations: tn.map((t, j) => `(1 + A*${t} + B*${t}^2)*R0 - ${rn[j]}*RS`) } } },
  run: { method: 'evaluate' }, expected, tolerance,
});
console.log('yozildi: jcgm102-9-5-2-single, jcgm102-9-5-3-several');
