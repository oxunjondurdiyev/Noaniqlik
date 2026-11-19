/* ═══════════════════════════════════════════════════════════════
   MULTIVARIATE/LINALG.JS — kichik zich matritsalar uchun yordamchilar (P07). Sof modul.
   Matritsa — qatorlar massivi (number[][]).
═══════════════════════════════════════════════════════════════ */

export const zeros = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));
export const transpose = A => (A.length ? A[0].map((_, j) => A.map(row => row[j])) : []);

export function matMul(A, B) {
  const r = A.length, n = B.length, c = n ? B[0].length : 0;
  const out = zeros(r, c);
  for (let i = 0; i < r; i++) {
    for (let j = 0; j < c; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += A[i][k] * B[k][j];
      out[i][j] = s;
    }
  }
  return out;
}

/** C·U·Cᵀ — natija aniq simmetrik qilib qaytariladi. Ref: JCGM 102:2011 §6.2.1.3, Eq. (3) */
export function sandwich(C, U) {
  const M = matMul(matMul(C, U), transpose(C));
  for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) { const v = (M[i][j] + M[j][i]) / 2; M[i][j] = v; M[j][i] = v; }
  return M;
}

/**
 * Qat'iy musbat aniqlangan matritsaning quyi uchburchak Cholesky ko'paytuvchisi: U = L·Lᵀ.
 * Ref: JCGM 102:2011 §7.7.2 a) (U_y = LLᵀ), §5.3.2.4. Musbat aniqlanmagan (yoki sonli jihatdan singular) bo'lsa — null.
 */
export function choleskyLower(U) {
  const n = U.length, L = zeros(n, n);
  for (let j = 0; j < n; j++) {
    let d = U[j][j];
    for (let k = 0; k < j; k++) d -= L[j][k] * L[j][k];
    if (!(d > 1e-12 * Math.abs(U[j][j])) || !isFinite(d)) return null;
    const ljj = Math.sqrt(d);
    L[j][j] = ljj;
    for (let i = j + 1; i < n; i++) {
      let s = U[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      L[i][j] = s / ljj;
    }
  }
  return L;
}

/** L·x = b ni yechish (L — quyi uchburchak); out ga yoziladi */
export function solveLower(L, b, out) {
  const n = L.length;
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * out[k];
    out[i] = s / L[i][i];
  }
  return out;
}

/**
 * Simmetrik matritsaning xos qiymatlari va xos vektorlari — siklik Jacobi usuli (kichik m uchun).
 * @returns {{values:number[], vectors:number[][]}}  values kamayish tartibida; vectors[k] — k-chi xos vektor
 */
export function symEigen(A) {
  const n = A.length;
  const a = A.map(r => r.slice());
  const V = zeros(n, n);
  for (let i = 0; i < n; i++) V[i][i] = 1;
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
  }
  const order = a.map((_, i) => i).sort((i, j) => a[j][j] - a[i][i]);
  return { values: order.map(i => a[i][i]), vectors: order.map(i => V.map(row => row[i])) };
}

/** Kovariatsiya matritsasi → korrelyatsiya matritsasi R_y (U_y = D_y R_y D_y). Ref: JCGM 102:2011 §3.21 Note 3, §7.8.2.4 */
export function correlationMatrix(U) {
  const n = U.length, R = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const d = Math.sqrt(U[i][i] * U[j][j]);
      R[i][j] = i === j ? 1 : (d > 0 ? U[i][j] / d : 0);
    }
  }
  return R;
}

/**
 * Qisman tanlovli LU: P·A = L·W (L — birlik diagonalli quyi uchburchak, W — yuqori uchburchak), ya'ni A = Pᵀ·L·W.
 * perm[i] — P·A ning i-qatori A ning qaysi qatori ekani. Ref: JCGM 102:2011 Annex B, B.1 c) (C_y = L_y W_y; L_y = Pᵀ·L).
 * @param {number[][]} A  n × n
 * @param {number} [pivotRatio]  bosh element shu nisbatdan (max |a_ij| ga) kichik bo'lsa — singular (null)
 * @returns {{L:number[][], W:number[][], perm:number[]}|null}
 */
export function luFactor(A, pivotRatio = 0) {
  const n = A.length;
  const a = A.map(r => r.slice());
  const perm = a.map((_, i) => i);
  let scale = 0;
  for (const r of a) for (const v of r) scale = Math.max(scale, Math.abs(v));
  if (!(scale > 0) || !isFinite(scale)) return null;
  const L = zeros(n, n);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (!(Math.abs(a[p][c]) > pivotRatio * scale)) return null;
    if (p !== c) { [a[p], a[c]] = [a[c], a[p]]; [L[p], L[c]] = [L[c], L[p]]; [perm[p], perm[c]] = [perm[c], perm[p]]; }
    L[c][c] = 1;
    for (let r = c + 1; r < n; r++) {
      const f = a[r][c] / a[c][c];
      L[r][c] = f;
      if (f === 0) continue;
      for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
      a[r][c] = 0;
    }
  }
  return { L, W: a, perm };
}

/**
 * Householder QR: A = Q·R, A — r × c; Q — r × r ortogonal, R — r × c yuqori uchburchak (trapetsiya).
 * Ref: JCGM 102:2011 Annex B, B.1 b) (C_x = Q_x W_x), i) ("orthogonally triangularize M").
 * @returns {{Q:number[][], R:number[][]}}
 */
export function qrHouseholder(A) {
  const r = A.length, c = r ? A[0].length : 0;
  const R = A.map(row => row.slice());
  const Q = zeros(r, r);
  for (let i = 0; i < r; i++) Q[i][i] = 1;
  const steps = Math.min(r - 1, c);
  for (let k = 0; k < steps; k++) {
    let norm = 0;
    for (let i = k; i < r; i++) norm = Math.hypot(norm, R[i][k]);
    if (norm === 0) continue;
    const alpha = R[k][k] > 0 ? -norm : norm;
    const v = new Array(r).fill(0);
    v[k] = R[k][k] - alpha;
    for (let i = k + 1; i < r; i++) v[i] = R[i][k];
    let vv = 0;
    for (let i = k; i < r; i++) vv += v[i] * v[i];
    if (vv === 0) continue;
    for (let j = k; j < c; j++) {            // R ← H·R,  H = I − 2·v·vᵀ / (vᵀv)
      let s = 0;
      for (let i = k; i < r; i++) s += v[i] * R[i][j];
      const f = 2 * s / vv;
      for (let i = k; i < r; i++) R[i][j] -= f * v[i];
    }
    for (let i = 0; i < r; i++) {            // Q ← Q·H
      let s = 0;
      for (let j = k; j < r; j++) s += Q[i][j] * v[j];
      const f = 2 * s / vv;
      for (let j = k; j < r; j++) Q[i][j] -= f * v[j];
    }
    R[k][k] = alpha;
    for (let i = k + 1; i < r; i++) R[i][k] = 0;
  }
  return { Q, R };
}

/** Matritsaning 1-normasi (ustunlar bo'yicha modullar yig'indisining eng kattasi). */
export function norm1(A) {
  let best = 0;
  const c = A.length ? A[0].length : 0;
  for (let j = 0; j < c; j++) { let s = 0; for (let i = 0; i < A.length; i++) s += Math.abs(A[i][j]); best = Math.max(best, s); }
  return best;
}
