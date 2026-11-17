/* ═══════════════════════════════════════════════════════════════
   REGRESSION/LINALG.JS — kichik zich matritsalar uchun chiziqli algebra
   (Cholesky, uchburchak tizimlar, Householder QR bilan eng kichik kvadratlar).
   Sof modul: brauzer obyektlariga bog'liq emas.
═══════════════════════════════════════════════════════════════ */

/** Simmetrik musbat aniqlangan V = L·Lᵀ. Musbat aniqlanmagan bo'lsa — null.
    Ref: Golub & Van Loan, Matrix Computations (4th ed.) Alg. 4.2.1 */
export function cholesky(V) {
  const n = V.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = V[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (!(s > 0) || !isFinite(s)) return null;
        L[i][i] = Math.sqrt(s);
      } else {
        L[i][j] = s / L[j][j];
      }
    }
  }
  return L;
}

/** L·z = b (L — quyi uchburchak) */
export function forwardSolve(L, b) {
  const n = L.length, z = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * z[k];
    z[i] = s / L[i][i];
  }
  return z;
}

/**
 * min ‖A·p − y‖₂ — Householder QR (normal tenglamalarsiz, shartlanganlik κ(A), κ² emas).
 * Ustunlar avval o'z normasiga bo'linadi (1, x, x², x³ masshtablari har xil).
 * Ref: Golub & Van Loan, Matrix Computations (4th ed.) §5.2.1 (Householder QR), §5.3.2 (LS).
 * @returns {{p:number[], cov:number[][]}|{singular:true}}  cov = (AᵀA)⁻¹
 */
export function leastSquares(A, y) {
  const m = A.length, n = A[0].length;
  const scale = new Array(n);
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < m; i++) s += A[i][j] * A[i][j];
    scale[j] = Math.sqrt(s);
    if (!(scale[j] > 0) || !isFinite(scale[j])) return { singular: true };
  }
  const R = A.map(row => row.map((v, j) => v / scale[j]));
  const q = y.slice();
  for (let j = 0; j < n; j++) {
    let norm = 0;
    for (let i = j; i < m; i++) norm += R[i][j] * R[i][j];
    norm = Math.sqrt(norm);
    // Ustunlar birlik normaga keltirilgan: qoldiq norma ≈ 0 → ustun oldingilariga chiziqli bog'liq
    if (!(norm > 1e-10)) return { singular: true };
    const alpha = R[j][j] > 0 ? -norm : norm;
    const v = new Array(m - j);
    for (let i = j; i < m; i++) v[i - j] = R[i][j];
    v[0] -= alpha;
    let vv = 0;
    for (let i = 0; i < v.length; i++) vv += v[i] * v[i];
    if (vv > 0) {
      for (let c = j; c < n; c++) {
        let dot = 0;
        for (let i = j; i < m; i++) dot += v[i - j] * R[i][c];
        const f = 2 * dot / vv;
        for (let i = j; i < m; i++) R[i][c] -= f * v[i - j];
      }
      let dot = 0;
      for (let i = j; i < m; i++) dot += v[i - j] * q[i];
      const f = 2 * dot / vv;
      for (let i = j; i < m; i++) q[i] -= f * v[i - j];
    }
  }
  // R·p' = Qᵀy (yuqori n satr)
  const ps = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = q[i];
    for (let k = i + 1; k < n; k++) s -= R[i][k] * ps[k];
    ps[i] = s / R[i][i];
  }
  // R⁻¹ (yuqori uchburchak), (AᵀA)⁻¹ = R⁻¹·R⁻ᵀ
  const Ri = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let c = 0; c < n; c++) {
    for (let i = c; i >= 0; i--) {
      let s = i === c ? 1 : 0;
      for (let k = i + 1; k <= c; k++) s -= R[i][k] * Ri[k][c];
      Ri[i][c] = s / R[i][i];
    }
  }
  const cov = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = 0;
      for (let k = j; k < n; k++) s += Ri[i][k] * Ri[j][k];
      cov[i][j] = cov[j][i] = s / (scale[i] * scale[j]);
    }
  }
  return { p: ps.map((v, j) => v / scale[j]), cov };
}
