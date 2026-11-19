/* ═══════════════════════════════════════════════════════════════
   IO/APP.JS — P05b: ma'lumot importi va eksporti kontrolleri (ES modul; index.html da src/js/app.js dan keyin).
   • Excel'dan qo'yish (paste): GUM o'lchashlar jadvali (.meas-input), top-down "qo'shimcha manbalar" jadvali;
     regressiya jadvali o'z kontrollerida (src/ui/regression/app.js) — tahlil yagona: src/io/table-text.js;
   • fayldan import (.xlsx / .csv) — ustunlarni moslash oynasi; maqsad jadvallar ro'yxati kengaytiriladi (registerTarget);
   • eksport: JSON (uc-calc/1, src/io/calc-json.js), XLSX va CSV (src/io/export-table.js); hisob faylini ochish (JSON).
   Xavfsizlik: fayl faqat brauzerda o'qiladi (File.arrayBuffer / FileReader), tarmoqqa hech narsa yuborilmaydi;
   fayldan kelgan har qanday matn DOM ga FAQAT textContent orqali; SheetJS faqat loadXlsx() bilan, kerak bo'lganda.
   CSP: inline skript / handler yo'q — addEventListener va data-io-*.
   Global: window.UCIO.
═══════════════════════════════════════════════════════════════ */
import { loadXlsx } from '../../io/vendor.js';
import { parseGrid, parseNumber, planTablePaste, matchColumns, applyMapping, isHeaderRow } from '../../io/table-text.js';
import { LIMITS, precheck, openTableFile } from '../../io/import.js';
import { buildCalcDoc, serializeCalcDoc, parseCalcDoc, reproduce, MAX_JSON_BYTES } from '../../io/calc-json.js';
import { gumInput, gumDocParts, gumStateFromInput } from '../../io/calc-state.js';
import { buildExportModel, flattenModel, colName } from '../../io/export-table.js';
import { writeXlsx, XLSX_MIME } from '../../io/xlsx-write.js';
import { toCsv, csvDialect } from '../../io/csv.js';
import { canonicalizeJcs, portable, fromPortable } from '../../storage/canonical.js';

const t = k => window.i18n.t(k);
const tf = (k, vars) => window.i18n.tf(k, vars);
const toast = (m, type = 'info', ms) => window.showToast && window.showToast(m, type, ms);
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const canon = v => canonicalizeJcs(portable(v));
const limitVars = () => ({ mb: Math.round(LIMITS.maxBytes / 1048576), rows: LIMITS.maxRows, cols: LIMITS.maxCols, sheets: LIMITS.maxSheets });
const errText = reason => tf('io_err_' + reason, limitVars());
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const blankCell = v => v === '' || v === null || v === undefined;

/* ─── Fayl o'qish (faqat brauzer xotirasida) ─── */
function readBytes(file) {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const fr = new window.FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsArrayBuffer(file);
  });
}
function pickFile(accept) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.className = 'hidden';
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.remove(); resolve(f || null); });
    inp.addEventListener('cancel', () => { inp.remove(); resolve(null); });
    document.body.appendChild(inp);
    inp.click();
  });
}
function download(name, data, mime) {
  const blob = new window.Blob([data], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.className = 'hidden';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}
const safeId = id => String(id || 'calc').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || 'calc';

/* ─── Oyna (modal) ─── */
let modal = null;
function closeModal() { if (modal) { modal.remove(); modal = null; } }
function openModal(titleText) {
  closeModal();
  modal = el('div', 'tpl-modal io-modal');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.dataset.ioModal = '1';
  const panel = el('div', 'tpl-modal-panel io-panel');
  const x = el('button', 'icon-btn tpl-modal-close', '×');
  x.type = 'button';
  x.dataset.ioAct = 'close';
  x.setAttribute('aria-label', t('io_dlg_close'));
  panel.appendChild(x);
  panel.appendChild(el('h2', 'io-title', titleText));
  const body = el('div', 'io-body');
  panel.appendChild(body);
  modal.appendChild(panel);
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-io-act="close"]')) closeModal(); });
  document.body.appendChild(modal);
  return body;
}

/* ─── Import maqsadlari (jadvallar) ─── */
const targets = new Map();
/**
 * @param {string} id
 * @param {{columns:()=>{key:string,label:string,kind?:string,aliases?:string[]}[], hasData:()=>boolean,
 *          apply:(data:{columns:any[][], rows:number})=>void, maxRows?:number}} def
 */
function registerTarget(id, def) { targets.set(String(id), def); }

const gumAnyDirectional = st => { const m = (st.settings || {}).typeA || {}; return st.params.some(p => m[p] && m[p].directional); };

registerTarget('gum', {
  maxRows: LIMITS.maxTableRows,
  columns() {
    const st = window.appState.get();
    const cols = st.params.map(p => ({ key: 'p:' + p, label: p, aliases: [p] }));
    if (gumAnyDirectional(st)) cols.push({ key: 'dir', label: t('io_dir_col'), kind: 'direction', aliases: ['↑/↓', 'dir'] });
    return cols;
  },
  hasData() {
    const st = window.appState.get();
    return st.params.some(p => (st.measurements[p] || []).some(v => !blankCell(v)));
  },
  apply({ columns, rows, mapping }) {
    const st = window.appState.get();
    const n = Math.max(2, rows);
    const m = {};
    st.params.forEach((p, i) => {
      const arr = Array(n).fill('');
      const src = mapping[i] >= 0 ? columns[i] : (st.measurements[p] || []);
      for (let r = 0; r < Math.min(n, src.length); r++) arr[r] = src[r] === undefined || src[r] === null ? '' : src[r];
      m[p] = arr;
    });
    const patch = { n, measurements: m, typeA: {}, combined: null };
    const di = st.params.length;
    if (columns.length > di && mapping[di] >= 0) patch.directions = columns[di].slice(0, n);
    else patch.directions = (st.directions || []).slice(0, n);
    if (st.template && st.template.demo) patch.template = { ...st.template, demo: false };
    window.appState.set(patch);
    if (window.App && window.App.renderSidebar) window.App.renderSidebar();
  },
});

registerTarget('regression', {
  maxRows: LIMITS.maxRows,
  columns: () => [
    { key: 'x', label: t('rg_col_x'), aliases: ['x'] }, { key: 'ux', label: t('rg_col_ux'), aliases: ['ux', 'u(x)', 'u_x'] },
    { key: 'y', label: t('rg_col_y'), aliases: ['y'] }, { key: 'uy', label: t('rg_col_uy'), aliases: ['uy', 'u(y)', 'u_y'] },
  ],
  hasData: () => !!window.UCRegression && window.UCRegression.getState().rows.some(r => ['x', 'ux', 'y', 'uy'].some(k => !blankCell(r[k]))),
  apply({ columns, rows }) {
    const keys = ['x', 'ux', 'y', 'uy'];
    const out = [];
    for (let r = 0; r < rows; r++) {
      const row = { x: '', ux: '', y: '', uy: '' };
      keys.forEach((k, i) => { const v = columns[i][r]; row[k] = blankCell(v) ? '' : String(v); });
      out.push(row);
    }
    while (out.length < 6) out.push({ x: '', ux: '', y: '', uy: '' });
    const st = window.UCRegression.getState();
    window.UCRegression.setState({ ...st, rows: out, template: st.template && st.template.demo ? { ...st.template, demo: false } : st.template });
  },
});

/* ─── Fayldan jadval importi: ustunlarni moslash oynasi ─── */
function showImportDialog(targetId, fileName, opened) {
  const target = targets.get(targetId);
  const cols = target.columns();
  const kinds = cols.map(c => c.kind || 'number');
  const maxRows = target.maxRows || LIMITS.maxRows;
  const body = openModal(t('io_dlg_title'));
  body.appendChild(el('p', 'text-muted text-sm', t('io_dlg_privacy') + ' ' + tf('io_dlg_limits', limitVars())));

  const head = el('div', 'io-row');
  const fileLab = el('span', 'io-file');
  fileLab.appendChild(el('span', 'io-label', t('io_dlg_file') + ': '));
  fileLab.appendChild(el('span', 'mono', fileName));          // fayl nomi — faqat matn
  head.appendChild(fileLab);
  let sheetSel = null;
  if (opened.kind === 'xlsx') {
    const lab = el('label', 'io-field');
    lab.appendChild(el('span', '', t('io_dlg_sheet')));
    sheetSel = el('select');
    sheetSel.dataset.ioSheet = '1';
    opened.sheets.forEach((name, i) => { const o = el('option', '', name); o.value = String(i); sheetSel.appendChild(o); });
    lab.appendChild(sheetSel);
    head.appendChild(lab);
  }
  let delimSel = null;
  if (opened.kind === 'csv') {
    const lab = el('label', 'io-field');
    lab.appendChild(el('span', '', t('io_dlg_delimiter')));
    delimSel = el('select');
    delimSel.dataset.ioDelimiter = '1';
    [[';', 'io_dlg_delim_semicolon'], [',', 'io_dlg_delim_comma'], ['\t', 'io_dlg_delim_tab']].forEach(([v, k]) => { const o = el('option', '', t(k)); o.value = v; delimSel.appendChild(o); });
    delimSel.value = opened.delimiter || ';';
    lab.appendChild(delimSel);
    head.appendChild(lab);
  }
  const hdrLab = el('label', 'io-check');
  const hdr = el('input');
  hdr.type = 'checkbox';
  hdr.dataset.ioHeader = '1';
  hdrLab.appendChild(hdr);
  hdrLab.appendChild(el('span', '', t('io_dlg_header')));
  head.appendChild(hdrLab);
  body.appendChild(head);

  body.appendChild(el('h3', 'rg-card-title', t('io_dlg_mapping')));
  const mapBox = el('div', 'io-map');
  body.appendChild(mapBox);
  body.appendChild(el('h3', 'rg-card-title', t('io_dlg_preview')));
  const prevWrap = el('div', 'table-scroll io-preview-wrap');
  body.appendChild(prevWrap);
  const status = el('p', 'io-status');
  status.dataset.ioStatus = '1';
  body.appendChild(status);
  const errBox = el('p', 'io-error');
  errBox.dataset.ioError = '1';
  body.appendChild(errBox);

  let confirm = null;
  if (target.hasData()) {
    const lab = el('label', 'io-check io-confirm');
    confirm = el('input');
    confirm.type = 'checkbox';
    confirm.dataset.ioReplace = '1';
    lab.appendChild(confirm);
    lab.appendChild(el('span', '', t('io_dlg_replace')));
    body.appendChild(lab);
  }
  const actions = el('div', 'rg-actions');
  const ok = el('button', 'btn btn-primary', t('io_dlg_import'));
  ok.type = 'button';
  ok.dataset.ioConfirm = '1';
  const cancel = el('button', 'btn btn-ghost', t('io_dlg_cancel'));
  cancel.type = 'button';
  cancel.dataset.ioAct = 'close';
  actions.appendChild(ok);
  actions.appendChild(cancel);
  body.appendChild(actions);

  let rows = [];
  let nCols = 0;
  let selects = [];

  const mapping = () => selects.map(s => Number(s.value));
  function refresh() {
    const res = applyMapping(rows, mapping(), { header: hdr.checked, kinds });
    const parts = [tf('io_dlg_status', { n: res.rows })];
    if (res.bad) parts.push(tf('io_dlg_bad', { n: res.bad }));
    if (res.rows > maxRows) parts.push(tf('io_dlg_too_many', { n: maxRows }));
    status.textContent = parts.join(' · ');
    status.classList.toggle('io-warn', !!res.bad || res.rows > maxRows);
    ok.disabled = !(res.rows > 0 && res.rows <= maxRows && mapping().some(i => i >= 0) && (!confirm || confirm.checked));
    return res;
  }
  function drawMapping() {
    mapBox.textContent = '';
    const headerRow = hdr.checked ? (rows[0] || []) : [];
    let guess = hdr.checked ? matchColumns(headerRow, cols) : cols.map(() => -1);
    if (!guess.some(i => i >= 0)) guess = cols.map((c, i) => (c.kind === 'direction' ? -1 : (i < nCols ? i : -1)));
    selects = cols.map((c, ti) => {
      const lab = el('label', 'io-field');
      lab.appendChild(el('span', '', c.label));                 // parametr nomi — matn
      const sel = el('select');
      sel.dataset.ioMap = String(ti);
      const none = el('option', '', t('io_dlg_ignore'));
      none.value = '-1';
      sel.appendChild(none);
      for (let j = 0; j < nCols; j++) {
        const h = headerRow[j];
        const o = el('option', '', tf('io_dlg_col', { c: colName(j) }) + (blankCell(h) ? '' : ': ' + String(h).slice(0, 40)));
        o.value = String(j);
        sel.appendChild(o);
      }
      sel.value = String(guess[ti]);
      lab.appendChild(sel);
      mapBox.appendChild(lab);
      return sel;
    });
  }
  function drawPreview() {
    prevWrap.textContent = '';
    const table = el('table', 'data-table io-preview');
    const thead = el('thead');
    const trh = el('tr');
    trh.appendChild(el('th', '', '#'));
    for (let j = 0; j < nCols; j++) trh.appendChild(el('th', '', colName(j)));
    thead.appendChild(trh);
    table.appendChild(thead);
    const tb = el('tbody');
    rows.slice(0, LIMITS.previewRows).forEach((r, i) => {
      const tr = el('tr', hdr.checked && i === 0 ? 'io-header-row' : '');
      tr.appendChild(el('td', 'text-muted', String(i + 1)));
      for (let j = 0; j < nCols; j++) {
        const v = r[j];
        tr.appendChild(el('td', typeof v === 'number' ? 'cell-num mono' : '', blankCell(v) ? '' : String(v).slice(0, 80)));   // faqat textContent
      }
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    prevWrap.appendChild(table);
  }
  function loadSheet(i) {
    errBox.textContent = '';
    const s = opened.sheet(i, delimSel ? { delimiter: delimSel.value } : undefined);
    if (!s.ok) { rows = []; nCols = 0; errBox.textContent = errText(s.reason); } else { rows = s.rows; nCols = Math.min(s.nCols, LIMITS.maxCols); }
    hdr.checked = rows.length > 1 && isHeaderRow(rows[0]);
    drawMapping();
    drawPreview();
    refresh();
  }
  body.addEventListener('change', e => {
    if (e.target === sheetSel) { loadSheet(Number(sheetSel.value)); return; }
    if (e.target === delimSel) { loadSheet(0); return; }
    if (e.target === hdr) { drawMapping(); drawPreview(); }
    refresh();
  });
  ok.addEventListener('click', () => {
    const res = refresh();
    if (ok.disabled) return;
    try { target.apply({ columns: res.columns, rows: res.rows, mapping: mapping() }); } catch (_) { toast(t('io_err_read_failed'), 'error'); return; }
    closeModal();
    toast(tf('io_imported', { n: res.rows }) + (res.bad ? ' · ' + tf('io_paste_bad', { n: res.bad }) : ''), 'success', 5000);
  });
  loadSheet(0);
}

/**
 * Fayldan import: File obyekti yoki { name, data: Uint8Array | ArrayBuffer } (fayl tanlagichsiz — test va boshqa modullar uchun).
 * ('data' nomi ataylab: Blob.prototype.bytes() usuli bilan adashmaslik uchun.)
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
async function importTableData(targetId, file) {
  if (!targets.has(targetId) || !file) return { ok: false, reason: 'read_failed' };
  const given = file.data instanceof Uint8Array || file.data instanceof ArrayBuffer ? file.data : null;
  const pre = precheck({ name: file.name, size: file.size !== undefined ? file.size : (given ? given.byteLength : 0) });   // hajm — o'qishdan OLDIN
  if (!pre.ok) { toast(errText(pre.reason), 'error', 6000); return pre; }
  let bytes = given;
  if (!bytes) { try { bytes = await readBytes(file); } catch (_) { toast(errText('read_failed'), 'error'); return { ok: false, reason: 'read_failed' }; } }
  const opened = await openTableFile({ name: file.name }, bytes, loadXlsx);
  if (!opened.ok) { toast(errText(opened.reason), 'error', 6000); return opened; }
  showImportDialog(targetId, String(file.name), opened);
  return { ok: true };
}
async function openImport(targetId) {
  const f = await pickFile('.xlsx,.csv,.tsv,.txt');
  return f ? importTableData(targetId, f) : { ok: false, reason: 'cancelled' };
}

/* ─── Excel'dan qo'yish (paste) ─── */
function pasteGum(e, inp) {
  const text = (e.clipboardData || window.clipboardData).getData('text');
  const grid = parseGrid(text);
  if (grid.length <= 1 && (grid[0] || []).length <= 1) return;       // bitta katak — odatiy qo'yish
  e.preventDefault();
  const st = window.appState.get();
  const startCol = Math.max(0, st.params.indexOf(inp.dataset.param));
  const startRow = parseInt(inp.dataset.idx, 10) || 0;
  const plan = planTablePaste(grid, st.params, { startCol, startRow, maxRows: LIMITS.maxTableRows - startRow });
  const filled = plan.cells.filter(c => c.value !== '').length;
  if (!filled) { toast(t('io_paste_none'), 'error'); return; }
  const n = Math.max(st.n, plan.lastRow + 1);
  const m = {};
  st.params.forEach(p => { const arr = Array(n).fill(''); (st.measurements[p] || []).forEach((v, i) => { if (i < n) arr[i] = v; }); m[p] = arr; });
  plan.cells.forEach(c => { m[st.params[c.col]][c.row] = c.value; });
  const patch = { n, measurements: m, typeA: {}, combined: null };
  if (plan.dirs.length && gumAnyDirectional(st)) {
    const d = Array.from({ length: n }, (_, i) => (st.directions || [])[i] || '');
    plan.dirs.forEach(x => { if (x.row < n) d[x.row] = x.value; });
    patch.directions = d;
  }
  if (st.template && st.template.demo) patch.template = { ...st.template, demo: false };
  window.appState.set(patch);
  if (n !== st.n && window.App && window.App.renderSidebar) window.App.renderSidebar();
  toast(tf('io_pasted', { n: plan.rows }) + (plan.bad ? ' · ' + tf('io_paste_bad', { n: plan.bad }) : '') +
    (plan.truncated ? ' · ' + tf('io_paste_truncated', { n: LIMITS.maxTableRows }) : ''), plan.bad || plan.truncated ? 'info' : 'success', 5000);
}

/* Top-down "qo'shimcha manbalar" jadvali: ustunlar — nom | u (2 ustun) yoki nom | … | u (oxirgi ustun — u) */
function pasteTopdownAdditional(e, inp) {
  if (!window.UCTopDown || !window.UCTopDown.setState) return;
  const text = (e.clipboardData || window.clipboardData).getData('text');
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim() !== '');
  if (!lines.some(l => l.includes('\t')) && lines.length <= 1) return;
  e.preventDefault();
  const grid = lines.map(l => l.split('\t').map(c => c.trim()));
  const st = window.UCTopDown.getState();
  const add = Array.isArray(st.additional) ? st.additional.map(a => ({ ...a })) : [];
  const start = Number(inp.dataset.tdAdd) || 0;
  const key = inp.dataset.tdAddKey;
  let n = 0, bad = 0;
  grid.slice(0, LIMITS.maxTableRows).forEach((cells, i) => {
    const row = add[start + n] || { name: '', category: 'other', u: '' };
    let name = null, u = null;
    if (cells.length === 1) { if (key === 'u') u = cells[0]; else name = cells[0]; } else { name = cells[0]; u = cells[cells.length - 1]; }
    if (u !== null) {
      const num = parseNumber(u);
      if (Number.isNaN(num)) { bad++; if (i === 0 && cells.length > 1) return; u = null; } else u = num === null ? '' : String(num);   // sarlavha qatori tashlanadi
    }
    if (name !== null) row.name = name.slice(0, 200);
    if (u !== null) row.u = u;
    add[start + n] = row;
    n++;
  });
  for (let i = 0; i < add.length; i++) if (!add[i]) add[i] = { name: '', category: 'other', u: '' };
  if (!n) { toast(t('io_paste_none'), 'error'); return; }
  window.UCTopDown.setState({ ...st, additional: add });
  toast(tf('io_pasted', { n }) + (bad ? ' · ' + tf('io_paste_bad', { n: bad }) : ''), 'success', 4000);
}

function onPaste(e) {
  const trg = e.target;
  if (!trg || !trg.classList || !(e.clipboardData || window.clipboardData)) return;
  if (trg.classList.contains('meas-input')) pasteGum(e, trg);
  else if (trg.dataset && trg.dataset.tdAdd !== undefined && trg.tagName === 'INPUT') pasteTopdownAdditional(e, trg);
}

/* ─── Hisob hujjati (uc-calc/1) ─── */
const tplMeta = m => (m && typeof m === 'object' ? { id: m.id, version: m.version, status: m.status, variant: m.variant } : null);
const accOf = scope => (window.UCFindings && window.UCFindings.acceptances ? clone(window.UCFindings.acceptances(scope) || {}) : {});

/** Joriy hisob qismlari: { mode-ga xos input / result / points / template / ui / acceptances / meta } yoki { error } */
function calcParts(scope) {
  const Calc = window.Calc;
  if (scope === 'gum') {
    const st = window.appState.get();
    if (!st.combined || st.combined.error) return { error: 'need_result' };
    const rt = window.UCTemplates;
    const parts = gumDocParts(st, Calc.evaluate, rt && rt.evaluateState ? rt.evaluateState : undefined);
    if (!parts.result || parts.result.error) return { error: 'need_result' };
    const ui = { tab: 'gum' };
    if (st.template) { ui.state = gumInput(st); ui.points = (st.points || []).map(p => gumInput(p.snapshot || {})); }
    return {
      input: parts.input, result: parts.result, points: parts.points, template: tplMeta(st.template), ui,
      acceptances: clone(st.acceptances || {}), meta: Calc.metaFor(st.combined, st.calcMeta),
      stale: canon(parts.result) !== canon(st.combined), uniformK: !!(st.summary && st.summary.uniformK),
    };
  }
  const api = { regression: window.UCRegression, topdown: window.UCTopDown, special: window.UCSpecial }[scope];
  if (!api) return { error: 'need_result' };
  const cur = api.current();
  const result = scope === 'special' ? cur : (cur && cur.result);
  const spec = scope === 'special' ? (api.currentSpec ? api.currentSpec() : null) : (cur && cur.spec);
  if (!result || result.error || !spec) return { error: 'need_result' };
  // fayldan o'qilganda qanday tiklansa — aynan shunday (∞ ko'chma ko'rinishda saqlanadi): import bilan bir xil yo'l
  const input = fromPortable(JSON.parse(JSON.stringify(portable(spec))));
  const again = Calc.evaluate(fromPortable(JSON.parse(JSON.stringify(portable(spec)))));
  if (!again || again.error || canon(again) !== canon(result)) return { error: 'not_reproducible' };
  const state = api.getState();
  return { input, result, points: [], template: tplMeta(state.template), ui: { tab: scope, state }, acceptances: accOf(scope), meta: Calc.metaFor(result), stale: false };
}

/* P13 (R-24, R-22): hujjatga hisoblagan muhit (brauzer qisqa nomi va versiyasi) va build belgisi yoziladi — window.UCBuild */
async function docFromParts(p) {
  const B = window.UCBuild;
  let build = null;
  try { build = B ? await B.mark() : null; } catch (_) { build = null; }
  return buildCalcDoc({ id: p.meta.id, createdAt: p.meta.createdAt, input: p.input, result: p.result, template: p.template, points: p.points, acceptances: p.acceptances, ui: p.ui,
    env: B ? B.environment() : null, build });
}

/** Joriy hisobning 'uc-calc/1' hujjati — JSON eksport aynan shuni yozadi. Yon ta'sirsiz; muammo bo'lsa null. */
async function calcDoc(scope) {
  try {
    const p = calcParts(scope || 'gum');
    return p.error ? null : await docFromParts(p);
  } catch (_) { return null; }
}

function exportModel(p, doc) {
  const Calc = window.Calc;
  let points = p.points;
  if (points.length && Calc.multiPointCoverage) {
    try {
      const cov = Calc.multiPointCoverage(points.map(x => x.result), !!p.uniformK);
      points = points.map((x, i) => ({ ...x, k: cov[i].k, U: cov[i].U }));
    } catch (_) { /* yagona k qo'llanmaydi */ }
  }
  return buildExportModel({
    mode: doc.mode, result: p.result, input: p.input, points, acceptances: p.acceptances,
    meta: { app: doc.app, id: doc.id, createdAt: doc.createdAt, engineVersion: doc.engineVersion, template: doc.template, hash: doc.hash },
    t, round: Calc.roundResult, findingText: Calc.findingText ? f => Calc.findingText(f, t) : undefined,
  });
}

/**
 * Eksport. @param {'gum'|'regression'|'topdown'|'special'} scope  @param {'json'|'xlsx'|'csv'} format
 * @returns {Promise<{ok:true, name:string, doc:object} | {ok:false, reason:string}>}
 */
async function exportCalc(scope, format) {
  try {
    const p = calcParts(scope);
    if (p.error) {
      toast(t(p.error === 'not_reproducible' ? 'io_err_not_reproducible' : 'io_need_result'), 'error', 5000);
      return { ok: false, reason: p.error };
    }
    const doc = await docFromParts(p);
    const base = 'uncertaintycalc-' + safeId(doc.id);
    let name;
    if (format === 'json') {
      name = base + '.json';
      download(name, serializeCalcDoc(doc), 'application/json');
    } else if (format === 'xlsx') {
      const XLSX = await loadXlsx();                       // SheetJS — faqat shu yerda, birinchi marta kerak bo'lganda
      name = base + '.xlsx';
      download(name, writeXlsx(XLSX, exportModel(p, doc)), XLSX_MIME);
    } else if (format === 'csv') {
      name = base + '.csv';
      download(name, toCsv(flattenModel(exportModel(p, doc)), csvDialect(window.i18n.lang)), 'text/csv;charset=utf-8');
    } else return { ok: false, reason: 'format' };
    toast(tf('io_exported', { name }) + (p.stale ? ' — ' + t('io_export_stale') : ''), p.stale ? 'info' : 'success', p.stale ? 8000 : 4000);
    return { ok: true, name, doc };
  } catch (_) {
    toast(t('io_err_export'), 'error', 5000);
    return { ok: false, reason: 'export' };
  }
}

/* ─── Hisob faylini ochish (JSON) ─── */
const TAB_OF_MODE = { GUM: 'gum', REGRESSION: 'regression', TOP_DOWN: 'topdown', SAMPLING: 'special', QUALITATIVE: 'special', MICRO: 'special', MEDICAL: 'special' };

function editorHasData(tab) {
  if (tab === 'gum') return targets.get('gum').hasData();
  if (tab === 'regression') return targets.get('regression').hasData();
  return true;
}

function loadIntoEditor(parsed, tab) {
  const Calc = window.Calc;
  const ui = isObj(parsed.ui) ? parsed.ui : {};
  if (tab === 'gum') {
    const src = isObj(ui.state) ? ui.state : parsed.input;
    const g = gumStateFromInput(src);
    if (!g.ok) return false;
    const reEval = spec => { try { const r = Calc.evaluate(spec); return r && !r.error ? r : null; } catch (_) { return null; } };
    const points = [];
    parsed.points.forEach((p, i) => {
      const snapSrc = Array.isArray(ui.points) && isObj(ui.points[i]) ? ui.points[i] : p.input;
      const s = gumStateFromInput(snapSrc);
      if (!s.ok) return;
      points.push({ id: typeof p.id === 'string' && p.id ? p.id : 'pt_imp_' + i, label: String(p.label || ''), snapshot: s.state, result: reEval(p.input) || p.result, acceptances: isObj(p.acceptances) ? clone(p.acceptances) : {}, meta: null });
    });
    window.appState.set({
      ...g.state, typeA: {}, combined: reEval(parsed.input) || parsed.result, points, currentPoint: null,
      acceptances: isObj(parsed.acceptances) ? clone(parsed.acceptances) : {},
      calcMeta: { id: String(parsed.doc.id || ''), createdAt: String(parsed.doc.createdAt || '') },
    });
    if (window.App) { window.App.showScreen('app'); window.App.renderSidebar(); }
    if (window.Table) window.Table.render();
    if (window.TypeB) window.TypeB.render();
    if (window.Results) window.Results.render();
    window.switchTab('results');
    return true;
  }
  const api = { regression: window.UCRegression, topdown: window.UCTopDown, special: window.UCSpecial }[tab];
  if (!api || !api.setState || ui.tab !== tab || !isObj(ui.state)) return false;
  if (tab === 'regression' && !(Array.isArray(ui.state.rows) && ui.state.rows.every(isObj))) return false;
  const before = api.getState();
  try {
    api.setState(clone(ui.state));
    api.calculate();
  } catch (_) {
    try { api.setState(before); } catch (e2) { /* avvalgi holat tiklanmadi */ }
    return false;
  }
  if (window.App) window.App.showScreen('app');
  window.switchTab(tab);
  return true;
}

function showCalcDialog(parsed, rep) {
  const doc = parsed.doc;
  const tab = TAB_OF_MODE[doc.mode] || 'gum';
  const body = openModal(t('io_json_title'));
  const list = el('dl', 'io-facts');
  const fact = (label, value) => { list.appendChild(el('dt', '', label)); list.appendChild(el('dd', 'mono', String(value))); };   // qiymatlar — faqat matn
  fact(t('io_json_id'), doc.id || '—');
  fact(t('io_json_date'), doc.createdAt || '—');
  fact(t('io_json_engine'), `${doc.engineVersion || '—'} / ${window.Calc.ENGINE_VERSION}`);
  fact(t('io_json_mode'), doc.mode);
  if (doc.template && doc.template.id) fact(t('io_json_template'), `${doc.template.id} v${doc.template.version || ''} (${doc.template.status || ''})`);
  if (parsed.points.length) fact(t('io_json_points'), parsed.points.length);
  const B = window.UCBuild;
  if (parsed.env || B) fact(t('io_json_env'), `${(B && parsed.env ? B.environmentText(parsed.env) : '') || '—'} / ${B ? B.environmentText(B.environment()) || '—' : '—'}`);
  if (parsed.build) fact(t('io_json_build'), parsed.build.id + (parsed.build.source === 'engine-hash' ? ' (dev)' : ''));
  fact(t('io_x_hash'), doc.hash);
  body.appendChild(list);
  body.appendChild(el('p', 'io-ok', '✓ ' + t('io_json_hash_ok')));
  // P13 (R-24, egasi qarori B): boshqa JS dvigatelida oxirgi xonadagi farq (≤ 1·10⁻¹⁴) — xato emas, alohida ko'rsatiladi
  const repLine = rep.close
    ? el('p', 'io-status io-warn', '≈ ' + tf('io_json_close', { d: rep.maxRel.toExponential(1) }))
    : el('p', rep.identical ? 'io-ok' : 'io-error', (rep.identical ? '✓ ' : '✗ ') + t(rep.identical ? 'io_json_identical' : 'io_json_differs'));
  repLine.dataset.ioReproduced = rep.identical ? 'identical' : rep.close ? 'close' : 'differs';
  body.appendChild(repLine);
  if (!rep.sameEngine) { const w = el('p', 'io-status io-warn', '⚠ ' + t('io_json_engine_differs')); w.dataset.ioEngineDiffers = '1'; body.appendChild(w); }

  const ui = isObj(parsed.ui) ? parsed.ui : {};
  const editable = tab === 'gum' ? gumStateFromInput(isObj(ui.state) ? ui.state : parsed.input).ok
    : (ui.tab === tab && isObj(ui.state) && !!({ regression: window.UCRegression, topdown: window.UCTopDown, special: window.UCSpecial }[tab] || {}).setState);
  let confirm = null;
  if (!editable) body.appendChild(el('p', 'text-muted text-sm', t('io_json_not_editable')));
  else if (editorHasData(tab)) {
    const lab = el('label', 'io-check io-confirm');
    confirm = el('input');
    confirm.type = 'checkbox';
    confirm.dataset.ioReplace = '1';
    lab.appendChild(confirm);
    lab.appendChild(el('span', '', t('io_json_replace')));
    body.appendChild(lab);
  }
  const actions = el('div', 'rg-actions');
  if (editable) {
    const ok = el('button', 'btn btn-primary', t('io_json_load'));
    ok.type = 'button';
    ok.dataset.ioConfirm = '1';
    ok.disabled = !!confirm;
    if (confirm) confirm.addEventListener('change', () => { ok.disabled = !confirm.checked; });
    ok.addEventListener('click', () => {
      if (ok.disabled) return;
      let done = false;
      try { done = loadIntoEditor(parsed, tab); } catch (_) { done = false; }
      closeModal();
      toast(t(done ? 'io_json_loaded' : 'io_json_err_load'), done ? 'success' : 'error', 5000);
    });
    actions.appendChild(ok);
  }
  const cancel = el('button', 'btn btn-ghost', t('io_dlg_close'));
  cancel.type = 'button';
  cancel.dataset.ioAct = 'close';
  actions.appendChild(cancel);
  body.appendChild(actions);
}

/** JSON matnidan hisobni ochish: xesh tekshiruvi → qayta hisob → oyna. @returns {Promise<{ok, reason?, identical?, sameEngine?}>} */
async function importCalcText(text) {
  const parsed = await parseCalcDoc(text);
  if (!parsed.ok) { toast(t('io_json_err_' + parsed.reason), 'error', 6000); return { ok: false, reason: parsed.reason }; }
  let rep;
  try { rep = reproduce(parsed, window.Calc.evaluate, window.Calc.ENGINE_VERSION); } catch (_) {
    rep = { identical: false, main: false, points: [], sameEngine: parsed.doc.engineVersion === window.Calc.ENGINE_VERSION, maxRel: Infinity, close: false };
  }
  showCalcDialog(parsed, rep);
  return { ok: true, identical: rep.identical, sameEngine: rep.sameEngine };
}
async function openCalcFile() {
  const f = await pickFile('.json,application/json');
  if (!f) return { ok: false, reason: 'cancelled' };
  if (f.size > MAX_JSON_BYTES) { toast(t('io_json_err_too_large'), 'error', 6000); return { ok: false, reason: 'too_large' }; }   // o'qishdan OLDIN
  let text;
  try { text = typeof f.text === 'function' ? await f.text() : new TextDecoder('utf-8').decode(await readBytes(f)); } catch (_) { toast(errText('read_failed'), 'error'); return { ok: false, reason: 'read_failed' }; }
  return importCalcText(text);
}

/* ─── Tugmalar (index.html dagi data-io-act) ─── */
function onClick(e) {
  const btn = e.target.closest && e.target.closest('[data-io-act]');
  if (!btn || btn.dataset.ioAct === 'close') return;
  const act = btn.dataset.ioAct, scope = btn.dataset.ioScope || 'gum';
  if (act === 'import-table') openImport(btn.dataset.ioTarget || 'gum');
  else if (act === 'export') exportCalc(scope, btn.dataset.ioFormat || 'json');
  else if (act === 'import-calc') openCalcFile();
}

function bind() {
  document.addEventListener('paste', onPaste);
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', e => { if (e.keyCode === 27 && modal) closeModal(); });   // Esc
}

window.UCIO = Object.freeze({
  LIMITS,
  registerTarget,
  openImport,
  importTableData,
  exportCalc,
  calcDoc,
  openCalcFile,
  importCalcText,
  closeDialog: closeModal,
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
