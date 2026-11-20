#!/usr/bin/env node
/* SCRIPTS/BUILD-SITE.JS — versiyalangan deploy uchun saytni yig'ish (P13; egasi qarori A, 2026-11-19 — docs/RISKS.md R-22 (b)).
   Muammo: GitHub Pages deploy'dan keyin ~10 daqiqa eski va yangi ES modullar aralashib, konsolda `export` xatosi chiqardi.
   Yechim: har bir mahalliy modul / skript / uslub havolasiga `?v=<commit SHA, 12 belgi>` — bitta build ning barcha fayllari
   bitta versiya bilan yuklanadi; `build.json` (no-store) orqali sahifa yangi versiya chiqqanini biladi.
   REPODAGI MANBA KODI O'ZGARMAYDI va build qadamisiz ishlashda davom etadi (lokal ishlab chiqish).

     node scripts/build-site.js [--out=_site] [--sha=<40 hex>] [--validation=<papka>] [--no-report] [--built-at=<ISO>]

   Qadamlar:
     1. OQ RO'YXAT bo'yicha nusxa (tests/, docs/references/, node_modules, scripts/ … saytga CHIQMAYDI).
     2. .js: mahalliy ES modul havolalari — statik import / export … from, dinamik import('…'),
        new URL('…', import.meta.url). Tahlil — acorn (haqiqiy JS parser; regex emas): izoh va satr ichidagi o'xshashliklar
        tegilmaydi. Ishonchsiz holat (o'zgaruvchili dinamik import, satrli new Worker('x.js'), importScripts) — build to'xtaydi.
     3. .html: <script src>, <link rel=stylesheet|modulepreload|preload|icon href>, <img src> — jsdom (joylashuv ma'lumoti bilan).
        Inline skript — build to'xtaydi (CSP `script-src 'self'`).
     4. vendor/ fayllari BAYT DARAJASIDA o'zgarmaydi (yo'lida versiya bor; ularga HAVOLALAR versiyalanadi).
     5. build.json; foydalanuvchi qo'llanmasi va validatsiya hujjatlari (markdown → skriptsiz HTML); validatsiya hisoboti.
     6. Tekshiruv: har bir mahalliy havola mavjud faylga ishora qiladi; versiyasiz mahalliy havola qolmagan; taqiqlangan
        fayl yo'q; manba daraxti o'zgarmagan (git status); .nojekyll bor. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const acorn = require('acorn');
const { renderMarkdown, page } = require('./lib/markdown.js');

const ROOT = path.join(__dirname, '..');
const SHORT = 12;

/* ─── Oq ro'yxat: saytga FAQAT shular chiqadi (docs/RISKS.md R-27 (2) — egasi tasdig'ini kutadi) ─── */
const WHITELIST = Object.freeze({
  files: ['index.html', 'admin.html', 'superadmin.html', 'validation.html', 'ai.html', '.nojekyll', 'LICENSE'],
  dirs: ['src', 'vendor', 'schemas', 'templates/builtin', 'templates/validation'],
});
/* Yig'ilgan saytda bo'lishi MUMKIN EMAS (nusxalashdan keyin tekshiriladi) */
const FORBIDDEN = [/^tests\//, /^docs\//, /^node_modules\//, /^scripts\//, /^\.github\//, /^\.git\//, /\.pdf$/i, /\.xlsx$/i, /\.docx$/i,
  /^package(-lock)?\.json$/, /^firestore\.rules$/, /^firebase\.json$/, /^CLAUDE\.md$/, /serviceAccount/i, /\.key\.json$/i, /\.env/];
/* Markdown → HTML: saytdagi yo'l ← manba */
const MANUAL = { 'manual/uz.html': 'docs/manual/uz.md', 'manual/ru.html': 'docs/manual/ru.md', 'manual/en.html': 'docs/manual/en.md' };
const VALIDATION_DOCS = ['VALIDATION_PLAN', 'REQUIREMENTS', 'RTM', 'CHANGE_CONTROL', 'KNOWN_LIMITATIONS', 'PQ_PROTOCOL_TEMPLATE', 'USER_REQUIREMENTS_TEMPLATE', 'ASSESSOR_FAQ', 'ASSESSOR_FAQ.ru', 'KNOWN_LIMITATIONS.ru'];
const REPORT_FILES = ['validation-report.html', 'validation-report.json'];

class BuildError extends Error {}
const fail = (file, msg) => { throw new BuildError(`${file}: ${msg}`); };

/* ─── Havolalar ─── */
const isExternal = s => /^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('//');
/** `?v=<sha>` qo'shish (idempotent: mavjud v almashtiriladi; boshqa parametrlar va #langar saqlanadi). */
function versioned(spec, sha) {
  const hashAt = spec.indexOf('#');
  const hash = hashAt >= 0 ? spec.slice(hashAt) : '';
  const rest = hashAt >= 0 ? spec.slice(0, hashAt) : spec;
  const qAt = rest.indexOf('?');
  const base = qAt >= 0 ? rest.slice(0, qAt) : rest;
  const params = (qAt >= 0 ? rest.slice(qAt + 1).split('&') : []).filter(p => p && !/^v=/.test(p));
  return `${base}?${[...params, 'v=' + sha].join('&')}${hash}`;
}
const stripQuery = s => s.replace(/[?#].*$/, '');
const hasVersion = (spec, sha) => new RegExp(`[?&]v=${sha}(&|#|$)`).test(spec);

/* ─── JS ─── */
function parseJs(code, file) {
  const opts = { ecmaVersion: 'latest', allowHashBang: true };
  try { return { ast: acorn.parse(code, { ...opts, sourceType: 'module' }), module: true }; } catch (e1) {
    try { return { ast: acorn.parse(code, { ...opts, sourceType: 'script' }), module: false }; } catch (e2) { return fail(file, `JS tahlil qilinmadi: ${e1.message}`); }
  }
}
function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(x => walk(x, visit));
    else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v, visit);
  }
}
const isStr = n => n && n.type === 'Literal' && typeof n.value === 'string';
const isImportMetaUrl = n => n && n.type === 'MemberExpression' && !n.computed && n.property.name === 'url' && n.object.type === 'MetaProperty';

/**
 * JS faylidagi mahalliy modul havolalari.
 * @returns {{ refs:{start:number,end:number,value:string,kind:string}[], module:boolean }}  start / end — satr literali (qo'shtirnoqlari bilan)
 */
function jsRefs(code, file) {
  const { ast, module } = parseJs(code, file);
  const refs = [];
  const add = (lit, kind) => {
    const v = lit.value;
    if (isExternal(v)) return;                                           // tashqi URL — tegilmaydi
    if (!/^(\.{1,2}\/|\/)/.test(v)) fail(file, `yalang'och modul nomi "${v}" (${kind}) — brauzerda ishlamaydi`);
    refs.push({ start: lit.start, end: lit.end, value: v, kind });
  };
  walk(ast, n => {
    if ((n.type === 'ImportDeclaration' || n.type === 'ExportNamedDeclaration' || n.type === 'ExportAllDeclaration') && n.source) add(n.source, n.type === 'ImportDeclaration' ? 'import' : 'export-from');
    else if (n.type === 'ImportExpression') {
      if (!isStr(n.source)) fail(file, `dinamik import() ning manzili satr literali emas (${code.slice(n.start, Math.min(n.end, n.start + 80))}) — versiyalab bo'lmaydi`);
      add(n.source, 'dynamic-import');
    } else if (n.type === 'NewExpression' && n.callee.type === 'Identifier' && n.callee.name === 'URL' && n.arguments.length === 2 && isImportMetaUrl(n.arguments[1])) {
      if (!isStr(n.arguments[0])) fail(file, 'new URL(…, import.meta.url) ning birinchi argumenti satr literali emas — versiyalab bo\'lmaydi');
      add(n.arguments[0], 'url');
    } else if (n.type === 'NewExpression' && n.callee.type === 'Identifier' && /^(Shared)?Worker$/.test(n.callee.name) && isStr(n.arguments[0])) {
      fail(file, `new ${n.callee.name}('${n.arguments[0].value}') — satrli manzil versiyalanmaydi; new URL('…', import.meta.url) ishlating`);
    } else if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'importScripts') {
      fail(file, 'importScripts() — versiyalanmaydi (modulli worker ishlating)');
    }
  });
  return { refs, module };
}
function splice(text, edits) {
  let out = text;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}
/** JS matnini qayta yozish: mahalliy havolalarga ?v=<sha>. */
function rewriteJs(code, sha, file) {
  const { refs } = jsRefs(code, file || '<js>');
  return splice(code, refs.map(r => ({ start: r.start + 1, end: r.end - 1, text: versioned(r.value, sha) })));
}

/* ─── HTML ─── */
const LINK_RELS = ['stylesheet', 'modulepreload', 'preload', 'icon', 'manifest'];
/** HTML dagi mahalliy resurs havolalari: [{ start, end, value, tag, attr }] — start / end atribut QIYMATI chegaralari. */
function htmlRefs(html, file) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html, { includeNodeLocations: true });
  const doc = dom.window.document;
  const refs = [];
  const add = (el, attr) => {
    const value = el.getAttribute(attr);
    if (value === null || !value.trim() || isExternal(value) || value.startsWith('#')) return;
    const loc = dom.nodeLocation(el);
    const a = loc && loc.attrs && loc.attrs[attr];
    if (!a) fail(file, `<${el.localName} ${attr}> joylashuvi aniqlanmadi`);
    const raw = html.slice(a.startOffset, a.endOffset);
    const m = /^[^=\s]+\s*=\s*(["'])([\s\S]*)\1$/.exec(raw);
    if (!m || m[2] !== value) fail(file, `<${el.localName} ${attr}="${value}">: atribut qo'shtirnoqsiz yoki maxsus belgili — qo'lda tekshiring`);
    const start = a.startOffset + raw.indexOf(m[1]) + 1;
    refs.push({ start, end: start + value.length, value, tag: el.localName, attr });
  };
  for (const el of doc.querySelectorAll('script')) {
    if (el.hasAttribute('src')) add(el, 'src');
    else if (!/^application\/(ld\+)?json$/.test(el.getAttribute('type') || '')) fail(file, 'inline <script> — CSP (script-src \'self\') ga zid');
  }
  for (const el of doc.querySelectorAll('link[href]')) {
    const rel = (el.getAttribute('rel') || '').toLowerCase().split(/\s+/);
    if (rel.some(r => LINK_RELS.includes(r))) add(el, 'href');
  }
  for (const el of doc.querySelectorAll('img[src], source[src], video[src], audio[src]')) add(el, 'src');
  return refs;
}
function rewriteHtml(html, sha, file) {
  return splice(html, htmlRefs(html, file || '<html>').map(r => ({ start: r.start, end: r.end, text: versioned(r.value, sha) })));
}

/* ─── Yordamchilar ─── */
function listFiles(dir, rel = '') {
  const out = [];
  for (const d of fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(...listFiles(dir, p)); else if (d.isFile()) out.push(p);
  }
  return out;
}
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

/** CHANGELOG.md dan versiyalar tarixi: `## [2.9.0] — sarlavha (2026-11-19)`. */
function parseChangelog(md) {
  const out = [];
  for (const line of String(md).split('\n')) {
    const m = /^##\s+\[(\d+\.\d+\.\d+)\]\s*[—–-]?\s*(.*)$/.exec(line);
    if (!m) continue;
    let title = m[2].trim(), date = '';
    const d = /\((\d{4}-\d{2}-\d{2})\)\s*$/.exec(title);
    if (d) { date = d[1]; title = title.slice(0, d.index).trim(); }
    out.push({ version: m[1], date, title: title.slice(0, 300) });
  }
  return out;
}

/** Markdown havolasini sayt ichidagi sahifaga ko'chirish; saytda yo'q faylga havola — matnga aylanadi (null). */
function mdLinker(srcFile, outFile, pages) {
  return href => {
    if (/^(https?:|mailto:|#)/i.test(href)) return href;
    const [p, frag] = href.split('#');
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(srcFile), p));
    const hit = pages.get(target);
    if (!hit) return null;
    return (path.posix.relative(path.posix.dirname(outFile), hit) || path.posix.basename(hit)) + (frag ? '#' + frag : '');
  };
}

/**
 * Saytni yig'ish.
 * @param {object} o
 * @param {string} [o.root]        manba ildizi (standart — repo)
 * @param {string} o.out           chiqish papkasi (tozalanadi)
 * @param {string} o.commit        40 belgili commit SHA
 * @param {string} [o.builtAt]     ISO vaqt (UTC); berilmasa — hozir
 * @param {string|null} [o.validation]  validation-report.html / .json turgan papka (null — hisobotsiz, faqat test / lokal sinov)
 * @param {object} [o.whitelist]   { files, dirs } (testlar uchun)
 * @param {boolean} [o.checkEngineHash=true]
 * @returns {{ build:object, files:number, rewritten:number, refs:number, pages:string[] }}
 */
function buildSite(o) {
  const root = path.resolve(o.root || ROOT);
  const out = path.resolve(o.out);
  const wl = o.whitelist || WHITELIST;
  if (!/^[0-9a-f]{40}$/.test(o.commit || '')) throw new BuildError('commit SHA (40 ta hex belgi) kerak');
  if (out === root || root.startsWith(out + path.sep)) throw new BuildError('chiqish papkasi manba ildizi yoki uning ajdodi bo\'lishi mumkin emas');
  const sha = o.commit.slice(0, SHORT);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  // 1. Oq ro'yxat bo'yicha nusxa
  const files = [];
  for (const f of wl.files) {
    if (!fs.existsSync(path.join(root, f))) fail(f, 'oq ro\'yxatdagi fayl topilmadi');
    files.push(f);
  }
  for (const d of wl.dirs) {
    if (!fs.existsSync(path.join(root, d))) fail(d, 'oq ro\'yxatdagi papka topilmadi');
    files.push(...listFiles(root, d));
  }
  const exists = new Set(files);
  let rewritten = 0, refCount = 0;
  const check = (from, spec, pageRelative) => {
    // modul havolasi — faylga nisbatan; HTML havolasi — sahifaga nisbatan; '/' bilan boshlansa — sayt ildiziga
    const clean = stripQuery(spec);
    const target = clean.startsWith('/') ? clean.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(from), clean));
    if (target.startsWith('..') || !exists.has(target)) fail(from, `"${spec}" → ${target}: bunday fayl yig'ilgan saytda yo'q${pageRelative ? '' : ' (oq ro\'yxatga kirmagan yoki xato yo\'l)'}`);
  };
  for (const f of files) {
    const src = path.join(root, f), dst = path.join(out, f);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    const isVendor = f.startsWith('vendor/');
    if (/\.js$/.test(f) && !isVendor) {
      const code = fs.readFileSync(src, 'utf8');
      const { refs } = jsRefs(code, f);
      for (const r of refs) check(f, r.value, false);
      refCount += refs.length;
      const next = splice(code, refs.map(r => ({ start: r.start + 1, end: r.end - 1, text: versioned(r.value, sha) })));
      if (next !== code) rewritten++;
      fs.writeFileSync(dst, next);
    } else if (/\.html$/.test(f)) {
      const html = fs.readFileSync(src, 'utf8');
      const refs = htmlRefs(html, f);
      for (const r of refs) check(f, r.value, true);
      refCount += refs.length;
      const next = splice(html, refs.map(r => ({ start: r.start, end: r.end, text: versioned(r.value, sha) })));
      if (next !== html) rewritten++;
      fs.writeFileSync(dst, next);
    } else {
      fs.copyFileSync(src, dst);
    }
  }

  // 2. build.json — dvigatel xeshi MANBADAN (yig'ilgan fayllardan emas) va qayd etilgan xesh bilan mos bo'lishi shart
  const { ENGINE_VERSION } = require(path.join(root, 'src/engine/version.js'));
  let engineHash = o.engineHash;
  if (!engineHash) {
    const { engineHash: compute } = require(path.join(root, 'tests/tools/engine-hash.js'));
    engineHash = compute().sha256;
    if (o.checkEngineHash !== false) {
      const recorded = JSON.parse(fs.readFileSync(path.join(root, 'tests/security/engine.sha256.json'), 'utf8'));
      if (recorded.sha256 !== engineHash || recorded.engineVersion !== ENGINE_VERSION) throw new BuildError('dvigatel xeshi tests/security/engine.sha256.json bilan mos emas — node tests/tools/engine-hash.js --write (va CHANGELOG)');
    }
  }
  const changelog = fs.existsSync(path.join(root, 'CHANGELOG.md')) ? parseChangelog(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')) : [];
  const build = {
    format: 'uc-build/1', commit: o.commit, shortSha: sha, engineVersion: ENGINE_VERSION, engineHash,
    builtAt: o.builtAt || new Date().toISOString(), node: process.version, versions: changelog,
  };
  fs.writeFileSync(path.join(out, 'build.json'), JSON.stringify(build, null, 2) + '\n');

  // 3. Markdown → statik HTML (skriptsiz; o'z CSP si bilan)
  const pages = new Map();            // manba .md → saytdagi .html
  for (const [dst, src] of Object.entries(MANUAL)) if (fs.existsSync(path.join(root, src))) pages.set(src, dst);
  for (const name of VALIDATION_DOCS) if (fs.existsSync(path.join(root, `docs/validation/${name}.md`))) pages.set(`docs/validation/${name}.md`, `validation/docs/${name}.html`);
  const made = [];
  for (const [src, dst] of pages) {
    const r = renderMarkdown(fs.readFileSync(path.join(root, src), 'utf8'), { link: mdLinker(src, dst, pages) });
    const up = path.posix.relative(path.posix.dirname(dst), '') || '.';
    const lang = (/manual\/(uz|ru|en)\.md$/.exec(src) || [])[1] || 'uz';
    const html = page({
      lang, title: `${r.title || path.basename(src, '.md')} — UncertaintyCalc`, body: r.html,
      nav: [{ href: `${up}/index.html`, text: 'UncertaintyCalc' }, { href: `${up}/validation.html`, text: { uz: 'Validatsiya', ru: 'Валидация', en: 'Validation' }[lang] }],
      footer: `UncertaintyCalc ${ENGINE_VERSION} · build ${sha} · ${src}`,
    });
    fs.mkdirSync(path.dirname(path.join(out, dst)), { recursive: true });
    fs.writeFileSync(path.join(out, dst), html);
    made.push(dst);
  }

  // 4. Validatsiya hisoboti
  if (o.validation) {
    for (const f of REPORT_FILES) {
      const src = path.join(path.resolve(o.validation), f);
      if (!fs.existsSync(src)) throw new BuildError(`validatsiya hisoboti topilmadi: ${src} (node scripts/validation-report.js)`);
      fs.mkdirSync(path.join(out, 'validation'), { recursive: true });
      fs.copyFileSync(src, path.join(out, 'validation', f));
      made.push('validation/' + f);
    }
  }

  // 5. Yakuniy tekshiruv (yig'ilgan fayllar qayta o'qiladi)
  const result = verifySite(out, sha, { root, vendorSource: root });
  return { build, files: result.files, rewritten, refs: refCount, pages: made };
}

/**
 * Yig'ilgan saytni tekshirish (mustaqil — tests/build/ va deploy'dan keyin ham ishlatiladi).
 * • versiyasiz mahalliy modul / skript / uslub havolasi yo'q; har bir havola mavjud faylga ishora qiladi;
 * • taqiqlangan fayl yo'q; .nojekyll va build.json bor; build.json dagi shortSha — havolalardagi versiya;
 * • skriptsiz sahifalarda <script> yo'q; vendor fayllari manbadagi bilan bayt darajasida bir xil.
 */
function verifySite(out, sha, o = {}) {
  const all = listFiles(out);
  const set = new Set(all);
  const bad = [];
  if (!set.has('.nojekyll')) bad.push('.nojekyll yo\'q');
  if (!set.has('build.json')) bad.push('build.json yo\'q');
  else {
    const b = JSON.parse(fs.readFileSync(path.join(out, 'build.json'), 'utf8'));
    if (b.shortSha !== sha || !String(b.commit).startsWith(sha)) bad.push('build.json dagi shortSha havolalardagi versiyaga mos emas');
  }
  for (const f of all) if (FORBIDDEN.some(re => re.test(f))) bad.push(`taqiqlangan fayl: ${f}`);
  const resolveRef = (from, spec) => {
    const clean = stripQuery(spec);
    return clean.startsWith('/') ? clean.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(from), clean));
  };
  for (const f of all) {
    const scriptless = /^(manual|validation)\//.test(f) && f.endsWith('.html');
    if (f.endsWith('.js') && !f.startsWith('vendor/')) {
      for (const r of jsRefs(fs.readFileSync(path.join(out, f), 'utf8'), f).refs) {
        if (!hasVersion(r.value, sha)) bad.push(`${f}: versiyasiz havola "${r.value}" (${r.kind})`);
        if (!set.has(resolveRef(f, r.value))) bad.push(`${f}: "${r.value}" — fayl yo'q`);
      }
    } else if (f.endsWith('.html')) {
      const html = fs.readFileSync(path.join(out, f), 'utf8');
      if (scriptless) {
        if (/<script\b/i.test(html) || /\son[a-z]+\s*=/i.test(html) || /javascript:/i.test(html)) bad.push(`${f}: skriptsiz sahifada skript / hodisa atributi`);
        continue;
      }
      for (const r of htmlRefs(html, f)) {
        if (!hasVersion(r.value, sha)) bad.push(`${f}: versiyasiz havola <${r.tag} ${r.attr}="${r.value}">`);
        if (!set.has(resolveRef(f, r.value))) bad.push(`${f}: "${r.value}" — fayl yo'q`);
      }
    } else if (f.startsWith('vendor/') && o.vendorSource) {
      const src = path.join(o.vendorSource, f);
      if (!fs.existsSync(src) || sha256(fs.readFileSync(src)) !== sha256(fs.readFileSync(path.join(out, f)))) bad.push(`${f}: vendor fayli manbadagidan farq qiladi`);
    }
  }
  if (o.vendorSource) for (const f of all.filter(x => x.startsWith('vendor/') && x.endsWith('.js'))) {
    if (sha256(fs.readFileSync(path.join(o.vendorSource, f))) !== sha256(fs.readFileSync(path.join(out, f)))) bad.push(`${f}: vendor fayli o'zgargan`);
  }
  if (bad.length) throw new BuildError('yig\'ilgan sayt tekshiruvdan o\'tmadi:\n  ' + [...new Set(bad)].join('\n  '));
  return { files: all.length };
}

module.exports = { buildSite, verifySite, rewriteJs, rewriteHtml, jsRefs, htmlRefs, versioned, parseChangelog, WHITELIST, FORBIDDEN, BuildError, SHORT };

if (require.main === module) {
  const a = Object.fromEntries(process.argv.slice(2).filter(s => s.startsWith('--')).map(s => { const [k, ...v] = s.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
  try {
    const commit = typeof a.sha === 'string' ? a.sha : (process.env.GITHUB_SHA || git(['rev-parse', 'HEAD'], ROOT));
    const before = git(['status', '--porcelain'], ROOT);
    const r = buildSite({
      out: path.resolve(typeof a.out === 'string' ? a.out : path.join(ROOT, '_site')), commit,
      builtAt: typeof a['built-at'] === 'string' ? a['built-at'] : undefined,
      validation: a['no-report'] ? null : (typeof a.validation === 'string' ? a.validation : path.join(ROOT, '_validation')),
    });
    // manba daraxti build tufayli o'zgarmagan bo'lishi shart
    if (git(['status', '--porcelain'], ROOT) !== before) throw new BuildError('manba daraxti build vaqtida o\'zgardi (git status)');
    console.log(`build ${r.build.shortSha} (ENGINE ${r.build.engineVersion}): ${r.files} fayl, ${r.refs} havola versiyalandi (${r.rewritten} fayl qayta yozildi), ${r.pages.length} sahifa yaratildi${a['no-report'] ? ' — VALIDATSIYA HISOBOTISIZ' : ''}`);
  } catch (e) {
    console.error(e instanceof BuildError ? 'BUILD TO\'XTADI — ' + e.message : e);
    process.exit(1);
  }
}
