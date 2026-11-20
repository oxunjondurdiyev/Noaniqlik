/* ═══════════════════════════════════════════════════════════════
   VIZLAB/MODE-MC.JS — a) Monte-Karlo jonli.
   O'ngdagi SONLAR — dvigatel MCM'ining haqiqiy natijalari: M narvoni bo'yicha (10⁴ … 10⁶, qat'iy M, bir xil urug')
   ketma-ket ishga tushiriladi; oxirgi qadam `validation: true` — JCGM 101 §8 xulosasi (validated, δ, d_low, d_high)
   faqat o'sha natijadan o'qiladi, UI da hisoblanmaydi.
   Gistogramma va tushayotgan nuqtalar — FAQAT o'quv modelida: dvigatel generatoridan olingan ILLUSTRATIV oqim
   (dvigatel tanlanmani ham, gistogrammani ham qaytarmaydi). Joriy hisobda — faqat GUM egri chizig'i va intervallar.
═══════════════════════════════════════════════════════════════ */
import { createMonteCarlo } from '../../engine/index.js';
import { roundResult } from '../../report/rounding.js';
import { createRunner } from '../mc/runner.js';
import { teachingCalc, teachingSampler, makeHistogram, TEACH_DISTS, M_LADDER, LAB_NDIG, ladderOptions } from './model.js';
import { mcChartSvg, bell } from './svg.js';
import { h, card, segmented, stats, note, badge, svgHost, sourceSwitch, num, range } from './ui.js';

/** Illustrativ oqim hajmi va tezligi (rasm uchun; natijaga ta'sir qilmaydi). */
export const ILLU = Object.freeze({ N: 4000, bins: 41, dotsPerFrame: 2, bulkPerFrame: 6, fall: 0.045, stepDwellMs: 550 });

const inlineRunner = createRunner({ createMonteCarlo, Worker: null });
const runMc = (win, spec, opts, onProgress) => (win.UCMonteCarlo && typeof win.UCMonteCarlo.run === 'function'
  ? win.UCMonteCarlo.run(spec, opts, onProgress) : inlineRunner.run(spec, opts, onProgress));

export function mcMode(ctx, st) {
  const { doc, t, tf, win } = ctx;
  if (!st.source) st.source = 'calc';
  if (!st.dist) st.dist = 'rect';
  const calc = ctx.calc();
  if (!calc) st.source = 'teach';
  const teaching = st.source !== 'calc';
  const base = teaching ? teachingCalc(st.dist) : calc;
  const r = base.result;
  const lo = r.y - 4 * r.uc, hi = r.y + 4 * r.uc;              // chizish oynasi
  const peak = bell(r.y, r.y, r.uc);

  let alive = true, running = false, job = null, timer = 0, off = null;
  let stepIdx = 0, last = null;
  let hist = null, sampler = null, dots = [], spawned = 0;

  const chart = svgHost(doc);
  const prog = h(doc, 'progress', { class: 'vz-progress', max: 1, value: 0, 'aria-label': t('vz_mc_progress') });
  const progText = h(doc, 'p', { class: 'vz-hint mono', text: t('vz_mc_idle') });
  const st1 = stats(doc, [
    { key: 'gum', label: t('vz_mc_gum') },
    { key: 'uc', label: t('vz_mc_uc') },
    { key: 'lpu', label: tf('vz_mc_lpu_iv', { P: num(r.P * 100, 4) }) },
    { key: 'M', label: t('vz_mc_M') },
    { key: 'mean', label: t('vz_mc_mean') },
    { key: 'u', label: t('vz_mc_u') },
    { key: 'mcm', label: tf('vz_mc_mcm_iv', { P: num(r.P * 100, 4) }) },
  ]);
  const st2 = stats(doc, [
    { key: 'delta', label: t('vz_mc_delta') },
    { key: 'dlow', label: t('vz_mc_dlow') },
    { key: 'dhigh', label: t('vz_mc_dhigh') },
  ]);
  const verdict = h(doc, 'div', { class: 'vz-verdict' }, note(doc, t('vz_mc_verdict_wait'), 'text-muted'));
  const btn = h(doc, 'button', { type: 'button', class: 'btn btn-primary', 'data-vz-key': 'mc-run', text: t('vz_start'), on: { click: () => (running ? stop() : start()) } });
  const reset = h(doc, 'button', { type: 'button', class: 'btn btn-outline', 'data-vz-key': 'mc-reset', text: t('vz_reset'), on: { click: () => ctx.rerender() } });

  st1.set('gum', roundResult(r.y, r.U).resultText + (r.unit && r.unit !== '1' ? ' ' + r.unit : ''));
  st1.set('uc', num(r.uc, 5));
  st1.set('lpu', range(r.y - r.U, r.y + r.U));

  function draw() {
    let yMax = peak * 1.3;
    if (hist && hist.n >= 400) for (let i = 0; i < hist.bins; i++) yMax = Math.max(yMax, hist.density(i) * 1.05);
    chart.set(mcChartSvg({
      W: ctx.W(), lo, hi, y: r.y, uc: r.uc, yMax,
      gum: last ? [last.gumLow, last.gumHigh] : [r.y - r.U, r.y + r.U],
      mcm: last ? [last.intervalLow, last.intervalHigh] : null,
      hist, dots,
      title: t(teaching ? 'vz_mc_chart_teach' : 'vz_mc_chart_calc'),
      lblLpu: t('vz_mc_lbl_lpu'), lblMcm: t('vz_mc_lbl_mcm'), fmt: v => num(v, 4), esc: ctx.esc,
    }));
  }

  /* Illustrativ oqim: bitta kadr. */
  function frame() {
    if (!sampler) return;
    for (let i = 0; i < ILLU.dotsPerFrame && spawned < ILLU.N; i++, spawned++) dots.push({ v: sampler(), t: 0, land: 196 });
    for (let i = 0; i < ILLU.bulkPerFrame && spawned < ILLU.N; i++, spawned++) hist.add(sampler());
    for (const d of dots) d.t += ILLU.fall;
    dots = dots.filter(d => (d.t < 1 ? true : (hist.add(d.v), false)));
    draw();
    if (spawned >= ILLU.N && !dots.length && off) { off(); off = null; }
  }
  function startIllustration() {
    if (!teaching) return;
    hist = makeHistogram(lo, hi, ILLU.bins);
    sampler = teachingSampler(st.dist);
    dots = []; spawned = 0;
    if (ctx.ticker.reduced()) {                                   // kam harakat: yakuniy holat darhol, tushuvchi nuqtalarsiz
      for (; spawned < ILLU.N; spawned++) hist.add(sampler());
      draw();
      return;
    }
    off = ctx.ticker.add(frame);
  }

  function showResult(res) {
    last = res;
    st1.set('M', Number(res.M).toLocaleString());
    st1.set('mean', num(res.mean, 6));
    st1.set('u', res.uDefined === false || res.u === null ? t('vz_mc_u_undefined') : num(res.u, 5));
    st1.set('mcm', range(res.intervalLow, res.intervalHigh));
    draw();
    ctx.announce(tf('vz_mc_live', { M: Number(res.M).toLocaleString(), u: res.u === null ? '—' : num(res.u, 4) }));
  }

  /* §8 xulosasi — faqat dvigatel natijasining maydonlari. */
  function showVerdict(res) {
    st2.set('delta', num(res.delta, 3));
    st2.set('dlow', num(res.dLow, 3));
    st2.set('dhigh', num(res.dHigh, 3));
    const notConverged = (res.findings || []).some(f => f.code === 'mc_not_converged');
    const key = res.validated === true ? 'yes' : res.validated === false ? 'no' : 'na';
    verdict.textContent = '';
    verdict.appendChild(h(doc, 'p', { class: 'vz-verdict-line' },
      badge(doc, t('vz_mc_valid_' + key), key === 'yes' ? 'green' : key === 'no' ? 'red' : 'orange'),
      h(doc, 'span', { class: 'text-sm', text: ' ' + t('vz_mc_valid_' + key + '_txt') })));
    if (notConverged) verdict.appendChild(note(doc, tf('vz_mc_not_converged', { M: Number(res.M).toLocaleString() }), 'vz-warn'));
    verdict.appendChild(note(doc, tf('vz_mc_ndig', { n: res.nDig }), 'text-muted'));
    ctx.announce(t('vz_mc_valid_' + key));
  }

  function next() {
    ctx.ticker.whenActive(() => {
      if (!alive || !running) return;
      const opts = ladderOptions(stepIdx);
      progText.textContent = tf('vz_mc_step', { i: stepIdx + 1, n: M_LADDER.length, M: Number(opts.M).toLocaleString() });
      prog.value = 0;
      job = runMc(win, base.spec, opts, info => { if (alive && running) prog.value = info.progress || 0; });
      job.promise.then(res => {
        job = null;
        if (!alive || !running) return;
        if (!res || res.error) {
          if (!res || res.error !== 'mc_cancelled') progText.textContent = t('vz_mc_error') + ' ' + String((res && res.error) || '');
          finish();
          return;
        }
        prog.value = 1;
        showResult(res);
        if (opts.validation) { showVerdict(res); progText.textContent = t('vz_mc_done'); finish(); return; }
        stepIdx++;
        timer = win.setTimeout(next, ctx.ticker.reduced() ? 0 : ILLU.stepDwellMs);
      });
    });
  }
  function finish() { running = false; btn.textContent = t('vz_start'); }
  function start() {
    if (running) return;
    running = true; stepIdx = 0; last = null;
    btn.textContent = t('vz_stop');
    verdict.textContent = '';
    verdict.appendChild(note(doc, t('vz_mc_verdict_wait'), 'text-muted'));
    if (off) { off(); off = null; }
    startIllustration();
    next();
  }
  function stop() {
    if (job) { job.cancel(); job = null; }
    win.clearTimeout(timer);
    if (off) { off(); off = null; }
    progText.textContent = t('vz_mc_stopped');
    finish();
  }

  draw();
  const controls = card(doc, t('vz_controls'),
    sourceSwitch(ctx, st, !!calc),
    teaching ? segmented(doc, {
      key: 'dist', label: t('vz_mc_dist'), value: st.dist,
      options: TEACH_DISTS.map(d => ({ value: d, label: t('vz_dist_' + d) })),
      hint: t('vz_mc_dist_hint'),
      onChange: v => { st.dist = v; ctx.rerender(); },
    }) : null,
    h(doc, 'div', { class: 'vz-actions' }, btn, reset),
    prog, progText);
  const picture = card(doc, teaching ? t('vz_mc_model_teach') : tf('vz_mc_model_calc', { f: (r.symbol || 'y') + ' = ' + (r.formulaText || '') }),
    chart.el,
    h(doc, 'ul', { class: 'vz-legend' },
      h(doc, 'li', { class: 'vz-lg-curve', text: t('vz_mc_lg_curve') }),
      h(doc, 'li', { class: 'vz-lg-lpu', text: t('vz_mc_lg_lpu') }),
      h(doc, 'li', { class: 'vz-lg-mcm', text: t('vz_mc_lg_mcm') }),
      teaching ? h(doc, 'li', { class: 'vz-lg-hist', text: tf('vz_mc_lg_hist', { N: ILLU.N.toLocaleString() }) }) : null),
    note(doc, teaching ? tf('vz_mc_illustrative', { N: ILLU.N.toLocaleString() }) : t('vz_mc_no_samples'), 'vz-info'));
  const numbers = card(doc, t('vz_mc_numbers'), st1.el,
    h(doc, 'h4', { class: 'vz-sub', text: t('vz_mc_s8') }), st2.el, verdict,
    note(doc, tf('vz_mc_official', { n: LAB_NDIG }), 'text-muted'));
  const el = h(doc, 'div', { class: 'vz-grid vz-grid-mc' }, picture, h(doc, 'div', { class: 'vz-col' }, controls, numbers));

  return {
    el,
    destroy() {
      alive = false; running = false;
      if (job) job.cancel();
      win.clearTimeout(timer);
      if (off) off();
    },
  };
}
