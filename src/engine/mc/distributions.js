/* ═══════════════════════════════════════════════════════════════
   MC/DISTRIBUTIONS.JS — kirish kattaliklarining taqsimotlaridan tanlash (P06). Sof modul.
   Manba: JCGM 101:2008 §6.4 (taqsimot tayinlash va tanlash formulalari), ilova C (C.4 — Gauss, C.5 — ko'p o'lchovli
   Gauss, C.6 — t-taqsimot). Har bir tanlash funksiyasi R(0, 1) dan sonlarni `u()` orqali oladi (mc/rng.js).

   B tur manbalarining nomlari (state.typeB[].distribution) → bu yerdagi taqsimotlar:
     rect    → R(−a, a)                §6.4.2      resol  → R(−a/2, a/2) (a — diskretlik)   §6.4.2
     normal  → N(0, (a/k)²) §6.4.7;  ν chekli bo'lsa t_ν(0, (a/k)²) §6.4.9.7
     triang  → T(−a, a)                §6.4.5      ushape → U(−a, a)                         §6.4.6
     trap    → Trap(−a, a, β)          §6.4.4      ctrap  → CTrap(−a, a, d)                  §6.4.3
     exp     → Ex(1/a) − a (o'rtachasi 0 ga siljitilgan; a — kattalikning bahosi x)          §6.4.10
     lognorm → o'rtachasi x, standart og'ishi a/k bo'lgan log-normal (JCGM 101 da YO'Q — unverified)
═══════════════════════════════════════════════════════════════ */

const TWO_PI = 2 * Math.PI;

/** B tur taqsimot nomlari (UI ro'yxati va tekshiruv uchun). */
export const MC_DISTRIBUTIONS = Object.freeze(['rect', 'normal', 'triang', 'ushape', 'resol', 'trap', 'ctrap', 'exp', 'lognorm']);

/* ── Bir o'lchovli tanlash ─────────────────────────────────────── */

// Ref: JCGM 101:2008 §6.4.2.4 — ξ = a + (b − a)·r
export const sampleRect = (u, a, b) => a + (b - a) * u();

// Ref: JCGM 101:2008 §6.4.3.4 — a_s = (a − d) + 2d·r1;  b_s = (a + b) − a_s;  ξ = a_s + (b_s − a_s)·r2
export function sampleCTrap(u, a, b, d) {
  const as = (a - d) + 2 * d * u();
  const bs = (a + b) - as;
  return as + (bs - as) * u();
}

// Ref: JCGM 101:2008 §6.4.4.4 — ξ = a + (b − a)/2 · [(1 + β)·r1 + (1 − β)·r2]
export const sampleTrap = (u, a, b, beta) => a + (b - a) / 2 * ((1 + beta) * u() + (1 - beta) * u());

// Ref: JCGM 101:2008 §6.4.5.4 — ξ = a + (b − a)/2 · (r1 + r2)
export const sampleTriang = (u, a, b) => a + (b - a) / 2 * (u() + u());

// Ref: JCGM 101:2008 §6.4.6.4 — ξ = (a + b)/2 + (b − a)/2 · sin 2πr
export const sampleArcsine = (u, a, b) => (a + b) / 2 + (b - a) / 2 * Math.sin(TWO_PI * u());

// Ref: JCGM 101:2008 §6.4.10.4 — ξ = −x·ln r
export const sampleExp = (u, x) => -x * Math.log(u());

/**
 * Standart Gauss N(0, 1) — Box–Muller. Bir juft r1, r2 dan ikkita son; ikkinchisi keyingi chaqiruvga saqlanadi.
 * Ref: JCGM 101:2008 C.4, Table C.3 (62-bet) — z1 = √(−2 ln r1)·cos 2πr2,  z2 = √(−2 ln r1)·sin 2πr2
 * @returns {() => number}
 */
export function makeGauss(u) {
  let spare = 0, has = false;
  return () => {
    if (has) { has = false; return spare; }
    const r1 = u(), r2 = u();
    const m = Math.sqrt(-2 * Math.log(r1));
    spare = m * Math.sin(TWO_PI * r2);
    has = true;
    return m * Math.cos(TWO_PI * r2);
  };
}

/**
 * Markaziy t-taqsimot t_ν (ν > 0, kasr bo'lishi mumkin). ν = ∞ — chaqiruvchi Gauss ishlatadi.
 * Ref: JCGM 101:2008 C.6, Table C.5 (63-bet):
 *   a) r1, r2 ~ R(0, 1);
 *   b) r1 < 1/2: t = 1/(4r1 − 1), v = r2/t²;  aks holda t = 4r1 − 3, v = r2;
 *   c) v < 1 − |t|/2 yoki v < (1 + t²/ν)^(−(ν+1)/2) bo'lsa t qabul qilinadi; aks holda a) dan takror.
 */
export function sampleT(u, nu) {
  const e = -(nu + 1) / 2;
  for (;;) {
    const r1 = u(), r2 = u();
    let t, v;
    if (r1 < 0.5) { t = 1 / (4 * r1 - 1); v = r2 / (t * t); }
    else { t = 4 * r1 - 3; v = r2; }
    if (v < 1 - Math.abs(t) / 2 || v < Math.pow(1 + t * t / nu, e)) return t;
  }
}

/**
 * Log-normal: E(X) = x, V(X) = s² → ln X ~ N(μ, σ²), σ² = ln(1 + (s/x)²), μ = ln x − σ²/2.
 * JCGM 101:2008 §6.4 da log-normal taqsimot YO'Q — formulalar taqsimotning standart momentlaridan
 * (E = exp(μ + σ²/2), V = (exp(σ²) − 1)·E²). Ref: (unverified) — repodagi hujjatlarda manba yo'q; mustaqil
 * tekshiruv — tests/engine/mc-distributions.test.js (momentlar va kvantillar).
 * @returns {{mu:number, sigma:number}|null}  x ≤ 0 yoki s < 0 bo'lsa null
 */
export function lognormalParams(x, s) {
  if (!(x > 0) || !(s >= 0) || !isFinite(x) || !isFinite(s)) return null;
  const sigma2 = Math.log(1 + (s / x) * (s / x));
  return { mu: Math.log(x) - sigma2 / 2, sigma: Math.sqrt(sigma2) };
}

/* ── Momentlar (GUF uchun u(x) = √V; testlar) ──────────────────── */

/** Yarim kenglik a bo'lgan simmetrik taqsimotlarning dispersiyasi (o'rtachasi 0). */
export const VARIANCE = Object.freeze({
  // Ref: JCGM 101:2008 §6.4.2.3, Eq. (2) — V = (b − a)²/12 → a²/3
  rect: a => a * a / 3,
  // Ref: JCGM 101:2008 §6.4.3.3, Eq. (4) — V = (b − a)²/12 + d²/9
  ctrap: (a, d) => a * a / 3 + d * d / 9,
  // Ref: JCGM 101:2008 §6.4.4.3 — V = (b − a)²/24 · (1 + β²)
  trap: (a, beta) => a * a / 6 * (1 + beta * beta),
  // Ref: JCGM 101:2008 §6.4.5.3 — V = (b − a)²/24
  triang: a => a * a / 6,
  // Ref: JCGM 101:2008 §6.4.6.3 — V = (b − a)²/8
  ushape: a => a * a / 2,
  // Ref: JCGM 101:2008 §6.4.10.3 — V = x²
  exp: x => x * x,
});

/* ── Ko'p o'lchovli Gauss ───────────────────────────────────────── */

/**
 * Cholesky ko'paytuvchisi: V = Rᵀ·R, R — yuqori uchburchak (qatorlar massivi).
 * Ref: JCGM 101:2008 C.5.2, Table C.4 a) (62-bet).
 * Matritsa JIMGINA "TUZATILMAYDI" (C.5.2 Note 2 dagi "repair" qo'llanilmaydi — egasi talabi):
 *   • manfiy bosh element (matritsa musbat yarim aniqlanmagan) → null (chaqiruvchi `invalid_covariance` xatosini beradi);
 *   • nol bosh element (rang yetishmaydi, masalan r = ±1) — qolgan ustun ham nol bo'lsagina qabul qilinadi
 *     (musbat YARIM aniqlangan matritsaning aniq ko'paytuvchisi, C.5.2 Note 3 ruhida); aks holda null.
 * @param {number[][]} V  simmetrik n × n
 * @returns {number[][]|null}
 */
export function cholesky(V) {
  const n = V.length;
  const sd = new Array(n);
  for (let i = 0; i < n; i++) {
    if (!(V[i][i] >= 0) || !isFinite(V[i][i])) return null;
    sd[i] = Math.sqrt(V[i][i]);
  }
  // Korrelyatsiya matritsasi C = D⁻¹·V·D⁻¹ ko'paytiriladi (kirishlarning masshtabi har xil bo'lganda ham
  // nolga tekshirish chegarasi to'g'ri ishlashi uchun); so'ng R ustunlari D ga ko'paytiriladi: V = (R_C·D)ᵀ(R_C·D).
  const C = [];
  for (let i = 0; i < n; i++) {
    C.push(new Array(n).fill(0));
    for (let j = 0; j < n; j++) {
      const v = V[i][j];
      if (!isFinite(v) || !isFinite(V[j][i])) return null;
      if (Math.abs(v - V[j][i]) > 1e-12 * sd[i] * sd[j]) return null;          // simmetrik emas
      if (sd[i] === 0 || sd[j] === 0) { if (v !== 0) return null; continue; }  // u = 0 bo'lgan kattalik bilan kovariatsiya
      C[i][j] = v / (sd[i] * sd[j]);
    }
    if (sd[i] > 0) C[i][i] = 1;
  }
  const TOL = 1e-12; // yaxlitlash xatosi darajasi; bundan kattaroq manfiy bosh element — haqiqiy nuqson
  const R = [];
  for (let i = 0; i < n; i++) R.push(new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    let p = C[i][i];
    for (let k = 0; k < i; k++) p -= R[k][i] * R[k][i];
    if (p < -TOL) return null;
    const zero = p <= TOL;
    const rii = zero ? 0 : Math.sqrt(p);
    R[i][i] = rii;
    for (let j = i + 1; j < n; j++) {
      let s = C[i][j];
      for (let k = 0; k < i; k++) s -= R[k][i] * R[k][j];
      if (zero) { if (Math.abs(s) > Math.sqrt(TOL)) return null; }             // |s| ≤ √(p·C_jj) bo'lishi shart
      else R[i][j] = s / rii;
    }
  }
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) R[i][j] *= sd[j];
  return R;
}

/**
 * N(0, V) dan bitta tanlash: x = Rᵀ·z, z — n ta standart Gauss.
 * Ref: JCGM 101:2008 C.5.2, Table C.4 b), c) — X = μ·1ᵀ + Rᵀ·Z (μ ni chaqiruvchi qo'shadi).
 * @param {() => number} gauss
 * @param {number[][]} R   cholesky(V)
 * @param {Float64Array|number[]} z    ish massivi (n)
 * @param {Float64Array|number[]} out  natija (n)
 */
export function sampleMvn(gauss, R, z, out) {
  const n = R.length;
  for (let i = 0; i < n; i++) z[i] = gauss();
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k <= i; k++) s += R[k][i] * z[k];
    out[i] = s;
  }
  return out;
}
