# UncertaintyCalc — rivojlantirish rejasi P01–P13

> **Holat: TAKLIF (P00).** Topshiriqda "P01–P13 bosqichlari (pastda)" deyilgan edi, lekin bosqichlar ro'yxatining o'zi xabarda yo'q edi. Quyidagi ro'yxat loyiha maqsadlari va [RISKS.md](RISKS.md) asosida tuzildi. Egasi tasdiqlamaguncha yoki o'z ro'yxatini bermaguncha P01 boshlanmaydi.
>
> Har bir bosqich: alohida branch (`feat/pNN-…` yoki `fix/pNN-…`), kichik commit'lar, oxirida PR. PR'dan oldin `npm test` o'tadi va etalon Excel nuqtalari o'zgarmaydi (CLAUDE.md).
> Bosqich boshida shu fayl va `CLAUDE.md` qayta o'qiladi.

## Maqsadli arxitektura (qisqacha)

```
src/engine/        sof ES modullar (DOM/window/localStorage yo'q), Node + brauzer
  version.js       ENGINE_VERSION (semver)
  parse/           tokenizer, AST, kompilyatsiya, simvolik hosila
  stats/           A tur, t-taqsimot, maxsus funksiyalar
  gum/             B tur, propagatsiya, ν_eff, k, korrelyatsiya
  mc/              RNG, taqsimotlar, MCM, adaptiv M
  topdown/ regression/ micro/ sampling/ qualitative/ qc/ pt/   (keyingi bosqichlar)
  conformity/      qaror qoidalari
src/report/        yaxlitlash (ILAC P14), hisobot modeli, chop etish
src/storage/       localStorage sxemasi, versiya, migratsiyalar, eksport/import
src/ui/            hozirgi table/typeB/report/app (faqat DOM)
vendor/            tashqi kutubxonalar (versiya + LICENSE)
tests/             node:test; fixtures/ (Excel va manbalar), golden/
```

Bog'liqlik yo'nalishi: `ui → report → engine`, `ui → storage`. `engine` hech narsaga bog'liq emas.

---

## P01 — Test poydevori va etalonlarni muzlatish

**Maqsad:** keyingi har qanday o'zgarishni o'lchab bo'ladigan qilish. Hisoblash natijasi o'zgarmaydi.

- **Fayllar:** `package.json` (yangi, bog'liqliksiz; `"test": "node --test tests/"`), `tests/golden/excel.test.js` (hozirgi `verify-excel.js` asosida), `tests/fixtures/` (Excel fayllar yoki ulardan olingan qiymatlar + manba havolasi), `tests/i18n.test.js` (har bir kalit 3 tilda), `tests/presets.test.js` (preset = fixture), `CHANGELOG.md`, `src/engine/version.js` yoki `calc.js` ga `ENGINE_VERSION = '1.0.0'`, `.github/workflows/test.yml` (ixtiyoriy).
- **Tekshiruv chuqurligi:** `resultText` dan tashqari u_c, ν_eff, k, c_i, byudjet ulushlari, muvofiqlik holati — nisbiy tolerantlik bilan (masalan 1e-9 o'zimizning oldingi natijaga, Excel'ga esa Excel ko'rsatgan aniqlikda). MC uchun assert (seed qat'iy bo'lgani uchun aniq qiymat).
- **Nima buzilishi mumkin:** hech narsa (faqat test qo'shiladi). Xavf — Excel'dan noto'g'ri ko'chirilgan qiymat "etalon" bo'lib qolishi; shuning uchun har bir qiymat yonida fayl/varaq/katak havolasi.
- **Qanday tekshiriladi:** `npm test` yashil; ataylab `calc.js` da bitta konstantani o'zgartirib testlar qizarishini ko'rish (mutatsiya tekshiruvi), keyin qaytarish.
- **Bog'liq xavflar:** R-01, R-11, R-17.

## P02 — Xavfsizlik va shaxsiy ma'lumotlar (shoshilinch)

**Maqsad:** RISKS dagi K darajali xavfsizlik muammolarini yopish. Hisoblash dvigateliga tegmaydi.

- **Fayllar:** `src/js/firebase-config.js` (SUPER_ADMIN olib tashlanadi), `src/js/auth.js` (Firebase Authentication'ga o'tish yoki hech bo'lmasa server tomon tekshiruv; `rawPwd` yozilmaydi), `src/js/db.js`, `admin.html`, `superadmin.html`, `index.html` (escape, inline `onclick` → `addEventListener`), `src/js/app.js` (`showToast` → `textContent`), yangi `src/ui/escape.js` (yagona `escHtml`, `'` bilan), `firestore.rules` (yangi, repoda), `vendor/firebase/` (SDK + LICENSE) yoki SRI, CSP `<meta>`.
- **Mavjud ma'lumot:** Firestore'dagi `rawPwd` maydonlarini o'chirish migratsiyasi; super-admin parolini almashtirish (u allaqachon ochiq tarqalgan).
- **Nima buzilishi mumkin:** mavjud foydalanuvchilar login qila olmay qolishi (xesh sxemasi o'zgarsa — parolni qayta o'rnatish oqimi kerak); admin paneli xodim parolini ko'rsata olmaydi (UX o'zgaradi); qat'iy Firestore qoidalari superadmin'ni bloklashi; CSP Google Fonts/Firebase'ni bloklashi.
- **Qanday tekshiriladi:** XSS regressiya testi (komponent nomi `<img src=x onerror=…>` → ekranda matn sifatida); Firebase Emulator'da qoidalar testi (anonim o'qish rad etiladi, boshqa tashkilot hujjati rad etiladi); `localStorage` ga soxta `uc_session` yozib, admin ma'lumoti olinmasligini tekshirish; `npm test` va etalon nuqtalar o'zgarmagan.
- **Bog'liq xavflar:** R-S1…R-S5, R-14, R-15. Yangi shaxsiy maydon qo'shilmaydi.

## P03 — Dvigatelni `src/engine/` ga ajratish va sonli aniqlik

**Maqsad:** `calc.js` ni sof ES modullarga bo'lish, UI'dagi takroriy hisoblarni olib tashlash, sonli xavflarni yopish.

- **Fayllar:** yangi `src/engine/**` (yuqoridagi tuzilma), `src/js/calc.js` → yupqa moslik qatlami (yoki o'chiriladi), `table.js`/`typeB.js`/`points.js` (hisob → engine chaqiruvi), `index.html` (`<script type="module">`), testlar.
- **Ichida:**
  1. Har bir formula ustida `// Ref: JCGM 100:2008 §…` izohi.
  2. Parser AST + **simvolik hosila** (c_i aniq), sonli hosila zaxira va o'zaro tekshiruv; c_i = 0/NaN → ogohlantirish.
  3. Nochiziqlilik ko'rsatkichi va ikkinchi tartibli hadlar (JCGM 100 5.1.2 Note) — ixtiyoriy rejim.
  4. t-kvantil: ν kasr siyosati sozlamasi (floor — standart, interpolyatsiya — ixtiyoriy), ν=5000 sakrashini yo'qotish, GUM Table G.2 bilan test.
  5. Manfiy dispersiya / |r| > 1 → xato, jimgina 0 emas.
  6. Yaxlitlash dvigateldan **chiqariladi** (natijada faqat to'liq aniqlikdagi sonlar); `resultText` hisobot qatlamida.
- **Nima buzilishi mumkin:** etalon nuqtalar (simvolik va sonli c_i farqi 1e-10 tartibida — yaxlitlashdan keyin o'zgarmasligi kerak, lekin ROUNDUP chegarasida o'zgarishi mumkin); `uc_state_v2` dagi `combined`/`points[].result` endi `resultText` siz bo'ladi → hisobot eski natijalarni ko'rsata olmaydi (P05 migratsiyasi kerak, yoki P03 ichida qayta hisoblash); GitHub Pages'da ES module MIME/yo'l muammolari; skript tartibiga bog'liq global'lar.
- **Qanday tekshiriladi:** `npm test` (P01 golden: u_c, ν, k 1e-9 gacha bir xil); `grep -r "document\|window\|localStorage" src/engine` bo'sh; engine Node'da import qilinadi; brauzerda qo'lda 11 ta preset bo'yicha natijalar P00 bilan solishtiriladi. `ENGINE_VERSION` → 2.0.0, CHANGELOG.
- **Bog'liq xavflar:** R-02, R-03, R-04, R-08, R-10, R-12.

## P04 — Ma'lumot modeli, saqlash va migratsiya

**Maqsad:** versiyali, yo'qolmaydigan va eksport qilinadigan ma'lumot.

- **Fayllar:** `src/storage/schema.js`, `src/storage/migrate.js` (`v2 → v3`, har bir keyingi versiya uchun alohida funksiya), `src/js/state.js` (yupqa qatlam), JSON eksport/import, foydalanuvchi shablonlari (`uc_templates_v1`), `tests/storage.test.js` (eski `uc_state_v2` namunalari fixture sifatida).
- **Ichida:** `schemaVersion`, natijalarga `engineVersion` va hisoblangan vaqt; dvigatel versiyasi o'zgarsa saqlangan nuqtalarni qayta hisoblash taklifi; kvota xatosini foydalanuvchiga ko'rsatish; preset/reset oldidan tasdiq + avtomatik zaxira.
- **Nima buzilishi mumkin:** foydalanuvchilarning brauzeridagi joriy ma'lumot (eng katta xavf — migratsiya xatosi ma'lumotni yo'qotadi). Shuning uchun: migratsiyadan oldin eski kalitni `uc_state_v2_backup` ga nusxalash, eski kalitni o'chirmaslik.
- **Qanday tekshiriladi:** real `uc_state_v2` namunalari (P00 dagi preset'lardan yaratilgan) → migratsiya → natija P00 bilan bir xil; eksport → import → bir xil holat; buzilgan JSON → xato xabari, ma'lumot yo'qolmaydi.
- **Bog'liq xavflar:** R-09.

## P05 — Hisobot qatlami va akkreditatsiya talablari

**Maqsad:** hisobot ILAC P14 va ISO/IEC 17025 §7.8 talablariga javob beradi va xato natijani yashirmaydi.

- **Fayllar:** `src/report/rounding.js`, `src/report/model.js` (hisobot ma'lumot modeli), `src/js/report.js` (faqat chizish), `src/js/points.js` (`uniformK` qoidasi engine/report'ga), i18n.
- **Ichida:** U — ko'pi bilan 2 qiymatli raqam (ROUNDUP dan keyin ham), y — U ning oxirgi xonasigacha; yaxlitlash qoidasi tanlovi; **U = 0 va U < CMC chop etishda bloklanadi yoki aniq belgilanadi**; barcha ogohlantirishlar hisobotda; hisobotda `ENGINE_VERSION`, seed, M, ν siyosati, qaror qoidasi; muvofiqlik — model turi (xato yoki qiymat+nominal), ILAC G8 qaror qoidalari (oddiy, himoyalangan w=U, foydalanuvchi w), JCGM 106; i18n'dan tashqari matnlarni i18n'ga o'tkazish.
- **Nima buzilishi mumkin:** etalon nuqtalarning `resultText` ko'rinishi (masalan `1.235 ± 0.100` → `1.24 ± 0.10`). Bu — metrologik qaror; **o'zgarish faqat egasi tasdiqlagandan keyin** va etalon testida alohida qayd bilan.
- **Qanday tekshiriladi:** yaxlitlash bo'yicha jadvalli testlar (manfiy, 0.5 chegarasi, 0.0999↑, U=0); hisobot snapshot testlari (HTML'dan matn); qo'lda chop etish ko'rinishi 3 tilda.
- **Bog'liq xavflar:** R-04, R-05, R-07, R-13. JCGM 106 va ILAC G8/P14 PDF'lari `docs/references/` ga qo'shilishi kerak.

## P06 — Monte-Karlo (JCGM 101:2008) to'liq

- **Fayllar:** `src/engine/mc/rng.js` (JCGM 101 C.3 talablariga mos generator, masalan kengaytirilgan Wichmann–Hill yoki Mersenne Twister, seed sozlanadi va hisobotga yoziladi), `distributions.js` (normal, t, rect, triang, arcsine, trapetsiya, egri trapetsiya, eksponensial, ko'p o'lchamli normal — Cholesky, C.5), `mcm.js` (adaptiv M, §7.9.4), Web Worker (`src/ui/mc-worker.js`).
- **Nima buzilishi mumkin:** RNG almashsa MC natijalari raqamlari o'zgaradi (assert qilingan MC golden yangilanadi — `ENGINE_VERSION` minor/major); Worker GitHub Pages'da yo'l muammolari.
- **Qanday tekshiriladi:** JCGM 101 §9 misollari (§9.2 additive model, §9.3 mass calibration, §9.4 comparison loss, §9.5 gauge block) — qiymatlar **faqat** `docs/references/JCGM_101_2008_GUM-S1_MonteCarlo.pdf` jadvallaridan; RNG uchun oddiy statistik testlar (o'rtacha, dispersiya, KS) va ma'lum seed → ma'lum ketma-ketlik; korrelyatsiyali holatda GUM bilan solishtirish.
- **Bog'liq xavflar:** R-06, R-16.

## P07 — Ko'p o'zgaruvchili modellar (JCGM 102:2011)

- **Fayllar:** `src/engine/gum/multivariate.js` (vektor chiqish, Jacobian, U_y = C U_x Cᵀ), `src/engine/mc/multivariate.js`, UI: bir nechta formula, chiqishlar kovariatsiya matritsasi, qamrov sohasi (ellips).
- **Nima buzilishi mumkin:** bir o'lchamli model API'si (P03 da vektor chiqishni hisobga olib loyihalash kerak, aks holda katta refaktor); hisobot tuzilmasi.
- **Qanday tekshiriladi:** JCGM 102:2011 misollari — **avval PDF `docs/references/` ga qo'shilishi shart**; bir o'lchamli holat P03 natijasiga teng.

## P08 — Regressiya va kalibrlash egri chiziqlari

- **Fayllar:** `src/engine/regression/` (OLS, WLS, GLS / x va y da noaniqlik — WTLS), bashorat noaniqligi, teskari bashorat (x ni y dan), UI: kalibrlash nuqtalari jadvali.
- **Nima buzilishi mumkin:** yangi modul, mavjud hisobga ta'sir qilmaydi; xavf — ISO/TS 28037 pullik, uning misollarini manbasiz test qilib bo'lmaydi.
- **Qanday tekshiriladi:** JCGM 100:2008 H.3 (termometr kalibrlash, eng kichik kvadratlar) — PDF'da bor; EURACHEM QUAM A1/A6 (kalibrlash egri chizig'i) — PDF'da bor; qo'shimcha misollar faqat egasi bergan manbalardan.

## P09 — Top-down usullar (sinov laboratoriyalari)

- **Fayllar:** `src/engine/topdown/` — Nordtest: u(R_w) ichki QC'dan, u(bias) CRM/PT/recovery'dan, u_c = √(u(R_w)² + u(bias)²); QUAM: takrorlanuvchanlik/qayta tiklanuvchanlik va recovery; validatsiya ma'lumotlaridan noaniqlik. UI: alohida "Top-down" rejimi.
- **Nima buzilishi mumkin:** mavjud GUM rejimiga ta'sir yo'q; xavf — nisbiy va absolyut noaniqlik aralashishi (konsentratsiya diapazoniga bog'liqlik).
- **Qanday tekshiriladi:** Nordtest TR 537 ed.4 misollari va EURACHEM QUAM misollari — qiymatlar faqat `docs/references/` dagi PDF'lardan (sahifa raqami bilan).

## P10 — Mikrobiologiya, namuna olish, sifatli testlar

- **Fayllar:** `src/engine/micro/` (Puasson asosidagi hisob, log₁₀ shkala, takroriy sanash), `src/engine/sampling/` (dublikat usuli, ANOVA / robust ANOVA), `src/engine/qualitative/` (sifatli test: aniqlash ehtimoli, LOD₅₀, noto'g'ri musbat/manfiy).
- **Nima buzilishi mumkin:** yangi modul; asosiy xavf — manbalar. ISO 19036 va ISO 29201 pullik; EURACHEM UfS (2019), EURACHEM qualitative guide repoda yo'q.
- **Qanday tekshiriladi:** faqat `docs/references/` ga qo'shilgan bepul manbalar misollari; qolganlari "unverified" fixture sifatida majburiy bo'lmaydi.

## P11 — Laboratoriya jarayonlari: uskunalar, CMC, ichki QC

- **Fayllar:** `src/engine/qc/` (Shewhart kartalari, nazorat chegaralari, Westgard qoidalari — Nordtest TR 569 / ISO 7870-2 manbasi kerak), uskuna reyestri (kalibrlash muddati, sertifikatdan U va k → B tur komponent sifatida avtomatik taklif, **lekin kalibrlanayotgan asbob MPE si emas**), CMC jadvali (diapazon bo'yicha, `U < CMC` tekshiruvi P05 bilan bog'lanadi). Saqlash — `src/storage/` (lokal); Firebase'ga yozilmaydi.
- **Nima buzilishi mumkin:** saqlash hajmi (localStorage ~5 MB) — IndexedDB'ga o'tish kerak bo'lishi mumkin; shaxsiy ma'lumot (uskuna mas'uli F.I.Sh.) — qo'shilmaydi.
- **Qanday tekshiriladi:** QC qoidalari bo'yicha jadvalli testlar; CMC chegarasi testlari; migratsiya testi.

## P12 — PT (malakaviy sinov) va usul validatsiyasi

- **Fayllar:** `src/engine/pt/` (z, z′, ζ, E_n — formulalar manbasi: ISO 13528 pullik, EA-4/21 yoki EURACHEM/Eurolab bepul manbalar kerak), `src/engine/validation/` (aniqlik/prezitsion, LOD/LOQ, chiziqlilik, recovery — EURACHEM "The Fitness for Purpose of Analytical Methods" kerak — repoda yo'q), hisobotlar.
- **Nima buzilishi mumkin:** yangi modul; E_n da U lar k=2 ekanligi farazi — manbadan tekshiriladi.
- **Qanday tekshiriladi:** manba misollari; P09 bilan bog'liqlik (PT natijasi → u(bias)).

## P13 — Validatsiya paketi va reliz

**Maqsad:** dasturni akkreditatsiya organi oldida himoya qilish (ISO/IEC 17025:2017 §7.11.2).

- **Fayllar:** `docs/validation/` — talablar ↔ testlar izlanuvchanlik matritsasi, har bir formula uchun manba, test hisoboti (avtomatik `npm test` natijasidan), ma'lum cheklovlar ro'yxati, versiyalar tarixi; foydalanuvchi qo'llanmasi (3 tilda); README yangilash; NIST Uncertainty Machine va (imkon bo'lsa) PTB TraCIM bilan o'zaro tekshiruv natijalari.
- **Nima buzilishi mumkin:** kod o'zgarmaydi; xavf — hujjat va kod nomuvofiqligi (shuning uchun matritsa testlardan avtomatik yig'iladi).
- **Qanday tekshiriladi:** mustaqil ko'rib chiqish (egasi yoki tashqi metrolog); har bir talab kamida bitta yashil testga bog'langan.

---

## Bosqichlar ketma-ketligi va bog'liqlik

```
P01 ─┬─ P02 (parallel bo'lishi mumkin, dvigatelga tegmaydi)
     └─ P03 ── P04 ── P05 ─┬─ P06 ── P07
                           ├─ P08
                           ├─ P09 ── P12
                           ├─ P10
                           └─ P11
                                      └── P13 (oxirida, lekin hujjatlar har bosqichda to'planadi)
```

## P01'dan oldin egasi hal qilishi kerak bo'lgan savollar

1. **Bosqichlar ro'yxati:** yuqoridagi P01–P13 sizning rejangizga mosmi yoki o'z ro'yxatingizni berasizmi? (Xabarda ro'yxat kelmagan.)
2. **Excel fayllar va qo'llanmalar:** repoda yo'q. Gaz analizatori, MS-MK-3 termometr, zichlik Excel'lari va C75.QM / MS-MK-3 qo'llanmalarini repoga (`tests/fixtures/`) qo'shish mumkinmi? Ularda mijoz/shaxsiy ma'lumot bormi?
3. **"9 ta etalon nuqta":** testda 8 ta assert bor (gaz 3 + termometr 5). 9-si qaysi — gaz 2-nuqta MC intervali, zichlik Excel'i yoki boshqa?
4. **Firestore qoidalari:** Firebase konsolida hozir qanday qoidalar turibdi? "Test mode" bo'lsa, P02 ni P03 dan oldin, zudlik bilan bajarish kerak. Super-admin paroli allaqachon ochiq — uni hoziroq almashtirish tavsiya etiladi.
5. **Autentifikatsiya yo'nalishi:** Firebase Authentication'ga o'tamizmi (mavjud foydalanuvchilar parolni qayta o'rnatadi) yoki boshqa yechim? O'RQ-547 bo'yicha shaxsiy ma'lumotlarni O'zbekistondagi serverga ko'chirish rejasi bormi?
6. **ν_eff kasr siyosati:** standart `floor` (hozirgi, Excel bilan mos) qoladimi, interpolyatsiya ixtiyoriy variant bo'ladimi?
7. **ROUNDUP va ILAC P14:** `0.0999 → 0.100` holatida `0.10` ko'rsatamizmi? Bu etalon natijalar ko'rinishini o'zgartirishi mumkin. y uchun yaxlitlash qoidasi (half-up / half-even)?
8. **Manbalar:** JCGM 102:2011, JCGM 106:2012, JCGM GUM-6:2020, ILAC P14:09/2020, ILAC G8:09/2019, COOMET R/GM/32:2017 PDF'larini `docs/references/` ga kim qo'shadi? Pullik ISO hujjatlarga (ISO/TS 28037, ISO 21748, ISO 13528, ISO 19036) tayanadigan funksiyalar uchun test manbasi nima bo'ladi?
9. **Brauzerni qo'llab-quvvatlash:** ES modules talab qilinadi (2018+ brauzerlar). Eski brauzerlar (masalan, laboratoriyadagi eski Windows) kerakmi?
