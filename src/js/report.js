/* ═══════════════════════════════════════════════════════════════
   REPORT.JS — Results view and ISO/IEC 17025:2017 print report
   Works for any model y = f(x1…xN) evaluated by Calc.evaluate()
═══════════════════════════════════════════════════════════════ */

const Results = (() => {

  const DIST_KEYS = { rect: 'dist_rect', normal: 'dist_normal', triang: 'dist_triang',
                      ushape: 'dist_ushape', resol: 'dist_resol' };

  function init() {
    document.getElementById('btn-print').addEventListener('click', printReport);
    appState.subscribe((changes) => {
      if (!changes || changes.combined !== undefined) render();
    });
  }

  /* Result of an older app version has no budget — treat as not calculated */
  function current() {
    const comb = appState.get('combined');
    return comb && Array.isArray(comb.budget) && Array.isArray(comb.inputs) ? comb : null;
  }

  function unitOf(r) { return r.unit ? ' ' + escHtml(r.unit) : ''; }
  function pct(P) { return (P * 100).toFixed(2).replace(/\.?0+$/, ''); }
  function nuText(nu) { return isFinite(nu) ? String(Math.floor(nu)) : '∞'; }
  function distLabel(d) { return DIST_KEYS[d] ? i18n.t(DIST_KEYS[d]).replace(/\s*\(.*$/, '') : (d || '—'); }

  function statement(r) {
    return `${escHtml(r.symbol)} = (${r.resultText})${unitOf(r)};  k = ${r.k.toFixed(2)};  P ≈ ${pct(r.P)} %`;
  }

  function render() {
    const el = document.getElementById('results-content');
    if (!el) return;
    const r = current();

    if (!r) {
      el.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <p>${i18n.t('results_empty')}</p>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="result-statement">
        <div class="result-statement-label">${i18n.t('res_statement')}</div>
        <div class="result-statement-value mono">${statement(r)}</div>
      </div>
      ${renderKPIs(r)}
      ${renderInputs(r)}
      ${renderBudget(r)}
      ${renderCorrelation(r)}
      ${renderSteps(r)}
      ${renderVerify(r)}
    `;
  }

  function renderKPIs(r) {
    const kpis = [
      { label: `${i18n.t('res_y')} ${escHtml(r.symbol)}`, value: Calc.fmtSci(r.y, 8), unit: r.unit, cls: '' },
      { label: i18n.t('kpi_uc'),     value: Calc.fmtSci(r.uc), unit: r.relUc !== null ? r.relUc.toFixed(4) + ' %' : '', cls: '' },
      { label: 'ν_eff',              value: nuText(r.nuEff),   unit: 'Welch–Satterthwaite', cls: '' },
      { label: i18n.t('res_k'),      value: r.k.toFixed(3),    unit: `P = ${pct(r.P)} %`, cls: '' },
      { label: i18n.t('res_U'),      value: Calc.fmtSci(r.U),  unit: r.relU !== null ? r.relU.toFixed(4) + ' %' : '', cls: 'kpi-success' },
    ];
    return `
      <div class="results-grid">
        ${kpis.map(k => `
          <div class="result-kpi ${k.cls}">
            <div class="result-kpi-label math">${k.label}</div>
            <div class="result-kpi-value">${k.value}</div>
            ${k.unit ? `<div class="result-kpi-unit">${escHtml(k.unit)}</div>` : ''}
          </div>`).join('')}
      </div>`;
  }

  function inputsTable(r, cls) {
    return `
      <table class="${cls}">
        <thead><tr>
          <th>${i18n.t('col_quantity')}</th>
          <th class="cell-num">n</th>
          <th class="cell-num">${i18n.t('foot_mean')}</th>
          <th class="cell-num">s</th>
          <th class="cell-num">u_A</th>
          <th class="cell-num">u_B</th>
          <th class="cell-num">u(x)</th>
          <th class="cell-num">c = ∂${escHtml(r.symbol)}/∂x</th>
          <th class="cell-num">|c|·u(x)</th>
        </tr></thead>
        <tbody>
          ${r.inputs.map(i => `<tr>
            <td><strong>${escHtml(i.name)}</strong></td>
            <td class="cell-num num mono">${i.n}</td>
            <td class="cell-num num mono">${Calc.fmtSci(i.mean, 8)}</td>
            <td class="cell-num num mono">${i.n > 1 ? Calc.fmtSci(i.s) : '—'}</td>
            <td class="cell-num num mono">${i.n > 1 ? Calc.fmtSci(i.uA) : '—'}</td>
            <td class="cell-num num mono">${Calc.fmtSci(i.uB)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(i.u)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(i.c)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(Math.abs(i.c) * i.u)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderInputs(r) {
    return `
      <div class="section-title">${i18n.t('sec_inputs')}</div>
      <div class="formula-box">${escHtml(r.symbol)} = ${escHtml(r.formulaText)}</div>
      <div class="budget-table-wrap">${inputsTable(r, 'data-table math-head')}</div>`;
  }

  function budgetRows(r, withBar) {
    return r.budget.map(b => {
      const badge = b.kind === 'A' ? '<span class="badge badge-blue">A</span>'
                  : b.kind === 'B' ? '<span class="badge badge-orange">B</span>'
                  : '<span class="badge badge-green">r</span>';
      const name = b.kind === 'A' ? `${escHtml(b.name)}: ${i18n.t('budget_repeat')} (n = ${b.n})`
                 : b.kind === 'B' ? `${escHtml(b.param)}: ${escHtml(b.name)}`
                 : `${i18n.t('budget_corr')} ${escHtml(b.name)}`;
      const w = Math.min(100, Math.abs(b.share));
      return `<tr>
        <td>${name}</td>
        <td>${badge}</td>
        <td>${b.kind === 'corr' ? '—' : distLabel(b.dist)}</td>
        <td class="cell-num num mono">${Calc.fmtSci(b.u)}</td>
        <td class="cell-num num mono">${Calc.fmtSci(b.c)}</td>
        <td class="cell-num num mono">${b.ui === null ? '—' : Calc.fmtSci(b.ui)}</td>
        <td class="cell-num num mono">${Calc.fmtSci(b.contrib)}</td>
        <td class="cell-num num mono">${b.share.toFixed(2)}${withBar ? `
          <div class="share-bar"><span class="${b.share < 0 ? 'neg' : ''}" style="width:${w}%"></span></div>` : ''}</td>
      </tr>`;
    }).join('');
  }

  function budgetTable(r, cls, withBar) {
    return `
      <table class="${cls}">
        <thead><tr>
          <th>${i18n.t('budget_source')}</th>
          <th>${i18n.t('budget_type')}</th>
          <th>${i18n.t('budget_dist')}</th>
          <th class="cell-num">u(xᵢ)</th>
          <th class="cell-num">cᵢ</th>
          <th class="cell-num">|cᵢ|·u(xᵢ)</th>
          <th class="cell-num">uᵢ²(${escHtml(r.symbol)})</th>
          <th class="cell-num">${i18n.t('col_share')}</th>
        </tr></thead>
        <tbody>
          ${budgetRows(r, withBar)}
          <tr style="font-weight:600;border-top:2px solid var(--border)">
            <td colspan="5">${i18n.t('budget_total')}</td>
            <td class="cell-num num mono">${Calc.fmtSci(r.uc)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(r.uc2)}</td>
            <td class="cell-num num mono">100.00</td>
          </tr>
        </tbody>
      </table>`;
  }

  function renderBudget(r) {
    return `
      <div class="section-title">${i18n.t('results_title')}</div>
      <div class="budget-table-wrap">${budgetTable(r, 'data-table math-head', true)}</div>`;
  }

  function corrTable(r, cls) {
    return `
      <table class="${cls}">
        <thead><tr>
          <th>${i18n.t('corr_pair')}</th>
          <th class="cell-num">${i18n.t('corr_ra')}</th>
          <th class="cell-num">s(x̄ᵢ,x̄ⱼ)</th>
          <th class="cell-num">u_B(xᵢ,xⱼ)</th>
          <th class="cell-num">u(xᵢ,xⱼ)</th>
          <th class="cell-num">r(xᵢ,xⱼ)</th>
          <th class="cell-num">2·cᵢ·cⱼ·u(xᵢ,xⱼ)</th>
        </tr></thead>
        <tbody>
          ${r.pairs.map(p => `<tr>
            <td>${escHtml(p.a)} ↔ ${escHtml(p.b)}</td>
            <td class="cell-num num mono">${p.rA.toFixed(4)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(p.covA)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(p.covB)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(p.cov)}</td>
            <td class="cell-num num mono">${p.r.toFixed(4)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(p.term)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function corrNote(r) {
    return `${i18n.t('corr_effect')}: u_c,0 = ${Calc.fmtSci(r.ucNoCorr)} → u_c = ${Calc.fmtSci(r.uc)}
      (${r.corrEffectPct >= 0 ? '+' : ''}${r.corrEffectPct.toFixed(2)} %)`;
  }

  function renderCorrelation(r) {
    if (!r.pairs.length) return '';
    return `
      <div class="section-title">${i18n.t('sec_corr')}</div>
      <div class="budget-table-wrap">${corrTable(r, 'data-table math-head')}</div>
      <div class="formula-box">${corrNote(r)}</div>`;
  }

  function stepLines(r) {
    const s = escHtml(r.symbol);
    return [
      `u_c²(${s}) = Σ cᵢ²·u²(xᵢ)${r.pairs.length ? ' + 2·ΣΣ cᵢ·cⱼ·u(xᵢ,xⱼ)' : ''} = ${Calc.fmtSci(r.uc2)}  →  u_c(${s}) = ${Calc.fmtSci(r.uc)}`,
      `ν_eff = u_c⁴ / Σ[(cᵢ·u_A,ᵢ)⁴/νᵢ] = ${isFinite(r.nuEff) ? r.nuEff.toFixed(1) : '∞'}`,
      `k = t(P = ${pct(r.P)} %; ν = ${nuText(r.nuEff)}) = ${r.k.toFixed(4)}`,
      `U = k·u_c = ${r.k.toFixed(4)} × ${Calc.fmtSci(r.uc)} = ${Calc.fmtSci(r.U)}${unitOf(r)}`,
    ];
  }

  function renderSteps(r) {
    return `
      <div class="section-title">${i18n.t('section_expanded')}</div>
      ${stepLines(r).map(l => `<div class="formula-box">${l}</div>`).join('')}`;
  }

  function verifyLines(r) {
    const v = r.verify;
    const s = escHtml(r.symbol);
    return [
      `${s}̄ = Σ${s}ᵢ/n = ${Calc.fmtSci(v.mean, 8)}`,
      `${i18n.t('ver_direct')}: u_A = s(${s}ᵢ)/√n = ${Calc.fmtSci(v.uAdirect)}`,
      `${i18n.t('ver_formula')}: u_A = ${Calc.fmtSci(v.uAformula)}   (Δ = ${v.diffPct.toFixed(3)} %)`,
    ];
  }

  function renderVerify(r) {
    if (!r.verify) return '';
    return `
      <div class="section-title">${i18n.t('sec_verify')}</div>
      ${verifyLines(r).map(l => `<div class="formula-box">${l}</div>`).join('')}`;
  }

  /* ─── PRINT REPORT ──────────────────────────────── */
  function printReport() {
    const state = appState.get();
    const r     = current();

    if (!r) {
      showToast(i18n.t('results_empty'), 'error');
      return;
    }

    const now     = new Date().toLocaleDateString();
    const printEl = document.getElementById('print-report');
    const rows    = Array.from({ length: state.n }, (_, i) => i)
      .filter(i => state.params.some(p => !isBlankCell((state.measurements[p] || [])[i])));

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

      <div class="print-section">${i18n.t('model_title')}</div>
      <p style="font-size:10pt;margin:.4em 0 .6em"><strong>${escHtml(r.symbol)} = ${escHtml(r.formulaText)}</strong></p>

      <div class="print-section">${i18n.t('data_title')}</div>
      <table class="print-table">
        <thead><tr><th>#</th>${state.params.map(p => `<th>${escHtml(p)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map(i => `<tr><td>${i + 1}</td>${state.params.map(p =>
            `<td class="num">${escHtml(String((state.measurements[p] || [])[i] ?? ''))}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>

      <div class="print-section">${i18n.t('sec_inputs')}</div>
      ${inputsTable(r, 'print-table')}

      <div class="print-section">${i18n.t('results_title')}</div>
      ${budgetTable(r, 'print-table', false)}

      ${r.pairs.length ? `
      <div class="print-section">${i18n.t('sec_corr')}</div>
      ${corrTable(r, 'print-table')}
      <p style="font-size:9pt;margin:.3em 0">${corrNote(r)}</p>` : ''}

      <div class="print-section">${i18n.t('section_expanded')}</div>
      ${stepLines(r).map(l => `<p style="font-size:9pt;margin:.25em 0">${l}</p>`).join('')}

      ${r.verify ? `
      <div class="print-section">${i18n.t('sec_verify')}</div>
      ${verifyLines(r).map(l => `<p style="font-size:9pt;margin:.25em 0">${l}</p>`).join('')}` : ''}

      <div class="print-section">${i18n.t('res_statement')}</div>
      <p style="font-size:11pt;margin:.5em 0"><strong>${statement(r)}</strong></p>

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

  function isBlankCell(v) { return v === '' || v === null || v === undefined; }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, render };

})();

window.Results = Results;
