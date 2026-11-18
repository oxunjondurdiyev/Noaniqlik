/* L1 — reestrdan tanlangan etalon / o'lchash vositasining holati (P11).
   Manba B tur komponentidagi `registry` nusxasi (src/engine/lab/registry.js::sourceFromStandard): hisob reestrga murojaat
   qilmaydi. Tekshiruv sanasi — `settings.measurementDate` (o'lchash bajarilgan sana): etalon ISHLATILGAN kuni amalda
   bo'lishi kerak; dvigatel soatni o'qimaydi (natija qayta hisobda o'zgarmasligi uchun).
   standard_expired        (error)    o'lchash sanasi amal qilish muddatidan keyin — hisobot "RASMIY EMAS" (qabul qilinmaguncha).
   standard_expiring       (info)     muddat tugashiga `expiryWarnDays` (standart 30) kun yoki kam qolgan.
   standard_no_validity    (warning)  o'lchash sanasi yoki amal qilish muddati ko'rsatilmagan — muddat tekshirilmadi.
   standard_no_traceability (warning) akkreditatsiya belgisi / kodi yo'q va yo'l CIPM MRA qamragan NMI emas —
                                      kuzatuvchanlik dalili yo'q (ILAC P10:07/2020 §2, 1) – 3b), Note 3; p. 6–7).
   Ref: ILAC P10:07/2020 §2 (p. 6–8) — verified. ISO/IEC 17025:2017 §6.4, §6.5 — unverified (standart repoda yo'q).
   Muddat chegarasining o'zi ("muddati o'tgan → error") — loyiha qarori: ILAC P10 muddat haqida gapirmaydi.
   Chegaralar va darajalar — loyiha qarori (docs/LINTER_RULES.md §4 #25–#27). */
import { finding, gumState, typeBOf, THRESHOLDS } from '../util.js';
import { validityStatus, hasTraceabilityEvidence } from '../../lab/registry.js';

const rule = {
  id: 'L1',
  severity: 'error',
  // ISO/IEC 17025:2017 §6.4, §6.5 repoda yo'q — `ref` da faqat tekshirilgan manba (ILAC P10) ko'rsatiladi
  ref: 'ILAC P10:07/2020 §2 (p. 6–7)',
  modes: ['GUM'],
  codes: {
    standard_expired: {},
    standard_expiring: { severity: 'info' },
    standard_no_validity: { severity: 'warning' },
    standard_no_traceability: { severity: 'warning', ref: 'ILAC P10:07/2020 §2 (1), (2), Note 3 (p. 6–7)' },
  },
  check(spec) {
    const state = gumState(spec);
    if (!state) return [];
    const settings = state.settings || {};
    const out = [];
    const seen = new Set();
    for (const c of typeBOf(state)) {
      const reg = c.registry;
      if (!reg || typeof reg !== 'object') continue;
      const key = `${reg.id || c.name || c.index}@${reg.version || 0}`;
      if (seen.has(key)) continue;             // bitta etalon bir nechta kirishda — bitta topilma
      seen.add(key);
      const source = [reg.name, reg.certificate].filter(Boolean).join(' — ') || c.name;
      const v = validityStatus(reg.validUntil, settings.measurementDate, settings.expiryWarnDays === undefined ? THRESHOLDS.expiryWarnDays : settings.expiryWarnDays);
      if (v.status === 'expired') out.push(finding(rule, 'standard_expired', { source, key, value: `${reg.validUntil} < ${settings.measurementDate}` }));
      else if (v.status === 'expiring') out.push(finding(rule, 'standard_expiring', { source, key, severity: 'info', value: `${reg.validUntil} (${v.daysLeft})` }));
      else if (v.status === 'unknown') out.push(finding(rule, 'standard_no_validity', { source, key, severity: 'warning' }));
      if (!hasTraceabilityEvidence(reg)) out.push(finding(rule, 'standard_no_traceability', { source, key, severity: 'warning', ref: rule.codes.standard_no_traceability.ref }));
    }
    return out;
  },
};
export default rule;
