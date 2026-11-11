#!/usr/bin/env node
/* SET-SUPERADMIN.JS — super-admin huquqini berish yoki olib tashlash (P02).
   Faqat egasining kompyuterida (Admin SDK). docs/SECURITY_SETUP.md, 4-qadam.

     node scripts/set-superadmin.js --project noaniqlikbazasi --email siz@example.com
     node scripts/set-superadmin.js --project noaniqlikbazasi --email siz@example.com --mode doc
     node scripts/set-superadmin.js --project noaniqlikbazasi --email siz@example.com --revoke

   --mode claim (standart) — custom claim `superadmin: true`
   --mode doc              — Firestore `admins/{uid}` hujjati
   --mode both             — ikkalasi
   Foydalanuvchi oldindan Firebase konsolida (Authentication → Users → Add user)
   yaratilgan bo'lishi kerak. Claim o'zgargach foydalanuvchi qayta kirishi kerak. */
'use strict';
const { parseArgs, init, loginToEmail } = require('./lib/admin');

async function setSuperAdmin({ auth, db }, { email, uid, mode = 'claim', revoke = false }) {
  const user = uid ? await auth.getUser(uid) : await auth.getUserByEmail(loginToEmail(email));
  const claims = { ...(user.customClaims || {}) };
  const ref = db.collection('admins').doc(user.uid);
  if (revoke) {
    // Olib tashlash — har doim ikkala belgi ham; eski token 1 soatgacha amal qilgani uchun sessiyalar bekor qilinadi
    delete claims.superadmin;
    await auth.setCustomUserClaims(user.uid, claims);
    await ref.delete();
    await auth.revokeRefreshTokens(user.uid);
    return user.uid;
  }
  if (mode === 'claim' || mode === 'both') {
    claims.superadmin = true;
    await auth.setCustomUserClaims(user.uid, claims);
  }
  if (mode === 'doc' || mode === 'both') {
    await ref.set({ grantedAt: new Date().toISOString() });
  }
  return user.uid;
}

module.exports = { setSuperAdmin };

if (require.main === module) {
  const a = parseArgs(process.argv.slice(2));
  if (!a.email && !a.uid) { console.error('--email yoki --uid kerak'); process.exit(2); }
  setSuperAdmin(init(a.project), { email: a.email, uid: a.uid, mode: a.mode || 'claim', revoke: !!a.revoke })
    .then(uid => { console.log(`✓ ${a.revoke ? 'Olib tashlandi' : 'Berildi'}: uid=${uid} (mode=${a.mode || 'claim'})`); process.exit(0); })
    .catch(e => { console.error('✗', e.message); process.exit(1); });
}
