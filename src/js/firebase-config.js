/* ═══════════════════════════════════════════════════════════════
   FIREBASE CONFIG — UncertaintyCalc
   ─────────────────────────────────────────────────────────────
   Bu fayldagi apiKey va boshqa qiymatlar MAXFIY EMAS — ular har bir
   brauzerga baribir yuboriladi. Himoya:
     • Firestore qoidalari (firestore.rules) — kim nimani o'qiy/yoza oladi;
     • Firebase Authentication — parollar faqat Google serverida;
     • API kalitini domen bilan cheklash (docs/SECURITY_SETUP.md, 6-qadam).

   Bu yerda hech qanday login/parol saqlanmaydi (RISKS R-S1).
   Super-admin huquqi — Firebase Auth custom claim `superadmin: true`
   yoki `admins/{uid}` hujjati (docs/SECURITY_SETUP.md, 4-qadam).
═══════════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBEmoNy6GlhvHgEe4vRY2-yk4i0PFOE8B8",
  authDomain:        "noaniqlikbazasi.firebaseapp.com",
  projectId:         "noaniqlikbazasi",
  storageBucket:     "noaniqlikbazasi.firebasestorage.app",
  messagingSenderId: "1067966242269",
  appId:             "1:1067966242269:web:b0845d1805662e35c02a34",
};

/* Firebase Auth email/parol provayderi email talab qiladi. Haqiqiy email
   to'planmaydi (CLAUDE.md: yangi shaxsiy maydon yo'q) — login sun'iy
   manzilga aylantiriladi: "a.karimov" → "a.karimov@<AUTH_EMAIL_DOMAIN>".
   Bu manzilga hech qachon xat yuborilmaydi (PLAN P02, 1-savol, (a) variant). */
const AUTH_EMAIL_DOMAIN = 'users.noaniqlikbazasi.firebaseapp.com';

/* ─── FIREBASE ISHGA TUSHIRISH ─────────────────────────── */
(function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.error('[Firebase] SDK yuklanmagan (vendor/firebase/…).');
    return;
  }
  // Lokal sinov: http://localhost:…/?emulator=1 → Firebase Emulator Suite
  // (demo-loyiha ID — haqiqiy loyihaga hech qachon tegmaydi)
  const host = location.hostname;
  const useEmu = (host === 'localhost' || host === '127.0.0.1') &&
                 new URLSearchParams(location.search).has('emulator');
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(useEmu ? { ...FIREBASE_CONFIG, projectId: 'demo-uncertaintycalc' } : FIREBASE_CONFIG);
    }
    window.firebaseDb   = firebase.firestore();
    window.firebaseAuth = firebase.auth();
    if (useEmu) {
      window.firebaseDb.useEmulator('127.0.0.1', 8080);
      window.firebaseAuth.useEmulator('http://127.0.0.1:9099');
      window.UC_EMULATOR = true;
      console.warn('[Firebase] Emulator rejimi');
    }
  } catch (e) {
    console.error('[Firebase] Ulanish xatosi:', e.message);
  }
})();

/* Eski (P02 dan oldingi) imzosiz sessiya kalitlari endi ishlatilmaydi.
   Ular foydalanuvchi ma'lumoti emas — shunchaki tozalanadi (RISKS R-S3). */
try {
  localStorage.removeItem('uc_session');
  localStorage.removeItem('uc_sa_session');
} catch (_) { /* private mode */ }
