/* Statik xavfsizlik tekshiruvlari (P02 qabul mezonlari).
   `grep -rn "rawPwd\|SUPER_ADMIN\|uc_super" src *.html` — bo'sh bo'lishi shart. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const HTML = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

function walk(dir) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}
const SRC = walk('src').filter(f => /\.(js|css|html)$/.test(f));

test('qabul mezoni: src va *.html da rawPwd / SUPER_ADMIN / uc_super yo\'q', () => {
  const hits = [];
  for (const f of [...SRC, ...HTML]) {
    read(f).split('\n').forEach((line, i) => {
      if (/rawPwd|SUPER_ADMIN|uc_super/.test(line)) hits.push(`${f}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(hits, []);
});

test('src va *.html da parol xeshi kodi yo\'q (hashPwd, passwordHash)', () => {
  const hits = [...SRC, ...HTML].filter(f => /hashPwd|passwordHash/.test(read(f)));
  assert.deepEqual(hits, []);
});

test('HTML: inline on*= hodisa atributlari yo\'q', () => {
  for (const f of HTML) {
    const m = read(f).match(/<[^>]+\son[a-z]+\s*=/gi);
    assert.equal(m, null, `${f}: ${m && m[0]}`);
  }
});

test('HTML: inline <script> yo\'q, barcha skriptlar lokal', () => {
  for (const f of HTML) {
    const tags = read(f).match(/<script\b[^>]*>/gi) || [];
    assert.ok(tags.length > 0, f);
    for (const t of tags) {
      const src = (t.match(/\ssrc="([^"]+)"/) || [])[1];
      assert.ok(src, `${f}: inline script ${t}`);
      assert.ok(!/^(https?:)?\/\//.test(src), `${f}: tashqi skript ${src}`);
      assert.ok(fs.existsSync(path.join(ROOT, src)), `${f}: fayl yo'q ${src}`);
    }
  }
});

test('HTML: CSP <meta> — script-src \'self\', unsafe-inline/eval skriptlar uchun yo\'q', () => {
  for (const f of HTML) {
    const m = read(f).match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
    assert.ok(m, `${f}: CSP yo'q`);
    const dir = Object.fromEntries(m[1].split(';').map(s => s.trim()).filter(Boolean)
      .map(s => { const [k, ...v] = s.split(/\s+/); return [k, v]; }));
    assert.deepEqual(dir['script-src'], ["'self'"], f);
    assert.deepEqual(dir['object-src'], ["'none'"], f);
    assert.deepEqual(dir['default-src'], ["'self'"], f);
    assert.ok(dir['base-uri'] && dir['base-uri'][0] === "'self'", f);
    assert.ok(!(dir['connect-src'] || []).some(s => s === '*' || s.startsWith('http:')), f);
  }
});

test('JS: kod satrlarida innerHTML/onclick ga inline handler yozilmaydi', () => {
  const hits = SRC.filter(f => f.endsWith('.js')).filter(f => /on(click|error|load|mouseover)\s*=\s*["'`]/i.test(read(f)));
  assert.deepEqual(hits, []);
});

test('vendor/firebase: fayllar SHA384SUMS.txt bilan mos, LICENSE bor', () => {
  const dir = 'vendor/firebase/9.23.0';
  assert.ok(fs.existsSync(path.join(ROOT, dir, 'LICENSE')));
  assert.match(read(`${dir}/LICENSE`), /Apache License/);
  const lines = read(`${dir}/SHA384SUMS.txt`).trim().split('\n');
  assert.equal(lines.length, 3);
  for (const l of lines) {
    const [sri, file] = l.split(/\s+/);
    const h = 'sha384-' + crypto.createHash('sha384').update(fs.readFileSync(path.join(ROOT, dir, file))).digest('base64');
    assert.equal(h, sri, file);
  }
});

test('firestore.rules: default deny, superadmin custom claim', () => {
  const r = read('firestore.rules');
  assert.match(r, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(r, /request\.auth\.token\.superadmin == true/);
  assert.ok(!/allow read, write: if true/.test(r));
});

test('.gitignore: service account kalitlari', () => {
  const g = read('.gitignore');
  assert.match(g, /^serviceAccount\*\.json$/m);
  assert.match(g, /^\*\.key\.json$/m);
});

test('firebase-admin va boshqa paketlar faqat devDependencies', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies, undefined);
  assert.ok(pkg.devDependencies['firebase-admin']);
  for (const f of [...SRC, ...HTML]) assert.ok(!/node_modules|firebase-admin/.test(read(f)), f);
});

test('hisoblash dvigateli (src/js/calc.js) P02 da o\'zgarmagan', () => {
  // P00 dagi calc.js SHA-256 (commit 6cc4881). Dvigatelni o'zgartirish — P03.
  const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src/js/calc.js'))).digest('hex');
  assert.equal(h, process.env.CALC_SHA256 || require('./calc.sha256.json').sha256);
});
