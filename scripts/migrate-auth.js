#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   MIGRATE-AUTH.JS — eski foydalanuvchilarni Firebase Authentication'ga
   ko'chirish (P02, docs/AUTH_MIGRATION.md).
   ─────────────────────────────────────────────────────────────
   Ishga tushirish (egasining kompyuterida, Admin SDK hisobi bilan):
     node scripts/migrate-auth.js --project noaniqlikbazasi            # quruq (dry-run)
     node scripts/migrate-auth.js --project noaniqlikbazasi --apply    # haqiqiy

   Nima qiladi:
     1. HAR DOIM avval to'liq nusxa: backups/firestore-backup-<vaqt>.json
        (organizations, employees, admins — barcha maydonlar bilan).
     2. ownerUid yo'q har bir tashkilot uchun: Auth hisobi
        (login@AUTH_EMAIL_DOMAIN, vaqtinchalik parol) → ownerUid yoziladi.
        fullName → firstName/lastName (agar ular bo'sh bo'lsa), keyin
        fullName va passwordHash o'chiriladi.
     3. Har bir eski xodim (rawPwd/passwordHash bor yoki ID ≠ Auth uid):
        Auth hisobi → employees/{uid} ga nusxa (rawPwd/passwordHash'siz)
        → yangi hujjat yozilgach eski hujjat o'chiriladi.
     4. Vaqtinchalik parollar: scripts/out/temp-passwords-<vaqt>.csv
        (0600 ruxsat, .gitignore'da). Ularni foydalanuvchilarga xavfsiz
        yo'l bilan bering, keyin faylni o'chiring.
   Takroriy ishga tushirish xavfsiz: ko'chirilganlar o'tkazib yuboriladi.
   Ma'lumot o'chirilmaydi: faqat parol xeshlari, rawPwd va takroriy fullName.
═══════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs, init, loginToEmail, genPassword, findUserByEmail } = require('./lib/admin');

const LEGACY_ORG_FIELDS = ['fullName', 'passwordHash'];
const LEGACY_EMP_FIELDS = ['rawPwd', 'passwordHash'];

function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }

async function backup(db, outDir) {
  const data = { exportedAt: new Date().toISOString(), projectId: (db.app && db.app.options && db.app.options.projectId) || process.env.GCLOUD_PROJECT || null, collections: {} };
  for (const name of ['organizations', 'employees', 'admins']) {
    const snap = await db.collection(name).get();
    data.collections[name] = snap.docs.map(d => ({ id: d.id, data: d.data() }));
  }
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `firestore-backup-${stamp()}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
  return { file, data };
}

function splitFullName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

async function ensureAuthUser(auth, login, displayName, apply, report) {
  const email = loginToEmail(login);
  const existing = await findUserByEmail(auth, email);
  if (existing) return { uid: existing.uid, created: false };
  if (!apply) return { uid: `(dry-run:${login})`, created: true };
  const password = genPassword();
  const user = await auth.createUser({ email, password, displayName: displayName || undefined, emailVerified: false });
  report.passwords.push({ login, password });
  return { uid: user.uid, created: true };
}

async function migrate({ db, auth, FieldValue }, { apply = false, outDir = 'backups', pwDir = 'scripts/out', log = console.log } = {}) {
  const report = { backupFile: null, orgs: [], employees: [], passwords: [], warnings: [] };
  const { file, data } = await backup(db, outDir);
  report.backupFile = file;
  log(`✓ Zaxira nusxa: ${file}`);

  /* ── Tashkilotlar ── */
  for (const { id, data: org } of data.collections.organizations) {
    const legacyKeys = LEGACY_ORG_FIELDS.filter(k => k in org);
    if (org.ownerUid && legacyKeys.length === 0) continue;   // allaqachon ko'chirilgan
    if (!org.login) { report.warnings.push(`organizations/${id}: login yo'q — o'tkazildi`); continue; }

    const name = [org.firstName, org.lastName].filter(Boolean).join(' ') || org.fullName || '';
    const { uid, created } = org.ownerUid
      ? { uid: org.ownerUid, created: false }
      : await ensureAuthUser(auth, org.login, name, apply, report);

    const update = {};
    if (!org.ownerUid) update.ownerUid = uid;
    if (org.fullName && (!org.firstName || !org.lastName)) {
      const sp = splitFullName(org.fullName);
      if (!org.firstName) update.firstName = sp.firstName;
      if (!org.lastName)  update.lastName  = sp.lastName;
    }
    legacyKeys.forEach(k => { update[k] = FieldValue.delete(); });

    report.orgs.push({ id, login: org.login, uid, authCreated: created, removed: legacyKeys });
    log(`${apply ? '→' : '(dry)'} organizations/${id} [${org.login}] ownerUid=${uid}${created ? ' (yangi Auth)' : ''} o'chiriladi: ${legacyKeys.join(', ') || '—'}`);
    if (apply) await db.collection('organizations').doc(id).update(update);
  }

  /* ── Xodimlar ── */
  const ownerUids = new Set(report.orgs.map(o => o.uid));
  data.collections.organizations.forEach(o => { if (o.data.ownerUid) ownerUids.add(o.data.ownerUid); });
  for (const { id, data: emp } of data.collections.employees) {
    const legacyKeys = LEGACY_EMP_FIELDS.filter(k => k in emp);
    if (!emp.login) { report.warnings.push(`employees/${id}: login yo'q — o'tkazildi`); continue; }

    const existing = await findUserByEmail(auth, loginToEmail(emp.login));
    if (existing && existing.uid === id && legacyKeys.length === 0) continue;  // tayyor
    if (existing && ownerUids.has(existing.uid)) {
      report.warnings.push(`employees/${id}: login "${emp.login}" tashkilot admini bilan bir xil — o'tkazildi, qo'lda hal qiling`);
      continue;
    }

    const { uid, created } = existing
      ? { uid: existing.uid, created: false }
      : await ensureAuthUser(auth, emp.login, emp.name, apply, report);

    const clean = { ...emp };
    legacyKeys.forEach(k => delete clean[k]);

    report.employees.push({ oldId: id, newId: uid, login: emp.login, authCreated: created, removed: legacyKeys });
    log(`${apply ? '→' : '(dry)'} employees/${id} → employees/${uid} [${emp.login}]${created ? ' (yangi Auth)' : ''} o'chiriladi: ${legacyKeys.join(', ') || '—'}`);
    if (!apply) continue;

    if (uid === id) {
      const upd = {};
      legacyKeys.forEach(k => { upd[k] = FieldValue.delete(); });
      if (Object.keys(upd).length) await db.collection('employees').doc(id).update(upd);
    } else {
      const target = db.collection('employees').doc(uid);
      const tSnap = await target.get();
      if (tSnap.exists) {
        report.warnings.push(`employees/${uid} allaqachon bor — employees/${id} o'chirilmadi, qo'lda tekshiring`);
        continue;
      }
      await target.set(clean);
      const check = await target.get();
      if (check.exists) await db.collection('employees').doc(id).delete();
    }
  }

  /* ── Vaqtinchalik parollar ── */
  if (apply && report.passwords.length) {
    fs.mkdirSync(pwDir, { recursive: true });
    const pwFile = path.join(pwDir, `temp-passwords-${stamp()}.csv`);
    const csv = 'login,temp_password\n' + report.passwords.map(p => `${p.login},${p.password}`).join('\n') + '\n';
    fs.writeFileSync(pwFile, csv, { mode: 0o600 });
    report.passwordFile = pwFile;
    log(`✓ Vaqtinchalik parollar: ${pwFile} (${report.passwords.length} ta) — tarqatgach o'chiring`);
  }
  report.warnings.forEach(w => log('⚠ ' + w));
  log(apply ? '✓ Migratsiya tugadi' : 'Quruq rejim: hech narsa yozilmadi. Haqiqiy ko\'chirish uchun --apply');
  return report;
}

module.exports = { migrate, backup, splitFullName };

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const ctx = init(args.project);
  migrate(ctx, { apply: !!args.apply, outDir: args.backupDir || 'backups' })
    .then(() => process.exit(0))
    .catch(e => { console.error('✗', e); process.exit(1); });
}
