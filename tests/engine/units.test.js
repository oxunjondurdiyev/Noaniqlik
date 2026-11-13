/* Birliklar va o'lchamlik tahlili (src/engine/units.js) — PLAN P03 4-band (docs/prompts P03 A).
   Ref: JCGM GUM-6:2020 §11 — PDF hali docs/references da yo'q: bu testlar mustaqil qo'lda hisob
   (SI Brochure ta'riflari) asosida, manba qo'shilgach qayta tekshiriladi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');

const near = (a, b, r = 1e-12) => Math.abs(a - b) <= r * Math.max(Math.abs(a), Math.abs(b), 1e-300);

test('parseUnit: o\'lchamlik va ko\'paytuvchi', () => {
  const cases = [
    ['mg/L', 'L^-3·M', 1e-3], ['m/s^2', 'L·T^-2', 1], ['kg·m²·s⁻²', 'L^2·M·T^-2', 1], ['mol/L', 'L^-3·N', 1e3],
    ['mA', 'I', 1e-3], ['kΩ', 'L^2·M·T^-3·I^-2', 1e3], ['µL', 'L^3', 1e-9], ['μm', 'L', 1e-6], ['nm', 'L', 1e-9],
    ['% об.', '1', 1e-2], ['%', '1', 1e-2], ['ppm', '1', 1e-6], ['CFU', '1', 1], ['bar', 'L^-1·M·T^-2', 1e5],
    ['hPa', 'L^-1·M·T^-2', 100], ['1/s', 'T^-1', 1], ['g/cm³', 'L^-3·M', 1e3], ['mK', 'Θ', 1e-3], ['°C', 'Θ', 1],
  ];
  for (const [t, dim, f] of cases) {
    const u = E.parseUnit(t);
    assert.ok(u, t);
    assert.equal(E.dimText(u.dim), dim, t);
    assert.ok(near(u.factor, f), `${t}: ${u.factor}`);
  }
  assert.equal(E.parseUnit(''), null);
  assert.equal(E.parseUnit(undefined), null);
  assert.equal(E.parseUnit('foo'), null);
  assert.equal(E.parseUnit('°C').affine, true);
  assert.equal(E.parseUnit('K').affine, false);
});

test('affin °C ↔ K: mutlaq harorat va harorat farqi', () => {
  assert.ok(near(E.convert(20, '°C', 'K'), 293.15));
  assert.ok(near(E.convert(293.15, 'K', '°C'), 20));
  assert.equal(E.convert(1.5, '°C', 'K', { difference: true }), 1.5);
  assert.ok(near(E.convert(250, 'mK', '°C', { difference: true }), 0.25));
  assert.ok(near(E.convert(1, 'bar', 'kPa'), 100));
  assert.throws(() => E.convert(1, 'm', 's'), /unit_mismatch/);
});

const model = (formula, units, comps = [], unit = '') => {
  const params = Object.keys(units);
  return {
    params, units, measurements: Object.fromEntries(params.map(p => [p, [1.5]])), directions: [],
    model: { formula, unit }, settings: { paired: false },
    typeB: comps.length ? comps : params.map(p => ({ name: 'u_' + p, param: p, halfWidth: 0.01, distribution: 'rect', unit: units[p] })),
  };
};

test('birliksiz eski hisob: avvalgidek, faqat eslatma units_unchecked', () => {
  const st = model('y = a + b', { a: '', b: '' });
  delete st.units;
  const r = E.evaluate(st);
  assert.ok(!r.error);
  assert.deepEqual(r.notes.map(n => n.code), ['units_unchecked']);
  assert.equal(r.units.checked, false);
});

test('qo\'shish/ayirishda o\'lchamlik mos kelmasa — xato (unit_mismatch)', () => {
  const r = E.evaluate(model('y = a + b', { a: 'm', b: 's' }));
  assert.equal(r.error, 'unit_mismatch');
  assert.match(r.detail, /a \[L\] \+ b \[T\]/);
  // mos birliklar (prefiks farqi o'lchamlikka ta'sir qilmaydi) — xato yo'q
  const ok = E.evaluate(model('y = a - b', { a: 'mm', b: 'km' }, [], 'm'));
  assert.ok(!ok.error, ok.error);
  assert.equal(ok.units.output, 'L');
  assert.ok(!ok.warnings.some(w => w.code.startsWith('unit_')));
});

test('sonli o\'zgarmas: + / − da istalgan o\'lchamlik bilan, × / da o\'lchamsiz', () => {
  const r = E.evaluate(model('y = (a - 4) * 1.25', { a: 'mA' }, [], 'mA'));
  assert.ok(!r.error);
  assert.equal(r.units.output, 'I');
  const d = E.evaluate(model('ρ = m / V', { m: 'g', V: 'cm³' }, [], 'g/cm³'));
  assert.ok(!d.error);
  assert.equal(d.units.output, 'L^-3·M');
  assert.ok(!d.warnings.some(w => w.code === 'unit_output'));
});

test('birlik xatosi misoli: mA va % об., c = 1 → ogohlantirish (unit_budget) — docs/prompts P03 qabul mezoni', () => {
  // Kirish E (% об.), B manba "mA" da berilgan va c = 1 bilan qo'shilgan — c·u(x) o'lchamligi y ga mos emas
  const st = model('y = E', { E: '% об.' }, [
    { name: 'PGS (U, k = 2)', param: 'E', halfWidth: 0.01, distribution: 'normal', k: 2, unit: '% об.' },
    { name: 'Tok o\'lchagich xatosi', param: 'E', halfWidth: 0.004, distribution: 'rect', unit: 'mA' },
  ], '% об.');
  const r = E.evaluate(st);
  assert.ok(!r.error, r.error);
  const w = r.warnings.filter(x => x.code === 'unit_budget');
  assert.equal(w.length, 1);
  assert.match(w[0].value, /mA ≠ % об\./);
});

test('chiqish birligi model birligiga mos kelmasa — ogohlantirish unit_output', () => {
  const r = E.evaluate(model('y = a * b', { a: 'V', b: 'A' }, [], 'Ω'));
  assert.ok(!r.error);
  assert.ok(r.warnings.some(w => w.code === 'unit_output'));
  const ok = E.evaluate(model('y = a * b', { a: 'V', b: 'A' }, [], 'W'));
  assert.ok(!ok.warnings.some(w => w.code === 'unit_output'));
});

test('funksiya argumenti o\'lchamsiz bo\'lishi kerak; √ o\'lchamlikni yarmiga bo\'ladi', () => {
  assert.equal(E.evaluate(model('y = exp(a)', { a: 'm' })).error, 'unit_fn_arg');
  assert.ok(!E.evaluate(model('y = exp(a)', { a: '%' })).error);
  const s = E.evaluate(model('y = sqrt(a)', { a: 'm²' }, [], 'm'));
  assert.equal(s.units.output, 'L');
});

test('affin birlikli (°C) kattalikni ko\'paytirish — ogohlantirish unit_affine', () => {
  const r = E.evaluate(model('y = a * t', { a: '1/K', t: '°C' }));
  assert.ok(!r.error);
  assert.ok(r.warnings.some(w => w.code === 'unit_affine'));
  const d = E.evaluate(model('y = t1 - t2', { t1: '°C', t2: '°C' }, [], 'K'));
  assert.ok(!d.warnings.some(w => w.code === 'unit_affine'));
});

test('qisman birliklar: ma\'lum bo\'lmagan qism tekshirilmaydi, eslatma units_partial', () => {
  const r = E.evaluate(model('y = a + b', { a: 'm', b: '' }));
  assert.ok(!r.error);
  assert.ok(r.notes.some(n => n.code === 'units_partial'));
});
