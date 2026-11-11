'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { escHtml, escAttr } = require('../../src/ui/escape.js');

test('escHtml: & < > " \' belgilarining hammasi escape qilinadi', () => {
  assert.equal(escHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});
test('escHtml: XSS komponent nomi matnga aylanadi', () => {
  const out = escHtml('<img src=x onerror=alert(1)>');
  assert.equal(out, '&lt;img src=x onerror=alert(1)&gt;');
  assert.ok(!/[<>]/.test(out));
});
test('escHtml: bir tirnoqli atributdan chiqib bo\'lmaydi', () => {
  assert.ok(!escHtml("x' onmouseover='alert(1)").includes("'"));
});
test('escHtml: null/undefined → bo\'sh, son → satr', () => {
  assert.equal(escHtml(null), '');
  assert.equal(escHtml(undefined), '');
  assert.equal(escHtml(0), '0');
  assert.equal(escHtml(-1.25e-3), '-0.00125');
});
test('escAttr === escHtml', () => assert.equal(escAttr, escHtml));
