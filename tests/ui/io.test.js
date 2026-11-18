/* P05b: import / eksport kontrolleri (src/ui/io/app.js) — jsdom:
   • Excel'dan qo'yish GUM o'lchashlar jadvalini (src/js/table.js) to'ldiradi;
   • fayldan import oynasi: ustunlarni moslash, oldindan ko'rish — fayl matni faqat textContent (HTML bajarilmaydi);
   • mavjud ma'lumot faqat aniq tasdiqdan keyin almashtiriladi; dushman fayl — toza rad;
   • JSON eksport → import: "aynan bir xil hosil bo'ldi"; UCIO.calcDoc() eksport bilan bir xil hujjat. */
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const J = require('../../src/io/calc-json.js');
const M = require('../../src/io/calc-meta.js');
const { roundResult, roundHalfAway, roundUpAway } = require('../../src/report/rounding.js');
const { fmt, fmtSci } = require('../../src/report/format.js');
const F = require('../../src/report/findings.js');
const { loadXlsx } = require('../../src/io/vendor.js');
const { canonicalizeJcs, portable } = require('../../src/storage/canonical.js');
const GAS = require('../cases/excel/excel-gas-p1.json');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-linter.js', 'src/js/i18n-io.js'];
const canon = v => canonicalizeJcs(portable(v));

let w, doc, toasts, downloads;
const $ = sel => doc.querySelector(sel);
const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true, cancelable: true }));
function paste(el, text) {
  const ev = new w.Event('paste', { bubbles: true, cancelable: true });
  ev.clipboardData = { getData: () => text };
  el.dispatchEvent(ev);
  return ev;
}
const cell = (param, idx) => $(`.meas-input[data-param="${param}"][data-idx="${idx}"]`);
const enc = s => new TextEncoder().encode(s);
const tick = () => new Promise(r => setTimeout(r, 0));

before(async () => {
  const dom = new JSDOM(`<!doctype html><body>
    <select id="sidebar-preset"></select><select id="inp-preset"></select>
    <button id="btn-fill-sample"></button><button id="btn-clear-data"></button><button id="btn-calc-typea"></button>
    <button id="btn-import-table" data-io-act="import-table" data-io-target="gum"></button>
    <div id="model-box"></div><div id="table-hint-box"></div>
    <table><thead id="table-head"></thead><tbody id="table-body"></tbody><tfoot id="table-foot"></tfoot></table>
    <div id="type-a-summary"></div></body>`, { url: 'https://example.test/', runScripts: 'outside-only' });
  w = dom.window; doc = w.document; toasts = []; downloads = [];
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N_FILES.map(read).join('\n;\n'));
  w.i18n.lang = 'uz';
  w.eval(read('src/js/state.js'));
  w.Calc = { ...E, roundResult, roundHalfAway, roundUpAway, fmt, fmtSci, findingText: F.findingText, newMeta: M.newMeta, metaFor: M.metaFor };
  w.showToast = (m, type) => toasts.push({ m, type });
  w.switchTab = () => {};
  w.eval(read('src/js/table.js'));
  w.Blob = function (parts, o) { this.parts = parts; this.type = o && o.type; };
  w.URL.createObjectURL = b => { downloads.push(b); return 'blob:test'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { downloads[downloads.length - 1].name = this.download; };
  global.window = w; global.document = doc;
  w.appState.set({ n: 3, params: ['m', 'V'], measurements: { m: ['', '', ''], V: ['', '', ''] }, model: { formula: 'm / V', unit: '' }, settings: { paired: true, P: 0.9545, modelKind: 'value' } });
  w.Table.init();
  await import(pathToFileURL(path.join(ROOT, 'src/ui/io/app.js')).href);
});

test('UCIO mavjud; chegaralar; inline handler yo\'q', () => {
  assert.ok(w.UCIO);
  for (const k of ['registerTarget', 'openImport', 'importTableData', 'exportCalc', 'calcDoc', 'openCalcFile', 'importCalcText']) assert.equal(typeof w.UCIO[k], 'function', k);
  assert.equal(w.UCIO.LIMITS.maxBytes, 5 * 1024 * 1024);
  assert.ok(Object.isFrozen(w.UCIO));
});

test('Excel\'dan qo\'yish: tab bilan ajratilgan blok GUM jadvalini to\'ldiradi (o\'nlik vergul, qatorlar soni kengayadi)', () => {
  assert.equal(doc.querySelectorAll('.meas-input').length, 6);
  const ev = paste(cell('m', 0), '99,8312\t100,02\r\n99,8741\t100,06\r\n99,8103\t99,98\r\n99,8655\t100,04\r\n99,8236\t100\r\n');
  assert.equal(ev.defaultPrevented, true);
  const st = w.appState.get();
  assert.equal(st.n, 5);
  assert.deepEqual([...st.measurements.m], [99.8312, 99.8741, 99.8103, 99.8655, 99.8236]);
  assert.deepEqual([...st.measurements.V], [100.02, 100.06, 99.98, 100.04, 100]);
  assert.equal(st.combined, null);
  assert.equal(cell('V', 4).value, '100');                       // jadval qayta chizilgan
  assert.equal(doc.querySelectorAll('.meas-input').length, 10);
  assert.match(toasts[toasts.length - 1].m, /5/);
});

test('qo\'yish: bitta katak — odatiy xatti-harakat; ikkinchi ustundan boshlab; sarlavha nomi bo\'yicha; formula / HTML — bo\'sh', () => {
  assert.equal(paste(cell('m', 0), '1,5').defaultPrevented, false);
  assert.equal(w.appState.get().measurements.m[0], 99.8312);
  paste(cell('V', 1), '7,5\n8,5');
  assert.deepEqual(w.appState.get().measurements.V.slice(0, 4), [100.02, 7.5, 8.5, 100.04]);
  assert.equal(w.appState.get().measurements.m[1], 99.8741);
  paste(cell('m', 0), 'V\tm\n1\t2\n3\t4');                       // sarlavha: V birinchi, m ikkinchi
  assert.deepEqual([w.appState.get().measurements.m[0], w.appState.get().measurements.V[0], w.appState.get().measurements.m[1], w.appState.get().measurements.V[1]], [2, 1, 4, 3]);
  const before = toasts.length;
  paste(cell('m', 0), '=1+1\t7\n5\t<img src=x onerror=alert(1)>');
  const st = w.appState.get();
  assert.deepEqual([st.measurements.m[0], st.measurements.V[0], st.measurements.m[1], st.measurements.V[1]], ['', 7, 5, '']);
  assert.equal(doc.querySelectorAll('#table-body img, #table-body script').length, 0);
  assert.match(toasts[before].m, /2/);                           // 2 ta son bo'lmagan katak
  // hech qanday son yo'q — holat o'zgarmaydi
  paste(cell('m', 0), '=cmd|x\t@SUM(1)\nabc\tdef');
  assert.deepEqual([w.appState.get().measurements.m[0], w.appState.get().measurements.m[1]], ['', 5]);
  assert.equal(toasts[toasts.length - 1].type, 'error');
  // faqat matnli birinchi qator — sarlavha deb tashlanadi
  paste(cell('m', 0), '=1+1\t<b>x</b>\n8\t9');
  assert.deepEqual([w.appState.get().measurements.m[0], w.appState.get().measurements.V[0]], [8, 9]);
});

test('fayldan import (CSV): oyna — sarlavha bo\'yicha moslash, oldindan ko\'rishda HTML matn sifatida; tasdiqsiz almashtirilmaydi', async () => {
  const evil = '<img src=x onerror=alert(1)>';
  const csv = `V;m;izoh\n100,02;99,8312;${evil}\n100,06;99,8741;<script>alert(2)</script>\n=1+1;99,8103;x\n`;
  const r = await w.UCIO.importTableData('gum', { name: '<b>data</b>.csv', data: enc(csv) });
  assert.deepEqual(r, { ok: true });
  const modal = $('[data-io-modal]');
  assert.ok(modal);
  assert.equal(modal.querySelectorAll('img, script, b, [onerror], [onclick]').length, 0);       // hech narsa element bo'lmagan
  assert.ok(modal.textContent.includes(evil) && modal.textContent.includes('<script>alert(2)</script>') && modal.textContent.includes('<b>data</b>.csv'));
  assert.equal($('[data-io-header]').checked, true);
  assert.deepEqual([...modal.querySelectorAll('[data-io-map]')].map(s => s.value), ['1', '0']);  // m ← B ustuni, V ← A ustuni
  assert.equal($('[data-io-delimiter]').value, ';');
  assert.match($('[data-io-status]').textContent, /3/);
  // jadvalda ma'lumot bor → tasdiq belgisi qo'yilmaguncha tugma o'chiq
  const ok = $('[data-io-confirm]');
  assert.ok($('[data-io-replace]'));
  assert.equal(ok.disabled, true);
  const snapshot = JSON.stringify(w.appState.get().measurements);
  fire(ok, 'click');
  assert.equal(JSON.stringify(w.appState.get().measurements), snapshot);
  $('[data-io-replace]').checked = true; fire($('[data-io-replace]'), 'change');
  assert.equal(ok.disabled, false);
  fire(ok, 'click');
  assert.equal($('[data-io-modal]'), null);
  const st = w.appState.get();
  assert.equal(st.n, 3);
  assert.deepEqual([...st.measurements.m], [99.8312, 99.8741, 99.8103]);
  assert.deepEqual([...st.measurements.V], [100.02, 100.06, '']);       // "=1+1" — bo'sh
  assert.equal(doc.querySelectorAll('img, script[src]').length, 0);
});

test('fayldan import (XLSX): varaq tanlash, "sarlavha" belgisi, "import qilinmaydi"; SheetJS faqat shu paytda yuklanadi', async () => {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['bosh varaq']]), 'Yoriqnoma');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[1.5, 10.5, 'a'], [2.5, 20.5, 'b'], [3.5, 30.5, 'c'], [0.1 + 0.2, 40.5, 'd']]), '<img src=x>');
  const bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  assert.deepEqual(await w.UCIO.importTableData('gum', { name: 'lab.xlsx', data: bytes }), { ok: true });
  const sheet = $('[data-io-sheet]');
  assert.deepEqual([...sheet.options].map(o => o.textContent), ['Yoriqnoma', '<img src=x>']);
  assert.equal($('[data-io-modal]').querySelectorAll('img').length, 0);
  assert.equal($('[data-io-confirm]').disabled, true);                  // 1-varaqda son yo'q
  sheet.value = '1'; fire(sheet, 'change');
  assert.equal($('[data-io-header]').checked, false);
  const maps = [...doc.querySelectorAll('[data-io-map]')];
  assert.deepEqual(maps.map(s => s.value), ['0', '1']);                 // sarlavha yo'q — ketma-ket
  maps[1].value = '-1'; fire(maps[1], 'change');                        // V import qilinmaydi → mavjud qiymatlar qoladi
  $('[data-io-replace]').checked = true; fire($('[data-io-replace]'), 'change');
  fire($('[data-io-confirm]'), 'click');
  const st = w.appState.get();
  assert.equal(st.n, 4);
  assert.deepEqual([...st.measurements.m], [1.5, 2.5, 3.5, 0.30000000000000004]);
  assert.deepEqual([...st.measurements.V], [100.02, 100.06, '', '']);
});

test('dushman fayl: hajm / tur / buzilgan fayl — oyna ochilmaydi, i18n xabari, holat o\'zgarmaydi', async () => {
  const snapshot = JSON.stringify(w.appState.get());
  const cases = [
    [{ name: 'big.xlsx', size: w.UCIO.LIMITS.maxBytes + 1, data: new Uint8Array(8) }, 'too_large'],
    [{ name: 'a.exe', data: enc('MZ') }, 'unsupported_type'],
    [{ name: 'a.xlsx', data: enc('this is not a zip') }, 'not_xlsx'],
    [{ name: 'a.csv', data: enc(Array.from({ length: 10001 }, (_, i) => i + ';1').join('\n')) }, 'too_many_rows'],
    [{ name: 'a.csv', data: enc(Array.from({ length: 201 }, (_, i) => i).join(';')) }, 'too_many_cols'],
  ];
  for (const [file, reason] of cases) {
    const n = toasts.length;
    const r = await w.UCIO.importTableData('gum', file);
    assert.equal(r.ok, false); assert.equal(r.reason, reason, file.name);
    assert.equal($('[data-io-modal]'), null, file.name);
    assert.equal(toasts.length, n + 1);
    assert.equal(toasts[n].type, 'error');
    assert.ok(toasts[n].m && !toasts[n].m.startsWith('io_err_') && !/\{[a-z]+\}/.test(toasts[n].m), toasts[n].m);
  }
  assert.equal(JSON.stringify(w.appState.get()), snapshot);
});

test('JSON eksport → import: natija aynan bir xil hosil bo\'ladi; calcDoc() eksport bilan bir xil hujjat; muharrirga yuklash tasdiq bilan', async () => {
  const state = JSON.parse(JSON.stringify(GAS.modelSpec.state));
  state.typeB.forEach((c, i) => { c.id = 'tb_' + i; });                 // muharrirdagi kabi: har bir manbada id
  w.appState.set({ n: 3, ...state, units: {}, template: null, points: [], currentPoint: null, acceptances: {}, combined: null });
  assert.equal(await w.UCIO.calcDoc('gum'), null);                      // natija yo'q
  assert.deepEqual(await w.UCIO.exportCalc('gum', 'json'), { ok: false, reason: 'need_result' });
  const result = E.evaluate(w.appState.get());
  const meta = M.newMeta('2026-11-18T10:00:00.000Z');
  w.appState.set({ combined: result, calcMeta: meta });
  downloads.length = 0;
  const ex = await w.UCIO.exportCalc('gum', 'json');
  assert.equal(ex.ok, true);
  assert.equal(ex.name, `uncertaintycalc-${meta.id}.json`);
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].name, ex.name);
  assert.equal(downloads[0].type, 'application/json');
  const text = downloads[0].parts[0];
  const doc1 = JSON.parse(text);
  assert.equal(doc1.id, meta.id); assert.equal(doc1.createdAt, meta.createdAt);
  assert.equal(doc1.engineVersion, E.ENGINE_VERSION); assert.equal(doc1.mode, 'GUM');
  assert.equal(canon(J.parseCalcDoc ? (await J.parseCalcDoc(text)).result : null), canon(result));
  assert.ok(!/"(theme|lang|firstName|phone|email|inn)"/.test(text), 'shaxsiy / UI maydonlari yo\'q');
  // calcDoc — yon ta'sirsiz, aynan shu hujjat (xesh bir xil)
  const n = toasts.length;
  const d2 = await w.UCIO.calcDoc('gum');
  assert.equal(d2.hash, doc1.hash);
  assert.equal(toasts.length, n); assert.equal(downloads.length, 1);
  assert.equal(await w.UCIO.calcDoc('nosuch'), null);
  assert.equal(await w.UCIO.calcDoc('regression'), null);

  // muharrirni o'zgartiramiz, so'ng faylni ochamiz
  w.appState.set({ params: ['q'], measurements: { q: [1, 2, 3] }, typeB: [], model: { formula: '', unit: '' }, combined: null, calcMeta: null });
  const r = await w.UCIO.importCalcText(text);
  assert.deepEqual(r, { ok: true, identical: true, sameEngine: true });
  assert.equal($('[data-io-reproduced]').dataset.ioReproduced, 'identical');
  assert.equal($('[data-io-engine-differs]'), null);
  assert.ok($('[data-io-modal]').textContent.includes(doc1.hash));
  const ok = $('[data-io-confirm]');
  assert.equal(ok.disabled, true);                                      // muharrirda ma'lumot bor — tasdiq kerak
  $('[data-io-replace]').checked = true; fire($('[data-io-replace]'), 'change');
  fire(ok, 'click');
  const st = w.appState.get();
  assert.deepEqual(st.params, state.params);
  assert.equal(canon(st.combined), canon(result));
  assert.deepEqual(st.calcMeta, meta);
  assert.equal(canon(E.evaluate(st)), canon(result));                   // yuklangan holatdan qayta hisob — aynan shu natija
  assert.equal((await w.UCIO.calcDoc('gum')).hash, doc1.hash);          // qayta eksport — xesh o'zgarmaydi
});

test('JSON import: o\'zgartirilgan fayl (xesh), noto\'g\'ri format, __proto__ — rad; boshqa dvigatel versiyasi — ogohlantirish; farq — ko\'rsatiladi', async () => {
  const good = await w.UCIO.calcDoc('gum');
  const snapshot = JSON.stringify(w.appState.get());
  const tampered = JSON.parse(JSON.stringify(good)); tampered.result.U = 0.001;
  const cases = [[JSON.stringify(tampered), 'hash'], ['{not json', 'bad_json'], ['{"format":"x"}', 'bad_format'],
    [JSON.stringify(good).replace('"input":{', '"input":{"__proto__":{"polluted":1},'), 'forbidden_key']];
  for (const [text, reason] of cases) {
    w.UCIO.closeDialog();
    const n = toasts.length;
    assert.deepEqual(await w.UCIO.importCalcText(text), { ok: false, reason });
    assert.equal($('[data-io-modal]'), null);
    assert.equal(toasts[n].type, 'error');
    assert.ok(!toasts[n].m.startsWith('io_json_err_'));
  }
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal(JSON.stringify(w.appState.get()), snapshot);
  // boshqa dvigatel versiyasi va boshqa natija, lekin xesh to'g'ri (eski versiyada yaratilgan fayl)
  const old = await J.buildCalcDoc({ id: good.id, createdAt: good.createdAt, input: J.parseCalcDoc ? (await J.parseCalcDoc(JSON.stringify(good))).input : null,
    result: { ...(await J.parseCalcDoc(JSON.stringify(good))).result, engineVersion: '1.0.0', U: 0.5 } });
  const r = await w.UCIO.importCalcText(J.serializeCalcDoc(old));
  assert.deepEqual(r, { ok: true, identical: false, sameEngine: false });
  assert.equal($('[data-io-reproduced]').dataset.ioReproduced, 'differs');
  assert.ok($('[data-io-engine-differs]'));
  w.UCIO.closeDialog();
  assert.equal($('[data-io-modal]'), null);
});

test('XLSX va CSV eksport (UI): fayl nomi shaxsiy ma\'lumotsiz; XLSX qayta o\'qiladi; CSV — BOM va til bo\'yicha ajratuvchi', async () => {
  downloads.length = 0;
  const x = await w.UCIO.exportCalc('gum', 'xlsx');
  assert.equal(x.ok, true);
  assert.match(x.name, /^uncertaintycalc-calc-[a-z0-9-]+\.xlsx$/);
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(downloads[0].parts[0]));
  assert.deepEqual(wb.worksheets.map(s => s.name), ['Natija', 'Kirish', 'Topilmalar', "Ma'lumot"]);
  const r = w.appState.get('combined');
  const vals = [];
  wb.worksheets[0].eachRow(row => row.eachCell(c => vals.push(c.value)));
  for (const v of [r.uc, r.U, r.k]) assert.ok(vals.includes(v), String(v));
  const info = [];
  wb.worksheets[3].eachRow(row => row.eachCell(c => info.push(c.value)));
  assert.ok(info.includes(x.doc.hash) && info.includes(E.ENGINE_VERSION) && info.includes(x.doc.id));
  const c = await w.UCIO.exportCalc('gum', 'csv');
  assert.equal(c.ok, true);
  const csv = downloads[1].parts[0];
  assert.ok(csv.startsWith('﻿') && csv.includes(';') && csv.includes(String(r.U).replace('.', ',')));
  w.i18n.lang = 'en';
  await w.UCIO.exportCalc('gum', 'csv');
  assert.ok(downloads[2].parts[0].includes(String(r.U)) && downloads[2].parts[0].includes('Uncertainty budget'));
  w.i18n.lang = 'uz';
});
