/* ═══════════════════════════════════════════════════════════════
   METHOD/MODEL.JS — P22-2 (audit 21.11.2026 — UX-03): Model qadamidagi "Usul" qatorining sof modeli
   (DOM yo'q — Node'da test qilinadi). HISOB YO'Q: faqat qaysi usul tanlangani va u qaysi MAVJUD interfeysni
   ochishi. Tavsiya — dvigateldan (src/engine/method-advisor.js::suggestMethod), bu yerda qoida yo'q.

   Holat (faqat interfeys maydonlari — evaluate() ularni o'qimaydi; Firebase'ga yozilmaydi):
     settings.method   — foydalanuvchi tanlagan usul kaliti (yo'q yoki 'AUTO' — Avtomatik);
     settings.dataKind — "Ma'lumot turi" savoliga javob (dvigatel DATA_KINDS).
═══════════════════════════════════════════════════════════════ */

/* Ro'yxatda FAQAT dasturda mavjud usullar. `mode` — dvigatel usul kaliti (linter MODES);
   `open` — tanlanganda ochiladigan mavjud interfeys: { tab } (+ special / topdown ichki rejimi) yoki { reveal }.
   Kragten — yo'q (P21). INTERLAB — Top-down ustasining mavjud "s_R asosida" rejimi (basis: 'sR'). */
export const METHODS = Object.freeze([
  { key: 'AUTO', labelKey: 'mt_auto' },
  { key: 'GUM', mode: 'GUM', labelKey: 'mt_gum', hintKey: 'mt_h_gum' },
  { key: 'GUM_MC', mode: 'MC', labelKey: 'mt_gum_mc', hintKey: 'mt_h_gum_mc' },
  { key: 'MULTIVARIATE', mode: 'MULTIVARIATE', labelKey: 'mt_multi', hintKey: 'mt_h_multi', open: { reveal: '[data-model-outputs]' } },
  { key: 'REGRESSION', mode: 'REGRESSION', labelKey: 'mt_regression', hintKey: 'mt_h_regression', open: { tab: 'regression' } },
  { key: 'TOP_DOWN', mode: 'TOP_DOWN', labelKey: 'mt_topdown', hintKey: 'mt_h_topdown', open: { tab: 'topdown' } },
  { key: 'INTERLAB', mode: 'TOP_DOWN', labelKey: 'mt_interlab', hintKey: 'mt_h_interlab', open: { tab: 'topdown', topdown: 'sR' } },
  { key: 'SAMPLING', mode: 'SAMPLING', labelKey: 'mt_sampling', hintKey: 'mt_h_sampling', open: { tab: 'special', special: 'sampling' } },
  { key: 'QUALITATIVE', mode: 'QUALITATIVE', labelKey: 'mt_qualitative', hintKey: 'mt_h_qualitative', open: { tab: 'special', special: 'qualitative' } },
  { key: 'MICRO', mode: 'MICRO', labelKey: 'mt_micro', hintKey: 'mt_h_micro', open: { tab: 'special', special: 'micro' }, beta: true },
  { key: 'MEDICAL', mode: 'MEDICAL', labelKey: 'mt_medical', hintKey: 'mt_h_medical', open: { tab: 'special', special: 'medical' } },
]);

/** "Ma'lumot turi" tugmalari (dvigatel DATA_KINDS bilan bir xil tartibda — test). */
export const DATA_KIND_OPTIONS = Object.freeze([
  { key: 'model', labelKey: 'mt_k_model' },
  { key: 'calibration_curve', labelKey: 'mt_k_calibration_curve' },
  { key: 'qc_crm_pt', labelKey: 'mt_k_qc_crm_pt' },
  { key: 'interlab_sr_sR', labelKey: 'mt_k_interlab_sr_sR' },
  { key: 'sampling_duplicates', labelKey: 'mt_k_sampling_duplicates' },
  { key: 'binary', labelKey: 'mt_k_binary' },
  { key: 'micro_count', labelKey: 'mt_k_micro_count' },
  { key: 'iqc_medical', labelKey: 'mt_k_iqc_medical' },
]);

export const methodOf = key => METHODS.find(m => m.key === key) || null;

/** Shablon bilan boshlangan hisobmi (usul qulflangan — formula qulfi bilan bir xil shart: src/js/table.js::tplLocked). */
export const isLocked = state => !!(state && state.template);

/** Tanlangan usul kaliti: saqlangan qiymat yo'q / noma'lum — 'AUTO' (eski saqlangan hisoblar — Avtomatik). */
export function selectedKey(state) {
  const k = state && state.settings ? state.settings.method : undefined;
  return typeof k === 'string' && k !== 'AUTO' && methodOf(k) ? k : 'AUTO';
}

/** Dvigatel tavsiyasi (suggestMethod natijasi) → ro'yxatdagi usul: TOP_DOWN + `interlab_precision` → INTERLAB; MC → GUM_MC. */
export function methodForSuggestion(s) {
  if (!s) return methodOf('GUM');
  if (s.method === 'TOP_DOWN' && (s.reasons || []).some(r => r.code === 'interlab_precision')) return methodOf('INTERLAB');
  if (s.method === 'MC') return methodOf('GUM_MC');
  return METHODS.find(m => m.mode === s.method && m.key !== 'INTERLAB') || methodOf('GUM');
}

/** Maslahatchiga beriladigan holat: GUM shablonida meta `mode` yo'q — `evaluationMode: 'GUM_BOTTOM_UP'` deb beriladi. */
export function advisorState(state) {
  const st = state || {};
  if (!st.template) return st;
  return { ...st, template: { ...st.template, evaluationMode: st.template.evaluationMode || st.template.mode || 'GUM_BOTTOM_UP' } };
}

/** "Ma'lumot turi" savoli ko'rinadimi: Avtomatik rejim, shablonsiz va formula hali kiritilmagan. */
export function showDataKind(state) {
  const st = state || {};
  if (isLocked(st) || selectedKey(st) !== 'AUTO' || st.implicit) return false;
  const blank = f => String((f && f.formula) || '').trim() === '';
  return blank(st.model) && !(Array.isArray(st.outputs) && st.outputs.some(o => !blank(o)));
}

/**
 * Usul qatori ko'rinishi (matn kalitlari bilan — tarjima DOM qatlamida).
 * @param {object} state        hisob holati (appState)
 * @param {object} suggestion   suggestMethod(advisorState(state), state.combined) natijasi
 * @returns {{ mode:'template'|'auto'|'manual', method:object, auto:boolean, locked:boolean, reasons:object[],
 *            canGo:boolean, showDataKind:boolean, dataKind:string|null }}
 *   canGo — tavsiya etilgan / tanlangan usulning alohida interfeysi bor ("O'tish" tugmasi). AVTOMATIK REJIM O'ZI
 *   HECH QACHON YORLIQ ALMASHTIRMAYDI — o'tish faqat foydalanuvchi bosganda.
 */
export function methodRow(state, suggestion) {
  const st = state || {};
  const locked = isLocked(st);
  const key = locked ? 'AUTO' : selectedKey(st);
  const auto = key === 'AUTO';
  const method = auto ? methodForSuggestion(suggestion) : methodOf(key);
  const kind = st.settings && typeof st.settings.dataKind === 'string' ? st.settings.dataKind : null;
  return {
    mode: locked ? 'template' : auto ? 'auto' : 'manual',
    method, auto, locked,
    reasons: auto && suggestion ? suggestion.reasons || [] : [],
    canGo: !!(method.open && (method.open.tab || method.open.reveal)),
    showDataKind: showDataKind(st),
    dataKind: DATA_KIND_OPTIONS.some(o => o.key === kind) ? kind : null,
  };
}

/**
 * Sabablar → qisqa matn bo'laklari: [{ key, codes? , ref, verified }]. Usul sabablari — `adv_r_<kod>`.
 * MC sabablari (P20 qaror qoidasi: a–d) bitta bo'lakka yig'iladi (`adv_r_mcm` + kodlar) — batafsil matni va qiymatlari
 * Natija qadamidagi MCM bo'limida (src/report/sections.js::mcmSection); bu yerda takrorlanmaydi.
 */
export function reasonParts(reasons) {
  const list = Array.isArray(reasons) ? reasons : [];
  const mcm = list.filter(r => ['a', 'b', 'c', 'd'].includes(r.code));
  const parts = list.filter(r => !mcm.includes(r)).map(r => ({ key: 'adv_r_' + r.code, ref: r.ref, verified: r.verified !== false }));
  if (mcm.length) parts.push({ key: 'adv_r_mcm', codes: [...new Set(mcm.map(r => r.code))], ref: [...new Set(mcm.map(r => r.ref))].join('; '), verified: true });
  return parts;
}
