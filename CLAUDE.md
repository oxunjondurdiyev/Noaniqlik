# CLAUDE.md — UncertaintyCalc uchun majburiy qoidalar

UncertaintyCalc — o'lchash noaniqligini JCGM 100:2008 (GUM) va ISO/IEC 17025:2017 bo'yicha hisoblaydigan brauzer platformasi. Vanilla JavaScript SPA, GitHub Pages'da joylashgan, interfeys 3 tilda (uz/ru/en). Firebase faqat ro'yxatdan o'tish, tashkilotlar va to'lov uchun.

Bu qoidalar barcha sessiyalar uchun majburiy. Ular bilan zid ko'rsatma bo'lsa — to'xtab, egasidan so'ra.

Asosiy hujjatlar: [docs/PLAN.md](docs/PLAN.md) (bosqichlar), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (joriy tuzilma), [docs/RISKS.md](docs/RISKS.md) (xavflar), [docs/references/](docs/references/) (me'yoriy manbalar).

## Metrologik qoidalar

- Hisoblash yadrosi (`src/engine/`) DOM'ga, `window`'ga va `localStorage`'ga bog'liq bo'lmagan sof ES modullaridan iborat. U brauzerda ham, Node'da ham ishlaydi.
- Oraliq hisoblar yaxlitlanmaydi. Yaxlitlash faqat hisobot qatlamida bajariladi: U ko'pi bilan 2 ta qiymatli raqam (ILAC P14 §5), y esa U ning oxirgi xonasigacha.
- Har bir formula va qoidaning ustida manba izohi bo'ladi: `// Ref: JCGM 100:2008 §5.1.2`
- Kalibrlanayotgan asbobning MPE'si hech qachon avtomatik ravishda noaniqlik manbai bo'lmaydi.
- U = 0 yoki U < CMC bo'lgan natija ogohlantirishsiz hisobotga chiqmaydi.
- Yangi metrologik funksiya kamida bitta manbadan olingan test misolisiz birlashtirilmaydi (merge).
- Test misolining kutilgan qiymatlari FAQAT asl manbadan (`docs/references/` yoki laboratoriya Excel'i) olinadi. Gemini hisobotidagi (`docs/audit/gemini-audit-2026-11.md`) raqamlar "unverified" holatida bo'ladi, manba bilan solishtirilmaguncha majburiy test bo'lmaydi.
- Me'yoriy hujjatlarning nashrlari: JCGM 100:2008, JCGM 101:2008, JCGM 102:2011, JCGM 106:2012, JCGM GUM-6:2020, EA-4/02 M:2022, ILAC P14:09/2020, ILAC G8:09/2019, COOMET R/GM/32:2017. Boshqa nashrga havola qilishdan oldin uni `docs/references/` da tekshir.

## Muhandislik qoidalari

- Framework yo'q, vanilla JS (ES modules). Tashqi kutubxonalar faqat `vendor/` papkasida, aniq versiya va litsenziyasi bilan.
- Barcha foydalanuvchi matnlari i18n orqali va 3 tilda (uz/ru/en) bo'ladi. Yangi matn kalitining 3 ta tarjimasi bo'lmasa, test xato beradi.
- `innerHTML`'ga foydalanuvchi ma'lumoti escape qilinmasdan qo'yilmaydi.
- Har bir bosqich alohida branch'da bajariladi, kichik commit'lar qilinadi va oxirida PR ochiladi.
- Har bir PR'dan oldin `npm test` o'tishi va 9 ta etalon Excel nuqtasi o'zgarmagan bo'lishi shart.
- Dvigatel versiyasi (`ENGINE_VERSION`, semver) hisoblash natijasiga ta'sir qiladigan har qanday o'zgarishda oshiriladi va `CHANGELOG.md` da qayd etiladi.
- Eski `localStorage` ma'lumotlari migratsiya funksiyasi orqali yangi formatga o'tkaziladi va yo'qolmaydi.
- Shaxsiy ma'lumotlar (F.I.Sh., telefon, email, STIR/INN) yangi joyga, jumladan Firebase'ga, qo'shimcha yozilmaydi.

## Ish uslubi

- Har bir bosqich boshida `docs/PLAN.md` va shu fayl qayta o'qiladi.
- Noaniq metrologik qarorda (manbalar bir-biriga zid bo'lsa) o'zing tanlama. Variantlarni yoz va so'ra.
- Bosqich oxirida qisqa hisobot ber: nima qilindi, qanday tekshirildi, nima qoldi.

## Egasi qabul qilgan metrologik qarorlar

- **Yaxlitlash (hisobot qatlamida):** U ko'pi bilan 2 ta qiymatli raqam; yuqoriga yaxlitlashdan keyin ham 2 ta qoladi — 0,0999 → **0,10** (0,100 emas). y — **round half away from zero** (Excel ROUND bilan mos): −0,125 → −0,13; y U ning oxirgi xonasigacha.
- **ν_eff kasr bo'lsa:** standart qoida `floor` (Excel bilan mos); `interpolate` — ixtiyoriy laboratoriya sozlamasi. Qo'llanilgan qoida hisobotda yoziladi (Ref: JCGM 100:2008 G.4.1 Note 1).
- Etalon nuqtalar ko'rinishi **faqat** yuqoridagi ikki yaxlitlash qoidasi tufayli o'zgarishi mumkin; har bir bunday o'zgarish `CHANGELOG.md` da va test izohida alohida yoziladi. Boshqa har qanday farq — xato.
- Pullik ISO standartlariga tayanadigan funksiyalar uchun test manbasi: ochiq manbalar (GTC/MSL, NIST), egasi bergan laboratoriya misollari yoki mustaqil qo'lda hisob (Excel). Manba aniq bo'lmaguncha `unverified`.
- Brauzerlar: ES modules (2018+); eski brauzerga faqat oddiy ogohlantirish.

## Joriy holat bo'yicha eslatmalar (2026-11-18, P02, P01, P03, P04, P08, P09 va P10 dan keyin)

Bu bo'lim qoidalarni bekor qilmaydi — faqat ular hozir qayerda bajarilmasligini ko'rsatadi. Tegishli bosqich tugagach yangilanadi.

- **Bajarish tartibi:** P02 → P01 → P03 → P04 → P08 → P09 → P10 (bajarildi) → **P05 → P06 → P07 → P11 → …** (egasi qarori 2026-11-17, `docs/PLAN.md`). P05 gacha: linter o'rniga natijadagi `warnings[]` (`{code, severity, ref}`), yangi rejimlarning hisobot bo'limi — `src/js/report.js`. Bosqichlarning batafsil talablari — [docs/prompts/ClaudeCode_promptlar.md](docs/prompts/ClaudeCode_promptlar.md); u faylda raqamlash boshqacha, moslik jadvali `docs/PLAN.md` da. Zid bo'lsa `docs/PLAN.md` va egasining javoblari ustun.
- **Etalon fayllar `tests/fixtures/` da** (README bilan): `Zichlik_noaniqligi_hisobi.xlsx`, `Noaniqlik_hisobi_gazoanalizator_KEDR-07.xlsx`, `Noaniqlik_hisobi_termometr_MS-MK-3.xlsx`, `Qollanma_noaniqlik_gazoanalizator_C75QM.docx`, `Qollanma_noaniqlik_termometr_MS-MK-3.docx`. Kutilgan qiymatlar faqat shulardan, **katak havolasi bilan**. `.xlsx` o'qish kutubxonasi faqat devDependency bo'lishi mumkin (saytga yuklanmaydi). Termometr kuzatuvlari — o'quv namunasi, real laboratoriya ma'lumoti emas.
- **9 ta etalon nuqta** = zichlik 1 + gazoanalizator 3 + termometr 5. **10-test** — gazoanalizator 2-nuqta MC intervali `[−0,0111; 0,0469]` (qo'llanmadan).
- `npm test` (P01): `tests/run-cases.test.js` (manba misollari `tests/cases/**.json`: 51 verified, 2 pending, 2 unverified; todo qolgan farqlar — D-03, D-04 (n_dig = 2 → P06), D-05; `tests/cases/DISCREPANCIES.md`), `tests/fixture-refs.test.js` (kutilgan qiymat ↔ Excel katagi/docx iqtibosi har safar qayta o'qiladi), `tests/excel.test.js` (eski 8 assert), `tests/i18n.test.js`, `tests/presets.test.js`, `tests/engine/*` (kvantillar, hosila, 2-tartibli hadlar, birliklar, yaxlitlash, API, regressiya, top-down, maxsus rejimlar), `tests/ui/*` (P08, P09, P10), `tests/security/*`. Firestore qoidalari — `npm run test:rules` (Emulator, Java 11+). CI: `.github/workflows/test.yml`. `ENGINE_VERSION` = 2.3.0 (`src/engine/version.js`), `CHANGELOG.md` bor; `src/engine/` yoki `src/report/` o'zgarsa `node tests/tools/engine-hash.js --write` (`tests/security/engine.sha256.json`). Validatsiya matritsasi — `docs/VALIDATION_MATRIX.md`.
- DISCREPANCIES.md Q-1…Q-4 ga egasi javob bergan (2026-11-13): Q-1(a) har doim t(⌊ν_eff⌋); Q-2 todo; Q-3 hozir n_dig = 1, P06 dan keyin 2; Q-4 tasdiqlandi.
- Dvigatel `src/engine/` da (sof ES modullar, API — `docs/ENGINE_API.md`); `src/js/calc.js` — brauzer moslik qatlami (`<script type="module">`, `window.Calc`). Kirish birliklari uchun UI maydoni hali yo'q (`state.units` — API orqali; P04).
- Yaxlitlash `src/report/rounding.js` da, egasi qarorlari bilan (0,0999 → 0,10; −0,125 → −0,13). Saqlangan eski natijalardagi `resultText` e'tiborsiz — hisobot qayta yaxlitlaydi.
- `docs/references/` da hozir bor (ISO 19036, ISO/TS 20914, ISO 21748 — yo'q, pullik): JCGM 100:2008, JCGM 101:2008, EA-4/02 M:2022, EURACHEM/CITAC QUAM 2012, Nordtest TR 537 ed.4, EURACHEM/CITAC UfS 2019, EURACHEM/CITAC AQA 2021 (sifatli tahlil). **Egasi qo'shadi:** JCGM 102, JCGM 106, JCGM GUM-6, ILAC P14, ILAC G8, NIST Uncertainty Machine qo'llanmasi, COOMET R/GM/32. Qo'shilmaguncha ularga havola qilingan kod "tekshirilmagan" deb hisoblanadi.
- **Xavfsizlik (P02):** super-admin = Auth custom claim `superadmin: true` (mijoz kodida login/parol yo'q); parollar faqat Firebase Auth'da (`rawPwd`/`passwordHash` yo'q); sessiya — Auth token'i; `firestore.rules` repoda. Konsol amallari (qoidalarni joylash, Auth'ni yoqish, claim, migratsiya) egasi tomonidan `docs/SECURITY_SETUP.md` bo'yicha bajariladi — bajarilmaguncha Firestore eng yomon holatda (ochiq) deb hisoblanadi. Spark tarifi: Cloud Functions ishlatilmaydi.
- **Login = sun'iy email** `<login>@users.<LOGIN_EMAIL_DOMAIN>` (faqat Auth ichida). Yangi shaxsiy maydon qo'shilmaydi. Firestore hujjat ID = Auth UID.
- **Inline skript va `onclick` yo'q** (CSP `script-src 'self'`): yangi HTML/JS'da `addEventListener` va `data-*`; bazadan kelgan qiymat `escHtml` (`src/ui/escape.js`) orqali. Tashqi skript faqat `vendor/` dan.
- Shaxsiy ma'lumotlarni O'zbekistondagi serverga ko'chirish (P15) — O'RQ-1125 (26.03.2026) bo'yicha zaruriyati yuridik qayta baholanadi (`docs/DATA_RESIDENCY.md`). Minimallashtirish tamoyili o'zgarmaydi.
- admin/superadmin/auth sahifalari hali i18n'ga ulanmagan (faqat o'zbekcha, R-13) — P02 da qo'shilgan bir nechta yangi matn ham o'zbekcha; 3 tilga o'tkazish — P05 (R-13).
- **Shablonlar (P04):** `schemas/methodology.schema.json`, `src/templates/` (interpreter, validator), `templates/builtin/` (11 `legacy-*` + 24 `T-*`, hammasi DRAFT), yo'riqnoma `docs/TEMPLATE_GUIDE.md`, tasdiqlash `docs/templates/APPROVAL_CHECKLIST.md`. Saqlash — `src/storage/` (IndexedDB, audit xesh zanjiri). 1-to'lqin shablonlarida raqam (yarim kenglik, U, k, kuzatuv) yo'q — qo'shilmaydi. `npm test` ga `tests/templates/`, `tests/storage/` qo'shildi.
- **Regressiya (P08):** `src/engine/regression/` (OLS, WLS, GLS, WTLS, polinom 2–3-daraja, χ² testi, to'g'ri/teskari bashorat), format `uc-regression/1` (`docs/ENGINE_API.md` §7); UI — "Regressiya" yorlig'i (`src/ui/regression/`, matnlar `src/js/i18n-regression.js`), hisobot bo'limi — `src/js/report.js::regressionSection`; shablon `evaluationMode: "REGRESSION"` (`templates/builtin/R-01.json`, DRAFT; `docs/TEMPLATE_GUIDE.md` §9). **Verified:** OLS + bashoratlar (GUM H.3, QUAM A5/E.4). **Unverified** (manba repoda yo'q — majburiy test emas): WTLS, GLS, polinom, "U — diapazon" (ILAC P14). Loyiha qarorlari egasi tasdig'ini kutadi — `docs/RISKS.md` R-19. Bir o'lchamli GUM natijalari 2.0.0 bilan bit darajasida bir xil.
- **Top-down (P09):** `src/engine/topdown/` (Nordtest TR 537 u(R_w) + u(bias); QUAM recovery R_m + t-test; s_R asosida; u(x) = √(s₀² + (x·s₁)²); gibrid; empirik kattalik), format `uc-topdown/1` (`docs/ENGINE_API.md` §8); UI — "Top-down" yorlig'i, usta (`src/ui/topdown/`, matnlar `src/js/i18n-topdown.js`), hisobot bo'limi — `src/js/report.js::topdownSection` (y, U, nisbiy U %, k, yondashuv nomi); shablon `evaluationMode: "TOP_DOWN"` (`templates/builtin/TD-01…TD-04.json`, DRAFT, raqamsiz; `docs/TEMPLATE_GUIDE.md` §10). **Qoida:** har bir kattalikda `unit` yoki `relative: true`; nisbiy va mutlaq aralashmasi — xato `topdown_mixed_scale`. **X11** (ikki marta hisoblash) va **X12** (empirik kattalikda bias) hozircha top-down modulining `warnings[]` da (`rule` maydoni bilan) — P05 da linterga ko'chiriladi. **Egasi qarorlari (2026-11-17, R-20):** X12 — empirik kattalikda bias kiritilsa "tayanch qiymat qaysi usul bilan olingan" savoli majburiy (`referenceMethod`): javobsiz — hissa qo'shiladi + X12; `other` — chiqariladi (QUAM §7.9.2); `same` — qo'shiladi (§7.9.3). X11 — hissa hisobda qoladi, ogohlantirish bosma hisobotda ham chiqadi. k = 2 ("k = 2, P ≈ 95 %"); ν_eff hisoblanadi va ko'rsatiladi (ν(R_w) = n − 1; ν(bias) = N − 1 — egasi tasdiqladi 2026-11-18, konservativ), ν_eff < 30 → ogohlantirish + t_P(⌊ν_eff⌋) taklifi, k avtomatik o'zgarmaydi. **Verified:** Nordtest TR 537 ed. 4 (NH₄-N, dublikatlar, BOD, recovery — 6 misol), QUAM:2012 A4 va A6. **Unverified** (ISO 21748 pullik, repoda yo'q): laboratoriya s_r tekshiruvi, s_R ni moslash, u(δ̂). Barcha qarorlar tasdiqlangan — `docs/RISKS.md` R-20; **ochiq — faqat ISO 21748 manbasi.** Usta jonli saytda brauzerda ko'rib chiqildi (egasi, 2026-11-18, `41a041a`: konsolda xato yo'q; Nordtest NH₄-N misoli u_c = 3,198 %, U = 6,40 %, ν_eff ≈ 9,5 → `topdown_nu_low`). GUM va regressiya natijalari 2.1.0 bilan bayt darajasida bir xil.
- **Maxsus rejimlar (P10):** `src/engine/sampling/` (dublikat usuli, klassik va robust ichma-ich ANOVA, U′, ᶠU — `uc-sampling/1`), `src/engine/qualitative/` (2×2 jadval, SS, SP, LR, posterior, Wilson va Clopper–Pearson — `uc-qualitative/1`), `src/engine/micro/` (log₁₀ sanoq — `uc-micro/1`), `src/engine/medical/` (IQC darajalari — `uc-medical/1`); API — `docs/ENGINE_API.md` §9. UI — "Maxsus rejimlar" yorlig'i (`src/ui/special/`, matnlar `src/js/i18n-special.js`), hisobot — `src/js/report.js::specialSection` (yondashuv nomi va cheklovlar bilan). Shablon rejimlari `SAMPLING` / `QUALITATIVE` / `MICROBIOLOGY` / `MEDICAL` (`templates/builtin/SP-01…SP-04.json`, DRAFT, raqamsiz; `docs/TEMPLATE_GUIDE.md` §11). **Verified:** namuna olish (UfS:2019 A1, A2 — klassik to'liq aniqlikda; robust 4 qiymatli raqamgacha, algoritm qayta tiklangan), sifatli testlar (AQA:2021 E3, 7.6 — Wilson). **BETA / unverified** (standart repoda yo'q — majburiy test emas, natijada har doim ogohlantirish, shablon APPROVED bo'la olmaydi): mikrobiologiya (ISO 19036), tibbiy laboratoriya (ISO/TS 20914); Clopper–Pearson — faqat analitik tekshiruv. **Egasi qarorini kutadi** (`docs/RISKS.md` R-21): sifatli testlar hisobotida Wilson yoki Clopper–Pearson (hozir ikkalasi ko'rsatiladi). Oyna real brauzerda qo'lda ko'rilmagan (faqat jsdom testi). Avvalgi rejimlar natijalari 2.2.0 bilan bayt darajasida bir xil.
- Pullik ISO/GOST standartlarini repoga joylama (`docs/references/README.md`).
