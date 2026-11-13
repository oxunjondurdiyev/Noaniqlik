/* ═══════════════════════════════════════════════════════════════
   MONTECARLO.JS — taqsimotlarni tarqatish (JCGM 101:2008). P01 dagi MCM o'zgarishsiz
   ko'chirildi (RNG, M, intervallar bir xil — 10-test). Monte-Karlo 2.0 — P06.
═══════════════════════════════════════════════════════════════ */
import { evaluate, prepareModel } from './evaluate.js';
import { normalize } from './spec.js';
import { getDivisor, valueOrExpr } from './typeB.js';

/* xorshift32, qat'iy urug' (R-06; JCGM 101 C.3 talablariga moslash — P06) */
function rng(seed) {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return (s + 0.5) / 4294967296;
  };
}

export const MC_SEED = 20261110;

/**
 * @param {object} spec  modelSpec (evaluate bilan bir xil)
 * @param {number} [M=200000]  10⁴ … 2·10⁶
 */
export function monteCarlo(spec, M) {
  const res = evaluate(spec);
  if (res.error) return res;
  const state = normalize(spec).state;
  M = Math.max(10000, Math.min(2000000, M || 200000));
  const params = state.params;
  const { f } = prepareModel(state);
  const rand = rng(MC_SEED);
  let spare = null;
  // Ref: JCGM 101:2008 C.4.2 (Box–Muller, qutbli shakl)
  const gauss = () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u, v, s;
    do { u = 2 * rand() - 1; v = 2 * rand() - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const m = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * m;
    return u * m;
  };
  const gamma = k => { // Marsaglia–Tsang, k ≥ 1
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = gauss(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = rand();
      if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  const student = nu => {
    if (!isFinite(nu) || nu > 1e5) return gauss();
    const k = nu / 2;
    const g = k >= 1 ? gamma(k) : gamma(k + 1) * Math.pow(rand(), 1 / k);
    return gauss() / Math.sqrt(g / k);
  };
  // Ref: JCGM 101:2008 §6.4.9.7 — A tur uchun siljitilgan-masshtablangan t; B tur — o'z taqsimoti (§6.4.2–6.4.6)
  const sampleB = cm => {
    const a = Math.abs(cm.a);
    switch (cm.distribution) {
      case 'normal': return gauss() * a / getDivisor('normal', cm.k);
      case 'triang': return a * (rand() - rand());
      case 'ushape': return a * Math.sin(Math.PI * (rand() - 0.5));
      case 'resol':  return a * (rand() - 0.5);
      default:       return a * (2 * rand() - 1);
    }
  };
  const inputs = res.inputs;
  const compsBy = {};
  const means = {}; inputs.forEach(i => { means[i.name] = i.mean; });
  params.forEach(p => { compsBy[p] = []; });
  (state.typeB || []).forEach(c => {
    const param = params.includes(c.param) ? c.param : params[0];
    const mult = (c.sensitivity === undefined || c.sensitivity === null || c.sensitivity === '') ? 1 : Number(c.sensitivity) || 0;
    compsBy[param].push({ ...c, a: valueOrExpr(c.halfWidth, params, means), mult });
  });
  inputs.forEach(inp => {
    if (inp.directional && inp.h > 0) compsBy[inp.name].push({ a: inp.h / 2, distribution: 'rect', mult: 1 });
  });

  const ys = new Float64Array(M);
  const env = {};
  for (let t = 0; t < M; t++) {
    for (const inp of inputs) {
      let x = inp.mean;
      if (inp.uA > 0) x += inp.uA * student(inp.nu);
      for (const cm of compsBy[inp.name]) x += cm.mult * sampleB(cm);
      env[inp.name] = x;
    }
    ys[t] = f(env);
  }
  // Ref: JCGM 101:2008 §7.6 (y, u(y))
  let sum = 0;
  for (let t = 0; t < M; t++) sum += ys[t];
  const mean = sum / M;
  let ss = 0;
  for (let t = 0; t < M; t++) ss += (ys[t] - mean) ** 2;
  const u = Math.sqrt(ss / (M - 1));
  ys.sort();
  const P = res.P;
  // Ref: JCGM 101:2008 §7.7.2 (eng qisqa interval), §7.7.1 (ehtimollik bo'yicha simmetrik)
  const q = Math.floor(P * M + 0.5);
  let best = 0;
  for (let r = 1; r + q - 1 < M && r < M - q; r++) {
    if (ys[r + q - 1] - ys[r] < ys[best + q - 1] - ys[best]) best = r;
  }
  const symLow = ys[Math.floor((1 - P) / 2 * M)], symHigh = ys[Math.floor((1 + P) / 2 * M)];
  const low = ys[best], high = ys[best + q - 1];
  // Ref: JCGM 101:2008 §8 (§7.9.2): δ — u_c ning 2 qiymatli raqamidan
  const delta = res.uc > 0 ? 0.5 * Math.pow(10, Math.floor(Math.log10(res.uc)) - 1) : 0;
  const dLow = Math.abs(res.y - res.U - low), dHigh = Math.abs(res.y + res.U - high);
  return {
    engineVersion: res.engineVersion, seed: MC_SEED,
    M, mean, u, low, high, symLow, symHigh, P,
    gumLow: res.y - res.U, gumHigh: res.y + res.U, gumU: res.U, mcHalf: (high - low) / 2,
    delta, dLow, dHigh, validated: dLow <= delta && dHigh <= delta,
    correlated: res.pairs.some(p => p.cov !== 0),
  };
}
