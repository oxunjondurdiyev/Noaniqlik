/* Kirish rejimi (src/js/access-mode.js; egasi qarori 2026-11-24): ochiq test rejimi — ro'yxatdan o'tish talab qilinmaydi,
   sinov hisoblagichi va to'lov oynasi o'chiq; "Ro'yxatdan o'tish" tugmalari yashirin; test belgisi ko'rinadi.
   'subscription' rejimi (obuna) avvalgi xatti-harakatni saqlaydi — 7 ta sinov hisobi, keyin to'lov oynasi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const LANGS = ['uz', 'ru', 'en'];
const A = require('../../src/js/access-mode.js');

test('siyosat (sof): joriy rejim — ochiq test (egasi qarori 2026-11-24); rejimni almashtirish — faqat egasi qarori bilan', () => {
  assert.equal(A.ACCESS_MODE, 'open-test', 'rejim o\'zgartirilsa — egasi qarori, CHANGELOG va shu test yangilanadi');
  assert.deepEqual(Object.keys(A.MODES), ['open-test', 'subscription']);
  assert.deepEqual({ ...A.policy() }, { trialLimit: null, registration: false, payments: false, testNotice: true });
  assert.throws(() => A.policy('free'), /UNKNOWN_ACCESS_MODE/);
  assert.ok(Object.isFrozen(A.MODES) && Object.isFrozen(A.MODES['open-test']));
});

test('siyosat (sof): ochiq test — cheklovsiz va hisoblagichsiz; obuna — 7 ta sinov hisobi (avvalgi FREE_LIMIT), kirgan foydalanuvchi — cheklovsiz', () => {
  for (const used of [0, 7, 10000]) {
    assert.equal(A.canStartSession({ signedIn: false, used }, 'open-test'), true, String(used));
    assert.equal(A.countsTrial({ signedIn: false }, 'open-test'), false);
  }
  assert.equal(A.policy('subscription').trialLimit, 7);
  assert.equal(A.canStartSession({ signedIn: false, used: 6 }, 'subscription'), true);
  assert.equal(A.canStartSession({ signedIn: false, used: 7 }, 'subscription'), false);
  assert.equal(A.canStartSession({ signedIn: true, used: 99 }, 'subscription'), true);
  assert.equal(A.countsTrial({ signedIn: false }, 'subscription'), true);
  assert.equal(A.countsTrial({ signedIn: true }, 'subscription'), false);
  assert.equal(A.policy('subscription').registration, true);
  assert.equal(A.policy('subscription').payments, true);
});

test('app.js: hisoblagich va to\'lov oynasi faqat siyosat orqali (qattiq yozilgan FREE_LIMIT yo\'q)', () => {
  const app = read('src/js/app.js');
  assert.doesNotMatch(app, /FREE_LIMIT\s*=\s*\d/);
  assert.match(app, /const FREE_LIMIT = ACCESS\.trialLimit;/);
  assert.match(app, /window\.UCAccess\.canStartSession\(/);
  assert.match(app, /window\.UCAccess\.countsTrial\(/);
});

test('index.html: access-mode.js app.js va index-auth.js dan oldin; ro\'yxatdan o\'tish tugmalari belgilangan; test belgisi ikki joyda (kirish sahifasi, Bosh sahifa)', () => {
  const html = read('index.html');
  const pos = f => html.indexOf(`src="${f}"`);
  assert.ok(pos('src/js/access-mode.js') > 0);
  assert.ok(pos('src/js/access-mode.js') < pos('src/js/app.js'));
  assert.ok(pos('src/js/access-mode.js') < pos('src/ui/index-auth.js'));
  assert.ok(pos('src/js/i18n-access.js') > pos('src/js/i18n.js'));
  const doc = new JSDOM(html).window.document;
  const regOnly = [...doc.querySelectorAll('[data-reg-only]')];
  assert.ok(regOnly.includes(doc.querySelector('[data-auth-tab="register"]')));
  assert.ok(regOnly.includes(doc.getElementById('paywall-btn-register')));
  assert.ok(regOnly.some(el => el.contains(doc.getElementById('link-to-register'))));
  // kirish tugmasi qoladi (mavjud hisob egalari uchun)
  assert.ok(!doc.querySelector('[data-auth-tab="login"]').hasAttribute('data-reg-only'));
  assert.ok(!doc.getElementById('btn-nav-login').hasAttribute('data-reg-only'));
  const notes = [...doc.querySelectorAll('[data-access-note]')];
  assert.equal(notes.length, 2);
  assert.ok(doc.getElementById('home-screen').contains(notes[0]));
  assert.ok(doc.getElementById('dash-screen').contains(notes[1]));
  for (const n of notes) {
    assert.ok(n.hidden, 'standart holatda yashirin — JS rejimga qarab ochadi');
    assert.equal(n.getAttribute('style'), null, 'inline uslub yo\'q');
    const a = n.querySelector('a');
    assert.equal(a.getAttribute('href'), 'https://t.me/oxunjon_durdiyev');
    assert.equal(a.getAttribute('rel'), 'noopener');
    assert.deepEqual([...n.querySelectorAll('[data-i18n]')].map(e => e.dataset.i18n), ['acc_test_note', 'acc_test_feedback']);
  }
});

test('i18n: test belgisi uch tilda; "bepul" / "ochiq kod" yozilmaydi (yopiq litsenziya)', () => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const D = dom.window.eval(['i18n.js', 'i18n-access.js'].map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS');
  for (const l of LANGS) for (const k of ['acc_test_note', 'acc_test_feedback']) {
    assert.ok(typeof D[l][k] === 'string' && D[l][k].length > 5, `${l}.${k}`);
    assert.doesNotMatch(D[l][k], /bepul|tekin|free|бесплат|ochiq kod|open source|MIT/i, `${l}.${k}`);
  }
});

/* jsdom: index-auth.js ochiq test rejimida ro'yxatdan o'tish tugmalarini yashiradi, test belgisini ochadi; 'register' so'rovi — kirish yorlig'i */
function bootAuth(mode) {
  const dom = new JSDOM(read('index.html'), { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.i18n = { t: k => k };
  w.AuthManager = { PLANS: {}, ready: () => new Promise(() => {}), onChange: () => {}, suggestLogin: () => '', register: async () => { w.__registered = true; } };
  w.AuthCore = { normalizeLogin: s => s, isValidLogin: () => true, CONSENT_VERSION: '2026-11-21' };
  w.UiTemplates = {};
  w.eval(read('src/js/access-mode.js'));
  if (mode) { const p = w.UCAccess.policy(mode); w.UCAccess = { ...w.UCAccess, policy: () => p }; }
  w.eval(read('src/ui/index-auth.js'));
  return w;
}

test('index-auth.js (jsdom): ochiq test rejimi — ro\'yxatdan o\'tish yashirin, test belgisi ko\'rinadi, ro\'yxatdan o\'tish yuborilmaydi', () => {
  const w = bootAuth();
  const doc = w.document;
  for (const el of doc.querySelectorAll('[data-reg-only]')) assert.ok(el.hidden, el.outerHTML.slice(0, 60));
  for (const n of doc.querySelectorAll('[data-access-note]')) assert.equal(n.hidden, false);
  w.UCAuthScreen.show('register');
  assert.equal(doc.getElementById('auth-screen').hidden, false);
  assert.ok(doc.getElementById('auth-panel-login').classList.contains('active'));
  assert.ok(!doc.getElementById('auth-panel-register').classList.contains('active'));
  doc.getElementById('auth-panel-register').dispatchEvent(new w.Event('submit', { cancelable: true }));
  assert.equal(w.__registered, undefined);
});

test('index-auth.js (jsdom): obuna rejimi — ro\'yxatdan o\'tish tugmalari ko\'rinadi, test belgisi yashirin', () => {
  const doc = bootAuth('subscription').document;
  for (const el of doc.querySelectorAll('[data-reg-only]')) assert.equal(el.hidden, false);
  for (const n of doc.querySelectorAll('[data-access-note]')) assert.ok(n.hidden);
});
