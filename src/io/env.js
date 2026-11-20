/* ═══════════════════════════════════════════════════════════════
   ENV.JS — hisob bajarilgan muhitning qisqa tavsifi (P13, docs/RISKS.md R-24, egasi qarori B, 2026-11-19). Sof modul.
   Turli JS dvigatellarida (V8, SpiderMonkey, JavaScriptCore) Math.log / sin / cos / pow oxirgi xonada farq qilishi mumkin,
   shu sabab hisob hujjati ('uc-calc/1') va bosma hisobotga brauzerning QISQA nomi va versiyasi yoziladi.
   To'liq userAgent satri SAQLANMAYDI (qurilma modeli, OS tafsilotlari kabi ortiqcha ma'lumot — minimallashtirish);
   Firebase'ga yozilmaydi. Natija: { name, version, engine } — faqat [A-Za-z0-9 ._-], uzunligi cheklangan.
═══════════════════════════════════════════════════════════════ */

export const ENV_UNKNOWN = Object.freeze({ name: 'unknown', version: '', engine: 'unknown' });
const MAX = 40;
const SAFE = /^[A-Za-z0-9 ._-]*$/;

// Tartib muhim: aniqroq belgi oldin (Edge / Opera / Yandex UA sida "Chrome" ham, Chrome UA sida "Safari" ham bor).
// iOS dagi barcha brauzerlar (CriOS, FxiOS, EdgiOS) WebKit / JavaScriptCore da ishlaydi.
const RULES = [
  [/\bEdgiOS\/([\d.]+)/, 'Edge (iOS)', 'JavaScriptCore'],
  [/\bCriOS\/([\d.]+)/, 'Chrome (iOS)', 'JavaScriptCore'],
  [/\bFxiOS\/([\d.]+)/, 'Firefox (iOS)', 'JavaScriptCore'],
  [/\bEdg(?:A)?\/([\d.]+)/, 'Edge', 'V8'],
  [/\bOPR\/([\d.]+)/, 'Opera', 'V8'],
  [/\bYaBrowser\/([\d.]+)/, 'Yandex', 'V8'],
  [/\bSamsungBrowser\/([\d.]+)/, 'Samsung Internet', 'V8'],
  [/\bHeadlessChrome\/([\d.]+)/, 'Chrome', 'V8'],
  [/\bChrom(?:e|ium)\/([\d.]+)/, 'Chrome', 'V8'],
  [/\bFirefox\/([\d.]+)/, 'Firefox', 'SpiderMonkey'],
  [/\bVersion\/([\d.]+).*\bSafari\//, 'Safari', 'JavaScriptCore'],
  [/\bNode\.js\/v?([\d.]+)/, 'Node.js', 'V8'],
];

const short = v => String(v).split('.').slice(0, 2).join('.');           // "157.0.7204.23" → "157.0"

/** userAgent satridan qisqa tavsif. Tanilmasa — ENV_UNKNOWN (taxmin qilinmaydi). */
export function describeEnvironment(userAgent) {
  const ua = typeof userAgent === 'string' ? userAgent.slice(0, 1024) : '';
  for (const [re, name, engine] of RULES) {
    const m = re.exec(ua);
    if (m) return { name, version: short(m[1]), engine };
  }
  return { ...ENV_UNKNOWN };
}

/** Node muhitining tavsifi (testlar va skriptlar uchun): describeEnvironment bilan bir xil shaklda. */
export function nodeEnvironment(version) {
  return describeEnvironment('Node.js/' + String(version || '').replace(/^v/, ''));
}

/** Tashqaridan (fayldan) kelgan tavsifni tozalash: noma'lum maydonlar tashlanadi, shubhali qiymat — null. */
export function cleanEnvironment(env) {
  if (!env || typeof env !== 'object' || Array.isArray(env)) return null;
  const pick = k => (typeof env[k] === 'string' && env[k].length <= MAX && SAFE.test(env[k]) ? env[k] : null);
  const name = pick('name'), version = pick('version'), engine = pick('engine');
  if (!name || version === null || engine === null) return null;
  return { name, version, engine };
}

/** Ko'rsatish uchun: "Chrome 157.0 (V8)"; noma'lum bo'lsa — ''. */
export function environmentText(env) {
  const e = cleanEnvironment(env);
  if (!e || e.name === ENV_UNKNOWN.name) return '';
  return `${e.name}${e.version ? ' ' + e.version : ''}${e.engine && e.engine !== 'unknown' ? ' (' + e.engine + ')' : ''}`;
}

/** Ikki muhit bitta JS dvigateli versiyasimi (bit darajasidagi takrorlanuvchanlik faqat shunda kafolatlanadi — R-24). */
export function sameEnvironment(a, b) {
  const x = cleanEnvironment(a), y = cleanEnvironment(b);
  return !!x && !!y && x.name === y.name && x.version === y.version && x.engine === y.engine;
}
