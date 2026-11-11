# Shaxsiy ma'lumotlar: qayerda saqlanadi va P15 ko'chirish rejasi

> Holat: 2026-11-11, P02 dan keyin. Bog'liq: [ARCHITECTURE.md §9](ARCHITECTURE.md), [RISKS.md](RISKS.md) R-S1, [PLAN.md](PLAN.md) P15, [SECURITY_SETUP.md](SECURITY_SETUP.md).
> Bu hujjat texnik inventarizatsiya. Huquqiy xulosa emas — O'RQ-547 bo'yicha talqinni yurist bilan tasdiqlang.

## 1. Huquqiy asos (qisqacha)

O'zbekiston Respublikasining "Shaxsga doir ma'lumotlar to'g'risida"gi Qonuni (O'RQ-547, 2019) **27¹-moddasi** (2021-yilda qo'shilgan) bo'yicha: O'zbekiston fuqarolarining shaxsga doir ma'lumotlarini axborot texnologiyalari, jumladan Internet orqali qayta ishlaydigan mulkdor va operator ularni yig'ish, tizimlashtirish va saqlashni **O'zbekiston hududida jismonan joylashgan** texnik vositalarda bajarishi va bu ma'lumotlar bazalarini **Shaxsga doir ma'lumotlar bazalari davlat reestrida** (pd.gov.uz) ro'yxatdan o'tkazishi kerak.

**Hozirgi holat bu talabga mos emas:** Firebase (Google Cloud) serverlari O'zbekistondan tashqarida. Shuning uchun P15 gacha: (1) yangi shaxsiy maydon qo'shilmaydi (CLAUDE.md), (2) mavjudlari minimallashtiriladi, (3) P15 da O'zbekistondagi serverga ko'chiriladi.

## 2. Firebase'da saqlanayotgan har bir shaxsiy maydon

### 2.1. Firestore — `organizations/{orgId}` (tashkilot admini)

| Maydon | Shaxsiy ma'lumotmi | Nima uchun kerak | Kim o'qiydi (qoidalar) | P02 da | Minimallashtirish taklifi |
|---|---|---|---|---|---|
| `firstName`, `lastName` | **ha** (F.I.Sh.) | hisob-faktura "Xaridor", super-admin bilan aloqa | egasi, super-admin | saqlandi | **Tashkilot nomi** (`orgName`, yuridik shaxs nomi — shaxsiy emas) bilan almashtirish; F.I.Sh. ixtiyoriy yoki umuman yo'q |
| `fullName` | **ha** | — (takror) | — | **o'chirildi** (migratsiya) | — |
| `phone` | **ha** | to'lov/aktivatsiya bo'yicha aloqa | egasi, super-admin | saqlandi | Ixtiyoriy qilish; yoki tashkilotning ish telefoni |
| `inn` (STIR) | yuridik shaxs uchun — yo'q; **YaTT uchun — ha** | hisob-faktura, to'lovni aniqlash | egasi, super-admin | saqlandi | Saqlansin (to'lov uchun zarur), lekin P15 da birinchi navbatda ko'chiriladi |
| `login` | ha (identifikator; odatda F.I.Sh. dan translit: `a.karimov`) | kirish | egasi, super-admin | saqlandi | Neytral login tavsiya qilish (`lab-123`), ismdan avtomatik yasamaslik |
| `passwordHash` | ha (autentifikatsiya) | — | — | **o'chirildi** — parol endi faqat Firebase Auth'da | — |
| `ownerUid` | psevdonim identifikator | qoidalar uchun | egasi, super-admin | **yangi (texnik)** — shaxsiy ma'lumot emas, Auth uid | — |
| `employeeCount`, `plan`, `planExpiry`, `registeredAt`, `active`, `paymentStatus`, `paidAt`, `activatedAt`, `requestedPlan` | yo'q | tarif va holat | egasi (o'qish), super-admin | saqlandi; `requestedPlan` yangi (texnik) | — |

### 2.2. Firestore — `employees/{uid}` (xodim)

| Maydon | Shaxsiy ma'lumotmi | Nima uchun kerak | Kim o'qiydi | P02 da | Minimallashtirish taklifi |
|---|---|---|---|---|---|
| `name` | **ha** (F.I.Sh.) | admin xodimni taniydi, topbar'da ism | o'zi, o'z tashkiloti admini, super-admin | saqlandi | Ixtiyoriy "ko'rsatiladigan nom" (masalan, faqat ism yoki initsiallar) |
| `phone` | **ha** | hozir hech qayerda ishlatilmaydi (faqat jadvalda ko'rsatiladi) | o'sha | saqlandi | **Olib tashlash** tavsiya etiladi (admin formasida majburiy — egasi qarori kerak) |
| `role` (lavozim) | ha (shaxsga bog'langan) | jadvalda ko'rsatish | o'sha | saqlandi | Ixtiyoriy qilish |
| `login` | ha (ismdan translit) | kirish | o'sha | saqlandi | Neytral login |
| `rawPwd` | **ha — ochiq parol** | — | — | **o'chirildi** | — |
| `passwordHash` | ha | — | — | **o'chirildi** | — |
| `orgId`, `createdAt`, `active` | yo'q | qoidalar, holat | o'sha | saqlandi | — |

### 2.3. Firestore — `admins/{uid}`

| Maydon | Shaxsiy ma'lumotmi | Izoh |
|---|---|---|
| `grantedAt` (yoki bo'sh) | yo'q | super-admin belgisi, faqat konsol/Admin SDK yozadi |

### 2.4. Firebase Authentication (P02 da yangi xizmat)

| Ma'lumot | Shaxsiy ma'lumotmi | Izoh |
|---|---|---|
| `email` | sun'iy: `login@users.noaniqlikbazasi.firebaseapp.com` — login qismi ismdan translit bo'lishi mumkin | haqiqiy email **to'planmaydi** (PLAN P02, 1-savol, (a) variant) |
| parol xeshi | ha (autentifikatsiya) | Google tomonidan (scrypt); biz ko'rmaymiz |
| `uid`, yaratilgan/oxirgi kirish vaqti | psevdonim / metama'lumot | Firebase avtomatik saqlaydi |
| IP manzil, User-Agent | ha (texnik) | Google Cloud jurnallarida (bizning kodimiz yozmaydi) |
| `displayName` | — | **yozilmaydi** (migratsiya skripti ham yozmaydi) |
| super-adminning haqiqiy email'i | ha (egasining o'zi) | egasi konsolda o'zi yaratadi |

### 2.5. Firebase'ga yuborilmaydigan ma'lumotlar

- Hisoblash ma'lumotlari (o'lchashlar, byudjetlar, natijalar, shablonlar) — faqat brauzer `localStorage` (`uc_state_v2`) da.
- Hisob-faktura (F.I.Sh., INN, telefon) — brauzerda chiziladi, saqlanmaydi.
- `uc_trial_count`, `uc_lang`, `uc_theme` — brauzerda.
- Firebase Auth token — brauzerning IndexedDB'sida (`firebaseLocalStorageDb`), faqat shu qurilmada.
- Google Analytics ishlatilmaydi (`measurementId` konfiguratsiyadan olib tashlandi).

## 3. P02 da nima qilindi (minimallashtirish)

1. `passwordHash`, `rawPwd` — Firestore'dan butunlay o'chiriladi (yangi kod yozmaydi, qoidalar rad etadi, migratsiya mavjudlarini o'chiradi).
2. `fullName` — takror maydon o'chirildi.
3. Yangi shaxsiy maydon qo'shilmadi: Auth uchun haqiqiy email o'rniga sun'iy manzil; `displayName` yozilmaydi.
4. O'qish huquqi qisqardi: avval (ehtimol) hamma — endi faqat o'zi, o'z tashkiloti admini va super-admin.
5. Firestore qoidalari maydonlarni ro'yxat bilan cheklaydi (`hasOnly`) — mijoz kodi yangi maydon qo'sha olmaydi.

## 4. Egasi qaror qilishi kerak bo'lgan minimallashtirish takliflari

| # | Taklif | Ta'siri |
|---|---|---|
| D1 | `employees.phone` ni olib tashlash (yoki ixtiyoriy) | admin formasidan maydon olinadi; migratsiya bilan mavjudlari o'chiriladi |
| D2 | `organizations.firstName/lastName` o'rniga `orgName` (tashkilot nomi) | hisob-faktura "Xaridor" = tashkilot nomi; ro'yxatdan o'tish formasi o'zgaradi |
| D3 | Loginni ismdan avtomatik yasamaslik | `suggestLogin` o'rniga neytral tavsiya |
| D4 | `employees.role` va `name` ni ixtiyoriy qilish | admin jadvali soddalashadi |
| D5 | Ro'yxatdan o'tish formasiga shaxsiy ma'lumotlarni qayta ishlashga **rozilik** matni va maxfiylik siyosati havolasi | qonunchilik talabi (yurist bilan tasdiqlansin); yangi maydon emas — faqat matn + tasdiq belgisi |

## 5. P15 — O'zbekistondagi serverga ko'chirish rejasi

Maqsad: Firebase'da shaxsiy ma'lumot qolmasin (yoki Firebase umuman ishlatilmasin).

**Bosqichlar:**

1. **Hosting tanlash** (egasi): O'zbekistonda jismonan joylashgan data-markaz (masalan, UZINFOCOM yoki boshqa mahalliy provayder) — TLS, zaxira nusxa, kirish jurnallari. Ma'lumotlar bazasi (PostgreSQL, PLAN P15 / `docs/prompts` P11 §5 `SERVER_DESIGN.md`).
2. **pd.gov.uz reestri:** server tayyor bo'lgach, shaxsiy ma'lumotlar bazasini Davlat reestrida ro'yxatdan o'tkazish (operator ma'lumotlari, maqsad, ma'lumot turlari — 2-bo'limdagi jadval asos bo'ladi, joylashuv, himoya choralari).
3. **Autentifikatsiya** serverda: parollar serverda sekin KDF (argon2id/scrypt) bilan. Firebase Auth'dan parol xeshlarini eksport qilish mumkin (`firebase auth:export`, scrypt parametrlari bilan), lekin **soddaroq va xavfsizroq yo'l** — yana bir marta vaqtinchalik parol berish (shu P02 dagi oqim kabi).
4. **Ma'lumotni ko'chirish:**
   - `scripts/migrate-auth.js` dagi `backup()` formatida to'liq eksport (`organizations`, `employees`, `admins`);
   - yangi serverga import; hujjatlar soni va har bir hujjatning kanonik JSON SHA-256 xeshi bo'yicha solishtirish (ikki tomonda);
   - mijoz kodi Firebase o'rniga `RemoteAdapter` (P04 skeleti) orqali serverga ulanadi; Firebase SDK `vendor/` dan olib tashlanadi, CSP `connect-src` yangi server domeniga o'zgaradi.
5. **Firebase'dan o'chirish:** server barqaror ishlagani tasdiqlangach (masalan, 2 hafta): Firestore kolleksiyalari va barcha Auth hisoblari o'chiriladi; Google Cloud'dagi eksport/zaxiralar ham o'chiriladi; o'chirish dalolatnomasi (sana, hujjatlar soni) saqlanadi.
6. **Hujjatlar:** maxfiylik siyosati, rozilik matni (D5), ma'lumotlarni saqlash muddati va o'chirish tartibi, insident (sizib chiqish) bo'yicha harakatlar tartibi.

**P15 gacha:** yangi shaxsiy maydon qo'shilmaydi; D1–D5 takliflaridan qabul qilinganlari P02 dan keyingi kichik PR'larda bajariladi.

## 6. Egasidan kerakli ma'lumotlar

- Firestore joylashuvi (konsol → Firestore → Settings → *Location*) — 2-bo'lim jadvaliga yoziladi.
- D1–D5 bo'yicha qaror.
- P15 hosting provayderi va reestrdan o'tish uchun mas'ul shaxs.
