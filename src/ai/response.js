/* ═══════════════════════════════════════════════════════════════
   RESPONSE.JS — AI javobini tekshirish (P14). SOF modul (DOM, saqlash, tarmoq yo'q).
   AI javobi — ISHONCHSIZ ma'lumot (docs/AI_DESIGN.md §2.4, §6):
     1) hajm chegarasi → qat'iy JSON.parse (eval / Function yo'q);
     2) javob sxemasi (schemas/ai/*.json, additionalProperties: false) — src/templates/validator.js;
     3) mazmun tekshiruvlari: har bir SON manba parchasi bilan (parcha kirish matnida AYNAN bor, son parchada bor);
        birlik / o'lchamlik; kalibrlanayotgan asbob MPE si manba bo'la olmaydi; belgilash (HTML / skript) rad etiladi.
   Natija — faqat QORALAMA: sonlar `numbers` ro'yxatida turadi va foydalanuvchi har birini tasdiqlamaguncha
   shablonga / reestrga yozilmaydi (applyNumbers, certificateToCalibration).
   Bu modul HECH NARSA HISOBLAMAYDI: dvigateldan faqat birlik tahlilchisi (parseUnit) va shablon tekshiruvchisi
   (checkTemplate) tekshiruv uchun ishlatiladi; evaluate chaqirilmaydi.
═══════════════════════════════════════════════════════════════ */
import { validate } from '../templates/validator.js';
import { checkTemplate } from '../templates/interpreter.js';
import { parseUnit, dimEqual } from '../engine/units.js';

/** Chegaralar — yagona joy. */
export const RESPONSE_LIMITS = Object.freeze({ chars: 400000, depth: 12, items: 200, string: 4000, name: 160, suggestions: 10, noteMin: 10 });

const SYMBOL_RE = /^[A-Za-zΑ-Ωα-ωА-Яа-я_][A-Za-z0-9Α-Ωα-ωА-Яа-я_]*$/;
/* Belgilash / skript: tuzilma maydonlarida (belgi, formula, birlik, nom) — javob RAD etiladi;
   erkin matnda (izoh) — band tashlanadi. Qolgan matn ham DOM ga faqat escHtml / textContent orqali chiqadi. */
const MARKUP_RE = /<\/?[A-Za-z!?]|javascript\s*:|data\s*:\s*text\/html|\bon[a-z]{3,}\s*=/i;
/* Kalibrlanayotgan asbobning MPE si / aniqlik klassi / tolerans — noaniqlik manbai sifatida taklif qilinmaydi (CLAUDE.md). */
const MPE_RE = /\bMPE\b|maximum\s+permissible|permissible\s+error|accuracy\s+class|ruxsat\s+etilgan\s+(xato|chetlan)|yo['ʻ’`]?l\s+qo['ʻ’`]?yil(adi|gan)\w*\s+xato|aniqlik\s+(klassi|sinfi)|допускаем[а-яё]*\s+погрешн|предел[а-яё]*\s+(допускаем[а-яё]*\s+)?погрешн|класс[а-яё]*\s+точности/i;

export const hasMarkup = s => typeof s === 'string' && MARKUP_RE.test(s);
export const looksLikeMpe = s => typeof s === 'string' && MPE_RE.test(s);

const bad = (code, detail) => ({ ok: false, code, detail: detail || '' });
const norm = s => String(s || '').replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim();
const isBlank = s => !String(s === null || s === undefined ? '' : s).trim();

/** Matndagi sonlar ("0,5", "−0.02", "1e-3") — vergul o'nlik belgi sifatida; "±" belgi emas. */
export function numbersIn(text) {
  const out = [];
  const s = String(text || '').replace(/[−–]/g, '-');
  const re = /(?<![\w.,])[-+]?\d+(?:[.,]\d+)?(?:[eE][-+]?\d+)?/g;
  let m;
  while ((m = re.exec(s))) { const n = Number(m[0].replace(',', '.')); if (Number.isFinite(n)) out.push(n); }
  return out;
}
const sameNumber = (a, b) => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * Manba parchasi tekshiruvi: parcha kirish matnida AYNAN bor (bo'shliqlar normallashtirilgan) va qiymat parchada bor.
 * @returns {''|'no_quote'|'quote_not_found'|'value_not_in_quote'}
 */
export function evidenceProblem(value, quote, documentText) {
  const q = norm(quote);
  if (q.length < 3) return 'no_quote';
  if (!norm(documentText).includes(q)) return 'quote_not_found';
  if (typeof value === 'number') return numbersIn(q).some(n => sameNumber(n, value)) ? '' : 'value_not_in_quote';
  const v = norm(value);
  return v && q.toLowerCase().includes(v.toLowerCase()) ? '' : 'value_not_in_quote';
}

/** "15.01.2026", "15/01/2026", "2026-01-15" → "2026-01-15"; boshqa ko'rinish — '' (taxmin qilinmaydi). */
export function toIsoDate(text) {
  const s = norm(text);
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  let y, mo, d;
  if (m) [y, mo, d] = [m[1], m[2], m[3]].map(Number);
  else if ((m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s))) [d, mo, y] = [m[1], m[2], m[3]].map(Number);
  else return '';
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return '';
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return '';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function depthOf(v, d = 0) {
  if (d > RESPONSE_LIMITS.depth) return d;
  if (Array.isArray(v)) return v.reduce((m, x) => Math.max(m, depthOf(x, d + 1)), d);
  if (v && typeof v === 'object') return Object.values(v).reduce((m, x) => Math.max(m, depthOf(x, d + 1)), d);
  return d;
}
function strings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach(x => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => strings(x, out));
  return out;
}
function arrays(v, out = []) {
  if (Array.isArray(v)) { out.push(v); v.forEach(x => arrays(x, out)); } else if (v && typeof v === 'object') Object.values(v).forEach(x => arrays(x, out));
  return out;
}

/**
 * Qat'iy JSON ajratish. Chat oynasidan nusxalanganda uchraydigan YAGONA ``` to'sig'i olib tashlanadi;
 * boshqa har qanday qo'shimcha matn — xato (javobdan JSON "qidirilmaydi").
 */
export function extractJson(text) {
  if (typeof text !== 'string') return bad('ai_response_not_text');
  if (text.length > RESPONSE_LIMITS.chars) return bad('ai_response_too_large');
  let s = text.trim();
  const fence = /^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(s);
  if (fence) s = fence[1].trim();
  if (!s.startsWith('{') || !s.endsWith('}')) return bad('ai_response_not_json');
  let data;
  try { data = JSON.parse(s); } catch (e) { return bad('ai_response_not_json'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return bad('ai_response_not_json');
  if (depthOf(data) > RESPONSE_LIMITS.depth) return bad('ai_response_too_deep');
  if (arrays(data).some(a => a.length > RESPONSE_LIMITS.items)) return bad('ai_response_too_large');
  if (strings(data).some(x => x.length > RESPONSE_LIMITS.string)) return bad('ai_response_too_large');
  return { ok: true, data };
}

/* ─── c) Tushuntirish ─── */
function checkExplain(data, ctx) {
  const codes = new Set(((ctx.payload && ctx.payload.findings) || []).map(f => f.code));
  const rejected = [], items = [], seen = new Set();
  data.items.forEach((it, i) => {
    if (!codes.has(it.code)) return rejected.push({ path: `items[${i}]`, code: 'unknown_code' });
    if (seen.has(it.code)) return rejected.push({ path: `items[${i}]`, code: 'duplicate' });
    if (isBlank(it.text) || hasMarkup(it.text)) return rejected.push({ path: `items[${i}]`, code: isBlank(it.text) ? 'empty' : 'markup' });
    seen.add(it.code);
    items.push({ code: it.code, text: it.text.trim() });
  });
  const summary = hasMarkup(data.summary) ? '' : data.summary.trim();
  if (hasMarkup(data.summary)) rejected.push({ path: 'summary', code: 'markup' });
  if (!summary && !items.length) return bad('ai_response_empty');
  return { ok: true, fn: 'explain', summary, items, rejected };
}

/* ─── d) Manba taklifi — faqat nom va tur, QIYMATSIZ ─── */
function checkSuggest(data, ctx) {
  const inputs = new Set((((ctx.payload && ctx.payload.model) || {}).inputs || []).map(i => i.symbol));
  const rejected = [], suggestions = [], seen = new Set();
  data.suggestions.forEach((s, i) => {
    const path = `suggestions[${i}]`;
    const name = norm(s.name), why = norm(s.why);
    if (!inputs.has(s.input)) return rejected.push({ path, code: 'unknown_input' });
    if (!name || name.length > RESPONSE_LIMITS.name) return rejected.push({ path, code: 'bad_name' });
    if (hasMarkup(name) || hasMarkup(why)) return rejected.push({ path, code: 'markup' });
    if (looksLikeMpe(name) || looksLikeMpe(why)) return rejected.push({ path, code: 'mpe_source' });
    const key = s.input + '|' + name.toLowerCase();
    if (seen.has(key)) return rejected.push({ path, code: 'duplicate' });
    if (suggestions.length >= RESPONSE_LIMITS.suggestions) return rejected.push({ path, code: 'too_many' });
    seen.add(key);
    // 'specification' — etalon pasporti bo'lishi mumkin, lekin kalibrlanayotgan asbobniki bo'lmasligi shart: UI ogohlantiradi
    suggestions.push({ input: s.input, name, kind: s.kind, distribution: s.distribution === 'unknown' ? '' : s.distribution, why, caution: s.kind === 'specification' });
  });
  return { ok: true, fn: 'source_suggest', suggestions, rejected };
}

/* ─── a) Shablon qoralamasi ─── */
function checkTemplateDraft(data, ctx) {
  const doc = ctx.documentText;
  if (typeof doc !== 'string' || !doc.trim()) return bad('ai_document_required');
  if (!ctx.id || !ctx.now) return bad('ai_context_required');
  const structural = [data.title, data.formula, data.measurand.symbol, data.measurand.name, data.measurand.unit,
    ...data.inputs.flatMap(i => [i.symbol, i.name, i.unit]), ...data.sources.flatMap(s => [s.input, s.name, s.unit]), ...data.standards.flatMap(s => [s.code, s.clause])];
  if (structural.some(hasMarkup)) return bad('ai_response_markup');
  const rejected = [], numbers = [];
  const text3 = (s, fallback) => { const v = norm(s) || fallback; return { uz: v, ru: v, en: v }; };
  if (!SYMBOL_RE.test(data.measurand.symbol)) return bad('ai_template_invalid', 'measurand.symbol');
  const inputs = [];
  data.inputs.forEach((i, n) => {
    if (!SYMBOL_RE.test(i.symbol) || inputs.some(x => x.symbol === i.symbol)) return rejected.push({ path: `inputs[${n}]`, code: 'bad_symbol' });
    if (!isBlank(i.unit) && !parseUnit(i.unit)) rejected.push({ path: `inputs[${n}].unit`, code: 'unit_unknown' });
    inputs.push({ symbol: i.symbol, name: text3(i.name, i.symbol), unit: norm(i.unit), kind: i.kind });
  });
  if (!inputs.length) return bad('ai_template_invalid', 'inputs');
  const sources = [];
  data.sources.forEach((s, n) => {
    const path = `sources[${n}]`;
    const inp = inputs.find(i => i.symbol === s.input);
    if (!inp) return rejected.push({ path, code: 'unknown_input' });
    if (isBlank(s.name)) return rejected.push({ path, code: 'bad_name' });
    if (looksLikeMpe(s.name)) return rejected.push({ path, code: 'mpe_source' });
    const su = isBlank(s.unit) ? null : parseUnit(s.unit), iu = isBlank(inp.unit) ? null : parseUnit(inp.unit);
    if (!isBlank(s.unit) && !su) return rejected.push({ path, code: 'unit_unknown' });
    // Manba birligi kirish birligi bilan bir o'lchamlikda bo'lishi shart (yoki o'lchamsiz — nisbiy ko'rsatkich)
    if (su && iu && !dimEqual(su.dim, iu.dim) && !su.dim.every(v => Math.abs(v) < 1e-12)) return rejected.push({ path, code: 'unit_mismatch' });
    const idx = sources.length;
    const src = { id: 's' + (idx + 1), input: s.input, name: text3(s.name, s.input), kind: s.kind, distribution: s.distribution, halfWidth: null };
    if (!isBlank(s.unit)) src.unit = norm(s.unit);
    for (const f of ['halfWidth', 'k']) {
      const ev = s[f];
      if (!ev) continue;
      const problem = !Number.isFinite(ev.value) || (f === 'k' && ev.value <= 0) || (f === 'halfWidth' && ev.value < 0) ? 'bad_value' : evidenceProblem(ev.value, ev.quote, doc);
      if (problem) { rejected.push({ path: `${path}.${f}`, code: problem }); continue; }
      numbers.push({ id: `n${numbers.length + 1}`, target: [idx, f], source: src.id, input: s.input, field: f, value: ev.value, quote: norm(ev.quote), section: norm(ev.section) });
    }
    sources.push(src);
  });
  const standards = [];
  data.standards.forEach((s, n) => {
    const code = norm(s.code);
    const problem = code ? evidenceProblem(code, s.quote, doc) : 'no_quote';
    if (problem) return rejected.push({ path: `standards[${n}]`, code: problem });
    if (!standards.some(x => x.code === code)) standards.push(isBlank(s.clause) ? { code } : { code, clause: norm(s.clause) });
  });
  const template = {
    schemaVersion: 'uc-template/1', id: ctx.id, version: '0.1.0', status: 'AI_DRAFT', domain: 'TESTING', section: 'general',
    evaluationMode: 'GUM_BOTTOM_UP', title: text3(data.title, ctx.id), standards, labCount: null, ref: 'ai-draft',
    measurand: { symbol: data.measurand.symbol, name: text3(data.measurand.name, data.measurand.symbol), unit: norm(data.measurand.unit) },
    model: { formula: norm(data.formula) }, inputs, typeBSources: sources,
    createdAt: ctx.now, updatedAt: ctx.now, history: [{ at: ctx.now, status: 'AI_DRAFT', version: '0.1.0' }],
  };
  const chk = checkTemplate(template, ctx.methodologySchema || null);
  if (!chk.valid) return bad('ai_template_invalid', chk.errors.slice(0, 5).join('; '));
  return { ok: true, fn: 'template_draft', template, numbers, notes: hasMarkup(data.notes) ? '' : norm(data.notes), rejected, warnings: chk.warnings || [] };
}

/**
 * Tasdiqlangan sonlarni qoralama shablonga qo'yish (yangi obyekt). Tasdiqlanmagan son shablonga KIRMAYDI.
 * @param {string[]} confirmedIds  numbers[].id — foydalanuvchi alohida tasdiqlaganlari
 */
export function applyNumbers(template, numbers, confirmedIds) {
  const t = JSON.parse(JSON.stringify(template));
  const ok = new Set(confirmedIds || []);
  for (const n of numbers || []) {
    if (!ok.has(n.id)) continue;
    const src = t.typeBSources[n.target[0]];
    if (src && (n.target[1] === 'halfWidth' || n.target[1] === 'k')) src[n.target[1]] = n.value;
  }
  return t;
}

/* ─── b) Sertifikat ─── */
const CERT_FIELDS = ['certificate', 'calibrator', 'accreditation', 'date', 'validUntil', 'traceability'];
const ROUTES = ['nmi_cipm', 'accredited', 'nmi_other', 'lab_other', 'crm'];

function checkCertificate(data, ctx) {
  const isText = typeof ctx.documentText === 'string' && !!ctx.documentText.trim();
  const doc = isText ? ctx.documentText : '';
  const rejected = [], fields = {};
  for (const f of CERT_FIELDS) {
    const ev = data[f];
    if (!ev) continue;
    let value = norm(ev.value);
    if (!value || value.length > RESPONSE_LIMITS.name) { rejected.push({ path: f, code: 'bad_value' }); continue; }
    if (hasMarkup(value)) { rejected.push({ path: f, code: 'markup' }); continue; }
    if (f === 'date' || f === 'validUntil') {
      const iso = toIsoDate(value);
      if (!iso) { rejected.push({ path: f, code: 'bad_date' }); continue; }
      if (isText) {
        const q = norm(ev.quote), parts = numbersIn(q.replace(/[./-]/g, ' ')).map(Math.abs), [y, , d] = iso.split('-').map(Number);
        const problem = q.length < 3 ? 'no_quote' : !norm(doc).includes(q) ? 'quote_not_found' : (parts.includes(y) && parts.includes(d) ? '' : 'value_not_in_quote');
        if (problem) { rejected.push({ path: f, code: problem }); continue; }
      }
      value = iso;
    } else if (isText) {
      const problem = evidenceProblem(value, ev.quote, doc);
      if (problem) { rejected.push({ path: f, code: problem }); continue; }
    }
    fields[f] = { value, quote: hasMarkup(ev.quote) ? '' : norm(ev.quote), page: hasMarkup(ev.page) ? '' : norm(ev.page), verified: isText };
  }
  const points = [];
  data.points.forEach((p, n) => {
    const path = `points[${n}]`;
    const row = {};
    for (const k of ['x', 'correction', 'U', 'k']) row[k] = typeof p[k] === 'number' && Number.isFinite(p[k]) ? p[k] : null;
    if (row.x === null && row.U === null) return rejected.push({ path, code: 'bad_value' });
    if ((row.U !== null && row.U < 0) || (row.k !== null && row.k <= 0)) return rejected.push({ path, code: 'bad_value' });
    if (isText) {
      const q = norm(p.quote);
      if (q.length < 3) return rejected.push({ path, code: 'no_quote' });
      if (!norm(doc).includes(q)) return rejected.push({ path, code: 'quote_not_found' });
      const found = numbersIn(q);
      if (Object.values(row).some(v => v !== null && !found.some(x => sameNumber(x, v)))) return rejected.push({ path, code: 'value_not_in_quote' });
    }
    points.push({ ...row, quote: hasMarkup(p.quote) ? '' : norm(p.quote), page: hasMarkup(p.page) ? '' : norm(p.page), verified: isText });
  });
  const unit = hasMarkup(data.unit) ? '' : norm(data.unit);
  if (unit && !parseUnit(unit)) rejected.push({ path: 'unit', code: 'unit_unknown' });
  if (!Object.keys(fields).length && !points.length) return { ...bad('ai_response_empty'), rejected };
  return { ok: true, fn: 'certificate_extract', fields, route: ROUTES.includes(data.route) ? data.route : '', unit, points, evidenceChecked: isText, rejected };
}

/**
 * Tasdiqlangan maydon va qatorlardan kalibrlash yozuvi (P11 `cleanCalibration` uchun xom obyekt).
 * Tasdiqlanmagan maydon BO'SH qoladi; k berilmagan bo'lsa — bo'sh (2 deb faraz qilinmaydi).
 * @param {{fields?:string[], rows?:number[], route?:boolean}} confirmed
 */
export function certificateToCalibration(result, confirmed = {}) {
  const f = new Set(confirmed.fields || []), r = new Set(confirmed.rows || []);
  const val = k => (f.has(k) && result.fields[k] ? result.fields[k].value : '');
  return {
    certificate: val('certificate'), calibrator: val('calibrator'), accreditation: val('accreditation'),
    route: confirmed.route === true ? result.route : '', traceability: val('traceability'), date: val('date'), validUntil: val('validUntil'),
    points: result.points.filter((_, i) => r.has(i)).map(p => ({ x: p.x, correction: p.correction, U: p.U, k: p.k })),
  };
}

const CHECKS = { explain: checkExplain, source_suggest: checkSuggest, template_draft: checkTemplateDraft, certificate_extract: checkCertificate };

/**
 * AI javobini to'liq tekshirish.
 * @param {string} fn    AI funksiyasi
 * @param {string} text  javob matni (nusxa-qo'y yoki API)
 * @param {{schema:object, payload?:object, documentText?:string, methodologySchema?:object, id?:string, now?:string}} ctx
 * @returns {{ok:true, fn:string, rejected:object[]}&object | {ok:false, code:string, detail:string}}
 */
export function parseResponse(fn, text, ctx = {}) {
  const check = CHECKS[fn];
  if (!check) return bad('ai_payload_bad_function');
  if (!ctx.schema || typeof ctx.schema !== 'object') return bad('ai_schema_required');
  const j = extractJson(text);
  if (!j.ok) return j;
  const v = validate(ctx.schema, j.data);
  if (!v.valid) return bad('ai_response_schema', v.errors.slice(0, 5).map(e => `${e.path}: ${e.message}`).join('; '));
  return check(j.data, ctx);
}
