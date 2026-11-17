#!/usr/bin/env node
/* P03 natijalari snapshot'i: src/data/presets.js dagi 11 ta preset, P03 UI holati (app.js loadPreset),
   src/engine (ENGINE_VERSION 2.0.0) → tests/templates/snapshots/legacy-p03.json.
   Bir marta P04 boshida yozilgan; templates/builtin/legacy-*.json natijalari shu bilan aynan solishtiriladi.
   Qayta yozish faqat dvigatel natijasi ataylab o'zgarganda (ENGINE_VERSION + CHANGELOG):
     node tests/tools/legacy-snapshot.js --write */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { evaluate, ENGINE_VERSION } = require('../../src/engine/index.js');
const { loadPresets, presetState, pick } = require('../templates/lib.js');

function build() {
  const out = { engineVersion: ENGINE_VERSION, source: 'src/data/presets.js + src/js/app.js loadPreset (P03)', results: {} };
  for (const [key, pd] of Object.entries(loadPresets())) {
    const pts = pd.points ? pd.points.map((_, i) => i) : [null];
    out.results[key] = pts.map(i => pick(evaluate(presetState(pd, i))));
  }
  return out;
}
module.exports = { build };
if (require.main === module) {
  const file = path.join(__dirname, '..', 'templates/snapshots/legacy-p03.json');
  const json = JSON.stringify(build(), null, 1) + '\n';
  if (process.argv.includes('--write')) { fs.writeFileSync(file, json); console.log('written', file); }
  else process.stdout.write(json.slice(0, 400) + '…\n');
}
