#!/usr/bin/env node
/* TESTS/CROSSBROWSER/SITE.JS — yig'ilgan saytning (scripts/build-site.js) brauzerdagi tutun-testi (P13, IQ ning avtomatik qismi).
   Har bir brauzerda: index.html, validation.html, admin.html ochiladi va tekshiriladi:
     • sahifa xatosi (pageerror) yo'q — jumladan modul aralashuvi (`export` xatosi) yo'q;
     • har bir mahalliy .js / .css so'rovida `?v=<shortSha>` bor (versiyasiz modul yuklanmagan);
     • build.json no-store bilan o'qiladi; versiya mos — banner yo'q; build.json yangilansa — banner chiqadi, sahifa QAYTA YUKLANMAYDI;
     • Monte-Karlo Web Worker'i versiyalangan manzildan ishga tushadi va natija beradi.
   Tashqi so'rovlar (shriftlar, Firebase) bekor qilinadi — tarmoqqa chiqilmaydi.
     node tests/crossbrowser/site.js [--browsers=chromium,firefox,webkit] [--out=site-smoke.json] */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const a = Object.fromEntries(process.argv.slice(2).filter(s => s.startsWith('--')).map(s => { const [k, ...v] = s.slice(2).split('='); return [k, v.join('=') || '1']; }));
const browsers = (a.browsers || process.env.UC_BROWSERS || 'chromium,firefox,webkit').split(',').map(s => s.trim()).filter(Boolean);
const COMMIT = '0123456789abcdef0123456789abcdef01234567', SHA = COMMIT.slice(0, 12);
const NEXT = 'fedcba9876543210fedcba9876543210fedcba98';

async function checkBrowser(name, playwright, server, site) {
  const problems = [];
  const launch = {};
  if (name === 'chromium' && process.env.UC_CHROMIUM_PATH) launch.executablePath = process.env.UC_CHROMIUM_PATH;
  const browser = await playwright[name].launch(launch);
  const row = { browser: name, version: browser.version(), pages: [] };
  try {
    for (const file of ['index.html', 'validation.html', 'admin.html']) {
      const page = await browser.newPage();
      const local = [], errors = [];
      await page.route('**/*', route => {
        const u = new URL(route.request().url());
        if (u.hostname !== '127.0.0.1') return route.abort();
        local.push(u.pathname + u.search);
        return route.continue();
      });
      page.on('pageerror', e => errors.push(String(e && e.message || e)));
      await page.goto(`${server.url}/${file}`, { waitUntil: 'load' });
      if (file === 'admin.html') {
        // admin.html kirmagan foydalanuvchini index.html ga yo'naltiradi (istalgan paytda) — bu yerda faqat yuklangan
        // fayllarning versiyalangani va sahifa xatosi yo'qligi tekshiriladi (UCBuild / banner — index va validation da)
        await page.waitForTimeout(1500);
        const unv = local.filter(u => /\.(js|css)(\?|$)/.test(u) && !u.includes(`v=${SHA}`));
        if (unv.length) problems.push(`${file}: versiyasiz so'rovlar: ${unv.slice(0, 5).join(', ')}`);
        if (!local.some(u => u.startsWith('/src/ui/admin-page.js?'))) problems.push(`${file}: sahifa skripti yuklanmadi`);
        if (errors.length) problems.push(`${file}: sahifa xatosi: ${errors.slice(0, 3).join(' | ')}`);
        row.pages.push({ file, requests: local.length });
        await page.close();
        continue;
      }
      await page.waitForFunction(() => !!window.UCBuild, null, { timeout: 30000 });
      const info = await page.evaluate(() => window.UCBuild.info());
      const unversioned = local.filter(u => /\.(js|css)(\?|$)/.test(u) && !u.includes(`v=${SHA}`));
      if (!info || info.shortSha !== SHA) problems.push(`${file}: build.json o'qilmadi`);
      if (await page.evaluate(() => window.UCBuild.loaded) !== SHA) problems.push(`${file}: modul versiyasi aniqlanmadi`);
      if (unversioned.length) problems.push(`${file}: versiyasiz so'rovlar: ${unversioned.slice(0, 5).join(', ')}`);
      if (errors.length) problems.push(`${file}: sahifa xatosi: ${errors.slice(0, 3).join(' | ')}`);
      if (await page.locator('#build-banner').count()) problems.push(`${file}: versiya mos bo'lsa ham banner chiqdi`);
      const row1 = { file, requests: local.length, scripts: local.filter(u => /\.js\?/.test(u)).length };
      if (file === 'index.html') {
        // Monte-Karlo — Web Worker (versiyalangan manzil) orqali
        const mc = await page.evaluate(async () => {
          const spec = { format: 'calc-state/v2', state: { params: ['x'], measurements: { x: [1, 1.1, 0.9, 1.05, 0.95] }, directions: [], model: { formula: 'y = x * 2', unit: '' }, settings: { P: 0.95 }, covB: {}, typeB: [] } };
          const job = window.UCMonteCarlo.run(spec, { mode: 'fixed', M: 20000 }, null);
          const r = await job.promise;
          return { M: r && r.M, error: r && r.error, mean: r && r.mean };
        }).catch(e => ({ error: String(e && e.message || e) }));
        row1.monteCarlo = mc;
        if (!mc || mc.error || mc.M !== 20000) problems.push(`index.html: Monte-Karlo (worker) ishlamadi: ${JSON.stringify(mc)}`);
        if (!local.some(u => u.startsWith('/src/ui/mc/worker.js?') && u.includes(`v=${SHA}`))) problems.push('index.html: worker versiyalangan manzildan yuklanmadi');
      }
      if (file === 'validation.html') {
        await page.waitForFunction(() => document.getElementById('val-build').textContent.length > 3);
        row1.build = await page.locator('#val-build').textContent();
        if (!row1.build.startsWith(SHA)) problems.push('validation.html: build ko\'rsatilmadi');
        if (await page.locator('#val-history tbody tr').count() < 3) problems.push('validation.html: versiyalar tarixi bo\'sh');
        for (const href of await page.locator('#val-links a').evaluateAll(els => els.map(e => e.getAttribute('href')))) {
          if (!fs.existsSync(path.join(site, href))) problems.push(`validation.html: havola uzilgan — ${href}`);
        }
      }
      // yangi deploy: build.json o'zgardi → banner; sahifa qayta yuklanmaydi (belgi saqlanadi)
      const build = JSON.parse(fs.readFileSync(path.join(site, 'build.json'), 'utf8'));
      fs.writeFileSync(path.join(site, 'build.json'), JSON.stringify({ ...build, commit: NEXT, shortSha: NEXT.slice(0, 12) }));
      await page.evaluate(() => { window.__ucMark = 1; });
      const outdated = await page.evaluate(() => window.UCBuild.check());
      const banner = await page.locator('#build-banner').count();
      const kept = await page.evaluate(() => window.__ucMark === 1);
      fs.writeFileSync(path.join(site, 'build.json'), JSON.stringify(build, null, 2) + '\n');
      if (!outdated || banner !== 1) problems.push(`${file}: yangi versiyada banner chiqmadi`);
      if (!kept) problems.push(`${file}: sahifa qayta yuklandi (kiritilgan ma'lumot yo'qolardi)`);
      row.pages.push(row1);
      await page.close();
    }
    // skriptsiz sahifalar: qo'llanma va validatsiya hujjati — CSP buzilishi / xatosiz ochiladi
    for (const file of ['manual/uz.html', 'validation/docs/KNOWN_LIMITATIONS.html', 'validation/validation-report.html']) {
      if (!fs.existsSync(path.join(site, file))) { if (!file.includes('report')) problems.push(`${file}: yo'q`); continue; }
      const page = await browser.newPage();
      const errors = [], reqs = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('request', r => reqs.push(r.url()));
      await page.goto(`${server.url}/${file}`, { waitUntil: 'load' });
      if (errors.length) problems.push(`${file}: ${errors[0]}`);
      if (reqs.length !== 1) problems.push(`${file}: o'zi yetarli emas — qo'shimcha so'rovlar: ${reqs.slice(1, 4).join(', ')}`);
      if (await page.locator('script').count()) problems.push(`${file}: <script> bor`);
      if (!(await page.locator('h1').first().textContent()).trim()) problems.push(`${file}: sarlavha yo'q`);
      await page.close();
    }
  } finally { await browser.close(); }
  row.problems = problems;
  row.ok = !problems.length;
  return row;
}

async function main() {
  const { buildSite } = require('../../scripts/build-site.js');
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-site-'));
  const validation = a.validation ? path.resolve(a.validation) : (fs.existsSync(path.join(ROOT, '_validation/validation-report.html')) ? path.join(ROOT, '_validation') : null);
  buildSite({ out: site, commit: COMMIT, validation });
  const server = await startServer(site);
  const playwright = require('playwright');
  const result = { format: 'uc-site-smoke/1', browsers: [] };
  try {
    for (const name of browsers) {
      let row;
      try { row = await checkBrowser(name, playwright, server, site); } catch (e) { row = { browser: name, ok: false, problems: [String(e && e.message || e).split('\n')[0]] }; }
      result.browsers.push(row);
      console.log(`${row.ok ? '✓' : '✗'} ${name} ${row.version || ''}: yig'ilgan sayt${row.ok ? ' — xatosiz, barcha so\'rovlar versiyalangan, banner ishlaydi' : ''}`);
      for (const p of row.problems) console.log('    ' + p);
    }
  } finally {
    await server.close();
    fs.rmSync(site, { recursive: true, force: true });
  }
  result.ok = result.browsers.every(b => b.ok);
  if (a.out) fs.writeFileSync(path.resolve(a.out), JSON.stringify(result, null, 2) + '\n');
  process.exit(result.ok ? 0 : 1);
}
main().catch(e => { console.error(e); process.exit(1); });
