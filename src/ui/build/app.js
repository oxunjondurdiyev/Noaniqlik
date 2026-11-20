/* UI/BUILD/APP.JS — window.UCBuild: build ma'lumoti, hisoblagan muhit, yangi versiya banneri (P13). Barcha sahifalarda yuklanadi. */
import { createBuildWatcher } from './watcher.js';
import { versionOf } from '../../io/build.js';
import { describeEnvironment, environmentText } from '../../io/env.js';

const watcher = createBuildWatcher({
  fetch: (url, init) => window.fetch(url, init),
  document,
  t: k => (window.i18n ? window.i18n.t(k) : k),
  loaded: versionOf(import.meta.url),
});

window.UCBuild = Object.freeze({
  loaded: versionOf(import.meta.url),
  info: () => watcher.info(),
  forReport: () => watcher.forReport(),
  mark: () => watcher.mark(),
  environment: () => describeEnvironment(navigator.userAgent),     // faqat qisqa nom va versiya — to'liq userAgent saqlanmaydi
  environmentText,
  check: () => watcher.check(true),
});

const start = () => { watcher.check(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') watcher.onVisible(); });
document.addEventListener('langchange', () => watcher.relabel());
