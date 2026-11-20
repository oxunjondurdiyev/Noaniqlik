/* ═══════════════════════════════════════════════════════════════
   UI/MC/RUNNER.JS — Monte-Karloni UI ni qotirmasdan bajarish (P06, RISKS R-16).
   1) Web Worker (`type: 'module'`, src/ui/mc/worker.js → src/engine/ ning O'SHA moduli) — progress va bekor qilish bilan;
   2) Worker ishlamaydigan muhitda (modulli worker qo'llab-quvvatlanmaydi, CSP, file://) — asosiy oqimda kichik
      bo'laklar bilan (har bo'lakdan keyin boshqaruv brauzerga qaytariladi).
   Ikkala yo'lda ham natija bir xil: hisob bloklarga bog'liq emas (tests/engine/montecarlo.test.js).
   Sof modul (DOM yo'q): muhit `env` orqali beriladi — testlarda soxta Worker / taymer.
═══════════════════════════════════════════════════════════════ */

// Modulga nisbatan URL: deploy'da scripts/build-site.js shu havolaga ham `?v=<sha>` qo'shadi (P13) — worker va sahifa bitta build dan
export const WORKER_URL = new URL('./worker.js', import.meta.url).href;
/** Asosiy oqimda bitta bo'lak uchun vaqt (ms): bundan keyin boshqaruv brauzerga qaytariladi. */
export const SLICE_MS = 25;

/**
 * @param {object} env
 * @param {Function} env.createMonteCarlo     dvigatel: createMonteCarlo(spec, opts)
 * @param {Function|null} [env.Worker]        Worker konstruktori (yo'q bo'lsa — asosiy oqim)
 * @param {string} [env.workerUrl]
 * @param {Function} [env.defer]              (fn) => keyingi "tik" (standart: setTimeout 0)
 * @param {Function} [env.now]                () => ms
 * @returns {{run:(spec:object, opts?:object, onProgress?:Function)=>{promise:Promise<object>, cancel:()=>void, via:()=>string}}}
 */
export function createRunner(env) {
  const defer = env.defer || (fn => setTimeout(fn, 0));
  const now = env.now || (() => Date.now());

  function runInline(spec, opts, onProgress, state, resolve) {
    state.via = 'main';
    let job;
    try { job = env.createMonteCarlo(spec, opts); }
    catch (e) { resolve({ error: 'mc_failed', detail: String((e && e.message) || e) }); return; }
    if (job.error) { resolve(job); return; }
    const tick = () => {
      if (state.cancelled) { resolve({ error: 'mc_cancelled', mode: 'MC' }); return; }
      let info;
      try {
        const t0 = now();
        do { info = job.step(1); } while (!info.done && now() - t0 < SLICE_MS);
      } catch (e) { resolve({ error: 'mc_failed', detail: String((e && e.message) || e) }); return; }
      if (onProgress) onProgress(info);
      if (!info.done) { defer(tick); return; }
      // yakuniy saralash alohida "tik" da — progress 100 % ekranga chiqib ulgursin
      defer(() => {
        if (state.cancelled) { resolve({ error: 'mc_cancelled', mode: 'MC' }); return; }
        try { resolve(job.result()); }
        catch (e) { resolve({ error: 'mc_failed', detail: String((e && e.message) || e) }); }
      });
    };
    defer(tick);
  }

  function run(spec, opts, onProgress) {
    const state = { cancelled: false, via: 'worker', worker: null, settled: false };
    let finish;
    const promise = new Promise(res => { finish = res; });
    const resolve = r => { if (!state.settled) { state.settled = true; finish(r); } };
    const o = { ...(opts || {}) };
    delete o.onProgress; delete o.shouldCancel;           // funksiyalar worker'ga uzatilmaydi

    let started = false;
    if (env.Worker) {
      try {
        const w = new env.Worker(env.workerUrl || WORKER_URL, { type: 'module' });
        state.worker = w;
        let alive = false;                                // worker'dan birinchi xabar keldi
        w.onmessage = e => {
          const m = e.data || {};
          alive = true;
          if (m.type === 'progress') { if (onProgress && !state.cancelled) onProgress(m.info); return; }
          if (m.type === 'result') { w.terminate(); state.worker = null; resolve(m.result); }
        };
        // Worker yuklanmadi (modulli worker yo'q, CSP …) — asosiy oqimga o'tiladi; ish boshlanganidan keyingi xato — natija xatosi
        w.onerror = e => {
          if (e && e.preventDefault) e.preventDefault();
          w.terminate(); state.worker = null;
          if (state.cancelled) return;
          if (alive) resolve({ error: 'mc_failed', detail: String((e && e.message) || '') });
          else runInline(spec, o, onProgress, state, resolve);
        };
        w.postMessage({ type: 'run', spec, opts: o });
        started = true;
      } catch (_) { state.worker = null; }
    }
    if (!started) runInline(spec, o, onProgress, state, resolve);

    return {
      promise,
      via: () => state.via,
      cancel() {
        if (state.settled) return;
        state.cancelled = true;
        if (state.worker) { state.worker.terminate(); state.worker = null; resolve({ error: 'mc_cancelled', mode: 'MC' }); }
        // asosiy oqimda: keyingi bo'lakda to'xtaydi (runInline)
      },
    };
  }

  return { run };
}
