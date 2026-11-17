/* Shablon testlari uchun umumiy yordamchilar: templates/builtin/index.json bo'yicha yuklash,
   sxema, P03 presetidan (src/data/presets.js) app.js loadPreset bilan bir xil holat. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..', '..');
const TPL_DIR = path.join(ROOT, 'templates/builtin');
const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));

const schema = readJSON(path.join(ROOT, 'schemas/methodology.schema.json'));
const index = readJSON(path.join(TPL_DIR, 'index.json'));
const templates = index.templates.map(f => ({ file: f, tpl: readJSON(path.join(TPL_DIR, f)) }));
const byId = Object.fromEntries(templates.map(x => [x.tpl.id, x.tpl]));

function loadPresets() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/data/presets.js'), 'utf8'), ctx);
  return JSON.parse(JSON.stringify(ctx.window.PRESETS));
}

/** P03 UI holati: src/js/app.js startSession + loadPreset (paired: true, P: 0.9545, n ga to'ldirish) */
function presetState(pd, pointIndex) {
  const pt = pointIndex === null || pointIndex === undefined ? null : pd.points[pointIndex];
  const measurements = {};
  pd.params.forEach(p => {
    if (!pt) { measurements[p] = [...pd.sampleData[p]]; return; }
    const arr = Array(pd.n).fill('');
    (pt.data[p] || []).forEach((v, i) => { arr[i] = v; });
    measurements[p] = arr;
  });
  return {
    params: [...pd.params], measurements,
    model: { formula: pd.formula || '', unit: pd.unit || '' },
    settings: { paired: true, P: 0.9545, ...(pd.settings ? JSON.parse(JSON.stringify(pd.settings)) : {}) },
    directions: pd.directions ? [...pd.directions] : [], covB: {},
    typeB: pd.typeBComponents.map(c => ({ ...c, ...((pt && pt.patch) ? (pt.patch[c.name] || {}) : {}) })),
  };
}

/** Snapshot uchun natijaning asosiy maydonlari (JSON — ∞ → null) */
function pick(r) {
  return JSON.parse(JSON.stringify({
    y: r.y, uc: r.uc, uc2: r.uc2, nuEff: r.nuEff, k: r.k, U: r.U,
    budget: r.budget.map(b => ({ kind: b.kind, name: b.name, u: b.u, c: b.c, contrib: b.contrib })),
    warnings: r.warnings.map(w => w.code), conf: r.conf, gamma: r.gamma,
  }));
}

module.exports = { ROOT, TPL_DIR, schema, index, templates, byId, loadPresets, presetState, pick, readJSON };
