/* ═══════════════════════════════════════════════════════════════
   LAB/VIEW.JS — P11 / P16: "Laboratoriya" oynasining HTML satrlari (Etalonlar — kartalar; CMC; QC kartalari — zonali grafik
   va Westgard holat paneli; reestrdan tanlash oynasi). Ko'rinish — src/css/lab2.css (style atributi yo'q — CSP).
   Sof modul: DOM'ga tegmaydi. Har qanday qiymat ctx.esc (escHtml) orqali. ctx = { t(key), esc(value) }.
   Hodisalar — app.js da (data-lb-* atributlari; inline handler yo'q — CSP).
═══════════════════════════════════════════════════════════════ */
import { TRACEABILITY_ROUTES, DRIFT_METHODS, DRIFT_DISTRIBUTIONS, CMC_TYPES, WESTGARD_RULES } from '../../engine/lab/index.js';
import { qcChartSVG, qcPointStates, zText } from './chart.js';

export const TABS = ['standards', 'cmc', 'qc', 'pt', 'validation'];   // P12: malaka sinovlari, validatsiya
const num = (v, sig) => (typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toPrecision(sig || 6))) : '—');
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] === undefined ? m : o[k]));
const opt = (ctx, value, label, cur) => `<option value="${ctx.esc(value)}"${String(cur ?? '') === String(value) ? ' selected' : ''}>${ctx.esc(label)}</option>`;
const dis = ro => (ro ? ' disabled' : '');
const inp = (ctx, attr, value, o = {}) =>
  `<input type="${o.type || 'text'}"${o.decimal ? ' inputmode="decimal"' : ''} ${attr} value="${ctx.esc(value ?? '')}"${o.ph ? ` placeholder="${ctx.esc(o.ph)}"` : ''}${dis(o.ro)} autocomplete="off" />`;
const field = (ctx, labelKey, inner, hintKey) =>
  `<label class="rg-field"><span>${ctx.esc(ctx.t(labelKey))}</span>${inner}${hintKey ? `<small class="text-muted">${ctx.esc(ctx.t(hintKey))}</small>` : ''}</label>`;

export function tabsHTML(tab, ctx) {
  return `<div class="sp-modes" role="tablist" data-lb-tabs="1">${TABS.map(x =>
    `<button type="button" role="tab" class="sp-mode${tab === x ? ' active' : ''}" data-lb-tab="${x}" aria-selected="${tab === x}">${ctx.esc(ctx.t('lb_tab_' + x))}</button>`).join('')}</div>`;
}

/** Faqat o'qish rejimi (xodim) va lokal rejim ogohlantirishi */
export function roleNoticeHTML(m, ctx) {
  const ro = m.readOnly ? `<div class="warn-box" data-lb-readonly="1">${ctx.esc(ctx.t('lb_readonly'))}</div>` : '';
  return `${ro}<p class="text-xs text-muted" data-lb-local="1">${ctx.esc(ctx.t('lb_local_note'))}</p>`;
}

const badge = (ctx, status, daysLeft) => {
  const cls = { valid: 'badge-green', expiring: 'badge-orange', expired: 'badge-red', unknown: 'badge-orange' }[status];
  return `<span class="badge ${cls}" data-lb-status="${status}">${ctx.esc(ctx.t('lb_status_' + status))}${status === 'expiring' && daysLeft !== null ? ` (${daysLeft})` : ''}</span>`;
};

/* ── Etalonlar: kartalar ── */
/* Holat (valid | expiring | expired | unknown) — app.js dan tayyor keladi (model.js::standardStatus → dvigatel
   validityStatus); bu yerda qayta hisoblanmaydi. Holat har doim matnli nishon bilan (faqat rang bilan emas). */
const statusBadge = (ctx, st) => {
  const cls = { valid: 'badge-green', expiring: 'badge-orange', expired: 'badge-red', unknown: 'badge-orange' }[st.status];
  const text = st.status === 'expired' ? `${ctx.t('lb_status_expired')} — ${ctx.t('lb_card_unofficial')}`
    : ctx.t('lb_status_' + st.status) + (st.status === 'expiring' && st.daysLeft !== null ? ` (${st.daysLeft})` : '');
  return `<span class="badge ${cls}" data-lb-status="${st.status}">${ctx.esc(text)}</span>`;
};

function standardCardHTML(s, m, ctx) {
  const c = s.status.calibration, st = s.status.status, sel = m.selected === s.id;
  const range = s.range.min === null && s.range.max === null ? '' : `${num(s.range.min)} … ${num(s.range.max)}${s.unit ? ' ' + s.unit : ''}`;
  const row = (key, value, mono) => `<div class="lb-meta-row"><dt>${ctx.esc(ctx.t(key))}</dt><dd${mono ? ' class="lb-num"' : ''}>${ctx.esc(value || '—')}</dd></div>`;
  const sub = [s.type, s.serial].filter(Boolean).join(' · ');
  return `<li class="lb-std-card lb-std-${st}${sel ? ' is-selected' : ''}" data-lb-std="${ctx.esc(s.id)}"${sel ? ' aria-current="true"' : ''}>
      <div class="lb-std-head">
        <button type="button" class="lb-std-open" data-lb-act="open" data-lb-id="${ctx.esc(s.id)}">${ctx.esc(s.name || '—')}</button>
        <span class="lb-std-ver lb-num">v${ctx.esc(s.version)}</span>
      </div>
      ${sub ? `<p class="lb-std-sub lb-num">${ctx.esc(sub)}</p>` : ''}
      <dl class="lb-meta">
        ${row('lb_f_calibrator', c ? c.calibrator : '')}${row('lb_f_certificate', c ? c.certificate : '', true)}
        ${row('lb_f_valid', c ? c.validUntil : '', true)}${range ? row('lb_f_range', range, true) : ''}
      </dl>
      <div class="lb-std-badges">${statusBadge(ctx, s.status)}${c && !s.status.evidence ? ` <span class="badge badge-orange" data-lb-noaccr="1">${ctx.esc(ctx.t('lb_no_accreditation'))}</span>` : ''}</div>
      ${st === 'expired' ? `<p class="lb-std-note" data-lb-unofficial="1">${ctx.esc(ctx.t('lb_card_unofficial_hint'))}</p>` : ''}
    </li>`;
}

export function standardsListHTML(m, ctx) {
  return `<div class="card rg-card" data-lb-list="standards">
    <div class="rg-actions">
      <button type="button" class="btn btn-primary btn-sm" data-lb-act="new"${dis(m.readOnly)}>${ctx.esc(ctx.t('lb_std_new'))}</button>
      <button type="button" class="btn btn-outline btn-sm" data-lb-act="import"${dis(m.readOnly)}>${ctx.esc(ctx.t('lb_import'))}</button>
      <button type="button" class="btn btn-outline btn-sm" data-lb-act="export-json">${ctx.esc(ctx.t('lb_export_json'))}</button>
      <button type="button" class="btn btn-outline btn-sm" data-lb-act="export-csv">${ctx.esc(ctx.t('lb_export_csv'))}</button>
    </div>
    <p class="text-xs text-muted">${ctx.esc(ctx.t('lb_import_hint'))}</p>
    ${m.standards.length ? `<ul class="lb-cards lb-std-cards" data-lb-cards="standards">${m.standards.map(s => standardCardHTML(s, m, ctx)).join('')}</ul>`
    : `<div class="empty-state"><p>${ctx.esc(ctx.t('lb_std_empty'))}</p></div>`}
  </div>`;
}

function calibrationHTML(c, i, ro, ctx) {
  const a = k => `data-lb-cal="${i}" data-lb-cal-field="${k}"`;
  return `<fieldset class="lb-cal" data-lb-cal-box="${i}">
    <legend>${ctx.esc(ctx.t('lb_calibration'))} ${i + 1} <button type="button" class="btn btn-ghost btn-sm" data-lb-act="del-cal" data-lb-index="${i}"${dis(ro)}>×</button></legend>
    <div class="settings-grid">
      ${field(ctx, 'lb_f_certificate', inp(ctx, a('certificate'), c.certificate, { ro }))}
      ${field(ctx, 'lb_f_calibrator', inp(ctx, a('calibrator'), c.calibrator, { ro }), 'lb_f_calibrator_hint')}
      ${field(ctx, 'lb_f_accreditation', inp(ctx, a('accreditation'), c.accreditation, { ro }), 'lb_f_accreditation_hint')}
      ${field(ctx, 'lb_f_route', `<select ${a('route')}${dis(ro)}>${opt(ctx, '', '—', c.route)}${TRACEABILITY_ROUTES.map(r => opt(ctx, r, ctx.t('lr_route_' + r), c.route)).join('')}</select>`)}
      ${field(ctx, 'lb_f_traceability', inp(ctx, a('traceability'), c.traceability, { ro }), 'lb_f_traceability_hint')}
      ${field(ctx, 'lb_f_date', inp(ctx, a('date'), c.date, { type: 'date', ro }))}
      ${field(ctx, 'lb_f_valid', inp(ctx, a('validUntil'), c.validUntil, { type: 'date', ro }))}
    </div>
    <label class="rg-field td-paste"><span>${ctx.esc(ctx.t('lb_f_points'))}</span>
      <textarea ${a('pointsText')} rows="4" spellcheck="false" class="td-area"${dis(ro)}>${ctx.esc(c.pointsText || '')}</textarea>
      <small class="text-muted">${ctx.esc(ctx.t('lb_f_points_hint'))}</small></label>
  </fieldset>`;
}

/** Kartochka shakli + drift / interval paneli. m: { draft, readOnly, isNew, analysis } */
export function standardFormHTML(m, ctx) {
  const d = m.draft, ro = m.readOnly, a = k => `data-lb-field="${k}"`;
  return `<div class="card rg-card" data-lb-form="standard">
    <h3 class="rg-card-title">${ctx.esc(ctx.t(m.isNew ? 'lb_std_new' : 'lb_std_edit'))}${m.isNew ? '' : ` <small class="text-muted">${ctx.esc(d.id)} · v${ctx.esc(d.version)}</small>`}</h3>
    <div class="settings-grid">
      ${field(ctx, 'lb_f_name', inp(ctx, a('name'), d.name, { ro }))}${field(ctx, 'lb_f_type', inp(ctx, a('type'), d.type, { ro }))}
      ${field(ctx, 'lb_f_serial', inp(ctx, a('serial'), d.serial, { ro }))}${field(ctx, 'lb_f_unit', inp(ctx, a('unit'), d.unit, { ro }))}
      ${field(ctx, 'lb_f_range_min', inp(ctx, a('rangeMin'), d.rangeMin, { decimal: true, ro }))}${field(ctx, 'lb_f_range_max', inp(ctx, a('rangeMax'), d.rangeMax, { decimal: true, ro }))}
      ${field(ctx, 'lb_f_limit', inp(ctx, a('limit'), d.limit, { decimal: true, ro }), 'lb_f_limit_hint')}
    </div>
    ${d.calibrations.map((c, i) => calibrationHTML(c, i, ro, ctx)).join('')}
    <div class="rg-actions">
      <button type="button" class="btn btn-outline btn-sm" data-lb-act="add-cal"${dis(ro)}>${ctx.esc(ctx.t('lb_add_calibration'))}</button>
      <button type="button" class="btn btn-primary btn-sm" data-lb-act="save-std"${dis(ro)}>${ctx.esc(ctx.t('lb_save'))}</button>
      ${m.isNew ? '' : `<button type="button" class="btn btn-danger btn-sm" data-lb-act="del-std"${dis(ro)}>${ctx.esc(ctx.t('lb_delete'))}</button>`}
      <button type="button" class="btn btn-ghost btn-sm" data-lb-act="close-std">${ctx.esc(ctx.t('lb_close'))}</button>
    </div>
    ${m.isNew ? '' : `<div data-lb-analysis="1">${analysisHTML(m.analysis, ctx)}</div>${historyHTML(m.history, ctx)}`}
  </div>`;
}

/** Drift taklifi va kalibrlash intervali tavsiyasi. a: { x, method, distribution, limit, includeU, drift, interval, history } */
export function analysisHTML(a, ctx) {
  if (!a) return '';
  const t = ctx.t;
  let drift;
  if (a.drift && a.drift.proposal) {
    const p = a.drift.proposal;
    drift = `<p data-lb-drift="ok">${ctx.esc(fill(t('lb_drift_result'), { dc: num(p.deltaC), a: num(p.halfWidth), div: p.divisorLabel, u: num(p.u) }))}</p>
      <p class="text-xs text-muted">${ctx.esc(p.basis.calibrations.map(c => `${c.certificate || '—'} (${c.date}; C = ${num(c.correction)})`).join('; '))}</p>
      <p class="text-xs text-muted">${ctx.esc(t('lb_drift_note'))}</p>`;
  } else drift = `<p class="text-muted" data-lb-drift="none">${ctx.esc(t('lb_err_' + ((a.drift && a.drift.error) || 'drift_need_two')))}</p>`;
  let interval;
  const iv = a.interval;
  if (!iv) interval = `<p class="text-muted" data-lb-interval="none">${ctx.esc(t('lb_interval_need_limit'))}</p>`;
  else if (iv.error) interval = `<p class="text-muted" data-lb-interval="none">${ctx.esc(t('lb_err_' + iv.error))}</p>`;
  else {
    const txt = iv.status === 'ok' ? fill(t('lb_interval_ok'), { days: Math.floor(iv.days), months: num(iv.days / 30.4375, 3), date: iv.date, slope: num(iv.slopePerYear) })
      : iv.status === 'exceeded' ? t('lb_interval_exceeded') : t('lb_interval_never');
    interval = `<p data-lb-interval="${iv.status}"><strong>${ctx.esc(t('lb_recommendation'))}:</strong> ${ctx.esc(txt)}</p><p class="text-xs text-muted">${ctx.esc(t('lb_interval_note'))}</p>`;
  }
  return `<h4 class="rg-card-title">${ctx.esc(t('lb_drift_title'))}</h4>
    <div class="settings-grid">
      ${field(ctx, 'lb_f_x', inp(ctx, 'data-lb-an="x"', a.x, { decimal: true }), 'lb_f_x_hint')}
      ${field(ctx, 'lb_f_drift_method', `<select data-lb-an="method">${DRIFT_METHODS.map(x => opt(ctx, x, t('lr_drift_method_' + x), a.method)).join('')}</select>`)}
      ${field(ctx, 'lb_f_drift_dist', `<select data-lb-an="distribution">${DRIFT_DISTRIBUTIONS.map(x => opt(ctx, x, t('lr_dist_' + x), a.distribution)).join('')}</select>`)}
    </div>${drift}
    <h4 class="rg-card-title">${ctx.esc(t('lb_interval_title'))}</h4>
    <div class="settings-grid">
      ${field(ctx, 'lb_f_limit', inp(ctx, 'data-lb-an="limit"', a.limit, { decimal: true }), 'lb_f_limit_hint')}
      <label class="td-choice"><input type="checkbox" data-lb-an="includeU"${a.includeU ? ' checked' : ''} /><span>${ctx.esc(t('lb_f_include_u'))}</span></label>
    </div>${interval}`;
}

export function historyHTML(history, ctx) {
  if (!history || !history.length) return '';
  return `<details class="lb-history" data-lb-history="1"><summary>${ctx.esc(ctx.t('lb_history'))} (${history.length})</summary>
    <div class="table-scroll"><table class="data-table"><thead><tr><th>${ctx.esc(ctx.t('lb_h_when'))}</th><th>${ctx.esc(ctx.t('lb_h_role'))}</th><th>${ctx.esc(ctx.t('lb_h_action'))}</th><th>${ctx.esc(ctx.t('lb_f_version'))}</th><th>${ctx.esc(ctx.t('lb_h_reason'))}</th></tr></thead><tbody>
    ${history.map(e => `<tr><td>${ctx.esc(String(e.at).replace('T', ' ').slice(0, 19))}</td><td>${ctx.esc(e.actor)}</td><td>${ctx.esc(e.action)}</td><td>${ctx.esc((e.after || e.before || {}).version ?? '')}</td><td>${ctx.esc(e.reason)}</td></tr>`).join('')}
    </tbody></table></div></details>`;
}

/* ── CMC ── */
export function cmcHTML(m, ctx) {
  const ro = m.readOnly, t = ctx.t;
  const cell = (r, i, k, o = {}) => `<td>${inp(ctx, `data-lb-cmc="${i}" data-lb-cmc-field="${k}"`, r[k], { ...o, ro })}</td>`;
  const param = (r, i) => (r.type === 'linear' ? `${inp(ctx, `data-lb-cmc="${i}" data-lb-cmc-field="a"`, r.a, { decimal: true, ro, ph: 'a' })}${inp(ctx, `data-lb-cmc="${i}" data-lb-cmc-field="b"`, r.b, { decimal: true, ro, ph: 'b' })}`
    : r.type === 'range' ? `${inp(ctx, `data-lb-cmc="${i}" data-lb-cmc-field="cmcMin"`, r.cmcMin, { decimal: true, ro, ph: 'CMC(min)' })}${inp(ctx, `data-lb-cmc="${i}" data-lb-cmc-field="cmcMax"`, r.cmcMax, { decimal: true, ro, ph: 'CMC(max)' })}`
      : inp(ctx, `data-lb-cmc="${i}" data-lb-cmc-field="value"`, r.value, { decimal: true, ro, ph: r.type === 'rel' ? '%' : 'CMC' }));
  const rows = m.rows.map((r, i) => `<tr data-lb-cmc-row="${i}"${m.badRows.includes(i) ? ' class="row-bad"' : ''}>
    ${cell(r, i, 'quantity')}${cell(r, i, 'min', { decimal: true })}${cell(r, i, 'max', { decimal: true })}${cell(r, i, 'unit')}
    <td><select data-lb-cmc="${i}" data-lb-cmc-field="type"${dis(ro)}>${CMC_TYPES.map(x => opt(ctx, x, t('lb_cmc_type_' + x), r.type)).join('')}</select></td>
    <td class="lb-cmc-param">${param(r, i)}</td>${cell(r, i, 'method')}${cell(r, i, 'note')}
    <td><button type="button" class="btn btn-ghost btn-sm" data-lb-act="del-cmc" data-lb-index="${i}"${dis(ro)}>×</button></td></tr>`).join('');
  return `<div class="card rg-card" data-lb-list="cmc">
    <p class="text-sm text-muted">${ctx.esc(t('lb_cmc_intro'))}</p>
    <div class="table-scroll"><table class="data-table lb-cmc-table"><thead><tr>${['lb_cmc_quantity', 'lb_cmc_min', 'lb_cmc_max', 'lb_f_unit', 'lb_cmc_type', 'lb_cmc_value', 'lb_cmc_method', 'lb_cmc_note'].map(k => `<th>${ctx.esc(t(k))}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    ${m.rows.length ? '' : `<div class="empty-state"><p>${ctx.esc(t('lb_cmc_empty'))}</p></div>`}
    <div class="rg-actions">
      <button type="button" class="btn btn-outline btn-sm" data-lb-act="add-cmc"${dis(ro)}>${ctx.esc(t('lb_cmc_add'))}</button>
      <button type="button" class="btn btn-primary btn-sm" data-lb-act="save-cmc"${dis(ro)}>${ctx.esc(t('lb_save'))}</button>
      <span class="text-xs text-muted">${ctx.esc(fill(t('lb_cmc_version'), { v: m.version || 0 }))}</span>
    </div>
    <div class="settings-grid" data-lb-cmc-probe="1">
      ${field(ctx, 'lb_cmc_probe_q', `<select data-lb-probe="quantity">${opt(ctx, '', '—', m.probe.quantity)}${m.quantities.map(q => opt(ctx, q.key, q.key, m.probe.quantity)).join('')}</select>`)}
      ${field(ctx, 'lb_cmc_probe_x', inp(ctx, 'data-lb-probe="x"', m.probe.x, { decimal: true }))}
      <div class="rg-field"><span>${ctx.esc(t('lb_cmc_probe_result'))}</span><output data-lb-probe-out="1">${ctx.esc(m.probe.text || '—')}</output></div>
    </div>
    <p class="text-xs text-muted">${ctx.esc(t('lb_cmc_note_auto'))}</p>
  </div>`;
}

/* ── QC kartalari ── */
/* Westgard holat paneli. HAMMASI dvigatel natijasidan (src/engine/lab/westgard.js::westgard → violations, suppressed,
   gate, approximation); qoidalar bu yerda qayta tekshirilmaydi. Ko'rsatiladigan qoidalar ro'yxati — WESTGARD_RULES
   (dvigatel standart bo'yicha shularning hammasini baholaydi). 1₂s — rad etish qoidasi emas, ±2s ogohlantirish chegarasi
   va darvoza sharti: uning qatori grafikdagi "warn" nuqtalar bilan bir xil manbadan (chart.js::qcPointStates). */
function westgardPanelHTML(an, ctx) {
  const t = ctx.t, wg = an.westgard;
  const idx = a => a.map(i => i + 1).join(', ');
  const b = (cls, key) => `<span class="badge ${cls}">${ctx.esc(t(key))}</span>`;
  const states = qcPointStates({ series: an.series, limits: an.limits, z: an.z, flagged: wg.flagged, suppressed: wg.suppressed });
  const beyond = states.map((p, i) => (p.warn.includes('1_2s') ? i : -1)).filter(i => i >= 0);
  const points = a => `<div class="lb-wg-points"><span>${ctx.esc(t('lb_wg_points'))}:</span> <span class="lb-num">${ctx.esc(idx(a))}</span></div>`;
  const gateRow = `<li class="lb-wg-rule" data-lb-wg="1_2s" data-lb-wg-state="${beyond.length ? 'warn' : 'ok'}">
      <div class="lb-wg-head"><strong class="lb-num">${ctx.esc(t('lb_rule_1_2s'))}</strong>${b(beyond.length ? 'badge-orange' : 'badge-green', beyond.length ? 'lb_wg_warn' : 'lb_wg_ok')}</div>
      <div class="lb-wg-desc">${ctx.esc(t('lb_rule_desc_1_2s'))}</div>${beyond.length ? points(beyond) : ''}</li>`;
  const rows = WESTGARD_RULES.map(r => {
    const v = wg.violations.find(x => x.rule === r), s = (wg.suppressed || []).find(x => x.rule === r);
    const state = v ? 'violated' : s ? 'suppressed' : 'ok';
    return `<li class="lb-wg-rule" data-lb-wg="${r}" data-lb-wg-state="${state}"${v ? ` data-lb-rule="${ctx.esc(r)}"` : ''}${s ? ' data-lb-wg-suppressed="1"' : ''}>
      <div class="lb-wg-head"><strong class="lb-num">${ctx.esc(t('lb_rule_' + r))}</strong>${v ? b('badge-red', 'lb_wg_violated') : ''}${s ? b('badge-orange', 'lb_wg_suppressed') : ''}${v || s ? '' : b('badge-green', 'lb_wg_ok')}</div>
      <div class="lb-wg-desc">${ctx.esc(t('lb_rule_desc_' + r))}</div>
      ${v ? points(v.indices) : ''}${s ? `<div class="lb-wg-points" data-lb-wg-sup="${r}"><span>${ctx.esc(t('lb_wg_suppressed'))}:</span> <span class="lb-num">${ctx.esc(idx(s.indices))}</span></div>` : ''}
      ${v && v.approximation ? `<div class="lb-wg-desc"><em data-lb-approx="1">(${ctx.esc(t('lb_rule_approx'))})</em></div>` : ''}</li>`;
  }).join('');
  const out = wg.violations.length > 0;
  return `<aside class="lb-wg" data-lb-wg-panel="1" aria-label="${ctx.esc(t('lb_wg_title'))}">
      <h4 class="lb-wg-title">${ctx.esc(t('lb_wg_title'))}</h4>
      <p class="lb-wg-overall"><span class="badge ${out ? 'badge-red' : 'badge-green'}" data-lb-westgard="${out ? 'out' : 'in'}">${ctx.esc(t(out ? 'lb_qc_violations' : 'lb_qc_in_control'))}</span></p>
      <p class="lb-wg-gate" data-lb-gate-state="${wg.gate === false ? 'off' : 'on'}"><span>${ctx.esc(t('lb_wg_gate'))}:</span> ${b(wg.gate === false ? 'badge-orange' : 'badge-blue', wg.gate === false ? 'lb_wg_gate_off' : 'lb_wg_gate_on')}</p>
      ${wg.gate === false ? `<p class="lb-wg-note" data-lb-gate="off"><em>${ctx.esc(t('lb_qc_gate_off'))}</em></p>` : `<p class="lb-wg-note">${ctx.esc(t('lb_wg_gate_on_note'))}</p>`}
      <ul class="lb-wg-rules">${gateRow}${rows}</ul>
      ${(wg.suppressed || []).length ? `<p class="lb-wg-note" data-lb-suppressed="1">${ctx.esc(fill(t('lb_qc_suppressed'), { rules: wg.suppressed.map(v => t('lb_rule_' + v.rule) + ' (' + idx(v.indices) + ')').join('; ') }))}</p>` : ''}
      ${out ? `<p class="lb-wg-note">${ctx.esc(t('lb_qc_westgard_note'))}</p>` : ''}
    </aside>`;
}

/* Grafik izohi: zona va nuqta turlari — matn bilan (rang yagona belgi emas). */
function legendHTML(ctx) {
  const sw = inner => `<svg class="lb-sw" viewBox="0 0 20 20" aria-hidden="true" focusable="false">${inner}</svg>`;
  const zone = n => sw(`<rect class="qc-zone qc-z${n}" x="1" y="3" width="18" height="14"/>`);
  const items = [
    [zone(1), 'lb_lg_zone1'], [zone(2), 'lb_lg_zone2'], [zone(3), 'lb_lg_zone3'],
    [sw('<g class="qc-warn"><circle cx="10" cy="10" r="6.5"/><path d="M10 6.5v4M10 12.5v1"/></g>'), 'lb_lg_warn'],
    [sw('<g class="qc-flag"><circle cx="10" cy="10" r="8"/><path d="M6.5 6.5l7 7m0 -7l-7 7"/></g>'), 'lb_lg_reject'],
  ];
  return `<ul class="lb-legend" data-lb-legend="1">${items.map(x => `<li>${x[0]}<span>${ctx.esc(ctx.t(x[1]))}</span></li>`).join('')}</ul>`;
}

export function qcHTML(m, ctx) {
  const t = ctx.t, c = m.chart;
  const list = `<div class="rg-actions">
      <label class="rg-field"><span>${ctx.esc(t('lb_qc_chart'))}</span><select data-lb-qc="select">${opt(ctx, '', '—', m.selected)}${m.charts.map(x => opt(ctx, x.id, x.name || x.id, m.selected)).join('')}</select></label>
      <button type="button" class="btn btn-primary btn-sm" data-lb-act="new-qc">${ctx.esc(t('lb_qc_new'))}</button>
    </div>`;
  if (!c) return `<div class="card rg-card" data-lb-list="qc">${list}<div class="empty-state"><p>${ctx.esc(t('lb_qc_empty'))}</p></div></div>`;
  const an = m.analysis;
  let body = '';
  if (an && !an.error) {
    const wg = an.westgard, zLast = an.z[an.z.length - 1];
    const kpi = (label, value, attr) => `<div class="lb-kpi"${attr || ''}><span class="lb-kpi-label">${ctx.esc(label)}</span><span class="lb-kpi-value lb-num">${ctx.esc(value)}</span></div>`;
    // z — dvigatelga (westgard) berilgan z-ballar: model.js::analyseQc → z (yangi hisob emas, faqat ko'rsatish).
    const svg = qcChartSVG({ series: an.series, limits: an.limits, flagged: wg.flagged, labels: an.labels, z: an.z, suppressed: wg.suppressed },
      { esc: ctx.esc, title: `${c.name || ''} — ${t(wg.violations.length ? 'lb_qc_violations' : 'lb_qc_in_control')}`, ruleLabel: r => t('lb_rule_' + r) });
    body = `<div class="lb-kpis" data-lb-kpis="1">
        ${kpi(t('lb_kpi_cl'), num(an.limits.center) + (c.unit ? ' ' + c.unit : ''))}${kpi(t('lb_kpi_s'), num(an.limits.sigma))}${kpi(t('lb_kpi_n'), String(an.n))}
        ${kpi(t('lb_kpi_last_z'), zText(zLast) || '—', ' data-lb-last-z="1"')}
      </div>
      <div class="lb-qc-grid">
        <div class="lb-qc-main"><figure class="lb-chart-card" data-lb-chart="1"><div class="lb-chart-scroll" tabindex="0" role="group" aria-label="${ctx.esc(c.name || t('lb_qc_chart'))}">${svg}</div>${legendHTML(ctx)}</figure>
      <p class="text-sm" data-lb-limits="1">${ctx.esc(fill(t('lb_qc_limits'), { cl: num(an.limits.center), s: num(an.limits.sigma), lwl: num(an.limits.lwl), uwl: num(an.limits.uwl), lcl: num(an.limits.lcl), ucl: num(an.limits.ucl) }))}
        — ${ctx.esc(t(an.fromTarget ? 'lb_qc_from_target' : (an.type === 'xbar' ? 'lb_qc_from_rbar' : 'lb_qc_from_mr')))}</p>
      <p class="text-sm">${ctx.esc(fill(t(an.type === 'xbar' ? 'lb_qc_r_limits' : 'lb_qc_mr_limits'), { cl: num(an.range.center), lcl: num(an.range.lcl), ucl: num(an.range.ucl) }))}${an.outRange.length ? ' — ' + ctx.esc(fill(t('lb_qc_r_out'), { i: an.outRange.map(i => i + 1).join(', ') })) : ''}</p>
      <div class="rg-actions" data-lb-srw="1">
        <span>${ctx.esc(fill(t('lb_qc_srw'), { s: num(an.sRw.sRw), n: an.sRw.n, nu: an.sRw.nu }))}</span>
        <button type="button" class="btn btn-outline btn-sm" data-lb-act="to-topdown">${ctx.esc(t('lb_qc_to_topdown'))}</button>
      </div></div>
        ${westgardPanelHTML(an, ctx)}
      </div>`;
  } else body = `<p class="text-muted" data-lb-qc-error="1">${ctx.esc(t('lb_err_' + ((an && an.error) || 'qc_need_data')))}</p>`;
  const pts = c.points.map((p, i) => `<tr><td>${i + 1}</td><td>${ctx.esc(p.date)}</td><td>${ctx.esc(p.run)}</td><td class="cell-num mono">${ctx.esc(p.values.join('; '))}</td>
    <td><button type="button" class="btn btn-ghost btn-sm" data-lb-act="del-qc-point" data-lb-index="${i}">×</button></td></tr>`).join('');
  return `<div class="card rg-card" data-lb-list="qc" data-lb-qc-id="${ctx.esc(c.id)}">${list}
    <div class="settings-grid">
      ${field(ctx, 'lb_f_name', inp(ctx, 'data-lb-qc="name"', c.name))}${field(ctx, 'lb_f_unit', inp(ctx, 'data-lb-qc="unit"', c.unit))}
      ${field(ctx, 'lb_qc_type', `<select data-lb-qc="type">${opt(ctx, 'imr', t('lb_qc_type_imr'), c.type)}${opt(ctx, 'xbar', t('lb_qc_type_xbar'), c.type)}</select>`)}
      ${field(ctx, 'lb_qc_target_mean', inp(ctx, 'data-lb-qc="targetMean"', m.target.mean, { decimal: true }), 'lb_qc_target_hint')}
      ${field(ctx, 'lb_qc_target_s', inp(ctx, 'data-lb-qc="targetS"', m.target.s, { decimal: true }))}
    </div>
    <div class="rg-actions">
      <button type="button" class="btn btn-primary btn-sm" data-lb-act="save-qc">${ctx.esc(t('lb_save'))}</button>
      <button type="button" class="btn btn-danger btn-sm" data-lb-act="del-qc"${dis(m.readOnly)}>${ctx.esc(t('lb_delete'))}</button>
    </div>
    ${body}
    <h4 class="rg-card-title">${ctx.esc(t('lb_qc_add_title'))}</h4>
    <div class="settings-grid">
      ${field(ctx, 'lb_qc_date', inp(ctx, 'data-lb-qc="newDate"', m.entry.date, { type: 'date' }))}
      ${field(ctx, 'lb_qc_run', inp(ctx, 'data-lb-qc="newRun"', m.entry.run), 'lb_qc_run_hint')}
      ${field(ctx, 'lb_qc_values', inp(ctx, 'data-lb-qc="newValues"', m.entry.values, { decimal: true }), c.type === 'xbar' ? 'lb_qc_values_hint_xbar' : 'lb_qc_values_hint_imr')}
    </div>
    <div class="rg-actions"><button type="button" class="btn btn-outline btn-sm" data-lb-act="add-qc-point">${ctx.esc(t('lb_qc_add'))}</button></div>
    ${c.points.length ? `<details class="lb-history"><summary>${ctx.esc(t('lb_qc_points'))} (${c.points.length})</summary><div class="table-scroll"><table class="data-table"><thead><tr><th>#</th><th>${ctx.esc(t('lb_qc_date'))}</th><th>${ctx.esc(t('lb_qc_run'))}</th><th>${ctx.esc(t('lb_qc_values'))}</th><th></th></tr></thead><tbody>${pts}</tbody></table></div></details>` : ''}
    ${historyHTML(m.history, ctx)}
    <p class="text-xs text-muted">${ctx.esc(t('lb_qc_source_note'))} (${ctx.esc(WESTGARD_RULES.map(r => t('lb_rule_' + r)).join(', '))})</p>
  </div>`;
}

/* ── B tur manbasi: reestrdan tanlash oynasi ── */
export function pickerHTML(m, ctx) {
  const t = ctx.t;
  if (!m.standards.length) return `<h2>${ctx.esc(t('lb_pick_title'))}</h2><div class="empty-state"><p>${ctx.esc(t('lb_std_empty'))}</p></div>`;
  const s = m.standard;
  let info = '';
  if (s && m.source && !m.source.error) {
    const sn = m.source.snapshot;
    info = `<div class="tpl-banner ${m.status.status === 'expired' ? 'tpl-banner-warn' : 'tpl-banner-ok'}" data-lb-pick-info="1">
      <div>${ctx.esc(fill(t('lb_pick_info'), { cert: sn.certificate || '—', date: sn.date || '—', valid: sn.validUntil || '—', org: sn.calibrator || '—' }))} ${badge(ctx, m.status.status, m.status.daysLeft)}</div>
      <div><strong>U = ${ctx.esc(num(sn.U))}${sn.k ? `, k = ${ctx.esc(num(sn.k))}` : ` — ${ctx.esc(t('lb_pick_no_k'))}`}${sn.nu ? `, ν = ${ctx.esc(num(sn.nu))}` : ''}</strong>
        ${sn.correction === null ? '' : ` · ${ctx.esc(fill(t('lb_pick_correction'), { c: num(sn.correction) }))}`}</div>
      ${sn.interpolated ? `<div data-lb-pick-interp="1">⚠ ${ctx.esc(fill(t('lb_pick_interp'), { a: num(sn.between[0]), b: num(sn.between[1]) }))}</div>
        <label class="td-choice"><input type="checkbox" data-lb-pick="addInterp"${m.addInterp ? ' checked' : ''} /><span>${ctx.esc(t('lb_pick_add_interp'))}</span></label>` : ''}
      ${m.status.evidence ? '' : `<div data-lb-pick-noaccr="1">⚠ ${ctx.esc(t('lb_no_accreditation'))}</div>`}
      ${m.status.status === 'expired' ? `<div data-lb-pick-expired="1">⚠ ${ctx.esc(t('lb_pick_expired'))}</div>` : ''}
    </div>`;
  } else if (s && m.source && m.source.error) info = `<div class="warn-box" data-lb-pick-error="${ctx.esc(m.source.error)}">${ctx.esc(t('lb_err_' + m.source.error))}</div>`;
  let drift = '';
  if (s && m.drift && m.drift.proposal) {
    const p = m.drift.proposal;
    drift = `<div class="tpl-banner tpl-banner-ok" data-lb-pick-drift="1">
      <div><strong>${ctx.esc(t('lb_pick_drift_title'))}</strong>: ${ctx.esc(fill(t('lb_drift_result'), { dc: num(p.deltaC), a: num(p.halfWidth), div: p.divisorLabel, u: num(p.u) }))}</div>
      <div class="text-xs text-muted">${ctx.esc(p.basis.calibrations.map(c => `${c.certificate || '—'} (${c.date}; C = ${num(c.correction)})`).join('; '))}</div>
      <label class="td-choice"><input type="checkbox" data-lb-pick="addDrift"${m.addDrift ? ' checked' : ''} /><span>${ctx.esc(t('lb_pick_add_drift'))}</span></label>
    </div>`;
  }
  return `<h2>${ctx.esc(t('lb_pick_title'))}</h2>
    <p class="text-xs text-muted">${ctx.esc(t('lb_pick_hint'))}</p>
    <div class="settings-grid">
      ${field(ctx, 'lb_pick_standard', `<select data-lb-pick="standard">${opt(ctx, '', '—', m.selected)}${m.standards.map(x => opt(ctx, x.id, `${x.name}${x.serial ? ' (' + x.serial + ')' : ''}`, m.selected)).join('')}</select>`)}
      ${field(ctx, 'lb_pick_param', `<select data-lb-pick="param">${m.params.map(p => opt(ctx, p, p, m.param)).join('')}</select>`)}
      ${field(ctx, 'lb_f_x', inp(ctx, 'data-lb-pick="x"', m.x, { decimal: true }), 'lb_f_x_hint')}
      ${field(ctx, 'lb_pick_date', inp(ctx, 'data-lb-pick="date"', m.date, { type: 'date' }), 'lb_pick_date_hint')}
    </div>
    ${info}${drift}
    <div class="tpl-ed-actions">
      <button type="button" class="btn btn-primary btn-sm" data-lb-pick-act="add"${s && m.source && !m.source.error ? '' : ' disabled'}>${ctx.esc(t('lb_pick_add'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-lb-pick-act="close">${ctx.esc(t('lb_close'))}</button>
    </div>`;
}
