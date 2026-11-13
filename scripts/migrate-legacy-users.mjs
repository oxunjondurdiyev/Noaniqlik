#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   migrate-legacy-users.mjs — eski foydalanuvchilarni Firebase Auth'ga
   ko'chirish (batafsil: docs/AUTH_MIGRATION.md)
   ─────────────────────────────────────────────────────────────
   Egasi O'Z KOMPYUTERIDA, service account kaliti bilan ishga tushiradi.
   Har bir hisobning UID'i = eski Firestore hujjat ID'si (firestore.rules
   organizations/{uid}, employees/{uid} bilan mos keladi).

   B yo'l — TAVSIYA (eski parollar oshkor bo'lgan deb hisoblanadi):
        node scripts/migrate-legacy-users.mjs --key ./serviceAccount.json --new-passwords
      → har bir foydalanuvchiga yangi tasodifiy parol, Auth hisobi yaratiladi;
        login/parol ro'yxati migration-out/new-passwords.csv ga (BIR MARTA,
        .gitignore'da; tarqatgandan keyin o'chiring)

   A yo'l — eski parol bilan davom etish (faqat Firestore yopiq bo'lgani aniq bo'lsa):
     1) node scripts/migrate-legacy-users.mjs --key ./serviceAccount.json --import-file
        → auth-import.json (parol xeshlari bor; import'dan keyin O'CHIRING)
     2) npx firebase auth:import auth-import.json --hash-algo=SHA256 \
          --rounds=1 --hash-input-order=PASSWORD_FIRST --project <projectId>
     3) Bitta hisob bilan kirib tekshiring.

   Ikkala yo'ldan keyin — eski maydonlarni o'chirish (passwordHash, rawPwd, fullName):
        node scripts/migrate-legacy-users.mjs --key ./serviceAccount.json --strip-legacy --yes
   Tekshiruv:
        node scripts/migrate-legacy-users.mjs --key ./serviceAccount.json --check
═══════════════════════════════════════════════════════════════ */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { parseArgs, initAdmin, readWebConfig, loginToEmail, strongPassword, die } from './lib/admin-init.mjs';

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

  const MODES = ['import-file', 'new-passwords'];
  if (!MODES.some(m => args[m])) {
    die('Rejimni tanlang: --new-passwords (B, tavsiya) | --import-file (A) | --strip-legacy --yes | --check');
  }

  const skipped = [];
  const candidates = [];
  for (const x of all) {
    let email;
    try { email = loginToEmail(x.data.login, domain); }
    catch { skipped.push(`${x.kind}/${x.id}: login yaroqsiz (${JSON.stringify(x.data.login)}) — qo'lda (AUTH_MIGRATION.md, 5-bo'lim)`); continue; }
    candidates.push({ ...x, email });
  }

  if (args['new-passwords']) {
    const auth = getAuth();
    const rows = [['kind', 'docId', 'login', 'password']];
    let created = 0;
    for (const x of candidates) {
      const password = await strongPassword(14);
      try {
        await auth.createUser({ uid: x.id, email: x.email, password, emailVerified: false });
      } catch (e) {
        if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
          skipped.push(`${x.kind}/${x.id}: Auth hisobi allaqachon bor (${e.code}) — kerak bo'lsa reset-user-password.mjs`);
          continue;
        }
        throw e;
      }
      rows.push([x.kind, x.id, x.data.login, password]);
      created++;
    }
    mkdirSync('migration-out', { recursive: true, mode: 0o700 });
    const out = args.out || 'migration-out/new-passwords.csv';
    writeFileSync(out, rows.map(r => r.join(',')).join('\n') + '\n', { mode: 0o600 });
    console.log(`✓ ${created} ta Auth hisobi yaratildi; login/parollar → ${out}`);
    console.log('  Parollarni egalariga xavfsiz kanal orqali bering va faylni O\'CHIRING.');
    skipped.forEach(s => console.log('  ! ' + s));
    process.exit(0);
  }

  // --import-file (A yo'l)
  const users = [];
  const saltB64 = Buffer.from(LEGACY_SALT, 'utf8').toString('base64');
  for (const x of candidates) {
    const d = x.data;
    let hex = d.passwordHash;
    if (!hex && d.rawPwd) hex = createHash('sha256').update(d.rawPwd + LEGACY_SALT).digest('hex');
    if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) { skipped.push(`${x.kind}/${x.id}: parol xeshi yo'q`); continue; }
    users.push({
      localId: x.id,                     // UID = eski hujjat ID → firestore.rules bilan mos
      email: x.email,
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
