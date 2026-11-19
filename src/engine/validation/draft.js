/* ═══════════════════════════════════════════════════════════════
   VALIDATION/DRAFT.JS — validatsiya natijasidan TOP_DOWN shablon QORALAMASI (P12). Sof modul.
   Qoralama — foydalanuvchining shaxsiy shabloni (builtin emas), status har doim DRAFT. APPROVED holatiga faqat
   docs/templates/APPROVAL_CHECKLIST.md bo'yicha (shablon muharriri). Raqamlar shablonning `validationBasis` bo'limida
   (u builtin shablonda TAQIQLANGAN — src/templates/interpreter.js::checkTemplate). Manba ma'lumotlar xeshi (RFC 8785 JCS,
   SHA-256) — chaqiruvchi hisoblaydi (src/storage/canonical.js::jcsHash; dvigatel sof — kripto yo'q) va `sourceHash` bilan beradi.
   s_Rw (yoki s_I) → usta: rwSources ['stated'] (s, n); siljish — recovery (QUAM) yoki bias bloki foydalanuvchi tanlovi.
═══════════════════════════════════════════════════════════════ */

const ID_RX = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const HASH_RX = /^[0-9a-f]{64}$/;
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {object} result  evaluateValidation() natijasi
 * @param {{id:string, date:string, sourceHash:string, precisionTest:string, recoveryTest?:string, title?:{uz,ru,en},
 *          measurand?:{symbol?:string, name?:{uz,ru,en}, unit?:string}, scale?:'relative'|'absolute', author?:string}} o
 * @returns {{template:object}|{error:string, detail?:string}}
 */
export function topDownDraft(result, o = {}) {
  if (!result || result.mode !== 'VALIDATION') return { error: 'draft_bad_result' };
  if (!ID_RX.test(String(o.id || '')) || String(o.id).length > 64) return { error: 'draft_bad_id', detail: String(o.id || '') };
  if (!DATE_RX.test(String(o.date || ''))) return { error: 'draft_bad_date' };
  if (!HASH_RX.test(String(o.sourceHash || ''))) return { error: 'draft_bad_hash' };
  const prec = (result.tests || []).find(t => t.id === o.precisionTest && !t.error);
  if (!prec || prec.type !== 'anova') return { error: 'draft_need_precision', detail: String(o.precisionTest || '') };
  const rec = o.recoveryTest ? (result.tests || []).find(t => t.id === o.recoveryTest && !t.error) : null;
  if (o.recoveryTest && (!rec || rec.type !== 'recovery')) return { error: 'draft_need_recovery', detail: String(o.recoveryTest) };
  const scale = o.scale === 'absolute' ? 'absolute' : 'relative';
  if (rec && scale !== 'relative') return { error: 'draft_recovery_relative' };
  const unit = (o.measurand && o.measurand.unit) || result.unit || '';
  if (scale === 'absolute' && !unit) return { error: 'draft_need_unit' };
  const text = (uz, ru, en) => ({ uz, ru, en });
  const title = o.title || text(`Top-down qoralama — ${result.method || o.id}`, `Черновик top-down — ${result.method || o.id}`, `Top-down draft — ${result.method || o.id}`);
  const basis = {
    source: 'validation', sourceHash: o.sourceHash, date: o.date,
    precision: { test: prec.id, sI: prec.sI, sr: prec.sr, sb: prec.sb, nuSr: prec.nu.sr, k: prec.k, N: prec.N, negativeComponent: !!prec.negative },
    ...(rec ? { recovery: { test: rec.id, Rm: rec.Rm, s: rec.s, n: rec.n, uRm: rec.uRm, significant: !!rec.significant, relativeUnit: rec.relativeUnit } } : {}),
  };
  const template = {
    schemaVersion: 'uc-template/1', id: o.id, version: '0.1.0', status: 'DRAFT', domain: 'TESTING', section: 'general',
    evaluationMode: 'TOP_DOWN',
    title,
    description: text(
      'Usul validatsiyasi natijalaridan avtomatik tuzilgan qoralama: u(R_w) — s_I (bir omilli ANOVA), siljish — tiklanish (bo\'lsa). Tasdiqlashdan oldin tekshiring.',
      'Черновик, автоматически составленный по результатам валидации: u(R_w) — s_I (однофакторный ANOVA), смещение — извлечение (если есть). Проверьте перед утверждением.',
      'Draft built automatically from method validation results: u(R_w) — s_I (one-way ANOVA), bias — recovery (if any). Check before approval.'),
    standards: [], labCount: null,
    sourceNote: text(
      `P12 qoralamasi (DRAFT), ${o.date}. Manba ma'lumotlar xeshi (RFC 8785, SHA-256): ${o.sourceHash}.`,
      `Черновик P12 (DRAFT), ${o.date}. Хэш исходных данных (RFC 8785, SHA-256): ${o.sourceHash}.`,
      `P12 draft (DRAFT), ${o.date}. Source data hash (RFC 8785, SHA-256): ${o.sourceHash}.`),
    ref: 'docs/TEMPLATE_GUIDE.md#13-validatsiyadan-top-down-qoralama-p12',
    measurand: { symbol: (o.measurand && o.measurand.symbol) || 'c', name: (o.measurand && o.measurand.name) || text('O\'lchanadigan kattalik', 'Измеряемая величина', 'Measurand'), unit },
    model: { formula: 'u_c = sqrt(u_Rw^2 + u_bias^2)', note: text('Tavsifiy formula (tahlil qilinmaydi).', 'Описательная формула (не разбирается).', 'Descriptive formula (not parsed).') },
    inputs: [{ symbol: (o.measurand && o.measurand.symbol) || 'c', name: text('Natija', 'Результат', 'Result'), unit, kind: 'observation' }],
    typeBSources: [],
    topDown: { basis: 'within', rwSources: ['stated'], biasSource: rec ? 'recovery_quam' : 'none', scale, covers: [], additional: [] },
    validationBasis: basis,
    openQuestions: [
      { id: 'Q1', owner: 'lab', text: text('⚠ s_I nazorat namunasining butun tahlil jarayonini qamraydimi? Qamralmagan omillarni qo\'shing (Nordtest TR 537 §5).', '⚠ Охватывает ли s_I весь ход анализа? Добавьте неохваченные факторы (Nordtest TR 537 §5).', '⚠ Does s_I cover the whole analytical process? Add the factors not covered (Nordtest TR 537 §5).') },
      { id: 'Q2', owner: 'lab', text: text('⚠ Metodika standarti ko\'rsatilmagan.', '⚠ Стандарт на методику не указан.', '⚠ The method standard is not specified.') },
    ],
    reporting: { reportType: 'test_report' },
    ...(o.author ? { author: String(o.author) } : {}),
    createdAt: o.date,
    history: [{ at: o.date, status: 'DRAFT', version: '0.1.0', note: 'P12 validation draft' }],
  };
  return { template };
}
