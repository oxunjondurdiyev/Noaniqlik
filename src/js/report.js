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
    document.getElementById('btn-print').addEventListener('click', () => { printReport(); });
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
        <div class="table-scroll" style="padding:0;margin-top:.7rem">
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
    bindDecision(el);
    bindMC(el);
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
      <div class="section-title">${i18n.t('mc_title')}</div>
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
        <label class="text-xs">${i18n.t('mc_seed')} <input type="text" inputmode="numeric" data-mc-opt="seed" value="${escHtml(String(u.seed))}" style="width:7.5em" autocomplete="off" ${running ? 'disabled' : ''} /></label>
        <button class="btn btn-outline btn-sm" id="btn-mc" ${running ? 'disabled' : ''}>${i18n.t(running ? 'mc_running' : 'mc_run')}</button>
        ${running ? `<button class="btn btn-outline btn-sm" data-mc-cancel="1">${i18n.t('mc_cancel')}</button>
          <progress data-mc-progress="1" max="100" value="${Math.round(((mcJob.info || {}).progress || 0) * 100)}"></progress>
          <span class="text-xs mono" data-mc-progress-text="1">${escHtml(mcProgressText(mcJob.info))}</span>` : ''}
      </div>
      <div class="mc-row">
        <label class="text-xs"><input type="checkbox" data-mc-opt="gaussian" ${u.gaussian ? 'checked' : ''} ${running ? 'disabled' : ''} /> ${i18n.t('mc_gauss_approx')}</label>
        <span class="text-muted text-xs">${i18n.t('mc_hint')}</span>
      </div>
      ${err ? `<div class="formula-box" data-mc-error="${escHtml(err.error)}" style="border-color:var(--danger)">${escHtml(mcErrorText(err))}</div>${sec().mcFindingsHtml(err)}` : ''}
      ${mc ? mcLines(r, mc).map(l => `<div class="formula-box">${l}</div>`).join('') +
        (mc.correlated ? `<div class="text-xs text-muted">${i18n.t('mc_corr_note')}</div>` : '') +
        sec().mcFindingsHtml(mc) +
        (mc.validated === false ? `<div class="text-xs text-muted">${i18n.t('mc_advice')}</div>` : '') : ''}`;
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
      const model = Calc.footerModel({ engineVersion: doc.engineVersion, build, template: doc.template, meta: { id: doc.id, createdAt: doc.createdAt }, hash: doc.hash });
      let qr = '';
      try { qr = Calc.qrSvg(await Calc.loadQr(), model.qr); } catch (_) { qr = ''; }
      return { model, qr };
    } catch (_) { return null; }
  }
  /** HTML ni chop etish maydoniga qo'yish → pastki qismni (xesh, QR) to'ldirish → chop etish oynasi */
  async function show(build, scope, fallbackDoc) {
    const el = document.getElementById('print-report');
    el.innerHTML = build(null);                       // darhol (xesh hisoblanguncha pastki qismsiz)
    const footer = await footerFor(scope, fallbackDoc);
    if (footer) el.innerHTML = build(footer);
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

  function printReport() {
    const state = appState.get();
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
      marksHTML: officialMarksHtml(statuses), noticeHTML: templateNotice(), extraHTML: regressionAppendix(), footer,
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
  function printSpecial(r, o) {
    return printMode(r, o, { scope: 'special', emptyKey: 'sp_empty', mode: linterMode, body: res => specialSection(res, { print: true }) });
  }

  const escHtml = window.escHtml;

  return { init, render, printReport, regressionSection, printRegression, topdownSection, printTopdown, specialSection, printSpecial, findingsOf, findingsHtml, statusOf };


})();

window.Results = Results;
