/* ═══════════════════════════════════════════════════════════════
   MULTIVARIATE/LPU.JS — vektor chiqish uchun noaniqlikning tarqalish qonuni (P07). Sof modul.
   Oshkor model Y = f(X), f = (f_1, …, f_m)ᵀ. Manba: JCGM 102:2011 §6.2 (Eq. 3: U_y = C_x U_x C_xᵀ), §6.5.

   Har bir chiqish avval bir o'lchamli yo'l bilan (evaluate.js — O'ZGARMAGAN) baholanadi: y_j, u_c(y_j), ν_eff, k, U,
   byudjet, topilmalar aynan bitta formulali hisobdagidek. So'ng shu natijalardagi c_i lardan C_x (m × N) va
   kirishlarning u(x_i), u(x_i, x_j) laridan U_x yig'iladi — bir xil kirish bir nechta formulada qatnashsa,
   chiqishlar orasidagi kovariatsiya avtomatik chiqadi.
   Kompleks kattaliklar (§6.4): haqiqiy va mavhum qism alohida chiqish sifatida beriladi (masalan R va X).
   Oshkor bo'lmagan model h(Y, X) = 0 (§6.3) — qo'llab-quvvatlanmaydi (docs/RISKS.md).
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { splitFormula, parse } from '../parser.js';
import { cholesky } from '../mc/distributions.js';
import { sandwich, correlationMatrix, zeros } from './linalg.js';
import { gaussianRegion } from './region.js';

export const MULTIVARIATE_MODE = 'MULTIVARIATE';
/** Chiqishga xos sozlamalar (umumiy sozlamalardan olib tashlanadi; outputs[j].settings orqali beriladi) */
export const OUTPUT_SETTINGS = Object.freeze(['mpe', 'modelKind', 'nominal', 'range', 'cmc', 'decisionRule', 'guardR', 'decisionStatement', 'tolLower', 'tolUpper', 'agreement', 'decisionPreset']);

/** Holatda bir nechta chiqish bormi */
export const isMultiOutput = state => !!state && Array.isArray(state.outputs) && state.outputs.length > 1;

/** j-chi chiqish uchun bir o'lchamli holat (bir xil kirishlar, bitta formula) */
export function singleState(state, j) {
  const o = state.outputs[j] || {};
  const settings = { ...(state.settings || {}) };
  for (const k of OUTPUT_SETTINGS) delete settings[k];
  const st = { ...state, model: { formula: o.formula, unit: o.unit || '' }, settings: { ...settings, ...(o.settings || {}) } };
  delete st.outputs;
  return st;
}

function referenced(formula, params) {
  const names = new Set();
  const { expr } = splitFormula(formula);
  if (!expr) return names;
  let ast;
  try { ast = parse(expr, params); } catch (_) { return names; }
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.k === 'var') names.add(n.n);
    walk(n.a); walk(n.b);
  })(ast);
  return names;
}

/**
 * @param {object} state        normallashtirilgan holat (calc-state/v2 + outputs[])
 * @param {(state:object)=>object} evalSingle  bir o'lchamli baholash (evaluate) — siklik importdan qochish uchun uzatiladi
 * @returns {object} natija (docs/ENGINE_API.md §13) yoki { error, detail, output }
 */
export function evaluateMultivariate(state, evalSingle) {
  const params = state.params || [];
  const m = state.outputs.length, N = params.length;
  const results = [], symbols = [];
  for (let j = 0; j < m; j++) {
    const r = evalSingle(singleState(state, j));
    if (r.error) return { error: r.error, detail: r.detail, output: j };
    if (r.mode) return { error: 'bad_spec', detail: 'outputs', output: j };
    const sym = state.outputs[j].name || r.symbol || `Y${j + 1}`;
    if (symbols.includes(sym)) return { error: 'duplicate_output', detail: sym, output: j };
    symbols.push(sym);
    results.push(r);
  }
  const r0 = results[0];

  // Ref: JCGM 102:2011 §6.2.1.3 — C_x: (m × N), elementlari ∂f_j/∂X_i (x da); mavjud simvolik / sonli hosila kodidan
  const C = results.map(r => r.inputs.map(i => (isFinite(i.c) ? i.c : 0)));
  // U_x: diagonal u²(x_i), diagonaldan tashqari u(x_i, x_j) (JCGM 100:2008 §5.2.2, F.1.2) — barcha chiqishlar uchun bir xil
  const Ux = zeros(N, N);
  r0.inputs.forEach((inp, i) => { Ux[i][i] = inp.u * inp.u; });
  for (const p of r0.pairs) {
    const i = params.indexOf(p.a), k = params.indexOf(p.b);
    Ux[i][k] = p.cov; Ux[k][i] = p.cov;
  }
  // U_x musbat yarim aniqlangan bo'lishi shart — jimgina tuzatilmaydi (JCGM 102:2011 §3.20 Note 1 — kovariatsiya matritsasi xossasi)
  if (!cholesky(Ux)) return { error: 'invalid_covariance', detail: params.join(', ') };
  // Ref: JCGM 102:2011 Eq. (3) — U_y = C_x U_x C_xᵀ
  const Uy = sandwich(C, Ux);
  const y = results.map(r => r.y);
  const Ry = correlationMatrix(Uy);
  const P = r0.P;
  const region = gaussianRegion(y, Uy, P);

  const outputs = results.map((r, j) => {
    const used = referenced(state.outputs[j].formula, params);
    return {
      ...r.outputs[0], symbol: symbols[j],
      relU: r.relU, relUc: r.relUc, conf: r.conf, decision: r.decision, modelKind: r.modelKind, deviation: r.deviation, gamma: r.gamma,
      inputsUsed: params.filter(p => used.has(p)),
      // Eq. (3) diagonali — bir o'lchamli u_c² bilan bir xil bo'lishi kerak (1-tartib); 2-tartibli hadlar U_y ga kirmaydi
      varianceFromUy: Uy[j][j],
    };
  });
  // Topilmalar: har bir chiqishniki (chiqish belgisi bilan). Formulada qatnashmagan kirish uchun c = 0 ogohlantirishi olib tashlanadi
  const outputFindings = [];
  results.forEach((r, j) => {
    const used = outputs[j].inputsUsed;
    for (const f of r.findings || []) {
      if (f.code === 'c_zero' && f.param && !used.includes(f.param)) continue;
      outputFindings.push({ ...f, id: `${symbols[j]}:${f.id}`, output: symbols[j] });
    }
  });
  return {
    engineVersion: ENGINE_VERSION, mode: MULTIVARIATE_MODE,
    P, m, N, symbols,
    outputs, results,
    inputs: r0.inputs.map(({ c, cMethod, cNumeric, ...rest }) => { void c; void cMethod; void cNumeric; return rest; }),
    pairs: r0.pairs.map(p => ({ a: p.a, b: p.b, cov: p.cov, r: p.r })),
    sensitivity: C, inputCovariance: Ux,
    y, covariance: Uy, correlation: Ry,
    coverageRegion: region,
    roundUp: r0.roundUp, rounding: r0.rounding, paired: r0.paired, nuRule: r0.nuRule, kMethod: r0.kMethod,
    warnings: [], notes: r0.notes || [], outputFindings,
  };
}
