/* ═══════════════════════════════════════════════════════════════
   FIREBASE CONFIG — UncertaintyCalc
   ─────────────────────────────────────────────────────────────
   SOZLASH BOSQICHLARI:
   1. https://console.firebase.google.com ga kiring
   2. Yangi loyiha yarating (masalan: "uncertainty-calc")
   3. "Web ilovasi qo'shish" (</>)  ni bosing
   4. Quyidagi FIREBASE_CONFIG ni o'z ma'lumotlaringiz bilan to'ldiring
   5. Firestore Database → "Test mode" da ishga tushiring
   6. SUPER_ADMIN parolini albatta o'zgartiring!
═══════════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

/* ─── SUPER-ADMIN KIRISH MA'LUMOTLARI ──────────────────────
   Bu parolni o'zgartiring! Xavfsiz saqlang.
   superadmin.html ga kirish uchun ishlatiladi.        */
const SUPER_ADMIN = {
  login:    "superadmin",
  password: "uc_super_2024",   // ← O'zgartiring!
};

/* ─── FIREBASE ISHGA TUSHIRISH ─────────────────────────── */
(function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.error('[Firebase] SDK yuklanmagan! firebase-app-compat.js ni tekshiring.');
    return;
  }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    window.firebaseDb = firebase.firestore();
    console.log('[Firebase] ✓ Firestore ulandi →', FIREBASE_CONFIG.projectId);
  } catch (e) {
    console.error('[Firebase] Ulanish xatosi:', e.message);
  }
})();
