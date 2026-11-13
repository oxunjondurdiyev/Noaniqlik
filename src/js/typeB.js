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

  /* Means of all inputs (needed when a half-width is written as an expression) */
  function inputMeans(state) {
    const m = {};
    state.params.forEach(p => {
      const opt = ((state.settings || {}).typeA || {})[p] || {};
      const ta = Calc.typeAx(state.measurements[p] || [], { ...opt, dirs: state.directions || [] });
      m[p] = ta ? ta.mean : NaN;
    });
    return m;
  }

  function compStd(comp, state, means) {
    let a = 0, bad = false;
    try { a = Calc.valueOrExpr(comp.halfWidth, state.params, means || inputMeans(state)); if (!isFinite(a)) { a = 0; bad = true; } }
    catch (_) { bad = true; }
    const std  = Calc.typeB(a, comp.distribution, comp.k);
    const mult = (comp.sensitivity === undefined || comp.sensitivity === '' || comp.sensitivity === null)
      ? 1 : Number(comp.sensitivity) || 0;
    return { std, mult, u: Math.abs(mult) * std, a, bad };
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
    const { std, mult, u, a, bad } = compStd(comp, state);
    const isExpr = typeof comp.halfWidth === 'string' && !isFinite(Calc.toNum(comp.halfWidth)) && comp.halfWidth.trim() !== '';
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
    <div class="typeb-card" data-id="${escHtml(comp.id)}">
      <div class="typeb-card-header">
        <input type="text" value="${escHtml(comp.name)}" data-id="${escHtml(comp.id)}" data-field="name"
          placeholder="${i18n.t('label_component')}" />
        <span class="dist-badge ${distCls}">${escHtml(comp.param || '')}</span>
        <button class="btn btn-sm btn-danger btn-remove-tb" data-id="${escHtml(comp.id)}" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="typeb-card-body">
        <div class="form-group">
          <label>${i18n.t('label_param')}</label>
          <select data-id="${escHtml(comp.id)}" data-field="param">${paramOpts}</select>
        </div>
        <div class="form-group">
          <label>${i18n.t('label_distribution')}</label>
          <select data-id="${escHtml(comp.id)}" data-field="distribution">${distOpts}</select>
        </div>
        <div class="form-group">
          <label>${aLabel}</label>
          <input type="text" inputmode="decimal" value="${escHtml(String(comp.halfWidth))}"
            data-id="${escHtml(comp.id)}" data-field="halfWidth" placeholder="0.0005  ${escHtml(i18n.t('hw_expr_ph'))}" autocomplete="off"
            ${bad ? 'style="border-color:var(--danger)"' : ''} />
          ${isExpr ? `<span class="text-xs ${bad ? '' : 'text-muted'}" style="${bad ? 'color:var(--danger)' : ''}">${bad ? i18n.t('err_bad_formula') : '= ' + Calc.fmtSci(a)}</span>` : ''}
        </div>
        ${dist === 'normal' ? `
        <div class="form-group">
          <label>${i18n.t('label_k_cert')}</label>
          <input type="text" inputmode="decimal" value="${escHtml(String(comp.k || 2))}"
            data-id="${escHtml(comp.id)}" data-field="k" placeholder="2" autocomplete="off" />
        </div>` : `
        <div class="form-group">
          <label>${i18n.t('label_unit')}</label>
          <input type="text" value="${escHtml(comp.unit || '')}"
            data-id="${escHtml(comp.id)}" data-field="unit" placeholder="g, mL, V…" />
        </div>`}
        <div class="form-group">
          <label title="${escHtml(i18n.t('label_mult_hint'))}">${i18n.t('label_mult')} ⓘ</label>
          <input type="text" inputmode="decimal" value="${escHtml(String(comp.sensitivity ?? 1))}"
            data-id="${escHtml(comp.id)}" data-field="sensitivity" autocomplete="off" />
        </div>
        <div class="form-group">
          <label title="${escHtml(i18n.t('label_nu_hint'))}">${i18n.t('label_nu')} ⓘ</label>
          <input type="text" inputmode="decimal" value="${escHtml(String(comp.nu ?? ''))}"
            data-id="${escHtml(comp.id)}" data-field="nu" placeholder="∞" autocomplete="off" />
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
      const means = inputMeans(state);
      const uB = Math.sqrt(own.reduce((s, c) => s + compStd(c, state, means).u ** 2, 0));
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
    // evaluate() bilan bir xil A tur (↑/↓ va usul hisobga olingan) — ekrandagi r hisobdagi r ga teng (P03)
    state.params.forEach(p => {
      const opt = ((settings.typeA || {})[p]) || {};
      stats[p] = Calc.typeAx(state.measurements[p] || [], { ...opt, dirs: state.directions || [] });
    });

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
        <div class="settings-grid">
          <div class="form-group">
            <label>${i18n.t('label_P')}</label>
            <select id="sel-coverage-p">${pOpts}</select>
          </div>
          <div class="form-group">
            <label>${i18n.t('set_kmethod')}</label>
            <select data-set="kMethod">
              <option value="nu" ${settings.kMethod !== 'k2' ? 'selected' : ''}>${i18n.t('set_k_nu')}</option>
              <option value="k2" ${settings.kMethod === 'k2' ? 'selected' : ''}>${i18n.t('set_k_2')}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${i18n.t('set_nu_rule')}</label>
            <select data-set="nuRule" ${settings.kMethod === 'k2' ? 'disabled' : ''}>
              ${['floor', 'interpolate', 'exact'].map(v =>
                `<option value="${v}" ${(settings.nuRule || 'floor') === v ? 'selected' : ''}>${i18n.t('nu_rule_' + v)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>${i18n.t('set_rounding')}</label>
            <select data-set="rounding">
              <option value="normal" ${settings.rounding !== 'up' ? 'selected' : ''}>${i18n.t('set_round_normal')}</option>
              <option value="up" ${settings.rounding === 'up' ? 'selected' : ''}>${i18n.t('set_round_up')}</option>
            </select>
          </div>
        </div>
        <label class="model-check" title="${escHtml(i18n.t('set_second_order_hint'))}">
          <input type="checkbox" id="chk-second-order" ${settings.secondOrder === true ? 'checked' : ''} />
          <span>${i18n.t('set_second_order')} ⓘ</span>
        </label>
        <div class="model-card-title" style="margin-top:.9rem">${i18n.t('conf_title')} <span class="text-muted text-xs">ISO/IEC 17025 7.8.6 · JCGM 106 · ILAC G8</span></div>
        <div class="settings-grid">
          <div class="form-group">
            <label title="${escHtml(i18n.t('set_mpe_hint'))}">${i18n.t('set_mpe')} ⓘ</label>
            <input type="text" data-set="mpe" class="mono" value="${escHtml(String(settings.mpe ?? ''))}" placeholder="1   ${escHtml(i18n.t('hw_expr_ph'))}" autocomplete="off" />
          </div>
          <div class="form-group">
            <label>${i18n.t('set_range')}</label>
            <input type="text" inputmode="decimal" data-set="range" value="${escHtml(String(settings.range ?? ''))}" placeholder="20" autocomplete="off" />
          </div>
          <div class="form-group">
            <label title="${escHtml(i18n.t('set_cmc_hint'))}">CMC ⓘ</label>
            <input type="text" inputmode="decimal" data-set="cmc" value="${escHtml(String(settings.cmc ?? ''))}" placeholder="—" autocomplete="off" />
          </div>
        </div>
        <p class="text-muted text-xs">${i18n.t('conf_hint')}</p>
      </div>`;

    el.querySelectorAll('[data-set]').forEach(inp => {
      inp.addEventListener('change', () => {
        const v = inp.value.trim().replace(/^(-?\d+),(\d+)$/, '$1.$2');
        appState.set({ settings: { ...(appState.get('settings') || {}), [inp.dataset.set]: v }, combined: null });
      });
    });

    el.querySelectorAll('[data-cov]').forEach(inp => {
      inp.addEventListener('change', () => {
        const v = Calc.toNum(inp.value);
        appState.set({ covB: { ...(appState.get('covB') || {}), [inp.dataset.cov]: isFinite(v) ? v : 0 }, combined: null });
      });
    });
    el.querySelector('#chk-second-order').addEventListener('change', e => {
      appState.set({ settings: { ...(appState.get('settings') || {}), secondOrder: e.target.checked }, combined: null });
    });
    el.querySelector('#sel-coverage-p').addEventListener('change', e => {
      appState.set({ settings: { ...(appState.get('settings') || {}), P: Number(e.target.value) }, combined: null });
    });
  }

  function onFieldChange(e) {
    const id    = e.target.dataset.id;
    const field = e.target.dataset.field;
    let val     = e.target.value;

    if (field === 'halfWidth') {
      const n = Calc.toNum(val);
      val = isFinite(n) ? n : (val.trim() || 0);           // keep expressions like "0.0002*I + 0.002"
    } else if (field === 'sensitivity' || field === 'k') {
      const n = Calc.toNum(val);
      val = isFinite(n) ? n : (field === 'k' ? 2 : 1);
    } else if (field === 'nu') {
      const n = Calc.toNum(val);
      val = isFinite(n) && n > 0 ? n : '';
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
        bad_halfwidth: i18n.t('err_bad_halfwidth') + ': «' + (result.detail || '') + '»',
        bad_mpe:      i18n.t('err_bad_mpe'),
        negative_variance: i18n.t('err_negative_variance'),
        bad_correlation: i18n.t('err_bad_correlation') + (result.detail ? ': ' + result.detail.replace('|', ' ↔ ') : ''),
        unit_mismatch: i18n.t('err_unit_mismatch') + (result.detail ? ': ' + result.detail : ''),
        unit_fn_arg:  i18n.t('err_unit_fn_arg') + (result.detail ? ': ' + result.detail : ''),
        multi_output: i18n.t('err_multi_output'),
        bad_spec:     i18n.t('err_bad_spec'),
      }[result.error] || i18n.t('toast_need_data');
      showToast(msg, 'error', 4500);
      if (!['formula_eval', 'bad_halfwidth', 'bad_mpe', 'negative_variance', 'bad_correlation'].includes(result.error)) switchTab('data');
      return;
    }

    // Keep the Type A table in sync with what was actually used
    const typeA = {};
    state.params.forEach(p => {
      const opt = ((state.settings || {}).typeA || {})[p] || {};
      const ta = Calc.typeAx(state.measurements[p] || [], { ...opt, dirs: state.directions || [] });
      if (ta) typeA[p] = ta;
    });

    appState.set({ typeA, combined: result });
    showToast(i18n.t('toast_calc_done'), 'success');
    switchTab('results');
    Results.render();
  }

  // Yagona escape: src/ui/escape.js (P02)
  const escHtml = window.escHtml;

  /* Public API for preset loading */
  function loadPresetComponents(components) {
    appState.set({ typeB: [] });
    components.forEach(c => addComponent(c));
  }

  return { init, render, addComponent, loadPresetComponents };

})();

window.TypeB = TypeB;
