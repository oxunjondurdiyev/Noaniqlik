/* ═══════════════════════════════════════════════════════════════
   MEDICAL/INDEX.JS — tibbiy laboratoriya (M9): IQC darajalari bo'yicha o'lchash noaniqligi.
   Kirish formati: 'uc-medical/1' (docs/ENGINE_API.md §9.4).
   Manba: ISO/TS 20914:2019 (E), 1-nashr. Standart pullik va repoda YO'Q — etalon qiymatlar
   tests/fixtures/iso20914/*.json da (Annex A va Annex C ishlangan misollari, band havolasi bilan; P18).
     u(y) = √(u_cal² + u_Rw² [+ u_bias²]);  U = k·u;  nisbiy (%) ko'rinish — har bir darajaning o'z o'rtachasi orqali.
   Har bir kattalikda `unit` yoki `relative: true` (nisbiy qiymatlar foizda); aralash — xato.
   Sof modul (brauzer obyektlari yo'q). Natija YAXLITLANMAYDI (yaxlitlash — src/report/rounding.js).
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { isBlank, toNum } from '../util.js';

export const MEDICAL_FORMAT = 'uc-medical/1';
export const MEDICAL_SOURCE = 'ISO/TS 20914:2019';

export const MEDICAL_WARNINGS = {
  medical_no_calibrator: { severity: 'warning', ref: 'ISO/TS 20914:2019 §6.4, A.2.2: kalibrator qiymati noaniqligi u_cal kiritilmagan' },
  medical_few_iqc: { severity: 'info', ref: 'ISO/TS 20914:2019 §6.3 — IQC natijalari soni kam; chegara (20) — loyiha parametri' },
  medical_level_by_nearest: { severity: 'warning', ref: 'Loyiha qoidasi (me\'yoriy emas): darajalarning qo\'llanish oralig\'i berilmagan — eng yaqin o\'rtacha bo\'yicha tanlandi; ISO/TS 20914:2019 A.2.3, A.3.2 jadvallari oraliq bo\'yicha tanlaydi' },
  medical_repeatability_only: { severity: 'info', ref: 'ISO/TS 20914:2019 §6.3, A.2.3: u_r uzoq muddatli sharoitlar uchun noaniqlikni kam baholaydi' },
  medical_unbalanced_lots: { severity: 'info', ref: 'ISO/TS 20914:2019 A.3.1: lotlardagi natijalar soni katta farq qilganda muqobil (vaznli) yondashuv' },
  medical_pool_df: { severity: 'info', ref: 'ISO/TS 20914:2019 A.3.1: muqobil yondashuv (n katta farq qilganda) — erkinlik darajalari bo\'yicha vaznli birlashtirish' },
  medical_bias_significant_not_applied: { severity: 'warning', ref: 'ISO/TS 20914:2019 §6.6, C.5, Formula (C.3): bias ahamiyatli, lekin tuzatish qo\'llanmagan' },
  medical_bias_incomplete: { severity: 'warning', ref: 'ISO/TS 20914:2019 C.5.3: tayanch qiymat noaniqligi u_ref berilmagan — u_bias kam baholangan' },
  medical_not_fit: { severity: 'warning', ref: 'ISO/TS 20914:2019 §5.2: noaniqlik ruxsat etilgan maksimal qiymatdan katta' },
  medical_no_source_example: { severity: 'info', ref: 'CLAUDE.md: manbadan olingan test misoli yo\'q (tests/fixtures/iso20914 da ishlangan misol berilmagan) — tekshirilmagan' },
  zero_u: { severity: 'warning', ref: 'CLAUDE.md: U = 0 bo\'lgan natija ogohlantirishsiz hisobotga chiqmaydi' },
};
export const MEDICAL_ERRORS = ['medical_bad_spec', 'medical_bad_data', 'medical_need_levels', 'medical_need_scale', 'medical_mixed_scale', 'medical_zero_mean', 'medical_too_few',
  'medical_interval_gap', 'medical_interval_overlap', 'medical_log_relative'];
/** IQC natijalari soni shundan kam bo'lsa eslatma (loyiha parametri). */
export const FEW_IQC = 20;
/** Lotlardagi n nisbati shundan katta bo'lsa `medical_unbalanced_lots` (P18 topshirig'i; loyiha parametri). */
export const UNBALANCED_RATIO = 2;
/** Ref: ISO/TS 20914:2019 C.5, Formula (C.3) — |bias| > 2·u_bias bo'lsa bias ahamiyatli */
export const BIAS_SIGNIFICANCE_FACTOR = 2;
export const MEDICAL_SCALES = ['linear', 'log10'];
export const MEDICAL_PRECISION = ['long_term', 'repeatability'];
export const MEDICAL_POOL = ['none', 'df'];
export const MEDICAL_ALLOWABLE = ['u_rel', 'U_rel', 'u_abs', 'U_abs'];

class Fail extends Error { constructor(code, detail) { super(code); this.code = code; this.detail = detail || ''; } }
const fail = (c, d) => { throw new Fail(c, d); };
const sumSq = a => a.reduce((s, v) => s + v * v, 0);
const meanOf = a => a.reduce((s, v) => s + v, 0) / a.length;
const num = (v, where, test) => { const x = toNum(v); if (!Number.isFinite(x) || (test && !test(x))) fail('medical_bad_data', where); return x; };
const nonNeg = x => x >= 0;

/** Kuzatuvlar qatori → {n, mean, sd}. Ref: JCGM 100:2008 §4.2.2 Eq. (4) — tajriba standart og'ishi */
function series(values, where) {
  const vals = values.filter(v => !isBlank(v)).map(toNum);
  if (vals.some(v => !Number.isFinite(v))) fail('medical_bad_data', `${where}.values`);
  if (vals.length < 2) fail('medical_too_few', where);
  const mean = meanOf(vals);
  return { n: vals.length, mean, sd: Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (vals.length - 1)) };
}

/** {values[]} yoki {mean, sd | cv, n?} → {n, mean, sd}; needMean=false — faqat sd (davrlar) */
function stats(o, where, log, needMean = true) {
  if (!o || typeof o !== 'object') fail('medical_bad_data', where);
  if (Array.isArray(o.values) && o.values.some(v => !isBlank(v))) return series(o.values, where);
  const mean = isBlank(o.mean) ? null : num(o.mean, `${where}.mean`);
  if (needMean && mean === null) fail('medical_bad_data', `${where}.mean`);
  let sd;
  if (!isBlank(o.cv)) {
    if (log) fail('medical_log_relative', `${where}.cv`);
    if (mean === null) fail('medical_bad_data', `${where}.mean`);
    sd = Math.abs(mean) * num(o.cv, `${where}.cv`, nonNeg) / 100;
  } else if (!isBlank(o.sd)) sd = num(o.sd, `${where}.sd`, nonNeg);
  else if (!isBlank(o.uRw)) sd = num(o.uRw, `${where}.uRw`, nonNeg);
  else fail('medical_bad_data', `${where}.${needMean ? 'cv' : 'uRw'}`);
  return { n: isBlank(o.n) ? null : num(o.n, `${where}.n`, x => x >= 1), mean, sd };
}

/** {abs} → {abs, rel}; log₁₀ shkalada nisbiy (%) ko'rinish berilmaydi (A.10) */
const both = (abs, mean, log) => ({ abs, rel: log ? null : 100 * abs / Math.abs(mean) });

/** Kattalik {value, relative:true} (foizda) yoki {value, unit} [, k — kengaytirilgan qiymat bo'luvchisi] → {abs, rel} */
function quantity(q, mean, unit, where, log) {
  if (!q || isBlank(q.value)) return null;
  let v = num(q.value, where, nonNeg);
  // Ref: ISO/TS 20914:2019 A.3.2, C.6 — sertifikatdagi U (k) → u = U / k
  if (!isBlank(q.k)) v /= num(q.k, `${where}.k`, x => x > 0);
  const rel = q.relative === true, abs = !isBlank(q.unit);
  if (rel && abs) fail('medical_mixed_scale', where);
  if (!rel && !abs) fail('medical_need_scale', where);
  if (rel && log) fail('medical_log_relative', where);
  if (abs && String(q.unit).trim() !== unit) fail('medical_mixed_scale', `${where}: ${q.unit} ≠ ${unit}`);
  return rel ? { abs: Math.abs(mean) * v / 100, rel: v } : both(v, mean, log);
}

/**
 * u_bias ni CRM (tayanch material) o'lchashlaridan hisoblash.
 * Ref: ISO/TS 20914:2019 C.5, Formula (C.1) SD_mean = s/√n; (C.2)/(C.4) u_bias = √(u_ref² + SD_mean²); (C.3) |bias| > 2·u_bias
 */
function biasFromCrm(b, k, log, warn, where) {
  if (typeof b !== 'object') fail('medical_bad_spec', where);
  const mode = b.mode === undefined ? 'absolute' : b.mode;
  if (!['absolute', 'proportional'].includes(mode)) fail('medical_bad_spec', `${where}.mode`);
  if (mode === 'proportional' && log) fail('medical_log_relative', `${where}.mode`);
  const xRef = num(b.xRef, `${where}.xRef`), xLab = num(b.xLab, `${where}.xLab`);
  const sd = num(b.sd, `${where}.sd`, nonNeg), n = num(b.n, `${where}.n`, x => x >= 1);
  let uRef = null;
  if (!isBlank(b.uRef)) uRef = num(b.uRef, `${where}.uRef`, nonNeg);
  else if (!isBlank(b.URef)) uRef = num(b.URef, `${where}.URef`, nonNeg) / (isBlank(b.kRef) ? 2 : num(b.kRef, `${where}.kRef`, x => x > 0));
  const incomplete = uRef === null;
  // Ref: ISO/TS 20914:2019 C.5.3 — u_ref ma'lum emas: u_bias faqat SD_mean dan (kam baholangan)
  if (incomplete) warn('medical_bias_incomplete');
  const sdMean = sd / Math.sqrt(n);                                         // (C.1)
  const uBias = Math.sqrt((incomplete ? 0 : uRef * uRef) + sdMean * sdMean);  // (C.2), (C.4)
  const bias = xRef - xLab;                                                 // C.5.2 misolidagi ishora: x_ref − x_lab
  const significant = Math.abs(bias) > BIAS_SIGNIFICANCE_FACTOR * uBias;    // (C.3)
  const apply = b.apply === true;
  if (!log && xRef === 0) fail('medical_zero_mean', `${where}.xRef`);
  // Ref: ISO/TS 20914:2019 §6.6 — tuzatish qo'llash-qo'llamaslik qarori laboratoriyaniki
  if (significant && !apply) warn('medical_bias_significant_not_applied');
  if (mode === 'proportional') warn('medical_no_source_example', { value: 'bias.mode = proportional (C.5.4)' });
  return { mode, xRef, uRef, xLab, sd, n, sdMean, uBias, UBias: k * uBias, bias, biasRel: log ? null : 100 * bias / xRef,
    uBiasRel: log ? null : 100 * uBias / Math.abs(xRef), significant, apply, incomplete };
}

/** Daraja qo'llanish oralig'i (ISO/TS 20914:2019 A.2.3, A.3.2 jadvallari "IQC monitors interval") */
function readInterval(iv, where) {
  if (iv === undefined || iv === null) return null;
  if (typeof iv !== 'object') fail('medical_bad_spec', `${where}.interval`);
  const low = isBlank(iv.low) ? -Infinity : num(iv.low, `${where}.interval.low`);
  const high = isBlank(iv.high) ? Infinity : num(iv.high, `${where}.interval.high`);
  if (!(low < high)) fail('medical_bad_data', `${where}.interval`);
  return { low, high, lowInclusive: iv.lowInclusive !== false, highInclusive: iv.highInclusive === true };
}
const inside = (iv, y) => (y > iv.low || (iv.lowInclusive && y === iv.low)) && (y < iv.high || (iv.highInclusive && y === iv.high));
function overlap(a, b) {
  const lo = Math.max(a.low, b.low), hi = Math.min(a.high, b.high);
  if (lo < hi) return true;
  return lo === hi && Number.isFinite(lo) && inside(a, lo) && inside(b, lo);
}
/** Natijada ±Infinity JSON ga chiqmaydi: ochiq chegara — null */
const showInterval = iv => (iv ? { low: Number.isFinite(iv.low) ? iv.low : null, high: Number.isFinite(iv.high) ? iv.high : null, lowInclusive: iv.lowInclusive, highInclusive: iv.highInclusive } : null);

function core(spec) {
  if (!spec || typeof spec !== 'object') fail('medical_bad_spec');
  const settings = spec.settings || {};
  const k = isBlank(settings.k) ? 2 : toNum(settings.k);
  if (!(k > 0)) fail('medical_bad_data', 'settings.k');
  if (isBlank(spec.unit)) fail('medical_need_scale', 'unit');
  const unit = String(spec.unit).trim();
  const scale = spec.scale === undefined ? 'linear' : spec.scale;
  if (!MEDICAL_SCALES.includes(scale)) fail('medical_bad_spec', 'scale');
  const log = scale === 'log10';
  const precisionType = spec.precisionType === undefined ? 'long_term' : spec.precisionType;
  if (!MEDICAL_PRECISION.includes(precisionType)) fail('medical_bad_spec', 'precisionType');
  const poolWeighting = settings.poolWeighting === undefined ? 'none' : settings.poolWeighting;
  if (!MEDICAL_POOL.includes(poolWeighting)) fail('medical_bad_spec', 'settings.poolWeighting');
  const list = Array.isArray(spec.levels) ? spec.levels : [];
  if (!list.length) fail('medical_need_levels');
  const warnings = [];
  const warn = (code, extra) => {
    const w = { code, ...MEDICAL_WARNINGS[code], ...(extra || {}) };
    if (!warnings.some(x => x.code === w.code && x.value === w.value)) warnings.push(w);
  };

  // Ref: ISO/TS 20914:2019 §6.10 — sanoq (Poisson): u = √count. Ishlangan misol berilmagan → `medical_no_source_example`
  let counting = null;
  if (spec.counting !== undefined && spec.counting !== null) {
    const count = num(spec.counting.count, 'counting.count', nonNeg);
    counting = { count, u: Math.sqrt(count) };
    warn('medical_no_source_example', { value: 'counting (§6.10)' });
  }
  const bias = spec.bias === undefined || spec.bias === null ? null : biasFromCrm(spec.bias, k, log, warn, 'bias');
  if (bias && spec.uBias) fail('medical_bad_spec', 'bias + uBias');

  let allowable = null;
  if (spec.allowable !== undefined && spec.allowable !== null) {
    const keys = MEDICAL_ALLOWABLE.filter(q => !isBlank(spec.allowable[q]));
    if (keys.length !== 1) fail('medical_bad_spec', 'allowable');
    if (log && keys[0].endsWith('_rel')) fail('medical_log_relative', 'allowable');
    allowable = { quantity: keys[0], limit: num(spec.allowable[keys[0]], 'allowable', x => x > 0) };
  }

  const levels = list.map((L, i) => {
    const where = `levels[${i}]`;
    const id = String(L.id || `L${i + 1}`);
    const groups = ['lots', 'systems', 'periods'].filter(g => Array.isArray(L[g]) && L[g].length);
    if (groups.length > 1) fail('medical_bad_spec', `${where}: ${groups.join(' + ')}`);
    let mean, n = null, sd, extra = {}, pooledParts = null, periodRw = null;
    if (groups[0] === 'lots') {
      // Ref: ISO/TS 20914:2019 A.3.1, Formula (A.8) — u_Rw(pooled) = √(Σu_i²/m); A.3.2, A.3.3 — o'rtacha: lot o'rtachalarining arifmetik o'rtachasi
      const lots = L.lots.map((x, j) => ({ id: String(x.id || j + 1), ...stats(x, `${where}.lots[${j}]`, log) }));
      mean = meanOf(lots.map(x => x.mean));
      const ns = lots.map(x => x.n);
      if (poolWeighting === 'df') {
        // Ref: ISO/TS 20914:2019 A.3.1 — muqobil yondashuv: √(Σ(n_i − 1)·u_i² / Σ(n_i − 1))
        if (ns.some(x => x === null || !(x >= 2))) fail('medical_bad_data', `${where}.lots[].n`);
        sd = Math.sqrt(lots.reduce((a, x) => a + (x.n - 1) * x.sd * x.sd, 0) / lots.reduce((a, x) => a + (x.n - 1), 0));
        warn('medical_pool_df');
        warn('medical_no_source_example', { value: 'poolWeighting = df (A.3.1)' });
      } else {
        sd = Math.sqrt(sumSq(lots.map(x => x.sd)) / lots.length);
        if (ns.every(x => x !== null) && Math.max(...ns) / Math.min(...ns) > UNBALANCED_RATIO) warn('medical_unbalanced_lots', { value: id });
      }
      n = ns.every(x => x !== null) ? ns.reduce((a, b) => a + b, 0) : null;
      extra = { lots, poolWeighting };
    } else if (groups[0] === 'systems') {
      // Ref: ISO/TS 20914:2019 A.4 — u(A,B,…) = s(o'rtachalar); u_Rw(pooled) = √(Σs_i²/m); u(pooled) = √(u(A,B,…)² + u_Rw(pooled)²)
      const systems = L.systems.map((x, j) => ({ id: String(x.id || j + 1), ...stats(x, `${where}.systems[${j}]`, log) }));
      if (systems.length < 2) fail('medical_too_few', `${where}.systems`);
      const means = systems.map(x => x.mean);
      mean = meanOf(means);
      const between = Math.sqrt(means.reduce((a, v) => a + (v - mean) ** 2, 0) / (means.length - 1));
      const within = Math.sqrt(sumSq(systems.map(x => x.sd)) / systems.length);
      sd = Math.sqrt(between * between + within * within);
      pooledParts = { between, within };
      n = systems.every(x => x.n !== null) ? systems.reduce((a, x) => a + x.n, 0) : null;
      extra = { systems };
    } else if (groups[0] === 'periods') {
      // Ref: ISO/TS 20914:2019 A.7, A.14 — har davr u_i = √(u_cal² + u_Rw,i²); u(pooled) = √(Σu_i²/m)
      if (isBlank(L.mean)) fail('medical_bad_data', `${where}.mean`);
      mean = num(L.mean, `${where}.mean`);
      periodRw = L.periods.map((x, j) => ({ id: String(x.id || j + 1), uRw: stats(x, `${where}.periods[${j}]`, log, false).sd }));
      sd = Math.sqrt(sumSq(periodRw.map(x => x.uRw)) / periodRw.length);
      if (!isBlank(L.n)) n = num(L.n, `${where}.n`, x => x >= 1);
    } else {
      ({ mean, sd, n } = stats(L, where, log));
    }
    if (!Number.isFinite(mean)) fail('medical_bad_data', `${where}.mean`);
    if (!log && mean === 0) fail('medical_zero_mean', where);
    if (n !== null && n < FEW_IQC) warn('medical_few_iqc', { value: `${id}: n = ${n}` });

    const uRw = both(sd, mean, log);
    const uCal = quantity(L.uCal || spec.uCal, mean, unit, `${where}.uCal`, log);
    let uBias = quantity(L.uBias || spec.uBias, mean, unit, `${where}.uBias`, log);
    if (bias && L.uBias) fail('medical_bad_spec', `${where}: bias + uBias`);
    if (bias && bias.apply) {
      // Ref: ISO/TS 20914:2019 C.5 — tuzatish qo'llanganda u_bias yig'indiga qo'shiladi; C.5.4 — proporsional tuzatishda nisbiy birliklarda
      uBias = bias.mode === 'proportional' ? { abs: Math.abs(mean) * bias.uBiasRel / 100, rel: bias.uBiasRel } : both(bias.uBias, mean, log);
    }
    const uCount = counting ? both(counting.u, mean, log) : null;
    const parts = [['uRw', uRw], ['uCal', uCal], ['uBias', uBias], ['uCount', uCount]].filter(([, q]) => q);
    let abs;
    if (periodRw) {
      const rest = parts.filter(([key]) => key !== 'uRw').reduce((a, [, q]) => a + q.abs * q.abs, 0);
      periodRw.forEach(p => { p.u = Math.sqrt(rest + p.uRw * p.uRw); });
      abs = Math.sqrt(sumSq(periodRw.map(p => p.u)) / periodRw.length);
      extra = { periods: periodRw };
    } else {
      // Ref: ISO/TS 20914:2019 A.2.2, Formula (A.1)–(A.2); A.2.4 Rule 1 — u(y) = √(u_cal² + u_bias² + u_Rw²)
      abs = Math.sqrt(parts.reduce((a, [, q]) => a + q.abs * q.abs, 0));
    }
    const u = both(abs, mean, log);
    if (!(abs > 0)) warn('zero_u', { value: id });
    const out = {
      id, mean, n, sd, cv: uRw.rel, uRw, uCal, uBias, ...(uCount ? { uCount } : {}),
      ...(pooledParts ? { uSystems: both(pooledParts.between, mean, log), uRwPooled: both(pooledParts.within, mean, log) } : {}),
      u, U: { abs: k * abs, rel: log ? null : k * u.rel },
      // log₁₀ shkalada standart nisbiy qiymatni faqat ma'lumot sifatida beradi (A.10)
      ...(log ? { logRel: mean !== 0 ? 100 * abs / Math.abs(mean) : null } : {}),
      interval: showInterval(readInterval(L.interval, where)),
      budget: parts.map(([key, q]) => ({ id: key, abs: q.abs, rel: q.rel, share: abs > 0 ? 100 * q.abs * q.abs / (abs * abs) : 0 })),
      ...extra,
    };
    if (allowable) {
      // Ref: ISO/TS 20914:2019 §5.2 — ruxsat etilgan maksimal noaniqlik bilan solishtirish (yaroqlilik; muvofiqlik bayonoti EMAS)
      const value = { u_rel: u.rel, U_rel: out.U.rel, u_abs: u.abs, U_abs: out.U.abs }[allowable.quantity];
      out.fitForPurpose = value <= allowable.limit;
      out.fit = { quantity: allowable.quantity, limit: allowable.limit, value, margin: allowable.limit - value };
      if (!out.fitForPurpose) warn('medical_not_fit', { value: id });
    }
    return out;
  });
  if (precisionType === 'repeatability') warn('medical_repeatability_only');
  else if (levels.some(L => !L.uCal)) warn('medical_no_calibrator');
  if (allowable && allowable.quantity !== 'U_abs') warn('medical_no_source_example', { value: `allowable.${allowable.quantity} (§5.2)` });

  // Oraliqlar: kesishmasligi shart
  const ivs = list.map((L, i) => readInterval(L.interval, `levels[${i}]`));
  for (let i = 0; i < ivs.length; i++) for (let j = i + 1; j < ivs.length; j++) {
    if (ivs[i] && ivs[j] && overlap(ivs[i], ivs[j])) fail('medical_interval_overlap', `${levels[i].id} / ${levels[j].id}`);
  }

  let y = null, applied = null, absU = null, relU = null, levelRule = null, coverage = null;
  if (spec.measurement && !isBlank(spec.measurement.value)) {
    y = toNum(spec.measurement.value);
    if (!Number.isFinite(y)) fail('medical_bad_data', 'measurement.value');
    if (ivs.some(Boolean)) {
      // Ref: ISO/TS 20914:2019 A.2.3, A.3.2, C.6.2 — natija qiymati oraliqqa tushgan daraja qo'llanadi
      const idx = ivs.findIndex(iv => iv && inside(iv, y));
      if (idx < 0) fail('medical_interval_gap', `y = ${y}`);
      applied = levels[idx]; levelRule = 'interval';
    } else {
      applied = levels.reduce((best, L) => (Math.abs(L.mean - y) < Math.abs(best.mean - y) ? L : best), levels[0]);
      levelRule = 'nearest';
      if (levels.length > 1) warn('medical_level_by_nearest', { value: applied.id });
    }
    if (log) {
      // Ref: ISO/TS 20914:2019 A.10 — log₁₀ birlikda U mutlaq; interval qayta o'tkazilganda asimmetrik
      absU = applied.U.abs;
      coverage = { low: y - absU, high: y + absU, backLow: Math.pow(10, y - absU), backHigh: Math.pow(10, y + absU) };
    } else {
      relU = applied.U.rel; absU = Math.abs(y) * relU / 100;
      coverage = { low: y - absU, high: y + absU };
    }
  }
  // Ref: ISO/TS 20914:2019 §5.4 — Option B (oddiy yaxlitlash); egasi qarori 23.11.2026: M9 da standart — half_up, `up` — sozlama
  const rounding = settings.rounding === 'up' ? 'up' : 'half_up';
  return {
    engineVersion: ENGINE_VERSION, mode: 'MEDICAL', format: MEDICAL_FORMAT,
    approach: 'IQC_LEVELS', approachRef: MEDICAL_SOURCE,
    unit, scale, precisionType, k, levels, bias, counting, allowable,
    y, appliedLevel: applied ? applied.id : null, levelRule, absU, relU, coverage,
    U: absU, uc: absU !== null ? absU / k : null,
    roundUp: rounding === 'up', rounding,
    warnings,
  };
}

/**
 * @param {object} spec { format:'uc-medical/1', unit, scale?, precisionType?, levels:[{id, values[] | (mean, cv | sd, n?) | lots[] | systems[] | (mean, periods[]),
 *   interval?, uCal?, uBias?}], uCal?, uBias?, bias?, counting?, allowable?, measurement?, settings?:{k=2, poolWeighting, rounding} } — docs/ENGINE_API.md §9.4
 */
export function evaluateMedical(spec) {
  try { return core(spec); } catch (e) {
    if (e instanceof Fail) return { error: e.code, detail: e.detail };
    throw e;
  }
}
