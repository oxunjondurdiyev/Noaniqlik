/* P07b: shablon muharririda qo'shimcha chiqishlar (`outputs` — vektor model, JCGM 102:2011 §6.2):
   sof yordamchilar (src/ui/tpl/outputs.js) — qo'shish, tahrirlash, o'chirish, jadval HTML'i (uch tilda, escape, qulf);
   tekshiruv (src/templates/interpreter.js::checkTemplate) — belgi takrori, formula, noma'lum belgi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const O = require('../../src/ui/tpl/outputs.js');
const T = require('../../src/templates/interpreter.js');
const E = require('../../src/engine/index.js');
const { escHtml } = require('../../src/ui/escape.js');
const { byId, schema } = require('./lib.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const DICT = (() => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  return dom.window.eval(['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js'].map(read).join('\n;\n') + '\n;TRANSLATIONS');
})();
const ctxOf = lang => ({ t: k => { assert.ok(DICT[lang][k] !== undefined, `${lang}.${k}`); return DICT[lang][k]; }, esc: escHtml, lang });
const frag = html => new JSDOM('<!doctype html><body><div id="r">' + html + '</div></body>').window.document.getElementById('r');
const base = () => ({
  schemaVersion: 'uc-template/1', id: 'LAB-MV', version: '0.1.0', status: 'DRAFT', domain: 'TESTING', section: 'general', evaluationMode: 'GUM_BOTTOM_UP',
  title: { uz: 'Vektor', ru: 'Вектор', en: 'Vector' }, standards: [], labCount: null, ref: 'laboratoriya',
  measurand: { symbol: 'R', name: { uz: 'R', ru: 'R', en: 'R' }, unit: 'Ω' }, model: { formula: 'R = V / I * cos(phi)' },
  inputs: ['V', 'I', 'phi'].map(s => ({ symbol: s, name: { uz: s, ru: s, en: s }, unit: '', kind: 'observation' })), typeBSources: [],
});
const errs = tpl => T.checkTemplate(tpl, schema).errors;

test('qo\'shish: band bo\'lmagan belgi (R2, R3 …), formula "belgi = "; bo\'sh formula tekshiruvdan o\'tmaydi; asl obyekt o\'zgarmaydi', () => {
  const t0 = base();
  const t1 = O.addOutput(t0);
  assert.equal(t0.outputs, undefined);
  assert.deepEqual(t1.outputs, [{ symbol: 'R2', unit: '', formula: 'R2 = ' }]);
  assert.ok(errs(t1).some(e => /output 1 \(R2\): formula required/.test(e)));
  const t2 = O.addOutput(t1);
  assert.deepEqual(t2.outputs.map(o => o.symbol), ['R2', 'R3']);
  let t = t0;
  for (let i = 0; i < O.MAX_OUTPUTS + 3; i++) t = O.addOutput(t);
  assert.equal(t.outputs.length, O.MAX_OUTPUTS);                              // sxema chegarasi (maxItems 20)
});

test('tahrirlash: belgi o\'zgarsa formulaning chap tomoni ham; nom — yangi bo\'lsa uch tilga, mavjud bo\'lsa faqat joriy tilga; o\'chirish', () => {
  let t = O.addOutput(base());
  t = O.setOutputField(t, 0, 'formula', '  R2 = V / I * sin(phi) ');
  t = O.setOutputField(t, 0, 'symbol', 'X');
  t = O.setOutputField(t, 0, 'unit', ' Ω ');
  assert.deepEqual(t.outputs[0], { symbol: 'X', unit: 'Ω', formula: 'X = V / I * sin(phi)' });
  t = O.setOutputField(t, 0, 'name', 'Reaktivlik');
  assert.deepEqual(t.outputs[0].name, { uz: 'Reaktivlik', ru: 'Reaktivlik', en: 'Reaktivlik' });
  t = O.setOutputField(t, 0, 'name', 'Реактивное сопротивление', 'ru');
  assert.deepEqual(t.outputs[0].name, { uz: 'Reaktivlik', ru: 'Реактивное сопротивление', en: 'Reaktivlik' });
  assert.deepEqual(errs(t), []);
  assert.equal('name' in O.setOutputField(t, 0, 'name', '  ').outputs[0], false);
  assert.deepEqual(O.setOutputField(t, 5, 'unit', 'x'), t);                   // mavjud bo'lmagan qator — o'zgarishsiz
  assert.deepEqual(O.setOutputField(t, 0, 'evil', 'x'), t);
  const two = O.setOutputField(O.addOutput(t), 1, 'formula', 'R2 = V / I');
  assert.deepEqual(O.removeOutput(two, 0).outputs.map(o => o.symbol), ['R2']);
  assert.equal('outputs' in O.removeOutput(t, 0), false);                     // oxirgisi o'chsa maydon yo'qoladi (sxema: minItems 1)
});

test('tekshiruv: takror belgi, kirish belgisi bilan to\'qnashuv, tahlil qilinmaydigan formula, noma\'lum belgi, chap tomon mos emas', () => {
  const withOut = o => ({ ...base(), outputs: o });
  assert.deepEqual(errs(withOut([{ symbol: 'X', formula: 'X = V / I * sin(phi)' }, { symbol: 'Z', formula: 'Z = V / I' }])), []);
  assert.ok(errs(withOut([{ symbol: 'R', formula: 'R = V / I' }])).some(e => /duplicate output symbol/.test(e)));
  assert.ok(errs(withOut([{ symbol: 'X', formula: 'X = V' }, { symbol: 'X', formula: 'X = I' }])).some(e => /output 2 \(X\): duplicate output symbol/.test(e)));
  assert.ok(errs(withOut([{ symbol: 'V', formula: 'V = I' }])).some(e => /already an input or constant/.test(e)));
  assert.ok(errs(withOut([{ symbol: 'X', formula: 'X = V / (I' }])).some(e => /output 1 \(X\): formula does not parse/.test(e)));
  assert.ok(errs(withOut([{ symbol: 'X', formula: 'X = V * omega' }])).some(e => /formula does not parse \(unknown:omega\)/.test(e)));
  assert.ok(errs(withOut([{ symbol: 'X', formula: 'Y = V / I' }])).some(e => /left-hand side "Y" differs/.test(e)));
  assert.deepEqual(errs(withOut([{ symbol: 'P', unit: 'rad', formula: 'P = atan2(V; I)' }])), []);      // P07b: atan2 shablonda ham
  // mavjud ichki shablonlar (jumladan MV-01) o'zgarishsiz yaroqli
  assert.deepEqual(errs(byId['MV-01']), []);
});

test('muharrirda tuzilgan shablon → vektor hisob (R, X, Z): JCGM 102 §9.4 modeli; APPROVED da `outputs` qulflangan', () => {
  let t = base();
  t = O.setOutputField(O.setOutputField(O.addOutput(t), 0, 'formula', 'R2 = V / I * sin(phi)'), 0, 'symbol', 'X');
  t = O.setOutputField(O.setOutputField(O.addOutput(t), 1, 'formula', 'R2 = V / I'), 1, 'symbol', 'Z');
  assert.deepEqual(errs(t), []);
  const b = T.buildState(t, { lang: 'uz', allowMissing: true });
  assert.deepEqual(b.state.outputs.map(o => o.formula), ['R = V / I * cos(phi)', 'X = V / I * sin(phi)', 'Z = V / I']);
  const st = { ...b.state, measurements: { V: [5.007, 4.994, 5.005, 4.990, 4.999], I: [0.019663, 0.019639, 0.019640, 0.019685, 0.019678], phi: [1.0456, 1.0438, 1.0468, 1.0428, 1.0433] } };
  const r = E.evaluate(st);                                                   // JCGM 100 H.2 (Table H.2) kuzatuvlari
  assert.deepEqual([r.mode, r.symbols], ['MULTIVARIATE', ['R', 'X', 'Z']]);
  assert.ok(Math.abs(r.y[0] - 127.732) < 0.0005 && Math.abs(r.y[2] - 254.260) < 0.0005);   // H.2.4, Table H.3: R = 127,732 Ω; Z = 254,260 Ω
  assert.ok(T.DEFAULT_LOCKED.includes('outputs'));
  const approved = { ...t, status: 'APPROVED' };
  assert.ok(T.lockedSections(approved).includes('outputs'));
  assert.deepEqual(T.applyEdit(approved, { outputs: O.removeOutput(t, 0).outputs }), { error: 'locked', detail: ['outputs'] });
});

test('jadval HTML: uch tilda, qator va maydonlar, escape, inline handler yo\'q; qulflanganda maydonlar va tugmalar o\'chiq', () => {
  const t = { ...base(), outputs: [{ symbol: 'X', unit: 'Ω', formula: 'X = V / I * sin(phi)', name: { uz: 'Reaktivlik', ru: 'Реактивное', en: 'Reactance' } }, { symbol: '<b>', unit: '"', formula: '<img src=x onerror=alert(1)>' }] };
  const seen = new Set();
  for (const lang of ['uz', 'ru', 'en']) {
    const html = O.outputsHTML(t, ctxOf(lang), false);
    const f = frag(html);
    assert.equal(f.querySelectorAll('[data-ed-out-row]').length, 2);
    assert.deepEqual([...f.querySelectorAll('[data-ed-out="0"]')].map(i => [i.dataset.edOutField, i.value]),
      [['symbol', 'X'], ['unit', 'Ω'], ['formula', 'X = V / I * sin(phi)'], ['name', { uz: 'Reaktivlik', ru: 'Реактивное', en: 'Reactance' }[lang]]]);
    assert.equal(f.querySelector('[data-ed-out="1"][data-ed-out-field="formula"]').value, '<img src=x onerror=alert(1)>');
    assert.equal(f.querySelectorAll('img, b, script').length, 0);
    assert.ok(!/\son\w+\s*=\s*["']/i.test(html.replace(/&[a-z]+;/g, '')));
    assert.equal(f.querySelector('[data-ed="add-output"]').disabled, false);
    assert.equal(f.querySelectorAll('[data-ed="del-output"]').length, 2);
    seen.add(f.querySelector('[data-ed="add-output"]').textContent + f.querySelector('[data-ed-outputs]').textContent);
  }
  assert.equal(seen.size, 3);
  const locked = frag(O.outputsHTML(t, ctxOf('uz'), true));
  assert.ok([...locked.querySelectorAll('input, button')].every(e => e.disabled));
  const empty = frag(O.outputsHTML(base(), ctxOf('uz'), false));
  assert.equal(empty.querySelectorAll('table').length, 0);
  assert.equal(empty.querySelector('[data-ed-outputs]').dataset.edOutputs, '0');
});
