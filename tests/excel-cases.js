// Shared definitions of the two calibration templates (also used by presets.js generator check)
const gas = {
  params: ['I', 'Ce'], formula: 'E = (I - 4) * 1.25 - Ce', unit: '% об.',
  settings: { paired: false, P: 0.9545, rounding: 'up', mpe: '0.04 * abs((I - 4) * 1.25)', range: 20 },
  points: [
    { label: '0 % (N₂)', I: [4, 4, 4],            Ce: [0],  pgs: 0.004,  pgsDist: 'rect' },
    { label: '10 %',     I: [12.01, 12.024, 12.009], Ce: [10], pgs: 0.008, pgsDist: 'rect' },
    { label: '19 %',     I: [19.21, 19.22, 19.23],   Ce: [19], pgs: 0.0152, pgsDist: 'rect' },
  ],
};
const Tdirs = ['↑','↑','↑','↓','↓','↓','↑','↑','↑','↓','↓','↓'];
const term = {
  params: ['Te', 'Tv', 'Ce'], formula: 'Cv = Te + Ce - Tv', unit: '°C',
  settings: { paired: false, P: 0.9545, rounding: 'up', mpe: '1', typeA: { Tv: { method: 1, directional: true } } },
  points: [
    { nom: 10, Ce: 0.004, imm: 0.02, Te: [10.06,10.059,10.059,10.06,10.059,10.061,10.06,10.06,10.057,10.056,10.056,10.057], Tv: [9.5,9.5,9.5,10,10,10,9.5,9.5,9.5,10,10,10] },
    { nom: 30, Ce: 0.005, imm: 0.03, Te: [30.08,30.075,30.08,30.077,30.078,30.082,30.08,30.079,30.08,30.078,30.083,30.082], Tv: [29.5,29.5,29.5,30,30,30,30,29.5,29.5,30.5,30,30.5] },
    { nom: 50, Ce: 0.006, imm: 0.05, Te: [50.109,50.112,50.11,50.11,50.11,50.113,50.11,50.11,50.109,50.112,50.107,50.111], Tv: [50,50,50,51,51,50.5,50,50,50,51,50.5,50.5] },
    { nom: 70, Ce: 0.007, imm: 0.07, Te: [70.089,70.093,70.089,70.089,70.089,70.091,70.09,70.09,70.092,70.09,70.089,70.09], Tv: [70,70,70,71,71,71,70,70,70,71,71,71] },
    { nom: 90, Ce: 0.008, imm: 0.09, Te: [90.117,90.117,90.119,90.12,90.118,90.12,90.12,90.121,90.118,90.12,90.121,90.122], Tv: [90.5,90,90.5,91.5,91,91,90.5,90.5,90.5,91,91,91] },
  ],
};
function gasState(pt) {
  return { params: gas.params, measurements: { I: pt.I, Ce: pt.Ce }, directions: [], model: { formula: gas.formula, unit: gas.unit },
    settings: gas.settings, covB: {},
    typeB: [
      { name: 'Kalibrator xatosi (Fluke 725Ex)', param: 'I', halfWidth: '0.0002 * I + 0.002', distribution: 'rect', sensitivity: 1, unit: 'mA' },
      { name: 'Kalibrator ajratish qobiliyati', param: 'I', halfWidth: 0.001, distribution: 'resol', sensitivity: 1, unit: 'mA' },
      { name: 'PGS (etalon) qiymati', param: 'Ce', halfWidth: pt.pgs, distribution: pt.pgsDist, sensitivity: 1, unit: '% об.' },
    ] };
}
function termState(pt) {
  return { params: term.params, measurements: { Te: pt.Te, Tv: pt.Tv, Ce: [pt.Ce] }, directions: Tdirs, model: { formula: term.formula, unit: term.unit },
    settings: term.settings, covB: {},
    typeB: [
      { name: 'Etalon rezolyutsiyasi', param: 'Te', halfWidth: 0.001, distribution: 'resol', unit: '°C' },
      { name: "O'lchash qurilmasi xatosi", param: 'Te', halfWidth: 0.01, distribution: 'rect', unit: '°C' },
      { name: 'Etalon dreyfi', param: 'Te', halfWidth: 0.01, distribution: 'rect', unit: '°C' },
      { name: 'Vanna barqarorligi', param: 'Te', halfWidth: 0.006, distribution: 'rect', unit: '°C' },
      { name: 'Vanna bir jinsliligi', param: 'Te', halfWidth: 0.012, distribution: 'rect', unit: '°C' },
      { name: 'Botirish / issiqlik o\'tkazish', param: 'Te', halfWidth: pt.imm, distribution: 'rect', unit: '°C' },
      { name: 'Etalon sertifikati (Ue, k=2)', param: 'Ce', halfWidth: 0.006, distribution: 'normal', k: 2, unit: '°C' },
      { name: "Termometr o'qish interpolyatsiyasi", param: 'Tv', halfWidth: 0.25, distribution: 'rect', unit: '°C' },
    ] };
}
module.exports = { gas, term, gasState, termState, Tdirs };
