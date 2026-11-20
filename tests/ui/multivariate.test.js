/* P07 — vektor natija: hisobot bo'limi (src/report/sections.js::multivariateSection), ellips grafigi (src/report/ellipse.js),
   natijalar sahifasi va bosma hisobot (src/js/report.js), eksport (uc-calc/1). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const J = require('../../src/io/calc-json.js');
const CS = require('../../src/io/calc-state.js');
const { ellipseSvg } = require('../../src/report/ellipse.js');
const { roundResult, roundHalfAway, roundUpAway } = require('../../src/report/rounding.js');
const { fmt, fmtSci } = require('../../src/report/format.js');
const { reportBridge } = require('./lib.js');
const { escHtml } = require('../../src/ui/escape.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const load = id => JSON.parse(read('tests/cases/' + id + '.json')).modelSpec;
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js', 'src/js/i18n-special.js', 'src/js/i18n-linter.js', 'src/js/i18n-report.js'];
function page(lang, state, extra) {
  const dom = new JSDOM('<!doctype html><body><button id="btn-print"></button><div id="results-content"></div><div id="print-report"></div></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N_FILES.map(read).join('\n;\n'));
  w.i18n.lang = lang;
  w.Calc = { roundResult, roundHalfAway, roundUpAway, fmt, fmtSci, monteCarlo: E.monteCarlo, ...reportBridge };
  const st = { points: [], summary: {}, settings: {}, acceptances: {}, ...state };
  w.appState = { get: k => (k ? st[k] : st), set: p => Object.assign(st, p), subscribe() {} };
  w.Points = { summary: (pts, uk) => reportBridge.summaryRows(pts, uk), snapshot: s => { const o = {}; ['params', 'measurements', 'model', 'outputs', 'settings', 'typeB', 'covB'].forEach(k => { o[k] = s[k]; }); return JSON.parse(JSON.stringify(o)); } };
  w.toasts = [];
  w.showToast = (m, type) => w.toasts.push({ m, type });
  w.printed = 0;
  w.print = () => { w.printed++; };
  w.switchTab = () => {};
  Object.assign(w, extra || {});
  w.eval(read('src/js/report.js'));
  w.Results.init();
  w.Results.render();
  return w;
}
const sections = w => w.Calc.createSections({ t: k => w.i18n.t(k), esc: escHtml, acceptances: () => ({}), canAccept: () => false, lab: () => ({}) });
const frag = (w, html) => { const d = w.document.createElement('div'); d.innerHTML = html; return d; };
const ADD = load('jcgm102/jcgm102-9-2-4-guf');     // Table 5 (41-bet): u = 3,162; r = 0,900; kp = 2,45; kq = 2,24
const tick = () => new Promise(r => setTimeout(r, 0));

test('hisobot bo\'limi: har bir chiqish alohida qator (y, u, k, U, ν_eff), korrelyatsiya matritsasi, qamrov sohasi (turi, P, k_p, k_q) — uch tilda', () => {
  const r = E.evaluate(ADD);
  for (const lang of ['uz', 'ru', 'en']) {
    const w = page(lang, {});
    const d = frag(w, sections(w).multivariateSection(r, {}));
    assert.ok(d.querySelector('[data-mv-section]'), lang);
    const rows = [...d.querySelectorAll('[data-mv-outputs] tbody tr')];
    assert.deepEqual(rows.map(x => x.dataset.mvOutput), ['Y1', 'Y2']);
    // U ko'pi bilan 2 qiymatli raqam (ILAC P14 §5.3): u = 3,162, k = t₀.₉₅(∞) = 1,96 → U = 6,198 → 6,2; y = 0,0
    assert.match([...rows[0].children].map(c => c.textContent.trim()).join(' | '), /^Y1, 1 \| 0\.0 \| 3\.16\d* \| 1\.96 \| 6\.2 \| ∞ \| Y1 = \(0\.0 ± 6\.2\) 1$/);
    const cm = d.querySelector('[data-mv-correlation]');
    assert.deepEqual([...cm.querySelectorAll('tbody td')].map(x => x.textContent), ['1', '0.900', '0.900', '1']);
    const ell = d.querySelector('[data-mv-region="ellipsoid"]').textContent, rect = d.querySelector('[data-mv-region="rectangle"]').textContent;
    assert.ok(ell.startsWith(w.i18n.t('mv_region_ellipse') + ' (P = 95 %)'), lang);
    assert.match(ell, /k_p = 2\.45/);
    assert.ok(ell.includes(w.i18n.t('mv_region_gauss')), lang);
    assert.ok(rect.startsWith(w.i18n.t('mv_region_rectangle') + ' (P ≥ 95 %)'), lang);
    assert.match(rect, /k_q = 2\.24/);
    assert.ok(d.querySelector('svg[data-region-plot]'), lang);                                   // ikki chiqish — ellips grafigi
    assert.ok(d.querySelector('[data-finding="outputs_correlated"]'), lang);                     // MV1 (|r| = 0,9)
    assert.ok(d.textContent.includes(w.i18n.t('mv_title')), lang);
    // bosma: har bir chiqishning byudjeti ham
    const pr = frag(w, sections(w).multivariateSection(r, { print: true }));
    assert.equal(pr.querySelectorAll('.print-table').length, 2 + 2);                             // natijalar + korrelyatsiya + 2 byudjet
    assert.equal(pr.querySelector('[data-finding-accept]'), null);
  }
});

test('uch chiqish (JCGM 102 §9.4): grafik yo\'q; U_y singular — hisobotda aytiladi; |r| > 0,99 da 1 − |r| ham ko\'rsatiladi (Table 11 kabi)', () => {
  const r = E.evaluate(load('jcgm102/jcgm102-9-4-guf'));
  const w = page('uz', {});
  const S = sections(w);
  const d = frag(w, S.multivariateSection(r, {}));
  assert.equal(d.querySelector('svg[data-region-plot]'), null);
  assert.ok(d.querySelector('[data-mv-region="ellipsoid"]').textContent.includes(w.i18n.t('mv_region_singular')));
  assert.ok(d.querySelector('[data-mv-region="ellipsoid"]').textContent.startsWith(w.i18n.t('mv_region_ellipsoid')));
  const cells = [...d.querySelectorAll('[data-mv-correlation] tbody td')].map(x => x.textContent);
  assert.equal(cells[1], '-0.588');                                                              // Table 11: r(R, X) = −0,588
  assert.equal(cells[2], '-0.485');
  assert.match(cells[5], /^0\.993 \(1 − \|r\| = 0\.00749\)$/);                                   // Table 11: 1 − r(X, Z) = 0,749·10⁻²
  assert.equal(S.corrText(0.5), '0.500');
  assert.equal(S.corrText(1), '1.000');
});

test('ellips SVG: skript / hodisa atributi yo\'q (CSP), yozuvlar escape qilinadi; noto\'g\'ri o\'lchamda bo\'sh satr', () => {
  const g = E.gaussianRegion([1, 2], [[2.0, 1.9], [1.9, 2.0]], 0.95);
  const svg = ellipseSvg({ y: [1, 2], ellipse: g.ellipse, rectangle: g.rectangle.intervals, labels: ['<img src=x onerror=alert(1)>', 'Y2, Ω'], esc: escHtml });
  assert.ok(svg.startsWith('<svg class="region-plot" data-region-plot="1"'));
  assert.ok(!/<script|javascript:|<img/i.test(svg));
  const el = new JSDOM('<body>' + svg + '</body>').window.document.body;
  assert.equal(el.querySelectorAll('img, script').length, 0);
  for (const n of el.querySelectorAll('*')) for (const at of n.attributes) assert.ok(!/^on/i.test(at.name), at.name);   // hodisa atributi yo'q
  assert.ok(svg.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(svg.includes('class="region-ellipse"') && svg.includes('class="region-rect"'));
  assert.equal((svg.match(/<polygon/g) || []).length, 1);
  assert.equal(ellipseSvg({ y: [0, 0], ellipse: { semiAxes: [0, 0], angle: 0 }, labels: ['a', 'b'], esc: escHtml }), '');
});

test('natijalar sahifasi: vektor natija bo\'limi va Monte-Karlo paneli; MCM natijasi (k_p, k_q, §8 xulosasi); bosma hisobotda U_y va qamrov sohasi', async () => {
  const r = E.evaluate(ADD);
  const UCMonteCarlo = { run: (s, o) => ({ promise: Promise.resolve(E.monteCarlo(s, { ...o, mode: 'fixed', M: 200000 })), cancel() {} }) };
  const w = page('uz', { ...ADD.state, combined: r }, { UCMonteCarlo });
  const doc = w.document;
  assert.ok(doc.querySelector('[data-mv-section]'));
  assert.ok(doc.querySelector('[data-mc-panel]'));
  assert.equal(doc.querySelector('[data-mv-mc-region]'), null);
  doc.querySelector('#btn-mc').click();
  await tick();
  // JCGM 102 Table 5 (41-bet), MCM: kp = 2,28; kq = 1,87 — GUM (2,45; 2,24) tasdiqlanmaydi (9.2.4.4)
  const line = doc.querySelector('[data-mv-mc-region]').textContent;
  assert.match(line, /k_p = 2\.2[78] \(GUM: 2\.45\)/);
  assert.match(line, /k_q = 1\.8[67] \(GUM: 2\.24\)/);
  assert.match(doc.querySelector('#results-content').textContent, /JCGM 102 §8: n_dig = 2 {2}→ {2}GUM natijasi tasdiqlanmadi \(k_p, k_q\)/);
  assert.ok(doc.querySelector('[data-finding="mc_lpu_not_validated"]'));
  // bosma hisobot
  await w.Results.printReport();
  assert.equal(w.printed, 1);
  const p = doc.querySelector('#print-report');
  assert.equal(p.querySelector('[data-report-body]').dataset.reportBody, 'MULTIVARIATE');
  assert.ok(p.querySelector('[data-mv-correlation]'));
  assert.ok(p.querySelector('[data-mv-region="ellipsoid"]'));
  assert.ok(p.querySelector('[data-mv-mc-region]'));
  assert.match(p.textContent, /JCGM 102:2011/);                                                 // normativ havola
  assert.ok(p.querySelector('[data-finding="outputs_correlated"]'));                           // topilmalar bosmada ham
});

test('uc-calc/1: vektor natija eksport → import → qayta hisob — bit darajasida bir xil; muharrir holati outputs ni saqlaydi; eski bitta chiqishli hujjat o\'zgarmagan', async () => {
  for (const id of ['jcgm102/jcgm102-9-4-guf', 'jcgm102/jcgm102-9-2-2-guf', 'jcgm100/jcgm100-h2-vector']) {
    const spec = load(id), r = E.evaluate(spec);
    const doc = await J.buildCalcDoc({ id: 'calc-mv', createdAt: '2026-11-18T00:00:00.000Z', input: spec, result: r });
    assert.equal(doc.mode, 'MULTIVARIATE');
    const parsed = await J.parseCalcDoc(J.serializeCalcDoc(doc));
    assert.equal(parsed.ok, true, id);
    assert.deepEqual(J.reproduce(parsed, E.evaluate, E.ENGINE_VERSION), { identical: true, main: true, points: [], sameEngine: true, maxRel: 0, close: false });
    assert.deepEqual(parsed.result.covariance, r.covariance);
    assert.ok(parsed.result.coverageRegion.ellipsoid.kp > 0);
  }
  const st = CS.gumStateFromInput(load('jcgm102/jcgm102-9-4-guf'));
  assert.equal(st.ok, true);
  assert.equal(st.state.outputs.length, 3);
  assert.deepEqual(CS.gumInput(st.state).outputs.map(o => o.formula), ['R = V / I * 1000 * cos(phi)', 'X = V / I * 1000 * sin(phi)', 'Z = V / I * 1000']);
  assert.equal(CS.gumStateFromInput({ ...load('jcgm102/jcgm102-9-4-guf').state, outputs: [{ formula: 5 }] }).ok, false);
  const single = CS.gumStateFromInput(load('excel/excel-gas-p2'));
  assert.equal(single.state.outputs, undefined);
  assert.equal(CS.gumInput(single.state).outputs, undefined);
});

test('model kartasi (src/js/table.js): qo\'shimcha chiqish formulalari — qo\'shish / o\'chirish; state.outputs = [asosiy, …]; matnlar uch tilda', () => {
  const src = read('src/js/table.js');
  for (const a of ['data-out-add', 'data-out-remove', 'data-out-formula', 'data-out-unit']) assert.ok(src.includes(a), a);
  assert.match(src, /outputs: extras\.length \? \[\{ formula: model\.formula \|\| '', unit: model\.unit \|\| '' \}\]\.concat\(extras\) : undefined/);
  assert.ok(!/onclick=|innerHTML = [^`]*\$\{o\.formula\}/.test(src));
  const w = page('uz', {});
  for (const k of ['mv_title', 'mv_method', 'mv_col_output', 'mv_col_statement', 'mv_corr_title', 'mv_region_title', 'mv_region_ellipse', 'mv_region_ellipsoid', 'mv_region_rectangle', 'mv_region_gauss',
    'mv_region_mcm', 'mv_region_singular', 'mv_plot_caption', 'mv_budget_of', 'model_output_n', 'model_output_ph', 'model_add_output', 'model_remove_output', 'model_outputs_hint', 'err_duplicate_output', 'err_invalid_covariance', 'mc_err_mc_t_dof']) {
    for (const lang of ['uz', 'ru', 'en']) { w.i18n.lang = lang; assert.notEqual(w.i18n.t(k), k, `${lang}.${k}`); }
  }
});

/* ── P07b ── */
test('P07b: eng kichik qamrov sohasi (JCGM 102 §7.7.4) hisobotda — yuz, to\'r, nuqtalar ulushi, grafikdagi bo\'yalgan soha; uch tilda; skriptsiz', () => {
  const r = E.evaluate(ADD), mc = E.monteCarlo(ADD, { mode: 'fixed', M: 50000, validation: false, smallestMesh: 20 });
  const seen = new Set();
  for (const lang of ['uz', 'ru', 'en']) {
    const w = page(lang, {});
    const html = sections(w).multivariateSection(r, { mc });
    const d = frag(w, html);
    const line = d.querySelector('[data-mv-smallest]').textContent;
    assert.match(line, /JCGM 102 §7\.7\.4/); assert.match(line, /20 × 20/);
    assert.ok(line.includes(w.i18n.t('mv_smallest')) && line.includes(w.i18n.t('mv_smallest_note')), lang);
    assert.equal(d.querySelector('[data-region-smallest]').getAttribute('data-region-smallest'), '20');
    assert.ok(d.querySelector('.region-plot-box').textContent.includes(w.i18n.t('mv_plot_caption_smallest')));
    assert.ok(!/<script|\son\w+=|javascript:/i.test(html));
    seen.add(line);
  }
  assert.equal(seen.size, 3);
  // MCM natijasisiz (faqat LPU) — bo'yalgan soha va satr yo'q
  const w = page('uz', {});
  const d0 = frag(w, sections(w).multivariateSection(r, {}));
  assert.equal(d0.querySelectorAll('[data-mv-smallest], [data-region-smallest]').length, 0);
});

test('P07b: oshkor bo\'lmagan model natijasi hisobotda — tenglama matni, izoh (uch tilda), vektor bo\'lim', () => {
  const one = E.evaluate(load('jcgm102/jcgm102-9-5-2-single')), many = E.evaluate(load('jcgm102/jcgm102-9-5-3-several'));
  for (const lang of ['uz', 'ru', 'en']) {
    const w = page(lang, {});
    const S = sections(w);
    assert.ok(S.notesHtml(one).includes(escHtml(w.i18n.t('n_implicit_model'))), lang);
    assert.match(frag(w, S.pointDetail(one, load('jcgm102/jcgm102-9-5-2-single').state, '', undefined, undefined, {})).textContent, /θ = \(1 \+ A\*θ \+ B\*θ\^2\)\*R0 - r\*RS = 0/);
    const d = frag(w, S.multivariateSection(many, {}));
    assert.equal(d.querySelectorAll('[data-mv-outputs] tbody tr').length, 10);
    for (const e of E.IMPLICIT_ERRORS) assert.ok(w.i18n.t('err_' + e) !== 'err_' + e, `${lang}.err_${e}`);
    // Egasi qarori (2026-11-19): cond(C_y) va U_y qaysi yo'l bilan hisoblangani — ekranda, bosmada va vektor bo'limda
    const print = frag(w, S.pointDetail(one, load('jcgm102/jcgm102-9-5-2-single').state, '', undefined, undefined, {}));
    for (const el of [frag(w, S.notesHtml(one)), print, d]) {
      const info = el.querySelector('[data-implicit-info="annex-b"]');
      assert.ok(info, lang);
      assert.match(info.querySelector('[data-implicit-cond]').textContent, /cond₁\(C_y\) = 1[.,]0/);
      assert.ok(info.textContent.includes(w.i18n.t('imp_cov_annexb')) && info.textContent.includes(w.i18n.t('imp_newton')), lang);
    }
    assert.ok(d.textContent.includes(w.i18n.t('imp_method')) && !d.textContent.includes('U_y = C_x U_x C_xᵀ (JCGM 102:2011 §6.2)'), lang);
    // LU yo'li (U_x singular) — hisobotda aynan shunday yoziladi va topilma chiqadi
    const lu = E.evaluate({ params: ['a', 'b'], measurements: { a: [1], b: [2] }, settings: { paired: false },
      typeB: [{ name: 'u(a)', param: 'a', halfWidth: 0.1, distribution: 'normal', k: 1 }], implicit: { unknowns: [{ name: 'y', start: 1 }], equations: ['y^2 = a*b'] } });
    const dl = frag(w, S.notesHtml(lu));
    assert.ok(dl.querySelector('[data-implicit-info="lu"]').textContent.includes(w.i18n.t('imp_cov_lu')), lang);
    for (const k of ['w_', 'why_', 'fix_']) assert.ok(w.i18n.t(k + 'implicit_lu_fallback') !== k + 'implicit_lu_fallback', lang + k);
  }
});

/* ─── Ko'p chiqish + ko'p nuqta (egasi qarori 2026-11-19, 8-band) ─────────────────────────────── */
test('ko\'p chiqish + ko\'p nuqta: yagona k yo\'q — har bir chiqish o\'z k si bilan; birgalikdagi qamrov faqat nuqtaning sohasi (k_p); nuqtalar alohida', async () => {
  const { summaryRows, vectorSummaryRows, isVectorResult } = require('../../src/report/summary.js');
  // ikki nuqta: ikkinchisida kuzatuvlar kam (ν_eff kichik → k katta) — yagona k bo'lganda birinchi nuqtaga ham ta'sir qilardi
  const tbs = [{ name: 'u(a)', param: 'a', halfWidth: 0.001, distribution: 'normal', k: 1 }, { name: 'u(b)', param: 'b', halfWidth: 0.001, distribution: 'normal', k: 1 }];
  const mk = (a, b) => ({ params: ['a', 'b'], measurements: { a, b }, typeB: tbs, model: { formula: 'S = a + b', unit: 'V' },
    outputs: [{ formula: 'S = a + b', unit: 'V' }, { formula: 'D = a - b', unit: 'V' }], settings: { paired: false, kMethod: 't', P: 0.95 } });
  const s1 = mk([1.0, 1.1, 0.9, 1.05, 0.95, 1.0, 1.02, 0.98, 1.01, 0.99], [2.0, 2.1, 1.9, 2.05, 1.95, 2.0, 2.02, 1.98, 2.01, 1.99]);
  const s2 = mk([5.0, 5.3, 4.8], [7.0, 7.2, 6.7]);
  const r1 = E.evaluate(s1), r2 = E.evaluate(s2);
  assert.ok(isVectorResult(r1) && isVectorResult(r2));
  const pts = [{ id: 'p1', label: 'Nuqta 1', result: r1, snapshot: s1, acceptances: {} }, { id: 'p2', label: 'Nuqta 2', result: r2, snapshot: s2, acceptances: {} }];
  const rows = vectorSummaryRows(pts);
  assert.equal(rows.length, 2);
  rows.forEach((x, i) => {
    const r = [r1, r2][i];
    x.outputs.forEach((o, j) => {
      // U_j va k_j — aynan chiqishning o'z bir o'lchovli natijasidan (yagona k qo'llanmagan)
      assert.deepEqual([o.symbol, o.k, o.U, o.nuEff], [r.symbols[j], r.results[j].k, r.results[j].U, r.results[j].nuEff]);
      assert.equal(o.U, o.k * o.uc);
    });
    assert.equal(x.kp, r.coverageRegion.ellipsoid.kp);                           // JCGM 102:2011 §6.5 — nuqtaning o'z sohasi
  });
  assert.ok(rows[1].outputs[0].k > rows[0].outputs[0].k, 'nuqtalarning k si har xil — eng kattasi boshqasiga ko\'chirilmagan');
  // skalyar jadval vektor nuqtalarni olmaydi (yagona k qoidasi ularga qo'llanmaydi), xato bermaydi
  assert.deepEqual(summaryRows(pts, true), []);

  for (const lang of ['uz', 'ru', 'en']) {
    const w = page(lang, { ...s2, combined: r2, points: pts, currentPoint: 'p2', summary: { uniformK: true } });
    const doc = w.document;
    const panel = doc.querySelector('[data-vector-points]');
    assert.ok(panel, lang);
    assert.equal(panel.querySelector('#pt-uniform-k'), null, 'yagona k katagi ko\'rsatilmaydi');
    const trs = [...panel.querySelectorAll('[data-vector-summary] tbody tr')];
    assert.equal(trs.length, 4);                                                 // 2 nuqta × 2 chiqish
    assert.equal(panel.querySelectorAll('[data-vector-kp]').length, 2);
    assert.ok(panel.querySelector('[data-vector-note]').textContent.includes(w.i18n.t('pt_vector_note')));
    assert.ok(w.i18n.t('pt_vector_note') !== 'pt_vector_note' && w.i18n.t('pt_output_col') !== 'pt_output_col');
    assert.equal(panel.querySelectorAll('[data-pt-load]').length, 2);
    // bosma hisobot: umumiy jadval + har bir nuqtaning vektor bo'limi (korrelyatsiya, qamrov sohasi)
    await w.Results.printReport();
    assert.equal(w.printed, 1);
    const p = doc.querySelector('#print-report');
    assert.equal(p.querySelector('[data-report-body]').dataset.reportBody, 'MULTIVARIATE');
    assert.equal(p.querySelectorAll('[data-report-summary="vector"] tbody tr').length, 4);
    assert.equal(p.querySelectorAll('[data-report-point]').length, 2);
    assert.equal(p.querySelectorAll('[data-mv-region="ellipsoid"]').length, 2);
    assert.equal(p.querySelectorAll('[data-mv-correlation]').length, 2);
    assert.ok(p.querySelector('[data-vector-note]'));
    assert.ok(!/<script|\son\w+=|javascript:/i.test(p.innerHTML));
  }
  // yangi nuqta kiritilayotganda (natija hali yo'q) saqlangan vektor nuqtalar ko'rinib turadi
  const w0 = page('uz', { ...s2, combined: null, points: pts, currentPoint: null });
  assert.equal(w0.document.querySelectorAll('[data-vector-points] [data-vector-summary] tbody tr').length, 4);
  assert.ok(w0.document.querySelector('#btn-pt-save').disabled);
});
