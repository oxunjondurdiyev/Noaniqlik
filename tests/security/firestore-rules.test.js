/* Firestore xavfsizlik qoidalari testlari (firestore.rules).
   Firebase Emulator talab qiladi:  npm run test:rules
   Emulator ishlamayotgan bo'lsa (FIRESTORE_EMULATOR_HOST yo'q) — test o'tkazib yuboriladi.
   Ref: docs/PLAN.md P02 "Qanday tekshiriladi"; docs/RISKS.md R-S1…R-S4. */
'use strict';
const { test, describe, before, after, beforeEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const EMU = process.env.FIRESTORE_EMULATOR_HOST;
const skip = EMU ? false : 'FIRESTORE_EMULATOR_HOST yo\'q — `npm run test:rules` bilan ishga tushiring';

const ORG_A = 'uidAdminA';      // tashkilot A admini (= tashkilot ID)
const ORG_B = 'uidAdminB';      // tashkilot B admini
const EMP_A = 'uidEmpA';        // tashkilot A xodimi
const EMP_A_OFF = 'uidEmpAOff'; // tashkilot A, faolsizlantirilgan xodim
const SUPER = 'uidSuper';

const ORG_DOC = (over = {}) => ({
  inn: '123456789', phone: '+998901234567', firstName: 'Ali', lastName: 'Valiyev',
  login: 'a.valiyev', employeeCount: 3, plan: 'basic', active: false,
  paymentStatus: 'pending', registeredAt: '2026-11-13', ...over,
});

describe('firestore.rules', { skip }, () => {
  let rut, env;

  before(async () => {
    rut = require('@firebase/rules-unit-testing');
    // Kutilgan PERMISSION_DENIED xabarlari test chiqishini to'ldirmasin
    try { require('firebase/firestore').setLogLevel('silent'); } catch { /* ixtiyoriy */ }
    const [host, port] = EMU.split(':');
    env = await rut.initializeTestEnvironment({
      projectId: 'demo-noaniqlik',
      firestore: {
        rules: fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8'),
        host, port: Number(port),
      },
    });
  });

  after(async () => { if (env) await env.cleanup(); });

  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.doc(`organizations/${ORG_A}`).set(ORG_DOC({ active: true, paymentStatus: 'paid', planExpiry: '2026-12-13' }));
      await db.doc(`organizations/${ORG_B}`).set(ORG_DOC({ login: 'b.org', inn: '987654321' }));
      await db.doc(`employees/${EMP_A}`).set({ orgId: ORG_A, name: 'Emp A', role: 'r', phone: '', login: 'e.a', createdAt: '2026-11-13', active: true });
      await db.doc(`employees/${EMP_A_OFF}`).set({ orgId: ORG_A, name: 'Emp Off', role: 'r', phone: '', login: 'e.off', createdAt: '2026-11-13', active: false });
    });
  });

  const anon  = () => env.unauthenticatedContext().firestore();
  const as    = (uid, claims) => env.authenticatedContext(uid, claims).firestore();
  const superDb = () => as(SUPER, { superadmin: true });

  /* ── Anonim ─────────────────────────────────────────── */
  test('anonim: tashkilot hujjatini o\'qish rad etiladi', async () => {
    await rut.assertFails(anon().doc(`organizations/${ORG_A}`).get());
  });
  test('anonim: tashkilotlar ro\'yxatini o\'qish rad etiladi', async () => {
    await rut.assertFails(anon().collection('organizations').get());
  });
  test('anonim: xodimlar ro\'yxatini o\'qish rad etiladi', async () => {
    await rut.assertFails(anon().collection('employees').get());
  });
  test('anonim: login bo\'yicha qidirish rad etiladi', async () => {
    await rut.assertFails(anon().collection('organizations').where('login', '==', 'a.valiyev').get());
  });
  test('anonim: yozish rad etiladi', async () => {
    await rut.assertFails(anon().doc('organizations/x').set(ORG_DOC()));
  });
  test('noma\'lum kolleksiya: rad etiladi (default deny)', async () => {
    await rut.assertFails(as(ORG_A).doc('anything/else').get());
    await rut.assertFails(as(ORG_A).doc('anything/else').set({ a: 1 }));
  });

  /* ── Tashkilotlar orasida ajratish ──────────────────── */
  test('admin o\'z tashkilotini o\'qiydi', async () => {
    await rut.assertSucceeds(as(ORG_A).doc(`organizations/${ORG_A}`).get());
  });
  test('boshqa tashkilotni o\'qish rad etiladi (admin)', async () => {
    await rut.assertFails(as(ORG_A).doc(`organizations/${ORG_B}`).get());
  });
  test('boshqa tashkilotni o\'qish rad etiladi (xodim)', async () => {
    await rut.assertFails(as(EMP_A).doc(`organizations/${ORG_B}`).get());
  });
  test('faol xodim o\'z tashkilotini o\'qiydi; faolsizlantirilgan xodim o\'qiy olmaydi', async () => {
    await rut.assertSucceeds(as(EMP_A).doc(`organizations/${ORG_A}`).get());
    await rut.assertFails(as(EMP_A_OFF).doc(`organizations/${ORG_A}`).get());
  });
  test('oddiy foydalanuvchi barcha tashkilotlar ro\'yxatini ololmaydi', async () => {
    await rut.assertFails(as(ORG_A).collection('organizations').get());
  });
  test('admin faqat o\'z xodimlarini ro\'yxatlaydi', async () => {
    await rut.assertSucceeds(as(ORG_A).collection('employees').where('orgId', '==', ORG_A).get());
    await rut.assertFails(as(ORG_B).collection('employees').where('orgId', '==', ORG_A).get());
    await rut.assertFails(as(ORG_A).collection('employees').get());
  });
  test('xodim o\'z hujjatini o\'qiydi, hamkasbinikini o\'qiy olmaydi', async () => {
    await rut.assertSucceeds(as(EMP_A).doc(`employees/${EMP_A}`).get());
    await rut.assertFails(as(EMP_A).doc(`employees/${EMP_A_OFF}`).get());
  });

  /* ── O'zini aktivlashtirish ─────────────────────────── */
  test('admin o\'zini aktivlashtira olmaydi (active)', async () => {
    await rut.assertFails(as(ORG_B).doc(`organizations/${ORG_B}`).update({ active: true }));
  });
  test('admin paymentStatus / plan / planExpiry ni o\'zgartira olmaydi', async () => {
    const db = as(ORG_B);
    await rut.assertFails(db.doc(`organizations/${ORG_B}`).update({ paymentStatus: 'paid' }));
    await rut.assertFails(db.doc(`organizations/${ORG_B}`).update({ plan: 'pro' }));
    await rut.assertFails(db.doc(`organizations/${ORG_B}`).update({ planExpiry: '2099-01-01' }));
  });
  test('admin faqat tarif so\'rovini yubora oladi (requestedPlan)', async () => {
    await rut.assertSucceeds(as(ORG_B).doc(`organizations/${ORG_B}`).update({ requestedPlan: 'pro' }));
    await rut.assertFails(as(ORG_B).doc(`organizations/${ORG_B}`).update({ requestedPlan: 'free-forever' }));
  });
  test('ro\'yxatdan o\'tishda active:true bilan yaratish rad etiladi', async () => {
    await rut.assertFails(as('uidNew').doc('organizations/uidNew').set(ORG_DOC({ active: true })));
    await rut.assertFails(as('uidNew').doc('organizations/uidNew').set(ORG_DOC({ paymentStatus: 'paid' })));
    await rut.assertFails(as('uidNew').doc('organizations/uidNew').set(ORG_DOC({ planExpiry: '2099-01-01' })));
    await rut.assertFails(as('uidNew').doc('organizations/uidNew').set(ORG_DOC({ plan: 'pro' })));
  });
  test('ro\'yxatdan o\'tish: faqat o\'z UID\'i bilan, nofaol holatda', async () => {
    await rut.assertSucceeds(as('uidNew').doc('organizations/uidNew').set(ORG_DOC()));
    await rut.assertFails(as('uidNew').doc('organizations/someoneElse').set(ORG_DOC()));
  });
  test('parol / xesh maydonlari yozilmaydi', async () => {
    await rut.assertFails(as('uidNew').doc('organizations/uidNew').set(ORG_DOC({ passwordHash: 'x' })));
    await rut.assertFails(as(ORG_A).doc('employees/uidX').set({ orgId: ORG_A, name: 'X', login: 'x.x', active: true, rawPwd: 'secret' }));
    await rut.assertFails(superDb().doc(`organizations/${ORG_A}`).update({ rawPwd: 'x' }));
  });
  test('admin o\'z tashkilotini o\'chira olmaydi', async () => {
    await rut.assertFails(as(ORG_A).doc(`organizations/${ORG_A}`).delete());
  });

  /* ── Xodimlarni boshqarish ──────────────────────────── */
  test('faol tashkilot admini xodim qo\'shadi', async () => {
    await rut.assertSucceeds(as(ORG_A).doc('employees/uidNewEmp').set({
      orgId: ORG_A, name: 'New Emp', role: 'm', phone: '', login: 'n.emp', createdAt: '2026-11-13', active: true }));
  });
  test('nofaol tashkilot admini xodim qo\'sha olmaydi', async () => {
    await rut.assertFails(as(ORG_B).doc('employees/uidNewEmp').set({
      orgId: ORG_B, name: 'New Emp', login: 'n.emp', active: true }));
  });
  test('boshqa tashkilotga xodim qo\'shish / uning xodimini o\'zgartirish rad etiladi', async () => {
    await rut.assertFails(as(ORG_B).doc('employees/uidNewEmp').set({ orgId: ORG_A, name: 'X', login: 'x.x', active: true }));
    await rut.assertFails(as(ORG_B).doc(`employees/${EMP_A}`).update({ active: false }));
    await rut.assertFails(as(ORG_B).doc(`employees/${EMP_A}`).delete());
  });
  test('xodim o\'zini boshqa tashkilotga ko\'chira / qayta faollashtira olmaydi', async () => {
    await rut.assertFails(as(EMP_A).doc(`employees/${EMP_A}`).update({ orgId: ORG_B }));
    await rut.assertFails(as(EMP_A_OFF).doc(`employees/${EMP_A_OFF}`).update({ active: true }));
  });
  test('admin xodimni o\'chiradi va authCleanup yozuvini qoldiradi (batch)', async () => {
    const db = as(ORG_A);
    const b = db.batch();
    b.delete(db.doc(`employees/${EMP_A}`));
    b.set(db.doc(`authCleanup/${EMP_A}`), { orgId: ORG_A, login: 'e.a', reason: 'deleted', at: '2026-11-13' });
    await rut.assertSucceeds(b.commit());
  });
  test('authCleanup: boshqa tashkilot xodimi uchun yoki xodim o\'chirilmasdan yozish rad etiladi', async () => {
    const dbB = as(ORG_B);
    await rut.assertFails(dbB.doc(`authCleanup/${EMP_A}`).set({ orgId: ORG_B, login: 'e.a', reason: 'deleted', at: 'x' }));
    await rut.assertFails(as(ORG_A).doc(`authCleanup/${EMP_A}`).set({ orgId: ORG_A, login: 'e.a', reason: 'deleted', at: 'x' }));
    await rut.assertFails(as(ORG_A).collection('authCleanup').get());
  });

  /* ── Super-admin (custom claim) ─────────────────────── */
  test('super-admin barcha tashkilotlarni ko\'radi va aktivlashtiradi', async () => {
    await rut.assertSucceeds(superDb().collection('organizations').get());
    await rut.assertSucceeds(superDb().doc(`organizations/${ORG_B}`).update({
      active: true, paymentStatus: 'paid', plan: 'standard', planExpiry: '2026-12-13' }));
    await rut.assertSucceeds(superDb().collection('authCleanup').get());
  });
  test('claim false yoki yo\'q bo\'lsa super-admin huquqi yo\'q', async () => {
    await rut.assertFails(as(SUPER, { superadmin: false }).collection('organizations').get());
    await rut.assertFails(as(SUPER).collection('organizations').get());
    await rut.assertFails(as(SUPER, { superadmin: 'true' }).doc(`organizations/${ORG_B}`).update({ active: true }));
  });
});
