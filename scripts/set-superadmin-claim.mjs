#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   set-superadmin-claim.mjs — super-admin huquqini berish / olish
   ─────────────────────────────────────────────────────────────
   Egasi O'Z KOMPYUTERIDA bir marta ishga tushiradi (Spark tarifida
   ishlaydi, Cloud Functions kerak emas). Batafsil: docs/SECURITY_SETUP.md.

   Foydalanish:
     node scripts/set-superadmin-claim.mjs --key ./serviceAccount.json --email <email>
     node scripts/set-superadmin-claim.mjs --key ./serviceAccount.json --login <login>
     node scripts/set-superadmin-claim.mjs --key ./serviceAccount.json --uid <uid>
   Qo'shimcha:
     --create   hisob yo'q bo'lsa yaratadi va kuchli parolni BIR MARTA chiqaradi
     --revoke   superadmin claim'ini olib tashlaydi
     --list     claim'i bor barcha foydalanuvchilarni ko'rsatadi

   Natija: Auth token'ida `superadmin: true` → firestore.rules
   `request.auth.token.superadmin == true`. Foydalanuvchi qayta kirishi
   (yoki token yangilanishi, ≤ 1 soat) kerak.
═══════════════════════════════════════════════════════════════ */
import { getAuth } from 'firebase-admin/auth';
import { parseArgs, initAdmin, readWebConfig, loginToEmail, strongPassword, die } from './lib/admin-init.mjs';

const args = parseArgs();
if (args.help || (!args.email && !args.uid && !args.login && !args.list)) {
  console.log('Foydalanish: node scripts/set-superadmin-claim.mjs --key ./serviceAccount.json (--email E | --login L | --uid U) [--create] [--revoke]\n' +
              '             node scripts/set-superadmin-claim.mjs --key ./serviceAccount.json --list');
  process.exit(args.help ? 0 : 1);
}

try {
  initAdmin(args);
  const auth = getAuth();

  if (args.list) {
    let token, n = 0;
    do {
      const page = await auth.listUsers(1000, token);
      page.users.filter(u => u.customClaims && u.customClaims.superadmin === true)
        .forEach(u => { n++; console.log(`  ${u.uid}  ${u.email || ''}`); });
      token = page.pageToken;
    } while (token);
    console.log(`superadmin: ${n} ta`);
    process.exit(0);
  }

  const { domain } = readWebConfig();
  const email = args.email || (args.login ? loginToEmail(args.login, domain) : undefined);

  let user;
  try {
    user = args.uid ? await auth.getUser(args.uid) : await auth.getUserByEmail(email);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    if (!args.create || !email) die('Foydalanuvchi topilmadi. Konsolda yarating yoki --create qo\'shing.');
    const password = await strongPassword(20);
    user = await auth.createUser({ email, password, emailVerified: false });
    console.log('Yangi hisob yaratildi:');
    console.log('  email/login : ' + email);
    console.log('  parol       : ' + password + '   ← BIR MARTA ko\'rsatiladi, parol menejeriga saqlang');
  }

  const claims = { ...(user.customClaims || {}) };
  if (args.revoke) delete claims.superadmin;
  else claims.superadmin = true;
  await auth.setCustomUserClaims(user.uid, claims);
  // Eski token'larni bekor qilish — o'zgarish darhol kuchga kirsin
  await auth.revokeRefreshTokens(user.uid);

  console.log(`✓ ${args.revoke ? 'superadmin olib tashlandi' : 'superadmin: true berildi'} → uid=${user.uid} email=${user.email}`);
  console.log('  Foydalanuvchi superadmin.html sahifasida qayta kirishi kerak.');
  process.exit(0);
} catch (e) {
  die(e.message);
}
