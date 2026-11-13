#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   prepare-auth-import.mjs — eski foydalanuvchilarni Firebase Auth'ga
   ko'chirish (docs/AUTH_MIGRATION.md, "A yo'l")
   ─────────────────────────────────────────────────────────────
   Eski tizim parolni SHA-256(parol + ':uc_noaniqlik_v1') ko'rinishida
   saqlagan. Firebase Auth bu xeshni import qila oladi — foydalanuvchilar
   ESKI parol bilan kiraveradi, parolni hech kim ko'rmaydi.

   1) Import faylini tayyorlash (Firestore'ni faqat O'QIYDI):
        node scripts/prepare-auth-import.mjs --key ./serviceAccount.json
      → auth-import.json (.gitignore'da; parol xeshlari bor — import'dan
        keyin O'CHIRING)
   2) Import (firebase-tools, egasining kompyuterida):
        npx firebase auth:import auth-import.json --hash-algo=SHA256 \
          --rounds=1 --hash-input-order=PASSWORD_FIRST --project <projectId>
   3) Bitta hisob bilan kirib tekshiring.
   4) Eski maydonlarni o'chirish (passwordHash, rawPwd, fullName):
        node scripts/prepare-auth-import.mjs --key ./serviceAccount.json --strip-legacy --yes
   5) Tekshiruv (qolgan eski maydonlar):
        node scripts/prepare-auth-import.mjs --key ./serviceAccount.json --check
═══════════════════════════════════════════════════════════════ */
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { parseArgs, initAdmin, readWebConfig, loginToEmail, die } from './lib/admin-init.mjs';

const LEGACY_SALT = ':uc_noaniqlik_v1';           // eski auth.js: hashPwd()
const LEGACY_FIELDS = ['passwordHash', 'rawPwd', 'fullName'];

const args = parseArgs();
try {
  initAdmin(args);
  const db = getFirestore();
  const { projectId, domain } = readWebConfig();

  const [orgs, emps] = await Promise.all([db.collection('organizations').get(), db.collection('employees').get()]);
  const all = [
    ...orgs.docs.map(d => ({ kind: 'organization', ref: d.ref, id: d.id, data: d.data() })),
    ...emps.docs.map(d => ({ kind: 'employee', ref: d.ref, id: d.id, data: d.data() })),
  ];

  if (args.check) {
    const left = all.filter(x => LEGACY_FIELDS.some(f => f in x.data));
    left.forEach(x => console.log(`  ${x.kind}/${x.id}: ${LEGACY_FIELDS.filter(f => f in x.data).join(', ')}`));
    console.log(left.length ? `✗ ${left.length} ta hujjatda eski maydon qolgan` : '✓ eski maydonlar qolmagan');
    process.exit(left.length ? 2 : 0);
  }

  if (args['strip-legacy']) {
    if (!args.yes) die('Bu amal qaytarilmaydi. Import muvaffaqiyatli bo\'lganiga ishonch hosil qiling va --yes qo\'shing.');
    let n = 0;
    let batch = db.batch(), inBatch = 0;
    for (const x of all) {
      const del = {};
      LEGACY_FIELDS.forEach(f => { if (f in x.data) del[f] = FieldValue.delete(); });
      if (!Object.keys(del).length) continue;
      batch.update(x.ref, del); n++; inBatch++;
      if (inBatch === 400) { await batch.commit(); batch = db.batch(); inBatch = 0; }
    }
    if (inBatch) await batch.commit();
    console.log(`✓ ${n} ta hujjatdan ${LEGACY_FIELDS.join(', ')} o'chirildi`);
    process.exit(0);
  }

  const users = [], skipped = [];
  const saltB64 = Buffer.from(LEGACY_SALT, 'utf8').toString('base64');
  for (const x of all) {
    const d = x.data;
    let email;
    try { email = loginToEmail(d.login, domain); }
    catch { skipped.push(`${x.kind}/${x.id}: login yaroqsiz (${JSON.stringify(d.login)}) — qo'lda: AUTH_MIGRATION.md "B yo'l"`); continue; }
    let hex = d.passwordHash;
    if (!hex && d.rawPwd) hex = createHash('sha256').update(d.rawPwd + LEGACY_SALT).digest('hex');
    if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) { skipped.push(`${x.kind}/${x.id}: parol xeshi yo'q`); continue; }
    users.push({
      localId: x.id,                     // UID = eski hujjat ID → firestore.rules bilan mos
      email,
      emailVerified: false,
      passwordHash: Buffer.from(hex, 'hex').toString('base64'),
      salt: saltB64,
      disabled: false,
    });
  }

  const out = args.out || 'auth-import.json';
  writeFileSync(out, JSON.stringify({ users }, null, 2), { mode: 0o600 });
  console.log(`✓ ${users.length} ta foydalanuvchi → ${out}  (parol xeshlari bor! import'dan keyin o'chiring)`);
  skipped.forEach(s => console.log('  ! ' + s));
  console.log('\nKeyingi qadam:');
  console.log(`  npx firebase auth:import ${out} --hash-algo=SHA256 --rounds=1 --hash-input-order=PASSWORD_FIRST --project ${args.project || projectId}`);
  process.exit(0);
} catch (e) {
  die(e.message);
}
