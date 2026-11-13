/* i18n: har bir matn kaliti uch tilda (uz/ru/en) bo'lishi shart (CLAUDE.md).
   src/js/i18n.js + i18n-ext.js + i18n-engine.js jsdom'da yuklanadi. */
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
  const src = ['src/js/i18n.js', 'src/js/i18n-ext.js', 'src/js/i18n-engine.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n;\n');
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
