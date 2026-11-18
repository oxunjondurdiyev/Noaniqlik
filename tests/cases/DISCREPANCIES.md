# Farqlar reyestri (P01, 2026-11-13; P03, P06 da yangilandi)

Bu faylda uch turdagi farqlar qayd etilgan:

- **A. Dvigatel ↔ manba.** Ular `knownDiscrepancies` da todo-test sifatida yuritiladi. PLAN P01 bo'yicha **tuzatilmaydi**, tuzatish P03 da va egasining roziligi bilan bo'ladi.
- **B. Manbaning o'zidagi nuanslar.**
- **C. Gemini hisoboti ↔ asl manba.** Gemini raqamlari test qiymati sifatida ishlatilmagan.

> **P03 holati (2026-11-13, ENGINE_VERSION 2.0.0, `src/engine/`):** D-01, D-02, D-07 — **yopildi (P03)**; D-09 — 2-tartibli hadlar qo'shildi (diagnostika), U = 0 ni bloklash — P05; D-03 — todo (Q-2); D-04 — n_dig = 2 todo → P06 (Q-3); D-05 — manba nuansi. Yangi: D-11 (GUM Table G.2 nuansi). Egasining Q-1…Q-4 javoblari pastda.

> **P06 holati (2026-11-18, ENGINE_VERSION 2.6.0):** D-04 — **yopildi** egasi qarori Q-3 (b) bilan (tolerans = δ + 2·s_ref; 10-test majburiy); yangi D-18 (eng qisqa interval uchlarining tarqoqligi); Q-5…Q-8 ga egasi javob berdi (pastda).

P01 dagi dvigatel: `src/js/calc.js`, `ENGINE_VERSION` 1.0.0. Hech bir farq **hisobotda ko'rinadigan (yaxlitlangan) natijani o'zgartirmaydi**: 9 ta Excel nuqtasining `expectedDisplay` qiymatlari (U va y) hammasi mos keladi.

> **P07b holati (2026-11-18, ENGINE_VERSION 2.9.0):** yangi D-21 (JCGM 102 §9.5.2.6 — C_x elementidagi bosma xato). §9.3 MCM, §9.5, §7.7.4 misollari — farqsiz.
>
> **P07 holati (2026-11-18, ENGINE_VERSION 2.7.0):** Q-6 — **yopildi** (ko'p o'lchovli t, JCGM 102:2011 §5.3.2); yangi D-19 (§6.5.2.3 to'g'ri burchakli soha yuzi), D-20 (§9.4 MCM, Table 11). JCGM 100 H.2 vektor misolida `u.X` — avvalgi D-05.

## A. Dvigatel ↔ manba (todo-testlar)

| ID | Qayerda | Manba qiymati | Dvigatel | Nisbiy farq | Sabab | Bosqich |
|---|---|---|---|---|---|---|
| **D-01** — **yopildi (P03)** | `excel-gas-p1`, `excel-term-p1`, `-p3`, `-p4`: k, U | k = 2,000 002 443 899 6 (`NORMSINV(0,97725)`, masalan `Nuqta_1!D38`) | 2,000 002 405 781 | −1,9·10⁻⁸ | ν katta bo'lganda dvigatel normal kvantilni `erf` ning Abramowitz–Stegun 7.1.26 approksimatsiyasi bilan hisoblaydi (xatosi ~10⁻⁷). Mustaqil tekshiruv: Python `statistics.NormalDist().inv_cdf(0.97725)` = 2,000 002 443 899 6 — Excel bilan mos. **Dvigatel xatosi** (RISKS R-03). | P03 (t-kvantil 1e-6 aniqlik talabi) |
| **D-02** — **yopildi (P03)** | `excel-term-p2` (ν_eff = 1438), `excel-term-p5` (ν_eff = 3416): k, U | Excel: ν_eff ≥ 1000 bo'lsa k = z (normal), `Nuqta_2!D39` = 2,000 002 | t(⌊ν⌋): 2,001 742 (p2), 2,000 735 (p5) | +8,7·10⁻⁴, +3,7·10⁻⁴ | k tanlash chegarasi har xil: Excel normal kvantilga ν ≥ 1000 da o'tadi, dvigatel ν ≤ 5000 gacha t-taqsimotni ishlatadi (ν = 5000 da sakrash — R-03). GUM G.4.1/G.6.4 bo'yicha t(ν_eff) to'g'ri, normalga o'tish — konventsiya. **Metrologik qaror egasida — Q-1.** | P03 |
| **D-03** — todo (Q-2) | `excel-term-p2`, `-p3`, `-p5`: ν_eff | `Nuqta_2!D38` = 1438,575 53 | 1438,576 41 | +6·10⁻⁷ … +2,7·10⁻⁶ | Excel B tur komponentlariga ν = 10⁹ qo'yadi (cheksizlik o'rniga, `Nuqta_i!L27:L35`); bu Welch–Satterthwaite maxrajiga kichik hissa qo'shadi. Dvigatel ν_B = ∞ (GUM G.4.2). Dvigatel xatosi emas, **Excel konventsiyasi**. Tolerans qarori — Q-2. | P03 (yoki tolerans qarori) |
| **D-04** — **yopildi (egasi qarori Q-3 (b), 2026-11-18)** | `excel-gas-p2-mc` (10-test): 95,45 % MC intervali | qo'llanma 9.1-jadval: [−0,0111; 0,0469] | ENGINE 2.6.0, standart sozlama (adaptiv, n_dig = 2, GUM tekshiruvi δ/5; ν = 2 → mezon faqat interval uchlari): [−0,010 99; 0,046 88] (M = 10⁷ — chegara; erishilgan 2s = 5,8·10⁻⁵) | Δ = 1,1·10⁻⁴; 2·10⁻⁵ | Qo'llanma qiymati bitta M = 10⁶ simulyatsiyasidan — tarqoqligi (s_ref: mustaqil 8 takrorda 1,2·10⁻⁴ / 0,9·10⁻⁴) toleransga kiritildi: **tolerans = δ + 2·s_ref = 2,9·10⁻⁴ (quyi), 2,3·10⁻⁴ (yuqori)**; δ = 5·10⁻⁵ (n_dig = 2). Test majburiy (todo emas). Qo'llanma qiymati o'zgartirilmagan. Batafsil — pastda. | yopildi |
| **D-05** | `jcgm100-h2-X`: u_c(X) | Table H.3: 0,295 Ω | 0,295 58 Ω (→ 0,296) | +2·10⁻³ | 1-yondashuv (5.2.2 Eq. 16, juftlangan korrelyatsiya bilan) aniq hisobda 0,2956 beradi. Manbadagi 0,295 aslida 2-yondashuv qiymati (Table H.4: X_k lardan s/√5 = 0,2948). GUM ikkala yondashuv bir xil deydi (H.2.4), lekin 3-xonada farq bor. R va Z mos. **Manba nuansi**, dvigatel xatosi emas. | — (manba) |

### P03 da yopilgan farqlar — qanday yopildi

| ID | Yechim | Tekshiruv |
|---|---|---|
| D-01 | `src/engine/special.js::normalQuantile` — Wichura AS241 (PPND16). | `tests/engine/quantiles.test.js`: NORMSINV(0,97725) = 2,000 002 443 899 6 (1e-12, `Nuqta_1!D38`); mpmath bilan 1e-13. `excel-gas-p1`, `-term-p1`, `-term-p4` da k, U 1e-9 da o'tadi (todo emas). |
| D-02 | Egasi qarori Q-1(a): k = t(⌊ν_eff⌋) har doim, chegara yo'q; ν = ∞ → Φ⁻¹. | `excel-term-p2`, `-p3`, `-p5`: k, U toleransi 1e-3, sababi testda ("Excel ν ≥ 1000 da z ishlatadi; egasi qarori Q-1(a) — GUM G.4.1"). `-p3` (ν_eff = 5279) ham shu sababga ko'ra qo'shildi: P00 da u D-01 ostida edi (ν > 5000 → z), Q-1(a) dan keyin farq +2,4·10⁻⁴. `expectedDisplay` uchala nuqtada o'zgarmadi. Uzluksizlik va monotonlik testi (ν = 1000, 2000, 5000 atrofida). |
| D-07 | c_i — simvolik hosila (`parser.js::derivative`), sonli — zaxira/o'zaro tekshiruv, h = ε^⅓·max(|x|, u). | `tests/engine/sensitivity.test.js`: `jcgm100-h1` c_d = 1 (1e-12); 11 funksiya turida simvolik ↔ sonli. |
| D-09 | 2-tartibli hadlar (GUM 5.1.2 Note) — `sensitivity.js::secondOrderTerms`, standartda faqat diagnostika. | Y = X², x̄ = 0 → u² = 2u⁴; GUM H.1.7 (11,7 nm, 1,7 nm; u_c 32 → 34 nm) — `jcgm100-h1-2nd` va `second-order.test.js`. U = 0 ni hisobotda bloklash — P05. |

### D-04: P06 raqamlari (ENGINE 2.6.0, 2026-11-18)

Model: E = (I − 4)·1,25 − C_e; I — 3 ta kuzatuv (ν = 2) + ikki to'g'ri burchakli manba; C_e — to'g'ri burchakli. P = 95,45 %.
GUM: y = 0,017 917, u_c = 0,008 258, k = 2,5165 (ν_eff = 6,93), U = 0,020 781 → [−0,002 86; 0,038 70]. δ(n_dig = 2) = 5·10⁻⁵; δ(n_dig = 1) = 5·10⁻⁴.
Qo'llanma (9.1-jadval, "Monte-Karlo (10⁶)"): E = 0,0179; [−0,0111; 0,0469].

| Hisob (simmetrik interval) | M | y | quyi uch | yuqori uch | qo'llanmadan farq | Izoh |
|---|---|---|---|---|---|---|
| Adaptiv, n_dig = 2, mezon §7.9.4 k) (standart) | 10⁷ (chegara) | 0,017 93 | −0,010 99 | 0,046 88 | 1,1·10⁻⁴; 2·10⁻⁵ | **barqarorlashmadi**: u(y) = 0,024 (GUM u_c dan 3 marta katta) va barqaror emas — t₂ ning dispersiyasi cheksiz (§7.6 Note 2); `mc_not_converged`, `mc_variance_undefined` |
| Adaptiv, n_dig = 1, mezon §7.9.4 k) | 2·10⁴ | 0,017 82 | −0,011 78 | 0,047 69 | 6,8·10⁻⁴; 7,9·10⁻⁴ | "barqarorlashdi", lekin δ shishgan u(y) = 0,02 dan olingan (5·10⁻³) — natija qo'pol |
| Adaptiv, n_dig = 2, `criteria: 'interval'` (faqat uchlar, δ GUM u_c dan) | 1,359·10⁷ | 0,017 93 | −0,011 01 | 0,046 87 | 9·10⁻⁵; 3·10⁻⁵ | barqarorlashdi (uchlarning s = 2,5·10⁻⁵) |
| Adaptiv, n_dig = 1, `criteria: 'interval'` | 2,2·10⁵ | 0,017 84 | −0,010 85 | 0,046 60 | 2,5·10⁻⁴; 3,0·10⁻⁴ | δ = 5·10⁻⁴ ichida |
| Qat'iy M = 2·10⁷ | 2·10⁷ | 0,017 93 | −0,011 02 | 0,046 89 | 8·10⁻⁵; 1·10⁻⁵ | eng aniq baho (uchlarning s ≈ 2·10⁻⁵) |
| Qat'iy M = 10⁶, 20 ta urug' | 10⁶ | 0,017 917 ± 0,000 026 | −0,011 053 ± 0,000 111 (−0,011 30 … −0,010 79) | 0,046 883 ± 0,000 084 (0,046 70 … 0,047 06) | — | qo'llanma qiymati shu tarqoqlik ichida (0,4 σ; 0,2 σ) |

Eng qisqa interval (ma'lumot uchun): M = 2·10⁷ da [−0,011 21; 0,046 70]; M = 10⁶ da uchlarning s.o. 2,8·10⁻⁴ / 3,1·10⁻⁴. MCM u(y): 20 urug'da 0,0216 … 0,0421 (mavjud emas).

**Egasi qarori (2026-11-18, Q-3 (b)).** Dvigatelda n_dig = 2; 10-test toleransi = δ + 2·s_ref, s_ref — shu jadvaldan oldingi (P01) mustaqil 8 takrordagi standart og'ish (1,2·10⁻⁴ / 0,9·10⁻⁴). Egasi yig'indini ≈ 3,2·10⁻⁴ deb ko'rsatgan; formula bo'yicha 5·10⁻⁵ + 2·1,2·10⁻⁴ = 2,9·10⁻⁴ (quyi uch) va 5·10⁻⁵ + 2·0,9·10⁻⁴ = 2,3·10⁻⁴ (yuqori uch) chiqadi — testga shu qattiqroq qiymatlar yozildi (ikkalasi ham 3,2·10⁻⁴ dan kichik; farq egasiga xabar qilindi). Standart sozlamadagi natija [−0,010 99; 0,046 88] — farq 1,1·10⁻⁴ va 2·10⁻⁵, test o'tadi. Quyidagi jadval — qaror qabul qilinishidan oldingi (mezon `'all'` standart bo'lgan) holat; hozir ν ≤ 2 da mezon avtomatik `'interval'` (Q-5).

**Xulosa (qarordan oldin).** (1) Qo'llanma qiymati yangi dvigatel bilan statistik jihatdan mos (bitta M = 10⁶ simulyatsiyasining tarqoqligi ichida). (2) n_dig = 2 dagi δ = 5·10⁻⁵ tolerans bilan u **o'tmaydi va o'tishi mumkin emas**: qo'llanmadagi −0,0111 ning o'zi "haqiqiy" −0,011 02 dan 8·10⁻⁵ uzoqda. (3) Standart adaptiv mezon (§7.9.4 k) bu misolda hech qachon barqarorlashmaydi, chunki u(y) mavjud emas. Qarorlar — pastda Q-3 (qayta) va Q-5.

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
| **D-12** (P09) | Nordtest TR 537 ed. 4, §5.3 (p. 16) ↔ Appendix 5 (p. 41); `nordtest-tr537-nh4n-dup-low` | Matnda past diapazon (2–30 µg/L) uchun n = 47 deyilgan, Appendix 5 jadvalida esa 46 juftlik bosilgan (yuqori diapazon — 26, mos). 46 juftlikdan pooled s = 0,441 → 0,44 — manba qiymatiga mos. | Test jadvaldagi 46 juftlik bilan; n tekshirilmaydi. Manba nuansi. |
| **D-13** (P09) | QUAM:2012 A4, Bias study (p. 66); `quam-a4-recovery` | Manba "t_crit;41 ≅ 2.021" beradi — bu ν = 40 uchun jadval qiymati. Aniq t₀.₉₅(41) = 2,019 54 (dvigatel; GUM Table G.2 da ν = 40 → 2,02, ν = 45 → 2,01). Xulosa (t = 2,31 ≥ t_crit) o'zgarmaydi. | `recovery.tCrit` uchun tolerans ±0,002 (`reason` bilan); `recovery.significant` aniq tekshiriladi. Manba nuansi (≅). |
| **D-14** (P09) | Nordtest TR 537 ed. 4, §6.1 (p. 20) | Manba: "0.25/11.5 · 100 = 2.16 %"; aniq qiymat 2,174 % (→ 2,17). Xom qiymatlardan u(bias) = 4,15 %, manba qiymatlaridan 4,14 % — ikkalasi ham 4,1 % ga yaxlitlanadi, lekin birinchisi chegarada. | `tests/engine/topdown.test.js`: manba ishlatgan 2,16 bilan ±0,05; xom qiymatlar bilan ±0,06 (izoh bilan). Manba nuansi (yaxlitlash). |
| **D-15** (P10) | AQA:2021 Example E3, Table E3.1 va Eq. (E3.1) (p. 28); `aqa-e3-emit-methadone` | Manba metadon uchun PP = 0,988 beradi; Eq. (E3.1) ga manba qiymatlari (0,26; 1 − 0,018; 0,004) qo'yilsa 0,98854 (→ 0,989) chiqadi. Opiatlar va kokain (0,963) mos. | Tolerans ±0,001 (`reason` bilan). Manba nuansi (kesish). |
| **D-16** (P10) | UfS:2019 Figure A1.2 (p. 41), Figure A2.2 (p. 48) — robust ANOVA; `ufs-a1-nitrate-robust`, `ufs-a2-lead-robust` | RANOVA dasturi kodi repoda yo'q. Qayta tiklangan algoritm natijalari manbadan oxirgi xonalarda farq qiladi: A1 — o'rtacha 4408,319 vs 4408,3237; s_between 565,420 vs 565,399; s_samp 319,060 vs 319,048; s_anal 167,947 vs 167,943. Nisbiy farq ≤ 8·10⁻⁵ (asl dasturning yaqinlashish mezoni bo'lishi ehtimoli katta). Klassik ANOVA to'liq aniqlikda mos. | Robust kattaliklar uchun nisbiy tolerans 2·10⁻⁴ (`reason` bilan); natijada `sampling_robust_reconstructed`. RISKS R-21. |
| **D-17** (P10) | AQA:2021 Table E6.2 (p. 36); `aqa-e6-sarscov2` | Spetsifiklikning quyi 95 % chegarasi manbada 91,6 %; Eq. (8)–(11) (Wilson) bo'yicha 97/100 uchun 91,548 % (→ 91,5). Qolgan uch chegara (96,3; 100; 99,0) mos. | `specificity.wilson.low` uchun tolerans ±0,001 (`reason` bilan). Manba nuansi (ikki marta yaxlitlash). |
| **D-18** (P06) | JCGM 101:2008 §9.4 (Table 8, 9), §9.5 (Table 11) — eng qisqa interval; `jcgm101-9-4-mcm-*`, `jcgm101-9-5-mcm` | Eng qisqa interval uchlari o'rtacha va u(y) ga nisbatan ancha sekin barqarorlashadi (interval uzunligi minimum atrofida deyarli o'zgarmaydi). §9.5 da adaptiv protsedura (δ = 0,5 nm) "barqarorlashgan" natijada uchlarning urug'dan-urug'ga s.o. 0,51 / 0,45 nm (12 urug'; simmetrik intervalniki 0,14 / 0,22 nm) — ya'ni bloklar bo'yicha o'rtachaning barqarorligi (§7.9.4) yig'ma tanlanmadan olingan eng qisqa interval uchining aniqligini to'liq bildirmaydi. Manbaning o'zida ham ko'rinadi: Table 11 MCM [745, 932] — markazi 838,5; taqsimot 838 ga nisbatan simmetrik. Bizda 12 urug' o'rtachasi [744,33; 931,57]. §9.4 da x1 = 0,050: uchlarning s.o. 5–6·10⁻⁶ (M = 10⁶). | Tolerans: ½ oxirgi xona + 2·√2·s (s — o'lchangan, `tests/tools/mc-scatter.js`), sababi `tolerance.*.reason` da. Manba nuansi / usul xususiyati; dvigatel xatosi emas. |
| **D-19** (P07) | JCGM 102:2011 §6.5.2.3, EXAMPLE 2 (21-bet) — to'g'ri burchakli soha yuzi | Manbada yuz 40,1. Aniq k_q = Φ⁻¹(0,9875) = 2,2414 bilan 4·k_q²·u₁·u₂ = 40,19; manbadagi yaxlitlangan k_q = 2,24 bilan 40,14 → 40,1. Ya'ni manba yaxlitlangan k_q dan hisoblagan. EXAMPLE 1 (28,4) va ellips yuzlari (26,6; 11,8) ikkala usulda ham mos. | `tests/engine/multivariate.test.js`: yaxlitlangan k_q bilan ±0,05, aniq qiymat ±0,1 — sababi test izohida. Manba nuansi (oraliq yaxlitlash); dvigatel xatosi emas. |
| **D-20** (P07) | JCGM 102:2011 §9.4, Table 11 (MCM qatori); `jcgm102-9-4-mcm` | u(R) = 0,130 (mos); u(X): manba 0,536, bizda 0,544 ± 0,015; u(Z): manba 0,429, bizda 0,436 ± 0,015 (± — 8 urug' bo'yicha 2√2·s). ν = n − N = 3 da t-taqsimot dumlari og'ir: dispersiya bahosi sekin yaqinlashadi (ν = 3 da 4-moment mavjud emas), shuning uchun u(X), u(Z) urug'dan-urug'ga sezilarli o'zgaradi. | Tolerans: ½ oxirgi xona + 2√2·s (o'lchangan), sababi `tolerance.*.reason` da. Manba qiymati tolerans ichida. Usul xususiyati. |
| **D-21** (P07b) | JCGM 102:2011 §9.5.2.6 (p. 56), sezgirlik matritsasi C_x; `tests/engine/implicit.test.js` | Manbada C_x ning uchinchi elementi (∂h/∂B = R₀θ²) **"4.01 Ω°C²"** deb bosilgan; formula bo'yicha R₀θ² = 99,996 1 · 20,023 2² = **4,01·10⁴** Ω°C² (qo'shni elementlar "2.00 × 10³", "−1.00 × 10²" ko'paytuvchi bilan berilgan). | Manbadagi bosma xato (ko'paytuvchi × 10⁴ tushib qolgan): yakuniy natija u(θ̂) = 0,004 5 °C faqat 4,01·10⁴ bilan chiqadi va manba bilan mos. Test mantissani (4,01) va formulani tekshiradi. Dvigatel o'zgartirilmagan. |
| **D-10** | `tests/fixtures/README.md`, `tests/verify-excel.js` | `verify-excel.js` sarlavhasidagi fayl nomi `…gazoanalizator.xlsx` haqiqiy fixture nomiga (`…_KEDR-07.xlsx`) mos emas edi (PLAN P01). | Tuzatildi (izoh). |

## C. Gemini hisoboti (`docs/audit/gemini-audit-2026-11.md` §8.1, T1–T18) ↔ asl manba

| T | Gemini manbasi | Tekshiruv natijasi | Bizdagi misol |
|---|---|---|---|
| T1 | Zichlik Excel | Raqamlar Excel bilan mos (0,998 209 8; 0,000 628 65; 996,01; 2,0025; 0,001 258 9). | `excel-density` (Excel kataklaridan) |
| T2 | KEDR-07, 1-nuqta | Mos (u_c = 0,003 089 8; U = 0,006 179 6 → 0,0062). | `excel-gas-p1` |
| T3 | KEDR-07, 2-nuqta + MC | Mos (ν 6,9307; k 2,5165; U 0,020 781; MC [−0,0111; 0,0469]). | `excel-gas-p2`, `excel-gas-p2-mc` |
| T4 | KEDR-07, 3-nuqta | Mos. "COOMET §5.7.3 yagona k = 2,52 (U = 0,031)" — COOMET R/GM/32 `docs/references/` da yo'q → **tekshirilmagan**. | `excel-gas-p3` |
| T5 | MS-MK-3, 5 nuqta | Mos (ν_eff 2,01·10⁹ / 1438,58 / 5279,34 / 1,52·10⁹ / 3416,37; muvofiqlik `Nuqta_4!D50`, `Nuqta_5!D50` = "NOANIQ ZONA"). | `excel-term-p1…p5` |
| T6 | GUM H.1 + JCGM 101 §9.5 + "NPL MS1" | Gemini y, ν, k, U ni "manbada yo'q" deydi — **noto'g'ri**: GUM H.1.5–H.1.6 (l = 50,000 838 mm, ν_eff = 16,7, k₉₉ = 2,92, U₉₉ = 93 nm) va JCGM 101 Table 11 (GUF 838/32/[745, 931]; MCM 838/36/[745, 932]) bularni beradi. "NPL MS1" hisoboti repoda yo'q. | `jcgm100-h1`, `jcgm101-9-5-guf`, `jcgm101-9-5-mcm` (**verified**, P06) |
| T7 | JCGM 101 §9.3 + "NPL MS1" | Kirishlar mos; natijalarni "manbada yo'q" deydi — **noto'g'ri**: Table 6 (GUF1 1,2340/0,0539/[1,1285; 1,3395]; MCM 1,2341/0,0754/[1,0834; 1,3825]). | `jcgm101-9-3-guf1`, `jcgm101-9-3-mcm` |
| T8 | GUM H.3 | y₁ = −0,1712, y₂ = 0,00218, s(y₁), s(y₂), r = −0,930, s = 0,0035 mos. "t = 23,8 °C da b = −0,1629, u_c = 0,0011" — **manbada yo'q**: GUM b(30 °C) = −0,1494 °C, u_c = 0,0041 °C ni beradi (H.3.4, Eq. H.14); 0,0011 — t̄ dagi s(y₁′) (H.17). | `jcgm100-h3` (**verified**, P08: 33 kattalik ±½ oxirgi xona) |
| T9 | GUM H.4 | Gemini "manbada yo'q" deydi — GUM H.4 da raqamli natijalar bor. Hozircha misol yozilmagan. | — (keyingi nomzod) |
| T10–T13, T17 | ISO/TS 28037/28038, GTC hujjati, PMC maqola | Pullik ISO va tashqi manbalar `docs/references/` da yo'q → **tekshirilmagan** (CLAUDE.md: GTC/MSL, NIST ochiq manbasi qo'shilgach). P08 da WTLS/GLS/polinom faqat o'zaro tekshiruvlar bilan (`unverified`). | `york-pearson-wtls` (unverified) |
| T14 | NIST Uncertainty Machine qo'llanmasi | PDF repoda yo'q → **tekshirilmagan**. | `nist-um-ratio` (unverified) |
| T15 | Nordtest TR 537 | "148 ± 10 µg/L" manbada bor (TR 537 ed.4, 6–7-betlar, natijani ifodalash misoli: "Concentration of ammonium nitrogen (NH4-N) = 148 ± 10 µg L-1", ±7 %). **P09:** Gemini raqamlari ishlatilmadi; qiymatlar to'g'ridan-to'g'ri manbadan: u(R_w) = 1,67 %, RMS_bias = 2,26 %, u(C_ref) = 1,52 %, u(bias) = 2,73 %, u_c = 3,20 %, U = 6,40 ≈ 7 % (§3.2, p. 10; Appendix 4, p. 40). Manba U ni yuqoriga yaxlitlagan (7 %): 148 µg/L uchun 10,4 → 10; dastur 2 qiymatli raqam bilan 6,4 % (9,5 µg/L) beradi. | `nordtest-tr537-nh4n` (**verified**, P09) + 5 ta qo'shimcha TR 537 misoli |
| T16 | "EA-4/02 M:2022 Supplement S1" (Y = X²) | **Havola noto'g'ri**: EA-4/02 M:2022 da S1 — "Introduction" (28-bet); Y = X² misoli yo'q (RISKS R-02). Formula u = √2·s² (m = 0) — GUM 5.1.2 Note dan kelib chiqadi, lekin bu raqamli misol emas. | P03: mustaqil qo'lda hisob bilan |
| T18 | QUAM A1–A6 | Gemini A1 natijalarini "manbada yo'q" deydi — **noto'g'ri**: Table A1.1 va A1.5–A1.6: 1002,7 ± 1,8 mg/L (u_c = 0,9). | `quam-a1` |

## Egasining javoblari (2026-11-13)

- **Q-1 → (a)** har doim t(⌊ν_eff⌋); normalga o'tish chegarasi olib tashlandi; ν = ∞ → aniq normal kvantil. `excel-term-p2/-p3/-p5` da k, U toleransi 1e-3 (D-02). **Bajarildi (P03).**
- **Q-2 → todo.** D-03 todo holatida; dvigatel ν_B = ∞ (GUM G.4.2).
- **Q-3 →** hozir n_dig = 1 (`excel-gas-p2-mc-ndig1` — majburiy), n_dig = 2 (`excel-gas-p2-mc`) — P06 ga bog'langan todo.
- **Q-4 → tasdiqlandi.** H.1, S2, A1 dagi toleranslar saqlanadi, sababi `tolerance.*.reason` da.

## Egasining javoblari (P06, 2026-11-18)

- **Q-3 → (b).** Dvigatelda n_dig = 2; 10-test toleransi = δ + 2·s_ref (s_ref — D-04 dagi mustaqil 8 takror). Qo'llanma qiymati o'zgartirilmaydi. 10-test todo dan chiqarildi. **Bajarildi.**
- **Q-5 →** ν ≤ 2 bo'lgan istalgan t-kirishda (JCGM 101 §6.4.9: ν > 2 bo'lmasa dispersiya cheksiz) `criteria: 'interval'` avtomatik; hisobotda "u(y) aniqlanmagan (ν ≤ 2), faqat qamrov intervali" (uch tilda). **Bajarildi** (`criteria: 'auto'` — standart; natijada `u: null`, `uDefined: false`).
- **Q-6 →** hozirgidek: normal bo'lmagan korrelyatsiyada MCM natijasi berilmaydi; topilmada sabab va "LPU natijasi amal qiladi". Ko'p o'lchovli t — P07 ga. **Bajarildi** (matnlar). **P07 da yopildi (2.7.0):** juftlangan A tur kuzatuvlari ko'p o'lchovli t dan tanlanadi; zichlik etaloni va JCGM 100 H.2 da MCM yana natija beradi. Eslatma: egasi "JCGM 102:2011 §6.5" deb ko'rsatgan; PDF da ko'p o'lchovli t-taqsimot — **§5.3.2** (11-bet), §6.5 — "Coverage region for the output quantity". Kod va hujjatlarda §5.3.2 yozildi.
- **Q-7 → tasdiqlandi.** A tur usul 3 MCM da t₍n−1₎(x̄, s²/n); s.o. = s/√n·√((n−1)/(n−3)) = usul 3 dagi u_A (JCGM 101 §6.4.9.4).
- **Q-8 →** §8 GUM tekshiruvida standart δ/5 (JCGM 101 §8.2), oddiy MCM da δ; M chegarasiga yetilsa erishilgan tolerans hisobotda; δ ga tushirish — laboratoriya sozlamasi, hisobotda belgi bilan. **Bajarildi** (`validation`, `tolDivisor`, `result.validation`; laboratoriya sozlamasi `mcTolerance`).

## Egasiga savollar (P06, 2026-11-18) — tarix

- **Q-3 (qayta, D-04).** 10-test toleransi: (a) n_dig = 1 majburiy bo'lib qoladi; (b) n_dig = 2, tolerans = δ + qo'llanma qiymatining noaniqligi; (c) qo'llanma qiymatini yangilash.
- **Q-5.** ν ≤ 2 da adaptiv mezon: (a) §7.9.4 so'zma-so'z; (b) avtomatik `criteria: 'interval'`; (c) qat'iy M.
- **Q-6.** Normal bo'lmagan korrelyatsiya: natija berilmaydi / Gauss copula / ko'p o'lchovli t / Gauss yaqinlashuvi standart.
- **Q-7.** A tur usul 3 MCM da: t₍n−1₎ yoki N(0, u_A²).
- **Q-8.** §8.2 dagi δ/5 standart bo'lsinmi.

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
