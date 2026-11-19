/* UI/VALIDATION-PAGE.JS — "Validatsiya" sahifasi (validation.html, P13).
   Joriy ENGINE_VERSION (yuklangan moduldan), build.json (deploy'da), dvigatel xeshi, versiyalar tarixi (build.json.versions —
   yig'ishda CHANGELOG.md dan olingan; runtime'da CHANGELOG o'qilmaydi). build.json bo'lmasa — "dev" eslatmasi, hujjat
   havolalari yashiriladi (ular faqat yig'ilgan saytda bor). Matn DOM ga faqat textContent orqali. */
import { ENGINE_VERSION } from '../engine/version.js';

const $ = id => document.getElementById(id);
const set = (id, text) => { $(id).textContent = text || '—'; };

async function render() {
  const B = window.UCBuild;
  set('val-engine-version', ENGINE_VERSION);
  set('val-environment', B ? B.environmentText(B.environment()) : '');
  const build = B ? await B.info() : null;
  if (build) {
    set('val-build', `${build.shortSha} (${build.commit})`);
    set('val-built-at', build.builtAt);
    set('val-engine-hash', build.engineHash);
    $('val-mismatch').hidden = build.engineVersion === ENGINE_VERSION;
    $('val-links').hidden = false;
    const body = $('val-history').querySelector('tbody');
    body.textContent = '';
    for (const v of build.versions) {
      const tr = document.createElement('tr');
      for (const text of [v.version, v.date || '—', v.title]) { const td = document.createElement('td'); td.textContent = text; tr.appendChild(td); }
      body.appendChild(tr);
    }
    $('val-history').hidden = !build.versions.length;
    $('val-history-empty').hidden = build.versions.length > 0;
  } else {
    const dev = B ? await B.forReport() : null;       // lokal ishlash: dvigatel xeshi
    set('val-build', 'dev');
    set('val-engine-hash', dev && dev.sha256 ? dev.sha256 : '');
    $('val-dev-note').hidden = false;
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
