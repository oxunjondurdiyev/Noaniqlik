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
                    orasidagi korrelyatsiya (u(xi,xj) = r·u_X(xi)·u_X(xj)). P04b: asbob
                    kalibrlash manbasi umumiy (share: 'common', covB ga kiradi) va nuqtaga
                    xos (share: 'point', hech qachon covB ga kirmaydi) qismga bo'linadi;
                    split: 'unknown' — r = 0 va r = 1 hisoblanib, katta u_c olinadi.
     • includeByDefault: false — standart holatda kiritilmaydigan manba.
     • unit       — har bir kirish va natija birligi (units.js o'lchamlik tekshiruvi).
═══════════════════════════════════════════════════════════════ */
import { evaluate, toModel, typeAx, typeB as typeBStd, valueOrExpr, parseUnit, pairKey, isBlank, toNum, splitFormula, parse, analyzeDimensions, dimText } from '../engine/index.js';

/** U / k ko'rinishida beriladigan taqsimotlar (k sertifikatdan): normal va log-normal (P06) */
const KDIST = d => d === 'normal' || d === 'lognorm';
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
  if (isRegression(tpl)) return checkRegressionTemplate(tpl, errors, warnings);
  if (isTopDown(tpl)) return checkTopDownTemplate(tpl, errors, warnings);
  if (isSpecial(tpl)) return checkSpecialTemplate(tpl, errors, warnings);
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
    if (s.share === 'point' && s.correlated !== false) errors.push(`source ${s.id}: share 'point' must be correlated: false`);
    if (s.share && !s.instrument) errors.push(`source ${s.id}: share requires instrument`);
    if (s.distribution === 'resol' && s.correlated !== false && s.instrument) errors.push(`source ${s.id}: resolution must be correlated: false`);
    if (s.allowedDistributions && !s.allowedDistributions.includes(s.distribution)) errors.push(`source ${s.id}: distribution not in allowedDistributions`);
    if (s.unit && !isBlank(s.unit) && !parseUnit(s.unit)) warnings.push(`source ${s.id}: unit "${s.unit}" not recognised`);
  }
  for (const c of tpl.correlations || []) {
    for (const x of c.inputs) if (!inputs.some(i => i.symbol === x)) errors.push(`correlation ${c.id}: unknown input ${x}`);
    // P04b: har bir kirishda asbobning umumiy va nuqtaga xos kalibrlash qatori bo'lishi shart
    if (c.sharedInstrument && c.split === undefined) warnings.push(`correlation ${c.id}: P04 format without split (migrateTemplate → 'unknown')`);
    if (c.sharedInstrument && c.split !== undefined) {
      for (const x of c.inputs) {
        const rows = (tpl.typeBSources || []).filter(s => s.input === x && s.instrument === c.sharedInstrument);
        if (!rows.some(s => s.share === 'common' && s.correlated !== false)) errors.push(`correlation ${c.id}: input ${x} has no common calibration row (share: 'common')`);
        if (c.split === 'known' && !rows.some(s => s.share === 'point' && s.correlated === false)) errors.push(`correlation ${c.id}: input ${x} has no point-specific calibration row (share: 'point', correlated: false)`);
      }
    }
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
  checkTexts(tpl, errors);
  return { valid: errors.length === 0, errors, warnings };
}

/** Uch tildagi matnlar (CLAUDE.md): sxema ham tekshiradi, bu yerda — bo'sh satrlar */
function checkTexts(tpl, errors) {
  (function walk(o, path) {
    if (!o || typeof o !== 'object') return;
    const keys = Object.keys(o);
    if (keys.length && keys.every(k => LANGS.includes(k))) {
      for (const l of LANGS) if (typeof o[l] !== 'string' || !o[l].trim()) errors.push(`${path}: missing ${l} text`);
      return;
    }
    for (const k of keys) walk(o[k], `${path}.${k}`);
  })(tpl, '$');
}

/* ─── REGRESSION rejimi (P08) ───────────────────────────── */

export const isRegression = tpl => !!tpl && tpl.evaluationMode === 'REGRESSION';

/** REGRESSION shablonining semantik tekshiruvi (formula tavsifiy — tahlil qilinmaydi). */
function checkRegressionTemplate(tpl, errors, warnings) {
  const rg = tpl.regression;
  if (!rg) { errors.push('regression: section required for evaluationMode REGRESSION'); return { valid: false, errors, warnings }; }
  const inputs = tpl.inputs || [];
  const sym = inputs.map(i => i.symbol);
  if (new Set(sym).size !== sym.length) errors.push('duplicate symbols');
  for (const k of ['x', 'y']) if (!sym.includes(rg[k])) errors.push(`regression.${k}: unknown input ${rg[k]}`);
  if (rg.x === rg.y) errors.push('regression: x and y must be different inputs');
  if (rg.method === 'WTLS' && rg.degree !== 1) errors.push('regression: WTLS supports degree 1 only');
  if (rg.allowedMethods && !rg.allowedMethods.includes(rg.method)) errors.push('regression: method not in allowedMethods');
  if ((tpl.typeBSources || []).length) errors.push('regression: typeBSources are not used in REGRESSION mode (u(x_i), u(y_i) are entered per point)');
  if (tpl.variants && tpl.variants.length) errors.push('regression: variants are not supported in REGRESSION mode');
  // Raqam o'ylab topilmaydi: shablondagi har qanday son — faqat demo: true bilan (TEMPLATE_GUIDE §1)
  const numeric = (rg.calibrationPoints || []).length || ((rg.inverse || {}).y0 || []).length || ((rg.predict || {}).x || []).length
    || ((rg.inverse || {}).uy0 !== null && (rg.inverse || {}).uy0 !== undefined);
  if (numeric && rg.demo !== true) errors.push('regression: numeric values are allowed only as sample data (demo: true)');
  for (const [i, p] of (rg.calibrationPoints || []).entries()) {
    if (p.x === null || p.y === null) errors.push(`regression.calibrationPoints[${i}]: x and y required`);
  }
  for (const i of inputs) if (i.unit && !isBlank(i.unit) && !parseUnit(i.unit)) warnings.push(`unit "${i.unit}" of ${i.symbol} not recognised`);
  checkTexts(tpl, errors);
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * REGRESSION shabloni + foydalanuvchi ma'lumoti → modelSpec ('uc-regression/1').
 * Bo'sh maydon bilan hisob qilinmaydi: kalibrlash nuqtalari kiritilmagan bo'lsa — `missing`.
 * @param {object} tpl
 * @param {{points?:object[], method?:string, degree?:number, xRef?:number, inverse?:object[], predict?:object[],
 *          settings?:object, uRange?:object, covY?:number[][], useSample?:boolean}} [data]
 * @returns {{spec:object, meta:object, missing:object[]} | {error:string, missing?:object[]}}
 */
export function buildRegressionSpec(tpl, data = {}, opts = {}) {
  if (!isRegression(tpl) || !tpl.regression) return { error: 'not_regression_template' };
  const rg = tpl.regression;
  const xin = (tpl.inputs || []).find(i => i.symbol === rg.x) || {};
  const yin = (tpl.inputs || []).find(i => i.symbol === rg.y) || {};
  const sample = !!data.useSample && rg.demo === true;
  const filled = p => p && !isBlank(p.x) && !isBlank(p.y);
  const points = (data.points || (sample ? rg.calibrationPoints : []) || []).filter(filled).map(p => ({ ...p }));
  const missing = [];
  if (!points.length) missing.push({ type: 'regression_points', id: rg.x, name: rg.x });
  const inv = rg.inverse || {};
  let inverse = data.inverse;
  if (!inverse && sample && inv.enabled && (inv.y0 || []).length) {
    inverse = [{ y0: [...inv.y0], ...(inv.uy0 !== null && inv.uy0 !== undefined ? { uy0: inv.uy0 } : {}) }];
  }
  const predict = data.predict || (sample && (rg.predict || {}).x ? rg.predict.x.map(x => ({ x })) : []);
  const ts = tpl.settings || {}, ds = data.settings || {}, lab = opts.labSettings || {};
  const settings = {
    ...(lab.P !== undefined ? { P: lab.P } : {}), ...(lab.nuRule ? { nuRule: lab.nuRule } : {}),
    ...(ts.P !== undefined ? { P: ts.P } : {}), ...(ts.nuRule ? { nuRule: ts.nuRule } : {}),
    ...(rg.sigma && rg.sigma !== 'auto' ? { sigma: rg.sigma } : {}),
    ...(rg.chi2P !== undefined ? { chi2P: rg.chi2P } : {}),
    ...ds,
  };
  const spec = {
    format: 'uc-regression/1',
    method: data.method || rg.method,
    model: { degree: data.degree || rg.degree, ...(data.xRef !== undefined ? { xRef: data.xRef } : (rg.xRef !== null && rg.xRef !== undefined ? { xRef: rg.xRef } : {})) },
    units: { x: xin.unit || '', y: yin.unit || '' },
    points,
    ...(data.covY ? { covY: data.covY } : {}),
    settings,
    predict: predict || [],
    inverse: inverse || [],
    ...(data.uRange ? { uRange: data.uRange } : {}),
  };
  const lang = opts.lang || 'en';
  const meta = {
    id: tpl.id, version: tpl.version, status: tpl.status, title: clone(tpl.title),
    mode: 'REGRESSION', demo: sample && !data.points, variant: '',
    standards: clone(tpl.standards || []), labCount: tpl.labCount ?? null,
    openQuestions: (tpl.openQuestions || []).length,
    measurand: { symbol: tpl.measurand.symbol, unit: tpl.measurand.unit },
    x: { symbol: rg.x, unit: xin.unit || '' }, y: { symbol: rg.y, unit: yin.unit || '' },
    ...(opts.ui ? {
      xName: tr(xin.name, lang), yName: tr(yin.name, lang), measurandName: tr(tpl.measurand.name, lang),
      hint: tr(rg.hint, lang), inverseHint: tr(inv.hint, lang), sourceNote: tr(tpl.sourceNote, lang),
      demoNote: tr(rg.demoNote, lang),
      openQuestionList: (tpl.openQuestions || []).map(q => ({ id: q.id, text: tr(q.text, lang), owner: q.owner, blocking: !!q.blocking })),
    } : {}),
  };
  if (missing.length && !opts.allowMissing) return { error: 'template_incomplete', missing, spec, meta };
  return { spec, meta, missing };
}

/* ─── TOP_DOWN rejimi (P09) ─────────────────────────────── */

export const isTopDown = tpl => !!tpl && tpl.evaluationMode === 'TOP_DOWN';

/** R_w / s_R ta'rif bo'yicha qamraydigan toifalar (src/engine/topdown/index.js BASE_COVERS bilan bir xil). */
const TD_BASE_COVERS = ['repeatability', 'intermediate_precision'];

/** TOP_DOWN shablonining semantik tekshiruvi (formula tavsifiy — tahlil qilinmaydi). */
function checkTopDownTemplate(tpl, errors, warnings) {
  const td = tpl.topDown;
  if (!td) { errors.push('topDown: section required for evaluationMode TOP_DOWN'); return { valid: false, errors, warnings }; }
  const sym = (tpl.inputs || []).map(i => i.symbol);
  if (new Set(sym).size !== sym.length) errors.push('duplicate symbols');
  if ((tpl.typeBSources || []).length) errors.push('topDown: typeBSources are not used in TOP_DOWN mode (use topDown.additional for effects not covered by R_w)');
  if (tpl.variants && tpl.variants.length) errors.push('topDown: variants are not supported in TOP_DOWN mode');
  if (td.basis === 'within') {
    if (!(td.rwSources || []).length) errors.push('topDown.rwSources: at least one source of u(R_w) required for basis "within"');
  } else {
    if ((td.rwSources || []).length) errors.push(`topDown.rwSources: not used with basis "${td.basis}"`);
    if (td.biasSource && td.biasSource !== 'none') errors.push(`topDown.biasSource: not used with basis "${td.basis}"`);
  }
  if (td.basis === 'level' && td.scale !== 'absolute') errors.push('topDown: basis "level" requires scale "absolute" (QUAM:2012 E.5.2.1)');
  if (td.scale === 'absolute' && isBlank(tpl.measurand && tpl.measurand.unit)) errors.push('topDown: scale "absolute" requires measurand.unit');
  if (['recovery', 'recovery_quam'].includes(td.biasSource) && td.scale !== 'relative') errors.push('topDown: recovery requires scale "relative"');
  // X12: empirik kattalikda usul bias'i ta'rif bo'yicha 0 (QUAM:2012 §7.9.2). Bias manbasi taqiqlanmaydi (tayanch qiymat shu usul
  // bilan olingan bo'lishi mumkin, §7.9.3) — usta "tayanch qiymat qaysi usul bilan olingan" savolini majburiy beradi (R-20).
  if (tpl.isEmpiricalMeasurand === true && td.biasSource && td.biasSource !== 'none') {
    warnings.push('topDown: X12 — bias source for an empirical measurand: the wizard will require the reference-method answer (QUAM:2012 §7.9.2–7.9.3)');
  }
  // X11: qo'shimcha hissa toifasi nazorat namunasi qamraydigan toifalar ichida bo'lmasligi kerak
  const covers = new Set([...TD_BASE_COVERS, ...(td.basis === 'sR' ? ['reproducibility'] : []), ...(td.covers || [])]);
  const ids = (td.additional || []).map(a => a.id);
  if (new Set(ids).size !== ids.length) errors.push('topDown.additional: duplicate ids');
  for (const a of td.additional || []) {
    if (covers.has(a.category)) errors.push(`topDown.additional.${a.id}: X11 — category "${a.category}" is already covered by the top-down basis (double counting)`);
  }
  for (const k of ['linkedTemplate', 'regressionTemplate']) if (td[k] && td[k] === tpl.id) errors.push(`topDown.${k}: self reference`);
  for (const i of tpl.inputs || []) if (i.unit && !isBlank(i.unit) && !parseUnit(i.unit)) warnings.push(`unit "${i.unit}" of ${i.symbol} not recognised`);
  checkTexts(tpl, errors);
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * TOP_DOWN shabloni → usta (wizard) boshlang'ich holati (src/ui/topdown/build.js::defaults bilan birlashtiriladi).
 * Raqam o'ylab topilmaydi: barcha sonli maydonlar bo'sh, qo'shimcha hissalarning u qiymati — ''.
 * @returns {{state:object, meta:object} | {error:string}}
 */
export function buildTopDownState(tpl, opts = {}) {
  if (!isTopDown(tpl) || !tpl.topDown) return { error: 'not_topdown_template' };
  const td = tpl.topDown;
  const lang = opts.lang || 'en';
  const state = {
    step: 1,
    basis: td.basis,
    rwSources: td.basis === 'within' ? [...(td.rwSources || [])] : [],
    bias: td.basis === 'within' ? (td.biasSource || 'none') : 'none',
    scale: td.basis === 'level' ? 'absolute' : td.scale,
    unit: (tpl.measurand && tpl.measurand.unit) || '',
    empirical: tpl.isEmpiricalMeasurand === true,
    covers: [...(td.covers || [])],
    additional: (td.additional || []).map(a => ({ name: tr(a.name, lang), category: a.category, u: '' })),
  };
  const meta = {
    id: tpl.id, version: tpl.version, status: tpl.status, title: clone(tpl.title),
    mode: 'TOP_DOWN', demo: false, variant: '',
    standards: clone(tpl.standards || []), labCount: tpl.labCount ?? null,
    openQuestions: (tpl.openQuestions || []).length,
    measurand: { symbol: tpl.measurand.symbol, unit: tpl.measurand.unit },
    isEmpiricalMeasurand: tpl.isEmpiricalMeasurand === true,
    ...(td.linkedTemplate ? { linkedTemplate: td.linkedTemplate } : {}),
    ...(td.regressionTemplate ? { regressionTemplate: td.regressionTemplate } : {}),
    ...(opts.ui ? {
      measurandName: tr(tpl.measurand.name, lang), hint: tr(td.hint, lang), sourceNote: tr(tpl.sourceNote, lang),
      additionalHints: (td.additional || []).filter(a => a.hint).map(a => ({ id: a.id, text: tr(a.hint, lang) })),
      openQuestionList: (tpl.openQuestions || []).map(q => ({ id: q.id, text: tr(q.text, lang), owner: q.owner, blocking: !!q.blocking })),
    } : {}),
  };
  return { state, meta };
}

/* ─── Maxsus rejimlar (P10) ─────────────────────────────── */

export const SPECIAL_MODES = { SAMPLING: 'sampling', QUALITATIVE: 'qualitative', MICROBIOLOGY: 'micro', MEDICAL: 'medical' };
export const isSpecial = tpl => !!tpl && Object.prototype.hasOwnProperty.call(SPECIAL_MODES, tpl.evaluationMode);

function checkSpecialTemplate(tpl, errors, warnings) {
  const sp = tpl.special;
  if (!sp) { errors.push('special: section required for evaluationMode ' + tpl.evaluationMode); return { valid: false, errors, warnings }; }
  if ((tpl.typeBSources || []).length) errors.push('special: typeBSources are not used in this evaluation mode');
  if (tpl.variants && tpl.variants.length) errors.push('special: variants are not supported in this evaluation mode');
  if (tpl.evaluationMode !== 'SAMPLING' && (sp.method !== undefined || sp.logTransform !== undefined)) errors.push('special: method / logTransform apply to SAMPLING only');
  if (tpl.evaluationMode === 'MEDICAL' && isBlank(tpl.measurand && tpl.measurand.unit)) errors.push('special: MEDICAL requires measurand.unit');
  // BETA rejimlar manba misoli bilan tasdiqlanmagan — APPROVED holatiga o'tkazib bo'lmaydi
  if (['MICROBIOLOGY', 'MEDICAL'].includes(tpl.evaluationMode)) {
    if (tpl.status === 'APPROVED') errors.push(`special: ${tpl.evaluationMode} is BETA (unverified) — the template cannot be APPROVED`);
    else warnings.push(`special: ${tpl.evaluationMode} is BETA (unverified: the standard is not in docs/references/)`);
  }
  checkTexts(tpl, errors);
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Maxsus rejim shabloni → "Maxsus rejimlar" oynasining boshlang'ich holati (src/ui/special/build.js::defaults bilan birlashtiriladi).
 * Raqam o'ylab topilmaydi: barcha sonli maydonlar bo'sh.
 */
export function buildSpecialState(tpl, opts = {}) {
  if (!isSpecial(tpl) || !tpl.special) return { error: 'not_special_template' };
  const sp = tpl.special, lang = opts.lang || 'en', mode = SPECIAL_MODES[tpl.evaluationMode];
  const unit = (tpl.measurand && tpl.measurand.unit) || '';
  const state = { mode,
    ...(mode === 'sampling' ? { saUnit: unit, saMethod: sp.method || 'classical', saLog: sp.logTransform === true } : {}),
    ...(mode === 'micro' && unit ? { miUnit: unit } : {}),
    ...(mode === 'medical' ? { meUnit: unit } : {}) };
  const meta = {
    id: tpl.id, version: tpl.version, status: tpl.status, title: clone(tpl.title),
    mode: tpl.evaluationMode, demo: false, variant: '',
    standards: clone(tpl.standards || []), labCount: tpl.labCount ?? null,
    openQuestions: (tpl.openQuestions || []).length,
    measurand: { symbol: tpl.measurand.symbol, unit },
    ...(opts.ui ? {
      measurandName: tr(tpl.measurand.name, lang), hint: tr(sp.hint, lang), sourceNote: tr(tpl.sourceNote, lang),
      openQuestionList: (tpl.openQuestions || []).map(q => ({ id: q.id, text: tr(q.text, lang), owner: q.owner, blocking: !!q.blocking })),
    } : {}),
  };
  return { state, meta };
}

/* ─── Shablon → hisob holati ───────────────────────────── */

/** P04b: split = 'unknown' bo'lsa nuqtaga xos qator ishlatilmaydi (umumiy qatorda sertifikatning to'liq U si) */
export function pointRowIgnored(entry, correlations) {
  return entry.share === 'point' && (correlations || []).some(c => c.split === 'unknown' && c.inputs.includes(entry.param) &&
    (!c.instrument || c.instrument === entry.instrument));
}

function uiExtra(s, lang) {
  return { kind: s.kind, hint: tr(s.hint, lang), ...(s.note ? { note: tr(s.note, lang) } : {}),
    ...(s.includeByDefault === false ? { optional: true } : {}) };
}
function uiEntry(s, lang) {
  const e = { name: s.legacyName || tr(s.name, lang), param: s.input, halfWidth: s.halfWidth === null ? '' : s.halfWidth,
    distribution: s.distribution, sourceId: s.id, correlated: s.correlated !== undefined ? s.correlated : s.distribution !== 'resol' };
  if (s.unit !== undefined) e.unit = s.unit;
  if (s.instrument) e.instrument = s.instrument;
  if (KDIST(s.distribution) && s.k !== null && s.k !== undefined) e.k = s.k;
  if (KDIST(s.distribution) && s.k === null) e.kRequired = true;
  // P06: parametrli taqsimotlar — β (trapetsiya), d (egri trapetsiya). Ref: JCGM 101:2008 §6.4.3, §6.4.4
  for (const key of ['beta', 'd']) if (s[key] !== undefined) e[key] = s[key];
  return Object.assign(e, uiExtra(s, lang));
}

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
  if (isRegression(tpl)) return { error: 'regression_template' }; // P08: buildRegressionSpec ishlatiladi
  if (isTopDown(tpl)) return { error: 'topdown_template' }; // P09: buildTopDownState → usta (src/ui/topdown/)
  if (isSpecial(tpl)) return { error: 'special_template' }; // P10: buildSpecialState → "Maxsus rejimlar" oynasi (src/ui/special/)
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

  // Korrelyatsiyalar (bitta asbob). split yo'q — P04 dagi eski format → 'unknown' (migrateTemplate bilan bir xil)
  const correlations = [];
  for (const c of tpl.correlations || []) {
    const inVariant = c.inputs.filter(x => params.includes(x));
    if (inVariant.length < 2) continue;
    const enabled = data.correlations && data.correlations[c.id] !== undefined ? !!data.correlations[c.id]
      : c.defaultEnabled !== false;
    const r = data.correlationR && data.correlationR[c.id] !== undefined ? toNum(data.correlationR[c.id]) : c.r;
    if (enabled && (r === null || !isFinite(r))) missing.push({ type: 'correlation', id: c.id });
    const split = data.correlationSplit && data.correlationSplit[c.id] ? data.correlationSplit[c.id] : (c.split || 'unknown');
    correlations.push({ id: c.id, inputs: inVariant, r, instrument: c.sharedInstrument || '', enabled, split });
  }

  // B tur manbalari
  const typeB = [], excluded = [], excludedEntries = [];
  const patch = (point && point.patch) || {};
  for (const s of tpl.typeBSources || []) {
    if (!params.includes(s.input) || variant.excludeSources.includes(s.id)) continue;
    const user = (data.sources || {})[s.id] || {};
    const include = user.include !== undefined ? !!user.include : s.includeByDefault !== false;
    if (!include) { excluded.push(s.id); if (opts.ui) excludedEntries.push(uiEntry(s, lang)); continue; }
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
    if (KDIST(entry.distribution) && k !== null && k !== undefined && !isBlank(k)) entry.k = toNum(k);
    for (const key of ['beta', 'd']) { const v = pick(key); if (v !== null && v !== undefined && !isBlank(v)) entry[key] = toNum(v); }
    // k = null shablonda — sertifikatdan kiritilishi shart (dvigatelning standart k = 2 si jimgina olinmaydi)
    if (KDIST(entry.distribution) && k === null) {
      missing.push({ type: 'k', id: s.id, symbol: s.input });
      if (opts.ui) entry.kRequired = true;
    }
    if (opts.ui) Object.assign(entry, uiExtra(s, lang));
    const nu = pick('nu');
    if (nu !== null && nu !== undefined && !isBlank(nu)) entry.nu = toNum(nu);
    const sens = pick('sensitivity');
    if (sens !== null && sens !== undefined && !isBlank(sens)) entry.sensitivity = toNum(sens);
    if (s.unit !== undefined) entry.unit = s.unit;
    // Shablon metama'lumoti (dvigatel e'tiborsiz qoldiradi; UI va prepareState uchun)
    entry.sourceId = s.id;
    if (s.instrument) entry.instrument = s.instrument;
    entry.correlated = s.correlated !== undefined ? s.correlated : entry.distribution !== 'resol';
    if (s.share) entry.share = s.share;
    for (const key of ['certificateU', 'certificateK']) {
      const v = pick(key);
      if (v !== null && v !== undefined && !isBlank(v)) entry[key] = toNum(v);
    }
    const ignored = pointRowIgnored(entry, correlations);
    if (ignored) { const i = missing.findIndex(m => m.type === 'k' && m.id === s.id); if (i >= 0) missing.splice(i, 1); }
    if (isBlank(entry.halfWidth) && !ignored) missing.push({ type: 'halfWidth', id: s.id, symbol: s.input });
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
      ...(opts.ui ? {
        excludedEntries,
        inputInfo: Object.fromEntries([...modelInputs, ...modelConsts].map(i => [i.symbol, { name: tr(i.name, lang), hint: tr(i.hint, lang), kind: i.kind || 'constant' }])),
        auxInfo: Object.fromEntries(auxConsts.map(c => [c.symbol, { name: tr(c.name, lang), hint: tr(c.hint, lang), unit: c.unit, ref: tr(c.ref, lang) }])),
        constInfo: Object.fromEntries(modelConsts.map(c => [c.symbol, { name: tr(c.name, lang), hint: tr(c.hint, lang), unit: c.unit, ref: tr(c.ref, lang) }])),
        correlationInfo: Object.fromEntries((tpl.correlations || []).map(c => [c.id, { question: tr(c.question, lang), note: tr(c.note, lang) }])),
        openQuestionList: (tpl.openQuestions || []).map(q => ({ id: q.id, text: tr(q.text, lang), owner: q.owner, blocking: !!q.blocking })),
        variantTitle: variant.title ? tr(variant.title, lang) : '',
        measurandName: tr(variant.measurand.name, lang),
        sourceNote: tr(tpl.sourceNote, lang),
      } : {}),
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
export function prepareState(state, opts = {}) {
  if (!state || !state.template) return state;
  const st = upgradeState(state);
  const corrs = st.template.correlations || [];
  // split = 'unknown': nuqtaga xos qatorlar hisobga kirmaydi (to'liq U umumiy qatorda)
  st.typeB = (st.typeB || []).filter(c => !pointRowIgnored(c, corrs));
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

  const uOf = c => {
    let hw;
    try { hw = valueOrExpr(c.halfWidth, params, means); } catch (_) { hw = NaN; }
    const mult = c.sensitivity === undefined || c.sensitivity === null || c.sensitivity === '' ? 1 : Number(c.sensitivity) || 0;
    const u = Math.abs(mult) * typeBStd(hw, c.distribution, c.k, c);
    return isFinite(u) ? u : 0;
  };
  // Ikki marta hisoblash tekshiruvi: u²(umumiy) + u²(nuqta) ≤ u²(sertifikat) = (U/k)²
  const warnings = [];
  for (const c of st.typeB) {
    if (c.share !== 'common' || !(Number(c.certificateU) > 0) || !(Number(c.certificateK) > 0)) continue;
    const uCert = Number(c.certificateU) / Number(c.certificateK);
    const sum2 = st.typeB.filter(x => x.param === c.param && x.instrument === c.instrument && (x === c || x.share === 'point'))
      .reduce((s, x) => s + uOf(x) ** 2, 0);
    if (sum2 > uCert * uCert * (1 + 1e-9)) warnings.push({ code: 'split_exceeds', id: c.sourceId, param: c.param, value: Math.sqrt(sum2) / uCert });
  }

  const covB = { ...(st.covB || {}) };
  for (const corr of corrs) {
    const ins = corr.inputs.filter(x => params.includes(x));
    for (let i = 0; i < ins.length; i++) {
      for (let j = i + 1; j < ins.length; j++) {
        const [a, b] = params.indexOf(ins[i]) < params.indexOf(ins[j]) ? [ins[i], ins[j]] : [ins[j], ins[i]];
        const key = pairKey(a, b);
        if (!corr.enabled) { delete covB[key]; continue; }
        // Faqat umumiy qism (share !== 'point'), korrelyatsiyalangan manbalar. Ref: EA-4/02 M:2022 D4–D5 (D.6, D.8)
        const uX = x => Math.sqrt((st.typeB || [])
          .filter(c => c.param === x && c.correlated !== false && c.share !== 'point' && (!corr.instrument || c.instrument === corr.instrument))
          .reduce((s, c) => s + uOf(c) ** 2, 0));
        const r = opts.rOverride && opts.rOverride[corr.id] !== undefined ? opts.rOverride[corr.id] : Number(corr.r);
        const cov = r * uX(a) * uX(b);
        if (isFinite(cov) && cov !== 0) covB[key] = cov; else delete covB[key];
      }
    }
  }
  st.covB = covB;
  if (errors.length || warnings.length) st.template = { ...st.template, ...(errors.length ? { prepareErrors: errors } : {}), ...(warnings.length ? { prepareWarnings: warnings } : {}) };
  return st;
}

/**
 * P04 dagi (split maydonisiz) hisob holatini P04b ga keltirish: korrelyatsiya → split 'unknown'
 * (bitta qatorli sertifikat manbasi to'liq U ni saqlaydi). Ma'lumot o'zgarmaydi. Sof funksiya.
 */
export function upgradeState(state) {
  const st = clone(state);
  if (st && st.template && Array.isArray(st.template.correlations)) {
    st.template.correlations = st.template.correlations.map(c => (c.split ? c : { ...c, split: 'unknown' }));
  }
  return st;
}

/**
 * P04 dagi (split maydonisiz) shablonni P04b formatiga keltirish. Foydalanuvchi ma'lumoti (yarim kenglik,
 * k va h.k.) yo'qolmaydi: bitta qatorli sertifikat manbasi share: 'common' bo'ladi va to'liq U ni saqlaydi,
 * korrelyatsiya split: 'unknown' ga o'tadi (konservativ chegara). Sof funksiya.
 * @returns {{template: object, migrated: boolean}}
 */
export function migrateTemplate(tpl) {
  const t = clone(tpl);
  let migrated = false;
  for (const c of t.correlations || []) {
    if (c.split !== undefined || !c.sharedInstrument) continue;
    c.split = 'unknown';
    migrated = true;
    for (const s of t.typeBSources || []) {
      if (c.inputs.includes(s.input) && s.instrument === c.sharedInstrument && !s.share &&
          s.distribution !== 'resol' && (s.correlated !== undefined ? s.correlated : true)) s.share = 'common';
    }
  }
  return { template: t, migrated };
}

/**
 * Shablon holati bo'yicha hisob (UI va evaluateTemplate uchun yagona yo'l).
 * split = 'unknown' korrelyatsiyalar uchun ikki hisob: r = 0 va r = corr.r (= 1); natija — katta u_c.
 * LOYIHA QARORI (egasi, 2026-11-17), me'yoriy talab emas. Asos: u_c² r ga chiziqli bog'liq, shuning uchun
 * r ∈ [0, 1] dagi maksimum chetki nuqtada; bitta asbob uchun r = 0 … +1 (EA-4/02 M:2022 D5, Eq. D.9);
 * yuqori chegara g'oyasi — EA-4/02 M:2022 D7, Eq. (D.10). Bir nechta noma'lum guruh — bir vaqtda 0 yoki 1.
 * Dvigatel (src/engine) o'zgarmaydi: natijaga faqat templateBound / templateWarnings qo'shiladi.
 * @returns {{result: object, state: object}}  state — tanlangan chegara uchun tayyorlangan holat (MC uchun)
 */
export function evaluateState(state) {
  if (!state || !state.template) return { result: evaluate(state), state };
  const st = upgradeState(state);
  const unknown = (st.template.correlations || []).filter(c => c.enabled && c.split === 'unknown');
  const finish = (p, result, bound) => {
    if (result.error) return { result, state: p };
    const w = (p.template && p.template.prepareWarnings) || [];
    if (w.length) result.templateWarnings = w;
    if (bound) result.templateBound = bound;
    return { result, state: p };
  };
  if (!unknown.length) {
    const p = prepareState(st);
    return finish(p, evaluate(p));
  }
  const over = r => Object.fromEntries(unknown.map(c => [c.id, r === 1 ? Number(c.r) : 0]));
  const p0 = prepareState(st, { rOverride: over(0) });
  const p1 = prepareState(st, { rOverride: over(1) });
  const r0 = evaluate(p0), r1 = evaluate(p1);
  if (r0.error) return { result: r0, state: p0 };
  if (r1.error) return { result: r1, state: p1 };
  const pick1 = r1.uc > r0.uc;
  const bound = { ids: unknown.map(c => c.id), r: pick1 ? unknown.map(c => Number(c.r)) : unknown.map(() => 0), chosen: pick1 ? 'r1' : 'r0', ucR0: r0.uc, ucR1: r1.uc };
  return pick1 ? finish(p1, r1, bound) : finish(p0, r0, bound);
}

/**
 * Shablon bo'yicha UI holatida to'ldirilmagan maydonlar (hisobdan oldin tekshiriladi:
 * bo'sh yarim kenglik dvigatelda 0 deb olinadi — U kamayib ketmasligi uchun hisob bloklanadi).
 * @returns {{type:string, symbol?:string, id?:string, name?:string}[]}
 */
export function missingInState(state) {
  if (!state || !state.template) return [];
  const out = [];
  const params = state.params || [];
  for (const p of params) {
    const obs = (state.measurements || {})[p] || [];
    if (!obs.some(v => isFinite(toNum(v)))) out.push({ type: (state.template.constants || []).includes(p) ? 'constant' : 'observation', symbol: p });
  }
  const aux = state.template.aux || {};
  const auxNames = Object.keys(aux);
  const corrs = upgradeState(state).template.correlations || [];
  for (const c of state.typeB || []) {
    if (!c.sourceId || pointRowIgnored(c, corrs)) continue;
    const hw = c.halfWidthExpr !== undefined ? c.halfWidthExpr : c.halfWidth;
    if (isBlank(hw)) out.push({ type: 'halfWidth', id: c.sourceId, name: c.name, symbol: c.param });
    if (KDIST(c.distribution) && c.kRequired && !(toNum(c.k) > 0)) out.push({ type: 'k', id: c.sourceId, name: c.name, symbol: c.param });
    if (typeof hw === 'string' && !isBlank(hw) && !isFinite(toNum(hw)) && auxNames.length) {
      try {
        variables(parse(hw, [...params, ...auxNames])).forEach(v => {
          if (auxNames.includes(v) && !isFinite(toNum(aux[v])) && !out.some(m => m.type === 'constant' && m.symbol === v)) out.push({ type: 'constant', symbol: v });
        });
      } catch (_) { /* dvigatel bad_halfwidth beradi */ }
    }
  }
  for (const c of state.template.correlations || []) if (c.enabled && !isFinite(toNum(c.r))) out.push({ type: 'correlation', id: c.id });
  return out;
}

/** Holat → dvigatel kirishi (uc-model/1). Shablon metama'lumoti va UI maydonlari olib tashlanadi. */
export function stateToSpec(state) {
  return specOf(prepareState(state));
}

/** Tayyorlangan holat → uc-model/1 (faqat dvigatel maydonlari) */
export function specOf(prepared) {
  const spec = toModel(prepared);
  spec.typeB = spec.typeB.map(c => {
    const out = {};
    for (const k of ['name', 'input', 'halfWidth', 'distribution', 'k', 'beta', 'd', 'nu', 'sensitivity', 'unit']) if (c[k] !== undefined) out[k] = c[k];
    return out;
  });
  return spec;
}

/**
 * Shablon bo'yicha hisob: shablon → holat → modelSpec → evaluate().
 * @returns {{result:object, spec:object, state:object, meta:object, missing:object[]} | {error, missing?}}
 */
export function evaluateTemplate(tpl, data = {}, opts = {}) {
  if (isRegression(tpl)) {
    // P08: shablon → uc-regression/1 → evaluate()
    const rb = buildRegressionSpec(tpl, data, opts);
    if (rb.error) return rb;
    if (rb.missing.length) return { error: 'template_incomplete', missing: rb.missing, spec: rb.spec, meta: rb.meta };
    return { result: evaluate(rb.spec), spec: rb.spec, meta: rb.meta, missing: rb.missing };
  }
  const b = buildState(tpl, data, opts);
  if (b.error) return b;
  const ev = evaluateState(b.state);
  const spec = specOf(ev.state);
  // Natija modelSpec orqali (tayyorlangan holat bilan bir xil; snapshot testlari spec yo'lini tekshiradi)
  const result = evaluate(spec);
  if (ev.result.templateWarnings) result.templateWarnings = ev.result.templateWarnings;
  if (ev.result.templateBound) result.templateBound = ev.result.templateBound;
  return { result, spec, state: b.state, prepared: ev.state, meta: b.meta, missing: b.missing };
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
