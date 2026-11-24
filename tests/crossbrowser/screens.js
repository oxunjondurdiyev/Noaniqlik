#!/usr/bin/env node
/* TESTS/CROSSBROWSER/SCREENS.JS — P16 (Interfeys 2.0): skrinshot va kirish imkoniyati testi (haqiqiy brauzer, Playwright).
   Ekranlar: Model, Ma'lumotlar (P22-1), Natijalar, Kiritish (B tur varag'i), QC, Hisobot, Vizual laboratoriya, AI sahifasi (ai.html) — 390×844, 834×1194, 1440×900;
   qorong'i va yorug' mavzu. Skrinshotlar `--out` papkasiga (CI artifact — egasi kontsept bilan solishtiradi).
   Har bir ekranda AVTOMATIK tekshiruv (birortasi buzilsa — chiqish kodi 1):
     • konsolda xato / sahifa xatosi / CSP buzilishi yo'q (build.json 404 — lokal ishlashda kutilgan holat);
     • gorizontal sahifa surilishi yo'q (ichki scroll qutilari bundan mustasno);
     • bosiladigan elementlar (button, a.btn, select, matn maydoni) ≥ 44 px balandlikda;
     • ko'rinadigan matn kontrasti ≥ 4,5:1 (yirik matn ≥ 3:1) — hisoblangan uslublardan, shaffof fonlar ustma-ust qo'yiladi
       (WCAG 2.1 §1.4.3; o'z tekshiruvchimiz — tashqi kutubxonasiz);
     • klaviatura: Ctrl+K qidiruvni ochadi, Esc yopadi; fokus ko'rinadi (outline).
     • prefers-reduced-motion: reduce da ishlayotgan animatsiya yo'q.
   Tashqi so'rovlar bekor qilinadi (tarmoqqa chiqilmaydi).
     node tests/crossbrowser/screens.js [--out=_screens] [--browsers=chromium] [--sizes=390x844,834x1194,1440x900] */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const a = Object.fromEntries(process.argv.slice(2).filter(s => s.startsWith('--')).map(s => { const [k, ...v] = s.slice(2).split('='); return [k, v.join('=') || '1']; }));
const OUT = path.resolve(a.out || '_screens');
const browsers = (a.browsers || 'chromium').split(',').map(s => s.trim()).filter(Boolean);
const SIZES = (a.sizes || '390x844,834x1194,1440x900').split(',').map(s => s.split('x').map(Number));
const THEMES = ['dark', 'light'];
const MIN_TAP = 44, MIN_CONTRAST = 4.5, MIN_CONTRAST_LARGE = 3;

/* Brauzer ichida bajariladigan tekshiruvlar */
function auditInPage({ minTap, minContrast, minLarge }) {
  const out = { tap: [], contrast: [], overflow: 0, animations: 0 };
  const visible = el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    for (let p = el; p; p = p.parentElement) if (p.hidden || getComputedStyle(p).display === 'none') return false;
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  const scope = document.querySelector('#auth-screen:not([hidden])') || document.querySelector('#dash-screen:not(.hidden)') || document.querySelector('.cmdk:not([hidden])') || document.querySelector('.typeb-card.is-open') || document.getElementById('app');
  const name = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + ' "' + (el.textContent || el.value || '').trim().slice(0, 24) + '"';
  // 1) bosiladigan maydon
  for (const el of scope.querySelectorAll('button, a.btn, a.nav-item, a.menu-item, select, a.home-link, a.auth2-link, input[type="text"], input[type="password"], input[type="tel"], input[type="number"], input[type="search"], input[type="date"], textarea')) {
    if (!visible(el) || el.closest('.report-doc') || el.closest('.data-table')) continue;      // jadval kataklari: nozik ko'rsatkichda 36 px (shell.css)
    const r = el.getBoundingClientRect();
    if (r.height < minTap - 0.5) out.tap.push(name(el) + ' ' + Math.round(r.height) + 'px');
  }
  // 2) kontrast
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; };
  const srgb = c => { const m = c.match(/color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)/); return m ? [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : Number(m[4])] : null; };
  const col = c => parse(c) || srgb(c);
  const over = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
  const lum = c => { const f = v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (x, y) => { const l1 = lum(x), l2 = lum(y); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = el => {
    const layers = [];
    for (let p = el; p; p = p.parentElement) { const c = col(getComputedStyle(p).backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } }
    let base = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const seen = new Set();
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || seen.has(el) || !visible(el) || el.closest('svg') || el.closest('[disabled]') || el.closest('.report-doc')) continue;
    seen.add(el);
    const cs = getComputedStyle(el), fg0 = col(cs.color);
    if (!fg0) continue;
    const bg = bgOf(el), fg = over(fg0, bg), r = ratio(fg, bg);
    const size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    if (r < (large ? minLarge : minContrast) - 0.01) out.contrast.push(name(el) + ' ' + r.toFixed(2));
  }
  // 3) P20 (UX-09): chap menyu bandlari — to'liq ko'rinadi YOKI suriladigan (scrollbar'i ko'rinadigan) quti ichida
  out.nav = [];
  const side = document.querySelector('.side-nav');
  if (side && getComputedStyle(side).display !== 'none' && document.getElementById('app') && !document.getElementById('app').classList.contains('hidden')) {
    for (const el of side.querySelectorAll('.nav-item')) {
      const r = el.getBoundingClientRect();
      if (r.height < 1) continue;
      if (r.top >= -0.5 && r.bottom <= innerHeight + 0.5 && !el.closest('.nav-scroll')) continue;       // qutidan tashqarida va to'liq ko'rinadi
      const box = el.closest('.nav-scroll');
      if (!box) { out.nav.push(name(el) + ' qirqilgan (scroll qutisida emas)'); continue; }
      const b = box.getBoundingClientRect(), cs = getComputedStyle(box);
      const inside = r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5;
      const scrollable = box.scrollHeight > box.clientHeight + 1 && /auto|scroll/.test(cs.overflowY) && cs.scrollbarWidth !== 'none';
      if (!inside && !scrollable) out.nav.push(name(el) + ' qirqilgan');
    }
    const sb = side.getBoundingClientRect();
    if (sb.bottom > innerHeight + 0.5) out.nav.push('menyu ekrandan chiqib ketgan: ' + Math.round(sb.bottom - innerHeight) + 'px');
  }
  // 4) P20 (UX-05): hech bir atributda "null" / "undefined" matni yo'q
  out.nullAttr = [];
  for (const el of scope.querySelectorAll('[placeholder], [title], [aria-label], [value], [alt]')) {
    for (const a of ['placeholder', 'title', 'aria-label', 'alt']) { const v = el.getAttribute(a); if (v === 'null' || v === 'undefined') out.nullAttr.push(name(el) + ' ' + a + '="' + v + '"'); }
  }
  // P22: ko'rinadigan matnda ham "null" / "undefined" so'zi yo'q (hisobot hujjati ichidagi foydalanuvchi matni bundan mustasno)
  const tw = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const el = n.parentElement;
    if (!el || !visible(el) || el.closest('.report-doc') || el.closest('script, style')) continue;
    if (/(^|[\s:=(])(null|undefined|NaN)([\s,.;)]|$)/.test(n.nodeValue)) out.nullAttr.push(name(el) + ' matnda "' + n.nodeValue.trim().slice(0, 30) + '"');
  }
  out.overflow = Math.max(0, document.documentElement.scrollWidth - innerWidth);
  out.animations = document.getAnimations ? document.getAnimations().filter(x => x.playState === 'running').length : 0;
  return out;
}

const SCREENS = [
  { key: 'model', label: 'Model (1-qadam)', go: async p => { await p.evaluate(() => window.UCShell.goStep('model')); } },
  { key: 'data', label: "Ma'lumotlar (2-qadam)", go: async p => { await p.evaluate(() => window.UCShell.goStep('data')); } },
  { key: 'results', label: 'Natijalar', go: async p => { await p.evaluate(() => window.UCShell.goStep('results')); } },
  { key: 'input', label: 'Kiritish (B tur varag\'i)', go: async p => { await p.evaluate(() => { window.UCShell.goStep('typeb'); document.querySelector('[data-tb-edit]').click(); }); },
    after: async p => { await p.keyboard.press('Escape'); } },
  { key: 'qc', label: 'QC kartasi', go: async p => { await p.evaluate(async () => {
    window.UCShell.go('lab-qc');
    const sel = document.querySelector('[data-lb-qc="select"]');
    if (sel && [...sel.options].some(o => o.value === 'qc:screens')) { sel.value = 'qc:screens'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  }); } },
  { key: 'report', label: 'Hisobot', go: async p => { await p.evaluate(() => window.UCShell.goStep('report')); await p.waitForSelector('#report-preview [data-report-footer]', { timeout: 15000 }); } },
  { key: 'vizlab', label: 'Vizual laboratoriya', go: async p => { await p.evaluate(() => window.UCShell.go('vizlab')); await p.waitForFunction(() => document.getElementById('vizlab-root').children.length > 0, null, { timeout: 15000 }); } },
  // P16 davomi: Bosh sahifa (so'nggi sessiyalar ro'yxati bilan) va kirish / ro'yxatdan o'tish ekrani
  { key: 'home', label: 'Bosh sahifa', go: async p => { await p.evaluate(() => window.App.showScreen('dash')); await p.waitForSelector('#dash-screen [data-home-session]', { timeout: 15000 }); await p.waitForSelector('#home-foot [data-home-validation]'); },
    after: async p => { await p.evaluate(() => window.App.showScreen('app')); } },
  { key: 'auth', label: 'Kirish', go: async p => { await p.evaluate(() => window.UCAuthScreen.show('login')); await p.waitForSelector('#auth-screen:not([hidden]) #login-user'); },
    after: async p => { await p.evaluate(() => window.UCAuthScreen.hide()); } },
  // Kirish rejimi (src/js/access-mode.js): ochiq test rejimida ro'yxatdan o'tish ko'rsatilmaydi — ekran o'tkazib yuboriladi
  { key: 'auth-register', label: "Ro'yxatdan o'tish", skip: p => p.evaluate(() => !window.UCAccess.policy().registration), go: async p => { await p.evaluate(() => window.UCAuthScreen.show('register')); await p.waitForSelector('#auth-screen:not([hidden]) #reg-inn'); },
    after: async p => { await p.evaluate(() => window.UCAuthScreen.hide()); } },
];

/** Joriy qadamning yagona asosiy tugmasi: pastki paneldagi `[data-primary]`; telefonda u yashirin — suzuvchi tugma (.fab) bosiladi. */
async function primary(page) {
  const btn = page.locator('.tab-panel.active .panel-footer [data-primary]');
  if (await btn.isVisible()) await btn.click(); else await page.click('#fab-primary');
}

/* P22-1 (audit 21.11.2026: UX-01, UX-02, UX-04) — "Maqsad" jadvalidagi 1-bosqich ko'rsatkichlari (avtomatik):
     • Bosh sahifa → "Yangi hisob" → to'g'ridan-to'g'ri Model qadami (sozlash oynasi yo'q); 5 qadam; jadvalda bitta bo'sh qator;
     • shablondan natijagacha bosishlar (ma'lumot kiritishdan tashqari) ≤ 3: "Hisoblash" → "Keyingi: B tur" → "Hisoblash: Natija";
     • har qadamda bitta asosiy tugma (telefonda — suzuvchi tugma), u ko'rinadi. */
const MAX_TEMPLATE_CLICKS = 3;
async function seed(page, bad) {
  await page.click('#btn-home-start');                       // Bosh sahifa
  await page.click('#dash-screen [data-home-new]');          // "Yangi hisob" → Model qadami
  await page.waitForFunction(() => !!(window.UCShell && window.UCLab && window.Calc && window.UCFlow));
  const st = await page.evaluate(() => ({
    app: !document.getElementById('app').classList.contains('hidden'), tab: (document.querySelector('.tab-panel.active') || {}).id,
    setup: !!document.getElementById('welcome-screen') || !!document.getElementById('inp-preset'),
    steps: [...document.querySelectorAll('#stepper [data-step]')].map(b => b.dataset.step).join(' → '),
    params: window.appState.get('params').join(','), rows: document.querySelectorAll('#table-body tr').length,
    focus: document.activeElement && document.activeElement.id,
  }));
  if (!st.app || st.tab !== 'tab-model' || st.setup) bad.push(`"Yangi hisob" Model qadamini ochmadi (${JSON.stringify(st)})`);
  if (st.steps !== 'model → data → typeb → results → report') bad.push('qadamlar: ' + st.steps);
  if (st.params !== 'x' || st.rows !== 1) bad.push(`yangi hisob: parametrlar "${st.params}", qatorlar ${st.rows} (kutilgan: x, 1)`);
  if (st.focus !== 'model-formula') bad.push('yangi hisob: fokus formula maydonida emas (' + st.focus + ')');
  // P — formuladan, N — jadvaldan (haqiqiy klaviatura bilan)
  await page.fill('#model-formula', 'y = a * b');
  await page.keyboard.press('Enter');
  await primary(page);                                         // "Keyingi: Ma'lumotlar"
  await page.click('.meas-input[data-param="a"][data-idx="0"]');
  await page.keyboard.type('1,5');
  await page.keyboard.press('Enter');
  await page.keyboard.type('1,7');
  await page.keyboard.press('Enter');
  const auto = await page.evaluate(() => ({ params: window.appState.get('params').join(','), n: window.appState.get('n'), a: window.appState.get('measurements').a.join('|'),
    rows: document.querySelectorAll('#table-body tr').length, focus: document.activeElement.dataset ? document.activeElement.dataset.idx : '', tab: document.querySelector('.tab-panel.active').id,
    ta: !!window.appState.get('typeA').a }));
  if (auto.tab !== 'tab-data' || auto.params !== 'a,b' || auto.a !== '1.5|1.7|' || auto.n !== 3 || auto.rows !== 3 || auto.focus !== '2' || !auto.ta) bad.push('P / N avtomatik emas: ' + JSON.stringify(auto));
  // shablondan natijagacha: katalog → "Hisoblash" (1) → "Keyingi: B tur" (2) → "Hisoblash: Natija" (3)
  await page.evaluate(() => window.UCTemplates.openCatalog());
  await page.waitForSelector('[data-tpl-use^="legacy-density@"]');
  if (!(await page.locator('[data-tpl-card^="legacy-density@"] [data-tpl-example]').count())) bad.push('katalog: namuna shablonida "Namuna" belgisi yo\'q');
  let clicks = 0;
  await page.click('[data-tpl-use^="legacy-density@"]'); clicks++;
  await page.waitForSelector('#tab-data.active');
  await primary(page); clicks++;
  await page.waitForSelector('#tab-typeb.active');
  await primary(page); clicks++;
  await page.waitForSelector('#tab-results.active');
  const done = await page.evaluate(() => { const r = window.appState.get('combined'); return !!r && Number.isFinite(r.y) && r.U > 0; });
  if (!done) bad.push('shablondan natijaga yetilmadi');
  if (clicks > MAX_TEMPLATE_CLICKS) bad.push(`shablondan natijagacha ${clicks} bosish (≤ ${MAX_TEMPLATE_CLICKS} bo'lishi kerak)`);
  // o'quv QC qatori (faqat skrinshot uchun; brauzer konteksti test tugagach yo'q qilinadi)
  await page.evaluate(async () => {
    await window.UCLab.ready;
    const S = await import('/src/storage/index.js');
    const db = await new S.LocalAdapter().open();
    const mk = v => ({ date: '2026-11-01', run: '', values: [v] });
    await S.saveRegistry(db, { id: 'qc:screens', kind: 'qc', name: 'QC (skrinshot namunasi)', unit: 'µg/L', type: 'imr', target: { mean: 100, s: 2 },
      points: [100.4, 99.1, 101.2, 98.7, 100.9, 102.3, 102.6, 102.8, 103.1, 99.5, 104.6, 95.2, 100.3, 101.1, 104.4, 104.9, 107.1].map(mk) }, { role: 'guest', reason: 'screens' });
    await window.UCLab.reload();
  });
}

async function run(name, playwright, server) {
  const problems = [], rows = [];
  const launch = {};
  if (name === 'chromium' && process.env.UC_CHROMIUM_PATH) launch.executablePath = process.env.UC_CHROMIUM_PATH;
  const browser = await playwright[name].launch(launch);
  try {
    for (const [w, h] of SIZES) for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      await ctx.addInitScript(t => { try { localStorage.setItem('uc_theme', t); localStorage.setItem('uc_lang', 'uz'); } catch (_) { /* */ } }, theme);
      const page = await ctx.newPage();
      const errors = [];
      await page.route('**/*', route => (new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort()));
      page.on('pageerror', e => errors.push('pageerror: ' + (e && e.message || e)));
      page.on('console', m => { if (m.type() === 'error' && !/build\.json/.test(m.text() + ' ' + (m.location().url || ''))) errors.push('console: ' + m.text()); });
      await page.goto(server.url + '/index.html', { waitUntil: 'load' });
      // Ochilish qoidasi (egasi qarori 2026-11-23): toza brauzer → tanishtiruv sahifasi; "Kalkulyatorni ochish" dan keyin
      // qayta yuklash → Bosh sahifa (uc_seen_dash); keyin yana tanishtiruv sahifasiga #home orqali
      const shown = () => page.evaluate(() => ['home-screen', 'dash-screen', 'app'].filter(id => !document.getElementById(id).classList.contains('hidden')).join(','));
      if (await shown() !== 'home-screen') problems.push(`${name} ${w}x${h}-${theme}: toza brauzer tanishtiruv sahifasidan ochilmadi (${await shown()})`);
      await page.click('#btn-home-start');
      await page.reload({ waitUntil: 'load' });
      if (await shown() !== 'dash-screen') problems.push(`${name} ${w}x${h}-${theme}: "Kalkulyatorni ochish" dan keyin qayta yuklashda Bosh sahifa ochilmadi (${await shown()})`);
      await page.goto(server.url + '/index.html', { waitUntil: 'load' });
      await page.evaluate(() => window.App.showScreen('home'));
      const flow = [];
      await seed(page, flow);
      const tag = `${w}x${h}-${theme}`;
      for (const msg of flow) problems.push(`${name} ${tag}: ${msg}`);
      // P20 (UX-07, UX-08): bildirishnoma — bir vaqtda bitta, aria-live; pastki amal paneli jadvalning oxirgi qatorini yopmaydi
      for (const msg of await page.evaluate(async () => {
        const bad = [];
        window.showToast('birinchi', 'info'); window.showToast('ikkinchi', 'success');
        const box = document.getElementById('toast-container'), list = box.querySelectorAll('.toast');
        if (list.length !== 1 || !/ikkinchi/.test(list[0].textContent)) bad.push('bildirishnoma: ' + list.length + ' ta (bitta bo\'lishi kerak)');
        if (box.getAttribute('aria-live') !== 'polite') bad.push('bildirishnoma: aria-live="polite" yo\'q');
        const tr = list[0].getBoundingClientRect(), nav = document.querySelector('.bottom-nav');
        if (nav && getComputedStyle(nav).display !== 'none' && tr.bottom > nav.getBoundingClientRect().top) bad.push('bildirishnoma pastki navigatsiyani yopadi');
        if (tr.right > innerWidth || tr.left < 0) bad.push('bildirishnoma ekrandan chiqadi');
        list[0].remove();
        // P22-1: har qadamda BITTA ko'rinadigan asosiy tugma (desktop — pastki panel, telefon — suzuvchi tugma), matni bo'sh emas
        const shown = el => { if (!el) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
        for (const key of ['model', 'data', 'typeb', 'results', 'report']) {
          window.UCShell.goStep(key);
          await new Promise(r => setTimeout(r, 60));
          const inPanel = [...document.querySelectorAll('#tab-' + key + ' .panel-footer [data-primary]')].filter(shown), fab = document.getElementById('fab-primary');
          const all = inPanel.concat(shown(fab) ? [fab] : []);
          if (all.length !== 1) bad.push(key + ': asosiy tugmalar soni ' + all.length + ' (bitta bo\'lishi kerak)');
          else if (!all[0].textContent.trim()) bad.push(key + ': asosiy tugma matni bo\'sh');
          else { const r = all[0].getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight + 0.5) bad.push(key + ': asosiy tugma ekranda ko\'rinmaydi'); }
        }
        window.UCShell.goStep('data');
        await new Promise(r => setTimeout(r, 50));
        const foot = document.querySelector('#tab-data .panel-footer'), cells = document.querySelectorAll('#table-body .meas-input');
        const last = cells[cells.length - 1];
        last.focus();                                             // klaviatura bilan oxirgi katakka o'tish
        await new Promise(r => setTimeout(r, 50));
        const sticky = getComputedStyle(foot).display !== 'none' && getComputedStyle(foot).position === 'sticky';
        const fr = foot.getBoundingClientRect(), lr = last.getBoundingClientRect();
        if (sticky && lr.bottom > fr.top + 0.5 && lr.top < fr.bottom) bad.push('amal paneli fokuslangan oxirgi katakni yopadi');
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise(r => setTimeout(r, 50));
        const rows = document.querySelectorAll('#table-body tr, #table-foot tr'), row = rows[rows.length - 1].getBoundingClientRect(), f2 = foot.getBoundingClientRect();
        if (sticky && row.bottom > f2.top + 0.5) bad.push('amal paneli jadvalning oxirgi qatorini yopadi (' + Math.round(row.bottom - f2.top) + 'px)');
        // telefonda: sahifa oxirigacha surilganda suzuvchi tugma mazmunning oxirgi elementini yopmaydi
        const fab = document.getElementById('fab-primary');
        if (!sticky && fab && !fab.hidden && getComputedStyle(fab).display !== 'none') {
          const panel = document.getElementById('tab-data'), kids = [...panel.children].filter(el => el.getBoundingClientRect().height > 0);
          const end = kids[kids.length - 1].getBoundingClientRect(), fb = fab.getBoundingClientRect();
          if (end.bottom > fb.top + 0.5) bad.push('suzuvchi tugma mazmunning oxirini yopadi (' + Math.round(end.bottom - fb.top) + 'px)');
        }
        window.scrollTo(0, 0);
        return bad;
      })) problems.push(`${name} ${tag}: ${msg}`);
      for (const s of SCREENS) {
        const id = `${name} ${s.key} ${tag}`;
        if (s.skip && await s.skip(page)) continue;
        try {
          await s.go(page);
          await page.waitForTimeout(350);
          await page.screenshot({ path: path.join(OUT, `${name}-${s.key}-${tag}.png`) });
          const au = await page.evaluate(auditInPage, { minTap: MIN_TAP, minContrast: MIN_CONTRAST, minLarge: MIN_CONTRAST_LARGE });
          if (au.tap.length) problems.push(`${id}: < ${MIN_TAP}px: ${au.tap.slice(0, 6).join('; ')}${au.tap.length > 6 ? ` (+${au.tap.length - 6})` : ''}`);
          if (au.contrast.length) problems.push(`${id}: kontrast: ${au.contrast.slice(0, 6).join('; ')}${au.contrast.length > 6 ? ` (+${au.contrast.length - 6})` : ''}`);
          if (au.overflow > 1) problems.push(`${id}: gorizontal surilish ${au.overflow}px`);
          if (au.nav && au.nav.length) problems.push(`${id}: chap menyu: ${au.nav.slice(0, 4).join('; ')}`);
          if (au.nullAttr && au.nullAttr.length) problems.push(`${id}: ${au.nullAttr.slice(0, 4).join('; ')}`);
          if (au.animations) problems.push(`${id}: prefers-reduced-motion da ${au.animations} ta animatsiya ishlayapti`);
          rows.push({ screen: s.key, size: `${w}x${h}`, theme, tap: au.tap.length, contrast: au.contrast.length, overflow: au.overflow });
          if (s.after) await s.after(page);
        } catch (e) { problems.push(`${id}: ${String(e && e.message || e).split('\n')[0]}`); }
      }
      // AI sahifasi (ai.html, P14 — alohida CSP): yangi tokenlar / qobiq bilan; tarmoqqa chiqilmaydi (so'rov yo'q — "so'rov topilmadi" holati)
      try {
        const ai = await ctx.newPage();
        const aiErrors = [];
        await ai.route('**/*', route => (new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort()));
        ai.on('pageerror', e => aiErrors.push('pageerror: ' + (e && e.message || e)));
        ai.on('console', m => { if (m.type() === 'error') aiErrors.push('console: ' + m.text()); });
        await ai.goto(server.url + '/ai.html', { waitUntil: 'load' });
        await ai.waitForFunction(() => document.getElementById('ai-own-model').options.length > 0, null, { timeout: 15000 });
        await ai.waitForTimeout(300);
        await ai.screenshot({ path: path.join(OUT, `${name}-ai-${tag}.png`) });
        const au = await ai.evaluate(({ minTap, minContrast, minLarge }) => {
          const out = { tap: [], contrast: [], overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth), theme: document.documentElement.getAttribute('data-theme'), font: getComputedStyle(document.body).fontFamily };
          const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; };
          const over = (f, b) => [0, 1, 2].map(i => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
          const lum = c => { const f = v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
          const bgOf = el => { const layers = []; for (let p = el; p; p = p.parentElement) { const c = parse(getComputedStyle(p).backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } } let base = [255, 255, 255, 1]; for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base); return base; };
          for (const el of document.querySelectorAll('button, select, input, textarea')) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height < minTap - 0.5) out.tap.push((el.id || el.tagName) + ' ' + Math.round(r.height) + 'px'); }
          for (const el of document.querySelectorAll('h1, span, div.warn-box, button, #ai-own-msg, a')) {
            if (!el.textContent.trim() || !el.getBoundingClientRect().width || el.disabled) continue;
            const cs = getComputedStyle(el), fg0 = parse(cs.color); if (!fg0) continue;
            const bg = bgOf(el), fg = over(fg0, bg), l1 = lum(fg), l2 = lum(bg), r = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
            const size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
            if (r < (large ? minLarge : minContrast) - 0.01) out.contrast.push((el.id || el.tagName) + ' ' + r.toFixed(2));
          }
          return out;
        }, { minTap: MIN_TAP, minContrast: MIN_CONTRAST, minLarge: MIN_CONTRAST_LARGE });
        const id = `${name} ai ${tag}`;
        if (au.theme !== theme) problems.push(`${id}: mavzu qo'llanmadi (${au.theme})`);
        if (!/Inter/.test(au.font)) problems.push(`${id}: shrift tokenlardan emas (${au.font})`);
        if (au.tap.length) problems.push(`${id}: < ${MIN_TAP}px: ${au.tap.join('; ')}`);
        if (au.contrast.length) problems.push(`${id}: kontrast: ${au.contrast.join('; ')}`);
        if (au.overflow > 1) problems.push(`${id}: gorizontal surilish ${au.overflow}px`);
        if (aiErrors.length) problems.push(`${id}: ${[...new Set(aiErrors)].slice(0, 3).join(' | ')}`);
        rows.push({ screen: 'ai', size: `${w}x${h}`, theme, tap: au.tap.length, contrast: au.contrast.length, overflow: au.overflow });
        await ai.close();
      } catch (e) { problems.push(`${name} ai ${tag}: ${String(e && e.message || e).split('\n')[0]}`); }
      // klaviatura: Ctrl+K → qidiruv, yozish, Esc; fokus ko'rinadi
      await page.evaluate(() => window.UCShell.goStep('results'));
      await page.keyboard.press('Control+k');
      const opened = await page.evaluate(() => !document.getElementById('cmdk').hidden && document.activeElement.id === 'cmdk-input');
      if (!opened) problems.push(`${name} ${tag}: Ctrl+K qidiruvni ochmadi`);
      await page.keyboard.type('monte');
      const found = await page.evaluate(() => document.querySelectorAll('#cmdk-list .cmdk-item').length);
      if (!found) problems.push(`${name} ${tag}: qidiruv natija bermadi`);
      await page.keyboard.press('Escape');
      if (await page.evaluate(() => !document.getElementById('cmdk').hidden)) problems.push(`${name} ${tag}: Esc qidiruvni yopmadi`);
      const backTo = await page.evaluate(() => document.activeElement && document.activeElement.id);
      if (w >= 720 && backTo !== 'btn-cmdk') problems.push(`${name} ${tag}: qidiruv yopilgach fokus qaytmadi (${backTo})`);
      await page.keyboard.press('Tab');
      const ring = await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return 'none'; const cs = getComputedStyle(el); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1 ? 'ok' : 'no-outline ' + el.tagName + '#' + el.id; });
      if (ring !== 'ok') problems.push(`${name} ${tag}: fokus ko'rinmaydi (${ring})`);
      if (errors.length) problems.push(`${name} ${tag}: ${[...new Set(errors)].slice(0, 4).join(' | ')}`);
      await ctx.close();
    }
  } finally { await browser.close(); }
  return { browser: name, rows, problems };
}

const playwright = require('playwright');
fs.mkdirSync(OUT, { recursive: true });
const server = await startServer(ROOT);
const results = [];
try { for (const b of browsers) results.push(await run(b, playwright, server)); } finally { await server.close(); }
const problems = results.flatMap(r => r.problems);
fs.writeFileSync(path.join(OUT, 'screens.json'), JSON.stringify({ sizes: SIZES.map(s => s.join('x')), themes: THEMES, screens: [...SCREENS.map(s => s.key), 'ai'], results, ok: problems.length === 0 }, null, 2));
console.log(`skrinshotlar: ${results.reduce((n, r) => n + r.rows.length, 0)} ta → ${path.relative(ROOT, OUT)}/`);
for (const p of problems) console.log('  ✗ ' + p);
if (problems.length) { console.log(`XATO: ${problems.length} ta muammo`); process.exit(1); }
console.log('OK: konsol xatosi yo\'q; bosiladigan maydon ≥ 44 px; kontrast ≥ 4,5:1; gorizontal surilish yo\'q; klaviatura ishlaydi');
