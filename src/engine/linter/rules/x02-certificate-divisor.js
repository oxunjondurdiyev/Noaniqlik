/* X2 — sertifikatdan olingan kengaytirilgan noaniqlik noto'g'ri bo'luvchi bilan kiritilgan.
   Sertifikat U ni qamrov koeffitsiyenti k bilan beradi: u = U / k (JCGM 100:2008 4.3.3). Normal taqsimot tanlanib
   k = 1 (U standart noaniqlik deb olingan) yoki k = √3 qo'yilgan bo'lsa — ehtimol xato.
   To'g'ri burchakli taqsimot (a/√3) faqat sertifikat chegaralarni bergan holda o'rinli (4.3.7) — info. */
import { finding, gumState, typeBOf, isCertificateLike, toNum, short } from '../util.js';

const rule = {
  id: 'X2',
  severity: 'warning',
  ref: 'JCGM 100:2008 4.3.3, 4.3.4; EA-4/02 M:2022 §3.3.2 (a)',
  modes: ['GUM'],
  codes: { x2_certificate_divisor: {}, x2_certificate_rect: { severity: 'info', ref: 'JCGM 100:2008 4.3.3, 4.3.7' } },
  check(spec) {
    const state = gumState(spec);
    if (!state) return [];
    const out = [];
    for (const c of typeBOf(state)) {
      if (!isCertificateLike(c)) continue;
      const source = c.name || `#${c.index + 1}`;
      if (c.distribution === 'normal') {
        const k = toNum(c.k);
        if (isFinite(k) && (Math.abs(k - 1) < 1e-9 || Math.abs(k - Math.sqrt(3)) < 0.005)) {
          out.push(finding(rule, 'x2_certificate_divisor', { source, param: c.param, value: `k = ${short(k, 4)}` }));
        }
      } else if (c.distribution === 'rect') {
        out.push(finding(rule, 'x2_certificate_rect', { source, param: c.param, severity: 'info', ref: rule.codes.x2_certificate_rect.ref }));
      }
    }
    return out;
  },
};
export default rule;
