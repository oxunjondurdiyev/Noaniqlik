/* ═══════════════════════════════════════════════════════════════
   AUTH.JS — Tashkilot autentifikatsiyasi va xodimlar boshqaruvi
   Frontend prototip · localStorage asosida
   Produksiyada: barcha API chaqiruvlari backend orqali o'tkazilsin
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
      new TextEncoder().encode(pwd + ':uc_noaniqlik_salt')
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ─── TASODIFIY PAROL YARATISH ────────────────────── */
  function genPassword(len = 8) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(len)))
      .map(b => chars[b % chars.length]).join('');
  }

  /* ─── LOGIN YARATISH (ism asosida) ───────────────── */
  function genLogin(name, existingLogins) {
    const parts = name.trim().split(/\s+/);
    let base = parts.length >= 2
      ? parts[0][0].toLowerCase() + '.' + transliterate(parts.slice(1).join(''))
      : transliterate(name).slice(0, 10);
    let login = base;
    let n = 2;
    while (existingLogins.includes(login)) login = base + n++;
    return login;
  }

  function transliterate(str) {
    const map = { 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'j','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'x','ц':'ts','ч':'ch','ш':'sh','щ':'sh','ъ':'','ы':'i','ь':'','э':'e','ю':'yu','я':'ya','ğ':'g','ş':'sh','ç':'ch','ı':'i','ö':'o','ü':'u' };
    return str.toLowerCase().split('').map(c => map[c] ?? (/[a-z0-9]/.test(c) ? c : '')).join('');
  }

  /* ─── INN QIDIRISH (org.info.uz + mock fallback) ─── */
  async function lookupINN(inn) {
    if (!/^\d{9}$/.test(inn)) throw new Error('INN 9 ta raqamdan iborat bo\'lishi kerak');

    /* === Produksiyada: backend proxy orqali ===
       const res = await fetch(`/api/inn-lookup?inn=${inn}`);
       const data = await res.json();
       return data;
    */

    // CORS-proxy urinish (brauzerdan to'g'ri fetch bloklanadi)
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent('https://www.org.info.uz/ru/company/byinn/' + inn)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const json = await res.json();
        const html = json.contents || '';
        const nameMatch = html.match(/class="company-title"[^>]*>\s*([^<]+)/i)
          || html.match(/<h1[^>]*>\s*([^<]+)/i);
        const addrMatch = html.match(/Yuridik manzil[^:]*:\s*<[^>]+>\s*([^<]+)/i)
          || html.match(/manzil[^:]*:\s*([^<\n]+)/i);
        const dirMatch  = html.match(/Rahbar[^:]*:\s*<[^>]+>\s*([^<]+)/i);
        const name = nameMatch ? nameMatch[1].trim() : null;
        if (name && name.length > 3) {
          return {
            inn,
            name,
            address: addrMatch ? addrMatch[1].trim() : '',
            director: dirMatch  ? dirMatch[1].trim()  : '',
            source: 'org.info.uz',
          };
        }
      }
    } catch (_) { /* CORS yoki timeout — mock ga o'tamiz */ }

    // Mock ma'lumotlar (demo uchun)
    const mockDb = {
      '302726931': { name: "O'zstandart Agentligi", address: "Toshkent sh., Mirzo Ulug'bek tumani, Farobiy ko'ch. 333-A", director: 'Abdullayev B.R.' },
      '207660482': { name: 'Metrologiya Ilmiy Markazi', address: "Toshkent sh., Yunusobod tumani, Amir Temur shoh ko'ch. 108", director: 'Xasanov O.T.' },
      '301264398': { name: "O'zbekiston Milliy Universiteti", address: "Toshkent sh., Universitet ko'ch. 4", director: 'Toshmatov A.A.' },
    };
    const mock = mockDb[inn];
    return {
      inn,
      name:     mock ? mock.name     : `Tashkilot (INN: ${inn})`,
      address:  mock ? mock.address  : "Manzil aniqlanmadi — org.info.uz'dan yuklab olinadi",
      director: mock ? mock.director : '',
      source: 'mock',
    };
  }

  /* ─── SESSIYA ─────────────────────────────────────── */
  function getSession() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!s || Date.now() > s.expiresAt) { localStorage.removeItem(SESSION_KEY); return null; }
      return s;
    } catch { return null; }
  }

  function setSession(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, expiresAt: Date.now() + SESSION_TTL }));
  }

  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  /* ─── TASHKILOT MA'LUMOTLARI ─────────────────────── */
  function orgKey(inn) { return 'uc_org_' + inn; }

  function getOrg(inn) {
    try { return JSON.parse(localStorage.getItem(orgKey(inn)) || 'null'); }
    catch { return null; }
  }

  function saveOrg(org) {
    localStorage.setItem(orgKey(org.inn), JSON.stringify(org));
  }

  /* ─── RO'YXATDAN O'TISH ──────────────────────────── */
  async function register({ inn, name, address, director, adminName, adminPassword, plan }) {
    if (getOrg(inn)) throw new Error('Ushbu INN bilan tashkilot allaqachon ro\'yxatdan o\'tgan');
    const org = {
      inn, name, address, director,
      plan: plan || 'basic',
      planExpiry: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      registeredAt: new Date().toISOString().slice(0, 10),
      admin: { name: adminName, login: 'admin', passwordHash: await hashPwd(adminPassword) },
      employees: [],
    };
    saveOrg(org);
    setSession({ role: 'admin', inn, login: 'admin', name: adminName });
    return org;
  }

  /* ─── KIRISH ──────────────────────────────────────── */
  async function login(inn, loginStr, password) {
    const org = getOrg(inn);
    if (!org) throw new Error('Bunday INN bilan tashkilot topilmadi');
    const hash = await hashPwd(password);
    if (loginStr === 'admin') {
      if (hash !== org.admin.passwordHash) throw new Error('Parol noto\'g\'ri');
      setSession({ role: 'admin', inn, login: 'admin', name: org.admin.name });
      return { role: 'admin', org };
    }
    const emp = org.employees.find(e => e.login === loginStr && e.active);
    if (!emp) throw new Error('Foydalanuvchi topilmadi');
    if (hash !== emp.passwordHash) throw new Error('Parol noto\'g\'ri');
    setSession({ role: 'employee', inn, login: loginStr, name: emp.name, empId: emp.id });
    return { role: 'employee', org };
  }

  /* ─── XODIM QO'SHISH ─────────────────────────────── */
  async function addEmployee(inn, { name, role }) {
    const org = getOrg(inn);
    if (!org) throw new Error('Tashkilot topilmadi');
    const plan = PLANS[org.plan];
    const activeCount = org.employees.filter(e => e.active).length;
    if (plan.maxUsers !== -1 && activeCount >= plan.maxUsers) {
      throw new Error(`Tarif limiti: ${plan.name} rejasida maksimal ${plan.maxUsers} xodim`);
    }
    const logins  = org.employees.map(e => e.login);
    const login   = genLogin(name, logins);
    const rawPwd  = genPassword();
    const emp = {
      id: 'emp_' + Date.now(),
      name, role, login,
      rawPwd,   // Demo: ko'rsatish uchun saqlandi. Produksiyada: email/SMS orqali yuborilsin, saqlanmasin
      passwordHash: await hashPwd(rawPwd),
      createdAt: new Date().toISOString().slice(0, 10),
      active: true,
    };
    org.employees.push(emp);
    saveOrg(org);
    return emp;
  }

  /* ─── XODIMNI O'CHIRISH ───────────────────────────── */
  function deactivateEmployee(inn, empId) {
    const org = getOrg(inn);
    if (!org) return;
    const emp = org.employees.find(e => e.id === empId);
    if (emp) { emp.active = false; saveOrg(org); }
  }

  /* ─── TARIF YANGILASH ────────────────────────────── */
  function upgradePlan(inn, plan) {
    const org = getOrg(inn);
    if (!org) return;
    org.plan = plan;
    org.planExpiry = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    saveOrg(org);
  }

  /* ─── TO'LOV HAVOLALARI ──────────────────────────── */
  // Produksiyada: o'z merchant ID va service ID larini qo'ying
  function getClickUrl(amount, transactionParam) {
    const CLICK_SERVICE_ID  = 'XXXXX';  // Click merchant panelidan oling
    const CLICK_MERCHANT_ID = 'XXXXX';
    return `https://my.click.uz/services/pay?service_id=${CLICK_SERVICE_ID}&merchant_id=${CLICK_MERCHANT_ID}&amount=${amount}&transaction_param=${transactionParam}&return_url=${encodeURIComponent(location.origin)}`;
  }

  function getPaymeUrl(amount, orderId) {
    const PAYME_MERCHANT_ID = 'XXXXXXXXXXXXXXXXXXXXXXXX'; // Payme merchant panelidan oling
    const params = btoa(JSON.stringify({ m: PAYME_MERCHANT_ID, ac: { order_id: orderId }, a: amount * 100 }));
    return `https://checkout.paycom.uz/${params}`;
  }

  return {
    PLANS,
    lookupINN, register, login,
    getSession, setSession, clearSession,
    getOrg, saveOrg,
    addEmployee, deactivateEmployee, upgradePlan,
    getClickUrl, getPaymeUrl,
  };

})();

window.AuthManager = AuthManager;
