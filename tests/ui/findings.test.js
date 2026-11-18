/* P05a: "Tekshiruv natijalari" bloki (src/report/findings.js + src/js/report.js) — jsdom.
   • har bir topilmada: nima topildi (manba nomi va raqam), nima uchun (manba bandi), qanday tuzatish — uch tilda;
   • ranglar: error / warning / info sinflari; foydalanuvchi matni escape qilinadi; CSP: inline handler yo'q;
   • barcha topilmalar (qabul qilinganlari izohi bilan) BOSMA hisobotda ham chiqadi va yashirib bo'lmaydi;
   • qabul qilinmagan error → "RASMIY EMAS" suv belgisi; U = 0 / U < CMC → belgi yoki bloklash (laboratoriya sozlamasi);
   • hisobotda: ν qoidasi, MC seed va M, BETA / unverified belgisi; model turi (R-07). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const F = require('../../src/report/findings.js');
const { roundResult, roundHalfAway, roundUpAway } = require('../../src/report/rounding.js');
const { fmt, fmtSci } = require('../../src/report/format.js');
const { reportBridge } = require('./lib.js');
const { escHtml } = require('../../src/ui/escape.js');

const ROOT = path.join(__dirname, '..', '..');
const LANGS = ['uz', 'ru', 'en'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I18N_FILES = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js', 'src/js/i18n-special.js', 'src/js/i18n-linter.js'];

/** report.js ni jsdom'da yuklash; state — appState holati (combined, points, settings …) */
function load(lang, state, opts) {
  const o = opts || {};
  const dom = new JSDOM('<!doctype html><body><button id="btn-print"></button><div id="results-content"></div><div id="print-report"></div></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(read('src/ui/escape.js'));
  w.eval(I18N_FILES.map(read).join('\n;\n'));
  w.i18n.lang = lang;
  w.Calc = { roundResult, roundHalfAway, roundUpAway, fmt, fmtSci, monteCarlo: E.monteCarlo, multiPointCoverage: E.multiPointCoverage, ...reportBridge };
  const st = { points: [], summary: {}, settings: {}, acceptances: {}, ...state };
  w.appState = { get: k => (k ? st[k] : st), set: p => Object.assign(st, p), subscribe() {} };
  w.Points = { summary: (pts, uk) => E.multiPointCoverage(pts.map(p => p.result), uk).map((c, i) => ({ id: pts[i].id, label: pts[i].label, r: pts[i].result, k: c.k, U: c.U, conf: c.conf, rr: roundResult(pts[i].result.y, c.U, pts[i].result.roundUp) })), snapshot: s => s };
  w.toasts = [];
  w.showToast = (m, type) => w.toasts.push({ m, type });
  w.printed = 0;
  w.print = () => { w.printed++; };
  w.switchTab = () => {};
  if (o.lab) w.UCTemplates = { labSettings: () => o.lab, reportNoticeHTML: () => '', evaluateState: s => ({ state: s, result: E.evaluate(s) }) };
  if (o.findingsApi) w.UCFindings = { acceptances: scope => (scope === 'gum' ? st.acceptances : {}), register() {}, canAccept: () => true };
  w.eval(read('src/js/report.js'));
  w.Results.init();
  return w;
}
const frag = (w, html) => { const d = w.document.createElement('div'); d.innerHTML = html; return d; };

const BASE = () => ({
  params: ['X', 'Xref'], n: 5,
  measurements: { X: [10.02, 10.01, 10.03, 10.02, 10.01], Xref: [10] },
  directions: [], model: { formula: 'E = X - Xref', unit: 'V' },
  settings: { paired: false, P: 0.9545, modelKind: 'error', mpe: 0.5 }, covB: {},
  typeB: [
    { name: 'Etalon sertifikati (U, k = 2)', param: 'Xref', halfWidth: 0.004, distribution: 'normal', k: 2 },
    { name: 'Asbob rezolyutsiyasi', param: 'X', halfWidth: 0.01, distribution: 'resol' },
  ],
});
/** X1 (error) + X10 (info) + boshqalar */
const withMpe = name => { const s = BASE(); s.typeB.push({ name: name || 'Asbobning ruxsat etilgan xatosi (MPE)', param: 'X', halfWidth: 0.5, distribution: 'rect' }); return s; };
const ctx = lang => { const w = load(lang, {}); return { t: k => w.i18n.t(k), esc: escHtml }; };

test('blok: har bir topilmada nima topildi (manba nomi va raqam) / nima uchun (manba bandi) / qanday tuzatish — uch tilda', () => {
  const st = withMpe();
  const r = E.evaluate(st);
  const seen = new Set();
  for (const lang of LANGS) {
    const w = load(lang, { ...st, combined: r });
    const d = frag(w, w.Results.findingsHtml(r, { scope: 'gum', spec: st }));
    const block = d.querySelector('[data-findings]');
    assert.equal(block.querySelector('.findings-title').textContent, w.i18n.t('fnd_title'));
    assert.equal(block.dataset.findingsOfficial, '0');
    const x1 = block.querySelector('[data-finding="x1_mpe_in_budget"]');
    assert.ok(x1.classList.contains('finding-error'));
    // nima topildi: kirish, manba nomi va ulush (raqam)
    const what = x1.querySelector('.finding-what').textContent;
    assert.match(what, /^⛔ X1 X: /);
    assert.ok(what.includes('Asbobning ruxsat etilgan xatosi (MPE)'), lang);
    assert.match(what, /\((ulushi|доля|share) (9\d(\.\d+)?|100) %\)/);
    // nima uchun: matn + manba bandi
    const why = x1.querySelector('.finding-why').textContent;
    assert.ok(why.startsWith(w.i18n.t('fnd_why') + ':'), lang);
    assert.ok(why.includes(w.i18n.t('why_x1_mpe_in_budget')), lang);
    assert.match(why, /\[JCGM 100:2008 3\.4\.5, F\.2\.4\.2; ILAC P14:09\/2020 §5\.4 \(unverified\)/);
    // qanday tuzatish
    assert.equal(x1.querySelector('.finding-fix').textContent, `${w.i18n.t('fnd_fix')}: ${w.i18n.t('fix_x1_mpe_in_budget')}`);
    // darajalar: error — warn-box ichida; info — alohida (ko'k)
    assert.ok(block.querySelector('.warn-box [data-finding="x1_mpe_in_budget"]'));
    const info = block.querySelector('[data-finding="x10_no_drift"]');
    assert.ok(info.classList.contains('finding-info') && !info.closest('.warn-box'));
    assert.ok(block.querySelector('[data-findings-count="error"]') && block.querySelector('[data-findings-count="info"]'));
    assert.ok(!/\{[psv]\}|\b(w|why|fix|fnd)_[a-z0-9_]+\b|undefined|NaN/.test(block.textContent), `${lang}: ${block.textContent}`);
    seen.add(what);
  }
  assert.equal(seen.size, 3);                                   // uch tilda uch xil matn
});

test('har bir topilma kodi uchun matn uch tilda: w_<code>, fix_<code>; linterning o\'z qoidalarida why_<code> ham', () => {
  for (const lang of LANGS) {
    const c = ctx(lang);
    for (const [code, meta] of Object.entries(E.FINDING_CODES)) {
      const tx = F.findingText({ code, param: 'P', source: 'S', value: 'V' }, c.t);
      assert.ok(tx.what && tx.what !== code, `${lang}.w_${code}`);
      assert.ok(tx.fix, `${lang}.fix_${code}`);
      if (!/^W\d/.test(meta.rule)) assert.ok(tx.why, `${lang}.why_${code}`);
      assert.ok(!/\{[psv]\}/.test(tx.what + tx.why + tx.fix), `${lang}.${code}`);
    }
  }
});

test('escape va CSP: manba nomi, izoh va qiymat HTML sifatida talqin qilinmaydi; inline handler yo\'q', () => {
  const evil = '<img src=x onerror="window.__xss=1">';
  const st = withMpe(evil + ' ruxsat etilgan xato');
  const r = E.evaluate(st);
  const id = r.findings.find(f => f.code === 'x1_mpe_in_budget').id;
  const w = load('uz', { ...st, combined: r });
  const html = w.Results.findingsHtml(r, { scope: 'gum', spec: st, acceptances: { [id]: { comment: evil + ' — izoh ham xavfsiz', role: 'admin"><b>', at: '2026-11-18T10:00:00Z', value: r.findings.find(f => f.id === id).value } } });
  const d = frag(w, html);
  assert.equal(d.querySelectorAll('img, b, script').length, 0);
  assert.equal(w.__xss, undefined);
  assert.ok(d.querySelector('.finding-what').textContent.includes(evil));
  assert.ok(d.querySelector('.finding-accept-comment').textContent.includes(evil));
  assert.ok(!/\son[a-z]+\s*=\s*["'][^"']*["']/i.test(html.replace(/&[a-z]+;/g, '')));
  for (const f of ['src/report/findings.js', 'src/ui/findings/app.js']) assert.ok(!/onclick=|javascript:/.test(read(f)), f);
});

test('qabul qilish UI: tugma faqat warning / error da; qabul qilingan topilma izohi, roli va sanasi bilan qoladi; bosmada tugma yo\'q', () => {
  const st = withMpe();
  const r = E.evaluate(st);
  const x1 = r.findings.find(f => f.code === 'x1_mpe_in_budget');
  const w = load('uz', { ...st, combined: r }, { findingsApi: true });
  let d = frag(w, w.Results.findingsHtml(r, { scope: 'gum', spec: st }));
  assert.ok(d.querySelector(`[data-finding-accept="${x1.id}"]`));
  assert.ok(d.querySelector(`textarea[data-finding-comment="${x1.id}"]`));
  assert.equal(d.querySelector('[data-finding="x10_no_drift"] [data-finding-accept]'), null);       // info qabul qilinmaydi
  assert.equal(frag(w, w.Results.findingsHtml(r, { scope: 'gum', spec: st, print: true })).querySelector('[data-finding-accept], textarea, button'), null);

  const acc = { [x1.id]: { comment: 'Mijoz talabi bo\'yicha, 12-bayonnoma', role: 'admin', at: '2026-11-18T10:00:00.000Z', value: x1.value } };
  for (const print of [false, true]) {
    d = frag(w, w.Results.findingsHtml(r, { scope: 'gum', spec: st, acceptances: acc, print }));
    const item = d.querySelector('[data-finding="x1_mpe_in_budget"]');
    assert.ok(item, 'qabul qilingan topilma yo\'qolmaydi');
    assert.ok(item.classList.contains('finding-is-accepted'));
    const a = item.querySelector('[data-finding-accepted]');
    assert.match(a.textContent, /Asoslangan holda qabul qilingan/);
    assert.match(a.textContent, /Rol: admin; 2026-11-18/);
    assert.match(a.textContent, /Asos: Mijoz talabi bo'yicha, 12-bayonnoma/);
    assert.equal(d.querySelector('[data-findings]').dataset.findingsOfficial, '1');
    assert.equal(d.querySelector('[data-findings-unofficial]'), null);
    assert.equal(!!item.querySelector('[data-finding-revoke]'), !print);
  }
});

test('bosma hisobot: barcha topilmalar chiqadi; qabul qilinmagan error → "RASMIY EMAS" suv belgisi; qabul qilingach — belgi yo\'q, izoh bor', () => {
  const st = withMpe();
  const r = E.evaluate(st);
  for (const lang of LANGS) {
    const w = load(lang, { ...st, combined: r }, { findingsApi: true });
    w.document.getElementById('btn-print').click();
    assert.equal(w.printed, 1);
    const p = w.document.getElementById('print-report');
    for (const f of r.findings) assert.ok(p.querySelector(`[data-finding-id="${f.id.replace(/"/g, '\\"')}"]`), `${lang}: ${f.id}`);
    assert.equal(p.querySelector('[data-report-watermark]').textContent, w.i18n.t('fnd_unofficial'));
    assert.ok(p.querySelector('[data-report-unofficial]').textContent.startsWith(w.i18n.t('fnd_unofficial')));
    assert.ok(p.querySelector('[data-findings-unofficial]'));
  }
  assert.deepEqual(['uz', 'ru', 'en'].map(l => load(l, {}).i18n.t('fnd_unofficial')), ['RASMIY EMAS', 'НЕОФИЦИАЛЬНО', 'NOT OFFICIAL']);
  const x1 = r.findings.find(f => f.code === 'x1_mpe_in_budget');
  const w = load('uz', { ...st, combined: r, acceptances: { [x1.id]: { comment: 'Etalon vositaning xatosi — nomi tuzatiladi', role: 'employee', at: '2026-11-18T11:00:00Z', value: x1.value } } }, { findingsApi: true });
  w.document.getElementById('btn-print').click();
  const p = w.document.getElementById('print-report');
  assert.equal(p.querySelector('[data-report-watermark]'), null);
  assert.match(p.querySelector('[data-finding="x1_mpe_in_budget"] [data-finding-accepted]').textContent, /Etalon vositaning xatosi — nomi tuzatiladi/);
  assert.equal(p.querySelectorAll('[data-finding-id]').length, r.findings.length);        // hammasi joyida
});

test('topilmalarni yashiradigan parametr yo\'q; bosma CSS blokni yashirmaydi; suv belgisi har sahifada', () => {
  const st = withMpe();
  const r = E.evaluate(st);
  const w = load('uz', { ...st, combined: r });
  for (const o of [{ print: true }, { print: false }, { hide: true }, { findings: false }, { warnings: false }, { hideWarnings: true }, { showEmpty: false }, undefined]) {
    const d = frag(w, w.Results.findingsHtml(r, { scope: 'gum', spec: st, ...(o || {}) }));
    assert.equal(d.querySelectorAll('[data-finding-id]').length, r.findings.length, JSON.stringify(o));
  }
  const c = ctx('uz');
  for (const o of [{ hide: true }, { skipInfo: true }, { onlyErrors: true }, { acceptances: null }]) {
    assert.equal(frag(w, F.findingsBlockHTML(r.findings, { ...c, ...o })).querySelectorAll('[data-finding-id]').length, r.findings.length);
  }
  const css = read('src/css/components.css');
  assert.match(css, /@media print \{[\s\S]*\.findings-block, \.findings-block \.warn-box, \.findings-block \.finding[^{]*\{[^}]*display: block !important; visibility: visible !important/);
  assert.match(css, /@media print \{[\s\S]*\.report-watermark \{ display: block !important; position: fixed;/);
  // blok, topilma, qabul izohi va belgilar uchun hech qayerda display: none yo'q (yashirin forma — .finding-accept-form[hidden] — bundan mustasno)
  assert.ok(!/\.(findings-block|findings-list|finding|finding-accepted|finding-accept-comment|report-critical|report-marks|findings-unofficial)(?![-\w])[^{},]*(,[^{}]*)?\{[^}]*display:\s*none/.test(css));
});

test('ranglar: error — qizil, warning — sariq, info — ko\'k (CSS)', () => {
  const css = read('src/css/components.css');
  assert.match(css, /\.finding-error \{ border-color: #dc2626;/);
  assert.match(css, /\.finding-warning \{ border-color: #d97706;/);
  assert.match(css, /\.finding-info \{ border-color: #2563eb;/);
});

test('R-05: U = 0 va U < CMC — bosma hisobotda aniq belgi (standart); laboratoriya sozlamasi "block" → hisobot chiqmaydi', () => {
  const zero = { ...BASE(), typeB: [], measurements: { X: [10, 10, 10], Xref: [10] } };
  const rz = E.evaluate(zero);
  assert.equal(rz.U, 0);
  let w = load('uz', { ...zero, combined: rz }, { lab: { criticalMode: 'mark', cmcMode: 'warn' } });
  w.document.getElementById('btn-print').click();
  assert.equal(w.printed, 1);
  let p = w.document.getElementById('print-report');
  assert.equal(p.querySelector('[data-report-critical]').dataset.reportCritical, 'zero_u');
  assert.match(p.querySelector('[data-report-critical]').textContent, /U = 0/);
  assert.ok(p.querySelector('.warn-box [data-finding="zero_u"].finding-error'));
  assert.ok(p.querySelector('[data-report-watermark]'));
  // bloklash
  w = load('uz', { ...zero, combined: rz }, { lab: { criticalMode: 'block', cmcMode: 'warn' } });
  w.document.getElementById('btn-print').click();
  assert.equal(w.printed, 0);
  assert.equal(w.toasts[0].m, w.i18n.t('fnd_blocked_zero_u'));
  assert.equal(w.document.getElementById('print-report').innerHTML, '');

  const cmc = { ...BASE(), settings: { ...BASE().settings, cmc: 1 } };
  const rc = E.evaluate(cmc);
  w = load('uz', { ...cmc, combined: rc }, { lab: { criticalMode: 'mark', cmcMode: 'warn' } });
  w.document.getElementById('btn-print').click();
  p = w.document.getElementById('print-report');
  assert.equal(p.querySelector('[data-report-critical]').dataset.reportCritical, 'below_cmc');
  for (const lab of [{ criticalMode: 'block', cmcMode: 'warn' }, { criticalMode: 'mark', cmcMode: 'block' }]) {   // P04 dagi cmcMode ham ishlaydi
    w = load('uz', { ...cmc, combined: rc }, { lab });
    w.document.getElementById('btn-print').click();
    assert.equal(w.printed, 0, JSON.stringify(lab));
    assert.equal(w.toasts[0].m, w.i18n.t('cmc_blocked'));
  }
  // sozlama standart qiymati — belgilash
  assert.equal(require('../../src/storage/index.js').LAB_DEFAULTS.criticalMode, 'mark');
  assert.match(read('src/ui/tpl/app.js'), /id="lab-criticalMode"/);
});

test('hisobot belgilari: ν qoidasi (floor / interpolate), MC seed va M, k = 2, BETA / unverified, dvigatel versiyasi', () => {
  const c = ctx('uz');
  const keys = (r, o) => F.reportMarks(r, { t: c.t, ...(o || {}) }).map(m => m.key);
  const st = BASE();
  const r = E.evaluate(st);
  let marks = F.reportMarks(r, { t: c.t });
  assert.deepEqual(marks.map(m => m.key), ['nu_rule', 'engine']);
  assert.equal(marks[0].text, `${c.t('nu_rule_line')}: ${c.t('nu_rule_floor')}`);
  assert.equal(marks[1].text, `${c.t('rg_engine')}: ${E.ENGINE_VERSION}`);
  const ri = E.evaluate({ ...st, settings: { ...st.settings, nuRule: 'interpolate' } });
  assert.equal(F.reportMarks(ri, { t: c.t })[0].text, `${c.t('nu_rule_line')}: ${c.t('nu_rule_interpolate')}`);
  assert.deepEqual(keys(E.evaluate({ ...st, settings: { ...st.settings, kMethod: 'k2' } })), ['k', 'engine']);
  const mc = E.monteCarlo(st, 20000);
  marks = F.reportMarks(r, { t: c.t, mc });
  assert.equal(marks.find(m => m.key === 'mc').text, `Monte-Karlo: M = 20000, seed = ${E.MC_SEED} (JCGM 101:2008)`);
  assert.ok(keys(E.evaluate({ format: 'uc-micro/1', result: { value: 120, sumCounts: 12 }, technical: { s: 0.1 } })).includes('beta'));
  assert.ok(keys(E.evaluate({ format: 'uc-medical/1', unit: 'mmol/L', levels: [{ id: 'L1', mean: 5, cv: 2, n: 30 }], uCal: { value: 1, relative: true } })).includes('beta'));
  assert.ok(keys(E.evaluate({ format: 'uc-regression/1', method: 'WTLS', points: [[0, 0.1], [1, 1.9], [2, 4.2], [3, 5.8]].map(([x, y]) => ({ x, y, ux: 0.01, uy: 0.05 })) })).includes('unverified'));
  assert.deepEqual(F.reportMarks({ error: 'x' }, { t: c.t }), []);
  // bosma hisobotda va ekranda
  const w = load('uz', { ...st, combined: r });
  w.document.getElementById('btn-print').click();
  const p = w.document.getElementById('print-report');
  assert.match(p.querySelector('[data-report-mark="nu_rule"]').textContent, /ν qoidasi: /);
  assert.ok(p.querySelector('[data-report-mark="engine"]').textContent.endsWith(E.ENGINE_VERSION));
  w.Results.render();
  assert.ok(w.document.querySelector('#results-content [data-report-mark="nu_rule"]'));
  // maxsus rejim (BETA) bosma hisobotida belgi
  const mi = E.evaluate({ format: 'uc-micro/1', result: { value: 120, sumCounts: 12 }, technical: { s: 0.1 } });
  w.Results.printSpecial(mi, {});
  assert.equal(w.document.querySelector('#print-report [data-report-mark="beta"]').textContent, w.i18n.t('mark_beta'));
  assert.ok(w.document.querySelector('#print-report .warn-box [data-finding="micro_unverified"]'));
});

test('R-07: model turi har bir hisobda ko\'rsatiladi; "unknown" da muvofiqlik bayonoti yo\'q va tanlov so\'raladi; eski saqlangan natija ham', () => {
  for (const lang of LANGS) {
    const st = BASE();
    const r = E.evaluate(st);
    let w = load(lang, { ...st, combined: r });
    w.Results.render();
    let el = w.document.getElementById('results-content');
    assert.equal(el.querySelector('[data-model-kind-info]').dataset.modelKindInfo, 'error');
    assert.equal(el.querySelector('[data-model-kind-info]').textContent, `${w.i18n.t('mk_label')}: ${w.i18n.t('mk_error')}`);
    assert.ok(el.querySelector('.badge-green'));                                   // muvofiq
    assert.equal(el.querySelector('[data-conf-pending]'), null);
    assert.equal(el.querySelector('[data-model-kind-chooser]'), null);

    // model turi ko'rsatilmagan
    const su = { ...st, settings: { ...st.settings, modelKind: 'unknown' } };
    const ru = E.evaluate(su);
    w = load(lang, { ...su, combined: ru });
    w.Results.render();
    el = w.document.getElementById('results-content');
    assert.equal(el.querySelector('[data-model-kind-info]').dataset.modelKindInfo, 'unknown');
    assert.equal(el.querySelector('[data-conf-pending]').textContent, '⚠ ' + w.i18n.t('mk_pending'));
    assert.ok(el.querySelector('[data-model-kind-chooser] select[data-model-kind]'));
    assert.equal(el.querySelectorAll('.formula-box .badge-green, .formula-box .badge-red').length, 0);   // hukm yo'q
    assert.ok(el.querySelector('[data-finding="model_kind_unknown"]'));
    w.document.getElementById('btn-print').click();
    const p = w.document.getElementById('print-report');
    assert.ok(p.querySelector('[data-conf-pending]') && p.querySelector('[data-model-kind-info="unknown"]'));
    assert.equal(p.querySelector('[data-model-kind-chooser]'), null);
  }
  // eski saqlangan natija (ENGINE ≤ 2.3.0): modelKind / deviation / findings maydonlari yo'q, conf da eski hukm bor
  const st = { ...BASE(), settings: { paired: false, P: 0.9545, mpe: 0.5 } };
  const old = E.evaluate({ ...st, settings: { ...st.settings, modelKind: 'error' } });
  delete old.modelKind; delete old.deviation; delete old.nominal; delete old.findings;
  assert.equal(old.conf.simple, 'ok');
  const w = load('uz', { ...st, combined: old });
  w.Results.render();
  const el = w.document.getElementById('results-content');
  assert.ok(el.querySelector('[data-conf-pending]'), 'eski natijada |y| xato deb faraz qilinmaydi');
  assert.equal(el.querySelectorAll('.formula-box .badge-green').length, 0);
  assert.ok(el.querySelector('[data-finding="model_kind_unknown"]'));                // linter saqlangan kirish bo'yicha qayta ishladi
  assert.ok(el.querySelector('[data-model-kind-chooser]'));
});

test('R-07: "kattalik qiymati (nominal bilan)" — |Y − nominal| MPE bilan solishtiriladi; ko\'p nuqtali jadvalda tanlanmagan nuqta belgilanadi', () => {
  const val = { params: ['Y'], n: 4, measurements: { Y: [100.4, 100.4, 100.5, 100.3] }, model: { formula: '', unit: 'g' }, directions: [], covB: {},
    settings: { modelKind: 'value', nominal: 100, mpe: 0.5 }, typeB: [{ name: 'Rezolyutsiya', param: 'Y', halfWidth: 0.1, distribution: 'resol' }] };
  const r = E.evaluate(val);
  const w = load('uz', { ...val, combined: r });
  w.Results.render();
  const el = w.document.getElementById('results-content');
  assert.match(el.querySelector('[data-model-kind-info]').textContent, /kattalik qiymati Y \(nominal bilan\); Nominal qiymat = 100/);
  assert.ok([...el.querySelectorAll('.formula-box')].some(b => b.textContent.includes('|Y − 100| ≤ MPE')));
  assert.ok(el.querySelector('.formula-box .badge-green'));
  // ko'p nuqtali: bitta nuqta model turi bilan, ikkinchisi — eski (tanlanmagan)
  const good = E.evaluate(BASE());
  const legacy = JSON.parse(JSON.stringify(good)); delete legacy.modelKind; delete legacy.deviation;
  const pts = [{ id: 'a', label: 'P1', snapshot: BASE(), result: good }, { id: 'b', label: 'P2', snapshot: BASE(), result: legacy }];
  const w2 = load('uz', { ...BASE(), combined: good, points: pts });
  w2.document.getElementById('btn-print').click();
  const rows = w2.document.querySelectorAll('#print-report .print-table')[0].querySelectorAll('tbody tr');
  assert.match(rows[0].lastElementChild.textContent, /Muvofiq/i);
  assert.equal(rows[1].lastElementChild.textContent, w2.i18n.t('mk_pending_short'));
});

test('ko\'p nuqtali bosma hisobot: har bir nuqtaning topilmalari va o\'z qabul izohlari; bitta nuqtada qabul qilinmagan error → suv belgisi', () => {
  const bad = withMpe();
  const rb = E.evaluate(bad), rg = E.evaluate(BASE());
  const x1 = rb.findings.find(f => f.code === 'x1_mpe_in_budget');
  const acc = { [x1.id]: { comment: 'Shu nuqta uchun asoslangan qabul', role: 'admin', at: '2026-11-18T10:00:00Z', value: x1.value } };
  const mk = accB => [{ id: 'a', label: 'P1', snapshot: BASE(), result: rg, acceptances: {} }, { id: 'b', label: 'P2', snapshot: bad, result: rb, acceptances: accB }];
  let w = load('uz', { ...BASE(), combined: rg, points: mk({}) });
  w.document.getElementById('btn-print').click();
  let p = w.document.getElementById('print-report');
  assert.ok(p.querySelector('[data-report-watermark]'));
  assert.equal(p.querySelectorAll('[data-findings]').length, 2);
  assert.equal(p.querySelectorAll('[data-finding="x1_mpe_in_budget"]').length, 1);
  w = load('uz', { ...BASE(), combined: rg, points: mk(acc) });
  w.document.getElementById('btn-print').click();
  p = w.document.getElementById('print-report');
  assert.equal(p.querySelector('[data-report-watermark]'), null);
  assert.match(p.querySelector('[data-finding="x1_mpe_in_budget"] [data-finding-accepted]').textContent, /Shu nuqta uchun asoslangan qabul/);
});

test('topilma yo\'q bo\'lsa ham blok ko\'rinadi (tekshiruv bajarilgani ma\'lum); P08–P10 bo\'limlarida eski data-atributlar saqlangan', () => {
  const st = { params: ['X'], n: 10, measurements: { X: [10.02, 10.01, 10.03, 10.02, 10.01, 10.02, 10.03, 10.02, 10.01, 10.02] }, model: { formula: '' }, directions: [], covB: {},
    settings: { modelKind: 'value' }, typeB: [{ name: 'Rezolyutsiya', param: 'X', halfWidth: 0.01, distribution: 'resol' }, { name: 'Harorat ta\'siri', param: 'X', halfWidth: 0.01, distribution: 'rect' }] };
  const r = E.evaluate(st);
  assert.deepEqual(r.findings, []);
  const w = load('uz', { ...st, combined: r });
  w.Results.render();
  const b = w.document.querySelector('#results-content [data-findings]');
  assert.equal(b.querySelector('.findings-empty').textContent, w.i18n.t('fnd_none'));
  assert.equal(b.dataset.findingsOfficial, '1');
  const td = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: { relative: true }, rw: { components: [{ type: 'stated', s: 2, n: 30, relative: true }] },
    bias: { type: 'crm', relative: true, items: [{ bias: 3, sBias: 2, n: 10, uRef: 1 }] }, additional: [{ id: 'rep', name: 'Repeat', category: 'repeatability', u: 1, relative: true }] });
  const d = frag(w, w.Results.topdownSection(td));
  const x11 = d.querySelector('[data-findings-scope="topdown"] .warn-box[data-td-warnings] [data-td-warning="x11_double_counting"]');
  assert.ok(x11.classList.contains('finding-warning'));
  assert.match(x11.querySelector('.finding-what').textContent, /^⚠ X11 /);
  assert.equal(x11.querySelector('.finding-fix').textContent, `${w.i18n.t('fnd_fix')}: ${w.i18n.t('fix_x11_double_counting')}`);
});
