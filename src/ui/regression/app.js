/* ═══════════════════════════════════════════════════════════════
   REGRESSION/APP.JS — P08: "Regressiya" yorlig'i kontrolleri (ES modul sifatida yuklanadi).
   • (x, u(x), y, u(y)) jadvali, Excel'dan qo'yish (paste), o'nlik vergul;
   • usul (OLS/WLS/WTLS/GLS), model darajasi, tayanch nuqta, kovariatsiya asosi;
   • teskari va to'g'ri bashorat, "U — diapazon";
   • natija: src/js/report.js dagi regressiya bo'limi + SVG grafiklar (view.js).
   Hisob: src/engine (evaluate, format 'uc-regression/1'). CSP: inline skript yo'q — faqat
   addEventListener; innerHTML ga har qanday qiymat escHtml orqali.
   Global: window.UCRegression (report.js va shablonlar UI uchun).
═══════════════════════════════════════════════════════════════ */
import { evaluate } from '../../engine/index.js';
import * as Interp from '../../templates/interpreter.js';
import { COLUMNS, parseNumber, parseGrid, gridToRows, parseList, parseMatrix, parsePairs, rowsToPoints } from './parse.js';
import { tableHTML, plotsHTML } from './view.js';

const STORE_KEY = 'uc_regression_v1'; // faqat kalibrlash ma'lumoti (shaxsiy ma'lumot yo'q)
const MIN_ROWS = 6;
const $ = id => document.getElementById(id);
const t = k => window.i18n.t(k);
const esc = v => window.escHtml(v);
const ctx = () => ({ t, esc });
const toast = (m, type = 'info', ms) => window.showToast && window.showToast(m, type, ms);
const blankRow = () => ({ x: '', ux: '', y: '', uy: '' });

function defaults() {
  return {
    method: 'OLS', degree: 1, xRef: '', sigma: 'auto', unitX: '', unitY: '',
    rows: Array.from({ length: MIN_ROWS }, blankRow), covY: '',
    y0: '', uy0: '', predictX: '', urPoints: '', urMode: 'linear',
    template: null,
  };
}

let state = defaults();
let last = null; // { result, plots }

function load() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) state = { ...defaults(), ...JSON.parse(raw) };
    if (!Array.isArray(state.rows) || !state.rows.length) state.rows = defaults().rows;
  } catch (e) { state = defaults(); }
}
function save() {
  try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* xotira to'la yoki o'chirilgan */ }
}

/* ─── Kirish holati → modelSpec ─── */
export function buildSpec(st) {
  const bad = [];
  const list = (text, name) => {
    const v = parseList(text);
    if (v.some(n => n === null || Number.isNaN(n))) bad.push(name);
    return v.filter(n => n !== null && !Number.isNaN(n));
  };
  const points = rowsToPoints(st.rows);
  const y0 = list(st.y0, 'y₀');
  const uy0 = parseNumber(st.uy0);
  if (Number.isNaN(uy0)) bad.push('u(y₀)');
  const xRef = parseNumber(st.xRef);
  if (Number.isNaN(xRef)) bad.push('x₀');
  const spec = {
    format: 'uc-regression/1',
    method: st.method,
    model: { degree: Number(st.degree) || 1, ...(xRef !== null && !Number.isNaN(xRef) ? { xRef } : {}) },
    units: { x: st.unitX || '', y: st.unitY || '' },
    points,
    settings: { ...(st.sigma && st.sigma !== 'auto' ? { sigma: st.sigma } : {}), ...labSettings() },
    predict: list(st.predictX, 'x').map(x => ({ x })),
    inverse: y0.length ? [{ y0, ...(uy0 !== null && !Number.isNaN(uy0) ? { uy0 } : {}) }] : [],
  };
  if (st.method === 'GLS') spec.covY = parseMatrix(st.covY);
  const ur = parsePairs(st.urPoints);
  if (ur.length) spec.uRange = { points: ur, mode: st.urMode };
  return { spec, bad };
}

function labSettings() {
  const lab = window.UCTemplates && window.UCTemplates.labSettings ? window.UCTemplates.labSettings() : null;
  if (!lab) return {};
  return { ...(lab.P ? { P: Number(lab.P) } : {}), ...(lab.nuRule ? { nuRule: lab.nuRule } : {}) };
}

/* ─── Ko'rinish ─── */
function option(value, label, cur) {
  return `<option value="${esc(value)}"${String(cur) === String(value) ? ' selected' : ''}>${esc(label)}</option>`;
}
function field(id, labelKey, inner) {
  return `<label class="rg-field" for="${id}"><span>${esc(t(labelKey))}</span>${inner}</label>`;
}
function textInput(id, key, ph) {
  return `<input type="text" id="${id}" data-rg-field="${key}" value="${esc(state[key] ?? '')}" placeholder="${esc(ph || '')}" autocomplete="off" />`;
}

function templateBanner() {
  const m = state.template;
  if (!m) return '';
  const cls = m.status === 'APPROVED' ? 'tpl-banner-ok' : 'tpl-banner-warn';
  return `<div class="tpl-banner ${cls}" data-rg-template="${esc(m.id)}">
    <div class="tpl-banner-head"><strong>${esc(m.id)} v${esc(m.version)}</strong> — ${esc(Interp.tr(m.title, window.i18n.lang))}
      <span class="badge ${m.status === 'APPROVED' ? 'badge-green' : 'badge-orange'}">${esc(t('tpl_status_' + m.status))}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-rg-act="detach">×</button></div>
    ${m.status !== 'APPROVED' ? `<div class="tpl-demo" data-draft-warning="1">⚠ ${esc(t('tpl_banner_' + m.status))}</div>` : ''}
    ${m.demo ? `<div class="tpl-demo" data-demo-warning="1">⚠ ${esc(t('tpl_banner_demo'))}${m.demoNote ? ' — ' + esc(m.demoNote) : ''}</div>` : ''}
    ${m.hint ? `<div class="text-sm">${esc(m.hint)}</div>` : ''}
    ${(m.openQuestionList || []).map(q => `<div class="text-xs text-muted">${esc(q.text)}</div>`).join('')}
  </div>`;
}

function render() {
  const root = $('regression-root');
  if (!root) return;
  const methods = (state.template && state.template.allowedMethods) || ['OLS', 'WLS', 'WTLS', 'GLS'];
  root.innerHTML = `
    <div class="panel-header"><div>
      <h2 class="panel-title">${esc(t('rg_title'))}</h2>
      <p class="panel-sub text-muted">${esc(t('rg_sub'))}</p>
    </div></div>
    ${templateBanner()}
    <div class="card rg-card">
      <div class="settings-grid">
        ${field('rg-method', 'rg_method', `<select id="rg-method" data-rg-field="method">${methods.map(m => option(m, t('rg_m_' + m), state.method)).join('')}</select>`)}
        ${field('rg-degree', 'rg_degree', `<select id="rg-degree" data-rg-field="degree">${[1, 2, 3].map(d => option(d, t('rg_deg_' + d), state.degree)).join('')}</select>`)}
        ${field('rg-sigma', 'rg_sigma', `<select id="rg-sigma" data-rg-field="sigma">${['auto', 'prior', 'posterior'].map(s => option(s, t('rg_sigma_' + s), state.sigma)).join('')}</select>`)}
        ${field('rg-xref', 'rg_xref', textInput('rg-xref', 'xRef'))}
        ${field('rg-unit-x', 'rg_unit_x', textInput('rg-unit-x', 'unitX'))}
        ${field('rg-unit-y', 'rg_unit_y', textInput('rg-unit-y', 'unitY'))}
      </div>
    </div>
    <div class="card rg-card">
      <h3 class="rg-card-title">${esc(t('rg_table_title'))}</h3>
      <p class="text-muted text-sm">${esc(t('rg_table_hint'))}</p>
      <div class="table-scroll" id="rg-table-wrap">${tableHTML(state.rows, ctx())}</div>
      <div class="rg-actions">
        <button type="button" class="btn btn-outline btn-sm" data-rg-act="add">${esc(t('rg_add_row'))}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-rg-act="clear">${esc(t('rg_clear'))}</button>
      </div>
      <div class="rg-gls${state.method === 'GLS' ? '' : ' hidden'}" id="rg-gls">
        <label class="rg-field" for="rg-covy"><span>${esc(t('rg_covy'))}</span>
          <textarea id="rg-covy" data-rg-field="covY" rows="5" spellcheck="false">${esc(state.covY)}</textarea></label>
      </div>
    </div>
    <div class="card rg-card">
      <h3 class="rg-card-title">${esc(t('rg_inverse_title'))}</h3>
      <p class="text-muted text-sm">${esc((state.template && state.template.inverseHint) || t('rg_inverse_hint'))}</p>
      <div class="settings-grid">
        ${field('rg-y0', 'rg_y0', textInput('rg-y0', 'y0'))}
        ${field('rg-uy0', 'rg_uy0', textInput('rg-uy0', 'uy0'))}
      </div>
      <h3 class="rg-card-title">${esc(t('rg_predict_title'))}</h3>
      <div class="settings-grid">${field('rg-predict', 'rg_predict_x', textInput('rg-predict', 'predictX'))}</div>
    </div>
    <details class="card rg-card"${state.urPoints ? ' open' : ''}>
      <summary class="rg-card-title">${esc(t('rg_urange_title'))} <span class="badge badge-orange">unverified</span></summary>
      <p class="text-muted text-sm">${esc(t('rg_urange_hint'))} ${esc(t('rg_urange_unverified'))}</p>
      <div class="settings-grid">
        <label class="rg-field" for="rg-ur-points"><span>${esc(t('rg_urange_points'))}</span>
          <textarea id="rg-ur-points" data-rg-field="urPoints" rows="5" spellcheck="false">${esc(state.urPoints)}</textarea></label>
        ${field('rg-ur-mode', 'rg_urange_mode', `<select id="rg-ur-mode" data-rg-field="urMode">${['linear', 'max'].map(m => option(m, t('rg_urange_' + m), state.urMode)).join('')}</select>`)}
      </div>
    </details>
    <div class="rg-actions">
      <button type="button" class="btn btn-primary" data-rg-act="calc" id="rg-btn-calc">${esc(t('rg_calc'))}</button>
      <button type="button" class="btn btn-outline" data-rg-act="print" id="rg-btn-print">${esc(t('rg_print'))}</button>
    </div>
    <div id="rg-result" class="rg-result" aria-live="polite"></div>`;
  renderResult();
}

function renderResult() {
  const el = $('rg-result');
  if (!el) return;
  if (!last) { el.innerHTML = `<div class="empty-state"><p>${esc(t('rg_empty'))}</p></div>`; return; }
  const r = last.result;
  const notice = state.template && window.UCTemplates && !r.error ? window.UCTemplates.reportNoticeHTML(state.template, r) : '';
  // Bo'lim mazmuni src/js/report.js da (i18n matnlari va escHtml bilan yig'iladi)
  el.innerHTML = `<h3 class="rg-card-title">${esc(t('rg_result_title'))}</h3>${notice}` +
    window.Results.regressionSection(r, { plots: last.plots, residualTable: true });
}

/* ─── Amallar ─── */
function calculate() {
  const { spec, bad } = buildSpec(state);
  let result;
  if (bad.length) result = { error: 'regression_bad_data', detail: bad.join(', ') };
  else if (!spec.points.length && state.template) result = { error: 'regression_too_few_points', detail: t('tpl_missing_regression_points') };
  else result = evaluate(spec);
  last = { result, plots: result.error ? '' : plotsHTML(result, ctx()) };
  renderResult();
  if (result.error) toast(`${t('err_' + result.error)}${result.detail ? ' — ' + result.detail : ''}`, 'error', 5000);
  else if (result.warnings.some(w => w.code === 'regression_chi2_fail')) toast(t('rg_chi2_fail'), 'error', 6000);
  const el = $('rg-result');
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function redrawTable() {
  const wrap = $('rg-table-wrap');
  if (wrap) wrap.innerHTML = tableHTML(state.rows, ctx());
}

function onInput(e) {
  const el = e.target;
  if (el.classList && el.classList.contains('rg-cell')) {
    state.rows[+el.dataset.rgRow][el.dataset.rgCol] = el.value;
    if (state.template && state.template.demo) { state.template = { ...state.template, demo: false }; } // foydalanuvchi o'z ma'lumotini kiritdi
    save();
    return;
  }
  const key = el.dataset && el.dataset.rgField;
  if (!key) return;
  state[key] = key === 'degree' ? Number(el.value) : el.value;
  save();
  if (key === 'method') { const g = $('rg-gls'); if (g) g.classList.toggle('hidden', state.method !== 'GLS'); }
}

function onPaste(e) {
  const el = e.target;
  if (!el.classList || !el.classList.contains('rg-cell')) return;
  const text = (e.clipboardData || window.clipboardData).getData('text');
  const grid = parseGrid(text);
  if (grid.length <= 1 && (grid[0] || []).length <= 1) return; // bitta katak — odatiy qo'yish
  e.preventDefault();
  const { rows } = gridToRows(grid, COLUMNS.indexOf(el.dataset.rgCol));
  if (!rows.length) { toast(t('rg_paste_bad'), 'error'); return; }
  const start = +el.dataset.rgRow;
  rows.forEach((r, i) => {
    while (state.rows.length <= start + i) state.rows.push(blankRow());
    state.rows[start + i] = { ...state.rows[start + i], ...r };
  });
  if (state.template && state.template.demo) state.template = { ...state.template, demo: false };
  save();
  redrawTable();
  toast(t('rg_pasted').replace('{n}', rows.length), 'success');
}

function onClick(e) {
  const del = e.target.closest('[data-rg-del]');
  if (del) {
    state.rows.splice(+del.dataset.rgDel, 1);
    while (state.rows.length < 3) state.rows.push(blankRow());
    save(); redrawTable();
    return;
  }
  const btn = e.target.closest('[data-rg-act]');
  if (!btn) return;
  const act = btn.dataset.rgAct;
  if (act === 'add') { state.rows.push(blankRow()); save(); redrawTable(); }
  else if (act === 'clear') { state.rows = Array.from({ length: MIN_ROWS }, blankRow); last = null; save(); redrawTable(); renderResult(); }
  else if (act === 'calc') calculate();
  else if (act === 'print') {
    if (!last || last.result.error) calculate();
    if (last && !last.result.error) window.Results.printRegression(last.result, { plots: last.plots, meta: state.template });
  } else if (act === 'detach') { state.template = null; save(); render(); }
}

/* ─── Shablon (evaluationMode: REGRESSION) ─── */
function loadTemplate(tpl, opts = {}) {
  const b = Interp.buildRegressionSpec(tpl, { useSample: true }, { lang: window.i18n.lang, ui: true, allowMissing: true });
  if (b.error) { toast(b.error, 'error'); return false; }
  const rg = tpl.regression;
  const rows = b.spec.points.map(p => ({ x: String(p.x ?? ''), ux: p.ux === undefined || p.ux === null ? '' : String(p.ux), y: String(p.y ?? ''), uy: p.uy === undefined || p.uy === null ? '' : String(p.uy) }));
  while (rows.length < MIN_ROWS) rows.push(blankRow());
  state = {
    ...defaults(),
    method: rg.method, degree: rg.degree, xRef: rg.xRef === null || rg.xRef === undefined ? '' : String(rg.xRef),
    sigma: rg.sigma || 'auto', unitX: b.spec.units.x, unitY: b.spec.units.y, rows,
    y0: b.spec.inverse.length ? [].concat(b.spec.inverse[0].y0).join(' ') : '',
    template: { ...b.meta, allowedMethods: rg.allowedMethods || null },
  };
  last = null;
  save();
  render();
  if (!opts.silent) toast(`${t('rg_tpl_loaded')}: ${Interp.tr(tpl.title, window.i18n.lang)}`, 'success');
  return true;
}

function bind() {
  const root = $('regression-root');
  if (!root) return;
  load();
  render();
  root.addEventListener('input', onInput);
  root.addEventListener('change', onInput);
  root.addEventListener('paste', onPaste);
  root.addEventListener('click', onClick);
  document.addEventListener('langchange', () => {
    if (last && !last.result.error) last.plots = plotsHTML(last.result, ctx());
    render();
  });
  // P05a: "asoslangan holda qabul qilish"
  if (window.UCFindings) window.UCFindings.register('regression', () => (last && last.result && !last.result.error ? window.Results.findingsOf(last.result) : []));
  document.addEventListener('findingschange', e => { if (e.detail && e.detail.scope === 'regression') renderResult(); });
}

window.UCRegression = Object.freeze({
  current: () => last,
  getState: () => JSON.parse(JSON.stringify(state)),
  loadTemplate,
  calculate,
  buildSpec,
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
