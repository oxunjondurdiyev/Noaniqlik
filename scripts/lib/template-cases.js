/* Shablon ↔ etalon misol bog'lanishi (qo'lda; YAGONA joy). Holat ("verified" / "unverified") va Δ bu yerda YOZILMAYDI —
   ular scripts/template-validation.js da hisobni ishga tushirib, tests/cases/excel/*.json dagi kutilgan qiymatlar
   (tests/fixtures/ dagi Excel kataklari havolasi bilan) bilan solishtirishdan olinadi. tests/templates/builtin.test.js ham shu ro'yxatdan. */
'use strict';
module.exports = Object.freeze({
  EXCEL: [
    ['legacy-density', ['excel-density']],
    ['legacy-gas_analyzer', ['excel-gas-p1', 'excel-gas-p2', 'excel-gas-p3']],
    ['legacy-thermometer', ['excel-term-p1', 'excel-term-p2', 'excel-term-p3', 'excel-term-p4', 'excel-term-p5']],
  ],
  // P18: maxsus rejim shabloni ↔ ISO/TS 20914:2019 etalon misoli (tests/fixtures/iso20914/<ID>.json; faqat oddiy darajali misollar).
  // Hisob shablon → "Maxsus rejimlar" oynasi holati → src/ui/special/build.js::buildSpec → evaluate() yo'li bilan bajariladi.
  ISO20914: [
    ['SP-04', ['G1']],
  ],
});
