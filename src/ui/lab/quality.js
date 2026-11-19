/* ═══════════════════════════════════════════════════════════════
   LAB/QUALITY.JS — P12: "Malaka sinovlari" va "Validatsiya" bo'limlari kontrolleri (app.js chaqiradi: createQuality(deps)).
   Ma'lumot FAQAT lokal (IndexedDB v2, src/storage/quality.js — audit zanjiri bilan); Firebase'ga yozilmaydi.
   Hisob — src/engine/pt, src/engine/validation. Chetga chiquvchini chiqarish va shablon qoralamasi — faqat admin (lokal guest).
   CSP: inline skript yo'q — hodisalar app.js dagi delegatsiya orqali (data-pt-* / data-vl-*); innerHTML — faqat escHtml bilan.
═══════════════════════════════════════════════════════════════ */
import * as Store from '../../storage/index.js';
import { ptToTopDownBias, topDownDraft } from '../../engine/index.js';
import { openTableFile, LIMITS } from '../../io/import.js';
import { loadXlsx } from '../../io/vendor.js';
import { toCsv, csvDialect } from '../../io/csv.js';
import { ptRoundsFromGrid, ptSeriesToRows, buildQualityDoc, serializeQualityDoc, parseQualityDoc, MAX_QUALITY_BYTES } from '../../io/quality.js';
import { roundOf, analysePT, testOf, formOf, analyseValidation, validationSpecOf, nextTestId, ptRowsText } from './quality-model.js';
import { ptHTML, validationHTML } from './quality-view.js';

const emptyEntry = date => ({ id: '', date, scheme: '', x: '', xpt: '', sigmaPt: '', ux: '', uxpt: '', Ux: '', Uxpt: '', primary: '' });

export function createQuality(d) {
  const { t, esc, toast, today, download, pickFile } = d;
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] === undefined ? m : o[k]));
  const ctx = () => ({ t, esc });
  const canAdmin = () => Store.canQuality('exclude', d.role());
  let ptList = [], ptSel = '', ptDraft = null, ptEntry = emptyEntry(''), ptHist = [], ptBad = [];
  let vlList = [], vlSel = '', vlDraft = null, vlForm = formOf({ type: 'grubbs' }), vlEditing = null, vlHist = [], vlBad = [], vlComments = {};
  let draftForm = { id: '', precision: '', recovery: '', scale: 'relative' };

  const clone = x => JSON.parse(JSON.stringify(x));
  async function reload() {
    const db = d.getDb();
    if (!db) return;
    ptList = await Store.listQuality(db, 'pt');
    vlList = await Store.listQuality(db, 'validation');
  }
  async function save(kind, rec, reason) {
    const db = d.getDb();
    if (!db) { toast(t('st_no_idb'), 'error'); return null; }
    try { return await Store.saveQuality(db, kind, rec, { role: d.role(), reason }); }
    catch (e) { toast(t(e && e.message === 'quality_forbidden' ? 'pt_forbidden' : 'lb_save_failed'), 'error', 6000); return null; }
  }

  /* ─── PT ─── */
  async function openPt(id) {
    ptSel = id;
    const s = ptList.find(x => x.id === id);
    ptDraft = s ? clone(s) : null;
    ptEntry = emptyEntry(today()); ptBad = [];
    ptHist = s && d.getDb() ? await Store.qualityHistory(d.getDb(), 'pt', id) : [];
    d.render();
  }
  async function savePt(reason) {
    const rec = await save('pt', ptDraft, reason || 'pt_edit');
    if (!rec) return null;
    await reload(); await openPt(rec.id);
    return rec;
  }
  async function addRound() {
    const { round, bad } = roundOf(ptEntry);
    ptBad = bad.map(k => t('pt_col_' + k) !== 'pt_col_' + k ? t('pt_col_' + k) : k);
    if (bad.length) { d.render(); return; }
    ptDraft.rounds.push(round);
    if (await savePt('pt_round_add')) toast(t('lb_saved'), 'success');
  }
  async function importPt() {
    const file = await pickFile('.xlsx,.csv,.json');
    if (!file) return;
    try {
      if (/\.json$/i.test(file.name)) {
        if (file.size > MAX_QUALITY_BYTES) { toast(t('lb_import_failed'), 'error'); return; }
        const p = await parseQualityDoc(await file.text());
        if (!p.ok) { toast(`${t('lb_import_failed')} (${p.reason})`, 'error', 6000); return; }
        let n = 0;
        for (const s of p.pt) if (await save('pt', { ...s, id: s.id || Store.newQualityId('pt') }, 'pt_import')) n++;
        for (const s of p.validation) if (await save('validation', { ...s, id: s.id || Store.newQualityId('validation') }, 'validation_import')) n++;
        await reload(); d.render(); toast(fill(t('pt_import_done'), { n }), 'success', 5000);
        return;
      }
      if (!ptDraft) { toast(t('pt_import_need_series'), 'error'); return; }
      const data = typeof file.arrayBuffer === 'function' ? await file.arrayBuffer() : null;
      const f = await openTableFile(file, data, loadXlsx, LIMITS);
      if (!f.ok) { toast(`${t('lb_import_failed')} (${f.reason})`, 'error', 6000); return; }
      const sh = f.sheet(0);
      if (!sh.ok) { toast(`${t('lb_import_failed')} (${sh.reason})`, 'error', 6000); return; }
      const r = ptRoundsFromGrid(sh.rows);
      if (!r.ok) { toast(`${t('lb_import_failed')} (${r.reason}${r.detail ? ': ' + r.detail : ''})`, 'error', 8000); return; }
      ptDraft.rounds.push(...r.rounds);
      if (await savePt('pt_import')) toast(fill(t('pt_import_rounds'), { n: r.rows, bad: r.bad }), 'success', 6000);
    } catch (e) { toast(t('lb_import_failed'), 'error'); }
  }
  async function exportPt(kind) {
    if (kind === 'csv') { download(`uc-pt-${today()}.csv`, toCsv(ptSeriesToRows(ptDraft, analysePT(ptDraft)), csvDialect(window.i18n.lang)), 'text/csv;charset=utf-8'); return; }
    download(`uc-quality-${today()}.json`, serializeQualityDoc(await buildQualityDoc({ pt: ptList, validation: vlList })), 'application/json');
  }
  /** PT tarixi → Top-down ustasi (Nordtest TR 537 §6.2): bias qatorlari "x − x_pt; u(x_pt)" — dvigatel RMS va u(C_ref) ni o'zi hisoblaydi. */
  function ptToTopDown() {
    const r = analysePT(ptDraft);
    if (!r || r.error || !window.UCTopDown) { toast(t('pt_err_pt_bad_spec'), 'error'); return; }
    const b = ptToTopDownBias(r);
    if (b.missingUref.length) { toast(fill(t('pt_topdown_missing'), { ids: b.missingUref.join(', ') }), 'error', 8000); return; }
    if (!ptDraft.unit) { toast(t('pt_topdown_need_unit'), 'error', 6000); return; }
    const cur = window.UCTopDown.getState();
    window.UCTopDown.setState({ ...cur, step: 2, basis: 'within', bias: 'pt', ptRows: ptRowsText(b.bias), scale: 'absolute', unit: ptDraft.unit });
    if (window.switchTab) window.switchTab('topdown');
    toast(fill(t('pt_topdown_sent'), { n: b.rounds }), b.rounds < 6 ? 'info' : 'success', 7000);
  }

  /* ─── Validatsiya ─── */
  async function openVl(id) {
    vlSel = id;
    const s = vlList.find(x => x.id === id);
    vlDraft = s ? clone(s) : null;
    vlForm = formOf({ type: 'grubbs' }); vlEditing = null; vlBad = []; vlComments = {};
    const r = vlDraft ? analyseValidation(vlDraft) : null;
    const prec = r && !r.error ? r.tests.find(x => x.type === 'anova' && !x.error) : null;
    draftForm = { id: `LAB-TD-${today().replace(/-/g, '')}`, precision: prec ? prec.id : '', recovery: '', scale: 'relative' };
    vlHist = s && d.getDb() ? await Store.qualityHistory(d.getDb(), 'validation', id) : [];
    d.render();
  }
  async function saveVl(reason) {
    const rec = await save('validation', vlDraft, reason || 'validation_edit');
    if (!rec) return null;
    await reload(); await openVl(rec.id);
    return rec;
  }
  async function addTest() {
    const { test, bad } = testOf(vlForm);
    vlBad = bad.map(k => t('vl_f_' + k) !== 'vl_f_' + k ? t('vl_f_' + k) : k);
    if (bad.length || !test) { d.render(); return; }
    if (vlEditing !== null) {
      const prev = vlDraft.tests[vlEditing];
      test.id = test.id || prev.id;
      // test ma'lumoti o'zgarsa — eski chiqarishlar (indeks bo'yicha) endi mos kelmaydi: saqlash qatlami ularni saqlaydi, lekin
      // qiymatlar ro'yxati o'zgargan bo'lsa foydalanuvchi qayta ko'rib chiqishi kerak — ogohlantirish
      if (JSON.stringify(prev.values || prev.groups) !== JSON.stringify(test.values || test.groups) && (prev.excluded || []).length) toast(t('vl_excluded_review'), 'info', 8000);
      vlDraft.tests[vlEditing] = { ...test, excluded: prev.excluded || [] };
    } else {
      test.id = test.id || nextTestId(vlDraft.tests);
      if (vlDraft.tests.some(x => x.id === test.id)) { vlBad = [t('vl_f_id')]; d.render(); return; }
      vlDraft.tests.push(test);
    }
    if (await saveVl(vlEditing !== null ? 'validation_test_edit' : 'validation_test_add')) toast(t('lb_saved'), 'success');
  }
  async function exclusion(testId, index, include) {
    const db = d.getDb();
    const comment = include ? String(window.prompt(t('vl_include_prompt')) || '') : (vlComments[testId] || '');
    try { await Store.excludeValue(db, vlDraft.id, testId, index, comment, { role: d.role(), include }); }
    catch (e) {
      toast(t(e.message === 'exclude_comment_short' ? 'vl_comment_short' : e.message === 'quality_forbidden' ? 'vl_exclude_admin' : 'lb_save_failed'), 'error', 6000);
      return;
    }
    await reload(); await openVl(vlDraft.id);
    toast(t(include ? 'vl_included' : 'vl_excluded_done'), 'success');
  }
  /** Top-down shablon qoralamasi: manba ma'lumotlar xeshi — RFC 8785 JCS SHA-256 (src/storage/canonical.js). */
  async function createDraft() {
    if (!canAdmin()) { toast(t('vl_draft_admin'), 'error'); return; }
    const r = analyseValidation(vlDraft);
    const db = d.getDb();
    if (!r || r.error || !db) return;
    const sourceHash = await Store.jcsHash(validationSpecOf(vlDraft));
    const res = topDownDraft(r, { id: draftForm.id.trim(), date: today(), sourceHash, precisionTest: draftForm.precision, recoveryTest: draftForm.recovery || undefined, scale: draftForm.scale, measurand: { unit: vlDraft.unit || '' } });
    if (res.error) { toast(`${t('vl_draft_failed')} (${t('vl_err_' + res.error)})`, 'error', 8000); return; }
    if ((await db.list('templates')).some(x => x.id === res.template.id)) { toast(t('vl_draft_exists'), 'error', 6000); return; }
    await db.save('templates', res.template, { actor: Store.cleanRole(d.role()), reason: `p12_validation_draft:${vlDraft.id}@${vlDraft.version}`, action: 'create' });
    if (window.UCTemplates && window.UCTemplates.reload) window.UCTemplates.reload();
    toast(fill(t('vl_draft_created'), { id: res.template.id }), 'success', 7000);
  }

  function body(tab) {
    if (tab === 'pt') return ptHTML({ list: ptList, selected: ptSel, series: ptDraft, entry: ptEntry, result: ptDraft ? analysePT(ptDraft) : null, history: ptHist, canAdmin: canAdmin(), bad: ptBad }, ctx());
    return validationHTML({ list: vlList, selected: vlSel, set: vlDraft, form: vlForm, editing: vlEditing, result: vlDraft ? analyseValidation(vlDraft) : null, history: vlHist, canAdmin: canAdmin(), comments: vlComments, draft: draftForm, bad: vlBad }, ctx());
  }

  /** @returns {boolean} hodisa shu bo'limga tegishli bo'lsa */
  function onInput(e) {
    const el = e.target, ds = el.dataset || {};
    const v = el.type === 'checkbox' ? el.checked : el.value;
    if (ds.pt) { if (ds.pt === 'select') { if (e.type === 'change') openPt(el.value); } else if (ptDraft) ptDraft[ds.pt] = v; return true; }
    if (ds.ptNew) { ptEntry[ds.ptNew] = v; return true; }
    if (ds.vl) { if (ds.vl === 'select') { if (e.type === 'change') openVl(el.value); } else if (vlDraft) vlDraft[ds.vl] = v; return true; }
    if (ds.vlForm) {
      vlForm[ds.vlForm] = v;
      if ((ds.vlForm === 'type' || ds.vlForm === 'method') && e.type === 'change') { if (ds.vlForm === 'type') vlForm = { ...formOf({ type: v }), id: vlForm.id, label: vlForm.label }; d.render(); }
      return true;
    }
    if (ds.vlComment) { vlComments[ds.vlComment] = v; return true; }
    if (ds.vlDraft) { draftForm[ds.vlDraft] = v; return true; }
    return false;
  }

  /** Sinxron: bo'limga tegishli bo'lmasa — false (P11 hodisalari kechiktirilmaydi); aks holda — Promise. */
  function onClick(e) {
    const b = e.target.closest('[data-pt-act],[data-vl-act]');
    if (!b) return false;
    if (b.disabled) return Promise.resolve(true);
    return handleClick(b);
  }
  async function handleClick(b) {
    const pa = b.dataset.ptAct, va = b.dataset.vlAct, i = +(b.dataset.ptIndex ?? b.dataset.vlIndex);
    if (pa === 'new') { const rec = await save('pt', { id: Store.newQualityId('pt'), name: t('pt_new_name'), rounds: [] }, 'pt_create'); if (rec) { await reload(); await openPt(rec.id); } }
    else if (pa === 'save') { if (await savePt()) toast(t('lb_saved'), 'success'); }
    else if (pa === 'delete') {
      if (window.confirm(t('lb_confirm_delete'))) {
        try { await Store.removeQuality(d.getDb(), 'pt', ptSel, { role: d.role() }); } catch (err) { toast(t('pt_forbidden'), 'error'); return true; }
        ptSel = ''; ptDraft = null; await reload(); d.render();
      }
    } else if (pa === 'add-round') await addRound();
    else if (pa === 'del-round') { if (window.confirm(t('lb_confirm_delete'))) { ptDraft.rounds.splice(i, 1); await savePt('pt_round_delete'); } }
    else if (pa === 'import') await importPt();
    else if (pa === 'export-csv') await exportPt('csv');
    else if (pa === 'export-json') await exportPt('json');
    else if (pa === 'to-topdown') ptToTopDown();
    else if (pa === 'print') { const r = analysePT(ptDraft); if (window.Results && window.Results.printPT) window.Results.printPT(r, { title: ptDraft.name }); }
    else if (va === 'new') { const rec = await save('validation', { id: Store.newQualityId('validation'), name: t('vl_new_name'), tests: [] }, 'validation_create'); if (rec) { await reload(); await openVl(rec.id); } }
    else if (va === 'save') { if (await saveVl()) toast(t('lb_saved'), 'success'); }
    else if (va === 'delete') {
      if (window.confirm(t('lb_confirm_delete'))) {
        try { await Store.removeQuality(d.getDb(), 'validation', vlSel, { role: d.role() }); } catch (err) { toast(t('pt_forbidden'), 'error'); return true; }
        vlSel = ''; vlDraft = null; await reload(); d.render();
      }
    } else if (va === 'add-test') await addTest();
    else if (va === 'edit-test') { vlEditing = i; vlForm = formOf(vlDraft.tests[i]); vlBad = []; d.render(); }
    else if (va === 'cancel-edit') { vlEditing = null; vlForm = formOf({ type: 'grubbs' }); vlBad = []; d.render(); }
    else if (va === 'del-test') { if (window.confirm(t('lb_confirm_delete'))) { vlDraft.tests.splice(i, 1); await saveVl('validation_test_delete'); } }
    else if (va === 'exclude') await exclusion(b.dataset.vlTest, i, false);
    else if (va === 'include') await exclusion(b.dataset.vlTest, i, true);
    else if (va === 'draft') await createDraft();
    else if (va === 'print') { const r = analyseValidation(vlDraft); if (window.Results && window.Results.printValidation) window.Results.printValidation(r, { title: vlDraft.name }); }
    else return false;
    return true;
  }

  return { reload, body, onInput, onClick, openPt, openVl };
}
