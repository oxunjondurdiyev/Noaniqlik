/* ═══════════════════════════════════════════════════════════════
   ADAPTER.JS — StorageAdapter interfeysi (P04; docs/prompts P11 §1).
   Ma'lumot turlari (store): hisoblar, shablonlar, sozlamalar, reestrlar (P11), audit, meta.
   Amalga oshirishlar: LocalAdapter (IndexedDB, ./local-adapter.js), RemoteAdapter
   (REST skeleti, ./remote-adapter.js — server P15 da).
   Barcha usullar Promise qaytaradi. Yozish usullari (save/remove) audit yozuvini o'zi qo'shadi.
   Shaxsiy ma'lumot (F.I.Sh., telefon, email, STIR) bu qatlamga yozilmaydi (CLAUDE.md):
   audit `actor` maydoni — login yoki rol, ism emas.
═══════════════════════════════════════════════════════════════ */

/** Store nomi → kalit (keyPath) */
export const STORES = Object.freeze({
  calculations: 'id',            // { id, format: 'calc-state/v2', state, result?, templateRef?, createdAt, updatedAt }
  templates: ['id', 'version'],  // uc-template/1 (har bir versiya alohida yozuv)
  settings: 'key',               // { key: 'lab', value: {P, kMethod, nuRule, rounding, decisionRule, secondOrder, cmcMode} }
  registries: 'id',              // etalonlar reestri va h.k. (P11)
  audit: 'seq',                  // append-only (./audit.js)
  meta: 'key',                   // migratsiyalar holati va h.k.
});
export const DATA_STORES = ['calculations', 'templates', 'settings', 'registries', 'meta'];

/** Yozuv kaliti (compound kalit — massiv) */
export function keyOf(store, obj) {
  const kp = STORES[store];
  if (!kp) throw new Error('unknown_store:' + store);
  return Array.isArray(kp) ? kp.map(k => obj[k]) : obj[kp];
}

export class StorageAdapter {
  /** @returns {Promise<this>} */
  async open() { throw new Error('not_implemented'); }
  async close() {}
  /** @returns {Promise<object|undefined>} */
  async get(store, key) { throw new Error('not_implemented'); }
  /** @returns {Promise<object[]>} kalit bo'yicha tartiblangan */
  async list(store) { throw new Error('not_implemented'); }
  /** Yozish + audit ('create' | 'update'). ctx: { actor, reason, action? } */
  async save(store, obj, ctx = {}) { throw new Error('not_implemented'); }
  /** O'chirish + audit ('delete'; asl qiymat audit `before` da saqlanadi) */
  async remove(store, key, ctx = {}) { throw new Error('not_implemented'); }
  /** Audit yozuvini qo'shish (faqat qo'shish) */
  async appendAudit(ev) { throw new Error('not_implemented'); }
  async listAudit() { throw new Error('not_implemented'); }
  /** @returns {Promise<{ok, count, brokenAt, reason}>} */
  async verifyAudit() { throw new Error('not_implemented'); }
  /** Eksport/import uchun xom yozuvlar (audit qo'shilmaydi) */
  async rawList(store) { return this.list(store); }
  async rawPutAll(store, records) { throw new Error('not_implemented'); }
  async clearAll() { throw new Error('not_implemented'); }
}
