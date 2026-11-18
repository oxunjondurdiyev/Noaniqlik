/* P11: src/engine/lab — etalonlar reestri, drift, CMC jadvali, kalibrlash intervali; linter L1, L2.
   Manbalar: ILAC P14:09/2020 (docs/references/ILAC_P14_09_2020.pdf — sahifa raqamlari hujjatning "Page N of 14" belgisi),
   ILAC P10:07/2020 (…/ILAC_P10_07_2020.pdf, "Page N of 11"), ILAC G24 / OIML D 10:2022. Reestr misollari — o'quv
   ma'lumoti (real laboratoriya yozuvi emas); kutilgan sonlar izohda qo'lda hisoblangan. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/engine/index.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} ${a} ≠ ${b}`);

const cal = (date, validUntil, points, extra = {}) => ({ certificate: 'C-' + date.slice(0, 4), calibrator: 'Milliy metrologiya instituti', accreditation: 'UZ.CAL.001', route: 'accredited', traceability: 'SI (K) — ILAC MRA', date, validUntil, points, ...extra });
const STD = () => E.cleanStandard({
  id: 'std:pt100-1', version: 3, name: 'Etalon termometr Pt100', type: 'termometr', serial: 'N-123', unit: '°C', range: { min: 0, max: 100 }, limit: 0.1,
  calibrations: [
    cal('2023-11-01', '2024-11-01', [{ x: 0, correction: 0.010, U: 0.020, k: 2 }, { x: 100, correction: 0.030, U: 0.030, k: 2 }]),
    cal('2024-11-01', '2025-11-01', [{ x: 0, correction: 0.020, U: 0.020, k: 2 }, { x: 100, correction: 0.050, U: 0.030, k: 2 }]),
    cal('2025-11-01', '2026-11-01', [{ x: 0, correction: 0.030, U: 0.020, k: 2, nu: 50 }, { x: 100, correction: 0.070, U: 0.030, k: 2 }]),
  ],
});
const gum = (typeB, settings = {}) => ({ params: ['t'], measurements: { t: [50.01, 50.02, 50.00, 50.01, 50.02] }, model: { formula: '', unit: '°C' }, typeB, settings: { modelKind: 'unknown', ...settings } });
const codes = r => r.findings.map(f => f.code);

/* ── sana ── */
test('sanalar: kun farqi, noto\'g\'ri sana', () => {
  assert.equal(E.daysBetween('2026-01-01', '2026-01-31'), 30);
  assert.equal(E.daysBetween('2024-02-28', '2024-03-01'), 2);        // kabisa yili
  assert.equal(E.isDate('2026-02-30'), false);
  assert.equal(E.isDate('31.12.2026'), false);
  assert.equal(E.addDays('2026-12-31', 1), '2027-01-01');
});

/* ── reestr ── */
test('reestr: amaldagi kalibrlash — eng so\'nggi sanali; tozalashda noma\'lum maydon (masalan F.I.Sh.) tashlanadi', () => {
  const s = E.cleanStandard({ ...STD(), operatorName: 'Ism Familiya', calibrations: [...STD().calibrations].reverse().map(c => ({ ...c, signedBy: 'X' })) });
  assert.equal(E.currentCalibration(s).date, '2025-11-01');
  assert.equal('operatorName' in s, false);
  assert.equal('signedBy' in s.calibrations[0], false);
  assert.equal(s.format, 'uc-registry/1');
});

test('reestr: nuqtada — aynan; oraliqda — tuzatma chiziqli, U — qo\'shnilarning kattasi; tashqarida — xato', () => {
  const c = E.currentCalibration(STD());
  assert.deepEqual(E.pointAt(c, 0), { x: 0, correction: 0.030, U: 0.020, k: 2, nu: 50, interpolated: false });
  const p = E.pointAt(c, 25);                                      // 0,030 + 0,25·(0,070 − 0,030) = 0,040
  near(p.correction, 0.040, 1e-15);
  assert.deepEqual([p.U, p.k, p.nu, p.interpolated, p.between], [0.030, 2, null, true, [0, 100]]);
  assert.equal(E.pointAt(c, 100.5).error, 'registry_out_of_range');
  assert.equal(E.pointAt(c, -1).error, 'registry_out_of_range');
  assert.equal(E.pointAt(c, '').error, 'registry_bad_x');          // bir nechta nuqta — X majburiy
  assert.equal(E.pointAt({ points: [{ U: 0.5, k: 2 }] }, '').U, 0.5); // bitta nuqta — X shart emas
  assert.equal(E.pointAt({ points: [] }, 1).error, 'registry_no_points');
  assert.equal(E.pointAt({ points: [{ x: 1, U: 0 }] }, 1).error, 'registry_bad_point');
});

test('reestrdan B tur manbasi: U, k, ν, tuzatma, sertifikat raqami va sana tortiladi; ID va versiya saqlanadi', () => {
  const { component, snapshot } = E.sourceFromStandard(STD(), { x: 0, param: 't' });
  assert.deepEqual([component.distribution, component.halfWidth, component.k, component.nu, component.kind, component.param, component.unit], ['normal', 0.020, 2, 50, 'certificate', 't', '°C']);
  assert.deepEqual([snapshot.id, snapshot.version, snapshot.certificate, snapshot.date, snapshot.validUntil, snapshot.calibrator, snapshot.accreditation, snapshot.correction],
    ['std:pt100-1', 3, 'C-2025', '2025-11-01', '2026-11-01', 'Milliy metrologiya instituti', 'UZ.CAL.001', 0.030]);
  // hisob: u = U/k = 0,010 (JCGM 100:2008 4.3.3); byudjet qatorida sertifikat nusxasi
  const r = E.evaluate(gum([component], { measurementDate: '2026-03-01' }));
  const row = r.budget.find(b => b.kind === 'B');
  near(row.u, 0.010, 1e-15);
  assert.equal(row.nu, 50);
  assert.equal(row.registry.certificate, 'C-2025');
  assert.equal(r.measurementDate, '2026-03-01');
  assert.ok(!codes(r).some(c => c.startsWith('standard_')));
  // k sertifikatda yo'q — 2 deb faraz qilinmaydi
  const noK = E.sourceFromStandard({ ...STD(), calibrations: [cal('2025-11-01', '2026-11-01', [{ x: 0, U: 0.02 }])] }, { x: 0 });
  assert.deepEqual([noK.component.k, noK.component.kRequired], ['', true]);
  assert.equal(E.sourceFromStandard({ id: 'x', calibrations: [] }).error, 'registry_no_calibration');
});

test('MPE / tolerans (limit) hech qachon B tur manbasiga aylanmaydi', () => {
  const { component } = E.sourceFromStandard(STD(), { x: 100 });
  assert.equal(component.halfWidth, 0.030);                         // sertifikatdagi U, limit (0,1) emas
  assert.ok(!JSON.stringify(component).includes('"limit"'));
  const r = E.evaluate(gum([component], { measurementDate: '2026-03-01', mpe: 0.1 }));
  assert.ok(!codes(r).includes('x1_mpe_in_budget'));
});

test('reestr o\'zgarganda eski hisob o\'zgarmaydi (hisob nusxadan o\'qiydi)', () => {
  const std = STD();
  const state = gum([E.sourceFromStandard(std, { x: 0, param: 't' }).component], { measurementDate: '2026-03-01' });
  const before = JSON.stringify(E.evaluate(state));
  // reestr tahrirlandi: yangi kalibrlash, boshqa U, versiya oshdi
  std.version = 4;
  std.calibrations.push(cal('2026-11-01', '2027-11-01', [{ x: 0, correction: 0.2, U: 0.5, k: 2 }, { x: 100, correction: 0.3, U: 0.6, k: 2 }]));
  std.calibrations[2].points[0].U = 9;
  assert.equal(JSON.stringify(E.evaluate(state)), before);
  assert.equal(state.typeB[0].registry.version, 3);
  assert.equal(E.sourceFromStandard(std, { x: 0 }).snapshot.version, 4);   // yangi hisob — yangi versiya
});

/* ── linter L1 ── */
test('L1: muddati o\'tgan etalon → error, hisob RASMIY EMAS; asoslab qabul qilinsa — rasmiy', () => {
  const comp = E.sourceFromStandard(STD(), { x: 0, param: 't' }).component;
  const r = E.evaluate(gum([comp], { measurementDate: '2026-11-02' }));       // muddat 2026-11-01 gacha
  const f = r.findings.find(x => x.code === 'standard_expired');
  assert.deepEqual([f.severity, f.rule, f.value], ['error', 'L1', '2026-11-01 < 2026-11-02']);
  const st = E.reportStatus(r.findings, {});
  assert.equal(st.official, false);
  assert.deepEqual(st.openErrors, [f.id]);
  assert.equal(E.reportStatus(r.findings, { [f.id]: { comment: 'Kalibrlash kechikdi, oraliq tekshiruv o\'tkazildi (bayonnoma 7)', role: 'admin' } }).official, true);
  // muddatning oxirgi kuni — hali amalda (error emas)
  const last = E.evaluate(gum([comp], { measurementDate: '2026-11-01' }));
  assert.ok(!codes(last).includes('standard_expired'));
  assert.equal(E.reportStatus(last.findings, {}).official, true);
  // natija (y, U) linter tufayli o'zgarmaydi
  assert.deepEqual([r.y, r.U], [last.y, last.U]);
});

test('L1: muddati yaqin (standart 30 kun, sozlanadi) → info; sana yo\'q → warning', () => {
  const comp = E.sourceFromStandard(STD(), { x: 0, param: 't' }).component;
  const f30 = E.evaluate(gum([comp], { measurementDate: '2026-10-02' })).findings.find(x => x.code === 'standard_expiring');   // 30 kun qolgan
  assert.equal(f30.severity, 'info');
  assert.ok(!codes(E.evaluate(gum([comp], { measurementDate: '2026-10-01' }))).includes('standard_expiring'));                // 31 kun
  assert.ok(codes(E.evaluate(gum([comp], { measurementDate: '2026-09-01', expiryWarnDays: 90 }))).includes('standard_expiring'));
  assert.ok(!codes(E.evaluate(gum([comp], { measurementDate: '2026-10-20', expiryWarnDays: 0 }))).includes('standard_expiring'));
  const none = E.evaluate(gum([comp])).findings.find(x => x.code === 'standard_no_validity');
  assert.equal(none.severity, 'warning');
  assert.equal(E.LINTER_THRESHOLDS.expiryWarnDays, 30);
  assert.equal(E.EXPIRY_WARN_DAYS, 30);
});

test('L1: akkreditatsiya belgisi yo\'q → warning (ILAC P10:07/2020 §2, p. 6–7); CIPM MRA NMI — dalil bor', () => {
  const mk = extra => E.sourceFromStandard({ ...STD(), calibrations: [cal('2025-11-01', '2026-11-01', [{ x: 0, U: 0.02, k: 2 }], extra)] }, { x: 0, param: 't' }).component;
  const f = E.evaluate(gum([mk({ accreditation: '', route: 'lab_other' })], { measurementDate: '2026-03-01' })).findings.find(x => x.code === 'standard_no_traceability');
  assert.equal(f.severity, 'warning');
  assert.match(f.ref, /ILAC P10:07\/2020/);
  assert.ok(!codes(E.evaluate(gum([mk({ accreditation: '', route: 'nmi_cipm' })], { measurementDate: '2026-03-01' }))).includes('standard_no_traceability'));
  assert.ok(!codes(E.evaluate(gum([mk({ accreditation: 'ILAC MRA 123', route: '' })], { measurementDate: '2026-03-01' }))).includes('standard_no_traceability'));
  // qo'lda kiritilgan (reestrga bog'lanmagan) manba — L1 ishlamaydi
  assert.ok(!codes(E.evaluate(gum([{ name: 'Etalon sertifikati', param: 't', halfWidth: 0.02, distribution: 'normal', k: 2 }]))).some(c => c.startsWith('standard_')));
});

test('L1 / L2: autentifikatsiyasiz (rol guest) kiritilgan reestr yozuvi → info (egasi qarori 2026-11-18); admin kiritgan — yo\'q', () => {
  const src = by => E.sourceFromStandard({ ...STD(), ...(by ? { savedBy: by } : {}) }, { x: 0, param: 't' });
  assert.equal(src('guest').snapshot.enteredBy, 'guest');
  assert.equal('enteredBy' in src('').snapshot, false);
  assert.equal(E.cleanStandard({ ...STD(), savedBy: 'Ism Familiya' }).savedBy, undefined);        // rol o'rniga ism — o'tmaydi
  const r = E.evaluate(gum([src('guest').component], { measurementDate: '2026-03-01' }));
  const f = r.findings.find(x => x.code === 'registry_unauthenticated');
  assert.deepEqual([f.severity, f.rule], ['info', 'L1']);
  assert.equal(E.reportStatus(r.findings, {}).official, true);                                      // info — hisobot rasmiy bo'lib qoladi
  assert.equal(r.budget.find(b => b.registry).registry.enteredBy, 'guest');
  for (const by of ['admin', 'superadmin', 'employee', '']) assert.ok(!codes(E.evaluate(gum([src(by).component], { measurementDate: '2026-03-01' }))).includes('registry_unauthenticated'), by);
  // CMC jadvali
  const tb = [{ name: 'Etalon sertifikati', param: 't', halfWidth: 0.02, distribution: 'normal', k: 2 }];
  const row = { id: 'r1', quantity: 'Harorat', min: 0, max: 100, type: 'abs', value: 0.001 };
  const g = E.evaluate(gum(tb, { cmcRows: [{ ...row, savedBy: 'guest' }], cmcX: 50 }));
  assert.equal(g.findings.find(x => x.code === 'cmc_unauthenticated').severity, 'info');
  assert.equal(g.cmcCheck.enteredBy, 'guest');
  assert.ok(codes(E.evaluate(gum(tb, { cmcRows: [{ ...row, savedBy: 'guest' }], cmcX: 500 }))).includes('cmc_unauthenticated'));   // sohadan tashqarida ham
  const a = E.evaluate(gum(tb, { cmcRows: [{ ...row, savedBy: 'admin' }], cmcX: 50 }));
  assert.ok(!codes(a).includes('cmc_unauthenticated') && !('enteredBy' in a.cmcCheck));
});

/* ── drift ── */
test('drift: 2 ta kalibrlash — |ΔC|, u = |ΔC|/√3 (to\'g\'ri burchakli); bittada — taklif yo\'q', () => {
  const std = STD();
  const two = { ...std, calibrations: std.calibrations.slice(1) };
  const h = E.correctionHistory(two, 0);
  assert.deepEqual(h.map(p => p.correction), [0.020, 0.030]);
  const { proposal } = E.driftProposal(h);
  near(proposal.deltaC, 0.010, 1e-15);
  near(proposal.halfWidth, 0.010, 1e-15);
  near(proposal.u, 0.010 / Math.sqrt(3), 1e-15);
  assert.deepEqual([proposal.distribution, proposal.divisorLabel, proposal.method], ['rect', '√3', 'last_two']);
  assert.deepEqual(proposal.basis.calibrations.map(c => c.certificate), ['C-2024', 'C-2025']);
  assert.equal(E.driftProposal(h.slice(1)).error, 'drift_need_two');
  assert.equal(E.driftProposal([]).error, 'drift_need_two');
  // bo'luvchi sozlanadi
  near(E.driftProposal(h, { distribution: 'triang' }).proposal.u, 0.010 / Math.sqrt(6), 1e-15);
  near(E.driftProposal(h, { distribution: 'normal', k: 2 }).proposal.u, 0.005, 1e-15);
});

test('drift: chiziqli trend (OLS) — og\'malik va o\'lchash sanasigacha bo\'lgan drift', () => {
  const h = E.correctionHistory(STD(), 100);                         // 0,030; 0,050; 0,070 — har yili +0,020
  const tr = E.linearTrend(h.map(p => ({ t: p.day, y: p.correction })));
  near(tr.slope * 365.25, 0.020, 2e-5);                              // 2024 kabisa yili: 366 + 365 kun
  const { proposal } = E.driftProposal(h, { method: 'trend', asOf: '2026-05-02' });   // 182 kun
  assert.equal(proposal.basis.horizonDays, 182);
  near(proposal.halfWidth, Math.abs(tr.slope) * 182, 1e-15);
  near(proposal.u, proposal.halfWidth / Math.sqrt(3), 1e-15);
  assert.equal(proposal.basis.calibrations.length, 3);
  // interpolyatsiyalangan nuqtada ham tarix olinadi
  near(E.correctionHistory(STD(), 50)[2].correction, 0.050, 1e-15);
});

test('drift manbasi faqat tasdiqlangach qo\'shiladi; asos byudjet qatorida; X10 (drift yo\'q) yopiladi', () => {
  const std = STD();
  const cert = E.sourceFromStandard(std, { x: 0, param: 't' }).component;
  const { proposal } = E.driftProposal(E.correctionHistory(std, 0));
  const without = E.evaluate(gum([cert], { measurementDate: '2026-03-01' }));
  assert.ok(codes(without).includes('x10_no_drift'));                // taklif o'zi hech narsa qo'shmaydi
  assert.equal(without.budget.filter(b => b.kind === 'B').length, 1);
  const comp = E.driftComponent(proposal, { name: 'Etalon drifti', param: 't', unit: '°C', registry: { id: std.id, version: std.version } });
  const r = E.evaluate(gum([cert, comp], { measurementDate: '2026-03-01' }));
  const row = r.budget.find(b => b.drift);
  near(row.u, 0.010 / Math.sqrt(3), 1e-15);
  assert.deepEqual([row.drift.method, row.drift.divisorLabel, row.drift.registryId, row.drift.registryVersion], ['last_two', '√3', 'std:pt100-1', 3]);
  assert.ok(!codes(r).includes('x10_no_drift'));
});

/* ── kalibrlash intervali ── */
test('kalibrlash intervali (ILAC G24 / OIML D 10:2022 §6.3 — faqat tavsiya): chegaraga yetish vaqti; < 3 kalibrlash — yo\'q', () => {
  const h = E.correctionHistory(STD(), 100);                         // C = 0,070 (2025-11-01), og'malik ≈ 0,020 / yil
  const tr = E.linearTrend(h.map(p => ({ t: p.day, y: p.correction })));
  const cLast = tr.intercept + tr.slope * h[2].day;
  const r = E.intervalRecommendation(h, { limit: 0.15, includeU: false });
  assert.deepEqual([r.status, r.recommendation, r.n], ['ok', true, 3]);
  near(r.days, (0.15 - cLast) / tr.slope, 1e-9);                     // ≈ 4 yil
  assert.ok(r.days > 3.9 * 365 && r.days < 4.1 * 365);
  // U hisobga olinsa (standart): |C| + U = L → (0,15 − 0,03 − C)/b ≈ 2,5 yil
  const ru = E.intervalRecommendation(h, { limit: 0.15 });
  near(ru.days, (0.15 - 0.03 - cLast) / tr.slope, 1e-9);
  assert.equal(ru.date, E.addDays('2025-11-01', Math.floor(ru.days)));
  assert.equal(E.intervalRecommendation(h, { limit: 0.06, includeU: false }).status, 'exceeded');
  assert.equal(E.intervalRecommendation(h.slice(1), { limit: 0.15 }).error, 'interval_need_three');
  assert.equal(E.intervalRecommendation(h, {}).error, 'interval_bad_limit');
  const flat = h.map(p => ({ ...p, correction: 0.01 }));
  assert.equal(E.intervalRecommendation(flat, { limit: 0.15 }).status, 'never');   // drift yo'q — usul mos emas (§6.3 Note)
});

/* ── CMC jadvali (ILAC P14:09/2020) ── */
const ROWS = [
  { id: 'r1', quantity: 'Harorat', min: 0, max: 100, unit: '°C', type: 'abs', value: 0.05, method: 'T-01' },
  { id: 'r2', quantity: 'Harorat', min: 100, max: 500, unit: '°C', type: 'linear', a: 0.05, b: 0.0005, method: 'T-01' },
  { id: 'r3', quantity: 'Kuchlanish', min: 1, max: 10, unit: 'V', type: 'rel', value: 0.01 },
  { id: 'r4', quantity: 'Massa', min: 1, max: 5, unit: 'g', type: 'range', cmcMin: 0.001, cmcMax: 0.005 },
];

test('CMC(X): bitta qiymat, nisbiy, a + b·|X|, diapazon (chiziqli interpolyatsiya) — ILAC P14:09/2020 §4.2 a)–c), §4.3 (p. 6)', () => {
  assert.equal(E.cmcAt(ROWS[0], 50).cmc, 0.05);                      // §4.2 a) butun diapazonda bitta qiymat
  near(E.cmcAt(ROWS[1], 300).cmc, 0.05 + 0.0005 * 300, 1e-15);       // §4.2 c) oshkor funksiya
  near(E.cmcAt(ROWS[2], 5).cmc, 0.0005, 1e-15);                      // §4.3 nisbiy: 0,01 % · 5 V
  near(E.cmcAt(ROWS[3], 2).cmc, 0.002, 1e-15);                       // §4.2 b) 0,001 + (2−1)/(5−1)·0,004
  near(E.cmcAt({ ...ROWS[1], min: -500, max: 500 }, -300).cmc, 0.2, 1e-15);   // |X|
});

test('CMC: diapazon chegarasida (kiradi) va tashqarisida', () => {
  assert.deepEqual([E.cmcAt(ROWS[0], 0).inRange, E.cmcAt(ROWS[0], 100).inRange], [true, true]);
  assert.deepEqual([E.cmcAt(ROWS[0], 100.0001).inRange, E.cmcAt(ROWS[0], 100.0001).cmc], [false, null]);
  assert.equal(E.cmcAt(ROWS[0], -0.001).inRange, false);
  near(E.cmcAt(ROWS[3], 1).cmc, 0.001, 1e-15); near(E.cmcAt(ROWS[3], 5).cmc, 0.005, 1e-15);
  // ikki diapazon tutashgan nuqta (X = 100): CMC si kattasi olinadi (0,05 va 0,05 + 0,05 = 0,10)
  const f = E.findCmc(ROWS, 100, { quantity: 'harorat' });
  assert.deepEqual([f.row.id, f.cmc], ['r2', 0.1]);
  assert.equal(E.findCmc(ROWS, 50, { quantity: 'Harorat' }).row.id, 'r1');
  assert.deepEqual([E.findCmc(ROWS, 600, { quantity: 'Harorat' }).outside, E.findCmc(ROWS, 600, { quantity: 'Harorat' }).row], [true, null]);
  assert.equal(E.findCmc(ROWS, 'abc').error, 'cmc_bad_x');
  // ochiq interval / noto'g'ri qator (§4.2: "0 < U < x" noto'g'ri) — rad etiladi
  assert.equal(E.cmcAt({ type: 'abs', min: 0, max: 1, value: 0 }, 0.5).error, 'cmc_bad_row');
  assert.equal(E.cmcAt({ type: 'abs', min: 2, max: 1, value: 1 }, 1).error, 'cmc_bad_row');
  assert.equal(E.cmcAt({ type: 'abs', value: 1 }, 1).error, 'cmc_bad_row');          // diapazonsiz
});

test('hisobda CMC(X) avtomatik: U < CMC → below_cmc (error, ILAC P14:09/2020 §5.5, p. 8); U almashtirilmaydi', () => {
  const tb = [{ name: 'Etalon sertifikati', param: 't', halfWidth: 0.02, distribution: 'normal', k: 2 }];
  const big = { ...ROWS[0], value: 5, tableVersion: 7 };
  const r = E.evaluate(gum(tb, { cmcRow: big, cmcX: 't' }));         // X = t o'rtachasi = 50,012
  const base = E.evaluate(gum(tb));
  assert.deepEqual([r.y, r.uc, r.U], [base.y, base.uc, base.U]);     // U o'zgarmagan
  near(r.cmcCheck.x, 50.012, 1e-12);
  assert.deepEqual([r.cmcCheck.rowId, r.cmcCheck.tableVersion, r.cmcCheck.cmc, r.cmcCheck.inRange, r.cmcCheck.below, r.cmc], ['r1', 7, 5, true, true, 5]);
  const f = r.findings.find(x => x.code === 'below_cmc');
  assert.deepEqual([f.severity, f.rule], ['error', 'X8']);
  assert.equal(E.reportStatus(r.findings, {}).mustFlag, true);
  // U ≥ CMC — topilma yo'q; formulali qator
  const ok = E.evaluate(gum(tb, { cmcRow: { ...ROWS[0], value: 0.001 }, cmcX: 50 }));
  assert.deepEqual([ok.cmcCheck.below, codes(ok).includes('below_cmc')], [false, false]);
  const lin = E.evaluate(gum(tb, { cmcRow: { ...ROWS[1], min: 0 }, cmcX: 't*2' }));
  near(lin.cmcCheck.cmc, 0.05 + 0.0005 * 100.024, 1e-12);
  assert.equal(lin.cmcCheck.below, true);
  // jadval qatori qo'lda kiritilgan CMC dan ustun
  assert.equal(E.evaluate(gum(tb, { cmc: 99, cmcRow: { ...ROWS[0], value: 0.001 }, cmcX: 50 })).cmc, 0.001);
});

test('L2: X diapazondan tashqarida → outside_scope (warning), CMC bilan solishtirilmaydi; X yo\'q → cmc_x_missing', () => {
  const tb = [{ name: 'Etalon sertifikati', param: 't', halfWidth: 0.02, distribution: 'normal', k: 2 }];
  const r = E.evaluate(gum(tb, { cmcRow: { ...ROWS[0], value: 5 }, cmcX: 150 }));
  const f = r.findings.find(x => x.code === 'outside_scope');
  assert.deepEqual([f.severity, f.rule], ['warning', 'L2']);
  assert.match(f.ref, /ILAC P14:09\/2020 §4\.1/);
  assert.deepEqual([r.cmcCheck.inRange, r.cmcCheck.cmc, r.cmc, codes(r).includes('below_cmc')], [false, null, null, false]);
  const nx = E.evaluate(gum(tb, { cmcRow: ROWS[0] }));
  assert.ok(codes(nx).includes('cmc_x_missing'));
  assert.equal(nx.cmcCheck.pending, 'x');
  assert.ok(!codes(E.evaluate(gum(tb, { cmcRow: ROWS[0], cmcX: 50 }))).some(c => ['outside_scope', 'cmc_x_missing'].includes(c)));
  assert.equal(E.evaluate(gum(tb, { cmcRow: ROWS[0], cmcX: 'zz+' })).error, 'bad_cmc_x');
  assert.equal(E.evaluate(gum(tb, { cmcRow: { type: 'abs', min: 0, max: 1, value: -1 }, cmcX: 0.5 })).error, 'cmc_bad_row');
});

test('hisobda bir kattalikning bir nechta diapazoni (settings.cmcRows): X ga mos qator avtomatik; hech biriga tushmasa — sohadan tashqari', () => {
  const tb = [{ name: 'Etalon sertifikati', param: 't', halfWidth: 0.02, distribution: 'normal', k: 2 }];
  const rows = ROWS.slice(0, 2).map(r => ({ ...r, tableVersion: 4 }));
  const a = E.evaluate(gum(tb, { cmcRows: rows, cmcX: 't' }));                 // X ≈ 50 → r1
  assert.deepEqual([a.cmcCheck.rowId, a.cmcCheck.cmc, a.cmcCheck.tableVersion, a.cmcCheck.below], ['r1', 0.05, 4, true]);
  const b = E.evaluate(gum(tb, { cmcRows: rows, cmcX: 300 }));                 // → r2: 0,05 + 0,0005·300
  assert.equal(b.cmcCheck.rowId, 'r2');
  near(b.cmcCheck.cmc, 0.2, 1e-15);
  const c = E.evaluate(gum(tb, { cmcRows: rows, cmcX: 501 }));
  assert.deepEqual([c.cmcCheck.inRange, c.cmcCheck.min, c.cmcCheck.max, c.cmcCheck.rowId], [false, 0, 500, '']);
  assert.ok(codes(c).includes('outside_scope') && !codes(c).includes('below_cmc'));
  assert.ok(codes(E.evaluate(gum(tb, { cmcRows: rows }))).includes('cmc_x_missing'));
});

test('P11 maydonlari bo\'lmagan hisob natijasida yangi kalit yo\'q (mavjud natijalar o\'zgarmagan)', () => {
  const r = E.evaluate(gum([{ name: 'a', param: 't', halfWidth: 0.02, distribution: 'rect' }], { cmc: 0.001 }));
  assert.ok(!('cmcCheck' in r) && !('measurementDate' in r));
  assert.ok(r.budget.every(b => !('registry' in b) && !('drift' in b)));
});

test('yangi linter kodlari ro\'yxatda: L1, L2 (manba belgisi bilan)', () => {
  for (const c of ['standard_expired', 'standard_expiring', 'standard_no_validity', 'standard_no_traceability', 'registry_unauthenticated']) assert.equal(E.FINDING_CODES[c].rule, 'L1', c);
  for (const c of ['outside_scope', 'cmc_x_missing', 'cmc_unauthenticated']) assert.equal(E.FINDING_CODES[c].rule, 'L2', c);
  assert.deepEqual([E.FINDING_CODES.standard_expired.severity, E.FINDING_CODES.standard_expiring.severity, E.FINDING_CODES.standard_no_traceability.severity, E.FINDING_CODES.outside_scope.severity], ['error', 'info', 'warning', 'warning']);
  assert.match(E.FINDING_CODES.standard_expired.ref, /ILAC P10:07\/2020 §2/);
});
