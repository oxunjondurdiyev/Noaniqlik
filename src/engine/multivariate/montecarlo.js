/* ═══════════════════════════════════════════════════════════════
   MULTIVARIATE/MONTECARLO.JS — vektor chiqish uchun Monte-Karlo (P07). Sof modul.
   Manba: JCGM 102:2011 §7 (7.6 — y va U_y; 7.7.2 — gipper-ellipsoid; 7.7.3 — gipper-to'rtburchak; 7.8 — adaptiv
   protsedura), §8 (GUM natijasini tekshirish).
   Generator, taqsimotlar va tanlovchi — P06 dagi (montecarlo.js::createSampler, mc/rng.js); yangi generator yo'q.
   Eng kichik qamrov sohasi (§7.7.4) — faqat ikki chiqish (m = 2) uchun (region.js::smallestRegion, P07b); m > 2 — yo'q (docs/RISKS.md).
═══════════════════════════════════════════════════════════════ */
import { prepareModel } from '../evaluate.js';
import { createRng, RNG_LEGACY } from '../mc/rng.js';
import { lint } from '../linter/index.js';
import { mcOptions, createSampler, numericalTolerance, coverageIntervals, MC_LIMITS, VALIDATION_TOL_DIVISOR } from '../montecarlo.js';
import { singleState } from './lpu.js';
import { choleskyLower, solveLower, symEigen, correlationMatrix, zeros } from './linalg.js';
import { rectangleFactor, smallestRegion, SINGULAR_RATIO, SMALLEST_MESH } from './region.js';

/** §7.8.3 f): dastlabki bloklar soni — h ≤ 10 da to'xtash tekshirilmaydi (barvaqt "yaqinlashish"ning oldini oladi, Note 3) */
export const MIN_BLOCKS = 10;
/** Xotira chegarasi: m ta chiqish + masofa massivi, har biri 8 bayt (jami ≈ 160 MB dan oshmaydi) */
export const maxTrialsFor = m => Math.floor(MC_LIMITS.maxM / (m + 1));

/** p ulushdagi nuqtalar d_r < k shartini qanoatlantiradigan k (saralangan d dan). Ref: JCGM 102:2011 §7.7.2 c), §7.7.3 c) */
function factorFromDistances(d, n, P) {
  const s = d.subarray(0, n);
  s.sort();
  const q = Math.min(Math.max(Math.round(P * n), 1), n);
  return s[q - 1];
}

/**
 * Nuqtalar to'plamidan y, U_y, R_y, λ_max, k_p, k_q.
 * @param {Float64Array[]} Y  m ta massiv; [from, from + n) oralig'i ishlatiladi
 */
function summarize(Y, from, n, P, dist, work) {
  const m = Y.length;
  const y = new Array(m).fill(0);
  // Ref: JCGM 102:2011 §7.6 — ỹ = (1/M)·Σ y_r;  U_ỹ = 1/(M − 1)·Σ (y_r − ỹ)(y_r − ỹ)ᵀ
  for (let j = 0; j < m; j++) { let s = 0; const a = Y[j]; for (let r = from; r < from + n; r++) s += a[r]; y[j] = s / n; }
  const SS = zeros(m, m);
  for (let j = 0; j < m; j++) {
    for (let k = j; k < m; k++) {
      let s = 0; const a = Y[j], b = Y[k], ya = y[j], yb = y[k];
      for (let r = from; r < from + n; r++) s += (a[r] - ya) * (b[r] - yb);
      SS[j][k] = s; SS[k][j] = s;
    }
  }
  const U = SS.map(row => row.map(v => v / (n - 1)));
  return { y, SS, ...factors(Y, from, n, P, y, U, dist, work) };
}

/** U_y va y berilganda: u, R_y, λ_max, k_p (7.7.2), k_q (7.7.3) */
function factors(Y, from, n, P, y, U, dist, work) {
  const m = Y.length;
  const u = U.map((row, j) => Math.sqrt(Math.max(row[j], 0)));
  const R = correlationMatrix(U);
  const eig = symEigen(R);
  const lambdaMax = eig.values[0], lambdaMin = eig.values[m - 1];
  // Ref: JCGM 102:2011 §7.7.2 a)–c): ẙ_r = L⁻¹(y_r − y), U_y = LLᵀ; d_r² = ẙ_rᵀẙ_r; k_p — p ulush d_r < k_p
  let kp = null;
  const L = lambdaMin > SINGULAR_RATIO * lambdaMax ? choleskyLower(U) : null;   // singular U_y (§7.8.1.2 Note 6) — ellipsoid aniqlanmagan
  if (L) {
    const b = work.b, z = work.z;
    for (let r = 0; r < n; r++) {
      for (let j = 0; j < m; j++) b[j] = Y[j][from + r] - y[j];
      solveLower(L, b, z);
      let d2 = 0;
      for (let j = 0; j < m; j++) d2 += z[j] * z[j];
      dist[r] = Math.sqrt(d2);
    }
    kp = factorFromDistances(dist, n, P);
  }
  // Ref: JCGM 102:2011 §7.7.3 a)–c): L = diag(u(y_j)); d_r = max_j |ẙ_j,r|; k_q — p ulush d_r < k_q
  let kq = null;
  if (u.every(v => v > 0)) {
    for (let r = 0; r < n; r++) {
      let d = 0;
      for (let j = 0; j < m; j++) { const v = Math.abs(Y[j][from + r] - y[j]) / u[j]; if (v > d) d = v; }
      dist[r] = d;
    }
    kq = factorFromDistances(dist, n, P);
  }
  return { u, R, lambdaMax, lambdaMin, kp, kq };
}

// Ref: JCGM 102:2011 §7.8.3 g), h) — s_z² = 1/(h(h − 1))·Σ (z^(r) − z̄)²
function sOfMean(arr) {
  const h = arr.length;
  if (h < 2) return NaN;
  let mu = 0;
  for (const v of arr) mu += v;
  mu /= h;
  let ss = 0;
  for (const v of arr) ss += (v - mu) * (v - mu);
  return Math.sqrt(ss / (h * (h - 1)));
}

/**
 * Vektor chiqish uchun Monte-Karlo bajaruvchisi (bloklab — Web Worker va asosiy oqim uchun bir xil).
 * @param {object} spec   modelSpec (asl)
 * @param {object} state  normallashtirilgan holat (outputs[] bilan)
 * @param {object|number} opts  montecarlo.js::mcOptions
 * @param {(spec:object)=>object} evaluate  LPU baholash (siklik importdan qochish uchun uzatiladi)
 */
export function createMultivariateMonteCarlo(spec, state, opts, evaluate) {
  const o = mcOptions(state.settings, opts);
  if (o.error) return o;
  if (o.rng === RNG_LEGACY) return { error: 'mc_bad_option', detail: 'rng' };   // eski generator faqat bitta chiqishli eski hisoblar uchun
  // P07b: eng kichik qamrov sohasi to'ri (§7.7.4 b); sozlama: opts.smallestMesh yoki settings.mc.smallestMesh; 0 / false — hisoblanmaydi
  const meshRaw = opts && typeof opts === 'object' && opts.smallestMesh !== undefined && opts.smallestMesh !== null && opts.smallestMesh !== ''
    ? opts.smallestMesh : ((state.settings && state.settings.mc && state.settings.mc.smallestMesh !== undefined && state.settings.mc.smallestMesh !== '') ? state.settings.mc.smallestMesh : SMALLEST_MESH.default);
  const mesh = meshRaw === false ? 0 : Number(meshRaw);
  if (!Number.isInteger(mesh) || (mesh !== 0 && (mesh < SMALLEST_MESH.min || mesh > SMALLEST_MESH.max))) return { error: 'mc_bad_option', detail: 'smallestMesh' };
  const lpu = evaluate(spec);
  if (lpu.error) return lpu;
  const m = lpu.m;
  const rng = createRng(o.rng, o.seed);
  if (!rng) return { error: 'mc_bad_option', detail: 'seed' };
  const st0 = singleState(state, 0);
  const smp = createSampler(spec, st0, lpu.results[0], o, rng);
  if (smp.error) return smp;
  const fs = state.outputs.map((_, j) => prepareModel(singleState(state, j)).f);
  const env = smp.env, draw = smp.draw;
  const uDefined = smp.heavy.length === 0;

  const P = lpu.P;
  // Ref: JCGM 102:2011 §7.8.3 b) — M = max(J, 10⁴), J — 100/(1 − p) dan kichik bo'lmagan eng kichik butun son
  const blockSize = Math.max(Math.ceil(100 / (1 - P) - 1e-9), 10000);
  // ν ≤ 2 (dispersiya mavjud emas): u(y), R_y, k_p barqarorlashmaydi (§7.8.3 Note 1) — adaptiv protsedura qo'llanilmaydi,
  // qat'iy M; natijada faqat har bir chiqishning qamrov intervallari (egasi qarori Q-5 ning vektor ko'rinishi)
  const adaptive = o.mode === 'adaptive' && uDefined;
  const hardCap = Math.max(2 * blockSize, maxTrialsFor(m));
  const target = Math.min(adaptive ? o.maxM : o.M, hardCap);
  let cap = Math.min(target, adaptive ? 16 * blockSize : target);
  let Y = fs.map(() => new Float64Array(cap));
  const dist = new Float64Array(blockSize);
  const work = { b: new Float64Array(m), z: new Float64Array(m) };
  let n = 0, nonFinite = 0, finished = false, converged = false, reachedMax = false, cancelled = false;
  const blocks = { n: [], y: [], SS: [], u: [], lambdaMax: [], kp: [], kq: [] };
  let stat = null;

  function pooled() {
    let tot = 0;
    const y = new Array(m).fill(0);
    for (let b = 0; b < blocks.n.length; b++) { tot += blocks.n[b]; for (let j = 0; j < m; j++) y[j] += blocks.n[b] * blocks.y[b][j]; }
    for (let j = 0; j < m; j++) y[j] /= tot;
    const U = zeros(m, m);
    for (let b = 0; b < blocks.n.length; b++) {
      for (let j = 0; j < m; j++) for (let k = 0; k < m; k++) U[j][k] += blocks.SS[b][j][k] + blocks.n[b] * (blocks.y[b][j] - y[j]) * (blocks.y[b][k] - y[k]);
    }
    for (let j = 0; j < m; j++) for (let k = 0; k < m; k++) U[j][k] /= (tot - 1);
    return { y, U, n: tot };
  }

  function runBlock(size) {
    if (n + size > cap) {
      cap = Math.min(target, Math.max(cap * 2, n + size));
      Y = Y.map(a => { const g = new Float64Array(cap); g.set(a.subarray(0, n)); return g; });
    }
    for (let t = 0; t < size; t++) {
      draw();
      // Ref: JCGM 102:2011 §7.4 — y_r = f(x_r)
      for (let j = 0; j < m; j++) { const v = fs[j](env); if (!isFinite(v)) nonFinite++; Y[j][n + t] = v; }
    }
    if (nonFinite) return;
    const full = size === blockSize;
    const s = full ? summarize(Y, n, size, P, dist, work) : summarize(Y, n, size, P, new Float64Array(size), work);
    blocks.n.push(size); blocks.y.push(s.y); blocks.SS.push(s.SS);
    if (full) { blocks.u.push(s.u); blocks.lambdaMax.push(s.lambdaMax); blocks.kp.push(s.kp); blocks.kq.push(s.kq); }
    n += size;
  }

  function stabilization() {
    const h = blocks.u.length;
    if (h < 2) return null;
    const all = pooled();
    const uAll = all.U.map((row, j) => Math.sqrt(Math.max(row[j], 0)));
    const lamAll = symEigen(correlationMatrix(all.U)).values[0];
    const kpOk = blocks.kp.every(v => v !== null), kqOk = blocks.kq.every(v => v !== null);
    const mean = a => a.reduce((x, v) => x + v, 0) / a.length;
    // Ref: JCGM 102:2011 §7.8.2.2 (δ_j — u(y_j) dan), §7.8.2.3 (ρ — λ_max dan), §7.8.2.7 (κ_p — k_p dan); §8.3 Note 3 — δ/5
    const items = [];
    for (let j = 0; j < m; j++) {
      const delta = numericalTolerance(uAll[j], o.nDig) / o.tolDivisor;
      items.push({ q: 'y', j, s: sOfMean(blocks.y.slice(0, h).map(v => v[j])), tol: delta });
      items.push({ q: 'u', j, s: sOfMean(blocks.u.map(v => v[j])), tol: delta });
    }
    items.push({ q: 'lambdaMax', s: sOfMean(blocks.lambdaMax), tol: numericalTolerance(lamAll, o.nDig) / o.tolDivisor });
    if (kpOk) items.push({ q: 'kp', s: sOfMean(blocks.kp), tol: numericalTolerance(mean(blocks.kp), o.nDig) / o.tolDivisor });
    if (kqOk) items.push({ q: 'kq', s: sOfMean(blocks.kq), tol: numericalTolerance(mean(blocks.kq), o.nDig) / o.tolDivisor });
    // Ref: JCGM 102:2011 §7.8.3 m) — 2s_yj yoki 2s_u(yj) > δ_j, yoki 2s_λmax > ρ, yoki 2s_kp > κ_p bo'lsa davom etiladi
    let ratio = 0;
    for (const it of items) { it.ok = 2 * it.s <= it.tol; const r = it.tol > 0 ? 2 * it.s / it.tol : (it.s > 0 ? Infinity : 0); if (r > ratio) ratio = r; }
    return { items, ok: items.every(i => i.ok), ratio, h };
  }

  function step(maxBlocks) {
    let budget = maxBlocks > 0 ? maxBlocks : 1;
    while (!finished && budget-- > 0) {
      if (o.shouldCancel && o.shouldCancel()) { cancelled = true; finished = true; break; }
      runBlock(Math.min(blockSize, target - n));
      if (nonFinite) { finished = true; break; }
      if (uDefined) stat = stabilization();
      if (adaptive) {
        // §7.8.3 f): h ≤ 10 bo'lsa keyingi blok
        if (stat && stat.h > MIN_BLOCKS && stat.ok) { converged = true; finished = true; }
        else if (n + blockSize > target) { reachedMax = true; finished = true; }
      } else if (n >= target) finished = true;
    }
    let expected = target;
    if (adaptive && stat && isFinite(stat.ratio)) expected = Math.min(target, Math.max(n, (MIN_BLOCKS + 1) * blockSize, Math.ceil(n * stat.ratio * stat.ratio)));
    const info = { done: finished, M: n, target, expected, blocks: blocks.n.length, progress: finished ? 1 : Math.min(0.99, n / expected), ratio: stat ? stat.ratio : null };
    if (o.onProgress) o.onProgress(info);
    return info;
  }

  function result() {
    while (!finished) step(1);
    if (cancelled) return { error: 'mc_cancelled', mode: 'MC', M: n };
    if (nonFinite) return { error: 'mc_nonfinite', mode: 'MC', detail: String(nonFinite), M: n + Math.min(blockSize, target - n) };
    const all = pooled();
    const fin = factors(Y, 0, n, P, all.y, all.U, new Float64Array(n), work);
    const { q } = rectangleFactor(P, m);
    // Har bir chiqishning chegaraviy (marginal) intervallari: P ehtimolli va q = 1 − (1 − P)/m ehtimolli (§6.5.3 b) dagi kabi
    // birgalikda kamida P) — ehtimollik bo'yicha simmetrik (JCGM 101:2008 §7.7.2)
    const marg = Y.map(a => {
      const s = a.slice(0, n).sort();
      const cp = coverageIntervals(s, n, P), cq = coverageIntervals(s, n, q);
      return { P: [cp.symLow, cp.symHigh], q: [cq.symLow, cq.symHigh] };
    });
    const g = lpu.coverageRegion;
    // Ref: JCGM 102:2011 §8.3 — δ_j, ρ, κ_p (n_dig bo'yicha, GUM natijalaridan); d_yj, d_u(yj), d_λmax, d_kp ≤ tolerans → tasdiqlangan
    const val = { requested: o.validation, tolDivisor: o.tolDivisor, lowered: o.validation && o.tolDivisor < VALIDATION_TOL_DIVISOR,
                  met: stat ? stat.ok : null, items: stat ? stat.items.map(({ q: qq, j, s, tol, ok }) => ({ q: qq, ...(j !== undefined ? { output: lpu.symbols[j] } : {}), achieved: 2 * s, required: tol, ok })) : [] };
    let comparison = null, validated = null;
    if (o.validation && uDefined) {
      comparison = [];
      lpu.outputs.forEach((out, j) => {
        const delta = numericalTolerance(out.uc, o.nDig);
        comparison.push({ q: 'y', output: out.symbol, d: Math.abs(out.y - all.y[j]), tol: delta });
        comparison.push({ q: 'u', output: out.symbol, d: Math.abs(out.uc - fin.u[j]), tol: delta });
      });
      comparison.push({ q: 'lambdaMax', d: Math.abs(g.lambdaMax - fin.lambdaMax), tol: numericalTolerance(g.lambdaMax, o.nDig) });
      if (fin.kp !== null && !g.singular) comparison.push({ q: 'kp', d: Math.abs(g.ellipsoid.kp - fin.kp), tol: numericalTolerance(g.ellipsoid.kp, o.nDig) });
      if (fin.kq !== null) comparison.push({ q: 'kq', d: Math.abs(g.rectangle.kq - fin.kq), tol: numericalTolerance(g.rectangle.kq, o.nDig) });
      comparison.forEach(c => { c.ok = c.d <= c.tol; });
      validated = comparison.every(c => c.ok);
    }
    const out = {
      engineVersion: lpu.engineVersion, mode: 'MC', multivariate: true,
      rng: { name: rng.name, seed: o.seed }, seed: o.seed,
      M: n, blocks: blocks.n.length, blockSize, P, m, symbols: lpu.symbols, units: lpu.outputs.map(x => x.unit),
      y: all.y, uDefined,
      u: uDefined ? fin.u : null, covariance: uDefined ? all.U : null, correlation: uDefined ? fin.R : null,
      coverageRegion: {
        P, m, distribution: 'mcm',
        ellipsoid: uDefined && fin.kp !== null ? { kp: fin.kp, kp2: fin.kp * fin.kp } : null,
        rectangle: uDefined && fin.kq !== null ? { kq: fin.kq, intervals: all.y.map((v, j) => [v - fin.kq * fin.u[j], v + fin.kq * fin.u[j]]) } : null,
        marginal: { q, intervals: marg.map(x => x.q) },
        lambdaMax: uDefined ? fin.lambdaMax : null, lambdaMin: uDefined ? fin.lambdaMin : null,
        singular: uDefined ? !(fin.lambdaMin > SINGULAR_RATIO * fin.lambdaMax) : null,
        // Ref: JCGM 102:2011 §7.7.4 — eng kichik qamrov sohasining yaqinlashuvi (faqat m = 2)
        ...(m === 2 && mesh ? { smallest: smallestRegion(Y[0], Y[1], n, P, mesh) } : {}),
      },
      intervals: marg.map(x => x.P),
      adaptive: { enabled: adaptive, nDig: o.nDig, maxM: adaptive ? target : null, tolDivisor: o.tolDivisor, minBlocks: MIN_BLOCKS,
                  converged: adaptive ? converged : null, reachedMax: adaptive ? reachedMax : false },
      nDig: o.nDig,
      gum: { y: lpu.y, u: lpu.outputs.map(x => x.uc), correlation: lpu.correlation, lambdaMax: g.lambdaMax, kp: g.ellipsoid.kp, kq: g.rectangle.kq, singular: g.singular },
      validation: val, comparison, validated,
      correlated: smp.correlated, correlation_inputs: { handled: true, groups: smp.groupsInfo },
      varianceUndefined: smp.heavy,
    };
    // linter (rejim MC): M2–M4 shu maydonlardan foydalanadi
    const forLint = { ...out, correlation: out.correlation_inputs };
    out.findings = lint(spec, forLint);
    out.inputCorrelation = out.correlation_inputs;
    delete out.correlation_inputs;
    return out;
  }

  return { options: o, blockSize, step, result };
}
