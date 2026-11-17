/* ═══════════════════════════════════════════════════════════════
   MIGRATE.JS — eski brauzer xotirasidagi (localStorage) `uc_state_v2` → IndexedDB.
   CLAUDE.md: eski ma'lumot migratsiya funksiyasi orqali yangi formatga o'tkaziladi va
   YO'QOLMAYDI. Shuning uchun:
     • asl kalit `uc_state_v2` O'CHIRILMAYDI (joriy UI sessiyasi hali undan foydalanadi);
     • xom matn `uc_state_v2_backup` kalitiga nusxalanadi (allaqachon bo'lsa — ustidan yozilmaydi);
     • IndexedDB `calculations` ga holat o'zgarishsiz yoziladi (eski `combined`, `points[].result`
       ham saqlanadi — hisobot ularni qayta yaxlitlaydi, ENGINE_API.md §5);
     • JSON buzilgan bo'lsa ham xom matn saqlanadi (format: 'raw');
     • `meta` da migratsiya belgisi va xom matn xeshi; audit yozuvi 'migrate'.
   Takroriy chaqiruv xavfsiz (idempotent): belgi bor bo'lsa — 'already'.
═══════════════════════════════════════════════════════════════ */
import { sha256Hex } from './canonical.js';

export const LEGACY_KEY = 'uc_state_v2';
export const BACKUP_KEY = 'uc_state_v2_backup';
export const MIGRATION_KEY = 'migration:uc_state_v2';
export const LEGACY_CALC_ID = 'legacy-uc_state_v2';

/**
 * @param {{getItem(k:string):string|null, setItem(k:string, v:string):void}} ls  localStorage (yoki o'xshash)
 * @param {import('./adapter.js').StorageAdapter} store
 * @param {{at?: string, actor?: string}} [opts]
 * @returns {Promise<{status:'migrated'|'already'|'empty'|'invalid', id?:string, hash?:string}>}
 */
export async function migrateLegacy(ls, store, opts = {}) {
  const mark = await store.get('meta', MIGRATION_KEY);
  if (mark) return { status: 'already', id: mark.calcId, hash: mark.hash };
  const raw = ls.getItem(LEGACY_KEY);
  if (raw === null || raw === undefined || raw === '') return { status: 'empty' };

  const at = opts.at || new Date().toISOString();
  if (ls.getItem(BACKUP_KEY) === null) ls.setItem(BACKUP_KEY, raw);
  const hash = await sha256Hex(raw);

  let state = null;
  try { state = JSON.parse(raw); } catch (_) { state = null; }
  const valid = state && typeof state === 'object' && !Array.isArray(state);
  const rec = valid
    ? { id: LEGACY_CALC_ID, format: 'calc-state/v2', source: 'localStorage:' + LEGACY_KEY, sourceHash: hash, createdAt: at, updatedAt: at, state }
    : { id: LEGACY_CALC_ID, format: 'raw', source: 'localStorage:' + LEGACY_KEY, sourceHash: hash, createdAt: at, updatedAt: at, raw };

  await store.save('calculations', rec, { action: 'migrate', actor: opts.actor || 'system', reason: 'uc_state_v2 → IndexedDB (P04)', at });
  await store.save('meta', { key: MIGRATION_KEY, at, hash, calcId: LEGACY_CALC_ID, backupKey: BACKUP_KEY, valid: !!valid },
    { action: 'migrate', actor: opts.actor || 'system', reason: 'migration mark', at });
  return { status: valid ? 'migrated' : 'invalid', id: LEGACY_CALC_ID, hash };
}
