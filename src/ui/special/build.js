/* ═══════════════════════════════════════════════════════════════
   SPECIAL/BUILD.JS — P10: "Maxsus rejimlar" oynasi holati → modelSpec
   (uc-sampling/1, uc-qualitative/1, uc-micro/1, uc-medical/1).
   Sof modul (DOM yo'q) — Node'da test qilinadi (tests/ui/special.test.js).
   Jadval matni Excel'dan qo'yiladi: tab / nuqta-vergul / bo'sh joy; o'nlik vergul qabul qilinadi.
   Bo'sh maydon 0 deb olinmaydi — spetsifikatsiyaga kirmaydi va dvigatel aniq xato qaytaradi.
═══════════════════════════════════════════════════════════════ */
import { parseNumber, parseGrid } from '../regression/parse.js';
import { numericRows } from '../topdown/build.js';

export const MODES = ['sampling', 'qualitative', 'micro', 'medical'];
/** Rejim ↔ shablon evaluationMode */
export const MODE_OF = { SAMPLING: 'sampling', QUALITATIVE: 'qualitative', MICROBIOLOGY: 'micro', MEDICAL: 'medical' };

export function defaults() {
  return {
    mode: 'sampling',
    // namuna olish
    saTargets: '', saMethod: 'classical', saLog: false, saUnit: '', saY: '',
    // sifatli test
    qlTp: '', qlFn: '', qlFp: '', qlTn: '', qlPrev: '',
    // mikrobiologiya
    miValue: '', miSum: '', miUnit: 'CFU/g', miPairs: '', miTechS: '', miMatrix: '', miK: '',
    // tibbiy laboratoriya
    meUnit: '', meLevels: '', meCal: '', meBias: '', meY: '', meK: '',
    template: null,
  };
}

/**
 * Namuna olish jadvali: har bir qator — ob'ekt; oxirgi 4 katak S1A1, S1A2, S2A1, S2A2.
 * 5 ustun bo'lsa birinchisi — ob'ekt belgisi. Sarlavha (son bo'lmagan) qatorlar tashlanadi.
 * @returns {{targets:{id:string, values:(number|null)[]}[], skipped:number}}
 */
export function samplingRows(text) {
  const targets = [];
  let skipped = 0;
  for (const cells of parseGrid(text)) {
    const c = cells.length > 4 ? cells.slice(-4) : cells;
    const v = c.map(parseNumber);
    if (v.some(n => Number.isNaN(n))) { skipped++; continue; }
    if (!v.some(n => n !== null)) continue;
    targets.push({ id: cells.length > 4 ? String(cells[0]) : String(targets.length + 1), values: [0, 1, 2, 3].map(i => (v[i] === undefined ? null : v[i])) });
  }
  return { targets, skipped };
}

/** IQC darajalari: har bir qator "o'rtacha  CV %  [n]". */
export function levelRows(text) {
  const g = numericRows(text);
  return { levels: g.rows.map((r, i) => ({ id: `L${i + 1}`, mean: r[0], cv: r[1], ...(r[2] !== undefined && r[2] !== null ? { n: r[2] } : {}) })), skipped: g.skipped, short: g.rows.some(r => r.length < 2 || r[0] === null || r[1] === null) };
}

/** @returns {{spec:object, bad:string[]}}  bad — o'qib bo'lmagan maydonlar (i18n: 'sp_f_<nom>') */
export function buildSpec(st) {
  const bad = [];
  const one = (v, name) => { const n = parseNumber(v); if (Number.isNaN(n)) bad.push(name); return n === null || Number.isNaN(n) ? undefined : n; };
  const k = name => { const v = one(st[name], 'k'); return v === undefined ? {} : { settings: { k: v } }; };
  let spec;
  if (st.mode === 'sampling') {
    const y = one(st.saY, 'y');
    spec = { format: 'uc-sampling/1', method: st.saMethod || 'classical', logTransform: !!st.saLog, unit: st.saUnit || '',
      targets: samplingRows(st.saTargets).targets, ...(y !== undefined ? { measurement: { value: y } } : {}) };
  } else if (st.mode === 'qualitative') {
    const prev = one(st.qlPrev, 'prevalence');
    spec = { format: 'uc-qualitative/1', table: { tp: one(st.qlTp, 'tp'), fn: one(st.qlFn, 'fn'), fp: one(st.qlFp, 'fp'), tn: one(st.qlTn, 'tn') },
      ...(prev !== undefined ? { prevalence: prev / 100 } : {}) };
  } else if (st.mode === 'micro') {
    const g = numericRows(st.miPairs);
    if (g.rows.some(r => r.length < 2 || r[0] === null || r[1] === null)) bad.push('pairs');
    const s = one(st.miTechS, 'techS'), m = one(st.miMatrix, 'matrix');
    spec = { format: 'uc-micro/1', unit: st.miUnit || '', result: { value: one(st.miValue, 'value'), sumCounts: one(st.miSum, 'sumCounts') },
      ...(g.rows.length ? { technical: { pairs: g.rows.map(r => [r[0], r[1]]) } } : s !== undefined ? { technical: { s } } : {}),
      ...(m !== undefined ? { matrix: { u: m } } : {}), ...k('miK') };
  } else {
    const lv = levelRows(st.meLevels);
    if (lv.short) bad.push('levels');
    const cal = one(st.meCal, 'uCal'), bias = one(st.meBias, 'uBias'), y = one(st.meY, 'y');
    spec = { format: 'uc-medical/1', unit: st.meUnit || '', levels: lv.levels,
      ...(cal !== undefined ? { uCal: { value: cal, relative: true } } : {}), ...(bias !== undefined ? { uBias: { value: bias, relative: true } } : {}),
      ...(y !== undefined ? { measurement: { value: y } } : {}), ...k('meK') };
  }
  return { spec, bad: [...new Set(bad)] };
}
