/* ═══════════════════════════════════════════════════════════════
   FLOW/MODEL.JS — P22-1 (audit 21.11.2026: UX-01, UX-02, UX-04): yagona "Yangi hisob" oqimining sof modeli.
   DOM yo'q — Node'da test qilinadi (tests/ui/flow.test.js). HISOB YO'Q: bu yerda faqat kiritish holati tartibga
   solinadi (parametrlar ro'yxati, jadval qatorlari soni).
   • P (parametrlar) — formuladan: mavjud parser tokenlari orqali (src/engine/parser.js::tokenize — o'zgartirilmagan).
   • N (qatorlar)   — jadvaldan: oxirgi to'ldirilgan qator + bitta bo'sh qator (bo'sh qator MAX_ROWS gacha).
     Excel / CSV dan qo'yish — mavjud src/ui/io/app.js::pasteGum (P05b); u qatorlarni o'zi uzaytiradi.
   Foydalanuvchi kiritgan qiymat hech qachon jimgina o'chirilmaydi: formulada qolmagan, lekin ma'lumoti bor parametr
   saqlanadi va `unused` ro'yxatida qaytadi (ekranda ogohlantirish + "olib tashlash" — foydalanuvchi qarori).
═══════════════════════════════════════════════════════════════ */

/** Jadval qatorlarining yuqori chegarasi (avvalgi `n` maydonining max qiymati bilan bir xil). */
export const MAX_ROWS = 100;
/** Formula bo'sh bo'lganda yagona parametr — to'g'ridan-to'g'ri o'lchash (y = x). */
export const DEFAULT_PARAM = 'x';

const blank = v => v === undefined || v === null || String(v).trim() === '';

/** "y = expr" → expr (src/engine/parser.js::splitFormula bilan bir xil qoida; bu yerda dvigatelga bog'liqliksiz). */
function exprOf(formula) {
  const src = String(formula || '').trim();
  const i = src.indexOf('=');
  return i === -1 ? src : src.slice(i + 1).trim();
}

/**
 * Formulalarda qatnashgan o'zgaruvchilar — birinchi uchrash tartibida.
 * Mavjud nomlar (`known`) parserga beriladi — "mV" kabi yozuv avvalgidek m·V deb o'qiladi; noma'lum so'z yangi
 * parametr bo'ladi (parser `unknown:<so'z>` xatosini beradi — shu so'z qo'shilib, qayta tokenlanadi).
 * @param {string[]} formulas  model formulalari ("y = …" yoki faqat ifoda)
 * @param {string[]} known     mavjud parametr nomlari
 * @param {(src:string, params:string[]) => {t:string, v:any}[]} tokenize  dvigatel tokenizatori
 * @returns {{ used: string[], added: string[], error: string|null }}
 */
export function formulaParams(formulas, known, tokenize) {
  const names = [...(known || [])];
  const used = [], added = [];
  for (const f of formulas || []) {
    const expr = exprOf(f);
    if (!expr) continue;
    let tokens = null;
    for (let guard = 0; guard < 64 && !tokens; guard++) {
      try { tokens = tokenize(expr, names); } catch (e) {
        const m = /^unknown:(.+)$/.exec(String((e && e.message) || ''));
        // yangi nom harf yoki "_" bilan boshlanadi (parser istalgan belgini qabul qiladi, lekin "#" kabi belgi — nom emas:
        // formula xato deb hisoblanadi va parametrlar o'zgarmaydi). Avval saqlangan nomlar (`known`) bu cheklovga tushmaydi.
        if (!m || !/^[\p{L}_]/u.test(m[1]) || names.includes(m[1])) return { used: [], added: [], error: m ? m[1] : 'syntax' };
        names.push(m[1]); added.push(m[1]);
      }
    }
    if (!tokens) return { used: [], added: [], error: 'syntax' };
    for (const t of tokens) if (t.t === 'var' && !used.includes(t.v)) used.push(t.v);
  }
  return { used, added: added.filter(a => used.includes(a)), error: null };
}

/** Parametrning foydalanuvchi kiritgan ma'lumoti bormi (kuzatuv yoki B tur manbasi)? */
export function hasData(state, param) {
  const st = state || {};
  if (((st.measurements || {})[param] || []).some(v => !blank(v))) return true;
  return (st.typeB || []).some(c => c && c.param === param);
}

/**
 * Formula o'zgargandan keyingi parametrlar ro'yxati.
 *  • formulada qatnashganlar — qoladi / qo'shiladi (formuladagi tartibda);
 *  • formulada yo'q va ma'lumotsiz — olib tashlanadi;
 *  • formulada yo'q, lekin ma'lumoti bor — QOLADI (`unused`), qarorni foydalanuvchi beradi;
 *  • formula bo'sh — ro'yxat o'zgarmaydi (bo'sh ro'yxat → ['x']).
 * Formula xato bo'lsa (`error`) — ro'yxat o'zgarmaydi.
 * @returns {{ params: string[], added: string[], removed: string[], unused: string[], error: string|null, changed: boolean }}
 */
export function syncParams(state, tokenize) {
  const st = state || {};
  const cur = Array.isArray(st.params) ? st.params : [];
  const formulas = [(st.model || {}).formula || ''].concat((Array.isArray(st.outputs) ? st.outputs.slice(1) : []).map(o => (o && o.formula) || ''));
  const same = { params: cur.length ? cur : [DEFAULT_PARAM], added: [], removed: [], unused: [], error: null, changed: !cur.length };
  if (!formulas.some(f => exprOf(f))) return same;
  const r = formulaParams(formulas, cur, tokenize);
  if (r.error) return { ...same, error: r.error };
  const unused = cur.filter(p => !r.used.includes(p) && hasData(st, p));
  const removed = cur.filter(p => !r.used.includes(p) && !unused.includes(p));
  const params = r.used.concat(unused);
  if (!params.length) return same;
  const changed = params.length !== cur.length || params.some((p, i) => p !== cur[i]);
  return { params, added: r.added, removed, unused, error: null, changed };
}

/** Kamida bitta parametrda qiymati bor oxirgi qator indeksi + 1 (0 — jadval bo'sh). */
export function usedRows(state) {
  const st = state || {};
  let used = 0;
  for (const p of st.params || []) {
    const a = (st.measurements || {})[p] || [];
    for (let i = a.length - 1; i >= used; i--) if (!blank(a[i])) { used = i + 1; break; }
  }
  return used;
}

/**
 * Jadval qatorlari soni: to'ldirilgan qatorlar + bitta bo'sh qator. Bo'sh qator faqat MAX_ROWS gacha qo'shiladi;
 * import / qo'yish bilan kelgan undan ortiq qatorlar (src/io/import.js::LIMITS.maxTableRows) hech qachon kesilmaydi.
 */
export function fitRows(state, max = MAX_ROWS) {
  const used = usedRows(state);
  return used >= max ? used : used + 1;
}

/** Yangi (bo'sh) hisob holati — mavzu va til saqlanadi (appState ularni alohida saqlaydi). */
export function blankCalc() {
  return {
    n: 1, params: [DEFAULT_PARAM], measurements: { [DEFAULT_PARAM]: [''] }, typeA: {}, typeB: [], combined: null,
    model: { formula: '', unit: '' }, outputs: undefined, implicit: undefined, covB: {}, units: {}, template: null,
    settings: { paired: true, P: 0.9545, modelKind: 'unknown' }, directions: [], points: [], currentPoint: null,
    acceptances: {}, calcMeta: null,
  };
}

/** Hisob boshlanganmi (davom ettirish mumkinmi)? — kiritilgan kuzatuv, formula, B tur manbasi yoki shablon bor. */
export function hasSession(state) {
  const st = state || {};
  if (!Array.isArray(st.params) || !st.params.length) return false;
  return usedRows(st) > 0 || !!String((st.model || {}).formula || '').trim() || (st.typeB || []).length > 0 || !!st.template || (st.points || []).length > 0;
}

/**
 * Qadamdan keyingisiga o'tish mumkinmi? Faqat kiritish to'liqligini tekshiradi (hisob emas).
 * @param {'model'|'data'} step
 * @param {{ formulaOk: boolean, hasFormula: boolean, typeA: object }} facts  formulaOk — parser xatosiz o'qidi
 * @returns {null|'need_formula'|'bad_formula'|'need_data'}
 */
export function stepBlocker(step, state, facts) {
  const st = state || {};
  const multi = (st.params || []).length > 1;
  if (!st.implicit) {
    if (multi && !facts.hasFormula) return 'need_formula';
    if (facts.hasFormula && !facts.formulaOk) return 'bad_formula';
  }
  if (step === 'data' && (st.params || []).some(p => !(facts.typeA || {})[p])) return 'need_data';
  return null;
}
