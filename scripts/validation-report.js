#!/usr/bin/env node
/* SCRIPTS/VALIDATION-REPORT.JS — avtomatik validatsiya hisoboti (P13; ISO/IEC 17025:2017 §7.11.2 — unverified, standart repoda yo'q).
   Test natijalaridan yig'iladi — hech narsa qo'lda yozilmaydi:
     • `node --test` (package.json dagi `test` skripti fayllari) — mashinada o'qiladigan reporter bilan;
     • tests/cases/ dagi har bir misol: manba (hujjat, band, sahifa), holat, kutilgan va olingan qiymat, tolerans va sababi, D-ID;
     • talablar izlanuvchanligi (scripts/rtm.js);
     • brauzerlararo takrorlanuvchanlik (tests/crossbrowser/run.js natijasi — berilgan bo'lsa);
     • mustaqil o'zaro tekshiruv (tests/crosscheck/num/).
   Chiqish: <out>/validation-report.html (o'zi yetarli, SKRIPTSIZ, o'z CSP si bilan) va <out>/validation-report.json.
   Bir xil commit va muhit uchun sana (generatedAt) va commit dan boshqa hamma narsa deterministik.
     node scripts/validation-report.js [--out=_validation] [--crossbrowser=crossbrowser-results.json] [--strict] [--skip-tests]
   --strict: test yiqilgan, RTM xatosi yoki brauzer tekshiruvi o'tmagan bo'lsa chiqish kodi 1 (hisobot baribir yoziladi). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const FORMAT = 'uc-validation-report/1';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ─── 1. Testlar ─── */
/** Reporter satrlaridan (scripts/lib/test-reporter.js) xulosa. */
function summarizeTests(lines) {
  const out = { total: 0, pass: 0, fail: 0, todo: 0, skipped: 0, files: 0, failed: [], todoList: [], skippedList: [], reported: {} };
  const files = new Set();
  for (const line of lines) {
    let e;
    try { e = JSON.parse(line); } catch (_) { continue; }
    if (e.type === 'diagnostic') { const m = /^(tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$/.exec(e.message); if (m) out.reported[m[1]] = Number(m[2]); continue; }
    if (e.kind === 'suite') continue;
    if (e.file) files.add(e.file);
    out.total++;
    const item = { name: e.name, file: e.file };
    if (e.todo !== null) { out.todo++; out.todoList.push({ ...item, reason: e.todo, passing: e.type === 'pass' }); }
    else if (e.skip !== null) { out.skipped++; out.skippedList.push({ ...item, reason: e.skip }); }
    else if (e.type === 'pass') out.pass++;
    else { out.fail++; out.failed.push({ ...item, error: e.error || '' }); }
  }
  const by = (a, b) => (a.file + '\u0000' + a.name).localeCompare(b.file + '\u0000' + b.name);
  out.failed.sort(by); out.todoList.sort(by); out.skippedList.sort(by);
  out.files = files.size;
  return out;
}
function testFiles(root) {
  const script = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts.test;
  const m = /^node --test (.+)$/.exec(script);
  if (!m) throw new Error('package.json: scripts.test "node --test <fayllar>" ko\'rinishida emas');
  return m[1].split(/\s+/);
}
function runTests(root) {
  const r = spawnSync(process.execPath, ['--test', `--test-reporter=${path.join(__dirname, 'lib', 'test-reporter.js')}`, '--test-reporter-destination=stdout', ...testFiles(root)],
    { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, shell: false });
  if (r.error) throw r.error;
  const t = summarizeTests(r.stdout.split('\n'));
  if (!t.total) throw new Error('testlar ishga tushmadi: ' + String(r.stderr).slice(0, 500));
  return t;
}

/* ─── 2. Manba misollari ─── */
function collectCases(root) {
  const { loadCases, checks, compare } = require(path.join(root, 'tests/cases/lib.js'));
  const items = [];
  for (const c of loadCases()) {
    const item = {
      id: c.id, title: c.title, status: c.status, statusReason: c.statusReason || '', enabledIn: c.enabledIn || '', domain: c.domain || '',
      source: { doc: (c.source || {}).doc || '', section: (c.source || {}).section || '', page: (c.source || {}).page || '', file: (c.source || {}).file || '' },
      method: (c.run || {}).method || 'evaluate', checks: [], warnings: [], error: '',
    };
    if (c.status === 'verified') {
      try {
        const res = checks(c);
        for (const ch of res.list) {
          const cmp = compare(ch.q, ch.actual, ch.expected, ch.tol);
          item.checks.push({ q: ch.q, ref: ch.ref || '', expected: ch.expected, actual: typeof ch.actual === 'number' ? ch.actual : null,
            tolerance: tolText(ch.tol), reason: ch.tol.reason || '', ok: cmp.ok, known: ch.known || '' });
        }
        for (const w of c.expectedWarnings || []) item.warnings.push({ code: w, ok: res.warnings.includes(w) });
      } catch (e) { item.error = String(e && e.message || e); }
    }
    items.push(item);
  }
  return items;
}
function tolText(t) {
  if (t.abs !== undefined) return `mutlaq ${t.abs}`;
  return `nisbiy ${t.rel}` + (t.absZero !== undefined ? ` (0 uchun mutlaq ${t.absZero})` : '');
}
function summarizeCases(items) {
  const s = { total: items.length, verified: 0, unverified: 0, pending: 0, quantities: 0, passed: 0, failed: 0, todo: 0, todoPassing: 0, errors: 0, discrepancies: [] };
  const d = new Set();
  for (const c of items) {
    s[c.status] = (s[c.status] || 0) + 1;
    if (c.error) s.errors++;
    for (const ch of c.checks) {
      s.quantities++;
      if (ch.known) { s.todo++; d.add(ch.known); if (ch.ok) s.todoPassing++; }
      else if (ch.ok) s.passed++; else s.failed++;
    }
    for (const w of c.warnings) { s.quantities++; if (w.ok) s.passed++; else s.failed++; }
  }
  s.discrepancies = [...d].sort();
  return s;
}

/* ─── 3. Brauzerlararo natija (tests/crossbrowser/run.js) ─── */
function summarizeCrossBrowser(j) {
  if (!j || j.format !== 'uc-crossbrowser/1' || !Array.isArray(j.browsers)) return { run: false };
  return {
    run: true, ok: !!j.ok, engineVersion: j.engineVersion || '', reference: j.reference || {}, relLimit: j.relLimit, cases: j.cases, monteCarloCases: j.monteCarloCases,
    playwright: j.playwright || '', exceptions: j.exceptions || null,
    browsers: j.browsers.map(b => ({
      browser: String(b.browser), version: String(b.version || ''), environment: b.environment || null, ok: !!b.ok, launchError: b.launchError || '',
      cases: b.cases || 0, numeric: b.numeric || 0, differing: b.differing || 0,
      maxRelStrict: b.maxRelStrict || 0, maxRel: b.maxRel || 0, maxRelCase: b.maxRelCase || '', maxRelPath: b.maxRelPath || '',
      over: (b.over || []).map(o => ({ id: o.id, path: o.path, rel: o.rel })),
      excepted: (b.excepted || []).map(o => ({ id: o.id, path: o.path, rel: o.rel })),
      display: (b.display || []).map(o => ({ id: o.id, path: o.path, node: o.node, browser: o.browser })),
      structural: (b.structural || []).length, errors: (b.errors || []).map(o => ({ id: o.id, error: o.error })),
      rngIdentical: !!(b.rng && b.rng.identical), rngValues: b.rng ? b.rng.values : 0,
    })),
  };
}

/* ─── 4. Mustaqil o'zaro tekshiruv (NIST Uncertainty Machine) ─── */
function collectCrossCheck(root) {
  const dir = path.join(root, 'tests/crosscheck/num');
  if (!fs.existsSync(dir)) return { items: [] };
  const items = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { id: j.id, case: j.case || '', kind: j.kind || '', status: j.status || 'pending', tool: j.tool || 'NIST Uncertainty Machine', results: j.results ? Object.keys(j.results).length : 0 };
  });
  return { items };
}

/* ─── Yig'ish ─── */
/**
 * @param {object} i  { generatedAt, commit, engineVersion, engineHash, node, tests, cases, rtm: { summary, rows, errors }, crossBrowser, crossCheck }
 */
function buildReport(i) {
  const cases = { summary: summarizeCases(i.cases), items: i.cases };
  const cb = summarizeCrossBrowser(i.crossBrowser);
  const rtm = { ...i.rtm.summary, errors: i.rtm.errors, rows: i.rtm.rows };
  const ok = i.tests.fail === 0 && cases.summary.failed === 0 && cases.summary.errors === 0 && rtm.errors.length === 0 && (!cb.run || cb.ok);
  return {
    format: FORMAT, app: 'UncertaintyCalc', generatedAt: i.generatedAt, commit: i.commit, engineVersion: i.engineVersion, engineHash: i.engineHash, node: i.node,
    ok, tests: i.tests, cases, rtm, crossBrowser: cb, crossCheck: i.crossCheck,
  };
}

/* ─── HTML (skriptsiz) ─── */
const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";
const STYLE = `
  body { font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c2333; background: #f6f7fb; margin: 0; }
  main { max-width: 1180px; margin: 0 auto; padding: 24px 20px 64px; background: #fff; }
  h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 18px; margin: 2em 0 .6em; border-bottom: 1px solid #e3e6ee; padding-bottom: 4px; } h3 { font-size: 15px; margin: 1.4em 0 .4em; }
  table { border-collapse: collapse; font-size: 12.5px; margin: .6em 0; width: 100%; } th, td { border: 1px solid #d8dce8; padding: 4px 8px; text-align: left; vertical-align: top; }
  th { background: #f0f2f7; } td.num { font: 12px/1.4 ui-monospace, Consolas, monospace; white-space: nowrap; } table.kv { width: auto; } table.kv th { white-space: nowrap; }
  code { font: 12px/1.4 ui-monospace, Consolas, monospace; background: #f0f2f7; padding: 1px 4px; border-radius: 3px; overflow-wrap: anywhere; }
  .ok { color: #0a7a3d; font-weight: 600; } .bad { color: #b42318; font-weight: 600; } .warn { color: #9a6700; font-weight: 600; } .muted { color: #6b7389; }
  .banner { padding: 10px 14px; border-radius: 6px; margin: 12px 0; font-weight: 600; } .banner.ok { background: #e7f6ec; } .banner.bad { background: #fdecea; }
  details { margin: 4px 0; border: 1px solid #e3e6ee; border-radius: 6px; padding: 4px 10px; } summary { cursor: pointer; padding: 4px 0; } .wrap { overflow-x: auto; }
  pre { background: #f0f2f7; padding: 8px; border-radius: 6px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; }
  @media print { body { background: #fff; } main { max-width: none; padding: 0; } details { border: 0; padding: 0; } }
`;
const num = v => (v === null || v === undefined ? '—' : typeof v === 'number' ? (Number.isFinite(v) ? String(v) : String(v)) : String(v));
const sci = v => (typeof v === 'number' && v > 0 ? v.toExponential(2) : '0');
const mark = (ok, yes = 'o\'tdi', no = 'O\'TMADI') => (ok ? `<span class="ok">${esc(yes)}</span>` : `<span class="bad">${esc(no)}</span>`);
const STATUS_TEXT = { verified: '✅ verified', 'verified-discrepancy': '⚠️ verified (farq bilan)', unverified: '❔ unverified', pending: '⏳ pending', manual: '✋ manual' };
const kv = rows => `<table class="kv">${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join('')}</table>`;

function renderHtml(r) {
  const t = r.tests, cs = r.cases.summary, cb = r.crossBrowser;
  const h = [];
  h.push(`<h1>UncertaintyCalc — validatsiya hisoboti</h1>
<p class="muted">Avtomatik yaratilgan (<code>scripts/validation-report.js</code>). Qo'lda tahrirlanmaydi. Asos: ISO/IEC 17025:2017 §7.11.2 — <em>unverified</em> (standart matni loyihada yo'q).</p>
<div class="banner ${r.ok ? 'ok' : 'bad'}">${r.ok ? 'Barcha avtomatik tekshiruvlar o\'tdi' : 'DIQQAT: avtomatik tekshiruvlarning ba\'zilari o\'tmadi — quyida'}</div>`);
  h.push(kv([
    ['Sana (UTC)', esc(r.generatedAt)], ['Commit', `<code>${esc(r.commit)}</code>`], ['ENGINE_VERSION', esc(r.engineVersion)],
    ['Dvigatel xeshi (SHA-256, src/engine + src/report)', `<code>${esc(r.engineHash)}</code>`], ['Node.js', esc(r.node)],
    ['Testlar', `${t.total} ta (${t.files} fayl): ${mark(t.fail === 0, `o'tdi ${t.pass}`, `o'tdi ${t.pass}`)}, yiqildi ${t.fail ? `<span class="bad">${t.fail}</span>` : '0'}, todo ${t.todo}, o'tkazib yuborilgan ${t.skipped}`],
    ['Manba misollari', `${cs.total} ta: verified ${cs.verified}, unverified ${cs.unverified}, pending ${cs.pending}; solishtirilgan kattaliklar ${cs.quantities}: o'tdi ${cs.passed}, o'tmadi ${cs.failed ? `<span class="bad">${cs.failed}</span>` : '0'}, ma'lum farq (todo) ${cs.todo}`],
    ['Talablar (RTM)', `${r.rtm.requirements} ta; testga bog'langan ${r.rtm.linked}; ` + Object.entries(r.rtm.byStatus).map(([k, v]) => `${esc(STATUS_TEXT[k] || k)}: ${v}`).join(', ') + `; bog'lanmagan: ${r.rtm.unlinked.length ? `<span class="bad">${r.rtm.unlinked.length}</span>` : '0'}`],
    ['Brauzerlararo tekshiruv', cb.run ? cb.browsers.map(b => `${esc(b.browser)} ${esc(b.version)} — ${mark(b.ok)}`).join('; ') : '<span class="warn">bu yig\'ishda bajarilmagan</span>'],
    ['Mustaqil o\'zaro tekshiruv (NIST Uncertainty Machine)', r.crossCheck.items.length ? `${r.crossCheck.items.filter(x => x.status === 'owner-run').length} / ${r.crossCheck.items.length} misol bo'yicha natija kiritilgan` + (r.crossCheck.items.every(x => x.status !== 'owner-run') ? ' — <span class="warn">pending</span>' : '') : 'yo\'q'],
  ]));

  // Testlar
  h.push('<h2 id="tests">1. Avtomatik testlar</h2>');
  h.push(`<p>Buyruq: <code>npm test</code> (<code>node --test</code>). Jami ${t.total} test, ${t.files} fayl.</p>`);
  if (t.failed.length) h.push('<h3>Yiqilgan testlar</h3><div class="wrap"><table><tr><th>Fayl</th><th>Test</th><th>Xato</th></tr>' + t.failed.map(x => `<tr><td><code>${esc(x.file)}</code></td><td>${esc(x.name)}</td><td><pre>${esc(x.error)}</pre></td></tr>`).join('') + '</table></div>');
  else h.push('<p class="ok">Yiqilgan test yo\'q.</p>');
  if (t.todoList.length) h.push(`<details><summary>todo — ma'lum farqlar va kutilayotgan manbalar (${t.todoList.length})</summary><div class="wrap"><table><tr><th>Fayl</th><th>Test</th><th>Sabab</th><th>Hozirgi holat</th></tr>` + t.todoList.map(x => `<tr><td><code>${esc(x.file)}</code></td><td>${esc(x.name)}</td><td>${esc(x.reason)}</td><td>${x.passing ? 'o\'tadi' : 'o\'tmaydi (kutilgan)'}</td></tr>`).join('') + '</table></div></details>');
  if (t.skippedList.length) h.push(`<details><summary>O'tkazib yuborilgan (${t.skippedList.length})</summary><div class="wrap"><table><tr><th>Fayl</th><th>Test</th><th>Sabab</th></tr>` + t.skippedList.map(x => `<tr><td><code>${esc(x.file)}</code></td><td>${esc(x.name)}</td><td>${esc(x.reason)}</td></tr>`).join('') + '</table></div></details>');

  // Misollar
  h.push('<h2 id="cases">2. Manba misollari (tests/cases/)</h2>');
  h.push('<p>Kutilgan qiymatlar faqat asl manbadan (hujjat bandi / sahifasi yoki laboratoriya Excel\'i katagi). <strong>verified</strong> — majburiy; <strong>unverified</strong> / <strong>pending</strong> — ishga tushirilmaydi yoki xato bermaydi. Ma\'lum farqlar (D-ID): <code>tests/cases/DISCREPANCIES.md</code>' + (cs.discrepancies.length ? ` — bu hisobotda: ${cs.discrepancies.map(esc).join(', ')}` : '') + '.</p>');
  h.push('<div class="wrap"><table><tr><th>ID</th><th>Manba</th><th>Holat</th><th>Kattaliklar</th><th>Natija</th></tr>' + r.cases.items.map(c => {
    const failed = c.checks.filter(x => !x.ok && !x.known).length + c.warnings.filter(w => !w.ok).length, known = c.checks.filter(x => x.known).length;
    const res = c.status !== 'verified' ? `<span class="muted">${esc(c.status)}${c.enabledIn ? ' → ' + esc(c.enabledIn) : ''}</span>` : c.error ? '<span class="bad">ishga tushmadi</span>' : failed ? `<span class="bad">o'tmadi: ${failed}</span>` : `<span class="ok">o'tdi</span>${known ? ` <span class="warn">(todo ${known})</span>` : ''}`;
    return `<tr><td><a href="#case-${esc(c.id)}"><code>${esc(c.id)}</code></a></td><td>${esc(c.source.doc)}${c.source.section ? ', ' + esc(c.source.section) : ''}${c.source.page ? ', ' + esc(c.source.page) + '-bet' : ''}</td><td>${esc(c.status)}</td><td>${c.checks.length + c.warnings.length || '—'}</td><td>${res}</td></tr>`;
  }).join('') + '</table></div>');
  h.push('<h3>Misollar bo\'yicha tafsilot</h3>');
  for (const c of r.cases.items) {
    const body = [];
    body.push(`<p>${esc(c.title)}<br><span class="muted">Manba: ${esc(c.source.doc)}${c.source.section ? '; ' + esc(c.source.section) : ''}${c.source.page ? '; sahifa ' + esc(c.source.page) : ''}${c.source.file ? '; fayl ' + esc(c.source.file) : ''}. Usul: ${esc(c.method)}. Soha: ${esc(c.domain)}.</span></p>`);
    if (c.statusReason) body.push(`<p class="warn">${esc(c.status)}: ${esc(c.statusReason)}</p>`);
    if (c.error) body.push(`<pre class="bad">${esc(c.error)}</pre>`);
    if (c.checks.length) body.push('<div class="wrap"><table><tr><th>Kattalik</th><th>Manba havolasi</th><th>Kutilgan</th><th>Olingan</th><th>Tolerans</th><th>Tolerans sababi</th><th>Natija</th></tr>' + c.checks.map(x =>
      `<tr><td><code>${esc(x.q)}</code></td><td>${esc(x.ref)}</td><td class="num">${esc(num(x.expected))}</td><td class="num">${esc(num(x.actual))}</td><td>${esc(x.tolerance)}</td><td>${esc(x.reason)}</td><td>${x.known ? `<span class="warn">todo ${esc(x.known)}${x.ok ? ' (endi mos)' : ''}</span>` : mark(x.ok)}</td></tr>`).join('') + '</table></div>');
    if (c.warnings.length) body.push('<p>Kutilgan ogohlantirishlar: ' + c.warnings.map(w => `<code>${esc(w.code)}</code> — ${mark(w.ok, 'bor', 'YO\'Q')}`).join('; ') + '</p>');
    h.push(`<details id="case-${esc(c.id)}"><summary><code>${esc(c.id)}</code> — ${esc(c.status)}</summary>${body.join('')}</details>`);
  }

  // RTM
  h.push('<h2 id="rtm">3. Talablar izlanuvchanligi (RTM)</h2>');
  h.push(`<p>Manba: <code>docs/validation/REQUIREMENTS.md</code> + <code>docs/validation/rtm.map.json</code>; tekshiruv: <code>scripts/rtm.js</code>. Qoida: har bir talab kamida bitta testga bog'langan yoki aniq belgisi bor (unverified / pending / manual).</p>`);
  if (r.rtm.errors.length) h.push('<h3 class="bad">RTM xatolari</h3><ul>' + r.rtm.errors.map(e => `<li class="bad">${esc(e)}</li>`).join('') + '</ul>');
  else h.push('<p class="ok">Bog\'lanmagan talab yo\'q; barcha kod va test havolalari mavjud.</p>');
  const open = r.rtm.rows.filter(x => x.status !== 'verified');
  h.push(`<details open><summary>Holati "verified" bo'lmagan talablar (${open.length})</summary><div class="wrap"><table><tr><th>ID</th><th>Talab</th><th>Holat</th><th>Izoh</th></tr>` + open.map(x => `<tr><td><code>${esc(x.id)}</code></td><td>${esc(x.text)}</td><td>${esc(STATUS_TEXT[x.status] || x.status)}</td><td>${esc([x.discrepancies.join(', '), x.note].filter(Boolean).join(' — '))}</td></tr>`).join('') + '</table></div></details>');
  h.push(`<details><summary>To'liq matritsa (${r.rtm.rows.length} talab)</summary><div class="wrap"><table><tr><th>ID</th><th>Talab</th><th>Kod</th><th>Test</th><th>Holat</th></tr>` + r.rtm.rows.map(x => `<tr><td><code>${esc(x.id)}</code></td><td>${esc(x.text)}</td><td>${x.code.map(c => `<code>${esc(c)}</code>`).join(' ') || '—'}</td><td>${x.tests.map(c => `<code>${esc(c)}</code>`).join(' ') || '—'}</td><td>${esc(STATUS_TEXT[x.status] || x.status)}</td></tr>`).join('') + '</table></div></details>');

  // Brauzerlar
  h.push('<h2 id="browsers">4. Brauzerlararo takrorlanuvchanlik</h2>');
  h.push('<p>Egasi qarori (2026-11-19, <code>docs/RISKS.md</code> R-24): turli JS dvigatellarida matematik funksiyalar (log, sin, cos, pow) oxirgi xonada farq qilishi mumkin. Mezon: (1) hisobot qatlamida yaxlitlangan y, U, k, interval uchlari <strong>aynan bir xil</strong>; (2) R(0, 1) ketma-ketligi (kengaytirilgan Wichmann–Hill) bit darajasida bir xil; (3) xom qiymatlarning nisbiy farqi ≤ 1·10⁻¹⁴ — o\'lchangan qiymat quyida. Tayanch — Node.js natijasi. Linux dagi Playwright WebKit — Safari <strong>emas</strong>: Safari (macOS / iOS) qo\'lda, laboratoriya tekshiruvida (PQ) sinaladi.</p>');
  if (!cb.run) h.push('<p class="warn">Bu yig\'ishda brauzer tekshiruvi natijasi berilmagan (<code>npm run test:browsers</code> — CI da <code>validation</code> job).</p>');
  else {
    h.push(`<p>Tayanch: ${esc((cb.reference && cb.reference.node) || '')}; misollar: ${cb.cases} (shundan Monte-Karlo: ${cb.monteCarloCases}); Playwright ${esc(cb.playwright)}; chegara ${esc(String(cb.relLimit))}.</p>`);
    h.push('<div class="wrap"><table><tr><th>Brauzer</th><th>Versiya</th><th>Hisobotdagi muhit yozuvi</th><th>Misollar</th><th>Solishtirilgan sonlar</th><th>Farq qiladigan</th><th>Maks. nisbiy farq</th><th>Istisnolar (maks.)</th><th>Yaxlitlangan farq</th><th>R(0, 1)</th><th>Natija</th></tr>' + cb.browsers.map(b => b.launchError
      ? `<tr><td>${esc(b.browser)}</td><td colspan="9" class="bad">ishga tushmadi: ${esc(b.launchError)}</td><td>${mark(false)}</td></tr>`
      : `<tr><td>${esc(b.browser)}</td><td>${esc(b.version)}</td><td>${b.environment ? esc(`${b.environment.name} ${b.environment.version} (${b.environment.engine})`) : '—'}</td><td>${b.cases}</td><td>${b.numeric}</td><td>${b.differing}</td><td class="num">${esc(sci(b.maxRelStrict))}</td><td class="num">${b.excepted.length} ta (${esc(sci(b.maxRel))})</td><td>${b.display.length ? `<span class="bad">${b.display.length}</span>` : '0'}</td><td>${mark(b.rngIdentical, 'bir xil', 'FARQ')}</td><td>${mark(b.ok)}</td></tr>`).join('') + '</table></div>');
    for (const b of cb.browsers) {
      if (b.display.length) h.push(`<h3 class="bad">${esc(b.browser)}: yaxlitlangan natija farq qiladi</h3><ul>` + b.display.map(o => `<li><code>${esc(o.id)}</code> ${esc(o.path)}: Node "${esc(o.node)}" ≠ brauzer "${esc(o.browser)}"</li>`).join('') + '</ul>');
      if (b.over.length) h.push(`<h3 class="bad">${esc(b.browser)}: chegaradan oshgan xom qiymatlar</h3><ul>` + b.over.map(o => `<li><code>${esc(o.id)}</code> ${esc(o.path)}: ${esc(sci(o.rel))}</li>`).join('') + '</ul>');
      if (b.errors.length) h.push(`<h3 class="bad">${esc(b.browser)}: xatolar</h3><ul>` + b.errors.map(o => `<li><code>${esc(o.id)}</code>: ${esc(o.error)}</li>`).join('') + '</ul>');
      if (b.excepted.length) h.push(`<details><summary>${esc(b.browser)}: istisnolar ro'yxatidagi kattaliklar (${b.excepted.length})</summary><ul>` + b.excepted.map(o => `<li><code>${esc(o.id)}</code> ${esc(o.path)}: ${esc(sci(o.rel))}</li>`).join('') + '</ul></details>');
    }
    if (cb.exceptions) h.push(`<p class="warn">Istisnolar: shartlanganligi yomon hosila kattaliklar (deyarli singular matritsaning eng kichik xos qiymati, nolga yaqin korrelyatsiya, sonli hosila tekshiruvi va h.k.) uchun 1·10⁻¹⁴ chegarasi qo'llanmaydi; ular ro'yxatda (<code>tests/crossbrowser/exceptions.json</code>, ${cb.exceptions.items} band, yuqori chegara ${esc(String(cb.exceptions.ceiling))}) — holati: ${esc(cb.exceptions.status)}.</p>`);
  }

  // O'zaro tekshiruv
  h.push('<h2 id="crosscheck">5. Mustaqil o\'zaro tekshiruv</h2>');
  h.push('<p>NIST Uncertainty Machine (NUM) bilan solishtirish: kirish ma\'lumotlari <code>tests/crosscheck/num/</code> da; NUM ni loyiha egasi ishga tushiradi va natijalarni kiritadi (<code>status: "owner-run"</code>). NUM qo\'llanmasi loyihada yo\'q — <em>unverified</em>. PTB TraCIM — rejalashtirilgan (qilinmagan).</p>');
  if (r.crossCheck.items.length) h.push('<div class="wrap"><table><tr><th>ID</th><th>Asos misol</th><th>Turi</th><th>Holat</th></tr>' + r.crossCheck.items.map(x => `<tr><td><code>${esc(x.id)}</code></td><td><code>${esc(x.case)}</code></td><td>${esc(x.kind)}</td><td>${x.status === 'owner-run' ? `<span class="ok">natija kiritilgan (${x.results} kattalik)</span>` : '<span class="warn">pending — natija kutilmoqda</span>'}</td></tr>`).join('') + '</table></div>');

  h.push('<h2 id="limits">6. Cheklovlar</h2><p>Ma\'lum cheklovlarning yagona ro\'yxati: <code>docs/validation/KNOWN_LIMITATIONS.md</code>. Bu hisobot faqat avtomatik tekshiruvlarni qamraydi; laboratoriyaning o\'z metodikasi bo\'yicha parallel hisobi (PQ) — <code>docs/validation/PQ_PROTOCOL_TEMPLATE.md</code>.</p>');
  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="no-referrer">
<title>UncertaintyCalc ${esc(r.engineVersion)} — validatsiya hisoboti</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${h.join('\n')}
</main>
</body>
</html>
`;
}

function gitCommit(root) {
  if (/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA || '')) return process.env.GITHUB_SHA;
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (_) { return 'unknown'; }
}

module.exports = { buildReport, renderHtml, summarizeTests, summarizeCases, summarizeCrossBrowser, collectCases, collectCrossCheck, FORMAT, CSP };

if (require.main === module) {
  const a = Object.fromEntries(process.argv.slice(2).filter(s => s.startsWith('--')).map(s => { const [k, ...v] = s.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
  const out = path.resolve(typeof a.out === 'string' ? a.out : path.join(ROOT, '_validation'));
  const { engineHash } = require('../tests/tools/engine-hash.js');
  const { loadRtm } = require('./rtm.js');
  const rtm = loadRtm(ROOT);
  let crossBrowser = null;
  if (typeof a.crossbrowser === 'string' && fs.existsSync(a.crossbrowser)) crossBrowser = JSON.parse(fs.readFileSync(a.crossbrowser, 'utf8'));
  const tests = a['skip-tests'] ? summarizeTests([]) : runTests(ROOT);
  const report = buildReport({
    generatedAt: new Date().toISOString(), commit: gitCommit(ROOT), engineVersion: require('../src/engine/version.js').ENGINE_VERSION,
    engineHash: engineHash().sha256, node: process.version, tests, cases: collectCases(ROOT),
    rtm: { summary: rtm.checked.summary, rows: rtm.checked.rows, errors: rtm.checked.errors }, crossBrowser, crossCheck: collectCrossCheck(ROOT),
  });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'validation-report.json'), JSON.stringify(report, null, 1) + '\n');
  fs.writeFileSync(path.join(out, 'validation-report.html'), renderHtml(report));
  const t = report.tests, c = report.cases.summary;
  console.log(`validatsiya hisoboti → ${path.relative(process.cwd(), out)}/validation-report.{html,json}`);
  console.log(`  testlar: ${t.total} (o'tdi ${t.pass}, yiqildi ${t.fail}, todo ${t.todo}, skip ${t.skipped}); misollar: ${c.total} (verified ${c.verified}, unverified ${c.unverified}, pending ${c.pending}); kattaliklar: ${c.quantities} (o'tdi ${c.passed}, o'tmadi ${c.failed}, todo ${c.todo})`);
  console.log(`  RTM: ${report.rtm.requirements} talab, xato ${report.rtm.errors.length}; brauzerlar: ${report.crossBrowser.run ? (report.crossBrowser.ok ? 'o\'tdi' : 'O\'TMADI') : 'bajarilmagan'}; umumiy: ${report.ok ? 'OK' : 'XATO'}`);
  if (a.strict && !report.ok) process.exit(1);
}
