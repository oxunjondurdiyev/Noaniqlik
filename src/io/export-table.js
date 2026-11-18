/* ═══════════════════════════════════════════════════════════════
   EXPORT-TABLE.JS — natijadan "varaqlar modeli" (massivlar massivi) yasash (P05b). Sof modul (DOM yo'q).
   Model: { sheets: [{ key, name, rows: (number|string|null)[][], refs }] }
     • son — SON bo'lib qoladi, YAXLITLANMAYDI (to'liq double aniqlik). Yaxlitlash faqat hisobot qatlamida:
       "hisobotdagi ko'rinish" kataklari alohida, `o.round` (src/report/rounding.js::roundResult) orqali, MATN sifatida;
     • chekli bo'lmagan son (ν_eff = ∞) — '∞' matni; NaN / undefined — bo'sh katak;
     • matn — har doim matn katagi (yozuvchi '=' bilan boshlangan satrni ham formula qilmaydi: xlsx-write.js, csv.js);
     • refs — test va tekshiruv uchun kataklar manzili (A1 uslubida): y, uc, nuEff, k, U, budget { first, count, cols }.
   Bu modul HECH NARSA hisoblamaydi: barcha qiymatlar dvigatel natijasidan (va chaqiruvchi bergan ko'p nuqtali
   qamrovdan — Calc.multiPointCoverage) olinadi.
   Tuzilma (GUM): [Xulosa (ko'p nuqtali bo'lsa)] → har bir nuqta uchun varaq (kuzatuvlar, kirishlar, byudjet,
   natija) → Kirish (B tur manbalari, sozlamalar) → Topilmalar → Ma'lumot (dastur, dvigatel versiyasi, shablon, xesh).
   Boshqa rejimlar (regressiya, top-down, maxsus): Natija varag'i (skalyar maydonlar + jadval maydonlar) → Topilmalar → Ma'lumot.
═══════════════════════════════════════════════════════════════ */

const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function colName(i) {
  let s = '', n = i;
  do { s = COLS[n % 26] + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}
const addr = (row0, col0) => colName(col0) + (row0 + 1);

/** Katak qiymati: son (chekli) | '∞' | matn | null */
export function cell(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : (Number.isNaN(v) ? null : (v > 0 ? '∞' : '-∞'));
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'string') return v;
  return null;
}

/** Varaq nomi: Excel qoidalari (≤ 31 belgi, [ ] : * ? / \ yo'q, apostrof bilan boshlanmaydi / tugamaydi), takrorlanmas */
export function sheetName(raw, used) {
  let s = String(raw === null || raw === undefined ? '' : raw).replace(/[\[\]:*?/\\\u0000-\u001f]/g, ' ').replace(/^'+|'+$/g, '').replace(/\s+/g, ' ').trim().slice(0, 31).trim();
  if (!s) s = 'Sheet';
  let out = s, i = 2;
  const taken = n => used && used.has(n.toLowerCase());
  while (taken(out)) { const suf = ' (' + (i++) + ')'; out = s.slice(0, 31 - suf.length) + suf; }
  if (used) used.add(out.toLowerCase());
  return out;
}

const tr = o => (typeof o.t === 'function' ? o.t : k => k);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const prim = v => v === null || ['number', 'string', 'boolean'].includes(typeof v);

function observationsOf(input) {
  // calc-state ('params' + 'measurements') yoki { format: 'calc-state/v2', state } yoki uc-model/1
  const st = input && input.format === 'calc-state/v2' ? input.state : input;
  if (!st || typeof st !== 'object') return null;
  if (Array.isArray(st.inputs)) return { params: st.inputs.map(i => String(i.name)), cols: st.inputs.map(i => i.observations || []), dirs: st.directions || [] };
  if (!Array.isArray(st.params)) return null;
  const m = st.measurements && typeof st.measurements === 'object' ? st.measurements : {};
  return { params: st.params.map(String), cols: st.params.map(p => (Object.prototype.hasOwnProperty.call(m, p) && Array.isArray(m[p]) ? m[p] : [])), dirs: st.directions || [] };
}
const obsCell = v => {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'number') return cell(v);
  const s = String(v).trim().replace(',', '.');
  return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) && Number.isFinite(Number(s)) ? Number(s) : String(v);
};

function decisionRows(r, t) {
  const d = r.decision;
  if (!d || typeof d !== 'object') return [];
  const rows = [[t('io_x_decision')]];
  for (const k of ['verdict', 'pending', 'rule', 'lower', 'upper', 'acceptLower', 'acceptUpper', 'w', 'r', 'tur', 'pc', 'specificRisk', 'agreement']) {
    if (d[k] !== undefined && prim(d[k])) rows.push([k, cell(d[k])]);
  }
  return rows.length > 1 ? rows : [];
}

/** Bitta GUM nuqtasi varag'i */
function gumPointRows(r, input, o, cov) {
  const t = tr(o);
  const rows = [], refs = {};
  const push = row => { rows.push(row); return rows.length - 1; };
  push([o.title || t('io_x_point')]);
  push([t('io_x_model'), cell(r.formulaText || '')]);
  push([t('io_x_unit'), cell(r.unit || '')]);
  if (r.modelKind) push([t('io_x_model_kind'), cell(r.modelKind)]);
  push([]);
  const obs = observationsOf(input);
  if (obs && obs.params.length) {
    const n = Math.max(0, ...obs.cols.map(c => c.length));
    const dirOn = (obs.dirs || []).some(d => d === '↑' || d === '↓');
    push([t('io_x_observations')]);
    push(['i', ...(dirOn ? ['↑/↓'] : []), ...obs.params]);
    refs.observations = { first: rows.length + 1, count: n, firstCol: colName(dirOn ? 2 : 1) };
    for (let i = 0; i < n; i++) push([i + 1, ...(dirOn ? [cell(obs.dirs[i] || '')] : []), ...obs.cols.map(c => obsCell(c[i]))]);
    push([]);
  }
  if (Array.isArray(r.inputs) && r.inputs.length) {
    push([t('io_x_inputs')]);
    push([t('io_x_name'), 'n', t('io_x_mean'), 's', 'u_A', 'u_B', 'u(x)', 'c', 'ν']);
    r.inputs.forEach(i => push([cell(String(i.name)), cell(i.n), cell(i.mean), cell(i.sEff !== undefined ? i.sEff : i.s), cell(i.uA), cell(i.uB), cell(i.u), cell(i.c), cell(i.nu)]));
    push([]);
  }
  push([t('io_x_budget')]);
  push(['#', t('io_x_source'), t('io_x_input'), t('io_x_kind'), t('io_x_dist'), 'u(x)', 'c', 'u_i(y)', 'u_i²(y)', 'ν', t('io_x_share')]);
  const budget = Array.isArray(r.budget) ? r.budget : [];
  refs.budget = { first: rows.length + 1, count: budget.length, cols: { name: 'B', param: 'C', kind: 'D', dist: 'E', u: 'F', c: 'G', ui: 'H', contrib: 'I', nu: 'J', share: 'K' } };
  budget.forEach((b, i) => push([i + 1, cell(String(b.name === undefined ? '' : b.name)), cell(b.param === undefined ? '' : String(b.param)), cell(b.kind), cell(b.dist),
    cell(b.u), cell(b.c), cell(b.ui), cell(b.contrib), cell(b.nu), cell(b.share)]));
  push([]);
  push([t('io_x_result')]);
  const k = cov && cov.k !== undefined ? cov.k : r.k;
  const U = cov && cov.U !== undefined ? cov.U : r.U;
  const res = (key, label, v) => { const i = push([label, cell(v)]); refs[key] = addr(i, 1); };
  res('y', 'y', r.y);
  res('uc', 'u_c(y)', r.uc);
  res('nuEff', 'ν_eff', r.nuEff);
  res('k', 'k', k);
  res('U', 'U', U);
  res('P', 'P', r.P);
  if (r.relU !== undefined && U === r.U) res('relU', 'U_rel', r.relU);   // yagona k qo'llangan bo'lsa (U boshqa) — ko'rsatilmaydi (bu yerda hisoblanmaydi)
  if (r.deviation !== undefined && r.deviation !== null) res('deviation', t('io_x_deviation'), r.deviation);
  if (r.coverage) { push([t('io_x_k_method'), cell(r.coverage.method)]); push([t('io_x_nu_rule'), cell(r.coverage.nuRule)]); }
  if (typeof o.round === 'function' && Number.isFinite(r.y) && Number.isFinite(U)) {
    const rr = o.round(r.y, U, r.roundUp);
    if (rr && typeof rr.resultText === 'string') { const i = push([t('io_x_reported'), rr.resultText + (r.unit ? ' ' + r.unit : '')]); refs.reported = addr(i, 1); }
  }
  const dr = decisionRows(r, t);
  if (dr.length) { push([]); dr.forEach(push); }
  return { rows, refs };
}

function infoRows(o) {
  const t = tr(o), m = o.meta || {}, tm = m.template || null;
  return [
    [t('io_x_info')],
    [t('io_x_app'), cell(m.app || 'UncertaintyCalc')],
    [t('io_x_engine'), cell(m.engineVersion || (o.result && o.result.engineVersion) || '')],
    [t('io_x_mode'), cell(o.mode || 'GUM')],
    [t('io_x_template_id'), cell(tm ? String(tm.id || '') : '')],
    [t('io_x_template_version'), cell(tm ? String(tm.version || '') : '')],
    [t('io_x_template_status'), cell(tm ? String(tm.status || '') : '')],
    [t('io_x_calc_id'), cell(m.id || '')],
    [t('io_x_date'), cell(m.createdAt || '')],
    [t('io_x_hash'), cell(m.hash || '')],
    [],
    [t('io_x_note_unrounded')],
  ];
}

function findingsRows(o, items) {
  const t = tr(o);
  const rows = [[t('io_x_findings')], [t('io_x_point'), 'id', t('io_x_rule'), t('io_x_code'), t('io_x_severity'), t('io_x_ref'), t('io_x_input'), t('io_x_what'), t('io_x_why'), t('io_x_fix'), t('io_x_accepted')]];
  for (const it of items) {
    const acc = it.acceptances && typeof it.acceptances === 'object' ? it.acceptances : {};
    for (const f of (it.result && Array.isArray(it.result.findings) ? it.result.findings : [])) {
      let txt = {};
      try { txt = typeof o.findingText === 'function' ? (o.findingText(f) || {}) : {}; } catch (_) { txt = {}; }
      const a = Object.prototype.hasOwnProperty.call(acc, f.id) ? acc[f.id] : null;
      rows.push([cell(it.label || ''), cell(String(f.id || '')), cell(String(f.rule || '')), cell(String(f.code || '')), cell(String(f.severity || '')), cell(String(f.ref || '')),
        cell(f.param === undefined ? '' : String(f.param)), cell(txt.what || ''), cell(txt.why || ''), cell(txt.fix || ''), cell(a && typeof a.comment === 'string' ? a.comment : '')]);
    }
  }
  if (rows.length === 2) rows.push([t('io_x_no_findings')]);
  return rows;
}

function gumInputsRows(o) {
  const t = tr(o);
  const st = o.input && o.input.format === 'calc-state/v2' ? o.input.state : o.input;
  const rows = [[t('io_x_typeb')], [t('io_x_source'), t('io_x_input'), t('io_x_half_width'), t('io_x_dist'), 'k', 'ν', t('io_x_unit')]];
  const tb = st && Array.isArray(st.typeB) ? st.typeB : [];
  tb.forEach(c => rows.push([cell(String(c.name === undefined ? '' : c.name)), cell(String(c.param !== undefined ? c.param : (c.input !== undefined ? c.input : ''))),
    obsCell(c.halfWidth), cell(c.distribution === undefined ? '' : String(c.distribution)), obsCell(c.k), obsCell(c.nu), cell(c.unit === undefined ? '' : String(c.unit))]));
  rows.push([]);
  rows.push([t('io_x_settings')]);
  const s = st && isObj(st.settings) ? st.settings : {};
  for (const k of Object.keys(s)) if (prim(s[k])) rows.push([k, cell(s[k])]);
  return rows;
}

/** Umumiy (GUM bo'lmagan) natija: skalyar maydonlar + jadval ko'rinishidagi maydonlar */
function genericRows(r, o) {
  const t = tr(o);
  const rows = [[o.title || t('io_x_result')], [t('io_x_field'), t('io_x_value')]];
  const refs = {};
  const skip = new Set(['findings', 'warnings', 'notes']);
  const tables = [];
  const scalar = (key, v) => { rows.push([key, cell(v)]); refs[key] = addr(rows.length - 1, 1); };
  for (const key of Object.keys(r)) {
    if (skip.has(key)) continue;
    const v = r[key];
    if (prim(v)) { if (v !== null) scalar(key, v); continue; }
    if (Array.isArray(v)) { tables.push([key, v]); continue; }
    if (isObj(v)) {
      for (const k2 of Object.keys(v)) {
        const v2 = v[k2];
        if (prim(v2)) { if (v2 !== null) scalar(key + '.' + k2, v2); } else if (Array.isArray(v2)) tables.push([key + '.' + k2, v2]);
        else if (isObj(v2)) for (const k3 of Object.keys(v2)) if (prim(v2[k3]) && v2[k3] !== null) scalar(key + '.' + k2 + '.' + k3, v2[k3]);
      }
    }
  }
  for (const [key, arr] of tables) {
    if (!arr.length) continue;
    rows.push([]);
    rows.push([key]);
    if (arr.every(prim)) { refs[key] = { first: rows.length + 1, count: arr.length, col: 'B' }; arr.forEach((v, i) => rows.push([i + 1, cell(v)])); continue; }
    if (arr.every(Array.isArray)) { arr.forEach(row => rows.push(row.map(v => (prim(v) ? cell(v) : null)))); continue; }
    if (arr.every(isObj)) {
      const cols = [];
      arr.forEach(x => Object.keys(x).forEach(k => { if (prim(x[k]) && !cols.includes(k)) cols.push(k); }));
      rows.push(['#', ...cols]);
      const map = {};
      cols.forEach((c, i) => { map[c] = colName(i + 1); });
      refs[key] = { first: rows.length + 1, count: arr.length, cols: map };
      arr.forEach((x, i) => rows.push([i + 1, ...cols.map(c => (Object.prototype.hasOwnProperty.call(x, c) ? cell(x[c]) : null))]));
    }
  }
  return { rows, refs };
}

/**
 * Eksport modeli.
 * @param {object} o
 *   mode       'GUM' | 'REGRESSION' | 'TOP_DOWN' | 'SAMPLING' | 'QUALITATIVE' | 'MICRO' | 'MEDICAL'
 *   result     dvigatel natijasi (asosiy)
 *   input      dvigatelga berilgan spec (kuzatuvlar va B tur manbalari uchun)
 *   points     [{ label, result, input, acceptances?, k?, U? }] — ko'p nuqtali kalibrlash (k / U — yagona k qo'llangan bo'lsa)
 *   acceptances asosiy natija bo'yicha qabul qilingan topilmalar
 *   meta       { app, id, createdAt, engineVersion, template, hash }
 *   t          tarjima funksiyasi (kalit → matn); berilmasa kalitning o'zi
 *   round      roundResult(y, U, roundUp) — "hisobotdagi ko'rinish" katagi uchun (ixtiyoriy)
 *   findingText (finding) → { what, why, fix } (ixtiyoriy)
 * @returns {{sheets:{key:string, name:string, rows:any[][], refs:object}[]}}
 */
export function buildExportModel(o) {
  const t = tr(o);
  const used = new Set();
  const sheets = [];
  const add = (key, name, rows, refs) => sheets.push({ key, name: sheetName(name, used), rows, refs: refs || {} });
  const mode = o.mode || 'GUM';
  const pts = Array.isArray(o.points) ? o.points.filter(p => p && p.result && !p.result.error) : [];
  if (mode === 'GUM') {
    if (pts.length) {
      const rows = [[t('io_x_summary')], ['#', t('io_x_point'), 'y', 'U', 'k', 'u_c(y)', 'ν_eff', t('io_x_unit'), t('io_x_reported')]];
      const refs = { first: 3, count: pts.length, cols: { label: 'B', y: 'C', U: 'D', k: 'E', uc: 'F', nuEff: 'G', unit: 'H', reported: 'I' } };
      pts.forEach((p, i) => {
        const r = p.result, k = p.k !== undefined ? p.k : r.k, U = p.U !== undefined ? p.U : r.U;
        let rep = null;
        if (typeof o.round === 'function' && Number.isFinite(r.y) && Number.isFinite(U)) { const rr = o.round(r.y, U, r.roundUp); rep = rr && rr.resultText ? rr.resultText : null; }
        rows.push([i + 1, cell(String(p.label || '')), cell(r.y), cell(U), cell(k), cell(r.uc), cell(r.nuEff), cell(r.unit || ''), rep]);
      });
      add('summary', t('io_x_sheet_summary'), rows, refs);
      pts.forEach((p, i) => {
        const g = gumPointRows(p.result, p.input, { ...o, title: `${t('io_x_point')} ${i + 1}: ${p.label || ''}` }, { k: p.k, U: p.U });
        add('point' + (i + 1), `${t('io_x_sheet_point')} ${i + 1}`, g.rows, g.refs);
      });
    } else {
      const g = gumPointRows(o.result, o.input, { ...o, title: t('io_x_sheet_result') });
      add('point1', t('io_x_sheet_result'), g.rows, g.refs);
    }
    add('inputs', t('io_x_sheet_inputs'), gumInputsRows(o));
  } else {
    const g = genericRows(o.result, { ...o, title: `${t('io_x_sheet_result')} — ${mode}` });
    add('result', t('io_x_sheet_result'), g.rows, g.refs);
  }
  const items = mode === 'GUM' && pts.length ? pts.map((p, i) => ({ label: `${i + 1}: ${p.label || ''}`, result: p.result, acceptances: p.acceptances }))
    : [{ label: '', result: o.result, acceptances: o.acceptances }];
  add('findings', t('io_x_sheet_findings'), findingsRows(o, items));
  add('info', t('io_x_sheet_info'), infoRows(o));
  return { sheets };
}

/** Model → bitta tekis jadval (CSV uchun): har bir varaq oldidan uning nomi, keyin bo'sh qator */
export function flattenModel(model) {
  const out = [];
  (model.sheets || []).forEach((s, i) => {
    if (i) out.push([]);
    out.push(['# ' + s.name]);
    s.rows.forEach(r => out.push(r));
  });
  return out;
}
