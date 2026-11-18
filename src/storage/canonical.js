/* ═══════════════════════════════════════════════════════════════
   CANONICAL.JS — kanonik JSON va SHA-256 (audit izi, eksport yaxlitligi).
   Kanonik ko'rinish: obyekt kalitlari Unicode kod nuqtalari tartibida, bo'shliqsiz,
   sonlar JSON.stringify bilan (eng qisqa qaytariladigan ko'rinish — deterministik),
   undefined maydonlar tashlab yuboriladi, ∞/NaN → null (JSON kabi).
   Kalitlar tartibi xeshga ta'sir qilmaydi (PLAN P05 talabiga ham tayyor).
   P05b: canonicalizeJcs() — RFC 8785 (JSON Canonicalization Scheme, JCS) ning qat'iy varianti: hisob eksporti va
   hisobot xeshi uchun. canonicalize() (audit zanjiri, P04) o'zgarmagan — eski zanjirlar xeshi saqlanadi.
   SHA-256 — Web Crypto (brauzer va Node ≥ 20: globalThis.crypto.subtle).
═══════════════════════════════════════════════════════════════ */

export function canonicalize(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return 'null';
    if (value === undefined) return 'null';
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(v => (v === undefined ? 'null' : canonicalize(v))).join(',') + ']';
  const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

/**
 * RFC 8785 (JCS) kanonik JSON.
 *   §3.2.3 — obyekt kalitlari UTF-16 kod birliklari tartibida (JS ning standart satr tartibi), rekursiv;
 *   §3.2.2.3 — sonlar ECMAScript Number → String (JSON.stringify bilan bir xil); NaN / ±∞ — XATO (I-JSON da yo'q);
 *   §3.2.2.2 — satrlar JSON.stringify qoidasi bilan (majburiy escape'lar, qolgani UTF-8 da o'zicha);
 *   bo'shliq yo'q. undefined qiymatli kalit tashlab yuboriladi (JSON.stringify kabi), massivda — xato.
 * Chekli bo'lmagan sonli natijalar (masalan ν_eff = ∞) uchun avval portable() dan o'tkaziladi.
 */
export function canonicalizeJcs(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number') {
    if (!Number.isFinite(value)) throw new Error('jcs_non_finite');
    return JSON.stringify(value);
  }
  if (t === 'string' || t === 'boolean') return JSON.stringify(value);
  if (t !== 'object') throw new Error('jcs_unsupported:' + t);
  if (Array.isArray(value)) return '[' + value.map(v => { if (v === undefined) throw new Error('jcs_undefined_in_array'); return canonicalizeJcs(v); }).join(',') + ']';
  const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalizeJcs(value[k])).join(',') + '}';
}

/** Chekli bo'lmagan sonlar uchun ko'chma ko'rinish: ∞ → {"$num":"Infinity"} (JSON da ∞ yo'q; null bilan aralashmasin). */
const NONFINITE = { Infinity: Infinity, '-Infinity': -Infinity, NaN: NaN };
export function portable(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : { $num: String(value) };
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(v => (v === undefined ? null : portable(v)));
  const out = {};
  for (const k of Object.keys(value)) if (value[k] !== undefined) out[k] = portable(value[k]);
  return out;
}
/** portable() ning teskarisi. */
export function fromPortable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(fromPortable);
  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === '$num' && Object.prototype.hasOwnProperty.call(NONFINITE, value.$num)) return NONFINITE[value.$num];
  const out = {};
  for (const k of keys) out[k] = fromPortable(value[k]);
  return out;
}

/** RFC 8785 kanonik JSON'ning SHA-256 xeshi (hex). */
export function jcsHash(value) {
  return sha256Hex(canonicalizeJcs(value));
}

function subtle() {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw new Error('webcrypto_unavailable');
  return c.subtle;
}

/** SHA-256 (hex) — matn UTF-8 da */
export async function sha256Hex(text) {
  const buf = await subtle().digest('SHA-256', new TextEncoder().encode(String(text)));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Kanonik JSON'ning SHA-256 xeshi */
export function hashOf(value) {
  return sha256Hex(canonicalize(value));
}
