/* src/ui/escape.js — yagona escHtml (RISKS R-S5) */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { escHtml } = require('../../src/ui/escape.js');

test('escHtml: & < > " \' almashtiriladi', () => {
  assert.equal(escHtml(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
});
test('escHtml: XSS namunalari matnga aylanadi', () => {
  assert.equal(escHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(escHtml(`' onmouseover='alert(1)`), '&#39; onmouseover=&#39;alert(1)');
  assert.ok(!/[<>"']/.test(escHtml(`"><script>alert('x')</script>`)));
});
test('escHtml: null/undefined → bo\'sh satr; son va boshqa turlar → String', () => {
  assert.equal(escHtml(null), '');
  assert.equal(escHtml(undefined), '');
  assert.equal(escHtml(0), '0');
  assert.equal(escHtml(-1.5e-3), '-0.0015');
  assert.equal(escHtml(false), 'false');
});
test('escHtml: oddiy matn o\'zgarmaydi (o\'zbek, rus, birliklar)', () => {
  const s = 'Ahmad Karimov — Ахмад; ρ = m/V, g/cm³, ±0,021';
  assert.equal(escHtml(s), s);
});
