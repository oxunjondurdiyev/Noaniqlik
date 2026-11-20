/* ═══════════════════════════════════════════════════════════════
   VIZLAB/MODE-BUDGET.JS — f) Byudjet sezgirligi: bitta manbaning u si ×0,25 … ×3.
   Har bir o'zgarishda spec NUSXASI bilan evaluate() qayta chaqiriladi: u_c, ν_eff, k, U va ulushlar — dvigateldan
   (k hech qachon jadvaldan olinmaydi). Joriy hisob o'zgarmaydi va hech narsa saqlanmaydi.
═══════════════════════════════════════════════════════════════ */
import { roundResult } from '../../report/rounding.js';
import { budgetTeachingCalc, scalableSources, sensitivityCase, shareRows, SCALE_RANGE, NU_EFF_MC_HINT } from './model.js';
import { shareBarSvg } from './svg.js';
import { h, card, slider, note, svgHost, sourceSwitch, num, pct, nuText, uid } from './ui.js';

export function budgetMode(ctx, st) {
  const { doc, t, tf } = ctx;
  if (!st.source) st.source = 'calc';
  if (st.f === undefined) st.f = 1;
  const calc = ctx.calc();
  if (!calc) st.source = 'teach';
  const teaching = st.source !== 'calc';
  const base = teaching ? budgetTeachingCalc() : calc;
  const sources = scalableSources(base.spec, base.result);
  if (!sources.some(s => s.row === st.row)) st.row = sources.length ? sources[0].row : -1;
  const current = () => sources.find(s => s.row === st.row) || null;
  const kindLabel = s => t(s.kind === 'A' ? 'vz_bu_kind_a' : 'vz_bu_kind_b');

  const tbody = h(doc, 'tbody');
  const table = h(doc, 'table', { class: 'vz-table' },
    h(doc, 'thead', {}, h(doc, 'tr', {},
      h(doc, 'th', { scope: 'col', text: t('vz_bu_col_q') }), h(doc, 'th', { scope: 'col', text: t('vz_bu_col_base') }), h(doc, 'th', { scope: 'col', text: t('vz_bu_col_now') }))),
    tbody);
  const shares = h(doc, 'div', { class: 'vz-bars' });
  const hint = h(doc, 'div', { class: 'vz-verdict' });

  function update() {
    const src = current();
    tbody.textContent = ''; shares.textContent = ''; hint.textContent = '';
    if (!src) { hint.appendChild(note(doc, t('vz_bu_no_sources'), 'vz-warn')); return; }
    const b = base.result, sc = sensitivityCase(base.spec, src, st.f), r = sc.result;
    if (!r || r.error) { hint.appendChild(note(doc, t('vz_bu_err') + ' ' + String(r && r.error), 'vz-warn')); return; }
    const row = (label, a, c, changed) => tbody.appendChild(h(doc, 'tr', {},
      h(doc, 'th', { scope: 'row', text: label }), h(doc, 'td', { class: 'mono', text: a }), h(doc, 'td', { class: 'mono' + (changed ? ' vz-changed' : ''), text: c })));
    const ui = x => num((x.budget[src.row] || {}).u, 4);
    row(tf('vz_bu_ui', { name: src.name }), ui(b), ui(r), st.f !== 1);
    row(t('vz_bu_uc'), num(b.uc, 4), num(r.uc, 4), b.uc !== r.uc);
    row(t('vz_bu_nu'), nuText(b.nuEff), nuText(r.nuEff), b.nuEff !== r.nuEff);
    row(t('vz_bu_k'), num(b.k, 4), num(r.k, 4), b.k !== r.k);
    row(t('vz_bu_U'), num(b.U, 4), num(r.U, 4), b.U !== r.U);
    row(t('vz_bu_result'), roundResult(b.y, b.U).resultText, roundResult(r.y, r.U).resultText, false);

    for (const s of shareRows(r)) {
      const host = svgHost(doc, 'vz-chart-bar' + (s.row === src.row ? ' vz-bar-sel' : ''));
      const label = s.name + (s.kind === 'corr' ? '' : ' (' + (s.kind === 'A' ? 'A' : 'B') + ')');
      host.set(shareBarSvg(s.share, ctx.esc, label + ': ' + pct(s.share)));
      shares.appendChild(h(doc, 'div', { class: 'vz-bar-row' + (s.row === src.row ? ' vz-bar-row-sel' : '') },
        h(doc, 'span', { class: 'text-sm vz-bar-name', text: label }), host.el, h(doc, 'span', { class: 'mono text-sm', text: pct(s.share) })));
    }
    // ν_eff < 6 — Monte-Karlo tavsiyasi (chegara — loyiha qarori; JCGM 101 §5.7 sifat mezonlarini beradi)
    if (Number.isFinite(r.nuEff) && r.nuEff < NU_EFF_MC_HINT) hint.appendChild(note(doc, tf('vz_bu_mc_hint', { nu: nuText(r.nuEff), lim: NU_EFF_MC_HINT }), 'vz-warn'));
    ctx.announce(tf('vz_bu_live', { f: num(st.f, 3), uc: num(r.uc, 4), k: num(r.k, 4), U: num(r.U, 4) }));
  }

  const selId = uid('src');
  const select = h(doc, 'select', { id: selId, class: 'vz-select', 'data-vz-key': 'bu-src', on: { change: () => { st.row = Number(select.value); st.f = 1; ctx.rerender(); } } },
    sources.map(s => h(doc, 'option', { value: s.row, selected: s.row === st.row, text: s.name + ' — ' + kindLabel(s) })));
  if (sources.length) select.value = String(st.row);
  const controls = card(doc, t('vz_controls'),
    sourceSwitch(ctx, st, !!calc),
    sources.length ? h(doc, 'div', { class: 'vz-ctl' }, h(doc, 'div', { class: 'vz-ctl-head' }, h(doc, 'label', { for: selId, text: t('vz_bu_source') })), select) : null,
    sources.length ? slider(doc, { key: 'bu-f', label: t('vz_bu_factor'), min: SCALE_RANGE.min, max: SCALE_RANGE.max, step: SCALE_RANGE.step, value: st.f,
      format: v => '× ' + num(v, 3), hint: t('vz_bu_factor_hint'), onInput: v => { st.f = v; update(); } }).el : null,
    h(doc, 'div', { class: 'vz-actions' }, h(doc, 'button', { type: 'button', class: 'btn btn-outline', 'data-vz-key': 'bu-reset', text: t('vz_bu_reset'), on: { click: () => { st.f = 1; ctx.rerender(); } } })),
    note(doc, t(teaching ? 'vz_bu_note_teach' : 'vz_bu_note_calc'), 'vz-info'));
  const numbers = card(doc, teaching ? t('vz_bu_title_teach') : tf('vz_bu_title_calc', { f: (base.result.symbol || 'y') + ' = ' + (base.result.formulaText || '') }),
    h(doc, 'div', { class: 'vz-table-wrap' }, table), hint, note(doc, t('vz_bu_ref'), 'text-muted'));
  const sharesCard = card(doc, t('vz_bu_shares'), shares);
  update();
  return { el: h(doc, 'div', { class: 'vz-grid' }, h(doc, 'div', { class: 'vz-col' }, controls, sharesCard), numbers), destroy() {} };
}
