/* ═══════════════════════════════════════════════════════════════
   LAB/WESTGARD.JS — Westgard ko'p qoidali nazorat (P11): 1₃s, 2₂s, R₄s, 4₁s, 10ₓ. Sof modul.
   Har bir qoida — alohida funksiya: z-ballar qatori (z = (x − m)/s, vaqt tartibida) → buzilgan nuqtalar indekslari.

   Ref: Westgard J.O., Barry P.L., Hunt M.R., Groth T. "A multi-rule Shewhart chart for quality control in clinical
        chemistry", Clin. Chem. 27 (1981) 493–501 — egasi nusxasi bilan solishtirilgan (2026-11-19); PDF © AACC, repoda
        faqat qaydnoma: docs/references/westgard-1981-NOTES.md (qoidalar — 494-bet; protsedura — 495–496-betlar, 1-rasm).
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
   1₂s DARVOZASI (Ref: Westgard 1981, 495–496-betlar, 1-rasm, "Control Procedure" 2-band; egasi qarori 2026-11-19, W-4):
     standart `gate: true` — seriyada ±2s dan oshgan kuzatuv bo'lmasa, seriya qabul qilinadi va unda tugaydigan
     qoida oynalari rad etish sifatida olinmaydi (natijada `suppressed` — ko'rsatish uchun). Amalda faqat 4₁s va 10ₓ ga
     ta'sir qiladi (1₃s, 2₂s, R₄s oynasi doim ±2s dan oshgan nuqta bilan tugaydi). `gate: false` — laboratoriya sozlamasi
     (`westgardGate`), qoidalar mustaqil tekshiriladi; natijada `gate: false` — hisobotda belgilanadi.
   Bir nechta nazorat materiali — `westgardMulti` (W-5): pastda.
   Qoida buzilganda dastur natijani O'CHIRMAYDI va o'zgartirmaydi — faqat belgilaydi.
═══════════════════════════════════════════════════════════════ */

export const WESTGARD_RULES = Object.freeze(['1_3s', '2_2s', 'R_4s', '4_1s', '10_x']);
/** 1₃s, 2₂s, R₄s — rad etish; 4₁s, 10ₓ — sistematik siljish belgisi (ham rad etish qoidalari, lekin tabiati boshqa). */
export const WESTGARD_KIND = Object.freeze({ '1_3s': 'random_or_systematic', '2_2s': 'systematic', 'R_4s': 'random', '4_1s': 'systematic', '10_x': 'systematic' });

const ok = z => typeof z === 'number' && Number.isFinite(z);

/** Ketma-ket `len` ta nuqta bir xil ishora bilan |z| > limit bo'lgan barcha oynalar (indekslar massivi). */
function sameSideWindows(z, len, limit) {
  const out = [];
  let side = 0, count = 0;
  for (let i = 0; i < z.length; i++) {
    const s = ok(z[i]) ? (z[i] > limit ? 1 : z[i] < -limit ? -1 : 0) : 0;
    if (s !== 0 && s === side) count++; else { side = s; count = s === 0 ? 0 : 1; }
    if (count >= len) out.push(Array.from({ length: len }, (_, k) => i - len + 1 + k));
  }
  return out;
}
const union = ws => [...new Set(ws.flat())].sort((a, b) => a - b);

const w13s = z => (z || []).map((v, i) => (ok(v) && Math.abs(v) > 3 ? [i] : null)).filter(Boolean);
const w22s = z => sameSideWindows(z || [], 2, 2);
function wR4s(z, runs) {
  const v = z || [];
  const out = [];
  if (Array.isArray(runs) && runs.length === v.length) {
    const by = new Map();
    v.forEach((x, i) => { if (ok(x)) { const k = String(runs[i]); if (!by.has(k)) by.set(k, []); by.get(k).push(i); } });
    for (const idx of by.values()) {
      const hi = idx.filter(i => v[i] > 2), lo = idx.filter(i => v[i] < -2);
      if (hi.length && lo.length) out.push([...hi, ...lo].sort((a, b) => a - b));
    }
  } else {
    for (let i = 1; i < v.length; i++) {
      if (ok(v[i]) && ok(v[i - 1]) && ((v[i] > 2 && v[i - 1] < -2) || (v[i] < -2 && v[i - 1] > 2))) out.push([i - 1, i]);
    }
  }
  return out;
}
const w41s = z => sameSideWindows(z || [], 4, 1);
const w10x = z => sameSideWindows(z || [], 10, 0);

/** 1₃s: |z| > 3. */
export function rule13s(z) { return union(w13s(z)); }

/** 2₂s: ketma-ket 2 nuqta bir tomonda |z| > 2. */
export function rule22s(z) { return union(w22s(z)); }

/** R₄s: bir nuqta z > 2, boshqasi z < −2 — bir seriya ichida (`runs`) yoki ketma-ket juftlikda. */
export function ruleR4s(z, runs) { return union(wR4s(z, runs)); }

/** 4₁s: ketma-ket 4 nuqta bir tomonda |z| > 1. */
export function rule41s(z) { return union(w41s(z)); }

/** 10ₓ: ketma-ket 10 nuqta o'rtachaning bir tomonida. */
export function rule10x(z) { return union(w10x(z)); }

const WINDOWS = { '1_3s': w13s, '2_2s': w22s, 'R_4s': wR4s, '4_1s': w41s, '10_x': w10x };

/**
 * Seriya kalitlari: `runs` hamma nuqtada berilsa — belgi bo'yicha; aks holda har bir nuqta — alohida seriya.
 * 1₂s darvozasi: seriyada |z| > 2 bo'lgan kuzatuv bormi (Ref: Westgard 1981, 495-bet, 1-rasm).
 */
function runKeys(n, runs) {
  return Array.isArray(runs) && runs.length === n ? runs.map(r => 'r:' + String(r)) : Array.from({ length: n }, (_, i) => 'i:' + i);
}
function triggeredRuns(z, keys) {
  const t = new Set();
  z.forEach((v, i) => { if (ok(v) && Math.abs(v) > 2) t.add(keys[i]); });
  return t;
}

const usesRuns = (z, runs) => Array.isArray(runs) && runs.length === (z || []).length;

export const WESTGARD_FUNCTIONS = Object.freeze({ '1_3s': rule13s, '2_2s': rule22s, 'R_4s': ruleR4s, '4_1s': rule41s, '10_x': rule10x });

/**
 * Barcha (yoki tanlangan) qoidalar, bitta nazorat materiali.
 * @param {number[]} z       z-ballar (vaqt tartibida)
 * @param {{rules?:string[], runs?:any[], gate?:boolean}} [opts]  gate — 1₂s darvozasi (standart true)
 * @returns {{violations:{rule:string, indices:number[], approximation?:boolean}[], flagged:Object<number,string[]>,
 *            inControl:boolean, gate:boolean, suppressed:{rule:string, indices:number[]}[]}}
 */
export function westgard(z, opts = {}) {
  const v = z || [];
  const rules = (opts.rules || WESTGARD_RULES).filter(r => WESTGARD_RULES.includes(r));
  const gate = opts.gate !== false;
  const keys = runKeys(v.length, opts.runs);
  const trig = triggeredRuns(v, keys);
  const violations = [], suppressed = [], flagged = {};
  for (const r of rules) {
    const wins = r === 'R_4s' ? wR4s(v, opts.runs) : WINDOWS[r](v);
    // Ref: Westgard 1981, 495-bet, 1-rasm — oyna tugaydigan seriyada 1₂s ishlamagan bo'lsa, seriya qabul qilinadi.
    const kept = gate ? wins.filter(w => trig.has(keys[w[w.length - 1]])) : wins;
    const dropped = gate ? wins.filter(w => !trig.has(keys[w[w.length - 1]])) : [];
    if (dropped.length) {
      const keptSet = new Set(kept.flat());
      const idx = union(dropped).filter(i => !keptSet.has(i));
      if (idx.length) suppressed.push({ rule: r, indices: idx });
    }
    const indices = union(kept);
    if (!indices.length) continue;
    // R₄s seriya belgisisiz ketma-ket juftlikka qo'llangan — LOYIHA YAQINLASHUVI (asl qoida bir seriya ichida);
    // topilmada shunday belgilanadi (egasi qarori 2026-11-18).
    const approx = r === 'R_4s' && !usesRuns(v, opts.runs);
    violations.push({ rule: r, indices, ...(approx ? { approximation: true } : {}) });
    indices.forEach(i => { (flagged[i] = flagged[i] || []).push(r); });
  }
  return { violations, flagged, inControl: violations.length === 0, gate, suppressed };
}

/**
 * Bir nechta nazorat materiali (W-5; egasi qarori 2026-11-19).
 * Ref: Westgard 1981, 494-bet (qoidalar "across" / "within" materiallar), 496-bet ("Control Procedure" 3–4-bandlar).
 *   • seriya belgisi (`runs`) har bir materialda MAJBURIY — aks holda xato `qc_multi_runs_required`;
 *   • seriyalar tartibi — belgining birinchi uchrash tartibi (avval 1-material, keyin keyingilari);
 *   • yig'ma ketma-ketlik: seriya tartibida, seriya ichida material tartibida;
 *   • 1₃s — har qaysi kuzatuv; 2₂s — (a) bir seriyada ikki turli materialning bir tomonda > 2s kuzatuvi,
 *     (b) bir materialda ketma-ket ikki kuzatuv; R₄s — bir seriya ichida (materiallar bo'ylab);
 *     4₁s va 10ₓ — yig'ma ketma-ketlikda (materiallar bo'ylab) VA har bir materialning o'zida;
 *   • uch va undan ortiq materialda 4₁s / 10ₓ yig'ma oynasi seriya chegarasiga to'g'ri kelmasligi mumkin —
 *     LOYIHA UMUMLASHMASI (maqola ikki material uchun yozilgan); natijada `generalized: true`.
 * Indekslar `{material, index}` juftligi; `flagged` kaliti — "m:i".
 * @param {{z:number[], runs:any[]}[]} materials
 * @param {{rules?:string[], gate?:boolean}} [opts]
 */
export function westgardMulti(materials, opts = {}) {
  const mats = Array.isArray(materials) ? materials : [];
  if (!mats.length) return { error: 'qc_need_data' };
  if (mats.some(m => !m || !Array.isArray(m.z) || !Array.isArray(m.runs) || m.runs.length !== m.z.length || m.runs.some(r => r === '' || r == null))) {
    return { error: 'qc_multi_runs_required' };
  }
  const rules = (opts.rules || WESTGARD_RULES).filter(r => WESTGARD_RULES.includes(r));
  const gate = opts.gate !== false;
  // seriyalar tartibi
  const order = [];
  const pos = new Map();
  mats.forEach(m => m.runs.forEach(r => { const k = String(r); if (!pos.has(k)) { pos.set(k, order.length); order.push(k); } }));
  // yig'ma ketma-ketlik
  const seq = [];
  order.forEach(k => mats.forEach((m, mi) => m.runs.forEach((r, i) => { if (String(r) === k) seq.push({ m: mi, i, z: m.z[i], run: k }); })));
  const cz = seq.map(o => o.z);
  const crun = seq.map(o => o.run);
  const trig = new Set(seq.filter(o => ok(o.z) && Math.abs(o.z) > 2).map(o => o.run));
  // har bir materialning o'z ketma-ketligi — yig'ma indekslarga xaritalash
  const perMat = mats.map((m, mi) => seq.map((o, ci) => (o.m === mi ? ci : -1)).filter(ci => ci >= 0));
  const mapWins = (wins, idxMap) => wins.map(w => w.map(j => idxMap[j]));
  const perMatWins = fn => perMat.flatMap(idx => mapWins(fn(idx.map(ci => cz[ci])), idx));
  const across22 = () => {
    const out = [];
    for (const k of order) {
      const idx = seq.map((o, ci) => (o.run === k ? ci : -1)).filter(ci => ci >= 0);
      for (const side of [1, -1]) {
        const hit = idx.filter(ci => ok(cz[ci]) && side * cz[ci] > 2);
        if (new Set(hit.map(ci => seq[ci].m)).size >= 2) out.push(hit);
      }
    }
    return out;
  };
  const W = {
    '1_3s': () => w13s(cz),
    '2_2s': () => [...across22(), ...perMatWins(w22s)],
    'R_4s': () => wR4s(cz, crun),
    '4_1s': () => [...w41s(cz), ...perMatWins(w41s)],
    '10_x': () => [...w10x(cz), ...perMatWins(w10x)],
  };
  // oyna "tugaydigan" seriya — oynadagi eng keyingi seriya
  const lastRun = w => order[Math.max(...w.map(ci => pos.get(seq[ci].run)))];
  const ref = ci => ({ material: seq[ci].m, index: seq[ci].i });
  const violations = [], suppressed = [], flagged = {};
  for (const r of rules) {
    const wins = W[r]();
    const kept = gate ? wins.filter(w => trig.has(lastRun(w))) : wins;
    const dropped = gate ? wins.filter(w => !trig.has(lastRun(w))) : [];
    const keptIdx = union(kept);
    if (dropped.length) {
      const ks = new Set(keptIdx);
      const d = union(dropped).filter(ci => !ks.has(ci));
      if (d.length) suppressed.push({ rule: r, indices: d.map(ref) });
    }
    if (!keptIdx.length) continue;
    violations.push({ rule: r, indices: keptIdx.map(ref) });
    keptIdx.forEach(ci => { const key = seq[ci].m + ':' + seq[ci].i; (flagged[key] = flagged[key] || []).push(r); });
  }
  return { violations, flagged, inControl: violations.length === 0, gate, suppressed, runs: order, ...(mats.length > 2 ? { generalized: true } : {}) };
}
