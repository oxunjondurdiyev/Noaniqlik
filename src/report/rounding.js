/* ═══════════════════════════════════════════════════════════════
   ROUNDING.JS — hisobot qatlamida yaxlitlash (dvigatel natijasini o'zgartirmaydi).
   Egasi qarorlari (CLAUDE.md, PLAN 7-javob):
     • U — ko'pi bilan 2 qiymatli raqam; yuqoriga yaxlitlashdan keyin ham 2 ta qoladi:
       0,0999 → 0,10 (0,100 emas);
     • y — round half away from zero (Excel ROUND bilan mos): −0,125 → −0,13; y U ning oxirgi xonasigacha.
   Ref: ILAC P14:09/2020 §5.4 (docs/references da hali yo'q — tekshirilmagan); JCGM 100:2008 §7.2.6.
═══════════════════════════════════════════════════════════════ */

/* Ikkilik ko'rinish xatosini (1.005·100 = 100.49999…) Excel kabi 15 qiymatli raqamgacha tuzatish */
const clean = v => Number(v.toPrecision(15));
const scaleBy = (v, d) => (d >= 0 ? v * Math.pow(10, d) : v / Math.pow(10, -d));
const unscale = (v, d) => (d >= 0 ? v / Math.pow(10, d) : v * Math.pow(10, -d));

/** Excel ROUND(v, d): yarmi noldan uzoqqa. d manfiy bo'lishi mumkin (o'nliklar, yuzliklar). */
export function roundHalfAway(v, d) {
  if (!isFinite(v)) return v;
  const s = clean(scaleBy(Math.abs(v), d));
  const r = Math.floor(s + 0.5);
  const out = unscale(r, d);
  return v < 0 ? -out : out;
}

/** Excel ROUNDUP(v, d): noldan uzoqqa (|v| bo'yicha yuqoriga). */
export function roundUpAway(v, d) {
  if (!isFinite(v)) return v;
  const s = clean(scaleBy(Math.abs(v), d));
  const out = unscale(Math.ceil(s), d);
  return v < 0 ? -out : out;
}

/**
 * U ni 2 qiymatli raqamgacha, y ni U ning oxirgi xonasigacha yaxlitlash.
 * @param {number} y
 * @param {number} U
 * @param {boolean|'up'|'normal'} [mode=false]  true / 'up' — ROUNDUP, aks holda ROUND
 * @returns {{digits:number, decimals:number, Uround:number, yround:number, resultText:string, mode:string}}
 *   decimals — o'nlik xonalar soni (manfiy: o'nliklar…); digits — ko'rsatish uchun max(0, decimals)
 */
export function roundResult(y, U, mode) {
  const up = mode === true || mode === 'up';
  let decimals = U > 0 && isFinite(U) ? 1 - Math.floor(Math.log10(U)) : 6;
  let Uround = 0;
  if (U > 0 && isFinite(U)) {
    // log10 ning chegaraviy xatosi: 2 qiymatli raqam [10; 100) oralig'ida bo'lishi kerak
    const s = clean(scaleBy(U, decimals));
    if (s >= 100) decimals -= 1; else if (s < 10) decimals += 1;
    Uround = up ? roundUpAway(U, decimals) : roundHalfAway(U, decimals);
    // Yaxlitlash 99 → 100 qilsa (0,0999 → 0,100), 2 qiymatli raqam qoladi: 0,10
    if (clean(scaleBy(Uround, decimals)) >= 100) decimals -= 1;
  }
  const yround = roundHalfAway(y, decimals);
  const digits = Math.max(0, Math.min(12, decimals));
  const show = v => (Object.is(v, -0) ? 0 : v).toFixed(digits);
  return { digits, decimals, Uround, yround, mode: up ? 'up' : 'normal', resultText: `${show(yround)} ± ${show(Uround)}` };
}
