/* P16: kontrast ≥ 4,5:1 (WCAG 2.1 AA, oddiy matn) — ikkala mavzuda, dizayn tokenlaridan (src/css/tokens.css) avtomatik.
   Shaffof sirt va "yumshoq" urg'u fonlari fon ustiga qo'yib hisoblanadi (eng yomon holat). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readTokens, parseColor, over, contrast } = require('../tools/css-tokens.js');

const T = readTokens();
const MIN = 4.5;

for (const theme of ['dark', 'light']) {
  const tk = T[theme];
  const c = name => { assert.ok(tk[name], `${theme}: ${name} yo'q`); return parseColor(tk[name]); };
  const bg = c('--c-bg');
  const surfaces = {
    bg,
    surface: over(c('--c-surface'), bg),
    'raised-top': over(c('--c-raised-top'), bg),
    'raised-bottom': over(c('--c-raised-bottom'), bg),
    sunken: over(c('--c-sunken'), bg),
    solid: c('--c-surface-solid'),
  };

  test(`${theme}: matn ranglari har bir sirtda ≥ ${MIN}:1`, () => {
    for (const [sn, s] of Object.entries(surfaces)) {
      for (const name of ['--c-text', '--c-text-2', '--c-text-3']) {
        const r = contrast(c(name), s);
        assert.ok(r >= MIN, `${theme}: ${name} / ${sn} = ${r.toFixed(2)}`);
      }
    }
  });

  test(`${theme}: urg'u ranglari (matn / belgi sifatida) fon va sirtda ≥ ${MIN}:1`, () => {
    for (const name of ['--c-blue', '--c-amber', '--c-green', '--c-green-text', '--c-red', '--c-red-text', '--c-violet']) {
      for (const sn of ['bg', 'surface', 'solid']) {
        const r = contrast(c(name), surfaces[sn]);
        assert.ok(r >= MIN, `${theme}: ${name} / ${sn} = ${r.toFixed(2)}`);
      }
    }
  });

  test(`${theme}: yumshoq urg'u fonlarida matn ≥ ${MIN}:1 (nishonlar, topilmalar, faol menyu)`, () => {
    const pairs = [
      ['--c-blue-soft', ['--c-text', '--c-text-2', '--c-blue']],
      ['--c-amber-soft', ['--c-text', '--c-amber']],
      ['--c-green-soft', ['--c-text', '--c-green-text']],
      ['--c-red-soft', ['--c-text', '--c-red-text']],
      ['--c-violet-soft', ['--c-text', '--c-violet']],
    ];
    for (const [soft, texts] of pairs) {
      for (const sn of ['bg', 'surface']) {
        const back = over(c(soft), surfaces[sn]);
        for (const name of texts) {
          const r = contrast(c(name), back);
          assert.ok(r >= MIN, `${theme}: ${name} / ${soft} (${sn}) = ${r.toFixed(2)}`);
        }
      }
    }
  });

  test(`${theme}: asosiy tugma — urg'u fonidagi matn ≥ ${MIN}:1`, () => {
    const r = contrast(c('--c-on-accent'), c('--c-blue'));
    assert.ok(r >= MIN, `${theme}: on-accent / blue = ${r.toFixed(2)}`);
  });
}

test('loyiha qoidasi: qorong\'i fon #1e2235, sof qora (#000) fon tokenlarda yo\'q', () => {
  assert.equal(T.dark['--c-bg'].toLowerCase(), '#1e2235');
  for (const theme of ['dark', 'light']) for (const [k, v] of Object.entries(T[theme])) assert.ok(!/^#0{3,6}$/.test(v) && !/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*[,)]/.test(v), `${theme} ${k}: ${v}`);
});

test('ikkala mavzuda bir xil tokenlar to\'plami', () => {
  assert.deepEqual(Object.keys(T.dark).sort(), Object.keys(T.light).sort());
});
