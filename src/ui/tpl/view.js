/* ═══════════════════════════════════════════════════════════════
   TPL/VIEW.JS — shablonlar UI uchun sof HTML quruvchilar (P04).
   (ma'lumot, ctx) → HTML satr. ctx = { t: i18n.t, esc: escHtml, lang }.
   Shablondan va foydalanuvchidan kelgan HAR BIR qiymat ctx.esc dan o'tadi (P02, R-S5).
   Hodisalar — data-* atributlari, ulash src/ui/tpl/app.js da (inline handler yo'q, CSP).
   Node'da test qilinadi: tests/templates/view.test.js.
═══════════════════════════════════════════════════════════════ */
import { tr, matchTemplate } from '../../templates/interpreter.js';

export const SECTION_ORDER = ['construction', 'food_chem', 'electrical', 'calibration', 'general'];

export function hasDemo(tpl) {
  return !!((tpl.sampleData && tpl.sampleData.demo) || (tpl.points || []).some(p => p.demo) || (tpl.regression && tpl.regression.demo));
}

/* R-27 (6), egasi qarori (b), 2026-11-20: shablon muharriridagi "Kim" — erkin matn EMAS, rol ro'yxati
   (reestr va P12 dagidek; audit `actor` va history `by` ga faqat rol identifikatori yoziladi — ism emas). */
export const EDITOR_ROLES = Object.freeze(['admin', 'employee', 'superadmin', 'guest']);
export const editorRole = v => (EDITOR_ROLES.includes(v) ? v : 'guest');
export function roleSelectHTML(current, ctx) {
  const cur = editorRole(current);
  return `<select id="ed-by" data-ed-role="1">${EDITOR_ROLES.map(r => `<option value="${ctx.esc(r)}"${r === cur ? ' selected' : ''}>${ctx.esc(r)}</option>`).join('')}</select>`;
}

export function statusBadge(status, ctx) {
  const cls = { AI_DRAFT: 'tpl-st-draft tpl-st-ai', DRAFT: 'tpl-st-draft', REVIEWED: 'tpl-st-reviewed', APPROVED: 'tpl-st-approved', RETIRED: 'tpl-st-retired' }[status] || 'tpl-st-draft';
  return `<span class="tpl-badge ${cls}">${ctx.esc(ctx.t('tpl_status_' + status))}</span>`;
}

function standardsLine(tpl, ctx) {
  const list = tpl.standards || [];
  if (!list.length) return '<span class="text-muted">—</span>';
  return list.map(s => `<span class="tpl-std">${ctx.esc(s.code)}${s.clause ? ' ' + ctx.esc(s.clause) : ''}${s.labCount ? ` <span class="text-muted">(${ctx.esc(s.labCount)})</span>` : ''}</span>`).join(' ');
}

/** Katalog kartasi */
/** P16 (egasi qarori 2026-11-20): shablon kartasidagi "Manba bilan mos" belgisi. Qo'lda yoziladigan bayroq EMAS —
    templates/validation/builtin.json (scripts/template-validation.js: hisob ↔ tests/fixtures etalon misoli) dan.
    Foydalanuvchi nusxasi (local) va ro'yxatda yo'q shablon — "unverified". Δ — nisbiy farq, foizda. */
const fillText = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] === undefined ? m : o[k]));
const deltaText = rel => { const pct = rel * 100; return pct === 0 ? '0' : pct >= 0.001 ? String(Number(pct.toPrecision(2))) : pct.toExponential(1); };

export function validationBadge(tpl, local, ctx) {
  const v = ctx.validationOf ? ctx.validationOf(tpl, local) : null;
  if (!v || v.status !== 'verified') {
    const why = v && v.reason ? ctx.t('tplv_why_' + v.reason) : '';
    return `<div class="tpl-validation" data-tpl-validation="unverified" data-tpl-validation-reason="${ctx.esc(v && v.reason ? v.reason : 'no_record')}"><span class="badge badge-orange">${ctx.esc(ctx.t('tplv_unverified'))}</span>` +
      (why && v.reason !== 'no_record' ? ` <span class="text-xs text-muted">${ctx.esc(why)}</span>` : '') + '</div>';
  }
  const known = v.known.length ? ` <span class="text-xs text-muted">${ctx.esc(fillText(ctx.t('tplv_known'), { ids: v.known.join(', ') }))}</span>` : '';
  return `<div class="tpl-validation" data-tpl-validation="verified" title="${ctx.esc(ctx.t('tplv_tip'))}"><span class="badge badge-green">${ctx.esc(fillText(ctx.t('tplv_verified'), { source: v.source, clause: v.clause, d: deltaText(v.relDiff) }))}</span>${known}</div>`;
}

/** A4 hisobotidagi BITTA qator (egasi sharti): validatsiya holati + manba + ENGINE_VERSION */
export function validationLineHTML(v, ctx) {
  if (!v) return '';
  const text = v.status === 'verified'
    ? fillText(ctx.t('tplv_report_verified'), { source: v.source, clause: v.clause, d: deltaText(v.relDiff), date: v.date, ev: v.engineVersion }) +
      (v.known.length ? ' ' + fillText(ctx.t('tplv_known'), { ids: v.known.join(', ') }) : '')
    : fillText(ctx.t('tplv_report_unverified'), { why: ctx.t('tplv_why_' + (v.reason || 'no_record')), source: v.source || '—', ev: v.engineVersion });
  return `<div class="tpl-report-validation" data-report-validation="${ctx.esc(v.status)}" data-report-validation-reason="${ctx.esc(v.reason || '')}">${ctx.esc(text)}</div>`;
}

export function cardHTML(entry, ctx) {
  const { tpl, local } = entry;
  const key = `${tpl.id}@${tpl.version}`;
  const variants = tpl.variants || [];
  const variantSel = variants.length > 1
    ? `<label class="tpl-variant"><span>${ctx.esc(ctx.t('tpl_variant'))}</span>
        <select data-tpl-variant="${ctx.esc(key)}">${variants.map(v =>
          `<option value="${ctx.esc(v.id)}" ${v.id === (tpl.defaultVariant || variants[0].id) ? 'selected' : ''}>${ctx.esc(tr(v.title, ctx.lang))}</option>`).join('')}</select></label>`
    : '';
  const oq = (tpl.openQuestions || []).length;
  return `
    <article class="tpl-card" data-tpl-card="${ctx.esc(key)}">
      <header class="tpl-card-head">
        <span class="tpl-id mono">${ctx.esc(tpl.id)} <span class="text-muted">v${ctx.esc(tpl.version)}</span></span>
        ${statusBadge(tpl.status, ctx)}
      </header>
      <h3 class="tpl-card-title">${ctx.esc(tr(tpl.title, ctx.lang))}</h3>
      <div class="tpl-card-formula mono">${ctx.esc(tpl.model.formula || tpl.measurand.symbol)}</div>
      <dl class="tpl-meta">
        <dt>${ctx.esc(ctx.t('tpl_standards'))}</dt><dd>${standardsLine(tpl, ctx)}</dd>
        <dt>${ctx.esc(ctx.t('tpl_labs'))}</dt><dd>${tpl.labCount === null || tpl.labCount === undefined ? '—' : ctx.esc(tpl.labCount)}</dd>
        ${oq ? `<dt>${ctx.esc(ctx.t('tpl_open_q'))}</dt><dd>${ctx.esc(oq)}</dd>` : ''}
      </dl>
      ${validationBadge(tpl, local, ctx)}
      ${hasDemo(tpl) ? `<div class="tpl-demo" data-demo-warning="1">⚠ ${ctx.esc(ctx.t('tpl_demo_badge'))}</div>` : ''}
      ${local ? `<div class="text-xs text-muted">${ctx.esc(ctx.t('tpl_local_copy'))}</div>` : ''}
      ${variantSel}
      <footer class="tpl-card-actions">
        <button type="button" class="btn btn-primary btn-sm" data-tpl-use="${ctx.esc(key)}" ${tpl.status === 'RETIRED' ? 'disabled' : ''}>${ctx.esc(ctx.t('tpl_btn_use'))}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-tpl-edit="${ctx.esc(key)}">${ctx.esc(ctx.t('tpl_btn_edit'))}</button>
      </footer>
    </article>`;
}

/** Bo'limlarga ajratilgan katalog (qidiruv standart shifri, ID yoki nomi bo'yicha) */
export function catalogHTML(entries, query, ctx) {
  const shown = entries.filter(e => matchTemplate(e.tpl, query));
  if (!shown.length) return `<p class="text-muted tpl-empty">${ctx.esc(ctx.t('tpl_empty'))}</p>`;
  const groups = SECTION_ORDER.map(sec => [sec, shown.filter(e => (e.tpl.section || 'general') === sec)]).filter(([, l]) => l.length);
  return groups.map(([sec, list]) => `
    <section class="tpl-section" data-section="${ctx.esc(sec)}">
      <h2 class="tpl-section-title">${ctx.esc(ctx.t('tpl_sec_' + sec))} <span class="text-muted text-sm">${list.length} ${ctx.esc(ctx.t('tpl_count'))}</span></h2>
      <div class="tpl-grid">${list.map(e => cardHTML(e, ctx)).join('')}</div>
    </section>`).join('');
}

/** Yarim kenglik formulasida belgi qatnashadimi (identifikator sifatida) */
export function usesSymbol(expr, sym) {
  return typeof expr === 'string' && expr.split(/[\s+\-*/^(),]+/).includes(sym);
}

export function missingText(list, ctx) {
  return list.map(m => {
    const what = ctx.t('tpl_missing_' + m.type);
    const who = m.name || m.symbol || m.id || '';
    return `${who}: ${what}`;
  });
}

/** Hisob sahifasidagi shablon paneli (ma'lumot kiritish yorlig'i tepasida) */
export function bannerHTML(state, missing, ctx) {
  const m = state && state.template;
  if (!m) return '';
  const info = m.inputInfo || {};
  const statusCls = m.status === 'APPROVED' ? 'tpl-banner-ok' : 'tpl-banner-warn';
  const consts = [
    ...(m.constants || []).map(sym => ({ sym, kind: 'model', value: ((state.measurements || {})[sym] || [])[0], info: (m.constInfo || {})[sym] || info[sym] || {} })),
    ...Object.keys(m.aux || {}).filter(sym => (state.typeB || []).some(c => usesSymbol(c.halfWidthExpr !== undefined ? c.halfWidthExpr : c.halfWidth, sym)))
      .map(sym => ({ sym, kind: 'aux', value: m.aux[sym], info: (m.auxInfo || {})[sym] || {} })),
  ];
  const num = v => (v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v)) ? '' : String(v));
  return `
    <div class="tpl-banner ${statusCls}">
      <div class="tpl-banner-head">
        <strong>${ctx.esc(ctx.t('tpl_template'))}: ${ctx.esc(m.id)} v${ctx.esc(m.version)}</strong>
        — ${ctx.esc(tr(m.title, ctx.lang))}${m.variantTitle ? ` <span class="text-muted">(${ctx.esc(m.variantTitle)})</span>` : ''}
        ${m.status !== 'APPROVED' ? `<div class="tpl-banner-status" data-draft-warning="1">⚠ ${ctx.esc(ctx.t('tpl_banner_' + m.status))}</div>` : ''}
        ${m.demo ? `<div class="tpl-demo" data-demo-warning="1">⚠ ${ctx.esc(ctx.t('tpl_banner_demo'))} <button type="button" class="btn btn-ghost btn-sm" data-tpl-clear-demo="1">${ctx.esc(ctx.t('tpl_clear_demo'))}</button></div>` : ''}
      </div>
      ${(m.standards || []).length ? `<div class="text-xs">${ctx.esc(ctx.t('tpl_standards'))}: ${m.standards.map(s => ctx.esc(s.code)).join(', ')}</div>` : ''}
      ${Object.keys(info).length ? `<ul class="tpl-hints">${Object.entries(info).filter(([s]) => !(m.constants || []).includes(s)).map(([s, x]) =>
        `<li><b class="mono">${ctx.esc(s)}</b> — ${ctx.esc(x.name)}${x.hint ? `<div class="text-xs text-muted">${ctx.esc(x.hint)}</div>` : ''}</li>`).join('')}</ul>` : ''}
      ${consts.length ? `<div class="tpl-block"><div class="tpl-block-title">${ctx.esc(ctx.t('tpl_constants'))}</div>
        ${consts.map(c => `<label class="tpl-const"><span class="mono">${ctx.esc(c.sym)}</span> <span>${ctx.esc(c.info.name || '')}${c.info.unit ? ', ' + ctx.esc(c.info.unit) : ''}</span>
          <input type="text" inputmode="decimal" data-tpl-const="${ctx.esc(c.sym)}" data-kind="${ctx.esc(c.kind)}" value="${ctx.esc(num(c.value))}" autocomplete="off" />
          ${c.info.hint ? `<span class="text-xs text-muted">${ctx.esc(c.info.hint)}</span>` : ''}${c.info.ref ? `<span class="text-xs text-muted">${ctx.esc(c.info.ref)}</span>` : ''}</label>`).join('')}</div>` : ''}
      ${(m.correlations || []).length ? `<div class="tpl-block"><div class="tpl-block-title">${ctx.esc(ctx.t('tpl_corr_title'))}</div>
        ${m.correlations.map((c, i) => `<label class="tpl-corr"><input type="checkbox" data-tpl-corr="${i}" ${c.enabled ? 'checked' : ''} />
          <span><b class="mono">${c.inputs.map(ctx.esc).join(', ')}</b> — ${ctx.esc(((m.correlationInfo || {})[c.id] || {}).question || ctx.t('tpl_corr_yes'))}</span></label>
          ${c.instrument ? `<label class="tpl-split"><span>${ctx.esc(ctx.t('tpl_split_label'))}</span>
            <select data-tpl-split="${i}">
              <option value="known" ${(c.split || 'unknown') === 'known' ? 'selected' : ''}>${ctx.esc(ctx.t('tpl_split_known'))}</option>
              <option value="unknown" ${(c.split || 'unknown') === 'unknown' ? 'selected' : ''}>${ctx.esc(ctx.t('tpl_split_unknown'))}</option>
            </select>
            <span class="text-xs text-muted">${ctx.esc(ctx.t('tpl_split_hint'))}</span></label>` : ''}`).join('')}</div>` : ''}
      ${(m.excludedEntries || []).length ? `<div class="tpl-block"><div class="tpl-block-title">${ctx.esc(ctx.t('tpl_excluded'))}</div>
        ${m.excludedEntries.map((e, i) => `<div class="tpl-excl"><span>${ctx.esc(e.name)} <span class="text-xs text-muted">(${ctx.esc(e.param)}; ${ctx.esc(ctx.t('tpl_optional'))})</span>${e.hint ? `<div class="text-xs text-muted">${ctx.esc(e.hint)}</div>` : ''}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-tpl-include="${i}">${ctx.esc(ctx.t('tpl_include'))}</button></div>`).join('')}</div>` : ''}
      ${m.decisionRule && m.decisionRule.required ? `<div class="tpl-block text-sm">⚖ ${ctx.esc(ctx.t('tpl_decision_required'))}${m.decisionRule.note ? ` <span class="text-muted">${ctx.esc(tr(m.decisionRule.note, ctx.lang))}</span>` : ''}</div>` : ''}
      ${missing && missing.length ? `<div class="tpl-missing"><b>${ctx.esc(ctx.t('tpl_missing'))} (${missing.length}):</b> ${missingText(missing, ctx).map(ctx.esc).join('; ')}</div>` : ''}
      ${(m.openQuestionList || []).length ? `<details class="tpl-block"><summary>${ctx.esc(ctx.t('tpl_open_questions'))} (${m.openQuestionList.length})</summary>
        <ul>${m.openQuestionList.map(q => `<li><b>${ctx.esc(q.id)}</b> [${ctx.esc(q.owner)}] ${ctx.esc(q.text)}</li>`).join('')}</ul></details>` : ''}
      ${m.sourceNote ? `<div class="text-xs text-muted">${ctx.esc(m.sourceNote)}</div>` : ''}
    </div>`;
}

/** P04b: "Korrelyatsiya noma'lum — konservativ chegara: r = …" va ikki marta hisoblash ogohlantirishi */
export function boundLinesHTML(result, ctx) {
  if (!result) return [];
  const lines = [];
  const b = result.templateBound;
  if (b) {
    const rs = [...new Set(b.r)];
    const fmt = v => (Number.isFinite(v) ? Number(v).toPrecision(4) : String(v));
    lines.push(`<div class="tpl-report-bound" data-bound="1">${ctx.esc(ctx.t('tpl_bound_line'))} ${ctx.esc(rs.join(' / '))}` +
      ` <span class="text-muted">(u_c(r = 0) = ${ctx.esc(fmt(b.ucR0))}; u_c(r = 1) = ${ctx.esc(fmt(b.ucR1))}; ${ctx.esc(ctx.t('tpl_bound_project'))})</span></div>`);
  }
  for (const w of result.templateWarnings || []) {
    if (w.code === 'split_exceeds') lines.push(`<div class="tpl-report-warn" data-split-warning="1">⚠ ${ctx.esc(w.param)}: ${ctx.esc(ctx.t('tpl_split_exceeds'))}</div>`);
  }
  return lines;
}

/** Natijalar va bosma hisobot uchun shablon belgilari (DRAFT, demo, kiritilmagan manbalar, korrelyatsiya) */
export function reportNoticeHTML(meta, ctx, result) {
  if (!meta) return '';
  const lines = [];
  // P14: AI_DRAFT shablon bilan hisob — "RASMIY EMAS" suv belgisi (src/report/findings.js::watermarkHTML bilan bir xil belgilash;
  // hisobot qatlami (src/report/) o'zgartirilmagan — belgi shablon eslatmasi orqali qo'shiladi)
  if (meta.status === 'AI_DRAFT') lines.push(`<div class="report-watermark" data-report-watermark="1" data-ai-draft="1" aria-hidden="true">${ctx.esc(ctx.t('fnd_unofficial'))}</div><div class="report-unofficial-banner" data-report-unofficial="1" data-ai-draft="1">${ctx.esc(ctx.t('fnd_unofficial'))} — ${ctx.esc(ctx.t('tpl_banner_AI_DRAFT'))}</div>`);
  if (meta.status !== 'APPROVED') lines.push(`<div class="tpl-report-warn" data-draft-warning="1">⚠ ${ctx.esc(ctx.t('tpl_banner_' + meta.status))}</div>`);
  if (meta.demo) lines.push(`<div class="tpl-report-warn" data-demo-warning="1">⚠ ${ctx.esc(ctx.t('tpl_banner_demo'))}</div>`);
  const std = (meta.standards || []).map(s => s.code).join(', ');
  lines.push(`<div>${ctx.esc(ctx.t('tpl_report_line'))}: ${ctx.esc(meta.id)} v${ctx.esc(meta.version)} (${ctx.esc(meta.status)})${meta.variant ? ', ' + ctx.esc(meta.variantTitle || meta.variant) : ''}${std ? ' — ' + ctx.esc(std) : ''}</div>`);
  const excl = (meta.excludedEntries || []).map(e => e.name);
  if (excl.length) lines.push(`<div>${ctx.esc(ctx.t('tpl_report_excluded'))}: ${excl.map(ctx.esc).join('; ')}</div>`);
  const corr = (meta.correlations || []).filter(c => c.enabled);
  if (corr.length) lines.push(`<div>${ctx.esc(ctx.t('tpl_report_corr'))}: ${corr.map(c => ctx.esc(c.inputs.join(' ↔ ')) + ' (' + (c.split === 'known' ? 'r = ' + ctx.esc(c.r) + ', ' + ctx.esc(ctx.t('tpl_split_known')) : ctx.esc(ctx.t('tpl_split_unknown'))) + ')').join('; ')}</div>`);
  lines.push(...boundLinesHTML(result, ctx));
  lines.push(validationLineHTML(ctx.validation, ctx));
  if (meta.decisionRule && meta.decisionRule.required) lines.push(`<div>⚖ ${ctx.esc(ctx.t('tpl_decision_required'))}</div>`);
  return `<div class="tpl-report-notice">${lines.join('')}</div>`;
}
