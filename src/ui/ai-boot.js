/* ═══════════════════════════════════════════════════════════════
   AI-BOOT.JS — AI yordamchi (P14) yuklagichi. Har doim yuklanadigan YAGONA AI bilan bog'liq modul.
   Standart holatda (laboratoriya sozlamasi `aiEnabled: false`) hech narsa qilmaydi: tugmalar yashirin,
   AI kodi (src/ui/ai/, src/ai/) YUKLANMAYDI. Yoqilganda tugma ko'rinadi va bosilganda oyna dinamik import() bilan
   yuklanadi (tests/ui/ai.test.js: o'chiq holatda import chaqirilmaydi).
   Bu faylda tarmoq chaqiruvi, kalit va AI mantiqi yo'q.
═══════════════════════════════════════════════════════════════ */
import { LocalAdapter, getLabSettings } from '../storage/index.js';

const buttons = () => [...document.querySelectorAll('[data-ai-open]')];
let enabled = false;

function apply(on) {
  enabled = on === true;
  buttons().forEach(b => { b.hidden = !enabled; });
}

async function refresh() {
  let on = false;
  try {
    const db = await new LocalAdapter().open();
    on = (await getLabSettings(db)).aiEnabled === true;
    await db.close();
  } catch (e) { on = false; }
  apply(on);
}

function bind() {
  apply(false);
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-ai-open]');
    if (!b || !enabled) return;
    const m = await import('./ai/app.js');
    m.open();
  });
  document.addEventListener('uc:lab-settings', e => apply(!!(e.detail && e.detail.aiEnabled)));
  refresh();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
