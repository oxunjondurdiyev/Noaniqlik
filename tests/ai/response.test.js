/* P14: src/ai/response.js — AI javobi ISHONCHSIZ ma'lumot (docs/AI_DESIGN.md §6). Rad etiladi: noto'g'ri JSON, sxemaga
   mos kelmaydigan javob, manba parchasi kirishda yo'q bo'lgan son, mos kelmaydigan birlik, MPE ni manba qilib taklif,
   HTML / skript. Tasdiqlanmagan son shablonga / reestrga kirmaydi. Haqiqiy API chaqirilmaydi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../../src/ai/response.js');
const P = require('../../src/ai/payload.js');
const { PROMPTS, buildPrompt } = require('../../src/ai/prompts/index.js');
const { validate } = require('../../src/templates/validator.js');
const E = require('../../src/engine/index.js');

const ROOT = path.join(__dirname, '..', '..');
const schema = n => JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas/ai', n + '.schema.json'), 'utf8'));
const METH = JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas/methodology.schema.json'), 'utf8'));
const S = { tpl: schema('template-draft'), cert: schema('certificate'), expl: schema('explain'), sug: schema('source-suggest') };

const DOC = `5.1. Termometr ko'rsatishi t (°C) etalon termometr ko'rsatishi ts bilan solishtiriladi: E = t - ts.
5.2. Etalon termometrning kengaytirilgan noaniqligi U = 0,02 °C (k = 2), sertifikat bo'yicha.
5.3. Termostat haroratining notekisligi ± 0,05 °C dan oshmaydi (GOST 8.558-2009 bo'yicha).
5.4. Tekshirilayotgan termometrning ruxsat etilgan xatosi ± 0,5 °C.`;
const tplResp = (over = {}) => ({
  title: 'Termometrni kalibrlash', formula: 'E = t - ts', measurand: { symbol: 'E', name: 'Xato', unit: '°C' },
  inputs: [{ symbol: 't', name: 'Ko\'rsatish', unit: '°C', kind: 'observation' }, { symbol: 'ts', name: 'Etalon', unit: '°C', kind: 'reference' }],
  sources: [
    { input: 'ts', name: 'Etalon sertifikati', kind: 'certificate', distribution: 'normal', unit: '°C', halfWidth: { value: 0.02, quote: 'kengaytirilgan noaniqligi U = 0,02 °C (k = 2)', section: '5.2' }, k: { value: 2, quote: 'U = 0,02 °C (k = 2)', section: '5.2' } },
    { input: 'ts', name: 'Termostat notekisligi', kind: 'environment', distribution: 'rect', unit: '°C', halfWidth: { value: 0.05, quote: 'notekisligi ± 0,05 °C dan oshmaydi', section: '5.3' }, k: null },
  ],
  standards: [{ code: 'GOST 8.558-2009', clause: '', quote: '(GOST 8.558-2009 bo\'yicha)' }], notes: 'Qoralama', ...over,
});
const ctxT = { schema: S.tpl, documentText: DOC, methodologySchema: METH, id: 'AI-test1', now: '2026-11-20T10:00:00.000Z' };
const parseT = o => R.parseResponse('template_draft', JSON.stringify(tplResp(o)), ctxT);

test('javob sxemalari: mahalliy validator qabul qiladi; Anthropic structured outputs cheklovlariga mos (oneOf / minimum / maxLength yo\'q)', () => {
  for (const s of Object.values(S)) {
    validate(s, {});                                              // noma'lum kalit so'z bo'lsa — xato tashlaydi
    const text = JSON.stringify(s);
    for (const kw of ['oneOf', '"not"', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'minItems', 'maxItems']) assert.ok(!text.includes(kw), kw);
    (function walk(n) { if (n && typeof n === 'object') { if (n.type === 'object') assert.equal(n.additionalProperties, false); Object.values(n).forEach(walk); } })(s);
  }
  // sxemalarda natija maydoni yo'q
  for (const s of [S.expl, S.sug]) assert.ok(!/"number"/.test(JSON.stringify(s)), 'c / d javobida son maydoni yo\'q');
});

test('prompt shablonlari: id + semver; matnda payload va sxema; qo\'riqchidan o\'tmagan payload — xato', () => {
  for (const p of Object.values(PROMPTS)) { assert.match(p.id, /^uc-ai\//); assert.match(p.version, /^\d+\.\d+\.\d+$/); }
  const payload = P.buildSourceSuggestPayload({ params: ['x'], measurements: {}, model: { formula: 'y = x' }, settings: {}, typeB: [] }, { lang: 'uz' });
  const pr = buildPrompt(payload, S.sug);
  assert.deepEqual([pr.promptId, pr.promptVersion], ['uc-ai/source_suggest', '1.0.0']);
  assert.ok(pr.text.includes(P.serializePayload(payload)) && pr.text.includes('"suggestions"') && pr.text.startsWith('[uc-ai/source_suggest@1.0.0]'));
  assert.throws(() => buildPrompt({ ...payload, result: { y: '1' } }, S.sug), e => e.code === 'ai_payload_unknown_key');
  assert.throws(() => buildPrompt(payload, null), e => e.code === 'ai_schema_required');
  // rasm: base64 prompt matniga kirmaydi
  const img = buildPrompt(P.buildCertificatePayload({ data: 'iVBORw0KGgo=', mediaType: 'image/png' }, { documentConsent: true }), S.cert);
  assert.ok(img.hasImage && !img.text.includes('iVBORw0KGgo='));
});

test('noto\'g\'ri JSON, ortiqcha matn, juda katta / chuqur javob, sxemaga mos kelmaydigan javob — rad etiladi', () => {
  const ctx = { schema: S.expl, payload: { findings: [{ code: 'n_small' }] } };
  const code = t => R.parseResponse('explain', t, ctx).code;
  assert.equal(code('salom'), 'ai_response_not_json');
  assert.equal(code('Mana javob: {"summary":"a","items":[]}'), 'ai_response_not_json');
  assert.equal(code('{"summary":"a","items":[]} // izoh'), 'ai_response_not_json');
  assert.equal(code('[1,2]'), 'ai_response_not_json');
  assert.equal(code('{"summary": NaN}'), 'ai_response_not_json');
  assert.equal(code(123), 'ai_response_not_text');
  assert.equal(code('{"summary":"' + 'x'.repeat(R.RESPONSE_LIMITS.chars) + '","items":[]}'), 'ai_response_too_large');
  assert.equal(code(JSON.stringify({ summary: 'x'.repeat(R.RESPONSE_LIMITS.string + 1), items: [] })), 'ai_response_too_large');
  assert.equal(code('{"a":'.repeat(20) + '1' + '}'.repeat(20)), 'ai_response_too_deep');
  assert.equal(code('{"summary":"a"}'), 'ai_response_schema');
  assert.equal(code('{"summary":"a","items":[],"y":1.23,"U":0.04}'), 'ai_response_schema');          // natija maydoni — sxemada yo'q
  assert.equal(code('{"summary":"a","items":[{"code":"n_small","text":"t","action":"delete"}]}'), 'ai_response_schema');
  assert.equal(code('{"summary":5,"items":[]}'), 'ai_response_schema');
  assert.equal(code('{"summary":"","items":[]}'), 'ai_response_empty');
  assert.equal(R.parseResponse('evaluate', '{}', ctx).code, 'ai_payload_bad_function');
  assert.equal(R.parseResponse('explain', '{}', {}).code, 'ai_schema_required');
  // chat oynasidan nusxalangan yagona ``` to'sig'i — qabul
  assert.equal(R.parseResponse('explain', '```json\n{"summary":"a","items":[]}\n```', ctx).ok, true);
});

test('c) tushuntirish: faqat yuborilgan kodlar; HTML / skriptli band tashlanadi', () => {
  const ctx = { schema: S.expl, payload: { findings: [{ code: 'n_small' }, { code: 'zero_s' }] } };
  const r = R.parseResponse('explain', JSON.stringify({ summary: 'Umumiy izoh', items: [
    { code: 'n_small', text: 'Kuzatuvlar soni kam.' }, { code: 'n_small', text: 'takror' }, { code: 'invented_code', text: 'x' },
    { code: 'zero_s', text: '<img src=x onerror=alert(1)>' }] }), ctx);
  assert.equal(r.ok, true);
  assert.deepEqual(r.items, [{ code: 'n_small', text: 'Kuzatuvlar soni kam.' }]);
  assert.deepEqual(r.rejected.map(x => x.code), ['duplicate', 'unknown_code', 'markup']);
  const s = R.parseResponse('explain', JSON.stringify({ summary: '<script>alert(1)</script>', items: [{ code: 'zero_s', text: 'ok' }] }), ctx);
  assert.equal(s.summary, '');
});

test('d) manba taklifi: qiymatsiz; noma\'lum kirish, MPE (uch tilda), belgilash — rad; "specification" — ogohlantirish bilan', () => {
  const payload = P.buildSourceSuggestPayload({ params: ['t', 'ts'], measurements: {}, model: { formula: 'E = t - ts' }, settings: { modelKind: 'error' }, typeB: [] });
  const ctx = { schema: S.sug, payload };
  const sg = (name, o = {}) => ({ input: 'ts', name, kind: 'other', distribution: 'rect', why: 'sabab', ...o });
  const r = R.parseResponse('source_suggest', JSON.stringify({ suggestions: [
    sg('Etalon dreyfi', { kind: 'drift' }), sg('Etalon pasporti', { kind: 'specification', distribution: 'unknown' }),
    sg('Termometrning ruxsat etilgan xatosi (MPE)'), sg('Пределы допускаемой погрешности термометра'), sg('Accuracy class of the device'),
    sg('Boshqa', { why: 'maximum permissible error of the instrument' }), sg('Noma\'lum', { input: 'zz' }), sg('<b>x</b>'), sg('Etalon dreyfi'), sg('') ] }), ctx);
  assert.equal(r.ok, true);
  assert.deepEqual(r.suggestions, [
    { input: 'ts', name: 'Etalon dreyfi', kind: 'drift', distribution: 'rect', why: 'sabab', caution: false },
    { input: 'ts', name: 'Etalon pasporti', kind: 'specification', distribution: '', why: 'sabab', caution: true }]);
  assert.deepEqual(r.rejected.map(x => x.code), ['mpe_source', 'mpe_source', 'mpe_source', 'mpe_source', 'unknown_input', 'markup', 'duplicate', 'bad_name']);
  // son maydoni bo'lsa — sxema rad etadi
  assert.equal(R.parseResponse('source_suggest', JSON.stringify({ suggestions: [{ ...sg('x'), halfWidth: 0.1 }] }), ctx).code, 'ai_response_schema');
  const many = R.parseResponse('source_suggest', JSON.stringify({ suggestions: Array.from({ length: 14 }, (_, i) => sg('Manba ' + i)) }), ctx);
  assert.equal(many.suggestions.length, R.RESPONSE_LIMITS.suggestions);
});

test('a) shablon qoralamasi: AI_DRAFT; sonlar shablonda EMAS — alohida ro\'yxatda, manba parchasi bilan', () => {
  const r = parseT();
  assert.equal(r.ok, true, r.detail);
  assert.equal(r.template.status, 'AI_DRAFT');
  assert.deepEqual(r.template.typeBSources.map(s => [s.id, s.halfWidth, s.k]), [['s1', null, undefined], ['s2', null, undefined]]);
  assert.deepEqual(r.numbers.map(n => [n.id, n.source, n.field, n.value, n.section]), [['n1', 's1', 'halfWidth', 0.02, '5.2'], ['n2', 's1', 'k', 2, '5.2'], ['n3', 's2', 'halfWidth', 0.05, '5.3']]);
  assert.deepEqual(r.template.standards, [{ code: 'GOST 8.558-2009' }]);
  assert.equal(validate(METH, r.template).valid, true);
  // faqat tasdiqlangan son kiradi
  const t = R.applyNumbers(r.template, r.numbers, ['n1']);
  assert.deepEqual(t.typeBSources.map(s => [s.halfWidth, s.k]), [[0.02, undefined], [null, undefined]]);
  assert.equal(r.template.typeBSources[0].halfWidth, null);                                   // asl qoralama o'zgarmagan
  assert.equal(validate(METH, R.applyNumbers(r.template, r.numbers, ['n1', 'n2', 'n3'])).valid, true);
});

test('a) manba parchasi kirishda yo\'q bo\'lgan son, parchada yo\'q son, to\'qilgan standart — rad etiladi', () => {
  const src = (hw, extra = {}) => ({ input: 'ts', name: 'Manba', kind: 'other', distribution: 'rect', unit: '°C', halfWidth: hw, k: null, ...extra });
  const r = parseT({ sources: [
    src({ value: 0.03, quote: 'noaniqligi U = 0,03 °C', section: '5.2' }),                    // parcha matnda yo'q (to'qilgan)
    src({ value: 0.07, quote: 'notekisligi ± 0,05 °C dan oshmaydi', section: '5.3' }),         // parcha bor, son unda yo'q
    src({ value: 0.05, quote: '', section: '' }),                                             // parchasiz
    src({ value: 0.02, quote: 'U = 0,02 °C (k = 2)', section: '5.2' }, { k: { value: 3, quote: 'U = 0,02 °C (k = 2)', section: '5.2' } }),
    src({ value: -1, quote: 'x', section: '' })],
  standards: [{ code: 'ISO 99999:2031', clause: '4.2', quote: 'ISO 99999:2031 talablari' }, { code: 'GOST 8.558-2009', clause: '', quote: 'GOST 8.558-2009 bo\'yicha' }] });
  assert.equal(r.ok, true, r.detail);
  assert.deepEqual(r.numbers.map(n => [n.source, n.field, n.value]), [['s4', 'halfWidth', 0.02]]);
  assert.deepEqual(r.rejected.map(x => [x.path, x.code]), [['sources[0].halfWidth', 'quote_not_found'], ['sources[1].halfWidth', 'value_not_in_quote'],
    ['sources[2].halfWidth', 'no_quote'], ['sources[3].k', 'value_not_in_quote'], ['sources[4].halfWidth', 'bad_value'], ['standards[0]', 'quote_not_found']]);
  assert.deepEqual(r.template.standards, [{ code: 'GOST 8.558-2009' }]);
  assert.ok(r.template.typeBSources.every(s => s.halfWidth === null));
});

test('a) birlik mos emas, noma\'lum birlik, noma\'lum kirish, MPE manbasi — manba rad etiladi; belgilash — butun javob rad', () => {
  const src = o => ({ input: 'ts', name: 'Manba', kind: 'other', distribution: 'rect', unit: '°C', halfWidth: null, k: null, ...o });
  const r = parseT({ sources: [src({ unit: 'kg' }), src({ unit: 'blorp' }), src({ input: 'q' }), src({ name: 'Tekshirilayotgan termometrning ruxsat etilgan xatosi', halfWidth: { value: 0.5, quote: 'ruxsat etilgan xatosi ± 0,5 °C', section: '5.4' } }), src({ unit: '%' }), src({})] });
  assert.equal(r.ok, true, r.detail);
  assert.deepEqual(r.rejected.map(x => x.code), ['unit_mismatch', 'unit_unknown', 'unknown_input', 'mpe_source']);
  assert.equal(r.template.typeBSources.length, 2);
  assert.equal(r.numbers.length, 0);                                                          // MPE soni hech qayerga o'tmaydi
  assert.equal(parseT({ title: '<script>alert(1)</script>' }).code, 'ai_response_markup');
  assert.equal(parseT({ formula: 'E = t - ts; <img src=x onerror=1>' }).code, 'ai_response_markup');
  assert.equal(parseT({ formula: 'E = t - zz' }).code, 'ai_template_invalid');                 // formulada noma'lum belgi — shablon tekshiruvi
  assert.equal(parseT({ inputs: [] }).code, 'ai_template_invalid');
  assert.equal(R.parseResponse('template_draft', JSON.stringify(tplResp()), { ...ctxT, documentText: '' }).code, 'ai_document_required');
  // hujjat ichidagi "ko'rsatma" javobga amal qo'sha olmaydi: ortiqcha maydon — sxema xatosi
  assert.equal(R.parseResponse('template_draft', JSON.stringify({ ...tplResp(), status: 'APPROVED' }), ctxT).code, 'ai_response_schema');
  assert.equal(R.parseResponse('template_draft', JSON.stringify({ ...tplResp(), run: 'saveTemplate()' }), ctxT).code, 'ai_response_schema');
});

const CERT = `Kalibrlash sertifikati № KS-2026/0457
Kalibrlovchi: "Metrologiya instituti" DM, akkreditatsiya UZ.CAL.014
Kalibrlash sanasi: 15.01.2026. Amal qilish muddati: 15.01.2027.
Nuqta, °C | Tuzatma, °C | U, °C | k
0,00 | −0,012 | 0,020 | 2
50,00 | 0,008 | 0,025 | 2
Imzo: Karimov B.`;
const F = (value, quote, page = '1') => ({ value, quote, page });
const certResp = (over = {}) => ({
  certificate: F('KS-2026/0457', 'sertifikati № KS-2026/0457'), calibrator: F('"Metrologiya instituti" DM', 'Kalibrlovchi: "Metrologiya instituti" DM'),
  accreditation: F('UZ.CAL.014', 'akkreditatsiya UZ.CAL.014'), date: F('15.01.2026', 'Kalibrlash sanasi: 15.01.2026'), validUntil: F('15.01.2027', 'Amal qilish muddati: 15.01.2027'),
  traceability: null, route: 'accredited', unit: '°C',
  points: [{ x: 0, correction: -0.012, U: 0.02, k: 2, quote: '0,00 | −0,012 | 0,020 | 2', page: '1' }, { x: 50, correction: 0.008, U: 0.025, k: 2, quote: '50,00 | 0,008 | 0,025 | 2', page: '1' }], ...over,
});
const parseC = (o, doc = CERT) => R.parseResponse('certificate_extract', JSON.stringify(certResp(o)), { schema: S.cert, documentText: doc });

test('b) sertifikat: maydonlar manba parchasi bilan; tasdiqlanmagan maydon / qator bo\'sh; k faraz qilinmaydi; cleanStandard dan o\'tadi', () => {
  const r = parseC();
  assert.equal(r.ok, true, r.detail);
  assert.deepEqual([r.fields.date.value, r.fields.validUntil.value, r.evidenceChecked, r.rejected.length], ['2026-01-15', '2027-01-15', true, 0]);
  assert.deepEqual(R.certificateToCalibration(r, {}), { certificate: '', calibrator: '', accreditation: '', route: '', traceability: '', date: '', validUntil: '', points: [] });
  const cal = R.certificateToCalibration(r, { fields: ['certificate', 'date'], rows: [1], route: true });
  assert.deepEqual(cal, { certificate: 'KS-2026/0457', calibrator: '', accreditation: '', route: 'accredited', traceability: '', date: '2026-01-15', validUntil: '', points: [{ x: 50, correction: 0.008, U: 0.025, k: 2 }] });
  const std = E.cleanStandard({ id: 'std:ai1', name: 'Etalon', unit: r.unit, signedBy: 'Karimov B.', calibrations: [{ ...cal, signatory: 'Karimov B.' }] });
  assert.ok(!JSON.stringify(std).includes('Karimov'));                                         // noma'lum maydonlar tashlanadi
  assert.deepEqual(std.calibrations[0].points, [{ x: 50, correction: 0.008, U: 0.025, k: 2, nu: null }]);
  const nok = parseC({ points: [{ x: 0, correction: -0.012, U: 0.02, k: null, quote: '0,00 | −0,012 | 0,020 | 2', page: '1' }] });
  assert.equal(R.certificateToCalibration(nok, { rows: [0] }).points[0].k, null);
});

test('b) to\'qilgan qiymat, noto\'g\'ri sana, parchada yo\'q son, ishora xatosi — rad; rasmda parcha tekshirilmaydi (belgi bilan)', () => {
  const r = parseC({ certificate: F('KS-2026/9999', 'sertifikati № KS-2026/0457'), calibrator: F('Boshqa MChJ', 'Kalibrlovchi: Boshqa MChJ'), date: F('2026 yil yanvar', 'Kalibrlash sanasi: 15.01.2026'),
    validUntil: F('16.01.2027', 'Amal qilish muddati: 15.01.2027'), accreditation: F('<b>UZ</b>', 'akkreditatsiya UZ.CAL.014'),
    points: [{ x: 0, correction: 0.012, U: 0.02, k: 2, quote: '0,00 | −0,012 | 0,020 | 2', page: '1' }, { x: 50, correction: 0.008, U: 0.03, k: 2, quote: '50,00 | 0,008 | 0,025 | 2', page: '1' },
      { x: 100, correction: 0.01, U: 0.03, k: 2, quote: '100,00 | 0,010 | 0,030 | 2', page: '2' }, { x: null, correction: null, U: null, k: 2, quote: 'k', page: '' }, { x: 50, correction: 0.008, U: -0.025, k: 2, quote: '50,00 | 0,008 | 0,025 | 2', page: '1' }] });
  assert.deepEqual(r.rejected.map(x => [x.path, x.code]), [['certificate', 'value_not_in_quote'], ['calibrator', 'quote_not_found'], ['accreditation', 'markup'], ['date', 'bad_date'], ['validUntil', 'value_not_in_quote'],
    ['points[0]', 'value_not_in_quote'], ['points[1]', 'value_not_in_quote'], ['points[2]', 'quote_not_found'], ['points[3]', 'bad_value'], ['points[4]', 'bad_value']]);
  assert.equal(r.code, 'ai_response_empty');
  const img = R.parseResponse('certificate_extract', JSON.stringify(certResp()), { schema: S.cert });
  assert.deepEqual([img.ok, img.evidenceChecked, img.fields.certificate.verified, img.points[0].verified], [true, false, false, false]);
  assert.equal(R.parseResponse('certificate_extract', JSON.stringify({ ...certResp(), signatory: 'Karimov B.' }), { schema: S.cert, documentText: CERT }).code, 'ai_response_schema');
});

test('yordamchilar: numbersIn, toIsoDate, hasMarkup, looksLikeMpe', () => {
  assert.deepEqual(R.numbersIn('U = 0,02 °C (k = 2); −0.5; ± 1e-3; v1.2.3'), [0.02, 2, -0.5, 0.001]);
  assert.deepEqual(['15.01.2026', '5/1/2026', '2026-01-15', '31.02.2026', '2026/01/15', 'ertaga'].map(R.toIsoDate), ['2026-01-15', '2026-01-05', '2026-01-15', '', '', '']);
  assert.deepEqual(['<script>', 'a < b', 'javascript:alert(1)', 'x onclick=1', '5 > 3 va 2 < 4'].map(R.hasMarkup), [true, false, true, true, false]);
  assert.deepEqual(['Etalon dreyfi', 'MPE', 'класс точности 0,5', 'aniqlik klassi'].map(R.looksLikeMpe), [false, true, true, true]);
});
