/* P05a: metrologik linter (src/engine/linter/). Har bir qoida uchun kamida bitta IJOBIY (topilma chiqadi) va
   bitta SALBIY (chiqmaydi) holat. Qoidalar ro'yxati va manbalari — docs/LINTER_RULES.md.
   Linter hisobni o'zgartirmaydi: y, u_c, ν_eff, k, U — evaluate() natijasida avvalgidek. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../../src/engine/index.js');

const ROOT = path.join(__dirname, '..', '..');
const codes = r => (r.findings || []).map(f => f.code);
const find = (r, code) => (r.findings || []).find(f => f.code === code);
const has = (r, code) => codes(r).includes(code);

/** Oddiy kalibrlash holati: E = X − Xref (ko'rsatish xatosi). Maydonlarni `patch` bilan almashtirish mumkin. */
function gum(patch) {
  const base = {
    params: ['X', 'Xref'],
    measurements: { X: [10.02, 10.01, 10.03, 10.02, 10.01, 10.02, 10.03, 10.02, 10.01, 10.02], Xref: [10] },
    directions: [],
    model: { formula: 'E = X - Xref', unit: 'V' },
    settings: { paired: false, P: 0.9545, modelKind: 'error' },
    covB: {},
    typeB: [
      { name: 'Etalon sertifikati (U, k = 2)', param: 'Xref', halfWidth: 0.004, distribution: 'normal', k: 2, unit: 'V' },
      { name: 'Etalon dreyfi', param: 'Xref', halfWidth: 0.002, distribution: 'rect', unit: 'V' },
      { name: 'Asbob rezolyutsiyasi', param: 'X', halfWidth: 0.01, distribution: 'resol', unit: 'V' },
    ],
  };
  const p = patch || {};
  return { ...base, ...p, settings: { ...base.settings, ...(p.settings || {}) } };
}
const run = patch => E.evaluate(gum(patch));

/* ── tuzilma ── */

test('har bir qoida — alohida modul: { id, severity, ref, modes, codes, check }; id lar takrorlanmaydi', () => {
  const dir = path.join(ROOT, 'src/engine/linter/rules');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  assert.equal(files.length, E.LINTER_RULES.length);
  const ids = E.LINTER_RULES.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8', 'X9', 'X10', 'X11', 'X12', 'A1', 'A2', 'A3', 'A4', 'M1']) assert.ok(ids.includes(id), id);
  for (const r of E.LINTER_RULES) {
    assert.ok(E.SEVERITIES.includes(r.severity), r.id);
    assert.equal(typeof r.ref, 'string');
    assert.ok(Array.isArray(r.modes) && r.modes.length && r.modes.every(m => E.LINTER_MODES.includes(m)), r.id);
    assert.equal(typeof r.check, 'function');
    assert.ok(Object.keys(r.codes).length >= 1, r.id);
  }
  assert.deepEqual(E.LINTER_MODES, ['GUM', 'REGRESSION', 'TOP_DOWN', 'SAMPLING', 'QUALITATIVE', 'MICRO', 'MEDICAL']);
});

test('manbasi repoda yo\'q qoidada ref ichida "(unverified)" bor; repodagi hujjatlarga havolalar belgilanmagan', () => {
  // docs/references/ da YO'Q hujjatlar (CLAUDE.md "Joriy holat"): ularga havola faqat "(unverified)" bilan
  // P05b: ILAC P14:09/2020, ILAC G8:09/2019 va JCGM 106:2012 repoga qo'shildi — ularga havolalar endi belgisiz
  const missing = /JCGM 102|GUM-6|COOMET|ISO 5725|ISO 14253/;
  for (const [code, c] of Object.entries(E.FINDING_CODES)) {
    if (c.rule === 'W2') continue;   // P08–P10 modullarining o'z ref matnlari (o'zgarmagan)
    for (const part of c.ref.split(';')) {
      if (missing.test(part)) assert.match(part, /\(unverified\)/, `${code}: ${part.trim()}`);
    }
  }
  // unverified bayrog'i: manbaning hech biri repoda bo'lmagan qoidalar
  for (const code of ['grubbs_outlier', 'coomet_small']) assert.equal(E.FINDING_CODES[code].unverified, true, code);
  for (const code of ['below_cmc', 'model_kind_unknown']) assert.equal(E.FINDING_CODES[code].unverified, false, code);   // P05b: manba qo'shildi
  // ISO/IEC 17025 (pullik, repoda yo'q) faqat ILAC G8 dagi iqtibos orqali keltiriladi
  for (const [code, c] of Object.entries(E.FINDING_CODES)) if (c.rule !== 'W2' && /ISO\/IEC 17025/.test(c.ref)) assert.match(c.ref, /ILAC G8:09\/2019 §2\.\d/, code);
  assert.equal(E.FINDING_CODES.x1_mpe_in_budget.unverified, false);
});

test('natija: result.findings — error, warning, info tartibida; har birida id, rule, code, severity, ref, mode', () => {
  const r = run({ typeB: [], measurements: { X: [10, 10, 10], Xref: [10] } });   // u_c = 0
  assert.ok(Array.isArray(r.findings));
  const order = { error: 0, warning: 1, info: 2 };
  const seq = r.findings.map(f => order[f.severity]);
  assert.deepEqual(seq, [...seq].sort((a, b) => a - b));
  for (const f of r.findings) {
    for (const k of ['id', 'rule', 'code', 'severity', 'ref', 'mode']) assert.ok(typeof f[k] === 'string', `${f.code}.${k}`);
    assert.equal(f.mode, 'GUM');
  }
  assert.equal(new Set(r.findings.map(f => f.id)).size, r.findings.length);
  assert.deepEqual(E.lint({}, { error: 'need_data' }), []);
});

test('linter hisobni o\'zgartirmaydi: topilmalarsiz va topilmali holatda y, u_c, ν_eff, k, U bir xil (lint() sof)', () => {
  const spec = gum({ typeB: [...gum().typeB, { name: 'Asbobning ruxsat etilgan xatosi (MPE)', param: 'X', halfWidth: 0.5, distribution: 'rect' }] });
  const r = E.evaluate(spec);
  const again = JSON.stringify(r);
  const f2 = E.lint(spec, r);
  assert.equal(JSON.stringify(r), again);                       // natija o'zgarmadi
  assert.deepEqual(f2, r.findings);
  assert.ok(isFinite(r.uc) && r.U === r.k * r.uc);
});

/* ── X1 ── */

test('X1 (error): kalibrlanayotgan asbobning MPE si byudjetda — nom bo\'yicha va muvofiqlik MPE si bilan bir xil yarim kenglik bo\'yicha', () => {
  const named = run({ typeB: [...gum().typeB, { name: 'Asbobning ruxsat etilgan xatosi', param: 'X', halfWidth: 0.05, distribution: 'rect' }] });
  const f = find(named, 'x1_mpe_in_budget');
  assert.ok(f);
  assert.deepEqual([f.severity, f.rule, f.param, f.source], ['error', 'X1', 'X', 'Asbobning ruxsat etilgan xatosi']);
  assert.match(f.ref, /JCGM 100:2008 3\.4\.5, F\.2\.4\.2/);
  for (const name of ['MPE (DUT)', 'Предел допускаемой погрешности прибора', 'Maximum permissible error']) {
    assert.ok(has(run({ typeB: [...gum().typeB, { name, param: 'X', halfWidth: 0.05, distribution: 'rect' }] }), 'x1_mpe_in_budget'), name);
  }
  // nomi neytral, lekin yarim kengligi muvofiqlik uchun kiritilgan MPE bilan bir xil (son va ifoda)
  assert.ok(has(run({ settings: { mpe: 0.05 }, typeB: [...gum().typeB, { name: 'Asbob xatosi', param: 'X', halfWidth: 0.05, distribution: 'rect' }] }), 'x1_mpe_in_budget'));
  assert.ok(has(run({ settings: { mpe: '0.005 * X' }, typeB: [...gum().typeB, { name: 'Asbob xatosi', param: 'X', halfWidth: '0.005*X', distribution: 'rect' }] }), 'x1_mpe_in_budget'));
});

test('X1 salbiy: etalon / kalibrator xatosi va MPE faqat muvofiqlik maydonida — topilma yo\'q', () => {
  assert.ok(!has(run({ settings: { mpe: 0.05 } }), 'x1_mpe_in_budget'));
  // etalonning (o'lchash vositasining) ruxsat etilgan xatosi — qonuniy manba (JCGM 100:2008 F.2.4.2)
  const ref = run({ settings: { mpe: 0.05 }, typeB: [...gum().typeB, { name: 'Kalibratorning ruxsat etilgan xatosi', param: 'Xref', halfWidth: 0.003, distribution: 'rect' }] });
  assert.ok(!has(ref, 'x1_mpe_in_budget'));
  // kalibrlash konteksti yo'q (model turi "qiymat", MPE kiritilmagan): asbob MPE si — o'lchash vositasining xatosi
  const testing = run({ settings: { modelKind: 'value' }, typeB: [...gum().typeB, { name: 'Tarozi MPE', param: 'X', halfWidth: 0.05, distribution: 'rect' }] });
  assert.ok(!has(testing, 'x1_mpe_in_budget'));
});

/* ── X2 ── */

test('X2: sertifikat manbasi normal taqsimotda k = 1 yoki √3 bilan (warning); to\'g\'ri burchakli — info; k = 2 — topilma yo\'q', () => {
  const tb = k => [{ name: 'Etalon sertifikati', param: 'Xref', halfWidth: 0.004, distribution: 'normal', k }, gum().typeB[1], gum().typeB[2]];
  for (const k of [1, 1.732]) {
    const f = find(run({ typeB: tb(k) }), 'x2_certificate_divisor');
    assert.ok(f, 'k = ' + k);
    assert.equal(f.severity, 'warning');
    assert.match(f.ref, /JCGM 100:2008 4\.3\.3/);
  }
  const rect = find(run({ typeB: [{ name: 'Kalibrlash sertifikati', param: 'Xref', halfWidth: 0.004, distribution: 'rect' }, gum().typeB[1], gum().typeB[2]] }), 'x2_certificate_rect');
  assert.equal(rect.severity, 'info');
  // shablon manbasi: kind = 'certificate' (nomidan qat'i nazar)
  assert.ok(has(run({ typeB: [{ name: 'U(etalon)', kind: 'certificate', param: 'Xref', halfWidth: 0.004, distribution: 'normal', k: 1 }, gum().typeB[1], gum().typeB[2]] }), 'x2_certificate_divisor'));
  // salbiy
  for (const k of [2, 3, 1.96]) assert.ok(!codes(run({ typeB: tb(k) })).some(c => c.startsWith('x2_')), 'k = ' + k);
  assert.ok(!codes(run({ typeB: [{ name: 'Harorat ta\'siri', param: 'Xref', halfWidth: 0.004, distribution: 'normal', k: 1 }] })).some(c => c.startsWith('x2_')));
});

/* ── X3 ── */

test('X3: histerezis ikki marta — (i) ↑/↓ o\'qishlar umumiy s da + qo\'lda histerezis; (ii) ↑/↓ rejimi (avtomatik) + qo\'lda histerezis', () => {
  const dirs = ['↑', '↑', '↑', '↑', '↑', '↓', '↓', '↓', '↓', '↓'];
  const hyst = { name: 'Gisterezis', param: 'X', halfWidth: 0.005, distribution: 'rect' };
  const a = run({ directions: dirs, typeB: [...gum().typeB, hyst] });
  assert.equal(find(a, 'x3_hysteresis_double').value, 'A');
  assert.match(find(a, 'x3_hysteresis_double').ref, /JCGM 100:2008 4\.3\.10/);
  const b = run({ directions: dirs, typeB: [...gum().typeB, hyst], settings: { typeA: { X: { method: 1, directional: true } } } });
  assert.equal(find(b, 'x3_hysteresis_double').value, 'auto');
  // salbiy: ↑/↓ rejimi qo'lda manbasiz; yo'nalishsiz o'qishlarda qo'lda histerezis; bitta yo'nalish
  assert.ok(!has(run({ directions: dirs, settings: { typeA: { X: { method: 1, directional: true } } } }), 'x3_hysteresis_double'));
  assert.ok(!has(run({ typeB: [...gum().typeB, hyst] }), 'x3_hysteresis_double'));
  assert.ok(!has(run({ directions: dirs.map(() => '↑'), typeB: [...gum().typeB, hyst] }), 'x3_hysteresis_double'));
});

/* ── X4 ── */

test('X4: juftlangan qatorlarda ahamiyatli |r| > 0,5, korrelyatsiya o\'chiq → warning; yoqilgan yoki ahamiyatsiz bo\'lsa — yo\'q', () => {
  const x = [10.01, 10.02, 10.03, 10.04, 10.05, 10.06, 10.07, 10.08], y = [5.02, 5.03, 5.05, 5.06, 5.09, 5.10, 5.12, 5.15];
  const spec = paired => ({ params: ['A', 'B'], measurements: { A: x, B: y }, model: { formula: 'D = A - B' },
    settings: { paired, P: 0.9545, modelKind: 'value' }, typeB: [{ name: 'Rezolyutsiya', param: 'A', halfWidth: 0.01, distribution: 'resol' }] });
  const off = E.evaluate(spec(false));
  const f = find(off, 'x4_correlation_ignored');
  assert.ok(f);
  assert.match(f.value, /^r = 0\.99\d* \(n = 8\)$/);
  assert.match(f.ref, /JCGM 100:2008 5\.2\.2, 5\.2\.3, 5\.2\.5/);
  assert.ok(!has(E.evaluate(spec(true)), 'x4_correlation_ignored'));
  // |r| > 0,5, lekin statistik ahamiyatsiz (n = 5): t = |r|·√((n − 2)/(1 − r²)) < t_0,975(3) = 3,18
  const weak = E.evaluate({ ...spec(false), measurements: { A: [1, 2, 3, 4, 5], B: [2.0, 1.0, 4.0, 3.0, 5.0] } });
  assert.ok(Math.abs(E.correlation([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]) - 0.8) < 1e-12);
  assert.ok(!has(weak, 'x4_correlation_ignored'));
});

test('X4: ikki kirishda bir xil etalon manbasi, kovariatsiya 0 → x4_shared_reference; kovariatsiya kiritilsa — yo\'q', () => {
  const spec = covB => ({ params: ['m1', 'm2'], measurements: { m1: [100.01, 100.02, 100.01], m2: [50.01, 50.02, 50.02] }, model: { formula: 'm = m1 - m2' },
    settings: { paired: false, modelKind: 'value' }, covB,
    typeB: [{ name: 'Tarozi sertifikati (U, k = 2)', param: 'm1', halfWidth: 0.01, distribution: 'normal', k: 2 },
            { name: 'Tarozi sertifikati (U, k = 2)', param: 'm2', halfWidth: 0.01, distribution: 'normal', k: 2 },
            { name: 'Rezolyutsiya', param: 'm1', halfWidth: 0.01, distribution: 'resol' }, { name: 'Rezolyutsiya', param: 'm2', halfWidth: 0.01, distribution: 'resol' }] });
  const f = find(E.evaluate(spec({})), 'x4_shared_reference');
  assert.ok(f);
  assert.equal(f.source, 'Tarozi sertifikati (U, k = 2)');
  assert.match(f.ref, /JCGM 100:2008 5\.2\.4, F\.1\.2\.3/);
  assert.ok(!has(E.evaluate(spec({ 'm1|m2': 0.000025 })), 'x4_shared_reference'));
  // bir xil nomli REZOLYUTSIYA manbasi korrelyatsiya emas
  assert.equal((E.evaluate(spec({})).findings || []).filter(x => x.code === 'x4_shared_reference').length, 1);
});

/* ── X5 ── */

test('X5: rezolyutsiya — to\'liq qadam √3 ga yoki yarim qadam 2√3 ga bo\'lingan (warning); to\'g\'ri kiritilgan — yo\'q', () => {
  const tb = c => [gum().typeB[0], gum().typeB[1], { name: 'Asbob rezolyutsiyasi', param: 'X', ...c }];
  // kuzatuvlar 0,01 qadam bilan: δ = 0,01
  const rectFull = find(run({ typeB: tb({ halfWidth: 0.01, distribution: 'rect' }) }), 'x5_resolution_divisor');
  assert.ok(rectFull); assert.equal(rectFull.severity, 'warning'); assert.match(rectFull.ref, /JCGM 100:2008 F\.2\.2\.1/);
  assert.ok(has(run({ typeB: tb({ halfWidth: 0.005, distribution: 'resol' }) }), 'x5_resolution_divisor'));
  // to'g'ri: 'resol' + δ, yoki 'rect' + δ/2
  assert.ok(!codes(run({ typeB: tb({ halfWidth: 0.01, distribution: 'resol' }) })).some(c => c.startsWith('x5_')));
  assert.ok(!codes(run({ typeB: tb({ halfWidth: 0.005, distribution: 'rect' }) })).some(c => c.startsWith('x5_')));
  // boshqa taqsimot
  assert.equal(find(run({ typeB: tb({ halfWidth: 0.01, distribution: 'normal', k: 2 }) }), 'x5_resolution_distribution').value, 'normal');
  // δ ni kuzatuvlardan aniqlab bo'lmasa (butun sonlar) — 'rect' uchun faqat eslatma (info)
  const ints = run({ measurements: { X: [10, 11, 10, 12, 10], Xref: [10] }, typeB: tb({ halfWidth: 1, distribution: 'rect' }) });
  assert.equal(find(ints, 'x5_resolution_rect').severity, 'info');
});

test('X5: normal taqsimotda noodatiy bo\'luvchi (k < 1 yoki k > 4) → warning; k = 1, 2, 3 — yo\'q', () => {
  const tb = k => [{ name: 'Harorat ta\'siri', param: 'Xref', halfWidth: 0.004, distribution: 'normal', k }, gum().typeB[2]];
  for (const k of [0.5, 10]) assert.equal(find(run({ typeB: tb(k) }), 'x5_unusual_divisor').value, 'k = ' + k);
  for (const k of [1, 2, 3, 2.58]) assert.ok(!has(run({ typeB: tb(k) }), 'x5_unusual_divisor'), 'k = ' + k);
});

/* ── X6 ── */

test('X6: manba birligi kirish birligidan farq qiladi (mV va V, ko\'paytuvchi 1) → warning; ko\'paytuvchi berilsa yoki birlik bir xil — yo\'q', () => {
  const tb = c => [gum().typeB[0], gum().typeB[1], { name: 'Asbob rezolyutsiyasi', param: 'X', halfWidth: 10, distribution: 'resol', ...c }];
  const f = find(run({ typeB: tb({ unit: 'mV' }), units: { X: 'V', Xref: 'V' } }), 'x6_source_units_differ');
  assert.ok(f); assert.equal(f.value, 'mV ≠ V'); assert.equal(f.severity, 'warning');
  // kirish birligi berilmagan: shu kirishning boshqa manbasi bilan solishtiriladi
  const two = run({ typeB: [...gum().typeB, { name: 'Shovqin', param: 'X', halfWidth: 3, distribution: 'rect', unit: 'mV' }] });
  assert.ok(has(two, 'x6_source_units_differ'));
  assert.ok(!has(run({ typeB: tb({ unit: 'mV', sensitivity: 0.001 }), units: { X: 'V', Xref: 'V' } }), 'x6_source_units_differ'));
  assert.ok(!has(run({ units: { X: 'V', Xref: 'V' } }), 'x6_source_units_differ'));
});

test('X6: dvigatelning o\'lchamlik ogohlantirishlari (unit_budget, unit_output) topilma sifatida — kod o\'zgarmagan', () => {
  const r = run({ units: { X: 'V', Xref: 'V' }, typeB: [gum().typeB[0], { name: 'Harorat', param: 'X', halfWidth: 0.1, distribution: 'rect', unit: 'K' }] });
  assert.ok(r.warnings.some(w => w.code === 'unit_budget'));
  const f = find(r, 'unit_budget');
  assert.deepEqual([f.rule, f.severity], ['X6', 'warning']);
  assert.ok(!has(r, 'x6_source_units_differ'));                 // bitta muammo — bitta topilma
  const out = run({ units: { X: 'V', Xref: 'V' }, model: { formula: 'E = X - Xref', unit: 'A' } });
  assert.equal(find(out, 'unit_output').rule, 'X6');
});

/* ── X7 ── */

test('X7: k = 2 qat\'iy, ν_eff < 30 → x7_k2_low_dof; k = t(ν_eff) yoki ν_eff katta — yo\'q', () => {
  const few = { measurements: { X: [10.02, 10.05, 10.01], Xref: [10] } };
  const r = run({ ...few, settings: { kMethod: 'k2' } });
  assert.ok(r.nuEff < 30 && r.k === 2);
  const f = find(r, 'x7_k2_low_dof');
  assert.ok(f); assert.match(f.ref, /EA-4\/02 M:2022 §5\.1, §5\.3, §5\.5/); assert.match(f.ref, /JCGM 100:2008 G\.6\.6/);
  // Egasi qarori (2026-11-18): ν_eff < 10 → warning (JCGM 100:2008 G.6.6 "say greater than 10"); 10 ≤ ν_eff < 30 → info
  assert.ok(r.nuEff < 10); assert.equal(f.severity, 'warning');
  const obs15 = [10.02, 10.05, 10.01, 10.03, 10.04, 10.02, 10.06, 10.01, 10.03, 10.05, 10.02, 10.04, 10.03, 10.01, 10.05];
  const mid = run({ measurements: { X: obs15, Xref: [10] }, typeB: [], settings: { kMethod: 'k2' } });
  assert.ok(mid.nuEff >= 10 && mid.nuEff < 30, `ν_eff = ${mid.nuEff}`);
  assert.equal(find(mid, 'x7_k2_low_dof').severity, 'info');
  assert.equal(E.LINTER_THRESHOLDS.k2WarnNuEff, 10); assert.equal(E.LINTER_THRESHOLDS.k2MinNuEff, 30);
  assert.ok(!codes(run(few)).some(c => c.startsWith('x7_')));                          // kMethod = 'nu'
  assert.ok(!codes(run({ settings: { kMethod: 'k2' }, typeB: gum().typeB.map(c => ({ ...c, halfWidth: c.halfWidth * 20 })) })).some(c => c.startsWith('x7_')));
});

test('X7: k = 2, ν_eff ≥ 30, lekin A tur ulushi > 30 % va n < 10 → x7_k2_few_observations (EA-4/02 §5.3)', () => {
  // ikki kirish, har biri n = 9 (ν = 8): ν_eff ≥ 30 ga yetishi uchun hissalar teng taqsimlangan + katta B tur
  const obs = [10.01, 10.02, 10.03, 10.02, 10.01, 10.02, 10.03, 10.02, 10.01];
  const spec = { params: ['A', 'B', 'C', 'D', 'R'], measurements: { A: obs, B: obs, C: obs, D: obs, R: [40] }, model: { formula: 'E = A + B + C + D - R' },
    settings: { paired: false, kMethod: 'k2', modelKind: 'error' }, typeB: [{ name: 'Etalon', param: 'R', halfWidth: 0.004, distribution: 'rect' }, { name: 'Etalon dreyfi', param: 'R', halfWidth: 0.001, distribution: 'rect' }] };
  const r = E.evaluate(spec);
  assert.ok(r.nuEff >= 30, String(r.nuEff));
  const f = find(r, 'x7_k2_few_observations');
  assert.ok(f, JSON.stringify(codes(r)));
  assert.match(f.value, /n = 9/);
  // n = 10 bo'lsa mezon bajarilgan
  const ten = [...obs, 10.02];
  assert.ok(!has(E.evaluate({ ...spec, measurements: { A: ten, B: ten, C: ten, D: ten, R: [40] } }), 'x7_k2_few_observations'));
});

/* ── X8 ── */

test('X8: U = 0 → zero_u (error); manbalar bor bo\'lsa — yo\'q', () => {
  const r = run({ typeB: [], measurements: { X: [10, 10, 10], Xref: [10] } });
  assert.equal(r.U, 0);
  const f = find(r, 'zero_u');
  assert.deepEqual([f.rule, f.severity], ['X8', 'error']);
  assert.match(f.ref, /JCGM 100:2008 3\.3\.1, F\.2\.2\.1/);
  assert.ok(!has(run(), 'zero_u'));
});

test('X8: U < CMC → below_cmc (error; ILAC P14:09/2020 §5.5); U ≥ CMC — yo\'q; U avtomatik almashtirilmaydi', () => {
  const r = run({ settings: { cmc: 1 } });
  const f = find(r, 'below_cmc');
  assert.deepEqual([f.rule, f.severity, f.unverified], ['X8', 'error', undefined]);
  assert.match(f.ref, /^ILAC P14:09\/2020 §5\.5;/);
  assert.ok(r.U < 1);                                           // U o'zgarmagan
  assert.ok(!has(run({ settings: { cmc: 0.0001 } }), 'below_cmc'));
});

test('X8: s = 0 — rezolyutsiya manbasi bor → zero_s (info); yo\'q → x8_zero_s_no_resolution (warning); s > 0 — hech biri', () => {
  const same = { measurements: { X: [10.02, 10.02, 10.02, 10.02, 10.02], Xref: [10] } };
  assert.equal(find(run(same), 'zero_s').severity, 'info');
  const no = run({ ...same, typeB: [gum().typeB[0], gum().typeB[1]] });
  assert.equal(find(no, 'x8_zero_s_no_resolution').severity, 'warning');
  assert.ok(!has(no, 'zero_s'));
  assert.ok(!has(run(), 'zero_s') && !has(run(), 'x8_zero_s_no_resolution'));
});

/* ── X9 ── */

test('X9 (hisobot qatlami): U ikki qiymatli raqamdan ko\'p yoki y va U xonalari mos emas → warning; to\'g\'ri yozuv — yo\'q', () => {
  const c = rep => E.lintReported(rep).map(f => f.code);
  assert.deepEqual(c({ y: '1.235', U: '0.100' }), ['x9_too_many_digits']);       // ENGINE 1.0.0 dagi ko'rinish (RISKS R-04)
  assert.deepEqual(c({ y: '1.2', U: '0.10' }), ['x9_decimals_mismatch']);
  assert.deepEqual(c({ y: '10.0183', U: '0.0208' }), ['x9_too_many_digits']);
  for (const ok of [{ y: '1.24', U: '0.10' }, { y: '0.018', U: '0.021' }, { y: '-0.13', U: '0.25' }, { y: '1230', U: '120' }, { y: '5', U: '2' }, { y: '0,018', U: '0,021' }]) assert.deepEqual(c(ok), [], JSON.stringify(ok));
  assert.match(E.lintReported({ y: '1.2', U: '0.100' })[0].ref, /JCGM 100:2008 7\.2\.6/);
  assert.deepEqual([E.significantDigits('0.10'), E.significantDigits('0.100'), E.significantDigits('12'), E.significantDigits('120'), E.significantDigits('0.0062'), E.significantDigits('1.2e-3')], [2, 3, 2, 2, 2, 2]);
  assert.deepEqual([E.decimalPlaces('0.10'), E.decimalPlaces('12'), E.decimalPlaces('1,235')], [2, 0, 3]);
  // hisobot qatlamining o'z yaxlitlashi (src/report/rounding.js) har doim qoidadan o'tadi
  const { roundResult } = require('../../src/report/rounding.js');
  for (const [y, U] of [[0.0183, 0.0208], [1.23456, 0.0999], [-0.125, 0.25], [1234.5, 123.4], [0, 0.0061796]]) {
    for (const up of [false, true]) { const rr = roundResult(y, U, up); assert.deepEqual(c({ y: rr.yround.toFixed(rr.digits), U: rr.Uround.toFixed(rr.digits) }), [], `${y} ± ${U}`); }
  }
});

/* ── X10 ── */

test('X10 (info): etalon manbasi bor, drift manbasi yo\'q → eslatma; drift bor yoki etalon manbasi yo\'q — yo\'q', () => {
  const f = find(run({ typeB: [gum().typeB[0], gum().typeB[2]] }), 'x10_no_drift');
  assert.equal(f.severity, 'info');
  assert.match(f.ref, /EA-4\/02 M:2022 Appendix C \(C3\), S2\.4/);
  assert.ok(!has(run(), 'x10_no_drift'));                                               // "Etalon dreyfi" bor
  assert.ok(!has(run({ typeB: [gum().typeB[2]] }), 'x10_no_drift'));                    // etalon manbasi yo'q
  assert.ok(!has(run({ typeB: [gum().typeB[0], { name: 'Долговременная стабильность', param: 'Xref', halfWidth: 0.001, distribution: 'rect' }] }), 'x10_no_drift'));
});

/* ── X11, X12 (top-down) ── */

const TD = extra => ({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: { relative: true },
  rw: { components: [{ type: 'stated', s: 2, n: 30, relative: true }] }, bias: { type: 'crm', relative: true, items: [{ bias: 3, sBias: 2, n: 10, uRef: 1 }] }, ...extra });

test('X11 linterda: asos qamragan omil yana qo\'shilgan → warning, hissa hisobda QOLADI; eski warnings[] ham saqlangan (deprecated)', () => {
  const add = { additional: [{ id: 'rep', name: 'Repeat', category: 'repeatability', u: 1, relative: true }] };
  const r = E.evaluate(TD(add)), plain = E.evaluate(TD());
  const f = find(r, 'x11_double_counting');
  assert.deepEqual([f.rule, f.severity, f.mode, f.value], ['X11', 'warning', 'TOP_DOWN', 'Repeat: repeatability']);
  assert.equal(f.ref, E.TOPDOWN_WARNINGS.x11_double_counting.ref);                      // manba matni o'zgarmagan
  assert.ok(r.uc > plain.uc);                                                           // hissa hisobda qoldi (egasi qarori R-20)
  assert.equal(r.budget.find(b => b.id === 'rep').flag, 'X11');
  assert.ok(r.warnings.some(w => w.code === 'x11_double_counting' && w.rule === 'X11'));   // moslik uchun
  assert.equal(r.findings.filter(x => x.code === 'x11_double_counting').length, 1);      // takror yo'q
  // salbiy: asos qamramagan toifa
  const ok = E.evaluate(TD({ additional: [{ id: 'hom', name: 'Homogeneity', category: 'homogeneity', u: 1, relative: true }] }));
  assert.ok(!has(ok, 'x11_double_counting'));
});

test('X12 linterda: empirik kattalikda bias — javobsiz: qo\'shiladi + warning; "other": chiqariladi + info; "same": topilma yo\'q (R-20)', () => {
  const emp = extra => E.evaluate(TD({ isEmpiricalMeasurand: true, bias: { type: 'crm', relative: true, items: [{ bias: 3, sBias: 2, n: 10, uRef: 1 }], ...extra } }));
  const none = emp({}), other = emp({ referenceMethod: 'other' }), same = emp({ referenceMethod: 'same' });
  const f = find(none, 'x12_empirical_bias');
  assert.deepEqual([f.rule, f.severity, f.value], ['X12', 'warning', 'bias']);
  assert.equal(none.uc, same.uc);                                                       // javobsiz — konservativ: hissa qo'shilgan
  const g = find(other, 'x12_bias_excluded');
  assert.deepEqual([g.rule, g.severity], ['X12', 'info']);
  assert.ok(other.uc < none.uc && !has(other, 'x12_empirical_bias'));
  assert.ok(!codes(same).some(c => c.startsWith('x12_')));
  assert.ok(!codes(E.evaluate(TD())).some(c => c.startsWith('x12_')));                  // empirik emas
});

/* ── modullarning boshqa ogohlantirishlari → topilmalar (kodlar o'zgarmagan) ── */

test('P08–P10 ogohlantirishlari result.findings da: regression_chi2_fail, topdown_nu_low, qualitative_cp_project_addition, sampling / micro / medical', () => {
  const line = [[0, 0.1], [1, 1.9], [2, 4.2], [3, 5.8], [4, 8.3]];
  const rg = E.evaluate({ format: 'uc-regression/1', method: 'WLS', points: line.map(([x, y]) => ({ x, y, uy: 0.01 })) });
  assert.deepEqual([find(rg, 'regression_chi2_fail').severity, find(rg, 'regression_chi2_fail').mode], ['warning', 'REGRESSION']);
  assert.equal(find(rg, 'regression_chi2_fail').value, rg.warnings.find(w => w.code === 'regression_chi2_fail').value);

  const td = E.evaluate(TD({ rw: { components: [{ type: 'stated', s: 2, n: 5, relative: true }] } }));
  assert.equal(find(td, 'topdown_nu_low').severity, 'warning');

  const ql = { format: 'uc-qualitative/1', table: { tp: 48, fn: 2, fp: 1, tn: 49 } };
  assert.equal(find(E.evaluate({ ...ql, settings: { ciMethod: 'clopper_pearson' } }), 'qualitative_cp_project_addition').severity, 'info');
  assert.ok(!has(E.evaluate(ql), 'qualitative_cp_project_addition'));

  const mi = E.evaluate({ format: 'uc-micro/1', result: { value: 120, sumCounts: 12 }, technical: { s: 0.1 } });
  assert.deepEqual([find(mi, 'micro_unverified').severity, find(mi, 'micro_unverified').unverified, find(mi, 'micro_unverified').mode], ['warning', true, 'MICRO']);
  const me = E.evaluate({ format: 'uc-medical/1', unit: 'mmol/L', levels: [{ id: 'L1', mean: 5, cv: 2, n: 30 }], uCal: { value: 1, relative: true } });
  assert.equal(find(me, 'medical_unverified').mode, 'MEDICAL');

  const sa = E.evaluate(require('../cases/ufs/ufs-a1-nitrate-classical.json').modelSpec);
  assert.equal(find(sa, 'sampling_bias_not_included').mode, 'SAMPLING');
  // har bir modul ogohlantirishi (X8 / X11 / X12 ga tegishlilaridan tashqari) aynan bitta topilma beradi
  for (const r of [rg, td, mi, me, sa]) {
    const own = r.warnings.filter(w => w.code !== 'zero_u' && !/^x1[12]_/.test(w.code)).map(w => w.code).sort();
    const got = r.findings.filter(f => f.rule === 'W2').map(f => f.code).sort();
    assert.deepEqual(got, own, r.mode);
  }
});

test('top-down va maxsus rejimlarda U = 0 → X8 zero_u (error)', () => {
  const td = E.evaluate({ format: 'uc-topdown/1', approach: 'NORDTEST', scale: { relative: true }, isEmpiricalMeasurand: true, rw: { components: [{ type: 'stated', s: 0, relative: true }] } });
  assert.equal(td.uc, 0);
  assert.deepEqual([find(td, 'zero_u').rule, find(td, 'zero_u').severity], ['X8', 'error']);
  assert.equal(td.findings.filter(f => f.code === 'zero_u').length, 1);
});

/* ── qo'shimcha qoidalar ── */

test('A1 (info): bitta manba ulushi > 90 % → dominant_source; hissalar teng bo\'lsa — yo\'q', () => {
  const r = run({ typeB: [...gum().typeB, { name: 'Vanna bir jinsliligi', param: 'X', halfWidth: 0.5, distribution: 'rect' }] });
  const f = find(r, 'dominant_source');
  assert.equal(f.severity, 'info'); assert.equal(f.source, 'Vanna bir jinsliligi');
  assert.ok(parseFloat(f.value) > 90);
  assert.match(f.ref, /EA-4\/02 M:2022 §5\.2, §5\.6, S8\.3, S9\.14/);
  assert.ok(!has(run(), 'dominant_source'));
});

test('A2: n < 3 → n_lt3 (warning); 3 ≤ n < 5 → n_small (info); n ≥ 5 yoki s_p usuli — yo\'q', () => {
  const two = run({ measurements: { X: [10.02, 10.04], Xref: [10] } });
  assert.deepEqual([find(two, 'n_lt3').severity, find(two, 'n_lt3').value], ['warning', 'n = 2']);
  assert.match(find(two, 'n_lt3').ref, /JCGM 100:2008 E\.4\.3 \(Table E\.1\)/);
  assert.ok(!has(two, 'n_small'));                                                       // bitta kirishga bitta topilma
  const three = run({ measurements: { X: [10.02, 10.04, 10.03], Xref: [10] } });
  assert.equal(find(three, 'n_small').severity, 'info');
  assert.ok(!codes(run()).some(c => c === 'n_lt3' || c === 'n_small'));
  const pooled = run({ measurements: { X: [10.02, 10.04], Xref: [10] }, settings: { typeA: { X: { method: 2, sp: 0.01, nup: 20 } } } });
  assert.ok(!has(pooled, 'n_lt3'));
});

test('A3 (error): ν ≤ 0 yoki son emas → invalid_nu; bo\'sh (∞) yoki musbat — yo\'q', () => {
  const tb = nu => [{ ...gum().typeB[0], nu }, gum().typeB[1], gum().typeB[2]];
  for (const nu of [0, -5, 'abc']) {
    const f = find(run({ typeB: tb(nu) }), 'invalid_nu');
    assert.ok(f, String(nu)); assert.equal(f.severity, 'error'); assert.match(f.ref, /JCGM 100:2008 G\.3\.3, G\.4\.1, G\.4\.2/);
  }
  for (const nu of ['', undefined, null, 50, '12,5']) assert.ok(!has(run({ typeB: tb(nu) }), 'invalid_nu'), String(nu));
  const sp = run({ settings: { typeA: { X: { method: 2, sp: 0.01, nup: 0 } } } });
  assert.equal(find(sp, 'invalid_nu').source, 's_p');
});

test('A4 (info, unverified): Grubbs mezoni — chetga chiquvchi qiymat; hisob o\'zgarmaydi; bir tekis qatorda — yo\'q', () => {
  const obs = [10.02, 10.01, 10.03, 10.02, 10.01, 10.02, 10.03, 10.02, 10.01, 10.50];
  const r = run({ measurements: { X: obs, Xref: [10] } });
  const f = find(r, 'grubbs_outlier');
  assert.deepEqual([f.severity, f.unverified, f.param], ['info', true, 'X']);
  assert.match(f.value, /^x = 10\.5; G = 2\.8\d+ > 2\.29 \(n = 10\)$/);
  assert.match(f.ref, /ISO 5725-2 §7\.3\.4 \(unverified\)/);
  assert.equal(r.inputs[0].n, 10);                                                       // qiymat chiqarib tashlanmagan
  assert.ok(Math.abs(r.inputs[0].mean - obs.reduce((a, b) => a + b, 0) / 10) < 1e-12);
  assert.ok(!has(run(), 'grubbs_outlier'));
  // formula xossalari: G_crit < (n − 1)/√n (G ning mumkin bo'lgan eng katta qiymati); n bilan o'sadi
  for (const n of [3, 5, 10, 30]) assert.ok(E.grubbsCritical(n, 0.05) < (n - 1) / Math.sqrt(n), String(n));
  assert.ok(E.grubbsCritical(5, 0.05) < E.grubbsCritical(10, 0.05) && E.grubbsCritical(10, 0.05) < E.grubbsCritical(30, 0.05));
  assert.ok(E.grubbsCritical(10, 0.01) > E.grubbsCritical(10, 0.05));
  assert.ok(Number.isNaN(E.grubbsCritical(2, 0.05)));
  assert.equal(E.grubbsStatistic([1, 1, 1]), null);                                      // s = 0
});

/* ── M1: model turi (R-07) ── */

test('M1 / R-07: model turi ko\'rsatilmagan + MPE → bayonot berilmaydi (conf.pending) va warning; "error" / "value" — bayonot bor', () => {
  const unknown = run({ settings: { modelKind: undefined, mpe: 0.05 } });
  assert.equal(unknown.modelKind, 'unknown');
  assert.deepEqual([unknown.conf.simple, unknown.conf.guarded, unknown.conf.pending], ['na', 'na', 'model_kind']);
  assert.equal(unknown.deviation, null);
  assert.deepEqual([find(unknown, 'model_kind_unknown').rule, find(unknown, 'model_kind_unknown').severity], ['M1', 'warning']);

  const err = run({ settings: { mpe: 0.05 } });
  assert.deepEqual([err.modelKind, err.conf.simple, err.deviation], ['error', 'ok', err.y]);
  assert.ok(!has(err, 'model_kind_unknown'));

  // kattalik qiymati: Y = 100,4, nominal 100, MPE 0,5 → |Y − nominal| = 0,4 ≤ 0,5 (|Y| emas!)
  const val = p => E.evaluate({ params: ['Y'], measurements: { Y: [100.4, 100.4, 100.5, 100.3] }, model: { formula: '' },
    settings: { modelKind: 'value', mpe: 0.5, range: 200, ...p }, typeB: [{ name: 'Rezolyutsiya', param: 'Y', halfWidth: 0.1, distribution: 'resol' }] });
  const v = val({ nominal: 100 });
  assert.ok(Math.abs(v.deviation - 0.4) < 1e-9);
  assert.equal(v.conf.simple, 'ok');
  assert.ok(Math.abs(v.gamma - 0.2) < 1e-9);                                             // γ = |Y − nominal| / diapazon · 100
  assert.equal(v.nominal, 100);
  const noNom = val({});
  assert.deepEqual([noNom.conf.pending, noNom.gamma], ['nominal', null]);
  assert.ok(has(noNom, 'model_value_no_nominal'));
  // MPE kiritilmagan: topilma yo'q (muvofiqlik so'ralmagan)
  assert.ok(!codes(run({ settings: { modelKind: undefined } })).some(c => c.startsWith('model_')));
  // y, u_c, U model turiga bog'liq emas
  assert.deepEqual([unknown.y, unknown.uc, unknown.U], [err.y, err.uc, err.U]);
});

/* ── W1 ── */

test('W1: GUM yo\'lining boshqa ogohlantirishlari — daraja va manba bilan (c_zero, nonlinear, nu_lt1 …); c_nan — error', () => {
  const sq = E.evaluate({ params: ['x'], measurements: { x: [0.001, -0.001, 0.002, -0.002, 0] }, model: { formula: 'y = x^2' }, settings: {}, typeB: [] });
  assert.deepEqual([find(sq, 'c_zero').rule, find(sq, 'c_zero').severity], ['W1', 'warning']);
  assert.match(find(sq, 'nonlinear').ref, /JCGM 100:2008 5\.1\.2 Note/);
  assert.equal(E.FINDING_CODES.c_nan.severity, 'error');
  assert.equal(E.FINDING_CODES.c_numeric.severity, 'info');
  // W1 jadvalidagi har bir kod dvigatelda haqiqatan ishlatiladi; boshqa qoidalarga tegishli kodlar takrorlanmaydi
  const src = ['evaluate.js', 'typeA.js'].map(f => fs.readFileSync(path.join(ROOT, 'src/engine', f), 'utf8')).join('\n');
  const w1 = E.LINTER_RULES.find(r => r.id === 'W1');
  for (const c of Object.keys(w1.codes)) assert.ok(src.includes(`'${c}'`), c);
  const emitted = new Set([...src.matchAll(/warnings\.push\(\{ code: '([a-z0-9_]+)'/g), ...src.matchAll(/out\.warnings\.push\('([a-z0-9_]+)'\)/g)].map(m => m[1]));
  for (const c of emitted) assert.ok(E.FINDING_CODES[c], `dvigatel ogohlantirishi linterga ulanmagan: ${c}`);
  assert.ok(!codes(run()).some(c => ['c_zero', 'c_nan', 'nonlinear'].includes(c)));
});

/* ── asoslangan holda qabul qilish (sof qism) ── */

test('qabul qilish: izoh majburiy (≥ 10 belgi); info qabul qilinmaydi; error qabul qilinmaguncha hisobot rasmiy emas', () => {
  assert.equal(E.MIN_ACCEPT_COMMENT, 10);
  assert.deepEqual(E.validateAcceptance('  qisqa  '), { ok: false, error: 'accept_comment_short' });
  assert.deepEqual(E.validateAcceptance(undefined), { ok: false, error: 'accept_comment_short' });
  assert.deepEqual(E.validateAcceptance('  Mijoz bilan kelishilgan  '), { ok: true, comment: 'Mijoz bilan kelishilgan' });

  const r = run({ settings: { cmc: 1 }, typeB: [gum().typeB[0], gum().typeB[2]] });     // below_cmc (error) + x10_no_drift (info)
  const cmc = find(r, 'below_cmc'), info = find(r, 'x10_no_drift');
  let st = E.reportStatus(r.findings, {});
  assert.deepEqual([st.official, st.openErrors, st.mustFlag, st.critical], [false, [cmc.id], true, ['below_cmc']]);
  // qisqa izoh — qabul hisoblanmaydi
  st = E.reportStatus(r.findings, { [cmc.id]: { comment: 'ok', role: 'admin' } });
  assert.equal(st.official, false);
  const acc = { [cmc.id]: { comment: 'CMC qayta ko\'rib chiqilmoqda (bayonnoma 12)', role: 'admin', at: '2026-11-18T10:00:00Z' }, [info.id]: { comment: 'info ham qabul qilinsin', role: 'admin' } };
  st = E.reportStatus(r.findings, acc);
  assert.deepEqual([st.official, st.openErrors, st.mustFlag], [true, [], true]);          // qabul qilingan, lekin belgi (U < CMC) qoladi
  const list = E.withAcceptances(r.findings, acc);
  assert.equal(list.length, r.findings.length);                                          // qabul qilingan topilma YO'QOLMAYDI
  assert.equal(list.find(f => f.id === cmc.id).accepted.comment, 'CMC qayta ko\'rib chiqilmoqda (bayonnoma 12)');
  assert.equal(list.find(f => f.id === info.id).accepted, null);                         // info qabul qilinmaydi
});
