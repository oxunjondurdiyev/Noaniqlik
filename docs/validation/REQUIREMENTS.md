# Talablar (REQUIREMENTS)

> **Manba (yagona, qo'lda yuritiladi).** Har bir talabning barqaror identifikatori bor (`REQ-<SOHA>-NNN`); ID qayta ishlatilmaydi va o'zgartirilmaydi. Talab ↔ kod ↔ test bog'lanishi — [`rtm.map.json`](rtm.map.json); izlanuvchanlik matritsasi [`RTM.md`](RTM.md) shu ikki fayldan `node scripts/rtm.js --write` bilan **avtomatik** yaratiladi (qo'lda tahrirlanmaydi). Bog'lanmagan talab — `npm test` xatosi (`tests/validation/rtm.test.js`).
>
> **Kelib chiqishi.** GUM … PTV, SRC, INF bo'limlari — avvalgi `docs/VALIDATION_MATRIX.md` (P01–P12) qatorlaridan ko'chirilgan (2026-11-19, P13; mazmun o'zgartirilmagan, eskirgan holat belgilari CLAUDE.md bo'yicha yangilangan). GOV — CLAUDE.md dagi majburiy qoidalar va egasi qarorlari. VAL — P13. Talab o'ylab topilmagan.
>
> **Me'yoriy asos.** ISO/IEC 17025:2017 §7.11.2 (dasturiy ta'minot validatsiyasi) — **unverified**: standart repoda yo'q (pullik). Talablardagi band havolalari `docs/references/` dagi hujjatlarga; repoda yo'q hujjat talab matnida aytilgan.
>
> **Yangi talab qo'shish:** shu faylga qator (keyingi bo'sh raqam) → `rtm.map.json` ga yozuv (kod, test, holat) → `node scripts/rtm.js --write`. Tartib — [CHANGE_CONTROL.md](CHANGE_CONTROL.md). Talablar ro'yxatini egasi tasdiqlaydi.

## GOV — Loyihaning majburiy qoidalari (CLAUDE.md, egasi qarorlari)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-GOV-001 | Hisoblash yadrosi (`src/engine/`) DOM, `window` va `localStorage` ga bog'liq bo'lmagan sof ES modullardan iborat; brauzerda ham, Node'da ham ishlaydi | CLAUDE.md — Metrologik qoidalar |
| REQ-GOV-002 | Oraliq hisoblar yaxlitlanmaydi; yaxlitlash faqat hisobot qatlamida: U ko'pi bilan 2 qiymatli raqam (0,0999 → 0,10), y — round half away from zero, U ning oxirgi xonasigacha | CLAUDE.md — egasi qarorlari; ILAC P14:09/2020 §5 |
| REQ-GOV-003 | Kalibrlanayotgan asbobning MPE si hech qachon avtomatik noaniqlik manbai bo'lmaydi | CLAUDE.md — Metrologik qoidalar |
| REQ-GOV-004 | U = 0 yoki U < CMC bo'lgan natija ogohlantirishsiz hisobotga chiqmaydi | CLAUDE.md — Metrologik qoidalar; ILAC P14:09/2020 §5.5 |
| REQ-GOV-005 | ν_eff kasr bo'lsa standart qoida `floor`; `interpolate` — ixtiyoriy sozlama; qo'llanilgan qoida hisobotda yoziladi | CLAUDE.md — egasi qarorlari; JCGM 100:2008 G.4.1 Note 1 |
| REQ-GOV-006 | 9 ta etalon Excel nuqtasi (zichlik 1 + gazoanalizator 3 + termometr 5) va 10-test (gazoanalizator 2-nuqta MC intervali) o'zgarmaydi | CLAUDE.md — Muhandislik qoidalari; Q-3 (b) |
| REQ-GOV-007 | Test misolining kutilgan qiymatlari faqat asl manbadan (hujjat bandi / sahifasi yoki Excel katagi havolasi bilan) | CLAUDE.md — Metrologik qoidalar |
| REQ-GOV-008 | Barcha foydalanuvchi matnlari i18n orqali va uch tilda (uz / ru / en) | CLAUDE.md — Muhandislik qoidalari |
| REQ-GOV-009 | `innerHTML` ga foydalanuvchi ma'lumoti escape qilinmasdan qo'yilmaydi; inline skript va `onclick` yo'q (CSP `script-src 'self'`) | CLAUDE.md — Muhandislik qoidalari; P02 |
| REQ-GOV-010 | Tashqi kutubxonalar faqat `vendor/` da, aniq versiya, litsenziya va xesh bilan; devDependency lar saytga yuklanmaydi | CLAUDE.md — Muhandislik qoidalari |
| REQ-GOV-011 | `ENGINE_VERSION` (semver) hisob natijasiga ta'sir qiladigan har qanday o'zgarishda oshiriladi; dvigatel fayllari qayd etilgan xeshga mos | CLAUDE.md — Muhandislik qoidalari |
| REQ-GOV-012 | Eski `localStorage` / saqlangan ma'lumotlar migratsiya funksiyasi orqali yangi formatga o'tkaziladi va yo'qolmaydi | CLAUDE.md — Muhandislik qoidalari |
| REQ-GOV-013 | Shaxsiy ma'lumotlar (F.I.Sh., telefon, email, STIR) yangi joyga, jumladan Firebase'ga, qo'shimcha yozilmaydi | CLAUDE.md — Muhandislik qoidalari |
| REQ-GOV-014 | Firestore qoidalari: default deny, a'zolik, super-admin custom claim | P02; docs/SECURITY_SETUP.md |

## GUM — GUM yondashuvi (JCGM 100:2008)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-GUM-001 | A tur: x̄, s(x̄) = s/√n, ν = n − 1 (§4.2.1–4.2.3) | Matritsa §1 |
| REQ-GUM-002 | A tur: oldindan aniqlangan s_p (§4.2.4) | Matritsa §1 |
| REQ-GUM-003 | A tur: ↑/↓ o'qishlar, birlashtirilgan s, ν = n − 2, histerezis | Matritsa §1 |
| REQ-GUM-004 | B tur: normal (U/k), to'g'ri burchakli, uchburchak, arksinus, rezolyutsiya d/(2√3) (§4.3.4–4.3.9, F.2.2.1) | Matritsa §1 |
| REQ-GUM-005 | B tur: formula ko'rinishidagi yarim kenglik (`0.0002 * I + 0.002`) | Matritsa §1 |
| REQ-GUM-006 | B tur: ν_i (G.4.2, Eq. G.3) | Matritsa §1 |
| REQ-GUM-007 | Formula parseri, o'zboshimcha model y = f(x) (§4.1) | Matritsa §1 |
| REQ-GUM-008 | Sezgirlik koeffitsientlari c_i = ∂f/∂x_i (§5.1.3) | Matritsa §1 |
| REQ-GUM-009 | u_c, mustaqil kirishlar (§5.1.2, Eq. 10) | Matritsa §1 |
| REQ-GUM-010 | Korrelyatsiya: juftlangan kuzatuvlardan r (§5.2.2–5.2.3, Eq. 14, 17) | Matritsa §1 |
| REQ-GUM-011 | Kovariatsiya B tur (`covB`, §5.2.2, F.1.2) | Matritsa §1 |
| REQ-GUM-012 | Welch–Satterthwaite ν_eff (G.4.1, Eq. G.2b) | Matritsa §1 |
| REQ-GUM-013 | ν_eff kasr → `floor` (G.4.1 Note 1; egasi qarori); `interpolate`, `exact` — ixtiyoriy | Matritsa §1 |
| REQ-GUM-014 | k = t_P(ν_eff) (G.3, Table G.2), P = 0,95 / 0,9545 / 0,99 / 0,9973 | Matritsa §1 |
| REQ-GUM-015 | k: ν → ∞ (normal kvantil) | Matritsa §1 |
| REQ-GUM-016 | k: katta ν — har doim t(⌊ν⌋), chegara yo'q (Q-1(a)) | Matritsa §1 |
| REQ-GUM-017 | k = 2 qat'iy (EA-4/02 §5) | Matritsa §1 |
| REQ-GUM-018 | U = k·u_c (§6.2.1) | Matritsa §1 |
| REQ-GUM-019 | Ikkinchi tartibli hadlar (§5.1.2 Note) — diagnostika, standartda o'chiq | Matritsa §1 |
| REQ-GUM-020 | Manfiy dispersiya,\|r\|> 1 → xato (C.3.6; PLAN P03 6-band) | Matritsa §1 |
| REQ-GUM-021 | Birliklar va o'lchamlik tahlili (GUM-6 §11 — PDF yo'q) | Matritsa §1 |
| REQ-GUM-022 | U = 0 → ogohlantirish (CLAUDE.md) | Matritsa §1 |
| REQ-GUM-023 | Regressiya / kalibrlash egri chizig'i (H.3) | Matritsa §1 |

## RND — Yaxlitlash va hisobot (ILAC P14, GUM §7.2)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-RND-001 | U — 2 qiymatli raqam, "yuqoriga" / "odatiy" rejim; y — U razryadigacha | Matritsa §2 |

## MCM — Monte-Karlo (JCGM 101:2008)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-MCM-001 | Taqsimotlarni tarqatish, M = 10⁶ (§7) | Matritsa §3 |
| REQ-MCM-002 | Ehtimollik bo'yicha simmetrik interval (§7.7.2) | Matritsa §3 |
| REQ-MCM-003 | Eng qisqa interval (§7.7.2) | Matritsa §3 |
| REQ-MCM-004 | I uchun siljitilgan-masshtablangan t (§6.4.9) | Matritsa §3 |
| REQ-MCM-005 | Raqamli tolerans δ, GUF validatsiyasi (§7.9.2, §8) | Matritsa §3 |
| REQ-MCM-006 | Ko'p o'lchamli normal, korrelyatsiya (§6.4.8) | Matritsa §3 |
| REQ-MCM-007 | t, arksinus, egri trapetsiya kirish taqsimotlari (Table 10) | Matritsa §3 |
| REQ-MCM-008 | Kengaytirilgan Wichmann–Hill: a, b, c, d konstantalari (C.3.3.2, Table C.2 — p. 61) | Matritsa §12 |
| REQ-MCM-009 | 64 bitli shakl i_j = (a_j·i_j) mod d_j (C.3.3.3) = Table C.2 dagi 32 bitli shakl; ko'paytma < 2⁵³ | Matritsa §12 |
| REQ-MCM-010 | Generator sifati (C.3.2.1 a) | Matritsa §12 |
| REQ-MCM-011 | Bir xil urug' → har qanday kompyuterda bir xil natija (C.3.2.1 c) | Matritsa §12 |
| REQ-MCM-012 | Box–Muller (C.4, Table C.3 — p. 62) | Matritsa §12 |
| REQ-MCM-013 | t-taqsimot (C.6, Table C.5 — p. 63) | Matritsa §12 |
| REQ-MCM-014 | To'g'ri burchakli (§6.4.2), uchburchak (§6.4.5), arksinus (§6.4.6), eksponensial (§6.4.10) — E, V va tanlash formulasi | Matritsa §12 |
| REQ-MCM-015 | Trapetsiya (§6.4.4: E, V, Eq. 7) | Matritsa §12 |
| REQ-MCM-016 | Egri trapetsiya (§6.4.3, Eq. 3–4; misol 10,0 V ± 0,1 V, d = 0,05 → u = 0,060 V — p. 21) | Matritsa §12 |
| REQ-MCM-017 | Log-normal | Matritsa §12 |
| REQ-MCM-018 | Ko'p o'lchovli Gauss, Cholesky (C.5, Table C.4; misol C.5.3 — p. 63) | Matritsa §12 |
| REQ-MCM-019 | δ = ½·10^l (§7.9.2, Examples 1–3 — p. 31) | Matritsa §12 |
| REQ-MCM-020 | Intervallar: q, r (§7.7.2 — p. 30) | Matritsa §12 |
| REQ-MCM-021 | Adaptiv protsedura (§7.9.4 — p. 32): M = max(J, 10⁴), 2s ≤ δ | Matritsa §12 |
| REQ-MCM-022 | GUM tekshiruvi (§8.1.3): Table 2 — Yes; Table 4 — No (d = 2,8 / 2,9); Table 6 GUF1 — No (d_low 0,045 1, d_high 0,043 0) | Matritsa §12 |
| REQ-MCM-023 | §9.4 solishtirish yo'qotishi: Table 8 (r = 0), Table 9 (r = 0,9) — 6 holat, M = 10⁶ | Matritsa §12 |
| REQ-MCM-024 | §9.5 KMD: Table 11 MCM — 838 nm, 36 nm, [745, 932] nm (99 %) | Matritsa §12 |
| REQ-MCM-025 | Nochiziqli model Y = X², x̄ = 0 — LPU rad etiladi | Matritsa §12 |
| REQ-MCM-026 | Normal bo'lmagan korrelyatsiya → natija yo'q + M2; `invalid_covariance` | Matritsa §12 |
| REQ-MCM-027 | Eski generator bilan 2.5.0 natijasini takrorlash | Matritsa §12 |
| REQ-MCM-028 | 10-test: gazoanalizator 2-nuqta (qo'llanma 9.1-jadval) | Matritsa §12 |
| REQ-MCM-029 | ν ≤ 2: u(y) aniqlanmagan, mezon faqat interval uchlari (§6.4.9.4, §7.6 Note 2; egasi qarori Q-5) | Matritsa §12 |
| REQ-MCM-030 | GUM tekshiruvida MCM toleransi δ/5 (§8.2; egasi qarori Q-8); erishilgan tolerans hisobotda; δ ga tushirish belgilanadi | Matritsa §12 |
| REQ-MCM-031 | Shablon sxemasida yangi taqsimotlar (trap, ctrap, exp, lognorm) | Matritsa §12 |
| REQ-MCM-032 | Web Worker, progress, bekor qilish; worker'siz bo'laklab (R-16) | Matritsa §12 |
| REQ-MCM-033 | LPU natijalari o'zgarmagan | Matritsa §12 |

## MVR — Ko'p o'zgaruvchili va oshkormas modellar (JCGM 102:2011; P07, P07b)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-MVR-001 | U_y = C_x·U_x·C_xᵀ (§6.2.1.3, Eq. (3)); §6.2.2 Example 1 | Matritsa §13 |
| REQ-MVR-002 | Ellipsoid k_p (§6.5.3, Table 1 — 20 qiymat), to'g'ri burchakli k_q (§6.5.4, Table 2) | Matritsa §13 |
| REQ-MVR-003 | Ikki o'lchovli soha, yuzlar (§6.5.2.3 Example 1–2, 21-bet) | Matritsa §13 |
| REQ-MVR-004 | MCM ellipsoidi (§7.7.2, Cholesky misoli), to'g'ri burchakli (§7.7.3) | Matritsa §13 |
| REQ-MVR-005 | §9.2.2–9.2.4 (Table 3–5): GUF, MCM, adaptiv MCM (§7.8), §8 xulosasi | Matritsa §13 |
| REQ-MVR-006 | §9.3 (Table 6–7), GUF qatorlari, 6 holat | Matritsa §13 |
| REQ-MVR-007 | §9.4 (Table 11): GUF va MCM (ko'p o'lchovli t, ν = 3) | Matritsa §13 |
| REQ-MVR-008 | JCGM 100 H.2 vektor sifatida (r(R,X) = −0,588; r(R,Z) = −0,485; r(X,Z) = 0,993) | Matritsa §13 |
| REQ-MVR-009 | Ko'p o'lchovli t (§5.3.2): o'rtacha, kovariatsiya ν/(ν − 2)·S/n, marginal t-kvantil; n ≤ N → `mc_t_dof` | Matritsa §13 |
| REQ-MVR-010 | Adaptiv M: §9.2.3 — 0,27·10⁶ (manba 0,35–0,45·10⁶), §9.2.4 — 1,52·10⁶ (manba 1,49–1,85·10⁶) | Matritsa §13 |
| REQ-MVR-011 | U_x musbat aniqlanmagan → `invalid_covariance` | Matritsa §13 |
| REQ-MVR-012 | m = 1: 2.6.0 bilan bit darajasida bir xil | Matritsa §13 |
| REQ-MVR-013 | `uc-calc/1` vektor natija: eksport → import → qayta hisob | Matritsa §13 |
| REQ-MVR-014 | Hisobot: chiqishlar jadvali, korrelyatsiya matritsasi, qamrov sohasi, ellips SVG; uch til | Matritsa §13 |
| REQ-MVR-015 | Linter MV1 | Matritsa §13 |
| REQ-MVR-016 | Shablon `outputs`, MV-01 | Matritsa §13 |
| REQ-MVR-017 | **P07b:** oshkor bo'lmagan model — Nyuton (§6.3.1.2), C_y / C_x, U_y (Eq. (8)); §9.5.2 (p. 56): θ̂ = 20,0232; u = 0,0045; c_y = 0,389; C_x | Matritsa §13 |
| REQ-MVR-018 | §9.5.3 (Table 15, 16 — p. 57): 10 baho, 10 noaniqlik, 45 korrelyatsiya | Matritsa §13 |
| REQ-MVR-019 | §6.3.2 Example 1 (bosim tarozisi), Example 2 (reflektometr) | Matritsa §13 |
| REQ-MVR-020 | C_y singular → `implicit_singular` (§6.3.1.3 Note 1); yaqinlashmasa → `implicit_no_convergence` | Matritsa §13 |
| REQ-MVR-021 | `atan2` (§9.3.1.1): qiymat, simvolik hosila, o'lchamlik | Matritsa §13 |
| REQ-MVR-022 | §9.3 MCM qatorlari (Table 6, 7 — p. 44–45), 6 holat × 5 qiymat | Matritsa §13 |
| REQ-MVR-023 | Eng kichik qamrov sohasi (§7.7.4 a–g), m = 2; misol (p. 31): yuz 9,4; 950 074 nuqta | Matritsa §13 |
| REQ-MVR-024 | Shablon muharririda `outputs`: qo'shish / tahrirlash / o'chirish / tekshiruv / qulf | Matritsa §13 |
| REQ-MVR-025 | `uc-calc/1` da `implicit`: eksport → import → qayta hisob | Matritsa §13 |
| REQ-MVR-026 | U_y — Annex B (B.1 a–j, p. 61); §6.3.1.5 (p. 18): (10) + (9) "not recommended" | Matritsa §13 |
| REQ-MVR-027 | U_x singular → LU yo'li + info `implicit_lu_fallback` (MV2) | Matritsa §13 |
| REQ-MVR-028 | Nyutondan keyin qoldiq tekshiruvi → `implicit_no_convergence` (`residual`) | Matritsa §13 |
| REQ-MVR-029 | cond₁(C_y) natijada va hisobotda | Matritsa §13 |
| REQ-MVR-030 | Shablonda `implicit`; standart y⁽⁰⁾, foydalanuvchi qiymati ustun, yo'q bo'lsa xato | Matritsa §13 |
| REQ-MVR-031 | Ko'p chiqish + ko'p nuqta: yagona k yo'q; U_j — o'z k_j bilan; birgalikda — faqat k_p (§6.5) | Matritsa §13 |
| REQ-MVR-032 | Mavjud natijalar o'zgarmagan (P07b) | Matritsa §13 |
| REQ-MVR-033 | Oshkormas model uchun MCM; eng kichik soha m > 2; nuqtalar orasidagi birgalikdagi soha | Matritsa §13 |

## REG — Regressiya va kalibrlash egri chiziqlari (P08)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-REG-001 | To'g'ri chiziq, OLS: y1, y2, s(y1), s(y2), r(y1, y2), s (JCGM 100:2008 H.3.2 Eq. H.13a–g; H.3.3) | Matritsa §7 |
| REQ-REG-002 | Bashorat qilingan tuzatmalar va qoldiqlar (Table H.6, 4- va 5-ustunlar, 22 qiymat) | Matritsa §7 |
| REQ-REG-003 | To'g'ri bashorat u_c[b(t)], ν = n − 2 (H.3.4 Eq. H.15): b(30 °C) = −0,1494, u_c = 0,0041 | Matritsa §7 |
| REQ-REG-004 | Korrelyatsiyani yo'qotish, t0 = t̄ (H.3.5 Eq. H.16–H.17): y1′ = −0,1625(11) | Matritsa §7 |
| REQ-REG-005 | Chiziqli kalibrlash B1, B0, S (QUAM:2012 A5, Table A5.2) | Matritsa §7 |
| REQ-REG-006 | Teskari bashorat u(c₀) (QUAM A5; E.4 Eq. E3.3, E3.5): u(c₀) = 0,018 mg/L | Matritsa §7 |
| REQ-REG-007 | WLS (QUAM Eq. E3.4) | Matritsa §7 |
| REQ-REG-008 | Polinom 2-, 3-daraja (ISO/TS 28038 — pullik) | Matritsa §7 |
| REQ-REG-009 | GLS, y_i kovariatsiyasi (ISO/TS 28037 §10 — pullik; Aitken 1935) | Matritsa §7 |
| REQ-REG-010 | WTLS, u(x_i) va u(y_i) (ISO/TS 28037 §7 — pullik; York et al. 2004) | Matritsa §7 |
| REQ-REG-011 | Model yaroqliligi: χ² testi, P = 0,95 | Matritsa §7 |
| REQ-REG-012 | Chekka holatlar: aniq xato kodi | Matritsa §7 |
| REQ-REG-013 | "U — diapazon" (ILAC P14:09/2020) | Matritsa §7 |
| REQ-REG-014 | Bir o'lchamli GUM natijalari o'zgarmagan | Matritsa §7 |
| REQ-REG-015 | REGRESSION shabloni | Matritsa §7 |

## TDN — Top-down va empirik kattaliklar (P09)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-TDN-001 | u(R_w) nazorat kartasi chegaralaridan: chegara / 2 (Nordtest TR 537 ed. 4 §3.2, p. 10; §5.1, p. 15) | Matritsa §8 |
| REQ-TDN-002 | u(bias) = √(RMS_bias² + u(C_ref)²), PT: u(C_ref,i) = s_R,i/√n_Lab,i (§6.2, p. 21; Appendix 4, p. 40) | Matritsa §8 |
| REQ-TDN-003 | u_c = √(u(R_w)² + u(bias)²), U = 2·u_c (§3.2, 5–6-qadam, p. 10) | Matritsa §8 |
| REQ-TDN-004 | Dublikatlar: s = √(Σd²/(2n)), mutlaq (Appendix 5 chap ustun, p. 41; Appendix 6, p. 42) | Matritsa §8 |
| REQ-TDN-005 | Dublikatlar, nisbiy: har bir juftlik o'z o'rtachasiga nisbatan (Appendix 5 o'ng ustun; Table 1, p. 13) | Matritsa §8 |
| REQ-TDN-006 | Dublikatlar, nisbiy: pooled s / umumiy o'rtacha (§5.3, pp. 17–18) | Matritsa §8 |
| REQ-TDN-007 | u(R_w) = √(s_Rw² + s_r²) (§5, p. 15; §5.3, pp. 17–18) | Matritsa §8 |
| REQ-TDN-008 | Nazorat namunasi qatori: s, CV (§5.2, p. 16) | Matritsa §8 |
| REQ-TDN-009 | Bitta CRM: √(bias² + (s_bias/√n)² + u(C_ref)²); bir nechta CRM: RMS (§6, p. 19; §6.1, p. 20) | Matritsa §8 |
| REQ-TDN-010 | Recovery: RMS_bias, u(C_recovery) = √(u(conc)² + u(vol)²) (§6.3, p. 23) | Matritsa §8 |
| REQ-TDN-011 | Robust s × 1,25; PT provayderi U bersa U/2 (§6.2, pp. 21–22) | Matritsa §8 |
| REQ-TDN-012 | QUAM recovery: u(Rec) = s/√n, t = \|1 − Rec\|/u(Rec), t_crit(n − 1; 95 %) (QUAM:2012 A4, p. 66) | Matritsa §8 |
| REQ-TDN-013 | Tuzatilgan bias: hissa u(Rec)/Rec, natija y/Rec; u_c/P = 0,34 (Table A4.4, A4.5, p. 68) | Matritsa §8 |
| REQ-TDN-014 | Tuzatilmagan bias: hissa u(R_m); ahamiyatli bo'lsa ogohlantirish (§7.7.9, p. 20; §7.16.2, p. 25) | Matritsa §8 |
| REQ-TDN-015 | s_R asosida: u_c = s_R (+ qamralmagan omillar) (QUAM §7.6.3, p. 18; A6 Table A6.4–A6.5, p. 86; Nordtest §7, pp. 24–25) | Matritsa §8 |
| REQ-TDN-016 | Rejim parametri hissasi = sezgirlik × u(parametr) (QUAM Table A6.3, Note 4, p. 85) | Matritsa §8 |
| REQ-TDN-017 | Empirik kattalik: usul bias'i 0 (QUAM §7.9.2, p. 21) | Matritsa §8 |
| REQ-TDN-018 | u(x) = √(s₀² + (x·s₁)²); s₀ = √c, s₁ = √m (QUAM E.5.2.1 Eq. [1], p. 117; E.5.5.2, p. 119) | Matritsa §8 |
| REQ-TDN-019 | ISO 21748: laboratoriya s_r tekshiruvi (χ²), s_R′, u(δ̂) | Matritsa §8 |
| REQ-TDN-020 | **X11** — ikki marta hisoblash | Matritsa §8 |
| REQ-TDN-021 | **X12** — empirik kattalikda bias; "tayanch qiymat qaysi usul bilan olingan" savoli majburiy (egasi qarori 2026-11-17; QUAM §7.9.2–7.9.3) | Matritsa §8 |
| REQ-TDN-022 | X11 chop etilgan hisobotda ham chiqadi, yashirib bo'lmaydi (egasi qarori) | Matritsa §8 |
| REQ-TDN-023 | ν_eff (JCGM 100:2008 G.4.1 Eq. G.2b) ko'rsatiladi; ν_eff < 30 → t_P(⌊ν_eff⌋) taklifi; k = 2 o'zgarmaydi; hisobotda "k = 2, P ≈ 95 %" (egasi qarori; Nordtest §3.2) | Matritsa §8 |
| REQ-TDN-024 | Nisbiy va mutlaq aralashmasi → xato | Matritsa §8 |
| REQ-TDN-025 | Hisobot: y, U, nisbiy U %, k, yondashuv nomi (ISO/IEC 17025:2017 §7.8.3.1 c)) | Matritsa §8 |
| REQ-TDN-026 | U = 0 ogohlantirishsiz chiqmaydi | Matritsa §8 |
| REQ-TDN-027 | GUM va regressiya natijalari o'zgarmagan | Matritsa §8 |
| REQ-TDN-028 | Mutatsiyaga sezgirlik (P09) | Matritsa §8 |
| REQ-TDN-029 | TOP_DOWN shablonlari | Matritsa §8 |

## SPM — Maxsus rejimlar (P10)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-SPM-001 | Klassik ichma-ich ANOVA: kvadratlar yig'indisi, s_between, s_samp, s_anal, % dispersiya (UfS:2019 Figure A1.2, p. 41) | Matritsa §9 |
| REQ-SPM-002 | Klassik ANOVA, U′ va ᶠU = exp(2·s_G) (UfS Figure A2.2, p. 48; Table A2.3, p. 49; Eq. 4, 5) | Matritsa §9 |
| REQ-SPM-003 | Robust ANOVA: o'rtacha, s_between, s_samp, s_anal, s_meas, % dispersiya, U′ (UfS Figure A1.2, A2.2) | Matritsa §9 |
| REQ-SPM-004 | s_meas² = s_samp² + s_anal²; U′ = 2·100·s_meas/x̄ (UfS Eq. 1–2, 4): A1 — 360,55 mg/kg; 16,4 % | Matritsa §9 |
| REQ-SPM-005 | Manfiy dispersiya bahosi → 0 va ogohlantirish | Matritsa §9 |
| REQ-SPM-006 | Muvozanatsiz dizayn, kam ob'ekt, log uchun musbat bo'lmagan qiymat → aniq xato / ogohlantirish | Matritsa §9 |
| REQ-SPM-007 | SS, SP, FP, FN ulushlari; LR(+), LR(−) (AQA:2021 §3.2, §4.2) | Matritsa §9 |
| REQ-SPM-008 | Wilson score 95 % CI (AQA §4.4 Eq. 8–11): [96,3; 100], [91,6; 99,0]; 400/400 → 99 %; 5/5 → 57 % | Matritsa §9 |
| REQ-SPM-009 | Posterior ehtimol PP (AQA §4.3 Eq. 6; Table E3.1): 0,963; 0,988; 0,963 | Matritsa §9 |
| REQ-SPM-010 | Clopper–Pearson (aniq binomial; loyiha qo'shimchasi — laboratoriya sozlamasi): 7/20, 97/100, 100/100, 0/50, 3/100, 45/60 (P = 0,95), 7/20 (P = 0,99) | Matritsa §9 |
| REQ-SPM-011 | Interval usuli tanlovi (egasi qarori 2026-11-18): standart Wilson; `ciMethod: 'clopper_pearson'`; bosma hisobotda faqat tanlangani, usul nomi va P | Matritsa §9 |
| REQ-SPM-012 | Mikrobiologiya: u_Poisson = 0,4343/√ΣC; u_tech dublikatlarning log₁₀ farqlaridan; interval [10^(y−U); 10^(y+U)] (ISO 19036 — pullik) | Matritsa §9 |
| REQ-SPM-013 | Tibbiy laboratoriya: u = √(u_cal² + u_Rw² [+ u_bias²]) IQC darajalari bo'yicha (ISO/TS 20914 — pullik) | Matritsa §9 |
| REQ-SPM-014 | BETA modullar: har doim `*_unverified` ogohlantirishi, hisobotda (bosmada ham) "BETA"; shablon APPROVED bo'la olmaydi | Matritsa §9 |
| REQ-SPM-015 | Hisobotda qo'llanilgan yondashuv va cheklovlar yozilgan (uch tilda) | Matritsa §9 |
| REQ-SPM-016 | "Maxsus rejimlar" oynasi: Excel'dan qo'yish, o'nlik vergul, bo'sh maydon ≠ 0, escape (XSS), CSP | Matritsa §9 |
| REQ-SPM-017 | Mavjud natijalar o'zgarmagan | Matritsa §9 |
| REQ-SPM-018 | Mutatsiyaga sezgirlik (P10) | Matritsa §9 |

## LNT — Metrologik linter, asoslangan qabul (P05a)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-LNT-001 | Kalibrlanayotgan asbob MPE si byudjetda bo'lmasligi (JCGM 100:2008 3.4.5, F.2.4.2; CLAUDE.md) | Matritsa §10 |
| REQ-LNT-002 | Noaniqlik nol bo'la olmaydi (JCGM 100:2008 3.3.1, F.2.2.1) | Matritsa §10 |
| REQ-LNT-003 | U ≥ CMC (ILAC P14:09/2020 §5.5) | Matritsa §10 |
| REQ-LNT-004 | Sertifikat U / k (4.3.3); ikki marta hisoblamaslik (4.3.10); korrelyatsiya (5.2.2–5.2.5); rezolyutsiya δ/(2√3) (F.2.2.1) | Matritsa §10 |
| REQ-LNT-005 | Birliklar (5.1.3; GUM-6 — repoda yo'q) | Matritsa §10 |
| REQ-LNT-006 | k = 2 ning ishonchliligi (EA-4/02 M:2022 §5.1–5.5; JCGM 100 G.6.6) | Matritsa §10 |
| REQ-LNT-007 | U ≤ 2 qiymatli raqam, y — U xonasigacha (JCGM 100 7.2.6) | Matritsa §10 |
| REQ-LNT-008 | Etalon drifti (EA-4/02 M:2022 App. C, S2.4) | Matritsa §10 |
| REQ-LNT-009 | X11, X12 (Nordtest TR 537 §3.2; QUAM:2012 §7.9) — R-20 qarorlari saqlangan | Matritsa §10 |
| REQ-LNT-010 | Ulush > 90 %; n < 3; ν ≤ 0; Grubbs (ISO 5725-2 — repoda yo'q) | Matritsa §10 |
| REQ-LNT-011 | Modul ogohlantirishlari `result.findings` da, kodlar o'zgarmagan | Matritsa §10 |
| REQ-LNT-012 | 9 ta etalon nuqtada `error` yo'q | Matritsa §10 |
| REQ-LNT-013 | Model turi; muvofiqlik \|y\| ni xato deb faraz qilmaydi (RISKS R-07; ISO/IEC 17025 §7.8.6, JCGM 106 — repoda yo'q) | Matritsa §10 |
| REQ-LNT-014 | Asoslangan qabul: izoh ≥ 10 belgi; audit zanjiri (rol, vaqt, topilma id, izoh) — ISO/IEC 17025 §7.5, §7.11.3 | Matritsa §10 |
| REQ-LNT-015 | Barcha topilmalar bosma hisobotda; "RASMIY EMAS"; U = 0 / U < CMC belgisi yoki bloklash; ν qoidasi, MC seed va M, BETA (RISKS R-05) | Matritsa §10 |
| REQ-LNT-016 | Matnlar uch tilda; i18n'dan tashqari matn yo'q (RISKS R-13) | Matritsa §10 |
| REQ-LNT-017 | Mavjud natijalar o'zgarmagan | Matritsa §10 |

## RIO — Import / eksport, hisobot shakllari, qaror qoidasi (P05b)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-RIO-001 | Muvofiqlik ehtimoli p_c, normal taqsimot (JCGM 106:2012 §7.3.3 Example 1 — p. 15: p_c = 0,92; Example 2: 0,99; §7.4 — p. 16; Table 1) | Matritsa §11 |
| REQ-RIO-002 | Himoya zonasi w = r·U, qabul oralig'i (JCGM 106:2012 §8.3.2; §8.3.2.3 — p. 22) | Matritsa §11 |
| REQ-RIO-003 | r = 0; 0,83; 1; 1,5; 3 uchun eng katta noto'g'ri qabul ehtimoli (ILAC G8:09/2019 Table 1 — p. 12) | Matritsa §11 |
| REQ-RIO-004 | Binar / nobinar bayonot (ILAC G8:09/2019 §4.2.1–4.2.3) | Matritsa §11 |
| REQ-RIO-005 | TUR = T / (2U) (JCGM 106 §7.6.2 C_m; ILAC G8 §1.13) | Matritsa §11 |
| REQ-RIO-006 | Bir va ikki tomonlama chegaralar (JCGM 106 §7.3, §8.3.3) | Matritsa §11 |
| REQ-RIO-007 | Qoida yoki chegara yo'q → bayonot yo'q (ISO/IEC 17025 §7.1.3 — ILAC G8 §2.3 orqali) | Matritsa §11 |
| REQ-RIO-008 | Ko'p nuqtali hisobot = Excel "Xulosa" jadvali (gazoanalizator 3 nuqta, termometr 5 nuqta; katak havolalari testda) | Matritsa §11 |
| REQ-RIO-009 | 4 ta shakl; rekvizitlar yetishmasa ogohlantirish (ISO/IEC 17025:2017 §7.8.2.1, §7.8.3.1, §7.8.4.1 — repoda yo'q) | Matritsa §11 |
| REQ-RIO-010 | Normativ havolalar hisobot tilida; ekvivalent faqat tasdiqlangani (JCGM 106 = ISO/IEC Guide 98-4:2012 — ILAC G8 §9 [2]) | Matritsa §11 |
| REQ-RIO-011 | Kanonik JSON (RFC 8785 JCS) SHA-256; kalitlar tartibiga bog'liq emas | Matritsa §11 |
| REQ-RIO-012 | JSON eksport → import → qayta hisob bit darajasida bir xil | Matritsa §11 |
| REQ-RIO-013 | Hisobot pasti: versiya, build, shablon, hisob ID / sana, xesh, QR; bosma xesh = eksport xeshi | Matritsa §11 |
| REQ-RIO-014 | `.xlsx` / `.csv` import: hajm, qator, ustun, varaq, ZIP chegaralari; formula bajarilmaydi; HTML / skript escape | Matritsa §11 |
| REQ-RIO-015 | `.xlsx` / `.csv` eksport: sonlar yaxlitlanmagan; formula-inyeksiya zararsizlantirilgan | Matritsa §11 |
| REQ-RIO-016 | Vendor: aniq versiya, LICENSE, SHA-256; npm `xlsx` yo'q; faqat dinamik import; CSP o'zgarmagan; `src/io/` da tarmoq chaqiruvi yo'q | Matritsa §11 |
| REQ-RIO-017 | Shaxsiy rekvizitlar Firebase'ga yozilmaydi (faqat `sessionStorage`) | Matritsa §11 |
| REQ-RIO-018 | Mavjud natijalar o'zgarmagan | Matritsa §11 |

## TPL — Metodika shablonlari (P04)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-TPL-001 | Shablon sxemasi (uc-template/1), o'z validator | Matritsa §6 |
| REQ-TPL-002 | Shablon → modelSpec → evaluate (dvigatel o'zgarmagan) | Matritsa §6 |
| REQ-TPL-003 | 11 ta eski preset JSON'da, P03 bilan bit darajasida bir xil | Matritsa §6 |
| REQ-TPL-004 | Zichlik, gazoanalizator (3), termometr (5) shablonlari Excel bilan | Matritsa §6 |
| REQ-TPL-005 | Bitta asbob korrelyatsiyasi u(xi,xj) = r·u_X(xi)·u_X(xj) (§5.2.2, F.1.2.3) | Matritsa §6 |
| REQ-TPL-006 | P04b: bitta asbob — covB faqat umumiy qismdan, nuqtaga xos qism r = 0 (EA-4/02 M:2022 D4–D5, D.6/D.8) | Matritsa §6 |
| REQ-TPL-007 | P04b: `split: "unknown"` — r = 0 va r = 1, katta u_c (loyiha qarori; EA-4/02 D7 g'oyasi) | Matritsa §6 |
| REQ-TPL-008 | P04b: ikki marta hisoblash tekshiruvi u²(umumiy) + u²(nuqta) ≤ u²(sertifikat) | Matritsa §6 |
| REQ-TPL-009 | P04b: P04 dagi bitta qatorli nusxalar migratsiyasi → `split: "unknown"` | Matritsa §6 |
| REQ-TPL-010 | Holat oqimi, qulflash, yangi versiya | Matritsa §6 |
| REQ-TPL-011 | Saqlash: IndexedDB, uc_state_v2 migratsiyasi (natija bir xil), eksport→import bit darajasida, audit xesh zanjiri | Matritsa §6 |
| REQ-TPL-012 | Kodsiz yangi shablon | Matritsa §6 |

## TPW — 1-to'lqin sinov shablonlari (24 ta, DRAFT)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-TPW-001 | T-01 Metall cho'zilishi: vaqtinchalik qarshilik va oquvchanlik chegarasi — ГОСТ 1497, ГОСТ 12004, ГОСТ 34028 | Matritsa §6.1 |
| REQ-TPW-002 | T-02 Metall nisbiy uzayishi — ГОСТ 1497, ГОСТ 12004 | Matritsa §6.1 |
| REQ-TPW-003 | T-03 Beton siqilishdagi mustahkamligi — ГОСТ 10180 | Matritsa §6.1 |
| REQ-TPW-004 | T-04 Beton qorishmasi: konus cho'kishi va zichligi — ГОСТ 10181 | Matritsa §6.1 |
| REQ-TPW-005 | T-05 Qurilish qorishmasi: o'rtacha zichlik va harakatchanlik — ГОСТ 5802 | Matritsa §6.1 |
| REQ-TPW-006 | T-06 Chaqiq tosh / qum: donador tarkib (elakdagi xususiy qoldiq) — ГОСТ 8269.0, ГОСТ 8735 | Matritsa §6.1 |
| REQ-TPW-007 | T-07 Qumning yiriklik moduli — ГОСТ 8735 | Matritsa §6.1 |
| REQ-TPW-008 | T-08 Chaqiq tosh maydalanuvchanligi; chang va loy zarralari miqdori — ГОСТ 8269.0 | Matritsa §6.1 |
| REQ-TPW-009 | T-09 Sochma zichlik (chaqiq tosh, qum) — ГОСТ 8269.0, ГОСТ 8735 | Matritsa §6.1 |
| REQ-TPW-010 | T-10 Beton va g'isht o'rtacha zichligi — ГОСТ 12730.1, ГОСТ 7025 | Matritsa §6.1 |
| REQ-TPW-011 | T-11 Suv shimuvchanlik (beton, g'isht, plitka) — ГОСТ 12730.3, ГОСТ 7025, ГОСТ 27180 | Matritsa §6.1 |
| REQ-TPW-012 | T-12 Namlik (beton, grunt) — ГОСТ 12730.2, ГОСТ 5180 | Matritsa §6.1 |
| REQ-TPW-013 | T-13 G'isht siqilish va egilishdagi mustahkamligi — ГОСТ 8462 | Matritsa §6.1 |
| REQ-TPW-014 | T-14 Geometrik o'lchamlar va chetlanishlar — ГОСТ 26433.1 | Matritsa §6.1 |
| REQ-TPW-015 | T-15 Plastmassa cho'zilishi — ГОСТ 11262 | Matritsa §6.1 |
| REQ-TPW-016 | T-16 Rokvell qattiqligi — ГОСТ 9013 | Matritsa §6.1 |
| REQ-TPW-017 | T-17 Titrlash (umumiy shablon): kislotalik, ishqoriylik, xloridlar, SAV — ГОСТ 3624, ГОСТ 5898, ГОСТ 5670, ГОСТ 26878, ГОСТ 4245, ГОСТ 22567.6 | Matritsa §6.1 |
| REQ-TPW-018 | T-18 Quritish usulida namlik va uchuvchan moddalar — ГОСТ 29188.4, ГОСТ 13586.5, ГОСТ 5900 | Matritsa §6.1 |
| REQ-TPW-019 | T-19 Kul miqdori — — | Matritsa §6.1 |
| REQ-TPW-020 | T-20 pH (suvli eritma yoki ekstrakt) — ГОСТ 22567.5, ГОСТ 29188.2 | Matritsa §6.1 |
| REQ-TPW-021 | T-21 Gravimetrik massa ulushi (erimaydigan aralashmalar, sovun komponentlari) — ГОСТ 790, ГОСТ 22567.7 | Matritsa §6.1 |
| REQ-TPW-022 | T-22 Izolyatsiya qarshiligi va oqish toki — IEC 60335, IEC 60204, IEC 60950, IEC 60598, IEC 60065, ГОСТ 3940, ГОСТ 2933 | Matritsa §6.1 |
| REQ-TPW-023 | T-23 Elektr mustahkamlik: sinov kuchlanishi — IEC 60335, IEC 60204, IEC 60950, IEC 60598, IEC 60065, ГОСТ 3940, ГОСТ 2933 | Matritsa §6.1 |
| REQ-TPW-024 | T-24 Qizish (harorat oshishi), qarshilik usuli — IEC 60335-1 | Matritsa §6.1 |

## LAB — Laboratoriya jarayonlari: reestr, CMC, QC (P11)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-LAB-001 | CMC ni ifodalash: bitta qiymat, diapazon (chiziqli interpolyatsiya), oshkor funksiya (ILAC P14 §4.2 a–c, p. 6); nisbiy (§4.3) | Matritsa §14 |
| REQ-LAB-002 | Diapazon chegarasi (kiradi), tashqarisi, tutashgan diapazonlar; ochiq interval rad etiladi (§4.2) | Matritsa §14 |
| REQ-LAB-003 | U < CMC(X) → `below_cmc` (ILAC P14 §5.5, p. 8); U almashtirilmaydi | Matritsa §14 |
| REQ-LAB-004 | X sohadan tashqarida → `outside_scope`; X yo'q → `cmc_x_missing` (§4.1 c) | Matritsa §14 |
| REQ-LAB-005 | Kuzatuvchanlik yo'llari 1) – 3b) (ILAC P10 §2, p. 6–7); akkreditatsiya belgisi yo'q → warning | Matritsa §14 |
| REQ-LAB-006 | Muddati o'tgan etalon → error, hisobot "RASMIY EMAS"; muddati yaqin (30 kun) → info | Matritsa §14 |
| REQ-LAB-007 | Reestrdan B tur manbasi: U, k, ν, tuzatma, sertifikat; ID + versiya; reestr o'zgarsa eski hisob o'zgarmaydi | Matritsa §14 |
| REQ-LAB-008 | Nuqtalar orasida interpolyatsiya; ekstrapolyatsiya yo'q | Matritsa §14 |
| REQ-LAB-009 | MPE / tolerans manba sifatida taklif qilinmaydi | Matritsa §14 |
| REQ-LAB-010 | Drift:\|ΔC\|, u =\|ΔC\|/√3; trend; < 2 kalibrlash — yo'q; faqat tasdiqlangach qo'shiladi (EA-4/02 S2.4; JCGM 100 4.3.7) | Matritsa §14 |
| REQ-LAB-011 | Kalibrlash intervali (ILAC G24 / OIML D 10:2022 §6.3): trend → chegara; < 3 kalibrlash — yo'q; faqat tavsiya | Matritsa §14 |
| REQ-LAB-012 | Shewhart konstantalari d₂, d₃, A₂, D₃, D₄ (n = 2…10) | Matritsa §14 |
| REQ-LAB-013 | I–MR va X̄–R chegaralari, ±2s / ±3s | Matritsa §14 |
| REQ-LAB-014 | Westgard 1₃s, 2₂s, R₄s, 4₁s, 10ₓ — har biri ijobiy va salbiy jadval | Matritsa §14 |
| REQ-LAB-015 | s_Rw kartadan → top-down (ν = n − 1) | Matritsa §14 |
| REQ-LAB-016 | Mehmon (`guest`) kiritgan reestr yozuvi / CMC jadvali → info `registry_unauthenticated` / `cmc_unauthenticated`; audit izida rol `guest` (egasi qarori 2026-11-18) | Matritsa §14 |
| REQ-LAB-017 | R₄s seriya belgisisiz — "loyiha yaqinlashuvi" belgisi | Matritsa §14 |
| REQ-LAB-018 | Reestr: yaratish / tahrirlash / o'chirish audit izida (rol, vaqt, oldingi va yangi qiymat); rol cheklovi | Matritsa §14 |
| REQ-LAB-019 | Migratsiya 2 → 3: qo'lda kiritilgan B tur manbalari o'zgarmaydi; idempotent; audit | Matritsa §14 |
| REQ-LAB-020 | Import `.xlsx` / `.csv` (LIMITS), `uc-registry/1` eksport → import; formula bajarilmaydi | Matritsa §14 |
| REQ-LAB-021 | Hisobot: reestr manbasi, CMC tekshiruvi (asoslangan qaror bilan), drift asosi — uch tilda | Matritsa §14 |
| REQ-LAB-022 | UI: uch yorliq, reestrdan tanlash, QC SVG, rol, escape, CSP | Matritsa §14 |
| REQ-LAB-023 | Mavjud natijalar o'zgarmagan | Matritsa §14 |

## PTV — Malaka sinovlari va usul validatsiyasi (P12)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-PTV-001 | Grubbs: G = 2,4687; G_krit = 2,032 (α = 0,05, yuqori bir tomonlama); maksimum chetga chiquvchi (NIST §1.3.5.17.1, eda35h1.htm) | Matritsa §15 |
| REQ-PTV-002 | Grubbs: nuqta o'chirilmaydi; chiqarish izoh ≥ 10 belgi bilan, audit; takror — foydalanuvchi harakati | Matritsa §15 |
| REQ-PTV-003 | Bir omilli ANOVA: SS 27,897 / 17,452 / 45,349; MS 13,949 / 1,454; F = 9,59; F₀,₀₅;₂,₁₂ = 3,89; p = 0,00325 (NIST §7.4.3.3–7.4.3.4) | Matritsa §15 |
| REQ-PTV-004 | Tasodifiy effektlar s_r, s_b, s_I; manfiy komponent → 0 (NIST §2.4.4.2: −0,00028072 → 0) | Matritsa §15 |
| REQ-PTV-005 | Pooled s₁ = 0,07871 (ν = 60), s₂ = 0,02742 (ν = 10) (NIST §2.4.4.1–2.4.4.2) | Matritsa §15 |
| REQ-PTV-006 | Teng bo'lmagan guruhlarda n₀ | Matritsa §15 |
| REQ-PTV-007 | t-test (teng dispersiya): T = −12,62059; s_p = 6,34260; ν = 326; t = 1,9673 / 1,6495 (NIST §1.3.5.3) | Matritsa §15 |
| REQ-PTV-008 | Welch t-test — ν formulasi (NIST §1.3.5.3) | Matritsa §15 |
| REQ-PTV-009 | F-test: F = 1,123037; kritik 0,7756 / 1,2894 (NIST §1.3.5.9) | Matritsa §15 |
| REQ-PTV-010 | Cochran C va kritik qiymat | Matritsa §15 |
| REQ-PTV-011 | Recovery t-testi — P09 funksiyasi chaqiriladi | Matritsa §15 |
| REQ-PTV-012 | Chiziqlilik — P08 regressiyasi chaqiriladi | Matritsa §15 |
| REQ-PTV-013 | LOD = 3·s′₀, LOQ = k_Q·s′₀; kalibrlash 3,3 / 10 | Matritsa §15 |
| REQ-PTV-014 | PT ballari z, z′, ζ, E_n; null + sabab; xatolar (σ_pt ≤ 0, U ≤ 0, birlik) | Matritsa §15 |
| REQ-PTV-015 | PT chegaralari 2 / 3, E_n 1; chegaradagi qiymat qoniqarli; 10⁻¹² tolerans; hisobotda ball 2 xona, baho yaxlitlanmagan qiymatdan | Matritsa §15, R-26 #1 |
| REQ-PTV-016 | u(x_pt) > 0,3·σ_pt → info, avtomatik almashtirish yo'q | Matritsa §15 |
| REQ-PTV-017 | PT tarixi → top-down u(bias) (Nordtest TR 537 §6.2) — mavjud dvigatel | Matritsa §15 |
| REQ-PTV-018 | Top-down qoralama: DRAFT, RFC 8785 xesh, sana; builtin da raqam yo'q | Matritsa §15 |
| REQ-PTV-019 | Saqlash: `pt`, `validation` omborlari, audit, rol, IndexedDB 1 → 2 (eski ma'lumot saqlanadi) | Matritsa §15 |
| REQ-PTV-020 | Import `.csv` / `.xlsx` (LIMITS, formula bajarilmaydi), CSV / JSON eksport | Matritsa §15 |
| REQ-PTV-021 | UI va hisobot uch tilda; SVG skriptsiz; escape; CSP o'zgarmagan | Matritsa §15 |
| REQ-PTV-022 | Mavjud natijalar o'zgarmagan | Matritsa §15 |
| REQ-PTV-023 | ν(s_I) — Welch–Satterthwaite (JCGM 100 G.4.1): NIST §7.4.3 misolida ν = 3,903; s_b² < 0 → N − k | R-26 #7 |
| REQ-PTV-024 | Linter L3: oxirgi PT raundi qoniqarsiz → info (GUM, TOP_DOWN); ijobiy va salbiy holatlar | R-26 #6 |

## UIX — Interfeys 2.0 (P16)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-UIX-001 | Dizayn tokenlari yagona joyda (`src/css/tokens.css`); ikkala mavzuda matn va urg'u ranglari kontrasti ≥ 4,5:1; qorong'i fon `#1e2235` (sof qora yo'q) | P16 topshirig'i §1, §9 |
| REQ-UIX-002 | Shriftlar `vendor/fonts/` da (SIL OFL, SHA-256); Google Fonts ishlatilmaydi; CSP `font-src 'self'`, `style-src` da tashqi manba yo'q | P16 topshirig'i §1, §9 |
| REQ-UIX-003 | Ilova qobig'i: chap menyu guruhlari, stepper, pastki navigatsiya, buyruq qidiruvi; o'tishlar mavjud yorliqlar orqali; haqiqiy `<button>` / `<a>`, aria-label | P16 topshirig'i §2, §9 |
| REQ-UIX-004 | Noaniqlik tasmasi: skriptsiz SVG, haqiqiy natijadan (y, u_c, U; MCM intervallari); yorliqlar `rounding.js` qoidalari bilan; U = 0 da chizilmaydi | P16 topshirig'i §3 |
| REQ-UIX-005 | B tur manbasi varag'i: jonli u dvigatel funksiyalari orqali; klaviatura (Esc, fokus qaytishi); vergulli kasr | P16 topshirig'i §4 |
| REQ-UIX-006 | Laboratoriya ko'rinishi: QC zonalari, ogohlantirish / rad etish nuqtalari, Westgard holati (darvoza, `suppressed`) — dvigatel natijasidan; etalon kartochkalari holati | P16 topshirig'i §5 |
| REQ-UIX-007 | Hisobot: A4 ko'rinishi va bosma bitta quruvchidan; pastki qism (ENGINE, build, xesh, QR) har sahifada; jadval sarlavhasi takrorlanadi; shrift: matn ≥ 11 pt, jadvallar ≥ 10 pt, pastki qism ≥ 9 pt (egasi qarori 2026-11-20) | P16 topshirig'i §6 |
| REQ-UIX-008 | Vizual laboratoriya: har bir rejim dvigatel funksiyalari orqali (UI da qoida takrorlanmaydi); "o'quv namunasi" belgisi; hech narsa saqlanmaydi va hisobotga chiqmaydi | P16 topshirig'i §7 |
| REQ-UIX-009 | Harakat: faqat CSS (transform / opacity); `prefers-reduced-motion: reduce` da o'chadi; JS sikli faqat Vizual laboratoriya va MC progressida | P16 topshirig'i §8 |
| REQ-UIX-010 | Inline uslublar: P16 qismlarida yo'q; qolganlari soni oshmaydi; `validation.html` da `style-src 'self'` | P16 topshirig'i §9 |
| REQ-UIX-011 | Brauzerda: 390 / 834 / 1440 px, ikkala mavzu — konsol xatosi yo'q, bosiladigan maydon ≥ 44 px, kontrast ≥ 4,5:1, gorizontal surilish yo'q, klaviatura (Ctrl+K, Esc, ko'rinadigan fokus) | P16 topshirig'i §10 |
| REQ-UIX-012 | Hisob o'zgarmagan: `src/engine/` ga tegilmagan; misollar natijasi bit darajasida bir xil | P16 topshirig'i (maqsad) |
| REQ-UIX-013 | Shablon kartasidagi "Manba bilan mos" belgisi avtomatik: shablon hisobi etalon misol (tests/fixtures) bilan solishtiriladi → `templates/validation/builtin.json` (`source`, `clause`, `status`, `relDiff`); qo'lda bayroq yo'q; fayl eskirsa test xatosi; foydalanuvchi natijasida belgi yo'q Fayl `_generated` belgili, yozuvlar: templateId, templateHash, ENGINE_VERSION, testId, source, clause, relDiff, date; runtime'da xesh / versiya mos kelmasa yoki shablon builtin bo'lmasa — unverified; CI qayta yaratib solishtiradi; A4 hisobotida bitta qator (holat + manba + ENGINE_VERSION). | Egasi qarori 2026-11-20 (R-29 #8); ISO/IEC 17025 §7.11.2 (unverified) |
| REQ-UIX-014 | `#lab` havolasi Vizual laboratoriyani ochadi; Ctrl+P GUM yorliqlarida A4 hisobotni chop etadi; yunon harflari Inter dan (vendor); νᵢ belgisi faqat |ulush| ≥ 5 % va chekli ν da | Egasi qarori 2026-11-20 (R-29) |
| REQ-UIX-015 | Kirish / ro'yxatdan o'tish ekrani yangi tokenlarda: til va mavzu tugmalari, chap tomonda tavsif + me'yoriy asos + "o'lchash ma'lumotlari faqat brauzerda" bayonoti; maydonlar ro'yxati qotirilgan (yangi shaxsiy maydon yo'q); xato inline (`role="alert"`, textContent); parolni ko'rsatish / yashirish; Enter bilan yuborish; `<html lang>` joriy tilda; formulalar va raqamlarda `translate="no"` | Egasi topshirig'i 2026-11-20; CLAUDE.md (shaxsiy ma'lumotlar) |
| REQ-UIX-016 | "Bosh sahifa": "Yangi hisob" va "Shablondan boshlash" kartalari; so'nggi sessiyalar (IndexedDB `calculations`: ochish / nusxalash / o'chirish — audit izi bilan; natija faqat aynan shu `ENGINE_VERSION` da hisoblangan bo'lsa tiklanadi); tezkor havolalar; pastda `ENGINE_VERSION` va validatsiya xulosasi (builtin.json bo'yicha); chap menyuda "Bosh sahifa", "Shablonlar katalogi", "Laboratoriya sozlamalari", "Ma'lumotlar"; bir xil toast takrorlanmaydi | Egasi topshirig'i 2026-11-20 |

## SRC — Manba misollari qamrovi

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-SRC-001 | EA-4/02 M:2022 S2, S3 | Matritsa §4 |
| REQ-SRC-002 | EA-4/02 M:2022 S4–S13 | Matritsa §4 |
| REQ-SRC-003 | EURACHEM/CITAC QUAM:2012 A1 | Matritsa §4 |
| REQ-SRC-004 | EURACHEM/CITAC QUAM:2012 A5 (kalibrlash qismi), E.4 | Matritsa §4 |
| REQ-SRC-005 | EURACHEM/CITAC QUAM:2012 A4 (aniqlik, recovery t-test, tuzatish, u_c) | Matritsa §4 |
| REQ-SRC-006 | EURACHEM/CITAC QUAM:2012 A6 (empirik usul, s_R + quritish) | Matritsa §4 |
| REQ-SRC-007 | QUAM A2, A3; A5 ning qolgan qismi | Matritsa §4 |
| REQ-SRC-008 | Nordtest TR 537 ed.4 (NH₄-N: §3.2, Appendix 4) | Matritsa §4 |
| REQ-SRC-009 | Nordtest TR 537 ed.4 (dublikatlar — Appendix 5, 6; BOD — §8.2; recovery — §6.3) | Matritsa §4 |
| REQ-SRC-010 | ISO 21748 (pullik) — laboratoriya s_r tekshiruvi, u(δ̂) | Matritsa §4 |
| REQ-SRC-011 | EURACHEM/CITAC UfS:2019 A1, A2 (dublikat usuli, ANOVA, ᶠU) | Matritsa §4 |
| REQ-SRC-012 | EURACHEM/CITAC AQA:2021 E3, 7.6 (posterior ehtimol, Wilson CI) | Matritsa §4 |
| REQ-SRC-013 | ISO 19036 (mikrobiologiya), ISO/TS 20914 (tibbiy laboratoriya) — pullik | Matritsa §4 |
| REQ-SRC-014 | NIST Uncertainty Machine qo'llanmasi | Matritsa §4 |
| REQ-SRC-015 | ISO/TS 28037/28038 (pullik) | Matritsa §4 |
| REQ-SRC-016 | JCGM GUM-6:2020, COOMET R/GM/32:2017 | Matritsa §4 |

## INF — Test infratuzilmasi

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-INF-001 | Kutilgan qiymat — faqat manbadan, katak havolasi bilan | Matritsa §5 |
| REQ-INF-002 | Mutatsiyaga sezgirlik | Matritsa §5 |
| REQ-INF-003 | i18n: har bir kalit uch tilda | Matritsa §5 |
| REQ-INF-004 | 11 ta shablon tuzilmasi va hisobi; shablon ↔ etalon ma'lumot mosligi (R-11) | Matritsa §5 |
| REQ-INF-005 | CI | Matritsa §5 |

## VAL — Validatsiya paketi, versiyalangan deploy, takrorlanuvchanlik (P13)

| ID | Talab | Kelib chiqishi |
|---|---|---|
| REQ-VAL-001 | Hisobga ta'sir qilmasligi kerak bo'lgan o'zgarishda `tests/cases/` dagi barcha misollar natijasi bit darajasida o'zgarmaydi (regressiya nazorati skripti) | docs/validation/CHANGE_CONTROL.md |
| REQ-VAL-002 | Har bir talab kamida bitta testga bog'langan yoki aniq `unverified` / `pending` / `manual` belgisi bilan; bog'lanmagan talab — `npm test` xatosi | P13 topshirig'i §1 |
| REQ-VAL-003 | Validatsiya hisoboti test natijalaridan avtomatik yaratiladi: skriptsiz, o'zi yetarli HTML va JSON; matnlar escape qilingan; sana va commit dan boshqa hamma narsa deterministik | P13 topshirig'i §2 |
| REQ-VAL-004 | Versiyalangan deploy: har bir mahalliy modul / skript / uslub havolasiga `?v=<commit SHA, 12 belgi>`; `build.json`; oq ro'yxat; vendor fayllari o'zgarmaydi; ishonchsiz holatda build to'xtaydi | Egasi qarori A (2026-11-19), R-22 (b) |
| REQ-VAL-005 | Brauzer `build.json` ni `no-store` bilan o'qiydi; sahifadagi modul versiyasi farq qilsa — "yangi versiya" banneri; avtomatik qayta yuklash yo'q; build.json bo'lmasa — jim | Egasi qarori A (2026-11-19) |
| REQ-VAL-006 | Hisob hujjati (`uc-calc/1`) va hisobot pastiga build va hisoblagan muhit (brauzer qisqa nomi va versiyasi) yoziladi; to'liq userAgent saqlanmaydi; eski hujjatlar importi buzilmaydi | Egasi qarori B (2026-11-19), R-24 |
| REQ-VAL-007 | Brauzerlararo takrorlanuvchanlik (Chromium, Firefox, WebKit): hisobot qatlamida yaxlitlangan y, U, k, interval uchlari AYNAN bir xil; R(0, 1) ketma-ketligi bit darajasida bir xil; xom qiymatlarning nisbiy farqi ≤ 1·10⁻¹⁴ (o'lchangan qiymat hisobotda) | Egasi qarori B (2026-11-19), R-24 |
| REQ-VAL-008 | NIST Uncertainty Machine bilan mustaqil o'zaro tekshiruv (5 ta vakil misol) | P13 topshirig'i §5 |
| REQ-VAL-009 | Foydalanuvchi qo'llanmasi (uz / ru / en) va validatsiya hujjatlari saytga skriptsiz statik HTML sifatida chiqadi (markdown → HTML, xom HTML o'tkazilmaydi) | P13 topshirig'i §6 |

## AIA — AI yordamchi (P14) va R-27 dan kod qismi

> AI — ixtiyoriy, standart holatda o'chiq. Loyiha hujjati — `docs/AI_DESIGN.md`. ISO/IEC 42001 — **(unverified — hujjat repoda yo'q)**. Haqiqiy API bilan avtomatik test yo'q (CI da kalit yo'q) — faqat mock.

| ID | Talab | Manba |
|---|---|---|
| REQ-AIA-001 | AI hech narsa hisoblamaydi va natijani o'zgartirmaydi: `src/engine/` va `src/report/` AI qatlamini bilmaydi; javob sxemalarida natija maydoni yo'q; dvigatel xeshi va `ENGINE_VERSION` o'zgarmagan | P14 topshirig'i, 1-tamoyil |
| REQ-AIA-002 | AI o'chirilgan (standart: `aiEnabled: false`) holatda platforma to'liq ishlaydi; AI kodi faqat dinamik `import()` bilan, yoqilgandagina yuklanadi; yoqish — admin / superadmin / lokal guest, audit bilan | P14 topshirig'i, 3-tamoyil; egasi qarori S-6 (2026-11-20) |
| REQ-AIA-003 | Tashqariga faqat tuzilma ketadi (ruxsat ro'yxati): payload da son tipidagi qiymat, o'lchov qiymati, natija, mijoz, shaxs ismi, rekvizit, hisob ID / xesh, login bo'lmaydi; noma'lum kalit va shaxsiy ma'lumotga o'xshash matn rad etiladi; manba nomi yuborilmaydi | Egasi qarori B (2026-11-19), S-1 (2026-11-20) |
| REQ-AIA-004 | Foydalanuvchi hujjati (metodika / sertifikat) faqat a va b funksiyalarda va alohida tasdiq belgisi bilan yuboriladi; yuborish / nusxalashdan oldin TO'LIQ matn ko'rsatiladi | Egasi qarori B (2026-11-19) |
| REQ-AIA-005 | AI javobi — ishonchsiz ma'lumot: qat'iy JSON, sxema (`additionalProperties: false`), hajm chegaralari; HTML / skript rad etiladi yoki escape qilinadi; `eval` / `Function` yo'q | P14 topshirig'i, 4-tamoyil |
| REQ-AIA-006 | Har bir son manba parchasi bilan keladi; parcha kirish matnida aynan topilmasa yoki son parchada bo'lmasa — qiymat qabul qilinmaydi; tasdiqlanmagan son shablonga / reestrga kirmaydi; har bir qiymat alohida tasdiqlanadi (nuqtalarda — qator) | P14 topshirig'i §2 a, b; egasi qarori S-5 (2026-11-20) |
| REQ-AIA-007 | AI qoralamasi shabloni `AI_DRAFT` holatida: faqat `DRAFT` ga, izoh (≥ 10 belgi) bilan; builtin shablonda taqiqlangan; u bilan hisobot — "RASMIY EMAS" | P14 topshirig'i §2 a; egasi qarori S-8 (2026-11-20) |
| REQ-AIA-008 | Sertifikatdan reestr yozuvi: shaxs ismi uchun maydon yo'q, `cleanStandard` dan o'tadi; yozuvda `origin: 'ai'` (saqlash qatlamida, audit izida); k faraz qilinmaydi | P14 topshirig'i §2 b; egasi qarori S-4 (2026-11-20) |
| REQ-AIA-009 | Manba taklifi faqat nom va tur — qiymatsiz; kalibrlanayotgan asbobning MPE si manba sifatida taklif qilinmaydi (filtr); birlik mos kelmasa manba rad etiladi | P14 topshirig'i §2 d; `CLAUDE.md` (MPE qoidasi) |
| REQ-AIA-010 | AI izohi ekranda "AI izohi — rasmiy emas" belgisi bilan; bosma hisobotga faqat foydalanuvchi tanlasa, alohida ichki ilova sifatida | P14 topshirig'i §2 c |
| REQ-AIA-011 | API kaliti faqat `sessionStorage` da (ai.html); doimiy xotira, IndexedDB, eksport, audit va xato xabarlarida yo'q; "Kalitni o'chirish" tugmasi | Egasi qarori A (2026-11-19) |
| REQ-AIA-012 | Tashqi AI xizmatiga ulanish faqat `ai.html` da (o'z CSP si: `connect-src 'self' https://api.anthropic.com`); asosiy sahifalar CSP si o'zgarmagan; nusxa-qo'y rejimida tashqi so'rov yo'q | Egasi qarorlari A (2026-11-19), S-7 (2026-11-20) |
| REQ-AIA-013 | Har bir AI amali audit zanjirida: amal, rejim, model (api), prompt id + versiya, yuborilgan matn va javobning SHA-256 xeshi, rol; matnning o'zi, kalit va qiymat yozilmaydi | P14 topshirig'i §3 |
| REQ-AIA-014 | Prompt shablonlari versiyalangan (`id`, semver); javob sxemalari `schemas/ai/` da; barcha AI matnlari uch tilda | P14 topshirig'i §2; `CLAUDE.md` (i18n) |
| REQ-AIA-015 | Shablon muharriridagi "Kim" maydoni — rol ro'yxati (erkin matn yo'q); auditga faqat rol identifikatori yoziladi | Egasi qarori R-27 (6) (b), 2026-11-20 |

## AUD — Audit (21.11.2026) bo'yicha P0 tuzatishlar (P20)

> Manba: "UncertaintyCalc — to'liq audit va yakuniy ishlar ro'yxati (21.11.2026)" (egasining hujjati; repoda yo'q) va egasi qarorlari (2026-11-21). MCM qaror qoidasi chegaralari — **loyiha qarori**, me'yoriy talab emas (KL-185).

| ID | Talab | Manba |
|---|---|---|
| REQ-AUD-001 | LPU → MCM avtomatik qaror qoidasi: natijada `mcm = { required, reasons[] }`; shartlar (a) nochiziqlilik indeksi > `nonlinThreshold` yoki c_i = 0, (b) bitta normal bo'lmagan manba uchun \|c_i\|u(x_i)/u_c > 0,50 (nisbat, dispersiya ulushi emas), (c) asimmetrik kirish taqsimoti yoki fizik chegara \|y − chegara\| < U, (d) ν_eff < 6; sonli natija (y, u_c, ν_eff, k, U) o'zgarmaydi; A1 (ulush > 90 %) o'zgarmagan | Audit MET-01; egasi qarori 1 (2026-11-21); JCGM 101:2008 §5.7, §5.8; JCGM 100:2008 §5.1.2 NOTE |
| REQ-AUD-002 | `required = true` bo'lsa hisobdan keyin MCM avtomatik Web Worker'da boshlanadi (adaptiv, n_dig = 2, §8 tekshiruvi); natija ekranida holat: sabablar va "bajarilmoqda / tasdiqlandi / rad etildi / yaqinlashmadi / bajarilmagan"; bir natija uchun bir marta; kirish o'zgarsa eski ish to'xtatiladi; `autoMcm = false` (laboratoriya yoki hisob sozlamasi) faqat avtomatik ishga tushirishni o'chiradi | Audit MET-01; egasi qarori 1 |
| REQ-AUD-003 | Linter M5 `mcm_required` (warning): MCM talab qilingan, lekin natijasi yo'q (bajarilmagan / bekor qilingan / xato); faqat hisobot va UI qatlamida (`lintMcm`), `evaluate()` topilmalari o'zgarmagan; matnlar uch tilda | Audit MET-01; `CLAUDE.md` (linter qoidalari) |
| REQ-AUD-004 | "QORALAMA" holati: tanlangan shaklning majburiy rekvizitlaridan biri bo'sh (kalibrlash sertifikati ilovasida — 13 ta) yoki talab qilingan MCM bajarilmagan bo'lsa — A4 ko'rinishida va bosmada har sahifada diagonal suv belgisi (QORALAMA / ЧЕРНОВИК / DRAFT), sababi satrda va pastki qismda; aks holda belgi yo'q, pastki qismda "Yakuniy"; hisobot bloklanmaydi | Audit VAL-02; egasi qarori 4 |
| REQ-AUD-005 | Hisobotda MCM qaror qoidasi sabablari ro'yxati va JCGM 101 §8 natijasi; ko'p nuqtali hisobotda nuqta bilan saqlangan MCM natijasi hisobga olinadi | Audit MET-01 |
| REQ-AUD-006 | Tez UX tuzatishlar: hech bir atributda "null" / "undefined" matni yo'q (o'lchash katagi placeholder'i); bildirishnoma — bir vaqtda bitta, 3 s, `aria-live="polite"`, kontentni yopmaydi; pastki amal paneli jadvalning oxirgi qatorini / fokuslangan katakni yopmaydi; chap menyu 1440×900 da qirqilmaydi yoki scroll qutisi ichida | Audit UX-05, UX-07, UX-08, UX-09 |
| REQ-AUD-007 | Preset namunaviy ma'lumoti matn sifatida (`'100.00'`) — jadvalda va hisobotda kiritilgandek chiqadi; hisob natijasi son kiritilgandagi bilan bit darajasida bir xil | Audit MET-04 |
| REQ-AUD-008 | Kirish sahifasi: "bepul va ochiq kodli" / "MIT" da'vosi yo'q (litsenziya yopiq); "to'liq mos" o'rniga "talablari asosida ishlab chiqilgan" (uz / ru / en); sonlar (shablonlar, hisoblash rejimlari, taqsimotlar, tillar) dinamik — katalog va dvigateldan | Audit SEC-01, UX-14 (qisman); egasi qarori 2 |
| REQ-AUD-009 | Ro'yxatdan o'tishda majburiy rozilik belgisi (belgisiz tugma faol emas); Firestore `organizations/{uid}` ga faqat `consentVersion` va `consentAt` (server vaqti) qo'shiladi — boshqa yangi maydon yo'q; qoidalar ularni talab qiladi va keyin o'zgartirishga yo'l qo'ymaydi | Audit SEC-02; egasi qarori 3; `CLAUDE.md` (shaxsiy ma'lumotlar) |
| REQ-AUD-010 | Statik huquqiy sahifalar `privacy.html`, `terms.html` (uz / ru / en; "Loyiha — yurist tasdig'ini kutmoqda" belgisi): qaysi ma'lumot, nima uchun, qayerda, qancha muddat, o'chirish so'rovi tartibi, aloqa; sayt oq ro'yxatida; inline skript va tashqi so'rov yo'q | Audit SEC-02; `docs/DATA_RESIDENCY.md` §2, §113–114 |
