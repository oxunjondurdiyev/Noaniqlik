/* P13: build kuzatuvchisi va "yangi versiya chiqdi" banneri (src/ui/build/watcher.js) — soxta fetch va jsdom bilan.
   Egasi qarori A (R-22 (b)): banner bor, AVTOMATIK QAYTA YUKLASH YO'Q; build.json bo'lmasa (lokal ishlash) — jim. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createBuildWatcher, BUILD_URL, ENGINE_HASH_URL, RECHECK_MS } = require('../../src/ui/build/watcher.js');

const ROOT = path.join(__dirname, '..', '..');
const BUILD = {
  format: 'uc-build/1', commit: '0123456789abcdef0123456789abcdef01234567', shortSha: '0123456789ab', engineVersion: '2.10.0',
  engineHash: 'a'.repeat(64), builtAt: '2026-11-19T12:00:00.000Z', node: 'v22.23.5', versions: [],
};
const NEXT = { ...BUILD, commit: 'f'.repeat(40), shortSha: 'f'.repeat(12) };

function setup(files, loaded) {
  const dom = new JSDOM('<!doctype html><body><main id="app">ish</main></body>', { url: 'https://example.test/' });
  const calls = [];
  let clock = 0;
  const env = {
    fetch: async (url, init) => {
      calls.push([url, init]);
      const v = typeof files[url] === 'function' ? files[url]() : files[url];
      if (v === undefined) return { ok: false, status: 404, json: async () => { throw new Error('404'); } };
      if (v instanceof Error) throw v;
      return { ok: true, status: 200, json: async () => v };
    },
    document: dom.window.document, t: k => 'T:' + k, loaded, now: () => clock,
  };
  return { dom, calls, env, tick: ms => { clock += ms; }, w: createBuildWatcher(env), banner: () => dom.window.document.getElementById('build-banner') };
}

test('build.json yo\'q (lokal ishlash): jim — banner yo\'q; hisobot uchun dvigatel xeshi ("dev")', async () => {
  const s = setup({ [ENGINE_HASH_URL]: { sha256: 'b'.repeat(64), engineVersion: '2.10.0' } }, null);
  assert.equal(await s.w.check(), false);
  assert.equal(s.banner(), null);
  assert.deepEqual(await s.w.forReport(), { sha256: 'b'.repeat(64), engineVersion: '2.10.0' });
  assert.deepEqual(await s.w.mark(), { id: 'bbbbbbbbbbbb', source: 'engine-hash' });
  assert.deepEqual(s.calls[0], [BUILD_URL, { cache: 'no-store' }]);
  // tarmoq xatosi ham jim
  const e = setup({ [BUILD_URL]: new Error('offline') }, '0123456789ab');
  assert.equal(await e.w.check(), false);
  assert.equal(e.banner(), null);
  assert.equal(await e.w.forReport(), null);
});

test('versiya mos: banner yo\'q; hisobot va hujjat uchun commit SHA', async () => {
  const s = setup({ [BUILD_URL]: BUILD }, '0123456789ab');
  assert.equal(await s.w.check(), false);
  assert.equal(s.banner(), null);
  assert.deepEqual(await s.w.forReport(), { shortSha: '0123456789ab', sha256: BUILD.engineHash, engineVersion: '2.10.0' });
  assert.deepEqual(await s.w.mark(), { id: '0123456789ab', source: 'commit' });
  assert.equal(s.calls.filter(c => c[0] === BUILD_URL).length, 1, 'build.json bir marta o\'qiladi (keyingi so\'rovlar — xotiradan)');
  assert.equal(s.calls.some(c => c[0] === ENGINE_HASH_URL), false);
});

test('yangi versiya: banner (matn textContent orqali, i18n), sahifa mazmuni o\'zgarmaydi, yopish mumkin, qayta yuklash yo\'q', async () => {
  const s = setup({ [BUILD_URL]: NEXT }, '0123456789ab');
  assert.equal(await s.w.check(), true);
  const b = s.banner();
  assert.ok(b);
  assert.equal(b.getAttribute('role'), 'status');
  assert.equal(b.querySelector('.build-banner-text').textContent, 'T:bld_new_version');
  assert.equal(b.querySelector('button').textContent, 'T:bld_dismiss');
  assert.equal(b.dataset.build, 'f'.repeat(12));
  assert.equal(s.dom.window.document.getElementById('app').textContent, 'ish');
  assert.equal(s.dom.window.document.body.firstChild, b);
  await s.w.check();
  assert.equal(s.dom.window.document.querySelectorAll('#build-banner').length, 1, 'banner takrorlanmaydi');
  // til o'zgardi
  s.env.t = k => 'RU:' + k;
  s.w.relabel();
  assert.equal(s.banner().querySelector('.build-banner-text').textContent, 'RU:bld_new_version');
  // yopish — shu build uchun qayta chiqmaydi
  b.querySelector('button').click();
  assert.equal(s.banner(), null);
  await s.w.check(true);
  assert.equal(s.banner(), null);
  const src = fs.readFileSync(path.join(ROOT, 'src/ui/build/watcher.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'src/ui/build/app.js'), 'utf8');
  assert.ok(!/location\.(reload|replace|assign|href\s*=)|innerHTML|onclick=/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
});

test('yorliq qayta ko\'ringanda: oraliq o\'tgan bo\'lsa build.json qayta o\'qiladi va banner chiqadi', async () => {
  let current = BUILD;
  const s = setup({ [BUILD_URL]: () => current }, '0123456789ab');
  assert.equal(await s.w.check(), false);
  current = NEXT;                                   // deploy bo'ldi
  s.tick(RECHECK_MS - 1);
  assert.equal(await s.w.onVisible(), false);
  assert.equal(s.banner(), null);
  s.tick(2);
  assert.equal(await s.w.onVisible(), true);
  assert.ok(s.banner());
  assert.equal(s.calls.filter(c => c[0] === BUILD_URL).length, 2);
});

test('yaroqsiz build.json — e\'tiborsiz (jim); sahifalar build modulini va lug\'atini yuklaydi', async () => {
  const s = setup({ [BUILD_URL]: { format: 'uc-build/1', shortSha: '<script>' } }, '0123456789ab');
  assert.equal(await s.w.check(), false);
  assert.equal(s.banner(), null);
  for (const f of ['index.html', 'admin.html', 'superadmin.html', 'validation.html']) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.match(html, /<script type="module" src="src\/ui\/build\/app\.js"><\/script>/, f);
    assert.match(html, /<script src="src\/js\/i18n-build\.js"><\/script>/, f);
  }
});
