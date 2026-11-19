/* P11: "Laboratoriya" oynasi — sof yordamchilar (model), ko'rinish (view) uch tilda, QC SVG grafigi, hisobot bo'limlari
   (src/report/lab.js) va kontroller (src/ui/lab/app.js) jsdom + fake-indexeddb da boshidan oxirigacha:
   etalon yaratish → audit izi; "Reestrdan tanlash" → B tur manbasi; QC nuqtasi → Westgard; s_Rw → Top-down. */
'use strict';
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');
const { IDBFactory } = require('fake-indexeddb');
const E = require('../../src/engine/index.js');
const M = require('../../src/ui/lab/model.js');
const V = require('../../src/ui/lab/view.js');
const { qcChartSVG } = require('../../src/ui/lab/chart.js');
const { createSections } = require('../../src/report/sections.js');
const { labSectionHTML } = require('../../src/report/lab.js');
const FM = require('../../src/report/forms.js');
const { escHtml } = require('../../src/ui/escape.js');

const ROOT = path.join(__dirname, '..', '..');
const LANGS = ['uz', 'ru', 'en'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js', 'src/js/i18n-special.js', 'src/js/i18n-linter.js', 'src/js/i18n-report.js', 'src/js/i18n-lab.js'];
const DICT = (() => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  return dom.window.eval(I18N_FILES.map(read).join('\n;\n') + '\n;TRANSLATIONS');
})();
const missing = new Set();
const ctxOf = lang => ({ t: k => { if (DICT[lang][k] === undefined) missing.add(`${lang}.${k}`); return DICT[lang][k] !== undefined ? DICT[lang][k] : k; }, esc: escHtml });
const frag = html => new JSDOM('<!doctype html><body><div id="r">' + html + '</div></body>').window.document.getElementById('r');

const cal = (date, validUntil, points, extra = {}) => ({ certificate: 'C-' + date.slice(0, 4), calibrator: 'Metrologiya instituti', accreditation: 'UZ.CAL.001', route: 'accredited', traceability: 'SI', date, validUntil, points, ...extra });
const STD = (extra = {}) => E.cleanStandard({
  id: 'std:pt100', version: 3, name: 'Etalon termometr', type: 'Pt100', serial: 'N-1', unit: '°C', range: { min: 0, max: 100 }, limit: 0.15,
  calibrations: [
    cal('2023-11-01', '2024-11-01', [{ x: 0, correction: 0.01, U: 0.02, k: 2 }, { x: 100, correction: 0.03, U: 0.03, k: 2 }]),
    cal('2024-11-01', '2025-11-01', [{ x: 0, correction: 0.02, U: 0.02, k: 2 }, { x: 100, correction: 0.05, U: 0.03, k: 2 }]),
    cal('2025-11-01', '2026-11-01', [{ x: 0, correction: 0.03, U: 0.02, k: 2 }, { x: 100, correction: 0.07, U: 0.03, k: 2 }]),
  ], ...extra,
});

/* ── model ── */
test('model: nuqtalar matni ↔ nuqtalar (nuqta-vergul / tab, o\'nlik vergul); U siz qator — yaroqsiz', () => {
  const { points, bad } = M.textToPoints('0; 0,03; 0,02; 2\n100\t0,07\t0,03\t2\t50\n50; ; ; 2\n\n25; ; 0,05');
  assert.deepEqual(points, [{ x: 0, correction: 0.03, U: 0.02, k: 2, nu: null }, { x: 100, correction: 0.07, U: 0.03, k: 2, nu: 50 }, { x: 25, correction: null, U: 0.05, k: null, nu: null }]);
  assert.equal(bad, 1);
  assert.equal(M.pointsToText(points), '0; 0.03; 0.02; 2\n100; 0.07; 0.03; 2; 50\n25; ; 0.05');
  assert.deepEqual(M.textToPoints(M.pointsToText(points)).points, points);
});

test('model: qoralama → kartochka; nom, sana va nuqtalar majburiy; noma\'lum maydon o\'tmaydi', () => {
  const d = M.draftOf(STD());
  assert.equal(d.calibrations[2].pointsText, '0; 0.03; 0.02; 2\n100; 0.07; 0.03; 2');
  assert.deepEqual(M.standardOf(d).standard, STD());
  assert.deepEqual(M.standardOf(d).bad, []);
  const bad = M.standardOf({ ...d, name: ' ', owner: 'Ism Familiya', calibrations: [{ ...d.calibrations[0], date: '', pointsText: 'abc' }] });
  assert.deepEqual(bad.bad.sort(), ['date', 'name', 'points']);
  assert.ok(!('owner' in bad.standard));
});

test('model: holat (bugungi sanaga nisbatan) va QC tahlili', () => {
  assert.equal(M.standardStatus(STD(), '2026-11-18', 30).status, 'expired');
  assert.deepEqual([M.standardStatus(STD(), '2026-10-20', 30).status, M.standardStatus(STD(), '2026-10-20', 30).daysLeft], ['expiring', 12]);
  assert.equal(M.standardStatus(STD(), '2026-01-01', 30).status, 'valid');
  assert.equal(M.standardStatus({ calibrations: [] }, '2026-01-01').status, 'unknown');
  const chart = { type: 'imr', target: { mean: 100, s: 2 }, points: [100, 101, 99, 106.5, 104.2, 104.5].map(v => ({ date: '2026-11-18', run: '', values: [v] })) };
  const a = M.analyseQc(chart);
  assert.deepEqual([a.limits.lcl, a.limits.ucl, a.fromTarget], [94, 106, true]);
  assert.deepEqual(a.westgard.violations.map(v => v.rule), ['1_3s', '2_2s']);       // 106,5 > +3s; 104,2 va 104,5 > +2s (106,5 bilan birga)
  assert.deepEqual(a.westgard.flagged[3], ['1_3s', '2_2s']);
  assert.deepEqual([a.sRw.n, a.sRw.nu], [6, 5]);
  const own = M.analyseQc({ ...chart, target: null });
  assert.equal(own.fromTarget, false);
  assert.equal(own.limits.center, own.series.reduce((s, v) => s + v, 0) / 6);
  assert.equal(M.analyseQc({ type: 'imr', points: [] }).error, 'qc_need_data');
  const xb = M.analyseQc({ type: 'xbar', target: null, points: [[10, 12], [11, 11], [9, 10]].map(v => ({ values: v })) });
  assert.deepEqual([xb.type, xb.subgroup, xb.series], ['xbar', 2, [11, 11, 9.5]]);
  assert.deepEqual(M.parseValues('10,1 10.2;10,3'), { values: [10.1, 10.2, 10.3], bad: 0 });
  assert.deepEqual(M.cmcQuantities([{ quantity: 'Harorat', min: 0, max: 1, type: 'abs', value: 1, method: 'T-01' }, { quantity: 'Harorat', min: 1, max: 2, type: 'abs', value: 2, method: 'T-01' }, { quantity: 'X', min: 2, max: 1, type: 'abs', value: 1 }]).map(q => [q.key, q.rows.length]), [['Harorat — T-01', 2]]);
});

/* ── SVG ── */
test('QC grafigi: SVG, ±2s / ±3s chiziqlari, buzilgan nuqtalar belgilangan; skript va tashqi resurs yo\'q', () => {
  const svg = qcChartSVG({ series: [100, 101, 107, 99], limits: { center: 100, ucl: 106, lcl: 94, uwl: 104, lwl: 96 }, flagged: { 2: ['1_3s'] }, labels: ['', '', '<b>x</b>', ''] }, { esc: escHtml, title: 'A"<i>', ruleLabel: r => 'R:' + r });
  const f = frag(svg);
  assert.equal(f.querySelectorAll('svg.qc-chart').length, 1);
  assert.deepEqual([f.querySelectorAll('.qc-l3').length, f.querySelectorAll('.qc-l2').length, f.querySelectorAll('.qc-cl').length], [2, 2, 1]);
  assert.equal(f.querySelectorAll('.qc-dot').length, 3);
  const flag = f.querySelector('.qc-flag');
  assert.deepEqual([flag.dataset.qcFlag, flag.dataset.qcIndex], ['1_3s', '2']);
  assert.match(flag.querySelector('title').textContent, /R:1_3s/);
  assert.equal(f.querySelectorAll('script, b, i, image, foreignObject, use').length, 0);
  assert.ok(!/https?:|href|on\w+=/.test(svg));
  assert.equal(qcChartSVG({ series: [], limits: null }, { esc: escHtml }), '');
});

/* ── ko'rinish ── */
test('ko\'rinish uch tilda: etalonlar ro\'yxati (muddati o\'tgan / yaqin, akkreditatsiyasiz), kartochka, CMC, QC; matnlar lug\'atdan', () => {
  const seen = new Set();
  for (const lang of LANGS) {
    const ctx = ctxOf(lang);
    const list = [STD(), STD({ id: 'std:b', name: 'B', calibrations: [cal('2026-01-01', '2026-12-01', [{ x: 1, U: 1, k: 2 }], { accreditation: '', route: 'lab_other' })] })]
      .map(s => ({ ...s, status: M.standardStatus(s, '2026-11-18', 30) }));
    const f = frag(V.tabsHTML('standards', ctx) + V.roleNoticeHTML({ readOnly: false }, ctx) + V.standardsListHTML({ standards: list, readOnly: false, selected: 'std:b' }, ctx)
      + V.standardFormHTML({ draft: M.draftOf(STD()), readOnly: false, isNew: false, history: [{ at: '2026-11-18T10:00:00.000Z', actor: 'admin', action: 'create', after: { version: 1 }, reason: 'standard_create' }],
        analysis: { x: 100, method: 'last_two', distribution: 'rect', limit: 0.15, includeU: true, drift: E.driftProposal(E.correctionHistory(STD(), 100)), interval: E.intervalRecommendation(E.correctionHistory(STD(), 100), { limit: 0.15 }) } }, ctx));
    assert.equal(f.querySelectorAll('[data-lb-tab]').length, 3);
    assert.deepEqual([...f.querySelectorAll('[data-lb-status]')].map(e => e.dataset.lbStatus), ['expired', 'expiring']);
    assert.equal(f.querySelectorAll('[data-lb-noaccr]').length, 1);
    assert.equal(f.querySelectorAll('[data-lb-cal-box]').length, 3);
    assert.equal(f.querySelector('[data-lb-drift]').dataset.lbDrift, 'ok');
    assert.equal(f.querySelector('[data-lb-interval]').dataset.lbInterval, 'ok');
    assert.ok(f.querySelector('[data-lb-history]'));
    seen.add(f.querySelector('[data-lb-tab="standards"]').textContent + f.querySelector('[data-lb-act="new"]').textContent);
    const cmc = frag(V.cmcHTML({ rows: [{ quantity: 'Harorat', min: 0, max: 100, unit: '°C', type: 'linear', a: 0.05, b: 0.0005, method: 'T-01', note: '' }, { quantity: 'X', min: 5, max: 1, type: 'abs', value: '' }],
      badRows: [1], version: 4, readOnly: false, quantities: [{ key: 'Harorat — T-01' }], probe: { quantity: '', x: '', text: '' } }, ctx));
    assert.equal(cmc.querySelectorAll('[data-lb-cmc-row]').length, 2);
    assert.equal(cmc.querySelectorAll('tr.row-bad').length, 1);
    assert.equal(cmc.querySelectorAll('[data-lb-cmc-field="a"], [data-lb-cmc-field="b"]').length, 2);
    const chart = { id: 'qc:1', name: 'NH4-N', unit: 'µg/L', type: 'imr', target: { mean: 100, s: 2 }, points: [100, 101, 99, 106.5].map(v => ({ date: '2026-11-18', run: '', values: [v] })) };
    const qc = frag(V.qcHTML({ charts: [chart], selected: 'qc:1', chart, readOnly: false, history: [], entry: { date: '', run: '', values: '' }, target: { mean: 100, s: 2 }, analysis: M.analyseQc(chart) }, ctx));
    assert.equal(qc.querySelectorAll('svg.qc-chart .qc-flag').length, 1);
    assert.equal(qc.querySelector('[data-lb-westgard]').dataset.lbWestgard, 'out');
    assert.deepEqual([...qc.querySelectorAll('[data-lb-rule]')].map(e => e.dataset.lbRule), ['1_3s']);
    assert.ok(qc.querySelector('[data-lb-act="to-topdown"]'));
    // R₄s seriya belgisisiz — "loyiha yaqinlashuvi" belgisi (uch tilda)
    const r4 = { ...chart, points: [100, 105, 95].map(v => ({ date: '2026-11-18', run: '', values: [v] })) };
    const q4 = frag(V.qcHTML({ charts: [r4], selected: 'qc:1', chart: r4, readOnly: false, history: [], entry: { date: '', run: '', values: '' }, target: { mean: 100, s: 2 }, analysis: M.analyseQc(r4) }, ctx));
    assert.equal(q4.querySelectorAll('[data-lb-rule="R_4s"] [data-lb-approx]').length, 1);
    assert.equal(q4.querySelector('[data-lb-approx]').textContent, `(${ctx.t('lb_rule_approx')})`);
    const runs = { ...r4, points: r4.points.map(p => ({ ...p, run: 'a' })) };
    assert.equal(frag(V.qcHTML({ charts: [runs], selected: 'qc:1', chart: runs, readOnly: false, history: [], entry: {}, target: { mean: 100, s: 2 }, analysis: M.analyseQc(runs) }, ctx)).querySelectorAll('[data-lb-approx]').length, 0);
    // W-4: 1₂s darvozasi — ±2s ga yetmagan 4₁s ko'rsatiladi, lekin rad etmaydi; darvoza o'chirilsa — belgi bilan rad etadi
    const q41 = { ...chart, points: [100, 103, 103, 103, 103].map(v => ({ date: '2026-11-18', run: '', values: [v] })) };
    const gOn = frag(V.qcHTML({ charts: [q41], selected: 'qc:1', chart: q41, readOnly: false, history: [], entry: {}, target: { mean: 100, s: 2 }, analysis: M.analyseQc(q41) }, ctx));
    assert.equal(gOn.querySelector('[data-lb-westgard]').dataset.lbWestgard, 'in');
    assert.ok(gOn.querySelector('[data-lb-suppressed]'));
    assert.equal(gOn.querySelector('[data-lb-gate]'), null);
    const gOff = frag(V.qcHTML({ charts: [q41], selected: 'qc:1', chart: q41, readOnly: false, history: [], entry: {}, target: { mean: 100, s: 2 }, analysis: M.analyseQc(q41, { gate: false }) }, ctx));
    assert.equal(gOff.querySelector('[data-lb-westgard]').dataset.lbWestgard, 'out');
    assert.equal(gOff.querySelector('[data-lb-gate]').textContent, ctx.t('lb_qc_gate_off'));
  }
  assert.equal(seen.size, 3);
  assert.deepEqual([...missing], []);
});

test('ko\'rinish: xodim uchun faqat o\'qish (tugmalar va maydonlar o\'chirilgan); escape; inline handler yo\'q', () => {
  const ctx = ctxOf('uz');
  const evil = STD({ name: '<img src=x onerror=alert(1)>', serial: '"><script>x</script>' });
  const html = V.roleNoticeHTML({ readOnly: true }, ctx) + V.standardsListHTML({ standards: [{ ...evil, status: M.standardStatus(evil, '2026-01-01', 30) }], readOnly: true }, ctx)
    + V.standardFormHTML({ draft: M.draftOf(evil), readOnly: true, isNew: false, analysis: null, history: [] }, ctx)
    + V.cmcHTML({ rows: [{ quantity: '<b>q</b>', min: 0, max: 1, type: 'abs', value: 1 }], badRows: [], version: 1, readOnly: true, quantities: [], probe: {} }, ctx)
    + V.pickerHTML({ standards: [evil], standard: evil, selected: evil.id, params: ['<p>'], param: '<p>', x: 0, date: '2026-01-01', source: E.sourceFromStandard(evil, { x: 0 }), drift: null, status: { status: 'valid', daysLeft: 300, evidence: true } }, ctx);
  const f = frag(html);
  assert.ok(f.querySelector('[data-lb-readonly]'));
  assert.equal(f.querySelectorAll('img, script, b, p[onclick]').length, 0);
  assert.ok(!/\son\w+\s*=\s*["']/i.test(html.replace(/&[a-z]+;/g, '')));
  for (const act of ['new', 'import', 'save-std', 'del-std', 'add-cal', 'save-cmc', 'add-cmc']) assert.equal(f.querySelector(`[data-lb-act="${act}"]`).disabled, true, act);
  assert.equal(f.querySelector('[data-lb-act="export-json"]').disabled, false);       // o'qish (eksport) — ruxsat
  assert.ok([...f.querySelectorAll('[data-lb-field], [data-lb-cal-field], [data-lb-cmc-field]')].every(e => e.disabled));
  assert.equal(f.querySelector('[data-lb-field="name"]').value, '<img src=x onerror=alert(1)>');
});

/* ── hisobot ── */
const TB = () => {
  const std = STD();
  const cert = E.sourceFromStandard(std, { x: 50, param: 't' }).component;
  const drift = E.driftComponent(E.driftProposal(E.correctionHistory(std, 50)).proposal, { name: 'Etalon drifti', param: 't', unit: '°C', registry: { id: std.id, version: std.version } });
  return [cert, drift];
};
const state = (settings = {}) => ({ params: ['t'], measurements: { t: [50.01, 50.02, 50.00, 50.01, 50.02] }, model: { formula: '', unit: '°C' }, typeB: TB(), settings: { modelKind: 'unknown', measurementDate: '2026-03-01', ...settings } });
const CMC_ROW = { id: 'r1', quantity: 'Harorat', min: 0, max: 100, unit: '°C', type: 'abs', value: 5, method: 'T-01', tableVersion: 4 };

test('hisobot: reestr manbasi (sertifikat raqami, sana, tashkilot, akkreditatsiya, kuzatuvchanlik, interpolyatsiya), drift asosi, CMC — uch tilda', () => {
  const r = E.evaluate(state({ cmcRows: [CMC_ROW], cmcX: 't' }));
  const seen = new Set();
  for (const lang of LANGS) {
    const ctx = ctxOf(lang);
    const f = frag(labSectionHTML(ctx, r, { print: true }));
    const row = f.querySelector('[data-report-registry="std:pt100"]');
    const cells = [...row.children].map(td => td.textContent.trim());
    assert.match(cells[0], /std:pt100/); assert.match(cells[0], /3/);                 // reestr ID va versiyasi
    assert.deepEqual(cells.slice(1, 6), ['C-2025', '2025-11-01', '2026-11-01', 'Metrologiya instituti', 'UZ.CAL.001']);
    assert.match(cells[6], /SI/);
    assert.match(cells[7], /^50 \(.*0.*100.*\)$/);                                    // interpolyatsiya belgisi
    assert.equal(cells[8], '0.05');                                                   // 0,03 + 0,5·(0,07 − 0,03)
    assert.equal(cells[9], '0.03 (k = 2)');
    assert.equal(f.querySelector('[data-report-meas-date]').textContent.includes('2026-03-01'), true);
    const d = f.querySelector('[data-report-drift="std:pt100"]').textContent;
    assert.match(d, /C-2024 \(2024-11-01; C = 0\.035\); C-2025 \(2025-11-01; C = 0\.05\)/);
    assert.match(d, /√3/);
    const c = f.querySelector('[data-report-cmc-check]');
    assert.equal(c.dataset.reportCmcCheck, 'below');
    assert.match(c.textContent, /CMC\(X = 50\.012 °C\) = 5 °C/);
    assert.equal(f.querySelector('[data-report-cmc-decision]').dataset.reportCmcDecision, '0');
    seen.add(f.textContent);
    // asoslangan qaror hisobotda
    const fid = r.findings.find(x => x.code === 'below_cmc').id;
    const acc = frag(labSectionHTML(ctx, r, { print: true, acceptances: { [fid]: { comment: 'CMC qayta ko\'rilmoqda <b>', role: 'admin', at: '2026-11-18T10:00:00Z' } } }));
    const dec = acc.querySelector('[data-report-cmc-decision="1"]');
    assert.match(dec.textContent, /CMC qayta ko'rilmoqda <b> \(admin, 2026-11-18\)/);
    assert.equal(acc.querySelectorAll('b').length, 0);
  }
  assert.equal(seen.size, 3);
  assert.deepEqual([...missing], []);
});

test('hisobot: CMC holatlari (U ≥ CMC, sohadan tashqari, X yo\'q); reestr ishlatilmagan hisobda bo\'lim yo\'q', () => {
  const ctx = ctxOf('uz');
  const st = s => frag(labSectionHTML(ctx, E.evaluate(state(s)), {})).querySelector('[data-report-cmc-check]').dataset.reportCmcCheck;
  assert.equal(st({ cmcRows: [{ ...CMC_ROW, value: 0.001 }], cmcX: 't' }), 'ok');
  assert.equal(st({ cmcRows: [CMC_ROW], cmcX: 500 }), 'outside');
  assert.equal(st({ cmcRows: [CMC_ROW] }), 'pending');
  const plain = E.evaluate({ params: ['t'], measurements: { t: [1, 2, 3] }, model: { formula: '' }, typeB: [{ name: 'a', param: 't', halfWidth: 0.1, distribution: 'rect' }], settings: { cmc: 0.001 } });
  assert.equal(labSectionHTML(ctx, plain, {}), '');
  assert.equal(labSectionHTML(ctx, { error: 'x' }, {}), '');
});

test('hisobot shakllari: to\'liq hisobotda reestr bo\'limi va muddati o\'tgan etalon → "RASMIY EMAS"', () => {
  const env = ctxOf('uz');
  const spec = state({ measurementDate: '2026-12-01' });
  const r = E.evaluate(spec);
  assert.ok(r.findings.some(f => f.code === 'standard_expired' && f.severity === 'error'));
  for (const form of ['calibration_certificate', 'test_report', 'budget']) {
    const html = FM.buildReport({ form, lang: 'uz', env, sections: createSections(env), requisites: {}, mode: 'GUM', result: r, snapshot: spec, state: spec });
    const f = frag(html);
    assert.ok(f.querySelector('[data-report-lab]'), form);
    assert.ok(f.querySelector('[data-report-registry="std:pt100"]'), form);
    assert.ok(f.querySelector('[data-report-unofficial], .report-watermark, [data-watermark]') || /RASMIY EMAS/.test(f.textContent), form);
  }
});

test('hisobot: mehmon kiritgan reestr yozuvi → info topilma matni uch tilda hisobotda', () => {
  const spec = state();
  spec.typeB[0].registry.enteredBy = 'guest';
  const r = E.evaluate(spec);
  const seen = new Set();
  for (const lang of LANGS) {
    const env = ctxOf(lang);
    const html = FM.buildReport({ form: 'budget', lang, env, sections: createSections(env), requisites: {}, mode: 'GUM', result: r, snapshot: spec, state: spec });
    const text = frag(html).textContent;
    const w = env.t('w_registry_unauthenticated').replace('{s}', 'Etalon termometr — C-2025');
    assert.ok(text.includes(w), lang);
    seen.add(w);
  }
  assert.equal(seen.size, 3);
  assert.deepEqual([...missing], []);
});

/* ── kontroller ── */
let w, doc, toasts, S, appState, sent;
const $ = sel => doc.querySelector(sel);
const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
const setValue = (sel, value) => { const el = typeof sel === 'string' ? $(sel) : sel; el.value = value; fire(el, 'input'); fire(el, 'change'); };
const click = sel => fire(typeof sel === 'string' ? $(sel) : sel, 'click');
const tick = () => new Promise(r => setTimeout(r, 60));

before(async () => {
  const dom = new JSDOM('<!doctype html><body><div id="lab-root"></div><button id="btn-typeb-registry"></button><div id="typeb-settings"><select data-lb-cmc-pick="1"><option value=""></option><option value="Harorat — T-01">h</option></select></div></body>',
    { url: 'https://example.test/', runScripts: 'outside-only' });
  w = dom.window; doc = w.document; toasts = []; sent = null;
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N_FILES.map(read).join('\n;\n'));
  w.i18n.lang = 'uz';
  w.showToast = (m, type) => toasts.push({ m, type });
  w.confirm = () => true;
  const st = { params: ['t'], typeB: [], settings: { modelKind: 'unknown' } };
  appState = w.appState = {
    get: k => (k ? st[k] : { ...st }), set: u => Object.assign(st, u),
    addTypeBComponent: c => st.typeB.push({ ...c, id: 'tb_' + st.typeB.length }), subscribe() {},
  };
  w.AuthManager = { role: 'admin', getSession() { return { role: this.role, login: 'x', name: 'Ism Familiya' }; } };
  w.UCTopDown = { getState: () => ({ step: 1, unit: '' }), setState: s => { sent = s; } };
  w.switchTab = name => { w.__tab = name; };
  global.window = w; global.document = doc;
  global.indexedDB = new IDBFactory();
  S = await import(pathToFileURL(path.join(ROOT, 'src/storage/index.js')).href);
  await import(pathToFileURL(path.join(ROOT, 'src/ui/lab/app.js')).href);
  await w.UCLab.ready;
  await tick();
});

test('kontroller: oyna chiziladi (3 yorliq), hodisalar addEventListener orqali', () => {
  assert.ok(w.UCLab);
  assert.equal(doc.querySelectorAll('[data-lb-tab]').length, 3);
  assert.ok($('[data-lb-list="standards"]'));
  assert.equal(doc.querySelectorAll('#lab-root [onclick], #lab-root [oninput], #lab-root [onchange]').length, 0);
});

test('kontroller: etalon yaratish → IndexedDB + audit izi (rol; ism yo\'q); tahrirlash → versiya 2', async () => {
  click('[data-lb-act="new"]');
  setValue('[data-lb-field="name"]', 'Etalon termometr');
  setValue('[data-lb-field="serial"]', 'N-1');
  setValue('[data-lb-field="unit"]', '°C');
  setValue('[data-lb-cal-field="certificate"]', 'C-2025');
  setValue('[data-lb-cal-field="calibrator"]', 'Metrologiya instituti');
  setValue('[data-lb-cal-field="accreditation"]', 'UZ.CAL.001');
  setValue('[data-lb-cal-field="date"]', '2025-11-01');
  setValue('[data-lb-cal-field="validUntil"]', '2099-11-01');
  click('[data-lb-act="save-std"]'); await tick();
  assert.ok(toasts.some(x => x.type === 'error'), 'nuqtalarsiz saqlanmaydi');
  setValue('[data-lb-cal-field="pointsText"]', '0; 0,03; 0,02; 2\n100; 0,07; 0,03; 2');
  click('[data-lb-act="save-std"]'); await tick();
  const db = await new S.LocalAdapter().open();
  let list = await S.listRegistry(db, 'standard');
  assert.equal(list.length, 1);
  assert.deepEqual([list[0].name, list[0].version, list[0].calibrations[0].points.length], ['Etalon termometr', 1, 2]);
  click('[data-lb-act="add-cal"]');
  const boxes = doc.querySelectorAll('[data-lb-cal-box]');
  assert.equal(boxes.length, 2);
  setValue(boxes[1].querySelector('[data-lb-cal-field="certificate"]'), 'C-2024');
  setValue(boxes[1].querySelector('[data-lb-cal-field="date"]'), '2024-11-01');
  setValue(boxes[1].querySelector('[data-lb-cal-field="validUntil"]'), '2025-11-01');
  setValue(boxes[1].querySelector('[data-lb-cal-field="pointsText"]'), '0; 0,02; 0,02; 2\n100; 0,05; 0,03; 2');
  click('[data-lb-act="save-std"]'); await tick();
  list = await S.listRegistry(db, 'standard');
  assert.equal(list[0].version, 2);
  const audit = (await db.listAudit()).filter(e => e.entity === 'registries');
  assert.deepEqual(audit.map(e => [e.action, e.actor]), [['create', 'admin'], ['update', 'admin']]);
  assert.ok(!JSON.stringify(audit).includes('Ism Familiya'));
  assert.equal((await db.verifyAudit()).ok, true);
  assert.equal($('[data-lb-drift]').dataset.lbDrift, 'none');     // X ko'rsatilmagan (2 nuqtali sertifikat)
  setValue('[data-lb-an="x"]', '0');
  assert.equal($('[data-lb-drift]').dataset.lbDrift, 'ok');
  assert.equal($('[data-lb-interval]').dataset.lbInterval, 'none'); // chegara yo'q / 3 ta kalibrlash yo'q
  await db.close();
});

test('kontroller: "Reestrdan tanlash" → B tur manbasi (U, k, sertifikat nusxasi, ID + versiya), o\'lchash sanasi; drift faqat tasdiqlansa', async () => {
  click('#btn-typeb-registry'); await tick();
  const m = $('#lb-picker');
  assert.equal(m.style.display, 'flex');
  const id = w.UCLab.standards()[0].id;
  setValue(m.querySelector('[data-lb-pick="standard"]'), id);
  assert.equal($('[data-lb-pick-error]').dataset.lbPickError, 'registry_bad_x');
  assert.equal($('[data-lb-pick-act="add"]').disabled, true);
  setValue($('[data-lb-pick="x"]'), '50');
  setValue($('[data-lb-pick="date"]'), '2026-03-01');
  assert.ok($('[data-lb-pick-interp]'));
  assert.ok($('[data-lb-pick-drift]'));
  assert.equal($('[data-lb-pick="addDrift"]').checked, false);     // drift — standart holatda QO'SHILMAYDI
  click('[data-lb-pick-act="add"]');
  const tb = appState.get('typeB');
  assert.equal(tb.length, 2);                                      // sertifikat + interpolyatsiya manbasi (qiymatsiz)
  assert.deepEqual([tb[0].distribution, tb[0].halfWidth, tb[0].k, tb[0].registry.id, tb[0].registry.version, tb[0].registry.certificate, tb[0].registry.interpolated], ['normal', 0.03, 2, id, 2, 'C-2025', true]);
  assert.deepEqual([tb[1].halfWidth, tb[1].distribution], ['', 'rect']);   // raqam o'ylab topilmaydi — foydalanuvchi kiritadi
  assert.ok(!tb.some(c => c.drift));
  assert.equal(appState.get('settings').measurementDate, '2026-03-01');
  assert.equal(m.style.display, 'none');
  // tasdiqlab qo'shish
  click('#btn-typeb-registry'); await tick();
  setValue($('[data-lb-pick="standard"]'), id); setValue($('[data-lb-pick="x"]'), '0');
  const chk = $('[data-lb-pick="addDrift"]'); chk.checked = true; fire(chk, 'change');
  click('[data-lb-pick-act="add"]');
  const drift = appState.get('typeB').find(c => c.drift);
  assert.ok(Math.abs(drift.halfWidth - 0.01) < 1e-12);
  assert.deepEqual([drift.distribution, drift.drift.registryId, drift.drift.calibrations.length], ['rect', id, 2]);
});

test('kontroller: CMC jadvali saqlanadi; hisob sozlamasida kattalik tanlansa qatorlar nusxasi holatga yoziladi', async () => {
  click('[data-lb-tab="cmc"]');
  click('[data-lb-act="add-cmc"]');
  setValue('[data-lb-cmc-field="quantity"]', 'Harorat');
  setValue('[data-lb-cmc-field="min"]', '0'); setValue('[data-lb-cmc-field="max"]', '100');
  click('[data-lb-act="save-cmc"]'); await tick();
  assert.ok(toasts.at(-1).type === 'error');                       // CMC qiymatisiz qator saqlanmaydi
  setValue('[data-lb-cmc-field="value"]', '0,05'); setValue('[data-lb-cmc-field="method"]', 'T-01');
  click('[data-lb-act="save-cmc"]'); await tick();
  assert.deepEqual(w.UCLab.cmcQuantities(), ['Harorat — T-01']);
  setValue('[data-lb-probe="quantity"]', 'Harorat — T-01'); setValue('[data-lb-probe="x"]', '50');
  assert.equal($('[data-lb-probe-out]').textContent, 'CMC = 0.05');
  setValue('#typeb-settings [data-lb-cmc-pick]', 'Harorat — T-01');
  const s = appState.get('settings');
  assert.deepEqual([s.cmcRows.length, s.cmcRows[0].value, s.cmcRows[0].tableVersion, s.cmcKey], [1, 0.05, 1, 'Harorat — T-01']);
  setValue('#typeb-settings [data-lb-cmc-pick]', '');
  assert.equal('cmcRows' in appState.get('settings'), false);
});

test('kontroller: QC kartasi — natija qo\'shish (audit), Westgard belgisi, s_Rw → Top-down (control_series, ν = n − 1)', async () => {
  click('[data-lb-tab="qc"]');
  click('[data-lb-act="new-qc"]'); await tick();
  setValue('[data-lb-qc="unit"]', 'µg/L');
  setValue('[data-lb-qc="targetMean"]', '100'); setValue('[data-lb-qc="targetS"]', '2');
  for (const v of ['100', '101,5', '99', '106,5']) { setValue('[data-lb-qc="newValues"]', v); click('[data-lb-act="add-qc-point"]'); await tick(); }
  assert.equal($('[data-lb-westgard]').dataset.lbWestgard, 'out');
  assert.equal(doc.querySelectorAll('svg.qc-chart .qc-flag').length, 1);
  assert.ok(toasts.some(x => x.type === 'error' && /1₃s/.test(x.m)));
  const db = await new S.LocalAdapter().open();
  const chart = (await S.listRegistry(db, 'qc'))[0];
  assert.deepEqual(chart.points.map(p => p.values[0]), [100, 101.5, 99, 106.5]);
  assert.deepEqual(chart.target, { mean: 100, s: 2 });
  assert.equal((await S.registryHistory(db, chart.id)).filter(e => e.reason === 'qc_value').length, 4);
  await db.close();
  click('[data-lb-act="to-topdown"]');
  assert.deepEqual([sent.basis, sent.rwSources, sent.qcValues, sent.scale, sent.unit, sent.step], ['within', ['control_series'], '100\n101.5\n99\n106.5', 'absolute', 'µg/L', 2]);
  assert.equal(w.__tab, 'topdown');
  const B = await import(pathToFileURL(path.join(ROOT, 'src/ui/topdown/build.js')).href);
  const td = E.evaluate(B.buildSpec({ ...B.defaults(), ...sent }).spec);
  const sRw = E.sRwFromChart(chart.points).sRw;
  assert.ok(Math.abs(td.budget[0].u - sRw) < 1e-12);                 // top-down byudjetida aynan shu s_Rw
});

test('kontroller: xodim — reestr faqat o\'qiladi (tugmalar o\'chiq, saqlash rad etiladi)', async () => {
  w.AuthManager.role = 'employee';
  click('[data-lb-tab="standards"]');
  assert.ok($('[data-lb-readonly]'));
  assert.equal($('[data-lb-act="new"]').disabled, true);
  click($('[data-lb-act="open"]')); await tick();
  assert.equal($('[data-lb-act="save-std"]').disabled, true);
  const db = await new S.LocalAdapter().open();
  await assert.rejects(S.saveRegistry(db, { ...w.UCLab.standards()[0], name: 'X' }, { role: 'employee' }), /registry_forbidden/);
  await db.close();
  w.AuthManager.role = 'admin';
});
