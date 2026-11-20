/* TESTS/CROSSBROWSER/PAGE.JS — brauzer tomoni: saytdagi AYNAN o'sha dvigatel modullari (src/engine/, src/report/) yuklanadi.
   Playwright har bir misolni window.ucCross.run(c) orqali beradi; natija Node natijasi bilan run.js da solishtiriladi. */
import * as engine from '../../src/engine/index.js';
import { roundResult } from '../../src/report/rounding.js';
import { snapshotCase, rngSequence, encode } from './core.js';
import { describeEnvironment } from '../../src/io/env.js';

window.ucCross = {
  engineVersion: engine.ENGINE_VERSION,
  run: c => snapshotCase(engine, roundResult, c),
  rng: (seed, n) => encode(rngSequence(engine, seed, n)),
  env: () => describeEnvironment(navigator.userAgent),
};
window.ucCrossReady = true;
