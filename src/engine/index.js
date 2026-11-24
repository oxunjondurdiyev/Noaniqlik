/* ═══════════════════════════════════════════════════════════════
   src/engine — UncertaintyCalc hisoblash dvigateli (sof ES modullar).
   Brauzer obyektlariga (DOM, global obyekt, brauzer xotirasi) bog'liq emas; brauzerda va Node'da bir xil.
   Yagona API: evaluate(modelSpec) → result. Hujjat: docs/ENGINE_API.md.
═══════════════════════════════════════════════════════════════ */
export { ENGINE_VERSION } from './version.js';
export { evaluate, prepareModel } from './evaluate.js';
// P20: LPU → MCM avtomatik qaror qoidasi (result.mcm); chegaralar — loyiha qarori
export { mcmDecision, mcmState, mcmMissing, MCM_THRESHOLDS, MCM_NON_NORMAL, MCM_ASYMMETRIC, MCM_REFS, MCM_STATES } from './mcm-decision.js';
// P06: Monte-Karlo 2.0 (JCGM 101:2008) — adaptiv protsedura, generator va taqsimotlar src/engine/mc/ da
export {
  monteCarlo, createMonteCarlo, mcOptions, numericalTolerance, coverageIntervals,
  MC_SEED, MC_DEFAULTS, MC_LIMITS, MC_MODES, MC_INTERVALS, MC_CRITERIA, MC_NONNORMAL_CORRELATION, VALIDATION_TOL_DIVISOR, RNG_DEFAULT, RNG_LEGACY, RNG_NAMES,
} from './montecarlo.js';
export { monteCarloLegacy } from './mc/legacy.js';
// P07: vektor chiqish (JCGM 102:2011) — LPU, qamrov sohasi, ko'p o'lchovli Monte-Karlo
export { evaluateMultivariate, isMultiOutput, singleState, MULTIVARIATE_MODE, OUTPUT_SETTINGS } from './multivariate/lpu.js';
export { evaluateImplicit, isImplicit, newtonSolve, luSolve, annexB, IMPLICIT_DEFAULTS, IMPLICIT_ERRORS, SINGULAR_PIVOT } from './multivariate/implicit.js';
export { gaussianRegion, ellipsoidFactor, rectangleFactor, ellipseOf, smallestRegion, SINGULAR_RATIO, SMALLEST_MESH } from './multivariate/region.js';
export { createMultivariateMonteCarlo, MIN_BLOCKS as MC_MIN_BLOCKS, maxTrialsFor } from './multivariate/montecarlo.js';
export { matMul, transpose, sandwich, choleskyLower, solveLower, symEigen, correlationMatrix, luFactor, qrHouseholder, norm1 } from './multivariate/linalg.js';
export { wichmannHill, xorshift32, createRng, whState } from './mc/rng.js';
export { MC_DISTRIBUTIONS, cholesky } from './mc/distributions.js';
export { normalize, toModel, FORMATS } from './spec.js';
export { typeA, typeAx, correlation } from './typeA.js';
export { typeB, getDivisor, getDivisorLabel, DIVISORS, DIST_PARAMS, distParamError, valueOrExpr } from './typeB.js';
export { coverage, coverageFactor, NU_RULES, DEFAULT_NU_RULE } from './coverage.js';
export { conformity, pendingConformity, multiPointCoverage, MODEL_KINDS } from './conformity.js';
// P05b: qaror qoidasi (JCGM 106:2012, ILAC G8:09/2019)
export { decide, decisionInput, decisionPreset, conformanceProbability, DECISION_RULES, DECISION_STATEMENTS, GUARD_PRESETS } from './decision.js';
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
export { evaluateMedical, MEDICAL_FORMAT, MEDICAL_SOURCE, MEDICAL_WARNINGS, MEDICAL_ERRORS, FEW_IQC, UNBALANCED_RATIO, BIAS_SIGNIFICANCE_FACTOR, MEDICAL_SCALES, MEDICAL_PRECISION, MEDICAL_POOL, MEDICAL_ALLOWABLE } from './medical/index.js';
// P05a: metrologik linter (docs/LINTER_RULES.md) — evaluate() natijasiga result.findings ni yozadi
export {
  lint, lintReported, lintMcm, RULES as LINTER_RULES, FINDING_CODES, SEVERITIES, LINTER_MODES, LINTER_THRESHOLDS, linterModeOf,
  withAcceptances, reportStatus, validateAcceptance, MIN_ACCEPT_COMMENT,
  grubbsCritical, grubbsStatistic, significantDigits, decimalPlaces,
} from './linter/index.js';
// P11: laboratoriya jarayonlari — etalonlar reestri, drift, CMC jadvali, QC kartalari, Westgard, kalibrlash intervali
export * from './lab/index.js';
// P12: malaka sinovlari (format 'uc-pt/1') va usul validatsiyasi statistikasi (format 'uc-validation/1')
export {
  evaluatePT, ptScores, verdictOf, primaryScore, ptToTopDownBias, lastRound as ptLastRound, ptLinkOf,
  PT_FORMAT, PT_SCORES, PT_LIMITS, PT_LIMITS_REF, PT_BOUNDARY_TOL, PT_UXPT_RATIO, PT_VERDICTS, PT_ERRORS, PT_NULL_REASONS, PT_FINDINGS,
} from './pt/index.js';
export {
  evaluateValidation, applyExclusions, VALIDATION_FORMAT, VALIDATION_TESTS, VALIDATION_ERRORS, VALIDATION_FINDINGS, MIN_EXCLUDE_COMMENT,
  grubbsTest, grubbsCriticalValue, GRUBBS_SIDES, GRUBBS_MIN_N, cochranTest, cochranCritical, oneWayAnova, twoSampleT, fTest, TAILS,
  lodFromBlank, lodFromCalibration, LOD_METHODS, LOD_FACTOR, LOQ_FACTOR_DEFAULT, LOD_CAL_FACTOR, LOQ_CAL_FACTOR, DEFAULT_ALPHA, topDownDraft,
} from './validation/index.js';
export { fCdf, fUpperTail, fCritical, tCriticalUpper, tUpperTail } from './stats/fdist.js';
export { varianceComponent, nonNegative, pooledSd } from './stats/anova.js';
