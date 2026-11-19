/* P11: QC kartalari (src/engine/lab/qc.js) va Westgard qoidalari (westgard.js).
   Manbalar (2026-11-19):
     • NIST/SEMATECH e-Handbook §6.3.2.1 (A₂, D₃, D₄ jadvali), §6.3.2.2 (individuals misoli) —
       docs/references/nist-ehandbook-6.3.2/ (VERIFIED). d₂ (n ≥ 3), d₃ — NIST da jadval yo'q: ta'rifdan mustaqil
       hisob: d₂ = E[R], d₃ = SD[R], R — n ta N(0,1) kuzatuv ko'lami;
         E[R]  = ∫ [1 − Φ(x)ⁿ − (1 − Φ(x))ⁿ] dx
         E[R²] = 2 ∫∫_{x<y} [1 − Φ(y)ⁿ − (1 − Φ(x))ⁿ + (Φ(y) − Φ(x))ⁿ] dx dy
     • Westgard J.O. va b., Clin. Chem. 27 (1981) 493–501 — egasi nusxasi, qaydnoma docs/references/westgard-1981-NOTES.md
       (VERIFIED: qoidalar ta'rifi 494-bet, protsedura 495–496-betlar / 1-rasm, 1–3-jadval 495-bet).
       Jadvalli qoida testlari — ta'rifdan; 2- va 4-oy yig'malari — maqoladagi bosma xato, test qilinmaydi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} ${a} ≠ ${b} (±${tol})`);

function rangeMoments(n) {
  const h = 0.02, L = 8, N = Math.round(2 * L / h);
  const xs = Array.from({ length: N + 1 }, (_, i) => -L + i * h);
  const F = xs.map(E.normalCdf);
  let m1 = 0;
  for (let i = 0; i <= N; i++) m1 += (i === 0 || i === N ? 0.5 : 1) * (1 - F[i] ** n - (1 - F[i]) ** n);
  m1 *= h;
  let m2 = 0;
  for (let i = 0; i <= N; i++) {
    const gi = (1 - F[i]) ** n;
    for (let j = i; j <= N; j++) {
      const w = (i === j ? 0.5 : 1);                 // diagonal — yarim vazn (trapetsiya, x < y uchburchagi)
      m2 += w * (1 - F[j] ** n - gi + (F[j] - F[i]) ** n);
    }
  }
  m2 *= 2 * h * h;
  return { d2: m1, d3: Math.sqrt(m2 - m1 * m1) };
}

test('Shewhart konstantalari d₂, d₃, A₂, D₃, D₄ (n = 2…10) — ta\'rifdan mustaqil sonli integrallash bilan mos (±0,001)', () => {
  for (let n = 2; n <= 10; n++) {
    const c = E.SHEWHART_CONSTANTS[n], m = rangeMoments(n);
    near(c.d2, m.d2, 0.001, `d2(${n})`);
    near(c.d3, m.d3, 0.0015, `d3(${n})`);
    near(c.A2, 3 / (m.d2 * Math.sqrt(n)), 0.001, `A2(${n})`);
    near(c.D3, Math.max(0, 1 - 3 * m.d3 / m.d2), 0.0015, `D3(${n})`);
    near(c.D4, 1 + 3 * m.d3 / m.d2, 0.0015, `D4(${n})`);
  }
  // yopiq ko'rinish: d₂(2) = 2/√π
  near(E.SHEWHART_CONSTANTS[2].d2, 2 / Math.sqrt(Math.PI), 0.0005, 'd2(2)');
});

test('I–MR karta: markaziy chiziq, ±2s / ±3s chegaralari (qo\'lda hisob)', () => {
  // x = 10, 12, 11, 13, 9 → x̄ = 11; MR = 2, 1, 2, 4 → MR̄ = 2,25; σ̂ = 2,25/1,128
  const c = E.individualsChart([10, 12, 11, 13, 9]);
  assert.equal(c.x.center, 11);
  assert.deepEqual(c.mr, [2, 1, 2, 4]);
  assert.equal(c.r.center, 2.25);
  const s = 2.25 / 1.128;
  near(c.x.sigma, s, 1e-12);
  near(c.x.ucl, 11 + 3 * s, 1e-12); near(c.x.lcl, 11 - 3 * s, 1e-12);
  near(c.x.uwl, 11 + 2 * s, 1e-12); near(c.x.lwl, 11 - 2 * s, 1e-12);
  near(c.r.ucl, 3.267 * 2.25, 1e-12); assert.equal(c.r.lcl, 0);
  assert.deepEqual(c.out, { x: [], r: [] });
  assert.equal(E.individualsChart([5]).error, 'qc_need_data');
});

test('I–MR: chegaradan chiqqan nuqta belgilanadi', () => {
  const v = [10, 10.1, 9.9, 10, 10.1, 9.9, 10, 10.1, 9.9, 14];
  const c = E.individualsChart(v);
  assert.deepEqual(c.out.x, [9]);
  assert.deepEqual(c.out.r, [9]);
});

test('X̄–R karta: X̿ ± A₂R̄, D₃R̄, D₄R̄ (qo\'lda hisob, n = 4)', () => {
  const g = [[10, 12, 11, 13], [11, 11, 12, 10], [9, 10, 12, 11]];
  // o'rtachalar 11,5; 11; 10,5 → X̿ = 11; ko'lamlar 3; 2; 3 → R̄ = 8/3
  const c = E.xbarRChart(g);
  assert.deepEqual(c.means, [11.5, 11, 10.5]);
  assert.deepEqual(c.ranges, [3, 2, 3]);
  near(c.x.center, 11, 1e-12);
  near(c.x.ucl, 11 + 0.729 * 8 / 3, 1e-12); near(c.x.lcl, 11 - 0.729 * 8 / 3, 1e-12);
  near(c.r.ucl, 2.282 * 8 / 3, 1e-12); assert.equal(c.r.lcl, 0);
  near(c.sigmaWithin, (8 / 3) / 2.059, 1e-12);
  near(c.x.uwl, 11 + 2 * (8 / 3) / 2.059 / 2, 1e-12);
  assert.equal(E.xbarRChart([[1, 2], [1, 2, 3]]).error, 'qc_subgroup_size');
  assert.equal(E.xbarRChart([[1], [2]]).error, 'qc_subgroup_size');
  assert.equal(E.xbarRChart([[1, 2]]).error, 'qc_need_data');
});

test('NIST e-Handbook §6.3.2.1: A₂, D₃, D₄ jadvali (n = 2…10) — aynan', () => {
  // Ref: docs/references/nist-ehandbook-6.3.2/pmc321.htm, "Factors for Calculating Limits for X̄ and R Charts"
  const NIST = { 2: [1.880, 0, 3.267], 3: [1.023, 0, 2.575], 4: [0.729, 0, 2.282], 5: [0.577, 0, 2.115], 6: [0.483, 0, 2.004],
    7: [0.419, 0.076, 1.924], 8: [0.373, 0.136, 1.864], 9: [0.337, 0.184, 1.816], 10: [0.308, 0.223, 1.777] };
  for (const [n, [A2, D3, D4]] of Object.entries(NIST)) {
    const c = E.SHEWHART_CONSTANTS[n];
    assert.deepEqual([c.A2, c.D3, c.D4], [A2, D3, D4], `n = ${n}`);
  }
  assert.equal(E.SHEWHART_CONSTANTS[2].d2, 1.128);   // pmc322.htm: "1.128 is the value of d₂ for n = 2"
});

test('NIST e-Handbook §6.3.2.2 individuals misoli: x̄ = 50,81, MR̄ = 1,8778, UCL = 55,8041, LCL = 45,8159', () => {
  // Ref: docs/references/nist-ehandbook-6.3.2/pmc322.htm, "Example of moving range" (10 ta partiya, oqim tezligi)
  const c = E.individualsChart([49.6, 47.6, 49.9, 51.3, 47.8, 51.2, 52.6, 52.4, 53.6, 52.1]);
  near(c.x.center, 50.81, 5e-3);
  near(c.r.center, 1.8778, 5e-5);
  near(c.x.ucl, 55.8041, 5e-5);
  near(c.x.lcl, 45.8159, 5e-5);
  assert.deepEqual(c.out.x, []);                     // "The process is in control"
  near(c.mr[0], 2.0, 1e-9); near(c.mr[3], 3.5, 1e-9);
});

test('s_Rw kartadan: s (n − 1), ν = n − 1; top-down dvigateli bilan bir xil qiymat', () => {
  const v = [10, 12, 11, 13, 9];
  const r = E.sRwFromChart(v.map(x => ({ values: [x] })));
  near(r.sRw, Math.sqrt(2.5), 1e-12);
  assert.deepEqual([r.n, r.nu, r.mean], [5, 4, 11]);
  assert.equal(E.sRwFromChart([{ values: [1] }]).error, 'qc_need_data');
  // P09 ga uzatish: control_series — o'sha qiymatlar → u(R_w) = s_Rw (mutlaq), ν = n − 1
  const td = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: { unit: 'mg/L' }, rw: { components: [{ type: 'control_series', id: 'qc', values: r.values, unit: 'mg/L' }] } });
  assert.equal(td.error, undefined);
  const row = td.budget.find(b => b.id === 'qc') || td.budget[0];
  near(row.u, r.sRw, 1e-12);
});

test('targetLimits va zScores', () => {
  const l = E.targetLimits({ mean: 100, s: 2 });
  assert.deepEqual([l.lcl, l.lwl, l.center, l.uwl, l.ucl], [94, 96, 100, 104, 106]);
  assert.equal(E.targetLimits({ mean: 100, s: 0 }).error, 'qc_bad_target');
  assert.deepEqual(E.zScores([98, 100, 103], 100, 2), [-1, 0, 1.5]);
});

/* ── Westgard: har bir qoida uchun ijobiy (+) va salbiy (−) jadval ── */
const TABLE = {
  rule13s: [
    ['+ bitta nuqta > +3s', [0, 1, 3.1, 0], [2]],
    ['+ bitta nuqta < −3s', [-3.5, 0], [0]],
    ['− aynan 3s (qat\'iy tengsizlik)', [3, -3, 2.9], []],
    ['− hammasi ±2s ichida', [1, -1, 1.9], []],
  ],
  rule22s: [
    ['+ ketma-ket 2 ta > +2s', [0, 2.1, 2.5, 0], [1, 2]],
    ['+ ketma-ket 2 ta < −2s', [-2.2, -2.1], [0, 1]],
    ['+ 3 ta ketma-ket — hammasi belgilanadi', [2.1, 2.2, 2.3], [0, 1, 2]],
    ['− qarama-qarshi tomonlarda', [2.5, -2.5], []],
    ['− orasida boshqa nuqta', [2.5, 0, 2.5], []],
    ['− aynan 2s', [2, 2], []],
  ],
  ruleR4s: [
    ['+ ketma-ket: +2s dan yuqori va −2s dan past', [0, 2.1, -2.3, 0], [1, 2]],
    ['+ teskari tartib', [-2.5, 2.5], [0, 1]],
    ['− bir tomonda', [2.5, 2.6], []],
    ['− farq 4s dan katta, lekin biri ±2s ichida', [3.5, -1.5], []],
    ['− orasida nuqta bor (seriyasiz rejim)', [2.5, 0, -2.5], []],
  ],
  rule41s: [
    ['+ ketma-ket 4 ta > +1s', [0, 1.1, 1.2, 1.5, 1.1, 0], [1, 2, 3, 4]],
    ['+ ketma-ket 4 ta < −1s', [-1.1, -1.2, -1.3, -2], [0, 1, 2, 3]],
    ['− faqat 3 ta', [1.1, 1.2, 1.3, 0.5], []],
    ['− tomon almashgan', [1.1, 1.2, -1.3, 1.4, 1.5], []],
    ['− aynan 1s', [1, 1, 1, 1], []],
  ],
  rule10x: [
    ['+ 10 ta yuqorida', [0.1, 0.2, 0.1, 0.3, 0.1, 0.2, 0.5, 0.1, 0.1, 0.4], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
    ['+ 10 ta pastda (11 nuqtadan oxirgi 10 tasi)', [0.5, -0.1, -0.2, -0.1, -0.3, -0.1, -0.2, -0.5, -0.1, -0.1, -0.4], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
    ['− 9 ta', [0.1, 0.2, 0.1, 0.3, 0.1, 0.2, 0.5, 0.1, 0.1], []],
    ['− o\'rtachadagi nuqta ketma-ketlikni uzadi', [0.1, 0.2, 0.1, 0.3, 0, 0.2, 0.5, 0.1, 0.1, 0.4, 0.1], []],
  ],
};
for (const [fn, rows] of Object.entries(TABLE)) {
  test(`Westgard ${fn} (ta'rifdan, Westgard 1981 494-bet): ${rows.length} holat`, () => {
    for (const [label, z, expected] of rows) assert.deepEqual(E[fn](z), expected, label);
  });
}

test('Westgard R₄s seriya ichida (runs): faqat bitta seriyadagi natijalar orasida', () => {
  assert.deepEqual(E.ruleR4s([2.5, -2.5, 0], ['a', 'a', 'b']), [0, 1]);
  assert.deepEqual(E.ruleR4s([2.5, -2.5, 0], ['a', 'b', 'b']), []);          // turli seriyalar
  assert.deepEqual(E.ruleR4s([2.5, 0, -2.5], ['a', 'a', 'a']), [0, 2]);       // bir seriyada, ketma-ket bo'lmasa ham
});

test('R₄s seriya belgisisiz — "loyiha yaqinlashuvi" deb belgilanadi (approximation); seriya bilan — belgisiz', () => {
  const noRuns = E.westgard([2.5, -2.5]).violations.find(v => v.rule === 'R_4s');
  assert.equal(noRuns.approximation, true);
  const withRuns = E.westgard([2.5, -2.5], { runs: ['a', 'a'] }).violations.find(v => v.rule === 'R_4s');
  assert.equal('approximation' in withRuns, false);
  assert.ok(E.westgard([3.5, 0]).violations.every(v => !('approximation' in v)));     // boshqa qoidalarda belgi yo'q
});

test('westgard(): yig\'ma natija, tanlangan qoidalar, nazoratdagi qator', () => {
  const r = E.westgard([0, 3.2, 2.1, 2.2, -2.5]);
  assert.deepEqual(r.violations.map(v => v.rule), ['1_3s', '2_2s', 'R_4s', '4_1s'].filter(x => r.violations.some(v => v.rule === x)));
  assert.deepEqual(r.flagged[1], ['1_3s', '2_2s']);
  assert.ok(r.flagged[4].includes('R_4s'));
  assert.equal(r.inControl, false);
  assert.equal(E.westgard([0.5, -0.5, 1.5, -1.2]).inControl, true);
  assert.deepEqual(E.westgard([3.5], { rules: ['2_2s'] }).violations, []);
  assert.deepEqual(E.WESTGARD_RULES, ['1_3s', '2_2s', 'R_4s', '4_1s', '10_x']);
  assert.deepEqual(Object.keys(E.WESTGARD_FUNCTIONS), E.WESTGARD_RULES);
});

/* ── Westgard 1981: sonli misol (495-bet, 1–3-jadval) ── */
const WG_T1 = [
  [98, 97, 95, 103, 100, 104, 92, 94, 102, 95, 100, 93, 100, 106, 112, 94, 96, 97, 103, 104],
  [100, 109, 102, 104, 97, 105, 98, 100, 96, 103, 97, 97, 96, 97, 104, 99, 105, 94, 95, 97],
  [97, 98, 102, 92, 104, 100, 95, 100, 104, 101, 101, 99, 97, 112, 92, 105, 105, 101, 95, 100],
  [101, 100, 99, 100, 96, 100, 98, 97, 103, 107, 104, 96, 104, 105, 101, 102, 102, 102, 101, 104],
  [100, 96, 101, 102, 104, 100, 96, 101, 99, 105, 100, 95, 101, 99, 90, 98, 106, 100, 101, 97],
];
test('Westgard 1981, 2-jadval: oylik x̄ va s (n − 1) — 2 o\'nlik xonagacha', () => {
  const T2 = [[99.25, 5.11], [99.75, 4.09], [100.00, 4.78], [101.10, 2.97], [99.55, 3.65]];
  WG_T1.forEach((m, i) => {
    const r = E.sRwFromChart(m.map(x => ({ values: [x] })));
    near(r.mean, T2[i][0], 0.005, `oy ${i + 1} x̄`);
    near(r.sRw, T2[i][1], 0.005, `oy ${i + 1} s`);
  });
});
test('Westgard 1981, 2–3-jadval: yig\'ma qiymatlar (1-, 3-, 5-oy) va chegaralar', () => {
  // 2- va 4-oy yig'malari maqolada bosma xato bilan (westgard-1981-NOTES.md §2) — test qilinmaydi.
  const cum = k => E.sRwFromChart(WG_T1.slice(0, k).flat().map(x => ({ values: [x] })));
  near(cum(3).mean, 99.67, 0.005); near(cum(3).sRw, 4.61, 0.005);
  near(cum(5).mean, 99.93, 0.005); near(cum(5).sRw, 4.15, 0.005);
  // 3-jadval, 1-oy: x̄ ± 1s = 94,1–104,4; ± 2s = 89,0–109,5; ± 3s = 83,9–114,6 (1 o'nlik xona)
  const m1 = E.sRwFromChart(WG_T1[0].map(x => ({ values: [x] })));
  const l = E.targetLimits({ mean: m1.mean, s: m1.sRw });
  near(l.lwl, 89.0, 0.05); near(l.uwl, 109.5, 0.05); near(l.lcl, 83.9, 0.05); near(l.ucl, 114.6, 0.05);
  // 3-jadval, 5-oy yig'ma: ± 2s = 91,6–108,2
  const c5 = cum(5), l5 = E.targetLimits({ mean: c5.mean, s: c5.sRw });
  near(l5.lwl, 91.6, 0.05); near(l5.uwl, 108.2, 0.05);
});

/* ── W-4: 1₂s darvozasi (Westgard 1981, 495–496-betlar, 1-rasm; egasi qarori 2026-11-19) ── */
test('1₂s darvozasi: ±2s dan oshish bo\'lmagan seriyada 4₁s rad etmaydi (suppressed), darvozasiz — rad etadi', () => {
  const z = [0, 1.5, 1.5, 1.5, 1.5];
  const g = E.westgard(z);
  assert.equal(g.gate, true);
  assert.equal(g.inControl, true);
  assert.deepEqual(g.suppressed, [{ rule: '4_1s', indices: [1, 2, 3, 4] }]);
  const ng = E.westgard(z, { gate: false });
  assert.equal(ng.gate, false);
  assert.deepEqual(ng.violations, [{ rule: '4_1s', indices: [1, 2, 3, 4] }]);
  assert.deepEqual(ng.suppressed, []);
});
test('1₂s darvozasi: oyna ±2s dan oshgan nuqtada tugasa — 4₁s / 10ₓ rad etadi', () => {
  const r = E.westgard([1.5, 1.5, 1.5, 2.5]);
  assert.deepEqual(r.violations.map(v => v.rule), ['4_1s']);
  assert.deepEqual(r.violations[0].indices, [0, 1, 2, 3]);
  const ten = Array(9).fill(-0.5).concat([-2.2]);
  assert.deepEqual(E.westgard(ten).violations.map(v => v.rule), ['10_x']);
  const tenQuiet = Array(10).fill(-0.5);
  assert.equal(E.westgard(tenQuiet).inControl, true);
  assert.deepEqual(E.westgard(tenQuiet).suppressed.map(v => v.rule), ['10_x']);
});
test('1₂s darvozasi seriya bilan: seriyadagi boshqa kuzatuv ±2s dan oshsa — seriya tekshiriladi', () => {
  const z = [1.2, 1.3, 1.4, 1.5, 2.5];
  const runs = ['a', 'b', 'c', 'd', 'd'];
  assert.ok(E.westgard(z, { runs }).violations.some(v => v.rule === '4_1s'));
  const z2 = [1.2, 1.3, 1.4, 1.5, 0];
  assert.equal(E.westgard(z2, { runs }).inControl, true);
});
test('1₂s darvozasi 1₃s, 2₂s, R₄s ga ta\'sir qilmaydi', () => {
  for (const z of [[0, 3.2], [2.1, 2.2], [2.5, -2.5]]) {
    assert.deepEqual(E.westgard(z).violations, E.westgard(z, { gate: false }).violations, JSON.stringify(z));
  }
});

/* ── W-5: bir nechta nazorat materiali (Westgard 1981, 494, 496-betlar; egasi qarori 2026-11-19) ── */
const MW = (a, b, runs) => [{ z: a, runs }, { z: b, runs }];
test('westgardMulti: seriya belgisi majburiy', () => {
  assert.equal(E.westgardMulti([{ z: [1], runs: [] }]).error, 'qc_multi_runs_required');
  assert.equal(E.westgardMulti([{ z: [1], runs: [''] }]).error, 'qc_multi_runs_required');
  assert.equal(E.westgardMulti([]).error, 'qc_need_data');
});
test('westgardMulti: 2₂s materiallar bo\'ylab (bir seriya) va bir material ichida (ketma-ket seriyalar)', () => {
  const across = E.westgardMulti(MW([2.5], [2.3], ['d1']));
  assert.deepEqual(across.violations, [{ rule: '2_2s', indices: [{ material: 0, index: 0 }, { material: 1, index: 0 }] }]);
  const within = E.westgardMulti(MW([2.4, 2.6], [0, 0], ['d1', 'd2']));
  assert.deepEqual(within.violations.find(v => v.rule === '2_2s').indices, [{ material: 0, index: 0 }, { material: 0, index: 1 }]);
  // turli materiallar, turli seriyalar — yig'ma ketma-ketlikda qo'shni bo'lsa ham 2₂s EMAS
  const none = E.westgardMulti(MW([0, 2.5], [2.5, 0], ['d1', 'd2']));
  assert.equal(none.violations.some(v => v.rule === '2_2s'), false);
});
test('westgardMulti: R₄s — bir seriyada ikki material (11-kun turi)', () => {
  const r = E.westgardMulti(MW([0, 2.5], [0, -2.4], ['d1', 'd2']));
  assert.deepEqual(r.violations.map(v => v.rule), ['R_4s']);
  assert.equal(r.violations[0].approximation, undefined);
  assert.deepEqual(r.flagged['0:1'], ['R_4s']);
  assert.deepEqual(r.flagged['1:1'], ['R_4s']);
});
test('westgardMulti: 4₁s ikki material × 2 seriya (17-kun turi) va 10ₓ bir materialda (27-kun turi)', () => {
  const f = E.westgardMulti(MW([0, 1.2, 1.3], [0, 1.4, 2.2], ['d1', 'd2', 'd3']));
  assert.ok(f.violations.find(v => v.rule === '4_1s'));
  const low = Array(9).fill(-0.6).concat([-2.1]);
  const high = [0.5, -0.3, 0.4, -0.2, 0.6, -0.5, 0.3, -0.4, 0.2, 0.1];
  const runs = low.map((_, i) => 'd' + i);
  const t = E.westgardMulti([{ z: high, runs }, { z: low, runs }]);
  const v = t.violations.find(x => x.rule === '10_x');
  assert.deepEqual(v.indices, low.map((_, i) => ({ material: 1, index: i })));
});
test('westgardMulti: darvoza; 3 material — generalized', () => {
  const quiet = E.westgardMulti(MW([1.2, 1.3], [1.4, 1.5], ['d1', 'd2']));
  assert.equal(quiet.inControl, true);
  assert.equal(quiet.suppressed[0].rule, '4_1s');
  assert.equal(E.westgardMulti(MW([1.2, 1.3], [1.4, 1.5], ['d1', 'd2']), { gate: false }).inControl, false);
  const three = E.westgardMulti([{ z: [0], runs: ['a'] }, { z: [0], runs: ['a'] }, { z: [0], runs: ['a'] }]);
  assert.equal(three.generalized, true);
  assert.equal(E.westgardMulti(MW([0], [0], ['a'])).generalized, undefined);
});
