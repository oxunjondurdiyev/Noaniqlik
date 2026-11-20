/* P16: Hisobot — A4 ko'rinishi va bosma CSS (src/css/print.css), har sahifada takrorlanadigan pastki qism
   (ramka jadvalining <tfoot> i — src/report/forms.js), "Hisobot" yorlig'i (src/js/report.js; jsdom). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const { createSections } = require('../../src/report/sections.js');
const FM = require('../../src/report/forms.js');
const FT = require('../../src/report/footer.js');
const { roundResult, roundHalfAway, roundUpAway } = require('../../src/report/rounding.js');
const { fmt, fmtSci } = require('../../src/report/format.js');
const { escHtml } = require('../../src/ui/escape.js');
const { reportBridge } = require('../ui/lib.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const strip = css => css.replace(/\/\*[\s\S]*?\*\//g, '');
const I18N = ['i18n.js', 'i18n-ext.js', 'i18n-engine.js', 'i18n-templates.js', 'i18n-regression.js', 'i18n-topdown.js', 'i18n-special.js', 'i18n-linter.js', 'i18n-io.js', 'i18n-report.js', 'i18n-lab.js', 'i18n-pt.js', 'i18n-shell.js'].map(f => 'src/js/' + f);
const caseSpec = id => require(`../cases/excel/${id}.json`).modelSpec;
const frag = html => new JSDOM('<!doctype html><body><div id="r">' + html + '</div></body>').window.document.getElementById('r');

test('print.css: A4, oq qog\'oz, fon to\'ri va soya yo\'q, jadval sarlavhasi takrorlanadi; matn ≥ 11 pt, jadval ≥ 10 pt, pastki qism ≥ 9 pt', () => {
  const css = strip(read('src/css/print.css'));
  assert.match(css, /@page\s*\{\s*size:\s*A4;/);
  const print = css.slice(css.indexOf('@media print'));
  assert.match(print, /background-image:\s*none\s*!important/);
  assert.match(print, /box-shadow:\s*none\s*!important/);
  assert.match(css, /\.report-doc \.print-table thead\s*\{\s*display:\s*table-header-group;/);
  assert.match(css, /\.report-doc \.report-frame-foot\s*\{\s*display:\s*table-footer-group;/);
  assert.match(css, /\.report-doc \.print-table tr\s*\{\s*break-inside:\s*avoid;/);
  // shrift o'lchamlari (egasi qarori 2026-11-20, R-29 #7): asosiy matn ≥ 11 pt, jadvallar ≥ 10 pt, pastki qism ≥ 9 pt
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*font-size:\s*([\d.]+)pt[^{}]*)\}/g)].map(m => ({ sel: m[1].trim(), pt: Number(m[3]) }));
  assert.ok(rules.length >= 8);
  for (const r of rules) {
    const min = /report-foot/.test(r.sel) ? 9 : /print-table/.test(r.sel) ? 10 : 11;
    assert.ok(r.pt >= min, `${r.sel}: ${r.pt} pt < ${min} pt`);
  }
  assert.equal(rules.find(r => r.sel === '.report-doc').pt, 11);
  assert.ok(!/font-size:\s*[\d.]+(px|rem|em)/.test(css.slice(css.indexOf('.report-doc {'))), 'hujjat ichida faqat pt');
  // qog'oz ranglari — tokens.css dan (yagona joy)
  assert.deepEqual(css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) || [], []);
  for (const k of ['--paper-bg', '--paper-ink', '--paper-rule']) assert.ok(read('src/css/tokens.css').includes(k + ':'), k);
  // shell.css bosmada qobiqni yashiradi
  assert.match(strip(read('src/css/shell.css')), /@media print\s*\{[^}]*background-image:\s*none;[\s\S]*\.topbar, \.side-nav, \.bottom-nav, \.fab, \.stepper, \.cmdk\s*\{\s*display:\s*none\s*!important/);
});

test('buildReport: pastki qism (ENGINE, build, xesh, QR) ramkaning takrorlanadigan qismida — har sahifada takrorlanadi', () => {
  const dict = (() => { const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' }); return dom.window.eval(I18N.map(read).join('\n;\n') + '\n;TRANSLATIONS'); })();
  const env = { t: k => (dict.uz[k] !== undefined ? dict.uz[k] : k), esc: escHtml };
  const S = createSections({ ...env, acceptances: () => ({}), canAccept: () => false, lab: () => null });
  const spec = caseSpec('excel-gas-p2');
  const r = E.evaluate(spec);
  const base = { form: 'calibration_certificate', lang: 'uz', env, sections: S, requisites: {}, mode: 'GUM', result: r, snapshot: spec.state };
  const model = FT.footerModel({ engineVersion: E.ENGINE_VERSION, build: null, template: null, meta: { id: 'calc-test', createdAt: '2026-11-20T00:00:00Z' }, hash: 'a'.repeat(64) });
  const withFoot = frag(FM.buildReport({ ...base, footer: { model, qr: '<svg class="report-qr"></svg>' } }));
  const frame = withFoot.querySelector('.report-frame');
  assert.equal(frame.tagName, 'TABLE', 'haqiqiy jadval: brauzer faqat uning <tfoot> ini har sahifada takrorlaydi');
  assert.equal(frame.getAttribute('role'), 'presentation');
  const foot = frame.querySelector(':scope > .report-frame-foot [data-report-footer]');
  assert.ok(foot, 'pastki qism takrorlanadigan qismda');
  for (const k of ['app', 'build', 'calc', 'hash']) assert.ok(foot.querySelector(`[data-report-foot="${k}"]`), k);
  assert.ok(foot.textContent.includes(E.ENGINE_VERSION) && foot.textContent.includes('a'.repeat(64)));
  assert.ok(foot.querySelector('.report-qr'));
  assert.equal(withFoot.querySelectorAll('[data-report-footer]').length, 1);
  assert.ok(frame.querySelector(':scope > .report-frame-body [data-report-body="GUM"]'));
  assert.equal(frame.querySelector(':scope > .report-frame-body [data-report-footer]'), null);
  // pastki qismsiz (xesh hisoblanguncha) — tfoot yo'q
  assert.equal(frag(FM.buildReport(base)).querySelector('.report-frame-foot'), null);
  // 4 shakl
  assert.equal(FM.REPORT_FORMS.length, 4);
  for (const f of FM.REPORT_FORMS) assert.equal(frag(FM.buildReport({ ...base, form: f })).querySelector('.report-frame').dataset.reportFrame, f);
});

function setup() {
  const dom = new JSDOM('<!doctype html><body><button id="btn-print"></button><div class="tab-panel active" id="tab-report"><div id="report-root"></div></div><div id="results-content"></div><div id="print-report"></div></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N.map(read).join('\n;\n'));
  w.Calc = { roundResult, roundHalfAway, roundUpAway, fmt, fmtSci, monteCarlo: E.monteCarlo, multiPointCoverage: E.multiPointCoverage, ENGINE_VERSION: E.ENGINE_VERSION, evaluate: E.evaluate, ...reportBridge };
  w.showToast = () => {};
  let form = FM.DEFAULT_FORM;
  w.UCReport = { options: () => ({ form, requisites: {} }), setForm: f => { form = f; }, buildInfo: async () => null };
  w.eval(read('src/js/state.js'));
  w.eval(read('src/js/points.js'));
  let printed = 0, tabs = [];
  w.print = () => { printed++; };
  w.switchTab = t => { tabs.push(t); };
  w.eval(read('src/js/report.js'));
  const spec = caseSpec('excel-gas-p2');
  w.eval('appState.set(' + JSON.stringify({ ...spec.state, combined: null, points: [] }) + ')');
  w.eval('Results.init()');
  w.eval('appState.set({ combined: ' + JSON.stringify(E.evaluate(spec)) + ' })');
  return { w, doc: w.document, printed: () => printed, tabs, form: () => form };
}

test('"Hisobot" yorlig\'i: A4 qog\'oz ko\'rinishi (har doim yorug\'), 4 shaklli almashtirgich, "PDF" va "Chop etish" — bitta quruvchidan', async () => {
  const { w, doc, printed, tabs, form } = setup();
  // yuqori paneldagi "Hisobot" endi avval ko'rinishni ochadi (chop etish oynasini emas)
  doc.getElementById('btn-print').click();
  assert.deepEqual(tabs, ['report']);
  assert.equal(printed(), 0);
  await w.Results.renderReportTab();
  const paper = doc.getElementById('report-preview');
  assert.ok(paper.classList.contains('paper') && paper.classList.contains('report-doc'));
  assert.equal(paper.getAttribute('data-theme'), 'light');
  assert.ok(paper.querySelector('.report-frame [data-report-body="GUM"]'));
  assert.ok(paper.querySelector('.report-frame-foot [data-report-footer]'), 'ko\'rinishda ham pastki qism bor');
  assert.equal(printed(), 0, 'ko\'rinish chop etish oynasini ochmaydi');
  const seg = [...doc.querySelectorAll('#report-root [data-report-pick]')];
  assert.deepEqual(seg.map(b => b.dataset.reportPick), [...FM.REPORT_FORMS]);
  assert.deepEqual(seg.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.reportPick), [FM.DEFAULT_FORM]);
  for (const b of doc.querySelectorAll('#report-root [data-report-print], #report-root [data-report-pick]')) assert.equal(b.tagName, 'BUTTON');
  assert.deepEqual([...doc.querySelectorAll('#report-root [data-report-print]')].map(b => b.dataset.reportPrint), ['pdf', 'print']);
  // ko'rinish va bosma — bir xil HTML (bitta quruvchi)
  const shown = paper.innerHTML;
  await w.Results.printReport();
  assert.equal(printed(), 1);
  const strip2 = h => h.replace(/calc-[a-z0-9-]+/g, 'ID').replace(/[0-9a-f]{64}/g, 'HASH').replace(/<svg class="report-qr"[\s\S]*?<\/svg>/g, 'QR').replace(/data-report-qr="[^"]*"/g, '');
  assert.equal(strip2(doc.getElementById('print-report').innerHTML), strip2(shown));
  assert.equal(doc.getElementById('print-report').getAttribute('data-theme'), 'light');
  // shaklni almashtirish
  seg.find(b => b.dataset.reportPick === 'budget').click();
  assert.equal(form(), 'budget');
  await new Promise(r => setTimeout(r, 30));
  assert.equal(doc.querySelector('#report-preview .report-frame').dataset.reportFrame, 'budget');
  assert.ok(!/\sstyle=/.test(doc.getElementById('report-root').innerHTML.replace(/<svg class="report-qr"[\s\S]*?<\/svg>/g, '')));
});

test('"Hisobot" yorlig\'i: natija yo\'q — bo\'sh holat, tugmalar o\'chirilgan, hujjat o\'ylab topilmaydi', async () => {
  const { w, doc } = setup();
  w.eval('appState.set({ combined: null, points: [] })');
  await w.Results.renderReportTab();
  assert.equal(doc.getElementById('report-preview'), null);
  assert.ok(doc.querySelector('#report-root .empty-state'));
  for (const b of doc.querySelectorAll('#report-root [data-report-print]')) assert.ok(b.disabled);
});
