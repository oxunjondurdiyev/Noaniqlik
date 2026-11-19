# Validatsiya matritsasi — ko'chirildi (P13, 2026-11-19)

Bu fayldagi jadvallar (P01–P12, 289 qator) **yangi tizimga ko'chirilgan** — endi ikkita qo'lda yuritiladigan nusxa yo'q:

| Nima | Qayerda | Qanday yuritiladi |
|---|---|---|
| Talablar (barqaror ID: `REQ-<SOHA>-NNN`) | [validation/REQUIREMENTS.md](validation/REQUIREMENTS.md) | qo'lda |
| Talab → kod → test → holat bog'lanishi | [validation/rtm.map.json](validation/rtm.map.json) | qo'lda |
| Izlanuvchanlik matritsasi (RTM) | [validation/RTM.md](validation/RTM.md) | **avtomatik**: `node scripts/rtm.js --write` |
| Test natijalari (kutilgan / olingan qiymat, tolerans, D-ID) | validatsiya hisoboti | **avtomatik**: `node scripts/validation-report.js` (CI artifact; deploy'da saytda) |

Eski bo'limlar ↔ yangi sohalar: §1 → GUM, §2 → RND, §3 va §12 → MCM, §4 → SRC, §5 → INF, §6 → TPL, §6.1 → TPW, §7 → REG, §8 → TDN, §9 → SPM, §10 → LNT, §11 → RIO, §13 → MVR, §14 → LAB, §15 → PTV. Yangi: GOV (CLAUDE.md qoidalari), VAL (P13).

Ko'chirishda mazmun o'zgartirilmagan; eskirgan holat belgilari `CLAUDE.md` bo'yicha yangilangan (ro'yxat — [validation/KNOWN_LIMITATIONS.md](validation/KNOWN_LIMITATIONS.md) oxiridagi "nomuvofiqliklar" bo'limi). Avvalgi matn — git tarixida (`e58913b` va undan oldin).

Qoida: har bir talab kamida bitta testga bog'langan yoki aniq belgisi bor (unverified / pending / manual); bog'lanmagan talab — `npm test` xatosi (`tests/validation/rtm.test.js`).
