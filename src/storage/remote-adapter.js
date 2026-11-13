/* ═══════════════════════════════════════════════════════════════
   REMOTE-ADAPTER.JS — StorageAdapter'ning REST skeleti (P04). Server P15 da
   (docs/PLAN.md: O'zbekistondagi server, src/engine ni aynan o'zi import qiladi).
   Hozir hech qanday tarmoq so'rovi yuborilmaydi: har bir usul 'remote_not_implemented'
   xatosini beradi. Rejalashtirilgan endpoint'lar (versiya v1):
     GET    /api/v1/{store}            → ro'yxat
     GET    /api/v1/{store}/{key}      → yozuv
     PUT    /api/v1/{store}/{key}      → yozish (server audit yozuvini o'zi qo'shadi)
     DELETE /api/v1/{store}/{key}      → o'chirish (audit bilan)
     GET    /api/v1/audit              → audit jurnali; GET /api/v1/audit/verify → zanjir tekshiruvi
     POST   /api/v1/evaluate           → mustaqil qayta hisob (P15)
   Shaxsiy ma'lumot yuborilmaydi (CLAUDE.md).
═══════════════════════════════════════════════════════════════ */
import { StorageAdapter } from './adapter.js';

export const REMOTE_ENDPOINTS = Object.freeze({
  list: 'GET /api/v1/{store}', get: 'GET /api/v1/{store}/{key}', save: 'PUT /api/v1/{store}/{key}',
  remove: 'DELETE /api/v1/{store}/{key}', audit: 'GET /api/v1/audit', verify: 'GET /api/v1/audit/verify',
  evaluate: 'POST /api/v1/evaluate',
});

export class RemoteAdapter extends StorageAdapter {
  /** @param {{baseUrl: string, fetch?: Function}} opts */
  constructor(opts = {}) {
    super();
    this.baseUrl = opts.baseUrl || '';
    this.fetch = opts.fetch || null;
  }
  _na() { return Promise.reject(new Error('remote_not_implemented')); }
  open() { return this._na(); }
  get() { return this._na(); }
  list() { return this._na(); }
  save() { return this._na(); }
  remove() { return this._na(); }
  appendAudit() { return this._na(); }
  listAudit() { return this._na(); }
  verifyAudit() { return this._na(); }
  rawPutAll() { return this._na(); }
  clearAll() { return this._na(); }
}
