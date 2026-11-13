# UncertaintyCalc — joriy arxitektura (P00 audit)

> Holat: `d60d2c3` commit (2026-11-11). Bu hujjat **mavjud** kodni tasvirlaydi, maqsadli arxitektura emas.
> Maqsadli arxitektura va bosqichlar: [PLAN.md](PLAN.md). Xavflar: [RISKS.md](RISKS.md).
> Qator raqamlari shu commit bo'yicha; kod o'zgarsa yangilansin.

> **Yangilanish — P02 (2026-11-13, `p02-security`).** Quyidagi bo'limlar P00 holatini tasvirlaydi; xavfsizlik qatlami o'zgardi:
>
> | Fayl | Vazifasi (P02) |
> |---|---|
> | `firestore.rules`, `firebase.json` | Firestore qoidalari (default deny, a'zolik, super-admin claim); Emulator sozlamasi |
> | `vendor/firebase/9.23.0/` | Firebase compat SDK (app, auth, firestore) + LICENSE + SHA-384; CDN ishlatilmaydi |
> | `src/ui/escape.js` | yagona `escHtml` (`window.escHtml`, Node `module.exports`) |
> | `src/ui/toast.js` | `showToast` — faqat `textContent` |
> | `src/ui/templates.js` | `UiTemplates`: hisob-faktura, pending info, xodimlar jadvali, super-admin qatorlari (escape qilingan, `data-action`) |
> | `src/ui/index-auth.js`, `admin-page.js`, `superadmin-page.js` | HTML ichidagi skriptlar shu fayllarga ko'chirildi (CSP `script-src 'self'`) |
> | `src/ui/legacy-warning.js` | `<script nomodule>` — eski brauzer ogohlantirishi |
> | `src/js/auth-core.js` | `AuthCore`: login → sun'iy email, login tavsiyasi, parol generatori, tariflar (sof, Node'da test qilinadi) |
> | `src/js/auth.js` | `AuthManager`: Firebase Auth (sessiya token'dan; `ready()`, `onChange()`), xodim yaratish ikkinchi app instansiyasi bilan, parolni tiklash = yangi hisob, tarif so'rovi |
> | `src/js/db.js` | `DB`: `get/getAll/set/update/remove/batch/onOrgsSnapshot/onCollectionSnapshot`; `getByIndex`, `isLoginTaken`, `exportAll` olib tashlandi |
> | `src/js/firebase-config.js` | `FIREBASE_CONFIG`, `LOGIN_EMAIL_DOMAIN`, `window.firebaseDb`, `window.firebaseAuth`; `SUPER_ADMIN` **yo'q** |
> | `scripts/*.mjs` | egasining Admin SDK skriptlari: `set-superadmin-claim`, `reset-user-password`, `migrate-legacy-users`, `vendor-firebase` |
> | `package.json`, `tests/**/*.test.js` | `npm test` (8 Excel nuqtasi + xavfsizlik), `npm run test:all` (+ Emulator'da qoidalar) |
>
> Firestore: `organizations/{adminUid}`, `employees/{uid}`, `authCleanup/{uid}`. `passwordHash`, `rawPwd`, `fullName` yo'q. `localStorage` da `uc_session`, `uc_sa_session` endi yozilmaydi (o'chiriladi).
> Skript tartibi: `vendor/firebase (app, auth, firestore) → escape → toast → firebase-config → auth-core → db → auth → templates → (index: presets … app) → sahifa kontrolleri`.
> Batafsil: [SECURITY_SETUP.md](SECURITY_SETUP.md), [AUTH_MIGRATION.md](AUTH_MIGRATION.md), [DATA_RESIDENCY.md](DATA_RESIDENCY.md).

---

## 1. Umumiy ko'rinish

- **Turi:** vanilla JavaScript SPA, build bosqichi yo'q, GitHub Pages'dan statik fayl sifatida beriladi.
- **Modul tizimi:** ES module **emas**. Har bir fayl IIFE (`const X = (() => {...})()`) va natijani `window.X` ga yozadi. Fayllar `index.html` dagi `<script>` tartibida yuklanadi (777–791-qatorlar); tartib buzilsa ilova ishlamaydi.
- **Tashqi kutubxonalar:** faqat Firebase compat SDK 9.23.0 (`www.gstatic.com` CDN'dan, `vendor/` papka yo'q, SRI xeshi yo'q). Shriftlar Google Fonts'dan.
- **`package.json` yo'q** → `npm test` hozir mavjud emas. Testni faqat `node tests/verify-excel.js` bilan qo'lda ishga tushirish mumkin.
- **CI yo'q** (`.github/` yo'q), CHANGELOG yo'q, `ENGINE_VERSION` yo'q.
- **README.md eskirgan:** loyiha nomi `uncertainty-platform`, deploy branch `claude/create-uncertainty-platform-y5EVM`, Firebase/autentifikatsiya, Monte-Karlo, ko'p nuqtali kalibrlash umuman tilga olinmagan.

## 2. Fayl va modullar xaritasi

| Fayl | Qator | Global nom | Vazifasi | DOM'ga bog'liqmi |
|---|---:|---|---|---|
| `index.html` | 1146 | — | Barcha ekranlar (auth, home, welcome, app, print, paywall) + ichki `<script>` (793–1146): login/ro'yxatdan o'tish UI, hisob-faktura (`buildInvoiceHTML`) | ha |
| `admin.html` | 563 | — | Tashkilot admini paneli: xodimlar, tarif, to'lov, hisob-faktura. Hammasi ichki `<script>` da | ha |
| `superadmin.html` | 583 | — | Super-admin: barcha tashkilotlar ro'yxati (real-time), to'lovni tasdiqlash, aktivlashtirish | ha |
| `src/js/firebase-config.js` | 46 | `FIREBASE_CONFIG`, `SUPER_ADMIN`, `window.firebaseDb` | Firebase init + **super-admin login/paroli ochiq matnda** | yo'q (lekin `window`) |
| `src/js/db.js` | 118 | `DB` | Firestore o'rami: `get/getByIndex/getAll/add/put/remove/isLoginTaken/exportAll/onOrgsSnapshot` | yo'q (`window.firebaseDb`) |
| `src/js/auth.js` | 272 | `AuthManager` | Parol xeshi, ro'yxatdan o'tish, login, sessiya (localStorage), xodim qo'shish/o'chirish, tariflar, Click/Payme havolalari | `localStorage`, `location` |
| `src/data/presets.js` | 406 | `PRESETS` | 11 ta shablon (mass, volume, density, voltage, resistance, power, length, area, temperature, gas_analyzer, thermometer) | `window` |
| `src/js/i18n.js` | 668 | `TRANSLATIONS`, `i18n` | UZ/RU/EN lug'at + `I18n` klassi | ha |
| `src/js/i18n-ext.js` | 202 | — | Kalibrlash funksiyalari uchun qo'shimcha kalitlar, `TRANSLATIONS` ga `Object.assign` | yo'q |
| `src/js/state.js` | 161 | `appState` | Markaziy holat, `localStorage` ga avtomatik saqlash, pub/sub | `localStorage` |
| `src/js/calc.js` | 679 | `Calc` | **GUM hisoblash dvigateli** (sof funksiyalar). Node'da `require` qilinadi | yo'q ✅ |
| `src/js/table.js` | 526 | `Table` | O'lchash jadvali, model formulasi kartasi, A tur usullari jadvali | ha (+ hisob) |
| `src/js/typeB.js` | 391 | `TypeB` | B tur komponentlar, korrelyatsiya, P/k/yaxlitlash/MPE/CMC sozlamalari | ha (+ hisob) |
| `src/js/points.js` | 89 | `Points` | Ko'p nuqtali kalibrlash: nuqta snapshot'lari, sertifikat jadvali (`summary`) | `appState`, `i18n` |
| `src/js/report.js` | 556 | `Results` | Natijalar ekrani, Monte-Karlo tugmasi, chop etish hisoboti | ha |
| `src/js/app.js` | 520 | `showToast`, `switchTab` | Bootstrap, ekranlar, sidebar, preset yuklash, trial/paywall | ha |
| `src/css/*.css` | 2592 | — | theme / layout / components / auth | — |
| `tests/verify-excel.js` | 26 | — | Etalon Excel natijalariga solishtirish (§8) | yo'q |
| `tests/excel-cases.js` | 46 | — | Gaz analizatori va termometr kirish ma'lumotlari | yo'q |
| `docs/references/*.pdf` | — | — | JCGM 100, JCGM 101, EA-4/02 M:2022, EURACHEM QUAM 2012, Nordtest TR 537 ed.4 | — |
| `docs/audit/gemini-audit-2026-11.md` | 508 | — | Tashqi (Gemini) audit hisoboti — **tekshirilmagan manba** | — |

### Skript yuklanish tartibi (`index.html`)

```
firebase-app-compat → firebase-firestore-compat → firebase-config → db → auth
→ presets → i18n → i18n-ext → state → calc → table → typeB → points → report → app
→ ichki auth UI skripti
```

`state.js` yuklanishi bilan `new AppState()` `localStorage` ni o'qiydi; `app.js` `DOMContentLoaded` da `bootstrap()` ni chaqiradi.

### Etalon Excel fayllar va qo'llanmalar

> **Yangilanish (2026-11-11):** egasi fayllarni `tests/fixtures/` ga qo'shdi (zichlik, gazoanalizator KEDR-07, termometr MS-MK-3 va 2 ta qo'llanma). Quyidagi matn P00 holatini tasvirlaydi.

**Repoda yo'q.** `git log --all` bo'yicha hech qachon `.xlsx`/`.docx` qo'shilmagan. Ular faqat nomi bilan tilga olinadi:
- `tests/verify-excel.js:2-3` — `Noaniqlik_hisobi_gazoanalizator.xlsx`, `Noaniqlik_hisobi_termometr_MS-MK-3.xlsx`;
- `src/data/presets.js:343,364` — "C75.QM Ilova A" (KEDR-07), "MS-MK-3";
- Gemini hisoboti T1 — `Zichlik_noaniqligi_hisobi (1).xlsx`.

Kutilgan qiymatlar `tests/verify-excel.js:7-8` ga qo'lda ko'chirilgan. Ularni asl Excel bilan qayta solishtirib bo'lmaydi (qarang: RISKS R-01).

## 3. Hisoblash qayerda bajariladi

Asosiy yo'l: **`Calc.evaluate(state)`** (`calc.js:357-554`). U toza funksiya: `state` obyektini oladi va natija obyektini qaytaradi. DOM'ga murojaat qilmaydi.

| Bosqich | Funksiya / joy | Izoh |
|---|---|---|
| **Formula parser** | `splitFormula` (73), `tokenize` (80), `compile` (111) | `eval` siz rekursiv tushish parseri; `+ − * / ^`, unar minus, `sqrt abs exp ln log lg log10 sin cos tan asin acos atan`, `pi`, `e`. `^` o'ngdan assotsiativ. Unicode `× · ÷ − ² ³ √` normallashtiriladi. **`:` bo'lishga aylantiriladi.** Parametr nomlari eng uzunidan boshlab prefiks bo'yicha mos keltiriladi (`2ab` → `2*a*b` emas, xato) |
| **A tur** | `typeA` (21), `typeAx` (260) | `typeA`: x̄, s (n−1), u=s/√n, ν=n−1. `typeAx` usullari: 1 — GUM 4.2.3; 2 — oldindan ma'lum s_p (GUM 4.2.4), ν=ν_p; 3 — COOMET kichik tanlama `s/√n·√((n−1)/(n−3))`, ν=∞; `directional` — ↑/↓ bo'yicha ajratilgan o'rtacha, birlashgan s, ν=n−2, histerezis h |
| **B tur** | `DIVISORS` (38), `getDivisor` (46), `typeB` (60), `valueOrExpr` (314) | to'g'ri burchakli √3, normal k (standart 2), uchburchak √6, U-shakl √2, rezolyutsiya 2√3. Yarim kenglik son **yoki kirish o'rtachalaridan formula** bo'lishi mumkin (`0.0002*I + 0.002`). Komponentning `sensitivity` maydoni — "multiplier" (birlik o'tkazgich), model c_i dan **alohida** |
| **Histerezis** | `evaluate` 406-412 | ↑/↓ yoqilsa avtomatik B komponent: a=h/2, to'g'ri burchakli |
| **Kirish noaniqligi** | 415-420 | u(x_i)² = u_A² + Σu_B² |
| **Sezgirlik koeffitsiyentlari** | 423-432 | **Sonli markaziy ayirma**, `h = (|x₀| || 1)·1e-6`. Analitik hosila yo'q. Xato bo'lsa `c = 0` (jimgina) |
| **Korrelyatsiya** | `correlation` (234), 435-448 | Juftlangan qatorlar bo'yicha Pearson r → `covA = r·u_A(a)·u_A(b)`; foydalanuvchi kiritgan `covB[a|b]` qo'shiladi |
| **u_c** | 451-455 | Birinchi tartibli GUM 5.1.2 / 5.2.2 (yuqori tartibli hadlar yo'q). Manfiy dispersiya `max(0, …)` bilan jimgina kesiladi |
| **ν_eff** | 458-466 | Welch–Satterthwaite (GUM G.4.1). B tur ν=∞ (agar `nu` kiritilmasa). Natija `min(1e6, …)` bilan cheklanadi. Korrelyatsiya hisobga olinmaydi |
| **k** | `coverageFactor` (222), `tCoverage` (216), `betai/betacf/lgamma/erf` (165-213) | Ikki tomonlama t-taqsimot uchun 200 qadamli bisection, `[0, 1000]`. **ν avval pastga yaxlitlanadi (`floor`)**. ν>5000 yoki ∞ bo'lsa normal taqsimot (`erf`). `kMethod='k2'` bo'lsa k=2 qat'iy |
| **U** | 471 | U = k·u_c |
| **Yaxlitlash** | `roundAt` (325), `roundResult` (332) | **Dvigatel ichida** bajariladi; natijaga `digits, Uround, yround, resultText` qo'shiladi. U → 2 qiymatli raqam (odatiy yoki yuqoriga), y → U ning xonasigacha |
| **Byudjet** | 477-499 | A/B/korrelyatsiya qatorlari, ulush % |
| **Tekshiruv (GUM H.2, 2-yondashuv)** | 501-525 | Juftlangan qatorlardan y_i hisoblab, u_A ni to'g'ridan-to'g'ri va formula bo'yicha solishtiradi |
| **Muvofiqlik** | `conformity` (342), 528-534 | `|y|` ni MPE bilan solishtiradi (y — **xato** deb faraz qilinadi). Oddiy: `|y| ≤ MPE`; himoyalangan: `|y|+U ≤ MPE` → ok, `|y|−U > MPE` → fail, aks holda `zone`. MPE byudjetga kirmaydi ✅ |
| **γ (keltirilgan xato)** | 535-536 | `|y|/range·100` |
| **Ogohlantirishlar** | 539-543 | `zero_s, n_small, dir_missing, sp_missing, coomet_small, below_cmc, zero_u` |
| **Monte-Karlo** | `monteCarlo` (565-657), `rng` (557) | JCGM 101: Type A — siljitilgan/masshtablangan t, Type B — o'z taqsimoti. **xorshift32, qat'iy seed 20261110**, M ∈ [10⁴; 2·10⁶] qat'iy (adaptiv emas). Eng qisqa qamrov intervali + simmetrik interval. §8 validatsiya: δ = ½·10^(l) u_c ning 2 qiymatli raqamidan. **Korrelyatsiya hisobga olinmaydi**, faqat `correlated` bayrog'i qaytadi |
| **Ko'p nuqta / bir xil k** | `Points.summary` (`points.js:305`) | `uniformK` bo'lsa barcha nuqtalarga eng katta k qo'llanadi, U, yaxlitlash va muvofiqlik **dvigateldan tashqarida** qayta hisoblanadi |

Hozir mavjud **emas**: top-down (Nordtest/QUAM), regressiya/kalibrlash egri chizig'i, ko'p o'lchamli chiqish (JCGM 102), adaptiv MC, ikkinchi tartibli hadlar, birliklar tahlili, mikrobiologiya, namuna olish, sifatli testlar, QC/PT/validatsiya modullari.

## 4. DOM bilan aralashib ketgan hisob joylari

`calc.js` o'zi toza, ammo hisoblash mantig'ining bir qismi UI fayllarida **takrorlangan** yoki **faqat UI'da** mavjud. Bu dvigatelni ajratishda (PLAN P03) ko'chirilishi kerak bo'lgan joylar:

| Joy | Nima hisoblanadi | Muammo |
|---|---|---|
| `table.js:47-50` `taFor` | `Calc.typeAx` ni UI'dan chaqiradi | OK, lekin `settings.typeA` + `dirs` ni yig'ish mantig'i 5 joyda takrorlanadi (`table.js:47`, `typeB.js:63`, `typeB.js:365`, `app.js:296`, `calc.js:385`) |
| `table.js:179-207` `updateModelStatus` | Formulani kompilyatsiya qilib, o'rtachalarda `y` ni hisoblaydi | Dvigateldan tashqari "oldindan ko'rish" hisobi |
| `table.js:462-474` `fillSample` | `Math.random()` bilan tasodifiy ma'lumot, `toFixed(6)` | Seed'siz; foydalanuvchi uni haqiqiy o'lchash deb qabul qilishi mumkin |
| `typeB.js:73-81` `compStd`, `204-221` `renderSummary` | B tur u va u_B(x) ni **dvigateldan mustaqil** qayta hisoblaydi | `evaluate` dagi mantiqdan farq qilishi mumkin (masalan, noto'g'ri formula `a=0` deb ko'rsatiladi, `evaluate` esa xato qaytaradi) |
| `typeB.js:234-241` `renderSettings` | Korrelyatsiya r ni `Calc.typeA` (usulsiz) bilan hisoblaydi | `evaluate` esa `typeAx` (↑/↓ hisobga olingan) ishlatadi — ekrandagi r va hisobdagi r farq qilishi mumkin |
| `typeB.js:345-375` `calcCombined` | `evaluate` + A turni qayta hisoblab state'ga yozadi | — |
| `app.js:244-308` `loadPreset` | Preset nuqtalarini `Points.save` orqali hisoblaydi, A turni `typeAx` bilan | — |
| `points.js:305-316` `summary` | Bir xil k, `U = k·u_c`, yaxlitlash, muvofiqlik | Metrologik qoida (COOMET §5.7.3) dvigateldan tashqarida |
| `report.js:32` `nuText`, `report.js:98` | ν ni `floor` bilan ko'rsatadi, k ni `toFixed(2)` | Ko'rsatish qatlamida — to'g'ri joy, lekin qoida hujjatlanmagan |
| `report.js:172-181` | Monte-Karlo'ni `setTimeout` ichida asosiy oqimda ishlatadi | M=10⁶ da UI qotadi; Worker yo'q |

## 5. Global holat va localStorage tuzilmasi

### 5.1. Global obyektlar (`window`)

`Calc, appState, Table, TypeB, Results, Points, PRESETS, i18n, DB, AuthManager, firebaseDb, showToast, switchTab` + top-level `const` lar: `TRANSLATIONS, STATE_KEY, DEFAULT_STATE, FIREBASE_CONFIG, SUPER_ADMIN`. Inline `onclick="..."` atributlari (`admin.html`, `superadmin.html`) global funksiyalarni (`copyText`, `removeEmp`, `confirmPayment`, `activateOrg`, `deactivateOrg`) talab qiladi.

### 5.2. localStorage kalitlari

| Kalit | Kim yozadi | Tuzilma | Izoh |
|---|---|---|---|
| `uc_state_v2` | `state.js:53` | Butun `AppState` (pastda) | Har bir `set()` da to'liq JSON qayta yoziladi. Versiya maydoni yo'q, migratsiya yo'q |
| `uc_lang` | `i18n.js:643` | `'uz' \| 'ru' \| 'en'` | standart `en` |
| `uc_theme` | `app.js:124`, `admin.html`, `superadmin.html` | `'dark' \| 'light'` | |
| `uc_trial_count` | `app.js:17` | son (string) | 7 ta bepul hisob; brauzerda osongina o'chiriladi |
| `uc_session` | `auth.js:252` | `{role:'admin'\|'employee', orgId, empId?, login, name, expiresAt}` | **Imzosiz**, 8 soat TTL. Foydalanuvchi qo'lda yasashi mumkin |
| `uc_sa_session` | `superadmin.html:346` | `'true'` | **Imzosiz** — qo'lda yozilsa super-admin paneli ochiladi |

### 5.3. `uc_state_v2` tuzilmasi (`state.js:7-23`)

```js
{
  n: 10,                       // jadval qatorlari soni
  params: ['x'],               // kirish kattaliklari nomlari
  measurements: { x: ['1.0', '', ...] },   // satr (string) yoki son, qator bo'yicha tekislangan
  typeA: { x: {n, mean, s, uA, nu, deviations[], ...} },  // keshlangan A tur (to'liq massivlar bilan)
  typeB: [{ id, name, param, halfWidth: number|string(formula), distribution, k, sensitivity, unit, nu }],
  combined: { ...Calc.evaluate() natijasi... } | null,
  model: { formula: 'ρ = m / V', unit: 'g/cm³' },
  settings: { paired, P, kMethod: 'nu'|'k2', rounding: 'normal'|'up', mpe, range, cmc,
              typeA: { x: { method: 1|2|3, sp, nup, directional } } },
  directions: ['↑','↓',''],    // har qator uchun
  points: [{ id, label, snapshot: {n, params, measurements, directions, typeB, model, settings, covB},
             result: {...evaluate natijasi, jumladan yaxlitlangan resultText...} }],
  currentPoint: 'pt_xxx' | null,
  summary: { uniformK: false },
  covB: { 'a|b': 0.0001 },
  theme: 'dark', lang: 'en'    // ishlatilmaydi (uc_theme / uc_lang alohida)
}
```

Xususiyatlar:
- `_load()` (`state.js:43`) `{...DEFAULT_STATE, ...saved}` — **sayoz** birlashtirish; ichki obyektlar (`settings`) eski formatda qolsa, yangi maydonlar standart qiymat olmaydi.
- `points[].result` — dvigatel natijasining **nusxasi**. Dvigatel o'zgarsa, saqlangan nuqtalar qayta hisoblanmaydi va qaysi versiyada hisoblangani noma'lum.
- `report.js:25-28` eski format (`budget`/`inputs` yo'q) natijani "hisoblanmagan" deb tashlab yuboradi — bu yagona "migratsiya".
- `_v2` nomi oldingi `v1` format tashlab yuborilganini bildiradi (migratsiya kodi yo'q).
- `localStorage` kvotasi (~5 MB) to'lsa `_save` xatoni jimgina yutadi (`catch(_){}`) — ma'lumot saqlanmaydi, foydalanuvchi bilmaydi.

## 6. i18n qanday ishlaydi

- `TRANSLATIONS = { en: {...}, ru: {...}, uz: {...} }` (`i18n.js`), keyin `i18n-ext.js` har bir tilga `Object.assign` bilan qo'shimcha kalitlar qo'shadi.
- `i18n.t(key)`: joriy til → `en` → kalitning o'zi (topilmasa xato bermaydi, kalit nomi ekranga chiqadi).
- `i18n.apply()`: `[data-i18n]` → `textContent`, `[data-i18n-label]` → `label`, `[data-i18n-ph]` → `placeholder`; `langchange` hodisasi.
- Til almashganda `app.js:139-147` `Table/TypeB/Results/renderSidebar` ni qayta chizadi.
- **Tekshiruv natijasi (P00):** 251 ta kalit, uchala tilda ham to'liq (bo'sh kalit 0). Kodda statik ishlatilgan 211 ta kalitning hammasi mavjud; dinamik kalitlar: `am_1..3`, `w_<code>`.
- **i18n'dan tashqaridagi qattiq matnlar** (bir tilda):
  - `app.js:56,60` — trial banner (o'zbekcha);
  - `app.js:346,370,396,404` — toast/confirm (inglizcha);
  - `table.js:227,234-235` — preset ko'rsatmasi (o'zbekcha + `preset.name` inglizcha);
  - `presets.js` — barcha `name` va komponent nomlari (inglizcha);
  - `auth.js` — barcha xato xabarlari (o'zbekcha);
  - `admin.html`, `superadmin.html`, `index.html` ichki skript — deyarli hammasi o'zbekcha, i18n umuman ulanmagan.
- Raqamlar formati: `toFixed` / `toPrecision` (har doim nuqta), `toLocaleString()` faqat MC'da M uchun.

## 7. Shablonlar qanday saqlanadi

- **Tizim shablonlari:** `src/data/presets.js` — statik JS obyekt. Tuzilma: `{name, params, n, unit, formula?, derived[], settings?, directions?, sampleData?, typeBComponents[], points?[{label, data, patch}]}`. `patch` — nuqtaga xos B komponent qiymatlari, komponent **nomi** bo'yicha bog'lanadi.
- **Foydalanuvchi shablonlari: yo'q.** Saqlash/eksport/import (JSON/CSV) funksiyasi mavjud emas. Yagona "saqlash" — `uc_state_v2` dagi joriy sessiya va uning `points[]` lari; "Reset" yoki boshqa preset tanlash ularni o'chiradi.
- **Ikki manba muammosi:** `gas_analyzer` va `thermometer` ma'lumotlari `presets.js` da **va** `tests/excel-cases.js` da alohida-alohida yozilgan. Test preset'ni emas, o'z nusxasini tekshiradi — preset buzilsa test buni sezmaydi.
- Preset tanlash (`app.js:381-391`) joriy holatni **ogohlantirishsiz** to'liq almashtiradi (saqlangan nuqtalar ham o'chadi).

## 8. Mavjud testlar: `tests/verify-excel.js` nimani tekshiradi

Ishga tushirish: `node tests/verify-excel.js` (P00 da: **ALL MATCH**, exit 0).

| # | Holat | Tekshiriladi | Kutilgan (`verify-excel.js:7-8`) |
|---|---|---|---|
| 1–3 | Gaz analizatori KEDR-07, 3 nuqta (0, 10, 19 % об.), `E = (I−4)·1.25 − Ce`, ROUNDUP | faqat `resultText` satri | `0.0000 ± 0.0062`, `0.018 ± 0.021`, `0.025 ± 0.027` |
| 4–8 | Strelkali termometr MS-MK-3, 5 nuqta (10…90 °C), ↑/↓, `Cv = Te + Ce − Tv` | faqat `resultText` satri | `0.31 ± 0.41`, `0.21 ± 0.47`, `−0.26 ± 0.54`, `−0.40 ± 0.66`, `−0.62 ± 0.51` |
| MC | Gaz 2-nuqta, M=10⁶ | **faqat konsolga chiqaradi, assert yo'q** | izohda: qo'llanma `[−0.0111; 0.0469]`, yarim kenglik 0.029 (dvigatel: `[−0.0113; 0.0465]`, 0.0289) |

Muhim cheklovlar:
- Faqat **yaxlitlangan satr** solishtiriladi. `u_c`, `ν_eff`, `k`, c_i, byudjet ulushlari, muvofiqlik holati tekshirilmaydi (faqat konsolga chiqariladi). Yaxlitlash ko'p xatolarni yashiradi.
- **8 ta** assert qilingan nuqta bor (3 + 5). "9 ta etalon nuqta" deyilganda 9-si nima ekanligi aniqlanishi kerak (MC? zichlik Excel'i?) — PLAN.md "Savollar" bo'limiga qarang.
- Ishlatiladigan holatlar `calc.js` ning `evaluate` va `monteCarlo` funksiyalarini qamraydi; `typeAx` usul 2/3, `correlation`, `covB`, `kMethod='k2'`, `rounding='normal'`, parser xatolari, `conformity` chegaralari, `Points.summary(uniformK)` umuman testlanmagan.
- i18n, XSS, state migratsiyasi uchun test yo'q.

## 9. Firebase'ga yuboriladigan ma'lumotlar

Hisoblash ma'lumotlari (o'lchashlar, byudjetlar, natijalar) Firebase'ga **yuborilmaydi** — ular faqat `localStorage` da. Firebase faqat Firestore (Auth, Analytics, Storage ishlatilmaydi; `measurementId` konfiguratsiyada bor, lekin Analytics SDK yuklanmagan).

### 9.1. `organizations` kolleksiyasi (`auth.js:275-289`, `superadmin.html:536-568`)

| Maydon | Shaxsiy ma'lumotmi | Manba |
|---|---|---|
| `inn` | **ha (STIR/INN)** | ro'yxatdan o'tish formasi |
| `phone` | **ha (telefon)** | forma |
| `firstName`, `lastName`, `fullName` | **ha (F.I.Sh.)** | forma |
| `login` | ha (identifikator) | forma |
| `passwordHash` | ha (autentifikatsiya) | SHA-256(parol + `':uc_noaniqlik_v1'`) — statik tuz |
| `employeeCount` | yo'q | forma |
| `plan`, `planExpiry`, `registeredAt`, `active`, `paymentStatus`, `paidAt`, `activatedAt` | yo'q | tizim |

### 9.2. `employees` kolleksiyasi (`auth.js:356-366`)

| Maydon | Shaxsiy ma'lumotmi | Izoh |
|---|---|---|
| `orgId` | — | |
| `name` | **ha (F.I.Sh.)** | admin kiritadi |
| `role` | ha (lavozim) | |
| `phone` | **ha (telefon)** | |
| `login` | ha | F.I.Sh. dan translit (`a.karimov`) |
| `rawPwd` | **ha — parol ochiq matnda!** | `admin.html:479` ekranda ko'rsatiladi |
| `passwordHash` | ha | |
| `createdAt`, `active` | yo'q | |

Email maydoni hech qayerda yo'q. Hisob-faktura (`buildInvoiceHTML`) INN, F.I.Sh. ni faqat brauzerda chizadi, yubormaydi.

### 9.3. O'qish

- `login()` (`auth.js:298-335`) tashkilot/xodim hujjatini **to'liq** (jumladan `passwordHash`, `rawPwd`) brauzerga yuklab, xeshni **mijoz tomonda** solishtiradi.
- `superadmin.html` `onOrgsSnapshot` orqali **barcha** tashkilotlarni (INN, telefon, F.I.Sh., xesh) real vaqtda oladi.
- `DB.exportAll()` — barcha tashkilot va xodimlarni qaytaradi.
- Firestore xavfsizlik qoidalari (`firestore.rules`) repoda **yo'q**; `firebase-config.js:9` "Test mode" da ishga tushirishni tavsiya qiladi. Agar qoidalar haqiqatan ochiq bo'lsa, yuqoridagi barcha shaxsiy ma'lumotlar Internetdagi istalgan kishiga o'qish/yozish uchun ochiq (RISKS R-S1).
