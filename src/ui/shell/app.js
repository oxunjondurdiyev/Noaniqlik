/* ═══════════════════════════════════════════════════════════════
   SHELL/APP.JS — P16 (Interfeys 2.0): ilova qobig'ining DOM ulanishi.
   Chap menyu, stepper, joylashuv yo'li, profil menyusi, pastki navigatsiya, asosiy amal tugmasi, buyruq qidiruvi
   (Ctrl+K). Yangi holat mashinasi yo'q: hamma o'tishlar mavjud `window.switchTab` va modullar API'si orqali;
   holat `tabchange` hodisasi (src/js/app.js) va appState dan o'qiladi. Matnlar faqat i18n + textContent.
   CSP: inline skript / uslub atributi yo'q (ko'rinish — sinflar va `hidden`).
═══════════════════════════════════════════════════════════════ */
import { NAV, STEPS, WORKFLOW_TABS, activeNav, activeStep, stepStates, search, moveIndex } from './model.js';

const $ = id => document.getElementById(id);
const t = k => (window.i18n ? window.i18n.t(k) : k);
const state = () => (window.appState ? window.appState.get() : {});

let tab = 'data';        // joriy yorliq
let labTab = 'standards';
let lastNav = 'gum';
let lastStep = 'model';

/* ─── O'tishlar ─── */
function reveal(selector) {
  if (!selector) return;
  const panel = document.querySelector('.tab-panel.active');
  const el = panel && panel.querySelector(selector);
  if (!el) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (el.scrollIntoView) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}
function go(navKey) {
  const item = NAV.find(n => n.key === navKey);
  if (!item) return;
  lastNav = item.key;
  if (item.lab) { labTab = item.lab; if (window.UCLab) window.UCLab.setTab(item.lab); }
  window.switchTab(item.tab);
  reveal(item.focus);
}
function goStep(stepKey) {
  const step = STEPS.find(s => s.key === stepKey);
  if (!step) return;
  lastStep = step.key;
  lastNav = 'gum';
  window.switchTab(step.tab);
  reveal(step.focus);
}

/* ─── Chizish ─── */
function renderNav() {
  const cur = activeNav(tab, labTab, lastNav);
  document.querySelectorAll('[data-nav]').forEach(b => {
    const on = b.dataset.nav === cur;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-bnav]').forEach(b => {
    const on = b.dataset.bnav === tab || (b.dataset.bnav === 'data' && tab === 'typeb') || (b.dataset.bnav === 'results' && tab === 'report');
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  const item = NAV.find(n => n.key === cur);
  const sec = $('crumb-section');
  if (sec) sec.textContent = item ? t(item.labelKey) : '';
}
function renderCrumbId() {
  const el = $('crumb-calc');
  if (!el) return;
  const st = state();
  const id = (st.calcMeta && st.calcMeta.id) || (st.template && st.template.id) || '';
  el.textContent = id || t('sh_crumb_none');
  el.classList.toggle('crumb-empty', !id);
}
function renderStepper() {
  const box = $('stepper');
  if (!box) return;
  const cur = activeStep(tab, lastStep);
  box.hidden = !WORKFLOW_TABS.includes(tab);
  const states = stepStates(state(), cur);
  box.querySelectorAll('[data-step]').forEach(b => {
    const s = states.find(x => x.key === b.dataset.step);
    b.classList.toggle('done', s.done);
    b.classList.toggle('current', s.current);
    if (s.current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    const mark = b.querySelector('.step-mark');
    if (mark) mark.dataset.state = s.done ? 'done' : s.current ? 'current' : 'todo';
    b.title = s.done ? t('sh_step_done') : s.current ? t('sh_step_current') : '';
    if (s.current && b.scrollIntoView && box.scrollWidth > box.clientWidth) b.scrollIntoView({ block: 'nearest', inline: 'center' });
  });
}
/** Bosh barmoq zonasidagi asosiy amal: joriy qadamning mavjud tugmasini bosadi (mantiq takrorlanmaydi). */
const FAB = { data: ['sh_fab_calc_a', 'btn-calc-typea'], typeb: ['sh_fab_calc_c', 'btn-calc-combined'], results: ['btn_report', null] };
function renderFab() {
  const fab = $('fab-primary');
  if (!fab) return;
  const cfg = FAB[tab];
  fab.hidden = !cfg;
  if (cfg) $('fab-label').textContent = t(cfg[0]);
}
function renderBuild() {
  const el = $('nav-build');
  if (!el) return;
  const v = window.Calc ? window.Calc.ENGINE_VERSION : '';
  const fill = (key, b) => t(key).replace('{v}', v).replace('{b}', b || '');
  el.textContent = fill('sh_build_local');
  if (window.UCBuild) window.UCBuild.info().then(b => { if (b && b.shortSha) el.textContent = fill('sh_build', b.shortSha); }).catch(() => {});
}
function renderAll() { renderNav(); renderCrumbId(); renderStepper(); renderFab(); }

/* ─── Profil menyusi ─── */
function setProfile(open) {
  const menu = $('profile-menu'), btn = $('btn-profile');
  if (!menu || !btn) return;
  menu.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  if (open) { const first = menu.querySelector('a:not([hidden]), button:not([hidden])'); if (first) first.focus(); }
}

/* ─── Buyruq qidiruvi ─── */
let items = [];        // { id, kind, label, hint, run }
let shown = [];
let index = 0;
let opener = null;

function click(id) { const el = $(id); if (el) el.click(); }
function baseItems() {
  const sec = NAV.map(n => ({ id: 'nav:' + n.key, kind: 'section', label: t(n.labelKey), run: () => go(n.key) }));
  const steps = STEPS.map(s => ({ id: 'step:' + s.key, kind: 'section', label: t('sh_n_gum') + ' — ' + t(s.labelKey), run: () => goStep(s.key) }));
  const act = [
    ['sh_a_calc_a', () => { goStep('typea'); click('btn-calc-typea'); }],
    ['sh_a_calc_c', () => { goStep('typeb'); click('btn-calc-combined'); }],
    ['btn_report', () => goStep('report')],
    ['sh_a_templates', () => window.UCTemplates && window.UCTemplates.openCatalog()],
    ['sh_a_labsettings', () => { const b = document.querySelector('[data-open-lab]'); if (b) b.click(); }],
    ['sh_a_data', () => { const b = document.querySelector('[data-open-data]'); if (b) b.click(); }],
    ['sh_a_session', () => { goStep('model'); const sb = $('sidebar'); if (sb && sb.classList.contains('collapsed')) click('btn-sidebar-toggle'); }],
    ['sh_a_theme', () => click('btn-theme')],
    ['btn_new', () => click('btn-reset')],
  ].map(([key, run]) => ({ id: 'act:' + key, kind: 'action', label: t(key), run }));
  return [...sec, ...steps, ...act];
}
function titleOf(title) {
  if (title && typeof title === 'object') { const lang = window.i18n ? window.i18n.lang : 'en'; return title[lang] || title.en || title.uz || Object.values(title)[0] || ''; }
  return String(title || '');
}
async function loadTemplates() {
  if (!window.UCTemplates || !window.UCTemplates.list) return;
  try {
    const list = await window.UCTemplates.list();
    const tpl = list.map(x => ({ id: 'tpl:' + x.key, kind: 'template', label: titleOf(x.title), hint: [x.id, x.standard, x.status].filter(Boolean).join(' · '), run: () => window.UCTemplates.use(x.key) }));
    items = [...items.filter(i => i.kind !== 'template'), ...tpl];
    if (!$('cmdk').hidden) renderList();
  } catch (_) { /* katalog yuklanmadi — bo'lim va amallar bilan ishlaydi */ }
}
function renderList() {
  const list = $('cmdk-list'), input = $('cmdk-input');
  shown = search(items, input.value);
  index = Math.min(index, Math.max(0, shown.length - 1));
  list.textContent = '';
  shown.forEach((it, i) => {
    const li = document.createElement('li');
    li.className = 'cmdk-item' + (i === index ? ' active' : '');
    li.id = 'cmdk-opt-' + i;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === index));
    li.dataset.index = String(i);
    const kind = document.createElement('span');
    kind.className = 'cmdk-kind cmdk-kind-' + it.kind;
    kind.textContent = t('sh_k_' + it.kind);
    const label = document.createElement('span');
    label.className = 'cmdk-label';
    label.textContent = it.label;
    li.append(kind, label);
    if (it.hint) { const hint = document.createElement('span'); hint.className = 'cmdk-hint mono'; hint.textContent = it.hint; li.append(hint); }
    list.append(li);
  });
  $('cmdk-empty').hidden = shown.length > 0;
  if (shown.length) input.setAttribute('aria-activedescendant', 'cmdk-opt-' + index); else input.removeAttribute('aria-activedescendant');
  const active = list.querySelector('.active');
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
}
function openCmdk() {
  const box = $('cmdk');
  if (!box || !box.hidden) return;
  opener = document.activeElement;
  items = baseItems();
  index = 0;
  box.hidden = false;
  const input = $('cmdk-input');
  input.value = '';
  renderList();
  input.focus();
  loadTemplates();
}
function closeCmdk() {
  const box = $('cmdk');
  if (!box || box.hidden) return;
  box.hidden = true;
  if (opener && opener.focus) opener.focus();
  opener = null;
}
function runItem(i) {
  const it = shown[i];
  if (!it) return;
  closeCmdk();
  it.run();
}

/* ─── Ulash ─── */
function bind() {
  if (!$('app')) return;
  document.addEventListener('tabchange', e => { tab = e.detail.tab; renderAll(); if (tab === 'vizlab') openVizlab(); });
  document.addEventListener('langchange', () => { renderAll(); renderBuild(); });
  if (window.appState) window.appState.subscribe(() => { renderStepper(); renderCrumbId(); });

  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { go(nav.dataset.nav); return; }
    const step = e.target.closest('[data-step]');
    if (step) { goStep(step.dataset.step); return; }
    const lb = e.target.closest('[data-lb-tab]');
    if (lb) { labTab = lb.dataset.lbTab; lastNav = 'lab-' + labTab; renderNav(); }
    const b = e.target.closest('[data-bnav]');
    if (b) {
      if (b.dataset.bnav === 'profile') { setProfile($('profile-menu').hidden); return; }
      if (b.dataset.bnav === 'lab') go(activeNav('lab', labTab, 'lab-' + labTab)); else goStep(b.dataset.bnav === 'data' ? 'typea' : 'results');
      return;
    }
    if (e.target.closest('#btn-profile')) { setProfile($('profile-menu').hidden); return; }
    if (!e.target.closest('#profile-menu')) setProfile(false); else if (e.target.closest('.menu-item')) setProfile(false);
    if (e.target.closest('[data-cmdk-close]')) closeCmdk();
    const opt = e.target.closest('.cmdk-item');
    if (opt) runItem(Number(opt.dataset.index));
  });
  const trigger = $('btn-cmdk');
  if (trigger) trigger.addEventListener('click', openCmdk);
  const fab = $('fab-primary');
  if (fab) fab.addEventListener('click', () => { const cfg = FAB[tab]; if (!cfg) return; if (cfg[1]) click(cfg[1]); else goStep('report'); });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      if ($('app').classList.contains('hidden')) return;
      e.preventDefault();
      if ($('cmdk').hidden) openCmdk(); else closeCmdk();
      return;
    }
    if (e.key === 'Escape') { if (!$('cmdk').hidden) { e.preventDefault(); closeCmdk(); } else if (!$('profile-menu').hidden) { setProfile(false); $('btn-profile').focus(); } }
  });
  const input = $('cmdk-input');
  if (input) {
    input.addEventListener('input', () => { index = 0; renderList(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); index = moveIndex(index, e.key === 'ArrowDown' ? 1 : -1, shown.length); renderList(); }
      else if (e.key === 'Home') { e.preventDefault(); index = 0; renderList(); }
      else if (e.key === 'End') { e.preventDefault(); index = Math.max(0, shown.length - 1); renderList(); }
      else if (e.key === 'Enter') { e.preventDefault(); runItem(index); }
      else if (e.key === 'Tab') { e.preventDefault(); }          // dialog ichida fokus kiritish maydonida qoladi
    });
  }
  renderAll();
  renderBuild();
}

/* Vizual laboratoriya — birinchi ochilganda yuklanadi (asosiy sahifa yukini oshirmaydi) */
let vizlab = null;
function openVizlab() {
  const root = $('vizlab-root');
  if (!root) return;
  if (!vizlab) vizlab = import('../vizlab/app.js').then(m => m.mount(root)).catch(() => { vizlab = null; });
}

window.UCShell = Object.freeze({ go, goStep, openSearch: openCmdk, closeSearch: closeCmdk });

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
