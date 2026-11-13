/* ═══════════════════════════════════════════════════════════════
   AUDIT.JS — faqat qo'shiladigan (append-only) audit jurnali, xesh zanjiri.
   Ref: ISO/IEC 17025:2017 §7.5 (texnik yozuvlar: o'zgartirish izi, asl qiymat saqlanadi),
        §7.11.3 (ma'lumotlar yaxlitligi), §8.4; ALCOA+ tamoyillari.
   Har bir yozuv: { seq, at, actor, action, entity, entityId, before, after, reason, prevHash, hash }.
   hash = SHA-256(kanonik JSON(yozuv, hash maydonisiz)); prevHash = oldingi yozuv xeshi
   (birinchisi uchun GENESIS). Bitta yozuv o'zgartirilsa yoki o'chirilsa — verifyChain aniqlaydi.
   Lokal rejimda bu himoya "buzilganini aniqlash" darajasida (foydalanuvchi o'z brauzerini
   to'liq boshqaradi); kriptografik kafolat server bilan (P15) bo'ladi.
═══════════════════════════════════════════════════════════════ */
import { hashOf } from './canonical.js';

export const GENESIS = '0'.repeat(64);
export const AUDIT_FIELDS = ['seq', 'at', 'actor', 'action', 'entity', 'entityId', 'before', 'after', 'reason', 'prevHash'];

/**
 * Yangi yozuv yaratish (saqlamaydi).
 * @param {object|null} prev  oxirgi yozuv (yo'q bo'lsa null)
 * @param {{at?:string, actor?:string, action:string, entity?:string, entityId?:any, before?:any, after?:any, reason?:string}} ev
 */
export async function makeEntry(prev, ev) {
  if (!ev || !ev.action) throw new Error('audit_action_required');
  const body = {
    seq: prev ? prev.seq + 1 : 1,
    at: ev.at || new Date().toISOString(),
    actor: ev.actor || '',
    action: ev.action,
    entity: ev.entity || '',
    entityId: ev.entityId === undefined ? null : ev.entityId,
    before: ev.before === undefined ? null : ev.before,
    after: ev.after === undefined ? null : ev.after,
    reason: ev.reason || '',
    prevHash: prev ? prev.hash : GENESIS,
  };
  return { ...body, hash: await hashOf(body) };
}

/**
 * Zanjirni tekshirish.
 * @param {object[]} entries  seq bo'yicha tartiblangan
 * @returns {Promise<{ok:boolean, count:number, brokenAt:number|null, reason:string|null}>}
 */
export async function verifyChain(entries) {
  let prev = null;
  for (const e of entries) {
    const expectedSeq = prev ? prev.seq + 1 : 1;
    if (e.seq !== expectedSeq) return { ok: false, count: entries.length, brokenAt: e.seq, reason: 'seq_gap' };
    if (e.prevHash !== (prev ? prev.hash : GENESIS)) return { ok: false, count: entries.length, brokenAt: e.seq, reason: 'prev_hash' };
    const body = {};
    for (const k of AUDIT_FIELDS) body[k] = e[k];
    const extra = Object.keys(e).filter(k => k !== 'hash' && !AUDIT_FIELDS.includes(k));
    if (extra.length) return { ok: false, count: entries.length, brokenAt: e.seq, reason: 'extra_fields' };
    if ((await hashOf(body)) !== e.hash) return { ok: false, count: entries.length, brokenAt: e.seq, reason: 'hash' };
    prev = e;
  }
  return { ok: true, count: entries.length, brokenAt: null, reason: null };
}
