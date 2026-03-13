/* ═══════════════════════════════════════════════════════════════
   REPORT.JS — ISO/IEC 17025:2017 compliant print report
═══════════════════════════════════════════════════════════════ */

const Results = (() => {

  function init() {
    document.getElementById('btn-print').addEventListener('click', printReport);
    appState.subscribe((changes, state) => {
      if (changes && changes.combined !== undefined) render();
    });
  }

  function render() {
    const state  = appState.get();
    const comb   = state.combined;
    const el     = document.getElementById('results-content');
    if (!el) return;

    if (!comb) {
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

    const primaryParam = state.params[0];
    const ta = state.typeA[primaryParam];

    el.innerHTML = `
      ${renderKPIs(comb, ta)}
      ${renderFormulas(comb)}
      ${renderBudgetTable(comb, state)}
      ${renderRelative(comb)}
    `;
  }

  function renderKPIs(comb, ta) {
    const kpis = [
      { label: i18n.t('kpi_mean'), value: Calc.fmt(comb.mean),         unit: '', cls: '' },
      { label: i18n.t('kpi_ua'),   value: Calc.fmtSci(comb.uA),       unit: '', cls: '' },
      { label: i18n.t('kpi_uc'),   value: Calc.fmtSci(comb.uc),       unit: '', cls: '' },
      { label: i18n.t('kpi_u95'),  value: Calc.fmtSci(comb.U95),      unit: '(k=2, ~95%)', cls: 'kpi-success' },
      { label: i18n.t('kpi_u99'),  value: Calc.fmtSci(comb.U99),      unit: '(k=3, ~99%)', cls: 'kpi-warning' },
    ];

    return `
      <div class="results-grid">
        ${kpis.map(k => `
          <div class="result-kpi ${k.cls}">
            <div class="result-kpi-label">${k.label}</div>
            <div class="result-kpi-value">${k.value}</div>
            ${k.unit ? `<div class="result-kpi-unit">${k.unit}</div>` : ''}
          </div>
        `).join('')}
      </div>`;
  }

  function renderFormulas(comb) {
    return `
      <div class="section-title">${i18n.t('section_combined')}</div>
      <div class="formula-box">
        u_c² = u_A² + Σ(c_i · u_Bi)²
        &nbsp;&nbsp;→&nbsp;&nbsp;
        u_c = ${Calc.fmtSci(comb.uc)}
      </div>
      <div class="formula-box">
        U (k=2) = 2 · u_c = 2 × ${Calc.fmtSci(comb.uc)} = <strong>${Calc.fmtSci(comb.U95)}</strong>
      </div>
      <div class="formula-box">
        U (k=3) = 3 · u_c = 3 × ${Calc.fmtSci(comb.uc)} = <strong>${Calc.fmtSci(comb.U99)}</strong>
      </div>
      ${comb.nu_eff && isFinite(comb.nu_eff) ? `
      <div class="formula-box">
        ν_eff (Welch-Satterthwaite) ≈ ${comb.nu_eff}
      </div>` : ''}`;
  }

  function renderBudgetTable(comb, state) {
    const rows = [
      // Type A row
      `<tr>
        <td>${escHtml(state.params[0])}</td>
        <td><span class="badge badge-blue">A</span></td>
        <td>Normal</td>
        <td class="cell-num mono">${Calc.fmtSci(comb.uA)}</td>
        <td class="cell-num mono">1</td>
        <td class="cell-num mono">${Calc.fmtSci(comb.uA)}</td>
        <td class="cell-num mono">${Calc.fmtSci(comb.uA * comb.uA)}</td>
      </tr>`,
      // Type B rows
      ...comb.contributions.map(c => {
        const distCls = { rect:'dist-rect', normal:'dist-normal', triang:'dist-triang', ushape:'dist-ushape' }[c.distribution] || '';
        const distLabel = { rect:'Rectangular', normal:'Normal', triang:'Triangular', ushape:'U-shape' }[c.distribution] || c.distribution;
        return `<tr>
          <td>${escHtml(c.name)}</td>
          <td><span class="badge badge-orange">B</span></td>
          <td><span class="dist-badge ${distCls}">${distLabel}</span></td>
          <td class="cell-num mono">${Calc.fmtSci(c.uBi)}</td>
          <td class="cell-num mono">${c.ci}</td>
          <td class="cell-num mono">${Calc.fmtSci(c.ciui)}</td>
          <td class="cell-num mono">${Calc.fmtSci(c.sq)}</td>
        </tr>`;
      }),
      // Total row
      `<tr style="font-weight:600;border-top:2px solid var(--border)">
        <td colspan="3">Combined u_c</td>
        <td></td>
        <td></td>
        <td class="cell-num mono" style="color:var(--accent)">${Calc.fmtSci(comb.uc)}</td>
        <td class="cell-num mono" style="color:var(--accent)">${Calc.fmtSci(comb.sumSq)}</td>
      </tr>`,
    ].join('');

    return `
      <div class="section-title">${i18n.t('results_title')}</div>
      <div class="budget-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>${i18n.t('budget_source')}</th>
              <th>${i18n.t('budget_type')}</th>
              <th>${i18n.t('budget_dist')}</th>
              <th class="cell-num">${i18n.t('budget_ui')}</th>
              <th class="cell-num">${i18n.t('budget_ci')}</th>
              <th class="cell-num">${i18n.t('budget_ciui')}</th>
              <th class="cell-num">${i18n.t('budget_ciui2')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function renderRelative(comb) {
    if (!comb.relU95) return '';
    return `
      <div class="section-title">Relative Uncertainty</div>
      <div class="results-grid">
        <div class="result-kpi">
          <div class="result-kpi-label">U_rel (k=2)</div>
          <div class="result-kpi-value">${comb.relU95.toFixed(4)}%</div>
        </div>
        <div class="result-kpi">
          <div class="result-kpi-label">Result (k=2)</div>
          <div class="result-kpi-value">${Calc.fmt(comb.mean)} ± ${Calc.fmtSci(comb.U95)}</div>
        </div>
        <div class="result-kpi">
          <div class="result-kpi-label">Result (k=3)</div>
          <div class="result-kpi-value">${Calc.fmt(comb.mean)} ± ${Calc.fmtSci(comb.U99)}</div>
        </div>
      </div>`;
  }

  /* ─── PRINT REPORT ──────────────────────────────── */
  function printReport() {
    const state = appState.get();
    const comb  = state.combined;
    const ta    = state.typeA[state.params[0]];

    if (!comb || !ta) {
      showToast(i18n.t('results_empty'), 'error');
      return;
    }

    const now = new Date().toLocaleDateString();
    const printEl = document.getElementById('print-report');

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

      <div class="print-section">${i18n.t('section_typeA')}</div>
      <div class="print-kpi-row">
        <div class="print-kpi"><div class="print-kpi-val">${Calc.fmt(ta.mean)}</div><div class="print-kpi-lbl">Mean (x̄)</div></div>
        <div class="print-kpi"><div class="print-kpi-val">${ta.n}</div><div class="print-kpi-lbl">n</div></div>
        <div class="print-kpi"><div class="print-kpi-val">${Calc.fmtSci(ta.s)}</div><div class="print-kpi-lbl">Std Dev (s)</div></div>
        <div class="print-kpi"><div class="print-kpi-val">${Calc.fmtSci(ta.uA)}</div><div class="print-kpi-lbl">u_A</div></div>
        <div class="print-kpi"><div class="print-kpi-val">${ta.n - 1}</div><div class="print-kpi-lbl">ν (dof)</div></div>
      </div>

      <table class="print-table">
        <thead><tr>
          <th>#</th>
          ${state.params.map(p => `<th>${escHtml(p)}</th>`).join('')}
          <th>(xᵢ − x̄)</th>
          <th>(xᵢ − x̄)²</th>
        </tr></thead>
        <tbody>
          ${ta.values.map((v, i) => {
            const dev = ta.deviations[i] || 0;
            return `<tr>
              <td>${i + 1}</td>
              ${state.params.map(p => {
                const vals = state.measurements[p] || [];
                return `<td class="num">${vals[i] || ''}</td>`;
              }).join('')}
              <td class="num">${Calc.fmt(dev)}</td>
              <td class="num">${Calc.fmt(dev * dev)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="print-section">${i18n.t('section_typeB')}</div>
      <table class="print-table">
        <thead><tr>
          <th>Source</th>
          <th>Distribution</th>
          <th>a (half-width)</th>
          <th>Divisor</th>
          <th>u_B</th>
          <th>c_i</th>
          <th>c_i · u_B</th>
          <th>(c_i · u_B)²</th>
        </tr></thead>
        <tbody>
          ${state.typeB.map(comp => {
            const uB = Calc.typeB(Number(comp.halfWidth) || 0, comp.distribution);
            const ci = comp.sensitivity !== undefined ? Number(comp.sensitivity) : 1;
            const ciuB = ci * uB;
            return `<tr>
              <td>${escHtml(comp.name)}</td>
              <td>${comp.distribution}</td>
              <td class="num">${comp.halfWidth}</td>
              <td>${Calc.getDivisorLabel(comp.distribution)}</td>
              <td class="num">${Calc.fmtSci(uB)}</td>
              <td class="num">${ci}</td>
              <td class="num">${Calc.fmtSci(ciuB)}</td>
              <td class="num">${Calc.fmtSci(ciuB * ciuB)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="print-section">${i18n.t('section_combined')}</div>
      <p style="font-size:9pt;margin:.4em 0 .6em">
        u_c = √[ u_A² + Σ(c_i · u_Bi)² ] = <strong>${Calc.fmtSci(comb.uc)}</strong>
      </p>

      <div class="print-section">${i18n.t('section_expanded')}</div>
      <table class="print-table">
        <thead><tr><th>Coverage Factor (k)</th><th>Level of Confidence</th><th>U (Expanded Uncertainty)</th></tr></thead>
        <tbody>
          <tr><td>k = 2</td><td>≈ 95.45%</td><td class="num"><strong>${Calc.fmtSci(comb.U95)}</strong></td></tr>
          <tr><td>k = 3</td><td>≈ 99.73%</td><td class="num"><strong>${Calc.fmtSci(comb.U99)}</strong></td></tr>
        </tbody>
      </table>
      ${comb.relU95 ? `<p style="font-size:9pt">Relative expanded uncertainty: ${comb.relU95.toFixed(4)}%</p>` : ''}
      ${comb.nu_eff && isFinite(comb.nu_eff) ? `<p style="font-size:9pt">Effective degrees of freedom ν_eff: ${comb.nu_eff}</p>` : ''}

      <div class="print-section">Result Statement</div>
      <p style="font-size:10pt;margin:.5em 0">
        <strong>${escHtml(state.params[0])} = ${Calc.fmt(comb.mean)} ± ${Calc.fmtSci(comb.U95)}</strong>
        &nbsp; (k = 2, coverage probability ≈ 95%)
      </p>

      <div class="print-footer">
        <span>${i18n.t('report_standard')}</span>
        <span>${i18n.t('report_date')}: ${now}</span>
        <span>Generated by UncertaintyCalc</span>
      </div>
    `;

    window.print();
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, render };

})();

window.Results = Results;
