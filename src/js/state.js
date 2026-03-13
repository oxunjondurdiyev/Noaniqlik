/* ═══════════════════════════════════════════════════════════════
   STATE.JS — Centralized application state management
═══════════════════════════════════════════════════════════════ */

const STATE_KEY = 'uc_state_v2';

const DEFAULT_STATE = {
  n: 10,                  // number of measurements
  params: ['x'],          // parameter names
  measurements: {},       // { paramName: [v1, v2, ...] }
  typeA: {},              // { paramName: { mean, s2, s, uA } }
  typeB: [],              // array of TypeBComponent objects
  combined: null,         // combined uncertainty result
  theme: 'dark',
  lang: 'en',
};

/* ─── TypeB Component schema ────────────────────────── */
// {
//   id: string,
//   name: string,
//   param: string,        // which param this belongs to
//   halfWidth: number,    // a
//   distribution: 'rect'|'normal'|'triang'|'ushape',
//   divisor: number,      // k (auto-computed or user override)
//   sensitivity: number,  // c_i (sensitivity coefficient)
//   unit: string,
// }

class AppState {
  constructor() {
    this._state = this._load();
    this._listeners = [];
  }

  _load() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch(_) {}
    return { ...DEFAULT_STATE };
  }

  _save() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(this._state));
    } catch(_) {}
  }

  get(key) {
    return key ? this._state[key] : { ...this._state };
  }

  set(updates) {
    this._state = { ...this._state, ...updates };
    this._save();
    this._notify(updates);
  }

  reset() {
    const theme = this._state.theme;
    const lang  = this._state.lang;
    this._state = { ...DEFAULT_STATE, theme, lang };
    this._save();
    this._notify(null);
  }

  _notify(changes) {
    this._listeners.forEach(fn => fn(changes, this._state));
  }

  subscribe(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  /* ── Measurement helpers ─────────────────────────── */
  setMeasurements(param, values) {
    const m = { ...this._state.measurements };
    m[param] = values;
    this.set({ measurements: m });
  }

  getMeasurements(param) {
    return this._state.measurements[param] || Array(this._state.n).fill('');
  }

  resizeN(newN) {
    const m = {};
    this._state.params.forEach(p => {
      const old = this._state.measurements[p] || [];
      const arr = Array(newN).fill('');
      for (let i = 0; i < Math.min(old.length, newN); i++) arr[i] = old[i];
      m[p] = arr;
    });
    this.set({ n: newN, measurements: m });
  }

  addParam(name) {
    if (!name || this._state.params.includes(name)) return false;
    const params = [...this._state.params, name];
    const m = { ...this._state.measurements, [name]: Array(this._state.n).fill('') };
    this.set({ params, measurements: m });
    return true;
  }

  removeParam(name) {
    if (this._state.params.length <= 1) return false;
    const params = this._state.params.filter(p => p !== name);
    const m = { ...this._state.measurements };
    delete m[name];
    const typeA = { ...this._state.typeA };
    delete typeA[name];
    this.set({ params, measurements: m, typeA });
    return true;
  }

  renameParam(oldName, newName) {
    if (!newName || oldName === newName) return;
    if (this._state.params.includes(newName)) return;
    const params = this._state.params.map(p => p === oldName ? newName : p);
    const m = { ...this._state.measurements };
    m[newName] = m[oldName];
    delete m[oldName];
    const typeA = { ...this._state.typeA };
    typeA[newName] = typeA[oldName];
    delete typeA[oldName];
    this.set({ params, measurements: m, typeA });
  }

  /* ── TypeB helpers ───────────────────────────────── */
  addTypeBComponent(comp) {
    const tb = [...this._state.typeB, { ...comp, id: 'tb_' + Date.now() + '_' + Math.random().toString(36).slice(2,6) }];
    this.set({ typeB: tb });
  }

  updateTypeBComponent(id, updates) {
    const tb = this._state.typeB.map(c => c.id === id ? { ...c, ...updates } : c);
    this.set({ typeB: tb });
  }

  removeTypeBComponent(id) {
    const tb = this._state.typeB.filter(c => c.id !== id);
    this.set({ typeB: tb });
  }
}

window.appState = new AppState();
