/* ═══════════════════════════════════════════════════════════════
   AI/APP.JS — AI yordamchi oynasi kontrolleri (P14). FAQAT laboratoriya sozlamasida `aiEnabled` yoqilganda,
   dinamik import() bilan yuklanadi (src/ui/ai-boot.js) — o'chiq holatda bu fayl va src/ai/ so'ralmaydi.
   Bu sahifada TARMOQ CHAQIRUVI YO'Q (faqat o'z kelib chiqishidagi statik sxema fayllari) va KALIT YO'Q:
     • nusxa-qo'y rejimi — prompt ko'rsatiladi, nusxalanadi, javob qo'lda qaytariladi;
     • "o'z kaliti" rejimi — so'rov `ai_exchange` omboriga yoziladi va alohida ai.html sahifasida yuboriladi
       (egasi qarori S-7 b); javob shu ombordan olinadi va AYNAN shu yerda, bir xil validatordan o'tadi.
   AI hech narsa hisoblamaydi: bu modul dvigatel natijasini faqat O'QIYDI (topilma kodlari, hissalar tartibi).
   Saqlash — faqat foydalanuvchi tugmasi bilan, mavjud saqlash yo'llari orqali (rol, audit).
═══════════════════════════════════════════════════════════════ */
import * as Store from '../../storage/index.js';
import * as Payload from '../../ai/payload.js';
import { buildPrompt, PROMPTS } from '../../ai/prompts/index.js';
import { parseResponse, applyNumbers, certificateToCalibration } from '../../ai/response.js';
import { cleanStandard } from '../../engine/lab/registry.js';
import * as View from './view.js';

const $ = id => document.getElementById(id);
const t = k => window.i18n.t(k);
const esc = v => window.escHtml(v);
const ctx = () => ({ t, esc });
const toast = (m, type = 'info', ms) => window.showToast && window.showToast(m, type, ms);
const lang = () => (Payload.AI_LANGS.includes(window.i18n.lang) ? window.i18n.lang : 'en');
function role() {
  const s = window.AuthManager && window.AuthManager.getSession ? window.AuthManager.getSession() : null;
  return Store.cleanRole(s && s.role);
}

let db = null;
const schemas = {};
let S = null;          // joriy seans holati
let note = null;       // c) bosma hisobotga ilova (faqat foydalanuvchi tanlasa)

async function fetchJSON(url) {
  if (schemas[url]) return schemas[url];
  const r = await fetch(url, { cache: 'no-cache' });           // faqat o'z kelib chiqishidagi statik fayl
  if (!r.ok) throw new Error('ai_schema_required');
  return (schemas[url] = await r.json());
}
const responseSchema = fn => fetchJSON(`schemas/ai/${PROMPTS[fn].schemaId}.schema.json`);

async function audit(action, extra = {}) {
  if (!db || !S) return;
  try {
    await Store.aiAudit(db, { action, fn: S.fn, mode: S.mode || 'paste', model: S.model, promptId: S.prompt && S.prompt.promptId, promptVersion: S.prompt && S.prompt.promptVersion,
      payloadHash: S.payloadHash, responseHash: S.responseHash, role: role(), ...extra });
  } catch (e) { /* audit yozilmasa ham foydalanuvchi ishi to'xtamaydi; zanjir holati "Ma'lumotlar" oynasida ko'rinadi */ }
}

function body() { return $('tpl-modal').querySelector('.tpl-modal-body'); }
function show(html) { const m = $('tpl-modal'); body().innerHTML = html; m.style.display = 'flex'; }
function msg(html) { const el = $('ai-msg'); if (el) el.innerHTML = html; }
function close() { $('tpl-modal').style.display = 'none'; S = null; }

/* ─── Joriy hisob (faqat o'qish) ─── */
function currentCalc() {
  const st = window.appState.get();
  const spec = st.template && window.UCTemplates ? window.UCTemplates.evaluateState(st).state : st;
  let result = null;
  try { result = window.Calc.evaluate(spec); } catch (e) { result = null; }
  return { state: spec, result: result && !result.error ? result : null, acceptances: st.acceptances || {} };
}
function findingTexts(result) {
  const out = {};
  for (const f of (result && result.findings) || []) {
    const o = {};
    for (const [k, p] of [['what', 'w_'], ['why', 'why_'], ['fix', 'fix_']]) { const key = p + f.code, v = t(key); if (v && v !== key) o[k] = v; }
    if (Object.keys(o).length) out[f.code] = o;
  }
  return out;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => reject(new Error('ai_payload_bad_document'));
    r.readAsDataURL(file);
  });
}

/* ─── 1. Tayyorlash: payload (ruxsat ro'yxati) → prompt → TO'LIQ matn ko'rsatiladi ─── */
async function prepare() {
  const fn = S.fn;
  let payload;
  if (fn === 'explain' || fn === 'source_suggest') {
    const c = currentCalc();
    if (fn === 'explain' && !c.result) throw Object.assign(new Error('no_result'), { code: 'no_result' });
    payload = fn === 'explain'
      ? Payload.buildExplainPayload(c.state, c.result, { lang: lang(), findingTexts: findingTexts(c.result), acceptances: c.acceptances })
      : Payload.buildSourceSuggestPayload(c.state, { lang: lang() });
  } else {
    const text = ($('ai-doc') || {}).value || '';
    const file = $('ai-file') && $('ai-file').files && $('ai-file').files[0];
    const consent = !!($('ai-consent') && $('ai-consent').checked);
    if (fn === 'template_draft') payload = Payload.buildTemplateDraftPayload({ text }, { lang: lang(), documentConsent: consent });
    else if (file && !text.trim()) payload = Payload.buildCertificatePayload({ data: await readFile(file), mediaType: file.type }, { lang: lang(), documentConsent: consent });
    else payload = Payload.buildCertificatePayload({ text }, { lang: lang(), documentConsent: consent });
  }
  S.payload = payload;
  S.prompt = buildPrompt(payload, await responseSchema(fn));
  S.payloadHash = await Store.sha256Hex(S.prompt.text);
  S.mode = 'paste'; S.exchangeId = ''; S.responseHash = ''; S.model = '';
  await audit('ai_prepare');
  renderPreview();
}
function renderPreview() {
  show(View.previewHTML({ fn: S.fn, text: S.prompt.text, hasImage: S.prompt.hasImage, warnings: S.prompt.warnings, promptId: S.prompt.promptId, promptVersion: S.prompt.promptVersion, exchangeId: S.exchangeId }, ctx()));
}

async function copyPrompt() {
  const text = S.prompt.text;
  try { await navigator.clipboard.writeText(text); }
  catch (e) { const el = $('ai-prompt'); el.focus(); el.select(); document.execCommand('copy'); }
  S.mode = 'paste';
  await audit('ai_copy');
  toast(t('ai_copied'), 'success', 6000);
}

/* "O'z kaliti": so'rov vaqtinchalik omborga; yuborish — ai.html da (bu sahifada tarmoq chaqiruvi va kalit yo'q) */
async function toOwnKey() {
  if (!db) { msg(View.errorHTML('no_storage', '', ctx())); return; }
  await Store.purgeExchange(db, Date.now());
  const id = Store.newExchangeId();
  const d = S.payload.document;
  await Store.putExchange(db, { id, fn: S.fn, role: role(), lang: lang(), mode: 'api', promptId: S.prompt.promptId, promptVersion: S.prompt.promptVersion, promptText: S.prompt.text,
    payloadHash: S.payloadHash, schemaId: PROMPTS[S.fn].schemaId, attachment: d && d.kind === 'image' ? { kind: 'image', mediaType: d.mediaType, data: d.data } : undefined,
    createdAt: new Date().toISOString(), status: 'pending' });
  S.exchangeId = id; S.mode = 'api';
  renderPreview();
}
async function fetchExchange() {
  const rec = db && S.exchangeId ? await Store.getExchange(db, S.exchangeId) : null;
  if (!rec || rec.status !== 'answered' || typeof rec.responseText !== 'string') { msg(`<p class="text-xs">${esc(t('ai_exchange_pending'))}</p>`); return; }
  S.mode = 'api'; S.model = rec.model || '';
  await Store.removeExchange(db, rec.id);                       // olingach — o'chiriladi
  S.exchangeId = '';
  await check(rec.responseText);
}

/* ─── 2. Javob: bir xil validator (nusxa-qo'y va API uchun) ─── */
async function check(text) {
  const fn = S.fn;
  S.responseHash = await Store.sha256Hex(String(text));
  const d = S.payload.document;
  const res = parseResponse(fn, text, {
    schema: await responseSchema(fn), payload: S.payload, documentText: d && d.kind === 'text' ? d.text : undefined,
    methodologySchema: fn === 'template_draft' ? await fetchJSON('schemas/methodology.schema.json') : undefined,
    id: 'AI-' + Date.now().toString(36), now: new Date().toISOString(),
  });
  await audit('ai_response', { outcome: res.ok ? 'ok' : res.code });
  if (!res.ok) { msg(View.errorHTML(res.code, res.detail, ctx()) + View.rejectedHTML(res.rejected, ctx())); return; }
  S.result = res;
  S.decisions = { numbers: {}, fields: {}, rows: {} };
  S.added = [];
  if (fn === 'certificate_extract') S.standards = db ? await Store.listRegistry(db, 'standard') : [];
  renderReview();
}
function renderReview() {
  const r = S.result;
  if (S.fn === 'explain') show(View.reviewExplainHTML(r, !!(note && note.res === r), ctx()));
  else if (S.fn === 'source_suggest') show(View.reviewSuggestHTML(r, S.added, ctx()));
  else if (S.fn === 'template_draft') show(View.reviewTemplateHTML(r, S.decisions, ctx()));
  else show(View.reviewCertificateHTML(r, S.decisions, S.standards, ctx()));
}

/* ─── 3. Tasdiqlash / rad etish (har bir qiymat alohida; auditga faqat maydon yo'li) ─── */
async function decide(kind, n, ok) {
  const d = S.decisions[kind];
  if (d[n]) return;
  d[n] = ok ? 'confirmed' : 'rejected';
  const field = kind === 'numbers' ? (() => { const x = S.result.numbers.find(v => v.id === n); return x ? `typeBSources[${x.target[0]}].${x.field}` : 'number'; })() : kind === 'rows' ? `points[${n}]` : String(n);
  await audit(ok ? 'ai_accept' : 'ai_reject', { field });
  renderReview();
}

async function saveTemplate() {
  if (!db) { msg(View.errorHTML('no_storage', '', ctx())); return; }
  const ids = Object.keys(S.decisions.numbers).filter(k => S.decisions.numbers[k] === 'confirmed');
  const tpl = applyNumbers(S.result.template, S.result.numbers, ids);       // tasdiqlanmagan son shablonga kirmaydi
  await db.save('templates', tpl, { actor: role(), reason: 'ai_draft', action: 'create' });
  await audit('ai_save', { field: 'template', outcome: 'AI_DRAFT' });
  document.dispatchEvent(new CustomEvent('uc:templates-changed'));
  toast(t('ai_tpl_saved'), 'success', 6000);
  close();
}

async function saveCertificate() {
  if (!db) { msg(View.errorHTML('no_storage', '', ctx())); return; }
  const fields = Object.keys(S.decisions.fields).filter(k => k !== 'route' && S.decisions.fields[k] === 'confirmed');
  const rows = Object.keys(S.decisions.rows).filter(k => S.decisions.rows[k] === 'confirmed').map(Number);
  if (!fields.length && !rows.length) { msg(`<div class="tpl-missing">${esc(t('ai_cert_nothing'))}</div>`); return; }
  const cal = certificateToCalibration(S.result, { fields, rows, route: S.decisions.fields.route === 'confirmed' });
  const targetId = ($('ai-target') || {}).value || '';
  const existing = targetId ? await Store.getRegistry(db, targetId) : null;
  const name = (($('ai-std-name') || {}).value || '').trim();
  // cleanStandard — noma'lum maydonlar (jumladan shaxs ismlari) tashlanadi (P11)
  const std = existing
    ? cleanStandard({ ...existing, calibrations: [...(existing.calibrations || []), cal] })
    : cleanStandard({ id: Store.newRegistryId('standard'), name: name || cal.certificate || t('ai_cert_new'), unit: S.result.unit, calibrations: [cal] });
  try { await Store.saveRegistry(db, std, { role: role(), origin: 'ai', reason: 'ai_certificate' }); }
  catch (e) { msg(View.errorHTML('forbidden', '', ctx())); return; }
  await audit('ai_save', { field: 'registry', outcome: 'origin_ai' });
  document.dispatchEvent(new CustomEvent('uc:registry-changed'));
  toast(t('ai_cert_saved'), 'success', 6000);
  close();
}

/* d) manba QIYMATSIZ qo'shiladi — raqamni foydalanuvchi kiritadi (P11 dagi interpolyatsiya manbasi kabi) */
async function addSource(n) {
  const s = S.result.suggestions[n];
  if (!s || S.added.includes(n)) return;
  window.appState.addTypeBComponent({ name: s.name, param: s.input, halfWidth: '', distribution: s.distribution || 'rect', k: 2, sensitivity: 1, unit: '', sourceId: 'ai_suggestion' });
  S.added.push(n);
  await audit('ai_accept', { field: `suggestions[${n}]` });
  toast(t('ai_sug_added'), 'success', 5000);
  renderReview();
}

async function onClick(e) {
  const b = e.target.closest('[data-ai]');
  if (!b || !S) return;
  const act = b.dataset.ai, n = b.dataset.n;
  try {
    if (act === 'close') close();
    else if (act === 'menu') { S = { fn: '' }; show(View.menuHTML(ctx())); }
    else if (act === 'fn') { S = { fn: b.dataset.fn }; if (S.fn === 'explain' || S.fn === 'source_suggest') await prepare(); else show(View.inputHTML(S.fn, ctx())); }
    else if (act === 'prepare') await prepare();
    else if (act === 'copy') await copyPrompt();
    else if (act === 'own-key') await toOwnKey();
    else if (act === 'fetch') await fetchExchange();
    else if (act === 'check') await check(($('ai-response') || {}).value || '');
    else if (act === 'num-ok' || act === 'num-no') await decide('numbers', n, act === 'num-ok');
    else if (act === 'field-ok' || act === 'field-no') await decide('fields', n, act === 'field-ok');
    else if (act === 'row-ok' || act === 'row-no') await decide('rows', n, act === 'row-ok');
    else if (act === 'save-template') await saveTemplate();
    else if (act === 'save-certificate') await saveCertificate();
    else if (act === 'add-source') await addSource(Number(n));
  } catch (err) {
    const code = (err && err.code) || 'generic';
    const html = View.errorHTML(code, '', ctx());
    if ($('ai-msg')) msg(html); else { show(View.menuHTML(ctx()) + html); S = { fn: '' }; }
  }
}
function onChange(e) {
  const el = e.target.closest('[data-ai-change="include"]');
  if (!el || !S || S.fn !== 'explain') return;
  note = el.checked ? { res: S.result } : null;                // faqat foydalanuvchi belgilasa
}

let bound = false;
/** Oynani ochish (src/ui/ai-boot.js chaqiradi). */
export async function open() {
  if (!db) { try { db = await new Store.LocalAdapter().open(); } catch (e) { db = null; } }
  if (!bound) {
    bound = true;
    const m = $('tpl-modal');
    m.addEventListener('click', onClick);
    m.addEventListener('change', onChange);
    // hisob o'zgarsa — eski izoh boshqa hisobga yopishib qolmasin
    if (window.appState && window.appState.subscribe) window.appState.subscribe(() => { note = null; });
  }
  S = { fn: '' };
  show(View.menuHTML(ctx()));
}

/* Bosma hisobot (src/js/report.js) uchun: ichki ilova — faqat foydalanuvchi tanlagan bo'lsa, belgi bilan */
window.UCAINote = Object.freeze({ appendixHTML: () => (note ? View.appendixHTML(note.res, ctx()) : '') });
