/* ═══════════════════════════════════════════════════════════════
   LAB/DATES.JS — sana yordamchilari (sof: soat o'qilmaydi — "bugun" har doim tashqaridan beriladi).
   Sana formati: 'YYYY-MM-DD' (ISO 8601, kalendar sanasi). Kunlar farqi UTC bo'yicha — vaqt mintaqasiga bog'liq emas.
═══════════════════════════════════════════════════════════════ */

const RX = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' → epoch kunlari (butun son) yoki NaN. Mavjud bo'lmagan sana (2026-02-30) — NaN. */
export function dayNumber(iso) {
  const m = RX.exec(String(iso === undefined || iso === null ? '' : iso).trim().slice(0, 10));
  if (!m) return NaN;
  const y = +m[1], mo = +m[2], d = +m[3];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return NaN;
  return Math.round(ms / 86400000);
}

export const isDate = iso => Number.isFinite(dayNumber(iso));

/** b − a, kunlarda (NaN — sanalardan biri noto'g'ri). */
export function daysBetween(a, b) { return dayNumber(b) - dayNumber(a); }

/** Epoch kunlari → 'YYYY-MM-DD'. */
export function fromDayNumber(n) {
  if (!Number.isFinite(n)) return '';
  return new Date(Math.round(n) * 86400000).toISOString().slice(0, 10);
}

export function addDays(iso, days) { return fromDayNumber(dayNumber(iso) + days); }
