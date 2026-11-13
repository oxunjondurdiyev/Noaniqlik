/* ═══════════════════════════════════════════════════════════════
   EVALUATE.JS — GUM baholashi: y = f(x1…xN), A/B tur, korrelyatsiya, c_i,
   u_c, ν_eff, k, U, byudjet, 2-tartibli hadlar diagnostikasi, o'lchamlik tahlili.
   Natija YAXLITLANMAYDI (yaxlitlash — src/report/rounding.js, CLAUDE.md).
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from './version.js';
import { isBlank, toNum, pairKey } from './util.js';
import { splitFormula, parse, compileAst } from './parser.js';
import { typeA, typeAx, correlation } from './typeA.js';
import { typeB, valueOrExpr } from './typeB.js';
import { coverage, DEFAULT_NU_RULE } from './coverage.js';
import { sensitivities, higherDerivatives, secondOrderTerms } from './sensitivity.js';
import { conformity } from './conformity.js';
import { parseUnit, analyzeDimensions, dimEqual, dimText } from './units.js';
import { normalize } from './spec.js';

const DEFAULT_NONLIN_THRESHOLD = 0.01; // 1 % (PLAN P03 5-band; laboratoriya sozlamasi)

/** Model formulasini tayyorlash: { f, ast, symbol, formulaText } yoki { error } */
export function prepareModel(state) {
  const params = state.params || [];
  const model = state.model || {};
  const { symbol: lhs, expr } = splitFormula(model.formula);
  if (!expr) {
    if (params.length !== 1) return { error: 'need_formula' };
    const only = params[0];
    return { f: e => e[only], ast: null, symbol: only, formulaText: only, expr: '' };
  }
  let ast;
  try { ast = parse(expr, params); }
  catch (err) { return { error: 'bad_formula', detail: String(err.message || '').replace(/^unknown:/, '') }; }
  return { f: compileAst(ast), ast, symbol: lhs || 'y', formulaText: expr, expr };
}

/**
 * To'liq GUM baholashi.
 * @param {object} spec  modelSpec ('uc-model/1' | {format:'calc-state/v2', state} | calc-state obyekti)
 * @returns {object} result (docs/ENGINE_API.md) yoki { error: code, detail }
 */
export function evaluate(spec) {
  const norm = normalize(spec);
  if (norm.error) return { error: norm.error, detail: norm.detail };
  const state = norm.state;

  const params   = state.params || [];
  const model    = state.model || {};
  const settings = state.settings || {};
  const paired   = settings.paired !== false;
  const P        = Number(settings.P) || 0.9545;
  const methods  = settings.typeA || {};
  const dirs     = state.directions || [];
  const nuRule   = settings.nuRule || DEFAULT_NU_RULE;

  // 1. Model. Ref: JCGM 100:2008 §4.1.1, §4.1.4
  const mdl = prepareModel(state);
  if (mdl.error) return mdl;
  const { f, ast, symbol, formulaText, expr } = mdl;

  // 2–3. Kirish bahosi va A tur. Ref: JCGM 100:2008 §4.2
  const inputs = [];
  for (const p of params) {
    const opt = { ...(methods[p] || {}), dirs };
    const ta = typeAx(state.measurements ? state.measurements[p] : [], opt);
    if (!ta) return { error: 'need_data', detail: p };
    inputs.push({ name: p, ...ta });
  }
  const means = {};
  inputs.forEach(inp => { means[inp.name] = inp.mean; });

  // 4. B tur (yarim kenglik kirish o'rtachalaridan ifoda bo'lishi mumkin). Ref: JCGM 100:2008 §4.3
  const comps = [];
  for (const c of (state.typeB || [])) {
    let a;
    try { a = valueOrExpr(c.halfWidth, params, means); }
    catch (_) { return { error: 'bad_halfwidth', detail: c.name }; }
    const std  = typeB(a, c.distribution, c.k);
    const mult = (c.sensitivity === undefined || c.sensitivity === null || c.sensitivity === '') ? 1 : Number(c.sensitivity) || 0;
    const param = params.includes(c.param) ? c.param : params[0];
    const nuB = toNum(c.nu);
    // Ref: JCGM 100:2008 G.4.2 — B tur ν_i ko'rsatilmasa ∞ (aniq ma'lum deb)
    comps.push({ ...c, param, a, std, mult, u: Math.abs(mult) * std, nu: isFinite(nuB) && nuB > 0 ? nuB : Infinity });
  }
  // ↑/↓ o'qishlardan histerezis: to'g'ri burchakli, yarim kenglik h/2. Ref: JCGM 100:2008 §4.3.7
  inputs.forEach(inp => {
    if (inp.directional && inp.h > 0) {
      const a = inp.h / 2;
      comps.push({ name: 'hysteresis', auto: true, param: inp.name, a, halfWidth: a, distribution: 'rect',
                   std: a / Math.sqrt(3), mult: 1, u: a / Math.sqrt(3), nu: Infinity });
    }
  });

  // 5. Har bir kirishning standart noaniqligi u²(x_i) = u_A² + Σ u_B². Ref: JCGM 100:2008 §5.1.2
  inputs.forEach(inp => {
    const own = comps.filter(c => c.param === inp.name);
    inp.uB2 = own.reduce((a, c) => a + c.u * c.u, 0);
    inp.uB  = Math.sqrt(inp.uB2);
    inp.u   = Math.sqrt(inp.uA * inp.uA + inp.uB2);
  });

  // 6. Baho va sezgirlik koeffitsiyentlari. Ref: JCGM 100:2008 §4.1.4, §5.1.3
  const y = f(means);
  if (!isFinite(y)) return { error: 'formula_eval' };
  const sens = sensitivities(ast, f, inputs);
  const warnings = [];
  inputs.forEach((inp, i) => {
    const s = sens[i];
    inp.c = s.c;
    inp.cMethod = s.method;
    inp.cNumeric = s.cNum;
    if (s.method === 'none') warnings.push({ code: 'c_nan', param: inp.name });
    else if (s.method === 'numeric') warnings.push({ code: 'c_numeric', param: inp.name });
    else if (s.mismatch) warnings.push({ code: 'c_mismatch', param: inp.name, value: s.cNum });
    if (inp.c === 0 && s.method !== 'none') warnings.push({ code: 'c_zero', param: inp.name });
  });

  // 7. Kirishlar orasidagi korrelyatsiya. Ref: JCGM 100:2008 §5.2.2 (Eq. 13, 14), §5.2.3 (Eq. 17), F.1.2
  const covB = state.covB || {};
  const pairs = [];
  for (let i = 0; i < inputs.length; i++) {
    for (let j = i + 1; j < inputs.length; j++) {
      const a = inputs[i], b = inputs[j];
      const rA   = paired ? correlation(a.rowVals, b.rowVals) : 0;
      const covA = rA * a.uA * b.uA;
      const cB   = toNum(covB[pairKey(a.name, b.name)]);
      const cov  = covA + (isFinite(cB) ? cB : 0);
      // Ref: JCGM 100:2008 §5.2.2, Eq. (14): r = u(x_i,x_j)/(u(x_i)u(x_j)), −1 ≤ r ≤ +1 (C.3.6)
      if (cov !== 0 && !(a.u > 0 && b.u > 0)) return { error: 'bad_correlation', detail: pairKey(a.name, b.name) };
      const r    = (a.u > 0 && b.u > 0) ? cov / (a.u * b.u) : 0;
      if (Math.abs(r) > 1 + 1e-9) return { error: 'bad_correlation', detail: pairKey(a.name, b.name), value: r };
      pairs.push({ a: a.name, b: b.name, rA, covA, covB: isFinite(cB) ? cB : 0, cov, r,
                   term: 2 * a.c * b.c * cov, termA: 2 * a.c * b.c * covA });
    }
  }

  // 8. Yig'indi dispersiya (1-tartibli). Ref: JCGM 100:2008 §5.1.2 Eq. (10), §5.2.2 Eq. (13)
  const varNoCorr = inputs.reduce((s, inp) => s + (inp.c * inp.u) ** 2, 0);
  const corrSum   = pairs.reduce((s, p) => s + p.term, 0);
  const uc2First  = varNoCorr + corrSum;
  // Manfiy dispersiya — kovariatsiya matritsasi musbat yarim aniqlanmagan (C.3.6) → xato (PLAN P03 6-band)
  if (uc2First < -1e-12 * (varNoCorr + Math.abs(corrSum))) return { error: 'negative_variance', value: uc2First };

  // 9. 2-tartibli hadlar — diagnostika; standartda u_c ga QO'SHILMAYDI. Ref: JCGM 100:2008 §5.1.2 Note
  let secondOrder = null;
  if (ast) {
    const hd = higherDerivatives(ast, f, inputs, sens);
    const so = secondOrderTerms(inputs.map(i => i.c), hd.H, hd.T3, inputs.map(i => i.u));
    const u2 = so.u2;
    const threshold = isFinite(toNum(settings.nonlinThreshold)) ? toNum(settings.nonlinThreshold) : DEFAULT_NONLIN_THRESHOLD;
    const base = Math.max(0, uc2First);
    const index = base > 0 ? u2 / base : (u2 > 0 ? Infinity : 0);
    secondOrder = {
      u2, index, threshold, numeric: hd.numeric,
      terms: so.terms.map(t => ({ a: inputs[t.i].name, b: inputs[t.j].name, value: t.value })),
      included: settings.secondOrder === true,
      // Manbadagi haqiqiylik sharti: har bir X_i normal, korrelyatsiyasiz
      validCondition: pairs.every(p => p.cov === 0),
    };
    if (Math.abs(index) > threshold) warnings.push({ code: 'nonlinear', value: (index * 100).toPrecision(3) });
  }
  const uc2 = Math.max(0, uc2First + (secondOrder && secondOrder.included ? secondOrder.u2 : 0));
  const uc  = Math.sqrt(uc2);
  const ucNoCorr = Math.sqrt(varNoCorr);

  // 10. Welch–Satterthwaite (B tur: ko'rsatilmasa ν = ∞). Ref: JCGM 100:2008 G.4.1 Eq. (G.2b), G.4.2
  let denom = inputs.reduce((s, inp) =>
    s + (isFinite(inp.nu) && inp.uA > 0 ? Math.pow(inp.c * inp.uA, 4) / inp.nu : 0), 0);
  comps.forEach(cm => {
    if (isFinite(cm.nu)) {
      const ci = inputs.find(i => i.name === cm.param).c;
      denom += Math.pow(ci * cm.u, 4) / cm.nu;
    }
  });
  const nuEff = denom > 0 ? Math.pow(uc, 4) / denom : Infinity;

  // 11. Qamrov koeffitsiyenti va kengaytirilgan noaniqlik. Ref: JCGM 100:2008 §6.2.1, §6.3, G.4.1 (Q-1(a))
  const kMethod = settings.kMethod === 'k2' ? 'k2' : 'nu';
  // Ref: EA-4/02 M:2022 §5 — k = 2 (qat'iy)
  const cov = kMethod === 'k2' ? { k: 2, nuUsed: nuEff, rule: nuRule, distribution: 'k2' } : coverage(P, nuEff, nuRule);
  const k = cov.k;
  const U = k * uc;
  if (isFinite(nuEff) && nuEff < 1 && kMethod === 'nu') warnings.push({ code: 'nu_lt1', value: nuEff.toPrecision(3) });

  // Byudjet. Ref: EA-4/02 M:2022 §7 (noaniqlik byudjeti jadvali)
  const budget = [];
  inputs.forEach(inp => {
    if (inp.n > 1 || inp.method === 2) {
      budget.push({ kind: 'A', name: inp.name, param: inp.name, dist: 'normal', n: inp.n, method: inp.method,
                    directional: inp.directional, nu: inp.nu, u: inp.uA, c: inp.c, contrib: (inp.c * inp.uA) ** 2 });
    }
    comps.filter(cm => cm.param === inp.name).forEach(cm => {
      budget.push({ kind: 'B', name: cm.name, auto: !!cm.auto, param: inp.name, dist: cm.distribution, unit: cm.unit,
                    nu: cm.nu, u: cm.u, c: inp.c, contrib: (inp.c * cm.u) ** 2 });
    });
  });
  pairs.forEach(p => {
    if (p.cov !== 0) {
      budget.push({ kind: 'corr', name: p.a + ' ↔ ' + p.b, param: '', dist: '',
                    u: p.cov, c: 2 * inputs.find(i => i.name === p.a).c * inputs.find(i => i.name === p.b).c,
                    contrib: p.term });
    }
  });
  if (secondOrder && secondOrder.included && secondOrder.u2 !== 0) {
    budget.push({ kind: 'second', name: '2nd order', param: '', dist: '', u: null, c: null, contrib: secondOrder.u2 });
  }
  budget.forEach(row => {
    row.ui = row.kind === 'corr' || row.kind === 'second' ? null : Math.abs(row.c) * row.u;
    row.share = uc2 > 0 ? row.contrib / uc2 * 100 : 0;
  });

  // 12. Tekshiruv — GUM H.2, 2-yondashuv: har bir juftlangan qatordan y_i (faqat oddiy A tur)
  let verify = null;
  const n0 = inputs[0].n;
  const plain = inputs.every(inp => inp.method === 1 && !inp.directional);
  const rowsOk = paired && expr && plain && inputs.every(inp => inp.n === n0) && n0 > 1 &&
    inputs[0].rowVals.every((_, r) => {
      const fin = inputs.map(inp => isFinite(inp.rowVals[r]));
      return fin.every(Boolean) || !fin.some(Boolean);
    });
  if (rowsOk) {
    const ys = [];
    inputs[0].rowVals.forEach((v, r) => {
      if (!isFinite(v)) return;
      const env = {};
      inputs.forEach(inp => { env[inp.name] = inp.rowVals[r]; });
      ys.push(f(env));
    });
    if (ys.every(isFinite)) {
      const st = typeA(ys);
      const varA = inputs.reduce((s, inp) => s + (inp.c * inp.uA) ** 2, 0) + pairs.reduce((s, p) => s + p.termA, 0);
      const uAformula = Math.sqrt(Math.max(0, varA));
      verify = { ys, mean: st.mean, uAdirect: st.uA, uAformula,
                 diffPct: st.uA > 0 ? (uAformula - st.uA) / st.uA * 100 : 0 };
    }
  }

  // Muvofiqlik, keltirilgan xato, CMC. MPE byudjetga KIRMAYDI (CLAUDE.md)
  let conf = null;
  if (!isBlank(settings.mpe)) {
    let mpe;
    try { mpe = Math.abs(valueOrExpr(settings.mpe, params, means)); }
    catch (_) { return { error: 'bad_mpe' }; }
    conf = conformity(y, U, mpe);
  }
  const range = toNum(settings.range);
  const gamma = isFinite(range) && range > 0 ? Math.abs(y) / range * 100 : null;

  // O'lchamlik tahlili (ixtiyoriy; birliksiz eski hisoblar — faqat eslatma). Ref: JCGM GUM-6:2020 §11 (tekshirilmagan)
  const notes = [];
  const unitsIn = state.units || {};
  const parsedUnits = {};
  params.forEach(p => { const u = parseUnit(unitsIn[p]); if (u) parsedUnits[p] = u; });
  const units = { checked: false, output: null };
  if (Object.keys(parsedUnits).length === 0) {
    notes.push({ code: 'units_unchecked' });
  } else {
    units.checked = Object.keys(parsedUnits).length === params.length;
    if (!units.checked) notes.push({ code: 'units_partial' });
    const dims = ast ? analyzeDimensions(ast, parsedUnits) : { dim: parsedUnits[params[0]] ? parsedUnits[params[0]].dim : null, problems: [] };
    const err = dims.problems.find(p => p.severity === 'error');
    if (err) return { error: err.code, detail: err.detail };
    dims.problems.forEach(p => warnings.push({ code: p.code, value: p.detail }));
    units.output = dims.dim ? dimText(dims.dim) : null;
    const outU = parseUnit(model.unit);
    if (dims.dim && outU && !dimEqual(dims.dim, outU.dim)) {
      warnings.push({ code: 'unit_output', value: `${model.unit} [${dimText(outU.dim)}] ≠ [${dimText(dims.dim)}]` });
    }
    // c_i·u(x_i): B komponent birligi kirish birligiga mos bo'lishi kerak (ko'paytuvchi 1 bo'lsa)
    comps.forEach(cm => {
      if (cm.auto || cm.mult !== 1) return;
      const iu = parsedUnits[cm.param], cu = parseUnit(cm.unit);
      if (iu && cu && !dimEqual(iu.dim, cu.dim)) {
        warnings.push({ code: 'unit_budget', param: cm.param, value: `${cm.name}: ${cm.unit} ≠ ${unitsIn[cm.param]}` });
      }
    });
  }

  // Ogohlantirishlar (CLAUDE.md: U = 0 va U < CMC ogohlantirishsiz chiqmaydi)
  inputs.forEach(inp => inp.warnings.forEach(w => warnings.push({ code: w, param: inp.name })));
  const cmc = toNum(settings.cmc);
  if (isFinite(cmc) && cmc > 0 && U < cmc) warnings.push({ code: 'below_cmc', value: cmc });
  if (U === 0) warnings.push({ code: 'zero_u' });

  const coverageInfo = { method: kMethod === 'k2' ? 'k2' : cov.distribution, nuRule: cov.rule, nuUsed: cov.nuUsed, P };
  const out = {
    symbol, formula: formulaText, unit: model.unit || '',
    y, uc2, uc, nuEff, k, U, coverage: coverageInfo,
  };
  return {
    engineVersion: ENGINE_VERSION,
    outputs: [out],
    symbol, formulaText, unit: model.unit || '', P, paired, kMethod, nuRule: cov.rule,
    roundUp: settings.rounding === 'up', rounding: settings.rounding === 'up' ? 'up' : 'normal',
    inputs: inputs.map(({ rowVals, deviations, values, warnings: w, ...rest }) => rest),
    pairs, budget, verify, conf, gamma, warnings, notes, units, secondOrder, cmc: isFinite(cmc) ? cmc : null,
    y, mean: y, uc2, uc, ucNoCorr, uc2FirstOrder: Math.max(0, uc2First),
    corrEffectPct: ucNoCorr > 0 ? (uc - ucNoCorr) / ucNoCorr * 100 : 0,
    nuEff, k, U, coverage: coverageInfo,
    relUc: y ? uc / Math.abs(y) * 100 : null, relU: y ? U / Math.abs(y) * 100 : null,
  };
}
