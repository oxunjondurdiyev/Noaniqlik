#!/usr/bin/env node
/* RESET-PASSWORD.JS — foydalanuvchiga yangi vaqtinchalik parol berish (P02).
   Email yuborilmaydi (sun'iy email). Faqat egasining kompyuterida (Admin SDK).

     node scripts/reset-password.js --project noaniqlikbazasi --login a.karimov

   Yangi parol ekranga bir marta chiqariladi; barcha sessiyalar bekor qilinadi. */
'use strict';
const { parseArgs, init, loginToEmail, genPassword } = require('./lib/admin');

async function resetPassword({ auth }, { login }) {
  const user = await auth.getUserByEmail(loginToEmail(login));
  const password = genPassword();
  await auth.updateUser(user.uid, { password });
  await auth.revokeRefreshTokens(user.uid);
  return { uid: user.uid, password };
}

module.exports = { resetPassword };

if (require.main === module) {
  const a = parseArgs(process.argv.slice(2));
  if (!a.login) { console.error('--login kerak'); process.exit(2); }
  resetPassword(init(a.project), { login: a.login })
    .then(r => { console.log(`✓ ${a.login} (uid=${r.uid}) yangi vaqtinchalik parol: ${r.password}`); process.exit(0); })
    .catch(e => { console.error('✗', e.message); process.exit(1); });
}
