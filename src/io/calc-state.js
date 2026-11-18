/* ═══════════════════════════════════════════════════════════════
   CALC-STATE.JS — GUM muharriri holati ↔ 'uc-calc/1' hujjati (P05b). Sof modul (DOM yo'q).
     • gumInput(state)        — dvigatelga beriladigan holat qismi (eksportdagi `input`): JSON orqali aynan tiklanadi;
     • gumDocParts(state, …)  — eksport uchun { input, result, points }: natija AYNAN shu `input` dan hisoblanadi,
                                shuning uchun evaluate(input) uni bit darajasida qayta beradi;
     • gumStateFromInput(inp) — import: `input` dan muharrir holatini tiklash (faqat tekshirilgan, ma'lum maydonlar).
   Shaxsiy ma'lumot yo'q: holatda faqat o'lchash ma'lumoti, model va sozlamalar bor.
═══════════════════════════════════════════════════════════════ */

/** Muharrir holatining dvigatel o'qiydigan maydonlari (src/js/points.js::KEYS bilan bir xil) */
export const GUM_KEYS = Object.freeze(['n', 'params', 'measurements', 'directions', 'typeB', 'model', 'outputs', 'settings', 'covB', 'units', 'template']);   // 'outputs' — P07 (bir nechta chiqish)
const FORBIDDEN = ['__proto__', 'constructor', 'prototype'];
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Holatning eksport qilinadigan qismi (chuqur nusxa; undefined maydonlar tashlanadi) */
export function gumInput(state) {
  const out = {};
  for (const k of GUM_KEYS) if (state && state[k] !== undefined && state[k] !== null) out[k] = clone(state[k]);
  return out;
}

/**
 * Eksport qismlari. Shablonli holat uchun `evaluateState` (src/templates/interpreter.js) dvigatelga beriladigan
 * yakuniy holatni qaytaradi; natija har doim shu holatdan `evaluate` bilan olinadi.
 * @param {object} state                      appState.get()
 * @param {(spec:object)=>object} evaluate    dvigatel
 * @param {(state:object)=>{state:object,result:object}} [evaluateState]  shablon interpreteri (bo'lmasa — to'g'ridan-to'g'ri)
 * @returns {{input:object, result:object, points:object[], skipped:number}}  result.error bo'lishi mumkin
 */
export function gumDocParts(state, evaluate, evaluateState) {
  const one = st => {
    const ev = st && st.template && typeof evaluateState === 'function' ? evaluateState(st) : null;
    const input = gumInput(ev && ev.state ? ev.state : st);
    return { input, result: evaluate(input) };
  };
  const main = one(state);
  const points = [];
  let skipped = 0;
  for (const p of (Array.isArray(state && state.points) ? state.points : [])) {
    if (!p || !p.snapshot) { skipped++; continue; }
    const r = one(p.snapshot);
    if (!r.result || r.result.error) { skipped++; continue; }
    points.push({ id: String(p.id || ''), label: String(p.label || ''), input: r.input, result: r.result, acceptances: clone(p.acceptances || {}) });
  }
  return { input: main.input, result: main.result, points, skipped };
}

const okKey = k => typeof k === 'string' && !FORBIDDEN.includes(k);

/**
 * Import qilingan `input` → muharrir holati. Qo'llab-quvvatlanadi: format'siz holat va { format: 'calc-state/v2', state }.
 * 'uc-model/1' muharrirga yuklanmaydi (faqat tekshiriladi) → { ok: false, reason: 'not_editable' }.
 * @returns {{ok:true, state:object} | {ok:false, reason:'not_editable'|'bad_state'}}
 */
export function gumStateFromInput(input) {
  if (!isObj(input)) return { ok: false, reason: 'bad_state' };
  let st = input;
  if (input.format === 'calc-state/v2') st = input.state;
  else if (input.format) return { ok: false, reason: 'not_editable' };
  if (!isObj(st) || !Array.isArray(st.params) || !st.params.length || st.params.length > 200) return { ok: false, reason: 'bad_state' };
  if (!st.params.every(p => typeof p === 'string' && p.trim() !== '' && p.length <= 100 && okKey(p)) || new Set(st.params).size !== st.params.length) return { ok: false, reason: 'bad_state' };
  if (st.measurements !== undefined && !isObj(st.measurements)) return { ok: false, reason: 'bad_state' };
  const meas = st.measurements || {};
  const lens = st.params.map(p => (Object.prototype.hasOwnProperty.call(meas, p) && Array.isArray(meas[p]) ? meas[p].length : 0));
  if (st.n !== undefined && !(Number.isInteger(st.n) && st.n >= 1 && st.n <= 10000)) return { ok: false, reason: 'bad_state' };
  const n = st.n !== undefined ? st.n : Math.max(2, ...lens);
  if (Math.max(n, ...lens) > 10000) return { ok: false, reason: 'bad_state' };
  // Qiymatlar O'ZGARTIRILMAYDI (to'ldirilmaydi, qisqartirilmaydi): yuklangan holatdan qayta eksport aynan shu `input` ni
  // va shu xeshni berishi kerak. Jadval yetishmagan kataklarni bo'sh ko'rsatadi.
  const measurements = Object.create(null);
  for (const p of st.params) {
    const src = Object.prototype.hasOwnProperty.call(meas, p) && Array.isArray(meas[p]) ? meas[p] : null;
    if (src && !src.every(v => v === null || typeof v === 'number' || typeof v === 'string')) return { ok: false, reason: 'bad_state' };
    measurements[p] = src ? src.map(v => (v === null ? '' : v)) : Array(n).fill('');
  }
  if (st.typeB !== undefined && !(Array.isArray(st.typeB) && st.typeB.every(isObj))) return { ok: false, reason: 'bad_state' };
  for (const k of ['model', 'settings', 'covB', 'units']) if (st[k] !== undefined && st[k] !== null && !isObj(st[k])) return { ok: false, reason: 'bad_state' };
  if (st.template !== undefined && st.template !== null && !isObj(st.template)) return { ok: false, reason: 'bad_state' };
  if (st.directions !== undefined && !(Array.isArray(st.directions) && st.directions.every(d => typeof d === 'string'))) return { ok: false, reason: 'bad_state' };
  const model = st.model || {};
  if (['formula', 'unit'].some(k => model[k] !== undefined && typeof model[k] !== 'string')) return { ok: false, reason: 'bad_state' };
  // P07: bir nechta chiqish — [{ formula, unit }]
  if (st.outputs !== undefined && st.outputs !== null && !(Array.isArray(st.outputs) && st.outputs.length <= 50 && st.outputs.every(o => isObj(o) && typeof o.formula === 'string' && (o.unit === undefined || typeof o.unit === 'string')))) return { ok: false, reason: 'bad_state' };
  return {
    ok: true,
    state: {
      n,
      params: [...st.params],
      measurements: { ...measurements },
      // faylda bo'lmagan ixtiyoriy maydonlar — undefined (muharrirdagi eski qiymat o'chadi; qayta eksportda ham bo'lmaydi)
      directions: st.directions ? st.directions.map(d => (d === '↑' || d === '↓' ? d : '')) : undefined,
      typeB: clone(st.typeB || []).map((c, i) => (typeof c.id === 'string' && c.id ? c : { ...c, id: 'tb_imp_' + i })),
      model: st.model ? clone(st.model) : { formula: '', unit: '' },
      outputs: Array.isArray(st.outputs) && st.outputs.length > 1 ? clone(st.outputs) : undefined,
      settings: clone(st.settings || {}),
      covB: st.covB ? clone(st.covB) : undefined,
      units: st.units ? clone(st.units) : undefined,
      template: st.template ? clone(st.template) : null,
    },
  };
}
