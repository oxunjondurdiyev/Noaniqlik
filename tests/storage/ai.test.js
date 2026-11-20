/* P14: src/storage/ai.js — AI audit izi (faqat xeshlar va kodlar), ai.html bilan almashinuv ombori (kalitsiz, auditsiz,
   eksportsiz), reestr yozuvidagi `origin: 'ai'` belgisi (egasi qarori S-4 a), AI sozlamasi standart holatda o'chiq. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { IDBFactory } = require('fake-indexeddb');
const S = require('../../src/storage/index.js');
const E = require('../../src/engine/index.js');

let n = 0;
const fresh = () => new S.LocalAdapter({ indexedDB: new IDBFactory(), name: 'uc-ai-' + (++n) }).open();
const H = 'a'.repeat(64), H2 = 'b'.repeat(64);
const KEY = 'sk-ant-api03-KANAREYKA1234567890abcdef';

test('standart holat: aiEnabled = false; yoqish huquqi — admin / superadmin / guest, xodim emas', async () => {
  const db = await fresh();
  const lab = await S.getLabSettings(db);
  assert.deepEqual([lab.aiEnabled, lab.aiModel], [false, 'claude-opus-5-5']);
  assert.deepEqual(['admin', 'superadmin', 'guest', 'employee', undefined].map(S.canToggleAi), [true, true, true, false, true]);
});

test('audit: faqat ro\'yxatdagi maydonlar — xesh, kod, rol; matn, kalit va erkin maydon yozilmaydi; zanjir butun', async () => {
  const db = await fresh();
  await S.aiAudit(db, { action: 'ai_prepare', fn: 'explain', mode: 'paste', promptId: 'uc-ai/explain', promptVersion: '1.0.0', payloadHash: H, role: 'admin', at: '2026-11-20T10:00:00.000Z',
    model: 'claude-opus-5-5', promptText: 'MAXFIY PROMPT', responseText: 'MAXFIY JAVOB', documentText: 'MAXFIY HUJJAT', key: KEY, value: 0.02, userName: 'Karimov Bobur' });
  await S.aiAudit(db, { action: 'ai_send', fn: 'explain', mode: 'api', model: 'claude-opus-5-5', promptId: 'uc-ai/explain', promptVersion: '1.0.0', payloadHash: H, role: 'Karimov Bobur' });
  await S.aiAudit(db, { action: 'ai_response', fn: 'explain', mode: 'api', model: KEY, payloadHash: H, responseHash: H2, outcome: 'ok' });
  await S.aiAudit(db, { action: 'ai_accept', fn: 'template_draft', mode: 'paste', payloadHash: 'matn-xesh-emas', responseHash: H2, field: 'typeBSources[0].halfWidth', outcome: 'Erkin matn: U = 0,02' });
  await assert.rejects(S.aiAudit(db, { action: 'ai_hack' }), /ai_audit_bad_action/);
  const trail = await S.aiAuditTrail(db);
  assert.deepEqual(trail.map(e => [e.action, e.entityId, e.actor]), [['ai_prepare', 'explain', 'admin'], ['ai_send', 'explain', 'guest'], ['ai_response', 'explain', 'guest'], ['ai_accept', 'template_draft', 'guest']]);
  assert.deepEqual(trail[0].after, { fn: 'explain', mode: 'paste', promptId: 'uc-ai/explain', promptVersion: '1.0.0', payloadHash: H, responseHash: '', role: 'admin' });   // paste: model yozilmaydi
  assert.equal(trail[1].after.model, 'claude-opus-5-5');
  assert.equal(trail[2].after.model, '');                                                    // kalitga o'xshash matn — tashlanadi
  assert.deepEqual([trail[3].after.payloadHash, trail[3].after.field, trail[3].after.outcome], ['', 'typeBSources[0].halfWidth', undefined]);
  const all = JSON.stringify(await db.listAudit());
  for (const s of ['MAXFIY', 'sk-ant-', 'Karimov', '0,02', '0.02']) assert.ok(!all.includes(s), s);
  assert.equal((await db.verifyAudit()).ok, true);
});

test('almashinuv ombori: kalit yozib bo\'lmaydi; auditga tushmaydi; eksportga kirmaydi; olingach o\'chiriladi; muddati o\'tgani tozalanadi', async () => {
  const db = await fresh();
  const id = S.newExchangeId(1763632800000, 0.5);
  assert.match(id, /^aix:/);
  const rec = { id, fn: 'explain', role: 'admin', lang: 'uz', mode: 'api', promptId: 'uc-ai/explain', promptVersion: '1.0.0', promptText: 'PROMPT-MATNI', payloadHash: H, schemaId: 'explain', createdAt: '2026-11-20T10:00:00.000Z', status: 'pending', apiKey: KEY, extra: 'x' };
  const saved = await S.putExchange(db, rec);
  assert.deepEqual([saved.apiKey, saved.extra], [undefined, undefined]);                     // noma'lum maydonlar tashlanadi
  await assert.rejects(S.putExchange(db, { ...rec, responseText: 'javob ' + KEY }), /ai_exchange_key_forbidden/);
  await assert.rejects(S.putExchange(db, { ...rec, promptText: KEY }), /ai_exchange_key_forbidden/);
  await assert.rejects(S.putExchange(db, { ...rec, id: 'calc-1' }), /ai_exchange_bad_id/);
  assert.equal((await S.getExchange(db, id)).promptText, 'PROMPT-MATNI');
  assert.equal((await db.listAudit()).length, 0);                                           // prompt matni auditga tushmaydi
  const exp = await S.exportAll(db);
  assert.ok(!exp.includes('PROMPT-MATNI') && !exp.includes('ai_exchange'));
  assert.ok(!S.DATA_STORES.includes(S.AI_EXCHANGE_STORE));
  await S.putExchange(db, { ...rec, id: 'aix:old-0001', createdAt: '2026-11-20T08:00:00.000Z' });
  assert.equal(await S.purgeExchange(db, Date.parse('2026-11-20T10:30:00.000Z')), 1);
  await S.removeExchange(db, id);
  assert.equal(await S.getExchange(db, id), undefined);
  await assert.rejects(db.rawRemove('calculations', 'c1'), /raw_remove_not_allowed/);          // auditsiz o'chirish faqat vaqtinchalik omborda
});

test('reestr: AI qoralamasidan yaratilgan yozuv — origin: \'ai\' (saqlash qatlamida va auditda); cleanStandard dan keyin ham saqlanadi', async () => {
  const db = await fresh();
  const std = E.cleanStandard({ id: 'std:ai1', name: 'Etalon', unit: '°C', calibrations: [{ certificate: 'KS-1', date: '2026-01-15', points: [{ x: 0, U: 0.02, k: 2 }] }] });
  assert.equal(std.origin, undefined);                                                       // dvigatel bu maydonni bilmaydi (o'zgarmagan)
  const a = await S.saveRegistry(db, std, { role: 'admin', origin: 'ai' });
  assert.equal(a.origin, 'ai');
  const b = await S.saveRegistry(db, E.cleanStandard({ ...a, name: 'Etalon Pt100' }), { role: 'admin' });   // tahrir: cleanStandard belgini tashlaydi
  assert.deepEqual([b.origin, b.version], ['ai', 2]);
  const h = await S.registryHistory(db, 'std:ai1');
  assert.deepEqual(h.map(e => e.after.origin), ['ai', 'ai']);
  const c = await S.saveRegistry(db, E.cleanStandard({ id: 'std:m1', name: 'Qo\'lda', unit: '°C', calibrations: [] }), { role: 'admin' });
  assert.equal('origin' in c, false);                                                        // qo'lda kiritilgan yozuvda belgi yo'q
});
