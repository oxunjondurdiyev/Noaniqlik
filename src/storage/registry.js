/* ═══════════════════════════════════════════════════════════════
   REGISTRY.JS — laboratoriya reestrlari (P11): etalonlar va uskunalar, CMC jadvali, QC kartalari.
   `registries` omborida ('id' kaliti) lokal saqlanadi (IndexedDB); Firebase'ga YOZILMAYDI.
   Har bir yaratish / tahrirlash / o'chirish audit zanjiriga tushadi (./audit.js): kim (ROL — ism emas), qachon,
   oldingi va yangi qiymat (LocalAdapter.save — bitta tranzaksiyada).
   Yozuv: { id, format: 'uc-registry/1', schema, kind: 'standard' | 'cmc' | 'qc', version, updatedAt, … }.
   `version` har bir saqlashda 1 ga oshadi — hisob reestr yozuvining ID va versiyasini saqlaydi.
   Rol: etalonlar va CMC ni faqat laboratoriya admini tahrirlaydi; xodim — faqat o'qiydi; QC kartasiga xodim ham
   natija qo'shadi. Lokal rejimda bu himoya OGOHLANTIRISH darajasida (foydalanuvchi o'z brauzerini to'liq boshqaradi);
   haqiqiy cheklov server bilan (P15). Tizimga kirmagan foydalanuvchi ('guest' — yakka lokal rejim) tahrirlay oladi,
   rol audit izida 'guest' bo'lib qoladi.
   Shaxsiy ma'lumot yozilmaydi: yozuvni tozalash (noma'lum maydonlarni tashlash) — chaqiruvchida
   (src/engine/lab: cleanStandard, cleanCmcRow), bu qatlam dvigatelga bog'liq emas.
═══════════════════════════════════════════════════════════════ */
import { cleanRole } from './acceptance.js';

export const REGISTRY_STORE = 'registries';
export const REGISTRY_RECORD_FORMAT = 'uc-registry/1';
export const REGISTRY_SCHEMA = 1;
export const REGISTRY_RECORD_KINDS = Object.freeze(['standard', 'cmc', 'qc']);
/** Yagona CMC jadvali yozuvi */
export const CMC_TABLE_ID = 'cmc:table';
const PREFIX = { standard: 'std:', cmc: 'cmc:', qc: 'qc:' };

/** Tahrirlash huquqi (lokal rejimda — ogohlantirish darajasida). */
export function canEditRegistry(kind, role) {
  const r = cleanRole(role);
  if (kind === 'qc') return true;
  return r !== 'employee';
}

/** Yangi yozuv identifikatori: '<prefiks><vaqt>-<tasodifiy>' (shaxsiy ma'lumot yo'q). */
export function newRegistryId(kind, now, rnd) {
  const t = (now === undefined ? Date.now() : now).toString(36);
  const r = Math.floor((rnd === undefined ? Math.random() : rnd) * 0xffffff).toString(36).padStart(4, '0');
  return `${PREFIX[kind] || 'reg:'}${t}-${r}`;
}

export async function listRegistry(store, kind) {
  const all = await store.list(REGISTRY_STORE);
  return (kind ? all.filter(r => r && r.kind === kind) : all).sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)) || (a.id < b.id ? -1 : 1));
}

export function getRegistry(store, id) { return store.get(REGISTRY_STORE, id); }

/**
 * Saqlash (yaratish yoki tahrirlash) — audit bilan. Versiya oshadi.
 * @param {{role?:string, reason?:string, at?:string, action?:string}} [ctx]
 */
export async function saveRegistry(store, rec, ctx = {}) {
  if (!rec || !REGISTRY_RECORD_KINDS.includes(rec.kind)) throw new Error('registry_bad_kind');
  if (!rec.id || typeof rec.id !== 'string') throw new Error('registry_id_required');
  if (!canEditRegistry(rec.kind, ctx.role)) throw new Error('registry_forbidden');
  const prev = await store.get(REGISTRY_STORE, rec.id);
  if (prev && prev.kind !== rec.kind) throw new Error('registry_bad_kind');
  const at = ctx.at || new Date().toISOString();
  const out = { ...rec, format: REGISTRY_RECORD_FORMAT, schema: REGISTRY_SCHEMA, version: ((prev && prev.version) || 0) + 1, updatedAt: at };
  return store.save(REGISTRY_STORE, out, { actor: cleanRole(ctx.role), reason: ctx.reason || `registry_${rec.kind}`, at, action: ctx.action });
}

/** O'chirish — audit bilan (asl qiymat audit `before` da qoladi). */
export async function removeRegistry(store, id, ctx = {}) {
  const prev = await store.get(REGISTRY_STORE, id);
  if (!prev) return false;
  if (!canEditRegistry(prev.kind, ctx.role)) throw new Error('registry_forbidden');
  return store.remove(REGISTRY_STORE, id, { actor: cleanRole(ctx.role), reason: ctx.reason || `registry_${prev.kind}_delete`, at: ctx.at });
}

/** Reestr yozuvining audit tarixi (yaratish, tahrirlash, o'chirish) — eskidan yangiga. */
export async function registryHistory(store, id) {
  return (await store.listAudit()).filter(e => e.entity === REGISTRY_STORE && e.entityId === id);
}

/**
 * Bir nechta yozuvni import qilish (uc-registry/1 hujjati yoki jadval importidan). Har biri alohida audit yozuvi bilan.
 * Mavjud ID — yangi versiya sifatida yoziladi (eski qiymat auditda qoladi).
 * @returns {Promise<{saved:number}>}
 */
export async function importRegistry(store, records, ctx = {}) {
  let saved = 0;
  for (const r of records || []) { await saveRegistry(store, r, { ...ctx, reason: ctx.reason || 'registry_import' }); saved++; }
  return { saved };
}
