/* P04: shablonlar UI HTML quruvchilari (src/ui/tpl/view.js) — escape, bo'limlar, qidiruv,
   DRAFT va "Namunaviy ma'lumot — real emas" ogohlantirishlari (katalog, panel, hisobot). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const V = require('../../src/ui/tpl/view.js');
const T = require('../../src/templates/interpreter.js');
const { escHtml } = require('../../src/ui/escape.js');
const { templates, byId, ROOT } = require('./lib.js');

const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
const TR = dom.window.eval(['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js']
  .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + '\n;TRANSLATIONS');
const ctx = lang => ({ t: k => TR[lang][k] ?? k, esc: escHtml, lang });
const entries = templates.map(x => ({ tpl: x.tpl, local: false }));
const frag = html => JSDOM.fragment(html);

test('katalog: 5 bo\'lim (qurilish, oziq-ovqat/kimyo, elektr, kalibrlash, umumiy — P10 dan), 44 karta (35 + P08 R-01 + P09 TD-01…TD-04 + P10 SP-01…SP-04)', () => {
  const f = frag(V.catalogHTML(entries, '', ctx('uz')));
  assert.deepEqual([...f.querySelectorAll('[data-section]')].map(s => s.dataset.section), ['construction', 'food_chem', 'electrical', 'calibration', 'general']);
  assert.equal(f.querySelectorAll('.tpl-card').length, 44);
  assert.match(f.textContent, /Qurilish materiallari va metallar/);
  assert.match(frag(V.catalogHTML(entries, '', ctx('ru'))).textContent, /Электробезопасность/);
});

test('katalog qidiruvi: "10180" → faqat T-03; karta: holat, standartlar, laboratoriyalar soni', () => {
  const f = frag(V.catalogHTML(entries, '10180', ctx('uz')));
  const cards = f.querySelectorAll('.tpl-card');
  assert.equal(cards.length, 1);
  const c = cards[0];
  assert.match(c.textContent, /T-03/);
  assert.match(c.querySelector('.tpl-badge').textContent, /DRAFT/);
  assert.match(c.textContent, /ГОСТ 10180/);
  assert.match(c.querySelector('.tpl-meta').textContent, /39/);
});

test('"demo": true belgili har bir shablon kartasida ogohlantirish bor; qolganlarida yo\'q', () => {
  for (const { tpl } of templates) {
    const raw = JSON.stringify(tpl);
    const f = frag(V.cardHTML({ tpl }, ctx('uz')));
    const has = !!f.querySelector('[data-demo-warning]');
    assert.equal(has, raw.includes('"demo":true'), tpl.id);
    if (has) assert.match(f.textContent, /Namunaviy ma'lumot — real emas/);
  }
});

test('XSS: shablon matnlari escape qilinadi (katalog, panel, hisobot)', () => {
  const evil = JSON.parse(JSON.stringify(byId['T-11']));
  evil.title.uz = '<img src=x onerror=alert(1)>';
  evil.id = 'X"><script>';
  evil.standards = [{ code: '<b>ГОСТ</b>', edition: null, labCount: null }];
  const html = V.cardHTML({ tpl: evil }, ctx('uz'));
  assert.ok(!/<img|<script|<b>/.test(html), html);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  const b = T.buildState(evil, {}, { allowMissing: true, ui: true, lang: 'uz' }).state;
  const banner = V.bannerHTML(b, T.missingInState(b), ctx('uz'));
  const notice = V.reportNoticeHTML(b.template, ctx('uz'));
  for (const h of [banner, notice]) {
    assert.ok(!/<img|<script|<b>ГОСТ/.test(h), h);
    assert.match(h, /&lt;b&gt;ГОСТ&lt;\/b&gt;/);
  }
});

test('panel: DRAFT ogohlantirishi, o\'zgarmaslar, korrelyatsiya savoli, kiritilmagan manba, bo\'sh maydonlar', () => {
  const b = T.buildState(byId['T-03'], {}, { allowMissing: true, ui: true, lang: 'uz' }).state;
  const f = frag(V.bannerHTML(b, T.missingInState(b), ctx('uz')));
  assert.match(f.querySelector('[data-draft-warning]').textContent, /Shablon tasdiqlanmagan \(DRAFT\)/);
  assert.ok(f.querySelector('[data-tpl-const="alpha"]'));
  assert.ok(f.querySelector('[data-tpl-include="0"]'), 'namunaning o\'zgaruvchanligi');
  assert.match(f.querySelector('.tpl-missing').textContent, /kuzatuvlar/);
  const b11 = T.buildState(byId['T-11'], {}, { allowMissing: true, ui: true, lang: 'ru' }).state;
  const f11 = frag(V.bannerHTML(b11, [], ctx('ru')));
  assert.equal(f11.querySelector('[data-tpl-corr="0"]').checked, true);
  assert.match(f11.textContent, /одним и тем же прибором/);
  const b14 = T.buildState(byId['T-14'], {}, { allowMissing: true, ui: true, lang: 'en' }).state;
  const f14 = frag(V.bannerHTML(b14, [], ctx('en')));
  assert.ok(f14.querySelector('[data-tpl-const="alpha_t"][data-kind="aux"]'));
});

test('hisobot belgisi: DRAFT va demo uch tilda; APPROVED da DRAFT belgisi yo\'q', () => {
  const meta = T.buildState(byId['legacy-mass'], { useSample: true }, { ui: true }).meta;
  for (const [l, draft, demo] of [['uz', 'Shablon tasdiqlanmagan (DRAFT)', "Namunaviy ma'lumot — real emas"],
    ['ru', 'Шаблон не утверждён (DRAFT)', 'Пример данных — не реальные'], ['en', 'Template not approved (DRAFT)', 'Sample data — not real']]) {
    const f = frag(V.reportNoticeHTML(meta, ctx(l)));
    assert.equal(f.querySelector('[data-draft-warning]').textContent.replace('⚠ ', ''), draft);
    assert.equal(f.querySelector('[data-demo-warning]').textContent.replace('⚠ ', ''), demo);
  }
  const f = frag(V.reportNoticeHTML({ ...meta, status: 'APPROVED', demo: false }, ctx('uz')));
  assert.equal(f.querySelector('[data-draft-warning]'), null);
  assert.equal(f.querySelector('[data-demo-warning]'), null);
});

test('missingInState: bo\'sh yarim kenglik, k, o\'zgarmas va kuzatuv; to\'ldirilgach bo\'sh', () => {
  const tpl = byId['T-14'];
  const s = T.buildState(tpl, {}, { allowMissing: true, ui: true }).state;
  const types = T.missingInState(s).map(m => m.type + ':' + (m.id || m.symbol));
  for (const x of ['observation:x', 'observation:x_loyiha', 'halfWidth:x_cert', 'k:x_cert', 'constant:alpha_t', 'constant:dt']) assert.ok(types.includes(x), x);
  s.measurements = { x: [1, 2, 3], x_loyiha: [2] };
  s.typeB = s.typeB.map(c => ({ ...c, halfWidth: c.sourceId === 'x_temp' ? c.halfWidth : 0.1, k: 2 }));
  s.template.aux = { alpha_t: 1e-5, dt: 2 };
  assert.deepEqual(T.missingInState(s), []);
  assert.deepEqual(T.missingInState({ params: ['x'] }), [], 'shablonsiz holat');
});

test('index.html: katalog ekrani, panel joyi, modul skripti va i18n fayli ulangan', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const s of ['id="templates-screen"', 'id="template-box"', 'id="tpl-modal"', 'src="src/ui/tpl/app.js"', 'src="src/js/i18n-templates.js"', 'data-open-templates']) {
    assert.ok(html.includes(s), s);
  }
});
