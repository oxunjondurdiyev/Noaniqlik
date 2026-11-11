# CHANGELOG

Format: har bir bosqich/PR uchun yozuv. `ENGINE_VERSION` (P01 da kiritiladi) faqat hisoblash natijasiga ta'sir qiluvchi o'zgarishda oshiriladi.

## [Unreleased] — P02 xavfsizlik (`fix/p02-security`, 2026-11-11)

Hisoblash dvigateli (`src/js/calc.js`) **o'zgarmadi**; etalon Excel nuqtalari (8 ta assert) o'zgarmadi → `ENGINE_VERSION` o'zgarishi shart emas.

### Xavfsizlik
- Super-admin login/paroli mijoz kodidan olib tashlandi; super-admin — Firebase Auth + custom claim `superadmin: true` yoki `admins/{uid}` (RISKS R-S2).
- Firebase Authentication: parollar faqat Firebase'da; `hashPwd`, `passwordHash`, `rawPwd` olib tashlandi; xodimning vaqtinchalik paroli bir marta ko'rsatiladi (R-S1, R-S3).
- Sessiya — Firebase Auth holati; `uc_session`/`uc_sa_session` endi ishlatilmaydi va tozalanadi (R-S4).
- `firestore.rules`: default rad, anonim kirish yo'q, tashkilot bo'yicha ajratish, `active`/`paymentStatus`/`plan`/`planExpiry` faqat super-admin (R-S1, R-15).
- XSS: yagona `src/ui/escape.js` (`'` bilan), `showToast` — `textContent`, `pending-org-info` escape, inline `onclick` → `addEventListener` (R-S5).
- Firebase SDK 9.23.0 `vendor/` ga ko'chirildi (LICENSE, SHA-256), barcha sahifalarda CSP meta (R-14).
- Tarifni mijoz o'zgartira olmaydi (`upgradePlan` → `requestedPlan` so'rovi); cheksiz foydalanish huquqi himoyalangan tashkilot hujjatidan (R-15).

### Qo'shildi
- `scripts/migrate-auth.js` (avval zaxira), `set-superadmin.js`, `reset-password.js`, `cleanup-orphan-auth.js`, `restore-backup.js` — Admin SDK, egasining kompyuterida.
- "Parolni o'zgartirish" oynasi; juda eski brauzer uchun ogohlantirish (`<script nomodule>`).
- `package.json`, `npm test`, `npm run test:rules`; `tests/security/*`, `tests/rules/*`.
- `docs/SECURITY_SETUP.md`, `docs/AUTH_MIGRATION.md`, `docs/DATA_RESIDENCY.md`.

### O'zgardi
- Minimal parol uzunligi 6 → 8.
- Ro'yxatdan o'tishda login band/bo'shligini oldindan tekshirish olib tashlandi (anonim o'qish yo'q); band bo'lsa xato yuborishda chiqadi.
- Admin panelida parol ustuni yo'q.
- `measurementId` (Analytics) konfiguratsiyadan olib tashlandi (Analytics ishlatilmas edi).
