/* ═══════════════════════════════════════════════════════════════
   CANONICAL.JS — kanonik JSON va SHA-256 (audit izi, eksport yaxlitligi).
   Kanonik ko'rinish: obyekt kalitlari Unicode kod nuqtalari tartibida, bo'shliqsiz,
   sonlar JSON.stringify bilan (eng qisqa qaytariladigan ko'rinish — deterministik),
   undefined maydonlar tashlab yuboriladi, ∞/NaN → null (JSON kabi).
   Kalitlar tartibi xeshga ta'sir qilmaydi (PLAN P05 talabiga ham tayyor).
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
