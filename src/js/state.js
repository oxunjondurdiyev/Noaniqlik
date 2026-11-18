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
  model: { formula: '', unit: '' },          // measurement model y = f(x1…xN)
  settings: { paired: true, P: 0.9545, modelKind: 'unknown' },   // paired, P, kMethod, rounding, modelKind, nominal, mpe, range, cmc, typeA{param:{method,sp,nup,directional}}
  directions: [],         // per-row reading direction '↑' | '↓' | '' (hysteresis)
  points: [],             // saved calibration points [{ id, label, snapshot, result }]
  currentPoint: null,     // id of the point being edited
  summary: { uniformK: false },
  covB: {},               // Type B covariances between inputs: { 'a|b': value }
  acceptances: {},        // P05a: asoslangan holda qabul qilingan linter topilmalari { findingId: {comment, role, at, value, seq} }
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

/* P05a (RISKS R-07): eski saqlangan hisoblarda model turi yo'q — 'unknown' oladi (src/storage/migrate.js
   upgradeCalcState bilan bir xil qoida). Dastur |y| ni xato deb faraz qilmaydi: muvofiqlik bayonoti uchun
   foydalanuvchidan tanlov so'raladi. Foydalanuvchi kiritgan boshqa hech narsa o'zgarmaydi. */
function upgradeState(st) {
  const fix = s => {
    const settings = s.settings && typeof s.settings === 'object' ? s.settings : {};
    return ['error', 'value', 'unknown'].includes(settings.modelKind) ? s : { ...s, settings: { ...settings, modelKind: 'unknown' } };
  };
  const out = fix(st);
  if (Array.isArray(out.points)) out.points = out.points.map(p => (p && p.snapshot ? { ...p, snapshot: fix(p.snapshot) } : p));
  if (!out.acceptances || typeof out.acceptances !== 'object') out.acceptances = {};
  return out;
}

class AppState {
  constructor() {
    this._state = this._load();
    this._listeners = [];
  }

  _load() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) return upgradeState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
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
    // P07b: oshkor bo'lmagan model (state.implicit — hozircha faqat hisob fayli / API orqali kiritiladi) kirishlar ro'yxati
    // yoki oshkor formula o'zgartirilganda bekor bo'ladi — eski tenglamalar yangi model bilan jimgina ishlatilmasin.
    if (updates && this._state.implicit && !('implicit' in updates)) {
      const f = updates.model && typeof updates.model.formula === 'string' ? updates.model.formula.trim() : '';
      if ('params' in updates || (f && f !== String((this._state.model || {}).formula || '').trim())) updates = { ...updates, implicit: undefined };
    }
    this._state = { ...this._state, ...updates };
    this._save();
    this._notify(updates);
  }

  reset() {
    const theme = this._state.theme;
    const lang  = this._state.lang;
    this._state = JSON.parse(JSON.stringify({ ...DEFAULT_STATE, theme, lang }));
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
    const dirs = (this._state.directions || []).slice(0, newN);
    this.set({ n: newN, measurements: m, directions: dirs });
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
    const typeB = this._state.typeB.map(c => c.param === oldName ? { ...c, param: newName } : c);
    const covB = {};
    Object.entries(this._state.covB || {}).forEach(([k, v]) => {
      covB[k.split('|').map(x => x === oldName ? newName : x).join('|')] = v;
    });
    this.set({ params, measurements: m, typeA, typeB, covB, combined: null });
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
