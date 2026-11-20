/* ═══════════════════════════════════════════════════════════════
   VIZLAB/MODE-EXTREME.JS — c) Chegaraviy holatlar kartalari (faqat tushuntirish; harakat — faqat CSS).
   Chizmalar sxematik: hech narsa hisoblanmaydi. Chegaralar (> 50 %, ν_eff < 6) — LOYIHA QARORLARI;
   JCGM 101:2008 §5.7 faqat sifat mezonlarini beradi — matnda shunday yozilgan.
═══════════════════════════════════════════════════════════════ */
import { SKETCHES, sketchSvg } from './svg.js';
import { h, note, svgHost } from './ui.js';

export function extremeMode(ctx) {
  const { doc, t } = ctx;
  const cards = SKETCHES.map(k => {
    const pic = svgHost(doc, 'vz-chart-sketch');
    pic.set(sketchSvg(k, ctx.esc, t('vz_ex_' + k + '_title')));
    return h(doc, 'section', { class: 'vz-card vz-ex-card' },
      pic.el,
      h(doc, 'h3', { class: 'vz-card-title', text: t('vz_ex_' + k + '_title') }),
      h(doc, 'p', { class: 'text-sm', text: t('vz_ex_' + k + '_text') }),
      h(doc, 'p', { class: 'vz-ex-do text-sm' }, h(doc, 'strong', { text: t('vz_ex_do') + ' ' }), t('vz_ex_' + k + '_do')));
  });
  const el = h(doc, 'div', { class: 'vz-col' },
    note(doc, t('vz_ex_thresholds'), 'vz-info'),
    h(doc, 'div', { class: 'vz-grid vz-grid-4' }, cards),
    note(doc, t('vz_ex_sketch'), 'text-muted'));
  return { el, destroy() {} };
}
