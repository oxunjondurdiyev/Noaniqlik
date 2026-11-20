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
    // P16: yuqori paneldagi "Hisobot" — avval A4 ko'rinishi ("Hisobot" qadami); chop etish o'sha yerdan. Qobiq yo'q bo'lsa — to'g'ridan-to'g'ri.
    document.getElementById('btn-print').addEventListener('click', () => {
      if (document.getElementById('report-root') && typeof window.switchTab === 'function') window.switchTab('report'); else printReport();
    });
    document.addEventListener('tabchange', e => { if (e.detail && e.detail.tab === 'report') renderReportTab(); });
    document.addEventListener('langchange', () => { if (reportTabActive()) renderReportTab(); });
    // rekvizitlar saqlanganda yoki shakl boshqa joydan o'zgarganda ko'rinish yangilanadi
    document.addEventListener('click', e => { if (reportTabActive() && e.target.closest && e.target.closest('[data-req-save]')) setTimeout(renderReportTab, 0); });
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

  /* P07: vektor natija (bir nechta chiqish) */
  function currentMulti() {
    const comb = appState.get('combined');
    return comb && comb.mode === 'MULTIVARIATE' && Array.isArray(comb.results) ? comb : null;
  }

  function acceptancesOf(scope) { return window.UCFindings ? window.UCFindings.acceptances(scope) : {}; }
  /** @param {{scope?:string, print?:boolean, acceptances?:object, spec?:object, legacy?:string, legacyOn?:string, showEmpty?:boolean}} o */
  /* P05b: qaror qoidasi tanlanmagan bo'lsa — natijalar sahifasidan tanlash (sozlamaga yoziladi va qayta hisoblanadi) */
  /* Egasi qarori (2026-11-18): shablon / laboratoriya sozlamasidagi qoida oldindan QO'YILADI, lekin sozlamaga faqat
     foydalanuvchi "tasdiqlash" ni bosgach yoziladi — tasdiqlanmasa bayonot chiqmaydi. */
  function decisionPresetNow() {
    const tpl = appState.get('template');
    const lab = window.UCTemplates && window.UCTemplates.labSettings ? window.UCTemplates.labSettings() : null;
    return Calc.decisionPreset ? Calc.decisionPreset({ template: tpl && tpl.decisionRule, lab: lab && lab.decisionRule }) : null;
  }
  function decisionChooser() {
    const st = appState.get('settings') || {};
    const pre = decisionPresetNow();
    const rule = pre ? pre.rule : 'guard_band';
    const r = st.guardR !== undefined && st.guardR !== null && st.guardR !== '' ? st.guardR : (pre && pre.rule === 'guard_band' ? pre.r : '1');
    return `<div class="model-kind-chooser" data-decision-chooser="1"${pre ? ` data-decision-preset="${escHtml(pre.source)}"` : ''}>
      ${pre ? `<div class="text-sm" data-decision-preset-note="1">⚖ ${escHtml(i18n.t(pre.source === 'template' ? 'dr_preset_template' : 'dr_preset_lab'))}</div>` : ''}
      <label>${escHtml(i18n.t('dr_choose'))}
        <select data-decision-rule-select="1">
          <option value="simple" ${rule === 'simple' ? 'selected' : ''}>${escHtml(i18n.t('set_decision_simple'))}</option>
          <option value="guard_band" ${rule === 'guard_band' ? 'selected' : ''}>${escHtml(i18n.t('set_decision_guard'))}</option>
        </select></label>
      <label>${escHtml(i18n.t('set_guard_r'))}
        <input type="text" inputmode="decimal" class="mono" data-decision-r="1" value="${escHtml(String(r))}" autocomplete="off" /></label>
      <label>${escHtml(i18n.t('set_agreement'))}
        <input type="text" maxlength="200" data-decision-agreement="1" value="${escHtml(String(st.agreement ?? ''))}" autocomplete="off" /></label>
      <button type="button" class="btn btn-primary btn-sm" data-decision-apply="1">${escHtml(i18n.t(pre ? 'dr_confirm' : 'dr_apply'))}</button>
    </div>`;
  }
  function bindDecision(el) {
    const box = el.querySelector('[data-decision-chooser]');
    if (!box) return;
    box.querySelector('[data-decision-apply]').addEventListener('click', () => {
      const rule = box.querySelector('[data-decision-rule-select]').value;
      const settings = { ...(appState.get('settings') || {}), decisionRule: rule,
        guardR: box.querySelector('[data-decision-r]').value.trim().replace(',', '.'), agreement: box.querySelector('[data-decision-agreement]').value.trim() };
      const pre = decisionPresetNow();   // shablondagi bir tomonlama chegara (son bo'lsa) — faqat chegara hali kiritilmagan bo'lsa
      for (const k of ['tolLower', 'tolUpper']) if (pre && pre[k] !== undefined && (settings[k] === undefined || settings[k] === null || settings[k] === '')) settings[k] = pre[k];
      appState.set({ settings, combined: null });
      if (window.TypeB && window.TypeB.calculate) window.TypeB.calculate();
    });
  }

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
        <div class="table-scroll u-mt">
          <table class="data-table math-head">
            <thead><tr>
              <th>${i18n.t('pt_col')}</th>
              <th class="cell-num">${escHtml(rows[0].r.symbol)}</th>
              <th class="cell-num">U</th>
              <th class="cell-num">k</th>
              <th class="cell-num">ν_eff</th>
              ${anyGamma ? '<th class="cell-num">γ, %</th>' : ''}
              ${anyConf ? `<th class="cell-num">MPE</th><th>${i18n.t('dr_col')}</th>` : ''}
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
                  <td>${x.conf && x.conf.pending ? `<span class="badge badge-orange" data-conf-pending="1">${escHtml(i18n.t('mk_pending_short'))}</span>` : sec().decisionCell(x.r, x.decision)}</td>` : ''}
                <td class="u-nowrap">
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

  /* P07b: ko'p chiqish + ko'p nuqta. Egasi qarori (2026-11-19): yagona k yo'q (belgilash katagi ko'rsatilmaydi); har bir
     chiqishning U si o'z k si bilan; birgalikdagi qamrov — faqat nuqtaning qamrov sohasi (k_p); har bir nuqta alohida. */
  function vectorPoints() { return (appState.get('points') || []).filter(p => Calc.isVectorResult(p.result)); }
  function renderVectorPoints() {
    const st = appState.get();
    const cur = (st.points || []).find(p => p.id === st.currentPoint);
    const rows = Calc.vectorSummaryRows(st.points || []);
    return `
      <div class="model-card points-card" data-vector-points="1">
        <div class="model-card-title">${i18n.t('pt_title')}
          <span class="text-muted text-xs">${cur ? i18n.t('pt_editing') + ': ' + escHtml(cur.label) : i18n.t('pt_new_hint')}</span>
        </div>
        <div class="points-actions">
          <input type="text" id="pt-label" value="${escHtml(cur ? cur.label : '')}" placeholder="${escHtml(i18n.t('pt_label_ph'))}" autocomplete="off" />
          <button class="btn btn-primary btn-sm" id="btn-pt-save" ${currentMulti() ? '' : 'disabled'}>${i18n.t(cur ? 'pt_update' : 'pt_save')}</button>
          <button class="btn btn-outline btn-sm" id="btn-pt-new">${i18n.t('pt_new')}</button>
        </div>
        ${rows.length ? `
        <div class="table-scroll u-mt">${sec().vectorSummaryTable(rows, 'data-table math-head')}</div>
        <div class="points-actions u-mt">${rows.map(x => `<span class="u-nowrap">
          <button class="btn btn-ghost btn-sm" data-pt-load="${escHtml(x.id)}">${i18n.t('pt_open')}: ${escHtml(x.label)}</button><button class="btn btn-ghost btn-sm" data-pt-del="${escHtml(x.id)}" title="${escHtml(i18n.t('pt_delete'))}">✕</button></span>`).join('')}</div>
        <p class="text-xs text-muted" data-vector-note="1">${escHtml(i18n.t('pt_vector_note'))}</p>` : ''}
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
    const mv = currentMulti();
    if (mv) {
      el.innerHTML = `
        <div class="page-header-row">
          <button class="btn btn-outline btn-sm" id="btn-print-mv">${i18n.t('btn_report')}</button>
        </div>
        ${renderVectorPoints()}
        ${sec().multivariateSection(mv, { mc: lastMC && !lastMC.error ? lastMC : null })}
        ${renderMC(mv)}`;
      const pb = el.querySelector('#btn-print-mv');
      if (pb) pb.addEventListener('click', () => { printReport(); });
      bindPoints(el);
      bindMC(el);
      return;
    }
    const r = current();
    const pts = appState.get('points') || [];

    if (!r) {
      const vector = vectorPoints().length > 0;            // P07b: vektor nuqtalar saqlangan — yangi nuqta kiritilmoqda
      el.innerHTML = (vector ? `<div class="page-header-row"><button class="btn btn-outline btn-sm" id="btn-print-mv">${i18n.t('btn_report')}</button></div>` + renderVectorPoints()
        : (pts.length ? renderPoints() : '')) + `
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

    const mc = lastMC && !lastMC.error ? lastMC : null;
    const seg = (view, key) => `<button type="button" role="tab" class="seg-btn${budgetView === view ? ' active' : ''}" data-budget-view="${view}" aria-selected="${budgetView === view}">${escHtml(i18n.t(key))}</button>`;
    // P16: asosiy natija kartasi + tasma, KPI plitkalari, byudjet (Jadval / Pareto), o'ng panel (topilmalar, sozlamalar, MCM)
    el.innerHTML = `
      ${renderPoints()}
      <div class="results-layout">
        <div class="results-main">
          ${sec().heroCard(r, { mc })}
          ${templateNotice()}
          ${notesHtml(r)}
          ${sec().kpiTiles(r)}
          ${renderConformity(r)}
          <div class="seg" role="tablist" aria-label="${escHtml(i18n.t('rs_views'))}" data-budget-seg="1">${seg('table', 'rs_view_table')}${seg('pareto', 'rs_view_pareto')}</div>
          <div data-budget-panel="table"${budgetView === 'table' ? '' : ' hidden'}>${renderBudget(r)}</div>
          <div data-budget-panel="pareto"${budgetView === 'pareto' ? '' : ' hidden'}>
            <div class="section-title">${i18n.t('results_title')}</div>
            <div class="budget-table-wrap">${sec().budgetPareto(r)}</div>
          </div>
          ${renderInputs(r)}
          <details class="results-details">
            <summary>${escHtml(i18n.t('rs_details'))}</summary>
            ${renderCorrelation(r)}
            ${renderSteps(r)}
            ${renderVerify(r)}
          </details>
        </div>
        <aside class="results-side" aria-label="${escHtml(i18n.t('rs_side'))}">
          <div class="side-card" data-side="findings">${findingsHtml(r, { scope: 'gum', spec: appState.get(), showEmpty: true })}</div>
          <div class="side-card" data-side="settings">
            <div class="section-title">${escHtml(i18n.t('rs_side_settings'))}</div>
            ${marksHtml(r, { mc })}
            <button type="button" class="btn btn-outline btn-sm" data-goto-settings="1">${escHtml(i18n.t('rs_edit_settings'))}</button>
          </div>
          <div class="side-card" data-side="mc">${renderMC(r)}</div>
        </aside>
      </div>
    `;
    bindPoints(el);
    bindModelKind(el);
    bindDecision(el);
    bindMC(el);
    bindBudgetView(el);
  }

  /* P16: byudjet ko'rinishi (Jadval / Pareto) — faqat ko'rinish almashadi, qayta hisob yo'q */
  let budgetView = 'table';
  function bindBudgetView(el) {
    el.querySelectorAll('[data-budget-view]').forEach(b => b.addEventListener('click', () => {
      budgetView = b.dataset.budgetView;
      el.querySelectorAll('[data-budget-view]').forEach(x => { const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-selected', String(on)); });
      el.querySelectorAll('[data-budget-panel]').forEach(p => { p.hidden = p.dataset.budgetPanel !== budgetView; });
    }));
    const go = el.querySelector('[data-goto-settings]');
    if (go) go.addEventListener('click', () => { switchTab('typeb'); const s = document.getElementById('typeb-settings'); if (s && s.scrollIntoView) s.scrollIntoView({ block: 'start' }); });
  }

  /* ── Monte-Karlo paneli (P06) ─────────────────────────────────────
     Hisob Web Worker'da (window.UCMonteCarlo — src/ui/mc/); worker bo'lmasa asosiy oqimda bo'laklab. Progress va
     bekor qilish. Sozlamalar: rejim (adaptiv — standart / qat'iy M), n_dig, interval turi, urug' (R-06). */
  let mcUi = null;      // paneldagi tanlovlar (hisob sozlamasi settings.mc dan boshlanadi)
  let mcJob = null;     // { cancel, info } — bajarilayotgan hisob
  function mcDefaults() {
    // ustuvorlik: hisob sozlamasi (settings.mc) → laboratoriya sozlamalari (mcMode, mcNDig, mcTolerance) → dvigatel standarti
    const L = window.UCTemplates && window.UCTemplates.labSettings ? (window.UCTemplates.labSettings() || {}) : {};
    const lab = { mode: L.mcMode, nDig: L.mcNDig, ...((appState.get('settings') || {}).mc || {}) };
    const d = (window.Calc && Calc.MC_DEFAULTS) || {};
    return {
      validation: lab.validation !== false, lowered: L.mcTolerance === 'delta',
      mode: lab.mode || d.mode || 'adaptive', M: Number(lab.M) || 1000000, nDig: Number(lab.nDig) || d.nDig || 2,
      interval: lab.interval || d.interval || 'shortest', seed: lab.seed !== undefined ? lab.seed : (d.seed !== undefined ? d.seed : Calc.MC_SEED),
      gaussian: lab.nonNormalCorrelation === 'gaussian',
    };
  }
  function mcOpts() {
    const u = mcUi || mcDefaults();
    const seed = /^\d+$/.test(String(u.seed).trim()) ? Number(String(u.seed).trim()) : u.seed;
    const o = { mode: u.mode, M: u.M, nDig: u.nDig, interval: u.interval, seed, nonNormalCorrelation: u.gaussian ? 'gaussian' : 'refuse', validation: u.validation !== false };
    // §8 tekshiruvi: standart δ/5 (JCGM 101 §8.2); δ ga tushirish — faqat laboratoriya sozlamasi (hisobotda belgilanadi)
    if (o.validation && u.lowered) o.tolDivisor = 1;
    return o;
  }
  function mcProgressText(info) {
    return info ? `M = ${Number(info.M).toLocaleString()}` + (info.expected ? ` / ≈ ${Number(info.expected).toLocaleString()}` : '') : '';
  }
  function bindMC(el) {
    const box = el.querySelector('[data-mc-panel]');
    if (!box) return;
    if (!mcUi) mcUi = mcDefaults();
    box.querySelectorAll('[data-mc-opt]').forEach(inp => inp.addEventListener('change', () => {
      const k = inp.dataset.mcOpt;
      mcUi[k] = inp.type === 'checkbox' ? inp.checked : (k === 'M' || k === 'nDig' ? Number(inp.value) : k === 'validation' ? inp.value !== 'mcm' : inp.value.trim());
      if (k === 'mode') box.querySelector('[data-mc-opt="M"]').disabled = mcUi.mode !== 'fixed';
    }));
    const runBtn = box.querySelector('#btn-mc'), cancelBtn = box.querySelector('[data-mc-cancel]');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { if (mcJob) mcJob.cancel(); });
    if (runBtn) runBtn.addEventListener('click', () => {
      if (mcJob) return;
      const st = appState.get();
      // P04b: MC tanlangan chegara (r = 0 yoki r = 1) holatida
      const spec = st.template && window.UCTemplates ? window.UCTemplates.evaluateState(st).state : st;
      const opts = mcOpts();
      const done = res => {
        mcJob = null;
        lastMC = res && res.error === 'mc_cancelled' ? null : res;
        if (res && res.error === 'mc_cancelled') showToast(i18n.t('mc_cancelled'), 'warning');
        render();
      };
      if (!window.UCMonteCarlo) {            // modul yuklanmagan (juda eski brauzer): bir chaqiruvda
        runBtn.disabled = true;
        runBtn.textContent = i18n.t('mc_running');
        setTimeout(() => done(Calc.monteCarlo(spec, opts)), 30);
        return;
      }
      const onProgress = info => {
        if (!mcJob) return;
        mcJob.info = info;
        const bar = document.querySelector('[data-mc-progress]'), txt = document.querySelector('[data-mc-progress-text]');
        if (bar) bar.value = Math.round((info.progress || 0) * 100);
        if (txt) txt.textContent = mcProgressText(info);
      };
      const job = window.UCMonteCarlo.run(spec, opts, onProgress);
      mcJob = { cancel: job.cancel, info: null };
      job.promise.then(done);
      render();
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
      ${confPending(r) ? modelKindChooser() : ''}
      ${!confPending(r) && r.decision && r.decision.pending === 'rule' ? decisionChooser() : ''}`;
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

  function mcErrorText(mc) {
    const key = 'mc_err_' + mc.error;
    const txt = i18n.t(key);
    return (txt === key ? i18n.t('mc_err_failed') + ' (' + mc.error + ')' : txt) + (mc.detail ? ': «' + mc.detail + '»' : '');
  }

  function renderMC(r) {
    const mc = lastMC && !lastMC.error ? lastMC : null;
    const err = lastMC && lastMC.error ? lastMC : null;
    const u = mcUi || mcDefaults();
    const sel = (v, cur) => (String(v) === String(cur) ? 'selected' : '');
    const running = !!mcJob;
    return `
      <div class="section-title">${i18n.t(currentMulti() ? 'mc_title' : 'rs_mc_compare')}</div>
      <div class="mc-row" data-mc-panel="1">
        <select data-mc-opt="validation" title="${escHtml(i18n.t('mc_purpose'))}" ${running ? 'disabled' : ''}>
          <option value="validation" ${u.validation !== false ? 'selected' : ''}>${i18n.t(u.lowered ? 'mc_purpose_validation_delta' : 'mc_purpose_validation')}</option>
          <option value="mcm" ${u.validation === false ? 'selected' : ''}>${i18n.t('mc_purpose_mcm')}</option>
        </select>
        <select data-mc-opt="mode" title="${escHtml(i18n.t('mc_mode'))}" ${running ? 'disabled' : ''}>
          <option value="adaptive" ${sel('adaptive', u.mode)}>${i18n.t('mc_mode_adaptive')}</option>
          <option value="fixed" ${sel('fixed', u.mode)}>${i18n.t('mc_mode_fixed')}</option>
        </select>
        <select id="mc-m" data-mc-opt="M" ${u.mode !== 'fixed' || running ? 'disabled' : ''}>
          <option value="100000" ${sel(100000, u.M)}>M = 10⁵</option>
          <option value="200000" ${sel(200000, u.M)}>M = 2·10⁵</option>
          <option value="1000000" ${sel(1000000, u.M)}>M = 10⁶</option>
          <option value="10000000" ${sel(10000000, u.M)}>M = 10⁷</option>
        </select>
        <select data-mc-opt="nDig" title="${escHtml(i18n.t('mc_ndig_hint'))}" ${running ? 'disabled' : ''}>
          <option value="1" ${sel(1, u.nDig)}>n_dig = 1</option>
          <option value="2" ${sel(2, u.nDig)}>n_dig = 2</option>
        </select>
        <select data-mc-opt="interval" title="${escHtml(i18n.t('mc_interval_type'))}" ${running ? 'disabled' : ''}>
          <option value="shortest" ${sel('shortest', u.interval)}>${i18n.t('mc_int_shortest')}</option>
          <option value="symmetric" ${sel('symmetric', u.interval)}>${i18n.t('mc_int_symmetric')}</option>
        </select>
        <label class="text-xs">${i18n.t('mc_seed')} <input type="text" inputmode="numeric" data-mc-opt="seed" value="${escHtml(String(u.seed))}" class="mono mc-seed" autocomplete="off" ${running ? 'disabled' : ''} /></label>
        <button class="btn btn-outline btn-sm" id="btn-mc" ${running ? 'disabled' : ''}>${i18n.t(running ? 'mc_running' : 'mc_run')}</button>
        ${running ? `<button class="btn btn-outline btn-sm" data-mc-cancel="1">${i18n.t('mc_cancel')}</button>
          <progress data-mc-progress="1" max="100" value="${Math.round(((mcJob.info || {}).progress || 0) * 100)}"></progress>
          <span class="text-xs mono" data-mc-progress-text="1">${escHtml(mcProgressText(mcJob.info))}</span>` : ''}
      </div>
      <div class="mc-row">
        <label class="text-xs"><input type="checkbox" data-mc-opt="gaussian" ${u.gaussian ? 'checked' : ''} ${running ? 'disabled' : ''} /> ${i18n.t('mc_gauss_approx')}</label>
        <span class="text-muted text-xs">${i18n.t('mc_hint')}</span>
      </div>
      ${err ? `<div class="formula-box box-danger" data-mc-error="${escHtml(err.error)}">${escHtml(mcErrorText(err))}</div>${sec().mcFindingsHtml(err)}` : ''}
      ${mc && mc.multivariate ? '' : mc ? mcLines(r, mc).map(l => `<div class="formula-box">${l}</div>`).join('') +
        (mc.correlated ? `<div class="text-xs text-muted">${i18n.t('mc_corr_note')}</div>` : '') +
        sec().mcFindingsHtml(mc) +
        (mc.validated === false ? `<div class="text-xs text-muted">${i18n.t('mc_advice')}</div>` : '') : ''}`;
  }

  function templateNotice() {
    const meta = appState.get('template');
    return meta && window.UCTemplates ? window.UCTemplates.reportNoticeHTML(meta, current()) : '';
  }

  /* P08: regressiya yorlig'ida hisob bajarilgan bo'lsa, u umumiy hisobotga alohida sahifa bo'lib qo'shiladi */
  /* P14: AI izohi — FAQAT foydalanuvchi tanlasa, alohida ichki ilova sifatida, "rasmiy emas" belgisi bilan.
     AI moduli yuklanmagan bo'lsa (standart holat) — bo'sh. Hisob hujjati (uc-calc/1) va uning xeshiga kirmaydi. */
  function aiAppendix() { return window.UCAINote && typeof window.UCAINote.appendixHTML === 'function' ? window.UCAINote.appendixHTML() : ''; }

  function regressionAppendix() {
    const rg = window.UCRegression && window.UCRegression.current();
    if (!rg || !rg.result || rg.result.error) return '';
    return `<div class="print-page-break"></div>${regressionSection(rg.result, { print: true, plots: rg.plots, residualTable: true })}`;
  }

  /* ─── P05b: hisobot shakllari (src/report/forms.js) ────────────────
     Shakl turi va rekvizitlar — window.UCReport (src/ui/report/app.js; faqat brauzerda saqlanadi).
     Pastki qism: dastur, ENGINE_VERSION, build, shablon, hisob sanasi, kanonik JSON'dan SHA-256 va QR.
     Xesh JSON eksportdagi bilan BIR XIL bo'lishi uchun hujjatni window.UCIO.calcDoc(scope) quradi (bo'lsa). */
  function reportOptions() {
    return window.UCReport ? window.UCReport.options() : { form: Calc.DEFAULT_FORM, requisites: {} };
  }
  async function footerFor(scope, fallback) {
    try {
      let doc = window.UCIO && window.UCIO.calcDoc ? await window.UCIO.calcDoc(scope) : null;
      if (!doc) doc = await Calc.buildCalcDoc(fallback());
      const build = window.UCReport && window.UCReport.buildInfo ? await window.UCReport.buildInfo() : null;
      const env = window.UCBuild && doc.env ? window.UCBuild.environmentText(doc.env) : '';
      const model = Calc.footerModel({ engineVersion: doc.engineVersion, build, template: doc.template, meta: { id: doc.id, createdAt: doc.createdAt }, hash: doc.hash, env });
      let qr = '';
      try { qr = Calc.qrSvg(await Calc.loadQr(), model.qr); } catch (_) { qr = ''; }
      return { model, qr };
    } catch (_) { return null; }
  }
  /** HTML ni chop etish maydoniga qo'yish → pastki qismni (xesh, QR) to'ldirish → chop etish oynasi */
  let previewTarget = null;    // P16: "Hisobot" yorlig'idagi A4 ko'rinishi — o'sha HTML, chop etish oynasisiz
  async function show(build, scope, fallbackDoc) {
    const preview = previewTarget;
    const el = preview || document.getElementById('print-report');
    el.setAttribute('data-theme', 'light');           // qog'oz har doim yorug' (tokens.css; mavzuga bog'liq emas)
    el.classList.add('report-doc');
    el.innerHTML = build(null);                       // darhol (xesh hisoblanguncha pastki qismsiz)
    const footer = await footerFor(scope, fallbackDoc);
    if (footer) el.innerHTML = build(footer);
    if (preview) return true;
    document.body.classList.add('print-report-mode');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-report-mode'), { once: true });
    window.print();
    return true;
  }
  function blocked(statuses) {
    const block = blockedBy(statuses);
    if (block) showToast(i18n.t(block === 'zero_u' ? 'fnd_blocked_zero_u' : 'cmc_blocked'), 'error', 6000);
    return !!block;
  }

  /* ─── P16: "Hisobot" yorlig'i — A4 qog'oz ko'rinishi, shakl almashtirgich (4 shakl), "PDF" va "Chop etish" ───
     Ko'rinish ham, bosma ham AYNAN bitta quruvchidan (printReport → Calc.buildReport) chiqadi. */
  async function preview(el) {
    previewTarget = el;
    try { return await printReport(); } finally { previewTarget = null; }
  }
  function renderReportTab() {
    const root = document.getElementById('report-root');
    if (!root) return Promise.resolve(false);
    const cur = reportOptions().form;
    const forms = (window.Calc && Calc.REPORT_FORMS) || [];
    const has = !!(current() || currentMulti() || (appState.get('points') || []).some(p => p.result && !p.result.error));
    root.innerHTML = `
      <div class="panel-header"><div>
        <h2 class="panel-title">${escHtml(i18n.t('rp2_title'))}</h2>
        <p class="panel-sub text-muted">${escHtml(i18n.t('rp2_sub'))}</p>
      </div>
      <div class="panel-actions">
        <button type="button" class="btn btn-outline" data-report-print="pdf" ${has ? '' : 'disabled'}>${escHtml(i18n.t('rp2_pdf'))}</button>
        <button type="button" class="btn btn-primary" data-report-print="print" ${has ? '' : 'disabled'}>${escHtml(i18n.t('rp2_print'))}</button>
      </div></div>
      <div class="report-tools">
        <div class="seg report-form-seg" role="group" aria-label="${escHtml(i18n.t('rp_form_label'))}">
          ${forms.map(f => `<button type="button" class="seg-btn${f === cur ? ' active' : ''}" data-report-pick="${escHtml(f)}" aria-pressed="${f === cur}">${escHtml(i18n.t('rp_form_' + f))}</button>`).join('')}
        </div>
        <button type="button" class="btn btn-outline btn-sm" data-report-requisites-open="1">${escHtml(i18n.t('rp_requisites_btn'))}</button>
      </div>
      <p class="text-xs text-muted">${escHtml(i18n.t('rp2_pdf_hint'))}</p>
      <div class="paper-stage">${has
        ? '<article class="paper report-doc" id="report-preview" data-theme="light" tabindex="0"></article>'
        : `<div class="empty-state"><p>${escHtml(i18n.t('results_empty'))}</p></div>`}</div>`;
    root.querySelectorAll('[data-report-pick]').forEach(b => b.addEventListener('click', () => {
      if (window.UCReport) window.UCReport.setForm(b.dataset.reportPick);
      renderReportTab();
    }));
    root.querySelectorAll('[data-report-print]').forEach(b => b.addEventListener('click', () => { printReport(); }));
    const paper = root.querySelector('#report-preview');
    if (!paper) return Promise.resolve(false);
    paper.setAttribute('aria-label', i18n.t('rp2_title'));
    return preview(paper);
  }
  function reportTabActive() { const p = document.getElementById('tab-report'); return !!p && p.classList.contains('active'); }

  function printReport() {
    const state = appState.get();
    const mv    = currentMulti();
    const vpts  = vectorPoints();
    if (vpts.length && (mv || !current())) return printVectorPoints(state, vpts);
    if (mv) {
      const mc = lastMC && !lastMC.error ? lastMC : null;
      return printMode(mv, { input: Points.snapshot(state), meta: state.template || null }, { scope: 'gum', emptyKey: 'results_empty', mode: () => 'MULTIVARIATE',
        body: x => sec().multivariateSection(x, { print: true, mc }) });
    }
    const r     = current();
    const pts   = (state.points || []).filter(p => p.result && !p.result.error);

    if (!r && !pts.length) {
      showToast(i18n.t('results_empty'), 'error');
      return Promise.resolve(false);
    }
    // P05a (RISKS R-05): U = 0, u_c = 0, U < CMC — hisobot yo bloklanadi (laboratoriya sozlamasi criticalMode / cmcMode
    // = 'block'), yo aniq belgi bilan chiqadi (standart). Qabul qilinmagan `error` bo'lsa — "RASMIY EMAS" suv belgisi.
    const statuses = pts.length
      ? pts.map(p => statusOf(p.result, { spec: p.snapshot, acceptances: p.acceptances || {} }))
      : [statusOf(r, { spec: state })];
    if (blocked(statuses)) return Promise.resolve(false);

    const uniformK = !!(state.summary && state.summary.uniformK);
    const rows = Points.summary(pts, uniformK);
    const opt = reportOptions();
    const mc = lastMC && !lastMC.error ? lastMC : null;
    const snap = Points.snapshot(state);
    const build = footer => Calc.buildReport({
      form: opt.form, lang: i18n.lang, env: fctx(), sections: sec(), requisites: opt.requisites, mode: 'GUM',
      ...(rows.length ? { rows, uniformK } : { result: r, snapshot: snap, mc }),
      marksHTML: officialMarksHtml(statuses), noticeHTML: templateNotice(), extraHTML: regressionAppendix() + aiAppendix(), footer,
    });
    const tm = state.template || null;
    return show(build, 'gum', () => {
      const main = rows.length ? rows[rows.length - 1] : null;
      const meta = Calc.metaFor(main ? main.r : r, main ? main.point.meta : state.calcMeta);
      return { id: meta.id, createdAt: meta.createdAt, input: main ? main.point.snapshot : snap, result: main ? main.r : r, template: tm,
               points: rows.map(x => ({ id: x.id, label: x.label, input: x.point.snapshot, result: x.r, acceptances: x.point.acceptances || {} })),
               acceptances: state.acceptances || {} };
    });
  }
  const fctx = () => ({ t: k => i18n.t(k), esc: escHtml });

  /** P07b: ko'p chiqish + ko'p nuqta — umumiy jadval, so'ng har bir nuqtaning vektor bo'limi (yagona k qo'llanmaydi). */
  function printVectorPoints(state, vpts) {
    const statuses = vpts.map(p => statusOf(p.result, { spec: p.snapshot, acceptances: p.acceptances || {} }));
    if (blocked(statuses)) return Promise.resolve(false);
    const ro = reportOptions();
    const rows = Calc.vectorSummaryRows(vpts);
    const tm = state.template || null;
    const main = rows[rows.length - 1];
    const notice = tm && window.UCTemplates ? window.UCTemplates.reportNoticeHTML(tm, main.r) : '';
    const form = ro.form === 'calibration_certificate' ? 'test_report' : ro.form;
    const build = footer => Calc.buildReport({
      form, lang: i18n.lang, env: fctx(), sections: sec(), requisites: ro.requisites, mode: 'MULTIVARIATE',
      bodyHTML: sec().vectorPointsSection(rows, { print: true }), marksHTML: officialMarksHtml(statuses), noticeHTML: notice, footer,
    });
    return show(build, 'gum', () => {
      const meta = Calc.metaFor(main.r, main.point.meta);
      return { id: meta.id, createdAt: meta.createdAt, input: main.point.snapshot, result: main.r, template: tm,
               points: rows.map(x => ({ id: x.id, label: x.label, input: x.point.snapshot, result: x.r, acceptances: x.point.acceptances || {} })),
               acceptances: state.acceptances || {} };
    });
  }

  /** Boshqa rejimlar (regressiya, top-down, maxsus): tayyor bo'lim + umumiy shakl (sarlavha, rekvizitlar, pastki qism) */
  function printMode(r, o, cfg) {
    const opt = o || {};
    if (!r || r.error) { showToast(i18n.t(cfg.emptyKey), 'error'); return Promise.resolve(false); }
    const statuses = [statusOf(r, { scope: cfg.scope })];
    if (blocked(statuses)) return Promise.resolve(false);
    const ro = reportOptions();
    const notice = opt.meta && window.UCTemplates ? window.UCTemplates.reportNoticeHTML(opt.meta, r) : '';
    const form = ro.form === 'calibration_certificate' ? 'test_report' : ro.form;   // bu rejimlar — sinov / validatsiya ma'lumoti
    const build = footer => Calc.buildReport({
      form, lang: i18n.lang, env: fctx(), sections: sec(), requisites: ro.requisites, mode: cfg.mode(r),
      bodyHTML: cfg.body(r, opt) + marksHtml(r), marksHTML: officialMarksHtml(statuses), noticeHTML: notice, footer,
    });
    return show(build, cfg.scope, () => { const m = Calc.metaFor(r); return { id: m.id, createdAt: m.createdAt, input: opt.input || { format: r.format }, result: r, template: opt.meta || null }; });
  }
  const linterMode = r => (r.mode === 'MICROBIOLOGY' ? 'MICRO' : r.mode);

  /** Faqat regressiya hisoboti (regressiya yorlig'idagi "Chop etish"). meta — shablon belgilari (DRAFT, demo). */
  function printRegression(r, o) {
    return printMode(r, o, { scope: 'regression', emptyKey: 'rg_empty', mode: () => 'REGRESSION',
      body: (res, opt) => regressionSection(res, { print: true, plots: opt.plots, residualTable: true }) });
  }
  /** Faqat top-down hisoboti ("Chop etish"). meta — shablon belgilari (DRAFT). */
  function printTopdown(r, o) {
    return printMode(r, o, { scope: 'topdown', emptyKey: 'td_empty', mode: () => 'TOP_DOWN', body: res => topdownSection(res, { print: true }) });
  }
  /** P12: malaka sinovlari va usul validatsiyasi hisoboti (Laboratoriya yorlig'i) */
  function printPT(r, o) {
    return printMode(r, o, { scope: 'pt', emptyKey: 'pt_empty', mode: () => 'PT', body: res => sec().ptSection(res, { print: true }) });
  }
  function printValidation(r, o) {
    return printMode(r, o, { scope: 'validation', emptyKey: 'vl_empty', mode: () => 'VALIDATION', body: res => sec().validationSection(res, { print: true }) });
  }
  function printSpecial(r, o) {
    return printMode(r, o, { scope: 'special', emptyKey: 'sp_empty', mode: linterMode, body: res => specialSection(res, { print: true }) });
  }

  const escHtml = window.escHtml;

  return { init, render, printReport, preview, renderReportTab, regressionSection, printRegression, topdownSection, printTopdown, specialSection, printSpecial, printPT, printValidation, findingsOf, findingsHtml, statusOf };


})();

window.Results = Results;
