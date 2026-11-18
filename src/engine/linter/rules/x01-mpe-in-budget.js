/* X1 — kalibrlanayotgan asbobning ruxsat etilgan xatosi (MPE) noaniqlik byudjetida turibdi.
   Kalibrlashda aniqlanayotgan kattalik — asbobning ko'rsatish xatosining o'zi (JCGM 100:2008 3.4.5);
   MPE — asbobga qo'yilgan talab, u bilan natija SOLISHTIRILADI (muvofiqlik). MPE faqat asbob o'lchash VOSITASI
   sifatida ishlatilganda noaniqlik manbai bo'ladi (F.2.4.2 — "verified instruments").
   CLAUDE.md: "Kalibrlanayotgan asbobning MPE'si hech qachon avtomatik ravishda noaniqlik manbai bo'lmaydi."
   Aniqlash:
     (a) muvofiqlik uchun kiritilgan MPE (settings.mpe) bilan B tur manbaning yarim kengligi bir xil (ifoda yoki son);
     (b) kalibrlash konteksti (model turi "xato" yoki MPE kiritilgan) va manba nomi "MPE / ruxsat etilgan xato"
         ga o'xshaydi, lekin etalon / kalibrator nomiga o'xshamaydi (etalon xatosi — qonuniy manba). */
import { finding, gumState, typeBOf, isMpeLike, isReferenceLike, isBlank, short } from '../util.js';
import { valueOrExpr } from '../../typeB.js';

const norm = s => String(s).replace(/\s+/g, '').toLowerCase();

const rule = {
  id: 'X1',
  severity: 'error',
  // Ref: JCGM 100:2008 3.4.5, F.2.4.2; ILAC P14 va COOMET R/GM/32 docs/references da yo'q
  ref: 'JCGM 100:2008 3.4.5, F.2.4.2; ILAC P14:09/2020 §5.4 (unverified); COOMET R/GM/32:2017 §8.3.1 (unverified)',
  modes: ['GUM'],
  codes: { x1_mpe_in_budget: {} },
  check(spec, result) {
    const state = gumState(spec);
    if (!state) return [];
    const settings = state.settings || {};
    const hasMpe = !isBlank(settings.mpe);
    const calibration = hasMpe || settings.modelKind === 'error' || state.domain === 'CALIBRATION';
    const means = Object.fromEntries((result.inputs || []).map(i => [i.name, i.mean]));
    const mpe = result.conf && result.conf.mpe > 0 ? result.conf.mpe : null;
    const out = [];
    for (const c of typeBOf(state)) {
      if (isReferenceLike(c) && !isMpeLike(c)) continue;
      let same = false;
      if (hasMpe && !isReferenceLike(c)) {
        if (typeof c.halfWidth === 'string' && typeof settings.mpe === 'string' && norm(c.halfWidth) === norm(settings.mpe) && isNaN(Number(norm(c.halfWidth)))) same = true;
        else if (mpe !== null) {
          let a = NaN;
          try { a = Math.abs(valueOrExpr(c.halfWidth, state.params || [], means)); } catch (_) { /* dvigatel bad_halfwidth qaytargan bo'lardi */ }
          same = isFinite(a) && Math.abs(a - mpe) <= 1e-9 * mpe;
        }
      }
      const named = calibration && isMpeLike(c) && !isReferenceLike(c);
      if (same || named) {
        const row = (result.budget || []).find(b => b.kind === 'B' && b.name === c.name && b.param === c.param);
        out.push(finding(rule, 'x1_mpe_in_budget', { source: c.name || `#${c.index + 1}`, param: c.param,
          value: row && isFinite(row.share) ? short(row.share, 3) : '' }));
      }
    }
    return out;
  },
};
export default rule;
