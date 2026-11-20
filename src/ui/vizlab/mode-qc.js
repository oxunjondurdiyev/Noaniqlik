/* ═══════════════════════════════════════════════════════════════
   VIZLAB/MODE-QC.JS — d) QC drifti: qat'iy o'quv ketma-ketligi, har 0,7 s da bitta yangi nuqta.
   Westgard tahlili — dvigatelning westgard() funksiyasi (1₂s darvozasi bilan; src/engine/lab/westgard.js):
   belgilangan nuqtalar (flagged), buzilishlar (violations) va darvoza ushlab qolgan qoidalar (suppressed).
   UI qoidalarni o'zi tekshirmaydi — faqat dvigatel natijasini ko'rsatadi.
═══════════════════════════════════════════════════════════════ */
import { QC_SEQUENCE, QC_TARGET, qcStep, qcLog } from './model.js';
import { qcSvg } from './svg.js';
import { h, card, note, badge, svgHost, uid } from './ui.js';

/** Yangi nuqtalar orasidagi vaqt (ms). */
export const QC_INTERVAL_MS = 700;

export function qcMode(ctx, st) {
  const { doc, t, tf } = ctx;
  const total = QC_SEQUENCE.length;
  if (st.n === undefined) { st.n = ctx.ticker.reduced() ? total : 0; st.gate = true; st.playing = !ctx.ticker.reduced(); }
  let off = null, acc = 0, announced = st.n;

  const chart = svgHost(doc);
  const status = h(doc, 'div', { class: 'vz-verdict' });
  const log = h(doc, 'ol', { class: 'vz-log' });
  const count = h(doc, 'p', { class: 'vz-hint mono' });
  const play = h(doc, 'button', { type: 'button', class: 'btn btn-primary', 'data-vz-key': 'qc-play', on: { click: toggle } });
  const stepBtn = h(doc, 'button', { type: 'button', class: 'btn btn-outline', 'data-vz-key': 'qc-step', text: t('vz_qc_step'), on: { click: () => { pause(); advance(); } } });
  const resetBtn = h(doc, 'button', { type: 'button', class: 'btn btn-outline', 'data-vz-key': 'qc-reset', text: t('vz_reset'), on: { click: () => { pause(); st.n = 0; announced = 0; render(); } } });
  const gateId = uid('gate');
  const gate = h(doc, 'input', { type: 'checkbox', id: gateId, class: 'vz-check', checked: st.gate, 'data-vz-key': 'qc-gate', on: { change: () => { st.gate = gate.checked; render(); } } });
  gate.checked = st.gate;

  const rule = r => t('lb_rule_' + r);

  function render() {
    const step = qcStep(st.n, { gate: st.gate }), wg = step.westgard;
    const sup = new Set((wg.suppressed || []).flatMap(s => s.indices));
    chart.set(qcSvg({
      W: ctx.W(), total, values: step.values, limits: step.limits, flagged: wg.flagged, suppressed: sup, title: t('vz_qc_chart'), esc: ctx.esc,
      pointLabel: i => `${i + 1}: ${step.values[i]}` + ((wg.flagged[i] || []).length ? ' — ' + wg.flagged[i].map(rule).join(', ') : ''),
    }));
    count.textContent = tf('vz_qc_count', { n: st.n, N: total, m: QC_TARGET.mean, s: QC_TARGET.s });
    play.textContent = t(st.playing ? 'vz_pause' : st.n >= total ? 'vz_qc_replay' : 'vz_play');
    stepBtn.disabled = st.n >= total;

    status.textContent = '';
    if (!st.n) status.appendChild(note(doc, t('vz_qc_empty'), 'text-muted'));
    else if (wg.inControl) status.appendChild(h(doc, 'p', { class: 'vz-verdict-line' }, badge(doc, t('vz_qc_ok'), 'green')));
    else {
      status.appendChild(h(doc, 'p', { class: 'vz-verdict-line' }, badge(doc, t('vz_qc_out'), 'red')));
      status.appendChild(h(doc, 'ul', { class: 'vz-list text-sm' }, wg.violations.map(v => h(doc, 'li', {},
        h(doc, 'strong', { text: rule(v.rule) }), ' — ' + t('lb_rule_desc_' + v.rule) + ': ' + v.indices.map(i => i + 1).join(', ')
        + (v.approximation ? ' (' + t('lb_rule_approx') + ')' : '')))));
    }
    if (wg.gate === false) status.appendChild(note(doc, t('vz_qc_gate_off'), 'vz-warn'));

    const entries = qcLog(st.n, { gate: st.gate });
    log.textContent = '';
    if (!entries.length) log.appendChild(h(doc, 'li', { class: 'text-muted text-sm', text: t('vz_qc_log_empty') }));
    for (const e of entries.slice().reverse()) {
      log.appendChild(h(doc, 'li', { class: 'vz-log-item' },
        h(doc, 'span', { class: 'mono vz-log-pt', text: tf('vz_qc_point', { n: e.point }) }),
        e.fired.map(r => badge(doc, rule(r), 'red')),
        e.suppressed.map(r => badge(doc, rule(r) + ' · ' + t('vz_qc_held'), 'orange'))));
    }
    const lastEntry = entries[entries.length - 1];
    if (lastEntry && lastEntry.point === st.n && st.n > announced) {
      ctx.announce(tf('vz_qc_live', { n: st.n, rules: lastEntry.fired.map(rule).concat(lastEntry.suppressed.map(r => rule(r) + ' (' + t('vz_qc_held') + ')')).join(', ') }));
    }
    announced = st.n;
  }

  function advance() {
    if (st.n < total) st.n++;
    if (st.n >= total) pause(false);
    render();
  }
  function tick(dt) {
    acc += dt;
    if (acc >= QC_INTERVAL_MS) { acc = 0; advance(); }
  }
  function pause(redraw = true) {
    st.playing = false;
    if (off) { off(); off = null; }
    if (redraw) render();
  }
  function toggle() {
    if (st.playing) { pause(); return; }
    if (st.n >= total) { st.n = 0; announced = 0; }
    if (ctx.ticker.reduced()) { st.n = total; render(); return; }   // kam harakat: barcha nuqtalar birdan
    st.playing = true; acc = 0;
    off = ctx.ticker.add(tick);
    render();
  }

  if (st.playing && st.n < total) off = ctx.ticker.add(tick); else st.playing = false;
  render();

  const picture = card(doc, t('vz_qc_title'), chart.el, count,
    h(doc, 'div', { class: 'vz-actions' }, play, stepBtn, resetBtn),
    h(doc, 'div', { class: 'vz-check-row' }, gate, h(doc, 'label', { for: gateId, text: t('vz_qc_gate') })),
    h(doc, 'ul', { class: 'vz-legend' },
      h(doc, 'li', { class: 'vz-lg-qc-dot', text: t('vz_qc_lg_dot') }),
      h(doc, 'li', { class: 'vz-lg-qc-flag', text: t('vz_qc_lg_flag') }),
      h(doc, 'li', { class: 'vz-lg-qc-sup', text: t('vz_qc_lg_sup') })),
    note(doc, t('vz_qc_note'), 'vz-info'));
  const side = card(doc, t('vz_qc_status'), status, h(doc, 'h4', { class: 'vz-sub', text: t('vz_qc_log') }), log, note(doc, t('vz_qc_ref'), 'text-muted'));
  return { el: h(doc, 'div', { class: 'vz-grid vz-grid-mc' }, picture, side), destroy() { if (off) off(); } };
}
