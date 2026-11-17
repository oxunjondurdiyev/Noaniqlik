/* P04 qabul mezoni: kod yozmasdan yangi shablon qo'shib hisoblash mumkin.
   docs/templates/examples/LAB-EXAMPLE-01.json (docs/TEMPLATE_GUIDE.md 1-misol) faqat JSON —
   interpreter uni sxemadan o'tkazadi va hisoblaydi. Sintetik kirishlar (faqat test uchun);
   kutilgan y va u_c shu yerda analitik hisoblanadi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('../../src/templates/interpreter.js');
const { schema } = require('./lib.js');
const tpl = require('../../docs/templates/examples/LAB-EXAMPLE-01.json');

test('yo\'riqnoma misoli: sxema va model tekshiruvi', () => {
  assert.deepEqual(T.checkTemplate(tpl, schema), { valid: true, errors: [], warnings: [] });
});

test('yo\'riqnoma misoli: bo\'sh shablon hisoblanmaydi, to\'ldirilgach y va u_c analitik bilan mos', () => {
  assert.equal(T.evaluateTemplate(tpl, {}).error, 'template_incomplete');
  const v = { m0: 30, m1: 80, m2: 75 }, d = 0.001, rw = 0.998, U = 0.0002, res = 0.0001;
  const observations = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, [x - d, x, x + d]]));
  const sources = {};
  for (const s of ['m0', 'm1', 'm2']) { sources[s + '_cert'] = { halfWidth: U, k: 2 }; sources[s + '_res'] = { halfWidth: res }; }
  const r = T.evaluateTemplate(tpl, { observations, sources, constants: { rho_w: rw }, settings: { paired: false } });
  assert.ok(!r.error && !r.result.error);
  const y = (v.m2 - v.m0) / (v.m1 - v.m0) * rw;
  const g = { m0: rw * (v.m2 - v.m1) / (v.m1 - v.m0) ** 2, m1: -rw * (v.m2 - v.m0) / (v.m1 - v.m0) ** 2, m2: rw / (v.m1 - v.m0) };
  const uc_ = U / 2, u2 = (d / Math.sqrt(3)) ** 2 + uc_ ** 2 + (res / (2 * Math.sqrt(3))) ** 2;
  let uc2 = ['m0', 'm1', 'm2'].reduce((s, k) => s + g[k] ** 2 * u2, 0);
  for (const [a, b] of [['m0', 'm1'], ['m0', 'm2'], ['m1', 'm2']]) uc2 += 2 * g[a] * g[b] * uc_ * uc_;
  assert.ok(Math.abs(r.result.y - y) <= 1e-9 * y);
  assert.ok(Math.abs(r.result.uc - Math.sqrt(uc2)) <= 1e-9 * Math.sqrt(uc2));
  assert.equal(r.result.units.checked, true);
});
