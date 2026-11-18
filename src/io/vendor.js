/* ═══════════════════════════════════════════════════════════════
   VENDOR.JS — tashqi kutubxonalarni KERAK BO'LGANDA yuklash (dynamic import) — P05b.
   Asosiy sahifa sekinlashmasin: SheetJS (~1 MB) faqat .xlsx import / eksport bosilganda, QR kutubxonasi faqat
   hisobot ochilganda yuklanadi. CSP o'zgarmaydi (`script-src 'self'`): fayllar shu saytning vendor/ papkasida,
   aniq versiya, LICENSE va SHA-256 bilan (vendor/README.md). Kutubxonalarga yagona kirish nuqtasi — shu fayl
   (tests/security/vendor.test.js tekshiradi).
═══════════════════════════════════════════════════════════════ */

let xlsxPromise = null;
let qrPromise = null;

/** SheetJS Community Edition 0.20.3 (Apache-2.0). @returns {Promise<object>} XLSX nomlar fazosi */
export function loadXlsx() {
  if (!xlsxPromise) xlsxPromise = import('../../vendor/sheetjs/0.20.3/xlsx.mjs').catch(e => { xlsxPromise = null; throw e; });
  return xlsxPromise;
}

/** qrcode-generator 2.0.4 (MIT). @returns {Promise<Function>} qrcode(typeNumber, errorCorrectionLevel) */
export function loadQr() {
  if (!qrPromise) qrPromise = import('../../vendor/qrcode-generator/2.0.4/qrcode.mjs').then(m => m.default).catch(e => { qrPromise = null; throw e; });
  return qrPromise;
}
