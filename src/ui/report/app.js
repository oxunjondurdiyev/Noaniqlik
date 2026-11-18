/* ═══════════════════════════════════════════════════════════════
   REPORT/APP.JS — hisobot shakli va rekvizitlari (P05b) — UI qatlami.
   • Shakl turi (kalibrlash sertifikati ilovasi / sinov protokoli bo'limi / byudjet asosnomasi / muvofiqlik bayonoti).
   • Laboratoriya rekvizitlari va logotipi: FAQAT brauzerda (localStorage 'uc_report_lab_v1'); Firebase'ga yozilmaydi.
   • Hujjat rekvizitlari (raqam, sana, obyekt, usul …) va shaxsga tegishli maydonlar (buyurtmachi, tasdiqlovchi):
     faqat joriy sessiyada (sessionStorage 'uc_report_doc_v1') — oyna yopilganda o'chadi (minimallashtirish, CLAUDE.md).
   • Build identifikatori: tests/security/engine.sha256.json dagi dvigatel xeshi (statik sayt — build bosqichi yo'q).
   CSP: inline skript / onclick yo'q; foydalanuvchi matni DOM ga faqat value / textContent / escHtml orqali.
   Global: window.UCReport.
═══════════════════════════════════════════════════════════════ */
import { REPORT_FORMS, DEFAULT_FORM, requisiteFields } from '../../report/forms.js';
import { cleanRequisites, splitRequisites, missingRequisites, validLogo, MAX_LOGO_BYTES } from '../../report/requisites.js';

const LAB_KEY = 'uc_report_lab_v1';        // laboratoriya nomi, manzili, akkreditatsiya, logotip, shakl turi
const DOC_KEY = 'uc_report_doc_v1';        // hujjat rekvizitlari — faqat sessiya
const t = k => window.i18n.t(k);
const esc = s => window.escHtml(s);
const toast = (m, type, ms) => window.showToast && window.showToast(m, type, ms);

function read(storage, key) {
  try { return JSON.parse(storage.getItem(key) || '{}') || {}; } catch (e) { return {}; }
}
function write(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}

let form = DEFAULT_FORM;
let requisites = {};
function load() {
  const lab = read(window.localStorage, LAB_KEY);
  form = REPORT_FORMS.includes(lab.form) ? lab.form : DEFAULT_FORM;
  requisites = cleanRequisites({ ...lab, ...read(window.sessionStorage, DOC_KEY) });
}
function save() {
  const { lab, doc } = splitRequisites(requisites);
  const ok = write(window.localStorage, LAB_KEY, { ...lab, form });
  write(window.sessionStorage, DOC_KEY, doc);
  return ok;
}

/** Hisobot uchun joriy tanlov. */
function options() { return { form, requisites: { ...requisites } }; }

/* Build identifikatori — dvigatel xeshi (bir marta o'qiladi; topilmasa null → hisobotda "aniqlanmadi") */
let buildPromise = null;
function buildInfo() {
  if (!buildPromise) {
    buildPromise = fetch('tests/security/engine.sha256.json', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => (j && typeof j.sha256 === 'string' ? { sha256: j.sha256, engineVersion: j.engineVersion } : null))
      .catch(() => null);
  }
  return buildPromise;
}

/* ─── Asboblar paneli: shakl tanlovi + "Rekvizitlar" ─── */
function barHTML() {
  const miss = missingRequisites(requisites, form);
  return `<label class="report-bar-form">${esc(t('rp_form_label'))}
      <select data-report-form-select="1">${REPORT_FORMS.map(f => `<option value="${esc(f)}" ${f === form ? 'selected' : ''}>${esc(t('rp_form_' + f))}</option>`).join('')}</select></label>
    <button type="button" class="btn btn-outline btn-sm" data-report-requisites-open="1">${esc(t('rp_requisites_btn'))}${miss.length ? ` <span class="badge badge-orange" data-report-missing-count="${miss.length}">${miss.length}</span>` : ''}</button>`;
}
function renderBar() {
  document.querySelectorAll('[data-report-bar]').forEach(el => { el.innerHTML = barHTML(); });
}

/* ─── Rekvizitlar oynasi ─── */
function dialogHTML() {
  const f = requisiteFields();
  const miss = new Set(missingRequisites(requisites, form));
  const field = k => `<label class="report-req-field${miss.has(k) ? ' report-req-missing' : ''}">${esc(t('rq_' + k))}${miss.has(k) ? ' *' : ''}
      <input type="text" maxlength="500" autocomplete="off" data-req-field="${esc(k)}" value="${esc(requisites[k] || '')}" /></label>`;
  return `<div class="report-req-dialog" role="dialog" aria-modal="true">
    <h3>${esc(t('rp_title'))}</h3>
    <p class="text-xs text-muted">${esc(t('rp_privacy'))}</p>
    <h4>${esc(t('rp_lab_group'))}</h4>
    <div class="report-req-grid">${f.lab.map(field).join('')}</div>
    <div class="report-req-logo">
      <label>${esc(t('rq_logo'))} <input type="file" accept="image/png,image/jpeg" data-req-logo="1" /></label>
      <span class="text-xs text-muted">${esc(t('rp_logo_hint'))}</span>
      ${requisites.logo ? `<img class="report-logo-preview" alt="" src="${esc(requisites.logo)}" /> <button type="button" class="btn btn-ghost btn-sm" data-req-logo-remove="1">${esc(t('rp_logo_remove'))}</button>` : ''}
    </div>
    <h4>${esc(t('rp_doc_group'))}</h4>
    <div class="report-req-grid">${f.doc.map(field).join('')}</div>
    ${miss.size ? `<p class="text-xs report-req-note">* ${esc(t('rp_missing_now'))}: ${miss.size}</p>` : ''}
    <div class="report-req-actions">
      <button type="button" class="btn btn-primary btn-sm" data-req-save="1">${esc(t('rp_save'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-req-close="1">${esc(t('rp_close'))}</button>
    </div>
  </div>`;
}
function overlay() {
  let el = document.getElementById('report-req-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'report-req-overlay';
    el.className = 'report-req-overlay';
    el.hidden = true;
    document.body.appendChild(el);
  }
  return el;
}
function collect(el) {
  const next = { ...requisites };
  el.querySelectorAll('[data-req-field]').forEach(inp => { next[inp.dataset.reqField] = inp.value; });
  requisites = cleanRequisites(next);
}
function openDialog() { const el = overlay(); el.innerHTML = dialogHTML(); el.hidden = false; }
function closeDialog() { const el = overlay(); el.hidden = true; el.innerHTML = ''; }

function onLogo(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > MAX_LOGO_BYTES) { input.value = ''; toast(t('rp_logo_bad'), 'error', 5000); return; }
  const fr = new FileReader();
  fr.onload = () => {
    if (!validLogo(fr.result)) { toast(t('rp_logo_bad'), 'error', 5000); return; }
    collect(overlay());
    requisites = cleanRequisites({ ...requisites, logo: fr.result });
    openDialog();
  };
  fr.readAsDataURL(file);       // fayl faqat brauzerda o'qiladi
}

function onClick(e) {
  if (e.target.closest('[data-report-requisites-open]')) { openDialog(); return; }
  const ov = e.target.closest('#report-req-overlay');
  if (!ov) return;
  if (e.target === ov || e.target.closest('[data-req-close]')) { closeDialog(); return; }
  if (e.target.closest('[data-req-logo-remove]')) { collect(ov); delete requisites.logo; openDialog(); return; }
  if (e.target.closest('[data-req-save]')) {
    collect(ov);
    save();
    closeDialog();
    renderBar();
    toast(t('rp_saved'), 'success');
  }
}
function onChange(e) {
  const sel = e.target.closest('[data-report-form-select]');
  if (sel) { form = REPORT_FORMS.includes(sel.value) ? sel.value : DEFAULT_FORM; save(); renderBar(); return; }
  if (e.target.matches && e.target.matches('[data-req-logo]')) onLogo(e.target);
}

function bind() {
  load();
  renderBar();
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('langchange', () => { renderBar(); if (!overlay().hidden) { collect(overlay()); openDialog(); } });
}

window.UCReport = Object.freeze({
  options, buildInfo, openRequisites: openDialog,
  setForm: f => { form = REPORT_FORMS.includes(f) ? f : DEFAULT_FORM; save(); renderBar(); },
  setRequisites: r => { requisites = cleanRequisites(r); save(); renderBar(); },
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
