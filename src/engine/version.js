/* Dvigatel versiyasi (semver). Hisoblash natijasiga ta'sir qiladigan har qanday
   o'zgarishda oshiriladi va CHANGELOG.md da qayd etiladi (CLAUDE.md).
   1.0.0 — P00/P01 (src/js/calc.js); 2.0.0 — P03 (src/engine/, ENGINE_API.md);
   2.1.0 — P08 (src/engine/regression/, format 'uc-regression/1'; bir o'lchamli GUM natijalari o'zgarmagan);
   2.2.0 — P09 (src/engine/topdown/, format 'uc-topdown/1'; GUM va regressiya natijalari o'zgarmagan);
   2.3.0 — P10 (sampling/, qualitative/, micro/ (beta), medical/ (beta); mavjud rejimlar natijalari o'zgarmagan);
   2.4.0 — P05a (linter/: result.findings; model turi — settings.modelKind, result.modelKind / deviation;
           y, u_c, ν_eff, k, U o'zgarmagan. Model turi ko'rsatilmagan hisobda muvofiqlik bayonoti berilmaydi — R-07);
   2.5.0 — P05b (decision.js: qaror qoidasi — w = r·U, TUR, muvofiqlik ehtimoli p_c, bir / ikki tomonlama chegaralar —
           JCGM 106:2012, ILAC G8:09/2019; result.decision. y, u_c, ν_eff, k, U va conf o'zgarmagan);
   2.6.0 — P06 (Monte-Karlo 2.0, JCGM 101:2008: mc/rng.js — kengaytirilgan Wichmann–Hill; mc/distributions.js; adaptiv
           protsedura §7.9.4; ko'p o'lchovli Gauss; linter M2–M4; B tur: trap, ctrap, exp, lognorm.
           MONTE-KARLO RAQAMLARI O'ZGARDI (yangi generator, JCGM 101 bo'yicha tanlash formulalari, §7.7.2 indekslari);
           eski natija rng: 'xorshift32-legacy' bilan aynan takrorlanadi. LPU (y, u_c, ν_eff, k, U) o'zgarmagan). */
export const ENGINE_VERSION = '2.6.0';
