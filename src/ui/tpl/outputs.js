/* ═══════════════════════════════════════════════════════════════
   TPL/OUTPUTS.JS — P07b: shablon muharririda qo'shimcha chiqish kattaliklari (`outputs` — vektor model,
   JCGM 102:2011 §6.2). Sof modul (DOM yo'q): shablon obyektini o'zgartirish va jadval HTML'i.
   Birinchi chiqish — `measurand` + `model.formula` (o'zgarmagan); bu yerda ikkinchi va keyingilari.
   Tekshiruv — src/templates/interpreter.js::checkTemplate (belgi takrori, formula tahlili, noma'lum belgi).
   Har qanday qiymat ctx.esc orqali; hodisalar — app.js da (data-ed-out*, inline handler yo'q).
═══════════════════════════════════════════════════════════════ */

export const OUTPUT_FIELDS = Object.freeze(['symbol', 'unit', 'formula', 'name']);
export const MAX_OUTPUTS = 20;   // schemas/methodology.schema.json: outputs.maxItems

const clone = v => JSON.parse(JSON.stringify(v));

/** Band bo'lmagan belgi: y2, y3, … (asosiy chiqish, kirishlar, konstantalar va mavjud chiqishlar bilan to'qnashmaydi). */
export function freeSymbol(tpl) {
  const used = new Set([(tpl.measurand || {}).symbol, ...(tpl.inputs || []).map(i => i.symbol), ...(tpl.constants || []).map(c => c.symbol), ...(tpl.outputs || []).map(o => o.symbol)]);
  const base = (tpl.measurand && tpl.measurand.symbol) || 'y';
  for (let n = 2; n < 1000; n++) if (!used.has(base + n)) return base + n;
  return base + '_new';
}

/** Yangi chiqish qo'shish (nusxa qaytaradi). Formula — "belgi = " (foydalanuvchi to'ldiradi; bo'sh formula tekshiruvdan o'tmaydi). */
export function addOutput(tpl) {
  const t = clone(tpl);
  if ((t.outputs || []).length >= MAX_OUTPUTS) return t;
  const symbol = freeSymbol(t);
  t.outputs = [...(t.outputs || []), { symbol, unit: '', formula: `${symbol} = ` }];
  return t;
}

/** n-chi chiqishni o'chirish; oxirgisi o'chsa `outputs` maydoni olib tashlanadi (sxema: minItems 1). */
export function removeOutput(tpl, n) {
  const t = clone(tpl);
  const list = (t.outputs || []).filter((_, i) => i !== n);
  if (list.length) t.outputs = list; else delete t.outputs;
  return t;
}

/**
 * Maydonni o'zgartirish. `symbol` o'zgarsa va formula "eski_belgi = …" bilan boshlansa — chap tomoni ham yangilanadi.
 * `name` — bitta matn: yangi nom uchun uchala tilga yoziladi (keyin JSON da tilma-til tahrirlanadi), mavjud nomda faqat `lang`.
 */
export function setOutputField(tpl, n, field, value, lang = 'uz') {
  const t = clone(tpl);
  const o = (t.outputs || [])[n];
  if (!o || !OUTPUT_FIELDS.includes(field)) return t;
  const v = String(value === null || value === undefined ? '' : value);
  if (field === 'name') {
    const s = v.trim();
    if (!s) delete o.name;
    else o.name = o.name && typeof o.name === 'object' ? { ...o.name, [lang]: s } : { uz: s, ru: s, en: s };
  } else if (field === 'symbol') {
    const old = o.symbol, s = v.trim();
    const m = /^\s*([^=]*?)\s*=(.*)$/.exec(o.formula || '');
    if (m && m[1] === old) o.formula = `${s} =${m[2]}`;
    o.symbol = s;
  } else o[field] = field === 'formula' ? v.trim() : v.trim();
  return t;
}

/** Jadval HTML'i. @param {{t:Function, esc:Function, lang?:string}} ctx  @param {boolean} locked  bo'lim qulflangan (APPROVED) */
export function outputsHTML(tpl, ctx, locked) {
  const { t, esc } = ctx, lang = ctx.lang || 'uz';
  const dis = locked ? ' disabled' : '';
  const list = tpl.outputs || [];
  const cell = (o, n, f, cls) => `<td><input type="text" data-ed-out="${n}" data-ed-out-field="${f}"${cls ? ` class="${cls}"` : ''} value="${esc(f === 'name' ? ((o.name || {})[lang] || (o.name || {}).uz || '') : (o[f] || ''))}"${dis} autocomplete="off" /></td>`;
  return `<div class="tpl-ed-sub" data-ed-outputs="${list.length}">${esc(t('ed_outputs'))}</div>
    <p class="text-xs text-muted">${esc(t('ed_outputs_hint'))}</p>
    ${list.length ? `<table class="data-table tpl-ed-outputs"><thead><tr><th>${esc(t('ed_symbol'))}</th><th>${esc(t('unit_ph'))}</th><th>${esc(t('ed_output_formula'))}</th><th>${esc(t('ed_name'))}</th><th></th></tr></thead><tbody>
      ${list.map((o, n) => `<tr data-ed-out-row="${n}">${cell(o, n, 'symbol', 'mono')}${cell(o, n, 'unit')}${cell(o, n, 'formula', 'mono')}${cell(o, n, 'name')}
        <td><button type="button" class="btn btn-ghost btn-sm" data-ed="del-output" data-n="${n}"${dis} title="${esc(t('ed_output_del'))}">×</button></td></tr>`).join('')}
    </tbody></table>` : ''}
    <button type="button" class="btn btn-outline btn-sm" data-ed="add-output"${locked || list.length >= MAX_OUTPUTS ? ' disabled' : ''}>${esc(t('ed_output_add'))}</button>`;
}
