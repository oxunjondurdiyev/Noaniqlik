/* X8 — nol yoki CMC dan kichik noaniqlik.
   zero_u    (error)  U = 0 yoki u_c = 0: noaniqlik nolga teng bo'la olmaydi — kamida rezolyutsiya va etalon hissasi bor
                      (JCGM 100:2008 3.3.1, F.2.2.1: "even if the repeated indications were all identical, the
                      uncertainty … would not be zero"). Barcha rejimlarda.
   below_cmc (error)  U < CMC: sertifikatdagi noaniqlik akkreditatsiya sohasidagi CMC dan kichik bo'lmasligi kerak
                      (ILAC P14:09/2020 §5.5: "shall not report a smaller measurement uncertainty than the uncertainty
                      described by the CMC"). Dastur U ni avtomatik almashtirmaydi.
   zero_s    (info)   barcha o'qishlar bir xil (s = 0), rezolyutsiya manbasi byudjetda bor;
   x8_zero_s_no_resolution (warning)  s = 0 va shu kirish uchun rezolyutsiya manbasi yo'q (F.2.2.1).
   CLAUDE.md: "U = 0 yoki U < CMC bo'lgan natija ogohlantirishsiz hisobotga chiqmaydi." */
import { finding, gumState, typeBOf, isResolutionLike, modeOf, short } from '../util.js';

const rule = {
  id: 'X8',
  severity: 'error',
  ref: 'JCGM 100:2008 3.3.1, F.2.2.1',
  modes: ['GUM', 'TOP_DOWN', 'SAMPLING', 'MICRO', 'MEDICAL'],
  codes: {
    zero_u: {},
    below_cmc: { ref: 'ILAC P14:09/2020 §5.5; EA-4/02 M:2022 Appendix A' },
    zero_s: { severity: 'info', ref: 'JCGM 100:2008 F.2.2.1' },
    x8_zero_s_no_resolution: { severity: 'warning', ref: 'JCGM 100:2008 F.2.2.1' },
  },
  check(spec, result) {
    const out = [];
    const warnings = result.warnings || [];
    const zero = warnings.filter(w => w.code === 'zero_u');
    if (zero.length) zero.forEach((w, i) => out.push(finding(rule, 'zero_u', { value: w.value, key: w.value || (i ? String(i) : '') })));
    else if (result.U === 0 || result.uc === 0) out.push(finding(rule, 'zero_u'));
    if (modeOf(result) !== 'GUM') return out;

    const cmc = warnings.find(w => w.code === 'below_cmc');
    if (cmc) out.push(finding(rule, 'below_cmc', { value: `U = ${short(result.U, 4)} < CMC = ${short(Number(cmc.value), 4)}`, ref: rule.codes.below_cmc.ref }));

    const state = gumState(spec);
    const comps = state ? typeBOf(state) : [];
    warnings.filter(w => w.code === 'zero_s').forEach(w => {
      const hasResolution = comps.some(c => c.param === w.param && isResolutionLike(c));
      out.push(hasResolution
        ? finding(rule, 'zero_s', { param: w.param, severity: 'info', ref: rule.codes.zero_s.ref })
        : finding(rule, 'x8_zero_s_no_resolution', { param: w.param, severity: 'warning', ref: rule.codes.x8_zero_s_no_resolution.ref }));
    });
    return out;
  },
};
export default rule;
