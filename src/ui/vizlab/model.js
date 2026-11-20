/* ═══════════════════════════════════════════════════════════════
   VIZLAB/MODEL.JS — P16: Vizual laboratoriyaning sof (DOM siz) mantiqi.
   QOIDA: bu yerda hech qanday metrologik formula QAYTA YOZILMAYDI. Har bir raqam dvigateldan olinadi:
     u_c, ν_eff, k, U, korrelyatsiya hadi → evaluate();  MCM → monteCarlo / createMonteCarlo;
     muvofiqlik → decide();  Westgard → westgard() (1₂s darvozasi bilan);  qamrov ellipsi → gaussianRegion().
   Bu modul faqat (1) o'quv namunalari uchun dvigatelga beriladigan KIRISH (spec) larni tuzadi,
   (2) rasm uchun ILLUSTRATIV tanlanma oladi — dvigatelning o'z generatori va tanlash funksiyalari bilan
   (bu tanlanmadan hech qanday natija hisoblanmaydi), (3) dvigatel natijalarini ko'rsatish uchun saralaydi.
   Hech narsa saqlanmaydi va hisobotga chiqmaydi.
═══════════════════════════════════════════════════════════════ */
import {
  evaluate, isMultiOutput, isImplicit, decide, westgard, zScores, targetLimits,
  createRng, MC_SEED, gaussianRegion, cholesky,
} from '../../engine/index.js';
import { sampleRect, sampleTriang, sampleArcsine, makeGauss, sampleMvn } from '../../engine/mc/distributions.js';

const clone = o => JSON.parse(JSON.stringify(o));

/* ── Joriy hisob ──────────────────────────────────────────────── */

/**
 * Joriy hisobning spec'i — src/js/report.js MCM uchun olgan yo'l bilan. Faqat bitta chiqishli, xatosiz va u_c > 0
 * bo'lgan hisob qaytariladi; aks holda null (laboratoriya o'quv modeliga o'tadi).
 * @param {{appState?:{get:Function}, UCTemplates?:{evaluateState:Function}}} win
 * @returns {{spec:object, result:object}|null}
 */
export function currentCalc(win) {
  try {
    if (!win || !win.appState || typeof win.appState.get !== 'function') return null;
    const st = win.appState.get();
    if (!st) return null;
    const raw = st.template && win.UCTemplates ? win.UCTemplates.evaluateState(st).state : st;
    if (!raw || isMultiOutput(raw) || isImplicit(raw)) return null;
    const spec = clone(raw);                       // nusxa: laboratoriya ilova holatiga tegmaydi
    const result = evaluate(spec);
    if (!result || result.error || !Number.isFinite(result.y) || !(result.uc > 0) || !(result.U > 0)) return null;
    return { spec, result };
  } catch (_) { return null; }
}

/* ── a) Monte-Karlo: o'quv modeli Y = X1 + X2 ─────────────────── */

/** Ustun manbaning (X1) tanlanadigan taqsimotlari. */
export const TEACH_DISTS = Object.freeze(['normal', 'rect', 'triang', 'ushape']);
/** O'quv modeli kirishlari: X1 — ustun manba (yarim kenglik a), X2 — normal (U, k = 2). */
export const TEACH_INPUTS = Object.freeze({ x1: 10, a1: 1, k1: 2, x2: 0, U2: 0.4, k2: 2 });

/** O'quv modeli spec'i (dvigatel uchun kirish). */
export function teachingSpec(dist) {
  const d = TEACH_DISTS.includes(dist) ? dist : 'rect';
  const t = TEACH_INPUTS;
  return {
    params: ['X1', 'X2'],
    measurements: { X1: [t.x1], X2: [t.x2] },
    directions: [],
    model: { formula: 'Y = X1 + X2', unit: '1' },
    settings: { paired: false, P: 0.95 },
    covB: {},
    typeB: [
      { name: 'X1', param: 'X1', halfWidth: t.a1, distribution: d, ...(d === 'normal' ? { k: t.k1 } : {}) },
      { name: 'X2', param: 'X2', halfWidth: t.U2, distribution: 'normal', k: t.k2 },
    ],
  };
}

/** O'quv modeli + dvigatel natijasi (joriy hisob bilan bir xil shaklda). */
export function teachingCalc(dist) {
  const spec = teachingSpec(dist);
  return { spec, result: evaluate(spec), teaching: true };
}

/** Dvigatel MCM'i ketma-ket shu M lar bilan (qat'iy M, bir xil urug') ishga tushiriladi. */
export const M_LADDER = Object.freeze([1e4, 2e4, 5e4, 1e5, 2e5, 5e5, 1e6]);
/** Laboratoriyadagi n_dig: 1 (δ kattaroq — M = 10⁶ da δ/5 ga erishiladi). Rasmiy hisob — Monte-Karlo yorlig'ida. */
export const LAB_NDIG = 1;

/**
 * Narvonning i-qadami uchun dvigatel sozlamalari. Oxirgi qadam — `validation: true`:
 * JCGM 101 §8 xulosasi (validated, delta, dLow, dHigh, validation) faqat o'sha natijadan o'qiladi.
 */
export function ladderOptions(i) {
  const last = i >= M_LADDER.length - 1;
  return { mode: 'fixed', M: M_LADDER[Math.min(i, M_LADDER.length - 1)], seed: MC_SEED, nDig: LAB_NDIG, validation: last };
}

/**
 * ILLUSTRATIV oqim (faqat o'quv modeli): dvigatel generatori (Wichmann–Hill) va JCGM 101 §6.4 tanlash funksiyalari.
 * Qaytgan funksiya har chaqiruvda bitta X1 + X2 qiymatini beradi — FAQAT rasm uchun.
 */
export function teachingSampler(dist, seed) {
  const t = TEACH_INPUTS;
  const rng = createRng(undefined, seed === undefined ? MC_SEED : seed);
  const u = rng.next, gauss = makeGauss(u);
  const d = TEACH_DISTS.includes(dist) ? dist : 'rect';
  const draw1 = {
    normal: () => t.a1 / t.k1 * gauss(),
    rect: () => sampleRect(u, -t.a1, t.a1),
    triang: () => sampleTriang(u, -t.a1, t.a1),
    ushape: () => sampleArcsine(u, -t.a1, t.a1),
  }[d];
  return () => t.x1 + draw1() + t.x2 + t.U2 / t.k2 * gauss();
}

/** Gistogramma idishi (sanash — metrologik qoida emas). */
export function makeHistogram(lo, hi, bins) {
  const counts = new Array(bins).fill(0);
  const w = (hi - lo) / bins;
  const h = {
    lo, hi, bins, width: w, counts, n: 0,
    add(v) {
      h.n++;
      const i = Math.floor((v - lo) / w);
      if (i >= 0 && i < bins) counts[i]++;
      return i;
    },
    /** Zichlik: ulush / idish kengligi (GUM egri chizig'i bilan bir masshtabda chizish uchun). */
    density(i) { return h.n ? counts[i] / (h.n * w) : 0; },
  };
  return h;
}

/* ── b) Muvofiqlik simulyatori ────────────────────────────────── */

/** Dvigatel hukmi → uch holat (rang / belgi uchun). Hukmning o'zi o'zgartirilmaydi. */
export const VERDICT_STATE = Object.freeze({ pass: 'accept', conditional_pass: 'guard', conditional_fail: 'guard', fail: 'reject' });

/**
 * Tolerans ±T (T = tMult·U, markazi — baza y), himoya zonasi w = r·U, o'lchangan qiymat y + pos·T.
 * Hammasi decide() dan: verdict, pc, acceptLower / acceptUpper, w, tur, specificRisk.
 * @param {{y:number, u:number, U:number}} base   evaluate() natijasidan
 * @param {{tMult:number, r:number, pos:number}} p
 */
export function conformityCase(base, p) {
  const T = p.tMult * base.U;
  const lower = base.y - T, upper = base.y + T, value = base.y + p.pos * T;
  const decision = decide({ value, u: base.u, U: base.U, lower, upper, rule: 'guard_band', r: p.r, statement: 'non_binary' });
  return { T, lower, upper, value, decision, state: decision.error ? null : VERDICT_STATE[decision.verdict] || null };
}

/* ── d) QC drifti ─────────────────────────────────────────────── */

/** O'quv nazorat materiali: belgilangan o'rtacha va s. */
export const QC_TARGET = Object.freeze({ mean: 100, s: 2 });
/** Qat'iy o'quv ketma-ketligi: avval nazorat ostida, keyin asta yuqoriga siljish (real ma'lumot emas). */
export const QC_SEQUENCE = Object.freeze([
  100.6, 98.8, 101.6, 99.6, 101.0, 97.8, 100.8, 99.2, 101.8, 100.4,
  102.4, 102.8, 102.6, 103.2, 103.6, 104.6, 104.8, 103.8, 105.2, 106.4,
]);

/** Birinchi n nuqta: z-ballar, chegaralar va Westgard tahlili — hammasi dvigateldan. */
export function qcStep(n, opts = {}) {
  const values = QC_SEQUENCE.slice(0, Math.max(0, Math.min(n, QC_SEQUENCE.length)));
  const z = zScores(values, QC_TARGET.mean, QC_TARGET.s);
  return { values, z, limits: targetLimits(QC_TARGET), westgard: westgard(z, { gate: opts.gate !== false }) };
}

/**
 * Qoidalar jurnali: har bir yangi nuqta kelganda dvigatel shu nuqtada qaysi qoidani belgiladi (fired)
 * va qaysi birini 1₂s darvozasi ushlab qoldi (suppressed). Faqat dvigatel natijalari o'qiladi.
 * @returns {{point:number, fired:string[], suppressed:string[]}[]}
 */
export function qcLog(upTo, opts = {}) {
  const out = [];
  for (let n = 1; n <= Math.min(upTo, QC_SEQUENCE.length); n++) {
    const wg = qcStep(n, opts).westgard, i = n - 1;
    const fired = (wg.flagged[i] || []).slice();
    const suppressed = (wg.suppressed || []).filter(s => s.indices.includes(i)).map(s => s.rule);
    if (fired.length || suppressed.length) out.push({ point: n, fired, suppressed });
  }
  return out;
}

/* ── e) Korrelyatsiya ─────────────────────────────────────────── */

/** O'quv kirishlari: x1, x2 va ularning standart noaniqliklari. */
export const CORR_INPUTS = Object.freeze({ x1: 10, x2: 6, u1: 1, u2: 0.6 });

/** Y = X1 ± X2, cov(x1, x2) = r·u1·u2 — dvigatelga kirish (Ref: JCGM 100:2008 §5.2.2 — hisob dvigatelda). */
export function corrSpec(r, sign) {
  const c = CORR_INPUTS;
  return {
    params: ['X1', 'X2'],
    measurements: { X1: [c.x1], X2: [c.x2] },
    directions: [],
    model: { formula: sign < 0 ? 'Y = X1 - X2' : 'Y = X1 + X2', unit: '1' },
    settings: { paired: false, P: 0.95 },
    covB: { 'X1|X2': r * c.u1 * c.u2 },
    typeB: [
      { name: 'X1', param: 'X1', halfWidth: c.u1, distribution: 'normal', k: 1 },
      { name: 'X2', param: 'X2', halfWidth: c.u2, distribution: 'normal', k: 1 },
    ],
  };
}

/** Ikkala model (yig'indi va ayirma) dvigatelda; kirishlarning 95 % ellipsi — gaussianRegion() dan. */
export function corrCase(r) {
  const c = CORR_INPUTS;
  const plus = evaluate(corrSpec(r, 1)), minus = evaluate(corrSpec(r, -1));
  const cov = r * c.u1 * c.u2;
  const Ux = [[c.u1 * c.u1, cov], [cov, c.u2 * c.u2]];             // dvigatelga berilgan kirish kovariatsiyasi
  const region = gaussianRegion([c.x1, c.x2], Ux, 0.95);
  const pair = (plus.pairs || [])[0];
  return { r, plus, minus, Ux, region, rEngine: pair ? pair.r : 0 };
}

/** ILLUSTRATIV nuqtalar buluti: N(x, U_x) — dvigatel generatori, Cholesky va sampleMvn (JCGM 101 C.5). */
export function corrCloud(Ux, n, seed) {
  const R = cholesky(Ux);
  if (!R) return [];
  const gauss = makeGauss(createRng(undefined, seed === undefined ? MC_SEED : seed).next);
  const z = [0, 0], o = [0, 0], out = [];
  for (let i = 0; i < n; i++) {
    sampleMvn(gauss, R, z, o);
    out.push([CORR_INPUTS.x1 + o[0], CORR_INPUTS.x2 + o[1]]);
  }
  return out;
}

/* ── f) Byudjet sezgirligi ────────────────────────────────────── */

/** Sirg'a chegaralari. */
export const SCALE_RANGE = Object.freeze({ min: 0.25, max: 3, step: 0.05 });
/** ν_eff shu qiymatdan kichik bo'lsa Monte-Karlo tavsiya qilinadi — LOYIHA QARORI (JCGM 101 §5.7 sifat mezonlarini beradi). */
export const NU_EFF_MC_HINT = 6;

/** Byudjet uchun o'quv modeli: A tur (n = 4) + ikkita B tur manba. */
export function budgetTeachingSpec() {
  return {
    params: ['X1', 'X2'],
    measurements: { X1: [10.02, 9.98, 10.05, 9.97], X2: [0] },
    directions: [],
    model: { formula: 'Y = X1 + X2', unit: '1' },
    settings: { paired: false, P: 0.95 },
    covB: {},
    typeB: [
      { name: 'X1 (B)', param: 'X1', halfWidth: 0.02, distribution: 'normal', k: 2 },
      { name: 'X2 (B)', param: 'X2', halfWidth: 0.05, distribution: 'rect' },
    ],
  };
}
export function budgetTeachingCalc() {
  const spec = budgetTeachingSpec();
  return { spec, result: evaluate(spec), teaching: true };
}

/**
 * Masshtablash mumkin bo'lgan manbalar — dvigatel byudjeti qatorlaridan.
 *   B tur: spec.typeB[j] (qo'lda kiritilgan; avtomatik histerezis emas);
 *   A tur: usul 1, yo'nalishsiz, n ≥ 2 sonli kuzatuvlar.
 * @returns {{row:number, kind:'A'|'B', name:string, param:string, typeB?:number}[]}
 */
export function scalableSources(spec, result) {
  const params = spec.params || [];
  const resolved = (spec.typeB || []).map(c => (params.includes(c.param) ? c.param : params[0]));
  const seen = {};
  const out = [];
  (result.budget || []).forEach((b, row) => {
    if (b.kind === 'B' && !b.auto) {
      const nth = seen[b.param] = (seen[b.param] === undefined ? 0 : seen[b.param] + 1);
      let k = -1, j = -1;
      for (let i = 0; i < resolved.length; i++) if (resolved[i] === b.param && ++k === nth) { j = i; break; }
      if (j >= 0 && b.u > 0) out.push({ row, kind: 'B', name: b.name, param: b.param, typeB: j });
    } else if (b.kind === 'A' && b.method === 1 && !b.directional && b.u > 0) {
      const obs = (spec.measurements || {})[b.param];
      if (Array.isArray(obs) && obs.length >= 2 && obs.every(v => typeof v === 'number' && Number.isFinite(v))) {
        out.push({ row, kind: 'A', name: b.name, param: b.param });
      }
    }
  });
  return out;
}

/**
 * Bitta manbaning u sini f marta o'zgartirilgan spec NUSXASI (asl spec o'zgarmaydi). f = 1 → asl spec'ning o'zi.
 *   B tur: manbaning ko'paytuvchisi (`sensitivity`) f ga ko'paytiriladi — dvigatelda u = |ko'paytuvchi|·u_B;
 *   A tur: kuzatuvlar o'rtacha atrofida f marta cho'ziladi (s va u_A f marta o'zgaradi, o'rtacha saqlanadi).
 * Natijaviy u_c, ν_eff, k, U — faqat evaluate() dan.
 */
export function scaleSource(spec, source, f) {
  if (!source || !(f > 0) || f === 1) return spec;
  const s = clone(spec);
  if (source.kind === 'B') {
    const c = s.typeB[source.typeB];
    const m = c.sensitivity === undefined || c.sensitivity === null || c.sensitivity === '' ? 1 : Number(c.sensitivity) || 0;
    c.sensitivity = m * f;
  } else {
    const obs = s.measurements[source.param];
    const mean = obs.reduce((a, v) => a + v, 0) / obs.length;
    s.measurements[source.param] = obs.map(v => mean + (v - mean) * f);
  }
  return s;
}

/** Masshtablangan hisob: { spec, result, factor }. */
export function sensitivityCase(spec, source, f) {
  const scaled = scaleSource(spec, source, f);
  return { spec: scaled, result: evaluate(scaled), factor: f };
}

/** Byudjet ulushlari (dvigatel `share` maydoni; hisoblanmagan bo'lsa contrib / u_c² emas — bo'sh qoldiriladi). */
export function shareRows(result) {
  return (result.budget || [])
    .map((b, row) => ({ row, kind: b.kind, name: b.name, share: Number.isFinite(b.share) ? b.share : null, u: b.u }))
    .filter(b => b.kind === 'A' || b.kind === 'B' || b.kind === 'corr');
}
