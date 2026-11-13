/* Normal va Styudent kvantillari (src/engine/special.js, coverage.js) — PLAN P03 3-band, D-01, Q-1(a).
   Kutilgan qiymatlar: (1) Excel katagi (NORMSINV), (2) JCGM 100:2008 Table G.2,
   (3) mustaqil mpmath hisobi (40 xona, tests/tools/gen-t-quantiles.py). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');
const S = require('../../src/engine/special.js');
const MP = require('./fixtures/quantiles.mpmath.json');
const G2 = require('./fixtures/gum-table-g2.json');
const GAS1 = require('../cases/excel/excel-gas-p1.json');

const rel = (a, e) => Math.abs(a - e) / Math.abs(e);

test('D-01: NORMSINV(0,97725) = 2,000 002 443 899 6 (1e-12) — Excel Nuqta_1!D38', () => {
  const e = GAS1.expected.k.value; // Excel katagidan (fixture-refs.test.js qayta tekshiradi)
  assert.equal(GAS1.expected.k.ref, 'Nuqta_1!D38');
  assert.ok(rel(E.normalQuantile(0.97725), 2.0000024438996) < 1e-12);
  assert.ok(rel(E.normalQuantile(0.97725), e) < 1e-12, `${E.normalQuantile(0.97725)} vs ${e}`);
  // ν = ∞ → aniq normal kvantil (Q-1(a))
  assert.ok(rel(E.coverageFactor(0.9545, Infinity), e) < 1e-12);
});

test('normal kvantil: mpmath bilan 1e-13 nisbiy (AS241)', () => {
  for (const r of MP.normal) {
    const z = +r.z, a = E.normalQuantile(+r.p);
    if (z === 0) assert.ok(Math.abs(a) < 1e-15);
    else assert.ok(rel(a, z) < 1e-13, `p = ${r.p}: ${a} vs ${r.z}`);
  }
});

test('t-kvantil: 1 ≤ ν ≤ 200, P ∈ {0,95; 0,9545; 0,99; 0,9973} — 1e-6 nisbiy (PLAN P03 3-band)', () => {
  let n = 0, worst = 0;
  for (const r of MP.t) {
    if (+r.nu > 200) continue;
    const a = E.tQuantile(+r.P, +r.nu), d = rel(a, +r.t);
    worst = Math.max(worst, d);
    assert.ok(d < 1e-6, `P = ${r.P}, ν = ${r.nu}: ${a} vs ${r.t}`);
    n++;
  }
  assert.equal(n, 800);
  assert.ok(worst < 1e-11, `amalda aniqlik 1e-11 dan yaxshi bo'lishi kerak (eng yomoni ${worst})`);
});

test('t-kvantil: katta va kasr ν (≤ 1e9) — mpmath bilan 1e-11', () => {
  for (const r of [...MP.t.filter(x => +x.nu > 200), ...MP.tFrac]) {
    const a = E.tQuantile(+r.P, +r.nu);
    assert.ok(rel(a, +r.t) < 1e-11, `P = ${r.P}, ν = ${r.nu}: ${a} vs ${r.t}`);
  }
});

// D-11 (DISCREPANCIES.md, B): Table G.2 da ν = 35, p = 90 % uchun 1,70 bosilgan; aniq qiymat 1,6896 (→ 1,69).
// mpmath ham 1,689 572 46 beradi — manbadagi yaxlitlash nuansi, dvigatel xatosi emas.
const G2_SOURCE_NUANCE = { '35|0.90': 'D-11' };

test('JCGM 100:2008 Table G.2: barcha qiymatlar jadval aniqligida (±½ oxirgi xona)', () => {
  const Ps = G2.p.map(p => (p.startsWith('k') ? 2 * E.normalCdf(+p.slice(1)) - 1 : +p));
  for (const row of G2.rows) {
    row.t.forEach((txt, i) => {
      const dec = (txt.split('.')[1] || '').length;
      const a = E.tQuantile(Ps[i], row.nu === null ? Infinity : row.nu);
      if (G2_SOURCE_NUANCE[`${row.nu}|${G2.p[i]}`]) {
        assert.ok(Math.abs(a - +txt) <= 0.011, 'D-11: manba nuansi 0,01 dan oshmaydi');
        return;
      }
      assert.ok(Math.abs(a - +txt) <= 0.5 * Math.pow(10, -dec) + 1e-12, `ν = ${row.nu}, p = ${G2.p[i]}: ${a} vs ${txt}`);
    });
  }
});

test('t ↔ qamrov: tCoverage(tQuantile(P, ν), ν) = P (1e-12)', () => {
  for (const nu of [1, 2, 3, 5, 10, 30, 100, 1000, 1999, 2001, 1e4, 1e6]) {
    for (const P of [0.6827, 0.9, 0.95, 0.9545, 0.99, 0.9973]) {
      const t = E.tQuantile(P, nu);
      // katta ν da to'liqmas beta orqali qamrov ~1e-12 aniqlikda (kvantil — asimptotik usulda aniqroq)
      assert.ok(Math.abs(E.tCoverage(t, nu) - P) < (nu >= 1e5 ? 1e-11 : 1e-12), `ν = ${nu}, P = ${P}`);
    }
  }
});

test('Q-1(a) / R-03: k(ν) uzluksiz va kamayuvchi — ν = 1000, 2000 (usul chegarasi), 5000 da sakrash yo\'q', () => {
  for (const P of [0.95, 0.9545, 0.99, 0.9973]) {
    let prev = Infinity;
    for (const centre of [1000, 2000, 5000]) {
      for (let nu = centre - 3; nu <= centre + 3; nu++) {
        const k = E.coverageFactor(P, nu);
        assert.ok(k < prev, `P = ${P}: k(${nu}) = ${k} ≥ k(${nu - 1}) = ${prev}`);
        // qo'shni ν lar orasidagi farq analitik hosila (z³+z)/(4ν²) tartibida bo'lishi kerak
        if (prev !== Infinity && nu !== centre - 3) {
          const z = E.normalQuantile((1 + P) / 2);
          const expect = (z ** 3 + z) / (4 * nu * nu);
          assert.ok(Math.abs(prev - k - expect) < 0.05 * expect, `P = ${P}, ν = ${nu}: Δk = ${prev - k}, kutilgan ≈ ${expect}`);
        }
        prev = k;
      }
      prev = Infinity;
    }
    // ν → ∞: t(ν) → z, lekin ν = 10⁹ da ham z dan katta (chegara yo'q)
    assert.ok(E.coverageFactor(P, 1e9) > E.coverageFactor(P, Infinity));
    assert.ok(rel(E.coverageFactor(P, 1e9), E.coverageFactor(P, Infinity)) < 1e-8);
  }
  // usul chegarasida (ν = 2000) ikki sonli usul mos keladi
  for (const P of [0.95, 0.9545, 0.99, 0.9973]) {
    assert.ok(rel(E.tQuantile(P, 2000), S.tQuantileBeta(P, 2000)) < 1e-13);
  }
});

test('ν_eff kasr qoidasi: floor (standart), interpolate, exact — JCGM 100 G.4.1 Note 1', () => {
  const P = 0.99, nu = 16.7; // GUM H.1.6: ν_eff = 16,7 → 16, t99(16) = 2,92
  const fl = E.coverage(P, nu), ip = E.coverage(P, nu, 'interpolate'), ex = E.coverage(P, nu, 'exact');
  assert.equal(fl.rule, 'floor'); assert.equal(fl.nuUsed, 16);
  assert.equal(fl.k, E.tQuantile(P, 16));
  assert.ok(Math.abs(fl.k - 2.92) < 0.005);
  const k16 = E.tQuantile(P, 16), k17 = E.tQuantile(P, 17);
  assert.ok(Math.abs(ip.k - (k16 + 0.7 * (k17 - k16))) < 1e-15);
  assert.ok(ip.k < fl.k && ip.k > k17);
  assert.ok(Math.abs(ex.k - E.tQuantile(P, 16.7)) < 1e-15 && ex.k < fl.k && ex.k > k17);
  // ν < 1 → 1 (floor/interpolate)
  assert.equal(E.coverage(0.95, 0.4).nuUsed, 1);
  // noma'lum qoida → floor
  assert.equal(E.coverage(0.95, 6.9, 'xyz').rule, 'floor');
});
