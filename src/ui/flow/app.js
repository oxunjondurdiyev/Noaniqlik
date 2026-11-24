/* ═══════════════════════════════════════════════════════════════
   FLOW/APP.JS — P22-1: yagona "Yangi hisob" oqimi modelini klassik skriptlarga (src/js/table.js, app.js) ulash.
   Faqat ko'prik: `window.UCFlow` = sof model (./model.js) + dvigatel tokenizatori. Hisob yo'q, saqlash yo'q.
═══════════════════════════════════════════════════════════════ */
import * as Flow from './model.js';
import { tokenize } from '../../engine/index.js';

window.UCFlow = Object.freeze({ ...Flow, tokenize });
