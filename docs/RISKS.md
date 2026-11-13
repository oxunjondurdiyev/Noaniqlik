# UncertaintyCalc — texnik xavflar reyestri (P00 audit)

> Holat: `d60d2c3` (2026-11-11). Har bir xavf kod joyi bilan ko'rsatilgan. "Tekshirildi" — P00 sessiyasida Node'da ishga tushirib tasdiqlangan.
> Jiddiylik: **K** — kritik (akkreditatsiyada himoya qilib bo'lmaydi yoki ma'lumot sizib chiqadi), **Y** — yuqori, **O** — o'rta, **P** — past.
> "Gemini" belgisi — `docs/audit/gemini-audit-2026-11.md` da ham aytilgan, lekin bu yerda kod bo'yicha mustaqil tasdiqlangan.

## Xulosa jadvali

| ID | Xavf | Jiddiylik | Bosqich |
|---|---|:-:|:-:|
| R-S1 | Firestore qoidalari noma'lum / "test mode"; barcha shaxsiy ma'lumotlar ochiq bo'lishi mumkin | K | P02 |
| R-S2 | Super-admin login/paroli mijoz kodida ochiq | K | P02 |
| R-S3 | Xodim parollari Firestore'da ochiq matnda (`rawPwd`) | K | P02 |
| R-S4 | Sessiya imzosiz, `localStorage` da — qo'lda yasash mumkin | K | P02 |
| R-S5 | XSS: `showToast` va `index.html` `pending-org-info` da escape'siz `innerHTML` | Y | P02 |
| R-01 | Etalon Excel fayllar repoda yo'q; testlar faqat yaxlitlangan satrni tekshiradi | K | P01 |
| R-02 | Sonli hosila qadami h; nochiziqli modelda c=0 → u_c=0 | Y | P03 |
| R-03 | t-kvantil: ν `floor` qilinadi, ν=5000 da sakrash, `erf` approksimatsiyasi | O | P03 |
| R-04 | Yaxlitlash dvigatel ichida; manfiy sonlarda assimetriya; ROUNDUP 3 raqam ko'rsatadi | Y | P03/P05 |
| R-05 | Chop etilgan hisobotda ogohlantirishlar (U=0, U<CMC) yo'q | K | P05 |
| R-06 | Monte-Karlo: xorshift32, qat'iy seed, adaptiv M yo'q, korrelyatsiya yo'q | Y | P06 |
| R-07 | Muvofiqlik `|y|` ni xato deb faraz qiladi | Y | P05 |
| R-08 | Manfiy dispersiya jimgina 0 ga kesiladi | O | P03 |
| R-09 | `localStorage` versiyasiz, migratsiyasiz; saqlangan natijalar dvigatel versiyasiz | Y | P04 |
| R-10 | B tur u_B UI'da dvigateldan mustaqil qayta hisoblanadi | O | P03 |
| R-11 | Preset va test ma'lumotlari ikki joyda | O | P01 |
| R-12 | Parser: `:` → bo'lish, `e` konstanta, birliklar yo'q | O | P03 |
| R-13 | i18n'dan tashqari qattiq matnlar; admin sahifalari bir tilli | O | P05 |
| R-14 | CDN skriptlar SRI'siz, CSP yo'q | O | P02 |
| R-15 | Trial limiti va to'lov holati faqat mijoz tomonda | O | P02 |
| R-16 | MC asosiy oqimda — M=10⁶ da UI qotadi | P | P06 |
| R-17 | Me'yoriy hujjatlarning yarmi `docs/references/` da yo'q | Y | P01 |

### P03 natijasi (2026-11-13, branch `feat/p03-engine`, ENGINE_VERSION 2.0.0)

| ID | Holat | Nima qilindi | Qoldiq xavf |
|---|---|---|---|
| R-02 | **yopildi** | c_i — simvolik hosila; sonli — zaxira/o'zaro tekshiruv, h = ε^⅓·max(\|x\|, u); c = 0/NaN → `c_zero`/`c_nan`; 2-tartibli hadlar diagnostikasi (`nonlinear`) | 2-tartibli hadlar faqat normal, korrelyatsiyasiz kirishlarda haqiqiy (hisobotda yoziladi); MC bilan tekshiruv — P06 |
| R-03 | **yopildi** | AS241 normal kvantil; t-kvantil < 1e-11 (mpmath); Q-1(a) — chegara va sakrash yo'q; ν_eff cap yo'q; ν qoidasi sozlama va hisobotda | — |
| R-04 | **yopildi (dvigatel qismi)** | yaxlitlash `src/report/rounding.js` da; 0,0999 → 0,10; half-away-from-zero; 15 raqamli ikkilik tuzatish | U = 0 / U < CMC ni chop etishda bloklash — P05 |
| R-08 | **yopildi** | manfiy dispersiya va \|r\| > 1 → xato | — |
| R-10 | **qisman** | korrelyatsiya ko'rinishi `typeAx` bilan (evaluate bilan bir xil); ko'p nuqtali bir xil k — `multiPointCoverage` dvigatelda | `typeB.js` dagi u_B ko'rinishi dvigatel funksiyalari bilan hisoblanadi, lekin hali alohida chaqiruv — P04 (shablon interpreteri) |
| R-12 | **qisman** | `units.js`: o'lchamlik tahlili, affin °C ↔ K (kirish birliklari berilsa) | UI'da kirish birligini kiritish maydoni yo'q (`state.units` faqat API/P04 orqali); GUM-6 PDF yo'q — `unverified`; `:` va `e` parser xatti-harakati o'zgartirilmadi |

### P02 natijasi (2026-11-13, branch `p02-security`)

| ID | Holat | Nima qilindi | Qoldiq xavf / egasining qadami |
|---|---|---|---|
| R-S1 | **kodda yopildi**, konsolga joylash kutilmoqda | `firestore.rules`: default deny, a'zolik bo'yicha o'qish, `active/paymentStatus/plan/planExpiry` faqat super-admin; 28 ta Emulator testi | Egasi qoidalarni konsolga joylaydi (`docs/SECURITY_SETUP.md` 5-qadam). Joylanmaguncha ma'lumot ochiq |
| R-S2 | **yopildi** | `SUPER_ADMIN` olib tashlandi; super-admin = Auth custom claim `superadmin: true` | Eski parol git tarixida — oshkor deb hisoblanadi, qayta ishlatilmaydi (SECURITY_SETUP.md §11) |
| R-S3 | **kodda yopildi** | `rawPwd`, `passwordHash`, `hashPwd` olib tashlandi; parollar faqat Firebase Auth'da; qoidalar parol maydonlarini yozishni taqiqlaydi | Mavjud hujjatlardan o'chirish — `migrate-legacy-users.mjs --strip-legacy`; eski parollar oshkor deb hisoblanadi → yangi parollar (AUTH_MIGRATION.md B yo'l) |
| R-S4 | **yopildi** | Sessiya = Firebase Auth token'i; `uc_session`/`uc_sa_session` o'chiriladi; test: soxta sessiya hech narsa bermaydi | — |
| R-S5 | **yopildi** | yagona `escHtml` (`'` bilan), `showToast` → `textContent`, shablonlar escape qilinadi, inline `onclick` yo'q; jsdom XSS testlari | `style-src 'unsafe-inline'` qoldi |
| R-14 | **yopildi** | Firebase SDK `vendor/firebase/9.23.0/` (LICENSE, SHA-384); CSP `<meta>` (`script-src 'self'`) | Google Fonts tashqi; `frame-ancestors` meta'da ishlamaydi (P15) |
| R-15 | **qisman** | Tarif/aktivatsiya/muddat faqat super-admin (qoidalar); admin faqat so'rov yuboradi | Trial hisoblagichi (`uc_trial_count`) va xodimlar limiti hali mijozda (Spark, Cloud Functions'siz); Click/Payme merchant ID'lari to'ldirilmagan |

---

## 1. Metrologik / sonli xavflar

### R-01. Etalon ma'lumotlar va testlar (K)
> **Yangilanish (2026-11-11):** Excel fayllar va qo'llanmalar `tests/fixtures/` ga qo'shildi; 9-nuqta — zichlik. Xavfning qolgan qismi (test faqat yaxlitlangan satrni tekshiradi, `npm test` yo'q) P01 da yopiladi.
- `Noaniqlik_hisobi_gazoanalizator.xlsx`, `Noaniqlik_hisobi_termometr_MS-MK-3.xlsx`, C75.QM va MS-MK-3 qo'llanmalari, zichlik Excel'i repoda **yo'q** (`git log --all` da ham yo'q). Kutilgan qiymatlar `tests/verify-excel.js:7-8` da qo'lda yozilgan — ularning manbasini tekshirib bo'lmaydi.
- Test faqat `resultText` (masalan `0.018 ± 0.021`) ni solishtiradi. u_c 10 % ga o'zgarsa ham, yaxlitlash natijasi bir xil qolsa test o'tadi.
- MC natijasi faqat konsolga chiqariladi (assert yo'q).
- `package.json` yo'q → CLAUDE.md dagi `npm test` qoidasi hozircha bajarib bo'lmaydi.
- **Chora (P01):** Excel'larni `tests/fixtures/` ga qo'shish (yoki ulardan olingan oraliq qiymatlarni manba-havola bilan JSON'ga), u_c/ν_eff/k ni nisbiy tolerantlik bilan tekshirish, `npm test`.

### R-02. Sezgirlik koeffitsiyentlari: sonli hosila qadami h (Y, Gemini)
- `calc.js:427`: `h = (|x₀| || 1) · 1e-6`, markaziy ayirma `(f(x₀+h) − f(x₀−h)) / 2h`.
- Muammolar:
  1. **Absolyut/nisbiy aralash.** x₀ = 0 bo'lsa h = 10⁻⁶ **o'lchov birligidan qat'i nazar**. Kirish 10⁻⁹ tartibida (masalan, metrda nm) va x₀=0 bo'lsa, qadam signaldan 1000 marta katta.
  2. **Nochiziqlilik.** `Y = X²`, x̄ = 0 → c = 0 → u_c = 0 (tekshirildi; faqat `zero_u` ogohlantirishi). X ~ N(0, s²) uchun Var(X²) = 2s⁴, ya'ni u(Y) = √2·s². JCGM 100:2008 5.1.2 Note dagi ikkinchi tartibli hadlar hisoblanmaydi; EA-4/02 M:2022 §4.1 Note bunday hollarda yuqori tartibli hadlarni talab qiladi (Supplement S4, S13 misollari). *Eslatma:* Gemini hisobotidagi T16 bu misolni "EA-4/02 S1 (square law detector)" ga bog'laydi — asl PDF'da S1 bu "Introduction" bo'limi; havola **tasdiqlanmadi**.
  3. **Silliq bo'lmagan funksiyalar.** `sqrt(abs(x))` x̄=0 da c = 0 (tekshirildi), `abs` nolda — xato qaytmaydi.
  4. **Xato yutiladi.** `calc.js:431`: c NaN/∞ bo'lsa `c = 0` — hissa byudjetdan yo'qoladi, ogohlantirish yo'q.
  5. h ni u(x_i) ga bog'lash (GUM 5.1.3 izohi: Δx ≈ u(x)) yoki parser AST'dan analitik hosila — tanlov qilinmagan.
- **Chora (P03):** parser AST bo'yicha simvolik (avtomatik) differensiallash; sonli usulni zaxira sifatida qoldirib, u(x_i) ga bog'liq qadam bilan solishtirish; nochiziqlilik testi (c_i·u ga nisbatan ikkinchi tartibli had nisbati) va ogohlantirish; c = 0/NaN holatini xato sifatida ko'rsatish.

### R-03. t-kvantil (qamrov koeffitsiyenti) (O)
- `coverageFactor` (`calc.js:222-231`): `betai` (Numerical Recipes incomplete beta + Lanczos `lgamma`) orqali P(|T|<t) va `[0;1000]` da 200 qadamli bisection.
- **Aniqlik (tekshirildi):** t₀.₉₇₅ uchun ν = 1, 2, 5, 10, 30 da xato ≤ 1·10⁻⁹. ν=∞ da `erf` orqali: xato 3.7·10⁻⁸. Amaliy jihatdan yetarli.
- **ν kasr bo'lsa:** `Math.floor(nu)` (`calc.js:224`) — pastga yaxlitlanadi (konservativ). Masalan, gaz 2-nuqta ν_eff = 6.93 → ν = 6 → k = 2.52. Bu JCGM 100:2008 G.4.1 Note 1 dagi ikki variantdan biri ("interpolation or truncating ν_eff to the next lower integer"). Qaysi qoida tanlangani foydalanuvchiga va hisobotga ko'rsatilmaydi; ν < 1 holat `max(1, …)` bilan jimgina 1 ga ko'tariladi.
- **Sakrash:** ν > 5000 da t → normal: k(ν=5000) = 1.960439, k(ν=5001) = 1.959964 (tekshirildi) — 5·10⁻⁴ sakrash. Yaxlitlangan k da ko'rinmaydi, lekin monotonlik buziladi.
- ν_eff `min(1e6, …)` bilan cheklanadi (`calc.js:466`): hisobotda "1000000" ko'rinadi (termometr 1 va 4-nuqtalar).
- `erf` izohi "Abramowitz–Stegun 7.1.26" deydi, aslida bu Numerical Recipes `erfcc` Chebyshev approksimatsiyasi (nisbiy xato < 1.2·10⁻⁷) — izoh noto'g'ri.
- `P` `[0.5; 0.99999]` ga jimgina qisiladi.
- **Chora (P03):** ν kasr uchun siyosatni sozlama qilish (floor / interpolyatsiya), uni hisobotda yozish; sakrashsiz yaqinlashish (ν→∞ uchun Cornish–Fisher yoki to'g'ridan-to'g'ri `betai`); GUM Table G.2 qiymatlari bilan test.

### R-04. Yaxlitlash qayerda bajariladi (Y)
- `roundResult` (`calc.js:332`) **dvigatel ichida** chaqiriladi va natijaga `Uround, yround, resultText` yoziladi; `Points.summary` ham qayta yaxlitlaydi. CLAUDE.md qoidasiga zid: yaxlitlash faqat hisobot qatlamida bo'lishi kerak.
- Oraliq qiymatlar yaxlitlanmaydi ✅ (u_c, k, ν to'liq aniqlikda saqlanadi).
- **ROUNDUP 3 raqam:** U = 0.0999, yuqoriga → 0.1, lekin `digits` o'zgarmaydi → `1.235 ± 0.100` (tekshirildi). ILAC P14 §5 "ko'pi bilan 2 qiymatli raqam" ga zid ko'rinish.
- **y uchun `Math.round`:** manfiy sonlarda +∞ tomon: −0.125 → −0.12, +0.125 → +0.13 (tekshirildi). Termometr natijalari manfiy — bu real holat.
- **Ikkilik ko'rinish:** `Math.round(v·10^d)` 1.005 kabi qiymatlarda tasodifiy natija beradi (1.005·100 = 100.49999…).
- `roundAt(up)`: `ceil(v·m − 1e-9)` — 10⁻⁹ absolyut epsilon, masshtabga bog'liq emas.
- U = 0 bo'lsa `digits = 6` → `5.000000 ± 0.000000` (ma'nosiz aniqlik).
- **Chora (P03 + P05):** yaxlitlashni `src/report/` ga ko'chirish; o'nlik arifmetika (satr asosida) yoki `toPrecision`; ROUNDUP dan keyin raqamlar sonini qayta hisoblash; yaxlitlash qoidasini (half-up / half-even / up) aniq tanlash.

### R-05. Hisobotda ogohlantirishlar yo'q (K)
- `report.js:154-170` ekranda `warningsHtml(r)` ko'rsatadi, lekin **chop etish** (`pointDetail`, `report.js:437-468`) va ko'p nuqtali sertifikat jadvali (`summaryTable`) ogohlantirishlarni chiqarmaydi.
- Natijada **U = 0** yoki **U < CMC** bo'lgan natija rasmiy ko'rinishdagi hisobotga ogohlantirishsiz chiqadi.
- CMC tekshiruvi faqat `settings.cmc` kiritilganda; CMC jadvali (diapason bo'yicha) yo'q.
- Gaz 1-nuqta: `s = 0` (n=3, barcha o'qishlar 4) → u_A = 0, ν_eff = ∞. Faqat `zero_s` ogohlantirishi.
- **Chora (P05):** ogohlantirishlarni hisobot modeliga majburiy qo'shish; `zero_u`, `below_cmc` bo'lsa chop etishni bloklash yoki aniq belgi bilan.

### R-06. Monte-Karlo: RNG va seed (Y, Gemini)
- `rng` (`calc.js:557`): **xorshift32**, davri 2³²−1, 32 bitli natija `(s+0.5)/2³²`. JCGM 101:2008 Annex C.3 generatorga talablar qo'yadi (C.3.2 — tasodifiylik testlari, BigCrush; C.3.3 — kengaytirilgan Wichmann–Hill protsedurasi; §9 misollarida Mersenne Twister ishlatilgan). xorshift32 BigCrush testlaridan o'tmaydi va davri juda qisqa.
- **Seed qat'iy `20261110`** (`calc.js:572`): har safar bir xil natija (takrorlanuvchanlik uchun yaxshi), lekin seed hisobotda ko'rsatilmaydi va o'zgartirib bo'lmaydi → statistik barqarorlikni tekshirib bo'lmaydi.
- Normal — Marsaglia polar; t — `gauss/√(χ²/ν)` Marsaglia–Tsang gamma orqali; `triang = a·(U₁−U₂)`, `ushape = a·sin(π(U−½))`. To'g'ri, lekin testlanmagan.
- **M qat'iy** (10⁵/2·10⁵/10⁶), JCGM 101 §7.9 adaptiv protsedura yo'q.
- **Korrelyatsiya hisobga olinmaydi** (`correlated` bayrog'i va izoh bor) — korrelyatsiyali modelda MC "validatsiya" noto'g'ri xulosa beradi.
- A tur namunasi `uA·t_ν`: usul 3 (COOMET, ν=∞, kengaytirilgan uA) va ↑/↓ uchun JCGM 101 §6.4.9 ga to'liq mos emas.
- Trapetsiya, egri trapetsiya, eksponensial, log-normal taqsimotlar yo'q.
- **Chora (P06).**

### R-07. Muvofiqlik `|y|` ni xato deb oladi (Y)
- `conformity(y, U, mpe)` (`calc.js:342`) `|y|` ni MPE bilan solishtiradi. Model natijasi **xato** (E = …) bo'lsa to'g'ri; agar model o'lchangan qiymatni beradi (ρ = m/V) va foydalanuvchi MPE kiritsa — natija ma'nosiz, ogohlantirish yo'q.
- Himoyalangan qabul faqat w = U (ILAC G8:09/2019 §4.2.2); qaror qoidasi tanlovi, iste'molchi/ishlab chiqaruvchi xavfi (JCGM 106) yo'q. Bir tomonlama chegaralar yo'q.
- **Chora (P05):** model turini (xato / qiymat + nominal) aniq belgilash; qaror qoidasini sozlama sifatida; JCGM 106 misollari bilan test — JCGM 106 hozir `docs/references/` da yo'q.

### R-08. Manfiy dispersiya (O)
- `calc.js:453`: `uc2 = max(0, varNoCorr + corrSum)`. Noto'g'ri kiritilgan `covB` (|r| > 1) dispersiyani manfiy qiladi → u_c = 0, faqat `zero_u` (tekshirildi). Kovariatsiya matritsasi musbat aniqlanganligi tekshirilmaydi, |r| ≤ 1 tekshirilmaydi.

### R-12. Parser va birliklar (O)
- `:` bo'lishga aylantiriladi (`calc.js:82`) — ba'zi yozuvlarda kutilmagan.
- Yolg'iz `e` = Eyler soni (`calc.js:104`); `e` nomli parametr bo'lsa birinchi u tanlanadi, lekin `E` (katta) ham `toLowerCase` orqali Eyler soniga aylanishi mumkin (parametr bo'lmasa).
- Funksiya argumenti `parsePrimary` orqali: `sqrt x+1` = `sqrt(x)+1` — kutilmagan ustuvorlik.
- Birliklar va o'lchamlik tahlili yo'q (Gemini ham ko'rsatgan): mK va °C aralashsa xato aniqlanmaydi. B komponentning `unit` maydoni faqat ko'rsatish uchun.
- B komponentning `sensitivity` ("multiplier") va model c_i ikkalasi ko'paytiriladi — foydalanuvchi c_i ni qo'lda kiritsa, ikki marta hisoblanadi.

---

## 2. Arxitektura / ma'lumot xavflari

### R-09. localStorage: versiya va migratsiya yo'q (Y)
- `uc_state_v2` da versiya maydoni yo'q; `_load` sayoz birlashtiradi; v1 → v2 migratsiyasi yo'q (eski ma'lumot yo'qolgan).
- `points[].result` — dvigatel natijasining nusxasi; dvigatel o'zgargach eski nuqtalar eski formulalar bilan hisoblangan holda qoladi va hisobotga chiqadi — qaysi versiyada hisoblangani noma'lum.
- `_save` xatosi (kvota) jimgina yutiladi.
- Preset tanlash/Reset barcha nuqtalarni ogohlantirishsiz o'chiradi; eksport/import yo'q — ma'lumotni zaxiralab bo'lmaydi.
- Audit izi yo'q (kim, qachon, nimani o'zgartirdi) — ISO/IEC 17025 §7.11.3, §7.5.

### R-10. Hisoblash mantig'ining takrorlanishi (O)
- `typeB.js:73-81, 204-221` u_B ni mustaqil hisoblaydi; `typeB.js:241` korrelyatsiyani `typeA` (usulsiz) bilan ko'rsatadi, `evaluate` esa `typeAx` bilan. Ekrandagi va hisobotdagi qiymatlar farq qilishi mumkin. Batafsil: ARCHITECTURE.md §4.

### R-11. Preset va test ma'lumotlari ikki joyda (O)
- `presets.js:345-399` va `tests/excel-cases.js` bir xil holatlarni turli tuzilmada saqlaydi. Test preset'ni tekshirmaydi.

### R-17. Me'yoriy hujjatlar to'liq emas (Y)
- `docs/references/` da: JCGM 100:2008, JCGM 101:2008, EA-4/02 M:2022, EURACHEM QUAM 2012, Nordtest TR 537 ed.4.
- **Yo'q:** JCGM 102:2011, JCGM 106:2012, JCGM GUM-6:2020, ILAC P14:09/2020, ILAC G8:09/2019, COOMET R/GM/32:2017, EURACHEM UfS 2019. Kod va UI ularga havola qiladi (`report.js:41`, `typeB.js:290`, `points.js:4`, `calc.js:256`), lekin tekshirib bo'lmaydi.
- Gemini hisobotidagi 18 ta test misolining ko'pi pullik ISO hujjatlariga (ISO/TS 28037, ISO 21748, ISO 19036) tayanadi — ularni repoga qo'yib bo'lmaydi.

---

## 3. Xavfsizlik va shaxsiy ma'lumotlar

### R-S1. Firestore qoidalari (K)
- `firestore.rules` repoda yo'q; `firebase-config.js:9` "Test mode" ni tavsiya qiladi. Test rejimi — `allow read, write: if true` (muddat bilan). Agar shunday bo'lsa, `apiKey` ochiq bo'lgani uchun (bu Firebase'da normal) **istalgan kishi** `organizations` va `employees` ni o'qiy/yoza/o'chira oladi: INN, telefon, F.I.Sh., parol xeshlari, `rawPwd`, `active`/`paymentStatus` (o'zini o'zi aktivlashtirish).
- Autentifikatsiya to'liq mijoz tomonda: `login()` hujjatni xesh bilan birga yuklab oladi va brauzerda solishtiradi.
- SHA-256 + statik tuz (`auth.js:187`) — sekin KDF emas; xeshlar sizib chiqsa 6 belgili parollar tez topiladi.
- O'RQ-547 (shaxsga doir ma'lumotlarni lokalizatsiya qilish) masalasi Gemini hisobotida ko'tarilgan — huquqiy tahlil kerak, bu texnik audit doirasidan tashqarida.

### R-S2. Super-admin paroli mijoz kodida (K)
- `firebase-config.js:26-29`: login va parol ochiq matnda, GitHub Pages orqali har kimga yuboriladi. `superadmin.html:375-377` uni brauzerda solishtiradi.

### R-S3. Xodim parollari ochiq matnda (K)
- `auth.js:362` `rawPwd` Firestore'ga yoziladi va `admin.html:479-480` da ko'rsatiladi.

### R-S4. Imzosiz sessiyalar (K)
- `uc_session` (`auth.js:251`) va `uc_sa_session = 'true'` (`superadmin.html:346`) — brauzer konsolidan yozilsa admin/super-admin paneli ochiladi. Hamma tekshiruv mijoz tomonda.

### R-S5. XSS (innerHTML) (Y)
`innerHTML` ishlatilishi: `app.js` 7, `table.js` 8, `typeB.js` 5, `report.js` 3, `admin.html` 11, `index.html` 3, `superadmin.html` 2. Ko'pchilik joyda `escHtml` ishlatilgan ✅, lekin:
1. **`app.js:96` `showToast(msg)`** — `msg` escape'siz `innerHTML`. `typeB.js:352-355` unga foydalanuvchi matnini uzatadi: `result.detail` = B komponent **nomi** (`bad_halfwidth`) yoki formuladagi noma'lum token (`bad_formula`). Komponent nomi `<img src=x onerror=…>` bo'lsa va yarim kenglik noto'g'ri formula bo'lsa — skript ishlaydi. Komponent nomi `localStorage` da saqlanadi (stored self-XSS); kelajakda JSON import/ulashish qo'shilsa — to'liq XSS.
2. **`index.html:877-895`** — `org.fullName`, `org.login` escape'siz (o'sha faylda `esc` 906-qatorda bor, lekin ishlatilmagan).
3. `escHtml` (`app.js:115`, `table.js:518`, `typeB.js:377`, `report.js:548`) **4 marta nusxalangan** va `'` ni escape qilmaydi. `admin.html` va `superadmin.html` da `onclick="fn('${esc(x)}')"` — JS-string kontekstida HTML-escape yetarli emas (hozircha qiymatlar tizim generatsiya qiladi, lekin naqsh xavfli).
4. `report.js:57` `w.value` va `typeB.js:146` `comp.id` escape'siz (hozir ichki qiymat).
5. `superadmin.html` / `admin.html` / `index.html` da inline `onclick` lar — qat'iy CSP qo'yishga to'sqinlik qiladi.

### R-14. Ta'minot zanjiri (O)
- Firebase SDK `gstatic.com` dan SRI xeshisiz; Google Fonts. CSP yo'q. CLAUDE.md qoidasi: tashqi kutubxonalar `vendor/` da, versiya va litsenziya bilan.

### R-15. Biznes mantiq mijoz tomonda (O)
- Trial (`uc_trial_count`) `localStorage` ni tozalash bilan tiklanadi. `upgradePlan` (`auth.js:392`) to'lovsiz tarifni o'zgartiradi. Click/Payme merchant ID lari to'ldirilmagan (`auth.js:403-409`).

### R-16. Ishlash (P)
- MC asosiy oqimda, M=10⁶ da bir necha soniya UI qotadi. Har bir `appState.set` butun holatni `JSON.stringify` qiladi va bir nechta komponent to'liq qayta chiziladi.
