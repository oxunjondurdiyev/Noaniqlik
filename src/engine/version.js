/* Dvigatel versiyasi (semver). Hisoblash natijasiga ta'sir qiladigan har qanday
   o'zgarishda oshiriladi va CHANGELOG.md da qayd etiladi (CLAUDE.md).
   1.0.0 — P00/P01 (src/js/calc.js); 2.0.0 — P03 (src/engine/, ENGINE_API.md);
   2.1.0 — P08 (src/engine/regression/, format 'uc-regression/1'; bir o'lchamli GUM natijalari o'zgarmagan);
   2.2.0 — P09 (src/engine/topdown/, format 'uc-topdown/1'; GUM va regressiya natijalari o'zgarmagan);
   2.3.0 — P10 (sampling/, qualitative/, micro/ (beta), medical/ (beta); mavjud rejimlar natijalari o'zgarmagan);
   2.4.0 — P05a (linter/: result.findings; model turi — settings.modelKind, result.modelKind / deviation;
           y, u_c, ν_eff, k, U o'zgarmagan. Model turi ko'rsatilmagan hisobda muvofiqlik bayonoti berilmaydi — R-07);
   2.5.0 — P05b (decision.js: qaror qoidasi — w = r·U, TUR, muvofiqlik ehtimoli p_c, bir / ikki tomonlama chegaralar —
           JCGM 106:2012, ILAC G8:09/2019; result.decision. y, u_c, ν_eff, k, U va conf o'zgarmagan).
   2.5.1 — egasi qarorlari (2026-11-18): X7 — ν_eff < 10 warning, 10 ≤ ν_eff < 30 info; D1 — TUR < 1 warning,
           1 ≤ TUR < 4 info (decision_tur_below_4, unverified); decisionPreset (oldindan qo'yish, tasdiq bilan).
           Faqat topilmalar darajasi o'zgardi: y, u_c, ν_eff, k, U, conf, decision o'zgarmagan.
   2.6.0 — P06 (Monte-Karlo 2.0, JCGM 101:2008: mc/rng.js — kengaytirilgan Wichmann–Hill; mc/distributions.js; adaptiv
           protsedura §7.9.4; ko'p o'lchovli Gauss; linter M2–M4; B tur: trap, ctrap, exp, lognorm.
           MONTE-KARLO RAQAMLARI O'ZGARDI (yangi generator, JCGM 101 bo'yicha tanlash formulalari, §7.7.2 indekslari);
           eski natija rng: 'xorshift32-legacy' bilan aynan takrorlanadi. LPU (y, u_c, ν_eff, k, U) o'zgarmagan).
   2.7.0 — P07 (JCGM 102:2011: multivariate/ — vektor LPU U_y = C_x·U_x·C_xᵀ, qamrov sohasi §6.5 / §7.7, ko'p o'lchovli
           MCM §7–8; linter MV1; ko'p o'lchovli t §5.3.2 — juftlangan A tur kuzatuvlarida MCM endi natija beradi
           (2.6.0 da mc_nonnormal_correlation). Bitta chiqishli LPU va qolgan MCM natijalari bit darajasida o'zgarmagan).
   2.8.0 — P11 (lab/ — etalonlar reestri, drift, CMC jadvali, QC kartalari, Westgard, kalibrlash intervali; linter L1, L2;
           settings.cmcRow / cmcRows + cmcX → CMC(X) avtomatik; typeB[].registry, typeB[].drift — byudjet qatorida nusxa.
           YANGI IMKONIYAT: yangi maydonlar ishlatilmagan hisoblarning natijasi 2.7.0 bilan bit darajasida bir xil).
   2.8.1 — Westgard 1981 va NIST e-Handbook manbalari: 1₂s darvozasi, westgardMulti, D₄ (n = 3, 5) NIST jadvaliga moslandi
           (faqat QC kartalari va Westgard topilmalari; GUM / MCM natijalari o'zgarmagan).
   2.9.0 — P07b (JCGM 102:2011: oshkor bo'lmagan model h(Y, X) = 0 — §6.3; atan2 — §9.3; eng kichik qamrov sohasi — §7.7.4,
           ikki chiqish. YANGI IMKONIYAT: mavjud bitta va ko'p chiqishli natijalar 2.8.0 bilan bit darajasida bir xil;
           ikki chiqishli MCM natijasiga yangi maydon coverageRegion.smallest qo'shiladi.
           Egasi qarorlari 2026-11-19: U_y — Annex B (U_x singular → LU + info MV2), qoldiq tekshiruvi, cond₁(C_y)).
   2.10.0 — P12 (pt/ — z, z′, ζ, E_n, PT tarixi → top-down bias; validation/ — Grubbs, Cochran (unverified), bir omilli ANOVA,
           t / F testlari, LOD/LOQ (unverified), top-down shablon qoralamasi; stats/ — F-taqsimot, ANOVA yordamchilari.
           YANGI IMKONIYAT: mavjud natijalar 2.9.0 bilan bit darajasida bir xil; sampling/ umumiy yordamchiga o'tkazildi).
   2.11.0 — P18 (medical/ — ISO/TS 20914:2019 misollari G1…G11 bilan tasdiqlandi: `medical_unverified` va `unverified` olib tashlandi;
           daraja qo'llanish oralig'i (oraliq berilmasa eng yaqin o'rtacha + `medical_level_by_nearest`), aniqlik turi (u_Rw / u_r),
           lotlar / tizimlar / davrlar bo'yicha pooling, CRM dan u_bias va ahamiyatlilik testi, log₁₀ shkala, ruxsat etilgan noaniqlik, sanoq.
           uc-medical/1 ning avvalgi kirishlarida SONLI natija 2.10.0 bilan bit darajasida bir xil; ogohlantirishlar ro'yxati o'zgargan.
           Boshqa rejimlar o'zgarmagan). */
export const ENGINE_VERSION = '2.11.0';
