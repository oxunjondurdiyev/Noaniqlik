/* P16: src/css/tokens.css dan mavzu tokenlarini o'qish va WCAG 2.x kontrastini hisoblash (tashqi kutubxonasiz).
   tests/ui/contrast.test.js va skrinshot testlari ishlatadi. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

/** @returns {{dark:Object<string,string>, light:Object<string,string>, root:Object<string,string>}} */
function readTokens(file = 'src/css/tokens.css') {
  const css = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const block = sel => {
    const m = css.match(new RegExp(sel.replace(/[[\]"=]/g, '\\$&') + '\\s*\\{([^}]*)\\}'));
    const out = {};
    if (m) for (const d of m[1].split(';')) { const i = d.indexOf(':'); if (i > 0 && d.slice(0, i).trim().startsWith('--')) out[d.slice(0, i).trim()] = d.slice(i + 1).trim(); }
    return out;
  };
  return { root: block(':root'), dark: block('[data-theme="dark"]'), light: block('[data-theme="light"]') };
}

/** '#rrggbb' | 'rgba(r, g, b, a)' → [r, g, b, a] */
function parseColor(v) {
  const s = String(v).trim();
  let m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  throw new Error('rang tushunilmadi: ' + v);
}
/** Shaffof rangni fon ustiga qo'yish (alpha compositing) → shaffof bo'lmagan [r, g, b, 1] */
function over(fg, bg) {
  const a = fg[3];
  return [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a)).concat(1);
}
// Ref: WCAG 2.1 — relative luminance, contrast ratio (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio)
function luminance(c) {
  const f = v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

module.exports = { readTokens, parseColor, over, luminance, contrast };
