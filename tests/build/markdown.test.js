/* P13 §6: markdown → statik HTML (scripts/lib/markdown.js) — skriptsiz, xom HTML o'tkazilmaydi; qo'llanmaning uch til nusxasi bir xil tuzilmada. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderMarkdown, page, PAGE_CSP } = require('../../scripts/lib/markdown.js');

const ROOT = path.join(__dirname, '..', '..');
const html = md => renderMarkdown(md).html;

test('asosiy elementlar: sarlavha (id bilan), paragraf, ro\'yxat (ichma-ich), jadval, kod, iqtibos, havola', () => {
  const r = renderMarkdown('# Sarlavha bir\n\nMatn **qalin** va *kursiv*, `kod`.\n\n## Bo\'lim\n\n- a\n  - a1\n- b\n\n1. bir\n2. ikki\n\n| x | y |\n|---|---|\n| 1 | `a|b` |\n\n```\nlet x = 1 < 2;\n```\n\n> iqtibos\n\n---\n\n[havola](../a.md#b) va [tashqi](https://example.org/x)');
  assert.equal(r.title, 'Sarlavha bir');
  assert.deepEqual(r.headings.map(h => [h.level, h.id]), [[1, 'sarlavha-bir'], [2, 'bo-lim']]);
  assert.match(r.html, /<h1 id="sarlavha-bir">Sarlavha bir<\/h1>/);
  assert.match(r.html, /<p>Matn <strong>qalin<\/strong> va <em>kursiv<\/em>, <code>kod<\/code>\.<\/p>/);
  assert.match(r.html, /<ul><li>a<ul><li>a1<\/li><\/ul><\/li><li>b<\/li><\/ul>/);
  assert.match(r.html, /<ol><li>bir<\/li><li>ikki<\/li><\/ol>/);
  assert.match(r.html, /<th>x<\/th><th>y<\/th>[\s\S]*<td>1<\/td><td><code>a\|b<\/code><\/td>/);
  assert.match(r.html, /<pre><code>let x = 1 &lt; 2;<\/code><\/pre>/);
  assert.match(r.html, /<blockquote><p>iqtibos<\/p><\/blockquote>/);
  assert.match(r.html, /<hr>/);
  assert.match(r.html, /<a href="\.\.\/a\.md#b">havola<\/a>/);
  assert.match(r.html, /<a href="https:\/\/example\.org\/x" rel="noopener noreferrer">tashqi<\/a>/);
  // takroriy sarlavhalar — yagona id
  assert.deepEqual(renderMarkdown('## A\n\n## A').headings.map(h => h.id), ['a', 'a-2']);
});

test('xavfsizlik: xom HTML escape qilinadi; javascript: / data: havolalar olib tashlanadi; skript va hodisa atributi hosil bo\'lmaydi', () => {
  const evil = '# <script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1)) [y](data:text/html,<script>) [z](//evil.example/a)\n\n| a |\n|---|\n| <b onclick="x">q</b> |\n\n`<script>` va "qo\'shtirnoq" & belgi\n\n[ok](a.md "onmouseover=x")';
  const out = html(evil);
  assert.ok(!/<script|<img|<b[ >]/i.test(out), out);
  assert.ok(!/href="(javascript|data):/i.test(out) && !/href="\/\//.test(out));
  assert.ok(!/<[^>]+\son[a-z]+\s*=/i.test(out), 'teg ichida hodisa atributi yo\'q');
  assert.match(out, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(out, /&quot;qo&#39;shtirnoq&quot; &amp; belgi/);
  // havolani o'zgartiruvchi: null — havolasiz matn
  assert.equal(renderMarkdown('[matn](../x.md)', { link: () => null }).html, '<p>matn</p>');
  assert.equal(renderMarkdown('[matn](../x.md)', { link: h => h.replace('.md', '.html') }).html, '<p><a href="../x.html">matn</a></p>');
});

test('page(): o\'zi yetarli, skriptsiz, o\'z CSP si bilan; sarlavha va pastki matn escape qilingan', () => {
  const p = page({ lang: 'ru', title: 'A <b>', body: '<p>x</p>', nav: [{ href: '../index.html', text: 'Bosh <i>' }], footer: 'f & <g>' });
  assert.match(p, /^<!DOCTYPE html>\n<html lang="ru">/);
  assert.ok(p.includes(`content="${PAGE_CSP}"`));
  assert.match(PAGE_CSP, /^default-src 'none'; style-src 'unsafe-inline'/);
  assert.ok(!/<script|<link|src=|@import|url\(/i.test(p), 'tashqi resurs va skript yo\'q');
  assert.ok(p.includes('<title>A &lt;b&gt;</title>') && p.includes('Bosh &lt;i&gt;') && p.includes('f &amp; &lt;g&gt;'));
});

test('foydalanuvchi qo\'llanmasi: uch til (uz / ru / en) bir xil tuzilmada; HTML teg ishlatilmagan; havolalar saytda mavjud sahifalarga', () => {
  const docs = Object.fromEntries(['uz', 'ru', 'en'].map(l => [l, fs.readFileSync(path.join(ROOT, `docs/manual/${l}.md`), 'utf8')]));
  const shape = md => renderMarkdown(md).headings.map(h => h.level).join('');
  assert.equal(shape(docs.ru), shape(docs.uz), 'ru: sarlavhalar tuzilmasi');
  assert.equal(shape(docs.en), shape(docs.uz), 'en: sarlavhalar tuzilmasi');
  const count = (md, re) => (md.match(re) || []).length;
  for (const l of ['ru', 'en']) {
    assert.equal(count(docs[l], /^\|/gm), count(docs.uz, /^\|/gm), `${l}: jadval qatorlari`);
    assert.equal(count(docs[l], /`[a-z0-9]+-[a-z0-9-]+`/g) > 0, true);
  }
  for (const [l, md] of Object.entries(docs)) {
    assert.ok(renderMarkdown(md).headings.length >= 30, l);
    assert.ok(!/<(script|img|a|div|span|br|table)\b/i.test(md.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')), `${l}: xom HTML teg`);
    assert.ok(!/\[TEKSHIRILSIN/.test(md), `${l}: tekshirilmagan joy qolgan`);
    // misollar faqat verified case lardan: qo'llanmada tilga olingan har bir case id mavjud va verified
    const ids = new Map(require('../cases/lib.js').loadCases().map(c => [c.id, c.status]));
    for (const m of md.matchAll(/`((?:jcgm10[012]|ea4-02|excel|nordtest|quam|ufs|aqa)-[a-z0-9-]+)`/g)) {
      assert.ok(ids.has(m[1]), `${l}: ${m[1]} — bunday misol yo'q`);
      assert.equal(ids.get(m[1]), 'verified', `${l}: ${m[1]} verified emas`);
    }
  }
  for (const f of fs.readdirSync(path.join(ROOT, 'docs/validation')).filter(x => x.endsWith('.md'))) {
    assert.ok(!/\[TEKSHIRILSIN/.test(fs.readFileSync(path.join(ROOT, 'docs/validation', f), 'utf8')), `${f}: tekshirilmagan joy qolgan`);
  }
});
