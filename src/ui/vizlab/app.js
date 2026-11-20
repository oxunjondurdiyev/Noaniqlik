/* ═══════════════════════════════════════════════════════════════
   VIZLAB/APP.JS — P16: Vizual laboratoriya (o'quv vositasi). src/ui/shell/app.js yorliq birinchi ochilganda
   shu modulni yuklaydi va mount(root) ni chaqiradi.
   Olti rejim, hammasi HAQIQIY dvigatelga ulangan (src/engine/ — o'zgartirilmagan); metrologik qoida UI da
   qayta yozilmaydi (qarang: model.js). Hech narsa saqlanmaydi (brauzer xotirasiga yozuv yo'q, ilova holati
   o'zgartirilmaydi) va hisobotga chiqmaydi. Har bir rejimda "o'quv namunasi" belgisi ko'rinadi.
   Harakat: yagona sikl (ui.js createTicker) — sahifa yashirin (visibilitychange), yorliq faol emas (tabchange)
   yoki prefers-reduced-motion: reduce bo'lsa ishlamaydi.
═══════════════════════════════════════════════════════════════ */
import { currentCalc } from './model.js';
import { h, createTicker, badge } from './ui.js';
import { mcMode } from './mode-mc.js';
import { conformityMode } from './mode-conformity.js';
import { extremeMode } from './mode-extreme.js';
import { qcMode } from './mode-qc.js';
import { corrMode } from './mode-corr.js';
import { budgetMode } from './mode-budget.js';

export const MODES = Object.freeze([
  { key: 'mc', create: mcMode },
  { key: 'conformity', create: conformityMode },
  { key: 'extreme', create: extremeMode },
  { key: 'qc', create: qcMode },
  { key: 'corr', create: corrMode },
  { key: 'budget', create: budgetMode },
]);

/** Jonli e'lonlar orasidagi eng kichik vaqt (ms) — ekran o'quvchisini "bombardimon" qilmaslik uchun. */
const LIVE_MS = 1200;
/** Shu kenglikdan tor ekranda rasmlar ixcham (360) ko'rinishda chiziladi. */
const NARROW_PX = 720;

const escFallback = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));

/**
 * @param {HTMLElement} root
 * @param {{window?:Window}} [env]  testlar uchun (jsdom oynasi)
 * @returns {{root:HTMLElement, setMode:(key:string)=>void, mode:()=>string, ticker:object, destroy:()=>void}}
 */
export function mount(root, env) {
  const win = (env && env.window) || window;
  const doc = win.document;
  const i18n = win.i18n;
  const ticker = createTicker(win);
  const state = { mode: MODES[0].key, per: {} };
  let current = null, liveTimer = 0, livePending = '', liveLast = 0, narrow = null, resizeTimer = 0;

  const live = h(doc, 'div', { class: 'vz-live', 'aria-live': 'polite', role: 'status' });
  const panel = h(doc, 'div', { class: 'vz-panel' });
  const head = h(doc, 'div', { class: 'vz-head' });

  const isNarrow = () => (win.innerWidth || 0) < NARROW_PX;
  const ctx = {
    win, doc, ticker,
    t: k => i18n.t(k),
    tf: (k, vars) => i18n.tf(k, vars),
    esc: typeof win.escHtml === 'function' ? win.escHtml : escFallback,
    calc: () => currentCalc(win),
    W: () => (isNarrow() ? 360 : 640),
    rerender: () => renderMode(true),
    announce(text) {
      livePending = text;
      if (liveTimer) return;
      const wait = Math.max(0, LIVE_MS - (Date.now() - liveLast));
      liveTimer = win.setTimeout(() => { liveTimer = 0; liveLast = Date.now(); live.textContent = livePending; }, wait);
    },
  };

  function renderHead() {
    head.textContent = '';
    const nav = h(doc, 'div', { class: 'sp-modes vz-modes', role: 'group', 'aria-label': ctx.t('vz_modes') });
    for (const m of MODES) {
      nav.appendChild(h(doc, 'button', {
        type: 'button', class: 'sp-mode' + (m.key === state.mode ? ' active' : ''), 'aria-pressed': m.key === state.mode ? 'true' : 'false',
        'data-vz-mode': m.key, 'data-vz-key': 'mode:' + m.key, text: ctx.t('vz_m_' + m.key),
        on: { click: () => setMode(m.key) },
      }));
    }
    head.append(
      h(doc, 'div', { class: 'vz-title-row' }, h(doc, 'h2', { class: 'vz-title', text: ctx.t('vz_title') }), badge(doc, ctx.t('vz_sample'), 'orange')),
      h(doc, 'p', { class: 'vz-intro', text: ctx.t('vz_intro') }),
      nav);
  }

  function renderMode(keepFocus) {
    const focusKey = keepFocus && doc.activeElement && doc.activeElement.getAttribute ? doc.activeElement.getAttribute('data-vz-key') : null;
    if (current) current.destroy();
    const def = MODES.find(m => m.key === state.mode) || MODES[0];
    const st = state.per[def.key] = state.per[def.key] || {};
    current = def.create(ctx, st);
    panel.textContent = '';
    panel.setAttribute('data-vz-panel', def.key);
    panel.append(
      h(doc, 'div', { class: 'vz-mode-head' },
        h(doc, 'div', { class: 'vz-title-row' }, h(doc, 'h3', { class: 'vz-mode-title', text: ctx.t('vz_m_' + def.key) }), badge(doc, ctx.t('vz_sample'), 'orange')),
        h(doc, 'p', { class: 'vz-mode-desc', text: ctx.t('vz_d_' + def.key) })),
      current.el);
    if (focusKey) {
      const el = [...root.querySelectorAll('[data-vz-key]')].find(x => x.getAttribute('data-vz-key') === focusKey);
      if (el && !el.disabled) el.focus();
    }
  }

  function setMode(key) {
    if (!MODES.some(m => m.key === key) || key === state.mode) return;
    state.mode = key;
    renderHead();
    renderMode(false);
    const btn = root.querySelector(`[data-vz-mode="${key}"]`);
    if (btn) btn.focus();
  }

  function renderAll() { renderHead(); renderMode(true); }

  const onLang = () => renderAll();
  // yorliqqa qaytilganda joriy hisob o'zgargan bo'lishi mumkin — rejim qayta chiziladi
  const onTab = e => { if (e.detail && e.detail.tab === 'vizlab') renderMode(false); };
  const onResize = () => {
    win.clearTimeout(resizeTimer);
    resizeTimer = win.setTimeout(() => { if (narrow !== isNarrow()) { narrow = isNarrow(); renderMode(true); } }, 150);
  };
  doc.addEventListener('langchange', onLang);
  doc.addEventListener('tabchange', onTab);
  win.addEventListener('resize', onResize);

  narrow = isNarrow();
  root.textContent = '';
  root.classList.add('vz');
  root.append(head, panel, live);
  renderAll();

  return {
    root, setMode, mode: () => state.mode, ticker,
    destroy() {
      if (current) current.destroy();
      current = null;
      ticker.destroy();
      win.clearTimeout(liveTimer); win.clearTimeout(resizeTimer);
      doc.removeEventListener('langchange', onLang);
      doc.removeEventListener('tabchange', onTab);
      win.removeEventListener('resize', onResize);
      root.textContent = '';
    },
  };
}
