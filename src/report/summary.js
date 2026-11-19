/* ═══════════════════════════════════════════════════════════════
   SUMMARY.JS — ko'p nuqtali kalibrlash: umumiy jadval qatorlari (P05b; avval src/js/points.js::summary da edi).
   Yagona k tanlansa barcha nuqtalarga eng katta k qo'llanadi (COOMET R/GM/32:2017 §5.7.3 — repoda yo'q, unverified);
   muvofiqlik va qaror qoidasi yangi U bilan qayta hisoblanadi (dvigatel: multiPointCoverage).
   Yaxlitlash faqat shu yerda (hisobot qatlami): U ≤ 2 qiymatli raqam, y — U ning oxirgi xonasigacha.
═══════════════════════════════════════════════════════════════ */
import { multiPointCoverage } from '../engine/index.js';
import { roundResult } from './rounding.js';

/** Vektor (bir nechta chiqishli) natija — JCGM 102:2011 (mode: 'MULTIVARIATE'). */
export const isVectorResult = r => !!r && r.mode === 'MULTIVARIATE' && Array.isArray(r.results);

/**
 * Ko'p chiqish + ko'p nuqta (P07b). Egasi qarori (2026-11-19, 8-band):
 *   • YAGONA k YO'Q — COOMET R/GM/32 §5.7.3 dagi "eng katta k" qoidasi vektor natijaga qo'llanmaydi;
 *   • U_j — har bir chiqish o'zining bir o'lchovli qoidasi bilan (o'z k_j, ν_eff,j);
 *   • chiqishlarning birgalikdagi qamrovi — faqat qamrov sohasi (k_p; Ref: JCGM 102:2011 §6.5);
 *   • har bir nuqta alohida; nuqtalar orasidagi birgalikdagi soha hisoblanmaydi (faqat so'ralganda — hozircha yo'q).
 * Yaxlitlash shu yerda (hisobot qatlami).
 * @param {{id:string, label:string, result:object, snapshot?:object, acceptances?:object, meta?:object}[]} points
 * @returns {{id, label, r, point, P, kp, kq, singular, outputs:{symbol, unit, y, U, k, uc, nuEff, rr}[]}[]}
 */
export function vectorSummaryRows(points) {
  return (points || []).filter(p => p && isVectorResult(p.result) && !p.result.error).map(p => {
    const r = p.result, g = r.coverageRegion || {};
    return {
      id: p.id, label: p.label, r, point: p, P: r.P,
      kp: g.ellipsoid ? g.ellipsoid.kp : null, kq: g.rectangle ? g.rectangle.kq : null, singular: !!g.singular,
      outputs: r.results.map((x, j) => ({
        symbol: r.symbols[j], unit: (r.outputs[j] && r.outputs[j].unit) || x.unit || '',
        y: x.y, U: x.U, k: x.k, uc: x.uc, nuEff: x.nuEff, rr: roundResult(x.y, x.U, x.roundUp),
      })),
    };
  });
}

/**
 * @param {{id:string, label:string, result:object, snapshot?:object, acceptances?:object, meta?:object}[]} points
 * @param {boolean} uniformK
 * @returns {{id, label, r, k, U, rr, conf, decision, point}[]}
 */
export function summaryRows(points, uniformK) {
  const items = (points || []).filter(p => p && p.result && !p.result.error && !isVectorResult(p.result));
  const cov = multiPointCoverage(items.map(p => p.result), !!uniformK);
  return items.map((p, i) => {
    const r = p.result;
    const { k, U, conf, decision } = cov[i];
    return { id: p.id, label: p.label, r, k, U, rr: roundResult(r.y, U, r.roundUp), conf, decision, point: p };
  });
}
