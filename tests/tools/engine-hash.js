#!/usr/bin/env node
/* Hisoblash dvigateli (src/engine/**) va hisobot yaxlitlashi (src/report/**) fayllarining
   umumiy SHA-256 xeshi. tests/security/static.test.js uni tests/security/engine.sha256.json bilan
   solishtiradi: fayl o'zgarsa — natijaga ta'sir qilsa ENGINE_VERSION oshiriladi, CHANGELOG.md ga
   yoziladi va xesh yangilanadi (CLAUDE.md).
   Yangilash:  node tests/tools/engine-hash.js --write */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..', '..');
const DIRS = ['src/engine', 'src/report'];


function engineHash() {
  const list = DIRS.flatMap(dir => {
    const out = [];
    (function walk(rel) {
      for (const d of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const p = rel + '/' + d.name;
        if (d.isDirectory()) walk(p); else if (/\.(js|json)$/.test(d.name)) out.push(p);
      }
    })(dir);
    return out;
  });
  const h = crypto.createHash('sha256');
  for (const f of list) {
    h.update(f + '\0');
    h.update(fs.readFileSync(path.join(ROOT, f)).toString('utf8').replace(/\r\n/g, '\n'));
    h.update('\0');
  }
  return { sha256: h.digest('hex'), files: list };
}

module.exports = { engineHash };

if (require.main === module) {
  const { sha256, files: list } = engineHash();
  const version = require('../../src/engine/version.js').ENGINE_VERSION;
  if (process.argv.includes('--write')) {
    const out = path.join(ROOT, 'tests/security/engine.sha256.json');
    fs.writeFileSync(out, JSON.stringify({ sha256, engineVersion: version, files: list.length,
      ref: 'P03: src/engine/ + src/report/ (dvigatel ajratildi, ENGINE_VERSION 2.0.0)' }, null, 2) + '\n');
    console.log('yozildi:', out);
  }
  console.log(sha256, version, list.length + ' fayl');
}
