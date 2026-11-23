# CHANGELOG

Format: har bir yozuvda dvigatel versiyasi (`ENGINE_VERSION`, semver) va hisoblash natijasiga ta'siri ko'rsatiladi.
Hisoblash natijasiga ta'sir qiladigan har qanday o'zgarish `ENGINE_VERSION` ni oshiradi (CLAUDE.md).
Etalon nuqtalar ko'rinishi faqat egasi qabul qilgan ikki yaxlitlash qoidasi tufayli o'zgarishi mumkin. Har bir bunday o'zgarish shu yerda alohida yoziladi.

## Tuzatish — sayt doim Bosh sahifadan ochiladi (2026-11-23)

**ENGINE_VERSION o'zgarmadi (2.11.0): hisob o'zgarmagan, faqat interfeys.** `src/engine/` va `src/report/` ga tegilmagan.

- `src/js/app.js::bootstrap()` saqlangan holat bo'lsa to'g'ridan-to'g'ri ish maydonini ochardi — foydalanuvchi Bosh sahifani ko'rmasdi. Endi sayt **doim Bosh sahifadan** (`#dash-screen`) ochiladi; birinchi ochilishda ham (kirish / tanishtiruv sahifasi — `index.html#home` va Bosh sahifadagi logotip orqali).
- Saqlangan (tugallanmagan) hisob bo'lsa — Bosh sahifada birinchi karta: **"Davom ettirish: <model>, <sana>"** va **"O'chirish"** (ikki bosqichli tasdiq; `appState.reset()` — mavzu va til saqlanadi, IndexedDB dagi sessiyalarga tegilmaydi). Model — formula, bo'lmasa kirish kattaliklari ro'yxati; sana — hisob vaqti (bo'lsa).
- URL hash berilgan bo'lsa — o'sha joy: `#home` — kirish sahifasi, `#app` — ish maydoni (saqlangan hisob bo'lsa), `#lab` — Vizual laboratoriya (avvalgidek).
- Qobiqdagi logotip — Bosh sahifaga olib boradigan tugma (`#btn-brand-home`, klaviaturadan ochiq).
- Matnlar uch tilda (`hm_resume`, `hm_resume_text`, `hm_resume_deleted`); testlar — `tests/ui/home.test.js`; `tests/crossbrowser/screens.js` yangi ochilish oqimiga moslandi.

## [2.11.0] — P20: audit (21.11.2026) bo'yicha P0 tuzatishlar — LPU → MCM qaror qoidasi, "QORALAMA" belgisi, rozilik (2026-11-21)

**SONLI NATIJALAR O'ZGARMAGAN.** `tests/cases/` dagi 91 ta misolning to'liq natijasi 2.10.0 (`e460e89`) bilan **bit darajasida bir xil** — yagona farq: natijaga yangi maydon `mcm` qo'shildi (`node scripts/cases-snapshot.js --compare oldin.json keyin.json --ignore '(^|\.)mcm(\.|$)'`: 91 / 91, farq 0). Versiya minor oshirildi, chunki natija tuzilmasi kengaydi (yangi imkoniyat). 9 ta etalon Excel nuqtasi va 10-test (MC intervali) o'zgarmagan.

### Dvigatel (`src/engine/`)

- **LPU → MCM avtomatik qaror qoidasi** — `mcm-decision.js` (sof modul): `result.mcm = { required, reasons[] }`. Shartlar: **(a)** 2-tartibli hadlar indeksi > `nonlinThreshold` (0,01) yoki biror c_i = 0 (JCGM 100:2008 §5.1.2 NOTE; JCGM 101:2008 §5.7, §5.8); **(b)** bitta normal bo'lmagan manba (to'g'ri burchakli, U-simon, trapetsiya, uchburchak, diskretlik) uchun \|c_i\|u(x_i)/u_c > **0,50** — nisbat, dispersiya ulushi emas; **(c)** asimmetrik kirish taqsimoti (`exp`, `lognorm`) yoki `settings.physicalBounds: { lower?, upper? }` va \|y − chegara\| < U; **(d)** ν_eff < **6**. **Chegaralar — loyiha qarori (egasi, 2026-11-21), me'yoriy talab emas.** Linter A1 (dispersiya ulushi > 90 %) o'zgarmagan.
- `mcmState(result, mc)`, `mcmMissing(result, mc)`, `MCM_THRESHOLDS`; **linter M5 `mcm_required`** (warning) — faqat hisobot / UI qatlamidan (`lintMcm`); `evaluate()` natijasidagi `findings` o'zgarmagan.
- `scripts/cases-snapshot.js --compare … --ignore <regex>` — yangi qo'shilgan maydonni solishtiruvdan chiqarish.

### Interfeys va hisobot (hisob o'zgarmagan, faqat ko'rinish)

- **Avtomatik MCM:** `mcm.required` bo'lsa hisobdan keyin Monte-Karlo Web Worker'da o'zi boshlanadi (adaptiv, n_dig = 2, §8 tekshiruvi); natija kartasi ostida holat: "MCM tekshiruvi talab qilinadi: (b) V — … 0.92 > 0.50 — bajarilmoqda / tasdiqlandi / rad etildi / yaqinlashmadi / bajarilmagan"; bir natija uchun bir marta, kirish o'zgarsa eski ish to'xtatiladi; nuqta saqlanganda MCM natijasi nuqta bilan birga saqlanadi. `autoMcm = false` (laboratoriya sozlamasi yoki `settings.autoMcm`) — faqat avtomatik ishga tushirish o'chadi.
- **"QORALAMA" suv belgisi** (`src/report/forms.js::draftReasons`): tanlangan shaklning majburiy rekvizitlaridan biri bo'sh (kalibrlash sertifikati ilovasi — 13 ta) yoki talab qilingan MCM bajarilmagan → A4 ko'rinishida va bosmada **har sahifada** diagonal belgi (QORALAMA / ЧЕРНОВИК / DRAFT), sababi satrda va pastki qismda; aks holda pastki qismda "Yakuniy". Hisobot bloklanmaydi. Hisobotda sabablar ro'yxati va JCGM 101 §8 natijasi.
- **Tez UX tuzatishlar:** o'lchash katagida `placeholder="null"` (preset tanlanmaganda) — endi bo'sh; bildirishnoma — bir vaqtda bitta, yangisi eskisini almashtiradi, 3 s, `aria-live="polite"` (xato xabarida chaqiruvchi bergan uzoqroq vaqt saqlanadi); pastki amal paneli fokuslangan katakni / oxirgi qatorni yopmaydi (`scroll-padding`); chap menyu — ko'rinadigan ichki scroll, faol band ko'rinishga suriladi; preset namunaviy qiymatlari **matn** (`'100.00'`) — jadvalda va hisobotda kiritilgandek.
- **Kirish sahifasi:** "Bepul va ochiq kodli" nishoni va "Ochiq manba · Bepul · MIT litsenziyasi" yozuvi olib tashlandi (litsenziya yopiq — `LICENSE`); "ga to'liq mos" → "talablari asosida ishlab chiqilgan" (uz / ru / en); "12 formula · 9 sozlama · 4 taqsimot" o'rniga dinamik sonlar (shablonlar — katalogdan; hisoblash rejimlari va taqsimotlar — dvigateldan; tillar).
- **Rozilik va huquqiy sahifalar:** ro'yxatdan o'tishda majburiy belgi (belgisiz tugma faol emas); `privacy.html`, `terms.html` (uz / ru / en, "Loyiha — yurist tasdig'ini kutmoqda"); sayt oq ro'yxatiga qo'shildi. Firestore `organizations/{uid}` ga **faqat** `consentVersion` va `consentAt` (server vaqti) qo'shiladi; `firestore.rules` ularni talab qiladi (**egasi konsolga qayta joylaydi** — `docs/SECURITY_SETUP.md` §5).

### `src/report/` dagi o'zgarishlar (hisobga ta'sir qilmaydi)

- `sections.js`: `mcmSection`, `mcmReasons`, `findingsOf(r, spec, mc)` (M5), `env.mc`; `forms.js`: `draftReasons`, `draftHTML`, ramkada `data-report-status`; `footer.js`: holat satri. `tests/security/engine.sha256.json` yangilandi.

### Etalon nuqtalar

- 9 ta etalon Excel nuqtasi va 10-test (MC intervali): kutilgan qiymat va toleranslar **o'zgarmagan**. Yangi: 9 nuqtaning hammasida `mcm.required = true` (sabab (b)) — MCM bajarilmasa hisobotda M5 va "QORALAMA".

### Raqamlash (egasi qarori 2026-11-21)

- P18 = M9, P19 = M8 (ISO 19036), P20 = shu ish, Kragten → **P21** (avval P17). P20 P18 dan oldin, `e460e89` ustida bajarildi (`docs/RISKS.md` R-30).

## P16 — Interfeys 2.0: yangi dizayn tizimi, moslashuvchan qobiq, Vizual laboratoriya (2026-11-20)

**ENGINE_VERSION o'zgarmadi (2.10.0): HISOB O'ZGARMAGAN, faqat ko'rinish.** `src/engine/` ga tegilmagan (bitta bayt ham). `tests/cases/` dagi 91 ta ishga tushiriladigan misolning to'liq natijasi P13 holati (`f09e418`; P14 — `88e271e` — ham dvigatelga tegmagan) bilan **bit darajasida bir xil** (`node scripts/cases-snapshot.js --compare`: 91 / 91, farq 0) — har bir bosqichdan keyin tekshirildi. `tests/security/engine.sha256.json` yangilandi: sabab — faqat `src/report/` dagi markup (pastga qarang).

### Qo'shilganlar

- **Dizayn tizimi** — `src/css/tokens.css` (yagona joy): qorong'i (fon `#1e2235`) va yorug' mavzu, urg'u ranglari, radius 10 / 12 / 16 / 22, 4 px bo'shliq shkalasi, 32 px "o'lchov qog'ozi" to'ri, soya faqat asosiy natija kartasida. `theme.css` dagi eski nomlar — tokenlarning taxalluslari. Kontrast ≥ 4,5:1 ikkala mavzuda avtomatik test bilan (`tests/ui/contrast.test.js`).
- **Shriftlar o'z-o'zidan joylangan** — `vendor/fonts/`: Inter, Space Grotesk, JetBrains Mono (SIL OFL 1.1; lotin + kirill; SHA-256). **Google Fonts olib tashlandi**, CSP toraytirildi (`font-src 'self'`; `style-src` da tashqi manba yo'q) — foydalanuvchi IP si uchinchi tomonga ketmaydi. `validation.html` da `style-src 'self'` (`'unsafe-inline'` siz).
- **Ilova qobig'i** (`src/ui/shell/`, `src/css/shell.css`): sticky yuqori panel (joylashuv yo'li, buyruq qidiruvi Ctrl+K, til, mavzu, profil, "Hisobot"), chap menyu (≥ 980 px; 720–979 px — 76 px ikonkali ustun; < 720 px — pastki navigatsiya + asosiy amal tugmasi), ish oqimi qadamlari (Model → A tur → B tur → Natija → Hisobot). O'tishlar mavjud `switchTab` orqali — yangi holat mashinasi yo'q.
- **Natijalar ekrani**: asosiy natija kartasi, **noaniqlik tasmasi** (`src/report/ribbon.js` — skriptsiz SVG: N(y, u_c), ±U ramkasi, MCM intervallari), KPI plitkalari (u_c, ν_eff, k, U, ustun manba ulushi), byudjet jadvalida νᵢ ustuni va "Jadval / Pareto" ko'rinishi, o'ng panel (topilmalar, hisob sozlamalari, Monte-Karlo bilan solishtirish).
- **Kiritish**: B tur manbasi varag'i — telefonda pastdan chiqadi (bottom sheet), ≥ 720 px da yon panel; taqsimot segmenti; jonli "u = a/√3 = …" dvigatel funksiyalari orqali.
- **Laboratoriya**: QC kartasida ±1s / ±2s / ±3s zonalari, ogohlantirish va rad etish nuqtalari, oxirgi nuqta yorlig'i (qoida + z), Westgard qoidalari holati paneli (1₂s darvozasi, `suppressed`); etalonlar reestri kartochkalari (amal qiladi / 30 kun ichida tugaydi / muddati o'tgan); PT va validatsiya shu uslubda.
- **Hisobot**: "Hisobot" yorlig'i — oq A4 qog'oz ko'rinishi, 4 shaklli almashtirgich, "PDF" va "Chop etish"; bosma CSS (`src/css/print.css`): jadval sarlavhasi sahifa bo'linishida takrorlanadi; shrift — asosiy matn 11 pt, jadvallar 10 pt, pastki qism 9 pt (egasi qarori 2026-11-20); **pastki qism (ENGINE, build, xesh, QR) har sahifada**. Sahifalar soni (Chromium PDF): zichlik — 3, gazoanalizator (3 nuqta) — 8, termometr (5 nuqta) — 16.
- **Vizual laboratoriya** (`src/ui/vizlab/`, o'quv vositasi, dvigatelga ulangan; birinchi ochilganda yuklanadi): Monte-Karlo jonli, muvofiqlik simulyatori (`decide()`), ekstremal holatlar, QC siljishi (`westgard()`), korrelyatsiya, byudjet sezgirligi (`evaluate()`). Har bir rejimda "o'quv namunasi" yorlig'i; natija saqlanmaydi va hisobotga chiqmaydi.
- **AI sahifasi (P14) yangi dizaynda**: `ai.html` va AI oynasi tokenlar / qobiq uslubida; `ai.html` CSP si o'zgarmagan — faqat Google Fonts manbalari olib tashlandi; saqlangan mavzu qo'llanadi. P16 P14 (`88e271e`) ustiga rebase qilingan.
- **P16 davomi (2026-11-20; hisob o'zgarmagan, faqat interfeys; `src/engine/` va `src/report/` ga tegilmagan):**
  - **Kirish / ro'yxatdan o'tish ekrani** qayta dizayn qilindi (`src/css/home.css`, yangi tokenlar): til va mavzu tugmalari, chap tomonda tavsif, me'yoriy asos (JCGM 100 / 101 / 102, ISO/IEC 17025 §7.6, ILAC P14) va "o'lchash ma'lumotlari faqat brauzerda saqlanadi" bayonoti. **Maydonlar o'zgarmagan** (ro'yxat testda qotirilgan); xatolar inline (`role="alert"`); parolni ko'rsatish / yashirish klaviaturadan ochiq; Enter bilan yuborish (`<form>`); inline uslublar olib tashlandi (index.html: 52 → 25, qotirilgan son kamaydi).
  - **Bosh sahifa** (`#dash-screen`, `src/ui/home/`): "Yangi hisob", "Shablondan boshlash", so'nggi sessiyalar (IndexedDB — ochish / nusxalash / o'chirish, audit izi bilan), tezkor havolalar, pastda `ENGINE_VERSION` va validatsiya xulosasi. "Kalkulyatorni ochish" va muvaffaqiyatli kirish endi shu sahifani ochadi.
  - Chap menyuda "Bosh sahifa"; yuqoridagi tugma "Hisobot chop etish" → "Hisobot".
  - `KNOWN_LIMITATIONS` (uz / ru) KL-079: ISO 19036 bo'yicha qo'llab-quvvatlanmaydigan bandlar (kod o'zgarmagan).
- **P16 dan keyingi tuzatish (2026-11-20; hisob o'zgarmagan, faqat interfeys):** chap menyuga "Shablonlar katalogi" (HISOB guruhi tepasida), "Laboratoriya sozlamalari" va "Ma'lumotlar: eksport / import / audit" (LABORATORIYA) qaytarildi; 1-qadam (Model) da "Shablondan boshlash" tugmasi. "Hisoblash yakunlandi!" ikki marta chiqishi: ishlovchi ikki marta ulanmagan — A tur hisobi va namuna to'ldirish ham shu matnni ko'rsatardi; endi alohida matnlar (`toast_typea_done`, `toast_sample_done`) va bir xil toast ekranda turganida takrorlanmaydi (`src/ui/toast.js`).
- **Egasi qarorlari (2026-11-20, 3-to'plam) bo'yicha — hisob o'zgarmagan, faqat ko'rinish:**
  - **Shablon validatsiyasi dalili** — `templates/validation/builtin.json` (format `uc-template-validation/2`, `_generated` belgisi; shablon ichiga qo'yilmaydi): har bir (shablon, test) uchun yozuv — `templateId`, `templateHash` (RFC 8785 → SHA-256), `ENGINE_VERSION`, `testId`, `source`, `clause`, `relDiff`, `date`. Faqat `npm run validate:templates` yaratadi; `npm test` va CI (`--check` + `git diff --exit-code`) qayta yaratib solishtiradi — qo'lda tahrir xato. Runtime (`src/templates/validation-status.js`): `templateHash` yoki `ENGINE_VERSION` mos kelmasa, shablon builtin bo'lmasa (import / brauzerdagi nusxa) — **"unverified"** (sababi bilan). A4 hisobotida bitta qator: validatsiya holati + manba + `ENGINE_VERSION`.
  - **MCM xulosasi matni** (`src/report/sections.js::mcVerdict`; dvigatel o'zgarmagan): MCM sonli toleransga yetmagan bo'lsa **"GUM natijasi tasdiqlandi" yozuvi chiqmaydi**; og'ir dumli modelda (ν ≤ 2 kirish) — "MCM n_dig = 2 da yaqinlashmadi (erishilgan n_dig = …, M = …) — LPU validatsiyasi o'tkazilmadi" (uch tilda), "natija sifatida MCM intervali" satri bu holatda chiqmaydi. M chegarasi 10⁷ o'zgarmagan.
- **Egasi javoblari (2026-11-20) bo'yicha:** `#lab` hash-havolasi (Vizual laboratoriya); Inter ning yunon to'plami (ν, σ, ρ tizim shriftiga tushmaydi); shablon kartasida avtomatik **"Manba bilan mos"** belgisi (`scripts/template-validation.js` → `templates/validation/builtin.json`; 3 shablon etalon Excel bilan — verified, qolganlari unverified); Ctrl+P — A4 hisobot; νᵢ belgisi faqat |ulush| ≥ 5 % da, tooltip bilan; Vizual laboratoriyada "o'quv rejimi — rasmiy xulosa emas" belgisi.
- **Harakat** (`src/css/motion.css`): faqat CSS, faqat transform / opacity; `prefers-reduced-motion: reduce` da hammasi o'chadi (test).
- **Testlar**: `tests/ui/{shell,contrast,motion,sheet,lab2,vizlab}.test.js`, `tests/report/{ribbon,print}.test.js`, `tests/security/inline-style.test.js`; brauzerda — `npm run test:screens` (`tests/crossbrowser/screens.js`: 5 ekran × 3 o'lcham × 2 mavzu; ≥ 44 px, kontrast, klaviatura, konsol xatosi; skrinshotlar — CI artifact `ui-screens`).

### `src/report/` dagi o'zgarishlar (hisobga ta'sir qilmaydi)

- `ribbon.js` (yangi), `sections.js`: `heroCard`, `kpiTiles`, `dominantSource`, `budgetPareto`, `paretoRows`; byudjet jadvalida **νᵢ ustuni** (bosma hisobotda ham; qiymat avval ham manba nomida "(ν = …)" ko'rinishida bor edi) va JAMI qatorida ν_eff; ulush chizig'i SVG; inline uslub atributlari sinflarga ko'chirildi.
- `forms.js`: hujjat "ramka jadvali" ichida, pastki qism `<tfoot>` da (har sahifada takrorlanishi uchun). Hujjat ichidagi avlod selektorlari (`tbody tr`) ramkaga ham ilashadi — ikki testda selektor aniqlashtirildi (qamrov o'zgarmagan).
- Yaxlitlash qoidalari, y, U, k, ν_eff, muvofiqlik, xesh (RFC 8785) — o'zgarmagan.

### Ma'lum cheklovlar (batafsil — `docs/RISKS.md` R-29)

- Tasmada va Vizual laboratoriyada joriy hisob uchun **MCM gistogrammasi yo'q**: dvigatel namunalarni qaytarmaydi, `src/engine/` ga tegish taqiqlangan edi. MCM intervallari chiziladi; o'quv modelida gistogramma — dvigatel generatori va tanlash funksiyalaridan olingan ILLYUSTRATIV oqim (aniq belgilangan).
- "Kragten" ko'rinishi qo'shilmadi (mavjud funksiya yo'q; yangi metrologik funksiya — manbali test bilan, alohida bosqichda).
- `style-src 'unsafe-inline'` index / admin / superadmin sahifalarida qoldi (eski auth, to'lov va hisob-faktura markup'i); soni testda qotirilgan — faqat kamayishi mumkin.
## P14 — AI yordamchi (ilova; ixtiyoriy, standart holatda o'chiq) (2026-11-20)

**ENGINE_VERSION o'zgarmadi (2.10.0): hisob natijalari o'zgarmagan.** `src/engine/` va `src/report/` ga tegilmagan — `tests/security/engine.sha256.json` o'zgarmagan. `tests/cases/` dagi 91 ta ishga tushiriladigan misolning to'liq natijasi asos (`f09e418`) bilan **bit darajasida bir xil** (`node scripts/cases-snapshot.js --compare`: 91 / 91, farq 0). 9 ta etalon nuqta va 10-test o'zgarmagan. Bu — "ilova" yozuvi (`docs/validation/CHANGE_CONTROL.md` §13).

### Qo'shilganlar

- **AI yordamchi** (`docs/AI_DESIGN.md`, egasi tasdiqlagan): AI hech narsa hisoblamaydi va natijani o'zgartirmaydi; faqat qoralama va matn; har bir taklif inson tasdig'idan o'tadi. To'rt funksiya: metodika matnidan shablon qoralamasi, sertifikatdan reestr yozuvi qoralamasi, topilmalarni tushuntirish, manba taklifi (qiymatsiz).
- **Ma'lumot siyosati:** tashqariga faqat tuzilma (`src/ai/payload.js` — ruxsat ro'yxati; payload da son tipidagi qiymat bo'lmaydi). Yuboriladigan to'liq matn har doim ko'rsatiladi.
- **Ikki rejim:** nusxa-qo'y (tarmoq chaqiruvi va kalit yo'q) va "o'z kaliti" — alohida `ai.html` sahifasi (o'z CSP si; asosiy sahifalar CSP si o'zgarmagan). Kalit faqat `sessionStorage` da.
- **Prompt shablonlari** (versiya 1.0.0): `uc-ai/explain`, `uc-ai/source_suggest`, `uc-ai/template_draft`, `uc-ai/certificate_extract`; javob sxemalari — `schemas/ai/`.
- **Shablon holati `AI_DRAFT`** (faqat `DRAFT` ga, izoh ≥ 10 belgi bilan; builtin da taqiqlangan; u bilan hisobot — "RASMIY EMAS").
- **Audit:** har bir AI amali xesh zanjirida (faqat xeshlar va kodlar; matn, kalit, qiymat yozilmaydi).
- **Laboratoriya sozlamalari:** `aiEnabled` (standart `false`), `aiModel` (`claude-opus-5-5`).
- **R-27 dan:** shablon muharriridagi "Kim" maydoni — rol ro'yxati; `ASSESSOR_FAQ.ru.md`, `KNOWN_LIMITATIONS.ru.md` (ruscha nusxa).

### O'zgarganlar

- IndexedDB **v2 → v3**: `ai_exchange` ombori (vaqtinchalik; eksportga kirmaydi). Mavjud ma'lumot o'zgarmaydi (faqat yo'q ombor yaratiladi).
- Reestr yozuvida ixtiyoriy `origin: 'ai'` (saqlash qatlamida; hisobga ta'sir qilmaydi).
- `schemas/methodology.schema.json`: `status` ro'yxatiga `AI_DRAFT` qo'shildi (mavjud shablonlar o'zgarmagan).
- Shablon auditida `actor` endi faqat rol identifikatori (avval — erkin matn).
- `docs/validation/ASSESSOR_FAQ.md` 11-savol: Monte-Karlo savollariga havola tuzatildi (16–18 → 18–19).

### Egasi qarorini kutadi

`docs/RISKS.md` R-28: MPE filtri (kalit so'zlar; `specification` — ogohlantirish bilan), tushuntirish faqat GUM uchun, sertifikat sanasi ko'rinishlari, almashinuv yozuvi muddati (1 soat), `fallbacks` qo'shilmagani.

## P13 — validatsiya paketi, versiyalangan deploy, brauzerlararo tekshiruv (2026-11-19)

**ENGINE_VERSION o'zgarmadi (2.10.0): hisob natijalari o'zgarmagan.** `tests/cases/` dagi 91 ta ishga tushiriladigan misolning to'liq natijasi (yaxlitlanmagan qiymatlar + hisobot qatlamidagi ko'rinish) P12 holati (`e58913b`) bilan **bit darajasida bir xil** — `node scripts/cases-snapshot.js --compare`: "misollar: 91; bit darajasida bir xil: 91; farq qiladi: 0". 9 ta etalon Excel nuqtasi va 10-test o'zgarmadi. `src/report/` o'zgardi (hisobot pasti; `rounding.js` da faqat izoh) → dvigatel xeshi yangilandi (`tests/security/engine.sha256.json`).

### Qo'shilganlar

- **Validatsiya hujjatlari** — `docs/validation/`: `VALIDATION_PLAN.md`, `REQUIREMENTS.md` (312 talab, barqaror ID), `rtm.map.json`, `RTM.md` (avtomatik — `scripts/rtm.js`), `CHANGE_CONTROL.md`, `KNOWN_LIMITATIONS.md`, `PQ_PROTOCOL_TEMPLATE.md`, `USER_REQUIREMENTS_TEMPLATE.md`, `ASSESSOR_FAQ.md`. `docs/VALIDATION_MATRIX.md` (289 qator) shu tizimga ko'chirildi — ikkita qo'lda yuritiladigan nusxa qolmadi. Bog'lanmagan talab — `npm test` xatosi.
- **Validatsiya hisoboti** — `scripts/validation-report.js`: testlar (mashinada o'qiladigan reporter), har bir misol (manba, kutilgan / olingan qiymat, tolerans va sababi, D-ID), RTM qamrovi, brauzerlararo bo'lim, NUM holati → `validation-report.html` (skriptsiz, o'z CSP si bilan) va `.json`. CI da artifact (90 kun), deploy'da saytda.
- **Versiyalangan deploy** (egasi qarori A, R-22 (b)) — `scripts/build-site.js` + `.github/workflows/deploy.yml`: oq ro'yxat bo'yicha `_site/`, har bir mahalliy modul / skript / uslub havolasiga `?v=<commit SHA, 12 belgi>` (JS — acorn parser, HTML — jsdom; izoh va satrlar tegilmaydi; ishonchsiz holatda build to'xtaydi), `build.json`, vendor fayllari bayt darajasida o'zgarmaydi, yakuniy tekshiruv. Manba kodi build qadamisiz ishlashda davom etadi. Egasi amallari — `docs/DEPLOY.md`.
- **Brauzerda:** `build.json` `no-store` bilan o'qiladi; sahifadagi modul versiyasi farq qilsa — "Yangi versiya chiqdi — sahifani yangilang" banneri (uz / ru / en; avtomatik qayta yuklash yo'q); build.json bo'lmasa — jim (`src/ui/build/`, `src/io/build.js`).
- **Hisob hujjati `uc-calc/1`:** ixtiyoriy `env` (hisoblagan brauzerning qisqa nomi, versiyasi, JS dvigateli — `src/io/env.js`; to'liq userAgent saqlanmaydi; Firebase'ga yozilmaydi) va `build` (`{ id, source }`). Ular xeshga kiradi; **eski hujjatlar (env / build siz) avvalgidek o'qiladi**. `reproduce()` qo'shimcha `maxRel` va `close` qaytaradi: boshqa JS dvigatelidagi oxirgi xona farqi (≤ 1·10⁻¹⁴) import oynasida xato emas, alohida ko'rsatiladi.
- **Hisobot pasti:** build = commit SHA ning boshi (deploy) yoki dvigatel xeshi + "dev" (lokal); yangi qator — "Hisoblangan muhit (brauzer)".
- **Brauzerlararo takrorlanuvchanlik** (egasi qarori B, R-24) — `tests/crossbrowser/` (Playwright 1.63.0 — Chromium, Firefox, WebKit; lokal `node:http` server; tashqi so'rovlar bekor qilinadi): har brauzerda saytdagi aynan o'sha dvigatel barcha misollarni hisoblaydi → Node natijasi bilan: xom qiymatlar ≤ 1·10⁻¹⁴, yaxlitlangan y / U / k / interval uchlari aynan, R(0, 1) bit darajasida. O'lchov (Node 22.23 ↔ Chromium 157): 28 807 sondan 242 tasi farq qiladi, yaxlitlangan farq 0, istisnolarsiz maks. 9,8·10⁻¹⁵; 14 ta shartlanganligi yomon qiymat (maks. 3,4·10⁻¹¹) — istisnolar ro'yxatida (`exceptions.json`, **tasdiq kutadi — R-27 (1)**). **CI o'lchovi (2026-11-19, Playwright 1.63.0, Node 22 tayanch; 91 misol, 28 807 son):** Chromium 153 — 242 son farq qiladi, istisnolarsiz maks. 9,8·10⁻¹⁵, istisno 14 ta (maks. 3,4·10⁻¹¹); Firefox 155 — 431, maks. 5,7·10⁻¹⁵, istisno 7 ta (maks. 1,9·10⁻¹¹); WebKit 26.6 (Linux) — 539, maks. 9,8·10⁻¹⁵, istisno 14 ta (maks. 3,4·10⁻¹¹). Uchala brauzerda yaxlitlangan farq — 0, R(0, 1) — bir xil; istisnolar ro'yxatidan tashqari chegaradan oshgan qiymat yo'q. `tests/crossbrowser/site.js` — yig'ilgan saytning brauzerdagi tutun-testi.
- **NIST Uncertainty Machine bilan o'zaro tekshiruv** — `tests/crosscheck/num/`: 5 ta vakil misol uchun kirish ma'lumotlari (verified misollardan avtomatik) va qo'llanma; natijalar — egasidan (`pending`, testlar `todo`).
- **Sayt:** `validation.html` ("Validatsiya" sahifasi: versiya, build, dvigatel xeshi, hujjatlar, cheklovlar, versiyalar tarixi), foydalanuvchi qo'llanmasi `docs/manual/{uz,ru,en}.md` (saytda — skriptsiz HTML).
- **Regressiya nazorati** — `scripts/cases-snapshot.js` (ikki holatni bit darajasida solishtirish).
- Yangi devDependency lar (saytga yuklanmaydi — build oq ro'yxati tekshiradi): `playwright` 1.63.0, `acorn` 8.19.0.

### O'zgarganlar

- `src/ui/mc/runner.js`: worker manzili modulga nisbatan (`new URL('./worker.js', import.meta.url)`) — deploy'da versiyalanadi.
- `tests/cases/lib.js`: misolni ishga tushirish `tests/crossbrowser/core.js::runCase` ga ko'chirildi (Node va brauzerda bitta kod; natijalar o'zgarmagan).
- `.github/workflows/test.yml`: `validation` job; asosiy branch'da testlar `deploy.yml` ichidan yuradi.
- `src/report/rounding.js` (faqat izoh): ILAC P14:09/2020 yaxlitlash bandi — **§5.3** (PDF bilan solishtirildi; avval "§5.4, tekshirilmagan" deb yozilgan edi).
- Bu fayl: `## [2.7.0]` sarlavhasi tiklandi (avvalgi merge'da buzilgan; matn o'zgarmagan).

### Egasidan kutiladi

`docs/RISKS.md` R-27: istisnolar ro'yxati (1), saytga chiqadigan fayllar va hisobotning ommaviyligi (2), NUM toleranslari (3), deploy boshqaruvi (4), semver qoidasi (5), "Kim" maydoni (6), `manual` holati (7), talablar / FAQ / cheklovlarni ko'rib chiqish (8); Pages manbasini o'tkazish; NUM natijalari va qo'llanmasi; Safari da qo'lda tekshiruv.

## [2.10.0] — P12: malaka sinovlari (PT) va usul validatsiyasi (2026-11-19)

**ENGINE_VERSION: 2.9.0 → 2.10.0** (minor, yangi imkoniyat). **Mavjud natijalar o'zgarmadi:** `tests/cases/` dagi 91 ta misolning to'liq natijasi (`evaluate()`, `monteCarlo()`, `evaluateBias()`) 2.9.0 (`d970ca7` dan keyingi holat, `14e1d18`) bilan **bit darajasida bir xil** (`engineVersion` dan tashqari; nazorat skripti — natija JSON ining SHA-256 xeshi; egasi qarorlari kiritilgandan keyin ham qayta tekshirildi). 9 ta etalon Excel nuqtasi va 10-test o'zgarmadi. `src/engine/sampling/` (P10) umumiy ANOVA yordamchisiga o'tkazildi — UfS:2019 natijalari bit darajasida bir xil.

### Qo'shilganlar

- **`uc-pt/1`** (`src/engine/pt/`): z, z′, ζ, E_n; mavjud bo'lmagan ball — `null` + sabab kodi; birliklar P04 moduli orqali; σ_pt ≤ 0, U ≤ 0, birliklar mos emas — aniq xato. Baholash chegaralari `PT_LIMITS` (yagona joy; **loyiha standarti, R-26**). `pt_uxpt_large` (u(x_pt) > 0,3·σ_pt — z′ tavsiyasi, avtomatik almashtirish yo'q). PT tarixi → top-down u(bias) (`ptToTopDownBias` → P09 `bias.type: 'pt'`, Nordtest TR 537 §6.2; formula qayta yozilmagan).
- **`uc-validation/1`** (`src/engine/validation/`): Grubbs (ikki / bir tomonlama), Cochran C (unverified), bir omilli ANOVA (teng / teng bo'lmagan guruhlar, s_r, s_b, s_I), ikki tanlanma t-testi (teng dispersiya / Welch), F-testi, recovery (P09 QUAM funksiyasi), chiziqlilik (P08 regressiyasi), LOD/LOQ (blank va kalibrlash — unverified). Dastur qiymatni **o'chirmaydi**: chiqarish — foydalanuvchi qarori, izoh ≥ 10 belgi, audit (`outlier_exclude`).
- **Top-down shablon qoralamasi** (`topDownDraft`): DRAFT, foydalanuvchi shabloni, manba ma'lumotlar xeshi (RFC 8785) va sana; sxemada ixtiyoriy `validationBasis` (builtin shablonda taqiqlangan).
- **`src/engine/stats/`**: F-taqsimot (CDF, dum, kritik qiymat), bir tomonlama t; dispersiya komponenti, pooled s.
- **Saqlash:** IndexedDB v2 — `pt`, `validation` omborlari (eski omborlar va ma'lumot o'zgarmaydi), audit, versiya, rol (`employee` kiritadi; chiqarish, o'chirish, qoralama — `admin`; `guest` — lokal, info topilma). Eksport (`uc-export/1`) P12 omborlari bo'sh bo'lsa o'zgarmaydi.
- **Import / eksport:** PT raundlari `.xlsx` / `.csv` dan (LIMITS, formulalar bajarilmaydi), CSV, `uc-quality/1` JSON.
- **UI:** "Laboratoriya" yorlig'ida "Malaka sinovlari" va "Validatsiya" bo'limlari (`src/ui/lab/quality*.js`, matnlar `src/js/i18n-pt.js` — uch tilda). **Hisobot:** `src/report/pt.js` (raund jadvali, chegaralar manbasi, SVG tarix grafigi — skriptsiz), `src/report/validation.js` (statistika, kritik qiymat, α, xulosa, Ref, unverified belgisi, chiqarilgan qiymatlar va izohlari); normativ havola — NIST/SEMATECH e-Handbook.

### Test misollari (verified, NIST/SEMATECH e-Handbook — `docs/references/nist-ehandbook-p12/`)

- §1.3.5.17.1 Grubbs: G = 2,4687, G_krit = 2,032 — **D-22**: manba G ni kesgan (aniq 2,468765).
- §7.4.3 bir omilli ANOVA: SS, DF, MS, F = 9,59, F₀,₀₅;₂,₁₂ = 3,89, p = 0,00325.
- §2.4.4.1–2.4.4.2: pooled s₁ = 0,07871, s₂ = 0,02742, s_days² = −0,00028072 → 0.
- §1.3.5.3 t-test: T = −12,62059, s_p = 6,34260, ν = 326, t = 1,9673 / 1,6495. §1.3.5.9 F-test: F = 1,123037, 0,7756 / 1,2894.
- Unverified (todo): Cochran kritik qiymati (Monte-Karlo bilan mustaqil — o'tadi), LOD/LOQ (Eurachem FfP 2014 — egasi qo'shadi).

### Egasi qarorlari (2026-11-19, R-26) — shu versiyada

- PT chegaralari va 10⁻¹² tolerans tasdiqlandi; **hisobotda ball 2 o'nlik xonada**, baho yaxlitlanmagan qiymatdan, qoida va tolerans hisobot izohida.
- s_b² < 0 → 0 + info; Grubbs (α = 0,05, bitta chetga chiquvchi) — tasdiqlandi.
- Cochran va LOD/LOQ — **"(unverified)" belgisi test sarlavhasida**, bosma hisobotda ham; k_Q = 10.
- **Linter L3** (`pt_last_unsatisfactory`, info; GUM va TOP_DOWN): hisob PT seriyasiga bog'langan (`settings.ptLink` — seriya nusxasi, `ptLinkOf`) va oxirgi raund qoniqarsiz. Bog'lanmagan hisoblarda topilma yo'q — 9 ta etalon nuqta topilmalari o'zgarmagan.
- **ν(s_I) — Welch–Satterthwaite** (JCGM 100:2008 G.4.1; loyiha qarori): `oneWayAnova().nu.sI`; NIST §7.4.3 misolida 3,903; s_b² < 0 → N − k. Qoralamada `validationBasis.precision.nuSI` → top-down ustasining ν maydoni (`statedNu`); top-down `stated` komponentida ixtiyoriy `nu` (berilmasa natija o'zgarmagan).

## [2.9.0] — P07b: oshkor bo'lmagan model, atan2, eng kichik qamrov sohasi (JCGM 102:2011) (2026-11-19)

**ENGINE_VERSION: 2.8.1 → 2.9.0** (minor, yangi imkoniyat). **Mavjud natijalar o'zgarmadi:** `tests/cases/` dagi 83 ta misolning `evaluate()` va 26 ta misolning `monteCarlo()` natijasi asosiy branch (2.8.0, `97e7586`; 2.8.1 merge qilingandan keyin ham testlar o'tadi) bilan **bit darajasida bir xil** (`engineVersion` va yangi `coverageRegion.smallest` maydonidan tashqari; nazorat skripti). 9 ta etalon Excel nuqtasi, 10-test, JCGM 100 / 101 / 102 misollari o'zgarmadi.

### Qo'shilganlar

- **Oshkor bo'lmagan model h(Y, X) = 0** (`src/engine/multivariate/implicit.js`; JCGM 102:2011 §6.3): `state.implicit = { unknowns: [{ name, start, unit }], equations: [...] }`. y — Nyuton usuli bilan (Eq. (7)); C_y, C_x — simvolik hosilalar; U_y — Eq. (8) (C_y·C = C_x sistemasi LU bilan yechiladi, so'ng lokal chiziqli ekvivalent model mavjud oshkor yo'ldan o'tadi — byudjet, ν_eff, k, U, qamrov sohasi aynan oshkor modeldagidek). Bitta noma'lum — bir o'lchovli natija, bir nechta — `mode: 'MULTIVARIATE'`; ikkalasida `implicit: { iterations, residual, criterion, lastStep, Cy, Cx, sensitivity }`. Xatolar: `implicit_no_convergence`, `implicit_singular` (C_y singular — §6.3.1.3 Note 1), `implicit_bad_spec`, `implicit_bad_equation`, `implicit_bad_start` (boshlang'ich yaqinlashuv majburiy), `implicit_name_clash`. Monte-Karlo — `implicit_mc_unsupported` (jimgina chiziqlashtirilmaydi).
- **`atan2(y; x)`** formula tahlilchisida (ajratuvchi `;` yoki `,`), simvolik hosila (v·u′ − u·v′)/(u² + v²), o'lchamlik tekshiruvi. Shablon formulalarida ham ishlaydi.
- **Eng kichik qamrov sohasi** (§7.7.4, a–g) — ikki chiqishli MCM natijasida `coverageRegion.smallest = { mesh, bounds, cells, area, count, fraction, rows }`; to'r standart 100 × 100 (`smallestMesh`: 10…500, 0 — o'chirish). Hisobotda yuz, to'r, qamragan nuqtalar ulushi va grafikda bo'yalgan soha.
- **Shablon muharriri:** qo'shimcha chiqishlar (`outputs`) jadvali — qo'shish, tahrirlash, o'chirish; tekshiruv (belgi takrori, kirish belgisi bilan to'qnashuv, formula tahlili, chap tomon ↔ belgi); `outputs` APPROVED shablonda qulflanadi (`DEFAULT_LOCKED`). Uch tilda.
- **Hisob fayli:** `uc-calc/1` va `uc-model/1` da `implicit` maydoni (eksport → import → qayta hisob bit darajasida bir xil).

### Test misollari (verified, sahifa / jadval havolasi bilan)

- §9.3 MCM qatorlari (Table 6, 7 — 44–45-betlar): 6 ta misol × 5 qiymat = 30 qiymatning hammasi tolerans ichida (½ oxirgi xona + 2·√2·s, s — o'lchangan; M = 3·10⁶, manbada 10⁷).
- §9.5.2 (56-bet): θ̂ = 20,0232 °C, u = 0,0045 °C, c_y = 0,389; §9.5.3 (Table 15, 16 — 57-bet): 10 baho + 10 noaniqlik + 45 korrelyatsiya koeffitsiyenti — hammasi oxirgi xonaning yarmi ichida.
- §7.7.4 misoli (31-bet): 100 × 100 to'r, M = 10⁶ — yuz 9,35 (manba 9,4), 950 0xx nuqta (manba 950 074).
- §6.3.2 Example 1, 2: manbada raqam yo'q — oshkor va oshkormas yondashuv natijalari tengligi bilan tekshirilgan.
- Farq: **D-21** — §9.5.2.6 da C_x ning uchinchi elementi "4.01 Ω°C²" deb bosilgan (4,01·10⁴ bo'lishi kerak; yakuniy natija mos).
- Jami: 90 verified, 2 unverified.

### Egasi qarorlari (2026-11-19) — shu versiyada

- **U_y — JCGM 102:2011 Annex B (B.1 a–j)** (`annexB`; §6.3.1.5: (10) + (9) yo'li "not recommended"). U_x ning Cholesky ko'paytuvchisi yo'q bo'lsa — LU yo'li + info topilmasi `implicit_lu_fallback` (linter **MV2**). Ikki yo'l §9.5.2 va §9.5.3 da ≤ 10⁻¹² nisbiy aniqlikda bir xil (test). Ko'p chiqishli oshkormas natijada `covariance` / `correlation` / `coverageRegion` endi Annex B dan (avvalgi commit'dagi LU qiymatidan ≈ 10⁻¹⁵ nisbiy farq; Table 15–16 dagi 65 qiymat o'zgarmadi). Sezgirlik koeffitsiyentlari (byudjet) — C_y·C = C_x sistemasidan.
- **Nyutondan keyin qoldiq tekshiruvi:** |h(y, x)| masshtabga nisbatan 10⁻⁸ dan katta → `implicit_no_convergence` (`detail: 'residual'`); `implicit.residualRel`.
- **cond₁(C_y)** — `implicit.cond`, hisobotda (ekran, bosma, vektor bo'lim) ko'rsatiladi.
- **Shablonda `implicit`** (sxema, `checkTemplate`, `buildState`): standart y⁽⁰⁾ (`start`), foydalanuvchi qiymati ustun; hech biri bo'lmasa — `implicit_bad_start`.
- **Ko'p chiqish + ko'p nuqta:** yagona k yo'q; U_j — har bir chiqishning o'z bir o'lchovli qoidasi bilan; birgalikdagi qamrov — faqat nuqtaning qamrov sohasi (k_p, §6.5); har bir nuqta alohida (`vectorSummaryRows`, nuqtalar paneli, bosma hisobot). Nuqtalar orasidagi soha hisoblanmaydi.
- Tasdiqlandi, o'zgarishsiz: Nyuton mezoni, singularlik chegarasi 10⁻¹³·max|C_y|, y⁽⁰⁾ majburiy, to'r 100 × 100 (sozlanadi, hisobotda), §9.3 testlari M = 3·10⁶. Oshkormas model MCM — keyingi bosqich.

## [2.8.1] — Westgard va NIST manbalari bilan tekshiruv: 1₂s darvozasi, ko'p materialli Westgard, D₄ jadvali (2026-11-19)

**ENGINE_VERSION: 2.8.0 → 2.8.1.** GUM / MCM / regressiya / top-down / maxsus rejimlar natijalari o'zgarmadi; 9 ta etalon nuqta va 10-test o'zgarmadi. O'zgarish faqat QC kartalari va Westgard topilmalarida.

- **Manbalar:** NIST/SEMATECH e-Handbook §6.3.2, 6.3.2.1, 6.3.2.2 (`docs/references/nist-ehandbook-6.3.2/`) va Westgard va b., Clin. Chem. 27 (1981) 493–501 (egasi nusxasi; PDF © AACC — repoda faqat qaydnoma `docs/references/westgard-1981-NOTES.md`). P11 dagi "(unverified)" belgisi QC kartalari va Westgard qoidalaridan olib tashlandi.
- **D₄ (NIST jadvaliga moslandi):** n = 3: 2,574 → **2,575**; n = 5: 2,114 → **2,115** (avval yaxlitlangan d₂, d₃ dan hisoblangan). Natijaga ta'siri: n = 3 va n = 5 kichik guruhli R kartasining UCL i ~0,04 % ga oshadi. A₂, D₃ va boshqa D₄ — NIST bilan aynan mos edi.
- **1₂s darvozasi (W-4; Westgard 1981, 495–496-betlar, 1-rasm; egasi qarori 2026-11-19):** standart bo'yicha seriyada ±2s dan oshgan kuzatuv bo'lmasa, seriya qabul qilinadi — 4₁s va 10ₓ shunday seriyada tugaydigan oyna bilan endi rad etmaydi (natijada `suppressed` — kartada ko'rsatiladi). 1₃s, 2₂s, R₄s ga ta'sir yo'q. Laboratoriya sozlamasi `westgardGate: false` — avvalgi (mustaqil) rejim; natijada `gate: false`, kartada belgi bilan.
- **Bir nechta nazorat materiali (W-5):** `westgardMulti(materials, opts)` — seriya belgisi majburiy (`qc_multi_runs_required`); 2₂s materiallar bo'ylab (bir seriya) va bir material ichida; R₄s bir seriya ichida materiallar bo'ylab; 4₁s, 10ₓ yig'ma ketma-ketlikda va har bir materialda; 3+ materialda `generalized: true` (loyiha umumlashmasi). **UI da hali yo'q** — kartalarni guruhlash keyingi bosqichda.
- **Testlar:** NIST A₂ / D₃ / D₄ jadvali (aynan), §6.3.2.2 individuals misoli (UCL 55,8041, LCL 45,8159 — avvalgi `todo` endi majburiy), Westgard 1981 2–3-jadval (oylik x̄ / s, 1-, 3-, 5-oy yig'malari, chegaralar), darvoza va ko'p material testlari.

## [2.8.0] — P11: etalonlar reestri, drift, CMC jadvali, QC kartalari, kalibrlash intervali (2026-11-18)

**ENGINE_VERSION: 2.7.0 → 2.8.0** (minor, yangi imkoniyat). **Mavjud natijalar o'zgarmadi:** `tests/cases/` dagi 83 ta misolning `evaluate()` natijasi 2.7.0 (`ada88d9`) bilan **bit darajasida bir xil** (`engineVersion` dan tashqari; nazorat skripti bilan solishtirildi); 9 ta etalon Excel nuqtasi, 10-test, JCGM 100 / 101 / 102 misollari o'zgarmadi; etalon nuqtalar ko'rinishi o'zgarmadi. Yangi maydonlar (`typeB[].registry`, `typeB[].drift`, `settings.cmcRow` / `cmcRows` / `cmcX`, `settings.measurementDate`) ishlatilmagan hisobda natijaga hech qanday yangi kalit qo'shilmaydi.

### Qo'shilganlar

- **`src/engine/lab/`** (sof modullar, API — `docs/ENGINE_API.md` §14):
  - `registry.js` — etalon kartochkasi (`uc-registry/1`), kalibrlash nuqtalari, nuqtalar orasida chiziqli interpolyatsiya (ekstrapolyatsiya yo'q), `sourceFromStandard` — B tur manbasi + hisobda saqlanadigan sertifikat nusxasi (reestr ID va versiyasi), amal qilish muddati, kuzatuvchanlik dalili (ILAC P10:07/2020 §2).
  - `drift.js` — kalibrlash tarixidan |ΔC| yoki chiziqli trend; taklif u = |ΔC|/√3 (taqsimot sozlanadi); kamida 2 ta kalibrlash; taklif avtomatik qo'shilmaydi.
  - `cmc.js` — CMC jadvali: bitta qiymat, nisbiy (%), a + b·|X|, diapazon bo'yicha chiziqli interpolyatsiya (ILAC P14:09/2020 §4.2 a–c); `findCmc`, `cmcCheck`, `cmcCheckRows`.
  - `qc.js` — Shewhart X̄–R va I–MR kartalari, ±2s / ±3s, konstantalar d₂, d₃, A₂, D₃, D₄ (n = 2…10), s_Rw kartadan (ν = n − 1).
  - `westgard.js` — 1₃s, 2₂s, R₄s, 4₁s, 10ₓ (har biri alohida funksiya).
  - `interval.js` — kalibrlash intervali tavsiyasi (drift trendi → chegaraga yetish vaqti; kamida 3 ta kalibrlash; faqat tavsiya).
- **Hisobda CMC(X) avtomatik:** `settings.cmcRows` (bir kattalikning barcha diapazon qatorlari nusxasi) yoki `settings.cmcRow` + `settings.cmcX` (son yoki kirishlardan ifoda) → `result.cmcCheck`; U < CMC(X) → mavjud `below_cmc` (X8, error), `criticalMode` bo'yicha. **U avtomatik CMC ga almashtirilmaydi.**
- **Linter:** **L1** — `standard_expired` (error → hisobot "RASMIY EMAS"), `standard_expiring` (info, standart 30 kun — `settings.expiryWarnDays`), `standard_no_validity` (warning), `standard_no_traceability` (warning, ILAC P10 §2); **L2** — `outside_scope` (warning), `cmc_x_missing` (warning). Chegaralar — loyiha qarori, **egasi tasdig'ini kutadi** (`docs/LINTER_RULES.md` §4 #25–#28).
- **Saqlash:** `src/storage/registry.js` — reestr yozuvlari `registries` omborida (IndexedDB), har bir yaratish / tahrirlash / o'chirish audit zanjirida (rol, vaqt, oldingi va yangi qiymat), versiya har saqlashda oshadi; Firebase'ga yozilmaydi. **Saqlash sxemasi 2 → 3** (`CALC_STATE_SCHEMA`, `migrateSchema`): eski hisoblardagi qo'lda kiritilgan B tur manbalari o'zgarishsiz qoladi (reestrga bog'lanmagan). Laboratoriya sozlamasi `expiryWarnDays` (30).
- **Import / eksport:** `src/io/registry.js` — reestr `.xlsx` / `.csv` dan (P05b `LIMITS` bilan; formulalar bajarilmaydi), `uc-registry/1` JSON (RFC 8785 xeshi bilan), CSV eksport (matn zararsizlantirilgan).
- **UI:** "Laboratoriya" yorlig'i — "Etalonlar", "CMC", "QC kartalari" (`src/ui/lab/`); B tur oynasida "Reestrdan tanlash"; hisob sozlamalarida o'lchash sanasi va CMC kattaligi; QC kartasidan s_Rw ni Top-down ustasiga bir tugma bilan uzatish; SVG grafik (skriptsiz, CSP o'zgarmagan). Matnlar uch tilda (`src/js/i18n-lab.js`, 246 kalit).
- **Hisobot:** `src/report/lab.js` — reestr manbasi (sertifikat raqami, sanasi, kalibrlovchi tashkilot, akkreditatsiya, kuzatuvchanlik, nuqta, tuzatma, reestr ID / versiya), CMC tekshiruvi (qaysi qator, CMC(X), U ≥ CMC yoki asoslangan qaror), drift manbasi asosi (qaysi kalibrlashlar, usul, bo'luvchi).

### Egasi qarorlari (2026-11-18, R-25) — shu versiyada

- R-25 dagi loyiha qarorlari va `docs/LINTER_RULES.md` §4 #25–#28 tasdiqlandi.
- **R₄s** seriya belgisisiz ketma-ket ikki natijaga qo'llansa — natijada `approximation: true`, kartadagi topilmada "loyiha yaqinlashuvi" (uch tilda).
- **Mehmon (`guest`) kiritgan yozuv:** `saveRegistry` yozuvga `savedBy` (rol) yozadi; `sourceFromStandard` nusxaga `enteredBy`; yangi info topilmalar `registry_unauthenticated` (L1) va `cmc_unauthenticated` (L2) — hisobotda "reestr yozuvi autentifikatsiyasiz kiritilgan". Hisob natijasiga (y, u_c, k, U) ta'sir qilmaydi.
- NIST e-Handbook va Westgard manbalari — egasi PDF qo'shguncha "(unverified)"; tarmoq ruxsati berilmaydi.

### Manba holati

- **Verified:** ILAC P14:09/2020 §4.1–4.3, §5.5 (CMC; sahifa havolali testlar), ILAC P10:07/2020 §2 (kuzatuvchanlik yo'llari).
- **Unverified:** ISO/IEC 17025:2017 §6.4, §6.5, §7.7.1 (repoda yo'q); Westgard qoidalari (nashr repoda yo'q — ta'rif bo'yicha jadvalli testlar); Shewhart konstantalari — **NIST e-Handbook sahifasi sessiyada ochilmadi**, shuning uchun qiymatlar ta'rifdan mustaqil sonli integrallash bilan tekshirildi (±0,001); NIST misoli — `todo`. ILAC G24 / OIML D 10:2022 repoda bor, lekin u aniq formula bermaydi — interval hisobi loyiha qarori.

## [2.7.0] — P07: ko'p o'zgaruvchili modellar (JCGM 102:2011) (2026-11-18)

**ENGINE_VERSION: 2.6.0 → 2.7.0** (minor). **Bitta chiqishli hisoblar o'zgarmadi:** barcha mavjud test misollarining `evaluate()` natijasi 2.6.0 bilan **bit darajasida bir xil** (`engineVersion` dan tashqari); 9 ta etalon Excel nuqtasi, 10-test va JCGM 100 / 101 misollari o'zgarmadi; etalon nuqtalar ko'rinishi o'zgarmadi. `monteCarlo()` ning 188 ta nazorat natijasidan 176 tasi bit darajasida bir xil; qolgan 12 tasi — quyida.

### ⚠ O'zgargan Monte-Karlo natijalari (alohida qayd)

1. **Juftlangan A tur kuzatuvlari (bir xil n, qatorma-qator) endi natija beradi.** 2.6.0 da bunday kirishlar korrelyatsiyada bo'lsa `mc_nonnormal_correlation` xatosi qaytar edi (zichlik etaloni, JCGM 100 H.2). 2.7.0 da ular **ko'p o'lchovli t-taqsimot** t_ν(x̄, S/n), ν = n − N dan tanlanadi (JCGM 102:2011 §5.3.2, 11-bet; egasi qarori Q-6, 2026-11-18). Shart: guruhdagi barcha kirishlar usul 1 (o'rtacha), n bir xil, bo'sh katak yo'q, guruh ichida B tur kovariatsiyasi yo'q. Shart bajarilmasa — avvalgidek `mc_nonnormal_correlation`.
2. **n ≤ N** (kuzatuvlar soni guruhdagi kattaliklar sonidan ko'p emas) — aniq xato `mc_t_dof` (S singular, taqsimot aniqlanmagan); jimgina yaqinlashtirilmaydi.
3. **ν ≤ 2** bo'lsa Q-5 qoidasi amal qiladi: u(y) berilmaydi, faqat qamrov intervali.
4. **`nonNormalCorrelation: 'gaussian'` sozlamasi** yuqoridagi shart bajarilgan guruhga endi qo'llanilmaydi — ko'p o'lchovli t ustun (aniqroq taqsimot); sozlama faqat t qo'llab bo'lmaydigan guruhlarda ishlaydi.

Boshqa barcha MCM natijalari (mustaqil kirishlar, Gauss guruhlari) o'zgarmagan — tasodifiy sonlar ketma-ketligi saqlangan.

### Qo'shilganlar

- **Vektor LPU** (`src/engine/multivariate/lpu.js`): `outputs[]` da bir nechta formula → har bir chiqish o'zgarmagan bir o'lchovli yo'l bilan baholanadi, so'ng C_x (m × N), **U_y = C_x·U_x·C_xᵀ** (JCGM 102 §6.2.1.3, Eq. (3)), korrelyatsiya matritsasi. Umumiy kirishlar orqali chiqishlar kovariatsiyasi avtomatik. Kompleks kattaliklar — haqiqiy va mavhum qism alohida chiqish sifatida. U_x musbat (yarim) aniqlanmagan → `invalid_covariance` (tuzatilmaydi). Takror belgi → `duplicate_output`.
- **Qamrov sohasi** (`multivariate/region.js`): ellipsoid k_p² = χ²_{m;P} (§6.5.2–6.5.3, Table 1 — 20 qiymatning hammasi testda), to'g'ri burchakli soha k_q (§6.5.4, Table 2); m = 2 da ellips yarim o'qlari, burchagi, yuzi. Hisobotda soha turi, P, k_p, k_q.
- **Ko'p o'lchovli Monte-Karlo** (`multivariate/montecarlo.js`): P06 dagi `createMonteCarlo`, Wichmann–Hill va Worker qayta ishlatiladi; y, U_y, MCM ellipsoidi (§7.7.2, Cholesky orqali), to'g'ri burchakli soha (§7.7.3); adaptiv protsedura §7.8 (kamida 10 blok; y_j, u(y_j), λ_max, k_p, k_q bo'yicha); §8 tekshiruvi (standart δ/5). ν ≤ 2 da — faqat chiqishlar bo'yicha marginal intervallar.
- **Format:** `uc-model/1` da `outputs[]` bir nechta; `calc-state/v2` da `state.outputs`; natijada `outputs[]`, `covariance`, `correlation`, `coverageRegion`; `uc-calc/1` rejimi `MULTIVARIATE` (eksport → import → qayta hisob bit darajasida bir xil). Bitta chiqishli hujjatlar o'zgarmagan.
- **Linter:** MV1 — `outputs_correlated` (info, |r| > 0,5 — **loyiha chegarasi, egasi tasdig'ini kutadi**), `outputs_singular` (info).
- **UI / hisobot:** model kartasida qo'shimcha chiqish formulalari; natijalar jadvali (y_i, u, k, U, ν_eff), korrelyatsiya matritsasi, qamrov sohasi, ikki chiqishda ellips grafigi (SVG, skriptsiz — CSP o'zgarmagan); bosma hisobotda har bir chiqish byudjeti; normativ havola JCGM 102:2011.
- **Shablonlar:** sxemada ixtiyoriy `outputs` massivi; `MV-01` (R, X, Z — DRAFT, raqamsiz). Mavjud 44 shablon o'zgarmagan.
- **Test misollari (verified, sahifa havolasi bilan):** JCGM 102 §9.2.2–9.2.4 (Table 3–5: GUF, MCM, adaptiv MCM, §8 xulosasi), §9.3 GUF (Table 6–7, 6 holat), §9.4 (Table 11: GUF va MCM), JCGM 100 H.2 vektor sifatida; §6.2.2 Example 1, §6.5.2.3, §7.7.2 misollari. Jami 82 verified, 2 unverified.

### Qilinmaganlar (`docs/RISKS.md` R-24)

Oshkormas modellar h(Y, X) = 0 (§6.3; §6.3.2 va §9.5 misollari), eng kichik qamrov sohasi (§7.7.4), §9.3 ning MCM qatorlari (parserda `atan2` yo'q), ko'p chiqish + ko'p nuqta birikmasi (UI).

## [2.6.0] — P06: Monte-Karlo 2.0 (JCGM 101:2008) (2026-11-18)

**ENGINE_VERSION: 2.5.1 → 2.6.0** (minor). **LPU natijalari (y, u_c, ν_eff, k, U, `conf`, `decision`, `findings`) o'zgarmadi:** 61 ta test misolining `evaluate()` natija JSON'i 2.5.0 (`c1cccce`) bilan **bayt darajasida bir xil** (`engineVersion` dan tashqari; skript bilan solishtirildi). 9 ta etalon Excel nuqtasi o'zgarmadi; etalon nuqtalar ko'rinishi o'zgarmadi.

### ⚠ Monte-Karlo raqamlari o'zgardi (alohida qayd)

`monteCarlo()` ning barcha sonli natijalari 2.5.0 dan farq qiladi. Sabablar:

1. **Generator almashdi:** xorshift32 → kengaytirilgan Wichmann–Hill (JCGM 101:2008 C.3.3, Table C.2). Urug' o'zgarmagan (20261110), lekin ketma-ketlik boshqa.
2. **Tanlash formulalari JCGM 101 bo'yicha:** Gauss — Box–Muller (Table C.3; avval Marsaglia qutbli usuli), t — Table C.5 (avval gamma orqali), uchburchak — a + (b − a)/2·(r₁ + r₂), arksinus — sin 2πr.
3. **Interval indekslari §7.7.2 bo'yicha** aniq: q = pM yoki ⌊pM + ½⌋; [y₍ᵣ₎, y₍ᵣ₊q₎]; simmetrik r = (M − q)/2 yoki ⌊(M − q + 1)/2⌋ (avval bir indeksga farq qilar edi).
4. **Standart rejim — adaptiv** (§7.9.4, n_dig = 2): M endi oldindan berilmaydi (qat'iy M — sozlama). **GUM tekshiruvida MCM toleransi δ/5** (§8.2; egasi qarori) — oddiy MCM da δ.
7. **ν ≤ 2 bo'lgan t-kirishda** (n ≤ 3 kuzatuv) u(y) berilmaydi (`u: null`) — faqat qamrov intervali; to'xtash mezoni avtomatik interval uchlari bo'yicha (egasi qarori).
5. **Korrelyatsiya hisobga olinadi** (avval e'tiborsiz qoldirilar edi): normal kirishlar — ko'p o'lchovli Gauss; normal bo'lmagan kirish korrelyatsiyada qatnashsa — **natija berilmaydi** (`mc_nonnormal_correlation`). Masalan, zichlik misolida (juftlangan kuzatuvlar) 2.5.0 MCM natija berar edi (korrelyatsiyasiz — noto'g'ri), 2.6.0 — bermaydi.
6. **A tur, usul 3:** MCM da t₍n−1₎(x̄, s²/n) (standart og'ishi aynan u_A) — avval N(0, u_A²). Loyiha qarori (R-23).

**Eski natijani takrorlash:** `monteCarlo(spec, { rng: 'xorshift32-legacy', M })` 2.5.0 natijasini bit darajasida qaytaradi (kod `src/engine/mc/legacy.js` ga o'zgarishsiz ko'chirilgan; 6 ta hisob bo'yicha test — `tests/engine/mc-legacy.test.js`). Yangi hisoblar uni ishlatmaydi; ishlatilsa `mc_legacy_rng` topilmasi chiqadi.

**10-test (gazoanalizator 2-nuqta, `[−0,0111; 0,0469]`):** **majburiy, o'tadi** — egasi qarori Q-3 (b), 2026-11-18: n_dig = 2, tolerans = δ + 2·s_ref (5·10⁻⁵ + 2·1,2·10⁻⁴ = 2,9·10⁻⁴ quyi uch; 2,3·10⁻⁴ yuqori uch; s_ref — qo'llanma qiymati olingan bitta M = 10⁶ simulyatsiyasining tarqoqligi, mustaqil 8 takror). Natija [−0,010 99; 0,046 88], farq 1,1·10⁻⁴ / 2·10⁻⁵. Qo'llanma qiymati o'zgartirilmagan. Batafsil — `tests/cases/DISCREPANCIES.md` D-04.

### Qo'shilganlar

- **Generator** (`src/engine/mc/rng.js`): kengaytirilgan Wichmann–Hill, C.3.3.3 dagi 64 bitli shakl; eng katta ko'paytma 47 003 · 2 147 483 542 = 100 938 168 924 626 < 2⁵³ — suzuvchi nuqtada aniq (BigInt kerak emas; testda BigInt va Table C.2 dagi 32 bitli shakl bilan solishtirilgan). Bitta butun urug'dan to'rtta holat — MurmurHash3 fmix32 (loyiha qarori). Natijada `{ rng: { name: 'wichmann-hill-2006', seed }, M }`. R(0, 1) ketma-ketligi Node va Chromium da bit darajasida bir xil (tekshirildi).
- **Taqsimotlar** (`src/engine/mc/distributions.js`, JCGM 101 §6.4, C.4–C.6): normal, to'g'ri burchakli, uchburchak, trapetsiya, egri trapetsiya, arksinus, siljitilgan-masshtablangan t, eksponensial, ko'p o'lchovli normal (Cholesky); log-normal (JCGM 101 da yo'q — **unverified**, momentlar bo'yicha mustaqil tekshiruv).
- **B tur manbalarida yangi taqsimotlar** (GUF da ham): `trap` (β), `ctrap` (d), `exp`, `lognorm`; noto'g'ri parametr — `bad_dist_param`. B tur `normal` + chekli ν → MCM da t_ν (§6.4.9.7).
- **Adaptiv Monte-Karlo** (§7.9.4): blok M = max(J, 10⁴); to'xtash — 2s_y, 2s_u(y), 2s_ylow, 2s_yhigh ≤ δ; n_dig sozlanadi (standart 2); M chegarasi (standart 10⁷, eng ko'pi 2·10⁷) — yetilsa `mc_not_converged`; natijada M, bloklar soni, yetilgan n_dig. `tolDivisor: 5` — §8.2 (δ/5). Qat'iy M — `mode: 'fixed'`.
- **Intervallar va tekshiruv:** ehtimollik bo'yicha simmetrik va eng qisqa (§7.7.2) — ikkalasi natijada; §8.1.3: δ (GUM u_c dan, n_dig bo'yicha), d_low, d_high, `validated`. LPU tasdiqlanmasa — `mc_lpu_not_validated` va hisobotda MCM intervali natija sifatida.
- **Korrelyatsiya:** ko'p o'lchovli Gauss (§6.4.8, C.5); musbat (yarim) aniqlanmagan matritsa — `invalid_covariance` (jimgina tuzatilmaydi; r = ±1 — musbat yarim aniqlangan, qabul qilinadi); normal bo'lmagan kirish — rad etish yoki (sozlama bilan) belgilangan Gauss yaqinlashuvi.
- **Linter:** yangi rejim `MC` va qoidalar **M2** (`mc_nonnormal_correlation` — error, `mc_correlation_gaussian_approx` — warning), **M3** (`mc_lpu_not_validated`), **M4** (`mc_not_converged`, `mc_variance_undefined`, `mc_legacy_rng`); MC natijasida `findings`.
- **Web Worker** (`src/ui/mc/`, RISKS R-16): hisob modulli worker'da, progress va bekor qilish bilan; worker bo'lmasa — asosiy oqimda ≈ 25 ms li bo'laklar. **CSP o'zgarmadi** (`script-src 'self'` — worker shu qoida ostida; `worker-src` qo'shilmadi). Chromium da M = 10⁶: 1,0 s, asosiy oqimdagi eng uzun to'xtash 12 ms.
- **Hisobot:** MCM bo'limida interval turi, P, M, generator, urug', n_dig (so'ralgan / yetilgan), rejim; MC topilmalari bosmada ham chiqadi.
- **Test misollari:** JCGM 101 §9.4 (Table 8, 9 — 6 ta MCM), §9.5 (Table 11, adaptiv), Table 2, 4, 6 ning adaptiv qatorlari — **verified** (jami 61 verified, 2 unverified; pending yo'q).
- **Egasi qarorlari (2026-11-18, `docs/RISKS.md` R-23) — shu versiyada bajarilgan:** Q-3 (b) — 10-test toleransi; Q-5 — ν ≤ 2 da `criteria: 'interval'` avtomatik, hisobotda "u(y) aniqlanmagan (ν ≤ 2), faqat qamrov intervali"; Q-6 — normal bo'lmagan korrelyatsiyada natija berilmaydi, topilmada "LPU natijasi amal qiladi" (ko'p o'lchovli t — P07); Q-7 — usul 3 da t₍n−1₎ tasdiqlandi; Q-8 — `validation` (standart `true`: δ/5; `false`: δ, §8 xulosasi berilmaydi), `result.validation { requested, tolDivisor, required, achieved, met, lowered }`, erishilgan tolerans hisobotda, δ ga tushirish — laboratoriya sozlamasi `mcTolerance: 'delta'` (hisobotda belgi). `mc_not_converged` endi qat'iy M da ham chiqadi (tekshiruv so'ralgan, δ/5 ga erishilmagan).
- **Laboratoriya sozlamalari:** `mcMode`, `mcNDig`, `mcTolerance` (sozlamalar oynasida). **Shablon sxemasi:** `trap` (+ `beta`), `ctrap` (+ `d`), `exp`, `lognorm`.
## [2.5.1] — P05 bo'yicha egasi qarorlari (2026-11-18)

**ENGINE_VERSION: 2.5.0 → 2.5.1** (patch). **y, u_c, ν_eff, k, U, `conf`, `decision` o'zgarmadi** — faqat ikki topilmaning darajasi va bitta yangi topilma kodi. 9 ta etalon Excel nuqtasi va 10-test (MC) o'zgarmadi; etalon nuqtalardagi topilmalar ro'yxati ham o'zgarmadi.

- **X7** (`x7_k2_low_dof`): ν_eff < 10 → **warning**; 10 ≤ ν_eff < 30 → **info** (avval ν_eff < 30 da doim warning). Ref: JCGM 100:2008 G.6.6 ("say greater than 10").
- **D1:** `decision_low_tur` (TUR < 1) — **warning** (avval info); yangi `decision_tur_below_4` (1 ≤ TUR < 4) — info, **unverified** (4:1 — amaliyotdagi qoida, manbasi repoda yo'q).
- **Qaror qoidasini oldindan qo'yish:** `decisionPreset({template, lab})` — shablondagi `decisionRule` yoki laboratoriya sozlamasidagi standart qoida natijalar sahifasidagi tanlov oynasiga oldindan qo'yiladi; `settings.decisionRule` ga faqat foydalanuvchi tasdiqlagach yoziladi. Tasdiqlanmasa bayonot chiqmaydi (dvigatel xatti-harakati o'zgarmagan: qoida bo'sh → `decision.pending = 'rule'`).
- Hujjatlar: `docs/LINTER_RULES.md` §4 (1–20-bandlar tasdiqlandi, 3 va 18 o'zgartirildi), `docs/RISKS.md` R-22 (qarorlar qayd etildi; build identifikatori (b) va versiyalangan modul URL'lari — P13).

## [2.5.0] — P05b: import/eksport, rasmiy hisobot shakllari, qaror qoidasi (2026-11-18)

**ENGINE_VERSION: 2.4.0 → 2.5.0** (minor: yangi imkoniyat). **y, u_c, ν_eff, k, U, `conf` o'zgarmadi:** modelSpec'i bor 52 ta test misolining (GUM, MC, regressiya, top-down, maxsus rejimlar) to'liq natija JSON'i 2.4.0 (`feat/p05a-linter`) bilan bir xil — `engineVersion`, yangi `decision` maydoni, yangi D1 topilmalari va aniqlashtirilgan `ref` matnlaridan tashqari (skript bilan solishtirildi). 9 ta etalon Excel nuqtasi va 10-test (MC) o'zgarmadi; etalon nuqtalar ko'rinishi o'zgarmadi.

- **Qaror qoidasi** (`src/engine/decision.js`, `result.decision`) — **verified** (JCGM 106:2012 §7.3.3 Ex. 1–2 p. 15, §7.4 p. 16, Table 1, §8.3.2.3 p. 22; ILAC G8:09/2019 Table 1 p. 12, §4.2): oddiy qabul (w = 0), himoya zonasi w = r·U (r = 0; 0,83; 1; …), TUR = T / (2U) (bir tomonlama chegarada — hisoblanmaydi), muvofiqlik ehtimoli p_c (normal taqsimot), shu o'lchov uchun noto'g'ri qabul / noto'g'ri rad ehtimoli, bir va ikki tomonlama chegaralar, binar / nobinar bayonot (ILAC G8 §4.2.3). `settings.decisionRule`, `guardR`, `decisionStatement`, `tolLower` / `tolUpper`, `agreement`. **Qoida yoki chegara berilmagan bo'lsa bayonot berilmaydi** (`decision.pending`) — dastur o'zi tanlamaydi (ISO/IEC 17025 §7.1.3). Model turi `unknown` bo'lsa ham berilmaydi (P05a, R-07).
- **Xatti-harakat o'zgarishi (hisobot):** "MUVOFIQ / NOMUVOFIQ" hukmi endi faqat qaror qoidasi tanlanganda chiqadi (avval MPE berilsa |E| + U ≤ MPE bo'yicha avtomatik). `conf` maydonlari dvigatel natijasida o'zgarmagan (moslik uchun); yangi kod `decision` dan foydalanadi.
- **Linter:** yangi qoida **D1** — `decision_rule_missing` (warning: MPE / chegara bor, qoida yo'q), `decision_no_agreement` (info), `decision_invalid` (error), `decision_low_tur` (info), `decision_normal_assumed` (info: ν_eff < 30 da p_c normal faraz bilan). ILAC P14 / ILAC G8 / JCGM 106 havolalari PDF bilan solishtirildi: `below_cmc` → ILAC P14:09/2020 §5.5 (endi verified), X1, X9, M1 havolalari aniqlashtirildi. 9 ta etalon nuqtada `error` yo'q; MPE berilgan nuqtalarda yangi `decision_rule_missing` ogohlantirishi bor (etalon fayllarda qaror qoidasi yo'q — qo'shilmadi).
- **Hisobot shakllari** (`src/report/`): `sections.js` (GUM, regressiya, top-down, maxsus rejim bo'limlari `src/js/report.js` dan ko'chirildi — sof, DOM siz), `forms.js` (kalibrlash sertifikatiga ilova; sinov protokoli bo'limi; noaniqlik byudjeti asosnomasi; muvofiqlik bayonoti), `summary.js` (ko'p nuqtali: avval yig'ma jadval, so'ng har bir nuqta), `requisites.js` (rekvizitlar; to'ldirilmagan bo'lsa ogohlantirish — ISO/IEC 17025:2017 §7.8.2.1, ro'yxat **unverified**, standart repoda yo'q), `normative.js` (hisobot tiliga mos havolalar), `footer.js`. Laboratoriya rekvizitlari va logotip (PNG / JPEG ≤ 200 KB) — faqat brauzerda (`localStorage` `uc_report_lab_v1`); hujjatga xos va shaxsiy maydonlar (buyurtmachi, tasdiqlovchi …) — faqat `sessionStorage` (`uc_report_doc_v1`); **Firebase'ga yozilmaydi.**
- **Hisobot pasti:** dastur nomi va ENGINE_VERSION; build identifikatori = dvigatel xeshi (`tests/security/engine.sha256.json`; yangi CI / build qadami qo'shilmadi); shablon ID va versiyasi; hisob ID va sanasi; hisobning kanonik JSON'i (RFC 8785 JCS) SHA-256 xeshi (`crypto.subtle`; kalitlar tartibiga bog'liq emas); QR kod (`uc-calc:<id>;sha256:<xesh>` — `/verify` sahifasi P11 dan keyin).
- **Eksport / import** (`src/io/`): `.json` — `uc-calc/1` (shablon ID / versiyasi, kirishlar, natija, topilmalar, qabullar, ENGINE_VERSION, kanonik xesh); `.xlsx` — byudjet va natijalar (yig'ma varaq → nuqtalar → kirishlar → topilmalar → ma'lumot; sonlar yaxlitlanmagan); `.csv`. **JSON eksport → import → qayta hisob — bit darajasida bir xil** (test). Import: barcha jadvallarda Excel'dan qo'yish; `.xlsx` / `.csv` faylini ustunlarni moslashtirish oynasi bilan; fayl faqat brauzerda o'qiladi (tarmoq chaqiruvi yo'q — statik test); chegaralar: 5 MB, 10 000 qator, 200 ustun, 50 varaq, ZIP 2000 yozuv / 64 MB ochilgan hajm; **formulalar bajarilmaydi** — faqat saqlangan qiymat; HTML / skript matni escape qilinadi; eksportda '=', '+', '-', '@' bilan boshlangan matn zararsizlantiriladi.
- **Vendor:** SheetJS CE **0.20.3** (rasmiy `cdn.sheetjs.com`, Apache-2.0; npm `xlsx` 0.18.5 ishlatilmaydi — CVE-2023-30533, CVE-2024-22363) va qrcode-generator **2.0.4** (MIT) — `vendor/` da, LICENSE va SHA-256 bilan (`vendor/README.md`, `vendor/SHA256SUMS.txt`; test tekshiradi). Faqat import / eksport yoki hisobot ochilganda dinamik `import()` bilan yuklanadi (`src/io/vendor.js`). **CSP o'zgarmadi** (`script-src 'self'`).
- **Egasi qarori kerak:** `docs/RISKS.md` R-22 (GOST 34100.3-2017 ekvivalentligi, build identifikatori, rekvizitlar ro'yxati, TUR ta'rifi va boshqalar).

## [2.4.0] — P05a: metrologik linter, asoslangan qabul, model turi, i18n (2026-11-18)

**ENGINE_VERSION: 2.3.0 → 2.4.0** (minor: yangi imkoniyat). **y, u_c, ν_eff, k, U o'zgarmadi:** 55 ta test misolining (GUM, MC, regressiya, top-down, maxsus rejimlar) to'liq natija JSON'i 2.3.0 (`17247b1`) bilan bayt darajasida bir xil — `engineVersion` va yangi maydonlardan (`findings`, `modelKind`, `nominal`, `deviation`) tashqari; MC natijalari (32 misol) ham bir xil (skript bilan solishtirildi). 9 ta etalon Excel nuqtasi va 10-test (MC) o'zgarmadi; etalon nuqtalar ko'rinishi o'zgarmadi.

- **Linter** (`src/engine/linter/`, sof ES modullar): har bir qoida alohida modul `{ id, severity, ref, modes, codes, check }`; natija — `result.findings`. Qoidalar X1–X12, A1–A4, M1 va modul ogohlantirishlari ko'prigi (W1, W2) — jami 78 ta kod; ro'yxat va manbalar — `docs/LINTER_RULES.md`. Manbasi repoda yo'q havolalar `(unverified)` bilan.
- **X11 va X12** `src/engine/topdown/` ning `warnings[]` dan linterga ko'chirildi; xatti-harakat va egasi qarorlari (R-20) aynan saqlangan. P08–P10 modullarining boshqa ogohlantirishlari ham `result.findings` da (kodlar o'zgarmagan). **`warnings[]` — deprecated**, bir versiya davomida moslik uchun qoladi.
- **Darajasi o'zgargan kodlar (topilma sifatida):** `zero_u` va `below_cmc` — **error** (avval ogohlantirish); `c_nan` — error; `zero_s` — rezolyutsiya manbasi bo'lsa info, bo'lmasa yangi `x8_zero_s_no_resolution` (warning); `n_small` — info (n < 3 uchun yangi `n_lt3`, warning).
- **Model turi (RISKS R-07) — xatti-harakat o'zgarishi:** `settings.modelKind` = `error` (ko'rsatish xatosi E = X − X_ref) | `value` (kattalik qiymati Y, `settings.nominal` bilan) | `unknown`. Muvofiqlik endi |y| ni xato deb faraz qilmaydi: `error` — |E|, `value` — |Y − nominal|; **model turi ko'rsatilmagan hisobda `conf` hukm bermaydi (`conf.pending`) va keltirilgan xato γ = null** (avval |y| ishlatilardi). Natijaga `modelKind`, `nominal`, `deviation` qo'shildi; `conf` ning boshqa maydonlari o'zgarmagan. `multiPointCoverage` — `deviation` bo'yicha; eski saqlangan natijada (maydon yo'q) hukm berilmaydi. Etalon misollar, presetlar va `legacy-gas_analyzer`, `legacy-thermometer` shablonlariga `modelKind: "error"` qo'shildi (kutilgan qiymatlar o'zgarmagan); zichlik — `value`.
- **Migratsiya:** eski saqlangan hisoblar (`uc_state_v2`, IndexedDB ga ko'chirishda ham) `modelKind: 'unknown'` oladi — boshqa hech narsa o'zgarmaydi; muvofiqlik bayonoti uchun natijalar sahifasida tanlov so'raladi.
- **Asoslangan holda qabul qilish:** warning / error topilmasi izoh bilan (≥ 10 belgi) qabul qilinadi; `src/storage/acceptance.js` audit zanjiriga yozadi — rol, vaqt, topilma id, izoh (shaxsiy ma'lumot yo'q). Bekor qilish — yangi yozuv. Qabul topilma qiymatiga bog'langan.
- **Hisobot (RISKS R-05):** "Tekshiruv natijalari" bloki ekranda va barcha bosma hisobotlarda (GUM, ko'p nuqtali, regressiya, top-down, maxsus rejimlar) — yashiradigan parametr yo'q; qabul qilinmagan `error` → "RASMIY EMAS" suv belgisi; U = 0 / U < CMC → aniq belgi yoki bloklash (laboratoriya sozlamasi `criticalMode`, standart — belgilash); hisobotda ν qoidasi, MC seed va M, BETA / unverified belgisi, model turi. Hisobot modeli — `src/report/findings.js`.
- **i18n (RISKS R-13):** admin, super-admin va auth sahifalari uz/ru/en (til almashtirgich bilan); qolgan qattiq matnlar `src/js/i18n-admin.js` ga; linter matnlari `src/js/i18n-linter.js`; `tests/i18n.test.js` barcha HTML/JS fayllarda qattiq matnni qidiradi (istisnolar ro'yxati izohi bilan). Shablonlarda `constants[].ref` uch tilda.
- **Egasi tasdiqlashi kerak:** linter chegaralari va daraja tanlovlari — `docs/LINTER_RULES.md` §4 (16 band).

## [2.3.0] — P10: mikrobiologiya, tibbiy laboratoriya, namuna olish, sifatli testlar (2026-11-18)

**ENGINE_VERSION: 2.2.0 → 2.3.0** (minor: yangi imkoniyat). **Mavjud natijalar o'zgarmadi:** GUM, MC, regressiya va top-down yo'lidagi 43 ta test misolining to'liq natija JSON'i 2.2.0 (`41a041a`) bilan bayt darajasida bir xil (`engineVersion` maydonidan tashqari; skript bilan solishtirildi). 9 ta etalon Excel nuqtasi va 10-test (MC) o'zgarmadi; etalon nuqtalar ko'rinishi o'zgarmadi.

- **Namuna olish** (`src/engine/sampling/`, `uc-sampling/1`) — **verified.** Dublikat usuli (n ob'ekt × 2 namuna × 2 tahlil): klassik ichma-ich ANOVA va robust ANOVA; s_samp, s_anal, s_meas; U′ = 2·100·s_meas/x̄; noaniqlik koeffitsiyenti ᶠU = exp(2·s_G). Manfiy dispersiya bahosi 0 ga tenglanadi va ogohlantirish chiqadi. Manba: EURACHEM/CITAC UfS:2019 A1 (pp. 40–42), A2 (pp. 47–49) — klassik natijalar to'liq aniqlikda, robust natijalar 4 qiymatli raqamgacha mos (RANOVA dasturi kodi repoda yo'q — algoritm qayta tiklangan, D-16).
- **Sifatli (binar) testlar** (`src/engine/qualitative/`, `uc-qualitative/1`) — **verified.** 2×2 jadval: SS, SP, noto'g'ri musbat/manfiy ulushlar, PPV/NPV, LR(+), LR(−), posterior ehtimol (Bayes); ishonch intervali — standart bo'yicha Wilson (AQA:2021 Eq. 8–11, Table E6.2); Clopper–Pearson (aniq) — laboratoriya sozlamasi `settings.ciMethod` (loyiha qo'shimchasi; SciPy 1.18.1 qiymatlari bilan tekshirilgan). Manba: EURACHEM/CITAC AQA:2021 Example E3 (p. 28), 7.6 (p. 36).
- **Mikrobiologiya** (`src/engine/micro/`, `uc-micro/1`) — **BETA, unverified** (ISO 19036 repoda yo'q): log₁₀ shkala; texnik, matritsa va Puasson (0,4343/√ΣC) hissalari; asimmetrik interval [10^(y−U); 10^(y+U)]; past sanoqda ogohlantirish.
- **Tibbiy laboratoriya** (`src/engine/medical/`, `uc-medical/1`) — **BETA, unverified** (ISO/TS 20914 repoda yo'q): IQC darajalari bo'yicha u = √(u_cal² + u_Rw²), kerak bo'lsa bias; nisbiy va mutlaq ko'rinishda.
- **UI:** "Maxsus rejimlar" yorlig'i (4 rejim; jadvalni Excel'dan qo'yish, o'nlik vergul); hisobot bo'limlari `src/js/report.js::specialSection` — natija, qo'llanilgan yondashuv va manbasi, cheklovlar, ogohlantirishlar (BETA belgisi bosma hisobotda ham). Matnlar — `src/js/i18n-special.js` (uz/ru/en). Yangi `localStorage` kaliti `uc_special_v1` (shaxsiy ma'lumot yo'q).
- **Shablonlar:** `evaluationMode` — `SAMPLING`, `QUALITATIVE`, `MICROBIOLOGY`, `MEDICAL`; sxemada `special` bo'limi, `buildSpecialState`; DRAFT shablonlar `SP-01…SP-04` (raqamsiz). BETA rejim shablonini APPROVED ga o'tkazib bo'lmaydi.
- **Manbadan tekshirilgan yangi misollar (8 ta):** `ufs-a1-nitrate-classical`, `ufs-a1-nitrate-robust`, `ufs-a2-lead-classical`, `ufs-a2-lead-robust`, `aqa-e6-sarscov2`, `aqa-e3-emit-opiates`, `-methadone`, `-cocaine`.
- **Top-down (R-20) — egasi qarorlari (2026-11-18), hujjatlarda qayd etildi:** ν(bias) = N − 1 tasdiqlandi; usta jonli saytda brauzerda ko'rib chiqildi (`41a041a`). Kod o'zgarmadi.
- **Egasi qarori (2026-11-18, R-21):** sifatli testlar hisobotida standart bo'yicha faqat Wilson intervali; Clopper–Pearson — laboratoriya sozlamasi ("Ishonch intervali usuli"), tanlansa hisobotda faqat u. Hisobotda usul nomi va P yoziladi; ekranda ikkinchi usul solishtirish uchun ko'rinadi, bosmada — yo'q. Natijaga `ciMethod` va `Rate.ci` qo'shildi; ogohlantirish `qualitative_cp_unverified` o'rniga `qualitative_cp_project_addition` (faqat Clopper–Pearson tanlanganda).
- **Egasi hal qilishi kerak** (`docs/RISKS.md` R-21): BETA modullar (mikrobiologiya, tibbiy laboratoriya) uchun manba.

## [2.2.0] — P09: top-down va empirik kattaliklar (2026-11-17)

**ENGINE_VERSION: 2.1.0 → 2.2.0** (minor: yangi imkoniyat). **Mavjud natijalar o'zgarmadi:** `uc-model/1`, `calc-state/v2` va `uc-regression/1` yo'lidagi 35 ta test misolining (GUM, MC, regressiya) to'liq natija JSON'i 2.1.0 bilan bayt darajasida bir xil (`engineVersion` maydonidan tashqari; P09 da skript bilan solishtirildi). 9 ta etalon Excel nuqtasi, 10-test (MC) va shablon natijalari o'zgarmadi; etalon nuqtalar ko'rinishi o'zgarmadi.

- **Dvigatel** `src/engine/topdown/` (sof ES modullar), yangi format `uc-topdown/1` (`evaluate()` uni `evaluateTopDown()` ga uzatadi; `docs/ENGINE_API.md` §8):
  - **Nordtest TR 537 ed. 4:** u(R_w) — nazorat namunasi qatoridan (s), dublikatlar farqidan (s = √(Σd²/(2n))), nazorat kartasi chegaralaridan yoki tayyor s / CV % dan; u(bias) = √(RMS_bias² + u(C_ref)²) — CRM, PT raundlari yoki recovery'dan; u_c = √(u(R_w)² + u(bias)²), U = k·u_c (k = 2), mutlaq va nisbiy (%) ko'rinishda;
  - **EURACHEM QUAM:2012 recovery:** R_m, u(R_m) = s/√n, R_m ning 1 dan farqi t-test bilan; tuzatilgan (1/R_m) va tuzatilmagan variantlar;
  - **s_R asosida** (QUAM §7.6, A6; Nordtest §7): u_c = √(s_R² + Σu_i²), s = chegara/2,8. ISO 21748 ga xos qism (laboratoriya s_r ni χ² bilan tekshirish, s_R ni moslash, u(δ̂)) — **unverified** (standart pullik, repoda yo'q);
  - **darajaga bog'liq noaniqlik:** u(x) = √(s₀² + (x·s₁)²) — QUAM:2012 E.5.2.1 Eq. [1] (p. 117); s₀, s₁ ni aniqlash — E.5.5.2;
  - **gibrid:** asos qamramagan omillar (`additional[]`); **empirik kattalik** (`isEmpiricalMeasurand`): usul bias'i 0 (QUAM §7.9.2), noaniqlik s_r, s_R va rejim parametrlari bardoshliligidan;
  - **nisbiy va mutlaq noaniqlik aralashmaydi:** har bir kattalikda `unit` yoki `relative: true`; aralash qo'shish — xato `topdown_mixed_scale`.
- **X11 va X12** (P05 linteri yo'qligi sababli hozircha `warnings[]` da, har birida `{code, severity, ref, rule}`): X11 — R_w / s_R / bias qamragan omil gibrid qismda yana qo'shilgan; X12 — empirik kattalikda bias qo'shilgan (hissa u_c ga kiritilmaydi). Matnlar uz/ru/en.
- **Manbadan tekshirilgan misollar:** `nordtest-tr537-nh4n` `pending` → **`verified`** (TR 537 ed. 4 §3.2, p. 10; Appendix 4, p. 40 — 15 kattalik; Gemini T15 raqamlari ishlatilmagan); yangi: `nordtest-tr537-nh4n-dup-low`, `-dup-high` (Appendix 5), `nordtest-tr537-oxygen-dup` (Appendix 6), `nordtest-tr537-bod-crm`, `-bod-pt` (§8.2), `nordtest-tr537-recovery` (§6.3), `quam-a4-recovery` (A4, pp. 65–68), `quam-a6-empirical` (A6, pp. 85–86). Jami 8 ta yangi verified misol.
- **UI:** "Top-down" yorlig'i — usta (wizard): 1) ma'lumot turi; 2) jadval kiritish yoki Excel'dan qo'yish (o'nlik vergul); 3) byudjet va natija. Hisobot bo'limi — `src/js/report.js::topdownSection`: y, U, nisbiy U %, k, yondashuv nomi (ISO/IEC 17025:2017 §7.8.3.1 c)). Matnlar — `src/js/i18n-topdown.js` (uz/ru/en). Yangi `localStorage` kaliti `uc_topdown_v1` (faqat sifat nazorati ma'lumoti; shaxsiy ma'lumot yo'q).
- **Shablonlar:** `evaluationMode: "TOP_DOWN"` — sxemada `topDown` bo'limi, `buildTopDownState`; DRAFT shablonlar `TD-01` (suvda NH₄-N), `TD-02` (oziq-ovqat namligi, empirik), `TD-03` (beton mustahkamligi, empirik; T-03 bilan bog'langan), `TD-04` (AAS og'ir metallar; R-01 bilan). Raqamli maydonlari bo'sh.
- **Egasi qarorlari (2026-11-17, `docs/RISKS.md` R-20) — shu versiyada amalga oshirildi:**
  - **X12:** empirik kattalikka bias / recovery / u(δ̂) kiritilganda "tayanch qiymat qaysi usul bilan olingan" savoli majburiy (`referenceMethod`). Javobsiz — hissa u_c ga qo'shiladi va X12 chiqadi (konservativ); "boshqa usul / ta'rif" — hissa chiqariladi (QUAM §7.9.2); "shu usul" — qo'shiladi (§7.9.3);
  - **X11:** hissa hisobda qoladi, ogohlantirish chop etilgan hisobotda ham chiqadi va yashirilmaydi;
  - **k = 2**, hisobotda "k = 2, P ≈ 95 %"; ν_eff hisoblanadi va ko'rsatiladi (Welch–Satterthwaite: ν(R_w) = n − 1, ν(bias) CRM / PT soni bo'yicha); ν_eff < 30 → ogohlantirish va t_P(⌊ν_eff⌋) taklifi, k avtomatik o'zgarmaydi;
  - `per_pair` standart; tuzatilmagan ahamiyatli recovery — hissa u(R_m) + ogohlantirish.

## [2.1.0] — P08: regressiya va kalibrlash egri chiziqlari, "U — diapazon" (2026-11-17)

**ENGINE_VERSION: 2.0.0 → 2.1.0** (minor: yangi imkoniyat). **Mavjud natijalar o'zgarmadi:** `uc-model/1` va `calc-state/v2` yo'lidagi barcha test misollarining (32 ta, MC bilan) to'liq natija JSON'i 2.0.0 bilan bayt darajasida bir xil (`engineVersion` maydonidan tashqari). 9 ta etalon Excel nuqtasi, 10-test (MC) va 11 ta eski shablon natijasi o'zgarmadi; etalon nuqtalar ko'rinishi o'zgarmadi.

- **Dvigatel** `src/engine/regression/` (sof ES modullar), yangi format `uc-regression/1` (`evaluate()` uni `evaluateRegression()` ga uzatadi; `docs/ENGINE_API.md` §7):
  - to'g'ri chiziq va 2-/3-darajali polinom: OLS, WLS, GLS (oqartirish + Householder QR); to'g'ri chiziq uchun WTLS (u(x_i) va u(y_i), iterativ);
  - parametrlar, kovariatsiya va korrelyatsiya matritsasi, qoldiqlar, χ²_obs, ν = m − n_param, χ² testi (P = 0,95);
  - to'g'ri bashorat Y(x), u(Y(x)) (GUM H.3.4, Eq. H.15) va teskari bashorat x̂₀, u(x̂₀) (QUAM E.4, Eq. E3.3/E3.5);
  - chekka holatlarda aniq xato kodi (m < n_param + 1, barcha x bir xil, u = 0 bo'lgan WLS, b ≈ 0 da teskari bashorat va boshqalar);
  - `warnings[]` — har birida `{code, severity, ref}` (P05 da linterga ko'chiriladi).
- **"U — diapazon"** (`uRangeFunction`): U(X) = a + b·|X| (barcha nuqtalarda U(X_j) ≥ U_j) yoki konservativ U = max U_j; qo'llanilgan ifoda hisobotda yoziladi. **Unverified** — ILAC P14 PDF repoda yo'q.
- **Manbadan tekshirilgan misollar:** `jcgm100-h3` `pending` → **`verified`** (JCGM 100:2008 H.3.3, Table H.6, H.3.4 — 33 kattalik); yangi `quam-a5-calibration` (QUAM:2012 A5: B1, B0, S, u(c₀)). WTLS va GLS — **unverified** (algoritm manbasi repoda yo'q), faqat o'zaro tekshiruvlar.
- **UI:** "Regressiya" yorlig'i — (x, u(x), y, u(y)) jadvali (Excel'dan qo'yish, o'nlik vergul), SVG grafiklar (nuqtalar, xatolik chiziqlari, egri chiziq, qoldiqlar), teskari/to'g'ri bashorat, "U — diapazon". Hisobot bo'limi — `src/js/report.js` (usul, parametrlar, kovariatsiya, χ², bashoratlar, ogohlantirishlar). Matnlar — `src/js/i18n-regression.js` (uz/ru/en). Yangi `localStorage` kaliti `uc_regression_v1` (faqat kalibrlash ma'lumoti).
- **Shablonlar:** `evaluationMode: "REGRESSION"` — sxemada `regression` bo'limi, `buildRegressionSpec`; `templates/builtin/R-01.json` (DRAFT: fotometriya/AAS kalibrlash egri chizig'i, teskari bashorat; namunaviy nuqtalar QUAM Table A5.2 dan, `demo: true`).
- **Reja:** bajarish tartibi P08 → P09 → P10 → P05 → P06 → P07 → P11 (egasi qarori, `docs/PLAN.md`).
- **Egasi tasdiqlashi kerak bo'lgan loyiha qarorlari** (`docs/RISKS.md` R-19): kovariatsiya asosining standart tanlovi (OLS — aposterior, WLS/WTLS/GLS — aprior); teskari bashoratda |b| ≤ u(b) → xato, |b| < 3u(b) → ogohlantirish; "U — diapazon" chizig'ini yuqoriga surish.

## [Unreleased] — P04b: "bitta asbob" korrelyatsiyasi — sertifikat manbasi ikki qismga (2026-11-17)

**ENGINE_VERSION: 2.0.0 — o'zgarmadi** (`src/engine/`, `src/report/` ga tegilmagan). 9 ta etalon Excel nuqtasi, 10-test (MC) va 11 ta eski shablon natijasi o'zgarmadi.

- Egasi qarori (3-variant): 14 ta 1-to'lqin shablonida bitta asbob bilan o'lchanadigan kirishlarning kalibrlash manbasi ikki qatorga bo'lindi. Shablonlar: T-02, T-04, T-05, T-06, T-07, T-08, T-09, T-11, T-12, T-15, T-18, T-19, T-21, T-24 (T-04 da ikki guruh, jami 15 guruh). Qo'shimcha: `docs/templates/examples/LAB-EXAMPLE-01.json`.
  - umumiy qism: `share: "common"`, kovariatsiyaga kiradi;
  - nuqtaga xos qism: `share: "point"`, kovariatsiyaga hech qachon kirmaydi.
  - Yarim kengliklar bo'sh. Asos: EA-4/02 M:2022 D4–D5.
- **Hisob natijasiga ta'sir (shablon qatlami).** Avval butun sertifikat U si r = 1 bilan kovariatsiyaga kirardi. Ayirma yoki nisbat modellarida bu kalibrlash hissasini qisqartirib, U ni kam baholashi mumkin edi. Endi faqat umumiy qism korrelyatsiyalangan.
- **`split: "unknown"`.** Bu rejimda faqat sertifikatning to'liq U si ma'lum. Dastur r = 0 va r = 1 bilan hisoblaydi va katta u_c ni oladi. Hisobotda "Korrelyatsiya noma'lum — konservativ chegara: r = …" yoziladi. **Bu loyiha qarori, me'yoriy talab emas** (yuqori chegara g'oyasi — EA-4/02 D7, D.10).
- **Ikki marta hisoblash tekshiruvi.** u²(umumiy) + u²(nuqta) > u²(sertifikat) bo'lsa — ogohlantirish (`split_exceeds`).
- **Migratsiya.** P04 dagi bitta qatorli shablon nusxalari va hisob holatlari `split: "unknown"` ga o'tadi (`migrateTemplate`, `upgradeState`). Kiritilgan ma'lumot yo'qolmaydi.
- **UI.** Yangi elementlar:
  - "Sertifikat qismlari" tanlovi;
  - sertifikatning to'liq U va k maydonlari;
  - natija va bosma hisobotda chegara qatori va ogohlantirish.
  - Matnlar uz/ru/en tillarida.

## [Unreleased] — P04: shablonlar dvigateli, saqlash qatlami, 1-to'lqin shablonlari (2026-11-17)

**ENGINE_VERSION: 2.0.0 — o'zgarmadi.** `src/engine/` va `src/report/` ga tegilmagan (`tests/security/engine.sha256.json` o'zgarmagan). 9 ta etalon Excel nuqtasi va 10-test (MC) natijasi o'zgarmadi.

- **Shablon sxemasi** `schemas/methodology.schema.json` (`uc-template/1`): o'zgarmaslar, variantlar, formula ko'rinishidagi yarim kenglik, `correlations` + `sharedInstrument`, `includeByDefault`, kirish/natija birliklari, `standards[]`/`labCount`/`status`/`sourceNote`/`ref`/`openQuestions`. O'z validatori — `src/templates/validator.js` (tashqi kutubxonasiz).
- **Interpreter** `src/templates/interpreter.js`: shablon → hisob holati → `uc-model/1` → `evaluate()`; holat oqimi DRAFT → REVIEWED → APPROVED, qulflash, yangi versiya; bo'sh maydon bilan hisob bloklanadi (bo'sh yarim kenglik 0, bo'sh k 2 deb jimgina olinmaydi).
- **11 ta preset** → `templates/builtin/legacy-*.json` (`tests/tools/legacy-presets-to-templates.js`). Natija P03 bilan **bit darajasida bir xil** (`tests/templates/snapshots/legacy-p03.json`); zichlik, gazoanalizator va termometr — Excel bilan (katak havolalari, `tests/cases/excel/*.json`). `src/data/presets.js` va eski preset menyusi hozircha saqlanadi.
- **24 ta 1-to'lqin shabloni** `templates/builtin/T-01 … T-24.json` (`docs/templates/WAVE1_SPEC.md`), hammasi DRAFT, raqamli maydonlar bo'sh, ⚠ joylar `openQuestions[]` da.
- **Saqlash** `src/storage/`: `StorageAdapter`, `LocalAdapter` (IndexedDB), `RemoteAdapter` skeleti, append-only audit jurnali (SHA-256 xesh zanjiri, `verifyChain`), `uc_state_v2` → IndexedDB migratsiyasi (eski kalit o'chirilmaydi, `uc_state_v2_backup`), kanonik JSON eksport/import, laboratoriya sozlamalari. `fake-indexeddb` 6.2.8 — faqat devDependency.
- **UI**: shablonlar katalogi (bo'limlar, standart shifri bo'yicha qidiruv, kartada holat/standartlar/laboratoriyalar soni), hisob sahifasida shablon paneli (o'zgarmaslar, "bitta asbobmi?" savoli, kiritilmagan manbalar, demo/DRAFT ogohlantirishi), muharrir, laboratoriya sozlamalari, eksport/import/audit oynasi; kirish birliklari maydoni va o'lchamlik ogohlantirishi; natijalar va bosma hisobotda "Shablon tasdiqlanmagan (DRAFT)" va "Namunaviy ma'lumot — real emas"; `cmcMode: 'block'`. Matnlar — `src/js/i18n-templates.js` (uz/ru/en).
- Hujjatlar: `docs/TEMPLATE_GUIDE.md`, `docs/templates/APPROVAL_CHECKLIST.md`, `docs/VALIDATION_MATRIX.md` §6 (24 ta `pending` qator).

## [2.0.0] — P03: dvigatel `src/engine/` ga ajratildi (2026-11-13)

**ENGINE_VERSION: 1.0.0 → 2.0.0** (major: API va natija tuzilmasi o'zgardi — natijada `Uround`/`yround`/`resultText` yo'q, `outputs[]`, `coverage`, `secondOrder`, `notes`, `units` qo'shildi; `docs/ENGINE_API.md`).

Hisoblash natijasiga ta'sir qiluvchi o'zgarishlar:

- **k tanlash (egasi qarori Q-1(a), D-02):** har doim k = t_P(⌊ν_eff⌋); P00 dagi ν > 5000 → normal sakrashi olib tashlandi (R-03). ν_eff = ∞ → aniq normal kvantil. Natija: `excel-term-p2` (ν_eff 1438), `-p3` (5279), `-p5` (3416) da k va U Excel'dan +8,7·10⁻⁴ / +2,4·10⁻⁴ / +3,7·10⁻⁴ nisbiy farq qiladi (Excel ν ≥ 1000 da z ishlatadi). Bu testlarda k, U toleransi 1e-3, sababi testda yozilgan. *Eslatma:* egasi faqat p2 va p5 ni ko'rsatgan; p3 ham xuddi shu sababga ko'ra (ν_eff = 5279; P00 da ν > 5000 bo'lgani uchun z ishlatilardi) farq qiladi — shu qoida qo'llandi. **Ko'rinish (`expectedDisplay`) uchala nuqtada o'zgarmadi.**
- **Normal kvantil (D-01):** Abramowitz–Stegun 7.1.26 o'rniga Wichura AS241: `NORMSINV(0,97725)` = 2,000 002 443 899 6 (1e-12). `excel-gas-p1`, `-term-p1`, `-term-p4` da k va U endi Excel bilan 1e-9 da mos.
- **t-kvantil:** stabil ln B(a, b) + to'liqmas beta (ν < 2000), Cornish–Fisher (ν ≥ 2000); 1 ≤ ν ≤ 200, P ∈ {0,95; 0,9545; 0,99; 0,9973} da mustaqil mpmath jadvalidan xato < 1e-11 (talab 1e-6). ν_eff dagi 10⁶ cheklovi olib tashlandi.
- **c_i (D-07):** simvolik hosila (AST); sonli hosila — zaxira va o'zaro tekshiruv, qadam h = ε^⅓·max(|x|, u). `jcgm100-h1` da c_d = 1 (1e-12). 11 ta shablonda u_c P00 dan ≤ 1·10⁻¹⁰ nisbiy farq qiladi (sonli hosila xatosi yo'qoldi).
- **Xatolar:** manfiy dispersiya → `negative_variance`; |r| > 1 → `bad_correlation` (R-08; P00 da jimgina 0 ga kesilardi).
- **Yangi (standartda o'chiq / natijaga ta'sir qilmaydi):** 2-tartibli hadlar (GUM 5.1.2 Note) — diagnostika va `nonlinear` ogohlantirishi, `settings.secondOrder` bilan qo'shiladi (GUM H.1.7: u_c 32 → 34 nm); ν kasr qoidasi `floor` (standart) / `interpolate` / `exact`; birliklar va o'lchamlik tahlili (`units.js`, kirish birliklari berilganda); yangi ogohlantirishlar `c_zero`, `c_nan`, `c_numeric`, `c_mismatch`, `nu_lt1`, `unit_*`.

Yaxlitlash `src/report/rounding.js` ga ko'chirildi (hisobot qatlami), egasi qoidalari bilan:

- **ROUNDUP dan keyin 2 qiymatli raqam:** 0,0999 → **0,10** (P00: 0,100). 9 ta etalon nuqtaning birortasida bu holat yuzaga kelmaydi — ko'rinish o'zgarmadi.
- **y — round half away from zero:** −0,125 → **−0,13** (P00: `Math.round` → −0,12). 9 ta etalon nuqtaning birortasida bu holat yuzaga kelmaydi — ko'rinish o'zgarmadi.

Etalon nuqtalar ko'rinishi: 9 ta Excel nuqtasining `expectedDisplay` (U, y) qiymatlari **o'zgarmadi**; 11 ta shablon va ularning 8 ta saqlangan nuqtasi brauzerda P00 bilan bir xil ko'rinadi; P00 da saqlangan nuqtalar ochiladi (natija qayta yaxlitlanadi).

Boshqa: `src/js/calc.js` — `<script type="module">` moslik qatlami (`window.Calc`); `src/js/i18n-engine.js` (yangi matnlar 3 tilda); `tests/engine/*.test.js`; `tests/security/engine.sha256.json` (`calc.sha256.json` o'rniga).

## [Unreleased] — P01: test poydevori va manbadan tekshirilgan misollar (2026-11-13)

**ENGINE_VERSION: 1.0.0** — birinchi qayd etilgan versiya. Bu P00 dagi `src/js/calc.js` ning hisoblash mantig'i. P01 hisoblashni **o'zgartirmaydi**: faqat `ENGINE_VERSION` konstantasi qo'shildi. Etalon nuqtalar ko'rinishi o'zgarmadi.

- `tests/cases/**.json` — 36 ta test misoli:
  - verified: 31 ta. Ular 9 ta Excel nuqtasi, 10-test (MC, ikki tolerans varianti) va JCGM 100 H.1/H.2, JCGM 101 §9.2–9.5, EA-4/02 S2/S3, QUAM A1 misollari.
  - pending: 4 ta.
  - unverified: 1 ta.
- `tests/run-cases.test.js` — misollarni ishga tushiruvchi; ma'lum farqlar todo sifatida (D-01…D-05).
- `tests/fixture-refs.test.js` — kutilgan qiymatlar, kirish ma'lumotlari va iqtiboslar asl Excel/docx fayllari bilan har `npm test` da qayta solishtiriladi (`exceljs`, `jszip` — faqat devDependency).
- `tests/i18n.test.js`, `tests/presets.test.js`.
- `tests/cases/DISCREPANCIES.md`, `docs/VALIDATION_MATRIX.md`, `.github/workflows/test.yml`.
- `tests/verify-excel.js` — sarlavhadagi fixture fayl nomi tuzatildi.

Ma'lum farqlar (tuzatilmagan, P03 da egasi qaroridan keyin): normal kvantil approksimatsiyasi −1,9·10⁻⁸ (D-01); k tanlash chegarasi 1000 va 5000 (D-02); Excel ν_B = 10⁹ konventsiyasi (D-03); MC intervali n_dig = 2 da (D-04).

## P02 — xavfsizlik (2026-11-13)

Hisoblash dvigateliga tegilmagan (ENGINE_VERSION yo'q edi; natijalar P00 bilan bir xil).
