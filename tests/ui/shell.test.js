/* P16: ilova qobig'i — sof model (src/ui/shell/model.js) va index.html tuzilmasi (statik tekshiruv). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const load = () => import('../../src/ui/shell/model.js');

test('NAV (P22-2): menyuda AYNAN 9 band, 3 guruh; eski kalitlar `menu: false` bilan saqlangan; har bir yorliq mavjud', async () => {
  const { NAV, MENU, NAV_GROUPS } = await load();
  const dom = new JSDOM(read('index.html'));
  const doc = dom.window.document;
  const tabs = [...doc.querySelectorAll('.tab-btn')].map(b => b.dataset.tab);
  for (const n of NAV) {
    assert.ok(!!n.tab !== !!n.action, n.key + ': yorliq YOKI amal');
    if (!n.tab) continue;
    assert.ok(tabs.includes(n.tab), n.key + ' → ' + n.tab);
    assert.ok(doc.getElementById('tab-' + n.tab), 'panel yo\'q: tab-' + n.tab);
  }
  assert.equal(MENU.length, 9);
  assert.deepEqual([...NAV_GROUPS], ['calc', 'lab', 'help']);
  const by = g => MENU.filter(n => n.group === g).map(n => n.key);
  assert.deepEqual(by('calc'), ['home', 'new', 'templates', 'saved']);
  assert.deepEqual(by('lab'), ['lab-control', 'lab-quality', 'settings']);
  assert.deepEqual(by('help'), ['manual', 'learn']);
  assert.deepEqual([...new Set(MENU.map(n => n.group))], ['calc', 'lab', 'help']);
  // eski kalitlar o'chirilmagan — UCShell.go('regression'), eski havolalar va Ctrl+K ishlashda davom etadi
  const old = { gum: 'model', mc: 'results', multi: 'model', regression: 'regression', topdown: 'topdown', special: 'special', 'lab-qc': 'lab', 'lab-standards': 'lab', 'lab-cmc': 'lab', 'lab-pt': 'lab', 'lab-validation': 'lab', vizlab: 'vizlab' };
  for (const [key, tab] of Object.entries(old)) {
    const n = NAV.find(x => x.key === key);
    assert.ok(n, key + ' saqlangan');
    assert.equal(n.menu, false, key);
    assert.equal(n.tab, tab, key);
  }
  assert.equal(NAV.length, 9 + Object.keys(old).length);
  assert.equal(new Set(NAV.map(n => n.key)).size, NAV.length, 'kalitlar takrorlanmaydi');
  // index.html: menyu bandlari modeldagi bilan bir xil tartibda, aynan 9 ta; guruh sarlavhalari 3 ta
  const side = doc.getElementById('side-nav');
  const items = [...side.querySelectorAll('.nav-item')];
  assert.equal(items.length, 9);
  assert.deepEqual(items.map(b => b.dataset.nav || b.dataset.navAction), MENU.map(n => (n.tab ? n.key : n.action)));
  assert.deepEqual([...side.querySelectorAll('.nav-list')].map(u => u.dataset.navGroup), ['calc', 'lab', 'help']);
  assert.deepEqual([...side.querySelectorAll('.nav-group')].map(p => p.dataset.i18n), ['sh_g_calc', 'sh_g_lab', 'sh_g_help']);
  for (const u of side.querySelectorAll('.nav-list')) assert.deepEqual([...u.querySelectorAll('.nav-item')].map(b => b.dataset.nav || b.dataset.navAction), MENU.filter(n => n.group === u.dataset.navGroup).map(n => (n.tab ? n.key : n.action)));
  items.forEach((b, i) => assert.equal(b.querySelector('.nav-label').dataset.i18n, MENU[i].labelKey));
  // laboratoriya ichki yorliqlari haqiqatan mavjud; menyu bandlari qamrovi src/ui/lab/view.js guruhlari bilan bir xil
  const { TABS, TAB_GROUPS } = await import('../../src/ui/lab/view.js');
  for (const n of NAV.filter(x => x.lab)) assert.ok(TABS.includes(n.lab), n.lab);
  assert.deepEqual(MENU.filter(n => n.covers).map(n => n.covers), TAB_GROUPS);
  // "Validatsiya hisoboti" menyuda yo'q — sozlamalar oynasida ("Dastur validatsiyasi")
  assert.equal(side.innerHTML.includes('validation-report.html'), false);
  assert.equal(doc.getElementById('nav-validation-report'), null);
  const tplApp = read('src/ui/tpl/app.js');
  assert.match(tplApp, /href="validation\/validation-report\.html" data-program-validation="1">\$\{esc\(t\('sh_set_program_validation'\)\)\}/);
  assert.match(tplApp, /data-lab-more="1">\s*<button type="button" class="btn btn-outline btn-sm" data-open-data="1">/);
  // "Qo'llanma": standart holatda yashirin (build'siz saytda fayl yo'q); tekshiruv — faqat o'z manzilimizga HEAD, keshsiz
  const manual = doc.getElementById('nav-manual');
  assert.ok(manual.hidden && manual.tagName === 'A' && /^manual\/(uz|ru|en)\.html$/.test(manual.getAttribute('href')));
  const shellApp = read('src/ui/shell/app.js');
  assert.match(shellApp, /b && b\.shortSha \? window\.fetch\(href, \{ method: 'HEAD', cache: 'no-store', credentials: 'same-origin' \}\) : null/);
  assert.match(shellApp, /a\.hidden = !\(r && r\.ok\)/, 'fayl yo\'q yoki build\'siz sayt — band yashirin');
  assert.match(shellApp, /const href = 'manual\/' \+ lang \+ '\.html';/);
  // #sidebar* qayta qo'shilmagan (P22-1)
  assert.equal(doc.querySelector('[id^="sidebar"]'), null);
});

test('stepStates: "bajarildi" faqat hisob holatidan; joriy qadam bittadan ko\'p emas', async () => {
  const { stepStates, STEPS } = await load();
  assert.deepEqual(STEPS.map(s => s.key), ['model', 'data', 'typeb', 'results', 'report']);          // P22-1
  assert.deepEqual(STEPS.map(s => s.tab), ['model', 'data', 'typeb', 'results', 'report'], 'har qadam — alohida yorliq');
  const empty = stepStates({}, 'model');
  assert.deepEqual(empty.map(s => s.done), [false, false, false, false, false]);
  assert.deepEqual(empty.filter(s => s.current).map(s => s.key), ['model']);
  // bitta parametr — model formulasiz ham aniq; ikki parametr — formula kerak
  assert.equal(stepStates({ params: ['x'] }, null)[0].done, true);
  assert.equal(stepStates({ params: ['m', 'V'], model: { formula: '' } }, null)[0].done, false);
  assert.equal(stepStates({ params: ['m', 'V'], model: { formula: 'rho = m / V' } }, null)[0].done, true);
  const full = stepStates({ params: ['x'], typeA: { x: { mean: 1 } }, typeB: [{ id: 'a' }], combined: { y: 1 } }, 'results');
  assert.deepEqual(full.map(s => s.done), [true, true, true, true, false]);
  assert.equal(stepStates({ params: ['x'], typeA: {}, typeB: [], combined: null }, null).filter(s => s.done).length, 1);
  // P22-1: "Ma'lumotlar" — HAR BIR parametrda A tur natijasi bo'lsagina bajarilgan (bitta parametr yetarli emas)
  assert.equal(stepStates({ params: ['m', 'V'], model: { formula: 'm / V' }, typeA: { m: { mean: 1 } } }, null)[1].done, false);
  assert.equal(stepStates({ params: ['m', 'V'], model: { formula: 'm / V' }, typeA: { m: { mean: 1 }, V: { mean: 2 } } }, null)[1].done, true);
});

test('activeNav / activeStep: mavjud yorliqdan aniqlanadi (yangi holat mashinasi yo\'q); P22-2 mosliklari', async () => {
  const { activeNav, activeStep, sectionLabelKey, labTabFor, NAV, MENU } = await load();
  // GUM ish oqimi (Model … Hisobot) va usul yorliqlari — hech qaysi menyu bandi faol emas (stepper / usul qatori)
  for (const tab of ['model', 'data', 'typeb', 'results', 'report', 'regression', 'topdown', 'special']) {
    for (const last of ['gum', 'mc', 'regression', 'home', undefined]) assert.equal(activeNav(tab, 'standards', last), null, tab);
  }
  // laboratoriya ichki yorliqlari → tegishli band
  assert.equal(activeNav('lab', 'qc', 'gum'), 'lab-control');
  assert.equal(activeNav('lab', 'standards', 'lab-pt'), 'lab-control');
  assert.equal(activeNav('lab', 'cmc', 'gum'), 'lab-control');
  assert.equal(activeNav('lab', 'pt', 'gum'), 'lab-quality');
  assert.equal(activeNav('lab', 'validation', 'lab-qc'), 'lab-quality');
  assert.equal(activeNav('vizlab', 'qc', 'gum'), 'learn');
  // natija har doim menyuda ko'rinadigan band yoki null
  for (const n of NAV.filter(x => x.tab)) { const k = activeNav(n.tab, n.lab || 'standards', n.key); assert.ok(k === null || MENU.some(m => m.key === k), n.key); }
  // joylashuv yo'li — aniq nom (ichki yorliq / usul)
  assert.equal(sectionLabelKey('lab', 'cmc'), 'sh_n_cmc');
  assert.equal(sectionLabelKey('lab', 'pt'), 'sh_n_pt');
  assert.equal(sectionLabelKey('data', 'qc'), 'sh_n_gum');
  assert.equal(sectionLabelKey('regression', 'qc'), 'tab_regression');
  assert.equal(sectionLabelKey('special', 'qc'), 'sh_n_special');
  assert.equal(sectionLabelKey('vizlab', 'qc'), 'sh_n_vizlab');
  // menyu bandi bosilganda: joriy ichki yorliq shu band ichida bo'lsa — qoladi; aks holda bandning birinchi yorlig'i
  const ctl = MENU.find(n => n.key === 'lab-control'), q = MENU.find(n => n.key === 'lab-quality');
  assert.equal(labTabFor(ctl, 'cmc'), 'cmc');
  assert.equal(labTabFor(ctl, 'pt'), 'qc');
  assert.equal(labTabFor(q, 'validation'), 'validation');
  assert.equal(labTabFor(q, 'standards'), 'pt');
  assert.equal(labTabFor(NAV.find(n => n.key === 'lab-cmc'), 'pt'), 'cmc', 'eski kalit — aniq yorliq');
  assert.equal(activeStep('model', 'data'), 'model');
  assert.equal(activeStep('data', 'results'), 'data');
  assert.equal(activeStep('typeb', 'model'), 'typeb');
  assert.equal(activeStep('report', 'model'), 'report');
  assert.equal(activeStep('lab', 'model'), null);
});

test('Ctrl+K (P22-2): eski nomlar bilan ham topiladi — uch tilda; usul bandlari usul tanlovi orqali', async () => {
  const { commandItems, search } = await load();
  const { METHODS } = await import('../../src/ui/method/model.js');
  const files = ['i18n.js', 'i18n-ext.js', 'i18n-engine.js', 'i18n-templates.js', 'i18n-regression.js', 'i18n-topdown.js', 'i18n-shell.js', 'i18n-p20.js', 'i18n-flow.js', 'i18n-advisor.js'];
  const win = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' }).window;
  const TR = win.eval(files.map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS');
  const first = (items, q) => { const r = search(items, q); return r.length ? r[0] : null; };
  const Q = {
    uz: { 'Monte-Karlo': { method: 'GUM_MC' }, 'Ko\'p chiqishli': { method: 'MULTIVARIATE' }, Regressiya: { method: 'REGRESSION' }, 'Top-down': { method: 'TOP_DOWN' }, Nordtest: { method: 'TOP_DOWN' },
      Laboratoriyalararo: { method: 'INTERLAB' }, 'Maxsus rejimlar': { nav: 'special' }, 'QC kartalari': { nav: 'lab-qc' }, 'Etalonlar reestri': { nav: 'lab-standards' }, 'CMC jadvali': { nav: 'lab-cmc' },
      'Validatsiya hisoboti': { action: 'valreport' }, 'Vizual laboratoriya': { nav: 'vizlab' } },
    ru: { 'Монте-Карло': { method: 'GUM_MC' }, 'несколькими выходами': { method: 'MULTIVARIATE' }, 'Регрессия': { method: 'REGRESSION' }, 'Top-down': { method: 'TOP_DOWN' }, Nordtest: { method: 'TOP_DOWN' },
      'Межлабораторные': { method: 'INTERLAB' }, 'Специальные режимы': { nav: 'special' }, 'Контрольные карты': { nav: 'lab-qc' }, 'Реестр эталонов': { nav: 'lab-standards' }, 'Таблица CMC': { nav: 'lab-cmc' },
      'Отчёт о валидации': { action: 'valreport' }, 'Визуальная лаборатория': { nav: 'vizlab' } },
    en: { 'Monte Carlo': { method: 'GUM_MC' }, 'Multi-output': { method: 'MULTIVARIATE' }, Regression: { method: 'REGRESSION' }, 'Top-down': { method: 'TOP_DOWN' }, Nordtest: { method: 'TOP_DOWN' },
      Interlaboratory: { method: 'INTERLAB' }, 'Special modes': { nav: 'special' }, 'QC charts': { nav: 'lab-qc' }, 'Standards registry': { nav: 'lab-standards' }, 'CMC table': { nav: 'lab-cmc' },
      'Validation report': { action: 'valreport' }, 'Visual lab': { nav: 'vizlab' } },
  };
  for (const lang of ['uz', 'ru', 'en']) {
    const t = k => { assert.ok(typeof TR[lang][k] === 'string' && TR[lang][k], `${lang}: ${k}`); return TR[lang][k]; };
    const items = commandItems(t, METHODS);
    assert.equal(new Set(items.map(i => i.id)).size, items.length, 'takror band yo\'q');
    for (const it of items) assert.ok(it.label && it.target && (it.target.nav || it.target.method || it.target.action), it.id);
    for (const [q, want] of Object.entries(Q[lang])) {
      const got = first(items, q);
      assert.ok(got, `${lang}: "${q}" topilmadi`);
      for (const [k, v] of Object.entries(want)) assert.equal(got.target[k], v, `${lang}: "${q}" → ${JSON.stringify(got.target)}`);
    }
    // har bir usul va menyu bandi qidiruvda bor
    for (const m of METHODS.filter(x => x.key !== 'AUTO')) assert.ok(items.some(i => i.target.method === m.key), m.key);
    for (const a of ['home', 'new', 'templates', 'saved', 'settings', 'manual']) assert.ok(items.some(i => i.target.action === a), a);
  }
});

test('buyruq qidiruvi: registr / apostrof / diakritikaga befarq, so\'zlar bo\'yicha VA, boshidan mos kelgani oldinda', async () => {
  const { search, fold, moveIndex } = await load();
  const items = [
    { id: 'a', kind: 'section', label: 'Ko\'p chiqishli model' },
    { id: 'b', kind: 'section', label: 'Monte-Karlo' },
    { id: 'c', kind: 'template', label: 'Zichlik (ρ = m / V)', hint: 'T-01 · GOST 8.024' },
    { id: 'd', kind: 'action', label: 'Laboratoriya sozlamalari' },
    { id: 'e', kind: 'section', label: 'Etalonlar reestri', hint: 'laboratoriya' },
  ];
  assert.equal(fold('Koʻp  CHIQISHLI'), 'kop chiqishli');
  assert.deepEqual(search(items, '').map(x => x.id), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(search(items, 'KOP chiq').map(x => x.id), ['a']);
  assert.deepEqual(search(items, 'gost').map(x => x.id), ['c']);          // izoh (ID, standart) bo'yicha ham
  assert.deepEqual(search(items, 'labor').map(x => x.id), ['d', 'e']);    // nomi boshidan mos — oldinda
  assert.deepEqual(search(items, 'monte zzz'), []);
  assert.equal(search(items, '', 2).length, 2);
  assert.equal(moveIndex(0, -1, 5), 4);
  assert.equal(moveIndex(4, 1, 5), 0);
  assert.equal(moveIndex(0, 1, 0), -1);
});

test('index.html qobig\'i: haqiqiy <button>/<a>, aria-label, stepper, pastki navigatsiya, qidiruv dialogi', () => {
  const doc = new JSDOM(read('index.html')).window.document;
  const app = doc.getElementById('app');
  assert.ok(app.querySelector('header.topbar'));
  assert.ok(app.querySelector('a.skip-link[href="#main-content"]'));
  assert.equal(doc.getElementById('main-content').tagName, 'MAIN');
  // menyu bandlari, qadamlar va pastki navigatsiya — haqiqiy tugma / havola
  for (const el of app.querySelectorAll('[data-nav], [data-step], [data-bnav], .menu-item, #btn-cmdk, #fab-primary')) assert.ok(['BUTTON', 'A'].includes(el.tagName), el.outerHTML.slice(0, 80));
  assert.deepEqual([...app.querySelectorAll('#stepper [data-step]')].map(b => b.dataset.step), ['model', 'data', 'typeb', 'results', 'report']);
  assert.deepEqual([...app.querySelectorAll('#bottom-nav [data-bnav]')].map(b => b.dataset.bnav), ['results', 'data', 'lab', 'profile']);
  // faqat ikonkali tugmalarda nom bor
  for (const b of app.querySelectorAll('button.icon-btn, #btn-cmdk')) assert.ok(b.getAttribute('data-i18n-aria') && b.getAttribute('aria-label'), b.id);
  for (const n of app.querySelectorAll('nav')) assert.ok(n.getAttribute('aria-label'), 'nav nomsiz');
  const dlg = doc.querySelector('#cmdk [role="dialog"]');
  assert.equal(dlg.getAttribute('aria-modal'), 'true');
  assert.equal(doc.getElementById('cmdk-input').getAttribute('role'), 'combobox');
  assert.equal(doc.getElementById('cmdk-list').getAttribute('role'), 'listbox');
  assert.ok(doc.getElementById('cmdk').hasAttribute('hidden'));
  // avvalgi boshqaruvlar saqlangan (app.js, index-auth.js ular bilan ishlaydi)
  for (const id of ['btn-print', 'btn-reset', 'btn-theme',
    'topbar-user-badge', 'topbar-user-name', 'topbar-user-role', 'btn-admin-link', 'btn-topbar-logout', 'btn-validation-link']) assert.ok(doc.getElementById(id), id);
  // yangi qobiq qismida inline uslub atributi yo'q
  for (const sel of ['header.topbar', '#side-nav', '#stepper', '#bottom-nav', '#cmdk', '#fab-primary']) assert.equal(app.querySelector(sel).outerHTML.includes(' style='), false, sel);
});

test('uch o\'lcham: 980 px va 720 px chegaralari shell.css da; tokens.css — yagona qiymat manbai', () => {
  const css = read('src/css/shell.css');
  assert.match(css, /@media \(max-width: 979px\)/);
  assert.match(css, /@media \(max-width: 719px\)/);
  assert.match(read('src/css/tokens.css'), /--nav-w-rail:\s*76px/);
  // yangi CSS fayllarida qattiq yozilgan rang yo'q — faqat tokenlar (print uchun oq / qora bundan mustasno emas: bu fayllarda yo'q)
  for (const f of ['src/css/shell.css', 'src/css/motion.css']) {
    const body = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.deepEqual(body.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) || [], [], f);
  }
});

test('mavzu: tanlov localStorage `uc_theme` da saqlanadi (eski kalit o\'zgarmagan)', () => {
  const js = read('src/js/app.js');
  assert.match(js, /localStorage\.setItem\('uc_theme', next\)/);
  assert.match(js, /localStorage\.getItem\('uc_theme'\) \|\| 'dark'/);
});

test('chap menyu (P22-2): amal bandlari mavjud ishlovchilar orqali; 1-qadamda "Shablondan boshlash" va usul qatori', () => {
  const doc = new JSDOM(read('index.html')).window.document;
  const act = k => doc.querySelector(`#side-nav [data-nav-action="${k}"]`);
  assert.ok(act('home').hasAttribute('data-go-home'), 'Bosh sahifa — mavjud ishlovchi (src/ui/home/app.js)');
  assert.ok(act('templates').hasAttribute('data-open-templates'), 'Shablonlar — openCatalog');
  assert.ok(act('settings').hasAttribute('data-open-lab'), 'Sozlamalar va ma\'lumotlar — mavjud laboratoriya sozlamalari oynasi');
  assert.ok(act('new') && act('saved') && act('manual'));
  // amal bandlari yorliq almashtirmaydi (data-nav yo'q); har birida ikonka va qisqa nom (tor ustun uchun)
  for (const b of doc.querySelectorAll('#side-nav .nav-item')) {
    assert.ok(['BUTTON', 'A'].includes(b.tagName));
    assert.ok(!(b.hasAttribute('data-nav') && b.hasAttribute('data-nav-action')));
    assert.ok(b.querySelector('.nav-short[data-i18n]') && doc.getElementById(b.querySelector('use').getAttribute('href').slice(1)), b.outerHTML.slice(0, 90));
  }
  const shellApp = read('src/ui/shell/app.js');
  // "Yangi hisob": kiritilgan ma'lumot bor hisob jimgina o'chirilmaydi
  assert.match(shellApp, /const busy = window\.UCFlow && window\.UCFlow\.hasSession\(state\(\)\);\s*if \(busy && \$\('confirm-new'\)\) \{ openConfirm\(\); return; \}\s*window\.App\.newCalculation\(\);/);
  assert.ok(!/window\.confirm\(/.test(shellApp), 'brauzer confirm() ishlatilmaydi — ilova ichidagi dialog');
  // "Saqlangan hisoblar": Bosh sahifa + ro'yxat sarlavhasiga o'tish va fokus
  assert.match(shellApp, /action === 'saved'\) \{ if \(window\.App\) window\.App\.showScreen\('dash'\); setTimeout\(\(\) => focusEl\(\$\('home-recent-title'\)\), 0\); \}/);
  assert.ok(doc.getElementById('home-recent-title') && doc.getElementById('home-sessions'));
  // yangi holat mashinasi yo'q: yorliq faqat window.switchTab orqali almashadi
  assert.ok(!/classList\.(add|remove|toggle)\('active'\)[^\n]*tab-panel/.test(shellApp + read('src/ui/method/app.js')));
  const start = doc.querySelector('#tab-model [data-model-template]');
  assert.ok(start && start.hasAttribute('data-open-templates'));
  assert.equal(start.querySelector('[data-i18n]').dataset.i18n, 'sh_tpl_start');
  assert.ok(start.compareDocumentPosition(doc.getElementById('model-box')) & 4, 'model qutisidan oldin');
  const row = doc.getElementById('method-row');
  assert.ok(row && (row.compareDocumentPosition(doc.getElementById('model-box')) & 4), 'usul qatori — model kartasining tepasida');
  const tplApp = read('src/ui/tpl/app.js');
  assert.match(tplApp, /closest\('\[data-open-templates\]'\)\) \{ openCatalog\(\)/);
  assert.equal((tplApp.match(/closest\('\[data-open-templates\]'\)/g) || []).length, 1, 'ishlovchi bir marta ulangan');
});

test('"Yangi hisob" tasdig\'i (egasi qarori 2026-11-27): ilova ichidagi dialog — fokus "Bekor qilish" da, Esc yopadi, uch tilda', async () => {
  const { pathToFileURL } = require('node:url');
  const dom = new JSDOM(read('index.html').replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window, doc = w.document;
  w.eval(read('src/ui/escape.js'));
  const TR = w.eval(['i18n.js', 'i18n-ext.js', 'i18n-templates.js', 'i18n-regression.js', 'i18n-topdown.js', 'i18n-shell.js', 'i18n-p20.js', 'i18n-flow.js', 'i18n-advisor.js'].map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS');
  for (const lang of ['uz', 'ru', 'en']) for (const k of ['sh_cn_title', 'sh_cn_text', 'sh_cn_cancel', 'sh_cn_ok']) assert.ok(TR[lang][k] && TR[lang][k].trim(), `${lang}: ${k}`);
  assert.equal(TR.uz.sh_cn_cancel, 'Bekor qilish');
  let busy = true, started = 0, native = 0;
  w.appState = { get: () => ({}), subscribe() {} };
  w.UCFlow = { hasSession: () => busy };
  w.App = { newCalculation: () => { started++; }, showScreen() {} };
  w.switchTab = () => {};
  w.confirm = () => { native++; return true; };
  doc.getElementById('app').classList.remove('hidden');
  global.window = w; global.document = doc;
  await import(pathToFileURL(path.join(ROOT, 'src/ui/shell/app.js')).href + '?confirm');
  const box = doc.getElementById('confirm-new'), cancel = doc.getElementById('confirm-new-cancel'), ok = doc.getElementById('confirm-new-ok');
  const panel = box.querySelector('[role="alertdialog"]');
  assert.equal(panel.getAttribute('aria-modal'), 'true');
  assert.ok(doc.getElementById(panel.getAttribute('aria-labelledby')) && doc.getElementById(panel.getAttribute('aria-describedby')));
  assert.ok(box.hidden);
  assert.equal(ok.classList.contains('btn-primary') || cancel.classList.contains('btn-primary'), false, 'ikkinchi asosiy tugma qo\'shilmagan');
  const key = k => doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const opener = doc.querySelector('#side-nav [data-nav-action="new"]');
  // 1) ma'lumot bor: dialog ochiladi, fokus "Bekor qilish" da; Esc — yopiladi, hisob o'chirilmaydi, fokus qaytadi
  opener.focus();
  opener.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  assert.equal(box.hidden, false);
  assert.equal(doc.activeElement, cancel, 'standart fokus — xavfsiz tanlov');
  key('Tab'); assert.equal(doc.activeElement, ok);
  key('Tab'); assert.equal(doc.activeElement, cancel, 'Tab dialog ichida aylanadi');
  key('Escape');
  assert.ok(box.hidden);
  assert.equal(started, 0);
  assert.equal(doc.activeElement, opener);
  // 2) "Bekor qilish" tugmasi va fon — bekor qilish
  w.UCShell.runAction('new'); cancel.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  assert.ok(box.hidden); assert.equal(started, 0);
  w.UCShell.runAction('new'); box.querySelector('.cmdk-backdrop').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  assert.ok(box.hidden); assert.equal(started, 0);
  // 3) tasdiq — yangi hisob boshlanadi (bir marta)
  w.UCShell.runAction('new'); ok.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  assert.ok(box.hidden); assert.equal(started, 1);
  // 4) bo'sh hisob — dialogsiz, to'g'ridan-to'g'ri
  busy = false;
  w.UCShell.runAction('new');
  assert.ok(box.hidden); assert.equal(started, 2);
  assert.equal(native, 0, 'brauzer confirm() chaqirilmadi');
  // profil menyusidagi "Yangi seans" ham shu dialog orqali (src/js/app.js)
  assert.match(read('src/js/app.js'), /if \(window\.UCShell && window\.UCShell\.runAction\) window\.UCShell\.runAction\('new'\);/);
});

test('toast: bir xil xabar ekranda turganida ikkinchi nusxa qo\'shilmaydi; A tur va yakuniy hisob xabarlari alohida', () => {
  const fs = require('node:fs'), path = require('node:path');
  const { JSDOM } = require('jsdom');
  const root = path.join(__dirname, '..', '..');
  const { createToast } = require('../../src/ui/toast.js');
  const doc = new JSDOM('<!doctype html><body></body>').window.document;
  const a = createToast(doc, 'Hisoblash yakunlandi!', 'success', 50);
  const b = createToast(doc, 'Hisoblash yakunlandi!', 'success', 50);
  assert.equal(a, b);
  assert.equal(doc.querySelectorAll('.toast').length, 1);
  // P20 (UX-07): bir vaqtda ko'pi bilan BITTA bildirishnoma — yangisi eskisini almashtiradi
  createToast(doc, 'Hisoblash yakunlandi!', 'error', 50);
  assert.equal(doc.querySelectorAll('.toast').length, 1);
  assert.ok(doc.querySelector('.toast').classList.contains('error'));
  createToast(doc, 'A tur hisoblandi', 'success', 50);
  const last = createToast(doc, 'boshqa xabar', 'success', 50);
  assert.equal(doc.querySelectorAll('.toast').length, 1);
  assert.equal(doc.querySelector('.toast span').textContent, 'boshqa xabar');
  const box = doc.getElementById('toast-container');
  assert.equal(box.getAttribute('aria-live'), 'polite');
  assert.equal(box.getAttribute('role'), 'status');
  // 3 s da yopiladi: standart — 3000 ms; xato uchun chaqiruvchi bergan uzoqroq vaqt saqlanadi, boshqalarida — 3000 ms dan oshmaydi
  assert.equal(require('../../src/ui/toast.js').TOAST_MS, 3000);
  const src = fs.readFileSync(path.join(root, 'src/ui/toast.js'), 'utf8');
  assert.match(src, /duration = type === 'error' && duration > TOAST_MS \? duration : \(duration !== undefined && duration < TOAST_MS \? duration : TOAST_MS\);/);
  clearTimeout(last._timer);
  // joylashuv: telefonda pastki navigatsiyadan yuqorida; desktopda o'ng pastki burchak
  const shellCss = fs.readFileSync(path.join(root, 'src/css/shell.css'), 'utf8');
  assert.match(shellCss, /#toast-container \{ bottom: var\(--s-6\); right: var\(--s-6\);/);
  assert.match(shellCss, /@media \(max-width: 719px\) \{\s*#toast-container \{ left: var\(--s-3\); right: var\(--s-3\); bottom: calc\(var\(--bottom-nav-h\) \+ 80px/);
  clearTimeout(a._timer); [...doc.querySelectorAll('.toast')].forEach(t => clearTimeout(t._timer));
  const table = fs.readFileSync(path.join(root, 'src/js/table.js'), 'utf8');
  assert.ok(!table.includes("'toast_calc_done'"), 'jadval moduli "Hisoblash yakunlandi!" demaydi');
  assert.ok(!/toast_typea_done|toast_sample_done/.test(table), 'P22-1: A tur avtomatik — alohida xabar yo\'q');
  assert.equal((fs.readFileSync(path.join(root, 'src/js/typeB.js'), 'utf8').match(/'toast_calc_done'/g) || []).length, 1);
});
