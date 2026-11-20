/* P12: linter L3 — oxirgi PT raundi qoniqarsiz → info (egasi qarori 2026-11-19, R-26 #6; docs/LINTER_RULES.md §4 #30).
   Hisob PT seriyasiga aniq bog'langanda (settings.ptLink — seriya nusxasi) ishlaydi; GUM va TOP_DOWN rejimlarida. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');

const gum = settings => ({ format: 'calc-state/v2', state: { params: ['x'], measurements: { x: [10.1, 10.2, 10.0, 10.3] }, model: { formula: 'y = x' }, typeB: [], settings } });
const series = (rounds) => ({ id: 'pt:1', version: 3, name: 'Pb suvda', rounds });
const linkOf = rounds => {
  const r = E.evaluate({ format: 'uc-pt/1', rounds });
  return E.ptLinkOf(series(rounds), r);
};

test('L3 ijobiy: oxirgi raund (sana bo\'yicha) qoniqarsiz → info pt_last_unsatisfactory (GUM)', () => {
  const link = linkOf([
    { id: 'R2', date: '2026-06-01', x: 11.2, xpt: 10, sigmaPt: 0.3 },     // z = 4 — qoniqarsiz, eng kech
    { id: 'R1', date: '2026-01-01', x: 10.1, xpt: 10, sigmaPt: 0.3 },
  ]);
  assert.equal(link.lastRound.id, 'R2');
  const f = E.evaluate(gum({ ptLink: link })).findings.filter(x => x.code === 'pt_last_unsatisfactory');
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, 'info');
  assert.equal(f[0].rule, 'L3');
  assert.match(f[0].value, /Pb suvda: R2 \(2026-06-01\), z = 4/);
  assert.ok(E.FINDING_CODES.pt_last_unsatisfactory);
});

test('L3 ijobiy: TOP_DOWN spetsifikatsiyasida (settings.ptLink)', () => {
  const link = linkOf([{ id: 'R1', x: 11.2, xpt: 10, sigmaPt: 0.3 }]);
  const spec = { format: 'uc-topdown/1', approach: 'NORDTEST', scale: { relative: true }, relativeUnit: '%', settings: { ptLink: link }, rw: { components: [{ type: 'stated', id: 's', s: 2, n: 10, relative: true }] } };
  assert.ok(E.evaluate(spec).findings.some(x => x.code === 'pt_last_unsatisfactory'));
});

test('L3 salbiy: oxirgi raund qoniqarli / shubhali yoki bog\'lanish yo\'q — topilma yo\'q; avvalgi qoniqarsiz raund hisobga olinmaydi', () => {
  const ok = linkOf([{ id: 'R1', date: '2026-01-01', x: 11.2, xpt: 10, sigmaPt: 0.3 }, { id: 'R2', date: '2026-06-01', x: 10.1, xpt: 10, sigmaPt: 0.3 }]);
  assert.equal(ok.lastRound.verdict, 'satisfactory');
  assert.ok(!E.evaluate(gum({ ptLink: ok })).findings.some(x => x.code === 'pt_last_unsatisfactory'));
  const q = linkOf([{ id: 'R1', x: 10.75, xpt: 10, sigmaPt: 0.3 }]);    // z = 2,5 — shubhali
  assert.equal(q.lastRound.verdict, 'questionable');
  assert.ok(!E.evaluate(gum({ ptLink: q })).findings.some(x => x.code === 'pt_last_unsatisfactory'));
  assert.ok(!E.evaluate(gum({})).findings.some(x => x.rule === 'L3'));
  assert.equal(E.ptLinkOf(series([]), null), null);
});
