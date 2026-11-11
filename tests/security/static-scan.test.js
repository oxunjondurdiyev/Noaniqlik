/* Statik xavfsizlik tekshiruvlari (P02): parollar/sirlar yo'q, inline skript va
   on*-handler yo'q, CSP bor, tashqi skriptlar yo'q, yagona escape. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// Izohlarsiz kod: HTML <!-- --> va JS izoh qatorlari (hujjatlashtirish uchun eslatilishi mumkin)
const code = f => read(f)
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const PAGES = ['index.html', 'admin.html', 'superadmin.html'];

function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, exts, out);
    else if (exts.includes(path.extname(e.name))) out.push(rel);
  }
  return out;
}
const SITE_JS = walk('src', ['.js']);

test('repoda super-admin login/paroli va eski parol mexanizmi qolmagan (R-S2, R-S3)', () => {
  const files = [...PAGES, ...SITE_JS];
  const banned = [/SUPER_ADMIN/, /uc_super_2024/, /rawPwd/, /passwordHash/, /hashPwd/, /uc_noaniqlik_v1/];
  for (const f of files) {
    const s = code(f);
    for (const re of banned) assert.ok(!re.test(s), `${f}: ${re} topildi`);
  }
});

test('imzosiz localStorage sessiyasi ishlatilmaydi (R-S4)', () => {
  for (const f of [...PAGES, ...SITE_JS]) {
    const s = code(f);
    const hits = s.split('\n').filter(l => /uc_session|uc_sa_session/.test(l) && !/removeItem/.test(l));
    assert.deepEqual(hits, [], f);
  }
});

test('HTML sahifalarda inline <script> va on*-atributlar yo\'q (CSP)', () => {
  for (const f of PAGES) {
    const s = code(f);
    const inline = [...s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(m => !/\bsrc=/.test(m[1]) || m[2].trim() !== '');
    assert.deepEqual(inline.map(m => m[0].slice(0, 80)), [], `${f}: inline skript`);
    const handlers = s.match(/<[^>]+\son[a-z]+\s*=/gi) || [];
    assert.deepEqual(handlers, [], `${f}: inline handler`);
  }
});

test('JS shablonlarida on*-atributlar yo\'q', () => {
  for (const f of SITE_JS) {
    const hits = read(f).split('\n').filter(l => /\son(click|change|input|error|load|mouseover|submit)\s*=\s*["'`]/.test(l));
    assert.deepEqual(hits, [], f);
  }
});

test('har bir sahifada qat\'iy CSP meta tegi', () => {
  for (const f of PAGES) {
    const m = read(f).match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
    assert.ok(m, `${f}: CSP yo'q`);
    const csp = Object.fromEntries(m[1].split(';').map(x => x.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
    assert.deepEqual(csp['script-src'], ["'self'"], `${f}: script-src`);
    assert.deepEqual(csp['object-src'], ["'none'"]);
    assert.ok(csp['default-src'].includes("'self'"));
    assert.ok(csp['base-uri']);
  }
});

test('barcha skriptlar lokal (vendor/ yoki src/) — CDN yo\'q (R-14)', () => {
  for (const f of PAGES) {
    const srcs = [...read(f).matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
    assert.ok(srcs.length > 0);
    for (const src of srcs) {
      assert.ok(/^(vendor|src)\//.test(src), `${f}: ${src}`);
      assert.ok(fs.existsSync(path.join(ROOT, src)), `${f}: ${src} mavjud emas`);
    }
  }
});

test('escape funksiyasi yagona: src/ui/escape.js (R-S5)', () => {
  for (const f of [...SITE_JS, ...PAGES]) {
    if (f === path.join('src', 'ui', 'escape.js')) continue;
    const s = read(f);
    assert.ok(!/replace\(\/&\/g\s*,\s*'&amp;'\)/.test(s), `${f}: o'z escape nusxasi`);
  }
});

test('AUTH_EMAIL_DOMAIN mijoz va skriptlarda bir xil', () => {
  const a = read('src/js/firebase-config.js').match(/AUTH_EMAIL_DOMAIN = '([^']+)'/)[1];
  const b = require('../../scripts/lib/admin.js').AUTH_EMAIL_DOMAIN;
  assert.equal(a, b);
});

test('mijoz tarifni o\'zgartira olmaydi: upgradePlan yo\'q, plan faqat super-admin sahifasida yoziladi (R-15)', () => {
  for (const f of SITE_JS) {
    const s = read(f);
    assert.ok(!/upgradePlan/.test(s), `${f}: upgradePlan`);
    if (!/superadmin-page\.js$/.test(f)) {
      assert.ok(!/update\('organizations'[^)]*\{\s*(plan|active|paymentStatus|planExpiry)\s*:/.test(s), `${f}: himoyalangan maydon yozilmoqda`);
    }
  }
});

test('firestore.rules: default rad va anonim kirish yo\'q', () => {
  const r = read('firestore.rules');
  assert.match(r, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.ok(!/allow (read|write|get|list|create|update|delete)[^;]*: if true/.test(r));
});
