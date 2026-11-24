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
    // P18 (ISO/TS 20914:2019): aniqlik turi, shkala, lotlar / tizimlar / davrlar, bias (CRM), ruxsat etilgan noaniqlik, yaxlitlash
    mePrecision: 'long_term', meScale: 'linear', meSpread: 'cv', meUKind: 'rel', meGroupKind: 'none', meGroups: '', mePool: 'none',
    meBRef: '', meBURef: '', meBKRef: '', meBLab: '', meBSd: '', meBN: '', meBMode: 'absolute', meBApply: false,
    meAllowKind: 'U_rel', meAllow: '', meRound: 'half_up',
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

/** Katak: son, bo'sh / "-" / "—" (yo'q → null) yoki o'qib bo'lmaydigan (NaN) */
const cell = c => (c === undefined || /^[-–—]?$/.test(String(c).trim()) ? null : parseNumber(c));
const has = v => v !== undefined && v !== null;

/**
 * IQC darajalari: har bir qator "o'rtacha  CV % (yoki SD)  [n]  [quyi chegara]  [yuqori chegara]"; yo'q katak — "-".
 * Qo'llanish oralig'i [quyi; yuqori): ISO/TS 20914:2019 A.2.3, A.3.2 ("IQC monitors interval").
 * @param {{spread?:'cv'|'sd'}} [o]
 */
export function levelRows(text, o = {}) {
  const key = o.spread === 'sd' ? 'sd' : 'cv';
  const levels = [];
  let skipped = 0, short = false;
  for (const cells of parseGrid(text)) {
    const r = cells.map(cell);
    if (r.some(n => Number.isNaN(n))) { skipped++; continue; }
    if (!cells.some(c => String(c).trim() !== '')) continue;      // "-" qatori qoladi: darajaning qiymatlari lotlar / tizimlar jadvalidan
    const iv = { ...(has(r[3]) ? { low: r[3] } : {}), ...(has(r[4]) ? { high: r[4] } : {}) };
    if (!has(r[0]) || !has(r[1])) short = true;
    levels.push({ id: `L${levels.length + 1}`, ...(has(r[0]) ? { mean: r[0] } : {}), ...(has(r[1]) ? { [key]: r[1] } : {}), ...(has(r[2]) ? { n: r[2] } : {}),
      ...(Object.keys(iv).length ? { interval: iv } : {}) });
  }
  return { levels, skipped, short };
}

export const GROUP_KINDS = ['none', 'lots', 'systems', 'periods'];
/**
 * Lotlar / tizimlar: "daraja  o'rtacha  SD  [n]"; davrlar: "daraja  u_Rw". Daraja — tartib raqami yoki "L2".
 * @returns {{byLevel:Object<number, object[]>, n:number, skipped:number}}  byLevel kaliti — darajaning 0 dan boshlangan tartibi
 */
export function groupRows(text, kind) {
  const byLevel = {};
  let n = 0, skipped = 0;
  for (const cells of parseGrid(text)) {
    const m = /^L?(\d+)$/i.exec(String(cells[0]).trim());
    const r = cells.slice(1).map(cell);
    const ok = m && Number(m[1]) >= 1 && !r.some(v => Number.isNaN(v)) && (kind === 'periods' ? has(r[0]) : has(r[0]) && has(r[1]));
    if (!ok) { skipped++; continue; }
    const list = byLevel[Number(m[1]) - 1] = byLevel[Number(m[1]) - 1] || [];
    list.push(kind === 'periods' ? { id: String(list.length + 1), uRw: r[0] } : { id: String(list.length + 1), mean: r[0], sd: r[1], ...(has(r[2]) ? { n: r[2] } : {}) });
    n++;
  }
  return { byLevel, n, skipped };
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
    const log = st.meScale === 'log10';
    const lv = levelRows(st.meLevels, { spread: st.meSpread });
    const kind = GROUP_KINDS.includes(st.meGroupKind) && st.meGroupKind !== 'none' ? st.meGroupKind : null;
    const gr = kind ? groupRows(st.meGroups, kind) : { byLevel: {}, n: 0, skipped: 0 };
    if (gr.skipped || Object.keys(gr.byLevel).some(i => Number(i) >= lv.levels.length)) bad.push('groups');
    const levels = lv.levels.map((L, i) => {
      const g = gr.byLevel[i];
      if (!g) { if (!has(L.mean) || !(has(L.cv) || has(L.sd))) bad.push('levels'); return L; }
      if (kind === 'periods') { if (!has(L.mean)) bad.push('levels'); return { id: L.id, mean: L.mean, ...(has(L.n) ? { n: L.n } : {}), ...(L.interval ? { interval: L.interval } : {}), periods: g }; }
      return { id: L.id, ...(L.interval ? { interval: L.interval } : {}), [kind]: g };
    });
    // log₁₀ shkalada nisbiy (%) qiymat yo'q — u_cal / u_bias mutlaq birlikda (ISO/TS 20914:2019 A.10)
    const q = v => (st.meUKind === 'abs' || log ? { value: v, unit: st.meUnit || '' } : { value: v, relative: true });
    const cal = one(st.meCal, 'uCal'), bias = one(st.meBias, 'uBias'), y = one(st.meY, 'y'), kk = one(st.meK, 'k'), allow = one(st.meAllow, 'allowable');
    const crm = ['meBRef', 'meBURef', 'meBLab', 'meBSd', 'meBN'].some(f => String(st[f] ?? '').trim() !== '');
    const b = crm ? { xRef: one(st.meBRef, 'xRef'), URef: one(st.meBURef, 'URef'), kRef: one(st.meBKRef, 'kRef'), xLab: one(st.meBLab, 'xLab'), sd: one(st.meBSd, 'biasSd'), n: one(st.meBN, 'biasN') } : null;
    if (b) Object.keys(b).forEach(f => { if (b[f] === undefined) delete b[f]; });
    const settings = { ...(kk !== undefined ? { k: kk } : {}), ...(st.meRound === 'up' ? { rounding: 'up' } : {}), ...(st.mePool === 'df' ? { poolWeighting: 'df' } : {}) };
    spec = { format: 'uc-medical/1', unit: st.meUnit || '', ...(log ? { scale: 'log10' } : {}), ...(st.mePrecision === 'repeatability' ? { precisionType: 'repeatability' } : {}), levels,
      ...(cal !== undefined ? { uCal: q(cal) } : {}), ...(bias !== undefined ? { uBias: q(bias) } : {}),
      ...(b ? { bias: { ...b, mode: st.meBMode === 'proportional' ? 'proportional' : 'absolute', apply: !!st.meBApply } } : {}),
      ...(allow !== undefined ? { allowable: { [['u_rel', 'U_rel', 'u_abs', 'U_abs'].includes(st.meAllowKind) ? st.meAllowKind : 'U_rel']: allow } } : {}),
      ...(y !== undefined ? { measurement: { value: y } } : {}), ...(Object.keys(settings).length ? { settings } : {}) };
  }
  return { spec, bad: [...new Set(bad)] };
}
