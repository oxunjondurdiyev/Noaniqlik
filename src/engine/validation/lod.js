/* ═══════════════════════════════════════════════════════════════
   VALIDATION/LOD.JS — aniqlash (LOD) va miqdoriy aniqlash (LOQ) chegaralari (P12). Sof modul.

   (1) Blank / past konsentratsiyali namuna takrorlari asosida:
         s′₀ = s₀/√n                    (blank tuzatmasi qo'llanmaydi; n — natija berishda o'rtachalanadigan takrorlar soni)
         s′₀ = s₀·√(1/n + 1/n_b)        (blank tuzatmasi qo'llanadi; n_b — blank o'rtachasidagi kuzatuvlar soni)
         LOD = 3·s′₀;  LOQ = k_Q·s′₀,  k_Q = 10 (standart; 5 yoki 6 ham ishlatiladi)
       MANBA REPODA YO'Q: Eurachem "The Fitness for Purpose of Analytical Methods", 2nd ed. (2014) §6.2 — egasi
       docs/references/Eurachem_Fitness_for_Purpose_2014.pdf ni qo'shadi → hozircha (unverified), test `todo`.
   (2) Kalibrlash grafigi asosida:  LOD = 3,3·s_y/x / b;  LOQ = 10·s_y/x / b   (s_y/x — qoldiq standart og'ishi, b — qiyalik;
       P08 regressiyasi hisoblaydi). MANBA REPODA YO'Q (ICH Q2(R1) §6.3, §7.3) → (unverified).
   Ikkala usulda natijada `lod_unverified` / `lod_calibration_unverified` topilmasi chiqadi.
═══════════════════════════════════════════════════════════════ */
import { sampleOf, num, has, fail } from './util.js';
import { evaluateRegression } from '../regression/index.js';

export const LOD_FACTOR = 3;
export const LOQ_FACTOR_DEFAULT = 10;      // k_Q — LOYIHA STANDARTI (R-26 #5), Eurachem FfP 2014 (unverified)
export const LOD_CAL_FACTOR = 3.3;
export const LOQ_CAL_FACTOR = 10;
export const LOD_METHODS = Object.freeze(['blank', 'calibration']);
export const LOD_REF = 'Eurachem Fitness for Purpose (2014) §6.2 (unverified)';
export const LOD_CAL_REF = 'ICH Q2(R1) §6.3, §7.3 (unverified)';

/**
 * Blank asosida.
 * @param {{values?:number[], sd?:number, n?:number, replicates?:number, blankCorrection?:boolean, blankReplicates?:number, kQ?:number}} spec
 *        values (yoki sd + n) — s₀ ni baholash uchun takrorlar; replicates — natija berishdagi takrorlar soni n (standart 1)
 */
export function lodFromBlank(spec) {
  const s = sampleOf(spec.values ? spec.values : { sd: spec.sd, n: spec.n, mean: spec.mean }, 'lod.values', 2);
  const n = has(spec.replicates) ? num(spec.replicates, 'lod.replicates') : 1;
  if (!Number.isInteger(n) || n < 1) fail('validation_bad_data', 'lod.replicates');
  const kQ = has(spec.kQ) ? num(spec.kQ, 'lod.kQ') : LOQ_FACTOR_DEFAULT;
  if (!(kQ > 0)) fail('validation_bad_data', 'lod.kQ');
  let nb = null, factor = 1 / n;
  if (spec.blankCorrection === true) {
    nb = num(spec.blankReplicates, 'lod.blankReplicates');
    if (!Number.isInteger(nb) || nb < 1) fail('validation_bad_data', 'lod.blankReplicates');
    factor += 1 / nb;
  }
  if (!(s.sd > 0)) fail('validation_zero_sd', 's0 = 0');
  const s0p = s.sd * Math.sqrt(factor);
  return { method: 'blank', s0: s.sd, nObs: s.n, nu: s.n - 1, replicates: n, blankCorrection: spec.blankCorrection === true, blankReplicates: nb, s0Prime: s0p, kQ, lod: LOD_FACTOR * s0p, loq: kQ * s0p, ref: LOD_REF, unverified: true };
}

/**
 * Kalibrlash grafigi asosida (OLS to'g'ri chiziq — P08 dvigateli; yangi formula yo'q).
 * @param {{points:{x:number,y:number}[]}} spec
 */
export function lodFromCalibration(spec) {
  const fit = evaluateRegression({ format: 'uc-regression/1', method: 'OLS', model: { degree: 1 }, points: spec.points || [] });
  if (fit.error) fail('validation_bad_data', `lod.points: ${fit.error}`);
  const b = fit.params.find(p => p.name === 'b').value;
  if (!(b !== 0) || !(fit.s > 0)) fail('validation_zero_sd', 'b = 0 or s = 0');
  const r = fit.s / Math.abs(b);
  return { method: 'calibration', syx: fit.s, slope: b, intercept: fit.params.find(p => p.name === 'a').value, nu: fit.nu, lod: LOD_CAL_FACTOR * r, loq: LOQ_CAL_FACTOR * r, ref: LOD_CAL_REF, unverified: true };
}
