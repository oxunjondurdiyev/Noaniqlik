/* ═══════════════════════════════════════════════════════════════
   LAB/QC.JS — ichki sifat nazorati kartalari (P11): Shewhart X̄–R va individual (I–MR). Sof modul.

   Ref: ISO/IEC 17025:2017 §7.7.1 (natijalar haqiqiyligini kuzatish) — (unverified: standart repoda yo'q);
        NIST/SEMATECH e-Handbook of Statistical Methods, §6.3.2.1 "Shewhart X-bar and R and S Control Charts"
        (https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc321.htm) va §6.3.2.2 "Individuals Control Charts"
        (https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc322.htm).
   MANBA HOLATI: P11 sessiyasida NIST sayti ochilmadi (tarmoq siyosati), sahifa matni repoda yo'q — shuning uchun
   jadval qiymatlari "(unverified)" va ular MUSTAQIL HISOB bilan tekshirilgan: d₂ = E[R], d₃ = SD[R] — n ta standart
   normal kuzatuv ko'lamining (range) momentlari sonli integrallash bilan (tests/engine/lab-qc.test.js); undan
   A₂ = 3/(d₂√n), D₃ = max(0, 1 − 3d₃/d₂), D₄ = 1 + 3d₃/d₂. Jadval — 3 o'nlik xonagacha yaxlitlangan an'anaviy
   qiymatlar; test ±0,001 ichida mosligini tekshiradi. Egasi NIST sahifasi bilan solishtirgach "verified" bo'ladi.

   Formulalar (kichik guruh hajmi n, k ta kichik guruh):
     X̄ karta:  CL = X̿;  UCL/LCL = X̿ ± A₂·R̄      (σ̂ = R̄/d₂;  3σ̂/√n = A₂·R̄)
     R karta:   CL = R̄;  UCL = D₄·R̄;  LCL = D₃·R̄
     I karta:   CL = x̄;  UCL/LCL = x̄ ± 3·MR̄/d₂(2) = x̄ ± 3·MR̄/1,128
     MR karta:  CL = MR̄; UCL = D₄(2)·MR̄ = 3,267·MR̄;  LCL = 0
   ±2s (ogohlantirish) chegaralari — xuddi shu σ̂ bilan, 2/3 masofada.
═══════════════════════════════════════════════════════════════ */

/** n → { d2, d3, A2, D3, D4 } (n = 2…10). Manba va tekshiruv — fayl boshidagi izohda. */
export const SHEWHART_CONSTANTS = Object.freeze({
  2: Object.freeze({ d2: 1.128, d3: 0.853, A2: 1.880, D3: 0, D4: 3.267 }),
  3: Object.freeze({ d2: 1.693, d3: 0.888, A2: 1.023, D3: 0, D4: 2.574 }),
  4: Object.freeze({ d2: 2.059, d3: 0.880, A2: 0.729, D3: 0, D4: 2.282 }),
  5: Object.freeze({ d2: 2.326, d3: 0.864, A2: 0.577, D3: 0, D4: 2.114 }),
  6: Object.freeze({ d2: 2.534, d3: 0.848, A2: 0.483, D3: 0, D4: 2.004 }),
  7: Object.freeze({ d2: 2.704, d3: 0.833, A2: 0.419, D3: 0.076, D4: 1.924 }),
  8: Object.freeze({ d2: 2.847, d3: 0.820, A2: 0.373, D3: 0.136, D4: 1.864 }),
  9: Object.freeze({ d2: 2.970, d3: 0.808, A2: 0.337, D3: 0.184, D4: 1.816 }),
  10: Object.freeze({ d2: 3.078, d3: 0.797, A2: 0.308, D3: 0.223, D4: 1.777 }),
});
export const QC_MIN_SUBGROUP = 2;
export const QC_MAX_SUBGROUP = 10;
export const QC_ERRORS = Object.freeze(['qc_need_data', 'qc_subgroup_size', 'qc_bad_target']);
export const QC_TYPES = Object.freeze(['imr', 'xbar']);

const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const finite = a => (a || []).map(Number).filter(Number.isFinite);

/** Tajriba standart og'ishi (n − 1). Ref: JCGM 100:2008 4.2.2 (Eq. 4) */
export function sampleSd(values) {
  const v = finite(values);
  if (v.length < 2) return null;
  const m = mean(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

const limits = (center, sigma) => ({
  center, sigma,
  ucl: center + 3 * sigma, lcl: center - 3 * sigma,          // ±3s — harakat chegaralari
  uwl: center + 2 * sigma, lwl: center - 2 * sigma,          // ±2s — ogohlantirish chegaralari
});

/**
 * Individual (I–MR) karta.
 * @param {number[]} values  nazorat namunasi natijalari (vaqt tartibida)
 * @returns {{type:'imr', n, values, mr, x:{center,sigma,ucl,lcl,uwl,lwl}, r:{center,ucl,lcl}, out:{x:number[], r:number[]}}|{error}}
 */
export function individualsChart(values) {
  const v = finite(values);
  if (v.length < 2) return { error: 'qc_need_data' };
  const mr = [];
  for (let i = 1; i < v.length; i++) mr.push(Math.abs(v[i] - v[i - 1]));
  const c = SHEWHART_CONSTANTS[2];
  const mrBar = mean(mr), xBar = mean(v);
  const x = limits(xBar, mrBar / c.d2);
  const r = { center: mrBar, ucl: c.D4 * mrBar, lcl: c.D3 * mrBar };
  return {
    type: 'imr', n: v.length, values: v, mr, x, r,
    out: { x: v.map((y, i) => (y > x.ucl || y < x.lcl ? i : -1)).filter(i => i >= 0), r: mr.map((y, i) => (y > r.ucl ? i + 1 : -1)).filter(i => i >= 0) },
  };
}

/**
 * X̄–R karta. Barcha kichik guruhlar bir xil hajmda (2…10) bo'lishi shart.
 * @param {number[][]} subgroups
 */
export function xbarRChart(subgroups) {
  const g = (subgroups || []).map(finite).filter(a => a.length);
  if (g.length < 2) return { error: 'qc_need_data' };
  const n = g[0].length;
  if (n < QC_MIN_SUBGROUP || n > QC_MAX_SUBGROUP || g.some(a => a.length !== n)) return { error: 'qc_subgroup_size' };
  const c = SHEWHART_CONSTANTS[n];
  const means = g.map(mean), ranges = g.map(a => Math.max(...a) - Math.min(...a));
  const xbb = mean(means), rBar = mean(ranges);
  const sigmaX = rBar / c.d2;                               // bitta kuzatuvning σ̂
  const x = { ...limits(xbb, sigmaX / Math.sqrt(n)), ucl: xbb + c.A2 * rBar, lcl: xbb - c.A2 * rBar };
  const r = { center: rBar, ucl: c.D4 * rBar, lcl: c.D3 * rBar };
  return {
    type: 'xbar', n, k: g.length, means, ranges, sigmaWithin: sigmaX, x, r,
    out: { x: means.map((y, i) => (y > x.ucl || y < x.lcl ? i : -1)).filter(i => i >= 0), r: ranges.map((y, i) => (y > r.ucl || y < r.lcl ? i : -1)).filter(i => i >= 0) },
  };
}

/**
 * Belgilangan (target) o'rtacha va s bilan chegaralar — karta "o'rnatilgandan" keyingi nazorat uchun
 * (Westgard qoidalari shu o'rtacha va s ga nisbatan z = (x − m)/s bilan ishlaydi).
 */
export function targetLimits(target) {
  const m = Number((target || {}).mean), s = Number((target || {}).s);
  if (!Number.isFinite(m) || !(s > 0)) return { error: 'qc_bad_target' };
  return limits(m, s);
}

/** z-ballar: (x − m)/s. */
export function zScores(values, m, s) { return finite(values).map(v => (v - m) / s); }

/**
 * Kartadan laboratoriya ichidagi takrorlanuvchanlik s_Rw (top-down, Nordtest TR 537 ed. 4 — u(R_w): nazorat namunasi
 * natijalarining standart og'ishi): s = tajriba standart og'ishi (n − 1), ν = n − 1. O'rtacha — karta markaziy chizig'i emas,
 * shu qatorning o'z o'rtachasi. X̄–R kartada barcha kuzatuvlar bitta qatorga yoyiladi (guruhlar orasidagi o'zgarish ham kiradi).
 * @returns {{sRw:number, mean:number, n:number, nu:number, values:number[]}|{error}}
 */
export function sRwFromChart(points) {
  const v = finite([].concat(...(points || []).map(p => (Array.isArray(p) ? p : (p && Array.isArray(p.values) ? p.values : [p])))));
  if (v.length < 2) return { error: 'qc_need_data' };
  return { sRw: sampleSd(v), mean: mean(v), n: v.length, nu: v.length - 1, values: v };
}
