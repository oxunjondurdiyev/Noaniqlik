/* ═══════════════════════════════════════════════════════════════
   UI/BUILD/WATCHER.JS — build ma'lumoti va "yangi versiya chiqdi" banneri (P13; egasi qarori A — docs/RISKS.md R-22 (b)).
   Muhit `env` orqali beriladi (fetch, document, tarjima) — Node testlarida soxta muhit bilan sinaladi.
   • build.json `cache: 'no-store'` bilan o'qiladi (har doim serverdan). Bo'lmasa (lokal ishlash, build qadamisiz) — JIM.
   • Sahifadagi modullar versiyasi (`?v=<shortSha>`) build.json dagidan farq qilsa — banner. AVTOMATIK QAYTA YUKLASH YO'Q:
     kiritilgan ma'lumot yo'qolmasin; foydalanuvchi o'zi yangilaydi. Banner yopilishi mumkin (shu build uchun).
   • Matn faqat textContent orqali; inline skript / onclick yo'q (CSP `script-src 'self'`).
═══════════════════════════════════════════════════════════════ */
import { cleanBuildInfo, isOutdated, buildMark } from '../../io/build.js';

export const BUILD_URL = 'build.json';
export const ENGINE_HASH_URL = 'tests/security/engine.sha256.json';   // faqat lokal ishlashda (deploy'da build.json bor)
export const RECHECK_MS = 10 * 60 * 1000;                              // yorliq qayta ko'ringanda tekshiruv oralig'i

/**
 * @param {object} env
 * @param {Function} env.fetch
 * @param {Document|null} [env.document]
 * @param {(key:string)=>string} [env.t]
 * @param {string|null} env.loaded      sahifadagi modul versiyasi (versionOf(import.meta.url))
 * @param {()=>number} [env.now]
 */
export function createBuildWatcher(env) {
  const now = env.now || (() => Date.now());
  let last = null, lastAt = -Infinity, pending = null, dismissed = null, enginePromise = null;

  async function fetchJson(url, cache) {
    try {
      const r = await env.fetch(url, { cache });
      return r && r.ok ? await r.json() : null;
    } catch (_) { return null; }
  }
  /** build.json (tozalangan) yoki null. `force` — keshlangan javobni chetlab qayta o'qish. */
  function info(force) {
    if (pending) return pending;
    if (!force && lastAt > -Infinity) return Promise.resolve(last);
    pending = fetchJson(BUILD_URL, 'no-store').then(j => { last = cleanBuildInfo(j); lastAt = now(); pending = null; return last; });
    return pending;
  }
  /** Lokal ishlash uchun dvigatel xeshi ({ sha256, engineVersion } yoki null). */
  function engineHash() {
    if (!enginePromise) enginePromise = fetchJson(ENGINE_HASH_URL, 'no-cache').then(j => (j && typeof j.sha256 === 'string' ? { sha256: j.sha256, engineVersion: j.engineVersion } : null));
    return enginePromise;
  }
  /** Hisobot pasti uchun: { shortSha?, sha256?, engineVersion } yoki null. */
  async function forReport() {
    const b = await info();
    if (b) return { shortSha: b.shortSha, sha256: b.engineHash, engineVersion: b.engineVersion };
    return engineHash();
  }
  /** Hisob hujjati ('uc-calc/1') uchun build belgisi. */
  async function mark() {
    const b = await info();
    return buildMark(b, b ? null : await engineHash());
  }

  function banner(build) {
    const doc = env.document;
    if (!doc || !doc.body) return null;
    let el = doc.getElementById('build-banner');
    if (!build) { if (el) el.remove(); return null; }
    const t = env.t || (k => k);
    if (!el) {
      el = doc.createElement('div');
      el.id = 'build-banner';
      el.className = 'build-banner';
      el.setAttribute('role', 'status');
      const text = doc.createElement('span');
      text.className = 'build-banner-text';
      const close = doc.createElement('button');
      close.type = 'button';
      close.className = 'btn btn-ghost btn-sm build-banner-close';
      close.addEventListener('click', () => { dismissed = el.dataset.build; el.remove(); });
      el.appendChild(text);
      el.appendChild(close);
      doc.body.insertBefore(el, doc.body.firstChild);
    }
    el.dataset.build = build.shortSha;
    el.querySelector('.build-banner-text').textContent = t('bld_new_version');
    el.querySelector('.build-banner-close').textContent = t('bld_dismiss');
    return el;
  }
  /** Tekshiruv: eskirgan bo'lsa banner. @returns {Promise<boolean>} eskirganmi */
  async function check(force) {
    const b = await info(force);
    const old = isOutdated(env.loaded, b);
    if (old && dismissed !== b.shortSha) banner(b);
    return old;
  }
  /** Til o'zgarganda banner matnini yangilash. */
  function relabel() {
    const doc = env.document;
    if (doc && doc.getElementById('build-banner') && last) banner(last);
  }
  /** Yorliq qayta ko'ringanda (oxirgi tekshiruvdan RECHECK_MS o'tgan bo'lsa) qayta tekshirish. */
  function onVisible() {
    if (now() - lastAt >= RECHECK_MS) return check(true);
    return Promise.resolve(false);
  }
  return { info, engineHash, forReport, mark, check, relabel, onVisible };
}
