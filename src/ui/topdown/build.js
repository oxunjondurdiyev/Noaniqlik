/* ═══════════════════════════════════════════════════════════════
   TOPDOWN/BUILD.JS — P09: usta (wizard) holati → modelSpec ('uc-topdown/1').
   Sof modul (DOM yo'q) — Node'da test qilinadi (tests/ui/topdown.test.js).
   Jadval matni (Excel'dan qo'yilgan): tab / nuqta-vergul / bo'sh joy bilan ajratilgan ustunlar,
   o'nlik vergul qabul qilinadi (src/ui/regression/parse.js). Sarlavha (son bo'lmagan) qatorlar tashlanadi.
   Nisbiy qiymatlar UI da har doim foizda (relativeUnit: '%').
═══════════════════════════════════════════════════════════════ */
import { parseNumber, parseGrid, parseList } from '../regression/parse.js';

export const BASES = ['within', 'sR', 'level'];
export const RW_SOURCES = ['control_series', 'duplicates', 'control_limits', 'stated'];
export const BIAS_SOURCES = ['none', 'crm', 'pt', 'recovery', 'recovery_quam'];
export const REFERENCE_CHOICES = ['same', 'other'];
/** Qo'shimcha hissa va "nazorat namunasi qamraydi" ro'yxatida ko'rsatiladigan toifalar (dvigatel: TOPDOWN_CATEGORIES). */
export const UI_CATEGORIES = ['repeatability', 'balance', 'volumetric', 'calibration', 'reference_material', 'matrix', 'homogeneity',
  'sampling', 'sample_preparation', 'temperature', 'time', 'speed', 'operator', 'instrument', 'drift', 'other'];
export const COVER_CATEGORIES = UI_CATEGORIES.filter(c => !['repeatability', 'reference_material', 'other'].includes(c));

export function defaults() {
  return {
    step: 1,
    basis: 'within', rwSources: ['control_series'], bias: 'none',
    scale: 'relative', unit: '', empirical: false, refMethod: '',   // refMethod: '' (javob yo'q) | 'same' | 'other'
    y: '', k: '',
    qcValues: '', dupPairs: '', dupMethod: 'per_pair', limit: '', sigmas: '2', statedS: '', statedN: '', statedNu: '',
    covers: [],
    crmRows: '', ptRows: '', ptRobust: false, recValues: '', recURef: '',
    quamValues: '', quamMean: '', quamS: '', quamN: '', quamCorrection: 'not_applied',
    sR: '', sr: '', labS: '', labN: '', labAdjust: false,
    s0: '', s1: '',
    additional: [],     // [{name, category, u}]
    template: null,
    ptLink: null,       // P12: PT seriyasi nusxasi (linter L3)
  };
}

/** Matn → sonli qatorlar (har bir qator — sonlar massivi). Son bo'lmagan katakli qator (sarlavha) tashlanadi. */
export function numericRows(text) {
  const rows = [];
  let skipped = 0;
  for (const cells of parseGrid(text)) {
    const nums = cells.map(parseNumber);
    if (nums.some(n => Number.isNaN(n))) { skipped++; continue; }
    const f = nums.filter(n => n !== null);
    if (f.length) rows.push(nums);
  }
  return { rows, skipped };
}

/** Bir ustunli qator: har qanday ajratuvchi (yangi satr, tab, nuqta-vergul, bo'sh joy). */
export function numericList(text) {
  const v = parseList(String(text || '').replace(/\t/g, ' '));
  return { values: v.filter(n => n !== null && !Number.isNaN(n)), bad: v.filter(n => Number.isNaN(n)).length };
}

const q = (st, value, extra) => (st.scale === 'relative' ? { ...extra, ...value, relative: true } : { ...extra, ...value, unit: st.unit });

/**
 * Usta holati → { spec, bad[] }. bad — o'qib bo'lmagan maydonlar (i18n kalitlari: 'td_f_<nom>').
 * Bo'sh maydon 0 deb olinmaydi: bo'sh qiymat spetsifikatsiyaga kirmaydi va dvigatel aniq xato qaytaradi.
 */
export function buildSpec(st) {
  const bad = [];
  const one = (v, name) => { const n = parseNumber(v); if (Number.isNaN(n)) bad.push(name); return n === null || Number.isNaN(n) ? undefined : n; };
  const list = (text, name) => { const r = numericList(text); if (r.bad) bad.push(name); return r.values; };
  const dataUnit = st.unit || '';
  const scale = st.scale === 'relative' ? { relative: true } : { unit: st.unit };
  const spec = { format: 'uc-topdown/1', scale, relativeUnit: '%', isEmpiricalMeasurand: !!st.empirical };

  const y = one(st.y, 'y');
  if (y !== undefined) spec.measurement = { value: y, unit: dataUnit };
  const k = one(st.k, 'k');
  if (k !== undefined) spec.settings = { k };
  // P12: PT seriyasi nusxasi (Laboratoriya → "→ Top-down") — linter L3 uchun; hisobga ta'sir qilmaydi
  if (st.ptLink && typeof st.ptLink === 'object') spec.settings = { ...(spec.settings || {}), ptLink: st.ptLink };

  if (st.basis === 'sR') {
    spec.approach = 'REPRODUCIBILITY';
    spec.reproducibility = q(st, { sR: one(st.sR, 'sR'), sr: one(st.sr, 'sr') }, { covers: [...(st.covers || [])] });
    const ls = one(st.labS, 'labS'), ln = one(st.labN, 'labN');
    if (ls !== undefined || ln !== undefined) spec.labRepeatability = q(st, { s: ls, n: ln, adjust: !!st.labAdjust });
  } else if (st.basis === 'level') {
    spec.approach = 'LEVEL_DEPENDENT';
    spec.scale = { unit: st.unit };          // natija har doim mutlaq (QUAM E.5.2.1)
    spec.levelModel = { s0: { value: one(st.s0, 's0'), unit: st.unit }, s1: { value: one(st.s1, 's1'), relative: true } };
  } else {
    spec.approach = st.bias === 'recovery_quam' ? 'QUAM_RECOVERY' : 'NORDTEST';
    const comps = [];
    const src = st.rwSources || [];
    if (src.includes('control_series')) comps.push({ type: 'control_series', id: 'control_series', values: list(st.qcValues, 'qcValues'), unit: dataUnit });
    if (src.includes('duplicates')) {
      const g = numericRows(st.dupPairs);
      if (g.rows.some(r => r.length < 2 || r[0] === null || r[1] === null)) bad.push('dupPairs');
      comps.push({ type: 'duplicates', id: 'duplicates', pairs: g.rows.map(r => [r[0], r[1]]), unit: dataUnit, relativeMethod: st.dupMethod || 'per_pair' });
    }
    if (src.includes('control_limits')) comps.push(q(st, { limit: one(st.limit, 'limit'), sigmas: one(st.sigmas, 'sigmas') }, { type: 'control_limits', id: 'control_limits' }));
    if (src.includes('stated')) comps.push(q(st, { s: one(st.statedS, 'statedS'), n: one(st.statedN, 'statedN'), nu: one(st.statedNu, 'statedNu') }, { type: 'stated', id: 'stated' }));
    spec.rw = { components: comps, covers: [...(st.covers || [])] };

    if (st.bias === 'crm') {
      const g = numericRows(st.crmRows);
      const items = g.rows.map(r => (r.length >= 5
        ? { certified: r[0], U: r[1], mean: r[2], sBias: r[3], n: r[4] }           // sertifikat, U (k = 2), o'rtacha, s_bias, n
        : { bias: r[0], sBias: r[1], n: r[2], uRef: r[3] }));                      // bias, s_bias, n, u(Cref)
      if (g.rows.some(r => r.length < 4)) bad.push('crmRows');
      spec.bias = q(st, { items }, { type: 'crm' });
    } else if (st.bias === 'pt') {
      const g = numericRows(st.ptRows);
      const rounds = g.rows.map(r => (r.length >= 4 ? { assigned: r[0], result: r[1], sR: r[2], nLab: r[3] }
        : r.length === 3 ? { bias: r[0], sR: r[1], nLab: r[2] } : { bias: r[0], uRef: r[1] }));
      if (g.rows.some(r => r.length < 2)) bad.push('ptRows');
      spec.bias = q(st, { rounds, ...(st.ptRobust ? { robust: true } : {}) }, { type: 'pt' });
    } else if (st.bias === 'recovery') {
      spec.bias = { type: 'recovery', relative: true, recoveries: list(st.recValues, 'recValues'), uRef: one(st.recURef, 'recURef') };
    } else if (st.bias === 'recovery_quam') {
      const vals = list(st.quamValues, 'quamValues');
      spec.recovery = vals.length
        ? { values: vals, correction: st.quamCorrection }
        : { mean: one(st.quamMean, 'quamMean'), s: one(st.quamS, 'quamS'), n: one(st.quamN, 'quamN'), correction: st.quamCorrection };
    }
    // Empirik kattalik: "tayanch qiymat qaysi usul bilan olingan" savoliga javob (bo'sh — javob yo'q: dvigatel hissani qo'shadi va X12 beradi)
    if (st.empirical && REFERENCE_CHOICES.includes(st.refMethod)) {
      if (spec.bias) spec.bias.referenceMethod = st.refMethod;
      if (spec.recovery) spec.recovery.referenceMethod = st.refMethod;
    }
  }

  const add = (st.additional || []).filter(a => a && (String(a.u ?? '').trim() !== '' || String(a.name ?? '').trim() !== ''));
  if (add.length) {
    spec.additional = add.map((a, i) => {
      const u = parseNumber(a.u);
      if (u === null || Number.isNaN(u)) bad.push('additional');
      const sc = spec.scale.relative ? { relative: true } : { unit: spec.scale.unit };
      return { id: `add_${i + 1}`, name: String(a.name || ''), category: UI_CATEGORIES.includes(a.category) ? a.category : 'other', u: Number.isNaN(u) || u === null ? undefined : u, ...sc };
    });
  }
  return { spec, bad: [...new Set(bad)] };
}
