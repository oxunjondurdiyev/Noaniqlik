/* ═══════════════════════════════════════════════════════════════
   INTERPRETER.JS — metodika shabloni (uc-template/1) → hisob holati
   (calc-state/v2) → modelSpec (uc-model/1) → evaluate().
   Sxema: schemas/methodology.schema.json. Yo'riqnoma: docs/TEMPLATE_GUIDE.md.

   Sof modul (DOM, brauzer xotirasi va global brauzer obyektiga bog'liq emas),
   brauzerda va Node'da bir xil. Dvigatelning o'zi O'ZGARMAYDI: shablon faqat
   uning kirishini (modelSpec) yig'adi. Shu sababli shablon orqali qilingan hisob
   aynan shu ma'lumot bilan qo'lda kiritilgan hisob bilan bit darajasida bir xil.

   Shablonning P04 dagi qo'shimcha imkoniyatlari:
     • constants  — o'zgarmaslar (noaniqligi 0). Formulada qatnashsa — bitta
                    qiymatli kirish (u = 0, byudjetga qator qo'shmaydi); faqat B tur
                    manba formulasida qatnashsa — son sifatida qo'yiladi (aux).
     • variants   — bitta modelning standartga xos ko'rinishlari (formula, kirishlar,
                    o'zgarmas qiymatlari).
     • correlations + sharedInstrument — bitta asbob bilan o'lchangan kirishlar
                    orasidagi korrelyatsiya (u(xi,xj) = r·u_X(xi)·u_X(xj)).
     • includeByDefault: false — standart holatda kiritilmaydigan manba.
     • unit       — har bir kirish va natija birligi (units.js o'lchamlik tekshiruvi).
═══════════════════════════════════════════════════════════════ */
import { evaluate, toModel, typeAx, typeB as typeBStd, valueOrExpr, parseUnit, pairKey, isBlank, toNum, splitFormula, parse, analyzeDimensions, dimText } from '../engine/index.js';
import { variables } from '../engine/parser.js';
import { validate } from './validator.js';

export const TEMPLATE_FORMAT = 'uc-template/1';
export const STATUSES = ['DRAFT', 'REVIEWED', 'APPROVED', 'RETIRED'];
/** UI dagi P03 standart sozlamalari (app.js loadPreset bilan bir xil) */
export const APP_DEFAULTS = Object.freeze({ paired: true, P: 0.9545 });
/** APPROVED holatda standart bo'yicha qulflanadigan bo'limlar */
export const DEFAULT_LOCKED = ['model', 'variants', 'constants', 'inputs', 'typeBSources', 'correlations', 'measurand'];

const LANGS = ['uz', 'ru', 'en'];
const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

/** Uch tildagi matndan bittasi (yo'q bo'lsa — en, keyin uz). */
export function tr(text, lang = 'en') {
  if (text === null || text === undefined) return '';
  if (typeof text === 'string') return text;
  return text[lang] || text.en || text.uz || '';
}

/* ─── Variant ─────────────────────────────────────────── */

/** Tanlangan variant: { id, formula, inputs: [belgilar], constants: {belgi: qiymat} } */
export function resolveVariant(tpl, variantId) {
  const variants = tpl.variants || [];
  if (!variants.length) {
    return {
      id: '', title: null, formula: tpl.model.formula,
      inputs: [...tpl.inputs.map(i => i.symbol), ...(tpl.constants || []).map(c => c.symbol)],
      constants: {}, standards: tpl.standards || [], measurand: tpl.measurand, excludeSources: [],
      decisionRule: tpl.decisionRule || null,
    };
  }
  const id = variantId || tpl.defaultVariant || variants[0].id;
  const v = variants.find(x => x.id === id);
  if (!v) return null;
  return {
    ...v, constants: v.constants || {}, standards: v.standards || tpl.standards || [],
    measurand: v.measurand || tpl.measurand, excludeSources: v.excludeSources || [],
    decisionRule: v.decisionRule || tpl.decisionRule || null,
  };
}

/** Formulada qatnashadigan belgilar (variant ro'yxatidan) */
function formulaSymbols(formula, symbols) {
  const { expr } = splitFormula(formula);
  if (!expr) return new Set();
  return variables(parse(expr, symbols));
}

/* ─── Tekshiruv: sxema + semantika ─────────────────────── */

/**
 * Shablonni tekshirish.
 * @param {object} tpl
 * @param {object} [schema]  schemas/methodology.schema.json (berilmasa — faqat semantik tekshiruv)
 * @returns {{valid:boolean, errors:string[], warnings:string[]}}
 */
export function checkTemplate(tpl, schema) {
  const errors = [], warnings = [];
  if (schema) {
    const r = validate(schema, tpl);
    r.errors.forEach(e => errors.push(`schema ${e.path}: ${e.message}`));
    if (!r.valid) return { valid: false, errors, warnings };
  }
  const inputs = tpl.inputs || [];
  const consts = tpl.constants || [];
  const symbols = [...inputs.map(i => i.symbol), ...consts.map(c => c.symbol)];
  const dup = symbols.filter((s, i) => symbols.indexOf(s) !== i);
  if (dup.length) errors.push(`duplicate symbols: ${[...new Set(dup)].join(', ')}`);
  const srcIds = (tpl.typeBSources || []).map(s => s.id);
  const dupSrc = srcIds.filter((s, i) => srcIds.indexOf(s) !== i);
  if (dupSrc.length) errors.push(`duplicate source ids: ${dupSrc.join(', ')}`);
  for (const s of tpl.typeBSources || []) {
    if (!inputs.some(i => i.symbol === s.input)) errors.push(`source ${s.id}: unknown input ${s.input}`);
    if (s.allowedDistributions && !s.allowedDistributions.includes(s.distribution)) errors.push(`source ${s.id}: distribution not in allowedDistributions`);
    if (s.unit && !isBlank(s.unit) && !parseUnit(s.unit)) warnings.push(`source ${s.id}: unit "${s.unit}" not recognised`);
  }
  for (const c of tpl.correlations || []) {
    for (const x of c.inputs) if (!inputs.some(i => i.symbol === x)) errors.push(`correlation ${c.id}: unknown input ${x}`);
    if (c.sharedInstrument && !(tpl.typeBSources || []).some(s => c.inputs.includes(s.input) && s.instrument === c.sharedInstrument)) {
      errors.push(`correlation ${c.id}: no source with instrument "${c.sharedInstrument}"`);
    }
  }
  const variants = tpl.variants && tpl.variants.length ? tpl.variants.map(v => v.id) : [''];
  if (tpl.variants && tpl.variants.length) {
    if (tpl.defaultVariant && !variants.includes(tpl.defaultVariant)) errors.push(`defaultVariant ${tpl.defaultVariant} not found`);
    const vid = tpl.variants.map(v => v.id);
    if (new Set(vid).size !== vid.length) errors.push('duplicate variant ids');
  }
  for (const vid of variants) {
    const v = resolveVariant(tpl, vid);
    for (const s of v.inputs) if (!symbols.includes(s)) errors.push(`variant ${vid || '-'}: unknown symbol ${s}`);
    for (const s of Object.keys(v.constants)) if (!consts.some(c => c.symbol === s)) errors.push(`variant ${vid || '-'}: unknown constant ${s}`);
    for (const s of v.excludeSources) if (!srcIds.includes(s)) errors.push(`variant ${vid || '-'}: unknown source ${s}`);
    let used;
    try { used = formulaSymbols(v.formula, v.inputs); }
    catch (e) { errors.push(`variant ${vid || '-'}: formula does not parse (${e.message})`); continue; }
    const modelInputs = v.inputs.filter(s => inputs.some(i => i.symbol === s));
    if (!splitFormula(v.formula).expr) {
      // Formulasiz model faqat bitta kirish bilan: y = x (dvigatel prepareModel bilan bir xil)
      if (modelInputs.length !== 1) errors.push(`variant ${vid || '-'}: formula required for ${modelInputs.length} inputs`);
      continue;
    }
    for (const s of modelInputs) if (!used.has(s)) errors.push(`variant ${vid || '-'}: input ${s} is not used in the formula`);
    // O'lchamlik (birliklar berilgan bo'lsa). Ref: JCGM GUM-6:2020 §11 (tekshirilmagan)
    const unitsBy = {};
    for (const s of used) {
      const def = inputs.find(i => i.symbol === s) || consts.find(c => c.symbol === s);
      const u = def && parseUnit(def.unit);
      if (u) unitsBy[s] = u;
      else if (def && def.unit && !isBlank(def.unit)) warnings.push(`variant ${vid || '-'}: unit "${def.unit}" of ${s} not recognised`);
    }
    if (Object.keys(unitsBy).length === used.size && used.size > 0) {
      const dims = analyzeDimensions(parse(splitFormula(v.formula).expr, v.inputs), unitsBy);
      dims.problems.filter(p => p.severity === 'error').forEach(p => errors.push(`variant ${vid || '-'}: ${p.code} ${p.detail}`));
      const outU = parseUnit(v.measurand.unit);
      if (dims.dim && outU && dimText(dims.dim) !== dimText(outU.dim)) {
        errors.push(`variant ${vid || '-'}: output unit ${v.measurand.unit} [${dimText(outU.dim)}] ≠ [${dimText(dims.dim)}]`);
      }
    }
  }
  // Uch tildagi matnlar (CLAUDE.md): sxema ham tekshiradi, bu yerda — bo'sh satrlar
  (function walk(o, path) {
    if (!o || typeof o !== 'object') return;
    const keys = Object.keys(o);
    if (keys.length && keys.every(k => LANGS.includes(k))) {
      for (const l of LANGS) if (typeof o[l] !== 'string' || !o[l].trim()) errors.push(`${path}: missing ${l} text`);
      return;
    }
    for (const k of keys) walk(o[k], `${path}.${k}`);
  })(tpl, '$');
  return { valid: errors.length === 0, errors, warnings };
}

/* ─── Shablon → hisob holati ───────────────────────────── */

/**
 * Shablon va foydalanuvchi ma'lumotidan hisob holatini (calc-state/v2 + `template` meta) yig'ish.
 *
 * @param {object} tpl   uc-template/1
 * @param {object} [data]
 *   variant, constants{belgi:son}, observations{belgi:[…]}, sources{id:{halfWidth,k,nu,sensitivity,distribution,include}},
 *   correlations{id:boolean}, settings{…}, directions[], typeA{belgi:{method,sp,nup,directional}},
 *   point (ko'p nuqtali shablon nuqtasi indeksi), useSample (shablondagi namunaviy ma'lumot)
 * @param {object} [opts]  lang ('en'), labSettings (laboratoriya sozlamalari), allowMissing
 * @returns {{state:object, meta:object, missing:object[]} | {error:string, detail?:any, missing?:object[]}}
 */
export function buildState(tpl, data = {}, opts = {}) {
  const lang = opts.lang || 'en';
  const variant = resolveVariant(tpl, data.variant);
  if (!variant) return { error: 'bad_variant', detail: data.variant };

  const inputsDef = tpl.inputs || [];
  const constDef = tpl.constants || [];
  let used;
  try { used = formulaSymbols(variant.formula, variant.inputs); }
  catch (e) { return { error: 'bad_formula', detail: e.message }; }

  // Kirishlar tartibi: shablondagi inputs, keyin formulada qatnashgan o'zgarmaslar
  const modelInputs = inputsDef.filter(i => variant.inputs.includes(i.symbol));
  const modelConsts = constDef.filter(c => variant.inputs.includes(c.symbol) && used.has(c.symbol));
  const auxConsts = constDef.filter(c => !(variant.inputs.includes(c.symbol) && used.has(c.symbol)));
  const params = [...modelInputs.map(i => i.symbol), ...modelConsts.map(c => c.symbol)];

  const missing = [];
  const constValue = c => {
    const fromData = data.constants && data.constants[c.symbol];
    if (!isBlank(fromData)) return toNum(fromData);
    const fromVariant = variant.constants[c.symbol];
    if (fromVariant !== undefined && fromVariant !== null) return fromVariant;
    return c.value === null || c.value === undefined ? NaN : c.value;
  };

  // Ko'p nuqtali shablon nuqtasi yoki namunaviy ma'lumot
  const point = Number.isInteger(data.point) && tpl.points ? tpl.points[data.point] : null;
  if (Number.isInteger(data.point) && !point) return { error: 'bad_point', detail: data.point };
  const sample = data.useSample ? (point ? point.data : (tpl.sampleData ? tpl.sampleData.data : null)) : null;
  const demo = !!(data.useSample && (point ? (point.demo !== undefined ? point.demo : (tpl.sampleData && tpl.sampleData.demo)) : (tpl.sampleData && tpl.sampleData.demo)));

  const measurements = {};
  for (const i of modelInputs) {
    const obs = (data.observations && data.observations[i.symbol]) || (sample && sample[i.symbol]) || [];
    measurements[i.symbol] = [...obs];
    if (!obs.some(v => isFinite(toNum(v)))) missing.push({ type: 'observation', symbol: i.symbol });
  }
  for (const c of modelConsts) {
    const v = constValue(c);
    measurements[c.symbol] = [v];
    if (!isFinite(v)) missing.push({ type: 'constant', symbol: c.symbol });
  }
  const aux = {};
  for (const c of auxConsts) aux[c.symbol] = constValue(c);

  // Kirishlar birligi (natija birligi — measurand.unit)
  const units = {};
  for (const i of modelInputs) if (!isBlank(i.unit)) units[i.symbol] = i.unit;
  for (const c of modelConsts) if (!isBlank(c.unit)) units[c.symbol] = c.unit;

  // A tur usuli (shablon → foydalanuvchi)
  const settingsTypeA = {};
  for (const i of modelInputs) {
    const t = { ...(i.typeA || {}), ...((data.typeA || {})[i.symbol] || {}) };
    delete t.pooledAllowed;
    Object.keys(t).forEach(k => { if (t[k] === null) delete t[k]; });
    if (Object.keys(t).length) settingsTypeA[i.symbol] = t;
  }

  // B tur manbalari
  const typeB = [], excluded = [];
  const patch = (point && point.patch) || {};
  for (const s of tpl.typeBSources || []) {
    if (!params.includes(s.input) || variant.excludeSources.includes(s.id)) continue;
    const user = (data.sources || {})[s.id] || {};
    const include = user.include !== undefined ? !!user.include : s.includeByDefault !== false;
    if (!include) { excluded.push(s.id); continue; }
    const legacyName = s.legacyName;
    const p = patch[legacyName] || patch[s.id] || {};
    const pick = key => (user[key] !== undefined && !isBlank(user[key]) ? user[key] : (p[key] !== undefined ? p[key] : s[key]));
    const halfWidth = pick('halfWidth');
    const entry = {
      name: legacyName || tr(s.name, lang),
      param: s.input,
      halfWidth: halfWidth === null || halfWidth === undefined ? '' : halfWidth,
      distribution: user.distribution || p.distribution || s.distribution,
    };
    const k = pick('k');
    if (entry.distribution === 'normal' && k !== null && k !== undefined && !isBlank(k)) entry.k = toNum(k);
    // k = null shablonda — sertifikatdan kiritilishi shart (dvigatelning standart k = 2 si jimgina olinmaydi)
    if (entry.distribution === 'normal' && k === null) missing.push({ type: 'k', id: s.id, symbol: s.input });
    const nu = pick('nu');
    if (nu !== null && nu !== undefined && !isBlank(nu)) entry.nu = toNum(nu);
    const sens = pick('sensitivity');
    if (sens !== null && sens !== undefined && !isBlank(sens)) entry.sensitivity = toNum(sens);
    if (s.unit !== undefined) entry.unit = s.unit;
    // Shablon metama'lumoti (dvigatel e'tiborsiz qoldiradi; UI va prepareState uchun)
    entry.sourceId = s.id;
    if (s.instrument) entry.instrument = s.instrument;
    entry.correlated = s.correlated !== undefined ? s.correlated : entry.distribution !== 'resol';
    if (isBlank(entry.halfWidth)) missing.push({ type: 'halfWidth', id: s.id, symbol: s.input });
    typeB.push(entry);
  }
  // B tur formulalarida ishlatilgan, qiymati berilmagan aux o'zgarmaslar
  const auxNames = Object.keys(aux);
  const auxUsed = new Set();
  for (const e of typeB) {
    if (typeof e.halfWidth !== 'string' || isBlank(e.halfWidth) || isFinite(toNum(e.halfWidth))) continue;
    try { variables(parse(e.halfWidth, [...params, ...auxNames])).forEach(v => { if (auxNames.includes(v)) auxUsed.add(v); }); }
    catch (_) { /* dvigatel bad_halfwidth beradi */ }
  }
  for (const a of auxUsed) if (!isFinite(aux[a])) missing.push({ type: 'constant', symbol: a });

  // Korrelyatsiyalar (bitta asbob)
  const correlations = [];
  for (const c of tpl.correlations || []) {
    const inVariant = c.inputs.filter(x => params.includes(x));
    if (inVariant.length < 2) continue;
    const enabled = data.correlations && data.correlations[c.id] !== undefined ? !!data.correlations[c.id]
      : c.defaultEnabled !== false;
    const r = data.correlationR && data.correlationR[c.id] !== undefined ? toNum(data.correlationR[c.id]) : c.r;
    if (enabled && (r === null || !isFinite(r))) missing.push({ type: 'correlation', id: c.id });
    correlations.push({ id: c.id, inputs: inVariant, r, instrument: c.sharedInstrument || '', enabled });
  }

  const settings = {
    ...APP_DEFAULTS,
    ...(opts.labSettings ? clone(opts.labSettings) : {}),
    ...clone(tpl.settings || {}),
    ...clone(data.settings || {}),
  };
  const tplTypeA = (tpl.settings && tpl.settings.typeA) || {};
  if (Object.keys(settingsTypeA).length || Object.keys(tplTypeA).length) {
    settings.typeA = { ...clone(tplTypeA), ...settingsTypeA, ...(((data.settings || {}).typeA) || {}) };
  }

  const directions = data.directions ? [...data.directions] : (tpl.directions ? [...tpl.directions] : []);

  const state = {
    params,
    measurements,
    directions,
    model: { formula: variant.formula, unit: variant.measurand.unit || '' },
    settings,
    covB: {},
    typeB,
    units,
    template: {
      id: tpl.id, version: tpl.version, status: tpl.status, title: clone(tpl.title),
      variant: variant.id, demo, aux, correlations, excluded,
      constants: modelConsts.map(c => c.symbol),
      standards: clone(variant.standards || []), labCount: tpl.labCount ?? null,
      openQuestions: (tpl.openQuestions || []).length,
      decisionRule: clone(variant.decisionRule || null),
      measurand: { symbol: variant.measurand.symbol, unit: variant.measurand.unit },
      point: point ? point.label : null,
    },
  };
  if (missing.length && !opts.allowMissing) return { error: 'template_incomplete', missing, state };
  return { state, meta: state.template, missing };
}

/* ─── Hisobdan oldin: aux o'zgarmasli formulalar va umumiy asbob kovariatsiyalari ─── */

function inputMeans(state) {
  const means = {}, typeA = (state.settings && state.settings.typeA) || {};
  for (const p of state.params) {
    const ta = typeAx(state.measurements[p] || [], { ...(typeA[p] || {}), dirs: state.directions || [] });
    means[p] = ta ? ta.mean : NaN;
  }
  return means;
}

/**
 * Hisob oldidan holatni tayyorlash (sof funksiya, yangi obyekt qaytaradi):
 *  1) B tur yarim kengligi aux o'zgarmaslarga bog'liq formula bo'lsa — son sifatida hisoblanadi;
 *  2) yoqilgan "bitta asbob" korrelyatsiyalari uchun covB:
 *     u(xi,xj) = r · u_X(xi) · u_X(xj),  u_X(x)² = Σ u_k(x)²  (x ning shu asbobga tegishli,
 *     korrelyatsiyalangan manbalari). Ref: JCGM 100:2008 §5.2.2 Eq. (14), F.1.2.3 Eq. (F.2).
 * `template` maydoni bo'lmagan eski holatlar o'zgarishsiz qaytadi.
 */
export function prepareState(state) {
  if (!state || !state.template) return state;
  const st = clone(state);
  const params = st.params || [];
  const aux = st.template.aux || {};
  const auxNames = Object.keys(aux);
  const means = inputMeans(st);
  const errors = [];

  for (const c of st.typeB || []) {
    const hw = c.halfWidthExpr !== undefined ? c.halfWidthExpr : c.halfWidth;
    if (typeof hw !== 'string' || isBlank(hw) || isFinite(toNum(hw)) || !auxNames.length) continue;
    let vars;
    try { vars = variables(parse(hw, [...params, ...auxNames])); }
    catch (_) { continue; } // dvigatel o'zi bad_halfwidth beradi
    if (![...vars].some(v => auxNames.includes(v))) continue;
    try {
      c.halfWidthExpr = hw;
      c.halfWidth = valueOrExpr(hw, [...params, ...auxNames], { ...means, ...aux });
    } catch (_) {
      errors.push({ code: 'aux_eval', id: c.sourceId || c.name });
    }
  }

  const covB = { ...(st.covB || {}) };
  for (const corr of st.template.correlations || []) {
    const ins = corr.inputs.filter(x => params.includes(x));
    for (let i = 0; i < ins.length; i++) {
      for (let j = i + 1; j < ins.length; j++) {
        const [a, b] = params.indexOf(ins[i]) < params.indexOf(ins[j]) ? [ins[i], ins[j]] : [ins[j], ins[i]];
        const key = pairKey(a, b);
        if (!corr.enabled) { delete covB[key]; continue; }
        const uX = x => Math.sqrt((st.typeB || [])
          .filter(c => c.param === x && c.correlated !== false && (!corr.instrument || c.instrument === corr.instrument))
          .reduce((s, c) => {
            let hw;
            try { hw = valueOrExpr(c.halfWidth, params, means); } catch (_) { hw = NaN; }
            const mult = c.sensitivity === undefined || c.sensitivity === null || c.sensitivity === '' ? 1 : Number(c.sensitivity) || 0;
            const u = Math.abs(mult) * typeBStd(hw, c.distribution, c.k);
            return s + (isFinite(u) ? u * u : 0);
          }, 0));
        const cov = Number(corr.r) * uX(a) * uX(b);
        if (isFinite(cov) && cov !== 0) covB[key] = cov; else delete covB[key];
      }
    }
  }
  st.covB = covB;
  if (errors.length) st.template = { ...st.template, prepareErrors: errors };
  return st;
}

/** Holat → dvigatel kirishi (uc-model/1). Shablon metama'lumoti va UI maydonlari olib tashlanadi. */
export function stateToSpec(state) {
  const st = prepareState(state);
  const spec = toModel(st);
  spec.typeB = spec.typeB.map(c => {
    const out = {};
    for (const k of ['name', 'input', 'halfWidth', 'distribution', 'k', 'nu', 'sensitivity', 'unit']) if (c[k] !== undefined) out[k] = c[k];
    return out;
  });
  return spec;
}

/**
 * Shablon bo'yicha hisob: shablon → holat → modelSpec → evaluate().
 * @returns {{result:object, spec:object, state:object, meta:object, missing:object[]} | {error, missing?}}
 */
export function evaluateTemplate(tpl, data = {}, opts = {}) {
  const b = buildState(tpl, data, opts);
  if (b.error) return b;
  const spec = stateToSpec(b.state);
  const result = evaluate(spec);
  return { result, spec, state: b.state, meta: b.meta, missing: b.missing };
}

/* ─── Holat oqimi va versiyalash (muharrir uchun, sof) ─────────── */

const NEXT = { DRAFT: ['REVIEWED'], REVIEWED: ['APPROVED', 'DRAFT'], APPROVED: ['RETIRED'], RETIRED: [] };

/** Ruxsat etilgan holat o'tishlari: DRAFT → REVIEWED → APPROVED (→ RETIRED); REVIEWED → DRAFT (qaytarish). */
export function canTransition(from, to) {
  return (NEXT[from] || []).includes(to);
}

/** Holatni o'zgartirish (yangi obyekt). APPROVED dan keyin tahrir — faqat newVersion orqali. */
export function transition(tpl, to, { by = '', at = new Date().toISOString(), note = '' } = {}) {
  if (!canTransition(tpl.status, to)) return { error: 'bad_transition', detail: `${tpl.status} → ${to}` };
  const t = clone(tpl);
  t.status = to;
  if (to === 'APPROVED' && !t.locked) t.locked = [...DEFAULT_LOCKED];
  t.updatedAt = at;
  t.history = [...(t.history || []), { at, status: to, version: t.version, ...(by ? { by } : {}), ...(note ? { note } : {}) }];
  return { template: t };
}

/** Qulflangan bo'limlar (APPROVED/RETIRED). */
export function lockedSections(tpl) {
  if (tpl.status !== 'APPROVED' && tpl.status !== 'RETIRED') return [];
  return tpl.locked && tpl.locked.length ? [...tpl.locked] : [...DEFAULT_LOCKED];
}

/**
 * Tahrirni qo'llash: APPROVED shablonning qulflangan bo'limini o'zgartirish rad etiladi
 * (faqat newVersion orqali). Qulflanmagan maydonlar (masalan, sourceNote, openQuestions) o'zgaradi.
 */
export function applyEdit(tpl, patch) {
  const locked = lockedSections(tpl);
  const touched = Object.keys(patch).filter(k => locked.includes(k) && JSON.stringify(patch[k]) !== JSON.stringify(tpl[k]));
  if (touched.length) return { error: 'locked', detail: touched };
  if (tpl.status === 'RETIRED') return { error: 'retired' };
  if (patch.status !== undefined && patch.status !== tpl.status) return { error: 'use_transition' };
  return { template: { ...clone(tpl), ...clone(patch) } };
}

/** Yangi versiya: semver minor + 1 (yoki 'major'/'patch'), holat DRAFT, qulf olinadi, tarix saqlanadi. */
export function newVersion(tpl, { bump = 'minor', at = new Date().toISOString(), by = '' } = {}) {
  const [M, m, p] = String(tpl.version).split('.').map(Number);
  const version = bump === 'major' ? `${M + 1}.0.0` : bump === 'patch' ? `${M}.${m}.${p + 1}` : `${M}.${m + 1}.0`;
  const t = clone(tpl);
  t.version = version;
  t.status = 'DRAFT';
  delete t.locked;
  t.updatedAt = at;
  t.history = [...(t.history || []), { at, status: 'DRAFT', version, note: `new version from ${tpl.version}`, ...(by ? { by } : {}) }];
  return { template: t };
}

/* ─── Katalog: qidiruv ───────────────────────────────── */

const norm = s => String(s || '').toLowerCase().replace(/[\s.\-–]/g, '');

/** Qidiruv: standart shifri ("10180", "ГОСТ 10180", "IEC 60335"), ID yoki nomi bo'yicha. */
export function matchTemplate(tpl, query) {
  const q = norm(query);
  if (!q) return true;
  const stds = [...(tpl.standards || []), ...((tpl.variants || []).flatMap(v => v.standards || []))];
  if (stds.some(s => norm(s.code).includes(q))) return true;
  if (norm(tpl.id).includes(q)) return true;
  return LANGS.some(l => norm(tr(tpl.title, l)).includes(q));
}
