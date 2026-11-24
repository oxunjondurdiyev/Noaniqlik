/* i18n: har bir matn kaliti uch tilda (uz/ru/en) bo'lishi shart (CLAUDE.md).
   Lug'at fayllari (I18N_FILES — yagona ro'yxat, yuklanish tartibida) jsdom'da yuklanadi.
   P05 (RISKS R-13): qattiq yozilgan matn skaneri — tests/tools/hardcoded-text.js (shu fayl oxiridagi testlar). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const LANGS = ['uz', 'ru', 'en'];

// Lug'at fayllari — YAGONA ro'yxat, yuklanish tartibida (index.html dagi <script> tartibi bilan bir xil).
// Yangi lug'at fayli qo'shilsa — faqat shu yerga yoziladi.
const I18N_FILES = [
  'src/js/i18n.js',
  'src/js/i18n-ext.js',
  'src/js/i18n-engine.js',
  'src/js/i18n-templates.js',
  'src/js/i18n-regression.js',
  'src/js/i18n-topdown.js',
  'src/js/i18n-special.js',
  'src/js/i18n-linter.js',
  'src/js/i18n-io.js',
  'src/js/i18n-report.js',
  'src/js/i18n-admin.js',
  'src/js/i18n-lab.js',
  'src/js/i18n-pt.js',
  'src/js/i18n-build.js',
  'src/js/i18n-ai.js',
  'src/js/i18n-shell.js',
  'src/js/i18n-vizlab.js',
  'src/js/i18n-p20.js',
  'src/js/i18n-access.js', // kirish rejimi (ochiq test rejimi belgisi; 2026-11-24)
  'src/js/i18n-legal.js',   // faqat privacy.html / terms.html da yuklanadi (P20)
];

// Berilgan fayllar bitta skript sifatida yuklanadi (top-level const TRANSLATIONS umumiy bo'lishi uchun)
function evalTranslations(files) {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const src = files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
  return dom.window.eval(src + '\n;TRANSLATIONS');
}

function loadTranslations() { return evalTranslations(I18N_FILES); }

// `file` dan OLDIN yuklanadigan fayllar lug'ati ("oldingi kalitlarni bosib ketmaydi" testlari uchun)
function translationsBefore(file) {
  const i = I18N_FILES.indexOf(file);
  assert.ok(i > 0, `${file} I18N_FILES da yo'q`);
  return evalTranslations(I18N_FILES.slice(0, i));
}

// Fayldagi kalitlar (6 probel bilan boshlangan `kalit:` satrlari — lug'at fayllarining umumiy formati)
function keysOf(file) {
  return [...fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(/^\s{6}([a-zA-Z0-9_]+):/gm)].map(m => m[1]);
}

const T = loadTranslations();

test('uch til mavjud: uz, ru, en', () => {
  for (const l of LANGS) assert.ok(T[l] && typeof T[l] === 'object', l);
});

test('har bir kalit uch tilda ham bor', () => {
  const all = new Set(LANGS.flatMap(l => Object.keys(T[l])));
  const missing = [];
  for (const k of all) for (const l of LANGS) if (!(k in T[l])) missing.push(`${l}.${k}`);
  assert.deepEqual(missing, []);
});

test('tarjimalar satr; bo\'sh bo\'lsa — uchala tilda ham bo\'sh (ataylab)', () => {
  const bad = [];
  const keys = new Set(LANGS.flatMap(l => Object.keys(T[l])));
  for (const k of keys) {
    const vals = LANGS.map(l => T[l][k]);
    if (vals.some(v => typeof v !== 'string')) { bad.push(`${k}: satr emas`); continue; }
    const empty = vals.map(v => !v.trim());
    if (empty.some(Boolean) && !empty.every(Boolean)) bad.push(`${k}: faqat ba'zi tillarda bo'sh`);
  }
  assert.deepEqual(bad, []);
});

test('HTML dagi data-i18n* kalitlari lug\'atda bor', () => {
  const missing = [];
  for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of html.matchAll(/data-i18n(?:-ph|-label|-title|-aria|-alt)?="([^"]+)"/g)) {
      for (const l of LANGS) if (!(m[1] in T[l])) missing.push(`${f}: ${l}.${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

// P20 (audit 21.11.2026, UX-05): yo'qolgan kalit / qiymat atributga "null" yoki "undefined" bo'lib chiqmasligi kerak
test('hech bir HTML atributida "null" / "undefined" matni yo\'q (statik sahifalar); tarjimalarda ham', () => {
  const bad = [];
  for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of html.matchAll(/\s([a-zA-Z:-]+)="(null|undefined)"/g)) bad.push(`${f}: ${m[1]}="${m[2]}"`);
  }
  for (const l of LANGS) for (const [k, v] of Object.entries(T[l])) if (v === 'null' || v === 'undefined') bad.push(`${l}.${k}`);
  assert.deepEqual(bad, []);
});

test('o\'lchash jadvali (src/js/table.js): preset tanlanmagan bo\'lsa ham .meas-input placeholder "null" emas — bo\'sh', () => {
  const E = require('../src/engine/index.js');
  const dom = new JSDOM(`<!doctype html><body>
    <select id="sidebar-preset"><option value=""></option><option value="density"></option></select><select id="inp-preset"><option value=""></option></select>
    <button id="btn-fill-sample"></button><button id="btn-clear-data"></button><button id="btn-calc-typea"></button>
    <div id="model-box"></div><div id="table-hint-box"></div>
    <table><thead id="table-head"></thead><tbody id="table-body"></tbody><tfoot id="table-foot"></tfoot></table>
    <div id="type-a-summary"></div></body>`, { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(fs.readFileSync(path.join(ROOT, 'src/ui/escape.js'), 'utf8'));
  w.eval(I18N_FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n'));
  w.eval(fs.readFileSync(path.join(ROOT, 'src/js/state.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(ROOT, 'src/data/presets.js'), 'utf8') + '\n;window.PRESETS = PRESETS;');
  w.Calc = { ...E, fmt: v => String(v), fmtSci: v => String(v) };
  w.showToast = () => {}; w.switchTab = () => {};
  w.eval(fs.readFileSync(path.join(ROOT, 'src/js/table.js'), 'utf8'));
  const check = label => {
    const inputs = [...w.document.querySelectorAll('.meas-input')];
    assert.ok(inputs.length > 0, label);
    for (const el of w.document.querySelectorAll('*')) for (const a of el.attributes) assert.ok(a.value !== 'null' && a.value !== 'undefined', `${label}: <${el.tagName.toLowerCase()} ${a.name}="${a.value}">`);
    return inputs;
  };
  // preset yo'q (qo'lda kiritilgan model)
  w.appState.set({ n: 3, params: ['a', 'b'], measurements: { a: ['', '', ''], b: ['', '', ''] }, model: { formula: 'a + b', unit: '' }, settings: { paired: true, P: 0.9545 } });
  w.Table.init();
  w.Table.render();
  for (const el of check('preset yo\'q')) assert.equal(el.getAttribute('placeholder'), '');
  // preset bor: namuna qiymati matn sifatida ('100.00' — oxirgi nollar bilan)
  w.document.getElementById('sidebar-preset').value = 'density';
  w.appState.set({ n: 5, params: ['m', 'V'], measurements: { m: Array(5).fill(''), V: Array(5).fill('') }, model: { formula: 'ρ = m / V', unit: 'g/cm³' } });
  w.Table.render();
  const ph = check('density').filter(el => el.dataset.param === 'V').map(el => el.getAttribute('placeholder'));
  if (ph.some(Boolean)) assert.deepEqual(ph, ['100.02', '100.06', '99.98', '100.04', '100.00']);
});

test('JS dagi i18n.t(\'…\') literal kalitlari lug\'atda bor', () => {
  const missing = [];
  const dir = path.join(ROOT, 'src/js');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/i18n\.t\('([a-z0-9_]+)'\)/g)) {
      for (const l of LANGS) if (!(m[1] in T[l])) missing.push(`${f}: ${l}.${m[1]}`);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test('P03: dvigatelning har bir ogohlantirish / eslatma kodi uchun uch tilda matn bor (w_*, n_*)', () => {
  const dir = path.join(ROOT, 'src/engine');
  const src = fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const warn = new Set([...src.matchAll(/warnings\.push\(\{ code: '([a-z0-9_]+)'/g)].map(m => m[1]));
  for (const m of src.matchAll(/out\.warnings\.push\('([a-z0-9_]+)'\)/g)) warn.add(m[1]);
  for (const m of src.matchAll(/code: '(unit_[a-z_]+)', severity: 'warning'/g)) warn.add(m[1]);
  const notes = new Set([...src.matchAll(/notes\.push\(\{ code: '([a-z0-9_]+)'/g)].map(m => m[1]));
  assert.ok(warn.size >= 15 && notes.size >= 2, `${warn.size} / ${notes.size}`);
  const missing = [];
  for (const l of LANGS) {
    for (const c of warn) if (!T[l]['w_' + c]) missing.push(`${l}.w_${c}`);
    for (const c of notes) if (!T[l]['n_' + c]) missing.push(`${l}.n_${c}`);
  }
  assert.deepEqual(missing, []);
});

test('P03: dvigatel xato kodlari UI xabarlariga ulangan (typeB.js) va uch tilda bor', () => {
  const ui = fs.readFileSync(path.join(ROOT, 'src/js/typeB.js'), 'utf8');
  for (const code of ['negative_variance', 'bad_correlation', 'unit_mismatch', 'unit_fn_arg', 'multi_output', 'bad_spec']) {
    assert.match(ui, new RegExp(`${code}:\\s+i18n\\.t\\('err_${code}'\\)`), code);
    for (const l of LANGS) assert.ok(T[l]['err_' + code], `${l}.err_${code}`);
  }
});

test('P04: i18n-templates.js oldingi fayllardagi kalitlarni bosib ketmaydi', () => {
  const base = translationsBefore('src/js/i18n-templates.js');
  const mine = [...fs.readFileSync(path.join(ROOT, 'src/js/i18n-templates.js'), 'utf8').matchAll(/^\s{6}([a-z0-9_]+):/gm)].map(m => m[1]);
  assert.ok(mine.length > 50);
  assert.deepEqual([...new Set(mine.filter(k => k in base.en))], []);
});

test('P04: src/ui/tpl dagi t(\'…\') kalitlari va dinamik kalit oilalari lug\'atda bor', () => {
  const missing = [];
  const dir = path.join(ROOT, 'src/ui/tpl');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/\bt\('([a-z0-9_]+)'\)/g)) for (const l of LANGS) if (!(m[1] in T[l])) missing.push(`${f}: ${l}.${m[1]}`);
  }
  const fam = [
    ...['DRAFT', 'REVIEWED', 'APPROVED', 'RETIRED'].flatMap(s => ['tpl_status_' + s, 'tpl_banner_' + s, 'ed_to_' + s]),
    ...['construction', 'food_chem', 'electrical', 'calibration', 'general'].map(s => 'tpl_sec_' + s),
    ...['observation', 'halfWidth', 'k', 'constant', 'correlation'].map(s => 'tpl_missing_' + s),
    'w_unit_affine', 'w_unit_output', 'w_unit_pow',
  ];
  for (const k of fam) for (const l of LANGS) if (!(k in T[l])) missing.push(`${l}.${k}`);
  assert.deepEqual([...new Set(missing)], []);
});

test('P08: i18n-regression.js oldingi fayllardagi kalitlarni bosib ketmaydi', () => {
  const base = translationsBefore('src/js/i18n-regression.js');
  const mine = [...fs.readFileSync(path.join(ROOT, 'src/js/i18n-regression.js'), 'utf8').matchAll(/^\s{6}([a-z0-9_]+):/gm)].map(m => m[1]);
  assert.ok(mine.length > 300);
  assert.deepEqual([...new Set(mine.filter(k => k in base.en))], []);
});

test('P09: i18n-topdown.js oldingi fayllardagi kalitlarni bosib ketmaydi', () => {
  const base = translationsBefore('src/js/i18n-topdown.js');
  const mine = [...fs.readFileSync(path.join(ROOT, 'src/js/i18n-topdown.js'), 'utf8').matchAll(/^\s{6}([a-zA-Z0-9_]+):/gm)].map(m => m[1]);
  assert.ok(mine.length > 600, String(mine.length));
  assert.deepEqual([...new Set(mine.filter(k => k in base.en))], []);
});

test('P09: top-down ogohlantirish (X11, X12 …) va xato kodlari uch tilda; UI kalitlari va dinamik oilalar lug\'atda bor', () => {
  const E = require('../src/engine/index.js');
  const B = require('../src/ui/topdown/build.js');
  const missing = [];
  const need = k => { for (const l of LANGS) if (!T[l][k]) missing.push(`${l}.${k}`); };
  Object.keys(E.TOPDOWN_WARNINGS).forEach(c => need('w_' + c));
  E.TOPDOWN_ERRORS.forEach(c => need('err_' + c));
  E.TOPDOWN_CATEGORIES.forEach(c => need('td_cat_' + c));
  E.TOPDOWN_APPROACHES.forEach(a => need('td_approach_' + a));
  B.BASES.forEach(b => { need('td_basis_' + b); need('td_basis_' + b + '_d'); });
  B.RW_SOURCES.forEach(s => { need('td_src_' + s); need('td_src_' + s + '_d'); });
  B.BIAS_SOURCES.forEach(s => { need('td_bias_' + s); need('td_bias_' + s + '_d'); });
  E.DUPLICATE_RELATIVE_METHODS.forEach(m => need('td_dup_' + m));
  E.RECOVERY_CORRECTIONS.forEach(c => need('td_corr_' + c));
  ['relative', 'absolute'].forEach(s => { need('td_scale_' + s); need('td_scale_' + s + '_d'); });
  ['rw', 'bias', 'recovery', 'sR', 'uDelta', 'level_constant', 'level_proportional'].forEach(k => need('td_row_' + k));
  [1, 2, 3].forEach(n => need('td_step' + n));
  // buildSpec qaytaradigan "bad" maydon nomlari
  const src = fs.readFileSync(path.join(ROOT, 'src/ui/topdown/build.js'), 'utf8');
  for (const m of src.matchAll(/(?:one|list)\(st\.\w+, '(\w+)'\)|bad\.push\('(\w+)'\)/g)) need('td_f_' + (m[1] || m[2]));
  // literal kalitlar: src/ui/topdown/*.js (t('…'), ctx.t('…')) va report.js (yuqoridagi umumiy test)
  const dir = path.join(ROOT, 'src/ui/topdown');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of code.matchAll(/\bt\('([a-z0-9_A-Z]+)'\)/g)) need(m[1]);
    for (const m of code.matchAll(/, '(td_[a-z0-9_A-Z]+)'/g)) if (!m[1].endsWith('_')) need(m[1]); // '_' bilan tugasa — dinamik oila (yuqorida)
  }
  assert.deepEqual([...new Set(missing)], []);
  // X11 va X12 matnlarida {v} o'rinbosari bor (qaysi omil / qaysi hissa)
  for (const l of LANGS) for (const k of ['w_x11_double_counting', 'w_x12_empirical_bias']) assert.match(T[l][k], /\{v\}/, `${l}.${k}`);
});

test('P10: i18n-special.js oldingi fayllardagi kalitlarni bosib ketmaydi; maxsus rejimlar kodlari va UI kalitlari uch tilda', () => {
  const base = translationsBefore('src/js/i18n-special.js');
  const mine = [...fs.readFileSync(path.join(ROOT, 'src/js/i18n-special.js'), 'utf8').matchAll(/^\s{6}([a-zA-Z0-9_]+):/gm)].map(m => m[1]);
  assert.ok(mine.length > 400, String(mine.length));
  assert.deepEqual([...new Set(mine.filter(k => k in base.en))], []);
  const E = require('../src/engine/index.js');
  const B = require('../src/ui/special/build.js');
  const missing = [];
  const need = k => { for (const l of LANGS) if (!T[l][k]) missing.push(`${l}.${k}`); };
  for (const tbl of [E.SAMPLING_WARNINGS, E.QUALITATIVE_WARNINGS, E.MICRO_WARNINGS, E.MEDICAL_WARNINGS]) Object.keys(tbl).forEach(c => need('w_' + c));
  [...E.SAMPLING_ERRORS, ...E.QUALITATIVE_ERRORS, ...E.MICRO_ERRORS, ...E.MEDICAL_ERRORS].forEach(c => need('err_' + c));
  B.MODES.forEach(m => { need('sp_mode_' + m); need('sp_intro_' + m); });
  ['SAMPLING', 'QUALITATIVE', 'MICROBIOLOGY', 'MEDICAL'].forEach(m => { need('sp_section_' + m); need('sp_limits_' + m); });
  ['DUPLICATE_CLASSICAL_ANOVA', 'DUPLICATE_ROBUST_ANOVA', 'CONTINGENCY_2X2', 'LOG10_COUNT', 'IQC_LEVELS'].forEach(a => need('sp_approach_' + a));
  ['ss', 'sp', 'fp', 'fn', 'ppv', 'npv'].forEach(k => need('sp_ql_' + k));
  ['technical', 'matrix', 'poisson'].forEach(k => need('sp_mi_u_' + k));
  ['micro', 'medical'].forEach(k => need('sp_beta_' + k));
  E.SAMPLING_METHODS.forEach(m => need('sp_sa_' + m));
  const src = fs.readFileSync(path.join(ROOT, 'src/ui/special/build.js'), 'utf8');
  for (const m of src.matchAll(/one\(st\.\w+, '(\w+)'\)|bad\.push\('(\w+)'\)/g)) need('sp_f_' + (m[1] || m[2]));
  const dir = path.join(ROOT, 'src/ui/special');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of code.matchAll(/\bt\('([a-z0-9_A-Z]+)'\)/g)) need(m[1]);
    for (const m of code.matchAll(/, '((?:sp|td)_[a-z0-9_A-Z]+)'/g)) if (!m[1].endsWith('_')) need(m[1]);
  }
  assert.deepEqual([...new Set(missing)], []);
});

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P05 (RISKS R-13): admin / super-admin / kirish sahifalari va qolgan barcha matnlar i18n'da
═══════════════════════════════════════════════════════════════════════════════════════════ */

test('R-13: i18n-admin.js oldingi fayllardagi kalitlarni bosib ketmaydi; har bir kaliti uch tilda; < va & yo\'q', () => {
  const base = translationsBefore('src/js/i18n-admin.js');
  const mine = keysOf('src/js/i18n-admin.js');
  assert.ok(mine.length > 800, String(mine.length)); // ≈ 300 kalit × 3 til
  assert.deepEqual([...new Set(mine.filter(k => k in base.en))], []);
  const bad = [];
  for (const k of new Set(mine)) {
    assert.equal(mine.filter(x => x === k).length, 3, `${k}: uch tilda aynan bir martadan bo'lishi kerak`);
    for (const l of LANGS) {
      if (typeof T[l][k] !== 'string' || !T[l][k].trim()) bad.push(`${l}.${k}: bo'sh`);
      else if (/[<&]/.test(T[l][k])) bad.push(`${l}.${k}: < yoki & (matn HTML ichiga qo'yilishi mumkin)`);
    }
    // o'rinbosarlar ({n}, {msg} …) uchala tilda bir xil to'plam
    const ph = l => [...String(T[l][k]).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
    if (ph('uz') !== ph('ru') || ph('uz') !== ph('en')) bad.push(`${k}: o'rinbosarlar tillarda farq qiladi`);
  }
  assert.deepEqual(bad, []);
});

test('R-13: I18N_FILES — src/js dagi barcha lug\'at fayllari, index.html dagi yuklanish tartibida', () => {
  const onDisk = fs.readdirSync(path.join(ROOT, 'src/js')).filter(f => /^i18n.*\.js$/.test(f)).map(f => 'src/js/' + f).sort();
  assert.deepEqual([...I18N_FILES].sort(), onDisk);
  const scriptsOf = f => [...fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
  // index.html: ro'yxatdagi fayllar (yuklanganlari) shu tartibda; i18n-admin.js albatta bor
  const idx = scriptsOf('index.html').filter(s => I18N_FILES.includes(s));
  assert.deepEqual(idx, I18N_FILES.filter(f => idx.includes(f)));
  assert.ok(idx.includes('src/js/i18n.js') && idx.includes('src/js/i18n-admin.js'));
  // admin.html / superadmin.html: i18n.js → i18n-admin.js → til almashtirgich, sahifa skriptlaridan oldin
  for (const [page, ctrl] of [['admin.html', 'src/ui/admin-page.js'], ['superadmin.html', 'src/ui/superadmin-page.js']]) {
    const s = scriptsOf(page);
    const pos = f => { const i = s.indexOf(f); assert.ok(i >= 0, `${page}: ${f} yuklanmagan`); return i; };
    assert.ok(pos('src/js/i18n.js') < pos('src/js/i18n-admin.js'), page);
    assert.ok(pos('src/js/i18n-admin.js') < pos('src/ui/lang-switch.js'), page);
    for (const f of ['src/js/auth.js', 'src/ui/templates.js', ctrl]) assert.ok(pos('src/js/i18n-admin.js') < pos(f), `${page}: ${f}`);
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    for (const l of LANGS) assert.match(html, new RegExp(`class="lang-btn" data-lang="${l}"`), `${page}: ${l} tugmasi`);
  }
});

test('R-13: admin / super-admin sahifalari ishlatadigan kalitlar i18n.js + i18n-admin.js da bor (boshqa lug\'at u yerda yuklanmaydi)', () => {
  const A = evalTranslations(['src/js/i18n.js', 'src/js/i18n-admin.js']);
  const missing = [];
  const need = (k, where) => { for (const l of LANGS) if (typeof A[l][k] !== 'string') missing.push(`${where}: ${l}.${k}`); };
  for (const f of ['admin.html', 'superadmin.html']) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const keys = [...html.matchAll(/data-i18n(?:-ph|-label|-title|-aria|-alt)?="([^"]+)"/g)].map(m => m[1]);
    assert.ok(keys.length > 20, `${f}: ${keys.length}`);
    keys.forEach(k => need(k, f));
  }
  let n = 0;
  for (const f of ['src/ui/admin-page.js', 'src/ui/superadmin-page.js', 'src/ui/templates.js', 'src/ui/index-auth.js', 'src/js/auth.js', 'src/js/db.js', 'src/js/auth-core.js']) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of code.matchAll(/\b(?:t|tr|tf)\('([a-z0-9_]+)'\s*[,)]/g)) { need(m[1], f); n++; }
    for (const m of code.matchAll(/ask: '([a-z0-9_]+)'/g)) { need(m[1], f); n++; }
  }
  assert.ok(n > 150, String(n));
  ['basic', 'standard', 'pro'].forEach(p => need('plan_' + p, 'auth-core.js'));
  assert.deepEqual([...new Set(missing)], []);
});

test('R-13: src/ui/*.js, app.js, table.js, typeB.js dagi i18n.t / i18n.tf literal kalitlari lug\'atda bor', () => {
  const missing = [];
  const files = [...fs.readdirSync(path.join(ROOT, 'src/ui')).filter(f => f.endsWith('.js')).map(f => 'src/ui/' + f),
    'src/js/app.js', 'src/js/table.js', 'src/js/typeB.js', 'src/data/presets.js', 'src/ui/tpl/app.js'];
  for (const f of files) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of code.matchAll(/i18n\.(?:t|tf|all)\('([a-z0-9_]+)'\s*[,)]/g)) for (const l of LANGS) if (!(m[1] in T[l])) missing.push(`${f}: ${l}.${m[1]}`);
    for (const m of code.matchAll(/\btxt\('([a-z0-9_]+)'\)/g)) for (const l of LANGS) if (!(m[1] in T[l])) missing.push(`${f}: ${l}.${m[1]}`);
  }
  ['at', 'action', 'entity', 'id', 'actor', 'reason', 'hash'].forEach(c => { for (const l of LANGS) if (!T[l]['st_col_' + c]) missing.push(`${l}.st_col_${c}`); });
  assert.deepEqual([...new Set(missing)], []);
});

test('R-13: I18n.apply() — data-i18n-title / -aria / -alt, <html lang>; tf() o\'rinbosarlari; all() uch til', () => {
  const dom = new JSDOM('<!doctype html><html lang="uz"><head><title data-i18n="adm_page_title">x</title></head><body>' +
    '<button id="b" title="x" data-i18n-title="c_theme_toggle" data-i18n-aria="c_theme_toggle"></button>' +
    '<img id="i" alt="x" data-i18n-alt="c_copy"><input id="p" data-i18n-ph="sa_login_ph">' +
    '<button class="lang-btn" data-lang="ru">RU</button><span id="s" data-i18n="c_logout">x</span></body></html>',
  { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window;
  w.eval(['src/js/i18n.js', 'src/js/i18n-admin.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n'));
  let events = 0;
  w.document.addEventListener('langchange', () => { events++; });
  for (const l of LANGS) {
    w.i18n.setLang(l);
    assert.equal(w.document.documentElement.lang, l);
    assert.equal(w.document.title, T[l].adm_page_title);
    assert.equal(w.document.getElementById('b').title, T[l].c_theme_toggle);
    assert.equal(w.document.getElementById('b').getAttribute('aria-label'), T[l].c_theme_toggle);
    assert.equal(w.document.getElementById('i').alt, T[l].c_copy);
    assert.equal(w.document.getElementById('p').placeholder, T[l].sa_login_ph);
    assert.equal(w.document.getElementById('s').textContent, T[l].c_logout);
  }
  assert.equal(events, 3);
  assert.equal(w.document.querySelector('.lang-btn').classList.contains('active'), false); // oxirgi til — en
  w.i18n.setLang('uz');
  assert.equal(w.i18n.tf('adm_days_left', { n: 5 }), '5 kun qoldi');
  assert.equal(w.i18n.tf('adm_days_left', {}), '{n} kun qoldi');           // berilmagan o'rinbosar o'zgarmaydi
  assert.equal(w.i18n.tf('c_error', { msg: '{msg} {n}' }), 'Xato: {msg} {n}'); // qiymat qayta talqin qilinmaydi
  assert.deepEqual({ ...w.i18n.all('tpl_skel_title') }, { uz: T.uz.tpl_skel_title, ru: T.ru.tpl_skel_title, en: T.en.tpl_skel_title });
});

test('R-13: admin shablonlari (src/ui/templates.js) uch tilda chiziladi; tarjima va ma\'lumot escape qilinadi', () => {
  const p = '<img src=x onerror=alert(1)>';
  const org = { id: 'o1', firstName: p, lastName: 'B', login: 'a.b', inn: '123456789', phone: '+998901234567', plan: 'standard', planExpiry: '2027-01-01', requestedPlan: 'pro', registeredAt: '2026-11-01', active: false, paymentStatus: 'pending' };
  const emps = [{ id: 'e1', name: p, phone: '+998', role: 'r', login: 'e.e', createdAt: '2026-11-02', active: true }];
  const seen = {};
  for (const l of LANGS) {
    const dom = new JSDOM('<!doctype html><body><div id="r"></div></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
    const w = dom.window;
    w.eval(['src/js/i18n.js', 'src/js/i18n-admin.js', 'src/ui/escape.js', 'src/js/auth-core.js', 'src/ui/templates.js']
      .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n'));
    w.i18n.setLang(l);
    assert.equal(w.AuthCore.PLANS.basic.name, T[l].plan_basic);   // tarif nomi joriy tilda
    const U = w.UiTemplates;
    const html = [U.pendingOrgInfoHTML(org), U.invoiceHTML(org, emps, undefined, new Date('2026-11-18T00:00:00Z')), U.orgInfoHTML(org),
      U.employeesTableHTML(emps), U.employeesTableHTML([]), U.superadminRowsHTML([org]), U.superadminRowsHTML([]),
      U.cleanupRowsHTML([{ id: 'u1', login: p, reason: 'password-reset', at: '2026-11-03' }]), U.cleanupRowsHTML([])].join('\n');
    const root = w.document.getElementById('r');
    root.innerHTML = html;
    assert.equal(root.querySelectorAll('img, script').length, 0, `${l}: element kiritildi`);
    assert.ok(root.textContent.includes(p), `${l}: payload matn sifatida ko'rinishi kerak`);
    assert.ok(!/\{[a-z]+\}/.test(root.textContent), `${l}: to'ldirilmagan o'rinbosar: ${(root.textContent.match(/\{[a-z]+\}/) || [])[0]}`);
    for (const k of ['inv_title', 'inv_seller', 'inv_buyer', 'c_inn', 'adm_reset_pwd', 'sa_btn_activate', 'sa_queue_empty', 'adm_emp_empty', 'sa_org_none', 'plan_standard']) {
      assert.ok(root.textContent.includes(T[l][k]), `${l}: ${k} matni yo'q`);
    }
    assert.ok([...root.querySelectorAll('[title]')].some(e => e.title === T[l].c_copy), `${l}: title`);
    seen[l] = root.textContent;
  }
  assert.notEqual(seen.uz, seen.ru);
  assert.notEqual(seen.ru, seen.en);
});

test('R-13: sozlama (preset) nomlari va TypeB komponent nomlari uch tilda (PresetText: preset_*, pc_*)', () => {
  const vm = require('node:vm');
  const ctx = { window: { i18n: { t: k => (k in T.ru ? T.ru[k] : k) } } };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/data/presets.js'), 'utf8'), ctx);
  const { PRESETS, PresetText } = ctx.window;
  const missing = [];
  let n = 0;
  for (const [key, pd] of Object.entries(PRESETS)) {
    for (const l of LANGS) if (!T[l][PresetText.titleKey(key)]) missing.push(`${l}.${PresetText.titleKey(key)}`);
    for (const c of pd.typeBComponents || []) {
      n++;
      const k = PresetText.componentKey(c.name);
      assert.match(k, /^pc_[a-z0-9_]+$/);
      for (const l of LANGS) if (!T[l][k]) missing.push(`${l}.${k} (${c.name})`);
      assert.equal(T.en[k], c.name, `${k}: inglizcha matn presetdagi nom bilan bir xil bo'lishi kerak`);
      assert.equal(PresetText.component(c.name), T.ru[k]);
    }
    // patch kalitlari komponent nomiga (identifikatorga) mos — tarjima ularni buzmaydi
    for (const pt of pd.points || []) for (const name of Object.keys(pt.patch || {})) assert.ok(pd.typeBComponents.some(c => c.name === name), `${key}: patch ${name}`);
  }
  assert.ok(n >= 40, String(n));
  assert.deepEqual([...new Set(missing)], []);
  assert.equal(PresetText.component('No such component'), 'No such component'); // lug'atda yo'q — nomning o'zi
  const loc = PresetText.localized(PRESETS.mass.typeBComponents);
  assert.equal(loc[0].name, T.ru.pc_calibration_certificate);
  assert.equal(PRESETS.mass.typeBComponents[0].name, 'Calibration certificate'); // asl obyekt o'zgarmaydi
  assert.equal(loc[0].halfWidth, PRESETS.mass.typeBComponents[0].halfWidth);
});

/* ─── Qattiq yozilgan matn skaneri ──────────────────────────────────────────────────────────
   Barcha *.html va src/js, src/ui, src/data, src/templates, src/storage, src/report dagi JS fayllar
   (lug'at fayllari src/js/i18n*.js, src/engine, vendor/ va testlar — yo'q) tekshiriladi.
   Evristika tests/tools/hardcoded-text.js boshida yozilgan. Quyidagi ISTISNOLAR ro'yxatining har bir
   bandida sabab bor; ro'yxatni kengaytirishdan oldin matnni i18n'ga ko'chirish mumkinligini tekshiring. */
const HT = require('./tools/hardcoded-text.js');

// (1) Butun so'z sifatida olib tashlanadigan iboralar (tarjima qilinmaydigan atamalar)
const ALLOW_PHRASES = [
  'UncertaintyCalc',            // mahsulot nomi (brend)
  'Click', 'Payme',             // to'lov tizimlari nomlari (brend)
  'UZ', 'RU', 'EN',             // til almashtirgich tugmalaridagi til kodlari
  'ISO', 'IEC', 'JCGM', 'ILAC', 'GUM', 'EURACHEM', // me'yoriy hujjat belgilari: ISO/IEC 17025:2017, JCGM 100:2008, GUM:2008 …
  'UID',                        // Firebase Auth identifikatori — atama (ustun sarlavhasi)
  'OD',                         // "muallif haqida" blokidagi avatar bosh harflari
  'min', 'max',                 // matematik qisqartmalar ("min 2 · max 100")
  'MPE', 'CMC',                 // metrologik belgilar (maximum permissible error; calibration and measurement capability)
  'bias', 'exp', 'log',         // formula belgilari: bias ustuni (Nordtest), exp(…), log₁₀
  'sqrt', 'ln', 'sin', 'cos', 'tan', 'abs', 'pi', // model formulasi tilidagi funksiya nomlari (yordam satri: "sqrt ln log exp sin …")
  'PP', 'PN', 'LR', 'TP', 'FP', 'FN', 'TN', 'tp', 'fp', 'fn', 'tn', // 2×2 jadval belgilari (AQA:2021): posterior, likelihood ratio, true/false pos./neg.
  'BETA', 'unverified',         // tekshiruv holati belgilari (CLAUDE.md, docs/VALIDATION_MATRIX.md) — qat'iy atama; yonidagi izoh tarjima qilingan
  'mg/L', 'mL', 'cm',           // o'lchov birliklari (placeholder namunalari)
  'Uxpt',                       // P12: PT maydon identifikatori U(x_pt) (forma kaliti, ekranda — lug'atdan)
  '% об.',                      // hajmiy ulush birligi — manba hujjatdagi (C75.QM, KEDR-07) yozuvda; nuqta belgisi "10 % об."
];

// (2) Aynan shu matnli literallar (to'liq mos kelganda)
const ALLOW_LITERALS = new Set([
  'use strict',                 // JS direktivasi
  'Enter', 'Tab', 'Escape', 'Home', 'End',   // KeyboardEvent.key qiymatlari (P16: + buyruq qidiruvi klavishlari)
  'opacity .3s, transform .3s', // CSS transition qiymati (toast.js)
  'Unknown batch op:',          // DB.batch() ga noto'g'ri op berilganda ishlab chiquvchi uchun xato (dasturlash xatosi, UI'ga chiqmaydi)
  'NIST/SEMATECH e-Handbook of Statistical Methods', // P12: normativ manba nomi (tarjima qilinmaydi — JCGM / ISO nomlari kabi)
  'new version', 'lab settings', 'migration mark', // audit jurnaliga yoziladigan sabab kodlari (xesh zanjirida saqlanadigan ma'lumot; tilga bog'liq bo'lmasligi kerak)
]);

// (3) Kontekst bo'yicha istisnolar
function skipLiteral(lit, file) {
  // Juda eski brauzer ogohlantirishi: i18n.js (class, strelkali funksiyalar) u yerda ishlamaydi, shuning uchun
  // matn bitta satrda uchala tilda yozilgan (uz / ru / en).
  if (file === 'src/ui/legacy-warning.js') return true;
  // Shablon diagnostikasi (sxema va model tekshiruvi): shablon MUALLIFI uchun inglizcha texnik xabarlar — JSON yo'li,
  // sxema kalit so'zi bilan (ajv uslubida); sof modul (i18n'siz), testlar matn bo'yicha moslaydi. Faqat
  // errors.push / warnings.push / message: / new Error( / note: kontekstidagi literallar.
  if (/^src\/templates\//.test(file) && /(?:errors|warnings)\.push\(\s*$|message:\s*$|new Error\(\s*$|note:\s*$/.test(lit.ctx)) return true;
  // Preset va komponentlarning `name` qiymatlari — barqaror identifikator (points[].patch kaliti, legacy shablonlardagi
  // legacyName, testlar). Ekranga chiqadigan matn PresetText orqali lug'atdan olinadi (yuqoridagi test tekshiradi).
  if (file === 'src/data/presets.js' && (/\bname:\s*$/.test(lit.ctx) || PRESET_COMPONENT_NAMES.has(lit.text))) return true;
  return false;
}
const PRESET_COMPONENT_NAMES = (() => {
  const vm = require('node:vm');
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/data/presets.js'), 'utf8'), ctx);
  return new Set(Object.values(ctx.window.PRESETS).flatMap(pd => (pd.typeBComponents || []).map(c => c.name)));
})();

const SCAN_JS_DIRS = ['src/js', 'src/ui', 'src/data', 'src/templates', 'src/storage', 'src/report'];
const isDictionary = f => I18N_FILES.includes(f.split(path.sep).join('/'));

test('R-13: skaner o\'zini tekshiradi — qattiq yozilgan matnni topadi, kod/kalit/izohga tegmaydi', () => {
  const opt = { allowPhrases: ALLOW_PHRASES, allowLiterals: ALLOW_LITERALS, skip: skipLiteral };
  const js = code => HT.scanJs('x.js', code, opt).map(h => h.why);
  // topilishi kerak
  assert.deepEqual(js(`showToast('Ro\\'yxatdan o\\'tish');`), ['uzbek']);
  assert.deepEqual(js(`showToast('Ma\\'lumot saqlandi');`), ['sentence']);
  assert.deepEqual(js('el.textContent = "Данные сохранены";'), ['cyrillic']);
  assert.deepEqual(js('el.textContent = `Saved ${n} records`;'), ['sentence']);
  assert.deepEqual(js(`btn.textContent = 'Saqlash';`), ['word']);
  assert.deepEqual(js('el.innerHTML = `<th>${a}</th><th>Holat</th>`;'), ['html-text']);
  assert.deepEqual(js('el.innerHTML = `<button title="Yopish">${icon}</button>`;'), ['html-text']);
  assert.deepEqual(js('x = cond ? `${a}` : `text ${b ? \'Ichki jumla shu yerda\' : 1}`;'), ['sentence']); // ichma-ich literal
  assert.deepEqual(js(`throw new Error('Parol juda qisqa');`), ['sentence']);
  // topilmasligi kerak
  assert.deepEqual(js(`// Izoh: bu yerda o'zbekcha matn bor\n/* Данные */ const a = 1;`), []);
  assert.deepEqual(js(`el.textContent = i18n.t('adm_emp_title'); el.className = 'btn btn-sm btn-ghost active';`), []);
  assert.deepEqual(js(`document.querySelector('#sa-org-tbody tr[data-row-id]'); x.style.cssText = 'font-size:.7rem;color:var(--accent);margin-top:.3rem';`), []);
  assert.deepEqual(js(`console.warn('Storage is not available here');`), []);
  assert.deepEqual(js('const re = /Hello world [a-z]+/; const u = `https://my.click.uz/services/pay?service_id=${a}`;'), []);
  assert.deepEqual(js('el.innerHTML = `<th class="cell-num">u(xᵢ)</th><th>ν_eff</th><th>U<sub>rel</sub></th><th>MPE</th>`;'), []);
  // HTML
  const html = h => HT.scanHtml('x.html', '<!doctype html><html><body>' + h + '</body></html>', opt).map(x => x.why);
  assert.deepEqual(html('<p>Salom dunyo</p>'), ['text']);
  assert.deepEqual(html('<p data-i18n="k">Salom dunyo</p><div data-i18n="k"><b>Ichki matn</b></div>'), []);
  assert.deepEqual(html('<input placeholder="Ism"><button title="Yopish" data-i18n="k">x</button><img alt="Rasm" data-i18n-alt="k">'), ['placeholder', 'title']);
  assert.deepEqual(html('<input placeholder="Ism" data-i18n-ph="k"><span>UncertaintyCalc</span><span>ISO/IEC 17025:2017</span><span>u<sub>Bi</sub></span><script>var a = "Salom dunyo";</script>'), []);
});

test('R-13: HTML fayllarda i18n\'dan tashqari matn yo\'q (matn tugunlari, placeholder / title / aria-label / alt)', () => {
  const opt = { allowPhrases: ALLOW_PHRASES };
  const hits = [];
  const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
  assert.ok(pages.length >= 3);
  for (const f of pages) hits.push(...HT.scanHtml(f, fs.readFileSync(path.join(ROOT, f), 'utf8'), opt));
  assert.deepEqual(hits.map(h => `${h.file} [${h.why}] ${h.text}`), []);
});

test('R-13: JS fayllarda i18n\'dan tashqari foydalanuvchi matni yo\'q (satr va shablon literallari)', () => {
  const opt = { allowPhrases: ALLOW_PHRASES, allowLiterals: ALLOW_LITERALS, skip: skipLiteral };
  const hits = [];
  let files = 0;
  for (const dir of SCAN_JS_DIRS) {
    for (const f of HT.listFiles(ROOT, dir, '.js')) {
      if (isDictionary(f)) continue;
      files++;
      hits.push(...HT.scanJs(f.split(path.sep).join('/'), fs.readFileSync(path.join(ROOT, f), 'utf8'), opt));
    }
  }
  assert.ok(files >= 40, String(files));
  assert.deepEqual(hits.map(h => `${h.file}:${h.line} [${h.why}] ${h.text}`), []);
});

/* ── P05a: linter matnlari ── */
test('P05a: i18n-linter.js oldingi fayllardagi kalitlarni bosib ketmaydi; har bir topilma kodi uchun w_ / fix_ (va why_) uch tilda', () => {
  const base = translationsBefore('src/js/i18n-linter.js');
  const mine = [...fs.readFileSync(path.join(ROOT, 'src/js/i18n-linter.js'), 'utf8').matchAll(/^\s{6}([a-zA-Z0-9_]+):/gm)].map(m => m[1]);
  assert.ok(new Set(mine).size > 150, String(new Set(mine).size));
  assert.deepEqual([...new Set(mine.filter(k => k in base.en))], []);
  const E = require('../src/engine/index.js');
  const missing = [];
  const need = k => { for (const l of LANGS) if (!T[l][k]) missing.push(`${l}.${k}`); };
  for (const [code, meta] of Object.entries(E.FINDING_CODES)) {
    need('w_' + code); need('fix_' + code);
    if (!/^W\d/.test(meta.rule)) need('why_' + code);            // linterning o'z qoidalari: "nima uchun" matni ham
  }
  E.SEVERITIES.forEach(s => need('fnd_sev_' + s));
  E.MODEL_KINDS.forEach(k => need('mk_' + k));
  ['zero_u', 'below_cmc'].forEach(c => need('fnd_critical_' + c));
  ['floor', 'interpolate', 'exact'].forEach(r => need('nu_rule_' + r));
  // src/report/findings.js, src/ui/findings/app.js va report.js dagi literal kalitlar
  for (const f of ['src/report/findings.js', 'src/ui/findings/app.js', 'src/js/report.js', 'src/js/typeB.js']) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of code.matchAll(/\bt\('((?:fnd|mk|mark|lab)_[a-z0-9_]+)'\)/g)) if (!m[1].endsWith('_')) need(m[1]);
  }
  assert.deepEqual([...new Set(missing)], []);
  // matnlardagi o'rinbosarlar: faqat {p}, {s}, {v} (va belgilar uchun {M}, {seed})
  for (const l of LANGS) for (const k of new Set(mine)) assert.ok(!/\{(?!p\}|s\}|v\}|M\}|seed\})/.test(T[l][k]), `${l}.${k}`);
});

/* ── P05b: hisobot shakllari, rekvizitlar, qaror qoidasi matnlari ── */
test('P05b: i18n-report.js oldingi fayllardagi kalitlarni bosib ketmaydi; shakl, rekvizit va qaror kalitlari uch tilda', () => {
  const base = translationsBefore('src/js/i18n-report.js');
  const mine = [...fs.readFileSync(path.join(ROOT, 'src/js/i18n-report.js'), 'utf8').matchAll(/^\s{6}([a-zA-Z0-9_]+):/gm)].map(m => m[1]);
  assert.ok(new Set(mine).size >= 95, String(new Set(mine).size));
  assert.deepEqual([...new Set(mine.filter(k => k in base.en))], []);
  const FM = require('../src/report/forms.js');
  const RQ = require('../src/report/requisites.js');
  const E = require('../src/engine/index.js');
  const missing = [];
  const need = k => { for (const l of LANGS) if (!T[l][k]) missing.push(`${l}.${k}`); };
  FM.REPORT_FORMS.forEach(f => { need('rf_title_' + f); need('rf_sub_' + f); need('rp_form_' + f); });
  [...RQ.LAB_FIELDS, ...RQ.REPORT_FIELDS.map(f => f.key)].forEach(k => need('rq_' + k));
  ['pass', 'fail', 'cond_pass', 'cond_fail'].forEach(v => need('dr_' + v));
  E.DECISION_STATEMENTS.forEach(s => { need('dr_statement_' + s); need('set_decision_' + s); });
  ['rule', 'limit', 'recalc'].forEach(p => need('dr_pending_' + p));
  for (const f of ['src/report/sections.js', 'src/report/forms.js', 'src/report/footer.js', 'src/ui/report/app.js', 'src/js/report.js', 'src/js/typeB.js']) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of code.matchAll(/\bt\('((?:rf|rq|rp|dr|set|mk|fnd|mark)_[a-z0-9_]+)'\)/g)) if (!m[1].endsWith('_')) need(m[1]);
  }
  assert.deepEqual([...new Set(missing)], []);
  for (const l of LANGS) for (const k of new Set(mine)) assert.ok(!/[<&]/.test(T[l][k]), `${l}.${k}: < yoki & bo'lmasin`);
});
