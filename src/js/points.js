/* ═══════════════════════════════════════════════════════════════
   POINTS.JS — Multi-point calibration session
   Each saved point keeps a full snapshot of its inputs and its
   GUM result, so a calibration certificate table can be produced
   for all points (EA-4/02, COOMET R/GM/32 §5.7.3).
═══════════════════════════════════════════════════════════════ */

const Points = (() => {

  const KEYS = ['n', 'params', 'measurements', 'directions', 'typeB', 'model', 'settings', 'covB'];

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
    const r  = Calc.evaluate(st);
    if (r.error) return r;
    const pts = [...list()];
    const idx = pts.findIndex(p => p.id === st.currentPoint);
    const id  = idx >= 0 ? st.currentPoint : 'pt_' + Date.now().toString(36);
    const entry = {
      id,
      label: (label || '').trim() || (idx >= 0 ? pts[idx].label : defaultLabel(pts.length + 1)),
      snapshot: snapshot(st),
      result: r,
    };
    if (idx >= 0) pts[idx] = entry; else pts.push(entry);
    appState.set({ points: pts, currentPoint: id, combined: r });
    return entry;
  }

  /** Load a saved point back into the editor */
  function load(id) {
    const p = list().find(x => x.id === id);
    if (!p) return;
    appState.set({ ...clone(p.snapshot), typeA: {}, combined: p.result, currentPoint: id });
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
    appState.set({ measurements: m, typeA: {}, combined: null, currentPoint: null });
  }

  function clearAll() { appState.set({ points: [], currentPoint: null }); }

  /**
   * Certificate rows. With uniformK the largest k of all points is applied
   * to every point (COOMET R/GM/32 §5.7.3) — dvigatel: Calc.multiPointCoverage.
   * Rounding is done here, in the report layer (src/report/rounding.js, P03);
   * Uround/resultText stored by older versions are ignored.
   */
  function summary(pts, uniformK) {
    const items = (pts || list()).filter(p => p.result && !p.result.error);
    const cov = Calc.multiPointCoverage(items.map(p => p.result), uniformK);
    return items.map((p, i) => {
      const r = p.result;
      const { k, U, conf } = cov[i];
      const rr = Calc.roundResult(r.y, U, r.roundUp);
      return { id: p.id, label: p.label, r, k, U, rr, conf };
    });
  }

  return { save, load, remove, startNew, clearAll, summary, list, snapshot };

})();

window.Points = Points;
