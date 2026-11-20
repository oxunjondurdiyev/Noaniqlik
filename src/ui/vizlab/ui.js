/* ═══════════════════════════════════════════════════════════════
   VIZLAB/UI.JS — P16: Vizual laboratoriya uchun kichik DOM yordamchilari va harakat boshqaruvchisi.
   Matn faqat textContent orqali; `style` atributi ishlatilmaydi (CSP: style-src dan 'unsafe-inline' olib tashlanadi).
   SVG satrlari (svg.js) — yagona innerHTML joyi: ular sonlar va esc() dan o'tgan matndan iborat.
═══════════════════════════════════════════════════════════════ */
import { fmt, fmtSci } from '../../report/format.js';

let seq = 0;
export const uid = p => `vz-${p}-${++seq}`;

/** Element yaratish: h(doc, 'div', { class, text, on: { click }, … }, ...bolalar). */
export function h(doc, tag, attrs, ...kids) {
  const el = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') el.textContent = String(v);
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids.flat()) {
    if (kid === undefined || kid === null || kid === false) continue;
    el.appendChild(typeof kid === 'string' ? doc.createTextNode(kid) : kid);
  }
  return el;
}

/** SVG uchun idish. set(svgSatri) — svg.js natijasi (ishonchli: sonlar + esc qilingan matn). */
export function svgHost(doc, cls) {
  const el = h(doc, 'div', { class: 'vz-chart' + (cls ? ' ' + cls : '') });
  return { el, set(svg) { el.innerHTML = svg; } };
}

/* ── Sonlarni ko'rsatish (hisobot qatlami yordamchilari — nusxa emas) ── */
export const num = (v, sig = 4) => (v === Infinity ? '∞' : fmtSci(v, sig));
export const pct = (v, dp = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : fmt(v, dp) + ' %');
export const nuText = v => (v === null || v === undefined || !Number.isFinite(v) ? '∞' : fmt(v, 1));
export const range = (a, b, sig = 5) => `[${num(a, sig)}; ${num(b, sig)}]`;

/* ── Boshqaruv elementlari ── */

/** Karta: sarlavha + mazmun. */
export function card(doc, title, ...kids) {
  return h(doc, 'section', { class: 'vz-card' }, title ? h(doc, 'h3', { class: 'vz-card-title', text: title }) : null, ...kids);
}

/** Sirg'a: <label> + <input type="range"> + joriy qiymat. */
export function slider(doc, o) {
  const id = uid('rng');
  const out = h(doc, 'output', { class: 'vz-ctl-val mono', for: id, text: o.format(o.value) });
  const input = h(doc, 'input', {
    type: 'range', id, class: 'vz-range', min: o.min, max: o.max, step: o.step, value: o.value, 'data-vz-key': o.key,
    on: { input: () => { const v = Number(input.value); out.textContent = o.format(v); o.onInput(v); } },
  });
  input.value = String(o.value);
  const el = h(doc, 'div', { class: 'vz-ctl' }, h(doc, 'div', { class: 'vz-ctl-head' }, h(doc, 'label', { for: id, text: o.label }), out), input,
    o.hint ? h(doc, 'p', { class: 'vz-hint', text: o.hint }) : null);
  return { el, input };
}

/** Segmentli tanlov: haqiqiy tugmalar, aria-pressed. */
export function segmented(doc, o) {
  const group = h(doc, 'div', { class: 'sp-modes vz-seg', role: 'group', 'aria-label': o.label });
  for (const opt of o.options) {
    group.appendChild(h(doc, 'button', {
      type: 'button', class: 'sp-mode' + (opt.value === o.value ? ' active' : ''), 'aria-pressed': opt.value === o.value ? 'true' : 'false',
      disabled: !!opt.disabled, 'data-vz-key': o.key + ':' + opt.value, text: opt.label,
      on: { click: () => { if (opt.value !== o.value) o.onChange(opt.value); } },
    }));
  }
  return h(doc, 'div', { class: 'vz-ctl' }, h(doc, 'div', { class: 'vz-ctl-head' }, h(doc, 'span', { class: 'vz-ctl-label', text: o.label })), group,
    o.hint ? h(doc, 'p', { class: 'vz-hint', text: o.hint }) : null);
}

/** Ko'rsatkichlar ro'yxati (dl). rows: [{ key, label }]; set(key, matn, [sinf]). */
export function stats(doc, rows) {
  const dl = h(doc, 'dl', { class: 'vz-stats' });
  const cells = {};
  for (const r of rows) {
    const dd = h(doc, 'dd', { class: 'mono', text: '—' });
    cells[r.key] = dd;
    dl.appendChild(h(doc, 'div', { class: 'vz-stat' }, h(doc, 'dt', { text: r.label }), dd));
  }
  return {
    el: dl,
    set(key, text, cls) { const dd = cells[key]; if (!dd) return; dd.textContent = text; dd.className = 'mono' + (cls ? ' ' + cls : ''); },
  };
}

export const badge = (doc, text, kind) => h(doc, 'span', { class: 'badge badge-' + kind, text });
export const note = (doc, text, cls) => h(doc, 'p', { class: 'vz-note' + (cls ? ' ' + cls : ''), text });

/** "Joriy hisob / o'quv modeli" tanlovi (a, b, f rejimlarida bir xil). */
export function sourceSwitch(ctx, st, hasCalc) {
  return segmented(ctx.doc, {
    key: 'src', label: ctx.t('vz_src_label'), value: st.source,
    options: [
      { value: 'calc', label: ctx.t('vz_src_calc'), disabled: !hasCalc },
      { value: 'teach', label: ctx.t('vz_src_teach') },
    ],
    hint: hasCalc ? null : ctx.t('vz_src_none'),
    onChange: v => { st.source = v; ctx.rerender(); },
  });
}

/* ── Harakat: yagona sikl. Sahifa yashirin, yorliq faol emas yoki "kam harakat" so'ralgan bo'lsa — ishlamaydi. ── */

/**
 * @param {Window} win
 * @returns {{add:(fn:(dtMs:number)=>void)=>()=>void, reduced:()=>boolean, active:()=>boolean, whenActive:(fn:Function)=>void,
 *            running:()=>boolean, destroy:()=>void}}
 */
export function createTicker(win) {
  const doc = win.document;
  const subs = new Set(), waiting = [];
  let raf = 0, tabActive = true, last = 0;
  const reduced = () => !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const active = () => !doc.hidden && tabActive;
  const canRun = () => active() && !reduced() && subs.size > 0 && typeof win.requestAnimationFrame === 'function';
  const frame = ts => {
    raf = 0;
    // uzoq tanaffusdan (yashirin sahifa) keyin vaqt "sakramaydi"
    const dt = last && ts - last < 250 ? ts - last : 16;
    last = ts;
    for (const fn of [...subs]) fn(dt);
    sync();
  };
  function sync() {
    if (canRun()) { if (!raf) raf = win.requestAnimationFrame(frame); }
    else if (raf) { win.cancelAnimationFrame(raf); raf = 0; last = 0; }
    if (active()) while (waiting.length) waiting.shift()();
  }
  const onTab = e => { tabActive = !!(e.detail && e.detail.tab === 'vizlab'); sync(); };
  doc.addEventListener('visibilitychange', sync);
  doc.addEventListener('tabchange', onTab);
  return {
    add(fn) { subs.add(fn); sync(); return () => { subs.delete(fn); sync(); }; },
    reduced, active,
    /** fn ni yorliq faol va sahifa ko'rinib turgan paytda chaqiradi (aks holda — qaytib kelinganda). */
    whenActive(fn) { if (active()) fn(); else waiting.push(fn); },
    running: () => !!raf,
    destroy() {
      if (raf) win.cancelAnimationFrame(raf);
      raf = 0; subs.clear(); waiting.length = 0;
      doc.removeEventListener('visibilitychange', sync);
      doc.removeEventListener('tabchange', onTab);
    },
  };
}
