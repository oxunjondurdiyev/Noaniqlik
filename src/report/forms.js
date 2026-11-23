/* ═══════════════════════════════════════════════════════════════
   FORMS.JS — rasmiy hisobot shakllari (HTML → chop etish / PDF) — P05b. Sof modul (DOM yo'q).
   Shakllar (REPORT_FORMS, src/report/requisites.js):
     calibration_certificate — kalibrlash sertifikati ilovasi  (ISO/IEC 17025:2017 §7.8.2, §7.8.4; ILAC P14:09/2020 §5);
     test_report             — sinov protokoli bo'limi          (§7.8.2, §7.8.3);
     budget                  — noaniqlik byudjeti asosnomasi    (CMC uchun; ILAC P14:09/2020 §4, §5.4–5.5);
     conformity              — muvofiqlik bayonoti              (§7.8.6; ILAC G8:09/2019; JCGM 106:2012).
   ISO/IEC 17025 matni repoda yo'q (pullik) — bandlar ILAC G8 §2 dagi iqtiboslar va ILAC P14 orqali; rekvizitlar
   ro'yxati unverified (requisites.js).
   Tuzilma: sarlavha (laboratoriya rekvizitlari, logotip) → hujjat rekvizitlari → to'ldirilmagan rekvizitlar
   ogohlantirishi → "RASMIY EMAS" / U = 0 belgilari → shablon belgisi → natijalar (ko'p nuqtali bo'lsa AVVAL umumiy
   jadval, KEYIN har bir nuqta) → normativ havolalar → pastki qism (dastur, versiya, build, shablon, sana, xesh, QR).
   Linter topilmalari HAR BIR shaklda chiqadi (yashiradigan parametr yo'q — RISKS R-05).
═══════════════════════════════════════════════════════════════ */
import { REPORT_FORMS, REPORT_FIELDS, missingRequisites, cleanRequisites, REQUISITES_REF } from './requisites.js';
import { normativeRefs } from './normative.js';
import { footerHTML } from './footer.js';
import { mcmMissing } from '../engine/index.js';

export { REPORT_FORMS };
export const DEFAULT_FORM = 'calibration_certificate';

const HEAD_ROWS = ['reportNo', 'issueDate', 'customer', 'customerAddress', 'item', 'itemId', 'itemCondition', 'method', 'place', 'receiptDate', 'activityDate', 'conditions', 'traceability'];

function headerHTML(o, form) {
  const { t, esc } = o.env;
  const q = cleanRequisites(o.requisites);
  const rows = HEAD_ROWS.filter(k => q[k]).map(k => `<tr data-report-req="${k}"><th>${esc(t('rq_' + k))}</th><td>${esc(q[k])}</td></tr>`).join('');
  return `<div class="print-report-header report-head" data-report-form="${esc(form)}">
      <div class="report-head-lab">
        ${q.logo ? `<img class="report-logo" data-report-logo="1" alt="" src="${esc(q.logo)}" />` : ''}
        <div>
          <div class="report-lab-name" data-report-req="labName">${esc(q.labName || '')}</div>
          <div class="report-lab-line" data-report-req="labAddress">${esc(q.labAddress || '')}</div>
          ${q.accreditation ? `<div class="report-lab-line" data-report-req="accreditation">${esc(t('rq_accreditation'))}: ${esc(q.accreditation)}</div>` : ''}
        </div>
      </div>
      <div class="report-head-title">
        <div class="print-report-title" data-report-title="${esc(form)}">${esc(t('rf_title_' + form))}</div>
        <div class="print-report-meta">${esc(t('rf_sub_' + form))}</div>
      </div>
    </div>
    ${rows ? `<table class="print-table report-req-table" data-report-requisites="1"><tbody>${rows}</tbody></table>` : ''}`;
}

/** §7.8.2.1 rekvizitlari to'ldirilmagan bo'lsa — ogohlantirish (bosma hisobotda ham chiqadi). */
export function missingHTML(o, form) {
  const { t, esc } = o.env;
  const miss = missingRequisites(o.requisites, form);
  if (!miss.length) return '';
  return `<div class="report-missing" data-report-missing="${esc(miss.join(','))}">⚠ ${esc(t('rf_missing'))}: ${miss.map(k => esc(t('rq_' + k))).join('; ')}. <span class="report-missing-ref">[${esc(REQUISITES_REF)}]</span></div>`;
}

function signatureHTML(o) {
  const { t, esc } = o.env;
  const q = cleanRequisites(o.requisites);
  return `<div class="report-sign" data-report-sign="1">
    <span>${esc(t('rq_authorizedBy'))}: ${esc(q.authorizedRole || '')} ${esc(q.authorizedBy || '________________')}</span>
    <span>${esc(t('rf_signature'))}: ________________</span>
  </div>`;
}

/* ── GUM bo'limlari ── */
function itemsOf(o) {
  if (o.rows && o.rows.length) {
    // P20: nuqta bilan birga saqlangan Monte-Karlo natijasi (bo'lsa) — MCM talab qilingan nuqtalar uchun (M5, "QORALAMA")
    return o.rows.map(x => ({ r: x.r, snap: x.point.snapshot, title: x.label, rr: x.rr, k: x.k,
      extra: { acceptances: x.point.acceptances || {}, conf: x.conf, decision: x.decision, mc: x.point.mc || null } }));
  }
  return [{ r: o.result, snap: o.snapshot, title: '', rr: null, k: undefined, extra: { mc: o.mc || null, acceptances: o.acceptances } }];
}

/** Qisqa ko'rinish: natija, topilmalar, byudjet jadvali, (bo'lsa) muvofiqlik — sinov protokoli bo'limi uchun. */
function compactItem(S, env, it, withBudget) {
  const { t, esc } = env;
  const p9 = l => `<p class="report-line">${l}</p>`;
  const conf = S.confLines(it.r, it.extra.conf, it.extra.decision);
  return `
    ${it.title ? `<div class="print-point-title">${esc(it.title)}</div>` : ''}
    ${S.findingsHtml(it.r, { scope: 'gum', print: true, spec: it.snap, acceptances: it.extra.acceptances, showEmpty: true, mc: it.extra.mc })}
    ${S.mcmSection(it.r, { print: true, mc: it.extra.mc })}
    <div class="print-section">${t('res_statement')}</div>
    <p class="report-result" data-report-result="1"><strong>${S.statement(it.r, it.rr, it.k)}</strong></p>
    ${p9(S.ilacNote(it.r))}
    ${p9(`<span data-model-kind-info="${S.confKind(it.r)}">${S.modelKindLine(it.r)}</span>`)}
    ${withBudget ? `<div class="print-section">${t('results_title')}</div>${S.budgetTable(it.r, 'print-table', false)}` : ''}${S.labSection(it.r, { print: true, acceptances: it.extra.acceptances })}
    ${conf.length ? `<div class="print-section">${t('conf_title')}</div>${conf.map(p9).join('')}` : ''}
    ${S.marksHtml(it.r, { mc: it.extra.mc })}`;
}

/** Faqat muvofiqlik bayonoti (topilmalar baribir chiqadi). */
function conformityItem(S, env, it) {
  const { t, esc } = env;
  const p9 = l => `<p class="report-line">${l}</p>`;
  const conf = S.confLines(it.r, it.extra.conf, it.extra.decision);
  const d = S.decisionOf(it.r, it.extra.decision);
  const issued = !!(d && !d.pending && !d.error && d.verdict);
  return `
    ${it.title ? `<div class="print-point-title">${esc(it.title)}</div>` : ''}
    ${S.findingsHtml(it.r, { scope: 'gum', print: true, spec: it.snap, acceptances: it.extra.acceptances, showEmpty: true, mc: it.extra.mc })}
    ${S.mcmSection(it.r, { print: true, mc: it.extra.mc })}
    <p class="report-result"><strong>${S.statement(it.r, it.rr, it.k)}</strong></p>
    <div class="print-section" data-report-conformity="${issued ? 'issued' : 'not_issued'}">${t('conf_title')}</div>
    ${conf.length ? conf.map(p9).join('') : p9(`<span data-decision-pending="limit">⚠ ${esc(t('dr_pending_limit'))}</span>`)}
    ${issued ? '' : p9(`<strong data-report-no-statement="1">${esc(t('rf_no_statement'))}</strong>`)}`;
}

function cmcLine(S, env, r) {
  const { t, esc } = env;
  if (r.cmcCheck) return '';   // P11: CMC jadvali ishlatilgan — batafsil bo'lim S.labSection da
  if (r.cmc === null || r.cmc === undefined || !(r.cmc > 0)) return '';
  return `<p class="report-line" data-report-cmc="${r.U < r.cmc ? 'below' : 'ok'}">CMC = ${esc(String(r.cmc))}${S.unitOf(r)};  U ${r.U < r.cmc ? '&lt;' : '≥'} CMC — ${esc(t(r.U < r.cmc ? 'rf_cmc_below' : 'rf_cmc_ok'))}</p>`;
}

function gumBody(o, form) {
  const S = o.sections, env = o.env, { t } = env;
  const items = itemsOf(o);
  const multi = !!(o.rows && o.rows.length);
  // Ko'p nuqtali: AVVAL umumiy jadval, KEYIN har bir nuqta
  const summary = multi ? `
    <div class="print-section">${t('pt_summary')}</div>
    <div data-report-summary="1">${S.summaryTable(o.rows)}</div>
    ${o.uniformK ? `<p class="report-line">${t('pt_uniform_k')}</p>` : ''}
    <p class="report-line">${S.ilacNote(o.rows[0].r)}</p>` : '';
  const each = fn => items.map(it => (multi ? '<div class="print-page-break"></div>' : '') + `<div data-report-point="${env.esc(it.title || '')}">${fn(it)}</div>`).join('');
  if (form === 'test_report') return summary + each(it => compactItem(S, env, it, true));
  if (form === 'conformity') return summary + each(it => conformityItem(S, env, it));
  if (form === 'budget') return summary + each(it => S.pointDetail(it.r, it.snap, it.title, it.rr, it.k, it.extra) + cmcLine(S, env, it.r));
  return summary + each(it => S.pointDetail(it.r, it.snap, it.title, it.rr, it.k, it.extra));
}

/* ── P20 (VAL-02): "QORALAMA" holati ─────────────────────────────────
   Hisobot QORALAMA bo'ladi (bloklanmaydi — egasi qarori 2026-11-21), agar:
     • requisites — tanlangan shaklning majburiy rekvizitlaridan biri bo'sh (kalibrlash sertifikati ilovasida — 13 ta;
       ro'yxat requisites.js::REQUIRED, ISO/IEC 17025:2017 §7.8.2.1 — unverified);
     • mcm        — LPU → MCM qaror qoidasi MCM ni talab qilgan (result.mcm.required), lekin u bajarilmagan / bekor qilingan
       / xato bilan tugagan (src/engine/mcm-decision.js::mcmMissing). Faqat GUM rejimi.
   Hamma shart bajarilsa — suv belgisi yo'q, pastki qismda "Yakuniy". */
export const DRAFT_REASONS = Object.freeze(['requisites', 'mcm']);
const DRAFT_MARK_PAGES = 24;   // ekrandagi A4 ko'rinishi uchun (eng uzun etalon hisobot — 16 sahifa)

/** @returns {string[]} QORALAMA sabablari (bo'sh — yakuniy hujjat) */
export function draftReasons(o) {
  const form = REPORT_FORMS.includes(o.form) ? o.form : DEFAULT_FORM;
  const out = [];
  if (missingRequisites(o.requisites, form).length) out.push('requisites');
  if ((o.mode || 'GUM') === 'GUM' && (o.result || (o.rows && o.rows.length))) {
    const S = o.sections;
    const mcOf = (r, mc) => (mc !== undefined && mc !== null ? mc : (S && S.mcOf ? S.mcOf(r) : null));
    if (itemsOf(o).some(it => it.r && mcmMissing(it.r, mcOf(it.r, it.extra.mc)))) out.push('mcm');
  }
  return out;
}

/** Diagonal suv belgisi (bosmada har sahifada; A4 ko'rinishida ham) + sababi yozilgan satr. */
export function draftHTML(reasons, env) {
  if (!reasons || !reasons.length) return '';
  const { t, esc } = env;
  // Suv belgisi: har bir <span> bitta A4 sahifa balandligida (297 mm) — ekrandagi uzun "qog'oz"da har sahifa joyida bittadan;
  // bosmada konteyner position: fixed (har sahifada takrorlanadi) va faqat birinchi <span> ko'rinadi (print.css).
  const mark = `<span>${esc(t('rf_draft'))}</span>`.repeat(DRAFT_MARK_PAGES);
  return `<div class="report-draft-mark" data-report-draft="1" aria-hidden="true">${mark}</div>
    <div class="report-draft-banner" data-report-draft-reasons="${esc(reasons.join(','))}"><strong>${esc(t('rf_draft'))}</strong> — ${reasons.map(k => esc(t('rf_draft_reason_' + k))).join('; ')}</div>`;
}

/**
 * To'liq hisobot HTML'i.
 * @param {object} o
 * @param {string} o.form        REPORT_FORMS dan biri
 * @param {string} o.lang        'uz' | 'ru' | 'en' (normativ havolalar uchun; matn — env.t)
 * @param {{t:Function, esc:Function}} o.env
 * @param {object} o.sections    createSections(env)
 * @param {object} [o.requisites]
 * @param {string} [o.mode='GUM']                     boshqa rejimlar uchun o.bodyHTML (tayyor bo'lim) beriladi
 * @param {object} [o.result], [o.snapshot], [o.mc], [o.acceptances]   bitta natija (GUM)
 * @param {object[]} [o.rows], {boolean} [o.uniformK]                   ko'p nuqtali (summaryRows)
 * @param {string} [o.bodyHTML], [o.noticeHTML], [o.marksHTML], [o.extraHTML]
 * @param {{model:object, qr?:string}} [o.footer]
 */
export function buildReport(o) {
  const form = REPORT_FORMS.includes(o.form) ? o.form : DEFAULT_FORM;
  const { t, esc } = o.env;
  const mode = o.mode || 'GUM';
  const anyDecision = mode === 'GUM' && [...(o.rows || []).map(x => x.decision !== undefined ? x.decision : x.r.decision), o.result ? o.result.decision : null].some(d => d && !d.pending && !d.error);
  const refs = normativeRefs(o.lang, { form, mode, decision: anyDecision, monteCarlo: !!o.mc });
  const body = mode === 'GUM' ? gumBody(o, form) : (o.bodyHTML || '');
  // P16: hujjat "ramka jadvali" ichida — pastki qism (ENGINE, build, xesh, QR) .report-frame-foot da, shuning uchun bosmada
  // HAR BIR SAHIFADA takrorlanadi (display: table-footer-group sahifa bo'linishida takrorlanadi). Mazmun o'zgarmagan.
  const draft = draftReasons(o);
  const status = { draft: draft.length > 0, reasons: draft };
  const content = `
    ${headerHTML(o, form)}
    ${draftHTML(draft, o.env)}
    ${missingHTML(o, form)}
    ${o.marksHTML || ''}
    ${o.noticeHTML || ''}
    <div class="report-body" data-report-body="${esc(mode)}">${body}</div>
    ${o.extraHTML || ''}
    <div class="report-refs" data-report-refs="${esc(o.lang || '')}"><span class="report-refs-label">${esc(t('rf_refs'))}:</span> ${refs.map(esc).join('; ')}</div>
    ${form === 'budget' ? '' : signatureHTML(o)}`;
  // Ramka — HAQIQIY <table>: brauzerlar sahifa bo'linishida faqat haqiqiy jadvalning <tfoot> ini takrorlaydi
  // (CSS display: table-footer-group li <div> takrorlanmaydi — Chromium 157 da tekshirildi, P16).
  // Oqibat: hujjat ichida "tbody tr" kabi avlod selektorlari ramka <tbody> siga ham ilashadi — aniq selektor ishlating
  // (masalan ".print-table > tbody > tr").
  return `
    <table class="report-frame" role="presentation" data-report-frame="${esc(form)}" data-report-status="${status.draft ? 'draft' : 'final'}">
      ${o.footer ? `<tfoot class="report-frame-foot"><tr><td>${footerHTML(o.footer.model, o.env, o.footer.qr, status)}</td></tr></tfoot>` : ''}
      <tbody class="report-frame-body"><tr><td>${content}</td></tr></tbody>
    </table>`;
}

/** Rekvizitlar oynasi uchun maydonlar ro'yxati (UI). */
export function requisiteFields() {
  return { lab: ['labName', 'labAddress', 'accreditation'], doc: REPORT_FIELDS.map(f => f.key) };
}
