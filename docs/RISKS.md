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
| R-19 | Regressiya: WTLS/GLS/polinom va "U — diapazon" unverified; loyiha qarorlari egasi tasdig'ini kutadi | Y | P08 → egasi |
| R-20 | Top-down: barcha loyiha qarorlarini egasi tasdiqladi (2026-11-17, 2026-11-18); usta jonli saytda ko'rib chiqildi; ochiq — faqat ISO 21748 manbasi (unverified qism) | O | P09 (ochiq: ISO 21748 manbasi — egasi) |
| R-21 | Maxsus rejimlar: mikrobiologiya (ISO 19036) va tibbiy laboratoriya (ISO/TS 20914) — BETA, unverified; robust ANOVA — qayta tiklangan algoritm; sifatli testlarda interval usuli — egasi qaror qildi (2026-11-18): Wilson standart, Clopper–Pearson sozlama | Y | P10 → egasi (BETA manbalari) |
| R-01 | Etalon Excel fayllar repoda yo'q; testlar faqat yaxlitlangan satrni tekshiradi | K | P01 |
| R-02 | Sonli hosila qadami h; nochiziqli modelda c=0 → u_c=0 | Y | P03 |
| R-03 | t-kvantil: ν `floor` qilinadi, ν=5000 da sakrash, `erf` approksimatsiyasi | O | P03 |
| R-04 | Yaxlitlash dvigatel ichida; manfiy sonlarda assimetriya; ROUNDUP 3 raqam ko'rsatadi | Y | P03/P05 |
| R-05 | Chop etilgan hisobotda ogohlantirishlar (U=0, U<CMC) yo'q | K | P05a (yopildi) |
| R-06 | Monte-Karlo: xorshift32, qat'iy seed, adaptiv M yo'q, korrelyatsiya yo'q | Y | P06 (yopildi) |
| R-07 | Muvofiqlik `|y|` ni xato deb faraz qiladi | Y | P05a, P05b (yopildi) |
| R-08 | Manfiy dispersiya jimgina 0 ga kesiladi | O | P03 |
| R-09 | `localStorage` versiyasiz, migratsiyasiz; saqlangan natijalar dvigatel versiyasiz | Y | P04 |
| R-10 | B tur u_B UI'da dvigateldan mustaqil qayta hisoblanadi | O | P03 |
| R-11 | Preset va test ma'lumotlari ikki joyda | O | P01 |
| R-12 | Parser: `:` → bo'lish, `e` konstanta, birliklar yo'q | O | P03 |
| R-13 | i18n'dan tashqari qattiq matnlar; admin sahifalari bir tilli | O | P05a (yopildi) |
| R-14 | CDN skriptlar SRI'siz, CSP yo'q | O | P02 |
| R-15 | Trial limiti va to'lov holati faqat mijoz tomonda | O | P02 |
| R-16 | MC asosiy oqimda — M=10⁶ da UI qotadi | P | P06 (yopildi — MC qismi) |
| R-17 | Me'yoriy hujjatlarning yarmi `docs/references/` da yo'q | Y | P01 |
| R-18 | Bitta asbob korrelyatsiyasi: butun sertifikat U si r = 1 bilan — ayirma modellarida U kam baholanadi | Y | P04b (yopildi) |
| R-23 | Monte-Karlo 2.0: egasi qarorlari bajarildi; ko'p o'lchovli t — **yopildi (P07, 2.7.0)**; qoldiq — Firefox / Safari da bit darajasidagi takrorlanuvchanlik (P13), log-normal unverified | O | P06, P07 → P13 |
| R-24 | Ko'p o'zgaruvchili modellar (P07): qilinmagan qismlar (oshkormas model, eng kichik qamrov sohasi, `atan2`) va egasi tasdig'ini kutayotgan loyiha qarorlari | O | P07 → egasi qarori |
| R-25 | Laboratoriya reestri (P11): tekshirilmagan manbalar (ISO/IEC 17025 §6.4–6.5, §7.7.1; NIST e-Handbook; Westgard) va egasi tasdig'ini kutayotgan loyiha qarorlari | O | P11 → egasi qarori |
| R-22 | Hisobot shakllari, qaror qoidasi, import/eksport: ochiq qarorlar va tekshirilmagan qism (ISO/IEC 17025 rekvizitlari, GOST ekvivalentligi) | O | P05b |

### P06 natijasi (2026-11-18, branch `feat/p06-montecarlo`, ENGINE_VERSION 2.6.0)

| ID | Holat | Nima qilindi | Qoldiq xavf |
|---|---|---|---|
| R-06 | **yopildi** | Generator — kengaytirilgan Wichmann–Hill (JCGM 101 C.3.3; aniqlik isboti va testlar); urug' natijada, hisobotda va UI da (o'zgartiriladi); taqsimotlar JCGM 101 §6.4 bo'yicha (trapetsiya, egri trapetsiya, eksponensial, log-normal qo'shildi); adaptiv M (§7.9.4); korrelyatsiya (ko'p o'lchovli Gauss; normal bo'lmaganda natija berilmaydi); A tur usul 3 — t₍n−1₎; §9.2–9.5 misollari verified | R-23 |
| R-16 | **yopildi (MC)** | Web Worker + progress + bekor qilish; worker'siz bo'laklab. Chromium: M = 10⁶ — 1,0 s, asosiy oqimda eng uzun to'xtash 12 ms | `appState.set` dagi to'liq `JSON.stringify` va qayta chizish — o'zgarmagan (past ustuvorlik) |
| R-05 | o'zgarmadi | MC topilmalari (M2–M4) ham bosma hisobotda; LPU tasdiqlanmasa MCM intervali natija sifatida | — |

#### R-23. Monte-Karlo 2.0: egasi qarorlari (2026-11-18) va qoldiq xavf (O)

Egasi qarorlari (savollar va javoblar — `tests/cases/DISCREPANCIES.md` Q-3, Q-5…Q-8):

| # | Masala | Qaror | Holat |
|---|---|---|---|
| 1 | 10-test, n_dig = 2 (Q-3) | (b): tolerans = δ + 2·s_ref; qo'llanma qiymati o'zgarmaydi; test majburiy | bajarildi (2,9·10⁻⁴ / 2,3·10⁻⁴ — D-04) |
| 2 | ν ≤ 2 da mezon (Q-5) | avtomatik faqat interval uchlari; hisobotda "u(y) aniqlanmagan (ν ≤ 2), faqat qamrov intervali" | bajarildi |
| 3 | Normal bo'lmagan korrelyatsiya (Q-6) | natija berilmaydi; topilmada "LPU natijasi amal qiladi"; ko'p o'lchovli t — P07 | **yopildi (P07, 2.7.0):** juftlangan A tur kuzatuvlari — t_ν(x̄, S/n), ν = n − N (JCGM 102:2011 §5.3.2); n ≤ N → `mc_t_dof`; boshqa normal bo'lmagan korrelyatsiyada avvalgidek natija berilmaydi |
| 4 | A tur usul 3 (Q-7) | t₍n−1₎ — tasdiqlandi | bajarildi |
| 5 | §8.2 (Q-8) | GUM tekshiruvida δ/5, oddiy MCM da δ; erishilgan tolerans hisobotda; δ ga tushirish — laboratoriya sozlamasi, belgi bilan | bajarildi |

Qarorlarning oqibatlari (egasi bilishi kerak):

- **n_dig = 2 va δ/5 birga ko'p hisobda M chegarasiga (10⁷, ≈ 7–10 s) olib boradi.** Masalan JCGM 101 §9.3 (massa): talab δ/5 = 1·10⁻⁴, M = 10⁷ da erishilgan 2s = 2,7·10⁻⁴ (manba bu misolda n_dig = 1 ishlatgan — 0,63·10⁶ sinov). Gazoanalizator 2-nuqta: talab 1·10⁻⁵, erishilgan 5,8·10⁻⁵. Bunday holatda natija `mc_not_converged` ogohlantirishi va "erishilgan 2s" bilan chiqadi — qarorga muvofiq. Tezlashtirish: n_dig = 1 yoki laboratoriya sozlamasida δ.
- **Juftlangan kuzatuvli hisoblarda MCM ishlamaydi** (zichlik etaloni ham) — P07 da ko'p o'lchovli t qo'shilguncha; LPU natijasi amal qiladi.
- Gauss yaqinlashuvi (`nonNormalCorrelation: 'gaussian'`) panelda sozlama sifatida qoldi (natija shunday belgilanadi) — olib tashlash kerak bo'lsa ayting.

Aniqlik kiritilishi kerak bo'lgan ikki joy:

- **Q-3 dagi arifmetika:** qarorda "δ + 2·s_ref ≈ 3,2·10⁻⁴" deyilgan; δ = 5·10⁻⁵ va s_ref = 1,2·10⁻⁴ / 0,9·10⁻⁴ bilan formula 2,9·10⁻⁴ / 2,3·10⁻⁴ beradi. Testga qattiqroq (formula bo'yicha) qiymatlar yozildi. 3,2·10⁻⁴ kerak bo'lsa — bitta son o'zgaradi.
- **Q-6 dagi havola:** ko'p o'lchovli t-taqsimot JCGM 102:2011 da §5.3.2 (§6.5 — qamrov sohasi). Hujjatlarda §5.3.2 yozildi.

Loyiha qarorlari (o'zgarmagan, e'tiroz bo'lmagan):

- §8.1.3 dagi δ — GUM u_c dan (u_c = 0 bo'lsa δ = 0 → LPU rad etiladi).
- Bitta urug'dan to'rtta holat — MurmurHash3 fmix32.
- Musbat yarim aniqlangan kovariatsiya (r = ±1) qabul qilinadi; manfiy xos qiymatli matritsa — `invalid_covariance`.
- M chegarasi 10⁷ (eng ko'pi 2·10⁷ — xotira 160 MB).

Qoldiq xavf:

- **Firefox / Safari da bit darajasidagi takrorlanuvchanlik tekshirilmagan — P13 da tekshiriladi** (egasi qarori). R(0, 1) ketma-ketligi har qanday muhitda bir xil (faqat IEEE 754 amallari), lekin Gauss / t / arksinus `Math.log`, `sin`, `cos`, `pow` ga tayanadi — oxirgi xonalarda farq bo'lishi mumkin. Node 22 va Chromium 157 (V8) da tekshirilgan. To'liq kafolat uchun bu funksiyalarning o'z (fdlibm) nusxasi kerak bo'ladi.
- **Log-normal** — JCGM 101 da yo'q; momentlar bo'yicha mustaqil tekshiruv (unverified).
- **Eng qisqa interval uchlari** sekin barqarorlashadi (D-18) — adaptiv mezon buni to'liq ushlamaydi.
- Generator sifati: χ², KS, ketma-ket korrelyatsiya — mustaqil tekshiruv; TestU01 BigCrush o'tkazilmagan (manbaning bayoniga tayanilgan, C.3.2.2).
- Shablon muharriri (UI) da β / d maydonlari yo'q — yangi taqsimotlar shablonga JSON orqali kiritiladi (sxema va interpretator qabul qiladi).
- Eski hisoblarning MC natijasi saqlanmagan; takrorlash uchun `rng: 'xorshift32-legacy'` va o'sha M beriladi.

**Yopilganlar (shu PR):** laboratoriya sozlamalari oynasida MC bo'limi (rejim, n_dig, tekshiruv toleransi); shablon sxemasida yangi taqsimot nomlari (`trap` + `beta`, `ctrap` + `d`, `exp`, `lognorm`).

### P05b natijasi (2026-11-18, branch `feat/p05b-reports-io`, ENGINE_VERSION 2.5.0)

| ID | Holat | Nima qilindi | Qoldiq xavf |
|---|---|---|---|
| R-07 | **yopildi (qaror qoidasi)** | `result.decision` (JCGM 106:2012 §7–8, ILAC G8:09/2019 — PDF bilan tekshirilgan misollar): oddiy qabul, himoya zonasi w = r·U, TUR, p_c, bir / ikki tomonlama chegaralar, binar / nobinar bayonot. Qoida yoki chegara yo'q — bayonot yo'q (D1) | R-22 |
| R-04 | o'zgarmadi | Eksportda sonlar yaxlitlanmaydi; "hisobotdagi ko'rinish" alohida matn katagi (`roundResult`) | — |
| R-14 | kengaydi | Ikki yangi vendor kutubxona (SheetJS CE 0.20.3, qrcode-generator 2.0.4) — `vendor/` da, SHA-256 testi bilan; CSP o'zgarmagan | Yangilash qo'lda: yangi versiyada xesh va README yangilanadi; SheetJS CVE lari kuzatiladi |
| R-17 | qisman | ILAC P14, ILAC G8, JCGM 106 havolalari PDF bilan solishtirildi (`below_cmc` → §5.5, verified) | ISO/IEC 17025:2017 repoda yo'q (pullik) |

### P05a natijasi (2026-11-18, branch `feat/p05a-linter`, ENGINE_VERSION 2.4.0)

| ID | Holat | Nima qilindi | Qoldiq xavf |
|---|---|---|---|
| R-05 | **yopildi** | Linter topilmalari (`result.findings`) ekranda va barcha bosma hisobotlarda — bitta nuqta, ko'p nuqtali sertifikat (har bir nuqta ostida), regressiya, top-down, maxsus rejimlar; yashiradigan parametr yo'q, bosma CSS `display: block !important`. `zero_u` va `below_cmc` — error: qabul qilinmaguncha "RASMIY EMAS" suv belgisi; har doim alohida "DIQQAT" belgisi; laboratoriya sozlamasi `criticalMode: 'block'` — hisobot chiqmaydi. ν qoidasi, MC seed va M, BETA / unverified belgisi hisobotda | Ko'p nuqtali **jadvalning o'zida** (qator darajasida) belgi yo'q — belgi hisobot boshida va nuqta bo'limida. CMC jadvali (diapazon bo'yicha) — P11. `below_cmc` manbasi (ILAC P14) repoda yo'q — unverified. Suv belgisi brauzerning "fon grafikasi" sozlamasiga bog'liq emas (matn), lekin real printerda ko'rilmagan |
| R-07 | **yopildi (model turi)** | `settings.modelKind`: `error` / `value` (+ nominal) / `unknown`. Dvigatel \|y\| ni xato deb faraz qilmaydi: ko'rsatilmagan bo'lsa hukm yo'q (`conf.pending`), γ = null, topilma `model_kind_unknown`; natijalar sahifasida tanlov so'raladi. Eski saqlangan hisoblar migratsiyada `unknown`. Har bir hisobotda model turi yoziladi | Qaror qoidasi tanlovi (w = r·U, bir tomonlama chegaralar, muvofiqlik ehtimoli — JCGM 106, ILAC G8) — **P05b**; ikkala hujjat ham repoda yo'q. Shablonlarda `modelKind` faqat `legacy-gas_analyzer` va `legacy-thermometer` da; `decisionRule` li T-shablonlar uchun laboratoriya tanlaydi |
| R-13 | **yopildi** | admin, super-admin, auth sahifalari va qolgan matnlar uz/ru/en (`i18n-admin.js`, 297 kalit); til almashtirgich; `tests/i18n.test.js` barcha HTML/JS da qattiq matnni qidiradi, istisnolar izohli | Istisnolar: shablon diagnostika xabarlari (`src/templates/interpreter.js`, `validator.js` — ~70 ta, inglizcha, muharrirda ko'rinadi); "BETA" / "unverified" belgilari tarjima qilinmagan; `legacy-warning.js` (i18n ishlamaydigan brauzer uchun, uch tilda bitta satr). Ruscha / inglizcha tarjimalarni soha mutaxassisi ko'rib chiqmagan (INN → "TIN (INN)", MFO, QQS → VAT va h.k.) |

**P05a dagi yangi ochiq masalalar (egasi):** linter chegaralari va darajalari — `docs/LINTER_RULES.md` §4 (16 band, loyiha qarorlari). Rol lokal rejimda faqat Firebase sessiyasidan olinadi (kirmagan foydalanuvchi — `guest`); lokal audit — buzilganini aniqlash darajasida (server — P15). Regressiya / top-down / maxsus rejimlarda qabul qilishlar `localStorage` (`uc_findings_accept_v1`) + audit zanjirida; hisobning o'zi hali IndexedDB da emas (R-19…R-21 dagi qayd o'zgarmagan).

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
- **Chora (P06).** **Yopildi (2026-11-18, ENGINE 2.6.0)** — yuqorida "P06 natijasi"; ochiq qarorlar — R-23.

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

### R-09. localStorage: versiya va migratsiya yo'q (Y) — P04 da qisman yopildi
- **P04:** `src/storage/` — IndexedDB, `uc_state_v2` migratsiyasi (asl kalit + `_backup`), har bir hisob `engineVersion` va shablon ID/versiyasi bilan, append-only audit (xesh zanjiri), JSON eksport/import. Qoldi: joriy sessiya hali `uc_state_v2` da; kvota xatosi jimgina; lokal audit — faqat buzilishni aniqlash (server — P15).
- `uc_state_v2` da versiya maydoni yo'q; `_load` sayoz birlashtiradi; v1 → v2 migratsiyasi yo'q (eski ma'lumot yo'qolgan).
- `points[].result` — dvigatel natijasining nusxasi; dvigatel o'zgargach eski nuqtalar eski formulalar bilan hisoblangan holda qoladi va hisobotga chiqadi — qaysi versiyada hisoblangani noma'lum.
- `_save` xatosi (kvota) jimgina yutiladi.
- Preset tanlash/Reset barcha nuqtalarni ogohlantirishsiz o'chiradi; eksport/import yo'q — ma'lumotni zaxiralab bo'lmaydi.
- Audit izi yo'q (kim, qachon, nimani o'zgartirdi) — ISO/IEC 17025 §7.11.3, §7.5.

### R-18. Bitta asbob korrelyatsiyasida U ni kam baholash (Y) — P04b da yopildi
- P04 da sertifikat manbasining butun U si r = 1 bilan korrelyatsiyalangan deb olinardi. Ayirma yoki nisbat modellarida (c_i·c_j < 0) bu kalibrlash hissasini qisqartiradi va nochiziqlilik yoki ekssentriklik bo'lsa U ni kam baholaydi.
- **P04b:** sertifikat manbasi umumiy va nuqtaga xos qismga bo'lindi; korrelyatsiyaga faqat umumiy qism kiradi. Bo'lish noma'lum bo'lsa — `split: "unknown"` (r = 0 va r = 1, katta u_c; loyiha qarori). Ikki marta hisoblash tekshiriladi. Qolgan xavf: laboratoriya qismlarni noto'g'ri bo'lishi mumkin. Shuning uchun bu band APPROVAL_CHECKLIST ga kiritilgan.

### R-19. Regressiya: tekshirilmagan usullar va loyiha qarorlari (Y) — P08
- **Unverified usullar.** WTLS (York et al. 2004), GLS va 2-/3-darajali polinom uchun manba misoli `docs/references/` da yo'q (ISO/TS 28037/28038 pullik). Faqat o'zaro tekshiruvlardan o'tgan (u(x) = 0 → WLS; tarqalish qonuni bilan sonli taqqoslash; diagonal GLS ≡ WLS). Natijada `regression_method_unverified` belgisi chiqadi. **Kerak:** egasi ochiq manba misolini (NPL/NIST/GTC) yoki laboratoriya Excel'ini qo'shadi.
- **"U — diapazon"** — ILAC P14:09/2020 matni bilan solishtirilmagan (`unverified: true`, hisobotda belgi).
- **Loyiha qarorlari (egasi tasdiqlashi kerak, me'yoriy talab emas):**
  1. kovariatsiya asosi: OLS (u(y) noma'lum) — qoldiqlardan (GUM H.3), WLS/WTLS/GLS — kiritilgan noaniqliklardan; χ² yiqilganda dastur avtomatik ravishda aposterior asosga **o'tmaydi**, faqat ogohlantiradi;
  2. teskari bashorat: |b| ≤ u(b) → xato; |b| < 3u(b) → ogohlantirish (GUM H.3.3 dagi "uch baravar" mulohazasi asosida);
  3. m < n_param + 1 har doim xato (aprior asosda ham);
  4. "U — diapazon" `linear`: OLS chizig'i barcha nuqtalarni qoplaydigan qilib yuqoriga suriladi.
- **Qamrab olinmagan:** standart eritmalar orasidagi korrelyatsiya (bitta asosiy eritmadan suyultirish, QUAM E.4.6) — faqat GLS/`covY` orqali qo'lda; x va y orasidagi kovariatsiya UI'da yo'q; teskari bashoratda birinchi tartibli yaqinlashish (Fieller intervali emas).
- Regressiya holati `localStorage` (`uc_regression_v1`) da — audit izisiz; IndexedDB saqlash qatlamiga (`src/storage/`) ko'chirish — P05.

### R-20. Top-down: tekshirilmagan qism (ISO 21748) (O) — P09; barcha qarorlarni egasi tasdiqladi (2026-11-17, 2026-11-18)
- **Unverified.** ISO 21748 ga xos hisoblar — laboratoriya s_r ni χ² testi bilan tekshirish, s_R ni laboratoriya s_r bilan moslash (s_R′² = s_R² − s_r² + s_lab²), u(δ̂) = √((s_R² − (1 − 1/n)·s_r²)/p) — standart matni bilan solishtirilmagan (pullik, `docs/references/` da yo'q). Natijada `topdown_unverified` belgisi, hisobotda "unverified" yorlig'i. **Kerak:** egasi ochiq manba misoli (NIST, Eurolab TR) yoki laboratoriya Excel'ini qo'shadi. QUAM §7.6 / A6 va Nordtest §7 bilan tasdiqlangan qism (u_c = s_R + qamralmagan omillar) — verified.
- **Qarorlar — egasi tasdiqladi (2026-11-17):**
  1. **X12 — tasdiqlandi, o'zgarish bilan.** Empirik kattalikka bias / recovery / u(δ̂) kiritilganda "tayanch qiymat qaysi usul bilan olingan" savoli **majburiy** (`referenceMethod`; ustada 1-qadamdagi tanlov):
     - javob berilmagan — hissa u_c ga **qo'shiladi** va X12 ogohlantirishi chiqadi (konservativ);
     - "boshqa usul / ta'rif" (`other`) — hissa chiqarib tashlanadi (QUAM §7.9.2), hisobotda eslatma (`x12_bias_excluded`) va qator "hisobga kirmaydi" deb belgilanadi;
     - "shu usul" (`same`; eski `referenceByMethod: true`) — hissa qo'shiladi, ogohlantirishsiz (QUAM §7.9.3).
     Testlar: `tests/engine/topdown.test.js` (bias, recovery, u(δ̂) — uch holat), `tests/ui/topdown.test.js`, `tests/ui/topdown-app.test.js`.
  2. **X11 — tasdiqlandi.** Ikki marta hisoblangan hissa hisobda qoladi, dastur faqat ogohlantiradi. Ogohlantirish chop etilgan hisobotda ham chiqadi; uni yashiradigan parametr yo'q (bosma CSS da `display: block !important`; test `tests/ui/topdown.test.js`).
  3. **k = 2 — tasdiqlandi, qo'shimcha bilan.** ν_eff baribir hisoblanadi (Welch–Satterthwaite, JCGM 100:2008 G.4.1: ν(R_w) = n − 1, dublikatlar — juftliklar soni; ν(bias) — CRM / PT soni bo'yicha) va hisobotda ko'rsatiladi. ν_eff < 30 bo'lsa `topdown_nu_low` ogohlantirishi chiqadi va t_P(⌊ν_eff⌋) taklif qilinadi; **k avtomatik o'zgarmaydi**. Hisobotda "k = 2, P ≈ 95 %" yoziladi (Nordtest TR 537 §3.2).
  4. **`per_pair` standart — tasdiqlandi** (nisbiy dublikat s; `pooled_over_mean` — tanlov bo'yicha).
  5. **Tuzatilmagan recovery — tasdiqlandi:** ahamiyatli bo'lsa hissa u(R_m) qoladi va ogohlantirish chiqadi (QUAM §7.16.2); dastur bias'ni u_c ga "kengaytirish" sifatida qo'shmaydi.
- **ν(bias) = N − 1 — egasi tasdiqladi (2026-11-18), konservativ variant sifatida.** N — PT raundlari / CRM lar / recovery tajribalari soni (kamida 1); bitta CRM uchun — o'lchashlar soni n − 1. Bu faqat ko'rsatiladigan ν_eff va taklif qilinadigan t ga ta'sir qiladi, u_c va U ga emas. s_R, u(C_ref) va qo'shimcha hissalar uchun ν = ∞ (ν berilmagan B tur — GUM G.4.2). Taklif uchun P = 95,45 % (loyihaning standart P si; ν → ∞ da t = 2,00).
- **Manba nuanslari:** TR 537 Appendix 5 da 46 juftlik bosilgan, matnda n = 47 (D-12); QUAM A4 t_crit ≅ 2,021 (ν = 40 jadval qiymati; aniq 2,0195 — D-13); TR 537 §6.1 u(C_ref) = 2,16 % (0,25/11,5 = 2,17 % — D-14). Manba U ni yuqoriga yaxlitlaydi (6,40 → 7 %); dastur egasi qoidasi bo'yicha 2 qiymatli raqam beradi (6,4 %).
- **Qamrab olinmagan:** diapazonni avtomatik bo'lish (TR 537 §4.3: past — mutlaq, yuqori — nisbiy); PT natijalaridan to'g'ridan-to'g'ri s_R; bir nechta bias manbasini birga ishlatish (TR 537 PCB misoli: maksimal u(bias)); ISO 11352 (pullik); QC kartalaridan avtomatik s_Rw (P11).
- **Usta jonli saytda brauzerda ko'rib chiqildi — egasi (2026-11-18, commit `41a041a`):** konsolda xato yo'q; 1-qadam to'g'ri chiqadi; Nordtest NH₄-N misoli saytda u_c = 3,198 %, U = 6,40 % (k = 2, ν_eff ≈ 9,5 → `topdown_nu_low`) — test misoli (`nordtest-tr537-nh4n`) bilan mos.
- **Ochiq qolgan yagona masala:** ISO 21748 manbasi (yuqoridagi "Unverified" band) — ochiq manba misoli yoki laboratoriya Excel'i qo'shilguncha laboratoriya s_r tekshiruvi, s_R ni moslash va u(δ̂) `unverified`.
- Top-down holati `localStorage` (`uc_topdown_v1`) da — audit izisiz; IndexedDB saqlash qatlamiga (`src/storage/`) ko'chirish — P05. Shaxsiy ma'lumot yozilmaydi.

### R-21. Maxsus rejimlar: BETA modullar va qarorlar (Y) — P10
- **BETA / unverified (manba repoda yo'q):**
  - **mikrobiologiya** (`src/engine/micro/`) — ISO 19036 pullik. Formulalar (`u_tech` dublikatlarning log₁₀ farqlaridan, `u_Poisson = 0,4343/√ΣC`, kvadratlar yig'indisi, U = 2u, interval [10^(y−U); 10^(y+U)]) `docs/prompts` dagi tavsif bo'yicha; faqat analitik testlar. Past sanoq chegarasi (ΣC < 10) va "kam juftlik" (< 10) — loyiha parametrlari;
  - **tibbiy laboratoriya** (`src/engine/medical/`) — ISO/TS 20914 pullik. `u = √(u_cal² + u_Rw² [+ u_bias²])`; o'lchangan natijaga eng yaqin IQC darajasining nisbiy noaniqligi qo'llanishi va "kam IQC" (n < 20) — loyiha qoidalari.
  Ikkala modul natijasida har doim `*_unverified` ogohlantirishi (warning darajasida, bosma hisobotda ham) va "BETA" belgisi chiqadi; shablonlari (`SP-03`, `SP-04`) APPROVED holatiga o'tkazib bo'lmaydi. **Kerak:** egasi ochiq manba misoli yoki laboratoriya Excel'ini qo'shadi.
- **Robust ANOVA — qayta tiklangan algoritm.** RANOVA dasturi kodi (UfS [53]) repoda yo'q. Dvigatel Huber vinsorlashli (c = 1,5) iterativ ichma-ich ANOVA ni UfS A1 va A2 chiqishlari bo'yicha tikladi: natijalar manba bilan 4 qiymatli raqamgacha mos (masalan s_samp 319,06 vs 319,05; s_anal 167,947 vs 167,943), oxirgi xonalardagi farq — asl dasturning yaqinlashish mezoni (D-16). Ob'ektlararo dispersiyada τ² = Σ(w − μ)²/(n·β) va yakunda n/(n − 1) ko'paytuvchisi — shu ikki misolga moslab topilgan; boshqa ma'lumotlarda asl dastur bilan farq bo'lishi ehtimoli istisno qilinmaydi. Natijada `sampling_robust_reconstructed` eslatmasi. Klassik ANOVA — yopiq formulalar, manba bilan to'liq aniqlikda mos.
- **Sifatli testlarda ishonch intervali — egasi qaror qildi (2026-11-18): (a) + sozlama.** Hisobotga standart bo'yicha faqat **Wilson score** intervali chiqadi (EURACHEM/CITAC AQA:2021 §4.4, Eq. 8–9; verified). **Clopper–Pearson** — laboratoriya sozlamasi ("Ishonch intervali usuli: Wilson / Clopper–Pearson", `settings.ciMethod`); tanlansa, hisobotda faqat shu interval chiqadi. Hisobotda qo'llanilgan usul nomi va P (95 %) yoziladi; ekrandagi batafsil ko'rinishda ikkinchi usul solishtirish uchun ko'rsatiladi, bosma hisobotda — faqat tanlangani. Izoh: AQA bir nechta modelni tan oladi va Wilson'ni soddaligi uchun tanlagan; Clopper–Pearson — loyiha qo'shimchasi (AQA:2021 da yo'q; tanlanganda natijada `qualitative_cp_project_addition` eslatmasi). Clopper–Pearson testi: mustaqil ochiq dastur qiymatlari bilan — SciPy 1.18.1 — `scipy.stats.binomtest(x, n).proportion_ci(confidence_level=P, method="exact")` (7 nuqta, 10⁻¹⁰ gacha mos). Qiymatlar P10 sessiyasida hisoblab olingan, repoda hujjat sifatida yo'q — **egasi R `binom.test` yoki NIST bilan qayta tekshirishi mumkin**; manba yetarli emas deb topilsa, holat `unverified` ga qaytariladi.
- **Qilinmagan:** LOD₉₅ (probit / logistik model — talabnomada ixtiyoriy; AQA 7.6.2 da raqamli misol to'liq emas); muvozanatsiz dizaynlar va 3 darajali dizayn (UfS Appendix D); namuna olish bias'i; ISO 29201; mikrobiologiyada MPN.
- **Manba nuanslari:** AQA Table E3.1 metadon PP = 0,988 (formula bo'yicha 0,98854 → 0,989; D-15); AQA Table E6.2 SP quyi chegarasi 91,6 % (formula bo'yicha 91,55 %; D-17).
- **Brauzerda qo'lda tekshirilmagan.** "Maxsus rejimlar" oynasi jsdom'da boshidan oxirigacha sinalgan (`tests/ui/special.test.js`), lekin ko'rinishni (CSS, tor ekran, chop etish) egasi ko'rib chiqishi kerak.
- Holat `localStorage` (`uc_special_v1`) da — audit izisiz; IndexedDB ga ko'chirish — P05. Shaxsiy ma'lumot yozilmaydi.

### R-22. Hisobot shakllari, qaror qoidasi, import/eksport (O) — P05b; egasi qarorlari 2026-11-18
- **GOST 34100.3-2017** — hozircha faqat JCGM 100:2008 havolasi (rus tilidagi hisobotda ham). Egasi IDT (aynan ekvivalentlik) tasdig'ini bergach `src/report/normative.js::EQUIVALENTS` ga qo'shiladi. **Ochiq (egasi).**
- **Build identifikatori** — hozircha (a): dvigatel xeshi (`tests/security/engine.sha256.json`, birinchi 12 belgi). **(b) deploy'da `build.json` + versiyalangan modul URL'lari — P13 da.** Sabab (egasi kuzatuvi, jonli sayt): deploydan keyin ~10 daqiqa brauzer keshida eski va yangi ES modullar aralashib, konsolda `export` xatosi chiqdi. P13 gacha: deploydan keyin sahifani keshsiz yangilash (Ctrl+F5).
- **Rekvizitlar ro'yxati** (ISO/IEC 17025:2017 §7.8.2.1 / §7.8.3.1 / §7.8.4.1; `src/report/requisites.js::REQUIRED`) — egasi standart matni bilan solishtiradi; **ungacha unverified** (hisobotda ham shunday yoziladi). Ogohlantirish chop etishni bloklamaydi.
- **Etalon misollarga qaror qoidasi qo'shilmaydi** — tasdiqlandi. MPE berilgan etalon nuqtalarda `decision_rule_missing` (warning) — kutilgan holat.
- **Qaror qoidasi** — tasdiqlandi: TUR = T / (2U); p_c normal taqsimot bilan (ν_eff < 30 da eslatma); faqat shu o'lchov uchun (specific) xavf, umumiy xavf (JCGM 106 §9) hisoblanmaydi. **O'zgartirildi:** laboratoriya sozlamasidagi standart qoida (`LAB_DEFAULTS.decisionRule`) va shablondagi `decisionRule` tanlov oynasiga **oldindan qo'yiladi** (`src/engine/decision.js::decisionPreset`; shablon ustun), lekin `settings.decisionRule` ga faqat foydalanuvchi "Tasdiqlash" ni bosgach yoziladi — **tasdiqlanmasa bayonot chiqmaydi** (ekranda ham, bosmada ham). Bir tomonlama shablon turida qoida laboratoriya sozlamasidan, chegara (son bo'lsa) shablondan olinadi.
- **Rekvizitlarni saqlash** — tasdiqlandi: laboratoriya nomi, manzili, akkreditatsiya raqami (va logotip) — `localStorage`; shaxs ismlari (buyurtmachi, tasdiqlovchi) va hujjatga xos maydonlar — faqat `sessionStorage`. Firebase'ga hech narsa yozilmaydi. Hisob xeshi rekvizitlarni qamramaydi (xesh hisobni tasdiqlaydi, hujjat sarlavhasini emas).
- **Import / eksport tanlovlari** — tasdiqlandi: CSV dialekti interfeys tiliga ko'ra (uz / ru — `;` va o'nlik vergul; en — `,` va nuqta); `.xlsx` da formula katagidan saqlangan qiymat; ajratgich evristikasi + qo'lda tanlash; chegaralar `LIMITS` da; `.xls` / `.xlsm` / `.ods` rad etiladi; sonsiz birinchi qator — sarlavha. Vendor ES modullari `.js` kengaytmasida — tasdiqlandi.
- **Linter chegaralari** — `docs/LINTER_RULES.md` §4: 1–2, 4–17, 19–20 tasdiqlandi; 3 (X7: ν_eff < 10 warning, 10 ≤ ν_eff < 30 info) va 18 (D1: TUR < 1 warning, 1 ≤ TUR < 4 info — 4:1 amaliyot, unverified) o'zgartirildi (ENGINE 2.5.1).
- **Qoldiq xavf:** ZIP-bomba himoyasi ZIP katalogida e'lon qilingan hajmga tayanadi (yolg'on sarlavhali fayl bilan sinalmagan); SheetJS CE yangilanishi qo'lda; GUM eksportida natija joriy kirishlardan qayta hisoblanadi; import voqeasi audit zanjiriga yozilmaydi.
- **Qilinmagan:** DCC (Digital Calibration Certificate) XML; PDF/A; elektron imzo; `/verify` sahifasi (P11); B tur manbalarini fayldan import; regressiya / top-down / maxsus rejim `.xlsx` varag'ida tarjima qilingan maydon nomlari.

### R-24. Ko'p o'zgaruvchili modellar: qilinmagan qismlar va ochiq qarorlar (O) — P07 (2026-11-18, ENGINE 2.7.0)

Bajarilgan: vektor LPU (JCGM 102:2011 §6.2), qamrov sohasi (§6.5, §7.7.2, §7.7.3), ko'p o'lchovli MCM (§7, §8), ko'p o'lchovli t (§5.3.2). Verified: Table 1, 2, 3, 4, 5, 6–7 (GUF), 11; JCGM 100 H.2.

**Qilinmagan (majburiy test yo'q, funksiya yo'q):**

| # | Nima | Sabab / oqibat |
|---|---|---|
| 1 | Oshkormas model h(Y, X) = 0 (§6.3) | vaqt yetmadi. §6.3.2 misoli va §9.5 (o'lchov bloklari massasi) qamrab olinmagan. Bunday model kiritib bo'lmaydi — foydalanuvchi Y ni oshkor ifodalashi kerak |
| 2 | Eng kichik qamrov sohasi (§7.7.4) | faqat ellipsoid va to'g'ri burchakli soha. Taqsimot Gaussdan uzoq bo'lsa (§9.2.4 kabi) ellipsoid eng kichik soha emas — hisobotda soha turi aniq yoziladi |
| 3 | Parserda `atan2` yo'q | §9.3 (fazaga o'tkazish) faqat GUF qatorlari bilan tekshirilgan (`atan(X2/X1)`); MCM qatorlari (Table 6–7) — test yo'q, chunki `atan` chorakni yo'qotadi. `atan2` qo'shish — alohida kichik ish (parser + hosila) |
| 4 | ν ≤ 2 bo'lgan t-kirishda vektor MCM | faqat marginal intervallar; U_y va soha berilmaydi (Q-5 qoidasining vektor ko'rinishi — loyiha qarori) |
| 5 | Ko'p chiqish + ko'p nuqta (kalibrlash nuqtalari) birga | UI da qo'llab-quvvatlanmaydi; shablon muharririda `outputs` maydoni yo'q (JSON orqali kiritiladi) |
| 6 | Brauzerda qo'lda ko'rilmagan | faqat jsdom testlari (`tests/ui/multivariate.test.js`) |

**P07 da topilgan, P06 ga ham tegishli (P13 ga):** Monte-Karlo natijasi **JS dvigateli versiyalari orasida bit darajasida bir xil emas**. O'lchov (2026-11-18): Node 22 va Chromium 157 da `Math.sin`, `cos`, `log`, `exp`, `atan`, `tan` ayrim argumentlarda oxirgi ikkilik xonada farq qiladi (`sqrt` va arifmetika — bir xil). Oqibat: R(0, 1) ketma-ketligi bir xil (faqat arifmetika), lekin Gauss kirishli (Box–Muller: ln, sin, cos) yoki trigonometrik modelli MCM natijalari ≈ 10⁻¹⁶ nisbiy (kvantillarda ≈ 10⁻¹²) farq qiladi — `jcgm101-9-2-2-mcm`, `jcgm102-9-2-2-mcm`, `jcgm102-9-4-mcm` da kuzatildi; `excel-gas-p2` (t va to'g'ri burchakli kirishlar) — aynan bir xil. Metrologik ahamiyati yo'q (yaxlitlangan natija o'zgarmaydi), lekin "bit darajasida takrorlanadi" da'vosi faqat **bir xil dvigatel versiyasi** ichida to'g'ri; `uc-calc/1` da MCM natijasini boshqa brauzerda qayta hisoblash "aynan bir xil emas" deb ko'rsatishi mumkin. **Variantlar (egasi qarori, P13):** (a) hozirgidek qoldirish, da'voni "bir xil muhitda" deb aniqlashtirish, qayta hisobda MCM uchun nisbiy tolerans (masalan 10⁻⁹); (b) ln / sin / cos ni dvigatelda o'z kodi bilan (faqat arifmetika, to'g'ri yaxlitlangan emas, lekin deterministik) — MCM raqamlari yana o'zgaradi, ENGINE major / minor. Vektor MCM modulli worker'da `script-src 'self'` ostida ishlashi Chromium 157 da tekshirildi (M = 2·10⁵, m = 3: ≈ 0,5 s, konsolda xato yo'q).

**Egasi tasdig'ini kutayotgan loyiha qarorlari:**

1. **MV1 chegarasi** |r| > 0,5 → info (`docs/LINTER_RULES.md` §4 #24). JCGM 102 da son yo'q.
2. **Korrelyatsiya koeffitsiyentini ko'rsatish:** 3 o'nlik xona; |r| > 0,99 da qo'shimcha "1 − |r|" (JCGM 102 Table 11 dagi kabi). ILAC P14 r uchun qoida bermaydi.
3. **Adaptiv mezon:** U_y bo'yicha barqarorlik λ_max orqali (§7.8.2 bo'yicha), har bir kovariatsiya elementi bo'yicha emas.
4. **Singular chegarasi** λ_min / λ_max < 10⁻⁹.
5. **Chiqishga xos sozlamalar** (MPE, qaror qoidasi) faqat `outputs[j].settings` orqali; umumiy `settings` dagi MPE vektor hisobda e'tiborga olinmaydi.
6. **Ko'p o'lchovli t `nonNormalCorrelation: 'gaussian'` sozlamasidan ustun** (2.7.0 da MCM natijasi o'zgargan holat — CHANGELOG).

### R-25. Laboratoriya reestri: tekshirilmagan qism va ochiq qarorlar (O) — P11 (2026-11-18, ENGINE 2.8.0)

Bajarilgan: etalonlar reestri, drift taklifi, CMC jadvali, Shewhart kartalari, Westgard qoidalari, kalibrlash intervali tavsiyasi, linter L1 / L2, hisobot bo'limlari, import / eksport, sxema migratsiyasi 2 → 3. Verified: ILAC P14:09/2020 §4.1–4.3, §5.5; ILAC P10:07/2020 §2.

**Tekshirilmagan (manba repoda yo'q yoki sessiyada ochilmadi):**

| # | Nima | Holat |
|---|---|---|
| 1 | ISO/IEC 17025:2017 §6.4, §6.5, §7.7.1 | pullik, repoda yo'q — faqat izohlarda "(unverified)"; linter `ref` da ko'rsatilmaydi |
| 2 | Shewhart konstantalari (NIST e-Handbook §6.3.2.1) | **sayt P11 sessiyasida tarmoq siyosati sababli ochilmadi.** Qiymatlar ta'rifdan (ko'lam momentlari) mustaqil sonli integrallash bilan ±0,001 ichida tekshirilgan. NIST misoli (§6.3.2.2) testi — `todo`. Egasi sahifani `docs/references/` ga qo'shsa yoki tarmoqqa ruxsat bersa — "verified" ga o'tkaziladi |
| 3 | Westgard qoidalari | nashr (Clin. Chem. 27 (1981) 493) repoda yo'q; qoidalar umumiy ma'lum ta'rif bo'yicha, jadvalli testlar bilan |
| 4 | Kalibrlash intervali | ILAC G24 / OIML D 10:2022 repoda bor, lekin §6.3 aniq formula bermaydi — hisob loyihaniki |

**Egasi tasdig'ini kutayotgan loyiha qarorlari:**

1. **Etalon muddati o'lchash sanasiga nisbatan tekshiriladi** (`settings.measurementDate`), bugungi sanaga emas: etalon ishlatilgan kuni amalda bo'lishi kerak; eski hisobni keyin ochganda topilma o'zgarmaydi. Muddatning oxirgi kuni — amalda. Sana ko'rsatilmasa — warning (tekshirilmadi). "Reestrdan tanlash" sanani bugungi kun bilan to'ldiradi (o'zgartirish mumkin).
2. **Linter darajalari** (`docs/LINTER_RULES.md` §4 #25–#28): muddati o'tgan → error; ≤ 30 kun → info; akkreditatsiya belgisi yo'q → warning (CIPM MRA NMI yo'li belgisiz ham dalil); sohadan tashqari → warning.
3. **Interpolyatsiya:** tuzatma — chiziqli; **U — ikki qo'shni nuqtadan standart noaniqligi kattasi** (k va ν o'sha nuqtaniki); ekstrapolyatsiya yo'q. Muqobil: U ni ham chiziqli interpolyatsiya qilish.
4. **Drift standarti:** a = |ΔC| (oxirgi ikki kalibrlash), to'g'ri burchakli, √3. `trend` usulida a = |og'malik| × (oxirgi kalibrlashdan o'lchash sanasigacha).
5. **Kalibrlash intervali:** chegara sharti |C(t)| + U_oxirgi = L (standart, konservativ) yoki |C(t)| = L; chiziqli OLS; kamida 3 ta kalibrlash.
6. **CMC:** diapazon chegaralari kiradi; tutashgan ikki diapazon nuqtasida CMC si kattasi olinadi; jadval qatori qo'lda kiritilgan CMC dan ustun; sohadan tashqarida CMC bilan solishtirilmaydi (below_cmc chiqmaydi, faqat outside_scope); nisbiy CMC foizda.
7. **Westgard:** qat'iy tengsizlik (aynan 2s / 3s — buzilish emas); R₄s — seriya belgisi hamma nuqtada bo'lsa seriya ichida, aks holda ketma-ket juftlikda; 10ₓ da aynan o'rtachadagi nuqta ketma-ketlikni uzadi; belgilangan (target) o'rtacha va s bo'lsa chegaralar undan, aks holda kartaning o'z ma'lumotidan; X̄–R da target s — bitta kuzatuvniki (o'rtacha uchun s/√n).
8. **s_Rw kartadan** — barcha natijalarning oddiy tajriba standart og'ishi (n − 1), MR̄/d₂ emas; top-down ga `control_series` sifatida uzatiladi (ν = n − 1).
9. **Rol:** etalonlar va CMC — xodim (`employee`) tahrirlay olmaydi; QC kartasiga xodim natija qo'shadi (kartani o'chirish tugmasi xodim uchun o'chirilgan; saqlash qatlami QC yozuvlarini rol bo'yicha cheklamaydi); tizimga kirmagan foydalanuvchi (`guest`, sinov / yakka lokal rejim) tahrirlay oladi. Lokal rejimda bu himoya ogohlantirish darajasida (P15 da server).
10. **Reestr bog'lanishi uziladi**, agar foydalanuvchi reestrdan tortilgan U, k, ν yoki taqsimotni qo'lda o'zgartirsa (manba "qo'lda kiritilgan" bo'lib qoladi, xabar chiqadi).

**Qilinmagan:** CMC ning matritsa va grafik ko'rinishlari (ILAC P14 §4.2 d, e); interpolyatsiya uchun P08 regressiyasi (faqat chiziqli); reestrni `.xlsx` ga eksport (CSV va JSON bor); import oynasida ustunlarni qo'lda moslash (faqat sarlavha bo'yicha); CMC jadvalini `.xlsx` dan import (faqat `uc-registry/1` JSON orqali); bir nechta nazorat darajasi bitta kartada; vektor (ko'p chiqishli) hisobda CMC jadvali chiqishga xos emas; bosma hisobot real brauzerda qo'lda ko'rilmagan (ekran — Chromium da ko'rildi).

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
- **MC qismi yopildi (P06):** hisob Web Worker'da (`src/ui/mc/`), progress va bekor qilish bilan; worker'siz — bo'laklab.
- (P00) MC asosiy oqimda, M=10⁶ da bir necha soniya UI qotadi. Har bir `appState.set` butun holatni `JSON.stringify` qiladi va bir nechta komponent to'liq qayta chiziladi.
