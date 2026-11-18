/* UI testlari uchun umumiy yordamchi: src/js/calc.js dagi `window.Calc` ko'prigining linter / hisobot qismi
   (P05a). jsdom'da report.js ni yuklaydigan testlar `w.Calc` ga shu maydonlarni qo'shadi. */
'use strict';
const E = require('../../src/engine/index.js');
const F = require('../../src/report/findings.js');
const { createSections } = require('../../src/report/sections.js');
const { summaryRows } = require('../../src/report/summary.js');
const FM = require('../../src/report/forms.js');
const FT = require('../../src/report/footer.js');
const RQ = require('../../src/report/requisites.js');
const { buildCalcDoc } = require('../../src/io/calc-json.js');
const { newMeta, metaFor } = require('../../src/io/calc-meta.js');
const { loadQr } = require('../../src/io/vendor.js');

const reportBridge = {
  decisionPreset: E.decisionPreset,
  lint: E.lint, lintReported: E.lintReported, FINDING_CODES: E.FINDING_CODES, MIN_ACCEPT_COMMENT: E.MIN_ACCEPT_COMMENT,
  validateAcceptance: E.validateAcceptance, MODEL_KINDS: E.MODEL_KINDS, MC_SEED: E.MC_SEED,
  findingsBlockHTML: F.findingsBlockHTML, findingsStatus: F.findingsStatus, findingText: F.findingText,
  createSections, summaryRows, buildReport: FM.buildReport, REPORT_FORMS: FM.REPORT_FORMS, DEFAULT_FORM: FM.DEFAULT_FORM, requisiteFields: FM.requisiteFields,
  footerModel: FT.footerModel, qrSvg: FT.qrSvg, cleanRequisites: RQ.cleanRequisites, splitRequisites: RQ.splitRequisites, missingRequisites: RQ.missingRequisites,
  validLogo: RQ.validLogo, MAX_LOGO_BYTES: RQ.MAX_LOGO_BYTES, buildCalcDoc, loadQr, newMeta, metaFor,
  decide: E.decide, GUARD_PRESETS: E.GUARD_PRESETS, DECISION_RULES: E.DECISION_RULES, multiPointCoverage: E.multiPointCoverage,
  watermarkHTML: F.watermarkHTML, criticalMarkHTML: F.criticalMarkHTML, reportMarks: F.reportMarks, modelKindText: F.modelKindText,
};

module.exports = { reportBridge };
