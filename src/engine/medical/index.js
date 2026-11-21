/* ═══════════════════════════════════════════════════════════════
   MEDICAL/INDEX.JS — tibbiy laboratoriya: IQC darajalari bo'yicha o'lchash noaniqligi (P10-B; P18 da kengaytirildi).
   Kirish formati: 'uc-medical/1' (docs/ENGINE_API.md §9.4).
   Manba: ISO/TS 20914:2019 (E), 1-nashr. Standart pullik — matni repoda YO'Q (joylanmaydi); etalon qiymatlar
   egasidagi nusxadan olingan va mustaqil qayta hisoblangan: tests/fixtures/iso20914/G1…G11.json.
     u(y) = √(u_Rw² + u_cal² [+ u_bias²])                         — A.2.2, A.2.4, C.5
     u_Rw (lotlar / sharoitlar bo'yicha) = √(Σ u_i² / m)            — A.3.1, Formula (A.8)
     bir nechta bir xil tizim: u = √(s(x̄_A, x̄_B, …)² + u_Rw(pooled)²) — A.4
     davrlar: u_i = √(u_cal² + u_Rw,i²); u = √(Σ u_i² / m)          — A.7, A.14
     u_bias = √(u_ref² + (SD/√n)²); |bias| > 2·u_bias — ahamiyatli  — C.5, Formula (C.1)–(C.4)
     log₁₀ o'lchanuvchi: u, U — log₁₀ birlikda (mutlaq); [10^(y−U); 10^(y+U)] — A.10
   U = k·u; nisbiy (%) ↔ mutlaq o'tkazish — har bir darajaning o'z o'rtachasi orqali.
   Har bir kattalikda `unit` yoki `relative: true` (nisbiy qiymatlar foizda); aralash — xato.
   Doiradan tashqarida: hisoblangan o'lchanuvchilar (anion gap, osmolallik, eGFR — A.2.4 Rule 1/2, A.6) — GUM rejimida.
   Sof modul (brauzer obyektlari yo'q). Natija YAXLITLANMAYDI (yaxlitlash — hisobot qatlamida).
═══════════════════════════════════════════════════════════════ */
import { ENGINE_VERSION } from '../version.js';
import { isBlank, toNum } from '../util.js';

export const MEDICAL_FORMAT = 'uc-medical/1';
export const MEDICAL_SOURCE = 'ISO/TS 20914:2019';

export const MEDICAL_WARNINGS = {
  medical_no_calibrator: { severity: 'warning', ref: 'ISO/TS 20914:2019 A.2.2: u(y) = √(u_Rw² + u_cal²) — kalibrator qiymati noaniqligi u_cal kiritilmagan' },
  medical_few_iqc: { severity: 'info', ref: 'Loyiha qoidasi (n < 20; me\'yoriy emas); ISO/TS 20914:2019 §6.3 — IQC natijalari uzoq muddatli o\'zgaruvchanlikni qamrashi kerak' },
  medical_level_by_nearest: { severity: 'warning', ref: 'Loyiha qoidasi (me\'yoriy emas): daraja qo\'llanish oralig\'i berilmagan — ISO/TS 20914:2019 A.2.3, A.3.2 ("IQC monitors interval") bo\'yicha oraliq ko\'rsatilishi kerak' },
  medical_repeatability_only: { severity: 'info', ref: 'ISO/TS 20914:2019 §6.3, A.2.3: takrorlanuvchanlik (u_r) uzoq muddatli sharoitlar uchun noaniqlikni kam baholaydi' },
  medical_unbalanced_lots: { severity: 'info', ref: 'ISO/TS 20914:2019 A.3.1: n lotlar orasida katta farq qilganda — muqobil (erkinlik darajalari bo\'yicha vaznli) yondashuv' },
  medical_bias_significant_not_applied: { severity: 'warning', ref: 'ISO/TS 20914:2019 §6.6, C.5, Formula (C.3): |bias| > 2·u_bias — bias ahamiyatli, tuzatish qo\'llanmagan' },
  medical_bias_incomplete: { severity: 'warning', ref: 'ISO/TS 20914:2019 C.5.3: tayanch qiymat noaniqligi u_ref berilmagan — u_bias kam baholangan' },
  zero_u: { severity: 'warning', ref: 'CLAUDE.md: U = 0 bo\'lgan natija ogohlantirishsiz hisobotga chiqmaydi' },
};
export const MEDICAL_ERRORS = ['medical_bad_spec', 'medical_bad_data', 'medical_need_levels', 'medical_need_scale', 'medical_mixed_scale', 'medical_zero_mean', 'medical_too_few',
  'medical_interval_gap', 'medical_interval_overlap'];
/** IQC natijalari soni shundan kam bo'lsa eslatma (loyiha parametri, me'yoriy emas). */
export const FEW_IQC = 20;
/** Lotlardagi n nisbati shundan katta bo'lsa (vaznsiz pooling da) eslatma — loyiha parametri (A.3.1 "n katta farq qilganda"). */
export const UNBALANCED_RATIO = 2;
/** Ref: ISO/TS 20914:2019 C.5, Formula (C.3) — ahamiyatlilik mezoni |bias| > 2·u_bias */
export const BIAS_FACTOR = 2;
const ALLOWABLE_KEYS = ['u_rel', 'U_rel', 'u_abs', 'U_abs'];

class Fail extends Error { constructor(code, detail) { super(code); this.code = code; this.detail = detail || ''; } }
const fail = (c, d) => { throw new Fail(c, d); };
const sumSq = a => a.reduce((s, v) => s + v * v, 0);
const avg = a => a.reduce((s, v) => s + v, 0) / a.length;

function num(v, where, test) {
  if (isBlank(v)) fail('medical_bad_data', where);
  const x = toNum(v);
  if (!Number.isFinite(x) || (test && !test(x))) fail('medical_bad_data', where);
  return x;
}
const optNum = (v, where, test) => (isBlank(v) ? null : num(v, where, test));

/** Qator (daraja, lot, tizim): values[] yoki (mean?, sd | cv, n?) → { mean, sd, n }. mean bo'lmasligi mumkin (faqat mutlaq hisob). */
function dispersion(item, where, log) {
  const vals = Array.isArray(item.values) ? item.values.filter(v => !isBlank(v)).map(toNum) : [];
  if (vals.length) {
    if (vals.some(v => !Number.isFinite(v))) fail('medical_bad_data', `${where}.values`);
    if (vals.length < 2) fail('medical_too_few', where);
    const n = vals.length, mean = avg(vals);
    // Ref: JCGM 100:2008 §4.2.2 Eq. (4) — tajriba standart og'ishi
    return { mean, sd: Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1)), n };
  }
  const mean = optNum(item.mean, `${where}.mean`);
  if (mean === 0 && !log) fail('medical_zero_mean', where);
  let sd;
  if (!isBlank(item.cv)) {
    if (mean === null) fail('medical_bad_data', `${where}.mean`);
    if (log) fail('medical_mixed_scale', `${where}.cv`);
    sd = Math.abs(mean) * num(item.cv, `${where}.cv`, v => v >= 0) / 100;
  } else if (!isBlank(item.sd)) sd = num(item.sd, `${where}.sd`, v => v >= 0);
  else if (!isBlank(item.uRw)) sd = num(item.uRw, `${where}.uRw`, v => v >= 0);
  else fail('medical_bad_data', `${where}.sd`);
  return { mean, sd, n: optNum(item.n, `${where}.n`, v => v >= 1) };
}

/** Kattalik {value, relative:true} (foizda) yoki {value, unit} → {abs, rel} (daraja o'rtachasi orqali). */
function quantity(q, mean, unit, where, log) {
  if (!q || isBlank(q.value)) return null;
  const v = toNum(q.value);
  if (!(v >= 0)) fail('medical_bad_data', where);
  const rel = q.relative === true, abs = !isBlank(q.unit);
  if (rel && abs) fail('medical_mixed_scale', where);
  if (!rel && !abs) fail('medical_need_scale', where);
  if (abs && String(q.unit).trim() !== unit) fail('medical_mixed_scale', `${where}: ${q.unit} ≠ ${unit}`);
  if (rel && log) fail('medical_mixed_scale', `${where}: log10`);
  if (rel && mean === null) fail('medical_bad_data', `${where}: mean`);
  return rel ? { abs: Math.abs(mean) * v / 100, rel: v } : { abs: v, rel: mean === null || log ? null : 100 * v / Math.abs(mean) };
}

/**
 * u_bias ni sertifikatlangan tayanch material (CRM) dan hisoblash.
 * @param {object} b { xRef, URef + kRef (standart 2) | uRef, xLab, sd, n, apply?, mode?: 'absolute' | 'proportional' }
 * @param {number} [k=2] kengaytirilgan noaniqlik U_bias uchun qamrov koeffitsiyenti
 */
export function biasFromCrm(b, k = 2) {
  if (!b || typeof b !== 'object') fail('medical_bad_data', 'bias');
  const xRef = num(b.xRef, 'bias.xRef'), xLab = num(b.xLab, 'bias.xLab');
  const sd = num(b.sd, 'bias.sd', v => v >= 0), n = num(b.n, 'bias.n', v => v >= 1);
  const mode = isBlank(b.mode) ? 'absolute' : String(b.mode);
  if (!['absolute', 'proportional'].includes(mode)) fail('medical_bad_data', 'bias.mode');
  let uRef = null;
  if (!isBlank(b.uRef)) uRef = num(b.uRef, 'bias.uRef', v => v >= 0);
  else if (!isBlank(b.URef)) uRef = num(b.URef, 'bias.URef', v => v >= 0) / (isBlank(b.kRef) ? 2 : num(b.kRef, 'bias.kRef', v => v > 0));
  // Ref: ISO/TS 20914:2019 C.5, Formula (C.1) — laboratoriya o'rtachasining standart og'ishi SD_mean = SD/√n
  const sdMean = sd / Math.sqrt(n);
  // Ref: ISO/TS 20914:2019 C.5, Formula (C.2), (C.4) — u_bias = √(u_ref² + SD_mean²)
  const uBias = Math.sqrt((uRef === null ? 0 : uRef * uRef) + sdMean * sdMean);
  const bias = xRef - xLab;
  return {
    xRef, uRef, xLab, sd, n, sdMean, uBias, UBias: k * uBias, bias,
    biasPct: xRef !== 0 ? 100 * bias / xRef : null,
    uBiasRel: xRef !== 0 ? 100 * uBias / Math.abs(xRef) : null,
    // Ref: ISO/TS 20914:2019 C.5, Formula (C.3) — |bias| > 2·u_bias bo'lsa bias ahamiyatli
    significant: Math.abs(bias) > BIAS_FACTOR * uBias,
    incomplete: uRef === null, apply: b.apply === true, mode,
  };
}

/** Daraja qo'llanish oralig'i (A.2.3, A.3.2 jadvallari — "IQC monitors interval"): standart [low; high). */
function parseInterval(iv, where) {
  if (iv === undefined || iv === null) return null;
  const low = optNum(iv.low, `${where}.interval.low`), high = optNum(iv.high, `${where}.interval.high`);
  if (low === null && high === null) return null;
  if (low !== null && high !== null && !(low < high)) fail('medical_bad_data', `${where}.interval`);
  return { low, high, lowInclusive: iv.lowInclusive !== false, highInclusive: iv.highInclusive === true };
}
const inInterval = (iv, y) => (iv.low === null || y > iv.low || (iv.lowInclusive && y === iv.low)) && (iv.high === null || y < iv.high || (iv.highInclusive && y === iv.high));
function overlap(a, b) {
  const lo = (a.low === null ? -Infinity : a.low), lo2 = (b.low === null ? -Infinity : b.low);
  const hi = (a.high === null ? Infinity : a.high), hi2 = (b.high === null ? Infinity : b.high);
  const L = Math.max(lo, lo2), H = Math.min(hi, hi2);
  if (L < H) return true;
  if (L > H) return false;
  const lInc = (lo < L || a.lowInclusive) && (lo2 < L || b.lowInclusive), hInc = (hi > H || a.highInclusive) && (hi2 > H || b.highInclusive);
  return lInc && hInc;
}

function core(spec) {
  if (!spec || typeof spec !== 'object') fail('medical_bad_spec');
  const settings = spec.settings || {};
  const k = isBlank(settings.k) ? 2 : toNum(settings.k);
  if (!(k > 0)) fail('medical_bad_data', 'settings.k');
  if (isBlank(spec.unit)) fail('medical_need_scale', 'unit');
  const unit = String(spec.unit).trim();
  const scale = isBlank(spec.scale) ? 'linear' : String(spec.scale);
  if (!['linear', 'log10'].includes(scale)) fail('medical_bad_data', 'scale');
  const log = scale === 'log10';
  const precisionType = isBlank(spec.precisionType) ? 'long_term' : String(spec.precisionType);
  if (!['long_term', 'repeatability'].includes(precisionType)) fail('medical_bad_data', 'precisionType');
  const poolWeighting = isBlank(settings.poolWeighting) ? 'none' : String(settings.poolWeighting);
  if (!['none', 'df'].includes(poolWeighting)) fail('medical_bad_data', 'settings.poolWeighting');
  const list = Array.isArray(spec.levels) ? spec.levels : [];
  const hasBias = spec.bias !== undefined && spec.bias !== null;
  if (!list.length && !hasBias) fail('medical_need_levels');
  const warnings = [];
  const warn = (code, extra) => warnings.push({ code, ...MEDICAL_WARNINGS[code], ...(extra || {}) });

  // u_bias — CRM dan (C.5). Tayyor u_bias (`uBias`) bilan birga berilmaydi.
  const bias = hasBias ? biasFromCrm(spec.bias, k) : null;
  if (bias) {
    if (spec.uBias || list.some(L => L && L.uBias)) fail('medical_bad_data', 'bias + uBias');
    if (bias.mode === 'proportional' && (log || bias.xRef === 0)) fail('medical_mixed_scale', 'bias.mode');
    if (bias.incomplete) warn('medical_bias_incomplete');
    // Ref: ISO/TS 20914:2019 §6.6 — ahamiyatli biasni tuzatish yoki tuzatmaslik qarorini laboratoriya qabul qiladi
    if (bias.significant && !bias.apply) warn('medical_bias_significant_not_applied', { value: `bias = ${bias.bias}; 2·u_bias = ${BIAS_FACTOR * bias.uBias}` });
  }

  // Ref: ISO/TS 20914:2019 §6.10 — sanoq (Puasson): u = √count. Byudjetga faqat `apply: true` bo'lsa (nisbiy hissa sifatida) kiradi.
  let counting = null;
  if (spec.counting !== undefined && spec.counting !== null) {
    const count = num(spec.counting.count, 'counting.count', v => v > 0);
    counting = { count, u: Math.sqrt(count), rel: 100 / Math.sqrt(count), apply: spec.counting.apply === true };
    if (counting.apply && log) fail('medical_mixed_scale', 'counting: log10');
  }

  // Ref: ISO/TS 20914:2019 §5.2 — ruxsat etilgan maksimal noaniqlik (yaroqlilik; muvofiqlik bayonoti EMAS)
  let allowable = null;
  if (spec.allowable !== undefined && spec.allowable !== null) {
    const keys = ALLOWABLE_KEYS.filter(key => !isBlank(spec.allowable[key]));
    if (keys.length !== 1) fail('medical_bad_data', 'allowable');
    allowable = { kind: keys[0], value: num(spec.allowable[keys[0]], 'allowable', v => v > 0) };
    if (log && /_rel$/.test(allowable.kind)) fail('medical_mixed_scale', 'allowable: log10');
  }

  const levels = list.map((L, i) => {
    const where = `levels[${i}]`;
    if (!L || typeof L !== 'object') fail('medical_bad_data', where);
    const id = String(L.id || `L${i + 1}`);
    const groups = ['lots', 'systems', 'periods'].filter(g => Array.isArray(L[g]) && L[g].length);
    if (groups.length > 1) fail('medical_bad_data', `${where}: ${groups.join(' + ')}`);
    let mean, sd, n, pooled = null, periodU = null;
    if (groups[0] === 'lots' || groups[0] === 'systems') {
      const kind = groups[0];
      const items = L[kind].map((it, j) => ({ id: String((it && it.id) || j + 1), ...dispersion(it || {}, `${where}.${kind}[${j}]`, log) }));
      const m = items.length;
      if (m < 2) fail('medical_too_few', `${where}.${kind}`);
      const means = items.map(it => it.mean);
      if (means.some(v => v === null) && (kind === 'systems' || means.some(v => v !== null))) fail('medical_bad_data', `${where}.${kind}: mean`);
      // Ref: ISO/TS 20914:2019 A.3.2, A.3.3, A.4 — daraja o'rtachasi = lot / tizim o'rtachalarining arifmetik o'rtachasi
      mean = means[0] === null ? null : avg(means);
      n = items.every(it => it.n !== null) ? items.reduce((a, it) => a + it.n, 0) : null;
      if (kind === 'lots') {
        if (poolWeighting === 'df') {
          if (items.some(it => it.n === null || !(it.n >= 2))) fail('medical_bad_data', `${where}.lots: n`);
          // Ref: ISO/TS 20914:2019 A.3.1 — muqobil yondashuv (n katta farq qilganda): u_Rw = √(Σ(n_i − 1)·u_i² / Σ(n_i − 1))
          sd = Math.sqrt(items.reduce((a, it) => a + (it.n - 1) * it.sd * it.sd, 0) / items.reduce((a, it) => a + (it.n - 1), 0));
        } else {
          // Ref: ISO/TS 20914:2019 A.3.1, Formula (A.8) — u_Rw = √(Σ u_i² / m)
          sd = Math.sqrt(sumSq(items.map(it => it.sd)) / m);
          const ns = items.map(it => it.n).filter(v => v !== null);
          if (ns.length === m && Math.max(...ns) / Math.min(...ns) > UNBALANCED_RATIO) warn('medical_unbalanced_lots', { value: `${id}: n = ${ns.join(', ')}` });
        }
        pooled = { kind, weighting: poolWeighting, m, items };
      } else {
        // Ref: ISO/TS 20914:2019 A.4 — u(A, B, …) = tizim o'rtachalarining standart og'ishi (n − 1 bilan)
        const uBetween = Math.sqrt(means.reduce((a, v) => a + (v - mean) ** 2, 0) / (m - 1));
        // Ref: ISO/TS 20914:2019 A.4 — u_Rw(pooled) = √(Σ SD_i² / m)
        const uRwPooled = Math.sqrt(sumSq(items.map(it => it.sd)) / m);
        // Ref: ISO/TS 20914:2019 A.4 — u(pooled) = √(u(A, B, …)² + u_Rw(pooled)²)
        sd = Math.sqrt(uBetween * uBetween + uRwPooled * uRwPooled);
        pooled = { kind, m, items, uBetween, uRwPooled };
      }
    } else if (groups[0] === 'periods') {
      const items = L.periods.map((it, j) => ({ id: String((it && it.id) || j + 1), uRw: num(it && (isBlank(it.uRw) ? it.sd : it.uRw), `${where}.periods[${j}].uRw`, v => v >= 0) }));
      if (items.length < 2) fail('medical_too_few', `${where}.periods`);
      mean = optNum(L.mean, `${where}.mean`);
      if (mean === 0 && !log) fail('medical_zero_mean', where);
      n = optNum(L.n, `${where}.n`, v => v >= 1);
      sd = Math.sqrt(sumSq(items.map(it => it.uRw)) / items.length);
      periodU = items;
      pooled = { kind: 'periods', m: items.length, items };
    } else ({ mean, sd, n } = dispersion(L, where, log));

    const relOf = abs => (mean === null || log ? null : 100 * abs / Math.abs(mean));
    if (n !== null && n < FEW_IQC) warn('medical_few_iqc', { value: `${id}: n = ${n}` });
    const uRw = { abs: sd, rel: relOf(sd) };
    const uCal = quantity(L.uCal || spec.uCal, mean, unit, `${where}.uCal`, log);
    let uBias = quantity(L.uBias || spec.uBias, mean, unit, `${where}.uBias`, log);
    if (bias && bias.apply) {
      if (bias.mode === 'proportional') {
        // Ref: ISO/TS 20914:2019 C.5.4 — proporsional tuzatish: u_bias nisbiy birliklarda birlashtiriladi
        if (mean === null) fail('medical_bad_data', `${where}: mean`);
        uBias = { abs: Math.abs(mean) * bias.uBiasRel / 100, rel: bias.uBiasRel };
      } else uBias = { abs: bias.uBias, rel: relOf(bias.uBias) }; // Ref: ISO/TS 20914:2019 C.5, C.6 — u(y) = √(u_bias² + u_cal² + u_Rw²)
    }
    let uCount = null;
    if (counting && counting.apply) {
      if (mean === null) fail('medical_bad_data', `${where}: mean`);
      uCount = { abs: Math.abs(mean) * counting.rel / 100, rel: counting.rel };
    }
    const parts = [['uRw', uRw], ['uCal', uCal], ['uBias', uBias], ['uCount', uCount]].filter(([, q]) => q);
    let abs;
    if (periodU) {
      // Ref: ISO/TS 20914:2019 A.7, A.14 — har bir davr uchun u_i = √(u_cal² + u_Rw,i²), so'ng u = √(Σ u_i² / m)
      const fixed = sumSq(parts.filter(([key]) => key !== 'uRw').map(([, q]) => q.abs));
      periodU.forEach(it => { it.u = Math.sqrt(fixed + it.uRw * it.uRw); });
      abs = Math.sqrt(sumSq(periodU.map(it => it.u)) / periodU.length);
    } else abs = Math.sqrt(sumSq(parts.map(([, q]) => q.abs))); // Ref: ISO/TS 20914:2019 A.2.2 — u(y) = √(u_Rw² + u_cal²)
    const rel = relOf(abs);
    if (!(abs > 0)) warn('zero_u', { value: id });
    const out = {
      id, mean, n, sd, cv: uRw.rel, uRw, uCal, uBias, uCount,
      u: { abs, rel }, U: { abs: k * abs, rel: rel === null ? null : k * rel },
      budget: parts.map(([key, q]) => ({ id: key, abs: q.abs, rel: q.rel, share: abs > 0 ? 100 * q.abs * q.abs / (abs * abs) : 0 })),
      interval: parseInterval(L.interval, where), pooled,
    };
    if (log && mean !== null) {
      // Ref: ISO/TS 20914:2019 A.10 — log₁₀ birlikda [x̄ − U; x̄ + U] va asl birlikda [10^(x̄−U); 10^(x̄+U)] (asimmetrik);
      // logRel = 100·u/x̄ — standartda faqat ma'lumot uchun (log₁₀ u_rel), hisobda ishlatilmaydi
      out.coverage = { low: mean - k * abs, high: mean + k * abs, backLow: 10 ** (mean - k * abs), backHigh: 10 ** (mean + k * abs) };
      out.logRel = mean !== 0 ? 100 * abs / Math.abs(mean) : null;
    }
    if (allowable) {
      const actual = { u_rel: out.u.rel, U_rel: out.U.rel, u_abs: out.u.abs, U_abs: out.U.abs }[allowable.kind];
      out.fitForPurpose = actual === null ? null : actual <= allowable.value;
      out.allowableMargin = actual === null ? null : allowable.value - actual;
    }
    return out;
  });
  if (precisionType === 'repeatability') warn('medical_repeatability_only');
  else if (levels.some(L => !L.uCal)) warn('medical_no_calibrator');

  const withIv = levels.filter(L => L.interval);
  for (let a = 0; a < withIv.length; a++) for (let b = a + 1; b < withIv.length; b++) {
    if (overlap(withIv[a].interval, withIv[b].interval)) fail('medical_interval_overlap', `${withIv[a].id}, ${withIv[b].id}`);
  }

  // O'lchangan natija: qiymati qo'llanish oralig'iga tushgan daraja (A.2.3, A.3.2); oraliqlar berilmagan bo'lsa —
  // eng yaqin o'rtacha (loyiha qoidasi, ogohlantirish bilan). Chiziqli shkalada darajaning NISBIY, log₁₀ da MUTLAQ noaniqligi qo'llanadi.
  let y = null, applied = null, absU = null, relU = null, levelSelection = null, coverage = null;
  if (spec.measurement && !isBlank(spec.measurement.value)) {
    y = toNum(spec.measurement.value);
    if (!Number.isFinite(y)) fail('medical_bad_data', 'measurement.value');
    if (!levels.length) fail('medical_need_levels');
    if (withIv.length) {
      applied = withIv.find(L => inInterval(L.interval, y)) || null;
      if (!applied) fail('medical_interval_gap', `y = ${y}`);
      levelSelection = 'interval';
    } else {
      const cand = levels.filter(L => L.mean !== null);
      if (!cand.length) fail('medical_bad_data', 'levels: mean');
      applied = cand.reduce((best, L) => (Math.abs(L.mean - y) < Math.abs(best.mean - y) ? L : best), cand[0]);
      levelSelection = 'nearest';
      warn('medical_level_by_nearest', { value: applied.id });
    }
    if (applied.U.rel !== null) { relU = applied.U.rel; absU = Math.abs(y) * relU / 100; } else absU = applied.U.abs;
    if (log) coverage = { low: y - absU, high: y + absU, backLow: 10 ** (y - absU), backHigh: 10 ** (y + absU) };
  }
  return {
    engineVersion: ENGINE_VERSION, mode: 'MEDICAL', format: MEDICAL_FORMAT,
    approach: 'IQC_LEVELS', approachRef: MEDICAL_SOURCE,
    unit, k, scale, precisionType, poolWeighting, levels, bias, counting, allowable,
    y, appliedLevel: applied ? applied.id : null, levelSelection, absU, relU, coverage,
    U: absU, uc: absU !== null ? absU / k : null,
    roundUp: settings.rounding === 'up',
    warnings,
  };
}

/**
 * @param {object} spec { format:'uc-medical/1', unit, scale?:'linear'|'log10', precisionType?:'long_term'|'repeatability',
 *   levels:[{ id, values[] | (mean?, sd | cv, n?) | lots:[…] | systems:[…] | periods:[{uRw}] + mean, interval?:{low?, high?, lowInclusive=true, highInclusive=false}, uCal?, uBias? }],
 *   uCal?, uBias?, bias?:{ xRef, URef + kRef=2 | uRef, xLab, sd, n, apply, mode }, counting?:{ count, apply }, allowable?:{ u_rel | U_rel | u_abs | U_abs },
 *   measurement?, settings?:{ k=2, poolWeighting:'none'|'df' } }
 */
export function evaluateMedical(spec) {
  try { return core(spec); } catch (e) {
    if (e instanceof Fail) return { error: e.code, detail: e.detail };
    throw e;
  }
}
