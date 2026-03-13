/* ═══════════════════════════════════════════════════════════════
   TYPEB.JS — Type B uncertainty components
   4 distributions: rectangular, normal, triangular, U-shape
═══════════════════════════════════════════════════════════════ */

const TypeB = (() => {

  const DIST_OPTIONS = [
    { value: 'rect',   labelKey: 'dist_rect',   cssClass: 'dist-rect'   },
    { value: 'normal', labelKey: 'dist_normal',  cssClass: 'dist-normal' },
    { value: 'triang', labelKey: 'dist_triang',  cssClass: 'dist-triang' },
    { value: 'ushape', labelKey: 'dist_ushape',  cssClass: 'dist-ushape' },
  ];

  function init() {
    document.getElementById('btn-add-typeb').addEventListener('click', addComponent);
    document.getElementById('btn-calc-combined').addEventListener('click', calcCombined);

    appState.subscribe((changes, state) => {
      if (!changes || changes.typeB !== undefined || changes.params !== undefined) {
        render();
      }
    });

    render();
  }

  function addComponent(presetData) {
    const state   = appState.get();
    const paramName = state.params[0] || 'x';
    const isPreset  = presetData && typeof presetData === 'object' && presetData.name;

    appState.addTypeBComponent(isPreset ? {
      name:         presetData.name,
      param:        presetData.param || paramName,
      halfWidth:    presetData.halfWidth   || 0,
      distribution: presetData.distribution || 'rect',
      sensitivity:  presetData.sensitivity !== undefined ? presetData.sensitivity : 1,
      unit:         presetData.unit || '',
    } : {
      name:         'Component ' + (appState.get('typeB').length + 1),
      param:        paramName,
      halfWidth:    0,
      distribution: 'rect',
      sensitivity:  1,
      unit:         '',
    });
  }

  function render() {
    const state  = appState.get();
    const el     = document.getElementById('typeb-components');
    const sumEl  = document.getElementById('typeb-summary');
    if (!el) return;

    if (state.typeB.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
          <p class="text-muted text-sm">${i18n.t('typeb_sub')}</p>
        </div>`;
      sumEl.innerHTML = '';
      return;
    }

    el.innerHTML = state.typeB.map(comp => renderComponent(comp, state)).join('');
    renderSummary(state);

    // Attach event listeners
    el.querySelectorAll('[data-field]').forEach(inp => {
      inp.addEventListener('change', onFieldChange);
      inp.addEventListener('input',  onFieldChange);
    });
    el.querySelectorAll('.btn-remove-tb').forEach(btn => {
      btn.addEventListener('click', () => {
        appState.removeTypeBComponent(btn.dataset.id);
      });
    });
  }

  function renderComponent(comp, state) {
    const uB = Calc.typeB(Number(comp.halfWidth) || 0, comp.distribution);
    const ci = comp.sensitivity !== undefined && comp.sensitivity !== '' ? Number(comp.sensitivity) : 1;
    const contribution = ci * uB;

    const distOpts = DIST_OPTIONS.map(d =>
      `<option value="${d.value}" ${comp.distribution === d.value ? 'selected' : ''}>${i18n.t(d.labelKey)}</option>`
    ).join('');

    const paramOpts = state.params.map(p =>
      `<option value="${escHtml(p)}" ${comp.param === p ? 'selected' : ''}>${escHtml(p)}</option>`
    ).join('');

    const distCls = DIST_OPTIONS.find(d => d.value === comp.distribution)?.cssClass || 'dist-rect';
    const divLabel = Calc.getDivisorLabel(comp.distribution);

    return `
    <div class="typeb-card" data-id="${comp.id}">
      <div class="typeb-card-header">
        <input type="text" value="${escHtml(comp.name)}" data-id="${comp.id}" data-field="name"
          placeholder="${i18n.t('label_component')}" />
        <span class="dist-badge ${distCls}">${comp.distribution.toUpperCase()}</span>
        <button class="btn btn-sm btn-danger btn-remove-tb" data-id="${comp.id}" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="typeb-card-body">
        <div class="form-group">
          <label>${i18n.t('label_component')} (param)</label>
          <select data-id="${comp.id}" data-field="param">${paramOpts}</select>
        </div>
        <div class="form-group">
          <label>${i18n.t('label_unit')}</label>
          <input type="text" value="${escHtml(comp.unit || '')}"
            data-id="${comp.id}" data-field="unit" placeholder="e.g. mg, mV" />
        </div>
        <div class="form-group">
          <label>${i18n.t('label_half_width')} (a)</label>
          <input type="number" step="any" value="${comp.halfWidth}"
            data-id="${comp.id}" data-field="halfWidth" />
        </div>
        <div class="form-group">
          <label>${i18n.t('label_distribution')}</label>
          <select data-id="${comp.id}" data-field="distribution">${distOpts}</select>
        </div>
        <div class="form-group">
          <label>${i18n.t('label_divisor')} = ${divLabel}</label>
          <div class="formula-box">u_B = a / ${divLabel} = ${Calc.fmtSci(uB)}</div>
        </div>
        <div class="form-group">
          <label>${i18n.t('label_sensitivity')} (c_i)</label>
          <input type="number" step="any" value="${ci}"
            data-id="${comp.id}" data-field="sensitivity" />
        </div>
        <div class="form-group">
          <label>${i18n.t('label_std_unc')}</label>
          <div class="formula-box" style="color:var(--accent)">${Calc.fmtSci(uB)}</div>
        </div>
        <div class="form-group">
          <label>${i18n.t('label_contribution')} (c_i · u_B)</label>
          <div class="formula-box" style="color:var(--success)">${Calc.fmtSci(contribution)}</div>
        </div>
      </div>
    </div>`;
  }

  function renderSummary(state) {
    const sumEl = document.getElementById('typeb-summary');
    if (!sumEl) return;

    // Compute combined uB (RSS)
    const comps = state.typeB.map(comp => {
      const uB = Calc.typeB(Number(comp.halfWidth) || 0, comp.distribution);
      const ci = comp.sensitivity !== undefined && comp.sensitivity !== '' ? Number(comp.sensitivity) : 1;
      return { uB, ci, ciui: ci * uB };
    });

    const uB_combined = Math.sqrt(comps.reduce((s, c) => s + c.ciui * c.ciui, 0));

    sumEl.innerHTML = `
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-label">${i18n.t('kpi_ub')} (RSS)</span>
          <span class="stat-value" style="color:var(--warning)">${Calc.fmtSci(uB_combined)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Components</span>
          <span class="stat-value">${state.typeB.length}</span>
        </div>
      </div>`;
  }

  function onFieldChange(e) {
    const id    = e.target.dataset.id;
    const field = e.target.dataset.field;
    let val     = e.target.value;

    if (field === 'halfWidth' || field === 'sensitivity') val = parseFloat(val) || 0;

    appState.updateTypeBComponent(id, { [field]: val });
  }

  function calcCombined() {
    const state  = appState.get();
    const typeA  = state.typeA;
    const typeB  = state.typeB;

    if (!Object.keys(typeA).length) {
      showToast(i18n.t('toast_need_data'), 'error');
      switchTab('data');
      return;
    }

    if (!typeB.length) {
      showToast(i18n.t('toast_need_typeb'), 'error');
      return;
    }

    // Use primary param's uA
    const primaryParam = state.params[0];
    const uA = typeA[primaryParam]?.uA || 0;
    const n  = typeA[primaryParam]?.n  || state.n;

    // Build type B contributions
    const tbComps = typeB.map(comp => ({
      ...comp,
      uB: Calc.typeB(Number(comp.halfWidth) || 0, comp.distribution),
    }));

    const result = Calc.combined(uA, tbComps);
    const U95    = Calc.expanded(result.uc, 2);
    const U99    = Calc.expanded(result.uc, 3);
    const nu_eff = Calc.welchSatterthwaite(uA, n, result.contributions);

    const combined = {
      ...result,
      U95, U99, nu_eff,
      uA,
      mean: typeA[primaryParam]?.mean,
      param: primaryParam,
      relU95: Calc.relative(U95, typeA[primaryParam]?.mean),
    };

    appState.set({ combined });
    showToast(i18n.t('toast_calc_done'), 'success');
    switchTab('results');
    Results.render();
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* Public API for preset loading */
  function loadPresetComponents(components) {
    // Clear existing
    appState.set({ typeB: [] });
    components.forEach(c => addComponent(c));
  }

  return { init, render, addComponent, loadPresetComponents };

})();

window.TypeB = TypeB;
