/* ═══════════════════════════════════════════════════════════════
   TABLE.JS — Dynamic measurement data table with Type A stats
═══════════════════════════════════════════════════════════════ */

const Table = (() => {

  let _currentParam = null;

  /* P22-1: yagona "Yangi hisob" oqimi — sof model src/ui/flow/model.js (window.UCFlow; src/ui/flow/app.js ulaydi) */
  const Flow = () => window.UCFlow;
  const RELEVANT = ['params', 'measurements', 'n', 'model', 'settings', 'directions', 'units', 'outputs', 'typeB', 'template'];

  function init() {
    const clear = document.getElementById('btn-clear-data');
    if (clear) clear.addEventListener('click', clearData);
    document.addEventListener('click', e => {
      const next = e.target.closest && e.target.closest('[data-flow-next]');
      if (next) proceed(next.dataset.flowNext);
    });

    appState.subscribe((changes) => {
      if (changes && !RELEVANT.some(k => changes[k] !== undefined)) return;
      if (fitTable()) return;          // resizeN qayta xabar beradi — chizish o'sha chaqiruvda
      render();
      autoTypeA();
    });

    if (!fitTable()) { render(); autoTypeA(); }
  }

  /* N — jadvaldan: to'ldirilgan qatorlar + bitta bo'sh qator (ko'pi bilan 100). true — holat o'zgartirildi. */
  function fitTable() {
    if (!Flow()) return false;
    const state = appState.get();
    if (!state.params || !state.params.length) return false;
    const want = Flow().fitRows(state);
    if (state.n === want && state.params.every(p => (state.measurements[p] || []).length === want)) return false;
    appState.resizeN(want);
    return true;
  }

  /* A tur — alohida tugmasiz: ma'lumot, usul yoki yo'nalish o'zgarganda qayta hisoblanadi (Calc.typeAx — dvigatel;
     bu yerda formula yo'q). state.typeA faqat ko'rsatish / qadam holati uchun — yakuniy hisob uni o'zi qayta oladi. */
  function autoTypeA() {
    const state = appState.get();
    const typeA = {};
    (state.params || []).forEach(p => { const r = taFor(state, p); if (r) typeA[p] = r; });
    if (JSON.stringify(typeA) !== JSON.stringify(state.typeA || {})) appState.set({ typeA });
  }

  function render() {
    const state = appState.get();
    if (!_currentParam || !state.params.includes(_currentParam)) {
      _currentParam = state.params[0];
    }
    renderParamTabs();
    renderModelBox();
    renderDataOptions();
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

  /* ── Measurement model: y = f(x1…xN) ── */
  /* P07: state.outputs — to'liq ro'yxat (≥ 2 element) yoki yo'q. Birinchi element har doim state.model bilan bir xil. */
  function extraOutputs(state) {
    const o = state && Array.isArray(state.outputs) ? state.outputs : [];
    return o.length > 1 ? o.slice(1) : [];
  }
  function outputsPatch(model, extras) {
    return { outputs: extras.length ? [{ formula: model.formula || '', unit: model.unit || '' }].concat(extras) : undefined };
  }

  function renderModelBox(force) {
    const box = document.getElementById('model-box');
    if (!box) return;
    const active = document.activeElement;
    const typing = box.contains(active) && active.tagName === 'INPUT' && active.type === 'text';
    if (typing && !force) { updateModelStatus(); return; }
    const keep = typing && active.id === 'model-formula' ? { start: active.selectionStart, end: active.selectionEnd } : null;

    const state = appState.get();
    const model = state.model || {};
    // Shablon rejimi: formula va chiqishlar shablondan — qulflangan (shablon tekshirilgan metodika; parametrlar ro'yxati
    // shablonda qotirilgan, formuladan qayta yig'ilmaydi). O'zgartirish — faqat "Shablondan ajratib tahrirlash" orqali.
    const locked = tplLocked(state);
    const ro = locked ? ' readonly aria-readonly="true"' : '';
    const chips = state.params.map(p => `<button type="button" class="model-chip" data-ins="${escHtml(p)}"${locked ? ' disabled' : ''}>${escHtml(p)}</button>`).join('');

    box.innerHTML = `
      <div class="model-card">
        <div class="model-card-title">${i18n.t('model_title')} <span class="text-muted text-xs">GUM 4.1</span></div>
        <div class="model-row">
          <div class="form-group model-formula-group">
            <label>${i18n.t('model_formula')}</label>
            <input type="text" id="model-formula" class="mono" value="${escHtml(model.formula || '')}"
              placeholder="${escHtml(i18n.t('model_ph'))}" autocomplete="off" autocorrect="off" spellcheck="false"${ro} />
          </div>
          <div class="form-group model-unit-group">
            <label>${i18n.t('model_unit')}</label>
            <input type="text" id="model-unit" value="${escHtml(model.unit || '')}" placeholder="g/cm³" autocomplete="off"${ro} />
          </div>
        </div>
        <div class="model-outputs" data-model-outputs="1">
          ${extraOutputs(state).map((o, j) => `
          <div class="model-row" data-out-row="${j}">
            <div class="form-group model-formula-group">
              <label>${i18n.t('model_output_n')} ${j + 2}</label>
              <input type="text" class="mono" data-out-formula="${j}" value="${escHtml(o.formula || '')}"
                placeholder="${escHtml(i18n.t('model_output_ph'))}" autocomplete="off" autocorrect="off" spellcheck="false"${ro} />
            </div>
            <div class="form-group model-unit-group">
              <label>${i18n.t('model_unit')}</label>
              <input type="text" data-out-unit="${j}" value="${escHtml(o.unit || '')}" autocomplete="off" />
            </div>
            ${locked ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-out-remove="${j}" title="${escHtml(i18n.t('model_remove_output'))}">✕</button>`}
          </div>`).join('')}
          ${locked ? '' : `<button type="button" class="btn btn-outline btn-sm" data-out-add="1">+ ${i18n.t('model_add_output')}</button>
          <span class="text-muted text-xs">${i18n.t('model_outputs_hint')}</span>`}
        </div>
        ${locked ? `<div class="model-locked" role="note" data-model-locked="1">
          <span>${escHtml(i18n.t('flow_tpl_locked'))}</span>
          <button type="button" class="btn btn-outline btn-sm" data-tpl-detach="1">${escHtml(i18n.t('flow_tpl_detach'))}</button>
        </div>` : ''}
        <div class="model-chips">${chips}
          <span class="text-muted text-xs">+ − × / ^ ( ) · sqrt ln log exp sin cos tan abs pi</span>
        </div>
        <div id="model-status" class="model-status"></div>
        <div class="model-units">
          <span class="text-xs text-muted">${i18n.t('unit_row')}:</span>
          ${state.params.map(p => `<label class="unit-field"><span class="mono">${escHtml(p)}</span>
            <input type="text" data-unit-param="${escHtml(p)}" value="${escHtml(((state.units || {})[p]) || '')}" placeholder="${escHtml(i18n.t('unit_ph'))}" autocomplete="off" /></label>`).join('')}
        </div>
        <div id="model-units-status" class="model-status"></div>
        <div id="model-unused" class="model-unused"></div>
      </div>`;

    const fEl = box.querySelector('#model-formula');
    const detachBtn = box.querySelector('[data-tpl-detach]');
    if (detachBtn) detachBtn.addEventListener('click', detachTemplate);
    const saveModel = () => {
      const cur = appState.get('model') || {};
      const lock = tplLocked(appState.get());
      const formula = lock ? (cur.formula || '') : fEl.value.trim();
      const unit = lock ? (cur.unit || '') : box.querySelector('#model-unit').value.trim();
      if (cur.formula !== formula || cur.unit !== unit) appState.set({ model: { formula, unit }, ...outputsPatch({ formula, unit }, extraOutputs(appState.get())), combined: null });
      if (commitParams()) renderModelBox(true); else { renderUnused(); updateModelStatus(); }
    };
    // P07: qo'shimcha chiqishlar (vektor model, JCGM 102:2011 §6.2) — state.outputs = [asosiy formula, …qo'shimchalar]
    const setExtras = extras => { appState.set({ ...outputsPatch(appState.get('model') || {}, extras), combined: null }); if (commitParams()) renderModelBox(true); else renderUnused(); };
    box.querySelectorAll('[data-out-formula], [data-out-unit]').forEach(inp => inp.addEventListener('change', () => {
      if (locked && inp.dataset.outFormula !== undefined) return;
      const extras = extraOutputs(appState.get()).map(o => ({ ...o }));
      const j = Number(inp.dataset.outFormula !== undefined ? inp.dataset.outFormula : inp.dataset.outUnit);
      if (!extras[j]) return;
      if (inp.dataset.outFormula !== undefined) extras[j].formula = inp.value.trim(); else extras[j].unit = inp.value.trim();
      setExtras(extras);
    }));
    box.querySelectorAll('[data-out-remove]').forEach(btn => btn.addEventListener('click', () => {
      const extras = extraOutputs(appState.get()).map(o => ({ ...o }));
      extras.splice(Number(btn.dataset.outRemove), 1);
      setExtras(extras);
      renderModelBox();
    }));
    const addBtn = box.querySelector('[data-out-add]');
    if (addBtn) addBtn.addEventListener('click', () => { setExtras(extraOutputs(appState.get()).map(o => ({ ...o })).concat([{ formula: '', unit: '' }])); renderModelBox(); });
    fEl.addEventListener('input', updateModelStatus);
    fEl.addEventListener('change', saveModel);
    box.querySelector('#model-unit').addEventListener('change', saveModel);
    box.querySelectorAll('.model-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        if (locked) return;
        const pos = fEl.selectionStart ?? fEl.value.length;
        fEl.value = fEl.value.slice(0, pos) + btn.dataset.ins + fEl.value.slice(fEl.selectionEnd ?? pos);
        saveModel();
        fEl.focus();
        const np = pos + btn.dataset.ins.length;
        fEl.setSelectionRange(np, np);
      });
    });
    box.querySelectorAll('[data-unit-param]').forEach(inp => {
      inp.addEventListener('change', () => {
        const units = { ...(appState.get('units') || {}) };
        const v = inp.value.trim();
        if (v) units[inp.dataset.unitParam] = v; else delete units[inp.dataset.unitParam];
        appState.set({ units, combined: null });
        updateUnitsStatus();
      });
    });
    renderUnused();
    if (keep) { const f2 = box.querySelector('#model-formula'); f2.focus(); try { f2.setSelectionRange(keep.start, keep.end); } catch (_) { /* */ } }
    updateModelStatus();
  }

  /* ── P — formuladan (P22-1): parametrlar ro'yxati parser tokenlaridan (Flow.syncParams). true — ro'yxat o'zgardi.
     Shablon (inputs shablonda belgilangan) va oshkor bo'lmagan modelda (state.implicit) ro'yxatga tegilmaydi. ── */
  function autoParams(state) { return !!Flow() && !state.template && !state.implicit; }
  /* Shablon rejimida (oshkormas modeldan tashqari) formula qulflangan */
  function tplLocked(state) { return !!(state && state.template) && !state.implicit; }

  /* Shablondan ajratish (foydalanuvchi tasdig'i bilan): hisob shablon bo'yicha baholanadigan holatning o'zi bo'lib qoladi
     (UCTemplates.detachState — aux sonlari, "bitta asbob" kovariatsiyasi covB da) — natija o'zgarmaydi
     (tests/templates/detach.test.js); saqlangan nuqtalar ham ajratiladi. Keyin formula erkin, parametrlar formuladan. */
  const CALC_KEYS = ['n', 'params', 'measurements', 'directions', 'typeB', 'model', 'outputs', 'implicit', 'settings', 'covB', 'units'];
  function detachTemplate() {
    const T = window.UCTemplates;
    const state = appState.get();
    if (!T || !T.detachState || !state.template) return;
    if (!confirm(i18n.t('flow_tpl_detach_confirm'))) return;
    const pick = o => Object.fromEntries(CALC_KEYS.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
    const d = T.detachState(state);
    const points = (state.points || []).map(pt => (pt && pt.snapshot && pt.snapshot.template
      ? { ...pt, snapshot: { ...pick(T.detachState(pt.snapshot)), template: null } } : pt));
    appState.set({ ...pick(d), template: null, points, combined: null });
    renderModelBox(true);
    if (window.showToast) window.showToast(i18n.t('flow_tpl_detached'), 'success');
  }
  function commitParams() {
    const state = appState.get();
    if (!autoParams(state)) return false;
    const r = Flow().syncParams(state, Flow().tokenize);
    if (r.error || !r.changed) return false;
    const gone = state.params.filter(p => !r.params.includes(p));
    const measurements = {}, typeA = {}, units = {};
    r.params.forEach(p => {
      measurements[p] = state.measurements[p] || Array(state.n).fill('');
      if ((state.typeA || {})[p]) typeA[p] = state.typeA[p];
      if ((state.units || {})[p]) units[p] = state.units[p];
    });
    const covB = {};
    Object.entries(state.covB || {}).forEach(([k, v]) => { if (!k.split('|').some(x => gone.includes(x))) covB[k] = v; });
    const ta = { ...((state.settings || {}).typeA || {}) };
    gone.forEach(p => { delete ta[p]; });
    appState.set({ params: r.params, measurements, typeA, units, covB, settings: { ...(state.settings || {}), typeA: ta }, combined: null });
    return true;
  }

  /* Formulada qatnashmaydigan, lekin ma'lumoti bor parametrlar: jimgina o'chirilmaydi — foydalanuvchi tanlaydi
     (ma'lumotni yangi nomga ko'chirish yoki olib tashlash). */
  function renderUnused() {
    const el = document.getElementById('model-unused');
    if (!el) return;
    const state = appState.get();
    const r = autoParams(state) ? Flow().syncParams(state, Flow().tokenize) : null;
    const unused = r && !r.error ? r.unused : [];
    if (!unused.length) { el.innerHTML = ''; return; }
    const empty = state.params.filter(p => !unused.includes(p) && !Flow().hasData(state, p));
    el.innerHTML = unused.map(u => `
      <div class="model-unused-row" role="status">
        <span>${escHtml(i18n.tf('flow_unused', { p: u }))}</span>
        ${empty.map(t => `<button type="button" class="btn btn-sm btn-outline" data-move-param="${escHtml(u)}" data-move-to="${escHtml(t)}">${escHtml(i18n.tf('flow_unused_move', { p: t }))}</button>`).join('')}
        <button type="button" class="btn btn-sm btn-ghost" data-drop-param="${escHtml(u)}">${escHtml(i18n.t('flow_unused_drop'))}</button>
      </div>`).join('');
    el.querySelectorAll('[data-move-param]').forEach(btn => btn.addEventListener('click', () => {
      const from = btn.dataset.moveParam, to = btn.dataset.moveTo;
      appState.removeParam(to);                 // bo'sh (ma'lumotsiz) parametr — nomi bo'shatiladi
      appState.renameParam(from, to);           // kuzatuvlar, A tur usuli, B tur manbalari, kovariatsiyalar yangi nomga o'tadi
      commitParams();
      renderModelBox(true);
    }));
    el.querySelectorAll('[data-drop-param]').forEach(btn => btn.addEventListener('click', () => {
      const p = btn.dataset.dropParam;
      if (!confirm(i18n.tf('flow_unused_confirm', { p }))) return;
      appState.set({ typeB: (appState.get('typeB') || []).filter(c => c.param !== p), combined: null });
      appState.removeParam(p);
      commitParams();
      renderModelBox(true);
    }));
  }

  /* ── 2-qadam sozlamalari: juftlangan kuzatuvlar va A tur usuli (avval model kartasida edi) ── */
  function renderDataOptions() {
    const box = document.getElementById('typea-options');
    if (!box) return;
    if (box.contains(document.activeElement) && document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') return;
    const state = appState.get();
    const paired = !state.settings || state.settings.paired !== false;
    box.innerHTML = `
        ${state.params.length > 1 ? `
        <label class="model-check">
          <input type="checkbox" id="model-paired" ${paired ? 'checked' : ''} />
          <span>${i18n.t('model_paired')}</span>
        </label>` : ''}
        ${renderMethodTable(state)}`;
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

  /* O'lchamlik tekshiruvi (src/engine/units.js) — UI'da ogohlantirish sifatida (P04, P03 qoldig'i) */
  function updateUnitsStatus() {
    const el = document.getElementById('model-units-status');
    const fEl = document.getElementById('model-formula');
    if (!el || !fEl) return;
    const state = appState.get();
    const units = state.units || {};
    const parsed = {};
    state.params.forEach(p => { const u = Calc.parseUnit(units[p]); if (u) parsed[p] = u; });
    const given = Object.keys(parsed).length;
    if (!given) { el.className = 'model-status'; el.textContent = ''; return; }
    const { expr } = Calc.splitFormula(fEl.value);
    let ast = null;
    try { ast = expr ? Calc.parse(expr, state.params) : null; } catch (_) { el.textContent = ''; return; }
    const unknown = state.params.filter(p => units[p] && !parsed[p]);
    const res = ast ? Calc.analyzeDimensions(ast, parsed) : { dim: parsed[state.params[0]] ? parsed[state.params[0]].dim : null, problems: [] };
    const msgs = [];
    const err = res.problems.find(x => x.severity === 'error');
    if (err) msgs.push(i18n.t('unit_check_err') + ': ' + err.detail);
    res.problems.filter(x => x.severity === 'warning').forEach(x => msgs.push(i18n.t('w_' + x.code).replace('{v}', x.detail).replace('{p}', '')));
    unknown.forEach(p => msgs.push(p + ': «' + units[p] + '» ?'));
    const outU = Calc.parseUnit((state.model || {}).unit);
    if (!err && res.dim && outU && Calc.dimText(res.dim) !== Calc.dimText(outU.dim)) {
      msgs.push(i18n.t('w_unit_output').replace('{v}', `${state.model.unit} [${Calc.dimText(outU.dim)}] ≠ [${Calc.dimText(res.dim)}]`));
    }
    if (given < state.params.length) msgs.push(i18n.t('unit_check_partial'));
    if (err) el.className = 'model-status err';
    else el.className = 'model-status ' + (msgs.length ? 'warn' : 'ok');
    el.textContent = msgs.length ? '⚠ ' + msgs.join(' · ') : '✓ ' + i18n.t('unit_check_ok') + (res.dim ? ' [' + Calc.dimText(res.dim) + ']' : '');
  }

  function updateModelStatus() {
    updateUnitsStatus();
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
    // P22-1: formulada yangi nom — xato emas, yangi parametr (formula tasdiqlanganda ro'yxatga qo'shiladi)
    const pv = autoParams(state) ? Flow().syncParams({ ...state, model: { ...(state.model || {}), formula: fEl.value } }, Flow().tokenize) : null;
    const names = pv && !pv.error ? pv.params : state.params;
    try {
      const f = Calc.compile(expr, names);
      const env = {};
      let complete = true;
      names.forEach(p => {
        const ta = state.params.includes(p) ? taFor(state, p) : null;
        if (ta) env[p] = ta.mean; else complete = false;
      });
      const y = complete ? f(env) : NaN;
      const fresh = pv && !pv.error ? pv.added : [];
      el.className = 'model-status ok';
      el.textContent = '✓ ' + (symbol || 'y') + ' = ' + expr +
        (isFinite(y) ? '  →  ' + Calc.fmtSci(y, 8) : '') +
        (fresh.length ? '  ·  ' + i18n.t('flow_new_params') + ': ' + fresh.join(', ') : '');
    } catch (err) {
      const d = String(err.message || '');
      el.className = 'model-status err';
      el.textContent = '✗ ' + i18n.t('err_bad_formula') + (d.startsWith('unknown:') ? ': «' + d.slice(8) + '»' : '');
    }
  }

  function renderTable() {
    const state = appState.get();
    const n     = state.n;
    const head  = document.getElementById('table-head');
    const body  = document.getElementById('table-body');
    const foot  = document.getElementById('table-foot');

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

    // fokus va kursor qayta chizishdan keyin tiklanadi (jadval har o'zgarishda qayta quriladi)
    const act = document.activeElement;
    const keep = act && act.classList && act.classList.contains('meas-input') && body.contains(act)
      ? { param: act.dataset.param, idx: act.dataset.idx, start: act.selectionStart, end: act.selectionEnd } : null;

    // Oxirgi (bo'sh) qator: birinchi ustunda ko'rsatma — qatorlar o'zi qo'shiladi, Excel'dan qo'yish mumkin (P22-1)
    const lastBlank = Flow() && n > 0 && state.params.every(p => String(((state.measurements[p] || [])[n - 1]) ?? '').trim() === '');
    const rowPh = escHtml(i18n.t('flow_row_ph'));
    let rows = '';
    for (let i = 0; i < n; i++) {
      const paramInputs = state.params.map((p, j) => {
        const vals = state.measurements[p] || Array(n).fill('');
        const v = vals[i] !== undefined ? vals[i] : '';
        return `<td><input type="text" inputmode="decimal" class="meas-input"
          data-param="${escHtml(p)}" data-idx="${i}" value="${escHtml(String(v))}"${lastBlank && i === n - 1 && j === 0 ? ` placeholder="${rowPh}"` : ''}
          aria-label="${escHtml(p + ' ' + (i + 1))}"
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
    if (keep) {
      const again = body.querySelector(`.meas-input[data-param="${CSS.escape(keep.param)}"][data-idx="${keep.idx}"]`);
      if (again) { again.focus(); try { again.setSelectionRange(keep.start, keep.end); } catch (_) { /* */ } }
    }
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

    if (targetRow < 0) return;
    saveCell(inp);                                   // oxirgi qatorga qiymat kiritilsa jadval bitta qatorga uzayadi
    if (targetRow >= appState.get('n')) return;

    // jadval sinxron qayta chizilgan — fokus darhol keyingi katakka (kechiktirilsa tez terilgan belgilar eski katakka tushadi)
    const next = document.querySelector(`.meas-input[data-param="${CSS.escape(params[targetCol])}"][data-idx="${targetRow}"]`);
    if (next) { next.focus(); next.select(); }
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

  function clearData() {
    const state = appState.get();
    state.params.forEach(p => appState.setMeasurements(p, Array(state.n).fill('')));
    appState.set({ typeA: {}, combined: null });
  }

  /* Qadamning yagona asosiy tugmasi ("Keyingi: … →"): kiritish to'liqligini tekshiradi va keyingi qadamni ochadi.
     Bu yerda hisob yo'q — yakuniy hisob B tur qadamidagi tugmada (TypeB.calculate). */
  function proceed(step) {
    const state = appState.get();
    const go = key => (window.UCShell ? window.UCShell.goStep(key) : switchTab(key));
    if (step !== 'model' && step !== 'data') { go(step); return; }
    const { expr } = Calc.splitFormula((state.model || {}).formula);
    let formulaOk = true;
    if (expr) { try { Calc.compile(expr, state.params); } catch (_) { formulaOk = false; } }
    const typeA = {};
    state.params.forEach(p => { const r = taFor(state, p); if (r) typeA[p] = r; });
    const blocker = Flow() ? Flow().stepBlocker(step, state, { hasFormula: !!expr, formulaOk, typeA }) : null;
    if (blocker === 'need_formula' || blocker === 'bad_formula') {
      showToast(i18n.t(blocker === 'need_formula' ? 'err_need_formula' : 'err_bad_formula'), 'error');
      go('model');
      const fEl = document.getElementById('model-formula');
      if (fEl) fEl.focus();
      return;
    }
    if (blocker === 'need_data') { showToast(i18n.t('toast_need_data'), 'error'); return; }
    go(step === 'model' ? 'data' : 'typeb');
  }

  // Yagona escape: src/ui/escape.js (P02)
  const escHtml = window.escHtml;

  return { init, render, escHtml, proceed };

})();

window.Table = Table;
