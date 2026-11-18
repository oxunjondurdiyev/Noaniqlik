/* ═══════════════════════════════════════════════════════════════
   FINDINGS/APP.JS — linter topilmalarini "asoslangan holda qabul qilish" (P05a) — UI qatlami.
   • Qabul qilish src/storage/ audit zanjiriga yoziladi (kim — ROL, qachon, topilma id, izoh); zanjirga yozib
     bo'lmasa (IndexedDB yo'q) qabul qilish RAD ETILADI — izsiz qabul bo'lmaydi.
   • Joriy qabul qilishlar har bir hisob doirasi (scope) bo'yicha: 'gum' — asosiy hisob (appState.acceptances,
     saqlangan nuqtalar bilan birga yuradi); 'regression', 'topdown', 'special' — localStorage 'uc_findings_accept_v1'.
     Shaxsiy ma'lumot yozilmaydi (faqat rol).
   • Tugmalar hujjat darajasidagi bitta tinglovchi orqali (CSP: inline skript va onclick yo'q); foydalanuvchi
     izohi innerHTML ga faqat escHtml orqali tushadi (src/report/findings.js).
   Global: window.UCFindings.
═══════════════════════════════════════════════════════════════ */
import * as Store from '../../storage/index.js';
import { validateAcceptance } from '../../engine/index.js';

const STORE_KEY = 'uc_findings_accept_v1';
const t = k => window.i18n.t(k);
const toast = (m, type, ms) => window.showToast && window.showToast(m, type, ms);

let db = null;
const ready = (async () => {
  try { db = await new Store.LocalAdapter().open(); } catch (e) { db = null; }
})();

function readLocal() {
  try { return JSON.parse(window.localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function writeLocal(all) {
  try { window.localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) { /* xotira to'la yoki o'chirilgan */ }
}

/** Joriy qabul qilishlar: { findingId: {comment, role, at, value, seq} } */
function acceptances(scope) {
  if (!scope || scope === 'gum') return { ...((window.appState && window.appState.get('acceptances')) || {}) };
  return { ...(readLocal()[scope] || {}) };
}
function setAcceptances(scope, map) {
  if (!scope || scope === 'gum') { window.appState.set({ acceptances: map }); return; }
  const all = readLocal();
  all[scope] = map;
  writeLocal(all);
}

/** Rol — Firebase Auth sessiyasidan (admin / employee / superadmin); kirmagan foydalanuvchi — 'guest'. Ism yozilmaydi. */
function role() {
  const s = window.AuthManager && window.AuthManager.getSession ? window.AuthManager.getSession() : null;
  return Store.cleanRole(s && s.role);
}

function changed(scope) {
  document.dispatchEvent(new CustomEvent('findingschange', { detail: { scope } }));
}

/**
 * Qabul qilish. @returns {Promise<{ok:boolean, error?:string}>}
 * @param {{scope?:string, finding:object, comment:string}} ev
 */
async function accept(ev) {
  const v = validateAcceptance(ev.comment);
  if (!v.ok) return { ok: false, error: 'accept_comment_short' };
  if (!ev.finding || ev.finding.severity === 'info') return { ok: false, error: 'accept_not_applicable' };
  await ready;
  if (!db) return { ok: false, error: 'accept_no_storage' };
  const scope = ev.scope || 'gum';
  let rec;
  try { rec = await Store.acceptFinding(db, { scope, finding: ev.finding, comment: v.comment, role: role() }); }
  catch (e) { return { ok: false, error: String((e && e.message) || 'accept_failed') }; }
  setAcceptances(scope, { ...acceptances(scope), [ev.finding.id]: { comment: rec.comment, role: rec.role, at: rec.at, value: rec.value, seq: rec.seq } });
  changed(scope);
  return { ok: true, record: rec };
}

async function revoke(ev) {
  await ready;
  if (!db) return { ok: false, error: 'accept_no_storage' };
  const scope = ev.scope || 'gum';
  try { await Store.revokeAcceptance(db, { scope, findingId: ev.findingId, role: role() }); }
  catch (e) { return { ok: false, error: String((e && e.message) || 'accept_failed') }; }
  const map = acceptances(scope);
  delete map[ev.findingId];
  setAcceptances(scope, map);
  changed(scope);
  return { ok: true };
}

/* ─── Ulash: "Tekshiruv natijalari" blokidagi tugmalar ─── */
const registry = new Map();   // scope → () => findings[] (joriy natija topilmalari)
function register(scope, getFindings) { registry.set(scope, getFindings); }
function findingById(scope, id) {
  const get = registry.get(scope);
  return ((get && get()) || []).find(f => f.id === id) || null;
}

async function onClick(e) {
  const block = e.target.closest('[data-findings]');
  if (!block) return;
  const scope = block.dataset.findingsScope || 'gum';
  const open = e.target.closest('[data-finding-accept]');
  if (open) {
    const form = open.parentElement.querySelector('.finding-accept-form');
    if (form) { form.hidden = !form.hidden; if (!form.hidden) form.querySelector('textarea').focus(); }
    return;
  }
  const confirm = e.target.closest('[data-finding-confirm]');
  if (confirm) {
    const id = confirm.dataset.findingConfirm;
    const ta = confirm.parentElement.querySelector('textarea');
    const finding = findingById(scope, id);
    if (!finding) return;
    const r = await accept({ scope, finding, comment: ta ? ta.value : '' });
    if (!r.ok) toast(t(r.error === 'accept_comment_short' ? 'fnd_err_short' : r.error === 'accept_no_storage' ? 'fnd_err_storage' : 'fnd_err_failed'), 'error', 5000);
    else toast(t('fnd_accept_done'), 'success');
    return;
  }
  const rev = e.target.closest('[data-finding-revoke]');
  if (rev) {
    const r = await revoke({ scope, findingId: rev.dataset.findingRevoke });
    if (!r.ok) toast(t(r.error === 'accept_no_storage' ? 'fnd_err_storage' : 'fnd_err_failed'), 'error', 5000);
  }
}

if (typeof document !== 'undefined') document.addEventListener('click', onClick);

window.UCFindings = Object.freeze({ ready, acceptances, accept, revoke, role, register, canAccept: () => true });
