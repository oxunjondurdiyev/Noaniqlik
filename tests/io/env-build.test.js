/* P13: hisoblagan muhit (src/io/env.js), build belgisi (src/io/build.js), uc-calc/1 dagi env / build maydonlari,
   boshqa JS dvigatelidagi qayta hisob (reproduce: maxRel, close) — docs/RISKS.md R-22, R-24 (egasi qarorlari A, B). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ENV = require('../../src/io/env.js');
const B = require('../../src/io/build.js');
const J = require('../../src/io/calc-json.js');
const E = require('../../src/engine/index.js');
const FT = require('../../src/report/footer.js');

const UA = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.7204.23 Safari/537.36',
  headless: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.8103.78 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edg/157.0.3800.58',
  opera: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 OPR/135.0.0.0',
  yandex: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.9.1.100 Safari/537.36',
  firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:158.0) Gecko/20100101 Firefox/158.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15',
  criOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/157.0.7204.10 Mobile/15E148 Safari/604.1',
};

test('describeEnvironment: qisqa nom, versiya (ikki qism) va JS dvigateli; to\'liq userAgent saqlanmaydi', () => {
  assert.deepEqual(ENV.describeEnvironment(UA.chrome), { name: 'Chrome', version: '157.0', engine: 'V8' });
  assert.deepEqual(ENV.describeEnvironment(UA.headless), { name: 'Chrome', version: '157.0', engine: 'V8' });
  assert.deepEqual(ENV.describeEnvironment(UA.edge), { name: 'Edge', version: '157.0', engine: 'V8' });
  assert.deepEqual(ENV.describeEnvironment(UA.opera), { name: 'Opera', version: '135.0', engine: 'V8' });
  assert.deepEqual(ENV.describeEnvironment(UA.yandex), { name: 'Yandex', version: '26.9', engine: 'V8' });
  assert.deepEqual(ENV.describeEnvironment(UA.firefox), { name: 'Firefox', version: '158.0', engine: 'SpiderMonkey' });
  assert.deepEqual(ENV.describeEnvironment(UA.safari), { name: 'Safari', version: '26.1', engine: 'JavaScriptCore' });
  // iOS dagi Chrome — WebKit / JavaScriptCore
  assert.deepEqual(ENV.describeEnvironment(UA.criOS), { name: 'Chrome (iOS)', version: '157.0', engine: 'JavaScriptCore' });
  assert.deepEqual(ENV.nodeEnvironment('v22.23.5'), { name: 'Node.js', version: '22.23', engine: 'V8' });
  for (const bad of [undefined, null, '', 42, 'curl/8.0', {}]) assert.deepEqual(ENV.describeEnvironment(bad), { name: 'unknown', version: '', engine: 'unknown' });
  // natijada OS, qurilma, to'liq versiya yo'q
  for (const ua of Object.values(UA)) {
    const txt = JSON.stringify(ENV.describeEnvironment(ua));
    assert.ok(!/Windows|Linux|Mac|iPhone|AppleWebKit|Mozilla|7204|8103/.test(txt), txt);
  }
});

test('cleanEnvironment / environmentText / sameEnvironment: fayldan kelgan qiymat tozalanadi', () => {
  assert.equal(ENV.environmentText({ name: 'Firefox', version: '158.0', engine: 'SpiderMonkey' }), 'Firefox 158.0 (SpiderMonkey)');
  assert.equal(ENV.environmentText({ name: 'unknown', version: '', engine: 'unknown' }), '');
  assert.equal(ENV.cleanEnvironment({ name: '<img src=x onerror=1>', version: '1', engine: 'V8' }), null);
  assert.equal(ENV.cleanEnvironment({ name: 'x'.repeat(41), version: '1', engine: 'V8' }), null);
  assert.equal(ENV.cleanEnvironment({ name: 'Chrome', version: 157, engine: 'V8' }), null);
  assert.equal(ENV.cleanEnvironment('Chrome'), null);
  assert.deepEqual(ENV.cleanEnvironment({ name: 'Chrome', version: '157.0', engine: 'V8', userAgent: 'secret' }), { name: 'Chrome', version: '157.0', engine: 'V8' });
  assert.ok(ENV.sameEnvironment(ENV.describeEnvironment(UA.chrome), ENV.describeEnvironment(UA.headless)));
  assert.ok(!ENV.sameEnvironment(ENV.describeEnvironment(UA.chrome), ENV.describeEnvironment(UA.firefox)));
  assert.ok(!ENV.sameEnvironment(null, null));
});

const GOOD = {
  format: 'uc-build/1', commit: '0123456789abcdef0123456789abcdef01234567', shortSha: '0123456789ab', engineVersion: '2.10.0',
  engineHash: 'a'.repeat(64), builtAt: '2026-11-19T12:00:00.000Z', node: 'v22.23.5',
  versions: [{ version: '2.10.0', date: '2026-11-19', title: 'P12' }, { version: 'x', title: 'bad' }, { version: '2.9.0', date: 'kecha', title: 'P07b' }],
};

test('build.json: sxema tekshiruvi (cleanBuildInfo), modul versiyasi (versionOf), eskirganlik (isOutdated), build belgisi', () => {
  const b = B.cleanBuildInfo({ ...GOOD, extra: 'tashlanadi' });
  assert.deepEqual(Object.keys(b), ['format', 'commit', 'shortSha', 'engineVersion', 'engineHash', 'builtAt', 'node', 'versions']);
  assert.deepEqual(b.versions, [{ version: '2.10.0', date: '2026-11-19', title: 'P12' }, { version: '2.9.0', date: '', title: 'P07b' }]);
  for (const bad of [null, [], {}, { ...GOOD, format: 'x' }, { ...GOOD, commit: 'zz' }, { ...GOOD, shortSha: '0123456789ac' }, { ...GOOD, shortSha: '0123456' },
    { ...GOOD, engineVersion: '2.10' }, { ...GOOD, engineHash: 'abc' }, { ...GOOD, builtAt: '2026-11-19' }]) assert.equal(B.cleanBuildInfo(bad), null);
  assert.equal(B.versionOf('https://x.test/src/ui/build/app.js?v=0123456789ab'), '0123456789ab');
  assert.equal(B.versionOf('https://x.test/a.js?x=1&v=0123456789ab#h'), '0123456789ab');
  for (const u of ['https://x.test/src/ui/build/app.js', 'file:///a.js?v=123', 'a.js?v=0123456789abcdef', 'a.js?dev=0123456789ab', '', null]) assert.equal(B.versionOf(u), null);
  assert.equal(B.isOutdated('0123456789ab', b), false);
  assert.equal(B.isOutdated('ffffffffffff', b), true);
  assert.equal(B.isOutdated(null, b), false, 'lokal ishlash (versiyasiz) — jim');
  assert.equal(B.isOutdated('ffffffffffff', null), false, 'build.json yo\'q — jim');
  assert.deepEqual(B.buildMark(b, null), { id: '0123456789ab', source: 'commit' });
  assert.deepEqual(B.buildMark(null, { sha256: 'b'.repeat(64) }), { id: 'bbbbbbbbbbbb', source: 'engine-hash' });
  assert.equal(B.buildMark(null, null), null);
  assert.equal(B.cleanBuildMark({ id: '<script>', source: 'commit' }), null);
  assert.equal(B.cleanBuildMark({ id: '0123456789ab', source: 'boshqa' }), null);
});

const spec = require('../cases/excel/excel-gas-p2.json').modelSpec;
const meta = { id: 'calc-p13', createdAt: '2026-11-19T00:00:00.000Z' };

test('uc-calc/1: env va build yoziladi va xeshga kiradi; yaroqsiz qiymat yozilmaydi; ularsiz (eski) hujjat avvalgidek o\'qiladi', async () => {
  const r = E.evaluate(spec);
  const old = await J.buildCalcDoc({ ...meta, input: spec, result: r });
  assert.ok(!('env' in old) && !('build' in old));
  const env = ENV.describeEnvironment(UA.firefox), build = { id: '0123456789ab', source: 'commit' };
  const doc = await J.buildCalcDoc({ ...meta, input: spec, result: r, env, build });
  assert.deepEqual(doc.env, env);
  assert.deepEqual(doc.build, build);
  assert.notEqual(doc.hash, old.hash);
  const bad = await J.buildCalcDoc({ ...meta, input: spec, result: r, env: { name: '<b>', version: '', engine: '' }, build: { id: 'x', source: 'commit' } });
  assert.equal(bad.hash, old.hash, 'yaroqsiz env / build hujjatga tushmaydi');
  // eksport → import
  const parsed = await J.parseCalcDoc(J.serializeCalcDoc(doc));
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.env, env);
  assert.deepEqual(parsed.build, build);
  assert.deepEqual(J.reproduce(parsed, E.evaluate, E.ENGINE_VERSION), { identical: true, main: true, points: [], sameEngine: true, maxRel: 0, close: false });
  // eski hujjat (P05b–P12 formati: env / build yo'q)
  const parsedOld = await J.parseCalcDoc(J.serializeCalcDoc(old));
  assert.ok(parsedOld.ok);
  assert.equal(parsedOld.env, null);
  assert.equal(parsedOld.build, null);
  assert.equal(J.reproduce(parsedOld, E.evaluate, E.ENGINE_VERSION).identical, true);
  // fayldagi env buzilgan (lekin xesh to'g'ri) — o'qiladi, env null
  const { hash, ...rest } = doc;
  const tampered = { ...rest, env: { name: '<img onerror=1>', version: '1', engine: 'V8' } };
  const p3 = await J.parseCalcDoc(JSON.stringify({ ...tampered, hash: await J.calcDocHash(tampered) }));
  assert.ok(p3.ok);
  assert.equal(p3.env, null);
});

test('reproduce: boshqa JS dvigatelidagi oxirgi xona farqi — close (≤ 1·10⁻¹⁴), kattaroq farq — differs (egasi qarori B, R-24)', async () => {
  const r = E.evaluate(spec);
  const doc = await J.buildCalcDoc({ ...meta, input: spec, result: r });
  const parsed = await J.parseCalcDoc(J.serializeCalcDoc(doc));
  const nudge = f => spec2 => { const x = E.evaluate(spec2); return { ...x, uc: x.uc * f }; };
  const near = J.reproduce(parsed, nudge(1 + 4 * Number.EPSILON), E.ENGINE_VERSION);
  assert.equal(near.identical, false);
  assert.equal(near.close, true);
  assert.ok(near.maxRel > 0 && near.maxRel <= J.REPRODUCE_REL_LIMIT, String(near.maxRel));
  const far = J.reproduce(parsed, nudge(1 + 1e-9), E.ENGINE_VERSION);
  assert.equal(far.identical, false);
  assert.equal(far.close, false);
  // tuzilma farqi — hech qachon "close" emas
  const shape = J.reproduce(parsed, s => ({ ...E.evaluate(s), extra: 1 }), E.ENGINE_VERSION);
  assert.equal(shape.close, false);
  assert.equal(shape.maxRel, Infinity);
  assert.equal(J.maxRelDiff({ a: [1, 2] }, { a: [1, 2] }), 0);
  assert.equal(J.maxRelDiff({ a: 'x' }, { a: 'y' }), Infinity);
  assert.equal(J.maxRelDiff({ a: 1 }, { a: 1, b: 2 }), Infinity);
});

test('hisobot pasti: deploy — commit SHA; lokal — dvigatel xeshi "dev"; hisoblagan muhit qatori', () => {
  const m = { id: 'calc-1', createdAt: '2026-11-19T00:00:00.000Z' };
  const deployed = FT.footerModel({ engineVersion: '2.10.0', build: { shortSha: '0123456789ab', sha256: 'a'.repeat(64), engineVersion: '2.10.0' }, meta: m, hash: 'h', env: 'Firefox 158.0 (SpiderMonkey)' });
  assert.equal(deployed.build, '0123456789ab');
  assert.equal(deployed.buildDev, false);
  assert.equal(deployed.buildMatches, true);
  assert.equal(deployed.env, 'Firefox 158.0 (SpiderMonkey)');
  const dev = FT.footerModel({ engineVersion: '2.10.0', build: { sha256: 'a'.repeat(64), engineVersion: '2.10.0' }, meta: m, hash: 'h' });
  assert.equal(dev.build, 'aaaaaaaaaaaa');
  assert.equal(dev.buildDev, true);
  assert.equal(dev.env, '');
  assert.equal(FT.footerModel({ engineVersion: '2.10.0', build: { shortSha: 'XYZ' }, meta: m, hash: 'h' }).build, '');
  const env = { t: k => k, esc: require('../../src/ui/escape.js').escHtml };
  const html = FT.footerHTML({ ...deployed, env: '<b>x</b>' }, env, '');
  assert.match(html, /data-report-foot="env"/);
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;') && !html.includes('<b>x</b>'));
  assert.ok(!FT.footerHTML(dev, env, '').includes('data-report-foot="env"'));
  assert.match(FT.footerHTML(dev, env, ''), /aaaaaaaaaaaa \(rf_build_dev\)/);
});

test('src/io/env.js va build.js sof: DOM, tarmoq, brauzer xotirasi yo\'q; Firebase\'ga yozilmaydi', () => {
  for (const f of ['src/io/env.js', 'src/io/build.js']) {
    const code = fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/\b(window|document|navigator|localStorage|sessionStorage|fetch|XMLHttpRequest|firebase|firestore)\b/i.test(code), f);
  }
  const ui = fs.readFileSync(path.join(__dirname, '..', '..', 'src/ui/build/app.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '..', '..', 'src/ui/build/watcher.js'), 'utf8');
  assert.ok(!/firebase|firestore|DB\.|AuthManager|localStorage|sessionStorage|location\.reload/i.test(ui.replace(/\/\*[\s\S]*?\*\//g, '')), 'build UI: saqlash / qayta yuklash / Firebase yo\'q');
});
