/* ═══════════════════════════════════════════════════════════════
   AUTH.JS — autentifikatsiya va xodimlar boshqaruvi (P02)
   ─────────────────────────────────────────────────────────────
   • Parollar FAQAT Firebase Authentication'da. Firestore'da parol,
     parol xeshi yoki "ochiq parol" saqlanmaydi.
   • Sessiya — Firebase Auth token'i (imzolangan, server tekshiradi).
     localStorage'ga o'zimiz hech qanday sessiya yozmaymiz; getSession()
     Auth holatidan va Firestore'dagi (qoidalar bilan himoyalangan)
     hujjatlardan hosil qilinadi.
   • Kirish: login → <login>@users.<domen> (AuthCore.loginToEmail).
   • Xodim yaratish: ikkinchi firebase.initializeApp instansiyasi —
     admin sessiyasi almashib ketmaydi (Spark tarifi, Cloud Functions yo'q).
   • Parolni tiklash: admin xodimga yangi hisob (yangi login + parol)
     yaratadi; eski Auth hisobi authCleanup/ ga yoziladi va egasi uni
     konsolda qo'lda o'chiradi (docs/SECURITY_SETUP.md, AUTH_MIGRATION.md).
═══════════════════════════════════════════════════════════════ */

const AuthManager = (() => {

  const Core  = window.AuthCore;
  const PLANS = Core.PLANS;

  // Eski versiyalar yozgan imzosiz sessiya kalitlari — o'chiriladi (R-S4).
  const LEGACY_KEYS = ['uc_session', 'uc_sa_session'];
  // Sessiyaning eng uzun muddati (avvalgi 8 soatlik TTL saqlanadi).
  const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

  let _session = null;
  let _seq = 0;
  let _suspend = false;        // ro'yxatdan o'tish / ichki amallar paytida
  let _readyResolve;
  const _ready = new Promise(r => { _readyResolve = r; });
  const _listeners = [];

  try { LEGACY_KEYS.forEach(k => localStorage.removeItem(k)); } catch { /* storage yo'q */ }

  function auth() {
    if (!window.firebaseAuth) throw new Error('Firebase Auth ulanmagan. firebase-config.js ni tekshiring.');
    return window.firebaseAuth;
  }

  function emailFor(login) {
    return Core.loginToEmail(login, LOGIN_EMAIL_DOMAIN);
  }

  function friendlyAuthError(e) {
    const code = e && e.code;
    switch (code) {
      case 'auth/invalid-email':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
        return 'Login yoki parol noto\'g\'ri';
      case 'auth/user-disabled':
        return 'Hisob bloklangan. Administrator bilan bog\'laning';
      case 'auth/too-many-requests':
        return 'Juda ko\'p urinish. Birozdan keyin qayta urinib ko\'ring';
      case 'auth/email-already-in-use':
        return 'Bu login band — boshqa login tanlang';
      case 'auth/weak-password':
        return 'Parol juda oddiy (kamida 6 belgi)';
      case 'auth/network-request-failed':
        return 'Tarmoq xatosi. Internet aloqasini tekshiring';
      case 'auth/configuration-not-found':
      case 'auth/operation-not-allowed':
        return 'Firebase Authentication (Email/Password) hali yoqilmagan — docs/SECURITY_SETUP.md';
      case 'permission-denied':
        return 'Ruxsat yo\'q (permission-denied)';
      default:
        return (e && e.message) || 'Noma\'lum xato';
    }
  }

  /* ─── SESSIYANI HOSIL QILISH ──────────────────────── */
  async function resolveSession(user) {
    if (!user) return null;
    const tok = await user.getIdTokenResult();
    const authTimeMs = Date.parse(tok.authTime);
    if (isFinite(authTimeMs) && Date.now() - authTimeMs > SESSION_MAX_AGE_MS) {
      return { expired: true };
    }
    if (tok.claims.superadmin === true) {
      return { role: 'superadmin', uid: user.uid, login: user.email, name: 'Super-admin' };
    }

    const org = await DB.get('organizations', user.uid).catch(() => undefined);
    if (org) {
      return { role: 'admin', uid: user.uid, orgId: user.uid, login: org.login,
               name: Core.orgDisplayName(org), active: org.active === true };
    }
    const emp = await DB.get('employees', user.uid).catch(() => undefined);
    if (emp) {
      let orgActive = false;
      if (emp.active) {
        const empOrg = await DB.get('organizations', emp.orgId).catch(() => undefined);
        orgActive = !!(empOrg && empOrg.active === true);
      }
      return { role: 'employee', uid: user.uid, orgId: emp.orgId, empId: user.uid,
               login: emp.login, name: emp.name, active: emp.active === true && orgActive };
    }
    return null;
  }

  function publish(session) {
    _session = session;
    _listeners.forEach(cb => { try { cb(session); } catch (e) { console.error(e); } });
  }

  async function applyUser(user) {
    const my = ++_seq;
    let s = null;
    try { s = await resolveSession(user); } catch (e) { console.error('[Auth]', e); s = null; }
    if (my !== _seq) return _session;           // eskirgan natija
    if (user && (!s || s.expired || s.active === false) && !_suspend) {
      // Hisobga tegishli faol hujjat yo'q yoki muddati o'tgan — chiqish.
      try { await auth().signOut(); } catch { /* e'tiborsiz */ }
      s = null;
    }
    if (s && (s.expired || s.active === false)) s = null;
    publish(s);
    return s;
  }

  if (window.firebaseAuth) {
    window.firebaseAuth.onAuthStateChanged(async user => {
      if (_suspend) return;
      await applyUser(user);
      _readyResolve(_session);
    });
  } else {
    _readyResolve(null);
  }

  /* ─── PUBLIC: SESSIYA ─────────────────────────────── */
  function getSession() { return _session; }
  function ready() { return _ready; }
  function onChange(cb) { _listeners.push(cb); return () => { const i = _listeners.indexOf(cb); if (i >= 0) _listeners.splice(i, 1); }; }

  async function logout() {
    try { await auth().signOut(); } finally { publish(null); }
  }

  /* ─── KIRISH ──────────────────────────────────────── */
  async function login(loginStr, password) {
    if (!loginStr || !password) throw new Error('Login va parolni kiriting');
    const lower = Core.normalizeLogin(loginStr);
    if (!Core.isValidLogin(lower)) throw new Error('Login yoki parol noto\'g\'ri');

    let cred;
    try {
      cred = await auth().signInWithEmailAndPassword(emailFor(lower), password);
    } catch (e) {
      throw new Error(friendlyAuthError(e));
    }

    const s = await resolveSession(cred.user).catch(() => null);
    if (!s || s.role === 'superadmin' || s.expired) {
      await logout();
      throw new Error(s && s.role === 'superadmin'
        ? 'Super-admin hisobi bilan superadmin.html sahifasidan kiring'
        : 'Bu hisob o\'chirilgan yoki almashtirilgan. Admin bilan bog\'laning');
    }
    if (s.active === false) {
      await logout();
      throw new Error(s.role === 'admin'
        ? 'Hisobingiz hali aktivlanmagan. To\'lovni amalga oshiring va admin bilan bog\'laning.'
        : 'Hisobingiz faolsizlantirilgan. Admin bilan bog\'laning');
    }
    await applyUser(cred.user);
    return { role: s.role };
  }

  /* ─── SUPER-ADMIN KIRISHI ─────────────────────────── */
  // Super-admin hisobi konsolda yaratiladi va claim skript bilan beriladi.
  async function loginSuperadmin(loginOrEmail, password) {
    if (!loginOrEmail || !password) throw new Error('Login va parolni kiriting');
    const v = String(loginOrEmail).trim();
    let email;
    try { email = v.includes('@') ? v : emailFor(v); }
    catch { throw new Error('Login yoki parol noto\'g\'ri'); }
    let cred;
    try {
      cred = await auth().signInWithEmailAndPassword(email, password);
    } catch (e) {
      throw new Error(friendlyAuthError(e));
    }
    const tok = await cred.user.getIdTokenResult(true);
    if (tok.claims.superadmin !== true) {
      await logout();
      throw new Error('Bu hisobda super-admin huquqi yo\'q');
    }
    await applyUser(cred.user);
    return { role: 'superadmin' };
  }

  /* ─── RO'YXATDAN O'TISH ───────────────────────────── */
  async function register({ inn, phone, firstName, lastName, login, password, employeeCount }) {
    inn = String(inn ?? '').replace(/\s/g, '');
    phone = String(phone ?? '').trim();
    firstName = String(firstName ?? '').trim();
    lastName = String(lastName ?? '').trim();
    login = Core.normalizeLogin(login);

    if (!inn || !phone || !firstName || !lastName || !login || !password) {
      throw new Error('Barcha maydonlarni to\'ldiring');
    }
    if (!/^\d{9}$/.test(inn)) throw new Error('INN 9 ta raqamdan iborat bo\'lishi kerak');
    if (!Core.isValidLogin(login)) {
      throw new Error('Login 3–32 belgi: kichik lotin harflari, raqamlar, "." "_" "-" (boshi va oxiri harf yoki raqam)');
    }
    if (password.length < 8) throw new Error('Parol kamida 8 belgidan iborat bo\'lishi kerak');

    const org = {
      inn, phone, firstName, lastName, login,
      employeeCount: Math.max(1, parseInt(employeeCount, 10) || 1),
      plan:          'basic',
      registeredAt:  new Date().toISOString().slice(0, 10),
      active:        false,      // ← to'lovdan keyin super-admin aktivlashtiradi
      paymentStatus: 'pending',
    };

    _suspend = true;
    try {
      let cred;
      try {
        cred = await auth().createUserWithEmailAndPassword(emailFor(login), password);
      } catch (e) {
        throw new Error(friendlyAuthError(e));
      }
      try {
        await DB.set('organizations', cred.user.uid, org);
      } catch (e) {
        // Yarim yaratilgan hisob qolmasin
        try { await cred.user.delete(); } catch { /* egasi authCleanup orqali */ }
        throw new Error('Tashkilotni saqlab bo\'lmadi: ' + friendlyAuthError(e));
      }
      org.id = cred.user.uid;
    } finally {
      // Sessiya OCHILMAYDI — to'lov va aktivatsiyadan keyin login qilinadi
      try { await auth().signOut(); } catch { /* e'tiborsiz */ }
      _suspend = false;
      publish(null);
    }
    return org;
  }

  /* ─── IKKINCHI APP INSTANSIYASI: YANGI AUTH HISOBI ── */
  // Admin sessiyasini almashtirmasdan boshqa foydalanuvchi yaratadi.
  async function createAccountIsolated(baseLogin, password) {
    const app = firebase.initializeApp(FIREBASE_CONFIG, 'uc-secondary-' + Date.now());
    const secAuth = app.auth();
    // Mahalliy sinov: asosiy Auth Emulator'ga ulangan bo'lsa, ikkinchisi ham
    const emu = auth().emulatorConfig;
    if (emu) secAuth.useEmulator(`${emu.protocol}://${emu.host}${emu.port ? ':' + emu.port : ''}`, { disableWarnings: true });
    try {
      await secAuth.setPersistence(firebase.auth.Auth.Persistence.NONE);
      for (let n = 1; n <= 50; n++) {
        const login = Core.loginCandidate(baseLogin, n);
        if (!Core.isValidLogin(login)) continue;
        try {
          const cred = await secAuth.createUserWithEmailAndPassword(emailFor(login), password);
          return { uid: cred.user.uid, login, user: cred.user, app };
        } catch (e) {
          if (e.code === 'auth/email-already-in-use') continue;
          throw new Error(friendlyAuthError(e));
        }
      }
      throw new Error('Bo\'sh login topilmadi');
    } catch (e) {
      await app.delete().catch(() => {});
      throw e;
    }
  }

  async function finishIsolated(acc, { rollback }) {
    try {
      if (rollback) await acc.user.delete();
    } catch { /* e'tiborsiz — authCleanup qo'lda */ }
    try { await acc.app.auth().signOut(); } catch { /* e'tiborsiz */ }
    await acc.app.delete().catch(() => {});
  }

  function requireAdmin(orgId) {
    const s = _session;
    if (!s || s.role !== 'admin' || s.orgId !== orgId) throw new Error('Faqat tashkilot admini uchun');
    return s;
  }

  /* ─── TASHKILOT XODIMLARI ────────────────────────── */
  async function getOrgEmployees(orgId) {
    return DB.getAll('employees', 'orgId', orgId);
  }

  /* ─── XODIM QO'SHISH ─────────────────────────────── */
  // Qaytaradi: { ...xodim, id, password } — parol FAQAT bir marta
  // ko'rsatish uchun xotirada; hech qayerga yozilmaydi.
  async function addEmployee(orgId, { name, role, phone }) {
    requireAdmin(orgId);
    const org = await DB.get('organizations', orgId);
    if (!org) throw new Error('Tashkilot topilmadi');
    if (org.active !== true) throw new Error('Tashkilot hali aktivlanmagan');

    const plan = PLANS[org.plan] || PLANS.basic;
    const allEmps = await getOrgEmployees(orgId);
    const activeCount = allEmps.filter(e => e.active).length;
    if (plan.maxUsers !== -1 && activeCount >= plan.maxUsers) {
      throw new Error(`Tarif limiti: "${plan.name}" rejasida maksimal ${plan.maxUsers} ta xodim`);
    }

    const parts = String(name).trim().split(/\s+/);
    const base = Core.suggestLogin(parts[0] || '', parts.slice(1).join(' '));
    const password = Core.genPassword(12);
    const acc = await createAccountIsolated(base, password);

    const emp = {
      orgId,
      name:      String(name).trim(),
      role:      String(role || '').trim(),
      phone:     String(phone || '').trim(),
      login:     acc.login,
      createdAt: new Date().toISOString().slice(0, 10),
      active:    true,
    };
    try {
      await DB.set('employees', acc.uid, emp);
    } catch (e) {
      await finishIsolated(acc, { rollback: true });
      throw new Error('Xodimni saqlab bo\'lmadi: ' + friendlyAuthError(e));
    }
    await finishIsolated(acc, { rollback: false });
    return { ...emp, id: acc.uid, password };
  }

  /* ─── XODIM PAROLINI "TIKLASH" ───────────────────── */
  // Spark tarifida boshqa foydalanuvchi parolini mijozdan o'zgartirib
  // bo'lmaydi. Shuning uchun: yangi hisob (yangi login + parol) yaratiladi,
  // eski xodim yozuvi o'chiriladi, eski Auth hisobi authCleanup/ ga yoziladi.
  async function resetEmployeePassword(orgId, empId) {
    requireAdmin(orgId);
    const old = await DB.get('employees', empId);
    if (!old || old.orgId !== orgId) throw new Error('Xodim topilmadi');

    const password = Core.genPassword(12);
    const acc = await createAccountIsolated(old.login, password);
    const today = new Date().toISOString().slice(0, 10);
    const emp = {
      orgId,
      name: old.name || '', role: old.role || '', phone: old.phone || '',
      login: acc.login, createdAt: today, active: true,
    };
    try {
      await DB.batch([
        { op: 'set',    store: 'employees',   id: acc.uid, data: emp },
        { op: 'delete', store: 'employees',   id: empId },
        { op: 'set',    store: 'authCleanup', id: empId,
          data: { orgId, login: old.login || '', reason: 'password-reset', at: today } },
      ]);
    } catch (e) {
      await finishIsolated(acc, { rollback: true });
      throw new Error('Parolni tiklab bo\'lmadi: ' + friendlyAuthError(e));
    }
    await finishIsolated(acc, { rollback: false });
    return { ...emp, id: acc.uid, password, previousLogin: old.login };
  }

  /* ─── XODIMNI FAOLSIZLASHTIRISH ─────────────────── */
  async function deactivateEmployee(orgId, empId) {
    requireAdmin(orgId);
    await DB.update('employees', empId, { active: false });
  }

  /* ─── XODIMNI O'CHIRISH ──────────────────────────── */
  // Firestore yozuvi o'chiriladi; Auth hisobi authCleanup/ ga yoziladi
  // (yozuvsiz Auth hisobi hech narsani o'qiy olmaydi — qoidalar).
  async function deleteEmployee(orgId, empId) {
    requireAdmin(orgId);
    const old = await DB.get('employees', empId);
    if (!old || old.orgId !== orgId) throw new Error('Xodim topilmadi');
    await DB.batch([
      { op: 'delete', store: 'employees',   id: empId },
      { op: 'set',    store: 'authCleanup', id: empId,
        data: { orgId, login: old.login || '', reason: 'deleted', at: new Date().toISOString().slice(0, 10) } },
    ]);
  }

  /* ─── TARIF SO'ROVI ──────────────────────────────── */
  // Tarifni (plan, planExpiry) faqat super-admin o'zgartiradi — firestore.rules.
  async function requestPlan(orgId, plan) {
    requireAdmin(orgId);
    if (!PLANS[plan]) throw new Error('Noma\'lum tarif');
    await DB.update('organizations', orgId, { requestedPlan: plan });
  }

  /* ─── TO'LOV HAVOLALARI ──────────────────────────── */
  // Produksiyada o'z merchant ID larini qo'ying (Click / Payme shaxsiy kabinet)
  function getClickUrl(amount, txId) {
    const SVC = 'CLICK_SERVICE_ID';
    const MER = 'CLICK_MERCHANT_ID';
    return `https://my.click.uz/services/pay?service_id=${SVC}&merchant_id=${MER}&amount=${encodeURIComponent(amount)}&transaction_param=${encodeURIComponent(txId)}&return_url=${encodeURIComponent(location.origin + '/admin.html')}`;
  }

  function getPaymeUrl(amount, txId) {
    const MER = 'PAYME_MERCHANT_ID';
    const p   = btoa(JSON.stringify({ m: MER, ac: { order_id: txId }, a: amount * 100 }));
    return `https://checkout.paycom.uz/${p}`;
  }

  return {
    PLANS,
    suggestLogin: Core.suggestLogin,
    genPassword: Core.genPassword,
    getSession, ready, onChange, logout,
    clearSession: logout,
    login, loginSuperadmin, register,
    getOrgEmployees, addEmployee, resetEmployeePassword, deactivateEmployee, deleteEmployee,
    requestPlan,
    getClickUrl, getPaymeUrl,
  };

})();

window.AuthManager = AuthManager;
