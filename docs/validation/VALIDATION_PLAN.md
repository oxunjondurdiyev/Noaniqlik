# UncertaintyCalc — validatsiya rejasi

> **Holat:** P13 (validatsiya paketi), `ENGINE_VERSION` 2.10.0 (`src/engine/version.js`). P13 hisob natijasini o'zgartirmaydi.
> **Maqsad:** platformaning hisoblash qismi qanday tekshirilgani, nima tekshirilmagani va laboratoriya o'zi nima qilishi kerakligini bitta joyda ko'rsatish.
> **Me'yoriy asos:** ISO/IEC 17025:2017 §7.11.2 **(unverified — hujjat repoda yo'q, pullik; iqtibos keltirilmagan)**. Hujjat tuzilmasi g'oyasi (reja → talablar → izlanuvchanlik matritsasi → IQ / OQ / PQ → o'zgarishlarni boshqarish) WELMEC 7.2, OIML D 31 va GAMP 5 dan olingan **(unverified — hujjatlar repoda yo'q, iqtibos keltirilmagan)**. Bu reja shu hujjatlarga muvofiqlik da'vosi emas.

Bu hujjat dasturni laboratoriya nomidan validatsiya qilmaydi. U ishlab chiquvchi tomonidagi tekshiruvni (OQ) tavsiflaydi; laboratoriyaning o'z metodikasidagi tekshiruvi (PQ) — laboratoriyaning ishi ([PQ_PROTOCOL_TEMPLATE.md](PQ_PROTOCOL_TEMPLATE.md)).

---

## 1. Tizim tavsifi

UncertaintyCalc — o'lchash noaniqligini hisoblaydigan brauzer platformasi: vanilla JavaScript (ES modullar), framework yo'q, statik sayt (GitHub Pages), interfeys uch tilda (uz / ru / en). Hisob to'liq foydalanuvchining brauzerida bajariladi.

| Qatlam | Joyi | Vazifasi | Xususiyati |
|---|---|---|---|
| Hisoblash dvigateli | `src/engine/` | GUM (LPU), Monte-Karlo, vektor modellar, regressiya, top-down, maxsus rejimlar, laboratoriya reestri hisoblari, PT / usul validatsiyasi, linter, qaror qoidasi | sof ES modullar: DOM, `window`, `localStorage` yo'q; Node va brauzerda bir xil kod; API — `docs/ENGINE_API.md` |
| Hisobot | `src/report/` | yaxlitlash (`rounding.js`), hisobot bo'limlari va 4 shakl (`forms.js`), pastki qism (versiya, build, xesh, QR) | sof (DOM siz); dvigatel bilan birga `tests/security/engine.sha256.json` xeshiga kiradi |
| Import / eksport | `src/io/` | hisob hujjati `uc-calc/1`, `.xlsx` / `.csv` import, jadval eksporti | sof, tarmoq chaqiruvi yo'q (`tests/io/import.test.js` tekshiradi) |
| Saqlash | `src/storage/` | IndexedDB, audit xesh zanjiri, sxema migratsiyasi, reestr va P12 omborlari | foydalanuvchi qurilmasida; Firebase'ga hisob ma'lumoti yozilmaydi |
| Interfeys | `src/ui/`, `src/js/` | DOM ulanishi, i18n, Web Worker (Monte-Karlo) | inline skript yo'q (CSP `script-src 'self'`) |
| Shablonlar | `src/templates/`, `templates/builtin/`, `schemas/` | metodika shablonlari (DRAFT → REVIEWED → APPROVED) | barcha ichki shablonlar hozir DRAFT |
| Tashqi kutubxonalar | `vendor/` | Firebase SDK, SheetJS CE, qrcode-generator | aniq versiya, litsenziya, SHA-256 (`vendor/README.md`, `vendor/SHA256SUMS.txt`) |

**Firebase** faqat ro'yxatdan o'tish, tashkilotlar va to'lov uchun ishlatiladi (`firestore.rules`, `docs/SECURITY_SETUP.md`, `docs/DATA_RESIDENCY.md`). Hisoblar, reestr, QC, PT va validatsiya ma'lumotlari Firebase'ga yozilmaydi.

**Deploy:** `scripts/build-site.js` + `.github/workflows/deploy.yml` — `_site/` ga oq ro'yxat bo'yicha nusxa, har bir mahalliy modul havolasiga `?v=<commit SHA 12 belgi>`, `build.json` (`commit`, `shortSha`, `engineVersion`, `engineHash`, `builtAt`, `node`). Repodagi manba kodi build qadamisiz ham ishlaydi (lokal ishlab chiqish). Tartib — `docs/DEPLOY.md`.

## 2. Qamrov

Holat ustuni `CLAUDE.md` ("Joriy holat bo'yicha eslatmalar") va `docs/RISKS.md` dan. "Verified" — kutilgan qiymatlar asl manbadan (`docs/references/` yoki `tests/fixtures/`) olingan testlar o'tadi; "unverified" — manba repoda yo'q, faqat o'zaro yoki analitik tekshiruv.

| Rejim | Kod | Holat | Verified qism | Unverified / qilinmagan qism |
|---|---|---|---|---|
| GUM (LPU), bitta chiqish | `src/engine/evaluate.js` va b. | **verified** | 9 etalon Excel nuqtasi; JCGM 100:2008 H.1, H.2, H.3; EA-4/02 M:2022 S2, S3; QUAM:2012 A1 | birliklar / o'lchamlik tahlili (JCGM GUM-6 — repoda yo'q); D-03, D-05 — todo (manba nuansi) |
| Monte-Karlo (MCM) | `src/engine/montecarlo.js`, `src/engine/mc/` | **verified** | JCGM 101:2008 §9.2–9.5 (Table 2–4, 6, 8, 9, 11); 10-test (`excel-gas-p2-mc`) | log-normal taqsimot; oshkormas model uchun MCM — qilinmagan |
| Vektor modellar (JCGM 102:2011) | `src/engine/multivariate/` | **qisman** | Table 1, 2, 3–5, 6–7, 11, 12–16; §7.7.4 misoli; JCGM 100 H.2 vektor | eng kichik soha m > 2, nuqtalararo soha — qilinmagan; sonli tafsilotlar va MV1 chegarasi tasdiq kutadi (R-24) |
| Regressiya | `src/engine/regression/` | **qisman** | OLS + to'g'ri / teskari bashorat (GUM H.3, QUAM A5 / E.4) | WTLS, GLS, polinom, "U — diapazon" — unverified (R-19) |
| Top-down | `src/engine/topdown/` | **qisman** | Nordtest TR 537 ed. 4 (6 misol), QUAM:2012 A4, A6 | ISO 21748 ga xos hisoblar — unverified (R-20) |
| Namuna olish | `src/engine/sampling/` | **verified** (robust — qayta tiklangan algoritm) | UfS:2019 A1, A2: klassik — to'liq aniqlikda; robust — 4 qiymatli raqamgacha | robust algoritm boshqa ma'lumotlarda asl dastur bilan farq qilishi mumkin (R-21, D-16) |
| Sifatli testlar | `src/engine/qualitative/` | **verified** (Wilson) | AQA:2021 E3, 7.6 | Clopper–Pearson — loyiha qo'shimchasi (mustaqil dastur qiymatlari bilan tekshirilgan) |
| Mikrobiologiya | `src/engine/micro/` | **BETA** | — | ISO 19036 repoda yo'q; faqat analitik testlar |
| Tibbiy laboratoriya | `src/engine/medical/` | verified (P18) | ISO/TS 20914:2019 G1…G11 (`tests/fixtures/iso20914/`, `tests/engine/medical.iso20914.test.js`) | standart PDF'i repoda yo'q (pullik) — qiymatlar egasidan, band havolasi bilan; ma'lum farq D-23 (G9, ikki hosila qiymat); yaxlitlash (§5.4) — egasi qarori kutiladi |
| Laboratoriya reestri, CMC, QC | `src/engine/lab/` | **qisman** | ILAC P14:09/2020 §4.1–4.3, §5.5; ILAC P10:07/2020 §2; NIST e-Handbook §6.3.2.1–6.3.2.2; Westgard 1981 (qaydnoma) | ISO/IEC 17025 §6.4, §6.5, §7.7.1 — unverified; interval formulasi — loyihaniki (R-25) |
| PT va usul validatsiyasi | `src/engine/pt/`, `src/engine/validation/`, `src/engine/stats/` | **qisman** | NIST e-Handbook §1.3.5.17.1, §7.4.3, §2.4.4.1–2.4.4.2, §1.3.5.3, §1.3.5.9 | ISO 13528, PT chegaralari, Cochran, n₀, LOD/LOQ — unverified; qarorlar egasini kutadi (R-26) |
| Linter va qaror qoidasi | `src/engine/linter/`, `src/engine/decision.js` | **verified** (chegaralar — loyiha qarorlari) | JCGM 106:2012 §7–8, ILAC G8:09/2019 (sahifa havolali testlar) | 4:1 TUR amaliyoti — unverified; chegaralar me'yoriy talab emas (`docs/LINTER_RULES.md` §4) |
| Hisobot shakllari, import / eksport | `src/report/`, `src/io/` | **qisman** | yaxlitlash (egasi qarorlari), `uc-calc/1` eksport → import → qayta hisob | rekvizitlar ro'yxati — unverified (R-22) |

To'liq ro'yxat — [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md); talab → kod → test bog'lanishi — [RTM.md](RTM.md) va `docs/VALIDATION_MATRIX.md`.

### 2.1. Qamrovga kirmaydi

- **Laboratoriyaning o'z metodikasi va kirish ma'lumotlari.** Model to'g'ri tuzilgani, manbalar to'liqligi, etalon ma'lumotlari — laboratoriya javobgarligi (linter faqat tipik xatolarni ko'rsatadi).
- **Ichki shablonlar mazmuni.** `templates/builtin/` dagi barcha shablonlar DRAFT; 1-to'lqin shablonlarida raqam yo'q. APPROVED holatiga o'tkazish — laboratoriya, `docs/templates/APPROVAL_CHECKLIST.md` bo'yicha.
- **Firebase konsoli sozlamalari.** Qoidalarni joylash, Auth, claim, migratsiya — egasi `docs/SECURITY_SETUP.md` bo'yicha bajaradi; bajarilgani bu paketda tasdiqlanmaydi.
- **Server tomonidagi qayta hisob, markaziy saqlash, zaxira.** Rejalashtirilgan (P15, `docs/PLAN.md`).
- **AI yordamchi.** Rejalashtirilgan, ixtiyoriy (P14).
- **Foydalanuvchi qurilmasi va brauzeri.** Brauzer ma'lumotlarini tozalash, qurilma nosozligi — laboratoriya eksport / zaxira bilan boshqaradi.
- **Bosma hisobotning ko'rinishi real printerda** — ko'rilmagan.

## 3. Xavf bahosi

Xavflar reyestri — `docs/RISKS.md` (kod joyi va holati bilan). Quyida validatsiya uchun eng muhimlari; holat faqat `docs/RISKS.md` dan.

| ID | Qisqa mazmun | Holat |
|---|---|---|
| R-01 | Etalon ma'lumotlar va testlar | fixture'lar `tests/fixtures/` da; testlar P01 da (`tests/cases/`, `tests/fixture-refs.test.js`) |
| R-02 | Sezgirlik koeffitsiyentlari: sonli hosila, c = 0 | yopildi (P03): simvolik hosila, `c_zero` / `c_nan`, 2-tartibli hadlar diagnostikasi |
| R-03 | t-kvantil, ν qoidasi | yopildi (P03) |
| R-04 | Yaxlitlash qayerda bajariladi | yopildi (dvigatel qismi, P03): `src/report/rounding.js` |
| R-05 | Bosma hisobotda ogohlantirishlar | yopildi (P05a) |
| R-06 | Monte-Karlo generatori va urug' | yopildi (P06); qoldiq — R-23 |
| R-07 | Muvofiqlik \|y\| ni xato deb olishi | yopildi (P05a, P05b) |
| R-09 | `localStorage`: versiya va migratsiya | qisman yopildi (P04): joriy sessiya hali `uc_state_v2` da; lokal audit — faqat buzilishni aniqlash |
| R-17 | Me'yoriy hujjatlar to'liq emas | qisman: ISO/IEC 17025:2017 repoda yo'q (pullik) |
| R-19 | Regressiya: unverified usullar, loyiha qarorlari | ochiq — egasi tasdig'i va manba misoli kutiladi |
| R-20 | Top-down: ISO 21748 qismi | qarorlar tasdiqlangan; ochiq — faqat ISO 21748 manbasi |
| R-21 | Maxsus rejimlar: BETA modullar | ochiq — BETA manbalari (egasi) |
| R-22 | Hisobot shakllari, qaror qoidasi, import / eksport | ochiq: rekvizitlar ro'yxati, GOST ekvivalentligi; build identifikatori — P13 |
| R-23 | Monte-Karlo 2.0: qoldiq xavf | brauzerlararo takrorlanuvchanlik — P13; log-normal unverified |
| R-24 | Ko'p o'zgaruvchili modellar | qoldiq: oshkormas model MCM, m > 2, nuqtalararo soha; sonli tafsilotlar tasdiq kutadi |
| R-25 | Laboratoriya reestri | ochiq — faqat ISO/IEC 17025 §6.4–6.5, §7.7.1 (pullik) |
| R-26 | PT va usul validatsiyasi | egasi qarorini kutadi; ISO 13528 / 5725-2 pullik |
| R-S1 | Firestore qoidalari | kodda yopildi; konsolga joylash — egasi qadami (joylanmaguncha ochiq deb hisoblanadi) |
| R-S2…R-S5 | Super-admin paroli, ochiq parollar, sessiya, XSS | yopildi / kodda yopildi (P02); eski parollar oshkor deb hisoblanadi |
| R-15 | Biznes mantiq mijoz tomonda | qisman: trial hisoblagichi va xodimlar limiti hali mijozda |

## 4. Qabul mezonlari

Versiya quyidagilarning **hammasi** bajarilganda qabul qilinadi:

1. `npm test` yashil (CI: `.github/workflows/test.yml`).
2. **9 ta etalon Excel nuqtasi** (zichlik 1 + gazoanalizator 3 + termometr 5) o'zgarmagan va **10-test** (`excel-gas-p2-mc`) o'tadi. Kutilgan qiymatlar Excel katagi / qo'llanma iqtibosidan har safar qayta o'qiladi (`tests/fixture-refs.test.js`).
3. `tests/cases/` dagi barcha **verified** misollar o'tadi (hozir 90 verified, 2 unverified; todo farqlar — D-03, D-05, `tests/cases/DISCREPANCIES.md`).
4. 9 ta etalon nuqtada `error` darajasidagi linter topilmasi yo'q (`tests/engine/linter-fixtures.test.js`).
5. **RTM da bog'lanmagan talab yo'q** (`tests/validation/rtm.test.js`; `scripts/rtm.js`).
6. **Dvigatel xeshi** mos: `src/engine/` va `src/report/` fayllarining SHA-256 xeshi `tests/security/engine.sha256.json` bilan bir xil (`tests/security/static.test.js`); o'zgargan bo'lsa — `ENGINE_VERSION` va `CHANGELOG.md` yangilangan.
7. **Regressiya nazorati:** `scripts/cases-snapshot.js` bilan oldingi versiyaga nisbatan bit darajasidagi solishtiruv; har bir farq `CHANGELOG.md` da izohlangan ([CHANGE_CONTROL.md](CHANGE_CONTROL.md) §3).
8. **Brauzerlararo mezon (egasi qarori B, 2026-11-19, R-24)** — `tests/crossbrowser/` (Playwright: Chromium, Firefox, WebKit; `npm run test:browsers`):
   - R(0, 1) ketma-ketligi bit darajasida bir xil;
   - turli JS dvigatellarida xom qiymatlarning nisbiy farqi ≤ 1·10⁻¹⁴; o'lchangan qiymat validatsiya hisobotida yoziladi. Shartlanganligi yomon hosila kattaliklar (deyarli singular matritsaning eng kichik xos qiymati, nolga yaqin korrelyatsiya, sonli hosila tekshiruvi) uchun bu chegara bajarilmaydi (o'lchangan maks. 3,4·10⁻¹¹): ular aniq istisnolar ro'yxatida — `tests/crossbrowser/exceptions.json` (har bir band sababi bilan, yuqori chegara 10⁻⁹); ro'yxat **egasi tasdig'ini kutadi** (`docs/RISKS.md` R-27 (1));
   - hisobot qatlamida yaxlitlangan y, U, k va interval uchlari **aynan** bir xil.
   Dvigatelning o'z `log` / `sin` / `cos` nusxasi (fdlibm) qilinmaydi. Linux dagi WebKit — Safari emas: Safari (macOS / iOS) PQ da qo'lda tekshiriladi.

Unverified va BETA qismlar qabul mezoniga kirmaydi: ular natijada va hisobotda belgi bilan chiqadi, [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) da sanab o'tilgan.

## 5. IQ / OQ / PQ yondashuvi

| Bosqich | Kim | Nima tekshiriladi | Dalil |
|---|---|---|---|
| **IQ** — o'rnatish | egasi (deploy), laboratoriya (o'z brauzerida) | saytga chiqqan build testdan o'tgan commit bilan bir xil: `build.json` dagi `commit` / `shortSha`, `engineVersion`, `engineHash`; modul havolalarida `?v=<shortSha>`; yangi versiya chiqsa brauzerda banner (avtomatik qayta yuklash yo'q) | `docs/DEPLOY.md`; `build.json`; bosma hisobot pastki qismidagi versiya va build |
| **OQ** — ishlash | ishlab chiquvchi (avtomatik) | §4 dagi barcha mezonlar | `scripts/validation-report.js` → `validation-report.html` (skriptsiz) va `validation-report.json`; CI da artifact; deploy'da saytning `validation/` papkasida; saytdagi `validation.html` sahifasi |
| **PQ** — laboratoriyada | laboratoriya | o'z metodikasi bo'yicha platforma natijasini mustaqil hisob (Excel, qo'lda, boshqa dastur) bilan solishtirish; o'z brauzeri (jumladan Safari) da | to'ldirilgan [PQ_PROTOCOL_TEMPLATE.md](PQ_PROTOCOL_TEMPLATE.md) |

Tashqi dasturlar bilan o'zaro tekshiruv:

- **NIST Uncertainty Machine** — `tests/crosscheck/num/` da 5 misol uchun kirish ma'lumotlari va README tayyor; natijalarni egasi NUM da ishga tushirib beradi. Holat: **`pending`** — solishtiruv hali bajarilmagan. NUM qo'llanmasi repoda yo'q (unverified).
- **PTB TraCIM** — qilinmagan (rejalashtirilgan).

Laboratoriya talablarini yozish uchun — [USER_REQUIREMENTS_TEMPLATE.md](USER_REQUIREMENTS_TEMPLATE.md).

## 6. Rollar

| Rol | Vazifasi |
|---|---|
| **Egasi** | metrologik qarorlarni tasdiqlaydi (variantlar yozma taqdim etiladi); me'yoriy manbalarni `docs/references/` ga qo'shadi; PR'ni tasdiqlaydi; Firebase konsoli va deploy sozlamalarini bajaradi; NUM natijalarini taqdim etadi |
| **Ishlab chiquvchi** | o'zgarishni [CHANGE_CONTROL.md](CHANGE_CONTROL.md) tartibida bajaradi; test misolini asl manbadan yozadi; noaniq metrologik qarorda o'zi tanlamaydi — variantlarni yozib so'raydi |
| **Laboratoriya (foydalanuvchi)** | talablarini belgilaydi (URS); PQ o'tkazadi; shablonni o'z metodikasi bo'yicha tekshirib APPROVED qiladi; ma'lumotlarini eksport qilib saqlaydi; cheklovlar bilan tanishadi |
| **Akkreditatsiya eksperti** | paketni ko'rib chiqadi: [ASSESSOR_FAQ.md](ASSESSOR_FAQ.md), validatsiya hisoboti, RTM, laboratoriyaning PQ bayonnomasi |

Dastur ichidagi rollar (`superadmin`, `admin`, `employee`, `guest`) — alohida mavzu: `docs/SECURITY_SETUP.md`, `firestore.rules`, `src/storage/registry.js::canEditRegistry`.

## 7. Hujjatlar ro'yxati (`docs/validation/`)

| Fayl | Mazmuni | Kim yuritadi |
|---|---|---|
| [VALIDATION_PLAN.md](VALIDATION_PLAN.md) | shu hujjat | ishlab chiquvchi, egasi |
| [REQUIREMENTS.md](REQUIREMENTS.md) | talablar (ID: `REQ-<SOHA>-NNN`) | ishlab chiquvchi |
| `rtm.map.json` | talab → kod → test xaritasi | ishlab chiquvchi |
| [RTM.md](RTM.md) | izlanuvchanlik matritsasi — `scripts/rtm.js` yaratadi (qo'lda tahrirlanmaydi) | avtomatik |
| [CHANGE_CONTROL.md](CHANGE_CONTROL.md) | o'zgarishlarni boshqarish tartibi | ishlab chiquvchi, egasi |
| [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) | ma'lum cheklovlarning yagona ro'yxati | ishlab chiquvchi |
| [PQ_PROTOCOL_TEMPLATE.md](PQ_PROTOCOL_TEMPLATE.md) | PQ bayonnomasi shabloni | laboratoriya to'ldiradi |
| [USER_REQUIREMENTS_TEMPLATE.md](USER_REQUIREMENTS_TEMPLATE.md) | foydalanuvchi talablari (URS) shabloni | laboratoriya to'ldiradi |
| [ASSESSOR_FAQ.md](ASSESSOR_FAQ.md) | ekspert savollari va javoblari | ishlab chiquvchi |

Bog'liq hujjatlar: `docs/VALIDATION_MATRIX.md` (P01 dan yuritilgan batafsil matritsa), `docs/RISKS.md`, `tests/cases/DISCREPANCIES.md`, `docs/LINTER_RULES.md`, `docs/ENGINE_API.md`, `docs/DEPLOY.md`, `CHANGELOG.md`, foydalanuvchi qo'llanmasi `docs/manual/{uz,ru,en}.md`.
