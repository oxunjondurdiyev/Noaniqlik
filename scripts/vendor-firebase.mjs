#!/usr/bin/env node
/* Firebase compat SDK'ni node_modules/firebase dan vendor/firebase/<versiya>/ ga ko'chiradi
   va SHA-384 (SRI formatida) xeshlarni yozadi.
   Ishga tushirish:  npm install && npm run vendor:firebase
   Versiyani almashtirish: package.json dagi "firebase" devDependency + HTML'dagi yo'llar. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'node_modules/firebase/package.json'), 'utf8'));
const files = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'];
const out = join(root, 'vendor/firebase', pkg.version);
mkdirSync(out, { recursive: true });

const lines = [];
for (const f of files) {
  const src = join(root, 'node_modules/firebase', f);
  copyFileSync(src, join(out, f));
  const sri = 'sha384-' + createHash('sha384').update(readFileSync(src)).digest('base64');
  lines.push(`${sri}  ${f}`);
}
writeFileSync(join(out, 'SHA384SUMS.txt'), lines.join('\n') + '\n');

const lic = join(out, 'LICENSE');
if (!existsSync(lic)) {
  console.warn('! LICENSE yo\'q: https://github.com/firebase/firebase-js-sdk/blob/firebase@' + pkg.version + '/LICENSE dan qo\'ying');
}
console.log(`firebase ${pkg.version} (${pkg.license}) → ${out}`);
lines.forEach(l => console.log('  ' + l));
