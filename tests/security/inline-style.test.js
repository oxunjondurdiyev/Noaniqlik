/* P16: style-src 'unsafe-inline' ni olib tashlash yo'lidagi nazorat ("ratchet").
   Holat (docs/RISKS.md R-29): validation.html da 'unsafe-inline' olib tashlangan; index / admin / superadmin da qolgan —
   sababi eski auth / to'lov / hisob-faktura markup'idagi inline uslub atributlari. Bu test:
     • qolgan inline uslublar SONI OSHMASLIGINI (faqat kamayishi mumkin) va
     • P16 da yozilgan / tozalangan fayllarda ular UMUMAN YO'QLIGINI tekshiradi.
   Son kamaytirilsa — pastdagi chegarani ham kamaytiring. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(dir + '/' + d.name) : [dir + '/' + d.name]));
const count = (s, re) => (s.match(re) || []).length;
const cspOf = page => Object.fromEntries(read(page).match(/Content-Security-Policy" content="([^"]+)"/)[1].split(';').map(x => x.trim()).filter(Boolean).map(x => { const [k, ...v] = x.split(/\s+/); return [k, v]; }));

/* Qolgan inline uslublar (2026-11-20). Faqat KAMAYISHI mumkin. */
const LIMITS = {
  html: { 'index.html': { attr: 52, tag: 1 }, 'admin.html': { attr: 19, tag: 0 }, 'superadmin.html': { attr: 8, tag: 1 }, 'validation.html': { attr: 0, tag: 0 } },
  js: { 'src/ui/templates.js': 60, 'src/js/table.js': 14 },
};

test('HTML: inline uslub atributlari va <style> teglari soni oshmagan', () => {
  for (const [page, lim] of Object.entries(LIMITS.html)) {
    const html = read(page);
    assert.ok(count(html, /\sstyle="/g) <= lim.attr, `${page}: style= ${count(html, /\sstyle="/g)} > ${lim.attr}`);
    assert.ok(count(html, /<style\b/g) <= lim.tag, `${page}: <style> ${count(html, /<style\b/g)} > ${lim.tag}`);
  }
  for (const page of fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))) assert.ok(LIMITS.html[page], page + ': yangi sahifa — LIMITS ga 0 bilan qo\'shing');
});

test('JS: HTML satrlaridagi style="…" faqat ikki eski faylda va soni oshmagan; qolgan hamma joyda yo\'q', () => {
  for (const f of walk('src').filter(x => x.endsWith('.js'))) {
    const n = count(read(f), /style=\\?"/g);
    const lim = LIMITS.js[f] || 0;
    assert.ok(n <= lim, `${f}: style= ${n} > ${lim}`);
  }
});

test('P16 qismlari (qobiq, natijalar, varaq, hisobot, laboratoriya, vizual laboratoriya) — index.html da ham inline uslubsiz', () => {
  const html = read('index.html');
  const app = html.slice(html.indexOf('<div id="app"'), html.indexOf('<!-- ══════════════════════════════════════════════════\n     PRINT REPORT'));
  assert.ok(app.length > 5000);
  assert.equal(count(app, /\sstyle="/g), 0, 'ilova qobig\'i va yorliqlar');
});

test('CSP: validation.html — style-src \'self\' (unsafe-inline yo\'q); qolgan sahifalarda tashqi uslub manbai yo\'q', () => {
  assert.deepEqual(cspOf('validation.html')['style-src'], ["'self'"]);
  for (const page of ['index.html', 'admin.html', 'superadmin.html']) {
    const v = cspOf(page)['style-src'];
    assert.ok(v.includes("'self'") && v.every(x => x === "'self'" || x === "'unsafe-inline'"), page + ': ' + v.join(' '));
  }
});
