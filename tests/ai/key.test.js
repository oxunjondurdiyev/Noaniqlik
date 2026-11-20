/* P14: API kaliti va tarmoq (egasi qarorlari A, S-7 b). Kalit faqat sessionStorage da; doimiy xotira, IndexedDB,
   eksport, audit va xato xabarlarida yo'q. Nusxa-qo'y rejimida (asosiy sahifalar) hech qanday tashqi fetch yo'q.
   Tashqi chaqiruv faqat ai.html zanjirida. Haqiqiy API chaqirilmaydi — faqat mock. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { IDBFactory } = require('fake-indexeddb');
const K = require('../../src/ui/ai/key.js');
const T = require('../../src/ai/transport-api.js');
const S = require('../../src/storage/index.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
const code = f => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const KEY = 'sk-ant-api03-KANAREYKA1234567890abcdef';
const memory = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m }; };

/** Statik va dinamik importlar bo'yicha modul grafi (JS fayl → erishiladigan fayllar) */
function reach(entry, seen = new Set()) {
  if (seen.has(entry) || !fs.existsSync(path.join(ROOT, entry))) return seen;
  seen.add(entry);
  for (const m of code(entry).matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g)) {
    const spec = m[1] || m[2] || m[3];
    if (spec.startsWith('.')) reach(path.posix.normalize(path.posix.join(path.posix.dirname(entry), spec)), seen);
  }
  return seen;
}
const pageScripts = html => [...read(html).matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
const pageGraph = html => { const seen = new Set(); pageScripts(html).forEach(s => reach(s, seen)); return seen; };

test('kalit: faqat berilgan sessionStorage da; o\'chirish tugmasi; boshqa kalit nomi yo\'q', () => {
  const ss = memory();
  assert.equal(K.getKey(ss), '');
  K.setKey('  ' + KEY + ' ', ss);
  assert.deepEqual([...ss._m.entries()], [[K.KEY_NAME, KEY]]);
  assert.equal(K.getKey(ss), KEY);
  K.clearKey(ss);
  assert.equal(ss._m.size, 0);
  assert.equal(K.KEY_NAME, 'uc_ai_key_v1');
});

test('statik: kalit nomi faqat key.js da; AI kodida doimiy xotira (localStorage) yo\'q; key.js faqat ai.html zanjirida', () => {
  const files = walk('src').filter(f => f.endsWith('.js'));
  assert.deepEqual(files.filter(f => read(f).includes('uc_ai_key_v1')), ['src/ui/ai/key.js']);
  for (const f of files.filter(f => f.startsWith('src/ai/') || f.startsWith('src/ui/ai') || f === 'src/storage/ai.js')) {
    assert.doesNotMatch(code(f), /\blocalStorage\b/, f);
    assert.doesNotMatch(code(f), /console\.(log|info|debug|warn|error)/, f);                  // kalit / javob logga chiqmaydi
    assert.doesNotMatch(code(f), /\beval\s*\(|new\s+Function\b/, f);
  }
  assert.doesNotMatch(code('src/ui/ai/key.js'), /indexedDB|LocalAdapter|import\s/);
  const usesSession = files.filter(f => (f.startsWith('src/ai/') || f.startsWith('src/ui/ai')) && /sessionStorage/.test(code(f)));
  assert.deepEqual(usesSession, ['src/ui/ai/key.js']);
  for (const html of ['index.html', 'admin.html', 'superadmin.html', 'validation.html']) {
    const g = pageGraph(html);
    for (const banned of ['src/ui/ai/key.js', 'src/ui/ai/own-key.js', 'src/ai/transport-api.js']) assert.ok(!g.has(banned), `${html} → ${banned}`);
  }
  const ai = pageGraph('ai.html');
  for (const need of ['src/ui/ai/own-key.js', 'src/ui/ai/key.js', 'src/ai/transport-api.js']) assert.ok(ai.has(need), need);
});

test('nusxa-qo\'y rejimi: asosiy sahifalar zanjirida tashqi manzil yo\'q; fetch faqat o\'z statik fayllariga', () => {
  const g = pageGraph('index.html');
  assert.ok(g.has('src/ui/ai-boot.js') && g.has('src/ui/ai/app.js') && g.has('src/ai/payload.js') && g.has('src/ai/response.js'));
  for (const f of [...g].filter(f => f.startsWith('src/ai/') || f.startsWith('src/ui/ai'))) {
    assert.doesNotMatch(code(f), /api\.anthropic\.com|https?:\/\//, f);
    assert.doesNotMatch(code(f), /XMLHttpRequest|WebSocket|sendBeacon|EventSource/, f);
  }
  // sof modullarda fetch umuman yo'q; UI kontrollerida — faqat nisbiy 'schemas/…' manzili
  for (const f of ['src/ai/payload.js', 'src/ai/response.js', 'src/ai/prompts/index.js', 'src/ui/ai/view.js', 'src/ui/ai-boot.js']) assert.doesNotMatch(code(f), /\bfetch\s*\(/, f);
  const calls = [...code('src/ui/ai/app.js').matchAll(/\bfetch\s*\(([^)]*)\)/g)].map(m => m[1].trim());
  assert.deepEqual(calls, ['url, { cache: \'no-cache\' }']);
  assert.match(code('src/ui/ai/app.js'), /fetchJSON\(`schemas\/ai\/\$\{PROMPTS\[fn\]\.schemaId\}\.schema\.json`\)/);
  assert.match(code('src/ui/ai/app.js'), /fetchJSON\('schemas\/methodology\.schema\.json'\)/);
});

const okBody = { content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"summary":"a","items":[]}' }], stop_reason: 'end_turn', model: 'claude-opus-5-5' };
const mockFetch = (status, body, calls) => async (url, init) => { calls.push({ url, init }); return { ok: status >= 200 && status < 300, status, json: async () => body }; };
const SCHEMA = { $schema: 'x', $id: 'y', title: 't', type: 'object', additionalProperties: false, required: ['summary'], properties: { summary: { type: 'string' } } };

test('API so\'rovi: manzil, sarlavhalar, tanasi hujjatga mos; kalit faqat x-api-key sarlavhasida; taqiqlangan parametrlar yo\'q', async () => {
  const req = T.buildApiRequest({ model: 'claude-sonnet-5-5', promptText: 'PROMPT', responseSchema: SCHEMA });
  assert.equal(req.url, 'https://api.anthropic.com/v1/messages');
  assert.deepEqual(req.headers, { 'content-type': 'application/json', 'anthropic-version': '2026-10-21', 'anthropic-dangerous-direct-browser-access': 'true' });
  assert.deepEqual(req.body, { model: 'claude-sonnet-5-5', max_tokens: 16000, messages: [{ role: 'user', content: [{ type: 'text', text: 'PROMPT' }] }],
    output_config: { format: { type: 'json_schema', schema: { type: 'object', additionalProperties: false, required: ['summary'], properties: { summary: { type: 'string' } } } } } });
  for (const k of ['temperature', 'top_p', 'top_k', 'thinking', 'tool_choice', 'system', 'stream']) assert.equal(k in req.body, false, k);
  assert.equal(T.buildApiRequest({ model: 'gpt-x', promptText: 'p', responseSchema: SCHEMA }).body.model, 'claude-opus-5-5');     // noma'lum model → standart
  assert.deepEqual([T.DEFAULT_MODEL, [...T.MODELS]], ['claude-opus-5-5', ['claude-opus-5-5', 'claude-sonnet-5-5']]);
  assert.match(read('src/ui/tpl/app.js'), /const AI_MODELS = \['claude-opus-5-5', 'claude-sonnet-5-5'\];/);              // sozlamadagi ro'yxat bilan bir xil
  const img = T.buildApiRequest({ promptText: 'p', responseSchema: SCHEMA, document: { kind: 'image', mediaType: 'image/png', data: 'AAAA' } });
  assert.deepEqual(img.body.messages[0].content[0], { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } });
  const pdf = T.buildApiRequest({ promptText: 'p', responseSchema: SCHEMA, document: { kind: 'image', mediaType: 'application/pdf', data: 'AAAA' } });
  assert.equal(pdf.body.messages[0].content[0].type, 'document');
  const calls = [];
  const r = await T.callApi({ key: KEY, request: req, fetchImpl: mockFetch(200, okBody, calls) });
  assert.deepEqual(r, { ok: true, text: '{"summary":"a","items":[]}', model: 'claude-opus-5-5' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers['x-api-key'], KEY);
  assert.deepEqual([calls[0].init.method, calls[0].init.credentials, calls[0].init.referrerPolicy], ['POST', 'omit', 'no-referrer']);
  assert.ok(!calls[0].init.body.includes(KEY) && !calls[0].url.includes(KEY));
  assert.ok(!JSON.stringify(req).includes(KEY));                                               // so'rov obyekti kalitni saqlamaydi
});

test('API xatolari: kod bo\'yicha; natijada kalit va javob matni yo\'q; noto\'g\'ri kalit ko\'rinishida tarmoq chaqirilmaydi', async () => {
  const req = T.buildApiRequest({ promptText: 'p', responseSchema: SCHEMA });
  const run = async (status, body) => { const calls = []; const r = await T.callApi({ key: KEY, request: req, fetchImpl: mockFetch(status, body, calls) }); assert.ok(!JSON.stringify(r).includes('sk-ant-')); return r.code; };
  assert.equal(await run(401, { error: { type: 'authentication_error', message: 'invalid x-api-key ' + KEY } }), 'ai_api_auth');
  assert.equal(await run(401, { error: { message: 'CORS requests are not allowed for this Organization because of its settings' } }), 'ai_api_cors_org');
  assert.equal(await run(429, {}), 'ai_api_rate_limit');
  assert.equal(await run(529, {}), 'ai_api_overloaded');
  assert.equal(await run(500, {}), 'ai_api_server');
  assert.equal(await run(413, {}), 'ai_api_too_large');
  assert.equal(await run(200, { ...okBody, stop_reason: 'refusal' }), 'ai_api_refusal');
  assert.equal(await run(200, { ...okBody, stop_reason: 'max_tokens' }), 'ai_api_truncated');
  assert.equal(await run(200, { content: [], stop_reason: 'end_turn' }), 'ai_api_bad_response');
  assert.equal(await run(200, null), 'ai_api_bad_response');
  const calls = [];
  for (const bad of ['', 'abc', 'sk-ant-x', 'Bearer ' + KEY, KEY + ' x']) assert.equal((await T.callApi({ key: bad, request: req, fetchImpl: mockFetch(200, okBody, calls) })).code, 'ai_key_format');
  assert.equal(calls.length, 0);
  assert.equal((await T.callApi({ key: KEY, request: { ...req, url: 'https://evil.example/v1/messages' }, fetchImpl: mockFetch(200, okBody, calls) })).code, 'ai_api_bad_request');
  assert.equal(calls.length, 0);                                                              // boshqa manzilga kalit yuborilmaydi
  assert.equal((await T.callApi({ key: KEY, request: req, fetchImpl: async () => { throw new Error('net ' + KEY); } })).code, 'ai_api_network');
});

test('to\'liq oqim (mock): kalit IndexedDB, eksport va auditda yo\'q', async () => {
  const db = await new S.LocalAdapter({ indexedDB: new IDBFactory(), name: 'uc-ai-key' }).open();
  const ss = memory();
  K.setKey(KEY, ss);
  const id = S.newExchangeId();
  const rec = await S.putExchange(db, { id, fn: 'explain', role: 'admin', lang: 'uz', mode: 'api', promptId: 'uc-ai/explain', promptVersion: '1.0.0', promptText: 'PROMPT', payloadHash: 'a'.repeat(64), schemaId: 'explain', createdAt: new Date().toISOString(), status: 'pending' });
  const calls = [];
  const res = await T.callApi({ key: K.getKey(ss), request: T.buildApiRequest({ promptText: rec.promptText, responseSchema: SCHEMA }), fetchImpl: mockFetch(200, okBody, calls) });
  await S.aiAudit(db, { action: 'ai_send', fn: 'explain', mode: 'api', model: res.model, payloadHash: rec.payloadHash, role: 'admin' });
  await S.putExchange(db, { ...rec, status: 'answered', responseText: res.text, model: res.model });
  await S.saveLabSettings(db, { ...(await S.getLabSettings(db)), aiEnabled: true }, { actor: 'admin' });
  const dump = [await S.exportAll(db), JSON.stringify(await db.listAudit()), JSON.stringify(await db.list('ai_exchange')), JSON.stringify(await db.list('settings'))].join('\n');
  assert.ok(!dump.includes('sk-ant-') && !dump.includes('KANAREYKA'));
  assert.equal(ss._m.size, 1);                                                                 // yagona joy — sessionStorage
});
