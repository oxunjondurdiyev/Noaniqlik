/* ═══════════════════════════════════════════════════════════════
   CALC-META.JS — hisob identifikatori va vaqti (P05b). JSON eksport, hisobot pastki qismi (xesh, QR) va bosma hisobot
   BIR XIL id / createdAt dan foydalanishi kerak — aks holda bitta hisobning xeshi har xil chiqadi.
     • GUM yorlig'i: appState.calcMeta = { id, createdAt } — "Hisoblash" bosilganda yoziladi (saqlangan nuqtalarda — entry.meta);
     • boshqa yorliqlar (regressiya, top-down, maxsus rejimlar) va eski saqlangan natijalar: natija obyektiga
       bog'langan vaqtinchalik meta (WeakMap) — sahifa qayta yuklanguncha barqaror.
   Shaxsiy ma'lumot yo'q: id tasodifiy.
═══════════════════════════════════════════════════════════════ */
import { newCalcId } from './calc-json.js';

const byResult = new WeakMap();

/** Yangi meta (hisob bajarilgan paytda). */
export function newMeta(now) {
  const d = now === undefined ? new Date() : new Date(now);
  return { id: newCalcId(d.getTime()), createdAt: d.toISOString() };
}

/** Natija uchun meta: berilgan `saved` (to'liq bo'lsa) — o'zi; aks holda natija obyektiga bog'langan barqaror meta. */
export function metaFor(result, saved) {
  if (saved && typeof saved.id === 'string' && typeof saved.createdAt === 'string') return { id: saved.id, createdAt: saved.createdAt };
  if (!result || typeof result !== 'object') return newMeta();
  if (!byResult.has(result)) byResult.set(result, newMeta());
  return byResult.get(result);
}
