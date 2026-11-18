/* ═══════════════════════════════════════════════════════════════
   LAB/WESTGARD.JS — Westgard ko'p qoidali nazorat (P11): 1₃s, 2₂s, R₄s, 4₁s, 10ₓ. Sof modul.
   Har bir qoida — alohida funksiya: z-ballar qatori (z = (x − m)/s, vaqt tartibida) → buzilgan nuqtalar indekslari.

   Ref: Westgard J.O., Barry P.L., Hunt M.R., Groth T. "A multi-rule Shewhart chart for quality control in clinical
        chemistry", Clin. Chem. 27 (1981) 493–501 — (unverified: nashr repoda yo'q; ta'riflar umumiy ma'lum shaklda,
        asl matn bilan solishtirilmagan). Egasi manbani qo'shgach tekshiriladi.
   Qoidalar (bitta nazorat materiali, ketma-ket o'lchashlar):
     1₃s — bitta natija m ± 3s dan tashqarida (|z| > 3);
     2₂s — ketma-ket 2 natija bir tomonda m ± 2s dan tashqarida (ikkalasi z > 2 yoki ikkalasi z < −2);
     R₄s — bir natija m + 2s dan yuqori, ikkinchisi m − 2s dan past (ko'lam 4s dan oshgan);
     4₁s — ketma-ket 4 natija bir tomonda m ± 1s dan tashqarida;
     10ₓ — ketma-ket 10 natija o'rtachaning bir tomonida.
   Loyiha qarorlari (egasi tasdiqladi 2026-11-18 — docs/RISKS.md R-25):
     • chegaralar QAT'IY tengsizlik bilan (aynan 2s yoki 3s dagi nuqta buzilish emas);
     • R₄s: `runs` (har bir nuqtaning seriya belgisi) berilsa — faqat BIR SERIYA ichidagi natijalar orasida; berilmasa —
       ketma-ket ikki natija orasida — bu LOYIHA YAQINLASHUVI: natijada `approximation: true`, UI va hujjatda belgilanadi;
     • 10ₓ: aynan o'rtachadagi nuqta (z = 0) ketma-ketlikni uzadi;
     • 1₂s alohida qoida sifatida berilmaydi — u ±2s ogohlantirish chegarasi (kartada chiziladi).
   Qoida buzilganda dastur natijani O'CHIRMAYDI va o'zgartirmaydi — faqat belgilaydi.
═══════════════════════════════════════════════════════════════ */

export const WESTGARD_RULES = Object.freeze(['1_3s', '2_2s', 'R_4s', '4_1s', '10_x']);
/** 1₃s, 2₂s, R₄s — rad etish; 4₁s, 10ₓ — sistematik siljish belgisi (ham rad etish qoidalari, lekin tabiati boshqa). */
export const WESTGARD_KIND = Object.freeze({ '1_3s': 'random_or_systematic', '2_2s': 'systematic', 'R_4s': 'random', '4_1s': 'systematic', '10_x': 'systematic' });

const ok = z => typeof z === 'number' && Number.isFinite(z);

/** Ketma-ket `len` ta nuqta `pred(z)` ni bir xil ishora bilan qanoatlantirsa — o'sha oynalardagi barcha indekslar. */
function sameSideRun(z, len, limit) {
  const hit = new Set();
  let side = 0, count = 0;
  for (let i = 0; i < z.length; i++) {
    const s = ok(z[i]) ? (z[i] > limit ? 1 : z[i] < -limit ? -1 : 0) : 0;
    if (s !== 0 && s === side) count++; else { side = s; count = s === 0 ? 0 : 1; }
    if (count >= len) for (let j = i - len + 1; j <= i; j++) hit.add(j);
  }
  return [...hit].sort((a, b) => a - b);
}

/** 1₃s: |z| > 3. */
export function rule13s(z) { return (z || []).map((v, i) => (ok(v) && Math.abs(v) > 3 ? i : -1)).filter(i => i >= 0); }

/** 2₂s: ketma-ket 2 nuqta bir tomonda |z| > 2. */
export function rule22s(z) { return sameSideRun(z || [], 2, 2); }

/** R₄s: bir nuqta z > 2, boshqasi z < −2 — bir seriya ichida (`runs`) yoki ketma-ket juftlikda. */
export function ruleR4s(z, runs) {
  const v = z || [];
  const hit = new Set();
  if (Array.isArray(runs) && runs.length === v.length) {
    const by = new Map();
    v.forEach((x, i) => { if (ok(x)) { const k = String(runs[i]); if (!by.has(k)) by.set(k, []); by.get(k).push(i); } });
    for (const idx of by.values()) {
      const hi = idx.filter(i => v[i] > 2), lo = idx.filter(i => v[i] < -2);
      if (hi.length && lo.length) [...hi, ...lo].forEach(i => hit.add(i));
    }
  } else {
    for (let i = 1; i < v.length; i++) {
      if (ok(v[i]) && ok(v[i - 1]) && ((v[i] > 2 && v[i - 1] < -2) || (v[i] < -2 && v[i - 1] > 2))) { hit.add(i - 1); hit.add(i); }
    }
  }
  return [...hit].sort((a, b) => a - b);
}

/** 4₁s: ketma-ket 4 nuqta bir tomonda |z| > 1. */
export function rule41s(z) { return sameSideRun(z || [], 4, 1); }

/** 10ₓ: ketma-ket 10 nuqta o'rtachaning bir tomonida. */
export function rule10x(z) { return sameSideRun(z || [], 10, 0); }

const usesRuns = (z, runs) => Array.isArray(runs) && runs.length === (z || []).length;

export const WESTGARD_FUNCTIONS = Object.freeze({ '1_3s': rule13s, '2_2s': rule22s, 'R_4s': ruleR4s, '4_1s': rule41s, '10_x': rule10x });

/**
 * Barcha (yoki tanlangan) qoidalar.
 * @param {number[]} z       z-ballar (vaqt tartibida)
 * @param {{rules?:string[], runs?:any[]}} [opts]
 * @returns {{violations:{rule:string, indices:number[], approximation?:boolean}[], flagged:Object<number,string[]>, inControl:boolean}}
 */
export function westgard(z, opts = {}) {
  const rules = (opts.rules || WESTGARD_RULES).filter(r => WESTGARD_RULES.includes(r));
  const violations = [], flagged = {};
  for (const r of rules) {
    const indices = r === 'R_4s' ? ruleR4s(z, opts.runs) : WESTGARD_FUNCTIONS[r](z);
    if (!indices.length) continue;
    // R₄s seriya belgisisiz ketma-ket juftlikka qo'llangan — LOYIHA YAQINLASHUVI (asl qoida bir seriya ichida);
    // topilmada shunday belgilanadi (egasi qarori 2026-11-18).
    const approx = r === 'R_4s' && !usesRuns(z, opts.runs);
    violations.push({ rule: r, indices, ...(approx ? { approximation: true } : {}) });
    indices.forEach(i => { (flagged[i] = flagged[i] || []).push(r); });
  }
  return { violations, flagged, inControl: violations.length === 0 };
}
