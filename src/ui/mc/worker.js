/* ═══════════════════════════════════════════════════════════════
   UI/MC/WORKER.JS — Monte-Karlo Web Worker'i (P06, RISKS R-16). `new Worker(url, { type: 'module' })`.
   Hisob src/engine/ ning O'SHA modulida bajariladi (alohida nusxa yo'q) — natija asosiy oqimdagi bilan bir xil.
   CSP: worker `script-src 'self'` ostida yuklanadi (worker-src → script-src); tashqi skript, eval yo'q.
   Xabarlar: ← { type: 'run', spec, opts };  → { type: 'progress', info } | { type: 'result', result }.
   Bekor qilish — asosiy oqimdan worker.terminate().
═══════════════════════════════════════════════════════════════ */
import { createMonteCarlo } from '../../engine/index.js';

/** Progress xabarlari orasidagi eng kichik vaqt (ms) */
const PROGRESS_MS = 80;

/** Bitta hisob. `post` — xabar yuboruvchi (testlarda almashtiriladi). */
export function handleRun(data, post) {
  let job;
  try { job = createMonteCarlo(data.spec, data.opts); }
  catch (e) { post({ type: 'result', result: { error: 'mc_failed', detail: String((e && e.message) || e) } }); return; }
  if (job.error) { post({ type: 'result', result: job }); return; }
  try {
    let last = 0, info;
    do {
      info = job.step(1);
      const t = Date.now();
      if (info.done || t - last >= PROGRESS_MS) { post({ type: 'progress', info }); last = t; }
    } while (!info.done);
    post({ type: 'result', result: job.result() });
  } catch (e) {
    post({ type: 'result', result: { error: 'mc_failed', detail: String((e && e.message) || e) } });
  }
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof document === 'undefined') {
  self.onmessage = e => { if (e.data && e.data.type === 'run') handleRun(e.data, m => self.postMessage(m)); };
}
