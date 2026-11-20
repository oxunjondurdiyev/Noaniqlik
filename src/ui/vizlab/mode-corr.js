/* ═══════════════════════════════════════════════════════════════
   VIZLAB/MODE-CORR.JS — e) Korrelyatsiya: r sirg'asi, nuqtalar buluti va 95 % ellips.
   u_c(x1 + x2), u_c(x1 − x2), korrelyatsiyasiz qiymat va korrelyatsiya hadi — evaluate() natijasidan
   (JCGM 100:2008 §5.2.2 — hisob dvigatelda). Ellips — gaussianRegion() (JCGM 102:2011 §6.5.2.3).
   Nuqtalar buluti — illustrativ (dvigatel generatori, C.5); undan hech narsa hisoblanmaydi.
═══════════════════════════════════════════════════════════════ */
import { CORR_INPUTS, corrCase, corrCloud } from './model.js';
import { cloudSvg, shareBarSvg } from './svg.js';
import { h, card, slider, stats, note, svgHost, num } from './ui.js';

const CLOUD_N = 260;

export function corrMode(ctx, st) {
  const { doc, t, tf } = ctx;
  if (st.r === undefined) st.r = 0.5;
  const c0 = CORR_INPUTS, scale = c0.u1 + c0.u2;            // chiziqlar masshtabi (eng katta mumkin bo'lgan u_c)

  const cloud = svgHost(doc, 'vz-chart-cloud');
  const bars = h(doc, 'div', { class: 'vz-bars' });
  const st1 = stats(doc, [
    { key: 'r', label: t('vz_co_r') },
    { key: 'termp', label: t('vz_co_term_plus') },
    { key: 'termm', label: t('vz_co_term_minus') },
  ]);
  const term = res => { const b = (res.budget || []).find(x => x.kind === 'corr'); return b ? b.contrib : 0; };

  function update() {
    const c = corrCase(st.r);
    if (c.plus.error || c.minus.error) { cloud.set(''); return; }
    cloud.set(cloudSvg({ points: corrCloud(c.Ux, CLOUD_N), center: [c0.x1, c0.x2], half: 3.3, ellipse: c.region.ellipse,
      title: tf('vz_co_chart', { r: num(c.rEngine, 2) }), lblX: 'X1', lblY: 'X2', esc: ctx.esc }));
    st1.set('r', num(c.rEngine, 3));
    st1.set('termp', num(term(c.plus), 3));
    st1.set('termm', num(term(c.minus), 3));
    bars.textContent = '';
    for (const [key, v, cls] of [['vz_co_plus', c.plus.uc, 'vz-bar-plus'], ['vz_co_zero', c.plus.ucNoCorr, 'vz-bar-zero'], ['vz_co_minus', c.minus.uc, 'vz-bar-minus']]) {
      const host = svgHost(doc, 'vz-chart-bar ' + cls);
      host.set(shareBarSvg(v / scale * 100, ctx.esc, t(key) + ': ' + num(v, 4)));
      bars.appendChild(h(doc, 'div', { class: 'vz-bar-row' }, h(doc, 'span', { class: 'text-sm', text: t(key) }), host.el, h(doc, 'span', { class: 'mono text-sm', text: num(v, 4) })));
    }
    ctx.announce(tf('vz_co_live', { r: num(c.rEngine, 2), p: num(c.plus.uc, 4), m: num(c.minus.uc, 4) }));
  }

  const controls = card(doc, t('vz_controls'),
    slider(doc, { key: 'co-r', label: t('vz_co_s_r'), min: -1, max: 1, step: 0.05, value: st.r, format: v => num(v, 2), onInput: v => { st.r = v; update(); } }).el,
    note(doc, tf('vz_co_inputs', { u1: c0.u1, u2: c0.u2 }), 'text-muted'));
  const picture = card(doc, t('vz_co_title'), cloud.el,
    h(doc, 'ul', { class: 'vz-legend' },
      h(doc, 'li', { class: 'vz-lg-ellipse', text: t('vz_co_lg_ellipse') }),
      h(doc, 'li', { class: 'vz-lg-cloud', text: tf('vz_co_lg_cloud', { N: CLOUD_N }) })),
    note(doc, t('vz_co_note'), 'vz-info'));
  const numbers = card(doc, t('vz_co_numbers'), bars, st1.el, note(doc, t('vz_co_ref'), 'text-muted'));
  update();
  return { el: h(doc, 'div', { class: 'vz-grid' }, picture, h(doc, 'div', { class: 'vz-col' }, controls, numbers)), destroy() {} };
}
