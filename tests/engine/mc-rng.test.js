/* P06 — tasodifiy sonlar generatori (src/engine/mc/rng.js).
   Manba: JCGM 101:2008 C.3.3, Table C.2 (61-bet) — kengaytirilgan Wichmann–Hill. Manbada generatorning sonli test
   qiymatlari YO'Q, shuning uchun:
     (1) konstantalar va ikki shaklning (Table C.2 — 32 bitli; C.3.3.3 — 64 bitli) tengligi manbaning o'zidan tekshiriladi;
     (2) BigInt bilan aniq arifmetikada qayta hisob — suzuvchi nuqtada yo'qotish yo'qligining isboti;
     (3) statistik testlar (χ² bir xillik, Kolmogorov–Smirnov, ketma-ket korrelyatsiya, juftliklar χ²) —
         "MUSTAQIL TEKSHIRUV" (manba qiymati emas; C.3.2 dagi TestU01 BigCrush o'rnini bosmaydi);
     (4) muzlatilgan birinchi qiymatlar — Node va brauzerda bit darajasida bir xillik uchun tayanch
         (brauzerda tekshiriladi: tests/crossbrowser/run.js — R(0, 1) bit darajasida; docs/validation/RTM.md). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../../src/engine/mc/rng.js');
const E = require('../../src/engine/index.js');

const hex = x => { const b = Buffer.alloc(8); b.writeDoubleBE(x); return b.toString('hex'); };

test('Table C.2 konstantalari: d = 2 147 483 123 + (456, 420, 300, 0); d_j = a_j·b_j + c_j (Schrage)', () => {
  assert.deepEqual([...R.WH_A], [11600, 47003, 23000, 33000]);
  assert.deepEqual([...R.WH_B], [185127, 45688, 93368, 65075]);
  assert.deepEqual([...R.WH_C], [10379, 10479, 19423, 8123]);
  assert.deepEqual([...R.WH_D], [2147483579, 2147483543, 2147483423, 2147483123]);
  for (let j = 0; j < 4; j++) assert.equal(R.WH_A[j] * R.WH_B[j] + R.WH_C[j], R.WH_D[j], `j = ${j + 1}`);
});

test('aniqlik isboti: eng katta ko\'paytma a_j·(d_j − 1) < 2⁵³ va suzuvchi nuqtadagi ko\'paytma BigInt bilan teng', () => {
  let max = 0n;
  for (let j = 0; j < 4; j++) {
    const i = R.WH_D[j] - 1;
    const exact = BigInt(R.WH_A[j]) * BigInt(i);
    assert.equal(BigInt(R.WH_A[j] * i), exact);
    assert.ok(Number.isSafeInteger(R.WH_A[j] * i));
    if (exact > max) max = exact;
  }
  assert.equal(max, 100938168924626n);            // 47 003 · 2 147 483 542
  assert.ok(max < 2n ** 53n);
});

test('C.3.3.3 (64 bitli) shakl = Table C.2 (32 bitli) shakl = BigInt aniq arifmetika — 10⁵ qadam, 3 ta urug\'', () => {
  for (const seed of [R.MC_SEED, 1, 4294967295]) {
    const g = R.wichmannHill(seed);
    let s32 = R.whState(seed);
    let big = s32.map(BigInt);
    for (let n = 0; n < 100000; n++) {
      g.next();
      s32 = R.wichmannHillStep32(s32);
      if (n < 20000) big = big.map((v, j) => (BigInt(R.WH_A[j]) * v) % BigInt(R.WH_D[j]));
      if (n % 9973 === 0 || n === 99999) assert.deepEqual(g.state(), s32, `seed ${seed}, qadam ${n}`);
      if (n === 19999) assert.deepEqual(g.state().map(BigInt), big);
    }
  }
});

test('urug\': bir xil urug\' → bir xil ketma-ketlik; har xil urug\' → har xil; noto\'g\'ri urug\' → null', () => {
  const a = R.wichmannHill(12345), b = R.wichmannHill(12345), c = R.wichmannHill(12346);
  let same = 0;
  for (let i = 0; i < 1000; i++) { const x = a.next(); assert.equal(x, b.next()); if (x === c.next()) same++; }
  assert.equal(same, 0);
  for (const st of [R.whState(0), R.whState(4294967295), R.whState(R.MC_SEED)]) {
    st.forEach((v, j) => assert.ok(Number.isInteger(v) && v >= 1 && v < R.WH_D[j]));
  }
  for (const bad of [-1, 1.5, 2 ** 32, NaN, '7', [1, 2, 3], [0, 1, 1, 1], [1, 1, 1, 2147483123]]) assert.equal(R.wichmannHill(bad), null, String(bad));
  // to'rtta holatni to'g'ridan-to'g'ri berish (Table C.2: "Set to integers between 1 and 2 147 483 647")
  const d = R.wichmannHill([1, 2, 3, 4]);
  d.next();
  assert.deepEqual(d.state(), [11600, 94006, 69000, 132000]);
  assert.equal(R.createRng('mt19937', 1), null);
  assert.equal(R.createRng(undefined, 5).name, 'wichmann-hill-2006');
  assert.equal(R.createRng('xorshift32-legacy', 5).name, 'xorshift32-legacy');
});

test('muzlatilgan qiymatlar (regressiya; Node ↔ brauzer bit darajasida): seed = 20261110, birinchi 5 ta va 10⁶-chi son', () => {
  const g = R.wichmannHill(R.MC_SEED);
  assert.deepEqual(R.whState(R.MC_SEED), GOLDEN.state0);
  const first = [];
  for (let i = 0; i < 5; i++) first.push(hex(g.next()));
  assert.deepEqual(first, GOLDEN.first5);
  let x = 0;
  for (let i = 5; i < 1000000; i++) x = g.next();
  assert.equal(hex(x), GOLDEN.millionth);
  assert.deepEqual(g.state(), GOLDEN.stateAfterMillion);
});

test('xorshift32-legacy: ENGINE ≤ 2.5.0 dagi ketma-ketlik o\'zgarmagan', () => {
  const g = R.xorshift32(20261110);
  const v = [];
  for (let i = 0; i < 3; i++) v.push(hex(g.next()));
  assert.deepEqual(v, GOLDEN.legacy3);
});

/* ── Statistik testlar — MUSTAQIL TEKSHIRUV (manba qiymati emas) ── */
const SEEDS = [R.MC_SEED, 1, 987654321];

test('mustaqil tekshiruv: χ² bir xillik (100 katak, N = 10⁶) — p-qiymat (0,001; 0,999) ichida; 0 va 1 chiqmaydi', () => {
  for (const seed of SEEDS) {
    const g = R.wichmannHill(seed), N = 1e6, K = 100, cnt = new Array(K).fill(0);
    for (let i = 0; i < N; i++) { const r = g.next(); assert.ok(r > 0 && r < 1); cnt[Math.floor(r * K)]++; }
    const chi2 = cnt.reduce((s, c) => s + (c - N / K) ** 2 / (N / K), 0);
    const p = E.chi2Cdf(chi2, K - 1);
    assert.ok(p > 0.001 && p < 0.999, `seed ${seed}: χ² = ${chi2.toFixed(1)}, P = ${p.toFixed(4)}`);
  }
});

test('mustaqil tekshiruv: Kolmogorov–Smirnov (N = 10⁵) — √N·D < 1,95 (α ≈ 0,001)', () => {
  for (const seed of SEEDS) {
    const g = R.wichmannHill(seed), N = 1e5, x = new Float64Array(N);
    for (let i = 0; i < N; i++) x[i] = g.next();
    x.sort();
    let D = 0;
    for (let i = 0; i < N; i++) D = Math.max(D, (i + 1) / N - x[i], x[i] - i / N);
    assert.ok(Math.sqrt(N) * D < 1.95, `seed ${seed}: √N·D = ${(Math.sqrt(N) * D).toFixed(3)}`);
    assert.ok(Math.sqrt(N) * D > 0.2, `seed ${seed}: haddan tashqari "tekis" — ${(Math.sqrt(N) * D).toFixed(3)}`);
  }
});

test('mustaqil tekshiruv: ketma-ket korrelyatsiya, kechikish 1…10 (N = 10⁶) — |ρ|·√N < 3,5', () => {
  for (const seed of SEEDS) {
    const g = R.wichmannHill(seed), N = 1e6, x = new Float64Array(N);
    for (let i = 0; i < N; i++) x[i] = g.next() - 0.5;
    let v = 0;
    for (let i = 0; i < N; i++) v += x[i] * x[i];
    for (let lag = 1; lag <= 10; lag++) {
      let c = 0;
      for (let i = 0; i + lag < N; i++) c += x[i] * x[i + lag];
      const z = c / v * Math.sqrt(N);
      assert.ok(Math.abs(z) < 3.5, `seed ${seed}, kechikish ${lag}: z = ${z.toFixed(2)}`);
    }
  }
});

test('mustaqil tekshiruv: ketma-ket juftliklar (r_2i, r_2i+1) 20 × 20 katakda bir xil (N = 5·10⁵ juft)', () => {
  for (const seed of SEEDS) {
    const g = R.wichmannHill(seed), N = 5e5, K = 20, cnt = new Array(K * K).fill(0);
    for (let i = 0; i < N; i++) cnt[Math.floor(g.next() * K) * K + Math.floor(g.next() * K)]++;
    const e = N / (K * K);
    const chi2 = cnt.reduce((s, c) => s + (c - e) ** 2 / e, 0);
    const p = E.chi2Cdf(chi2, K * K - 1);
    assert.ok(p > 0.001 && p < 0.999, `seed ${seed}: χ² = ${chi2.toFixed(1)}, P = ${p.toFixed(4)}`);
  }
});

const GOLDEN = require('./fixtures/mc-rng-golden.json');
