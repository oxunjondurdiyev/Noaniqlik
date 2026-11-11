# UncertaintyCalc — rivojlantirish rejasi P01–P15

> **Holat: TASDIQLANGAN (egasi, 2026-11-11).** Bosqichlar ketma-ketligi va raqamlash shu fayldagi bo'yicha. Har bir bosqichning batafsil talablari [docs/prompts/ClaudeCode_promptlar.md](prompts/ClaudeCode_promptlar.md) da — u faylda raqamlash **boshqacha**, moslik pastdagi xaritada.
>
> Har bir bosqich: alohida branch (`feat/pNN-…`, `fix/pNN-…`, `test/pNN-…`), kichik commit'lar, oxirida PR. PR'dan oldin `npm test` o'tadi va 9 ta etalon Excel nuqtasi o'zgarmaydi (CLAUDE.md). PR tavsifida "nima o'zgardi / qanday tekshirildi / ma'lum cheklovlar".
> Bosqich boshida shu fayl, `CLAUDE.md` va `docs/prompts/` dagi tegishli bo'lim qayta o'qiladi. Ikkalasi zid bo'lsa — shu fayl va egasining javoblari (pastda) ustun; zidlik PR'da qayd etiladi.

## Bajarish tartibi

**P02 → P01 → P03 → P04 → P05 → P06 → P07 → P08 → P09 → P10 → P11 → P12 → P13 → P14 → P15**

P02 (kritik xavfsizlik) birinchi bajariladi. U dvigatelga tegmaydi. `npm test` hali yo'qligi sababli P02 o'zi minimal `package.json` qo'shadi (`"test": "node --test tests/"`) va mavjud `tests/verify-excel.js` ni hamda yangi xavfsizlik testlarini shu orqali ishga tushiradi; to'liq test formati P01 da.

## Bosqichlar xaritasi (shu reja ↔ `docs/prompts`)

| Bosqich (shu reja) | Mazmun | `docs/prompts/ClaudeCode_promptlar.md` dagi talablar |
|---|---|---|
| **P01** | Test poydevori, rasmiy misollar | P01 (test infratuzilmasi, `tests/cases/*.json`, status `verified`/`unverified`/`pending`) + P02 (manbadan tekshirilgan misollar, `DISCREPANCIES.md`, `VALIDATION_MATRIX.md`) |
| **P02** | Xavfsizlik, Firebase Auth | P11 ning Firebase va xavfsizlik qismi (4- va 6-bandlar) + `docs/DATA_RESIDENCY.md` |
| **P03** | Dvigatelni ajratish, birliklar, 2-tartibli hadlar | P01 (dvigatelni ajratish, `ENGINE_API.md`, t-kvantil) + P03 A (birliklar) + P03 B (2-tartibli hadlar). API vektor chiqishga (P07) tayyor |
| **P04** | Shablonlar va saqlash | P05 (JSON shablon sxemasi, interpreter, muharrir, DRAFT→REVIEWED→APPROVED, laboratoriya sozlamalari) + P11 ning saqlash qismi (1–3-bandlar: IndexedDB, append-only audit izi, xesh zanjiri, JSON eksport/import) |
| **P05** | Linter, hisobotlar, qaror qoidasi | P04 (metrologik linter X1–X12) + P10 (Excel/CSV import-eksport, hisobot shakllari, SHA-256 va QR) + P09 ning 6-bandi (qaror qoidasi, JCGM 106) |
| **P06** | Monte-Karlo 2.0 | P03 C |
| **P07** | Ko'p o'zgaruvchili modellar (JCGM 102) | — (shu rejadan) |
| **P08** | Regressiya, "U — diapazon" | P06 |
| **P09** | Top-down, empirik kattaliklar | P07 |
| **P10** | Mikrobiologiya, ISO 20914, namuna olish, sifatli testlar | P08 |
| **P11** | Etalonlar reestri, drift, CMC, QC, kalibrlash intervali | P09 ning 1–3- va 7-bandlari |
| **P12** | PT va usul validatsiyasi | P09 ning 4–5-bandlari |
| **P13** | Validatsiya paketi | P12 (`validation-report.js`, `ASSESSOR_FAQ.md`) |
| **P14** | AI yordamchi (ixtiyoriy) | P13 |
| **P15** | O'zbekistondagi server | P11 ning 5-bandi (`SERVER_DESIGN.md`) amalga oshiriladi; hosting qaroridan keyin |

## Maqsadli arxitektura (qisqacha)

```
src/engine/        sof ES modullar (DOM/window/localStorage yo'q), Node + brauzer + (P15) server
  index.js         evaluate(modelSpec) → result   (yagona API, docs/ENGINE_API.md)
  version.js       ENGINE_VERSION (semver)
  parser.js        tokenizer, AST, kompilyatsiya, (simvolik) hosila
  units.js         o'lchamlik tahlili (P03 A)
  typeA.js typeB.js combine.js coverage.js sensitivity.js conformity.js montecarlo.js
  linter/ topdown/ regression/ micro/ sampling/ qualitative/ qc/ pt/   (keyingi bosqichlar)
src/report/        yaxlitlash (ILAC P14), hisobot modeli, shakllar — sof, Node'da test qilinadi
src/templates/     shablon interpreteri (P04)
src/storage/       StorageAdapter, IndexedDB, migratsiyalar, audit izi (P04)
src/ui/            DOM qatlami
schemas/           methodology.schema.json (P04)
templates/builtin/ 11 ta mavjud shablon JSON'da (P04)
vendor/            tashqi kutubxonalar (versiya + LICENSE)
tests/             node:test; cases/*.json; fixtures/ (Excel va qo'llanmalar)
```

Bog'liqlik yo'nalishi: `ui → report → engine`, `ui → templates → engine`, `ui → storage`. `engine` hech narsaga bog'liq emas.

*Eslatma:* `docs/prompts` P01 `rounding.js` ni `src/engine/` ichiga qo'yadi; CLAUDE.md esa yaxlitlashni faqat hisobot qatlamiga ruxsat beradi. Shu reja bo'yicha u `src/report/rounding.js` da bo'ladi (sof modul, dvigatel natijasini o'zgartirmaydi).

---

## P02 — Xavfsizlik, Firebase Authentication, shaxsiy ma'lumotlarni minimallashtirish (BIRINCHI)

**Maqsad:** RISKS dagi K darajali xavfsizlik muammolarini yopish. Hisoblash dvigateliga tegmaydi. Eng yomon holatdan kelib chiqiladi: Firestore "test mode"da, hammaga ochiq.

- **Fayllar:**
  - `firestore.rules` (yangi) — default `deny`; tashkilot hujjatini faqat o'z a'zolari o'qiydi; `active`, `paymentStatus`, `plan`, `planExpiry` ni faqat super-admin o'zgartiradi; xodimlarni faqat o'z tashkiloti admini boshqaradi. Super-admin — custom claim (`superadmin: true`) yoki `admins/{uid}` hujjati orqali (qaror pastda, 5-savol);
  - `src/js/firebase-config.js` — `SUPER_ADMIN` olib tashlanadi;
  - `src/js/auth.js`, `src/js/db.js` — Firebase Authentication (email/parol yoki boshqa provayder — 5-savolga qarang); `hashPwd`, `passwordHash`, `rawPwd` olib tashlanadi; sessiya Firebase Auth token'idan olinadi;
  - `admin.html`, `superadmin.html`, `index.html` — escape, inline `onclick` → `addEventListener`, parol ko'rsatish o'chiriladi, eski brauzer ogohlantirishi (`<script nomodule>`, 9-javob);
  - `src/js/app.js` — `showToast` `textContent` bilan;
  - `src/ui/escape.js` (yangi) — yagona `escHtml` (`'` bilan);
  - `vendor/firebase/<versiya>/` + LICENSE (yoki SRI xeshli CDN), CSP `<meta>`;
  - `package.json` (minimal), `tests/security/*.test.js`;
  - `docs/SECURITY_SETUP.md` (yangi) — `firestore.rules` ni konsolga joylash, Authentication'ni yoqish, super-admin claim/hujjatini berish, eski super-admin parolini bekor qilish — qadam-baqadam (konsol amallarini egasi bajaradi);
  - `docs/AUTH_MIGRATION.md` (yangi) — mavjud foydalanuvchilarni ko'chirish yo'riqnomasi va parolni tiklash oqimi;
  - `docs/DATA_RESIDENCY.md` (yangi) — har bir shaxsiy maydon: qayerda saqlanadi, kim o'qiydi, nima uchun kerak, O'RQ-547 27¹-modda bo'yicha holati, P15 dagi ko'chirish rejasi.
- **Ma'lumotlarni minimallashtirish:** `fullName` (`firstName`+`lastName` dan takror) o'chiriladi; `employees.rawPwd`, `passwordHash` o'chiriladi; yangi shaxsiy maydon qo'shilmaydi. Mavjud hujjatlardan bu maydonlarni o'chirish — `docs/AUTH_MIGRATION.md` dagi qo'lda yoki skript bilan bajariladigan qadam.
- **Nima buzilishi mumkin:** mavjud foydalanuvchilar eski parol bilan kira olmaydi (yangi hisob yaratish/tiklash oqimi kerak); admin yangi xodim yaratganda client SDK admin sessiyasini almashtirib yuborishi (ikkinchi `firebase.initializeApp` instansiyasi bilan hal qilinadi); qat'iy qoidalar super-admin panelini bloklashi; CSP Firebase/Google Fonts'ni bloklashi; Auth hisobini o'chirish (xodimni o'chirish) Admin SDK talab qiladi.
- **Qanday tekshiriladi:**
  - XSS regressiya testlari (`<img src=x onerror=…>` komponent nomi, tashkilot nomi → matn sifatida);
  - Firebase Emulator'da `firestore.rules` testlari (`@firebase/rules-unit-testing`, faqat devDependency): anonim o'qish rad, boshqa tashkilot rad, o'zini aktivlashtirish rad, super-admin ruxsat;
  - `localStorage` ga soxta sessiya yozilganda ma'lumot olinmasligi;
  - `grep` bilan repoda parol/`rawPwd`/`SUPER_ADMIN` qolmaganini tekshirish;
  - `npm test` (mavjud 8 nuqta + xavfsizlik testlari) yashil.
- **Bog'liq xavflar:** R-S1…R-S5, R-14, R-15.

## P01 — Test poydevori va manbadan tekshirilgan rasmiy misollar

**Maqsad:** keyingi har qanday o'zgarishni o'lchab bo'ladigan qilish. Hisoblash natijasi o'zgarmaydi.

- **Fayllar:** `package.json` (`"test": "node --test tests/"`), `tests/cases/*.json` (format: `{id, title, source:{doc, section, page|sheet, cell}, status: "verified"|"unverified"|"pending", domain, modelSpec, expected:{y, uc, nu_eff, k, U, interval?}, tolerance, enabledIn?}`), `tests/run-cases.test.js` (`verified` — majburiy; `unverified`/`pending` — hisobotda ko'rsatiladi, xato bermaydi), `tests/i18n.test.js`, `tests/presets.test.js`, `tests/cases/DISCREPANCIES.md`, `docs/VALIDATION_MATRIX.md`, `CHANGELOG.md`, `ENGINE_VERSION = '1.0.0'` (hozirgi `calc.js` ga), `.github/workflows/test.yml`.
- **Etalon nuqtalar (10 ta test):**
  1. Zichlik ρ = m/V — `tests/fixtures/Zichlik_noaniqligi_hisobi.xlsx` (1 nuqta; juftlangan, korrelyatsiya, GUM H.2 tekshiruvi);
  2–4. Gazoanalizator KEDR-07 — `Noaniqlik_hisobi_gazoanalizator_KEDR-07.xlsx` (3 nuqta);
  5–9. Termometr MS-MK-3 — `Noaniqlik_hisobi_termometr_MS-MK-3.xlsx` (5 nuqta; o'quv namunasi, real laboratoriya ma'lumoti emas);
  10. Gazoanalizator 2-nuqta MC intervali `[−0,0111; 0,0469]` — `Qollanma_noaniqlik_gazoanalizator_C75QM.docx` dan, bo'lim/jadval havolasi bilan. Hozirgi dvigatel `[−0,0113; 0,0465]` beradi; tolerantlik JCGM 101 §8 (δ) bo'yicha belgilanadi. Agar o'tmasa — tuzatilmaydi, sababi tahlil qilinib egasiga ko'rsatiladi (P06 da hal qilinadi).
- **Kutilgan qiymatlar:** faqat `tests/fixtures/` dagi fayllardan, **katak havolasi bilan** (`Varaq!C12`). Usul: `.xlsx` ni devDependency kutubxona bilan o'qish **yoki** bir marta JSON'ga ko'chirish (havola bilan). Tanlov P01 boshida qilinadi; ko'chirilgan bo'lsa, qayta tekshirish skripti qoldiriladi. Tekshiriladi: y, u_c, ν_eff, k, U, muvofiqlik — `resultText` dan tashqari.
- **Rasmiy misollar (`docs/prompts` P02):** JCGM 100 H.1, H.2, H.3 (`pending` → P08); JCGM 101 §9.2–9.5; EA-4/02 S-misollari (raqamlash manbadan: S2 massa, S3 rezistor, S4 KMD, S5 termopara…); NIST UM qo'llanmasi (PDF qo'shilgach); Nordtest TR 537 (`pending` → P09); EURACHEM QUAM A1. Gemini T1–T18 raqamlari manba bilan solishtiriladi, farqlar `DISCREPANCIES.md` ga (masalan, T16 "EA-4/02 S1" havolasi noto'g'ri — RISKS R-02).
- **Hozirgi dvigatelda yiqilgan `verified` testlar tuzatilmaydi** — ro'yxat va sabab egasiga, tuzatish keyingi bosqichda roziligi bilan.
- **Nima buzilishi mumkin:** hech narsa (faqat testlar). Xavf — Excel'dan noto'g'ri ko'chirilgan qiymat; shuning uchun katak havolasi majburiy. `tests/verify-excel.js` dagi fayl nomi (`Noaniqlik_hisobi_gazoanalizator.xlsx`) haqiqiy fixture nomiga (`…_KEDR-07.xlsx`) mos emas — yangilanadi.
- **Qanday tekshiriladi:** `npm test` yashil; mutatsiya tekshiruvi (bitta konstanta o'zgartirilsa testlar qizaradi); CI ishlaydi.
- **Qabul:** kamida 10 ta `verified` misol, har birida manba sahifasi/katagi. **Bog'liq xavflar:** R-01, R-11, R-17.

## P03 — Dvigatelni `src/engine/` ga ajratish, birliklar, 2-tartibli hadlar

**Maqsad:** `calc.js` ni sof ES modullarga bo'lish, UI'dagi takroriy hisoblarni olib tashlash, sonli xavflarni yopish. API boshidan vektor chiqishga (P07) tayyor.

- **Fayllar:** `src/engine/**`, `docs/ENGINE_API.md` (JSDoc tiplar: `modelSpec`, `result`; `outputs[]` massivi — hozir bitta element), `src/report/rounding.js`, `src/js/calc.js` → yupqa moslik qatlami, `table.js`/`typeB.js`/`points.js` (hisob → `evaluate`), `index.html` (`<script type="module">` + `nomodule` ogohlantirish).
- **Ichida:**
  1. Har bir formula ustida `// Ref: JCGM 100:2008 §…`.
  2. Parser AST; c_i — simvolik hosila, sonli hosila zaxira va o'zaro tekshiruv; c_i = 0/NaN → ogohlantirish.
  3. **t-kvantil:** 1 ≤ ν ≤ 200, P ∈ {0,95; 0,9545; 0,99; 0,9973} uchun 1e-6 nisbiy aniqlik testi. **ν_eff kasr qoidasi: standart `floor`** (Excel bilan mos), `interpolate` — ixtiyoriy laboratoriya sozlamasi (`docs/prompts` P01 dagi `exact` varianti ham ixtiyoriy sifatida qo'shilishi mumkin). Qo'llanilgan qoida natijada va hisobotda yoziladi (JCGM 100:2008 G.4.1 Note 1). ν=5000 dagi sakrash yo'qotiladi.
  4. **Birliklar (P03 A):** `units.js` — SI o'lchamlik vektori, prefikslar, affin °C/K; AST bo'yicha o'lchamlik; birliksiz eski hisoblar avvalgidek, eslatma bilan. Ref: JCGM GUM-6:2020 §11 (PDF qo'shilgach tekshiriladi).
  5. **2-tartibli hadlar (P03 B):** sonli Hessian (h — u(x_i) va masshtabga moslashuvchan), JCGM 100 5.1.2 Note hadlari; nochiziqlilik indeksi (> 1 % → ogohlantirish + MC tavsiyasi). **Standartda qo'shilmaydi**, faqat diagnostika; laboratoriya sozlamasi bilan yoqiladi. Test: Y = X², x̄ = 0 → u²(y) = 2u⁴(x).
  6. Manfiy dispersiya / |r| > 1 → xato.
  7. **Yaxlitlash** dvigateldan `src/report/rounding.js` ga ko'chiriladi, egasi qoidalari bilan (pastda, 7-javob): U ≤ 2 qiymatli raqam (0,0999↑ → 0,10), y — half away from zero (−0,125 → −0,13).
- **Nima buzilishi mumkin:** etalon nuqtalar ko'rinishi **faqat** 7-javobdagi ikki holat tufayli o'zgarishi mumkin — har biri CHANGELOG'da va test izohida alohida; boshqa har qanday farq — xato. `uc_state_v2` dagi `combined`/`points[].result` `resultText` siz bo'ladi → hisobot qatlami saqlangan natijani qayta yaxlitlaydi (eski maydonlar e'tiborsiz). GitHub Pages'da ES module yo'llari.
- **Qanday tekshiriladi:** P01 testlari (y, u_c, ν_eff, k, U 1e-9 nisbiy); `grep -r "document\|window\|localStorage" src/engine` bo'sh; Node'da `import {evaluate} from './src/engine/index.js'`; 11 ta shablon qo'lda P00 bilan solishtiriladi; saqlangan nuqtalar ochiladi. `ENGINE_VERSION` → 2.0.0, CHANGELOG.
- **Bog'liq xavflar:** R-02, R-03, R-04, R-08, R-10, R-12.

## P04 — Shablonlar dvigateli, saqlash qatlami, audit izi

**Maqsad:** yangi metodikani kod yozmasdan JSON shablon orqali qo'shish; versiyali, yo'qolmaydigan, auditlanadigan ma'lumot.

- **Fayllar:** `schemas/methodology.schema.json`, `src/templates/interpreter.js` (shablon → `modelSpec` → `evaluate`), `templates/builtin/*.json` (11 ta), shablon muharriri UI (DRAFT → REVIEWED → APPROVED, qulflangan maydonlar, yangi versiya orqali o'zgartirish), laboratoriya sozlamalari (P, k qoidasi `floor`/`interpolate`, yaxlitlash, qaror qoidasi, 2-tartibli hadlar, CMC rejimi), `docs/TEMPLATE_GUIDE.md`; `src/storage/` — `StorageAdapter`, `LocalAdapter` (IndexedDB), `RemoteAdapter` skeleti, `migrate.js` (`uc_state_v2` → IndexedDB; eski kalit o'chirilmaydi, `…_backup`), append-only audit jurnali + xesh zanjiri + yaxlitlikni tekshirish, JSON eksport/import.
- **Nima buzilishi mumkin:** foydalanuvchilarning brauzeridagi joriy ma'lumot — eng katta xavf; migratsiya testlari real `uc_state_v2` namunalari bilan. Rollar lokal rejimda faqat ogohlantirish darajasida (UI'da ochiq yoziladi). 5 ta yangi kutubxona shabloni (`docs/prompts` P05 §7) — manbalar (EURAMET cg-18, cg-17 va h.k.) `docs/references/` da bo'lmaguncha qo'shilmaydi.
- **Qanday tekshiriladi:** zichlik/gaz/termometr shablonlari Excel bilan mos; qolgan 8 tasi P03 natijasi bilan snapshot; migratsiya → bir xil natija; eksport → import → bit darajasida bir xil; audit zanjirida bitta yozuv o'zgartirilsa aniqlanadi.
- **Bog'liq xavflar:** R-09.

## P05 — Metrologik linter, import/eksport, hisobot shakllari, qaror qoidasi

- **Fayllar:** `src/engine/linter/` (X1–X12 + qo'shimcha qoidalar, har biri `{id, severity, ref, check}`), `docs/LINTER_RULES.md`; import (paste, `.xlsx`/`.csv` — SheetJS `vendor/` da), eksport (`.json`, `.xlsx`, `.csv`); hisobot shakllari (sertifikat ilovasi, sinov protokoli, byudjet asosnomasi, muvofiqlik bayonoti) — `src/report/`; pastki qism: ENGINE_VERSION, commit SHA, shablon ID/versiya, sana, kanonik JSON'dan SHA-256, QR (`vendor/qrcode`); qaror qoidasi: w = r·U, TUR, muvofiqlik ehtimoli, bir/ikki tomonlama chegaralar (JCGM 106 §7–9, ILAC G8).
- **Majburiy:** U = 0 va U < CMC hisobotda bloklanadi yoki aniq belgilanadi; barcha ogohlantirishlar va linter topilmalari hisobotda; ν qoidasi, seed, M, qaror qoidasi yoziladi; model turi (xato yoki qiymat+nominal) aniq — R-07; i18n'dan tashqari matnlar i18n'ga.
- **Nima buzilishi mumkin:** 9 nuqtada `error` darajasidagi topilma chiqmasligi kerak (chiqsa — qoida yoki etalon qayta ko'riladi, egasi bilan). Gazoanalizator qo'llanmasidagi asl protsedura xatolari (MPE byudjetda, nol nuqtada U = 0) qoidalarni ishga tushirishi kerak.
- **Qanday tekshiriladi:** har bir linter qoidasi uchun ijobiy/salbiy test; ko'p nuqtali hisobot Excel jadvali bilan mos; kanonik xesh kalitlar tartibiga bog'liq emas; JCGM 106 misollari (PDF qo'shilgach).
- **Bog'liq xavflar:** R-05, R-07, R-13.

## P06 — Monte-Karlo 2.0 (JCGM 101:2008)

- **Fayllar:** `src/engine/montecarlo.js` (+ `rng.js`, `distributions.js`), Web Worker (progress bilan).
- **Ichida:** urug'li PRNG (JCGM 101 C.3 talablariga mos: kengaytirilgan Wichmann–Hill yoki xoshiro128**/Mersenne Twister — tanlov asoslanadi), seed hisobotga; taqsimotlar: normal, to'g'ri burchakli, uchburchak, trapetsiya, egri trapetsiya, arksinus, siljitilgan-masshtablangan t (§6.4.9), log-normal, eksponensial, ko'p o'lchamli normal (Cholesky, C.5); korrelyatsiya (normal bo'lmaganlar uchun cheklov ochiq); adaptiv M (§7.9.4, n_dig = 2); eng qisqa va simmetrik interval; §8 validatsiya.
- **Nima buzilishi mumkin:** RNG almashsa MC raqamlari o'zgaradi (10-test qayta baholanadi); Worker yo'llari.
- **Qanday tekshiriladi:** JCGM 101 §9.2–9.5 (`verified` bo'lsa); 10-test (`[−0,0111; 0,0469]`); bir xil seed → aynan bir xil natija; RNG statistik testlari. `ENGINE_VERSION` minor.
- **Bog'liq xavflar:** R-06, R-16.

## P07 — Ko'p o'zgaruvchili modellar (JCGM 102:2011)

- **Fayllar:** `src/engine/` — vektor chiqish, Jacobian, U_y = C·U_x·Cᵀ, ko'p o'lchamli MCM; UI: bir nechta formula, chiqishlar kovariatsiya matritsasi, qamrov sohasi.
- **Nima buzilishi mumkin:** P03 API'si vektorga tayyor bo'lmasa — katta refaktor (shuning uchun P03 da `outputs[]`). Bir o'lchamli natijalar o'zgarmasligi kerak.
- **Qanday tekshiriladi:** JCGM 102:2011 misollari (PDF egasi tomonidan qo'shiladi); JCGM 100 H.2 (R, X, Z — korrelyatsiya); bir o'lchamli holat P03 ga teng.

## P08 — Regressiya va kalibrlash egri chiziqlari, "U — diapazon"

- **Fayllar:** `src/engine/regression/` (OLS, WLS, GLS, WTLS; bashorat va teskari bashorat noaniqligi), U diapazon funksiyasi sifatida, UI.
- **Nima buzilishi mumkin:** yangi modul, mavjud hisobga ta'sir yo'q. ISO/TS 28037/28038 pullik — test manbasi 8-javob bo'yicha (a)/(b)/(c), aniq bo'lmaguncha `unverified`.
- **Qanday tekshiriladi:** JCGM 100:2008 H.3 (PDF'da bor), EURACHEM QUAM kalibrlash misollari (PDF'da bor), NPL/NIST ochiq hujjatlari.

## P09 — Top-down va empirik kattaliklar

- **Fayllar:** `src/engine/topdown/` — u(R_w) QC'dan, u(bias) CRM/PT/recovery'dan (Nordtest TR 537), QUAM yondashuvlari, empirik kattaliklar; linter X11, X12 yoqiladi.
- **Nima buzilishi mumkin:** nisbiy va absolyut noaniqlik aralashishi; GUM rejimiga ta'sir yo'q. ISO 21748 pullik — 8-javob.
- **Qanday tekshiriladi:** Nordtest TR 537 ed.4 va EURACHEM QUAM misollari (sahifa havolasi bilan).

## P10 — Mikrobiologiya, tibbiy laboratoriya, namuna olish, sifatli testlar

- **Fayllar:** `src/engine/micro/` (Puasson, log₁₀ shkala), ISO 20914 (tibbiy laboratoriya) yondashuvi, `src/engine/sampling/` (dublikat usuli, (robust) ANOVA — EURACHEM UfS 2019), `src/engine/qualitative/` (aniqlash ehtimoli, LOD₅₀, noto'g'ri musbat/manfiy).
- **Nima buzilishi mumkin:** yangi modul; ISO 19036, ISO 20914, ISO 29201 pullik — 8-javob bo'yicha manba, aks holda `unverified`.
- **Qanday tekshiriladi:** EURACHEM UfS (egasi qo'shadi) va boshqa ochiq manba misollari.

## P11 — Etalonlar reestri, drift, CMC jadvali, QC kartalari, kalibrlash intervali

- **Fayllar:** reestr (kartochka, sertifikat nuqtalari, B tur manbasini reestrdan tortish, muddati o'tgan etalon → linter `error`), drift (u = |ΔC|/√3 sozlanadigan), CMC jadvali (diapazon/formula; U < CMC → sozlamaga ko'ra bloklash yoki ogohlantirish, avtomatik almashtirish yo'q), Shewhart X/R, Westgard qoidalari, s_Rw → P09, kalibrlash intervali (ILAC G24, faqat tavsiya). Hammasi `src/storage/` orqali lokal; Firebase'ga yozilmaydi; kalibrlanayotgan asbob MPE si manba sifatida taklif qilinmaydi.
- **Nima buzilishi mumkin:** saqlash hajmi; mavjud hisoblarga ta'sir yo'q.
- **Qanday tekshiriladi:** jadvalli testlar (Westgard, CMC chegarasi, drift), migratsiya testi. ILAC P10, G24, ISO 7870-2 manbalari kerak.

## P12 — PT va usul validatsiyasi

- **Fayllar:** `src/engine/pt/` (E_n, z, z′, ζ; chegaralar), `src/engine/validation/` (Grubbs, Cochran, bir omilli ANOVA, recovery t-testi, chiziqlilik → P08, LOD/LOQ, top-down shablon qoralamasi).
- **Nima buzilishi mumkin:** yangi modul. ISO 13528, ISO 5725-2 pullik — 8-javob.
- **Qanday tekshiriladi:** qo'lda hisoblangan yoki manba misollari; P09 bilan bog'liqlik.

## P13 — Validatsiya paketi (ISO/IEC 17025:2017 §7.11.2)

- **Fayllar:** `docs/validation/`, `validation-report.js` (test natijalaridan avtomatik), `ASSESSOR_FAQ.md`, izlanuvchanlik matritsasi (P01 dagi `VALIDATION_MATRIX.md` asosida), foydalanuvchi qo'llanmasi (3 tilda), README yangilash; NIST UM va (imkon bo'lsa) PTB TraCIM bilan o'zaro tekshiruv.
- **Qanday tekshiriladi:** har bir talab kamida bitta yashil testga bog'langan; mustaqil ko'rib chiqish.

## P14 — AI yordamchi (ixtiyoriy)

- **Mazmun:** `docs/prompts` P13 bo'yicha (ISO/IEC 42001 tamoyillari). AI faqat tavsiya beradi (manba taklifi, linter topilmasini tushuntirish, shablon qoralamasi); hisoblash natijasini o'zgartirmaydi; har bir tavsiya foydalanuvchi tomonidan tasdiqlanadi va audit izida qayd etiladi.
- **Nima buzilishi mumkin:** shaxsiy yoki mijoz ma'lumotlarining tashqi AI xizmatiga chiqib ketishi — shaxsiy ma'lumot yuborilmaydi, yuboriladigan ma'lumot foydalanuvchiga ko'rsatiladi.
- **Qanday tekshiriladi:** AI o'chirilganda ham barcha funksiyalar ishlaydi; AI tavsiyasi tasdiqlanmaguncha hisobga kirmaydi.

## P15 — O'zbekistondagi server (hosting qaroridan keyin)

- **Mazmun:** Node.js servis `src/engine/` ni **aynan o'zi** import qiladi; `POST /api/v1/evaluate` (mustaqil qayta hisob va solishtirish), `POST /api/v1/certificates` (tasdiqlash, xesh, QR, saqlash), `GET /verify/{id}` ochiq tekshirish sahifasi; PostgreSQL (append-only jadvallar), TLS, zaxira nusxa, autentifikatsiya va rollar; `RemoteAdapter` ulanadi; shaxsiy ma'lumotlarni Firebase'dan ko'chirish (`docs/DATA_RESIDENCY.md` rejasi bo'yicha) — Firebase'da faqat anonim ID qoladi; pd.gov.uz reestri bo'yicha yo'riqnoma.
- **Oldindan kerak:** hosting provayderi qarori (UZINFOCOM, Uztelecom va h.k.), domen, elektron imzo qarori (E-IMZO).
- **Nima buzilishi mumkin:** brauzer va server natijalari farqi (bitta engine kodi bilan oldini olinadi); ko'chirish vaqtida login uzilishi.
- **Qanday tekshiriladi:** server va brauzer 10 ta etalon testda bit darajasida bir xil; ko'chirishdan keyin Firebase'da shaxsiy maydon qolmaganini skript bilan tekshirish.

---

## Bosqichlar bog'liqligi

```
P02 ── P01 ── P03 ─┬─ P04 ── P05 ─┬─ P06 ── P07
                   │              ├─ P08
                   │              ├─ P09 ── P12
                   │              ├─ P10
                   │              └─ P11
                   └───────────────────────── P13 ── P14
                                              P15 (hosting qaroridan keyin; P03 + P04 talab qilinadi)
```

## Egasining javoblari (2026-11-11)

1. **Bosqichlar:** shu rejadagi P01–P13 ketma-ketligi va raqamlash qabul qilindi; `docs/prompts` talablari yuqoridagi xarita bo'yicha qo'shildi; P14, P15 yangi. Tartib: **P02 birinchi**, keyin P01, P03…
2. **Excel va qo'llanmalar** `tests/fixtures/` da. Kutilgan qiymatlar shu fayllardan, katak havolasi bilan. `.xlsx` o'qish uchun kutubxona faqat devDependency (saytga yuklanmaydi), yoki qiymatlar bir marta JSON'ga havola bilan ko'chiriladi.
3. **9 ta etalon nuqta** = zichlik 1 (`Zichlik_noaniqligi_hisobi.xlsx`) + gazoanalizator 3 + termometr 5. Gazoanalizator 2-nuqta MC intervali `[−0,0111; 0,0469]` (qo'llanmadan) — alohida **10-test**.
4. **Firestore:** eng yomon holat ("test mode", ochiq) deb qabul qilinadi. P02 da `firestore.rules` repoga yoziladi, joylash `docs/SECURITY_SETUP.md` da qadam-baqadam; konsol amallarini egasi bajaradi.
5. **Autentifikatsiya:** Firebase Authentication'ga o'tiladi — parollar faqat Firebase Auth'da; `rawPwd` va o'z xeshlarimiz o'chiriladi; super-admin — custom claim yoki Firestore qoidalari, mijoz kodida login/parol yo'q; mavjud foydalanuvchilar uchun parolni tiklash oqimi (email yoki admin orqali) va migratsiya yo'riqnomasi. Shaxsiy ma'lumotlarni O'zbekistondagi serverga ko'chirish — P15. Hozircha yangi shaxsiy maydon qo'shilmaydi, mavjudlari minimallashtiriladi.
6. **ν_eff kasr:** standart `floor` (Excel bilan mos); `interpolate` — ixtiyoriy laboratoriya sozlamasi; qo'llanilgan qoida hisobotda yoziladi (JCGM 100:2008 G.4.1 Note 1).
7. **Yaxlitlash:** U ko'pi bilan 2 qiymatli raqam — 0,0999 yuqoriga → **0,10** (0,100 emas). y — **round half away from zero** (Excel ROUND bilan mos): −0,125 → −0,13. Etalon nuqtalar ko'rinishi faqat shu ikki holat tufayli o'zgarsa ruxsat; har bir o'zgarish CHANGELOG'da va test izohida alohida.
8. **Manbalar:** egasi qo'shadi — JCGM 102, JCGM 106, JCGM GUM-6, ILAC P14, ILAC G8, EURACHEM UfS, NIST Uncertainty Machine qo'llanmasi; COOMET R/GM/32 — ichki fonddan. Pullik ISO'ga tayanadigan funksiyalar uchun test manbasi: (a) ochiq manbalar (GTC/MSL, NIST), (b) egasi bergan laboratoriya misollari, (c) mustaqil qo'lda hisob (Excel). Manba aniq bo'lmaguncha `unverified`.
9. **Brauzerlar:** ES modules (2018+) yetarli; eski brauzerlarni qo'llab-quvvatlash shart emas; index sahifasida juda eski brauzer uchun oddiy ogohlantirish.

## Ochiq savollar (P02 boshida hal qilinadi)

1. **Firebase Auth va email (5-javob ↔ CLAUDE.md zidligi).** Firebase'ning email/parol provayderi email talab qiladi, hozir esa email umuman saqlanmaydi; email qo'shish "yangi shaxsiy maydon qo'shilmaydi" qoidasiga zid. Variantlar:
   - (a) **Sun'iy email** `login@users.<loyiha-domeni>` (shaxsiy emas, faqat Auth ichida). Parolni tiklash faqat admin orqali: admin xodimga yangi vaqtinchalik parol beradi → bu Admin SDK (Cloud Functions yoki egasi lokal ishlatadigan skript) talab qiladi. Tashkilot admini parolini super-admin tiklaydi.
   - (b) **Haqiqiy email** (ixtiyoriy maydon) — email orqali tiklash ishlaydi, lekin yangi shaxsiy ma'lumot Google serverlariga yoziladi (O'RQ-547 — P15 gacha).
   - (c) **Telefon (SMS) auth** — telefon allaqachon bor, lekin SMS pullik va Firebase Blaze tarifi kerak.
   Tavsiya: (a), Cloud Functions'siz — xodim parolini tiklash uchun admin eski hisobni o'chirib yangisini yaratadi (ikkinchi app instansiyasi orqali); Auth'dagi eski hisobni o'chirish `docs/SECURITY_SETUP.md` dagi qo'lda qadam. Qaror egasida.
2. **Super-admin:** custom claim (Admin SDK bilan bir martalik lokal skript, egasi ishga tushiradi) yoki `admins/{uid}` hujjati (faqat konsoldan yaratiladi, qoidalar uni tekshiradi). Tavsiya: `admins/{uid}` — server/skriptsiz. Qaror egasida.
3. **Firebase tarifi:** Cloud Functions va Emulator'dan tashqari test uchun Blaze kerak bo'lishi mumkin. Hozirgi tarif (Spark/Blaze)?
