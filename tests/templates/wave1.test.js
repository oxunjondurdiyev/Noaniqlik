/* P04, 1-to'lqin: 24 ta sinov shabloni (templates/builtin/T-01 … T-24, docs/templates/WAVE1_SPEC.md).
   1) Struktura: sxemadan o'tadi; model tahlil qilinadi; birliklar mos (units.js); barcha kirishlarga c_i hisoblanadi.
   2) Qat'iy qoidalar: DRAFT; ⚠ → openQuestions; raqam o'ylab topilmaydi (yarim kenglik, U, k, kuzatuv bo'sh).
   3) Sintetik sonli test: qo'lda berilgan oddiy kirishlarda dvigatel natijasi (y, c_i, u_c) analitik formula bilan
      1e-9 nisbiy aniqlikda mos. Bu shablon to'g'riligini EMAS, faqat sxema ↔ dvigatel ulanishini tekshiradi.
      Kutilgan qiymatlar shu fayl ichida analitik hisoblanadi (Excel'dan emas). Sintetik sonlar faqat testda. */
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../../src/templates/interpreter.js');
const { schema, templates, ROOT } = require('./lib.js');

const wave = templates.filter(x => /^T-\d\d$/.test(x.tpl.id)).map(x => x.tpl);
const SPEC = fs.readFileSync(path.join(ROOT, 'docs/templates/WAVE1_SPEC.md'), 'utf8');
const specSection = id => {
  const m = SPEC.split(/\n### /).find(s => s.startsWith(id + '.'));
  return m || '';
};

test('24 ta shablon, T-01 … T-24, hammasi DRAFT', () => {
  assert.deepEqual(wave.map(t => t.id), Array.from({ length: 24 }, (_, i) => 'T-' + String(i + 1).padStart(2, '0')));
  for (const t of wave) assert.equal(t.status, 'DRAFT', t.id);
});

test('katalog bo\'limlari: construction (T-01…T-16), food_chem (T-17…T-21), electrical (T-22…T-24)', () => {
  const sec = id => wave.find(t => t.id === id).section;
  for (let i = 1; i <= 24; i++) {
    const id = 'T-' + String(i).padStart(2, '0');
    assert.equal(sec(id), i <= 16 ? 'construction' : i <= 21 ? 'food_chem' : 'electrical', id);
  }
});

/* ── Sintetik kirishlar (faqat test uchun) ── */
const SYN_CONST = { alpha: 0.95, f: 36.46, gamma: 2.1e-4, dt: 2, alpha_t: 1.2e-5, a_rel: 0.5, b_dig: 3, d: 0.01 };
// Kirish qiymatlari: maxrajlar noldan uzoq bo'lishi uchun ba'zi shablonlarda alohida
const SYN_VALUE = {
  'T-02': { lk: 62.5, l0: 50 }, 'T-04': { h0: 30, h1: 21, m1: 12.4, m0: 4.1, V: 0.005 },
  'T-05': { m: 6.3, m1: 2.2, V: 0.001, h: 8.5 }, 'T-06': { m_i: 125.3, m: 1000.4 },
  'T-07': { m25: 50.2, m125: 120.4, m063: 210.6, m0315: 300.1, m016: 250.3, m: 1000.2, A25: 5.02, A125: 17.06, A063: 38.12, A0315: 68.13, A016: 93.16 },
  'T-08': { m: 1000.3, m1: 812.6 }, 'T-09': { m1: 18.2, m: 3.4, V: 0.01 }, 'T-10': { m: 2400.5, a: 10.01, b: 9.98, c: 10.02 },
  'T-11': { m1: 2610.4, m: 2433.1 }, 'T-12': { m1: 45.2, m0: 41.7, m: 20.3 }, 'T-13': { F: 250000, A: 15000, P: 3200, l: 200, b: 120, h: 65 },
  'T-14': { x: 6000.4, x_loyiha: 6000 }, 'T-15': { F: 520, b: 10.02, h: 4.05, 'ΔL': 12.6, L0: 50 }, 'T-16': { H_oq: 45.3, 'Δ_et': 0.4 },
  'T-17': { V: 18.65, V0: 0.12, c: 0.1, K: 1.003, m: 10.02 }, 'T-18': { m0: 20.1, m1: 25.1, m2: 24.45 }, 'T-19': { m0: 20.1, m1: 25.1, m2: 20.14 },
  'T-20': { pH_oq: 7.02, 'δ_bufer': 0.01, 'δ_T': -0.005, 'δ_drift': 0.002 }, 'T-21': { m2: 15.42, m1: 15.31, m: 10.05 },
  'T-22': { R: 250, I: 0.42 }, 'T-23': { U_oq: 3.02 }, 'T-24': { R1: 12.31, R2: 15.02, t1: 22.4, t2: 23.1, t_obekt: 78.4, t_atrof: 22.9 },
};
const DIV = { normal: 2, rect: Math.sqrt(3), resol: 2 * Math.sqrt(3), triang: Math.sqrt(6), ushape: Math.sqrt(2) };

/* ── Analitik modellar: f(x) va ∂f/∂x (qo'lda chiqarilgan) ── */
const sum = a => a.reduce((s, v) => s + v, 0);
const MODELS = {
  'T-01/round': { f: x => x.F / (Math.PI * x.d0 ** 2 / 4), g: x => ({ F: 4 / (Math.PI * x.d0 ** 2), d0: -8 * x.F / (Math.PI * x.d0 ** 3) }) },
  'T-01/rect': { f: x => x.F / (x.a0 * x.b0), g: x => ({ F: 1 / (x.a0 * x.b0), a0: -x.F / (x.a0 ** 2 * x.b0), b0: -x.F / (x.a0 * x.b0 ** 2) }) },
  'T-02/': { f: x => (x.lk - x.l0) / x.l0 * 100, g: x => ({ lk: 100 / x.l0, l0: -100 * x.lk / x.l0 ** 2 }) },
  'T-03/': { f: x => x.alpha * x.F / (x.a * x.b), g: x => ({ F: x.alpha / (x.a * x.b), a: -x.alpha * x.F / (x.a ** 2 * x.b), b: -x.alpha * x.F / (x.a * x.b ** 2), alpha: x.F / (x.a * x.b) }) },
  'T-04/slump': { f: x => x.h0 - x.h1, g: () => ({ h0: 1, h1: -1 }) },
  'T-04/density': { f: x => (x.m1 - x.m0) / x.V, g: x => ({ m1: 1 / x.V, m0: -1 / x.V, V: -(x.m1 - x.m0) / x.V ** 2 }) },
  'T-05/density': { f: x => (x.m - x.m1) / x.V, g: x => ({ m: 1 / x.V, m1: -1 / x.V, V: -(x.m - x.m1) / x.V ** 2 }) },
  'T-05/mobility': { f: x => x.h, g: () => ({ h: 1 }) },
  'T-06/': { f: x => x.m_i / x.m * 100, g: x => ({ m_i: 100 / x.m, m: -100 * x.m_i / x.m ** 2 }) },
  'T-07/masses': {
    f: x => (5 * x.m25 + 4 * x.m125 + 3 * x.m063 + 2 * x.m0315 + x.m016) / x.m,
    g: x => ({ m25: 5 / x.m, m125: 4 / x.m, m063: 3 / x.m, m0315: 2 / x.m, m016: 1 / x.m,
      m: -(5 * x.m25 + 4 * x.m125 + 3 * x.m063 + 2 * x.m0315 + x.m016) / x.m ** 2 }),
  },
  'T-07/residues': { f: x => sum([x.A25, x.A125, x.A063, x.A0315, x.A016]) / 100, g: () => ({ A25: 0.01, A125: 0.01, A063: 0.01, A0315: 0.01, A016: 0.01 }) },
  'T-08/crushing': { f: x => (x.m - x.m1) / x.m * 100, g: x => ({ m: 100 * x.m1 / x.m ** 2, m1: -100 / x.m }) },
  'T-08/dust_clay': { f: x => (x.m - x.m1) / x.m * 100, g: x => ({ m: 100 * x.m1 / x.m ** 2, m1: -100 / x.m }) },
  'T-09/': { f: x => (x.m1 - x.m) / x.V, g: x => ({ m1: 1 / x.V, m: -1 / x.V, V: -(x.m1 - x.m) / x.V ** 2 }) },
  'T-10/': { f: x => x.m / (x.a * x.b * x.c) * 1000, g: x => { const v = x.a * x.b * x.c; return { m: 1000 / v, a: -1000 * x.m / (x.a * v), b: -1000 * x.m / (x.b * v), c: -1000 * x.m / (x.c * v) }; } },
  'T-11/': { f: x => (x.m1 - x.m) / x.m * 100, g: x => ({ m1: 100 / x.m, m: -100 * x.m1 / x.m ** 2 }) },
  'T-12/': { f: x => (x.m1 - x.m0) / (x.m0 - x.m) * 100, g: x => ({ m1: 100 / (x.m0 - x.m), m0: -100 * (x.m1 - x.m) / (x.m0 - x.m) ** 2, m: 100 * (x.m1 - x.m0) / (x.m0 - x.m) ** 2 }) },
  'T-13/compression': { f: x => x.F / x.A, g: x => ({ F: 1 / x.A, A: -x.F / x.A ** 2 }) },
  'T-13/bending': { f: x => 3 * x.P * x.l / (2 * x.b * x.h ** 2), g: x => { const y = 3 * x.P * x.l / (2 * x.b * x.h ** 2); return { P: y / x.P, l: y / x.l, b: -y / x.b, h: -2 * y / x.h }; } },
  'T-14/': { f: x => x.x - x.x_loyiha, g: () => ({ x: 1, x_loyiha: -1 }) },
  'T-15/stress': { f: x => x.F / (x.b * x.h), g: x => ({ F: 1 / (x.b * x.h), b: -x.F / (x.b ** 2 * x.h), h: -x.F / (x.b * x.h ** 2) }) },
  'T-15/strain': { f: x => x['ΔL'] / x.L0 * 100, g: x => ({ 'ΔL': 100 / x.L0, L0: -100 * x['ΔL'] / x.L0 ** 2 }) },
  'T-16/': { f: x => x.H_oq + x['Δ_et'], g: () => ({ H_oq: 1, 'Δ_et': 1 }) },
  'T-17/*': { f: x => (x.V - x.V0) * x.c * x.K * x.f / x.m,
    g: x => { const y = (x.V - x.V0) * x.c * x.K * x.f / x.m; return { V: x.c * x.K * x.f / x.m, V0: -x.c * x.K * x.f / x.m, c: y / x.c, K: y / x.K, f: y / x.f, m: -y / x.m }; } },
  'T-18/': { f: x => (x.m1 - x.m2) / (x.m1 - x.m0) * 100, g: x => ({ m1: 100 * (x.m2 - x.m0) / (x.m1 - x.m0) ** 2, m2: -100 / (x.m1 - x.m0), m0: 100 * (x.m1 - x.m2) / (x.m1 - x.m0) ** 2 }) },
  'T-19/': { f: x => (x.m2 - x.m0) / (x.m1 - x.m0) * 100, g: x => ({ m2: 100 / (x.m1 - x.m0), m1: -100 * (x.m2 - x.m0) / (x.m1 - x.m0) ** 2, m0: 100 * (x.m2 - x.m1) / (x.m1 - x.m0) ** 2 }) },
  'T-20/': { f: x => x.pH_oq + x['δ_bufer'] + x['δ_T'] + x['δ_drift'], g: () => ({ pH_oq: 1, 'δ_bufer': 1, 'δ_T': 1, 'δ_drift': 1 }) },
  'T-21/': { f: x => (x.m2 - x.m1) / x.m * 100, g: x => ({ m2: 100 / x.m, m1: -100 / x.m, m: -100 * (x.m2 - x.m1) / x.m ** 2 }) },
  'T-22/insulation': { f: x => x.R, g: () => ({ R: 1 }) },
  'T-22/leakage': { f: x => x.I, g: () => ({ I: 1 }) },
  'T-23/': { f: x => x.U_oq, g: () => ({ U_oq: 1 }) },
  'T-24/copper': null, 'T-24/aluminium': null,
  'T-24/thermocouple': { f: x => x.t_obekt - x.t_atrof, g: () => ({ t_obekt: 1, t_atrof: -1 }) },
};
const resistanceMethod = {
  f: x => (x.R2 - x.R1) / x.R1 * (x.k + x.t1) - (x.t2 - x.t1),
  g: x => ({ R2: (x.k + x.t1) / x.R1, R1: -x.R2 * (x.k + x.t1) / x.R1 ** 2, t1: (x.R2 - x.R1) / x.R1 + 1, t2: -1, k: (x.R2 - x.R1) / x.R1 }),
};
MODELS['T-24/copper'] = resistanceMethod;
MODELS['T-24/aluminium'] = resistanceMethod;
const modelFor = (id, v) => MODELS[`${id}/${v}`] || MODELS[`${id}/*`];

/** Sintetik ma'lumot: kuzatuvlar [v−δ, v, v+δ] (s = δ), har bir manba a = 10⁻³·|v|, normal uchun k = 2. */
function synthetic(tpl, variantId) {
  const b = T.buildState(tpl, { variant: variantId }, { allowMissing: true });
  assert.ok(!b.error, b.error);
  const st = b.state;
  const vals = SYN_VALUE[tpl.id] || {};
  const observations = {}, mean = {}, delta = {}, constants = {};
  st.params.forEach((p, j) => {
    if (st.template.constants.includes(p)) {
      const v = (tpl.variants || []).find(x => x.id === variantId)?.constants?.[p];
      mean[p] = v !== undefined && v !== null ? v : SYN_CONST[p];
      if (v === undefined || v === null) constants[p] = SYN_CONST[p];
      delta[p] = 0;
      return;
    }
    const v = vals[p] !== undefined ? vals[p] : 10 + 3 * j;
    const d = Math.abs(v) * 1e-3;
    observations[p] = [v - d, v, v + d];
    mean[p] = v; delta[p] = d;
  });
  for (const c of tpl.constants || []) if (!(c.symbol in mean) && c.value === null) constants[c.symbol] = SYN_CONST[c.symbol];
  const sources = {};
  for (const s of tpl.typeBSources) {
    if (!st.params.includes(s.input)) continue;
    sources[s.id] = { ...(s.halfWidth === null ? { halfWidth: Math.abs(mean[s.input]) * 1e-3 } : {}), ...(s.k === null ? { k: 2 } : {}) };
  }
  return { st, data: { variant: variantId, observations, constants, sources, settings: { paired: false } }, mean, delta };
}

/** Analitik u_c (JCGM 100:2008 Eq. 13): Σ(c_i u_i)² + 2 Σ c_i c_j u(x_i,x_j) */
function analytic(tpl, variantId, syn, built) {
  const M = modelFor(tpl.id, variantId || '');
  const x = { ...syn.mean, ...(built.state.template.aux || {}) };
  const y = M.f(x), g = M.g(x);
  const aux = built.state.template.aux || {};
  const uComp = (s, hwMean) => {
    let a = s.halfWidth;
    if (typeof a === 'string') a = analyticHalfWidth(a, { ...syn.mean, ...aux });
    else if (a === null) a = Math.abs(syn.mean[s.input]) * 1e-3;
    const div = s.distribution === 'normal' ? 2 : DIV[s.distribution];
    return Math.abs(a) / div;
  };
  const included = s => built.state.params.includes(s.input) && s.includeByDefault !== false &&
    !((tpl.variants || []).find(v => v.id === variantId)?.excludeSources || []).includes(s.id);
  const u2 = {}, uX = {};
  for (const p of built.state.params) {
    const uA = syn.delta[p] / Math.sqrt(3); // s = δ, n = 3
    u2[p] = uA * uA;
  }
  for (const s of tpl.typeBSources.filter(included)) {
    const u = uComp(s);
    u2[s.input] += u * u;
    const corr = s.correlated !== undefined ? s.correlated : s.distribution !== 'resol';
    if (corr && s.instrument) uX[`${s.input}|${s.instrument}`] = (uX[`${s.input}|${s.instrument}`] || 0) + u * u;
  }
  let uc2 = sum(built.state.params.map(p => (g[p] || 0) ** 2 * u2[p]));
  for (const c of tpl.correlations || []) {
    const ins = c.inputs.filter(p => built.state.params.includes(p));
    for (let i = 0; i < ins.length; i++) for (let j = i + 1; j < ins.length; j++) {
      const cov = c.r * Math.sqrt(uX[`${ins[i]}|${c.sharedInstrument}`] || 0) * Math.sqrt(uX[`${ins[j]}|${c.sharedInstrument}`] || 0);
      uc2 += 2 * g[ins[i]] * g[ins[j]] * cov;
    }
  }
  return { y, g, uc: Math.sqrt(uc2) };
}
// Shablonlardagi yarim kenglik formulalari (analitik ko'rinishi)
function analyticHalfWidth(expr, v) {
  const known = {
    'x * alpha_t * dt': () => v.x * v.alpha_t * v.dt,
    'V * gamma * dt': () => v.V * v.gamma * v.dt,
    'V0 * gamma * dt': () => v.V0 * v.gamma * v.dt,
    'a_rel / 100 * R + b_dig * d': () => v.a_rel / 100 * v.R + v.b_dig * v.d,
    'a_rel / 100 * I + b_dig * d': () => v.a_rel / 100 * v.I + v.b_dig * v.d,
    'd': () => v.d,
  };
  assert.ok(known[expr], `analitik ko'rinish yo'q: ${expr}`);
  return known[expr]();
}

const relClose = (a, e, rel = 1e-9) => Math.abs(a - e) <= rel * Math.max(Math.abs(e), 1e-300);

for (const tpl of wave) {
  describe(`${tpl.id} — ${tpl.title.uz}`, () => {
    test('sxema va semantik tekshiruv (model tahlil qilinadi, birliklar mos)', () => {
      const r = T.checkTemplate(tpl, schema);
      assert.deepEqual(r.errors, []);
      assert.deepEqual(r.warnings, []);
    });

    test("⚠ belgili joylar openQuestions[] da", () => {
      const warn = (specSection(tpl.id).match(/⚠/g) || []).length;
      const inTpl = (tpl.openQuestions || []).filter(q => q.text.uz.includes('⚠')).length;
      assert.ok(inTpl >= warn, `WAVE1_SPEC: ${warn} ta ⚠, shablonda ${inTpl}`);
    });

    test("raqam o'ylab topilmagan: kuzatuv, yarim kenglik, U/k bo'sh; demo ma'lumot yo'q", () => {
      assert.equal(tpl.sampleData, undefined);
      assert.equal(tpl.points, undefined);
      for (const s of tpl.typeBSources) {
        assert.ok(s.halfWidth === null || typeof s.halfWidth === 'string', `${s.id}: halfWidth ${s.halfWidth}`);
        if (s.distribution === 'normal') assert.equal(s.k, null, `${s.id}: k`);
        if (s.sensitivity !== undefined) assert.equal(s.sensitivity, null, `${s.id}: sensitivity`);
        assert.ok(s.hint && s.hint.uz && s.hint.ru && s.hint.en, `${s.id}: yordamchi matn`);
      }
      for (const c of tpl.constants || []) assert.equal(c.value, null, `${c.symbol}: qiymat variantda yoki laboratoriyada`);
      // Yagona istisno: T-24 k (mis 234,5; alyuminiy 225) — WAVE1_SPEC da berilgan
      for (const v of tpl.variants || []) for (const [s, val] of Object.entries(v.constants || {})) {
        if (val !== null) assert.ok(tpl.id === 'T-24' && s === 'k' && [234.5, 225].includes(val), `${tpl.id}/${v.id}: ${s} = ${val}`);
      }
    });

    test("ma'lumotsiz hisob — template_incomplete (bo'sh maydonlar ro'yxati bilan)", () => {
      const r = T.evaluateTemplate(tpl, {});
      assert.equal(r.error, 'template_incomplete');
      assert.ok(r.missing.length > 0);
    });

    for (const v of tpl.variants || [{ id: undefined }]) {
      const vid = v.id;
      test(`sintetik sonli test${vid ? ' [' + vid + ']' : ''}: y, c_i, u_c analitik bilan 1e-9`, () => {
        const syn = synthetic(tpl, vid);
        const run = T.evaluateTemplate(tpl, syn.data);
        assert.ok(!run.error, `${run.error} ${JSON.stringify(run.missing)}`);
        const r = run.result;
        assert.ok(!r.error, r.error + ' ' + (r.detail || ''));
        const an = analytic(tpl, vid, syn, run);
        assert.ok(relClose(r.y, an.y), `y = ${r.y}, analitik ${an.y}`);
        // barcha kirishlarga c_i hisoblangan (simvolik), analitik hosila bilan mos
        for (const inp of r.inputs) {
          assert.ok(Number.isFinite(inp.c), `${inp.name}: c = ${inp.c}`);
          assert.equal(inp.cMethod, 'symbolic', `${inp.name}: ${inp.cMethod}`);
          assert.ok(relClose(inp.c, an.g[inp.name]), `c(${inp.name}) = ${inp.c}, analitik ${an.g[inp.name]}`);
        }
        assert.ok(relClose(r.uc, an.uc), `u_c = ${r.uc}, analitik ${an.uc}`);
        // birliklar: o'lchamlik xatosi yo'q; ogohlantirish faqat shablonda e'lon qilingan bo'lsa
        const allowed = (tpl.expectedWarnings || []).map(w => w.code);
        const unitW = r.warnings.filter(w => w.code.startsWith('unit_')).map(w => w.code);
        assert.deepEqual(unitW.filter(c => !allowed.includes(c)), [], `kutilmagan birlik ogohlantirishi: ${unitW}`);
        if (built(run).allUnits) assert.ok(r.units.checked, 'units.checked');
        assert.ok(!r.warnings.some(w => w.code === 'c_zero' || w.code === 'c_nan'), r.warnings.map(w => w.code).join(','));
      });
    }
  });
}

function built(run) {
  return { allUnits: run.state.params.every(p => run.state.units[p]) };
}

test('T-24: unit_affine ogohlantirishi shablonda e\'lon qilingan va haqiqatan chiqadi', () => {
  const tpl = wave.find(t => t.id === 'T-24');
  const syn = synthetic(tpl, 'copper');
  const r = T.evaluateTemplate(tpl, syn.data).result;
  assert.ok(r.warnings.some(w => w.code === 'unit_affine'));
});
