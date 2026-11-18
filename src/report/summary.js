/* ═══════════════════════════════════════════════════════════════
   SUMMARY.JS — ko'p nuqtali kalibrlash: umumiy jadval qatorlari (P05b; avval src/js/points.js::summary da edi).
   Yagona k tanlansa barcha nuqtalarga eng katta k qo'llanadi (COOMET R/GM/32:2017 §5.7.3 — repoda yo'q, unverified);
   muvofiqlik va qaror qoidasi yangi U bilan qayta hisoblanadi (dvigatel: multiPointCoverage).
   Yaxlitlash faqat shu yerda (hisobot qatlami): U ≤ 2 qiymatli raqam, y — U ning oxirgi xonasigacha.
═══════════════════════════════════════════════════════════════ */
import { multiPointCoverage } from '../engine/index.js';
import { roundResult } from './rounding.js';

/**
 * @param {{id:string, label:string, result:object, snapshot?:object, acceptances?:object, meta?:object}[]} points
 * @param {boolean} uniformK
 * @returns {{id, label, r, k, U, rr, conf, decision, point}[]}
 */
export function summaryRows(points, uniformK) {
  const items = (points || []).filter(p => p && p.result && !p.result.error);
  const cov = multiPointCoverage(items.map(p => p.result), !!uniformK);
  return items.map((p, i) => {
    const r = p.result;
    const { k, U, conf, decision } = cov[i];
    return { id: p.id, label: p.label, r, k, U, rr: roundResult(r.y, U, r.roundUp), conf, decision, point: p };
  });
}
