/* P05b: XLSX / CSV eksport (src/io/export-table.js, xlsx-write.js, csv.js) va GUM holati ↔ hujjat (calc-state.js).
   XLSX mustaqil o'quvchi (exceljs) bilan qayta o'qiladi: qiymatlar dvigatel natijasiga TO'LIQ double aniqlikda teng;
   formula kataklari yo'q; '=' bilan boshlangan matn — matn katagi. */
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const E = require('../../src/engine/index.js');
const X = require('../../src/io/export-table.js');
const W = require('../../src/io/xlsx-write.js');
const C = require('../../src/io/csv.js');
const S = require('../../src/io/calc-state.js');
const J = require('../../src/io/calc-json.js');
const T = require('../../src/io/table-text.js');
const I = require('../../src/io/import.js');
const { canonicalizeJcs, portable } = require('../../src/storage/canonical.js');
const { roundResult } = require('../../src/report/rounding.js');
const { loadXlsx } = require('../../src/io/vendor.js');

const ROOT = path.join(__dirname, '..', '..');
const CASES = fs.readdirSync(path.join(ROOT, 'tests/cases/excel')).filter(f => /^excel-(gas-p[123]|term-p[1-5]|density)\.json$/.test(f)).sort()
  .map(f => require(path.join(ROOT, 'tests/cases/excel', f)));
let XLSX;
before(async () => { XLSX = await loadXlsx(); });

async function readBack(bytes) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(bytes));
  return wb;
}
const expectCell = v => (typeof v === 'number' ? (Number.isFinite(v) ? v : '∞') : v);
function noFormulas(wb) {
  let n = 0;
  wb.eachSheet(ws => ws.eachRow(row => row.eachCell(cell => {
    n++;
    assert.ok(cell.formula === undefined && cell.type !== ExcelJS.ValueType.Formula && cell.type !== ExcelJS.ValueType.SharedString + 100, `${ws.name}!${cell.address}: formula`);
    assert.ok(['number', 'string'].includes(typeof cell.value), `${ws.name}!${cell.address}: ${typeof cell.value}`);
  })));
  return n;
}

test('9 ta etalon nuqta: XLSX eksport → exceljs bilan qayta o\'qish — y, u_c, ν_eff, k, U va har bir byudjet qatori to\'liq aniqlikda', async () => {
  assert.equal(CASES.length, 9);
  for (const c of CASES) {
    const r = E.evaluate(c.modelSpec);
    assert.equal(r.error, undefined, c.id);
    const model = X.buildExportModel({ mode: 'GUM', result: r, input: c.modelSpec, meta: { id: 'calc-' + c.id, createdAt: '2026-11-18T00:00:00.000Z', engineVersion: r.engineVersion, hash: 'h' }, round: roundResult });
    assert.deepEqual(model.sheets.map(s => s.key), ['point1', 'inputs', 'findings', 'info']);
    const wb = await readBack(W.writeXlsx(XLSX, model));
    assert.deepEqual(wb.worksheets.map(w => w.name), model.sheets.map(s => s.name));
    const ws = wb.worksheets[0], refs = model.sheets[0].refs;
    for (const [key, v] of [['y', r.y], ['uc', r.uc], ['nuEff', r.nuEff], ['k', r.k], ['U', r.U], ['P', r.P]]) {
      assert.ok(Object.is(ws.getCell(refs[key]).value, expectCell(v)), `${c.id} ${key}: ${ws.getCell(refs[key]).value} ≠ ${v}`);
    }
    assert.equal(refs.budget.count, r.budget.length);
    assert.ok(r.budget.length >= 3, c.id);
    r.budget.forEach((b, i) => {
      const row = refs.budget.first + i;
      assert.equal(ws.getCell(refs.budget.cols.name + row).value, b.name, c.id);
      for (const f of ['u', 'c', 'ui', 'contrib', 'nu', 'share']) {
        const got = ws.getCell(refs.budget.cols[f] + row).value;
        const want = b[f] === undefined ? null : expectCell(b[f]);
        assert.ok(got === want || Object.is(got, want) || (want === 0 && got === 0), `${c.id} budget[${i}].${f}: ${got} ≠ ${want}`);
      }
    });
    // kuzatuvlar (kirish varag'i emas — nuqta varag'ida) va "hisobotdagi ko'rinish" (yaxlitlangan MATN) alohida katakda
    assert.equal(typeof ws.getCell(refs.reported).value, 'string');
    assert.ok(ws.getCell(refs.reported).value.startsWith(roundResult(r.y, r.U, r.roundUp).resultText));
    assert.ok(refs.observations.count >= 1);
    assert.ok(noFormulas(wb) > 40);
    // ma'lumot varag'i: dastur, dvigatel versiyasi, hisob id, sana, xesh
    const info = wb.getWorksheet(model.sheets[3].name);
    const vals = [];
    info.eachRow(row => row.eachCell(cell => vals.push(cell.value)));
    for (const s of ['UncertaintyCalc', E.ENGINE_VERSION, 'calc-' + c.id, '2026-11-18T00:00:00.000Z', 'h', 'GUM']) assert.ok(vals.includes(s), `${c.id}: ${s}`);
  }
});

test('XLSX: "=" / "+" / "-" / "@" bilan boshlangan foydalanuvchi matni — MATN katagi (formula emas); faylda <f> elementi yo\'q', async () => {
  const st = JSON.parse(JSON.stringify(CASES.find(c => c.id === 'excel-gas-p1').modelSpec.state));
  const evil = ['=HYPERLINK("http://example.test","click")', "=cmd|' /C calc'!A0", '+1+1', '-2+3', '@SUM(A1:A9)', '=1+1'];
  st.typeB.forEach((c, i) => { c.name = evil[i % evil.length]; });
  st.model.unit = '=A1';
  const r = E.evaluate(st);
  assert.equal(r.error, undefined);
  const model = X.buildExportModel({ mode: 'GUM', result: r, input: st, meta: { id: '=evil()', createdAt: '@now', template: { id: '=T()', version: '+1', status: '-x' } } });
  const bytes = W.writeXlsx(XLSX, model);
  const wb = await readBack(bytes);
  const ws = wb.worksheets[0], refs = model.sheets[0].refs;
  const names = r.budget.map((b, i) => ws.getCell(refs.budget.cols.name + (refs.budget.first + i)));
  assert.ok(names.some(c => c.value === '=1+1' || String(c.value).startsWith('=')));
  for (const c of names) { assert.equal(typeof c.value, 'string'); assert.equal(c.type, ExcelJS.ValueType.String); assert.equal(c.formula, undefined); }
  noFormulas(wb);
  // xom XML: hech bir varaqda formula elementi yo'q
  const zip = await JSZip.loadAsync(bytes);
  let sheets = 0;
  for (const f of Object.keys(zip.files).filter(n => /^xl\/worksheets\/.+\.xml$/.test(n))) {
    const xml = await zip.file(f).async('string');
    sheets++;
    assert.ok(!/<f[\s>/]/.test(xml), f + ': <f> elementi');
  }
  assert.equal(sheets, model.sheets.length);
  // yozuvchi darajasida ham: katak obyektida `f` yo'q, satr — t: 's'
  const sheet = W.buildSheet([['=1+1', 1.5, null, '∞', true]]);
  assert.deepEqual(sheet.A1, { t: 's', v: '=1+1' });
  assert.deepEqual(sheet.B1, { t: 'n', v: 1.5 });
  assert.equal(sheet.C1, undefined);
  assert.ok(Object.values(sheet).every(c => !c || c.f === undefined));
  // o'zimizning import bilan qayta o'qilganda ham matn (son emas)
  const back = (await I.openTableFile({ name: 'e.xlsx' }, bytes, loadXlsx)).sheet(0);
  assert.ok(back.rows.flat().filter(v => typeof v === 'string' && /^[=+@]/.test(v)).every(v => Number.isNaN(T.parseNumber(v))));
});

test('ko\'p nuqtali eksport: avval Xulosa, keyin har bir nuqta varag\'i; yagona k (U, k) chaqiruvchi bergan qiymatdan — bu yerda hisoblanmaydi', async () => {
  const gas = CASES.filter(c => /gas-p[123]$/.test(c.id));
  const results = gas.map(c => E.evaluate(c.modelSpec));
  const cov = E.multiPointCoverage(results, true);
  const points = gas.map((c, i) => ({ label: c.title, input: c.modelSpec, result: results[i], k: cov[i].k, U: cov[i].U }));
  const model = X.buildExportModel({ mode: 'GUM', result: results[0], input: gas[0].modelSpec, points, round: roundResult });
  assert.deepEqual(model.sheets.map(s => s.key), ['summary', 'point1', 'point2', 'point3', 'inputs', 'findings', 'info']);
  assert.equal(new Set(model.sheets.map(s => s.name.toLowerCase())).size, model.sheets.length);
  const wb = await readBack(W.writeXlsx(XLSX, model));
  const sum = wb.worksheets[0], sr = model.sheets[0].refs;
  results.forEach((r, i) => {
    const row = sr.first + i;
    assert.ok(Object.is(sum.getCell(sr.cols.y + row).value, r.y) || (r.y === 0 && sum.getCell(sr.cols.y + row).value === 0));
    assert.equal(sum.getCell(sr.cols.U + row).value, cov[i].U);
    assert.equal(sum.getCell(sr.cols.k + row).value, cov[i].k);
    assert.equal(sum.getCell(sr.cols.uc + row).value, r.uc);
    const ws = wb.worksheets[1 + i], refs = model.sheets[1 + i].refs;
    assert.equal(ws.getCell(refs.U).value, cov[i].U);
    assert.equal(ws.getCell(refs.uc).value, r.uc);
  });
  // topilmalar varag'i: har bir nuqtaning topilmalari
  const total = results.reduce((a, r) => a + r.findings.length, 0);
  assert.equal(model.sheets.find(s => s.key === 'findings').rows.length, 2 + Math.max(1, total));
});

test('boshqa rejimlar (regressiya, top-down, namuna olish, sifatli test): umumiy eksport — skalyarlar va jadvallar to\'liq aniqlikda', async () => {
  const pick = (dir, re) => require(path.join(ROOT, 'tests/cases', dir, fs.readdirSync(path.join(ROOT, 'tests/cases', dir)).filter(f => re.test(f)).sort()[0]));
  for (const c of [pick('regression', /\.json$/), pick('nordtest', /\.json$/), pick('ufs', /\.json$/), pick('aqa', /\.json$/)]) {
    const r = E.evaluate(c.modelSpec);
    assert.equal(r.error, undefined, c.id);
    const model = X.buildExportModel({ mode: J.modeOfResult(r), result: r, input: c.modelSpec });
    assert.deepEqual(model.sheets.map(s => s.key), ['result', 'findings', 'info']);
    const wb = await readBack(W.writeXlsx(XLSX, model));
    const ws = wb.worksheets[0], refs = model.sheets[0].refs;
    let checked = 0;
    for (const key of Object.keys(r)) {
      if (typeof r[key] === 'number' && Number.isFinite(r[key])) { assert.equal(ws.getCell(refs[key]).value, r[key], `${c.id}.${key}`); checked++; }
    }
    assert.ok(checked >= 3, `${c.id}: ${checked}`);
    if (Array.isArray(r.budget)) r.budget.forEach((b, i) => assert.equal(ws.getCell(refs.budget.cols.u + (refs.budget.first + i)).value, b.u, c.id));
    if (Array.isArray(r.params)) r.params.forEach((p, i) => { assert.equal(ws.getCell(refs.params.cols.value + (refs.params.first + i)).value, p.value); assert.equal(ws.getCell(refs.params.cols.u + (refs.params.first + i)).value, p.u); });
    noFormulas(wb);
  }
});

test('CSV eksport: byudjet va natija satrlari; formula-inyeksiya zararsiz; sonlar qayta o\'qilganda aynan teng', () => {
  const c = CASES.find(x => x.id === 'excel-term-p1');
  const st = JSON.parse(JSON.stringify(c.modelSpec.state));
  st.typeB[0].name = '=HYPERLINK("http://example.test","x")';
  const r = E.evaluate(st);
  const model = X.buildExportModel({ mode: 'GUM', result: r, input: st, meta: { id: 'calc-x' }, round: roundResult });
  for (const lang of ['uz', 'en']) {
    const csv = C.toCsv(X.flattenModel(model), C.csvDialect(lang));
    assert.ok(csv.startsWith('﻿'));
    assert.ok(csv.includes("'=HYPERLINK("), 'apostrof bilan zararsizlantirilgan');
    const back = C.parseCsv(csv);
    assert.equal(back.ok, true);
    assert.ok(back.rows.every(row => row.every(cell => !/^[=@]/.test(cell))), 'formula bilan boshlanadigan katak qolmagan');
    const find = label => back.rows.find(row => row[0] === label);
    assert.equal(T.parseNumber(find('y')[1]), r.y);
    assert.equal(T.parseNumber(find('u_c(y)')[1]), r.uc);
    assert.equal(T.parseNumber(find('U')[1]), r.U);
    assert.equal(T.parseNumber(find('k')[1]), r.k);
    const b0 = back.rows.findIndex(row => row[0] === 'io_x_budget') + 2;
    r.budget.forEach((b, i) => { assert.equal(T.parseNumber(back.rows[b0 + i][5]), b.u); assert.equal(T.parseNumber(back.rows[b0 + i][7]), b.ui); });
  }
});

test('sheetName / cell: Excel qoidalari; chekli bo\'lmagan son — matn', () => {
  const used = new Set();
  assert.equal(X.sheetName('Nuqta 1: [a]/b\\c?*', used), 'Nuqta 1 a b c');
  assert.equal(X.sheetName('Nuqta 1: [a]/b\\c?*', used), 'Nuqta 1 a b c (2)');
  assert.equal(X.sheetName('x'.repeat(50), used).length, 31);
  assert.equal(X.sheetName("'", used), 'Sheet');
  assert.equal(X.cell(Infinity), '∞'); assert.equal(X.cell(NaN), null); assert.equal(X.cell(undefined), null); assert.equal(X.cell(0.1), 0.1);
  assert.equal(X.colName(0), 'A'); assert.equal(X.colName(25), 'Z'); assert.equal(X.colName(26), 'AA'); assert.equal(X.colName(16383), 'XFD');
});

/* ── GUM holati ↔ uc-calc/1 ── */
const canon = v => canonicalizeJcs(portable(v));
test('gumDocParts → hujjat → parse → reproduce: 9 ta etalon nuqtada bit darajasida; gumStateFromInput tiklagan holat ham shu natijani beradi', async () => {
  for (const c of CASES) {
    const st = { n: 10, ...JSON.parse(JSON.stringify(c.modelSpec.state)), combined: null, theme: 'dark', lang: 'uz', typeA: {}, points: [] };
    st.typeB.forEach((b, i) => { b.id = 'tb_' + i; });                   // muharrirdagi kabi: har bir manbada id (dvigatel uni o'qimaydi)
    const parts = S.gumDocParts(st, E.evaluate);
    assert.equal(parts.result.error, undefined, c.id);
    assert.equal(canon(parts.result), canon(E.evaluate(c.modelSpec)), c.id);
    assert.deepEqual(Object.keys(parts.input).filter(k => !S.GUM_KEYS.includes(k)), []);        // theme / lang / combined eksportga kirmaydi
    const doc = await J.buildCalcDoc({ id: 'calc-t', createdAt: '2026-11-18T00:00:00.000Z', input: parts.input, result: parts.result, points: parts.points });
    const parsed = await J.parseCalcDoc(J.serializeCalcDoc(doc));
    assert.equal(parsed.ok, true, c.id);
    assert.deepEqual(J.reproduce(parsed, E.evaluate, E.ENGINE_VERSION), { identical: true, main: true, points: [], sameEngine: true });
    const g = S.gumStateFromInput(parsed.input);
    assert.equal(g.ok, true, c.id);
    assert.equal(canon(E.evaluate(S.gumInput(g.state))), canon(parts.result), c.id + ': muharrirga yuklangan holat');
    // yuklangan holatdan qayta eksport — aynan shu kirish (xesh o'zgarmaydi)
    assert.equal(canon(S.gumInput(g.state)), canon(parts.input), c.id + ': qayta eksport');
  }
});

test('gumDocParts: saqlangan nuqtalar `points` ga; shablon holati uchun evaluateState qaytargan holat eksport qilinadi', () => {
  const gas = CASES.filter(c => /gas-p[123]$/.test(c.id)).map(c => JSON.parse(JSON.stringify(c.modelSpec.state)));
  const st = { ...gas[0], points: gas.map((s, i) => ({ id: 'pt' + i, label: 'P' + (i + 1), snapshot: s, result: { stale: true }, acceptances: { a: { comment: 'x' } } })).concat([{ id: 'bad', label: 'bad', snapshot: { params: ['q'], measurements: {} } }]) };
  const parts = S.gumDocParts(st, E.evaluate);
  assert.equal(parts.points.length, 3); assert.equal(parts.skipped, 1);
  parts.points.forEach((p, i) => { assert.equal(canon(p.result), canon(E.evaluate(gas[i]))); assert.equal(canon(E.evaluate(p.input)), canon(p.result)); assert.deepEqual(p.acceptances, { a: { comment: 'x' } }); });
  // shablon: interpreter qaytargan holat (masalan, qo'shilgan kovariatsiya) eksport qilinadi va natija shundan hisoblanadi
  const tplState = { ...gas[0], template: { id: 'T-X', version: '1.0.0', status: 'DRAFT' } };
  const evaluateState = s => { const state = { ...s, settings: { ...s.settings, kMethod: 'k2' } }; return { state, result: E.evaluate(state) }; };
  const p2 = S.gumDocParts(tplState, E.evaluate, evaluateState);
  assert.equal(p2.input.settings.kMethod, 'k2');
  assert.equal(p2.result.k, 2);
  assert.equal(canon(E.evaluate(p2.input)), canon(p2.result));
});

test('gumStateFromInput: faqat tekshirilgan holat; uc-model/1 — muharrirga yuklanmaydi; noto\'g\'ri tuzilma rad etiladi', () => {
  assert.deepEqual(S.gumStateFromInput({ format: 'uc-model/1', inputs: [], outputs: [] }), { ok: false, reason: 'not_editable' });
  for (const bad of [null, [], 'x', {}, { params: [] }, { params: 'x' }, { params: [1] }, { params: ['a', 'a'] }, { params: ['__proto__'] }, { params: ['constructor'] },
    { params: ['a'], measurements: [] }, { params: ['a'], measurements: { a: [{}] } }, { params: ['a'], typeB: 'x' }, { params: ['a'], typeB: [1] }, { params: ['a'], settings: [] },
    { params: ['a'], n: 1e9, measurements: { a: [1] } }, { params: ['a'], n: 0 }, { params: ['a'], directions: [1] }, { params: ['a'], model: { formula: 1 } }, { params: ['a'], measurements: { a: Array(10001).fill(1) } }]) {
    assert.equal(S.gumStateFromInput(bad).ok, false, JSON.stringify(bad).slice(0, 60));
  }
  const g = S.gumStateFromInput({ format: 'calc-state/v2', state: { params: ['a'], measurements: { a: [1, '2,5', null] }, directions: ['↑', 'x'], evil: '<script>', theme: 'x' } });
  assert.equal(g.ok, true);
  assert.deepEqual(g.state.measurements.a, [1, '2,5', '']);
  assert.deepEqual(g.state.directions, ['↑', '']);
  assert.equal(g.state.units, undefined); assert.equal(g.state.covB, undefined); assert.equal(g.state.template, null); assert.equal(g.state.n, 3);
  assert.equal(g.state.evil, undefined); assert.equal(g.state.theme, undefined);
  assert.deepEqual(g.state.settings, {});
  assert.equal(Object.prototype.polluted, undefined);
});

/* ── i18n: io_* kalitlari ── */
test('i18n-io.js: har bir kalit uch tilda aynan bir martadan; < va & yo\'q; o\'rinbosarlar bir xil; UI va eksport ishlatadigan kalitlar bor', () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const Tr = dom.window.eval(['src/js/i18n.js', 'src/js/i18n-io.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + '\n;TRANSLATIONS');
  const base = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' }).window.eval(fs.readFileSync(path.join(ROOT, 'src/js/i18n.js'), 'utf8') + '\n;TRANSLATIONS');
  const mine = [...fs.readFileSync(path.join(ROOT, 'src/js/i18n-io.js'), 'utf8').matchAll(/^\s{6}([a-zA-Z0-9_]+):/gm)].map(m => m[1]);
  const keys = [...new Set(mine)];
  assert.ok(keys.length > 120, String(keys.length));
  for (const k of keys) {
    assert.match(k, /^io_/);
    assert.equal(mine.filter(x => x === k).length, 3, k);
    assert.ok(!(k in base.en), k + ': oldingi kalitni bosib ketadi');
    const ph = l => [...Tr[l][k].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
    for (const l of ['uz', 'ru', 'en']) { assert.ok(typeof Tr[l][k] === 'string' && Tr[l][k].trim(), `${l}.${k}`); assert.ok(!/[<&]/.test(Tr[l][k]), `${l}.${k}`); }
    assert.ok(ph('uz') === ph('ru') && ph('uz') === ph('en'), k);
  }
  const need = new Set();
  for (const f of ['src/ui/io/app.js', 'src/io/export-table.js']) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of code.matchAll(/'(io_[a-z0-9_]+)'/g)) if (!m[1].endsWith('_')) need.add(m[1]);   // '_' bilan tugasa — dinamik oila (quyida)
  }
  I.IMPORT_ERRORS.forEach(r => need.add('io_err_' + r));
  ['too_large', 'bad_json', 'bad_format', 'forbidden_key', 'hash'].forEach(r => need.add('io_json_err_' + r));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const m of html.matchAll(/data-i18n="(io_[a-z0-9_]+)"/g)) need.add(m[1]);
  assert.ok(need.size > 100, String(need.size));
  assert.deepEqual([...need].filter(k => !keys.includes(k)), []);
  assert.deepEqual(keys.filter(k => !need.has(k)), [], 'ishlatilmaydigan kalit');
});
