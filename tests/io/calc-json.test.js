/* P05b: kanonik xesh (RFC 8785 JCS) va hisobning JSON eksporti / importi (src/io/calc-json.js).
   Qabul mezonlari: JSON eksport → import → qayta hisob natijasi BIT DARAJASIDA bir xil; kalitlar tartibi
   o'zgarsa ham xesh bir xil. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');
const C = require('../../src/storage/canonical.js');
const J = require('../../src/io/calc-json.js');
const { loadCases } = require('../cases/lib.js');

test('RFC 8785 (JCS): §3.2.3 dagi namuna — kalitlar tartibi, sonlar (ECMAScript), satr escape\'lari', () => {
  // Ref: RFC 8785 §3.2.2–3.2.3 (kirish va kutilgan chiqish — RFC matnidagi misol)
  const input = JSON.parse('{"numbers":[333333333.33333329,1E30,4.50,2e-3,0.000000000000000000000000001],"string":"\\u20ac$\\u000F\\u000aA\'\\u0042\\u0022\\u005c\\\\\\"\\/","literals":[null,true,false]}');
  assert.equal(C.canonicalizeJcs(input), '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}');
  // kalitlar UTF-16 kod birliklari tartibida (RFC 8785 §3.2.3 dagi tartiblash misoli)
  const keys = { '€': 'Euro Sign', '\r': 'Carriage Return', 'דּ': 'Hebrew Letter Dalet With Dagesh', '1': 'One', '😀': 'Emoji: Grinning Face', '\u0080': 'Control', 'ö': 'Latin Small Letter O With Diaeresis' };
  // (JSON.parse dan keyin Object.values butun sonli kalitni oldinga chiqaradi — shuning uchun tartib kanonik SATRdan o'qiladi)
  assert.deepEqual([...C.canonicalizeJcs(keys).matchAll(/:"([^"]+)"/g)].map(m => m[1]), ['Carriage Return', 'One', 'Control', 'Latin Small Letter O With Diaeresis', 'Euro Sign', 'Emoji: Grinning Face', 'Hebrew Letter Dalet With Dagesh']);
});

test('JCS: chekli bo\'lmagan son — xato (I-JSON); portable() ∞ ni ko\'chma ko\'rinishga o\'tkazadi va qaytaradi', () => {
  assert.throws(() => C.canonicalizeJcs({ nu: Infinity }), /jcs_non_finite/);
  assert.throws(() => C.canonicalizeJcs([NaN]), /jcs_non_finite/);
  assert.throws(() => C.canonicalizeJcs([undefined]), /jcs_undefined_in_array/);
  const v = { nu: Infinity, a: [1, -Infinity, { b: NaN }], s: 'Infinity', n: null, u: undefined };
  const p = C.portable(v);
  assert.deepEqual(p, { nu: { $num: 'Infinity' }, a: [1, { $num: '-Infinity' }, { b: { $num: 'NaN' } }], s: 'Infinity', n: null });
  const back = C.fromPortable(JSON.parse(JSON.stringify(p)));
  assert.equal(back.nu, Infinity); assert.equal(back.a[1], -Infinity); assert.ok(Number.isNaN(back.a[2].b)); assert.equal(back.s, 'Infinity');
  assert.deepEqual(C.fromPortable({ $num: 'evil' }), { $num: 'evil' });   // noma'lum qiymat songa aylanmaydi
});

test('kanonik xesh: kalitlar tartibi o\'zgarsa ham SHA-256 bir xil; qiymat o\'zgarsa — boshqa', async () => {
  const a = { y: 1.5, U: 0.021, budget: [{ name: 'A', u: 0.1 }, { name: 'B', u: 0.2 }], settings: { P: 0.9545, k: 2 } };
  const b = { settings: { k: 2, P: 0.9545 }, budget: [{ u: 0.1, name: 'A' }, { u: 0.2, name: 'B' }], U: 0.021, y: 1.5 };
  const h = await C.jcsHash(a);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(await C.jcsHash(b), h);
  assert.notEqual(await C.jcsHash({ ...a, U: 0.022 }), h);
  assert.notEqual(await C.jcsHash({ ...a, budget: [a.budget[1], a.budget[0]] }), h);   // massiv tartibi — ma'lumot
  // ma'lum vektor: SHA-256("{}") va SHA-256('{"a":1}')
  assert.equal(await C.jcsHash({}), '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a');
  assert.equal(await C.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');   // FIPS 180-4 misoli
});

const shuffle = v => {   // kalitlar tartibini teskari qilish (rekursiv)
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(shuffle);
  return Object.fromEntries(Object.keys(v).reverse().map(k => [k, shuffle(v[k])]));
};

test('eksport → import → qayta hisob: barcha manba misollarida natija bit darajasida bir xil; xesh kalit tartibiga bog\'liq emas', async () => {
  let n = 0;
  for (const c of loadCases()) {
    const r = E.evaluate(c.modelSpec);
    if (!r || r.error) continue;
    n++;
    const doc = await J.buildCalcDoc({ id: 'calc-test-' + c.id, createdAt: '2026-11-18T00:00:00.000Z', input: c.modelSpec, result: r });
    assert.equal(doc.format, 'uc-calc/1');
    assert.equal(doc.engineVersion, E.ENGINE_VERSION);
    assert.deepEqual(doc.result.findings, JSON.parse(JSON.stringify(C.portable(r.findings))), c.id);
    const text = J.serializeCalcDoc(doc);
    const parsed = await J.parseCalcDoc(text);
    assert.equal(parsed.ok, true, `${c.id}: ${parsed.reason}`);
    const rep = J.reproduce(parsed, E.evaluate, E.ENGINE_VERSION);
    assert.deepEqual([rep.identical, rep.sameEngine], [true, true], c.id);
    // bit darajasida: kanonik satrlar teng
    assert.equal(C.canonicalizeJcs(C.portable(E.evaluate(parsed.input))), C.canonicalizeJcs(doc.result), c.id);
    // kalitlar tartibi aralashtirilgan fayl — xesh o'sha, import o'tadi
    const mixed = await J.parseCalcDoc(JSON.stringify(shuffle(doc)));
    assert.equal(mixed.ok, true, c.id);
    assert.equal(await J.calcDocHash(shuffle(doc)), doc.hash, c.id);
  }
  assert.ok(n >= 50, String(n));
});

test('eksport tarkibi: shablon ID/versiya, kirishlar, natija, findings, ENGINE_VERSION, kanonik xesh; ko\'p nuqtali', async () => {
  const p1 = require('../cases/excel/excel-gas-p1.json').modelSpec, p2 = require('../cases/excel/excel-gas-p2.json').modelSpec;
  const r1 = E.evaluate(p1), r2 = E.evaluate(p2);
  assert.equal(r1.nuEff, Infinity);                                         // ∞ — ko'chma ko'rinishda saqlanadi
  const doc = await J.buildCalcDoc({ input: p2, result: r2, template: { id: 'legacy-gas_analyzer', version: '1.0.0', status: 'DRAFT', variant: '' },
    points: [{ id: 'a', label: '0 %', input: p1, result: r1, acceptances: {} }, { id: 'b', label: '10 %', input: p2, result: r2 }], acceptances: { 'X8/zero_s:I': { comment: 'izoh yetarli uzun', role: 'admin' } } });
  assert.deepEqual(Object.keys(doc).sort(), ['acceptances', 'app', 'createdAt', 'engineVersion', 'format', 'hash', 'id', 'input', 'mode', 'points', 'result', 'template'].sort());
  assert.deepEqual([doc.app, doc.mode, doc.template.id, doc.template.version], ['UncertaintyCalc', 'GUM', 'legacy-gas_analyzer', '1.0.0']);
  assert.match(doc.id, /^calc-[0-9a-z]+-[0-9a-z]{6}$/);
  assert.deepEqual(doc.points[0].result.nuEff, { $num: 'Infinity' });
  const parsed = await J.parseCalcDoc(J.serializeCalcDoc(doc));
  assert.equal(parsed.points[0].result.nuEff, Infinity);
  assert.deepEqual(J.reproduce(parsed, E.evaluate, E.ENGINE_VERSION), { identical: true, main: true, points: [true, true], sameEngine: true, maxRel: 0, close: false });
  // boshqa rejim
  const td = E.evaluate(require('../cases/nordtest/nordtest-tr537-nh4n.json').modelSpec);
  assert.equal((await J.buildCalcDoc({ input: require('../cases/nordtest/nordtest-tr537-nh4n.json').modelSpec, result: td })).mode, 'TOP_DOWN');
  await assert.rejects(J.buildCalcDoc({ input: {}, result: { error: 'need_data' } }), /calc_export_need_result/);
});

test('import: o\'zgartirilgan fayl (xesh mos emas), noto\'g\'ri format, juda katta fayl, __proto__ — xavfsiz rad etiladi', async () => {
  const spec = require('../cases/excel/excel-density.json').modelSpec;
  const doc = await J.buildCalcDoc({ input: spec, result: E.evaluate(spec) });
  const tampered = JSON.parse(JSON.stringify(doc)); tampered.result.U = 0.0001;
  assert.deepEqual(await J.parseCalcDoc(JSON.stringify(tampered)), { ok: false, reason: 'hash' });
  assert.equal((await J.parseCalcDoc('{not json')).reason, 'bad_json');
  assert.equal((await J.parseCalcDoc(42)).reason, 'bad_json');
  assert.equal((await J.parseCalcDoc('[]')).reason, 'bad_format');
  assert.equal((await J.parseCalcDoc(JSON.stringify({ ...doc, format: 'uc-export/1' }))).reason, 'bad_format');
  assert.equal((await J.parseCalcDoc(' '.repeat(J.MAX_JSON_BYTES + 1))).reason, 'too_large');
  // prototype pollution urinishi: JSON.parse __proto__ ni oddiy kalit qiladi — hujjat rad etiladi, Object.prototype toza
  const evil = JSON.stringify(doc).replace('"input":{', '"input":{"__proto__":{"polluted":true},');
  assert.equal((await J.parseCalcDoc(evil)).reason, 'forbidden_key');
  assert.equal({}.polluted, undefined);
  // natija qo'lda o'zgartirilib, xesh ham qayta hisoblangan bo'lsa — qayta hisob farqni ko'rsatadi
  const forged = JSON.parse(JSON.stringify(doc)); forged.result.U = 0.0001; forged.hash = await J.calcDocHash(forged);
  const parsed = await J.parseCalcDoc(JSON.stringify(forged));
  assert.equal(parsed.ok, true);
  assert.equal(J.reproduce(parsed, E.evaluate, E.ENGINE_VERSION).identical, false);
});

/* ── P07b ── */
test('P07b: oshkor bo\'lmagan model (state.implicit) — uc-calc/1 eksport → import → qayta hisob bit darajasida bir xil; muharrir holati implicit ni saqlaydi; noto\'g\'ri tuzilma rad etiladi', async () => {
  const { gumStateFromInput, gumInput } = require('../../src/io/calc-state.js');
  for (const id of ['jcgm102-9-5-2-single', 'jcgm102-9-5-3-several']) {
    const spec = require(`../cases/jcgm102/${id}.json`).modelSpec;
    const r = E.evaluate(spec);
    const doc = await J.buildCalcDoc({ id: 'calc-' + id, createdAt: '2026-11-18T00:00:00.000Z', input: spec, result: r });
    const parsed = await J.parseCalcDoc(J.serializeCalcDoc(doc));
    assert.equal(parsed.ok, true, id);
    assert.equal(J.reproduce(parsed, E.evaluate, E.ENGINE_VERSION).identical, true, id);
    const st = gumStateFromInput(parsed.doc.input);
    assert.equal(st.ok, true);
    assert.deepEqual(st.state.implicit, spec.state.implicit);
    assert.deepEqual(gumInput(st.state).implicit, spec.state.implicit);
    assert.equal(JSON.stringify(E.evaluate(st.state).y), JSON.stringify(r.y));
  }
  const base = require('../cases/jcgm102/jcgm102-9-5-2-single.json').modelSpec.state;
  for (const bad of [{ unknowns: 'x', equations: [] }, { unknowns: [{ name: 5 }], equations: ['a'] }, { unknowns: [{ name: '__proto__', start: 1 }], equations: ['a'] }, { unknowns: [{ name: 'y', start: 1 }], equations: [5] }]) {
    assert.equal(gumStateFromInput({ ...base, implicit: bad }).ok, false, JSON.stringify(bad));
  }
  assert.equal(gumStateFromInput({ ...base, implicit: undefined }).state.implicit, undefined);
});
