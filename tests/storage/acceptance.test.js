/* P05a: linter topilmasini "asoslangan holda qabul qilish" — src/storage/acceptance.js.
   Qabul qilish audit zanjiriga yoziladi: kim (rol), qachon, topilma id, izoh. Izoh majburiy (≥ 10 belgi). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { IDBFactory } = require('fake-indexeddb');
const S = require('../../src/storage/index.js');
const E = require('../../src/engine/index.js');

const fresh = () => new S.LocalAdapter({ indexedDB: new IDBFactory(), name: 'acc-' + Math.random() }).open();
const finding = { id: 'X8/below_cmc', rule: 'X8', code: 'below_cmc', severity: 'error', value: 'U = 0.02 < CMC = 1' };

test('qabul qilish audit zanjiriga yoziladi: rol, vaqt, topilma id, izoh; zanjir butun', async () => {
  const db = await fresh();
  const rec = await S.acceptFinding(db, { scope: 'gum', calcId: 'calc-1', finding, comment: '  CMC qayta ko\'rib chiqilmoqda (bayonnoma 12)  ', role: 'admin', at: '2026-11-18T10:00:00.000Z' });
  assert.deepEqual([rec.findingId, rec.comment, rec.role, rec.at, rec.seq], ['X8/below_cmc', 'CMC qayta ko\'rib chiqilmoqda (bayonnoma 12)', 'admin', '2026-11-18T10:00:00.000Z', 1]);
  const [e] = await db.listAudit();
  assert.deepEqual([e.action, e.entity, e.actor, e.reason, e.at], [S.ACCEPT_ACTION, 'findings', 'admin', rec.comment, rec.at]);
  assert.deepEqual(e.after, { scope: 'gum', calcId: 'calc-1', findingId: 'X8/below_cmc', rule: 'X8', code: 'below_cmc', severity: 'error', value: finding.value, comment: rec.comment, role: 'admin' });
  assert.equal(e.hash, rec.hash);
  assert.deepEqual(await db.verifyAudit(), { ok: true, count: 1, brokenAt: null, reason: null });
});

test('izoh majburiy: 10 belgidan qisqa, bo\'sh yoki yo\'q bo\'lsa rad etiladi va zanjirga hech narsa yozilmaydi', async () => {
  const db = await fresh();
  assert.equal(S.MIN_COMMENT, E.MIN_ACCEPT_COMMENT);                     // saqlash qatlami va dvigateldagi chegara bir xil
  for (const comment of [undefined, '', '   ', 'qisqa', '123456789', '   123456789   ']) {
    await assert.rejects(S.acceptFinding(db, { finding, comment, role: 'admin' }), /accept_comment_short/, JSON.stringify(comment));
  }
  await assert.rejects(S.acceptFinding(db, { finding: { ...finding, severity: 'info' }, comment: 'yetarlicha uzun izoh' }), /accept_not_applicable/);
  await assert.rejects(S.acceptFinding(db, { comment: 'yetarlicha uzun izoh' }), /accept_finding_required/);
  assert.equal((await db.listAudit()).length, 0);
  assert.ok((await S.acceptFinding(db, { finding, comment: '1234567890' })).seq === 1);   // aynan 10 belgi — qabul
});

test('rol — shaxsiy ma\'lumot emas: faqat qisqa identifikator; boshqa har qanday qiymat "guest"', async () => {
  assert.deepEqual(['admin', 'Employee', 'superadmin', '', undefined, 'Ali Valiyev', 'a@b.uz', '+998901234567'].map(S.cleanRole),
    ['admin', 'employee', 'superadmin', 'guest', 'guest', 'guest', 'guest', 'guest']);
  const db = await fresh();
  const rec = await S.acceptFinding(db, { finding, comment: 'Mijoz bilan kelishilgan', role: 'Ali Valiyev' });
  assert.equal(rec.role, 'guest');
  assert.ok(!JSON.stringify(await db.listAudit()).includes('Valiyev'));
});

test('bekor qilish — yangi yozuv (eski yozuv o\'chmaydi); joriy holat zanjirdan tiklanadi; doira (scope / calcId) bo\'yicha', async () => {
  const db = await fresh();
  const other = { id: 'X1/x1_mpe_in_budget:I/MPE', rule: 'X1', code: 'x1_mpe_in_budget', severity: 'error' };
  await S.acceptFinding(db, { scope: 'gum', calcId: 'c1', finding, comment: 'birinchi asos — yetarli', role: 'admin', at: '2026-11-18T10:00:00.000Z' });
  await S.acceptFinding(db, { scope: 'gum', calcId: 'c1', finding: other, comment: 'ikkinchi asos — yetarli', role: 'employee' });
  await S.acceptFinding(db, { scope: 'topdown', calcId: '', finding, comment: 'boshqa doiradagi qabul', role: 'admin' });
  let acc = S.acceptancesFromAudit(await db.listAudit(), 'gum', 'c1');
  assert.deepEqual(Object.keys(acc).sort(), [finding.id, other.id].sort());
  assert.deepEqual([acc[finding.id].comment, acc[finding.id].role, acc[finding.id].at, acc[finding.id].value], ['birinchi asos — yetarli', 'admin', '2026-11-18T10:00:00.000Z', finding.value]);
  await S.revokeAcceptance(db, { scope: 'gum', calcId: 'c1', findingId: finding.id, role: 'admin' });
  const audit = await db.listAudit();
  assert.deepEqual(audit.map(e => e.action), [S.ACCEPT_ACTION, S.ACCEPT_ACTION, S.ACCEPT_ACTION, S.REVOKE_ACTION]);
  acc = S.acceptancesFromAudit(audit, 'gum', 'c1');
  assert.deepEqual(Object.keys(acc), [other.id]);
  assert.deepEqual(Object.keys(S.acceptancesFromAudit(audit, 'topdown', '')), [finding.id]);
  assert.deepEqual(S.acceptancesFromAudit(audit, 'gum', 'c2'), {});
  assert.equal((await db.verifyAudit()).ok, true);
});

test('qabul yozuvi o\'zgartirilsa (izoh almashtirilsa) — zanjir buzilgani aniqlanadi', async () => {
  const db = await fresh();
  await S.acceptFinding(db, { finding, comment: 'asl izoh — o\'zgarmasligi kerak', role: 'admin' });
  await S.acceptFinding(db, { finding, comment: 'ikkinchi yozuv — yetarli', role: 'admin' });
  await db._tamperAudit(1, { reason: 'soxta izoh' });
  const v = await db.verifyAudit();
  assert.deepEqual([v.ok, v.brokenAt, v.reason], [false, 1, 'hash']);
});

test('qabul qilish → hisobot holati: error qabul qilinmaguncha rasmiy emas; qiymat o\'zgarsa qabul bekor bo\'ladi', async () => {
  const db = await fresh();
  const st = { params: ['X'], measurements: { X: [10.02, 10.01, 10.03, 10.02, 10.01] }, model: { formula: '' }, settings: { cmc: 1, modelKind: 'value' },
    typeB: [{ name: 'Rezolyutsiya', param: 'X', halfWidth: 0.01, distribution: 'resol' }] };
  const r = E.evaluate(st);
  const f = r.findings.find(x => x.code === 'below_cmc');
  assert.equal(E.reportStatus(r.findings, {}).official, false);
  const rec = await S.acceptFinding(db, { scope: 'gum', finding: f, comment: 'CMC jadvali yangilanmoqda', role: 'admin' });
  const acc = S.acceptancesFromAudit(await db.listAudit(), 'gum', '');
  assert.equal(E.reportStatus(r.findings, acc).official, true);
  assert.equal(rec.value, f.value);
  // boshqa ma'lumot bilan qayta hisob: topilma id bir xil, qiymat (U) boshqa → eski qabul amal qilmaydi
  const r2 = E.evaluate({ ...st, measurements: { X: [10.02, 10.01, 10.09, 10.02, 10.01] } });
  const { findingsStatus } = require('../../src/report/findings.js');
  assert.equal(findingsStatus(r.findings, acc).official, true);
  assert.equal(findingsStatus(r2.findings, acc).official, false);
});

test('migratsiya: eski hisob holati model turi "unknown" oladi (R-07); mavjud tanlov o\'zgarmaydi; funksiya sof', () => {
  const old = { params: ['x'], settings: { P: 0.95, mpe: '1' }, points: [{ id: 'p1', snapshot: { settings: { mpe: '1' } }, result: { y: 1 } }, { id: 'p2', snapshot: { settings: { modelKind: 'error' } } }] };
  const copy = JSON.stringify(old);
  const { state, changed } = S.upgradeCalcState(old);
  assert.equal(JSON.stringify(old), copy);
  assert.equal(changed, true);
  assert.deepEqual([state.settings.modelKind, state.points[0].snapshot.settings.modelKind, state.points[1].snapshot.settings.modelKind], ['unknown', 'unknown', 'error']);
  assert.equal(state.settings.mpe, '1');
  const done = S.upgradeCalcState({ settings: { modelKind: 'value' } });
  assert.equal(done.changed, false);
  assert.equal(S.upgradeCalcState(null).changed, false);
  // 'unknown' holatda muvofiqlik bayonoti berilmaydi
  const r = E.evaluate({ params: ['x'], measurements: { x: [1, 1.1, 0.9] }, model: { formula: '' }, settings: { ...state.settings }, typeB: [] });
  assert.equal(r.conf.pending, 'model_kind');
});
