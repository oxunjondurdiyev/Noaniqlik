# Xavfsizlikni sozlash — Firebase konsolida egasi bajaradigan amallar (P02)

> Bu hujjat — P02 kodini ishga tushirish uchun **egasi** bajaradigan qadamlar. Claude konsol amallarini bajarmaydi.
> Loyiha: `noaniqlikbazasi`. Sayt: GitHub Pages (`https://oxunjondurdiyev.github.io/…`).
> Bog'liq: [AUTH_MIGRATION.md](AUTH_MIGRATION.md) (foydalanuvchilarni ko'chirish), [DATA_RESIDENCY.md](DATA_RESIDENCY.md), [RISKS.md](RISKS.md) R-S1…R-S5, R-14, R-15.

## 0. Qisqa xulosa — tartib muhim

Eski sayt (P02 dan oldingi) parollarni Firestore'dan o'qib, brauzerda tekshiradi. Yangi qoidalar joylangan zahoti eski sayt ishlamay qoladi; yangi sayt esa migratsiyasiz eski foydalanuvchilarni tanimaydi. Shuning uchun quyidagi qadamlarni **bir o'tirishda, shu tartibda** bajaring (taxminan 30–60 daqiqa):

| # | Qadam | Qayerda | Qaytarib bo'ladimi |
|---|---|---|---|
| 1 | Tayyorgarlik: Node, `npm ci`, Admin SDK hisobi | kompyuter | — |
| 2 | **Zaxira nusxa** (dry-run migratsiya) | kompyuter | — |
| 3 | Authentication'ni yoqish (Email/Password) | konsol | ha |
| 4 | Super-admin hisobi va huquqi | konsol + skript | ha |
| 5 | Migratsiya `--apply` | kompyuter | zaxiradan (`restore-backup.js`) |
| 6 | `firestore.rules` ni joylash | konsol yoki CLI | ha (konsoldagi qoidalar tarixi) |
| 7 | PR'ni `main` ga birlashtirish → GitHub Pages | GitHub | ha (revert) |
| 8 | Vaqtinchalik parollarni tarqatish, CSV'ni o'chirish | — | — |
| 9 | API kalitini domen bilan cheklash | Google Cloud konsoli | ha |
| 10 | Eski parollarni bekor qilish va tekshiruv | konsol + `curl` | — |
| 11 | Muntazam: yetim Auth hisoblarini tozalash | kompyuter | — |

---

## 1. Tayyorgarlik (kompyuterda)

1. Node.js 18+ o'rnatilgan bo'lsin. Repo ildizida:
   ```bash
   npm ci
   ```
2. Admin SDK hisob ma'lumoti — **bittasini** tanlang:
   - **(a) tavsiya:** Google Cloud CLI bilan
     ```bash
     gcloud auth application-default login
     ```
   - **(b)** Firebase konsoli → ⚙ *Project settings* → *Service accounts* → *Generate new private key*. Faylni **repodan tashqarida** saqlang (masalan `~/keys/noaniqlik-sa.json`) va:
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS=~/keys/noaniqlik-sa.json
     ```
     Ish tugagach, kalitni konsolda o'chiring (*Service accounts* → *Manage service account permissions* → kalitni *Delete*) va faylni yo'q qiling. `.gitignore` da `serviceAccount*.json` bor, lekin baribir repoga qo'ymang.

## 2. Zaxira nusxa (hech narsa o'zgarmaydi)

```bash
node scripts/migrate-auth.js --project noaniqlikbazasi
```

- `backups/firestore-backup-<vaqt>.json` yaratiladi — `organizations`, `employees`, `admins` ning **barcha** hujjatlari va maydonlari (fayl ruxsati `0600`, `.gitignore` da).
- Ekranda nima ko'chirilishi chiqadi (dry-run). Ogohlantirishlarni (`⚠`) o'qing.
- **Diqqat:** zaxirada eski `passwordHash` va `rawPwd` (ochiq parollar!) bor. Faylni shifrlangan diskda yoki oflayn saqlang; migratsiya tekshirilgach (10-qadam) o'chiring.
- Qo'shimcha (ixtiyoriy, Blaze tarifi kerak): konsol → *Firestore Database* → *Import/Export* → bucket'ga to'liq eksport.

## 3. Authentication'ni yoqish

Firebase konsoli → *Build* → **Authentication** → *Get started*:

1. *Sign-in method* → **Email/Password** → *Enable* (birinchi tugma). *Email link (passwordless)* — **o'chiq** qolsin. *Save*.
2. *Settings* → *Authorized domains*: `oxunjondurdiyev.github.io` qo'shilgan bo'lsin (sayt domeni); `localhost` faqat lokal sinov uchun — kerak bo'lmasa o'chiring.
3. *Settings* → *User actions*: **Enable create (sign-up)** — **yoqiq** qolsin (tashkilot ro'yxatdan o'tishi va admin xodim qo'shishi shunga tayanadi). **Email enumeration protection** — yoqing.
4. *Settings* → *Password policy* (agar menyuda bo'lsa): minimal uzunlik **8** (kod ham 8 talab qiladi).
5. Eslatma: login sun'iy email'ga aylantiriladi — `a.karimov` → `a.karimov@users.noaniqlikbazasi.firebaseapp.com`. Bu manzilga xat yuborilmaydi; *Templates* bo'limida hech narsa sozlash shart emas. Haqiqiy email to'planmaydi (CLAUDE.md, DATA_RESIDENCY.md).

## 4. Super-admin hisobi va huquqi (mijoz kodida parol yo'q)

1. Konsol → *Authentication* → *Users* → **Add user**: o'zingizning email'ingiz va **kuchli** yangi parol (12+ belgi, boshqa joyda ishlatilmagan). Eski `uc_super_2024` ni **ishlatmang**.
2. Huquq berish (kompyuterda):
   ```bash
   node scripts/set-superadmin.js --project noaniqlikbazasi --email SIZNING@EMAIL
   ```
   Bu custom claim `superadmin: true` o'rnatadi. Muqobil yoki qo'shimcha — Firestore'dagi `admins/{uid}` hujjati:
   ```bash
   node scripts/set-superadmin.js --project noaniqlikbazasi --email SIZNING@EMAIL --mode both
   ```
   Skriptsiz yo'l (faqat hujjat): *Firestore Database* → *Start collection* `admins` → *Document ID* = foydalanuvchining **UID**'i (Authentication → Users jadvalidan) → istalgan maydon (masalan `grantedAt`). Qoidalar `admins` ga mijozdan yozishni taqiqlaydi — uni faqat konsol/Admin SDK yarata oladi.
3. Huquqni olib tashlash: `--revoke` (claim ham, hujjat ham o'chadi, sessiyalar bekor qilinadi).
4. `superadmin.html` ga email va yangi parol bilan kiring. Huquqsiz hisob bilan kirilsa sahifa "super-admin huquqi yo'q" deydi va chiqarib yuboradi; ma'lumotni esa baribir qoidalar bermaydi.

## 5. Migratsiya (haqiqiy)

```bash
node scripts/migrate-auth.js --project noaniqlikbazasi --apply
```

Batafsil — [AUTH_MIGRATION.md](AUTH_MIGRATION.md). Qisqasi:
- avval yana to'liq zaxira yoziladi;
- har bir eski tashkilot admini va xodim uchun Firebase Auth hisobi (vaqtinchalik parol) yaratiladi;
- `organizations/*` ga `ownerUid` yoziladi; `fullName` (avval `firstName`/`lastName` ga bo'linadi, agar ular bo'sh bo'lsa) va `passwordHash` o'chiriladi;
- `employees/<eskiID>` → `employees/<uid>` (`rawPwd`, `passwordHash` siz), eski hujjat yangisi yozilgach o'chiriladi;
- vaqtinchalik parollar: `scripts/out/temp-passwords-<vaqt>.csv` (`0600`, `.gitignore`).

Skriptni qayta ishga tushirish xavfsiz (ko'chirilganlar o'tkazib yuboriladi). Muammo bo'lsa — qaytarish:
```bash
node scripts/restore-backup.js --project noaniqlikbazasi --file backups/firestore-backup-<vaqt>.json          # quruq
node scripts/restore-backup.js --project noaniqlikbazasi --file backups/firestore-backup-<vaqt>.json --apply
```

## 6. `firestore.rules` ni joylash

**Variant A — konsol:** *Firestore Database* → *Rules* → repodagi [`firestore.rules`](../firestore.rules) matnini to'liq nusxalab qo'ying → *Publish*. (Konsol qoidalar tarixini saqlaydi — kerak bo'lsa eski versiyaga qaytish mumkin.)

**Variant B — CLI:**
```bash
npx firebase login
npx firebase deploy --only firestore:rules --project noaniqlikbazasi
```

Joylashdan oldin lokal sinov (Java 11+ kerak):
```bash
npm run test:rules
```
(Firebase Emulator'da 63 ta test: qoidalar, migratsiya, brauzerda to'liq oqim.)

## 7. Saytni yangilash

PR'ni `main` ga birlashtiring; GitHub Pages yangi versiyani joylaydi. Brauzer keshi sababli foydalanuvchilarga *Ctrl+F5* ni aytish mumkin.

## 8. Vaqtinchalik parollarni tarqatish

- `scripts/out/temp-passwords-*.csv` dagi parollarni har bir foydalanuvchiga **shaxsan** yoki xavfsiz kanal orqali bering (ommaviy chatga emas).
- Foydalanuvchi kirgach yuqori paneldagi **"Parolni o'zgartirish"** tugmasi bilan o'z parolini qo'yadi.
- Tarqatib bo'lgach CSV faylni o'chiring.
- Keyinchalik parolni unutganlar uchun: `node scripts/reset-password.js --project noaniqlikbazasi --login <login>` (yangi vaqtinchalik parol chiqadi, eski sessiyalar bekor qilinadi). Xodim parolini tashkilot admini ham tiklay olmaydi (Admin SDK kerak) — u xodimni o'chirib, qayta qo'shishi mumkin (yangi login bilan) yoki super-admindan so'raydi.

## 9. API kalitini domen bilan cheklash

`apiKey` maxfiy emas (har bir brauzerga yuboriladi), lekin uni boshqa saytlardan ishlatishni qiyinlashtirish kerak. Bu — qo'shimcha to'siq; asosiy himoya qoidalarda.

1. <https://console.cloud.google.com/apis/credentials?project=noaniqlikbazasi> → *API keys* → `Browser key (auto created by Firebase)` (qiymati `firebase-config.js` dagi `apiKey` bilan bir xil).
2. *Application restrictions* → **Websites (HTTP referrers)**:
   - `https://oxunjondurdiyev.github.io/*`
   - `https://noaniqlikbazasi.firebaseapp.com/*` (Auth yordamchi sahifalari uchun)
   - lokal sinov kerak bo'lsa vaqtincha: `http://localhost:*` (ishdan keyin olib tashlang)
3. *API restrictions* → **Restrict key** → faqat: *Identity Toolkit API*, *Token Service API*, *Cloud Firestore API*. *Save*.
4. Bir necha daqiqadan keyin saytda kirish/ro'yxatdan o'tishni tekshiring.

## 10. Eski parollarni bekor qilish va tekshiruv

Eski tizimda parol xeshlari (statik tuzli SHA-256) va xodimlarning **ochiq parollari** (`rawPwd`) Firestore'da, ehtimol hammaga ochiq holda turgan (RISKS R-S1, R-S3). Super-admin paroli `uc_super_2024` git tarixida qoladi. Shuning uchun:

1. **Barcha eski parollar fosh bo'lgan deb hisoblanadi.** Migratsiya hammaga yangi vaqtinchalik parol beradi; eski parol Firebase Auth'da hech qachon ishlamaydi (migratsiya testi buni tekshiradi). Foydalanuvchilarga eski parolni boshqa joylarda ishlatgan bo'lsa, u yerda ham almashtirishni ayting.
2. `uc_super_2024` ni boshqa biror joyda ishlatgan bo'lsangiz — almashtiring. Endi u hech narsaga kirish bermaydi (`superadmin.html` faqat Firebase Auth + claim'ni tan oladi).
3. Firestore'da eski maydonlar qolmaganini tekshiring: konsol → *Firestore Database* → `organizations` va `employees` hujjatlarida `passwordHash`, `rawPwd`, `fullName` yo'q bo'lishi kerak.
4. Anonim kirish yopilganini tekshiring (kutilgan javob: `403` / `PERMISSION_DENIED`):
   ```bash
   curl -s "https://firestore.googleapis.com/v1/projects/noaniqlikbazasi/databases/(default)/documents/organizations" | head -5
   ```
5. Saytda: ro'yxatdan o'tish → super-admin panelida "Aktivlashtirish" → admin sifatida kirish → xodim qo'shish → xodim sifatida kirish va parolni o'zgartirish.
6. Hammasi joyida bo'lsa — `backups/` dagi zaxirani oflayn arxivga o'tkazing yoki o'chiring (unda eski parollar bor).
7. Firestore joylashuvini yozib qo'ying: konsol → *Firestore Database* → *Settings* → *Location* (DATA_RESIDENCY.md uchun kerak).

## 11. Muntazam: yetim Auth hisoblari

Admin xodimni o'chirganda Firestore hujjati o'chadi (xodim ma'lumotga kira olmaydi), lekin Firebase Auth hisobi qoladi (mijoz SDK boshqa foydalanuvchini o'chira olmaydi). Oyiga bir marta:
```bash
node scripts/cleanup-orphan-auth.js --project noaniqlikbazasi          # ro'yxat
node scripts/cleanup-orphan-auth.js --project noaniqlikbazasi --apply  # o'chirish
```
Super-adminlar hech qachon o'chirilmaydi.

## Ixtiyoriy (keyinroq)

- **App Check** (reCAPTCHA Enterprise) — ro'yxatdan o'tish spamini kamaytiradi; CSP'ga Google reCAPTCHA domenlari qo'shilishi kerak bo'ladi.
- **Ikki bosqichli kirish (MFA)** super-admin uchun — Identity Platform'ga o'tishni talab qiladi.
- **Tarif limiti** (xodimlar soni) hozir mijozda tekshiriladi — qoidalarda emas (qolgan xavf, RISKS R-15). To'liq yechim — Cloud Functions yoki P15 serveri.
