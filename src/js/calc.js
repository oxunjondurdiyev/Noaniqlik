/* ═══════════════════════════════════════════════════════════════
   CALC.JS — GUM:2008 uncertainty formulas
   Type A, Type B, Combined, Expanded
═══════════════════════════════════════════════════════════════ */

const Calc = (() => {

  /* ─── Type A: Statistical analysis ─────────────────
     GUM 4.2 — evaluation of uncertainty by statistical analysis
  ────────────────────────────────────────────────── */
  function typeA(values) {
    const nums = values.map(Number).filter(v => !isNaN(v) && v !== null && v !== '');
    const n = nums.length;
    if (n < 2) return null;

    // Arithmetic mean  x̄ = (1/n) Σxᵢ
    const mean = nums.reduce((a, b) => a + b, 0) / n;

    // Experimental variance  s²(x) = [1/(n-1)] Σ(xᵢ − x̄)²
    const deviations = nums.map(v => v - mean);
    const s2 = deviations.reduce((a, d) => a + d * d, 0) / (n - 1);

    // Experimental standard deviation  s(x) = √s²
    const s = Math.sqrt(s2);

    // Standard uncertainty of the mean  u_A = s(x)/√n
    const uA = s / Math.sqrt(n);

    return {
      n, mean, deviations, s2, s, uA,
      values: nums,
    };
  }

  /* ─── Type B: Distribution divisors ────────────────
     GUM 4.3 — evaluation of uncertainty by other means
  ────────────────────────────────────────────────── */
  const DIVISORS = {
    rect:   { divisor: Math.sqrt(3),   label: '√3' },
    normal: { divisor: 2,              label: '2 (k=2)' },
    triang: { divisor: Math.sqrt(6),   label: '√6' },
    ushape: { divisor: Math.sqrt(2),   label: '√2' },
  };

  /**
   * @param {number} halfWidth - half-width a of the interval
   * @param {'rect'|'normal'|'triang'|'ushape'} dist
   * @returns {number} standard uncertainty
   */
  function typeB(halfWidth, dist) {
    const { divisor } = DIVISORS[dist] || DIVISORS.rect;
    return Math.abs(halfWidth) / divisor;
  }

  function getDivisor(dist) {
    return (DIVISORS[dist] || DIVISORS.rect).divisor;
  }

  function getDivisorLabel(dist) {
    return (DIVISORS[dist] || DIVISORS.rect).label;
  }

  /* ─── Combined uncertainty ──────────────────────────
     GUM 5.1 — law of propagation of uncertainty
     u_c² = Σ (cᵢ · uᵢ)²
  ────────────────────────────────────────────────── */
  /**
   * @param {number} uA - Type A standard uncertainty (already std of mean)
   * @param {Array}  typeBComps - [{uB, sensitivity}]
   * @returns {object} { uc, contributions, uA_contrib }
   */
  function combined(uA, typeBComps) {
    const uA_contrib = uA;                     // sensitivity coeff = 1 for direct measurement
    let sumSq = uA_contrib * uA_contrib;

    const contributions = typeBComps.map(c => {
      const ci   = (c.sensitivity !== undefined && c.sensitivity !== null && c.sensitivity !== '') ? Number(c.sensitivity) : 1;
      const uBi  = c.uB || 0;
      const ciui = ci * uBi;
      const sq   = ciui * ciui;
      sumSq += sq;
      return { ...c, ci, uBi, ciui, sq };
    });

    const uc = Math.sqrt(sumSq);
    return { uc, contributions, uA_contrib, sumSq };
  }

  /* ─── Expanded uncertainty ─────────────────────────
     GUM 5.2 — expanded uncertainty U = k · u_c
     k=2  →  ≈95.45% coverage
     k=3  →  ≈99.73% coverage
  ────────────────────────────────────────────────── */
  function expanded(uc, k = 2) {
    return k * uc;
  }

  /* ─── Relative uncertainty ──────────────────────── */
  function relative(u, mean) {
    if (!mean) return null;
    return (u / Math.abs(mean)) * 100;  // %
  }

  /* ─── Effective degrees of freedom ─────────────────
     Welch-Satterthwaite formula (GUM G.4)
     ν_eff = u_c⁴ / Σ [(cᵢ · uᵢ)⁴ / νᵢ]
  ────────────────────────────────────────────────── */
  function welchSatterthwaite(uA, n, contributions) {
    const uc_4    = Math.pow(contributions.reduce((a, c) => a + c.sq, uA * uA), 2);
    // ν for Type A = n-1; for Type B assume ν → ∞ (contribute 0)
    const denom   = Math.pow(uA, 4) / (n - 1);
    if (denom === 0) return Infinity;
    const nu_eff  = uc_4 / denom;
    return Math.round(nu_eff);
  }

  /* ─── Formatting helpers ────────────────────────── */
  function fmt(val, dp = 6) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toFixed(dp);
  }

  function fmtSci(val, sig = 4) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toPrecision(sig);
  }

  return { typeA, typeB, combined, expanded, relative, welchSatterthwaite,
           getDivisor, getDivisorLabel, DIVISORS, fmt, fmtSci };

})();

window.Calc = Calc;
