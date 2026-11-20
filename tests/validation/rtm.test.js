/* P13 §1: talablar izlanuvchanligi — har bir talab kamida bitta testga bog'langan yoki aniq belgilangan; bog'lanmagani — xato.
   Manba: docs/validation/REQUIREMENTS.md + rtm.map.json; RTM.md — scripts/rtm.js mahsuloti (eskirgan bo'lsa — xato). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../../scripts/rtm.js');

const ROOT = path.join(__dirname, '..', '..');
const real = R.loadRtm(ROOT);

test('RTM: repodagi barcha talablar bog\'langan, havolalar mavjud (xato yo\'q)', () => {
  assert.deepEqual(real.checked.errors, []);
  const s = real.checked.summary;
  assert.ok(s.requirements >= 300, `talablar: ${s.requirements}`);
  assert.deepEqual(s.unlinked, []);
  // testsiz talab faqat aniq belgi bilan
  for (const id of s.withoutTest) assert.ok(['unverified', 'pending', 'manual'].includes(real.map[id].status), id);
  assert.equal(Object.values(s.byStatus).reduce((a, b) => a + b, 0), s.requirements);
});

test('RTM.md yangilangan (node scripts/rtm.js --write) va deterministik', () => {
  assert.equal(fs.readFileSync(path.join(ROOT, R.FILES.rtm), 'utf8'), real.text + '\n', 'RTM.md eskirgan — node scripts/rtm.js --write');
  assert.equal(R.loadRtm(ROOT).text, real.text);
  assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:/.test(real.text), 'RTM.md da vaqt belgisi yo\'q');
});

test('ID lar barqaror formatda, yagona; har bir soha bo\'limi bor; eski qo\'lda yuritiladigan matritsa nusxasi qolmagan', () => {
  const ids = real.req.items.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^REQ-[A-Z]{3}-\d{3}$/);
  for (const a of ['GOV', 'GUM', 'RND', 'MCM', 'MVR', 'REG', 'TDN', 'SPM', 'LNT', 'RIO', 'TPL', 'LAB', 'PTV', 'VAL']) assert.ok(real.req.areas.some(x => x.area === a), a);
  const old = fs.readFileSync(path.join(ROOT, 'docs/VALIDATION_MATRIX.md'), 'utf8');
  assert.ok(old.split('\n').filter(l => l.startsWith('|')).length < 30, 'docs/VALIDATION_MATRIX.md — faqat ko\'rsatkich (jadvallar docs/validation/ ga ko\'chirilgan)');
  assert.match(old, /validation\/REQUIREMENTS\.md/);
});

const io = (over = {}) => ({
  exists: f => ['src/a.js', 'tests/a.test.js', 'src/dir'].includes(f), isDir: f => f === 'src/dir',
  read: () => 'export function foo() {}\nconst bar = 1;', cases: new Map([['c-ok', 'verified'], ['c-unv', 'unverified']]), discrepancies: new Set(['D-01']), ...over,
});
const req = rows => R.parseRequirements('## ABC — Sinov\n\n| ID | Talab | Kelib chiqishi |\n|---|---|---|\n' + rows.map(r => `| ${r} | matn \\| bilan | manba |`).join('\n'));

test('checkRtm: bog\'lanmagan talab, yo\'q fayl / funksiya / misol, noto\'g\'ri holat — xato', () => {
  const ok = { code: ['src/a.js::foo'], tests: ['tests/a.test.js', 'case:c-ok'], status: 'verified' };
  assert.deepEqual(R.checkRtm(req(['REQ-ABC-001']), { 'REQ-ABC-001': ok }, io()).errors, []);
  assert.equal(R.parseRequirements('## ABC — S\n| REQ-ABC-001 | a \\| b | m |').items[0].text, 'a | b');
  const errs = (rows, map) => R.checkRtm(req(rows), map, io()).errors.join('\n');
  assert.match(errs(['REQ-ABC-001'], {}), /rtm\.map\.json da yo'q — talab hech narsaga bog'lanmagan/);
  assert.match(errs(['REQ-ABC-001'], { 'REQ-ABC-001': { ...ok, tests: [] } }), /hech qanday testga bog'lanmagan/);
  assert.match(errs(['REQ-ABC-001'], { 'REQ-ABC-001': { ...ok, tests: ['case:c-unv'] } }), /hech biri verified emas/);
  assert.match(errs(['REQ-ABC-001'], { 'REQ-ABC-001': { ...ok, tests: ['tests/yoq.test.js'] } }), /test fayli yo'q/);
  assert.match(errs(['REQ-ABC-001'], { 'REQ-ABC-001': { ...ok, tests: ['case:yoq'] } }), /test misoli yo'q/);
  assert.match(errs(['REQ-ABC-001'], { 'REQ-ABC-001': { ...ok, code: ['src/yoq.js'] } }), /kod fayli yo'q/);
  assert.match(errs(['REQ-ABC-001'], { 'REQ-ABC-001': { ...ok, code: ['src/a.js::baz'] } }), /"baz" topilmadi/);
  assert.match(errs(['REQ-ABC-001'], { 'REQ-ABC-001': { ...ok, code: [] } }), /kod havolasi yo'q/);
  assert.match(errs(['REQ-ABC-001'], { 'REQ-ABC-001': { ...ok, status: 'done' } }), /noma'lum holat/);
  assert.match(errs(['REQ-ABC-001'], { 'REQ-ABC-001': { code: [], tests: [], status: 'pending' } }), /izoh \(sabab\) majburiy/);
  assert.match(errs(['REQ-ABC-001'], { 'REQ-ABC-001': { ...ok, discrepancies: ['D-99'] } }), /D-99/);
  assert.match(errs(['REQ-ABC-001', 'REQ-ABC-001'], { 'REQ-ABC-001': ok }), /takror ID/);
  assert.match(errs(['REQ-ABC-1'], {}), /ID formati/);
  assert.match(errs(['REQ-XYZ-001'], { 'REQ-XYZ-001': ok }), /bo'limida turibdi/);
  assert.match(errs(['REQ-ABC-001'], { 'REQ-ABC-001': ok, 'REQ-ABC-002': ok }), /REQ-ABC-002: rtm\.map\.json da bor, REQUIREMENTS\.md da yo'q/);
  // aniq belgi bilan testsiz talab — ruxsat
  const pend = R.checkRtm(req(['REQ-ABC-001']), { 'REQ-ABC-001': { code: [], tests: [], status: 'unverified', note: 'manba repoda yo\'q' } }, io());
  assert.deepEqual(pend.errors, []);
  assert.deepEqual(pend.summary.withoutTest, ['REQ-ABC-001']);
});
