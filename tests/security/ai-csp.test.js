/* P14 (egasi qarori S-7 b): tashqi AI xizmatiga ulanish ruxsati FAQAT ai.html da. Asosiy sahifalar CSP si
   P14 gacha bo'lgan holatda AYNAN qolgan; ai.html CSP sida connect-src — 'self' va bitta yangi domen. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const csp = f => { const m = read(f).match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/); assert.ok(m, f); return m[1]; };
const dirs = s => Object.fromEntries(s.split(';').map(x => x.trim()).filter(Boolean).map(x => { const [k, ...v] = x.split(/\s+/); return [k, v]; }));

/* P14 gacha bo'lgan CSP (P02 dan beri) — so'zma-so'z */
const MAIN_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; frame-src https://noaniqlikbazasi.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self'";

test('asosiy sahifalar (index, admin, superadmin): CSP o\'zgarmagan; api.anthropic.com yo\'q', () => {
  for (const f of ['index.html', 'admin.html', 'superadmin.html']) {
    assert.equal(csp(f), MAIN_CSP, f);
    assert.ok(!read(f).includes('anthropic'), f);
  }
  assert.ok(!csp('validation.html').includes('anthropic'));
});

test('ai.html: connect-src — faqat \'self\' va https://api.anthropic.com; skript faqat \'self\'; inline skript va handler yo\'q', () => {
  const d = dirs(csp('ai.html'));
  assert.deepEqual(d['connect-src'], ["'self'", 'https://api.anthropic.com']);
  assert.deepEqual(d['script-src'], ["'self'"]);
  assert.deepEqual(d['default-src'], ["'self'"]);
  assert.deepEqual(d['object-src'], ["'none'"]);
  assert.deepEqual(d['form-action'], ["'none'"]);
  assert.equal(d['frame-src'], undefined);
  // P14 gacha bo'lgan CSP ga nisbatan connect-src da YAGONA yangi domen
  const before = new Set(dirs(MAIN_CSP)['connect-src']);
  assert.deepEqual(d['connect-src'].filter(x => !before.has(x)), ['https://api.anthropic.com']);
  const html = read('ai.html');
  assert.equal(html.match(/<[^>]+\son[a-z]+\s*=/gi), null);
  for (const t of html.match(/<script\b[^>]*>/gi)) assert.match(t, /\ssrc="src\//);
  assert.ok(!/firebase/i.test(html));                                                         // Firebase bu sahifada yuklanmaydi
  assert.match(html, /<meta name="referrer" content="no-referrer"/);
  assert.match(html, /<input type="password" id="ai-own-key" autocomplete="off"/);
});

test('tashqi AI manzili kodda faqat transport-api.js da; yig\'iladigan saytga ai.html kiradi', () => {
  const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
  const hits = walk('src').filter(f => f.endsWith('.js') && read(f).replace(/\/\*[\s\S]*?\*\//g, '').includes('api.anthropic.com'));
  assert.deepEqual(hits, ['src/ai/transport-api.js']);
  assert.ok(require('../../scripts/build-site.js').WHITELIST.files.includes('ai.html'));
});
