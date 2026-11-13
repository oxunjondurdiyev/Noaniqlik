# CHANGELOG

Format: har bir yozuvda dvigatel versiyasi (`ENGINE_VERSION`, semver) va hisoblash natijasiga ta'siri ko'rsatiladi.
Hisoblash natijasiga ta'sir qiladigan har qanday o'zgarish `ENGINE_VERSION` ni oshiradi (CLAUDE.md).
Etalon nuqtalar ko'rinishi faqat egasi qabul qilgan ikki yaxlitlash qoidasi tufayli o'zgarishi mumkin. Har bir bunday o'zgarish shu yerda alohida yoziladi.

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
