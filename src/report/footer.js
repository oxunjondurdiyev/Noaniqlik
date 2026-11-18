/* ═══════════════════════════════════════════════════════════════
   FOOTER.JS — hisobotning pastki qismi (P05b). Sof modul.
   Tarkibi: dastur nomi va ENGINE_VERSION; build identifikatori; shablon ID va versiyasi; hisob sanasi va ID si;
   kanonik JSON'dan SHA-256 (RFC 8785 JCS — src/storage/canonical.js, hujjat 'uc-calc/1'); QR (xesh va hisob ID si).
   Build identifikatori: sayt statik (build bosqichi yo'q), commit SHA mavjud emas — standart sifatida
   tests/security/engine.sha256.json dagi DVIGATEL XESHI (src/engine + src/report fayllari) ishlatiladi (egasi qarori,
   P05b topshirig'i). /verify sahifasi — P11 dan keyin; hozircha QR da havola yo'q.
═══════════════════════════════════════════════════════════════ */

export const APP_NAME = 'UncertaintyCalc';

/** QR mazmuni: hisob ID si va kanonik xesh (URL emas — /verify sahifasi hali yo'q). */
export function qrPayload(id, hash) {
  return `uc-calc:${id};sha256:${hash}`;
}

/**
 * Pastki qism modeli.
 * @param {{engineVersion:string, build?:{sha256?:string, engineVersion?:string}|null, template?:object|null,
 *          meta:{id:string, createdAt:string}, hash:string}} o
 */
export function footerModel(o) {
  const tm = o.template || null;
  const b = o.build && typeof o.build.sha256 === 'string' && /^[0-9a-f]{64}$/.test(o.build.sha256) ? o.build : null;
  return {
    app: APP_NAME,
    engineVersion: o.engineVersion || '',
    build: b ? b.sha256.slice(0, 12) : '',                 // dvigatel xeshining boshi
    buildMatches: b ? b.engineVersion === o.engineVersion : null,
    template: tm && tm.id ? { id: String(tm.id), version: String(tm.version || ''), status: String(tm.status || '') } : null,
    calcId: o.meta.id,
    calcDate: o.meta.createdAt,
    hash: o.hash,
    qr: qrPayload(o.meta.id, o.hash),
  };
}

/** QR kodni SVG ga (`qrcode` funksiyasi tashqaridan beriladi — src/io/vendor.js::loadQr; kutubxona bu yerda import qilinmaydi). */
export function qrSvg(qrcode, text) {
  const qr = qrcode(0, 'M');            // 0 — o'lcham avtomatik; M — xatolarni tuzatish darajasi (≈ 15 %)
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount(), m = 2;                       // m — chet (modul)
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  const size = n + 2 * m;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="report-qr" viewBox="0 0 ${size} ${size}" width="96" height="96" role="img" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

/**
 * Pastki qism HTML'i.
 * @param {object} m    footerModel()
 * @param {{t:Function, esc:Function}} env
 * @param {string} [qr] qrSvg() natijasi (bo'lmasa QR joyi bo'sh)
 */
export function footerHTML(m, env, qr) {
  const { t, esc } = env;
  const date = String(m.calcDate || '').slice(0, 10);
  const row = (k, label, value) => `<div class="report-foot-row" data-report-foot="${k}"><span class="report-foot-label">${esc(label)}:</span> <span class="report-foot-value">${esc(value)}</span></div>`;
  return `<div class="report-foot" data-report-footer="1">
    <div class="report-foot-text">
      ${row('app', t('rf_app'), `${m.app}; ${t('rg_engine')} ${m.engineVersion}`)}
      ${row('build', t('rf_build'), m.build ? `${m.build}${m.buildMatches === false ? ' (' + t('rf_build_mismatch') + ')' : ''}` : t('rf_build_unknown'))}
      ${row('template', t('rf_template'), m.template ? `${m.template.id} v${m.template.version}${m.template.status ? ' (' + m.template.status + ')' : ''}` : t('rf_template_none'))}
      ${row('calc', t('rf_calc'), `${m.calcId}; ${date}`)}
      ${row('hash', t('rf_hash'), m.hash)}
      <div class="report-foot-note">${esc(t('rf_hash_note'))}</div>
    </div>
    <div class="report-foot-qr" data-report-qr="${esc(m.qr)}">${qr || ''}</div>
  </div>`;
}
