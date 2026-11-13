/* ═══════════════════════════════════════════════════════════════
   CONFORMITY.JS — MPE bilan muvofiqlik (oddiy va himoyalangan qabul), γ.
   y — xato (asbob ko'rsatkichi − etalon) deb faraz qilinadi (RISKS R-07).
   Ref: ISO/IEC 17025:2017 §7.8.6; JCGM 106:2012 §8 (docs/references da hali yo'q — tekshirilmagan);
        ILAC G8:09/2019 (yo'q — tekshirilmagan).
═══════════════════════════════════════════════════════════════ */

export function conformity(y, U, mpe) {
  if (!(mpe > 0)) return { mpe: mpe || 0, simple: 'na', guarded: 'na', ratio: null };
  const e = Math.abs(y);
  return {
    mpe, ratio: U / mpe,
    simple:  e <= mpe ? 'ok' : 'fail',
    guarded: e + U <= mpe ? 'ok' : (e - U > mpe ? 'fail' : 'zone'),
  };
}

/**
 * Ko'p nuqtali sertifikat: bir xil k (eng kattasi) barcha nuqtalarga.
 * Ref: COOMET R/GM/32:2017 §5.7.3 (docs/references da yo'q — tekshirilmagan).
 * @param {{k:number, uc:number, y:number, conf?:{mpe:number}}[]} results
 * @param {boolean} uniformK
 * @returns {{k:number, U:number, conf:object|null}[]}
 */
export function multiPointCoverage(results, uniformK) {
  const kmax = results.reduce((m, r) => Math.max(m, r.k), 0);
  return results.map(r => {
    const k = uniformK ? kmax : r.k;
    const U = k * r.uc;
    return { k, U, conf: r.conf ? conformity(r.y, U, r.conf.mpe) : null };
  });
}
