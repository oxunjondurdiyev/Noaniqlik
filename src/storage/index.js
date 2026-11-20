/* ═══════════════════════════════════════════════════════════════
   src/storage — saqlash qatlami (P04). UI → storage; dvigatel bu qatlamga bog'liq emas.
   Laboratoriya sozlamalari va shablon versiyalari uchun yordamchilar ham shu yerda.
═══════════════════════════════════════════════════════════════ */
export { StorageAdapter, STORES, DATA_STORES, keyOf } from './adapter.js';
export { LocalAdapter, DB_NAME, DB_VERSION } from './local-adapter.js';
export { RemoteAdapter, REMOTE_ENDPOINTS } from './remote-adapter.js';
export { makeEntry, verifyChain, GENESIS } from './audit.js';
export { canonicalize, sha256Hex, hashOf, canonicalizeJcs, jcsHash, portable, fromPortable } from './canonical.js';
export { migrateLegacy, migrateSchema, upgradeCalcState, CALC_STATE_SCHEMA, SCHEMA_KEY, LEGACY_KEY, BACKUP_KEY, MIGRATION_KEY, LEGACY_CALC_ID } from './migrate.js';
export { acceptFinding, revokeAcceptance, acceptancesFromAudit, cleanRole, ACCEPT_ACTION, REVOKE_ACTION, ACCEPT_ENTITY, MIN_COMMENT, ACCEPTABLE_SEVERITIES } from './acceptance.js';
export { exportAll, importAll, inspectExport, EXPORT_FORMAT } from './export.js';
export {
  REGISTRY_STORE, REGISTRY_RECORD_FORMAT, REGISTRY_SCHEMA, REGISTRY_RECORD_KINDS, CMC_TABLE_ID,
  canEditRegistry, newRegistryId, listRegistry, getRegistry, saveRegistry, removeRegistry, registryHistory, importRegistry,
} from './registry.js';

/**
 * Laboratoriya standart sozlamalari (org settings). Hisob boshlanganda (shablon yuklanganda) qo'llanadi;
 * shablon va foydalanuvchi sozlamalari ularning ustidan yoziladi (src/templates/interpreter.js buildState).
 *   P            — qamrov ehtimoli
 *   kMethod      — 'nu' (t_P(ν_eff)) | 'k2' (qat'iy k = 2, EA-4/02 §5)
 *   nuRule       — 'floor' (standart, egasi qarori) | 'interpolate' | 'exact'   (GUM G.4.1 Note 1)
 *   rounding     — 'normal' | 'up' (U ni yuqoriga, ILAC P14 §5 — hisobot qatlami)
 *   decisionRule — 'simple' | 'guarded' (muvofiqlik bayonoti; JCGM 106 / ILAC G8 — P05 da to'liq)
 *   secondOrder  — 2-tartibli hadlarni u_c ga qo'shish (GUM 5.1.2 Note; standartda o'chiq)
 *   cmcMode      — 'warn' (U < CMC → ogohlantirish) | 'block' (hisobot bloklanadi)
 *   ciMethod     — sifatli testlar ishonch intervali: 'wilson' (standart, AQA:2021) | 'clopper_pearson' (P10, R-21)
 *   criticalMode — U = 0, u_c = 0 yoki U < CMC bo'lgan natija: 'mark' (standart — hisobot aniq belgi bilan chiqadi) |
 *                  'block' (hisobot chop etilmaydi) (P05a, RISKS R-05). cmcMode: 'block' avvalgidek ishlaydi.
 *   westgardGate — Westgard 1₂s darvozasi (Westgard 1981, 1-rasm): true (standart) | false — qoidalar mustaqil (P11, W-4)
 *   aiEnabled    — AI yordamchi (P14): false (standart) — AI kodi yuklanmaydi; faqat admin / superadmin / lokal guest yoqadi (canToggleAi)
 *   aiModel      — "o'z kaliti" rejimidagi model nomi (docs/AI_DESIGN.md §9); nusxa-qo'y rejimida ishlatilmaydi
 *   expiryWarnDays — etalon amal qilish muddati tugashiga necha kun qolganda ogohlantirish (linter L1, info; P11) — standart 30
 */
export const LAB_DEFAULTS = Object.freeze({
  P: 0.9545, kMethod: 'nu', nuRule: 'floor', rounding: 'normal', decisionRule: 'simple', secondOrder: false, cmcMode: 'warn', ciMethod: 'wilson', criticalMode: 'mark',
  // P06 (egasi qarorlari 2026-11-18): Monte-Karlo — adaptiv M (standart) yoki qat'iy; n_dig; §8 tekshiruvi toleransi
  // 'delta5' (JCGM 101 §8.2, standart) yoki 'delta' (tushirilgan — hisobotda belgi bilan)
  mcMode: 'adaptive', mcNDig: 2, mcTolerance: 'delta5',
  expiryWarnDays: 30,
  westgardGate: true,
  // P14 (egasi qarorlari 2026-11-20): AI yordamchi standart holatda O'CHIQ; standart model — hujjat tavsiyasi (S-2 a)
  aiEnabled: false, aiModel: 'claude-opus-5-5',
});
export const LAB_SETTINGS_KEY = 'lab';

export async function getLabSettings(store) {
  const rec = await store.get('settings', LAB_SETTINGS_KEY);
  return { ...LAB_DEFAULTS, ...((rec && rec.value) || {}) };
}

export async function saveLabSettings(store, value, ctx = {}) {
  const clean = {};
  for (const k of Object.keys(LAB_DEFAULTS)) if (value[k] !== undefined) clean[k] = value[k];
  return store.save('settings', { key: LAB_SETTINGS_KEY, value: { ...LAB_DEFAULTS, ...clean } }, { reason: ctx.reason || 'lab settings', actor: ctx.actor });
}

/** Dvigatel holatiga o'tadigan qism (decisionRule, cmcMode — UI/hisobot qatlami uchun) */
export function labToEngineSettings(lab) {
  const l = { ...LAB_DEFAULTS, ...(lab || {}) };
  return { P: Number(l.P), kMethod: l.kMethod, nuRule: l.nuRule, rounding: l.rounding, secondOrder: !!l.secondOrder };
}

/** Har bir shablonning eng so'nggi versiyasi (semver bo'yicha) */
export function latestVersions(records) {
  const cmp = (a, b) => {
    const x = a.split('.').map(Number), y = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  };
  const by = new Map();
  for (const t of records) {
    const cur = by.get(t.id);
    if (!cur || cmp(t.version, cur.version) > 0) by.set(t.id, t);
  }
  return [...by.values()];
}
// P14: AI yordamchi — audit izi va ai.html bilan almashinuv ombori (kalit HECH QACHON saqlanmaydi)
export {
  AI_ENTITY, AI_ACTIONS, AI_MODES, AI_EXCHANGE_STORE, AI_EXCHANGE_TTL_MS, canToggleAi, aiAudit, aiAuditTrail,
  newExchangeId, putExchange, getExchange, removeExchange, purgeExchange,
} from './ai.js';
// P12: malaka sinovlari va usul validatsiyasi (IndexedDB v2 — `pt`, `validation` omborlari)
export {
  PT_STORE, VALIDATION_STORE, QUALITY_SCHEMA, QUALITY_RECORD_FORMAT, EXCLUDE_ACTION, INCLUDE_ACTION, MIN_EXCLUDE_COMMENT as MIN_EXCLUDE_COMMENT_STORE,
  canQuality, newQualityId, cleanPtSeries, cleanValidationSet, listQuality, getQuality, saveQuality, removeQuality, excludeValue, qualityHistory,
} from './quality.js';
