# Validatsiya matritsasi (RTM): me'yoriy talab → dvigatel funksiyasi → test → holat

> Holat: P03, 2026-11-13. Dvigatel `src/engine/*` (ES modullar), `ENGINE_VERSION` 2.0.0, API — [ENGINE_API.md](ENGINE_API.md). Yaxlitlash — `src/report/rounding.js`.
> Test misollari — `tests/cases/` ([README](../tests/cases/README.md)), farqlar — [DISCREPANCIES.md](../tests/cases/DISCREPANCIES.md). Asos: ISO/IEC 17025:2017 §7.11.2 (dasturiy ta'minot validatsiyasi; to'liq paket — P13).
>
> Holat belgilari: ✅ — `verified` testlar o'tadi; ⚠️ — o'tadi, lekin ma'lum farq bor (todo, D-ID); ⏳ — `pending` (bosqich ko'rsatilgan); ❔ — `unverified` (manba yo'q).

## 1. GUM yondashuvi (JCGM 100:2008)

| Talab (band) | Dvigatel funksiyasi | Test misollari | Holat |
|---|---|---|---|
| A tur: x̄, s(x̄) = s/√n, ν = n − 1 (§4.2.1–4.2.3) | `typeA.js::typeA`, `typeAx` (method 1) | `excel-density`, `excel-gas-p2`, `-p3`, `ea4-02-s3` | ✅ |
| A tur: oldindan aniqlangan s_p (§4.2.4) | `typeA.js::typeAx` (method 2); misollarda B komponent sifatida | `jcgm100-h1` (u(d̄) = 13/√5), `ea4-02-s2` | ✅ |
| A tur: ↑/↓ o'qishlar, birlashtirilgan s, ν = n − 2, histerezis | `typeA.js::typeAx` (directional) | `excel-term-p1…p5` | ✅ |
| B tur: normal (U/k), to'g'ri burchakli, uchburchak, arksinus, rezolyutsiya d/(2√3) (§4.3.4–4.3.9, F.2.2.1) | `typeB.js::typeB`, `getDivisor`, `DIVISORS` | `excel-*`, `jcgm100-h1` (arksinus), `ea4-02-s3` (uchburchak), `quam-a1` | ✅ |
| B tur: formula ko'rinishidagi yarim kenglik (`0.0002 * I + 0.002`) | `typeB.js::valueOrExpr` | `excel-gas-p1…p3`, `excel-density` (V̄·γ·ΔT) | ✅ |
| B tur: ν_i (G.4.2, Eq. G.3) | `evaluate.js::evaluate` (komponent `nu`) | `jcgm100-h1` (ν = 18, 24, 5, 8, 50, 2) | ✅ |
| Formula parseri, o'zboshimcha model y = f(x) (§4.1) | `parser.js::parse`, `compileAst` | barcha `verified` misollar; nochiziqli: `jcgm100-h2-*`, `jcgm101-9-3-*`, `jcgm101-9-4-*` | ✅ |
| Sezgirlik koeffitsientlari c_i = ∂f/∂x_i (§5.1.3) | `parser.js::derivative` (simvolik), `sensitivity.js::sensitivities` (sonli o'zaro tekshiruv, `c_zero`/`c_nan`/`c_mismatch`) | `jcgm100-h1` (c_d = 1, 1e-12), `ea4-02-s3`, `tests/engine/sensitivity.test.js` | ✅ D-07 yopildi (P03) |
| u_c, mustaqil kirishlar (§5.1.2, Eq. 10) | `evaluate` | `jcgm100-h1`, `ea4-02-s2`, `-s3`, `quam-a1`, `jcgm101-9-2-*-guf` | ✅ |
| Korrelyatsiya: juftlangan kuzatuvlardan r (§5.2.2–5.2.3, Eq. 14, 17) | `typeA.js::correlation`, `evaluate` (paired) | `excel-density`, `jcgm100-h2-R`, `-Z` | ✅ |
| | | `jcgm100-h2-X` | ⚠️ D-05 (manba nuansi) |
| Kovariatsiya B tur (`covB`, §5.2.2, F.1.2) | `evaluate` (covB) | `jcgm101-9-4-x001-r09-guf1` | ✅ |
| Welch–Satterthwaite ν_eff (G.4.1, Eq. G.2b) | `evaluate` | `jcgm100-h1` (16,74 vs 16,7), `excel-density`, `excel-gas-*` | ✅ |
| | | `excel-term-p2`, `-p3`, `-p5` | ⚠️ D-03 (Excel ν_B = 10⁹) |
| ν_eff kasr → `floor` (G.4.1 Note 1; egasi qarori); `interpolate`, `exact` — ixtiyoriy | `coverage.js::coverage` (`settings.nuRule`, natijada `coverage.nuRule`) | `jcgm100-h1` (16,7 → 16, k₉₉ = 2,92), `excel-gas-p2` (6,93 → 6) | ✅ |
| k = t_P(ν_eff) (G.3, Table G.2), P = 0,95 / 0,9545 / 0,99 / 0,9973 | `coverage.js::coverage`, `special.js::tQuantile` | `jcgm100-h1` (P = 0,99), `excel-density`, `excel-gas-p2`, `-p3`; Table G.2 (168 katak, D-11); mpmath 1 ≤ ν ≤ 200 (1e-6 talab, amalda < 1e-11) — `tests/engine/quantiles.test.js` | ✅ |
| k: ν → ∞ (normal kvantil) | `special.js::normalQuantile` (AS241) | NORMSINV(0,97725) 1e-12; `excel-gas-p1`, `excel-term-p1`, `-p4` | ✅ D-01 yopildi (P03) |
| k: katta ν — har doim t(⌊ν⌋), chegara yo'q (Q-1(a)) | `coverage.js`, `special.js` (ν ≥ 2000 — Cornish–Fisher) | `excel-term-p2`, `-p3`, `-p5` (tolerans 1e-3, sabab testda); uzluksizlik testi | ✅ D-02 yopildi (P03) |
| k = 2 qat'iy (EA-4/02 §5) | `evaluate` (`kMethod: 'k2'`) | `ea4-02-s2`, `-s3`, `quam-a1` | ✅ |
| U = k·u_c (§6.2.1) | `evaluate` | barcha `verified` | ✅ (D-01/D-02 dagi k orqali) |
| Ikkinchi tartibli hadlar (§5.1.2 Note) — diagnostika, standartda o'chiq | `sensitivity.js::higherDerivatives`, `secondOrderTerms` | Y = X² (2u⁴), `jcgm100-h1-2nd` (H.1.7: 32 → 34 nm), `tests/engine/second-order.test.js` | ✅ |
| Manfiy dispersiya, |r| > 1 → xato (C.3.6; PLAN P03 6-band) | `evaluate.js` (`negative_variance`, `bad_correlation`) | `tests/engine/api.test.js` | ✅ |
| Birliklar va o'lchamlik tahlili (GUM-6 §11 — PDF yo'q) | `units.js::parseUnit`, `analyzeDimensions`, `convert` | `tests/engine/units.test.js` (mustaqil qo'lda hisob; mA ↔ % об. misoli) | ❔ manba PDF kerak (unverified) |
| U = 0 → ogohlantirish (CLAUDE.md) | `evaluate` (`zero_u`) | `jcgm101-9-4-x0-r0-guf1` | ✅ (ogohlantirish); hisobotda bloklash ⏳ P05 |
| Regressiya / kalibrlash egri chizig'i (H.3) | — | `jcgm100-h3` | ⏳ P08 |

## 2. Yaxlitlash va hisobot (ILAC P14, GUM §7.2)

| Talab | Funksiya | Test | Holat |
|---|---|---|---|
| U — 2 qiymatli raqam, "yuqoriga" / "odatiy" rejim; y — U razryadigacha | `src/report/rounding.js::roundResult` | 9 ta Excel nuqtasi `expectedDisplay` (`Nuqta_i!D41/D42`, `D42/D43`, `3_Hisob!D73/D74`); 0,0999 → 0,10; −0,125 → −0,13 — `tests/engine/rounding.test.js` | ✅ (egasi qarorlari, P03) |

## 3. Monte-Karlo (JCGM 101:2008)

| Talab (band) | Funksiya | Test | Holat |
|---|---|---|---|
| Taqsimotlarni tarqatish, M = 10⁶ (§7) | `montecarlo.js::monteCarlo` | `jcgm101-9-2-2-mcm` (normal), `-9-2-3-mcm` (to'g'ri burchakli, analitik ±3,88), `-9-2-4-mcm`, `-9-3-mcm` (nochiziqli) | ✅ (manba δ bilan) |
| Ehtimollik bo'yicha simmetrik interval (§7.7.3) | `monteCarlo` (`symLow`/`symHigh`) | `jcgm101-9-2-*-mcm`, `excel-gas-p2-mc*` | ✅ / ⚠️ D-04 |
| Eng qisqa interval (§7.7.4) | `monteCarlo` (`low`/`high`) | `jcgm101-9-3-mcm` | ✅ |
| I uchun siljitilgan-masshtablangan t (§6.4.9) | `monteCarlo` (student) | `excel-gas-p2-mc` (10-test) | ⚠️ D-04 (savol Q-3) |
| Raqamli tolerans δ, GUF validatsiyasi (§7.9.2, §8) | `monteCarlo` (`delta`, `validated`) | tolerans qoidasi sifatida ishlatilgan | qisman (adaptiv M ⏳ P06) |
| Ko'p o'lchamli normal, korrelyatsiya (§6.4.8) | — | `jcgm101-9-4-mcm` | ⏳ P06 |
| t, arksinus, egri trapetsiya kirish taqsimotlari (Table 10) | — | `jcgm101-9-5-mcm` | ⏳ P06 |

## 4. Boshqa manbalar

| Manba | Test | Holat |
|---|---|---|
| EA-4/02 M:2022 S2, S3 | `ea4-02-s2`, `ea4-02-s3` | ✅ |
| EA-4/02 M:2022 S4–S13 | — | keyingi nomzodlar (P05/P08) |
| EURACHEM/CITAC QUAM:2012 A1 | `quam-a1` | ✅ (D-06) |
| QUAM A2–A6 | — | keyingi nomzodlar (A5, A6 — top-down, P09) |
| Nordtest TR 537 ed.4 (NH₄-N) | `nordtest-tr537-nh4n` | ⏳ P09 |
| NIST Uncertainty Machine qo'llanmasi | `nist-um-ratio` | ❔ PDF yo'q |
| ISO/TS 28037/28038 (pullik) | — | ❔ ochiq manba (GTC/MSL) kerak — P08 |
| JCGM 102, 106, GUM-6, ILAC P14, ILAC G8, COOMET R/GM/32 | — | ❔ PDF hali `docs/references/` da yo'q |

## 5. Test infratuzilmasi

| Talab | Fayl | Holat |
|---|---|---|
| Kutilgan qiymat — faqat manbadan, katak havolasi bilan | `tests/cases/**.json` (`ref`), `tests/fixture-refs.test.js` (Excel kataklari, kirish ma'lumotlari va docx iqtiboslari har `npm test` da qayta o'qiladi) | ✅ |
| Mutatsiyaga sezgirlik | qo'lda tekshirildi (P01): √3 bo'luvchi 1,7320 ga → 15 test yiqildi; rezolyutsiya bo'luvchisi 10⁻⁵ ga → 10; bitta kuzatuv qiymati → 7 | ✅ |
| i18n: har bir kalit uch tilda | `tests/i18n.test.js` | ✅ |
| 11 ta shablon tuzilmasi va hisobi; shablon ↔ etalon ma'lumot mosligi (R-11) | `tests/presets.test.js` | ✅ |
| CI | `.github/workflows/test.yml` | ✅ (push/PR) |
