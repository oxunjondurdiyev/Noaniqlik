/* ═══════════════════════════════════════════════════════════════
   LAB.JS — hisobotning laboratoriya reestri bo'limlari (P11). Sof modul (DOM yo'q): HTML satrlari.
   1. Reestrdan tanlangan B tur manbalari: sertifikat raqami, sanasi, amal qilish muddati, kalibrlovchi TASHKILOT
      (shaxs emas), akkreditatsiya belgisi, kuzatuvchanlik yozuvi, nuqta va tuzatma, reestr yozuvi ID / versiyasi.
      Ref: ILAC P10:07/2020 §2 (kuzatuvchanlik dalili); ISO/IEC 17025:2017 §7.8.4.1 — unverified (standart repoda yo'q).
   2. CMC tekshiruvi: qaysi CMC qatori, CMC(X), U ≥ CMC yoki asoslangan qaror (qabul qilingan topilma izohi).
      Ref: ILAC P14:09/2020 §4.2, §5.5. Dastur U ni CMC ga almashtirmaydi.
   3. Drift manbasi asosi: qaysi kalibrlashlar, qaysi usul, qaysi taqsimot / bo'luvchi.
   Hech biri bo'lmasa — bo'sh satr (P11 gacha bo'lgan hisobotlar bayt darajasida o'zgarmaydi).
   Har qanday qiymat env.esc orqali; matnlar env.t (src/js/i18n-lab.js) orqali.
═══════════════════════════════════════════════════════════════ */

const num = (v, sig) => (typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toPrecision(sig || 6))) : '—');
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] === undefined ? m : o[k]));

/** Byudjetdagi reestr manbalari (takrorlanmas: reestr ID + versiya + nuqta). */
export function registrySources(r) {
  const seen = new Set(), out = [];
  for (const b of (r && r.budget) || []) {
    if (!b.registry) continue;
    const key = `${b.registry.id}@${b.registry.version}@${b.registry.x}@${b.param}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: b.name, param: b.param, unit: b.unit || '', ...b.registry });
  }
  return out;
}

export function driftSources(r) {
  return ((r && r.budget) || []).filter(b => b.drift).map(b => ({ name: b.name, param: b.param, unit: b.unit || '', u: b.u, ...b.drift }));
}

/**
 * @param {{t:Function, esc:Function}} env
 * @param {object} r  GUM natijasi
 * @param {{print?:boolean, acceptances?:object}} [opt]
 * @returns {string} HTML ('' — reestr / CMC jadvali / drift ishlatilmagan)
 */
export function labSectionHTML(env, r, opt = {}) {
  const { t, esc } = env;
  if (!r || r.error) return '';
  const cls = opt.print ? 'print-table' : 'data-table';
  const head = k => (opt.print ? `<div class="print-section">${esc(t(k))}</div>` : `<div class="section-title">${esc(t(k))}</div>`);
  const line = (html, attr) => `<p class="report-line"${attr || ''}>${html}</p>`;
  const parts = [];

  const src = registrySources(r);
  if (src.length) {
    const rows = src.map(s => {
      const trace = [s.route ? t('lr_route_' + s.route) : '', s.traceability].filter(Boolean).join(' — ');
      const point = s.x === null || s.x === undefined ? '—'
        : `${num(s.x)}${s.interpolated && s.between ? ` (${fill(t('lr_interp'), { a: num(s.between[0]), b: num(s.between[1]) })})` : ''}`;
      return `<tr data-report-registry="${esc(s.id)}">
        <td>${esc(s.param)}: ${esc(s.name)}<br><small>${esc(fill(t('lr_registry_ref'), { id: s.id, v: s.version }))}</small></td>
        <td>${esc(s.certificate || '—')}</td><td>${esc(s.date || '—')}</td><td>${esc(s.validUntil || '—')}</td>
        <td>${esc(s.calibrator || '—')}</td><td>${esc(s.accreditation || '—')}</td><td>${esc(trace || '—')}</td>
        <td>${esc(point)}</td><td class="num">${esc(s.correction === null || s.correction === undefined ? '—' : num(s.correction))}</td>
        <td class="num">${esc(num(s.U))}${s.k ? ` (k = ${esc(num(s.k))})` : ''}</td></tr>`;
    }).join('');
    parts.push(`${head('lr_sources_title')}
      <table class="${cls}" data-report-registry-table="1"><thead><tr>${['lr_col_source', 'lr_col_cert', 'lr_col_date', 'lr_col_valid', 'lr_col_org', 'lr_col_accr', 'lr_col_trace', 'lr_col_point', 'lr_col_corr', 'lr_col_U']
    .map(k => `<th>${esc(t(k))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
      ${r.measurementDate ? line(`${esc(t('lr_meas_date'))}: ${esc(r.measurementDate)}`, ' data-report-meas-date="1"') : ''}
      ${line(esc(t('lr_correction_note')))}`);
  }

  const c = r.cmcCheck;
  if (c) {
    const unit = c.unit ? ' ' + c.unit : '';
    const rowText = fill(t('lr_cmc_row'), { q: c.quantity || '—', min: num(c.min), max: num(c.max), unit: c.unit || '', m: c.method || '—', id: c.rowId || '—', v: c.tableVersion || '—' });
    let status, state;
    if (c.pending === 'x') { status = t('lr_cmc_pending'); state = 'pending'; }
    else if (c.inRange === false) { status = fill(t('lr_cmc_outside'), { x: num(c.x) + unit }); state = 'outside'; }
    else {
      state = c.below ? 'below' : 'ok';
      status = `${fill(t('lr_cmc_value'), { x: num(c.x) + unit, cmc: num(c.cmc) + unit })}; U = ${num(r.U)}${unit} ${c.below ? '<' : '≥'} CMC — ${t(c.below ? 'lr_cmc_below' : 'lr_cmc_ok')}`;
    }
    let decision = '';
    if (state === 'below') {
      const f = (r.findings || []).find(x => x.code === 'below_cmc');
      const a = f && opt.acceptances ? opt.acceptances[f.id] : null;
      decision = a && a.comment ? line(`<strong>${esc(t('lr_cmc_decision'))}:</strong> ${esc(a.comment)}${a.role ? ` (${esc(a.role)}${a.at ? ', ' + esc(String(a.at).slice(0, 10)) : ''})` : ''}`, ' data-report-cmc-decision="1"')
        : line(`<strong>${esc(t('lr_cmc_no_decision'))}</strong>`, ' data-report-cmc-decision="0"');
    }
    parts.push(`${head('lr_cmc_title')}${line(esc(rowText))}${line(esc(status), ` data-report-cmc-check="${state}"`)}${decision}`);
  }

  const dr = driftSources(r);
  if (dr.length) {
    parts.push(head('lr_drift_title') + dr.map(d => {
      const cals = (d.calibrations || []).map(k => `${k.certificate || '—'} (${k.date || '—'}; C = ${num(k.correction)})`).join('; ');
      const txt = fill(t('lr_drift_line'), {
        name: `${d.param}: ${d.name}`, method: t('lr_drift_method_' + (d.method === 'trend' ? 'trend' : 'last_two')), dc: num(d.deltaC),
        dist: t('lr_dist_' + (d.distribution || 'rect')), div: d.divisorLabel || '√3', u: num(d.u), cals,
      });
      const trend = d.method === 'trend' && typeof d.slopePerYear === 'number' ? ' ' + fill(t('lr_drift_trend'), { slope: num(d.slopePerYear), days: d.horizonDays }) : '';
      return line(esc(txt + trend), ` data-report-drift="${esc(d.registryId || '')}"`);
    }).join(''));
  }
  return parts.length ? `<div class="lab-report" data-report-lab="1">${parts.join('')}</div>` : '';
}
