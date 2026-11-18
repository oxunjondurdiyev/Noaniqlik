/* P05 (RISKS R-13): o'rnatilgan shablonlardagi (templates/builtin/*.json) va yo'riqnoma misolidagi
   har bir lokalizatsiyalangan matn obyekti uch tilda (uz/ru/en) bo'lishi shart; ekranga chiqadigan oddiy
   satr maydonlarida (lokalizatsiyasiz) bir tilli jumla bo'lmasligi kerak.
   Raqamlar (yarim kenglik, U, k, kuzatuv) bu testga aloqador emas va shablonlarga qo'shilmaydi (CLAUDE.md). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { classify } = require('../tools/hardcoded-text.js');
const T = require('../../src/templates/interpreter.js');

const ROOT = path.join(__dirname, '..', '..');
const LANGS = ['uz', 'ru', 'en'];
const FILES = [
  ...fs.readdirSync(path.join(ROOT, 'templates/builtin')).filter(f => f.endsWith('.json') && f !== 'index.json').map(f => 'templates/builtin/' + f),
  'docs/templates/examples/LAB-EXAMPLE-01.json',
];
const load = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

// Lokalizatsiyalangan obyekt: kamida bitta til kaliti (uz/ru/en) bor va qiymatlari satr
const isLabel = o => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).some(k => LANGS.includes(k)) &&
  Object.values(o).every(v => typeof v === 'string');

function walk(node, p, onLabel, onString) {
  if (Array.isArray(node)) { node.forEach((x, i) => walk(x, `${p}[${i}]`, onLabel, onString)); return; }
  if (typeof node === 'string') { onString(node, p); return; }
  if (!node || typeof node !== 'object') return;
  if (isLabel(node)) { onLabel(node, p); return; }
  for (const k of Object.keys(node)) walk(node[k], p ? `${p}.${k}` : k, onLabel, onString);
}

test('o\'rnatilgan shablonlar: 39 ta + yo\'riqnoma misoli o\'qildi', () => {
  assert.ok(FILES.length >= 40, String(FILES.length));
});

test('har bir lokalizatsiyalangan matn obyektida uchala til (uz, ru, en) bor va bo\'sh emas; boshqa kalit yo\'q', () => {
  const bad = [];
  let count = 0;
  for (const f of FILES) {
    walk(load(f), '', (o, p) => {
      count++;
      for (const l of LANGS) if (typeof o[l] !== 'string' || !o[l].trim()) bad.push(`${f}: ${p}: ${l} yo'q`);
      for (const k of Object.keys(o)) if (!LANGS.includes(k)) bad.push(`${f}: ${p}: ortiqcha kalit ${k}`);
    }, () => {});
  }
  assert.ok(count > 1000, `lokalizatsiyalangan obyektlar: ${count}`);
  assert.deepEqual(bad, []);
});

test('tarjima haqiqatan boshqa tilda: ru matnida kirill harfi bor, uz/en matni ru bilan bir xil emas', () => {
  // Belgi/formuladan iborat matnlar (harfsiz yoki faqat belgi: "ρ = m/V", "ГОСТ 3624") bundan mustasno.
  const bad = [];
  const wordy = s => /[A-Za-zЀ-ӿ]{4,}\s+[A-Za-zЀ-ӿ]{4,}/.test(s);
  for (const f of FILES) {
    walk(load(f), '', (o, p) => {
      if (!wordy(o.uz) || !wordy(o.ru)) return;
      if (!/[Ѐ-ӿ]{3,}/.test(o.ru)) bad.push(`${f}: ${p}: ru matnida kirill yo'q — ${o.ru}`);
      if (o.uz === o.ru || o.en === o.ru) bad.push(`${f}: ${p}: tarjima qilinmagan — ${o.ru}`);
    }, () => {});
  }
  assert.deepEqual(bad, []);
});

test('lokalizatsiyasiz satr maydonlarida bir tilli jumla yo\'q (masalan constants[].ref)', () => {
  // Istisnolar — ekranga matn sifatida chiqmaydigan yoki tilga bog'liq bo'lmagan maydonlar:
  const EXEMPT = [
    /(^|\.)legacyName$/,          // P03 presetidagi inglizcha nom — identifikator (snapshot testlari shu bo'yicha moslaydi)
    /^ref$/,                      // shablon manbasi (fayl yo'li / "laboratoriya") — kelib chiqish belgisi, yorliq emas
    /^regression\.demoSource$/,   // adabiyot iqtibosi (EURACHEM/CITAC QUAM:2012, Example A5 …) — asl tilida
    /(^|\.)standards\[\d+\]\.code$/, // standart belgisi (ГОСТ 10180, ISO 7500-1) — tarjima qilinmaydi
    /(^|\.)(formula|unit|symbol|id|input|instrument|x|y)$/, // formula, birlik, belgi, identifikator
    /^history\[\d+\]\.(note|by|at)$/, // audit tarixi yozuvi (ma'lumot, yorliq emas)
    /\.label$/,                   // nuqta belgisi: son + birlik ("10 °C", "0 % об. (N₂)")
  ];
  const ALLOW = ['EURACHEM', 'QUAM', 'ГОСТ', 'ISO', 'IEC'];
  const bad = [];
  for (const f of FILES) {
    walk(load(f), '', () => {}, (s, p) => {
      if (EXEMPT.some(re => re.test(p))) return;
      const c = classify(s, ALLOW);
      if (c) bad.push(`${f}: ${p}: [${c.why}] ${s}`);
    });
  }
  assert.deepEqual(bad, []);
});

test('constants[].ref uch tilli bo\'lsa, interpreter tanlangan tildagi matnni beradi (satr bo\'lsa — o\'zini)', () => {
  assert.equal(T.tr({ uz: 'Asbob pasporti', ru: 'Паспорт прибора', en: 'Instrument specification' }, 'ru'), 'Паспорт прибора');
  assert.equal(T.tr('EURACHEM QUAM A2', 'ru'), 'EURACHEM QUAM A2');
  const tpl = load('templates/builtin/T-22.json');
  const refs = tpl.constants.map(c => c.ref).filter(r => typeof r === 'object');
  assert.ok(refs.length >= 3);
  for (const r of refs) for (const l of LANGS) assert.ok(r[l] && r[l].trim(), l);
});
