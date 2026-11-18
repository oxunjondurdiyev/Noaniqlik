/* ═══════════════════════════════════════════════════════════════
   SPECIAL/APP.JS — P10: "Maxsus rejimlar" yorlig'i kontrolleri (ES modul sifatida yuklanadi).
   To'rt rejim: namuna olish (dublikat usuli, ANOVA), sifatli test (2×2), mikrobiologiya (BETA),
   tibbiy laboratoriya (BETA). Hisob: src/engine (evaluate); natija — src/js/report.js::specialSection.
   CSP: inline skript yo'q — faqat addEventListener; innerHTML ga har qanday qiymat escHtml orqali.
   Global: window.UCSpecial.
═══════════════════════════════════════════════════════════════ */
import { evaluate } from '../../engine/index.js';
import * as Interp from '../../templates/interpreter.js';
import { defaults, buildSpec, MODES, MODE_OF } from './build.js';
import { modesHTML, formHTML, countHTML } from './view.js';

const STORE_KEY = 'uc_special_v1'; // faqat o'lchash / validatsiya ma'lumoti (shaxsiy ma'lumot yo'q)
const $ = id => document.getElementById(id);
const t = k => window.i18n.t(k);
const esc = v => window.escHtml(v);
const ctx = () => ({ t, esc });
const toast = (m, type = 'info', ms) => window.showToast && window.showToast(m, type, ms);

let state = defaults();
const last = {}; // rejim → natija
const lastSpec = {}; // rejim → dvigatelga berilgan kirish (P05b: JSON eksport)

function load() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) state = { ...defaults(), ...JSON.parse(raw) };
    if (!MODES.includes(state.mode)) state.mode = 'sampling';
  } catch (e) { state = defaults(); }
}
function save() {
  try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* xotira to'la yoki o'chirilgan */ }
}

function templateBanner() {
  const m = state.template;
  if (!m || MODE_OF[m.mode] !== state.mode) return '';
  const ok = m.status === 'APPROVED';
  return `<div class="tpl-banner ${ok ? 'tpl-banner-ok' : 'tpl-banner-warn'}" data-sp-template="${esc(m.id)}">
    <div class="tpl-banner-head"><strong>${esc(m.id)} v${esc(m.version)}</strong> — ${esc(Interp.tr(m.title, window.i18n.lang))}
      <span class="badge ${ok ? 'badge-green' : 'badge-orange'}">${esc(t('tpl_status_' + m.status))}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-sp-act="detach">×</button></div>
    ${ok ? '' : `<div class="tpl-demo" data-draft-warning="1">⚠ ${esc(t('tpl_banner_' + m.status))}</div>`}
    ${m.hint ? `<div class="text-sm">${esc(m.hint)}</div>` : ''}
    ${(m.openQuestionList || []).map(q => `<div class="text-xs text-muted">${esc(q.text)}</div>`).join('')}
  </div>`;
}

function resultHTML() {
  const r = last[state.mode];
  if (!r) return `<div class="empty-state"><p>${esc(t('sp_empty'))}</p></div>`;
  const meta = state.template && MODE_OF[state.template.mode] === state.mode ? state.template : null;
  const notice = meta && window.UCTemplates && !r.error ? window.UCTemplates.reportNoticeHTML(meta, r) : '';
  return `<h3 class="rg-card-title">${esc(t('sp_result_title'))}</h3>${notice}${window.Results.specialSection(r)}`;
}

function render() {
  const root = $('special-root');
  if (!root) return;
  root.innerHTML = `
    <div class="panel-header"><div>
      <h2 class="panel-title">${esc(t('sp_title'))}</h2>
      <p class="panel-sub text-muted">${esc(t('sp_sub'))}</p>
    </div></div>
    ${modesHTML(state, ctx())}
    ${templateBanner()}
    ${formHTML(state, ctx())}
    <div class="rg-actions">
      <button type="button" class="btn btn-primary" data-sp-act="calc" id="sp-btn-calc">${esc(t('td_calc'))}</button>
      <button type="button" class="btn btn-outline" data-sp-act="print" id="sp-btn-print">${esc(t('rg_print'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-sp-act="reset">${esc(t('td_reset'))}</button>
    </div>
    <div id="sp-result" class="rg-result" aria-live="polite">${resultHTML()}</div>`;
}

/** Laboratoriya sozlamasi: sifatli testlar ishonch intervali usuli (standart — Wilson; egasi qarori 2026-11-18, R-21) */
function labCiMethod() {
  const lab = window.UCTemplates && window.UCTemplates.labSettings ? window.UCTemplates.labSettings() : null;
  return lab && lab.ciMethod === 'clopper_pearson' ? 'clopper_pearson' : 'wilson';
}

function calculate() {
  const { spec, bad } = buildSpec(state);
  if (state.mode === 'qualitative') spec.settings = { ...(spec.settings || {}), ciMethod: labCiMethod() };
  const prefix = { sampling: 'sampling', qualitative: 'qualitative', micro: 'micro', medical: 'medical' }[state.mode];
  const result = bad.length ? { error: `${prefix}_bad_data`, detail: bad.map(b => t('sp_f_' + b)).join(', ') } : evaluate(spec);
  last[state.mode] = result;
  lastSpec[state.mode] = spec;
  const el = $('sp-result');
  if (el) { el.innerHTML = resultHTML(); if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  if (result.error) toast(`${t('err_' + result.error)}${result.detail ? ' — ' + result.detail : ''}`, 'error', 6000);
  return result;
}

function onInput(e) {
  const el = e.target, d = el.dataset || {};
  if (d.spFlag) { state[d.spFlag] = !!el.checked; save(); return; }
  const key = d.spField;
  if (!key) return;
  state[key] = el.value;
  save();
  const wrap = el.closest && el.closest('.td-paste');
  const cnt = wrap && wrap.querySelector('[data-sp-count-wrap]');
  if (cnt) cnt.innerHTML = countHTML(state, key, ctx());
}

function onClick(e) {
  const mode = e.target.closest('[data-sp-mode]');
  if (mode) { state.mode = mode.dataset.spMode; save(); render(); return; }
  const btn = e.target.closest('[data-sp-act]');
  if (!btn) return;
  const act = btn.dataset.spAct;
  if (act === 'calc') calculate();
  else if (act === 'print') {
    const r = last[state.mode] && !last[state.mode].error ? last[state.mode] : calculate();
    if (r && !r.error) window.Results.printSpecial(r, { meta: state.template && MODE_OF[state.template.mode] === state.mode ? state.template : null });
  } else if (act === 'reset') { const m = state.mode; state = { ...defaults(), mode: m }; delete last[m]; save(); render(); }
  else if (act === 'detach') { state.template = null; save(); render(); }
}

/* ─── Shablon (evaluationMode: SAMPLING | QUALITATIVE | MICROBIOLOGY | MEDICAL) ─── */
function loadTemplate(tpl, opts = {}) {
  const b = Interp.buildSpecialState(tpl, { lang: window.i18n.lang, ui: true });
  if (b.error) { toast(b.error, 'error'); return false; }
  state = { ...defaults(), ...b.state, template: b.meta };
  delete last[state.mode];
  save();
  render();
  if (!opts.silent) toast(`${t('td_tpl_loaded')}: ${Interp.tr(tpl.title, window.i18n.lang)}`, 'success');
  return true;
}

function bind() {
  const root = $('special-root');
  if (!root) return;
  load();
  render();
  root.addEventListener('input', onInput);
  root.addEventListener('change', onInput);
  root.addEventListener('click', onClick);
  document.addEventListener('langchange', render);
  // P05a: "asoslangan holda qabul qilish"
  if (window.UCFindings) window.UCFindings.register('special', () => { const r = last[state.mode]; return r && !r.error ? window.Results.findingsOf(r) : []; });
  document.addEventListener('findingschange', e => { if (e.detail && e.detail.scope === 'special') render(); });
}

window.UCSpecial = Object.freeze({
  current: () => last[state.mode] || null,
  currentSpec: () => (last[state.mode] ? lastSpec[state.mode] || null : null),
  getState: () => JSON.parse(JSON.stringify(state)),
  setState: s => { state = { ...defaults(), ...s }; save(); render(); },
  loadTemplate,
  calculate,
  buildSpec,
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
