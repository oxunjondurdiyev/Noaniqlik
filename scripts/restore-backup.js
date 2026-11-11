#!/usr/bin/env node
/* RESTORE-BACKUP.JS — migrate-auth.js yaratgan zaxira nusxadan hujjatlarni
   qaytarish (P02). Faqat egasining kompyuterida (Admin SDK).

     node scripts/restore-backup.js --project noaniqlikbazasi --file backups/firestore-backup-….json            # quruq
     node scripts/restore-backup.js --project noaniqlikbazasi --file backups/firestore-backup-….json --apply    # yozish

   Hujjatlar zaxiradagi ID va maydonlar bilan AYNAN qayta yoziladi (set, merge emas).
   Hech narsa o'chirilmaydi: migratsiyadan keyin yaratilgan employees/{uid} hujjatlari
   qoladi — kerak bo'lsa qo'lda o'chiring. Auth hisoblari o'zgarmaydi.
   DIQQAT: zaxirada eski passwordHash/rawPwd bor — qaytarish ularni ham qaytaradi. */
'use strict';
const fs = require('node:fs');
const { parseArgs, init } = require('./lib/admin');

async function restore({ db }, { file, apply = false, collections = ['organizations', 'employees', 'admins'], log = console.log }) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let n = 0;
  for (const name of collections) {
    for (const { id, data: doc } of (data.collections[name] || [])) {
      log(`${apply ? '→' : '(dry)'} ${name}/${id}`);
      if (apply) await db.collection(name).doc(id).set(doc);
      n++;
    }
  }
  log(`${n} ta hujjat${apply ? ' qaytarildi' : ' (yozish uchun --apply)'}`);
  return n;
}

module.exports = { restore };

if (require.main === module) {
  const a = parseArgs(process.argv.slice(2));
  if (!a.file) { console.error('--file kerak'); process.exit(2); }
  restore(init(a.project), { file: a.file, apply: !!a.apply, collections: a.only ? String(a.only).split(',') : undefined })
    .then(() => process.exit(0)).catch(e => { console.error('✗', e.message); process.exit(1); });
}
