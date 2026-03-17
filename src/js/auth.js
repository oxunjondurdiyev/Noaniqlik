/* ═══════════════════════════════════════════════════════════════
   AUTH.JS — Autentifikatsiya va xodimlar boshqaruvi
   Baza: IndexedDB (db.js orqali)
   Sessiya: localStorage (8 soat TTL)
═══════════════════════════════════════════════════════════════ */

const AuthManager = (() => {

  const SESSION_KEY = 'uc_session';
  const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 soat

  /* ─── OBUNA REJALARI ──────────────────────────────── */
  const PLANS = {
    basic:    { name: "Boshlang'ich", maxUsers: 5,  priceMonthly: 99000  },
    standard: { name: 'Standart',      maxUsers: 20, priceMonthly: 299000 },
    pro:      { name: 'Pro',           maxUsers: -1, priceMonthly: 599000 },
  };

  /* ─── PAROL XESH (SHA-256) ────────────────────────── */
  async function hashPwd(pwd) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(pwd + ':uc_noaniqlik_v1')
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ─── TASODIFIY PAROL ─────────────────────────────── */
  function genPassword(len = 8) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(len)))
      .map(b => chars[b % chars.length]).join('');
  }

  /* ─── TRANSLITERATSIYA ────────────────────────────── */
  function translit(str) {
    const map = {
      'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'j','з':'z',
      'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
      'с':'s','т':'t','у':'u','ф':'f','х':'x','ц':'ts','ч':'ch','ш':'sh','щ':'sh',
      'ъ':'','ы':'i','ь':'','э':'e','ю':'yu','я':'ya',
      'ğ':'g','ş':'sh','ç':'ch','ı':'i','ö':'o','ü':'u',
      "o'": 'o', "g'": 'g',
    };
    return str.toLowerCase()
      .split('')
      .map(c => map[c] ?? (/[a-z0-9]/.test(c) ? c : ''))
      .join('');
  }

  /* ─── LOGIN TAVSIYASI ─────────────────────────────── */
  // "Ahmad" + "Karimov" → "a.karimov"
  function suggestLogin(firstName, lastName) {
    const f = translit(firstName.trim());
    const l = translit(lastName.trim());
    if (f && l) return f[0] + '.' + l;
    if (l)      return l;
    if (f)      return f;
    return 'user';
  }

  /* ─── NOYOB LOGIN TOPISH ──────────────────────────── */
  async function findUniqueLogin(base) {
    const clean = base.replace(/[^a-z0-9._-]/g, '');
    if (!(await DB.isLoginTaken(clean))) return clean;
    let n = 2;
    while (true) {
      const candidate = clean + n;
      if (!(await DB.isLoginTaken(candidate))) return candidate;
      n++;
    }
  }

  /* ─── SESSIYA ─────────────────────────────────────── */
  function getSession() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!s || Date.now() > s.expiresAt) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    } catch { return null; }
  }

  function setSession(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...data, expiresAt: Date.now() + SESSION_TTL,
    }));
  }

  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  /* ─── RO'YXATDAN O'TISH ───────────────────────────── */
  async function register({ inn, phone, firstName, lastName, login, password, employeeCount }) {
    // Validatsiya
    if (!inn || !phone || !firstName || !lastName || !login || !password) {
      throw new Error('Barcha maydonlarni to\'ldiring');
    }
    if (!/^\d{9}$/.test(inn.replace(/\s/g, ''))) {
      throw new Error('INN 9 ta raqamdan iborat bo\'lishi kerak');
    }
    if (password.length < 6) {
      throw new Error('Parol kamida 6 belgidan iborat bo\'lishi kerak');
    }
    if (await DB.isLoginTaken(login)) {
      throw new Error('Bu login band — boshqa login tanlang');
    }

    const org = {
      inn:           inn.trim(),
      phone:         phone.trim(),
      firstName:     firstName.trim(),
      lastName:      lastName.trim(),
      fullName:      firstName.trim() + ' ' + lastName.trim(),
      login:         login.trim().toLowerCase(),
      passwordHash:  await hashPwd(password),
      employeeCount: Math.max(1, parseInt(employeeCount) || 1),
      plan:          'basic',
      planExpiry:    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      registeredAt:  new Date().toISOString().slice(0, 10),
    };

    const id = await DB.add('organizations', org);
    org.id = id;

    setSession({
      role:    'admin',
      orgId:   id,
      login:   org.login,
      name:    org.fullName,
    });

    return org;
  }

  /* ─── KIRISH ──────────────────────────────────────── */
  async function login(loginStr, password) {
    if (!loginStr || !password) throw new Error('Login va parolni kiriting');

    const hash = await hashPwd(password);
    const lower = loginStr.trim().toLowerCase();

    // Tashkilot admin tekshiruvi
    const org = await DB.getByIndex('organizations', 'login', lower);
    if (org && org.passwordHash === hash) {
      setSession({
        role:  'admin',
        orgId: org.id,
        login: lower,
        name:  org.fullName,
      });
      return { role: 'admin', org };
    }

    // Xodim tekshiruvi
    const emp = await DB.getByIndex('employees', 'login', lower);
    if (emp && emp.passwordHash === hash) {
      if (!emp.active) throw new Error('Hisobingiz faolsizlantirilgan. Admin bilan bog\'laning');
      const empOrg = await DB.get('organizations', emp.orgId);
      setSession({
        role:  'employee',
        orgId: emp.orgId,
        empId: emp.id,
        login: lower,
        name:  emp.name,
      });
      return { role: 'employee', org: empOrg };
    }

    throw new Error('Login yoki parol noto\'g\'ri');
  }

  /* ─── XODIM QO'SHISH ─────────────────────────────── */
  async function addEmployee(orgId, { name, role }) {
    const org = await DB.get('organizations', orgId);
    if (!org) throw new Error('Tashkilot topilmadi');

    const plan       = PLANS[org.plan];
    const allEmps    = await DB.getAll('employees', 'orgId', orgId);
    const activeCount = allEmps.filter(e => e.active).length;

    if (plan.maxUsers !== -1 && activeCount >= plan.maxUsers) {
      throw new Error(`Tarif limiti: "${plan.name}" rejasida maksimal ${plan.maxUsers} ta xodim`);
    }

    // Login yaratish
    const parts = name.trim().split(/\s+/);
    const baseLogin = suggestLogin(parts[0] || '', parts.slice(1).join(' '));
    const empLogin  = await findUniqueLogin(baseLogin);
    const rawPwd    = genPassword();

    const emp = {
      orgId,
      name:         name.trim(),
      role:         (role || '').trim(),
      login:        empLogin,
      rawPwd,        // Produksiyada SMS/email orqali yuboring, bu yerda saqlanmasin
      passwordHash: await hashPwd(rawPwd),
      createdAt:    new Date().toISOString().slice(0, 10),
      active:       true,
    };

    const id = await DB.add('employees', emp);
    emp.id = id;
    return emp;
  }

  /* ─── XODIMNI O'CHIRISH ──────────────────────────── */
  async function deactivateEmployee(empId) {
    const emp = await DB.get('employees', empId);
    if (!emp) return;
    emp.active = false;
    await DB.put('employees', emp);
  }

  /* ─── TASHKILOT XODIMLARI ────────────────────────── */
  async function getOrgEmployees(orgId) {
    return DB.getAll('employees', 'orgId', orgId);
  }

  /* ─── TARIF YANGILASH ────────────────────────────── */
  async function upgradePlan(orgId, plan) {
    const org = await DB.get('organizations', orgId);
    if (!org) return;
    org.plan       = plan;
    org.planExpiry = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    await DB.put('organizations', org);
  }

  /* ─── TO'LOV HAVOLALARI ──────────────────────────── */
  // Produksiyada o'z merchant ID larini qo'ying (Click / Payme shaxsiy kabinet)
  function getClickUrl(amount, txId) {
    const SVC = 'CLICK_SERVICE_ID';
    const MER = 'CLICK_MERCHANT_ID';
    return `https://my.click.uz/services/pay?service_id=${SVC}&merchant_id=${MER}&amount=${amount}&transaction_param=${txId}&return_url=${encodeURIComponent(location.origin + '/admin.html')}`;
  }

  function getPaymeUrl(amount, txId) {
    const MER = 'PAYME_MERCHANT_ID';
    const p   = btoa(JSON.stringify({ m: MER, ac: { order_id: txId }, a: amount * 100 }));
    return `https://checkout.paycom.uz/${p}`;
  }

  return {
    PLANS,
    suggestLogin,
    findUniqueLogin,
    hashPwd,
    genPassword,
    register,
    login,
    getSession,
    setSession,
    clearSession,
    addEmployee,
    deactivateEmployee,
    getOrgEmployees,
    upgradePlan,
    getClickUrl,
    getPaymeUrl,
  };

})();

window.AuthManager = AuthManager;
