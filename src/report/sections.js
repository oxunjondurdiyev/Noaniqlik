/* ═══════════════════════════════════════════════════════════════
   SECTIONS.JS — hisobot bo'limlari (HTML satrlari): GUM (natija, kirishlar, byudjet, korrelyatsiya, qadamlar,
   muvofiqlik, ko'p nuqtali jadval), REGRESSION, TOP_DOWN va maxsus rejimlar (namuna olish, sifatli test,
   mikrobiologiya, tibbiy laboratoriya). P05b da src/js/report.js dan shu yerga ko'chirildi (PLAN.md P05).
   Sof modul: DOM, global obyekt va brauzer xotirasi yo'q — Node'da test qilinadi. Tashqi bog'liqliklar `env` orqali:
     env.t(key)             — matn (uz / ru / en);
     env.esc(text)          — HTML escape (src/ui/escape.js); HAR QANDAY foydalanuvchi qiymati shu orqali;
     env.acceptances(scope) — asoslangan holda qabul qilingan topilmalar { id: {comment, role, at, value} };
     env.canAccept()        — qabul qilish tugmalari ko'rsatilsinmi (ekranda);
     env.lab()              — laboratoriya sozlamalari (criticalMode, cmcMode …) yoki null.
   Yaxlitlash faqat shu qatlamda: roundResult (U ≤ 2 qiymatli raqam — ILAC P14:09/2020 §5.3; JCGM 100:2008 7.2.6).
   Bo'limlar mazmuni P05a dagi bilan AYNAN bir xil (funksiya tanalari o'zgarmagan) — tests/ui/*.test.js.
═══════════════════════════════════════════════════════════════ */
import { lint, lintReported } from '../engine/index.js';
import { roundResult } from './rounding.js';
import { fmtSci } from './format.js';
import { ellipseSvg } from './ellipse.js';
import { findingsBlockHTML, findingsStatus, watermarkHTML, criticalMarkHTML, reportMarks, modelKindText } from './findings.js';
import { labSectionHTML } from './lab.js';

/**
 * Bo'lim quruvchilari to'plami.
 * @param {{t:Function, esc:Function, acceptances?:Function, canAccept?:Function, lab?:Function}} environment
 */
export function createSections(environment) {
  const env = { acceptances: () => ({}), canAccept: () => false, lab: () => null, ...environment };
  // ko'chirilgan kod o'zgarmasligi uchun eski nomlar saqlangan (i18n.t, escHtml, Calc.*)
  const i18n = { t: env.t };
  const escHtml = env.esc;
  const Calc = { lint, lintReported, roundResult, fmtSci, findingsBlockHTML, findingsStatus, watermarkHTML, criticalMarkHTML, reportMarks, modelKindText };

  const DIST_KEYS = { rect: 'dist_rect', normal: 'dist_normal', triang: 'dist_triang',
                      ushape: 'dist_ushape', resol: 'dist_resol',
                      trap: 'dist_trap', ctrap: 'dist_ctrap', exp: 'dist_exp', lognorm: 'dist_lognorm' };   // P06 (JCGM 101:2008 §6.4)

  function unitOf(r) { return r.unit ? ' ' + escHtml(r.unit) : ''; }
  function pct(P) { return (P * 100).toFixed(2).replace(/\.?0+$/, ''); }
  function nuText(nu) { return isFinite(nu) ? String(Math.floor(nu)) : '∞'; }
  function distLabel(d) { return DIST_KEYS[d] ? i18n.t(DIST_KEYS[d]).replace(/\s*\(.*$/, '') : (d || '—'); }

  /* Yaxlitlash — faqat hisobot qatlamida (src/report/rounding.js, P03). Saqlangan eski natijalardagi
     Uround/yround/resultText e'tiborsiz qoldiriladi va qayta hisoblanadi. */
  function rounded(r) { return Calc.roundResult(r.y, r.U, r.roundUp); }

  function statement(r, rr, k) {
    const text = (rr || rounded(r)).resultText;
    const kk = k !== undefined ? k : r.k;
    return `${escHtml(r.symbol)} = (${text})${unitOf(r)};  k = ${kk.toFixed(2)};  P ≈ ${pct(r.P)} %`;
  }

  /* ILAC P14:09/2020 §5.2 statement */
  function ilacNote(r) {
    return i18n.t(r.kMethod === 'k2' ? 'ilac_note_k2' : 'ilac_note').replace('{P}', pct(r.P));
  }

  const CONF_KEYS = { ok: 'conf_ok', fail: 'conf_fail', zone: 'conf_zone', na: 'conf_na' };
  function confLabel(code, guarded) {
    if (!code) return '—';
    const cls = code === 'ok' ? 'badge-green' : code === 'fail' ? 'badge-red' : 'badge-orange';
    const txt = i18n.t(CONF_KEYS[code] || 'conf_na') + (guarded && code !== 'zone' && code !== 'na' ? ' ' + i18n.t('conf_reliable') : '');
    return `<span class="badge ${cls}">${txt}</span>`;
  }

  /* P07b: oshkor bo'lmagan model (JCGM 102:2011 §6.3) — Nyuton yechimi, qoldiq, cond₁(C_y) va U_y qaysi yo'l bilan
     hisoblangani (Annex B yoki LU). Egasi qarori 2026-11-19: shart soni hisobotda ko'rsatiladi. */
  function implicitLine(r) {
    const im = r && r.implicit;
    if (!im) return '';
    const num = v => (isFinite(v) ? Calc.fmtSci(v, 3) : '∞');
    const start = (im.unknowns || []).map((n, j) => `${escHtml(n)}⁽⁰⁾ = ${escHtml(String(im.start[j]))}`).join(', ');
    return `<span data-implicit-info="${escHtml(im.covarianceMethod || '')}">${i18n.t('imp_newton')} (JCGM 102:2011 §6.3.1.2): ${i18n.t('imp_start')} ${start}; ` +
      `${i18n.t('imp_iterations')} — ${Number(im.iterations) || 0}; ${i18n.t('imp_residual')} ${num(im.residualRel)}. ` +
      `<span data-implicit-cond="1">${i18n.t('imp_cond')} = ${num(im.cond)}</span>. ` +
      `${i18n.t('imp_cov')}: ${i18n.t(im.covarianceMethod === 'lu' ? 'imp_cov_lu' : 'imp_cov_annexb')}.</span>`;
  }

  function notesHtml(r) {
    return (r.notes || []).map(n => `<div class="text-xs text-muted">ⓘ ${escHtml(i18n.t('n_' + n.code))}</div>`).join('')
      + (r.implicit ? `<div class="text-xs text-muted">ⓘ ${implicitLine(r)}</div>` : '');
  }

  /* ─── P05a: linter topilmalari ("Tekshiruv natijalari") ──────────────
     Topilmalar dvigatel natijasida (result.findings). Eski versiyada saqlangan natijada bu maydon yo'q —
     u holda saqlangan kirish (spec) bo'yicha linter qayta ishga tushiriladi (hisob o'zgarmaydi).
     Blok ekranda ham, bosma hisobotda ham chiqadi; uni yashiradigan parametr yo'q (RISKS R-05).
     Matn va HTML — src/report/findings.js (sof modul, escHtml bilan). */
  const fctx = () => ({ t: k => i18n.t(k), esc: escHtml });
  function findingsOf(r, spec) {
    if (!r || r.error) return [];
    let list = Array.isArray(r.findings) ? r.findings : (spec ? Calc.lint(spec, r) : Calc.lint({}, r));
    // X9 — hisobot qatlamining o'z-o'zini tekshiruvi: chop etiladigan yaxlitlangan satrlar
    if (!r.mode && isFinite(r.y) && isFinite(r.U)) {
      const rr = rounded(r);
      list = list.concat(Calc.lintReported({ y: rr.yround.toFixed(rr.digits), U: rr.Uround.toFixed(rr.digits) }, 'GUM'));
    }
    return list;
  }
  function findingsHtml(r, o) {
    const opt = o || {};
    const scope = opt.scope || 'gum';
    return Calc.findingsBlockHTML(findingsOf(r, opt.spec), { ...fctx(), scope, print: !!opt.print,
      acceptances: opt.acceptances || env.acceptances(scope), canAccept: !opt.print && env.canAccept() && !opt.readOnly,
      legacy: opt.legacy, legacyOn: opt.legacyOn, showEmpty: !!opt.showEmpty });
  }
  function statusOf(r, o) {
    const opt = o || {};
    return Calc.findingsStatus(findingsOf(r, opt.spec), opt.acceptances || env.acceptances(opt.scope || 'gum'));
  }
  /** Hisobotdagi majburiy belgilar: ν qoidasi, MC seed va M, BETA / unverified, dvigatel versiyasi */
  function marksHtml(r, o) {
    const marks = Calc.reportMarks(r, { t: k => i18n.t(k), mc: (o && o.mc) || null });
    if (!marks.length) return '';
    return `<div class="report-marks" data-report-marks="1">${marks.map(m => `<div class="report-mark" data-report-mark="${escHtml(m.key)}">${escHtml(m.text)}</div>`).join('')}</div>`;
  }
  /** "RASMIY EMAS" suv belgisi + U = 0 / U < CMC belgisi (bosma hisobot boshida) */
  function officialMarksHtml(statuses) {
    const merged = { official: statuses.every(x => x.official), critical: [...new Set(statuses.flatMap(x => x.critical))] };
    merged.mustFlag = merged.critical.length > 0;
    return Calc.watermarkHTML(merged, fctx()) + Calc.criticalMarkHTML(merged, fctx());
  }
  /** Laboratoriya sozlamasi bo'yicha bloklash: criticalMode = 'block' (U = 0, U < CMC) yoki cmcMode = 'block' (U < CMC) */
  function blockedBy(statuses) {
    const lab = env.lab();
    if (!lab) return null;
    const crit = new Set(statuses.flatMap(x => x.critical));
    if (lab.criticalMode === 'block' && crit.size) return crit.has('zero_u') ? 'zero_u' : 'below_cmc';
    if (lab.cmcMode === 'block' && crit.has('below_cmc')) return 'below_cmc';
    return null;
  }

  /* Model turi (RISKS R-07): hisobotda har doim ko'rsatiladi; ko'rsatilmagan bo'lsa muvofiqlik bayonoti berilmaydi */
  function modelKindLine(r) { return escHtml(Calc.modelKindText(r, k => i18n.t(k)).text); }
  function nuUsedText(r) {
    const c = r.coverage;
    if (!c) return nuText(r.nuEff); // P03 dan oldingi saqlangan natija
    if (!isFinite(c.nuUsed)) return '∞';
    return c.nuRule === 'floor' ? String(c.nuUsed) : (+c.nuUsed.toFixed(2)).toString();
  }
  function nuRuleText(r) {
    const rule = (r.coverage && r.coverage.nuRule) || 'floor';
    return `${i18n.t('nu_rule_line')}: ${i18n.t('nu_rule_' + rule)}`;
  }

  function confKind(r) { return ['error', 'value'].includes(r.modelKind) ? r.modelKind : 'unknown'; }
  function confPending(r) { return !!r.conf && (r.conf.pending || confKind(r) === 'unknown' || r.deviation === null || r.deviation === undefined); }
  /* Qaror qoidasi va muvofiqlik bayonoti (P05b). Ref: JCGM 106:2012 §7–8; ILAC G8:09/2019 §4.2, §5.2;
     ISO/IEC 17025:2017 §7.1.3, §7.8.6 (ILAC G8 §2.3, §2.6–2.7 dagi iqtiboslar bo'yicha).
     Chegara yoki qaror qoidasi berilmagan bo'lsa bayonot CHIQMAYDI (faqat eslatma). Eski saqlangan natijada
     (ENGINE < 2.5.0 — `decision` maydoni yo'q) ham bayonot berilmaydi: qayta hisoblash kerak. */
  const VERDICT_KEYS = { pass: 'dr_pass', fail: 'dr_fail', conditional_pass: 'dr_cond_pass', conditional_fail: 'dr_cond_fail' };
  function verdictBadge(d) {
    const cls = d.verdict === 'pass' ? 'badge-green' : d.verdict === 'fail' ? 'badge-red' : 'badge-orange';
    return `<span class="badge ${cls}" data-decision-verdict="${escHtml(d.verdict)}">${escHtml(i18n.t(VERDICT_KEYS[d.verdict]))}</span>`;
  }
  function decisionOf(r, decision) { return decision !== undefined ? decision : (r.decision === undefined ? null : r.decision); }
  /** Jadval katagi uchun qisqa ko'rinish */
  function decisionCell(r, decision) {
    const d = decisionOf(r, decision);
    if (!d) return '—';
    if (d.error) return `<span class="badge badge-red">${escHtml(i18n.t('dr_error_short'))}</span>`;
    if (d.pending) return `<span class="badge badge-orange" data-conf-pending="1">${escHtml(i18n.t(d.pending === 'rule' ? 'dr_pending_rule_short' : 'mk_pending_short'))}</span>`;
    return verdictBadge(d);
  }
  function limitText(v) { return v === null || v === undefined ? '—' : Calc.fmtSci(v, 6); }
  function decisionLines(r, decision) {
    const d = decisionOf(r, decision);
    const s = escHtml(r.symbol);
    if (!d) {
      // eski natija (decision maydoni yo'q), lekin chegara bor: qayta hisoblash so'raladi
      return r.decision === undefined && r.conf && r.conf.mpe > 0 && !confPending(r)
        ? [`<span data-decision-pending="recalc">⚠ ${escHtml(i18n.t('dr_pending_recalc'))}</span>`] : [];
    }
    if (d.pending === 'rule') return [`<span data-decision-pending="rule">⚠ ${escHtml(i18n.t('dr_pending_rule'))}</span>`];
    if (d.pending === 'limit') return [`<span data-decision-pending="limit">⚠ ${escHtml(i18n.t('dr_pending_limit'))}</span>`];
    if (d.pending) return [];                                   // model turi / nominal — yuqorida (mk_pending)
    if (d.error) return [`<span data-decision-error="${escHtml(d.error)}">⚠ ${escHtml(i18n.t('dr_error'))} (${escHtml(d.error)})</span>`];
    const u = unitOf(r);
    const pctOf = v => (v * 100 >= 99.995 ? '> 99,99' : v * 100 < 0.005 ? '< 0,01' : (v * 100).toFixed(2));
    const lines = [];
    const tol = d.type === 'two_sided' ? `${limitText(d.lower)} ≤ ${s} ≤ ${limitText(d.upper)}` : (d.type === 'upper' ? `${s} ≤ ${limitText(d.upper)}` : `${s} ≥ ${limitText(d.lower)}`);
    lines.push(`<span data-decision-limits="${escHtml(d.type)}">${escHtml(i18n.t('dr_limits'))}: ${tol}${u}</span>`);
    const ruleText = d.rule === 'simple' ? i18n.t('dr_rule_simple')
      : i18n.t(d.r < 0 ? 'dr_rule_guard_reject' : 'dr_rule_guard').replace('{r}', String(d.r)).replace('{w}', Calc.fmtSci(Math.abs(d.w), 3));
    lines.push(`<span data-decision-rule="${escHtml(d.rule)}">${escHtml(i18n.t('dr_rule'))}: ${escHtml(ruleText)}${u}; ${escHtml(i18n.t('dr_statement_' + d.statement))}</span>`);
    const acc = d.type === 'two_sided' ? `[${limitText(d.acceptLower)}; ${limitText(d.acceptUpper)}]` : (d.type === 'upper' ? `≤ ${limitText(d.acceptUpper)}` : `≥ ${limitText(d.acceptLower)}`);
    lines.push(`${escHtml(i18n.t('dr_accept'))}: ${acc}${u}${d.tur !== null ? `;   TUR = ${d.tur.toFixed(2)}` : ''}`);
    lines.push(`<span data-decision-pc="1">${escHtml(i18n.t('dr_pc'))}: p<sub>c</sub> = ${pctOf(d.pc)} %;   ${escHtml(i18n.t(d.riskKind === 'consumer' ? 'dr_risk_consumer' : 'dr_risk_producer'))}: ${pctOf(d.specificRisk)} % <span class="text-xs text-muted">(${escHtml(i18n.t('dr_normal'))})</span></span>`);
    lines.push(`<span data-decision-statement="${escHtml(d.verdict)}"><strong>${escHtml(i18n.t('dr_result'))}:</strong> ${verdictBadge(d)}</span>`);
    lines.push(`<span data-decision-agreement="${d.agreement ? '1' : '0'}">${escHtml(i18n.t('dr_agreement'))}: ${d.agreement ? escHtml(d.agreement) : escHtml(i18n.t('dr_agreement_none'))}</span>`);
    return lines;
  }
  function confLines(r, conf, decision) {
    const c = conf || r.conf, s = escHtml(r.symbol);
    const d = decisionOf(r, decision);
    const lines = [];
    if (!c && !d) return lines;
    lines.push(`<span data-model-kind-line="${confKind(r)}">${modelKindLine(r)}</span>`);
    if (c && confPending(r)) {
      if (c.mpe > 0) lines.push(`MPE = ±${Calc.fmtSci(c.mpe, 4)}${unitOf(r)};   U / MPE = ${(c.ratio !== null && c.ratio !== undefined ? c.ratio : r.U / c.mpe).toFixed(3)}`);
      lines.push(`<span data-conf-pending="${escHtml((c.pending) || 'model_kind')}">⚠ ${escHtml(i18n.t(c.pending === 'nominal' ? 'mk_pending_nominal' : 'mk_pending'))}</span>`);
      return lines;
    }
    if (!c && d && (d.pending === 'model_kind' || d.pending === 'nominal')) {
      lines.push(`<span data-conf-pending="${escHtml(d.pending)}">⚠ ${escHtml(i18n.t(d.pending === 'nominal' ? 'mk_pending_nominal' : 'mk_pending'))}</span>`);
      return lines;
    }
    // og'ish belgisi: |E| yoki |Y − Y_nom|
    const dev = confKind(r) === 'value' ? `|${s} − ${escHtml(String(r.nominal))}|` : `|${s}|`;
    if (c && c.mpe > 0) {
      lines.push(`MPE = ±${Calc.fmtSci(c.mpe, 4)}${unitOf(r)};   U / MPE = ${c.ratio.toFixed(3)}`);
      if (c.ratio > 1) lines.push(`⚠ ${i18n.t('w_u_gt_mpe')}`);
    } else if (c) {
      lines.push(i18n.t('conf_zero_mpe'));
    }
    lines.push(...decisionLines(r, decision));
    if (r.gamma !== null && r.gamma !== undefined) lines.push(`${i18n.t('conf_gamma')}: γ = ${dev} / ${i18n.t('set_range').toLowerCase()} · 100 = ${r.gamma.toFixed(3)} %`);
    return lines;
  }

  /* Monte-Karlo natijasi (P06). Hisobotda majburiy: interval turi, P, M, generator, urug', n_dig (JCGM 101:2008 §7.9, §8).
     Tekshiruv (§8.1.3) tanlangan interval turi bo'yicha; ikkinchi tur — ma'lumot uchun. LPU tasdiqlanmasa,
     natija sifatida MCM intervali ko'rsatiladi (M3 topilmasi bilan birga). */
  function mcLines(r, mc) {
    const d = rounded(r).digits + 1;
    const shortest = (mc.interval || 'shortest') !== 'symmetric';
    const main = shortest ? [mc.low, mc.high] : [mc.symLow, mc.symHigh];
    const other = shortest ? [mc.symLow, mc.symHigh] : [mc.low, mc.high];
    const mainKey = shortest ? 'mc_interval' : 'mc_interval_sym', otherKey = shortest ? 'mc_interval_sym' : 'mc_interval';
    const rngName = mc.rng && mc.rng.name ? mc.rng.name : 'xorshift32-legacy';
    const ad = mc.adaptive || {};
    const nDig = mc.nDig || 2;
    const lines = [
      // Egasi qarori (Q-5): ν ≤ 2 bo'lgan t-kirishda u(y) aniqlanmagan (JCGM 101:2008 §6.4.9.4, §7.6 Note 2) — son ko'rsatilmaydi
      `M = ${mc.M.toLocaleString()};  ${i18n.t('res_y')} = ${Calc.fmtSci(mc.mean, 8)};  ` +
        (mc.uDefined === false ? `<span data-mc-u-undefined="1">${i18n.t('mc_u_undefined')}</span>` : `u = ${Calc.fmtSci(mc.u)}`),
      `<span data-mc-interval="${shortest ? 'shortest' : 'symmetric'}">${i18n.t(mainKey)} (${pct(mc.P)} %): [${main[0].toFixed(d)}; ${main[1].toFixed(d)}]  →  ${i18n.t('mc_half')} ${Calc.fmtSci((main[1] - main[0]) / 2, 3)}</span>`,
      `${i18n.t(otherKey)} (${pct(mc.P)} %): [${other[0].toFixed(d)}; ${other[1].toFixed(d)}]`,
      `GUM: [${mc.gumLow.toFixed(d)}; ${mc.gumHigh.toFixed(d)}]  →  U = ${Calc.fmtSci(mc.gumU, 3)}`,
    ];
    const val = mc.validation || {};
    // §8 xulosasi faqat tekshiruv so'ralganda (oddiy MCM da berilmaydi — egasi qarori Q-8)
    if (mc.validated !== null && mc.validated !== undefined) {
      lines.push(`JCGM 101 §8: n_dig = ${nDig};  δ = ${Calc.fmtSci(mc.delta, 2)};  d_low = ${Calc.fmtSci(mc.dLow, 2)},  d_high = ${Calc.fmtSci(mc.dHigh, 2)}  →  ` +
        (mc.validated ? `<span class="badge badge-green">${i18n.t('mc_valid')}</span>` : `<span class="badge badge-orange">${i18n.t('mc_not_valid')}</span>`));
    }
    // MCM natijalarining sonli toleransi: talab (§8.2: δ/5; oddiy MCM: δ) va erishilgani (2·max s); δ ga tushirilgan bo'lsa — belgi
    if (val.required !== null && val.required !== undefined) {
      lines.push(`<span data-mc-tolerance="${val.met ? 'met' : 'not-met'}">${i18n.t('mc_tol_line')}: ${i18n.t('mc_tol_required')} ${val.tolDivisor > 1 ? 'δ/' + val.tolDivisor : 'δ'} = ${Calc.fmtSci(val.required, 2)};  ` +
        `${i18n.t('mc_tol_achieved')} = ${Calc.fmtSci(val.achieved, 2)}` +
        (val.lowered ? `;  <strong data-mc-tol-lowered="1">${i18n.t('mc_tol_lowered')}</strong>` : '') + '</span>');
    }
    lines.push(
      `<span data-mc-run="1">${i18n.t('mc_generator')}: ${escHtml(rngName)};  ${i18n.t('mc_seed')} = ${escHtml(String(mc.seed))};  ` +
        `${i18n.t(ad.enabled ? 'mc_mode_adaptive' : 'mc_mode_fixed')}` +
        (ad.enabled ? ` (JCGM 101 §7.9.4): ${i18n.t('mc_blocks')} ${mc.blocks} × ${mc.blockSize.toLocaleString()} — ${i18n.t(ad.converged ? 'mc_converged' : 'mc_not_converged')}` : '') +
        (mc.nDigAchieved !== null && mc.nDigAchieved !== undefined ? `;  ${i18n.t('mc_ndig_achieved')} = ${mc.nDigAchieved}` : '') + '</span>');
    if (mc.validated === false) {
      lines.push(`<strong data-mc-result="1">${i18n.t('mc_result_instead')}: ${escHtml(r.symbol)} = ${mc.mean.toFixed(d)}${unitOf(r)};  ` +
        `${i18n.t(mainKey)} (${pct(mc.P)} %): [${main[0].toFixed(d)}; ${main[1].toFixed(d)}]${unitOf(r)}</strong>`);
    }
    return lines;
  }
  /** MC topilmalari (M2–M4) — ekranda va bosma hisobotda (yashirilmaydi) */
  function mcFindingsHtml(mc, o) {
    const list = mc && Array.isArray(mc.findings) ? mc.findings : [];
    if (!list.length) return '';
    return Calc.findingsBlockHTML(list, { ...fctx(), scope: 'mc', print: !!(o && o.print), acceptances: {}, canAccept: false });
  }

  function renderKPIs(r) {
    const kpis = [
      { label: `${i18n.t('res_y')} ${escHtml(r.symbol)}`, value: Calc.fmtSci(r.y, 8), unit: r.unit, cls: '' },
      { label: i18n.t('kpi_uc'),     value: Calc.fmtSci(r.uc), unit: r.relUc !== null ? r.relUc.toFixed(4) + ' %' : '', cls: '' },
      { label: 'ν_eff',              value: nuText(r.nuEff),   unit: 'Welch–Satterthwaite', cls: '' },
      { label: i18n.t('res_k'),      value: r.k.toFixed(3),    unit: `P = ${pct(r.P)} %`, cls: '' },
      { label: i18n.t('res_U'),      value: Calc.fmtSci(r.U),  unit: r.relU !== null ? r.relU.toFixed(4) + ' %' : '', cls: 'kpi-success' },
    ];
    return `
      <div class="results-grid">
        ${kpis.map(k => `
          <div class="result-kpi ${k.cls}">
            <div class="result-kpi-label math">${k.label}</div>
            <div class="result-kpi-value">${k.value}</div>
            ${k.unit ? `<div class="result-kpi-unit">${escHtml(k.unit)}</div>` : ''}
          </div>`).join('')}
      </div>`;
  }

  function inputsTable(r, cls) {
    return `
      <table class="${cls}">
        <thead><tr>
          <th>${i18n.t('col_quantity')}</th>
          <th class="cell-num">n</th>
          <th class="cell-num">${i18n.t('foot_mean')}</th>
          <th class="cell-num">s</th>
          <th class="cell-num">u_A</th>
          <th class="cell-num">u_B</th>
          <th class="cell-num">u(x)</th>
          <th class="cell-num">c = ∂${escHtml(r.symbol)}/∂x</th>
          <th class="cell-num">|c|·u(x)</th>
        </tr></thead>
        <tbody>
          ${r.inputs.map(i => `<tr>
            <td><strong>${escHtml(i.name)}</strong></td>
            <td class="cell-num num mono">${i.n}</td>
            <td class="cell-num num mono">${Calc.fmtSci(i.mean, 8)}</td>
            <td class="cell-num num mono">${i.n > 1 ? Calc.fmtSci(i.s) : '—'}</td>
            <td class="cell-num num mono">${i.n > 1 ? Calc.fmtSci(i.uA) : '—'}</td>
            <td class="cell-num num mono">${Calc.fmtSci(i.uB)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(i.u)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(i.c)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(Math.abs(i.c) * i.u)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderInputs(r) {
    return `
      <div class="section-title">${i18n.t('sec_inputs')}</div>
      <div class="formula-box">${escHtml(r.symbol)} = ${escHtml(r.formulaText)}</div>
      <div class="text-xs text-muted" data-model-kind-info="${confKind(r)}">${modelKindLine(r)}</div>
      <div class="budget-table-wrap">${inputsTable(r, 'data-table math-head')}</div>`;
  }

  function budgetRows(r, withBar) {
    return r.budget.map(b => {
      const badge = b.kind === 'A' ? '<span class="badge badge-blue">A</span>'
                  : b.kind === 'B' ? '<span class="badge badge-orange">B</span>'
                  : b.kind === 'second' ? '<span class="badge badge-blue">2</span>'
                  : '<span class="badge badge-green">r</span>';
      const aNote = b.method === 2 ? ', s_p' : b.method === 3 ? ', COOMET' : '';
      const name = b.kind === 'A' ? `${escHtml(b.name)}: ${i18n.t('budget_repeat')} (n = ${b.n}${b.directional ? ', ↑/↓' : ''}${aNote}, ν = ${nuText(b.nu)})`
                 : b.kind === 'B' ? `${escHtml(b.param)}: ${b.auto ? i18n.t('budget_hyst') : escHtml(b.name)}${isFinite(b.nu) ? ` (ν = ${b.nu})` : ''}`
                 : b.kind === 'second' ? escHtml(i18n.t('so_title'))
                 : `${i18n.t('budget_corr')} ${escHtml(b.name)}`;
      const w = Math.min(100, Math.abs(b.share));
      return `<tr>
        <td>${name}</td>
        <td>${badge}</td>
        <td>${b.kind === 'corr' || b.kind === 'second' ? '—' : distLabel(b.dist)}</td>
        <td class="cell-num num mono">${Calc.fmtSci(b.u)}</td>
        <td class="cell-num num mono">${Calc.fmtSci(b.c)}</td>
        <td class="cell-num num mono">${b.ui === null ? '—' : Calc.fmtSci(b.ui)}</td>
        <td class="cell-num num mono">${Calc.fmtSci(b.contrib)}</td>
        <td class="cell-num num mono">${b.share.toFixed(2)}${withBar ? `
          <div class="share-bar"><span class="${b.share < 0 ? 'neg' : ''}" style="width:${w}%"></span></div>` : ''}</td>
      </tr>`;
    }).join('');
  }

  function budgetTable(r, cls, withBar) {
    return `
      <table class="${cls}">
        <thead><tr>
          <th>${i18n.t('budget_source')}</th>
          <th>${i18n.t('budget_type')}</th>
          <th>${i18n.t('budget_dist')}</th>
          <th class="cell-num">u(xᵢ)</th>
          <th class="cell-num">cᵢ</th>
          <th class="cell-num">|cᵢ|·u(xᵢ)</th>
          <th class="cell-num">uᵢ²(${escHtml(r.symbol)})</th>
          <th class="cell-num">${i18n.t('col_share')}</th>
        </tr></thead>
        <tbody>
          ${budgetRows(r, withBar)}
          <tr style="font-weight:600;border-top:2px solid var(--border)">
            <td colspan="5">${i18n.t('budget_total')}</td>
            <td class="cell-num num mono">${Calc.fmtSci(r.uc)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(r.uc2)}</td>
            <td class="cell-num num mono">100.00</td>
          </tr>
        </tbody>
      </table>`;
  }

  function renderBudget(r) {
    return `
      <div class="section-title">${i18n.t('results_title')}</div>
      <div class="budget-table-wrap">${budgetTable(r, 'data-table math-head', true)}</div>${labSection(r, { acceptances: env.acceptances('gum') })}`;
  }

  /** P11: reestrdan tanlangan manbalar, CMC tekshiruvi, drift asosi (./lab.js). Ishlatilmagan bo'lsa — bo'sh satr. */
  function labSection(r, opt) { return labSectionHTML(env, r, opt); }

  function corrTable(r, cls) {
    return `
      <table class="${cls}">
        <thead><tr>
          <th>${i18n.t('corr_pair')}</th>
          <th class="cell-num">${i18n.t('corr_ra')}</th>
          <th class="cell-num">s(x̄ᵢ,x̄ⱼ)</th>
          <th class="cell-num">u_B(xᵢ,xⱼ)</th>
          <th class="cell-num">u(xᵢ,xⱼ)</th>
          <th class="cell-num">r(xᵢ,xⱼ)</th>
          <th class="cell-num">2·cᵢ·cⱼ·u(xᵢ,xⱼ)</th>
        </tr></thead>
        <tbody>
          ${r.pairs.map(p => `<tr>
            <td>${escHtml(p.a)} ↔ ${escHtml(p.b)}</td>
            <td class="cell-num num mono">${p.rA.toFixed(4)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(p.covA)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(p.covB)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(p.cov)}</td>
            <td class="cell-num num mono">${p.r.toFixed(4)}</td>
            <td class="cell-num num mono">${Calc.fmtSci(p.term)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function corrNote(r) {
    return `${i18n.t('corr_effect')}: u_c,0 = ${Calc.fmtSci(r.ucNoCorr)} → u_c = ${Calc.fmtSci(r.uc)}
      (${r.corrEffectPct >= 0 ? '+' : ''}${r.corrEffectPct.toFixed(2)} %)`;
  }

  function hasCorrelation(r) { return r.pairs.length && (r.paired || r.pairs.some(p => p.cov !== 0)); }

  function renderCorrelation(r) {
    if (!hasCorrelation(r)) return '';
    return `
      <div class="section-title">${i18n.t('sec_corr')}</div>
      <div class="budget-table-wrap">${corrTable(r, 'data-table math-head')}</div>
      <div class="formula-box">${corrNote(r)}</div>`;
  }

  function stepLines(r) {
    const s = escHtml(r.symbol);
    return [
      `u_c²(${s}) = Σ cᵢ²·u²(xᵢ)${r.pairs.length ? ' + 2·ΣΣ cᵢ·cⱼ·u(xᵢ,xⱼ)' : ''} = ${Calc.fmtSci(r.uc2)}  →  u_c(${s}) = ${Calc.fmtSci(r.uc)}`,
      `ν_eff = u_c⁴ / Σ[(cᵢ·uᵢ)⁴/νᵢ] = ${isFinite(r.nuEff) ? r.nuEff.toFixed(1) : '∞'}`,
      r.kMethod === 'k2' ? `k = 2 (${i18n.t('set_k_2')})` : `k = t(P = ${pct(r.P)} %; ν = ${nuUsedText(r)}) = ${r.k.toFixed(4)}  (${nuRuleText(r)})`,
      `U = k·u_c = ${r.k.toFixed(4)} × ${Calc.fmtSci(r.uc)} = ${Calc.fmtSci(r.U)}${unitOf(r)}`,
      (rr => `${i18n.t('round_line')} (${i18n.t(r.roundUp ? 'set_round_up' : 'set_round_normal')}): U = ${rr.Uround.toFixed(rr.digits)};  ${escHtml(r.symbol)} = ${rr.yround.toFixed(rr.digits)}`)(rounded(r)),
      ...secondOrderLines(r),
    ];
  }

  /* 2-tartibli hadlar diagnostikasi (JCGM 100:2008 §5.1.2 Note) — standartda u_c ga qo'shilmaydi */
  function secondOrderLines(r) {
    const so = r.secondOrder;
    if (!so || !(so.u2 > 0)) return [];
    const idx = isFinite(so.index) ? (so.index * 100).toPrecision(3) : '∞';
    return [
      `${i18n.t('so_title')}: ${i18n.t('so_line').replace('{u2}', Calc.fmtSci(so.u2)).replace('{idx}', idx)} — ${i18n.t(so.included ? 'so_included' : 'so_not_included')}. ` +
      `${i18n.t(so.validCondition ? 'so_condition' : 'so_condition_bad')}`,
    ];
  }

  function renderSteps(r) {
    return `
      <div class="section-title">${i18n.t('section_expanded')}</div>
      ${stepLines(r).map(l => `<div class="formula-box">${l}</div>`).join('')}`;
  }

  function verifyLines(r) {
    const v = r.verify;
    const s = escHtml(r.symbol);
    return [
      `${s}̄ = Σ${s}ᵢ/n = ${Calc.fmtSci(v.mean, 8)}`,
      `${i18n.t('ver_direct')}: u_A = s(${s}ᵢ)/√n = ${Calc.fmtSci(v.uAdirect)}`,
      `${i18n.t('ver_formula')}: u_A = ${Calc.fmtSci(v.uAformula)}   (Δ = ${v.diffPct.toFixed(3)} %)`,
    ];
  }

  function renderVerify(r) {
    if (!r.verify) return '';
    return `
      <div class="section-title">${i18n.t('sec_verify')}</div>
      ${verifyLines(r).map(l => `<div class="formula-box">${l}</div>`).join('')}`;
  }

  /* ─── PRINT REPORT ──────────────────────────────── */
  function dataTable(snap) {
    const dirOn = snap.params.some(p => (((snap.settings || {}).typeA || {})[p] || {}).directional);
    const rows = Array.from({ length: snap.n }, (_, i) => i)
      .filter(i => snap.params.some(p => !isBlankCell((snap.measurements[p] || [])[i])));
    return `
      <table class="print-table">
        <thead><tr><th>#</th>${dirOn ? '<th>↑/↓</th>' : ''}${snap.params.map(p => `<th>${escHtml(p)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map(i => `<tr><td>${i + 1}</td>${dirOn ? `<td>${escHtml((snap.directions || [])[i] || '')}</td>` : ''}${snap.params.map(p =>
            `<td class="num">${escHtml(String((snap.measurements[p] || [])[i] ?? ''))}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>`;
  }

  /** @param {{acceptances?:object, conf?:object, mc?:object}} [extra]  nuqtaga tegishli qabul qilishlar; yagona k bilan qayta hisoblangan muvofiqlik */
  function pointDetail(r, snap, title, rr, k, extra) {
    const p9 = l => `<p style="font-size:9pt;margin:.25em 0">${l}</p>`;
    const ex = extra || {};
    const conf = confLines(r, ex.conf, ex.decision);
    return `
      ${title ? `<div class="print-point-title">${escHtml(title)}</div>` : ''}
      ${findingsHtml(r, { scope: 'gum', print: true, spec: snap, acceptances: ex.acceptances, showEmpty: true })}
      <div class="print-section">${i18n.t('model_title')}</div>
      <p style="font-size:10pt;margin:.4em 0 .6em"><strong>${escHtml(r.symbol)} = ${escHtml(r.formulaText)}</strong></p>
      ${p9(`<span data-model-kind-info="${confKind(r)}">${modelKindLine(r)}</span>`)}
      ${r.implicit ? p9(escHtml(i18n.t('n_implicit_model'))) + p9(implicitLine(r)) : ''}

      <div class="print-section">${i18n.t('data_title')}</div>
      ${dataTable(snap)}

      <div class="print-section">${i18n.t('sec_inputs')}</div>
      ${inputsTable(r, 'print-table')}

      <div class="print-section">${i18n.t('results_title')}</div>
      ${budgetTable(r, 'print-table', false)}${labSection(r, { print: true, acceptances: ex.acceptances || env.acceptances('gum') })}

      ${hasCorrelation(r) ? `
      <div class="print-section">${i18n.t('sec_corr')}</div>
      ${corrTable(r, 'print-table')}
      ${p9(corrNote(r))}` : ''}

      <div class="print-section">${i18n.t('section_expanded')}</div>
      ${stepLines(r).map(p9).join('')}

      ${r.verify ? `<div class="print-section">${i18n.t('sec_verify')}</div>${verifyLines(r).map(p9).join('')}` : ''}
      ${conf.length ? `<div class="print-section">${i18n.t('conf_title')}</div>${conf.map(p9).join('')}` : ''}

      <div class="print-section">${i18n.t('res_statement')}</div>
      <p style="font-size:11pt;margin:.5em 0"><strong>${statement(r, rr, k)}</strong></p>
      ${p9(ilacNote(r))}
      ${ex.mc ? `<div class="print-section">${i18n.t('mc_title')}</div>${mcLines(r, ex.mc).map(p9).join('')}${mcFindingsHtml(ex.mc, { print: true })}` : ''}
      ${marksHtml(r, { mc: ex.mc })}`;
  }

  function summaryTable(rows) {
    const anyConf = rows.some(x => x.conf && x.conf.mpe > 0);
    const anyDecision = anyConf || rows.some(x => decisionOf(x.r, x.decision));
    const sym = escHtml(rows[0].r.symbol), unit = rows[0].r.unit ? ', ' + escHtml(rows[0].r.unit) : '';
    return `
      <table class="print-table">
        <thead><tr>
          <th>${i18n.t('pt_col')}</th><th>${sym}${unit}</th><th>U${unit}</th><th>k</th><th>ν_eff</th>
          ${anyConf ? `<th>MPE</th>` : ''}${anyDecision ? `<th>${i18n.t('dr_col')}</th>` : ''}
        </tr></thead>
        <tbody>
          ${rows.map(x => `<tr>
            <td>${escHtml(x.label)}</td>
            <td class="num">${x.rr.yround.toFixed(x.rr.digits)}</td>
            <td class="num">${x.rr.Uround.toFixed(x.rr.digits)}</td>
            <td class="num">${x.k.toFixed(2)}</td>
            <td class="num">${nuText(x.r.nuEff)}</td>
            ${anyConf ? `<td class="num">${x.conf && x.conf.mpe > 0 ? Calc.fmtSci(x.conf.mpe, 3) : '—'}</td>` : ''}
            ${anyDecision ? `<td data-summary-decision="1">${x.conf && x.conf.pending ? escHtml(i18n.t('mk_pending_short')) : decisionCell(x.r, x.decision)}</td>` : ''}
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  /* P04: shablon belgilari — "Shablon tasdiqlanmagan (DRAFT)", "Namunaviy ma'lumot — real emas" va h.k. */
  /* ─── P08: REGRESSION rejimi hisobot bo'limi ─────────────────────
     Usul, parametrlar, kovariatsiya, χ² testi, teskari va to'g'ri bashorat, U — diapazon, ogohlantirishlar.
     P05 gacha shu faylda (PLAN.md "Bajarish tartibi"); keyin src/report/ shakllariga ko'chiriladi.
     Yaxlitlash faqat shu yerda (hisobot qatlami): qiymat ± noaniqlik — Calc.roundResult (U ≤ 2 qiymatli raqam). */
  function rgWarnText(w) {
    return i18n.t('w_' + w.code).replace('{p}', escHtml(w.param || '')).replace('{v}', escHtml(w.value ?? ''));
  }
  function rgErrText(code, detail) {
    return escHtml(i18n.t('err_' + code)) + (detail ? ' — ' + escHtml(detail) : '');
  }
  function rgUnit(u) { return u && u !== '1' ? ' ' + escHtml(u) : ''; }
  function rgNu(nu) { return isFinite(nu) ? (Number.isInteger(nu) ? String(nu) : nu.toFixed(1)) : '∞'; }
  function rgPair(v, u) { // qiymat va noaniqlik: noaniqlik 2 qiymatli raqamgacha, qiymat uning oxirgi xonasigacha
    const rr = Calc.roundResult(v, u, false);
    return { v: rr.yround.toFixed(rr.digits), u: rr.Uround.toFixed(rr.digits), text: rr.resultText };
  }
  function rgEquation(r) {
    const x = r.xRef ? `(x − ${escHtml(String(r.xRef))})` : 'x';
    const names = ['', `·${x}`, `·${x}²`, `·${x}³`];
    return 'y = ' + r.params.map((p, j) => {
      const v = rgPair(p.value, p.u).v;
      return (j === 0 ? v : (p.value < 0 ? '− ' + v.replace(/^-/, '') : '+ ' + v)) + names[j];
    }).join(' ');
  }
  function rgWarnings(r, opt) {   // P05a: yagona "Tekshiruv natijalari" bloki (eski data-rg-warning atributlari saqlangan)
    return findingsHtml(r, { scope: 'regression', print: !!(opt && opt.print), legacy: 'rg', legacyOn: 'what' });
  }
  function rgChi2(r) {
    const c = r.chi2;
    if (!c.applicable) return `<p class="rg-line" data-rg-chi2="na"><strong>${i18n.t('rg_chi2')}:</strong> ${i18n.t('rg_chi2_na')}</p>`;
    const badge = c.pass ? 'badge-green' : 'badge-red';
    return `<p class="rg-line" data-rg-chi2="${c.pass ? 'pass' : 'fail'}"><strong>${i18n.t('rg_chi2')}:</strong>
      ${i18n.t('rg_chi2_obs')} = ${Calc.fmtSci(c.obs, 4)}; ν = ${c.nu};
      ${i18n.t('rg_chi2_crit').replace('{P}', pct(c.P) + ' %')} = ${Calc.fmtSci(c.crit, 4)}
      <span class="badge ${badge}">${i18n.t(c.pass ? 'rg_chi2_pass' : 'rg_chi2_fail')}</span></p>`;
  }
  function rgMatrix(r, cls, M, title) {
    return `<table class="${cls} rg-matrix"><thead><tr><th>${escHtml(title)}</th>${r.params.map(p => `<th>${escHtml(p.name)}</th>`).join('')}</tr></thead>
      <tbody>${M.map((row, i) => `<tr><th>${escHtml(r.params[i].name)}</th>${row.map(v => `<td class="num">${Calc.fmtSci(v, 4)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function rgInverse(r, cls) {
    if (!r.inverse || !r.inverse.length) return '';
    const src = { given: 'rg_uy0_given', residual: 'rg_uy0_residual', common: 'rg_uy0_common' };
    return `<h4 class="rg-h">${i18n.t('rg_inverse_res')}</h4>
      <table class="${cls}" data-rg-inverse="1"><thead><tr>
        <th>${i18n.t('rg_col_y0')}</th><th>${i18n.t('rg_col_p')}</th><th>${i18n.t('rg_col_uy0')}</th><th>${i18n.t('rg_col_x0')}</th><th>${i18n.t('rg_col_u')}(x̂₀)</th>
        <th>${i18n.t('rg_col_from_y0')}</th><th>${i18n.t('rg_col_from_cal')}</th><th>${i18n.t('rg_col_nu')}</th><th>${i18n.t('rg_col_k')}</th><th>${i18n.t('rg_col_result')}</th>
      </tr></thead><tbody>${r.inverse.map(q => q.error
        ? `<tr><td class="num">${Calc.fmtSci(q.y0, 6)}</td><td class="num">${escHtml(q.p ?? '')}</td><td colspan="8">⚠ ${rgErrText(q.error, q.detail)}</td></tr>`
        : `<tr><td class="num">${Calc.fmtSci(q.y0, 6)}</td><td class="num">${q.p}</td>
            <td class="num">${Calc.fmtSci(q.uy0, 3)} <span class="text-muted">(${i18n.t(src[q.uy0Source])})</span></td>
            <td class="num">${Calc.fmtSci(q.x0, 6)}</td><td class="num">${Calc.fmtSci(q.u, 3)}</td>
            <td class="num">${Calc.fmtSci(q.components.y0, 3)}</td><td class="num">${Calc.fmtSci(q.components.calibration, 3)}</td>
            <td class="num">${rgNu(q.nu)}</td><td class="num">${q.k.toFixed(2)}</td>
            <td class="num"><strong>(${rgPair(q.x0, q.U).text})${rgUnit(r.units.x)}</strong>${q.extrapolated ? ` <span class="badge badge-orange">${i18n.t('rg_extrap')}</span>` : ''}${
              !(q.U > 0) ? ` <span class="badge badge-red">⚠ ${escHtml(i18n.t('w_zero_u'))}</span>` : ''}</td></tr>`).join('')}</tbody></table>`;
  }
  function rgPredict(r, cls) {
    if (!r.predictions || !r.predictions.length) return '';
    return `<h4 class="rg-h">${i18n.t('rg_predict_res')}</h4>
      <table class="${cls}" data-rg-predict="1"><thead><tr><th>x</th><th>${i18n.t('rg_col_Y')}</th><th>${i18n.t('rg_col_u')}</th><th>${i18n.t('rg_col_nu')}</th><th>${i18n.t('rg_col_k')}</th><th>${i18n.t('rg_col_result')}</th></tr></thead>
      <tbody>${r.predictions.map(q => q.error
        ? `<tr><td class="num">${escHtml(q.x)}</td><td colspan="5">⚠ ${rgErrText(q.error, q.detail)}</td></tr>`
        : `<tr><td class="num">${Calc.fmtSci(q.x, 6)}${rgUnit(r.units.x)}</td><td class="num">${Calc.fmtSci(q.y, 6)}</td><td class="num">${Calc.fmtSci(q.u, 3)}</td>
            <td class="num">${rgNu(q.nu)}</td><td class="num">${q.k.toFixed(2)}</td>
            <td class="num"><strong>(${rgPair(q.y, q.U).text})${rgUnit(r.units.y)}</strong>${q.extrapolated ? ` <span class="badge badge-orange">${i18n.t('rg_extrap')}</span>` : ''}${
              !(q.U > 0) ? ` <span class="badge badge-red">⚠ ${escHtml(i18n.t('w_zero_u'))}</span>` : ''}</td></tr>`).join('')}</tbody></table>`;
  }
  function rgURange(r, cls) {
    const f = r.uRange;
    if (!f) return '';
    if (f.error) return `<h4 class="rg-h">${i18n.t('rg_urange_title')}</h4><div class="warn-box">⚠ ${rgErrText(f.error, f.detail)}</div>`;
    const expr = f.mode === 'max' ? `U = ${Calc.fmtSci(f.a, 3)}` : `U(X) = ${Calc.fmtSci(f.a, 3)} ${f.b < 0 ? '−' : '+'} ${Calc.fmtSci(Math.abs(f.b), 3)}·|X|`;
    return `<h4 class="rg-h">${i18n.t('rg_urange_title')}</h4>
      <p class="rg-line" data-rg-urange="${escHtml(f.mode)}"><strong>${i18n.t('rg_urange_applied')}:</strong> ${i18n.t('rg_urange_' + f.mode)} — <span class="mono">${expr}</span>${rgUnit(r.units.y)};
        |X| ∈ [${Calc.fmtSci(f.range[0], 4)}; ${Calc.fmtSci(f.range[1], 4)}]${f.shift > 0 ? `; ${i18n.t('rg_urange_shift')} ${Calc.fmtSci(f.shift, 3)}` : ''}</p>
      <p class="rg-line"><span class="badge badge-orange">unverified</span> ${i18n.t('rg_urange_unverified')}</p>
      <table class="${cls}"><thead><tr><th>X_j</th><th>U_j</th><th>U(X_j)</th><th>${i18n.t('rg_urange_margin')}</th></tr></thead>
      <tbody>${f.points.map(q => `<tr><td class="num">${Calc.fmtSci(q.x, 6)}</td><td class="num">${Calc.fmtSci(q.U, 3)}</td><td class="num">${Calc.fmtSci(q.Ufit, 3)}</td><td class="num">${Calc.fmtSci(q.margin, 2)}</td></tr>`).join('')}</tbody></table>`;
  }
  function rgResiduals(r, cls) {
    return `<h4 class="rg-h">${i18n.t('rg_residuals')}</h4>
      <table class="${cls}"><thead><tr><th>#</th><th>x</th><th>u(x)</th><th>y</th><th>u(y)</th><th>${i18n.t('rg_col_fitted')}</th><th>${i18n.t('rg_col_resid')}</th><th>${i18n.t('rg_col_wres')}</th></tr></thead>
      <tbody>${r.points.map((p, i) => `<tr><td>${i + 1}</td><td class="num">${escHtml(p.x)}</td><td class="num">${p.ux === null ? '—' : escHtml(p.ux)}</td>
        <td class="num">${escHtml(p.y)}</td><td class="num">${p.uy === null ? '—' : escHtml(p.uy)}</td>
        <td class="num">${Calc.fmtSci(r.fitted[i], 6)}</td><td class="num">${Calc.fmtSci(r.residuals[i], 3)}</td><td class="num">${Calc.fmtSci(r.weightedResiduals[i], 3)}</td></tr>`).join('')}</tbody></table>`;
  }

  /**
   * Regressiya bo'limi (ekran va bosma hisobot uchun bir xil mazmun).
   * @param {object} r     evaluate({format:'uc-regression/1', …}) natijasi
   * @param {{print?:boolean, plots?:string, residualTable?:boolean}} [o]  plots — src/ui/regression/view.js SVG'lari
   */
  function regressionSection(r, o) {
    const opt = o || {};
    if (!r) return '';
    if (r.error) return `<div class="warn-box" data-rg-error="${escHtml(r.error)}">⚠ ${rgErrText(r.error, r.detail)}</div>`;
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const sLine = r.sKind === 'y'
      ? `${i18n.t('rg_s')} = ${Calc.fmtSci(r.s, 4)}${rgUnit(r.units.y)}`
      : `${i18n.t('rg_s_rel')} = ${Calc.fmtSci(r.s, 4)}`;
    const anyPred = (r.inverse && r.inverse.length) || (r.predictions && r.predictions.length);
    return `<div class="rg-report" data-rg-report="1">
      <div class="${opt.print ? 'print-section' : 'rg-section-title'}">${i18n.t('rg_report_section')}</div>
      ${rgWarnings(r, opt)}
      <p class="rg-line"><strong>${i18n.t('rg_method')}:</strong> <span data-rg-method="${escHtml(r.method)}">${i18n.t('rg_m_' + r.method)}</span>;
        <strong>${i18n.t('rg_degree')}:</strong> ${i18n.t('rg_deg_' + r.degree)}${r.xRef ? `; x₀ = ${escHtml(String(r.xRef))}${rgUnit(r.units.x)}` : ''}</p>
      <p class="rg-line">${i18n.t('rg_points_n')} = ${r.m}; ${i18n.t('rg_nu')} = ${r.nu}; ${sLine}${r.wtls ? `; ${i18n.t('rg_wtls_iter')}: ${r.wtls.iterations}` : ''}</p>
      <p class="rg-line"><strong>${i18n.t('rg_equation')}:</strong> <span class="mono" data-rg-equation="1">${rgEquation(r)}</span></p>
      <h4 class="rg-h">${i18n.t('rg_params')}</h4>
      <table class="${cls}" data-rg-params="1"><thead><tr><th>${i18n.t('rg_param')}</th><th>${i18n.t('rg_value')}</th><th>${i18n.t('rg_std_u')}</th><th>${i18n.t('rg_rel_u')}</th></tr></thead>
        <tbody>${r.params.map(p => { const v = rgPair(p.value, p.u); return `<tr><td>${escHtml(p.name)}</td><td class="num">${v.v}</td><td class="num">${v.u}</td>
          <td class="num">${p.value !== 0 ? (Math.abs(p.u / p.value) * 100).toPrecision(3) : '—'}</td></tr>`; }).join('')}</tbody></table>
      <p class="rg-line"><strong>${i18n.t('rg_basis')}:</strong> <span data-rg-basis="${escHtml(r.covarianceBasis)}">${i18n.t('rg_basis_' + r.covarianceBasis)}</span></p>
      <h4 class="rg-h">${i18n.t('rg_cov')}</h4>
      ${rgMatrix(r, cls, r.covariance, 'cov')}
      ${rgMatrix(r, cls, r.correlation, 'r')}
      ${rgChi2(r)}
      ${opt.plots || ''}
      ${rgInverse(r, cls)}
      ${rgPredict(r, cls)}
      ${anyPred ? `<p class="rg-line text-muted">${i18n.t('rg_k_note').replace('{P}', pct(r.P)).replace('{rule}', i18n.t('nu_rule_' + (r.nuRule || 'floor')))}</p>` : ''}
      ${rgURange(r, cls)}
      ${opt.residualTable ? rgResiduals(r, cls) : ''}
      <p class="rg-line text-muted text-xs">${i18n.t('rg_ref_line')}: ${i18n.t('rg_ref_text')}. ${i18n.t('rg_engine')}: ${escHtml(r.engineVersion)}</p>
    </div>`;
  }

  /** Faqat regressiya hisoboti (regressiya yorlig'idagi "Chop etish"). meta — shablon belgilari (DRAFT, demo). */
  /* ─── P09: TOP_DOWN rejimi hisobot bo'limi ───────────────────────
     Natija sinov protokoliga mos ko'rinishda — ISO/IEC 17025:2017 §7.8.3.1 c): noaniqlik o'lchanayotgan
     kattalik birligida yoki unga nisbatan (foizda). Ko'rsatiladi: y, U, nisbiy U %, k, qo'llanilgan yondashuv nomi.
     Byudjet, u(R_w) / u(bias) / recovery / s_R tafsilotlari, X11 / X12 va boshqa ogohlantirishlar.
     P05 gacha shu faylda; yaxlitlash faqat shu yerda (Calc.roundResult: U ≤ 2 qiymatli raqam). */
  function tdNum(v, sig) { return v === null || v === undefined || !isFinite(v) ? '—' : Calc.fmtSci(v, sig || 4); }
  function tdU2(u, up) { // noaniqlik: ko'pi bilan 2 qiymatli raqam (ILAC P14 §5)
    if (u === null || u === undefined || !isFinite(u)) return '—';
    const rr = Calc.roundResult(0, u, !!up);
    return rr.Uround.toFixed(rr.digits);
  }
  function tdScaleUnit(r) { return r.unit === '1' ? '' : ' ' + escHtml(r.unit); }
  function tdWarnings(r, opt) {   // P05a: X11 / X12 va boshqalar — linter topilmalari (eski data-td-warning atributlari saqlangan)
    return findingsHtml(r, { scope: 'topdown', print: !!(opt && opt.print), legacy: 'td' });
  }
  function tdBudgetName(b) {
    if (b.kind === 'additional') return `${escHtml(b.name || b.id)} <span class="text-xs text-muted">(${i18n.t('td_cat_' + b.category)})</span>`;
    return i18n.t('td_row_' + (b.id === 'uDelta' ? 'uDelta' : b.kind));
  }
  function tdBudget(r, cls) {
    return `<h4 class="rg-h">${i18n.t('td_budget')}</h4>
      <table class="${cls}" data-td-budget="1"><thead><tr><th>${i18n.t('td_col_component')}</th><th>u${tdScaleUnit(r)}</th><th>u²</th><th>ν</th><th>${i18n.t('td_col_share')}</th><th>${i18n.t('td_col_note')}</th></tr></thead>
        <tbody>${r.budget.map(b => `<tr data-td-row="${escHtml(b.id)}"${b.included ? '' : ' class="td-excluded"'}>
          <td>${tdBudgetName(b)}</td><td class="num">${tdNum(b.u)}</td><td class="num">${tdNum(b.variance)}</td><td class="num">${rgNu(b.nu)}</td>
          <td class="num">${b.included ? b.share.toFixed(1) : '—'}</td>
          <td>${b.flag ? `<span class="badge badge-orange" data-td-flag="${escHtml(b.flag)}">${escHtml(b.flag)}</span> ` : ''}${b.included ? '' : i18n.t('td_excluded')}</td></tr>`).join('')}
          <tr class="td-total"><td><strong>u_c</strong></td><td class="num"><strong>${tdNum(r.uc)}</strong></td><td class="num">${tdNum(r.uc2)}</td><td class="num">${rgNu(r.nuEff)}</td><td class="num">100.0</td><td></td></tr>
        </tbody></table>`;
  }
  function tdRw(r, cls) {
    if (!r.rw) return '';
    return `<h4 class="rg-h">${i18n.t('td_rw_title')}</h4>
      <table class="${cls}" data-td-rw="1"><thead><tr><th>${i18n.t('td_col_source')}</th><th>n</th><th>${i18n.t('td_col_mean')}</th><th>s</th><th>u${tdScaleUnit(r)}</th></tr></thead>
        <tbody>${r.rw.components.map(c => `<tr><td>${i18n.t('td_src_' + c.type)}${c.relativeMethod ? ` <span class="text-xs text-muted">(${i18n.t('td_dup_' + c.relativeMethod)})</span>` : ''}</td>
          <td class="num">${c.n === null || c.n === undefined ? '—' : escHtml(String(c.n))}</td><td class="num">${tdNum(c.mean)}</td><td class="num">${tdNum(c.s)}</td><td class="num">${tdNum(c.u)}</td></tr>`).join('')}
          <tr class="td-total"><td><strong>u(R_w)</strong></td><td></td><td></td><td></td><td class="num"><strong>${tdNum(r.rw.u)}</strong></td></tr></tbody></table>`;
  }
  function tdBias(r, cls) {
    const b = r.bias;
    if (!b) return '';
    const single = b.formula === 'single_crm';
    return `<h4 class="rg-h">${i18n.t('td_bias_title')}: ${i18n.t('td_bias_' + b.type)}</h4>
      <table class="${cls}" data-td-bias="1"><thead><tr><th>#</th><th>bias${tdScaleUnit(r)}</th><th>u(C_ref)${tdScaleUnit(r)}</th></tr></thead>
        <tbody>${b.items.map(it => `<tr><td>${escHtml(it.id)}</td><td class="num">${tdNum(it.bias)}</td><td class="num">${tdNum(it.uRef)}</td></tr>`).join('')}</tbody></table>
      <p class="rg-line">${single ? `bias = ${tdNum(b.rms)}; s_bias/√n = ${tdNum(b.sMean)}` : `RMS_bias = ${tdNum(b.rms)} (N = ${b.n})`}; u(C_ref) = ${tdNum(b.uRef)};
        <strong>u(bias) = ${tdNum(b.u)}${tdScaleUnit(r)}</strong> — <span class="mono">${single ? '√(bias² + (s_bias/√n)² + u(C_ref)²)' : '√(RMS_bias² + u(C_ref)²)'}</span></p>`;
  }
  function tdRecovery(r) {
    const c = r.recovery;
    if (!c) return '';
    return `<h4 class="rg-h">${i18n.t('td_rec_title')}</h4>
      <p class="rg-line" data-td-recovery="${c.significant ? 'significant' : 'not_significant'}">R_m = ${tdNum(c.Rm)}${tdScaleUnit(r)}; s = ${tdNum(c.s)}; n = ${c.n};
        u(R_m) = s/√n = ${tdNum(c.uRm)}; t = |1 − R_m|/u(R_m) = ${tdNum(c.t, 3)}; t_crit(${Math.round(c.P * 100)} %, ν = ${c.nu}) = ${tdNum(c.tCrit, 4)}
        <span class="badge ${c.significant ? 'badge-orange' : 'badge-green'}">${i18n.t(c.significant ? 'td_rec_sig' : 'td_rec_nosig')}</span></p>
      <p class="rg-line"><strong>${i18n.t('td_rec_correction')}:</strong> <span data-td-correction="${escHtml(c.correction)}">${i18n.t('td_corr_' + c.correction)}</span>;
        ${i18n.t('td_rec_contrib')} = ${tdNum(c.u)}${tdScaleUnit(r)}${r.yCorrected !== null ? `; ${i18n.t('td_y_corrected')} = ${tdNum(r.yCorrected, 6)}${rgUnit(r.yUnit)}` : ''}</p>`;
  }
  function tdRepro(r) {
    const p = r.reproducibility;
    if (!p) return '';
    const l = p.lab;
    return `<h4 class="rg-h">${i18n.t('td_sr_title')}</h4>
      <p class="rg-line" data-td-sr="1">s_R = ${tdNum(p.sR)}${tdScaleUnit(r)}${p.sr !== null ? `; s_r = ${tdNum(p.sr)}${tdScaleUnit(r)}` : ''}${p.sRUsed !== p.sR ? `; s_R′ = ${tdNum(p.sRUsed)}${tdScaleUnit(r)}` : ''}</p>
      ${l ? `<p class="rg-line" data-td-labcheck="${l.pass ? 'pass' : 'fail'}"><strong>${i18n.t('td_lab_check')}:</strong> s_lab = ${tdNum(l.s)} (n = ${escHtml(String(l.n))}); s_lab/s_r = ${tdNum(l.ratio, 3)};
        χ² = ${tdNum(l.chi2, 4)} ${l.pass ? '≤' : '&gt;'} ${tdNum(l.chi2Crit, 4)} <span class="badge ${l.pass ? 'badge-green' : 'badge-orange'}">${i18n.t(l.pass ? 'td_lab_pass' : 'td_lab_fail')}</span>
        <span class="badge badge-orange">unverified</span></p>` : ''}`;
  }
  function tdLevel(r) {
    const l = r.level;
    if (!l) return '';
    return `<h4 class="rg-h">${i18n.t('td_level_title')}</h4>
      <p class="rg-line" data-td-level="1"><span class="mono">u(x) = √(s₀² + (x·s₁)²)</span>; s₀ = ${tdNum(l.s0)}${tdScaleUnit(r)}; s₁ = ${tdNum(l.s1)}; x = ${tdNum(l.x, 6)}${tdScaleUnit(r)}</p>`;
  }

  /**
   * Top-down bo'limi (ekran va bosma hisobot uchun bir xil mazmun).
   * @param {object} r  evaluate({format:'uc-topdown/1', …}) natijasi
   * @param {{print?:boolean}} [o]
   */
  function topdownSection(r, o) {
    const opt = o || {};
    if (!r) return '';
    if (r.error) return `<div class="warn-box" data-td-error="${escHtml(r.error)}">⚠ ${rgErrText(r.error, r.detail)}</div>`;
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const approach = `${i18n.t('td_approach_' + r.approach)}${r.hybrid ? ' + ' + i18n.t('td_hybrid') : ''}`;
    // Natija: y ± U (o'lchanayotgan kattalik birligida) va nisbiy U, % — ISO/IEC 17025:2017 §7.8.3.1 c)
    const yShown = r.yCorrected !== null ? r.yCorrected : r.y;
    const hasAbs = yShown !== null && r.absU !== null;
    const rr = hasAbs ? Calc.roundResult(yShown, r.absU, r.roundUp) : null;
    const unit = rgUnit(r.absUnit);
    const yCell = yShown === null ? '—' : (rr ? rr.yround.toFixed(rr.digits) : tdNum(yShown, 6)) + unit;
    const uCell = r.absU === null ? '—' : tdU2(r.absU, r.roundUp) + unit;
    const relCell = r.relU === null ? '—' : tdU2(r.relU, r.roundUp) + ' %';
    const statement = rr
      ? `(${rr.resultText})${unit}; U<sub>rel</sub> = ${relCell}`
      : (r.scale === 'relative' ? `U<sub>rel</sub> = ${relCell}` : `U = ${uCell}`);
    return `<div class="rg-report td-report" data-td-report="1">
      <div class="${opt.print ? 'print-section' : 'rg-section-title'}">${i18n.t('td_report_section')}</div>
      ${tdWarnings(r, opt)}
      <table class="${cls} td-result" data-td-result="1"><thead><tr>
        <th>${i18n.t('td_col_y')}</th><th>${i18n.t('td_col_U')}</th><th>${i18n.t('td_col_Urel')}</th><th>k</th><th>${i18n.t('td_col_approach')}</th></tr></thead>
        <tbody><tr><td class="num" data-td-y="1">${yCell}</td><td class="num" data-td-u="1"><strong>${uCell}</strong></td>
          <td class="num" data-td-urel="1"><strong>${relCell}</strong></td><td class="num" data-td-k="1">${escHtml(String(r.k))}</td>
          <td data-td-approach="${escHtml(r.approach)}">${approach}<div class="text-xs text-muted">${escHtml(r.approachRef)}</div></td></tr></tbody></table>
      <p class="rg-line" data-td-statement="1"><strong>${i18n.t('td_statement')}:</strong> ${statement}; <span data-td-kline="1">k = ${escHtml(String(r.k))}${r.k === 2 ? ', P ≈ 95 %' : ''}</span>; ${i18n.t('td_col_approach')}: ${approach}.</p>
      <p class="rg-line" data-td-nueff="${isFinite(r.nuEff) ? r.nuEff.toFixed(1) : 'inf'}"><strong>ν<sub>eff</sub></strong> = ${rgNu(r.nuEff)} (${i18n.t('td_nu_note')})${
        r.kSuggested !== null ? `; <span data-td-ksuggested="1">${i18n.t('td_k_suggested').replace('{P}', pct(r.P)).replace('{nu}', String(Math.max(1, Math.floor(r.nuEff))))} = ${r.kSuggested.toFixed(2)}</span> — ${i18n.t('td_k_unchanged')}` : ''}</p>
      <p class="rg-line"><strong>${i18n.t('td_scale')}:</strong> <span data-td-scale="${escHtml(r.scale)}">${i18n.t('td_scale_' + r.scale)}${tdScaleUnit(r) ? ' (' + escHtml(r.unit) + ')' : ''}</span>;
        u_c = ${tdNum(r.uc)}${tdScaleUnit(r)}; U = k·u_c = ${tdNum(r.U)}${tdScaleUnit(r)}${r.y === null && r.scale === 'relative' ? `. ${i18n.t('td_no_y')}` : ''}</p>
      ${r.isEmpiricalMeasurand ? `<p class="rg-line" data-td-empirical="1">ⓘ ${i18n.t('td_empirical_note')}</p>` : ''}
      ${tdBudget(r, cls)}
      ${tdRw(r, cls)}${tdBias(r, cls)}${tdRecovery(r)}${tdRepro(r)}${tdLevel(r)}
      <p class="rg-line text-muted text-xs">${i18n.t('rg_ref_line')}: ${i18n.t('td_ref_text')}. ${i18n.t('rg_engine')}: ${escHtml(r.engineVersion)}</p>
    </div>`;
  }

  /** Faqat top-down hisoboti ("Chop etish"). meta — shablon belgilari (DRAFT). */
  /* ─── P10: maxsus rejimlar hisobot bo'limlari ────────────────────
     Namuna olish (dublikat usuli, ANOVA), sifatli test (2×2), mikrobiologiya (BETA), tibbiy laboratoriya (BETA).
     Har bir bo'limda: natija, qo'llanilgan yondashuv nomi va manbasi, cheklovlar, ogohlantirishlar.
     P05 gacha shu faylda; yaxlitlash faqat shu yerda. */
  function spWarnings(r, opt) {   // P05a: yagona "Tekshiruv natijalari" bloki (eski data-sp-warning atributlari saqlangan)
    return findingsHtml(r, { scope: 'special', print: !!(opt && opt.print), legacy: 'sp' });
  }
  function spHead(r, opt, inner) {
    return `<div class="rg-report td-report sp-report" data-sp-report="${escHtml(r.mode)}">
      <div class="${opt.print ? 'print-section' : 'rg-section-title'}">${i18n.t('sp_section_' + r.mode)}${r.unverified ? ' <span class="badge badge-orange" data-sp-beta="1">BETA</span>' : ''}</div>
      ${spWarnings(r, opt)}
      ${inner}
      <p class="rg-line" data-sp-approach="${escHtml(r.approach)}"><strong>${i18n.t('td_col_approach')}:</strong> ${i18n.t('sp_approach_' + r.approach)} <span class="text-xs text-muted">[${escHtml(r.approachRef)}]</span></p>
      <p class="rg-line" data-sp-limits="1"><strong>${i18n.t('sp_limits')}:</strong> ${i18n.t('sp_limits_' + r.mode)}</p>
      <p class="rg-line text-muted text-xs">${i18n.t('rg_engine')}: ${escHtml(r.engineVersion)}</p>
    </div>`;
  }
  const spPct = (v, d) => (v === null || v === undefined || !isFinite(v) ? '—' : (100 * v).toFixed(d === undefined ? 1 : d));

  function samplingSection(r, opt) {
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const unit = rgUnit(r.unit);
    const rr = r.y !== null && r.absU !== null ? Calc.roundResult(r.y, r.absU, r.roundUp) : null;
    const col = (a, used) => `<td class="num"${used ? ' data-sp-used="1"' : ''}>${tdNum(a.mean, 8)}</td><td class="num">${tdNum(a.s.between, 6)}</td><td class="num">${tdNum(a.s.sampling, 6)}</td>
      <td class="num">${tdNum(a.s.analysis, 6)}</td><td class="num"><strong>${tdNum(a.s.measurement, 6)}</strong></td><td class="num">${a.variancePct.measurement.toFixed(1)}</td><td class="num">${tdU2(a.relU.measurement)}</td>`;
    return spHead(r, opt, `
      <table class="${cls} td-result" data-sp-result="1"><thead><tr><th>${i18n.t('td_col_y')}</th><th>${i18n.t('td_col_U')}</th><th>${i18n.t('td_col_Urel')}</th><th>k</th><th>s<sub>samp</sub></th><th>s<sub>anal</sub></th><th>s<sub>meas</sub></th></tr></thead>
        <tbody><tr><td class="num" data-sp-y="1">${rr ? rr.yround.toFixed(rr.digits) + unit : '—'}</td><td class="num" data-sp-u="1"><strong>${rr ? rr.Uround.toFixed(rr.digits) + unit : '—'}</strong></td>
          <td class="num" data-sp-urel="1"><strong>${tdU2(r.relU, r.roundUp)} %</strong></td><td class="num">${escHtml(String(r.k))}</td>
          <td class="num" data-sp-ssamp="1">${tdNum(r.sSamp, 5)}${unit}</td><td class="num" data-sp-sanal="1">${tdNum(r.sAnal, 5)}${unit}</td><td class="num" data-sp-smeas="1">${tdNum(r.uc, 5)}${unit}</td></tr></tbody></table>
      <p class="rg-line"><span class="mono">s<sub>meas</sub>² = s<sub>samp</sub>² + s<sub>anal</sub>²; U′ = ${escHtml(String(r.k))}·100·s<sub>meas</sub>/x̄</span>; ${i18n.t('sp_sa_n_targets')} = ${r.nTargets};
        U′<sub>samp</sub> = ${tdU2(r.relUSamp)} %; U′<sub>anal</sub> = ${tdU2(r.relUAnal)} %</p>
      <h4 class="rg-h">${i18n.t('sp_sa_anova')}</h4>
      <table class="${cls}" data-sp-anova="1"><thead><tr><th>${i18n.t('sp_sa_method')}</th><th>x̄</th><th>s<sub>between</sub></th><th>s<sub>samp</sub></th><th>s<sub>anal</sub></th><th>s<sub>meas</sub></th><th>${i18n.t('sp_sa_meas_pct')}</th><th>U′, %</th></tr></thead>
        <tbody>${['classical', 'robust'].map(m => `<tr data-sp-method="${m}"${r.method === m ? ' class="td-total"' : ''}><td>${i18n.t('sp_sa_' + m)}${r.method === m ? ' ✓' : ''}</td>${col(r[m], r.method === m)}</tr>`).join('')}</tbody></table>
      ${r.log ? `<p class="rg-line" data-sp-fu="1"><strong>${i18n.t('sp_sa_fu')}:</strong> <sup>F</sup>U = exp(${escHtml(String(r.k))}·s<sub>G,meas</sub>) = ${tdNum(r.log.uncertaintyFactor.measurement, 5)}
        (s<sub>G,meas</sub> = ${tdNum(r.log.sG.measurement, 4)}; ${i18n.t('sp_sa_gmean')} = ${tdNum(r.log.geometricMean, 4)}${unit})${r.y !== null ? `; ${i18n.t('sp_sa_fu_interval')}: [${tdNum(r.y / r.log.uncertaintyFactor.measurement, 4)}; ${tdNum(r.y * r.log.uncertaintyFactor.measurement, 4)}]${unit}` : ''}</p>` : ''}`);
  }

  function qualitativeSection(r, opt) {
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const ci = c => (c ? `[${spPct(c.low)}; ${spPct(c.high)}]` : '—');
    const t = r.table;
    // Egasi qarori (2026-11-18, R-21): hisobotga faqat tanlangan usul intervali chiqadi (standart — Wilson);
    // ekrandagi batafsil ko'rinishda ikkinchisi solishtirish uchun ko'rsatiladi, bosma hisobotda — yo'q.
    const method = r.ciMethod || 'wilson', other = method === 'wilson' ? 'clopper_pearson' : 'wilson';
    const field = { wilson: 'wilson', clopper_pearson: 'clopperPearson' };
    const compare = !opt.print && !!t;
    const row = (key, q) => `<tr data-sp-rate="${key}"><td>${i18n.t('sp_ql_' + key)}</td><td class="num"><strong>${spPct(q.value)}</strong></td><td class="num">${q.n !== undefined ? `${q.x} / ${q.n}` : '—'}</td>
      <td class="num" data-sp-ci="${method}"><strong>${ci(q[field[method]])}</strong></td>${compare ? `<td class="num text-muted" data-sp-ci-compare="${other}">${ci(q[field[other]])}</td>` : ''}</tr>`;
    const lr = v => (isFinite(v) ? tdNum(v, 4) : '∞');
    return spHead(r, opt, `
      ${t ? `<table class="${cls} sp-2x2" data-sp-table="1"><thead><tr><th></th><th>${i18n.t('sp_ql_case_pos')}</th><th>${i18n.t('sp_ql_case_neg')}</th></tr></thead>
        <tbody><tr><th>${i18n.t('sp_ql_res_pos')}</th><td class="num">tp = ${t.tp}</td><td class="num">fp = ${t.fp}</td></tr>
          <tr><th>${i18n.t('sp_ql_res_neg')}</th><td class="num">fn = ${t.fn}</td><td class="num">tn = ${t.tn}</td></tr></tbody></table>` : ''}
      <table class="${cls}" data-sp-rates="1"><thead><tr><th>${i18n.t('sp_ql_metric')}</th><th>%</th><th>x / n</th><th>${i18n.t('sp_ql_ci').replace('{P}', pct(r.P))} — ${i18n.t('sp_ci_' + method)}</th>${compare ? `<th class="text-muted">${i18n.t('sp_ql_ci_compare')}: ${i18n.t('sp_ci_' + other)}</th>` : ''}</tr></thead>
        <tbody>${row('ss', r.sensitivity)}${row('sp', r.specificity)}${row('fp', r.falsePositiveRate)}${row('fn', r.falseNegativeRate)}
          ${r.ppvStudy ? row('ppv', r.ppvStudy) : ''}${r.npvStudy ? row('npv', r.npvStudy) : ''}</tbody></table>
      ${t ? `<p class="rg-line" data-sp-cimethod="${escHtml(method)}"><strong>${i18n.t('sp_ql_ci_method')}:</strong> ${i18n.t('sp_ci_' + method)}; P = ${pct(r.P)} % <span class="text-xs text-muted">[${i18n.t('sp_ci_ref_' + method)}]</span></p>` : ''}
      <p class="rg-line" data-sp-lr="1">LR(+) = TP/FP = ${lr(r.lrPositive)}; LR(−) = FN/TN = ${lr(r.lrNegative)}</p>
      ${r.prevalence !== null ? `<p class="rg-line" data-sp-posterior="1"><strong>${i18n.t('sp_ql_posterior')}</strong> (${i18n.t('sp_ql_prev')} ${spPct(r.prevalence)} %): PP = ${spPct(r.posteriorPositive, 2)} %; PN = ${spPct(r.posteriorNegative, 2)} %</p>`
        : (r.studyPrevalence !== null ? `<p class="rg-line text-muted">${i18n.t('sp_ql_study_prev')}: ${spPct(r.studyPrevalence)} %</p>` : '')}`);
  }

  function microSection(r, opt) {
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const rr = Calc.roundResult(r.y, r.U, r.roundUp);
    const unit = rgUnit(r.unit);
    return spHead(r, opt, `
      <table class="${cls} td-result" data-sp-result="1"><thead><tr><th>${i18n.t('sp_mi_value')}</th><th>log₁₀ y</th><th>U (log₁₀)</th><th>k</th><th>${i18n.t('sp_mi_interval')}</th></tr></thead>
        <tbody><tr><td class="num">${tdNum(r.value, 3)}${unit}</td><td class="num" data-sp-y="1">${rr.yround.toFixed(rr.digits)}</td><td class="num" data-sp-u="1"><strong>${rr.Uround.toFixed(rr.digits)}</strong></td><td class="num">${escHtml(String(r.k))}</td>
          <td class="num" data-sp-interval="1">[${tdNum(r.interval.low, 2)}; ${tdNum(r.interval.high, 2)}]${unit}</td></tr></tbody></table>
      <p class="rg-line"><strong>${i18n.t('td_statement')}:</strong> log₁₀ = ${rr.resultText}; ${i18n.t('sp_mi_interval')} [10<sup>y−U</sup>; 10<sup>y+U</sup>]; k = ${escHtml(String(r.k))}; ΣC = ${escHtml(String(r.sumCounts))}</p>
      <h4 class="rg-h">${i18n.t('td_budget')}</h4>
      <table class="${cls}" data-sp-budget="1"><thead><tr><th>${i18n.t('td_col_component')}</th><th>u (log₁₀)</th><th>${i18n.t('td_col_share')}</th></tr></thead>
        <tbody>${r.budget.map(b => `<tr data-sp-row="${escHtml(b.id)}"><td>${i18n.t('sp_mi_u_' + b.id)}</td><td class="num">${tdNum(b.u)}</td><td class="num">${b.share.toFixed(1)}</td></tr>`).join('')}
          <tr class="td-total"><td><strong>u_c</strong></td><td class="num"><strong>${tdNum(r.uc)}</strong></td><td class="num">100.0</td></tr></tbody></table>`);
  }

  function medicalSection(r, opt) {
    const cls = opt.print ? 'print-table' : 'data-table math-head';
    const unit = rgUnit(r.unit);
    const rr = r.y !== null ? Calc.roundResult(r.y, r.absU, r.roundUp) : null;
    const q = v => (v ? `${tdNum(v.abs)} (${tdNum(v.rel, 3)} %)` : '—');
    return spHead(r, opt, `
      ${rr ? `<table class="${cls} td-result" data-sp-result="1"><thead><tr><th>${i18n.t('td_col_y')}</th><th>${i18n.t('td_col_U')}</th><th>${i18n.t('td_col_Urel')}</th><th>k</th><th>${i18n.t('sp_me_level')}</th></tr></thead>
        <tbody><tr><td class="num" data-sp-y="1">${rr.yround.toFixed(rr.digits)}${unit}</td><td class="num" data-sp-u="1"><strong>${rr.Uround.toFixed(rr.digits)}${unit}</strong></td>
          <td class="num" data-sp-urel="1"><strong>${tdU2(r.relU, r.roundUp)} %</strong></td><td class="num">${escHtml(String(r.k))}</td><td>${escHtml(r.appliedLevel)}</td></tr></tbody></table>` : ''}
      <h4 class="rg-h">${i18n.t('sp_me_levels_title')}</h4>
      <table class="${cls}" data-sp-levels="1"><thead><tr><th>${i18n.t('sp_me_level')}</th><th>x̄${unit}</th><th>n</th><th>u<sub>Rw</sub></th><th>u<sub>cal</sub></th><th>u<sub>bias</sub></th><th>u</th><th>U (k = ${escHtml(String(r.k))})</th></tr></thead>
        <tbody>${r.levels.map(L => `<tr data-sp-level="${escHtml(L.id)}"><td>${escHtml(L.id)}</td><td class="num">${tdNum(L.mean, 6)}</td><td class="num">${L.n === null ? '—' : escHtml(String(L.n))}</td>
          <td class="num">${q(L.uRw)}</td><td class="num">${q(L.uCal)}</td><td class="num">${q(L.uBias)}</td><td class="num">${q(L.u)}</td><td class="num"><strong>${tdU2(L.U.abs)}${unit} (${tdU2(L.U.rel)} %)</strong></td></tr>`).join('')}</tbody></table>
      <p class="rg-line"><span class="mono">u = √(u<sub>cal</sub>² + u<sub>Rw</sub>² + u<sub>bias</sub>²)</span></p>`);
  }

  /** Maxsus rejim natijasi → hisobot bo'limi (rejim natijadagi `mode` bo'yicha tanlanadi). */
  function specialSection(r, o) {
    const opt = o || {};
    if (!r) return '';
    if (r.error) return `<div class="warn-box" data-sp-error="${escHtml(r.error)}">⚠ ${rgErrText(r.error, r.detail)}</div>`;
    const fn = { SAMPLING: samplingSection, QUALITATIVE: qualitativeSection, MICROBIOLOGY: microSection, MEDICAL: medicalSection }[r.mode];
    return fn ? fn(r, opt) : '';
  }

  /* ─── P07: vektor natija (JCGM 102:2011) ───────────────────────────
     Har bir chiqish — alohida qator (y_i, u(y_i), U_i — bir o'lchamli qoidalar bilan yaxlitlangan); chiqishlarning
     korrelyatsiya matritsasi; qamrov sohasi: turi, P, k_p (gipper-ellipsoid, §6.5.3 a) va k_q (gipper-to'rtburchak, §6.5.3 b).
     Korrelyatsiya koeffitsiyenti 3 kasr xona bilan (JCGM 102 jadvallaridagi kabi); |r| > 0,99 bo'lsa 1 − |r| ham
     ko'rsatiladi (§3.21 Note 5, Table 11) — ko'rinish LOYIHA QARORI (egasi tasdig'ini kutadi, RISKS R-24). */
  function corrText(v) {
    if (!isFinite(v)) return '—';
    const base = v.toFixed(3);
    return Math.abs(v) > 0.99 && Math.abs(v) < 1 ? `${base} (1 − |r| = ${Calc.fmtSci(1 - Math.abs(v), 3)})` : base;
  }
  function mvOutputsTable(r, cls) {
    return `<table class="${cls || 'data-table'}" data-mv-outputs="1"><thead><tr>
        <th>${i18n.t('mv_col_output')}</th><th>y</th><th>u(y)</th><th>k</th><th>U (${pct(r.P)} %)</th><th>ν_eff</th><th>${i18n.t('mv_col_statement')}</th>
      </tr></thead><tbody>${r.results.map((x, j) => {
        const rr = rounded(x);
        return `<tr data-mv-output="${escHtml(r.symbols[j])}"><td class="mono">${escHtml(r.symbols[j])}${x.unit ? ', ' + escHtml(x.unit) : ''}</td>
          <td class="num">${rr.yround.toFixed(rr.digits)}</td><td class="num">${Calc.fmtSci(x.uc)}</td><td class="num">${x.k.toFixed(2)}</td>
          <td class="num">${rr.Uround.toFixed(rr.digits)}</td><td class="num">${nuText(x.nuEff)}</td>
          <td>${escHtml(r.symbols[j])} = (${rr.yround.toFixed(rr.digits)} ± ${rr.Uround.toFixed(rr.digits)})${unitOf(x)}</td></tr>`;
      }).join('')}</tbody></table>`;
  }
  function mvMatrix(symbols, M, cls, attr) {
    return `<table class="${cls || 'data-table'}" ${attr}><thead><tr><th></th>${symbols.map(s => `<th class="mono">${escHtml(s)}</th>`).join('')}</tr></thead>
      <tbody>${M.map((row, i) => `<tr><th class="mono">${escHtml(symbols[i])}</th>${row.map((v, j) => `<td class="num">${i === j ? '1' : corrText(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function mvRegionLines(r) {
    const g = r.coverageRegion, lines = [];
    const u = r.results.map(x => x.unit || '');
    if (g.ellipsoid) {
      lines.push(`<span data-mv-region="ellipsoid">${i18n.t(g.m === 2 ? 'mv_region_ellipse' : 'mv_region_ellipsoid')} (P = ${pct(g.P)} %): (η − y)ᵀ U_y⁻¹ (η − y) = k_p²;  k_p = ${g.ellipsoid.kp.toFixed(2)}` +
        (g.distribution === 'gaussian' ? `  (${i18n.t('mv_region_gauss')}, χ²(${g.m}))` : `  (${i18n.t('mv_region_mcm')})`) +
        (g.singular ? `  — ${i18n.t('mv_region_singular')}` : '') + '</span>');
    }
    if (g.rectangle) {
      lines.push(`<span data-mv-region="rectangle">${i18n.t('mv_region_rectangle')} (P ≥ ${pct(g.P)} %): y_j ± k_q·u(y_j);  k_q = ${g.rectangle.kq.toFixed(2)};  ` +
        g.rectangle.intervals.map((iv, j) => `${escHtml(r.symbols[j])}: [${Calc.fmtSci(iv[0], 5)}; ${Calc.fmtSci(iv[1], 5)}]${u[j] ? ' ' + escHtml(u[j]) : ''}`).join(';  ') + '</span>');
    }
    return lines;
  }
  function mvPlot(r, mc) {
    const g = r.coverageRegion;
    if (r.m !== 2 || !g.ellipse || g.singular) return '';
    const lab = j => r.symbols[j] + (r.results[j].unit ? ', ' + r.results[j].unit : '');
    const sm = mc && mc.coverageRegion ? mc.coverageRegion.smallest : null;
    return `<div class="region-plot-box">${ellipseSvg({ y: r.y, ellipse: g.ellipse, rectangle: g.rectangle.intervals, labels: [lab(0), lab(1)], esc: escHtml, ...(sm ? { smallest: sm } : {}) })}
      <div class="text-xs text-muted">${i18n.t('mv_plot_caption')}${sm ? ' ' + i18n.t('mv_plot_caption_smallest') : ''}</div></div>`;
  }
  /** Vektor MCM natijasi satrlari (§7.6–7.8, §8) */
  function mvMcLines(r, mc) {
    const lines = [`M = ${mc.M.toLocaleString()};  ` + mc.symbols.map((s, j) => `${escHtml(s)} = ${Calc.fmtSci(mc.y[j], 8)}` + (mc.uDefined ? `, u = ${Calc.fmtSci(mc.u[j])}` : '')).join(';  ')];
    if (!mc.uDefined) {
      lines.push(`<span data-mc-u-undefined="1">${i18n.t('mc_u_undefined')}</span>`);
      lines.push(`<span data-mv-mc-intervals="1">${i18n.t('mc_interval_sym')} (${pct(mc.P)} %): ` + mc.symbols.map((s, j) => `${escHtml(s)}: [${Calc.fmtSci(mc.intervals[j][0], 6)}; ${Calc.fmtSci(mc.intervals[j][1], 6)}]`).join(';  ') + '</span>');
    } else {
      const pairs = [];
      for (let i = 0; i < mc.m; i++) for (let j = i + 1; j < mc.m; j++) pairs.push(`r(${escHtml(mc.symbols[i])}, ${escHtml(mc.symbols[j])}) = ${corrText(mc.correlation[i][j])}`);
      lines.push(pairs.join(';  '));
      const g = mc.coverageRegion;
      lines.push(`<span data-mv-mc-region="1">${i18n.t('mv_region_title')} (${i18n.t('mv_region_mcm')}, P = ${pct(mc.P)} %): ` +
        (g.ellipsoid ? `k_p = ${g.ellipsoid.kp.toFixed(2)} (GUM: ${mc.gum.kp.toFixed(2)})` : i18n.t('mv_region_singular')) +
        (g.rectangle ? `;  k_q = ${g.rectangle.kq.toFixed(2)} (GUM: ${mc.gum.kq.toFixed(2)})` : '') + '</span>');
      // P07b: eng kichik qamrov sohasi (JCGM 102:2011 §7.7.4) — faqat ikki chiqish; to'r, M, yuz va qamragan nuqtalar ulushi yoziladi
      const sm = g.smallest;
      if (sm) {
        const un = [mc.units && mc.units[0], mc.units && mc.units[1]].filter(Boolean).map(escHtml).join('·');
        lines.push(`<span data-mv-smallest="1">${i18n.t('mv_smallest')} (JCGM 102 §7.7.4, P = ${pct(mc.P)} %): ${i18n.t('mv_smallest_area')} = ${Calc.fmtSci(sm.area, 3)}${un ? ' ' + un : ''};  ` +
          `${i18n.t('mv_smallest_mesh')} ${sm.mesh} × ${sm.mesh}, ${sm.cells} ${i18n.t('mv_smallest_cells')};  ${sm.count.toLocaleString()} / ${sm.M.toLocaleString()} (${(sm.fraction * 100).toFixed(2)} %) — ${i18n.t('mv_smallest_note')}</span>`);
      }
      if (mc.validated !== null && mc.validated !== undefined) {
        const bad = (mc.comparison || []).filter(c => !c.ok).map(c => (c.q === 'lambdaMax' ? 'λ_max' : c.q === 'kp' ? 'k_p' : c.q === 'kq' ? 'k_q' : `${c.q}(${escHtml(c.output)})`));
        lines.push(`JCGM 102 §8: n_dig = ${mc.nDig}  →  ` + (mc.validated ? `<span class="badge badge-green">${i18n.t('mc_valid')}</span>`
          : `<span class="badge badge-orange">${i18n.t('mc_not_valid')}</span> (${bad.join(', ')})`));
      }
      const v = mc.validation || {};
      if (v.items && v.items.length) {
        const worst = v.items.reduce((a, b) => (b.required > 0 && b.achieved / b.required > (a.required > 0 ? a.achieved / a.required : 0) ? b : a), v.items[0]);
        lines.push(`<span data-mc-tolerance="${v.met ? 'met' : 'not-met'}">${i18n.t('mc_tol_line')}: ${i18n.t('mc_tol_required')} ${v.tolDivisor > 1 ? 'δ/' + v.tolDivisor : 'δ'} = ${Calc.fmtSci(worst.required, 2)};  ` +
          `${i18n.t('mc_tol_achieved')} = ${Calc.fmtSci(worst.achieved, 2)}` + (v.lowered ? `;  <strong data-mc-tol-lowered="1">${i18n.t('mc_tol_lowered')}</strong>` : '') + '</span>');
      }
    }
    const ad = mc.adaptive || {};
    lines.push(`<span data-mc-run="1">${i18n.t('mc_generator')}: ${escHtml(mc.rng.name)};  ${i18n.t('mc_seed')} = ${escHtml(String(mc.seed))};  ${i18n.t(ad.enabled ? 'mc_mode_adaptive' : 'mc_mode_fixed')}` +
      (ad.enabled ? ` (JCGM 102 §7.8.3): ${i18n.t('mc_blocks')} ${mc.blocks} × ${mc.blockSize.toLocaleString()} — ${i18n.t(ad.converged ? 'mc_converged' : 'mc_not_converged')}` : '') + '</span>');
    return lines;
  }
  /**
   * Vektor natija bo'limi (ekran va bosma).
   * @param {{print?:boolean, mc?:object, acceptances?:object}} o
   */
  /* P07b: ko'p chiqish + ko'p nuqta — umumiy jadval (har bir nuqta × har bir chiqish). Egasi qarori 2026-11-19: yagona k
     yo'q; U_j — chiqishning o'z k_j si bilan; birgalikdagi qamrov — faqat nuqtaning qamrov sohasi (k_p, JCGM 102 §6.5). */
  function vectorSummaryTable(rows, cls) {
    return `<table class="${cls || 'data-table'}" data-vector-summary="1"><thead><tr>
        <th>${i18n.t('pt_col')}</th><th>${i18n.t('pt_output_col')}</th><th class="cell-num">y</th><th class="cell-num">U</th><th class="cell-num">k</th><th class="cell-num">ν_eff</th><th class="cell-num">${i18n.t('pt_kp_col')}</th>
      </tr></thead><tbody>${rows.map(x => x.outputs.map((o, j) => `<tr data-vector-point="${escHtml(x.id || '')}">
        ${j === 0 ? `<td rowspan="${x.outputs.length}"><strong>${escHtml(x.label || '')}</strong></td>` : ''}
        <td class="mono">${escHtml(o.symbol)}${o.unit ? ', ' + escHtml(o.unit) : ''}</td>
        <td class="cell-num num mono">${o.rr.yround.toFixed(o.rr.digits)}</td>
        <td class="cell-num num mono">${o.rr.Uround.toFixed(o.rr.digits)}</td>
        <td class="cell-num num mono">${o.k.toFixed(2)}</td>
        <td class="cell-num num mono">${nuText(o.nuEff)}</td>
        ${j === 0 ? `<td rowspan="${x.outputs.length}" class="cell-num num mono" data-vector-kp="1">${x.kp === null || !isFinite(x.kp) ? '—' : x.kp.toFixed(2)}</td>` : ''}
      </tr>`).join('')).join('')}</tbody></table>`;
  }
  /** Bosma hisobot tanasi: umumiy jadval + izoh, so'ng har bir nuqtaning to'liq vektor bo'limi. */
  function vectorPointsSection(rows, o) {
    const opt = o || {};
    if (!rows || !rows.length) return '';
    const note = `<p class="${opt.print ? 'report-line' : 'text-xs text-muted'}" data-vector-note="1">${escHtml(i18n.t('pt_vector_note'))}</p>`;
    return `${opt.print ? `<div class="print-section">${i18n.t('pt_summary')}</div>` : ''}
      <div data-report-summary="vector">${vectorSummaryTable(rows, opt.print ? 'print-table' : 'data-table')}</div>${note}
      ${opt.print ? rows.map(x => `<div class="print-page-break"></div><div data-report-point="${escHtml(x.label || '')}">
        <div class="print-point-title">${escHtml(x.label || '')}</div>${multivariateSection(x.r, { print: true, acceptances: (x.point && x.point.acceptances) || {} })}</div>`).join('') : ''}`;
  }

  function multivariateSection(r, o) {
    const opt = o || {};
    if (!r) return '';
    const cls = opt.print ? 'print-table' : 'data-table';
    const wrap = l => (opt.print ? `<p style="font-size:9pt;margin:.25em 0">${l}</p>` : `<div class="formula-box">${l}</div>`);
    const title = k => (opt.print ? `<div class="print-section">${i18n.t(k)}</div>` : `<div class="section-title">${i18n.t(k)}</div>`);
    const mc = opt.mc && opt.mc.multivariate ? opt.mc : null;
    return `<div data-mv-section="1">
      ${title('mv_title')}
      ${r.implicit ? wrap(`${escHtml(i18n.t('imp_method'))};  m = ${r.m},  N = ${r.N}`) + wrap(implicitLine(r))
        : wrap(`${i18n.t('mv_method')}: U_y = C_x U_x C_xᵀ (JCGM 102:2011 §6.2);  m = ${r.m},  N = ${r.N}`)}
      ${findingsHtml(r, { scope: 'gum', print: !!opt.print, acceptances: opt.acceptances, showEmpty: true })}
      ${mvOutputsTable(r, cls)}
      ${title('mv_corr_title')}
      ${mvMatrix(r.symbols, r.correlation, cls, 'data-mv-correlation="1"')}
      ${title('mv_region_title')}
      ${mvRegionLines(r).map(wrap).join('')}
      ${mvPlot(r, mc)}
      ${mc ? title('mc_title') + mvMcLines(r, mc).map(wrap).join('') + mcFindingsHtml(mc, { print: !!opt.print }) : ''}
      ${opt.print ? r.results.map((x, j) => `<div class="print-section">${escHtml(r.symbols[j])}: ${i18n.t('mv_budget_of')}</div>${budgetTable(x, 'print-table')}`).join('') : ''}
      ${marksHtml(r.results[0], { mc: null })}
    </div>`;
  }

  function isBlankCell(v) { return v === '' || v === null || v === undefined; }

  // Yagona escape: src/ui/escape.js (P02)

  return {
    decisionLines, decisionCell, decisionOf, verdictBadge,
    unitOf, pct, nuText, distLabel, rounded, statement, ilacNote, confLabel, notesHtml, implicitLine, fctx, findingsOf, findingsHtml, statusOf, marksHtml, officialMarksHtml, blockedBy, modelKindLine, nuUsedText, nuRuleText, confKind, confPending, confLines, mcLines, mcFindingsHtml, multivariateSection, vectorSummaryTable, vectorPointsSection, mvMcLines, mvOutputsTable, mvRegionLines, corrText, renderKPIs, inputsTable, renderInputs, budgetRows, budgetTable, renderBudget, labSection, corrTable, corrNote, hasCorrelation, renderCorrelation, stepLines, secondOrderLines, renderSteps, verifyLines, renderVerify, dataTable, pointDetail, summaryTable, rgWarnText, rgErrText, rgUnit, rgNu, rgPair, rgEquation, rgWarnings, rgChi2, rgMatrix, rgInverse, rgPredict, rgURange, rgResiduals, regressionSection, tdNum, tdU2, tdScaleUnit, tdWarnings, tdBudgetName, tdBudget, tdRw, tdBias, tdRecovery, tdRepro, tdLevel, topdownSection, spWarnings, spHead, spPct, samplingSection, qualitativeSection, microSection, medicalSection, specialSection, isBlankCell, CONF_KEYS, DIST_KEYS,
  };
}
