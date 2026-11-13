/* Admin SDK skriptlari uchun umumiy yordamchi.
   ─────────────────────────────────────────────────────────────
   • firebase-admin — faqat devDependency, saytga yuklanmaydi.
   • Service account kaliti faqat egasining kompyuterida turadi
     (.gitignore: serviceAccount*.json, *.key.json). Kalit yo'li
     --key bilan yoki GOOGLE_APPLICATION_CREDENTIALS orqali beriladi.
   • FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST o'rnatilgan
     bo'lsa — kalitsiz, Emulator'ga ulanadi (sinov uchun). */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { out[k] = next; i++; }
      else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

// src/js/firebase-config.js dan projectId va LOGIN_EMAIL_DOMAIN (bitta manba).
export function readWebConfig() {
  const src = readFileSync(join(ROOT, 'src/js/firebase-config.js'), 'utf8');
  const projectId = (src.match(/projectId:\s*"([^"]+)"/) || [])[1];
  const domain = (src.match(/LOGIN_EMAIL_DOMAIN\s*=\s*'([^']+)'/) || [])[1];
  if (!projectId || !domain) throw new Error('firebase-config.js dan projectId / LOGIN_EMAIL_DOMAIN o\'qib bo\'lmadi');
  return { projectId, domain };
}

export function loginToEmail(login, domain) {
  const l = String(login).trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(l) || l.includes('..')) {
    throw new Error(`Login formati noto'g'ri: ${login}`);
  }
  return `${l}@users.${domain}`;
}

export function initAdmin(args) {
  const { projectId } = readWebConfig();
  const project = args.project || projectId;
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`[emulator] ${process.env.FIREBASE_AUTH_EMULATOR_HOST || ''} ${process.env.FIRESTORE_EMULATOR_HOST || ''} — project ${project}`);
    return initializeApp({ projectId: project });
  }
  const keyPath = args.key || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    throw new Error('Service account kaliti kerak: --key ./serviceAccount.json (docs/SECURITY_SETUP.md, 4-qadam)');
  }
  const abs = resolve(keyPath);
  if (!existsSync(abs)) throw new Error('Kalit fayli topilmadi: ' + abs);
  const key = JSON.parse(readFileSync(abs, 'utf8'));
  if (key.project_id && key.project_id !== project) {
    throw new Error(`Kalit boshqa loyihaga tegishli: ${key.project_id} ≠ ${project}`);
  }
  return initializeApp({ credential: args.key ? cert(key) : applicationDefault(), projectId: project });
}

// Kuchli tasodifiy parol: 20 belgi, o'xshash belgilarsiz.
export async function strongPassword(len = 20) {
  const { randomInt } = await import('node:crypto');
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[randomInt(chars.length)];
  return s;
}

export function die(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}
