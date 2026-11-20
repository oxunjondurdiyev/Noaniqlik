/* ═══════════════════════════════════════════════════════════════
   VIZLAB/MODE-CONFORMITY.JS — b) Muvofiqlik simulyatori.
   Hukm, muvofiqlik ehtimoli p_c, qabul chegaralari, w, TUR, xavf — faqat dvigatelning decide() natijasidan
   (JCGM 106:2012, ILAC G8:09/2019 — src/engine/decision.js). UI faqat kirishlarni (T, r, y) o'zgartiradi.
═══════════════════════════════════════════════════════════════ */
import { teachingCalc, conformityCase } from './model.js';
import { zoneSvg, gaugeSvg } from './svg.js';
import { h, card, slider, stats, note, badge, svgHost, sourceSwitch, num, pct, range } from './ui.js';

const BADGE = { accept: 'green', guard: 'orange', reject: 'red' };

export function conformityMode(ctx, st) {
  const { doc, t, tf } = ctx;
  if (!st.source) st.source = 'calc';
  if (st.tMult === undefined) { st.tMult = 4; st.r = 1; st.pos = 0.5; }
  const calc = ctx.calc();
  if (!calc) st.source = 'teach';
  const teaching = st.source !== 'calc';
  const res = (teaching ? teachingCalc('normal') : calc).result;
  const base = { y: res.y, u: res.uc, U: res.U };

  const zone = svgHost(doc), gauge = svgHost(doc, 'vz-chart-gauge');
  const verdict = h(doc, 'div', { class: 'vz-verdict' });
  const st1 = stats(doc, [
    { key: 'value', label: t('vz_cf_value') },
    { key: 'tol', label: t('vz_cf_tol') },
    { key: 'w', label: t('vz_cf_w') },
    { key: 'acc', label: t('vz_cf_acc') },
    { key: 'pc', label: t('vz_cf_pc') },
    { key: 'risk', label: t('vz_cf_risk') },
    { key: 'tur', label: t('vz_cf_tur') },
  ]);

  function update() {
    const c = conformityCase(base, st), d = c.decision;
    st1.set('value', num(c.value, 5));
    st1.set('tol', range(c.lower, c.upper));
    verdict.textContent = '';
    if (d.error) {
      zone.set(''); gauge.set('');
      for (const k of ['w', 'acc', 'pc', 'risk', 'tur']) st1.set(k, '—');
      verdict.appendChild(note(doc, d.error === 'decision_guard_exceeds' ? t('vz_cf_err_guard') : t('vz_cf_err') + ' ' + d.error, 'vz-warn'));
      return;
    }
    st1.set('w', num(d.w, 4));
    st1.set('acc', range(d.acceptLower, d.acceptUpper));
    st1.set('pc', pct(d.pc * 100, 2));
    st1.set('risk', pct(d.specificRisk * 100, 2) + ' — ' + t('vz_cf_risk_' + d.riskKind));
    st1.set('tur', d.tur === null ? '—' : num(d.tur, 3));
    zone.set(zoneSvg({ W: ctx.W(), lo: base.y - 1.8 * c.T, hi: base.y + 1.8 * c.T, d, value: c.value, u: base.u, U: base.U, state: c.state,
      title: t('vz_cf_chart'), fmt: v => num(v, 4), esc: ctx.esc }));
    gauge.set(gaugeSvg({ pc: d.pc, state: c.state, text: pct(d.pc * 100, 1), title: t('vz_cf_gauge'), esc: ctx.esc }));
    verdict.appendChild(h(doc, 'p', { class: 'vz-verdict-line' },
      badge(doc, t('vz_cf_state_' + c.state), BADGE[c.state]),
      h(doc, 'span', { class: 'text-sm', text: ' ' + t('vz_cf_v_' + d.verdict) })));
    ctx.announce(tf('vz_cf_live', { v: t('vz_cf_v_' + d.verdict), pc: pct(d.pc * 100, 1) }));
  }

  const controls = card(doc, t('vz_controls'),
    sourceSwitch(ctx, st, !!calc),
    slider(doc, { key: 'cf-y', label: t('vz_cf_s_y'), min: -1.5, max: 1.5, step: 0.01, value: st.pos,
      format: v => num(base.y + v * st.tMult * base.U, 5), onInput: v => { st.pos = v; update(); } }).el,
    slider(doc, { key: 'cf-t', label: t('vz_cf_s_t'), min: 1, max: 8, step: 0.1, value: st.tMult,
      format: v => '± ' + num(v * base.U, 4), hint: t('vz_cf_s_t_hint'), onInput: v => { st.tMult = v; update(); } }).el,
    slider(doc, { key: 'cf-r', label: t('vz_cf_s_r'), min: 0, max: 1.5, step: 0.05, value: st.r,
      format: v => num(v, 3), hint: t('vz_cf_s_r_hint'), onInput: v => { st.r = v; update(); } }).el);
  const picture = card(doc, t('vz_cf_title'), zone.el,
    h(doc, 'ul', { class: 'vz-legend' },
      h(doc, 'li', { class: 'vz-lg-accept', text: t('vz_cf_lg_accept') }),
      h(doc, 'li', { class: 'vz-lg-guard', text: t('vz_cf_lg_guard') }),
      h(doc, 'li', { class: 'vz-lg-reject', text: t('vz_cf_lg_reject') }),
      h(doc, 'li', { class: 'vz-lg-lpu', text: t('vz_cf_lg_u') })),
    note(doc, t(teaching ? 'vz_cf_note_teach' : 'vz_cf_note_calc'), 'vz-info'));
  const numbers = card(doc, t('vz_cf_numbers'), h(doc, 'div', { class: 'vz-gauge-row' }, gauge.el, verdict), st1.el,
    note(doc, t('vz_cf_ref'), 'text-muted'));
  update();
  return { el: h(doc, 'div', { class: 'vz-grid' }, h(doc, 'div', { class: 'vz-col' }, picture, controls), numbers), destroy() {} };
}
