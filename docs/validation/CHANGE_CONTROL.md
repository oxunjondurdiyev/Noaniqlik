# O'zgarishlarni boshqarish

> Bu hujjat `CLAUDE.md` dagi majburiy qoidalarni va `CHANGELOG.md` dagi amaliyotni bir joyga yig'adi. Yangi qoida kiritmaydi: zid kelsa `CLAUDE.md`, `docs/PLAN.md` va egasining javoblari ustun.
> ISO/IEC 17025:2017 §7.11.2 — **(unverified — hujjat repoda yo'q)**.

## 1. Versiya (`ENGINE_VERSION`, semver)

Yagona joy — `src/engine/version.js`. Qoida (`CLAUDE.md`): **hisoblash natijasiga ta'sir qiladigan har qanday o'zgarishda versiya oshiriladi va `CHANGELOG.md` da qayd etiladi.** Har bir saqlangan hisob va `uc-calc/1` hujjati o'zi hisoblangan `engineVersion` ni saqlaydi.

Major / minor / patch chegarasi alohida hujjatda ta'riflanmagan; quyidagi jadval — `CHANGELOG.md` dagi mavjud amaliyot.

| Daraja | Amalda qachon qo'llangan | Misol (`CHANGELOG.md`) |
|---|---|---|
| **major** | API va natija tuzilmasi o'zgargan | 1.0.0 → 2.0.0 (P03): dvigatel `src/engine/` ga ajratildi; natijada `Uround` / `yround` / `resultText` yo'q; k tanlash qoidasi (Q-1(a)), normal kvantil, simvolik hosila |
| **minor** | yangi imkoniyat; mavjud rejimlar natijasi o'zgarmagan (bit darajasidagi solishtiruv bilan) | 2.1.0 (P08, regressiya) … 2.10.0 (P12, PT va usul validatsiyasi) |
| **patch** | tor doiradagi o'zgarish; y, u_c, ν_eff, k, U o'zgarmagan | 2.5.1 — faqat ikki topilma darajasi va bitta yangi kod; 2.8.1 — faqat QC kartalari (D₄, n = 3 va 5) va Westgard topilmalari |

Eslatma: 2.6.0 (P06) minor deb belgilangan, garchi Monte-Karlo raqamlari o'zgargan bo'lsa ham (yangi generator); LPU natijalari bayt darajasida o'zgarmagan, eski MCM natijasi `rng: 'xorshift32-legacy'` bilan aynan takrorlanadi (`tests/engine/mc-legacy.test.js`). Mavjud natijani o'zgartiradigan o'zgarish major yoki minor bo'lishi haqida yozma qoida hozircha yo'q — egasi belgilaydi (`docs/RISKS.md` R-27 (5)); qaror qabul qilinguncha amaldagi tajriba qo'llanadi: bunday o'zgarish CHANGELOG da bosh harflar bilan alohida ko'rsatiladi.

`CHANGELOG.md` yozuvida majburiy: eski → yangi versiya; natijaga ta'siri (nima o'zgardi, nima o'zgarmadi); 9 etalon nuqta va 10-test holati; yangi test misollari manbasi bilan; egasi qarorini kutayotgan bandlar.

## 2. Hisobga ta'sir qiluvchi o'zgarish tartibi

1. **Bosqich boshida** `docs/PLAN.md` va `CLAUDE.md` qayta o'qiladi.
2. **Alohida branch** (har bir bosqich — o'z branch'ida), **kichik commit'lar**.
3. **Test misoli manbadan** (§5). Yangi metrologik funksiya kamida bitta manbadan olingan test misolisiz birlashtirilmaydi.
4. Har bir formula va qoida ustida **manba izohi** (`// Ref: JCGM 100:2008 §5.1.2`). Boshqa nashrga havola qilishdan oldin u `docs/references/` da tekshiriladi; repoda yo'q hujjat — "(unverified)".
5. **`ENGINE_VERSION`** oshiriladi (§1), **`CHANGELOG.md`** yoziladi.
6. **Dvigatel xeshi:** `src/engine/` yoki `src/report/` o'zgarsa — `node tests/tools/engine-hash.js --write` (`tests/security/engine.sha256.json`). Xesh mos kelmasa `tests/security/static.test.js` yiqiladi.
7. **Talablar:** yangi yoki o'zgargan talab `docs/validation/REQUIREMENTS.md` va `rtm.map.json` ga kiritiladi; `scripts/rtm.js` `RTM.md` ni qayta yaratadi. Bog'lanmagan talab — `npm test` xatosi (`tests/validation/rtm.test.js`).
8. **`npm test`** o'tadi; 9 ta etalon Excel nuqtasi o'zgarmagan (§4).
9. **Regressiya solishtiruvi** (§3).
10. **PR** ochiladi; **egasi tasdiqlaydi**.
11. Bosqich oxirida qisqa hisobot: nima qilindi, qanday tekshirildi, nima qoldi. `CLAUDE.md` dagi "Joriy holat" bo'limi, `docs/RISKS.md`, `docs/VALIDATION_MATRIX.md` va [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) yangilanadi.

Hisobga ta'sir qilmaydigan o'zgarish (matn, CSS, hujjat) — 1, 2, 8, 10-qadamlar; yangi foydalanuvchi matni — uch tilda (`tests/i18n.test.js`).

## 3. Regressiya talabi

- `scripts/cases-snapshot.js` `tests/cases/` dagi barcha misollarning to'liq natijasini saqlaydi va ikki holatni (o'zgarishdan oldin va keyin) **bit darajasida** solishtiradi.
- Natija **PR tavsifida** yoziladi: nechta misol solishtirildi, qaysi commit bilan, farq bor-yo'qligi.
- Kutilgan farq faqat `engineVersion` maydoni va yangi qo'shilgan maydonlar bo'lishi mumkin. Boshqa har qanday farq — yoki xato, yoki `CHANGELOG.md` da alohida izohlangan, versiya oshirilgan o'zgarish.
- `CHANGELOG.md` da shu amaliyot 2.1.0 dan beri yuritiladi (masalan 2.10.0: 91 ta misol 2.9.0 bilan bit darajasida bir xil).

## 4. Etalon nuqtalar

- 9 ta etalon nuqta = zichlik 1 + gazoanalizator 3 + termometr 5; 10-test — gazoanalizator 2-nuqta MC intervali (`excel-gas-p2-mc`).
- Kutilgan qiymatlar **faqat** `tests/fixtures/` dagi fayllardan, **katak havolasi bilan**; `tests/fixture-refs.test.js` ularni har safar fayldan qayta o'qiydi.
- Etalon nuqtalar **ko'rinishi** faqat egasi qabul qilgan ikki yaxlitlash qarori tufayli o'zgarishi mumkin (U — ko'pi bilan 2 qiymatli raqam, 0,0999 → 0,10; y — round half away from zero, −0,125 → −0,13). Har bir bunday o'zgarish `CHANGELOG.md` da va test izohida alohida yoziladi. **Boshqa har qanday farq — xato.**
- 9 ta etalon nuqtada `error` darajasidagi linter topilmasi chiqmasligi shart; chiqsa — qoida o'zgartirilmaydi, egasidan so'raladi.
- Qo'llanmadagi qiymat (10-test) o'zgartirilmaydi; tolerans sababi test izohida va D-04 da.

## 5. Test misoli manbasi

- Kutilgan qiymatlar **faqat asl manbadan**: `docs/references/` dagi hujjat (sahifa / jadval havolasi bilan) yoki laboratoriya Excel'i (katak havolasi bilan).
- Gemini hisoboti (`docs/audit/gemini-audit-2026-11.md`) dagi raqamlar — **unverified**: asl manba bilan solishtirilmaguncha majburiy test bo'lmaydi (solishtiruv natijalari — `tests/cases/DISCREPANCIES.md` C bo'limi).
- Pullik ISO standartlariga tayanadigan funksiyalar uchun manba: ochiq manbalar (GTC / MSL, NIST), egasi bergan laboratoriya misollari yoki mustaqil qo'lda hisob (Excel). Manba aniq bo'lmaguncha — `unverified` (natijada va hisobotda belgi bilan).
- Pullik ISO / GOST standartlari repoga joylanmaydi (`docs/references/README.md`).
- Manba bilan farq topilsa — `tests/cases/DISCREPANCIES.md` ga D-ID bilan yoziladi (dvigatel xatosi, manba nuansi yoki Gemini ↔ manba).

## 6. Tolerans

- Tolerans manbadagi raqamlar soni (oxirgi xonaning yarmi) va — Monte-Karlo uchun — o'lchangan tarqoqlik (`tests/tools/mc-scatter.js`) bilan belgilanadi; sababi har bir misolda `tolerance.*.reason` da yoziladi.
- Tolerans **"o'tkazish uchun" kengaytirilmaydi.** Misol o'tmasa: farq sababi topiladi va `DISCREPANCIES.md` ga yoziladi; qaror kerak bo'lsa egasidan so'raladi (misol: Q-3 → 10-test toleransi δ + 2·s_ref).

## 7. Metrologik qarorlar

- Manbalar bir-biriga zid bo'lsa yoki manbada son yo'q bo'lsa, ishlab chiquvchi **o'zi tanlamaydi**: variantlar yoziladi va egasidan so'raladi.
- Vaqtincha qo'llangan standart "loyiha qarori" / "loyiha standarti" deb belgilanadi (kerak bo'lsa hisobotda ham) va tasdiq kutayotganlar ro'yxatiga kiradi: `docs/RISKS.md` (R-19…R-26), `docs/LINTER_RULES.md` §4, `tests/cases/DISCREPANCIES.md` (Q-ID).
- Egasi qarori sanasi bilan `CLAUDE.md` ga ("Egasi qabul qilgan metrologik qarorlar" yoki "Joriy holat") yoziladi.
- Yangi linter chegarasi yoki darajasi — `docs/LINTER_RULES.md` §4 ga yoziladi va egasidan so'raladi; yangi qoida — alohida modul, `ref`, ijobiy va salbiy test, uch tilda matn.

## 8. Tashqi kutubxonalar (`vendor/`)

- Tashqi kutubxonalar faqat `vendor/` da, aniq versiya, litsenziya fayli va SHA-256 bilan; CDN'dan skript yuklanmaydi (CSP `script-src 'self'`).
- Yangilashda `vendor/README.md` va `vendor/SHA256SUMS.txt` yangilanadi; `tests/security/vendor.test.js` xeshlarni tekshiradi.
- Hisobot / import kutubxonalari faqat `src/io/vendor.js` orqali, dinamik `import()` bilan yuklanadi. npm reestridagi `xlsx` paketi taqiqlangan (sababi — `vendor/README.md`).
- `.xlsx` o'qish kutubxonasi testlarda faqat devDependency (saytga yuklanmaydi).
- SheetJS CE yangilanishi qo'lda; CVE lar kuzatiladi (`docs/RISKS.md` R-14, R-22).

## 9. Deploy va build identifikatori

- Deploy — GitHub Actions orqali (`.github/workflows/deploy.yml`, `scripts/build-site.js`): `_site/` ga oq ro'yxat bo'yicha nusxa; har bir mahalliy modul havolasiga `?v=<commit SHA 12 belgi>`; `build.json` — `commit`, `shortSha`, `engineVersion`, `engineHash`, `builtAt`, `node`.
- Brauzerda yangi versiya chiqsa — banner; sahifa avtomatik qayta yuklanmaydi.
- Hisob hujjati (`uc-calc/1`) va bosma hisobotga build hamda hisoblagan muhit (brauzer qisqa nomi va versiyasi) yoziladi; to'liq userAgent saqlanmaydi; Firebase'ga yozilmaydi.
- Repodagi manba kodi build qadamisiz ham ishlaydi (lokal ishlab chiqish) — egasi qarori A (R-22 (b)).
- Egasining qadami: Pages manbasini "GitHub Actions" ga o'tkazish — `docs/DEPLOY.md`.
- Validatsiya hisoboti (`scripts/validation-report.js` → `validation-report.html`, `validation-report.json`) CI da artifact bo'lib saqlanadi va deploy'da saytning `validation/` papkasiga chiqadi.

## 10. Saqlangan ma'lumotlar

- Saqlash formati o'zgarsa — migratsiya funksiyasi (`src/storage/migrate.js`, `CALC_STATE_SCHEMA`); eski ma'lumot yo'qolmaydi; migratsiya testi majburiy.
- Shaxsiy ma'lumotlar (F.I.Sh., telefon, email, STIR / INN) yangi joyga, jumladan Firebase'ga, qo'shimcha yozilmaydi.

## 11. Favqulodda tuzatish (hotfix)

Alohida tartib belgilanmagan — umumiy tartib (§2) qo'llanadi: branch, test, versiya, `CHANGELOG.md`, xesh, PR, egasi tasdig'i.

## 12. Laboratoriya tomoni

Platformaning yangi versiyasi chiqqanda laboratoriya o'zi qaror qiladi, PQ ni takrorlash kerakmi: `CHANGELOG.md` dagi "natijaga ta'siri" bandi va bosma hisobotdagi versiya / build shu qaror uchun asos. Avvalgi hisobni qayta tekshirish — `uc-calc/1` faylini import qilib qayta hisoblash (`src/io/calc-json.js::reproduce`). Tavsiya etilgan shakl — [PQ_PROTOCOL_TEMPLATE.md](PQ_PROTOCOL_TEMPLATE.md).
