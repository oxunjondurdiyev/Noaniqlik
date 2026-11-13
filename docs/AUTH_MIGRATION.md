# Autentifikatsiyani ko'chirish (P02): eski login/parol → Firebase Authentication

> Kim uchun: egasi. Qachon: `docs/SECURITY_SETUP.md` dagi 1–3-qadamlardan keyin, qoidalarni joylashdan (5-qadam) **oldin**.
> Skript: [`scripts/migrate-legacy-users.mjs`](../scripts/migrate-legacy-users.mjs) (Admin SDK, faqat egasining kompyuterida, service account kaliti bilan).

## 1. Nima o'zgardi

| | Eski (P00) | Yangi (P02) |
|---|---|---|
| Parol qayerda | Firestore: `organizations.passwordHash`, `employees.passwordHash` (SHA-256 + statik tuz `:uc_noaniqlik_v1`), `employees.rawPwd` (**ochiq matn**) | Faqat Firebase Authentication (Google tomonida xeshlanadi). Firestore'da parol yoki xesh **yo'q** — qoidalar yozishni ham taqiqlaydi |
| Tekshiruv | Brauzer butun hujjatni yuklab, xeshni o'zi solishtirgan | Firebase Auth serveri |
| Sessiya | `localStorage.uc_session` (imzosiz JSON) | Firebase Auth token'i (imzolangan). Eski kalitlar o'chiriladi |
| Super-admin | `firebase-config.js` dagi ochiq login/parol + `uc_sa_session = 'true'` | Auth hisobi + custom claim `superadmin: true` |
| Login | `organizations.login` / `employees.login` | O'sha login; Auth'da sun'iy email `<login>@users.noaniqlikbazasi.firebaseapp.com` |
| Hujjat ID | Firestore auto-ID | **= Auth UID** (`organizations/{adminUid}`, `employees/{uid}`) |
| `fullName` | `firstName + ' ' + lastName` takrori | o'chirildi (ko'rsatishda hisoblanadi) |
| Tarif o'zgartirish | admin o'zi (`plan`, `planExpiry` ni yozgan) | admin **so'rov** yuboradi (`requestedPlan`), super-admin qo'llaydi |
| Xodim paroli | admin panelida doim ko'rinib turgan (`rawPwd`) | yaratilganda **bir marta** ko'rsatiladi, saqlanmaydi |

Ko'chirishda har bir foydalanuvchining Auth UID'i uning **eski hujjat ID'siga teng** qilib yaratiladi — shuning uchun Firestore'dagi hujjatlarni ko'chirish yoki `orgId` larni o'zgartirish shart emas.

## 2. Qaysi yo'lni tanlash

Eski sozlamada Firestore "test mode"da (hammaga ochiq) bo'lgan deb hisoblanadi (CLAUDE.md, RISKS R-S1). Unda `rawPwd` (ochiq parollar) va statik tuzli xeshlar **istalgan kishiga** ochiq bo'lgan. Shuning uchun:

- **B yo'l — yangi parollar (TAVSIYA, standart).** Har bir foydalanuvchiga yangi tasodifiy parol beriladi. Eski parollar butunlay yaroqsiz bo'ladi.
- **A yo'l — eski parollarni saqlash (xeshlarni import qilish).** Faqat Firestore qoidalari doim yopiq bo'lganiga **aniq dalil** bo'lsa (masalan, konsoldagi Rules tarixi). Eslatma: A yo'lning xesh parametrlari (`SHA256`, `rounds=1`, `PASSWORD_FIRST`) Emulator'da tekshirib bo'lmaydi (Emulator haqiqiy xesh tekshiruvini qilmaydi) — **avval bitta hisob bilan sinang**; kirib bo'lmasa, B yo'lga o'ting.

Qanday bilish mumkin: Konsol → Firestore → **Rules** → o'ng tomonda tarix (history). Agar biror paytda `allow read, write: if true` yoki `if request.time < …` bo'lgan bo'lsa — ochiq bo'lgan, **B yo'l**.

## 3. B yo'l — yangi parollar (tavsiya)

```bash
npm install
```
```bash
node scripts/migrate-legacy-users.mjs --key ~/keys/noaniqlik-serviceAccount.json --new-passwords
```

Natija:
- har bir tashkilot admini va xodim uchun Auth hisobi (UID = eski hujjat ID, email = sun'iy);
- `migration-out/new-passwords.csv` — `kind,docId,login,password` (fayl huquqi 600, `.gitignore` da). **Parollar faqat shu yerda.**

Keyin:
1. Har bir **tashkilot adminiga** o'z login/parolini xavfsiz kanal orqali bering (shaxsan, telefon orqali, shifrlangan messenjer). Email/oddiy SMS'da parol yubormang.
2. **Xodimlarning** parollarini ham shu fayldan berasiz, yoki — oddiyroq — tashkilot admini kirgach, har bir xodim uchun `admin.html` → **Parolni tiklash** ni bosadi (yangi login + parol bir marta ko'rsatiladi). Bunda migratsiyada yaratilgan eski xodim hisobi `authCleanup` navbatiga tushadi (SECURITY_SETUP.md, 10-bo'lim).
3. Hammasi tarqatilgach `migration-out/new-passwords.csv` ni **o'chiring** (`rm -P` yoki xavfsiz o'chirish).
4. Skript qayta ishga tushirilsa, allaqachon yaratilgan hisoblarni o'tkazib yuboradi (`auth/uid-already-exists`).

## 4. A yo'l — eski parollar bilan (ixtiyoriy)

```bash
node scripts/migrate-legacy-users.mjs --key ~/keys/noaniqlik-serviceAccount.json --import-file
```
→ `auth-import.json` (parol xeshlari bor! `.gitignore` da). So'ng:
```bash
npx firebase login
```
```bash
npx firebase auth:import auth-import.json --hash-algo=SHA256 --rounds=1 --hash-input-order=PASSWORD_FIRST --project noaniqlikbazasi
```
1. **Bitta** hisob bilan saytga kirib ko'ring. Kira olmasa — `auth-import.json` dagi hisoblarni konsolda o'chiring va B yo'lga o'ting.
2. Muvaffaqiyatli bo'lsa ham, foydalanuvchilarga parolni almashtirishni tavsiya qiling: tashkilot admini → egasi `reset-user-password.mjs` bilan; xodim → admin panelida "Parolni tiklash".
3. `auth-import.json` ni **o'chiring**.

## 5. Login formati mos kelmaydigan foydalanuvchilar

Yangi login qoidasi: 3–32 belgi, `a-z 0-9 . _ -`, boshi va oxiri harf/raqam, `..` yo'q (Firestore qoidalaridagi `validLogin()` bilan bir xil). Eski tizimda tashkilot admini login'ni erkin yozgan bo'lishi mumkin — skript bunday hujjatlarni `! … login yaroqsiz` deb ko'rsatib o'tkazib yuboradi. Ular uchun:

1. Konsol → Firestore → `organizations/<docId>` → `login` maydonini yaroqli qiymatga o'zgartiring (masalan `a.karimov`).
2. Skriptni qayta ishga tushiring (`--new-passwords`) — faqat yetishmagan hisob yaratiladi.

Xodimlarning loginlari eski tizimda avtomatik yaratilgan (`a.karimov`, `a.karimov2` …) — odatda mos keladi.

## 6. Eski maydonlarni o'chirish

Ko'chirish tugagach va kamida bitta admin + bitta xodim yangi tizimda kirgach:
```bash
node scripts/migrate-legacy-users.mjs --key ~/keys/noaniqlik-serviceAccount.json --strip-legacy --yes
```
```bash
node scripts/migrate-legacy-users.mjs --key ~/keys/noaniqlik-serviceAccount.json --check
```
O'chiriladigan maydonlar: `passwordHash`, `rawPwd`, `fullName`. Boshqa maydonlar (INN, telefon, ism, tarif va h.k.) o'zgarmaydi. Bu amal **qaytarilmaydi** — shuning uchun `--yes` talab qilinadi.

Ixtiyoriy: o'chirishdan oldin Firestore zaxira nusxasi (Blaze tarifida *Import/Export*; Spark'da — konsoldan qo'lda yoki skript bilan JSON'ga). Zaxira nusxada ham `rawPwd` bo'ladi — uni ham xavfsiz saqlang yoki o'chiring.

## 7. Parolni tiklash oqimi (yangi tizimda, doimiy)

Sun'iy email'ga xat yuborib bo'lmaydi va Spark tarifida Cloud Functions yo'q, shuning uchun "Parolni unutdim" havolasi yo'q:

1. **Xodim** parolini unutdi → tashkilot admini `admin.html` → **Parolni tiklash** → xodim uchun **yangi login + yangi parol** yaratiladi (ikkinchi `firebase.initializeApp` instansiyasi; adminning o'z sessiyasi saqlanadi). Eski xodim yozuvi o'chiriladi, eski Auth hisobi `authCleanup` navbatiga yoziladi.
2. **Tashkilot admini** parolini unutdi → egasiga murojaat qiladi → egasi:
   ```bash
   node scripts/reset-user-password.mjs --key ~/keys/noaniqlik-serviceAccount.json --login <login>
   ```
   Login o'zgarmaydi, yangi parol bir marta chiqadi, eski sessiyalar bekor qilinadi.
3. **Eski Auth hisoblarini o'chirish** (`authCleanup` navbati) — `docs/SECURITY_SETUP.md`, 10-bo'lim: konsol → Authentication → Users → UID bo'yicha o'chirish → super-admin panelida "Bajarildi".

Nega xodimga login ham o'zgaradi: brauzer boshqa foydalanuvchining parolini o'zgartira olmaydi (Admin SDK kerak). Yangi hisob yaratish — Spark tarifida yagona xavfsiz yo'l; eski login Auth'dan o'chirilmaguncha band bo'lib turadi, shuning uchun yangi login raqam qo'shimchasi bilan beriladi (`a.karimov` → `a.karimov2`).

## 8. Nima buzilishi mumkin va qanday aniqlanadi

| Holat | Belgisi | Yechim |
|---|---|---|
| Authentication yoqilmagan | kirishda "Firebase Authentication (Email/Password) hali yoqilmagan" | SECURITY_SETUP.md, 1-qadam |
| Qoidalar joylangan, sayt eski | eski sayt "Missing or insufficient permissions" | PR'ni birlashtiring / brauzer keshini yangilang |
| Sayt yangi, qoidalar eski | ishlaydi, lekin ma'lumot hali ochiq | SECURITY_SETUP.md, 5-qadamni darhol bajaring |
| Foydalanuvchi ko'chirilmagan | "Login yoki parol noto'g'ri" | 3-bo'lim (skriptni qayta ishga tushirish) yoki 5-bo'lim |
| Auth hisobi bor, Firestore yozuvi yo'q | "Bu hisob o'chirilgan yoki almashtirilgan" | xodimni admin qayta qo'shadi; eski hisob — `authCleanup` |
| Super-admin claim berilmagan | "Bu hisobda super-admin huquqi yo'q" | SECURITY_SETUP.md, 3-qadam; qayta kiring |
| Tarif limiti (xodimlar soni) | qoidalarda sanalmaydi — faqat mijozda | ma'lum cheklov (Spark, Cloud Functions'siz); super-admin panelida nazorat |

## 9. Orqaga qaytish

Yangi qoidalar eski kod bilan ishlamaydi va aksincha. Favqulodda holatda: Firestore → Rules → tarixdan oldingi versiyani tiklash **va** GitHub'da P02 PR'ini revert qilish. Lekin bu ma'lumotlarni yana ochiq qiladi — faqat qisqa muddatga va sababini aniqlash uchun.
