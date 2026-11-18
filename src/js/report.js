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

  /* Yaxlitlash — faqat hisobot qatlamida (src/report/rounding.js, P03). Saqlangan eski natijalardagi
     Uround/yround/resultText e'tiborsiz qoldiriladi va qayta hisoblanadi. */
  function rounded(r) { return Calc.roundResult(r.y, r.U, r.roundUp); }

  function statement(r, rr, k) {
    const text = (rr || rounded(r)).resultText;
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
    const notes = (r.notes || []).map(n => `<div class="text-xs text-muted">ⓘ ${escHtml(i18n.t('n_' + n.code))}</div>`).join('');
    if (!r.warnings || !r.warnings.length) return notes;
    return `<div class="warn-box">${r.warnings.map(w =>
      `<div>⚠ ${i18n.t('w_' + w.code).replace('{p}', escHtml(w.param || '')).replace('{v}', escHtml(w.value ?? ''))}</div>`).join('')}</div>${notes}`;
  }

  /* k qaysi ν bilan va qaysi qoida bo'yicha olingani (GUM G.4.1 Note 1; CLAUDE.md: qoida hisobotda yoziladi) */
  function nuUsedText(r) {
    const c = r.coverage;
    if (!c) return nuText(r.nuEff); // P03 dan oldingi saqlangan natija
    if (!isFinite(c.nuUsed)) return '∞';
    return c.nuRule === 'floor' ? String(c.nuUsed) : (+c.nuUsed.toFixed(2)).toString();
  }
  function nuRuleText(r) {
    const rule = (r.coverage && r.coverage.nuRule) || 'floor';
    return `${i18n.t('nu_rule_line')}: ${i18n.t('nu_rule_' + rule)}`;
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
      ${templateNotice()}
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
        const st = appState.get();
        // P04b: MC tanlangan chegara (r = 0 yoki r = 1) holatida
        lastMC = Calc.monteCarlo(st.template && window.UCTemplates ? window.UCTemplates.evaluateState(st).state : st, M);
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
    const d = rounded(r).digits + 1;
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
                  : b.kind === 'second' ? '<span class="badge badge-blue">2</span>'
                  : '<span class="badge badge-green">r</span>';
      const aNote = b.method === 2 ? ', s_p' : b.method === 3 ? ', COOMET' : '';
      const name = b.kind === 'A' ? `${escHtml(b.name)}: ${i18n.t('budget_repeat')} (n = ${b.n}${b.directional ? ', ↑/↓' : ''}${aNote}, ν = ${nuText(b.nu)})`
                 : b.kind === 'B' ? `${escHtml(b.param)}: ${b.auto ? i18n.t('budget_hyst') : escHtml(b.name)}${isFinite(b.nu) ? ` (ν = ${b.nu})` : ''}`
                 : b.kind === 'second' ? escHtml(i18n.t('so_title'))
                 : `${i18n.t('budget_corr')} ${escHtml(b.name)}`;
      const w = Math.min(100, Math.abs(b.share));
      return `<tr>
        <td>${name}</td>
        <td>${badge}</td>
        <td>${b.kind === 'corr' || b.kind === 'second' ? '—' : distLabel(b.dist)}</td>
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
      r.kMethod === 'k2' ? `k = 2 (${i18n.t('set_k_2')})` : `k = t(P = ${pct(r.P)} %; ν = ${nuUsedText(r)}) = ${r.k.toFixed(4)}  (${nuRuleText(r)})`,
      `U = k·u_c = ${r.k.toFixed(4)} × ${Calc.fmtSci(r.uc)} = ${Calc.fmtSci(r.U)}${unitOf(r)}`,
      (rr => `${i18n.t('round_line')} (${i18n.t(r.roundUp ? 'set_round_up' : 'set_round_normal')}): U = ${rr.Uround.toFixed(rr.digits)};  ${escHtml(r.symbol)} = ${rr.yround.toFixed(rr.digits)}`)(rounded(r)),
      ...secondOrderLines(r),
    ];
  }

  /* 2-tartibli hadlar diagnostikasi (JCGM 100:2008 §5.1.2 Note) — standartda u_c ga qo'shilmaydi */
  function secondOrderLines(r) {
    const so = r.secondOrder;
    if (!so || !(so.u2 > 0)) return [];
    const idx = isFinite(so.index) ? (so.index * 100).toPrecision(3) : '∞';
    return [
      `${i18n.t('so_title')}: ${i18n.t('so_line').replace('{u2}', Calc.fmtSci(so.u2)).replace('{idx}', idx)} — ${i18n.t(so.included ? 'so_included' : 'so_not_included')}. ` +
      `${i18n.t(so.validCondition ? 'so_condition' : 'so_condition_bad')}`,
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

  /* P04: shablon belgilari — "Shablon tasdiqlanmagan (DRAFT)", "Namunaviy ma'lumot — real emas" va h.k. */
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

  function printReport() {
    const state = appState.get();
    const r     = current();
    const pts   = (state.points || []).filter(p => p.result && !p.result.error);

    if (!r && !pts.length) {
      showToast(i18n.t('results_empty'), 'error');
      return;
    }
    // P04: laboratoriya sozlamasi cmcMode = 'block' — U < CMC bo'lsa hisobot chiqmaydi (CLAUDE.md)
    const lab = window.UCTemplates ? window.UCTemplates.labSettings() : null;
    const below = [r, ...pts.map(p => p.result)].some(x => x && (x.warnings || []).some(w => w.code === 'below_cmc'));
    if (lab && lab.cmcMode === 'block' && below) {
      showToast(i18n.t('cmc_blocked'), 'error', 5000);
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
      ${templateNotice()}
      ${body}
      ${regressionAppendix()}
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

  /* ─── P08: REGRESSION rejimi hisobot bo'limi ─────────────────────
     Usul, parametrlar, kovariatsiya, χ² testi, teskari va to'g'ri bashorat, U — diapazon, ogohlantirishlar.
     P05 gacha shu faylda (PLAN.md "Bajarish tartibi"); keyin src/report/ shakllariga ko'chiriladi.
     Yaxlitlash faqat shu yerda (hisobot qatlami): qiymat ± noaniqlik — Calc.roundResult (U ≤ 2 qiymatli raqam). */
  function rgWarnText(w) {
    return i18n.t('w_' + w.code).replace('{p}', escHtml(w.param || '')).replace('{v}', escHtml(w.value ?? ''));
  }
  function rgErrText(code, detail) {
    return escHtml(i18n.t('err_' + code)) + (detail ? ' — ' + escHtml(detail) : '');
  }
  function rgUnit(u) { return u && u !== '1' ? ' ' + escHtml(u) : ''; }
  function rgNu(nu) { return isFinite(nu) ? (Number.isInteger(nu) ? String(nu) : nu.toFixed(1)) : '∞'; }
  function rgPair(v, u) { // qiymat va noaniqlik: noaniqlik 2 qiymatli raqamgacha, qiymat uning oxirgi xonasigacha
    const rr = Calc.roundResult(v, u, false);
    return { v: rr.yround.toFixed(rr.digits), u: rr.Uround.toFixed(rr.digits), text: rr.resultText };
  }
  function rgEquation(r) {
    const x = r.xRef ? `(x − ${escHtml(String(r.xRef))})` : 'x';
    const names = ['', `·${x}`, `·${x}²`, `·${x}³`];
    return 'y = ' + r.params.map((p, j) => {
      const v = rgPair(p.value, p.u).v;
      return (j === 0 ? v : (p.value < 0 ? '− ' + v.replace(/^-/, '') : '+ ' + v)) + names[j];
    }).join(' ');
  }
  function rgWarnings(r) {
    if (!r.warnings || !r.warnings.length) return '';
    const sev = r.warnings.filter(w => w.severity !== 'info'), info = r.warnings.filter(w => w.severity === 'info');
    return (sev.length ? `<div class="warn-box rg-warnings" data-rg-warnings="1">${sev.map(w => `<div data-rg-warning="${escHtml(w.code)}">⚠ ${rgWarnText(w)}</div>`).join('')}</div>` : '') +
      info.map(w => `<div class="text-xs text-muted rg-note" data-rg-warning="${escHtml(w.code)}">ⓘ ${rgWarnText(w)}</div>`).join('');
  }
  function rgChi2(r) {
    const c = r.chi2;
    if (!c.applicable) return `<p class="rg-line" data-rg-chi2="na"><strong>${i18n.t('rg_chi2')}:</strong> ${i18n.t('rg_chi2_na')}</p>`;
    const badge = c.pass ? 'badge-green' : 'badge-red';
    return `<p class="rg-line" data-rg-chi2="${c.pass ? 'pass' : 'fail'}"><strong>${i18n.t('rg_chi2')}:</strong>
      ${i18n.t('rg_chi2_obs')} = ${Calc.fmtSci(c.obs, 4)}; ν = ${c.nu};
      ${i18n.t('rg_chi2_crit').replace('{P}', pct(c.P) + ' %')} = ${Calc.fmtSci(c.crit, 4)}
      <span class="badge ${badge}">${i18n.t(c.pass ? 'rg_chi2_pass' : 'rg_chi2_fail')}</span></p>`;
  }
  function rgMatrix(r, cls, M, title) {
    return `<table class="${cls} rg-matrix"><thead><tr><th>${escHtml(title)}</th>${r.params.map(p => `<th>${escHtml(p.name)}</th>`).join('')}</tr></thead>
      <tbody>${M.map((row, i) => `<tr><th>${escHtml(r.params[i].name)}</th>${row.map(v => `<td class="num">${Calc.fmtSci(v, 4)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function rgInverse(r, cls) {
    if (!r.inverse || !r.inverse.length) return '';
    const src = { given: 'rg_uy0_given', residual: 'rg_uy0_residual', common: 'rg_uy0_common' };
    return `<h4 class="rg-h">${i18n.t('rg_inverse_res')}</h4>
      <table class="${cls}" data-rg-inverse="1"><thead><tr>
        <th>${i18n.t('rg_col_y0')}</th><th>${i18n.t('rg_col_p')}</th><th>${i18n.t('rg_col_uy0')}</th><th>${i18n.t('rg_col_x0')}</th><th>${i18n.t('rg_col_u')}(x̂₀)</th>
        <th>${i18n.t('rg_col_from_y0')}</th><th>${i18n.t('rg_col_from_cal')}</th><th>${i18n.t('rg_col_nu')}</th><th>${i18n.t('rg_col_k')}</th><th>${i18n.t('rg_col_result')}</th>
      </tr></thead><tbody>${r.inverse.map(q => q.error
        ? `<tr><td class="num">${Calc.fmtSci(q.y0, 6)}</td><td class="num">${escHtml(q.p ?? '')}</td><td colspan="8">⚠ ${rgErrText(q.error, q.detail)}</td></tr>`
        : `<tr><td class="num">${Calc.fmtSci(q.y0, 6)}</td><td class="num">${q.p}</td>
            <td class="num">${Calc.fmtSci(q.uy0, 3)} <span class="text-muted">(${i18n.t(src[q.uy0Source])})</span></td>
            <td class="num">${Calc.fmtSci(q.x0, 6)}</td><td class="num">${Calc.fmtSci(q.u, 3)}</td>
            <td class="num">${Calc.fmtSci(q.components.y0, 3)}</td><td class="num">${Calc.fmtSci(q.components.calibration, 3)}</td>
            <td class="num">${rgNu(q.nu)}</td><td class="num">${q.k.toFixed(2)}</td>
            <td class="num"><strong>(${rgPair(q.x0, q.U).text})${rgUnit(r.units.x)}</strong>${q.extrapolated ? ` <span class="badge badge-orange">${i18n.t('rg_extrap')}</span>` : ''}${
              !(q.U > 0) ? ` <span class="badge badge-red">⚠ ${escHtml(i18n.t('w_zero_u'))}</span>` : ''}</td></tr>`).join('')}</tbody></table>`;
  }
  function rgPredict(r, cls) {
    if (!r.predictions || !r.predictions.length) return '';
    return `<h4 class="rg-h">${i18n.t('rg_predict_res')}</h4>
      <table class="${cls}" data-rg-predict="1"><thead><tr><th>x</th><th>${i18n.t('rg_col_Y')}</th><th>${i18n.t('rg_col_u')}</th><th>${i18n.t('rg_col_nu')}</th><th>${i18n.t('rg_col_k')}</th><th>${i18n.t('rg_col_result')}</th></tr></thead>
      <tbody>${r.predictions.map(q => q.error
        ? `<tr><td class="num">${escHtml(q.x)}</td><td colspan="5">⚠ ${rgErrText(q.error, q.detail)}</td></tr>`
        : `<tr><td class="num">${Calc.fmtSci(q.x, 6)}${rgUnit(r.units.x)}</td><td class="num">${Calc.fmtSci(q.y, 6)}</td><td class="num">${Calc.fmtSci(q.u, 3)}</td>
            <td class="num">${rgNu(q.nu)}</td><td class="num">${q.k.toFixed(2)}</td>
            <td class="num"><strong>(${rgPair(q.y, q.U).text})${rgUnit(r.units.y)}</strong>${q.extrapolated ? ` <span class="badge badge-orange">${i18n.t('rg_extrap')}</span>` : ''}${
              !(q.U > 0) ? ` <span class="badge badge-red">⚠ ${escHtml(i18n.t('w_zero_u'))}</span>` : ''}</td></tr>`).join('')}</tbody></table>`;
  }
  function rgURange(r, cls) {
    const f = r.uRange;
    if (!f) return '';
    if (f.error) return `<h4 class="rg-h">${i18n.t('rg_urange_title')}</h4><div class="warn-box">⚠ ${rgErrText(f.error, f.detail)}</div>`;
    const expr = f.mode === 'max' ? `U = ${Calc.fmtSci(f.a, 3)}` : `U(X) = ${Calc.fmtSci(f.a, 3)} ${f.b < 0 ? '−' : '+'} ${Calc.fmtSci(Math.abs(f.b), 3)}·|X|`;
    return `<h4 class="rg-h">${i18n.t('rg_urange_title')}</h4>
      <p class="rg-line" data-rg-urange="${escHtml(f.mode)}"><strong>${i18n.t('rg_urange_applied')}:</strong> ${i18n.t('rg_urange_' + f.mode)} — <span class="mono">${expr}</span>${rgUnit(r.units.y)};
        |X| ∈ [${Calc.fmtSci(f.range[0], 4)}; ${Calc.fmtSci(f.range[1], 4)}]${f.shift > 0 ? `; ${i18n.t('rg_urange_shift')} ${Calc.fmtSci(f.shift, 3)}` : ''}</p>
      <p class="rg-line"><span class="badge badge-orange">unverified</span> ${i18n.t('rg_urange_unverified')}</p>
      <table class="${cls}"><thead><tr><th>X_j</th><th>U_j</th><th>U(X_j)</th><th>${i18n.t('rg_urange_margin')}</th></tr></thead>
      <tbody>${f.points.map(q => `<tr><td class="num">${Calc.fmtSci(q.x, 6)}</td><td class="num">${Calc.fmtSci(q.U, 3)}</td><td class="num">${Calc.fmtSci(q.Ufit, 3)}</td><td class="num">${Calc.fmtSci(q.margin, 2)}</td></tr>`).join('')}</tbody></table>`;
  }
  function rgResiduals(r, cls) {
    return `<h4 class="rg-h">${i18n.t('rg_residuals')}</h4>
      <table class="${cls}"><thead><tr><th>#</th><th>x</th><th>u(x)</th><th>y</th><th>u(y)</th><th>${i18n.t('rg_col_fitted')}</th><th>${i18n.t('rg_col_resid')}</th><th>${i18n.t('rg_col_wres')}</th></tr></thead>
      <tbody>${r.points.map((p, i) => `<tr><td>${i + 1}</td><td class="num">${escHtml(p.x)}</td><td class="num">${p.ux === null ? '—' : escHtml(p.ux)}</td>
        <td class="num">${escHtml(p.y)}</td><td class="num">${p.uy === null ? '—' : escHtml(p.uy)}</td>
        <td class="num">${Calc.fmtSci(r.fitted[i], 6)}</td><td class="num">${Calc.fmtSci(r.residuals[i], 3)}</td><td class="num">${Calc.fmtSci(r.weightedResiduals[i], 3)}</td></tr>`).join('')}</tbody></table>`;
  }

  /**
   * Regressiya bo'limi (ekran va bosma hisobot uchun bir xil mazmun).
   * @param {object} r     evaluate({format:'uc-regression/1', …}) natijasi
   * @param {{print?:boolean, plots?:string, residualTable?:boolean}} [o]  plots — src/ui/regression/view.js SVG'lari
   */
  function regressionSection(r, o) {
    const opt = o || {};
    if (!r) return '';
    if (r.error) return `<div class="warn-box" data-rg-error="${escHtml(r.error)}">⚠ ${rgErrText(r.error, r.detail)}</div>`;
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const sLine = r.sKind === 'y'
      ? `${i18n.t('rg_s')} = ${Calc.fmtSci(r.s, 4)}${rgUnit(r.units.y)}`
      : `${i18n.t('rg_s_rel')} = ${Calc.fmtSci(r.s, 4)}`;
    const anyPred = (r.inverse && r.inverse.length) || (r.predictions && r.predictions.length);
    return `<div class="rg-report" data-rg-report="1">
      <div class="${opt.print ? 'print-section' : 'rg-section-title'}">${i18n.t('rg_report_section')}</div>
      ${rgWarnings(r)}
      <p class="rg-line"><strong>${i18n.t('rg_method')}:</strong> <span data-rg-method="${escHtml(r.method)}">${i18n.t('rg_m_' + r.method)}</span>;
        <strong>${i18n.t('rg_degree')}:</strong> ${i18n.t('rg_deg_' + r.degree)}${r.xRef ? `; x₀ = ${escHtml(String(r.xRef))}${rgUnit(r.units.x)}` : ''}</p>
      <p class="rg-line">${i18n.t('rg_points_n')} = ${r.m}; ${i18n.t('rg_nu')} = ${r.nu}; ${sLine}${r.wtls ? `; ${i18n.t('rg_wtls_iter')}: ${r.wtls.iterations}` : ''}</p>
      <p class="rg-line"><strong>${i18n.t('rg_equation')}:</strong> <span class="mono" data-rg-equation="1">${rgEquation(r)}</span></p>
      <h4 class="rg-h">${i18n.t('rg_params')}</h4>
      <table class="${cls}" data-rg-params="1"><thead><tr><th>${i18n.t('rg_param')}</th><th>${i18n.t('rg_value')}</th><th>${i18n.t('rg_std_u')}</th><th>${i18n.t('rg_rel_u')}</th></tr></thead>
        <tbody>${r.params.map(p => { const v = rgPair(p.value, p.u); return `<tr><td>${escHtml(p.name)}</td><td class="num">${v.v}</td><td class="num">${v.u}</td>
          <td class="num">${p.value !== 0 ? (Math.abs(p.u / p.value) * 100).toPrecision(3) : '—'}</td></tr>`; }).join('')}</tbody></table>
      <p class="rg-line"><strong>${i18n.t('rg_basis')}:</strong> <span data-rg-basis="${escHtml(r.covarianceBasis)}">${i18n.t('rg_basis_' + r.covarianceBasis)}</span></p>
      <h4 class="rg-h">${i18n.t('rg_cov')}</h4>
      ${rgMatrix(r, cls, r.covariance, 'cov')}
      ${rgMatrix(r, cls, r.correlation, 'r')}
      ${rgChi2(r)}
      ${opt.plots || ''}
      ${rgInverse(r, cls)}
      ${rgPredict(r, cls)}
      ${anyPred ? `<p class="rg-line text-muted">${i18n.t('rg_k_note').replace('{P}', pct(r.P)).replace('{rule}', i18n.t('nu_rule_' + (r.nuRule || 'floor')))}</p>` : ''}
      ${rgURange(r, cls)}
      ${opt.residualTable ? rgResiduals(r, cls) : ''}
      <p class="rg-line text-muted text-xs">${i18n.t('rg_ref_line')}: ${i18n.t('rg_ref_text')}. ${i18n.t('rg_engine')}: ${escHtml(r.engineVersion)}</p>
    </div>`;
  }

  /** Faqat regressiya hisoboti (regressiya yorlig'idagi "Chop etish"). meta — shablon belgilari (DRAFT, demo). */
  function printRegression(r, o) {
    const opt = o || {};
    if (!r || r.error) { showToast(i18n.t('rg_empty'), 'error'); return; }
    const now = new Date().toLocaleDateString();
    const notice = opt.meta && window.UCTemplates ? window.UCTemplates.reportNoticeHTML(opt.meta, r) : '';
    document.getElementById('print-report').innerHTML = `
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
      ${notice}
      ${regressionSection(r, { print: true, plots: opt.plots, residualTable: true })}
      <div class="print-footer">
        <span>${i18n.t('report_standard')}</span>
        <span>${i18n.t('report_date')}: ${now}</span>
        <span>UncertaintyCalc</span>
      </div>`;
    document.body.classList.add('print-report-mode');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-report-mode'), { once: true });
    window.print();
  }

  /* ─── P09: TOP_DOWN rejimi hisobot bo'limi ───────────────────────
     Natija sinov protokoliga mos ko'rinishda — ISO/IEC 17025:2017 §7.8.3.1 c): noaniqlik o'lchanayotgan
     kattalik birligida yoki unga nisbatan (foizda). Ko'rsatiladi: y, U, nisbiy U %, k, qo'llanilgan yondashuv nomi.
     Byudjet, u(R_w) / u(bias) / recovery / s_R tafsilotlari, X11 / X12 va boshqa ogohlantirishlar.
     P05 gacha shu faylda; yaxlitlash faqat shu yerda (Calc.roundResult: U ≤ 2 qiymatli raqam). */
  function tdNum(v, sig) { return v === null || v === undefined || !isFinite(v) ? '—' : Calc.fmtSci(v, sig || 4); }
  function tdU2(u, up) { // noaniqlik: ko'pi bilan 2 qiymatli raqam (ILAC P14 §5)
    if (u === null || u === undefined || !isFinite(u)) return '—';
    const rr = Calc.roundResult(0, u, !!up);
    return rr.Uround.toFixed(rr.digits);
  }
  function tdScaleUnit(r) { return r.unit === '1' ? '' : ' ' + escHtml(r.unit); }
  function tdWarnings(r) {
    if (!r.warnings || !r.warnings.length) return '';
    const sev = r.warnings.filter(w => w.severity !== 'info'), info = r.warnings.filter(w => w.severity === 'info');
    const tag = w => (w.rule ? `<span class="badge badge-orange">${escHtml(w.rule)}</span> ` : '');
    return (sev.length ? `<div class="warn-box td-warnings" data-td-warnings="1">${sev.map(w => `<div data-td-warning="${escHtml(w.code)}">⚠ ${tag(w)}${rgWarnText(w)} <span class="text-xs text-muted">[${escHtml(w.ref)}]</span></div>`).join('')}</div>` : '') +
      info.map(w => `<div class="text-xs text-muted td-note" data-td-warning="${escHtml(w.code)}">ⓘ ${rgWarnText(w)}</div>`).join('');
  }
  function tdBudgetName(b) {
    if (b.kind === 'additional') return `${escHtml(b.name || b.id)} <span class="text-xs text-muted">(${i18n.t('td_cat_' + b.category)})</span>`;
    return i18n.t('td_row_' + (b.id === 'uDelta' ? 'uDelta' : b.kind));
  }
  function tdBudget(r, cls) {
    return `<h4 class="rg-h">${i18n.t('td_budget')}</h4>
      <table class="${cls}" data-td-budget="1"><thead><tr><th>${i18n.t('td_col_component')}</th><th>u${tdScaleUnit(r)}</th><th>u²</th><th>ν</th><th>${i18n.t('td_col_share')}</th><th>${i18n.t('td_col_note')}</th></tr></thead>
        <tbody>${r.budget.map(b => `<tr data-td-row="${escHtml(b.id)}"${b.included ? '' : ' class="td-excluded"'}>
          <td>${tdBudgetName(b)}</td><td class="num">${tdNum(b.u)}</td><td class="num">${tdNum(b.variance)}</td><td class="num">${rgNu(b.nu)}</td>
          <td class="num">${b.included ? b.share.toFixed(1) : '—'}</td>
          <td>${b.flag ? `<span class="badge badge-orange" data-td-flag="${escHtml(b.flag)}">${escHtml(b.flag)}</span> ` : ''}${b.included ? '' : i18n.t('td_excluded')}</td></tr>`).join('')}
          <tr class="td-total"><td><strong>u_c</strong></td><td class="num"><strong>${tdNum(r.uc)}</strong></td><td class="num">${tdNum(r.uc2)}</td><td class="num">${rgNu(r.nuEff)}</td><td class="num">100.0</td><td></td></tr>
        </tbody></table>`;
  }
  function tdRw(r, cls) {
    if (!r.rw) return '';
    return `<h4 class="rg-h">${i18n.t('td_rw_title')}</h4>
      <table class="${cls}" data-td-rw="1"><thead><tr><th>${i18n.t('td_col_source')}</th><th>n</th><th>${i18n.t('td_col_mean')}</th><th>s</th><th>u${tdScaleUnit(r)}</th></tr></thead>
        <tbody>${r.rw.components.map(c => `<tr><td>${i18n.t('td_src_' + c.type)}${c.relativeMethod ? ` <span class="text-xs text-muted">(${i18n.t('td_dup_' + c.relativeMethod)})</span>` : ''}</td>
          <td class="num">${c.n === null || c.n === undefined ? '—' : escHtml(String(c.n))}</td><td class="num">${tdNum(c.mean)}</td><td class="num">${tdNum(c.s)}</td><td class="num">${tdNum(c.u)}</td></tr>`).join('')}
          <tr class="td-total"><td><strong>u(R_w)</strong></td><td></td><td></td><td></td><td class="num"><strong>${tdNum(r.rw.u)}</strong></td></tr></tbody></table>`;
  }
  function tdBias(r, cls) {
    const b = r.bias;
    if (!b) return '';
    const single = b.formula === 'single_crm';
    return `<h4 class="rg-h">${i18n.t('td_bias_title')}: ${i18n.t('td_bias_' + b.type)}</h4>
      <table class="${cls}" data-td-bias="1"><thead><tr><th>#</th><th>bias${tdScaleUnit(r)}</th><th>u(C_ref)${tdScaleUnit(r)}</th></tr></thead>
        <tbody>${b.items.map(it => `<tr><td>${escHtml(it.id)}</td><td class="num">${tdNum(it.bias)}</td><td class="num">${tdNum(it.uRef)}</td></tr>`).join('')}</tbody></table>
      <p class="rg-line">${single ? `bias = ${tdNum(b.rms)}; s_bias/√n = ${tdNum(b.sMean)}` : `RMS_bias = ${tdNum(b.rms)} (N = ${b.n})`}; u(C_ref) = ${tdNum(b.uRef)};
        <strong>u(bias) = ${tdNum(b.u)}${tdScaleUnit(r)}</strong> — <span class="mono">${single ? '√(bias² + (s_bias/√n)² + u(C_ref)²)' : '√(RMS_bias² + u(C_ref)²)'}</span></p>`;
  }
  function tdRecovery(r) {
    const c = r.recovery;
    if (!c) return '';
    return `<h4 class="rg-h">${i18n.t('td_rec_title')}</h4>
      <p class="rg-line" data-td-recovery="${c.significant ? 'significant' : 'not_significant'}">R_m = ${tdNum(c.Rm)}${tdScaleUnit(r)}; s = ${tdNum(c.s)}; n = ${c.n};
        u(R_m) = s/√n = ${tdNum(c.uRm)}; t = |1 − R_m|/u(R_m) = ${tdNum(c.t, 3)}; t_crit(${Math.round(c.P * 100)} %, ν = ${c.nu}) = ${tdNum(c.tCrit, 4)}
        <span class="badge ${c.significant ? 'badge-orange' : 'badge-green'}">${i18n.t(c.significant ? 'td_rec_sig' : 'td_rec_nosig')}</span></p>
      <p class="rg-line"><strong>${i18n.t('td_rec_correction')}:</strong> <span data-td-correction="${escHtml(c.correction)}">${i18n.t('td_corr_' + c.correction)}</span>;
        ${i18n.t('td_rec_contrib')} = ${tdNum(c.u)}${tdScaleUnit(r)}${r.yCorrected !== null ? `; ${i18n.t('td_y_corrected')} = ${tdNum(r.yCorrected, 6)}${rgUnit(r.yUnit)}` : ''}</p>`;
  }
  function tdRepro(r) {
    const p = r.reproducibility;
    if (!p) return '';
    const l = p.lab;
    return `<h4 class="rg-h">${i18n.t('td_sr_title')}</h4>
      <p class="rg-line" data-td-sr="1">s_R = ${tdNum(p.sR)}${tdScaleUnit(r)}${p.sr !== null ? `; s_r = ${tdNum(p.sr)}${tdScaleUnit(r)}` : ''}${p.sRUsed !== p.sR ? `; s_R′ = ${tdNum(p.sRUsed)}${tdScaleUnit(r)}` : ''}</p>
      ${l ? `<p class="rg-line" data-td-labcheck="${l.pass ? 'pass' : 'fail'}"><strong>${i18n.t('td_lab_check')}:</strong> s_lab = ${tdNum(l.s)} (n = ${escHtml(String(l.n))}); s_lab/s_r = ${tdNum(l.ratio, 3)};
        χ² = ${tdNum(l.chi2, 4)} ${l.pass ? '≤' : '&gt;'} ${tdNum(l.chi2Crit, 4)} <span class="badge ${l.pass ? 'badge-green' : 'badge-orange'}">${i18n.t(l.pass ? 'td_lab_pass' : 'td_lab_fail')}</span>
        <span class="badge badge-orange">unverified</span></p>` : ''}`;
  }
  function tdLevel(r) {
    const l = r.level;
    if (!l) return '';
    return `<h4 class="rg-h">${i18n.t('td_level_title')}</h4>
      <p class="rg-line" data-td-level="1"><span class="mono">u(x) = √(s₀² + (x·s₁)²)</span>; s₀ = ${tdNum(l.s0)}${tdScaleUnit(r)}; s₁ = ${tdNum(l.s1)}; x = ${tdNum(l.x, 6)}${tdScaleUnit(r)}</p>`;
  }

  /**
   * Top-down bo'limi (ekran va bosma hisobot uchun bir xil mazmun).
   * @param {object} r  evaluate({format:'uc-topdown/1', …}) natijasi
   * @param {{print?:boolean}} [o]
   */
  function topdownSection(r, o) {
    const opt = o || {};
    if (!r) return '';
    if (r.error) return `<div class="warn-box" data-td-error="${escHtml(r.error)}">⚠ ${rgErrText(r.error, r.detail)}</div>`;
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const approach = `${i18n.t('td_approach_' + r.approach)}${r.hybrid ? ' + ' + i18n.t('td_hybrid') : ''}`;
    // Natija: y ± U (o'lchanayotgan kattalik birligida) va nisbiy U, % — ISO/IEC 17025:2017 §7.8.3.1 c)
    const yShown = r.yCorrected !== null ? r.yCorrected : r.y;
    const hasAbs = yShown !== null && r.absU !== null;
    const rr = hasAbs ? Calc.roundResult(yShown, r.absU, r.roundUp) : null;
    const unit = rgUnit(r.absUnit);
    const yCell = yShown === null ? '—' : (rr ? rr.yround.toFixed(rr.digits) : tdNum(yShown, 6)) + unit;
    const uCell = r.absU === null ? '—' : tdU2(r.absU, r.roundUp) + unit;
    const relCell = r.relU === null ? '—' : tdU2(r.relU, r.roundUp) + ' %';
    const statement = rr
      ? `(${rr.resultText})${unit}; U<sub>rel</sub> = ${relCell}`
      : (r.scale === 'relative' ? `U<sub>rel</sub> = ${relCell}` : `U = ${uCell}`);
    return `<div class="rg-report td-report" data-td-report="1">
      <div class="${opt.print ? 'print-section' : 'rg-section-title'}">${i18n.t('td_report_section')}</div>
      ${tdWarnings(r)}
      <table class="${cls} td-result" data-td-result="1"><thead><tr>
        <th>${i18n.t('td_col_y')}</th><th>${i18n.t('td_col_U')}</th><th>${i18n.t('td_col_Urel')}</th><th>k</th><th>${i18n.t('td_col_approach')}</th></tr></thead>
        <tbody><tr><td class="num" data-td-y="1">${yCell}</td><td class="num" data-td-u="1"><strong>${uCell}</strong></td>
          <td class="num" data-td-urel="1"><strong>${relCell}</strong></td><td class="num" data-td-k="1">${escHtml(String(r.k))}</td>
          <td data-td-approach="${escHtml(r.approach)}">${approach}<div class="text-xs text-muted">${escHtml(r.approachRef)}</div></td></tr></tbody></table>
      <p class="rg-line" data-td-statement="1"><strong>${i18n.t('td_statement')}:</strong> ${statement}; <span data-td-kline="1">k = ${escHtml(String(r.k))}${r.k === 2 ? ', P ≈ 95 %' : ''}</span>; ${i18n.t('td_col_approach')}: ${approach}.</p>
      <p class="rg-line" data-td-nueff="${isFinite(r.nuEff) ? r.nuEff.toFixed(1) : 'inf'}"><strong>ν<sub>eff</sub></strong> = ${rgNu(r.nuEff)} (${i18n.t('td_nu_note')})${
        r.kSuggested !== null ? `; <span data-td-ksuggested="1">${i18n.t('td_k_suggested').replace('{P}', pct(r.P)).replace('{nu}', String(Math.max(1, Math.floor(r.nuEff))))} = ${r.kSuggested.toFixed(2)}</span> — ${i18n.t('td_k_unchanged')}` : ''}</p>
      <p class="rg-line"><strong>${i18n.t('td_scale')}:</strong> <span data-td-scale="${escHtml(r.scale)}">${i18n.t('td_scale_' + r.scale)}${tdScaleUnit(r) ? ' (' + escHtml(r.unit) + ')' : ''}</span>;
        u_c = ${tdNum(r.uc)}${tdScaleUnit(r)}; U = k·u_c = ${tdNum(r.U)}${tdScaleUnit(r)}${r.y === null && r.scale === 'relative' ? `. ${i18n.t('td_no_y')}` : ''}</p>
      ${r.isEmpiricalMeasurand ? `<p class="rg-line" data-td-empirical="1">ⓘ ${i18n.t('td_empirical_note')}</p>` : ''}
      ${tdBudget(r, cls)}
      ${tdRw(r, cls)}${tdBias(r, cls)}${tdRecovery(r)}${tdRepro(r)}${tdLevel(r)}
      <p class="rg-line text-muted text-xs">${i18n.t('rg_ref_line')}: ${i18n.t('td_ref_text')}. ${i18n.t('rg_engine')}: ${escHtml(r.engineVersion)}</p>
    </div>`;
  }

  /** Faqat top-down hisoboti ("Chop etish"). meta — shablon belgilari (DRAFT). */
  function printTopdown(r, o) {
    const opt = o || {};
    if (!r || r.error) { showToast(i18n.t('td_empty'), 'error'); return; }
    const now = new Date().toLocaleDateString();
    const notice = opt.meta && window.UCTemplates ? window.UCTemplates.reportNoticeHTML(opt.meta, r) : '';
    document.getElementById('print-report').innerHTML = `
      <div class="print-report-header">
        <div>
          <div class="print-report-title">${i18n.t('report_title')}</div>
          <div class="print-report-meta">${i18n.t('td_report_standard')}</div>
        </div>
        <div style="text-align:right;font-size:9pt;color:#555">
          <div>${i18n.t('report_date')}: ${now}</div>
          <div>${i18n.t('report_lab')}: _______________________</div>
          <div>${i18n.t('report_operator')}: ____________________</div>
        </div>
      </div>
      ${notice}
      ${topdownSection(r, { print: true })}
      <div class="print-footer">
        <span>${i18n.t('td_report_standard')}</span>
        <span>${i18n.t('report_date')}: ${now}</span>
        <span>UncertaintyCalc</span>
      </div>`;
    document.body.classList.add('print-report-mode');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-report-mode'), { once: true });
    window.print();
  }

  /* ─── P10: maxsus rejimlar hisobot bo'limlari ────────────────────
     Namuna olish (dublikat usuli, ANOVA), sifatli test (2×2), mikrobiologiya (BETA), tibbiy laboratoriya (BETA).
     Har bir bo'limda: natija, qo'llanilgan yondashuv nomi va manbasi, cheklovlar, ogohlantirishlar.
     P05 gacha shu faylda; yaxlitlash faqat shu yerda. */
  function spWarnings(r) {
    if (!r.warnings || !r.warnings.length) return '';
    const sev = r.warnings.filter(w => w.severity !== 'info'), info = r.warnings.filter(w => w.severity === 'info');
    return (sev.length ? `<div class="warn-box td-warnings" data-sp-warnings="1">${sev.map(w => `<div data-sp-warning="${escHtml(w.code)}">⚠ ${rgWarnText(w)} <span class="text-xs text-muted">[${escHtml(w.ref)}]</span></div>`).join('')}</div>` : '') +
      info.map(w => `<div class="text-xs text-muted td-note" data-sp-warning="${escHtml(w.code)}">ⓘ ${rgWarnText(w)}</div>`).join('');
  }
  function spHead(r, opt, inner) {
    return `<div class="rg-report td-report sp-report" data-sp-report="${escHtml(r.mode)}">
      <div class="${opt.print ? 'print-section' : 'rg-section-title'}">${i18n.t('sp_section_' + r.mode)}${r.unverified ? ' <span class="badge badge-orange" data-sp-beta="1">BETA</span>' : ''}</div>
      ${spWarnings(r)}
      ${inner}
      <p class="rg-line" data-sp-approach="${escHtml(r.approach)}"><strong>${i18n.t('td_col_approach')}:</strong> ${i18n.t('sp_approach_' + r.approach)} <span class="text-xs text-muted">[${escHtml(r.approachRef)}]</span></p>
      <p class="rg-line" data-sp-limits="1"><strong>${i18n.t('sp_limits')}:</strong> ${i18n.t('sp_limits_' + r.mode)}</p>
      <p class="rg-line text-muted text-xs">${i18n.t('rg_engine')}: ${escHtml(r.engineVersion)}</p>
    </div>`;
  }
  const spPct = (v, d) => (v === null || v === undefined || !isFinite(v) ? '—' : (100 * v).toFixed(d === undefined ? 1 : d));

  function samplingSection(r, opt) {
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const unit = rgUnit(r.unit);
    const rr = r.y !== null && r.absU !== null ? Calc.roundResult(r.y, r.absU, r.roundUp) : null;
    const col = (a, used) => `<td class="num"${used ? ' data-sp-used="1"' : ''}>${tdNum(a.mean, 8)}</td><td class="num">${tdNum(a.s.between, 6)}</td><td class="num">${tdNum(a.s.sampling, 6)}</td>
      <td class="num">${tdNum(a.s.analysis, 6)}</td><td class="num"><strong>${tdNum(a.s.measurement, 6)}</strong></td><td class="num">${a.variancePct.measurement.toFixed(1)}</td><td class="num">${tdU2(a.relU.measurement)}</td>`;
    return spHead(r, opt, `
      <table class="${cls} td-result" data-sp-result="1"><thead><tr><th>${i18n.t('td_col_y')}</th><th>${i18n.t('td_col_U')}</th><th>${i18n.t('td_col_Urel')}</th><th>k</th><th>s<sub>samp</sub></th><th>s<sub>anal</sub></th><th>s<sub>meas</sub></th></tr></thead>
        <tbody><tr><td class="num" data-sp-y="1">${rr ? rr.yround.toFixed(rr.digits) + unit : '—'}</td><td class="num" data-sp-u="1"><strong>${rr ? rr.Uround.toFixed(rr.digits) + unit : '—'}</strong></td>
          <td class="num" data-sp-urel="1"><strong>${tdU2(r.relU, r.roundUp)} %</strong></td><td class="num">${escHtml(String(r.k))}</td>
          <td class="num" data-sp-ssamp="1">${tdNum(r.sSamp, 5)}${unit}</td><td class="num" data-sp-sanal="1">${tdNum(r.sAnal, 5)}${unit}</td><td class="num" data-sp-smeas="1">${tdNum(r.uc, 5)}${unit}</td></tr></tbody></table>
      <p class="rg-line"><span class="mono">s<sub>meas</sub>² = s<sub>samp</sub>² + s<sub>anal</sub>²; U′ = ${escHtml(String(r.k))}·100·s<sub>meas</sub>/x̄</span>; ${i18n.t('sp_sa_n_targets')} = ${r.nTargets};
        U′<sub>samp</sub> = ${tdU2(r.relUSamp)} %; U′<sub>anal</sub> = ${tdU2(r.relUAnal)} %</p>
      <h4 class="rg-h">${i18n.t('sp_sa_anova')}</h4>
      <table class="${cls}" data-sp-anova="1"><thead><tr><th>${i18n.t('sp_sa_method')}</th><th>x̄</th><th>s<sub>between</sub></th><th>s<sub>samp</sub></th><th>s<sub>anal</sub></th><th>s<sub>meas</sub></th><th>${i18n.t('sp_sa_meas_pct')}</th><th>U′, %</th></tr></thead>
        <tbody>${['classical', 'robust'].map(m => `<tr data-sp-method="${m}"${r.method === m ? ' class="td-total"' : ''}><td>${i18n.t('sp_sa_' + m)}${r.method === m ? ' ✓' : ''}</td>${col(r[m], r.method === m)}</tr>`).join('')}</tbody></table>
      ${r.log ? `<p class="rg-line" data-sp-fu="1"><strong>${i18n.t('sp_sa_fu')}:</strong> <sup>F</sup>U = exp(${escHtml(String(r.k))}·s<sub>G,meas</sub>) = ${tdNum(r.log.uncertaintyFactor.measurement, 5)}
        (s<sub>G,meas</sub> = ${tdNum(r.log.sG.measurement, 4)}; ${i18n.t('sp_sa_gmean')} = ${tdNum(r.log.geometricMean, 4)}${unit})${r.y !== null ? `; ${i18n.t('sp_sa_fu_interval')}: [${tdNum(r.y / r.log.uncertaintyFactor.measurement, 4)}; ${tdNum(r.y * r.log.uncertaintyFactor.measurement, 4)}]${unit}` : ''}</p>` : ''}`);
  }

  function qualitativeSection(r, opt) {
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const ci = c => (c ? `[${spPct(c.low)}; ${spPct(c.high)}]` : '—');
    const t = r.table;
    // Egasi qarori (2026-11-18, R-21): hisobotga faqat tanlangan usul intervali chiqadi (standart — Wilson);
    // ekrandagi batafsil ko'rinishda ikkinchisi solishtirish uchun ko'rsatiladi, bosma hisobotda — yo'q.
    const method = r.ciMethod || 'wilson', other = method === 'wilson' ? 'clopper_pearson' : 'wilson';
    const field = { wilson: 'wilson', clopper_pearson: 'clopperPearson' };
    const compare = !opt.print && !!t;
    const row = (key, q) => `<tr data-sp-rate="${key}"><td>${i18n.t('sp_ql_' + key)}</td><td class="num"><strong>${spPct(q.value)}</strong></td><td class="num">${q.n !== undefined ? `${q.x} / ${q.n}` : '—'}</td>
      <td class="num" data-sp-ci="${method}"><strong>${ci(q[field[method]])}</strong></td>${compare ? `<td class="num text-muted" data-sp-ci-compare="${other}">${ci(q[field[other]])}</td>` : ''}</tr>`;
    const lr = v => (isFinite(v) ? tdNum(v, 4) : '∞');
    return spHead(r, opt, `
      ${t ? `<table class="${cls} sp-2x2" data-sp-table="1"><thead><tr><th></th><th>${i18n.t('sp_ql_case_pos')}</th><th>${i18n.t('sp_ql_case_neg')}</th></tr></thead>
        <tbody><tr><th>${i18n.t('sp_ql_res_pos')}</th><td class="num">tp = ${t.tp}</td><td class="num">fp = ${t.fp}</td></tr>
          <tr><th>${i18n.t('sp_ql_res_neg')}</th><td class="num">fn = ${t.fn}</td><td class="num">tn = ${t.tn}</td></tr></tbody></table>` : ''}
      <table class="${cls}" data-sp-rates="1"><thead><tr><th>${i18n.t('sp_ql_metric')}</th><th>%</th><th>x / n</th><th>${i18n.t('sp_ql_ci').replace('{P}', pct(r.P))} — ${i18n.t('sp_ci_' + method)}</th>${compare ? `<th class="text-muted">${i18n.t('sp_ql_ci_compare')}: ${i18n.t('sp_ci_' + other)}</th>` : ''}</tr></thead>
        <tbody>${row('ss', r.sensitivity)}${row('sp', r.specificity)}${row('fp', r.falsePositiveRate)}${row('fn', r.falseNegativeRate)}
          ${r.ppvStudy ? row('ppv', r.ppvStudy) : ''}${r.npvStudy ? row('npv', r.npvStudy) : ''}</tbody></table>
      ${t ? `<p class="rg-line" data-sp-cimethod="${escHtml(method)}"><strong>${i18n.t('sp_ql_ci_method')}:</strong> ${i18n.t('sp_ci_' + method)}; P = ${pct(r.P)} % <span class="text-xs text-muted">[${i18n.t('sp_ci_ref_' + method)}]</span></p>` : ''}
      <p class="rg-line" data-sp-lr="1">LR(+) = TP/FP = ${lr(r.lrPositive)}; LR(−) = FN/TN = ${lr(r.lrNegative)}</p>
      ${r.prevalence !== null ? `<p class="rg-line" data-sp-posterior="1"><strong>${i18n.t('sp_ql_posterior')}</strong> (${i18n.t('sp_ql_prev')} ${spPct(r.prevalence)} %): PP = ${spPct(r.posteriorPositive, 2)} %; PN = ${spPct(r.posteriorNegative, 2)} %</p>`
        : (r.studyPrevalence !== null ? `<p class="rg-line text-muted">${i18n.t('sp_ql_study_prev')}: ${spPct(r.studyPrevalence)} %</p>` : '')}`);
  }

  function microSection(r, opt) {
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const rr = Calc.roundResult(r.y, r.U, r.roundUp);
    const unit = rgUnit(r.unit);
    return spHead(r, opt, `
      <table class="${cls} td-result" data-sp-result="1"><thead><tr><th>${i18n.t('sp_mi_value')}</th><th>log₁₀ y</th><th>U (log₁₀)</th><th>k</th><th>${i18n.t('sp_mi_interval')}</th></tr></thead>
        <tbody><tr><td class="num">${tdNum(r.value, 3)}${unit}</td><td class="num" data-sp-y="1">${rr.yround.toFixed(rr.digits)}</td><td class="num" data-sp-u="1"><strong>${rr.Uround.toFixed(rr.digits)}</strong></td><td class="num">${escHtml(String(r.k))}</td>
          <td class="num" data-sp-interval="1">[${tdNum(r.interval.low, 2)}; ${tdNum(r.interval.high, 2)}]${unit}</td></tr></tbody></table>
      <p class="rg-line"><strong>${i18n.t('td_statement')}:</strong> log₁₀ = ${rr.resultText}; ${i18n.t('sp_mi_interval')} [10<sup>y−U</sup>; 10<sup>y+U</sup>]; k = ${escHtml(String(r.k))}; ΣC = ${escHtml(String(r.sumCounts))}</p>
      <h4 class="rg-h">${i18n.t('td_budget')}</h4>
      <table class="${cls}" data-sp-budget="1"><thead><tr><th>${i18n.t('td_col_component')}</th><th>u (log₁₀)</th><th>${i18n.t('td_col_share')}</th></tr></thead>
        <tbody>${r.budget.map(b => `<tr data-sp-row="${escHtml(b.id)}"><td>${i18n.t('sp_mi_u_' + b.id)}</td><td class="num">${tdNum(b.u)}</td><td class="num">${b.share.toFixed(1)}</td></tr>`).join('')}
          <tr class="td-total"><td><strong>u_c</strong></td><td class="num"><strong>${tdNum(r.uc)}</strong></td><td class="num">100.0</td></tr></tbody></table>`);
  }

  function medicalSection(r, opt) {
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const unit = rgUnit(r.unit);
    const rr = r.y !== null ? Calc.roundResult(r.y, r.absU, r.roundUp) : null;
    const q = v => (v ? `${tdNum(v.abs)} (${tdNum(v.rel, 3)} %)` : '—');
    return spHead(r, opt, `
      ${rr ? `<table class="${cls} td-result" data-sp-result="1"><thead><tr><th>${i18n.t('td_col_y')}</th><th>${i18n.t('td_col_U')}</th><th>${i18n.t('td_col_Urel')}</th><th>k</th><th>${i18n.t('sp_me_level')}</th></tr></thead>
        <tbody><tr><td class="num" data-sp-y="1">${rr.yround.toFixed(rr.digits)}${unit}</td><td class="num" data-sp-u="1"><strong>${rr.Uround.toFixed(rr.digits)}${unit}</strong></td>
          <td class="num" data-sp-urel="1"><strong>${tdU2(r.relU, r.roundUp)} %</strong></td><td class="num">${escHtml(String(r.k))}</td><td>${escHtml(r.appliedLevel)}</td></tr></tbody></table>` : ''}
      <h4 class="rg-h">${i18n.t('sp_me_levels_title')}</h4>
      <table class="${cls}" data-sp-levels="1"><thead><tr><th>${i18n.t('sp_me_level')}</th><th>x̄${unit}</th><th>n</th><th>u<sub>Rw</sub></th><th>u<sub>cal</sub></th><th>u<sub>bias</sub></th><th>u</th><th>U (k = ${escHtml(String(r.k))})</th></tr></thead>
        <tbody>${r.levels.map(L => `<tr data-sp-level="${escHtml(L.id)}"><td>${escHtml(L.id)}</td><td class="num">${tdNum(L.mean, 6)}</td><td class="num">${L.n === null ? '—' : escHtml(String(L.n))}</td>
          <td class="num">${q(L.uRw)}</td><td class="num">${q(L.uCal)}</td><td class="num">${q(L.uBias)}</td><td class="num">${q(L.u)}</td><td class="num"><strong>${tdU2(L.U.abs)}${unit} (${tdU2(L.U.rel)} %)</strong></td></tr>`).join('')}</tbody></table>
      <p class="rg-line"><span class="mono">u = √(u<sub>cal</sub>² + u<sub>Rw</sub>² + u<sub>bias</sub>²)</span></p>`);
  }

  /** Maxsus rejim natijasi → hisobot bo'limi (rejim natijadagi `mode` bo'yicha tanlanadi). */
  function specialSection(r, o) {
    const opt = o || {};
    if (!r) return '';
    if (r.error) return `<div class="warn-box" data-sp-error="${escHtml(r.error)}">⚠ ${rgErrText(r.error, r.detail)}</div>`;
    const fn = { SAMPLING: samplingSection, QUALITATIVE: qualitativeSection, MICROBIOLOGY: microSection, MEDICAL: medicalSection }[r.mode];
    return fn ? fn(r, opt) : '';
  }

  function printSpecial(r, o) {
    const opt = o || {};
    if (!r || r.error) { showToast(i18n.t('sp_empty'), 'error'); return; }
    const now = new Date().toLocaleDateString();
    const notice = opt.meta && window.UCTemplates ? window.UCTemplates.reportNoticeHTML(opt.meta, r) : '';
    document.getElementById('print-report').innerHTML = `
      <div class="print-report-header">
        <div>
          <div class="print-report-title">${i18n.t('report_title')}</div>
          <div class="print-report-meta">${escHtml(r.approachRef)}</div>
        </div>
        <div style="text-align:right;font-size:9pt;color:#555">
          <div>${i18n.t('report_date')}: ${now}</div>
          <div>${i18n.t('report_lab')}: _______________________</div>
          <div>${i18n.t('report_operator')}: ____________________</div>
        </div>
      </div>
      ${notice}
      ${specialSection(r, { print: true })}
      <div class="print-footer">
        <span>${escHtml(r.approachRef)}</span>
        <span>${i18n.t('report_date')}: ${now}</span>
        <span>UncertaintyCalc</span>
      </div>`;
    document.body.classList.add('print-report-mode');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-report-mode'), { once: true });
    window.print();
  }

  function isBlankCell(v) { return v === '' || v === null || v === undefined; }

  // Yagona escape: src/ui/escape.js (P02)
  const escHtml = window.escHtml;

  return { init, render, regressionSection, printRegression, topdownSection, printTopdown, specialSection, printSpecial };

})();

window.Results = Results;
