/* P16: noaniqlik tasmasi (src/report/ribbon.js), asosiy natija kartasi, KPI plitkalari, Pareto (src/report/sections.js).
   Hammasi dvigatel natijasidan; yaxlitlash faqat yorliqlarda (egasi qoidalari: 0,0999 → 0,10; −0,125 → −0,13). */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const { ribbonSvg, RIBBON } = require('../../src/report/ribbon.js');
const { createSections } = require('../../src/report/sections.js');
const { roundResult } = require('../../src/report/rounding.js');
const { escHtml } = require('../../src/ui/escape.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const DICT = (() => {
  const files = ['i18n.js', 'i18n-ext.js', 'i18n-engine.js', 'i18n-templates.js', 'i18n-regression.js', 'i18n-topdown.js', 'i18n-special.js', 'i18n-linter.js', 'i18n-io.js', 'i18n-report.js', 'i18n-p20.js', 'i18n-admin.js', 'i18n-lab.js', 'i18n-pt.js', 'i18n-build.js', 'i18n-shell.js'];
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://example.test/', runScripts: 'outside-only' });
  return dom.window.eval(files.map(f => read('src/js/' + f)).join('\n;\n') + '\n;TRANSLATIONS');
})();
const env = { t: k => (DICT.uz[k] !== undefined ? DICT.uz[k] : k), esc: escHtml };
const frag = html => new JSDOM('<!doctype html><body><div id="r">' + html + '</div></body>').window.document.getElementById('r');
const caseSpec = id => require(`../cases/excel/${id}.json`).modelSpec;
const LABELS = { title: 'natija', lpu: 'LPU', mcShortest: 'eng qisqa', mcSymmetric: 'simmetrik' };
const nums = s => (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);

test('ribbonSvg: U yoki u_c nol / chekli emas — chizma berilmaydi (o\'ylab topilmaydi)', () => {
  for (const o of [{ y: 1, uc: 0, U: 0 }, { y: 1, uc: 0.1, U: 0 }, { y: NaN, uc: 1, U: 2 }, { y: 1, uc: 1, U: Infinity }]) {
    assert.equal(ribbonSvg({ ...o, esc: escHtml, labels: LABELS }), '');
  }
});

test('ribbonSvg: ±U ramkasi belgilangan joyda; yorliqlar — rounding.js qoidalari bilan (0,0999 → 0,10; −0,125 → −0,13)', () => {
  const doc = frag(ribbonSvg({ y: 1, uc: 0.05, U: 0.0999, esc: escHtml, labels: LABELS }));
  const band = doc.querySelector('.ribbon-band');
  assert.equal(Number(band.getAttribute('x')), RIBBON.X0);
  assert.equal(Number(band.getAttribute('width')), RIBBON.SPAN);
  assert.deepEqual([...doc.querySelectorAll('.ribbon-value')].map(t => t.textContent), ['0.90', '1.00', '1.10']);
  assert.deepEqual([...doc.querySelectorAll('.ribbon-label')].map(t => t.textContent), ['y − U', 'y', 'y + U']);
  const neg = frag(ribbonSvg({ y: -0.125, uc: 0.2, U: 0.4, esc: escHtml, labels: LABELS }));
  const rr = roundResult(-0.125, 0.4);
  assert.equal(neg.querySelectorAll('.ribbon-value')[1].textContent, rr.yround.toFixed(rr.digits));
  assert.equal(neg.querySelectorAll('.ribbon-value')[1].textContent, '-0.13');
  // k chizmadan emas — berilgan U / u_c dan (dvigatel qiymatlari)
  assert.equal(Number(doc.querySelector('svg').getAttribute('data-ribbon-k')), 0.0999 / 0.05);
});

test('ribbonSvg: egri chiziq N(y, u_c) — cho\'qqisi y da, ±u_c dagi balandlik exp(−1/2)', () => {
  const y = 10, uc = 0.5, U = 1;
  const doc = frag(ribbonSvg({ y, uc, U, esc: escHtml, labels: LABELS }));
  const pts = doc.querySelector('.ribbon-curve').getAttribute('d').split(/[ML]/).filter(Boolean).map(p => p.trim().split(' ').map(Number));
  const cx = RIBBON.X0 + RIBBON.SPAN / 2, hgt = RIBBON.BASE - RIBBON.TOP;
  const peak = pts.reduce((a, b) => (b[1] < a[1] ? b : a));
  assert.ok(Math.abs(peak[0] - cx) < 1, 'cho\'qqi markazda');
  assert.ok(Math.abs(peak[1] - RIBBON.TOP) < 0.01);
  // x = y + u_c nuqtasi: markazdan (u_c / U)·SPAN/2 o'ngda
  const xs = cx + (uc / U) * RIBBON.SPAN / 2;
  const near = pts.reduce((a, b) => (Math.abs(b[0] - xs) < Math.abs(a[0] - xs) ? b : a));
  const expected = RIBBON.BASE - hgt * Math.exp(-0.5 * Math.pow((near[0] - cx) / (RIBBON.SPAN / 2) * (U / uc), 2));
  assert.ok(Math.abs(near[1] - expected) < 0.02);
  for (const [px] of pts) assert.ok(px >= 0 && px <= RIBBON.W);
});

test('ribbonSvg: MCM natijasi — ikkala interval (eng qisqa, simmetrik) va o\'rtacha; ±U dan keng bo\'lsa o\'q siqiladi, hech narsa chizmadan chiqmaydi', () => {
  const mc = { low: 9.2, high: 12.9, symLow: 9.0, symHigh: 12.5, mean: 10.4 };
  const svg = ribbonSvg({ y: 10, uc: 0.5, U: 1, mc, esc: escHtml, labels: LABELS });
  const doc = frag(svg);
  assert.ok(doc.querySelector('[data-ribbon-interval="mc-shortest"]'));
  assert.ok(doc.querySelector('[data-ribbon-interval="mc-symmetric"]'));
  assert.ok(doc.querySelector('[data-ribbon-mc-mean]'));
  assert.match(doc.querySelector('[data-ribbon-interval="mc-shortest"] text').textContent, /eng qisqa \[9\.2; 12\.9\]/);
  for (const p of doc.querySelectorAll('[data-ribbon-interval] path')) for (const v of nums(p.getAttribute('d').replace(/V[\d.]+/g, '')).filter((_, i) => i % 2 === 0)) assert.ok(v >= 0 && v <= RIBBON.W, 'x = ' + v);
  const band = doc.querySelector('.ribbon-band');
  assert.ok(Number(band.getAttribute('width')) < RIBBON.SPAN, 'o\'q siqilgan');
  // MCM siz — intervallar yo'q
  assert.equal(frag(ribbonSvg({ y: 10, uc: 0.5, U: 1, esc: escHtml, labels: LABELS })).querySelector('[data-ribbon-interval]'), null);
});

test('ribbonSvg: skriptsiz, uslub atributisiz; yorliqlar escape qilinadi', () => {
  const svg = ribbonSvg({ y: 1, uc: 0.1, U: 0.2, esc: escHtml, labels: { ...LABELS, title: '<img src=x onerror=1>', lpu: '"><script>x</script>' } });
  assert.ok(!/<script|onerror=1>|\sstyle=|javascript:/i.test(svg.replace(/&lt;[^&]*&gt;/g, '')));
  assert.ok(svg.includes('&lt;img'));
  assert.match(svg, /role="img"/);
});

test('heroCard / kpiTiles: qiymatlar dvigatel natijasidan (9 etalon nuqtadan biri) — yaxlitlangan y ± U, k, ν_eff, ustun manba', () => {
  const S = createSections({ ...env, acceptances: () => ({}), canAccept: () => false, lab: () => null });
  for (const id of ['excel-density', 'excel-gas-p2', 'excel-term-p3']) {
    const r = E.evaluate(caseSpec(id));
    const rr = roundResult(r.y, r.U, r.roundUp);
    const hero = frag(S.heroCard(r, {}));
    const [yT, uT] = rr.resultText.split(' ± ');
    assert.equal(hero.querySelector('.hero-y').textContent, yT, id);
    assert.equal(hero.querySelector('.hero-pm').textContent, '± ' + uT, id);
    assert.match(hero.querySelector('[data-hero-meta]').textContent, new RegExp('k = ' + r.k.toFixed(2).replace('.', '\\.')));
    assert.match(hero.querySelector('[data-hero-meta]').textContent, new RegExp('ν_eff = ' + (isFinite(r.nuEff) ? Math.floor(r.nuEff) : '∞')));
    if (r.U > 0) assert.ok(hero.querySelector('svg.ribbon'), id); else assert.equal(hero.querySelector('svg.ribbon'), null, id + ': U = 0 da tasma yo\'q');
    assert.ok(!/\sstyle=/.test(hero.innerHTML));
    const tiles = frag(S.kpiTiles(r));
    assert.deepEqual([...tiles.querySelectorAll('[data-kpi]')].map(x => x.dataset.kpi), ['uc', 'nu', 'k', 'U', 'dominant']);
    const dom = S.dominantSource(r);
    const top = r.budget.filter(b => isFinite(b.share)).reduce((a, b) => (Math.abs(b.share) > Math.abs(a.share) ? b : a));
    assert.equal(dom.share, top.share, id);
  }
});

test('byudjet: νᵢ ustuni (kichik ν belgilanadi), ulush chizig\'i SVG (uslub atributisiz); Pareto — |ulush| bo\'yicha, yig\'ma ulush', () => {
  const S = createSections({ ...env, acceptances: () => ({}), canAccept: () => false, lab: () => null });
  const r = E.evaluate(caseSpec('excel-gas-p2'));
  const html = S.renderBudget(r);
  assert.ok(!/\sstyle=/.test(html));
  const doc = frag(html);
  const rows = [...doc.querySelectorAll('tbody tr')].filter(tr => !tr.classList.contains('row-total'));
  assert.equal(rows.length, r.budget.length);
  r.budget.forEach((b, i) => {
    const cell = rows[i].children[7];
    const noNu = b.kind === 'corr' || b.kind === 'second';
    assert.equal(cell.textContent.trim(), noNu ? '—' : (isFinite(b.nu) ? String(Math.floor(b.nu)) : '∞'));
    // egasi qarori: νᵢ < 10 VA |ulush| ≥ 5 % bo'lsa belgilanadi; ν = ∞ va kichik ulushli manba — yo'q; izohda "loyiha qarori"
    const low = !noNu && isFinite(b.nu) && b.nu < 10 && Math.abs(b.share) >= 5;
    assert.equal(cell.hasAttribute('data-nu-low'), low);
    if (low) assert.equal(cell.getAttribute('title'), DICT.uz.nu_low_tip);
    assert.equal(Number(rows[i].querySelector('svg.share-bar rect').getAttribute('width')), Math.min(100, Math.abs(b.share)));
  });
  assert.equal(doc.querySelector('[data-nu-eff]').textContent, String(Math.floor(r.nuEff)));
  const pr = S.paretoRows(r);
  for (let i = 1; i < pr.length; i++) assert.ok(Math.abs(pr[i - 1].share) >= Math.abs(pr[i].share));
  assert.ok(Math.abs(pr[pr.length - 1].cumulative - r.budget.reduce((a, b) => a + b.share, 0)) < 1e-9);
  assert.equal(frag(S.budgetPareto(r)).querySelectorAll('.pareto-row').length, pr.length);
});
