/* ═══════════════════════════════════════════════════════════════
   CALC.JS — GUM (JCGM 100:2008) uncertainty engine
   Generic measurement model y = f(x1…xN):
   Type A, Type B, correlation, sensitivity coefficients,
   combined uncertainty, Welch–Satterthwaite, Student coverage factor
═══════════════════════════════════════════════════════════════ */

const Calc = (() => {

  /* ─── Helpers ───────────────────────────────────── */
  function isBlank(v) {
    return v === '' || v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
  }

  function toNum(v) {
    if (isBlank(v)) return NaN;
    return Number(String(v).replace(',', '.'));
  }

  /* ─── Type A: Statistical analysis (GUM 4.2) ────── */
  function typeA(values) {
    // Row-aligned: blanks stay undefined so the table can show per-row deviations
    const rowVals = (values || []).map(toNum);
    const nums = rowVals.filter(v => isFinite(v));
    const n = nums.length;
    if (n < 1) return null;

    const mean = nums.reduce((a, b) => a + b, 0) / n;
    const deviations = rowVals.map(v => isFinite(v) ? v - mean : undefined);
    const s2 = n > 1 ? nums.reduce((a, v) => a + (v - mean) * (v - mean), 0) / (n - 1) : 0;
    const s  = Math.sqrt(s2);
    const uA = n > 1 ? s / Math.sqrt(n) : 0;

    return { n, mean, deviations, s2, s, uA, nu: n > 1 ? n - 1 : Infinity, values: nums, rowVals };
  }

  /* ─── Type B: distribution divisors (GUM 4.3) ───── */
  const DIVISORS = {
    rect:   { divisor: Math.sqrt(3),     label: '√3' },
    normal: { divisor: 2,                label: 'k' },
    triang: { divisor: Math.sqrt(6),     label: '√6' },
    ushape: { divisor: Math.sqrt(2),     label: '√2' },
    resol:  { divisor: 2 * Math.sqrt(3), label: '2√3' },
  };

  function getDivisor(dist, k) {
    if (dist === 'normal') {
      const kk = Number(k);
      return kk > 0 ? kk : 2;
    }
    return (DIVISORS[dist] || DIVISORS.rect).divisor;
  }

  function getDivisorLabel(dist, k) {
    if (dist === 'normal') return String(getDivisor(dist, k));
    return (DIVISORS[dist] || DIVISORS.rect).label;
  }

  /** Standard uncertainty of one Type B component */
  function typeB(halfWidth, dist, k) {
    return Math.abs(Number(halfWidth) || 0) / getDivisor(dist, k);
  }

  /* ─── Formula parser (safe, no eval) ────────────── */
  const FUNCS = {
    sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
    ln: Math.log, log: Math.log10, lg: Math.log10, log10: Math.log10,
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
  };
  const CONSTS = { pi: Math.PI, 'π': Math.PI };

  function splitFormula(text) {
    const src = String(text || '').trim();
    const i = src.indexOf('=');
    if (i === -1) return { symbol: '', expr: src };
    return { symbol: src.slice(0, i).trim(), expr: src.slice(i + 1).trim() };
  }

  function tokenize(src, params) {
    let s = String(src)
      .replace(/[×·∙⋅]/g, '*').replace(/[÷:]/g, '/').replace(/[−–—]/g, '-')
      .replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/(\d),(\d)/g, '$1.$2');
    const byLen = [...params].sort((a, b) => b.length - a.length);
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if ('+-*/^()'.includes(ch)) { tokens.push({ t: 'op', v: ch }); i++; continue; }
      if (ch === '√') { tokens.push({ t: 'func', v: 'sqrt' }); i++; continue; }
      const rest = s.slice(i);
      const num = rest.match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
      if (num) { tokens.push({ t: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
      const run = rest.match(/^[^\s+\-*\/^()=.,√0-9][^\s+\-*\/^()=,√]*/);
      const word = run ? run[0] : '';
      if (word && params.includes(word)) { tokens.push({ t: 'var', v: word }); i += word.length; continue; }
      const lw = word.toLowerCase();
      if (word && FUNCS[lw]) { tokens.push({ t: 'func', v: lw }); i += word.length; continue; }
      if (word && CONSTS[lw] !== undefined) { tokens.push({ t: 'num', v: CONSTS[lw] }); i += word.length; continue; }
      const pref = byLen.find(p => rest.startsWith(p));
      if (pref) { tokens.push({ t: 'var', v: pref }); i += pref.length; continue; }
      if (lw === 'e') { tokens.push({ t: 'num', v: Math.E }); i += 1; continue; }
      throw new Error('unknown:' + (word || ch));
    }
    return tokens;
  }

  /** Compile an expression into f(valuesByParamName) → number */
  function compile(expr, params) {
    const tokens = tokenize(expr, params);
    if (!tokens.length) throw new Error('empty');
    let pos = 0;
    const peek = () => tokens[pos];
    const isOp = v => peek() && peek().t === 'op' && peek().v === v;

    function parseExpr() {
      let left = parseTerm();
      while (isOp('+') || isOp('-')) {
        const op = tokens[pos++].v, l = left, r = parseTerm();
        left = op === '+' ? (e => l(e) + r(e)) : (e => l(e) - r(e));
      }
      return left;
    }
    function parseTerm() {
      let left = parseUnary();
      while (isOp('*') || isOp('/')) {
        const op = tokens[pos++].v, l = left, r = parseUnary();
        left = op === '*' ? (e => l(e) * r(e)) : (e => l(e) / r(e));
      }
      return left;
    }
    function parseUnary() {
      if (isOp('-')) { pos++; const u = parseUnary(); return e => -u(e); }
      if (isOp('+')) { pos++; return parseUnary(); }
      return parsePower();
    }
    function parsePower() {
      const base = parsePrimary();
      if (isOp('^')) { pos++; const ex = parseUnary(); return e => Math.pow(base(e), ex(e)); }
      return base;
    }
    function parsePrimary() {
      const tk = tokens[pos++];
      if (!tk) throw new Error('syntax');
      if (tk.t === 'num') { const v = tk.v; return () => v; }
      if (tk.t === 'var') { const name = tk.v; return e => e[name]; }
      if (tk.t === 'func') { const fn = FUNCS[tk.v], arg = parsePrimary(); return e => fn(arg(e)); }
      if (tk.t === 'op' && tk.v === '(') {
        const inner = parseExpr();
        if (!isOp(')')) throw new Error('syntax');
        pos++;
        return inner;
      }
      throw new Error('syntax');
    }

    const fn = parseExpr();
    if (pos < tokens.length) throw new Error('syntax');
    return fn;
  }

  /* ─── Student t quantile (GUM G.3) ──────────────── */
  function lgamma(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
               -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  function betacf(a, b, x) {
    const FPMIN = 1e-300;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 5000; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    return h;
  }

  function betai(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }

  function erf(x) {
    // Abramowitz–Stegun 7.1.26 refined by series for accuracy
    const t = 1 / (1 + 0.5 * Math.abs(x));
    const tau = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
      t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? 1 - tau : tau - 1;
  }

  /** Two-sided coverage probability P(|T| < t) for ν degrees of freedom */
  function tCoverage(t, nu) {
    if (!isFinite(nu) || nu > 5000) return erf(t / Math.SQRT2);
    return 1 - betai(nu / 2, 0.5, nu / (nu + t * t));
  }

  /** Coverage factor k = t(P; ν) */
  function coverageFactor(P, nu) {
    const p = Math.min(Math.max(Number(P) || 0.9545, 0.5), 0.99999);
    const df = isFinite(nu) ? Math.max(1, Math.floor(nu)) : Infinity;
    let lo = 0, hi = 1000;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (tCoverage(mid, df) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* ─── Statistics for pairs ──────────────────────── */
  function correlation(xs, ys) {
    // xs, ys: row-aligned arrays; uses only rows where both are finite
    const pairs = [];
    const len = Math.min(xs.length, ys.length);
    for (let i = 0; i < len; i++) if (isFinite(xs[i]) && isFinite(ys[i])) pairs.push([xs[i], ys[i]]);
    const n = pairs.length;
    if (n < 2) return 0;
    const mx = pairs.reduce((a, p) => a + p[0], 0) / n;
    const my = pairs.reduce((a, p) => a + p[1], 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    pairs.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; });
    if (sxx === 0 || syy === 0) return 0;
    return sxy / Math.sqrt(sxx * syy);
  }

  function pairKey(a, b) { return a + '|' + b; }

  /* ─── Type A with method options ────────────────── */
  /**
   * opts: { method: 1|2|3, sp, nup, directional, dirs: ['↑'|'↓'|'' …] }
   *  1 — s/√n, ν = n−1 (GUM 4.2.3)
   *  2 — previously determined s_p: u = s_p/√n, ν = ν_p (GUM 4.2.4)
   *  3 — COOMET R/GM/32 small sample: u = s/√n·√((n−1)/(n−3)), n ≥ 4
   *  directional — ↑/↓ readings: x̄ = (x̄↑ + x̄↓)/2, pooled s within direction,
   *                ν = n−2, hysteresis h = |x̄↓ − x̄↑| reported separately
   */
  function typeAx(values, opts) {
    const base = typeA(values);
    if (!base) return null;
    const o = opts || {};
    const out = { ...base, method: Number(o.method) || 1, directional: false, h: 0, warnings: [] };
    let s = base.s, nu = base.n > 1 ? base.n - 1 : Infinity;

    if (o.directional && Array.isArray(o.dirs)) {
      const up = [], dn = [];
      base.rowVals.forEach((v, i) => {
        if (!isFinite(v)) return;
        if (o.dirs[i] === '↓') dn.push(v); else if (o.dirs[i] === '↑') up.push(v);
      });
      if (up.length && dn.length) {
        const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
        const mU = avg(up), mD = avg(dn);
        const ss = up.reduce((a, v) => a + (v - mU) ** 2, 0) + dn.reduce((a, v) => a + (v - mD) ** 2, 0);
        const df = up.length + dn.length - 2;
        out.directional = true;
        out.meanUp = mU; out.meanDn = mD; out.nUp = up.length; out.nDn = dn.length;
        out.mean = (mU + mD) / 2;
        out.h = Math.abs(mD - mU);
        out.deviations = base.rowVals.map((v, i) => isFinite(v) ? v - (o.dirs[i] === '↓' ? mD : mU) : undefined);
        s = df > 0 ? Math.sqrt(ss / df) : 0;
        nu = df > 0 ? df : Infinity;
        out.sp = s;
      } else {
        out.warnings.push('dir_missing');
      }
    }

    const n = base.n;
    let uA;
    if (out.method === 2) {
      const sp = toNum(o.sp), nup = toNum(o.nup);
      uA = isFinite(sp) && sp >= 0 ? sp / Math.sqrt(n) : s / Math.sqrt(n);
      nu = isFinite(nup) && nup > 0 ? nup : nu;
      if (!(isFinite(sp) && sp >= 0)) out.warnings.push('sp_missing');
    } else if (out.method === 3) {
      if (n >= 4) { uA = s / Math.sqrt(n) * Math.sqrt((n - 1) / (n - 3)); nu = Infinity; }
      else { uA = n > 1 ? s / Math.sqrt(n) : 0; out.warnings.push('coomet_small'); }
    } else {
      uA = n > 1 ? s / Math.sqrt(n) : 0;
    }
    if (n > 1 && s === 0 && out.method !== 2) out.warnings.push('zero_s');
    if (n > 1 && n < 5 && out.method === 1) out.warnings.push('n_small');

    out.sEff = s;
    out.uA = uA;
    out.nu = nu;
    return out;
  }

  /* Numeric value or expression of the input means (e.g. "0.0002*I + 0.002") */
  function valueOrExpr(v, params, means) {
    if (typeof v === 'number') return v;
    const n = toNum(v);
    if (isFinite(n)) return n;
    if (isBlank(v)) return 0;
    const f = compile(String(v), params);
    const r = f(means);
    if (!isFinite(r)) throw new Error('eval');
    return r;
  }

  function roundAt(v, d, up) {
    const m = Math.pow(10, d);
    if (!up) return Math.round(v * m) / m;
    return Math.ceil(v * m - 1e-9) / m;
  }

  /* Round U to 2 significant digits and y to the same decimal place (GUM 7.2.6) */
  function roundResult(y, U, up) {
    const digits = U > 0 ? 1 - Math.floor(Math.log10(U)) : 6;
    const dp = Math.max(0, Math.min(12, digits));
    let Uround = U > 0 ? roundAt(U, digits, up) : 0;
    // ROUNDUP can push 0.099 → 0.1 (one significant digit less); keep the decimal place
    const yround = roundAt(y, digits, false);
    return { digits: dp, Uround, yround, resultText: `${yround.toFixed(dp)} ± ${Uround.toFixed(dp)}` };
  }

  /* Conformity with MPE (ISO/IEC 17025 7.8.6, JCGM 106, ILAC G8) */
  function conformity(y, U, mpe) {
    if (!(mpe > 0)) return { mpe: mpe || 0, simple: 'na', guarded: 'na', ratio: null };
    const e = Math.abs(y);
    return {
      mpe, ratio: U / mpe,
      simple:  e <= mpe ? 'ok' : 'fail',
      guarded: e + U <= mpe ? 'ok' : (e - U > mpe ? 'fail' : 'zone'),
    };
  }

  /* ─── Full GUM evaluation ───────────────────────── */
  /**
   * @param {object} state  { params, measurements, directions, typeB, model, settings, covB }
   * @returns {object} result, or { error: code, detail }
   */
  function evaluate(state) {
    const params   = state.params || [];
    const model    = state.model || {};
    const settings = state.settings || {};
    const paired   = settings.paired !== false;
    const P        = Number(settings.P) || 0.9545;
    const methods  = settings.typeA || {};
    const dirs     = state.directions || [];

    // 1. Model
    const { symbol: lhs, expr } = splitFormula(model.formula);
    let f, symbol, formulaText;
    if (!expr) {
      if (params.length !== 1) return { error: 'need_formula' };
      const only = params[0];
      f = e => e[only];
      symbol = only;
      formulaText = only;
    } else {
      try { f = compile(expr, params); }
      catch (err) { return { error: 'bad_formula', detail: String(err.message || '').replace(/^unknown:/, '') }; }
      symbol = lhs || 'y';
      formulaText = expr;
    }

    // 2–3. Input estimates and Type A
    const inputs = [];
    for (const p of params) {
      const opt = { ...(methods[p] || {}), dirs };
      const ta = typeAx(state.measurements ? state.measurements[p] : [], opt);
      if (!ta) return { error: 'need_data', detail: p };
      inputs.push({ name: p, ...ta });
    }
    const means = {};
    inputs.forEach(inp => { means[inp.name] = inp.mean; });

    // 4. Type B per input (half-width may be an expression of the input means)
    const comps = [];
    for (const c of (state.typeB || [])) {
      let a;
      try { a = valueOrExpr(c.halfWidth, params, means); }
      catch (_) { return { error: 'bad_halfwidth', detail: c.name }; }
      const std  = typeB(a, c.distribution, c.k);
      const mult = (c.sensitivity === undefined || c.sensitivity === null || c.sensitivity === '') ? 1 : Number(c.sensitivity) || 0;
      const param = params.includes(c.param) ? c.param : params[0];
      const nuB = toNum(c.nu);
      comps.push({ ...c, param, a, std, mult, u: Math.abs(mult) * std, nu: isFinite(nuB) && nuB > 0 ? nuB : Infinity });
    }
    // Hysteresis from ↑/↓ readings: rectangular, half-width h/2
    inputs.forEach(inp => {
      if (inp.directional && inp.h > 0) {
        const a = inp.h / 2;
        comps.push({ name: 'hysteresis', auto: true, param: inp.name, a, halfWidth: a, distribution: 'rect',
                     std: a / Math.sqrt(3), mult: 1, u: a / Math.sqrt(3), nu: Infinity });
      }
    });

    // 5. Combined standard uncertainty of each input
    inputs.forEach(inp => {
      const own = comps.filter(c => c.param === inp.name);
      inp.uB2 = own.reduce((a, c) => a + c.u * c.u, 0);
      inp.uB  = Math.sqrt(inp.uB2);
      inp.u   = Math.sqrt(inp.uA * inp.uA + inp.uB2);
    });

    // 7. Estimate and sensitivity coefficients (central differences)
    const y = f(means);
    if (!isFinite(y)) return { error: 'formula_eval' };
    inputs.forEach(inp => {
      const x0 = inp.mean;
      const h  = (Math.abs(x0) || 1) * 1e-6;
      const up = f({ ...means, [inp.name]: x0 + h });
      const dn = f({ ...means, [inp.name]: x0 - h });
      inp.c = (up - dn) / (2 * h);
      if (!isFinite(inp.c)) inp.c = 0;
    });

    // 6. Correlation between inputs
    const covB = state.covB || {};
    const pairs = [];
    for (let i = 0; i < inputs.length; i++) {
      for (let j = i + 1; j < inputs.length; j++) {
        const a = inputs[i], b = inputs[j];
        const rA   = paired ? correlation(a.rowVals, b.rowVals) : 0;
        const covA = rA * a.uA * b.uA;
        const cB   = toNum(covB[pairKey(a.name, b.name)]);
        const cov  = covA + (isFinite(cB) ? cB : 0);
        const r    = (a.u > 0 && b.u > 0) ? cov / (a.u * b.u) : 0;
        pairs.push({ a: a.name, b: b.name, rA, covA, covB: isFinite(cB) ? cB : 0, cov, r,
                     term: 2 * a.c * b.c * cov, termA: 2 * a.c * b.c * covA });
      }
    }

    // 8. Combined variance
    const varNoCorr = inputs.reduce((s, inp) => s + (inp.c * inp.u) ** 2, 0);
    const corrSum   = pairs.reduce((s, p) => s + p.term, 0);
    const uc2 = Math.max(0, varNoCorr + corrSum);
    const uc  = Math.sqrt(uc2);
    const ucNoCorr = Math.sqrt(varNoCorr);

    // 9. Welch–Satterthwaite (Type B: ν = ∞ unless given)
    let denom = inputs.reduce((s, inp) =>
      s + (isFinite(inp.nu) && inp.uA > 0 ? Math.pow(inp.c * inp.uA, 4) / inp.nu : 0), 0);
    comps.forEach(cm => {
      if (isFinite(cm.nu)) {
        const ci = inputs.find(i => i.name === cm.param).c;
        denom += Math.pow(ci * cm.u, 4) / cm.nu;
      }
    });
    const nuEff = denom > 0 ? Math.min(1e6, Math.pow(uc, 4) / denom) : Infinity;

    // 10. Coverage factor and expanded uncertainty
    const kMethod = settings.kMethod === 'k2' ? 'k2' : 'nu';
    const k = kMethod === 'k2' ? 2 : coverageFactor(P, nuEff);
    const U = k * uc;

    // 11. Rounding
    const roundUp = settings.rounding === 'up';
    const rr = roundResult(y, U, roundUp);

    // Budget
    const budget = [];
    inputs.forEach(inp => {
      if (inp.n > 1 || inp.method === 2) {
        budget.push({ kind: 'A', name: inp.name, param: inp.name, dist: 'normal', n: inp.n, method: inp.method,
                      directional: inp.directional, nu: inp.nu, u: inp.uA, c: inp.c, contrib: (inp.c * inp.uA) ** 2 });
      }
      comps.filter(cm => cm.param === inp.name).forEach(cm => {
        budget.push({ kind: 'B', name: cm.name, auto: !!cm.auto, param: inp.name, dist: cm.distribution, unit: cm.unit,
                      nu: cm.nu, u: cm.u, c: inp.c, contrib: (inp.c * cm.u) ** 2 });
      });
    });
    pairs.forEach(p => {
      if (p.cov !== 0) {
        budget.push({ kind: 'corr', name: p.a + ' ↔ ' + p.b, param: '', dist: '',
                      u: p.cov, c: 2 * inputs.find(i => i.name === p.a).c * inputs.find(i => i.name === p.b).c,
                      contrib: p.term });
      }
    });
    budget.forEach(row => {
      row.ui = row.kind === 'corr' ? null : Math.abs(row.c) * row.u;
      row.share = uc2 > 0 ? row.contrib / uc2 * 100 : 0;
    });

    // 12. Verification — GUM H.2 approach 2: y_i from each paired row (plain Type A only)
    let verify = null;
    const n0 = inputs[0].n;
    const plain = inputs.every(inp => inp.method === 1 && !inp.directional);
    const rowsOk = paired && expr && plain && inputs.every(inp => inp.n === n0) && n0 > 1 &&
      inputs[0].rowVals.every((_, r) => {
        const fin = inputs.map(inp => isFinite(inp.rowVals[r]));
        return fin.every(Boolean) || !fin.some(Boolean);
      });
    if (rowsOk) {
      const ys = [];
      inputs[0].rowVals.forEach((v, r) => {
        if (!isFinite(v)) return;
        const env = {};
        inputs.forEach(inp => { env[inp.name] = inp.rowVals[r]; });
        ys.push(f(env));
      });
      if (ys.every(isFinite)) {
        const st = typeA(ys);
        const varA = inputs.reduce((s, inp) => s + (inp.c * inp.uA) ** 2, 0) + pairs.reduce((s, p) => s + p.termA, 0);
        const uAformula = Math.sqrt(Math.max(0, varA));
        verify = { ys, mean: st.mean, uAdirect: st.uA, uAformula,
                   diffPct: st.uA > 0 ? (uAformula - st.uA) / st.uA * 100 : 0 };
      }
    }

    // Conformity, reduced error, CMC
    let conf = null;
    if (!isBlank(settings.mpe)) {
      let mpe;
      try { mpe = Math.abs(valueOrExpr(settings.mpe, params, means)); }
      catch (_) { return { error: 'bad_mpe' }; }
      conf = conformity(y, U, mpe);
    }
    const range = toNum(settings.range);
    const gamma = isFinite(range) && range > 0 ? Math.abs(y) / range * 100 : null;

    // Warnings
    const warnings = [];
    inputs.forEach(inp => inp.warnings.forEach(w => warnings.push({ code: w, param: inp.name })));
    const cmc = toNum(settings.cmc);
    if (isFinite(cmc) && cmc > 0 && U < cmc) warnings.push({ code: 'below_cmc', value: cmc });
    if (U === 0) warnings.push({ code: 'zero_u' });

    return {
      symbol, formulaText, unit: model.unit || '', P, paired, kMethod, roundUp,
      inputs: inputs.map(({ rowVals, deviations, values, warnings: w, ...rest }) => rest),
      pairs, budget, verify, conf, gamma, warnings, cmc: isFinite(cmc) ? cmc : null,
      y, mean: y, uc2, uc, ucNoCorr,
      corrEffectPct: ucNoCorr > 0 ? (uc - ucNoCorr) / ucNoCorr * 100 : 0,
      nuEff, k, U, relUc: y ? uc / Math.abs(y) * 100 : null, relU: y ? U / Math.abs(y) * 100 : null,
      ...rr,
    };
  }

  /* ─── Monte Carlo propagation (JCGM 101:2008) ───── */
  function rng(seed) {
    let s = seed >>> 0 || 0x9e3779b9;
    return () => {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return (s + 0.5) / 4294967296;
    };
  }

  function monteCarlo(state, M) {
    const res = evaluate(state);
    if (res.error) return res;
    M = Math.max(10000, Math.min(2000000, M || 200000));
    const params = state.params;
    const { expr } = splitFormula((state.model || {}).formula);
    const f = expr ? compile(expr, params) : (e => e[params[0]]);
    const rand = rng(20261110);
    let spare = null;
    const gauss = () => {
      if (spare !== null) { const v = spare; spare = null; return v; }
      let u, v, s;
      do { u = 2 * rand() - 1; v = 2 * rand() - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
      const m = Math.sqrt(-2 * Math.log(s) / s);
      spare = v * m;
      return u * m;
    };
    const gamma = k => { // Marsaglia–Tsang, shape k ≥ 1
      const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
      for (;;) {
        let x, v;
        do { x = gauss(); v = 1 + c * x; } while (v <= 0);
        v = v * v * v;
        const u = rand();
        if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
      }
    };
    const student = nu => {
      if (!isFinite(nu) || nu > 1e5) return gauss();
      const k = nu / 2;
      const g = k >= 1 ? gamma(k) : gamma(k + 1) * Math.pow(rand(), 1 / k);
      return gauss() / Math.sqrt(g / k);
    };
    // GUM-S1 6.4.9.7: scaled & shifted t for Type A; Type B by its distribution
    const sampleB = cm => {
      const a = Math.abs(cm.a);
      switch (cm.distribution) {
        case 'normal': return gauss() * a / getDivisor('normal', cm.k);
        case 'triang': return a * (rand() - rand());
        case 'ushape': return a * Math.sin(Math.PI * (rand() - 0.5));
        case 'resol':  return a * (rand() - 0.5);
        default:       return a * (2 * rand() - 1);
      }
    };
    const inputs = res.inputs;
    const compsBy = {};
    const means = {}; inputs.forEach(i => { means[i.name] = i.mean; });
    params.forEach(p => { compsBy[p] = []; });
    (state.typeB || []).forEach(c => {
      const param = params.includes(c.param) ? c.param : params[0];
      const mult = (c.sensitivity === undefined || c.sensitivity === null || c.sensitivity === '') ? 1 : Number(c.sensitivity) || 0;
      compsBy[param].push({ ...c, a: valueOrExpr(c.halfWidth, params, means), mult });
    });
    inputs.forEach(inp => {
      if (inp.directional && inp.h > 0) compsBy[inp.name].push({ a: inp.h / 2, distribution: 'rect', mult: 1 });
    });

    const ys = new Float64Array(M);
    const env = {};
    for (let t = 0; t < M; t++) {
      for (const inp of inputs) {
        let x = inp.mean;
        if (inp.uA > 0) x += inp.uA * student(inp.nu);
        for (const cm of compsBy[inp.name]) x += cm.mult * sampleB(cm);
        env[inp.name] = x;
      }
      ys[t] = f(env);
    }
    let sum = 0;
    for (let t = 0; t < M; t++) sum += ys[t];
    const mean = sum / M;
    let ss = 0;
    for (let t = 0; t < M; t++) ss += (ys[t] - mean) ** 2;
    const u = Math.sqrt(ss / (M - 1));
    ys.sort();
    const P = res.P;
    const q = Math.floor(P * M + 0.5);
    let best = 0;
    for (let r = 1; r + q - 1 < M && r < M - q; r++) {
      if (ys[r + q - 1] - ys[r] < ys[best + q - 1] - ys[best]) best = r;
    }
    const symLow = ys[Math.floor((1 - P) / 2 * M)], symHigh = ys[Math.floor((1 + P) / 2 * M)];
    const low = ys[best], high = ys[best + q - 1];
    // JCGM 101 §8: numerical tolerance δ from 2 significant digits of u_c
    const delta = res.uc > 0 ? 0.5 * Math.pow(10, Math.floor(Math.log10(res.uc)) - 1) : 0;
    const dLow = Math.abs(res.y - res.U - low), dHigh = Math.abs(res.y + res.U - high);
    return {
      M, mean, u, low, high, symLow, symHigh, P,
      gumLow: res.y - res.U, gumHigh: res.y + res.U, gumU: res.U, mcHalf: (high - low) / 2,
      delta, dLow, dHigh, validated: dLow <= delta && dHigh <= delta,
      correlated: res.pairs.some(p => p.cov !== 0),
    };
  }

  /* ─── Formatting helpers ────────────────────────── */
  function fmt(val, dp = 6) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toFixed(dp);
  }

  function fmtSci(val, sig = 4) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (!isFinite(val)) return '∞';
    return Number(val).toPrecision(sig);
  }

  return { typeA, typeB, getDivisor, getDivisorLabel, DIVISORS,
           splitFormula, compile, coverageFactor, correlation, pairKey, evaluate,
           typeAx, roundResult, conformity, monteCarlo, valueOrExpr,
           toNum, fmt, fmtSci };

})();

if (typeof window !== 'undefined') window.Calc = Calc;
if (typeof module !== 'undefined') module.exports = Calc;
