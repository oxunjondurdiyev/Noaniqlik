/* ═══════════════════════════════════════════════════════════════
   TOPDOWN/APP.JS — P09: "Top-down" yorlig'i — usta (wizard) kontrolleri (ES modul sifatida yuklanadi).
   1-qadam: ma'lumot turi (QC qatori / dublikatlar / nazorat chegaralari / validatsiya hisoboti; CRM / PT / recovery);
   2-qadam: jadval kiritish yoki Excel'dan nusxalab qo'yish (o'nlik vergul qabul qilinadi);
   3-qadam: byudjet va natija — src/js/report.js::topdownSection (ISO/IEC 17025 §7.8.3.1 c) ko'rinishi).
   Hisob: src/engine (evaluate, format 'uc-topdown/1'). CSP: inline skript yo'q — faqat addEventListener;
   innerHTML ga har qanday qiymat escHtml orqali. Global: window.UCTopDown.
═══════════════════════════════════════════════════════════════ */
import { evaluate } from '../../engine/index.js';
import * as Interp from '../../templates/interpreter.js';
import { defaults, buildSpec, RW_SOURCES } from './build.js';
import { stepsHTML, step1HTML, step2HTML, navHTML, additionalHTML, countHTML } from './view.js';

const STORE_KEY = 'uc_topdown_v1'; // faqat sifat nazorati / validatsiya ma'lumoti (shaxsiy ma'lumot yo'q)
const $ = id => document.getElementById(id);
const t = k => window.i18n.t(k);
const esc = v => window.escHtml(v);
const ctx = () => ({ t, esc });
const toast = (m, type = 'info', ms) => window.showToast && window.showToast(m, type, ms);

let state = defaults();
let last = null; // { result }

function load() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) state = { ...defaults(), ...JSON.parse(raw) };
    if (!Array.isArray(state.rwSources)) state.rwSources = defaults().rwSources;
    if (!Array.isArray(state.additional)) state.additional = [];
    if (!Array.isArray(state.covers)) state.covers = [];
    if (![1, 2, 3].includes(state.step) || state.step === 3) state.step = 1; // natija saqlanmaydi — qayta hisoblanadi
  } catch (e) { state = defaults(); }
}
function save() {
  try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* xotira to'la yoki o'chirilgan */ }
}

function labSettings() {
  const lab = window.UCTemplates && window.UCTemplates.labSettings ? window.UCTemplates.labSettings() : null;
  return lab && lab.rounding ? { rounding: lab.rounding } : {};
}

function templateBanner() {
  const m = state.template;
  if (!m) return '';
  const ok = m.status === 'APPROVED';
  return `<div class="tpl-banner ${ok ? 'tpl-banner-ok' : 'tpl-banner-warn'}" data-td-template="${esc(m.id)}">
    <div class="tpl-banner-head"><strong>${esc(m.id)} v${esc(m.version)}</strong> — ${esc(Interp.tr(m.title, window.i18n.lang))}
      <span class="badge ${ok ? 'badge-green' : 'badge-orange'}">${esc(t('tpl_status_' + m.status))}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-td-act="detach">×</button></div>
    ${ok ? '' : `<div class="tpl-demo" data-draft-warning="1">⚠ ${esc(t('tpl_banner_' + m.status))}</div>`}
    ${m.hint ? `<div class="text-sm">${esc(m.hint)}</div>` : ''}
    ${m.linkedTemplate ? `<div class="text-sm" data-td-linked="${esc(m.linkedTemplate)}">${esc(t('td_linked_template'))}: <strong>${esc(m.linkedTemplate)}</strong></div>` : ''}
    ${m.regressionTemplate ? `<div class="text-sm" data-td-linked="${esc(m.regressionTemplate)}">${esc(t('td_regression_template'))}: <strong>${esc(m.regressionTemplate)}</strong></div>` : ''}
    ${(m.openQuestionList || []).map(q => `<div class="text-xs text-muted">${esc(q.text)}</div>`).join('')}
  </div>`;
}

function resultHTML() {
  if (!last) return `<div class="empty-state"><p>${esc(t('td_empty'))}</p></div>`;
  const r = last.result;
  const notice = state.template && window.UCTemplates && !r.error ? window.UCTemplates.reportNoticeHTML(state.template, r) : '';
  // Bo'lim mazmuni src/js/report.js da (i18n matnlari va escHtml bilan yig'iladi)
  return `<h3 class="rg-card-title">${esc(t('td_result_title'))}</h3>${notice}${window.Results.topdownSection(r)}`;
}

function render() {
  const root = $('topdown-root');
  if (!root) return;
  const body = state.step === 1 ? step1HTML(state, ctx()) : state.step === 2 ? step2HTML(state, ctx())
    : `<div id="td-result" class="rg-result" aria-live="polite">${resultHTML()}</div>`;
  root.innerHTML = `
    <div class="panel-header"><div>
      <h2 class="panel-title">${esc(t('td_title'))}</h2>
      <p class="panel-sub text-muted">${esc(t('td_sub'))}</p>
    </div></div>
    ${templateBanner()}
    ${stepsHTML(state, ctx())}
    ${body}
    ${navHTML(state, ctx())}`;
}

/* ─── Amallar ─── */
function calculate() {
  const { spec, bad } = buildSpec(state);
  if (labSettings().rounding) spec.settings = { ...(spec.settings || {}), ...labSettings() };
  const result = bad.length ? { error: 'topdown_bad_data', detail: bad.map(b => t('td_f_' + b)).join(', ') } : evaluate(spec);
  last = { result, spec };   // spec — P05b: JSON eksport (dvigatelga aynan berilgan kirish)
  state.step = 3;
  save();
  render();
  if (result.error) toast(`${t('err_' + result.error)}${result.detail ? ' — ' + result.detail : ''}`, 'error', 6000);
  else if (result.warnings.some(w => w.rule)) toast(t('td_lint_toast'), 'error', 6000);
  const el = $('td-result');
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return result;
}

/** Empirik kattalik + bias: "tayanch qiymat qaysi usul bilan olingan" savoli majburiy (egasi qarori 2026-11-17, R-20) */
function referenceUnanswered() {
  return state.empirical && state.basis === 'within' && state.bias !== 'none' && !state.refMethod;
}

function goto(step) {
  if (step > state.step && referenceUnanswered()) toast(t('td_ref_required'), 'error', 6000);
  if (step === 3) { calculate(); return; }
  state.step = step;
  save();
  render();
}

function onInput(e) {
  const el = e.target;
  const d = el.dataset || {};
  if (d.tdAdd !== undefined) { state.additional[+d.tdAdd][d.tdAddKey] = el.value; save(); return; }
  if (d.tdRw) {
    const set = new Set(state.rwSources);
    if (el.checked) set.add(d.tdRw); else set.delete(d.tdRw);
    state.rwSources = RW_SOURCES.filter(s => set.has(s));
    save(); return;
  }
  if (d.tdCover) {
    const set = new Set(state.covers);
    if (el.checked) set.add(d.tdCover); else set.delete(d.tdCover);
    state.covers = [...set];
    save(); return;
  }
  if (d.tdFlag) {
    state[d.tdFlag] = !!el.checked;
    save();
    if (d.tdFlag === 'empirical') render();
    return;
  }
  const key = d.tdField;
  if (!key) return;
  if (el.type === 'radio' && !el.checked) return;
  state[key] = el.value;
  save();
  if (e.type === 'change' && ['basis', 'bias', 'scale', 'refMethod'].includes(key)) render();
  const wrap = el.closest && el.closest('.td-paste');
  const cnt = wrap && wrap.querySelector('[data-td-count-wrap]');
  if (cnt) cnt.innerHTML = countHTML(state, key, ctx());
}

function onClick(e) {
  const del = e.target.closest('[data-td-add-del]');
  if (del) { state.additional.splice(+del.dataset.tdAddDel, 1); save(); redrawAdditional(); return; }
  const stepBtn = e.target.closest('[data-td-step]');
  if (stepBtn) { goto(+stepBtn.dataset.tdStep); return; }
  const btn = e.target.closest('[data-td-act]');
  if (!btn) return;
  const act = btn.dataset.tdAct;
  if (act === 'next') goto(state.step + 1);
  else if (act === 'back') goto(state.step - 1);
  else if (act === 'add-row') { state.additional.push({ name: '', category: 'other', u: '' }); save(); redrawAdditional(); }
  else if (act === 'reset') { const tpl = state.template; state = { ...defaults(), template: null }; last = null; save(); render(); if (tpl) toast(t('td_reset_done'), 'info'); }
  else if (act === 'detach') { state.template = null; save(); render(); }
  else if (act === 'print') {
    if (!last || last.result.error) calculate();
    if (last && !last.result.error) window.Results.printTopdown(last.result, { meta: state.template });
  }
}

function redrawAdditional() {
  const wrap = $('td-add-wrap');
  if (wrap) wrap.innerHTML = additionalHTML(state, ctx());
}

/* ─── Shablon (evaluationMode: TOP_DOWN) ─── */
function loadTemplate(tpl, opts = {}) {
  const b = Interp.buildTopDownState(tpl, { lang: window.i18n.lang, ui: true });
  if (b.error) { toast(b.error, 'error'); return false; }
  state = { ...defaults(), ...b.state, template: b.meta };
  last = null;
  save();
  render();
  if (!opts.silent) toast(`${t('td_tpl_loaded')}: ${Interp.tr(tpl.title, window.i18n.lang)}`, 'success');
  return true;
}

function bind() {
  const root = $('topdown-root');
  if (!root) return;
  load();
  render();
  root.addEventListener('input', onInput);
  root.addEventListener('change', onInput);
  root.addEventListener('click', onClick);
  document.addEventListener('langchange', render);
  // P05a: "asoslangan holda qabul qilish" — topilmalar ro'yxati va qabul qilingandan keyin qayta chizish
  if (window.UCFindings) window.UCFindings.register('topdown', () => (last && last.result && !last.result.error ? window.Results.findingsOf(last.result) : []));
  document.addEventListener('findingschange', e => { if (e.detail && e.detail.scope === 'topdown') render(); });
}

window.UCTopDown = Object.freeze({
  current: () => last,
  getState: () => JSON.parse(JSON.stringify(state)),
  setState: s => { state = { ...defaults(), ...s }; last = null; save(); render(); },
  loadTemplate,
  calculate,
  buildSpec,
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
