/* ═══════════════════════════════════════════════════════════════
   TRANSPORT-API.JS — "o'z kaliti" rejimi (P14): Anthropic Messages API so'rovi. SOF modul:
   `fetch` tashqaridan beriladi (fetchImpl), kalit faqat argument sifatida keladi va hech qayerga yozilmaydi.
   Bu modul FAQAT ai.html sahifasida yuklanadi (o'z CSP si: connect-src https://api.anthropic.com) —
   asosiy sahifalar uni import qilmaydi (tests/ai/key.test.js, tests/security/ai-csp.test.js).
   Manba: platform.claude.com hujjatlari, 2026-11-19 da tekshirilgan (docs/AI_DESIGN.md §9):
     POST /v1/messages; sarlavhalar x-api-key, anthropic-version, content-type;
     brauzerdan chaqirish — anthropic-dangerous-direct-browser-access: true;
     javob shakli — output_config.format { type: 'json_schema', schema };
     temperature / top_p / top_k yuborilmaydi (2026-10-21 da 400); thinking ko'rsatilmaydi.
   SDK ishlatilmaydi (loyiha qoidasi: tashqi kutubxona faqat vendor/ da; bitta POST uchun kerak emas).
═══════════════════════════════════════════════════════════════ */

export const API_URL = 'https://api.anthropic.com/v1/messages';
export const API_ORIGIN = 'https://api.anthropic.com';
export const API_VERSION = '2026-10-21';
/** Standart model — hujjat tavsiyasi (Models overview, 2026-11-19); egasi qarori S-2 (a). */
export const DEFAULT_MODEL = 'claude-opus-5-5';
export const MODELS = Object.freeze(['claude-opus-5-5', 'claude-sonnet-5-5']);
export const MAX_TOKENS = 16000;
const KEY_RE = /^sk-ant-[A-Za-z0-9_-]{16,}$/;

export const isKeyFormat = key => typeof key === 'string' && KEY_RE.test(key);
export const modelOf = m => (MODELS.includes(m) ? m : DEFAULT_MODEL);

/**
 * So'rov tanasi (kalitsiz). Rasm / PDF bo'lsa — alohida blok (base64), matn — prompt.
 * @param {{model?:string, promptText:string, responseSchema:object, document?:{kind:string, mediaType?:string, data?:string}}} o
 */
export function buildApiRequest(o) {
  const content = [];
  const d = o.document;
  if (d && d.kind === 'image') {
    content.push(d.mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: d.data } }
      : { type: 'image', source: { type: 'base64', media_type: d.mediaType, data: d.data } });
  }
  content.push({ type: 'text', text: o.promptText });
  const schema = JSON.parse(JSON.stringify(o.responseSchema));
  for (const k of ['$schema', '$id', 'title']) delete schema[k];
  return {
    url: API_URL,
    headers: { 'content-type': 'application/json', 'anthropic-version': API_VERSION, 'anthropic-dangerous-direct-browser-access': 'true' },
    body: { model: modelOf(o.model), max_tokens: MAX_TOKENS, messages: [{ role: 'user', content }], output_config: { format: { type: 'json_schema', schema } } },
  };
}

const STATUS_CODES = { 400: 'ai_api_bad_request', 401: 'ai_api_auth', 402: 'ai_api_billing', 403: 'ai_api_forbidden', 404: 'ai_api_not_found', 413: 'ai_api_too_large', 429: 'ai_api_rate_limit', 529: 'ai_api_overloaded' };

/**
 * API chaqiruvi. Xato obyektida kalit va javob matni BO'LMAYDI — faqat kod va HTTP holati.
 * @param {{key:string, request:ReturnType<typeof buildApiRequest>, fetchImpl:Function}} o
 * @returns {Promise<{ok:true, text:string, model:string} | {ok:false, code:string, status?:number}>}
 */
export async function callApi(o) {
  if (!isKeyFormat(o.key)) return { ok: false, code: 'ai_key_format' };
  if (typeof o.fetchImpl !== 'function') return { ok: false, code: 'ai_api_unavailable' };
  if (o.request.url !== API_URL) return { ok: false, code: 'ai_api_bad_request' };
  let res;
  try {
    res = await o.fetchImpl(o.request.url, {
      method: 'POST', headers: { ...o.request.headers, 'x-api-key': o.key }, body: JSON.stringify(o.request.body),
      credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store',
    });
  } catch (e) { return { ok: false, code: 'ai_api_network' }; }
  let json = null;
  try { json = await res.json(); } catch (e) { json = null; }
  if (!res.ok) {
    // 401 + "CORS requests are not allowed for this Organization" — kalit xatosi emas, tashkilot sozlamasi (Errors hujjati)
    const msg = json && json.error && typeof json.error.message === 'string' ? json.error.message : '';
    if (res.status === 401 && /^CORS requests are not allowed/.test(msg)) return { ok: false, code: 'ai_api_cors_org', status: 401 };
    return { ok: false, code: STATUS_CODES[res.status] || (res.status >= 500 ? 'ai_api_server' : 'ai_api_bad_request'), status: res.status };
  }
  if (!json || !Array.isArray(json.content)) return { ok: false, code: 'ai_api_bad_response', status: res.status };
  if (json.stop_reason === 'refusal') return { ok: false, code: 'ai_api_refusal', status: res.status };
  if (json.stop_reason !== 'end_turn') return { ok: false, code: json.stop_reason === 'max_tokens' ? 'ai_api_truncated' : 'ai_api_bad_response', status: res.status };
  const block = json.content.find(b => b && b.type === 'text' && typeof b.text === 'string');
  if (!block) return { ok: false, code: 'ai_api_bad_response', status: res.status };
  return { ok: true, text: block.text, model: typeof json.model === 'string' ? json.model : o.request.body.model };
}
