/* ═══════════════════════════════════════════════════════════════
   ACCESS-MODE.JS — kirish rejimi (sof; DOM / Firebase'siz). YAGONA joy.
   ─────────────────────────────────────────────────────────────
   Egasi qarori (2026-11-24): tizim ochiq TEST rejimida — ro'yxatdan o'tish va kirish
   talab qilinmaydi, sinov hisoblagichi (`uc_trial_count`) va to'lov oynasi o'chiq,
   "Ro'yxatdan o'tish" va to'lov tugmalari ko'rsatilmaydi. Mavjud hisob egalari
   (admin / xodim / super-admin) "Kirish" orqali avvalgidek kiradi.
   Fikr-mulohazalar asosida yakuniy versiyaga keltirilgach — `ACCESS_MODE = 'subscription'`
   (obuna: 7 ta sinov hisobi → ro'yxatdan o'tish → to'lov; P20 gacha bo'lgan xatti-harakat).
   Rejimni almashtirish — faqat shu qatorda va faqat egasi qarori bilan (tests/ui/access.test.js).
   Brauzer: window.UCAccess.  Node (testlar): module.exports.
═══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  const MODES = Object.freeze({
    // trialLimit: null — hisoblagich yo'q (cheklovsiz)
    'open-test':    Object.freeze({ trialLimit: null, registration: false, payments: false, testNotice: true }),
    'subscription': Object.freeze({ trialLimit: 7,    registration: true,  payments: true,  testNotice: false }),
  });

  const ACCESS_MODE = 'open-test';

  function policy(mode) {
    const p = MODES[mode === undefined ? ACCESS_MODE : mode];
    if (!p) throw new Error('UNKNOWN_ACCESS_MODE');
    return p;
  }

  /** Yangi hisob sessiyasini boshlash mumkinmi (kirgan foydalanuvchi — har doim). */
  function canStartSession({ signedIn, used }, mode) {
    const p = policy(mode);
    if (signedIn || p.trialLimit === null) return true;
    return (Number(used) || 0) < p.trialLimit;
  }

  /** Sessiya sinov hisoblagichini oshiradimi. */
  function countsTrial({ signedIn }, mode) {
    return !signedIn && policy(mode).trialLimit !== null;
  }

  const api = Object.freeze({ ACCESS_MODE, MODES, policy, canStartSession, countsTrial });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document) root.UCAccess = api;
})(typeof window !== 'undefined' ? window : globalThis);
