/* ═══════════════════════════════════════════════════════════════
   SPEC.JS — modelSpec formatlari va ichki ko'rinishga keltirish.
   Formatlar (docs/ENGINE_API.md):
     • 'uc-model/1'     — kanonik dvigatel kirishi (outputs[] — hozir bitta element, P07 ga tayyor);
     • 'calc-state/v2'  — UI holati (uc_state_v2) bilan mos: { format, state };
     • format maydonisiz obyekt { params, measurements, … } — P00 dagi Calc.evaluate(state) bilan mos.
═══════════════════════════════════════════════════════════════ */

export const FORMATS = ['uc-model/1', 'calc-state/v2'];

/**
 * Ichki ko'rinish = calc-state/v2 holati (+ ixtiyoriy `units`).
 * @returns {{state?:object, error?:string, detail?:string}}
 */
export function normalize(spec) {
  if (!spec || typeof spec !== 'object') return { error: 'bad_spec' };
  if (spec.format === 'calc-state/v2') return { state: spec.state || {} };
  if (spec.format === 'uc-model/1') return fromModel(spec);
  if (spec.format) return { error: 'bad_spec', detail: String(spec.format) };
  return { state: spec };
}

function fromModel(m) {
  const outputs = m.outputs || [];
  if (outputs.length !== 1) return { error: 'multi_output', detail: String(outputs.length) };
  const inputs = m.inputs || [];
  const measurements = {}, units = {}, typeA = {};
  for (const inp of inputs) {
    measurements[inp.name] = inp.observations || [];
    if (inp.unit) units[inp.name] = inp.unit;
    if (inp.typeA) typeA[inp.name] = { ...inp.typeA };
  }
  const st = m.settings || {};
  return {
    state: {
      params: inputs.map(i => i.name),
      measurements,
      directions: m.directions || [],
      model: { formula: outputs[0].formula, unit: outputs[0].unit || '' },
      typeB: (m.typeB || []).map(c => ({ ...c, param: c.input !== undefined ? c.input : c.param })),
      covB: m.covB || {},
      units,
      settings: { ...st, typeA: { ...(st.typeA || {}), ...typeA } },
    },
  };
}

/**
 * calc-state/v2 → uc-model/1 (P04 shablon interpreteri va eksport uchun).
 */
export function toModel(state) {
  const s = state || {};
  const settings = { ...(s.settings || {}) };
  const typeA = settings.typeA || {};
  delete settings.typeA;
  return {
    format: 'uc-model/1',
    outputs: [{ formula: (s.model || {}).formula || '', unit: (s.model || {}).unit || '' }],
    inputs: (s.params || []).map(p => ({
      name: p,
      ...(s.units && s.units[p] ? { unit: s.units[p] } : {}),
      observations: (s.measurements || {})[p] || [],
      ...(typeA[p] ? { typeA: { ...typeA[p] } } : {}),
    })),
    directions: s.directions || [],
    typeB: (s.typeB || []).map(({ param, ...c }) => ({ ...c, input: param })),
    covB: s.covB || {},
    settings,
  };
}
