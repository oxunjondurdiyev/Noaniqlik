/* TESTS/CROSSBROWSER/CORE.JS — tests/cases/ misollarini ishga tushirish va natijalarni solishtirishning sof qismi (P13).
   Brauzerda ham, Node'da ham AYNAN shu modul ishlaydi (DOM, fs, tarmoq yo'q) — dvigatel tashqaridan beriladi:
     • tests/cases/lib.js (npm test)            — runCase();
     • scripts/cases-snapshot.js (regressiya)   — snapshotCase(), encode(), diffSnapshots();
     • tests/crossbrowser/ (Playwright, R-24)   — brauzerda snapshotCase(), Node'da diffSnapshots().
   Egasi qarori B (2026-11-19, docs/RISKS.md R-24): turli JS dvigatellarida xom qiymatlarning nisbiy farqi ≤ 1·10⁻¹⁴
   qabul qilinadi; hisobot qatlamida yaxlitlangan y, U, k, interval uchlari AYNAN bir xil bo'lishi shart. */

export const REL_LIMIT = 1e-14;          // egasi qarori B — xom qiymatlar uchun nisbiy farq chegarasi
export const RNG_SAMPLE = 2000;          // R(0, 1) ketma-ketligidan solishtiriladigan qiymatlar soni (har bir urug' uchun)
export const RNG_SEEDS = Object.freeze([1, 20261110, 2147483647]);

/** Bitta misolni dvigatelda ishga tushirish (tests/cases/README.md dagi `run` qoidalari). */
export function runCase(engine, c) {
  const runSpec = c.run || { method: 'evaluate' };
  const fail = r => new Error(`${c.id}: ${r.error} ${r.detail || ''}`);
  if (runSpec.method === 'regression') {
    let spec = c.modelSpec;
    if (runSpec.inverseAtX) {
      // Manba y₀ ni bermagan, faqat x̂₀ ni bergan (QUAM A5: c₀ = 0,26 mg/L): y₀ moslangan chiziqdan tiklanadi
      const f = engine.evaluate(spec);
      if (f.error) return { r: f, runSpec };
      spec = { ...spec, inverse: runSpec.inverseAtX.map(q => ({ ...q, x: undefined, y0: f.params.reduce((s, p, j) => s + p.value * (q.x - f.xRef) ** j, 0) })) };
    }
    const r = engine.evaluate(spec);
    if (r.error) throw fail(r);
    return { r, runSpec };
  }
  if (runSpec.method === 'path') {
    // P10: maxsus rejimlar (uc-sampling/1, uc-qualitative/1, uc-micro/1, uc-medical/1) — kattalik nomi natijadagi yo'l
    const r = engine.evaluate(c.modelSpec);
    if (r.error) throw fail(r);
    return { r, runSpec };
  }
  if (runSpec.method === 'topdown') {
    let r;
    if (runSpec.part === 'bias') {
      // Manba faqat u(bias) ni bergan bo'lim (masalan TR 537 §6.3): bias qismi alohida hisoblanadi
      try { r = { bias: engine.evaluateBias(c.modelSpec.bias, engine.makeContext(c.modelSpec.scale, c.modelSpec.relativeUnit)), warnings: [] }; }
      catch (e) { throw new Error(`${c.id}: ${e.code || e.message} ${e.detail || ''}`); }
    } else r = engine.evaluate(c.modelSpec);
    if (r.error) throw fail(r);
    return { r, runSpec };
  }
  // P06: run.mc — monteCarlo() sozlamalari (adaptiv / qat'iy, interval turi, n_dig, δ/5 …); bo'lmasa qat'iy M (eski misollar)
  const r = runSpec.method === 'monteCarlo'
    ? engine.monteCarlo(c.modelSpec, runSpec.mc ? { interval: runSpec.interval, ...runSpec.mc } : { mode: 'fixed', M: runSpec.M, interval: runSpec.interval })
    : engine.evaluate(c.modelSpec);
  if (runSpec.method === 'monteCarlo' && r.error) throw fail(r);
  return { r, runSpec };
}

/** JSON ga yo'qotishsiz ko'chirish: chekli son — JSON soni (JS da aynan qayta o'qiladi); NaN, ±∞, −0 — {"$num": "…"}. */
export function encode(v) {
  if (typeof v === 'number') return Number.isFinite(v) && !Object.is(v, -0) ? v : { $num: Object.is(v, -0) ? '-0' : String(v) };
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'function' || typeof v === 'symbol') return null;
  if (typeof v === 'bigint') return { $big: String(v) };
  if (ArrayBuffer.isView(v)) return Array.from(v, encode);
  if (Array.isArray(v)) return v.map(encode);
  const out = {};
  for (const k of Object.keys(v).sort()) if (v[k] !== undefined && typeof v[k] !== 'function') out[k] = encode(v[k]);
  return out;
}
const SPECIAL = { NaN: NaN, Infinity: Infinity, '-Infinity': -Infinity, '-0': -0 };
const isNum = v => v !== null && typeof v === 'object' && !Array.isArray(v) && typeof v.$num === 'string' && Object.keys(v).length === 1;

/** encode() qilingan daraxtning barglari: [yo'l, qiymat] (son — haqiqiy son ko'rinishida). */
export function leaves(tree, path = '', out = []) {
  if (isNum(tree)) out.push([path, SPECIAL[tree.$num]]);
  else if (tree === null || typeof tree !== 'object') out.push([path, tree]);
  else if (Array.isArray(tree)) { out.push([path + '.#', tree.length]); tree.forEach((v, i) => leaves(v, `${path}[${i}]`, out)); }
  else for (const k of Object.keys(tree)) leaves(tree[k], path ? `${path}.${k}` : k, out);
  return out;
}

/* Hisobot qatlamidagi (yaxlitlangan) ko'rinish — src/report/sections.js dagi qoidalar bilan:
     • U li har bir tugun (GUM natijasi, vektor chiqishlari, regressiya bashoratlari, top-down …):
       U — 2 qiymatli raqam, y — U ning oxirgi xonasigacha (roundResult), k — 2 o'nlik xona (summaryTable);
     • Monte-Karlo natijasi: o'rtacha va interval uchlari — GUM natijasidan bir xona ortiq (mcLines: digits + 1). */
const fin = v => typeof v === 'number' && Number.isFinite(v);
export function displayOf(result, roundResult) {
  const out = {};
  const seen = new Set();
  (function walk(o, path, depth) {
    if (o === null || typeof o !== 'object' || ArrayBuffer.isView(o) || seen.has(o) || depth > 8) return;
    seen.add(o);
    if (Array.isArray(o)) { if (o.length <= 64) o.forEach((v, i) => walk(v, `${path}[${i}]`, depth + 1)); return; }
    if (fin(o.U) && o.U > 0) {
      const rr = roundResult(fin(o.y) ? o.y : 0, o.U, o.roundUp);
      out[`${path}.U`] = rr.Uround.toFixed(rr.digits);
      if (fin(o.y)) out[`${path}.y`] = (Object.is(rr.yround, -0) ? 0 : rr.yround).toFixed(rr.digits);
      if (fin(o.k)) out[`${path}.k`] = o.k.toFixed(2);
    }
    if (fin(o.low) && fin(o.high) && fin(o.symLow) && fin(o.symHigh)) {
      const half = fin(o.gumU) && o.gumU > 0 ? o.gumU : (o.high - o.low) / 2;
      const d = Math.min(20, roundResult(fin(o.mean) ? o.mean : 0, half, false).digits + 1);
      for (const q of ['mean', 'low', 'high', 'symLow', 'symHigh']) if (fin(o[q])) out[`${path}.${q}`] = o[q].toFixed(d);
    }
    for (const k of Object.keys(o)) walk(o[k], path ? `${path}.${k}` : k, depth + 1);
  })(result, '', 0);
  return out;
}

/** Bitta misolning to'liq natijasi: { id, method, result (encode), display } yoki { id, error }. */
export function snapshotCase(engine, roundResult, c) {
  try {
    const { r, runSpec } = runCase(engine, c);
    return { id: c.id, method: runSpec.method || 'evaluate', result: encode(r), display: displayOf(r, roundResult) };
  } catch (e) {
    return { id: c.id, error: String(e && e.message || e) };
  }
}

/** R(0, 1) ketma-ketligi (kengaytirilgan Wichmann–Hill, JCGM 101:2008 C.3.3) — bit darajasida solishtirish uchun. */
export function rngSequence(engine, seed, n = RNG_SAMPLE) {
  const g = engine.wichmannHill(seed);
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = g.next();
  return out;
}

/**
 * Ikki natijani solishtirish (a — tayanch, masalan Node; b — brauzer yoki boshqa commit).
 * Sonlar: nisbiy farq |a − b| / max(|a|, |b|); satr / mantiqiy / tuzilma — aniq tenglik; `ignore` — tashlab ketiladigan yo'llar.
 * @returns {{ equal:boolean, maxRel:number, maxRelPath:string, numeric:number, differing:number, structural:string[], over:object[] }}
 */
export function diffTrees(a, b, opts = {}) {
  const limit = opts.rel === undefined ? 0 : opts.rel;
  const ignore = opts.ignore || (() => false);
  const la = new Map(leaves(a).filter(([p]) => !ignore(p)));
  const lb = new Map(leaves(b).filter(([p]) => !ignore(p)));
  const res = { equal: true, maxRel: 0, maxRelPath: '', numeric: 0, differing: 0, structural: [], over: [] };
  for (const p of lb.keys()) if (!la.has(p)) res.structural.push(`+ ${p}`);
  for (const [p, va] of la) {
    if (!lb.has(p)) { res.structural.push(`- ${p}`); continue; }
    const vb = lb.get(p);
    if (typeof va === 'number' && typeof vb === 'number') {
      res.numeric++;
      if (Object.is(va, vb)) continue;
      res.differing++;
      const scale = Math.max(Math.abs(va), Math.abs(vb));
      const rel = Number.isFinite(va) && Number.isFinite(vb) && scale > 0 ? Math.abs(va - vb) / scale : Infinity;
      if (rel > res.maxRel) { res.maxRel = rel; res.maxRelPath = p; }
      if (!(rel <= limit)) res.over.push({ path: p, a: va, b: vb, rel });
    } else if (va !== vb) res.structural.push(`≠ ${p}: ${JSON.stringify(va)} → ${JSON.stringify(vb)}`);
  }
  res.equal = !res.structural.length && !res.over.length;
  return res;
}
