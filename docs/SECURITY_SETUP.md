# Xavfsizlikni sozlash — Firebase konsoli va egasining qo'lda bajaradigan qadamlari (P02)

> Bu yo'riqnoma P02 kodini ishga tushirish uchun **egasi** Firebase konsolida va o'z kompyuterida bajaradigan amallarni qadam-baqadam ko'rsatadi. Claude konsolga kirmaydi.
> Bog'liq: [`firestore.rules`](../firestore.rules), [AUTH_MIGRATION.md](AUTH_MIGRATION.md), [DATA_RESIDENCY.md](DATA_RESIDENCY.md), [RISKS.md](RISKS.md) R-S1…R-S5.
> Loyiha: `noaniqlikbazasi` (`src/js/firebase-config.js`).

## Qisqa ro'yxat (tartib muhim)

| # | Qadam | Qayerda | Majburiy |
|---|---|---|---|
| 0 | Tarifni tekshirish (Spark/Blaze) | Konsol → Usage and billing | ha |
| 1 | Email/Password provayderini yoqish | Konsol → Authentication | ha |
| 2 | Service account kalitini olish | Konsol → Project settings → Service accounts | ha |
| 3 | Super-admin hisobi va `superadmin` claim | o'z kompyuteringiz, `scripts/set-superadmin-claim.mjs` | ha |
| 4 | Mavjud foydalanuvchilarni ko'chirish | o'z kompyuteringiz, [AUTH_MIGRATION.md](AUTH_MIGRATION.md) | ha (agar foydalanuvchilar bo'lsa) |
| 5 | `firestore.rules` ni joylash + PR'ni birlashtirish (sayt yangilanishi) | Konsol → Firestore → Rules | ha, **bir vaqtda** |
| 6 | Tekshirish | brauzer / Rules Playground | ha |
| 7 | Eski maydonlarni o'chirish (`passwordHash`, `rawPwd`, `fullName`) | `scripts/migrate-legacy-users.mjs --strip-legacy` | ha |
| 8 | Service account kalitini o'chirish/saqlash | Google Cloud Console → IAM | tavsiya |
| 9 | API kalitini domen bilan cheklash | Google Cloud Console → Credentials | tavsiya |
| 10 | Davriy: `authCleanup` navbatidagi hisoblarni o'chirish | Konsol → Authentication → Users | muntazam |

> ⚠ **Nega bir vaqtda (5-qadam):** yangi qoidalar joylanganda saytning **eski** versiyasi (anonim so'rovlar, `passwordHash` solishtirish) ishlamay qoladi; yangi versiya esa Authentication yoqilmaguncha ishlamaydi. Shuning uchun: 1–4 → (qoidalarni Publish qilish + PR merge) → 6. Oraliq bir necha daqiqa.
> Firestore hozir "test mode"da (hammaga ochiq) bo'lishi mumkin deb hisoblanadi — **5-qadamni kechiktirmang**: kechikkan har bir kun `rawPwd` (ochiq parollar), INN, telefonlar ochiq turadi.

---

## 0. Firebase tarifini tekshirish

1. https://console.firebase.google.com → `noaniqlikbazasi` loyihasi.
2. Chap pastda **Usage and billing** (yoki ⚙ → *Usage and billing* → *Details & settings*). Joriy tarif yozilgan: **Spark** (bepul) yoki **Blaze** (to'lov kartasi bog'langan).
3. P02 yechimi **Spark tarifida to'liq ishlaydi**: Cloud Functions ishlatilmaydi. Admin SDK amallarini (super-admin claim, parolni tiklash, migratsiya) egasi o'z kompyuterida skript bilan bajaradi.
4. Spark kunlik kvotalari (Firestore o'qish/yozish va h.k.) shu sahifada ko'rinadi; joriy foydalanishni u yerda kuzating.

## 1. Authentication → Email/Password

1. Konsol → **Build → Authentication** → *Get started* (birinchi marta bo'lsa).
2. **Sign-in method** → **Email/Password** → *Enable* → **Save**. "Email link (passwordless sign-in)" — **o'chiq** qoladi.
3. **Settings → User actions**: "Enable create (sign-up)" **yoqiq** qolsin (tashkilotlar o'zi ro'yxatdan o'tadi). "Email enumeration protection" — yoqiq (standart).
4. **Settings → Authorized domains**: sayt domeni (`<foydalanuvchi>.github.io`) ro'yxatda bo'lsin (`localhost` sinov uchun).

Nima uchun email: Firebase Email/Password provayderi email talab qiladi. Haqiqiy email so'ralmaydi — login avtomatik ravishda **sun'iy** manzilga aylantiriladi: `<login>@users.noaniqlikbazasi.firebaseapp.com` (egasining qarori, 2026-11-13). Bu manzil faqat Auth ichida, pochta qutisi emas, xat yuborilmaydi; shuning uchun "parolni email orqali tiklash" yo'q — tiklash admin orqali (pastda, 10-bo'lim).

> Tekshiruv: bu qadamsiz saytda kirishda *"Firebase Authentication (Email/Password) hali yoqilmagan"* xabari chiqadi (`auth/configuration-not-found`).

## 2. Service account kaliti (faqat sizning kompyuteringizda)

1. Konsol → ⚙ **Project settings → Service accounts** → *Firebase Admin SDK* → **Generate new private key** → JSON fayl yuklanadi.
2. Faylni **repozitoriyadan tashqarida** saqlang, masalan `~/keys/noaniqlik-serviceAccount.json`. Repoda bo'lsa ham `.gitignore` `serviceAccount*.json` va `*.key.json` ni yuklamaydi — lekin repodan tashqarida saqlash xavfsizroq.
3. Bu kalit loyihaga **to'liq** (qoidalarni chetlab o'tadigan) kirish beradi. Hech kimga yubormang, bulutga, chatga, emailga qo'ymang.
4. Kompyuteringizda bir marta: repozitoriya papkasida `npm install` (Node.js ≥ 20).

## 3. Super-admin hisobi va `superadmin: true` claim

Super-admin endi mijoz kodidagi login/parol emas — Firebase Auth hisobi + token'dagi **custom claim**. `firestore.rules` uni `request.auth.token.superadmin == true` orqali tekshiradi; `superadmin.html` ni ochib olish hech narsa bermaydi.

**Variant A — skript yaratadi (tavsiya):**
```bash
node scripts/set-superadmin-claim.mjs --key ~/keys/noaniqlik-serviceAccount.json --login owner --create
```
Skript `owner@users.noaniqlikbazasi.firebaseapp.com` hisobini kuchli tasodifiy parol bilan yaratadi, parolni **bir marta** chiqaradi (parol menejeriga saqlang) va claim beradi. `owner` o'rniga istalgan login (3–32 belgi, `a-z 0-9 . _ -`).

**Variant B — konsolda yaratish:** Authentication → Users → **Add user** → email `owner@users.noaniqlikbazasi.firebaseapp.com`, kuchli parol (≥ 16 belgi) → keyin:
```bash
node scripts/set-superadmin-claim.mjs --key ~/keys/noaniqlik-serviceAccount.json --login owner
```

Foydali buyruqlar:
```bash
node scripts/set-superadmin-claim.mjs --key ~/keys/noaniqlik-serviceAccount.json --list
```
```bash
node scripts/set-superadmin-claim.mjs --key ~/keys/noaniqlik-serviceAccount.json --login owner --revoke
```

Kirish: `superadmin.html` → login `owner` (yoki to'liq email) + parol. Claim bo'lmasa, kirish rad etiladi.

## 4. Mavjud foydalanuvchilarni ko'chirish

[AUTH_MIGRATION.md](AUTH_MIGRATION.md) ga qarang (B yo'l — yangi parollar, tavsiya etiladi). Admin SDK qoidalarni chetlab o'tadi, shuning uchun bu qadamni 5-qadamdan oldin ham, keyin ham bajarish mumkin; lekin foydalanuvchilar sayt yangilangandan keyin darhol kira olishi uchun **oldin** bajaring.

## 5. `firestore.rules` ni joylash (va PR'ni birlashtirish)

**Konsol orqali:**
1. Konsol → **Build → Firestore Database → Rules**.
2. Mavjud matnni to'liq o'chirib, repodagi [`firestore.rules`](../firestore.rules) mazmunini joylashtiring → **Publish**.
3. Darhol PR'ni asosiy branch'ga birlashtiring (hozir `claude/create-uncertainty-platform-y5EVM` — GitHub Pages shu branch'dan joylanadi; tekshiring: repo → Settings → Pages). Yangi versiya odatda 1–2 daqiqada chiqadi; brauzerda keshni yangilang (Ctrl+F5).

**Yoki CLI orqali (o'z kompyuteringizda):**
```bash
npx firebase login
```
```bash
npx firebase deploy --only firestore:rules --project noaniqlikbazasi
```

Qoidalar mazmuni (qisqacha): hamma narsa taqiqlangan (default deny); tashkilot hujjatini faqat uning admini va faol xodimlari o'qiydi; ro'yxatni faqat super-admin ko'radi; `active`, `paymentStatus`, `plan`, `planExpiry` ni faqat super-admin o'zgartiradi; admin faqat `requestedPlan` (tarif so'rovi) va `employeeCount` ni o'zgartiradi; xodimlarni faqat o'z tashkilotining admini boshqaradi; `passwordHash`/`rawPwd`/`password` maydonlari hech kim tomonidan yozilmaydi.

## 6. Tekshirish

1. **Rules Playground** (Firestore → Rules → *Rules Playground*): *Authenticated* o'chiq, `get` `/organizations/biror-id` → **Denied** bo'lishi kerak. `list` (`/organizations`) — Denied.
2. Saytda: yangi tashkilot ro'yxatdan o'tadi → "to'lov kutilmoqda"; shu login bilan kirish → "aktivlanmagan" xabari.
3. `superadmin.html` → kirish → tashkilot ko'rinadi → "To'lov tasdiqlash" → "Aktivlashtirish".
4. Tashkilot admini kiradi → `admin.html` → xodim qo'shadi → login/parol **bir marta** ko'rsatiladi; jadvalda parol yo'q.
5. Lokal avtomatik tekshiruv (Java 11+ kerak): `npm run test:all` — 28 ta qoida testi Emulator'da (anonim o'qish, boshqa tashkilot, o'zini aktivlashtirish — rad).

## 7. Eski maydonlarni o'chirish

Ko'chirishdan va bitta hisob bilan kirib ko'rgandan keyin:
```bash
node scripts/migrate-legacy-users.mjs --key ~/keys/noaniqlik-serviceAccount.json --strip-legacy --yes
```
```bash
node scripts/migrate-legacy-users.mjs --key ~/keys/noaniqlik-serviceAccount.json --check
```
`--check` "✓ eski maydonlar qolmagan" deb javob berishi kerak (`passwordHash`, `rawPwd`, `fullName`).

## 8. Service account kaliti — ishlatib bo'lgach

Kalit kerak bo'lmagan paytda uni o'chirib qo'yish eng xavfsiz yo'l:
Google Cloud Console → **IAM & Admin → Service accounts** → `firebase-adminsdk-…` → **Keys** → kalitni **Delete**. Keyingi safar 2-qadamdagidek yangisini yarating. Kompyuteringizdagi JSON faylni ham o'chiring.

## 9. (Tavsiya) API kalitini domen bilan cheklash

`apiKey` maxfiy emas (har bir brauzerga yuboriladi) — himoya qoidalar bilan. Lekin suiiste'molni kamaytirish uchun:
Google Cloud Console → **APIs & Services → Credentials** → "Browser key (auto created by Firebase)" → *Application restrictions* → **Websites** → `https://<foydalanuvchi>.github.io/*`, `http://localhost/*`. *API restrictions* da Identity Toolkit API, Token Service API, Cloud Firestore API qolsin.

## 10. Parolni tiklash va hisoblarni o'chirish (doimiy jarayon)

Spark tarifida brauzer boshqa foydalanuvchining Auth hisobini o'chira yoki parolini o'zgartira olmaydi (bu Admin SDK talab qiladi). Shuning uchun:

| Kim | Kimning parolini | Qanday |
|---|---|---|
| Tashkilot admini | o'z xodimining | `admin.html` → **Parolni tiklash** → xodimga **yangi login va parol** yaratiladi (ikkinchi `firebase.initializeApp` instansiyasi; admin sessiyasi saqlanadi). Eski login ishlamaydi. |
| Egasi (super-admin) | tashkilot adminining | `node scripts/reset-user-password.mjs --key … --login <login>` → yangi parol bir marta chiqadi, eski sessiyalar bekor qilinadi |
| Egasi | o'zining (super-admin) | xuddi shu skript `--login owner` bilan, yoki konsolda |

**Qo'lda o'chirish navbati (`authCleanup`).** Xodim o'chirilganda yoki paroli "tiklanganda" uning eski Auth hisobi `authCleanup/{uid}` ga yoziladi. Bu hisob Firestore'da hech narsani o'qiy olmaydi (unga tegishli xodim yozuvi yo'q), lekin tartib uchun o'chirilishi kerak:
1. `superadmin.html` → pastdagi **"Auth'dan o'chirilishi kerak hisoblar"** jadvali — UID va eski login.
2. Konsol → **Authentication → Users** → qidiruvga UID ni kiriting → ⋮ → **Delete account**.
3. `superadmin.html` da shu qatordagi **Bajarildi** tugmasini bosing.
Tavsiya: oyiga bir marta.

---

## 11. Eski super-admin paroli va git tarixi

- Eski versiyada super-admin login/paroli `src/js/firebase-config.js` da **ochiq matnda** bo'lgan va GitHub Pages orqali har bir tashrif buyuruvchiga yuborilgan. P02 da u koddan olib tashlandi, lekin **git tarixida qoladi** (har qanday klon, fork yoki GitHub keshi uni saqlaydi).
- Shuning uchun **eski parol "oshkor bo'lgan" deb hisoblanadi va hech qayerda qayta ishlatilmaydi** — na yangi super-admin hisobida, na boshqa xizmatlarda (agar shu parol yoki unga o'xshashi boshqa joyda ishlatilgan bo'lsa — o'sha joyda ham almashtiring).
- U Firebase hisobi emas edi (faqat brauzerdagi solishtirish), shuning uchun Firebase'da bekor qilinadigan narsa yo'q: yangi kod uni umuman tekshirmaydi. Haqiqiy himoya — 3-qadamdagi claim va 5-qadamdagi qoidalar.
- Xuddi shu sabab bilan eski `employees.rawPwd` (ochiq parollar) va `passwordHash` (statik tuzli SHA-256) ham oshkor bo'lgan deb hisoblanadi → [AUTH_MIGRATION.md](AUTH_MIGRATION.md) da B yo'l (yangi parollar) tavsiya qilinadi.

**Tarixni qayta yozish — ixtiyoriy, majburiy emas.** U sirni "qaytarib olmaydi" (u allaqachon tarqalgan bo'lishi mumkin), faqat kelajakda topilishini qiyinlashtiradi. Agar baribir xohlasangiz:
1. Barcha ochiq PR'lar birlashtirilgan/yopilgan bo'lsin; hamkorlarni ogohlantiring — ularning klonlari eskiradi.
2. `git filter-repo` ni o'rnating (https://github.com/newren/git-filter-repo), repozitoriyaning **yangi** `--mirror` klonida:
   ```bash
   git clone --mirror https://github.com/oxunjondurdiyev/Noaniqlik.git noaniqlik-mirror.git
   ```
   ```bash
   cd noaniqlik-mirror.git
   ```
   `replacements.txt` faylini yarating (bitta qator: eski parol, keyin `==>***REMOVED***`), so'ng:
   ```bash
   git filter-repo --replace-text ../replacements.txt
   ```
   ```bash
   git push --force --mirror
   ```
3. GitHub keshidagi eski commit'lar (PR sahifalari) uchun GitHub Support'ga murojaat qilish kerak bo'lishi mumkin.
4. `replacements.txt` ni o'chiring.

## 12. Brauzer tomonidagi himoya (ma'lumot uchun)

- **CSP** (`<meta http-equiv="Content-Security-Policy">`, uchala sahifada): `script-src 'self'` — faqat saytning o'z skriptlari; inline skript va `onclick` yo'q. `connect-src` — faqat Firestore va Firebase Auth manzillari. `style-src` da `'unsafe-inline'` qoldi (inline `style="…"` atributlari ko'p; xavfi past) — keyingi bosqichlarda olib tashlash mumkin.
- `frame-ancestors` (clickjacking) `<meta>` orqali ishlamaydi, GitHub Pages esa HTTP sarlavha qo'yishga ruxsat bermaydi — P15 serverida sarlavha sifatida qo'shiladi.
- **Firebase SDK** CDN'dan emas, `vendor/firebase/9.23.0/` dan (LICENSE va SHA-384 xeshlari bilan) yuklanadi.
- **XSS:** yagona `escHtml` (`src/ui/escape.js`); bazadan kelgan qiymatlar shablonlarda escape qilinadi; `showToast` faqat `textContent`.
- **Sessiya:** Firebase Auth token'i (imzolangan, Google serverlari tekshiradi). Eski imzosiz `uc_session` / `uc_sa_session` kalitlari sahifa ochilganda o'chiriladi. Sessiyaning eng uzun muddati — 8 soat (avvalgidek), keyin qayta kirish.
