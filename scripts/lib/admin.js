/* Admin SDK yordamchilari — scripts/*.js uchun umumiy.
   Bu skriptlar FAQAT egasining kompyuterida ishga tushiriladi (saytga yuklanmaydi).
   Hisob ma'lumotlari: GOOGLE_APPLICATION_CREDENTIALS=<service-account.json>
   yoki `gcloud auth application-default login`. Emulator: FIRESTORE_EMULATOR_HOST
   va FIREBASE_AUTH_EMULATOR_HOST o'rnatilgan bo'lsa, avtomatik emulatorga ulanadi. */
'use strict';
const crypto = require('node:crypto');

// src/js/firebase-config.js dagi qiymat bilan bir xil bo'lishi shart
const AUTH_EMAIL_DOMAIN = 'users.noaniqlikbazasi.firebaseapp.com';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out[k] = argv[++i];
      else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

function init(projectId) {
  const admin = require('firebase-admin');
  if (!projectId) throw new Error('--project <id> majburiy (masalan: --project noaniqlikbazasi)');
  if (!admin.apps.length) admin.initializeApp({ projectId });
  return { admin, projectId, db: admin.firestore(), auth: admin.auth(), FieldValue: admin.firestore.FieldValue };
}

function loginToEmail(login) {
  const l = String(login || '').trim().toLowerCase();
  return l.includes('@') ? l : l + '@' + AUTH_EMAIL_DOMAIN;
}

function genPassword(len = 12) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  while (s.length < len) {
    const b = crypto.randomBytes(1)[0];
    if (b < 256 - (256 % chars.length)) s += chars[b % chars.length];
  }
  return s;
}

async function findUserByEmail(auth, email) {
  try { return await auth.getUserByEmail(email); }
  catch (e) { if (e.code === 'auth/user-not-found') return null; throw e; }
}

module.exports = { AUTH_EMAIL_DOMAIN, parseArgs, init, loginToEmail, genPassword, findUserByEmail };
