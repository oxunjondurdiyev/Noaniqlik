/* P04: validator, katalog, holat oqimi (DRAFT → REVIEWED → APPROVED), qulflash va yangi versiya,
   qidiruv (standart shifri), includeByDefault, "bitta asbob" korrelyatsiyasi, demo belgisi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../../src/templates/interpreter.js');
const { validate } = require('../../src/templates/validator.js');
const { schema, templates, byId, TPL_DIR } = require('./lib.js');

/* ── validator ── */
test('validator: type, required, enum, pattern, additionalProperties, $ref, anyOf, items', () => {
  const s = {
    type: 'object', required: ['a'], additionalProperties: false,
    properties: { a: { $ref: '#/definitions/x' }, b: { type: 'array', items: { enum: [1, 2] }, minItems: 1 }, c: { anyOf: [{ type: 'string', pattern: '^q' }, { type: 'null' }] } },
    definitions: { x: { type: 'integer', minimum: 0 } },
  };
  assert.equal(validate(s, { a: 1, b: [1, 2], c: 'qq' }).valid, true);
  assert.equal(validate(s, { a: 1, c: null }).valid, true);
  const bad = validate(s, { a: -1, b: [3], c: 'x', d: 1 });
  assert.equal(bad.valid, false);
  const msgs = bad.errors.map(e => e.path + ' ' + e.message).join('\n');
  assert.match(msgs, /\$\.a < 0/);
  assert.match(msgs, /\$\.b\[0\] not in enum/);
  assert.match(msgs, /\$\.c does not match anyOf/);
  assert.match(msgs, /\$\.d additional property not allowed/);
  assert.equal(validate(s, { b: [] }).errors.length, 2); // required a + minItems
});

test('validator: noma\'lum kalit so\'z — xato (sxema validatordan oshib ketmaydi)', () => {
  assert.throws(() => validate({ type: 'object', propertyNames: {} }, {}), /not supported: propertyNames/);
});

test('sxema: uch tildagi matn majburiy (en yo\'q bo\'lsa xato)', () => {
  const t = JSON.parse(JSON.stringify(byId['T-03']));
  delete t.title.en;
  const r = T.checkTemplate(t, schema);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => /title.*missing required "en"/.test(e)), r.errors.join('\n'));
});

test('semantika: noma\'lum kirish, formulada ishlatilmagan kirish, o\'lchamlik xatosi aniqlanadi', () => {
  const t = JSON.parse(JSON.stringify(byId['T-11']));
  t.typeBSources[0].input = 'zz';
  assert.ok(T.checkTemplate(t, schema).errors.some(e => /unknown input zz/.test(e)));
  const t2 = JSON.parse(JSON.stringify(byId['T-11']));
  t2.model.formula = 'W = m1 * 100';
  assert.ok(T.checkTemplate(t2, schema).errors.some(e => /input m is not used/.test(e)));
  const t3 = JSON.parse(JSON.stringify(byId['T-11']));
  t3.inputs[1].unit = 'mm';   // g − mm
  assert.ok(T.checkTemplate(t3, schema).errors.some(e => /unit_mismatch/.test(e)));
});

/* ── katalog ── */
test('katalog: index.json papkadagi barcha shablonlarni sanaydi; fayl nomi = id', () => {
  const files = fs.readdirSync(TPL_DIR).filter(f => f.endsWith('.json') && f !== 'index.json').sort();
  assert.deepEqual(templates.map(x => x.file).sort(), files);
  for (const { file, tpl } of templates) assert.equal(file, tpl.id + '.json');
  assert.equal(templates.length, 44); // 11 legacy + 24 T-* + R-01 (P08) + TD-01…TD-04 (P09) + SP-01…SP-04 (P10)
});

test('katalog: barcha shablonlar sxemadan va semantik tekshiruvdan o\'tadi', () => {
  for (const { tpl } of templates) {
    const r = T.checkTemplate(tpl, schema);
    assert.deepEqual(r.errors, [], tpl.id);
  }
});

test('qidiruv standart shifri bo\'yicha: "10180" → T-03; "ГОСТ 8735" → T-06, T-07, T-09; "60335" → elektr', () => {
  const find = q => templates.map(x => x.tpl).filter(t => T.matchTemplate(t, q)).map(t => t.id);
  assert.deepEqual(find('10180'), ['T-03']);
  assert.deepEqual(find('ГОСТ 8735'), ['T-06', 'T-07', 'T-09']);
  assert.deepEqual(find('60335'), ['T-22', 'T-23', 'T-24']);
  assert.deepEqual(find('22567.6'), ['T-17']);  // variant standarti
  assert.ok(find('').length === 44);
  assert.deepEqual(find('beton qorishmasi'), ['T-04']);
});

/* ── holat oqimi ── */
test('holat oqimi: DRAFT → REVIEWED → APPROVED; APPROVED dan DRAFT ga to\'g\'ridan-to\'g\'ri o\'tib bo\'lmaydi', () => {
  const t0 = byId['T-02'];
  assert.equal(T.transition(t0, 'APPROVED').error, 'bad_transition');
  const t1 = T.transition(t0, 'REVIEWED', { by: 'tekshiruvchi', at: '2026-11-13T00:00:00Z' }).template;
  assert.equal(t1.status, 'REVIEWED');
  const t2 = T.transition(t1, 'APPROVED', { by: 'tasdiqlovchi', at: '2026-11-13T00:00:01Z' }).template;
  assert.equal(t2.status, 'APPROVED');
  assert.deepEqual(t2.locked, T.DEFAULT_LOCKED);
  assert.equal(t2.history.length, 2);
  assert.equal(T.transition(t2, 'DRAFT').error, 'bad_transition');
  assert.equal(t0.status, 'DRAFT', 'asl obyekt o\'zgarmaydi');
});

test('APPROVED: qulflangan maydon tahrirlanmaydi, qulflanmagani tahrirlanadi; o\'zgartirish — yangi versiya', () => {
  let t = T.transition(byId['T-02'], 'REVIEWED').template;
  t = T.transition(t, 'APPROVED').template;
  const e1 = T.applyEdit(t, { model: { formula: 'δ = (lk - l0) / l0' } });
  assert.equal(e1.error, 'locked');
  assert.deepEqual(e1.detail, ['model']);
  assert.equal(T.applyEdit(t, { typeBSources: [] }).error, 'locked');
  const ok = T.applyEdit(t, { sourceNote: { uz: 'a', ru: 'b', en: 'c' } });
  assert.ok(ok.template);
  assert.equal(T.applyEdit(t, { status: 'DRAFT' }).error, 'use_transition');
  const nv = T.newVersion(t, { at: '2026-11-14T00:00:00Z' }).template;
  assert.equal(nv.version, '0.2.0');
  assert.equal(nv.status, 'DRAFT');
  assert.equal(nv.locked, undefined);
  assert.ok(T.applyEdit(nv, { model: { formula: 'δ = (lk - l0) / l0 * 100' } }).template);
  assert.equal(T.newVersion(t, { bump: 'major' }).template.version, '1.0.0');
  assert.equal(T.newVersion(t, { bump: 'patch' }).template.version, '0.1.1');
});

/* ── includeByDefault / korrelyatsiya / demo ── */
function fill(tpl, variant) {
  const b = T.buildState(tpl, { variant }, { allowMissing: true }).state;
  const observations = {}, sources = {}, constants = {};
  b.params.forEach((p, i) => { const v = 100 + 10 * i; observations[p] = [v - 0.1, v, v + 0.1]; });
  for (const s of tpl.typeBSources) sources[s.id] = { halfWidth: 0.05, k: 2 };
  for (const c of tpl.constants || []) constants[c.symbol] = 1;
  return { variant, observations, sources, constants, settings: { paired: false } };
}

test('includeByDefault: false — namunaning o\'zgaruvchanligi standart holatda kiritilmaydi, so\'ralsa kiritiladi', () => {
  const tpl = byId['T-03'];
  const d = fill(tpl);
  const off = T.evaluateTemplate(tpl, d);
  assert.deepEqual(off.meta.excluded, ['F_sample']);
  assert.ok(!off.result.budget.some(b => /o'zgaruvchanligi|variability/.test(b.name)));
  const on = T.evaluateTemplate(tpl, { ...d, sources: { ...d.sources, F_sample: { halfWidth: 100, include: true } } });
  assert.deepEqual(on.meta.excluded, []);
  assert.ok(on.result.uc > off.result.uc);
});

test('bitta asbob korrelyatsiyasi: yoqilganda u(m1,m) = r·u_cal(m1)·u_cal(m) (ajratish qobiliyatisiz), o\'chirilganda 0', () => {
  const tpl = byId['T-11'];
  const d = fill(tpl);
  const on = T.evaluateTemplate(tpl, d);
  const off = T.evaluateTemplate(tpl, { ...d, correlations: { m_m1: false } });
  const ucal = 0.05 / 2; // sertifikat manbasi (normal, k = 2); _res mustaqil
  assert.equal(on.spec.covB['m1|m'], 1 * ucal * ucal);
  assert.equal(off.spec.covB['m1|m'], undefined);
  const pair = on.result.pairs.find(p => p.a === 'm1' && p.b === 'm');
  assert.ok(pair.covB > 0 && pair.r > 0 && pair.r < 1);
  // W = (m1 − m)/m: c(m1) > 0, c(m) < 0 → musbat korrelyatsiya u_c ni kamaytiradi
  assert.ok(on.result.uc < off.result.uc);
});

test('T-12: uchta massa bir guruhda — barcha juftlar uchun kovariatsiya', () => {
  const r = T.evaluateTemplate(byId['T-12'], fill(byId['T-12']));
  assert.deepEqual(Object.keys(r.spec.covB).sort(), ['m0|m', 'm1|m', 'm1|m0']);
});

test('variant: T-01 doiraviy/to\'g\'ri burchakli kesim — kirishlar va formula; T-08 excludeSources', () => {
  const tpl = byId['T-01'];
  assert.deepEqual(T.buildState(tpl, { variant: 'round' }, { allowMissing: true }).state.params, ['F', 'd0']);
  assert.deepEqual(T.buildState(tpl, { variant: 'rect' }, { allowMissing: true }).state.params, ['F', 'a0', 'b0']);
  assert.equal(T.buildState(tpl, { variant: 'nope' }).error, 'bad_variant');
  const t8 = byId['T-08'];
  const ids = v => T.buildState(t8, { variant: v }, { allowMissing: true }).state.typeB.map(c => c.sourceId);
  assert.ok(ids('crushing').includes('m1_press'));
  assert.ok(!ids('dust_clay').includes('m1_press'));
});

test('variant o\'zgarmasi: T-24 mis/alyuminiy k; T-17 f laboratoriyadan (bo\'sh bo\'lsa — missing)', () => {
  const t24 = byId['T-24'];
  assert.deepEqual(T.buildState(t24, { variant: 'copper' }, { allowMissing: true }).state.measurements.k, [234.5]);
  assert.deepEqual(T.buildState(t24, { variant: 'aluminium' }, { allowMissing: true }).state.measurements.k, [225]);
  const m = T.buildState(byId['T-17'], { variant: 'gost_4245' }, { allowMissing: true }).missing;
  assert.ok(m.some(x => x.type === 'constant' && x.symbol === 'f'));
  assert.ok(m.some(x => x.type === 'constant' && x.symbol === 'gamma'), 'aux o\'zgarmas ham so\'raladi');
});

test('aux o\'zgarmas: T-14 harorat manbasi a = x̄·α·Δt sifatida hisoblanadi', () => {
  const tpl = byId['T-14'];
  const d = fill(tpl);
  d.constants = { alpha_t: 1.2e-5, dt: 3 };
  delete d.sources.x_temp;
  const r = T.evaluateTemplate(tpl, d);
  const c = r.spec.typeB.find(x => x.name === r.state.typeB.find(s => s.sourceId === 'x_temp').name);
  assert.equal(c.halfWidth, 100 * 1.2e-5 * 3);
});

test('demo belgisi: namunaviy ma\'lumot bilan hisob meta.demo = true (gazoanalizator — laboratoriya Excel\'i, demo emas)', () => {
  assert.equal(T.evaluateTemplate(byId['legacy-mass'], { useSample: true }).meta.demo, true);
  assert.equal(T.evaluateTemplate(byId['legacy-thermometer'], { useSample: true, point: 0 }).meta.demo, true);
  assert.equal(T.evaluateTemplate(byId['legacy-gas_analyzer'], { useSample: true, point: 1 }).meta.demo, false);
  assert.equal(T.evaluateTemplate(byId['legacy-mass'], { observations: { m: [1, 2, 3] } }).meta.demo, false);
});

test('"demo": true belgili har bir shablon/nuqta UI ogohlantirishiga ulangan (meta.demo)', () => {
  for (const { tpl } of templates) {
    const raw = JSON.stringify(tpl);
    if (!raw.includes('"demo":true')) continue;
    if (T.isRegression(tpl)) { // P08: REGRESSION shabloni — buildRegressionSpec
      assert.equal(T.buildRegressionSpec(tpl, { useSample: true }).meta.demo, true, tpl.id);
      continue;
    }
    const data = tpl.points ? { useSample: true, point: tpl.points.findIndex(p => p.demo) } : { useSample: true };
    assert.equal(T.buildState(tpl, data, { allowMissing: true }).meta.demo, true, tpl.id);
  }
});

test('prepareState: template maydonisiz eski holat o\'zgarishsiz; takroriy chaqiruv bir xil natija', () => {
  const st = { params: ['x'], measurements: { x: [1, 2] }, typeB: [] };
  assert.equal(T.prepareState(st), st);
  const b = T.buildState(byId['T-11'], fill(byId['T-11'])).state;
  const once = T.prepareState(b);
  assert.deepEqual(T.prepareState(once), once);
});

test('laboratoriya sozlamalari: APP_DEFAULTS < lab < shablon < foydalanuvchi', () => {
  const tpl = byId['legacy-gas_analyzer'];
  const b = T.buildState(tpl, { useSample: true, point: 0, settings: { cmc: '0.01' } }, { labSettings: { P: 0.95, nuRule: 'interpolate', rounding: 'normal', secondOrder: true } });
  assert.equal(b.state.settings.P, 0.9545, 'shablon P ni beradi');
  assert.equal(b.state.settings.rounding, 'up', 'shablon');
  assert.equal(b.state.settings.nuRule, 'interpolate', 'lab');
  assert.equal(b.state.settings.secondOrder, true, 'lab');
  assert.equal(b.state.settings.cmc, '0.01', 'foydalanuvchi');
  const b2 = T.buildState(byId['T-11'], fill(byId['T-11']), { labSettings: { P: 0.95 } });
  assert.equal(b2.state.settings.P, 0.95);
});

test('tr(): til tanlovi va zaxira', () => {
  assert.equal(T.tr({ uz: 'a', ru: 'b', en: 'c' }, 'ru'), 'b');
  assert.equal(T.tr({ uz: 'a', ru: 'b', en: 'c' }, 'xx'), 'c');
  assert.equal(T.tr('s'), 's');
  assert.equal(T.tr(null), '');
});

test('interpreter va validator sof: DOM/brauzer xotirasiga bog\'liq emas', () => {
  for (const f of ['interpreter.js', 'validator.js']) {
    const src = fs.readFileSync(path.join(__dirname, '../../src/templates', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/\b(document|window|localStorage|indexedDB)\b/.test(src), f);
  }
});
