/* .docx dan oddiy matn (paragraflar) — manba iqtiboslarini tekshirish uchun (jszip, devDependency). */
'use strict';
const fs = require('node:fs');
const JSZip = require('jszip');

async function docxParagraphs(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const xml = await zip.file('word/document.xml').async('string');
  const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  return (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [])
    .map(p => decode((p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('')));
}

module.exports = { docxParagraphs };
