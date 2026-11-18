/* UI/MC/APP.JS — window.UCMonteCarlo: Monte-Karloni Web Worker'da (yoki asosiy oqimda bo'laklab) bajarish (P06). */
import { createMonteCarlo, MC_DEFAULTS, MC_LIMITS } from '../../engine/index.js';
import { createRunner } from './runner.js';

const runner = createRunner({
  createMonteCarlo,
  Worker: typeof Worker === 'function' ? Worker : null,
});

window.UCMonteCarlo = Object.freeze({ run: runner.run, DEFAULTS: MC_DEFAULTS, LIMITS: MC_LIMITS });
