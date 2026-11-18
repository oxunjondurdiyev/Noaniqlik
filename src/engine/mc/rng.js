/* ═══════════════════════════════════════════════════════════════
   MC/RNG.JS — to'g'ri burchakli R(0, 1) taqsimotdan psevdotasodifiy sonlar (P06). Sof modul.

   • 'wichmann-hill-2006' — kengaytirilgan Wichmann–Hill generatori (JCGM 101:2008 C.3.3, Table C.2, 61-bet):
     to'rtta multiplikativ kongruent generator (MCG) yig'indisining kasr qismi; davri 2¹²¹ (C.3.3.1),
     TestU01 BigCrush dan o'tadi (C.3.2.2). Yangi hisoblarning yagona generatori.
   • 'xorshift32-legacy' — ENGINE 1.0.0 … 2.5.0 dagi generator. FAQAT eski natijani aynan takrorlash uchun
     (audit izi); yangi hisoblar ishlatmaydi (C.3.2.1 talablariga javob bermaydi: davri 2³² − 1).

   Aniqlik isboti (JS sonlari — IEEE 754 binary64, butun sonlar 2⁵³ gacha aniq):
     C.3.3.3 ("64 bitli kompyuterlar uchun") shakli: i_j ← (a_j · i_j) mod d_j.
     1 ≤ i_j ≤ d_j − 1; eng katta ko'paytma j = 2 da:
       a_2 · (d_2 − 1) = 47 003 · 2 147 483 542 = 100 938 168 924 626 ≈ 1,009·10¹⁴ < 2⁵³ = 9 007 199 254 740 992.
     Ko'paytma aniq ifodalanadi, `%` (IEEE 754 qoldig'i) ham aniq — BigInt kerak emas.
     Bu shakl Table C.2 dagi 32 bitli shakl (i ← a·(i mod b) − c·⌊i/b⌋; manfiy bo'lsa + d) bilan aynan bir xil
     ketma-ketlik beradi (Schrage usuli: d = a·b + c) — tests/engine/mc-rng.test.js da 10⁵ qadamda tekshiriladi.
     w = Σ i_j / d_j va r = w − ⌊w⌋: bo'lish, qo'shish va ⌊·⌋ IEEE 754 da to'g'ri yaxlitlanadi, shuning uchun
     R(0, 1) ketma-ketligi har qanday JS muhitida (Node, brauzer) bit darajasida bir xil (C.3.2.1 c).
═══════════════════════════════════════════════════════════════ */

// Ref: JCGM 101:2008 C.3.3.2, Table C.2 (61-bet) — a, b, c, d konstantalari
export const WH_A = Object.freeze([11600, 47003, 23000, 33000]);
export const WH_B = Object.freeze([185127, 45688, 93368, 65075]);
export const WH_C = Object.freeze([10379, 10479, 19423, 8123]);
export const WH_D = Object.freeze([2147483123 + 456, 2147483123 + 420, 2147483123 + 300, 2147483123 + 0]);

export const RNG_DEFAULT = 'wichmann-hill-2006';
export const RNG_LEGACY = 'xorshift32-legacy';
export const RNG_NAMES = Object.freeze([RNG_DEFAULT, RNG_LEGACY]);

/** Standart urug' (R-06: urug' natijada va hisobotda ko'rsatiladi, foydalanuvchi o'zgartira oladi). */
export const MC_SEED = 20261110;

/* 32 bitli aralashtirish (MurmurHash3 fmix32) — bitta butun urug'dan to'rtta boshlang'ich holat olish uchun.
   LOYIHA QARORI: JCGM 101 Table C.2 faqat "1 … 2 147 483 647 oralig'idagi butun sonlar" deydi, bitta urug'dan
   to'rttasini olish usulini belgilamaydi. Math.imul va bit amallari har qanday muhitda bir xil. */
function fmix32(h) {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Urug'dan generator holati (i1…i4).
 * @param {number|number[]} seed  butun son (0 … 2³² − 1) yoki to'rtta butun son [i1, i2, i3, i4] (1 ≤ i_j < d_j)
 * @returns {number[]|null}  noto'g'ri urug'da null
 */
export function whState(seed) {
  if (Array.isArray(seed)) {
    if (seed.length !== 4) return null;
    for (let j = 0; j < 4; j++) if (!Number.isInteger(seed[j]) || seed[j] < 1 || seed[j] >= WH_D[j]) return null;
    return seed.slice();
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return null;
  const st = [];
  // 1 ≤ i_j ≤ d_j − 1: MCG holati 0 bo'lsa, u 0 da qolib ketadi
  for (let j = 0; j < 4; j++) st.push(1 + fmix32((seed + Math.imul(j + 1, 0x9e3779b9)) >>> 0) % (WH_D[j] - 1));
  return st;
}

/**
 * Kengaytirilgan Wichmann–Hill generatori.
 * @returns {{name:string, seed:(number|number[]), next:()=>number, state:()=>number[]}|null}
 */
export function wichmannHill(seed) {
  const st = whState(seed === undefined ? MC_SEED : seed);
  if (!st) return null;
  let i1 = st[0], i2 = st[1], i3 = st[2], i4 = st[3];
  const next = () => {
    for (;;) {
      // Ref: JCGM 101:2008 C.3.3.3 — a) i_j = (a_j × i_j) mod d_j (64 bitli shakl; ko'paytma < 2⁵³ — yuqoridagi isbot)
      i1 = (11600 * i1) % 2147483579;
      i2 = (47003 * i2) % 2147483543;
      i3 = (23000 * i3) % 2147483423;
      i4 = (33000 * i4) % 2147483123;
      // Ref: JCGM 101:2008 Table C.2 — b) w = Σ i_j / d_j;  c) r = w − ⌊w⌋
      const w = i1 / 2147483579 + i2 / 2147483543 + i3 / 2147483423 + i4 / 2147483123;
      const r = w - Math.floor(w);
      // Ref: JCGM 101:2008 C.2 Note 3 — 0 yoki 1 qiymati boshqa taqsimotlarga o'tishda (ln r) ishdan chiqaradi.
      // Suzuvchi nuqtada r = 0 juda kam, lekin mumkin (yig'indi butun songa yaxlitlansa) — keyingi son olinadi.
      if (r > 0 && r < 1) return r;
    }
  };
  return { name: RNG_DEFAULT, seed: seed === undefined ? MC_SEED : seed, next, state: () => [i1, i2, i3, i4] };
}

/** Table C.2 dagi 32 bitli shakl (Schrage) — faqat testda 64 bitli shakl bilan solishtirish uchun. */
export function wichmannHillStep32(st) {
  const out = [];
  for (let j = 0; j < 4; j++) {
    // Ref: JCGM 101:2008 Table C.2 — a) i) i_j = a_j × (i_j mod b_j) − c_j × ⌊i_j / b_j⌋;  ii) i_j < 0 bo'lsa + d_j
    let i = WH_A[j] * (st[j] % WH_B[j]) - WH_C[j] * Math.floor(st[j] / WH_B[j]);
    if (i < 0) i += WH_D[j];
    out.push(i);
  }
  return out;
}

/**
 * xorshift32 (ENGINE ≤ 2.5.0). O'zgartirilmaydi: eski natijalar shu ketma-ketlikka bog'liq.
 * Ref: JCGM 101:2008 C.3.2.1 talablariga mos EMAS (RISKS R-06) — faqat takrorlash uchun.
 */
export function xorshift32(seed) {
  let s = seed >>> 0 || 0x9e3779b9;
  const next = () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return (s + 0.5) / 4294967296;
  };
  return { name: RNG_LEGACY, seed, next, state: () => [s] };
}

/** Nomi bo'yicha generator; noma'lum nom yoki noto'g'ri urug' — null. */
export function createRng(name, seed) {
  if (name === undefined || name === null || name === RNG_DEFAULT) return wichmannHill(seed);
  if (name === RNG_LEGACY) return xorshift32(seed === undefined ? MC_SEED : seed);
  return null;
}
