/* ═══════════════════════════════════════════════════════════════
   LAB/APP.JS — P11: "Laboratoriya" yorlig'i kontrolleri (ES modul): Etalonlar, CMC, QC kartalari;
   B tur oynasidagi "Reestrdan tanlash"; hisob sozlamalarida CMC kattaligini tanlash; s_Rw → Top-down.
   Ma'lumot FAQAT lokal (IndexedDB, src/storage/registry.js — audit zanjiri bilan); Firebase'ga yozilmaydi.
   Hisob — src/engine/lab. CSP: inline skript yo'q — addEventListener; innerHTML ga har qanday qiymat escHtml orqali.
   Rol: etalonlar va CMC ni laboratoriya admini tahrirlaydi, xodim — faqat o'qiydi (lokal rejimda ogohlantirish
   darajasida; server bilan — P15). Global: window.UCLab.
═══════════════════════════════════════════════════════════════ */
import * as Store from '../../storage/index.js';
import * as Lab from '../../engine/lab/index.js';
import { openTableFile, LIMITS } from '../../io/import.js';
import { loadXlsx } from '../../io/vendor.js';
import { toCsv, csvDialect } from '../../io/csv.js';
import { buildRegistryDoc, serializeRegistryDoc, parseRegistryDoc, standardsFromGrid, standardsToRows, cleanQcChart, MAX_REGISTRY_BYTES } from '../../io/registry.js';
import { draftOf, standardOf, emptyCalibration, standardStatus, analyseQc, cmcQuantities, parseValues } from './model.js';
import { TABS, tabsHTML, roleNoticeHTML, standardsListHTML, standardFormHTML, analysisHTML, cmcHTML, qcHTML, pickerHTML } from './view.js';

const $ = id => document.getElementById(id);
const t = k => window.i18n.t(k);
const esc = v => window.escHtml(v);
const ctx = () => ({ t, esc });
const toast = (m, type = 'info', ms) => window.showToast && window.showToast(m, type, ms);
const today = () => new Date().toISOString().slice(0, 10);   // UI qatlami: soat faqat shu yerda o'qiladi (dvigatelda emas)
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] === undefined ? m : o[k]));

let db = null;
let tab = 'standards';
let standards = [], charts = [];
let cmc = { id: Store.CMC_TABLE_ID, kind: 'cmc', version: 0, rows: [] };
let draft = null, draftNew = false, draftHistory = [];
let an = { x: '', method: 'last_two', distribution: 'rect', limit: '', includeU: true };
let cmcRows = [], probe = { quantity: '', x: '', text: '' };
let qcSel = '', qcDraft = null, qcHistory = [], qcEntry = { date: '', run: '', values: '' };
let pick = null;

function role() {
  const s = window.AuthManager && window.AuthManager.getSession ? window.AuthManager.getSession() : null;
  return Store.cleanRole(s && s.role);
}
const readOnly = kind => !Store.canEditRegistry(kind, role());
function warnDays() {
  const lab = window.UCTemplates && window.UCTemplates.labSettings ? window.UCTemplates.labSettings() : null;
  const d = lab ? Number(lab.expiryWarnDays) : NaN;
  return Number.isFinite(d) && d >= 0 ? d : Lab.EXPIRY_WARN_DAYS;
}

const ready = (async () => {
  try { db = await new Store.LocalAdapter().open(); await reload(); } catch (e) { db = null; }
})();

async function reload() {
  if (!db) return;
  standards = (await Store.listRegistry(db, 'standard')).map(Lab.cleanStandard);
  charts = (await Store.listRegistry(db, 'qc')).map(cleanQcChart);
  const c = await Store.getRegistry(db, Store.CMC_TABLE_ID);
  cmc = c ? { id: c.id, kind: 'cmc', version: c.version || 0, savedBy: c.savedBy, rows: (c.rows || []).map(Lab.cleanCmcRow) } : { id: Store.CMC_TABLE_ID, kind: 'cmc', version: 0, rows: [] };
  cmcRows = cmc.rows.map(r => ({ ...r }));
}

async function save(rec, reason) {
  if (!db) { toast(t('st_no_idb'), 'error'); return null; }
  try { return await Store.saveRegistry(db, rec, { role: role(), reason }); }
  catch (e) { toast(t(e && e.message === 'registry_forbidden' ? 'lb_readonly' : 'lb_save_failed'), 'error', 6000); return null; }
}

/* ─── Chizish ─── */
function analysisModel() {
  const std = draft && standards.find(s => s.id === draft.id);
  if (!std) return null;
  const hist = Lab.correctionHistory(std, an.x === '' && (Lab.currentCalibration(std) || { points: [] }).points.length === 1 ? Lab.currentCalibration(std).points[0].x : an.x);
  const limit = an.limit !== '' ? an.limit : (std.limit === undefined ? '' : std.limit);
  return {
    ...an, limit, history: hist,
    drift: Lab.driftProposal(hist, { method: an.method, distribution: an.distribution, asOf: today() }),
    interval: limit === '' ? null : Lab.intervalRecommendation(hist, { limit: Number(String(limit).replace(',', '.')), includeU: an.includeU }),
  };
}

function qcModel() {
  const c = qcDraft;
  return {
    charts, selected: qcSel, chart: c, readOnly: readOnly('standard'), history: qcHistory, entry: qcEntry,
    target: { mean: c && c.target ? c.target.mean : (c && c.targetMean) || '', s: c && c.target ? c.target.s : (c && c.targetS) || '' },
    analysis: c ? analyseQc(c) : null,
  };
}

function cmcModel() {
  const bad = cmcRows.map((r, i) => (Lab.cmcRowError(Lab.cleanCmcRow(r)) ? i : -1)).filter(i => i >= 0);
  return { rows: cmcRows, badRows: bad, version: cmc.version, readOnly: readOnly('cmc'), quantities: cmcQuantities(cmcRows), probe };
}

function body() {
  if (!db) return `<div class="warn-box">${esc(t('st_no_idb'))}</div>`;
  if (tab === 'cmc') return roleNoticeHTML({ readOnly: readOnly('cmc') }, ctx()) + cmcHTML(cmcModel(), ctx());
  if (tab === 'qc') return roleNoticeHTML({ readOnly: false }, ctx()) + qcHTML(qcModel(), ctx());
  const ro = readOnly('standard');
  const list = standards.map(s => ({ ...s, status: standardStatus(s, today(), warnDays()) }));
  return roleNoticeHTML({ readOnly: ro }, ctx()) + standardsListHTML({ standards: list, readOnly: ro, selected: draft && draft.id }, ctx())
    + (draft ? standardFormHTML({ draft, readOnly: ro, isNew: draftNew, analysis: draftNew ? null : analysisModel(), history: draftHistory }, ctx()) : '');
}

function render() {
  const root = $('lab-root');
  if (!root) return;
  root.innerHTML = `
    <div class="panel-header"><div>
      <h2 class="panel-title">${esc(t('lb_title'))}</h2>
      <p class="panel-sub text-muted">${esc(t('lb_sub'))}</p>
    </div></div>
    ${tabsHTML(tab, ctx())}${body()}`;
}

function redrawAnalysis() {
  const el = document.querySelector('[data-lb-analysis]');
  if (el) el.innerHTML = analysisHTML(analysisModel(), ctx());
}

/* ─── Etalonlar ─── */
async function openStandard(id) {
  const s = standards.find(x => x.id === id);
  if (!s) return;
  draft = draftOf(s); draftNew = false;
  an = { x: '', method: 'last_two', distribution: 'rect', limit: '', includeU: true };
  draftHistory = db ? await Store.registryHistory(db, id) : [];
  render();
}

async function saveStandard() {
  const { standard, bad } = standardOf(draft);
  if (bad.length) { toast(`${t('lb_bad_fields')}: ${bad.map(b => t('lb_bad_' + b)).join(', ')}`, 'error', 6000); return; }
  if (!standard.id) standard.id = Store.newRegistryId('standard');
  const rec = await save(standard, draftNew ? 'standard_create' : 'standard_edit');
  if (!rec) return;
  await reload();
  toast(t('lb_saved'), 'success');
  await openStandard(rec.id);
}

async function deleteStandard() {
  if (!draft || draftNew || !window.confirm(t('lb_confirm_delete'))) return;
  try { await Store.removeRegistry(db, draft.id, { role: role(), reason: 'standard_delete' }); }
  catch (e) { toast(t('lb_readonly'), 'error'); return; }
  draft = null;
  await reload();
  render();
}

function download(name, data, mime) {
  const blob = new window.Blob([data], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.className = 'hidden';
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}
function pickFile(accept) {
  return new Promise(resolve => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = accept; inp.className = 'hidden';
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.remove(); resolve(f || null); });
    inp.addEventListener('cancel', () => { inp.remove(); resolve(null); });
    document.body.appendChild(inp);
    inp.click();
  });
}

async function exportRegistry(kind) {
  if (kind === 'csv') { download(`uc-registry-${today()}.csv`, toCsv(standardsToRows(standards), csvDialect(window.i18n.lang)), 'text/csv;charset=utf-8'); return; }
  const doc = await buildRegistryDoc({ standards, cmc: cmc.rows.length ? cmc : null, qc: charts });
  download(`uc-registry-${today()}.json`, serializeRegistryDoc(doc), 'application/json');
}

/** Import: bir xil (nom, zavod raqami) kartochka bo'lsa — yangi kalibrlashlar qo'shiladi; aks holda yangi kartochka. */
function mergeStandards(incoming) {
  const out = [];
  for (const s of incoming) {
    const cur = standards.find(x => (s.id && x.id === s.id) || (x.name === s.name && x.serial === s.serial));
    if (!cur) { out.push({ ...s, id: s.id || Store.newRegistryId('standard') }); continue; }
    const have = new Set(cur.calibrations.map(c => c.certificate + '\u0000' + c.date));
    const add = s.calibrations.filter(c => !have.has(c.certificate + '\u0000' + c.date));
    if (add.length) out.push({ ...cur, calibrations: [...cur.calibrations, ...add] });
  }
  return out;
}

async function importRegistry() {
  if (readOnly('standard')) { toast(t('lb_readonly'), 'error'); return; }
  const file = await pickFile('.xlsx,.csv,.json');
  if (!file) return;
  let list = [], extra = null;
  try {
    if (/\.json$/i.test(file.name)) {
      if (file.size > MAX_REGISTRY_BYTES) { toast(t('lb_import_failed'), 'error'); return; }
      const p = await parseRegistryDoc(await file.text());
      if (!p.ok) { toast(`${t('lb_import_failed')} (${p.reason})`, 'error', 6000); return; }
      list = p.standards; extra = p;
    } else {
      const data = typeof file.arrayBuffer === 'function' ? await file.arrayBuffer() : null;
      const f = await openTableFile(file, data, loadXlsx, LIMITS);
      if (!f.ok) { toast(`${t('lb_import_failed')} (${f.reason})`, 'error', 6000); return; }
      const sh = f.sheet(0);
      if (!sh.ok) { toast(`${t('lb_import_failed')} (${sh.reason})`, 'error', 6000); return; }
      const r = standardsFromGrid(sh.rows);
      if (!r.ok) { toast(`${t('lb_import_failed')} (${r.reason}${r.detail ? ': ' + r.detail : ''})`, 'error', 8000); return; }
      list = r.standards;
      if (r.bad) toast(fill(t('lb_import_skipped'), { n: r.bad }), 'info', 6000);
    }
  } catch (e) { toast(t('lb_import_failed'), 'error'); return; }
  const merged = mergeStandards(list);
  let n = 0;
  for (const s of merged) if (await save(s, 'registry_import')) n++;
  if (extra && extra.cmc && extra.cmc.rows.length && window.confirm(fill(t('lb_import_cmc_confirm'), { n: extra.cmc.rows.length }))) {
    await save({ id: Store.CMC_TABLE_ID, kind: 'cmc', rows: extra.cmc.rows }, 'registry_import');
  }
  if (extra) for (const c of extra.qc) if (!charts.some(x => x.id === c.id)) await save(c, 'registry_import');
  await reload();
  render();
  toast(fill(t('lb_import_done'), { n }), 'success', 5000);
}

/* ─── CMC ─── */
function runProbe() {
  const q = cmcQuantities(cmcRows).find(x => x.key === probe.quantity);
  if (!q || probe.x === '') { probe.text = ''; return; }
  const f = Lab.findCmc(q.rows, probe.x);
  probe.text = f.error ? t('lb_err_cmc_bad_x') : f.row ? `CMC = ${Number(f.cmc.toPrecision(6))}${f.row.unit ? ' ' + f.row.unit : ''}` : t('w_outside_scope').replace('{v}', '');
}
async function saveCmc() {
  const rows = cmcRows.map((r, i) => Lab.cleanCmcRow({ ...r, id: r.id || `row-${Date.now().toString(36)}-${i}` }));
  const bad = rows.filter(r => Lab.cmcRowError(r)).length;
  if (bad) { toast(fill(t('lb_cmc_bad_rows'), { n: bad }), 'error', 6000); return; }
  if (!(await save({ id: Store.CMC_TABLE_ID, kind: 'cmc', rows }, 'cmc_table_edit'))) return;
  await reload();
  render();
  toast(t('lb_saved'), 'success');
}

/* ─── QC ─── */
async function openChart(id) {
  qcSel = id;
  const c = charts.find(x => x.id === id);
  qcDraft = c ? JSON.parse(JSON.stringify(c)) : null;
  qcHistory = c && db ? await Store.registryHistory(db, id) : [];
  qcEntry = { date: today(), run: '', values: '' };
  render();
}
function qcRecord() {
  const c = qcDraft;
  const m = Number(String(c.targetMean ?? (c.target ? c.target.mean : '')).replace(',', '.')), s = Number(String(c.targetS ?? (c.target ? c.target.s : '')).replace(',', '.'));
  return cleanQcChart({ ...c, target: Number.isFinite(m) && s > 0 ? { mean: m, s } : null });
}
async function saveChart(reason) {
  const rec = await save(qcRecord(), reason || 'qc_chart_edit');
  if (!rec) return false;
  await reload();
  await openChart(rec.id);
  return true;
}
async function addQcPoint() {
  const { values, bad } = parseValues(qcEntry.values);
  if (bad || !values.length) { toast(t('lb_qc_bad_values'), 'error'); return; }
  if (qcDraft.type === 'imr' && values.length !== 1) { toast(t('lb_qc_values_hint_imr'), 'error'); return; }
  qcDraft.points.push({ date: qcEntry.date || today(), run: qcEntry.run || '', values });
  if (await saveChart('qc_value')) {
    const a = analyseQc(qcDraft);
    if (a && !a.error && a.westgard.flagged[a.series.length - 1]) toast(`${t('lb_qc_violations')}: ${a.westgard.flagged[a.series.length - 1].map(r => t('lb_rule_' + r)).join(', ')}`, 'error', 8000);
  }
}
/** s_Rw ni top-down ustasiga uzatish: nazorat qatori (control_series) — dvigatel s (n − 1) va ν = n − 1 ni o'zi hisoblaydi. */
function toTopDown() {
  const a = qcDraft && analyseQc(qcDraft);
  if (!a || a.error || !window.UCTopDown) { toast(t('lb_err_qc_need_data'), 'error'); return; }
  const cur = window.UCTopDown.getState();
  window.UCTopDown.setState({ ...cur, step: 2, basis: 'within', rwSources: ['control_series'], qcValues: a.sRw.values.join('\n'), scale: 'absolute', unit: qcDraft.unit || cur.unit || '' });
  if (window.switchTab) window.switchTab('topdown');
  toast(fill(t('lb_qc_sent'), { s: Number(a.sRw.sRw.toPrecision(6)), nu: a.sRw.nu }), 'success', 6000);
}

/* ─── Hodisalar: Laboratoriya oynasi ─── */
function onInput(e) {
  const el = e.target, d = el.dataset || {};
  if (d.lbField && draft) { draft[d.lbField] = el.value; return; }
  if (d.lbCal !== undefined && draft) { draft.calibrations[+d.lbCal][d.lbCalField] = el.value; return; }
  if (d.lbAn) { an[d.lbAn] = el.type === 'checkbox' ? el.checked : el.value; if (e.type === 'change') redrawAnalysis(); return; }
  if (d.lbCmc !== undefined) {
    cmcRows[+d.lbCmc][d.lbCmcField] = el.value;
    if (d.lbCmcField === 'type' && e.type === 'change') render();
    return;
  }
  if (d.lbProbe) {
    probe[d.lbProbe] = el.value; runProbe();
    const out = document.querySelector('[data-lb-probe-out]');
    if (out) out.textContent = probe.text || '—';
    return;
  }
  if (d.lbQc) {
    if (d.lbQc === 'select') { if (e.type === 'change') openChart(el.value); return; }
    if (d.lbQc.startsWith('new')) { qcEntry[{ newDate: 'date', newRun: 'run', newValues: 'values' }[d.lbQc]] = el.value; return; }
    if (qcDraft) {
      qcDraft[d.lbQc] = el.value;
      if (d.lbQc === 'targetMean' || d.lbQc === 'targetS') qcDraft.target = null;
    }
  }
}

async function onClick(e) {
  const tb = e.target.closest('[data-lb-tab]');
  if (tb && TABS.includes(tb.dataset.lbTab)) { tab = tb.dataset.lbTab; render(); return; }
  const b = e.target.closest('[data-lb-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.lbAct, i = +b.dataset.lbIndex;
  if (act === 'open') await openStandard(b.dataset.lbId);
  else if (act === 'new') { draft = draftOf({ calibrations: [] }); draft.calibrations.push(emptyCalibration()); draftNew = true; draftHistory = []; render(); }
  else if (act === 'close-std') { draft = null; render(); }
  else if (act === 'add-cal') { draft.calibrations.push(emptyCalibration()); render(); }
  else if (act === 'del-cal') { draft.calibrations.splice(i, 1); render(); }
  else if (act === 'save-std') await saveStandard();
  else if (act === 'del-std') await deleteStandard();
  else if (act === 'import') await importRegistry();
  else if (act === 'export-json') await exportRegistry('json');
  else if (act === 'export-csv') await exportRegistry('csv');
  else if (act === 'add-cmc') { cmcRows.push({ id: '', quantity: '', min: '', max: '', unit: '', type: 'abs', value: '', method: '', note: '' }); render(); }
  else if (act === 'del-cmc') { cmcRows.splice(i, 1); render(); }
  else if (act === 'save-cmc') await saveCmc();
  else if (act === 'new-qc') { const rec = await save({ id: Store.newRegistryId('qc'), kind: 'qc', name: t('lb_qc_new_name'), unit: '', type: 'imr', target: null, points: [] }, 'qc_chart_create'); if (rec) { await reload(); await openChart(rec.id); } }
  else if (act === 'save-qc') { if (await saveChart()) toast(t('lb_saved'), 'success'); }
  else if (act === 'del-qc') { if (window.confirm(t('lb_confirm_delete'))) { try { await Store.removeRegistry(db, qcSel, { role: role(), reason: 'qc_chart_delete' }); } catch (err) { toast(t('lb_readonly'), 'error'); return; } qcSel = ''; qcDraft = null; await reload(); render(); } }
  else if (act === 'add-qc-point') await addQcPoint();
  else if (act === 'del-qc-point') { if (window.confirm(t('lb_confirm_delete'))) { qcDraft.points.splice(i, 1); await saveChart('qc_value_delete'); } }
  else if (act === 'to-topdown') toTopDown();
}

/* ─── B tur: "Reestrdan tanlash" oynasi ─── */
function pickerModel() {
  const state = window.appState.get();
  const std = standards.find(s => s.id === pick.selected) || null;
  let source = null, drift = null, status = { status: 'unknown', daysLeft: null, evidence: false };
  if (std) {
    source = Lab.sourceFromStandard(std, { x: pick.x, param: pick.param });
    if (!source.error) {
      status = { ...Lab.validityStatus(source.snapshot.validUntil, pick.date, warnDays()), evidence: Lab.hasTraceabilityEvidence(source.snapshot) };
      drift = Lab.driftProposal(Lab.correctionHistory(std, source.snapshot.x === null ? '' : source.snapshot.x));
    }
  }
  return { ...pick, standards, standard: std, params: state.params || [], source, drift, status };
}
function modal() {
  let m = $('lb-picker');
  if (!m) {
    m = document.createElement('div');
    m.id = 'lb-picker'; m.className = 'tpl-modal'; m.style.display = 'none';
    const panel = document.createElement('div'); panel.className = 'tpl-modal-panel';
    const body = document.createElement('div'); body.className = 'tpl-modal-body';
    panel.appendChild(body); m.appendChild(panel); document.body.appendChild(m);
    m.addEventListener('change', onPickInput);
    m.addEventListener('click', onPickClick);
  }
  return m;
}
function renderPicker() {
  const m = modal();
  m.querySelector('.tpl-modal-body').innerHTML = pickerHTML(pickerModel(), ctx());
  m.style.display = 'flex';
}
async function openPicker() {
  await ready;
  await reload();
  const state = window.appState.get();
  pick = { selected: '', param: (state.params || [])[0] || '', x: '', date: (state.settings || {}).measurementDate || today(), addInterp: true, addDrift: false };
  renderPicker();
}
function onPickInput(e) {
  const k = (e.target.dataset || {}).lbPick;
  if (!k || !pick) return;
  pick[k === 'standard' ? 'selected' : k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  renderPicker();
}
function onPickClick(e) {
  const b = e.target.closest('[data-lb-pick-act]');
  if (e.target === modal() || (b && b.dataset.lbPickAct === 'close')) { modal().style.display = 'none'; return; }
  if (!b || b.disabled) return;
  const m = pickerModel();
  if (!m.source || m.source.error) return;
  const st = window.appState;
  st.addTypeBComponent(m.source.component);
  const sn = m.source.snapshot;
  // Interpolyatsiya noaniqligi — alohida manba TAKLIFI: qiymat (yarim kenglik) bo'sh, uni foydalanuvchi kiritadi
  if (sn.interpolated && pick.addInterp) st.addTypeBComponent({ name: `${t('lb_interp_source')} — ${sn.name}`, param: pick.param, halfWidth: '', distribution: 'rect', k: 2, sensitivity: 1, unit: m.source.component.unit, sourceId: 'interpolation' });
  // Drift manbasi — faqat foydalanuvchi belgilab tasdiqlasa
  if (pick.addDrift && m.drift && m.drift.proposal) {
    st.addTypeBComponent(Lab.driftComponent(m.drift.proposal, { name: `${t('lb_drift_source')} — ${sn.name}`, param: pick.param, unit: m.source.component.unit, registry: { id: sn.id, version: sn.version } }));
  }
  const settings = { ...(st.get('settings') || {}), measurementDate: pick.date || today() };
  if (warnDays() !== Lab.EXPIRY_WARN_DAYS) settings.expiryWarnDays = warnDays();
  st.set({ settings, combined: null });
  modal().style.display = 'none';
  toast(t('lb_pick_added'), 'success');
}

/* ─── Hisob sozlamalari: CMC kattaligi (B tur yorlig'idagi sozlamalar paneli — src/js/typeB.js chizadi) ─── */
function onSettingsChange(e) {
  const el = e.target;
  if (!el.dataset || el.dataset.lbCmcPick === undefined) return;
  const settings = { ...(window.appState.get('settings') || {}) };
  const q = cmcQuantities(cmc.rows).find(x => x.key === el.value);
  if (q) settings.cmcRows = q.rows.map(r => ({ ...r, tableVersion: cmc.version, ...(cmc.savedBy ? { savedBy: cmc.savedBy } : {}) })); else delete settings.cmcRows;
  settings.cmcKey = q ? q.key : '';
  window.appState.set({ settings, combined: null });
}

function bind() {
  const root = $('lab-root');
  if (root) {
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    root.addEventListener('click', e => { onClick(e); });
    document.addEventListener('langchange', render);
    ready.then(render);
    render();
  }
  const btn = $('btn-typeb-registry');
  if (btn) btn.addEventListener('click', openPicker);
  const set = $('typeb-settings');
  if (set) set.addEventListener('change', onSettingsChange);
}

window.UCLab = Object.freeze({
  ready,
  reload: async () => { await reload(); render(); },
  openPicker,
  /** CMC jadvalidagi kattaliklar (hisob sozlamalaridagi tanlov uchun; sinxron — keshdan) */
  cmcQuantities: () => cmcQuantities(cmc.rows).map(q => q.key),
  standards: () => standards.map(s => ({ ...s })),
  setTab: x => { if (TABS.includes(x)) { tab = x; render(); } },
  openChart, toTopDown,
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
