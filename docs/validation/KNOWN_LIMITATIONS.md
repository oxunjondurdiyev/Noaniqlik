# Ma'lum cheklovlar — yagona ro'yxat

> Ruscha nusxa: [KNOWN_LIMITATIONS.ru.md](KNOWN_LIMITATIONS.ru.md) (asosiy matn — o'zbekcha; farq bo'lsa shu hujjat amal qiladi).
> **Holat:** `ENGINE_VERSION` 2.11.0, P20 (2026-11-21).
> Bu ro'yxat yangi cheklov kiritmaydi — faqat yig'adi. Manbalar: `CLAUDE.md` ("Joriy holat bo'yicha eslatmalar"), `docs/RISKS.md`, `tests/cases/DISCREPANCIES.md`, `docs/VALIDATION_MATRIX.md`, `docs/LINTER_RULES.md` §4, `docs/PLAN.md`. Zid kelsa `CLAUDE.md` va `docs/RISKS.md` ustun.
> ID lar barqaror: band yopilsa o'chirilmaydi — "yopildi" deb belgilanadi (sana va versiya bilan); yangi band oxiridan qo'shiladi.

**Turi:** `unverified` — manba repoda yo'q yoki solishtirilmagan (majburiy test emas); `BETA` — unverified modul, natijada har doim ogohlantirish; `qilinmagan` — funksiya yo'q; `tasdiq kutadi` — vaqtincha loyiha qarori qo'llangan, egasi tasdig'i kerak; `ko'rilmagan` — real brauzerda / printerda qo'lda ko'rilmagan; `todo` — ma'lum farq, test todo holatida; `qoldiq xavf` — ma'lum, qabul qilingan cheklov; `egasi qadami` — egasi bajarishi kerak bo'lgan amal; `rejalashtirilgan` — keyingi bosqich.

"Ta'siri" ustuni faqat manbada aytilgan oqibatni beradi; manbada yo'q bo'lsa — "—".

---

## 1. Me'yoriy manbalar yo'qligi

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-001 | ISO/IEC 17025:2017 repoda yo'q (pullik); unga barcha havolalar "(unverified)" | unverified | `CLAUDE.md`; RISKS R-17 | bandlar raqami standart matni bilan solishtirilmagan |
| KL-002 | JCGM GUM-6:2020 repoda yo'q — birliklar va o'lchamlik tahlili mustaqil qo'lda hisob bilan tekshirilgan | unverified | `CLAUDE.md`; VALIDATION_MATRIX §1; RISKS P03 natijasi (R-12) | — |
| KL-003 | COOMET R/GM/32:2017 repoda yo'q — unga havola qilingan kod tekshirilmagan (jumladan "yagona k", DISCREPANCIES T4) | unverified | `CLAUDE.md`; DISCREPANCIES C (T4) | — |
| KL-004 | NIST Uncertainty Machine qo'llanmasi repoda yo'q; `nist-um-ratio` misoli unverified | unverified | `CLAUDE.md`; VALIDATION_MATRIX §4; DISCREPANCIES C (T14) | — |
| KL-005 | ISO 21748, ISO 19036, ISO/TS 20914, ISO/TS 28037 / 28038, ISO 13528, ISO 5725-2, ISO 11352 — pullik, repoda yo'q (pullik standartlar repoga joylanmaydi); ISO/IEC 17043 ham solishtirilmagan | unverified | `CLAUDE.md`; RISKS R-19, R-20, R-21, R-26; `docs/references/README.md` | tegishli funksiyalar natijasida "unverified" belgisi |
| KL-006 | Eurachem PT Guide 2021 va Eurachem Fitness for Purpose 2014 repoda yo'q — egasi qo'shadi | unverified | `CLAUDE.md` (P12); RISKS R-26 | qo'shilgach formulalar / chegaralar solishtiriladi |
| KL-007 | Westgard 1981 — repoda faqat qaydnoma (`docs/references/westgard-1981-NOTES.md`); PDF © AACC, repoda yo'q | qoldiq xavf | `CLAUDE.md`; RISKS R-25 #3 | qoidalar egasi nusxasi bilan solishtirilgan (2.8.1) |
| KL-008 | GOST 34100.3-2017 normativ ekvivalentlar ro'yxatiga qo'shilmagan — egasining IDT tasdig'i kutiladi | tasdiq kutadi | `CLAUDE.md` (P05b); RISKS R-22 | ruscha hisobotda ham faqat JCGM 100:2008 havolasi |
| KL-009 | Gemini hisoboti (`docs/audit/gemini-audit-2026-11.md`) dagi raqamlar unverified; T9 (GUM H.4) uchun misol yozilmagan; T10–T13, T17 tekshirilmagan | unverified | `CLAUDE.md`; DISCREPANCIES C | Gemini raqamlari test qiymati sifatida ishlatilmagan |

## 2. GUM (LPU) va Monte-Karlo

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-010 | D-03: `excel-term-p2`, `-p3`, `-p5` da ν_eff Excel'dan +6·10⁻⁷ … +2,7·10⁻⁶ nisbiy farq qiladi (Excel B turga ν = 10⁹ qo'yadi; dvigatel ν_B = ∞, GUM G.4.2) | todo | DISCREPANCIES D-03, Q-2 | yaxlitlangan natija o'zgarmaydi |
| KL-011 | D-05: `jcgm100-h2-X` u_c(X) — manba 0,295 Ω, dvigatel 0,2956 Ω | todo (manba nuansi) | DISCREPANCIES D-05 | — |
| KL-012 | D-02 (egasi qarori Q-1(a)): k = t(⌊ν_eff⌋) har doim; Excel ν ≥ 1000 da z ishlatadi — `excel-term-p2`, `-p3`, `-p5` da k, U toleransi 1·10⁻³ | qoldiq xavf | DISCREPANCIES D-02, Q-1 | ko'rinadigan natija o'zgarmagan |
| KL-013 | D-08: korrelyatsiyalangan kirishlarda Welch–Satterthwaite ν_eff < 1 berishi mumkin (GUM G.4.1 faqat mustaqil kirishlar uchun); test qilinmagan | qoldiq xavf | DISCREPANCIES D-08 | — |
| KL-014 | 2-tartibli hadlar faqat normal, korrelyatsiyasiz kirishlarda haqiqiy; standartda faqat diagnostika | qoldiq xavf | RISKS P03 natijasi (R-02); `CLAUDE.md` | hisobotda yoziladi |
| KL-015 | Kirish birliklari uchun UI maydoni yo'q (`state.units` — faqat API / shablon orqali) | qilinmagan | `CLAUDE.md`; RISKS P03 natijasi (R-12) | birliklar tekshiruvi UI dan qo'lda kiritilgan hisobda ishlamaydi |
| KL-016 | Parser: `:` → bo'lish va yolg'iz `e` = Eyler soni xatti-harakati o'zgartirilmagan | qoldiq xavf | RISKS R-12, P03 natijasi | ba'zi yozuvlarda kutilmagan talqin |
| KL-017 | `typeB.js` dagi u_B ko'rinishi dvigatel funksiyalari bilan, lekin alohida chaqiruvda hisoblanadi (R-10 — qisman) | qoldiq xavf | RISKS P03 natijasi (R-10) | — |
| KL-018 | Log-normal taqsimot JCGM 101 da yo'q — momentlar bo'yicha mustaqil tekshiruv | unverified | `CLAUDE.md` (P06); RISKS R-23; VALIDATION_MATRIX §12 | — |
| KL-019 | n_dig = 2 + δ/5 ko'p hisobda M chegarasiga (10⁷) yetadi → `mc_not_converged` va "erishilgan 2s" | qoldiq xavf (kutilgan) | `CLAUDE.md` (P06); RISKS R-23 | natija ogohlantirish bilan chiqadi; tezlashtirish — n_dig = 1 yoki laboratoriya sozlamasida δ |
| KL-020 | Normal bo'lmagan kirish korrelyatsiyada MCM natijasi berilmaydi (`mc_nonnormal_correlation`); istisno — juftlangan A tur kuzatuvlari (ko'p o'lchovli t); copula qo'shilmaydi | qoldiq xavf (egasi qarori) | `CLAUDE.md` (P06); RISKS R-23 | LPU natijasi amal qiladi |
| KL-021 | ν ≤ 2 bo'lgan t-kirishda u(y) berilmaydi — faqat qamrov intervali | qoldiq xavf (egasi qarori) | `CLAUDE.md` (P06); DISCREPANCIES Q-5 | hisobotda "u(y) aniqlanmagan (ν ≤ 2)" |
| KL-022 | D-18: eng qisqa interval uchlari sekin barqarorlashadi — adaptiv mezon buni to'liq ushlamaydi | qoldiq xavf | RISKS R-23; DISCREPANCIES D-18 | — |
| KL-023 | Generator sifati: χ², KS, ketma-ket korrelyatsiya — mustaqil tekshiruv; TestU01 BigCrush o'tkazilmagan (manba bayoniga tayanilgan) | qoldiq xavf | RISKS R-23 | — |
| KL-024 | Shablon muharririda (UI) yangi taqsimotlarning β / d maydonlari yo'q — JSON orqali kiritiladi | qilinmagan | RISKS R-23 | — |
| KL-025 | Eski hisoblarning MC natijasi saqlanmagan; takrorlash uchun `rng: 'xorshift32-legacy'` va o'sha M beriladi | qoldiq xavf | RISKS R-23 | — |
| KL-026 | `appState.set` dagi to'liq `JSON.stringify` va qayta chizish o'zgarmagan (ishlash) | qoldiq xavf | RISKS P06 natijasi (R-16) | — |

## 3. Vektor va oshkormas modellar (JCGM 102:2011)

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-030 | Oshkormas model uchun Monte-Karlo yo'q (`implicit_mc_unsupported`) | qilinmagan (keyingi bosqich) | `CLAUDE.md` (P07b); RISKS R-24 (a) | GUM natijasi amal qiladi, §8 tekshiruvi yo'q |
| KL-031 | Oshkormas modelni muharrirda kiritish shakli yo'q — hisob fayli, API yoki shablon JSON orqali | qilinmagan | `CLAUDE.md` (P07b); RISKS R-24 (b) | kirishlar yoki oshkor formula o'zgarsa `implicit` bekor bo'ladi |
| KL-032 | Oshkormas modelda 2-tartibli hadlar va o'lchamlik tahlili diagnostikasi yo'q | qilinmagan | RISKS R-24 (c) | — |
| KL-033 | Eng kichik qamrov sohasi faqat m = 2; m > 2 — faqat ellipsoid va to'g'ri burchakli soha | qilinmagan | `CLAUDE.md` (P07b); RISKS R-24 (d); VALIDATION_MATRIX §13 | — |
| KL-034 | Ko'p chiqish + ko'p nuqta: nuqtalar orasidagi birgalikdagi soha hisoblanmaydi; yagona k yo'q | qilinmagan (egasi qarori: "faqat so'ralganda") | `CLAUDE.md` (P07b); RISKS R-24 (e) | hisobotda shunday yoziladi; vektor nuqtalarda muvofiqlik ustuni umumiy jadvalda yo'q |
| KL-035 | Ko'p nuqtali vektor panel va bosma hisobot real brauzerda ko'rilmagan (jsdom testlari bor) | ko'rilmagan | `CLAUDE.md` (P07b); RISKS R-24 (f) | — |
| KL-036 | ν ≤ 2 bo'lgan t-kirishda vektor MCM: faqat marginal intervallar; U_y va soha berilmaydi | qoldiq xavf (loyiha qarori) | RISKS R-24 (P07 jadvali, #4) | — |
| KL-037 | Linter MV1 chegarasi (\|r\| > 0,5 → info; singular λ_min / λ_max < 10⁻⁹) | tasdiq kutadi | `CLAUDE.md` (P07); LINTER_RULES §4 #24; RISKS R-24 | — |
| KL-038 | Korrelyatsiya koeffitsiyentini ko'rsatish: 3 o'nlik xona, \|r\| > 0,99 da "1 − \|r\|" | tasdiq kutadi | `CLAUDE.md` (P07); RISKS R-24 | — |
| KL-039 | Oshkormas model: qoldiq chegarasi 10⁻⁸ va masshtabi; shart soni uchun 1-norma | tasdiq kutadi | `CLAUDE.md` (P07b); RISKS R-24 | — |
| KL-040 | P07 loyiha qarorlari: adaptiv mezon λ_max orqali; chiqishga xos sozlamalar faqat `outputs[j].settings` orqali (umumiy `settings` dagi MPE vektor hisobda e'tiborga olinmaydi); ko'p o'lchovli t `gaussian` sozlamasidan ustun | tasdiq kutadi | RISKS R-24 ("Egasi tasdig'ini kutayotgan loyiha qarorlari") | — |
| KL-041 | P07b sonli tafsilotlari: sezgirlik koeffitsiyentlari LU dan, U_y Annex B dan; Annex B c) da qatorlarni tanlash; shablonda `implicit` cheklovlari; `outputs` qulflanadigan bo'limlar ro'yxatida | tasdiq kutadi | RISKS R-24 ("sonli tafsilotlar") | — |
| KL-042 | `MV-01` shabloni DRAFT, raqamsiz | qoldiq xavf | `CLAUDE.md` (P07) | — |

## 4. Regressiya

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-050 | WTLS, GLS, 2- / 3-darajali polinom — manba misoli repoda yo'q; faqat o'zaro tekshiruvlar | unverified | `CLAUDE.md` (P08); RISKS R-19; VALIDATION_MATRIX §7 | natijada `regression_method_unverified` belgisi |
| KL-051 | "U — diapazon" ILAC P14:09/2020 matni bilan solishtirilmagan | unverified | `CLAUDE.md` (P08); RISKS R-19 | hisobotda belgi |
| KL-052 | χ² testi qoidasi (ISO/TS 28037) — kvantil tekshirilgan, test qoidasi unverified | unverified | VALIDATION_MATRIX §7 | — |
| KL-053 | Loyiha qarorlari: kovariatsiya asosi (χ² yiqilganda aposterior asosga avtomatik o'tilmaydi); teskari bashoratda \|b\| ≤ u(b) → xato, \|b\| < 3u(b) → ogohlantirish; m < n_param + 1 — xato; "U — diapazon" `linear` | tasdiq kutadi | RISKS R-19 | — |
| KL-054 | Qamrab olinmagan: standart eritmalar orasidagi korrelyatsiya (faqat GLS / `covY` orqali qo'lda); x va y orasidagi kovariatsiya UI da yo'q; teskari bashorat — birinchi tartibli yaqinlashish (Fieller intervali emas) | qilinmagan | RISKS R-19 | — |
| KL-055 | Regressiya holati `localStorage` (`uc_regression_v1`) da — audit izisiz | qoldiq xavf | RISKS R-19 | — |
| KL-056 | `R-01` shabloni DRAFT | qoldiq xavf | `CLAUDE.md` (P08) | — |

## 5. Top-down

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-060 | ISO 21748 ga xos hisoblar: laboratoriya s_r tekshiruvi (χ²), s_R ni moslash, u(δ̂) — standart matni bilan solishtirilmagan | unverified | `CLAUDE.md` (P09); RISKS R-20; VALIDATION_MATRIX §8 | natijada `topdown_unverified`, hisobotda "unverified" yorlig'i |
| KL-061 | Qamrab olinmagan: diapazonni avtomatik bo'lish; PT natijalaridan to'g'ridan-to'g'ri s_R; bir nechta bias manbasini birga ishlatish; ISO 11352; QC kartalaridan avtomatik s_Rw | qilinmagan | RISKS R-20 | — |
| KL-062 | k = 2 ("k = 2, P ≈ 95 %"); ν_eff < 30 da ogohlantirish va t_P(⌊ν_eff⌋) taklifi — k avtomatik o'zgarmaydi | qoldiq xavf (egasi qarori) | `CLAUDE.md` (P09); RISKS R-20 | — |
| KL-063 | Manba (Nordtest TR 537) U ni yuqoriga yaxlitlaydi (6,40 → 7 %); dastur egasi qoidasi bo'yicha 2 qiymatli raqam beradi (6,4 %) | qoldiq xavf | RISKS R-20; DISCREPANCIES C (T15) | manba misoli bilan ko'rinishda farq |
| KL-064 | Top-down holati `localStorage` (`uc_topdown_v1`) da — audit izisiz | qoldiq xavf | RISKS R-20 | — |
| KL-065 | `TD-01…TD-04` shablonlari DRAFT, raqamsiz | qoldiq xavf | `CLAUDE.md` (P09) | — |
| KL-066 | Manba nuanslari D-12, D-13, D-14 (Nordtest TR 537, QUAM A4) — toleransda hisobga olingan | qoldiq xavf (manba nuansi) | DISCREPANCIES D-12…D-14 | — |

## 6. Maxsus rejimlar

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-070 | Mikrobiologiya (`src/engine/micro/`): ISO 19036 repoda yo'q; faqat analitik testlar; past sanoq (ΣC < 10) va "kam juftlik" (< 10) — loyiha parametrlari | BETA | `CLAUDE.md` (P10); RISKS R-21 | natijada har doim ogohlantirish va "BETA" belgisi (bosmada ham); shablon `SP-03` APPROVED bo'la olmaydi |
| KL-071 | Tibbiy laboratoriya (`src/engine/medical/`): ISO/TS 20914 repoda yo'q; eng yaqin IQC darajasi va "kam IQC" (n < 20) — loyiha qoidalari | BETA | `CLAUDE.md` (P10); RISKS R-21 | natijada har doim ogohlantirish va "BETA" belgisi; shablon `SP-04` APPROVED bo'la olmaydi |
| KL-072 | Robust ANOVA — qayta tiklangan algoritm (RANOVA kodi repoda yo'q); UfS A1, A2 bilan 4 qiymatli raqamgacha mos | qoldiq xavf | `CLAUDE.md` (P10); RISKS R-21; DISCREPANCIES D-16 | boshqa ma'lumotlarda asl dastur bilan farq istisno qilinmaydi; natijada `sampling_robust_reconstructed` |
| KL-073 | Clopper–Pearson — loyiha qo'shimchasi (AQA:2021 da yo'q); SciPy 1.18.1 qiymatlari bilan tekshirilgan, qiymatlar sessiyada hisoblangan (repoda hujjat sifatida yo'q) | qoldiq xavf | `CLAUDE.md` (P10); RISKS R-21 | tanlansa natijada `qualitative_cp_project_addition`; egasi qayta tekshirishi mumkin |
| KL-074 | Qilinmagan: LOD₉₅ (probit / logistik); muvozanatsiz va 3 darajali dizaynlar; namuna olish bias'i; ISO 29201; mikrobiologiyada MPN | qilinmagan | RISKS R-21 | — |
| KL-075 | "Maxsus rejimlar" oynasi real brauzerda qo'lda ko'rilmagan (faqat jsdom testi) | ko'rilmagan | `CLAUDE.md` (P10); RISKS R-21 | — |
| KL-076 | Holat `localStorage` (`uc_special_v1`) da — audit izisiz | qoldiq xavf | RISKS R-21 | — |
| KL-077 | Manba nuanslari D-15, D-17 (AQA:2021) — toleransda hisobga olingan | qoldiq xavf (manba nuansi) | DISCREPANCIES D-15, D-17 | — |
| KL-078 | `SP-01…SP-04` shablonlari DRAFT, raqamsiz | qoldiq xavf | `CLAUDE.md` (P10) | — |
| KL-079 | Mikrobiologiya (M8, ISO 19036) — qo'llab-quvvatlanMAYDI: tasdiqlash (konfirmatsiya) noaniqligi u_conf (§7.3); MPN noaniqligi u_MPN (§7.4); §8.1.3 varianti; tuzatilgan oraliq takrorlanuvchanlik s_IR,corr (D ilova); LOQ dan past natija (§9.2). Band raqamlari egasi ko'rsatmasidan (standart matni repoda yo'q — unverified) | qilinmagan / BETA | egasi ko'rsatmasi (2026-11-20); `CLAUDE.md` (P10); RISKS R-21 | modul to'liq standart matni bilan tasdiqlanmaguncha BETA bo'lib qoladi; bu holatlarda natija ISO 19036 ga muvofiq deb berilmaydi; ISO matni repoga qo'shilmaydi |

## 7. Laboratoriya reestri, CMC, QC

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-080 | ISO/IEC 17025 §6.4, §6.5, §7.7.1 — repoda yo'q | unverified | `CLAUDE.md` (P11); RISKS R-25 | linter `ref` da ko'rsatilmaydi |
| KL-081 | Kalibrlash intervali formulasi — loyihaniki (ILAC G24 / OIML D 10 formula bermaydi) | qoldiq xavf (loyiha qarori, tasdiqlangan) | `CLAUDE.md` (P11); RISKS R-25 | faqat tavsiya |
| KL-082 | R₄s seriya belgisisiz ketma-ket juftlikka qo'llansa — "loyiha yaqinlashuvi" (`approximation: true`) | qoldiq xavf | `CLAUDE.md` (P11); RISKS R-25 | kartadagi topilmada yoziladi |
| KL-083 | Ko'p materialli Westgard (`westgardMulti`) — UI da guruhlash yo'q; 3+ materialda loyiha umumlashmasi | qilinmagan (UI) | `CLAUDE.md` (P11); `CHANGELOG.md` 2.8.1 | — |
| KL-084 | Qilinmagan: CMC matritsa / grafik ko'rinishi; regressiya bilan interpolyatsiya (faqat chiziqli); reestr `.xlsx` eksporti; ustunlarni qo'lda moslash; CMC jadvalini `.xlsx` dan import; bir nechta nazorat darajasi bitta kartada; vektor hisobda CMC jadvali chiqishga xos emas | qilinmagan | `CLAUDE.md` (P11); RISKS R-25 | — |
| KL-085 | Reestr bosma hisoboti real brauzerda qo'lda ko'rilmagan (ekran Chromium da ko'rilgan) | ko'rilmagan | `CLAUDE.md` (P11); RISKS R-25 | — |
| KL-086 | Rol himoyasi lokal rejimda ogohlantirish darajasida: `guest` tahrirlay oladi (yozuvda `savedBy: 'guest'`); saqlash qatlami QC yozuvlarini rol bo'yicha cheklamaydi | qoldiq xavf | `CLAUDE.md` (P11); RISKS R-25 | hisobotda info `registry_unauthenticated` / `cmc_unauthenticated`; server himoyasi — P15 |
| KL-087 | Etalonning `limit` (MPE / tolerans) faqat interval tavsiyasi uchun; drift va interpolyatsiya manbalari — faqat taklif | qoldiq xavf (qoida) | `CLAUDE.md` (P11) | raqamni foydalanuvchi kiritadi / tasdiqlaydi |

## 8. PT va usul validatsiyasi

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-090 | ISO 13528 (ball formulalari, u(x_pt) > 0,3·σ_pt), ISO/IEC 17043 — solishtirilmagan | unverified | `CLAUDE.md` (P12); RISKS R-26 | — |
| KL-091 | PT baholash chegaralari (2 / 3; E_n 1), chegaradagi qiymat qoniqarli, 10⁻¹² tolerans | tasdiq kutadi (loyiha standarti) | `CLAUDE.md` (P12); RISKS R-26 #1 | tasdiqlanmaguncha hisobotda "loyiha standarti" deb yoziladi |
| KL-092 | ANOVA da s_b² < 0 → s_b = 0 + info | tasdiq kutadi | RISKS R-26 #2 | — |
| KL-093 | Grubbs: α = 0,05 standart; faqat bitta chetga chiquvchi; avtomatik chiqarish yo'q; generalized ESD yo'q | tasdiq kutadi / qilinmagan | RISKS R-26 #3 | chiqarish — foydalanuvchi qarori |
| KL-094 | Cochran C (ISO 5725-2) — kritik qiymat Monte-Karlo bilan mustaqil tekshirilgan (todo-test) | unverified; tasdiq kutadi | `CLAUDE.md` (P12); RISKS R-26 #4 | natijada har doim `cochran_unverified` + hisobotda belgi |
| KL-095 | LOD / LOQ (Eurachem FfP 2014, ICH Q2): k_Q = 10 standart; kalibrlash usuli (3,3 / 10) | unverified; tasdiq kutadi | `CLAUDE.md` (P12); RISKS R-26 #5 | hisobotda unverified belgisi |
| KL-096 | Teng bo'lmagan guruhlarda n₀ — formula manbasi repoda yo'q | unverified | `CLAUDE.md` (P12); VALIDATION_MATRIX §15 | — |
| KL-097 | L3 linter qoidasi (oxirgi PT raundi qoniqarsiz) — yoqilmagan | tasdiq kutadi | LINTER_RULES §4 #30; RISKS R-26 #6 | — |
| KL-098 | Top-down qoralamasida s_I ning erkinlik darajasi — bo'sh, foydalanuvchi kiritadi | tasdiq kutadi | RISKS R-26 #7 | — |
| KL-099 | PT trend qoidalari yo'q (faqat grafik); raundni joyida tahrirlash yo'q (o'chirib qayta qo'shiladi) | qilinmagan | `CLAUDE.md` (P12); RISKS R-26 #8 | — |
| KL-100 | "Malaka sinovlari" va "Validatsiya" bo'limlari real brauzerda qo'lda ko'rilmagan (faqat jsdom) | ko'rilmagan | `CLAUDE.md` (P12); RISKS R-26 | — |
| KL-101 | D-22: NIST Grubbs misolida G manbada kesilgan (yaxlitlanmagan) | qoldiq xavf (manba nuansi) | DISCREPANCIES D-22 | — |

## 9. Linter, qaror qoidasi, hisobot, i18n

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-110 | Linter chegaralari va darajalari me'yoriy talab emas — loyiha qarorlari (egasi tasdiqlagan) | qoldiq xavf | `CLAUDE.md` (P05a); LINTER_RULES §4 | — |
| KL-111 | TUR 4:1 — amaliyotdagi qoida, manbasi repoda yo'q (`decision_tur_below_4`) | unverified | `CLAUDE.md` (P05a); LINTER_RULES §4 #18 | — |
| KL-112 | X1, X2, X10 — manba nomi / `kind` bo'yicha evristika | qoldiq xavf | LINTER_RULES §4 #12, #13 | boshqacha nomlangan manba aniqlanmasligi mumkin |
| KL-113 | A4 (Grubbs, linter) — ISO 5725-2 repoda yo'q | unverified | LINTER_RULES §4 #6; VALIDATION_MATRIX §10 | faqat info |
| KL-114 | Qaror qoidasi: p_c har doim normal taqsimot bilan; faqat shu o'lchov uchun (specific) xavf — umumiy xavf (JCGM 106 §9) hisoblanmaydi | qoldiq xavf (egasi tasdiqlagan) | RISKS R-22; LINTER_RULES §4 #19 | ν_eff < 30 da eslatma |
| KL-115 | Qoida yoki chegara yo'q — muvofiqlik bayonoti berilmaydi; etalon misollarda `decision_rule_missing` — kutilgan holat | qoldiq xavf (qoida) | `CLAUDE.md` (P05b) | foydalanuvchi qoidani tasdiqlashi kerak |
| KL-116 | Rekvizitlar ro'yxati (ISO/IEC 17025 §7.8.2.1 / §7.8.3.1 / §7.8.4.1; `src/report/requisites.js::REQUIRED`) | unverified | `CLAUDE.md` (P05b); RISKS R-22 | hisobotda ham shunday yoziladi; ogohlantirish chop etishni bloklamaydi |
| KL-117 | Hisob xeshi rekvizitlarni qamramaydi (xesh hisobni tasdiqlaydi, hujjat sarlavhasini emas) | qoldiq xavf | RISKS R-22 | — |
| KL-118 | Ko'p nuqtali jadvalning o'zida (qator darajasida) belgi yo'q — belgi hisobot boshida va nuqta bo'limida | qoldiq xavf | RISKS P05a natijasi (R-05) | — |
| KL-119 | Suv belgisi va bosma hisobot real printerda ko'rilmagan | ko'rilmagan | RISKS P05a natijasi (R-05) | — |
| KL-120 | Qilinmagan: DCC (Digital Calibration Certificate) XML; PDF/A; elektron imzo; `/verify` sahifasi; B tur manbalarini fayldan import; regressiya / top-down / maxsus rejim `.xlsx` varag'ida tarjima qilingan maydon nomlari | qilinmagan | RISKS R-22 | — |
| KL-121 | Import / eksport qoldiq xavfi: ZIP-bomba himoyasi e'lon qilingan hajmga tayanadi; GUM eksportida natija joriy kirishlardan qayta hisoblanadi; import voqeasi audit zanjiriga yozilmaydi; SheetJS CE yangilanishi qo'lda | qoldiq xavf | RISKS R-22 | — |
| KL-122 | i18n istisnolari: shablon diagnostika xabarlari (~70 ta, inglizcha); "BETA" / "unverified" belgilari tarjima qilinmagan; ruscha / inglizcha tarjimalarni soha mutaxassisi ko'rib chiqmagan | qoldiq xavf | RISKS P05a natijasi (R-13) | — |
| KL-123 | Barcha ichki shablonlar (11 `legacy-*` + 24 `T-*` va b.) DRAFT; 1-to'lqin shablonlarida raqam yo'q; T-shablonlar `pending` | qoldiq xavf | `CLAUDE.md` (P04); VALIDATION_MATRIX §6.1 | APPROVED — laboratoriya `APPROVAL_CHECKLIST` bo'yicha |
| KL-124 | Sertifikat manbasini umumiy / nuqtaga xos qismga bo'lish: laboratoriya noto'g'ri bo'lishi mumkin | qoldiq xavf | RISKS R-18 | `APPROVAL_CHECKLIST` ga kiritilgan |

## 10. Saqlash va ma'lumotlar yaxlitligi

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-130 | Joriy sessiya hali `uc_state_v2` (`localStorage`) da; kvota xatosi jimgina | qoldiq xavf | RISKS R-09 | — |
| KL-131 | Lokal audit zanjiri — faqat buzilganini aniqlash darajasida; server — P15 | qoldiq xavf | RISKS R-09, P05a natijasi | — |
| KL-132 | Rol lokal rejimda faqat Firebase sessiyasidan olinadi; kirmagan foydalanuvchi — `guest` | qoldiq xavf | RISKS P05a natijasi | — |
| KL-133 | Regressiya / top-down / maxsus rejimlarda qabul qilishlar `localStorage` (`uc_findings_accept_v1`) + audit zanjirida; hisobning o'zi IndexedDB da emas | qoldiq xavf | RISKS P05a natijasi | — |
| KL-134 | Ma'lumotlar foydalanuvchi brauzerida; server tomonidagi saqlash va zaxira yo'q | rejalashtirilgan (P15) | `docs/PLAN.md` P15; RISKS R-09 | zaxira — foydalanuvchining eksporti |

## 11. Xavfsizlik va Firebase konsol amallari

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-140 | Konsol amallari (qoidalarni joylash, Auth'ni yoqish, claim, migratsiya) egasi tomonidan bajariladi; bajarilmaguncha Firestore eng yomon holatda (ochiq) deb hisoblanadi | egasi qadami | `CLAUDE.md` (P02); RISKS R-S1; `docs/SECURITY_SETUP.md` | — |
| KL-141 | Eski super-admin paroli git tarixida; eski xodim parollari oshkor deb hisoblanadi | qoldiq xavf | RISKS R-S2, R-S3; `docs/SECURITY_SETUP.md` §11 | qayta ishlatilmaydi; yangi parollar |
| KL-142 | CSP: `style-src 'unsafe-inline'` qolgan; Google Fonts tashqi; `frame-ancestors` meta'da ishlamaydi | qoldiq xavf | RISKS P02 natijasi (R-S5, R-14) | — |
| KL-143 | Trial hisoblagichi va xodimlar limiti mijoz tomonda (Spark tarifi, Cloud Functions'siz); Click / Payme merchant ID lari to'ldirilmagan | qoldiq xavf | RISKS R-15 | — |
| KL-144 | Shaxsiy ma'lumotlarni O'zbekistondagi serverga ko'chirish zaruriyati O'RQ-1125 (26.03.2026) bo'yicha yuridik qayta baholanadi | rejalashtirilgan (P15) | `CLAUDE.md`; `docs/DATA_RESIDENCY.md` | — |

## 12. Brauzerlar va takrorlanuvchanlik

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-150 | Bit darajasidagi takrorlanuvchanlik faqat bir xil JS dvigateli versiyasi ichida: R(0, 1) hamma joyda bir xil, lekin `Math.log` / `sin` / `cos` oxirgi xonada farq qiladi → Gauss kirishli MCM natijalari ≈ 10⁻¹⁶ nisbiy farq qiladi | qoldiq xavf (egasi qarori B, 2026-11-19) | `CLAUDE.md` (P06); RISKS R-23, R-24 | yaxlitlangan natija o'zgarmaydi; `uc-calc/1` dagi MCM natijasini boshqa brauzerda qayta hisoblash "aynan bir xil emas" deb ko'rsatishi mumkin |
| KL-151 | Dvigatelning o'z `log` / `sin` / `cos` (fdlibm) nusxasi qilinmaydi; xom qiymatlarda nisbiy farq ≤ 1·10⁻¹⁴ qabul qilinadi | qilinmagan (egasi qarori B) | [VALIDATION_PLAN.md](VALIDATION_PLAN.md) §4 | — |
| KL-152 | Linux dagi WebKit (Playwright) — Safari emas; Safari (macOS / iOS) avtomatik tekshirilmaydi | ko'rilmagan | [VALIDATION_PLAN.md](VALIDATION_PLAN.md) §4 | laboratoriya PQ da qo'lda tekshiradi |
| KL-153 | Brauzerlar: ES modullar (2018+); eski brauzerga faqat oddiy ogohlantirish | qoldiq xavf (egasi qarori) | `CLAUDE.md` | eski brauzerda faqat ogohlantirish chiqadi |
| KL-154 | Brauzerlararo 1·10⁻¹⁴ chegarasi shartlanganligi yomon hosila kattaliklarda bajarilmaydi (Node 22 ↔ Chromium 157: 14 qiymat, maks. 3,4·10⁻¹¹; yaxlitlangan natija bir xil) — istisnolar ro'yxati `tests/crossbrowser/exceptions.json` | tasdiq kutadi | `docs/RISKS.md` R-24, R-27 (1) | Hisobotdagi yaxlitlangan natijaga ta'sir qilmaydi; JSON eksportdagi yaxlitlanmagan ayrim yordamchi qiymatlar brauzerga qarab 10⁻¹¹ darajasida farq qilishi mumkin |

## 13. Deploy

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-160 | Egasi Pages manbasini "GitHub Actions" ga o'tkazishi kerak (`build.json` va versiyalangan modul URL'lari shu deploy orqali chiqadi) | egasi qadami | `docs/DEPLOY.md`; RISKS R-22 | avvalgi deploy usulida: deploydan keyin ~10 daqiqa eski va yangi modullar aralashishi kuzatilgan — sahifani keshsiz yangilash (Ctrl+F5) |
| KL-161 | Yangi versiya chiqsa brauzerda faqat banner — avtomatik qayta yuklash yo'q | qoldiq xavf | [VALIDATION_PLAN.md](VALIDATION_PLAN.md) §5 | foydalanuvchi sahifani o'zi yangilaydi |

## 14. Rejalashtirilgan / kutilmoqda

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-170 | NIST Uncertainty Machine bilan o'zaro tekshiruv: `tests/crosscheck/num/` da 5 misol uchun kirish ma'lumotlari tayyor; natijalar — `pending` (egasi NUM da ishga tushiradi) | rejalashtirilgan (pending) | [VALIDATION_PLAN.md](VALIDATION_PLAN.md) §5 | solishtiruv hali bajarilmagan |
| KL-171 | PTB TraCIM bilan o'zaro tekshiruv | rejalashtirilgan (qilinmagan) | `docs/PLAN.md` P13 | — |
| KL-172 | AI yordamchi (P14, ixtiyoriy) | yopildi | `docs/PLAN.md` P14 | P14 da amalga oshirildi (2026-11-20) — cheklovlari 15-bo'limda (KL-175 … KL-184) |
| KL-173 | O'zbekistondagi server (P15): mustaqil qayta hisob, tasdiqlash, `/verify`, server audit, zaxira | rejalashtirilgan (hosting qaroridan keyin) | `docs/PLAN.md` P15 | — |
| KL-174 | Mustaqil (tashqi) ko'rib chiqish | rejalashtirilgan | `docs/PLAN.md` P13 ("mustaqil ko'rib chiqish") | — |

## 15. AI yordamchi (P14)

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-175 | AI yordamchi — ixtiyoriy, standart holatda o'chiq; AI hech narsa hisoblamaydi. "O'z kaliti" rejimida ma'lumot chet eldagi xizmatga (Anthropic) ketadi; nusxa-qo'y rejimida — foydalanuvchi o'zi tanlagan xizmatga | qoldiq xavf (egasi qarori) | `docs/AI_DESIGN.md` §11; `docs/RISKS.md` R-28 | Yuridik baho (O'RQ-547) laboratoriya / egasi tomonida; dastur faqat ogohlantiradi |
| KL-176 | Foydalanuvchi yuklagan metodika / sertifikat matnidagi shaxs ismlarini dastur ishonchli topa olmaydi — faqat email, telefon, STIR ko'rinishidagi parchalar soni ko'rsatiladi; matn avtomatik tozalanmaydi | qoldiq xavf | `docs/AI_DESIGN.md` §4.3 | Hujjatni yuborishdan oldin foydalanuvchi o'zi tekshiradi |
| KL-177 | Rasm / PDF dan o'qilgan sertifikat qiymatlarida manba parchasi dastur tomonidan tekshirilmaydi (faqat matnli kirishda tekshiriladi); nusxa-qo'y rejimida rasmni foydalanuvchi AI ga o'zi biriktiradi | qilinmagan | `docs/AI_DESIGN.md` §5 b, §13 (6) | Oynada ogohlantirish; har bir qiymat hujjat bilan qo'lda solishtiriladi |
| KL-178 | MPE filtri kalit so'zlarga tayanadi (uz / ru / en) — to'liq kafolat emas; `specification` turidagi taklif ogohlantirish bilan ko'rsatiladi | tasdiq kutadi | `docs/AI_DESIGN.md` §13 (1); `docs/RISKS.md` R-28 | Ikkinchi himoya — linter X1; qaror foydalanuvchida |
| KL-179 | AI tushuntirishi va bosma ilova faqat GUM hisobi uchun; regressiya, top-down, maxsus rejimlar, PT — ulanmagan | qilinmagan | `docs/AI_DESIGN.md` §13 (2), (3) | — |
| KL-180 | Sertifikat sanasi faqat KK.OO.YYYY, KK/OO/YYYY, YYYY-OO-KK ko'rinishida qabul qilinadi; oy nomi bilan yozilgan sana rad etiladi | tasdiq kutadi | `docs/AI_DESIGN.md` §13 (4) | Sana qo'lda kiritiladi |
| KL-181 | Brauzerdagi API kaliti (faqat `ai.html`, `sessionStorage`) XSS bo'lsa o'g'irlanishi mumkin; to'liq yechim — server orqali chaqiruv | rejalashtirilgan (P15 dan keyin) | `docs/AI_DESIGN.md` §9 | Kalit foydalanuvchining o'ziniki, oyna yopilganda o'chadi; asosiy sahifalarda kalit yo'q |
| KL-182 | Haqiqiy AI xizmati bilan avtomatik test yo'q (CI da kalit yo'q) — faqat mock; Chromium da mock bilan tutun-testi o'tkazilgan; Firefox / Safari da AI oynasi qo'lda ko'rilmagan | ko'rilmagan | `docs/AI_DESIGN.md` §13 | — |
| KL-183 | Prompt matni (a, b da hujjat bilan) "o'z kaliti" rejimida brauzer IndexedDB sidagi vaqtinchalik omborda 1 soatgacha turadi (eksportga va auditga kirmaydi; javob olingach o'chiriladi) | qoldiq xavf | `docs/AI_DESIGN.md` §13 (5) | — |
| KL-184 | ISO/IEC 42001 repoda yo'q (pullik) — AI boshqaruviga oid bandlar tamoyil darajasida, iqtibossiz | unverified | `docs/AI_DESIGN.md` §10 | — |

## 16. LPU → MCM qaror qoidasi, hujjat holati va huquqiy sahifalar (P20)

| ID | Cheklov | Turi | Manba | Foydalanuvchiga ta'siri |
|---|---|---|---|---|
| KL-185 | LPU → MCM avtomatik qaror qoidasi chegaralari (\|c_i\|u(x_i)/u_c > 0,50; ν_eff < 6; fizik chegara \|y − chegara\| < U; asimmetrik taqsimot) — **loyiha qarori**, me'yoriy talab emas: JCGM 100 / 101 da bunday sonlar yo'q, faqat LPU shartlari (JCGM 101:2008 §5.7, §5.8) bor | loyiha qarori (egasi, 2026-11-21) | `src/engine/mcm-decision.js`; `docs/LINTER_RULES.md` §4 #23a; `docs/RISKS.md` R-30 | Qoida ehtiyotkor: 9 ta etalon Excel nuqtasining hammasida MCM talab qilinadi ((b) sharti); MCM bajarilmasa hisobot "QORALAMA" belgisi bilan chiqadi |
| KL-186 | Talab qilingan MCM chegaraga (M = 10⁷) yetib "yaqinlashmadi" holatida tugashi mumkin (masalan, zichlik namunasi); bu holat "bajarilgan" hisoblanadi — hisobot QORALAMA bo'lmaydi, lekin §8 xulosasi sonli tolerans bilan birga ko'rsatiladi | qoldiq (egasi qarorini kutadi) | `docs/RISKS.md` R-29, R-30 | "Yaqinlashmadi" holatida LPU natijasi tasdiqlangan deb hisoblanmaydi; M chegarasi egasi qarorisiz oshirilmaydi |
| KL-187 | Fizik chegara (`settings.physicalBounds`) uchun interfeysda kiritish maydoni yo'q — hozircha faqat hisob fayli / API orqali; vektor (ko'p chiqishli) va oshkormas modellarda avtomatik MCM ishga tushmaydi (har bir chiqishda `mcm` maydoni bor, lekin holat bloki va QORALAMA sharti faqat bitta chiqishli GUM hisobida) | qilinmagan | `docs/RISKS.md` R-30 | — |
| KL-188 | "QORALAMA" sharti uchun majburiy rekvizitlar ro'yxati (ISO/IEC 17025:2017 §7.8.2.1 asosida) — unverified (standart repoda yo'q); regressiya, top-down va maxsus rejimlar hisobotida MCM sharti qo'llanmaydi, faqat rekvizitlar sharti | unverified | `src/report/requisites.js`; `src/report/forms.js::draftReasons` | Laboratoriya o'z sifat tizimi shakli bilan solishtiradi |
| KL-189 | `privacy.html` va `terms.html` matni — loyiha, yurist tasdig'ini kutadi; nofaol hisoblar uchun saqlash muddati belgilanmagan; hujjat versiyasi o'zgarganda qayta rozilik so'rash oqimi yo'q (rozilik faqat ro'yxatdan o'tishda olinadi); mavjud tashkilotlar hujjatida rozilik maydonlari yo'q | tasdiq kutadi | `docs/DATA_RESIDENCY.md`; `docs/RISKS.md` R-30 | Sahifa boshida "Loyiha — yurist tasdig'ini kutmoqda" belgisi |

---

## Manbalar orasidagi nomuvofiqliklar (shu ro'yxatni yig'ishda topilgan)

Bu bandlarda `CLAUDE.md` va `docs/RISKS.md` ustun deb olindi; eskirgan satrlar tuzatilishi kerak (bu hujjat ularni o'zgartirmaydi).

1. `docs/VALIDATION_MATRIX.md` §4: "JCGM 102, 106, GUM-6, ILAC P14, ILAC G8, COOMET R/GM/32 — PDF hali `docs/references/` da yo'q". Amalda JCGM 102, JCGM 106, ILAC P14, ILAC G8 repoda bor (`docs/references/`); yo'q — faqat GUM-6 va COOMET R/GM/32.
2. `docs/VALIDATION_MATRIX.md` §14: Shewhart konstantalari, NIST §6.3.2.2 misoli (`todo`) va Westgard qoidalari "unverified" deb turibdi. `CLAUDE.md`, RISKS R-25 (xulosa jadvali) va `CHANGELOG.md` 2.8.1 bo'yicha — verified (yopildi 2026-11-19). RISKS R-25 ning batafsil jadvalidagi #2 qatori ham eski holatda.
3. `docs/VALIDATION_MATRIX.md` §7: "U — diapazon (ILAC P14:09/2020 — PDF yo'q)". PDF repoda bor; funksiya baribir matn bilan solishtirilmagan (RISKS R-19) — KL-051.
4. `docs/RISKS.md` P05a natijasi: "`below_cmc` manbasi (ILAC P14) repoda yo'q — unverified"; P05b natijasi va `CLAUDE.md` bo'yicha — §5.5, verified.
5. `src/report/rounding.js` sarlavha izohi: "ILAC P14:09/2020 §5.4 (docs/references da hali yo'q — tekshirilmagan)"; `CLAUDE.md` yaxlitlash qoidasini "ILAC P14 §5" deb beradi va PDF repoda bor. **Yopildi (P13):** PDF bilan solishtirildi — yaxlitlash talabi ILAC P14:09/2020 **§5.3** da ("at most, two significant digits"); `rounding.js` izohi tuzatildi.
6. `CHANGELOG.md` 2.10.0: "91 ta misol"; `tests/cases/` da 92 ta JSON (90 verified + 2 unverified). **Aniqlandi (P13):** 91 — `modelSpec` li (ishga tushiriladigan) misollar soni (`scripts/cases-snapshot.js`); 92-fayl — `nist-um-ratio` (unverified, `modelSpec` siz).
7. `docs/RISKS.md` R-19, R-20, R-21: holatni IndexedDB ga ko'chirish "P05" deb yozilgan; P05a natijasida "hisobning o'zi hali IndexedDB da emas" — ko'chirish bajarilmagan (KL-055, KL-064, KL-076, KL-133).
