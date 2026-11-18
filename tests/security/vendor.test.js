/* P05b: vendor/ — tashqi kutubxonalar aniq versiya, LICENSE va SHA-256 bilan (CLAUDE.md; vendor/README.md).
   npm'dagi zaif `xlsx` paketi ishlatilmaydi; kutubxonalar sahifa ochilganda emas, kerak bo'lganda yuklanadi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const sha256 = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');

test('vendor/SHA256SUMS.txt: har bir fayl xeshi mos; vendor/ dagi har bir .js / .mjs / LICENSE ro\'yxatda', () => {
  const sums = read('vendor/SHA256SUMS.txt').trim().split('\n').map(l => l.trim().split(/\s+/));
  assert.ok(sums.length >= 7);
  for (const [hash, file] of sums) assert.equal(sha256('vendor/' + file), hash, file);
  const listed = new Set(sums.map(s => s[1]));
  const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(dir + '/' + d.name) : [dir + '/' + d.name]));
  for (const f of walk('vendor').map(f => f.replace(/^vendor\//, '')).filter(f => /\.(m?js)$/.test(f))) assert.ok(listed.has(f), 'ro\'yxatda yo\'q: ' + f);
});

test('SheetJS: rasmiy tarqatma, versiya ≥ 0.20.2 (CVE-2023-30533, CVE-2024-22363 tuzatilgan); npm `xlsx` bog\'liqligi yo\'q', () => {
  const src = read('vendor/sheetjs/0.20.3/xlsx.js');
  const m = src.match(/XLSX\.version = '(\d+)\.(\d+)\.(\d+)'/);
  assert.ok(m, 'versiya topilmadi');
  const v = m.slice(1).map(Number);
  assert.ok(v[0] > 0 || v[1] > 20 || (v[1] === 20 && v[2] >= 2), m[0]);
  assert.equal(m.slice(1).join('.'), '0.20.3');
  assert.match(read('vendor/sheetjs/0.20.3/LICENSE'), /Apache License\s+Version 2\.0/);
  const pkg = JSON.parse(read('package.json'));
  for (const deps of [pkg.dependencies || {}, pkg.devDependencies || {}]) assert.equal(deps.xlsx, undefined, 'npm xlsx ishlatilmasin');
  assert.ok(!/"node_modules\/xlsx"/.test(read('package-lock.json')));
});

test('qrcode-generator 2.0.4: MIT litsenziyasi, bog\'liqliksiz', () => {
  assert.match(read('vendor/qrcode-generator/2.0.4/LICENSE'), /The MIT License \(MIT\)[\s\S]*Copyright \(c\) 2009 Kazuhiko Arase/);
  const src = read('vendor/qrcode-generator/2.0.4/qrcode.js');
  assert.ok(!/^import\s/m.test(src) && !/require\(/.test(src));
  assert.match(src, /export default qrcode;/);
});

test('CSP mos: vendor kutubxonalarida eval / new Function yo\'q; sahifalarda ular <script> bilan yuklanmaydi (faqat dynamic import)', () => {
  for (const f of ['vendor/sheetjs/0.20.3/xlsx.js', 'vendor/qrcode-generator/2.0.4/qrcode.js']) {
    assert.ok(!/\beval\s*\(|new Function\s*\(/.test(read(f)), f);
  }
  for (const page of ['index.html', 'admin.html', 'superadmin.html']) {
    const html = read(page);
    assert.ok(!/<script[^>]+(sheetjs|xlsx|qrcode)/i.test(html), page + ': kutubxona sahifa bilan birga yuklanmasin');
    assert.match(html, /script-src 'self'/);
    assert.ok(!/script-src[^;"]*(unsafe-inline|unsafe-eval|https:)/.test(html), page);
  }
  // yuklash yagona joyda — src/io/vendor.js, dynamic import bilan
  const loader = read('src/io/vendor.js');
  assert.match(loader, /import\(['"`][^'"`]*vendor\/sheetjs\/0\.20\.3\/xlsx\.js['"`]\)/);
  assert.match(loader, /import\(['"`][^'"`]*vendor\/qrcode-generator\/2\.0\.4\/qrcode\.js['"`]\)/);
  const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(dir + '/' + d.name) : [dir + '/' + d.name]));
  for (const f of walk('src').filter(f => f.endsWith('.js') && f !== 'src/io/vendor.js')) {
    assert.ok(!/vendor\/(sheetjs|qrcode-generator)/.test(read(f)), f + ': kutubxona faqat src/io/vendor.js orqali');
  }
});

test('vendor/README.md: har bir kutubxona versiyasi, litsenziyasi va SHA-256 bilan yozilgan', () => {
  const md = read('vendor/README.md');
  for (const s of ['0.20.3', 'Apache-2.0', 'cdn.sheetjs.com', 'CVE-2023-30533', 'CVE-2024-22363', '2.0.4', 'MIT', '9.23.0']) assert.ok(md.includes(s), s);
  assert.ok(md.includes(sha256('vendor/sheetjs/0.20.3/xlsx.js')));
  assert.ok(md.includes(sha256('vendor/qrcode-generator/2.0.4/qrcode.js')));
});
