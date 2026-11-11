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

## Egasi qabul qilgan metrologik qarorlar

- **Yaxlitlash (hisobot qatlamida):** U ko'pi bilan 2 ta qiymatli raqam; yuqoriga yaxlitlashdan keyin ham 2 ta qoladi — 0,0999 → **0,10** (0,100 emas). y — **round half away from zero** (Excel ROUND bilan mos): −0,125 → −0,13; y U ning oxirgi xonasigacha.
- **ν_eff kasr bo'lsa:** standart qoida `floor` (Excel bilan mos); `interpolate` — ixtiyoriy laboratoriya sozlamasi. Qo'llanilgan qoida hisobotda yoziladi (Ref: JCGM 100:2008 G.4.1 Note 1).
- Etalon nuqtalar ko'rinishi **faqat** yuqoridagi ikki yaxlitlash qoidasi tufayli o'zgarishi mumkin; har bir bunday o'zgarish `CHANGELOG.md` da va test izohida alohida yoziladi. Boshqa har qanday farq — xato.
- Pullik ISO standartlariga tayanadigan funksiyalar uchun test manbasi: ochiq manbalar (GTC/MSL, NIST), egasi bergan laboratoriya misollari yoki mustaqil qo'lda hisob (Excel). Manba aniq bo'lmaguncha `unverified`.
- Brauzerlar: ES modules (2018+); eski brauzerga faqat oddiy ogohlantirish.

## Joriy holat bo'yicha eslatmalar (2026-11-11)

Bu bo'lim qoidalarni bekor qilmaydi — faqat ular hozir qayerda bajarilmasligini ko'rsatadi. Tegishli bosqich tugagach yangilanadi.

- **Bajarish tartibi:** P02 (xavfsizlik) → P01 → P03 → … (`docs/PLAN.md`). Bosqichlarning batafsil talablari — [docs/prompts/ClaudeCode_promptlar.md](docs/prompts/ClaudeCode_promptlar.md); u faylda raqamlash boshqacha, moslik jadvali `docs/PLAN.md` da. Zid bo'lsa `docs/PLAN.md` va egasining javoblari ustun.
- **Etalon fayllar `tests/fixtures/` da** (README bilan): `Zichlik_noaniqligi_hisobi.xlsx`, `Noaniqlik_hisobi_gazoanalizator_KEDR-07.xlsx`, `Noaniqlik_hisobi_termometr_MS-MK-3.xlsx`, `Qollanma_noaniqlik_gazoanalizator_C75QM.docx`, `Qollanma_noaniqlik_termometr_MS-MK-3.docx`. Kutilgan qiymatlar faqat shulardan, **katak havolasi bilan**. `.xlsx` o'qish kutubxonasi faqat devDependency bo'lishi mumkin (saytga yuklanmaydi). Termometr kuzatuvlari — o'quv namunasi, real laboratoriya ma'lumoti emas.
- **9 ta etalon nuqta** = zichlik 1 + gazoanalizator 3 + termometr 5. **10-test** — gazoanalizator 2-nuqta MC intervali `[−0,0111; 0,0469]` (qo'llanmadan).
- `package.json` va `npm test` hali yo'q. Hozircha `node tests/verify-excel.js` (8 ta assert, zichlik yo'q; fayl nomi `…gazoanalizator.xlsx` fixture nomiga mos emas). P02 minimal `npm test` qo'shadi, to'liq format — P01.
- `src/engine/` hali yo'q: dvigatel `src/js/calc.js` da (IIFE, `window.Calc` + `module.exports`). Ajratish — PLAN P03.
- Yaxlitlash hozir dvigatel ichida (`Calc.roundResult`), ROUNDUP 0,0999 → `0.100` va `Math.round` (−0,125 → −0,12) bilan — yuqoridagi qarorlarga zid; P03 da `src/report/rounding.js` ga ko'chiriladi.
- `docs/references/` da hozir bor: JCGM 100:2008, JCGM 101:2008, EA-4/02 M:2022, EURACHEM/CITAC QUAM 2012, Nordtest TR 537 ed.4. **Egasi qo'shadi:** JCGM 102, JCGM 106, JCGM GUM-6, ILAC P14, ILAC G8, EURACHEM UfS, NIST Uncertainty Machine qo'llanmasi, COOMET R/GM/32. Qo'shilmaguncha ularga havola qilingan kod "tekshirilmagan" deb hisoblanadi.
- Ochiq kritik xavfsizlik masalalari (super-admin paroli mijoz kodida, `rawPwd`, imzosiz sessiyalar, Firestore qoidalari) — RISKS R-S1…R-S5, PLAN P02. Firestore eng yomon holatda ("test mode", ochiq) deb hisoblanadi. Firebase konsolidagi amallarni egasi bajaradi — Claude faqat fayl va yo'riqnoma (`docs/SECURITY_SETUP.md`) tayyorlaydi.
- Autentifikatsiya Firebase Authentication'ga o'tadi (P02). Shaxsiy ma'lumotlarni O'zbekistondagi serverga ko'chirish — P15. Ungacha yangi shaxsiy maydon qo'shilmaydi, mavjudlari minimallashtiriladi.
- Pullik ISO/GOST standartlarini repoga joylama (`docs/references/README.md`).
