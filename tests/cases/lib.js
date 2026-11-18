/* tests/cases/*.json misollarini dvigatelda (src/engine/, P03) ishga tushirish
   va kutilgan qiymat bilan solishtirish. Ko'rsatiladigan (yaxlitlangan) qiymatlar —
   hisobot qatlamidan (src/report/rounding.js). Format: tests/cases/README.md. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../../src/engine/index.js');
const { roundResult } = require('../../src/report/rounding.js');

const CASES_DIR = __dirname;

function loadCases() {
  const out = [];
  (function walk(dir) {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) walk(p);
      else if (d.name.endsWith('.json')) out.push({ file: path.relative(CASES_DIR, p), ...JSON.parse(fs.readFileSync(p, 'utf8')) });
    }
  })(CASES_DIR);
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

// Natija maydonlari (P03 da ENGINE_API.md bo'yicha o'zgaradi)
const PICK = {
  evaluate: {
    y: r => r.y, uc: r => r.uc, uc2: r => r.uc2, nu_eff: r => r.nuEff, k: r => r.k, U: r => r.U,
    'display.U': r => roundResult(r.y, r.U, r.roundUp).Uround,
    'display.y': r => roundResult(r.y, r.U, r.roundUp).yround,
  },
  monteCarlo: {
    y: r => r.mean, u: r => r.u,
    // P06: adaptiv protsedura sinovlari soni (10⁶ birlikda — manba jadvallaridagi kabi), §8.1.3 tekshiruvi
    M: r => r.M, d_low: r => r.dLow, d_high: r => r.dHigh, validated: r => Number(r.validated), converged: r => Number(r.adaptive.converged),
    'interval.low': (r, run) => run.interval === 'shortest' ? r.low : r.symLow,
    'interval.high': (r, run) => run.interval === 'shortest' ? r.high : r.symHigh,
  },
};

// P08: regressiya natijasi (format 'uc-regression/1'). Kattalik nomlari:
//   a, b, c, d — parametrlar; u_a, u_b… — standart noaniqliklari; r_ab — korrelyatsiya koeffitsiyenti;
//   s — qoldiq standart og'ishi; nu — ν = m − n; chi2 — χ²_obs; x_min_u — u[Y(x)] eng kichik bo'lgan x
//   (GUM H.3.4: t_min = t0 − u(y1)·r(y1, y2)/u(y2)); fitted.N, residuals.N, predict.N.y/u/nu,
//   inverse.N.x0/u/nu — N noldan boshlanadi.
function pickRegression(q) {
  const par = (r, n) => r.params.find(p => p.name === n);
  let m;
  if (/^[abcd]$/.test(q)) return r => par(r, q).value;
  if ((m = /^u_([abcd])$/.exec(q))) return r => par(r, m[1]).u;
  if ((m = /^r_([abcd])([abcd])$/.exec(q))) return r => r.correlation['abcd'.indexOf(m[1])]['abcd'.indexOf(m[2])];
  if (q === 's') return r => r.s;
  if (q === 'nu') return r => r.nu;
  if (q === 'chi2') return r => r.chi2.obs;
  if (q === 'x_min_u') return r => r.xRef - par(r, 'a').u * r.correlation[0][1] / par(r, 'b').u;
  if ((m = /^(fitted|residuals)\.(\d+)$/.exec(q))) return r => r[m[1]][+m[2]];
  if ((m = /^predict\.(\d+)\.(y|u|nu|U|k)$/.exec(q))) return r => r.predictions[+m[1]][m[2]];
  if ((m = /^inverse\.(\d+)\.(x0|u|nu|U|k)$/.exec(q))) return r => r.inverse[+m[1]][m[2]];
  return null;
}

// Excel ν_eff ≈ 10⁹ ni "∞" o'rnida ishlatadi (B tur ν = 10⁹); dvigatel ν_B = ∞ (P03 dan cap yo'q).
const NU_INF = 1e6;

// P09: top-down natijasi (format 'uc-topdown/1') — kattalik nomi natijadagi yo'l:
//   uc, U, k, relU, rw.u, rw.components.N.u|s|n|mean, bias.rms|uRef|u|meanBias, bias.items.N.uRef,
//   recovery.uRm|t|tCrit|u|significant (mantiqiy → 0/1), yCorrected, absUc …
function pickTopDown(q) {
  return r => {
    const v = String(q).split('.').reduce((o, k) => (o == null ? o : o[k]), r);
    return typeof v === 'boolean' ? Number(v) : v;
  };
}

// P07: vektor natija (LPU — mode 'MULTIVARIATE'; MCM — multivariate: true). Kattalik nomlari:
//   y.<belgi>, u.<belgi>, r.<a>.<b>, one_minus_r.<a>.<b>, kp, kq, M, validated, converged, ok.<kp|kq|lambdaMax|y|u>
function pickMultivariate(q) {
  return r => {
    const idx = s => r.symbols.indexOf(s);
    const p = String(q).split('.');
    const mc = r.mode === 'MC';
    if (p[0] === 'y') return r.y[idx(p[1])];
    if (p[0] === 'u') return mc ? r.u[idx(p[1])] : r.outputs[idx(p[1])].uc;
    if (p[0] === 'r') return r.correlation[idx(p[1])][idx(p[2])];
    if (p[0] === 'one_minus_r') return 1 - r.correlation[idx(p[1])][idx(p[2])];
    if (q === 'kp') return r.coverageRegion.ellipsoid.kp;
    if (q === 'kq') return r.coverageRegion.rectangle.kq;
    if (q === 'M') return r.M;
    if (q === 'validated') return Number(r.validated);
    if (q === 'converged') return Number(r.adaptive.converged);
    if (p[0] === 'ok') return Number(r.comparison.filter(c => c.q === p[1]).every(c => c.ok));
    return undefined;
  };
}

function run(c) {
  const runSpec = c.run || { method: 'evaluate' };
  if (runSpec.method === 'regression') {
    let spec = c.modelSpec;
    if (runSpec.inverseAtX) {
      // Manba y₀ ni bermagan, faqat x̂₀ ni bergan (QUAM A5: c₀ = 0,26 mg/L): y₀ moslangan chiziqdan tiklanadi
      const f = engine.evaluate(spec);
      if (f.error) return { r: f, runSpec };
      spec = { ...spec, inverse: runSpec.inverseAtX.map(q => ({ ...q, x: undefined, y0: f.params.reduce((s, p, j) => s + p.value * (q.x - f.xRef) ** j, 0) })) };
    }
    const r = engine.evaluate(spec);
    if (r.error) throw new Error(`${c.id}: ${r.error} ${r.detail || ''}`);
    return { r, runSpec };
  }
  if (runSpec.method === 'path') {
    // P10: maxsus rejimlar (uc-sampling/1, uc-qualitative/1, uc-micro/1, uc-medical/1) — kattalik nomi natijadagi yo'l
    const r = engine.evaluate(c.modelSpec);
    if (r.error) throw new Error(`${c.id}: ${r.error} ${r.detail || ''}`);
    return { r, runSpec };
  }
  if (runSpec.method === 'topdown') {
    let r;
    if (runSpec.part === 'bias') {
      // Manba faqat u(bias) ni bergan bo'lim (masalan TR 537 §6.3): bias qismi alohida hisoblanadi
      try { r = { bias: engine.evaluateBias(c.modelSpec.bias, engine.makeContext(c.modelSpec.scale, c.modelSpec.relativeUnit)), warnings: [] }; }
      catch (e) { throw new Error(`${c.id}: ${e.code || e.message} ${e.detail || ''}`); }
    } else r = engine.evaluate(c.modelSpec);
    if (r.error) throw new Error(`${c.id}: ${r.error} ${r.detail || ''}`);
    return { r, runSpec };
  }
  // P06: run.mc — monteCarlo() sozlamalari (adaptiv / qat'iy, interval turi, n_dig, δ/5 …); bo'lmasa qat'iy M (eski misollar)
  const r = runSpec.method === 'monteCarlo'
    ? engine.monteCarlo(c.modelSpec, runSpec.mc ? { interval: runSpec.interval, ...runSpec.mc } : { mode: 'fixed', M: runSpec.M, interval: runSpec.interval })
    : engine.evaluate(c.modelSpec);
  if (runSpec.method === 'monteCarlo' && r.error) throw new Error(`${c.id}: ${r.error} ${r.detail || ''}`);
  return { r, runSpec };
}

function tolFor(c, q) {
  const t = c.tolerance || {};
  return t[q] || t[q.split('.')[0]] || t.default || { rel: 1e-9 };
}

function compare(q, actual, expected, tol) {
  if (typeof actual !== 'number' || Number.isNaN(actual)) return { ok: false, msg: `natija yo'q (${actual})` };
  if (q === 'nu_eff' && expected >= NU_INF) {
    return { ok: actual >= NU_INF, msg: `ν_eff "∞" (kutilgan ${expected}, natija ${actual})` };
  }
  const diff = Math.abs(actual - expected);
  let limit;
  if (tol.abs !== undefined) limit = tol.abs;
  else if (expected === 0) limit = tol.absZero !== undefined ? tol.absZero : 1e-12;
  else limit = tol.rel * Math.abs(expected);
  return { ok: diff <= limit, msg: `natija ${actual}, kutilgan ${expected}, |Δ| = ${diff.toExponential(3)}, chegara ${limit.toExponential(3)}` };
}

// [{q, actual, expected, ref, tol, known}] — bitta misol uchun barcha tekshiruvlar
function checks(c) {
  const { r, runSpec } = run(c);
  const multi = r && (r.mode === 'MULTIVARIATE' || r.multivariate);
  const pick = multi ? new Proxy({}, { get: (_, q) => pickMultivariate(String(q)) }) : runSpec.method === 'regression'
    ? new Proxy({}, { get: (_, q) => pickRegression(String(q)) })
    : runSpec.method === 'topdown' || runSpec.method === 'path'
      ? new Proxy({}, { get: (_, q) => pickTopDown(String(q)) })
      : PICK[runSpec.method];
  const list = [];
  const push = (q, e, actualFn) => list.push({
    q, expected: e.value, ref: e.ref, tol: tolFor(c, q),
    actual: actualFn(r, runSpec), known: (c.knownDiscrepancies || {})[q],
  });
  for (const [q, e] of Object.entries(c.expected || {})) {
    if (q === 'interval') {
      push('interval.low', { value: e.low, ref: e.ref }, pick['interval.low']);
      push('interval.high', { value: e.high, ref: e.ref }, pick['interval.high']);
    } else {
      if (!pick[q]) throw new Error(`${c.id}: noma'lum kattalik ${q}`);
      push(q, e, pick[q]);
    }
  }
  for (const [q, e] of Object.entries(c.expectedDisplay || {})) push('display.' + q, e, pick['display.' + q]);
  return { list, result: r, warnings: (r.warnings || []).map(w => w.code) };
}

module.exports = { loadCases, checks, compare, engine, Calc: engine };
