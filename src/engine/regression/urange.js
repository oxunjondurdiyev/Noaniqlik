/* ═══════════════════════════════════════════════════════════════
   REGRESSION/URANGE.JS — "U — diapazon": ko'p nuqtali kalibrlashda nuqtalardagi U_j
   bo'yicha butun diapazon uchun bitta ifoda (sertifikat ilovasi uchun).

   HOLAT: UNVERIFIED. ILAC P14:09/2020 (§5.3 — diapazon uchun noaniqlikni ifodalash) PDF'i
   docs/references/ da yo'q; formulalar manba bilan solishtirilmagan. Natijada `unverified: true`.
   Loyiha qoidasi: ifoda hech bir kalibrlash nuqtasida U_j dan KICHIK bo'lmaydi (U(X_j) ≥ U_j).
═══════════════════════════════════════════════════════════════ */

export const URANGE_MODES = ['linear', 'max'];

/**
 * @param {{x:number, U:number}[]} points  kalibrlash nuqtalari va ularning kengaytirilgan noaniqligi
 * @param {'linear'|'max'} [mode='linear']
 *   'linear' — U(X) = a + b·|X|: (|X_j|, U_j) bo'yicha oddiy eng kichik kvadratlar chizig'i,
 *              so'ng a barcha nuqtalarda U(X_j) ≥ U_j bo'ladigan qilib yuqoriga suriladi;
 *   'max'    — konservativ yuqori chegara: U(X) = max_j U_j (o'zgarmas).
 * @returns {{mode, a, b, shift, range, points, unverified:true}|{error, detail?}}
 */
export function uRangeFunction(points, mode = 'linear') {
  if (!URANGE_MODES.includes(mode)) return { error: 'urange_bad_mode', detail: String(mode) };
  const pts = (points || []).map(p => ({ x: Number(p.x), U: Number(p.U) }));
  if (pts.length < 2) return { error: 'urange_too_few_points', detail: String(pts.length) };
  const bad = pts.findIndex(p => !isFinite(p.x) || !(p.U > 0) || !isFinite(p.U));
  if (bad >= 0) return { error: 'urange_bad_data', detail: String(bad + 1) }; // U = 0 ogohlantirishsiz o'tmaydi (CLAUDE.md)
  const ax = pts.map(p => Math.abs(p.x));
  const lo = Math.min(...ax), hi = Math.max(...ax);
  let a, b, shift = 0;
  if (mode === 'max') {
    a = Math.max(...pts.map(p => p.U)); b = 0;
  } else {
    const m = pts.length;
    const mx = ax.reduce((s, v) => s + v, 0) / m, mu = pts.reduce((s, p) => s + p.U, 0) / m;
    let sxx = 0, sxu = 0;
    for (let i = 0; i < m; i++) { sxx += (ax[i] - mx) ** 2; sxu += (ax[i] - mx) * (pts[i].U - mu); }
    if (!(sxx > 0)) return { error: 'urange_x_degenerate' };
    b = sxu / sxx;
    const a0 = mu - b * mx;
    // Yuqoriga surish: eng katta musbat qoldiq (U_j − (a0 + b|X_j|))
    for (let i = 0; i < m; i++) shift = Math.max(shift, pts[i].U - (a0 + b * ax[i]));
    a = a0 + shift;
    // Diapazon ichida U(X) musbat bo'lishi shart
    if (!(a + b * lo > 0) || !(a + b * hi > 0)) return { error: 'urange_nonpositive' };
  }
  const at = x => a + b * Math.abs(x);
  return {
    mode, a, b, shift, range: [lo, hi], unverified: true,
    points: pts.map(p => ({ x: p.x, U: p.U, Ufit: at(p.x), margin: at(p.x) - p.U })),
  };
}

/** U(X) qiymati (diapazondan tashqarida — null: ekstrapolyatsiya qilinmaydi) */
export function uRangeAt(fn, x) {
  const ax = Math.abs(Number(x));
  if (!fn || fn.error || !isFinite(ax) || ax < fn.range[0] || ax > fn.range[1]) return null;
  return fn.a + fn.b * ax;
}
