/* Brauzerda to'liq oqim (Playwright + Firebase Emulator) — P02.
   Tekshiriladi: CSP buzilishi yo'q; soxta localStorage sessiyasi ishlamaydi;
   ro'yxatdan o'tish → Firestore'da parol xeshi yo'q; aktivlanmagan admin kira
   olmaydi; tarifni mijoz o'zgartira olmaydi (faqat so'rov); xodim qo'shish
   (vaqtinchalik parol bir marta); XSS — <img src=x onerror=…> matn bo'lib chiqadi;
   super-admin — mijoz kodida parolsiz, Firebase Auth + claim.
   `npm run test:rules` (emulator) bilan ishlaydi; playwright yo'q bo'lsa — skip. */
'use strict';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const HAS_EMU = !!(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
let chromium = null;
try { ({ chromium } = require('playwright')); } catch (_) { /* skip */ }

const PROJECT = 'demo-uncertaintycalc';
const DOMAIN  = 'users.noaniqlikbazasi.firebaseapp.com';
const XSS     = '<img src=x onerror="window.__xss=1">';

const skip = !HAS_EMU ? 'emulator yo\'q — `npm run test:rules`' : (!chromium ? 'playwright o\'rnatilmagan' : false);

describe('e2e: brauzer + emulator', { skip }, () => {
  let srv, browser, ctx, base, admin;
  const cspViolations = [];
  const pageErrors = [];

  async function clearEmulators() {
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  }

  async function newPage() {
    const c = await browser.newContext();
    await c.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await c.addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
    });
    const p = await c.newPage();
    p.on('console', m => { if (/Content Security Policy/i.test(m.text())) cspViolations.push(m.text()); });
    p.on('pageerror', e => pageErrors.push(String(e)));
    p.on('dialog', d => d.accept());
    return { c, p };
  }

  async function collectCsp(p) {
    const v = await p.evaluate(() => window.__csp || []);
    cspViolations.push(...v);
  }

  before(async () => {
    await clearEmulators();
    srv = await require('../helpers/static-server').start();
    base = srv.url;
    browser = await chromium.launch();
    admin = require('../../scripts/lib/admin').init(PROJECT);
  });
  after(async () => {
    if (browser) await browser.close();
    if (srv) srv.server.close();
  });

  test('soxta localStorage sessiyasi (uc_session) hech narsa bermaydi', async () => {
    const { c, p } = await newPage();
    await p.addInitScript(() => {
      localStorage.setItem('uc_session', JSON.stringify({ role: 'admin', orgId: 'x', login: 'hacker', expiresAt: Date.now() + 1e9 }));
      localStorage.setItem('uc_sa_session', 'true');
    });
    await p.goto(base + '/index.html?emulator=1');
    await p.waitForFunction(() => window.AuthManager && AuthManager.isReady());
    assert.equal(await p.evaluate(() => AuthManager.getSession()), null);
    assert.equal(await p.isVisible('#topbar-user-badge'), false);
    await p.goto(base + '/admin.html?emulator=1');
    await p.waitForURL(/index\.html/);
    await p.goto(base + '/superadmin.html?emulator=1');
    await p.waitForTimeout(500);
    assert.equal(await p.isVisible('#sa-dashboard'), false);
    assert.equal(await p.isVisible('#sa-login-screen'), true);
    await collectCsp(p);
    await c.close();
  });

  let orgUid;
  test('ro\'yxatdan o\'tish: XSS ism matn sifatida, Firestore\'da parol/xesh yo\'q', async () => {
    const { c, p } = await newPage();
    await p.goto(base + '/index.html?emulator=1');
    await p.waitForFunction(() => window.AuthManager && AuthManager.isReady());
    await p.click('#btn-nav-login');
    await p.click('[data-auth-tab="register"]');
    await p.fill('#reg-inn', '123456789');
    await p.fill('#reg-phone', '+998901234567');
    await p.fill('#reg-firstname', XSS);
    await p.fill('#reg-lastname', 'Karimov');
    await p.fill('#reg-login', 't.karimov');
    await p.fill('#reg-pwd', 'Secret-12345');
    await p.fill('#reg-pwd2', 'Secret-12345');
    await p.click('#btn-do-register');
    await p.waitForSelector('#auth-panel-pending.active');
    const info = await p.textContent('#pending-org-info');
    assert.ok(info.includes('<img src=x'), 'XSS matn ko\'rinishida');
    assert.equal(await p.$$eval('#pending-org-info img', n => n.length), 0);
    await p.click('#pending-btn-bank');
    assert.equal(await p.$$eval('#reg-invoice-content img', n => n.length), 0);
    await p.click('#reg-invoice-close');                 // avval inline onclick edi
    assert.equal(await p.isVisible('#reg-invoice-modal'), false);
    assert.equal(await p.evaluate(() => window.__xss), undefined);

    const user = await admin.auth.getUserByEmail('t.karimov@' + DOMAIN);
    orgUid = user.uid;
    const org = (await admin.db.collection('organizations').doc(orgUid).get()).data();
    assert.equal(org.active, false);
    assert.equal(org.paymentStatus, 'pending');
    assert.equal(org.passwordHash, undefined);
    assert.equal(org.fullName, undefined);
    assert.ok(!JSON.stringify(org).includes('Secret-12345'));
    assert.equal(await p.evaluate(() => Object.keys(localStorage).filter(k => /session/.test(k)).length), 0);
    await collectCsp(p);
    await c.close();
  });

  test('aktivlanmagan admin kira olmaydi', async () => {
    const { c, p } = await newPage();
    await p.goto(base + '/index.html?emulator=1');
    await p.waitForFunction(() => window.AuthManager && AuthManager.isReady());
    const err = await p.evaluate(() => AuthManager.login('t.karimov', 'Secret-12345').then(() => null, e => e.code));
    assert.equal(err, 'auth_err_not_active');
    await c.close();
  });

  let tempPwd, empLogin;
  test('aktiv admin: tarif faqat so\'rov; xodim qo\'shish (XSS ism), parol bir marta', async () => {
    // super-admin aktivlashtirdi (Admin SDK)
    await admin.db.collection('organizations').doc(orgUid).update({ active: true, paymentStatus: 'paid', planExpiry: '2999-01-01' });
    const { c, p } = await newPage();
    await p.goto(base + '/index.html?emulator=1');
    await p.waitForFunction(() => window.AuthManager && AuthManager.isReady());
    await p.click('#btn-nav-login');
    await p.fill('#login-user', 't.karimov');
    await p.fill('#login-pwd', 'Secret-12345');
    await p.click('#btn-do-login');
    await p.waitForFunction(() => AuthManager.getSession() && AuthManager.getSession().role === 'admin');
    assert.equal(await p.evaluate(() => AuthManager.getSession().entitled), true);

    await p.goto(base + '/admin.html?emulator=1');
    await p.waitForSelector('.plan-upgrade-card[data-plan="pro"]');
    await p.click('.plan-upgrade-card[data-plan="pro"]');
    await p.waitForSelector('#plan-requested-text:not([style*="none"])');
    let org = (await admin.db.collection('organizations').doc(orgUid).get()).data();
    assert.equal(org.plan, 'basic', 'tarif o\'zgarmadi');
    assert.equal(org.requestedPlan, 'pro');

    // Mijoz konsolidan to'g'ridan-to'g'ri yozishga urinish — qoidalar rad etadi
    const denied = await p.evaluate(() => firebaseDb.collection('organizations').doc(AuthManager.getSession().orgId)
      .update({ plan: 'pro', planExpiry: '2999-12-31' }).then(() => 'ok', e => e.code));
    assert.equal(denied, 'permission-denied');

    await p.fill('#inp-emp-name', XSS + ' Valiyev');
    await p.fill('#inp-emp-phone', '+998901112233');
    await p.fill('#inp-emp-role', 'Metrolog');
    await p.click('#btn-add-emp');
    await p.waitForSelector('#emp-created-box:not([style*="none"])');
    const created = await p.textContent('#emp-created-text');
    const m = created.match(/: (\S+) · .*: (\S+)$/);
    assert.ok(m, created);
    [, empLogin, tempPwd] = m;
    await p.waitForSelector('.emp-table');
    assert.equal(await p.$$eval('.emp-table img', n => n.length), 0);
    assert.ok((await p.textContent('.emp-table')).includes('<img src=x'));
    assert.equal(await p.evaluate(() => window.__xss), undefined);
    assert.ok(!(await p.content()).includes(tempPwd) || (await p.isVisible('#emp-created-box')), 'parol faqat bir martalik qutida');

    const emps = await admin.db.collection('employees').where('orgId', '==', orgUid).get();
    assert.equal(emps.size, 1);
    const ed = emps.docs[0].data();
    assert.equal(ed.rawPwd, undefined);
    assert.equal(ed.passwordHash, undefined);
    assert.ok(!JSON.stringify(ed).includes(tempPwd));
    // admin sessiyasi almashmadi (ikkinchi app instansiyasi)
    assert.equal(await p.evaluate(() => firebaseAuth.currentUser.email), 't.karimov@' + DOMAIN);

    // sahifa yangilangach parol qayta ko'rinmaydi
    await p.reload();
    await p.waitForSelector('.emp-table');
    assert.equal((await p.content()).includes(tempPwd), false);
    await collectCsp(p);
    await c.close();
  });

  test('xodim vaqtinchalik parol bilan kiradi; kalkulyatorda XSS komponent nomi matn bo\'lib qoladi', async () => {
    const { c, p } = await newPage();
    await p.goto(base + '/index.html?emulator=1');
    await p.waitForFunction(() => window.AuthManager && AuthManager.isReady());
    await p.evaluate(([l, pw]) => AuthManager.login(l, pw), [empLogin, tempPwd]);
    const s = await p.evaluate(() => AuthManager.getSession());
    assert.equal(s.role, 'employee');
    assert.equal(s.entitled, true);


    // Kalkulyator: zichlik preseti, B tur komponent nomi = XSS
    await p.click('#btn-home-start');
    await p.selectOption('#inp-preset', 'density');
    await p.click('#btn-start');
    await p.click('.tab-btn[data-tab="typeb"]');
    await p.click('#btn-add-typeb');
    const inp = p.locator('.typeb-card input[data-field="name"]').last();
    await inp.fill(XSS);
    await inp.dispatchEvent('change');
    await p.click('.tab-btn[data-tab="results"]');
    const calcBtn = await p.$('#btn-calc-combined');
    if (calcBtn) await p.evaluate(() => document.getElementById('btn-calc-combined').click());
    await p.waitForTimeout(300);
    assert.equal(await p.$$eval('img[src="x"]', n => n.length), 0);
    assert.equal(await p.evaluate(() => window.__xss), undefined);
    assert.equal(await p.inputValue('.typeb-card input[data-field="name"] >> nth=-1'), XSS);
    // showToast ham matn sifatida
    await p.evaluate(x => window.showToast(x, 'info', 100), XSS);
    assert.equal(await p.$$eval('#toast-container img', n => n.length), 0);

    // Vaqtinchalik parolni UI orqali almashtirish, keyin yangi parol bilan kirish
    await p.click('#btn-change-pwd');
    await p.fill('#pwd-old', tempPwd);
    await p.fill('#pwd-new', 'NewPass-9876');
    await p.fill('#pwd-new2', 'NewPass-9876');
    await p.click('#pwd-save');
    await p.waitForSelector('#pwd-modal', { state: 'hidden' });
    await p.evaluate(() => AuthManager.logout());
    const oldErr = await p.evaluate(([l, pw]) => AuthManager.login(l, pw).then(() => null, e => e.code), [empLogin, tempPwd]);
    assert.equal(oldErr, 'auth_err_bad_credentials');
    await p.evaluate(([l]) => AuthManager.login(l, 'NewPass-9876'), [empLogin]);
    assert.equal(await p.evaluate(() => AuthManager.getSession().role), 'employee');
    await collectCsp(p);
    await c.close();
  });

  test('super-admin: oddiy admin kira olmaydi; claim bilan kiradi va aktivlashtiradi', async () => {
    const sa = await admin.auth.createUser({ email: 'owner@example.com', password: 'Owner-pass-123' });
    await admin.auth.setCustomUserClaims(sa.uid, { superadmin: true });
    await admin.db.collection('organizations').doc(orgUid).update({ active: false });

    const { c, p } = await newPage();
    await p.goto(base + '/superadmin.html?emulator=1');
    await p.fill('#sa-login-inp', 't.karimov');
    await p.fill('#sa-pwd-inp', 'Secret-12345');
    await p.click('#sa-btn-login');
    await p.waitForFunction(() => document.getElementById('sa-login-error').textContent.length > 0);
    assert.equal(await p.isVisible('#sa-dashboard'), false);

    await p.fill('#sa-login-inp', 'owner@example.com');
    await p.fill('#sa-pwd-inp', 'Owner-pass-123');
    await p.click('#sa-btn-login');
    await p.waitForSelector('#sa-dashboard', { state: 'visible' });
    await p.waitForSelector('button[data-action="activate"]');
    assert.equal(await p.$$eval('#sa-org-tbody img', n => n.length), 0);
    assert.ok((await p.textContent('#sa-org-tbody')).includes('<img src=x'));
    await p.click('button[data-action="activate"]');
    await p.waitForSelector('button[data-action="deactivate"]');
    await p.click('button[data-action="plan"]');
    await p.waitForFunction(() => !document.querySelector('button[data-action="plan"]'));
    const org = (await admin.db.collection('organizations').doc(orgUid).get()).data();
    assert.equal(org.active, true);
    assert.equal(org.plan, 'pro');
    assert.equal(org.requestedPlan, undefined);
    assert.equal(await p.evaluate(() => window.__xss), undefined);
    await collectCsp(p);
    await c.close();
  });

  test('hech bir sahifada CSP buzilishi va JS xatosi yo\'q', () => {
    assert.deepEqual(cspViolations, []);
    assert.deepEqual(pageErrors, []);
  });
});
