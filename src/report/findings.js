/* ═══════════════════════════════════════════════════════════════
   FINDINGS.JS — hisobot qatlami: linter topilmalari bloki ("Tekshiruv natijalari"), "RASMIY EMAS" belgisi,
   hisobotdagi majburiy belgilar (P05a; RISKS R-05). Sof modul: DOM yo'q, matn `t(key)` orqali (uz / ru / en),
   har qanday qiymat `esc` orqali (src/ui/escape.js — tashqaridan beriladi). Node'da test qilinadi.
   Qoidalar:
     • barcha topilmalar (qabul qilinganlari izohi bilan) ekranda ham, BOSMA hisobotda ham chiqadi — ularni
       yashiradigan parametr YO'Q (opts ichida bunday kalit ko'rilmaydi);
     • qabul qilinmagan `error` bo'lsa hisobot "RASMIY EMAS" suv belgisi bilan chiqadi;
     • U = 0, u_c = 0, U < CMC — alohida aniq belgi (yoki laboratoriya sozlamasi bilan bloklash — UI qatlamida).
   Har bir topilmada: nima topildi (manba nomi va raqam), nima uchun (manba bandi), qanday tuzatish kerak.
═══════════════════════════════════════════════════════════════ */

const ICON = { error: '⛔', warning: '⚠', info: 'ⓘ' };
/** Ichki ko'prik qoidalari (W1, W2) belgisi ko'rsatilmaydi — ularning kodlari modullardan o'zgarishsiz keladi. */
const showRule = rule => !!rule && !/^W\d+$/.test(rule);

function fill(text, f) {
  return String(text)
    .replace(/\{p\}/g, f.param === undefined ? '' : f.param)
    .replace(/\{s\}/g, f.source === undefined ? '' : f.source)
    .replace(/\{v\}/g, f.value === undefined ? '' : f.value);
}

/**
 * Topilma matnlari (escape qilinmagan): nima topildi / nima uchun / qanday tuzatish.
 * Kalitlar: w_<code> (nima), why_<code> (nima uchun — ixtiyoriy; bo'lmasa faqat manba bandi), fix_<code> (tuzatish).
 */
export function findingText(f, t) {
  const get = key => { const v = t(key); return v === key ? '' : v; };
  return {
    what: fill(get('w_' + f.code) || f.code, f),
    why: fill(get('why_' + f.code), f),
    fix: fill(get('fix_' + f.code), f),
  };
}

/** Qabul qilishlarni topilmalarga biriktirish (dvigateldagi withAcceptances bilan bir xil qoida; qiymat o'zgarsa — bekor). */
function attach(findings, acceptances) {
  const acc = acceptances || {};
  return (findings || []).map(f => {
    const a = f.severity !== 'info' ? acc[f.id] : null;
    const ok = a && typeof a.comment === 'string' && a.comment.trim().length >= 10 && (a.value === undefined || String(a.value) === String(f.value === undefined ? '' : f.value));
    return { ...f, accepted: ok ? a : null };
  });
}

/** Hisobot holati: official (qabul qilinmagan error yo'q), critical (U = 0 / U < CMC kodlari). */
export function findingsStatus(findings, acceptances) {
  const list = attach(findings, acceptances);
  const open = list.filter(f => f.severity === 'error' && !f.accepted);
  const critical = [...new Set(list.filter(f => f.code === 'zero_u' || f.code === 'below_cmc').map(f => f.code))];
  const count = s => list.filter(f => f.severity === s).length;
  return { official: open.length === 0, openErrors: open.map(f => f.id), critical, mustFlag: critical.length > 0,
           counts: { error: count('error'), warning: count('warning'), info: count('info') }, total: list.length };
}

function itemHTML(f, o) {
  const { t, esc } = o;
  const tx = findingText(f, t);
  const legacyItem = o.legacy && o.legacyOn !== 'what' ? ` data-${o.legacy}-warning="${esc(f.code)}"` : '';
  const legacyWhat = o.legacy && o.legacyOn === 'what' ? ` data-${o.legacy}-warning="${esc(f.code)}"` : '';
  const badge = showRule(f.rule) ? `<span class="badge finding-rule finding-rule-${esc(f.severity)}">${esc(f.rule)}</span> ` : '';
  const unver = f.unverified ? ` <span class="badge badge-orange finding-unverified">unverified</span>` : '';
  const whyLine = (tx.why || f.ref)
    ? `<div class="finding-why"><span class="finding-label">${esc(t('fnd_why'))}:</span> ${tx.why ? esc(tx.why) + ' ' : ''}${f.ref ? `<span class="finding-ref">[${esc(f.ref)}]</span>` : ''}${unver}</div>` : '';
  const fixLine = tx.fix ? `<div class="finding-fix"><span class="finding-label">${esc(t('fnd_fix'))}:</span> ${esc(tx.fix)}</div>` : '';
  let accept = '';
  if (f.accepted) {
    const a = f.accepted;
    const when = a.at ? String(a.at).slice(0, 10) : '';
    accept = `<div class="finding-accepted" data-finding-accepted="${esc(f.id)}"><span class="badge badge-green">${esc(t('fnd_accepted'))}</span>
      <span class="finding-accept-meta">${esc(t('fnd_role'))}: ${esc(a.role || '—')}${when ? '; ' + esc(when) : ''}</span>
      <div class="finding-accept-comment"><span class="finding-label">${esc(t('fnd_comment'))}:</span> ${esc(a.comment)}</div>
      ${!o.print && o.canAccept ? `<button type="button" class="btn btn-ghost btn-sm" data-finding-revoke="${esc(f.id)}">${esc(t('fnd_revoke'))}</button>` : ''}</div>`;
  } else if (!o.print && o.canAccept && f.severity !== 'info') {
    accept = `<div class="finding-accept" data-finding-accept-box="${esc(f.id)}">
      <button type="button" class="btn btn-outline btn-sm" data-finding-accept="${esc(f.id)}">${esc(t('fnd_accept'))}</button>
      <div class="finding-accept-form" hidden>
        <textarea rows="2" maxlength="1000" data-finding-comment="${esc(f.id)}" placeholder="${esc(t('fnd_comment_ph'))}"></textarea>
        <button type="button" class="btn btn-primary btn-sm" data-finding-confirm="${esc(f.id)}">${esc(t('fnd_confirm'))}</button>
        <span class="text-xs text-muted">${esc(t('fnd_comment_hint'))}</span>
      </div></div>`;
  }
  // "nima topildi" satri: belgi + (qoida) + matn. Eski testlar bilan moslik: matn boshida "⚠ " (warning), "ⓘ " (info).
  const what = `<div class="finding-what"${legacyWhat}>${ICON[f.severity]} ${badge}${esc(tx.what)}</div>`;
  return `<div class="finding finding-${esc(f.severity)}${f.accepted ? ' finding-is-accepted' : ''}${f.severity === 'info' ? ' td-note' : ''}" data-finding="${esc(f.code)}" data-finding-id="${esc(f.id)}" data-finding-severity="${esc(f.severity)}"${legacyItem}>
    ${what}${whyLine}${fixLine}${accept}</div>`;
}

/**
 * "Tekshiruv natijalari" bloki (ekran va bosma hisobot uchun bir xil mazmun).
 * @param {object[]} findings  result.findings
 * @param {{t:Function, esc:Function, acceptances?:object, print?:boolean, canAccept?:boolean, scope?:string,
 *          legacy?:'rg'|'td'|'sp', legacyOn?:'item'|'what', showEmpty?:boolean}} o
 *   legacy — P08–P10 bo'limlaridagi eski data-atributlar (data-td-warning va h.k.) saqlanadi.
 * @returns {string} HTML
 */
export function findingsBlockHTML(findings, o) {
  const { t, esc } = o;
  const list = attach(findings, o.acceptances);
  if (!list.length && !o.showEmpty) return '';
  const st = findingsStatus(findings, o.acceptances);
  const sev = list.filter(f => f.severity !== 'info'), info = list.filter(f => f.severity === 'info');
  const counts = ['error', 'warning', 'info'].filter(s => st.counts[s] > 0)
    .map(s => `<span class="badge finding-count finding-count-${s}" data-findings-count="${s}">${esc(t('fnd_sev_' + s))}: ${st.counts[s]}</span>`).join(' ');
  const legacyBox = o.legacy ? ` data-${o.legacy}-warnings="1"` : '';
  return `<div class="findings-block" data-findings="1" data-findings-scope="${esc(o.scope || 'gum')}" data-findings-official="${st.official ? '1' : '0'}">
    <div class="findings-head"><span class="findings-title">${esc(t('fnd_title'))}</span> ${counts}</div>
    ${!list.length ? `<div class="findings-empty text-xs text-muted">${esc(t('fnd_none'))}</div>` : ''}
    ${!st.official ? `<div class="findings-unofficial" data-findings-unofficial="1">${esc(t('fnd_unofficial'))} — ${esc(t('fnd_unofficial_hint'))}</div>` : ''}
    ${sev.length ? `<div class="warn-box findings-list"${legacyBox}>${sev.map(f => itemHTML(f, o)).join('')}</div>` : ''}
    ${info.map(f => itemHTML(f, o)).join('')}
  </div>`;
}

/** "RASMIY EMAS" suv belgisi (bosma hisobot) — qabul qilinmagan `error` topilmasi bo'lsa. */
export function watermarkHTML(status, o) {
  if (!status || status.official) return '';
  return `<div class="report-watermark" data-report-watermark="1" aria-hidden="true">${o.esc(o.t('fnd_unofficial'))}</div>
    <div class="report-unofficial-banner" data-report-unofficial="1">${o.esc(o.t('fnd_unofficial'))} — ${o.esc(o.t('fnd_unofficial_hint'))}</div>`;
}

/** U = 0 / u_c = 0 / U < CMC — aniq belgi (R-05: standart sozlama — belgilash). */
export function criticalMarkHTML(status, o) {
  if (!status || !status.mustFlag) return '';
  return `<div class="report-critical" data-report-critical="${o.esc(status.critical.join(','))}">${ICON.error} ${status.critical.map(c => o.esc(o.t('fnd_critical_' + c))).join(' ')}</div>`;
}

/**
 * Hisobotda majburiy yoziladigan belgilar (matn satrlari, escape qilinmagan):
 *   ν qoidasi (floor / interpolate / exact) — JCGM 100:2008 G.4.1 Note 1; MC — seed va M (JCGM 101:2008 §7);
 *   BETA / unverified modullar; dvigatel versiyasi.
 * @param {object} r   dvigatel natijasi
 * @param {{t:Function, mc?:{M:number, seed:number}|null}} o
 * @returns {{key:string, text:string}[]}
 */
export function reportMarks(r, o) {
  const { t } = o;
  const out = [];
  if (!r || r.error) return out;
  const cov = r.coverage;
  if (r.kMethod === 'k2') out.push({ key: 'k', text: t('mark_k2') });
  else if (cov || r.nuRule) {
    const rule = (cov && cov.nuRule) || r.nuRule || 'floor';
    out.push({ key: 'nu_rule', text: `${t('nu_rule_line')}: ${t('nu_rule_' + rule)}` });
  }
  // P06: interval turi, P, M, generator, urug', n_dig — MCM natijasi hisobotda shular bilan birga (JCGM 101:2008 §7.9, §8)
  if (o.mc && isFinite(o.mc.M)) {
    const shortest = (o.mc.interval || 'shortest') !== 'symmetric';
    out.push({ key: 'mc', text: t('mark_mc').replace('{M}', String(o.mc.M)).replace('{seed}', String(o.mc.seed))
      .replace('{p}', (o.mc.rng && o.mc.rng.name) || 'xorshift32-legacy').replace('{v}', String(o.mc.nDig || 2))
      .replace('{s}', t(shortest ? 'mark_mc_shortest' : 'mark_mc_symmetric')) });
    // Egasi qarorlari (2026-11-18): Q-5 — u(y) aniqlanmagan (ν ≤ 2); Q-8 — §8.2 dagi δ/5 o'rniga δ (laboratoriya sozlamasi) belgilanadi
    if (o.mc.uDefined === false) out.push({ key: 'mc_u', text: t('mark_mc_u_undefined') });
    if (o.mc.validation && o.mc.validation.lowered) out.push({ key: 'mc_tol', text: t('mark_mc_tol_delta') });
  }
  if (r.unverified === true) out.push({ key: 'beta', text: t('mark_beta') });
  const unv = (r.findings || []).filter(f => f.unverified && /unverified/.test(f.code));
  if (!r.unverified && unv.length) out.push({ key: 'unverified', text: t('mark_unverified') });
  if (r.uRange && r.uRange.unverified) out.push({ key: 'unverified_urange', text: t('mark_unverified_urange') });
  if (r.engineVersion) out.push({ key: 'engine', text: `${t('rg_engine')}: ${r.engineVersion}` });
  return out;
}

/** Model turi satri (RISKS R-07): hisobotda har doim ko'rsatiladi. */
export function modelKindText(r, t) {
  const kind = r && ['error', 'value'].includes(r.modelKind) ? r.modelKind : 'unknown';
  let text = `${t('mk_label')}: ${t('mk_' + kind)}`;
  if (kind === 'value' && r.nominal !== null && r.nominal !== undefined) text += `; ${t('mk_nominal')} = ${r.nominal}`;
  return { kind, text };
}
