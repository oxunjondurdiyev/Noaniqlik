/* ═══════════════════════════════════════════════════════════════
   REGISTRY.JS — laboratoriya reestri importi / eksporti (P11). Sof modul: DOM yo'q, tarmoq yo'q.
   1. Eksport / import hujjati 'uc-registry/1' (JSON, kanonik):
        { format, app, standards: [...], cmc: {rows: [...]} | null, qc: [...], hash }
      hash = SHA-256(RFC 8785 kanonik JSON, hash maydonisiz). Sana tanaga kirmaydi (fayl nomida).
   2. Jadval importi (.xlsx / .csv — src/io/import.js orqali o'qilgan panjara, LIMITS bilan): har bir QATOR — bitta
      kalibrlash nuqtasi; bir xil (nom, zavod raqami) — bitta kartochka, bir xil (sertifikat, sana) — bitta kalibrlash.
      Formulalar bajarilmaydi (import.js); matn kataklari faqat ma'lumot — DOM ga escHtml orqali (UI qatlami).
   Yozuvlar dvigatelning tozalash funksiyalaridan o'tadi (noma'lum maydonlar, jumladan tasodifiy shaxsiy ma'lumot, tashlanadi).
═══════════════════════════════════════════════════════════════ */
import { jcsHash, canonicalizeJcs } from '../storage/canonical.js';
import { cleanStandard, cleanCmcRow, cmcRowError, TRACEABILITY_ROUTES } from '../engine/lab/index.js';
import { matchColumns, isHeaderRow, parseNumber } from './table-text.js';
import { neutralize } from './csv.js';

export const REGISTRY_DOC_FORMAT = 'uc-registry/1';
export const REGISTRY_APP = 'UncertaintyCalc';
export const MAX_REGISTRY_BYTES = 5 * 1024 * 1024;
export const REGISTRY_LIMITS = Object.freeze({ maxStandards: 2000, maxCalibrations: 200, maxPoints: 500, maxCmcRows: 5000, maxQcCharts: 500, maxQcPoints: 20000 });
export const REGISTRY_DOC_ERRORS = Object.freeze(['too_large', 'bad_json', 'bad_format', 'bad_hash', 'too_many', 'no_header', 'no_rows']);

const str = v => (v === null || v === undefined ? '' : String(v).trim());
const fail = (reason, detail) => ({ ok: false, reason, ...(detail !== undefined ? { detail } : {}) });

/** QC kartasini tozalash: faqat ma'lum maydonlar; qiymatlar — sonlar. */
export function cleanQcChart(c) {
  const o = c || {};
  const tm = Number((o.target || {}).mean), ts = Number((o.target || {}).s);
  return {
    id: str(o.id), kind: 'qc', version: Number.isInteger(o.version) && o.version > 0 ? o.version : 0,
    name: str(o.name), unit: str(o.unit), type: o.type === 'xbar' ? 'xbar' : 'imr',
    target: Number.isFinite(tm) && ts > 0 ? { mean: tm, s: ts } : null,
    points: (Array.isArray(o.points) ? o.points : []).map(p => ({
      date: /^\d{4}-\d{2}-\d{2}$/.test(str(p && p.date)) ? str(p.date) : '', run: str(p && p.run),
      values: (Array.isArray(p && p.values) ? p.values : []).map(Number).filter(Number.isFinite),
    })).filter(p => p.values.length),
  };
}

/** Reestr yozuvlaridan eksport hujjati. @param {{standards?:object[], cmc?:object|null, qc?:object[]}} parts */
export async function buildRegistryDoc(parts) {
  const p = parts || {};
  const body = {
    format: REGISTRY_DOC_FORMAT, app: REGISTRY_APP,
    standards: (p.standards || []).map(cleanStandard).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    cmc: p.cmc ? { id: str(p.cmc.id), kind: 'cmc', version: Number(p.cmc.version) || 0, rows: (p.cmc.rows || []).map(cleanCmcRow) } : null,
    qc: (p.qc || []).map(cleanQcChart).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
  return { ...body, hash: await jcsHash(body) };
}

export function serializeRegistryDoc(doc) { return canonicalizeJcs(doc); }

/** Hujjat matnini tekshirib o'qish (hajm, format, xesh, chegaralar). */
export async function parseRegistryDoc(text) {
  const s = String(text === null || text === undefined ? '' : text);
  if (s.length > MAX_REGISTRY_BYTES) return fail('too_large');
  let doc;
  try { doc = JSON.parse(s); } catch (_) { return fail('bad_json'); }
  if (!doc || typeof doc !== 'object' || doc.format !== REGISTRY_DOC_FORMAT) return fail('bad_format');
  if (!Array.isArray(doc.standards || []) || !Array.isArray(doc.qc || [])) return fail('bad_format');
  const { hash, ...body } = doc;
  if (typeof hash !== 'string' || (await jcsHash(body)) !== hash) return fail('bad_hash');
  const L = REGISTRY_LIMITS;
  const standards = (doc.standards || []), qc = (doc.qc || []), rows = (doc.cmc && doc.cmc.rows) || [];
  if (standards.length > L.maxStandards || qc.length > L.maxQcCharts || rows.length > L.maxCmcRows) return fail('too_many');
  if (standards.some(x => (x.calibrations || []).length > L.maxCalibrations || (x.calibrations || []).some(c => (c.points || []).length > L.maxPoints))) return fail('too_many');
  if (qc.some(c => (c.points || []).length > L.maxQcPoints)) return fail('too_many');
  return {
    ok: true,
    standards: standards.map(cleanStandard).filter(x => x.id),
    cmc: doc.cmc ? { id: str(doc.cmc.id), kind: 'cmc', rows: rows.map(cleanCmcRow).filter(r => !cmcRowError(r)) } : null,
    qc: qc.map(cleanQcChart).filter(x => x.id),
    skippedCmcRows: rows.filter(r => cmcRowError(cleanCmcRow(r))).length,
  };
}

/* ── jadval importi ── */
/** Maqsad ustunlari (sarlavha nomlari uz / ru / en). `required` — usiz import qilinmaydi. */
export const STANDARD_COLUMNS = Object.freeze([
  { key: 'name', required: true, aliases: ['nomi', 'nom', 'наименование', 'название', 'etalon', 'эталон', 'standard', 'equipment'] },
  { key: 'type', aliases: ['turi', 'тип', 'tur'] },
  { key: 'serial', aliases: ['zavodraqami', 'zavod№', 'zavodno', 'заводскойномер', 'зав.№', 'serialno', 'serialnumber', 's/n'] },
  { key: 'unit', aliases: ['birlik', 'единица', 'ед.изм.', 'ед'] },
  { key: 'range_min', number: true, aliases: ['diapazonmin', 'min', 'диапазонmin', 'от'] },
  { key: 'range_max', number: true, aliases: ['diapazonmax', 'max', 'диапазонmax', 'до'] },
  { key: 'certificate', aliases: ['sertifikat', 'sertifikatraqami', 'sertifikat№', 'сертификат', 'номерсертификата', 'certificateno', 'certificatenumber'] },
  { key: 'calibrator', aliases: ['kalibrlovchitashkilot', 'tashkilot', 'калибровочнаялаборатория', 'организация', 'calibrationlaboratory', 'laboratory'] },
  { key: 'accreditation', aliases: ['akkreditatsiya', 'akkreditatsiyabelgisi', 'аккредитация', 'знакаккредитации', 'accreditationmark', 'accreditationno'] },
  { key: 'route', aliases: ["kuzatuvchanlikyo'li", 'yo\'l', 'маршрут', 'путьпрослеживаемости', 'traceabilityroute'] },
  { key: 'traceability', aliases: ['kuzatuvchanlik', 'прослеживаемость'] },
  { key: 'date', aliases: ['kalibrlashsanasi', 'sana', 'датакалибровки', 'дата', 'calibrationdate'] },
  { key: 'valid_until', aliases: ['amalqilishmuddati', 'muddat', 'действительнодо', 'срокдействия', 'validuntil', 'duedate', 'valid'] },
  { key: 'x', number: true, aliases: ['nuqta', 'точка', 'point', 'xj'] },
  { key: 'correction', number: true, aliases: ['tuzatma', 'поправка', 'c'] },
  { key: 'U', number: true, required: true, aliases: ['u', 'uj', 'kengaytirilgannoaniqlik', 'расширеннаянеопределенность', 'expandeduncertainty'] },
  { key: 'k', number: true, aliases: ['kj', 'coveragefactor'] },
  { key: 'nu', number: true, aliases: ['ν', 'v', 'dof', 'erkinlikdarajalari', 'степенисвободы'] },
]);

/** Sana katagi → 'YYYY-MM-DD' ('' — o'qib bo'lmadi). Qabul qilinadi: YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY. */
export function parseDateCell(v) {
  const s = str(v);
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

/**
 * Panjara (birinchi qator — sarlavha) → etalon kartochkalari.
 * @param {any[][]} grid      src/io/import.js dan (kataklar: son | satr | null)
 * @param {{mapping?:number[]}} [opts]  mapping — STANDARD_COLUMNS tartibida fayl ustuni indekslari (bo'lmasa sarlavhadan)
 * @returns {{ok:true, standards:object[], rows:number, bad:number, mapping:number[]}|{ok:false, reason, detail?}}
 *   `bad` — tashlab yuborilgan qatorlar (nom yoki U yo'q / son emas).
 */
export function standardsFromGrid(grid, opts = {}) {
  const g = (grid || []).filter(r => Array.isArray(r) && r.some(c => str(c) !== ''));
  if (!g.length || !isHeaderRow(g[0])) return fail('no_header');
  const mapping = opts.mapping || matchColumns(g[0], STANDARD_COLUMNS);
  const missing = STANDARD_COLUMNS.filter((c, i) => c.required && !(mapping[i] >= 0)).map(c => c.key);
  if (missing.length) return fail('no_header', missing.join(', '));
  const cell = (row, key) => { const i = mapping[STANDARD_COLUMNS.findIndex(c => c.key === key)]; return i >= 0 ? row[i] : null; };
  const numCell = (row, key) => { const v = cell(row, key); if (typeof v === 'number') return v; const n = parseNumber(v); return n === null || Number.isNaN(n) ? null : n; };
  const by = new Map();
  let rows = 0, bad = 0;
  for (const row of g.slice(1)) {
    const name = str(cell(row, 'name')), U = numCell(row, 'U');
    if (!name || !(U > 0)) { bad++; continue; }
    rows++;
    const serial = str(cell(row, 'serial'));
    const sk = name + '\u0000' + serial;
    if (!by.has(sk)) {
      by.set(sk, { name, type: str(cell(row, 'type')), serial, unit: str(cell(row, 'unit')), range: { min: numCell(row, 'range_min'), max: numCell(row, 'range_max') }, cals: new Map() });
    }
    const st = by.get(sk);
    const certificate = str(cell(row, 'certificate')), date = parseDateCell(cell(row, 'date'));
    const ck = certificate + '\u0000' + date;
    if (!st.cals.has(ck)) {
      const route = str(cell(row, 'route'));
      st.cals.set(ck, { certificate, date, validUntil: parseDateCell(cell(row, 'valid_until')), calibrator: str(cell(row, 'calibrator')), accreditation: str(cell(row, 'accreditation')),
        route: TRACEABILITY_ROUTES.includes(route) ? route : '', traceability: str(cell(row, 'traceability')), points: [] });
    }
    st.cals.get(ck).points.push({ x: numCell(row, 'x'), correction: numCell(row, 'correction'), U, k: numCell(row, 'k'), nu: numCell(row, 'nu') });
  }
  if (!rows) return fail('no_rows');
  if (by.size > REGISTRY_LIMITS.maxStandards) return fail('too_many');
  const standards = [...by.values()].map(s => cleanStandard({ id: '', name: s.name, type: s.type, serial: s.serial, unit: s.unit, range: s.range, calibrations: [...s.cals.values()] }));
  return { ok: true, standards, rows, bad, mapping };
}

/** Etalonlar → jadval qatorlari (CSV / xlsx eksporti; matn zararsizlantirilgan — formula inyeksiyasiga qarshi). */
export function standardsToRows(standards) {
  const head = STANDARD_COLUMNS.map(c => c.key);
  const txt = v => neutralize(str(v));
  const rows = [head];
  for (const s of (standards || []).map(cleanStandard)) {
    for (const c of s.calibrations) {
      for (const p of c.points) {
        rows.push([txt(s.name), txt(s.type), txt(s.serial), txt(s.unit), s.range.min, s.range.max, txt(c.certificate), txt(c.calibrator), txt(c.accreditation), c.route, txt(c.traceability),
          c.date, c.validUntil, p.x, p.correction, p.U, p.k, p.nu]);
      }
    }
  }
  return rows;
}
