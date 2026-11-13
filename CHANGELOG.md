# CHANGELOG

Format: har bir yozuvda dvigatel versiyasi (`ENGINE_VERSION`, semver) va hisoblash natijasiga ta'siri ko'rsatiladi.
Hisoblash natijasiga ta'sir qiladigan har qanday o'zgarish `ENGINE_VERSION` ni oshiradi (CLAUDE.md).
Etalon nuqtalar ko'rinishi faqat egasi qabul qilgan ikki yaxlitlash qoidasi tufayli o'zgarishi mumkin. Har bir bunday o'zgarish shu yerda alohida yoziladi.

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
