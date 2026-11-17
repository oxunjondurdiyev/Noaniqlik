/* ═══════════════════════════════════════════════════════════════
   LOCAL-ADAPTER.JS — StorageAdapter'ning IndexedDB amalga oshirilishi.
   Ma'lumot va unga tegishli audit yozuvi BITTA tranzaksiyada yoziladi (biri yozilib,
   ikkinchisi yozilmay qolmaydi). Audit `add` bilan qo'shiladi: boshqa oyna bir vaqtda
   yozgan bo'lsa (seq band), tranzaksiya bekor bo'ladi va bir marta qayta uriniladi.
   indexedDB obyekti tashqaridan beriladi (brauzer: globalThis.indexedDB; test: fake-indexeddb).
═══════════════════════════════════════════════════════════════ */
import { StorageAdapter, STORES, keyOf } from './adapter.js';
import { makeEntry, verifyChain } from './audit.js';

export const DB_NAME = 'uncertaintycalc';
export const DB_VERSION = 1;

const req = r => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const done = tx => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error || new Error('transaction_aborted'));
});
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export class LocalAdapter extends StorageAdapter {
  /** @param {{indexedDB?: IDBFactory, name?: string}} [opts] */
  constructor(opts = {}) {
    super();
    this.idb = opts.indexedDB || globalThis.indexedDB;
    this.name = opts.name || DB_NAME;
    this.db = null;
  }

  async open() {
    if (this.db) return this;
    if (!this.idb) throw new Error('indexeddb_unavailable');
    const r = this.idb.open(this.name, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const [name, keyPath] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
      }
    };
    this.db = await req(r);
    return this;
  }

  async close() { if (this.db) { this.db.close(); this.db = null; } }

  _store(name, mode = 'readonly') {
    if (!STORES[name]) throw new Error('unknown_store:' + name);
    const tx = this.db.transaction([name], mode);
    return { tx, os: tx.objectStore(name) };
  }

  async get(store, key) {
    const { os } = this._store(store);
    return req(os.get(key));
  }

  async list(store) {
    const { os } = this._store(store);
    return req(os.getAll());
  }

  async _lastAudit() {
    const { os } = this._store('audit');
    const cur = await req(os.openCursor(null, 'prev'));
    return cur ? cur.value : null;
  }

  /** Ma'lumot amali + audit yozuvi bitta tranzaksiyada */
  async _withAudit(store, op, ev) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const entry = await makeEntry(await this._lastAudit(), ev);
      const names = store ? [store, 'audit'] : ['audit'];
      const tx = this.db.transaction(names, 'readwrite');
      if (store) op(tx.objectStore(store));
      tx.objectStore('audit').add(entry);
      try { await done(tx); return entry; }
      catch (e) { if (attempt === 1 || !(e && e.name === 'ConstraintError')) throw e; }
    }
    return null;
  }

  async save(store, obj, ctx = {}) {
    if (store === 'audit') throw new Error('audit_append_only');
    const rec = clone(obj);
    const key = keyOf(store, rec);
    const before = await this.get(store, key);
    await this._withAudit(store, os => os.put(rec), {
      action: ctx.action || (before ? 'update' : 'create'), entity: store, entityId: key,
      before: before === undefined ? null : before, after: rec, actor: ctx.actor, reason: ctx.reason, at: ctx.at,
    });
    return rec;
  }

  async remove(store, key, ctx = {}) {
    if (store === 'audit') throw new Error('audit_append_only');
    const before = await this.get(store, key);
    if (before === undefined) return false;
    await this._withAudit(store, os => os.delete(key), {
      action: 'delete', entity: store, entityId: key, before, after: null, actor: ctx.actor, reason: ctx.reason, at: ctx.at,
    });
    return true;
  }

  async appendAudit(ev) { return this._withAudit(null, null, ev); }
  async listAudit() { return this.list('audit'); }
  async verifyAudit() { return verifyChain(await this.listAudit()); }

  async rawPutAll(store, records) {
    const { tx, os } = this._store(store, 'readwrite');
    for (const r of records) os.put(r);
    await done(tx);
  }

  async clearAll() {
    const names = Object.keys(STORES);
    const tx = this.db.transaction(names, 'readwrite');
    names.forEach(n => tx.objectStore(n).clear());
    await done(tx);
  }

  /** Faqat test uchun: audit yozuvini qo'lda o'zgartirish (buzishni aniqlash testlari) */
  async _tamperAudit(seq, patch) {
    const { tx, os } = this._store('audit', 'readwrite');
    const e = await req(os.get(seq));
    os.put({ ...e, ...patch });
    await done(tx);
  }
}
