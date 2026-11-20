/* ═══════════════════════════════════════════════════════════════
   AI/OWN-KEY.JS — ai.html sahifasi kontrolleri: "o'z kaliti" rejimi (P14; egasi qarorlari A va S-7 b).
   Tashqi tarmoq chaqiruvi loyihada FAQAT shu sahifada (o'z CSP si: connect-src 'self' https://api.anthropic.com).
   So'rov asosiy oynada tayyorlanadi va `ai_exchange` omboridan o'qiladi; foydalanuvchi yuboriladigan TO'LIQ matnni
   va ogohlantirishni ko'radi, o'z kalitini kiritadi va "Yuborish" ni bosadi. Javob shu omborga yoziladi —
   uni asosiy oyna oladi va o'zi tekshiradi (bu sahifa javobni hech qayerga qo'llamaydi).
   Kalit: faqat sessionStorage (./key.js); auditga, omborga, logga yozilmaydi; xabarlarda ko'rsatilmaydi.
═══════════════════════════════════════════════════════════════ */
import * as Store from '../../storage/index.js';
import { buildApiRequest, callApi, MODELS, modelOf } from '../../ai/transport-api.js';
import { getKey, setKey, clearKey } from './key.js';

const $ = id => document.getElementById(id);
const t = k => window.i18n.t(k);
let db = null, rec = null, busy = false;

function say(key, isError) {
  const el = $('ai-own-msg');
  el.textContent = key ? (t(key) === key ? t('ai_err_generic') : t(key)) : '';
  el.className = isError ? 'tpl-missing' : 'tpl-ok';
}
function lock(on) { ['ai-own-send', 'ai-own-key', 'ai-own-model'].forEach(id => { $(id).disabled = on; }); }

async function send() {
  if (busy || !rec) return;
  const key = $('ai-own-key').value.trim();
  setKey(key);                                                  // faqat shu tabning sessionStorage i
  busy = true; lock(true); say('ai_own_sending', false);
  const model = modelOf($('ai-own-model').value);
  const base = { fn: rec.fn, mode: 'api', model, promptId: rec.promptId, promptVersion: rec.promptVersion, payloadHash: rec.payloadHash, role: rec.role };
  try {
    const r = await fetch(`schemas/ai/${rec.schemaId}.schema.json`, { cache: 'no-cache' });
    const schema = await r.json();
    const request = buildApiRequest({ model, promptText: rec.promptText, responseSchema: schema, document: rec.attachment });
    await Store.aiAudit(db, { ...base, action: 'ai_send' });
    const res = await callApi({ key, request, fetchImpl: (u, o) => fetch(u, o) });
    if (!res.ok) {
      await Store.aiAudit(db, { ...base, action: 'ai_response', outcome: res.code });
      say('ai_err_' + res.code, true);
      return;
    }
    const responseHash = await Store.sha256Hex(res.text);
    await Store.putExchange(db, { ...rec, status: 'answered', responseText: res.text, responseHash, model: res.model });
    await Store.aiAudit(db, { ...base, model: res.model, action: 'ai_response', responseHash, outcome: 'received' });
    rec = null;
    say('ai_own_done', false);
  } catch (e) {
    say(e && e.message === 'ai_exchange_key_forbidden' ? 'ai_err_ai_api_bad_response' : 'ai_err_generic', true);
  } finally { busy = false; lock(!rec); }
}

async function init() {
  window.i18n.apply();
  $('ai-own-model').replaceChildren(...MODELS.map(m => Object.assign(document.createElement('option'), { value: m, textContent: m })));
  $('ai-own-key').value = getKey();
  $('ai-own-clear').addEventListener('click', () => { clearKey(); $('ai-own-key').value = ''; say('ai_own_cleared', false); });
  $('ai-own-send').addEventListener('click', send);
  lock(true);
  try { db = await new Store.LocalAdapter().open(); } catch (e) { say('ai_err_no_storage', true); return; }
  const lab = await Store.getLabSettings(db);
  if (lab.aiEnabled !== true) { clearKey(); $('ai-own-key').value = ''; say('ai_own_disabled', true); return; }   // o'chirilgan — kalit ham o'chiriladi
  $('ai-own-model').value = modelOf(lab.aiModel);
  await Store.purgeExchange(db, Date.now());
  let id = '';
  try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (e) { id = ''; }
  rec = /^aix:[a-z0-9-]+$/.test(id) ? await Store.getExchange(db, id) : null;
  if (!rec || rec.status !== 'pending' || typeof rec.promptText !== 'string') { rec = null; say('ai_own_no_request', true); return; }
  $('ai-own-prompt').value = rec.promptText;                    // textarea.value — matn sifatida
  if (rec.attachment && rec.attachment.kind === 'image' && rec.attachment.mediaType !== 'application/pdf') {
    const img = $('ai-own-image');
    img.src = `data:${rec.attachment.mediaType};base64,${rec.attachment.data}`;
    img.hidden = false;
  }
  lock(false);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
