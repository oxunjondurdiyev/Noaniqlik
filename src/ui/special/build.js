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
    // P18 (ISO/TS 20914:2019): aniqlik turi, shkala, tarqoqlik ko'rinishi, guruhlar (lot / tizim / davr), CRM dan bias, ruxsat etilgan noaniqlik
    mePrecision: 'long_term', meScale: 'linear', meDisp: 'cv', meCalKind: 'rel',
    meGroupKind: 'lots', meGroups: '', mePool: 'none',
    meCrm: '', meCrmU: '', meCrmK: '', meLabMean: '', meLabSd: '', meLabN: '', meBiasApply: false, meBiasMode: 'absolute',
    meAllow: '', meAllowKind: 'U_rel',
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

const DASH = /^[-–—]$/;
/** Sonli qatorlar; "-" / "—" katagi — bo'sh (qo'lda terilganda ustunni tashlab o'tish uchun). */
function gridRows(text) {
  const rows = [];
  let skipped = 0;
  for (const cells of parseGrid(text)) {
    const nums = cells.map(c => (DASH.test(String(c).trim()) ? null : parseNumber(c)));
    if (nums.some(n => Number.isNaN(n))) { skipped++; continue; }
    if (nums.some(n => n !== null)) rows.push(nums);
  }
  return { rows, skipped };
}
const has = v => v !== undefined && v !== null;

/**
 * IQC darajalari: har bir qator "o'rtacha  CV % | SD  [n]  [oraliq quyi]  [oraliq yuqori]".
 * Oraliq — daraja qo'llanish oralig'i [quyi; yuqori) (ISO/TS 20914:2019 A.2.3, A.3.2); bo'sh katak yoki "-" — chegarasiz.
 * @param {string} text  @param {'cv'|'sd'} [disp='cv']
 */
export function levelRows(text, disp = 'cv') {
  const g = gridRows(text);
  const levels = g.rows.map((r, i) => {
    const iv = { ...(has(r[3]) ? { low: r[3] } : {}), ...(has(r[4]) ? { high: r[4] } : {}) };
    return { id: `L${i + 1}`, ...(has(r[0]) ? { mean: r[0] } : {}), ...(has(r[1]) ? { [disp === 'sd' ? 'sd' : 'cv']: r[1] } : {}), ...(has(r[2]) ? { n: r[2] } : {}),
      ...(Object.keys(iv).length ? { interval: iv } : {}) };
  });
  return { levels, skipped: g.skipped, short: g.rows.some(r => !has(r[0]) || !has(r[1])) };
}

/**
 * Guruhlar (lotlar / tizimlar / davrlar): har bir qator daraja raqamidan boshlanadi.
 *   lots, systems: "daraja  o'rtacha  SD  [n]";  periods: "daraja  u_Rw".
 * @returns {{byLevel:Map<number, object[]>, skipped:number, short:boolean}}
 */
export function groupRows(text, kind) {
  const g = gridRows(text);
  const byLevel = new Map();
  let short = false;
  for (const r of g.rows) {
    const lv = r[0];
    if (!Number.isInteger(lv) || lv < 1) { short = true; continue; }
    const item = kind === 'periods' ? { uRw: r[1] } : { mean: r[1], sd: r[2], ...(has(r[3]) ? { n: r[3] } : {}) };
    if (kind === 'periods' ? !has(r[1]) : !has(r[1]) || !has(r[2])) short = true;
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv).push({ id: String(byLevel.get(lv).length + 1), ...item });
  }
  return { byLevel, skipped: g.skipped, short, n: g.rows.length };
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
    const kind = ['lots', 'systems', 'periods'].includes(st.meGroupKind) ? st.meGroupKind : 'lots';
    const lv = levelRows(st.meLevels, st.meDisp);
    const gr = groupRows(st.meGroups, kind);
    if (gr.short) bad.push('groups');
    // Guruhli daraja: lot / tizimda o'rtacha va SD guruhlardan; davrda o'rtacha — darajalar jadvalidan. Darajaning o'z SD / CV si ishlatilmaydi.
    const levels = lv.levels.map(L => ({ ...L }));
    for (const [no, items] of gr.byLevel) {
      while (levels.length < no) levels.push({ id: `L${levels.length + 1}` });
      const { id, mean, n, interval } = levels[no - 1];
      levels[no - 1] = { id, ...(kind === 'periods' && has(mean) ? { mean } : {}), ...(kind === 'periods' && has(n) ? { n } : {}), ...(interval ? { interval } : {}), [kind]: items };
    }
    if (levels.some(L => !L.lots && !L.systems && !L.periods && (!has(L.mean) || (!has(L.cv) && !has(L.sd))))) bad.push('levels');
    const abs = st.meCalKind === 'abs';
    const q = v => (abs ? { value: v, unit: st.meUnit || '' } : { value: v, relative: true });
    const cal = one(st.meCal, 'uCal'), bias = one(st.meBias, 'uBias'), y = one(st.meY, 'y'), kv = one(st.meK, 'k');
    // u_bias CRM dan (C.5): biror maydon to'ldirilgan bo'lsa — bo'lim ishlatiladi; bo'sh maydon 0 deb olinmaydi (dvigatel xato beradi)
    const crm = { xRef: one(st.meCrm, 'crm'), URef: one(st.meCrmU, 'crmU'), kRef: one(st.meCrmK, 'crmK'), xLab: one(st.meLabMean, 'labMean'), sd: one(st.meLabSd, 'labSd'), n: one(st.meLabN, 'labN') };
    const useCrm = Object.values(crm).some(has);
    Object.keys(crm).forEach(key => { if (!has(crm[key])) delete crm[key]; });
    const allow = one(st.meAllow, 'allowable');
    const settings = { ...(kv !== undefined ? { k: kv } : {}), ...(st.mePool === 'df' ? { poolWeighting: 'df' } : {}) };
    spec = { format: 'uc-medical/1', unit: st.meUnit || '', levels,
      ...(st.meScale === 'log10' ? { scale: 'log10' } : {}), ...(st.mePrecision === 'repeatability' ? { precisionType: 'repeatability' } : {}),
      ...(cal !== undefined ? { uCal: q(cal) } : {}), ...(bias !== undefined ? { uBias: q(bias) } : {}),
      ...(useCrm ? { bias: { ...crm, apply: !!st.meBiasApply, mode: st.meBiasMode === 'proportional' ? 'proportional' : 'absolute' } } : {}),
      ...(allow !== undefined ? { allowable: { [['u_rel', 'U_rel', 'u_abs', 'U_abs'].includes(st.meAllowKind) ? st.meAllowKind : 'U_rel']: allow } } : {}),
      ...(y !== undefined ? { measurement: { value: y } } : {}), ...(Object.keys(settings).length ? { settings } : {}) };
  }
  return { spec, bad: [...new Set(bad)] };
}
