/* ═══════════════════════════════════════════════════════════════
   CONFORMITY.JS — MPE bilan muvofiqlik (oddiy va himoyalangan qabul), γ.
   P05a (RISKS R-07): funksiya |y| ni xato deb FARAZ QILMAYDI — unga og'ish (deviation) beriladi:
     model turi 'error'  → deviation = E (ko'rsatish xatosi E = X − X_ref);
     model turi 'value'  → deviation = Y − Y_nom (kattalik qiymati, nominal bilan);
     model turi 'unknown' → pendingConformity(): bayonot berilmaydi, foydalanuvchidan tanlov so'raladi.
   Ref: ISO/IEC 17025:2017 §7.8.6; JCGM 106:2012 §8 (docs/references da hali yo'q — tekshirilmagan);
        ILAC G8:09/2019 (yo'q — tekshirilmagan).
═══════════════════════════════════════════════════════════════ */

/** Model turlari: 'error' — E = X − X_ref; 'value' — Y (nominal bilan); 'unknown' — ko'rsatilmagan. */
export const MODEL_KINDS = ['error', 'value', 'unknown'];

/**
 * @param {number} deviation  ruxsat etilgan chegara bilan solishtiriladigan og'ish (E yoki Y − Y_nom)
 * @param {number} U          kengaytirilgan noaniqlik
 * @param {number} mpe        ruxsat etilgan chegara (musbat)
 */
export function conformity(deviation, U, mpe) {
  if (!(mpe > 0)) return { mpe: mpe || 0, simple: 'na', guarded: 'na', ratio: null };
  const e = Math.abs(deviation);
  return {
    mpe, ratio: U / mpe,
    simple:  e <= mpe ? 'ok' : 'fail',
    guarded: e + U <= mpe ? 'ok' : (e - U > mpe ? 'fail' : 'zone'),
  };
}

/** Model turi (yoki nominal) ko'rsatilmagan: muvofiqlik bayonoti berilmaydi. pending: 'model_kind' | 'nominal'. */
export function pendingConformity(U, mpe, pending) {
  return { mpe: mpe > 0 ? mpe : (mpe || 0), ratio: mpe > 0 ? U / mpe : null, simple: 'na', guarded: 'na', pending };
}

/**
 * Ko'p nuqtali sertifikat: bir xil k (eng kattasi) barcha nuqtalarga.
 * Ref: COOMET R/GM/32:2017 §5.7.3 (docs/references da yo'q — tekshirilmagan).
 * @param {{k:number, uc:number, y:number, deviation?:number, conf?:{mpe:number, pending?:string}}[]} results
 * @param {boolean} uniformK
 * @returns {{k:number, U:number, conf:object|null}[]}
 */
export function multiPointCoverage(results, uniformK) {
  const kmax = results.reduce((m, r) => Math.max(m, r.k), 0);
  return results.map(r => {
    const k = uniformK ? kmax : r.k;
    const U = k * r.uc;
    // og'ish — natijadagi `deviation` (P05a: E yoki Y − Y_nom). Model turi ko'rsatilmagan yoki eski saqlangan natijada
    // (ENGINE ≤ 2.3.0 — `deviation` maydoni yo'q) |y| xato deb FARAZ QILINMAYDI: bayonot berilmaydi (R-07).
    let conf = null;
    if (r.conf) {
      const dev = r.deviation;
      if (r.conf.pending || dev === undefined || dev === null || !isFinite(dev)) conf = pendingConformity(U, r.conf.mpe, r.conf.pending || 'model_kind');
      else conf = conformity(dev, U, r.conf.mpe);
    }
    return { k, U, conf };
  });
}
