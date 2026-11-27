/* ═══════════════════════════════════════════════════════════════
   METHOD/APP.JS — P22-2 (audit 21.11.2026 — UX-03): Model qadamidagi "Usul" qatori (DOM ulanishi).
   "Usul: <nom> — <qisqa sabab>. [O'zgartirish]" + ixtiyoriy "Ma'lumot turi" savoli. Tavsiya — dvigateldan
   (suggestMethod); bu yerda HISOB YO'Q va yangi holat mashinasi yo'q: tanlov MAVJUD interfeysni ochadi
   (window.switchTab; Top-down / Maxsus rejimlarning o'z API'si orqali ichki rejim).
   AVTOMATIK REJIM O'ZI HECH QACHON YORLIQ ALMASHTIRMAYDI — faqat tavsiya; o'tish foydalanuvchi "O'tish" ni bosganda.
   Matnlar — i18n (src/js/i18n-advisor.js), DOM ga textContent / escHtml orqali. CSP: inline skript / uslub yo'q.
   Global: window.UCMethod.
═══════════════════════════════════════════════════════════════ */
import { suggestMethod } from '../../engine/index.js';
import { METHODS, DATA_KIND_OPTIONS, methodOf, methodRow, advisorState, isLocked, reasonParts } from './model.js';

const $ = id => document.getElementById(id);
const t = k => window.i18n.t(k);
const esc = v => window.escHtml(v);
const state = () => (window.appState ? window.appState.get() : {});

let picking = false;      // "O'zgartirish" ro'yxati ochiqmi
let lastHtml = null;      // o'zgarmagan bo'lsa DOM qayta yozilmaydi (fokus saqlanadi)

function suggestion(st) {
  // Faqat tavsiya: natija (st.combined) o'qiladi, o'zgartirilmaydi. Xato bo'lsa — GUM (standart) ko'rsatiladi.
  try { return suggestMethod(advisorState(st), st.combined || null); } catch (_) { return null; }
}
function row() { const st = state(); return methodRow(st, suggestion(st)); }

function reasonHTML(reasons) {
  const parts = reasonParts(reasons);
  if (!parts.length) return '';
  return parts.map(p => {
    const text = p.codes ? t(p.key).replace('{c}', p.codes.map(c => '(' + c + ')').join(', ')) : t(p.key);
    // shablon sababi — ichki hujjatga havola (docs/…): foydalanuvchiga ko'rsatilmaydi; me'yoriy manbalar ko'rsatiladi
    const ref = p.key === 'adv_r_template_mode' ? '' : ` <span class="method-ref text-xs" translate="no">${esc(p.ref)}</span>`;
    return `<span class="method-reason" data-method-reason="${esc(p.key)}">${esc(text)}${ref}</span>`;
  }).join(' ');
}

function render() {
  const box = $('method-row');
  if (!box) return;
  const st = state();
  const r = methodRow(st, suggestion(st));
  if (r.locked) picking = false;
  const name = esc(t(r.method.labelKey));
  // BETA (mikrobiologiya): belgi + ko'rinadigan izoh (egasi qarori 2026-11-27) — rasmiy hisobotda ishlatilmasin
  const beta = r.method.beta ? ` <span class="badge badge-orange" data-method-beta="1" title="${esc(t('mt_beta_note'))}">${esc(t('mt_beta'))}</span>` : '';
  const betaNote = r.method.beta ? `<p class="method-beta-note text-sm" data-method-beta-note="1">${esc(t('mt_beta'))}: ${esc(t('mt_beta_note'))}</p>` : '';
  const tplId = r.locked && st.template && st.template.id ? ` <span class="mono text-xs" translate="no">${esc(st.template.id)}</span>` : '';
  const head = r.mode === 'template' ? `${esc(t('mt_by_template'))}: <strong data-method-name="${esc(r.method.key)}">${name}</strong>${tplId}`
    : r.mode === 'auto' ? `${esc(t('mt_label'))}: <strong data-method-name="AUTO">${esc(t('mt_auto'))}</strong> <span aria-hidden="true">→</span> <span data-method-suggested="${esc(r.method.key)}">${name}</span>`
      : `${esc(t('mt_label'))}: <strong data-method-name="${esc(r.method.key)}">${name}</strong>`;
  const reason = r.mode === 'manual' ? (r.method.hintKey ? `<span class="method-reason">${esc(t(r.method.hintKey))}</span>` : '') : reasonHTML(r.reasons);
  const opts = METHODS.map(m => `<option value="${esc(m.key)}"${(r.auto ? 'AUTO' : r.method.key) === m.key ? ' selected' : ''}>${esc(t(m.labelKey))}${m.beta ? ' — ' + esc(t('mt_beta')) : ''}</option>`).join('');
  const kinds = r.showDataKind ? `<div class="method-kinds" role="group" aria-labelledby="method-kinds-label" data-method-kinds="1">
      <span class="method-kinds-label text-sm" id="method-kinds-label">${esc(t('mt_kind_q'))}</span>
      ${DATA_KIND_OPTIONS.map(o => `<button type="button" class="sp-mode${r.dataKind === o.key ? ' active' : ''}" data-method-kind="${esc(o.key)}" aria-pressed="${r.dataKind === o.key}">${esc(t(o.labelKey))}</button>`).join('')}
    </div>` : '';
  box.dataset.methodMode = r.mode;
  const html = `<div class="method-line">
      <p class="method-text">${head}${beta}${reason ? ` <span aria-hidden="true">—</span> ${reason}` : ''}</p>
      <div class="method-actions">
        ${r.canGo && !r.locked ? `<button type="button" class="btn btn-outline btn-sm" data-method-go="${esc(r.method.key)}">${esc(t('mt_go'))}</button>` : ''}
        ${r.locked ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-method-change="1" aria-expanded="${picking}" aria-controls="method-pick">${esc(t('mt_change'))}</button>`}
      </div>
    </div>
    ${r.locked ? '' : `<div class="method-pick" id="method-pick"${picking ? '' : ' hidden'}>
      <label class="method-pick-label" for="method-select">${esc(t('mt_pick'))}</label>
      <select id="method-select" data-method-select="1">${opts}</select>
    </div>`}
    ${betaNote}
    ${kinds}`;
  if (html === lastHtml && box.firstChild) return;
  lastHtml = html;
  box.innerHTML = html;
}

/* ─── Mavjud interfeysni ochish (yangi hisob mantiqi yo'q) ─── */
function open(method) {
  const o = (method && method.open) || {};
  if ($('app') && $('app').classList.contains('hidden') && window.App) window.App.showScreen('app');
  if (o.special && window.UCSpecial) { const s = window.UCSpecial.getState(); if (s.mode !== o.special) window.UCSpecial.setState({ ...s, mode: o.special }); }
  if (o.topdown && window.UCTopDown) { const s = window.UCTopDown.getState(); if (!s.template && s.basis !== o.topdown) window.UCTopDown.setState({ ...s, basis: o.topdown, step: 1 }); }
  if (o.tab) { window.switchTab(o.tab); return; }
  window.switchTab('model');
  if (o.reveal) {
    const el = document.querySelector('#model-box ' + o.reveal);
    const add = el && el.querySelector('[data-out-add]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    if (add) add.focus();
  }
}

/** Usulni tanlash (ro'yxatdan yoki Ctrl+K dan). Shablonda usul qulflangan — false. */
function choose(key) {
  const m = methodOf(key);
  if (!m) return false;
  const st = state();
  if (isLocked(st)) { if (window.showToast) window.showToast(t('mt_locked'), 'info'); return false; }
  const settings = { ...(st.settings || {}) };
  if (m.key === 'AUTO') delete settings.method; else settings.method = m.key;
  picking = false;
  window.appState.set({ settings });          // faqat interfeys maydoni: natija (combined) o'zgarmaydi
  render();
  if (m.key !== 'AUTO') open(m);
  return true;
}
function setKind(kind) {
  const st = state();
  if (isLocked(st)) return;
  const settings = { ...(st.settings || {}) };
  if (settings.dataKind === kind) delete settings.dataKind; else settings.dataKind = kind;
  window.appState.set({ settings });
  render();
  const b = document.querySelector(`[data-method-kind="${kind}"]`);
  if (b) b.focus();
}

function bind() {
  if (!$('method-row')) return;
  document.addEventListener('click', e => {
    const q = sel => e.target.closest(sel);
    let b;
    if (q('[data-method-change]')) { picking = !picking; render(); const el = picking ? $('method-select') : document.querySelector('[data-method-change]'); if (el) el.focus(); return; }
    if ((b = q('[data-method-go]'))) { open(methodOf(b.dataset.methodGo)); return; }
    if ((b = q('[data-method-kind]'))) setKind(b.dataset.methodKind);
  });
  document.addEventListener('change', e => { if (e.target && e.target.id === 'method-select') choose(e.target.value); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && picking && e.target && e.target.closest && e.target.closest('#method-row')) { picking = false; render(); const c = document.querySelector('[data-method-change]'); if (c) c.focus(); }
  });
  document.addEventListener('langchange', render);
  // ro'yxat ochiq va fokusda bo'lsa qayta chizilmaydi (tanlov uzilmasin)
  if (window.appState) window.appState.subscribe(() => { if (!(picking && document.activeElement && document.activeElement.id === 'method-select')) render(); });
  render();
}

window.UCMethod = Object.freeze({ choose, setKind, open: key => open(methodOf(key)), current: row, render, METHODS });

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
