/* ═══════════════════════════════════════════════════════════════
   HOME/MODEL.JS — "Bosh sahifa" ning sof modeli (DOM yo'q — Node'da test qilinadi).
   So'nggi sessiyalar — IndexedDB `calculations` omboridagi yozuvlardan (src/ui/tpl/app.js::saveCalculation).
   Bu yerda HISOB YO'Q va natija raqamlari ko'rsatilmaydi (yaxlitlash — faqat hisobot qatlamida): faqat tavsif.
═══════════════════════════════════════════════════════════════ */

/** Ro'yxatda ko'rsatiladigan eng ko'p yozuv */
export const RECENT_LIMIT = 8;

/**
 * @param {Array<object>} records `calculations` yozuvlari
 * @param {number} [limit]
 * @returns {{id:string, formula:string, params:string[], n:number|null, template:string|null, engineVersion:string, createdAt:string, copy:boolean}[]}
 *          yangilari oldinda; buzuq yozuvlar tashlanadi
 */
export function recentSessions(records, limit = RECENT_LIMIT) {
  return (Array.isArray(records) ? records : [])
    .filter(r => r && typeof r.id === 'string' && r.state && typeof r.state === 'object')
    .map(r => {
      const st = r.state;
      const tr = r.templateRef && typeof r.templateRef.id === 'string' ? `${r.templateRef.id} v${r.templateRef.version || ''}`.trim() : null;
      return {
        id: r.id,
        formula: String((st.model && st.model.formula) || '').trim(),
        params: Array.isArray(st.params) ? st.params.map(String) : [],
        n: Number.isFinite(st.n) ? st.n : null,
        template: tr,
        engineVersion: String(r.engineVersion || (r.result && r.result.engineVersion) || ''),
        createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
        copy: typeof r.copyOf === 'string',
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, limit);
}

/** Yozuv sarlavhasi: formula, bo'lmasa kirish kattaliklari ro'yxati */
export function sessionTitle(row) {
  return row.formula || row.params.join(', ') || row.id;
}

/** ISO vaqt → 'YYYY-MM-DD HH:MM' (mahalliy vaqt zonasisiz — yozuvdagi UTC; til va joyga bog'liq emas) */
export function shortTime(iso) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(String(iso || ''));
  return m ? `${m[1]} ${m[2]} UTC` : '';
}

/**
 * Saqlangan yozuvni tahrirlash holatiga o'tkazish. Natija faqat AYNAN shu dvigatel versiyasida hisoblangan bo'lsa
 * qaytariladi — aks holda `combined: null` (foydalanuvchi qayta hisoblaydi; eski natija yangi deb ko'rsatilmaydi).
 * @returns {{patch:object, stale:boolean}|null}
 */
export function sessionPatch(rec, engineVersion) {
  if (!rec || !rec.state || !Array.isArray(rec.state.params) || !rec.state.params.length) return null;
  const st = JSON.parse(JSON.stringify(rec.state));
  const same = !!rec.result && !rec.result.error && String(rec.engineVersion || rec.result.engineVersion || '') === String(engineVersion);
  return {
    stale: !same,
    patch: {
      n: st.n, params: st.params, measurements: st.measurements || {}, directions: st.directions || [], typeB: st.typeB || [],
      model: st.model || { formula: '', unit: '' }, settings: st.settings || {}, covB: st.covB || {}, units: st.units || {}, template: st.template || null,
      typeA: {}, combined: same ? JSON.parse(JSON.stringify(rec.result)) : null, points: [], currentPoint: null, acceptances: {},
      calcMeta: same ? { id: rec.id, createdAt: rec.createdAt || '' } : null,
    },
  };
}
