#!/usr/bin/env node
/* CLEANUP-ORPHAN-AUTH.JS — Firestore'da profili yo'q Auth hisoblarini topish va
   (ixtiyoriy) o'chirish. Admin xodimni o'chirganda Auth hisobi qoladi — mijoz
   SDK uni o'chira olmaydi (P02, docs/SECURITY_SETUP.md, 7-qadam).

     node scripts/cleanup-orphan-auth.js --project noaniqlikbazasi           # ro'yxat
     node scripts/cleanup-orphan-auth.js --project noaniqlikbazasi --apply   # o'chirish

   Faqat AUTH_EMAIL_DOMAIN dagi (sun'iy) hisoblar ko'riladi; super-adminlar
   (claim yoki admins/{uid}) hech qachon o'chirilmaydi. */
'use strict';
const { parseArgs, init, AUTH_EMAIL_DOMAIN } = require('./lib/admin');

async function findOrphans({ auth, db }) {
  const owners = new Set((await db.collection('organizations').get()).docs.map(d => d.data().ownerUid).filter(Boolean));
  const emps   = new Set((await db.collection('employees').get()).docs.map(d => d.id));
  const admins = new Set((await db.collection('admins').get()).docs.map(d => d.id));
  const orphans = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (!u.email || !u.email.endsWith('@' + AUTH_EMAIL_DOMAIN)) continue;
      if ((u.customClaims || {}).superadmin === true || admins.has(u.uid)) continue;
      if (!owners.has(u.uid) && !emps.has(u.uid)) orphans.push({ uid: u.uid, email: u.email, created: u.metadata.creationTime });
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return orphans;
}

module.exports = { findOrphans };

if (require.main === module) {
  const a = parseArgs(process.argv.slice(2));
  const ctx = init(a.project);
  findOrphans(ctx).then(async list => {
    list.forEach(o => console.log(`${a.apply ? '✗ o\'chirildi' : '·'} ${o.email}  uid=${o.uid}  ${o.created}`));
    if (a.apply && list.length) await ctx.auth.deleteUsers(list.map(o => o.uid));
    console.log(`${list.length} ta yetim hisob${a.apply ? ' o\'chirildi' : ' (o\'chirish uchun --apply)'}`);
    process.exit(0);
  }).catch(e => { console.error('✗', e.message); process.exit(1); });
}
