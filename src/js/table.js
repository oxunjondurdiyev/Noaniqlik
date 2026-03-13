/* ═══════════════════════════════════════════════════════════════
   TABLE.JS — Dynamic measurement data table with Type A stats
═══════════════════════════════════════════════════════════════ */

const Table = (() => {

  let _currentParam = null;

  function init() {
    document.getElementById('btn-fill-sample').addEventListener('click', fillSample);
    document.getElementById('btn-clear-data').addEventListener('click', clearData);
    document.getElementById('btn-calc-typea').addEventListener('click', calcTypeA);

    appState.subscribe((changes, state) => {
      if (!changes || changes.params !== undefined || changes.measurements !== undefined || changes.n !== undefined) {
        render();
      }
    });

    render();
  }

  function render() {
    const state = appState.get();
    if (!_currentParam || !state.params.includes(_currentParam)) {
      _currentParam = state.params[0];
    }
    renderParamTabs();
    renderTable();
    renderTypeASummary();
  }

  function renderParamTabs() {
    // If there are multiple params, show tabs above the table (re-use tab-bar pattern)
    const state = appState.get();
    // Only one param view at a time for clarity — param selector is in sidebar
    // but we still need to know which param is active
    _currentParam = _currentParam || state.params[0];
  }

  function renderTable() {
    const state = appState.get();
    const n     = state.n;
    const head  = document.getElementById('table-head');
    const body  = document.getElementById('table-body');
    const foot  = document.getElementById('table-foot');

    // Build header rows — one column per param
    const paramCols = state.params.map(p =>
      `<th>${escHtml(p)}</th>`
    ).join('');

    head.innerHTML = `
      <tr>
        <th>${i18n.t('col_i')}</th>
        ${paramCols}
        <th class="cell-num">${i18n.t('col_dev')} (${escHtml(state.params[0])})</th>
        <th class="cell-num">${i18n.t('col_dev2')}</th>
      </tr>`;

    // Get type A results for first param (for deviation display)
    const primaryParam = state.params[0];
    const ta = state.typeA[primaryParam];
    const values0 = state.measurements[primaryParam] || Array(n).fill('');

    // Build body rows
    let rows = '';
    for (let i = 0; i < n; i++) {
      const paramInputs = state.params.map(p => {
        const vals = state.measurements[p] || Array(n).fill('');
        const v = vals[i] !== undefined ? vals[i] : '';
        return `<td><input type="number" step="any" class="meas-input"
          data-param="${escHtml(p)}" data-idx="${i}" value="${escHtml(String(v))}" /></td>`;
      }).join('');

      let devCell  = '<td class="cell-num text-muted">—</td>';
      let dev2Cell = '<td class="cell-num text-muted">—</td>';
      if (ta && ta.deviations) {
        const dev = ta.deviations[i];
        if (dev !== undefined) {
          const cls = dev >= 0 ? 'color:var(--success)' : 'color:var(--danger)';
          devCell  = `<td class="cell-num mono" style="${cls}">${Calc.fmt(dev)}</td>`;
          dev2Cell = `<td class="cell-num mono">${Calc.fmt(dev * dev)}</td>`;
        }
      }

      rows += `<tr>
        <td class="text-muted text-sm">${i + 1}</td>
        ${paramInputs}
        ${devCell}
        ${dev2Cell}
      </tr>`;
    }
    body.innerHTML = rows;

    // Footer stats
    const fmtOrDash = v => (v !== null && v !== undefined && !isNaN(v)) ? Calc.fmt(v) : '—';
    const footStats = state.params.map((p, pi) => {
      const ta2 = state.typeA[p];
      if (!ta2) return `<td class="cell-num text-muted">—</td>`;
      return `<td class="cell-num mono">${fmtOrDash(ta2.mean)}</td>`;
    }).join('');

    foot.innerHTML = `
      <tr>
        <td class="text-muted">${i18n.t('foot_mean')}</td>
        ${footStats}
        <td class="cell-num">—</td>
        <td class="cell-num">${ta ? fmtOrDash(ta.s2) : '—'}</td>
      </tr>
      <tr>
        <td class="text-muted">${i18n.t('foot_std')} (s)</td>
        ${state.params.map(p => {
          const r = state.typeA[p];
          return `<td class="cell-num mono">${r ? fmtOrDash(r.s) : '—'}</td>`;
        }).join('')}
        <td colspan="2" class="cell-num text-muted"></td>
      </tr>
      <tr>
        <td class="text-muted">${i18n.t('foot_ua')}</td>
        ${state.params.map(p => {
          const r = state.typeA[p];
          return `<td class="cell-num mono" style="color:var(--accent)">${r ? fmtOrDash(r.uA) : '—'}</td>`;
        }).join('')}
        <td colspan="2" class="cell-num text-muted"></td>
      </tr>`;

    // Attach input listeners
    body.querySelectorAll('.meas-input').forEach(inp => {
      inp.addEventListener('change', onCellChange);
      inp.addEventListener('input', onCellChange);
    });
  }

  function onCellChange(e) {
    const param = e.target.dataset.param;
    const idx   = parseInt(e.target.dataset.idx, 10);
    const val   = e.target.value;

    const state = appState.get();
    const vals  = [...(state.measurements[param] || Array(state.n).fill(''))];
    vals[idx]   = val;
    appState.setMeasurements(param, vals);
  }

  function renderTypeASummary() {
    const state = appState.get();
    const el    = document.getElementById('type-a-summary');
    if (!el) return;

    const results = state.params
      .map(p => state.typeA[p])
      .filter(Boolean);

    if (results.length === 0) {
      el.innerHTML = '';
      return;
    }

    const items = state.params.map(p => {
      const r = state.typeA[p];
      if (!r) return '';
      return `
        <div class="stat-item">
          <span class="stat-label">${escHtml(p)} — u_A</span>
          <span class="stat-value" style="color:var(--accent)">${Calc.fmt(r.uA)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">${escHtml(p)} — x̄</span>
          <span class="stat-value">${Calc.fmt(r.mean)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">${escHtml(p)} — s</span>
          <span class="stat-value">${Calc.fmt(r.s)}</span>
        </div>`;
    }).join('<div style="width:1px;background:var(--border);margin:0 .5rem;"></div>');

    el.innerHTML = `<div class="stats-row">${items}</div>`;
  }

  function fillSample() {
    const state = appState.get();
    const n     = state.n;
    state.params.forEach(p => {
      // Generate normally-distributed-ish sample data
      const mean   = 10 + Math.random() * 90;
      const spread = mean * 0.005; // 0.5% spread typical for lab measurements
      const vals   = Array.from({ length: n }, () =>
        parseFloat((mean + (Math.random() - 0.5) * 2 * spread).toFixed(6))
      );
      appState.setMeasurements(p, vals);
    });
    showToast(i18n.t('toast_calc_done'), 'success');
  }

  function clearData() {
    const state = appState.get();
    state.params.forEach(p => appState.setMeasurements(p, Array(state.n).fill('')));
    appState.set({ typeA: {}, combined: null });
  }

  function calcTypeA() {
    const state = appState.get();
    const typeA = {};
    let allOk   = true;

    state.params.forEach(p => {
      const vals = state.measurements[p] || [];
      const result = Calc.typeA(vals);
      if (!result) { allOk = false; return; }
      typeA[p] = result;
    });

    if (!allOk) {
      showToast(i18n.t('toast_need_data'), 'error');
      return;
    }

    appState.set({ typeA });
    showToast(i18n.t('toast_calc_done'), 'success');

    // Switch to Type B tab
    switchTab('typeb');
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, render, escHtml };

})();

window.Table = Table;
