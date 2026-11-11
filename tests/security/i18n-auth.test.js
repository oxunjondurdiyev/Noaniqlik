'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const AUTH_I18N = require('../../src/js/i18n-auth.js');

test('i18n-auth: har bir kalit uz/ru/en da va bo\'sh emas', () => {
  const langs = ['uz', 'ru', 'en'];
  const all = new Set(langs.flatMap(l => Object.keys(AUTH_I18N[l])));
  for (const k of all) for (const l of langs) {
    assert.ok(typeof AUTH_I18N[l][k] === 'string' && AUTH_I18N[l][k].trim(), `${l}.${k}`);
  }
});

test('i18n-auth: koddagi har bir auth_/sa_ kaliti lug\'atda bor', () => {
  const root = path.resolve(__dirname, '../..');
  const files = ['src/js/auth.js', 'src/js/app.js', 'src/ui/auth-ui.js', 'src/ui/admin-page.js', 'src/ui/superadmin-page.js',
                 'index.html', 'admin.html', 'superadmin.html'];
  const used = new Set();
  for (const f of files) {
    for (const m of fs.readFileSync(path.join(root, f), 'utf8').matchAll(/['"](auth_[a-z_]+|sa_[a-z_]+)['"]/g)) used.add(m[1]);
  }
  assert.ok(used.size > 10);
  for (const k of used) assert.ok(k in AUTH_I18N.uz, k);
});

test('placeholder\'lar ({plan}, {max}, …) uch tilda bir xil', () => {
  for (const k of Object.keys(AUTH_I18N.uz)) {
    const ph = l => (AUTH_I18N[l][k].match(/\{[a-z]+\}/g) || []).sort().join();
    assert.equal(ph('ru'), ph('uz'), k);
    assert.equal(ph('en'), ph('uz'), k);
  }
});
