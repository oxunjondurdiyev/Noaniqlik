/* ═══════════════════════════════════════════════════════════════
   FIREBASE CONFIG — UncertaintyCalc
   ─────────────────────────────────────────────────────────────
   Bu fayldagi qiymatlar MAXFIY EMAS: Firebase web konfiguratsiyasi
   har bir foydalanuvchi brauzeriga baribir yuboriladi. Ma'lumotlarni
   himoya qilish — firestore.rules va Firebase Authentication vazifasi
   (docs/SECURITY_SETUP.md).

   Bu yerda HECH QACHON parol, login, service account kaliti yoki
   boshqa sir saqlanmaydi. Super-admin — Auth custom claim
   (`superadmin: true`), scripts/set-superadmin-claim.mjs.
═══════════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBEmoNy6GlhvHgEe4vRY2-yk4i0PFOE8B8",
  authDomain:        "noaniqlikbazasi.firebaseapp.com",
  projectId:         "noaniqlikbazasi",
  storageBucket:     "noaniqlikbazasi.firebasestorage.app",
  messagingSenderId: "1067966242269",
  appId:             "1:1067966242269:web:b0845d1805662e35c02a34",
  measurementId:     "G-JZN02J00YG",
};

/* Sun'iy email domeni: <login>@users.<LOGIN_EMAIL_DOMAIN>
   (egasining qarori, 2026-11-13). O'zgartirilsa, mavjud barcha
   hisoblar kira olmay qoladi — faqat yangi loyihada o'zgartiring. */
const LOGIN_EMAIL_DOMAIN = 'noaniqlikbazasi.firebaseapp.com';

/* ─── FIREBASE ISHGA TUSHIRISH ─────────────────────────── */
(function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.error('[Firebase] SDK yuklanmagan! vendor/firebase/ ni tekshiring.');
    return;
  }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    window.firebaseDb   = firebase.firestore();
    window.firebaseAuth = firebase.auth();
  } catch (e) {
    console.error('[Firebase] Ulanish xatosi:', e.message);
  }
})();
