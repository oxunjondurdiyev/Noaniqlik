/* ═══════════════════════════════════════════════════════════════
   AI.JS — AI yordamchi (P14) uchun saqlash qatlami: audit izi va ai.html bilan almashinuv ombori.
   AUDIT (docs/AI_DESIGN.md §7): har bir AI amali mavjud xesh zanjiriga (./audit.js) yoziladi —
     amal, funksiya, rejim (paste / api), model nomi (faqat api), prompt id + versiya, yuborilgan matnning
     SHA-256 xeshi (MATNNING O'ZI EMAS), javob xeshi, maydon, natija, rol (ism emas).
   YOZILMAYDI: API kaliti, prompt matni, javob matni, hujjat matni / rasmi, tasdiqlangan qiymatning o'zi.
   Shu sababli yozuv faqat qat'iy ro'yxatdagi maydonlardan yig'iladi va har biri shakl bo'yicha tekshiriladi —
   erkin matn uchun maydon yo'q.
   ALMASHINUV (egasi qarori S-7 b, 2026-11-20): "o'z kaliti" rejimi alohida ai.html sahifasida ishlaydi; so'rov va
   javob `ai_exchange` omboridagi vaqtinchalik yozuv orqali o'tadi (auditsiz xom yozish — matn auditga tushmasin;
   eksportga kirmaydi; olingach yoki muddati o'tgach o'chiriladi). KALIT bu yozuvda bo'lishi MUMKIN EMAS.
   ISO/IEC 42001 (unverified — hujjat repoda yo'q): audit va javobgarlik tamoyili.
═══════════════════════════════════════════════════════════════ */
import { cleanRole } from './acceptance.js';

export const AI_ENTITY = 'ai';
export const AI_ACTIONS = Object.freeze(['ai_prepare', 'ai_copy', 'ai_send', 'ai_response', 'ai_accept', 'ai_reject', 'ai_save', 'ai_enable', 'ai_disable']);
export const AI_MODES = Object.freeze(['paste', 'api']);
export const AI_EXCHANGE_STORE = 'ai_exchange';
/** Almashinuv yozuvining yashash muddati (1 soat) */
export const AI_EXCHANGE_TTL_MS = 3600000;

const HASH_RE = /^[0-9a-f]{64}$/;
const CODE_RE = /^[A-Za-z0-9_.:\[\]/@-]{1,96}$/;
const code = v => (typeof v === 'string' && CODE_RE.test(v) ? v : '');
const hash = v => (typeof v === 'string' && HASH_RE.test(v) ? v : '');
/* API kalitiga o'xshash matn auditga hech qaysi maydon orqali o'tmaydi */
const noKey = v => (/sk-ant-/i.test(v) ? '' : v);

/** AI ni yoqish / o'chirish huquqi: admin, superadmin va lokal guest (egasi qarori S-6 a); xodim — yo'q. */
export function canToggleAi(role) { return cleanRole(role) !== 'employee'; }

/**
 * AI amali → audit zanjiri. Faqat xeshlar va kodlar; matn yozilmaydi.
 * @param {{action:string, fn?:string, mode?:string, model?:string, promptId?:string, promptVersion?:string,
 *          payloadHash?:string, responseHash?:string, field?:string, outcome?:string, role?:string, at?:string}} ev
 */
export async function aiAudit(store, ev) {
  if (!ev || !AI_ACTIONS.includes(ev.action)) throw new Error('ai_audit_bad_action');
  const role = cleanRole(ev.role);
  const mode = AI_MODES.includes(ev.mode) ? ev.mode : '';
  const after = { fn: code(ev.fn), mode, promptId: code(ev.promptId), promptVersion: code(ev.promptVersion), payloadHash: hash(ev.payloadHash), responseHash: hash(ev.responseHash), role };
  if (mode === 'api') after.model = noKey(code(ev.model));               // nusxa-qo'y rejimida model noma'lum — yozilmaydi
  const field = noKey(code(ev.field)), outcome = noKey(code(ev.outcome));
  if (field) after.field = field;
  if (outcome) after.outcome = outcome;
  return store.appendAudit({ action: ev.action, entity: AI_ENTITY, entityId: after.fn || 'settings', actor: role, reason: '', at: ev.at, before: null, after });
}

/** AI audit yozuvlari (eskidan yangiga). */
export async function aiAuditTrail(store) {
  return (await store.listAudit()).filter(e => e.entity === AI_ENTITY);
}

/* ─── ai.html bilan almashinuv ─── */
const EXCHANGE_KEYS = ['id', 'fn', 'role', 'lang', 'mode', 'promptId', 'promptVersion', 'promptText', 'payloadHash', 'schemaId', 'attachment', 'createdAt', 'status', 'responseText', 'responseHash', 'model', 'errorCode'];

export function newExchangeId(now, rnd) {
  const t = (now === undefined ? Date.now() : now).toString(36);
  const r = Math.floor((rnd === undefined ? Math.random() : rnd) * 0xffffff).toString(36).padStart(4, '0');
  return `aix:${t}-${r}`;
}

/** Yozuvni saqlash (auditsiz). Noma'lum maydonlar tashlanadi; kalitga o'xshash matn bo'lsa — xato. */
export async function putExchange(store, rec) {
  if (!rec || typeof rec.id !== 'string' || !rec.id.startsWith('aix:')) throw new Error('ai_exchange_bad_id');
  const out = {};
  for (const k of EXCHANGE_KEYS) if (rec[k] !== undefined) out[k] = rec[k];
  out.role = cleanRole(out.role);
  if (/sk-ant-[A-Za-z0-9_-]{8,}/.test(JSON.stringify(out))) throw new Error('ai_exchange_key_forbidden');
  await store.rawPutAll(AI_EXCHANGE_STORE, [JSON.parse(JSON.stringify(out))]);
  return out;
}
export function getExchange(store, id) { return store.get(AI_EXCHANGE_STORE, id); }
export function removeExchange(store, id) { return store.rawRemove(AI_EXCHANGE_STORE, id); }

/** Muddati o'tgan yozuvlarni o'chirish. @returns {Promise<number>} o'chirilganlar soni */
export async function purgeExchange(store, nowMs, ttlMs = AI_EXCHANGE_TTL_MS) {
  let n = 0;
  for (const r of await store.list(AI_EXCHANGE_STORE)) {
    const at = Date.parse(r.createdAt || '');
    if (!Number.isFinite(at) || nowMs - at > ttlMs) { await store.rawRemove(AI_EXCHANGE_STORE, r.id); n++; }
  }
  return n;
}
