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

test('NAV: har bir band mavjud yorliqqa ishora qiladi; guruhlar — Hisob / Usullar / Laboratoriya', async () => {
  const { NAV } = await load();
  const dom = new JSDOM(read('index.html'));
  const tabs = [...dom.window.document.querySelectorAll('.tab-btn')].map(b => b.dataset.tab);
  for (const n of NAV) {
    assert.ok(tabs.includes(n.tab), n.key + ' → ' + n.tab);
    assert.ok(dom.window.document.getElementById('tab-' + n.tab), 'panel yo\'q: tab-' + n.tab);
  }
  const by = g => NAV.filter(n => n.group === g && n.menu !== false).map(n => n.key);
  assert.deepEqual(by('calc'), ['gum', 'mc', 'multi']);
  assert.deepEqual(by('methods'), ['regression', 'topdown', 'special']);
  assert.deepEqual(by('lab'), ['lab-qc', 'lab-standards', 'lab-pt', 'lab-validation']);
  // menyudagi tugmalar modeldagi bandlar bilan bir xil
  const inMenu = [...dom.window.document.querySelectorAll('#side-nav [data-nav]')].map(b => b.dataset.nav);
  assert.deepEqual(inMenu, NAV.filter(n => n.menu !== false).map(n => n.key));
  // laboratoriya ichki yorliqlari haqiqatan mavjud (src/ui/lab/view.js TABS)
  const { TABS } = await import('../../src/ui/lab/view.js');
  for (const n of NAV.filter(x => x.lab)) assert.ok(TABS.includes(n.lab), n.lab);
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

test('activeNav / activeStep: mavjud yorliqdan aniqlanadi (yangi holat mashinasi yo\'q)', async () => {
  const { activeNav, activeStep } = await load();
  assert.equal(activeNav('data', 'standards', 'gum'), 'gum');
  assert.equal(activeNav('results', 'standards', 'mc'), 'mc');
  assert.equal(activeNav('results', 'standards', 'regression'), 'gum');
  assert.equal(activeNav('typeb', 'standards', 'mc'), 'gum');
  assert.equal(activeNav('lab', 'qc', 'gum'), 'lab-qc');
  assert.equal(activeNav('lab', 'cmc', 'gum'), 'lab-cmc');
  assert.equal(activeNav('topdown', 'qc', 'gum'), 'topdown');
  assert.equal(activeNav('vizlab', 'qc', 'gum'), 'vizlab');
  assert.equal(activeNav('model', 'standards', 'gum'), 'gum');
  assert.equal(activeStep('model', 'data'), 'model');
  assert.equal(activeStep('data', 'results'), 'data');
  assert.equal(activeStep('typeb', 'model'), 'typeb');
  assert.equal(activeStep('report', 'model'), 'report');
  assert.equal(activeStep('lab', 'model'), null);
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

test('chap menyu: "Shablonlar katalogi" (HISOB guruhi tepasida), "Laboratoriya sozlamalari" va "Ma\'lumotlar" (LABORATORIYA); 1-qadamda "Shablondan boshlash"', () => {
  const fs = require('node:fs'), path = require('node:path');
  const { JSDOM } = require('jsdom');
  const root = path.join(__dirname, '..', '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const doc = new JSDOM(html).window.document;
  const lists = [...doc.querySelectorAll('#side-nav .nav-scroll .nav-list')];
  assert.equal(lists[0].querySelector('.nav-item').dataset.navAction, 'home');
  const first = lists[0].querySelectorAll('.nav-item')[1];
  assert.equal(first.dataset.navAction, 'templates');
  assert.ok(first.hasAttribute('data-open-templates'), 'mavjud ishlovchi (openCatalog) orqali ochiladi');
  assert.equal(first.querySelector('.nav-label').dataset.i18n, 'tpl_open_catalog');
  assert.ok(doc.getElementById(first.querySelector('use').getAttribute('href').slice(1)), 'ikonka mavjud');
  const lab = [...lists[2].querySelectorAll('.nav-item')];
  assert.deepEqual(lab.slice(-2).map(b => b.dataset.navAction), ['lab-settings', 'data']);
  assert.ok(lab[lab.length - 2].hasAttribute('data-open-lab') && lab[lab.length - 1].hasAttribute('data-open-data'));
  assert.deepEqual(lab.slice(-2).map(b => b.querySelector('.nav-label').dataset.i18n), ['tpl_btn_lab', 'tpl_btn_data']);
  // amal bandlari yorliq almashtirmaydi (data-nav yo'q) — NAV modeli va faol band mantig'i o'zgarmagan
  for (const b of doc.querySelectorAll('[data-nav-action]')) {
    assert.equal(b.tagName, 'BUTTON');
    assert.ok(!b.hasAttribute('data-nav'));
    assert.ok(b.querySelector('.nav-short[data-i18n]') && doc.getElementById(b.querySelector('use').getAttribute('href').slice(1)));
  }
  const start = doc.querySelector('#tab-model [data-model-template]');
  assert.ok(start && start.hasAttribute('data-open-templates'));
  assert.equal(start.querySelector('[data-i18n]').dataset.i18n, 'sh_tpl_start');
  assert.ok(start.compareDocumentPosition(doc.getElementById('model-box')) & 4, 'model qutisidan oldin');
  const tplApp = fs.readFileSync(path.join(root, 'src/ui/tpl/app.js'), 'utf8');
  assert.match(tplApp, /closest\('\[data-open-templates\]'\)\) \{ openCatalog\(\)/);
  assert.equal((tplApp.match(/closest\('\[data-open-templates\]'\)/g) || []).length, 1, 'ishlovchi bir marta ulangan');
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
