/* ═══════════════════════════════════════════════════════════════
   REPORT.JS — natijalar sahifasi va chop etish kontrolleri (DOM qatlami).
   P05b: hisobot bo'limlari (HTML quruvchilar) src/report/sections.js ga, hisobot shakllari src/report/forms.js ga
   ko'chirildi (sof modullar, Node'da test qilinadi). Bu faylda faqat DOM bilan ishlash qoldi: ekranga chizish,
   tugmalar, Monte-Karlo, ko'p nuqtali panel, chop etish oynasi. `window.Calc` (src/js/calc.js) orqali ulanadi.
═══════════════════════════════════════════════════════════════ */

const Results = (() => {

  /* Bo'limlar (src/report/sections.js) — birinchi murojaatda yaratiladi (Calc modul skripti keyinroq yuklanadi) */
  let _sections = null;
  function sec() {
    if (!_sections) {
      _sections = Calc.createSections({
        t: k => i18n.t(k), esc: escHtml,
        acceptances: scope => acceptancesOf(scope),
        canAccept: () => !!window.UCFindings,
        lab: () => (window.UCTemplates ? window.UCTemplates.labSettings() : null),
      });
    }
    return _sections;
  }
  function nuText(...a) { return sec().nuText(...a); }
  function statement(...a) { return sec().statement(...a); }
  function ilacNote(...a) { return sec().ilacNote(...a); }
  function confLabel(...a) { return sec().confLabel(...a); }
  function notesHtml(...a) { return sec().notesHtml(...a); }
  function findingsOf(...a) { return sec().findingsOf(...a); }
  function findingsHtml(...a) { return sec().findingsHtml(...a); }
  function statusOf(...a) { return sec().statusOf(...a); }
  function marksHtml(...a) { return sec().marksHtml(...a); }
  function officialMarksHtml(...a) { return sec().officialMarksHtml(...a); }
  function blockedBy(...a) { return sec().blockedBy(...a); }
  function confPending(...a) { return sec().confPending(...a); }
  function confLines(...a) { return sec().confLines(...a); }
  function mcLines(...a) { return sec().mcLines(...a); }
  function renderKPIs(...a) { return sec().renderKPIs(...a); }
  function renderInputs(...a) { return sec().renderInputs(...a); }
  function renderBudget(...a) { return sec().renderBudget(...a); }
  function renderCorrelation(...a) { return sec().renderCorrelation(...a); }
  function renderSteps(...a) { return sec().renderSteps(...a); }
  function renderVerify(...a) { return sec().renderVerify(...a); }
  function pointDetail(...a) { return sec().pointDetail(...a); }
  function summaryTable(...a) { return sec().summaryTable(...a); }
  function regressionSection(...a) { return sec().regressionSection(...a); }
  function topdownSection(...a) { return sec().topdownSection(...a); }
  function specialSection(...a) { return sec().specialSection(...a); }

  function init() {
    document.getElementById('btn-print').addEventListener('click', printReport);
    document.addEventListener('findingschange', e => { if (!e.detail || e.detail.scope === 'gum') render(); });
    if (window.UCFindings) window.UCFindings.register('gum', () => { const r = current(); return r ? findingsOf(r, appState.get()) : []; });
    appState.subscribe((changes) => {
      if (!changes || changes.combined !== undefined || changes.points !== undefined ||
          changes.summary !== undefined || changes.currentPoint !== undefined) {
        lastMC = null;
        render();
      }
    });
  }

  let lastMC = null;   // Monte Carlo result for the displayed calculation

  /* Result of an older app version has no budget — treat as not calculated */
  function current() {
    const comb = appState.get('combined');
    return comb && Array.isArray(comb.budget) && Array.isArray(comb.inputs) ? comb : null;
  }

  function acceptancesOf(scope) { return window.UCFindings ? window.UCFindings.acceptances(scope) : {}; }
  /** @param {{scope?:string, print?:boolean, acceptances?:object, spec?:object, legacy?:string, legacyOn?:string, showEmpty?:boolean}} o */
  function modelKindChooser() {
    const cur = (appState.get('settings') || {}).modelKind || 'unknown';
    const nominal = (appState.get('settings') || {}).nominal;
    return `<div class="model-kind-chooser" data-model-kind-chooser="1">
      <label>${escHtml(i18n.t('mk_choose'))}
        <select data-model-kind="1">
          ${['unknown', 'error', 'value'].map(k => `<option value="${k}" ${cur === k ? 'selected' : ''}>${escHtml(i18n.t('mk_' + k))}</option>`).join('')}
        </select></label>
      <label ${cur === 'value' ? '' : 'hidden'} data-model-nominal-box="1">${escHtml(i18n.t('mk_nominal'))}
        <input type="text" inputmode="decimal" class="mono" data-model-nominal="1" value="${escHtml(String(nominal ?? ''))}" autocomplete="off" /></label>
      <button type="button" class="btn btn-primary btn-sm" data-model-kind-apply="1">${escHtml(i18n.t('mk_apply'))}</button>
    </div>`;
  }

  /* k qaysi ν bilan va qaysi qoida bo'yicha olingani (GUM G.4.1 Note 1; CLAUDE.md: qoida hisobotda yoziladi) */
  /* ─── Points panel (multi-point calibration) ───── */
  function renderPoints() {
    const st = appState.get();
    const pts = st.points || [];
    const cur = pts.find(p => p.id === st.currentPoint);
    const uniformK = !!(st.summary && st.summary.uniformK);
    const rows = Points.summary(pts, uniformK);
    const anyConf = rows.some(x => x.conf && x.conf.mpe > 0);
    const anyGamma = rows.some(x => x.r.gamma !== null && x.r.gamma !== undefined);

    return `
      <div class="model-card points-card">
        <div class="model-card-title">${i18n.t('pt_title')}
          <span class="text-muted text-xs">${cur ? i18n.t('pt_editing') + ': ' + escHtml(cur.label) : i18n.t('pt_new_hint')}</span>
        </div>
        <div class="points-actions">
          <input type="text" id="pt-label" value="${escHtml(cur ? cur.label : '')}" placeholder="${escHtml(i18n.t('pt_label_ph'))}" autocomplete="off" />
          <button class="btn btn-primary btn-sm" id="btn-pt-save" ${current() ? '' : 'disabled'}>${i18n.t(cur ? 'pt_update' : 'pt_save')}</button>
          <button class="btn btn-outline btn-sm" id="btn-pt-new">${i18n.t('pt_new')}</button>
        </div>
        ${rows.length ? `
        <div class="table-scroll" style="padding:0;margin-top:.7rem">
          <table class="data-table math-head">
            <thead><tr>
              <th>${i18n.t('pt_col')}</th>
              <th class="cell-num">${escHtml(rows[0].r.symbol)}</th>
              <th class="cell-num">U</th>
              <th class="cell-num">k</th>
              <th class="cell-num">ν_eff</th>
              ${anyGamma ? '<th class="cell-num">γ, %</th>' : ''}
              ${anyConf ? `<th class="cell-num">MPE</th><th>${i18n.t('conf_guarded')}</th>` : ''}
              <th></th>
            </tr></thead>
            <tbody>
              ${rows.map(x => `<tr class="${x.id === st.currentPoint ? 'row-active' : ''}">
                <td><strong>${escHtml(x.label)}</strong></td>
                <td class="cell-num mono">${x.rr.yround.toFixed(x.rr.digits)}</td>
                <td class="cell-num mono">${x.rr.Uround.toFixed(x.rr.digits)}</td>
                <td class="cell-num mono">${x.k.toFixed(2)}</td>
                <td class="cell-num mono">${nuText(x.r.nuEff)}</td>
                ${anyGamma ? `<td class="cell-num mono">${x.r.gamma !== null && x.r.gamma !== undefined ? x.r.gamma.toFixed(3) : '—'}</td>` : ''}
                ${anyConf ? `<td class="cell-num mono">${x.conf && x.conf.mpe > 0 ? Calc.fmtSci(x.conf.mpe, 3) : '—'}</td>
                  <td>${x.conf ? (x.conf.pending ? `<span class="badge badge-orange" data-conf-pending="1">${escHtml(i18n.t('mk_pending_short'))}</span>` : confLabel(x.conf.guarded, true)) : '—'}</td>` : ''}
                <td style="white-space:nowrap">
                  <button class="btn btn-ghost btn-sm" data-pt-load="${x.id}">${i18n.t('pt_open')}</button>
                  <button class="btn btn-ghost btn-sm" data-pt-del="${x.id}" title="${escHtml(i18n.t('pt_delete'))}">✕</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <label class="model-check">
          <input type="checkbox" id="pt-uniform-k" ${uniformK ? 'checked' : ''} />
          <span>${i18n.t('pt_uniform_k')}</span>
        </label>` : ''}
      </div>`;
  }

  function bindPoints(el) {
    const btnSave = el.querySelector('#btn-pt-save');
    if (btnSave) btnSave.addEventListener('click', () => {
      const res = Points.save(el.querySelector('#pt-label').value);
      if (res && res.error) showToast(i18n.t('toast_need_data'), 'error');
      else showToast(i18n.t('pt_saved'), 'success');
    });
    const btnNew = el.querySelector('#btn-pt-new');
    if (btnNew) btnNew.addEventListener('click', () => { Points.startNew(); switchTab('data'); });
    el.querySelectorAll('[data-pt-load]').forEach(b => b.addEventListener('click', () => Points.load(b.dataset.ptLoad)));
    el.querySelectorAll('[data-pt-del]').forEach(b => b.addEventListener('click', () => {
      if (confirm(i18n.t('pt_confirm_delete'))) Points.remove(b.dataset.ptDel);
    }));
    const uk = el.querySelector('#pt-uniform-k');
    if (uk) uk.addEventListener('change', () => appState.set({ summary: { ...(appState.get('summary') || {}), uniformK: uk.checked } }));
  }

  function render() {
    const el = document.getElementById('results-content');
    if (!el) return;
    const r = current();
    const pts = appState.get('points') || [];

    if (!r) {
      el.innerHTML = (pts.length ? renderPoints() : '') + `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <p>${i18n.t('results_empty')}</p>
        </div>`;
      bindPoints(el);
      return;
    }

    el.innerHTML = `
      ${renderPoints()}
      <div class="result-statement">
        <div class="result-statement-label">${i18n.t('res_statement')}</div>
        <div class="result-statement-value mono">${statement(r)}</div>
        <div class="text-xs text-muted" style="margin-top:.45rem">${ilacNote(r)}</div>
      </div>
      ${templateNotice()}
      ${findingsHtml(r, { scope: 'gum', spec: appState.get(), showEmpty: true })}
      ${notesHtml(r)}
      ${marksHtml(r, { mc: lastMC && !lastMC.error ? lastMC : null })}
      ${renderKPIs(r)}
      ${renderConformity(r)}
      ${renderInputs(r)}
      ${renderBudget(r)}
      ${renderCorrelation(r)}
      ${renderSteps(r)}
      ${renderVerify(r)}
      ${renderMC(r)}
    `;
    bindPoints(el);
    bindModelKind(el);
    const mcBtn = el.querySelector('#btn-mc');
    if (mcBtn) mcBtn.addEventListener('click', () => {
      mcBtn.disabled = true;
      mcBtn.textContent = i18n.t('mc_running');
      setTimeout(() => {
        const M = Number(el.querySelector('#mc-m').value) || 200000;
        const st = appState.get();
        // P04b: MC tanlangan chegara (r = 0 yoki r = 1) holatida
        lastMC = Calc.monteCarlo(st.template && window.UCTemplates ? window.UCTemplates.evaluateState(st).state : st, M);
        render();
      }, 30);
    });
  }

  /* Muvofiqlik (RISKS R-07, P05a): |y| xato deb FARAZ QILINMAYDI. Og'ish model turiga ko'ra:
     'error' — E (natijaning o'zi), 'value' — Y − Y_nom. Model turi ko'rsatilmagan (yoki eski saqlangan natija —
     modelKind maydoni yo'q) bo'lsa bayonot berilmaydi va foydalanuvchidan tanlov so'raladi. */
  function renderConformity(r) {
    const lines = confLines(r);
    if (!lines.length) return '';
    return `
      <div class="section-title">${i18n.t('conf_title')}</div>
      ${lines.map(l => `<div class="formula-box">${l}</div>`).join('')}
      ${confPending(r) ? modelKindChooser() : ''}`;
  }

  /* Model turini natijalar sahifasidan tanlash (eski saqlangan hisoblar uchun so'raladi) → sozlamaga yoziladi va qayta hisoblanadi */
  function bindModelKind(el) {
    const box = el.querySelector('[data-model-kind-chooser]');
    if (!box) return;
    const sel = box.querySelector('[data-model-kind]'), nomBox = box.querySelector('[data-model-nominal-box]');
    sel.addEventListener('change', () => { nomBox.hidden = sel.value !== 'value'; });
    box.querySelector('[data-model-kind-apply]').addEventListener('click', () => {
      const settings = { ...(appState.get('settings') || {}), modelKind: sel.value };
      if (sel.value === 'value') settings.nominal = box.querySelector('[data-model-nominal]').value.trim().replace(',', '.');
      appState.set({ settings, combined: null });
      if (window.TypeB && window.TypeB.calculate) window.TypeB.calculate();
    });
  }

  function renderMC(r) {
    const mc = lastMC && !lastMC.error ? lastMC : null;
    return `
      <div class="section-title">${i18n.t('mc_title')}</div>
      <div class="mc-row">
        <select id="mc-m">
          <option value="100000">M = 10⁵</option>
          <option value="200000" selected>M = 2·10⁵</option>
          <option value="1000000">M = 10⁶</option>
        </select>
        <button class="btn btn-outline btn-sm" id="btn-mc">${i18n.t('mc_run')}</button>
        <span class="text-muted text-xs">${i18n.t('mc_hint')}</span>
      </div>
      ${mc ? mcLines(r, mc).map(l => `<div class="formula-box">${l}</div>`).join('') +
        (mc.correlated ? `<div class="text-xs text-muted">⚠ ${i18n.t('mc_corr_note')}</div>` : '') +
        (!mc.validated ? `<div class="text-xs text-muted">${i18n.t('mc_advice')}</div>` : '') : ''}`;
  }

  function templateNotice() {
    const meta = appState.get('template');
    return meta && window.UCTemplates ? window.UCTemplates.reportNoticeHTML(meta, current()) : '';
  }

  /* P08: regressiya yorlig'ida hisob bajarilgan bo'lsa, u umumiy hisobotga alohida sahifa bo'lib qo'shiladi */
  function regressionAppendix() {
    const rg = window.UCRegression && window.UCRegression.current();
    if (!rg || !rg.result || rg.result.error) return '';
    return `<div class="print-page-break"></div>${regressionSection(rg.result, { print: true, plots: rg.plots, residualTable: true })}`;
  }

  function printReport() {
    const state = appState.get();
    const r     = current();
    const pts   = (state.points || []).filter(p => p.result && !p.result.error);

    if (!r && !pts.length) {
      showToast(i18n.t('results_empty'), 'error');
      return;
    }
    // P05a (RISKS R-05): U = 0, u_c = 0, U < CMC — hisobot yo bloklanadi (laboratoriya sozlamasi criticalMode / cmcMode
    // = 'block'), yo aniq belgi bilan chiqadi (standart). Qabul qilinmagan `error` bo'lsa — "RASMIY EMAS" suv belgisi.
    const statuses = pts.length
      ? pts.map(p => statusOf(p.result, { spec: p.snapshot, acceptances: p.acceptances || {} }))
      : [statusOf(r, { spec: state })];
    const block = blockedBy(statuses);
    if (block) {
      showToast(i18n.t(block === 'zero_u' ? 'fnd_blocked_zero_u' : 'cmc_blocked'), 'error', 6000);
      return;
    }

    const now     = new Date().toLocaleDateString();
    const printEl = document.getElementById('print-report');
    const uniformK = !!(state.summary && state.summary.uniformK);
    const rows = Points.summary(pts, uniformK);

    let body;
    if (rows.length) {
      body = `
        <div class="print-section">${i18n.t('pt_summary')}</div>
        ${summaryTable(rows)}
        ${uniformK ? `<p style="font-size:9pt">${i18n.t('pt_uniform_k')}</p>` : ''}
        <p style="font-size:9pt">${ilacNote(rows[0].r)}</p>
        ${rows.map(x => { const pt = pts.find(p => p.id === x.id); return `<div class="print-page-break"></div>` +
          pointDetail(x.r, pt.snapshot, x.label, x.rr, x.k, { acceptances: pt.acceptances || {}, conf: x.conf }); }).join('')}`;
    } else {
      body = pointDetail(r, Points.snapshot(state), '', null, undefined, { mc: lastMC && !lastMC.error ? lastMC : null });
    }

    printEl.innerHTML = `
      <div class="print-report-header">
        <div>
          <div class="print-report-title">${i18n.t('report_title')}</div>
          <div class="print-report-meta">${i18n.t('report_standard')}</div>
        </div>
        <div style="text-align:right;font-size:9pt;color:#555">
          <div>${i18n.t('report_date')}: ${now}</div>
          <div>${i18n.t('report_lab')}: _______________________</div>
          <div>${i18n.t('report_operator')}: ____________________</div>
        </div>
      </div>
      ${officialMarksHtml(statuses)}
      ${templateNotice()}
      ${body}
      ${regressionAppendix()}
      <div class="print-footer">
        <span>${i18n.t('report_standard')}</span>
        <span>${i18n.t('report_date')}: ${now}</span>
        <span>UncertaintyCalc</span>
      </div>
    `;

    document.body.classList.add('print-report-mode');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-report-mode'), { once: true });
    window.print();
  }

  function printRegression(r, o) {
    const opt = o || {};
    if (!r || r.error) { showToast(i18n.t('rg_empty'), 'error'); return; }
    const blk = blockedBy([statusOf(r, { scope: 'regression' })]);
    if (blk) { showToast(i18n.t(blk === 'zero_u' ? 'fnd_blocked_zero_u' : 'cmc_blocked'), 'error', 6000); return; }
    const now = new Date().toLocaleDateString();
    const notice = opt.meta && window.UCTemplates ? window.UCTemplates.reportNoticeHTML(opt.meta, r) : '';
    document.getElementById('print-report').innerHTML = `
      <div class="print-report-header">
        <div>
          <div class="print-report-title">${i18n.t('report_title')}</div>
          <div class="print-report-meta">${i18n.t('report_standard')}</div>
        </div>
        <div style="text-align:right;font-size:9pt;color:#555">
          <div>${i18n.t('report_date')}: ${now}</div>
          <div>${i18n.t('report_lab')}: _______________________</div>
          <div>${i18n.t('report_operator')}: ____________________</div>
        </div>
      </div>
      ${officialMarksHtml([statusOf(r, { scope: 'regression' })])}
      ${notice}
      ${regressionSection(r, { print: true, plots: opt.plots, residualTable: true })}
      ${marksHtml(r)}
      <div class="print-footer">
        <span>${i18n.t('report_standard')}</span>
        <span>${i18n.t('report_date')}: ${now}</span>
        <span>UncertaintyCalc</span>
      </div>`;
    document.body.classList.add('print-report-mode');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-report-mode'), { once: true });
    window.print();
  }

  function printTopdown(r, o) {
    const opt = o || {};
    if (!r || r.error) { showToast(i18n.t('td_empty'), 'error'); return; }
    const blk = blockedBy([statusOf(r, { scope: 'topdown' })]);
    if (blk) { showToast(i18n.t(blk === 'zero_u' ? 'fnd_blocked_zero_u' : 'cmc_blocked'), 'error', 6000); return; }
    const now = new Date().toLocaleDateString();
    const notice = opt.meta && window.UCTemplates ? window.UCTemplates.reportNoticeHTML(opt.meta, r) : '';
    document.getElementById('print-report').innerHTML = `
      <div class="print-report-header">
        <div>
          <div class="print-report-title">${i18n.t('report_title')}</div>
          <div class="print-report-meta">${i18n.t('td_report_standard')}</div>
        </div>
        <div style="text-align:right;font-size:9pt;color:#555">
          <div>${i18n.t('report_date')}: ${now}</div>
          <div>${i18n.t('report_lab')}: _______________________</div>
          <div>${i18n.t('report_operator')}: ____________________</div>
        </div>
      </div>
      ${officialMarksHtml([statusOf(r, { scope: 'topdown' })])}
      ${notice}
      ${topdownSection(r, { print: true })}
      ${marksHtml(r)}
      <div class="print-footer">
        <span>${i18n.t('td_report_standard')}</span>
        <span>${i18n.t('report_date')}: ${now}</span>
        <span>UncertaintyCalc</span>
      </div>`;
    document.body.classList.add('print-report-mode');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-report-mode'), { once: true });
    window.print();
  }

  function printSpecial(r, o) {
    const opt = o || {};
    if (!r || r.error) { showToast(i18n.t('sp_empty'), 'error'); return; }
    const blk = blockedBy([statusOf(r, { scope: 'special' })]);
    if (blk) { showToast(i18n.t(blk === 'zero_u' ? 'fnd_blocked_zero_u' : 'cmc_blocked'), 'error', 6000); return; }
    const now = new Date().toLocaleDateString();
    const notice = opt.meta && window.UCTemplates ? window.UCTemplates.reportNoticeHTML(opt.meta, r) : '';
    document.getElementById('print-report').innerHTML = `
      <div class="print-report-header">
        <div>
          <div class="print-report-title">${i18n.t('report_title')}</div>
          <div class="print-report-meta">${escHtml(r.approachRef)}</div>
        </div>
        <div style="text-align:right;font-size:9pt;color:#555">
          <div>${i18n.t('report_date')}: ${now}</div>
          <div>${i18n.t('report_lab')}: _______________________</div>
          <div>${i18n.t('report_operator')}: ____________________</div>
        </div>
      </div>
      ${officialMarksHtml([statusOf(r, { scope: 'special' })])}
      ${notice}
      ${specialSection(r, { print: true })}
      ${marksHtml(r)}
      <div class="print-footer">
        <span>${escHtml(r.approachRef)}</span>
        <span>${i18n.t('report_date')}: ${now}</span>
        <span>UncertaintyCalc</span>
      </div>`;
    document.body.classList.add('print-report-mode');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-report-mode'), { once: true });
    window.print();
  }

  const escHtml = window.escHtml;

  return { init, render, regressionSection, printRegression, topdownSection, printTopdown, specialSection, printSpecial, findingsOf, findingsHtml, statusOf };


})();

window.Results = Results;
