/* P16 (egasi qarori 2026-11-20, R-29 #8): shablon kartasidagi "Manba bilan mos" belgisi — qo'lda yoziladigan bayroq emas.
   templates/validation/builtin.json scripts/template-validation.js bilan yaratiladi (hisob ↔ tests/cases/excel etalon misollari,
   kutilgan qiymatlar tests/fixtures/ dagi Excel kataklaridan); fayl eskirgan bo'lsa — xato. Toleranslar misolning o'zidan. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { build, text, OUT } = require('../../scripts/template-validation.js');
const { EXCEL } = require('../../scripts/lib/template-cases.js');
const { templates, byId, ROOT } = require('./lib.js');
const { escHtml } = require('../../src/ui/escape.js');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const frag = html => new JSDOM('<!doctype html><body><div id="r">' + html + '</div></body>').window.document.getElementById('r');
const DICT = (() => { const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' }); return dom.window.eval(['i18n.js', 'i18n-ext.js', 'i18n-templates.js', 'i18n-shell.js'].map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS'); })();

test('templates/validation/builtin.json yangi (avtomatik yaratilgan; qo\'lda tahrirlanmagan)', () => {
  assert.equal(fs.readFileSync(OUT, 'utf8'), text(), 'eskirgan — `node scripts/template-validation.js --write`');
});

test('holat hisobdan: etalon misolga bog\'langan 3 shablon — verified (manba fayli, varaq, Δ); qolganlari — unverified', () => {
  const v = build().templates;
  assert.deepEqual(Object.keys(v).sort(), templates.map(x => x.tpl.id).sort());
  const mapped = new Map(EXCEL);
  for (const [id, x] of Object.entries(v)) {
    assert.ok(['verified', 'unverified'].includes(x.status), id);
    if (!mapped.has(id)) { assert.deepEqual(x, { source: null, clause: null, status: 'unverified', relDiff: null }, id); continue; }
    assert.equal(x.status, 'verified', id);
    assert.ok(fs.existsSync(path.join(ROOT, 'tests/fixtures', x.source)), id + ': manba fayli tests/fixtures/ da');
    assert.ok(x.clause && x.checked >= 4 * mapped.get(id).length, id);
    assert.ok(Number.isFinite(x.relDiff) && x.relDiff >= 0 && x.relDiff < 1e-2, id + ': Δ = ' + x.relDiff);
    assert.deepEqual(x.cases, mapped.get(id));
  }
  // zichlik va gazoanalizator — sonli aniqlik darajasida; termometrda Δ — k qoidasi (D-02, egasi qarori Q-1 a) tufayli, yashirilmaydi
  assert.ok(v['legacy-density'].relDiff < 1e-9 && v['legacy-gas_analyzer'].relDiff < 1e-9);
  assert.ok(v['legacy-thermometer'].relDiff > 1e-9 && v['legacy-thermometer'].known.includes('D-03'));
});

test('generator misol toleransini o\'zgartirmaydi va etalon qiymatlarga yozmaydi (faqat o\'qiydi)', () => {
  const src = read('scripts/template-validation.js');
  assert.ok(!/writeFileSync\((?!OUT)/.test(src));
  assert.match(src, /\(c\.tolerance \|\| \{\}\)\[q\] \|\| \(c\.tolerance \|\| \{\}\)\.default/);
});

test('katalog kartasi: verified — "Manba bilan mos: <manba>, <band>; Δ = … %"; nusxa yoki ro\'yxatda yo\'q — unverified; escape', async () => {
  const V = await import('../../src/ui/tpl/view.js');
  const validation = build().templates;
  for (const lang of ['uz', 'ru', 'en']) {
    const ctx = { t: k => DICT[lang][k] ?? k, esc: escHtml, lang, validation };
    const ok = frag(V.validationBadge(byId['legacy-density'], false, ctx)).querySelector('[data-tpl-validation]');
    assert.equal(ok.dataset.tplValidation, 'verified', lang);
    assert.ok(ok.textContent.includes('Zichlik_noaniqligi_hisobi.xlsx') && ok.textContent.includes('3_Hisob') && /Δ = [\d.e-]+ %/.test(ok.textContent), ok.textContent);
    assert.ok(!/\{\w+\}/.test(ok.textContent), 'o\'rinbosar qolmagan');
    const th = frag(V.validationBadge(byId['legacy-thermometer'], false, ctx));
    assert.match(th.textContent, /Δ = 0\.087 %/);
    assert.ok(th.textContent.includes('D-03'), 'ma\'lum farq ko\'rsatiladi');
    assert.equal(frag(V.validationBadge(byId['legacy-density'], true, ctx)).querySelector('[data-tpl-validation]').dataset.tplValidation, 'unverified', 'foydalanuvchi nusxasi');
    assert.equal(frag(V.validationBadge(byId['T-01'], false, ctx)).querySelector('[data-tpl-validation]').dataset.tplValidation, 'unverified');
    assert.equal(frag(V.validationBadge(byId['legacy-density'], false, { ...ctx, validation: undefined })).querySelector('[data-tpl-validation]').dataset.tplValidation, 'unverified', 'fayl yuklanmasa');
  }
  const evil = { ...validation, 'legacy-density': { ...validation['legacy-density'], source: '<img src=x onerror=1>' } };
  const html = V.validationBadge(byId['legacy-density'], false, { t: k => DICT.uz[k] ?? k, esc: escHtml, lang: 'uz', validation: evil });
  assert.equal(frag(html).querySelector('img'), null);
  // karta ichida ham chiqadi; foydalanuvchi natijasida (hisobot bo'limlari) bunday belgi YO'Q
  const card = frag(V.cardHTML({ tpl: byId['legacy-density'], local: false }, { t: k => DICT.uz[k] ?? k, esc: escHtml, lang: 'uz', validation }));
  assert.ok(card.querySelector('[data-tpl-card] [data-tpl-validation="verified"]'));
  assert.ok(!/tplv_|data-tpl-validation/.test(read('src/report/sections.js') + read('src/js/report.js')));
});

test('saytga chiqadi: templates/validation oq ro\'yxatda', () => {
  assert.ok(require('../../scripts/build-site.js').WHITELIST.dirs.includes('templates/validation'));
});
