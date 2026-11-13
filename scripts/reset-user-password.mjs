#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   reset-user-password.mjs — tashkilot admini (yoki super-admin)
   parolini egasi tomonidan tiklash
   ─────────────────────────────────────────────────────────────
   Sun'iy email'ga xat yuborib bo'lmaydi, Spark tarifida Cloud
   Functions yo'q — shuning uchun tashkilot ADMINI parolini egasi
   shu skript bilan o'z kompyuterida tiklaydi. XODIM parolini esa
   tashkilot admini admin panelidan tiklaydi (yangi hisob).

     node scripts/reset-user-password.mjs --key ./serviceAccount.json --login <login>
     node scripts/reset-user-password.mjs --key ./serviceAccount.json --uid <uid>

   Yangi parol BIR MARTA chiqariladi; barcha eski sessiyalar bekor qilinadi.
═══════════════════════════════════════════════════════════════ */
import { getAuth } from 'firebase-admin/auth';
import { parseArgs, initAdmin, readWebConfig, loginToEmail, strongPassword, die } from './lib/admin-init.mjs';

const args = parseArgs();
if (args.help || (!args.uid && !args.login)) {
  console.log('Foydalanish: node scripts/reset-user-password.mjs --key ./serviceAccount.json (--login L | --uid U)');
  process.exit(args.help ? 0 : 1);
}
try {
  initAdmin(args);
  const auth = getAuth();
  const user = args.uid ? await auth.getUser(args.uid)
                        : await auth.getUserByEmail(loginToEmail(args.login, readWebConfig().domain));
  const password = await strongPassword(14);
  await auth.updateUser(user.uid, { password });
  await auth.revokeRefreshTokens(user.uid);
  console.log(`✓ uid=${user.uid} (${user.email})`);
  console.log(`  yangi parol: ${password}   ← BIR MARTA; egasiga xavfsiz kanal orqali bering`);
  process.exit(0);
} catch (e) {
  die(e.message);
}
