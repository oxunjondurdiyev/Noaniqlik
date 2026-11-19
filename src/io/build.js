/* ═══════════════════════════════════════════════════════════════
   BUILD.JS — build identifikatorining sof qismi (P13; egasi qarori A, 2026-11-19 — docs/RISKS.md R-22 (b)). DOM / tarmoq yo'q.
   Deploy (GitHub Actions, scripts/build-site.js) sayt ildiziga `build.json` yozadi:
     { format: 'uc-build/1', commit, shortSha, engineVersion, engineHash, builtAt, node, versions: [{ version, date, title }] }
   va har bir mahalliy modul havolasiga `?v=<shortSha>` qo'shadi. Repodagi manba kodi build qadamisiz ham ishlaydi:
   u holda build.json yo'q, havolalarda `?v=` yo'q — build "dev" (dvigatel xeshi bilan) deb ko'rsatiladi.
═══════════════════════════════════════════════════════════════ */

export const BUILD_FORMAT = 'uc-build/1';
export const SHORT_SHA_LENGTH = 12;
const HEX40 = /^[0-9a-f]{40}$/, HEX64 = /^[0-9a-f]{64}$/, SEMVER = /^\d+\.\d+\.\d+$/;
const SHORT = new RegExp(`^[0-9a-f]{${SHORT_SHA_LENGTH}}$`);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const text = (v, max) => (typeof v === 'string' && v.length <= max ? v : '');

/** build.json ni tekshirish va tozalash (noma'lum maydonlar tashlanadi). Yaroqsiz bo'lsa — null. */
export function cleanBuildInfo(j) {
  if (!j || typeof j !== 'object' || Array.isArray(j) || j.format !== BUILD_FORMAT) return null;
  if (!HEX40.test(j.commit || '') || !SHORT.test(j.shortSha || '') || !j.commit.startsWith(j.shortSha)) return null;
  if (!SEMVER.test(j.engineVersion || '') || !HEX64.test(j.engineHash || '') || !ISO.test(j.builtAt || '')) return null;
  const versions = (Array.isArray(j.versions) ? j.versions : []).slice(0, 200)
    .filter(v => v && SEMVER.test(v.version || ''))
    .map(v => ({ version: v.version, date: /^\d{4}-\d{2}-\d{2}$/.test(v.date || '') ? v.date : '', title: text(v.title, 300) }));
  return { format: BUILD_FORMAT, commit: j.commit, shortSha: j.shortSha, engineVersion: j.engineVersion, engineHash: j.engineHash,
    builtAt: j.builtAt, node: text(j.node, 20), versions };
}

/** Modul URL idagi versiya (`…/app.js?v=<shortSha>`); yo'q yoki yaroqsiz bo'lsa — null (lokal ishlab chiqish). */
export function versionOf(url) {
  const m = /[?&]v=([0-9a-f]+)(?:&|#|$)/.exec(String(url || ''));
  return m && SHORT.test(m[1]) ? m[1] : null;
}

/** Sahifadagi modullar eski build danmi (yangi versiya chiqqan)? build.json yo'q yoki sahifa versiyasiz — false (jim). */
export function isOutdated(loaded, build) {
  return !!loaded && !!build && build.shortSha !== loaded;
}

/**
 * Hisob hujjati ('uc-calc/1') va hisobot pasti uchun build belgisi.
 * @param {object|null} build        cleanBuildInfo() natijasi (deploy) yoki null
 * @param {{sha256?:string}|null} engine  tests/security/engine.sha256.json (lokal ishlash)
 * @returns {{ id:string, source:'commit'|'engine-hash' }|null}
 */
export function buildMark(build, engine) {
  if (build && SHORT.test(build.shortSha || '')) return { id: build.shortSha, source: 'commit' };
  if (engine && HEX64.test(engine.sha256 || '')) return { id: engine.sha256.slice(0, SHORT_SHA_LENGTH), source: 'engine-hash' };
  return null;
}

/** Fayldan kelgan build belgisini tozalash. */
export function cleanBuildMark(m) {
  if (!m || typeof m !== 'object' || !SHORT.test(m.id || '') || !['commit', 'engine-hash'].includes(m.source)) return null;
  return { id: m.id, source: m.source };
}
