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
