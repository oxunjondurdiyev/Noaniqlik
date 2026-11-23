/* P16 davomi: kirish / ro'yxatdan o'tish ekrani (#auth-screen), "Bosh sahifa" (#dash-screen, src/ui/home/) va chap menyu.
   Hisob yo'q — faqat interfeys. Maydonlar ro'yxati QOTIRILGAN: yangi shaxsiy maydon qo'shilsa test xato beradi (CLAUDE.md). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const doc = new JSDOM(read('index.html')).window.document;
const DICT = (() => {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  return dom.window.eval(['i18n.js', 'i18n-ext.js', 'i18n-templates.js', 'i18n-admin.js', 'i18n-shell.js'].map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS');
})();
const keysIn = root => [...root.querySelectorAll('[data-i18n], [data-i18n-ph], [data-i18n-title], [data-i18n-aria]')]
  .flatMap(el => ['i18n', 'i18nPh', 'i18nTitle', 'i18nAria'].map(k => el.dataset[k]).filter(Boolean));

test('kirish ekrani: maydonlar o\'zgarmagan (yangi shaxsiy maydon yo\'q); til va mavzu tugmalari; chap tomonda tavsif, me\'yoriy asos va saqlash bayonoti', () => {
  const auth = doc.getElementById('auth-screen');
  assert.ok(auth.hidden, 'standart holatda yashirin (hidden atributi, inline uslubsiz)');
  assert.equal((auth.outerHTML.match(/\sstyle="/g) || []).length, 0, 'inline uslub yo\'q');
  // QOTIRILGAN ro'yxat — P02 dagi maydonlar; yangi maydon (ayniqsa shaxsiy) faqat egasi qarori bilan
  assert.deepEqual([...auth.querySelectorAll('input, select, textarea')].map(i => i.id),
    // P20 (egasi qarori 2026-11-21, SEC-02): + 'reg-consent' — majburiy rozilik belgisi (shaxsiy maydon EMAS)
    ['login-user', 'login-pwd', 'reg-inn', 'reg-phone', 'reg-firstname', 'reg-lastname', 'reg-login', 'reg-pwd', 'reg-pwd2', 'reg-empcount', 'reg-consent']);
  const reg = read('src/ui/index-auth.js').match(/AuthManager\.register\(\{([\s\S]*?)\}\)/)[1].replace(/\s+/g, ' ').trim();
  // P20: + consentVersion (hujjat versiyasi). consentAt — server vaqti, src/js/auth.js da qo'shiladi. Boshqa yangi maydon yo'q.
  assert.equal(reg, 'inn, phone, firstName, lastName, login, password: pwd, employeeCount: empCount, consentVersion: window.AuthCore.CONSENT_VERSION,', 'Firebase\'ga yuboriladigan maydonlar: faqat rozilik versiyasi qo\'shilgan');
  for (const i of auth.querySelectorAll('input')) assert.ok(auth.querySelector(`label[for="${i.id}"]`), i.id + ': label');
  // rozilik: belgi qo'yilmaguncha tugma faol emas; havolalar — privacy.html va terms.html; matnlar uch tilda
  assert.equal(doc.getElementById('reg-consent').type, 'checkbox');
  assert.equal(doc.getElementById('reg-consent').checked, false);
  assert.equal(doc.getElementById('btn-do-register').disabled, true);
  assert.deepEqual([...auth.querySelectorAll('.auth2-consent a')].map(a => a.getAttribute('href')), ['privacy.html', 'terms.html']);
  const authJs = read('src/ui/index-auth.js');
  assert.match(authJs, /function syncConsent\(\) \{ \$\('btn-do-register'\)\.disabled = !\$\('reg-consent'\)\.checked; \}/);
  assert.match(authJs, /if \(!\$\('reg-consent'\)\.checked\) \{ showErr\('reg-error', t\('auth_err_consent'\)\); return; \}/);
  const core = require('../../src/js/auth-core.js');
  assert.match(core.CONSENT_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  // Firestore'ga yoziladigan hujjat: avvalgi maydonlar + FAQAT consentVersion va consentAt (server vaqti)
  const authSrc = read('src/js/auth.js');
  assert.match(authSrc, /DB\.set\('organizations', cred\.user\.uid, \{ \.\.\.org, consentVersion: Core\.CONSENT_VERSION, consentAt: DB\.serverTimestamp\(\) \}\)/);
  assert.match(authSrc, /const org = \{\s*inn, phone, firstName, lastName, login,\s*employeeCount: [^\n]+\n\s*plan:\s+'basic',\s*registeredAt:[^\n]+\n\s*active:[^\n]+\n\s*paymentStatus: 'pending',\s*\};/);
  const rules = read('firestore.rules');
  assert.match(rules, /'employeeCount', 'plan', 'active', 'paymentStatus', 'registeredAt',\s*'consentVersion', 'consentAt'\]\)/);
  assert.match(rules, /request\.resource\.data\.consentAt == request\.time/);
  assert.deepEqual([...auth.querySelectorAll('.lang-btn')].map(b => b.dataset.lang), ['uz', 'ru', 'en']);
  assert.ok(auth.querySelector('.theme-toggle'));
  const aside = auth.querySelector('.auth2-aside');
  assert.deepEqual([...aside.querySelectorAll('.auth2-norms .mono')].map(e => e.textContent), ['JCGM 100:2008', 'JCGM 101:2008', 'JCGM 102:2011', 'ISO/IEC 17025:2017 §7.6', 'ILAC P14:09/2020']);
  assert.equal(aside.querySelector('[data-auth-privacy] [data-i18n]').dataset.i18n, 'au_privacy');
  // formulalar, raqamlar va me'yoriy belgilar tarjima qilinmaydi
  for (const el of aside.querySelectorAll('.mono, .auth2-brand')) assert.equal(el.getAttribute('translate'), 'no');
  for (const id of ['reg-inn', 'reg-phone', 'reg-login', 'login-user', 'reg-empcount']) assert.equal(doc.getElementById(id).getAttribute('translate'), 'no', id);
  // xato — inline, yordamchi texnologiyalarga e'lon qilinadi; matn textContent orqali
  for (const id of ['login-error', 'reg-error']) assert.equal(doc.getElementById(id).getAttribute('role'), 'alert');
  const js = read('src/ui/index-auth.js');
  assert.match(js, /el\.textContent = msg;/);
  assert.ok(!/showErr[\s\S]{0,80}innerHTML/.test(js));
  // Enter bilan yuborish: haqiqiy <form> + submit; parolni ko'rsatish / yashirish — klaviaturadan ochiq tugma
  for (const id of ['auth-panel-login', 'auth-panel-register']) { assert.equal(doc.getElementById(id).tagName, 'FORM'); assert.match(js, new RegExp(`\\$\\('${id}'\\)\\.addEventListener\\('submit'`)); }
  assert.equal(doc.getElementById('btn-do-login').type, 'submit');
  const eyes = [...auth.querySelectorAll('.pwd-eye')];
  assert.equal(eyes.length, 3);
  for (const b of eyes) { assert.equal(b.type, 'button'); assert.ok(!b.hasAttribute('tabindex')); assert.equal(b.getAttribute('aria-pressed'), 'false'); assert.ok(b.dataset.i18nAria); }
  assert.match(js, /setAttribute\('aria-pressed', String\(show\)\)/);
  for (const k of keysIn(auth)) for (const lang of ['uz', 'ru', 'en']) assert.ok(DICT[lang][k], `${lang}: ${k}`);
  for (const lang of ['uz', 'ru', 'en']) assert.ok(DICT[lang].auth_hide_pwd);
  // <html lang> joriy tilga mos
  assert.match(read('src/js/i18n.js'), /document\.documentElement\.lang = this\.lang;/);
});

test('Bosh sahifa: ikkita asosiy karta, so\'nggi sessiyalar, tezkor havolalar, pastda ENGINE_VERSION va validatsiya xulosasi; matnlar uch tilda', () => {
  const dash = doc.getElementById('dash-screen');
  assert.ok(dash.classList.contains('hidden'));
  const cards = [...dash.querySelectorAll('.home-start .home-card')];
  assert.equal(cards.length, 2);
  assert.ok(cards[0].hasAttribute('data-home-new') && cards[1].hasAttribute('data-open-templates'));
  assert.ok(cards.every(c => c.tagName === 'BUTTON'));
  assert.ok(dash.querySelector('#home-sessions') && dash.querySelector('#home-foot'));
  const links = [...dash.querySelectorAll('.home-links .home-link')];
  assert.deepEqual(links.map(l => l.dataset.homeLab || (l.hasAttribute('data-open-lab') ? 'settings' : l.getAttribute('href'))), ['settings', 'lab-standards', 'lab-qc', 'validation/validation-report.html']);
  assert.equal((dash.outerHTML.match(/\sstyle="/g) || []).length, 0);
  for (const k of keysIn(dash)) for (const lang of ['uz', 'ru', 'en']) assert.ok(DICT[lang][k], `${lang}: ${k}`);
  const app = read('src/ui/home/app.js');
  for (const k of new Set(app.match(/t\('([a-z_0-9]+)'\)/g).map(x => x.slice(3, -2)))) for (const lang of ['uz', 'ru', 'en']) assert.ok(DICT[lang][k], `${lang}: ${k}`);
  assert.ok(!/\sstyle=/.test(app) && !/localStorage|fetch\(/.test(app));
  // kirgandan keyin va "Kalkulyatorni ochish" — Bosh sahifa
  assert.match(read('src/ui/index-auth.js'), /window\.App\.showScreen\('dash'\)/);
  assert.match(read('src/js/app.js'), /getElementById\('btn-home-start'\)\.addEventListener\('click',\s+\(\) => showScreen\('dash'\)\)/);
  // chap menyu: "Bosh sahifa"; yuqoridagi tugma — "Hisobot"
  const first = doc.querySelector('#side-nav .nav-list .nav-item');
  assert.ok(first.hasAttribute('data-go-home'));
  assert.equal(first.querySelector('.nav-label').dataset.i18n, 'sh_n_home');
  assert.deepEqual(['uz', 'ru', 'en'].map(l => DICT[l].btn_report), ['Hisobot', 'Отчёт', 'Report']);
  assert.equal(doc.querySelector('#btn-print [data-i18n]').dataset.i18n, 'btn_report');
});

test('model: so\'nggi sessiyalar — yangilari oldinda, chegaralangan, buzuq yozuvlar tashlanadi; natija raqamlari ro\'yxatga kirmaydi', async () => {
  const M = await import('../../src/ui/home/model.js');
  const rec = (id, at, extra = {}) => ({ id, createdAt: at, engineVersion: '2.10.0', state: { n: 5, params: ['m', 'V'], model: { formula: 'ρ = m / V', unit: 'g/cm³' }, measurements: { m: [1], V: [2] }, typeB: [] }, result: { y: 0.5, U: 0.1, engineVersion: '2.10.0' }, ...extra });
  const rows = M.recentSessions([rec('a', '2026-11-01T10:00:00.000Z'), null, { id: 'x' }, rec('b', '2026-11-03T08:30:00.000Z', { templateRef: { id: 'legacy-density', version: '1.0.0' }, copyOf: 'a' }), rec('c', '2026-11-02T00:00:00.000Z')]);
  assert.deepEqual(rows.map(r => r.id), ['b', 'c', 'a']);
  assert.deepEqual(rows[0], { id: 'b', formula: 'ρ = m / V', params: ['m', 'V'], n: 5, template: 'legacy-density v1.0.0', engineVersion: '2.10.0', createdAt: '2026-11-03T08:30:00.000Z', copy: true });
  assert.ok(!JSON.stringify(rows).includes('0.5'), 'y / U ro\'yxatda yo\'q (yaxlitlash faqat hisobot qatlamida)');
  assert.equal(M.recentSessions(Array.from({ length: 20 }, (_, i) => rec('r' + i, `2026-11-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`))).length, M.RECENT_LIMIT);
  assert.deepEqual(M.recentSessions(undefined), []);
  assert.equal(M.sessionTitle(rows[0]), 'ρ = m / V');
  assert.equal(M.sessionTitle({ formula: '', params: ['x', 'y'], id: 'q' }), 'x, y');
  assert.equal(M.shortTime('2026-11-03T08:30:00.000Z'), '2026-11-03 08:30 UTC');
  assert.equal(M.shortTime('nope'), '');
});

test('model: sessiyani ochish — natija faqat AYNAN shu dvigatel versiyasida hisoblangan bo\'lsa tiklanadi; aks holda qayta hisob talab qilinadi', async () => {
  const M = await import('../../src/ui/home/model.js');
  const rec = { id: 'calc-1', createdAt: '2026-11-03T08:30:00.000Z', engineVersion: '2.10.0', state: { n: 3, params: ['x'], measurements: { x: [1, 2, 3] }, typeB: [{ name: 'a', param: 'x', halfWidth: 0.1, distribution: 'rect' }], model: { formula: '', unit: 'mm' }, settings: { P: 0.95 } }, result: { y: 2, U: 0.5, engineVersion: '2.10.0' } };
  const same = M.sessionPatch(rec, '2.10.0');
  assert.equal(same.stale, false);
  assert.deepEqual(same.patch.combined, rec.result);
  assert.deepEqual(same.patch.calcMeta, { id: 'calc-1', createdAt: '2026-11-03T08:30:00.000Z' });
  assert.deepEqual(same.patch.measurements, { x: [1, 2, 3] });
  assert.notEqual(same.patch.measurements, rec.state.measurements, 'nusxa (saqlangan yozuv o\'zgarmaydi)');
  assert.deepEqual([same.patch.points, same.patch.currentPoint, same.patch.typeA], [[], null, {}]);
  const other = M.sessionPatch(rec, '2.11.0');
  assert.deepEqual([other.stale, other.patch.combined, other.patch.calcMeta], [true, null, null]);
  assert.equal(M.sessionPatch({ ...rec, result: { error: 'x', engineVersion: '2.10.0' } }, '2.10.0').patch.combined, null);
  assert.equal(M.sessionPatch({ id: 'z', state: { params: [] } }, '2.10.0'), null);
  assert.equal(M.sessionPatch(null, '2.10.0'), null);
});

test('uslub: home.css faqat tokenlardan (qattiq rang yo\'q); mavzu foni tokenlarda — qorong\'i #1e2235, yorug\' #f5f7fa', () => {
  const css = read('src/css/home.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css) && !/rgba?\(/.test(css), 'qattiq yozilgan rang');
  assert.ok(!/box-shadow:(?!\s*none)/.test(css), 'soya yo\'q');
  const tokens = read('src/css/tokens.css');
  assert.match(tokens, /\[data-theme="dark"\][\s\S]*?--c-bg:\s+#1e2235;/);
  assert.match(tokens, /\[data-theme="light"\][\s\S]*?--c-bg:\s+#f5f7fa;/);
  const html = read('index.html');
  assert.ok(html.indexOf('src/css/home.css') > html.indexOf('src/css/shell.css') && html.indexOf('src/css/home.css') < html.indexOf('src/css/motion.css'));
});

test('KNOWN_LIMITATIONS (uz / ru): ISO 19036 bo\'yicha qo\'llab-quvvatlanmaydigan bandlar yozilgan; ISO matni repoda yo\'q', () => {
  for (const f of ['docs/validation/KNOWN_LIMITATIONS.md', 'docs/validation/KNOWN_LIMITATIONS.ru.md']) {
    const row = read(f).split('\n').find(l => l.startsWith('| KL-079 |'));
    assert.ok(row, f);
    for (const s of ['ISO 19036', 'u_conf', '§7.3', 'u_MPN', '§7.4', '§8.1.3', 's_IR,corr', '§9.2', 'LOQ', 'BETA']) assert.ok(row.includes(s), `${f}: ${s}`);
  }
  assert.ok(!fs.readdirSync(path.join(ROOT, 'docs/references')).some(n => /19036/.test(n)));
});

/* ── fix/startup-screen: sayt doim Bosh sahifadan ochiladi; saqlangan hisob — "Davom ettirish" kartasi; logotip → Bosh sahifa ── */
test('ochilish: bootstrap saqlangan holatda ham ish maydoniga o\'tmaydi — Bosh sahifa (dash); URL hash berilgan bo\'lsa — o\'sha joy', () => {
  const app = read('src/js/app.js');
  const boot = app.slice(app.indexOf('function bootstrap()'), app.indexOf('function startScreen('));
  assert.ok(!/showScreen\('app'\)/.test(boot), 'bootstrap to\'g\'ridan-to\'g\'ri showScreen(\'app\') qilmaydi');
  assert.match(boot, /showScreen\(startScreen\(window\.location\.hash, saved\)\);/);
  // startScreen — sof funksiya: manbadan ajratib olib bajariladi
  const src = /function startScreen\(hash, saved\) \{[\s\S]*?\n  \}/.exec(app)[0];
  const startScreen = new Function(src + '; return startScreen;')();
  assert.equal(startScreen('', false), 'dash');
  assert.equal(startScreen('', true), 'dash', 'saqlangan hisob bo\'lsa ham — Bosh sahifa');
  assert.equal(startScreen('#home', true), 'home');
  assert.equal(startScreen('#app', true), 'app');
  assert.equal(startScreen('#app', false), 'dash', 'saqlangan hisob yo\'q — ish maydoni bo\'sh ochilmaydi');
  assert.equal(startScreen('#lab', false), 'app');
  assert.equal(startScreen('#nimadir', true), 'dash');
  assert.equal(startScreen(undefined, false), 'dash');
});

test('"Davom ettirish" kartasi: model (formula yoki kirishlar) va sana; holat bo\'sh bo\'lsa — karta yo\'q', async () => {
  const M = await import(path.join(ROOT, 'src/ui/home/model.js'));
  const st = { params: ['m', 'V'], measurements: { m: ['1'], V: ['2'] }, model: { formula: 'ρ = m / V' }, calcMeta: { id: 'c', createdAt: '2026-11-23T08:30:00.000Z' } };
  assert.deepEqual(M.resumeInfo(st), { model: 'ρ = m / V', date: '2026-11-23' });
  assert.deepEqual(M.resumeInfo({ ...st, model: { formula: '  ' }, calcMeta: null }), { model: 'm, V', date: '' });
  for (const empty of [null, undefined, {}, { params: [], measurements: {} }, { params: ['x'], measurements: {} }, { params: ['x'] }]) assert.equal(M.resumeInfo(empty), null);
  // karta — birinchi element; ikki asosiy karta soni o'zgarmagan; matnlar uch tilda
  const start = doc.querySelector('#dash-screen .home-start');
  assert.equal(start.firstElementChild.id, 'home-resume');
  assert.ok(start.firstElementChild.hidden, 'standart holatda yashirin');
  assert.equal(start.querySelectorAll('.home-card').length, 2);
  for (const lang of ['uz', 'ru', 'en']) for (const k of ['hm_resume', 'hm_resume_text', 'hm_resume_deleted', 'hm_delete', 'hm_del_yes', 'hm_del_no']) assert.ok(DICT[lang][k], `${lang}: ${k}`);
  assert.deepEqual(['uz', 'ru', 'en'].map(l => DICT[l].hm_resume), ['Davom ettirish', 'Продолжить', 'Continue']);
  const js = read('src/ui/home/app.js');
  assert.match(js, /esc\(t\('hm_resume'\)\)\}: <span class="mono" translate="no">\$\{esc\(info\.model\)\}<\/span>/, 'model matni escape qilinadi');
  assert.match(js, /if \(q\('\[data-home-resume\]'\)\) \{ resumeCurrent\(\); return; \}/);
  assert.match(js, /if \(q\('\[data-home-resume-del-yes\]'\)\) \{ deleteCurrent\(\); return; \}/);
  assert.match(js, /function deleteCurrent\(\) \{\s*window\.appState\.reset\(\);/, 'o\'chirish — ikki bosqichli tasdiqdan keyin');
});

test('qobiqdagi logotip — Bosh sahifaga olib boradigan haqiqiy tugma (klaviaturadan ochiq, nomi tarjima qilinadi)', () => {
  const b = doc.getElementById('btn-brand-home');
  assert.equal(b.tagName, 'BUTTON');
  assert.equal(b.type, 'button');
  assert.ok(b.classList.contains('topbar-brand') && b.closest('.topbar'));
  assert.equal(b.dataset.goHome, '1');
  assert.equal(b.dataset.i18nAria, 'sh_n_home');
  for (const lang of ['uz', 'ru', 'en']) assert.ok(DICT[lang].sh_n_home, lang);
  assert.match(read('src/ui/home/app.js'), /if \(q\('\[data-go-home\]'\)\) \{ window\.App\.showScreen\('dash'\); return; \}/);
  assert.match(read('src/css/shell.css'), /button\.topbar-brand \{ min-height: var\(--tap\);/);
});
