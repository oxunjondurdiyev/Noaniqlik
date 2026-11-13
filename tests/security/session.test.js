/* Soxta localStorage sessiyasi hech narsa bermaydi (RISKS R-S4).
   auth.js jsdom'da, Firebase Auth "foydalanuvchi yo'q" holatida yuklanadi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');

const src = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');

function boot(seed) {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  Object.entries(seed).forEach(([k, v]) => w.localStorage.setItem(k, v));
  let dbCalls = 0;
  w.DB = { get: async () => { dbCalls++; return { active: true }; }, getAll: async () => { dbCalls++; return []; } };
  w.firebaseAuth = { onAuthStateChanged: cb => setTimeout(() => cb(null), 0), signOut: async () => {} };
  w.eval(src('src/js/auth-core.js'));
  w.eval('var LOGIN_EMAIL_DOMAIN = "example.test";');
  w.eval(src('src/js/auth.js'));
  return { w, dbCalls: () => dbCalls };
}

test('soxta uc_session / uc_sa_session → sessiya yo\'q, kalitlar o\'chiriladi', async () => {
  const { w, dbCalls } = boot({
    uc_session: JSON.stringify({ role: 'admin', orgId: 'victimOrg', login: 'x', expiresAt: Date.now() + 1e9 }),
    uc_sa_session: 'true',
  });
  const s = await w.AuthManager.ready();
  assert.equal(s, null);
  assert.equal(w.AuthManager.getSession(), null);
  assert.equal(w.localStorage.getItem('uc_session'), null);
  assert.equal(w.localStorage.getItem('uc_sa_session'), null);
  assert.equal(dbCalls(), 0, 'Auth foydalanuvchisiz Firestore\'dan hech narsa so\'ralmaydi');
});

test('admin funksiyalari sessiyasiz ishlamaydi', async () => {
  const { w } = boot({ uc_session: JSON.stringify({ role: 'admin', orgId: 'victimOrg' }) });
  await w.AuthManager.ready();
  await assert.rejects(() => w.AuthManager.addEmployee('victimOrg', { name: 'A B' }), /Faqat tashkilot admini/);
  await assert.rejects(() => w.AuthManager.deleteEmployee('victimOrg', 'e1'), /Faqat tashkilot admini/);
  await assert.rejects(() => w.AuthManager.requestPlan('victimOrg', 'pro'), /Faqat tashkilot admini/);
});
