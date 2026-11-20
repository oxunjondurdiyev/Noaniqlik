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
    // P17 (ISO 19036:2019): usul, tasdiqlash, MPN, LOQ, guruhlar, 1/5 qoidasi, natija shakli, yaxlitlash ('' — laboratoriya sozlamasi)
    miMethod: 'count', miRepro: false, miLoq: '', miNp: '', miNc: '', miMpnU: '', miMpnMu: '', miMpnAliquots: '',
    miTechKind: 'pairs', miGroups: '', miTechSource: 'intralab', miMatrixKind: 'stated', miMatrixGroups: '',
    miIgnore: false, miForm: 'a', miRounding: '',
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

/** Guruhlar jadvali: har bir qator — bitta laboratoriya namunasining portsiyalari (≥ 1 son). */
export function groupRows(text) {
  const g = numericRows(text);
  return { groups: g.rows.map(r => r.filter(n => n !== null)), skipped: g.skipped };
}

/** Mikrobiologiya (uc-micro/1; ISO 19036:2019). Bo'sh maydon spetsifikatsiyaga kirmaydi — dvigatel aniq xato qaytaradi. */
function microSpec(st, one, bad) {
  const method = ['count', 'count_confirm', 'mpn', 'instrumental'].includes(st.miMethod) ? st.miMethod : 'count';
  const repro = !!st.miRepro;
  const put = (o, key, v) => { if (v !== undefined) o[key] = v; return o; };
  const result = put(put(put({}, 'value', one(st.miValue, 'value')), 'sumCounts', method === 'count' || method === 'count_confirm' ? one(st.miSum, 'sumCounts') : undefined), 'loq', one(st.miLoq, 'loq'));
  if (method === 'count_confirm' && !repro) {
    const c = put(put({}, 'np', one(st.miNp, 'np')), 'nc', one(st.miNc, 'nc'));
    if (Object.keys(c).length) result.confirm = c;
  }
  if (method === 'mpn' && !repro) {
    const u = one(st.miMpnU, 'mpnU'), mu = one(st.miMpnMu, 'mpnMu');
    const al = numericRows(st.miMpnAliquots);
    if (al.rows.some(r => r.length < 2 || r[0] === null || r[1] === null)) bad.push('aliquots');
    if (u !== undefined) result.mpn = { u };
    else if (al.rows.length) result.mpn = put({ aliquots: al.rows.map(r => ({ m: r[0], x: r[1] })) }, 'mu', mu);
  }
  // u_tech: tanlangan jadval to'ldirilgan bo'lsa — undan; aks holda tayyor qiymat (avvalgi holatlar bilan mos)
  let technical;
  const s = one(st.miTechS, 'techS');
  const pairs = numericRows(st.miPairs), groups = groupRows(st.miGroups);
  if (!repro && st.miTechKind === 'groups' && groups.groups.length) technical = { groups: groups.groups };
  else if (!repro && st.miTechKind !== 'stated' && st.miTechKind !== 'groups' && pairs.rows.length) {
    if (pairs.rows.some(r => r.length < 2 || r[0] === null || r[1] === null)) bad.push('pairs');
    technical = { pairs: pairs.rows.map(r => [r[0], r[1]]) };
  } else if (s !== undefined) technical = { s, source: ['intralab', 'interlab', 'pt'].includes(st.miTechSource) ? st.miTechSource : 'intralab' };
  let matrix;
  if (!repro) {
    const m = one(st.miMatrix, 'matrix'), mg = groupRows(st.miMatrixGroups);
    if (st.miMatrixKind === 'preset') matrix = { preset: 'homogeneous_liquid' };
    else if (st.miMatrixKind === 'groups' && mg.groups.length) matrix = { groups: mg.groups };
    else if (m !== undefined) matrix = { u: m };
  }
  const k = one(st.miK, 'k');
  const settings = { ignoreNegligible: !!st.miIgnore, reportForm: ['a', 'b', 'c'].includes(st.miForm) ? st.miForm : 'a',
    ...(st.miRounding === 'up' || st.miRounding === 'half_up' ? { rounding: st.miRounding } : {}), ...(k !== undefined ? { k } : {}) };
  return { format: 'uc-micro/1', unit: st.miUnit || '', method, ...(repro ? { approach: 'REPRO_ONLY' } : {}), result,
    ...(technical ? { technical } : {}), ...(matrix ? { matrix } : {}), settings };
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
    spec = microSpec(st, one, bad);
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
