/* ═══════════════════════════════════════════════════════════════
   EXPORT.JS — barcha saqlangan ma'lumotni JSON'ga eksport va qayta import.
   Format 'uc-export/1': kanonik JSON (kalitlar tartiblangan, bo'shliqsiz) —
     { format, integrity, stores: { calculations:[…], templates:[…], settings:[…], registries:[…], meta:[…], audit:[…] } }
   integrity = SHA-256(kanonik stores). Vaqt belgisi tanaga kiritilmaydi (fayl nomida) —
   shuning uchun eksport → bo'sh bazaga import → eksport natijasi BIT DARAJASIDA bir xil.
   Import: format, yaxlitlik xeshi va audit zanjiri tekshiriladi; faqat 'replace' rejimi
   (ikki audit zanjirini birlashtirib bo'lmaydi). Standart holatda import ham audit jurnaliga
   yoziladi (ALCOA+) — u yozuv eski zanjirning davomi sifatida qo'shiladi.
═══════════════════════════════════════════════════════════════ */
import { canonicalize, sha256Hex } from './canonical.js';
import { STORES, keyOf } from './adapter.js';
import { verifyChain } from './audit.js';

export const EXPORT_FORMAT = 'uc-export/1';
const ORDER = ['calculations', 'templates', 'settings', 'registries', 'meta', 'audit'];

const keyStr = (store, r) => canonicalize(keyOf(store, r));

/** @returns {Promise<string>} kanonik JSON matni */
export async function exportAll(store) {
  const stores = {};
  for (const name of ORDER) {
    const list = await store.rawList(name);
    stores[name] = name === 'audit'
      ? [...list].sort((a, b) => a.seq - b.seq)
      : [...list].sort((a, b) => (keyStr(name, a) < keyStr(name, b) ? -1 : keyStr(name, a) > keyStr(name, b) ? 1 : 0));
  }
  const integrity = await sha256Hex(canonicalize(stores));
  return canonicalize({ format: EXPORT_FORMAT, integrity, stores });
}

/** Eksport matnini tekshirish (yozmasdan) */
export async function inspectExport(text) {
  let doc;
  try { doc = JSON.parse(text); } catch (_) { return { ok: false, reason: 'bad_json' }; }
  if (!doc || doc.format !== EXPORT_FORMAT || !doc.stores) return { ok: false, reason: 'bad_format' };
  for (const k of Object.keys(doc.stores)) if (!STORES[k]) return { ok: false, reason: 'unknown_store:' + k };
  if ((await sha256Hex(canonicalize(doc.stores))) !== doc.integrity) return { ok: false, reason: 'integrity' };
  const chain = await verifyChain(doc.stores.audit || []);
  if (!chain.ok) return { ok: false, reason: 'audit_chain', chain };
  const counts = Object.fromEntries(ORDER.map(k => [k, (doc.stores[k] || []).length]));
  return { ok: true, doc, counts };
}

/**
 * Import ('replace'): bazadagi hamma narsa eksportdagisi bilan almashtiriladi.
 * @param {{audit?: boolean, actor?: string, at?: string}} [opts]  audit: false — import qayd etilmaydi (faqat test/tiklash)
 */
export async function importAll(store, text, opts = {}) {
  const chk = await inspectExport(text);
  if (!chk.ok) return chk;
  await store.clearAll();
  for (const name of ORDER) {
    const recs = chk.doc.stores[name] || [];
    if (recs.length) await store.rawPutAll(name, recs);
  }
  if (opts.audit !== false) {
    await store.appendAudit({ action: 'import', entity: 'export', entityId: chk.doc.integrity, actor: opts.actor || '', reason: 'uc-export/1 import', at: opts.at, after: chk.counts });
  }
  return { ok: true, counts: chk.counts };
}
