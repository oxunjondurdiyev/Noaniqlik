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
export { conformity, pendingConformity, multiPointCoverage, MODEL_KINDS } from './conformity.js';
// P05b: qaror qoidasi (JCGM 106:2012, ILAC G8:09/2019)
export { decide, decisionInput, conformanceProbability, DECISION_RULES, DECISION_STATEMENTS, GUARD_PRESETS } from './decision.js';
export { splitFormula, tokenize, parse, compile, compileAst, derivative, toText } from './parser.js';
export { sensitivities, numericDerivative, higherDerivatives, secondOrderVariance, secondOrderTerms } from './sensitivity.js';
export { normalQuantile, normalCdf, tQuantile, tCoverage, tTail2, lgamma, lbeta, ibeta } from './special.js';
export { parseUnit, convert, analyzeDimensions, dimText } from './units.js';
export { toNum, isBlank, pairKey } from './util.js';
// P08: regressiya va kalibrlash egri chiziqlari (format 'uc-regression/1')
export {
  evaluateRegression, REGRESSION_FORMAT, REGRESSION_METHODS, REGRESSION_WARNINGS, PARAM_NAMES,
  fitPolynomial, fitWtls, predict, inversePredict, uRangeFunction, uRangeAt, URANGE_MODES,
  chi2Cdf, chi2Quantile, gammaP,
} from './regression/index.js';
// P09: top-down va empirik kattaliklar (format 'uc-topdown/1')
export {
  evaluateTopDown, TOPDOWN_FORMAT, TOPDOWN_APPROACHES, TOPDOWN_CATEGORIES, TOPDOWN_WARNINGS, TOPDOWN_ERRORS, APPROACH_REF,
  evaluateRw, duplicateSd, evaluateBias, evaluateRecovery, evaluateReproducibility, levelUncertainty, fitLevelModel,
  makeContext, REFERENCE_METHODS, NU_EFF_WARN_BELOW, RW_TYPES, DUPLICATE_RELATIVE_METHODS, BIAS_TYPES, RECOVERY_CORRECTIONS, ROBUST_SD_FACTOR, MIN_PT_ROUNDS, LIMIT_FACTOR,
} from './topdown/index.js';
// P10: maxsus rejimlar — namuna olish, sifatli testlar, mikrobiologiya (beta), tibbiy laboratoriya (beta)
export {
  evaluateSampling, classicalAnova, robustAnova, SAMPLING_FORMAT, SAMPLING_METHODS, SAMPLING_WARNINGS, SAMPLING_ERRORS,
  MIN_TARGETS, FITNESS_VARIANCE_PCT, HUBER_C, HUBER_BETA,
} from './sampling/index.js';
export {
  evaluateQualitative, wilsonInterval, clopperPearsonInterval, posterior, QUALITATIVE_FORMAT, QUALITATIVE_WARNINGS, QUALITATIVE_ERRORS, SMALL_N, CI_METHODS, DEFAULT_CI_METHOD,
} from './qualitative/index.js';
export { evaluateMicro, logDuplicateSd, MICRO_FORMAT, MICRO_WARNINGS, MICRO_ERRORS, LOG10_E, LOW_COUNT_DEFAULT } from './micro/index.js';
export { evaluateMedical, MEDICAL_FORMAT, MEDICAL_WARNINGS, MEDICAL_ERRORS, FEW_IQC } from './medical/index.js';
// P05a: metrologik linter (docs/LINTER_RULES.md) — evaluate() natijasiga result.findings ni yozadi
export {
  lint, lintReported, RULES as LINTER_RULES, FINDING_CODES, SEVERITIES, LINTER_MODES, LINTER_THRESHOLDS, linterModeOf,
  withAcceptances, reportStatus, validateAcceptance, MIN_ACCEPT_COMMENT,
  grubbsCritical, grubbsStatistic, significantDigits, decimalPlaces,
} from './linter/index.js';
