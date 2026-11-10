/* ═══════════════════════════════════════════════════════════════
   TABLE.JS — Dynamic measurement data table with Type A stats
═══════════════════════════════════════════════════════════════ */

const Table = (() => {

  let _currentParam = null;

  function init() {
    document.getElementById('btn-fill-sample').addEventListener('click', fillSample);
    document.getElementById('btn-clear-data').addEventListener('click', clearData);
    document.getElementById('btn-calc-typea').addEventListener('click', calcTypeA);

    // Re-render hint + placeholders when preset changes
    ['sidebar-preset', 'inp-preset'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => render());
    });

    appState.subscribe((changes, state) => {
      if (!changes || changes.params !== undefined || changes.measurements !== undefined || changes.n !== undefined ||
          changes.model !== undefined || changes.settings !== undefined || changes.directions !== undefined) {
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
    renderModelBox();
    renderTable();
    renderTypeASummary();
  }

  function renderParamTabs() {
    const state = appState.get();
    _currentParam = _currentParam || state.params[0];
  }

  /* Type A statistics of one parameter with its chosen method (↑/↓, s_p, COOMET) */
  function taFor(state, p) {
    const opt = ((state.settings || {}).typeA || {})[p] || {};
    return Calc.typeAx(state.measurements[p] || [], { ...opt, dirs: state.directions || [] });
  }
  function anyDirectional(state) {
    const m = (state.settings || {}).typeA || {};
    return state.params.some(p => m[p] && m[p].directional);
  }

  /* Preset whose parameters match the current session (for hints/placeholders) */
  function activePresetKey() {
    const params = appState.get('params');
    const ids = ['sidebar-preset', 'inp-preset'];
    for (const id of ids) {
      const el = document.getElementById(id);
      const key = el ? el.value : '';
      const pd = key && window.PRESETS ? window.PRESETS[key] : null;
      if (pd && pd.params.join('|') === params.join('|')) return key;
    }
    return '';
  }

  /* ── Measurement model: y = f(x1…xN) ── */
  function renderModelBox() {
    const box = document.getElementById('model-box');
    if (!box) return;
    if (box.contains(document.activeElement) && document.activeElement.tagName === 'INPUT' &&
        document.activeElement.type === 'text') { updateModelStatus(); return; }

    const state = appState.get();
    const model = state.model || {};
    const paired = !state.settings || state.settings.paired !== false;
    const chips = state.params.map(p => `<button type="button" class="model-chip" data-ins="${escHtml(p)}">${escHtml(p)}</button>`).join('');

    box.innerHTML = `
      <div class="model-card">
        <div class="model-card-title">${i18n.t('model_title')} <span class="text-muted text-xs">GUM 4.1</span></div>
        <div class="model-row">
          <div class="form-group model-formula-group">
            <label>${i18n.t('model_formula')}</label>
            <input type="text" id="model-formula" class="mono" value="${escHtml(model.formula || '')}"
              placeholder="${escHtml(i18n.t('model_ph'))}" autocomplete="off" autocorrect="off" spellcheck="false" />
          </div>
          <div class="form-group model-unit-group">
            <label>${i18n.t('model_unit')}</label>
            <input type="text" id="model-unit" value="${escHtml(model.unit || '')}" placeholder="g/cm³" autocomplete="off" />
          </div>
        </div>
        <div class="model-chips">${chips}
          <span class="text-muted text-xs">+ − × / ^ ( ) · sqrt ln log exp sin cos tan abs pi</span>
        </div>
        <div id="model-status" class="model-status"></div>
        ${state.params.length > 1 ? `
        <label class="model-check">
          <input type="checkbox" id="model-paired" ${paired ? 'checked' : ''} />
          <span>${i18n.t('model_paired')}</span>
        </label>` : ''}
        ${renderMethodTable(state)}
      </div>`;

    const fEl = box.querySelector('#model-formula');
    const saveModel = () => {
      const cur = appState.get('model') || {};
      const formula = fEl.value.trim();
      const unit = box.querySelector('#model-unit').value.trim();
      if (cur.formula !== formula || cur.unit !== unit) appState.set({ model: { formula, unit }, combined: null });
      updateModelStatus();
    };
    fEl.addEventListener('input', updateModelStatus);
    fEl.addEventListener('change', saveModel);
    box.querySelector('#model-unit').addEventListener('change', saveModel);
    box.querySelectorAll('.model-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const pos = fEl.selectionStart ?? fEl.value.length;
        fEl.value = fEl.value.slice(0, pos) + btn.dataset.ins + fEl.value.slice(fEl.selectionEnd ?? pos);
        saveModel();
        fEl.focus();
        const np = pos + btn.dataset.ins.length;
        fEl.setSelectionRange(np, np);
      });
    });
    box.querySelectorAll('[data-am]').forEach(el => {
      el.addEventListener('change', () => {
        const p = el.dataset.param, field = el.dataset.am;
        const settings = appState.get('settings') || {};
        const all = { ...(settings.typeA || {}) };
        const cur = { method: 1, ...(all[p] || {}) };
        if (field === 'directional') cur.directional = el.checked;
        else if (field === 'method') cur.method = Number(el.value);
        else cur[field] = el.value.replace(',', '.');
        all[p] = cur;
        appState.set({ settings: { ...settings, typeA: all }, combined: null });
      });
    });
    const pEl = box.querySelector('#model-paired');
    if (pEl) pEl.addEventListener('change', () => {
      appState.set({ settings: { ...(appState.get('settings') || {}), paired: pEl.checked }, combined: null });
    });
    updateModelStatus();
  }

  function renderMethodTable(state) {
    const m = (state.settings || {}).typeA || {};
    const rows = state.params.map(p => {
      const o = { method: 1, ...(m[p] || {}) };
      const ta = taFor(state, p);
      const n = ta ? ta.n : 0;
      const sel = [1, 2, 3].map(v =>
        `<option value="${v}" ${o.method === v ? 'selected' : ''}>${i18n.t('am_' + v)}</option>`).join('');
      return `<tr>
        <td><strong>${escHtml(p)}</strong>${n === 1 ? ` <span class="text-muted text-xs">(${i18n.t('am_const')})</span>` : ''}</td>
        <td><select data-am="method" data-param="${escHtml(p)}">${sel}</select></td>
        <td>${o.method === 2 ? `<input type="text" inputmode="decimal" data-am="sp" data-param="${escHtml(p)}" value="${escHtml(String(o.sp ?? ''))}" placeholder="s_p" />` : '<span class="text-muted">—</span>'}</td>
        <td>${o.method === 2 ? `<input type="text" inputmode="decimal" data-am="nup" data-param="${escHtml(p)}" value="${escHtml(String(o.nup ?? ''))}" placeholder="ν_p" />` : '<span class="text-muted">—</span>'}</td>
        <td style="text-align:center"><input type="checkbox" data-am="directional" data-param="${escHtml(p)}" ${o.directional ? 'checked' : ''} style="width:auto" /></td>
      </tr>`;
    }).join('');
    return `
      <details class="model-methods" ${state.params.some(p => m[p] && (m[p].method > 1 || m[p].directional)) ? 'open' : ''}>
        <summary>${i18n.t('am_title')}</summary>
        <div class="table-scroll" style="padding:0">
          <table class="data-table math-head am-table">
            <thead><tr>
              <th>${i18n.t('label_param')}</th><th>${i18n.t('am_method')}</th><th>s_p</th><th>ν_p</th><th>↑/↓</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="text-muted text-xs" style="margin-top:.4rem">${i18n.t('am_hint')}</p>
      </details>`;
  }

  function updateModelStatus() {
    const el  = document.getElementById('model-status');
    const fEl = document.getElementById('model-formula');
    if (!el || !fEl) return;
    const state = appState.get();
    const { symbol, expr } = Calc.splitFormula(fEl.value);
    if (!expr) {
      el.className = 'model-status' + (state.params.length > 1 ? ' warn' : '');
      el.textContent = state.params.length > 1 ? i18n.t('err_need_formula') : i18n.t('model_single');
      return;
    }
    try {
      const f = Calc.compile(expr, state.params);
      const env = {};
      let complete = true;
      state.params.forEach(p => {
        const ta = taFor(state, p);
        if (ta) env[p] = ta.mean; else complete = false;
      });
      const y = complete ? f(env) : NaN;
      el.className = 'model-status ok';
      el.textContent = '✓ ' + (symbol || 'y') + ' = ' + expr +
        (isFinite(y) ? '  →  ' + Calc.fmtSci(y, 8) : '');
    } catch (err) {
      const d = String(err.message || '');
      el.className = 'model-status err';
      el.textContent = '✗ ' + i18n.t('err_bad_formula') + (d.startsWith('unknown:') ? ': «' + d.slice(8) + '»' : '');
    }
  }

  /* ── Hint banner: shown above table based on active preset ── */
  function renderHintBox() {
    const box = document.getElementById('table-hint-box');
    if (!box) return;

    // Find active preset key from sidebar or welcome select
    const key = activePresetKey();
    const preset = (window.PRESETS && key) ? window.PRESETS[key] : null;

    if (!preset) { box.innerHTML = ''; return; }

    const state = appState.get();
    const paramHints = state.params.map(p => {
      const sample = preset.sampleData && preset.sampleData[p];
      if (!sample) return '';
      const min = Math.min(...sample).toFixed(4);
      const max = Math.max(...sample).toFixed(4);
      const ex  = sample[0];
      return `<span class="hint-param"><b>${escHtml(p)}</b>: ${escHtml(String(ex))} ${escHtml(preset.unit || '')} &nbsp;<span class="hint-range">(diapason: ${min} … ${max})</span></span>`;
    }).filter(Boolean).join('');

    box.innerHTML = `
      <div class="table-hint">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;opacity:.7"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div>
          <strong>${escHtml(preset.name)}</strong> — quyidagi turdagi qiymatlarni kiriting:
          <div class="hint-params">${paramHints || `Namunani to'ldirish uchun "Namuna ma'lumotlarni to'ldirish" tugmasini bosing.`}</div>
        </div>
      </div>`;
  }

  function renderTable() {
    const state = appState.get();
    const n     = state.n;
    const head  = document.getElementById('table-head');
    const body  = document.getElementById('table-body');
    const foot  = document.getElementById('table-foot');

    renderHintBox();

    const paramCols = state.params.map(p => `<th style="text-transform:none">${escHtml(p)}</th>`).join('');
    const dirOn = anyDirectional(state);
    const dirs = state.directions || [];

    head.innerHTML = `
      <tr>
        <th>${i18n.t('col_i')}</th>
        ${dirOn ? `<th title="${escHtml(i18n.t('dir_hint'))}">↑/↓</th>` : ''}
        ${paramCols}
        <th class="cell-num">${i18n.t('col_dev')} (${escHtml(state.params[0])})</th>
        <th class="cell-num">${i18n.t('col_dev2')}</th>
      </tr>`;

    const primaryParam = state.params[0];
    const ta = taFor(state, primaryParam);
    const stats = {};
    state.params.forEach(p => { stats[p] = taFor(state, p); });

    // Get sample placeholders from active preset
    const presetKey = activePresetKey();
    const preset = (window.PRESETS && presetKey) ? window.PRESETS[presetKey] : null;

    let rows = '';
    for (let i = 0; i < n; i++) {
      const paramInputs = state.params.map(p => {
        const vals = state.measurements[p] || Array(n).fill('');
        const v = vals[i] !== undefined ? vals[i] : '';
        const sampleVal = preset && preset.sampleData && preset.sampleData[p] && preset.sampleData[p][i];
        const ph = sampleVal !== undefined ? String(sampleVal) : (preset ? String(preset.sampleData?.[p]?.[0] ?? '') : '');
        return `<td><input type="text" inputmode="decimal" class="meas-input"
          data-param="${escHtml(p)}" data-idx="${i}" value="${escHtml(String(v))}"
          placeholder="${escHtml(ph)}"
          autocomplete="off" autocorrect="off" spellcheck="false" /></td>`;
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

      const d = dirs[i] || '';
      rows += `<tr>
        <td class="text-muted text-sm">${i + 1}</td>
        ${dirOn ? `<td><button type="button" class="dir-btn ${d === '↑' ? 'up' : d === '↓' ? 'dn' : ''}" data-dir-idx="${i}">${d || '·'}</button></td>` : ''}
        ${paramInputs}
        ${devCell}
        ${dev2Cell}
      </tr>`;
    }
    body.innerHTML = rows;

    // Footer stats
    const fmtOrDash = v => (v !== null && v !== undefined && !isNaN(v)) ? Calc.fmt(v) : '—';
    const footStats = state.params.map(p => {
      const ta2 = stats[p];
      if (!ta2) return `<td class="cell-num text-muted">—</td>`;
      return `<td class="cell-num mono">${fmtOrDash(ta2.mean)}</td>`;
    }).join('');

    foot.innerHTML = `
      <tr>
        <td class="text-muted" ${dirOn ? 'colspan="2"' : ''}>${i18n.t('foot_mean')}</td>
        ${footStats}
        <td class="cell-num">—</td>
        <td class="cell-num">${ta ? fmtOrDash(ta.sEff * ta.sEff) : '—'}</td>
      </tr>
      <tr>
        <td class="text-muted" ${dirOn ? 'colspan="2"' : ''}>${i18n.t('foot_std')}</td>
        ${state.params.map(p => {
          const r = stats[p];
          return `<td class="cell-num mono">${r ? fmtOrDash(r.sEff) : '—'}</td>`;
        }).join('')}
        <td colspan="2" class="cell-num text-muted"></td>
      </tr>
      <tr>
        <td class="text-muted" ${dirOn ? 'colspan="2"' : ''}>${i18n.t('foot_ua')}</td>
        ${state.params.map(p => {
          const r = stats[p];
          return `<td class="cell-num mono" style="color:var(--accent)">${r ? fmtOrDash(r.uA) : '—'}</td>`;
        }).join('')}
        <td colspan="2" class="cell-num text-muted"></td>
      </tr>
      ${state.params.filter(p => stats[p] && stats[p].directional).map(p => {
        const r = stats[p];
        return `<tr><td class="text-muted" colspan="${state.params.length + (dirOn ? 4 : 3)}" style="text-transform:none">
          ${escHtml(p)}: x̄↑ = ${Calc.fmt(r.meanUp)} (n=${r.nUp}), x̄↓ = ${Calc.fmt(r.meanDn)} (n=${r.nDn}),
          x̄ = ${Calc.fmt(r.mean)}, ${i18n.t('dir_h')} h = ${Calc.fmt(r.h)}, ν = ${r.nu}</td></tr>`;
      }).join('')}`;

    body.querySelectorAll('.dir-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.dirIdx);
        const cur = [...(appState.get('directions') || [])];
        while (cur.length < appState.get('n')) cur.push('');
        cur[i] = cur[i] === '↑' ? '↓' : cur[i] === '↓' ? '' : '↑';
        appState.set({ directions: cur, combined: null });
      });
    });

    // Attach input listeners
    body.querySelectorAll('.meas-input').forEach(inp => {
      inp.addEventListener('keydown', onCellKeyDown);
      inp.addEventListener('input',   onCellInput);
      inp.addEventListener('change',  onCellChange);
    });
  }

  /* Replace comma → period in real-time without saving to state (no re-render) */
  function onCellInput(e) {
    const inp = e.target;
    if (inp.value.includes(',')) {
      const pos = inp.selectionStart;
      inp.value = inp.value.replace(',', '.');
      inp.setSelectionRange(pos, pos);
    }
  }

  /* Save on blur */
  function onCellChange(e) {
    saveCell(e.target);
  }

  /* Enter / ArrowDown / ArrowUp → save + move focus */
  function onCellKeyDown(e) {
    const inp    = e.target;
    const state  = appState.get();
    const param  = inp.dataset.param;
    const row    = parseInt(inp.dataset.idx, 10);
    const params = state.params;
    const col    = params.indexOf(param);

    let targetRow = row;
    let targetCol = col;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetRow = row + 1;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetRow = row - 1;
    } else if (e.key === 'Tab') {
      // Browser handles Tab navigation; just save current cell first
      saveCell(inp);
      return;
    } else {
      return;
    }

    if (targetRow < 0 || targetRow >= state.n) return;

    saveCell(inp);

    const targetParam = params[targetCol];
    setTimeout(() => {
      const next = document.querySelector(
        `.meas-input[data-param="${CSS.escape(targetParam)}"][data-idx="${targetRow}"]`
      );
      if (next) { next.focus(); next.select(); }
    }, 0);
  }

  /* Save a single cell to state; skip if value unchanged (avoids needless re-render) */
  function saveCell(inp) {
    const param = inp.dataset.param;
    const idx   = parseInt(inp.dataset.idx, 10);
    const val   = inp.value.replace(',', '.');

    const state = appState.get();
    const vals  = [...(state.measurements[param] || Array(state.n).fill(''))];
    if (String(vals[idx]) === val) return;
    vals[idx] = val;
    appState.setMeasurements(param, vals);
  }

  function renderTypeASummary() {
    const state = appState.get();
    const el    = document.getElementById('type-a-summary');
    if (!el) return;

    const results = state.params.map(p => taFor(state, p)).filter(Boolean);

    if (results.length === 0) {
      el.innerHTML = '';
      return;
    }

    const items = state.params.map(p => {
      const r = taFor(state, p);
      if (!r) return '';
      return `
        <div class="stat-item">
          <span class="stat-label" style="text-transform:none">${escHtml(p)} — u_A</span>
          <span class="stat-value" style="color:var(--accent)">${Calc.fmt(r.uA)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label" style="text-transform:none">${escHtml(p)} — x̄</span>
          <span class="stat-value">${Calc.fmt(r.mean)}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label" style="text-transform:none">${escHtml(p)} — s</span>
          <span class="stat-value">${Calc.fmt(r.sEff)}</span>
        </div>`;
    }).join('<div style="width:1px;background:var(--border);margin:0 .5rem;"></div>');

    el.innerHTML = `<div class="stats-row">${items}</div>`;
  }

  function fillSample() {
    const state = appState.get();
    const n     = state.n;
    state.params.forEach(p => {
      const mean   = 10 + Math.random() * 90;
      const spread = mean * 0.005;
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
      const result = taFor(state, p);
      if (!result) { allOk = false; return; }
      typeA[p] = result;
    });

    if (!allOk) {
      showToast(i18n.t('toast_need_data'), 'error');
      return;
    }

    // The model must be valid before moving on
    const { expr } = Calc.splitFormula((state.model || {}).formula);
    if (!expr && state.params.length > 1) {
      showToast(i18n.t('err_need_formula'), 'error');
      const fEl = document.getElementById('model-formula');
      if (fEl) fEl.focus();
      return;
    }
    if (expr) {
      try { Calc.compile(expr, state.params); }
      catch (_) { showToast(i18n.t('err_bad_formula'), 'error'); return; }
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
