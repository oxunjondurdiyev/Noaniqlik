/* Ko'rsatish yordamchilari (hisobot qatlami; dvigatel natijasini o'zgartirmaydi). */

export function fmt(val, dp = 6) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toFixed(dp);
}

export function fmtSci(val, sig = 4) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  if (!isFinite(val)) return '∞';
  return Number(val).toPrecision(sig);
}
