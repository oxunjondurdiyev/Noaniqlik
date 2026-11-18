/* UI testlari uchun umumiy yordamchi: src/js/calc.js dagi `window.Calc` ko'prigining linter / hisobot qismi
   (P05a). jsdom'da report.js ni yuklaydigan testlar `w.Calc` ga shu maydonlarni qo'shadi. */
'use strict';
const E = require('../../src/engine/index.js');
const F = require('../../src/report/findings.js');

const reportBridge = {
  lint: E.lint, lintReported: E.lintReported, FINDING_CODES: E.FINDING_CODES, MIN_ACCEPT_COMMENT: E.MIN_ACCEPT_COMMENT,
  validateAcceptance: E.validateAcceptance, MODEL_KINDS: E.MODEL_KINDS, MC_SEED: E.MC_SEED,
  findingsBlockHTML: F.findingsBlockHTML, findingsStatus: F.findingsStatus, findingText: F.findingText,
  watermarkHTML: F.watermarkHTML, criticalMarkHTML: F.criticalMarkHTML, reportMarks: F.reportMarks, modelKindText: F.modelKindText,
};

module.exports = { reportBridge };
