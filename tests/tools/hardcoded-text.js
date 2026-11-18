/* Qattiq yozilgan (i18n'dan tashqari) foydalanuvchi matnini qidiruvchi skaner — tests/i18n.test.js ishlatadi (RISKS R-13).
   Tashqi kutubxonasiz: JS uchun kichik tokenizator (izohlar, satrlar, shablon literallari, regex), HTML uchun jsdom.

   Evristika (ataylab sodda — maqsad: yangi qattiq yozilgan JUMLA testdan o'tmasin):
   HTML:  data-i18n li element (yoki ajdodi) ichida bo'lmagan matn tuguni; data-i18n-ph / -title / -aria / -alt / -label
          bo'lmagan placeholder / title / aria-label / alt / label atributi — agar unda ≥ 2 harfli so'z bo'lsa.
   JS:    satr yoki shablon literali, agar
          (a) ketma-ket ≥ 2 kirill harfi bo'lsa; yoki
          (b) o'zbekcha belgi bo'lsa (o' / g' — harf ichida yoki so'z oxirida); yoki
          (c) probel bilan ajratilgan, faqat lotin harflaridan iborat ≥ 3 harfli ≥ 2 ta so'z bo'lsa
              (inline CSS "prop:value;" va defisli CSS sinflar ro'yxati bundan mustasno); yoki
          (d) bosh harf bilan boshlangan bitta so'z bo'lsa ("Faol", "Xato: "); yoki
          (e) HTML bo'lagi bo'lsa — teglardan tashqaridagi matnda yoki title/placeholder/aria-label/alt
              atributida ≥ 2 harfli so'z bo'lsa.
          console.*(…) argumentlari tekshirilmaydi (ishlab chiquvchi uchun xabar, UI'ga chiqmaydi). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const KEYWORDS_BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do', 'instanceof', 'yield', 'await']);

/* ── JS tokenizatori: literallar ro'yxati [{ text, line, kind, ctx }] ── */
function jsLiterals(code) {
  const out = [];
  scanCode(code, 0, code.length, 1, out, false);
  return out;
}

function cook(raw) {
  return raw.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r?\n|[\s\S])/g, (m, e) => {
    if (e[0] === 'u') return String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ''), 16));
    if (e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16));
    if (e === 'n') return '\n';
    if (e === 't') return '\t';
    if (e[0] === '\n' || e[0] === '\r') return '';
    return e;
  });
}

// code[from..to) ni o'qiydi; inBraces = true bo'lsa mos '}' da to'xtaydi va uning indeksini qaytaradi.
function scanCode(code, from, to, line, out, inBraces) {
  let i = from;
  let depth = 0;
  let prevSig = '';       // oxirgi ma'noli belgi
  let prevWord = '';      // oxirgi identifikator / kalit so'z
  let sigStart = from;    // kontekst uchun
  const ctxOf = pos => code.slice(Math.max(from, pos - 60), pos);
  while (i < to) {
    const c = code[i];
    const d = code[i + 1];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && d === '/') { while (i < to && code[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end < 0 ? to : end + 2;
      for (let k = i; k < stop; k++) if (code[k] === '\n') line++;
      i = stop; continue;
    }
    if (c === '\'' || c === '"') {
      let j = i + 1;
      while (j < to && code[j] !== c) { if (code[j] === '\\') j++; j++; }
      out.push({ text: cook(code.slice(i + 1, j)), line, kind: 'string', ctx: ctxOf(i) });
      i = j + 1; prevSig = c; prevWord = ''; continue;
    }
    if (c === '`') {
      const startLine = line;
      const ctx = ctxOf(i);
      let j = i + 1;
      let text = '';
      while (j < to && code[j] !== '`') {
        if (code[j] === '\\') { text += code[j] + code[j + 1]; j += 2; continue; }
        if (code[j] === '$' && code[j + 1] === '{') {
          const r = scanCode(code, j + 2, to, line, out, true);
          line = r.line; j = r.end + 1; text += '\u0001'; continue;
        }
        if (code[j] === '\n') line++;
        text += code[j]; j++;
      }
      out.push({ text: cook(text), line: startLine, kind: 'template', ctx });
      i = j + 1; prevSig = '`'; prevWord = ''; continue;
    }
    if (c === '/') {
      const regexAllowed = prevSig === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prevSig) || KEYWORDS_BEFORE_REGEX.has(prevWord);
      if (regexAllowed) {
        let j = i + 1; let inClass = false;
        while (j < to && code[j] !== '\n') {
          if (code[j] === '\\') { j += 2; continue; }
          if (code[j] === '[') inClass = true;
          else if (code[j] === ']') inClass = false;
          else if (code[j] === '/' && !inClass) break;
          j++;
        }
        i = j + 1;
        while (i < to && /[a-z]/.test(code[i])) i++;
        prevSig = ')'; prevWord = ''; continue;
      }
    }
    if (inBraces) {
      if (c === '{') depth++;
      else if (c === '}') { if (depth === 0) return { end: i, line }; depth--; }
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < to && /[\w$]/.test(code[j])) j++;
      prevWord = code.slice(i, j); prevSig = 'a'; i = j; continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < to && /[\w.]/.test(code[j])) j++;
      prevWord = ''; prevSig = '0'; i = j; continue;
    }
    prevSig = c; prevWord = ''; i++;
  }
  void sigStart;
  return { end: to, line };
}

/* ── Matn evristikalari ── */
const CYR = /[\u0400-\u04FF]{2,}/;   // bitta kirill harfi (translit jadvali, belgi) — matn emas
const UZ_MARK = /[A-Za-z][oOgG]['\u2018\u2019\u02BB](?:[a-z]|\b|$)/;
const WORD2 = /[A-Za-z\u00C0-\u024F\u0400-\u04FF]{2,}/;   // lotin / kirill; indeks harflari (xᵢ) va yunoncha (ΣC) — belgi

function pureWords(s) {
  return s.split(/\s+/).map(w => w.replace(/^[("'«“]+|[.,:;!?)"'»”…]+$/g, '')).filter(w => w.length >= 3 && /^[A-Za-z]+(?:['\u2018\u2019\u02BB][A-Za-z]+)*$/.test(w));   // ichki apostrof: ma'lumot
}

const HTML_TAG = /<\/?[a-zA-Z][^<>]*>|<[a-zA-Z][^<>]*$|^[^<>]*["'=\u0001][^<>]*>|^\s*\/?>/;

// HTML bo'lagidan ko'rinadigan matn: teglardan tashqari qism + title/placeholder/aria-label/alt atributlari
function htmlVisible(s) {
  const parts = [];
  for (const m of s.matchAll(/\b(?:title|placeholder|aria-label|alt)="([^"]*)"/g)) parts.push(m[1]);
  // quyi indekslar — matematik belgi qismi: <sub>…</sub> va s_lab, ν_eff, u_cal kabi yozuv
  let t = s.replace(/<sub>[^<]*<\/sub>/g, ' ').replace(/_[A-Za-z]+(?:,[A-Za-z]+)*/g, ' ');
  t = t.replace(/<\/?[a-zA-Z][^<>]*>/g, ' ').replace(/<[a-zA-Z!][^<>]*$/, ' ').replace(/^[^<>]*>/, ' ');
  t = t.replace(/&[a-z]+;|&#\d+;/g, ' ');
  parts.push(t);
  return parts;
}

// Ruxsat etilgan ibora faqat butun so'z sifatida olib tashlanadi ("exp" → "expected" ga tegmaydi)
function stripAllowed(text, allow) {
  let s = text;
  for (const a of allow) {
    const re = new RegExp('(?<![\\p{L}0-9])' + a.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '(?![\\p{L}0-9])', 'gu');   // log₁₀, cm³ — indeks/daraja belgisi so'z chegarasi hisoblanadi
    s = s.replace(re, ' ');
  }
  return s;
}

const CLASS_LIST = /^[a-z0-9_\s-]+$/;            // CSS sinflar ro'yxati: "btn btn-sm active" (kichik harf, defis bilan)
const CSS_DECL = /^\s*[a-z-]+\s*:\s*[^;]+;/;   // "prop:value;…" — inline uslub satri

function classify(text, allow) {
  let s = stripAllowed(text, allow || []);
  s = s.replace(/\u0001/g, ' ');
  if (!s.trim()) return null;
  if (HTML_TAG.test(text)) {
    for (const p of htmlVisible(s)) {
      if (CYR.test(p)) return { why: 'cyrillic', frag: p.match(CYR)[0] };
      if (WORD2.test(p)) return { why: 'html-text', frag: p.match(new RegExp(WORD2.source, 'g')).join(' ') };
    }
    return null;
  }
  if (CYR.test(s)) return { why: 'cyrillic' };
  if (UZ_MARK.test(s)) return { why: 'uzbek' };
  if (CSS_DECL.test(s)) return null;
  if (CLASS_LIST.test(s) && /[-_]/.test(s)) return null;
  if (pureWords(s).length >= 2 && /\s/.test(s.trim())) return { why: 'sentence' };
  if (/^[A-Z][a-z]{2,}[\s:…!?.→]*$/.test(s.trim())) return { why: 'word' };
  return null;
}

/* ── JS faylni tekshirish ── */
function scanJs(file, code, opts) {
  const { allowPhrases = [], allowLiterals = new Set(), skip = () => false } = opts || {};
  const hits = [];
  for (const lit of jsLiterals(code)) {
    if (/console\.(log|warn|error|info|debug)\(\s*$/.test(lit.ctx)) continue; // ishlab chiquvchi xabari
    const norm = lit.text.replace(/\s+/g, ' ').trim();
    if (!norm || allowLiterals.has(norm)) continue;
    if (skip(lit, file)) continue;
    const c = classify(lit.text, allowPhrases);
    if (c) hits.push({ file, line: lit.line, why: c.why, text: (c.frag ? '«' + c.frag + '» ← ' : '') + norm.replace(/\u0001/g, '${…}').slice(0, 110) });
  }
  return hits;
}

/* ── HTML faylni tekshirish ── */
const ATTRS = { placeholder: 'data-i18n-ph', title: 'data-i18n-title', 'aria-label': 'data-i18n-aria', alt: 'data-i18n-alt', label: 'data-i18n-label' };

function scanHtml(file, html, opts) {
  const { JSDOM } = require('jsdom');
  const { allowPhrases = [] } = opts || {};
  const doc = new JSDOM(html).window.document;
  const hits = [];
  const strip = t => stripAllowed(t, allowPhrases);
  const human = t => /[\u0400-\u04FF]/.test(t) || WORD2.test(t);
  const walk = (node, covered) => {
    for (const ch of node.childNodes) {
      if (ch.nodeType === 3) {
        const t = ch.nodeValue.replace(/\s+/g, ' ').trim();
        if (t && !covered && human(strip(t))) hits.push({ file, why: 'text', text: t.slice(0, 110) });
      } else if (ch.nodeType === 1) {
        const tag = ch.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style') continue;
        if (tag === 'sub' || tag === 'sup') continue;   // matematik indeks (u<sub>Bi</sub>) — belgi qismi
        for (const [attr, data] of Object.entries(ATTRS)) {
          const v = ch.getAttribute(attr);
          if (v && !ch.hasAttribute(data) && human(strip(v))) hits.push({ file, why: attr, text: v.slice(0, 110) });
        }
        if (tag === 'meta' && /^(description|keywords)$/i.test(ch.getAttribute('name') || '') && !ch.hasAttribute('data-i18n-content')) {
          const v = ch.getAttribute('content') || '';
          if (human(strip(v))) hits.push({ file, why: 'meta', text: v.slice(0, 110) });
        }
        walk(ch, covered || ch.hasAttribute('data-i18n') || ch.hasAttribute('data-i18n-html'));
      }
    }
  };
  walk(doc.documentElement, false);
  return hits;
}

function listFiles(root, dir, ext) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? listFiles(root, path.join(dir, d.name), ext) : (d.name.endsWith(ext) ? [path.join(dir, d.name)] : []));
}

module.exports = { jsLiterals, classify, stripAllowed, scanJs, scanHtml, listFiles };

if (require.main === module) {
  const root = path.join(__dirname, '..', '..');
  const hits = [];
  for (const f of fs.readdirSync(root).filter(f => f.endsWith('.html'))) hits.push(...scanHtml(f, fs.readFileSync(path.join(root, f), 'utf8')));
  for (const dir of ['src/js', 'src/ui', 'src/data', 'src/templates', 'src/storage', 'src/report']) {
    for (const f of listFiles(root, dir, '.js')) {
      if (/^src\/js\/i18n[^/]*\.js$/.test(f)) continue;
      hits.push(...scanJs(f, fs.readFileSync(path.join(root, f), 'utf8')));
    }
  }
  for (const h of hits) console.log(`${h.file}${h.line ? ':' + h.line : ''} [${h.why}] ${h.text}`);
  console.log(hits.length + ' ta topilma');
}
