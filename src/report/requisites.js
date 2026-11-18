/* ═══════════════════════════════════════════════════════════════
   REQUISITES.JS — hisobot rekvizitlari va majburiy maydonlar tekshiruvi (P05b). Sof modul.
   Ref: ISO/IEC 17025:2017 §7.8.2.1 (hisobotlarning umumiy talablari), §7.8.4.1 (kalibrlash sertifikati), §7.8.3.1
        (sinov hisoboti). ISO/IEC 17025 pullik — matni docs/references/ da YO'Q: quyidagi ro'yxat loyiha tomonidan
        tuzilgan va standart bilan solishtirilmagan → UNVERIFIED (hisobotda ham shunday belgilanadi). Laboratoriya
        o'z sifat tizimi shakliga ko'ra tekshirishi kerak.
   Maxfiylik: rekvizitlar FAQAT brauzerda saqlanadi (UI qatlami), Firebase'ga yozilmaydi; hisobning kanonik xeshiga va
   JSON eksportiga kirmaydi. Shaxsga tegishli maydonlar (mijoz, tasdiqlovchi) — faqat joriy sessiyada.
═══════════════════════════════════════════════════════════════ */

export const REPORT_FORMS = ['calibration_certificate', 'test_report', 'budget', 'conformity'];

/** Laboratoriya rekvizitlari (tashkilot ma'lumoti — shaxsiy emas). */
export const LAB_FIELDS = ['labName', 'labAddress', 'accreditation', 'logo'];
/** Hisobot (hujjat) rekvizitlari. personal: true — shaxsga tegishli bo'lishi mumkin (faqat sessiyada saqlanadi). */
export const REPORT_FIELDS = [
  { key: 'reportNo' }, { key: 'issueDate' },
  { key: 'customer', personal: true }, { key: 'customerAddress', personal: true },
  { key: 'item' }, { key: 'itemId' }, { key: 'itemCondition' },
  { key: 'method' }, { key: 'place' },
  { key: 'receiptDate' }, { key: 'activityDate' },
  { key: 'conditions' }, { key: 'traceability' },
  { key: 'authorizedBy', personal: true }, { key: 'authorizedRole' },
];

/** Shakl bo'yicha majburiy maydonlar (ISO/IEC 17025:2017 §7.8.2.1 a)–p) asosida tuzilgan ro'yxat — unverified). */
const COMMON = ['labName', 'labAddress', 'reportNo', 'issueDate', 'customer', 'item', 'method', 'activityDate', 'authorizedBy'];
export const REQUIRED = Object.freeze({
  calibration_certificate: [...COMMON, 'itemId', 'place', 'conditions', 'traceability'],
  test_report: [...COMMON, 'itemId', 'receiptDate', 'place'],
  budget: ['labName', 'method', 'issueDate'],
  conformity: [...COMMON, 'itemId'],
});
export const REQUISITES_REF = 'ISO/IEC 17025:2017 §7.8.2.1, §7.8.3.1, §7.8.4.1 (unverified)';

const MAX_LEN = 500;
export const MAX_LOGO_BYTES = 200 * 1024;
const LOGO_RE = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/;

/** Logotip: faqat PNG / JPEG data-URL, hajmi cheklangan (SVG qabul qilinmaydi — ichida skript bo'lishi mumkin). */
export function validLogo(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.length <= Math.ceil(MAX_LOGO_BYTES * 4 / 3) + 64 && LOGO_RE.test(dataUrl);
}

/** Tozalash: faqat ma'lum kalitlar, satr, uzunligi cheklangan; logotip tekshiriladi. */
export function cleanRequisites(raw) {
  const out = {};
  const r = raw && typeof raw === 'object' ? raw : {};
  for (const k of [...LAB_FIELDS, ...REPORT_FIELDS.map(f => f.key)]) {
    const v = r[k];
    if (k === 'logo') { if (validLogo(v)) out.logo = v; continue; }
    if (v === undefined || v === null) continue;
    const s = String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, MAX_LEN);
    if (s) out[k] = s;
  }
  return out;
}

/** Laboratoriya (doimiy) va hujjat / shaxs (sessiya) qismlariga ajratish. */
export function splitRequisites(req) {
  const c = cleanRequisites(req);
  const lab = {}, doc = {};
  for (const [k, v] of Object.entries(c)) (LAB_FIELDS.includes(k) ? lab : doc)[k] = v;
  return { lab, doc };
}

/** To'ldirilmagan majburiy maydonlar (kalitlar ro'yxati). */
export function missingRequisites(req, form) {
  const c = cleanRequisites(req);
  return (REQUIRED[form] || REQUIRED.calibration_certificate).filter(k => !c[k]);
}
