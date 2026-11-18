/* A4 — kuzatuvlar qatorida Grubbs mezoni bo'yicha chetga chiquvchi qiymat (info).
   G = max|x_i − x̄| / s;  G_crit(n, α) = ((n − 1)/√n)·√(t²/(n − 2 + t²)),  t = t_{α/(2n); n−2} (ikki tomonlama test).
   Ref: ISO 5725-2 §7.3.4 (Grubbs testi) — pullik, repoda yo'q → UNVERIFIED; formula — Grubbs (1969),
   Technometrics 11(1), 1–21 (repoda yo'q). Shuning uchun faqat info: qiymat AVTOMATIK CHIQARILMAYDI, hisob o'zgarmaydi;
   sababi aniqlanmagan qiymatni chiqarib tashlash mumkin emas. α = 0,05 — loyiha qarori (THRESHOLDS.grubbsAlpha).
   ↑/↓ rejimida (ikki xil o'rtacha) va s = 0 da qo'llanmaydi. */
import { finding, gumState, toNum, short, THRESHOLDS } from '../util.js';
import { tQuantile } from '../../special.js';

/** Grubbs kritik qiymati (ikki tomonlama, ahamiyatlilik darajasi alpha). */
export function grubbsCritical(n, alpha) {
  if (!(n >= 3)) return NaN;
  // t — yuqori dum ehtimoli α/(2n) bo'lgan kvantil; tQuantile(P, ν) ikki tomonlama qamrov P bilan: P = 1 − α/n
  const t = tQuantile(1 - alpha / n, n - 2);
  return ((n - 1) / Math.sqrt(n)) * Math.sqrt((t * t) / (n - 2 + t * t));
}

/** G statistikasi va eng chetdagi qiymat. */
export function grubbsStatistic(values) {
  const xs = values.filter(v => isFinite(v));
  const n = xs.length;
  if (n < 3) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const s = Math.sqrt(xs.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1));
  if (!(s > 0)) return null;
  let worst = xs[0];
  for (const v of xs) if (Math.abs(v - mean) > Math.abs(worst - mean)) worst = v;
  return { n, mean, s, value: worst, G: Math.abs(worst - mean) / s };
}

const rule = {
  id: 'A4',
  severity: 'info',
  ref: 'ISO 5725-2 §7.3.4 (unverified)',
  unverified: true,
  modes: ['GUM'],
  codes: { grubbs_outlier: {} },
  check(spec, result) {
    const state = gumState(spec);
    if (!state) return [];
    const out = [];
    for (const inp of result.inputs || []) {
      if (inp.directional || inp.n < THRESHOLDS.grubbsMinN) continue;
      const g = grubbsStatistic(((state.measurements || {})[inp.name] || []).map(toNum));
      if (!g) continue;
      const crit = grubbsCritical(g.n, THRESHOLDS.grubbsAlpha);
      if (g.G > crit) out.push(finding(rule, 'grubbs_outlier', { param: inp.name, value: `x = ${short(g.value, 8)}; G = ${short(g.G, 4)} > ${short(crit, 4)} (n = ${g.n})` }));
    }
    return out;
  },
};
export default rule;
