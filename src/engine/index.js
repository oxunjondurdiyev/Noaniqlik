/* ═══════════════════════════════════════════════════════════════
   src/engine — UncertaintyCalc hisoblash dvigateli (sof ES modullar).
   Brauzer obyektlariga (DOM, global obyekt, brauzer xotirasi) bog'liq emas; brauzerda va Node'da bir xil.
   Yagona API: evaluate(modelSpec) → result. Hujjat: docs/ENGINE_API.md.
═══════════════════════════════════════════════════════════════ */
export { ENGINE_VERSION } from './version.js';
export { evaluate, prepareModel } from './evaluate.js';
export { monteCarlo, MC_SEED } from './montecarlo.js';
export { normalize, toModel, FORMATS } from './spec.js';
export { typeA, typeAx, correlation } from './typeA.js';
export { typeB, getDivisor, getDivisorLabel, DIVISORS, valueOrExpr } from './typeB.js';
export { coverage, coverageFactor, NU_RULES, DEFAULT_NU_RULE } from './coverage.js';
export { conformity, multiPointCoverage } from './conformity.js';
export { splitFormula, tokenize, parse, compile, compileAst, derivative, toText } from './parser.js';
export { sensitivities, numericDerivative, higherDerivatives, secondOrderVariance, secondOrderTerms } from './sensitivity.js';
export { normalQuantile, normalCdf, tQuantile, tCoverage, tTail2, lgamma, lbeta, ibeta } from './special.js';
export { parseUnit, convert, analyzeDimensions, dimText } from './units.js';
export { toNum, isBlank, pairKey } from './util.js';
