/* ═══════════════════════════════════════════════════════════════
   AI/VIEW.JS — AI yordamchi oynasi uchun sof HTML quruvchilar (P14). (ma'lumot, ctx) → HTML satr; ctx = { t, esc }.
   AI javobidan, hujjatdan va foydalanuvchidan kelgan HAR BIR qiymat ctx.esc dan o'tadi (AI javobi — ishonchsiz ma'lumot,
   docs/AI_DESIGN.md §2.4). Hodisalar — data-ai* atributlari, ulash src/ui/ai/app.js da (inline handler yo'q, CSP).
   Har bir taklif "AI taklifi" belgisi bilan; "Hammasini tasdiqlash" tugmasi YO'Q (egasi qarori S-5 b: faqat nuqtalar
   jadvalida "qatorni tasdiqlash"). Node'da test qilinadi: tests/ui/ai.test.js.
═══════════════════════════════════════════════════════════════ */
export const FN_ORDER = ['explain', 'source_suggest', 'template_draft', 'certificate_extract'];
export const CERT_FIELD_ORDER = ['certificate', 'calibrator', 'accreditation', 'date', 'validUntil', 'traceability'];

const badge = ctx => `<span class="badge ai-badge" data-ai-badge="1">${ctx.esc(ctx.t('ai_badge'))}</span>`;
const num = v => (v === null || v === undefined ? '—' : String(v).replace('.', ','));
const head = (title, ctx) => `<h2>${ctx.esc(ctx.t('ai_title'))}</h2><p class="text-xs text-muted" data-ai-principle="1">${ctx.esc(ctx.t('ai_principle'))}</p>${title ? `<div class="tpl-ed-sub">${ctx.esc(title)}</div>` : ''}`;
const actions = html => `<div class="tpl-ed-actions">${html}</div>`;
const btn = (act, label, ctx, cls = 'btn-outline', extra = '') => `<button type="button" class="btn ${cls} btn-sm" data-ai="${ctx.esc(act)}" ${extra}>${ctx.esc(label)}</button>`;

export function menuHTML(ctx) {
  return `${head('', ctx)}<div class="ai-menu">${FN_ORDER.map(fn => `<button type="button" class="btn btn-outline btn-sm" data-ai="fn" data-fn="${ctx.esc(fn)}">${ctx.esc(ctx.t('ai_fn_' + fn))}</button>`).join(' ')}</div>
    ${actions(btn('close', ctx.t('ai_close'), ctx, 'btn-ghost'))}`;
}

export function inputHTML(fn, ctx) {
  const doc = fn === 'template_draft' || fn === 'certificate_extract';
  return `${head(ctx.t('ai_fn_' + fn), ctx)}<p class="text-xs text-muted">${ctx.esc(ctx.t('ai_hint_' + fn))}</p>
    ${doc ? `<label>${ctx.esc(ctx.t('ai_doc_label'))}<textarea id="ai-doc" class="mono tpl-ed-json" spellcheck="false"></textarea></label>
      ${fn === 'certificate_extract' ? `<label>${ctx.esc(ctx.t('ai_doc_file'))} <input type="file" id="ai-file" accept="image/png,image/jpeg,image/webp,application/pdf" /></label>` : ''}
      <label class="model-check"><input type="checkbox" id="ai-consent" /> <span>${ctx.esc(ctx.t('ai_doc_consent'))}</span></label>` : ''}
    <div id="ai-msg"></div>
    ${actions(btn('prepare', ctx.t('ai_prepare'), ctx, 'btn-primary') + btn('menu', ctx.t('ai_back'), ctx, 'btn-ghost'))}`;
}

export function errorHTML(code, detail, ctx) {
  const key = 'ai_err_' + code;
  const text = ctx.t(key) === key ? ctx.t('ai_err_generic') : ctx.t(key);
  return `<div class="tpl-missing" data-ai-error="${ctx.esc(code)}">${ctx.esc(text)}${detail ? `<div class="mono text-xs">${ctx.esc(detail)}</div>` : ''}</div>`;
}

export function rejectedHTML(rejected, ctx) {
  if (!rejected || !rejected.length) return '';
  return `<details class="ai-rejected" data-ai-rejected="${rejected.length}"><summary>${ctx.esc(ctx.t('ai_rejected_title'))}: ${rejected.length}</summary><ul>${rejected.map(r => {
    const key = 'ai_rej_' + r.code;
    return `<li><span class="mono">${ctx.esc(r.path)}</span> — ${ctx.esc(ctx.t(key) === key ? r.code : ctx.t(key))}</li>`;
  }).join('')}</ul></details>`;
}

/** Yuboriladigan TO'LIQ matn (textarea ichida — escape qilingan) + javobni qaytarish maydoni. */
export function previewHTML(o, ctx) {
  const warn = (o.warnings || []).length ? `<div class="warn-box" data-ai-sensitive="1">⚠ ${ctx.esc(ctx.t('ai_warn_sensitive'))}: ${o.warnings.map(w => `${ctx.esc(ctx.t('ai_sens_' + w.category))} — ${ctx.esc(w.count)}`).join('; ')}</div>` : '';
  return `${head(ctx.t('ai_fn_' + o.fn), ctx)}${warn}
    <label>${ctx.esc(ctx.t('ai_preview_title'))} <span class="mono text-xs">${ctx.esc(o.promptId)}@${ctx.esc(o.promptVersion)}</span>
      <textarea id="ai-prompt" class="mono tpl-ed-json" readonly spellcheck="false">${ctx.esc(o.text)}</textarea></label>
    ${o.hasImage ? `<p class="text-xs" data-ai-image="1">${ctx.esc(ctx.t('ai_preview_image'))}</p>` : ''}
    ${actions(btn('copy', ctx.t('ai_copy'), ctx, 'btn-primary') + btn('own-key', ctx.t('ai_open_own_key'), ctx)
      + (o.exchangeId ? ` <a class="btn btn-outline btn-sm" data-ai-link="1" href="ai.html#${ctx.esc(encodeURIComponent(o.exchangeId))}" target="_blank" rel="noopener noreferrer">${ctx.esc(ctx.t('ai_own_link'))}</a>` + btn('fetch', ctx.t('ai_fetch_exchange'), ctx) : ''))}
    <label>${ctx.esc(ctx.t('ai_paste_label'))}<textarea id="ai-response" class="mono tpl-ed-json" spellcheck="false"></textarea></label>
    <div id="ai-msg"></div>
    ${actions(btn('check', ctx.t('ai_check'), ctx, 'btn-primary') + btn('menu', ctx.t('ai_back'), ctx, 'btn-ghost'))}`;
}

/** c) izoh — "AI izohi — rasmiy emas" belgisi bilan */
export function explainBodyHTML(res, ctx) {
  return `<div class="ai-unofficial" data-ai-unofficial="1">${ctx.esc(ctx.t('ai_unofficial'))} — ${ctx.esc(ctx.t('ai_unofficial_hint'))}</div>
    ${res.summary ? `<p>${ctx.esc(res.summary)}</p>` : ''}
    <ul>${res.items.map(i => `<li><span class="mono">${ctx.esc(i.code)}</span>: ${ctx.esc(i.text)}</li>`).join('')}</ul>`;
}
export function reviewExplainHTML(res, include, ctx) {
  return `${head(ctx.t('ai_fn_explain'), ctx)}${explainBodyHTML(res, ctx)}${rejectedHTML(res.rejected, ctx)}
    <label class="model-check"><input type="checkbox" id="ai-include" data-ai-change="include" ${include ? 'checked' : ''} /> <span>${ctx.esc(ctx.t('ai_expl_include'))}</span></label>
    ${actions(btn('menu', ctx.t('ai_back'), ctx, 'btn-ghost') + btn('close', ctx.t('ai_close'), ctx, 'btn-ghost'))}`;
}
/** Bosma hisobotga ichki ilova (faqat foydalanuvchi tanlasa). */
export function appendixHTML(res, ctx) {
  if (!res) return '';
  return `<div class="print-page-break"></div><div class="report-section ai-appendix" data-ai-appendix="1"><h3>${ctx.esc(ctx.t('ai_appendix_title'))}</h3>${explainBodyHTML(res, ctx)}</div>`;
}

/** d) manba taklifi — QIYMATSIZ */
export function reviewSuggestHTML(res, added, ctx) {
  const rows = res.suggestions.map((s, i) => `<tr data-ai-suggestion="${i}"><td>${badge(ctx)}</td><td class="mono">${ctx.esc(s.input)}</td><td>${ctx.esc(s.name)}${s.caution ? `<div class="text-xs warn-text" data-ai-caution="1">⚠ ${ctx.esc(ctx.t('ai_sug_caution'))}</div>` : ''}</td>
    <td class="mono">${ctx.esc(s.kind)}${s.distribution ? ' / ' + ctx.esc(s.distribution) : ''}</td><td class="text-xs">${ctx.esc(s.why)}</td>
    <td>${added.includes(i) ? ctx.esc(ctx.t('ai_state_confirmed')) : btn('add-source', ctx.t('ai_sug_add'), ctx, 'btn-outline', `data-n="${i}"`)}</td></tr>`).join('');
  return `${head(ctx.t('ai_fn_source_suggest'), ctx)}
    ${res.suggestions.length ? `<div class="table-scroll"><table class="data-table text-xs"><tbody>${rows}</tbody></table></div>` : `<p>${ctx.esc(ctx.t('ai_sug_none'))}</p>`}
    ${rejectedHTML(res.rejected, ctx)}${actions(btn('menu', ctx.t('ai_back'), ctx, 'btn-ghost') + btn('close', ctx.t('ai_close'), ctx, 'btn-ghost'))}`;
}

const stateCell = (st, act, n, ctx) => (st === 'confirmed' || st === 'rejected'
  ? `<span data-ai-state="${st}">${ctx.esc(ctx.t('ai_state_' + st))}</span>`
  : `<span data-ai-state="pending" class="text-muted">${ctx.esc(ctx.t('ai_state_pending'))}</span> ${btn(act + '-ok', ctx.t('ai_confirm'), ctx, 'btn-outline', `data-n="${ctx.esc(n)}"`)} ${btn(act + '-no', ctx.t('ai_reject'), ctx, 'btn-ghost', `data-n="${ctx.esc(n)}"`)}`);

/** a) shablon qoralamasi: har bir SON alohida tasdiqlanadi (manba parchasi bilan) */
export function reviewTemplateHTML(res, decisions, ctx) {
  const d = decisions.numbers || {};
  const rows = res.numbers.map(n => `<tr data-ai-number="${ctx.esc(n.id)}"><td>${badge(ctx)}</td><td class="mono">${ctx.esc(n.input)} / ${ctx.esc(n.source)}</td><td>${ctx.esc(ctx.t('ai_f_' + n.field))}</td><td class="mono">${ctx.esc(num(n.value))}</td>
    <td class="text-xs">${ctx.esc(ctx.t('ai_quote'))}: «${ctx.esc(n.quote)}»${n.section ? ` (${ctx.esc(ctx.t('ai_section'))}: ${ctx.esc(n.section)})` : ''}</td><td>${stateCell(d[n.id], 'num', n.id, ctx)}</td></tr>`).join('');
  const t = res.template;
  return `${head(ctx.t('ai_fn_template_draft'), ctx)}
    <p>${badge(ctx)} <span class="mono">${ctx.esc(t.id)}</span> — <span class="mono">${ctx.esc(t.model.formula)}</span> <span class="tpl-badge tpl-st-draft">${ctx.esc(ctx.t('tpl_status_AI_DRAFT'))}</span></p>
    <p class="text-xs text-muted">${ctx.esc(ctx.t('ai_tpl_note'))}</p>
    <div class="tpl-ed-sub">${ctx.esc(ctx.t('ai_numbers_title'))}</div>
    ${res.numbers.length ? `<div class="table-scroll"><table class="data-table text-xs"><tbody>${rows}</tbody></table></div>` : `<p class="text-xs">${ctx.esc(ctx.t('ai_numbers_none'))}</p>`}
    ${res.notes ? `<p class="text-xs">${ctx.esc(res.notes)}</p>` : ''}${rejectedHTML(res.rejected, ctx)}<div id="ai-msg"></div>
    ${actions(btn('save-template', ctx.t('ai_save_draft'), ctx, 'btn-primary') + btn('menu', ctx.t('ai_back'), ctx, 'btn-ghost'))}`;
}

/** b) sertifikat: maydonlar alohida, nuqtalar — "qatorni tasdiqlash" (egasi qarori S-5 b) */
export function reviewCertificateHTML(res, decisions, standards, ctx) {
  const df = decisions.fields || {}, dr = decisions.rows || {};
  const fields = CERT_FIELD_ORDER.filter(f => res.fields[f]).map(f => {
    const v = res.fields[f];
    return `<tr data-ai-field="${f}"><td>${badge(ctx)}</td><td>${ctx.esc(ctx.t('ai_f_' + f))}</td><td class="mono">${ctx.esc(v.value)}</td>
      <td class="text-xs">${v.quote ? `${ctx.esc(ctx.t('ai_quote'))}: «${ctx.esc(v.quote)}»` : ''}${v.page ? ` (${ctx.esc(ctx.t('ai_page'))}: ${ctx.esc(v.page)})` : ''}</td><td>${stateCell(df[f], 'field', f, ctx)}</td></tr>`;
  }).join('') + (res.route ? `<tr data-ai-field="route"><td>${badge(ctx)}</td><td>${ctx.esc(ctx.t('ai_f_route'))}</td><td class="mono">${ctx.esc(res.route)}</td><td></td><td>${stateCell(df.route, 'field', 'route', ctx)}</td></tr>` : '');
  const points = res.points.map((p, i) => `<tr data-ai-row="${i}"><td>${badge(ctx)}</td><td class="mono">${ctx.esc(num(p.x))}</td><td class="mono">${ctx.esc(num(p.correction))}</td><td class="mono">${ctx.esc(num(p.U))}</td><td class="mono">${ctx.esc(num(p.k))}</td>
    <td class="text-xs">${p.quote ? `«${ctx.esc(p.quote)}»` : ''}${p.page ? ` (${ctx.esc(ctx.t('ai_page'))}: ${ctx.esc(p.page)})` : ''}</td>
    <td>${dr[i] === 'confirmed' || dr[i] === 'rejected' ? `<span data-ai-state="${dr[i]}">${ctx.esc(ctx.t('ai_state_' + dr[i]))}</span>`
      : `<span data-ai-state="pending" class="text-muted">${ctx.esc(ctx.t('ai_state_pending'))}</span> ${btn('row-ok', ctx.t('ai_confirm_row'), ctx, 'btn-outline', `data-n="${i}"`)} ${btn('row-no', ctx.t('ai_reject'), ctx, 'btn-ghost', `data-n="${i}"`)}`}</td></tr>`).join('');
  return `${head(ctx.t('ai_fn_certificate_extract'), ctx)}
    ${res.evidenceChecked ? '' : `<div class="warn-box" data-ai-not-verified="1">⚠ ${ctx.esc(ctx.t('ai_not_verified'))}</div>`}
    <div class="tpl-ed-sub">${ctx.esc(ctx.t('ai_cert_fields'))}</div>
    <div class="table-scroll"><table class="data-table text-xs"><tbody>${fields}</tbody></table></div>
    <div class="tpl-ed-sub">${ctx.esc(ctx.t('ai_cert_points'))}${res.unit ? ` (${ctx.esc(res.unit)})` : ''}</div>
    <div class="table-scroll"><table class="data-table text-xs"><thead><tr><th></th>${['x', 'corr', 'U', 'k'].map(c => `<th>${ctx.esc(ctx.t('ai_col_' + c))}</th>`).join('')}<th>${ctx.esc(ctx.t('ai_quote'))}</th><th></th></tr></thead><tbody>${points}</tbody></table></div>
    ${rejectedHTML(res.rejected, ctx)}
    <div class="tpl-ed-row">
      <label>${ctx.esc(ctx.t('ai_cert_target'))}<select id="ai-target"><option value="">${ctx.esc(ctx.t('ai_cert_new'))}</option>${(standards || []).map(s => `<option value="${ctx.esc(s.id)}">${ctx.esc(s.name || s.id)}</option>`).join('')}</select></label>
      <label>${ctx.esc(ctx.t('ai_cert_name'))}<input type="text" id="ai-std-name" autocomplete="off" /></label>
    </div><div id="ai-msg"></div>
    ${actions(btn('save-certificate', ctx.t('ai_cert_save'), ctx, 'btn-primary') + btn('menu', ctx.t('ai_back'), ctx, 'btn-ghost'))}`;
}
