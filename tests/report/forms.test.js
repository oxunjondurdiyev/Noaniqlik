/* P05b: hisobot shakllari (src/report/forms.js), rekvizitlar, normativ havolalar, pastki qism (xesh, QR),
   qaror bayonoti va ko'p nuqtali jadval. Sof modullar — jsdom faqat HTML ni tahlil qilish uchun.
   Ko'p nuqtali hisobot jadvali laboratoriya Excel fayllarining "Xulosa" varag'i bilan solishtiriladi (katak havolasi bilan). */
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
const NR = require('../../src/report/normative.js');
const J = require('../../src/io/calc-json.js');
const { loadQr } = require('../../src/io/vendor.js');
const { escHtml } = require('../../src/ui/escape.js');
const { readRef } = require('../tools/excel-read.js');

const ROOT = path.join(__dirname, '..', '..');
const LANGS = ['uz', 'ru', 'en'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N = ['i18n.js', 'i18n-ext.js', 'i18n-engine.js', 'i18n-templates.js', 'i18n-regression.js', 'i18n-topdown.js', 'i18n-special.js', 'i18n-linter.js', 'i18n-report.js'];
const DICT = (() => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  return dom.window.eval(I18N.map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS');
})();
const envOf = lang => ({ t: k => (DICT[lang][k] !== undefined ? DICT[lang][k] : (DICT.en[k] !== undefined ? DICT.en[k] : k)), esc: escHtml });
const frag = html => new JSDOM('<!doctype html><body><div id="r">' + html + '</div></body>').window.document.getElementById('r');
const caseSpec = id => require(`../cases/excel/${id}.json`).modelSpec;
const withSettings = (spec, patch) => { const s = JSON.parse(JSON.stringify(spec)); Object.assign(s.state.settings, patch); return s; };

/** Etalon nuqtalardan ko'p nuqtali to'plam (qaror qoidasi: himoya zonasi w = U, binar bo'lmagan — Excel "Xulosa" varag'idagi kabi) */
function points(ids, patch) {
  return ids.map((id, i) => { const spec = withSettings(caseSpec(id), patch || {}); return { id: 'p' + (i + 1), label: `${i + 1}`, snapshot: spec.state, result: E.evaluate(spec), acceptances: {} }; });
}
const GAS = ['excel-gas-p1', 'excel-gas-p2', 'excel-gas-p3'];
const TERM = ['excel-term-p1', 'excel-term-p2', 'excel-term-p3', 'excel-term-p4', 'excel-term-p5'];
const GUARD = { decisionRule: 'guard_band', guardR: 1, decisionStatement: 'non_binary', agreement: 'Shartnoma 15' };
const REQ = { labName: 'Namuna laboratoriyasi', labAddress: 'Toshkent', accreditation: 'O\'ZAK.KL.0000', reportNo: 'K-001', issueDate: '2026-11-18', customer: 'Buyurtmachi MChJ', item: 'Gazoanalizator',
  itemId: '№ 123', method: 'C75.QM', place: 'laboratoriya', activityDate: '2026-11-17', conditions: '20 °C', traceability: 'PGS GSO 9751', authorizedBy: 'Rahbar', authorizedRole: 'Bo\'lim boshlig\'i' };

function report(lang, o) {
  const env = envOf(lang);
  return FM.buildReport({ form: 'calibration_certificate', lang, env, sections: createSections(env), requisites: REQ, mode: 'GUM', ...o });
}

/* ── ko'p nuqtali jadval ↔ Excel ── */

test('gazoanalizator: ko\'p nuqtali hisobot jadvali Excel "Xulosa" varag\'i bilan mos (E, U, k, muvofiqlik — katak havolasi bilan)', async () => {
  const X = 'Noaniqlik_hisobi_gazoanalizator_KEDR-07.xlsx';
  const rows = summaryRows(points(GAS, GUARD), false);
  const S = createSections(envOf('uz'));
  const table = frag(S.summaryTable(rows)).querySelectorAll('tbody tr');
  assert.equal(table.length, 3);
  const VERDICT = { 'MUVOFIQ (ishonchli)': 'pass', 'NOANIQ ZONA': 'conditional_pass', '—': null };
  for (let i = 0; i < 3; i++) {
    const row = 5 + i, cells = [...table[i].children].map(td => td.textContent.trim());
    // chop etiladigan (yaxlitlangan) qiymatlar Excel kataklari bilan AYNAN teng
    assert.equal(Number(cells[1]), await readRef(X, `Xulosa!D${row}`), `E: Xulosa!D${row}`);
    assert.equal(Number(cells[2]), await readRef(X, `Xulosa!E${row}`), `U: Xulosa!E${row}`);
    assert.equal(cells[3], (await readRef(X, `Xulosa!F${row}`)).toFixed(2), `k: Xulosa!F${row}`);
    // natija yozuvi: "E = (0.018 ± 0.021) % об.;  k = 2.52"
    const excelText = await readRef(X, `Xulosa!I${row}`);
    assert.ok(excelText.startsWith(S.statement(rows[i].r, rows[i].rr, rows[i].k).split(';  P')[0]), `${excelText} ↔ ${S.statement(rows[i].r, rows[i].rr, rows[i].k)}`);
    // muvofiqlik (himoyalangan, w = U): Excel ustuni J
    const want = VERDICT[await readRef(X, `Xulosa!J${row}`)];
    const d = rows[i].decision;
    assert.equal(d && !d.pending ? d.verdict : null, want, `Xulosa!J${row}`);
    if (want) assert.equal(Number(cells[5]).toPrecision(3), (await readRef(X, `Xulosa!H${row}`)).toPrecision(3), `MPE: Xulosa!H${row}`);
  }
  // ν_eff: Excel B tur uchun ν = 10⁹ oladi (D-03) — 2- va 3-nuqtalarda farq ⌊ν⌋ ga ta'sir qilmaydi
  assert.equal(table[1].children[4].textContent, String(Math.floor(await readRef(X, 'Xulosa!G6'))));
  assert.equal(table[2].children[4].textContent, String(Math.floor(await readRef(X, 'Xulosa!G7'))));
});

test('termometr: ko\'p nuqtali hisobot jadvali Excel "Xulosa" varag\'i bilan mos (Cv, U, k, muvofiqlik — katak havolasi bilan)', async () => {
  const X = 'Noaniqlik_hisobi_termometr_MS-MK-3.xlsx';
  const rows = summaryRows(points(TERM, GUARD), false);
  const S = createSections(envOf('ru'));
  const table = frag(S.summaryTable(rows)).querySelectorAll('tbody tr');
  const VERDICT = { 'MUVOFIQ (ishonchli)': 'pass', 'NOANIQ ZONA': 'conditional_pass' };
  for (let i = 0; i < 5; i++) {
    const row = 5 + i, cells = [...table[i].children].map(td => td.textContent.trim());
    assert.equal(Number(cells[1]), await readRef(X, `Xulosa!H${row}`), `Cv: Xulosa!H${row}`);
    assert.equal(Number(cells[2]), await readRef(X, `Xulosa!I${row}`), `U: Xulosa!I${row}`);
    assert.equal(cells[3], (await readRef(X, `Xulosa!J${row}`)).toFixed(2), `k: Xulosa!J${row}`);
    const excelText = await readRef(X, `Xulosa!L${row}`);                       // "t = 50.0 °C:  Cv = (-0.26 ± 0.54) °C;  k = 2.00;  P ≈ 95 %"
    assert.ok(excelText.includes(S.statement(rows[i].r, rows[i].rr, rows[i].k).split(';  P')[0]), `${excelText} ↔ ${S.statement(rows[i].r, rows[i].rr, rows[i].k)}`);
    assert.equal(rows[i].decision.verdict, VERDICT[await readRef(X, `Xulosa!M${row}`)], `Xulosa!M${row}`);
  }
  // jadvalda hukm matni (ruscha): 4- va 5-nuqta — shartli muvofiq ("NOANIQ ZONA")
  assert.equal(table[0].lastElementChild.textContent.trim(), DICT.ru.dr_pass);
  assert.equal(table[3].lastElementChild.textContent.trim(), DICT.ru.dr_cond_pass);
});

/* ── shakllar ── */

test('ko\'p nuqtali hisobot: AVVAL umumiy jadval, KEYIN har bir nuqta; har bir nuqtada topilmalar bloki; to\'rtta shakl, uch til', () => {
  const pts = points(GAS, GUARD);
  for (const lang of LANGS) {
    for (const form of FM.REPORT_FORMS) {
      const html = report(lang, { form, rows: summaryRows(pts, false), uniformK: false });
      const d = frag(html);
      assert.equal(d.querySelector('[data-report-title]').textContent, DICT[lang]['rf_title_' + form], `${lang} ${form}`);
      const summary = d.querySelector('[data-report-summary]'), pointsEl = d.querySelectorAll('[data-report-point]');
      assert.equal(pointsEl.length, 3);
      assert.ok(summary.compareDocumentPosition(pointsEl[0]) & 4, 'umumiy jadval nuqtalardan oldin');   // DOCUMENT_POSITION_FOLLOWING
      assert.equal(summary.querySelectorAll('tbody tr').length, 3);
      assert.equal(d.querySelectorAll('[data-findings]').length, 3);                                  // topilmalar har bir shaklda
      assert.equal(d.querySelectorAll('.print-page-break').length, 3);
      assert.ok(!/\b(rf|rq|dr|rp|fnd|mk|w|fix|why)_[a-z0-9_]+\b|undefined|NaN|\[object/.test(d.textContent), `${lang} ${form}: ${(d.textContent.match(/\b(rf|rq|dr|rp|fnd|mk)_[a-z0-9_]+|undefined|NaN/) || [])[0]}`);
    }
  }
  assert.deepEqual(FM.REPORT_FORMS, ['calibration_certificate', 'test_report', 'budget', 'conformity']);
});

test('shakllar mazmuni: sertifikat ilovasi va byudjet asosnomasi — to\'liq byudjet; sinov bo\'limi — qisqa; muvofiqlik — faqat bayonot', () => {
  const spec = withSettings(caseSpec('excel-gas-p2'), { ...GUARD, cmc: 0.001 });
  const r = E.evaluate(spec);
  const base = { result: r, snapshot: spec.state };
  const has = (form, sel) => !!frag(report('uz', { ...base, form })).querySelector(sel);
  const text = form => frag(report('uz', { ...base, form })).textContent;
  // kalibrlash sertifikati ilovasi: model, ma'lumot, kirishlar, byudjet, kengaytirilgan noaniqlik, natija + ILAC P14 §5.2 izohi
  for (const key of ['model_title', 'data_title', 'sec_inputs', 'results_title', 'section_expanded', 'res_statement']) assert.ok(text('calibration_certificate').includes(DICT.uz[key]), key);
  assert.ok(text('calibration_certificate').includes(DICT.uz.ilac_note.split('{P}')[0].slice(0, 40)));
  // sinov protokoli bo'limi: natija va byudjet jadvali bor, kuzatuvlar jadvali va qadamlar yo'q
  assert.ok(text('test_report').includes(DICT.uz.results_title) && has('test_report', '[data-report-result]'));
  const heads = form => [...frag(report('uz', { ...base, form })).querySelectorAll('.print-section')].map(h => h.textContent.trim());
  assert.ok(!heads('test_report').includes(DICT.uz.data_title) && !heads('test_report').includes(DICT.uz.section_expanded));
  assert.ok(heads('calibration_certificate').includes(DICT.uz.data_title) && heads('budget').includes(DICT.uz.section_expanded));
  // byudjet asosnomasi: CMC satri; imzo qatori yo'q
  assert.equal(frag(report('uz', { ...base, form: 'budget' })).querySelector('[data-report-cmc]').dataset.reportCmc, 'ok');
  assert.ok(!has('budget', '[data-report-sign]') && has('calibration_certificate', '[data-report-sign]'));
  const below = E.evaluate(withSettings(caseSpec('excel-gas-p2'), { cmc: 1 }));
  assert.equal(frag(report('uz', { result: below, snapshot: spec.state, form: 'budget' })).querySelector('[data-report-cmc]').dataset.reportCmc, 'below');
  // muvofiqlik bayonoti: byudjet jadvali yo'q, bayonot bor
  const c = frag(report('uz', { ...base, form: 'conformity' }));
  assert.equal(c.querySelector('[data-report-conformity]').dataset.reportConformity, 'issued');
  assert.ok(!c.textContent.includes(DICT.uz.results_title));
  assert.equal(c.querySelector('[data-decision-statement]').dataset.decisionStatement, 'pass');
  assert.equal(c.querySelector('[data-report-no-statement]'), null);
});

test('muvofiqlik bayonoti: chegara, model turi yoki qaror qoidasi berilmagan bo\'lsa bayonot CHIQMAYDI; berilgan bo\'lsa qoida va kelishuv yoziladi', () => {
  const S = createSections(envOf('uz'));
  const issued = spec => { const d = frag(report('uz', { form: 'conformity', result: E.evaluate(spec), snapshot: spec.state })); return { el: d, ok: d.querySelector('[data-report-conformity]').dataset.reportConformity === 'issued' }; };
  // qoida yo'q
  let x = issued(caseSpec('excel-gas-p2'));
  assert.equal(x.ok, false);
  assert.ok(x.el.querySelector('[data-decision-pending="rule"]') && x.el.querySelector('[data-report-no-statement]'));
  assert.equal(x.el.querySelector('[data-decision-verdict]'), null);
  // model turi yo'q
  x = issued(withSettings(caseSpec('excel-gas-p2'), { ...GUARD, modelKind: 'unknown' }));
  assert.deepEqual([x.ok, !!x.el.querySelector('[data-conf-pending]'), !!x.el.querySelector('[data-decision-verdict]')], [false, true, false]);
  // chegara yo'q (zichlik: MPE berilmagan)
  x = issued(withSettings(caseSpec('excel-density'), { decisionRule: 'simple' }));
  assert.deepEqual([x.ok, !!x.el.querySelector('[data-decision-pending="limit"]')], [false, true]);
  x = issued(caseSpec('excel-density'));                                             // hech narsa berilmagan
  assert.deepEqual([x.ok, !!x.el.querySelector('[data-report-no-statement]')], [false, true]);
  // hammasi berilgan: qoida, w, qabul oralig'i, TUR, p_c, hukm, kelishuv raqami
  const r = E.evaluate(withSettings(caseSpec('excel-gas-p2'), GUARD));
  const lines = frag(S.confLines(r).map(l => `<p>${l}</p>`).join(''));
  assert.match(lines.querySelector('[data-decision-rule]').textContent, /himoyalangan qabul, w = r·U, r = 1; w = 0\.0208/);
  assert.match(lines.textContent, /TUR = 19\.28/);
  assert.match(lines.querySelector('[data-decision-pc]').textContent, /p\s*c = > 99,99 %/);
  assert.equal(lines.querySelector('[data-decision-verdict]').textContent, 'MUVOFIQ');
  assert.equal(lines.querySelector('[data-decision-agreement]').textContent, 'Mijoz bilan kelishuv: Shartnoma 15');
  // kelishuv yo'q
  const noAgr = frag(S.confLines(E.evaluate(withSettings(caseSpec('excel-gas-p2'), { decisionRule: 'simple' }))).map(l => `<p>${l}</p>`).join(''));
  assert.equal(noAgr.querySelector('[data-decision-agreement]').dataset.decisionAgreement, '0');
  assert.match(noAgr.querySelector('[data-decision-rule]').textContent, /oddiy qabul, w = 0/);
  // eski saqlangan natija (decision maydoni yo'q): bayonot yo'q, qayta hisoblash so'raladi
  const old = E.evaluate(withSettings(caseSpec('excel-gas-p2'), GUARD)); delete old.decision; delete old.findings;
  const o = frag(S.confLines(old).map(l => `<p>${l}</p>`).join(''));
  assert.ok(o.querySelector('[data-decision-pending="recalc"]') && !o.querySelector('[data-decision-verdict]'));
});

test('yagona k: qaror qoidasi yangi U bilan qayta qo\'llanadi (w = r·U o\'zgaradi)', () => {
  const pts = points(GAS, GUARD);
  const own = summaryRows(pts, false), uni = summaryRows(pts, true);
  const kmax = Math.max(...own.map(x => x.k));
  assert.ok(uni.every(x => x.k === kmax));
  assert.ok(uni[2].U > own[2].U);
  assert.equal(uni[2].decision.w, uni[2].U);                       // w = r·U, r = 1
  assert.ok(uni[2].decision.w > own[2].decision.w);
  assert.equal(own[1].decision.w, own[1].r.decision.w);            // o'z k si bilan — dvigatel natijasining o'zi
});

/* ── rekvizitlar ── */

test('§7.8.2.1: rekvizitlar to\'ldirilmagan bo\'lsa hisobotda ogohlantirish (maydonlar nomi bilan, uch tilda); to\'liq bo\'lsa — yo\'q', () => {
  const spec = caseSpec('excel-gas-p2'), r = E.evaluate(spec);
  assert.equal(frag(report('uz', { result: r, snapshot: spec.state })).querySelector('[data-report-missing]'), null);
  for (const lang of LANGS) {
    const d = frag(report(lang, { result: r, snapshot: spec.state, requisites: { labName: 'Lab' } }));
    const m = d.querySelector('[data-report-missing]');
    const keys = m.dataset.reportMissing.split(',');
    assert.deepEqual(keys, RQ.REQUIRED.calibration_certificate.filter(k => k !== 'labName'));
    for (const k of keys) assert.ok(m.textContent.includes(DICT[lang]['rq_' + k]), `${lang}.rq_${k}`);
    assert.ok(m.textContent.includes(DICT[lang].rf_missing));
    assert.match(m.textContent, /ISO\/IEC 17025:2017 §7\.8\.2\.1.*\(unverified\)/);       // standart matni repoda yo'q
  }
  // shaklga qarab majburiy maydonlar har xil
  assert.ok(RQ.missingRequisites({}, 'budget').length < RQ.missingRequisites({}, 'test_report').length);
  assert.ok(RQ.missingRequisites({}, 'test_report').includes('receiptDate') && !RQ.missingRequisites({}, 'calibration_certificate').includes('receiptDate'));
  assert.deepEqual(RQ.missingRequisites(REQ, 'calibration_certificate'), []);
  // bosma CSS: ogohlantirish yashirilmaydi
  assert.match(read('src/css/components.css'), /@media print \{[\s\S]*\.report-missing, \.report-refs, \.report-foot, \.report-sign \{ display: block !important/);
});

test('rekvizitlar: sarlavhada laboratoriya nomi, manzili, logotip; matn escape qilinadi; logotip faqat PNG / JPEG data-URL', () => {
  const spec = caseSpec('excel-gas-p2'), r = E.evaluate(spec);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const evil = '<img src=x onerror="window.__x=1">';
  const d = frag(report('uz', { result: r, snapshot: spec.state, requisites: { ...REQ, labName: evil + ' Lab', customer: '<script>alert(1)</script>', logo: png } }));
  assert.equal(d.querySelector('[data-report-logo]').getAttribute('src'), png);
  assert.equal(d.querySelectorAll('script').length, 0);
  assert.equal(d.querySelectorAll('img').length, 1);                                  // faqat logotip
  assert.ok(d.querySelector('[data-report-req="labName"]').textContent.includes(evil));
  assert.equal(d.querySelector('[data-report-req="customer"] td').textContent, '<script>alert(1)</script>');
  // logotip tekshiruvi
  assert.equal(RQ.validLogo(png), true);
  for (const bad of ['data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'javascript:alert(1)', 'https://example.test/logo.png', 'data:text/html;base64,PGI+', png + '" onerror="x', '', null, 'data:image/png;base64,' + 'A'.repeat(400000)]) {
    assert.equal(RQ.validLogo(bad), false, String(bad).slice(0, 40));
    assert.equal(RQ.cleanRequisites({ logo: bad }).logo, undefined);
  }
  // noma'lum kalitlar tashlanadi; uzunlik cheklangan; boshqaruv belgilari olib tashlanadi
  const c = RQ.cleanRequisites({ labName: ' A\u0000B ', evil: 'x', __proto__: { polluted: 1 }, method: 'm'.repeat(2000) });
  assert.deepEqual([c.labName, c.evil, c.method.length], ['AB', undefined, 500]);
  assert.equal({}.polluted, undefined);
  // laboratoriya (doimiy) va hujjat (sessiya) qismlari
  const sp = RQ.splitRequisites({ ...REQ, logo: png });
  assert.deepEqual(Object.keys(sp.lab).sort(), ['accreditation', 'labAddress', 'labName', 'logo']);
  assert.ok(sp.doc.customer && sp.doc.authorizedBy && !sp.doc.labName);
  assert.deepEqual(RQ.REPORT_FIELDS.filter(f => f.personal).map(f => f.key), ['customer', 'customerAddress', 'authorizedBy']);
});

/* ── normativ havolalar ── */

test('normativ havolalar hisobot tiliga qarab: tekshirilmagan ekvivalent (GOST) qo\'shilmaydi — rus tilida ham faqat JCGM havolasi', () => {
  for (const lang of LANGS) {
    const refs = NR.normativeRefs(lang, { form: 'calibration_certificate', mode: 'GUM' });
    assert.deepEqual(refs, ['ISO/IEC 17025:2017', 'JCGM 100:2008 (GUM)', 'EA-4/02 M:2022', 'ILAC P14:09/2020'], lang);
    assert.ok(!refs.join(' ').includes('ГОСТ') && !refs.join(' ').includes('Guide 98-3'), lang);
  }
  // qaror qoidasi bo'lsa — JCGM 106 (ISO/IEC Guide 98-4:2012 — ILAC G8:09/2019 §9 [2] da tasdiqlangan) va ILAC G8
  const d = NR.normativeRefs('ru', { form: 'conformity', mode: 'GUM' });
  assert.ok(d.includes('JCGM 106:2012 (ISO/IEC Guide 98-4:2012)') && d.includes('ILAC G8:09/2019'));
  assert.ok(NR.normativeRefs('uz', { mode: 'GUM', monteCarlo: true }).includes('JCGM 101:2008'));
  assert.deepEqual(NR.normativeRefs('en', { mode: 'TOP_DOWN', form: 'test_report' }), ['ISO/IEC 17025:2017', 'Nordtest TR 537 ed. 4', 'EURACHEM/CITAC QUAM:2012']);
  assert.ok(NR.normativeRefs('en', { mode: 'SAMPLING' }).includes('EURACHEM/CITAC UfS:2019'));
  assert.ok(NR.normativeRefs('en', { mode: 'QUALITATIVE' }).includes('EURACHEM/CITAC AQA:2021'));
  // faqat CLAUDE.md dagi nashrlar
  for (const mode of ['GUM', 'REGRESSION', 'TOP_DOWN', 'SAMPLING', 'QUALITATIVE', 'MICRO', 'MEDICAL']) {
    for (const ref of NR.normativeRefs('ru', { mode, form: 'conformity', monteCarlo: true })) assert.ok(!/\b(19|20)\d\d\b/.test(ref) || /2008|2012|2017|2019|2020|2021|2022/.test(ref), ref);
  }
  // hisobotda
  const spec = withSettings(caseSpec('excel-gas-p2'), GUARD), r = E.evaluate(spec);
  const el = frag(report('ru', { result: r, snapshot: spec.state })).querySelector('[data-report-refs]');
  assert.equal(el.dataset.reportRefs, 'ru');
  assert.ok(el.textContent.startsWith(DICT.ru.rf_refs + ':'));
  assert.ok(el.textContent.includes('JCGM 100:2008 (GUM)') && el.textContent.includes('JCGM 106:2012') && !el.textContent.includes('ГОСТ'));
});

/* ── pastki qism: xesh, QR ── */

test('pastki qism: dastur va ENGINE_VERSION, build (dvigatel xeshi), shablon ID / versiya, hisob ID va sanasi, kanonik SHA-256, QR', async () => {
  const spec = caseSpec('excel-gas-p2'), r = E.evaluate(spec);
  const meta = { id: 'calc-abc123-000001', createdAt: '2026-11-18T10:20:30.000Z' };
  const template = { id: 'legacy-gas_analyzer', version: '1.0.0', status: 'DRAFT', variant: '' };
  const doc = await J.buildCalcDoc({ ...meta, input: spec, result: r, template });
  const build = JSON.parse(read('tests/security/engine.sha256.json'));
  const model = FT.footerModel({ engineVersion: r.engineVersion, build, template, meta, hash: doc.hash });
  assert.deepEqual([model.app, model.engineVersion, model.build, model.buildMatches], ['UncertaintyCalc', E.ENGINE_VERSION, build.sha256.slice(0, 12), true]);
  assert.deepEqual(model.template, { id: 'legacy-gas_analyzer', version: '1.0.0', status: 'DRAFT' });
  assert.equal(model.qr, `uc-calc:${meta.id};sha256:${doc.hash}`);
  assert.equal(FT.footerModel({ engineVersion: '9.9.9', build, meta, hash: doc.hash }).buildMatches, false);
  assert.equal(FT.footerModel({ engineVersion: r.engineVersion, build: { sha256: 'xyz' }, meta, hash: doc.hash }).build, '');
  const qr = FT.qrSvg(await loadQr(), model.qr);
  for (const lang of LANGS) {
    const d = frag(report(lang, { result: r, snapshot: spec.state, footer: { model, qr } }));
    const foot = d.querySelector('[data-report-footer]');
    const val = k => foot.querySelector(`[data-report-foot="${k}"] .report-foot-value`).textContent;
    assert.equal(val('app'), `UncertaintyCalc; ${DICT[lang].rg_engine} ${E.ENGINE_VERSION}`);
    assert.equal(val('build'), build.sha256.slice(0, 12));
    assert.equal(val('template'), 'legacy-gas_analyzer v1.0.0 (DRAFT)');
    assert.equal(val('calc'), 'calc-abc123-000001; 2026-11-18');
    assert.equal(val('hash'), doc.hash);
    assert.match(val('hash'), /^[0-9a-f]{64}$/);
    assert.equal(foot.querySelector('[data-report-qr]').dataset.reportQr, model.qr);
    assert.ok(foot.querySelector('svg.report-qr path').getAttribute('d').length > 500);
  }
  // shablonsiz; build aniqlanmagan
  const plain = frag(report('uz', { result: r, snapshot: spec.state, footer: { model: FT.footerModel({ engineVersion: r.engineVersion, build: null, meta, hash: doc.hash }) } }));
  assert.equal(plain.querySelector('[data-report-foot="template"] .report-foot-value').textContent, DICT.uz.rf_template_none);
  assert.equal(plain.querySelector('[data-report-foot="build"] .report-foot-value').textContent, DICT.uz.rf_build_unknown);
  // xesh — kirish va natijadan: bitta kuzatuv o'zgarsa xesh o'zgaradi; kalitlar tartibi o'zgarsa — yo'q (tests/io/calc-json.test.js)
  const spec2 = JSON.parse(JSON.stringify(spec)); spec2.state.measurements.I[0] += 0.001;
  assert.notEqual((await J.buildCalcDoc({ ...meta, input: spec2, result: E.evaluate(spec2), template })).hash, doc.hash);
  const reordered = { result: r, template, input: spec, createdAt: meta.createdAt, id: meta.id };
  assert.equal((await J.buildCalcDoc(reordered)).hash, doc.hash);
});

test('QR: kutubxona natijasi kvadrat, tinch zona bilan; mazmun — faqat hisob ID va xesh (URL yo\'q)', async () => {
  const qrcode = await loadQr();
  const payload = FT.qrPayload('calc-1', 'a'.repeat(64));
  assert.ok(!/https?:|\/verify/.test(payload));
  const svg = FT.qrSvg(qrcode, payload);
  const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  assert.equal(m[1], m[2]);
  const q = qrcode(0, 'M'); q.addData(payload); q.make();
  assert.equal(Number(m[1]), q.getModuleCount() + 4);
  assert.ok(!/<script|on\w+=|href/i.test(svg));
  // qorong'i modullar soni kutubxona matritsasi bilan bir xil
  let dark = 0; for (let r = 0; r < q.getModuleCount(); r++) for (let c = 0; c < q.getModuleCount(); c++) if (q.isDark(r, c)) dark++;
  assert.equal((svg.match(/M\d+ \d+h1v1h-1z/g) || []).length, dark);
});

/* ── boshqa rejimlar ── */

test('regressiya / top-down / maxsus rejimlar: tayyor bo\'lim umumiy shaklga o\'raladi (sarlavha, rekvizitlar, normativ havolalar, pastki qism)', () => {
  const env = envOf('uz'), S = createSections(env);
  const td = E.evaluate(require('../cases/nordtest/nordtest-tr537-nh4n.json').modelSpec);
  const html = FM.buildReport({ form: 'test_report', lang: 'uz', env, sections: S, requisites: REQ, mode: 'TOP_DOWN', bodyHTML: S.topdownSection(td, { print: true }) });
  const d = frag(html);
  assert.equal(d.querySelector('[data-report-body]').dataset.reportBody, 'TOP_DOWN');
  assert.ok(d.querySelector('[data-td-report]') && d.querySelector('[data-report-title="test_report"]'));
  assert.match(d.querySelector('[data-report-refs]').textContent, /Nordtest TR 537 ed\. 4/);
  assert.equal(d.querySelector('[data-report-requisites] [data-report-req="reportNo"] td').textContent, 'K-001');
});

test('src/report/ sof: DOM, global obyekt, brauzer xotirasi va tarmoq yo\'q', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'src/report')).filter(f => f.endsWith('.js'))) {
    const code = read('src/report/' + f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/\b(document|window|localStorage|sessionStorage|navigator|fetch|XMLHttpRequest)\b/.test(code), f);
  }
});

test('rekvizitlar faqat brauzerda: laboratoriya — localStorage, hujjat va shaxsga tegishli maydonlar — sessionStorage; Firebase / tarmoqqa yozilmaydi', () => {
  const ui = read('src/ui/report/app.js');
  assert.match(ui, /write\(window\.localStorage, LAB_KEY, \{ \.\.\.lab, form \}\)/);
  assert.match(ui, /write\(window\.sessionStorage, DOC_KEY, doc\)/);
  assert.ok(!/firebase|firestore|DB\.|AuthManager|XMLHttpRequest|sendBeacon|WebSocket/i.test(ui.replace(/\/\*[\s\S]*?\*\//g, '')));
  // yagona fetch — build identifikatori (shu saytdagi statik fayl), ma'lumot yuborilmaydi
  const fetches = ui.match(/fetch\([^)]*\)/g) || [];
  assert.deepEqual(fetches, ["fetch('tests/security/engine.sha256.json', { cache: 'no-cache' })"]);
  assert.ok(!/onclick=|javascript:/.test(ui));
  // hisob JSON eksporti va xeshiga rekvizitlar kirmaydi
  assert.ok(!/requisites|labName|customer/.test(read('src/io/calc-json.js')));
});
