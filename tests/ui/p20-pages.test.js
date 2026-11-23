/* P20 (audit 21.11.2026) — kirish sahifasi matni (SEC-01), huquqiy sahifalar va rozilik (SEC-02).
   Statik tekshiruvlar (jsdom): nishon olib tashlangan, da'vo matni yumshatilgan, sonlar dinamik; privacy.html / terms.html —
   uch tilda, "yurist tasdig'ini kutmoqda" belgisi bilan, tarmoq so'rovi va inline skriptsiz; sayt oq ro'yxatida. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const LANGS = ['uz', 'ru', 'en'];
const dict = files => { const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' }); return dom.window.eval(files.map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS'); };
const DICT = dict(['i18n.js', 'i18n-ext.js', 'i18n-admin.js', 'i18n-shell.js', 'i18n-p20.js']);
const LEGAL = dict(['i18n.js', 'i18n-admin.js', 'i18n-legal.js']);
const index = new JSDOM(read('index.html')).window.document;

test('SEC-01: "Bepul va ochiq kodli" nishoni uch tilda olib tashlangan (litsenziya yopiq)', () => {
  assert.equal(index.querySelector('[data-i18n="idx_badge_free"]'), null);
  for (const l of LANGS) assert.equal(DICT[l].idx_badge_free, undefined, l);
  // "Ochiq manba · Bepul · MIT litsenziyasi" (Biz haqimizda bo'limi va pastki qism) ham — yopiq litsenziyaga zid edi
  for (const f of ['index.html', 'src/js/i18n-admin.js', 'src/js/i18n.js']) assert.ok(!/ochiq kodli|ochiq manba|open source|открыты[йм] (исходны[йм] )?кодо?м?/i.test(read(f)) && !/\bMIT\b/.test(read(f)), f);
  assert.deepEqual(LANGS.map(l => DICT[l].home_about_open), ['Yopiq litsenziya · Barcha huquqlar himoyalangan', 'Закрытая лицензия · Все права защищены', 'Proprietary licence · All rights reserved']);
  assert.deepEqual([...index.querySelectorAll('.landing-footer a')].map(a => a.getAttribute('href')), ['privacy.html', 'terms.html']);
  assert.match(read('LICENSE'), /Barcha huquqlar himoyalangan/);
  assert.equal(JSON.parse(read('package.json')).license, 'UNLICENSED');
});

test('SEC-01: "to\'liq mos" da\'vosi o\'rniga — "talablari asosida ishlab chiqilgan" (uz / ru / en); nishonda JCGM 100:2008 (GUM)', () => {
  assert.equal(DICT.uz.home_hero_sub, 'ISO/IEC 17025:2017 va JCGM 100:2008 (GUM) talablari asosida ishlab chiqilgan.');
  assert.equal(DICT.ru.home_hero_sub, 'Разработано на основе требований ISO/IEC 17025:2017 и JCGM 100:2008 (GUM).');
  assert.equal(DICT.en.home_hero_sub, 'Developed on the basis of the requirements of ISO/IEC 17025:2017 and JCGM 100:2008 (GUM).');
  for (const l of LANGS) for (const k of ['home_hero_sub', 'welcome_subtitle']) assert.ok(!/to'liq mos|ga mos$|fully compliant|compliant$|полностью соответствует|^соответствует/i.test(DICT[l][k]), `${l}.${k}: ${DICT[l][k]}`);
  assert.deepEqual([...index.querySelectorAll('.landing-badge-row .lbadge')].map(e => e.textContent), ['ISO/IEC 17025:2017', 'JCGM 100:2008 (GUM)']);
});

test('SEC-01: kirish sahifasidagi sonlar qattiq yozilmagan — katalogdan va dvigateldan (landingStats)', async () => {
  const stats = [...index.querySelectorAll('.landing-stats [data-landing-stat]')];
  assert.deepEqual(stats.map(e => e.dataset.landingStat), ['templates', 'methods', 'distributions', 'languages']);
  for (const e of stats) assert.equal(e.textContent, '—', 'HTML da son yo\'q — skript to\'ldiradi');
  assert.ok(!/12<\/span>|GUM Formulas|home_stat_formulas|home_stat_presets/.test(read('index.html')));
  const { landingStats } = await import(path.join(ROOT, 'src/ui/home/model.js'));
  const catalog = JSON.parse(read('templates/builtin/index.json')).templates;
  const st = landingStats({ templates: catalog, methods: E.LINTER_MODES, distributions: E.DIVISORS, languages: { uz: 1, ru: 1, en: 1 } });
  assert.deepEqual(st, { templates: String(catalog.length), methods: String(E.LINTER_MODES.length), distributions: String(Object.keys(E.DIVISORS).length), languages: '3' });
  assert.equal(st.templates, String(fs.readdirSync(path.join(ROOT, 'templates/builtin')).filter(f => f !== 'index.json' && f.endsWith('.json')).length), 'katalog ro\'yxati papkadagi fayllar soniga teng');
  // qiymat ma'lum bo'lmasa — son o'ylab topilmaydi
  assert.deepEqual(landingStats({}), { templates: '—', methods: '—', distributions: '—', languages: '—' });
  const app = read('src/ui/home/app.js');
  assert.match(app, /import \{ DIVISORS, LINTER_MODES \} from '\.\.\/\.\.\/engine\/index\.js';/);
  assert.match(app, /T\(\)\.validationSummary\(\)\.total/);
  for (const l of LANGS) for (const k of ['home_stat_templates', 'home_stat_methods', 'home_stat_dist', 'home_stat_langs']) assert.ok(DICT[l][k], `${l}.${k}`);
});

test('SEC-02: privacy.html va terms.html — bir xil tuzilma, uch tilda, "yurist tasdig\'ini kutmoqda" belgisi sahifa tepasida', () => {
  for (const [file, kind] of [['privacy.html', 'pv'], ['terms.html', 'tm']]) {
    const html = read(file);
    const doc = new JSDOM(html).window.document;
    const main = doc.querySelector('main.legal-page');
    assert.equal(main.dataset.legal, kind);
    assert.equal(main.firstElementChild.dataset.legalDraft, '1', `${file}: belgi eng tepada`);
    assert.equal(main.firstElementChild.dataset.i18n, 'lg_draft');
    assert.match(LEGAL.uz.lg_draft, /^Loyiha — yurist tasdig'ini kutmoqda/);
    assert.deepEqual([...doc.querySelectorAll('.lang-btn')].map(b => b.dataset.lang), LANGS);
    // har bir matn kaliti uch tilda bor va bo'sh emas
    const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]);
    assert.ok(keys.length >= 15, `${file}: ${keys.length}`);
    for (const k of keys) for (const l of LANGS) assert.ok(LEGAL[l][k] && LEGAL[l][k].trim(), `${file}: ${l}.${k}`);
    // versiya — rozilik versiyasi bilan bir xil
    assert.equal(doc.querySelector('[data-legal-version]').textContent, require('../../src/js/auth-core.js').CONSENT_VERSION);
    // aloqa va o'zaro havola
    assert.ok(doc.querySelector('a[href^="https://t.me/"]') && doc.querySelector('a[href^="tel:+"]'));
    assert.ok(doc.querySelector(`a[href="${kind === 'pv' ? 'terms.html' : 'privacy.html'}"]`));
    // CSP: inline skript / uslub yo'q, tashqi manba yo'q, Firebase'ga ulanish yo'q
    const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
    assert.equal(csp, "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");
    assert.ok(!/unsafe-inline|googleapis|firebase-config|firebase-app|vendor\/firebase/i.test(html), 'Firebase skriptlari va tashqi manbalar yuklanmaydi');
    assert.deepEqual([...doc.querySelectorAll('script')].map(s => s.getAttribute('src')), ['src/ui/theme-boot.js', 'src/js/i18n.js', 'src/js/i18n-admin.js', 'src/js/i18n-legal.js', 'src/ui/lang-switch.js']);
    assert.equal(doc.querySelectorAll('script:not([src]), [style], style, [onclick]').length, 0);
  }
  // mazmun: qaysi ma'lumot, nima uchun, qayerda, qancha muddat, o'chirish so'rovi, aloqa
  for (const k of ['lg_pv_h_what', 'lg_pv_h_why', 'lg_pv_h_where', 'lg_pv_h_howlong', 'lg_pv_h_rights', 'lg_contact_title']) for (const l of LANGS) assert.ok(LEGAL[l][k], `${l}.${k}`);
  // docs/DATA_RESIDENCY.md §2.1 dagi maydonlar siyosatda aytilgan (INN / STIR, telefon, ism, login, xodimlar soni)
  for (const word of ['STIR', 'telefon', 'ism va familiya', 'login', 'xodimlar soni']) assert.ok(LEGAL.uz.lg_pv_what_org.includes(word), word);
  assert.match(LEGAL.uz.lg_pv_where_1, /Google Firebase/);
  assert.match(LEGAL.uz.lg_pv_local_1, /faqat sizning brauzeringizda saqlanadi/);
  assert.match(read('docs/DATA_RESIDENCY.md'), /consentVersion/);
});

test('SEC-02: huquqiy sahifalar sayt oq ro\'yxatida; rozilik hujjatida faqat consentVersion va consentAt', () => {
  const build = read('scripts/build-site.js');
  assert.match(build, /files: \[[^\]]*'privacy\.html', 'terms\.html'[^\]]*\]/);
  for (const f of ['privacy.html', 'terms.html', 'src/css/legal.css', 'src/js/i18n-legal.js']) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  assert.deepEqual(read('src/css/legal.css').replace(/\/\*[\s\S]*?\*\//g, '').match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) || [], [], 'ranglar faqat tokenlardan');
  const rules = read('firestore.rules');
  const only = /allow create: if isOrgOwner\(orgId\)[\s\S]*?hasOnly\(\[([\s\S]*?)\]\)/.exec(rules)[1].replace(/[\s']/g, '').split(',');
  assert.deepEqual(only, ['inn', 'phone', 'firstName', 'lastName', 'login', 'employeeCount', 'plan', 'active', 'paymentStatus', 'registeredAt', 'consentVersion', 'consentAt']);
  // tashkilot admini keyin faqat requestedPlan va employeeCount ni o'zgartiradi (rozilik maydonlari — yo'q)
  assert.match(rules, /\.hasOnly\(\['requestedPlan', 'employeeCount'\]\)/);
  for (const l of LANGS) for (const k of ['auth_consent_text', 'auth_consent_privacy', 'auth_consent_terms', 'auth_err_consent']) assert.ok(DICT[l][k], `${l}.${k}`);
  assert.match(DICT.uz.auth_consent_text, /^Shaxsga doir ma'lumotlarimni Maxfiylik siyosati va Foydalanish shartlari asosida qayta ishlashga roziman$/);
});
