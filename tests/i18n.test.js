/* i18n: har bir matn kaliti uch tilda (uz/ru/en) bo'lishi shart (CLAUDE.md).
   src/js/i18n.js + i18n-ext.js + i18n-engine.js + i18n-templates.js + i18n-regression.js (P08) + i18n-topdown.js (P09) jsdom'da yuklanadi. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const LANGS = ['uz', 'ru', 'en'];

function loadTranslations() {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  // Ikkala fayl bitta skript sifatida (top-level const TRANSLATIONS umumiy bo'lishi uchun)
  const src = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js', 'src/js/i18n-special.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
  return dom.window.eval(src + '\n;TRANSLATIONS');
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
    for (const m of html.matchAll(/data-i18n(?:-ph|-label)?="([^"]+)"/g)) {
      for (const l of LANGS) if (!(m[1] in T[l])) missing.push(`${f}: ${l}.${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
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
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const base = dom.window.eval(['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + '\n;TRANSLATIONS');
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
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const base = dom.window.eval(['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + '\n;TRANSLATIONS');
  const mine = [...fs.readFileSync(path.join(ROOT, 'src/js/i18n-regression.js'), 'utf8').matchAll(/^\s{6}([a-z0-9_]+):/gm)].map(m => m[1]);
  assert.ok(mine.length > 300);
  assert.deepEqual([...new Set(mine.filter(k => k in base.en))], []);
});

test('P09: i18n-topdown.js oldingi fayllardagi kalitlarni bosib ketmaydi', () => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const base = dom.window.eval(['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + '\n;TRANSLATIONS');
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
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  const base = dom.window.eval(['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js', 'src/js/i18n-templates.js', 'src/js/i18n-regression.js', 'src/js/i18n-topdown.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n') + '\n;TRANSLATIONS');
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
