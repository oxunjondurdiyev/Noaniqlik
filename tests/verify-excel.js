/* Verifies the GUM engine against the reference Excel workbooks:
   Noaniqlik_hisobi_gazoanalizator_KEDR-07.xlsx (3 points) and
   Noaniqlik_hisobi_termometr_MS-MK-3.xlsx (5 points).
   Run:  node tests/verify-excel.js
   P03: dvigatel — src/engine/, yaxlitlash — src/report/rounding.js (hisobot qatlami). */
const C = require('../src/engine/index.js');
const { roundResult } = require('../src/report/rounding.js');
const text = r => roundResult(r.y, r.U, r.roundUp).resultText;
const K = require('./excel-cases.js');
const exp = { gas: [['0.0000','0.0062',2.00],['0.018','0.021',2.52],['0.025','0.027',2.18]],
              term: [['0.31','0.41'],['0.21','0.47'],['-0.26','0.54'],['-0.40','0.66'],['-0.62','0.51']] };
let fails = 0;
K.gas.points.forEach((pt, i) => {
  const r = C.evaluate(K.gasState(pt));
  const ok = text(r) === exp.gas[i][0] + ' ± ' + exp.gas[i][1];
  if (!ok) fails++;
  console.log('GAZ', i + 1, ok ? 'OK ' : 'XX ', text(r), 'k', r.k.toFixed(2), 'nu', isFinite(r.nuEff) ? r.nuEff.toFixed(2) : '∞',
    'conf', r.conf && r.conf.guarded, 'warn', r.warnings.map(w => w.code + ':' + (w.param || '')).join(','));
});
K.term.points.forEach((pt, i) => {
  const r = C.evaluate(K.termState(pt));
  const ok = text(r) === exp.term[i][0] + ' ± ' + exp.term[i][1];
  if (!ok) fails++;
  console.log('TERM', i + 1, ok ? 'OK ' : 'XX ', text(r), 'uc', r.uc.toFixed(6), 'nu', r.nuEff.toFixed(0), 'conf', r.conf.simple, r.conf.guarded);
});
const mc = C.monteCarlo(K.gasState(K.gas.points[1]), 1000000);
console.log('MC gaz p2: [', mc.low.toFixed(4), mc.high.toFixed(4), '] half', mc.mcHalf.toFixed(4), 'GUM U', mc.gumU.toFixed(4), 'valid', mc.validated, '  (qo\'llanma: [−0.0111; 0.0469], 0.029)');
console.log(fails ? 'FAILS ' + fails : 'ALL MATCH');
process.exit(fails ? 1 : 0);
