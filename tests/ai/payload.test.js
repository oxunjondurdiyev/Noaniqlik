/* P14: src/ai/payload.js — AI ga yuboriladigan ma'lumotning RUXSAT RO'YXATI (egasi qarori B, 2026-11-19;
   docs/AI_DESIGN.md §4). Isbotlanadi: payload da o'lchov qiymati, natija, shaxs ismi, mijoz, rekvizit, hisob ID,
   login yo'q — barcha tests/cases misollari (jumladan 9 etalon nuqta), P11 / P12 yozuvlari va "kanareyka"
   qiymatlar bilan. Tarmoq chaqiruvi yo'q; haqiqiy API chaqirilmaydi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const AI = require('../../src/ai/payload.js');
const E = require('../../src/engine/index.js');
const { loadCases } = require('../cases/lib.js');

const SRC = fs.readFileSync(path.join(__dirname, '../../src/ai/payload.js'), 'utf8');

/** payload dagi barcha barg qiymatlar */
function leaves(v, out = []) {
  if (Array.isArray(v)) v.forEach(x => leaves(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => leaves(x, out));
  else out.push(v);
  return out;
}
/** obyekt ichidagi barcha chekli sonlar (rekursiv) */
function numbers(v, out = []) {
  if (typeof v === 'number') { if (Number.isFinite(v)) out.push(v); } else if (Array.isArray(v)) v.forEach(x => numbers(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => numbers(x, out));
  else if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.replace(',', '.')))) out.push(Number(v.replace(',', '.')));
  return out;
}

const gumCases = loadCases().filter(c => c.modelSpec && c.modelSpec.format === 'calc-state/v2' && Array.isArray(c.modelSpec.state.params));

test('modul sof: import yo\'q, tarmoq / DOM / saqlash chaqiruvi yo\'q', () => {
  assert.doesNotMatch(SRC, /^\s*import\s/m);
  for (const re of [/\bfetch\s*\(/, /XMLHttpRequest/, /\blocalStorage\b/, /\bsessionStorage\b/, /\bindexedDB\b/, /(?<![.\w$])document\./, /(?<![.\w$])window\./, /\beval\s*\(/, /new Function/]) {
    assert.doesNotMatch(SRC.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), re);
  }
});

test('barcha GUM misollari (9 etalon nuqta bilan): payload da SON yo\'q, o\'lchov qiymati va natija yo\'q', () => {
  assert.ok(gumCases.length >= 60, 'misollar soni: ' + gumCases.length);
  const excel = gumCases.filter(c => /^excel-(density|gas-p[123]|term-p[1-5])$/.test(c.id));
  assert.equal(excel.length, 9, '9 ta etalon nuqta');
  let checked = 0;
  for (const c of gumCases) {
    const state = c.modelSpec.state;
    let result = null;
    try { result = E.evaluate(state); } catch (_) { result = null; }
    if (result && result.error) result = null;
    const payloads = [AI.buildSourceSuggestPayload(state, { lang: 'uz' })];
    if (result) payloads.push(AI.buildExplainPayload(state, result, { lang: 'ru' }));
    // formula matnidagi konstantalar — ruxsat etilgan; qolgan har qanday son taqiqlangan
    const formulaText = JSON.stringify([state.model, state.outputs, state.implicit && state.implicit.equations]);
    const forbidden = new Set();
    const add = v => { for (const n of numbers(v)) { const s = String(n); if (s.replace(/[-.]/g, '').length >= 5 && !formulaText.includes(s)) forbidden.add(s); } };
    add(state.measurements); add((state.typeB || []).map(b => [b.halfWidth, b.k, b.nu, b.sensitivity, b.registry]));
    add([state.settings, state.covB, state.implicit && state.implicit.unknowns.map(u => u.start)]);
    if (result) add([result.y, result.uc, result.U, result.nuEff, result.k, result.mean, result.budget, result.outputs, result.conf, result.decision, result.cmc]);
    for (const p of payloads) {
      assert.equal(leaves(p).filter(v => typeof v === 'number').length, 0, c.id + ': son tipidagi qiymat');
      const text = AI.serializePayload(p);
      for (const s of forbidden) assert.ok(!text.includes(s), `${c.id}: payload da taqiqlangan qiymat ${s}`);
      for (const b of state.typeB || []) if (b.name && b.name.length > 6) assert.ok(!text.includes(b.name), `${c.id}: manba nomi standart holatda yuborilmaydi`);
      checked++;
    }
  }
  assert.ok(checked >= gumCases.length);
});

/* "Kanareyka": taqiqlangan har bir joyga noyob qiymat qo'yiladi — birortasi ham payload ga o'tmasligi kerak. */
const CANARY = {
  meas: 918273.645, half: 7.7713e-5, halfExpr: '0.00031337 * x', srcName: 'Ivanov I.I. sertifikati 424242', mpe: '0.0452781 * abs(x)', nominal: 63.63271,
  cmc: 0.0871731, cov: 0.00918171, cert: 'CERT-889911', calibrator: 'Kanareyka Metrologiya MChJ', accreditation: 'UZ.CAL.556677',
  pointLabel: 'Buyurtmachi OOO Kanareyka-Trade', start: 41.41417, y: 12.3456789, U: 0.0456789, nu: 17.2345, k: 2.1098765, share: 42.7714129,
  value: 'n = 31337', calcId: 'calc-7f3a9c11', hash: 'a'.repeat(64), login: 'kanareyka_user', person: 'Karimov Bobur', lab: 'Kanareyka sinov laboratoriyasi',
  accr: 'O\'ZAK.SL.0909', address: 'Toshkent sh., Kanareyka ko\'chasi 7', pt: 3.1415927,
};
const canaryState = () => ({
  n: 3, params: ['x', 'T'], measurements: { x: [CANARY.meas, CANARY.meas + 1, CANARY.meas + 2], T: ['', '', ''] }, units: { x: 'mg', T: '°C' },
  model: { formula: 'y = x * (1 + 0.5 * T)', unit: 'mg' },
  settings: { paired: false, P: 0.9545, modelKind: 'error', mpe: CANARY.mpe, nominal: CANARY.nominal, cmc: CANARY.cmc, cmcRows: [{ from: 0, to: 1, U: CANARY.cmc }], cmcX: CANARY.nominal, measurementDate: '2026-11-19', decisionRule: 'guarded', guardR: 0.7654321 },
  covB: { 'x|T': CANARY.cov },
  typeB: [
    { id: 'b1', name: CANARY.srcName, param: 'x', halfWidth: CANARY.half, distribution: 'normal', k: 2, unit: 'mg',
      registry: { id: 'std:k1', version: 3, certificate: CANARY.cert, calibrator: CANARY.calibrator, accreditation: CANARY.accreditation, U: CANARY.half, k: 2, date: '2026-01-15', validUntil: '2027-01-15', enteredBy: 'guest' } },
    { id: 'b2', name: 'Harorat ta\'siri', param: 'T', halfWidth: CANARY.halfExpr, distribution: 'rect', kind: 'environment', sensitivity: 1.23456789 },
  ],
  points: [{ id: 'p1', label: CANARY.pointLabel, snapshot: { measurements: { x: [CANARY.meas] } }, result: { y: CANARY.y, U: CANARY.U } }],
  currentPoint: 'p1', acceptances: { 'X1/mpe_in_budget:x': { comment: 'Izoh: ' + CANARY.person, role: 'admin', at: '2026-11-19T10:00:00.000Z', value: CANARY.value } },
  implicit: undefined, calcId: CANARY.calcId, hash: CANARY.hash, user: { login: CANARY.login, name: CANARY.person },
  lab: { name: CANARY.lab, accreditation: CANARY.accr, address: CANARY.address }, customer: CANARY.pointLabel,
});
const canaryResult = () => ({
  engineVersion: '2.10.0', y: CANARY.y, uc: CANARY.U / 2, U: CANARY.U, nuEff: CANARY.nu, k: CANARY.k, mean: { x: CANARY.meas }, hash: CANARY.hash,
  budget: [
    { kind: 'A', name: 'x', param: 'x', n: 3, nu: 2, u: 0.1234567, c: 1.7654321, contrib: 0.001, share: 1.2345678 },
    { kind: 'B', name: CANARY.srcName, param: 'x', dist: 'normal', u: CANARY.half / 2, c: 1.7654321, contrib: 0.5, share: CANARY.share },
    { kind: 'B', name: 'Harorat ta\'siri', param: 'T', dist: 'rect', u: 0.0001809, c: 3.3334441, contrib: 0.2, share: 17.1234567 },
    { kind: 'corr', name: 'x|T', contrib: -0.05, share: -4.2345678 },
  ],
  findings: [
    { id: 'X1/mpe_in_budget:x', rule: 'X1', code: 'mpe_in_budget', severity: 'warning', ref: 'ILAC P14:09/2020 §5.4', param: 'x', source: CANARY.srcName, value: CANARY.value, mode: 'GUM' },
    { id: 'L1/standard_expiring', rule: 'L1', code: 'standard_expiring', severity: 'info', ref: 'ISO/IEC 17025:2017 §6.4 (unverified)', source: CANARY.calibrator, value: CANARY.cert, mode: 'GUM' },
    { id: 'L3/pt_last_unsatisfactory', rule: 'L3', code: 'pt_last_unsatisfactory', severity: 'info', ref: 'ISO 13528 (unverified)', value: 'z = ' + CANARY.pt, mode: 'GUM' },
  ],
  decision: { statement: 'pass', pc: 0.9876543, w: 0.0319752 }, conf: { simple: 'pass' }, cmcCheck: { cmc: CANARY.cmc, below: false },
});
const TEXTS = { mpe_in_budget: { what: '{p}: "{s}" — kalibrlanayotgan asbobning MPE si byudjetda', why: 'MPE noaniqlik manbai emas', fix: 'Manbani olib tashlang' } };

test('kanareyka: taqiqlangan maydonlarning birortasi ham payload ga o\'tmaydi (c va d funksiyalar; P11 / P12 yozuvlari bilan)', () => {
  const state = canaryState(), result = canaryResult();
  // qo'shimcha "tashqi" kontekst — quruvchi buni umuman o'qimasligi kerak
  const opts = { lang: 'uz', findingTexts: TEXTS, lab: state.lab, user: state.user, calcId: CANARY.calcId, customer: CANARY.pointLabel,
    registry: [{ id: 'std:k1', kind: 'standard', name: 'Etalon', serial: 'SN-' + CANARY.cert, calibrations: [{ certificate: CANARY.cert, calibrator: CANARY.calibrator, points: [{ x: 1, correction: CANARY.cov, U: CANARY.half, k: 2 }] }] }],
    ptRounds: [{ id: 'pt:1', scheme: CANARY.lab, x: CANARY.pt, score: { z: CANARY.pt } }] };
  const ex = AI.buildExplainPayload(state, result, opts);
  const sg = AI.buildSourceSuggestPayload(state, opts);
  for (const p of [ex, sg]) {
    const text = AI.serializePayload(p);
    assert.equal(AI.previewPayload(p).text, text);                    // foydalanuvchi ko'rgan matn = yuboriladigan matn
    assert.equal(leaves(p).filter(v => typeof v === 'number').length, 0);
    for (const [k, v] of Object.entries(CANARY)) {
      for (const s of typeof v === 'number' ? [String(v), String(v).replace('.', ',')] : [v, ...v.split(/\s+/).filter(w => w.length > 6)]) {
        assert.ok(!text.includes(s), `kanareyka "${k}" (${s}) payload ga chiqib ketdi`);
      }
    }
    for (const s of ['0.9545', '2026-11-19', '2026-01-15', 'std:k1', 'guest', 'admin', 'p1']) assert.ok(!text.includes(`"${s}"`) && !text.includes(`: ${s}`), s);
  }
  // nima KETADI — aynan shu (to'liq ro'yxat)
  assert.deepEqual(sg, {
    format: 'uc-ai-payload/1', fn: 'source_suggest', lang: 'uz',
    model: { kind: 'error', outputs: [{ symbol: 'y', formula: 'y = x * (1 + 0.5 * T)', unit: 'mg' }], inputs: [{ symbol: 'x', typeA: true, unit: 'mg' }, { symbol: 'T', typeA: false, unit: '°C' }], correlated: true },
    sources: [{ ref: 'B1', input: 'x', distribution: 'normal', unit: 'mg', fromRegistry: true }, { ref: 'B2', input: 'T', distribution: 'rect', kind: 'environment' }],
  });
  assert.deepEqual(ex.findings, [
    { code: 'mpe_in_budget', severity: 'warning', rule: 'X1', ref: 'ILAC P14:09/2020 §5.4', input: 'x', accepted: true },
    { code: 'standard_expiring', severity: 'info', rule: 'L1', ref: 'ISO/IEC 17025:2017 §6.4 (unverified)' },
    { code: 'pt_last_unsatisfactory', severity: 'info', rule: 'L3', ref: 'ISO 13528 (unverified)' },
  ]);
  assert.deepEqual(ex.findingTexts, [{ code: 'mpe_in_budget', ...TEXTS.mpe_in_budget }]);       // shablon — {p}, {s} to'ldirilmagan
  // hissalar TARTIBI — raqamsiz: B1 (0,5) > B2 (0,2) > korrelyatsiya (|−0,05|) > A (0,001)
  assert.deepEqual(ex.budgetOrder, [{ kind: 'B', input: 'x', source: 'B1' }, { kind: 'B', input: 'T', source: 'B2' }, { kind: 'corr' }, { kind: 'A', input: 'x' }]);
  assert.equal(ex.mode, 'GUM');
});

test('manba nomi — faqat aniq ruxsat bilan (includeSourceNames); standart holatda neytral belgi', () => {
  const state = { params: ['m'], measurements: {}, model: { formula: 'y = m' }, settings: {}, typeB: [{ name: 'Tarozi diskretligi', param: 'm', halfWidth: 0.001, distribution: 'resol' }] };
  assert.equal(AI.buildSourceSuggestPayload(state).sources[0].name, undefined);
  assert.deepEqual(AI.buildSourceSuggestPayload(state, { includeSourceNames: true }).sources[0], { ref: 'B1', input: 'm', distribution: 'resol', name: 'Tarozi diskretligi' });
  // ruxsat bilan ham: nomda email / telefon bo'lsa — rad etiladi
  state.typeB[0].name = 'Sertifikat, aloqa: metrolog@example.uz';
  assert.throws(() => AI.buildSourceSuggestPayload(state, { includeSourceNames: true }), e => e.code === 'ai_payload_sensitive');
});

test('oshkor bo\'lmagan va ko\'p chiqishli model: tenglamalar va nomlar ketadi, y⁽⁰⁾ (start) ketmaydi', () => {
  const state = { params: ['R0', 'r'], measurements: {}, settings: { modelKind: 'value' }, typeB: [],
    outputs: [{ formula: 'Y1 = R0 + r', unit: 'Ω' }, { formula: 'Y2 = R0 - r', unit: 'Ω' }],
    implicit: { unknowns: [{ name: 'θ', start: 20.123456, unit: '°C' }], equations: ['(1 + A*θ + B*θ^2)*R0 - r*RS'] } };
  const p = AI.buildSourceSuggestPayload(state);
  assert.deepEqual(p.model.outputs.map(o => o.symbol), ['Y1', 'Y2']);
  assert.deepEqual(p.model.implicit, { unknowns: [{ symbol: 'θ', unit: '°C' }], equations: ['(1 + A*θ + B*θ^2)*R0 - r*RS'] });
  assert.ok(!AI.serializePayload(p).includes('20.123456'));
});

test('qo\'riqchi: noma\'lum kalit, son, noto\'g\'ri qiymat, juda uzun matn, shaxsiy ma\'lumot — rad etiladi', () => {
  const ok = () => AI.buildSourceSuggestPayload({ params: ['x'], measurements: {}, model: { formula: 'y = x', unit: 'mg' }, settings: {}, typeB: [{ param: 'x', distribution: 'rect' }] });
  const bad = (mut, code) => { const p = JSON.parse(JSON.stringify(ok())); mut(p); assert.throws(() => AI.serializePayload(p), e => e.code === code, code); };
  AI.serializePayload(ok());
  bad(p => { p.result = { y: '1' }; }, 'ai_payload_unknown_key');
  bad(p => { p.model.inputs[0].observations = ['1', '2']; }, 'ai_payload_unknown_key');
  bad(p => { p.sources[0].halfWidth = '0.01'; }, 'ai_payload_unknown_key');
  bad(p => { p.document = { kind: 'text', text: 'x' }; }, 'ai_payload_unknown_key');                 // c / d da hujjat yo'q
  bad(p => { p.model.outputs[0].unit = 5; }, 'ai_payload_number');
  bad(p => { p.sources[0].distribution = 'gauss'; }, 'ai_payload_bad_value');
  bad(p => { p.model.inputs[0].symbol = 'x y; DROP'; }, 'ai_payload_bad_value');
  bad(p => { p.model.outputs[0].formula = 'y = x'.padEnd(AI.AI_LIMITS.formula + 1, ' '); }, 'ai_payload_too_long');
  bad(p => { p.model.outputs[0].formula = 'y = x  // a.b@example.com'; }, 'ai_payload_sensitive');
  bad(p => { p.model.outputs[0].unit = '+998 90 123 45 67'; }, 'ai_payload_sensitive');
  bad(p => { p.fn = 'evaluate'; }, 'ai_payload_bad_function');
  bad(p => { p.lang = 'de'; }, 'ai_payload_bad_value');
  bad(p => { delete p.model; }, 'ai_payload_missing_key');
  assert.throws(() => AI.assertAllowed(null), e => e.code === 'ai_payload_bad_type');
});

test('hujjat (a, b funksiyalar): faqat alohida tasdiq bilan; fayl nomi va boshqa maydon yo\'q; API kaliti ketmaydi', () => {
  const text = '5.2. Asbob xatoligi chegarasi ± 0,5 °C.\nMas\'ul: Karimov B., tel. +998 90 123 45 67, b.karimov@example.uz';
  assert.throws(() => AI.buildTemplateDraftPayload({ text }, {}), e => e.code === 'ai_document_consent_required');
  assert.throws(() => AI.buildTemplateDraftPayload({ text }, { documentConsent: 'yes' }), e => e.code === 'ai_document_consent_required');
  assert.throws(() => AI.buildCertificatePayload({ text }, { documentConsent: false }), e => e.code === 'ai_document_consent_required');
  const p = AI.buildTemplateDraftPayload({ text, name: 'Mijoz-OOO-metodika.pdf', customer: 'OOO' }, { documentConsent: true, lang: 'uz' });
  assert.deepEqual(p, { format: 'uc-ai-payload/1', fn: 'template_draft', lang: 'uz', schemaId: 'methodology.schema.json', document: { kind: 'text', text }, consent: { document: 'confirmed' } });
  // ko'rinish: matn to'liq + ogohlantirish (toifa va son; parchaning o'zi emas)
  const pv = AI.previewPayload(p);
  assert.equal(pv.text, AI.serializePayload(p));
  assert.deepEqual(pv.warnings, [{ category: 'email', count: 1 }, { category: 'phone', count: 1 }]);
  // sertifikat: matn yoki rasm
  const c = AI.buildCertificatePayload({ data: 'iVBORw0KGgo=', mediaType: 'image/png' }, { documentConsent: true });
  assert.deepEqual(c.document, { kind: 'image', mediaType: 'image/png', data: 'iVBORw0KGgo=' });
  const cv = AI.previewPayload(c);
  assert.equal(cv.hasImage, true);
  assert.ok(!cv.text.includes('iVBORw0KGgo=') && cv.text.includes('<base64, 12>'));
  assert.throws(() => AI.buildCertificatePayload({ data: 'not base64 !!', mediaType: 'image/png' }, { documentConsent: true }), e => e.code === 'ai_payload_bad_value');
  assert.throws(() => AI.buildCertificatePayload({ data: 'AAAA', mediaType: 'image/svg+xml' }, { documentConsent: true }), e => e.code === 'ai_payload_bad_value');
  assert.throws(() => AI.buildCertificatePayload({}, { documentConsent: true }), e => e.code === 'ai_payload_bad_document');
  assert.throws(() => AI.buildTemplateDraftPayload({ text: '   ' }, { documentConsent: true }), e => e.code === 'ai_payload_bad_document');
  assert.throws(() => AI.buildTemplateDraftPayload({ text: 'x'.repeat(AI.AI_LIMITS.documentChars + 1) }, { documentConsent: true }), e => e.code === 'ai_payload_too_long');
  assert.throws(() => AI.buildTemplateDraftPayload({ text: 'kalit: sk-ant-api03-AbCdEfGh1234567890' }, { documentConsent: true }), e => e.code === 'ai_payload_sensitive');
  // tasdiq belgisini qo'lda olib tashlab bo'lmaydi
  const q = JSON.parse(JSON.stringify(p)); delete q.consent;
  assert.throws(() => AI.serializePayload(q), e => e.code === 'ai_payload_missing_key');
});

test('GUM dan boshqa rejim (holatsiz): faqat topilma kodlari; chiqish determinik', () => {
  const result = { findings: [{ id: 'X11/x11_double:1', rule: 'X11', code: 'x11_double_counting', severity: 'warning', ref: 'Nordtest TR 537 ed. 4 §6', value: '12.345678 %', mode: 'TOP_DOWN' }] };
  const p = AI.buildExplainPayload(null, result, { lang: 'xx' });
  assert.deepEqual(p, { format: 'uc-ai-payload/1', fn: 'explain', lang: 'en', mode: 'TOP_DOWN', findings: [{ code: 'x11_double_counting', severity: 'warning', rule: 'X11', ref: 'Nordtest TR 537 ed. 4 §6' }] });
  assert.equal(AI.serializePayload(p), AI.serializePayload(JSON.parse(JSON.stringify(p, Object.keys(p).reverse().concat(['code', 'severity', 'rule', 'ref'])))));
  assert.deepEqual(AI.findSensitive('oddiy matn 12345'), []);
  assert.deepEqual(AI.findSensitive('STIR: 123456789').map(x => x.category), ['tax_id']);
});
