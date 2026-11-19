/* ═══════════════════════════════════════════════════════════════
   PAYLOAD.JS — AI yordamchiga (P14) yuboriladigan ma'lumotni yig'ish. SOF modul: DOM, window, localStorage,
   tarmoq (fetch) va boshqa modullarga bog'liq emas; brauzerda ham, Node'da ham ishlaydi.
   Loyiha siyosati (egasi qarori B, 2026-11-19; docs/AI_DESIGN.md §4): tashqariga faqat TUZILMA ketadi —
   RUXSAT RO'YXATI (allowlist) bo'yicha. Bu yerda ikki qatlam bor:
     1) quruvchilar (build*Payload) — hisob holatidan faqat ruxsat etilgan maydonlarni OLADI (qolgani ko'chirilmaydi);
     2) qo'riqchi (assertAllowed) — tayyor payload ni SHAKL bo'yicha qayta tekshiradi: noma'lum kalit, SON tipidagi
        har qanday qiymat, chegaradan uzun matn yoki shaxsiy ma'lumotga o'xshash matn bo'lsa — xato.
   Payload da son tipidagi qiymat UMUMAN bo'lmaydi (o'lchov qiymati, natija, yarim kenglik, hissa, P, k, ν …):
   shakl tavsifida "number" turi yo'q. Model formulasi matni (undagi konstantalar bilan) — ruxsat etilgan.
   AI hech narsa hisoblamaydi va natijani o'zgartirmaydi (docs/AI_DESIGN.md §2) — bu modul dvigatelni chaqirmaydi.
   ISO/IEC 42001 (unverified — hujjat repoda yo'q): ma'lumotni minimallashtirish tamoyili.
═══════════════════════════════════════════════════════════════ */

export const AI_PAYLOAD_FORMAT = 'uc-ai-payload/1';

/** AI funksiyalari (docs/AI_DESIGN.md §3): a) shablon qoralamasi, b) sertifikatdan reestr yozuvi, c) izoh, d) manba taklifi */
export const AI_FUNCTIONS = Object.freeze(['template_draft', 'certificate_extract', 'explain', 'source_suggest']);

/** Foydalanuvchi hujjati (metodika / sertifikat matni yoki rasmi) faqat shu funksiyalarda, alohida tasdiq bilan */
export const DOCUMENT_FUNCTIONS = Object.freeze(['template_draft', 'certificate_extract']);

export const AI_LANGS = Object.freeze(['uz', 'ru', 'en']);

/** Chegaralar — yagona joy. */
export const AI_LIMITS = Object.freeze({
  symbol: 32, unit: 32, formula: 2000, name: 120, code: 64, ref: 300, text: 1500,
  inputs: 64, sources: 200, findings: 200, outputs: 32, equations: 64, budget: 400,
  documentChars: 400000,          // hujjat matni (belgilar)
  imageBase64: 8000000,           // rasm / PDF (base64 belgilar, ≈ 6 MB)
});

export const AI_IMAGE_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);

const DISTRIBUTIONS = ['normal', 'rect', 'triang', 'ushape', 'resol', 'trap', 'ctrap', 'exp', 'lognorm', 't'];
const SOURCE_KINDS = ['certificate', 'specification', 'resolution', 'drift', 'environment', 'procedure', 'reference', 'sample_variability', 'other'];
const SEVERITIES = ['error', 'warning', 'info'];
const MODEL_KINDS = ['error', 'value', 'unknown'];
const BUDGET_KINDS = ['A', 'B', 'corr', 'second'];

/* ─── Shaxsiy ma'lumot / sirga o'xshash matnni aniqlash ─────────────────────────────────────────
   Tuzilma maydonlarida (formula, nom, birlik) topilsa — payload RAD ETILADI.
   Hujjat matnida topilsa — faqat OGOHLANTIRISH (foydalanuvchi o'zi olib tashlaydi yoki tasdiqlaydi). */
const SENSITIVE = [
  ['api_key', /sk-ant-[A-Za-z0-9_-]{8,}/g],
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ['phone', /(?:\+|\b00)\d[\d\s().-]{8,}\d/g],
  ['tax_id', /\b(?:STIR|INN|ИНН|СТИР)\b\s*[:№#]?\s*\d{9,14}/gi],
];

/** @returns {{category:string, count:number}[]} */
export function findSensitive(text) {
  const out = [];
  const s = typeof text === 'string' ? text : '';
  for (const [category, re] of SENSITIVE) {
    const m = s.match(re);
    if (m && m.length) out.push({ category, count: m.length });
  }
  return out;
}

class PayloadError extends Error {
  constructor(code, path) { super(path ? `${code}: ${path}` : code); this.code = code; this.path = path || ''; }
}
const fail = (code, path) => { throw new PayloadError(code, path); };

/* ─── Shakl tavsifi (allowlist). "number" turi YO'Q — ataylab. ─────────────────────────────────── */
const SYMBOL_RE = /^[\p{L}_][\p{L}\p{N}_.'′]*$/u;
const CODE_RE = /^[A-Za-z0-9_./:-]+$/;
const B64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

const S = {
  symbol: { t: 'string', max: AI_LIMITS.symbol, re: SYMBOL_RE, strict: true },
  unit: { t: 'string', max: AI_LIMITS.unit, oneLine: true, strict: true },
  formula: { t: 'string', max: AI_LIMITS.formula, strict: true },
  name: { t: 'string', max: AI_LIMITS.name, oneLine: true, strict: true },
  code: { t: 'string', max: AI_LIMITS.code, re: CODE_RE },
  ref: { t: 'string', max: AI_LIMITS.ref },
  text: { t: 'string', max: AI_LIMITS.text },
  bool: { t: 'boolean' },
  en: values => ({ t: 'string', enum: values }),
  arr: (of, max) => ({ t: 'array', of, max }),
  obj: (keys, required = []) => ({ t: 'object', keys, required }),
};

const MODEL_SHAPE = S.obj({
  kind: S.en(MODEL_KINDS),
  outputs: S.arr(S.obj({ symbol: S.symbol, formula: S.formula, unit: S.unit }, ['formula']), AI_LIMITS.outputs),
  implicit: S.obj({ unknowns: S.arr(S.obj({ symbol: S.symbol, unit: S.unit }, ['symbol']), AI_LIMITS.outputs), equations: S.arr(S.formula, AI_LIMITS.equations) }, ['unknowns', 'equations']),
  inputs: S.arr(S.obj({ symbol: S.symbol, unit: S.unit, typeA: S.bool }, ['symbol']), AI_LIMITS.inputs),
  correlated: S.bool,
}, ['outputs', 'inputs']);

const SOURCES_SHAPE = S.arr(S.obj({
  ref: S.code, input: S.symbol, distribution: S.en(DISTRIBUTIONS), kind: S.en(SOURCE_KINDS), unit: S.unit,
  fromRegistry: S.bool, name: S.name,
}, ['ref']), AI_LIMITS.sources);

const FINDINGS_SHAPE = S.arr(S.obj({ code: S.code, rule: S.code, severity: S.en(SEVERITIES), ref: S.ref, input: S.symbol, accepted: S.bool }, ['code', 'severity']), AI_LIMITS.findings);
const FINDING_TEXTS_SHAPE = S.arr(S.obj({ code: S.code, what: S.text, why: S.text, fix: S.text }, ['code']), AI_LIMITS.findings);
const BUDGET_ORDER_SHAPE = S.arr(S.obj({ kind: S.en(BUDGET_KINDS), input: S.symbol, source: S.code }, ['kind']), AI_LIMITS.budget);

const DOCUMENT_SHAPE = S.obj({
  kind: S.en(['text', 'image']),
  text: { t: 'string', max: AI_LIMITS.documentChars },
  mediaType: S.en(AI_IMAGE_TYPES),
  data: { t: 'string', max: AI_LIMITS.imageBase64, re: B64_RE },
}, ['kind']);

const HEAD = { format: S.en([AI_PAYLOAD_FORMAT]), fn: S.en(AI_FUNCTIONS), lang: S.en(AI_LANGS) };
const CONSENT_SHAPE = S.obj({ document: S.en(['confirmed']) }, ['document']);

/** Har bir funksiya uchun to'liq ruxsat ro'yxati. Bu yerda yo'q kalit payload da bo'la olmaydi. */
export const PAYLOAD_SHAPES = Object.freeze({
  explain: S.obj({ ...HEAD, mode: S.code, model: MODEL_SHAPE, sources: SOURCES_SHAPE, findings: FINDINGS_SHAPE, findingTexts: FINDING_TEXTS_SHAPE, budgetOrder: BUDGET_ORDER_SHAPE }, ['format', 'fn', 'lang']),
  source_suggest: S.obj({ ...HEAD, mode: S.code, model: MODEL_SHAPE, sources: SOURCES_SHAPE }, ['format', 'fn', 'lang', 'model']),
  template_draft: S.obj({ ...HEAD, schemaId: S.code, document: DOCUMENT_SHAPE, consent: CONSENT_SHAPE }, ['format', 'fn', 'lang', 'document', 'consent']),
  certificate_extract: S.obj({ ...HEAD, document: DOCUMENT_SHAPE, consent: CONSENT_SHAPE }, ['format', 'fn', 'lang', 'document', 'consent']),
});

function check(v, spec, path) {
  if (spec.t === 'object') {
    if (!v || typeof v !== 'object' || Array.isArray(v)) fail('ai_payload_bad_type', path);
    for (const k of Object.keys(v)) {
      if (!Object.prototype.hasOwnProperty.call(spec.keys, k)) fail('ai_payload_unknown_key', `${path}.${k}`);
      check(v[k], spec.keys[k], `${path}.${k}`);
    }
    for (const k of spec.required) if (!Object.prototype.hasOwnProperty.call(v, k)) fail('ai_payload_missing_key', `${path}.${k}`);
    return;
  }
  if (spec.t === 'array') {
    if (!Array.isArray(v)) fail('ai_payload_bad_type', path);
    if (v.length > spec.max) fail('ai_payload_too_long', path);
    v.forEach((x, i) => check(x, spec.of, `${path}[${i}]`));
    return;
  }
  if (spec.t === 'boolean') { if (typeof v !== 'boolean') fail('ai_payload_bad_type', path); return; }
  // string — yagona qolgan tur; son, null, undefined, funksiya va h.k. rad etiladi
  if (typeof v !== 'string') fail(typeof v === 'number' ? 'ai_payload_number' : 'ai_payload_bad_type', path);
  if (spec.enum) { if (!spec.enum.includes(v)) fail('ai_payload_bad_value', path); return; }
  if (v.length > spec.max) fail('ai_payload_too_long', path);
  if (spec.re && !spec.re.test(v)) fail('ai_payload_bad_value', path);
  if (spec.oneLine && /[\r\n]/.test(v)) fail('ai_payload_bad_value', path);
  if (spec.strict && findSensitive(v).length) fail('ai_payload_sensitive', path);
}

/**
 * Qo'riqchi: payload ruxsat ro'yxatiga mos kelmasa — xato (code: ai_payload_*). Yuborish / nusxalashdan OLDIN
 * har doim chaqiriladi (serializePayload ichida ham).
 */
export function assertAllowed(payload) {
  if (!payload || typeof payload !== 'object') fail('ai_payload_bad_type', '$');
  const shape = PAYLOAD_SHAPES[payload.fn];
  if (!shape) fail('ai_payload_bad_function', '$.fn');
  check(payload, shape, '$');
  if (payload.document) {
    const d = payload.document;
    if (!DOCUMENT_FUNCTIONS.includes(payload.fn)) fail('ai_payload_unknown_key', '$.document');
    if (d.kind === 'text' ? (typeof d.text !== 'string' || !d.text.trim() || d.data !== undefined || d.mediaType !== undefined)
      : (typeof d.data !== 'string' || !d.data || !d.mediaType || d.text !== undefined)) fail('ai_payload_bad_document', '$.document');
    // sir (API kaliti) hujjat ichida ham ketmaydi
    if (d.kind === 'text' && findSensitive(d.text).some(x => x.category === 'api_key')) fail('ai_payload_sensitive', '$.document.text');
  }
  return payload;
}

/* ─── Yordamchilar ──────────────────────────────────────────────────────────────────────────── */
const str = v => (typeof v === 'string' ? v.trim() : '');
const lang = l => (AI_LANGS.includes(l) ? l : 'en');
const put = (o, k, v) => { if (v !== '' && v !== undefined && v !== null) o[k] = v; return o; };

/** "ρ = m / V" → { symbol: 'ρ', formula: 'ρ = m / V' } (belgi ajratilmasa — faqat formula) */
function outputOf(o) {
  const formula = str(o && o.formula);
  const out = {};
  const m = /^\s*([^=<>!]+?)\s*=(?!=)/.exec(formula);
  const sym = str(o && (o.symbol || o.name)) || (m ? m[1].trim() : '');
  if (sym && SYMBOL_RE.test(sym) && sym.length <= AI_LIMITS.symbol) out.symbol = sym;
  out.formula = formula;
  return put(out, 'unit', str(o && o.unit));
}

/** Hisob holatidan (calc-state/v2) model TUZILMASI: formulalar, kattalik nomlari va birliklari. Qiymat olinmaydi. */
function modelOf(state) {
  const st = state || {};
  const settings = st.settings || {};
  const params = Array.isArray(st.params) ? st.params : [];
  const meas = st.measurements || {};
  const units = st.units || {};
  const outs = Array.isArray(st.outputs) && st.outputs.length ? st.outputs : (st.model && str(st.model.formula) ? [st.model] : []);
  const model = { kind: MODEL_KINDS.includes(settings.modelKind) ? settings.modelKind : 'unknown', outputs: outs.map(outputOf).filter(o => o.formula) };
  if (st.implicit && Array.isArray(st.implicit.unknowns)) {
    model.implicit = {
      unknowns: st.implicit.unknowns.map(u => put({ symbol: str(u && u.name) }, 'unit', str(u && u.unit))),      // start (y⁽⁰⁾) — qiymat, olinmaydi
      equations: (st.implicit.equations || []).map(str).filter(Boolean),
    };
  }
  model.inputs = params.map(p => {
    const hasObs = Array.isArray(meas[p]) && meas[p].some(v => v !== '' && v !== null && v !== undefined);
    return put({ symbol: str(p), typeA: hasObs }, 'unit', str(units[p]));
  });
  const cov = st.covB && typeof st.covB === 'object' ? Object.keys(st.covB).length > 0 : false;
  model.correlated = !!(settings.paired && params.length > 1) || cov;
  return model;
}

/**
 * B tur manbalari: tur va taqsimot. Manba NOMI standart holatda yuborilmaydi (erkin matn — unda raqam yoki shaxs
 * ismi bo'lishi mumkin: "Tarozi kalibrlovi (U, k=2)"); o'rniga neytral belgi 'B1', 'B2' … (holatdagi tartib).
 * Nomni qo'shish — faqat opts.includeSourceNames === true (docs/RISKS.md R-28, egasi qarorini kutadi).
 */
function sourcesOf(state, opts = {}) {
  const list = Array.isArray(state && state.typeB) ? state.typeB : [];
  return list.map((b, i) => {
    const o = { ref: `B${i + 1}` };
    put(o, 'input', str(b && (b.param || b.input)));
    if (DISTRIBUTIONS.includes(b && b.distribution)) o.distribution = b.distribution;
    if (SOURCE_KINDS.includes(b && b.kind)) o.kind = b.kind;
    put(o, 'unit', str(b && b.unit));
    if (b && b.registry) o.fromRegistry = true;                 // faqat belgi; sertifikat raqami / tashkilot — yo'q
    if (opts.includeSourceNames === true) put(o, 'name', str(b && b.name).slice(0, AI_LIMITS.name));
    return o;
  });
}

function findingsOf(result, acceptances) {
  const acc = acceptances && typeof acceptances === 'object' ? acceptances : {};
  return (Array.isArray(result && result.findings) ? result.findings : []).map(f => {
    const o = { code: str(f.code), severity: SEVERITIES.includes(f.severity) ? f.severity : 'info' };
    put(o, 'rule', str(f.rule));
    put(o, 'ref', str(f.ref).slice(0, AI_LIMITS.ref));
    const param = str(f.param);                                  // 'm|V' kabi juftlik belgisi bo'lsa — tashlanadi
    if (param.length <= AI_LIMITS.symbol && SYMBOL_RE.test(param)) o.input = param;
    if (acc[f.id]) o.accepted = true;
    return o;                                                    // f.value, f.source, f.id — olinmaydi
  }).filter(f => f.code);
}

/** Topilma matnlari — i18n SHABLONLARI ({p}, {s}, {v} to'ldirilmagan holda); UI qatlami beradi. */
function findingTextsOf(findings, texts) {
  const t = texts && typeof texts === 'object' ? texts : {};
  const seen = new Set();
  const out = [];
  for (const f of findings) {
    if (seen.has(f.code) || !t[f.code]) continue;
    seen.add(f.code);
    const o = { code: f.code };
    for (const k of ['what', 'why', 'fix']) put(o, k, str(t[f.code][k]).slice(0, AI_LIMITS.text));
    out.push(o);
  }
  return out;
}

/**
 * Hissalar TARTIBI (kattadan kichikka) — RAQAMSIZ: faqat tur, kirish va manba belgisi ('B1' …).
 * Hissa qiymati, ulushi, u, c — olinmaydi.
 */
function budgetOrderOf(state, result) {
  const rows = Array.isArray(result && result.budget) ? result.budget : [];
  const typeB = Array.isArray(state && state.typeB) ? state.typeB : [];
  const used = new Set();
  const refOf = row => {
    const i = typeB.findIndex((b, j) => !used.has(j) && str(b && b.name) === str(row.name) && str(b && (b.param || b.input)) === str(row.param));
    if (i < 0) return '';
    used.add(i);
    return `B${i + 1}`;
  };
  const tagged = rows.filter(r => r && BUDGET_KINDS.includes(r.kind)).map((r, i) => {
    const o = { kind: r.kind };
    put(o, 'input', str(r.param));
    if (r.kind === 'B') put(o, 'source', refOf(r));
    const c = typeof r.contrib === 'number' && Number.isFinite(r.contrib) ? Math.abs(r.contrib) : 0;
    return { o, c, i };
  });
  tagged.sort((a, b) => b.c - a.c || a.i - b.i);
  return tagged.map(x => x.o);
}

const modeOf = (result, opts) => str(opts && opts.mode) || str(result && result.findings && result.findings[0] && result.findings[0].mode) || '';

/* ─── Quruvchilar ───────────────────────────────────────────────────────────────────────────── */

/**
 * c) Natija va topilmalarni oddiy tilda tushuntirish.
 * @param {object} state  hisob holati (calc-state/v2); boshqa rejimlarda bo'sh bo'lishi mumkin
 * @param {object} result dvigatel natijasi (faqat findings kodlari va budget TARTIBI olinadi)
 * @param {{lang?:string, mode?:string, findingTexts?:object, acceptances?:object, includeSourceNames?:boolean}} [opts]
 */
export function buildExplainPayload(state, result, opts = {}) {
  const findings = findingsOf(result, opts.acceptances || (state && state.acceptances));
  const p = { format: AI_PAYLOAD_FORMAT, fn: 'explain', lang: lang(opts.lang) };
  put(p, 'mode', modeOf(result, opts));
  if (state && Array.isArray(state.params)) { p.model = modelOf(state); p.sources = sourcesOf(state, opts); }
  p.findings = findings;
  const texts = findingTextsOf(findings, opts.findingTexts);
  if (texts.length) p.findingTexts = texts;
  const order = budgetOrderOf(state, result);
  if (order.length) p.budgetOrder = order;
  return assertAllowed(p);
}

/** d) Byudjet uchun manba taklifi: model va mavjud manbalarning turi (qiymatsiz). */
export function buildSourceSuggestPayload(state, opts = {}) {
  const p = { format: AI_PAYLOAD_FORMAT, fn: 'source_suggest', lang: lang(opts.lang) };
  put(p, 'mode', str(opts.mode));
  p.model = modelOf(state);
  p.sources = sourcesOf(state, opts);
  return assertAllowed(p);
}

function documentOf(doc, consent) {
  if (consent !== true) fail('ai_document_consent_required', '$.consent');
  const d = doc || {};
  if (typeof d.text === 'string') return { kind: 'text', text: d.text };
  if (typeof d.data === 'string') return { kind: 'image', mediaType: d.mediaType, data: d.data };
  return fail('ai_payload_bad_document', '$.document');
}

/**
 * a) Metodika / standart matnidan shablon qoralamasi. Hujjat — foydalanuvchi O'ZI yuklagan matn; faqat
 * `documentConsent: true` (alohida tasdiq) bilan. Fayl nomi yuborilmaydi (unda mijoz nomi bo'lishi mumkin).
 * @param {{text:string}} doc
 * @param {{lang?:string, documentConsent:boolean}} opts
 */
export function buildTemplateDraftPayload(doc, opts = {}) {
  if (!doc || typeof doc.text !== 'string') fail('ai_payload_bad_document', '$.document');
  return assertAllowed({
    format: AI_PAYLOAD_FORMAT, fn: 'template_draft', lang: lang(opts.lang), schemaId: 'methodology.schema.json',
    document: documentOf({ text: doc.text }, opts.documentConsent), consent: { document: 'confirmed' },
  });
}

/**
 * b) Kalibrlash sertifikatidan reestr yozuvi qoralamasi. Hujjat — matn yoki rasm / PDF (base64).
 * @param {{text?:string, data?:string, mediaType?:string}} doc
 * @param {{lang?:string, documentConsent:boolean}} opts
 */
export function buildCertificatePayload(doc, opts = {}) {
  return assertAllowed({
    format: AI_PAYLOAD_FORMAT, fn: 'certificate_extract', lang: lang(opts.lang),
    document: documentOf(doc, opts.documentConsent), consent: { document: 'confirmed' },
  });
}

/* ─── Chiqarish ─────────────────────────────────────────────────────────────────────────────── */
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = sortKeys(v[k]); return o; }
  return v;
}

/**
 * Yuboriladigan / nusxalanadigan AYNAN matn (determinik JSON: kalitlar tartiblangan). Qo'riqchidan o'tmasa — xato.
 * Audit xeshi shu matndan hisoblanadi (matnning o'zi auditga yozilmaydi — docs/AI_DESIGN.md §7).
 */
export function serializePayload(payload) {
  return JSON.stringify(sortKeys(assertAllowed(payload)), null, 2);
}

/**
 * Foydalanuvchiga ko'rsatiladigan to'liq ko'rinish. Matnli payload uchun — serializePayload bilan AYNAN bir xil.
 * Rasm / PDF bo'lsa, base64 o'rniga belgi qo'yiladi (rasmning o'zi UI da alohida ko'rsatiladi); `warnings` —
 * hujjat matnida shaxsiy ma'lumotga o'xshash parchalar (toifa va soni; parchaning o'zi qaytarilmaydi).
 * @returns {{text:string, hasImage:boolean, warnings:{category:string,count:number}[]}}
 */
export function previewPayload(payload) {
  assertAllowed(payload);
  const d = payload.document;
  if (d && d.kind === 'image') {
    const shown = { ...payload, document: { kind: 'image', mediaType: d.mediaType, data: '' } };
    const text = JSON.stringify(sortKeys(shown), null, 2).replace('"data": ""', `"data": "<base64, ${d.data.length}>"`);
    return { text, hasImage: true, warnings: [] };
  }
  return { text: serializePayload(payload), hasImage: false, warnings: d ? findSensitive(d.text) : [] };
}
