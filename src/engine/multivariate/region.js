/* ═══════════════════════════════════════════════════════════════
   MULTIVARIATE/REGION.JS — vektor chiqish uchun qamrov sohasi (P07). Sof modul.
   Manba: JCGM 102:2011 §6.5 (GUM yondashuvi, ko'p o'lchovli Gauss), §7.7 (Monte-Karlo nuqtalaridan).
═══════════════════════════════════════════════════════════════ */
import { chi2Quantile } from '../regression/chi2.js';
import { normalQuantile } from '../special.js';
import { symEigen, correlationMatrix } from './linalg.js';

/** Sonli jihatdan singular deb hisoblash chegarasi: λ_min / λ_max (korrelyatsiya matritsasi). Texnik chegara. */
export const SINGULAR_RATIO = 1e-9;

/**
 * Gipper-ellipsoid uchun qamrov koeffitsiyenti: p = Pr(χ²_m ≤ k_p²).
 * Ref: JCGM 102:2011 §6.5.2.3 a), §6.5.3 a); Table 1 (23-bet): p = 0,95 — m = 1: 1,96; 2: 2,45; 3: 2,80 …
 */
export const ellipsoidFactor = (P, m) => Math.sqrt(chi2Quantile(P, m));

/**
 * Gipper-to'rtburchak uchun: q = 1 − (1 − p)/m, q = Pr(|Z| ≤ k_q) → k_q = Φ⁻¹((1 + q)/2).
 * Ref: JCGM 102:2011 §6.5.2.3 b) Eq. (19), §6.5.3 b); Table 2 (23-bet): p = 0,95 — m = 1: 1,96; 2: 2,24; 3: 2,39 …
 * Bu soha kamida p ehtimolni qamraydi (chiqishlar orasidagi bog'liqlik hisobga olinmaydi).
 */
export function rectangleFactor(P, m) {
  const q = 1 - (1 - P) / m;
  return { q, kq: normalQuantile((1 + q) / 2) };
}

/**
 * GUM yondashuvidagi qamrov sohasi: Y ~ N(y, U_y) (§6.5.1.3).
 * @returns {{P, m, distribution:'gaussian', ellipsoid:{kp, kp2}, rectangle:{q, kq, intervals:number[][]},
 *            lambdaMax:number, lambdaMin:number, singular:boolean, ellipse?:{semiAxes:number[], angle:number}}}
 */
export function gaussianRegion(y, Uy, P) {
  const m = y.length;
  const kp = ellipsoidFactor(P, m);
  const { q, kq } = rectangleFactor(P, m);
  const eig = symEigen(correlationMatrix(Uy));
  const lambdaMax = eig.values[0], lambdaMin = eig.values[m - 1];
  const out = {
    P, m, distribution: 'gaussian',
    ellipsoid: { kp, kp2: kp * kp },
    // Ref: JCGM 102:2011 Eq. (23) — y_j ± k_q·u(y_j)
    rectangle: { q, kq, intervals: y.map((v, j) => { const u = Math.sqrt(Math.max(Uy[j][j], 0)); return [v - kq * u, v + kq * u]; }) },
    lambdaMax, lambdaMin,
    // Chiqishlar orasida (chiziqlashtirilgan) funksional bog'liqlik: U_y singular — ellipsoid buzilgan (§9.4.2.3 Note 2)
    singular: !(lambdaMin > SINGULAR_RATIO * lambdaMax),
  };
  if (m === 2) out.ellipse = ellipseOf(Uy, kp);
  return out;
}

/**
 * Ikki o'lchovli ellips (η − y)ᵀ U_y⁻¹ (η − y) = k_p² ning yarim o'qlari va burchagi (chizish uchun).
 * Ref: JCGM 102:2011 §6.5.2.3 a), Eq. (16). Yarim o'qlar: k_p·√λ_i (λ_i — U_y ning xos qiymatlari); yuzasi π·k_p²·√det U_y.
 */
export function ellipseOf(Uy, kp) {
  const e = symEigen(Uy);
  const a = kp * Math.sqrt(Math.max(e.values[0], 0)), b = kp * Math.sqrt(Math.max(e.values[1], 0));
  return { semiAxes: [a, b], angle: Math.atan2(e.vectors[0][1], e.vectors[0][0]), area: Math.PI * a * b };
}

/** Eng kichik qamrov sohasi to'ri: standart o'lcham va ruxsat etilgan chegaralar (har bir o'q bo'yicha kataklar soni). */
export const SMALLEST_MESH = Object.freeze({ default: 100, min: 10, max: 500 });

/**
 * Eng kichik qamrov sohasining yaqinlashuvi — ikki o'lchovli holat (m = 2), Monte-Karlo nuqtalaridan.
 * Ref: JCGM 102:2011 §7.7.4 (30–31-betlar), a)–g):
 *   a) barcha y_r ni "aynan" o'z ichiga oluvchi to'g'ri to'rtburchak (Note 2) — har bir chiqishning min … max oralig'i;
 *   b) uni mesh × mesh kichik to'rtburchaklarga bo'lish;  c) har bir nuqtani o'z katagiga yozish;
 *   d) katakdagi nuqtalar ulushi — ehtimollik yaqinlashuvi;  e) kataklarni ehtimollik kamayishi bo'yicha tartiblash;
 *   f) yig'indi p dan kichik bo'lmaguncha qo'shish;  g) shu kataklar to'plami — soha.
 * Note 3: to'r maydaligi natijaga ta'sir qiladi; Note 4: M katta bo'lishi kerak; Note 5: soha uzilgan bo'lishi mumkin;
 * Note 7: teng ehtimolli kataklar tartibi bir qiymatli emas — bu yerda katak indeksi bo'yicha (deterministik).
 * LOYIHA QARORLARI (egasi tasdig'ini kutadi): standart to'r 100 × 100 (manbadagi misol), teng kataklar tartibi.
 * @param {Float64Array|number[]} a  birinchi chiqish qiymatlari (n ta)
 * @param {Float64Array|number[]} b  ikkinchi chiqish qiymatlari
 * @returns {{mesh:number, bounds:number[][], cellArea:number, cells:number, area:number, count:number, fraction:number, M:number, rows:number[][][]}|null}
 *   rows[iy] — shu qatordagi tanlangan kataklar oraliqlari [[ix0, ix1], …] (chizish uchun); null — soha aniqlanmagan
 */
export function smallestRegion(a, b, n, P, mesh = SMALLEST_MESH.default) {
  if (!(n > 0)) return null;
  let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
  for (let r = 0; r < n; r++) {
    const x = a[r], y = b[r];
    if (x < a0) a0 = x; if (x > a1) a1 = x;
    if (y < b0) b0 = y; if (y > b1) b1 = y;
  }
  if (!(a1 > a0) || !(b1 > b0) || !isFinite(a1 - a0) || !isFinite(b1 - b0)) return null;
  const counts = new Uint32Array(mesh * mesh);
  const sx = mesh / (a1 - a0), sy = mesh / (b1 - b0);
  for (let r = 0; r < n; r++) {
    let ix = Math.floor((a[r] - a0) * sx), iy = Math.floor((b[r] - b0) * sy);
    if (ix >= mesh) ix = mesh - 1;                     // eng katta qiymat — oxirgi katakka
    if (iy >= mesh) iy = mesh - 1;
    counts[iy * mesh + ix]++;
  }
  const order = Array.from({ length: mesh * mesh }, (_, i) => i).filter(i => counts[i] > 0).sort((i, j) => (counts[j] - counts[i]) || (i - j));
  const need = P * n;
  const chosen = new Uint8Array(mesh * mesh);
  let count = 0, cells = 0;
  for (const i of order) {
    if (count >= need) break;                          // f): yig'indi p dan kichik bo'lmaganda to'xtash
    chosen[i] = 1; count += counts[i]; cells++;
  }
  const rows = [];
  for (let iy = 0; iy < mesh; iy++) {
    const runs = [];
    let start = -1;
    for (let ix = 0; ix <= mesh; ix++) {
      const on = ix < mesh && chosen[iy * mesh + ix] === 1;
      if (on && start < 0) start = ix;
      if (!on && start >= 0) { runs.push([start, ix - 1]); start = -1; }
    }
    rows.push(runs);
  }
  const cellArea = (a1 - a0) / mesh * ((b1 - b0) / mesh);
  return { mesh, bounds: [[a0, a1], [b0, b1]], cellArea, cells, area: cells * cellArea, count, fraction: count / n, M: n, rows };
}
