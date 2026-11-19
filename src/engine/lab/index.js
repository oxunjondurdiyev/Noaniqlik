/* ═══════════════════════════════════════════════════════════════
   src/engine/lab — laboratoriya jarayonlari (P11): etalonlar reestri, drift, CMC jadvali, QC kartalari,
   Westgard qoidalari, kalibrlash intervali tavsiyasi. Sof ES modullar (DOM / brauzer xotirasi / soat yo'q).
   Hujjat: docs/ENGINE_API.md §14. Saqlash — src/storage/registry.js (IndexedDB, audit zanjiri).
═══════════════════════════════════════════════════════════════ */
export { dayNumber, isDate, daysBetween, fromDayNumber, addDays } from './dates.js';
export {
  REGISTRY_FORMAT, REGISTRY_KINDS, TRACEABILITY_ROUTES, RECOGNISED_ROUTES, REGISTRY_ERRORS, REGISTRY_ROLES, EXPIRY_WARN_DAYS,
  cleanPoint, cleanCalibration, cleanStandard, sortedCalibrations, currentCalibration, pointAt, sourceFromStandard,
  validityStatus, hasTraceabilityEvidence,
} from './registry.js';
export {
  DRIFT_METHODS, DRIFT_DISTRIBUTIONS, DRIFT_DEFAULTS, DRIFT_MIN_CALIBRATIONS, DRIFT_ERRORS,
  correctionHistory, linearTrend, driftProposal, driftComponent,
} from './drift.js';
export { CMC_TYPES, CMC_ERRORS, cleanCmcRow, cmcRowError, inRange as cmcInRange, cmcAt, findCmc, cmcCheck, cmcCheckRows } from './cmc.js';
export {
  SHEWHART_CONSTANTS, QC_MIN_SUBGROUP, QC_MAX_SUBGROUP, QC_ERRORS, QC_TYPES,
  sampleSd, individualsChart, xbarRChart, targetLimits, zScores, sRwFromChart,
} from './qc.js';
export { WESTGARD_RULES, WESTGARD_KIND, WESTGARD_FUNCTIONS, rule13s, rule22s, ruleR4s, rule41s, rule10x, westgard, westgardMulti } from './westgard.js';
export { INTERVAL_MIN_CALIBRATIONS, INTERVAL_ERRORS, intervalRecommendation } from './interval.js';
