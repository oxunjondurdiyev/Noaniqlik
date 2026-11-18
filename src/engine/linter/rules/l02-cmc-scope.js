/* L2 — akkreditatsiya sohasi (CMC jadvali) bilan bog'liq tekshiruvlar (P11).
   Dvigatel `settings.cmcRow` (jadval qatorining hisobda saqlangan nusxasi) va `settings.cmcX` dan CMC(X) ni topadi
   (src/engine/lab/cmc.js). U < CMC(X) — mavjud X8 qoidasi (`below_cmc`); bu qoida faqat sohaga tegishli holatlar:
   outside_scope  (warning)  X qator diapazonidan tashqarida — natija akkreditatsiya sohasidan tashqarida;
                             CMC bilan solishtirilmaydi (ILAC P14:09/2020 §4.1 c), §4.2 — p. 6: soha diapazon bilan beriladi).
   cmc_x_missing  (warning)  CMC qatori tanlangan, lekin X (o'lchanadigan kattalik qiymati) ko'rsatilmagan — CMC topilmadi.
   cmc_unauthenticated (info) CMC jadvali autentifikatsiyasiz (rol 'guest') kiritilgan.
   Daraja — loyiha qarori (docs/LINTER_RULES.md §4 #28). */
import { finding, short } from '../util.js';

const rule = {
  id: 'L2',
  severity: 'warning',
  ref: 'ILAC P14:09/2020 §4.1 c), §4.2 (p. 6)',
  modes: ['GUM'],
  codes: { outside_scope: {}, cmc_x_missing: {}, cmc_unauthenticated: { severity: 'info', ref: 'docs/LINTER_RULES.md §4 #29 (loyiha qoidasi)' } },
  check(spec, result) {
    const c = result.cmcCheck;
    if (!c) return [];
    const out = [];
    // CMC jadvali tizimga kirmasdan (rol 'guest') kiritilgan — info (egasi qarori 2026-11-18)
    if (c.enteredBy === 'guest') out.push(finding(rule, 'cmc_unauthenticated', { source: c.quantity || undefined, key: c.rowId || '', severity: 'info', ref: rule.codes.cmc_unauthenticated.ref }));
    if (c.pending === 'x') out.push(finding(rule, 'cmc_x_missing', { source: c.quantity || undefined, key: c.rowId || '' }));
    else if (c.inRange === false) {
      out.push(finding(rule, 'outside_scope', { source: c.quantity || undefined, key: c.rowId || '', value: `X = ${short(c.x, 6)} ∉ [${short(c.min, 6)}; ${short(c.max, 6)}]${c.unit ? ' ' + c.unit : ''}` }));
    }
    return out;
  },
};
export default rule;
