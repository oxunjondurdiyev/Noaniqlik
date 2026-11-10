/* ═══════════════════════════════════════════════════════════════
   PRESETS.JS — Measurement presets for common lab scenarios
   ISO/IEC 17025 compliant typical uncertainty budgets
═══════════════════════════════════════════════════════════════ */

const PRESETS = {

  /* ─── Mass & Volume ─────────────────────────────── */
  mass: {
    name:    'Mass Measurement',
    params:  ['m'],
    n:       10,
    unit:    'g',
    derived: [],
    sampleData: {
      m: [100.0021, 100.0018, 100.0023, 100.0019, 100.0022,
          100.0020, 100.0024, 100.0017, 100.0021, 100.0020],
    },
    typeBComponents: [
      {
        name:         'Calibration certificate',
        param:        'm',
        halfWidth:    0.0005,
        distribution: 'normal',
        sensitivity:  1,
        unit:         'g',
      },
      {
        name:         'Resolution (digital readout)',
        param:        'm',
        halfWidth:    0.00005,
        distribution: 'rect',
        sensitivity:  1,
        unit:         'g',
      },
      {
        name:         'Buoyancy correction',
        param:        'm',
        halfWidth:    0.0001,
        distribution: 'rect',
        sensitivity:  1,
        unit:         'g',
      },
      {
        name:         'Temperature effect',
        param:        'm',
        halfWidth:    0.00003,
        distribution: 'rect',
        sensitivity:  1,
        unit:         'g',
      },
    ],
  },

  volume: {
    name:    'Volume Measurement',
    params:  ['V'],
    n:       10,
    unit:    'mL',
    derived: [],
    sampleData: {
      V: [99.972, 99.975, 99.969, 99.973, 99.976,
          99.971, 99.974, 99.970, 99.973, 99.975],
    },
    typeBComponents: [
      {
        name:         'Calibration of glassware',
        param:        'V',
        halfWidth:    0.02,
        distribution: 'triang',
        sensitivity:  1,
        unit:         'mL',
      },
      {
        name:         'Temperature deviation (thermal expansion)',
        param:        'V',
        halfWidth:    0.015,
        distribution: 'rect',
        sensitivity:  1,
        unit:         'mL',
      },
      {
        name:         'Meniscus reading',
        param:        'V',
        halfWidth:    0.01,
        distribution: 'rect',
        sensitivity:  1,
        unit:         'mL',
      },
    ],
  },

  density: {
    name:    'Density (derived: ρ = m/V)',
    params:  ['m', 'V'],
    n:       5,
    unit:    'g/cm³',
    formula: 'ρ = m / V',
    derived: [{ formula: 'ρ = m / V', symbol: 'ρ' }],
    sampleData: {
      m: [99.8312, 99.8741, 99.8103, 99.8655, 99.8236],
      V: [100.02, 100.06, 99.98, 100.04, 100.00],
    },
    typeBComponents: [
      { name: 'Balance calibration (U, k=2)', param: 'm', halfWidth: 0.0006, distribution: 'normal', k: 2, sensitivity: 1, unit: 'g' },
      { name: 'Balance resolution d',         param: 'm', halfWidth: 0.0001, distribution: 'resol',  sensitivity: 1, unit: 'g' },
      { name: 'Non-linearity / eccentricity', param: 'm', halfWidth: 0.0002, distribution: 'rect',   sensitivity: 1, unit: 'g' },
      { name: 'Glassware tolerance',          param: 'V', halfWidth: 0.1,    distribution: 'rect',   sensitivity: 1, unit: 'cm³' },
      { name: 'Scale reading d',              param: 'V', halfWidth: 0.02,   distribution: 'resol',  sensitivity: 1, unit: 'cm³' },
      // a = ΔT (°C); multiplier = V·γ = 100.02 × 2.1e-4 cm³/°C
      { name: 'Temperature ±ΔT (×V·γ)',       param: 'V', halfWidth: 2,      distribution: 'rect',   sensitivity: 0.021004, unit: 'cm³' },
    ],
  },

  /* ─── Electrical ────────────────────────────────── */
  voltage: {
    name:    'DC Voltage Measurement',
    params:  ['U'],
    n:       10,
    unit:    'V',
    derived: [],
    sampleData: {
      U: [9.9987, 9.9991, 9.9985, 9.9988, 9.9990,
          9.9986, 9.9989, 9.9987, 9.9991, 9.9988],
    },
    typeBComponents: [
      {
        name:         'DMM calibration certificate',
        param:        'U',
        halfWidth:    0.003,
        distribution: 'normal',
        sensitivity:  1,
        unit:         'V',
      },
      {
        name:         'Reference standard uncertainty',
        param:        'U',
        halfWidth:    0.001,
        distribution: 'normal',
        sensitivity:  1,
        unit:         'V',
      },
      {
        name:         'Resolution',
        param:        'U',
        halfWidth:    0.00005,
        distribution: 'rect',
        sensitivity:  1,
        unit:         'V',
      },
      {
        name:         'Thermal EMF',
        param:        'U',
        halfWidth:    0.0005,
        distribution: 'rect',
        sensitivity:  1,
        unit:         'V',
      },
    ],
  },

  resistance: {
    name:    'Resistance Measurement',
    params:  ['R'],
    n:       10,
    unit:    'Ω',
    derived: [],
    sampleData: {
      R: [1000.002, 1000.005, 999.998, 1000.003, 1000.001,
          1000.004, 999.999, 1000.002, 1000.003, 1000.001],
    },
    typeBComponents: [
      {
        name:         'Calibration uncertainty',
        param:        'R',
        halfWidth:    0.005,
        distribution: 'normal',
        sensitivity:  1,
        unit:         'Ω',
      },
      {
        name:         'Stability of reference',
        param:        'R',
        halfWidth:    0.002,
        distribution: 'rect',
        sensitivity:  1,
        unit:         'Ω',
      },
      {
        name:         'Resolution',
        param:        'R',
        halfWidth:    0.0005,
        distribution: 'rect',
        sensitivity:  1,
        unit:         'Ω',
      },
    ],
  },

  power: {
    name:    'Electrical Power (derived: P = U·I)',
    params:  ['U', 'I'],
    n:       10,
    unit:    'W',
    formula: 'P = U * I',
    derived: [{ formula: 'P = U × I', symbol: 'P' }],
    sampleData: {
      U: [9.9987, 9.9991, 9.9985, 9.9988, 9.9990,
          9.9986, 9.9989, 9.9987, 9.9991, 9.9988],
      I: [0.50012, 0.50009, 0.50015, 0.50011, 0.50010,
          0.50013, 0.50008, 0.50012, 0.50010, 0.50011],
    },
    typeBComponents: [
      {
        name:         'Voltage DMM calibration',
        param:        'U',
        halfWidth:    0.003,
        distribution: 'normal',
        sensitivity:  1,
        unit:         'V',
      },
      {
        name:         'Current shunt calibration',
        param:        'I',
        halfWidth:    0.0002,
        distribution: 'normal',
        sensitivity:  1,
        unit:         'A',
      },
    ],
  },

  /* ─── Dimensional ───────────────────────────────── */
  length: {
    name:    'Length Measurement',
    params:  ['L'],
    n:       10,
    unit:    'mm',
    derived: [],
    sampleData: {
      L: [25.003, 24.999, 25.001, 25.002, 24.998,
          25.001, 25.000, 25.002, 24.999, 25.001],
    },
    typeBComponents: [
      {
        name:         'Calibration of micrometer',
        param:        'L',
        halfWidth:    0.002,
        distribution: 'normal',
        sensitivity:  1,
        unit:         'mm',
      },
      {
        name:         'Resolution (0.001 mm)',
        param:        'L',
        halfWidth:    0.0005,
        distribution: 'rect',
        sensitivity:  1,
        unit:         'mm',
      },
      {
        name:         'Thermal expansion (ΔT = ±1 °C)',
        param:        'L',
        halfWidth:    0.0003,
        distribution: 'rect',
        sensitivity:  1,
        unit:         'mm',
      },
    ],
  },

  area: {
    name:    'Area (derived: A = L × W)',
    params:  ['L', 'W'],
    n:       10,
    unit:    'mm²',
    formula: 'A = L * W',
    derived: [{ formula: 'A = L × W', symbol: 'A' }],
    sampleData: {
      L: [25.003, 24.999, 25.001, 25.002, 24.998,
          25.001, 25.000, 25.002, 24.999, 25.001],
      W: [15.002, 15.001, 14.998, 15.000, 15.003,
          14.999, 15.001, 15.000, 15.002, 14.999],
    },
    typeBComponents: [
      {
        name:         'Length calibration',
        param:        'L',
        halfWidth:    0.002,
        distribution: 'normal',
        sensitivity:  1,
        unit:         'mm',
      },
      {
        name:         'Width calibration',
        param:        'W',
        halfWidth:    0.002,
        distribution: 'normal',
        sensitivity:  1,
        unit:         'mm',
      },
    ],
  },

  temperature: {
    name:    'Temperature Measurement',
    params:  ['T'],
    n:       10,
    unit:    '°C',
    derived: [],
    sampleData: {
      T: [20.02, 19.98, 20.01, 20.00, 19.99,
          20.02, 20.00, 19.98, 20.01, 20.00],
    },
    typeBComponents: [
      {
        name:         'Thermometer calibration',
        param:        'T',
        halfWidth:    0.05,
        distribution: 'normal',
        sensitivity:  1,
        unit:         '°C',
      },
      {
        name:         'Resolution',
        param:        'T',
        halfWidth:    0.005,
        distribution: 'rect',
        sensitivity:  1,
        unit:         '°C',
      },
      {
        name:         'Self-heating effect',
        param:        'T',
        halfWidth:    0.02,
        distribution: 'rect',
        sensitivity:  1,
        unit:         '°C',
      },
    ],
  },
};

window.PRESETS = PRESETS;
