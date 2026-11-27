/* ═══════════════════════════════════════════════════════════════
   SHELL/MODEL.JS — P16 (Interfeys 2.0): ilova qobig'ining sof modeli (DOM yo'q — Node'da test qilinadi).
   • NAV — chap menyu bandlari (P22-2: 9 ta, 3 guruh) va ularning mavjud yorliqlarga (switchTab) mosligi. Yangi holat mashinasi YO'Q:
     har bir band mavjud yorliqni ochadi (+ laboratoriya ichki yorlig'i yoki sahifadagi joyga o'tish).
   • STEPS / stepStates — ish oqimi qadamlari (P22-1: Model → Ma'lumotlar → B tur → Natija → Hisobot) holati;
     har qadam — alohida yorliq ('model', 'data', 'typeb', 'results', 'report').
     "Bajarildi" belgisi faqat hisob holatidan (appState) — o'ylab topilmaydi.
   • search — buyruq qidiruvi (bo'lim, shablon, amal): registr va diakritikaga befarq, so'zlar bo'yicha VA.
═══════════════════════════════════════════════════════════════ */

/* P22-2 (audit UX-03): menyuda AYNAN 9 band, 3 guruh — Hisob (calc), Laboratoriya (lab), Yordam (help).
   • `action` — amal bandi (yorliq almashtirmaydi: mavjud ishlovchi — Bosh sahifa, katalog, sozlamalar oynasi …);
   • `tab` (+ `lab`, `covers`) — mavjud yorliqni ochadi; `covers` — shu band qamraydigan laboratoriya ichki yorliqlari;
   • `menu: false` — menyuda ko'rinmaydi, lekin kalit SAQLANGAN: `UCShell.go('regression')`, eski havolalar va Ctrl+K
     ishlashda davom etadi. `method` — usul tanlovi kaliti (src/ui/method/model.js): qidiruv usul tanlovi orqali ochadi. */
export const NAV = Object.freeze([
  { key: 'home', group: 'calc', action: 'home', labelKey: 'sh_n_home' },
  { key: 'new', group: 'calc', action: 'new', labelKey: 'sh_n_new' },
  { key: 'templates', group: 'calc', action: 'templates', labelKey: 'sh_n_templates' },
  { key: 'saved', group: 'calc', action: 'saved', labelKey: 'sh_n_saved' },
  { key: 'lab-control', group: 'lab', tab: 'lab', lab: 'qc', covers: ['qc', 'standards', 'cmc'], labelKey: 'sh_n_labcontrol' },
  { key: 'lab-quality', group: 'lab', tab: 'lab', lab: 'pt', covers: ['pt', 'validation'], labelKey: 'sh_n_labquality' },
  { key: 'settings', group: 'lab', action: 'settings', labelKey: 'sh_n_settings' },
  { key: 'manual', group: 'help', action: 'manual', labelKey: 'sh_n_manual' },
  { key: 'learn', group: 'help', tab: 'vizlab', labelKey: 'sh_n_learn' },
  // ── avvalgi kalitlar (P16 … P22-1): menyuda yo'q, moslik uchun saqlangan ──
  { key: 'gum', group: 'calc', tab: 'model', labelKey: 'sh_n_gum', method: 'GUM', menu: false },
  { key: 'mc', group: 'calc', tab: 'results', focus: '[data-mc-panel]', labelKey: 'sh_n_mc', method: 'GUM_MC', menu: false },
  { key: 'multi', group: 'calc', tab: 'model', focus: '[data-model-outputs], #model-box', labelKey: 'sh_n_multi', method: 'MULTIVARIATE', menu: false },
  { key: 'regression', group: 'methods', tab: 'regression', labelKey: 'tab_regression', method: 'REGRESSION', menu: false },
  { key: 'topdown', group: 'methods', tab: 'topdown', labelKey: 'tab_topdown', method: 'TOP_DOWN', menu: false },
  { key: 'special', group: 'methods', tab: 'special', labelKey: 'sh_n_special', menu: false },
  { key: 'lab-qc', group: 'lab', tab: 'lab', lab: 'qc', labelKey: 'sh_n_qc', menu: false },
  { key: 'lab-standards', group: 'lab', tab: 'lab', lab: 'standards', labelKey: 'sh_n_registry', menu: false },
  { key: 'lab-cmc', group: 'lab', tab: 'lab', lab: 'cmc', labelKey: 'sh_n_cmc', menu: false },
  { key: 'lab-pt', group: 'lab', tab: 'lab', lab: 'pt', labelKey: 'sh_n_pt', menu: false },
  { key: 'lab-validation', group: 'lab', tab: 'lab', lab: 'validation', labelKey: 'sh_n_validation', menu: false },
  { key: 'vizlab', group: 'help', tab: 'vizlab', labelKey: 'sh_n_vizlab', menu: false },
]);

/** Menyuda ko'rinadigan bandlar (aynan 9 ta) va guruhlar tartibi. */
export const MENU = Object.freeze(NAV.filter(n => n.menu !== false));
export const NAV_GROUPS = Object.freeze(['calc', 'lab', 'help']);

export const STEPS = Object.freeze([
  { key: 'model', tab: 'model', labelKey: 'sh_st_model' },
  { key: 'data', tab: 'data', labelKey: 'sh_st_data' },
  { key: 'typeb', tab: 'typeb', labelKey: 'sh_st_typeb' },
  { key: 'results', tab: 'results', labelKey: 'sh_st_results' },
  { key: 'report', tab: 'report', labelKey: 'sh_st_report' },
]);

/** Qaysi yorliqlarda stepper ko'rsatiladi (GUM ish oqimi). */
export const WORKFLOW_TABS = Object.freeze(['model', 'data', 'typeb', 'results', 'report']);

/**
 * Joriy yorliq (+ laboratoriya ichki yorlig'i) → menyudagi faol band kaliti (faqat ko'rinadigan bandlar) yoki null.
 * P22-2: GUM ish oqimi yorliqlarida (Model … Hisobot) va usul yorliqlarida (regressiya, top-down, maxsus) hech qaysi
 * band faol emas — o'rnini stepper / usul qatori ko'rsatadi. `lastKey` — moslik uchun qabul qilinadi (ishlatilmaydi).
 */
export function activeNav(tab, labTab, lastKey) {
  if (tab === 'lab') { const n = MENU.find(x => x.tab === 'lab' && x.covers.includes(labTab)); return n ? n.key : 'lab-control'; }
  const n = MENU.find(x => x.tab === tab);
  return n ? n.key : null;
}

/** Joylashuv yo'li (breadcrumb) uchun bo'lim nomi kaliti: aniq ichki yorliq / usul nomi (eski kalitlar yorliqlari). */
export function sectionLabelKey(tab, labTab) {
  if (tab === 'lab') { const n = NAV.find(x => x.menu === false && x.tab === 'lab' && x.lab === labTab); return n ? n.labelKey : 'sh_g_lab'; }
  if (WORKFLOW_TABS.includes(tab)) return 'sh_n_gum';
  const n = NAV.find(x => x.tab === tab && x.menu === false) || NAV.find(x => x.tab === tab);
  return n ? n.labelKey : '';
}

/** Menyu bandi bosilganda ochiladigan laboratoriya ichki yorlig'i: joriy yorliq shu band ichida bo'lsa — o'zi qoladi. */
export function labTabFor(item, labTab) {
  if (!item || !item.lab) return labTab;
  return Array.isArray(item.covers) && item.covers.includes(labTab) ? labTab : item.lab;
}

/**
 * Buyruq qidiruvi (Ctrl+K) uchun bo'lim bandlari — sof (matn `t` orqali). Eski nomlar ham topiladi (P22-2 §4):
 * har bir band `target` bilan qaytadi — { nav } | { method } | { action }; ishga tushirish src/ui/shell/app.js da.
 * @param {(key:string)=>string} t
 * @param {{key:string, labelKey:string, hintKey?:string, beta?:boolean}[]} [methods]  usullar ro'yxati (src/ui/method/model.js)
 */
export function commandItems(t, methods = []) {
  const items = [];
  const seen = new Set();
  const add = (id, label, hint, target) => { if (!seen.has(id)) { seen.add(id); items.push({ id, kind: 'section', label, hint: hint || '', target }); } };
  for (const n of NAV) {
    if (n.action) add('nav:' + n.key, t(n.labelKey), '', { action: n.action });
    else if (n.method) add('method:' + n.method, t(n.labelKey), t('sh_c_method'), { method: n.method, nav: n.key });
    else add('nav:' + n.key, t(n.labelKey), '', { nav: n.key });
  }
  for (const m of methods) {
    if (m.key === 'AUTO') continue;
    add('method:' + m.key, t(m.labelKey), [t('sh_c_method'), m.hintKey ? t(m.hintKey) : ''].filter(Boolean).join(' · '), { method: m.key });
  }
  // usul nomlari qidiruvda manba nomi bilan ham topilsin (Nordtest, ISO 21748 …) — mavjud bandga izoh qo'shiladi
  for (const m of methods) {
    const it = items.find(x => x.id === 'method:' + m.key);
    if (it && m.hintKey && !it.hint.includes(t(m.hintKey))) it.hint = [it.hint, t(m.hintKey)].filter(Boolean).join(' · ');
  }
  add('act:valreport', t('sh_n_valreport'), t('sh_n_settings'), { action: 'valreport' });
  return items;
}

/** Joriy yorliq → faol qadam (P22-1 dan har qadam alohida yorliq; `lastStep` — moslik uchun). */
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
  const typeA = st.typeA && typeof st.typeA === 'object' ? st.typeA : {};
  const done = {
    model: params.length > 0 && (params.length === 1 || formula !== ''),
    data: params.length > 0 && params.every(p => !!typeA[p]),        // A tur avtomatik: har bir parametrda yetarli kuzatuv bor
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
