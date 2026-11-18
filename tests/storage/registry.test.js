/* P11: src/storage/registry.js — reestr yozuvlari (etalonlar, CMC, QC) IndexedDB da, audit zanjiri bilan;
   saqlangan hisoblar sxemasi 2 → 3 migratsiyasi (qo'lda kiritilgan B tur manbalari o'zgarmaydi). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { IDBFactory } = require('fake-indexeddb');
const S = require('../../src/storage/index.js');
const E = require('../../src/engine/index.js');

let n = 0;
const fresh = () => new S.LocalAdapter({ indexedDB: new IDBFactory(), name: 'uc-reg-' + (++n) }).open();
const std = (extra = {}) => E.cleanStandard({
  id: 'std:t1', name: 'Etalon termometr', serial: 'N-1', unit: '°C', range: { min: 0, max: 100 },
  calibrations: [{ certificate: 'C-1', calibrator: 'Metrologiya instituti', accreditation: 'UZ.CAL.001', route: 'accredited', date: '2025-11-01', validUntil: '2026-11-01', points: [{ x: 0, correction: 0.01, U: 0.02, k: 2 }] }],
  ...extra,
});

test('reestr: yaratish, tahrirlash, o\'chirish — har biri audit izida (rol, vaqt, oldingi va yangi qiymat); versiya oshadi', async () => {
  const db = await fresh();
  const a = await S.saveRegistry(db, std(), { role: 'admin', at: '2026-11-18T10:00:00.000Z' });
  assert.deepEqual([a.version, a.format, a.schema, a.updatedAt], [1, 'uc-registry/1', 1, '2026-11-18T10:00:00.000Z']);
  const b = await S.saveRegistry(db, { ...a, name: 'Etalon termometr Pt100' }, { role: 'admin', at: '2026-11-18T11:00:00.000Z', reason: 'nom tuzatildi' });
  assert.equal(b.version, 2);
  assert.equal(await S.removeRegistry(db, 'std:t1', { role: 'superadmin', at: '2026-11-18T12:00:00.000Z' }), true);
  assert.equal(await S.getRegistry(db, 'std:t1'), undefined);
  const h = await S.registryHistory(db, 'std:t1');
  assert.deepEqual(h.map(e => [e.action, e.actor, e.at]), [['create', 'admin', '2026-11-18T10:00:00.000Z'], ['update', 'admin', '2026-11-18T11:00:00.000Z'], ['delete', 'superadmin', '2026-11-18T12:00:00.000Z']]);
  assert.deepEqual([h[1].before.name, h[1].after.name, h[1].reason], ['Etalon termometr', 'Etalon termometr Pt100', 'nom tuzatildi']);
  assert.equal(h[2].before.version, 2);                      // o'chirilgan yozuvning asl qiymati auditda qoladi
  assert.equal(h[2].after, null);
  assert.equal((await db.verifyAudit()).ok, true);
  await db._tamperAudit(2, { reason: 'boshqa' });
  assert.equal((await db.verifyAudit()).ok, false);          // iz o'zgartirilsa — aniqlanadi
});

test('rol: etalon va CMC ni xodim tahrirlay olmaydi; QC kartasiga xodim yozadi; rol audit izida (ism emas)', async () => {
  const db = await fresh();
  await assert.rejects(S.saveRegistry(db, std(), { role: 'employee' }), /registry_forbidden/);
  await assert.rejects(S.saveRegistry(db, { id: S.CMC_TABLE_ID, kind: 'cmc', rows: [] }, { role: 'employee' }), /registry_forbidden/);
  assert.equal((await db.listAudit()).length, 0);            // rad etilgan amal iz qoldirmaydi va hech narsa yozmaydi
  await S.saveRegistry(db, std(), { role: 'admin' });
  await assert.rejects(S.removeRegistry(db, 'std:t1', { role: 'employee' }), /registry_forbidden/);
  await S.saveRegistry(db, { id: 'qc:1', kind: 'qc', name: 'Nazorat namunasi', points: [{ date: '2026-11-18', values: [10.1] }] }, { role: 'employee' });
  await S.saveRegistry(db, std({ id: 'std:t2' }), { role: 'Ali Valiyev' });   // rol o'rniga ism berilsa — 'guest'
  const actors = (await db.listAudit()).map(e => e.actor);
  assert.deepEqual(actors, ['admin', 'employee', 'guest']);
  assert.deepEqual([S.canEditRegistry('standard', 'admin'), S.canEditRegistry('standard', 'employee'), S.canEditRegistry('cmc', 'employee'), S.canEditRegistry('qc', 'employee'), S.canEditRegistry('standard', 'guest')], [true, false, false, true, true]);
  await assert.rejects(S.saveRegistry(db, { id: 'x', kind: 'person' }, { role: 'admin' }), /registry_bad_kind/);
  await assert.rejects(S.saveRegistry(db, { kind: 'standard' }, { role: 'admin' }), /registry_id_required/);
});

test('QC kartasi: nazorat namunasi qiymati va karta tarixi audit izida', async () => {
  const db = await fresh();
  let c = await S.saveRegistry(db, { id: 'qc:1', kind: 'qc', name: 'NH4-N', unit: 'µg/L', type: 'imr', target: null, points: [] }, { role: 'admin' });
  for (const v of [201.2, 199.4, 203.1]) c = await S.saveRegistry(db, { ...c, points: [...c.points, { date: '2026-11-18', run: '', values: [v] }] }, { role: 'employee', reason: 'qc_value' });
  const h = await S.registryHistory(db, 'qc:1');
  assert.equal(h.length, 4);
  assert.deepEqual(h.map(e => e.after.points.length), [0, 1, 2, 3]);
  assert.deepEqual(h[3].after.points.map(p => p.values[0]), [201.2, 199.4, 203.1]);
  assert.equal(c.version, 4);
});

test('ro\'yxat tur bo\'yicha; reestr hisobga ID va versiya bilan bog\'lanadi; reestr o\'zgarsa saqlangan hisob o\'zgarmaydi', async () => {
  const db = await fresh();
  const rec = await S.saveRegistry(db, std(), { role: 'admin' });
  await S.saveRegistry(db, { id: S.CMC_TABLE_ID, kind: 'cmc', rows: [{ id: 'r1', quantity: 'Harorat', min: 0, max: 100, type: 'abs', value: 0.05 }] }, { role: 'admin' });
  assert.deepEqual((await S.listRegistry(db, 'standard')).map(r => r.id), ['std:t1']);
  assert.deepEqual((await S.listRegistry(db)).map(r => r.kind).sort(), ['cmc', 'standard']);
  const { component } = E.sourceFromStandard(rec, { x: 0, param: 't' });
  const state = { params: ['t'], measurements: { t: [50, 50.1, 49.9] }, model: { formula: '' }, typeB: [component], settings: { modelKind: 'unknown', measurementDate: '2026-03-01' } };
  await db.save('calculations', { id: 'c1', format: 'calc-state/v2', schema: S.CALC_STATE_SCHEMA, state });
  const before = JSON.stringify(E.evaluate(state));
  await S.saveRegistry(db, { ...rec, calibrations: [{ ...rec.calibrations[0], points: [{ x: 0, correction: 0.5, U: 5, k: 2 }] }] }, { role: 'admin' });
  const saved = (await db.get('calculations', 'c1')).state;
  assert.deepEqual([saved.typeB[0].registry.id, saved.typeB[0].registry.version, saved.typeB[0].halfWidth], ['std:t1', 1, 0.02]);
  assert.equal(JSON.stringify(E.evaluate(saved)), before);
  assert.equal((await S.getRegistry(db, 'std:t1')).version, 2);
});

test('migratsiya 2 → 3: qo\'lda kiritilgan B tur manbalari o\'zgarishsiz (reestrga bog\'lanmagan), ma\'lumot yo\'qolmaydi, audit izi bor, idempotent', async () => {
  const db = await fresh();
  const raw = fs.readFileSync(path.join(__dirname, 'fixtures', fs.readdirSync(path.join(__dirname, 'fixtures')).filter(f => f.endsWith('.json'))[0]), 'utf8');
  const old = JSON.parse(raw);
  assert.ok(old.typeB.length > 0);
  await db.save('calculations', { id: 'old-1', format: 'calc-state/v2', schema: 2, state: { ...old, settings: { ...old.settings, modelKind: 'unknown' } } });
  await db.save('calculations', { id: 'old-0', format: 'calc-state/v2', state: old });                       // sxema raqamisiz (P04)
  await db.save('calculations', { id: 'raw-1', format: 'raw', raw: '{buzilgan' });
  const r = await S.migrateSchema(db, { at: '2026-11-18T00:00:00.000Z' });
  assert.deepEqual([r.status, r.from, r.to, r.changed], ['migrated', null, 3, 2]);
  assert.equal(S.CALC_STATE_SCHEMA, 3);
  for (const id of ['old-1', 'old-0']) {
    const rec = await db.get('calculations', id);
    assert.equal(rec.schema, 3);
    assert.deepEqual(rec.state.typeB, old.typeB, id);                                   // aynan o'sha manbalar
    assert.ok(rec.state.typeB.every(c => !('registry' in c) && !('drift' in c)));
    assert.deepEqual(rec.state.measurements, old.measurements);
    assert.equal(JSON.stringify(E.evaluate(rec.state)), JSON.stringify(E.evaluate({ ...old, settings: { ...old.settings, modelKind: 'unknown' } })));
  }
  assert.deepEqual(await db.get('calculations', 'raw-1'), { id: 'raw-1', format: 'raw', raw: '{buzilgan' });
  const mig = (await db.listAudit()).filter(e => e.action === 'migrate');
  assert.equal(mig.length, 3);                                                          // 2 hisob + belgi
  assert.equal(mig[0].before.schema === 2 || mig[0].before.schema === undefined, true);  // oldingi qiymat auditda
  assert.deepEqual((await db.get('meta', S.SCHEMA_KEY)).calcState, 3);
  const again = await S.migrateSchema(db);
  assert.deepEqual([again.status, again.changed], ['already', 0]);
  assert.equal((await db.listAudit()).filter(e => e.action === 'migrate').length, 3);
  assert.equal((await db.verifyAudit()).ok, true);
});

test('to\'liq eksport → import: reestr yozuvlari saqlanadi (uc-export/1)', async () => {
  const db = await fresh();
  await S.saveRegistry(db, std(), { role: 'admin', at: '2026-11-18T10:00:00.000Z' });
  const text = await S.exportAll(db);
  const db2 = await fresh();
  assert.equal((await S.importAll(db2, text, { audit: false })).ok, true);
  assert.deepEqual(await S.getRegistry(db2, 'std:t1'), await S.getRegistry(db, 'std:t1'));
  assert.equal(await S.exportAll(db2), text);
});

test('laboratoriya sozlamasi: expiryWarnDays standart 30', () => {
  assert.equal(S.LAB_DEFAULTS.expiryWarnDays, 30);
});
