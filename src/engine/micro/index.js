/* ═══════════════════════════════════════════════════════════════
   MICRO/INDEX.JS — mikrobiologik natija noaniqligi, log₁₀ shkala (P10-A; P17 — ISO 19036:2019 bo'yicha kengaytirildi).
   Kirish formati: 'uc-micro/1' (docs/ENGINE_API.md §9.3).
   Manba: ISO 19036:2019 (E), 1-nashr. Standart pullik — matni repoda YO'Q; etalon qiymatlar va band havolalari
   tests/fixtures/iso19036/*.json da (egasi bergan, standartdan).
     u_tech   — §5.2: s_IR (Formula (1), juftliklar; Annex A (A.1), guruhlar) yoki tayyor qiymat
     u_matrix — §6: tayyor | bir jinsli suyuqlik 0,1 (§6.2) | s_r guruhlardan (§6.3)
     taqsimot — §7: u_Poisson (Formula (2)), u_conf (Formula (3)), u_MPN (Annex C, (C.1))
     u_c = √(u_tech² + u_matrix² + taqsimot²) (§8.1.2);  U = 2·u_c (§8.2);  LOQ dan past natija — §9.2
   Sof modul (brauzer obyektlari yo'q). Natija YAXLITLANMAYDI (yaxlitlash — src/report/rounding.js; M8: half_up, §9.1).
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { isBlank, toNum } from '../util.js';

export const MICRO_FORMAT = 'uc-micro/1';
/** 1/ln(10) — log₁₀ shkalaga o'tkazish. Ref: ISO 19036:2019 §7.2, Formula (2) (0,434 3 = 1/ln 10) */
export const LOG10_E = 1 / Math.LN10;
/** Ref: ISO 19036:2019 §7.3, Formula (3) — standartda ko'paytuvchi aynan "1/2,303" deb yozilgan (ln 10 ≈ 2,302 585).
    Egasi ko'rsatmasi (P17): konstanta alohida nomlanadi. Table 3 bilan solishtirish — tests/cases/DISCREPANCIES.md D-23. */
export const CONF_LN10 = 2.303;
/** Ref: ISO 19036:2019 §6.2 — bir jinsli suyuqlik uchun u_matrix = 0,1 log₁₀ */
export const MATRIX_PRESETS = Object.freeze({ homogeneous_liquid: 0.1 });
/** Ref: ISO 19036:2019 §8.1.2 NOTE — eng katta hadning 1/5 qismidan oshmaydigan hadni tashlash mumkin */
export const NEGLIGIBLE_RATIO = 0.2;
/** Ref: ISO 19036:2019 §8.2 — k = 2 */
export const MICRO_K = 2;
/** Ref: ISO 19036:2019 §5.2.2.3.2 — s_IR uchun kamida 10 laboratoriya namunasi */
export const MIN_SAMPLES = 10;
/** Ref: ISO 19036:2019 §5.2.2.3.1 — tajriba ma'lumotini qabul qilish chegaralari (faqat ogohlantirish; hech narsa o'chirilmaydi) */
export const DATA_FILTER = Object.freeze({ minSum: 30, maxPlate: 300, minConfirmRatio: 0.5, minMpnPositives: 5 });
/** Past sanoq chegarasi — loyiha parametri (standartda yo'q); settings.lowCountThreshold bilan o'zgartiriladi. */
export const LOW_COUNT_DEFAULT = 10;
export const MICRO_METHODS = ['count', 'count_confirm', 'mpn', 'instrumental'];
export const TECH_SOURCES = ['intralab', 'interlab', 'pt'];
/** Modul holati: tests/fixtures/iso19036 dagi BARCHA misollar o'tmaguncha true (egasi sharti, P17 §1.8).
    Ochiq: F2 (Table A.2 xom ma'lumoti berilmagan), D-23, D-24, D-25 (tests/cases/DISCREPANCIES.md). */
export const MICRO_UNVERIFIED = true;

export const MICRO_WARNINGS = {
  micro_unverified: { severity: 'warning', ref: 'ISO 19036:2019 — etalon misollar (tests/fixtures/iso19036): F2 kutilmoqda, D-23…D-25 ochiq (tests/cases/DISCREPANCIES.md); modul BETA' },
  micro_low_count: { severity: 'warning', ref: 'loyiha parametri (ISO 19036:2019 §7.2 — past sanoqda Puasson hissasi ustun)' },
  micro_no_technical: { severity: 'warning', ref: 'ISO 19036:2019 §5.2 — texnik noaniqlik kiritilmagan' },
  micro_few_pairs: { severity: 'info', ref: 'ISO 19036:2019 §5.2.2.3.2 — kamida 10 laboratoriya namunasi' },
  micro_matrix_design: { severity: 'warning', ref: 'ISO 19036:2019 §6.3 — har namunadan ≥ 2 portsiya; portsiyalar soni ≥ namunalar soni + 10' },
  micro_data_filter: { severity: 'warning', ref: 'ISO 19036:2019 §5.2.2.3.1 — tajriba ma\'lumotini qabul qilish shartlari' },
  micro_corr_negative: { severity: 'warning', ref: 'ISO 19036:2019 Annex D — tuzatilgan dispersiya manfiy: 0 qabul qilindi, sababini tekshiring' },
  micro_below_loq: { severity: 'info', ref: 'ISO 19036:2019 §9.2 — miqdoriy aniqlash chegarasidan past natija' },
  micro_negligible_ignored: { severity: 'info', ref: 'ISO 19036:2019 §8.1.2 NOTE — eng katta hadning 1/5 qismidan oshmaydigan had tashlandi' },
  micro_k_custom: { severity: 'info', ref: 'ISO 19036:2019 §8.2 — standart k = 2; boshqa k sozlamadan olingan' },
  micro_mpn_assumed_positive: { severity: 'info', ref: 'ISO 19036:2019 Annex C — musbat natija yo\'q: eng katta aliquotda bitta musbat deb olindi' },
};
export const MICRO_ERRORS = ['micro_bad_spec', 'micro_bad_data', 'micro_zero_count', 'micro_need_result', 'micro_need_loq', 'micro_need_confirm', 'micro_need_mpn', 'micro_corr_need_counts'];

const sq = v => v * v;
/** Tajriba yozuvi: son (x) yoki { x, sumCounts?, maxPlate?, confirm?:{np,nc}, mpnPositives? } */
function portion(p) {
  const o = p !== null && typeof p === 'object' && !Array.isArray(p) ? p : { x: p };
  const x = toNum(o.x);
  return x > 0 && Number.isFinite(x) ? { ...o, x } : null;
}

/** Ref: ISO 19036:2019 §5.2.2.4, Formula (1): s_IR = √(Σ(y_iA − y_iB)²/(2n)), y = log₁₀ x */
export function logDuplicateSd(pairs) {
  let q = 0;
  for (const [a, b] of pairs) { const d = Math.log10(a) - Math.log10(b); q += d * d; }
  return Math.sqrt(q / (2 * pairs.length));
}

/**
 * Ref: ISO 19036:2019 Annex A, Formula (A.1): s = √(Σ_i Σ_j (y_ij − ȳ_i)² / Σ_i (p_i − 1)), y = log₁₀ x.
 * Bitta guruh (n = 1) da — oddiy standart og'ish. Juftliklar uchun Formula (1) bilan aynan teng.
 * @param {number[][]} groups  har bir guruh — bitta laboratoriya namunasining portsiyalari natijalari (x > 0)
 * @returns {{s:number, s2:number, ss:number, df:number, n:number, N:number}}
 */
export function logPooledSd(groups) {
  let ss = 0, df = 0, N = 0;
  for (const g of groups) {
    const y = g.map(Math.log10), m = y.reduce((a, b) => a + b, 0) / y.length;
    for (const v of y) ss += sq(v - m);
    df += y.length - 1; N += y.length;
  }
  const s2 = df > 0 ? ss / df : NaN;
  return { s: Math.sqrt(s2), s2, ss, df, n: groups.length, N };
}

/** Ref: ISO 19036:2019 §7.2, Formula (2): u_Poisson = (1/ln 10)/√ΣC; §9.2.2 — ΣC = 0 da ΣC = 1 kabi (0,434) */
export function uPoissonOf(sumCounts) {
  return LOG10_E / Math.sqrt(sumCounts > 0 ? sumCounts : 1);
}

/** Ref: ISO 19036:2019 §7.3, Formula (3):
    u_conf = (1/2,303)·√[(n_c + 0,5)(n_p − n_c + 0,5)·n_p² / ((n_p + 1)²(n_p + 2)·n_c²)]; n_c = 0 bo'lsa n_c = 1 */
export function uConfOf(np, nc) {
  const c = nc > 0 ? nc : 1;
  return Math.sqrt((c + 0.5) * (np - c + 0.5) * np * np / (sq(np + 1) * (np + 2) * c * c)) / CONF_LN10;
}

/**
 * Ref: ISO 19036:2019 Annex C, Formula (C.1): u_MPN = (1/ln 10) / (μ·√Σ_i [x_i·m_i²·e^(−m_i·μ) / (1 − e^(−m_i·μ))²]).
 * μ — MPN (log emas), m_i — aliquot miqdori, x_i — musbatlar soni. Σx_i = 0 bo'lsa eng katta m_i da bitta musbat deb olinadi.
 * @returns {{u:number, sum:number, assumed:boolean}}
 */
export function uMpnOf(mu, aliquots) {
  let rows = aliquots.map(a => ({ m: a.m, x: a.x }));
  const assumed = rows.reduce((s, a) => s + a.x, 0) === 0;
  if (assumed) { const big = rows.reduce((b, a) => (a.m > b.m ? a : b), rows[0]); rows = rows.map(a => (a === big ? { ...a, x: 1 } : a)); }
  let sum = 0;
  for (const { m, x } of rows) { const e = Math.exp(-m * mu); sum += x * m * m * e / sq(1 - e); }
  return { u: LOG10_E / (mu * Math.sqrt(sum)), sum, assumed };
}

/** Ref: ISO 19036:2019 §5.2.2.3.1 — qabul qilish shartlari; faqat sanaladi (ogohlantirish), hech narsa o'chirilmaydi */
function filterCounts(portions) {
  const c = { lowSum: 0, highPlate: 0, confirm: 0, mpn: 0 };
  for (const p of portions) {
    if (!isBlank(p.sumCounts) && toNum(p.sumCounts) < DATA_FILTER.minSum) c.lowSum++;
    if (!isBlank(p.maxPlate) && toNum(p.maxPlate) > DATA_FILTER.maxPlate) c.highPlate++;
    if (p.confirm && toNum(p.confirm.nc) < DATA_FILTER.minConfirmRatio * toNum(p.confirm.np)) c.confirm++;
    if (!isBlank(p.mpnPositives) && toNum(p.mpnPositives) < DATA_FILTER.minMpnPositives) c.mpn++;
  }
  return c;
}

/**
 * Ref: ISO 19036:2019 Annex D: u²_unwanted = S_unwanted / N; S_unwanted = Σ_portsiya (u²_Poisson + u²_conf [+ u²_matrix — faqat s_IR uchun]);
 * s²_corr = s² − u²_unwanted. Manfiy bo'lsa 0 (standart ruxsati) — chaqiruvchi ogohlantiradi.
 * @returns {{S:number, N:number, u2Unwanted:number, s2Corr:number, s2Raw:number, negative:boolean}|null}  null — portsiyada ΣC yo'q
 */
function annexD(portions, s2, u2Matrix) {
  let S = 0;
  for (const p of portions) {
    if (isBlank(p.sumCounts) || !(toNum(p.sumCounts) > 0)) return null;
    S += sq(uPoissonOf(toNum(p.sumCounts))) + u2Matrix;
    if (p.confirm && toNum(p.confirm.np) > 0) S += sq(uConfOf(toNum(p.confirm.np), toNum(p.confirm.nc)));
  }
  const N = portions.length, u2Unwanted = S / N, raw = s2 - u2Unwanted;
  return { S, N, u2Unwanted, s2Raw: raw, s2Corr: raw < 0 ? 0 : raw, negative: raw < 0 };
}

/** Juftliklar / guruhlar → { groups:[[portsiya…]…] } yoki xato tafsiloti */
function readGroups(src, key) {
  const raw = Array.isArray(src.pairs) && src.pairs.length ? src.pairs : src.groups;
  const groups = [];
  for (const [i, g] of raw.entries()) {
    if (!Array.isArray(g) || !g.length) return { detail: `${key}[${i}]` };
    const ps = g.map(portion);
    if (ps.some(p => !p)) return { detail: `${key}[${i}]` };
    groups.push(ps);
  }
  return { groups };
}

/** Standart og'ish manbai (u_tech yoki u_matrix) — tajriba ma'lumotidan */
function fromData(src, key, u2Matrix) {
  const g = readGroups(src, key);
  if (g.detail) return { error: 'micro_bad_data', detail: g.detail };
  const pooled = logPooledSd(g.groups.map(ps => ps.map(p => p.x)));
  if (!(pooled.df > 0)) return { error: 'micro_bad_data', detail: key };
  const portions = g.groups.flat();
  const out = { kind: Array.isArray(src.pairs) && src.pairs.length ? 'pairs' : 'groups', ...pooled, sRaw: pooled.s, groups: g.groups, filter: filterCounts(portions), corrected: null };
  if (src.correct === true) {
    const c = annexD(portions, pooled.s2, u2Matrix);
    if (!c) return { error: 'micro_corr_need_counts', detail: key };
    out.corrected = c; out.s = Math.sqrt(c.s2Corr); out.s2 = c.s2Corr;
  }
  return out;
}

/**
 * @param {object} spec { format:'uc-micro/1', unit?,
 *   method?: 'count' (standart) | 'count_confirm' | 'mpn' | 'instrumental',  approach?: 'REPRO_ONLY' (§8.1.3),
 *   result: { value, sumCounts?, loq?, confirm?:{np, nc}, mpn?:{ u } | { mu?, aliquots:[{m, x}] } },
 *   technical?: {pairs:[[x1,x2]…], correct?} | {groups:[[x…]…], correct?} | {s, source?:'intralab'|'interlab'|'pt'},
 *   matrix?: {u} | {preset:'homogeneous_liquid'} | {groups:[[x…]…], correct?},
 *   settings?: { k=2, ignoreNegligible=false, lowCountThreshold, rounding:'half_up'|'up', reportForm:'a'|'b'|'c' } }
 *   Juftlik / guruh a'zosi — son (x) yoki { x, sumCounts?, maxPlate?, confirm?, mpnPositives? } (filtrlar va Annex D uchun).
 */
export function evaluateMicro(spec) {
  if (!spec || typeof spec !== 'object') return { error: 'micro_bad_spec' };
  const settings = spec.settings || {};
  const method = isBlank(spec.method) ? 'count' : spec.method;
  if (!MICRO_METHODS.includes(method)) return { error: 'micro_bad_spec', detail: 'method' };
  const reproOnly = spec.approach === 'REPRO_ONLY';
  if (!isBlank(spec.approach) && !['REPRO_ONLY', 'COMPONENTS'].includes(spec.approach)) return { error: 'micro_bad_spec', detail: 'approach' };
  const k = isBlank(settings.k) ? MICRO_K : toNum(settings.k);
  if (!(k > 0)) return { error: 'micro_bad_data', detail: 'settings.k' };
  const res = spec.result || {};
  const counting = method === 'count' || method === 'count_confirm';
  if (isBlank(res.value) && isBlank(res.loq)) return { error: 'micro_need_result' };
  if (counting && !reproOnly && isBlank(res.sumCounts)) return { error: 'micro_need_result' };
  const N = isBlank(res.value) ? 0 : toNum(res.value), C = isBlank(res.sumCounts) ? null : toNum(res.sumCounts);
  if (!Number.isFinite(N) || N < 0 || (C !== null && (!Number.isFinite(C) || C < 0))) return { error: 'micro_bad_data', detail: 'result' };

  const warnings = [];
  const warn = (code, extra) => warnings.push({ code, ...MICRO_WARNINGS[code], ...(extra || {}) });
  if (MICRO_UNVERIFIED) warn('micro_unverified');

  /* ── §6: matritsa noaniqligi (avval — Annex D da u_tech tuzatishiga kerak) ── */
  let uMatrix = 0, matrix = null;
  const mx = spec.matrix;
  if (!reproOnly && mx) {
    if (!isBlank(mx.preset)) {
      if (!Object.prototype.hasOwnProperty.call(MATRIX_PRESETS, mx.preset)) return { error: 'micro_bad_data', detail: 'matrix.preset' };
      uMatrix = MATRIX_PRESETS[mx.preset]; matrix = { kind: 'preset', preset: mx.preset };
    } else if (Array.isArray(mx.groups) && mx.groups.length) {
      // Ref: ISO 19036:2019 §6.3 — s_r bir namunaning bir nechta portsiyasidan (Annex A); tuzatishda u²_matrix ayirilmaydi (Annex D)
      const d = fromData(mx, 'matrix.groups', 0);
      if (d.error) return d;
      uMatrix = d.s; matrix = d;
      if (d.groups.some(g => g.length < 2) || d.N < d.n + 10) warn('micro_matrix_design', { value: `${d.n}; ${d.N}` });
    } else if (!isBlank(mx.u)) {
      uMatrix = toNum(mx.u); matrix = { kind: 'stated' };
      if (!(uMatrix >= 0)) return { error: 'micro_bad_data', detail: 'matrix.u' };
    }
  }

  /* ── §5.2: texnik noaniqlik ── */
  let uTech = null, technical = null;
  const tech = spec.technical;
  if (tech && ((Array.isArray(tech.pairs) && tech.pairs.length) || (Array.isArray(tech.groups) && tech.groups.length))) {
    if (Array.isArray(tech.pairs) && tech.pairs.length && tech.pairs.some(p => !Array.isArray(p) || p.length !== 2)) return { error: 'micro_bad_data', detail: 'technical.pairs' };
    const d = fromData(tech, Array.isArray(tech.pairs) && tech.pairs.length ? 'technical.pairs' : 'technical.groups', sq(uMatrix));
    if (d.error) return d;
    uTech = d.s; technical = d;
    if (d.n < MIN_SAMPLES) warn('micro_few_pairs', { value: String(d.n) });
  } else if (tech && !isBlank(tech.s)) {
    uTech = toNum(tech.s);
    if (!(uTech >= 0)) return { error: 'micro_bad_data', detail: 'technical.s' };
    if (!isBlank(tech.source) && !TECH_SOURCES.includes(tech.source)) return { error: 'micro_bad_data', detail: 'technical.source' };
    technical = { kind: 'stated', source: isBlank(tech.source) ? null : tech.source };
  } else if (reproOnly) return { error: 'micro_bad_data', detail: 'technical.s' };
  else warn('micro_no_technical');
  for (const [d, name] of [[technical, 'u_tech'], [matrix, 'u_matrix']]) {
    if (!d || !d.filter) continue;
    const f = d.filter, parts = [];
    if (f.lowSum) parts.push(`ΣC < ${DATA_FILTER.minSum}: ${f.lowSum}`);
    if (f.highPlate) parts.push(`> ${DATA_FILTER.maxPlate}: ${f.highPlate}`);
    if (f.confirm) parts.push(`n_c < n_p/2: ${f.confirm}`);
    if (f.mpn) parts.push(`Σx < ${DATA_FILTER.minMpnPositives}: ${f.mpn}`);
    if (parts.length) warn('micro_data_filter', { value: `${name} — ${parts.join('; ')}` });
    if (d.corrected && d.corrected.negative) warn('micro_corr_negative', { value: name });
  }

  /* ── §7: taqsimot noaniqliklari; §9.2: LOQ dan past natija ── */
  let uPoisson = null, uConf = null, uMPN = null, mpn = null, confirm = null;
  let below = false, yShift = 0;
  if (!reproOnly && counting) {
    if (C === 0) below = true;
    uPoisson = uPoissonOf(C);
    if (method === 'count_confirm') {
      const np = toNum(res.confirm && res.confirm.np), nc = toNum(res.confirm && res.confirm.nc);
      if (!res.confirm || isBlank(res.confirm.np) || isBlank(res.confirm.nc)) return { error: 'micro_need_confirm' };
      if (!(np > 0) || !(nc >= 0) || nc > np) return { error: 'micro_bad_data', detail: 'result.confirm' };
      if (nc === 0) below = true;
      uConf = uConfOf(np, nc);
      // Ref: ISO 19036:2019 §7.3 — tasdiqlangan natija: y = y_presumptive + log₁₀(n_c/n_p)
      if (nc > 0) yShift = Math.log10(nc / np);
      confirm = { np, nc };
    }
  } else if (!reproOnly && method === 'mpn') {
    const m = res.mpn;
    if (!m) return { error: 'micro_need_mpn' };
    if (!isBlank(m.u)) {
      uMPN = toNum(m.u);
      if (!(uMPN >= 0)) return { error: 'micro_bad_data', detail: 'result.mpn.u' };
      mpn = { kind: 'stated' };
    } else {
      const mu = isBlank(m.mu) ? N : toNum(m.mu);
      const al = (Array.isArray(m.aliquots) ? m.aliquots : []).map(a => ({ m: toNum(a && a.m), x: toNum(a && a.x) }));
      if (!al.length) return { error: 'micro_need_mpn' };
      if (!(mu > 0) || al.some(a => !(a.m > 0) || !(a.x >= 0))) return { error: 'micro_bad_data', detail: 'result.mpn' };
      const r = uMpnOf(mu, al);
      uMPN = r.u; mpn = { kind: 'computed', mu, sum: r.sum, assumed: r.assumed };
      if (r.assumed) { below = true; warn('micro_mpn_assumed_positive'); }
    }
  }
  if (N === 0) below = true;
  let loq = null;
  if (below) {
    // Ref: ISO 19036:2019 §9.2 — x_LOQ: bitta koloniya (ΣC = 1) / bitta tasdiq / bitta musbatga mos natija; kiritiladi
    if (isBlank(res.loq)) return { error: 'micro_need_loq', detail: 'result.loq' };
    const x = toNum(res.loq);
    if (!(x > 0) || !Number.isFinite(x)) return { error: 'micro_bad_data', detail: 'result.loq' };
    loq = { x, y: Math.log10(x) };
    warn('micro_below_loq');
  } else if (!(N > 0)) return { error: 'micro_zero_count' };
  if (counting && !reproOnly && !below) {
    const low = isBlank(settings.lowCountThreshold) ? LOW_COUNT_DEFAULT : toNum(settings.lowCountThreshold);
    if (C < low) warn('micro_low_count', { value: `ΣC = ${C}` });
  }

  /* ── §8.1.2 / §8.1.3: yig'indi standart noaniqlik ── */
  // Ref: ISO 19036:2019 §8.1.3 — u_c = s_R (tuzatishsiz); §8.1.2 — u_c = √(u_tech² + u_matrix² + taqsimot²)
  const parts = [{ id: 'technical', u: uTech || 0, optional: false }];
  if (!reproOnly) {
    parts.push({ id: 'matrix', u: uMatrix, optional: true });
    if (uPoisson !== null) parts.push({ id: 'poisson', u: uPoisson, optional: true });
    if (uConf !== null) parts.push({ id: 'confirm', u: uConf, optional: true });
    if (uMPN !== null) parts.push({ id: 'mpn', u: uMPN, optional: true });
  }
  const ignoreNegligible = settings.ignoreNegligible === true && !reproOnly;
  const uMax = Math.max(...parts.map(p => p.u));
  // Ref: ISO 19036:2019 §8.1.2 NOTE — u_i ≤ (1/5)·max(u): matritsa / taqsimot hadi tashlanadi (byudjetda `ignored` bilan qoladi)
  for (const p of parts) p.ignored = ignoreNegligible && p.optional && p.u > 0 && p.u <= NEGLIGIBLE_RATIO * uMax;
  const ignored = parts.filter(p => p.ignored).map(p => p.id);
  if (ignored.length) warn('micro_negligible_ignored', { value: ignored.join(', ') });
  const uc2 = parts.reduce((a, p) => a + (p.ignored ? 0 : p.u * p.u), 0), uc = Math.sqrt(uc2);
  // Ref: ISO 19036:2019 §8.2 — U = 2·u_c
  const U = k * uc;
  if (k !== MICRO_K) warn('micro_k_custom', { value: String(k) });

  const yPresumptive = N > 0 ? Math.log10(N) : null;
  const y = below ? loq.y : yPresumptive + yShift;
  const value = below ? loq.x : Math.pow(10, y);
  if (loq) { loq.yUpper = loq.y + U; loq.yLower = loq.y - U; loq.xUpper = Math.pow(10, loq.y + U); loq.xLower = 0; }
  const strip = d => (d && d.groups ? (({ groups, ...rest }) => ({ ...rest, portions: groups.map(g => g.length) }))(d) : d);
  return {
    engineVersion: ENGINE_VERSION, mode: 'MICROBIOLOGY', format: MICRO_FORMAT,
    approach: reproOnly ? 'REPRO_ONLY' : 'LOG10_COUNT', approachRef: 'ISO 19036:2019', unverified: MICRO_UNVERIFIED, method,
    value, valuePresumptive: N > 0 ? N : null, sumCounts: C, unit: spec.unit || '',
    y, yPresumptive, uTech, nPairs: technical && technical.n !== undefined ? technical.n : null, dfTech: technical && technical.df !== undefined ? technical.df : null,
    uMatrix, uPoisson, uConf, uMPN, uc, uc2, k, U,
    technical: strip(technical), matrix: strip(matrix), confirm, mpn,
    ignoreNegligible, ignored,
    budget: parts.map(p => ({ id: p.id, u: p.u, variance: p.u * p.u, share: !p.ignored && uc2 > 0 ? 100 * p.u * p.u / uc2 : 0, ignored: p.ignored })),
    belowLOQ: below, loq,
    // log₁₀ shkaladagi simmetrik interval oddiy shkalada asimmetrik; LOQ dan past natijada pastki chegara 0 (§9.2)
    interval: { low: below ? 0 : Math.pow(10, y - U), high: Math.pow(10, y + U) },
    intervalLog: { low: y - U, high: y + U },
    // Ref: ISO 19036:2019 §9.1 — U oddiy qoida bilan 2 qiymatli raqamgacha (egasi qarori 2026-11-20: M8 — half_up; 'up' — laboratoriya sozlamasi)
    rounding: settings.rounding === 'up' ? 'up' : 'half_up', roundUp: settings.rounding === 'up',
    reportForm: ['a', 'b', 'c'].includes(settings.reportForm) ? settings.reportForm : 'a',
    warnings,
  };
}
