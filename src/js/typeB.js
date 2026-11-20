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
    // P06 (JCGM 101:2008 §6.4.3, §6.4.4, §6.4.10; log-normal — unverified)
    { value: 'trap',    labelKey: 'dist_trap',    cssClass: 'dist-triang' },
    { value: 'ctrap',   labelKey: 'dist_ctrap',   cssClass: 'dist-rect'   },
    { value: 'exp',     labelKey: 'dist_exp',     cssClass: 'dist-normal' },
    { value: 'lognorm', labelKey: 'dist_lognorm', cssClass: 'dist-normal' },
  ];

  const P_OPTIONS = [
    { value: 0.95,   label: '95 %' },
    { value: 0.9545, label: '95.45 %  (k ≈ 2)' },
    { value: 0.99,   label: '99 %' },
    { value: 0.9973, label: '99.73 %  (k ≈ 3)' },
  ];

  /* ─── P16: manba varag'i (telefonda pastdan chiqadi — bottom sheet; desktopda yon panel) ───
     Yangi forma yozilmagan: aynan shu kartaning maydonlari (data-field → onFieldChange) varaq ko'rinishida ochiladi.
     Jonli "u = a/√3 = …" — dvigatel funksiyalari orqali (Calc.typeB, Calc.getDivisorLabel); UI da formula takrorlanmaydi. */
  const MAIN_DISTS = ['normal', 'rect', 'triang', 'ushape', 'resol'];
  let openId = null;        // ochiq varaqdagi manba
  let returnFocus = null;   // yopilganda fokus qaytadigan tugma (data-tb-edit)
  function openSheet(id) {
    openId = id;
    render();
    const card = document.querySelector('.typeb-card.is-open');
    const first = card && card.querySelector('[data-field="halfWidth"]');
    if (first) first.focus();
  }
  function closeSheet() {
    if (!openId) return;
    const id = openId;
    openId = null;
    render();
    const btn = Array.from(document.querySelectorAll('[data-tb-edit]')).find(b => b.dataset.tbEdit === id);
    if (btn) btn.focus();
  }

  function init() {
    document.getElementById('btn-add-typeb').addEventListener('click', addComponent);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && openId) { e.preventDefault(); closeSheet(); } });
    document.addEventListener('tabchange', () => { if (openId) { openId = null; render(); } });
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
    if (!isPreset) { const list = appState.get('typeB'); const last = list[list.length - 1]; if (last) openSheet(last.id); }
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
    const std  = Calc.typeB(a, comp.distribution, comp.k, comp);
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
      openId = null;
      document.body.classList.remove('sheet-open');
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
        btn.addEventListener('click', () => { if (openId === btn.dataset.id) openId = null; appState.removeTypeBComponent(btn.dataset.id); });
      });
      // P16: varaq — ochish / yopish, taqsimot segmenti, jonli u, reestr
      if (openId && !state.typeB.some(c => c.id === openId)) openId = null;
      el.insertAdjacentHTML('beforeend', `<div class="sheet-backdrop" data-tb-close="1"${openId ? '' : ' hidden'}></div>`);
      el.querySelectorAll('[data-tb-edit]').forEach(b => b.addEventListener('click', () => openSheet(b.dataset.tbEdit)));
      el.querySelectorAll('[data-tb-close]').forEach(b => b.addEventListener('click', closeSheet));
      el.querySelectorAll('[data-tb-dist]').forEach(b => b.addEventListener('click', () => setField(b.dataset.id, 'distribution', b.dataset.tbDist)));
      el.querySelectorAll('[data-tb-registry]').forEach(b => b.addEventListener('click', () => { closeSheet(); const r = document.getElementById('btn-typeb-registry'); if (r) r.click(); }));
      const open = el.querySelector('.typeb-card.is-open');
      if (open) {
        open.querySelectorAll('input[data-field]').forEach(inp => inp.addEventListener('input', () => livePreview(open)));
        document.body.classList.add('sheet-open');
      } else document.body.classList.remove('sheet-open');
    }

    renderSettings(state);
  }

  function renderComponent(comp, state) {
    const { std, mult, u, a, bad } = compStd(comp, state);
    const isExpr = typeof comp.halfWidth === 'string' && !isFinite(Calc.toNum(comp.halfWidth)) && comp.halfWidth.trim() !== '';
    const dist = comp.distribution;

    const paramOpts = state.params.map(p =>
      `<option value="${escHtml(p)}" ${comp.param === p ? 'selected' : ''}>${escHtml(p)}</option>`
    ).join('');

    const distCls  = DIST_OPTIONS.find(d => d.value === dist)?.cssClass || 'dist-rect';
    const divLabel = Calc.getDivisorLabel(dist, comp.k);
    const withK    = dist === 'normal' || dist === 'lognorm';
    const aLabel   = withK ? i18n.t('label_a_normal')
                   : dist === 'resol'  ? i18n.t('label_a_resol')
                   : dist === 'exp'    ? i18n.t('label_a_exp')
                   : i18n.t('label_half_width') + ' (±a)';
    const aSym     = withK ? 'U' : dist === 'resol' ? 'd' : dist === 'exp' ? 'x' : 'a';
    // P06: parametrli taqsimotlar — β (trapetsiya, 0…1), d (egri trapetsiya, 0 < d < a)
    const extraField = dist === 'trap' ? 'beta' : dist === 'ctrap' ? 'd' : '';
    const extraHtml = extraField ? `
        <div class="form-group">
          <label title="${escHtml(i18n.t('label_' + (extraField === 'beta' ? 'beta' : 'd_inexact') + '_hint'))}">${i18n.t(extraField === 'beta' ? 'label_beta' : 'label_d_inexact')} ⓘ</label>
          <input type="text" inputmode="decimal" value="${escHtml(String(comp[extraField] ?? ''))}"
            data-id="${escHtml(comp.id)}" data-field="${extraField}" autocomplete="off" />
        </div>` : '';
    const uFormula = dist === 'ctrap' ? '√(a²/3 + d²/9)' : `${aSym} / ${divLabel}`;

    const isOpen = openId === comp.id;
    const distName = i18n.t((DIST_OPTIONS.find(d => d.value === dist) || DIST_OPTIONS[0]).labelKey).replace(/\s*\(.*$/, '');
    const uLine = `u = ${mult !== 1 ? Calc.fmtSci(Math.abs(mult)) + ' · ' : ''}${uFormula} = ${Calc.fmtSci(u)}`;
    const others = DIST_OPTIONS.filter(d => !MAIN_DISTS.includes(d.value));
    const distSeg = `
        <div class="form-group tb-dist-group">
          <span class="tb-label" id="tb-dist-${escHtml(comp.id)}">${i18n.t('label_distribution')}</span>
          <div class="seg tb-dist-seg" role="group" aria-labelledby="tb-dist-${escHtml(comp.id)}">
            ${MAIN_DISTS.map(v => `<button type="button" class="seg-btn${dist === v ? ' active' : ''}" data-id="${escHtml(comp.id)}" data-tb-dist="${v}" aria-pressed="${dist === v}">${escHtml(i18n.t('dist_' + v).replace(/\s*\(.*$/, ''))}</button>`).join('')}
          </div>
          <select data-id="${escHtml(comp.id)}" data-field="distribution" aria-label="${escHtml(i18n.t('tb_dist_other'))}" class="tb-dist-other${MAIN_DISTS.includes(dist) ? '' : ' active'}">
            <option value="${MAIN_DISTS.includes(dist) ? escHtml(dist) : ''}" ${MAIN_DISTS.includes(dist) ? 'selected' : ''}>${escHtml(i18n.t('tb_dist_other'))}</option>
            ${others.map(d => `<option value="${d.value}" ${dist === d.value ? 'selected' : ''}>${i18n.t(d.labelKey)}</option>`).join('')}
          </select>
        </div>`;

    return `
    <div class="typeb-card${isOpen ? ' is-open sheet-panel' : ''}" data-id="${escHtml(comp.id)}"${isOpen ? ` role="dialog" aria-modal="true" aria-label="${escHtml(comp.name || i18n.t('label_component'))}"` : ''}>
      ${isOpen ? '<div class="sheet-grip" aria-hidden="true"></div>' : ''}
      <div class="typeb-card-header">
        <input type="text" value="${escHtml(comp.name)}" data-id="${escHtml(comp.id)}" data-field="name"
          placeholder="${i18n.t('label_component')}" aria-label="${escHtml(i18n.t('label_component'))}" />
        <span class="dist-badge ${distCls}">${escHtml(comp.param || '')}</span>
        ${isOpen ? '' : `<button type="button" class="btn btn-sm btn-outline" data-tb-edit="${escHtml(comp.id)}" aria-haspopup="dialog">${escHtml(i18n.t('tb_edit'))}</button>`}
        <button class="btn btn-sm btn-danger btn-remove-tb" data-id="${escHtml(comp.id)}" title="${escHtml(i18n.t('c_remove'))}" aria-label="${escHtml(i18n.t('c_remove'))}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      ${comp.share === 'point' && window.UCTemplates && window.UCTemplates.pointRowIgnored(comp, state) ? `<div class="typeb-hint text-xs tb-warn">${escHtml(i18n.t('tpl_point_ignored'))}</div>` : ''}
      ${comp.registry ? `<div class="typeb-hint text-xs text-muted" data-registry-link="${escHtml(comp.registry.id)}">${escHtml(i18n.t('lb_link').replace('{cert}', comp.registry.certificate || '—').replace('{date}', comp.registry.date || '—').replace('{valid}', comp.registry.validUntil || '—').replace('{v}', comp.registry.version))}${comp.registry.correction === null || comp.registry.correction === undefined ? '' : ' · ' + escHtml(i18n.t('lb_pick_correction').replace('{c}', comp.registry.correction))}</div>` : ''}
      ${comp.drift ? `<div class="typeb-hint text-xs text-muted" data-drift-link="1">${escHtml(i18n.t('lb_drift_link').replace('{dc}', comp.drift.deltaC).replace('{div}', comp.drift.divisorLabel || '√3'))}</div>` : ''}
      ${comp.hint || comp.note ? `<div class="typeb-hint text-xs text-muted">${comp.optional ? '⚠ ' + escHtml(i18n.t('tpl_optional')) + '. ' : ''}${escHtml(comp.hint || '')}${comp.note ? ' — ' + escHtml(comp.note) : ''}</div>` : ''}
      <div class="tb-summary mono" data-tb-summary="1"><span class="tb-summary-dist">${escHtml(distName)}</span><span data-tb-u="1"${bad ? ' class="tb-bad"' : ''}>${escHtml(uLine)}</span></div>
      <div class="typeb-card-body">
        ${distSeg}
        <div class="form-group">
          <label>${i18n.t('label_param')}</label>
          <select data-id="${escHtml(comp.id)}" data-field="param">${paramOpts}</select>
        </div>
        <div class="form-group">
          <label>${aLabel}</label>
          <input type="text" inputmode="decimal" value="${escHtml(String(comp.halfWidth))}"
            data-id="${escHtml(comp.id)}" data-field="halfWidth" placeholder="0.0005  ${escHtml(i18n.t('hw_expr_ph'))}" autocomplete="off"
            ${bad ? 'class="input-bad" aria-invalid="true"' : ''} />
          ${isExpr ? `<span class="text-xs ${bad ? 'tb-bad' : 'text-muted'}">${bad ? i18n.t('err_bad_formula') : '= ' + Calc.fmtSci(a)}</span>` : ''}
        </div>
        ${extraHtml}
        ${withK ? `
        <div class="form-group">
          <label>${i18n.t('label_k_cert')}</label>
          <input type="text" inputmode="decimal" value="${escHtml(comp.kRequired && !(Number(comp.k) > 0) ? '' : String(comp.k || 2))}"
            data-id="${escHtml(comp.id)}" data-field="k" placeholder="${comp.kRequired ? escHtml(i18n.t('tpl_k_required')) : '2'}" autocomplete="off" />
        </div>` : `
        <div class="form-group">
          <label>${i18n.t('label_unit')}</label>
          <input type="text" value="${escHtml(comp.unit || '')}"
            data-id="${escHtml(comp.id)}" data-field="unit" placeholder="g, mL, V…" />
        </div>`}
        ${comp.share === 'common' ? `
        <div class="form-group">
          <label>${escHtml(i18n.t('tpl_cert_U'))}</label>
          <input type="text" inputmode="decimal" value="${escHtml(String(comp.certificateU ?? ''))}"
            data-id="${escHtml(comp.id)}" data-field="certificateU" placeholder="—" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>${escHtml(i18n.t('tpl_cert_k'))}</label>
          <input type="text" inputmode="decimal" value="${escHtml(String(comp.certificateK ?? ''))}"
            data-id="${escHtml(comp.id)}" data-field="certificateK" placeholder="—" autocomplete="off" />
        </div>` : ''}
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
        <div class="form-group tb-live">
          <label>${i18n.t('label_std_unc')}</label>
          <div class="formula-box tb-live-box" data-tb-live="1" aria-live="polite">${escHtml(uLine)}</div>
        </div>
      </div>
      ${isOpen ? `<div class="sheet-actions">
        <button type="button" class="btn btn-outline" data-tb-registry="1">${escHtml(i18n.t('lb_pick_btn'))}</button>
        <button type="button" class="btn btn-primary" data-tb-close="1">${escHtml(i18n.t('tb_done'))}</button>
      </div>` : ''}
    </div>`;
  }

  /** Varaqda yozilayotgan (hali saqlanmagan) qiymatlar bo'yicha jonli u — xuddi shu compStd (dvigatel) orqali */
  function livePreview(card) {
    const state = appState.get();
    const comp = state.typeB.find(c => c.id === card.dataset.id);
    const box = card.querySelector('[data-tb-live]');
    if (!comp || !box) return;
    const draft = { ...comp };
    card.querySelectorAll('input[data-field]').forEach(inp => {
      const f = inp.dataset.field;
      if (f === 'name' || f === 'unit') return;
      const n = Calc.toNum(inp.value);
      draft[f] = isFinite(n) ? n : inp.value.trim();
    });
    const { mult, u, bad } = compStd(draft, state);
    const withK = draft.distribution === 'normal' || draft.distribution === 'lognorm';
    const aSym = withK ? 'U' : draft.distribution === 'resol' ? 'd' : draft.distribution === 'exp' ? 'x' : 'a';
    const formula = draft.distribution === 'ctrap' ? '√(a²/3 + d²/9)' : `${aSym} / ${Calc.getDivisorLabel(draft.distribution, draft.k)}`;
    box.textContent = bad ? i18n.t('err_bad_formula') : `u = ${mult !== 1 ? Calc.fmtSci(Math.abs(mult)) + ' · ' : ''}${formula} = ${Calc.fmtSci(u)}`;
    box.classList.toggle('tb-bad', !!bad);
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
          <span class="stat-label stat-label-plain">u_B(${escHtml(p)})</span>
          <span class="stat-value tb-warn">${Calc.fmtSci(uB)}</span>
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
        <p class="text-muted text-xs u-my">${i18n.t('corr_hint')}</p>` : ''}
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
        <div class="model-card-title u-mt">${i18n.t('conf_title')} <span class="text-muted text-xs">ISO/IEC 17025 7.8.6 · JCGM 106 · ILAC G8</span></div>
        <div class="settings-grid">
          <div class="form-group">
            <label title="${escHtml(i18n.t('mk_hint'))}">${i18n.t('mk_label')} ⓘ</label>
            <select data-set="modelKind">
              ${['unknown', 'error', 'value'].map(v =>
                `<option value="${v}" ${(settings.modelKind || 'unknown') === v ? 'selected' : ''}>${escHtml(i18n.t('mk_' + v))}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" ${settings.modelKind === 'value' ? '' : 'hidden'}>
            <label>${i18n.t('mk_nominal')}</label>
            <input type="text" inputmode="decimal" data-set="nominal" class="mono" value="${escHtml(String(settings.nominal ?? ''))}" autocomplete="off" />
          </div>
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
        <div class="settings-grid" data-lab-settings="1">
          <div class="form-group">
            <label title="${escHtml(i18n.t('lb_set_date_hint'))}">${i18n.t('lb_set_date')} ⓘ</label>
            <input type="date" data-set="measurementDate" value="${escHtml(String(settings.measurementDate ?? ''))}" />
          </div>
          <div class="form-group">
            <label title="${escHtml(i18n.t('lb_set_cmc_hint'))}">${i18n.t('lb_set_cmc')} ⓘ</label>
            <select data-lb-cmc-pick="1">
              <option value="">${escHtml(i18n.t('lb_set_cmc_none'))}</option>
              ${[...new Set([...(window.UCLab ? window.UCLab.cmcQuantities() : []), ...(settings.cmcKey ? [settings.cmcKey] : [])])].map(q => `<option value="${escHtml(q)}" ${settings.cmcKey === q && settings.cmcRows ? 'selected' : ''}>${escHtml(q)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" ${settings.cmcRows ? '' : 'hidden'}>
            <label title="${escHtml(i18n.t('lb_set_cmc_x_hint'))}">${i18n.t('lb_set_cmc_x')} ⓘ</label>
            <input type="text" data-set="cmcX" class="mono" value="${escHtml(String(settings.cmcX ?? ''))}" placeholder="${escHtml(i18n.t('hw_expr_ph'))}" autocomplete="off" />
          </div>
        </div>
        <div class="settings-grid" data-decision-settings="1">
          <div class="form-group">
            <label>${i18n.t('set_decision_rule')}</label>
            <select data-set="decisionRule">
              <option value="" ${!settings.decisionRule ? 'selected' : ''}>${escHtml(i18n.t('set_decision_none'))}</option>
              <option value="simple" ${settings.decisionRule === 'simple' ? 'selected' : ''}>${escHtml(i18n.t('set_decision_simple'))}</option>
              <option value="guard_band" ${settings.decisionRule === 'guard_band' ? 'selected' : ''}>${escHtml(i18n.t('set_decision_guard'))}</option>
            </select>
          </div>
          <div class="form-group" ${settings.decisionRule === 'guard_band' ? '' : 'hidden'}>
            <label title="${escHtml(i18n.t('set_guard_r_hint'))}">${i18n.t('set_guard_r')} ⓘ</label>
            <input type="text" inputmode="decimal" data-set="guardR" class="mono" list="guard-r-presets" value="${escHtml(String(settings.guardR ?? ''))}" placeholder="1" autocomplete="off" />
            <datalist id="guard-r-presets">${(Calc.GUARD_PRESETS || []).filter(p => p.r > 0).map(p => `<option value="${p.r}"></option>`).join('')}</datalist>
          </div>
          <div class="form-group" ${settings.decisionRule ? '' : 'hidden'}>
            <label>${i18n.t('set_decision_statement')}</label>
            <select data-set="decisionStatement">
              <option value="binary" ${settings.decisionStatement !== 'non_binary' ? 'selected' : ''}>${escHtml(i18n.t('set_decision_binary'))}</option>
              <option value="non_binary" ${settings.decisionStatement === 'non_binary' ? 'selected' : ''}>${escHtml(i18n.t('set_decision_non_binary'))}</option>
            </select>
          </div>
          <div class="form-group">
            <label title="${escHtml(i18n.t('set_tol_hint'))}">${i18n.t('set_tol_lower')} ⓘ</label>
            <input type="text" inputmode="decimal" data-set="tolLower" class="mono" value="${escHtml(String(settings.tolLower ?? ''))}" placeholder="—" autocomplete="off" />
          </div>
          <div class="form-group">
            <label title="${escHtml(i18n.t('set_tol_hint'))}">${i18n.t('set_tol_upper')} ⓘ</label>
            <input type="text" inputmode="decimal" data-set="tolUpper" class="mono" value="${escHtml(String(settings.tolUpper ?? ''))}" placeholder="—" autocomplete="off" />
          </div>
          <div class="form-group" ${settings.decisionRule ? '' : 'hidden'}>
            <label>${i18n.t('set_agreement')}</label>
            <input type="text" data-set="agreement" maxlength="200" value="${escHtml(String(settings.agreement ?? ''))}" autocomplete="off" />
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
    if (e.target.dataset.field === 'distribution' && e.target.value === '') return;   // "boshqa taqsimot" sarlavhasi
    setField(e.target.dataset.id, e.target.dataset.field, e.target.value);
  }
  function setField(id, field, val) {

    // Shablon manbasi (P04): bo'sh qiymat 0 / k = 2 deb jimgina olinmaydi — hisob oldidan so'raladi
    const comp = (appState.get('typeB') || []).find(c => c.id === id) || {};
    if (field === 'halfWidth') {
      const n = Calc.toNum(val);
      val = isFinite(n) ? n : (val.trim() || (comp.sourceId ? '' : 0));   // keep expressions like "0.0002*I + 0.002"
    } else if (field === 'sensitivity' || field === 'k') {
      const n = Calc.toNum(val);
      val = isFinite(n) ? n : (field === 'k' ? (comp.kRequired ? '' : 2) : 1);
    } else if (field === 'certificateU' || field === 'certificateK') {
      const n = Calc.toNum(val);
      val = isFinite(n) && n > 0 ? n : '';
    } else if (field === 'nu') {
      const n = Calc.toNum(val);
      val = isFinite(n) && n > 0 ? n : '';
    } else if (field === 'beta' || field === 'd') {
      const n = Calc.toNum(val);
      val = isFinite(n) && n >= 0 ? n : '';
    }

    // P11: reestrdan tortilgan qiymat (U, k, ν, taqsimot) qo'lda o'zgartirilsa — manba endi sertifikat nusxasiga mos emas:
    // reestr bog'lanishi uziladi (manba qo'lda kiritilgan bo'lib qoladi) va foydalanuvchiga xabar beriladi.
    const upd = { [field]: val };
    if (comp.registry && ['halfWidth', 'k', 'nu', 'distribution'].includes(field) && String(comp[field] ?? '') !== String(val)) {
      upd.registry = undefined;
      if (window.showToast) window.showToast(i18n.t('lb_link_broken'), 'info', 6000);
    }
    if (comp.drift && ['halfWidth', 'k', 'distribution'].includes(field) && String(comp[field] ?? '') !== String(val)) upd.drift = undefined;
    appState.updateTypeBComponent(id, upd);
  }

  function calcCombined() {
    const raw    = appState.get();
    // P04: shablon bo'yicha hisob — bo'sh maydonlar bloklanadi; aux formulalar va "bitta asbob" kovariatsiyasi
    const tplRT  = window.UCTemplates;
    if (raw.template && tplRT) {
      const missing = tplRT.missingInState(raw);
      if (missing.length) {
        showToast(i18n.t('tpl_block_missing') + ' ' + tplRT.missingText(missing).slice(0, 6).join('; ') + (missing.length > 6 ? ' …' : ''), 'error', 7000);
        return;
      }
    }
    // P04b: split = 'unknown' bo'lsa r = 0 va r = 1 hisoblanib katta u_c olinadi (interpreter.evaluateState)
    const ev     = raw.template && tplRT ? tplRT.evaluateState(raw) : { result: Calc.evaluate(raw), state: raw };
    const state  = ev.state;
    const result = ev.result;

    if (result.error) {
      const msg = {
        need_formula: i18n.t('err_need_formula'),
        bad_formula:  i18n.t('err_bad_formula') + (result.detail ? ': «' + result.detail + '»' : ''),
        need_data:    i18n.t('err_need_data') + ' ' + (result.detail || ''),
        formula_eval: i18n.t('err_formula_eval'),
        bad_halfwidth: i18n.t('err_bad_halfwidth') + ': «' + (result.detail || '') + '»',
        bad_dist_param: i18n.t('err_bad_dist_param') + ': «' + (result.detail || '') + '»',
        bad_mpe:      i18n.t('err_bad_mpe'),
        bad_cmc_x:    i18n.t('err_bad_cmc_x'),
        cmc_bad_row:  i18n.t('err_cmc_bad_row'),
        negative_variance: i18n.t('err_negative_variance'),
        bad_correlation: i18n.t('err_bad_correlation') + (result.detail ? ': ' + result.detail.replace('|', ' ↔ ') : ''),
        unit_mismatch: i18n.t('err_unit_mismatch') + (result.detail ? ': ' + result.detail : ''),
        unit_fn_arg:  i18n.t('err_unit_fn_arg') + (result.detail ? ': ' + result.detail : ''),
        multi_output: i18n.t('err_multi_output'),
        duplicate_output: i18n.t('err_duplicate_output') + (result.detail ? ': «' + result.detail + '»' : ''),
        invalid_covariance: i18n.t('err_invalid_covariance') + (result.detail ? ': ' + result.detail : ''),
        implicit_bad_spec: i18n.t('err_implicit_bad_spec'),
        implicit_bad_equation: i18n.t('err_implicit_bad_equation') + (result.detail ? ': «' + result.detail + '»' : ''),
        implicit_bad_start: i18n.t('err_implicit_bad_start') + (result.detail ? ': ' + result.detail : ''),
        implicit_name_clash: i18n.t('err_implicit_name_clash') + (result.detail ? ': ' + result.detail : ''),
        implicit_no_convergence: i18n.t('err_implicit_no_convergence'),
        implicit_singular: i18n.t('err_implicit_singular'),
        bad_spec:     i18n.t('err_bad_spec'),
      }[result.error] || i18n.t('toast_need_data');
      showToast(msg, 'error', 4500);
      if (!['formula_eval', 'bad_halfwidth', 'bad_dist_param', 'bad_mpe', 'bad_cmc_x', 'cmc_bad_row', 'negative_variance', 'bad_correlation'].includes(result.error)) switchTab('data');
      return;
    }

    // Keep the Type A table in sync with what was actually used
    const typeA = {};
    state.params.forEach(p => {
      const opt = ((state.settings || {}).typeA || {})[p] || {};
      const ta = Calc.typeAx(state.measurements[p] || [], { ...opt, dirs: state.directions || [] });
      if (ta) typeA[p] = ta;
    });

    // P05b: hisob identifikatori va vaqti — JSON eksport va hisobot xeshi shu meta bilan (src/io/calc-meta.js)
    appState.set({ typeA, combined: result, calcMeta: Calc.newMeta() });
    if (tplRT) tplRT.saveCalculation(state, result);   // IndexedDB + audit izi (P04)
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

  return { init, render, addComponent, loadPresetComponents, calculate: calcCombined };

})();

window.TypeB = TypeB;
