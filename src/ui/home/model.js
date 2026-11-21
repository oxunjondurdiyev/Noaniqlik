/* ═══════════════════════════════════════════════════════════════
   HOME/MODEL.JS — "Bosh sahifa" ning sof modeli (DOM yo'q — Node'da test qilinadi).
   So'nggi sessiyalar — IndexedDB `calculations` omboridagi yozuvlardan (src/ui/tpl/app.js::saveCalculation).
   Bu yerda HISOB YO'Q va natija raqamlari ko'rsatilmaydi (yaxlitlash — faqat hisobot qatlamida): faqat tavsif.
═══════════════════════════════════════════════════════════════ */

import { usedRows } from '../flow/model.js';

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
        n: usedRows(st) || null,          // P22-1: kiritilgan kuzatuv qatorlari (jadvaldagi bo'sh oxirgi qator sanalmaydi)
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

/* ─── P20 (audit 21.11.2026, SEC-01): kirish sahifasidagi sonlar — qattiq yozilmaydi ───
   templates     — o'rnatilgan shablonlar katalogi (templates/builtin/index.json) uzunligi;
   methods       — dvigatelning hisoblash rejimlari (LINTER_MODES: GUM, MCM, vektor, regressiya, top-down, namuna olish,
                   sifatli test, mikrobiologiya, tibbiy laboratoriya);
   distributions — B tur taqsimotlari (dvigatel: DIVISORS kalitlari);
   languages     — interfeys tillari.
   Qiymat ma'lum bo'lmasa (katalog yuklanmagan) — '—' (son o'ylab topilmaydi). */
export function landingStats(o) {
  const src = o || {};
  const count = v => (Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : (Number.isInteger(v) && v >= 0 ? v : null)));
  const out = {};
  for (const k of ['templates', 'methods', 'distributions', 'languages']) { const n = count(src[k]); out[k] = n === null ? '—' : String(n); }
  return out;
}
