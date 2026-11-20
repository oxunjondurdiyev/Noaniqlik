/* P13 §2: validatsiya hisoboti (scripts/validation-report.js) — soxta natijalar bilan: o'tmagan test, todo, unverified,
   brauzer farqi to'g'ri ko'rsatiladi; HTML skriptsiz va escape qilingan; sana va commit dan boshqa hamma narsa deterministik. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const V = require('../../scripts/validation-report.js');

const ROOT = path.join(__dirname, '..', '..');
const EVIL = '<script>alert(1)</script><img src=x onerror=alert(2)>"\'&';
const line = o => JSON.stringify({ kind: 'test', nesting: 0, todo: null, skip: null, error: null, file: 'tests/a.test.js', ...o });

const lines = [
  line({ type: 'pass', name: 'o\'tgan test' }),
  line({ type: 'pass', name: 'guruh', kind: 'suite' }),
  line({ type: 'fail', name: 'yiqilgan ' + EVIL, file: 'tests/b.test.js', error: 'kutilgan 1, natija 2 ' + EVIL }),
  line({ type: 'fail', name: 'ma\'lum farq', todo: 'D-05 — ma\'lum farq ' + EVIL }),
  line({ type: 'pass', name: 'endi o\'tadigan todo', todo: 'D-03' }),
  line({ type: 'pass', name: 'o\'tkazilgan', skip: 'unverified: manba yo\'q' }),
  JSON.stringify({ type: 'diagnostic', message: 'tests 5' }), JSON.stringify({ type: 'diagnostic', message: 'fail 1' }),
  'JSON emas — e\'tiborsiz',
];

const check = (q, ok, known = '') => ({ q, ref: 'Table 1 ' + EVIL, expected: 1.5, actual: ok ? 1.5 : 1.6, tolerance: 'nisbiy 1e-9', reason: 'sabab ' + EVIL, ok, known });
const cases = [
  { id: 'case-ok', title: 'Yaxshi misol', status: 'verified', statusReason: '', enabledIn: '', domain: 'uzunlik', source: { doc: 'JCGM 100:2008', section: 'H.1', page: '79', file: '' }, method: 'evaluate', checks: [check('y', true), check('U', true)], warnings: [{ code: 'zero_u', ok: true }], error: '' },
  { id: 'case-bad', title: 'Yiqilgan ' + EVIL, status: 'verified', statusReason: '', enabledIn: '', domain: 'x', source: { doc: 'Manba ' + EVIL, section: '', page: '', file: '' }, method: 'monteCarlo', checks: [check('y', false), check('k', false, 'D-05'), check('nu_eff', true, 'D-03')], warnings: [{ code: 'w_missing', ok: false }], error: '' },
  { id: 'case-err', title: 'Ishga tushmadi', status: 'verified', statusReason: '', enabledIn: '', domain: 'x', source: { doc: 'M', section: '', page: '', file: '' }, method: 'evaluate', checks: [], warnings: [], error: 'boom ' + EVIL },
  { id: 'case-unv', title: 'Manbasiz', status: 'unverified', statusReason: 'PDF yo\'q ' + EVIL, enabledIn: '', domain: 'x', source: { doc: 'NIST UM', section: '', page: '', file: '' }, method: 'evaluate', checks: [], warnings: [], error: '' },
  { id: 'case-pend', title: 'Kutilmoqda', status: 'pending', statusReason: 'keyingi bosqich', enabledIn: 'P14', domain: 'x', source: { doc: 'M', section: '', page: '', file: '' }, method: 'evaluate', checks: [], warnings: [], error: '' },
];
const rtm = (errors = []) => ({
  summary: { requirements: 3, linked: 2, byStatus: { verified: 1, 'verified-discrepancy': 0, unverified: 1, pending: 1, manual: 0 }, withoutTest: ['REQ-ABC-003'], unlinked: errors.length ? ['REQ-ABC-004'] : [] },
  errors,
  rows: [
    { id: 'REQ-ABC-001', area: 'ABC', text: 'Talab bir ' + EVIL, origin: '', code: ['src/a.js::f'], tests: ['tests/a.test.js', 'case:case-ok'], status: 'verified', discrepancies: [], note: '', evidence: '' },
    { id: 'REQ-ABC-002', area: 'ABC', text: 'Talab ikki', origin: '', code: [], tests: ['tests/a.test.js'], status: 'unverified', discrepancies: ['D-05'], note: 'manba yo\'q ' + EVIL, evidence: '' },
    { id: 'REQ-ABC-003', area: 'ABC', text: 'Talab uch', origin: '', code: [], tests: [], status: 'pending', discrepancies: [], note: 'kutilmoqda', evidence: '' },
  ],
});
const cb = (over = {}) => ({
  format: 'uc-crossbrowser/1', ok: true, engineVersion: '2.10.0', reference: { name: 'Node.js', version: '22.23', engine: 'V8', node: 'v22.23.5' }, relLimit: 1e-14, cases: 91, monteCarloCases: 30, playwright: '1.63.0',
  exceptions: { status: 'tasdiq kutadi', ceiling: 1e-9, items: 7 },
  browsers: [
    { browser: 'chromium', version: '157.0', environment: { name: 'Chrome', version: '157.0', engine: 'V8' }, ok: true, cases: 91, numeric: 28807, differing: 242, maxRelStrict: 8.9e-15, maxRel: 3.4e-11, maxRelCase: 'c', maxRelPath: 'p',
      over: [], excepted: [{ id: 'case-ok', path: 'lambdaMin', rel: 3.4e-11 }], display: [], structural: [], errors: [], rng: { identical: true, values: 6000 }, durationMs: 61234 },
    { browser: 'firefox', version: '158.0 ' + EVIL, environment: { name: 'Firefox', version: '158.0', engine: 'SpiderMonkey' }, ok: true, cases: 91, numeric: 28807, differing: 10, maxRelStrict: 2e-16, maxRel: 2e-16, over: [], excepted: [], display: [], structural: [], errors: [], rng: { identical: true, values: 6000 }, durationMs: 99 },
  ], ...over,
});
const input = (over = {}) => ({
  generatedAt: '2026-11-19T12:00:00.000Z', commit: '0123456789abcdef0123456789abcdef01234567', engineVersion: '2.10.0', engineHash: 'a'.repeat(64), node: 'v22.23.5',
  tests: V.summarizeTests(lines), cases: JSON.parse(JSON.stringify(cases)), rtm: rtm(), crossBrowser: cb(), crossCheck: { items: [{ id: 'num-01', case: 'case-ok', kind: 'chiziqli', status: 'pending', tool: 'NUM', results: 0 }] }, ...over,
});

test('summarizeTests: pass / fail / todo / skip to\'g\'ri sanaladi; guruhlar (suite) sanalmaydi; yiqilgan test ro\'yxatda', () => {
  const t = V.summarizeTests(lines);
  assert.deepEqual([t.total, t.pass, t.fail, t.todo, t.skipped, t.files], [5, 1, 1, 2, 1, 2]);
  assert.equal(t.failed.length, 1);
  assert.equal(t.failed[0].file, 'tests/b.test.js');
  assert.deepEqual(t.todoList.map(x => x.passing).sort(), [false, true]);
  assert.deepEqual(t.reported, { tests: 5, fail: 1 });
  assert.equal(t.skippedList[0].reason, 'unverified: manba yo\'q');
});

test('buildReport: statistikalar; yiqilgan test / misol / RTM xatosi / brauzer farqi → ok = false', () => {
  const r = V.buildReport(input());
  assert.equal(r.format, 'uc-validation-report/1');
  const s = r.cases.summary;
  assert.deepEqual([s.total, s.verified, s.unverified, s.pending, s.errors], [5, 3, 1, 1, 1]);
  assert.deepEqual([s.quantities, s.passed, s.failed, s.todo, s.todoPassing], [7, 3, 2, 2, 1]);
  assert.deepEqual(s.discrepancies, ['D-03', 'D-05']);
  assert.equal(r.ok, false);
  const good = (over = {}) => V.buildReport(input({ tests: V.summarizeTests([lines[0]]), cases: [cases[0], cases[3], cases[4]], ...over }));
  assert.equal(good().ok, true, 'todo va unverified — xato emas');
  assert.equal(good({ tests: V.summarizeTests(lines) }).ok, false, 'yiqilgan test');
  assert.equal(good({ cases: [cases[1]] }).ok, false, 'o\'tmagan kattalik');
  assert.equal(good({ cases: [cases[2]] }).ok, false, 'ishga tushmagan misol');
  assert.equal(good({ rtm: rtm(['REQ-ABC-004: bog\'lanmagan']) }).ok, false, 'RTM xatosi');
  assert.equal(good({ crossBrowser: cb({ ok: false }) }).ok, false, 'brauzer tekshiruvi o\'tmagan');
  assert.equal(good({ crossBrowser: null }).ok, true, 'brauzer natijasi berilmagan — hisobotda "bajarilmagan"');
  assert.equal(good({ crossBrowser: null }).crossBrowser.run, false);
  assert.equal(r.crossBrowser.browsers[0].excepted.length, 1);
  assert.ok(!('durationMs' in r.crossBrowser.browsers[0]), 'davomiylik hisobotga kirmaydi (determinizm)');
});

test('renderHtml: o\'zi yetarli, SKRIPTSIZ, o\'z CSP si bilan; barcha matn escape qilingan', () => {
  const html = V.renderHtml(V.buildReport(input()));
  assert.ok(!/<script/i.test(html), '<script> yo\'q');
  assert.ok(!html.includes('<img'), 'kiritilgan teg matn sifatida');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  assert.equal(doc.querySelectorAll('script, img, iframe, object, embed, link, form, input, button').length, 0);
  for (const el of doc.querySelectorAll('*')) for (const a of el.attributes) {
    assert.ok(!/^on/i.test(a.name), `hodisa atributi: ${a.name}`);
    assert.ok(a.name !== 'style', 'inline style atributi yo\'q (faqat bitta <style> bloki)');
    if (a.name === 'href') assert.ok(a.value.startsWith('#'), `tashqi havola: ${a.value}`);
    assert.ok(a.name !== 'src');
  }
  assert.equal(doc.querySelectorAll('style').length, 1);
  assert.ok(!/@import|url\(|https?:\/\//.test(doc.querySelector('style').textContent));
  const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  assert.equal(csp, V.CSP);
  assert.match(csp, /^default-src 'none'; style-src 'unsafe-inline'/);
  assert.ok(!/script-src/.test(csp), 'default-src none — skript umuman taqiqlangan');
  // sayt CSP si (index.html) bilan ham mos: inline <style> ga ruxsat bor, skript yo'q
  const site = /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'))[1];
  assert.match(site, /style-src 'self' 'unsafe-inline'/);
  // mazmun
  const text = doc.body.textContent;
  for (const s of ['2026-11-19T12:00:00.000Z', '0123456789abcdef0123456789abcdef01234567', '2.10.0', 'a'.repeat(64), 'v22.23.5', 'DIQQAT', 'tests/b.test.js', 'case-bad', 'todo D-05', 'unverified', 'PDF yo\'q',
    'REQ-ABC-002', 'chromium', 'Chrome 157.0 (V8)', '3.40e-11', '8.90e-15', 'Safari', 'NIST Uncertainty Machine', 'pending', 'KNOWN_LIMITATIONS', 'endi mos', 'ishga tushmadi', 'boom']) assert.ok(text.includes(s), s);
  assert.equal(doc.querySelectorAll('details[id^="case-"]').length, 5, 'har bir misol uchun tafsilot');
  assert.ok(doc.querySelector('.banner.bad'));
  // har bir ichki havola mavjud langarga
  for (const a of doc.querySelectorAll('a[href^="#"]')) assert.ok(doc.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  // muvaffaqiyatli holat
  const ok = V.renderHtml(V.buildReport(input({ tests: V.summarizeTests([lines[0]]), cases: [cases[0]] })));
  assert.ok(new JSDOM(ok).window.document.querySelector('.banner.ok'));
  assert.ok(V.renderHtml(V.buildReport(input({ crossBrowser: null }))).includes('bu yig\'ishda bajarilmagan'));
  // yaxlitlangan natija farqi — aniq ko'rsatiladi
  const disp = cb({ ok: false });
  disp.browsers[1].ok = false; disp.browsers[1].display = [{ id: 'case-ok', path: '.U', node: '0.50', browser: '0.51' }];
  assert.ok(new JSDOM(V.renderHtml(V.buildReport(input({ crossBrowser: disp })))).window.document.body.textContent.includes('Node "0.50" ≠ brauzer "0.51"'));
});

test('determinizm: bir xil kirish → bayt darajasida bir xil HTML va JSON; sana va commit dan boshqa hech narsa o\'zgarmaydi', () => {
  const a = V.buildReport(input()), b = V.buildReport(input());
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(V.renderHtml(a), V.renderHtml(b));
  const c = V.buildReport(input({ generatedAt: '2027-01-01T00:00:00.000Z', commit: 'f'.repeat(40) }));
  const strip = r => JSON.stringify({ ...r, generatedAt: '', commit: '' });
  assert.equal(strip(c), strip(a));
  const norm = h => h.replace(/2027-01-01T00:00:00\.000Z|2026-11-19T12:00:00\.000Z/g, 'T').replace(/f{40}|0123456789abcdef0123456789abcdef01234567/g, 'C');
  assert.equal(norm(V.renderHtml(c)), norm(V.renderHtml(a)));
});

test('haqiqiy ma\'lumot: misollar yig\'iladi (manba, tolerans sababi, D-ID), reporter moduli va CI ulanishi bor', () => {
  const real = V.collectCases(ROOT);
  const s = V.summarizeCases(real);
  assert.ok(s.total >= 92 && s.verified >= 90, JSON.stringify(s));
  assert.equal(s.failed, 0);
  assert.equal(s.errors, 0);
  assert.ok(s.todo >= 1 && s.discrepancies.every(d => /^D-\d{2}$/.test(d)));
  const h1 = real.find(c => c.id === 'jcgm100-h1');
  assert.equal(h1.source.doc, 'JCGM 100:2008 (GUM)');
  assert.ok(h1.checks.length >= 4 && h1.checks.every(x => x.ref && x.tolerance && typeof x.actual === 'number'));
  assert.ok(real.some(c => c.checks.some(x => x.reason)), 'tolerans sababi (reason) ko\'chiriladi');
  assert.ok(real.filter(c => c.status !== 'verified').every(c => c.statusReason || c.enabledIn), 'unverified / pending — sababi bilan');
  assert.equal(V.collectCrossCheck(ROOT).items.length, 5);
  assert.equal(typeof require('../../scripts/lib/test-reporter.js'), 'function');
  const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/test.yml'), 'utf8');
  assert.match(yml, /node scripts\/validation-report\.js --out=_validation --crossbrowser=crossbrowser-results\.json/);
  assert.match(yml, /uses: actions\/upload-artifact@v\d+/);
  assert.match(yml, /node tests\/crossbrowser\/run\.js/);
  assert.match(yml, /playwright install --with-deps chromium firefox webkit/);
});
