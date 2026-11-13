# Shaxsiy ma'lumotlar: qayerda saqlanadi, kim o'qiydi, nima uchun kerak (P02)

> Holat: 2026-11-13, P02 (Firebase Authentication + `firestore.rules`) bo'yicha.
> Bu hujjat yuridik xulosa **emas** — texnik inventarizatsiya va ochiq yuridik savollar ro'yxati.
> Bog'liq: [SECURITY_SETUP.md](SECURITY_SETUP.md), [AUTH_MIGRATION.md](AUTH_MIGRATION.md), [PLAN.md](PLAN.md) P15, [RISKS.md](RISKS.md) R-14, R-15.

## 1. Huquqiy kontekst

### 1.1. O'RQ-547 "Shaxsga doir ma'lumotlar to'g'risida"gi Qonun, 27¹-modda (avvalgi tahrir)

O'zbekiston fuqarolarining shaxsga doir ma'lumotlarini qayta ishlashda ularni O'zbekiston hududidagi texnik vositalarda saqlash (lokalizatsiya) talabi. P00 rejasida shu talabdan kelib chiqib **P15** (shaxsiy ma'lumotlarni O'zbekistondagi serverga ko'chirish) rejalashtirilgan edi.

### 1.2. O'RQ-1125 (26.03.2026) — yangi tahrir

Egasi bergan ma'lumot (2026-11-13; manba: [lex.uz/docs/-8099215](https://lex.uz/docs/-8099215)):

- yangi tahrirda **majburiy mahalliy saqlash** talabi endi faqat quyidagilarga tegishli:
  - **biometrik** ma'lumotlar,
  - **genetik** ma'lumotlar,
  - **telekommunikatsiya operatorlari** foydalanuvchilarining ma'lumotlari;
- boshqa shaxsga doir ma'lumotlarni Qonunda belgilangan **shartlar bajarilganda** xorijda saqlash mumkin.

> ⚠ Qonun matni va "shartlar" ro'yxati Claude tomonidan asl manba bilan solishtirilmagan. Quyidagi xulosalar egasi bergan qisqacha mazmunga asoslangan va **yuridik qayta baholashni** talab qiladi.

### 1.3. UncertaintyCalc uchun oqibat

- Platforma biometrik yoki genetik ma'lumot yig'maydi va telekommunikatsiya operatori emas (§2 jadvali). Demak, egasi bergan mazmunga ko'ra, mavjud ma'lumotlar uchun **majburiy lokalizatsiya talabi qo'llanilmasligi mumkin**.
- **P15 zaruriyati yuridik qayta baholanishi kerak.** Ochiq savollar (yurist uchun):
  1. Xorijda (Google Cloud / Firebase) saqlash uchun O'RQ-1125 dagi qaysi shartlar bajarilishi kerak (sub'ekt roziligi, transchegaraviy uzatish shartlari, mamlakatlar ro'yxati, shartnoma va h.k.) va ular hozir bajarilganmi?
  2. Shaxsga doir ma'lumotlar bazasini davlat reestrida (pd.gov.uz) ro'yxatdan o'tkazish talabi o'zgarganmi?
  3. Tashkilot STIR'i (INN) va yakka tadbirkor STIR'i — qaysi biri shaxsga doir ma'lumot hisoblanadi?
  4. Elektron imzo (E-IMZO) yoki sertifikat tekshirish sahifasi (P15) kabi kelajakdagi funksiyalar lokalizatsiya talabiga tushadimi?
- P15 ning boshqa sabablari (mustaqil server tomonidan qayta hisob, sertifikat tekshiruvi, audit izi, Firebase'ga bog'liqlikni kamaytirish) yuridik talabdan qat'i nazar o'z kuchida qoladi — qaror egasida.
- **Ma'lumotlarni minimallashtirish tamoyili o'zgarmaydi:** faqat kerakli ma'lumot yig'iladi, yangi shaxsiy maydon qo'shilmaydi (CLAUDE.md), mavjudlari kamaytiriladi. Yuridik talab yumshagani bu tamoyilni bekor qilmaydi.

## 2. Ma'lumotlar inventarizatsiyasi

Belgilar: **ShM** — shaxsga doir ma'lumot (jismoniy shaxsni aniqlashga imkon beradi); **o'qiydi** — `firestore.rules` bo'yicha.

### 2.1. Firestore `organizations/{adminUid}` — tashkilot (Google Cloud, Firebase loyihasi `noaniqlikbazasi`)

| Maydon | ShM | Nima uchun kerak | Kim o'qiydi | Kim yozadi | P02 holati |
|---|---|---|---|---|---|
| `inn` | ha/yo'q (STIR: YaTT uchun — ha) | hisob-faktura, tashkilotni aniqlash | admin, faol xodimlar, super-admin | admin (faqat yaratishda) | saqlandi |
| `phone` | **ha** | to'lov / aktivatsiya bo'yicha aloqa | admin, faol xodimlar, super-admin | admin (yaratishda) | saqlandi |
| `firstName`, `lastName` | **ha** | hisob-faktura, panelda ism | admin, faol xodimlar, super-admin | admin (yaratishda) | saqlandi |
| `fullName` | ha (takror) | — | — | — | **o'chirildi** (takror); eski hujjatlardan `migrate-legacy-users.mjs --strip-legacy` |
| `passwordHash` | ha (autentifikator) | — | — | — | **o'chirildi**; qoidalar yozishni taqiqlaydi |
| `login` | qisman (ism-familiyadan hosil bo'lishi mumkin) | kirish | admin, faol xodimlar, super-admin | admin (yaratishda) | saqlandi |
| `employeeCount`, `plan`, `requestedPlan`, `planExpiry`, `active`, `paymentStatus`, `registeredAt`, `paidAt`, `activatedAt` | yo'q | obuna va to'lov holati | admin, faol xodimlar, super-admin | `active`, `paymentStatus`, `plan`, `planExpiry` — **faqat super-admin**; `requestedPlan`, `employeeCount` — admin | saqlandi |

### 2.2. Firestore `employees/{uid}` — xodim

| Maydon | ShM | Nima uchun kerak | Kim o'qiydi | Kim yozadi | P02 holati |
|---|---|---|---|---|---|
| `name` | **ha** | admin panelida xodimni tanish | xodimning o'zi, o'z tashkiloti admini, super-admin | admin | saqlandi |
| `phone` | **ha** | admin uchun aloqa | xuddi shunday | admin | saqlandi (minimallashtirish nomzodi — pastda) |
| `role` (lavozim) | qisman | admin uchun | xuddi shunday | admin | saqlandi |
| `login` | qisman | kirish | xuddi shunday | admin (yaratishda) | saqlandi |
| `orgId`, `active`, `createdAt` | yo'q | huquqlar | xuddi shunday | admin | saqlandi |
| `rawPwd` | **ha — ochiq parol** | — | — | — | **o'chirildi**; eski hujjatlardan `--strip-legacy` |
| `passwordHash` | ha | — | — | — | **o'chirildi** |

### 2.3. Firestore `authCleanup/{uid}` (P02 da yangi kolleksiya, yangi shaxsiy maydon **yo'q**)

| Maydon | ShM | Nima uchun | Kim o'qiydi | Saqlanish muddati |
|---|---|---|---|---|
| `login` (eski), `orgId`, `reason`, `at` | `login` — qisman | o'chirilgan/almashtirilgan xodimning eski Auth hisobini egasi konsolda o'chirishi uchun | faqat super-admin | egasi Auth hisobini o'chirib "Bajarildi" bosguncha |

### 2.4. Firebase Authentication (Google)

| Ma'lumot | ShM | Izoh |
|---|---|---|
| Sun'iy email `<login>@users.<domen>` | qisman (login orqali) | haqiqiy email emas, pochta qutisi yo'q; faqat Auth ichida |
| Parol xeshi | ha (autentifikator) | Google tomonida (scrypt), loyiha egasi ham ko'ra olmaydi |
| UID, yaratilgan / oxirgi kirish vaqti | yo'q / qisman | Firebase avtomatik saqlaydi |
| Custom claim `superadmin` | yo'q | faqat super-admin hisobida |

Telefon (SMS) yoki haqiqiy email bilan autentifikatsiya **ishlatilmaydi** (egasining qarori, 2026-11-13).

### 2.5. Brauzer (`localStorage`, foydalanuvchining qurilmasi)

| Kalit | Mazmuni | ShM |
|---|---|---|
| `uc_state_v2` | o'lchash ma'lumotlari, byudjet, natijalar | odatda yo'q (foydalanuvchi izohlarga ism yozishi mumkin) — **serverga yuborilmaydi** |
| `uc_theme`, `uc_lang`, `uc_trial_count` | sozlamalar | yo'q |
| Firebase Auth (IndexedDB `firebaseLocalStorageDb`) | Auth token'i | qisman (UID, sun'iy email) |
| `uc_session`, `uc_sa_session` | eski imzosiz sessiya | P02 da sahifa ochilganda **o'chiriladi** |

### 2.6. Uchinchi tomon so'rovlari (brauzerdan)

| Manzil | Nima yuboriladi | Izoh |
|---|---|---|
| `firestore.googleapis.com` | §2.1–2.3 ma'lumotlari, Auth token | Firebase |
| `identitytoolkit.googleapis.com`, `securetoken.googleapis.com` | login (sun'iy email), parol, token | Firebase Auth |
| `fonts.googleapis.com`, `fonts.gstatic.com` | IP manzil, User-Agent | Google Fonts — P02 da qoldi; kelajakda shriftlarni `vendor/` ga ko'chirish mumkin (minimallashtirish) |

Firebase SDK endi `vendor/` dan yuklanadi — `www.gstatic.com` ga so'rov yo'q.

## 3. Saqlash joyi

- Firestore va Auth ma'lumotlari Google Cloud'da, loyiha yaratilganda tanlangan **joylashuvda** (location). Egasi tekshiradi: Konsol → ⚙ **Project settings → General → Default GCP resource location** (Firestore: **Firestore Database** sahifasining yuqorisida). Natijani shu yerga yozing: `__________` (masalan `eur3`, `europe-west3`, `us-central`).
- Joylashuvni keyin o'zgartirib bo'lmaydi (faqat yangi loyiha + ko'chirish).

## 4. Minimallashtirish — bajarilgan va qolgan

**P02 da bajarildi:** `rawPwd`, `passwordHash`, `fullName` o'chirildi; yangi shaxsiy maydon qo'shilmadi (sun'iy email — haqiqiy email o'rniga); anonim o'qish va tashkilotlararo o'qish taqiqlandi; ro'yxatdan o'tishda login bandligini tekshirish uchun bazaga anonim so'rov olib tashlandi (Firebase Auth o'zi tekshiradi); xodim parollari endi hech qayerda saqlanmaydi.

**Keyingi nomzodlar (egasi qaror qiladi):**
1. `employees.phone` — xodim uchun telefon majburiyligi kerakmi? Ixtiyoriy qilish yoki olib tashlash.
2. `organizations.firstName/lastName` — tashkilot nomi (yuridik nom) bilan almashtirish (yuridik shaxs nomi shaxsiy ma'lumot emas).
3. Google Fonts → `vendor/` (IP manzil Google'ga yuborilmaydi).
4. Saqlash muddati siyosati: bloklangan/to'lamagan tashkilotlar qancha vaqtdan keyin o'chiriladi.
5. Maxfiylik siyosati sahifasi (3 tilda): qaysi ma'lumot, nima uchun, qayerda, qancha muddat, sub'ekt huquqlari.

## 5. P15 dagi ko'chirish rejasi (yuridik qayta baholashdan keyin)

Agar P15 amalga oshirilsa (yuridik talab yoki egasining boshqa sabablari bilan):

1. O'zbekistondagi serverda (PostgreSQL) `organizations`/`employees` ning §2.1–2.2 dagi ShM maydonlari saqlanadi.
2. Firebase'da faqat anonim identifikatorlar qoladi (UID, `orgId`, holat maydonlari) yoki Firebase umuman olib tashlanadi.
3. Autentifikatsiya serverga ko'chirilsa — parollarni ko'chirib bo'lmaydi (Firebase scrypt xeshi eksport qilinadi, lekin yangi tizimda qo'llab-quvvatlanishi kerak) → yangi parol berish oqimi, AUTH_MIGRATION.md B yo'l kabi.
4. Ko'chirishdan keyin Firebase'da ShM qolmaganini skript bilan tekshirish (PLAN.md P15).
