/* ═══════════════════════════════════════════════════════════════
   QUALITY.JS — malaka sinovlari (PT) seriyalari va usul validatsiyasi to'plamlari (P12).
   `pt` va `validation` omborlarida ('id' kaliti) lokal saqlanadi (IndexedDB v2); Firebase'ga YOZILMAYDI.
   P11 reestri namunasida: har bir yaratish / tahrirlash / o'chirish audit zanjiriga (./audit.js) ROL bilan, oldingi va yangi
   qiymat bilan tushadi; `version` har saqlashda + 1; `savedBy` — oxirgi saqlagan rol ('guest' — autentifikatsiyasiz:
   hisobotda info topilma).
   Rollar (lokal rejimda ogohlantirish darajasida; haqiqiy cheklov — server bilan, P15):
     • PT natijasi va validatsiya ma'lumotini `employee` ham kiritadi;
     • chetga chiquvchini CHIQARISH (izoh ≥ 10 belgi, audit amali 'outlier_exclude') va top-down shablon qoralamasini
       yaratish — faqat `admin` (va lokal `guest`); `employee` — yo'q.
   Shaxsiy ma'lumot yo'q: PT provayderi — faqat tashkilot nomi; ijrochi F.I.Sh. maydoni YO'Q — `cleanPtSeries` /
   `cleanValidationSet` noma'lum maydonlarni tashlaydi.
═══════════════════════════════════════════════════════════════ */
import { cleanRole } from './acceptance.js';

export const PT_STORE = 'pt';
export const VALIDATION_STORE = 'validation';
export const QUALITY_SCHEMA = 1;
export const QUALITY_RECORD_FORMAT = Object.freeze({ pt: 'uc-pt-series/1', validation: 'uc-validation-set/1' });
export const EXCLUDE_ACTION = 'outlier_exclude';
export const INCLUDE_ACTION = 'outlier_include';
export const MIN_EXCLUDE_COMMENT = 10;
const STORE_OF = { pt: PT_STORE, validation: VALIDATION_STORE };
const PREFIX = { pt: 'pt:', validation: 'val:' };

/** Amal → ruxsat. 'enter' — natija / ma'lumot kiritish; 'exclude' — chetga chiquvchini chiqarish; 'draft' — shablon qoralamasi. */
export function canQuality(action, role) {
  const r = cleanRole(role);
  if (action === 'enter') return true;
  return r !== 'employee';
}

export function newQualityId(kind, now, rnd) {
  const t = (now === undefined ? Date.now() : now).toString(36);
  const r = Math.floor((rnd === undefined ? Math.random() : rnd) * 0xffffff).toString(36).padStart(4, '0');
  return `${PREFIX[kind] || 'q:'}${t}-${r}`;
}

const str = v => (v === undefined || v === null ? '' : String(v).slice(0, 500));
const val = v => (v === undefined || v === null || v === '' ? '' : (typeof v === 'number' ? v : String(v).slice(0, 64)));
const ROUND_FIELDS = ['id', 'date', 'scheme', 'x', 'xpt', 'sigmaPt', 'ux', 'uxpt', 'Ux', 'Uxpt', 'primary', 'note'];

/** PT seriyasi: { id, kind:'pt', name, quantity, method, matrix, unit, provider (TASHKILOT), rounds[] } — boshqa maydon tashlanadi. */
export function cleanPtSeries(s) {
  const o = s || {};
  return {
    id: str(o.id), kind: 'pt', name: str(o.name), quantity: str(o.quantity), method: str(o.method), matrix: str(o.matrix), unit: str(o.unit),
    provider: str(o.provider), templateId: str(o.templateId),
    rounds: (Array.isArray(o.rounds) ? o.rounds : []).slice(0, 1000).map(r => Object.fromEntries(ROUND_FIELDS.map(k => [k, ['id', 'date', 'scheme', 'primary', 'note'].includes(k) ? str((r || {})[k]) : val((r || {})[k])]))),
  };
}

const TEST_FIELDS = ['id', 'type', 'label', 'alpha', 'side', 'tail', 'equalVariance', 'values', 'groups', 'a', 'b', 'points', 'method', 'replicates', 'blankCorrection', 'blankReplicates', 'kQ', 'correction', 'relativeUnit', 'excluded', 'degree'];
const cleanExclusion = e => ({ index: Number.isInteger(e && e.index) ? e.index : -1, comment: str(e && e.comment), role: cleanRole(e && e.role), at: str(e && e.at) });
/** Validatsiya to'plami: { id, kind:'validation', name, method, quantity, matrix, unit, tests[] }. Testlar JSON nusxasi. */
export function cleanValidationSet(s) {
  const o = s || {};
  const tests = (Array.isArray(o.tests) ? o.tests : []).slice(0, 100).map(t => {
    const x = {};
    for (const k of TEST_FIELDS) if (t && t[k] !== undefined) x[k] = k === 'excluded' ? (t[k] || []).map(cleanExclusion) : JSON.parse(JSON.stringify(t[k]));
    return x;
  });
  return { id: str(o.id), kind: 'validation', name: str(o.name), method: str(o.method), quantity: str(o.quantity), matrix: str(o.matrix), unit: str(o.unit), tests };
}

const clean = (kind, rec) => (kind === 'pt' ? cleanPtSeries(rec) : cleanValidationSet(rec));
function storeOf(kind) { const s = STORE_OF[kind]; if (!s) throw new Error('quality_bad_kind'); return s; }

export async function listQuality(store, kind) {
  return (await store.list(storeOf(kind))).sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)) || (a.id < b.id ? -1 : 1));
}
export function getQuality(store, kind, id) { return store.get(storeOf(kind), id); }

/**
 * Saqlash — audit bilan, versiya + 1. Chiqarishlar (`excluded`) faqat excludeValue orqali o'zgaradi: oddiy saqlash
 * oldingi yozuvdagi chiqarishlarni saqlab qoladi (xodim ularni o'chira olmaydi).
 */
export async function saveQuality(store, kind, rec, ctx = {}) {
  const name = storeOf(kind);
  if (!canQuality('enter', ctx.role)) throw new Error('quality_forbidden');
  const c = clean(kind, rec);
  if (!c.id) throw new Error('quality_id_required');
  const prev = await store.get(name, c.id);
  if (kind === 'validation' && !ctx._exclusion) {
    const prevEx = new Map(((prev && prev.tests) || []).map(t => [t.id, t.excluded || []]));
    c.tests = c.tests.map(t => ({ ...t, excluded: prevEx.get(t.id) || [] }));
  }
  const at = ctx.at || new Date().toISOString();
  const out = { ...c, format: QUALITY_RECORD_FORMAT[kind], schema: QUALITY_SCHEMA, version: ((prev && prev.version) || 0) + 1, updatedAt: at, savedBy: cleanRole(ctx.role) };
  return store.save(name, out, { actor: cleanRole(ctx.role), reason: ctx.reason || `${kind}_${prev ? 'edit' : 'create'}`, at, action: ctx.action });
}

export async function removeQuality(store, kind, id, ctx = {}) {
  const name = storeOf(kind);
  const prev = await store.get(name, id);
  if (!prev) return false;
  if (!canQuality('exclude', ctx.role)) throw new Error('quality_forbidden');   // o'chirish — xodim emas (asl qiymat auditda qoladi)
  return store.remove(name, id, { actor: cleanRole(ctx.role), reason: ctx.reason || `${kind}_delete`, at: ctx.at });
}

/**
 * Chetga chiquvchini chiqarish / qaytarish — foydalanuvchi qarori, izoh MAJBURIY (≥ 10 belgi), faqat admin (guest — lokal).
 * Audit amali 'outlier_exclude' / 'outlier_include', sabab — izoh. Qiymat o'chirilmaydi: test.excluded ga yoziladi.
 */
export async function excludeValue(store, setId, testId, index, comment, ctx = {}) {
  if (!canQuality('exclude', ctx.role)) throw new Error('quality_forbidden');
  const text = typeof comment === 'string' ? comment.trim() : '';
  if (text.length < MIN_EXCLUDE_COMMENT) throw new Error('exclude_comment_short');
  const prev = await store.get(VALIDATION_STORE, setId);
  if (!prev) throw new Error('quality_not_found');
  const at = ctx.at || new Date().toISOString();
  const include = ctx.include === true;
  const tests = prev.tests.map(t => {
    if (t.id !== testId) return t;
    const ex = (t.excluded || []).filter(e => e.index !== index);
    return { ...t, excluded: include ? ex : [...ex, { index, comment: text, role: cleanRole(ctx.role), at }] };
  });
  if (!prev.tests.some(t => t.id === testId)) throw new Error('quality_not_found');
  return saveQuality(store, 'validation', { ...prev, tests }, { ...ctx, at, _exclusion: true, action: include ? INCLUDE_ACTION : EXCLUDE_ACTION, reason: text });
}

export async function qualityHistory(store, kind, id) {
  const name = storeOf(kind);
  return (await store.listAudit()).filter(e => e.entity === name && e.entityId === id);
}
