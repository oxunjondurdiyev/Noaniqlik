# Validatsiya matritsasi (RTM): me'yoriy talab → dvigatel funksiyasi → test → holat

> Holat: P04, 2026-11-17 (P03 qatorlari o'zgarmagan). Dvigatel `src/engine/*` (ES modullar), `ENGINE_VERSION` 2.0.0, API — [ENGINE_API.md](ENGINE_API.md). Yaxlitlash — `src/report/rounding.js`.
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

## 6. P04: metodika shablonlari

| Talab | Funksiya | Test | Holat |
|---|---|---|---|
| Shablon sxemasi (uc-template/1), o'z validator | `schemas/methodology.schema.json`, `src/templates/validator.js` | `tests/templates/workflow.test.js`, `schema` tekshiruvi barcha 35 shablonda | ✅ |
| Shablon → modelSpec → evaluate (dvigatel o'zgarmagan) | `src/templates/interpreter.js` | `tests/templates/*.test.js` | ✅ |
| 11 ta eski preset JSON'da, P03 bilan bit darajasida bir xil | `templates/builtin/legacy-*.json` | `tests/templates/builtin.test.js` (snapshot `snapshots/legacy-p03.json` + jonli P03 holati) | ✅ |
| Zichlik, gazoanalizator (3), termometr (5) shablonlari Excel bilan | `legacy-density`, `legacy-gas_analyzer`, `legacy-thermometer` | `builtin.test.js` ← `tests/cases/excel/*.json` (katak havolalari) | ✅ / ⚠️ D-03 (term p2–p4 ν_eff, avvalgidek) |
| Bitta asbob korrelyatsiyasi u(xi,xj) = r·u_X(xi)·u_X(xj) (§5.2.2, F.1.2.3) | `interpreter.js::prepareState` | `workflow.test.js`, `wave1.test.js` (analitik) | ✅ (sintetik) |
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
