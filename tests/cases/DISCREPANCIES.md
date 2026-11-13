# Farqlar reyestri (P01, 2026-11-13; P03 da yangilandi)

Bu faylda uch turdagi farqlar qayd etilgan:

- **A. Dvigatel ↔ manba.** Ular `knownDiscrepancies` da todo-test sifatida yuritiladi. PLAN P01 bo'yicha **tuzatilmaydi**, tuzatish P03 da va egasining roziligi bilan bo'ladi.
- **B. Manbaning o'zidagi nuanslar.**
- **C. Gemini hisoboti ↔ asl manba.** Gemini raqamlari test qiymati sifatida ishlatilmagan.

> **P03 holati (2026-11-13, ENGINE_VERSION 2.0.0, `src/engine/`):** D-01, D-02, D-07 — **yopildi (P03)**; D-09 — 2-tartibli hadlar qo'shildi (diagnostika), U = 0 ni bloklash — P05; D-03 — todo (Q-2); D-04 — n_dig = 2 todo → P06 (Q-3); D-05 — manba nuansi. Yangi: D-11 (GUM Table G.2 nuansi). Egasining Q-1…Q-4 javoblari pastda.

P01 dagi dvigatel: `src/js/calc.js`, `ENGINE_VERSION` 1.0.0. Hech bir farq **hisobotda ko'rinadigan (yaxlitlangan) natijani o'zgartirmaydi**: 9 ta Excel nuqtasining `expectedDisplay` qiymatlari (U va y) hammasi mos keladi.

## A. Dvigatel ↔ manba (todo-testlar)

| ID | Qayerda | Manba qiymati | Dvigatel | Nisbiy farq | Sabab | Bosqich |
|---|---|---|---|---|---|---|
| **D-01** — **yopildi (P03)** | `excel-gas-p1`, `excel-term-p1`, `-p3`, `-p4`: k, U | k = 2,000 002 443 899 6 (`NORMSINV(0,97725)`, masalan `Nuqta_1!D38`) | 2,000 002 405 781 | −1,9·10⁻⁸ | ν katta bo'lganda dvigatel normal kvantilni `erf` ning Abramowitz–Stegun 7.1.26 approksimatsiyasi bilan hisoblaydi (xatosi ~10⁻⁷). Mustaqil tekshiruv: Python `statistics.NormalDist().inv_cdf(0.97725)` = 2,000 002 443 899 6 — Excel bilan mos. **Dvigatel xatosi** (RISKS R-03). | P03 (t-kvantil 1e-6 aniqlik talabi) |
| **D-02** — **yopildi (P03)** | `excel-term-p2` (ν_eff = 1438), `excel-term-p5` (ν_eff = 3416): k, U | Excel: ν_eff ≥ 1000 bo'lsa k = z (normal), `Nuqta_2!D39` = 2,000 002 | t(⌊ν⌋): 2,001 742 (p2), 2,000 735 (p5) | +8,7·10⁻⁴, +3,7·10⁻⁴ | k tanlash chegarasi har xil: Excel normal kvantilga ν ≥ 1000 da o'tadi, dvigatel ν ≤ 5000 gacha t-taqsimotni ishlatadi (ν = 5000 da sakrash — R-03). GUM G.4.1/G.6.4 bo'yicha t(ν_eff) to'g'ri, normalga o'tish — konventsiya. **Metrologik qaror egasida — Q-1.** | P03 |
| **D-03** — todo (Q-2) | `excel-term-p2`, `-p3`, `-p5`: ν_eff | `Nuqta_2!D38` = 1438,575 53 | 1438,576 41 | +6·10⁻⁷ … +2,7·10⁻⁶ | Excel B tur komponentlariga ν = 10⁹ qo'yadi (cheksizlik o'rniga, `Nuqta_i!L27:L35`); bu Welch–Satterthwaite maxrajiga kichik hissa qo'shadi. Dvigatel ν_B = ∞ (GUM G.4.2). Dvigatel xatosi emas, **Excel konventsiyasi**. Tolerans qarori — Q-2. | P03 (yoki tolerans qarori) |
| **D-04** — n_dig = 1 majburiy, n_dig = 2 todo → P06 (Q-3) | `excel-gas-p2-mc` (10-test): 95,45 % MC intervali | qo'llanma 9.1-jadval: [−0,0111; 0,0469] | ehtimollik bo'yicha simmetrik: [−0,010 92; 0,046 83]; eng qisqa: [−0,011 25; 0,046 48] | Δ = 1,8·10⁻⁴; 6,6·10⁻⁵ (δ = 5·10⁻⁵ da) | (1) M = 10⁶ da interval uchlarining tarqoqligi δ(n_dig = 2) = 5·10⁻⁵ dan katta. Mustaqil MCM (OS CSPRNG, 8 ta takror, `scratchpad`) o'rtacha [−0,0110; 0,0469] bergan; uchlarning takrorlar orasidagi s.o. 1,2·10⁻⁴ / 0,9·10⁻⁴, ya'ni qo'llanma qiymati tasdiqlanadi, lekin bitta M = 10⁶ simulyatsiyasi n_dig = 2 aniqlikni ta'minlay olmaydi. (2) Dvigatel RNG si — qat'iy urug'li xorshift32 (R-06). (3) I uchun t-taqsimotning ν = 2 — dispersiya cheksiz (JCGM 101 6.4.9), shuning uchun MCM u(y) barqaror emas. n_dig = 1 (δ = 5·10⁻⁴) bilan `excel-gas-p2-mc-ndig1` o'tadi. **Qaysi n_dig majburiy — Q-3.** | P06 (adaptiv M, JCGM 101 7.9) |
| **D-05** | `jcgm100-h2-X`: u_c(X) | Table H.3: 0,295 Ω | 0,295 58 Ω (→ 0,296) | +2·10⁻³ | 1-yondashuv (5.2.2 Eq. 16, juftlangan korrelyatsiya bilan) aniq hisobda 0,2956 beradi. Manbadagi 0,295 aslida 2-yondashuv qiymati (Table H.4: X_k lardan s/√5 = 0,2948). GUM ikkala yondashuv bir xil deydi (H.2.4), lekin 3-xonada farq bor. R va Z mos. **Manba nuansi**, dvigatel xatosi emas. | — (manba) |

### P03 da yopilgan farqlar — qanday yopildi

| ID | Yechim | Tekshiruv |
|---|---|---|
| D-01 | `src/engine/special.js::normalQuantile` — Wichura AS241 (PPND16). | `tests/engine/quantiles.test.js`: NORMSINV(0,97725) = 2,000 002 443 899 6 (1e-12, `Nuqta_1!D38`); mpmath bilan 1e-13. `excel-gas-p1`, `-term-p1`, `-term-p4` da k, U 1e-9 da o'tadi (todo emas). |
| D-02 | Egasi qarori Q-1(a): k = t(⌊ν_eff⌋) har doim, chegara yo'q; ν = ∞ → Φ⁻¹. | `excel-term-p2`, `-p3`, `-p5`: k, U toleransi 1e-3, sababi testda ("Excel ν ≥ 1000 da z ishlatadi; egasi qarori Q-1(a) — GUM G.4.1"). `-p3` (ν_eff = 5279) ham shu sababga ko'ra qo'shildi: P00 da u D-01 ostida edi (ν > 5000 → z), Q-1(a) dan keyin farq +2,4·10⁻⁴. `expectedDisplay` uchala nuqtada o'zgarmadi. Uzluksizlik va monotonlik testi (ν = 1000, 2000, 5000 atrofida). |
| D-07 | c_i — simvolik hosila (`parser.js::derivative`), sonli — zaxira/o'zaro tekshiruv, h = ε^⅓·max(|x|, u). | `tests/engine/sensitivity.test.js`: `jcgm100-h1` c_d = 1 (1e-12); 11 funksiya turida simvolik ↔ sonli. |
| D-09 | 2-tartibli hadlar (GUM 5.1.2 Note) — `sensitivity.js::secondOrderTerms`, standartda faqat diagnostika. | Y = X², x̄ = 0 → u² = 2u⁴; GUM H.1.7 (11,7 nm, 1,7 nm; u_c 32 → 34 nm) — `jcgm100-h1-2nd` va `second-order.test.js`. U = 0 ni hisobotda bloklash — P05. |

### P03 da topilgan yangi nuans

| ID | Qayerda | Kuzatuv | Qanday hisobga olingan |
|---|---|---|---|
| **D-11** | JCGM 100:2008 Table G.2 (78-bet), ν = 35, p = 90 % | Jadvalda **1,70**; aniq qiymat t₀.₉₀(35) = 1,689 57 (→ 1,69). Mustaqil mpmath hisobi ham 1,689 572 46 beradi. Jadvalning qolgan 167 katagi ±½ oxirgi xona ichida mos. | Manba nuansi (yaxlitlash). `quantiles.test.js` da shu katak uchun ≤ 0,011 farq ruxsat etilgan va izohlangan. |

## B. Manba nuanslari va kuzatuvlar (test yiqilmaydi)

| ID | Qayerda | Kuzatuv | Qanday hisobga olingan |
|---|---|---|---|
| **D-06** | QUAM A1 (`quam-a1`) | Manba u(V) ni komponentlardan 0,066 mL deb hisoblab, uni **0,07** ga yaxlitlab ishlatgan (Table A1.2, A1.3). Natijada u_c = 0,863 → 0,9 mg/L. Komponentlardan to'g'ridan-to'g'ri hisob u_c = 0,835 mg/L beradi (→ 0,8). | Test manba ishlatgan u(V) = 0,07 bilan yozilgan. U = 2 × 0,9 = 1,8 uchun tolerans ±0,15. |
| **D-07** — **yopildi (P03)** | `jcgm100-h1`, `ea4-02-s3` | Dvigatelning sonli hosilasi xatosi: H.1 da c_d = 1,000 006 5 (aniq qiymati 1), S3 da c_{δR_D} = 0,999 989 (aniq qiymati r_C·r = 1,000 010 5). Nisbiy xato 10⁻⁶…10⁻⁵ — katta qiymatli kirishlarda (l_S = 5·10⁷ nm, R_S = 10⁴ Ω) qadam h noto'g'ri tanlanadi. Natijalar manba aniqligida mos. | RISKS R-02 → P03 (simvolik hosila + sonli o'zaro tekshiruv). |
| **D-08** | `jcgm100-h2-R` | Korrelyatsiyalangan kirishlarda Welch–Satterthwaite ν_eff(R) = 0,13 (< 1) beradi. Manba ν bermaydi; GUM G.4.1 formulasi faqat mustaqil kirishlar uchun. | Test qilinmagan. P03/P05: korrelyatsiya bo'lsa ν_eff uchun ogohlantirish (linter). |
| **D-09** — qisman (P03: 2-tartibli hadlar) | `jcgm101-9-4-x0-r0-guf1` | 1-tartibli GUF u = 0 beradi (manbaga mos, lekin noto'g'ri — 9.4.2.2.8). Dvigatel `zero_u` ogohlantirishini chiqaradi (testda tekshiriladi). | 2-tartibli hadlar — P03; U = 0 ni hisobotda bloklash — P05. |
| **D-10** | `tests/fixtures/README.md`, `tests/verify-excel.js` | `verify-excel.js` sarlavhasidagi fayl nomi `…gazoanalizator.xlsx` haqiqiy fixture nomiga (`…_KEDR-07.xlsx`) mos emas edi (PLAN P01). | Tuzatildi (izoh). |

## C. Gemini hisoboti (`docs/audit/gemini-audit-2026-11.md` §8.1, T1–T18) ↔ asl manba

| T | Gemini manbasi | Tekshiruv natijasi | Bizdagi misol |
|---|---|---|---|
| T1 | Zichlik Excel | Raqamlar Excel bilan mos (0,998 209 8; 0,000 628 65; 996,01; 2,0025; 0,001 258 9). | `excel-density` (Excel kataklaridan) |
| T2 | KEDR-07, 1-nuqta | Mos (u_c = 0,003 089 8; U = 0,006 179 6 → 0,0062). | `excel-gas-p1` |
| T3 | KEDR-07, 2-nuqta + MC | Mos (ν 6,9307; k 2,5165; U 0,020 781; MC [−0,0111; 0,0469]). | `excel-gas-p2`, `excel-gas-p2-mc` |
| T4 | KEDR-07, 3-nuqta | Mos. "COOMET §5.7.3 yagona k = 2,52 (U = 0,031)" — COOMET R/GM/32 `docs/references/` da yo'q → **tekshirilmagan**. | `excel-gas-p3` |
| T5 | MS-MK-3, 5 nuqta | Mos (ν_eff 2,01·10⁹ / 1438,58 / 5279,34 / 1,52·10⁹ / 3416,37; muvofiqlik `Nuqta_4!D50`, `Nuqta_5!D50` = "NOANIQ ZONA"). | `excel-term-p1…p5` |
| T6 | GUM H.1 + JCGM 101 §9.5 + "NPL MS1" | Gemini y, ν, k, U ni "manbada yo'q" deydi — **noto'g'ri**: GUM H.1.5–H.1.6 (l = 50,000 838 mm, ν_eff = 16,7, k₉₉ = 2,92, U₉₉ = 93 nm) va JCGM 101 Table 11 (GUF 838/32/[745, 931]; MCM 838/36/[745, 932]) bularni beradi. "NPL MS1" hisoboti repoda yo'q. | `jcgm100-h1`, `jcgm101-9-5-guf`, `jcgm101-9-5-mcm` (pending) |
| T7 | JCGM 101 §9.3 + "NPL MS1" | Kirishlar mos; natijalarni "manbada yo'q" deydi — **noto'g'ri**: Table 6 (GUF1 1,2340/0,0539/[1,1285; 1,3395]; MCM 1,2341/0,0754/[1,0834; 1,3825]). | `jcgm101-9-3-guf1`, `jcgm101-9-3-mcm` |
| T8 | GUM H.3 | y₁ = −0,1712, y₂ = 0,00218, s(y₁), s(y₂), r = −0,930, s = 0,0035 mos. "t = 23,8 °C da b = −0,1629, u_c = 0,0011" — **manbada yo'q**: GUM b(30 °C) = −0,1494 °C, u_c = 0,0041 °C ni beradi (H.3.4, Eq. H.14); 0,0011 — t̄ dagi s(y₁′) (H.17). | `jcgm100-h3` (pending → P08) |
| T9 | GUM H.4 | Gemini "manbada yo'q" deydi — GUM H.4 da raqamli natijalar bor. Hozircha misol yozilmagan. | — (keyingi nomzod) |
| T10–T13, T17 | ISO/TS 28037/28038, GTC hujjati, PMC maqola | Pullik ISO va tashqi manbalar `docs/references/` da yo'q → **tekshirilmagan** (CLAUDE.md: GTC/MSL, NIST ochiq manbasi qo'shilgach). | — (P08) |
| T14 | NIST Uncertainty Machine qo'llanmasi | PDF repoda yo'q → **tekshirilmagan**. | `nist-um-ratio` (unverified) |
| T15 | Nordtest TR 537 | "148 ± 10 µg/L" manbada bor (TR 537 ed.4, 6–7-betlar, natijani ifodalash misoli: "Concentration of ammonium nitrogen (NH4-N) = 148 ± 10 µg L-1", ±7 %). u(R_w), u(bias) qiymatlari P09 da sahifa bilan ko'chiriladi. | `nordtest-tr537-nh4n` (pending → P09) |
| T16 | "EA-4/02 M:2022 Supplement S1" (Y = X²) | **Havola noto'g'ri**: EA-4/02 M:2022 da S1 — "Introduction" (28-bet); Y = X² misoli yo'q (RISKS R-02). Formula u = √2·s² (m = 0) — GUM 5.1.2 Note dan kelib chiqadi, lekin bu raqamli misol emas. | P03: mustaqil qo'lda hisob bilan |
| T18 | QUAM A1–A6 | Gemini A1 natijalarini "manbada yo'q" deydi — **noto'g'ri**: Table A1.1 va A1.5–A1.6: 1002,7 ± 1,8 mg/L (u_c = 0,9). | `quam-a1` |

## Egasining javoblari (2026-11-13)

- **Q-1 → (a)** har doim t(⌊ν_eff⌋); normalga o'tish chegarasi olib tashlandi; ν = ∞ → aniq normal kvantil. `excel-term-p2/-p3/-p5` da k, U toleransi 1e-3 (D-02). **Bajarildi (P03).**
- **Q-2 → todo.** D-03 todo holatida; dvigatel ν_B = ∞ (GUM G.4.2).
- **Q-3 →** hozir n_dig = 1 (`excel-gas-p2-mc-ndig1` — majburiy), n_dig = 2 (`excel-gas-p2-mc`) — P06 ga bog'langan todo.
- **Q-4 → tasdiqlandi.** H.1, S2, A1 dagi toleranslar saqlanadi, sababi `tolerance.*.reason` da.

## Egasiga savollar (P01, tarix)

- **Q-1 (D-02).** ν_eff katta bo'lganda k qanday tanlanadi? Variantlar:
  - (a) har doim t(⌊ν_eff⌋) — GUM G.4.1 ga eng yaqin;
  - (b) ν_eff ≥ 1000 da normal z — Excel fayllari bilan to'liq mos;
  - (c) boshqa chegara.

  Displey natijasi uch variantda ham o'zgarmaydi. Lekin 1e-9 dagi etalon mosligi faqat (b) da bo'ladi.
- **Q-2 (D-03).** Excel ν_B = 10⁹ konventsiyasi uchun ν_eff solishtiruvi qanday bo'lsin? Variantlar:
  - (a) ν_eff ni 10⁻⁵ nisbiy tolerans bilan solishtirish;
  - (b) dvigatelga "ν_B = 10⁹" moslik rejimi qo'shish (tavsiya etilmaydi);
  - (c) todo holatida qoldirish.
- **Q-3 (D-04).** 10-test (MC intervali) uchun majburiy tolerans:
  - (a) n_dig = 1, δ = 5·10⁻⁴ — hozir o'tadi;
  - (b) n_dig = 2, δ = 5·10⁻⁵ — P06 dagi adaptiv M dan keyin. Hozircha todo.
- **Q-4.** Manba natijani yaxlitlangan oraliq qiymatdan hisoblagan hollarda (U = k × yaxlitlangan u_c; masalan H.1, S2, A1) toleransga oraliq yaxlitlash tarqalishini qo'shish qoidasini tasdiqlaysizmi? Har bir holat `tolerance.*.reason` da yozilgan.
