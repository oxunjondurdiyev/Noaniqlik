/* P04: src/storage — IndexedDB (fake-indexeddb, faqat devDependency), audit xesh zanjiri,
   uc_state_v2 → IndexedDB migratsiyasi, JSON eksport/import.
   Qabul mezonlari (PLAN P04): migratsiya → bir xil natija; eksport → import → bit darajasida bir xil;
   audit zanjirida bitta yozuv o'zgartirilsa aniqlanadi.
   Namuna fayllar (tests/storage/fixtures/uc_state_v2.*.json) — P03 UI holati shaklidagi vakil namunalar
   (presets.js ma'lumoti; ENGINE 1.0.0 dagi Uround/yround/resultText maydonlari bilan), real foydalanuvchi ma'lumoti emas. */
'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { IDBFactory } = require('fake-indexeddb');
const S = require('../../src/storage/index.js');
const { evaluate } = require('../../src/engine/index.js');
const { roundResult } = require('../../src/report/rounding.js');

let n = 0;
async function fresh() {
  const db = new S.LocalAdapter({ indexedDB: new IDBFactory(), name: 'uc-test-' + (++n) });
  return db.open();
}
class MemLS {
  constructor(o = {}) { this.m = new Map(Object.entries(o)); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const fixture = f => fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8');

/* ── kanonik JSON ── */
test('canonicalize: kalitlar tartibi xeshga ta\'sir qilmaydi; ∞ → null; undefined tashlanadi', async () => {
  assert.equal(S.canonicalize({ b: 1, a: [1, { d: 2, c: 3 }] }), '{"a":[1,{"c":3,"d":2}],"b":1}');
  assert.equal(S.canonicalize({ x: Infinity, y: undefined, z: NaN }), '{"x":null,"z":null}');
  assert.equal(await S.hashOf({ a: 1, b: 2 }), await S.hashOf({ b: 2, a: 1 }));
  assert.equal(await S.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'); // FIPS 180-2 B.1
});

/* ── audit ── */
test('audit: har bir save/remove yozuv qo\'shadi; zanjir to\'g\'ri; asl qiymat before da saqlanadi', async () => {
  const db = await fresh();
  await db.save('templates', { id: 'T-x', version: '0.1.0', status: 'DRAFT' }, { actor: 'metrolog', reason: 'yaratildi' });
  await db.save('templates', { id: 'T-x', version: '0.1.0', status: 'REVIEWED' }, { actor: 'tekshiruvchi', reason: 'tekshirildi' });
  assert.equal(await db.remove('templates', ['T-x', '0.1.0'], { reason: 'xato' }), true);
  assert.equal(await db.remove('templates', ['T-x', '0.1.0']), false);
  const a = await db.listAudit();
  assert.deepEqual(a.map(e => e.action), ['create', 'update', 'delete']);
  assert.equal(a[1].before.status, 'DRAFT');
  assert.equal(a[1].after.status, 'REVIEWED');
  assert.equal(a[2].before.status, 'REVIEWED');
  assert.equal(a[0].prevHash, S.GENESIS);
  assert.equal(a[1].prevHash, a[0].hash);
  assert.deepEqual(await db.verifyAudit(), { ok: true, count: 3, brokenAt: null, reason: null });
  await assert.rejects(db.save('audit', { seq: 99 }), /append_only/);
});

test('audit: bitta yozuv qo\'lda o\'zgartirilsa — aniqlanadi (hash), xesh ham almashtirilsa — keyingi yozuvda (prev_hash)', async () => {
  const db = await fresh();
  for (let i = 0; i < 4; i++) await db.appendAudit({ action: 'test', entityId: i, after: { v: i } });
  assert.equal((await db.verifyAudit()).ok, true);
  await db._tamperAudit(2, { after: { v: 999 } });
  assert.deepEqual(await db.verifyAudit(), { ok: false, count: 4, brokenAt: 2, reason: 'hash' });

  const db2 = await fresh();
  for (let i = 0; i < 4; i++) await db2.appendAudit({ action: 'test', entityId: i });
  const e2 = (await db2.listAudit())[1];
  const forged = await S.makeEntry((await db2.listAudit())[0], { action: 'test', entityId: 'soxta', at: e2.at });
  await db2._tamperAudit(2, forged);
  assert.deepEqual(await db2.verifyAudit(), { ok: false, count: 4, brokenAt: 3, reason: 'prev_hash' });
});

test('audit: yozuv o\'chirilsa (seq uzilishi) — aniqlanadi', async () => {
  const entries = [];
  let prev = null;
  for (let i = 0; i < 3; i++) { prev = await S.makeEntry(prev, { action: 'a' }); entries.push(prev); }
  assert.equal((await S.verifyChain(entries)).ok, true);
  assert.deepEqual(await S.verifyChain([entries[0], entries[2]]), { ok: false, count: 2, brokenAt: 3, reason: 'seq_gap' });
});

/* ── migratsiya ── */
for (const f of ['uc_state_v2.density.json', 'uc_state_v2.gas-points.json']) {
  test(`migratsiya ${f}: uc_state_v2 → IndexedDB → natija bir xil; eski kalit saqlanadi, _backup yaratiladi`, async () => {
    const raw = fixture(f);
    const ls = new MemLS({ uc_state_v2: raw });
    const db = await fresh();
    const r = await S.migrateLegacy(ls, db, { at: '2026-11-13T00:00:00Z' });
    assert.equal(r.status, 'migrated');
    assert.equal(ls.getItem('uc_state_v2'), raw, 'eski kalit o\'chirilmaydi');
    assert.equal(ls.getItem('uc_state_v2_backup'), raw);
    const rec = await db.get('calculations', S.LEGACY_CALC_ID);
    assert.deepEqual(rec.state, JSON.parse(raw), 'holat o\'zgarishsiz');
    // natija bir xil: joriy holat va har bir saqlangan nuqta
    const orig = JSON.parse(raw);
    assert.equal(JSON.stringify(evaluate(rec.state)), JSON.stringify(evaluate(orig)));
    for (let i = 0; i < (orig.points || []).length; i++) {
      assert.equal(JSON.stringify(evaluate(rec.state.points[i].snapshot)), JSON.stringify(evaluate(orig.points[i].snapshot)));
      // saqlangan eski natija hisobot qatlamida bir xil yaxlitlanadi
      const a = rec.state.points[i].result, b = orig.points[i].result;
      assert.deepEqual(roundResult(a.y, a.U, a.roundUp), roundResult(b.y, b.U, b.roundUp));
    }
    // idempotent; audit
    assert.equal((await S.migrateLegacy(ls, db)).status, 'already');
    assert.equal((await db.list('calculations')).length, 1);
    const audit = await db.listAudit();
    assert.deepEqual(audit.map(e => e.action), ['migrate', 'migrate']);
    assert.equal((await db.verifyAudit()).ok, true);
  });
}

test('migratsiya: bo\'sh — hech narsa qilinmaydi; buzilgan JSON ham yo\'qolmaydi (format raw); mavjud _backup ustidan yozilmaydi', async () => {
  const db = await fresh();
  assert.equal((await S.migrateLegacy(new MemLS(), db)).status, 'empty');
  const ls = new MemLS({ uc_state_v2: '{buzilgan', uc_state_v2_backup: 'eski nusxa' });
  const r = await S.migrateLegacy(ls, db);
  assert.equal(r.status, 'invalid');
  assert.equal((await db.get('calculations', S.LEGACY_CALC_ID)).raw, '{buzilgan');
  assert.equal(ls.getItem('uc_state_v2_backup'), 'eski nusxa');
  assert.equal(ls.getItem('uc_state_v2'), '{buzilgan');
});

/* ── eksport / import ── */
async function populated() {
  const db = await fresh();
  const ls = new MemLS({ uc_state_v2: fixture('uc_state_v2.gas-points.json') });
  await S.migrateLegacy(ls, db, { at: '2026-11-13T00:00:00Z' });
  const tpl = JSON.parse(fs.readFileSync(path.join(__dirname, '../../templates/builtin/T-03.json'), 'utf8'));
  await db.save('templates', tpl, { actor: 'metrolog', reason: 'import' });
  await db.save('templates', { ...tpl, version: '0.2.0' }, { actor: 'metrolog', reason: 'yangi versiya' });
  await S.saveLabSettings(db, { P: 0.95, nuRule: 'interpolate', cmcMode: 'block' });
  await db.save('calculations', { id: 'c1', format: 'calc-state/v2', state: { params: ['x'], measurements: { x: [1, 2, 3] } }, result: { nuEff: Infinity, U: 0.1 } });
  return db;
}

test('eksport → bo\'sh bazaga import (audit: false) → eksport: bit darajasida bir xil', async () => {
  const db = await populated();
  const e1 = await S.exportAll(db);
  const db2 = await fresh();
  const r = await S.importAll(db2, e1, { audit: false });
  assert.equal(r.ok, true);
  const e2 = await S.exportAll(db2);
  assert.equal(e2, e1);
  assert.equal(Buffer.compare(Buffer.from(e1, 'utf8'), Buffer.from(e2, 'utf8')), 0);
  assert.equal((await db2.verifyAudit()).ok, true);
  assert.deepEqual((await S.getLabSettings(db2)).nuRule, 'interpolate');
});

test('import (standart): ma\'lumot bit darajasida bir xil, audit zanjiriga "import" yozuvi qo\'shiladi va zanjir butun', async () => {
  const db = await populated();
  const e1 = await S.exportAll(db);
  const db2 = await fresh();
  await S.importAll(db2, e1, { actor: 'admin' });
  const d1 = JSON.parse(e1).stores, d2 = JSON.parse(await S.exportAll(db2)).stores;
  for (const k of ['calculations', 'templates', 'settings', 'registries', 'meta']) assert.equal(S.canonicalize(d2[k]), S.canonicalize(d1[k]), k);
  assert.equal(d2.audit.length, d1.audit.length + 1);
  assert.equal(S.canonicalize(d2.audit.slice(0, -1)), S.canonicalize(d1.audit));
  assert.equal(d2.audit.at(-1).action, 'import');
  assert.equal((await db2.verifyAudit()).ok, true);
});

test('import: buzilgan fayl rad etiladi (integrity, audit zanjiri, format), baza o\'zgarmaydi', async () => {
  const db = await populated();
  const e1 = await S.exportAll(db);
  const target = await fresh();
  await target.save('meta', { key: 'mine', v: 1 });
  const doc = JSON.parse(e1);
  doc.stores.calculations[0].id = 'soxta';
  assert.equal((await S.importAll(target, JSON.stringify(doc))).reason, 'integrity');
  const doc2 = JSON.parse(e1);
  doc2.stores.audit[1].reason = 'o\'zgartirildi';
  doc2.integrity = await S.sha256Hex(S.canonicalize(doc2.stores));
  assert.equal((await S.importAll(target, JSON.stringify(doc2))).reason, 'audit_chain');
  assert.equal((await S.importAll(target, '{"format":"x"}')).reason, 'bad_format');
  assert.equal((await S.importAll(target, 'not json')).reason, 'bad_json');
  assert.deepEqual(await target.get('meta', 'mine'), { key: 'mine', v: 1 });
});

test('laboratoriya sozlamalari: standart qiymatlar, saqlash, dvigatelga o\'tadigan qism', async () => {
  const db = await fresh();
  assert.deepEqual(await S.getLabSettings(db), { ...S.LAB_DEFAULTS });
  await S.saveLabSettings(db, { P: 0.99, kMethod: 'k2', unknown: 1 });
  const lab = await S.getLabSettings(db);
  assert.equal(lab.P, 0.99);
  assert.equal(lab.unknown, undefined);
  assert.deepEqual(S.labToEngineSettings(lab), { P: 0.99, kMethod: 'k2', nuRule: 'floor', rounding: 'normal', secondOrder: false });
});

test('shablon versiyalari: har bir versiya alohida yozuv; latestVersions semver bo\'yicha', async () => {
  const db = await populated();
  const all = await db.list('templates');
  assert.deepEqual(all.map(t => t.version), ['0.1.0', '0.2.0']);
  assert.deepEqual(S.latestVersions([...all, { id: 'T-x', version: '0.10.0' }, { id: 'T-x', version: '0.9.1' }]).map(t => t.id + '@' + t.version), ['T-03@0.2.0', 'T-x@0.10.0']);
});

test('RemoteAdapter: skelet — tarmoq so\'rovi yubormaydi', async () => {
  const r = new S.RemoteAdapter({ baseUrl: 'https://example.invalid', fetch: () => { throw new Error('fetch called'); } });
  await assert.rejects(r.get('calculations', 'x'), /remote_not_implemented/);
  await assert.rejects(r.save('calculations', {}), /remote_not_implemented/);
  assert.ok(S.REMOTE_ENDPOINTS.evaluate);
});

test('saqlash qatlami: DOM ga bog\'liq emas, shaxsiy ma\'lumot maydonlari yo\'q', () => {
  const dir = path.join(__dirname, '../../src/storage');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/\b(document|window)\b/.test(src), f);
    assert.ok(!/firstName|lastName|phone|email|inn\b|stir/i.test(src), f);
  }
});
