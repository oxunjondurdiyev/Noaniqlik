/* P13 §4 (docs/RISKS.md R-24, egasi qarori B): brauzerlararo solishtiruv qoidalarining sof qismi (tests/crossbrowser/run.js::compareRun).
   Brauzerlarning o'zi bu yerda ishga tushmaydi (Playwright — `npm run test:browsers`, CI da `validation` job). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { compareRun } = require('../crossbrowser/run.js');
const C = require('../crossbrowser/core.js');

const ROOT = path.join(__dirname, '..', '..');
const snap = (id, result, display = {}) => ({ id, method: 'evaluate', result: C.encode(result), display });
const ref = [snap('a', { y: 1, uc: 0.25, list: [1, 2, 3], engineVersion: '2.10.0' }, { '.y': '1.00', '.U': '0.50' }), snap('b', { lambdaMin: 1e-5, kp: 2.5 })];
const EPS = Number.EPSILON;

test('aynan bir xil natija — o\'tadi; ≤ 1·10⁻¹⁴ nisbiy farq — o\'tadi va o\'lchanadi', () => {
  const same = compareRun(ref, JSON.parse(JSON.stringify(ref)));
  assert.equal(same.ok, true);
  assert.deepEqual([same.cases, same.differing, same.maxRel], [2, 0, 0]);
  const near = compareRun(ref, [snap('a', { y: 1 + 2 * EPS, uc: 0.25, list: [1, 2, 3], engineVersion: '2.10.0' }, ref[0].display), ref[1]]);
  assert.equal(near.ok, true);
  assert.equal(near.differing, 1);
  assert.ok(near.maxRel > 0 && near.maxRel <= C.REL_LIMIT && near.maxRelCase === 'a' && near.maxRelPath === 'y');
  assert.equal(near.maxRelStrict, near.maxRel);
  assert.equal(C.REL_LIMIT, 1e-14);
});

test('1·10⁻¹⁴ dan katta farq — xato (qaysi misol, qaysi kattalik); yaxlitlangan farq — har doim xato', () => {
  const far = compareRun(ref, [snap('a', { y: 1 + 1e-12, uc: 0.25, list: [1, 2, 3], engineVersion: '2.10.0' }, ref[0].display), ref[1]]);
  assert.equal(far.ok, false);
  assert.deepEqual(far.over.map(o => [o.id, o.path]), [['a', 'y']]);
  const disp = compareRun(ref, [snap('a', { y: 1, uc: 0.25, list: [1, 2, 3], engineVersion: '2.10.0' }, { '.y': '1.00', '.U': '0.51' }), ref[1]]);
  assert.equal(disp.ok, false);
  assert.deepEqual(disp.display, [{ id: 'a', path: '.U', node: '0.50', browser: '0.51' }]);
  // tuzilma farqi, yetishmagan misol, faqat brauzerda xato
  assert.equal(compareRun(ref, [snap('a', { y: 1, uc: 0.25, list: [1, 2], engineVersion: '2.10.0' }, ref[0].display), ref[1]]).ok, false);
  assert.equal(compareRun(ref, [ref[0]]).errors[0].id, 'b');
  assert.equal(compareRun(ref, [ref[0], { id: 'b', error: 'boom' }]).ok, false);
  // engineVersion maydoni solishtirilmaydi
  assert.equal(compareRun(ref, [snap('a', { y: 1, uc: 0.25, list: [1, 2, 3], engineVersion: 'x' }, ref[0].display), ref[1]]).ok, true);
});

test('istisnolar ro\'yxati: faqat ko\'rsatilgan (misol, yo\'l) uchun, faqat yuqori chegaragacha; yaxlitlangan natijaga istisno yo\'q', () => {
  const ex = { ceiling: 1e-9, items: [{ case: 'b', path: '^lambdaMin$', reason: 'sinov' }] };
  const got = [ref[0], snap('b', { lambdaMin: 1e-5 * (1 + 3e-11), kp: 2.5 })];
  assert.equal(compareRun(ref, got).ok, false, 'istisnosiz — xato');
  const r = compareRun(ref, got, ex);
  assert.equal(r.ok, true);
  assert.deepEqual(r.excepted.map(o => [o.id, o.path]), [['b', 'lambdaMin']]);
  assert.ok(r.maxRel > 1e-11 && r.maxRelStrict === 0, 'maxRelStrict — istisnolarsiz');
  // boshqa yo'l yoki boshqa misol — istisno emas
  assert.equal(compareRun(ref, [ref[0], snap('b', { lambdaMin: 1e-5, kp: 2.5 * (1 + 3e-11) })], ex).ok, false);
  assert.equal(compareRun([snap('c', { lambdaMin: 1 })], [snap('c', { lambdaMin: 1 + 1e-11 })], ex).ok, false);
  // yuqori chegaradan oshsa — xato
  assert.equal(compareRun(ref, [ref[0], snap('b', { lambdaMin: 1e-5 * (1 + 1e-6), kp: 2.5 })], ex).ok, false);
});

test('repodagi istisnolar fayli: har bir band sababi bilan, mavjud misolga, yuqori chegara ≤ 1·10⁻⁹; holati "tasdiq kutadi" (R-27)', () => {
  const ex = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/crossbrowser/exceptions.json'), 'utf8'));
  const ids = new Set(require('../cases/lib.js').loadCases().map(c => c.id));
  assert.ok(ex.ceiling > C.REL_LIMIT && ex.ceiling <= 1e-9);
  assert.match(ex.status, /R-27/);
  assert.ok(ex.items.length > 0 && ex.items.length <= 40, 'istisnolar soni cheklangan');
  for (const it of ex.items) {
    assert.ok(ids.has(it.case), it.case);
    assert.ok(it.reason && it.reason.length >= 20, `${it.case}: sabab`);
    assert.doesNotThrow(() => new RegExp(it.path));
    assert.ok(it.path.startsWith('^') && it.path.endsWith('$'), `${it.case}: yo'l to'liq mos kelishi kerak (^…$)`);
    assert.ok(!/^\^\.\*|\.\*\$$/.test(it.path), 'hammasini qamraydigan naqsh taqiqlangan');
  }
});

test('jgut: sahifa faqat lokal modullarni yuklaydi (CSP script-src \'self\'), tashqi so\'rovlar bekor qilinadi; Playwright — aniq versiyali devDependency', () => {
  const html = fs.readFileSync(path.join(ROOT, 'tests/crossbrowser/page.html'), 'utf8');
  assert.match(html, /script-src 'self'/);
  assert.ok(!/https?:\/\//.test(html));
  const run = fs.readFileSync(path.join(ROOT, 'tests/crossbrowser/run.js'), 'utf8');
  assert.match(run, /u\.hostname === '127\.0\.0\.1'/);
  assert.match(run, /route\.abort\(\)/);
  const page = fs.readFileSync(path.join(ROOT, 'tests/crossbrowser/page.js'), 'utf8');
  assert.match(page, /from '\.\.\/\.\.\/src\/engine\/index\.js'/, 'saytdagi AYNAN o\'sha dvigatel moduli');
  const pkg = require('../../package.json');
  assert.match(pkg.devDependencies.playwright, /^\d+\.\d+\.\d+$/);
  assert.ok(!pkg.dependencies, 'runtime dependency yo\'q');
  const server = fs.readFileSync(path.join(ROOT, 'tests/crossbrowser/server.js'), 'utf8');
  assert.match(server, /server\.listen\(0, '127\.0\.0\.1'/);
});
