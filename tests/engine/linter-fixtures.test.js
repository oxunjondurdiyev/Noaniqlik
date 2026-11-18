/* P05a qabul mezonlari (docs/PLAN.md P05):
   1) 9 ta to'g'ri etalon Excel nuqtasida (zichlik 1 + gazoanalizator 3 + termometr 5) `error` topilmasi YO'Q;
   2) gazoanalizator qo'llanmasida (tests/fixtures/Qollanma_noaniqlik_gazoanalizator_C75QM.docx) tasvirlangan ASL
      protsedura xatolari qoidalarni ishga tushiradi: MPE byudjetda → X1; nol nuqtada U = 0 → X8.
   Asl protsedura holati qo'llanma iqtiboslari bo'yicha tiklanadi; har bir iqtibos hujjat matnida borligi tekshiriladi.
   Qo'llanmadagi "asl" raqamlar (u(Δк) = 0,23136; U = 0,463) bilan solishtirish — tiklangan holat to'g'riligining
   nazorati (ular dvigatelning etalon qiymatlari EMAS — etalonlar tests/cases/excel/ da, Excel katagi bilan). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const E = require('../../src/engine/index.js');
const { docxParagraphs } = require('../tools/docx-text.js');

const ROOT = path.join(__dirname, '..', '..');
const GUIDE = path.join(ROOT, 'tests/fixtures/Qollanma_noaniqlik_gazoanalizator_C75QM.docx');
const load = id => require(`../cases/excel/${id}.json`);
const NINE = ['excel-density', 'excel-gas-p1', 'excel-gas-p2', 'excel-gas-p3', 'excel-term-p1', 'excel-term-p2', 'excel-term-p3', 'excel-term-p4', 'excel-term-p5'];

test('9 ta to\'g\'ri etalon nuqtada `error` darajasidagi topilma yo\'q', () => {
  for (const id of NINE) {
    const c = load(id);
    assert.equal(c.status, 'verified', id);
    const r = E.evaluate(c.modelSpec);
    assert.ok(!r.error, id);
    const errors = r.findings.filter(f => f.severity === 'error');
    assert.deepEqual(errors.map(f => `${f.rule}:${f.code}`), [], id);
    assert.equal(E.reportStatus(r.findings, {}).official, true, id);
    // X1 va X8 (zero_u, below_cmc) — to'g'ri nuqtalarda chiqmaydi
    assert.ok(!r.findings.some(f => ['x1_mpe_in_budget', 'zero_u', 'below_cmc'].includes(f.code)), id);
  }
});

test('9 ta etalon nuqtadagi topilmalar ro\'yxati (regressiya nazorati): faqat info, kutilgan kodlar', () => {
  const got = Object.fromEntries(NINE.map(id => { const r = E.evaluate(load(id).modelSpec); return [id, r.findings.map(f => `${f.severity}:${f.code}`).sort()]; }));
  const gas = ['info:n_small', 'info:x10_no_drift'];
  assert.deepEqual(got, {
    'excel-density': [],
    'excel-gas-p1': ['info:n_small', 'info:x10_no_drift', 'info:zero_s'],     // 4,000 mA × 3: s = 0, kalibrator rezolyutsiyasi byudjetda
    'excel-gas-p2': gas, 'excel-gas-p3': gas,
    'excel-term-p1': ['info:zero_s'],
    'excel-term-p2': [], 'excel-term-p3': [],
    'excel-term-p4': ['info:x5_resolution_rect', 'info:zero_s'],
    'excel-term-p5': [],
  });
});

/* ── qo'llanmadagi asl protsedura xatolari ── */
const QUOTES = {
  mpeInBudget: 'Kalibrlanayotgan analizatorning ruxsat etilgan xatosi Δк = ±4 % noaniqlik manbai sifatida kiritilgan; u byudjetning 99 % idan ortig\'ini tashkil qiladi',
  calibratorMissing: 'Kalibrator Fluke 725Ex xatosi (0,02 % + 0,002 mA) va rezolyutsiyasi byudjetga kiritilmagan; 1-jadvalda ham yo\'q',
  zeroPoint: 'Nol nuqtada natija «0 ± 0» — noaniqlik nolga teng bo\'lishi mumkin emas',
  original: 'Asl usulda analizator xatosining hissasi u(Δк) = 0,23136 % об. bo\'lib, u_c² ning 99,9 % ini tashkil qiladi. Shuning uchun U deyarli analizatorning ruxsat etilgan xatosiga teng bo\'lib qoladi (2-nuqtada U = 0,463, MPE = 0,401 % об.)',
  zeroU: 'Nol nuqtada U = 0 — fizik jihatdan imkonsiz va akkreditatsiya auditida nomuvofiqlik.',
  pgs: 'nisbiy xato chegarasi ±0,08 %',
};

test('iqtiboslar gazoanalizator qo\'llanmasi (.docx) matnida bor', async () => {
  const paras = await docxParagraphs(GUIDE);
  for (const [k, q] of Object.entries(QUOTES)) assert.ok(paras.some(p => p.includes(q)), `topilmadi (${k}): ${q}`);
});

/** Asl protsedura (C75.QM A ilova) — qo'llanma tavsifi bo'yicha: byudjetda analizatorning ±4 % ruxsat etilgan xatosi
    (ko'rsatishdan) va PGS ning nisbiy xato chegarasi ±0,08 %; kalibrator xatosi va rezolyutsiyasi YO'Q. */
function originalProcedure(id) {
  const st = JSON.parse(JSON.stringify(load(id).modelSpec.state));
  st.typeB = [
    { name: 'Analizatorning ruxsat etilgan xatosi Δк (±4 %)', param: 'I', halfWidth: '0.04 * abs(I - 4)', distribution: 'rect', sensitivity: 1, unit: 'mA' },
    { name: 'PGS (etalon) qiymati, ±0,08 %', param: 'Ce', halfWidth: '0.0008 * Ce', distribution: 'rect', sensitivity: 1, unit: '% об.' },
  ];
  return { format: 'calc-state/v2', state: st };
}

test('qo\'llanma xatosi 1 — MPE byudjetda (2-nuqta): X1 (error) ishga tushadi; tiklangan holat qo\'llanmadagi asl raqamlarga mos', () => {
  const r = E.evaluate(originalProcedure('excel-gas-p2'));
  const x1 = r.findings.find(f => f.code === 'x1_mpe_in_budget');
  assert.ok(x1, 'X1 chiqmadi');
  assert.deepEqual([x1.rule, x1.severity, x1.param], ['X1', 'error', 'I']);
  assert.match(x1.source, /ruxsat etilgan xatosi/);
  assert.equal(E.reportStatus(r.findings, {}).official, false);                 // hisobot "RASMIY EMAS"
  // qo'llanma: "u(Δк) = 0,23136 % об. … u_c² ning 99,9 % i … U = 0,463, MPE = 0,401 % об."
  const row = r.budget.find(b => /ruxsat etilgan/.test(b.name));
  // tolerantlik 2e-5: qo'llanma yaxlitlangan o'rtachadan (C̄ = 10,018) hisoblagan — 0,04·10,018/√3 = 0,231356; dvigatel — to'liq aniqlikda 0,231354
  assert.ok(Math.abs(Math.abs(row.c) * row.u - 0.23136) < 2e-5, String(Math.abs(row.c) * row.u));
  assert.equal(row.share.toFixed(1), '99.9');                                     // qo'llanma: "99,9 %" (yaxlitlangan)
  assert.ok(Math.abs(r.conf.mpe - 0.401) < 5e-4);
  assert.ok(Math.abs(r.U - 0.463) < 1e-3, String(r.U));
  assert.equal(parseFloat(x1.value).toFixed(1), '99.9');                                        // topilmada ulush ko'rsatilgan
  // muvofiqlik uchun kiritilgan MPE ifodasi bilan bir xil manba — nomi neytral bo'lsa ham topiladi
  const st = JSON.parse(JSON.stringify(originalProcedure('excel-gas-p2').state));
  st.typeB[0] = { name: 'Δк', param: 'Ce', halfWidth: st.settings.mpe, distribution: 'rect' };
  assert.ok(E.evaluate(st).findings.some(f => f.code === 'x1_mpe_in_budget'));
  // to'g'ri (tavsiya etilgan) byudjetda X1 yo'q — yuqoridagi 9 nuqta testi
});

test('qo\'llanma xatosi 2 — nol nuqtada U = 0 (1-nuqta): X8 zero_u (error) ishga tushadi; X1 ham', () => {
  const r = E.evaluate(originalProcedure('excel-gas-p1'));
  assert.equal(r.y, 0);
  assert.equal(r.U, 0);                                                          // qo'llanma: «0 ± 0»
  const z = r.findings.find(f => f.code === 'zero_u');
  assert.ok(z, 'X8 chiqmadi');
  assert.deepEqual([z.rule, z.severity], ['X8', 'error']);
  assert.ok(r.findings.some(f => f.code === 'x1_mpe_in_budget'));
  // s = 0 va rezolyutsiya manbasi yo'q (kalibrator rezolyutsiyasi asl byudjetda yo'q)
  assert.ok(r.findings.some(f => f.code === 'x8_zero_s_no_resolution' && f.param === 'I'));
  const st = E.reportStatus(r.findings, {});
  assert.deepEqual([st.official, st.mustFlag, st.critical], [false, true, ['zero_u']]);
  // tavsiya etilgan byudjetda (Excel etaloni) shu nuqtada U > 0 va zero_u yo'q
  const good = E.evaluate(load('excel-gas-p1').modelSpec);
  assert.ok(good.U > 0 && !good.findings.some(f => f.code === 'zero_u'));
});
