# Akkreditatsiya eksperti uchun savol-javoblar

> Ruscha nusxa: [ASSESSOR_FAQ.ru.md](ASSESSOR_FAQ.ru.md) (asosiy matn — o'zbekcha; farq bo'lsa shu hujjat amal qiladi).
> **Holat:** `ENGINE_VERSION` 2.10.0, P14 (2026-11-20).
> Javoblar faqat repoda haqiqatan mavjud narsani tavsiflaydi; har birida tekshirish mumkin bo'lgan havola bor (kod fayli`::`funksiya, test fayli, misol ID si yoki hujjat bo'limi). Yo'q narsa "qilinmagan" yoki "rejalashtirilgan" deb yozilgan va [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) ga havola qilingan (KL-ID).
> Savollarning bir qismi `docs/audit/gemini-audit-2026-11.md` §8.2 dagi "ekspert odatda beradigan savollar" dan olingan. O'sha hisobotdagi **javoblar va raqamlar** bu yerga ko'chirilmagan (ular unverified; bir qismi o'sha paytda mavjud bo'lmagan imkoniyatlarni tavsiflagan).
> ISO/IEC 17025:2017 repoda yo'q (pullik) — uning bandlariga havolalar **(unverified)**; bu hujjat standart matnidan iqtibos keltirmaydi.

Mundarija: [A. Validatsiya](#a-validatsiya-va-test-misollari) · [B. Hisob](#b-hisob-formulalar-yaxlitlash-k) · [C. Himoya qoidalari](#c-himoya-qoidalari-mpe-u--0-cmc-qaror-qoidasi) · [D. Monte-Karlo va brauzerlar](#d-monte-karlo-va-brauzerlar) · [E. Versiya va qayta tiklash](#e-versiya-ozgarishlar-qayta-tiklash) · [F. Ma'lumotlar va huquqlar](#f-malumotlar-va-kirish-huquqlari) · [G. Laboratoriya va cheklovlar](#g-laboratoriyaning-vazifasi-va-cheklovlar) · [H. AI yordamchi](#h-ai-yordamchi)

---

## A. Validatsiya va test misollari

### 1. Dastur hisob-kitobni to'g'ri bajarishi qanday tasdiqlangan?

Uch qatlamda. (1) **OQ — avtomatik testlar:** `npm test` har bir push va PR da CI da ishlaydi (`.github/workflows/test.yml`); manba misollari `tests/cases/**.json` (90 verified, 2 unverified) `tests/run-cases.test.js` orqali; 9 ta etalon Excel nuqtasi va 10-test (MC intervali). (2) **Hisobot:** `scripts/validation-report.js` test natijalaridan `validation-report.html` va `.json` yaratadi (CI artifact; saytda `validation/` papkasi). (3) **PQ** — laboratoriyaning o'z metodikasidagi parallel hisobi ([PQ_PROTOCOL_TEMPLATE.md](PQ_PROTOCOL_TEMPLATE.md)); buni platforma laboratoriya o'rniga bajarmaydi. Reja — [VALIDATION_PLAN.md](VALIDATION_PLAN.md) §4–5.

### 2. Qaysi talab qaysi kod va test bilan qoplangan?

Talablar `docs/validation/REQUIREMENTS.md` da (ID: `REQ-<SOHA>-NNN`), talab → kod → test xaritasi `rtm.map.json` da; `scripts/rtm.js` ulardan [RTM.md](RTM.md) ni yaratadi. Kod yoki testga bog'lanmagan talab `npm test` ni yiqitadi (`tests/validation/rtm.test.js`). Batafsil, P01 dan beri yuritilgan matritsa — `docs/VALIDATION_MATRIX.md` (holat belgilari: verified / ma'lum farq / pending / unverified).

### 3. Formulalar qayerdan olingan?

Har bir formula va qoida ustida kodda manba izohi bor (masalan `src/engine/evaluate.js`: "Welch–Satterthwaite … Ref: JCGM 100:2008 G.4.1 Eq. (G.2b), G.4.2"). Manbalar `docs/references/` da: JCGM 100:2008, JCGM 101:2008, JCGM 102:2011, JCGM 106:2012, EA-4/02 M:2022, ILAC P14:09/2020, ILAC G8:09/2019, ILAC P10:07/2020, ILAC G24 / OIML D 10:2022, EURACHEM/CITAC QUAM:2012, UfS:2019, AQA:2021, Nordtest TR 537 ed. 4, NIST/SEMATECH e-Handbook bo'limlari. Repoda yo'q hujjatga tayangan kod "(unverified)" deb belgilangan — ro'yxati KL-001…KL-006.

### 4. Test misollarining kutilgan qiymatlari qayerdan?

Faqat asl manbadan: `docs/references/` dagi hujjat (sahifa / jadval havolasi bilan) yoki `tests/fixtures/` dagi laboratoriya Excel'i va qo'llanmalari (katak havolasi / iqtibos bilan). `tests/fixture-refs.test.js` har safar kutilgan qiymatni Excel katagi yoki `.docx` iqtibosidan qayta o'qib solishtiradi — qo'lda ko'chirish xatosini istisno qilish uchun. Tashqi audit hisoboti (`docs/audit/gemini-audit-2026-11.md`) dagi raqamlar test qiymati sifatida **ishlatilmagan**; ularning manba bilan solishtiruvi — `tests/cases/DISCREPANCIES.md` C bo'limi. Qoida — [CHANGE_CONTROL.md](CHANGE_CONTROL.md) §5.

### 5. Manba bilan farq topilsa nima qilinadi?

Farq `tests/cases/DISCREPANCIES.md` ga ID bilan yoziladi (D-01…D-22) va uch toifadan biriga kiritiladi: dvigatel xatosi (tuzatiladi — masalan D-01 normal kvantil, D-07 sonli hosila), manba nuansi (masalan D-11 — GUM Table G.2 dagi bitta katak, D-21 — JCGM 102 dagi bosma xato), yoki egasi qarori kerak bo'lgan konventsiya (Q-1…Q-8). Hozir todo holatida ikkitasi: D-03 va D-05 (KL-010, KL-011) — ikkalasi ham yaxlitlangan natijani o'zgartirmaydi. Tolerans "o'tkazish uchun" kengaytirilmaydi; sababi har bir misolda `tolerance.*.reason` da.

### 6. Etalon Excel fayllari bilan moslik qanday?

9 nuqta: zichlik 1 (`excel-density`), gazoanalizator 3 (`excel-gas-p1…p3`), termometr 5 (`excel-term-p1…p5`) — `tests/cases/excel/`. Yaxlitlangan ko'rinish (y ± U) hamma nuqtada Excel katagidagi bilan mos (`tests/engine/rounding.test.js`: "9 ta Excel nuqtasining ko'rinishi"). Xom qiymatlarda ma'lum farqlar: katta ν_eff da Excel normal kvantilga o'tadi, dvigatel har doim t(⌊ν_eff⌋) ishlatadi (egasi qarori Q-1(a); D-02, KL-012). Termometr kuzatuvlari — o'quv namunasi, real laboratoriya ma'lumoti emas (`tests/fixtures/README.md`).

### 7. Mustaqil dasturlar bilan solishtirilganmi?

Qisman. Kvantillar mustaqil hisob (mpmath) jadvali bilan tekshirilgan (`tests/engine/quantiles.test.js`, `tests/tools/gen-t-quantiles.py`). **NIST Uncertainty Machine** bilan o'zaro tekshiruv uchun 5 misolning kirish ma'lumotlari tayyor (`tests/crosscheck/num/`), lekin natijalar hali olinmagan — holat `pending` (KL-170). **PTB TraCIM** — qilinmagan, rejalashtirilgan (KL-171).

---

## B. Hisob: formulalar, yaxlitlash, k

### 8. Oraliq hisoblarda yaxlitlash xatosi to'planmaydimi?

Dvigatel (`src/engine/`) hech narsani yaxlitlamaydi — barcha oraliq qiymatlar to'liq aniqlikda saqlanadi. Yaxlitlash faqat hisobot qatlamida: `src/report/rounding.js::roundResult`. Saqlangan eski natijalardagi yaxlitlangan matn e'tiborga olinmaydi — hisobot har safar qayta yaxlitlaydi. Eksportda sonlar yaxlitlanmaydi (`docs/RISKS.md`, P05b natijasi, R-04).

### 9. Natija qanday yaxlitlanadi?

Egasi qabul qilgan qarorlar (`CLAUDE.md`): U — ko'pi bilan 2 ta qiymatli raqam (ILAC P14:09/2020 §5), yuqoriga yaxlitlangandan keyin ham 2 ta qoladi: 0,0999 → 0,10 (0,100 emas); y — U ning oxirgi xonasigacha, round half away from zero (Excel `ROUND` bilan mos): −0,125 → −0,13. Kod: `src/report/rounding.js::roundHalfAway`, `roundUpAway`, `roundResult`; testlar: `tests/engine/rounding.test.js` (har ikki qaror alohida test).

### 10. ν_eff kasr chiqsa k qanday olinadi?

Standart qoida — `floor`: k = t_P(⌊ν_eff⌋), chegarasiz (katta ν_eff da ham normalga "sakrash" yo'q); ν = ∞ da aniq normal kvantil. `interpolate` — ixtiyoriy laboratoriya sozlamasi. Qo'llanilgan qoida hisobotda yoziladi (Ref: JCGM 100:2008 G.4.1 Note 1). Kod: `src/engine/coverage.js::coverageFactor` (`DEFAULT_NU_RULE = 'floor'`), kvantillar — `src/engine/special.js`; test: `tests/engine/quantiles.test.js` (jumladan JCGM 100 Table G.2 va uzluksizlik / monotonlik). Egasi qarori — `tests/cases/DISCREPANCIES.md` Q-1.

### 11. Sezgirlik koeffitsiyentlari qanday hisoblanadi? Nochiziqli modelda xato bermaydimi?

c_i — formulaning simvolik hosilasi (`src/engine/sensitivity.js::sensitivities`); sonli hosila faqat zaxira va o'zaro tekshiruv. c = 0 yoki NaN jimgina yutilmaydi — `c_zero` / `c_nan` topilmasi chiqadi. 2-tartibli hadlar (JCGM 100:2008 §5.1.2 Note) hisoblanadi (`secondOrderTerms`) — standartda diagnostika sifatida, `nonlinear` ogohlantirishi bilan; test: `tests/engine/second-order.test.js`, `jcgm100-h1-2nd` (GUM H.1.7). Cheklov: 2-tartibli hadlar faqat normal, korrelyatsiyasiz kirishlarda haqiqiy (KL-014). Mustaqil tekshiruv uchun Monte-Karlo bor (18–19-savollar).

### 12. Birliklar aralashib ketmaydimi?

O'lchamlik tahlili va birlik konvertatsiyasi bor: `src/engine/units.js::analyzeDimensions`, `convert`; linter qoidasi X6 (`src/engine/linter/rules/x06-units.js`); test: `tests/engine/units.test.js`. Cheklovlar: kirish birliklarini kiritish uchun UI maydoni yo'q — birliklar shablon yoki API orqali beriladi (KL-015); manba (JCGM GUM-6) repoda yo'q — bu qism unverified (KL-002).

### 13. Foydalanuvchining metodologik xatolarini dastur ushlaydimi?

Tipik xatolar uchun linter bor: `src/engine/linter/` (har bir qoida alohida modul — X1–X12, A1–A4, M1–M4, D1, L1–L2, MV1–MV2), natija `result.findings` da; qoidalar va manbalari — `docs/LINTER_RULES.md`; testlar: `tests/engine/linter.test.js` (har bir qoida uchun ijobiy va salbiy holat). Chegaralar me'yoriy talab emas — loyiha qarorlari, egasi tasdiqlagan (`docs/LINTER_RULES.md` §4; KL-110); ayrim qoidalar manba nomiga tayangan evristika (KL-112). Linter modelning to'g'riligini kafolatlamaydi.

---

## C. Himoya qoidalari: MPE, U = 0, CMC, qaror qoidasi

### 14. Kalibrlanayotgan asbobning MPE'si noaniqlik byudjetiga tushib qolmaydimi?

Dastur MPE'ni hech qachon avtomatik noaniqlik manbai qilmaydi (`CLAUDE.md`, metrologik qoidalar): MPE faqat muvofiqlikni baholashda ishlatiladi. Foydalanuvchi uni qo'lda B tur manba sifatida kiritsa, linter X1 ogohlantiradi (`src/engine/linter/rules/x01-mpe-in-budget.js`, kod `x1_mpe_in_budget`; test `tests/engine/linter.test.js`). Etalonlar reestridagi `limit` (MPE / tolerans) faqat kalibrlash intervali tavsiyasi uchun — manba sifatida taklif qilinmaydi.

### 15. U = 0 yoki U < CMC bo'lgan natija sertifikatga chiqib ketmaydimi?

Ogohlantirishsiz chiqmaydi. `zero_u` va `below_cmc` — `error` darajasidagi topilmalar (`src/engine/linter/rules/x08-zero-uncertainty.js`; `below_cmc` — ILAC P14:09/2020 §5.5). Qabul qilinmagan `error` bo'lsa hisobot "RASMIY EMAS" belgisi bilan chiqadi; laboratoriya sozlamasi `criticalMode: 'block'` da hisobot umuman chiqmaydi (`src/report/sections.js`). Barcha topilmalar bosma hisobotda ham chiqadi — yashiradigan parametr yo'q (`tests/ui/findings.test.js`). **Dastur U ni CMC bilan almashtirmaydi** — qaror laboratoriyada. CMC jadvali: `src/engine/lab/cmc.js::cmcAt` (`tests/engine/lab.test.js`).

### 16. Ogohlantirishni e'tiborsiz qoldirish mumkinmi?

Faqat asos bilan. Warning / error topilmasi kamida 10 belgili izoh bilan qabul qilinadi; qabul audit zanjiriga yoziladi (rol, vaqt, topilma ID si, izoh; shaxsiy ma'lumot yozilmaydi): `src/storage/acceptance.js::acceptFinding`, `MIN_COMMENT`; test `tests/storage/acceptance.test.js`. Qabul qilingan topilma ham hisobotda ko'rinadi.

### 17. Muvofiqlik bayonoti qanday beriladi? Qaror qoidasi bormi?

`src/engine/decision.js::decide` → `result.decision`: oddiy qabul, himoya zonasi w = r·U, TUR = T / (2U), muvofiqlik ehtimoli p_c (normal taqsimot), bir / ikki tomonlama chegaralar, binar / nobinar bayonot (JCGM 106:2012 §7–8, ILAC G8:09/2019); test: `tests/engine/decision.test.js` (sahifa havolali misollar). **Qaror qoidasi yoki chegara ko'rsatilmagan bo'lsa bayonot berilmaydi**; laboratoriya sozlamasi yoki shablondagi qoida tanlov oynasiga oldindan qo'yiladi, lekin foydalanuvchi tasdiqlamaguncha qo'llanmaydi (`decisionPreset`). Model turi (`settings.modelKind`) ko'rsatilmagan bo'lsa ham bayonot yo'q — dastur |y| ni xato deb faraz qilmaydi. Cheklovlar: KL-111, KL-114.

---

## D. Monte-Karlo va brauzerlar

### 18. Monte-Karlo qaysi generator bilan ishlaydi?

Kengaytirilgan Wichmann–Hill (JCGM 101:2008 C.3.3): `src/engine/mc/rng.js` (`RNG_DEFAULT = 'wichmann-hill-2006'`); taqsimotlar JCGM 101 §6.4 bo'yicha — `src/engine/mc/distributions.js`; adaptiv protsedura §7.9.4 va §8 GUM tekshiruvi — `src/engine/montecarlo.js::monteCarlo`. Testlar: `tests/engine/mc-rng.test.js` (Table C.2 konstantalari, aniq arifmetika bilan tenglik), `mc-distributions.test.js`, `montecarlo.test.js`; manba misollari — JCGM 101 §9.2–9.5 (`tests/cases/jcgm101/`). Generator sifati bo'yicha TestU01 BigCrush o'tkazilmagan — manba bayoniga tayanilgan (KL-023).

### 19. Monte-Karlo natijasi takrorlanadimi?

Ha — urug' (seed) aniq: standart 20261110 (`MC_SEED`), o'zgartirish mumkin; generator nomi, urug', M va erishilgan tolerans natijada (`rng: { name, seed }`, `M`) va hisobotda yoziladi. Bir xil muhitda bir xil urug' va M — bit darajasida bir xil natija (`tests/engine/mc-rng.test.js`: muzlatilgan qiymatlar). ENGINE ≤ 2.5.0 dagi eski natijalar `rng: 'xorshift32-legacy'` bilan aynan takrorlanadi (`tests/engine/mc-legacy.test.js`). Turli brauzerlar — keyingi savol.

### 20. Turli brauzerlarda natija bir xilmi?

R(0, 1) ketma-ketligi hamma joyda bit darajasida bir xil (faqat IEEE 754 arifmetikasi). Lekin `Math.log` / `sin` / `cos` turli JS dvigatellarida oxirgi ikkilik xonada farq qilishi mumkin, shuning uchun Gauss kirishli MCM ning **xom** qiymatlari ≈ 10⁻¹⁶ nisbiy farq qiladi (`docs/RISKS.md` R-24, o'lchov 2026-11-18). Egasi qarori B (2026-11-19): xom qiymatlarda nisbiy farq ≤ 1·10⁻¹⁴ qabul qilinadi; **hisobotdagi yaxlitlangan y, U, k va interval uchlari aynan bir xil bo'lishi shart**; dvigatelga o'z log / sin / cos nusxasi qo'shilmaydi. Tekshiruv: `tests/crossbrowser/` (Playwright — Chromium, Firefox, WebKit; CI da alohida job); o'lchangan farq validatsiya hisobotida. **Amaldagi o'lchov (Node 22.23 ↔ Chromium 157, 2026-11-19):** 91 misol, 28 807 ta sondan 242 tasi farq qiladi; yaxlitlangan farq — 0; 14 ta shartlanganligi yomon hosila qiymat (4 ta JCGM 102 misolida: deyarli singular kovariatsiya matritsasining eng kichik xos qiymati va k_p, nolga yaqin korrelyatsiya, sonli hosila tekshiruvi) 1·10⁻¹⁴ dan oshadi (maks. 3,4·10⁻¹¹) — ular aniq istisnolar ro'yxatida (`tests/crossbrowser/exceptions.json`), qolganlari bo'yicha maks. 9,8·10⁻¹⁵. Istisnolar ro'yxati egasi tasdig'ini kutadi (`docs/RISKS.md` R-27 (1)). Firefox va WebKit o'lchovlari — validatsiya hisobotining 4-bo'limida. Safari (macOS / iOS) avtomatik tekshirilmaydi — laboratoriya PQ da (KL-150…KL-152).

### 21. Qaysi brauzerda hisoblangani ma'lum bo'ladimi?

Ha. Hisob hujjati (`uc-calc/1`) va bosma hisobotga hisoblagan muhit — brauzerning qisqa nomi va versiyasi — hamda build yoziladi (`src/io/env.js::describeEnvironment`). To'liq userAgent satri saqlanmaydi (minimallashtirish); bu ma'lumot Firebase'ga yozilmaydi.

---

## E. Versiya, o'zgarishlar, qayta tiklash

### 22. Dastur yangilansa, hisob natijasi sezdirmasdan o'zgarib qolmaydimi?

Hisobga ta'sir qiladigan har qanday o'zgarish `ENGINE_VERSION` ni (`src/engine/version.js`) oshiradi va `CHANGELOG.md` da "natijaga ta'siri" bilan yoziladi. Buni mexanik nazorat qiluvchi test bor: `src/engine/` va `src/report/` fayllarining SHA-256 xeshi `tests/security/engine.sha256.json` bilan solishtiriladi (`tests/security/static.test.js`; `tests/tools/engine-hash.js`) — kod o'zgarsa-yu xesh yangilanmasa, `npm test` yiqiladi. Har bir versiyada `tests/cases/` natijalari oldingi versiya bilan bit darajasida solishtiriladi (`scripts/cases-snapshot.js`). To'liq tartib — [CHANGE_CONTROL.md](CHANGE_CONTROL.md). Sayt yangilanishini laboratoriya boshqarmaydi; yangi versiyada PQ ni takrorlash qarori — laboratoriyada.

### 23. Saytda aynan qaysi versiya ishlayotganini qanday bilaman?

Deploy GitHub Actions orqali (`scripts/build-site.js`, `.github/workflows/deploy.yml`): saytda `build.json` (`commit`, `shortSha`, `engineVersion`, `engineHash`, `builtAt`, `node`), har bir modul havolasida `?v=<shortSha>`. Bosma hisobot pastki qismida dastur nomi, `ENGINE_VERSION`, build, shablon, hisob ID / sana, xesh va QR chiqadi (`src/report/footer.js::footerModel`). Yangi versiya chiqsa brauzerda banner ko'rinadi (sahifa avtomatik qayta yuklanmaydi). Egasining sozlash qadami — `docs/DEPLOY.md` (KL-160): Pages manbasi "GitHub Actions" ga o'tkazilmaguncha sayt branch'dan build qadamisiz chiqadi — `build.json` yo'q, hisobotda build o'rnida dvigatel xeshi "dev" belgisi bilan ko'rsatiladi.

### 24. Eski hisobni qayta tiklab, tekshirish mumkinmi?

Ha. Hisob `uc-calc/1` hujjatiga eksport qilinadi: kirishlar, natija, topilmalar, shablon ID / versiyasi, `ENGINE_VERSION` va kanonik xesh (RFC 8785 JCS + SHA-256) — `src/io/calc-json.js::buildCalcDoc`, `src/storage/canonical.js::jcsHash`. Import paytida xesh tekshiriladi (o'zgartirilgan fayl rad etiladi) va natija qayta hisoblab solishtiriladi (`reproduce`). Test: `tests/io/calc-json.test.js` — barcha manba misollarida eksport → import → qayta hisob bit darajasida bir xil. Bosma hisobotdagi xesh va QR shu hujjatga tegishli. Cheklovlar: xesh hujjat rekvizitlarini qamramaydi (KL-117); MCM natijasi boshqa brauzerda xom qiymatda farq qilishi mumkin (KL-150); ochiq `/verify` sahifasi — qilinmagan (KL-120, P15).

### 25. Tasdiqlangan metodika formulasini xodim tasodifan o'zgartirib qo'ya oladimi?

Shablon holatlari: DRAFT → REVIEWED → APPROVED → RETIRED (`src/templates/interpreter.js::transition`). APPROVED shablonda model, chiqishlar, variantlar, konstantalar, kirishlar, B tur manbalari, korrelyatsiyalar va o'lchanadigan kattalik qulflanadi (`DEFAULT_LOCKED`, `lockedSections`); testlar — `tests/templates/`. Har bir hisob shablon ID va versiyasi bilan saqlanadi. Cheklovlar: barcha ichki shablonlar hozir DRAFT — APPROVED qilish laboratoriyaning ishi (`docs/templates/APPROVAL_CHECKLIST.md`; KL-123); BETA rejim shablonlari APPROVED bo'la olmaydi; lokal rejimda rol himoyasi ogohlantirish darajasida (KL-086, KL-132).

### 26. Yozuv tuzatilsa, dastlabki qiymat va kim tuzatgani ko'rinadimi?

Saqlash qatlamida (IndexedDB) har bir saqlash va o'chirish append-only audit yozuvini qo'shadi: tartib raqami, vaqt, aktyor (rol), amal, avvalgi va yangi qiymat, sabab, oldingi yozuv xeshi (`src/storage/audit.js::makeEntry`, `verifyChain`). Test: `tests/storage/storage.test.js` — yozuv o'zgartirilsa yoki o'chirilsa aniqlanadi. **Cheklovlar:** audit foydalanuvchi brauzerida — u buzilishni *aniqlaydi*, oldini olmaydi (KL-131); aktyor maydoniga reestr, topilmani qabul qilish va P12 yozuvlarida shaxs ismi emas, rol yoziladi (`cleanRole`); shablon muharririda esa foydalanuvchi o'zi kiritgan qiymat yoziladi (`src/ui/tpl/app.js::persist` — "Kim (login yoki rol, ism emas)" deb nomlangan erkin matn maydoni: dastur ism kiritilishini texnik jihatdan cheklamaydi; yozuv faqat shu brauzerning IndexedDB sida qoladi, Firebase'ga yuborilmaydi — `docs/RISKS.md` R-27 (6)); joriy sessiya holati hali `localStorage` da (KL-130); regressiya / top-down / maxsus rejim holatlari audit izisiz (KL-055, KL-064, KL-076). Server tomonidagi o'zgarmas audit — rejalashtirilgan (P15, KL-173).

---

## F. Ma'lumotlar va kirish huquqlari

### 27. Ma'lumotlar qayerda saqlanadi? Brauzer tozalansa yo'qoladimi?

Hisoblar, shablonlar, reestr, QC, PT va validatsiya ma'lumotlari foydalanuvchining brauzerida saqlanadi (IndexedDB — `src/storage/`; ayrim holatlar `localStorage` da). Serverda saqlash va markaziy zaxira **yo'q** — brauzer ma'lumotlari tozalansa, eksport qilinmagan ma'lumot yo'qoladi. Zaxira vositasi — eksport: bitta hisob (`uc-calc/1`) va to'liq eksport / import (`src/storage/export.js::exportAll`, `importAll`; test `tests/storage/storage.test.js`: eksport → bo'sh bazaga import → eksport bit darajasida bir xil). Eski `localStorage` ma'lumotlari migratsiya bilan yangi formatga o'tkaziladi (`src/storage/migrate.js`). Zaxira tartibi — laboratoriya javobgarligi; server — rejalashtirilgan (KL-134, KL-173).

### 28. Shaxsiy ma'lumotlar qayerda? Hisob ma'lumotlari tashqariga chiqadimi?

Hisob ma'lumotlari serverga yuborilmaydi: `src/io/` da tarmoq chaqiruvi yo'qligi statik test bilan tekshiriladi (`tests/io/import.test.js`); reestr, QC, PT ma'lumotlari Firebase'ga yozilmaydi. Firebase faqat ro'yxatdan o'tish, tashkilotlar va to'lov uchun; qaysi shaxsiy maydon qayerda saqlanishi — `docs/DATA_RESIDENCY.md` §2. Hisobotdagi shaxs ismlari (buyurtmachi, tasdiqlovchi) faqat `sessionStorage` da, laboratoriya rekvizitlari — `localStorage` da. Yangi shaxsiy maydon qo'shilmaydi (`CLAUDE.md`). Ma'lumotlarni O'zbekistondagi serverga ko'chirish zaruriyati yuridik qayta baholanadi (KL-144). Qoldiq: Google Fonts tashqi so'rovi (KL-142).

### 29. Kirish huquqlari qanday boshqariladi?

Autentifikatsiya — Firebase Authentication; parollar faqat Auth'da, mijoz kodida login / parol yo'q; super-admin — Auth custom claim. Firestore qoidalari repoda (`firestore.rules`: default deny, a'zolik bo'yicha o'qish) va Emulator testlari bilan tekshiriladi (`npm run test:rules`, `tests/security/firestore-rules.test.js`); statik tekshiruvlar — `tests/security/static.test.js` (inline skript yo'q, CSP `script-src 'self'`), XSS — `tests/security/xss.test.js`, `src/ui/escape.js::escHtml`. Lokal ma'lumotlarda rol: etalon va CMC ni `employee` tahrirlay olmaydi (`src/storage/registry.js::canEditRegistry`), P12 da chiqarish / o'chirish — admin (`src/storage/quality.js::canQuality`). **Muhim:** konsol amallari (qoidalarni joylash, Auth, claim, migratsiya) egasi tomonidan `docs/SECURITY_SETUP.md` bo'yicha bajariladi — bajarilgani bu paketda tasdiqlanmaydi (KL-140); lokal rejimda rol himoyasi ogohlantirish darajasida (KL-086).

### 30. Foydalanuvchi brauzer vositalari bilan natijani o'zgartirib, soxta hisobot chop eta oladimi?

Texnik jihatdan — ha: hisob va hisobot to'liq foydalanuvchi brauzerida shakllanadi, server tomonida mustaqil qayta hisob yo'q. Mavjud aniqlash vositasi: `uc-calc/1` hujjati va undagi kanonik xesh — fayl import qilinsa natija qayta hisoblanadi va hisobotdagi xesh / qiymatlar bilan solishtiriladi (24-savol). Server tomonidagi qayta hisob, tasdiqlash va ochiq tekshirish sahifasi — rejalashtirilgan (P15, `docs/PLAN.md`; KL-173); elektron imzo — qilinmagan (KL-120).

### 31. Tashqi kutubxonalar nazorat qilinadimi?

Framework yo'q. Tashqi kutubxonalar faqat `vendor/` da, aniq versiya, litsenziya va SHA-256 bilan (`vendor/README.md`, `vendor/SHA256SUMS.txt`); CDN'dan skript yuklanmaydi. Test: `tests/security/vendor.test.js`. Hisoblash dvigateli tashqi kutubxonaga bog'liq emas — SheetJS va QR kutubxonasi faqat import / hisobot uchun, `src/io/vendor.js` orqali dinamik yuklanadi. Fayldan import: formulalar bajarilmaydi, hajm chegaralari `src/io/import.js::LIMITS` da. Yangilash qo'lda (KL-121).

---

## G. Laboratoriyaning vazifasi va cheklovlar

### 32. Laboratoriya o'zi nima qilishi kerak?

(1) Talablarini yozish va platformani ularga nisbatan baholash — [USER_REQUIREMENTS_TEMPLATE.md](USER_REQUIREMENTS_TEMPLATE.md). (2) PQ: o'z metodikasida platforma natijasini mustaqil hisob bilan solishtirish, o'z brauzerida (Safari bo'lsa — albatta) — [PQ_PROTOCOL_TEMPLATE.md](PQ_PROTOCOL_TEMPLATE.md). (3) Shablonni o'z metodikasi bo'yicha tekshirib tasdiqlash — `docs/templates/APPROVAL_CHECKLIST.md`. (4) Qaror qoidasi, model turi, CMC va ν qoidasini belgilash. (5) Eksport / zaxira tartibini yuritish. (6) Yangi versiyada `CHANGELOG.md` ni ko'rib, PQ ni takrorlash kerakligini hal qilish. Foydalanuvchi qo'llanmasi — `docs/manual/{uz,ru,en}.md`.

### 33. Qaysi qismlar tekshirilmagan yoki BETA?

Yagona ro'yxat — [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md). Asosiylari: mikrobiologiya va tibbiy laboratoriya rejimlari — BETA (natijada har doim ogohlantirish va belgi; KL-070, KL-071); regressiyada WTLS / GLS / polinom / "U — diapazon" (KL-050, KL-051); top-down ning ISO 21748 qismi (KL-060); PT ball formulalari va chegaralari, Cochran, LOD / LOQ (KL-090…KL-095); hisobot rekvizitlari ro'yxati (KL-116). Unverified funksiya natijasida va bosma hisobotda belgi chiqadi (masalan `topdown_unverified`, `cochran_unverified`). Egasi tasdig'ini kutayotgan loyiha qarorlari ham shu ro'yxatda ("tasdiq kutadi").

### 34. Pullik ISO standartlariga tayangan funksiyalar qanday tekshirilgan?

Pullik standartlar repoga joylanmaydi (`docs/references/README.md`). Bunday funksiyalar uchun test manbasi: ochiq manbalar (NIST, GTC / MSL), egasi bergan laboratoriya misollari yoki mustaqil qo'lda hisob. Manba aniq bo'lmaguncha funksiya `unverified` bo'lib qoladi: majburiy manba testi yo'q, faqat o'zaro / analitik tekshiruv; natijada belgi; BETA shablon APPROVED bo'la olmaydi (`src/templates/interpreter.js`, `tests/engine/special-modes.test.js`). ISO/IEC 17025:2017 ning o'zi ham repoda yo'q — unga barcha havolalar "(unverified)" (KL-001).

### 35. Dastur "ISO/IEC 17025 bo'yicha validatsiya qilingan" deb aytish mumkinmi?

Yo'q — bunday da'vo qilinmaydi. Mavjud narsa: ishlab chiquvchi tomonidagi hujjatlashtirilgan tekshiruv (talablar, RTM, avtomatik testlar, validatsiya hisoboti, o'zgarishlarni boshqarish, ma'lum cheklovlar ro'yxati). Laboratoriya sharoitida foydalanishga yaroqlilikni laboratoriyaning o'zi PQ bilan tasdiqlaydi. ISO/IEC 17025:2017 matni repoda yo'q, shuning uchun uning bandlariga muvofiqlik bu paketda tekshirilmagan (KL-001). Mustaqil (tashqi) ko'rib chiqish — rejalashtirilgan (KL-174).

---

## H. AI yordamchi

### 36. Dasturda sun'iy intellekt bormi? U natijaga ta'sir qiladimi?

Ixtiyoriy AI yordamchi bor, standart holatda **o'chiq** (`LAB_DEFAULTS.aiEnabled: false`; faqat laboratoriya admini yoqadi, o'zgarish audit izida). U hisoblamaydi va natijani o'zgartirmaydi: y, u_c, ν_eff, k, U ni faqat deterministik dvigatel (`src/engine/`) hisoblaydi; dvigatel va hisobot qatlami AI kodini bilmaydi, dvigatel xeshi va `ENGINE_VERSION` P14 da o'zgarmagan (`tests/security/static.test.js`, `tests/ui/ai.test.js`). AI faqat qoralama va matn taklif qiladi: shablon qoralamasi, sertifikatdan reestr yozuvi qoralamasi, topilmalarni tushuntirish, e'tibordan chetda qolgan manbalar ro'yxati (qiymatsiz). O'chiq holatda AI kodi umuman yuklanmaydi. To'liq tavsif — `docs/AI_DESIGN.md`.

### 37. AI qanday nazorat qilinadi? Uning xatosi hisobotga tushib qolmaydimi?

- **Inson tasdig'i:** har bir taklif alohida tasdiqlanadi; "hammasini tasdiqlash" tugmasi yo'q (kalibrlash nuqtalarida — qator bo'yicha). Tasdiqlanmagan qiymat shablonga, reestrga va hisobga kirmaydi (`src/ai/response.js::applyNumbers`, `certificateToCalibration`).
- **Raqam o'ylab topishga qarshi:** AI bergan har bir son manba parchasi bilan keladi; dastur parcha kirish matnida aynan borligini va son shu parchada uchrashini tekshiradi — aks holda qiymat rad etiladi (`evidenceProblem`; `tests/ai/response.test.js`). Rasmdan o'qilgan qiymatlarda bu tekshiruv yo'q — oynada ogohlantirish (KL-177).
- **Ishonchsiz javob:** javob qat'iy JSON va sxema bo'yicha tekshiriladi; ortiqcha maydon, HTML / skript, mos kelmaydigan birlik, kalibrlanayotgan asbobning MPE sini manba qilish taklifi — rad etiladi.
- **Belgilar:** AI qoralamasidan tuzilgan shablon `AI_DRAFT` holatida; u bilan bajarilgan hisob hisoboti "RASMIY EMAS" suv belgisi bilan chiqadi. `DRAFT` ga o'tkazish — metrolog izohi (≥ 10 belgi) bilan. AI izohi ekranda "AI izohi — rasmiy emas" belgisi bilan; bosma hisobotga faqat foydalanuvchi tanlasa, alohida ichki ilova sifatida. Sertifikat / protokolning rasmiy matni AI dan chiqmaydi.
- **Audit:** har bir AI amali (tayyorlash, nusxalash / yuborish, javob, har bir tasdiq / rad) audit zanjirida: rol, rejim, model, prompt versiyasi, yuborilgan matn va javobning SHA-256 xeshi (`src/storage/ai.js::aiAudit`). Matnning o'zi auditga yozilmaydi.

### 38. AI ga qanday ma'lumot yuboriladi? O'lchov natijalari va mijoz ma'lumotlari chiqib ketmaydimi?

Faqat tuzilma, ruxsat ro'yxati bo'yicha: model formulasi, kattalik belgilari va birliklari, manba va taqsimot turlari, linter topilma kodlari, hissalar tartibi (raqamsiz). O'lchov qiymatlari, natijalar, yarim kengliklar, mijoz, shaxs ismlari, laboratoriya rekvizitlari, sertifikat va akkreditatsiya raqamlari, hisob ID si yuborilmaydi; yuboriladigan obyektda son tipidagi qiymat bo'la olmaydi (`src/ai/payload.js::assertAllowed`). Bu barcha manba misollarida (9 etalon nuqta bilan) va "kanareyka" qiymatlar bilan tekshirilgan (`tests/ai/payload.test.js`). Istisno — foydalanuvchi o'zi yuklagan metodika yoki sertifikat matni: u faqat alohida tasdiq belgisi bilan yuboriladi va unda shaxs ismlari bo'lishi mumkin (KL-176). Yuborishdan oldin to'liq matn har doim ko'rsatiladi.

### 39. AI qaysi xizmatga ulanadi? Kalit qayerda saqlanadi?

Ikki rejim. **Nusxa-qo'y** (asosiy): dastur tarmoqqa chiqmaydi — foydalanuvchi matnni nusxalab o'zi tanlagan AI ga qo'yadi va javobni qaytaradi. **O'z kaliti** (ixtiyoriy): alohida `ai.html` sahifasi foydalanuvchining o'z Anthropic API kaliti bilan `api.anthropic.com` ga murojaat qiladi; bu manzilga ruxsat faqat shu sahifaning CSP sida, asosiy sahifalar CSP si o'zgarmagan (`tests/security/ai-csp.test.js`). Kalit faqat shu oynaning `sessionStorage` ida, oyna yopilganda o'chadi; doimiy xotiraga, IndexedDB ga, eksportga, auditga yozilmaydi (`tests/ai/key.test.js`). Bu rejimda ma'lumot chet eldagi xizmatga ketadi — sahifada ogohlantirish bor; yuridik baho laboratoriya tomonida (KL-175). Haqiqiy xizmat bilan avtomatik test yo'q — faqat mock (KL-182).
