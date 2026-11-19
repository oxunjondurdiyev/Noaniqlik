/* ═══════════════════════════════════════════════════════════════
   TPL/APP.JS — shablonlar UI kontrolleri (P04), <script type="module">.
   • katalog ekrani (bo'limlar, standart shifri bo'yicha qidiruv, kartalar);
   • shablonni hisob sahifasiga yuklash (variant, o'zgarmaslar, korrelyatsiya savoli,
     standart holatda kiritilmaydigan manbalar, demo va DRAFT ogohlantirishlari);
   • shablon muharriri (DRAFT → REVIEWED → APPROVED, qulflash, yangi versiya, nusxa, JSON);
   • laboratoriya sozlamalari; eksport / import / audit izi (src/storage).
   Hisob: src/templates/interpreter.js → src/engine (o'zgarmaydi).
   Global: window.UCTemplates (typeB.js, report.js, table.js uchun sinxron yordamchilar).
═══════════════════════════════════════════════════════════════ */
import * as Interp from '../../templates/interpreter.js';
import * as Store from '../../storage/index.js';
import * as View from './view.js';

const $ = id => document.getElementById(id);
const ctx = () => ({ t: k => window.i18n.t(k), esc: window.escHtml, lang: window.i18n.lang });
const t = k => window.i18n.t(k);
const esc = v => window.escHtml(v);
const toast = (m, type = 'info', ms) => window.showToast && window.showToast(m, type, ms);
const clone = o => JSON.parse(JSON.stringify(o));
const keyOf = tpl => `${tpl.id}@${tpl.version}`;

let db = null;
let schema = null;
let builtins = [];
let locals = [];
let labCache = { ...Store.LAB_DEFAULTS };
let loadError = null;

async function fetchJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(url + ': ' + r.status);
  return r.json();
}

/* P04b: P04 dagi (split maydonisiz) brauzer nusxalari → split 'unknown'; ma'lumot o'zgarmaydi,
   saqlangan yozuv faqat foydalanuvchi qayta saqlaganda yangilanadi (audit bilan). */
function migrateLocals(list) { return list.map(t => Interp.migrateTemplate(t).template); }

const ready = (async () => {
  try {
    schema = await fetchJSON('schemas/methodology.schema.json');
    const idx = await fetchJSON('templates/builtin/index.json');
    builtins = await Promise.all(idx.templates.map(f => fetchJSON('templates/builtin/' + f)));
  } catch (e) { loadError = e; }
  try {
    db = await new Store.LocalAdapter().open();
    const mig = await Store.migrateLegacy(window.localStorage, db);
    if (mig.status === 'migrated' || mig.status === 'invalid') toast(t('st_migrated'), 'info', 5000);
    await Store.migrateSchema(db);   // P11: saqlangan hisoblar sxemasi 2 → 3 (qo'lda kiritilgan B tur manbalari o'zgarmaydi)
    locals = migrateLocals(await db.list('templates'));
    labCache = await Store.getLabSettings(db);
  } catch (e) { db = null; }
})();

/* ─── Katalog yozuvlari: ichki shablon yoki brauzerdagi so'nggi versiya ─── */
function entries() {
  const latest = new Map(Store.latestVersions(locals).map(x => [x.id, x]));
  const out = builtins.map(b => (latest.has(b.id) ? { tpl: latest.get(b.id), local: true } : { tpl: b, local: false }));
  for (const [id, tpl] of latest) if (!builtins.some(b => b.id === id)) out.push({ tpl, local: true });
  return out;
}
function findByKey(key) {
  return locals.find(x => keyOf(x) === key) || builtins.find(x => keyOf(x) === key) || null;
}

/* ─── Katalog ekrani ─── */
function renderCatalog() {
  const el = $('tpl-catalog');
  if (!el) return;
  if (loadError) { el.innerHTML = `<p class="text-muted">${esc(t('tpl_load_error'))}: ${esc(loadError.message)}</p>`; return; }
  el.innerHTML = View.catalogHTML(entries(), ($('tpl-search') || {}).value || '', ctx());
}

async function openCatalog() {
  window.App.showScreen('templates');
  const el = $('tpl-catalog');
  if (el) el.innerHTML = `<p class="text-muted">${esc(t('tpl_loading'))}</p>`;
  await ready;
  renderCatalog();
  const s = $('tpl-data-status');
  if (s) s.textContent = db ? '' : t('st_no_idb');
}

/* ─── Shablonni hisob sahifasiga yuklash ─── */
function setCalcState(state, n) {
  const measurements = {};
  state.params.forEach(p => {
    const arr = Array(n).fill('');
    (state.measurements[p] || []).forEach((v, i) => { if (i < n) arr[i] = v; });
    measurements[p] = arr;
  });
  window.appState.set({
    n, params: [...state.params], measurements, typeA: {},
    typeB: state.typeB.map((c, i) => ({ ...c, id: 'tb_' + i + '_' + Math.random().toString(36).slice(2, 6) })),
    combined: null, model: { ...state.model }, covB: {}, settings: clone(state.settings),
    directions: [...(state.directions || [])], units: { ...state.units }, template: clone(state.template), currentPoint: null,
  });
}

async function useTemplate(key, variant) {
  await ready;
  const tpl = findByKey(key);
  if (!tpl) return;
  if (!window.App.beginSession()) return;
  if (Interp.isRegression(tpl)) {
    // P08: REGRESSION shabloni — "Regressiya" yorlig'iga yuklanadi (src/ui/regression/app.js)
    if (!window.UCRegression || !window.UCRegression.loadTemplate(tpl)) return;
    window.App.showScreen('app');
    window.App.renderSidebar();
    window.switchTab('regression');
    return;
  }
  if (Interp.isSpecial(tpl)) {
    // P10: maxsus rejim shabloni — "Maxsus rejimlar" yorlig'iga yuklanadi (src/ui/special/app.js)
    if (!window.UCSpecial || !window.UCSpecial.loadTemplate(tpl)) return;
    window.App.showScreen('app');
    window.App.renderSidebar();
    window.switchTab('special');
    return;
  }
  if (Interp.isTopDown(tpl)) {
    // P09: TOP_DOWN shabloni — "Top-down" yorlig'idagi ustaga yuklanadi (src/ui/topdown/app.js)
    if (!window.UCTopDown || !window.UCTopDown.loadTemplate(tpl)) return;
    window.App.showScreen('app');
    window.App.renderSidebar();
    window.switchTab('topdown');
    return;
  }
  const opts = { lang: window.i18n.lang, labSettings: Store.labToEngineSettings(labCache), ui: true, allowMissing: true };
  window.appState.set({ points: [], currentPoint: null, combined: null });
  if (tpl.points && tpl.points.length) {
    const n = Math.max(3, ...tpl.points.flatMap(p => Object.values(p.data).map(a => a.length)));
    tpl.points.forEach((pt, i) => {
      const b = Interp.buildState(tpl, { variant, useSample: true, point: i }, opts);
      setCalcState(b.state, n);
      window.Points.save(pt.label);
    });
    const first = window.appState.get('points')[0];
    if (first) window.Points.load(first.id);
  } else {
    const b = Interp.buildState(tpl, { variant, useSample: !!tpl.sampleData }, opts);
    const n = Math.max(3, ...Object.values(b.state.measurements).map(a => a.length));
    setCalcState(b.state, n);
  }
  window.App.showScreen('app');
  window.App.renderSidebar();
  window.Table.render();
  window.TypeB.render();
  window.switchTab('data');
  renderBanner();
  toast(`${t('tpl_loaded')}: ${Interp.tr(tpl.title, window.i18n.lang)}`, 'success');
}

/* ─── Hisob sahifasidagi shablon paneli ─── */
function renderBanner() {
  const el = $('template-box');
  if (!el) return;
  const st = window.appState.get();
  if (!st.template) { el.innerHTML = ''; return; }
  el.innerHTML = View.bannerHTML(st, Interp.missingInState(st), ctx());
}

function onBannerChange(e) {
  const st = window.appState.get();
  if (!st.template) return;
  const c = e.target.closest('[data-tpl-const]');
  if (c) {
    const sym = c.dataset.tplConst;
    const v = window.Calc.toNum(c.value);
    if (c.dataset.kind === 'model') {
      const arr = Array(st.n).fill('');
      arr[0] = isFinite(v) ? v : '';
      window.appState.set({ measurements: { ...st.measurements, [sym]: arr }, combined: null });
    } else {
      window.appState.set({ template: { ...st.template, aux: { ...st.template.aux, [sym]: isFinite(v) ? v : null } }, combined: null });
    }
    return;
  }
  const sp = e.target.closest('[data-tpl-split]');
  if (sp) {
    const correlations = clone(st.template.correlations);
    correlations[Number(sp.dataset.tplSplit)].split = sp.value === 'known' ? 'known' : 'unknown';
    window.appState.set({ template: { ...st.template, correlations }, combined: null });
    window.TypeB.render();
    return;
  }
  const k = e.target.closest('[data-tpl-corr]');
  if (k) {
    const correlations = clone(st.template.correlations);
    correlations[Number(k.dataset.tplCorr)].enabled = k.checked;
    window.appState.set({ template: { ...st.template, correlations }, combined: null });
  }
}

function onBannerClick(e) {
  const st = window.appState.get();
  if (!st.template) return;
  const inc = e.target.closest('[data-tpl-include]');
  if (inc) {
    const i = Number(inc.dataset.tplInclude);
    const ex = clone(st.template.excludedEntries || []);
    const [entry] = ex.splice(i, 1);
    const excluded = (st.template.excluded || []).filter(id => id !== entry.sourceId);
    window.appState.set({
      typeB: [...st.typeB, { ...entry, id: 'tb_x_' + Math.random().toString(36).slice(2, 6) }],
      template: { ...st.template, excludedEntries: ex, excluded }, combined: null,
    });
    window.TypeB.render();
    return;
  }
  if (e.target.closest('[data-tpl-clear-demo]')) {
    const m = {};
    st.params.forEach(p => { m[p] = (st.template.constants || []).includes(p) ? st.measurements[p] : Array(st.n).fill(''); });
    window.appState.set({ measurements: m, typeA: {}, combined: null, points: [], currentPoint: null, template: { ...st.template, demo: false } });
    window.Table.render();
  }
}

/* ─── Yordamchi: fayl yuklab olish / tanlash ─── */
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function pickFile() {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'application/json,.json';
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      if (!f) return resolve(null);
      f.text().then(resolve, () => resolve(null));
    });
    inp.click();
  });
}
const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

/* ─── Modal ─── */
function openModal(html) {
  const m = $('tpl-modal');
  m.querySelector('.tpl-modal-body').innerHTML = html;
  m.style.display = 'flex';
  return m.querySelector('.tpl-modal-body');
}
function closeModal() { $('tpl-modal').style.display = 'none'; }

/* ─── Shablon muharriri ─── */
let editing = null; // { tpl, isNew }

function skeleton() {
  // Uch tildagi boshlang'ich matnlar lug'atdan (src/js/i18n-admin.js: tpl_skel_*)
  const txt = key => window.i18n.all(key);
  return {
    schemaVersion: 'uc-template/1', id: 'LAB-01', version: '0.1.0', status: 'DRAFT', domain: 'TESTING', section: 'general',
    evaluationMode: 'GUM_BOTTOM_UP', title: txt('tpl_skel_title'), standards: [], labCount: null,
    ref: 'laboratoriya', measurand: { symbol: 'y', name: txt('tpl_skel_result'), unit: '' },
    model: { formula: 'y = x' }, inputs: [{ symbol: 'x', name: txt('tpl_skel_input'), unit: '', kind: 'observation' }],
    typeBSources: [],
  };
}

function editorHTML(tpl) {
  const locked = Interp.lockedSections(tpl);
  const dis = s => (locked.includes(s) ? 'disabled' : '');
  const chk = Interp.checkTemplate(tpl, schema);
  const nextStates = ['REVIEWED', 'APPROVED', 'DRAFT', 'RETIRED'].filter(s => Interp.canTransition(tpl.status, s));
  const formula = (tpl.variants && tpl.variants.length) ? '' : tpl.model.formula;
  return `
    <div class="tpl-ed-head">
      <h2>${esc(t('ed_title'))}: <span class="mono">${esc(tpl.id)} v${esc(tpl.version)}</span></h2>
      ${View.statusBadge(tpl.status, ctx())}
    </div>
    <p class="text-xs text-muted">${esc(t('ed_role_note'))}</p>
    ${locked.length ? `<div class="tpl-banner-status">🔒 ${esc(t('ed_locked'))} <span class="mono text-xs">${esc(locked.join(', '))}</span></div>` : ''}
    <div class="tpl-ed-row">
      <label>${esc(t('ed_by'))}<input type="text" id="ed-by" autocomplete="off" /></label>
      <label>${esc(t('ed_reason'))}<input type="text" id="ed-reason" autocomplete="off" /></label>
    </div>
    <div class="tpl-ed-row">
      <label>${esc(t('ed_formula'))}<input type="text" id="ed-formula" class="mono" value="${esc(formula)}" ${formula ? dis('model') : 'disabled'} /></label>
      <label>${esc(t('ed_unit'))}<input type="text" id="ed-unit" value="${esc(tpl.measurand.unit)}" ${dis('measurand')} /></label>
    </div>
    <div class="tpl-ed-sub">${esc(t('ed_inputs'))}</div>
    <table class="data-table tpl-ed-inputs"><thead><tr><th>${esc(t('ed_symbol'))}</th><th>${esc(t('unit_ph'))}</th><th>${esc(t('ed_name'))}</th></tr></thead><tbody>
      ${tpl.inputs.map((i, n) => `<tr><td class="mono">${esc(i.symbol)}</td>
        <td><input type="text" data-ed-unit="${n}" value="${esc(i.unit)}" ${dis('inputs')} /></td>
        <td><input type="text" data-ed-name="${n}" value="${esc(i.name.uz)}" ${dis('inputs')} /></td></tr>`).join('')}
    </tbody></table>
    <div class="tpl-ed-sub">${esc(t('ed_json'))}</div>
    <textarea id="ed-json" class="mono tpl-ed-json" spellcheck="false">${esc(JSON.stringify(tpl, null, 2))}</textarea>
    <div id="ed-check" class="${chk.valid ? 'tpl-ok' : 'tpl-missing'}">${chk.valid ? esc(t('ed_valid')) : esc(t('ed_invalid')) + ':<ul>' + chk.errors.map(e => `<li>${esc(e)}</li>`).join('') + '</ul>'}</div>
    ${(tpl.history || []).length ? `<details><summary>${esc(t('ed_history'))}</summary><ul>${tpl.history.map(h => `<li>${esc(h.at)} — ${esc(h.status)} v${esc(h.version || '')} ${esc(h.by || '')} ${esc(h.note || '')}</li>`).join('')}</ul></details>` : ''}
    <div class="tpl-ed-actions">
      <button type="button" class="btn btn-outline btn-sm" data-ed="check">${esc(t('ed_check'))}</button>
      <button type="button" class="btn btn-primary btn-sm" data-ed="save" ${tpl.status === 'RETIRED' ? 'disabled' : ''}>${esc(t('ed_save'))}</button>
      ${nextStates.map(s => `<button type="button" class="btn btn-outline btn-sm" data-ed="to" data-to="${esc(s)}">${esc(t('ed_to_' + s))}</button>`).join('')}
      <button type="button" class="btn btn-ghost btn-sm" data-ed="version">${esc(t('ed_new_version'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-ed="copy">${esc(t('ed_copy'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-ed="export">${esc(t('ed_export'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-ed="close">${esc(t('ed_close'))}</button>
    </div>`;
}

function openEditor(tpl, isNew = false) {
  editing = { tpl: clone(tpl), isNew };
  const body = openModal(editorHTML(editing.tpl));
  body.querySelectorAll('#ed-formula, #ed-unit, [data-ed-unit], [data-ed-name]').forEach(inp => inp.addEventListener('change', syncFormToJson));
}

function readJson() {
  try { return JSON.parse($('ed-json').value); } catch (_) { toast(t('ed_bad_json'), 'error'); return null; }
}

function syncFormToJson() {
  const tpl = readJson();
  if (!tpl) return;
  const f = $('ed-formula');
  if (f && !f.disabled && f.value.trim()) tpl.model.formula = f.value.trim();
  const u = $('ed-unit');
  if (u && !u.disabled) tpl.measurand.unit = u.value.trim();
  document.querySelectorAll('[data-ed-unit]').forEach(inp => { if (!inp.disabled) tpl.inputs[Number(inp.dataset.edUnit)].unit = inp.value.trim(); });
  document.querySelectorAll('[data-ed-name]').forEach(inp => { if (!inp.disabled) tpl.inputs[Number(inp.dataset.edName)].name.uz = inp.value; });
  $('ed-json').value = JSON.stringify(tpl, null, 2);
  showCheck(tpl);
}

function showCheck(tpl) {
  const chk = Interp.checkTemplate(tpl, schema);
  const el = $('ed-check');
  el.className = chk.valid ? 'tpl-ok' : 'tpl-missing';
  el.innerHTML = chk.valid ? esc(t('ed_valid')) : esc(t('ed_invalid')) + ':<ul>' + chk.errors.map(e => `<li>${esc(e)}</li>`).join('') + '</ul>';
  return chk;
}

async function persist(tpl, action, reason) {
  if (!db) { toast(t('st_no_idb'), 'error'); return false; }
  await db.save('templates', tpl, { actor: ($('ed-by') || {}).value || '', reason, action });
  locals = migrateLocals(await db.list('templates'));
  toast(t('ed_saved'), 'success');
  return true;
}

async function onEditorAction(e) {
  const btn = e.target.closest('[data-ed]');
  if (!btn || !editing) return;
  const act = btn.dataset.ed;
  const by = ($('ed-by') || {}).value || '';
  const reason = (($('ed-reason') || {}).value || '').trim();
  if (act === 'close') { closeModal(); renderCatalog(); return; }
  if (act === 'export') { download(`${editing.tpl.id}-v${editing.tpl.version}.json`, JSON.stringify(editing.tpl, null, 2) + '\n'); return; }
  const cur = readJson();
  if (!cur) return;
  if (act === 'check') { showCheck(cur); return; }
  if (act === 'save') {
    if (!reason) { toast(t('ed_need_reason'), 'error'); return; }
    const base = editing.isNew ? cur : editing.tpl;
    const r = editing.isNew ? { template: cur } : Interp.applyEdit(base, cur);
    if (r.error) { toast(r.error === 'locked' ? `${t('ed_locked')} (${r.detail.join(', ')})` : r.error, 'error', 5000); return; }
    if (!showCheck(r.template).valid) return;
    r.template.updatedAt = new Date().toISOString();
    if (await persist(r.template, editing.isNew ? 'create' : 'update', reason)) openEditor(r.template);
    return;
  }
  if (act === 'to') {
    const to = btn.dataset.to;
    if ((to === 'REVIEWED' || to === 'APPROVED') && !showCheck(cur).valid) return;
    if (JSON.stringify(cur) !== JSON.stringify(editing.tpl)) { toast(t('ed_save') + '?', 'error'); return; }
    if (to === 'APPROVED') {
      const rev = [...(cur.history || [])].reverse().find(h => h.status === 'REVIEWED');
      if (rev && rev.by && rev.by === by) toast(t('ed_same_person'), 'info', 5000);
    }
    const r = Interp.transition(cur, to, { by, note: reason });
    if (r.error) { toast(r.error + ': ' + r.detail, 'error'); return; }
    if (await persist(r.template, 'status:' + to, reason || to)) openEditor(r.template);
    return;
  }
  if (act === 'version') {
    const r = Interp.newVersion(editing.tpl, { by });
    if (await persist(r.template, 'new_version', reason || 'new version')) openEditor(r.template);
    return;
  }
  if (act === 'copy') {
    const id = (window.prompt(t('ed_new_id'), editing.tpl.id + '-copy') || '').trim();
    if (!id) return;
    const c = clone(editing.tpl);
    Object.assign(c, { id, version: '0.1.0', status: 'DRAFT', history: [] });
    delete c.locked; delete c.legacyPresetKey;
    openEditor(c, true);
  }
}

/* ─── Laboratoriya sozlamalari ─── */
function labHTML(l) {
  const opt = (v, cur, label) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
  return `
    <h2>${esc(t('lab_title'))}</h2>
    <p class="text-xs text-muted">${esc(t('lab_hint'))}</p>
    <div class="tpl-ed-row">
      <label>${esc(t('lab_P'))}<select id="lab-P">${[0.95, 0.9545, 0.99, 0.9973].map(p => opt(p, l.P, String(p))).join('')}</select></label>
      <label>${esc(t('set_kmethod'))}<select id="lab-kMethod">${opt('nu', l.kMethod, t('set_k_nu'))}${opt('k2', l.kMethod, t('set_k_2'))}</select></label>
      <label>${esc(t('set_nu_rule'))}<select id="lab-nuRule">${['floor', 'interpolate', 'exact'].map(v => opt(v, l.nuRule, t('nu_rule_' + v))).join('')}</select></label>
      <label>${esc(t('set_rounding'))}<select id="lab-rounding">${opt('normal', l.rounding, t('set_round_normal'))}${opt('up', l.rounding, t('set_round_up'))}</select></label>
      <label>${esc(t('lab_decision'))}<select id="lab-decisionRule">${opt('simple', l.decisionRule, t('lab_dec_simple'))}${opt('guarded', l.decisionRule, t('lab_dec_guarded'))}</select></label>
      <label>${esc(t('lab_cmc'))}<select id="lab-cmcMode">${opt('warn', l.cmcMode, t('lab_cmc_warn'))}${opt('block', l.cmcMode, t('lab_cmc_block'))}</select></label>
      <label>${esc(t('lab_critical'))}<select id="lab-criticalMode">${opt('mark', l.criticalMode, t('lab_critical_mark'))}${opt('block', l.criticalMode, t('lab_critical_block'))}</select></label>
      <label>${esc(t('lab_ci_method'))}<select id="lab-ciMethod">${opt('wilson', l.ciMethod, t('sp_ci_wilson'))}${opt('clopper_pearson', l.ciMethod, t('sp_ci_clopper_pearson'))}</select></label>
      <label>${esc(t('lab_mc_mode'))}<select id="lab-mcMode">${opt('adaptive', l.mcMode, t('mc_mode_adaptive'))}${opt('fixed', l.mcMode, t('mc_mode_fixed'))}</select></label>
      <label>${esc(t('lab_mc_ndig'))}<select id="lab-mcNDig">${opt(1, l.mcNDig, '1')}${opt(2, l.mcNDig, '2')}</select></label>
      <label>${esc(t('lab_mc_tolerance'))}<select id="lab-mcTolerance">${opt('delta5', l.mcTolerance, t('lab_mc_tol_delta5'))}${opt('delta', l.mcTolerance, t('lab_mc_tol_delta'))}</select></label>
      <label>${esc(t('lb_set_expiry_days'))}<input type="number" id="lab-expiryWarnDays" min="0" max="3650" step="1" value="${esc(l.expiryWarnDays)}" /></label>
    </div>
    <label class="model-check"><input type="checkbox" id="lab-secondOrder" ${l.secondOrder ? 'checked' : ''} /> <span>${esc(t('set_second_order'))}</span></label>
    <p class="text-xs text-muted">${esc(t('set_second_order_hint'))}</p>
    <div class="tpl-ed-actions">
      <button type="button" class="btn btn-primary btn-sm" data-lab="save">${esc(t('ed_save'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-lab="close">${esc(t('ed_close'))}</button>
    </div>`;
}
async function openLab() {
  await ready;
  openModal(labHTML(labCache));
}
async function onLabAction(e) {
  const b = e.target.closest('[data-lab]');
  if (!b) return;
  if (b.dataset.lab === 'close') { closeModal(); return; }
  const v = {
    P: Number($('lab-P').value), kMethod: $('lab-kMethod').value, nuRule: $('lab-nuRule').value, rounding: $('lab-rounding').value,
    decisionRule: $('lab-decisionRule').value, cmcMode: $('lab-cmcMode').value, criticalMode: $('lab-criticalMode').value, ciMethod: $('lab-ciMethod').value, secondOrder: $('lab-secondOrder').checked,
    mcMode: $('lab-mcMode').value, mcNDig: Number($('lab-mcNDig').value), mcTolerance: $('lab-mcTolerance').value,
    expiryWarnDays: Math.max(0, Math.round(Number($('lab-expiryWarnDays').value)) || 0),   // P11: etalon muddati ogohlantirishi (linter L1)
  };
  if (!db) { toast(t('st_no_idb'), 'error'); return; }
  await Store.saveLabSettings(db, v, { reason: 'lab settings' });
  labCache = await Store.getLabSettings(db);
  toast(t('lab_saved'), 'success');
  closeModal();
}

/* ─── Ma'lumotlar: eksport / import / audit ─── */
async function dataHTML() {
  if (!db) return `<h2>${esc(t('st_title'))}</h2><p>${esc(t('st_no_idb'))}</p>`;
  const audit = await db.listAudit();
  const v = await db.verifyAudit();
  const calcs = (await db.list('calculations')).length;
  return `
    <h2>${esc(t('st_title'))}</h2>
    <p class="${v.ok ? 'tpl-ok' : 'tpl-missing'}">${v.ok ? '✓ ' + esc(t('st_audit_ok')) : '✗ ' + esc(t('st_audit_bad')) + ` #${esc(v.brokenAt)} (${esc(v.reason)})`} — ${esc(v.count)} ${esc(t('st_records'))}</p>
    <p class="text-sm">${esc(t('st_counts'))}: ${esc(calcs)} / ${esc(locals.length)} / ${esc(audit.length)}</p>
    <div class="tpl-ed-actions">
      <button type="button" class="btn btn-primary btn-sm" data-data="export">${esc(t('st_export'))}</button>
      <button type="button" class="btn btn-outline btn-sm" data-data="import">${esc(t('st_import'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-data="audit">${esc(t('st_audit_export'))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-data="close">${esc(t('ed_close'))}</button>
    </div>
    <div class="tpl-ed-sub">${esc(t('st_audit'))}</div>
    <div class="table-scroll"><table class="data-table text-xs"><thead><tr><th>#</th>${['at', 'action', 'entity', 'id', 'actor', 'reason', 'hash'].map(c => `<th>${esc(t('st_col_' + c))}</th>`).join('')}</tr></thead><tbody>
      ${audit.slice(-30).reverse().map(a => `<tr><td>${esc(a.seq)}</td><td>${esc(a.at)}</td><td>${esc(a.action)}</td><td>${esc(a.entity)}</td>
        <td class="mono">${esc(Array.isArray(a.entityId) ? a.entityId.join('@') : a.entityId)}</td><td>${esc(a.actor)}</td><td>${esc(a.reason)}</td><td class="mono">${esc(String(a.hash).slice(0, 12))}…</td></tr>`).join('')}
    </tbody></table></div>`;
}
async function openData() {
  await ready;
  openModal(await dataHTML());
}
async function onDataAction(e) {
  const b = e.target.closest('[data-data]');
  if (!b) return;
  const act = b.dataset.data;
  if (act === 'close') { closeModal(); return; }
  if (!db) return;
  if (act === 'export') { download(`uncertaintycalc-export-${today()}.json`, await Store.exportAll(db)); return; }
  if (act === 'audit') { download(`uncertaintycalc-audit-${today()}.json`, Store.canonicalize(await db.listAudit())); return; }
  if (act === 'import') {
    const text = await pickFile();
    if (!text) return;
    if (!window.confirm(t('st_import_confirm'))) return;
    const r = await Store.importAll(db, text, { actor: '' });
    if (!r.ok) { toast(`${t('st_import_bad')}: ${r.reason}`, 'error', 5000); return; }
    locals = migrateLocals(await db.list('templates'));
    labCache = await Store.getLabSettings(db);
    toast(t('st_import_ok'), 'success');
    openModal(await dataHTML());
  }
}

async function importTemplate() {
  await ready;
  const text = await pickFile();
  if (!text) return;
  let tpl;
  try { tpl = JSON.parse(text); } catch (_) { toast(t('ed_bad_json'), 'error'); return; }
  tpl = Interp.migrateTemplate(tpl).template;
  openEditor(tpl, true);
  showCheck(tpl);
}

/* ─── Hisob saqlash (audit bilan) ─── */
const SNAP_KEYS = ['n', 'params', 'measurements', 'directions', 'typeB', 'model', 'settings', 'covB', 'units', 'template'];
function saveCalculation(state, result) {
  if (!db) return;
  const snap = {};
  SNAP_KEYS.forEach(k => { if (state[k] !== undefined) snap[k] = clone(state[k]); });
  const tm = state.template;
  const rec = {
    id: 'calc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6), format: 'calc-state/v2',
    state: snap, result: clone(result), engineVersion: result.engineVersion,
    templateRef: tm ? { id: tm.id, version: tm.version, status: tm.status, variant: tm.variant, demo: !!tm.demo } : null,
    createdAt: new Date().toISOString(),
  };
  db.save('calculations', rec, { action: 'calculate', reason: tm ? `${tm.id}@${tm.version}` : 'manual' }).catch(() => {});
}

/* ─── Ulash ─── */
function bind() {
  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-templates]')) { openCatalog(); return; }
    const use = e.target.closest('[data-tpl-use]');
    if (use) {
      const key = use.dataset.tplUse;
      const sel = document.querySelector(`[data-tpl-variant="${CSS.escape(key)}"]`);
      useTemplate(key, sel ? sel.value : undefined);
      return;
    }
    const ed = e.target.closest('[data-tpl-edit]');
    if (ed) { ready.then(() => { const tpl = findByKey(ed.dataset.tplEdit); if (tpl) openEditor(tpl); }); return; }
    if (e.target.closest('#tpl-btn-back')) { window.App.showScreen(window.appState.get('params').length && Object.keys(window.appState.get('measurements')).length ? 'app' : 'welcome'); return; }
    if (e.target.closest('#tpl-btn-new')) { ready.then(() => openEditor(skeleton(), true)); return; }
    if (e.target.closest('#tpl-btn-import')) { importTemplate(); return; }
    if (e.target.closest('[data-open-lab]')) { openLab(); return; }
    if (e.target.closest('[data-open-data]')) { openData(); return; }
    if (e.target.closest('.tpl-modal-close') || e.target.id === 'tpl-modal') { closeModal(); return; }
  });
  const modal = $('tpl-modal');
  if (modal) modal.addEventListener('click', e => { onEditorAction(e); onLabAction(e); onDataAction(e); });
  const search = $('tpl-search');
  if (search) search.addEventListener('input', renderCatalog);
  const box = $('template-box');
  if (box) { box.addEventListener('change', onBannerChange); box.addEventListener('click', onBannerClick); }
  window.appState.subscribe(() => renderBanner());
  document.addEventListener('langchange', () => { renderCatalog(); renderBanner(); });
  renderBanner();
}

window.UCTemplates = Object.freeze({
  ready,
  prepareState: Interp.prepareState,
  evaluateState: Interp.evaluateState,
  pointRowIgnored: (entry, state) => !!(state && state.template) && Interp.pointRowIgnored(entry, Interp.upgradeState(state).template.correlations || []),
  missingInState: Interp.missingInState,
  reportNoticeHTML: (meta, result) => View.reportNoticeHTML(meta, ctx(), result),
  missingText: list => View.missingText(list, ctx()),
  labSettings: () => ({ ...labCache }),
  saveCalculation,
  openCatalog,
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
