/* ═══════════════════════════════════════════════════════════════
   MONTECARLO.JS — taqsimotlarni tarqatish, Monte-Karlo 2.0 (P06). Manba: JCGM 101:2008.
     • generator — mc/rng.js (kengaytirilgan Wichmann–Hill, C.3.3); taqsimotlar — mc/distributions.js (§6.4, C.4–C.6);
     • adaptiv protsedura (§7.9.4) — standart; qat'iy M — laboratoriya sozlamasi;
     • qamrov intervallari: ehtimollik bo'yicha simmetrik va eng qisqa (§7.7.2);
     • GUM natijasini tekshirish (§8.1.3): δ, d_low, d_high;
     • korrelyatsiya: normal kirishlar — ko'p o'lchovli Gauss (§6.4.8, C.5); normal bo'lmagan kirish
       korrelyatsiyada qatnashsa natija BERILMAYDI (standart) yoki aniq belgilangan Gauss yaqinlashuvi bilan beriladi.
   Sof modul: brauzer obyektlari yo'q. Bo'laklab bajarish (Web Worker / asosiy oqim) uchun createMonteCarlo().
   Natija YAXLITLANMAYDI (yaxlitlash — hisobot qatlamida).
═══════════════════════════════════════════════════════════════ */
import { evaluate, prepareModel } from './evaluate.js';
import { normalize } from './spec.js';
import { getDivisor, valueOrExpr, distParamError } from './typeB.js';
import { toNum } from './util.js';
import { lint } from './linter/index.js';
import { createRng, RNG_DEFAULT, RNG_LEGACY, RNG_NAMES, MC_SEED } from './mc/rng.js';
import {
  makeGauss, sampleT, sampleRect, sampleCTrap, sampleTrap, sampleTriang, sampleArcsine, sampleExp,
  lognormalParams, cholesky, sampleMvn,
} from './mc/distributions.js';
import { monteCarloLegacy } from './mc/legacy.js';

export { MC_SEED, RNG_DEFAULT, RNG_LEGACY, RNG_NAMES };

export const MC_MODES = Object.freeze(['adaptive', 'fixed']);
export const MC_INTERVALS = Object.freeze(['shortest', 'symmetric']);
/** Normal bo'lmagan kirish korrelyatsiyada qatnashsa: 'refuse' — natija berilmaydi (standart); 'gaussian' — guruh
    ko'p o'lchovli Gauss bilan yaqinlashtiriladi va natija shunday belgilanadi (laboratoriya sozlamasi). */
export const MC_NONNORMAL_CORRELATION = Object.freeze(['refuse', 'gaussian']);
/** To'xtash mezoni: 'all' — y, u(y), y_low, y_high (§7.9.4 k); 'interval' — faqat interval uchlari, δ GUM u_c dan.
    'auto' (standart; egasi qarori 2026-11-18, Q-5): ν ≤ 2 bo'lgan t-kirish bo'lsa 'interval', aks holda 'all' —
    ν ≤ 2 da t-taqsimotning dispersiyasi cheksiz (§6.4.9.4), Y ning standart og'ishi mavjud emas (§7.6 Note 2),
    shuning uchun u(y) bo'yicha mezon hech qachon bajarilmaydi; qamrov intervali esa aniqlangan. */
export const MC_CRITERIA = Object.freeze(['auto', 'all', 'interval']);
/** §8 tekshiruvi uchun MCM natijalarining toleransi: δ/5. Ref: JCGM 101:2008 §8.2 (34-bet). Egasi qarori 2026-11-18 (Q-8). */
export const VALIDATION_TOL_DIVISOR = 5;

/** Chegaralar va standart qiymatlar — yagona joy. maxM xotira bilan cheklangan (2·10⁷ × 8 bayt = 160 MB). */
export const MC_LIMITS = Object.freeze({ minM: 10000, maxM: 20000000, minNDig: 1, maxNDig: 4 });
export const MC_DEFAULTS = Object.freeze({
  mode: 'adaptive',          // egasi qarori: standart — adaptiv
  nDig: 2,                   // egasi qarori (Q-3): n_dig = 2
  M: 1000000,                // qat'iy rejim uchun
  maxM: 10000000,            // adaptiv rejimning yuqori chegarasi
  interval: 'shortest',
  rng: RNG_DEFAULT,
  seed: MC_SEED,
  validation: true,          // GUM natijasini tekshirish (§8). false — oddiy MCM: tolerans δ, xulosa (validated) berilmaydi
  tolDivisor: null,          // null → validation ? 5 (§8.2: δ/5) : 1. validation da 1 … 5 dan kichik qiymat — laboratoriya
                             // sozlamasi ("δ ga tushirish"): natijada validation.lowered, hisobotda belgi
  criteria: 'auto',
  nonNormalCorrelation: 'refuse',
});

/**
 * Sonli tolerans δ = ½·10^l, bunda z = c·10^l, c — n_dig xonali butun son.
 * Ref: JCGM 101:2008 §7.9.2, Eq. (18) (31-bet). Misollar: u = 0,000 35, n_dig = 2 → δ = 0,000 005;
 *      u = 0,000 35, n_dig = 1 → 0,000 4 → δ = 0,000 05; u = 2 K, n_dig = 1 → δ = 0,5 K.
 */
export function numericalTolerance(z, nDig) {
  const a = Math.abs(z);
  if (!(a > 0) || !isFinite(a)) return 0;
  const n = Math.max(1, Math.round(nDig) || 1);
  const exp = a.toExponential(n - 1).split('e')[1];        // avval n_dig qiymatli raqamgacha yaxlitlanadi (0,000 35 → 4·10⁻⁴)
  const l = Number(exp) - (n - 1);
  return Number('5e' + (l - 1));
}

/**
 * Qamrov intervallari. y — o'sish tartibida saralangan n ta qiymat.
 * Ref: JCGM 101:2008 §7.7.2 (30-bet): q = pM (butun bo'lsa), aks holda ⌊pM + ½⌋; [y_(r), y_(r+q)], r = 1…M − q.
 *   Simmetrik: r = (M − q)/2 (butun bo'lsa), aks holda ⌊(M − q + 1)/2⌋. Eng qisqa: y_(r+q) − y_(r) eng kichik bo'lgan r.
 * @returns {{q:number, symLow:number, symHigh:number, low:number, high:number, rSym:number, rShort:number}}
 */
export function coverageIntervals(y, n, P) {
  const pM = P * n;
  let q = Math.abs(pM - Math.round(pM)) < 1e-9 * n ? Math.round(pM) : Math.floor(pM + 0.5);
  q = Math.min(Math.max(q, 1), n - 1);
  const m = n - q;
  const rSym = Math.max(1, m % 2 === 0 ? m / 2 : Math.floor((m + 1) / 2));
  let rShort = 1, best = y[q] - y[0];
  for (let r = 2; r <= m; r++) {
    const len = y[r + q - 1] - y[r - 1];
    if (len < best) { best = len; rShort = r; }
  }
  return { q, rSym, rShort, symLow: y[rSym - 1], symHigh: y[rSym + q - 1], low: y[rShort - 1], high: y[rShort + q - 1] };
}

/* ── Sozlamalar ─────────────────────────────────────────────────── */

/**
 * Sozlamalarni birlashtirish: MC_DEFAULTS ← state.settings.mc (laboratoriya / hisob sozlamasi) ← opts.
 * opts son bo'lsa — qat'iy M (eski imzo monteCarlo(spec, M) bilan moslik).
 * @returns {{error?:string, detail?:string}|object}
 */
export function mcOptions(settings, opts) {
  const lab = (settings && settings.mc) || {};
  const o = typeof opts === 'number' ? { mode: 'fixed', M: opts } : (opts || {});
  const pick = k => (o[k] !== undefined && o[k] !== null && o[k] !== '' ? o[k] : (lab[k] !== undefined && lab[k] !== null && lab[k] !== '' ? lab[k] : MC_DEFAULTS[k]));
  const out = {
    mode: pick('mode'), interval: pick('interval'), rng: pick('rng'), seed: pick('seed'),
    criteria: pick('criteria'), nonNormalCorrelation: pick('nonNormalCorrelation'),
    nDig: Number(pick('nDig')), M: Number(pick('M')), maxM: Number(pick('maxM')),
    validation: pick('validation') !== false && pick('validation') !== 'false',
    onProgress: typeof o.onProgress === 'function' ? o.onProgress : null,
    shouldCancel: typeof o.shouldCancel === 'function' ? o.shouldCancel : null,
  };
  if (typeof out.seed === 'string' && /^\d+$/.test(out.seed.trim())) out.seed = Number(out.seed.trim());
  const bad = k => ({ error: 'mc_bad_option', detail: k });
  if (!MC_MODES.includes(out.mode)) return bad('mode');
  if (!MC_INTERVALS.includes(out.interval)) return bad('interval');
  if (!RNG_NAMES.includes(out.rng)) return bad('rng');
  if (!MC_CRITERIA.includes(out.criteria)) return bad('criteria');
  if (!MC_NONNORMAL_CORRELATION.includes(out.nonNormalCorrelation)) return bad('nonNormalCorrelation');
  if (!Number.isInteger(out.nDig) || out.nDig < MC_LIMITS.minNDig || out.nDig > MC_LIMITS.maxNDig) return bad('nDig');
  // Ref: JCGM 101:2008 §8.2 — tekshiruv uchun δ/5; oddiy MCM (§7.9.4) — δ
  const td = pick('tolDivisor');
  out.tolDivisor = td === null || td === undefined ? (out.validation ? VALIDATION_TOL_DIVISOR : 1) : Number(td);
  if (!(out.tolDivisor >= 1) || !isFinite(out.tolDivisor)) return bad('tolDivisor');
  if (!isFinite(out.M) || !isFinite(out.maxM)) return bad('M');
  out.M = Math.max(MC_LIMITS.minM, Math.min(MC_LIMITS.maxM, Math.round(out.M)));
  out.maxM = Math.max(2 * MC_LIMITS.minM, Math.min(MC_LIMITS.maxM, Math.round(out.maxM)));
  return out;
}

/* ── Tanlash rejasi ─────────────────────────────────────────────── */

const finitePos = v => isFinite(v) && v > 0;

/**
 * Har bir kirish uchun tanlash qismlari. X_i = x_i + (A tur qismi) + Σ (B tur manbalari); har bir qism — o'rtachasi 0.
 * @returns {{error?:string, detail?:string, inputs?:object[]}}
 */
function buildPlan(state, res) {
  const params = state.params || [];
  const means = {};
  res.inputs.forEach(i => { means[i.name] = i.mean; });
  const out = res.inputs.map(inp => {
    const parts = [];
    if (inp.uA > 0) {
      // Ref: JCGM 101:2008 §6.4.9.2, §6.4.9.5 — bir qator kuzatuvlar: t_ν(x̄, s²/n), ν = n − 1; ξ = x̄ + (s/√n)·t.
      //      §6.4.9.6 — oldindan ma'lum s_p: ν = ν_p (usul 2).
      let scale = inp.uA, nu = inp.nu;
      if (inp.method === 3 && !isFinite(inp.nu) && inp.n >= 4) {
        // Usul 3 (kichik tanlama): GUF da u_A = s/√n·√((n−1)/(n−3)), ν = ∞ — bu aynan t_{n−1}(x̄, s²/n) ning standart
        // og'ishi (§6.4.9.4, Eq. 13). MCM da shu t-taqsimotning o'zi olinadi: masshtab s/√n, ν = n − 1 (↑/↓ da n − 2).
        // LOYIHA QARORI (egasi tasdig'ini kutadi): avvalgi versiyada N(0, u_A²) olinar edi.
        scale = inp.sEff / Math.sqrt(inp.n);
        nu = inp.directional ? inp.n - 2 : inp.n - 1;
      }
      parts.push({ kind: 'A', dist: isFinite(nu) ? 't' : 'normal', scale, nu, mult: 1 });
    }
    return { name: inp.name, mean: inp.mean, u: inp.u, parts };
  });
  const byName = Object.fromEntries(out.map(i => [i.name, i]));
  for (const c of (state.typeB || [])) {
    const param = params.includes(c.param) ? c.param : params[0];
    const mult = (c.sensitivity === undefined || c.sensitivity === null || c.sensitivity === '') ? 1 : Number(c.sensitivity) || 0;
    const a = Math.abs(valueOrExpr(c.halfWidth, params, means));
    if (distParamError(a, c.distribution, c)) return { error: 'bad_dist_param', detail: c.name };
    const nu = toNum(c.nu);
    const p = { kind: 'B', name: c.name, dist: c.distribution || 'rect', a, mult };
    if (p.dist === 'normal' || p.dist === 'lognorm') {
      p.scale = a / getDivisor(p.dist, c.k);
      // Ref: JCGM 101:2008 §6.4.9.7 — sertifikat: x, U_p, k_p, ν_eff → t_ν(x, (U_p/k_p)²); §6.4.9.8 — ν yo'q / ∞ → N(x, (U_p/k_p)²)
      if (p.dist === 'normal' && finitePos(nu)) { p.dist = 't'; p.nu = nu; }
    }
    if (p.dist === 'lognorm') {
      const ln = lognormalParams(byName[param].mean, p.scale);
      if (!ln) return { error: 'mc_lognormal_nonpositive', detail: c.name };
      p.mu = ln.mu; p.sigma = ln.sigma; p.x = byName[param].mean;
    }
    if (p.dist === 'trap') p.beta = Number(c.beta);
    if (p.dist === 'ctrap') p.d = Number(c.d);
    if (a > 0 && mult !== 0) byName[param].parts.push(p);
  }
  // ↑/↓ o'qishlardan histerezis: to'g'ri burchakli, yarim kenglik h/2 (evaluate.js bilan bir xil). Ref: JCGM 100:2008 §4.3.7
  res.inputs.forEach(inp => {
    if (inp.directional && inp.h > 0) byName[inp.name].parts.push({ kind: 'B', name: 'hysteresis', dist: 'rect', a: inp.h / 2, mult: 1, auto: true });
  });
  return { inputs: out };
}

/** Qism uchun tanlash funksiyasi (o'rtachasi 0). */
function partSampler(p, u, gauss) {
  const m = p.mult, a = p.a;
  switch (p.dist) {
    // Ref: JCGM 101:2008 §6.4.7.4, C.4 — ξ = x + u(x)·z
    case 'normal': { const s = m * p.scale; return () => s * gauss(); }
    // Ref: JCGM 101:2008 §6.4.9.5 — ξ = x̄ + (s/√n)·t, t ~ t_ν (C.6)
    case 't': { const s = m * p.scale, nu = p.nu; return () => s * sampleT(u, nu); }
    case 'triang': return () => m * sampleTriang(u, -a, a);
    case 'ushape': return () => m * sampleArcsine(u, -a, a);
    // rezolyutsiya: a — diskretlik, yarim kenglik a/2. Ref: JCGM 100:2008 F.2.2.1; JCGM 101:2008 §6.4.2
    case 'resol': return () => m * sampleRect(u, -a / 2, a / 2);
    case 'trap': { const b = p.beta; return () => m * sampleTrap(u, -a, a, b); }
    case 'ctrap': { const d = p.d; return () => m * sampleCTrap(u, -a, a, d); }
    // Ref: JCGM 101:2008 §6.4.10 — Ex(1/x), E = x; manba o'rtachasi 0 ga siljitiladi (x kirish bahosiga qo'shiladi)
    case 'exp': return () => m * (sampleExp(u, a) - a);
    // log-normal (JCGM 101 da yo'q — unverified): E = x, V = (a/k)²
    case 'lognorm': { const mu = p.mu, sg = p.sigma, x = p.x; return () => m * (Math.exp(mu + sg * gauss()) - x); }
    default: return () => m * sampleRect(u, -a, a);   // 'rect' va noma'lum nom (evaluate.js dagi kabi)
  }
}

const isGaussianInput = inp => inp.parts.every(p => p.dist === 'normal');

/** Korrelyatsiya guruhlari (bog'langan komponentlar). */
function correlationGroups(res) {
  const names = res.inputs.map(i => i.name);
  const parent = names.map((_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const cov = {};
  for (const p of res.pairs) {
    if (p.cov === 0) continue;
    const i = names.indexOf(p.a), j = names.indexOf(p.b);
    parent[find(i)] = find(j);
    cov[i + ',' + j] = cov[j + ',' + i] = p.cov;
  }
  const groups = {};
  names.forEach((_, i) => { const r = find(i); (groups[r] = groups[r] || []).push(i); });
  return Object.values(groups).filter(g => g.length > 1).map(idx => ({ idx, cov }));
}

/* ── Bajaruvchi ─────────────────────────────────────────────────── */

/**
 * Monte-Karlo bajaruvchisi: bo'laklab (bloklab) ishlaydi — Web Worker va asosiy oqim uchun bir xil.
 * @param {object} spec  modelSpec (evaluate bilan bir xil)
 * @param {object|number} [opts]  mcOptions() ga qarang
 * @returns {{error:string}|{step:(maxBlocks?:number)=>object, result:()=>object, options:object, blockSize:number}}
 */
export function createMonteCarlo(spec, opts) {
  const norm = normalize(spec);
  if (norm.error) return { error: norm.error, detail: norm.detail };
  const state = norm.state;
  const o = mcOptions(state.settings, opts);
  if (o.error) return o;

  // Eski generator: faqat eski natijani takrorlash uchun (qat'iy M, korrelyatsiyasiz) — mc/legacy.js o'zgarishsiz
  if (o.rng === RNG_LEGACY) {
    let done = null;
    const run = () => {
      if (!done) {
        const r = monteCarloLegacy(spec, o.M);
        done = r.error ? r : finishLegacy(spec, r);
      }
      return done;
    };
    return { options: o, blockSize: o.M, step: () => { const r = run(); return { done: true, M: r.M || 0, target: r.M || 0, progress: 1 }; }, result: run };
  }

  const res = evaluate(spec);
  if (res.error) return res;
  const rng = createRng(o.rng, o.seed);
  if (!rng) return { error: 'mc_bad_option', detail: 'seed' };
  let plan;
  try { plan = buildPlan(state, res); }
  catch (_) { return { error: 'bad_halfwidth' }; }
  if (plan.error) return plan;
  const inputs = plan.inputs;
  const { f } = prepareModel(state);
  const u = rng.next;
  const gauss = makeGauss(u);

  // Korrelyatsiya. Ref: JCGM 101:2008 §6.4.8 (N(x, U_x)), C.5 (Table C.4), §9.4.3.1.3
  const groups = correlationGroups(res);
  const grouped = new Set();
  const corr = [];
  for (const g of groups) {
    const names = g.idx.map(i => inputs[i].name);
    const gaussian = g.idx.every(i => isGaussianInput(inputs[i]));
    if (!gaussian && o.nonNormalCorrelation !== 'gaussian') {
      const nonNormal = g.idx.filter(i => !isGaussianInput(inputs[i])).map(i => inputs[i].name);
      // Normal bo'lmagan kirish korrelyatsiyada: JCGM 101 faqat ko'p o'lchovli Gauss uchun tanlash usulini beradi
      // (§6.4.8.4 Note) — natija berilmaydi (copula va shunga o'xshash usullar qo'shilmagan; egasi qarori).
      const info = { mode: 'MC', error: 'mc_nonnormal_correlation', detail: nonNormal.join(', '),
                     correlation: { handled: false, groups: [{ inputs: names, nonNormal, method: 'refused' }] } };
      info.findings = lint(spec, info);
      return info;
    }
    const V = g.idx.map(i => g.idx.map(j => (i === j ? inputs[i].u * inputs[i].u : (g.cov[i + ',' + j] || 0))));
    const R = cholesky(V);
    // Kovariatsiya matritsasi musbat (yarim) aniqlanmagan — jimgina tuzatilmaydi (C.5.2 Note 2 dagi "repair" yo'q)
    if (!R) return { error: 'invalid_covariance', detail: names.join(', ') };
    g.idx.forEach(i => grouped.add(i));
    corr.push({ idx: g.idx, R, z: new Float64Array(g.idx.length), out: new Float64Array(g.idx.length),
                info: { inputs: names, method: gaussian ? 'mvn' : 'gaussian-approx',
                        nonNormal: g.idx.filter(i => !isGaussianInput(inputs[i])).map(i => inputs[i].name) } });
  }

  const single = inputs.map((inp, i) => (grouped.has(i) ? null : { name: inp.name, mean: inp.mean, samplers: inp.parts.map(p => partSampler(p, u, gauss)) }))
    .filter(Boolean);
  const env = {};
  inputs.forEach(inp => { env[inp.name] = inp.mean; });

  // Dispersiyasi mavjud bo'lmagan kirish: t-taqsimot, ν ≤ 2. Ref: JCGM 101:2008 §6.4.9.4 (V(X) faqat ν > 2 da),
  //      §7.6 Note 2 (30-bet), C.6 Note (63-bet). Bunday kirish bo'lsa u(y) aniqlanmagan — faqat qamrov intervali.
  const heavy = [];
  inputs.forEach((inp, i) => inp.parts.forEach(p => {
    if (p.dist === 't' && p.nu <= 2 && !grouped.has(i)) heavy.push({ input: inp.name, source: p.kind === 'A' ? '' : p.name, nu: p.nu });
  }));
  const criteria = o.criteria === 'auto' ? (heavy.length ? 'interval' : 'all') : o.criteria;

  const P = res.P;
  // Ref: JCGM 101:2008 §7.9.4 b) — M = max(J, 10⁴), J — 100/(1 − p) dan kichik bo'lmagan eng kichik butun son
  const blockSize = Math.max(Math.ceil(100 / (1 - P) - 1e-9), 10000);
  const adaptive = o.mode === 'adaptive';
  const target = adaptive ? o.maxM : o.M;
  let cap = Math.min(target, Math.max(16 * blockSize, adaptive ? 0 : target));
  let ys = new Float64Array(cap);
  const scratch = new Float64Array(blockSize);
  let n = 0, nonFinite = 0, finished = false, converged = false, reachedMax = false, cancelled = false;
  const blocks = { mean: [], u: [], low: [], high: [], ss: [], n: [] };
  let stat = null;      // {sy, su, slow, shigh, delta, ratio}

  /** Bitta blok: h-chi MCM qo'llanishi (§7.9.4 d, e) */
  function runBlock(size) {
    if (n + size > cap) {
      cap = Math.min(target, Math.max(cap * 2, n + size));
      const grown = new Float64Array(cap);
      grown.set(ys.subarray(0, n));
      ys = grown;
    }
    const ns = single.length, ng = corr.length;
    for (let t = 0; t < size; t++) {
      for (let i = 0; i < ns; i++) {
        const s = single[i], sm = s.samplers;
        let x = s.mean;
        for (let k = 0; k < sm.length; k++) x += sm[k]();
        env[s.name] = x;
      }
      for (let gi = 0; gi < ng; gi++) {
        const g = corr[gi];
        // Ref: JCGM 101:2008 Table C.4 c) — X = μ + Rᵀz
        sampleMvn(gauss, g.R, g.z, g.out);
        for (let k = 0; k < g.idx.length; k++) { const inp = inputs[g.idx[k]]; env[inp.name] = inp.mean + g.out[k]; }
      }
      // Ref: JCGM 101:2008 §7.4.1 — y_r = f(x_r)
      const y = f(env);
      if (!isFinite(y)) nonFinite++;
      ys[n + t] = y;
    }
    if (nonFinite) return;
    // Ref: JCGM 101:2008 §7.6, Eq. (16), (17) — ỹ = (1/M)Σy_r; u²(ỹ) = 1/(M − 1)·Σ(y_r − ỹ)² (Note 1: aynan shu shakl)
    let sum = 0;
    for (let t = 0; t < size; t++) sum += ys[n + t];
    const mean = sum / size;
    let ss = 0;
    for (let t = 0; t < size; t++) { const d = ys[n + t] - mean; ss += d * d; }
    blocks.n.push(size); blocks.mean.push(mean); blocks.ss.push(ss);
    if (size === blockSize) {
      scratch.set(ys.subarray(n, n + size));
      scratch.sort();
      const ci = coverageIntervals(scratch, size, P);
      blocks.u.push(Math.sqrt(ss / (size - 1)));
      blocks.low.push(o.interval === 'shortest' ? ci.low : ci.symLow);
      blocks.high.push(o.interval === 'shortest' ? ci.high : ci.symHigh);
    }
    n += size;
  }

  /** Barcha h × M qiymat bo'yicha ỹ va u(ỹ) (§7.9.4 i) — bloklar bo'yicha yig'ilgan, ayirishdagi yo'qotishsiz */
  function pooled() {
    let tot = 0, sum = 0;
    for (let b = 0; b < blocks.n.length; b++) { tot += blocks.n[b]; sum += blocks.n[b] * blocks.mean[b]; }
    const mean = sum / tot;
    let ss = 0;
    for (let b = 0; b < blocks.n.length; b++) { const d = blocks.mean[b] - mean; ss += blocks.ss[b] + blocks.n[b] * d * d; }
    return { mean, u: tot > 1 ? Math.sqrt(ss / (tot - 1)) : 0 };
  }

  // Ref: JCGM 101:2008 §7.9.4 g), h) — s_z² = 1/(h(h − 1))·Σ(z^(r) − z̄)², z = y, u(y), y_low, y_high
  const sOfMean = arr => {
    const h = arr.length;
    if (h < 2) return NaN;
    let m = 0;
    for (const v of arr) m += v;
    m /= h;
    let ss = 0;
    for (const v of arr) ss += (v - m) * (v - m);
    return Math.sqrt(ss / (h * (h - 1)));
  };

  function stabilization() {
    const h = blocks.u.length;
    if (h < 2) return null;
    const full = blocks.mean.slice(0, h);
    const s = { y: sOfMean(full), u: sOfMean(blocks.u), low: sOfMean(blocks.low), high: sOfMean(blocks.high) };
    // Ref: JCGM 101:2008 §7.9.4 i), j) — δ barcha qiymatlardan olingan u(y) uchun (§7.9.2);
    //      'interval' mezoni: δ GUM u_c(y) dan (u(y) mavjud bo'lmasligi mumkin — §7.6 Note 2)
    const uRef = criteria === 'interval' ? res.uc : pooled().u;
    const delta = numericalTolerance(uRef, o.nDig) / o.tolDivisor;
    // Ref: JCGM 101:2008 §7.9.4 k) — 2s_y, 2s_u(y), 2s_ylow, 2s_yhigh ning birortasi δ dan katta bo'lsa davom etiladi
    const worst = criteria === 'interval' ? Math.max(s.low, s.high) : Math.max(s.y, s.u, s.low, s.high);
    return { s, uRef, delta, worst, ok: 2 * worst <= delta, ratio: delta > 0 ? 2 * worst / delta : (worst > 0 ? Infinity : 0) };
  }

  function step(maxBlocks) {
    let budget = maxBlocks > 0 ? maxBlocks : 1;
    while (!finished && budget-- > 0) {
      if (o.shouldCancel && o.shouldCancel()) { cancelled = true; finished = true; break; }
      const size = Math.min(blockSize, target - n);
      runBlock(size);
      if (nonFinite) { finished = true; break; }
      stat = stabilization();
      if (adaptive) {
        // §7.9.4 f): h = 1 bo'lsa keyingi blok; k), l): barqarorlashgan bo'lsa to'xtaydi
        if (stat && stat.ok) { converged = true; finished = true; }
        else if (n + blockSize > target) { reachedMax = true; finished = true; }
      } else if (n >= target) finished = true;
    }
    // Kutilayotgan M (faqat ko'rsatkich): s ~ h^(−1/2) (§7.9.4 Note 4) → M_kerak ≈ M·(2s/δ)²
    let expected = target;
    if (adaptive && stat && isFinite(stat.ratio)) expected = Math.min(target, Math.max(n, Math.ceil(n * stat.ratio * stat.ratio)));
    const info = { done: finished, M: n, target, expected, blocks: blocks.n.length, progress: finished ? 1 : Math.min(0.99, n / expected),
                   ratio: stat ? stat.ratio : null };
    if (o.onProgress) o.onProgress(info);
    return info;
  }

  function result() {
    while (!finished) step(1);                          // har blokdan keyin: progress va bekor qilish tekshiruvi
    if (cancelled) return { error: 'mc_cancelled', mode: 'MC', M: n };
    // Model qiymati aniqlanmagan (masalan, manfiy sondan ildiz) — natija berilmaydi
    if (nonFinite) return { error: 'mc_nonfinite', mode: 'MC', detail: String(nonFinite), M: n + Math.min(blockSize, target - n) };
    const all = pooled();
    const sorted = ys.subarray(0, n);
    sorted.sort();                                      // §7.5.1: y_(r) — o'sish tartibida
    const ci = coverageIntervals(sorted, n, P);
    const shortest = o.interval === 'shortest';
    const low = shortest ? ci.low : ci.symLow, high = shortest ? ci.high : ci.symHigh;
    // Ref: JCGM 101:2008 §8.1.3 — a) δ (§7.9.2); b) d_low = |y − U_p − y_low| (19), d_high = |y + U_p − y_high| (20);
    //      ikkalasi ham δ dan katta bo'lmasa GUM natijasi tasdiqlanadi. δ — GUM u_c(y) dan, n_dig bo'yicha.
    const delta = numericalTolerance(res.uc, o.nDig);
    const dLow = Math.abs(res.y - res.U - low), dHigh = Math.abs(res.y + res.U - high);
    // Yetilgan n_dig: 2·max(s) ≤ δ(n_dig) bajariladigan eng katta n_dig (0 — hatto 1 ta raqam ham ta'minlanmagan)
    let nDigAchieved = null;
    if (stat && all.u > 0 && stat.uRef > 0) {
      nDigAchieved = 0;
      for (let d = 1; d <= MC_LIMITS.maxNDig + 2; d++) {
        if (2 * stat.worst <= numericalTolerance(stat.uRef, d)) nDigAchieved = d; else break;
      }
    }
    const uDefined = heavy.length === 0;
    // §8 tekshiruvi (egasi qarori Q-8): MCM natijalari δ/5 toleransga yetgan bo'lishi kerak (§8.2); yetilmagan bo'lsa
    // erishilgan tolerans (2·max s) natijada va hisobotda. Oddiy MCM (validation: false) — xulosa berilmaydi.
    const required = stat ? stat.delta : null, achieved = stat ? 2 * stat.worst : null;
    const validation = {
      requested: o.validation, tolDivisor: o.tolDivisor, required, achieved,
      met: stat ? stat.ok : null,
      lowered: o.validation && o.tolDivisor < VALIDATION_TOL_DIVISOR,
    };
    const out = {
      engineVersion: res.engineVersion, mode: 'MC',
      rng: { name: rng.name, seed: o.seed }, seed: o.seed,
      M: n, blocks: blocks.n.length, blockSize, P,
      mean: all.mean, u: uDefined ? all.u : null, uSample: all.u, uDefined,
      interval: o.interval, low: ci.low, high: ci.high, symLow: ci.symLow, symHigh: ci.symHigh,
      intervalLow: low, intervalHigh: high, mcHalf: (high - low) / 2,
      adaptive: {
        enabled: adaptive, nDig: o.nDig, maxM: adaptive ? o.maxM : null, tolDivisor: o.tolDivisor, criteria, criteriaAuto: o.criteria === 'auto',
        converged: adaptive ? converged : null, reachedMax: adaptive ? reachedMax : false, nDigAchieved,
        delta: stat ? stat.delta : null, s: stat ? stat.s : null,
      },
      nDig: o.nDig, nDigAchieved,
      gumLow: res.y - res.U, gumHigh: res.y + res.U, gumU: res.U, gumY: res.y, gumUc: res.uc,
      delta, dLow, dHigh, validated: o.validation ? dLow <= delta && dHigh <= delta : null, validation,
      correlated: corr.length > 0,
      correlation: { handled: true, groups: corr.map(g => g.info) },
      varianceUndefined: heavy,
      sampling: inputs.map((inp, i) => ({
        input: inp.name, joint: grouped.has(i),
        parts: inp.parts.map(p => ({ kind: p.kind, name: p.name || '', dist: p.dist, ...(p.nu !== undefined && isFinite(p.nu) ? { nu: p.nu } : {}) })),
      })),
      unit: res.unit, symbol: res.symbol,
    };
    out.findings = lint(spec, out);
    return out;
  }

  return { options: o, blockSize, step, result };
}

function finishLegacy(spec, r) {
  // 2.5.0: tekshiruv eng qisqa interval bo'yicha, δ — n_dig = 2; sonli maydonlar o'zgarmagan
  const out = {
    ...r, mode: 'MC', legacy: true,
    rng: { name: RNG_LEGACY, seed: r.seed },
    blocks: 1, blockSize: r.M, interval: 'shortest', intervalLow: r.low, intervalHigh: r.high,
    uSample: r.u, uDefined: true, validation: { requested: true, tolDivisor: 1, required: null, achieved: null, met: null, lowered: false },
    adaptive: { enabled: false, nDig: 2, maxM: null, tolDivisor: 1, criteria: 'all', criteriaAuto: false, converged: null, reachedMax: false, nDigAchieved: null, delta: null, s: null },
    nDig: 2, nDigAchieved: null,
    correlation: { handled: false, groups: [] },
    varianceUndefined: [], sampling: [],
  };
  out.findings = lint(spec, out);
  return out;
}

/**
 * Monte-Karlo (bir chaqiruvda, sinxron). Node testlari va oddiy foydalanish uchun; brauzerda — src/ui/mc/ (Web Worker).
 * @param {object} spec           modelSpec (evaluate bilan bir xil)
 * @param {object|number} [opts]  { mode:'adaptive'|'fixed', M, maxM, nDig, interval, seed, rng, validation, tolDivisor, criteria,
 *                                  nonNormalCorrelation, onProgress, shouldCancel }; son — qat'iy M
 */
export function monteCarlo(spec, opts) {
  const run = createMonteCarlo(spec, opts);
  if (run.error) return run;
  return run.result();
}
