/* P11: QC kartalari (src/engine/lab/qc.js) va Westgard qoidalari (westgard.js).
   Manba holati: NIST/SEMATECH e-Handbook §6.3.2.1 / §6.3.2.2 sahifalari P11 sessiyasida ochilmadi (tarmoq siyosati) va
   repoda yo'q → jadval qiymatlari "(unverified)". Shuning uchun konstantalar bu yerda TA'RIFDAN MUSTAQIL hisoblanadi
   (egasi qarori: manba bo'lmasa — mustaqil hisob): d₂ = E[R], d₃ = SD[R], R — n ta N(0,1) kuzatuv ko'lami;
     E[R]  = ∫ [1 − Φ(x)ⁿ − (1 − Φ(x))ⁿ] dx
     E[R²] = 2 ∫∫_{x<y} [1 − Φ(y)ⁿ − (1 − Φ(x))ⁿ + (Φ(y) − Φ(x))ⁿ] dx dy
   NIST misoli (§6.3.2.2) — `todo` (kutilgan qiymatlar manbadan olinmaguncha majburiy test emas, CLAUDE.md).
   Westgard qoidalari — manba (Clin. Chem. 27 (1981) 493) repoda yo'q: ta'rif bo'yicha jadvalli testlar (unverified). */
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

test('NIST e-Handbook §6.3.2.2 individuals misoli (https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc322.htm)',
  { todo: 'unverified: sahifa sessiyada ochilmadi — kutilgan qiymatlar manbadan olingach majburiy bo\'ladi' }, () => {
    assert.fail('manba matni kerak');
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
  test(`Westgard ${fn} (unverified): ${rows.length} holat`, () => {
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
