# Foydalanuvchilarni Firebase Authentication'ga ko'chirish (P02)

> Kim uchun: egasi (super-admin). Konsol qadamlari va tartib — [SECURITY_SETUP.md](SECURITY_SETUP.md). Bu hujjat — ko'chirishning o'zi, foydalanuvchilarga nima o'zgarishi va parolni tiklash oqimi.

## 1. Nima o'zgardi

| | P02 dan oldin | P02 dan keyin |
|---|---|---|
| Parol qayerda | Firestore: `passwordHash` (SHA-256 + statik tuz), xodimlarda `rawPwd` ochiq matnda | Faqat Firebase Authentication (Google serverida, sekin KDF bilan). Firestore'da parol yo'q |
| Parol tekshiruvi | Brauzerda (hujjat xeshi bilan yuklab olinardi) | Google serverida (`signInWithEmailAndPassword`) |
| Sessiya | `localStorage.uc_session` / `uc_sa_session` — imzosiz, qo'lda yasash mumkin | Firebase Auth ID token (imzolangan, 1 soatlik, avtomatik yangilanadi) |
| Super-admin | Login/parol `firebase-config.js` da ochiq | Firebase Auth hisobi + custom claim `superadmin: true` yoki `admins/{uid}` |
| Kim nimani o'qiydi | Qoidalar repoda yo'q ("test mode" bo'lishi mumkin) | `firestore.rules`: faqat o'z tashkiloti; anonim — hech narsa |
| Tarif/aktivlik | Mijoz `upgradePlan` bilan o'zgartira olardi | Faqat super-admin; admin faqat **so'rov** (`requestedPlan`) yuboradi |
| Xodim paroli | Admin panelida doim ko'rinardi | Qo'shilganda **bir marta** ko'rsatiladi, hech qayerga yozilmaydi |
| Minimal parol uzunligi | 6 | 8 |

Login nomlari o'zgarmaydi. Ichkarida login sun'iy email'ga aylanadi: `a.karimov` → `a.karimov@users.noaniqlikbazasi.firebaseapp.com` (xat yuborilmaydi, haqiqiy email to'planmaydi).

## 2. Ma'lumot modeli

| Kolleksiya | Hujjat ID | Asosiy maydonlar | Kim yozadi |
|---|---|---|---|
| `organizations` | yangi: asoschi adminning `uid`; eski: avvalgi auto-ID | `inn, phone, firstName, lastName, login, employeeCount, registeredAt, ownerUid` + himoyalangan `plan, planExpiry, active, paymentStatus, paidAt, activatedAt` + `requestedPlan` | ro'yxatdan o'tishda admin (faqat `active=false, paymentStatus='pending', plan='basic'`); himoyalangan maydonlarni — faqat super-admin |
| `employees` | xodimning Auth `uid` | `orgId, name, role, phone, login, createdAt, active` | o'z (aktiv) tashkilotining admini |
| `admins` | super-adminning `uid` | ixtiyoriy | faqat konsol / Admin SDK |

O'chirilgan maydonlar: `organizations.passwordHash`, `organizations.fullName` (takror — `firstName`+`lastName` dan), `employees.rawPwd`, `employees.passwordHash`.

## 3. Ko'chirish skripti — `scripts/migrate-auth.js`

```bash
node scripts/migrate-auth.js --project noaniqlikbazasi            # 1) quruq: zaxira + reja
node scripts/migrate-auth.js --project noaniqlikbazasi --apply    # 2) haqiqiy
```

Qadamlar (har bir ishga tushirishda):
1. **Zaxira** `backups/firestore-backup-<vaqt>.json` — uchala kolleksiyaning barcha hujjatlari aynan (fayl `0600`).
2. `ownerUid` yo'q har bir tashkilot: `login@…` Auth hisobi (mavjud bo'lsa — o'sha), vaqtinchalik parol → `ownerUid`. `fullName` faqat `firstName`/`lastName` bo'sh bo'lsa ularga bo'linadi, keyin `fullName`, `passwordHash` o'chiriladi. Qolgan maydonlar (INN, telefon, tarif, muddat, holat, sanalar) **o'zgarmaydi**.
3. Har bir eski xodim: Auth hisobi → `employees/<uid>` ga nusxa (`rawPwd`, `passwordHash` siz) → yangi hujjat mavjudligi tekshirilgach eski `employees/<eskiID>` o'chiriladi. Xodim logini admin logini bilan to'qnashsa — o'tkazib yuboriladi va ogohlantirish chiqadi.
4. Yangi vaqtinchalik parollar: `scripts/out/temp-passwords-<vaqt>.csv` (`login,temp_password`, `0600`).

Kafolatlar (`tests/rules/migrate.test.js`, Firebase Emulator'da):
- quruq rejim hech narsa yozmaydi; zaxira har doim yoziladi va asl hujjatlar bilan aynan bir xil;
- ko'chirishdan keyin barcha biznes maydonlari saqlanadi, faqat parol xeshlari/`rawPwd`/takroriy `fullName` yo'qoladi;
- vaqtinchalik parol bilan kirish ishlaydi, eski `rawPwd` bilan — yo'q;
- takroriy ishga tushirish hech narsani o'zgartirmaydi;
- `scripts/restore-backup.js` zaxiradan hujjatni aynan qaytaradi.

## 4. Foydalanuvchilarga xabar (namuna)

> Hurmatli foydalanuvchi! UncertaintyCalc xavfsizlik yangilanishi sababli barcha parollar almashtirildi. Loginingiz o'zgarmadi: **{login}**. Vaqtinchalik parolingiz: **{parol}**. Saytga kirgach, yuqori paneldagi "Parolni o'zgartirish" tugmasi orqali o'zingizning parolingizni (kamida 8 belgi) qo'ying. Eski parolingizni boshqa saytlarda ishlatgan bo'lsangiz, u yerda ham almashtiring.

## 5. Parolni tiklash oqimi (email yo'q)

Sun'iy email ishlatilgani uchun "parolni unutdim → emailga havola" oqimi **yo'q** (PLAN P02, 1-savol, (a) variant).

| Kim unutdi | Kim tiklaydi | Qanday |
|---|---|---|
| Xodim | tashkilot admini | Admin panelida xodimni o'chiradi va qayta qo'shadi → yangi login (masalan `a.karimov2`) va vaqtinchalik parol bir marta ko'rsatiladi. Eski Auth hisobi `cleanup-orphan-auth.js` bilan tozalanadi |
| Xodim (o'sha loginni saqlash kerak) | super-admin | `node scripts/reset-password.js --project noaniqlikbazasi --login <login>` |
| Tashkilot admini | super-admin | o'sha `reset-password.js` |
| Super-admin | o'zi | Firebase konsoli → Authentication → Users → foydalanuvchi → *Reset password* (haqiqiy email bo'lsa) yoki ⋮ → parolni o'zgartirish |

Parolni bilgan foydalanuvchi o'zi o'zgartiradi: "Parolni o'zgartirish" (joriy parol so'raladi — `reauthenticateWithCredential` + `updatePassword`).

## 6. Ma'lum cheklovlar

- Xodimni o'chirish Firestore hujjatini o'chiradi; Auth hisobi qoladi (Admin SDK kerak) — `scripts/cleanup-orphan-auth.js`.
- Xodimlar soni limiti (`maxUsers`) mijozda tekshiriladi; qoidalar sanay olmaydi.
- Ro'yxatdan o'tishda login band/bo'shligini oldindan ko'rsatish olib tashlandi (anonim o'qish yo'q) — band bo'lsa "Bu login band" xatosi ro'yxatdan o'tish tugmasidan keyin chiqadi.
- Bitta Auth hisobi — bitta tashkilot (yangi tashkilot ID = asoschi `uid`).
