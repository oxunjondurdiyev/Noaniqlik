#!/usr/bin/env node
/* SCRIPTS/RTM.JS — talablar izlanuvchanligi matritsasi (P13; docs/validation/).
   Manbalar (qo'lda yuritiladi):  docs/validation/REQUIREMENTS.md  — talab ID si va matni;
                                  docs/validation/rtm.map.json     — talab → kod (fayl::funksiya) → test (fayl / case:<id>) → holat.
   Mahsulot (AVTOMATIK, qo'lda tahrirlanmaydi):  docs/validation/RTM.md
     node scripts/rtm.js            # tekshiruv (xato bo'lsa chiqish kodi 1)
     node scripts/rtm.js --write    # tekshiruv + RTM.md ni qayta yaratish
   Qoida: har bir talab kamida bitta testga bog'langan YOKI aniq belgisi bor (unverified / pending / manual — izoh bilan).
   Bog'lanmagan talab, mavjud bo'lmagan fayl / funksiya / misol, eskirgan RTM.md — `npm test` xatosi (tests/validation/rtm.test.js). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const FILES = { requirements: 'docs/validation/REQUIREMENTS.md', map: 'docs/validation/rtm.map.json', rtm: 'docs/validation/RTM.md' };
/* Holatlar: verified — bog'langan testlar manba misoli / tekshiruvi; verified-discrepancy — o'tadi, ma'lum farq bor (D-ID yoki izoh);
   unverified — manba repoda yo'q (test bo'lishi mumkin, lekin majburiy dalil emas); pending — hali bajarilmagan / kutilmoqda;
   manual — bir martalik qo'lda bajarilgan tekshiruv, avtomatik test yo'q. */
const STATUSES = ['verified', 'verified-discrepancy', 'unverified', 'pending', 'manual'];
const NEED_TEST = ['verified', 'verified-discrepancy'];
const STATUS_LABEL = { verified: '✅ verified', 'verified-discrepancy': '⚠️ verified (farq bilan)', unverified: '❔ unverified', pending: '⏳ pending', manual: '✋ manual' };
const ID = /^REQ-([A-Z]{3})-(\d{3})$/;
const NO_CODE_AREAS = ['SRC'];           // manba misollari qamrovi: kod havolasi shart emas

function splitRow(line) {
  const out = []; let cur = '', code = false;
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '`') code = !code;
    if (c === '\\' && body[i + 1] === '|') { cur += '|'; i++; continue; }
    if (c === '|' && !code) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** REQUIREMENTS.md → { areas: [{ area, title }], items: [{ id, area, text, origin }] } */
function parseRequirements(md) {
  const areas = [], items = [];
  let area = null;
  for (const line of String(md).split('\n')) {
    const h = /^##\s+([A-Z]{3})\s+—\s+(.*)$/.exec(line);
    if (h) { area = h[1]; areas.push({ area, title: h[2].trim() }); continue; }
    if (!line.startsWith('| REQ-')) continue;
    const c = splitRow(line);
    items.push({ id: c[0], area, text: c[1] || '', origin: c[2] || '' });
  }
  return { areas, items };
}

/**
 * Tekshiruv (sof — fayl tizimi `io` orqali; testlarda soxta ma'lumot bilan ishlatiladi).
 * @param {{items:object[]}} req     parseRequirements()
 * @param {object} map               rtm.map.json
 * @param {object} io                { exists(p), isDir(p), read(p), cases: Map<id, status>, discrepancies: Set<string> }
 * @returns {{ errors:string[], rows:object[], summary:object }}
 */
function checkRtm(req, map, io) {
  const errors = [];
  const seen = new Set();
  const rows = [];
  for (const r of req.items) {
    const m = ID.exec(r.id);
    if (!m) { errors.push(`${r.id}: ID formati REQ-<SOHA>-NNN emas`); continue; }
    if (m[1] !== r.area) errors.push(`${r.id}: "${r.area}" bo'limida turibdi`);
    if (seen.has(r.id)) errors.push(`${r.id}: takror ID`);
    seen.add(r.id);
    if (!r.text) errors.push(`${r.id}: talab matni bo'sh`);
    const e = map[r.id];
    if (!e) { errors.push(`${r.id}: rtm.map.json da yo'q — talab hech narsaga bog'lanmagan`); continue; }
    const code = Array.isArray(e.code) ? e.code : [], tests = Array.isArray(e.tests) ? e.tests : [];
    if (!STATUSES.includes(e.status)) errors.push(`${r.id}: noma'lum holat "${e.status}"`);
    for (const c of code) {
      const [file, sym] = String(c).split('::');
      if (!io.exists(file)) { errors.push(`${r.id}: kod fayli yo'q — ${file}`); continue; }
      if (sym && (io.isDir(file) || !new RegExp(`(^|[^\\w$])${sym.replace(/[$]/g, '\\$')}([^\\w$]|$)`).test(io.read(file)))) errors.push(`${r.id}: ${file} da "${sym}" topilmadi`);
    }
    let evidence = 0;
    for (const t of tests) {
      if (String(t).startsWith('case:')) {
        const id = t.slice(5);
        if (!io.cases.has(id)) errors.push(`${r.id}: test misoli yo'q — ${id}`);
        else if (io.cases.get(id) === 'verified') evidence++;
      } else if (!io.exists(t) || io.isDir(t)) errors.push(`${r.id}: test fayli yo'q — ${t}`);
      else evidence++;
    }
    if (NEED_TEST.includes(e.status)) {
      if (!tests.length) errors.push(`${r.id}: holati "${e.status}", lekin hech qanday testga bog'lanmagan`);
      else if (!evidence) errors.push(`${r.id}: holati "${e.status}", lekin bog'langan misollarning hech biri verified emas`);
      if (!code.length && !NO_CODE_AREAS.includes(r.area)) errors.push(`${r.id}: kod havolasi yo'q`);
    } else if (STATUSES.includes(e.status) && !String(e.note || '').trim()) errors.push(`${r.id}: holati "${e.status}" — izoh (sabab) majburiy`);
    if (e.status === 'verified-discrepancy' && !(e.discrepancies || []).length && !String(e.note || '').trim()) errors.push(`${r.id}: "farq bilan" holati uchun D-ID yoki izoh kerak`);
    for (const d of e.discrepancies || []) if (!io.discrepancies.has(d)) errors.push(`${r.id}: ${d} tests/cases/DISCREPANCIES.md da yo'q`);
    rows.push({ id: r.id, area: r.area, text: r.text, origin: r.origin, code, tests, status: e.status, discrepancies: e.discrepancies || [], note: e.note || '', evidence: e.evidence || '' });
  }
  for (const id of Object.keys(map)) if (!seen.has(id)) errors.push(`${id}: rtm.map.json da bor, REQUIREMENTS.md da yo'q`);
  const count = s => rows.filter(r => r.status === s).length;
  const summary = {
    requirements: req.items.length,
    linked: rows.filter(r => r.tests.length > 0).length,
    byStatus: Object.fromEntries(STATUSES.map(s => [s, count(s)])),
    withoutTest: rows.filter(r => !r.tests.length).map(r => r.id),
    unlinked: req.items.filter(r => !map[r.id]).map(r => r.id),
  };
  return { errors, rows, summary };
}

const cell = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
function codeCell(list) { return list.length ? list.map(c => '`' + c + '`').join('<br>').replace(/<br>/g, '; ') : '—'; }
function testCell(list) {
  if (!list.length) return '—';
  const files = list.filter(t => !t.startsWith('case:')).map(t => '`' + t + '`');
  const cases = list.filter(t => t.startsWith('case:')).map(t => '`' + t.slice(5) + '`');
  return [...files, ...(cases.length ? [`misollar: ${cases.join(', ')}`] : [])].join('; ');
}

/** RTM.md matni (deterministik: sana va commit yo'q). */
function renderRtm(req, checked) {
  const s = checked.summary;
  const out = [
    '# Izlanuvchanlik matritsasi (RTM): talab → kod → test → holat', '',
    '> **AVTOMATIK YARATILGAN — qo\'lda tahrirlamang.** Manba: [`REQUIREMENTS.md`](REQUIREMENTS.md) + [`rtm.map.json`](rtm.map.json); yaratish: `node scripts/rtm.js --write`.',
    '> Test natijalari (o\'tdi / o\'tmadi, kutilgan va olingan qiymatlar, toleranslar) — validatsiya hisobotida (`scripts/validation-report.js`).',
    '> Holat belgilari: ✅ verified — bog\'langan testlar manba misoli yoki tekshiruvi; ⚠️ — o\'tadi, ma\'lum farq bor ([DISCREPANCIES](../../tests/cases/DISCREPANCIES.md)); ❔ unverified — manba repoda yo\'q; ⏳ pending — bajarilmagan / kutilmoqda; ✋ manual — bir martalik qo\'lda tekshiruv, avtomatik test yo\'q.', '',
    '## Xulosa', '',
    '| Ko\'rsatkich | Soni |', '|---|---|',
    `| Talablar | ${s.requirements} |`,
    `| Kamida bitta testga bog'langan | ${s.linked} |`,
    ...STATUSES.map(st => `| ${STATUS_LABEL[st]} | ${s.byStatus[st]} |`),
    `| Testsiz (faqat aniq belgi bilan: unverified / pending / manual) | ${s.withoutTest.length} |`, '',
  ];
  for (const a of req.areas) {
    const rows = checked.rows.filter(r => r.area === a.area);
    if (!rows.length) continue;
    out.push(`## ${a.area} — ${a.title}`, '', '| ID | Talab | Kod | Test | Holat | Izoh |', '|---|---|---|---|---|---|');
    for (const r of rows) {
      const note = [r.discrepancies.join(', '), r.note].filter(Boolean).join(' — ');
      out.push(`| ${r.id} | ${cell(r.text)} | ${cell(codeCell(r.code))} | ${cell(testCell(r.tests))} | ${STATUS_LABEL[r.status] || r.status} | ${cell(note) || '—'} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

/** Repodagi haqiqiy fayllar bilan. */
function loadRtm(root = ROOT) {
  const p = f => path.join(root, f);
  const req = parseRequirements(fs.readFileSync(p(FILES.requirements), 'utf8'));
  const map = JSON.parse(fs.readFileSync(p(FILES.map), 'utf8'));
  const cases = new Map();
  (function walk(dir) {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, d.name);
      if (d.isDirectory()) walk(f);
      else if (d.name.endsWith('.json')) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); cases.set(j.id, j.status); }
    }
  })(p('tests/cases'));
  const io = {
    exists: f => fs.existsSync(p(f)),
    isDir: f => fs.existsSync(p(f)) && fs.statSync(p(f)).isDirectory(),
    read: f => fs.readFileSync(p(f), 'utf8'),
    cases,
    discrepancies: new Set(fs.readFileSync(p('tests/cases/DISCREPANCIES.md'), 'utf8').match(/D-\d{2}/g) || []),
  };
  const checked = checkRtm(req, map, io);
  return { req, map, checked, text: renderRtm(req, checked), cases };
}

module.exports = { parseRequirements, checkRtm, renderRtm, loadRtm, STATUSES, STATUS_LABEL, FILES };

if (require.main === module) {
  const r = loadRtm();
  const s = r.checked.summary;
  if (process.argv.includes('--write') && !r.checked.errors.length) {
    fs.writeFileSync(path.join(ROOT, FILES.rtm), r.text + '\n');
    console.log('yozildi:', FILES.rtm);
  }
  console.log(`talablar: ${s.requirements}; testga bog'langan: ${s.linked}; ` + STATUSES.map(st => `${st}: ${s.byStatus[st]}`).join(', '));
  for (const e of r.checked.errors) console.error('  ✗ ' + e);
  if (!r.checked.errors.length && !process.argv.includes('--write') && fs.existsSync(path.join(ROOT, FILES.rtm)) && fs.readFileSync(path.join(ROOT, FILES.rtm), 'utf8') !== r.text + '\n') {
    console.error('  ✗ RTM.md eskirgan — node scripts/rtm.js --write');
    process.exit(1);
  }
  process.exit(r.checked.errors.length ? 1 : 0);
}
