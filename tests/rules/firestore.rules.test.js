/* Firestore qoidalari testlari (P02). Firebase Emulator talab qiladi:
     npm run test:rules
   Oddiy `npm test` da emulator bo'lmasa — skip (FIRESTORE_EMULATOR_HOST yo'q). */
'use strict';
const { test, describe, before, after, beforeEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const HAS_EMU = !!process.env.FIRESTORE_EMULATOR_HOST;
const fsMod = HAS_EMU ? require('firebase/firestore') : {};
const { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, deleteField } = fsMod;
const PROJECT = 'demo-uncertaintycalc';
const DOMAIN  = 'users.noaniqlikbazasi.firebaseapp.com';

describe('firestore.rules', { skip: HAS_EMU ? false : 'FIRESTORE_EMULATOR_HOST yo\'q — `npm run test:rules` bilan ishga tushiring' }, () => {
  let RUT, env;

  const ownerUid = 'owner1', otherOwner = 'owner2', empUid = 'emp1', saUid = 'sa1', saClaimUid = 'sa2';
  const today = new Date().toISOString().slice(0, 10);

  const newOrg = (uid, login, over = {}) => Object.assign({
    inn: '123456789', phone: '+998901234567', firstName: 'Ahmad', lastName: 'Karimov',
    login, employeeCount: 3, ownerUid: uid, registeredAt: today,
    plan: 'basic', active: false, paymentStatus: 'pending',
  }, over);

  const as = (uid, login, claims = {}) =>
    env.authenticatedContext(uid, Object.assign({ email: `${login}@${DOMAIN}` }, claims)).firestore();
  const anon = () => env.unauthenticatedContext().firestore();

  before(async () => {
    RUT = require('@firebase/rules-unit-testing');
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    env = await RUT.initializeTestEnvironment({
      projectId: PROJECT,
      firestore: { rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8'), host, port: Number(port) },
    });
  });
  after(async () => { if (env) await env.cleanup(); });

  beforeEach(async () => {
    await env.clearFirestore();
    // Boshlang'ich ma'lumot — qoidalarni chetlab o'tib
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'organizations', ownerUid), newOrg(ownerUid, 'a.karimov', { active: true, paymentStatus: 'paid', planExpiry: '2999-01-01' }));
      await setDoc(doc(db, 'organizations', otherOwner), newOrg(otherOwner, 'b.other', { active: true, paymentStatus: 'paid' }));
      // Eski (migratsiya qilingan) tashkilot: auto-ID + ownerUid
      await setDoc(doc(db, 'organizations', 'legacyAutoId'), newOrg('owner3', 'c.legacy', { active: true }));
      await setDoc(doc(db, 'employees', empUid), { orgId: ownerUid, name: 'Ali Valiyev', role: 'Metrolog', phone: '+998900000000', login: 'a.valiyev', createdAt: today, active: true });
      await setDoc(doc(db, 'admins', saUid), { note: 'konsoldan yaratilgan' });
      // To'lov kutilayotgan (aktiv emas) tashkilot
      await setDoc(doc(db, 'organizations', 'pendU'), newOrg('pendU', 'p.user'));
    });
  });


  /* ── Anonim ── */
  test('anonim: tashkilotni o\'qiy olmaydi', async () => {
    await RUT.assertFails(getDoc(doc(anon(), 'organizations', ownerUid)));
  });
  test('anonim: tashkilotlar ro\'yxatini ola olmaydi', async () => {
    await RUT.assertFails(getDocs(collection(anon(), 'organizations')));
  });
  test('anonim: xodimlarni o\'qiy olmaydi', async () => {
    await RUT.assertFails(getDocs(collection(anon(), 'employees')));
  });
  test('anonim: yoza olmaydi', async () => {
    await RUT.assertFails(setDoc(doc(anon(), 'organizations', 'x'), newOrg('x', 'x')));
  });
  test('noma\'lum kolleksiya: rad', async () => {
    await RUT.assertFails(getDoc(doc(as(ownerUid, 'a.karimov'), 'secrets', 'x')));
  });

  /* ── Ro'yxatdan o'tish ── */
  test('yangi admin: o\'z uid ostida pending tashkilot yarata oladi', async () => {
    await RUT.assertSucceeds(setDoc(doc(as('newU', 'n.user'), 'organizations', 'newU'), newOrg('newU', 'n.user')));
  });
  test('yangi admin: o\'zini aktiv qilib yarata olmaydi', async () => {
    await RUT.assertFails(setDoc(doc(as('newU', 'n.user'), 'organizations', 'newU'), newOrg('newU', 'n.user', { active: true })));
  });
  test('yangi admin: paymentStatus=paid bilan yarata olmaydi', async () => {
    await RUT.assertFails(setDoc(doc(as('newU', 'n.user'), 'organizations', 'newU'), newOrg('newU', 'n.user', { paymentStatus: 'paid' })));
  });
  test('yangi admin: pro tarif yoki planExpiry bilan yarata olmaydi', async () => {
    const db = as('newU', 'n.user');
    await RUT.assertFails(setDoc(doc(db, 'organizations', 'newU'), newOrg('newU', 'n.user', { plan: 'pro' })));
    await RUT.assertFails(setDoc(doc(db, 'organizations', 'newU'), newOrg('newU', 'n.user', { planExpiry: '2999-01-01' })));
  });
  test('yangi admin: passwordHash/rawPwd/fullName maydonlari rad etiladi', async () => {
    const db = as('newU', 'n.user');
    await RUT.assertFails(setDoc(doc(db, 'organizations', 'newU'), newOrg('newU', 'n.user', { passwordHash: 'abc' })));
    await RUT.assertFails(setDoc(doc(db, 'organizations', 'newU'), newOrg('newU', 'n.user', { fullName: 'A K' })));
  });
  test('yangi admin: boshqa uid ostida yoki boshqa ownerUid bilan yarata olmaydi', async () => {
    const db = as('newU', 'n.user');
    await RUT.assertFails(setDoc(doc(db, 'organizations', 'someoneElse'), newOrg('newU', 'n.user')));
    await RUT.assertFails(setDoc(doc(db, 'organizations', 'newU'), newOrg('someoneElse', 'n.user')));
  });
  test('yangi admin: login Auth email\'iga mos bo\'lishi shart', async () => {
    await RUT.assertFails(setDoc(doc(as('newU', 'n.user'), 'organizations', 'newU'), newOrg('newU', 'boshqa.login')));
  });

  /* ── O'z tashkiloti ── */
  test('admin: o\'z tashkilotini o\'qiydi', async () => {
    await RUT.assertSucceeds(getDoc(doc(as(ownerUid, 'a.karimov'), 'organizations', ownerUid)));
  });
  test('admin: ownerUid bo\'yicha so\'rov (eski auto-ID tashkilot ham)', async () => {
    const db = as('owner3', 'c.legacy');
    const snap = await RUT.assertSucceeds(getDocs(query(collection(db, 'organizations'), where('ownerUid', '==', 'owner3'))));
    assert.equal(snap.size, 1);
  });
  test('admin: boshqa tashkilotni o\'qiy olmaydi', async () => {
    await RUT.assertFails(getDoc(doc(as(ownerUid, 'a.karimov'), 'organizations', otherOwner)));
  });
  test('admin: barcha tashkilotlar ro\'yxatini ola olmaydi', async () => {
    await RUT.assertFails(getDocs(collection(as(ownerUid, 'a.karimov'), 'organizations')));
  });

  /* ── Himoyalangan maydonlar (R-15) ── */
  // Qiymatlar joriy qiymatdan FARQLI bo'lishi kerak (aks holda diff bo'sh — no-op)
  for (const [field, value] of [['active', true], ['paymentStatus', 'paid'], ['plan', 'pro'], ['planExpiry', '2999-12-31'],
                                ['ownerUid', 'hacker'], ['paidAt', today], ['activatedAt', today], ['inn', '999999999'], ['login', 'x']]) {
    test(`pending admin: ${field} ni o'zgartira olmaydi`, async () => {
      const db = as('pendU', 'p.user');
      await RUT.assertFails(updateDoc(doc(db, 'organizations', 'pendU'), { [field]: value }));
    });
  }
  test('aktiv admin: o\'zini bloklab/qayta tarif o\'zgartira olmaydi', async () => {
    const db = as(otherOwner, 'b.other');
    await RUT.assertFails(updateDoc(doc(db, 'organizations', otherOwner), { active: false }));
    await RUT.assertFails(updateDoc(doc(db, 'organizations', otherOwner), { paymentStatus: 'pending' }));
    await RUT.assertFails(updateDoc(doc(db, 'organizations', otherOwner), { plan: 'pro' }));
  });
  test('pending admin: o\'zini aktivlashtira olmaydi', async () => {
    const db = as('newU', 'n.user');
    await RUT.assertSucceeds(setDoc(doc(db, 'organizations', 'newU'), newOrg('newU', 'n.user')));
    await RUT.assertFails(updateDoc(doc(db, 'organizations', 'newU'), { active: true }));
    await RUT.assertFails(updateDoc(doc(db, 'organizations', 'newU'), { paymentStatus: 'paid', active: true }));
  });
  test('admin: tarif so\'rovi (requestedPlan) yubora oladi', async () => {
    await RUT.assertSucceeds(updateDoc(doc(as(ownerUid, 'a.karimov'), 'organizations', ownerUid), { requestedPlan: 'pro' }));
  });
  test('admin: noto\'g\'ri requestedPlan rad etiladi', async () => {
    await RUT.assertFails(updateDoc(doc(as(ownerUid, 'a.karimov'), 'organizations', ownerUid), { requestedPlan: 'unlimited' }));
  });
  test('admin: telefonni o\'zgartira oladi', async () => {
    await RUT.assertSucceeds(updateDoc(doc(as(ownerUid, 'a.karimov'), 'organizations', ownerUid), { phone: '+998911111111' }));
  });
  test('admin: tashkilotni o\'chira olmaydi', async () => {
    await RUT.assertFails(deleteDoc(doc(as(ownerUid, 'a.karimov'), 'organizations', ownerUid)));
  });
  test('boshqa admin: begona tashkilotga yoza olmaydi', async () => {
    await RUT.assertFails(updateDoc(doc(as(otherOwner, 'b.other'), 'organizations', ownerUid), { phone: '1' }));
  });

  /* ── Xodimlar ── */
  const newEmp = (orgId, over = {}) => Object.assign({ orgId, name: 'Yangi Xodim', role: 'Metrolog', phone: '+998901112233', login: 'y.xodim', createdAt: today, active: true }, over);

  test('admin: o\'z tashkilotiga xodim qo\'sha oladi', async () => {
    await RUT.assertSucceeds(setDoc(doc(as(ownerUid, 'a.karimov'), 'employees', 'emp2'), newEmp(ownerUid)));
  });
  test('admin: rawPwd/passwordHash bilan xodim yozib bo\'lmaydi', async () => {
    const db = as(ownerUid, 'a.karimov');
    await RUT.assertFails(setDoc(doc(db, 'employees', 'emp2'), newEmp(ownerUid, { rawPwd: 'abc12345' })));
    await RUT.assertFails(setDoc(doc(db, 'employees', 'emp2'), newEmp(ownerUid, { passwordHash: 'abc' })));
  });
  test('admin: boshqa tashkilotga xodim qo\'sha olmaydi', async () => {
    await RUT.assertFails(setDoc(doc(as(ownerUid, 'a.karimov'), 'employees', 'emp2'), newEmp(otherOwner)));
  });
  test('pending (aktiv emas) admin: xodim qo\'sha olmaydi', async () => {
    const db = as('newU', 'n.user');
    await RUT.assertSucceeds(setDoc(doc(db, 'organizations', 'newU'), newOrg('newU', 'n.user')));
    await RUT.assertFails(setDoc(doc(db, 'employees', 'empX'), newEmp('newU')));
  });
  test('admin: o\'z tashkiloti xodimlari ro\'yxati', async () => {
    const db = as(ownerUid, 'a.karimov');
    const snap = await RUT.assertSucceeds(getDocs(query(collection(db, 'employees'), where('orgId', '==', ownerUid))));
    assert.equal(snap.size, 1);
  });
  test('admin: boshqa tashkilot xodimlari ro\'yxati rad', async () => {
    await RUT.assertFails(getDocs(query(collection(as(otherOwner, 'b.other'), 'employees'), where('orgId', '==', ownerUid))));
  });
  test('admin: filtrsiz xodimlar ro\'yxati rad', async () => {
    await RUT.assertFails(getDocs(collection(as(ownerUid, 'a.karimov'), 'employees')));
  });
  test('admin: xodimni faolsizlantira va o\'chira oladi; orgId ni o\'zgartira olmaydi', async () => {
    const db = as(ownerUid, 'a.karimov');
    await RUT.assertFails(updateDoc(doc(db, 'employees', empUid), { orgId: otherOwner }));
    await RUT.assertSucceeds(updateDoc(doc(db, 'employees', empUid), { active: false }));
    await RUT.assertSucceeds(deleteDoc(doc(db, 'employees', empUid)));
  });
  test('boshqa admin: begona xodimni o\'chira olmaydi', async () => {
    await RUT.assertFails(deleteDoc(doc(as(otherOwner, 'b.other'), 'employees', empUid)));
  });
  test('xodim: o\'z hujjatini va tashkilotini o\'qiydi', async () => {
    const db = as(empUid, 'a.valiyev');
    await RUT.assertSucceeds(getDoc(doc(db, 'employees', empUid)));
    await RUT.assertSucceeds(getDoc(doc(db, 'organizations', ownerUid)));
  });
  test('xodim: boshqa tashkilotni o\'qiy olmaydi', async () => {
    await RUT.assertFails(getDoc(doc(as(empUid, 'a.valiyev'), 'organizations', otherOwner)));
  });
  test('xodim: o\'zini qayta aktivlashtira yoki tashkilotni o\'zgartira olmaydi', async () => {
    const db = as(empUid, 'a.valiyev');
    await RUT.assertFails(updateDoc(doc(db, 'employees', empUid), { active: true }));
    await RUT.assertFails(updateDoc(doc(db, 'organizations', ownerUid), { phone: '1' }));
  });
  test('faolsizlantirilgan xodim: tashkilotni o\'qiy olmaydi', async () => {
    await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'employees', empUid), { active: false }));
    await RUT.assertFails(getDoc(doc(as(empUid, 'a.valiyev'), 'organizations', ownerUid)));
  });

  /* ── Super-admin ── */
  test('admins/{uid}: o\'z belgisini o\'qiydi, boshqanikini emas, yoza olmaydi', async () => {
    await RUT.assertSucceeds(getDoc(doc(as(saUid, 'owner'), 'admins', saUid)));
    await RUT.assertFails(getDoc(doc(as(ownerUid, 'a.karimov'), 'admins', saUid)));
    await RUT.assertFails(setDoc(doc(as(ownerUid, 'a.karimov'), 'admins', ownerUid), { x: 1 }));
    await RUT.assertFails(getDocs(collection(as(saUid, 'owner'), 'admins')));
  });
  test('super-admin (admins hujjati): barcha tashkilotlarni ko\'radi va aktivlashtiradi', async () => {
    const db = as(saUid, 'owner');
    await RUT.assertSucceeds(getDocs(collection(db, 'organizations')));
    await RUT.assertSucceeds(updateDoc(doc(db, 'organizations', otherOwner), { active: false, paymentStatus: 'paid', plan: 'pro', planExpiry: '2027-01-01', requestedPlan: deleteField() }));
  });
  test('super-admin (custom claim): ruxsat', async () => {
    const db = as(saClaimUid, 'owner2', { superadmin: true });
    await RUT.assertSucceeds(getDocs(collection(db, 'organizations')));
    await RUT.assertSucceeds(updateDoc(doc(db, 'organizations', ownerUid), { active: true }));
  });
  test('soxta claim (superadmin: "true" satr) ishlamaydi', async () => {
    await RUT.assertFails(getDocs(collection(as('fake', 'fake', { superadmin: 'true' }), 'organizations')));
  });
});
