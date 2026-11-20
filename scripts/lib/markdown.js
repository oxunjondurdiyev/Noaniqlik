/* SCRIPTS/LIB/MARKDOWN.JS — markdown → statik HTML (P13: foydalanuvchi qo'llanmasi va validatsiya hujjatlari saytga chiqadi).
   Tashqi kutubxonasiz, ataylab kichik to'plam: # sarlavhalar, paragraf, - / 1. ro'yxat (bir daraja ichma-ich), jadval,
   ``` kod bloki, > iqtibos, ---, **qalin**, *kursiv*, `kod`, [matn](havola).
   XAVFSIZLIK: manbadagi HAR QANDAY matn escape qilinadi — xom HTML o'tkazilmaydi (teg matn sifatida ko'rinadi);
   havolada faqat nisbiy yo'l, #langar, http(s) va mailto; natijada <script>, on*= va style= atributlari bo'lmaydi. */
'use strict';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function slug(text, used) {
  let s = text.toLowerCase().replace(/[`*_[\]()]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'bolim';
  const base = s;
  for (let i = 2; used.has(s); i++) s = `${base}-${i}`;
  used.add(s);
  return s;
}

function safeHref(href) {
  const h = String(href).trim();
  if (/^(https?:\/\/|mailto:)/i.test(h)) return h;
  if (/^[a-z][a-z0-9+.-]*:/i.test(h) || h.startsWith('//')) return null;          // javascript:, data: va h.k.
  return h;
}

/**
 * Satr ichidagi belgilash. @param {(href:string)=>string|null} link  havolani o'zgartirish (null — havolasiz matn)
 */
function inline(text, link) {
  const out = [];
  let i = 0, buf = '';
  const flush = () => { if (buf) { out.push(esc(buf)); buf = ''; } };
  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && i + 1 < text.length && /[\\`*_[\]()#|>-]/.test(text[i + 1])) { buf += text[i + 1]; i += 2; continue; }
    if (c === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i) { flush(); out.push(`<code>${esc(text.slice(i + 1, end))}</code>`); i = end + 1; continue; }
    }
    if (c === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end > i + 1) { flush(); out.push(`<strong>${inline(text.slice(i + 2, end), link)}</strong>`); i = end + 2; continue; }
    }
    if (c === '*' && text[i + 1] !== ' ' && text[i + 1] !== undefined) {
      const end = text.indexOf('*', i + 1);
      if (end > i + 1 && text[end - 1] !== ' ') { flush(); out.push(`<em>${inline(text.slice(i + 1, end), link)}</em>`); i = end + 1; continue; }
    }
    if (c === '[') {
      const m = /^\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^()\s]*(?:\([^()]*\)[^()\s]*)*)\)/.exec(text.slice(i));
      if (m) {
        flush();
        const label = inline(m[1], link);
        let href = safeHref(m[2]);
        if (href !== null && link) href = link(href);
        out.push(href === null || href === undefined ? label : `<a href="${esc(href)}"${/^https?:/i.test(href) ? ' rel="noopener noreferrer"' : ''}>${label}</a>`);
        i += m[0].length; continue;
      }
    }
    buf += c; i++;
  }
  flush();
  return out.join('');
}

const isTableRow = l => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = l => /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(l);
const cells = l => {
  const out = []; let cur = '', code = false;
  const body = l.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '`') code = !code;
    if (c === '\\' && body[i + 1] === '|') { cur += '|'; i++; continue; }
    if (c === '|' && !code) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
};
const LIST = /^(\s*)([-*]|\d+[.)])\s+(.*)$/;

/**
 * @param {string} md
 * @param {{ link?:(href:string)=>string|null }} [opts]
 * @returns {{ html:string, title:string, headings:{level:number,text:string,id:string}[] }}
 */
function renderMarkdown(md, opts = {}) {
  const link = opts.link || null;
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const html = [], headings = [], used = new Set();
  let title = '';
  let i = 0;
  const para = [];
  const flushPara = () => { if (para.length) { html.push(`<p>${inline(para.join(' '), link)}</p>`); para.length = 0; } };
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      flushPara();
      const body = [];
      for (i++; i < lines.length && !/^\s*```\s*$/.test(lines[i]); i++) body.push(lines[i]);
      i++;
      html.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      flushPara();
      const level = h[1].length, text = h[2], id = slug(text, used);
      if (level === 1 && !title) title = text.replace(/[`*]/g, '');
      headings.push({ level, text, id });
      html.push(`<h${level} id="${esc(id)}">${inline(text, link)}</h${level}>`);
      i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flushPara(); html.push('<hr>'); i++; continue; }
    if (/^\s*>/.test(line)) {
      flushPara();
      const body = [];
      for (; i < lines.length && /^\s*>/.test(lines[i]); i++) body.push(lines[i].replace(/^\s*>\s?/, ''));
      html.push(`<blockquote>${renderMarkdown(body.join('\n'), opts).html}</blockquote>`);
      continue;
    }
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara();
      const head = cells(line);
      const rows = [];
      for (i += 2; i < lines.length && isTableRow(lines[i]); i++) rows.push(cells(lines[i]));
      html.push('<div class="table-wrap"><table><thead><tr>' + head.map(c => `<th>${inline(c, link)}</th>`).join('') + '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + head.map((_, k) => `<td>${inline(r[k] === undefined ? '' : r[k], link)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    const li = LIST.exec(line);
    if (li) {
      flushPara();
      const baseIndent = li[1].length;
      const render = (indent) => {
        const ordered = /\d/.test(LIST.exec(lines[i])[2]);
        const items = [];
        while (i < lines.length) {
          const m = LIST.exec(lines[i]);
          if (!m) break;
          if (m[1].length < indent) break;
          if (m[1].length > indent) { items[items.length - 1] += render(m[1].length); continue; }
          let text = m[3];
          i++;
          // davom satrlari (ro'yxat bandi ichidagi chekinish bilan yozilgan matn)
          while (i < lines.length && lines[i].trim() && !LIST.exec(lines[i]) && /^\s+/.test(lines[i]) && !/^\s*```/.test(lines[i])) { text += ' ' + lines[i].trim(); i++; }
          items.push(inline(text, link));
        }
        return `<${ordered ? 'ol' : 'ul'}>${items.map(x => `<li>${x}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`;
      };
      html.push(render(baseIndent));
      continue;
    }
    if (!line.trim()) { flushPara(); i++; continue; }
    para.push(line.trim());
    i++;
  }
  flushPara();
  return { html: html.join('\n'), title, headings };
}

const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";
const PAGE_STYLE = `
  :root { color-scheme: light; }
  body { font: 15px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c2333; background: #f6f7fb; margin: 0; }
  main { max-width: 980px; margin: 0 auto; padding: 24px 20px 64px; background: #fff; min-height: 100vh; box-sizing: border-box; }
  nav.top { font-size: 13px; margin-bottom: 16px; color: #5b6478; }
  nav.top a { margin-right: 14px; }
  h1 { font-size: 26px; line-height: 1.25; } h2 { font-size: 20px; margin-top: 2em; border-bottom: 1px solid #e3e6ee; padding-bottom: 4px; } h3 { font-size: 16px; margin-top: 1.6em; }
  a { color: #1d4ed8; } code { font: 13px/1.4 ui-monospace, "JetBrains Mono", Consolas, monospace; background: #f0f2f7; padding: 1px 4px; border-radius: 3px; }
  pre { background: #f0f2f7; padding: 12px; border-radius: 6px; overflow-x: auto; } pre code { background: none; padding: 0; }
  blockquote { margin: 1em 0; padding: 4px 14px; border-left: 3px solid #c9cfdd; color: #3c4560; background: #fafbfe; }
  .table-wrap { overflow-x: auto; } table { border-collapse: collapse; font-size: 13.5px; margin: 1em 0; }
  th, td { border: 1px solid #d8dce8; padding: 5px 9px; text-align: left; vertical-align: top; } th { background: #f0f2f7; }
  footer { margin-top: 48px; font-size: 12px; color: #6b7389; border-top: 1px solid #e3e6ee; padding-top: 10px; }
  @media print { body { background: #fff; } main { max-width: none; padding: 0; } nav.top { display: none; } }
`;

/** O'zi yetarli, SKRIPTSIZ HTML sahifa (o'z CSP si bilan). nav — [{ href, text }]; footer — oddiy matn. */
function page({ lang, title, body, nav, footer }) {
  return `<!DOCTYPE html>
<html lang="${esc(lang || 'uz')}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${PAGE_CSP}">
<meta name="referrer" content="no-referrer">
<title>${esc(title)}</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<main>
${nav && nav.length ? `<nav class="top">${nav.map(n => `<a href="${esc(n.href)}">${esc(n.text)}</a>`).join('')}</nav>` : ''}
${body}
${footer ? `<footer>${esc(footer)}</footer>` : ''}
</main>
</body>
</html>
`;
}

module.exports = { renderMarkdown, page, esc, PAGE_CSP };
