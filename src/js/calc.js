/* ═══════════════════════════════════════════════════════════════
   CALC.JS — brauzer uchun yupqa moslik qatlami (P03).
   Hisoblash: src/engine/ (sof ES modullar, docs/ENGINE_API.md).
   Yaxlitlash va ko'rsatish: src/report/ (hisobot qatlami).
   Bu fayl `<script type="module">` sifatida yuklanadi va P00 dagi `window.Calc`
   API'sini saqlaydi (table.js, typeB.js, points.js, report.js, app.js uchun).
   Eslatma: Calc.evaluate natijasida endi Uround/yround/resultText YO'Q —
   ular hisobot qatlamida Calc.roundResult(y, U, roundUp) orqali olinadi.
═══════════════════════════════════════════════════════════════ */
import * as engine from '../engine/index.js';
import { roundResult, roundHalfAway, roundUpAway } from '../report/rounding.js';
import { fmt, fmtSci } from '../report/format.js';

const Calc = Object.freeze({
  ENGINE_VERSION: engine.ENGINE_VERSION,
  evaluate: engine.evaluate,
  monteCarlo: engine.monteCarlo,
  typeA: engine.typeA,
  typeAx: engine.typeAx,
  typeB: engine.typeB,
  getDivisor: engine.getDivisor,
  getDivisorLabel: engine.getDivisorLabel,
  DIVISORS: engine.DIVISORS,
  splitFormula: engine.splitFormula,
  compile: engine.compile,
  coverageFactor: engine.coverageFactor,
  correlation: engine.correlation,
  pairKey: engine.pairKey,
  conformity: engine.conformity,
  multiPointCoverage: engine.multiPointCoverage,
  valueOrExpr: engine.valueOrExpr,
  toNum: engine.toNum,
  // hisobot qatlami
  roundResult, roundHalfAway, roundUpAway, fmt, fmtSci,
});

window.Calc = Calc;
export default Calc;
