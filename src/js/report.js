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

  function unitOf(r) { return r.unit ? ' ' + escHtml(r.unit) : ''; }
  function pct(P) { return (P * 100).toFixed(2).replace(/\.?0+$/, ''); }
  function nuText(nu) { return isFinite(nu) ? String(Math.floor(nu)) : '∞'; }
  function distLabel(d) { return DIST_KEYS[d] ? i18n.t(DIST_KEYS[d]).replace(/\s*\(.*$/, '') : (d || '—'); }

  function statement(r, rr, k) {
    const text = rr ? rr.resultText : r.resultText;
    const kk = k !== undefined ? k : r.k;
    return `${escHtml(r.symbol)} = (${text})${unitOf(r)};  k = ${kk.toFixed(2)};  P ≈ ${pct(r.P)} %`;
  }

  /* ILAC P14:09/2020 §5.2 statement */
  function ilacNote(r) {
    return i18n.t(r.kMethod === 'k2' ? 'ilac_note_k2' : 'ilac_note').replace('{P}', pct(r.P));
  }

  const CONF_KEYS = { ok: 'conf_ok', fail: 'conf_fail', zone: 'conf_zone', na: 'conf_na' };
  function confLabel(code, guarded) {
    if (!code) return '—';
    const cls = code === 'ok' ? 'badge-green' : code === 'fail' ? 'badge-red' : 'badge-orange';
    const txt = i18n.t(CONF_KEYS[code] || 'conf_na') + (guarded && code !== 'zone' && code !== 'na' ? ' ' + i18n.t('conf_reliable') : '');
    return `<span class="badge ${cls}">${txt}</span>`;
  }

  function warningsHtml(r) {
    if (!r.warnings || !r.warnings.length) return '';
    return `<div class="warn-box">${r.warnings.map(w =>
      `<div>⚠ ${i18n.t('w_' + w.code).replace('{p}', escHtml(w.param || '')).replace('{v}', w.value ?? '')}</div>`).join('')}</div>`;
  }

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
              ${anyConf ? `<th class="cell-num">MPE</th><th>${i18n.t('conf_guarded')}</th>` : ''}
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
                  <td>${x.conf ? confLabel(x.conf.guarded, true) : '—'}</td>` : ''}
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
      ${warningsHtml(r)}
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
    const mcBtn = el.querySelector('#btn-mc');
    if (mcBtn) mcBtn.addEventListener('click', () => {
      mcBtn.disabled = true;
      mcBtn.textContent = i18n.t('mc_running');
      setTimeout(() => {
        const M = Number(el.querySelector('#mc-m').value) || 200000;
        lastMC = Calc.monteCarlo(appState.get(), M);
        render();
      }, 30);
    });
  }

  function confLines(r) {
    const c = r.conf, s = escHtml(r.symbol);
    const lines = [];
    if (c && c.mpe > 0) {
      lines.push(`MPE = ±${Calc.fmtSci(c.mpe, 4)}${unitOf(r)};   U / MPE = ${c.ratio.toFixed(3)}`);
      lines.push(`${i18n.t('conf_simple')}: |${s}| ≤ MPE  →  ${confLabel(c.simple, false)}`);
      lines.push(`${i18n.t('conf_guarded')}: |${s}| + U ≤ MPE  →  ${confLabel(c.guarded, true)}`);
      if (c.ratio > 1) lines.push(`⚠ ${i18n.t('w_u_gt_mpe')}`);
    } else if (c) {
      lines.push(i18n.t('conf_zero_mpe'));
    }
    if (r.gamma !== null && r.gamma !== undefined) lines.push(`${i18n.t('conf_gamma')}: γ = |${s}| / ${i18n.t('set_range').toLowerCase()} · 100 = ${r.gamma.toFixed(3)} %`);
    return lines;
  }

  function renderConformity(r) {
    const lines = confLines(r);
    if (!lines.length) return '';
    return `
      <div class="section-title">${i18n.t('conf_title')}</div>
      ${lines.map(l => `<div class="formula-box">${l}</div>`).join('')}`;
  }

  function mcLines(r, mc) {
    const d = r.digits + 1;
    return [
      `M = ${mc.M.toLocaleString()};  ${i18n.t('res_y')} = ${Calc.fmtSci(mc.mean, 8)};  u = ${Calc.fmtSci(mc.u)}`,
      `${i18n.t('mc_interval')} (${pct(mc.P)} %): [${mc.low.toFixed(d)}; ${mc.high.toFixed(d)}]  →  ${i18n.t('mc_half')} ${Calc.fmtSci(mc.mcHalf, 3)}`,
      `GUM: [${mc.gumLow.toFixed(d)}; ${mc.gumHigh.toFixed(d)}]  →  U = ${Calc.fmtSci(mc.gumU, 3)}`,
      `JCGM 101 §8: δ = ${Calc.fmtSci(mc.delta, 2)};  d_low = ${Calc.fmtSci(mc.dLow, 2)},  d_high = ${Calc.fmtSci(mc.dHigh, 2)}  →  ` +
        (mc.validated ? `<span class="badge badge-green">${i18n.t('mc_valid')}</span>` : `<span class="badge badge-orange">${i18n.t('mc_not_valid')}</span>`),
    ];
  }

  function renderMC(r) {
    const mc = lastMC && !lastMC.error ? lastMC : null;
    return `
      <div class="section-title">${i18n.t('mc_title')}</div>
      <div class="mc-row">
        <select id="mc-m">
          <option value="100000">M = 10⁵</option>
          <option value="200000" selected>M = 2·10⁵</option>
          <option value="1000000">M = 10⁶</option>
        </select>
        <button class="btn btn-outline btn-sm" id="btn-mc">${i18n.t('mc_run')}</button>
        <span class="text-muted text-xs">${i18n.t('mc_hint')}</span>
      </div>
      ${mc ? mcLines(r, mc).map(l => `<div class="formula-box">${l}</div>`).join('') +
        (mc.correlated ? `<div class="text-xs text-muted">⚠ ${i18n.t('mc_corr_note')}</div>` : '') +
        (!mc.validated ? `<div class="text-xs text-muted">${i18n.t('mc_advice')}</div>` : '') : ''}`;
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
      const aNote = b.method === 2 ? ', s_p' : b.method === 3 ? ', COOMET' : '';
      const name = b.kind === 'A' ? `${escHtml(b.name)}: ${i18n.t('budget_repeat')} (n = ${b.n}${b.directional ? ', ↑/↓' : ''}${aNote}, ν = ${nuText(b.nu)})`
                 : b.kind === 'B' ? `${escHtml(b.param)}: ${b.auto ? i18n.t('budget_hyst') : escHtml(b.name)}${isFinite(b.nu) ? ` (ν = ${b.nu})` : ''}`
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

  function hasCorrelation(r) { return r.pairs.length && (r.paired || r.pairs.some(p => p.cov !== 0)); }

  function renderCorrelation(r) {
    if (!hasCorrelation(r)) return '';
    return `
      <div class="section-title">${i18n.t('sec_corr')}</div>
      <div class="budget-table-wrap">${corrTable(r, 'data-table math-head')}</div>
      <div class="formula-box">${corrNote(r)}</div>`;
  }

  function stepLines(r) {
    const s = escHtml(r.symbol);
    return [
      `u_c²(${s}) = Σ cᵢ²·u²(xᵢ)${r.pairs.length ? ' + 2·ΣΣ cᵢ·cⱼ·u(xᵢ,xⱼ)' : ''} = ${Calc.fmtSci(r.uc2)}  →  u_c(${s}) = ${Calc.fmtSci(r.uc)}`,
      `ν_eff = u_c⁴ / Σ[(cᵢ·uᵢ)⁴/νᵢ] = ${isFinite(r.nuEff) ? r.nuEff.toFixed(1) : '∞'}`,
      r.kMethod === 'k2' ? `k = 2 (${i18n.t('set_k_2')})` : `k = t(P = ${pct(r.P)} %; ν = ${nuText(r.nuEff)}) = ${r.k.toFixed(4)}`,
      `U = k·u_c = ${r.k.toFixed(4)} × ${Calc.fmtSci(r.uc)} = ${Calc.fmtSci(r.U)}${unitOf(r)}`,
      `${i18n.t('round_line')} (${i18n.t(r.roundUp ? 'set_round_up' : 'set_round_normal')}): U = ${r.Uround.toFixed(r.digits)};  ${escHtml(r.symbol)} = ${r.yround.toFixed(r.digits)}`,
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
  function dataTable(snap) {
    const dirOn = snap.params.some(p => (((snap.settings || {}).typeA || {})[p] || {}).directional);
    const rows = Array.from({ length: snap.n }, (_, i) => i)
      .filter(i => snap.params.some(p => !isBlankCell((snap.measurements[p] || [])[i])));
    return `
      <table class="print-table">
        <thead><tr><th>#</th>${dirOn ? '<th>↑/↓</th>' : ''}${snap.params.map(p => `<th>${escHtml(p)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map(i => `<tr><td>${i + 1}</td>${dirOn ? `<td>${escHtml((snap.directions || [])[i] || '')}</td>` : ''}${snap.params.map(p =>
            `<td class="num">${escHtml(String((snap.measurements[p] || [])[i] ?? ''))}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>`;
  }

  function pointDetail(r, snap, title, rr, k) {
    const p9 = l => `<p style="font-size:9pt;margin:.25em 0">${l}</p>`;
    const conf = confLines(r);
    return `
      ${title ? `<div class="print-point-title">${escHtml(title)}</div>` : ''}
      <div class="print-section">${i18n.t('model_title')}</div>
      <p style="font-size:10pt;margin:.4em 0 .6em"><strong>${escHtml(r.symbol)} = ${escHtml(r.formulaText)}</strong></p>

      <div class="print-section">${i18n.t('data_title')}</div>
      ${dataTable(snap)}

      <div class="print-section">${i18n.t('sec_inputs')}</div>
      ${inputsTable(r, 'print-table')}

      <div class="print-section">${i18n.t('results_title')}</div>
      ${budgetTable(r, 'print-table', false)}

      ${hasCorrelation(r) ? `
      <div class="print-section">${i18n.t('sec_corr')}</div>
      ${corrTable(r, 'print-table')}
      ${p9(corrNote(r))}` : ''}

      <div class="print-section">${i18n.t('section_expanded')}</div>
      ${stepLines(r).map(p9).join('')}

      ${r.verify ? `<div class="print-section">${i18n.t('sec_verify')}</div>${verifyLines(r).map(p9).join('')}` : ''}
      ${conf.length ? `<div class="print-section">${i18n.t('conf_title')}</div>${conf.map(p9).join('')}` : ''}

      <div class="print-section">${i18n.t('res_statement')}</div>
      <p style="font-size:11pt;margin:.5em 0"><strong>${statement(r, rr, k)}</strong></p>
      ${p9(ilacNote(r))}`;
  }

  function summaryTable(rows) {
    const anyConf = rows.some(x => x.conf && x.conf.mpe > 0);
    const sym = escHtml(rows[0].r.symbol), unit = rows[0].r.unit ? ', ' + escHtml(rows[0].r.unit) : '';
    return `
      <table class="print-table">
        <thead><tr>
          <th>${i18n.t('pt_col')}</th><th>${sym}${unit}</th><th>U${unit}</th><th>k</th><th>ν_eff</th>
          ${anyConf ? `<th>MPE</th><th>${i18n.t('conf_guarded')}</th>` : ''}
        </tr></thead>
        <tbody>
          ${rows.map(x => `<tr>
            <td>${escHtml(x.label)}</td>
            <td class="num">${x.rr.yround.toFixed(x.rr.digits)}</td>
            <td class="num">${x.rr.Uround.toFixed(x.rr.digits)}</td>
            <td class="num">${x.k.toFixed(2)}</td>
            <td class="num">${nuText(x.r.nuEff)}</td>
            ${anyConf ? `<td class="num">${x.conf && x.conf.mpe > 0 ? Calc.fmtSci(x.conf.mpe, 3) : '—'}</td>
              <td>${x.conf ? i18n.t(CONF_KEYS[x.conf.guarded]) : '—'}</td>` : ''}
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function printReport() {
    const state = appState.get();
    const r     = current();
    const pts   = (state.points || []).filter(p => p.result && !p.result.error);

    if (!r && !pts.length) {
      showToast(i18n.t('results_empty'), 'error');
      return;
    }

    const now     = new Date().toLocaleDateString();
    const printEl = document.getElementById('print-report');
    const uniformK = !!(state.summary && state.summary.uniformK);
    const rows = Points.summary(pts, uniformK);

    let body;
    if (rows.length) {
      body = `
        <div class="print-section">${i18n.t('pt_summary')}</div>
        ${summaryTable(rows)}
        ${uniformK ? `<p style="font-size:9pt">${i18n.t('pt_uniform_k')}</p>` : ''}
        <p style="font-size:9pt">${ilacNote(rows[0].r)}</p>
        ${rows.map(x => `<div class="print-page-break"></div>` +
          pointDetail(x.r, pts.find(p => p.id === x.id).snapshot, x.label, x.rr, x.k)).join('')}`;
    } else {
      body = pointDetail(r, Points.snapshot(state), '', null, undefined);
    }

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
      ${body}
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
