/* ═══════════════════════════════════════════════════════════════
   LAB/REGISTRY.JS — etalonlar va uskunalar reestri (P11): kartochka, kalibrlash nuqtalari,
   nuqtalar orasida interpolyatsiya, B tur manbasini reestrdan tortish, amal qilish muddati.
   Sof modul (DOM / xotira / soat yo'q). Saqlash — src/storage/registry.js.

   Ref: ISO/IEC 17025:2017 §6.4 (uskunalar), §6.5 (metrologik kuzatuvchanlik) — (unverified: standart repoda yo'q);
        ILAC P10:07/2020 §2 (p. 6–7): o'lchash vositasi 1) CIPM MRA qamragan NMI, 2) ILAC kelishuvi qamragan
        akkreditatsiyalangan kalibrlash laboratoriyasi, 3a) / 3b) boshqa NMI / laboratoriya tomonidan kalibrlanadi.

   Kartochka ('uc-registry/1', kind: 'standard'):
     { id, kind, version, name, type, serial, unit, range: {min, max}, limit?,           // limit — MPE / tolerans (faqat interval tavsiyasi uchun)
       calibrations: [{ certificate, calibrator, accreditation, route, traceability, date, validUntil,
                        points: [{ x, correction, U, k, nu }] }] }
   Shaxsiy ma'lumot yo'q: `calibrator` — tashkilot nomi (shaxs emas).
   Kalibrlanayotgan asbobning MPE si bu reestrdan noaniqlik manbai sifatida TAKLIF QILINMAYDI (CLAUDE.md):
   manba faqat sertifikatdagi U (k) dan olinadi; `limit` hech qachon B tur manbasiga aylanmaydi.
═══════════════════════════════════════════════════════════════ */
import { dayNumber, isDate } from './dates.js';

export const REGISTRY_FORMAT = 'uc-registry/1';
export const REGISTRY_KINDS = Object.freeze(['standard', 'cmc', 'qc']);

/** Kuzatuvchanlik yo'li. Ref: ILAC P10:07/2020 §2, 1) – 3b) (p. 6–7); 'crm' — §2, 4) – 6) (p. 8). */
export const TRACEABILITY_ROUTES = Object.freeze(['nmi_cipm', 'accredited', 'nmi_other', 'lab_other', 'crm']);
/** Tengdoshlar bahosi / akkreditatsiyadan o'tgan yo'llar (ILAC P10 §2, p. 7: "subject to relevant peer review or accreditation"). */
export const RECOGNISED_ROUTES = Object.freeze(['nmi_cipm', 'accredited']);

export const REGISTRY_ERRORS = Object.freeze(['registry_no_calibration', 'registry_no_points', 'registry_bad_point', 'registry_out_of_range', 'registry_bad_x']);

const num = v => (typeof v === 'number' ? v : (v === null || v === undefined || String(v).trim() === '' ? NaN : Number(String(v).replace(',', '.'))));
const str = v => (v === null || v === undefined ? '' : String(v).trim());

/** Kalibrlash nuqtasi: sonlarga keltirilgan nusxa (correction bo'sh → 0 EMAS: null — "berilmagan"). */
export function cleanPoint(p) {
  const o = p || {};
  const x = num(o.x), c = num(o.correction), U = num(o.U), k = num(o.k), nu = num(o.nu);
  // bo'sh / son bo'lmagan qiymat — null (NaN emas: yozuv JSON va kanonik xesh uchun yaroqli bo'lishi kerak)
  return { x: Number.isFinite(x) ? x : null, correction: Number.isFinite(c) ? c : null, U: Number.isFinite(U) ? U : null, k: Number.isFinite(k) && k > 0 ? k : null, nu: Number.isFinite(nu) && nu > 0 ? nu : null };
}

export function cleanCalibration(c) {
  const o = c || {};
  return {
    certificate: str(o.certificate), calibrator: str(o.calibrator), accreditation: str(o.accreditation),
    route: TRACEABILITY_ROUTES.includes(o.route) ? o.route : '', traceability: str(o.traceability),
    date: isDate(o.date) ? str(o.date).slice(0, 10) : '', validUntil: isDate(o.validUntil) ? str(o.validUntil).slice(0, 10) : '',
    points: (Array.isArray(o.points) ? o.points : []).map(cleanPoint).filter(p => p.x !== null || p.U !== null),
  };
}

/** Kartochkani tozalash (saqlashdan oldin). Noma'lum maydonlar tashlanadi — shaxsiy ma'lumot tasodifan yozilmaydi. */
export function cleanStandard(s) {
  const o = s || {};
  const r = o.range || {};
  const lim = num(o.limit);
  return {
    id: str(o.id), format: REGISTRY_FORMAT, kind: 'standard', version: Number.isInteger(o.version) && o.version > 0 ? o.version : 0,
    name: str(o.name), type: str(o.type), serial: str(o.serial), unit: str(o.unit),
    range: { min: Number.isFinite(num(r.min)) ? num(r.min) : null, max: Number.isFinite(num(r.max)) ? num(r.max) : null },
    ...(Number.isFinite(lim) && lim > 0 ? { limit: lim } : {}),
    calibrations: (Array.isArray(o.calibrations) ? o.calibrations : []).map(cleanCalibration),
  };
}

/** Kalibrlashlar sana bo'yicha (eskidan yangiga); sanasiz yozuvlar boshida. */
export function sortedCalibrations(std) {
  return [...((std && std.calibrations) || [])].map((c, i) => ({ c, i }))
    .sort((a, b) => ((dayNumber(a.c.date) || -Infinity) - (dayNumber(b.c.date) || -Infinity)) || (a.i - b.i)).map(o => o.c);
}

/** Amaldagi (eng so'nggi sanali) kalibrlash yoki null. */
export function currentCalibration(std) {
  const list = sortedCalibrations(std);
  return list.length ? list[list.length - 1] : null;
}

/**
 * Sertifikat nuqtalaridan X dagi qiymat.
 * Aynan nuqtada — o'sha nuqta. Ikki nuqta orasida — tuzatma CHIZIQLI interpolyatsiya qilinadi; U uchun ikki qo'shni
 * nuqtadagi KATTASI olinadi (k va ν — o'sha nuqtaniki): interpolyatsiya noaniqlikni kamaytirmasligi kerak
 * (loyiha qarori — egasi tasdig'ini kutadi, docs/RISKS.md R-25). Interpolyatsiyaning o'z noaniqligi (nuqtalar orasidagi
 * nochiziqlik) HISOBLANMAYDI: u alohida manba sifatida taklif qilinadi va qiymatini foydalanuvchi kiritadi.
 * Diapazondan tashqarida ekstrapolyatsiya YO'Q — xato.
 * Bitta nuqtali sertifikatda X berilmasa — o'sha nuqta.
 * @returns {{x, correction, U, k, nu, interpolated:boolean, between?:[number, number]}|{error:string}}
 */
export function pointAt(calibration, xIn) {
  const pts = ((calibration && calibration.points) || []).map(cleanPoint);
  if (!pts.length) return { error: 'registry_no_points' };
  if (pts.some(p => !(p.U > 0))) return { error: 'registry_bad_point' };
  const blank = xIn === undefined || xIn === null || String(xIn).trim() === '';
  if (blank) {
    if (pts.length === 1) return { ...pts[0], x: Number.isFinite(pts[0].x) ? pts[0].x : null, interpolated: false };
    return { error: 'registry_bad_x' };
  }
  const x = num(xIn);
  if (!Number.isFinite(x)) return { error: 'registry_bad_x' };
  if (pts.some(p => !Number.isFinite(p.x))) return { error: 'registry_bad_point' };
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const exact = sorted.find(p => p.x === x);
  if (exact) return { ...exact, interpolated: false };
  if (x < sorted[0].x || x > sorted[sorted.length - 1].x) return { error: 'registry_out_of_range' };
  let i = 0;
  while (sorted[i + 1].x < x) i++;
  const a = sorted[i], b = sorted[i + 1];
  const w = (x - a.x) / (b.x - a.x);
  const worst = b.U / (b.k || 2) > a.U / (a.k || 2) ? b : a;       // standart noaniqligi katta bo'lgan qo'shni
  return {
    x,
    correction: a.correction === null || b.correction === null ? null : a.correction + w * (b.correction - a.correction),
    U: worst.U, k: worst.k, nu: worst.nu, interpolated: true, between: [a.x, b.x],
  };
}

/**
 * Reestr yozuvidan B tur manbasi (dastur holatidagi typeB[] elementi) + hisobda saqlanadigan nusxa (snapshot).
 * Hisob reestr yozuvining ID va VERSIYASINI hamda sertifikat ma'lumotining NUSXASINI saqlaydi: reestr keyin
 * o'zgarsa ham eski hisob o'zgarmaydi (dvigatel faqat shu nusxadan o'qiydi, reestrga murojaat qilmaydi).
 * Manba: normal taqsimot, yarim kenglik = sertifikatdagi U, bo'luvchi = k. Ref: JCGM 100:2008 4.3.3, 4.3.4.
 * k sertifikatda yo'q bo'lsa — k bo'sh qoladi va `kRequired` (foydalanuvchi kiritadi; 2 deb FARAZ QILINMAYDI).
 * Tuzatma modelga avtomatik qo'shilmaydi — nusxada saqlanadi va hisobotda ko'rsatiladi.
 * @param {object} std  reestr kartochkasi
 * @param {{x?:number|string, param?:string}} [opts]
 * @returns {{component:object, snapshot:object}|{error:string}}
 */
export function sourceFromStandard(std, opts = {}) {
  const cal = currentCalibration(std);
  if (!cal) return { error: 'registry_no_calibration' };
  const pt = pointAt(cal, opts.x);
  if (pt.error) return pt;
  const snapshot = {
    id: str(std.id), version: Number(std.version) || 0, name: str(std.name), serial: str(std.serial),
    certificate: cal.certificate, date: cal.date, validUntil: cal.validUntil, calibrator: cal.calibrator,
    accreditation: cal.accreditation, route: cal.route, traceability: cal.traceability,
    x: pt.x === undefined ? null : pt.x, correction: pt.correction, U: pt.U, k: pt.k, nu: pt.nu,
    interpolated: !!pt.interpolated, ...(pt.between ? { between: pt.between } : {}),
  };
  const component = {
    name: [str(std.name), cal.certificate].filter(Boolean).join(' — '),
    kind: 'certificate', distribution: 'normal', halfWidth: pt.U, k: pt.k === null ? '' : pt.k,
    ...(pt.k === null ? { kRequired: true } : {}),
    nu: pt.nu === null ? '' : pt.nu, sensitivity: 1, unit: str(std.unit),
    ...(opts.param ? { param: opts.param } : {}),
    registry: snapshot,
  };
  return { component, snapshot };
}

/** Standart ogohlantirish muddati (kun) — loyiha qarori (docs/LINTER_RULES.md §4 #25); laboratoriya sozlamasi `expiryWarnDays`. */
export const EXPIRY_WARN_DAYS = 30;

/**
 * Amal qilish muddati holati — berilgan sanaga nisbatan (`asOf`: o'lchash bajarilgan sana).
 * expired: asOf > validUntil (muddat tugagan kunning o'zida etalon hali amalda).
 * @returns {{status:'valid'|'expiring'|'expired'|'unknown', daysLeft:number|null}}
 */
export function validityStatus(validUntil, asOf, warnDays = EXPIRY_WARN_DAYS) {
  const end = dayNumber(validUntil), now = dayNumber(asOf);
  if (!Number.isFinite(end) || !Number.isFinite(now)) return { status: 'unknown', daysLeft: null };
  const left = end - now;
  if (left < 0) return { status: 'expired', daysLeft: left };
  const w = Number.isFinite(Number(warnDays)) && Number(warnDays) >= 0 ? Number(warnDays) : EXPIRY_WARN_DAYS;
  return { status: left <= w ? 'expiring' : 'valid', daysLeft: left };
}

/** Kuzatuvchanlik dalili bormi: akkreditatsiya belgisi / kodi YOKI CIPM MRA qamragan NMI (ILAC P10:07/2020 §2, 1) va 2), Note 3). */
export function hasTraceabilityEvidence(snapshotOrCalibration) {
  const o = snapshotOrCalibration || {};
  return str(o.accreditation) !== '' || o.route === 'nmi_cipm';
}
