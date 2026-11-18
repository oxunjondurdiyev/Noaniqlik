# Validatsiya matritsasi (RTM): me'yoriy talab → dvigatel funksiyasi → test → holat

> Holat: P05a, 2026-11-18 (P03/P04 qatorlari o'zgarmagan; regressiya — §7; top-down — §8; maxsus rejimlar — §9; linter — §10). Dvigatel `src/engine/*` (ES modullar), `ENGINE_VERSION` 2.4.0, API — [ENGINE_API.md](ENGINE_API.md). Yaxlitlash — `src/report/rounding.js`.
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
| Regressiya / kalibrlash egri chizig'i (H.3) | `regression/index.js::evaluateRegression` | `jcgm100-h3` | ✅ (P08, §7) |

## 2. Yaxlitlash va hisobot (ILAC P14, GUM §7.2)

| Talab | Funksiya | Test | Holat |
|---|---|---|---|
| U — 2 qiymatli raqam, "yuqoriga" / "odatiy" rejim; y — U razryadigacha | `src/report/rounding.js::roundResult` | 9 ta Excel nuqtasi `expectedDisplay` (`Nuqta_i!D41/D42`, `D42/D43`, `3_Hisob!D73/D74`); 0,0999 → 0,10; −0,125 → −0,13 — `tests/engine/rounding.test.js` | ✅ (egasi qarorlari, P03) |

## 3. Monte-Karlo (JCGM 101:2008) — P06 da yangilandi, batafsil [§12](#12-p06-monte-karlo-20-srcenginemc-montecarlojs)

| Talab (band) | Funksiya | Test | Holat |
|---|---|---|---|
| Taqsimotlarni tarqatish, M = 10⁶ (§7) | `montecarlo.js::monteCarlo` | `jcgm101-9-2-2-mcm` (normal), `-9-2-3-mcm` (to'g'ri burchakli, analitik ±3,88), `-9-2-4-mcm`, `-9-3-mcm` (nochiziqli) | ✅ (manba δ bilan) |
| Ehtimollik bo'yicha simmetrik interval (§7.7.2) | `coverageIntervals` (`symLow` / `symHigh`) | `jcgm101-9-2-*-mcm`, `excel-gas-p2-mc*` | ✅ |
| Eng qisqa interval (§7.7.2) | `coverageIntervals` (`low` / `high`) | `jcgm101-9-3-mcm`, `-9-4-mcm-*`, `-9-5-mcm` | ✅ (D-18) |
| I uchun siljitilgan-masshtablangan t (§6.4.9) | `mc/distributions.js::sampleT` | `excel-gas-p2-mc` (10-test, n_dig = 2), `excel-gas-p2-mc-ndig1` | ✅ (D-04 — egasi qarori Q-3 (b)) |
| Raqamli tolerans δ, GUF validatsiyasi (§7.9.2, §8) | `numericalTolerance`, `monteCarlo` (`delta`, `validated`) | `montecarlo.test.js`; `jcgm101-*-mcm-adaptive` | ✅ |
| Ko'p o'lchamli normal, korrelyatsiya (§6.4.8) | `cholesky`, `sampleMvn` | `jcgm101-9-4-mcm-*-r09` (Table 9) | ✅ |
| t, arksinus, egri trapetsiya kirish taqsimotlari (Table 10) | `mc/distributions.js` | `jcgm101-9-5-mcm` (Table 11) | ✅ |

## 4. Boshqa manbalar

| Manba | Test | Holat |
|---|---|---|
| EA-4/02 M:2022 S2, S3 | `ea4-02-s2`, `ea4-02-s3` | ✅ |
| EA-4/02 M:2022 S4–S13 | — | keyingi nomzodlar (P05/P08) |
| EURACHEM/CITAC QUAM:2012 A1 | `quam-a1` | ✅ (D-06) |
| EURACHEM/CITAC QUAM:2012 A5 (kalibrlash qismi), E.4 | `quam-a5-calibration` | ✅ (P08, §7) |
| EURACHEM/CITAC QUAM:2012 A4 (aniqlik, recovery t-test, tuzatish, u_c) | `quam-a4-recovery` | ✅ (P09, §8; t_crit — D-13) |
| EURACHEM/CITAC QUAM:2012 A6 (empirik usul, s_R + quritish) | `quam-a6-empirical` | ✅ (P09, §8) |
| QUAM A2, A3; A5 ning qolgan qismi | — | keyingi nomzodlar |
| Nordtest TR 537 ed.4 (NH₄-N: §3.2, Appendix 4) | `nordtest-tr537-nh4n` | ✅ (P09, §8) |
| Nordtest TR 537 ed.4 (dublikatlar — Appendix 5, 6; BOD — §8.2; recovery — §6.3) | `nordtest-tr537-nh4n-dup-low`, `-dup-high`, `nordtest-tr537-oxygen-dup`, `-bod-crm`, `-bod-pt`, `-recovery` | ✅ (P09, §8; D-12) |
| ISO 21748 (pullik) — laboratoriya s_r tekshiruvi, u(δ̂) | `tests/engine/topdown.test.js` (o'zaro tekshiruv) | ❔ unverified — ochiq manba misoli yoki laboratoriya Excel'i kerak (egasi qo'shadi) |
| EURACHEM/CITAC UfS:2019 A1, A2 (dublikat usuli, ANOVA, ᶠU) | `ufs-a1-nitrate-classical`, `-robust`, `ufs-a2-lead-classical`, `-robust` | ✅ (P10, §9; robust — D-16) |
| EURACHEM/CITAC AQA:2021 E3, 7.6 (posterior ehtimol, Wilson CI) | `aqa-e3-emit-opiates`, `-methadone`, `-cocaine`, `aqa-e6-sarscov2` | ✅ (P10, §9; D-15, D-17) |
| ISO 19036 (mikrobiologiya), ISO/TS 20914 (tibbiy laboratoriya) — pullik | `tests/engine/special-modes.test.js` (analitik) | ❔ BETA / unverified — manba kerak (egasi qo'shadi) |
| NIST Uncertainty Machine qo'llanmasi | `nist-um-ratio` | ❔ PDF yo'q |
| ISO/TS 28037/28038 (pullik) | `york-pearson-wtls` (unverified) | ❔ WTLS/GLS/polinom uchun ochiq manba misoli kerak (egasi qo'shadi) |
| JCGM 102, 106, GUM-6, ILAC P14, ILAC G8, COOMET R/GM/32 | — | ❔ PDF hali `docs/references/` da yo'q |

## 5. Test infratuzilmasi

| Talab | Fayl | Holat |
|---|---|---|
| Kutilgan qiymat — faqat manbadan, katak havolasi bilan | `tests/cases/**.json` (`ref`), `tests/fixture-refs.test.js` (Excel kataklari, kirish ma'lumotlari va docx iqtiboslari har `npm test` da qayta o'qiladi) | ✅ |
| Mutatsiyaga sezgirlik | qo'lda tekshirildi (P01): √3 bo'luvchi 1,7320 ga → 15 test yiqildi; rezolyutsiya bo'luvchisi 10⁻⁵ ga → 10; bitta kuzatuv qiymati → 7 | ✅ |
| i18n: har bir kalit uch tilda | `tests/i18n.test.js` | ✅ |
| 11 ta shablon tuzilmasi va hisobi; shablon ↔ etalon ma'lumot mosligi (R-11) | `tests/presets.test.js` | ✅ |
| CI | `.github/workflows/test.yml` | ✅ (push/PR) |

## 6. P04: metodika shablonlari

| Talab | Funksiya | Test | Holat |
|---|---|---|---|
| Shablon sxemasi (uc-template/1), o'z validator | `schemas/methodology.schema.json`, `src/templates/validator.js` | `tests/templates/workflow.test.js`, `schema` tekshiruvi barcha 35 shablonda | ✅ |
| Shablon → modelSpec → evaluate (dvigatel o'zgarmagan) | `src/templates/interpreter.js` | `tests/templates/*.test.js` | ✅ |
| 11 ta eski preset JSON'da, P03 bilan bit darajasida bir xil | `templates/builtin/legacy-*.json` | `tests/templates/builtin.test.js` (snapshot `snapshots/legacy-p03.json` + jonli P03 holati) | ✅ |
| Zichlik, gazoanalizator (3), termometr (5) shablonlari Excel bilan | `legacy-density`, `legacy-gas_analyzer`, `legacy-thermometer` | `builtin.test.js` ← `tests/cases/excel/*.json` (katak havolalari) | ✅ / ⚠️ D-03 (term p2–p4 ν_eff, avvalgidek) |
| Bitta asbob korrelyatsiyasi u(xi,xj) = r·u_X(xi)·u_X(xj) (§5.2.2, F.1.2.3) | `interpreter.js::prepareState` | `workflow.test.js`, `wave1.test.js` (analitik) | ✅ (sintetik) |
| P04b: bitta asbob — covB faqat umumiy qismdan, nuqtaga xos qism r = 0 (EA-4/02 M:2022 D4–D5, D.6/D.8) | `interpreter.js::prepareState` (`share`) | `tests/templates/correlation.test.js` — qo'lda hisob w = (m − m₁)/m₁, 1e-12 | ✅ (qo'lda hisob; manba misoli yo'q) |
| P04b: `split: "unknown"` — r = 0 va r = 1, katta u_c (loyiha qarori; EA-4/02 D7 g'oyasi) | `interpreter.js::evaluateState` | `correlation.test.js` (ayirma → r = 0, yig'indi va T-07 → r = 1, hisobot matni 3 tilda) | ✅ (qo'lda hisob) |
| P04b: ikki marta hisoblash tekshiruvi u²(umumiy) + u²(nuqta) ≤ u²(sertifikat) | `prepareState` (`split_exceeds`) | `correlation.test.js` | ✅ |
| P04b: P04 dagi bitta qatorli nusxalar migratsiyasi → `split: "unknown"` | `migrateTemplate`, `upgradeState` | `correlation.test.js` | ✅ |
| Holat oqimi, qulflash, yangi versiya | `interpreter.js::transition/applyEdit/newVersion` | `workflow.test.js` | ✅ |
| Saqlash: IndexedDB, uc_state_v2 migratsiyasi (natija bir xil), eksport→import bit darajasida, audit xesh zanjiri | `src/storage/*` | `tests/storage/storage.test.js` | ✅ |
| Kodsiz yangi shablon | `docs/templates/examples/LAB-EXAMPLE-01.json` | `tests/templates/guide-example.test.js` | ✅ |

### 6.1. 1-to'lqin sinov shablonlari (24 ta, [WAVE1_SPEC](templates/WAVE1_SPEC.md)) — APPROVED uchun [APPROVAL_CHECKLIST](templates/APPROVAL_CHECKLIST.md)

| Shablon | Standartlar | Model | Test (faqat sxema ↔ dvigatel ulanishi) | Holat |
|---|---|---|---|---|
| T-01 Metall cho'zilishi: vaqtinchalik qarshilik va oquvchanlik chegarasi | ГОСТ 1497, ГОСТ 12004, ГОСТ 34028 | `σ = F / (pi * d0^2 / 4)` (variantlar: round, rect) | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT; ⚠ Q1 |
| T-02 Metall nisbiy uzayishi | ГОСТ 1497, ГОСТ 12004 | `δ = (lk - l0) / l0 * 100` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-03 Beton siqilishdagi mustahkamligi | ГОСТ 10180 | `R = alpha * F / (a * b)` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT; ⚠ Q1 |
| T-04 Beton qorishmasi: konus cho'kishi va zichligi | ГОСТ 10181 | `OK = h0 - h1` (variantlar: slump, density) | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-05 Qurilish qorishmasi: o'rtacha zichlik va harakatchanlik | ГОСТ 5802 | `ρ = (m - m1) / V` (variantlar: density, mobility) | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-06 Chaqiq tosh / qum: donador tarkib (elakdagi xususiy qoldiq) | ГОСТ 8269.0, ГОСТ 8735 | `a_i = m_i / m * 100` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT; ⚠ Q1 |
| T-07 Qumning yiriklik moduli | ГОСТ 8735 | `Mk = ((m25) + (m25 + m125) + (m25 + m125 + m063) + (m25 + m125 + m063 + m0315) + (m25 + m125 + m063 + m0315 + m016)) / (100 * m) * 100` (variantlar: masses, residues) | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT; ⚠ Q1 |
| T-08 Chaqiq tosh maydalanuvchanligi; chang va loy zarralari miqdori | ГОСТ 8269.0 | `X = (m - m1) / m * 100` (variantlar: crushing, dust_clay) | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-09 Sochma zichlik (chaqiq tosh, qum) | ГОСТ 8269.0, ГОСТ 8735 | `ρ_n = (m1 - m) / V` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-10 Beton va g'isht o'rtacha zichligi | ГОСТ 12730.1, ГОСТ 7025 | `ρ = m / (a * b * c) * 1000` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT; ⚠ Q1 |
| T-11 Suv shimuvchanlik (beton, g'isht, plitka) | ГОСТ 12730.3, ГОСТ 7025, ГОСТ 27180 | `W = (m1 - m) / m * 100` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-12 Namlik (beton, grunt) | ГОСТ 12730.2, ГОСТ 5180 | `W = (m1 - m0) / (m0 - m) * 100` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-13 G'isht siqilish va egilishdagi mustahkamligi | ГОСТ 8462 | `R = F / A` (variantlar: compression, bending) | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-14 Geometrik o'lchamlar va chetlanishlar | ГОСТ 26433.1 | `Δ = x - x_loyiha` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-15 Plastmassa cho'zilishi | ГОСТ 11262 | `σ = F / (b * h)` (variantlar: stress, strain) | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-16 Rokvell qattiqligi | ГОСТ 9013 | `H = H_oq + Δ_et` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT; ⚠ Q1 |
| T-17 Titrlash (umumiy shablon): kislotalik, ishqoriylik, xloridlar, SAV | ГОСТ 3624, ГОСТ 5898, ГОСТ 5670, ГОСТ 26878, ГОСТ 4245, ГОСТ 22567.6 | `X = (V - V0) * c * K * f / m` (variantlar: gost_3624, gost_5898, gost_5670, gost_26878, gost_4245, gost_22567_6) | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT; ⚠ Q1 |
| T-18 Quritish usulida namlik va uchuvchan moddalar | ГОСТ 29188.4, ГОСТ 13586.5, ГОСТ 5900 | `X = (m1 - m2) / (m1 - m0) * 100` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-19 Kul miqdori | — | `X = (m2 - m0) / (m1 - m0) * 100` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-20 pH (suvli eritma yoki ekstrakt) | ГОСТ 22567.5, ГОСТ 29188.2 | `pH = pH_oq + δ_bufer + δ_T + δ_drift` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT; ⚠ Q1 |
| T-21 Gravimetrik massa ulushi (erimaydigan aralashmalar, sovun komponentlari) | ГОСТ 790, ГОСТ 22567.7 | `X = (m2 - m1) / m * 100` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-22 Izolyatsiya qarshiligi va oqish toki | IEC 60335, IEC 60204, IEC 60950, IEC 60598, IEC 60065, ГОСТ 3940, ГОСТ 2933 | `R_iz = R` (variantlar: insulation, leakage) | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-23 Elektr mustahkamlik: sinov kuchlanishi | IEC 60335, IEC 60204, IEC 60950, IEC 60598, IEC 60065, ГОСТ 3940, ГОСТ 2933 | `U_sin = U_oq` | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT |
| T-24 Qizish (harorat oshishi), qarshilik usuli | IEC 60335-1 | `Δt = (R2 - R1) / R1 * (k + t1) - (t2 - t1)` (variantlar: copper, aluminium, thermocouple) | `wave1.test.js` (struktura + sintetik 1e-9) | ⏳ pending — DRAFT; ⚠ Q1 |

## 7. P08: regressiya va kalibrlash egri chiziqlari (`src/engine/regression/`)

| Talab (manba) | Dvigatel funksiyasi | Test | Holat |
|---|---|---|---|
| To'g'ri chiziq, OLS: y1, y2, s(y1), s(y2), r(y1, y2), s (JCGM 100:2008 H.3.2 Eq. H.13a–g; H.3.3) | `fit.js::fitPolynomial`, `linalg.js::leastSquares` | `jcgm100-h3` (a, u_a, b, u_b, r_ab, s, ν — ±½ oxirgi xona) | ✅ |
| Bashorat qilingan tuzatmalar va qoldiqlar (Table H.6, 4- va 5-ustunlar, 22 qiymat) | `evaluateRegression` (`fitted`, `residuals`) | `jcgm100-h3` (`fitted.0…10`, `residuals.0…10`) | ✅ |
| To'g'ri bashorat u_c[b(t)], ν = n − 2 (H.3.4 Eq. H.15): b(30 °C) = −0,1494, u_c = 0,0041 | `predict.js::predict` | `jcgm100-h3` (`predict.0.*`), t_min = 24,0085 | ✅ |
| Korrelyatsiyani yo'qotish, t0 = t̄ (H.3.5 Eq. H.16–H.17): y1′ = −0,1625(11) | `model.xRef` | `tests/engine/regression.test.js` | ✅ |
| Chiziqli kalibrlash B1, B0, S (QUAM:2012 A5, Table A5.2) | `fitPolynomial` | `quam-a5-calibration` | ✅ |
| Teskari bashorat u(c₀) (QUAM A5; E.4 Eq. E3.3, E3.5): u(c₀) = 0,018 mg/L | `predict.js::inversePredict` | `quam-a5-calibration` (`inverse.0.u`); Eq. E3.3 ≡ E3.5 (1e-9) — `regression.test.js` | ✅ (manbada A₀ yo'q — y₀ chiziqdan tiklanadi) |
| WLS (QUAM Eq. E3.4) | `fitPolynomial` (`uy`) | OLS ≡ WLS (teng u(y)), GLS-diagonal ≡ WLS | ❔ manba misoli yo'q; o'zaro tekshiruv ✅ |
| Polinom 2-, 3-daraja (ISO/TS 28038 — pullik) | `fitPolynomial` (`degree`) | aniq polinomni qayta tiklash, x_ref invariantligi, teskari ≡ to'g'ri | ❔ unverified; o'zaro tekshiruv ✅ |
| GLS, y_i kovariatsiyasi (ISO/TS 28037 §10 — pullik; Aitken 1935) | `fitPolynomial` (`covY`), `linalg.js::cholesky` | diagonal ≡ WLS; umumiy siljish: u²(a) + u_c² | ❔ unverified |
| WTLS, u(x_i) va u(y_i) (ISO/TS 28037 §7 — pullik; York et al. 2004) | `wtls.js::fitWtls` | u(x) = 0 → WLS (1e-12); tarqalish qonuni bilan sonli taqqoslash (2 %); x ↔ y simmetriyasi; `york-pearson-wtls` (a, b 5·10⁻⁹) | ❔ unverified (manba repoda yo'q) |
| Model yaroqliligi: χ² testi, P = 0,95 | `chi2.js::chi2Quantile`, `evaluateRegression` (`chi2`, `regression_chi2_fail`) | ν = 2 yopiq formula, ν = 1 = z², A&S 26.8 qiymatlari; yiqilish/o'tish — `regression.test.js`; UI/hisobotda uch tilda — `tests/ui/regression.test.js` | ✅ (kvantil); test qoidasi ❔ (ISO/TS 28037 pullik) |
| Chekka holatlar: aniq xato kodi | `evaluateRegression`, `inversePredict` | m < n + 1, vertikal chiziq, u = 0, b ≈ 0 va boshqalar — `regression.test.js` | ✅ |
| "U — diapazon" (ILAC P14:09/2020 — PDF yo'q) | `urange.js::uRangeFunction` | U(X_j) ≥ U_j, `max`, xatolar | ❔ unverified |
| Bir o'lchamli GUM natijalari o'zgarmagan | `evaluate` (format bo'yicha uzatish) | 32 misolning natija JSON'i 2.0.0 bilan bayt darajasida bir xil (P08 da tekshirildi); 9 Excel nuqtasi, 10-test | ✅ |
| REGRESSION shabloni | `interpreter.js::buildRegressionSpec`, sxema `regression` | `tests/templates/regression.test.js` (R-01) | ✅ (R-01 — DRAFT) |

## 8. P09: top-down va empirik kattaliklar (`src/engine/topdown/`)

| Talab (manba) | Dvigatel funksiyasi | Test | Holat |
|---|---|---|---|
| u(R_w) nazorat kartasi chegaralaridan: chegara / 2 (Nordtest TR 537 ed. 4 §3.2, p. 10; §5.1, p. 15) | `rw.js::evaluateRw` (`control_limits`) | `nordtest-tr537-nh4n` (`rw.u` = 1,67 %) | ✅ |
| u(bias) = √(RMS_bias² + u(C_ref)²), PT: u(C_ref,i) = s_R,i/√n_Lab,i (§6.2, p. 21; Appendix 4, p. 40) | `bias.js::evaluateBias` (`pt`) | `nordtest-tr537-nh4n` (RMS 2,26; 6 ta u(C_ref,i); o'rtacha 1,52; u(bias) 2,73), `nordtest-tr537-bod-pt` (Table 6, p. 27) | ✅ |
| u_c = √(u(R_w)² + u(bias)²), U = 2·u_c (§3.2, 5–6-qadam, p. 10) | `index.js::evaluateTopDown` | `nordtest-tr537-nh4n` (3,20 %; 6,40 %), `-bod-crm` (5,2; 10,4), `-bod-pt` (4,87; 9,7) | ✅ |
| Dublikatlar: s = √(Σd²/(2n)), mutlaq (Appendix 5 chap ustun, p. 41; Appendix 6, p. 42) | `rw.js::duplicateSd` | `nordtest-tr537-nh4n-dup-low` (0,44 µg/L), `nordtest-tr537-oxygen-dup` (0,0252 mg/L) | ✅ (D-12: n = 46 / 47) |
| Dublikatlar, nisbiy: har bir juftlik o'z o'rtachasiga nisbatan (Appendix 5 o'ng ustun; Table 1, p. 13) | `duplicateSd` (`per_pair`) | `nordtest-tr537-nh4n-dup-high` (3,8 %); Table 1 qiymatlari 2,019; 1,245; 10,554 — `topdown.test.js` | ✅ |
| Dublikatlar, nisbiy: pooled s / umumiy o'rtacha (§5.3, pp. 17–18) | `rw.js` (`pooled_over_mean`) | `nordtest-tr537-oxygen-dup` (0,34 %) | ✅ |
| u(R_w) = √(s_Rw² + s_r²) (§5, p. 15; §5.3, pp. 17–18) | `evaluateRw` | `-dup-low` (0,7 µg/L), `-dup-high` (4,1 %), `-oxygen-dup` (0,60 %) | ✅ |
| Nazorat namunasi qatori: s, CV (§5.2, p. 16) | `rw.js` (`control_series`) | `topdown.test.js` (0,5 / 20,01 → 2,5 %) | ✅ (formula; manbada xom qator yo'q) |
| Bitta CRM: √(bias² + (s_bias/√n)² + u(C_ref)²); bir nechta CRM: RMS (§6, p. 19; §6.1, p. 20) | `bias.js` (`crm`) | `nordtest-tr537-bod-crm` (4,5 %); §6.1: 4,1 %; 2,53 / 1,92 / 3,2 % — `topdown.test.js` | ✅ (D-14: u(C_ref) 2,16 vs 2,17) |
| Recovery: RMS_bias, u(C_recovery) = √(u(conc)² + u(vol)²) (§6.3, p. 23) | `bias.js` (`recovery`) | `nordtest-tr537-recovery` (3,44; 1,0; 3,6 %) | ✅ |
| Robust s × 1,25; PT provayderi U bersa U/2 (§6.2, pp. 21–22) | `bias.js` | `topdown.test.js` | ✅ |
| QUAM recovery: u(Rec) = s/√n, t = \|1 − Rec\|/u(Rec), t_crit(n − 1; 95 %) (QUAM:2012 A4, p. 66) | `recovery.js::evaluateRecovery` | `quam-a4-recovery` (0,0432; 2,31; ahamiyatli) | ✅ (t_crit: D-13) |
| Tuzatilgan bias: hissa u(Rec)/Rec, natija y/Rec; u_c/P = 0,34 (Table A4.4, A4.5, p. 68) | `evaluateTopDown` (`QUAM_RECOVERY`, gibrid) | `quam-a4-recovery` (0,048; 0,34; 1,1111; 0,377) | ✅ |
| Tuzatilmagan bias: hissa u(R_m); ahamiyatli bo'lsa ogohlantirish (§7.7.9, p. 20; §7.16.2, p. 25) | `evaluateTopDown` (`topdown_bias_significant`) | `topdown.test.js` | ✅ (qoida manbadan; raqamli misol yo'q) |
| s_R asosida: u_c = s_R (+ qamralmagan omillar) (QUAM §7.6.3, p. 18; A6 Table A6.4–A6.5, p. 86; Nordtest §7, pp. 24–25) | `reproducibility.js`, `evaluateTopDown` | `quam-a6-empirical` (0,31; 0,62 % m/m; 12 %; 25 %); Nordtest Table 2 (27,5 → 55 %), §7.2 (8,8 → 17,6 %) | ✅ |
| Rejim parametri hissasi = sezgirlik × u(parametr) (QUAM Table A6.3, Note 4, p. 85) | `index.js::additionalComponent` | `topdown.test.js` (0,00030; 0,00048; 0,0090; 0,0072) | ✅ |
| Empirik kattalik: usul bias'i 0 (QUAM §7.9.2, p. 21) | `evaluateTopDown` (`isEmpiricalMeasurand`) | `quam-a6-empirical`; `topdown.test.js` | ✅ |
| u(x) = √(s₀² + (x·s₁)²); s₀ = √c, s₁ = √m (QUAM E.5.2.1 Eq. [1], p. 117; E.5.5.2, p. 119) | `level.js::levelUncertainty`, `fitLevelModel` | `topdown.test.js` (ayniyat va qayta tiklash) | ✅ (formula; manbada raqamli misol yo'q) |
| ISO 21748: laboratoriya s_r tekshiruvi (χ²), s_R′, u(δ̂) | `reproducibility.js` | `topdown.test.js` (formula bo'yicha; natijada `topdown_unverified`) | ❔ unverified (standart pullik) |
| **X11** — ikki marta hisoblash | `evaluateTopDown` (`x11_double_counting`) | ijobiy: takrorlanuvchanlik, `covers` dagi tarozi, `reference_material`; salbiy: namuna olish, bir jinslilik — `topdown.test.js`; usta va hisobotda — `tests/ui/topdown*.test.js`; shablonda — `tests/templates/topdown.test.js` | ✅ |
| **X12** — empirik kattalikda bias; "tayanch qiymat qaysi usul bilan olingan" savoli majburiy (egasi qarori 2026-11-17; QUAM §7.9.2–7.9.3) | `evaluateTopDown` (`referenceMethod`; `x12_empirical_bias`, `x12_bias_excluded`) | javob yo'q → qo'shiladi + X12; `other` → chiqariladi; `same` → qo'shiladi (bias, recovery, u(δ̂)); salbiy: biassiz, empirik bo'lmagan — `topdown.test.js`; usta savoli va oqimi — `tests/ui/topdown.test.js`, `topdown-app.test.js` | ✅ |
| X11 chop etilgan hisobotda ham chiqadi, yashirib bo'lmaydi (egasi qarori) | `report.js::printTopdown`, bosma CSS | `tests/ui/topdown.test.js` | ✅ |
| ν_eff (JCGM 100:2008 G.4.1 Eq. G.2b) ko'rsatiladi; ν_eff < 30 → t_P(⌊ν_eff⌋) taklifi; k = 2 o'zgarmaydi; hisobotda "k = 2, P ≈ 95 %" (egasi qarori; Nordtest §3.2) | `evaluateTopDown` (`nuEff`, `kSuggested`, `topdown_nu_low`) | `topdown.test.js` (4 test), `tests/ui/topdown.test.js` | ✅ (ν(bias) = N − 1 — R-20 dagi tafsilot) |
| Nisbiy va mutlaq aralashmasi → xato | `scale.js::stated`, `declaredScale` | `topdown_mixed_scale`, `topdown_need_scale`, `topdown_unit_mismatch` — `topdown.test.js` (4 test) | ✅ |
| Hisobot: y, U, nisbiy U %, k, yondashuv nomi (ISO/IEC 17025:2017 §7.8.3.1 c)) | `src/js/report.js::topdownSection` | `tests/ui/topdown.test.js` (uch tilda), `tests/ui/topdown-app.test.js` (usta boshidan oxirigacha, jsdom) | ✅ |
| U = 0 ogohlantirishsiz chiqmaydi | `evaluateTopDown` (`zero_u`) | `tests/ui/topdown.test.js` | ✅ |
| GUM va regressiya natijalari o'zgarmagan | `evaluate` (format bo'yicha uzatish) | 35 misolning natija JSON'i 2.1.0 bilan bayt darajasida bir xil (P09 da tekshirildi); 9 Excel nuqtasi, 10-test | ✅ |
| Mutatsiyaga sezgirlik (P09) | qo'lda: 2n → n (8 test yiqildi); √ yig'indi → oddiy yig'indi (8); s/√n → s/n (6); X11 o'chirildi (6); X12 o'chirildi (3) | — | ✅ |
| TOP_DOWN shablonlari | `interpreter.js::buildTopDownState`, sxema `topDown` | `tests/templates/topdown.test.js` (TD-01…TD-04) | ✅ (hammasi DRAFT, raqamsiz) |

## 9. P10: maxsus rejimlar (`src/engine/sampling/`, `qualitative/`, `micro/`, `medical/`)

| Talab (manba) | Dvigatel funksiyasi | Test | Holat |
|---|---|---|---|
| Klassik ichma-ich ANOVA: kvadratlar yig'indisi, s_between, s_samp, s_anal, % dispersiya (UfS:2019 Figure A1.2, p. 41) | `sampling/index.js::classicalAnova` | `ufs-a1-nitrate-classical` (11 kattalik, nisbiy 1·10⁻⁷); qo'lda hisoblangan 2 ob'ektli misol — `special-modes.test.js` | ✅ |
| Klassik ANOVA, U′ va ᶠU = exp(2·s_G) (UfS Figure A2.2, p. 48; Table A2.3, p. 49; Eq. 4, 5) | `evaluateSampling` (`logTransform`) | `ufs-a2-lead-classical` (23 kattalik; ᶠU = 2,6032 / 1,12 / 2,6207) | ✅ |
| Robust ANOVA: o'rtacha, s_between, s_samp, s_anal, s_meas, % dispersiya, U′ (UfS Figure A1.2, A2.2) | `robustAnova` | `ufs-a1-nitrate-robust` (14 kattalik), `ufs-a2-lead-robust` (13 kattalik) — nisbiy 2·10⁻⁴ | ✅ 4 qiymatli raqamgacha (qayta tiklangan algoritm — D-16, R-21) |
| s_meas² = s_samp² + s_anal²; U′ = 2·100·s_meas/x̄ (UfS Eq. 1–2, 4): A1 — 360,55 mg/kg; 16,4 % | `evaluateSampling` | `ufs-a1-nitrate-robust` (`uc`, `relU`); `special-modes.test.js` | ✅ |
| Manfiy dispersiya bahosi → 0 va ogohlantirish | `evaluateSampling` (`sampling_negative_variance`) | `special-modes.test.js` | ✅ |
| Muvozanatsiz dizayn, kam ob'ekt, log uchun musbat bo'lmagan qiymat → aniq xato / ogohlantirish | `evaluateSampling` | `special-modes.test.js` | ✅ |
| SS, SP, FP, FN ulushlari; LR(+), LR(−) (AQA:2021 §3.2, §4.2) | `qualitative/index.js::evaluateQualitative` | `aqa-e6-sarscov2` (SS 100 %, SP 97 %); `special-modes.test.js` | ✅ |
| Wilson score 95 % CI (AQA §4.4 Eq. 8–11): [96,3; 100], [91,6; 99,0]; 400/400 → 99 %; 5/5 → 57 % | `wilsonInterval` | `aqa-e6-sarscov2`; `special-modes.test.js` | ✅ (D-17: 91,55 vs 91,6) |
| Posterior ehtimol PP (AQA §4.3 Eq. 6; Table E3.1): 0,963; 0,988; 0,963 | `posterior`, `evaluateQualitative` (`rates`, `prevalence`) | `aqa-e3-emit-opiates`, `-methadone`, `-cocaine` | ✅ (D-15) |
| Clopper–Pearson (aniq binomial; loyiha qo'shimchasi — laboratoriya sozlamasi): 7/20, 97/100, 100/100, 0/50, 3/100, 45/60 (P = 0,95), 7/20 (P = 0,99) | `clopperPearsonInterval` | SciPy 1.18.1 — `scipy.stats.binomtest(x, n).proportion_ci(confidence_level=P, method="exact")` bilan 10⁻¹⁰ gacha; analitik: x = n → (α/2)^(1/n), simmetriya — `special-modes.test.js` | ✅ mustaqil ochiq dastur (qiymatlar sessiyada hisoblangan — RISKS R-21) |
| Interval usuli tanlovi (egasi qarori 2026-11-18): standart Wilson; `ciMethod: 'clopper_pearson'`; bosma hisobotda faqat tanlangani, usul nomi va P | `evaluateQualitative`, `report.js::qualitativeSection` | `special-modes.test.js`, `tests/ui/special.test.js` | ✅ |
| Mikrobiologiya: u_Poisson = 0,4343/√ΣC; u_tech dublikatlarning log₁₀ farqlaridan; interval [10^(y−U); 10^(y+U)] (ISO 19036 — pullik) | `micro/index.js::evaluateMicro` | analitik testlar — `special-modes.test.js` | ❔ BETA / unverified |
| Tibbiy laboratoriya: u = √(u_cal² + u_Rw² [+ u_bias²]) IQC darajalari bo'yicha (ISO/TS 20914 — pullik) | `medical/index.js::evaluateMedical` | analitik testlar — `special-modes.test.js` | ❔ BETA / unverified |
| BETA modullar: har doim `*_unverified` ogohlantirishi, hisobotda (bosmada ham) "BETA"; shablon APPROVED bo'la olmaydi | `evaluateMicro`, `evaluateMedical`; `interpreter.js::checkSpecialTemplate` | `special-modes.test.js`, `tests/ui/special.test.js` | ✅ |
| Hisobotda qo'llanilgan yondashuv va cheklovlar yozilgan (uch tilda) | `src/js/report.js::specialSection` | `tests/ui/special.test.js` | ✅ |
| "Maxsus rejimlar" oynasi: Excel'dan qo'yish, o'nlik vergul, bo'sh maydon ≠ 0, escape (XSS), CSP | `src/ui/special/*` | `tests/ui/special.test.js` (kontroller jsdom'da boshidan oxirigacha) | ✅ |
| Mavjud natijalar o'zgarmagan | `evaluate` (format bo'yicha uzatish) | 43 misolning natija JSON'i 2.2.0 bilan bayt darajasida bir xil (P10 da tekshirildi); 9 Excel nuqtasi, 10-test | ✅ |
| Mutatsiyaga sezgirlik (P10) | qo'lda: σ_s² dagi /2 olib tashlandi (22 test yiqildi); robust τ² bo'luvchisi n → n − 1 (21); Wilson dagi z²/(4n²) hadi (7); Clopper–Pearson parametri (2); Puasson 1/√C → 1/C (2); kvadratlar yig'indisi → oddiy yig'indi (3) | — | ✅ |

## 10. P05a: metrologik linter (`src/engine/linter/`), asoslangan qabul, hisobot belgilari

Qoidalar va manbalari — [LINTER_RULES.md](LINTER_RULES.md). Linter hisob natijasini o'zgartirmaydi.

| Talab (band) | Funksiya | Test | Holat |
|---|---|---|---|
| Kalibrlanayotgan asbob MPE si byudjetda bo'lmasligi (JCGM 100:2008 3.4.5, F.2.4.2; CLAUDE.md) | X1 `x01-mpe-in-budget.js` | `linter.test.js`; `linter-fixtures.test.js` — gazoanalizator qo'llanmasidagi asl protsedura (`.docx` iqtiboslari: u(Δк) = 0,23136; U = 0,463) | ✅ |
| Noaniqlik nol bo'la olmaydi (JCGM 100:2008 3.3.1, F.2.2.1) | X8 `zero_u` (error) | `linter-fixtures.test.js` — nol nuqtada «0 ± 0»; `linter.test.js` | ✅ |
| U ≥ CMC (ILAC P14:09/2020 §5.5) | X8 `below_cmc` (error) | `linter.test.js` | ✅ (havola P05b da PDF bilan solishtirildi) |
| Sertifikat U / k (4.3.3); ikki marta hisoblamaslik (4.3.10); korrelyatsiya (5.2.2–5.2.5); rezolyutsiya δ/(2√3) (F.2.2.1) | X2, X3, X4, X5 | `linter.test.js` (ijobiy + salbiy) | ✅ |
| Birliklar (5.1.3; GUM-6 — repoda yo'q) | X6 | `linter.test.js` | ✅ / ❔ |
| k = 2 ning ishonchliligi (EA-4/02 M:2022 §5.1–5.5; JCGM 100 G.6.6) | X7 | `linter.test.js` | ✅ (chegaralar — loyiha qarori) |
| U ≤ 2 qiymatli raqam, y — U xonasigacha (JCGM 100 7.2.6) | X9 `lintReported`; hisobot o'z satrlarini tekshiradi | `linter.test.js` (`rounding.js` chiqishi har doim o'tadi) | ✅ |
| Etalon drifti (EA-4/02 M:2022 App. C, S2.4) | X10 (info) | `linter.test.js` | ✅ |
| X11, X12 (Nordtest TR 537 §3.2; QUAM:2012 §7.9) — R-20 qarorlari saqlangan | X11, X12 (dvigatel belgisidan) | `linter.test.js`; `tests/engine/topdown.test.js`, `tests/ui/topdown*.test.js` (o'zgarmagan holda o'tadi) | ✅ |
| Ulush > 90 %; n < 3; ν ≤ 0; Grubbs (ISO 5725-2 — repoda yo'q) | A1, A2, A3, A4 | `linter.test.js` | ✅ / ❔ (A4) |
| Modul ogohlantirishlari `result.findings` da, kodlar o'zgarmagan | W1, W2 | `linter.test.js` (har bir ogohlantirish — bitta topilma) | ✅ |
| 9 ta etalon nuqtada `error` yo'q | `lint` | `linter-fixtures.test.js` (topilmalar ro'yxati qayd etilgan — faqat info) | ✅ |
| Model turi; muvofiqlik \|y\| ni xato deb faraz qilmaydi (RISKS R-07; ISO/IEC 17025 §7.8.6, JCGM 106 — repoda yo'q) | `evaluate` (`modelKind`, `deviation`), `conformity`, M1 | `linter.test.js`; `api.test.js`; `tests/ui/findings.test.js`; migratsiya — `tests/storage/*.test.js` | ❔ (loyiha qoidasi) |
| Asoslangan qabul: izoh ≥ 10 belgi; audit zanjiri (rol, vaqt, topilma id, izoh) — ISO/IEC 17025 §7.5, §7.11.3 | `src/storage/acceptance.js`; `withAcceptances`, `reportStatus` | `tests/storage/acceptance.test.js`; `linter.test.js` | ✅ |
| Barcha topilmalar bosma hisobotda; "RASMIY EMAS"; U = 0 / U < CMC belgisi yoki bloklash; ν qoidasi, MC seed va M, BETA (RISKS R-05) | `src/report/findings.js`; `src/js/report.js` | `tests/ui/findings.test.js` (jsdom); brauzerda (Chromium) boshidan oxirigacha ko'rildi | ✅ |
| Matnlar uch tilda; i18n'dan tashqari matn yo'q (RISKS R-13) | `i18n-linter.js`, `i18n-admin.js` | `tests/i18n.test.js` (skaner: `tests/tools/hardcoded-text.js`) | ✅ |
| Mavjud natijalar o'zgarmagan | `evaluate` | 55 misolning natija JSON'i 2.3.0 bilan bayt darajasida bir xil (yangi maydonlardan tashqari); 9 Excel nuqtasi, 10-test | ✅ |

## 11. P05b: import/eksport, hisobot shakllari, qaror qoidasi

| Talab (band) | Funksiya | Test | Holat |
|---|---|---|---|
| Muvofiqlik ehtimoli p_c, normal taqsimot (JCGM 106:2012 §7.3.3 Example 1 — p. 15: p_c = 0,92; Example 2: 0,99; §7.4 — p. 16; Table 1) | `src/engine/decision.js::conformanceProbability` | `tests/engine/decision.test.js` (sahifa havolasi bilan) | ✅ |
| Himoya zonasi w = r·U, qabul oralig'i (JCGM 106:2012 §8.3.2; §8.3.2.3 — p. 22) | `decide` | `decision.test.js` | ✅ |
| r = 0; 0,83; 1; 1,5; 3 uchun eng katta noto'g'ri qabul ehtimoli (ILAC G8:09/2019 Table 1 — p. 12) | `decide` (`maxFalseAccept`) | `decision.test.js` | ✅ |
| Binar / nobinar bayonot (ILAC G8:09/2019 §4.2.1–4.2.3) | `decide` (`statement`, `verdict`) | `decision.test.js` | ✅ |
| TUR = T / (2U) (JCGM 106 §7.6.2 C_m; ILAC G8 §1.13) | `decide` (`tur`) | `decision.test.js` | ✅ (ta'rif — loyiha qarori, R-22) |
| Bir va ikki tomonlama chegaralar (JCGM 106 §7.3, §8.3.3) | `decide`, `decisionInput` | `decision.test.js` | ✅ |
| Qoida yoki chegara yo'q → bayonot yo'q (ISO/IEC 17025 §7.1.3 — ILAC G8 §2.3 orqali) | `decisionInput` (`pending`), D1 | `decision.test.js`; `linter.test.js`; `tests/report/forms.test.js` | ✅ |
| Ko'p nuqtali hisobot = Excel "Xulosa" jadvali (gazoanalizator 3 nuqta, termometr 5 nuqta; katak havolalari testda) | `src/report/summary.js::summaryRows`, `forms.js::buildReport` | `tests/report/forms.test.js` | ✅ |
| 4 ta shakl; rekvizitlar yetishmasa ogohlantirish (ISO/IEC 17025:2017 §7.8.2.1, §7.8.3.1, §7.8.4.1 — repoda yo'q) | `forms.js`, `requisites.js::missingRequisites` | `forms.test.js` | ❔ (rekvizitlar ro'yxati unverified) |
| Normativ havolalar hisobot tilida; ekvivalent faqat tasdiqlangani (JCGM 106 = ISO/IEC Guide 98-4:2012 — ILAC G8 §9 [2]) | `normative.js` | `forms.test.js` | ✅ (GOST 34100.3 — qo'shilmagan, R-22) |
| Kanonik JSON (RFC 8785 JCS) SHA-256; kalitlar tartibiga bog'liq emas | `src/storage/canonical.js::canonicalizeJcs`, `jcsHash` | `tests/io/calc-json.test.js` | ✅ |
| JSON eksport → import → qayta hisob bit darajasida bir xil | `src/io/calc-json.js` (`buildCalcDoc`, `parseCalcDoc`, `reproduce`) | `calc-json.test.js`; `tests/ui/io.test.js` | ✅ |
| Hisobot pasti: versiya, build, shablon, hisob ID / sana, xesh, QR; bosma xesh = eksport xeshi | `footer.js` | `forms.test.js`; brauzerda (Chromium) ko'rildi | ✅ |
| `.xlsx` / `.csv` import: hajm, qator, ustun, varaq, ZIP chegaralari; formula bajarilmaydi; HTML / skript escape | `src/io/import.js`, `csv.js`, `table-text.js`; `src/ui/io/app.js` | `tests/io/import.test.js`, `table-text.test.js`, `tests/ui/io.test.js` | ✅ |
| `.xlsx` / `.csv` eksport: sonlar yaxlitlanmagan; formula-inyeksiya zararsizlantirilgan | `export-table.js`, `xlsx-write.js`, `csv.js` | `tests/io/export.test.js` | ✅ |
| Vendor: aniq versiya, LICENSE, SHA-256; npm `xlsx` yo'q; faqat dinamik import; CSP o'zgarmagan; `src/io/` da tarmoq chaqiruvi yo'q | `vendor/`, `src/io/vendor.js` | `tests/security/vendor.test.js`; `import.test.js` | ✅ |
| Shaxsiy rekvizitlar Firebase'ga yozilmaydi (faqat `sessionStorage`) | `src/ui/report/app.js`, `requisites.js::splitRequisites` | `forms.test.js`; brauzerda saqlash joylari tekshirildi | ✅ |
| Mavjud natijalar o'zgarmagan | `evaluate` | 52 misolning natija JSON'i 2.4.0 bilan bir xil (`engineVersion`, `decision`, D1, `ref` dan tashqari); 9 Excel nuqtasi, 10-test | ✅ |

## 12. P06: Monte-Karlo 2.0 (`src/engine/mc/`, `montecarlo.js`)

Manba — JCGM 101:2008 (repoda). "Mustaqil tekshiruv" — manba qiymati emas, statistik yoki qo'lda hisob.

| Talab (band) | Funksiya | Test | Holat |
|---|---|---|---|
| Kengaytirilgan Wichmann–Hill: a, b, c, d konstantalari (C.3.3.2, Table C.2 — p. 61) | `mc/rng.js` (`WH_A…WH_D`) | `mc-rng.test.js`: konstantalar; d_j = a_j·b_j + c_j | ✅ |
| 64 bitli shakl i_j = (a_j·i_j) mod d_j (C.3.3.3) = Table C.2 dagi 32 bitli shakl; ko'paytma < 2⁵³ | `wichmannHill`, `wichmannHillStep32` | `mc-rng.test.js`: 10⁵ qadam × 3 urug'; BigInt bilan 2·10⁴ qadam; eng katta ko'paytma 100 938 168 924 626 | ✅ (manbaning ikki ta'rifi o'zaro) |
| Generator sifati (C.3.2.1 a) | `wichmannHill` | χ² (100 katak, N = 10⁶), Kolmogorov–Smirnov (N = 10⁵), ketma-ket korrelyatsiya (kechikish 1…10), juftliklar 20 × 20 — 3 urug' | ✅ mustaqil tekshiruv (manbada sonli test qiymatlari yo'q; BigCrush — manbaning o'z bayoni, C.3.2.2) |
| Bir xil urug' → har qanday kompyuterda bir xil natija (C.3.2.1 c) | `wichmannHill` | muzlatilgan qiymatlar (`fixtures/mc-rng-golden.json`); Node 22 ↔ Chromium 157 — R(0, 1) va to'liq MCM natijasi (qat'iy va adaptiv) bit darajasida bir xil | ✅ (V8); boshqa JS dvigatellari — tekshirilmagan (R-23) |
| Box–Muller (C.4, Table C.3 — p. 62) | `makeGauss` | `mc-distributions.test.js`: formula, momentlar, KS | ✅ |
| t-taqsimot (C.6, Table C.5 — p. 63) | `sampleT` | KS: ν = 2; 3; 5; 8; 18; 24; 6,93; dispersiya ν/(ν − 2) | ✅ |
| To'g'ri burchakli (§6.4.2), uchburchak (§6.4.5), arksinus (§6.4.6), eksponensial (§6.4.10) — E, V va tanlash formulasi | `sampleRect`, `sampleTriang`, `sampleArcsine`, `sampleExp` | momentlar (4,5 standart xato) + KS | ✅ |
| Trapetsiya (§6.4.4: E, V, Eq. 7) | `sampleTrap`, `typeB` (`trap`) | momentlar, KS; β = 0 / 1 chegaralari | ✅ |
| Egri trapetsiya (§6.4.3, Eq. 3–4; misol 10,0 V ± 0,1 V, d = 0,05 → u = 0,060 V — p. 21) | `sampleCTrap`, `typeB` (`ctrap`) | momentlar; Eq. (3) zichligini integrallab KS; misol qiymati | ✅ |
| Log-normal | `lognormalParams` | momentlar, KS | ❔ unverified (JCGM 101 da yo'q) — mustaqil tekshiruv |
| Ko'p o'lchovli Gauss, Cholesky (C.5, Table C.4; misol C.5.3 — p. 63) | `cholesky`, `sampleMvn` | RᵀR = V; tanlanma kovariatsiyasi; musbat aniqlanmagan → null | ✅ |
| δ = ½·10^l (§7.9.2, Examples 1–3 — p. 31) | `numericalTolerance` | `montecarlo.test.js` (3 misol + §9 dagi δ lar) | ✅ |
| Intervallar: q, r (§7.7.2 — p. 30) | `coverageIntervals` | qo'lda hisoblangan misollar | ✅ |
| Adaptiv protsedura (§7.9.4 — p. 32): M = max(J, 10⁴), 2s ≤ δ | `createMonteCarlo` | `montecarlo.test.js`; Table 2 (M 1,30·10⁶ — manbada 1,23 va 1,02·10⁶), Table 4 (0,05·10⁶ — 0,03 va 0,08), Table 6 (0,63·10⁶ — 0,72), Table 11 (0,99…1,50·10⁶, 12 urug' — 1,26) | ✅ |
| GUM tekshiruvi (§8.1.3): Table 2 — Yes; Table 4 — No (d = 2,8 / 2,9); Table 6 GUF1 — No (d_low 0,045 1, d_high 0,043 0) | `monteCarlo` (`dLow`, `dHigh`, `validated`) | `jcgm101-9-2-2-mcm-adaptive`, `-9-2-4-mcm-adaptive`, `-9-3-mcm-adaptive` | ✅ |
| §9.4 solishtirish yo'qotishi: Table 8 (r = 0), Table 9 (r = 0,9) — 6 holat, M = 10⁶ | `monteCarlo` | `jcgm101-9-4-mcm-x0-r0` … `-x005-r09` (tolerans: ½ oxirgi xona + o'lchangan tarqoqlik — `tests/tools/mc-scatter.js`) | ✅ |
| §9.5 KMD: Table 11 MCM — 838 nm, 36 nm, [745, 932] nm (99 %) | `monteCarlo` (adaptiv, n_dig = 2) | `jcgm101-9-5-mcm` | ✅ (D-18) |
| Nochiziqli model Y = X², x̄ = 0 — LPU rad etiladi | M3 | `montecarlo.test.js` (analitik: u²·χ²₁) | ✅ mustaqil hisob |
| Normal bo'lmagan korrelyatsiya → natija yo'q + M2; `invalid_covariance` | `createMonteCarlo` | `montecarlo.test.js` | ✅ (loyiha qarori, R-23) |
| Eski generator bilan 2.5.0 natijasini takrorlash | `mc/legacy.js` | `mc-legacy.test.js` (6 hisob, `Object.is`) | ✅ (regressiya) |
| 10-test: gazoanalizator 2-nuqta (qo'llanma 9.1-jadval) | `monteCarlo` | `excel-gas-p2-mc` — n_dig = 2, tolerans δ + 2·s_ref (egasi qarori Q-3 (b)); `excel-gas-p2-mc-ndig1` | ✅ (D-04 yopildi) |
| ν ≤ 2: u(y) aniqlanmagan, mezon faqat interval uchlari (§6.4.9.4, §7.6 Note 2; egasi qarori Q-5) | `createMonteCarlo` (`criteria: 'auto'`, `uDefined`) | `montecarlo.test.js`; `tests/ui/mc.test.js` (matn uch tilda) | ✅ |
| GUM tekshiruvida MCM toleransi δ/5 (§8.2; egasi qarori Q-8); erishilgan tolerans hisobotda; δ ga tushirish belgilanadi | `mcOptions` (`validation`, `tolDivisor`), `result.validation` | `montecarlo.test.js`; `tests/ui/mc.test.js` | ✅ |
| Shablon sxemasida yangi taqsimotlar (trap, ctrap, exp, lognorm) | `schemas/methodology.schema.json`, `src/templates/interpreter.js` | `tests/templates/workflow.test.js` | ✅ |
| Web Worker, progress, bekor qilish; worker'siz bo'laklab (R-16) | `src/ui/mc/` | `tests/ui/mc.test.js`; **Chromium 157 (headless), haqiqiy CSP bilan:** worker — M = 10⁶ 1,0 s, asosiy oqimda eng uzun to'xtash 12 ms, 63 kadr; worker'siz — 1,1 s, 70 ms; konsolda xato yo'q | ✅ |
| LPU natijalari o'zgarmagan | `evaluate` | 61 misolning natija JSON'i 2.5.0 (`c1cccce`) bilan bayt darajasida bir xil; 9 Excel nuqtasi | ✅ |

