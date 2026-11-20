/* P16 (6-bosqich): Vizual laboratoriya — sof model (src/ui/vizlab/model.js), SVG quruvchilar va jsdom da mount().
   Asosiy talab: laboratoriya metrologik qoidani QAYTA YOZMAYDI — har bir raqam dvigateldan (evaluate, monteCarlo,
   decide, westgard, gaussianRegion). Testlar natijalarni dvigatelni to'g'ridan-to'g'ri chaqirish bilan solishtiradi.
   Haqiqiy brauzerdagi ko'rinish (390 / 834 / 1440, ikki mavzu) qo'lda Playwright bilan ko'rilgan — bu yerda emas. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const E = require('../../src/engine/index.js');
const M = require('../../src/ui/vizlab/model.js');
const S = require('../../src/ui/vizlab/svg.js');
const { createTicker } = require('../../src/ui/vizlab/ui.js');
const { mount, MODES } = require('../../src/ui/vizlab/app.js');
const { escHtml } = require('../../src/ui/escape.js');

const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const DIR = 'src/ui/vizlab';
const FILES = fs.readdirSync(path.join(ROOT, DIR)).filter(f => f.endsWith('.js')).map(f => DIR + '/' + f);
const code = f => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const DENSITY = JSON.parse(read('tests/cases/excel/excel-density.json')).modelSpec.state;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* jsdom oynasi: haqiqiy lug'at (i18n.js + lab + vizlab), soxta appState. */
function makeWindow(opts = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="vizlab-root"></div></body></html>', { url: 'https://example.test/', runScripts: 'outside-only', pretendToBeVisual: true });
  const win = dom.window;
  win.__T = win.eval(['src/js/i18n.js', 'src/js/i18n-lab.js', 'src/js/i18n-vizlab.js'].map(read).join('\n;\n') + '\n;TRANSLATIONS');
  win.i18n.lang = opts.lang || 'uz';
  win.escHtml = escHtml;
  win.matchMedia = q => ({ matches: !!opts.reduced && /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
  const calls = { set: 0 };
  if (opts.state) win.appState = { get: () => opts.state, set() { calls.set++; } };
  return { win, doc: win.document, root: win.document.getElementById('vizlab-root'), calls };
}

/* ── o'quv modellari va dvigatel ── */

test('o\'quv modeli Y = X1 + X2: har bir taqsimot uchun evaluate() xatosiz; spec dvigatel MCM\'iga ham yaroqli', () => {
  assert.deepEqual([...M.TEACH_DISTS], ['normal', 'rect', 'triang', 'ushape']);
  for (const d of M.TEACH_DISTS) {
    const c = M.teachingCalc(d);
    assert.equal(c.result.error, undefined, d);
    assert.equal(c.spec.typeB[0].distribution, d);
    assert.deepEqual(c.result, E.evaluate(M.teachingSpec(d)));
    assert.ok(c.result.uc > 0 && c.result.U > 0);
    const mc = E.monteCarlo(c.spec, { mode: 'fixed', M: 10000, validation: false });
    assert.equal(mc.error, undefined, d);
    assert.equal(mc.M, 10000);
  }
  // boshqa o'quv spec'lari ham dvigatelda xatosiz
  assert.equal(M.budgetTeachingCalc().result.error, undefined);
  for (const r of [-1, -0.5, 0, 0.5, 1]) for (const s of [1, -1]) assert.equal(E.evaluate(M.corrSpec(r, s)).error, undefined, `r=${r}`);
});

test('M narvoni: o\'suvchi, dvigatel chegaralarida, bir xil urug\'; §8 tekshiruvi faqat oxirgi qadamda', () => {
  const L = M.M_LADDER;
  assert.ok(L.length >= 5);
  for (let i = 1; i < L.length; i++) assert.ok(L[i] > L[i - 1]);
  assert.ok(L[0] >= E.MC_LIMITS.minM && L[L.length - 1] <= E.MC_LIMITS.maxM);
  L.forEach((m, i) => {
    const o = M.ladderOptions(i);
    assert.equal(o.mode, 'fixed'); assert.equal(o.M, m); assert.equal(o.seed, E.MC_SEED);
    assert.equal(o.validation, i === L.length - 1);
    assert.equal(E.mcOptions(o).error, undefined);
  });
  // xulosa maydonlari dvigateldan: oddiy qadamda validated = null, tekshiruv qadamida — mantiqiy qiymat
  const spec = M.teachingSpec('rect');
  const plain = E.monteCarlo(spec, { ...M.ladderOptions(0) });
  assert.equal(plain.validated, null);
  const checked = E.monteCarlo(spec, { ...M.ladderOptions(0), validation: true });
  assert.equal(typeof checked.validated, 'boolean');
  assert.ok(Number.isFinite(checked.delta) && Number.isFinite(checked.dLow) && Number.isFinite(checked.dHigh));
});

test('illustrativ oqim: dvigatel generatori — takrorlanuvchan; gistogramma faqat sanaydi', () => {
  for (const d of M.TEACH_DISTS) {
    const a = M.teachingSampler(d), b = M.teachingSampler(d);
    const xs = Array.from({ length: 200 }, () => a());
    assert.deepEqual(xs, Array.from({ length: 200 }, () => b()), d);
    const r = M.teachingCalc(d).result;
    assert.ok(xs.every(v => Math.abs(v - r.y) < 8 * r.uc), d);
  }
  // to'g'ri burchakli X1: birinchi qiymat dvigatel generatorining birinchi sonidan (JCGM 101 §6.4.2.4)
  const rng = E.createRng(undefined, E.MC_SEED), t = M.TEACH_INPUTS;
  const first = M.teachingSampler('rect')();
  assert.ok(first >= t.x1 - t.a1 - 5 && first <= t.x1 + t.a1 + 5);
  assert.ok(rng.next() > 0);
  const h = M.makeHistogram(0, 10, 5);
  [1, 1.5, 9.9, -3, 12].forEach(v => h.add(v));
  assert.deepEqual(h.counts, [2, 0, 0, 0, 1]);
  assert.equal(h.n, 5);
  assert.equal(h.density(0), 2 / (5 * 2));
});

/* ── muvofiqlik ── */

test('muvofiqlik: holat va barcha sonlar decide() dan (non_binary, guard_band)', () => {
  const r = M.teachingCalc('normal').result;
  const base = { y: r.y, u: r.uc, U: r.U };
  const seen = new Set();
  for (const pos of [-1.4, -1.1, -0.9, 0, 0.6, 0.9, 1.1, 1.4]) {
    const p = { tMult: 4, r: 1, pos };
    const c = M.conformityCase(base, p);
    const d = E.decide({ value: base.y + pos * 4 * base.U, u: base.u, U: base.U, lower: base.y - 4 * base.U, upper: base.y + 4 * base.U, rule: 'guard_band', r: 1, statement: 'non_binary' });
    assert.deepEqual(c.decision, d);
    assert.equal(c.state, M.VERDICT_STATE[d.verdict]);
    seen.add(d.verdict);
  }
  assert.deepEqual([...seen].sort(), ['conditional_fail', 'conditional_pass', 'fail', 'pass']);
  assert.deepEqual({ ...M.VERDICT_STATE }, { pass: 'accept', conditional_pass: 'guard', conditional_fail: 'guard', fail: 'reject' });
  // himoya zonasi toleransdan keng: dvigatel xatosi ko'rsatiladi, UI hukm o'ylab topmaydi
  const bad = M.conformityCase(base, { tMult: 1, r: 1.5, pos: 0 });
  assert.equal(bad.decision.error, 'decision_guard_exceeds');
  assert.equal(bad.state, null);
});

/* ── QC ── */

test('QC ketma-ketligi: Westgard — dvigatelning westgard() i (darvoza bilan); kutilgan qoidalar va ushlab qolinganlar', () => {
  const full = M.qcStep(M.QC_SEQUENCE.length);
  const z = E.zScores([...M.QC_SEQUENCE], M.QC_TARGET.mean, M.QC_TARGET.s);
  assert.deepEqual(full.westgard, E.westgard(z, { gate: true }));
  assert.deepEqual(full.limits, E.targetLimits(M.QC_TARGET));
  assert.deepEqual(full.westgard.violations.map(v => v.rule), ['1_3s', '2_2s', '4_1s', '10_x']);
  // birinchi 13 nuqta — nazorat ostida
  assert.equal(M.qcStep(13).westgard.inControl, true);
  // 14-nuqta: 4₁s oynasi ±2s dan oshmagan nuqta bilan tugaydi → darvoza ushlab qoladi (Westgard 1981, 1-rasm)
  const s14 = M.qcStep(14).westgard;
  assert.equal(s14.inControl, true);
  assert.deepEqual(s14.suppressed.map(s => s.rule), ['4_1s']);
  // darvoza o'chirilsa o'sha nuqtada qoida ishlaydi — farq dvigatel sozlamasidan
  assert.deepEqual(M.qcStep(14, { gate: false }).westgard.violations.map(v => v.rule), ['4_1s']);
  const log = M.qcLog(M.QC_SEQUENCE.length);
  assert.deepEqual(log, [
    { point: 14, fired: [], suppressed: ['4_1s'] },
    { point: 15, fired: [], suppressed: ['4_1s'] },
    { point: 16, fired: ['4_1s'], suppressed: [] },
    { point: 17, fired: ['2_2s', '4_1s'], suppressed: [] },
    { point: 18, fired: [], suppressed: ['4_1s', '10_x'] },
    { point: 19, fired: ['4_1s', '10_x'], suppressed: [] },
    { point: 20, fired: ['1_3s', '2_2s', '4_1s', '10_x'], suppressed: [] },
  ]);
  assert.equal(M.qcStep(0).values.length, 0);
});

/* ── korrelyatsiya ── */

test('korrelyatsiya: u_c(x1 ± x2) evaluate() dan; r = 0 da ikkalasi teng; ellips gaussianRegion() dan', () => {
  const c0 = M.corrCase(0);
  assert.equal(c0.plus.uc, c0.minus.uc);
  assert.equal(c0.plus.uc, c0.plus.ucNoCorr);
  for (const r of [-1, -0.45, 0.3, 0.9, 1]) {
    const c = M.corrCase(r);
    assert.deepEqual(c.plus, E.evaluate(M.corrSpec(r, 1)));
    assert.deepEqual(c.minus, E.evaluate(M.corrSpec(r, -1)));
    assert.ok(Math.abs(c.rEngine - r) < 1e-12);
    assert.equal(r > 0, c.plus.uc > c.minus.uc);
    assert.deepEqual(c.region, E.gaussianRegion([M.CORR_INPUTS.x1, M.CORR_INPUTS.x2], c.Ux, 0.95));
    const cloud = M.corrCloud(c.Ux, 50);
    assert.equal(cloud.length, 50);
    assert.deepEqual(cloud, M.corrCloud(c.Ux, 50));
  }
});

/* ── byudjet sezgirligi ── */

test('sezgirlik: ×1 — aynan asl natija; masshtab dvigatel byudjetidagi u ni f marta o\'zgartiradi; asl spec o\'zgarmaydi', () => {
  for (const [name, spec] of [['density', DENSITY], ['teaching', M.budgetTeachingSpec()]]) {
    const frozen = JSON.stringify(spec);
    const base = E.evaluate(spec);
    const sources = M.scalableSources(spec, base);
    assert.ok(sources.length >= 3, name);
    for (const src of sources) {
      const one = M.sensitivityCase(spec, src, 1);
      assert.equal(one.spec, spec);
      for (const k of ['y', 'uc', 'nuEff', 'k', 'U']) assert.deepEqual(one.result[k], base[k], `${name} ${src.name} ${k}`);
      assert.deepEqual(one.result, base);
      for (const f of [0.25, 2, 3]) {
        const sc = M.sensitivityCase(spec, src, f);
        assert.equal(sc.result.error, undefined);
        assert.notEqual(sc.spec, spec);
        assert.deepEqual(sc.result, E.evaluate(sc.spec));             // k, U — dvigateldan
        assert.ok(Math.abs(sc.result.budget[src.row].u / base.budget[src.row].u - f) < 1e-9, `${name} ${src.name} ×${f}`);
        assert.ok(Math.abs(sc.result.y - base.y) < 1e-12 * Math.max(1, Math.abs(base.y)));
        assert.equal(sc.result.budget[src.row].name, src.name);
      }
    }
    assert.equal(JSON.stringify(spec), frozen, 'asl spec o\'zgarmagan');
  }
  // o'quv modeli: A tur manba ×3 → ν_eff chegaradan past (Monte-Karlo tavsiyasi ko'rinadi)
  const t = M.budgetTeachingCalc();
  const a = M.scalableSources(t.spec, t.result).find(s => s.kind === 'A');
  assert.ok(t.result.nuEff > M.NU_EFF_MC_HINT);
  assert.ok(M.sensitivityCase(t.spec, a, 3).result.nuEff < M.NU_EFF_MC_HINT);
  assert.equal(M.shareRows(t.result).length, 3);
});

test('joriy hisob: report.js yo\'li bilan; yaroqsiz / ko\'p chiqishli holatda null; ilova holati o\'zgartirilmaydi', () => {
  assert.equal(M.currentCalc({}), null);
  assert.equal(M.currentCalc({ appState: { get: () => ({ params: [], model: { formula: '' } }) } }), null);
  assert.equal(M.currentCalc({ appState: { get: () => ({ ...DENSITY, outputs: [{ formula: 'a = m' }, { formula: 'b = V' }] }) } }), null);
  const frozen = JSON.stringify(DENSITY);
  const c = M.currentCalc({ appState: { get: () => DENSITY } });
  assert.deepEqual(c.result, E.evaluate(DENSITY));
  assert.notEqual(c.spec, DENSITY);
  assert.equal(JSON.stringify(DENSITY), frozen);
  // shablonli hisob: UCTemplates.evaluateState(st).state ishlatiladi
  const viaTpl = M.currentCalc({ appState: { get: () => ({ template: { id: 'x' } }) }, UCTemplates: { evaluateState: () => ({ state: DENSITY }) } });
  assert.equal(viaTpl.result.y, c.result.y);
});

/* ── SVG va DOM ── */

test('SVG quruvchilar: style atributi, skript va hodisa yo\'q; role="img" + aria-label; matn escape qilinadi', () => {
  const esc = escHtml, fmt = v => String(v);
  const r = M.teachingCalc('rect').result;
  const hist = M.makeHistogram(r.y - 4 * r.uc, r.y + 4 * r.uc, 21);
  const smp = M.teachingSampler('rect');
  for (let i = 0; i < 500; i++) hist.add(smp());
  const cf = M.conformityCase({ y: r.y, u: r.uc, U: r.U }, { tMult: 4, r: 1, pos: 0.9 });
  const qc = M.qcStep(20), co = M.corrCase(0.6);
  const svgs = [
    S.mcChartSvg({ W: 360, lo: hist.lo, hi: hist.hi, y: r.y, uc: r.uc, yMax: 1, gum: [9, 11], mcm: [9.1, 10.9], hist, dots: [{ v: 10, t: 0.5, land: 196 }], title: '<b>"x"', lblLpu: 'a', lblMcm: 'b', fmt, esc }),
    S.zoneSvg({ W: 640, lo: cf.lower - cf.T, hi: cf.upper + cf.T, d: cf.decision, value: cf.value, u: r.uc, U: r.U, state: cf.state, title: 't', fmt, esc }),
    S.gaugeSvg({ pc: cf.decision.pc, state: cf.state, text: '50 %', title: 't', esc }),
    S.qcSvg({ W: 360, total: 20, values: qc.values, limits: qc.limits, flagged: qc.westgard.flagged, suppressed: new Set([13]), title: 't', pointLabel: i => `<${i}>`, esc }),
    S.cloudSvg({ points: M.corrCloud(co.Ux, 30), center: [10, 6], half: 3.3, ellipse: co.region.ellipse, title: 't', lblX: 'X1', lblY: 'X2', esc }),
    S.shareBarSvg(-22.5, esc, 't'), S.shareBarSvg(140, esc, 't'),
    ...S.SKETCHES.map(k => S.sketchSvg(k, esc, 't')),
  ];
  assert.equal(S.SKETCHES.length, 4);
  for (const s of svgs) {
    assert.match(s, /^<svg [^>]*role="img" aria-label="[^"]*"/);
    assert.ok(!/\sstyle=|<style|<script|\son[a-z]+=|javascript:|NaN|undefined|Infinity/.test(s), s.slice(0, 120));
    const dom = new JSDOM(s, { contentType: 'image/svg+xml' });         // to'g'ri tuzilgan XML
    assert.equal(dom.window.document.documentElement.nodeName, 'svg');
  }
  assert.ok(svgs[0].includes('aria-label="&lt;b&gt;&quot;x&quot;"'));
  assert.ok(svgs[3].includes('<title>&lt;19&gt;</title>'));
  assert.equal((svgs[3].match(/class="vz-qc-flag/g) || []).length, Object.keys(qc.westgard.flagged).length);
});

test('mount(): olti rejim, har birida "o\'quv namunasi" belgisi; style atributi va saqlash yo\'q; uch tilda', () => {
  for (const lang of ['uz', 'ru', 'en']) {
    const { win, doc, root, calls } = makeWindow({ lang, state: DENSITY, reduced: true });
    const writes = [];
    const proto = Object.getPrototypeOf(win.localStorage);
    const orig = proto.setItem;
    proto.setItem = function (k) { writes.push(k); };
    const app = mount(root, { window: win });
    assert.deepEqual(MODES.map(m => m.key), ['mc', 'conformity', 'extreme', 'qc', 'corr', 'budget']);
    assert.equal(root.querySelectorAll('[data-vz-mode]').length, 6);
    assert.ok(root.querySelector('[aria-live="polite"]'));
    for (const m of MODES) {
      app.setMode(m.key);
      assert.equal(app.mode(), m.key);
      const panel = root.querySelector(`[data-vz-panel="${m.key}"]`);
      assert.ok(panel, m.key);
      const sample = win.i18n.t('vz_sample');
      assert.ok([...panel.querySelectorAll('.vz-mode-head .badge')].some(b => b.textContent === sample), m.key + ': belgi');
      assert.equal(root.querySelector('[data-vz-mode][aria-pressed="true"]').dataset.vzMode, m.key);
      // sirg'alarni qimirlatish — xatosiz
      for (const inp of panel.querySelectorAll('input[type="range"]')) {
        inp.value = inp.max; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
        inp.value = inp.min; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
      }
      const html = root.innerHTML;
      assert.ok(!/\sstyle=|<style|<script|\son[a-z]+=/.test(html), m.key + ': style / skript');
      assert.ok(!/vz_[a-z]+_|lb_rule_|undefined|NaN/.test(root.textContent), m.key + ': tarjimasiz kalit yoki NaN — ' + (root.textContent.match(/.{20}(vz_[a-z]+_|lb_rule_|undefined|NaN).{20}/) || [''])[0]);
      for (const svg of panel.querySelectorAll('svg')) { assert.equal(svg.getAttribute('role'), 'img'); assert.ok(svg.getAttribute('aria-label')); }
      for (const inp of panel.querySelectorAll('input, select')) assert.ok(inp.id && panel.querySelector(`label[for="${inp.id}"]`), m.key + ': label');
      for (const b of panel.querySelectorAll('button')) assert.equal(b.getAttribute('type'), 'button');
    }
    assert.deepEqual(writes, []);
    assert.equal(calls.set, 0);
    assert.equal(win.sessionStorage.length, 0);
    app.destroy();
    proto.setItem = orig;
    assert.equal(root.children.length, 0);
    win.close();
  }
});

test('joriy hisob bo\'lmasa — o\'quv modeli (tugma o\'chirilgan, izoh bor); bo\'lsa — joriy hisob sonlari', () => {
  const none = makeWindow({ reduced: true });
  const a = mount(none.root, { window: none.win });
  for (const m of ['mc', 'conformity', 'budget']) {
    a.setMode(m);
    const btn = [...none.root.querySelectorAll('[data-vz-key]')].find(b => b.getAttribute('data-vz-key') === 'src:calc');
    assert.equal(btn.disabled, true, m);
    assert.ok(none.root.textContent.includes(none.win.i18n.t('vz_src_none')), m);
  }
  a.destroy(); none.win.close();

  const has = makeWindow({ state: DENSITY, reduced: true, lang: 'en' });
  const b = mount(has.root, { window: has.win });
  b.setMode('budget');
  const r = E.evaluate(DENSITY);
  const cell = t => [...has.root.querySelectorAll('.vz-table tbody tr')].map(tr => [...tr.children].map(c => c.textContent));
  const rows = cell();
  assert.equal(rows[2][1], r.nuEff.toFixed(1));                       // ν_eff
  assert.equal(rows[3][1], r.k.toPrecision(4));                       // k — dvigateldan
  assert.equal(rows[3][2], r.k.toPrecision(4));
  // manba ×3: jadvaldagi k va U — evaluate() natijasi
  const src = M.scalableSources(DENSITY, r)[0];
  const range = has.root.querySelector('input[type="range"]');
  range.value = '3'; range.dispatchEvent(new has.win.Event('input', { bubbles: true }));
  const sc = M.sensitivityCase(DENSITY, src, 3).result;
  const now = cell();
  assert.equal(now[3][2], sc.k.toPrecision(4));
  assert.equal(now[4][2], sc.U.toPrecision(4));
  assert.equal(has.root.querySelectorAll('.vz-bars .vz-bar-row').length, M.shareRows(sc).length);
  b.destroy(); has.win.close();
});

test('Monte-Karlo rejimi: sonlar dvigatel natijasidan; §8 xulosasi `validation: true` natijasidan; UCMonteCarlo ishlatiladi', async () => {
  const { win, root } = makeWindow({ reduced: true, lang: 'en' });
  const seen = [];
  // soxta bajaruvchi: sozlamalarni yozib oladi va dvigatelni KICHIK M bilan chaqiradi (test tez bo'lishi uchun)
  win.UCMonteCarlo = {
    run(spec, opts) {
      seen.push(opts);
      const res = E.monteCarlo(spec, { ...opts, M: 10000 });
      return { promise: Promise.resolve(res), cancel() {} };
    },
  };
  const app = mount(root, { window: win });
  root.querySelector('[data-vz-key="mc-run"]').click();
  for (let i = 0; i < 100 && seen.length < M.M_LADDER.length; i++) await sleep(5);
  await sleep(20);
  assert.deepEqual(seen.map(o => o.M), [...M.M_LADDER]);
  assert.deepEqual(seen.map(o => o.validation), M.M_LADDER.map((_, i) => i === M.M_LADDER.length - 1));
  assert.ok(seen.every(o => o.mode === 'fixed' && o.seed === E.MC_SEED));
  const spec = M.teachingSpec('rect');
  const final = E.monteCarlo(spec, { ...M.ladderOptions(M.M_LADDER.length - 1), M: 10000 });
  const text = root.textContent;
  assert.ok(text.includes(final.mean.toPrecision(6)), 'MCM o\'rtachasi');
  assert.ok(text.includes(final.u.toPrecision(5)), 'u(y)');
  assert.ok(text.includes(final.delta.toPrecision(3)) && text.includes(final.dLow.toPrecision(3)) && text.includes(final.dHigh.toPrecision(3)), 'δ, d_low, d_high');
  const key = final.validated === true ? 'yes' : final.validated === false ? 'no' : 'na';
  assert.equal(root.querySelector('.vz-verdict .badge').textContent, win.i18n.t('vz_mc_valid_' + key));
  // kam harakat: gistogramma darhol to'liq, tushuvchi nuqtalar yo'q
  assert.ok(root.querySelectorAll('.vz-bar').length > 5);
  assert.equal(root.querySelectorAll('.vz-dot').length, 0);
  assert.ok(text.includes(win.i18n.tf('vz_mc_illustrative', { N: (4000).toLocaleString() })));
  app.destroy(); win.close();
});

test('QC rejimi (kam harakat): barcha nuqtalar birdan; jurnal va holat dvigatel natijasidan', () => {
  const { win, root } = makeWindow({ reduced: true, lang: 'en' });
  const app = mount(root, { window: win });
  app.setMode('qc');
  assert.equal(root.querySelectorAll('.vz-svg g[class^="vz-qc-"]').length, M.QC_SEQUENCE.length);
  assert.equal(root.querySelectorAll('.vz-log .vz-log-item').length, M.qcLog(20).length);
  assert.ok(root.textContent.includes(win.i18n.t('vz_qc_out')));
  // darvozani o'chirish — dvigatel `gate: false` bilan: ushlab qolingan yozuv qolmaydi
  const gate = root.querySelector('input[type="checkbox"]');
  gate.checked = false; gate.dispatchEvent(new win.Event('change', { bubbles: true }));
  assert.equal(root.querySelectorAll('.vz-log .badge-orange').length, 0);
  assert.ok(root.textContent.includes(win.i18n.t('vz_qc_gate_off')));
  app.destroy(); win.close();
});

/* ── harakat ── */

test('harakat sikli: sahifa yashirin yoki yorliq faol emas — to\'xtaydi; kam harakatda umuman ishlamaydi', () => {
  const mk = reduced => {
    const { win, doc } = makeWindow({ reduced });
    let hidden = false, id = 0;
    const pending = new Map();
    Object.defineProperty(doc, 'hidden', { get: () => hidden });
    win.requestAnimationFrame = fn => { pending.set(++id, fn); return id; };
    win.cancelAnimationFrame = i => pending.delete(i);
    const flush = () => { const fs2 = [...pending.values()]; pending.clear(); fs2.forEach((fn, i) => fn(1000 + i)); };
    return { win, doc, pending, flush, setHidden: v => { hidden = v; doc.dispatchEvent(new win.Event('visibilitychange')); } };
  };
  const a = mk(false);
  const ticker = createTicker(a.win);
  let n = 0;
  const off = ticker.add(() => { n++; });
  assert.equal(ticker.running(), true);
  a.flush(); assert.equal(n, 1);
  a.setHidden(true);
  assert.equal(ticker.running(), false); assert.equal(a.pending.size, 0);
  let later = 0;
  ticker.whenActive(() => { later++; });
  assert.equal(later, 0);
  a.setHidden(false);
  assert.equal(ticker.running(), true); assert.equal(later, 1);
  a.doc.dispatchEvent(new a.win.CustomEvent('tabchange', { detail: { tab: 'results' } }));
  assert.equal(ticker.running(), false);
  a.doc.dispatchEvent(new a.win.CustomEvent('tabchange', { detail: { tab: 'vizlab' } }));
  assert.equal(ticker.running(), true);
  off();
  assert.equal(ticker.running(), false);
  ticker.destroy(); a.win.close();

  const b = mk(true);
  const t2 = createTicker(b.win);
  t2.add(() => { throw new Error('kam harakatda sikl ishlamasligi kerak'); });
  assert.equal(t2.running(), false); assert.equal(b.pending.size, 0);
  assert.equal(t2.reduced(), true);
  t2.destroy(); b.win.close();
});

/* ── statik tekshiruvlar ── */

test('manba: dvigatel va hisobot qatlami import qilinadi (nusxa emas); saqlash, tarmoq, inline uslub yo\'q', () => {
  const all = FILES.map(code).join('\n');
  assert.match(code(DIR + '/model.js'), /from '\.\.\/\.\.\/engine\/index\.js'/);
  assert.match(all, /from '\.\.\/\.\.\/report\/rounding\.js'/);
  assert.match(all, /from '\.\.\/\.\.\/report\/format\.js'/);
  for (const f of FILES) {
    const c = code(f);
    assert.ok(!/localStorage|sessionStorage|indexedDB|appState\.set|\bfetch\(|XMLHttpRequest|firebase|document\.cookie/.test(c), f + ': saqlash / tarmoq');
    assert.ok(!/style="|<style|\.style\.cssText|setAttribute\('style'|insertAdjacentHTML|document\.write|\beval\(|new Function/.test(c), f + ': inline uslub / xavfli API');
    assert.ok(!/setInterval\(/.test(c), f + ': setInterval');
    // metrologik formulalar UI da qayta yozilmagan: t / normal kvantil, Welch–Satterthwaite, Westgard chegaralari
    assert.ok(!/tQuantile|normalQuantile|normalCdf|coverageFactor|Math\.abs\(z|> 3\b.*z\[/.test(c), f + ': qoida nusxasi');
  }
  // innerHTML — faqat SVG idishida (ui.js svgHost)
  const inner = FILES.filter(f => /\.innerHTML\s*=/.test(code(f)));
  assert.deepEqual(inner, [DIR + '/ui.js']);
  assert.equal((code(DIR + '/ui.js').match(/\.innerHTML\s*=/g) || []).length, 1);
  // sikl: requestAnimationFrame faqat ui.js da, visibilitychange / tabchange / prefers-reduced-motion bilan
  const ui = code(DIR + '/ui.js');
  assert.deepEqual(FILES.filter(f => /requestAnimationFrame/.test(code(f))), [DIR + '/ui.js']);
  assert.match(ui, /visibilitychange/); assert.match(ui, /tabchange/); assert.match(ui, /prefers-reduced-motion: reduce/);
  // dvigatel va hisobot qatlami o'zgarmagan — tests/security (xesh) tekshiradi; bu yerda faqat vizlab fayllari
  assert.equal(JSON.parse(read(DIR + '/package.json')).type, 'module');
});

test('vizlab.css: faqat tokenlar (rang kodi, gradient, soya yo\'q); @keyframes — transform / opacity; bosiladigan maydon ≥ --tap', () => {
  const css = read('src/css/vizlab.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.deepEqual(css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g) || [], []);
  assert.ok(!/gradient\(|box-shadow|border-left:\s*\d+px solid var\(--c-(blue|amber|green|red|violet)/.test(css));
  const tokens = read('src/css/tokens.css');
  for (const v of new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]))) assert.ok(tokens.includes(v + ':'), v + ' tokens.css da yo\'q');
  const frames = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
  assert.ok(frames.length >= 1);
  for (const k of frames) for (const p of [...k[2].matchAll(/([a-z-]+)\s*:/g)].map(x => x[1])) assert.ok(['transform', 'opacity'].includes(p), k[1] + ': ' + p);
  for (const m of css.matchAll(/animation:\s*([\w-]+)\s+([\d.]+)(ms|s)[^;]*infinite/g)) assert.ok(Number(m[2]) / (m[3] === 'ms' ? 1000 : 1) >= 2, m[1]);
  assert.match(css, /\.vz-range\s*\{[^}]*min-height: var\(--tap\)/);
  assert.match(css, /\.vz-select\s*\{[^}]*min-height: var\(--tap\)/);
  // JS da ishlatilgan har bir vz- sinfi (SVG / DOM) CSS da bor yoki ataylab uslubsiz
  const used = new Set(FILES.flatMap(f => [...read(f).matchAll(/\bvz-[a-z0-9-]+/g)].map(m => m[0])));
  const unstyled = new Set(['vz-rng', 'vz-gate', 'vz-src', 'vz-chart-gauge', 'vz-chart-sketch', 'vz-chart-cloud', 'vz-chart-bar', 'vz-iv', 'vz-st', 'vz-lg', 'vz-bar-plus', 'vz-qc', 'vz-key', 'vz-mode', 'vz-panel']);
  const missing = [...used].filter(c => !unstyled.has(c) && !c.endsWith('-') && !css.includes('.' + c));
  assert.deepEqual(missing, []);
});

test('lug\'at: koddagi har bir vz_ kaliti uch tilda bor; ishlatilmagan kalit yo\'q', () => {
  const { win } = makeWindow();
  const T = win.__T;
  const keys = [...read('src/js/i18n-vizlab.js').matchAll(/^\s{6}(vz_[a-zA-Z0-9_]+):/gm)].map(m => m[1]);
  const uniq = [...new Set(keys)];
  assert.equal(keys.length, uniq.length * 3);
  const src = FILES.map(read).join('\n');
  const literal = new Set([...src.matchAll(/'(vz_[a-zA-Z0-9_]+)'/g)].map(m => m[1]));
  const prefixes = [...literal].filter(k => k.endsWith('_'));
  for (const k of literal) if (!k.endsWith('_')) for (const l of ['uz', 'ru', 'en']) assert.ok(typeof T[l][k] === 'string' && T[l][k], `${l}.${k}`);
  // dinamik kalitlar
  const dyn = [
    ...MODES.flatMap(m => ['vz_m_' + m.key, 'vz_d_' + m.key]), ...M.TEACH_DISTS.map(d => 'vz_dist_' + d),
    ...['yes', 'no', 'na'].flatMap(k => ['vz_mc_valid_' + k, 'vz_mc_valid_' + k + '_txt']),
    ...Object.keys(M.VERDICT_STATE).map(v => 'vz_cf_v_' + v), ...new Set(Object.values(M.VERDICT_STATE).map(s => 'vz_cf_state_' + s)),
    'vz_cf_risk_consumer', 'vz_cf_risk_producer',
    ...S.SKETCHES.flatMap(k => ['title', 'text', 'do'].map(p => `vz_ex_${k}_${p}`)),
    ...E.WESTGARD_RULES.flatMap(r => ['lb_rule_' + r, 'lb_rule_desc_' + r]),
  ];
  for (const k of dyn) for (const l of ['uz', 'ru', 'en']) assert.ok(typeof T[l][k] === 'string' && T[l][k], `${l}.${k}`);
  const unused = uniq.filter(k => !literal.has(k) && !dyn.includes(k) && !prefixes.some(p => k.startsWith(p) && dyn.includes(k)));
  assert.deepEqual(unused, []);
  // majburiy bayonotlar: chegaralar — loyiha qarori; gistogramma — illustrativ
  for (const l of ['uz', 'ru', 'en']) {
    assert.match(T[l].vz_ex_thresholds, /JCGM 101:2008 §5\.7/);
    assert.match(T[l].vz_mc_illustrative, /\{N\}/);
    assert.match(T[l].vz_bu_mc_hint, /JCGM 101 §5\.7/);
  }
  win.close();
});
