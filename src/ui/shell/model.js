/* ═══════════════════════════════════════════════════════════════
   SHELL/MODEL.JS — P16 (Interfeys 2.0): ilova qobig'ining sof modeli (DOM yo'q — Node'da test qilinadi).
   • NAV — chap menyu bandlari va ularning mavjud yorliqlarga (switchTab) mosligi. Yangi holat mashinasi YO'Q:
     har bir band mavjud yorliqni ochadi (+ laboratoriya ichki yorlig'i yoki sahifadagi joyga o'tish).
   • STEPS / stepStates — ish oqimi qadamlari (Model → A tur → B tur → Natija → Hisobot) holati.
     "Bajarildi" belgisi faqat hisob holatidan (appState) — o'ylab topilmaydi.
   • search — buyruq qidiruvi (bo'lim, shablon, amal): registr va diakritikaga befarq, so'zlar bo'yicha VA.
═══════════════════════════════════════════════════════════════ */

export const NAV = Object.freeze([
  { key: 'gum', group: 'calc', tab: 'data', labelKey: 'sh_n_gum' },
  { key: 'mc', group: 'calc', tab: 'results', focus: '[data-mc-panel]', labelKey: 'sh_n_mc' },
  { key: 'multi', group: 'calc', tab: 'data', focus: '[data-outputs-box], #model-box', labelKey: 'sh_n_multi' },
  { key: 'regression', group: 'methods', tab: 'regression', labelKey: 'tab_regression' },
  { key: 'topdown', group: 'methods', tab: 'topdown', labelKey: 'tab_topdown' },
  { key: 'special', group: 'methods', tab: 'special', labelKey: 'sh_n_special' },
  { key: 'lab-qc', group: 'lab', tab: 'lab', lab: 'qc', labelKey: 'sh_n_qc' },
  { key: 'lab-standards', group: 'lab', tab: 'lab', lab: 'standards', labelKey: 'sh_n_registry' },
  { key: 'lab-cmc', group: 'lab', tab: 'lab', lab: 'cmc', labelKey: 'sh_n_cmc', menu: false },
  { key: 'lab-pt', group: 'lab', tab: 'lab', lab: 'pt', labelKey: 'sh_n_pt' },
  { key: 'lab-validation', group: 'lab', tab: 'lab', lab: 'validation', labelKey: 'sh_n_validation' },
  { key: 'vizlab', group: 'foot', tab: 'vizlab', labelKey: 'sh_n_vizlab' },
]);

export const STEPS = Object.freeze([
  { key: 'model', tab: 'data', focus: '#model-box', labelKey: 'sh_st_model' },
  { key: 'typea', tab: 'data', focus: '#measurement-table', labelKey: 'sh_st_typea' },
  { key: 'typeb', tab: 'typeb', labelKey: 'sh_st_typeb' },
  { key: 'results', tab: 'results', labelKey: 'sh_st_results' },
  { key: 'report', tab: 'report', labelKey: 'sh_st_report' },
]);

/** Qaysi yorliqlarda stepper ko'rsatiladi (GUM ish oqimi). */
export const WORKFLOW_TABS = Object.freeze(['data', 'typeb', 'results', 'report']);

/** Joriy yorliq (+ laboratoriya ichki yorlig'i, oxirgi tanlangan menyu bandi) → faol menyu bandi kaliti. */
export function activeNav(tab, labTab, lastKey) {
  const last = NAV.find(n => n.key === lastKey);
  if (last && last.tab === tab && (!last.lab || last.lab === labTab)) return last.key;
  if (tab === 'lab') { const n = NAV.find(x => x.tab === 'lab' && x.lab === labTab); return n ? n.key : 'lab-standards'; }
  if (tab === 'typeb' || tab === 'results' || tab === 'report' || tab === 'data') return 'gum';
  const n = NAV.find(x => x.tab === tab);
  return n ? n.key : null;
}

/** Joriy yorliq → faol qadam ('data' yorlig'ida ikki qadam bor: oxirgi tanlangani saqlanadi). */
export function activeStep(tab, lastStep) {
  if (!WORKFLOW_TABS.includes(tab)) return null;
  const last = STEPS.find(s => s.key === lastStep);
  if (last && last.tab === tab) return last.key;
  return STEPS.find(s => s.tab === tab).key;
}

/**
 * Qadamlar holati — FAQAT hisob holatidan.
 * @param {{params?:string[], model?:{formula?:string}, typeA?:object, typeB?:Array, combined?:object|null}} state
 * @param {string|null} current faol qadam kaliti
 * @returns {{key:string, labelKey:string, done:boolean, current:boolean}[]}
 */
export function stepStates(state, current) {
  const st = state || {};
  const params = Array.isArray(st.params) ? st.params : [];
  const formula = String((st.model || {}).formula || '').trim();
  const done = {
    model: params.length > 0 && (params.length === 1 || formula !== ''),
    typea: !!st.typeA && Object.keys(st.typeA).length > 0,
    typeb: Array.isArray(st.typeB) && st.typeB.length > 0,
    results: !!st.combined,
    report: false,
  };
  return STEPS.map(s => ({ key: s.key, labelKey: s.labelKey, done: done[s.key], current: s.key === current }));
}

/** Qidiruv uchun me'yorlashtirish: kichik harf, diakritika va apostrof turlarisiz. */
export function fold(text) {
  return String(text ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ‘’`']/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * @param {{id:string, kind:string, label:string, hint?:string}[]} items
 * @param {string} query
 * @param {number} [limit]
 * @returns {object[]} mos bandlar (so'rov bo'sh — hammasi, tartibi saqlangan); boshidan mos kelganlar oldinda
 */
export function search(items, query, limit = 40) {
  const words = fold(query).split(' ').filter(Boolean);
  if (!words.length) return items.slice(0, limit);
  const scored = [];
  items.forEach((it, i) => {
    const label = fold(it.label), hay = label + ' ' + fold(it.hint || '');
    if (!words.every(w => hay.includes(w))) return;
    const score = (label.startsWith(words[0]) ? 0 : label.includes(words[0]) ? 1 : 2);
    scored.push({ it, score, i });
  });
  scored.sort((a, b) => a.score - b.score || a.i - b.i);
  return scored.slice(0, limit).map(x => x.it);
}

/** Ro'yxatda klaviatura bilan yurish: yangi indeks (aylanma). */
export function moveIndex(index, delta, length) {
  if (!length) return -1;
  return ((index + delta) % length + length) % length;
}
