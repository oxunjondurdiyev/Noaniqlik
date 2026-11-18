/* ═══════════════════════════════════════════════════════════════
   ACCEPTANCE.JS — linter topilmasini "asoslangan holda qabul qilish" (P05a).
   warning yoki error topilmasini foydalanuvchi izoh bilan qabul qilishi mumkin; izoh MAJBURIY (≥ 10 belgi).
   Qabul qilish audit zanjiriga (./audit.js — append-only, xesh zanjiri) yoziladi:
     kim (ROL — shaxsiy ma'lumot emas: login, F.I.Sh. yozilmaydi), qachon, topilma id, izoh.
   Yozuv o'chirilmaydi: bekor qilish — yangi 'finding_revoke' yozuvi. Joriy holat zanjirdan qayta tiklanadi.
   Ref: ISO/IEC 17025:2017 §7.5 (texnik yozuvlar), §7.11.3 (ma'lumotlar yaxlitligi) — src/storage/audit.js.
   Saqlash qatlami dvigatelga bog'liq emas; izoh uzunligi chegarasi dvigateldagi MIN_ACCEPT_COMMENT bilan bir xil
   (tests/storage/acceptance.test.js tekshiradi).
═══════════════════════════════════════════════════════════════ */

export const ACCEPT_ACTION = 'finding_accept';
export const REVOKE_ACTION = 'finding_revoke';
export const ACCEPT_ENTITY = 'findings';
export const MIN_COMMENT = 10;
export const ACCEPTABLE_SEVERITIES = ['warning', 'error'];

/** Rol: faqat qisqa lotin identifikator (admin, employee, superadmin, guest …) — shaxsiy ma'lumot saqlanmaydi. */
export function cleanRole(role) {
  const r = String(role || '').trim().toLowerCase();
  return /^[a-z][a-z0-9_-]{0,31}$/.test(r) ? r : 'guest';
}

function check(ev) {
  if (!ev || !ev.finding || !ev.finding.id) throw new Error('accept_finding_required');
  if (!ACCEPTABLE_SEVERITIES.includes(ev.finding.severity)) throw new Error('accept_not_applicable');
  const comment = typeof ev.comment === 'string' ? ev.comment.trim() : '';
  if (comment.length < MIN_COMMENT) throw new Error('accept_comment_short');
  return comment;
}

/**
 * Topilmani qabul qilish — audit zanjiriga yozuv.
 * @param {import('./adapter.js').StorageAdapter} store
 * @param {{scope:string, calcId?:string, finding:{id:string, rule?:string, code?:string, severity:string, value?:string}, comment:string, role?:string, at?:string}} ev
 * @returns {Promise<{findingId:string, comment:string, role:string, at:string, value:string, seq:number, hash:string}>}
 */
export async function acceptFinding(store, ev) {
  const comment = check(ev);
  const f = ev.finding;
  const role = cleanRole(ev.role);
  const entry = await store.appendAudit({
    action: ACCEPT_ACTION, entity: ACCEPT_ENTITY, entityId: `${ev.scope || 'gum'}:${ev.calcId || ''}:${f.id}`,
    actor: role, reason: comment, at: ev.at,
    before: null,
    after: { scope: ev.scope || 'gum', calcId: ev.calcId || '', findingId: f.id, rule: f.rule || '', code: f.code || '', severity: f.severity, value: f.value === undefined ? '' : String(f.value), comment, role },
  });
  return { findingId: f.id, comment, role, at: entry.at, value: entry.after.value, seq: entry.seq, hash: entry.hash };
}

/** Qabulni bekor qilish — yangi yozuv (eski yozuv zanjirda qoladi). */
export async function revokeAcceptance(store, ev) {
  if (!ev || !ev.findingId) throw new Error('accept_finding_required');
  const role = cleanRole(ev.role);
  const entry = await store.appendAudit({
    action: REVOKE_ACTION, entity: ACCEPT_ENTITY, entityId: `${ev.scope || 'gum'}:${ev.calcId || ''}:${ev.findingId}`,
    actor: role, reason: String(ev.reason || '').trim(), at: ev.at,
    before: null, after: { scope: ev.scope || 'gum', calcId: ev.calcId || '', findingId: ev.findingId, role },
  });
  return { findingId: ev.findingId, role, at: entry.at, seq: entry.seq, hash: entry.hash };
}

/**
 * Audit zanjiridan joriy qabul qilishlar: { findingId: {comment, role, at, value, seq} } — berilgan scope / calcId uchun.
 * Oxirgi yozuv hal qiladi (accept → bor, revoke → yo'q).
 */
export function acceptancesFromAudit(entries, scope, calcId) {
  const out = {};
  for (const e of entries || []) {
    if (e.entity !== ACCEPT_ENTITY || !e.after) continue;
    if ((e.after.scope || 'gum') !== (scope || 'gum') || (e.after.calcId || '') !== (calcId || '')) continue;
    if (e.action === ACCEPT_ACTION) out[e.after.findingId] = { comment: e.after.comment, role: e.after.role, at: e.at, value: e.after.value, seq: e.seq };
    else if (e.action === REVOKE_ACTION) delete out[e.after.findingId];
  }
  return out;
}
