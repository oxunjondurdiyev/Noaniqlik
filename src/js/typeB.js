/* ═══════════════════════════════════════════════════════════════
   TYPEB.JS — Type B uncertainty components, correlation settings
   Distributions: rectangular, normal (U/k), triangular, U-shape,
   resolution d/(2√3)
═══════════════════════════════════════════════════════════════ */

const TypeB = (() => {

  const DIST_OPTIONS = [
    { value: 'rect',   labelKey: 'dist_rect',   cssClass: 'dist-rect'   },
    { value: 'normal', labelKey: 'dist_normal', cssClass: 'dist-normal' },
    { value: 'triang', labelKey: 'dist_triang', cssClass: 'dist-triang' },
    { value: 'ushape', labelKey: 'dist_ushape', cssClass: 'dist-ushape' },
    { value: 'resol',  labelKey: 'dist_resol',  cssClass: 'dist-rect'   },
  ];

  const P_OPTIONS = [
    { value: 0.95,   label: '95 %' },
    { value: 0.9545, label: '95.45 %  (k ≈ 2)' },
    { value: 0.99,   label: '99 %' },
    { value: 0.9973, label: '99.73 %  (k ≈ 3)' },
  ];

  function init() {
    document.getElementById('btn-add-typeb').addEventListener('click', addComponent);
    document.getElementById('btn-calc-combined').addEventListener('click', calcCombined);

    appState.subscribe((changes) => {
      if (!changes || changes.typeB !== undefined || changes.params !== undefined ||
          changes.measurements !== undefined || changes.settings !== undefined || changes.covB !== undefined) {
        render();
      }
    });

    render();
  }

  function addComponent(presetData) {
    const state     = appState.get();
    const paramName = state.params[0] || 'x';
    const isPreset  = presetData && typeof presetData === 'object' && presetData.name;

    appState.addTypeBComponent(isPreset ? {
      name:         presetData.name,
      param:        presetData.param || paramName,
      halfWidth:    presetData.halfWidth || 0,
      distribution: presetData.distribution || 'rect',
      k:            presetData.k || 2,
      sensitivity:  presetData.sensitivity !== undefined ? presetData.sensitivity : 1,
      unit:         presetData.unit || '',
    } : {
      name:         i18n.t('label_component') + ' ' + (appState.get('typeB').length + 1),
      param:        paramName,
      halfWidth:    0,
      distribution: 'rect',
      k:            2,
      sensitivity:  1,
      unit:         '',
    });
  }

  function compStd(comp) {
    const std  = Calc.typeB(comp.halfWidth, comp.distribution, comp.k);
    const mult = (comp.sensitivity === undefined || comp.sensitivity === '' || comp.sensitivity === null)
      ? 1 : Number(comp.sensitivity) || 0;
    return { std, mult, u: Math.abs(mult) * std };
  }

  function render() {
    const state = appState.get();
    const el    = document.getElementById('typeb-components');
    const sumEl = document.getElementById('typeb-summary');
    if (!el) return;

    if (state.typeB.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
          <p class="text-muted text-sm">${i18n.t('typeb_sub')}</p>
          <button class="btn btn-primary btn-sm" id="btn-add-typeb-empty">
            + ${i18n.t('btn_add_component')}
          </button>
        </div>`;
      const btnEmpty = el.querySelector('#btn-add-typeb-empty');
      if (btnEmpty) btnEmpty.addEventListener('click', addComponent);
      sumEl.innerHTML = '';
    } else {
      el.innerHTML = state.typeB.map(comp => renderComponent(comp, state)).join('');
      renderSummary(state);

      // Save on blur/commit only — re-rendering on every keystroke would drop focus
      el.querySelectorAll('[data-field]').forEach(inp => {
        inp.addEventListener('change', onFieldChange);
      });
      el.querySelectorAll('input[inputmode="decimal"]').forEach(inp => {
        inp.addEventListener('input', () => {
          if (inp.value.includes(',')) inp.value = inp.value.replace(',', '.');
        });
      });
      el.querySelectorAll('.btn-remove-tb').forEach(btn => {
        btn.addEventListener('click', () => appState.removeTypeBComponent(btn.dataset.id));
      });
    }

    renderSettings(state);
  }

  function renderComponent(comp, state) {
    const { std, mult, u } = compStd(comp);
    const dist = comp.distribution;

    const distOpts = DIST_OPTIONS.map(d =>
      `<option value="${d.value}" ${dist === d.value ? 'selected' : ''}>${i18n.t(d.labelKey)}</option>`
    ).join('');

    const paramOpts = state.params.map(p =>
      `<option value="${escHtml(p)}" ${comp.param === p ? 'selected' : ''}>${escHtml(p)}</option>`
    ).join('');

    const distCls  = DIST_OPTIONS.find(d => d.value === dist)?.cssClass || 'dist-rect';
    const divLabel = Calc.getDivisorLabel(dist, comp.k);
    const aLabel   = dist === 'normal' ? i18n.t('label_a_normal')
                   : dist === 'resol'  ? i18n.t('label_a_resol')
                   : i18n.t('label_half_width') + ' (±a)';
    const aSym     = dist === 'normal' ? 'U' : dist === 'resol' ? 'd' : 'a';

    return `
    <div class="typeb-card" data-id="${comp.id}">
      <div class="typeb-card-header">
        <input type="text" value="${escHtml(comp.name)}" data-id="${comp.id}" data-field="name"
          placeholder="${i18n.t('label_component')}" />
        <span class="dist-badge ${distCls}">${escHtml(comp.param || '')}</span>
        <button class="btn btn-sm btn-danger btn-remove-tb" data-id="${comp.id}" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="typeb-card-body">
        <div class="form-group">
          <label>${i18n.t('label_param')}</label>
          <select data-id="${comp.id}" data-field="param">${paramOpts}</select>
        </div>
        <div class="form-group">
          <label>${i18n.t('label_distribution')}</label>
          <select data-id="${comp.id}" data-field="distribution">${distOpts}</select>
        </div>
        <div class="form-group">
          <label>${aLabel}</label>
          <input type="text" inputmode="decimal" value="${escHtml(String(comp.halfWidth))}"
            data-id="${comp.id}" data-field="halfWidth" placeholder="0.0005" autocomplete="off" />
        </div>
        ${dist === 'normal' ? `
        <div class="form-group">
          <label>${i18n.t('label_k_cert')}</label>
          <input type="text" inputmode="decimal" value="${escHtml(String(comp.k || 2))}"
            data-id="${comp.id}" data-field="k" placeholder="2" autocomplete="off" />
        </div>` : `
        <div class="form-group">
          <label>${i18n.t('label_unit')}</label>
          <input type="text" value="${escHtml(comp.unit || '')}"
            data-id="${comp.id}" data-field="unit" placeholder="g, mL, V…" />
        </div>`}
        <div class="form-group">
          <label title="${escHtml(i18n.t('label_mult_hint'))}">${i18n.t('label_mult')} ⓘ</label>
          <input type="text" inputmode="decimal" value="${escHtml(String(comp.sensitivity ?? 1))}"
            data-id="${comp.id}" data-field="sensitivity" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>${i18n.t('label_std_unc')}</label>
          <div class="formula-box" style="color:var(--accent)">
            u = ${mult !== 1 ? Calc.fmtSci(Math.abs(mult)) + ' · ' : ''}${aSym} / ${divLabel} = ${Calc.fmtSci(u)}
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderSummary(state) {
    const sumEl = document.getElementById('typeb-summary');
    if (!sumEl) return;

    const items = state.params.map(p => {
      const own = state.typeB.filter(c => (state.params.includes(c.param) ? c.param : state.params[0]) === p);
      if (!own.length) return '';
      const uB = Math.sqrt(own.reduce((s, c) => s + compStd(c).u ** 2, 0));
      return `
        <div class="stat-item">
          <span class="stat-label" style="text-transform:none">u_B(${escHtml(p)})</span>
          <span class="stat-value" style="color:var(--warning)">${Calc.fmtSci(uB)}</span>
        </div>`;
    }).join('');

    sumEl.innerHTML = `<div class="stats-row">${items}</div>`;
  }

  /* ── Correlation between inputs + coverage probability ── */
  function renderSettings(state) {
    const el = document.getElementById('typeb-settings');
    if (!el) return;
    if (el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;

    const settings = state.settings || {};
    const paired   = settings.paired !== false;
    const P        = Number(settings.P) || 0.9545;
    const covB     = state.covB || {};

    const stats = {};
    state.params.forEach(p => { stats[p] = Calc.typeA(state.measurements[p] || []); });

    let pairRows = '';
    for (let i = 0; i < state.params.length; i++) {
      for (let j = i + 1; j < state.params.length; j++) {
        const a = state.params[i], b = state.params[j];
        const rA = (paired && stats[a] && stats[b]) ? Calc.correlation(stats[a].rowVals, stats[b].rowVals) : 0;
        const key = Calc.pairKey(a, b);
        pairRows += `<tr>
          <td>${escHtml(a)} ↔ ${escHtml(b)}</td>
          <td class="cell-num mono">${paired ? rA.toFixed(4) : '0 <span class="text-muted">(' + i18n.t('corr_off') + ')</span>'}</td>
          <td><input type="text" inputmode="decimal" class="meas-input" data-cov="${escHtml(key)}"
            value="${escHtml(String(covB[key] ?? 0))}" autocomplete="off" /></td>
        </tr>`;
      }
    }

    const pOpts = P_OPTIONS.map(o =>
      `<option value="${o.value}" ${Math.abs(o.value - P) < 1e-9 ? 'selected' : ''}>${o.label}</option>`).join('');

    el.innerHTML = `
      <div class="model-card">
        <div class="model-card-title">${i18n.t('corr_title')}</div>
        ${pairRows ? `
        <div class="table-scroll">
          <table class="data-table math-head">
            <thead><tr>
              <th>${i18n.t('corr_pair')}</th>
              <th class="cell-num">${i18n.t('corr_ra')}</th>
              <th>${i18n.t('corr_covb')}</th>
            </tr></thead>
            <tbody>${pairRows}</tbody>
          </table>
        </div>
        <p class="text-muted text-xs" style="margin:.4rem 0 .8rem">${i18n.t('corr_hint')}</p>` : ''}
        <div class="form-group" style="max-width:280px">
          <label>${i18n.t('label_P')}</label>
          <select id="sel-coverage-p">${pOpts}</select>
        </div>
      </div>`;

    el.querySelectorAll('[data-cov]').forEach(inp => {
      inp.addEventListener('change', () => {
        const v = Calc.toNum(inp.value);
        appState.set({ covB: { ...(appState.get('covB') || {}), [inp.dataset.cov]: isFinite(v) ? v : 0 }, combined: null });
      });
    });
    el.querySelector('#sel-coverage-p').addEventListener('change', e => {
      appState.set({ settings: { ...(appState.get('settings') || {}), P: Number(e.target.value) }, combined: null });
    });
  }

  function onFieldChange(e) {
    const id    = e.target.dataset.id;
    const field = e.target.dataset.field;
    let val     = e.target.value;

    if (field === 'halfWidth' || field === 'sensitivity' || field === 'k') {
      const n = Calc.toNum(val);
      val = isFinite(n) ? n : (field === 'halfWidth' ? 0 : field === 'k' ? 2 : 1);
    }

    appState.updateTypeBComponent(id, { [field]: val });
  }

  function calcCombined() {
    const state  = appState.get();
    const result = Calc.evaluate(state);

    if (result.error) {
      const msg = {
        need_formula: i18n.t('err_need_formula'),
        bad_formula:  i18n.t('err_bad_formula') + (result.detail ? ': «' + result.detail + '»' : ''),
        need_data:    i18n.t('err_need_data') + ' ' + (result.detail || ''),
        formula_eval: i18n.t('err_formula_eval'),
      }[result.error] || i18n.t('toast_need_data');
      showToast(msg, 'error', 4500);
      if (result.error !== 'formula_eval') switchTab('data');
      return;
    }

    // Keep the Type A table in sync with what was actually used
    const typeA = {};
    state.params.forEach(p => {
      const ta = Calc.typeA(state.measurements[p] || []);
      if (ta) typeA[p] = ta;
    });

    appState.set({ typeA, combined: result });
    showToast(i18n.t('toast_calc_done'), 'success');
    switchTab('results');
    Results.render();
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* Public API for preset loading */
  function loadPresetComponents(components) {
    appState.set({ typeB: [] });
    components.forEach(c => addComponent(c));
  }

  return { init, render, addComponent, loadPresetComponents };

})();

window.TypeB = TypeB;
