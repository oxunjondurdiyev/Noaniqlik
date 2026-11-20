/* P12: src/storage/quality.js — PT seriyalari va validatsiya to'plamlari (IndexedDB v2), audit, rollar, chiqarish izohi;
   IndexedDB 1 → 2 yangilanishi: eski omborlar va ma'lumot yo'qolmaydi; eksport (P12 omborlari bo'sh bo'lsa) o'zgarmaydi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { IDBFactory } = require('fake-indexeddb');
const S = require('../../src/storage/index.js');

let n = 0;
const fresh = idb => new S.LocalAdapter({ indexedDB: idb || new IDBFactory(), name: 'uc-q-' + (++n) }).open();
const series = (extra = {}) => ({ id: 'pt:1', name: 'Pb suvda', quantity: 'Pb', method: 'AAS', unit: 'mg/L', provider: 'PT tashkiloti', rounds: [{ id: 'R1', date: '2026-01-10', x: 10.2, xpt: 10, sigmaPt: 0.3 }], ...extra });
const vset = () => ({ id: 'val:1', name: 'Pb validatsiya', tests: [{ id: 'g', type: 'grubbs', values: [1, 2, 3, 40] }] });

test('PT: yaratish / tahrirlash / o\'chirish — audit (rol, oldingi va yangi qiymat); versiya + 1; savedBy; shaxsiy maydon tashlanadi', async () => {
  const db = await fresh();
  const a = await S.saveQuality(db, 'pt', series({ operator: 'Ism Familiya', phone: '+998' }), { role: 'employee', at: '2026-11-19T10:00:00.000Z' });
  assert.deepEqual([a.version, a.format, a.savedBy], [1, 'uc-pt-series/1', 'employee']);
  assert.ok(!('operator' in a) && !('phone' in a));
  const b = await S.saveQuality(db, 'pt', { ...a, rounds: [...a.rounds, { id: 'R2', x: 9.8, xpt: 10, sigmaPt: 0.3, who: 'x' }] }, { role: 'employee', at: '2026-11-19T11:00:00.000Z' });
  assert.equal(b.version, 2);
  assert.ok(!('who' in b.rounds[1]));
  await assert.rejects(S.removeQuality(db, 'pt', 'pt:1', { role: 'employee' }), /quality_forbidden/);
  assert.equal(await S.removeQuality(db, 'pt', 'pt:1', { role: 'admin', at: '2026-11-19T12:00:00.000Z' }), true);
  const h = await S.qualityHistory(db, 'pt', 'pt:1');
  assert.deepEqual(h.map(e => [e.action, e.actor]), [['create', 'employee'], ['update', 'employee'], ['delete', 'admin']]);
  assert.equal(h[1].before.rounds.length, 1);
  assert.equal(h[1].after.rounds.length, 2);
  assert.equal((await db.verifyAudit()).ok, true);
  const g = await S.saveQuality(db, 'pt', series({ id: 'pt:2' }), {});
  assert.equal(g.savedBy, 'guest');
});

test('validatsiya: chiqarish — faqat admin / guest, izoh ≥ 10 belgi, audit "outlier_exclude"; xodim saqlashi chiqarishni o\'chirmaydi', async () => {
  const db = await fresh();
  await S.saveQuality(db, 'validation', vset(), { role: 'employee' });
  await assert.rejects(S.excludeValue(db, 'val:1', 'g', 3, 'Namuna ifloslangan', { role: 'employee' }), /quality_forbidden/);
  await assert.rejects(S.excludeValue(db, 'val:1', 'g', 3, 'qisqa', { role: 'admin' }), /exclude_comment_short/);
  const r = await S.excludeValue(db, 'val:1', 'g', 3, 'Namuna ifloslangani qayd etilgan', { role: 'admin', at: '2026-11-19T10:00:00.000Z' });
  assert.deepEqual(r.tests[0].excluded, [{ index: 3, comment: 'Namuna ifloslangani qayd etilgan', role: 'admin', at: '2026-11-19T10:00:00.000Z' }]);
  assert.deepEqual(r.tests[0].values, [1, 2, 3, 40]);                  // qiymat o'chirilmagan
  // xodim test qiymatlarini tahrirlaydi — chiqarish (va uning izohi) saqlanib qoladi; xodim uni olib tashlay olmaydi
  const e = await S.saveQuality(db, 'validation', { ...r, tests: [{ ...r.tests[0], values: [1, 2, 3, 40, 2.5], excluded: [] }] }, { role: 'employee' });
  assert.equal(e.tests[0].excluded.length, 1);
  const back = await S.excludeValue(db, 'val:1', 'g', 3, 'Qayta tekshiruvda xato tasdiqlanmadi', { role: 'admin', include: true });
  assert.deepEqual(back.tests[0].excluded, []);
  const h = await S.qualityHistory(db, 'validation', 'val:1');
  assert.deepEqual(h.map(x => x.action), ['create', 'outlier_exclude', 'update', 'outlier_include']);
  assert.equal(h[1].reason, 'Namuna ifloslangani qayd etilgan');
  await S.saveQuality(db, 'validation', { id: 'val:2', tests: [{ id: 'g', type: 'grubbs', values: [1, 2, 9] }] }, {});
  await S.excludeValue(db, 'val:2', 'g', 2, 'Lokal rejimda mehmon qarori', {});   // guest — lokal
  assert.equal(S.canQuality('draft', 'employee'), false);
  assert.equal(S.canQuality('draft', 'admin'), true);
});

test('IndexedDB 1 → 2: eski omborlardagi ma\'lumot va audit saqlanadi; yangi omborlar yaratiladi', async () => {
  const idb = new IDBFactory();
  const name = 'uc-upgrade';
  await new Promise((resolve, reject) => {
    const r = idb.open(name, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const [s, kp] of Object.entries({ calculations: 'id', templates: ['id', 'version'], settings: 'key', registries: 'id', audit: 'seq', meta: 'key' })) db.createObjectStore(s, { keyPath: kp });
      db.transaction ? null : null;
    };
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction(['calculations'], 'readwrite');
      tx.objectStore('calculations').put({ id: 'c1', format: 'calc-state/v2', state: { params: ['x'] } });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    r.onerror = () => reject(r.error);
  });
  const db = await new S.LocalAdapter({ indexedDB: idb, name }).open();
  assert.equal(S.DB_VERSION, 3);                              // P14: 3 — `ai_exchange` (vaqtinchalik) ombori qo'shildi; eski ma'lumot o'zgarmaydi
  assert.deepEqual((await db.get('calculations', 'c1')).state, { params: ['x'] });
  await S.saveQuality(db, 'pt', series(), { role: 'admin' });
  assert.equal((await S.listQuality(db, 'pt')).length, 1);
});

test('eksport: P12 omborlari bo\'sh bo\'lsa eksportga kirmaydi (eski eksport bilan bir xil); to\'la bo\'lsa — kiradi va qaytadi', async () => {
  const db = await fresh();
  const t0 = await S.exportAll(db);
  assert.ok(!/"pt"|"validation"/.test(t0));
  await S.saveQuality(db, 'pt', series(), { role: 'admin', at: '2026-11-19T10:00:00.000Z' });
  const t1 = await S.exportAll(db);
  assert.ok(/"pt":\[/.test(t1));
  const db2 = await fresh();
  assert.equal((await S.importAll(db2, t1, { audit: false })).ok, true);
  assert.equal(await S.exportAll(db2), t1);
});
