/* ═══════════════════════════════════════════════════════════════
   CALC-JSON.JS — bitta hisobning to'liq JSON eksporti va importi (P05b). Sof modul (DOM yo'q).
   Format 'uc-calc/1':
     { format, app, id, createdAt, engineVersion,
       template: { id, version, status, variant } | null,
       mode: 'GUM' | 'REGRESSION' | 'TOP_DOWN' | 'SAMPLING' | 'QUALITATIVE' | 'MICRO' | 'MEDICAL',
       input,            // dvigatelga AYNAN berilgan modelSpec (evaluate(input) → result)
       result,           // dvigatel natijasi (findings bilan), yaxlitlanmagan
       points: [{ id, label, input, result, acceptances }],   // ko'p nuqtali kalibrlash (bo'lmasa [])
       acceptances,      // asoslangan holda qabul qilingan topilmalar
       ui,               // ixtiyoriy: UI holati (qayta ochish uchun; xeshga KIRADI)
       hash }            // SHA-256( RFC 8785 kanonik JSON(hujjat, `hash` maydonisiz) )
   Chekli bo'lmagan sonlar (ν_eff = ∞) — {"$num":"Infinity"} (src/storage/canonical.js::portable).
   Kafolat (test: tests/io/calc-json.test.js): eksport → import → evaluate(input) natijasi saqlangan natija bilan
   BIT DARAJASIDA bir xil (kanonik JSON satrlari teng); kalitlar tartibi o'zgarsa xesh o'zgarmaydi.
   Import faqat ma'lumot: hech narsa bajarilmaydi (JSON.parse), __proto__ / constructor kalitlari rad etiladi.
═══════════════════════════════════════════════════════════════ */
import { canonicalizeJcs, jcsHash, portable, fromPortable } from '../storage/canonical.js';

export const CALC_FORMAT = 'uc-calc/1';
export const APP_NAME = 'UncertaintyCalc';
export const MAX_JSON_BYTES = 5 * 1024 * 1024;   // import chegarasi (5 MB)
const MODES = ['GUM', 'REGRESSION', 'TOP_DOWN', 'SAMPLING', 'QUALITATIVE', 'MICRO', 'MEDICAL', 'MULTIVARIATE'];   // 'MULTIVARIATE' — P07 (vektor natija)
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];

export function modeOfResult(result) {
  const m = result && result.mode;
  if (!m) return 'GUM';
  return m === 'MICROBIOLOGY' ? 'MICRO' : (MODES.includes(m) ? m : 'GUM');
}

/** Hisob identifikatori (tasodifiy; shaxsiy ma'lumot yo'q). */
export function newCalcId(now, rnd) {
  const t = (now === undefined ? Date.now() : now).toString(36);
  const r = Math.floor((rnd === undefined ? Math.random() : rnd) * 36 ** 6).toString(36).padStart(6, '0');
  return `calc-${t}-${r}`;
}

/** Hujjat tanasi (hash siz) — kalitlar belgilangan to'plamda. */
function body(o) {
  if (!o || !o.input || !o.result || o.result.error) throw new Error('calc_export_need_result');
  const tm = o.template;
  return portable({
    format: CALC_FORMAT,
    app: APP_NAME,
    id: o.id || newCalcId(),
    createdAt: o.createdAt || new Date().toISOString(),
    engineVersion: o.result.engineVersion || '',
    template: tm ? { id: tm.id || '', version: tm.version || '', status: tm.status || '', variant: tm.variant || '' } : null,
    mode: modeOfResult(o.result),
    input: o.input,
    result: o.result,
    points: (o.points || []).map(p => ({ id: p.id, label: p.label || '', input: p.input, result: p.result, acceptances: p.acceptances || {} })),
    acceptances: o.acceptances || {},
    ...(o.ui !== undefined ? { ui: o.ui } : {}),
  });
}

/**
 * Eksport hujjati.
 * @param {{id?, createdAt?, input:object, result:object, template?:object, points?:object[], acceptances?:object, ui?:object}} o
 * @returns {Promise<object>} hash bilan
 */
export async function buildCalcDoc(o) {
  const doc = body(o);
  return { ...doc, hash: await jcsHash(doc) };
}

/** Hujjat xeshi (hash maydonisiz kanonik JSON'dan). */
export async function calcDocHash(doc) {
  const { hash, ...rest } = doc;
  return jcsHash(rest);
}

/** Fayl matni (kanonik emas — o'qish qulay, 2 bo'shliq; xesh kanonik ko'rinishdan olingan). */
export function serializeCalcDoc(doc) {
  return JSON.stringify(doc, null, 2) + '\n';
}

function hasForbiddenKey(v, depth) {
  if (v === null || typeof v !== 'object') return false;
  if ((depth || 0) > 64) return true;                           // haddan tashqari chuqur tuzilma
  if (Array.isArray(v)) return v.some(x => hasForbiddenKey(x, (depth || 0) + 1));
  for (const k of Object.keys(v)) {
    if (FORBIDDEN_KEYS.includes(k)) return true;
    if (hasForbiddenKey(v[k], (depth || 0) + 1)) return true;
  }
  return false;
}

/**
 * Import: matnni tekshirish (hech narsa bajarilmaydi).
 * @returns {Promise<{ok:true, doc:object, input:object, result:object, points:object[]} | {ok:false, reason:string}>}
 *   reason: 'too_large' | 'bad_json' | 'bad_format' | 'forbidden_key' | 'hash'
 *   doc — fayldagi ko'rinish; input / result / points — ∞ tiklangan (fromPortable) holda.
 */
export async function parseCalcDoc(text) {
  if (typeof text !== 'string') return { ok: false, reason: 'bad_json' };
  if (text.length > MAX_JSON_BYTES) return { ok: false, reason: 'too_large' };
  let doc;
  try { doc = JSON.parse(text); } catch (_) { return { ok: false, reason: 'bad_json' }; }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc) || doc.format !== CALC_FORMAT || !doc.input || !doc.result || typeof doc.hash !== 'string') return { ok: false, reason: 'bad_format' };
  if (!MODES.includes(doc.mode) || !Array.isArray(doc.points || [])) return { ok: false, reason: 'bad_format' };
  if (hasForbiddenKey(doc)) return { ok: false, reason: 'forbidden_key' };
  let h;
  try { h = await calcDocHash(doc); } catch (_) { return { ok: false, reason: 'bad_format' }; }
  if (h !== doc.hash) return { ok: false, reason: 'hash' };
  return {
    ok: true, doc,
    input: fromPortable(doc.input), result: fromPortable(doc.result),
    points: (doc.points || []).map(p => ({ ...p, input: fromPortable(p.input), result: fromPortable(p.result) })),
    acceptances: doc.acceptances || {}, ui: doc.ui === undefined ? null : fromPortable(doc.ui),
  };
}

/**
 * Qayta hisob: evaluate(input) natijasi saqlangan natija bilan bit darajasida bir xilmi?
 * Dvigatel versiyasi boshqa bo'lsa natija farq qilishi mumkin — `sameEngine` alohida qaytariladi.
 * @param {object} parsed    parseCalcDoc() natijasi
 * @param {(spec:object)=>object} evaluate  dvigatel funksiyasi
 * @param {string} engineVersion           joriy ENGINE_VERSION
 */
export function reproduce(parsed, evaluate, engineVersion) {
  const same = (input, stored) => {
    const again = evaluate(input);
    return !again.error && canonicalizeJcs(portable(again)) === canonicalizeJcs(portable(stored));
  };
  const main = same(parsed.input, parsed.result);
  const points = parsed.points.map(p => same(p.input, p.result));
  return { identical: main && points.every(Boolean), main, points, sameEngine: parsed.doc.engineVersion === engineVersion };
}
