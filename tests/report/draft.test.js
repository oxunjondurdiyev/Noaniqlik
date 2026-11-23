/* P20 (audit 21.11.2026, VAL-02) — "QORALAMA" suv belgisi: majburiy rekvizit bo'sh yoki talab qilingan MCM bajarilmagan
   bo'lsa hisobot QORALAMA (bloklanmaydi); hammasi joyida bo'lsa — belgi yo'q, pastki qismda "Yakuniy".
   Sof modullar (src/report/forms.js, footer.js) — jsdom faqat HTML ni tahlil qilish uchun. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const { createSections } = require('../../src/report/sections.js');
const { summaryRows } = require('../../src/report/summary.js');
const FM = require('../../src/report/forms.js');
const FT = require('../../src/report/footer.js');
const RQ = require('../../src/report/requisites.js');
const { escHtml } = require('../../src/ui/escape.js');

const ROOT = path.join(__dirname, '..', '..');
const LANGS = ['uz', 'ru', 'en'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N = ['i18n.js', 'i18n-ext.js', 'i18n-engine.js', 'i18n-templates.js', 'i18n-regression.js', 'i18n-topdown.js', 'i18n-special.js', 'i18n-linter.js', 'i18n-report.js', 'i18n-p20.js'];
const DICT = (() => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  return dom.window.eval(I18N.map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS');
})();
const envOf = lang => ({ t: k => (DICT[lang][k] !== undefined ? DICT[lang][k] : k), esc: escHtml });
const frag = html => new JSDOM('<!doctype html><body><div id="r">' + html + '</div></body>').window.document.getElementById('r');
const DENS = require('../cases/excel/excel-density.json').modelSpec;

// 13 ta majburiy rekvizit (kalibrlash sertifikati ilovasi — requisites.js::REQUIRED)
const REQ = { labName: 'Namuna laboratoriyasi', labAddress: 'Toshkent', reportNo: 'K-001', issueDate: '2026-11-21', customer: 'Buyurtmachi MChJ', item: 'Kolba',
  method: 'M-01', activityDate: '2026-11-20', authorizedBy: 'Rahbar', itemId: '№ 7', place: 'laboratoriya', conditions: '20 °C', traceability: 'Etalon tarozi' };
// MCM talab qilinmaydigan hisob: faqat normal manbalar, chiziqli model
const PLAIN = { format: 'calc-state/v2', state: { params: ['X1', 'X2'], n: 1, measurements: { X1: [10], X2: [5] }, directions: [], model: { formula: 'Y = X1 + X2', unit: 'g' },
  settings: { paired: false, P: 0.9545 }, covB: {}, typeB: [{ name: 'c1', param: 'X1', halfWidth: 0.02, distribution: 'normal', k: 2 }, { name: 'c2', param: 'X2', halfWidth: 0.02, distribution: 'normal', k: 2 }] } };
const MC_OK = { M: 200000, seed: 1, validated: true, adaptive: { enabled: true, converged: true }, validation: { requested: true, met: true }, delta: 0.0005, dLow: 0.0001, dHigh: 0.0001,
  mean: 1, u: 0.01, low: 0, high: 2, symLow: 0, symHigh: 2, gumLow: 0, gumHigh: 2, gumU: 1, P: 0.9545, blocks: 20, blockSize: 10000, nDig: 2, rng: { name: 'wichmann-hill-2006', seed: 1 } };
const FOOT = { model: FT.footerModel({ engineVersion: E.ENGINE_VERSION, build: null, template: null, meta: { id: 'calc-test', createdAt: '2026-11-21T00:00:00Z' }, hash: 'a'.repeat(64) }), qr: '' };

function report(lang, spec, o) {
  const env = envOf(lang);
  const r = E.evaluate(spec);
  return frag(FM.buildReport({ form: 'calibration_certificate', lang, env, sections: createSections(env), requisites: REQ, mode: 'GUM', result: r, snapshot: spec.state, footer: FOOT, ...o }));
}

test('13 ta majburiy rekvizit: ro\'yxat o\'zgarmagan (kalibrlash sertifikati ilovasi)', () => {
  assert.equal(RQ.REQUIRED.calibration_certificate.length, 13);
  assert.deepEqual(RQ.missingRequisites(REQ, 'calibration_certificate'), []);
});

test('rekvizitsiz → QORALAMA suv belgisi, sababi satrda va pastki qismda; uch tilda QORALAMA / ЧЕРНОВИК / DRAFT', () => {
  const WORD = { uz: 'QORALAMA', ru: 'ЧЕРНОВИК', en: 'DRAFT' };
  for (const lang of LANGS) {
    const d = report(lang, PLAIN, { requisites: {} });
    const mark = d.querySelector('[data-report-draft]');
    assert.ok(mark, lang);
    assert.equal(mark.getAttribute('aria-hidden'), 'true');
    assert.equal(mark.querySelector('span').textContent, WORD[lang]);
    assert.ok(mark.querySelectorAll('span').length >= 16, 'har sahifa joyiga bittadan (eng uzun etalon hisobot — 16 sahifa)');
    assert.equal(d.querySelector('[data-report-draft-reasons]').dataset.reportDraftReasons, 'requisites');
    assert.ok(d.querySelector('[data-report-draft-reasons]').textContent.includes(DICT[lang].rf_draft_reason_requisites));
    assert.equal(d.querySelector('.report-frame').dataset.reportStatus, 'draft');
    const foot = d.querySelector('tfoot [data-report-foot="status"]');                 // <tfoot> — har sahifada takrorlanadi
    assert.equal(foot.dataset.reportFootStatus, 'draft');
    assert.ok(foot.textContent.includes(WORD[lang]) && foot.textContent.includes(DICT[lang].rf_draft_reason_requisites));
  }
  // bitta rekvizit bo'sh bo'lsa ham
  for (const k of RQ.REQUIRED.calibration_certificate) {
    const d = report('uz', PLAIN, { requisites: { ...REQ, [k]: '' } });
    assert.ok(d.querySelector('[data-report-draft]'), k);
  }
});

test('rekvizitlar to\'liq va MCM talab qilinmaydi → suv belgisi yo\'q, pastki qismda "Yakuniy"', () => {
  const FINAL = { uz: 'Yakuniy', ru: 'Окончательный', en: 'Final' };
  for (const lang of LANGS) {
    const d = report(lang, PLAIN);
    assert.equal(d.querySelector('[data-report-draft]'), null, lang);
    assert.equal(d.querySelector('[data-report-draft-reasons]'), null);
    assert.equal(d.querySelector('[data-mcm-status]'), null);
    assert.equal(d.querySelector('.report-frame').dataset.reportStatus, 'final');
    const foot = d.querySelector('tfoot [data-report-foot="status"]');
    assert.equal(foot.dataset.reportFootStatus, 'final');
    assert.ok(foot.textContent.includes(FINAL[lang]));
  }
  assert.deepEqual(FM.draftReasons({ form: 'calibration_certificate', requisites: REQ, mode: 'GUM', result: E.evaluate(PLAIN) }), []);
});

test('MCM talab qilingan (zichlik), lekin bajarilmagan → QORALAMA + M5 topilmasi + sabablar ro\'yxati; bajarilgach — yakuniy, §8 natijasi bilan', () => {
  const miss = report('uz', DENS);
  assert.equal(miss.querySelector('[data-report-draft-reasons]').dataset.reportDraftReasons, 'mcm');
  assert.ok(miss.querySelector('[data-report-draft]'));
  assert.ok(miss.querySelector('[data-finding="mcm_required"]'));
  const st = miss.querySelector('[data-mcm-status]');
  assert.equal(st.dataset.mcmStatus, 'pending');
  assert.equal(st.querySelector('[data-mcm-reasons]').dataset.mcmReasons, '1');
  assert.match(st.querySelector('.mcm-reasons li').textContent, /^\(b\) V — «Idish toleransi».*= 0\.92 > 0\.50$/);
  assert.ok(st.querySelector('[data-mcm-draft]'));
  assert.match(miss.querySelector('tfoot [data-report-foot="status"]').textContent, /QORALAMA — talab qilingan MCM tekshiruvi bajarilmagan/);
  // bekor qilingan / xato bilan tugagan MCM ham — QORALAMA
  assert.deepEqual(FM.draftReasons({ form: 'calibration_certificate', requisites: REQ, mode: 'GUM', result: E.evaluate(DENS), mc: null }), ['mcm']);

  const ok = report('uz', DENS, { mc: MC_OK });
  assert.equal(ok.querySelector('[data-report-draft]'), null);
  assert.equal(ok.querySelector('[data-finding="mcm_required"]'), null);
  assert.equal(ok.querySelector('[data-mcm-status]').dataset.mcmStatus, 'validated');
  assert.ok(ok.querySelector('[data-mcm-s8] [data-mc-validation="valid"]'));
  assert.equal(ok.querySelector('tfoot [data-report-foot="status"]').dataset.reportFootStatus, 'final');

  // rad etilgan (tasdiqlanmagan) MCM — bajarilgan hisoblanadi: QORALAMA emas, holat "rad etildi"
  const rej = report('uz', DENS, { mc: { ...MC_OK, validated: false } });
  assert.equal(rej.querySelector('[data-report-draft]'), null);
  assert.equal(rej.querySelector('[data-mcm-status]').dataset.mcmStatus, 'rejected');
  // ikkala sabab birga
  const both = report('uz', DENS, { requisites: {} });
  assert.equal(both.querySelector('[data-report-draft-reasons]').dataset.reportDraftReasons, 'requisites,mcm');
});

test('ko\'p nuqtali hisobot: nuqta bilan saqlangan MCM natijasi hisobga olinadi; bittasida yo\'q bo\'lsa — QORALAMA', () => {
  const env = envOf('uz');
  const r = E.evaluate(DENS);
  const pt = (id, mc) => ({ id, label: id, snapshot: DENS.state, result: r, acceptances: {}, ...(mc ? { mc } : {}) });
  const build = pts => frag(FM.buildReport({ form: 'calibration_certificate', lang: 'uz', env, sections: createSections(env), requisites: REQ, mode: 'GUM', rows: summaryRows(pts, false), footer: FOOT }));
  assert.equal(build([pt('p1', MC_OK), pt('p2', MC_OK)]).querySelector('[data-report-draft]'), null);
  const d = build([pt('p1', MC_OK), pt('p2', null)]);
  assert.ok(d.querySelector('[data-report-draft]'));
  assert.deepEqual([...d.querySelectorAll('[data-mcm-status]')].map(x => x.dataset.mcmStatus), ['validated', 'pending']);
});

test('boshqa rejimlar (tayyor bo\'lim): MCM sharti qo\'llanmaydi, rekvizitlar sharti qo\'llanadi', () => {
  const env = envOf('uz');
  const base = { form: 'test_report', lang: 'uz', env, sections: createSections(env), mode: 'REGRESSION', bodyHTML: '<p>x</p>' };
  assert.deepEqual(FM.draftReasons({ ...base, requisites: {} }), ['requisites']);
  assert.deepEqual(FM.draftReasons({ ...base, requisites: { ...REQ, receiptDate: '2026-11-19' } }), []);
});

test('bosma CSS: suv belgisi har sahifada (position: fixed), yashirilmaydi; ekranda — qog\'oz ustida; ranglar tokenlardan', () => {
  const css = read('src/css/print.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const print = css.slice(css.lastIndexOf('@media print'));
  assert.match(print, /\.report-doc \.report-draft-mark \{ position: fixed; display: block !important; \}/);
  assert.match(print, /\.report-doc \.report-draft-mark > span \+ span \{ display: none !important; \}/);
  assert.match(print, /\.report-doc \.report-draft-banner[^{]*\{[^}]*display: block !important; visibility: visible !important/);
  assert.match(css, /\.report-doc \.report-draft-mark \{ position: absolute; inset: 0;[^}]*pointer-events: none;/);
  assert.match(css, /\.report-doc \.report-draft-mark > span \{[^}]*height: 297mm;[^}]*transform: rotate\(-28deg\);/);
  assert.match(css, /\.paper \{ position: relative; \}/);
  assert.ok(!/\.report-draft-(mark|banner)[^{}]*\{[^}]*display:\s*none(?! !important; \})/.test(css.replace(/span \+ span \{ display: none !important; \}/, '')));
});
