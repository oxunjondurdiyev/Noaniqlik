#!/usr/bin/env node
/* TESTS/CROSSBROWSER/RUN.JS — brauzerlararo takrorlanuvchanlik tekshiruvi (P13, docs/RISKS.md R-24, egasi qarori B).
   Har bir brauzerda (Playwright: Chromium, Firefox, WebKit) saytdagi AYNAN o'sha dvigatel modullari tests/cases/ dagi
   barcha misollarni hisoblaydi; natija shu jarayondagi Node natijasi bilan solishtiriladi:
     • xom qiymatlar: nisbiy farq ≤ 1·10⁻¹⁴ (o'lchangan maksimal farq yoziladi);
     • hisobot qatlamida yaxlitlangan y, U, k, interval uchlari (core.js::displayOf) — AYNAN bir xil;
     • R(0, 1) ketma-ketligi (kengaytirilgan Wichmann–Hill) — bit darajasida bir xil.
   Ishga tushirish:  npm run test:browsers  [-- --browsers=chromium,firefox,webkit --out=crossbrowser-results.json --cases=<id qismi>]
   Brauzerlar:       npx playwright install --with-deps chromium firefox webkit   (CI da; versiya — package.json)
   Tarmoq: sahifa faqat lokal serverga (127.0.0.1) murojaat qiladi — boshqa har qanday so'rov bekor qilinadi va xato sanaladi.
   Eslatma: Linux dagi Playwright WebKit — Safari EMAS; Safari (macOS / iOS) qo'lda, PQ da tekshiriladi. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.js';
import { snapshotCase, rngSequence, encode, diffTrees, REL_LIMIT, RNG_SAMPLE, RNG_SEEDS } from './core.js';
import * as engine from '../../src/engine/index.js';
import { roundResult } from '../../src/report/rounding.js';
import { nodeEnvironment } from '../../src/io/env.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ALL = ['chromium', 'firefox', 'webkit'];
const IGNORE = p => /(^|\.)engineVersion$/.test(p);

function args() {
  const a = Object.fromEntries(process.argv.slice(2).filter(s => s.startsWith('--')).map(s => { const [k, ...v] = s.slice(2).split('='); return [k, v.join('=') || '1']; }));
  return {
    browsers: (a.browsers || process.env.UC_BROWSERS || ALL.join(',')).split(',').map(s => s.trim()).filter(Boolean),
    out: path.resolve(a.out || 'crossbrowser-results.json'),
    filter: a.cases || '',
  };
}

/** Bitta brauzer natijasini Node tayanchi bilan solishtirish (sof — tests/validation/crossbrowser.test.js da ham ishlatiladi). */
export function compareRun(reference, actual, exceptions) {
  const ex = exceptions && Array.isArray(exceptions.items) ? exceptions : { ceiling: 0, items: [] };
  const rules = ex.items.map(x => ({ id: x.case, re: new RegExp(x.path) }));
  const excepted = (id, p, rel) => rel <= ex.ceiling && rules.some(r => r.id === id && r.re.test(p));
  // maxRel — barcha qiymatlar bo'yicha; maxRelStrict — istisnolar ro'yxatiga kirmaganlar bo'yicha (mezon B: ≤ REL_LIMIT)
  const out = { cases: 0, numeric: 0, differing: 0, maxRel: 0, maxRelCase: '', maxRelPath: '', maxRelStrict: 0, over: [], excepted: [], structural: [], display: [], errors: [] };
  const byId = new Map(actual.map(c => [c.id, c]));
  for (const ref of reference) {
    const got = byId.get(ref.id);
    out.cases++;
    if (!got) { out.errors.push({ id: ref.id, error: 'natija yo\'q' }); continue; }
    if (ref.error || got.error) {
      if (ref.error !== got.error) out.errors.push({ id: ref.id, error: `Node: ${ref.error || 'ok'}; brauzer: ${got.error || 'ok'}` });
      continue;
    }
    const d = diffTrees(ref.result, got.result, { rel: REL_LIMIT, ignore: IGNORE });
    out.numeric += d.numeric; out.differing += d.differing;
    if (d.maxRel > out.maxRel) { out.maxRel = d.maxRel; out.maxRelCase = ref.id; out.maxRelPath = d.maxRelPath; }
    for (const o of d.over) (excepted(ref.id, o.path, o.rel) ? out.excepted : out.over).push({ id: ref.id, ...o });
    const strict = diffTrees(ref.result, got.result, { rel: REL_LIMIT, ignore: p => IGNORE(p) || rules.some(r => r.id === ref.id && r.re.test(p)) });
    if (strict.maxRel > out.maxRelStrict) out.maxRelStrict = strict.maxRel;
    for (const s of d.structural) out.structural.push({ id: ref.id, what: s });
    const keys = new Set([...Object.keys(ref.display), ...Object.keys(got.display)]);
    for (const k of keys) if (ref.display[k] !== got.display[k]) out.display.push({ id: ref.id, path: k, node: ref.display[k] ?? null, browser: got.display[k] ?? null });
  }
  out.ok = !out.over.length && !out.structural.length && !out.display.length && !out.errors.length;
  return out;
}

async function runBrowser(name, playwright, server, cases, reference, refRng, exceptions) {
  const t0 = Date.now();
  const launch = {};
  if (name === 'chromium' && process.env.UC_CHROMIUM_PATH) launch.executablePath = process.env.UC_CHROMIUM_PATH;
  const browser = await playwright[name].launch(launch);
  const row = { browser: name, version: browser.version() };
  try {
    const page = await browser.newPage();
    const blocked = [], pageErrors = [];
    await page.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.hostname === '127.0.0.1') return route.continue();
      blocked.push(u.origin);
      return route.abort();
    });
    page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
    await page.goto(server.url + '/tests/crossbrowser/page.html');
    await page.waitForFunction(() => window.ucCrossReady === true, null, { timeout: 60000 });
    row.environment = await page.evaluate(() => window.ucCross.env());
    row.engineVersion = await page.evaluate(() => window.ucCross.engineVersion);
    // R(0, 1): bit darajasida
    row.rng = { seeds: RNG_SEEDS.length, values: RNG_SAMPLE * RNG_SEEDS.length, identical: true };
    for (const seed of RNG_SEEDS) {
      const got = await page.evaluate(([s, n]) => window.ucCross.rng(s, n), [seed, RNG_SAMPLE]);
      if (JSON.stringify(got) !== JSON.stringify(refRng[seed])) row.rng.identical = false;
    }
    const actual = [];
    for (const c of cases) actual.push(await page.evaluate(x => window.ucCross.run(x), c));
    Object.assign(row, compareRun(reference, actual, exceptions));
    row.blockedRequests = [...new Set(blocked)];
    row.pageErrors = pageErrors;
    row.ok = row.ok && row.rng.identical && !blocked.length && !pageErrors.length && row.engineVersion === engine.ENGINE_VERSION;
  } finally {
    await browser.close();
  }
  row.durationMs = Date.now() - t0;
  return row;
}

async function main() {
  const opt = args();
  const { loadCases } = require('../cases/lib.js');
  const cases = loadCases().filter(c => c.modelSpec && (!opt.filter || c.id.includes(opt.filter)))
    .map(c => ({ id: c.id, run: c.run, modelSpec: JSON.parse(JSON.stringify(encodeSpec(c.modelSpec))) }));
  const reference = cases.map(c => snapshotCase(engine, roundResult, c));
  const refRng = Object.fromEntries(RNG_SEEDS.map(s => [s, encode(rngSequence(engine, s))]));
  const exceptions = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/crossbrowser/exceptions.json'), 'utf8'));
  const playwright = require('playwright');
  const server = await startServer(ROOT);
  const result = {
    format: 'uc-crossbrowser/1',
    engineVersion: engine.ENGINE_VERSION,
    reference: { ...nodeEnvironment(process.version), node: process.version },
    relLimit: REL_LIMIT,
    exceptions: { status: exceptions.status, ceiling: exceptions.ceiling, items: exceptions.items.length },
    cases: cases.length,
    monteCarloCases: cases.filter(c => (c.run || {}).method === 'monteCarlo').length,
    playwright: require('playwright/package.json').version,
    browsers: [],
  };
  try {
    for (const name of opt.browsers) {
      if (!ALL.includes(name)) throw new Error(`noma'lum brauzer: ${name}`);
      let row;
      try { row = await runBrowser(name, playwright, server, cases, reference, refRng, exceptions); }
      catch (e) { row = { browser: name, ok: false, launchError: String(e && e.message || e).split('\n')[0] }; }
      result.browsers.push(row);
      console.log(row.launchError ? `✗ ${name}: ${row.launchError}`
        : `${row.ok ? '✓' : '✗'} ${name} ${row.version} [${row.environment.name} ${row.environment.version}]: ${row.cases} misol, ${row.numeric} son, farq qiladigan ${row.differing}, ` +
          `maks. nisbiy farq ${row.maxRelStrict.toExponential(2)} (istisnolar bilan ${row.maxRel.toExponential(2)}${row.maxRelCase ? ` — ${row.maxRelCase}: ${row.maxRelPath}` : ''}; istisno ${row.excepted.length} ta); yaxlitlangan farq ${row.display.length}; R(0,1) ${row.rng.identical ? 'bir xil' : 'FARQ QILADI'}; ${(row.durationMs / 1000).toFixed(1)} s`);
      for (const o of (row.over || []).slice(0, 10)) console.log(`    > 1e-14: ${o.id} ${o.path}: Node ${o.a} ≠ ${o.b} (nisbiy ${o.rel.toExponential(2)})`);
      for (const o of (row.structural || []).slice(0, 10)) console.log(`    tuzilma: ${o.id} ${o.what}`);
      for (const o of (row.display || []).slice(0, 10)) console.log(`    YAXLITLANGAN: ${o.id} ${o.path}: Node "${o.node}" ≠ brauzer "${o.browser}"`);
      for (const o of (row.errors || []).slice(0, 10)) console.log(`    xato: ${o.id}: ${o.error}`);
      for (const o of (row.pageErrors || []).slice(0, 5)) console.log(`    sahifa xatosi: ${o}`);
      for (const o of (row.blockedRequests || [])) console.log(`    tashqi so'rov bekor qilindi: ${o}`);
    }
  } finally {
    await server.close();
  }
  result.ok = result.browsers.length > 0 && result.browsers.every(b => b.ok);
  fs.writeFileSync(opt.out, JSON.stringify(result, null, 2) + '\n');
  console.log(`${result.ok ? 'OK' : 'XATO'} → ${path.relative(process.cwd(), opt.out)}`);
  process.exit(result.ok ? 0 : 1);
}

// Misol kiritmasidagi ∞ / NaN (bo'lsa) brauzerga JSON orqali o'tmaydi — ular modelSpec da uchramaydi; uchrasa xato beriladi.
function encodeSpec(spec) {
  JSON.stringify(spec, (k, v) => { if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('modelSpec da chekli bo\'lmagan son'); return v; });
  return spec;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
