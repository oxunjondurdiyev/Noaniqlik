# CHANGELOG

Format: har bir yozuvda dvigatel versiyasi (`ENGINE_VERSION`, semver) va hisoblash natijasiga ta'siri ko'rsatiladi.
Hisoblash natijasiga ta'sir qiladigan har qanday o'zgarish `ENGINE_VERSION` ni oshiradi (CLAUDE.md).
Etalon nuqtalar ko'rinishi faqat egasi qabul qilgan ikki yaxlitlash qoidasi tufayli o'zgarishi mumkin. Har bir bunday o'zgarish shu yerda alohida yoziladi.

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
