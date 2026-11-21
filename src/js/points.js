/* ═══════════════════════════════════════════════════════════════
   POINTS.JS — Multi-point calibration session
   Each saved point keeps a full snapshot of its inputs and its
   GUM result, so a calibration certificate table can be produced
   for all points (EA-4/02, COOMET R/GM/32 §5.7.3).
═══════════════════════════════════════════════════════════════ */

const Points = (() => {

  const KEYS = ['n', 'params', 'measurements', 'directions', 'typeB', 'model', 'outputs', 'implicit', 'settings', 'covB', 'units', 'template'];   // 'outputs' — P07; 'implicit' — P07b

  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  function snapshot(st) {
    const o = {};
    KEYS.forEach(k => { o[k] = clone(st[k]); });
    return o;
  }

  function list() { return appState.get('points') || []; }

  function defaultLabel(n) { return i18n.t('pt_default') + ' ' + n; }

  /** Save the current editor contents as a point (updates the point being edited) */
  function save(label) {
    const st = appState.get();
    // P04: shablon holati — aux formulalar va "bitta asbob" kovariatsiyasi bilan (src/templates/interpreter.js)
    const r  = st.template && window.UCTemplates ? window.UCTemplates.evaluateState(st).result : Calc.evaluate(st);
    if (r.error) return r;
    const pts = [...list()];
    const idx = pts.findIndex(p => p.id === st.currentPoint);
    const id  = idx >= 0 ? st.currentPoint : 'pt_' + Date.now().toString(36);
    const entry = {
      id,
      label: (label || '').trim() || (idx >= 0 ? pts[idx].label : defaultLabel(pts.length + 1)),
      snapshot: snapshot(st),
      result: r,
      meta: clone(st.calcMeta || null),            // P05b: nuqta hisobining id / vaqti
      acceptances: clone(st.acceptances || {}),   // P05a: shu nuqtadagi qabul qilingan topilmalar (bosma hisobotda izohi bilan)
    };
    // P20: shu natija uchun bajarilgan Monte-Karlo tekshiruvi (bo'lsa) nuqta bilan birga saqlanadi (MCM talab qilingan nuqtalar)
    const mc = window.Results && window.Results.currentMC ? window.Results.currentMC() : null;
    const same = (a, b) => !!a && !!b && ['y', 'uc', 'U', 'nuEff', 'k'].every(q => Object.is(a[q], b[q]));
    if (mc && same(st.combined, r)) entry.mc = clone(mc);
    if (idx >= 0) pts[idx] = entry; else pts.push(entry);
    appState.set({ points: pts, currentPoint: id, combined: r });
    return entry;
  }

  /** Load a saved point back into the editor */
  function load(id) {
    const p = list().find(x => x.id === id);
    if (!p) return;
    appState.set({ ...clone(p.snapshot), typeA: {}, combined: p.result, currentPoint: id, acceptances: clone(p.acceptances || {}), calcMeta: clone(p.meta || null) });
  }

  function remove(id) {
    const pts = list().filter(p => p.id !== id);
    const patch = { points: pts };
    if (appState.get('currentPoint') === id) patch.currentPoint = null;
    appState.set(patch);
  }

  /** Start a new point: keep model, Type B and settings, clear the readings */
  function startNew() {
    const st = appState.get();
    const m = {};
    st.params.forEach(p => { m[p] = Array(st.n).fill(''); });
    appState.set({ measurements: m, typeA: {}, combined: null, currentPoint: null, acceptances: {} });
  }

  function clearAll() { appState.set({ points: [], currentPoint: null }); }

  /**
   * Certificate rows. With uniformK the largest k of all points is applied
   * to every point (COOMET R/GM/32 §5.7.3) — dvigatel: Calc.multiPointCoverage.
   * Rounding is done here, in the report layer (src/report/rounding.js, P03);
   * Uround/resultText stored by older versions are ignored.
   */
  function summary(pts, uniformK) {
    // P05b: qatorlar src/report/summary.js da (sof modul) — qaror qoidasi ham yagona k bilan qayta qo'llanadi
    return Calc.summaryRows(pts || list(), uniformK);
  }

  return { save, load, remove, startNew, clearAll, summary, list, snapshot };

})();

window.Points = Points;
