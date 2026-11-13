/* ═══════════════════════════════════════════════════════════════
   AUTH-CORE.JS — autentifikatsiyaning sof (DOM/Firebase'siz) qismi
   ─────────────────────────────────────────────────────────────
   Login → sun'iy email, login tavsiyasi, tasodifiy parol, tariflar.
   Brauzer: window.AuthCore.  Node (testlar): module.exports.

   Sun'iy email (egasining qarori, 2026-11-13, 1-band):
     <login>@users.<loyiha-domeni>
   Bu manzil faqat Firebase Authentication ichida ishlatiladi —
   haqiqiy pochta qutisi emas, Firestore'ga yozilmaydi, shaxsiy
   ma'lumot emas. Parolni email orqali tiklash ishlamaydi (ataylab).
═══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* ─── OBUNA REJALARI ──────────────────────────────── */
  const PLANS = {
    basic:    { name: "Boshlang'ich", maxUsers: 5,  priceMonthly: 99000  },
    standard: { name: 'Standart',      maxUsers: 20, priceMonthly: 299000 },
    pro:      { name: 'Pro',           maxUsers: -1, priceMonthly: 599000 },
  };

  /* ─── LOGIN ───────────────────────────────────────── */
  // 3–32 belgi: a-z 0-9 . _ - ; boshi va oxiri harf/raqam; ".." yo'q.
  // firestore.rules dagi validLogin() bilan bir xil.
  const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/;

  function normalizeLogin(s) {
    return String(s ?? '').trim().toLowerCase();
  }

  function isValidLogin(login) {
    return typeof login === 'string' && LOGIN_RE.test(login) && !login.includes('..');
  }

  function loginToEmail(login, domain) {
    const l = normalizeLogin(login);
    if (!isValidLogin(l)) throw new Error('INVALID_LOGIN');
    if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new Error('INVALID_DOMAIN');
    return `${l}@users.${domain.toLowerCase()}`;
  }

  /* ─── TRANSLITERATSIYA / LOGIN TAVSIYASI ─────────── */
  const TR = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'j','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'x','ц':'ts','ч':'ch','ш':'sh','щ':'sh',
    'ъ':'','ы':'i','ь':'','э':'e','ю':'yu','я':'ya','ў':'o','қ':'q','ғ':'g','ҳ':'h',
    'ğ':'g','ş':'sh','ç':'ch','ı':'i','ö':'o','ü':'u',
  };

  function translit(str) {
    return String(str ?? '').toLowerCase()
      .split('')
      .map(c => TR[c] ?? (/[a-z0-9]/.test(c) ? c : ''))
      .join('');
  }

  // "Ahmad" + "Karimov" → "a.karimov"
  function suggestLogin(firstName, lastName) {
    const f = translit(String(firstName ?? '').trim());
    const l = translit(String(lastName ?? '').trim());
    let base = (f && l) ? f[0] + '.' + l : (l || f || 'user');
    base = base.slice(0, 28);
    if (base.length < 3) base = (base + 'user').slice(0, 4);
    return base;
  }

  // "a.karimov" → "a.karimov", "a.karimov2", "a.karimov3", …
  function loginCandidate(base, n) {
    const b = normalizeLogin(base).replace(/[^a-z0-9._-]/g, '').replace(/\d+$/, '') || 'user';
    return n <= 1 ? b : b.slice(0, 28) + n;
  }

  /* ─── TASODIFIY PAROL ─────────────────────────────── */
  // 12 belgi, 31 belgili alifbo (o'xshash belgilar yo'q) ≈ 59 bit.
  // Rejection sampling — modulo og'ishi (bias) yo'q.
  const PWD_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

  function genPassword(len = 12, getRandomValues) {
    const rnd = getRandomValues || (a => root.crypto.getRandomValues(a));
    const limit = 256 - (256 % PWD_CHARS.length);
    let out = '';
    while (out.length < len) {
      const buf = rnd(new Uint8Array(len * 2));
      for (const b of buf) {
        if (b < limit && out.length < len) out += PWD_CHARS[b % PWD_CHARS.length];
      }
    }
    return out;
  }

  /* ─── KO'RSATILADIGAN ISM ─────────────────────────── */
  // fullName maydoni o'chirildi (P02: firstName + lastName dan takror edi).
  function orgDisplayName(org) {
    if (!org) return '';
    const n = [org.firstName, org.lastName].filter(Boolean).join(' ').trim();
    return n || org.fullName || org.login || '';
  }

  function isoDatePlusDays(days, now) {
    const t = (now === undefined ? Date.now() : now) + days * 86400000;
    return new Date(t).toISOString().slice(0, 10);
  }

  const api = {
    PLANS, LOGIN_RE, normalizeLogin, isValidLogin, loginToEmail,
    translit, suggestLogin, loginCandidate, genPassword, orgDisplayName, isoDatePlusDays,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document) root.AuthCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
