/* P14: AI yordamchi UI — sof HTML quruvchilar (escape, "AI taklifi" belgisi, "hammasini tasdiqlash" yo'q), AI_DRAFT
   holati (faqat DRAFT ga, izoh bilan; builtin da taqiqlangan; hisobotda "RASMIY EMAS"), AI o'chiq holatda modullar
   yuklanmaydi; R-27 (6): shablon muharriridagi "Kim" — rol ro'yxati. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const V = require('../../src/ui/ai/view.js');
const TV = require('../../src/ui/tpl/view.js');
const I = require('../../src/templates/interpreter.js');
const S = require('../../src/storage/index.js');
const { escHtml } = require('../../src/ui/escape.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
const TR = dom.window.eval(['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-linter.js', 'src/js/i18n-ai.js'].map(read).join('\n;\n') + '\n;TRANSLATIONS');
const ctx = (lang = 'uz') => ({ t: k => TR[lang][k] ?? k, esc: escHtml, lang });
const frag = html => JSDOM.fragment(html);
const XSS = '<img src=x onerror=alert(1)>';
const SCHEMA = JSON.parse(read('schemas/methodology.schema.json'));

test('AI oynasi: har bir matn escape qilinadi; inline handler yo\'q; "AI taklifi" va "rasmiy emas" belgilari bor', () => {
  const pieces = [
    V.menuHTML(ctx()), V.inputHTML('template_draft', ctx()), V.inputHTML('certificate_extract', ctx()),
    V.previewHTML({ fn: 'explain', text: XSS + '</textarea><script>alert(1)</script>', hasImage: true, warnings: [{ category: 'email', count: 2 }], promptId: 'uc-ai/explain', promptVersion: '1.0.0', exchangeId: 'aix:abc-1"><b>' }, ctx()),
    V.errorHTML('ai_response_schema', XSS, ctx()), V.errorHTML(XSS, '', ctx()), V.rejectedHTML([{ path: XSS, code: XSS }, { path: 'a', code: 'mpe_source' }], ctx()),
    V.reviewExplainHTML({ summary: XSS, items: [{ code: 'n_small', text: XSS }], rejected: [] }, false, ctx()),
    V.appendixHTML({ summary: XSS, items: [{ code: 'x', text: XSS }] }, ctx()),
    V.reviewSuggestHTML({ suggestions: [{ input: XSS, name: XSS, kind: 'specification', distribution: 'rect', why: XSS, caution: true }], rejected: [] }, [], ctx()),
    V.reviewTemplateHTML({ template: { id: XSS, model: { formula: XSS } }, numbers: [{ id: 'n1', target: [0, 'halfWidth'], source: XSS, input: XSS, field: 'halfWidth', value: 0.02, quote: XSS, section: XSS }], notes: XSS, rejected: [] }, { numbers: {} }, ctx()),
    V.reviewCertificateHTML({ fields: { certificate: { value: XSS, quote: XSS, page: XSS } }, route: 'accredited', unit: XSS, points: [{ x: 0, correction: -0.012, U: 0.02, k: 2, quote: XSS, page: XSS }], evidenceChecked: false, rejected: [] }, { fields: {}, rows: {} }, [{ id: XSS, name: XSS }], ctx()),
  ];
  for (const html of pieces) {
    const f = frag(html);
    assert.equal(f.querySelector('img, script, b'), null, html.slice(0, 80));
    assert.doesNotMatch(html, /\son[a-z]+\s*=\s*["'][^"']*alert/i);
    assert.equal(/<[^>]+\son(click|error|load)\s*=/i.test(html.replace(/&lt;[^&]*&gt;/g, '')), false);
  }
  assert.ok(frag(pieces[7]).querySelector('[data-ai-unofficial]').textContent.includes('rasmiy emas'));
  assert.ok(frag(pieces[8]).querySelector('[data-ai-appendix] h3').textContent.includes('rasmiy emas'));
  for (const i of [9, 10, 11]) assert.ok(frag(pieces[i]).querySelector('[data-ai-badge]'), 'AI taklifi belgisi');
  assert.ok(frag(pieces[9]).querySelector('[data-ai-caution]'));
  assert.ok(frag(pieces[11]).querySelector('[data-ai-not-verified]'));
  assert.ok(frag(pieces[3]).querySelector('[data-ai-sensitive]').textContent.includes('email — 2'));
  assert.equal(frag(pieces[3]).querySelector('#ai-prompt').value, XSS + '</textarea><script>alert(1)</script>');     // matn — to'liq va o'zgarmagan
  assert.match(frag(pieces[3]).querySelector('[data-ai-link]').getAttribute('href'), /^ai\.html#aix%3Aabc-1/);
  assert.equal(frag(pieces[1]).querySelector('#ai-consent').checked, false);                 // tasdiq belgisi standart holatda qo'yilmagan
});

test('tasdiqlash: har bir son / maydon alohida; nuqtalarda "qatorni tasdiqlash"; "hammasini tasdiqlash" tugmasi yo\'q (S-5 b)', () => {
  const res = { template: { id: 'AI-1', model: { formula: 'y = x' } }, numbers: [1, 2, 3].map(n => ({ id: 'n' + n, target: [n - 1, 'halfWidth'], source: 's' + n, input: 'x', field: 'halfWidth', value: n / 100, quote: 'q', section: '' })), notes: '', rejected: [] };
  const f = frag(V.reviewTemplateHTML(res, { numbers: { n2: 'confirmed', n3: 'rejected' } }, ctx()));
  assert.deepEqual([...f.querySelectorAll('[data-ai-number]')].map(r => [r.dataset.aiNumber, r.querySelector('[data-ai-state]').dataset.aiState, r.querySelectorAll('button').length]), [['n1', 'pending', 2], ['n2', 'confirmed', 0], ['n3', 'rejected', 0]]);
  const cert = { fields: { certificate: { value: 'KS-1', quote: 'q', page: '1' }, date: { value: '2026-01-15', quote: 'q', page: '1' } }, route: '', unit: '°C', evidenceChecked: true, rejected: [],
    points: [{ x: 0, correction: 0, U: 0.02, k: 2, quote: 'q', page: '' }, { x: 50, correction: 0.01, U: 0.03, k: null, quote: 'q', page: '' }] };
  const c = frag(V.reviewCertificateHTML(cert, { fields: {}, rows: { 1: 'confirmed' } }, [], ctx()));
  assert.equal(c.querySelectorAll('[data-ai="row-ok"]').length, 1);
  assert.equal(c.querySelectorAll('[data-ai="field-ok"]').length, 2);
  assert.equal(c.querySelector('[data-ai-row="1"]').textContent.includes('—'), true);        // k berilmagan — bo'sh (2 emas)
  for (const html of [V.reviewTemplateHTML(res, { numbers: {} }, ctx()), V.reviewCertificateHTML(cert, { fields: {}, rows: {} }, [], ctx())]) {
    assert.equal(frag(html).querySelector('[data-ai*="all"]'), null);
    assert.doesNotMatch(html, /hammasini/i);
  }
  assert.doesNotMatch(read('src/ui/ai/app.js'), /confirm-all|acceptAll|confirmAll/);
});

test('AI_DRAFT: sxemada bor; faqat DRAFT ga, izoh >= 10 belgi bilan; orqaga yo\'l yo\'q; builtin da taqiqlangan; APPROVED ga to\'g\'ridan-to\'g\'ri emas', () => {
  const tpl = { schemaVersion: 'uc-template/1', id: 'AI-t1', version: '0.1.0', status: 'AI_DRAFT', domain: 'TESTING', section: 'general', evaluationMode: 'GUM_BOTTOM_UP',
    title: { uz: 'a', ru: 'a', en: 'a' }, standards: [], labCount: null, ref: 'ai-draft', measurand: { symbol: 'y', name: { uz: 'a', ru: 'a', en: 'a' }, unit: '' },
    model: { formula: 'y = x' }, inputs: [{ symbol: 'x', name: { uz: 'a', ru: 'a', en: 'a' }, unit: '', kind: 'observation' }], typeBSources: [] };
  assert.equal(I.checkTemplate(tpl, SCHEMA).valid, true);
  assert.match(I.checkTemplate(tpl, SCHEMA, { builtin: true }).errors.join(), /AI_DRAFT: not allowed in builtin/);
  assert.deepEqual(['DRAFT', 'REVIEWED', 'APPROVED', 'RETIRED'].map(s => I.canTransition('AI_DRAFT', s)), [true, false, false, false]);
  assert.deepEqual(['DRAFT', 'REVIEWED', 'APPROVED', 'RETIRED'].map(s => I.canTransition(s, 'AI_DRAFT')), [false, false, false, false]);
  assert.equal(I.transition(tpl, 'DRAFT', { by: 'admin', note: 'qisqa' }).error, 'ai_draft_note_required');
  assert.equal(I.transition(tpl, 'DRAFT', { by: 'admin' }).error, 'ai_draft_note_required');
  assert.equal(I.transition(tpl, 'APPROVED', { by: 'admin', note: 'Hammasi tekshirildi' }).error, 'bad_transition');
  const r = I.transition(tpl, 'DRAFT', { by: 'admin', note: 'Metodika bilan solishtirildi', at: '2026-11-20T10:00:00.000Z' });
  assert.deepEqual([r.template.status, r.template.history.at(-1).by, r.template.history.at(-1).note], ['DRAFT', 'admin', 'Metodika bilan solishtirildi']);
  assert.equal(I.checkTemplate(r.template, SCHEMA).valid, true);
  // ichki shablonlarning birortasi ham AI_DRAFT emas
  for (const f of fs.readdirSync(path.join(ROOT, 'templates/builtin')).filter(f => f.endsWith('.json') && f !== 'index.json')) assert.notEqual(JSON.parse(read('templates/builtin/' + f)).status, 'AI_DRAFT', f);
});

test('AI_DRAFT shablon bilan hisobot: "RASMIY EMAS" suv belgisi va banner (uch tilda); boshqa holatlarda yo\'q', () => {
  for (const lang of ['uz', 'ru', 'en']) {
    const f = frag(TV.reportNoticeHTML({ id: 'AI-1', version: '0.1.0', status: 'AI_DRAFT' }, ctx(lang), null));
    assert.equal(f.querySelector('[data-report-watermark][data-ai-draft]').textContent, TR[lang].fnd_unofficial);
    assert.ok(f.querySelector('[data-report-unofficial][data-ai-draft]').textContent.includes('AI_DRAFT'));
    assert.ok(f.querySelector('[data-draft-warning]'));
  }
  for (const status of ['DRAFT', 'REVIEWED', 'APPROVED']) assert.equal(frag(TV.reportNoticeHTML({ id: 'T-1', version: '1.0.0', status }, ctx(), null)).querySelector('[data-report-watermark]'), null);
  assert.ok(frag(TV.statusBadge('AI_DRAFT', ctx())).textContent.includes('AI_DRAFT'));
  // hisobot qatlami (src/report/) dagi belgilash bilan bir xil sinflar
  assert.match(read('src/report/findings.js'), /class="report-watermark" data-report-watermark="1"/);
});

test('R-27 (6): shablon muharriridagi "Kim" — rol ro\'yxati (erkin matn yo\'q); auditga faqat rol yoziladi', () => {
  const f = frag(TV.roleSelectHTML('employee', ctx()));
  const sel = f.querySelector('select#ed-by');
  assert.deepEqual([...sel.options].map(o => o.value), ['admin', 'employee', 'superadmin', 'guest']);
  assert.equal(sel.value, 'employee');
  assert.equal(frag(TV.roleSelectHTML('Karimov Bobur', ctx())).querySelector('select').value, 'guest');
  assert.deepEqual(['admin', 'Karimov B.', '', undefined, '<b>'].map(TV.editorRole), ['admin', 'guest', 'guest', 'guest', 'guest']);
  assert.deepEqual([...TV.EDITOR_ROLES].sort(), [...require('../../src/engine/index.js').REGISTRY_ROLES].sort());   // P11 dagi rollar bilan bir xil
  const app = read('src/ui/tpl/app.js');
  assert.doesNotMatch(app, /<input[^>]*id="ed-by"/);
  assert.doesNotMatch(app, /\(\$\('ed-by'\) \|\| \{\}\)\.value/);
  assert.match(app, /await db\.save\('templates', tpl, \{ actor: edRole\(\), reason, action \}\)/);
  assert.match(app, /return Store\.cleanRole\(View\.editorRole\(/);
  for (const lang of ['uz', 'ru', 'en']) assert.doesNotMatch(TR[lang].ed_by, /login|логин/i);
  assert.equal(S.cleanRole(TV.editorRole('superadmin')), 'superadmin');
});

test('AI o\'chiq (standart): AI modullari statik yuklanmaydi; yagona kirish — ai-boot.js dagi dinamik import; tugmalar yashirin', () => {
  const html = read('index.html');
  const scripts = [...html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(scripts.filter(s => /src\/ai\/|src\/ui\/ai\//.test(s)), []);
  assert.ok(scripts.includes('src/ui/ai-boot.js'));
  for (const b of [...html.matchAll(/<button[^>]*data-ai-open[^>]*>/g)]) assert.match(b[0], /\shidden[\s>]/);
  assert.equal([...html.matchAll(/data-ai-open/g)].length, 2);
  const code = f => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
  const importers = walk('src').filter(f => f.endsWith('.js') && !f.startsWith('src/ai/') && !f.startsWith('src/ui/ai/') && /from\s*['"][^'"]*\/ai\/|import\s*\(\s*['"][^'"]*\/ai\//.test(code(f)));
  assert.deepEqual(importers, ['src/ui/ai-boot.js']);
  const boot = code('src/ui/ai-boot.js');
  assert.doesNotMatch(boot, /^\s*import\s[^(]*['"][^'"]*\/ai\//m);                             // statik import yo'q
  assert.match(boot, /if \(!b \|\| !enabled\) return;\s*const m = await import\('\.\/ai\/app\.js'\);/);
  assert.equal(S.LAB_DEFAULTS.aiEnabled, false);
  // dvigatel AI qatlamini bilmaydi
  assert.deepEqual(walk('src/engine').concat(walk('src/report')).filter(f => f.endsWith('.js') && /\/ai\/|ai-boot|UCAINote/.test(code(f))), []);
});

test('AI o\'chiq / yoqilgan (jsdom): o\'chiq holatda bosish hech narsa yuklamaydi; sozlama hodisasi tugmani ko\'rsatadi', async () => {
  const d = new JSDOM('<!doctype html><body><button data-ai-open="1" hidden>AI</button></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  let imports = 0;
  const src = read('src/ui/ai-boot.js').replace(/^import .*$/m, 'const LocalAdapter = function () { this.open = async () => { throw new Error("no idb"); }; }; const getLabSettings = async () => ({});')
    .replace("await import('./ai/app.js')", '(window.__imports++, { open() { window.__opened = true; } })');
  d.window.__imports = 0;
  d.window.eval('(async () => {' + src + '})()');
  await new Promise(r => setTimeout(r, 20));
  const btn = d.window.document.querySelector('[data-ai-open]');
  assert.equal(btn.hidden, true);
  btn.click();
  await new Promise(r => setTimeout(r, 10));
  assert.equal(d.window.__imports, 0);                                                        // o'chiq — hech narsa yuklanmaydi
  d.window.document.dispatchEvent(new d.window.CustomEvent('uc:lab-settings', { detail: { aiEnabled: true } }));
  assert.equal(btn.hidden, false);
  btn.click();
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual([d.window.__imports, d.window.__opened], [1, true]);
  d.window.document.dispatchEvent(new d.window.CustomEvent('uc:lab-settings', { detail: { aiEnabled: false } }));
  assert.equal(btn.hidden, true);
  void imports;
});
