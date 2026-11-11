/* ═══════════════════════════════════════════════════════════════
   AUTH.JS — Autentifikatsiya va xodimlar boshqaruvi (P02)
   ─────────────────────────────────────────────────────────────
   • Parollar FAQAT Firebase Authentication'da. Mijoz kodida xesh,
     rawPwd yoki parol saqlanmaydi (RISKS R-S1, R-S3).
   • Sessiya — Firebase Auth holati (imzolangan ID token), localStorage
     dagi uc_session emas (RISKS R-S4).
   • Rol va tarif holati Firestore'dagi qoidalar bilan himoyalangan
     hujjatlardan o'qiladi (firestore.rules, RISKS R-15).
   • Login → sun'iy email: login@AUTH_EMAIL_DOMAIN (firebase-config.js).
═══════════════════════════════════════════════════════════════ */

const AuthManager = (() => {

  /* ─── OBUNA REJALARI (faqat ko'rsatish uchun) ─────── */
  const PLANS = {
    basic:    { name: "Boshlang'ich", maxUsers: 5,  priceMonthly: 99000  },
    standard: { name: 'Standart',      maxUsers: 20, priceMonthly: 299000 },
    pro:      { name: 'Pro',           maxUsers: -1, priceMonthly: 599000 },
  };

  const MIN_PASSWORD = 8;
  const LOGIN_RE     = /^[a-z0-9][a-z0-9._-]{1,39}$/;

  /* ─── XATO (i18n kodi bilan) ──────────────────────── */
  // i18n.js yuklanmagan sahifada ham (masalan, admin.html tilsiz) — o'zbekcha matn
  const FALLBACK = (window.AUTH_I18N && window.AUTH_I18N.uz) || {};

  function tr(key, vars) {
    let s = (window.i18n && typeof i18n.t === 'function') ? i18n.t(key) : key;
    if (s === key) s = FALLBACK[key] || key;
    if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(String(vars[k])); });
    return s;
  }

  function authError(code, vars) {
    const e = new Error(tr(code, vars));
    e.code = code;
    return e;
  }

  /** Firebase xato kodini foydalanuvchi xabariga aylantiradi. */
  function mapFirebaseError(err) {
    const c = err && err.code || '';
    if (c === 'auth/wrong-password' || c === 'auth/user-not-found' ||
        c === 'auth/invalid-credential' || c === 'auth/invalid-login-credentials' ||
        c === 'auth/invalid-email') return authError('auth_err_bad_credentials');
    if (c === 'auth/email-already-in-use') return authError('auth_err_login_taken');
    if (c === 'auth/weak-password')        return authError('auth_err_pwd_len');
    if (c === 'auth/too-many-requests')    return authError('auth_err_too_many');
    if (c === 'auth/network-request-failed' || c === 'unavailable') return authError('auth_err_network');
    if (c === 'permission-denied')         return authError('auth_err_permission');
    if (err && /^auth_err_/.test(c))       return err;
    const e = authError('auth_err_unknown');
    e.cause = err;
    return e;
  }

  /* ─── YORDAMCHI ───────────────────────────────────── */
  function auth() {
    if (!window.firebaseAuth) throw new Error('Firebase Auth ulanmagan');
    return window.firebaseAuth;
  }
  function today() { return new Date().toISOString().slice(0, 10); }
  function normLogin(s) { return String(s || '').trim().toLowerCase(); }
  function loginToEmail(login) {
    const l = normLogin(login);
    return l.includes('@') ? l : l + '@' + AUTH_EMAIL_DOMAIN;
  }
  function emailToLogin(email) { return String(email || '').split('@')[0]; }

  /* ─── TASODIFIY PAROL (vaqtinchalik, faqat bir marta ko'rsatiladi) ── */
  function genPassword(len = 12) {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    // rad etish usuli — modulo og'ishisiz
    const out = [];
    while (out.length < len) {
      const buf = crypto.getRandomValues(new Uint8Array(len * 2));
      for (const b of buf) {
        if (b < 256 - (256 % chars.length)) out.push(chars[b % chars.length]);
        if (out.length === len) break;
      }
    }
    return out.join('');
  }

  /* ─── TRANSLITERATSIYA ────────────────────────────── */
  function translit(str) {
    const map = {
      'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'j','з':'z',
      'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
      'с':'s','т':'t','у':'u','ф':'f','х':'x','ц':'ts','ч':'ch','ш':'sh','щ':'sh',
      'ъ':'','ы':'i','ь':'','э':'e','ю':'yu','я':'ya',
      'ğ':'g','ş':'sh','ç':'ch','ı':'i','ö':'o','ü':'u',
    };
    return str.toLowerCase()
      .split('')
      .map(c => map[c] ?? (/[a-z0-9]/.test(c) ? c : ''))
      .join('');
  }

  /* ─── LOGIN TAVSIYASI ─────────────────────────────── */
  // "Ahmad" + "Karimov" → "a.karimov"
  function suggestLogin(firstName, lastName) {
    const f = translit(String(firstName || '').trim());
    const l = translit(String(lastName || '').trim());
    if (f && l) return f[0] + '.' + l;
    if (l)      return l;
    if (f)      return f;
    return 'user';
  }

  /* ═══ SESSIYA — Firebase Auth holati ════════════════
     getSession() — sinxron, oxirgi aniqlangan holat (yoki null):
       { uid, role: 'admin'|'employee', orgId, login, name,
         org, entitled }  — entitled: tashkilot aktiv va muddati o'tmagan
     Bu obyekt xotirada; localStorage'ga yozilmaydi.          */
  let current   = null;
  let ready     = false;
  const listeners = new Set();
  let readyResolve;
  const readyPromise = new Promise(r => { readyResolve = r; });

  function isEntitled(org) {
    if (!org || org.active !== true) return false;
    return !org.planExpiry || String(org.planExpiry) >= today();
  }

  /** Foydalanuvchi profilini Firestore'dan aniqlaydi (qoidalar bilan himoyalangan). */
  async function resolveProfile(user) {
    const login = emailToLogin(user.email);

    // 1) Tashkilot egasi (admin)
    const org = await DB.getByIndex('organizations', 'ownerUid', user.uid);
    if (org) {
      return {
        uid: user.uid, role: 'admin', orgId: org.id, login,
        name: [org.firstName, org.lastName].filter(Boolean).join(' ') || login,
        org, entitled: isEntitled(org),
      };
    }

    // 2) Xodim
    const emp = await DB.get('employees', user.uid);
    if (emp) {
      if (emp.active !== true) throw authError('auth_err_emp_inactive');
      const empOrg = await DB.get('organizations', emp.orgId);
      if (!empOrg) throw authError('auth_err_org_not_found');
      return {
        uid: user.uid, role: 'employee', orgId: emp.orgId, login,
        name: emp.name || login, org: empOrg, entitled: isEntitled(empOrg),
      };
    }

    throw authError('auth_err_no_profile');
  }

  function notify() { listeners.forEach(cb => { try { cb(current); } catch (e) { console.error(e); } }); }

  let lastProfileError = null;
  let suppressListener = 0;   // ro'yxatdan o'tish paytida (org hali yozilmagan)

  function startAuthListener() {
    if (!window.firebaseAuth) {         // SDK yuklanmagan — anonim rejim
      ready = true; readyResolve(null); return;
    }
    firebaseAuth.onAuthStateChanged(async user => {
      if (suppressListener > 0) return;
      lastProfileError = null;
      if (!user) {
        current = null;
      } else {
        try {
          const p = await resolveProfile(user);
          // Aktivlanmagan tashkilot admini tizimga kirmaydi (oldingi xatti-harakat)
          if (p.role === 'admin' && p.org.active !== true) throw authError('auth_err_not_active');
          current = p;
        } catch (e) {
          lastProfileError = e.code ? e : mapFirebaseError(e);
          current = null;
          try { await firebaseAuth.signOut(); } catch (_) {}
        }
      }
      ready = true;
      readyResolve(current);
      notify();
    });
  }

  function getSession()  { return current; }
  function isReady()     { return ready; }
  function whenReady()   { return readyPromise; }
  function onChange(cb)  { listeners.add(cb); if (ready) cb(current); return () => listeners.delete(cb); }

  /* ─── KIRISH ──────────────────────────────────────── */
  async function login(loginStr, password) {
    if (!loginStr || !password) throw authError('auth_err_fill_all');
    let cred;
    try {
      cred = await auth().signInWithEmailAndPassword(loginToEmail(loginStr), password);
    } catch (e) { throw mapFirebaseError(e); }

    // Profilni aniqlash (onAuthStateChanged bilan bir xil mantiq)
    let p;
    try {
      p = await resolveProfile(cred.user);
      if (p.role === 'admin' && p.org.active !== true) throw authError('auth_err_not_active');
    } catch (e) {
      try { await auth().signOut(); } catch (_) {}
      throw e.code && /^auth_err_/.test(e.code) ? e : mapFirebaseError(e);
    }
    current = p; ready = true; notify();
    return { role: p.role, org: p.org };
  }

  async function logout() {
    current = null;
    try { await auth().signOut(); } finally { notify(); }
  }

  /* ─── RO'YXATDAN O'TISH ───────────────────────────── */
  async function register({ inn, phone, firstName, lastName, login, password, employeeCount }) {
    inn = String(inn || '').replace(/\s/g, '');
    login = normLogin(login);
    if (!inn || !phone || !firstName || !lastName || !login || !password) throw authError('auth_err_fill_all');
    if (!/^\d{9}$/.test(inn))         throw authError('auth_err_inn');
    if (!LOGIN_RE.test(login))        throw authError('auth_err_login_format');
    if (password.length < MIN_PASSWORD) throw authError('auth_err_pwd_len');

    const email = loginToEmail(login);
    suppressListener++;
    try {
      return await registerInner(email, login, { inn, phone, firstName, lastName, password, employeeCount });
    } finally {
      suppressListener--;
    }
  }

  async function registerInner(email, login, { inn, phone, firstName, lastName, password, employeeCount }) {
    let user;
    try {
      user = (await auth().createUserWithEmailAndPassword(email, password)).user;
    } catch (e) {
      if (e.code !== 'auth/email-already-in-use') throw mapFirebaseError(e);
      // Oldingi urinishda Auth hisobi yaratilgan-u, tashkilot yozilmay qolgan bo'lishi mumkin
      try { user = (await auth().signInWithEmailAndPassword(email, password)).user; }
      catch (_) { throw authError('auth_err_login_taken'); }
    }

    const org = {
      inn,
      phone:         String(phone).trim().slice(0, 20),
      firstName:     String(firstName).trim().slice(0, 60),
      lastName:      String(lastName).trim().slice(0, 60),
      login,
      ownerUid:      user.uid,
      employeeCount: Math.min(999, Math.max(1, parseInt(employeeCount, 10) || 1)),
      registeredAt:  today(),
      // Himoyalangan maydonlar — faqat boshlang'ich qiymat; keyin faqat super-admin
      plan:          'basic',
      active:        false,
      paymentStatus: 'pending',
    };

    try {
      const existing = await DB.get('organizations', user.uid);
      if (existing) throw authError('auth_err_already_registered');
      await DB.create('organizations', user.uid, org);
    } catch (e) {
      try { await auth().signOut(); } catch (_) {}
      throw e.code && /^auth_err_/.test(e.code) ? e : mapFirebaseError(e);
    }
    // Sessiya OCHILMAYDI — to'lov va aktivatsiyadan keyin login qilinadi
    try { await auth().signOut(); } catch (_) {}
    return { id: user.uid, ...org };
  }

  /* ─── XODIM QO'SHISH (faqat tashkilot admini) ────── */
  // Ikkinchi Firebase ilova instansiyasi — admin sessiyasi almashmasligi uchun.
  function secondaryAuth() {
    const name = 'uc-secondary';
    const app = firebase.apps.find(a => a.name === name) ||
                firebase.initializeApp(firebase.app().options, name);   // asosiy ilova sozlamalari
    const a = app.auth();
    if (window.UC_EMULATOR && !a.emulatorConfig) a.useEmulator('http://127.0.0.1:9099');
    return a;
  }

  /** @returns {Promise<{employee:object, tempPassword:string}>}
   *  tempPassword faqat qaytariladi va UI'da BIR MARTA ko'rsatiladi; hech qayerga yozilmaydi. */
  async function addEmployee({ name, role, phone }) {
    const s = current;
    if (!s || s.role !== 'admin') throw authError('auth_err_permission');
    const org = await DB.get('organizations', s.orgId);
    if (!org) throw authError('auth_err_org_not_found');
    if (org.active !== true) throw authError('auth_err_not_active');

    const plan = PLANS[org.plan] || PLANS.basic;
    const allEmps = await DB.getAll('employees', 'orgId', s.orgId);
    const activeCount = allEmps.filter(e => e.active).length;
    // Eslatma: limit qoidalarda emas, mijozda tekshiriladi (docs/RISKS.md, qolgan xavf)
    if (plan.maxUsers !== -1 && activeCount >= plan.maxUsers) {
      throw authError('auth_err_plan_limit', { plan: plan.name, max: plan.maxUsers });
    }

    const parts = String(name).trim().split(/\s+/);
    const base  = suggestLogin(parts[0] || '', parts.slice(1).join(' ')).replace(/[^a-z0-9._-]/g, '') || 'user';
    const tempPassword = genPassword();
    const sec = secondaryAuth();
    await sec.setPersistence(firebase.auth.Auth.Persistence.NONE);

    let empUser = null, empLogin = null;
    for (let n = 1; n <= 50 && !empUser; n++) {
      const candidate = n === 1 ? base : base + n;
      try {
        empUser = (await sec.createUserWithEmailAndPassword(loginToEmail(candidate), tempPassword)).user;
        empLogin = candidate;
      } catch (e) {
        if (e.code !== 'auth/email-already-in-use') throw mapFirebaseError(e);
      }
    }
    if (!empUser) throw authError('auth_err_login_taken');
    const empUid = empUser.uid;
    try { await sec.signOut(); } catch (_) {}

    const emp = {
      orgId:     s.orgId,
      name:      String(name).trim().slice(0, 120),
      role:      String(role || '').trim().slice(0, 120),
      phone:     String(phone || '').trim().slice(0, 20),
      login:     empLogin,
      createdAt: today(),
      active:    true,
    };
    try {
      await DB.create('employees', empUid, emp);
    } catch (e) { throw mapFirebaseError(e); }
    return { employee: { id: empUid, ...emp }, tempPassword };
  }

  /* ─── XODIMNI FAOLSIZLASHTIRISH ─────────────────── */
  async function deactivateEmployee(empId) {
    try { await DB.update('employees', empId, { active: false }); }
    catch (e) { throw mapFirebaseError(e); }
  }

  /* ─── XODIMNI O'CHIRISH ──────────────────────────── */
  // Firestore hujjati o'chiriladi → xodim tashkilot ma'lumotiga kira olmaydi.
  // Firebase Auth hisobini o'chirish Admin SDK talab qiladi —
  // docs/SECURITY_SETUP.md, 7-qadam (scripts/cleanup-orphan-auth.js).
  async function deleteEmployee(empId) {
    try { await DB.remove('employees', empId); }
    catch (e) { throw mapFirebaseError(e); }
  }

  /* ─── TASHKILOT XODIMLARI ────────────────────────── */
  async function getOrgEmployees(orgId) {
    return DB.getAll('employees', 'orgId', orgId);
  }

  /* ─── TARIFNI O'ZGARTIRISH SO'ROVI ──────────────── */
  // Mijoz tarifni O'ZGARTIRA OLMAYDI (RISKS R-15). Faqat so'rov qoldiriladi;
  // super-admin to'lovni tekshirib `plan` ni o'zi o'rnatadi.
  async function requestPlan(planKey) {
    const s = current;
    if (!s || s.role !== 'admin') throw authError('auth_err_permission');
    if (!PLANS[planKey]) throw authError('auth_err_unknown');
    try { await DB.update('organizations', s.orgId, { requestedPlan: planKey }); }
    catch (e) { throw mapFirebaseError(e); }
  }

  /* ─── PAROLNI O'ZGARTIRISH (o'zi uchun) ──────────── */
  async function changePassword(oldPassword, newPassword) {
    const user = auth().currentUser;
    if (!user) throw authError('auth_err_permission');
    if (!newPassword || newPassword.length < MIN_PASSWORD) throw authError('auth_err_pwd_len');
    try {
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, oldPassword);
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(newPassword);
    } catch (e) { throw mapFirebaseError(e); }
  }

  /* ─── TO'LOV HAVOLALARI ──────────────────────────── */
  // Produksiyada o'z merchant ID larini qo'ying (Click / Payme shaxsiy kabinet).
  // To'lov holati baribir faqat super-admin tomonidan qo'lda tasdiqlanadi.
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

  startAuthListener();

  return {
    PLANS,
    MIN_PASSWORD,
    suggestLogin,
    genPassword,
    loginToEmail,
    isEntitled,
    register,
    login,
    logout,
    getSession,
    isReady,
    whenReady,
    onChange,
    lastError: () => lastProfileError,
    addEmployee,
    deactivateEmployee,
    deleteEmployee,
    getOrgEmployees,
    requestPlan,
    changePassword,
    getClickUrl,
    getPaymeUrl,
    tr,
  };

})();

window.AuthManager = AuthManager;
