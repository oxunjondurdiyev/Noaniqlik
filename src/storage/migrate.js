/* ═══════════════════════════════════════════════════════════════
   MIGRATE.JS — eski brauzer xotirasidagi (localStorage) `uc_state_v2` → IndexedDB.
   CLAUDE.md: eski ma'lumot migratsiya funksiyasi orqali yangi formatga o'tkaziladi va
   YO'QOLMAYDI. Shuning uchun:
     • asl kalit `uc_state_v2` O'CHIRILMAYDI (joriy UI sessiyasi hali undan foydalanadi);
     • xom matn `uc_state_v2_backup` kalitiga nusxalanadi (allaqachon bo'lsa — ustidan yozilmaydi);
     • IndexedDB `calculations` ga holat yoziladi (eski `combined`, `points[].result` ham saqlanadi — hisobot
       ularni qayta yaxlitlaydi, ENGINE_API.md §5); yagona qo'shimcha — model turi (P05a, RISKS R-07):
       `settings.modelKind` yo'q bo'lsa 'unknown' yoziladi (upgradeCalcState). Foydalanuvchi kiritgan hech bir
       qiymat o'zgarmaydi; asl matn `…_backup` da va xeshi `sourceHash` da;
     • JSON buzilgan bo'lsa ham xom matn saqlanadi (format: 'raw');
     • `meta` da migratsiya belgisi va xom matn xeshi; audit yozuvi 'migrate'.
   Takroriy chaqiruv xavfsiz (idempotent): belgi bor bo'lsa — 'already'.
═══════════════════════════════════════════════════════════════ */
import { sha256Hex } from './canonical.js';

export const LEGACY_KEY = 'uc_state_v2';
export const BACKUP_KEY = 'uc_state_v2_backup';
export const MIGRATION_KEY = 'migration:uc_state_v2';
export const LEGACY_CALC_ID = 'legacy-uc_state_v2';

/** calc-state/v2 holat sxemasi: 2 — settings.modelKind majburiy (P05a);
    3 — B tur manbasi reestrga bog'lanishi mumkin (typeB[].registry, typeB[].drift; settings.cmcRow, cmcX, measurementDate) — P11.
    3 ga o'tishda ESKI HISOBLARGA HECH NARSA QO'SHILMAYDI: qo'lda kiritilgan B tur manbalari o'zgarishsiz qoladi
    (reestrga bog'lanmagan — `registry` maydoni yo'q). */
export const CALC_STATE_SCHEMA = 3;
export const SCHEMA_KEY = 'schema';

/**
 * Eski saqlangan hisob holatini joriy sxemaga keltirish (sof funksiya, kirishni o'zgartirmaydi).
 * P05a (RISKS R-07): model turi ko'rsatilmagan eski hisoblar 'unknown' oladi — dastur |y| ni xato deb
 * FARAZ QILMAYDI; muvofiqlik bayonoti uchun foydalanuvchidan tanlov so'raladi ('error' yoki 'value').
 * Saqlangan nuqtalar (points[].snapshot) ham shu tarzda. Boshqa hech narsa o'zgarmaydi.
 * @returns {{state:object, changed:boolean}}
 */
export function upgradeCalcState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return { state, changed: false };
  let changed = false;
  const fix = st => {
    const settings = st.settings && typeof st.settings === 'object' ? st.settings : {};
    if (['error', 'value', 'unknown'].includes(settings.modelKind)) return st;
    changed = true;
    return { ...st, settings: { ...settings, modelKind: 'unknown' } };
  };
  let out = fix(state);
  if (Array.isArray(out.points)) {
    const pts = out.points.map(p => (p && p.snapshot && typeof p.snapshot === 'object' ? { ...p, snapshot: fix(p.snapshot) } : p));
    if (changed) out = { ...out, points: pts };
  }
  return { state: changed ? out : state, changed };
}

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
    ? { id: LEGACY_CALC_ID, format: 'calc-state/v2', source: 'localStorage:' + LEGACY_KEY, sourceHash: hash, createdAt: at, updatedAt: at, schema: CALC_STATE_SCHEMA, state: upgradeCalcState(state).state }
    : { id: LEGACY_CALC_ID, format: 'raw', source: 'localStorage:' + LEGACY_KEY, sourceHash: hash, createdAt: at, updatedAt: at, raw };

  await store.save('calculations', rec, { action: 'migrate', actor: opts.actor || 'system', reason: 'uc_state_v2 → IndexedDB (P04)', at });
  await store.save('meta', { key: MIGRATION_KEY, at, hash, calcId: LEGACY_CALC_ID, backupKey: BACKUP_KEY, valid: !!valid },
    { action: 'migrate', actor: opts.actor || 'system', reason: 'migration mark', at });
  return { status: valid ? 'migrated' : 'invalid', id: LEGACY_CALC_ID, hash };
}

/**
 * Saqlangan hisoblarni joriy sxemaga o'tkazish (P11: 2 → 3). Idempotent.
 * Har bir `calc-state/v2` yozuvi upgradeCalcState() dan o'tadi (model turi — P05a) va `schema` raqami yangilanadi;
 * typeB (qo'lda kiritilgan manbalar), o'lchashlar va boshqa kiritilgan qiymatlar O'ZGARMAYDI. 'raw' yozuvlar tegilmaydi.
 * Har bir o'zgartirilgan yozuv audit zanjiriga 'migrate' amali bilan tushadi (oldingi qiymat `before` da).
 * @returns {Promise<{status:'migrated'|'already', from:number|null, to:number, changed:number}>}
 */
export async function migrateSchema(store, opts = {}) {
  const mark = await store.get('meta', SCHEMA_KEY);
  const from = mark && Number.isInteger(mark.calcState) ? mark.calcState : null;
  if (from !== null && from >= CALC_STATE_SCHEMA) return { status: 'already', from, to: CALC_STATE_SCHEMA, changed: 0 };
  const at = opts.at || new Date().toISOString();
  let changed = 0;
  for (const rec of await store.list('calculations')) {
    if (!rec || rec.format !== 'calc-state/v2' || !rec.state || rec.schema >= CALC_STATE_SCHEMA) continue;
    const up = upgradeCalcState(rec.state);
    await store.save('calculations', { ...rec, state: up.state, schema: CALC_STATE_SCHEMA },
      { action: 'migrate', actor: opts.actor || 'system', reason: `calc-state schema ${rec.schema || 1} → ${CALC_STATE_SCHEMA} (P11)`, at });
    changed++;
  }
  await store.save('meta', { key: SCHEMA_KEY, calcState: CALC_STATE_SCHEMA, registry: 1, at },
    { action: 'migrate', actor: opts.actor || 'system', reason: 'schema mark', at });
  return { status: 'migrated', from, to: CALC_STATE_SCHEMA, changed };
}
