/* ═══════════════════════════════════════════════════════════════
   MULTIVARIATE/IMPLICIT.JS — oshkor bo'lmagan (implicit) o'lchash modeli h(Y, X) = 0 (P07b). Sof modul.
   Manba: JCGM 102:2011 §6.3 (17–19-betlar); misollar §6.3.2, §9.5 (55–57-betlar).

   Kirish (calc-state/v2 holatida):
     state.implicit = { unknowns: [{ name, start, unit?, settings? }, …], equations: ['…', …], tol?, maxIter? }
   Tenglama — kirishlar (state.params) va noma'lumlar nomidan tuzilgan ifoda, h_ℓ = 0 ma'nosida; "chap = o'ng"
   ko'rinishi ham qabul qilinadi (h_ℓ = chap − o'ng). Tenglamalar soni = noma'lumlar soni (m).

   Hisob:
     1. y — h(y, x) = 0 ning yechimi, Nyuton usuli bilan (§6.3.1.2, Eq. (7) va Note): y⁽ᵏ⁺¹⁾ = y⁽ᵏ⁾ − C_y⁻¹·h(y⁽ᵏ⁾, x),
        boshlang'ich yaqinlashuv y⁽⁰⁾ = start (foydalanuvchi beradi — dastur o'ylab topmaydi).
     2. C_y (m × m: ∂h_ℓ/∂Y_j) va C_x (m × N: ∂h_ℓ/∂X_i) — simvolik hosilalar, x va y da (§6.3.1.3).
     3. C_y U_y C_yᵀ = C_x U_x C_xᵀ (Eq. (8)); rasman U_y = C U_x Cᵀ, C = C_y⁻¹ C_x (Eq. (9), (10)).
        C_y singular bo'lsa U_y aniqlanmagan (§6.3.1.3 Note 1) — xato `implicit_singular`.
   Amalga oshirish: C teskari matritsasiz, C_y·C = C_x sistemasini qisman tanlovli LU bilan yechib topiladi; so'ng
   har bir chiqish uchun LOKAL CHIZIQLI ekvivalent model Y_j = y_j + Σ_i c_ji·(X_i − x_i), c_ji = −C_ji, tuziladi va
   mavjud (o'zgarmagan) oshkor yo'l bilan baholanadi (evaluate.js / lpu.js): byudjet, ν_eff, k, U, U_y = C U_x Cᵀ,
   qamrov sohasi aynan oshkor modeldagidek. Bu 1-tartibli tarqalish qonunining o'zi (§6.3.1.3 Note 2: oshkormas
   funksiya teoremasi) — natija (8) ning yechimi bilan bir xil.
   Cheklovlar: 2-tartibli hadlar diagnostikasi va o'lchamlik tahlili bajarilmaydi; Monte-Karlo (har bir sinovda
   Nyuton yechimi) qo'llab-quvvatlanmaydi — `implicit_mc_unsupported`.

   LOYIHA QARORLARI (egasi tasdig'ini kutadi — PR "Egasidan qaror kerak"): Nyuton yaqinlashish mezoni va iteratsiya
   chegarasi (IMPLICIT_DEFAULTS), singularlik chegarasi (SINGULAR_PIVOT), Annex B protsedurasi o'rniga LU + C U_x Cᵀ.
═══════════════════════════════════════════════════════════════ */
import { parse, compileAst, derivative, splitFormula } from '../parser.js';
import { evaluateMultivariate, OUTPUT_SETTINGS } from './lpu.js';

/** Nyuton sozlamalari. To'xtash (har bir j uchun bir vaqtda):
 *   'step'       — qadam |Δy_j| ≤ tol·s_j, s_j = max(|y_j|, |y_j⁽⁰⁾|);
 *   'stagnation' — qadam yaxlitlash xatosi darajasida to'xtab qolgan: eng katta nisbiy qadam oldingi iteratsiyadagidan
 *                  kichraymadi va barcha |Δy_j| ≤ stagnationTol·s_j. (Yechim nolga yaqin bo'lib, h da ayirishdagi
 *                  yo'qotish bo'lsa, nisbiy 10⁻¹² ga erishib bo'lmaydi — masalan §9.5.3 dagi θ₁ = 0,01 °C.)
 * Aks holda maxIter dan keyin — `implicit_no_convergence`. Erishilgan oxirgi qadam natijada (`implicit.lastStep`). */
export const IMPLICIT_DEFAULTS = Object.freeze({ tol: 1e-12, maxIter: 50, stagnationTol: 1e-8 });
/** LU da bosh element shu nisbatdan (matritsaning eng katta elementiga) kichik bo'lsa — singular deb hisoblanadi. */
export const SINGULAR_PIVOT = 1e-13;
export const IMPLICIT_ERRORS = Object.freeze(['implicit_bad_spec', 'implicit_bad_equation', 'implicit_bad_start', 'implicit_name_clash',
  'implicit_no_convergence', 'implicit_singular', 'implicit_mc_unsupported']);

export const isImplicit = state => !!state && !!state.implicit && typeof state.implicit === 'object'
  && Array.isArray(state.implicit.equations) && state.implicit.equations.length > 0;

/**
 * A·X = B ni yechish (A — n × n, B — n × q), qisman tanlovli LU (Gauss usuli). Teskari matritsa tuzilmaydi.
 * @returns {number[][]|null}  null — A singular (sonli jihatdan)
 */
export function luSolve(A, B) {
  const n = A.length, q = B[0] ? B[0].length : 0;
  const a = A.map(r => r.slice()), b = B.map(r => r.slice());
  let scale = 0;
  for (const r of a) for (const v of r) scale = Math.max(scale, Math.abs(v));
  if (!(scale > 0) || !isFinite(scale)) return null;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (!(Math.abs(a[p][c]) > SINGULAR_PIVOT * scale)) return null;
    if (p !== c) { [a[p], a[c]] = [a[c], a[p]]; [b[p], b[c]] = [b[c], b[p]]; }
    for (let r = c + 1; r < n; r++) {
      const f = a[r][c] / a[c][c];
      if (f === 0) continue;
      for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
      for (let k = 0; k < q; k++) b[r][k] -= f * b[c][k];
    }
  }
  const X = b.map(r => r.slice());
  for (let k = 0; k < q; k++) {
    for (let r = n - 1; r >= 0; r--) {
      let s = b[r][k];
      for (let c = r + 1; c < n; c++) s -= a[r][c] * X[c][k];
      X[r][k] = s / a[r][r];
    }
  }
  return X;
}

/** Tenglama matni → AST (h = 0). "chap = o'ng" → chap − o'ng. */
function equationAst(text, names) {
  const src = String(text === null || text === undefined ? '' : text).trim();
  const i = src.indexOf('=');
  if (i === -1) return parse(src, names);
  const lhs = src.slice(0, i).trim(), rhs = src.slice(i + 1).trim();
  if (rhs.includes('=')) throw new Error('syntax');
  if (rhs === '0') return parse(lhs, names);
  return { k: 'sub', a: parse(lhs, names), b: parse(rhs, names) };
}

/**
 * h(y, x) = 0 ni Nyuton usuli bilan yechish. Ref: JCGM 102:2011 §6.3.1.2 (Eq. (7), Note).
 * @param {{h:Function[], dY:Function[][]}} sys  kompilyatsiya qilingan tenglamalar va ∂h_ℓ/∂Y_j
 * @param {object} env     kirish baholari { X_i: x_i } (noma'lumlar shu obyektga yoziladi)
 * @param {string[]} names noma'lumlar nomlari
 * @param {number[]} start y⁽⁰⁾
 * @returns {{y:number[], iterations:number, residual:number, criterion:'step'|'stagnation', lastStep:number}|{error:string, detail?:string}}
 */
export function newtonSolve(sys, env, names, start, opts = {}) {
  const tol = opts.tol > 0 ? opts.tol : IMPLICIT_DEFAULTS.tol;
  const maxIter = opts.maxIter > 0 ? Math.floor(opts.maxIter) : IMPLICIT_DEFAULTS.maxIter;
  const m = names.length;
  const y = start.slice();
  const e = { ...env };
  const put = () => names.forEach((n, j) => { e[n] = y[j]; });
  const resid = () => sys.h.map(f => f(e));
  let prevRel = Infinity;
  for (let it = 1; it <= maxIter; it++) {
    put();
    const h = resid();
    if (!h.every(isFinite)) return { error: 'implicit_no_convergence', detail: String(it - 1) };
    const J = sys.dY.map(row => row.map(f => f(e)));
    if (!J.every(row => row.every(isFinite))) return { error: 'implicit_no_convergence', detail: String(it - 1) };
    const d = luSolve(J, h.map(v => [-v]));
    if (!d) return { error: 'implicit_singular', detail: names.join(', ') };
    let done = true, rel = 0;
    for (let j = 0; j < m; j++) {
      y[j] += d[j][0];
      const s = Math.max(Math.abs(y[j]), Math.abs(start[j]));
      const q = s > 0 ? Math.abs(d[j][0]) / s : (d[j][0] === 0 ? 0 : Infinity);
      if (!(q <= tol)) done = false;
      rel = Math.max(rel, q);
    }
    if (!y.every(isFinite)) return { error: 'implicit_no_convergence', detail: String(it) };
    const stalled = !done && it > 1 && rel >= prevRel && rel <= IMPLICIT_DEFAULTS.stagnationTol;
    if (done || stalled) {
      put();
      return { y, iterations: it, residual: Math.max(...resid().map(Math.abs)), criterion: done ? 'step' : 'stagnation', lastStep: rel };
    }
    prevRel = rel;
  }
  return { error: 'implicit_no_convergence', detail: String(maxIter) };
}

/** Sonni formula matniga (aniq, yaxlitlashsiz): String(v) double'ni to'liq tiklaydi; manfiy son qavsda. */
const lit = v => `(${String(v)})`;

/**
 * @param {object} state        normallashtirilgan holat (calc-state/v2 + implicit)
 * @param {(state:object)=>object} evalSingle  bir o'lchamli baholash (evaluate) — siklik importdan qochish uchun uzatiladi
 * @returns {object} natija: m = 1 — bir o'lchamli (GUM) natija; m > 1 — mode: 'MULTIVARIATE'; ikkalasida `implicit` maydoni
 */
export function evaluateImplicit(state, evalSingle) {
  const params = state.params || [];
  const imp = state.implicit;
  const unknowns = Array.isArray(imp.unknowns) ? imp.unknowns : [];
  const m = unknowns.length, N = params.length;
  const names = unknowns.map(u => String((u && u.name) || '').trim());
  if (!m || imp.equations.length !== m || !N) return { error: 'implicit_bad_spec', detail: `${imp.equations.length} / ${m}` };
  for (let j = 0; j < m; j++) {
    if (!names[j]) return { error: 'implicit_bad_spec', detail: String(j + 1) };
    if (params.includes(names[j]) || names.indexOf(names[j]) !== j) return { error: 'implicit_name_clash', detail: names[j] };
  }
  const start = unknowns.map(u => (u.start === '' || u.start === null || u.start === undefined ? NaN : Number(String(u.start).replace(',', '.'))));
  const badStart = start.findIndex(v => !isFinite(v));
  if (badStart >= 0) return { error: 'implicit_bad_start', detail: names[badStart] };

  // Tenglamalar va hosilalar (simvolik). Ref: JCGM 102:2011 §6.3.1.3 — C_y: ∂h_ℓ/∂Y_j, C_x: ∂h_ℓ/∂X_i
  const all = [...params, ...names];
  let asts;
  try { asts = imp.equations.map(t => equationAst(t, all)); }
  catch (err) { return { error: 'implicit_bad_equation', detail: String(err.message || '').replace(/^unknown:/, '') }; }
  let sys, dX;
  try {
    sys = { h: asts.map(compileAst), dY: asts.map(a => names.map(n => compileAst(derivative(a, n)))) };
    dX = asts.map(a => params.map(p => compileAst(derivative(a, p))));
  } catch (err) { return { error: 'implicit_bad_equation', detail: String(err.message || '') }; }

  // Kirish baholari x_i, u(x_i), u(x_i, x_j) — mavjud bir o'lchamli yo'ldan (A / B tur, korrelyatsiya o'zgarmagan)
  const clean = { ...state };
  delete clean.implicit; delete clean.outputs; delete clean.units;
  const shared = { ...(state.settings || {}) };
  for (const k of OUTPUT_SETTINGS) delete shared[k];
  const base = evalSingle({ ...clean, model: { formula: params[0], unit: '' }, settings: shared });
  if (base.error) return base;
  const env = {};
  base.inputs.forEach(i => { env[i.name] = i.mean; });

  const sol = newtonSolve(sys, env, names, start, { tol: Number(imp.tol), maxIter: Number(imp.maxIter) });
  if (sol.error) return sol;
  const at = { ...env };
  names.forEach((n, j) => { at[n] = sol.y[j]; });
  const Cy = sys.dY.map(row => row.map(f => f(at)));
  const Cx = dX.map(row => row.map(f => f(at)));
  if (![...Cy, ...Cx].every(row => row.every(isFinite))) return { error: 'implicit_bad_equation', detail: 'derivative' };
  // Ref: JCGM 102:2011 Eq. (10) — C = C_y⁻¹ C_x; C_y·C = C_x sistemasi sifatida yechiladi. Singular C_y — §6.3.1.3 Note 1
  const Csol = luSolve(Cy, Cx);
  if (!Csol) return { error: 'implicit_singular', detail: names.join(', ') };
  // dY = −C_y⁻¹ C_x dX (oshkormas funksiya teoremasi, §6.3.1.3 Note 2): sezgirlik koeffitsiyentlari c_ji = −C_ji
  const c = Csol.map(row => row.map(v => (v === 0 ? 0 : -v)));

  // Lokal chiziqli ekvivalent model: Y_j = y_j + Σ c_ji·(X_i − x_i) — x da qiymati aynan y_j, hosilalari aynan c_ji
  const formulas = c.map((row, j) => `${names[j]} = ${lit(sol.y[j])}${row.map((v, i) => (v === 0 ? '' : ` + ${lit(v)}*(${params[i]} - ${lit(env[params[i]])})`)).join('')}`);
  const info = {
    equations: imp.equations.map(t => String(t).trim()), unknowns: names, start, y: sol.y.slice(),
    iterations: sol.iterations, residual: sol.residual, criterion: sol.criterion, lastStep: sol.lastStep,
    tol: Number(imp.tol) > 0 ? Number(imp.tol) : IMPLICIT_DEFAULTS.tol, maxIter: Number(imp.maxIter) > 0 ? Math.floor(Number(imp.maxIter)) : IMPLICIT_DEFAULTS.maxIter,
    Cy, Cx, sensitivity: c,
  };
  const eqText = j => `${info.equations[j]}${info.equations[j].includes('=') ? '' : ' = 0'}`;
  const patch = (r, j) => {
    r.symbol = names[j]; r.formulaText = eqText(j); r.unit = unknowns[j].unit || '';
    if (r.outputs && r.outputs[0]) { r.outputs[0].symbol = names[j]; r.outputs[0].formula = eqText(j); r.outputs[0].unit = r.unit; }
    r.secondOrder = null;                                  // chiziqli ekvivalentning 2-tartibli hadlari nol — diagnostika emas
    r.verify = null;
    r.notes = [{ code: 'implicit_model' }];
    r.units = { checked: false, output: null };
    return r;
  };

  if (m === 1) {
    const u = unknowns[0];
    const r = evalSingle({ ...clean, model: { formula: formulas[0], unit: u.unit || '' }, settings: { ...(state.settings || {}), ...(u.settings || {}) } });
    if (r.error) return r;
    patch(r, 0);
    r.implicit = info;
    return r;
  }
  const mv = evaluateMultivariate({ ...clean, settings: state.settings || {},
    outputs: formulas.map((f, j) => ({ formula: f, name: names[j], unit: unknowns[j].unit || '', ...(unknowns[j].settings ? { settings: unknowns[j].settings } : {}) })) }, evalSingle);
  if (mv.error) return mv;
  mv.results.forEach((r, j) => patch(r, j));
  mv.outputs.forEach((o, j) => { o.formula = eqText(j); o.unit = unknowns[j].unit || ''; });
  mv.notes = [{ code: 'implicit_model' }];
  mv.implicit = info;
  return mv;
}
