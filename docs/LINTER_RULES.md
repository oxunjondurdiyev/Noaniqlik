# Metrologik linter qoidalari (`src/engine/linter/`) — ENGINE_VERSION 2.4.0

> Holat: P05a, 2026-11-18. Linter `evaluate()` natijasiga **`result.findings`** ni yozadi. U **hisobni o'zgartirmaydi**: y, u_c, ν_eff, k, U — avvalgidek (55 ta test misolida 2.3.0 bilan bayt darajasida bir xil).
> Har bir qoida — alohida modul (`src/engine/linter/rules/*.js`): `{ id, severity, ref, modes, codes, check(spec, result, ctx) → findings[] }`.
> Rejimlar: `GUM`, `REGRESSION`, `TOP_DOWN`, `SAMPLING`, `QUALITATIVE`, `MICRO`, `MEDICAL`.
> Matnlar (nima topildi / nima uchun / qanday tuzatish) — `src/js/i18n-linter.js`, uch tilda: `w_<kod>`, `why_<kod>`, `fix_<kod>`.

**Manba belgisi.** `ref` da hujjat nomi va bandi yoziladi. `docs/references/` da **yo'q** hujjatga havola `(unverified)` bilan belgilanadi (ILAC P14, ILAC G8, JCGM 106, GUM-6, COOMET R/GM/32, ISO/IEC 17025, ISO 5725-2). Hech bir manbasi repoda bo'lmagan qoida/kod — `unverified: true` (jadvalda ❔).

**Gemini hisoboti** (`docs/audit/gemini-audit-2026-11.md` §9) faqat g'oyalar manbai bo'ldi; har bir qoida quyidagi manba bandlari bilan mustaqil tekshirildi (matn `docs/references/` dagi PDF lardan).

## 1. Topilma (finding)

```js
{ id, rule, code, severity: 'error'|'warning'|'info', ref, mode, param?, source?, value?, unverified? }
```

- `id` — barqaror kalit (`<qoida>/<kod>:<kirish>/<manba>`); "asoslangan holda qabul qilish" shu id bo'yicha saqlanadi.
- Tartib: error → warning → info.
- `error` qabul qilinmaguncha hisobot **"RASMIY EMAS"** suv belgisi bilan chiqadi.

## 2. Qoidalar

### 2.1. X1–X12

| Qoida | Kod | Daraja | Rejim | Ref | Nima tekshiriladi | Tuzatish |
|---|---|---|---|---|---|---|
| **X1** | `x1_mpe_in_budget` | error | GUM | JCGM 100:2008 3.4.5, F.2.4.2; ILAC P14:09/2020 §5.4 (unverified); COOMET R/GM/32:2017 §8.3.1 (unverified) | Kalibrlanayotgan asbobning ruxsat etilgan xatosi (MPE) byudjetda: (a) B tur manbaning yarim kengligi muvofiqlik uchun kiritilgan MPE bilan bir xil (son yoki ifoda); (b) kalibrlash konteksti (model turi "xato" yoki MPE kiritilgan) va manba nomi "MPE / ruxsat etilgan xato / допускаемая погрешность / permissible" ga o'xshaydi. Etalon / kalibrator nomli manba — istisno (F.2.4.2: o'lchash vositasining MPE si qonuniy manba) | Manbani byudjetdan chiqarish; MPE — faqat muvofiqlik maydonida |
| **X2** | `x2_certificate_divisor` | warning | GUM | JCGM 100:2008 4.3.3, 4.3.4; EA-4/02 M:2022 §3.3.2 (a) | Sertifikat manbasi (nom yoki `kind: 'certificate'`) normal taqsimotda k = 1 yoki k ≈ √3 bilan | Sertifikatdagi U va k ni kiritish |
| | `x2_certificate_rect` | info | GUM | JCGM 100:2008 4.3.3, 4.3.7 | Sertifikat manbasi to'g'ri burchakli taqsimotda (√3) | U (k) berilgan bo'lsa — normal + k |
| **X3** | `x3_hysteresis_double` | warning | GUM | JCGM 100:2008 4.3.10, F.2.2.2 | Histerezis ikki marta: (i) ↑/↓ o'qishlar bor, A tur barcha o'qishlardan, histerezis qo'lda ham qo'shilgan; (ii) ↑/↓ rejimi (avtomatik h/2) + qo'lda histerezis | Qo'lda manbani olib tashlash yoki ↑/↓ rejimi |
| **X4** | `x4_correlation_ignored` | warning | GUM | JCGM 100:2008 5.2.2, 5.2.3, 5.2.5, F.1.2.2 | Juftlangan qatorlarda \|r\| > 0,5 **va** r statistik ahamiyatli (t-test, α = 0,05), lekin "juftlangan" o'chiq | "Juftlangan" ni yoqish |
| | `x4_shared_reference` | warning | GUM | JCGM 100:2008 5.2.4, F.1.2.3; EA-4/02 M:2022 Appendix D (D4) | Ikki kirishda bir xil nomli etalon / sertifikat manbasi, B tur kovariatsiya 0 | Kovariatsiyani kiritish |
| **X5** | `x5_resolution_divisor` | warning | GUM | JCGM 100:2008 F.2.2.1, 4.3.7 | Rezolyutsiya manbasi: 'rect' ga to'liq qadam δ yoki 'resol' ga δ/2 kiritilgan (δ kuzatuvlarning o'nlik xonalaridan olinadi) | δ + 'resol' yoki δ/2 + 'rect' |
| | `x5_resolution_distribution` | warning | GUM | shu | Rezolyutsiya manbasi normal / uchburchak / arksinus taqsimotda | 'resol' yoki 'rect' |
| | `x5_resolution_rect` | info | GUM | shu | Rezolyutsiya 'rect' bilan, δ ni kuzatuvlardan aniqlab bo'lmadi | a = δ/2 ekanini tekshirish |
| | `x5_unusual_divisor` | warning | GUM | JCGM 100:2008 4.3.3, 4.3.4 | Normal taqsimotda k < 1 yoki k > 4 | To'g'ri k |
| **X6** | `unit_budget`, `unit_output`, `unit_affine`, `unit_pow` | warning | GUM | JCGM 100:2008 5.1.3; JCGM GUM-6:2020 §11 (unverified) | Dvigatelning o'lchamlik tahlili (P03) — kodlar o'zgarmagan | Birlikni o'tkazish / ko'paytuvchi |
| | `x6_source_units_differ` | warning | GUM | shu | Manba birligi kirish birligidan (yoki shu kirishning boshqa manbasidan) farq qiladi — masshtab ham (mK va K), ko'paytuvchi 1 | Birlikni o'tkazish / ko'paytuvchi |
| **X7** | `x7_k2_low_dof` | warning | GUM | EA-4/02 M:2022 §5.1, §5.3, §5.5, Appendix E; JCGM 100:2008 G.6.6 | k = 2 qat'iy, ν_eff < 30 | k = t(ν_eff) yoki ko'proq kuzatuv / s_p |
| | `x7_k2_few_observations` | warning | GUM | shu | k = 2 qat'iy, A tur ulushi > 30 % va n < 10 | shu |
| **X8** | `zero_u` | **error** | GUM, TOP_DOWN, SAMPLING, MICRO, MEDICAL | JCGM 100:2008 3.3.1, F.2.2.1 | U = 0 yoki u_c = 0 | B tur manbalarni kiritish |
| | `below_cmc` ❔ | **error** | GUM | ILAC P14:09/2020 §5.3 (unverified); EA-4/02 M:2022 Appendix A | U < CMC (dastur U ni avtomatik almashtirmaydi) | Byudjetni tekshirish; asoslab qabul qilish |
| | `zero_s` | info | GUM | JCGM 100:2008 F.2.2.1 | s = 0, rezolyutsiya manbasi bor | — (s_p tavsiya) |
| | `x8_zero_s_no_resolution` | warning | GUM | JCGM 100:2008 F.2.2.1 | s = 0, shu kirish uchun rezolyutsiya manbasi yo'q | Rezolyutsiya manbasini qo'shish |
| **X9** | `x9_too_many_digits` | warning | barcha (hisobot qatlami) | JCGM 100:2008 7.2.6; ILAC P14:09/2020 §5 (unverified) | Chop etiladigan U ikki qiymatli raqamdan ko'p | Yaxlitlash |
| | `x9_decimals_mismatch` | warning | barcha | shu | y va U o'nlik xonalari mos emas | y ni U ning oxirgi xonasigacha |
| **X10** | `x10_no_drift` | info | GUM | EA-4/02 M:2022 Appendix C (C3), S2.4, S3.4, S4.4 | Etalon manbasi bor, drift / uzoq muddatli barqarorlik manbasi yo'q | Driftni qo'shish yoki sertifikat U siga kirganini tekshirish |
| **X11** | `x11_double_counting` | warning | TOP_DOWN | Nordtest TR 537 ed. 4 §3.2 (p. 10); QUAM:2012 §7.6.2 d), §7.7.1 | Asos (R_w / s_R / bias) qamragan omil qo'shimcha hissa sifatida yana qo'shilgan. **Hissa hisobda qoladi** (egasi qarori, R-20) | Qatorni olib tashlash yoki asoslab qabul qilish |
| **X12** | `x12_empirical_bias` | warning | TOP_DOWN | QUAM:2012 §7.9.2–7.9.3 (p. 21) | Empirik kattalikda bias, "tayanch qiymat usuli" javobsiz — hissa **qo'shiladi** (konservativ) | Savolga javob berish |
| | `x12_bias_excluded` | info | TOP_DOWN | QUAM:2012 §7.9.2 | `referenceMethod: 'other'` — hissa chiqarilgan | — |

X9 hisobot qatlami satrlarini tekshiradi: `lintReported({ y, U })`. Hisobot har bir GUM natijasini chop etishdan oldin o'z yaxlitlagan satrlarini shu qoidadan o'tkazadi (o'z-o'zini tekshirish).

**X11 va X12** P09 da `src/engine/topdown/` ning `warnings[]` da edi. P05a da linterga ko'chirildi; xatti-harakat va egasi qarorlari (2026-11-17, RISKS R-20) aynan saqlangan. Hissani qo'shish / chiqarish dvigatelda qoladi (`budget[].flag`, `included`); qoida shu belgidan o'qiydi. Eski `warnings[]` maydoni **bir versiya davomida** moslik uchun qoladi (deprecated, 2.5.0 da olib tashlanadi).

### 2.2. Qo'shimcha qoidalar

| Qoida | Kod | Daraja | Rejim | Ref | Nima tekshiriladi | Tuzatish |
|---|---|---|---|---|---|---|
| **A1** | `dominant_source` | info | GUM, TOP_DOWN | EA-4/02 M:2022 §5.2, §5.6, S8.3, S9.14; JCGM 100:2008 G.2.3, G.6.6 | Bitta manba ulushi > 90 % | — (MC bilan tekshirish) |
| **A2** | `n_lt3` | warning | GUM | JCGM 100:2008 E.4.3 (Table E.1), 4.2.4; EA-4/02 M:2022 §5.3, §5.5 | n < 3 (1-usul) | Ko'proq kuzatuv yoki s_p |
| | `n_small` | info | GUM | shu | 3 ≤ n < 5 (P00 kodi) | shu |
| **A3** | `invalid_nu` | **error** | GUM | JCGM 100:2008 G.3.3, G.4.1, G.4.2 | ν ≤ 0 yoki son emas (B tur ν, s_p ning ν_p) — dvigatel uni jimgina ∞ deb oladi | Musbat ν yoki bo'sh (∞) |
| **A4** ❔ | `grubbs_outlier` | info | GUM | ISO 5725-2 §7.3.4 (unverified) | Grubbs mezoni (ikki tomonlama, α = 0,05). Qiymat **chiqarilmaydi** | Sababini aniqlash |
| **M1** ❔ | `model_kind_unknown` | warning | GUM | ISO/IEC 17025:2017 §7.8.6 (unverified); JCGM 106:2012 §7 (unverified) | MPE kiritilgan, model turi ko'rsatilmagan — muvofiqlik bayonoti berilmaydi (RISKS R-07) | Model turini tanlash |
| | `model_value_no_nominal` | warning | GUM | shu | Model turi "qiymat", nominal yo'q | Nominalni kiritish |

### 2.3. Modul ogohlantirishlari topilma sifatida (kodlar o'zgarmagan)

| Qoida | Kodlar | Daraja | Rejim | Ref |
|---|---|---|---|---|
| **W1** | `c_nan` (**error**), `c_zero`, `c_mismatch`, `nonlinear`, `nu_lt1`, `dir_missing`, `sp_missing`, `coomet_small` ❔ (warning), `c_numeric` (info) | — | GUM | JCGM 100:2008 5.1.2 Note, 5.1.3, G.4.1, 4.2.4, 4.2.8, F.2.2.2; COOMET R/GM/32:2017 (unverified) |
| **W2** | `regression_*`, `urange_*` (11); `topdown_*` (7); `sampling_*` (6); `qualitative_*` (4); `micro_*` (4); `medical_*` (3) | modul jadvalidagidek | REGRESSION, TOP_DOWN, SAMPLING, QUALITATIVE, MICRO, MEDICAL | modul jadvalidagi `ref` (o'zgarmagan): `REGRESSION_WARNINGS`, `TOPDOWN_WARNINGS`, … |

`c_nan` — error: sezgirlik koeffitsiyenti hisoblanmasa, hissa byudjetdan tushib qoladi. To'liq ro'yxat — `FINDING_CODES` (`src/engine/linter/index.js`).

## 3. "Asoslangan holda qabul qilish"

- warning yoki error topilmasini foydalanuvchi izoh bilan qabul qilishi mumkin; **izoh majburiy, kamida 10 belgi**. Info qabul qilinmaydi.
- Qabul qilish `src/storage/` audit zanjiriga yoziladi (`acceptFinding`): **kim (rol), qachon, topilma id, izoh**. Rol — `admin` / `employee` / `superadmin` / `guest`; ism, login va boshqa shaxsiy ma'lumot yozilmaydi. Zanjirga yozib bo'lmasa (IndexedDB yo'q) — qabul rad etiladi.
- Bekor qilish — yangi yozuv (`finding_revoke`); eski yozuv o'chmaydi.
- Qabul qilingan topilma **yo'qolmaydi**: ekranda va bosma hisobotda izohi, roli va sanasi bilan chiqadi.
- Qabul topilma qiymatiga bog'langan: qayta hisobda qiymat o'zgarsa (masalan U boshqa), eski qabul amal qilmaydi.
- `error` qabul qilinmaguncha hisobot "RASMIY EMAS" suv belgisi bilan chiqadi (har sahifada).
- U = 0, u_c = 0, U < CMC: laboratoriya sozlamasi `criticalMode` — `mark` (standart: hisobot aniq belgi bilan) yoki `block` (hisobot chop etilmaydi). P04 dagi `cmcMode: 'block'` avvalgidek ishlaydi.

## 4. Loyiha qarorlari — egasi tasdig'ini kutadi

Quyidagi chegara va tanlovlar **me'yoriy talab emas** — manbalarda aniq son yo'q yoki boshqa son bor. Qiymatlar `LINTER_THRESHOLDS` da (`src/engine/linter/util.js`).

| # | Qoida | Qaror | Manbada nima bor |
|---|---|---|---|
| 1 | A1 | ulush > **90 %** → info | son yo'q; EA-4/02 S9.3–S9.4: ustun bo'lmagan hadlar / ustun had ≤ 0,3 |
| 2 | X4 | \|r\| > **0,5** **va** t-test (α = 0,05) bo'yicha ahamiyatli; kamida 3 juft qator | JCGM 100 5.2.5: "present and significant" — son yo'q |
| 3 | X7 | ν_eff < **30** | JCGM 100 G.6.6: "say greater than 10" |
| 4 | X7 | A tur ulushi > **30 %** va n < 10 | n < 10 — EA-4/02 §5.3; ulush chegarasi manbada yo'q |
| 5 | A2 | n < **3** → warning; 3 ≤ n < 5 → info | son yo'q; Table E.1: n = 2 → 76 %, n = 3 → 52 % |
| 6 | A4 | Grubbs, ikki tomonlama, **α = 0,05**, n ≥ 3; faqat info | ISO 5725-2 repoda yo'q (bir tomonlama 5 % / 1 % bo'lishi mumkin) |
| 7 | X5 | normal taqsimotda k < **1** yoki k > **4** | son yo'q |
| 8 | X5 | δ kuzatuvlarning o'nlik xonalaridan olinadi; mos kelish 1 % ichida | — (evristika) |
| 9 | X8 | `below_cmc` — **error** (warning emas) | ILAC P14 repoda yo'q |
| 10 | X8 | s = 0 + rezolyutsiya manbasi yo'q → warning; bor → info | F.2.2.1 — daraja ko'rsatilmagan |
| 11 | A3, W1 | `invalid_nu` va `c_nan` — **error** | — |
| 12 | X1 | (b) holatda manba **nomi** bo'yicha aniqlash (uz/ru/en kalit so'zlar); etalon nomli manba istisno | — (evristika) |
| 13 | X2, X10 | sertifikat / etalon / drift manbalari nom yoki `kind` bo'yicha | — (evristika) |
| 14 | Qabul | izoh ≥ 10 belgi; qabul topilma qiymatiga bog'langan; rol sifatida faqat `admin` / `employee` / `superadmin` / `guest` | — |
| 15 | Suv belgisi | faqat qabul qilinmagan `error` da; warning — belgisiz | — |
| 16 | R-07 | model turi ko'rsatilmagan hisobda muvofiqlik bayonoti **va** keltirilgan xato γ berilmaydi | — |

## 5. Tekshiruv

- `tests/engine/linter.test.js` — har bir qoida uchun kamida bitta ijobiy va bitta salbiy holat (32 test).
- `tests/engine/linter-fixtures.test.js` — 9 ta etalon nuqtada `error` yo'q; gazoanalizator qo'llanmasidagi asl xatolar (MPE byudjetda → X1; nol nuqtada U = 0 → X8) `.docx` iqtiboslari bilan.
- `tests/storage/acceptance.test.js` — qabul qilish va audit zanjiri.
- `tests/ui/findings.test.js` — blok, uch til, escape, bosma hisobot, suv belgisi, belgilar, model turi.

9 ta etalon nuqtadagi topilmalar (hammasi info): gaz 1 — `zero_s`, `n_small`, `x10_no_drift`; gaz 2, 3 — `n_small`, `x10_no_drift`; termometr 1 — `zero_s`; termometr 4 — `zero_s`, `x5_resolution_rect`; zichlik, termometr 2, 3, 5 — topilma yo'q.
