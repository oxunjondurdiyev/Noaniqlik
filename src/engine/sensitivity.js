/* ═══════════════════════════════════════════════════════════════
   SENSITIVITY.JS — sezgirlik koeffitsiyentlari c_i = ∂f/∂x_i va yuqori tartibli hosilalar.
   Asosiy usul — simvolik hosila (parser.derivative); sonli markaziy ayirma — zaxira va
   o'zaro tekshiruv. Qadam h kirish masshtabiga (|x_i|, u(x_i)) moslashadi (D-07).
   Ref: JCGM 100:2008 §5.1.3 (c_i = ∂f/∂X_i, X_i = x_i da), §5.1.4 (sonli/eksperimental c_i).
═══════════════════════════════════════════════════════════════ */
import { compileAst, derivative } from './parser.js';
import { EPS } from './util.js';

const CBRT_EPS = Math.cbrt(EPS);        // ≈ 6·10⁻⁶ — markaziy ayirma uchun optimal nisbiy qadam
const QUART_EPS = Math.pow(EPS, 0.25);  // ≈ 1,2·10⁻⁴ — ikkinchi hosila uchun

/** Kirish masshtabi: max(|x|, u(x)); ikkalasi ham 0 bo'lsa — 1. */
function scaleOf(x, u) {
  const s = Math.max(Math.abs(x), Math.abs(u) || 0);
  return s > 0 ? s : 1;
}

/**
 * Markaziy ayirma bilan ∂f/∂x_name. Ref: JCGM 100:2008 §5.1.3 Note 2 (sonli baholash).
 * @returns {{c:number, h:number, err:number}} err — yaxlitlash xatosining taxminiy chegarasi
 */
export function numericDerivative(f, means, name, u) {
  const x0 = means[name];
  const h0 = CBRT_EPS * scaleOf(x0, u);
  // Qadam ikkilik ko'rinishda aniq bo'lishi uchun (x0 + h) − x0 = h
  const h = ((x0 + h0) - x0) || h0;
  const fp = f({ ...means, [name]: x0 + h });
  const fm = f({ ...means, [name]: x0 - h });
  const c = (fp - fm) / (2 * h);
  const err = 4 * EPS * (Math.abs(fp) + Math.abs(fm)) / (2 * h);
  return { c, h, err };
}

/**
 * Barcha kirishlar uchun c_i: simvolik (asosiy) + sonli (o'zaro tekshiruv / zaxira).
 * @param {object|null} ast   model AST (yagona parametrli "y = x" modelda null)
 * @param {(env:object)=>number} f
 * @param {{name:string, mean:number, u:number}[]} inputs
 * @returns {{name:string, c:number, method:'symbolic'|'numeric'|'none', cNum:number, dAst:object|null, mismatch:boolean}[]}
 */
export function sensitivities(ast, f, inputs) {
  const means = {};
  inputs.forEach(i => { means[i.name] = i.mean; });
  return inputs.map(inp => {
    const num = numericDerivative(f, means, inp.name, inp.u);
    let dAst = null, cs = NaN;
    if (ast) {
      try { dAst = derivative(ast, inp.name); cs = compileAst(dAst)(means); } catch (_) { dAst = null; cs = NaN; }
    } else {
      cs = 1; // y = x
    }
    let c, method;
    if (isFinite(cs)) { c = cs; method = 'symbolic'; }
    else if (isFinite(num.c)) { c = num.c; method = 'numeric'; }
    else { c = 0; method = 'none'; }
    // O'zaro tekshiruv: sonli hosila xatosi (kesish + yaxlitlash) chegarasidan katta farq — shubhali
    let mismatch = false;
    if (method === 'symbolic' && isFinite(num.c)) {
      const tol = Math.max(1e-6 * Math.max(Math.abs(cs), Math.abs(num.c)), 10 * num.err);
      mismatch = Math.abs(cs - num.c) > tol;
    }
    return { name: inp.name, c, method, cNum: num.c, hNum: num.h, dAst, mismatch };
  });
}

/**
 * Ikkinchi va uchinchi tartibli hosilalar (simvolik; cheksiz/NaN bo'lsa — sonli, h ~ ε^¼·masshtab).
 * H[i][j] = ∂²f/∂x_i∂x_j,  T3[i][j] = ∂³f/(∂x_i ∂x_j²).
 * Ref: JCGM 100:2008 §5.1.2 Note (2-tartibli hadlar formulasi).
 */
export function higherDerivatives(ast, f, inputs, first) {
  const n = inputs.length;
  const means = {};
  inputs.forEach(i => { means[i.name] = i.mean; });
  const H = Array.from({ length: n }, () => new Array(n).fill(0));
  const T3 = Array.from({ length: n }, () => new Array(n).fill(0));
  let numeric = false;
  const hOf = i => QUART_EPS * scaleOf(inputs[i].mean, inputs[i].u);
  const at = (shift) => {
    const env = { ...means };
    for (const [i, d] of shift) env[inputs[i].name] = means[inputs[i].name] + d;
    return f(env);
  };
  const numH = (i, j) => {
    const hi = hOf(i), hj = hOf(j);
    if (i === j) return (at([[i, hi]]) - 2 * at([]) + at([[i, -hi]])) / (hi * hi);
    return (at([[i, hi], [j, hj]]) - at([[i, hi], [j, -hj]]) - at([[i, -hi], [j, hj]]) + at([[i, -hi], [j, -hj]])) / (4 * hi * hj);
  };
  const numT3 = (i, j) => { // ∂/∂x_i (∂²f/∂x_j²)
    const hi = hOf(i), hj = hOf(j);
    const d2 = di => (at([[i, di], [j, hj]]) - 2 * at([[i, di]]) + at([[i, di], [j, -hj]])) / (hj * hj);
    if (i === j) {
      const h = hi;
      return (at([[i, 2 * h]]) - 2 * at([[i, h]]) + 2 * at([[i, -h]]) - at([[i, -2 * h]])) / (2 * h * h * h);
    }
    return (d2(hi) - d2(-hi)) / (2 * hi);
  };
  for (let i = 0; i < n; i++) {
    const di = first[i].dAst;
    for (let j = 0; j < n; j++) {
      let h2 = NaN, t3 = NaN;
      if (ast && di) {
        try {
          const dij = derivative(di, inputs[j].name);
          h2 = compileAst(dij)(means);
          t3 = compileAst(derivative(dij, inputs[j].name))(means);
        } catch (_) { /* sonli zaxira */ }
      } else if (!ast) { h2 = 0; t3 = 0; }
      if (!isFinite(h2)) { h2 = numH(i, j); numeric = true; }
      if (!isFinite(t3)) { t3 = numT3(i, j); numeric = true; }
      H[i][j] = isFinite(h2) ? h2 : 0;
      T3[i][j] = isFinite(t3) ? t3 : 0;
    }
  }
  return { H, T3, numeric };
}

/**
 * GUM 5.1.2 Note dagi keyingi tartibli hadlar:
 *   Σ_i Σ_j [ ½ (∂²f/∂x_i∂x_j)² + ∂f/∂x_i · ∂³f/∂x_i∂x_j² ] u²(x_i) u²(x_j)
 * Faqat har bir X_i normal taqsimotli va korrelyatsiyasiz bo'lsa haqiqiy (manbadagi shart).
 * Ref: JCGM 100:2008 §5.1.2 Note.
 */
export function secondOrderVariance(c, H, T3, u) {
  return secondOrderTerms(c, H, T3, u).u2;
}

/** Xuddi shu yig'indi + (i, j) juftliklari bo'yicha hissalar (i ≤ j, simmetrik juftliklar qo'shilgan). */
export function secondOrderTerms(c, H, T3, u) {
  const n = c.length;
  let u2 = 0;
  const terms = [];
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const t = (k, l) => (0.5 * H[k][l] * H[k][l] + c[k] * T3[k][l]) * u[k] * u[k] * u[l] * u[l];
      const v = i === j ? t(i, i) : t(i, j) + t(j, i);
      u2 += v;
      if (v !== 0) terms.push({ i, j, value: v });
    }
  }
  return { u2, terms };
}
