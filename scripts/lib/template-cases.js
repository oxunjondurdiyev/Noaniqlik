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
});
