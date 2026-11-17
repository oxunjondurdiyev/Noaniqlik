/* P04b — "bitta asbob" korrelyatsiyasi: sertifikat manbasi umumiy (share: 'common') va nuqtaga xos
   (share: 'point') qismga bo'linadi (egasi qarori, 2026-11-17, 3-variant).
   Manba: JCGM 100:2008 §5.2.2 Eq. (13)–(14), F.1.2.3 Eq. (F.2); EA-4/02 M:2022 Ilova D: D4–D5 (D.6, D.8, D.9),
   D7 (D.10). split: 'unknown' (r = 0 va r = 1, katta u_c) — LOYIHA QARORI, me'yoriy talab emas.
   Sintetik sonlar — "qo'lda hisob" (manbadan olinmagan, test ichida mustaqil formula bilan hisoblanadi). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const T = require('../../src/templates/interpreter.js');
const V = require('../../src/ui/tpl/view.js');
const { escHtml } = require('../../src/ui/escape.js');
const { schema, templates, byId, ROOT } = require('./lib.js');

const t3 = s => ({ uz: s, ru: s, en: s });
const rel = (a, e) => Math.abs(a - e) / Math.abs(e);

/** w = (m − m1)/m1 — bitta tarozi, ikki qatorli kalibrlash manbasi */
function handTemplate(split = 'known') {
  const src = (x) => [
    { id: x + '_cal_common', input: x, name: t3('Tarozi: kalibrlash — umumiy qism (' + x + ')'), kind: 'certificate', distribution: 'normal', halfWidth: null, k: null,
      unit: 'g', instrument: 'balance', correlated: true, share: 'common', certificateU: null, certificateK: null, hint: t3('h') },
    { id: x + '_cal_point', input: x, name: t3('Tarozi: kalibrlash — nuqtaga xos qism (' + x + ')'), kind: 'specification', distribution: 'rect', halfWidth: null,
      unit: 'g', instrument: 'balance', correlated: false, share: 'point', hint: t3('h') },
    { id: x + '_res', input: x, name: t3('Tarozi: ajratish qobiliyati (' + x + ')'), kind: 'resolution', distribution: 'resol', halfWidth: null,
      unit: 'g', instrument: 'balance', correlated: false, hint: t3('h') },
  ];
  return {
    schemaVersion: 'uc-template/1', id: 'HAND-W', version: '0.1.0', status: 'DRAFT', domain: 'TESTING', section: 'general',
    evaluationMode: 'GUM_BOTTOM_UP', title: t3('w'), standards: [], ref: 'tests/templates/correlation.test.js',
    measurand: { symbol: 'w', name: t3('w'), unit: '1' }, model: { formula: 'w = (m - m1) / m1' },
    inputs: [{ symbol: 'm', name: t3('m'), unit: 'g', kind: 'observation' }, { symbol: 'm1', name: t3('m1'), unit: 'g', kind: 'observation' }],
    typeBSources: [...src('m'), ...src('m1')],
    correlations: [{ id: 'm_m1', inputs: ['m', 'm1'], r: 1, sharedInstrument: 'balance', ask: true, defaultEnabled: true, split, question: t3('q') }],
  };
}

// Qo'lda hisob uchun kirishlar (sintetik)
const M = [105.2, 105.3, 105.4], M1 = [100.0, 100.1, 100.2];
const U_COMMON = 0.004, K = 2, A_POINT = 0.003, D_RES = 0.001;
function handData(extra = {}) {
  const sources = {};
  for (const x of ['m', 'm1']) {
    sources[x + '_cal_common'] = { halfWidth: U_COMMON, k: K };
    sources[x + '_cal_point'] = { halfWidth: A_POINT };
    sources[x + '_res'] = { halfWidth: D_RES };
  }
  return { observations: { m: M, m1: M1 }, sources, settings: { paired: false }, ...extra };
}

/** Mustaqil formula (JCGM 100:2008 Eq. 13): interpreterdan foydalanilmaydi */
function handUc(r) {
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
  const m = mean(M), m1 = mean(M1);
  const cm = 1 / m1, cm1 = -m / (m1 * m1);
  const uCommon = U_COMMON / K, uPoint = A_POINT / Math.sqrt(3), uRes = D_RES / (2 * Math.sqrt(3));
  const u2m = (sd(M) / Math.sqrt(3)) ** 2 + uCommon ** 2 + uPoint ** 2 + uRes ** 2;
  const u2m1 = (sd(M1) / Math.sqrt(3)) ** 2 + uCommon ** 2 + uPoint ** 2 + uRes ** 2;
  // Kovariatsiya faqat umumiy qismdan: u(m, m1) = r·u_common·u_common (EA-4/02 D.8)
  const cov = r * uCommon * uCommon;
  return { y: (m - m1) / m1, uc: Math.sqrt(cm * cm * u2m + cm1 * cm1 * u2m1 + 2 * cm * cm1 * cov), cov };
}

test('qo\'lda hisob: w = (m − m1)/m1, ikki qatorli manba — covB faqat umumiy qismdan, nuqtaga xos qism r = 0, 1e-12', () => {
  const tpl = handTemplate();
  assert.deepEqual(T.checkTemplate(tpl, schema).errors, []);
  const r = T.evaluateTemplate(tpl, handData());
  assert.ok(!r.error && !r.result.error, r.error || r.result.error);
  const h = handUc(1);
  assert.equal(r.spec.covB['m|m1'], (U_COMMON / K) ** 2, 'covB = u_common(m)·u_common(m1)');
  assert.ok(rel(r.spec.covB['m|m1'], h.cov) < 1e-12);
  assert.ok(rel(r.result.y, h.y) < 1e-12, `y ${r.result.y} vs ${h.y}`);
  assert.ok(rel(r.result.uc, h.uc) < 1e-12, `u_c ${r.result.uc} vs ${h.uc}`);
  assert.equal(r.result.templateBound, undefined, 'known rejimida chegara tanlanmaydi');
  // Nuqtaga xos qism kattalashtirilsa kovariatsiya o'zgarmaydi
  const d2 = handData(); d2.sources.m_cal_point.halfWidth = 0.05;
  assert.equal(T.evaluateTemplate(tpl, d2).spec.covB['m|m1'], r.spec.covB['m|m1']);
});

test('split "unknown": ayirma/nisbat modeli (c_i·c_j < 0) — r = 0 tanlanadi, nuqtaga xos qator ishlatilmaydi', () => {
  const tpl = handTemplate('unknown');
  // Noma'lum rejimda umumiy qatorda sertifikatning to'liq U si; nuqtaga xos qator bo'sh qoldirilishi mumkin
  const data = handData();
  delete data.sources.m_cal_point; delete data.sources.m1_cal_point;
  const r = T.evaluateTemplate(tpl, data);
  assert.ok(!r.error, JSON.stringify(r.missing));
  assert.equal(r.result.templateBound.chosen, 'r0');
  assert.deepEqual(r.result.templateBound.r, [0]);
  assert.equal(r.spec.covB['m|m1'], undefined);
  assert.ok(r.result.templateBound.ucR0 > r.result.templateBound.ucR1);
  assert.ok(!r.spec.typeB.some(c => /nuqtaga xos/.test(c.name)), 'nuqtaga xos qator spec ga kirmaydi');
  // Mustaqil formula: nuqtaga xos qismsiz, r = 0
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const m = mean(M), m1 = mean(M1), uA = 0.1 / Math.sqrt(3);
  const u2 = uA * uA + (U_COMMON / K) ** 2 + (D_RES / (2 * Math.sqrt(3))) ** 2;
  const uc0 = Math.sqrt(u2 / (m1 * m1) + (m / (m1 * m1)) ** 2 * u2);
  assert.ok(Math.abs(r.result.uc - uc0) / uc0 < 1e-9);
});

test('split "unknown": yig\'indi modeli — r = 1 tanlanadi (y = m1 + m2 va T-07 massalar)', () => {
  const tpl = handTemplate('unknown');
  tpl.model.formula = 'w = m + m1';
  const data = handData();
  const r = T.evaluateTemplate(tpl, data);
  assert.equal(r.result.templateBound.chosen, 'r1');
  assert.deepEqual(r.result.templateBound.r, [1]);
  assert.equal(r.spec.covB['m|m1'], (U_COMMON / K) ** 2);

  // T-07 'masses': Mk = Σ_k Σ_{j≤k} m_j / m — ijobiy hissalar ustun, r = 1 kattaroq
  const t7 = byId['T-07'];
  const v = { m25: 50.2, m125: 120.4, m063: 210.6, m0315: 300.1, m016: 250.3, m: 1000.2 };
  const observations = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, [x - 0.01, x, x + 0.01]]));
  const sources = {};
  for (const s of t7.typeBSources) sources[s.id] = { halfWidth: 0.05, k: 2 };
  const r7 = T.evaluateTemplate(t7, { variant: 'masses', observations, sources, settings: { paired: false }, correlationSplit: { masses: 'unknown' } });
  assert.ok(!r7.error, JSON.stringify(r7.missing));
  assert.equal(r7.result.templateBound.chosen, 'r1');
});

test('split "unknown": hisobot matni uch tilda — "Korrelyatsiya noma\'lum — konservativ chegara: r = …"', () => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const TR = dom.window.eval(['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js']
    .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + '\n;TRANSLATIONS');
  const tpl = handTemplate('unknown');
  const r = T.evaluateTemplate(tpl, handData(), { ui: true });
  const meta = T.buildState(tpl, handData(), { ui: true }).meta;
  const exp = {
    uz: "Korrelyatsiya noma'lum — konservativ chegara: r = 0",
    ru: 'Корреляция неизвестна — консервативная граница: r = 0',
    en: 'Correlation unknown — conservative bound: r = 0',
  };
  for (const l of ['uz', 'ru', 'en']) {
    const ctx = { t: k => TR[l][k] ?? k, esc: escHtml, lang: l };
    const f = JSDOM.fragment(V.reportNoticeHTML(meta, ctx, r.result));
    assert.ok(f.querySelector('[data-bound]'), l);
    assert.ok(f.querySelector('[data-bound]').textContent.startsWith(exp[l]), f.querySelector('[data-bound]').textContent);
  }
  const t2 = handTemplate('unknown'); t2.model.formula = 'w = m + m1';
  const r2 = T.evaluateTemplate(t2, handData());
  const ctx = { t: k => TR.uz[k] ?? k, esc: escHtml, lang: 'uz' };
  assert.match(JSDOM.fragment(V.reportNoticeHTML(meta, ctx, r2.result)).querySelector('[data-bound]').textContent, /r = 1/);
});

test('ikki marta hisoblash: u²(umumiy) + u²(nuqta) > u²(sertifikat) — ogohlantirish; teng yoki kichik — yo\'q', () => {
  const tpl = handTemplate();
  const uCert = Math.sqrt((U_COMMON / K) ** 2 + (A_POINT / Math.sqrt(3)) ** 2);
  const ok = handData(); ok.sources.m_cal_common.certificateU = 2 * uCert * 1.0000001; ok.sources.m_cal_common.certificateK = 2;
  assert.equal(T.evaluateTemplate(tpl, ok).result.templateWarnings, undefined);
  const bad = handData(); bad.sources.m_cal_common.certificateU = 2 * uCert * 0.9; bad.sources.m_cal_common.certificateK = 2;
  const w = T.evaluateTemplate(tpl, bad).result.templateWarnings;
  assert.equal(w.length, 1);
  assert.equal(w[0].code, 'split_exceeds');
  assert.equal(w[0].param, 'm');
  assert.ok(Math.abs(w[0].value - 1 / 0.9) < 1e-9);
});

test('24 ta shablon: har bir sharedInstrument kirishida umumiy va nuqtaga xos qator bor; resol — correlated: false', () => {
  let groups = 0;
  for (const { tpl } of templates.filter(x => /^T-\d\d$/.test(x.tpl.id))) {
    for (const s of tpl.typeBSources) if (s.distribution === 'resol') assert.equal(s.correlated, false, `${tpl.id}/${s.id}`);
    for (const c of tpl.correlations || []) {
      groups++;
      assert.equal(c.split, 'known', `${tpl.id}/${c.id}`);
      assert.equal(c.ask, true);
      for (const x of c.inputs) {
        const rows = tpl.typeBSources.filter(s => s.input === x && s.instrument === c.sharedInstrument);
        const common = rows.filter(s => s.share === 'common');
        const point = rows.filter(s => s.share === 'point');
        assert.equal(common.length, 1, `${tpl.id}/${x}: umumiy`);
        assert.equal(point.length, 1, `${tpl.id}/${x}: nuqtaga xos`);
        assert.equal(common[0].correlated, true);
        assert.equal(point[0].correlated, false);
        assert.equal(common[0].halfWidth, null, 'raqam o\'ylab topilmaydi');
        assert.equal(point[0].halfWidth, null);
        for (const r of [common[0], point[0]]) for (const l of ['uz', 'ru', 'en']) assert.ok(r.hint[l].length > 40, `${tpl.id}/${r.id} hint ${l}`);
        assert.ok(!rows.some(s => s.correlated && !s.share), `${tpl.id}/${x}: bo'linmagan korrelyatsiyalangan qator qolmagan`);
      }
    }
  }
  assert.equal(groups, 15); // 14 ta shablon, T-04 da ikki guruh
});

/** P04 formatidagi (bitta qatorli, split maydonisiz) nusxa — joriy T-11 dan qayta tiklanadi */
function p04Copy(tpl) {
  const t = JSON.parse(JSON.stringify(tpl));
  t.typeBSources = t.typeBSources.filter(s => s.share !== 'point').map(s => {
    if (s.share !== 'common') return s;
    const o = { ...s, id: s.id.replace('_cal_common', '_cert') };
    delete o.share; delete o.certificateU; delete o.certificateK;
    return o;
  });
  for (const c of t.correlations) delete c.split;
  return t;
}

test('migratsiya: P04 dagi bitta qatorli DRAFT nusxa → split "unknown", foydalanuvchi ma\'lumoti yo\'qolmaydi', () => {
  const old = p04Copy(byId['T-11']);
  old.typeBSources.find(s => s.id === 'm1_cert').halfWidth = 0.02; // foydalanuvchi kiritgan qiymat
  old.typeBSources.find(s => s.id === 'm1_cert').k = 2;
  assert.ok(T.checkTemplate(old, schema).warnings.some(w => /without split/.test(w)));
  const { template: mig, migrated } = T.migrateTemplate(old);
  assert.equal(migrated, true);
  assert.equal(mig.correlations[0].split, 'unknown');
  const cert = mig.typeBSources.find(s => s.id === 'm1_cert');
  assert.equal(cert.share, 'common');
  assert.equal(cert.halfWidth, 0.02);
  assert.equal(cert.k, 2);
  assert.equal(mig.typeBSources.find(s => s.id === 'm1_res').share, undefined, 'resol o\'zgarmaydi');
  assert.deepEqual(T.checkTemplate(mig, schema).errors, []);
  assert.equal(T.migrateTemplate(mig).migrated, false, 'idempotent');
  assert.equal(old.correlations[0].split, undefined, 'asl obyekt o\'zgarmaydi');
  // Hisob: konservativ chegara (nisbat modeli → r = 0)
  const sources = {};
  for (const s of mig.typeBSources) sources[s.id] = { halfWidth: 0.05, k: 2 };
  const r = T.evaluateTemplate(mig, { observations: { m1: [2610.4, 2610.5, 2610.6], m: [2433.0, 2433.1, 2433.2] }, sources, settings: { paired: false } });
  assert.ok(!r.error);
  assert.equal(r.result.templateBound.chosen, 'r0');
});

test('migratsiya: P04 da saqlangan hisob holati (split yo\'q) → "unknown", evaluateState ishlaydi', () => {
  const tpl = p04Copy(byId['T-11']);
  const sources = {};
  for (const s of tpl.typeBSources) sources[s.id] = { halfWidth: 0.05, k: 2 };
  const st = T.buildState(tpl, { observations: { m1: [10.2, 10.3], m: [9.1, 9.2] }, sources, settings: { paired: false } }).state;
  // P04 holatini taqlid qilish: correlations[].split yo'q
  st.template.correlations.forEach(c => { delete c.split; });
  const up = T.upgradeState(st);
  assert.equal(up.template.correlations[0].split, 'unknown');
  assert.equal(st.template.correlations[0].split, undefined);
  const ev = T.evaluateState(st);
  assert.ok(!ev.result.error);
  assert.ok(ev.result.templateBound);
  assert.deepEqual(T.missingInState(st), []);
});

test('evaluateState: shablonsiz va korrelyatsiyasiz holatda natija dvigatel natijasi bilan aynan bir xil', () => {
  const { evaluate } = require('../../src/engine/index.js');
  const st = { params: ['x'], measurements: { x: [1, 2, 3] }, typeB: [], settings: { P: 0.95 } };
  assert.equal(JSON.stringify(T.evaluateState(st).result), JSON.stringify(evaluate(st)));
  const g = T.buildState(byId['legacy-gas_analyzer'], { useSample: true, point: 1 }).state;
  assert.equal(JSON.stringify(T.evaluateState(g).result), JSON.stringify(evaluate(T.stateToSpec(g))));
});
