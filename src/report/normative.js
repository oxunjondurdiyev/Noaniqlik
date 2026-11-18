/* ═══════════════════════════════════════════════════════════════
   NORMATIVE.JS — hisobotdagi normativ havolalar (hisobot tiliga qarab) — P05b. Sof modul.
   Qoida (CLAUDE.md): nashrlar aniq ko'rsatiladi; boshqa belgilanishga (milliy / davlatlararo ekvivalent) havola faqat
   docs/references/ dan tekshirilgan bo'lsa.
   • JCGM 106:2012 = ISO/IEC Guide 98-4:2012 — ILAC G8:09/2019 §9 [2] da yozilgan ("also available as") → verified.
   • "ГОСТ 34100.3-2017 (ISO/IEC Guide 98-3:2008)" — JCGM 100:2008 bilan ekvivalentligi docs/references/ dagi
     hujjatlarning hech birida tasdiqlanmagan (GOST matni pullik, repoda yo'q) → rus tilida ham FAQAT JCGM havolasi.
     Egasi tasdiqlasa, EQUIVALENTS.ru ga qo'shiladi (docs/RISKS.md R-22).
═══════════════════════════════════════════════════════════════ */

/** Tilga xos qo'shimcha belgilanishlar: { hujjat kaliti: "qavs ichidagi matn" }. Hozir — faqat tekshirilganlari. */
export const EQUIVALENTS = Object.freeze({
  uz: Object.freeze({ jcgm106: 'ISO/IEC Guide 98-4:2012' }),
  ru: Object.freeze({ jcgm106: 'ISO/IEC Guide 98-4:2012' }),
  en: Object.freeze({ jcgm106: 'ISO/IEC Guide 98-4:2012' }),
});

const DOCS = {
  iso17025: 'ISO/IEC 17025:2017',
  jcgm100: 'JCGM 100:2008 (GUM)',
  jcgm101: 'JCGM 101:2008',
  jcgm102: 'JCGM 102:2011',
  jcgm106: 'JCGM 106:2012',
  ea402: 'EA-4/02 M:2022',
  ilacP14: 'ILAC P14:09/2020',
  ilacG8: 'ILAC G8:09/2019',
  nordtest: 'Nordtest TR 537 ed. 4',
  quam: 'EURACHEM/CITAC QUAM:2012',
  ufs: 'EURACHEM/CITAC UfS:2019',
  aqa: 'EURACHEM/CITAC AQA:2021',
};

/**
 * Hisobot uchun normativ havolalar ro'yxati.
 * @param {string} lang  'uz' | 'ru' | 'en'
 * @param {{form?:string, mode?:string, decision?:boolean, monteCarlo?:boolean}} o
 * @returns {string[]}
 */
export function normativeRefs(lang, o) {
  const opt = o || {};
  const mode = opt.mode || 'GUM';
  const keys = ['iso17025'];
  if (mode === 'GUM' || mode === 'REGRESSION' || mode === 'MULTIVARIATE') keys.push('jcgm100');
  if (mode === 'MULTIVARIATE') keys.push('jcgm102');   // P07: vektor natija
  if (mode === 'GUM' && opt.form !== 'test_report') keys.push('ea402');
  if (opt.form === 'calibration_certificate' || opt.form === 'budget') keys.push('ilacP14');
  if (mode === 'REGRESSION') keys.push('quam');
  if (mode === 'TOP_DOWN') keys.push('nordtest', 'quam');
  if (mode === 'SAMPLING') keys.push('ufs');
  if (mode === 'QUALITATIVE') keys.push('aqa');
  if (opt.monteCarlo) keys.push('jcgm101');
  if (opt.decision || opt.form === 'conformity') keys.push('jcgm106', 'ilacG8');
  const eq = EQUIVALENTS[lang] || EQUIVALENTS.en;
  return [...new Set(keys)].map(k => (eq[k] ? `${DOCS[k]} (${eq[k]})` : DOCS[k]));
}
