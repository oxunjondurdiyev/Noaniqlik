/* scripts/migrate-auth.js — emulator'da: zaxira nusxa, ma'lumot yo'qolmasligi,
   parol xeshlari/rawPwd o'chirilishi, idempotentlik. `npm run test:rules`. */
'use strict';
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HAS_EMU = !!(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
const PROJECT = 'demo-uncertaintycalc';

async function clearEmulators() {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}

async function signIn(email, password) {
  const r = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return r.ok;
}

describe('scripts/migrate-auth.js', { skip: HAS_EMU ? false : 'emulator yo\'q — `npm run test:rules`' }, () => {
  let ctx, migrate, tmp;
  const legacyOrg = {
    inn: '123456789', phone: '+998901234567', firstName: 'Ahmad', lastName: 'Karimov', fullName: 'Ahmad Karimov',
    login: 'a.karimov', passwordHash: 'deadbeef', employeeCount: 5, plan: 'standard', planExpiry: '2027-01-01',
    registeredAt: '2025-01-10', active: true, paymentStatus: 'paid', paidAt: '2025-01-11',
  };
  const legacyOrg2 = { inn: '987654321', phone: '+998907654321', fullName: 'Vali Aliyev', login: 'v.aliyev',
    passwordHash: 'beef', employeeCount: 1, plan: 'basic', registeredAt: '2025-02-01', active: false, paymentStatus: 'pending' };
  const legacyEmp = { orgId: 'ORG_AUTO_1', name: 'Ali Valiyev', role: 'Metrolog', phone: '+998900000000',
    login: 'a.valiyev', rawPwd: 'abc23456', passwordHash: 'cafe', createdAt: '2025-01-12', active: true };

  before(async () => {
    const { init } = require('../../scripts/lib/admin');
    ({ migrate } = require('../../scripts/migrate-auth'));
    ctx = init(PROJECT);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-migrate-'));
    await clearEmulators();
    await ctx.db.collection('organizations').doc('ORG_AUTO_1').set(legacyOrg);
    await ctx.db.collection('organizations').doc('ORG_AUTO_2').set(legacyOrg2);
    await ctx.db.collection('employees').doc('EMP_AUTO_1').set(legacyEmp);
  });

  test('dry-run: zaxira yoziladi, ma\'lumot o\'zgarmaydi', async () => {
    const rep = await migrate(ctx, { apply: false, outDir: path.join(tmp, 'b0'), pwDir: path.join(tmp, 'pw'), log: () => {} });
    const backup = JSON.parse(fs.readFileSync(rep.backupFile, 'utf8'));
    assert.equal(backup.collections.organizations.length, 2);
    assert.equal(backup.collections.employees.length, 1);
    const org = (await ctx.db.collection('organizations').doc('ORG_AUTO_1').get()).data();
    assert.equal(org.passwordHash, 'deadbeef');
    assert.equal((await ctx.auth.listUsers()).users.length, 0);
  });

  let report;
  test('apply: avval to\'liq zaxira, keyin ko\'chirish', async () => {
    report = await migrate(ctx, { apply: true, outDir: path.join(tmp, 'b1'), pwDir: path.join(tmp, 'pw'), log: () => {} });
    const backup = JSON.parse(fs.readFileSync(report.backupFile, 'utf8'));
    const bOrg = backup.collections.organizations.find(o => o.id === 'ORG_AUTO_1').data;
    assert.deepEqual(bOrg, legacyOrg, 'zaxirada asl hujjat aynan');
    assert.deepEqual(backup.collections.employees[0].data, legacyEmp);
    assert.equal((fs.statSync(report.backupFile).mode & 0o777), 0o600);
  });

  test('tashkilotlar: ownerUid, xeshlar o\'chirildi, qolgan maydonlar saqlandi', async () => {
    const org = (await ctx.db.collection('organizations').doc('ORG_AUTO_1').get()).data();
    assert.ok(org.ownerUid);
    assert.equal(org.passwordHash, undefined);
    assert.equal(org.fullName, undefined);
    for (const k of ['inn', 'phone', 'firstName', 'lastName', 'login', 'employeeCount', 'plan', 'planExpiry', 'registeredAt', 'active', 'paymentStatus', 'paidAt']) {
      assert.deepEqual(org[k], legacyOrg[k], k);
    }
    const org2 = (await ctx.db.collection('organizations').doc('ORG_AUTO_2').get()).data();
    assert.equal(org2.firstName, 'Vali');      // fullName → firstName/lastName
    assert.equal(org2.lastName, 'Aliyev');
    assert.equal(org2.fullName, undefined);
    const u = await ctx.auth.getUser(org.ownerUid);
    assert.equal(u.email, 'a.karimov@users.noaniqlikbazasi.firebaseapp.com');
  });

  test('xodimlar: employees/{uid} ga ko\'chdi, rawPwd/passwordHash yo\'q, eski hujjat o\'chdi', async () => {
    assert.equal((await ctx.db.collection('employees').doc('EMP_AUTO_1').get()).exists, false);
    const all = await ctx.db.collection('employees').get();
    assert.equal(all.size, 1);
    const emp = all.docs[0];
    const u = await ctx.auth.getUser(emp.id);
    assert.equal(u.email, 'a.valiyev@users.noaniqlikbazasi.firebaseapp.com');
    const d = emp.data();
    assert.equal(d.rawPwd, undefined);
    assert.equal(d.passwordHash, undefined);
    for (const k of ['orgId', 'name', 'role', 'phone', 'login', 'createdAt', 'active']) assert.deepEqual(d[k], legacyEmp[k], k);
  });

  test('vaqtinchalik parollar faylga yozildi va ishlaydi (eski parol emas)', async () => {
    assert.ok(report.passwordFile);
    assert.equal((fs.statSync(report.passwordFile).mode & 0o777), 0o600);
    const rows = fs.readFileSync(report.passwordFile, 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
    assert.equal(rows.length, 3);
    for (const [login, pwd] of rows) {
      assert.ok(await signIn(`${login}@users.noaniqlikbazasi.firebaseapp.com`, pwd), login);
    }
    assert.equal(await signIn('a.valiyev@users.noaniqlikbazasi.firebaseapp.com', legacyEmp.rawPwd), false, 'eski rawPwd ishlamaydi');
  });

  test('restore-backup: zaxiradan asl hujjat aynan qaytadi', async () => {
    const { restore } = require('../../scripts/restore-backup');
    const n = await restore(ctx, { file: report.backupFile, apply: true, collections: ['organizations'], log: () => {} });
    assert.equal(n, 2);
    const org = (await ctx.db.collection('organizations').doc('ORG_AUTO_1').get()).data();
    assert.deepEqual(org, legacyOrg);
    // keyingi testlar uchun qayta migratsiya
    await migrate(ctx, { apply: true, outDir: path.join(tmp, 'b3'), pwDir: path.join(tmp, 'pw3'), log: () => {} });
  });

  test('takroriy ishga tushirish — o\'zgarish yo\'q (idempotent)', async () => {
    const before = (await ctx.auth.listUsers()).users.length;
    const rep2 = await migrate(ctx, { apply: true, outDir: path.join(tmp, 'b2'), pwDir: path.join(tmp, 'pw2'), log: () => {} });
    assert.equal(rep2.orgs.length, 0);
    assert.equal(rep2.employees.length, 0);
    assert.equal((await ctx.auth.listUsers()).users.length, before);
  });
});
