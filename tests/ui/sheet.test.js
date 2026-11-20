/* P16: Kiritish — B tur manbasi varag'i (bottom sheet / yon panel), src/js/typeB.js. jsdom.
   Varaq yangi forma emas: kartaning o'z maydonlari; jonli u dvigatel funksiyalari (Calc.typeB, getDivisorLabel) orqali. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const { fmt, fmtSci } = require('../../src/report/format.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N = ['i18n.js', 'i18n-ext.js', 'i18n-engine.js', 'i18n-templates.js', 'i18n-lab.js', 'i18n-shell.js'].map(f => 'src/js/' + f);

function setup() {
  const dom = new JSDOM(`<!doctype html><body>
    <button id="btn-add-typeb"></button><button id="btn-calc-combined"></button><button id="btn-typeb-registry"></button>
    <div id="typeb-components"></div><div id="typeb-settings"></div><div id="typeb-summary"></div></body>`, { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N.map(read).join('\n;\n'));
  w.Calc = { ...E, fmt, fmtSci };
  w.eval(read('src/js/state.js'));
  w.eval('appState.set({ n: 3, params: ["m"], measurements: { m: [1, 2, 3] }, typeA: {}, combined: null, settings: { paired: true, P: 0.9545 }, typeB: [' +
    '{ id: "tb_0", name: "Sertifikat", param: "m", halfWidth: 0.6, distribution: "normal", k: 2, sensitivity: 1, unit: "g" },' +
    '{ id: "tb_1", name: "<img src=x onerror=1>", param: "m", halfWidth: 0.3, distribution: "rect", k: 2, sensitivity: 1, unit: "g" }] })');
  w.eval(read('src/js/typeB.js'));
  w.eval('TypeB.init()');
  return { w, doc: w.document, state: () => w.eval('appState.get()') };
}
const key = (w, k) => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));

test('yopiq holat: ixcham kartalar, har birida haqiqiy "Tahrirlash" tugmasi va jonli u (dvigateldan); uslub atributi yo\'q', () => {
  const { doc } = setup();
  const cards = doc.querySelectorAll('.typeb-card');
  assert.equal(cards.length, 2);
  assert.equal(doc.querySelector('.typeb-card.is-open'), null);
  assert.ok(doc.querySelector('.sheet-backdrop').hasAttribute('hidden'));
  for (const c of cards) assert.equal(c.querySelector('[data-tb-edit]').tagName, 'BUTTON');
  // u = U / k = 0.6 / 2 (normal), u = a / √3 (to'g'ri burchakli) — Calc.typeB bilan bir xil
  assert.ok(cards[0].querySelector('[data-tb-u]').textContent.includes(fmtSci(E.typeB(0.6, 'normal', 2, {}))));
  assert.ok(cards[1].querySelector('[data-tb-u]').textContent.includes(fmtSci(E.typeB(0.3, 'rect', 2, {}))));
  assert.ok(cards[1].querySelector('[data-tb-u]').textContent.includes(E.getDivisorLabel('rect', 2)));
  assert.ok(!/\sstyle=/.test(doc.getElementById('typeb-components').innerHTML));
  assert.equal(doc.querySelector('.typeb-card img'), null, 'nom escape qilingan');
});

test('varaq: ochiladi (dialog, fokus qiymat maydonida), Esc va "Tayyor" yopadi, fokus tugmaga qaytadi', () => {
  const { w, doc } = setup();
  doc.querySelector('[data-tb-edit="tb_0"]').click();
  const open = doc.querySelector('.typeb-card.is-open');
  assert.equal(open.dataset.id, 'tb_0');
  assert.equal(open.getAttribute('role'), 'dialog');
  assert.equal(open.getAttribute('aria-modal'), 'true');
  assert.equal(doc.activeElement, open.querySelector('[data-field="halfWidth"]'));
  assert.equal(open.querySelector('[data-field="halfWidth"]').getAttribute('inputmode'), 'decimal');
  assert.ok(open.querySelector('[data-field="k"]'), 'k faqat normal / sertifikatda');
  assert.ok(!doc.querySelector('.sheet-backdrop').hasAttribute('hidden'));
  assert.ok(doc.body.classList.contains('sheet-open'));
  assert.equal(doc.querySelectorAll('.typeb-card.is-open').length, 1);
  key(w, 'Escape');
  assert.equal(doc.querySelector('.typeb-card.is-open'), null);
  assert.equal(doc.activeElement, doc.querySelector('[data-tb-edit="tb_0"]'));
  assert.ok(!doc.body.classList.contains('sheet-open'));
  doc.querySelector('[data-tb-edit="tb_1"]').click();
  assert.equal(doc.querySelector('.typeb-card.is-open [data-field="k"]'), null, 'to\'g\'ri burchaklida k yo\'q');
  doc.querySelector('.sheet-actions [data-tb-close]').click();
  assert.equal(doc.querySelector('.typeb-card.is-open'), null);
});

test('taqsimot segmenti: bosilganda holat o\'zgaradi, varaq ochiq qoladi; qo\'shimcha taqsimotlar ro\'yxatda', () => {
  const { doc, state } = setup();
  doc.querySelector('[data-tb-edit="tb_1"]').click();
  const seg = () => [...doc.querySelectorAll('.typeb-card.is-open [data-tb-dist]')];
  assert.deepEqual(seg().map(b => b.dataset.tbDist), ['normal', 'rect', 'triang', 'ushape', 'resol']);
  assert.deepEqual(seg().filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.tbDist), ['rect']);
  seg().find(b => b.dataset.tbDist === 'triang').click();
  assert.equal(state().typeB[1].distribution, 'triang');
  assert.equal(doc.querySelector('.typeb-card.is-open').dataset.id, 'tb_1');
  assert.ok(doc.querySelector('.typeb-card.is-open [data-tb-live]').textContent.includes(fmtSci(E.typeB(0.3, 'triang', 2, {}))));
  const other = [...doc.querySelectorAll('.typeb-card.is-open select[data-field="distribution"] option')].map(o => o.value).filter(Boolean);
  for (const d of ['trap', 'ctrap', 'exp', 'lognorm']) assert.ok(other.includes(d), d);
});

test('jonli ko\'rinish: yozish paytida (saqlanmasdan) u dvigatel orqali qayta hisoblanadi; vergulli kasr qabul qilinadi', () => {
  const { w, doc, state } = setup();
  doc.querySelector('[data-tb-edit="tb_1"]').click();
  const inp = doc.querySelector('.typeb-card.is-open [data-field="halfWidth"]');
  inp.value = '0,9';
  inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(inp.value, '0.9', 'vergul nuqtaga almashtiriladi');
  assert.ok(doc.querySelector('.typeb-card.is-open [data-tb-live]').textContent.includes(fmtSci(E.typeB(0.9, 'rect', 2, {}))));
  assert.equal(state().typeB[1].halfWidth, 0.3, 'holat hali o\'zgarmagan');
  inp.dispatchEvent(new w.Event('change', { bubbles: true }));
  assert.equal(state().typeB[1].halfWidth, 0.9);
});

test('"Reestrdan tanlash" varaq ichida: mavjud tugma orqali (yangi mantiq yo\'q); o\'chirish varaqni yopadi', () => {
  const { doc, state } = setup();
  let picked = 0;
  doc.getElementById('btn-typeb-registry').addEventListener('click', () => { picked++; });
  doc.querySelector('[data-tb-edit="tb_0"]').click();
  doc.querySelector('.typeb-card.is-open [data-tb-registry]').click();
  assert.equal(picked, 1);
  assert.equal(doc.querySelector('.typeb-card.is-open'), null);
  doc.querySelector('[data-tb-edit="tb_0"]').click();
  doc.querySelector('.typeb-card.is-open .btn-remove-tb').click();
  assert.equal(state().typeB.length, 1);
  assert.equal(doc.querySelector('.typeb-card.is-open'), null);
  assert.ok(!doc.body.classList.contains('sheet-open'));
});
