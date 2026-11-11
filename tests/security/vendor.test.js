'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DIR = path.resolve(__dirname, '../../vendor/firebase/9.23.0');
const EXPECTED = {
  'firebase-app-compat.js':       '1586b85e7ecc265235f1e224c1ac1b44a2f3edb19e50e0ed369491f9bb239478',
  'firebase-auth-compat.js':      '1242c193650f903910325afa222e364b8db720057cf4f6159692f3eb61bf2c9a',
  'firebase-firestore-compat.js': 'b206cb711185de987a37eca683dce8cbd905403581bc994277419b18c2811f47',
};

test('vendor/firebase: LICENSE va README bor', () => {
  assert.ok(fs.readFileSync(path.join(DIR, 'LICENSE'), 'utf8').includes('Apache License'));
  assert.ok(fs.existsSync(path.join(DIR, 'README.md')));
});
for (const [f, sha] of Object.entries(EXPECTED)) {
  test(`vendor/firebase/${f}: SHA-256 o'zgarmagan`, () => {
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f))).digest('hex');
    assert.equal(h, sha);
  });
}
