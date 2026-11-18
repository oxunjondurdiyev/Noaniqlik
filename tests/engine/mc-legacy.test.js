/* P06 — eski generator (xorshift32, ENGINE ≤ 2.5.0) bilan natijani bit darajasida takrorlash (audit izi).
   Kutilgan qiymatlar — ENGINE 2.5.0 (commit c1cccce) monteCarlo() chiqishi, P06 dan OLDIN yozib olingan:
   tests/engine/fixtures/mc-legacy-2.5.0.json. Bu manba qiymati emas — regressiya (o'z-o'ziga moslik). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');
const SNAP = require('./fixtures/mc-legacy-2.5.0.json');

const load = id => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cases', id + '.json'), 'utf8')).modelSpec;

test('fixture: 2.5.0 da yozib olingan, 6 ta hisob', () => {
  assert.equal(SNAP.engineVersion, '2.5.0');
  assert.equal(SNAP.runs.length, 6);
});

for (const run of SNAP.runs) {
  test(`xorshift32-legacy: ${run.case}, M = ${run.M} — 2.5.0 natijasi aynan takrorlanadi`, () => {
    const spec = load(run.case);
    const direct = E.monteCarloLegacy(spec, run.M);
    const viaApi = E.monteCarlo(spec, { rng: 'xorshift32-legacy', M: run.M });
    for (const [k, v] of Object.entries(run.result)) {
      assert.ok(Object.is(direct[k], v), `monteCarloLegacy.${k}: ${direct[k]} ≠ ${v}`);
      assert.ok(Object.is(viaApi[k], v), `monteCarlo(rng: legacy).${k}: ${viaApi[k]} ≠ ${v}`);
    }
    assert.deepEqual(viaApi.rng, { name: 'xorshift32-legacy', seed: 20261110 });
    assert.equal(viaApi.legacy, true);
    assert.equal(viaApi.mode, 'MC');
    // eski generator ishlatilgani topilma sifatida ko'rinadi (M4, info)
    const f = viaApi.findings.find(x => x.code === 'mc_legacy_rng');
    assert.equal(f.severity, 'info');
    assert.equal(f.rule, 'M4');
  });
}

test('yangi hisoblar eski generatorni ishlatmaydi; natija boshqa (generator almashgan), mc_legacy_rng yo\'q', () => {
  const spec = load('excel/excel-gas-p2');
  const neu = E.monteCarlo(spec, { mode: 'fixed', M: 20000 });
  assert.equal(neu.rng.name, 'wichmann-hill-2006');
  assert.notEqual(neu.low, SNAP.runs.find(r => r.case === 'excel/excel-gas-p2').result.low);
  assert.ok(!neu.findings.some(f => f.code === 'mc_legacy_rng'));
  assert.equal(E.MC_DEFAULTS.rng, 'wichmann-hill-2006');
});
