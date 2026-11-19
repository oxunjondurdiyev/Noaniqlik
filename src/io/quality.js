/* ═══════════════════════════════════════════════════════════════
   QUALITY.JS (io) — P12: PT hisobotlaridan raundlar importi (.xlsx / .csv panjarasi — src/io/import.js LIMITS bilan,
   formulalar bajarilmaydi) va eksport (CSV qatorlari, JSON 'uc-quality/1'). Sof modul, tarmoq chaqiruvi yo'q.
   Fayldan kelgan matn DOM ga faqat escHtml / textContent orqali; eksportda matn `neutralize` qilinadi (formula inyeksiyasi).
   Shaxsiy ma'lumot yo'q: provayder — tashkilot nomi; ijrochi ustuni import qilinmaydi.
═══════════════════════════════════════════════════════════════ */
import { matchColumns, isHeaderRow, parseNumber } from './table-text.js';
import { neutralize } from './csv.js';
import { parseDateCell } from './registry.js';
import { canonicalizeJcs, jcsHash } from '../storage/canonical.js';
import { cleanPtSeries, cleanValidationSet } from '../storage/quality.js';

export const QUALITY_DOC_FORMAT = 'uc-quality/1';
export const MAX_QUALITY_BYTES = 5 * 1024 * 1024;
export const QUALITY_LIMITS = Object.freeze({ maxSeries: 500, maxRounds: 1000, maxSets: 500 });

/** Maqsad ustunlari (uz / ru / en sarlavhalar). x va x_pt majburiy. */
export const PT_COLUMNS = Object.freeze([
  { key: 'id', aliases: ['raund', 'raundraqami', 'раунд', 'round', 'roundno', 'kod', 'код', 'code', 'sample', 'namuna', 'образец'] },
  { key: 'date', aliases: ['sana', 'дата', 'date'] },
  { key: 'scheme', aliases: ['sxema', 'схема', 'scheme', 'dastur', 'программа', 'programme'] },
  { key: 'x', number: true, required: true, aliases: ['natija', 'результат', 'result', 'labresult', 'x_lab', 'xlab'] },
  { key: 'xpt', number: true, required: true, aliases: ['x_pt', 'belgilanganqiymat', 'приписанноезначение', 'assignedvalue', 'assigned', 'xpt'] },
  { key: 'sigmaPt', number: true, aliases: ['σpt', 'σ_pt', 'sigma_pt', 'sigmapt', 'sdpa', 'σ'] },
  { key: 'ux', number: true, aliases: ['u(x)', 'ux', 'u_x'] },
  { key: 'uxpt', number: true, aliases: ['u(x_pt)', 'u(xpt)', 'uxpt', 'u_xpt'] },
  { key: 'Ux', number: true, aliases: ['u(x)k', 'ulab', 'U_lab', 'U(x)', 'Ux'] },
  { key: 'Uxpt', number: true, aliases: ['U(x_pt)', 'U(xpt)', 'Uref', 'Uxpt'] },
]);

const str = v => (v === undefined || v === null ? '' : String(v).trim());
const fail = (reason, detail) => ({ ok: false, reason, ...(detail ? { detail } : {}) });

/**
 * Panjara (birinchi qator — sarlavha) → PT raundlari. `u(x)` va `U(x)` sarlavhalari katta-kichik harf bilan farqlanadi
 * (matchColumns kichik harfga keltiradi — shuning uchun Ux / Uxpt avval aniq sarlavha bilan, keyin kichik harfli moslik).
 * @returns {{ok:true, rounds:object[], rows:number, bad:number, mapping:number[]}|{ok:false, reason, detail?}}
 */
export function ptRoundsFromGrid(grid, opts = {}) {
  const g = (grid || []).filter(r => Array.isArray(r) && r.some(c => str(c) !== ''));
  if (!g.length || !isHeaderRow(g[0])) return fail('no_header');
  let mapping = opts.mapping;
  if (!mapping) {
    // Katta harfli U (kengaytirilgan) ni kichik u (standart) dan ajratish: avval aniq (case-sensitive) moslik
    const head = g[0].map(str);
    const exact = { Ux: ['U(x)', 'Ux', 'U_lab', 'Ulab'], Uxpt: ['U(x_pt)', 'U(xpt)', 'Uxpt', 'Uref'] };
    const pre = {};
    for (const [k, names] of Object.entries(exact)) { const i = head.findIndex(h => names.includes(h)); if (i >= 0) pre[k] = i; }
    const masked = g[0].map((c, i) => (Object.values(pre).includes(i) ? '' : c));
    const rest = PT_COLUMNS.map(c => (pre[c.key] !== undefined ? { key: '\u0000' } : { ...c, aliases: c.aliases.filter(a => !/^U/.test(a)) }));
    mapping = matchColumns(masked, rest).map((m, i) => (pre[PT_COLUMNS[i].key] !== undefined ? pre[PT_COLUMNS[i].key] : m));
  }
  const missing = PT_COLUMNS.filter((c, i) => c.required && !(mapping[i] >= 0)).map(c => c.key);
  if (missing.length) return fail('no_header', missing.join(', '));
  const cell = (row, key) => { const i = mapping[PT_COLUMNS.findIndex(c => c.key === key)]; return i >= 0 ? row[i] : null; };
  const numCell = (row, key) => { const v = cell(row, key); if (typeof v === 'number') return v; const n = parseNumber(v); return n === null ? '' : Number.isNaN(n) ? NaN : n; };
  const rounds = [];
  let bad = 0;
  for (const row of g.slice(1)) {
    const o = { id: str(cell(row, 'id')), date: parseDateCell(cell(row, 'date')), scheme: str(cell(row, 'scheme')) };
    let ok = true;
    for (const c of PT_COLUMNS.filter(x => x.number)) { const v = numCell(row, c.key); if (Number.isNaN(v)) ok = false; o[c.key] = Number.isNaN(v) ? '' : v; }
    if (!ok || o.x === '' || o.xpt === '') { bad++; continue; }
    rounds.push(o);
  }
  if (!rounds.length) return fail('no_rows');
  if (rounds.length > QUALITY_LIMITS.maxRounds) return fail('too_many');
  return { ok: true, rounds, rows: rounds.length, bad, mapping };
}

/** PT seriyasi (+ baholash natijasi) → CSV qatorlari (matn zararsizlantirilgan). */
export function ptSeriesToRows(series, result) {
  const s = cleanPtSeries(series);
  const head = ['id', 'date', 'scheme', 'x', 'xpt', 'sigmaPt', 'ux', 'uxpt', 'Ux', 'Uxpt', 'unit', 'z', 'zPrime', 'zeta', 'En', 'primary', 'verdict'];
  const by = new Map(((result && result.rounds) || []).map(r => [r.id, r]));
  const rows = [head];
  s.rounds.forEach((r, i) => {
    const e = by.get(r.id || `R${i + 1}`) || null;
    const sc = k => (e && e.scores[k] !== null ? e.scores[k] : '');
    rows.push([neutralize(r.id), r.date, neutralize(r.scheme), r.x, r.xpt, r.sigmaPt, r.ux, r.uxpt, r.Ux, r.Uxpt, neutralize(s.unit), sc('z'), sc('zPrime'), sc('zeta'), sc('En'), e ? e.primary : '', e ? e.verdict : '']);
  });
  return rows;
}

/** JSON hujjat: { format, app, pt:[], validation:[], hash } — hash = RFC 8785 SHA-256 (hash maydonisiz tana). */
export async function buildQualityDoc(parts) {
  const body = { format: QUALITY_DOC_FORMAT, app: 'UncertaintyCalc', pt: (parts.pt || []).map(cleanPtSeries), validation: (parts.validation || []).map(cleanValidationSet) };
  return { ...body, hash: await jcsHash(body) };
}
export function serializeQualityDoc(doc) { return canonicalizeJcs(doc); }

export async function parseQualityDoc(text) {
  if (typeof text !== 'string' || text.length > MAX_QUALITY_BYTES) return fail('too_large');
  let doc;
  try { doc = JSON.parse(text); } catch (_) { return fail('bad_json'); }
  if (!doc || doc.format !== QUALITY_DOC_FORMAT || !Array.isArray(doc.pt) || !Array.isArray(doc.validation)) return fail('bad_format');
  const { hash, ...body } = doc;
  if (hash !== await jcsHash(body)) return fail('bad_hash');
  if (doc.pt.length > QUALITY_LIMITS.maxSeries || doc.validation.length > QUALITY_LIMITS.maxSets) return fail('too_many');
  return { ok: true, pt: doc.pt.map(cleanPtSeries), validation: doc.validation.map(cleanValidationSet) };
}
