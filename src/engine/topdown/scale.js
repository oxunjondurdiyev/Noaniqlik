/* ═══════════════════════════════════════════════════════════════
   TOPDOWN/SCALE.JS — nisbiy va mutlaq noaniqlikni ajratib turish (P09).
   Qoida: har bir kattalikda `unit` (mutlaq) YOKI `relative: true` (nisbiy) bo'ladi.
   Bitta baholashda hamma hissa bitta shkalada; aralash qo'shish — aniq xato.
   Ref: Nordtest TR 537 ed. 4 §4.3 (p. 14): "all uncertainties used in the calculations
   in that range are either absolute or relative".
   Sof modul (brauzer obyektlari yo'q).
═══════════════════════════════════════════════════════════════ */
import { isBlank, toNum } from '../util.js';
import { parseUnit, convert } from '../units.js';

/** Ichki xato: evaluateTopDown uni { error, detail } ga aylantiradi. */
export class TopDownError extends Error {
  constructor(code, detail) { super(code); this.code = code; this.detail = detail === undefined ? '' : String(detail); }
}
export const fail = (code, detail) => { throw new TopDownError(code, detail); };

export function num(v, where) {
  const n = typeof v === 'number' ? v : toNum(v);
  if (!Number.isFinite(n)) fail('topdown_bad_data', where);
  return n;
}
export const has = v => !isBlank(v);

/** Kattalikning e'lon qilingan shkalasi: 'relative' | 'absolute'. Ikkalasi ham yoki hech biri — xato. */
export function declaredScale(o, where) {
  const rel = !!o && o.relative === true, abs = !!o && has(o.unit);
  if (rel && abs) fail('topdown_mixed_scale', `${where}: relative + unit`);
  if (!rel && !abs) fail('topdown_need_scale', where);
  return rel ? 'relative' : 'absolute';
}

/**
 * Baholash shkalasi (kontekst).
 * @param {{relative?:true, unit?:string}} scale
 * @param {'%'|'1'} [relativeUnit='%']  nisbiy qiymatlar foizda (Nordtest) yoki ulushda (QUAM A4)
 */
export function makeContext(scale, relativeUnit) {
  const kind = declaredScale(scale, 'scale');
  if (relativeUnit !== undefined && relativeUnit !== '%' && relativeUnit !== '1') fail('topdown_bad_spec', 'relativeUnit');
  const pct = relativeUnit !== '1';
  return {
    relative: kind === 'relative',
    unit: kind === 'relative' ? (pct ? '%' : '1') : String(scale.unit).trim(),
    F: pct ? 100 : 1,           // nisbiy qiymat birligi: 100 — foiz, 1 — ulush
  };
}

/** Mutlaq qiymatni (farq/noaniqlik) kontekst birligiga o'tkazish; o'lchamlik mos kelmasa — xato. */
export function toContextUnit(value, unit, ctx, where) {
  const from = String(unit).trim();
  if (from === ctx.unit) return value;
  const a = parseUnit(from), b = parseUnit(ctx.unit);
  if (!a || !b) fail('topdown_unit_mismatch', `${where}: ${from} ≠ ${ctx.unit}`);
  try { return convert(value, a, b, { difference: true }); } catch (e) { return fail('topdown_unit_mismatch', `${where}: ${from} ≠ ${ctx.unit}`); }
}

/**
 * Tayyor (hosila) qiymat — s, u, chegara: e'lon qilingan shkalasi kontekstga mos bo'lishi SHART.
 * Mutlaq ↔ nisbiy o'tkazish jimgina bajarilmaydi (buning uchun daraja x kerak — foydalanuvchi o'zi o'tkazadi).
 */
export function stated(o, value, ctx, where) {
  const kind = declaredScale(o, where);
  if ((kind === 'relative') !== ctx.relative) {
    fail('topdown_mixed_scale', `${where}: ${kind === 'relative' ? 'relative' : o.unit} → ${ctx.relative ? 'relative' : ctx.unit}`);
  }
  const v = num(value, where);
  return ctx.relative ? v : toContextUnit(v, o.unit, ctx, where);
}

export const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
/** Tajriba standart og'ishi (n − 1). Ref: JCGM 100:2008 §4.2.2 Eq. (4). */
export function stdev(a) {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1));
}
export const rss = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0));
