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
    'interval.low': (r, run) => run.interval === 'shortest' ? r.low : r.symLow,
    'interval.high': (r, run) => run.interval === 'shortest' ? r.high : r.symHigh,
  },
};

// Excel ν_eff ≈ 10⁹ ni "∞" o'rnida ishlatadi (B tur ν = 10⁹); dvigatel ν_B = ∞ (P03 dan cap yo'q).
const NU_INF = 1e6;

function run(c) {
  const runSpec = c.run || { method: 'evaluate' };
  const r = runSpec.method === 'monteCarlo' ? engine.monteCarlo(c.modelSpec, runSpec.M) : engine.evaluate(c.modelSpec);
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
  const pick = PICK[runSpec.method];
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
