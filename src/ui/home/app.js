/* ═══════════════════════════════════════════════════════════════
   HOME/APP.JS — "Bosh sahifa" (#dash-screen): yangi hisob / shablondan boshlash, so'nggi sessiyalar (IndexedDB),
   tezkor havolalar, pastda ENGINE_VERSION va shablonlar validatsiyasi xulosasi (templates/validation/builtin.json).
   Hech narsa hisoblamaydi. Foydalanuvchi ma'lumoti DOM ga faqat textContent / escHtml orqali.
═══════════════════════════════════════════════════════════════ */
import { recentSessions, sessionTitle, shortTime, sessionPatch, landingStats, resumeInfo } from './model.js';
import { DIVISORS, LINTER_MODES } from '../../engine/index.js';

const $ = id => document.getElementById(id);
const t = k => window.i18n.t(k);
const esc = s => window.escHtml(s);
const toast = (m, type = 'info', ms) => window.showToast && window.showToast(m, type, ms);
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] === undefined ? m : o[k]));
const T = () => window.UCTemplates;

let confirmId = null;     // o'chirishni tasdiqlash kutilayotgan yozuv

function rowHTML(r) {
  const meta = [r.template, r.n !== null ? `n = ${r.n}` : '', shortTime(r.createdAt), r.engineVersion ? 'ENGINE ' + r.engineVersion : ''].filter(Boolean);
  const del = confirmId === r.id
    ? `<button type="button" class="btn btn-danger btn-sm" data-home-del-yes="${esc(r.id)}">${esc(t('hm_del_yes'))}</button><button type="button" class="btn btn-ghost btn-sm" data-home-del-no="1">${esc(t('hm_del_no'))}</button>`
    : `<button type="button" class="btn btn-ghost btn-sm" data-home-del="${esc(r.id)}">${esc(t('hm_delete'))}</button>`;
  return `<li class="home-session" data-home-session="${esc(r.id)}">
    <div class="home-session-main">
      <span class="home-session-title mono" translate="no">${esc(sessionTitle(r))}</span>${r.copy ? ` <span class="badge badge-orange">${esc(t('hm_copy_badge'))}</span>` : ''}
      <span class="home-session-meta text-xs text-muted" translate="no">${meta.map(esc).join(' · ')}</span>
    </div>
    <div class="home-session-actions">
      <button type="button" class="btn btn-outline btn-sm" data-home-open="${esc(r.id)}">${esc(t('hm_open'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-home-copy="${esc(r.id)}">${esc(t('hm_copy'))}</button>
      ${del}
    </div>
  </li>`;
}

async function renderSessions() {
  const box = $('home-sessions');
  if (!box || !T()) return;
  let rows = [];
  try { rows = recentSessions(await T().listCalculations()); } catch (_) { rows = []; }
  box.innerHTML = rows.length ? `<ul class="home-session-list">${rows.map(rowHTML).join('')}</ul>` : `<p class="text-muted home-empty">${esc(t('hm_recent_empty'))}</p>`;
}

function renderFoot() {
  const el = $('home-foot');
  if (!el || !T()) return;
  const v = T().validationSummary();
  el.innerHTML = `<span translate="no" data-home-engine="1">${esc(fill(t('hm_engine'), { v: v.engineVersion }))}</span><span data-home-validation="1">${esc(fill(t('hm_valid'), { v: v.verified, n: v.total }))}</span>`;
}

/* "Davom ettirish: <model>, <sana>" — brauzerda saqlangan joriy hisob (birinchi karta); "O'chirish" — ikki bosqichli tasdiq bilan */
let resumeConfirm = false;
function renderResume() {
  const box = $('home-resume');
  if (!box || !window.appState) return;
  // P22-1: bo'sh yangi hisob (faqat `x` parametri, kiritilmagan) — davom ettirish kartasi chiqmaydi (src/ui/flow/model.js::hasSession)
  const st = window.appState.get();
  const info = window.UCFlow && !window.UCFlow.hasSession(st) ? null : resumeInfo(st);
  box.hidden = !info;
  if (!info) { box.innerHTML = ''; resumeConfirm = false; return; }
  const del = resumeConfirm
    ? `<button type="button" class="btn btn-danger btn-sm" data-home-resume-del-yes="1">${esc(t('hm_del_yes'))}</button><button type="button" class="btn btn-ghost btn-sm" data-home-resume-del-no="1">${esc(t('hm_del_no'))}</button>`
    : `<button type="button" class="btn btn-ghost btn-sm" data-home-resume-del="1">${esc(t('hm_delete'))}</button>`;
  box.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#ic-gum"/></svg>
    <div class="home-resume-main">
      <span class="home-card-title" data-home-resume-title="1">${esc(t('hm_resume'))}: <span class="mono" translate="no">${esc(info.model)}</span>${info.date ? `, <span class="mono" translate="no">${esc(info.date)}</span>` : ''}</span>
      <span class="home-card-text">${esc(t('hm_resume_text'))}</span>
    </div>
    <div class="home-resume-actions">
      <button type="button" class="btn btn-primary" data-home-resume="1">${esc(t('hm_resume'))}</button>
      ${del}
    </div>`;
}
function resumeCurrent() {
  window.App.showScreen('app');
  window.App.renderSidebar();
  window.Table.render(); window.TypeB.render(); window.Results.render();
}
function deleteCurrent() {
  window.appState.reset();              // mavzu va til saqlanadi (src/js/state.js); IndexedDB dagi sessiyalarga tegilmaydi
  resumeConfirm = false;
  window.Table.render(); window.TypeB.render(); window.Results.render();
  toast(t('hm_resume_deleted'), 'info');
  renderResume();
}

function render() { renderResume(); renderSessions(); renderFoot(); }

/* P20 (SEC-01): kirish sahifasidagi sonlar — katalogdan (UCTemplates — templates/builtin/index.json) va dvigateldan
   (qattiq yozilgan "12 formula · 9 sozlama · 4 taqsimot" o'rniga). Katalog yuklanguncha shablonlar soni '—'. */
async function renderLandingStats() {
  const nodes = document.querySelectorAll('[data-landing-stat]');
  if (!nodes.length) return;
  const put = templates => {
    const st = landingStats({ templates, methods: LINTER_MODES, distributions: DIVISORS, languages: window.i18n && window.i18n.all ? window.i18n.all('idx_title') : null });
    nodes.forEach(el => { el.textContent = st[el.dataset.landingStat] || '—'; });
  };
  put(null);
  if (!T()) return;
  try { await T().ready; } catch (_) { return; }
  const total = T().validationSummary().total;
  put(total > 0 ? total : null);
}
renderLandingStats();

async function openSession(id) {
  const rec = await T().getCalculation(id);
  const p = sessionPatch(rec, window.Calc.ENGINE_VERSION);
  if (!p) { toast(t('hm_open_failed'), 'error'); return; }
  window.appState.set(p.patch);
  window.App.showScreen('app');
  window.App.renderSidebar();
  window.Table.render(); window.TypeB.render(); window.Results.render();
  if (window.UCShell) window.UCShell.goStep(p.stale ? 'data' : 'results');
  if (p.stale) toast(t('hm_open_stale'), 'info', 6000);
}

function bind() {
  document.addEventListener('screenchange', e => { if (e.detail.screen === 'dash') { confirmId = null; render(); } });
  document.addEventListener('langchange', () => { if (!$('dash-screen').classList.contains('hidden')) render(); });
  document.addEventListener('click', async e => {
    const q = sel => e.target.closest(sel);
    if (q('[data-go-home]')) { window.App.showScreen('dash'); return; }
    if (!q('#dash-screen')) return;
    if (q('[data-home-resume]')) { resumeCurrent(); return; }
    if (q('[data-home-resume-del]')) { resumeConfirm = true; renderResume(); const y = document.querySelector('[data-home-resume-del-yes]'); if (y) y.focus(); return; }
    if (q('[data-home-resume-del-no]')) { resumeConfirm = false; renderResume(); return; }
    if (q('[data-home-resume-del-yes]')) { deleteCurrent(); return; }
    if (q('[data-home-new]')) { window.App.newCalculation(); return; }          // P22-1: to'g'ridan-to'g'ri Model qadami
    if (q('[data-home-landing]')) { window.App.showScreen('home'); return; }
    const link = q('[data-home-lab]');
    if (link) { window.App.showScreen('app'); if (window.UCShell) window.UCShell.go(link.dataset.homeLab); return; }
    let b;
    if ((b = q('[data-home-open]'))) { openSession(b.dataset.homeOpen); return; }
    if ((b = q('[data-home-copy]'))) { await T().copyCalculation(b.dataset.homeCopy); toast(t('hm_copied'), 'success'); renderSessions(); return; }
    if ((b = q('[data-home-del]'))) { confirmId = b.dataset.homeDel; await renderSessions(); const y = document.querySelector('[data-home-del-yes]'); if (y) y.focus(); return; }
    if (q('[data-home-del-no]')) { confirmId = null; renderSessions(); return; }
    if ((b = q('[data-home-del-yes]'))) { await T().removeCalculation(b.dataset.homeDelYes); confirmId = null; toast(t('hm_deleted'), 'info'); renderSessions(); }
  });
}

if ($('dash-screen')) {
  bind();
  if (!$('dash-screen').classList.contains('hidden')) renderResume();     // sayt Bosh sahifadan ochiladi — karta darhol
  if (T()) T().ready.then(() => { if (!$('dash-screen').classList.contains('hidden')) render(); });
}
