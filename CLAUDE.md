# CLAUDE.md — UncertaintyCalc uchun majburiy qoidalar

UncertaintyCalc — o'lchash noaniqligini JCGM 100:2008 (GUM) va ISO/IEC 17025:2017 bo'yicha hisoblaydigan brauzer platformasi. Vanilla JavaScript SPA, GitHub Pages'da joylashgan, interfeys 3 tilda (uz/ru/en). Firebase faqat ro'yxatdan o'tish, tashkilotlar va to'lov uchun.

Bu qoidalar barcha sessiyalar uchun majburiy. Ular bilan zid ko'rsatma bo'lsa — to'xtab, egasidan so'ra.

Asosiy hujjatlar: [docs/PLAN.md](docs/PLAN.md) (bosqichlar), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (joriy tuzilma), [docs/RISKS.md](docs/RISKS.md) (xavflar), [docs/references/](docs/references/) (me'yoriy manbalar).

## Metrologik qoidalar

- Hisoblash yadrosi (`src/engine/`) DOM'ga, `window`'ga va `localStorage`'ga bog'liq bo'lmagan sof ES modullaridan iborat. U brauzerda ham, Node'da ham ishlaydi.
- Oraliq hisoblar yaxlitlanmaydi. Yaxlitlash faqat hisobot qatlamida bajariladi: U ko'pi bilan 2 ta qiymatli raqam (ILAC P14 §5), y esa U ning oxirgi xonasigacha.
- Har bir formula va qoidaning ustida manba izohi bo'ladi: `// Ref: JCGM 100:2008 §5.1.2`
- Kalibrlanayotgan asbobning MPE'si hech qachon avtomatik ravishda noaniqlik manbai bo'lmaydi.
- U = 0 yoki U < CMC bo'lgan natija ogohlantirishsiz hisobotga chiqmaydi.
- Yangi metrologik funksiya kamida bitta manbadan olingan test misolisiz birlashtirilmaydi (merge).
- Test misolining kutilgan qiymatlari FAQAT asl manbadan (`docs/references/` yoki laboratoriya Excel'i) olinadi. Gemini hisobotidagi (`docs/audit/gemini-audit-2026-11.md`) raqamlar "unverified" holatida bo'ladi, manba bilan solishtirilmaguncha majburiy test bo'lmaydi.
- Me'yoriy hujjatlarning nashrlari: JCGM 100:2008, JCGM 101:2008, JCGM 102:2011, JCGM 106:2012, JCGM GUM-6:2020, EA-4/02 M:2022, ILAC P14:09/2020, ILAC G8:09/2019, COOMET R/GM/32:2017. Boshqa nashrga havola qilishdan oldin uni `docs/references/` da tekshir.

## Muhandislik qoidalari

- Framework yo'q, vanilla JS (ES modules). Tashqi kutubxonalar faqat `vendor/` papkasida, aniq versiya va litsenziyasi bilan.
- Barcha foydalanuvchi matnlari i18n orqali va 3 tilda (uz/ru/en) bo'ladi. Yangi matn kalitining 3 ta tarjimasi bo'lmasa, test xato beradi.
- `innerHTML`'ga foydalanuvchi ma'lumoti escape qilinmasdan qo'yilmaydi.
- Har bir bosqich alohida branch'da bajariladi, kichik commit'lar qilinadi va oxirida PR ochiladi.
- Har bir PR'dan oldin `npm test` o'tishi va 9 ta etalon Excel nuqtasi o'zgarmagan bo'lishi shart.
- Dvigatel versiyasi (`ENGINE_VERSION`, semver) hisoblash natijasiga ta'sir qiladigan har qanday o'zgarishda oshiriladi va `CHANGELOG.md` da qayd etiladi.
- Eski `localStorage` ma'lumotlari migratsiya funksiyasi orqali yangi formatga o'tkaziladi va yo'qolmaydi.
- Shaxsiy ma'lumotlar (F.I.Sh., telefon, email, STIR/INN) yangi joyga, jumladan Firebase'ga, qo'shimcha yozilmaydi.

## Ish uslubi

- Har bir bosqich boshida `docs/PLAN.md` va shu fayl qayta o'qiladi.
- Noaniq metrologik qarorda (manbalar bir-biriga zid bo'lsa) o'zing tanlama. Variantlarni yoz va so'ra.
- Bosqich oxirida qisqa hisobot ber: nima qilindi, qanday tekshirildi, nima qoldi.

## Joriy holat bo'yicha eslatmalar (P00, 2026-11-11)

Bu bo'lim qoidalarni bekor qilmaydi — faqat ular hozir qayerda bajarilmasligini ko'rsatadi. Tegishli bosqich tugagach yangilanadi.

- `src/engine/` hali yo'q: dvigatel `src/js/calc.js` da (IIFE, `window.Calc` + `module.exports`). Ajratish — PLAN P03.
- `package.json` va `npm test` hali yo'q. Hozircha: `node tests/verify-excel.js` (8 ta assert: gaz 3 + termometr 5; MC faqat konsolga). "9 ta etalon nuqta"ning 9-si egasi bilan aniqlanishi kerak (PLAN, savol 3). Test infratuzilmasi — PLAN P01.
- Etalon Excel fayllar va qo'llanmalar repoda yo'q; kutilgan qiymatlar `tests/verify-excel.js:7-8` da.
- `docs/references/` da hozir bor: JCGM 100:2008, JCGM 101:2008, EA-4/02 M:2022, EURACHEM/CITAC QUAM 2012, Nordtest TR 537 ed.4. **Yo'q:** JCGM 102, JCGM 106, JCGM GUM-6, ILAC P14, ILAC G8, COOMET R/GM/32 — ularga havola qilingan kod manba qo'shilmaguncha "tekshirilmagan" deb hisoblanadi.
- Yaxlitlash hozir dvigatel ichida (`Calc.roundResult`) — qoidaga zid, P03/P05 da ko'chiriladi.
- Ochiq kritik xavfsizlik masalalari (super-admin paroli mijoz kodida, `rawPwd`, imzosiz sessiyalar, Firestore qoidalari) — RISKS R-S1…R-S5, PLAN P02. Bu kodga tegadigan har qanday ish ularni yomonlashtirmasligi kerak.
- Pullik ISO/GOST standartlarini repoga joylama (`docs/references/README.md`).
