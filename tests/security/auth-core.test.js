/* src/js/auth-core.js — sun'iy email, login formati, parol generatori */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const webcrypto = require('node:crypto').webcrypto;
const C = require('../../src/js/auth-core.js');
const fs = require('node:fs');
const path = require('node:path');

test('loginToEmail: <login>@users.<domen>', () => {
  assert.equal(C.loginToEmail('A.Karimov ', 'noaniqlikbazasi.firebaseapp.com'), 'a.karimov@users.noaniqlikbazasi.firebaseapp.com');
});
test('loginToEmail: noto\'g\'ri login rad etiladi (email injection yo\'q)', () => {
  for (const bad of ['', 'ab', 'a@b.c', 'x@evil.com#', '.abc', 'abc.', 'a..b', 'a b', 'ахмад', 'a'.repeat(33), 'abc/../x']) {
    assert.throws(() => C.loginToEmail(bad, 'd.com'), /INVALID_LOGIN/, bad);
  }
});
test('isValidLogin firestore.rules dagi validLogin() regexi bilan bir xil', () => {
  const rules = fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8');
  const m = rules.match(/function validLogin\(v\) \{\s*return v is string && v\.matches\('([^']+)'\);/);
  assert.ok(m, 'validLogin topilmadi');
  assert.equal(m[1], C.LOGIN_RE.source);
});
test('suggestLogin / loginCandidate', () => {
  assert.equal(C.suggestLogin('Ahmad', 'Karimov'), 'a.karimov');
  assert.equal(C.suggestLogin('Ахмад', 'Каримов'), 'a.karimov');
  assert.ok(C.isValidLogin(C.suggestLogin('', '')));
  assert.equal(C.loginCandidate('a.karimov', 1), 'a.karimov');
  assert.equal(C.loginCandidate('a.karimov2', 3), 'a.karimov3');
});
test('genPassword: 12 belgi, alifbodan, kriptografik manba', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const p = C.genPassword(12, a => webcrypto.getRandomValues(a));
    assert.equal(p.length, 12);
    assert.match(p, /^[abcdefghjkmnpqrstuvwxyz23456789]+$/);
    seen.add(p);
  }
  assert.equal(seen.size, 200);
});
test('genPassword: modulo og\'ishi yo\'q (rejection sampling)', () => {
  // Faqat 255 qiymatini qaytaradigan "RNG" — u rad etilishi kerak, keyin 0 → 'a'
  let calls = 0;
  const rnd = a => { a.fill(calls++ === 0 ? 255 : 0); return a; };
  assert.equal(C.genPassword(4, rnd), 'aaaa');
});
test('orgDisplayName: fullName o\'rniga firstName + lastName', () => {
  assert.equal(C.orgDisplayName({ firstName: 'Ali', lastName: 'Valiyev' }), 'Ali Valiyev');
  assert.equal(C.orgDisplayName({ fullName: 'Legacy Name' }), 'Legacy Name');
});
