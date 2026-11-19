/* ═══════════════════════════════════════════════════════════════
   LAB/QUALITY-MODEL.JS — P12: "Malaka sinovlari" va "Validatsiya" bo'limlari uchun sof yordamchilar (DOM yo'q — Node'da test).
   Shakl matni ↔ seriya / test spetsifikatsiyasi; hisob — src/engine/pt, src/engine/validation (bu yerda faqat tayyorlash).
   Bo'sh maydon 0 deb olinmaydi: bo'sh qiymat spetsifikatsiyaga kirmaydi (dvigatel aniq xato yoki null + sabab beradi).
═══════════════════════════════════════════════════════════════ */
import { evaluatePT, evaluateValidation, PT_FORMAT, VALIDATION_FORMAT, VALIDATION_TESTS } from '../../engine/index.js';
import { parseGrid, parseNumber } from '../../io/table-text.js';

export const ROUND_NUM_KEYS = ['x', 'xpt', 'sigmaPt', 'ux', 'uxpt', 'Ux', 'Uxpt'];
export const TEST_FORM_KEYS = ['type', 'id', 'label', 'alpha', 'side', 'tail', 'equalVariance', 'values', 'groups', 'a', 'b', 'points', 'method', 'replicates', 'blankCorrection', 'blankReplicates', 'kQ', 'correction'];

const cell = v => (v === undefined || v === null ? '' : String(v));

/** Bitta son maydoni: '' → '' (bo'sh); son bo'lmasa — NaN (xato sifatida ko'rsatiladi). */
export function numField(v) {
  const n = parseNumber(v);
  return n === null ? '' : n;
}

/** Yangi raund shakli → raund yozuvi { round, bad[] }. */
export function roundOf(form) {
  const f = form || {};
  const round = { id: cell(f.id).trim(), date: cell(f.date).trim(), scheme: cell(f.scheme).trim(), primary: cell(f.primary).trim(), note: '' };
  const bad = [];
  for (const k of ROUND_NUM_KEYS) {
    const n = numField(f[k]);
    if (Number.isNaN(n)) bad.push(k);
    round[k] = Number.isNaN(n) ? '' : n;
  }
  if (round.x === '') bad.push('x');
  if (round.xpt === '') bad.push('xpt');
  return { round, bad: [...new Set(bad)] };
}

/** PT seriyasi → dvigatel spetsifikatsiyasi ('uc-pt/1'). Raund birligi — seriya birligi. */
export function ptSpecOf(series) {
  const s = series || {};
  return {
    format: PT_FORMAT, quantity: s.quantity || '', method: s.method || '', matrix: s.matrix || '', savedBy: s.savedBy,
    rounds: (s.rounds || []).map((r, i) => ({ ...r, id: r.id || `R${i + 1}`, unit: s.unit || '', primary: r.primary || undefined })),
  };
}
export function analysePT(series) {
  const s = series || {};
  return (s.rounds || []).length ? evaluatePT(ptSpecOf(s)) : null;
}

/** Matn → sonlar ro'yxati (bo'sh joy, nuqta-vergul, tab, yangi satr). */
export function listOf(text) {
  const cells = String(text || '').trim().split(/[\s;]+/).filter(Boolean);
  const v = cells.map(parseNumber);
  return { values: v.filter(n => n !== null && !Number.isNaN(n)), bad: v.filter(n => Number.isNaN(n)).length };
}
/** Matn → guruhlar (har bir qator — bitta guruh). */
export function groupsOf(text) {
  let bad = 0;
  const groups = String(text || '').split(/\r?\n/).map(line => { const r = listOf(line); bad += r.bad; return r.values; }).filter(g => g.length);
  return { groups, bad };
}
/** Matn → nuqtalar (x; y har qatorda). */
export function pointsOf(text) {
  let bad = 0;
  const points = [];
  for (const cells of parseGrid(String(text || '').replace(/;/g, '\t'))) {
    const nums = cells.map(parseNumber).filter(n => n !== null);
    if (!nums.length) continue;
    if (nums.length < 2 || nums.some(n => Number.isNaN(n))) { bad++; continue; }
    points.push({ x: nums[0], y: nums[1] });
  }
  return { points, bad };
}

/** Test shakli (matn maydonlari) → test spetsifikatsiyasi { test, bad[] }. */
export function testOf(form) {
  const f = form || {};
  const type = VALIDATION_TESTS.includes(f.type) ? f.type : '';
  const bad = [];
  if (!type) return { test: null, bad: ['type'] };
  const t = { id: cell(f.id).trim(), type };
  if (cell(f.label).trim()) t.label = cell(f.label).trim();
  const a = numField(f.alpha);
  if (a !== '' && !Number.isNaN(a)) t.alpha = a; else if (Number.isNaN(a)) bad.push('alpha');
  const list = (k, name) => { const r = listOf(f[k]); if (r.bad) bad.push(name || k); return r.values; };
  if (type === 'grubbs') { t.values = list('values'); t.side = f.side || 'two'; }
  else if (type === 'cochran' || type === 'anova') { const g = groupsOf(f.groups); if (g.bad) bad.push('groups'); t.groups = g.groups; }
  else if (type === 'ttest' || type === 'ftest') {
    t.a = list('a'); t.b = list('b'); t.tail = f.tail || 'two';
    if (type === 'ttest') t.equalVariance = f.equalVariance !== false && f.equalVariance !== 'false';
  } else if (type === 'recovery') { t.values = list('values'); if (f.correction === 'applied') t.correction = 'applied'; }
  else if (type === 'linearity') { const p = pointsOf(f.points); if (p.bad) bad.push('points'); t.points = p.points; }
  else if (type === 'lod') {
    t.method = f.method === 'calibration' ? 'calibration' : 'blank';
    if (t.method === 'blank') {
      t.values = list('values');
      for (const k of ['replicates', 'blankReplicates', 'kQ']) { const n = numField(f[k]); if (Number.isNaN(n)) bad.push(k); else if (n !== '') t[k] = n; }
      if (f.blankCorrection === true || f.blankCorrection === 'true') t.blankCorrection = true;
    } else { const p = pointsOf(f.points); if (p.bad) bad.push('points'); t.points = p.points; }
  }
  return { test: t, bad: [...new Set(bad)] };
}

/** Test spetsifikatsiyasi → shakl (tahrirlash uchun). */
export function formOf(t) {
  const x = t || {};
  const join = v => (v || []).join('; ');
  return {
    type: x.type || 'grubbs', id: x.id || '', label: x.label || '', alpha: x.alpha === undefined ? '' : String(x.alpha), side: x.side || 'two', tail: x.tail || 'two',
    equalVariance: x.equalVariance !== false, values: join(x.values), groups: (x.groups || []).map(join).join('\n'), a: join(x.a), b: join(x.b),
    points: (x.points || []).map(p => `${p.x}; ${p.y}`).join('\n'), method: x.method || 'blank', replicates: x.replicates === undefined ? '' : String(x.replicates),
    blankCorrection: x.blankCorrection === true, blankReplicates: x.blankReplicates === undefined ? '' : String(x.blankReplicates), kQ: x.kQ === undefined ? '' : String(x.kQ),
    correction: x.correction || 'not_applied',
  };
}

/** Validatsiya to'plami → dvigatel spetsifikatsiyasi ('uc-validation/1'). */
export function validationSpecOf(set) {
  const s = set || {};
  return { format: VALIDATION_FORMAT, method: s.method || '', quantity: s.quantity || '', matrix: s.matrix || '', unit: s.unit || '', savedBy: s.savedBy, tests: (s.tests || []).map((t, i) => ({ ...t, id: t.id || `T${i + 1}` })) };
}
export function analyseValidation(set) {
  const s = set || {};
  return (s.tests || []).length ? evaluateValidation(validationSpecOf(s)) : null;
}

/** Yangi test identifikatori: T1, T2 … (mavjudlari bilan to'qnashmaydi). */
export function nextTestId(tests) {
  const used = new Set((tests || []).map(t => t.id));
  let i = (tests || []).length + 1;
  while (used.has(`T${i}`)) i++;
  return `T${i}`;
}

/** PT u(bias) bloki → top-down ustasi ptRows matni ("bias; u(C_ref)" har qatorda — src/ui/topdown/build.js). */
export function ptRowsText(bias) {
  return ((bias && bias.rounds) || []).map(r => {
    const u = r.uRef !== undefined ? r.uRef : r.U / (r.k || 2);
    return `${r.result - r.assigned}; ${u}`;
  }).join('\n');
}
