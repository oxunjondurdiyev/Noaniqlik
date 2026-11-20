/* P16 (egasi qarorlari 2026-11-20, R-29 #8 va 3-to'plam: alohida fayl, yozuvlar, runtime tekshiruvi, hisobot qatori): shablon kartasidagi "Manba bilan mos" belgisi — qo'lda yoziladigan bayroq emas.
   templates/validation/builtin.json scripts/template-validation.js bilan yaratiladi (hisob ↔ tests/cases/excel etalon misollari,
   kutilgan qiymatlar tests/fixtures/ dagi Excel kataklaridan); fayl eskirgan bo'lsa — xato. Toleranslar misolning o'zidan. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM } = require('jsdom');
const { build, text, OUT } = require('../../scripts/template-validation.js');
const { EXCEL } = require('../../scripts/lib/template-cases.js');
const { templates, byId, ROOT } = require('./lib.js');
const { escHtml } = require('../../src/ui/escape.js');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const frag = html => new JSDOM('<!doctype html><body><div id="r">' + html + '</div></body>').window.document.getElementById('r');
const DICT = (() => { const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' }); return dom.window.eval(['i18n.js', 'i18n-ext.js', 'i18n-templates.js', 'i18n-shell.js'].map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS'); })();

const { ENGINE_VERSION } = require('../../src/engine/version.js');
const { canonicalizeJcs, jcsHash } = require('../../src/storage/canonical.js');
const { templateValidation, RECORD_FIELDS, VALIDATION_FORMAT } = require('../../src/templates/validation-status.js');
const FILE = () => JSON.parse(fs.readFileSync(OUT, 'utf8'));
const nodeHash = tpl => crypto.createHash('sha256').update(canonicalizeJcs(tpl), 'utf8').digest('hex');
/** Brauzerdagi src/ui/tpl/app.js::validationOf ning test nusxasi (builtin — tests/templates/lib.js dagi fayldan o'qilgan shablon) */
const validationOf = (file, ev = ENGINE_VERSION) => (tpl, local) =>
  templateValidation(file, { templateId: tpl.id, templateHash: local ? null : nodeHash(tpl), engineVersion: ev, builtin: !local });
const ctxOf = (lang, file, ev) => ({ t: k => DICT[lang][k] ?? k, esc: escHtml, lang, validationOf: validationOf(file, ev) });

test('templates/validation/builtin.json yangi (avtomatik yaratilgan; qo\'lda tahrirlanmagan) — `_generated` belgisi bilan', () => {
  const cur = fs.readFileSync(OUT, 'utf8');
  assert.equal(cur, text(), 'eskirgan yoki qo\'lda o\'zgartirilgan — `npm run validate:templates`');
  const f = JSON.parse(cur);
  assert.equal(Object.keys(f)[0], '_generated');
  assert.match(f._generated, /qo'lda tahrirlanmaydi/);
  assert.equal(f.format, VALIDATION_FORMAT);
  assert.equal(f.ENGINE_VERSION, ENGINE_VERSION);
  // qo'lda tahrir (natija maydoni) → qayta yaratilgan matn bilan mos kelmaydi (sana ham yangilanadi)
  const edited = JSON.parse(cur); edited.records[0].relDiff = 0;
  assert.notEqual(JSON.stringify(build(edited), null, 1) + '\n', JSON.stringify(edited, null, 1) + '\n');
  // mazmun o'zgarmasa sana saqlanadi (fayl deterministik); yozuv yangi bo'lsa — bugungi sana
  const aged = JSON.parse(cur); aged.records.forEach(r => { r.date = '2026-01-02'; });
  assert.ok(build(aged).records.every(r => r.date === '2026-01-02'));
  assert.ok(build(null).records.every(r => r.date === new Date().toISOString().slice(0, 10)));
  // shablonlar papkasiga qo'yilmagan (egasi sharti) va CI qayta yaratib solishtiradi
  assert.ok(!fs.existsSync(path.join(ROOT, 'templates/builtin/validation.json')));
  assert.ok(templates.every(x => !('validation' in x.tpl) && !('validated' in x.tpl)), 'shablon ichida validatsiya bayrog\'i yo\'q');
  assert.match(read('.github/workflows/test.yml'), /node scripts\/template-validation\.js --check/);
  assert.match(read('package.json'), /"validate:templates": "node scripts\/template-validation\.js --write"/);
});

test('har bir yozuvda: templateId, templateHash, ENGINE_VERSION, testId, source, clause, relDiff, date; holat hisobdan', () => {
  const recs = FILE().records;
  const mapped = new Map(EXCEL);
  assert.deepEqual(recs.map(r => r.templateId + '|' + r.testId), [...mapped].flatMap(([id, ids]) => ids.map(t => id + '|' + t)).sort((a, b) => recs.findIndex(r => r.templateId + '|' + r.testId === a) - recs.findIndex(r => r.templateId + '|' + r.testId === b)));
  assert.equal(recs.length, 9, '9 ta etalon nuqta');
  for (const r of recs) {
    for (const k of RECORD_FIELDS) assert.ok(r[k] !== undefined && r[k] !== null && r[k] !== '', `${r.testId}: ${k}`);
    assert.equal(r.templateHash, nodeHash(byId[r.templateId]), r.testId);
    assert.equal(r.ENGINE_VERSION, ENGINE_VERSION);
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.date <= new Date().toISOString().slice(0, 10), 'sana kelajakda emas');
    assert.ok(fs.existsSync(path.join(ROOT, 'tests/cases/excel', r.testId + '.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'tests/fixtures', r.source)), r.testId + ': manba fayli tests/fixtures/ da');
    assert.equal(r.status, 'verified', r.testId);
    assert.ok(r.clause && r.checked >= 4, r.testId);
    assert.ok(Number.isFinite(r.relDiff) && r.relDiff >= 0 && r.relDiff < 1e-2, r.testId + ': Δ = ' + r.relDiff);
  }
  // zichlik va gazoanalizator — sonli aniqlik darajasida; termometrda Δ — k qoidasi (D-02, egasi qarori Q-1 a) tufayli, yashirilmaydi
  const max = id => Math.max(...recs.filter(r => r.templateId === id).map(r => r.relDiff));
  assert.ok(max('legacy-density') < 1e-9 && max('legacy-gas_analyzer') < 1e-9);
  assert.ok(max('legacy-thermometer') > 1e-9 && recs.some(r => r.templateId === 'legacy-thermometer' && r.known.includes('D-03')));
});

test('xesh: generator (Node crypto) va brauzer yo\'li (jcsHash, WebCrypto) AYNAN bir xil', async () => {
  for (const id of ['legacy-density', 'legacy-gas_analyzer', 'legacy-thermometer', 'T-01']) assert.equal(await jcsHash(byId[id]), nodeHash(byId[id]), id);
});

test('runtime: templateHash yoki ENGINE_VERSION mos kelmasa, builtin bo\'lmasa, yozuv yo\'q / test o\'tmagan / fayl buzuq bo\'lsa — unverified', () => {
  const file = FILE();
  const q = { templateId: 'legacy-density', templateHash: nodeHash(byId['legacy-density']), engineVersion: ENGINE_VERSION, builtin: true };
  const ok = templateValidation(file, q);
  assert.equal(ok.status, 'verified');
  assert.deepEqual([ok.source, ok.clause, ok.testIds, ok.engineVersion], ['Zichlik_noaniqligi_hisobi.xlsx', '3_Hisob', ['excel-density'], ENGINE_VERSION]);
  const st = x => { const v = templateValidation(x.file === undefined ? file : x.file, { ...q, ...x.q }); return [v.status, v.reason]; };
  assert.deepEqual(st({ q: { templateHash: 'f'.repeat(64) } }), ['unverified', 'hash_mismatch']);
  assert.deepEqual(st({ q: { templateHash: null } }), ['unverified', 'hash_mismatch']);
  assert.deepEqual(st({ q: { engineVersion: '2.10.1' } }), ['unverified', 'engine_mismatch']);
  assert.deepEqual(st({ q: { builtin: false } }), ['unverified', 'not_builtin'], 'import qilingan shablon — doim unverified');
  assert.deepEqual(st({ q: { templateId: 'T-01', templateHash: nodeHash(byId['T-01']) } }), ['unverified', 'no_record']);
  assert.deepEqual(st({ file: null }), ['unverified', 'no_record']);
  assert.deepEqual(st({ file: { ...file, _generated: undefined } }), ['unverified', 'no_record'], '`_generated` belgisiz fayl qabul qilinmaydi');
  assert.deepEqual(st({ file: { ...file, format: 'uc-template-validation/1' } }), ['unverified', 'no_record']);
  assert.deepEqual(st({ file: { ...file, records: file.records.map(r => ({ ...r, status: 'unverified' })) } }), ['unverified', 'test_failed']);
  // shablon matni bir belgiga o'zgarsa xesh mos kelmaydi
  const changed = { ...byId['legacy-density'], sourceNote: { uz: 'x', ru: 'x', en: 'x' } };
  assert.deepEqual(st({ q: { templateHash: nodeHash(changed) } }), ['unverified', 'hash_mismatch']);
  // gazoanalizator: uchala nuqta yozuvi ham mos bo'lishi shart
  const gq = { templateId: 'legacy-gas_analyzer', templateHash: nodeHash(byId['legacy-gas_analyzer']), engineVersion: ENGINE_VERSION, builtin: true };
  assert.equal(templateValidation(file, gq).status, 'verified');
  const one = { ...file, records: file.records.map(r => (r.testId === 'excel-gas-p2' ? { ...r, ENGINE_VERSION: '2.9.0' } : r)) };
  assert.equal(templateValidation(one, gq).reason, 'engine_mismatch');
});

test('generator misol toleransini o\'zgartirmaydi va etalon qiymatlarga yozmaydi (faqat o\'qiydi)', () => {
  const src = read('scripts/template-validation.js');
  assert.ok(!/writeFileSync\((?!OUT)/.test(src));
  assert.match(src, /\(c\.tolerance \|\| \{\}\)\[q\] \|\| \(c\.tolerance \|\| \{\}\)\.default/);
});

test('katalog kartasi: verified — "Manba bilan mos: <manba>, <band>; Δ = … %"; nusxa, xesh / versiya farqi yoki yozuv yo\'q — unverified; escape', async () => {
  const V = await import('../../src/ui/tpl/view.js');
  const file = FILE();
  const kind = (html) => frag(html).querySelector('[data-tpl-validation]').dataset;
  for (const lang of ['uz', 'ru', 'en']) {
    const ctx = ctxOf(lang, file);
    const ok = frag(V.validationBadge(byId['legacy-density'], false, ctx)).querySelector('[data-tpl-validation]');
    assert.equal(ok.dataset.tplValidation, 'verified', lang);
    assert.ok(ok.textContent.includes('Zichlik_noaniqligi_hisobi.xlsx') && ok.textContent.includes('3_Hisob') && /Δ = [\d.e-]+ %/.test(ok.textContent), ok.textContent);
    assert.ok(!/\{\w+\}/.test(ok.textContent), 'o\'rinbosar qolmagan');
    const th = frag(V.validationBadge(byId['legacy-thermometer'], false, ctx));
    assert.match(th.textContent, /Δ = 0\.087 %/);
    assert.ok(th.textContent.includes('D-03'), 'ma\'lum farq ko\'rsatiladi');
    assert.deepEqual({ ...kind(V.validationBadge(byId['legacy-density'], true, ctx)) }, { tplValidation: 'unverified', tplValidationReason: 'not_builtin' }, 'foydalanuvchi nusxasi / import');
    assert.equal(kind(V.validationBadge(byId['T-01'], false, ctx)).tplValidationReason, 'no_record');
    assert.equal(kind(V.validationBadge(byId['legacy-density'], false, ctxOf(lang, null))).tplValidation, 'unverified', 'fayl yuklanmasa');
    assert.equal(kind(V.validationBadge(byId['legacy-density'], false, ctxOf(lang, file, '9.9.9'))).tplValidationReason, 'engine_mismatch');
    assert.equal(kind(V.validationBadge({ ...byId['legacy-density'], labCount: 99 }, false, ctx)).tplValidationReason, 'hash_mismatch');
    assert.equal(kind(V.validationBadge(byId['legacy-density'], false, { ...ctx, validationOf: undefined })).tplValidation, 'unverified');
  }
  const evil = { ...file, records: file.records.map(r => ({ ...r, source: '<img src=x onerror=1>' })) };
  assert.equal(frag(V.validationBadge(byId['legacy-density'], false, ctxOf('uz', evil))).querySelector('img'), null);
  const card = frag(V.cardHTML({ tpl: byId['legacy-density'], local: false }, ctxOf('uz', file)));
  assert.ok(card.querySelector('[data-tpl-card] [data-tpl-validation="verified"]'));
});

test('A4 hisobot: BITTA qator — validatsiya holati + manba + ENGINE_VERSION (uch tilda); unverified da sababi; escape', async () => {
  const V = await import('../../src/ui/tpl/view.js');
  const file = FILE();
  const meta = { id: 'legacy-density', version: byId['legacy-density'].version, status: 'DRAFT', standards: [] };
  for (const lang of ['uz', 'ru', 'en']) {
    const ctx = ctxOf(lang, file);
    const notice = v => frag(V.reportNoticeHTML(meta, { ...ctx, validation: v }, {}));
    const good = notice(ctx.validationOf(byId['legacy-density'], false)).querySelectorAll('[data-report-validation]');
    assert.equal(good.length, 1, 'bitta qator');
    assert.equal(good[0].dataset.reportValidation, 'verified');
    const txt = good[0].textContent;
    assert.ok(txt.includes(DICT[lang].tplv_report_verified.split('{source}')[0]), lang);
    assert.ok(txt.includes('Zichlik_noaniqligi_hisobi.xlsx') && txt.includes('3_Hisob') && txt.includes('ENGINE_VERSION ' + ENGINE_VERSION), txt);
    assert.ok(!/\{\w+\}/.test(txt) && !txt.includes('\n'), txt);
    for (const [v, reason] of [[ctx.validationOf(byId['legacy-density'], true), 'not_builtin'], [ctxOf(lang, file, '9.9.9').validationOf(byId['legacy-density'], false), 'engine_mismatch'], [ctx.validationOf(byId['T-01'], false), 'no_record']]) {
      const bad = notice(v).querySelector('[data-report-validation]');
      assert.equal(bad.dataset.reportValidation, 'unverified', lang);
      assert.equal(bad.dataset.reportValidationReason, reason);
      assert.ok(bad.textContent.includes('unverified') && bad.textContent.includes(DICT[lang]['tplv_why_' + reason]) && bad.textContent.includes('ENGINE_VERSION '), bad.textContent);
      assert.ok(!bad.textContent.includes(DICT[lang].tplv_report_verified.split('{source}')[0]), '"mos" yozuvi yo\'q');
    }
  }
  const evil = templateValidation({ ...file, records: file.records.map(r => ({ ...r, source: '<img src=x onerror=1>' })) }, { templateId: 'legacy-density', templateHash: nodeHash(byId['legacy-density']), engineVersion: ENGINE_VERSION, builtin: true });
  assert.equal(frag(V.validationLineHTML(evil, ctxOf('uz', file))).querySelector('img'), null);
  // hisobot qatlami (src/report/) shablon validatsiyasini bilmaydi — qator shablon eslatmasi orqali qo'shiladi; foydalanuvchi NATIJASIDA "mos" belgisi yo'q
  assert.ok(!/tplv_|data-tpl-validation/.test(read('src/report/sections.js') + read('src/js/report.js')));
  assert.match(read('src/ui/tpl/app.js'), /validation: validationOfMeta\(meta\)/);
});

test('saytga chiqadi: templates/validation oq ro\'yxatda', () => {
  assert.ok(require('../../scripts/build-site.js').WHITELIST.dirs.includes('templates/validation'));
});
