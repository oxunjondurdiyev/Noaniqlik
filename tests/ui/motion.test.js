/* P16: harakat — faqat CSS (transform / opacity); prefers-reduced-motion: reduce da hamma animatsiya o'chadi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const strip = css => css.replace(/\/\*[\s\S]*?\*\//g, '');
const CSS_FILES = fs.readdirSync(path.join(ROOT, 'src/css')).filter(f => f.endsWith('.css')).map(f => 'src/css/' + f);

test('motion.css: prefers-reduced-motion: reduce — barcha animatsiya va o\'tishlar o\'chiriladi', () => {
  const css = strip(read('src/css/motion.css'));
  const m = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\}\s*$/);
  assert.ok(m, 'reduce bloki fayl oxirida bo\'lishi kerak (keyingi qoidalar uni bosib ketmasin)');
  assert.match(m[1], /\*, \*::before, \*::after\s*\{[^}]*animation: none !important;[^}]*transition: none !important;/);
});

test('motion.css har bir sahifada (animatsiyali CSS yuklangan joyda) oxirgi uslub fayli', () => {
  for (const page of ['index.html']) {
    const links = [...read(page).matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
    assert.equal(links[links.length - 1], 'src/css/motion.css', page);
  }
});

test('@keyframes faqat transform / opacity ni o\'zgartiradi (joylashuvni qayta hisoblatmaydi)', () => {
  for (const f of ['src/css/motion.css', 'src/css/shell.css', ...CSS_FILES.filter(x => /vizlab|results|sheet|lab2/.test(x))]) {
    if (!fs.existsSync(path.join(ROOT, f))) continue;
    const css = strip(read(f));
    for (const k of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
      const props = [...k[2].matchAll(/([a-z-]+)\s*:/g)].map(x => x[1]);
      for (const p of props) assert.ok(['transform', 'opacity', 'stroke-dashoffset'].includes(p), `${f} @keyframes ${k[1]}: ${p}`);
    }
  }
});

test('animatsiya cheksiz bo\'lsa — sekin (≥ 2 s): bezovta qilmaydi', () => {
  const css = strip(read('src/css/motion.css'));
  for (const m of css.matchAll(/animation:\s*([\w-]+)\s+([\d.]+)(ms|s)[^;]*infinite/g)) {
    const sec = Number(m[2]) / (m[3] === 'ms' ? 1000 : 1);
    assert.ok(sec >= 2, `${m[1]}: ${sec} s`);
  }
});

test('JS da doimiy animatsiya sikli faqat Vizual laboratoriya va MC progressida; u yerda visibilitychange bor', () => {
  const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(dir + '/' + d.name) : [dir + '/' + d.name]));
  const users = walk('src').filter(f => f.endsWith('.js') && /requestAnimationFrame/.test(read(f)));
  for (const f of users) {
    assert.ok(/^src\/ui\/(vizlab|mc)\//.test(f), f + ': requestAnimationFrame faqat vizlab / mc da');
  }
  const loops = users.filter(f => /^src\/ui\/vizlab\//.test(f));
  if (loops.length) assert.ok(walk('src/ui/vizlab').some(f => /visibilitychange/.test(read(f))), 'vizlab: sahifa yashirin bo\'lsa sikl to\'xtashi kerak');
});
