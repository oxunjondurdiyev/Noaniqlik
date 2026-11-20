/* P16 (Interfeys 2.0), 4-bosqich: "Laboratoriya" yangi ko'rinishi — zonali QC grafigi, Westgard holat paneli, etalon
   kartalari, PT tarixi va validatsiya kartalari. Kirishlar HAQIQIY dvigatel funksiyalari orqali (analyseQc → westgard,
   standardStatus → validityStatus, analysePT, analyseValidation): ko'rinish faqat dvigatel natijasini ko'rsatadi.
   Shuningdek: style atributi yo'q (CSP), lab2.css da rang literali / gradient / soya yo'q. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const M = require('../../src/ui/lab/model.js');
const V = require('../../src/ui/lab/view.js');
const QM = require('../../src/ui/lab/quality-model.js');
const QV = require('../../src/ui/lab/quality-view.js');
const { qcChartSVG, qcPointStates, zText } = require('../../src/ui/lab/chart.js');
const { scoreText } = require('../../src/report/pt.js');
const { escHtml } = require('../../src/ui/escape.js');

const ROOT = path.join(__dirname, '..', '..');
const LANGS = ['uz', 'ru', 'en'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js', 'src/js/i18n-special.js', 'src/js/i18n-linter.js', 'src/js/i18n-report.js', 'src/js/i18n-lab.js', 'src/js/i18n-pt.js'];
const DICT = (() => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  return dom.window.eval(I18N_FILES.map(read).join('\n;\n') + '\n;TRANSLATIONS');
})();
const missing = new Set();
const ctxOf = lang => ({ t: k => { if (DICT[lang][k] === undefined) missing.add(`${lang}.${k}`); return DICT[lang][k] !== undefined ? DICT[lang][k] : k; }, esc: escHtml });
const frag = html => new JSDOM('<!doctype html><body><div id="r">' + html + '</div></body>').window.document.getElementById('r');

const chartOf = (values, extra = {}) => ({ id: 'qc:1', name: 'NH4-N', unit: 'µg/L', type: 'imr', target: { mean: 100, s: 2 }, points: values.map(v => ({ date: '2026-11-18', run: '', values: [v] })), ...extra });
const qcModel = (chart, opts) => ({ charts: [chart], selected: chart.id, chart, readOnly: false, history: [], entry: { date: '', run: '', values: '' }, target: { mean: 100, s: 2 }, analysis: M.analyseQc(chart, opts) });
const svgOf = an => qcChartSVG({ series: an.series, limits: an.limits, flagged: an.westgard.flagged, labels: an.labels, z: an.z, suppressed: an.westgard.suppressed }, { esc: escHtml, title: 'QC', ruleLabel: r => 'R:' + r });

/* ── grafik ── */
test('QC grafigi: ±1s / ±2s / ±3s zonalari — uchta tasma (rect), chegaralari dvigatel limits dan', () => {
  const an = M.analyseQc(chartOf([100, 101, 99, 100.5]));
  const f = frag(svgOf(an));
  const bands = [...f.querySelectorAll('rect.qc-zone')];
  assert.deepEqual(bands.map(b => b.dataset.qcBand).sort(), ['1', '2', '2', '3', '3']);
  assert.deepEqual([f.querySelectorAll('.qc-z1').length, f.querySelectorAll('.qc-z2').length, f.querySelectorAll('.qc-z3').length], [1, 2, 2]);
  // geometriya: tasmalar ustma-ust tushmaydi va −3s … +3s oralig'ini to'liq qoplaydi (CL = 100, s = 2 → 94 … 106)
  const span = bands.map(b => [Number(b.getAttribute('y')), Number(b.getAttribute('y')) + Number(b.getAttribute('height'))]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < span.length; i++) assert.ok(Math.abs(span[i][0] - span[i - 1][1]) < 0.02, 'tasmalar tutash');
  const y = cls => [...f.querySelectorAll('line.' + cls)].map(l => Number(l.getAttribute('y1'))).sort((a, b) => a - b);
  assert.ok(Math.abs(span[0][0] - y('qc-l3')[0]) < 0.02 && Math.abs(span[4][1] - y('qc-l3')[1]) < 0.02);
  assert.ok(Math.abs(span[1][0] - y('qc-l2')[0]) < 0.02 && Math.abs(span[3][1] - y('qc-l2')[1]) < 0.02);
  assert.deepEqual([y('qc-l3').length, y('qc-l2').length, y('qc-l1').length, y('qc-cl').length], [2, 2, 2, 1]);
  assert.equal(f.querySelector('svg').getAttribute('role'), 'img');
  assert.equal(f.querySelector('svg').getAttribute('aria-label'), 'QC');
  // σ̂ berilmagan eski chaqiruv (boshqa modul): zonalar uwl ta'rifidan (CL + 2σ̂) — avvalgi imzo ishlaydi
  const old = frag(qcChartSVG({ series: [100, 101], limits: { center: 100, ucl: 106, lcl: 94, uwl: 104, lwl: 96 } }, { esc: escHtml }));
  assert.equal(old.querySelectorAll('rect.qc-zone').length, 5);
  assert.equal(old.querySelector('.qc-last'), null);                       // z berilmagan, qoida yo'q — yozuv yo'q
});

test('QC grafigi: ogohlantirish (±2s dan tashqari, rad etilmagan) va rad etish (qoida buzilgan) nuqtalari alohida sinfda, kattaroq', () => {
  // 104,6: z = 2,3 — faqat 1₂s (ogohlantirish); 107: z = 3,5 — 1₃s (rad etish)
  const an = M.analyseQc(chartOf([100, 101, 99, 104.6, 100, 99.5, 107]));
  assert.deepEqual(an.westgard.violations.map(v => v.rule), ['1_3s']);
  const st = qcPointStates({ series: an.series, limits: an.limits, z: an.z, flagged: an.westgard.flagged, suppressed: an.westgard.suppressed });
  assert.deepEqual(st.map(p => p.state), ['ok', 'ok', 'ok', 'warn', 'ok', 'ok', 'reject']);
  assert.deepEqual(st.map(p => p.z), an.z);                                // z — dvigatelga berilgan qiymatlar, qayta hisoblanmagan
  const f = frag(svgOf(an));
  const warn = f.querySelectorAll('.qc-warn'), rej = f.querySelectorAll('.qc-flag');
  assert.deepEqual([warn.length, rej.length, f.querySelectorAll('.qc-dot').length], [1, 1, 5]);
  assert.deepEqual([warn[0].dataset.qcIndex, warn[0].dataset.qcWarn, warn[0].dataset.qcState], ['3', '1_2s', 'warn']);
  assert.deepEqual([rej[0].dataset.qcIndex, rej[0].dataset.qcFlag, rej[0].dataset.qcState], ['6', '1_3s', 'reject']);
  const r = el => Number(el.getAttribute('r'));
  assert.ok(r(rej[0].querySelector('circle')) > r(warn[0].querySelector('circle')) && r(warn[0].querySelector('circle')) > r(f.querySelector('.qc-dot')));
  assert.ok(warn[0].querySelector('path') && rej[0].querySelector('path'));  // shakl ham farq qiladi — rang yagona belgi emas
  assert.match(rej[0].querySelector('title').textContent, /R:1_3s/);
  assert.match(warn[0].querySelector('title').textContent, /z = \+2\.30.*R:1_2s/);
  // z berilmasa — dvigatel chegaralari (uwl / lwl) bilan solishtiriladi: natija bir xil
  assert.deepEqual(qcPointStates({ series: an.series, limits: an.limits, flagged: an.westgard.flagged }).map(p => p.state), st.map(p => p.state));
  // chegaraning o'zidagi nuqta (z = 2) — ogohlantirish emas (dvigateldagi qat'iy tengsizlik)
  assert.deepEqual(qcPointStates({ series: [104], limits: an.limits, z: [2] }).map(p => p.state), ['ok']);
});

test('QC grafigi: oxirgi nuqtada ishlagan qoida va z-ball yozuvi', () => {
  const an = M.analyseQc(chartOf([100, 101, 99, 104.6, 100, 99.5, 107]));
  const last = frag(svgOf(an)).querySelector('.qc-last');
  assert.equal(last.dataset.qcLast, '6');
  assert.ok(last.classList.contains('qc-last-reject'));
  assert.equal(last.querySelector('text').textContent, 'R:1_3s · z = +3.50');
  assert.equal(zText(an.z[6]), '+3.50');
  // qoida ishlamagan oxirgi nuqta — faqat z; ogohlantirish — 1₂s bilan
  const ok = frag(svgOf(M.analyseQc(chartOf([100, 101, 99])))).querySelector('.qc-last');
  assert.ok(ok.classList.contains('qc-last-ok'));
  assert.equal(ok.querySelector('text').textContent, 'z = −0.50');
  const w = frag(svgOf(M.analyseQc(chartOf([100, 101, 95.4])))).querySelector('.qc-last');
  assert.ok(w.classList.contains('qc-last-warn'));
  assert.equal(w.querySelector('text').textContent, 'R:1_2s · z = −2.30');
  assert.deepEqual([zText(0), zText(-0.001), zText(NaN)], ['0.00', '0.00', '']);
});

/* ── Westgard paneli ── */
test('Westgard paneli: har bir qoida holati dvigatel natijasidan; 1₂s darvozasi to\'xtatgan qoida — suppressed (uch tilda)', () => {
  const gated = chartOf([100, 103, 103, 103, 103]);                        // 4₁s oynasi bor, lekin ±2s dan oshish yo'q
  const an = M.analyseQc(gated);
  assert.deepEqual([an.westgard.gate, an.westgard.inControl, an.westgard.suppressed], [true, true, [{ rule: '4_1s', indices: [1, 2, 3, 4] }]]);
  for (const lang of LANGS) {
    const ctx = ctxOf(lang);
    const f = frag(V.qcHTML(qcModel(gated), ctx));
    const panel = f.querySelector('[data-lb-wg-panel]');
    assert.ok(panel);
    assert.deepEqual([...panel.querySelectorAll('[data-lb-wg]')].map(e => e.dataset.lbWg), ['1_2s', ...E.WESTGARD_RULES]);
    const state = r => panel.querySelector(`[data-lb-wg="${r}"]`).dataset.lbWgState;
    assert.deepEqual(['1_2s', '1_3s', '2_2s', 'R_4s', '4_1s', '10_x'].map(state), ['ok', 'ok', 'ok', 'ok', 'suppressed', 'ok']);
    const row = panel.querySelector('[data-lb-wg="4_1s"]');
    assert.equal(row.querySelector('.badge').textContent, ctx.t('lb_wg_suppressed'));
    assert.equal(row.querySelector('[data-lb-wg-sup] .lb-num').textContent, '2, 3, 4, 5');
    assert.equal(panel.querySelector('[data-lb-wg="1_3s"] .badge').textContent, ctx.t('lb_wg_ok'));
    assert.equal(panel.querySelector('[data-lb-gate-state]').dataset.lbGateState, 'on');
    assert.ok(panel.querySelector('[data-lb-gate-state]').textContent.includes(ctx.t('lb_wg_gate_on')));
    assert.equal(panel.querySelector('[data-lb-westgard]').dataset.lbWestgard, 'in');
    assert.equal(panel.querySelector('[data-lb-westgard]').textContent, ctx.t('lb_qc_in_control'));
    assert.ok(panel.querySelector('[data-lb-suppressed]'));
    assert.equal(panel.querySelectorAll('[data-lb-rule]').length, 0);
    // grafikda: to'xtatilgan oyna nuqtalari — ogohlantirish (rad etish emas)
    assert.deepEqual([...f.querySelectorAll('svg.qc-chart .qc-warn')].map(e => [e.dataset.qcIndex, e.dataset.qcWarn]), [['1', '4_1s'], ['2', '4_1s'], ['3', '4_1s'], ['4', '4_1s']]);
    assert.equal(f.querySelectorAll('svg.qc-chart .qc-flag').length, 0);
    assert.equal(f.querySelector('.qc-last text').textContent, `${ctx.t('lb_rule_4_1s')} · z = +1.50`);
    assert.equal(f.querySelector('[data-lb-last-z] .lb-kpi-value').textContent, '+1.50');
    assert.equal(f.querySelectorAll('[data-lb-legend] li').length, 5);

    // darvoza o'chirilgan: xuddi shu ma'lumot — 4₁s buzilgan, holat aniq yozilgan
    const off = frag(V.qcHTML(qcModel(gated, { gate: false }), ctx)).querySelector('[data-lb-wg-panel]');
    assert.equal(off.querySelector('[data-lb-gate-state]').dataset.lbGateState, 'off');
    assert.ok(off.querySelector('[data-lb-gate-state]').textContent.includes(ctx.t('lb_wg_gate_off')));
    assert.equal(off.querySelector('[data-lb-wg="4_1s"]').dataset.lbWgState, 'violated');
    assert.equal(off.querySelector('[data-lb-wg="4_1s"] .badge').textContent, ctx.t('lb_wg_violated'));
    assert.equal(off.querySelector('[data-lb-westgard]').dataset.lbWestgard, 'out');
    assert.equal(off.querySelector('[data-lb-suppressed]'), null);

    // buzilishlar: 1₃s + 2₂s + R₄s (yaqinlashuv belgisi bilan); 1₂s qatori — ±2s dan tashqaridagi nuqtalar
    const bad = frag(V.qcHTML(qcModel(chartOf([100, 104.6, 95.2, 100, 104.4, 104.9, 107.1])), ctx)).querySelector('[data-lb-wg-panel]');
    const wg = M.analyseQc(chartOf([100, 104.6, 95.2, 100, 104.4, 104.9, 107.1])).westgard;
    assert.deepEqual([...bad.querySelectorAll('[data-lb-rule]')].map(e => e.dataset.lbRule), wg.violations.map(v => v.rule));
    for (const v of wg.violations) {
      const el = bad.querySelector(`[data-lb-wg="${v.rule}"]`);
      assert.equal(el.dataset.lbWgState, 'violated');
      assert.equal(el.querySelector('.lb-wg-points .lb-num').textContent, v.indices.map(i => i + 1).join(', '));
      assert.equal(el.querySelectorAll('[data-lb-approx]').length, v.approximation ? 1 : 0);
    }
    assert.ok(wg.violations.some(v => v.approximation));
    assert.equal(bad.querySelector('[data-lb-wg="1_2s"]').dataset.lbWgState, 'warn');
    assert.equal(bad.querySelector('[data-lb-wg="1_2s"] .lb-wg-points .lb-num').textContent, '2, 3, 5, 6, 7');
    assert.equal(bad.querySelector('[data-lb-wg="1_2s"] .badge').textContent, ctx.t('lb_wg_warn'));
  }
  assert.deepEqual([...missing], []);
});

/* ── etalon kartalari ── */
const cal = (validUntil, extra = {}) => ({ certificate: 'C-1', calibrator: 'Metrologiya instituti', accreditation: 'UZ.CAL.001', route: 'accredited', traceability: 'SI', date: '2025-11-01', validUntil, points: [{ x: 0, correction: 0.01, U: 0.02, k: 2 }], ...extra });
const std = (id, validUntil, extra) => E.cleanStandard({ id, version: 2, name: 'Etalon ' + id, type: 'Pt100', serial: 'N-' + id, unit: '°C', range: { min: 0, max: 100 }, calibrations: [cal(validUntil, extra)] });

test('etalonlar reestri — kartalar: amalda / muddati yaqin / muddati o\'tgan ("RASMIY EMAS") nishonlari, holat app dan (uch tilda)', () => {
  const today = '2026-11-18';
  const list = [std('a', '2027-11-01'), std('b', '2026-12-01'), std('c', '2026-11-01'), std('d', '2027-11-01', { accreditation: '', route: 'lab_other' })]
    .map(s => ({ ...s, status: M.standardStatus(s, today, 30) }));
  assert.deepEqual(list.map(s => s.status.status), ['valid', 'expiring', 'expired', 'valid']);
  const seen = new Set();
  for (const lang of LANGS) {
    const ctx = ctxOf(lang);
    const html = V.standardsListHTML({ standards: list, readOnly: false, selected: 'b' }, ctx);
    const f = frag(html);
    const cards = [...f.querySelectorAll('[data-lb-cards="standards"] > li.lb-std-card')];
    assert.deepEqual(cards.map(c => c.dataset.lbStd), ['a', 'b', 'c', 'd']);
    assert.equal(f.querySelectorAll('table').length, 0);
    const badge = id => f.querySelector(`[data-lb-std="${id}"] [data-lb-status]`);
    assert.deepEqual(['a', 'b', 'c'].map(id => [badge(id).dataset.lbStatus, badge(id).className]), [['valid', 'badge badge-green'], ['expiring', 'badge badge-orange'], ['expired', 'badge badge-red']]);
    assert.equal(badge('a').textContent, ctx.t('lb_status_valid'));
    assert.equal(badge('b').textContent, `${ctx.t('lb_status_expiring')} (${list[1].status.daysLeft})`);
    assert.equal(badge('c').textContent, `${ctx.t('lb_status_expired')} — ${ctx.t('lb_card_unofficial')}`);
    assert.equal(f.querySelector('[data-lb-std="c"] [data-lb-unofficial]').textContent, ctx.t('lb_card_unofficial_hint'));
    assert.equal(f.querySelectorAll('[data-lb-unofficial]').length, 1);
    assert.equal(f.querySelectorAll('[data-lb-noaccr]').length, 1);
    assert.ok(f.querySelector('[data-lb-std="d"] [data-lb-noaccr]'));
    // karta — haqiqiy tugma (klaviatura), app.js delegatsiyasi uchun data-lb-act / data-lb-id
    for (const c of cards) {
      const b = c.querySelector('button[data-lb-act="open"]');
      assert.deepEqual([b.type, b.dataset.lbId, b.textContent], ['button', c.dataset.lbStd, 'Etalon ' + c.dataset.lbStd]);
      const text = c.textContent;
      for (const v of ['Metrologiya instituti', 'C-1', 'N-' + c.dataset.lbStd, 'v2']) assert.ok(text.includes(v), v);
    }
    assert.ok(f.querySelector('[data-lb-std="a"]').textContent.includes('2027-11-01'));
    assert.deepEqual(cards.map(c => c.getAttribute('aria-current')), [null, 'true', null, null]);
    assert.ok(cards[1].classList.contains('is-selected'));
    seen.add(badge('c').textContent);
  }
  assert.equal(seen.size, 3);
  assert.equal(DICT.uz.lb_card_unofficial, 'RASMIY EMAS');
  assert.equal(DICT.en.lb_card_unofficial, 'NOT OFFICIAL');
  assert.deepEqual([...missing], []);
});

/* ── PT va validatsiya ── */
const SERIES = { id: 'pt:1', name: 'Pb', unit: 'mg/L', quantity: 'Pb', rounds: [
  { id: 'R1', date: '2026-01-10', scheme: 'S', x: 10.2, xpt: 10, sigmaPt: 0.25 }, { id: 'R2', x: 10.6, xpt: 10, sigmaPt: 0.25 },
  { id: 'R3', x: 9.1, xpt: 10, sigmaPt: 0.25 }, { id: '<img src=x>', x: 10.1, xpt: 10, Ux: 0.3, Uxpt: 0.2 }] };
const SET = { id: 'val:1', name: 'V', tests: [
  { id: 'T1', type: 'grubbs', values: [199.31, 199.53, 200.19, 200.82, 201.92, 201.95, 202.18, 245.57], side: 'max' },
  { id: 'T2', type: 'ttest', a: [1, 2, 3, 4], b: [2, 3, 4, 6] }, { id: 'T3', type: 'lod', values: [0.1, 0.12, 0.09] }, { id: 'T4', type: 'grubbs', values: [1, 1] }] };

test('PT tarixi va validatsiya — kartalar: baho / holat nishonlari dvigatel natijasidan; ball hisobotdagi ko\'rinishda', () => {
  const pr = QM.analysePT(SERIES), vr = QM.analyseValidation(SET);
  assert.deepEqual(pr.rounds.map(r => r.verdict), ['satisfactory', 'questionable', 'unsatisfactory', 'satisfactory']);
  for (const lang of LANGS) {
    const ctx = ctxOf(lang);
    const pt = frag(QV.ptHTML({ list: [SERIES], selected: 'pt:1', series: SERIES, entry: { date: '' }, result: pr, history: [], canAdmin: true, bad: [] }, ctx));
    const cards = [...pt.querySelectorAll('[data-pt-cards] > li[data-pt-card]')];
    assert.deepEqual(cards.map(c => c.dataset.ptCardVerdict), pr.rounds.map(r => r.verdict));
    assert.deepEqual(cards.map(c => c.querySelector('.badge').className), ['badge badge-green', 'badge badge-orange', 'badge badge-red', 'badge badge-green']);
    assert.deepEqual(cards.map(c => c.querySelector('.badge').textContent), pr.rounds.map(r => ctx.t('pt_verdict_' + r.verdict)));
    assert.deepEqual(cards.map(c => c.querySelector('.lb-score-value').textContent), pr.rounds.map(r => scoreText(r.score)));
    assert.deepEqual(cards.slice(0, 3).map(c => c.querySelector('.lb-score-value').textContent), ['0.80', '2.40', '-3.60']);
    assert.deepEqual(cards.map(c => c.querySelector('.lb-score-name').textContent), ['z', 'z', 'z', ctx.t('pt_score_En')]);
    assert.deepEqual(['satisfactory', 'questionable', 'unsatisfactory'].map(k => pt.querySelector(`[data-pt-count="${k}"] .lb-kpi-value`).textContent), ['2', '1', '1']);
    assert.equal(pt.querySelectorAll('[data-pt-round]').length, 4);          // hisobot jadvali o'zgarmagan
    assert.equal(pt.querySelectorAll('img').length, 0);                     // escape
    assert.ok(pt.querySelector('.lb-report [data-pt-chart="z"]'));
    assert.deepEqual([...pt.querySelectorAll('[data-pt-chart="z"] [data-pt-flag]')].map(e => e.dataset.ptFlag), ['questionable', 'unsatisfactory']);
    // natija yo'q / xato — kartalar chizilmaydi
    assert.equal(frag(QV.ptHTML({ list: [SERIES], selected: 'pt:1', series: { ...SERIES, rounds: [] }, entry: {}, result: null, history: [], canAdmin: true }, ctx)).querySelector('[data-pt-cards]'), null);

    const vl = frag(QV.validationHTML({ list: [SET], selected: 'val:1', set: SET, form: QM.formOf({ type: 'grubbs' }), editing: null, result: vr, history: [], canAdmin: true, comments: {}, draft: {}, bad: [] }, ctx));
    const vc = [...vl.querySelectorAll('[data-vl-cards] > li[data-vl-card]')];
    assert.deepEqual(vc.map(c => [c.dataset.vlCard, c.dataset.vlCardState]), [['T1', 'flagged'], ['T2', 'done'], ['T3', 'done'], ['T4', 'error']]);
    assert.ok(vc[0].textContent.includes(ctx.t('vl_flagged')));
    assert.ok(vc[0].textContent.includes(String(Number(vr.tests[0].G.toPrecision(4)))));
    assert.ok(vc[2].querySelector('[data-vl-card-unverified]'));             // LOD/LOQ — unverified belgisi kartada ham
    assert.equal(vc[1].querySelector('[data-vl-card-unverified]'), null);
    assert.equal(vc[3].querySelector('.badge-red').textContent, ctx.t('vl_err_' + vr.tests[3].error));
    assert.equal(vl.querySelectorAll('div.vl-test').length, 4);
    assert.ok(vl.querySelector('.table-scroll > [data-vl-tests]'));
  }
  assert.deepEqual([...missing], []);
});

/* ── CSP va dizayn tizimi ── */
test('yaratilgan HTML da style atributi, inline handler va skript yo\'q (CSP: unsafe-inline siz ishlaydi)', () => {
  const ctx = ctxOf('uz');
  const today = '2026-11-18';
  const list = [std('a', '2027-11-01'), std('b', '2026-12-01'), std('c', '2026-11-01')].map(s => ({ ...s, status: M.standardStatus(s, today, 30) }));
  const big = chartOf([100.4, 99.1, 101.2, 98.7, 100.9, 102.3, 102.6, 102.8, 103.1, 99.5, 104.6, 95.2, 100.3, 101.1, 104.4, 104.9, 107.1]);
  const html = [
    V.tabsHTML('qc', ctx), V.roleNoticeHTML({ readOnly: true }, ctx), V.standardsListHTML({ standards: list, readOnly: false, selected: 'a' }, ctx),
    V.standardFormHTML({ draft: M.draftOf(list[0]), readOnly: false, isNew: false, analysis: null, history: [{ at: '2026-11-18T10:00:00.000Z', actor: 'admin', action: 'create', after: { version: 1 }, reason: 'x' }] }, ctx),
    V.qcHTML(qcModel(big), ctx), V.qcHTML(qcModel(chartOf([100, 103, 103, 103, 103]), { gate: false }), ctx), V.qcHTML(qcModel(chartOf([])), ctx),
    V.qcHTML(qcModel(chartOf([[10, 12], [11, 11], [9, 10]].map(v => v[0]), { type: 'imr', target: null })), ctx),
    V.cmcHTML({ rows: [{ quantity: 'Harorat', min: 0, max: 100, unit: '°C', type: 'abs', value: 1 }], badRows: [], version: 1, readOnly: false, quantities: [], probe: {} }, ctx),
    QV.ptHTML({ list: [SERIES], selected: 'pt:1', series: SERIES, entry: {}, result: QM.analysePT(SERIES), history: [], canAdmin: true, bad: [] }, ctx),
    QV.validationHTML({ list: [SET], selected: 'val:1', set: SET, form: QM.formOf({ type: 'lod' }), editing: null, result: QM.analyseValidation(SET), history: [], canAdmin: true, comments: {}, draft: {}, bad: [] }, ctx),
  ].join('\n');
  assert.ok(!/\sstyle\s*=/i.test(html), 'style atributi');
  assert.ok(!/<style[\s>]/i.test(html), '<style>');
  assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(html), 'inline handler');
  assert.ok(!/<script/i.test(html), 'skript');
  const f = frag(html);
  // har bir grafik: role="img" + aria-label; jadvallar — gorizontal aylanadigan o'ramda
  for (const svg of f.querySelectorAll('svg.qc-chart')) assert.ok(svg.getAttribute('role') === 'img' && svg.getAttribute('aria-label'), 'svg nomi');
  for (const tb of f.querySelectorAll('table.data-table')) assert.ok(tb.closest('.table-scroll, .lb-report'), 'jadval o\'rami: ' + [...tb.attributes].map(a => a.name).join(' '));
  for (const b of f.querySelectorAll('button')) assert.equal(b.getAttribute('type'), 'button');
});

test('lab2.css: faqat tokenlar — rang literali, gradient, soya yo\'q; ikkala mavzuda mavjud tokenlar; zonalar turli rangda', () => {
  const css = read('src/css/lab2.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(css.length > 2000, 'lab2.css bo\'sh emas');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css), 'hex rang');
  assert.ok(!/\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color-mix)\s*\(/i.test(css), 'rang funksiyasi');
  assert.ok(!/gradient\s*\(/i.test(css), 'gradient');
  assert.ok(!/box-shadow|text-shadow|drop-shadow/i.test(css), 'soya');
  assert.ok(!/border-(left|inline-start)(-color|-width)?\s*:/i.test(css), 'chap chetida rangli chiziq');
  const NAMED = /:\s*(?:[^;{}]*\s)?(red|green|blue|orange|yellow|white|black|gray|grey|purple|pink|brown|cyan|magenta)\s*[;}]/i;
  assert.ok(!NAMED.test(css), 'nomli rang');
  const tokens = read('src/css/tokens.css');
  const block = name => tokens.slice(tokens.indexOf(`[data-theme="${name}"]`)).split('}')[0];
  const root = tokens.slice(tokens.indexOf(':root {')).split('}')[0];
  const used = [...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]))];
  assert.ok(used.length >= 15);
  for (const v of used) {
    const inRoot = root.includes(v + ':'), themed = block('dark').includes(v + ':') && block('light').includes(v + ':');
    assert.ok(inRoot || themed, `${v}: tokens.css da (ikkala mavzuda) yo'q`);
  }
  const fillOf = cls => (css.match(new RegExp(`\\.qc-chart \\.${cls}[^{]*\\{\\s*fill:\\s*var\\((--[\\w-]+)\\)`)) || [])[1];
  const zones = ['qc-z1', 'qc-z2', 'qc-z3'].map(fillOf);
  assert.deepEqual(zones, ['--c-green-soft', '--c-amber-soft', '--c-red-soft']);
  for (const theme of ['dark', 'light']) {
    const val = v => (block(theme).match(new RegExp(v + ':\\s*([^;]+);')) || [])[1];
    assert.equal(new Set(zones.map(val)).size, 3, theme + ': zonalar farqlanadi');
  }
});
