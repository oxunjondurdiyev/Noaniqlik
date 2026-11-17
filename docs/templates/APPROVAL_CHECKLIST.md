# Shablonni APPROVED holatiga o'tkazish tartibi

> Qo'llanadi: `templates/builtin/*.json` va laboratoriya yaratgan har qanday shablon (format `uc-template/1`, [TEMPLATE_GUIDE](../TEMPLATE_GUIDE.md)).
> Asos: CLAUDE.md ("APPROVED holatiga o'tish sharti: laboratoriyaning real hisobi bilan solishtirilgan kamida bitta misol"), ISO/IEC 17025:2017 §7.2.2 (usul validatsiyasi), §7.11.2 (dasturiy ta'minot validatsiyasi).
> Holat oqimi: **DRAFT → REVIEWED → APPROVED**. Lokal rejimda rollar faqat ogohlantirish darajasida; to'liq nazorat — server bilan (P15).

## 1. Laboratoriya standartning amaldagi nashrini tekshiradi

- [ ] Standart shifri, nashri (yili) va bandi `standards[]` ga yozildi (`edition`, `clause`).
- [ ] Model formulasi standartdagi formulaga mos (belgilar, ko'paytuvchilar, birliklar).
- [ ] Standart jadvallaridan olinadigan o'zgarmaslar (`constants[]`: α, f, k …) kiritildi va `ref` da jadval raqami ko'rsatildi.
- [ ] Shablonning har bir `openQuestions[]` savoliga javob yozildi; `blocking: true` savollar yopildi (savol olib tashlanadi yoki javob `sourceNote` ga yoziladi).
- [ ] Natijani yaxlitlash qoidasi (masalan "0,1 MPa gacha") hisobot qatlamida — noaniqlik byudjetiga kiritilmagan.
- [ ] Namunaning o'zgaruvchanligi `includeByDefault: false` bilan qolgan (mahsulot xossasi).
- [ ] **Bitta asbob korrelyatsiyasi (P04b):** asbob sertifikati umumiy (ofset/sezgirlik) va nuqtaga xos (nochiziqlilik, ekssentriklik, interpolyatsiya) qismlarga to'g'ri bo'lingan va u²(umumiy) + u²(nuqta) ≤ u²(sertifikat) (dastur ogohlantirishi yo'q), **yoki** `split: "unknown"` tanlangan va hisobotda konservativ chegara (r = 0 / r = 1) yozilgan ([TEMPLATE_GUIDE §8](../TEMPLATE_GUIDE.md#8-bitta-asbob-korrelyatsiyasi-p04b)).

## 2. Real hisob bilan solishtirish

- [ ] Laboratoriyaning real hisobi (Excel yoki qo'lda, imzolangan) tanlandi: kirish qiymatlari, sertifikat U va k, natija y, u_c, ν_eff, k, U.
- [ ] Shu kirishlar bilan shablon bo'yicha hisob qilindi (hisob sahifasi → "Yig'indi noaniqlikni hisoblash").
- [ ] Farq: y, u_c, U — 1e-9 nisbiy (Excel bilan bir xil formulalar bo'lsa) yoki farq sababi yozildi (masalan Excel ν_B = 10⁹, `tests/cases/DISCREPANCIES.md` D-03).
- [ ] Korrelyatsiya savollariga (bitta asbob) javob real tartibga mos.

## 3. `tests/cases/*.json` ga `verified` misol qo'shish

- [ ] Excel fayl `tests/fixtures/` ga qo'yildi (yoki qo'lda hisob PDF/rasm sifatida — shaxsiy ma'lumotlarsiz).
- [ ] `tests/cases/<soha>/<id>.json` yaratildi: `status: "verified"`, `source.file`, `source.inputRefs` va har bir `expected.*.ref` — **katak havolasi** (`Varaq!C12`).
- [ ] `npm test` yashil; `docs/VALIDATION_MATRIX.md` dagi shablon qatori `pending` → `verified`, test nomi bilan.

## 4. Imzolar

| Rol | Login yoki lavozim (F.I.Sh. emas) | Sana | Izoh |
|---|---|---|---|
| Bajaruvchi (shablon muallifi) | | | |
| Tekshiruvchi (REVIEWED) | | | |
| Tasdiqlovchi (APPROVED) | | | |

- [ ] Tekshiruvchi va tasdiqlovchi turli shaxslar (lokal rejimda dastur faqat ogohlantiradi).
- [ ] Muharrirda holat o'tishlari "Kim" va "Sabab" bilan qilindi — audit jurnalida (`Ma'lumotlar: eksport / import / audit`) yozuvlar bor va xesh zanjiri butun.
- [ ] APPROVED dan keyin o'zgartirish faqat **yangi versiya** orqali (qulflangan bo'limlar: model, variants, constants, inputs, typeBSources, correlations, measurand).
