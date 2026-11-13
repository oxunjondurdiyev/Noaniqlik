/* ═══════════════════════════════════════════════════════════════
   TYPEA.JS — A tur baholash (statistik tahlil).
═══════════════════════════════════════════════════════════════ */
import { toNum } from './util.js';

/** Kuzatuvlar qatoridan x̄, s, u = s/√n, ν = n − 1.
    Ref: JCGM 100:2008 §4.2.1 (Eq. 3), §4.2.2 (Eq. 4), §4.2.3 (Eq. 5), G.3.3 (ν = n − 1). */
export function typeA(values) {
  // Qatorlar tartibi saqlanadi: bo'sh katak undefined (jadvalda og'ishni ko'rsatish uchun)
  const rowVals = (values || []).map(toNum);
  const nums = rowVals.filter(v => isFinite(v));
  const n = nums.length;
  if (n < 1) return null;

  const mean = nums.reduce((a, b) => a + b, 0) / n;
  const deviations = rowVals.map(v => isFinite(v) ? v - mean : undefined);
  const s2 = n > 1 ? nums.reduce((a, v) => a + (v - mean) * (v - mean), 0) / (n - 1) : 0;
  const s  = Math.sqrt(s2);
  const uA = n > 1 ? s / Math.sqrt(n) : 0;

  return { n, mean, deviations, s2, s, uA, nu: n > 1 ? n - 1 : Infinity, values: nums, rowVals };
}

/**
 * A tur, usul tanlovi bilan.
 * opts: { method: 1|2|3, sp, nup, directional, dirs: ['↑'|'↓'|'' …] }
 *  1 — s/√n, ν = n−1                       Ref: JCGM 100:2008 §4.2.3
 *  2 — oldindan aniqlangan s_p: u = s_p/√n, ν = ν_p   Ref: JCGM 100:2008 §4.2.4
 *  3 — kichik tanlama: u = s/√n·√((n−1)/(n−3)), n ≥ 4  Ref: COOMET R/GM/32:2017 (docs/references da yo'q — tekshirilmagan)
 *  directional — ↑/↓ o'qishlar: x̄ = (x̄↑ + x̄↓)/2, yo'nalish ichidagi birlashtirilgan s, ν = n−2,
 *                histerezis h = |x̄↓ − x̄↑| alohida.  Ref: JCGM 100:2008 §4.2.8 (birlashtirilgan s_p), H.3 kabi
 */
export function typeAx(values, opts) {
  const base = typeA(values);
  if (!base) return null;
  const o = opts || {};
  const out = { ...base, method: Number(o.method) || 1, directional: false, h: 0, warnings: [] };
  let s = base.s, nu = base.n > 1 ? base.n - 1 : Infinity;

  if (o.directional && Array.isArray(o.dirs)) {
    const up = [], dn = [];
    base.rowVals.forEach((v, i) => {
      if (!isFinite(v)) return;
      if (o.dirs[i] === '↓') dn.push(v); else if (o.dirs[i] === '↑') up.push(v);
    });
    if (up.length && dn.length) {
      const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
      const mU = avg(up), mD = avg(dn);
      const ss = up.reduce((a, v) => a + (v - mU) ** 2, 0) + dn.reduce((a, v) => a + (v - mD) ** 2, 0);
      const df = up.length + dn.length - 2;
      out.directional = true;
      out.meanUp = mU; out.meanDn = mD; out.nUp = up.length; out.nDn = dn.length;
      out.mean = (mU + mD) / 2;
      out.h = Math.abs(mD - mU);
      out.deviations = base.rowVals.map((v, i) => isFinite(v) ? v - (o.dirs[i] === '↓' ? mD : mU) : undefined);
      s = df > 0 ? Math.sqrt(ss / df) : 0;
      nu = df > 0 ? df : Infinity;
      out.sp = s;
    } else {
      out.warnings.push('dir_missing');
    }
  }

  const n = base.n;
  let uA;
  if (out.method === 2) {
    const sp = toNum(o.sp), nup = toNum(o.nup);
    uA = isFinite(sp) && sp >= 0 ? sp / Math.sqrt(n) : s / Math.sqrt(n);
    nu = isFinite(nup) && nup > 0 ? nup : nu;
    if (!(isFinite(sp) && sp >= 0)) out.warnings.push('sp_missing');
  } else if (out.method === 3) {
    if (n >= 4) { uA = s / Math.sqrt(n) * Math.sqrt((n - 1) / (n - 3)); nu = Infinity; }
    else { uA = n > 1 ? s / Math.sqrt(n) : 0; out.warnings.push('coomet_small'); }
  } else {
    uA = n > 1 ? s / Math.sqrt(n) : 0;
  }
  if (n > 1 && s === 0 && out.method !== 2) out.warnings.push('zero_s');
  if (n > 1 && n < 5 && out.method === 1) out.warnings.push('n_small');

  out.sEff = s;
  out.uA = uA;
  out.nu = nu;
  return out;
}

/** Juftlangan qatorlar bo'yicha Pearson r (faqat ikkalasi ham chekli qatorlar).
    Ref: JCGM 100:2008 §5.2.3, Eq. (17). */
export function correlation(xs, ys) {
  const pairs = [];
  const len = Math.min(xs.length, ys.length);
  for (let i = 0; i < len; i++) if (isFinite(xs[i]) && isFinite(ys[i])) pairs.push([xs[i], ys[i]]);
  const n = pairs.length;
  if (n < 2) return 0;
  const mx = pairs.reduce((a, p) => a + p[0], 0) / n;
  const my = pairs.reduce((a, p) => a + p[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  pairs.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; });
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}
