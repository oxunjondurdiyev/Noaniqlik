# UncertaintyCalc — Claude Code uchun ketma-ket promptlar to'plami

**Asos:** Gemini Deep Research auditi (2026-yil noyabr) + mavjud Excel va qo'llanmalar.
**Maqsad:** platformani istalgan kalibrlash va sinov laboratoriyasi uchun, barcha turdagi noaniqliklarni hisoblaydigan, akkreditatsiya oldida himoya qilinadigan tizimga aylantirish.

---

## 1. Qanday ishlatish kerak

1. **claude.ai/code** ni oching. Repozitoriya sifatida `oxunjondurdiyev/Noaniqlik` ni tanlang. Agar ishlayotgan kod boshqa repoda bo'lsa (masalan `uncertainty-platform`), o'shani tanlang.
2. Promptlarni **tartib bilan, bittadan** bering:
   - **P00** faqat bir marta beriladi. U repoga `CLAUDE.md` faylini yozadi, keyingi sessiyalar shu qoidalarni avtomatik o'qiydi.
   - Har bir prompt — alohida sessiya va alohida git branch.
3. Har bir bosqich oxirida Claude Code hisobot beradi va PR ochadi. Uni birlashtirishdan (merge) oldin **4-bo'limdagi tekshiruv ro'yxatini** bajaring.
4. Bitta promptni bir sessiyada tugatib bo'lmasa, o'sha sessiyada "davom et" deb yozing. Yangi sessiyada esa "`docs/PLAN.md` dagi P0X bosqichini davom ettir" deb yozing.
5. Promptlar o'zbek tilida. Claude Code ularni tushunadi. Kod, izohlar va commit xabarlari ingliz tilida, foydalanuvchi interfeysi esa 3 tilda bo'ladi.

**Taxminiy hajm:**

| Bosqich | Mazmun | Hajm |
|---|---|---|
| P00–P02 | poydevor | 1–2 hafta |
| P03–P05 | hisoblash yadrosi | 3–4 hafta |
| P06–P09 | yangi noaniqlik turlari va laboratoriya jarayonlari | 6–8 hafta |
| P10–P13 | hisobot, ma'lumotlar yaxlitligi, validatsiya, AI | 5–6 hafta |

---

## 2. Gemini hisobotidan nimani olamiz va nimaga ehtiyot bo'lamiz

### Olinadigan qismlar (yo'nalish to'g'ri)

- **Backlog BL-01…BL-20** va ustuvorliklar — promptlar shu asosda tuzildi.
- **Foydalanuvchi xatolari X1–X12** va ularni aniqlash qoidalari.
- **ISO/IEC 17025 jarayonlari J1–J12** (uskunalar, CMC, QC, PT, validatsiya).
- **Universal JSON shablon g'oyasi** va 4 ta hisoblash rejimi:
  - `GUM_BOTTOM_UP`;
  - `REGRESSION`;
  - `TOP_DOWN`;
  - `QUALITATIVE`.
- **O'zbekistondagi 30 ta parametr ro'yxati.** Bu statistik asoslangan emas, Gemini o'zi ham ❓ qo'ygan. Shuning uchun uni boshlang'ich ro'yxat sifatida olamiz.
- **Shaxsiy ma'lumotlarni lokalizatsiya qilish xavfi** (O'RQ-547, 27¹-modda) — bu jiddiy masala.

### Tekshirmasdan ishlatilmaydigan qismlar

| Da'vo | Muammo |
|---|---|
| "JCGM 100:2008/Amd.1:2026" | Bunday tuzatma borligi shubhali. Unga havola qilmang, faqat JCGM 100:2008 §5.1.2 ga tayaning. |
| T16: "EA-4/02 S1 = Y = X²" | EA-4/02 dagi misollar raqamlanishi boshqacha bo'lishi mumkin. Manbadan tekshiring. |
| T8: GUM H.3 ma'lumotlari | Jadvaldagi 11 nuqta to'liq emas. Natija nuqtasi (23,8 °C) asl GUM'dagi misolga mos kelmasligi mumkin. Faqat asl JCGM 100 PDF'idan oling. |
| T10–T13: ISO/TS 28037 misollari | Raqamlar GTC hujjatidan olingan deyilgan, lekin matnda buzilgan joylar bor. GTC yoki ISO matnidan qayta tekshiring. |
| T14: NIST Uncertainty Machine misoli | Raqamlarni NIST qo'llanmasidan tekshiring. |
| "COOMET R/GM/21:2024", "EURACHEM 2026 in-house guide", "ACI-TECH-1-009" | Bu hujjatlar bor-yo'qligi va nashr yili tasdiqlanmagan. |
| "U < CMC bo'lsa, sertifikatga avtomatik CMC qo'yiladi" | Avtomatik almashtirish xavfli. To'g'ri yo'l: ogohlantirish va bloklash, keyin laboratoriya sozlamasiga ko'ra asoslangan qaror. |
| Tayyorlik foizlari (54 % / 18 %) | Bu taxminiy baholash, o'lchangan ko'rsatkich emas. |

**Asosiy qoida (CLAUDE.md'ga yoziladi):** test misolining kutilgan raqami faqat **asl manba PDF'idan** olinadi. Gemini jadvalidagi raqamlar `unverified` holatida turadi va asl manba bilan solishtirilmaguncha CI'da majburiy test bo'lmaydi.

---

## 3. Boshlashdan oldin siz tayyorlaydigan narsalar

### 3.1. Repoga `docs/references/` papkasini yarating

Quyidagi bepul PDF'larni rasmiy saytlardan yuklab, shu papkaga joylang:

| Fayl | Manba |
|---|---|
| JCGM 100:2008 (GUM) | bipm.org → JCGM publications |
| JCGM 101:2008 (Monte-Karlo) | bipm.org |
| JCGM 102:2011 (ko'p o'zgaruvchili) | bipm.org |
| JCGM 106:2012 (muvofiqlik) | bipm.org |
| JCGM GUM-6:2020 (model qurish) | bipm.org |
| EA-4/02 M:2022 | european-accreditation.org |
| ILAC P14:09/2020, ILAC G8:09/2019 | ilac.org |
| EURACHEM/CITAC QUAM (3-nashr) | eurachem.org |
| EURACHEM UfS (2-nashr, 2019) | eurachem.org |
| Nordtest TR 537 (4-nashr) | nordtest.info |
| NIST Uncertainty Machine User's Manual | uncertainty.nist.gov |
| COOMET R/GM/32:2017 | coomet.net (ichki fondingizda bo'lishi mumkin) |

ISO/TS 28037, ISO 21748, ISO 19036, ISO 20914 va ISO 6892-1 pullik standartlar. Ular Standartlar instituti fondida bo'lsa, faqat **ichki foydalanish uchun** qo'shing. Repo ochiq bo'lsa, pullik standartlarni repoga **joylamang**, ulardan faqat test raqamlarini o'z so'zingiz bilan yozing.

### 3.2. Gemini hisobotini repoga qo'shing

Yuborilgan `Gemini_audit_hisoboti.md` faylini `docs/audit/gemini-audit-2026-11.md` sifatida joylang. Claude Code unga havola qiladi.

### 3.3. Excel fayllar va qo'llanmalar

Uchta Excel va ikkita qo'llanma `tests/fixtures/` ichida bo'lishi kerak. Ular repoda allaqachon bo'lsa, shu yerga ko'chirish shart emas.

### 3.4. Oldindan hal qilinadigan qarorlar

Bularni P11 dan oldin hal qilish kerak:

| Qaror | Variantlar | Tavsiya |
|---|---|---|
| Shaxsiy ma'lumotlar qayerda saqlanadi | (a) Firebase qoladi; (b) O'zbekistondagi server (UZINFOCOM, Uztelecom va h.k.); (c) gibrid | (c): shaxsiy ma'lumotlar O'zbekiston serveriga, Firebase'da faqat anonim ID |
| Server tomonda qayta hisoblash | hozir / keyinroq | Yadroni hozirdan Node'da ishlaydigan qilib yozamiz, serverni keyin qo'shamiz |
| Tashqi kutubxonalar | faqat vanilla / pinlangan kichik kutubxonalar | SheetJS (xlsx), qrcode, jsPDF kabi kutubxonalarni `vendor/` papkasiga aniq versiya bilan qo'shish |
| Elektron imzo | yo'q / E-IMZO | Keyingi bosqichda E-IMZO, hozircha SHA-256 xesh va QR |

---

## 4. Har bir bosqichdan keyin tekshiruv ro'yxati

- [ ] `npm test` (yoki `node --test`) to'liq o'tadi.
- [ ] Zichlik, gazoanalizator va termometr bo'yicha **9 ta nuqta** natijasi o'zgarmagan: y, u_c, ν_eff, k, U, muvofiqlik.
- [ ] GitHub Pages'dagi sayt ochiladi, eski saqlangan hisoblar yo'qolmagan.
- [ ] Yangi interfeys matnlari 3 tilda bor (UZ/RU/EN).
- [ ] `CHANGELOG.md` va dvigatel versiyasi yangilangan.
- [ ] PR tavsifida "nima o'zgardi / qanday tekshirildi / ma'lum cheklovlar" bo'limlari bor.

---

## 5. Promptlar

### P00 — Loyiha qoidalari (CLAUDE.md) va hozirgi holat auditi

**Kod o'zgartirilmaydi.**

```text
Sen UncertaintyCalc loyihasida ishlaysan. Bu o'lchash noaniqligini GUM (JCGM 100:2008) va ISO/IEC 17025:2017 bo'yicha hisoblaydigan brauzer platformasi. U vanilla JavaScript SPA, GitHub Pages'da joylashgan, interfeysi 3 tilda (UZ/RU/EN). Firebase faqat ro'yxatdan o'tish, tashkilotlar va to'lov uchun ishlatiladi.

Maqsad: platformani istalgan kalibrlash va sinov laboratoriyasi uchun barcha turdagi noaniqlikni hisoblaydigan va akkreditatsiya organi oldida himoya qilinadigan tizimga aylantirish. Bunga quyidagilar kiradi:
- bottom-up, top-down, regressiya, Monte-Karlo va ko'p o'zgaruvchili modellar;
- mikrobiologiya, namuna olish, sifatli testlar;
- laboratoriya jarayonlari: uskunalar, CMC, ichki sifat nazorati (QC), PT, usul validatsiyasi.

Mustaqil audit hisoboti docs/audit/gemini-audit-2026-11.md da. Me'yoriy hujjatlar docs/references/ da. Excel etalon fayllar va qo'llanmalar repoda bor (topib ol).

BU SESSIYADA KOD O'ZGARTIRMA. Faqat quyidagilarni bajar:

1. Repozitoriyani to'liq o'rganib chiq va docs/ARCHITECTURE.md fayliga yoz:
   - fayl va modullar xaritasi;
   - hisoblash qayerda bajarilishi: parser, sezgirlik koeffitsiyentlari, A va B tur, ν_eff, k, Monte-Karlo, muvofiqlik;
   - DOM bilan aralashib ketgan hisob joylari;
   - global holat va localStorage tuzilmasi;
   - i18n qanday ishlashi;
   - shablonlar qanday saqlanishi;
   - mavjud testlar (tests/verify-excel.js) nimani tekshirishi;
   - Firebase'ga qaysi ma'lumotlar yuborilishi (shaxsiy ma'lumotlar ro'yxati).

2. docs/RISKS.md fayliga topilgan texnik xavflarni yoz. Masalan:
   - sonli hosila qadami h qanday tanlangan;
   - t-kvantil qanday hisoblanadi va uning aniqligi;
   - ν_eff kasr bo'lganda nima qilinadi;
   - yaxlitlash qayerda bajariladi;
   - Monte-Karlo tasodifiy son generatori va uning urug'i (seed);
   - XSS xavfi (innerHTML).

3. docs/PLAN.md faylini yarat. Unda P01–P13 bosqichlari (pastda) bo'lsin. Har bir bosqich uchun ko'rsat: qaysi fayllar o'zgaradi, nima buzilishi mumkin, qanday tekshiriladi.

4. Repo ildiziga CLAUDE.md faylini yoz. U kelajakdagi barcha sessiyalar uchun majburiy qoidalar bo'ladi. Quyidagi qoidalarni deyarli so'zma-so'z kirit:

   ## Metrologik qoidalar
   - Hisoblash yadrosi (src/engine/) DOM'ga, window'ga va localStorage'ga bog'liq bo'lmagan sof ES modullaridan iborat. U brauzerda ham, Node'da ham ishlaydi.
   - Oraliq hisoblar yaxlitlanmaydi. Yaxlitlash faqat hisobot qatlamida bajariladi: U ko'pi bilan 2 ta qiymatli raqam (ILAC P14 §5), y esa U ning oxirgi xonasigacha.
   - Har bir formula va qoidaning ustida manba izohi bo'ladi: // Ref: JCGM 100:2008 §5.1.2
   - Kalibrlanayotgan asbobning MPE'si hech qachon avtomatik ravishda noaniqlik manbai bo'lmaydi.
   - U = 0 yoki U < CMC bo'lgan natija ogohlantirishsiz hisobotga chiqmaydi.
   - Yangi metrologik funksiya kamida bitta manbadan olingan test misolisiz birlashtirilmaydi (merge).
   - Test misolining kutilgan qiymatlari FAQAT asl manbadan (docs/references/ yoki laboratoriya Excel'i) olinadi. Gemini hisobotidagi raqamlar "unverified" holatida bo'ladi, manba bilan solishtirilmaguncha majburiy test bo'lmaydi.
   - Me'yoriy hujjatlarning nashrlari: JCGM 100:2008, JCGM 101:2008, JCGM 102:2011, JCGM 106:2012, JCGM GUM-6:2020, EA-4/02 M:2022, ILAC P14:09/2020, ILAC G8:09/2019, COOMET R/GM/32:2017. Boshqa nashrga havola qilishdan oldin uni docs/references/ da tekshir.

   ## Muhandislik qoidalari
   - Framework yo'q, vanilla JS (ES modules). Tashqi kutubxonalar faqat vendor/ papkasida, aniq versiya va litsenziyasi bilan.
   - Barcha foydalanuvchi matnlari i18n orqali va 3 tilda (uz/ru/en) bo'ladi. Yangi matn kalitining 3 ta tarjimasi bo'lmasa, test xato beradi.
   - innerHTML'ga foydalanuvchi ma'lumoti escape qilinmasdan qo'yilmaydi.
   - Har bir bosqich alohida branch'da bajariladi, kichik commit'lar qilinadi va oxirida PR ochiladi.
   - Har bir PR'dan oldin `npm test` o'tishi va 9 ta etalon Excel nuqtasi o'zgarmagan bo'lishi shart.
   - Dvigatel versiyasi (ENGINE_VERSION, semver) hisoblash natijasiga ta'sir qiladigan har qanday o'zgarishda oshiriladi va CHANGELOG.md da qayd etiladi.
   - Eski localStorage ma'lumotlari migratsiya funksiyasi orqali yangi formatga o'tkaziladi va yo'qolmaydi.
   - Shaxsiy ma'lumotlar (F.I.Sh., telefon, email, STIR/INN) yangi joyga, jumladan Firebase'ga, qo'shimcha yozilmaydi.

   ## Ish uslubi
   - Har bir bosqich boshida docs/PLAN.md va shu fayl qayta o'qiladi.
   - Noaniq metrologik qarorda (manbalar bir-biriga zid bo'lsa) o'zing tanlama. Variantlarni yoz va so'ra.
   - Bosqich oxirida qisqa hisobot ber: nima qilindi, qanday tekshirildi, nima qoldi.

5. Oxirida menga 10 qatorgacha xulosa ber:
   - eng katta 5 ta texnik muammo;
   - P01'ni boshlashdan oldin men hal qilishim kerak bo'lgan savollar.

Faqat docs/ va CLAUDE.md fayllarini yarat. Ularni "chore/p00-audit" branch'iga commit qilib, PR och.
```

---

### P01 — Hisoblash yadrosini ajratish va etalon testlar

```text
CLAUDE.md va docs/PLAN.md ni o'qi. P01 bosqichini bajar. Branch: feat/p01-engine-core.

Maqsad: barcha hisob-kitobni DOM'dan ajratib, src/engine/ ichidagi sof modullarga ko'chirish. Natijalar bit darajasida o'zgarmasligi shart.

Vazifalar:

1. src/engine/ tuzilmasini yarat (nomlarni mavjud kodga moslab tanlashing mumkin):
   - parser.js — formula parseri (eval yo'q) va AST;
   - sensitivity.js — sonli hosilalar;
   - typeA.js — 3 ta usul, ↑/↓ rejimi va juftlangan korrelyatsiya;
   - typeB.js — taqsimotlar, formula ko'rinishidagi yarim kenglik, ν;
   - combine.js — u_c, kovariatsiya, Welch–Satterthwaite;
   - coverage.js — t-kvantil, k tanlash qoidalari;
   - conformity.js — oddiy va himoyalangan qabul, γ;
   - montecarlo.js — mavjud MCM;
   - rounding.js — faqat hisobot uchun;
   - version.js — ENGINE_VERSION;
   - index.js — yagona API: evaluate(modelSpec) → result.

2. Yagona kirish va chiqish formatlarini aniqla va docs/ENGINE_API.md fayliga yoz:
   - modelSpec: model, kirishlar, kuzatuvlar, B manbalar, korrelyatsiyalar, sozlamalar;
   - result: y, u_c, ν_eff, k, U, byudjet qatorlari va ulushlari, ogohlantirishlar, engineVersion.

   JSDoc tiplarini yoz.

3. Interfeys (UI) faqat modelSpec yig'ib, evaluate() ni chaqiradigan va result'ni ko'rsatadigan bo'lsin.

4. t-kvantil (Styudent) aniqligini tekshir. 1 ≤ ν ≤ 200 va P ∈ {0,95; 0,9545; 0,99; 0,9973} uchun 1e-6 nisbiy aniqlik bo'lishi kerak. Agar hozir jadval yoki taqribiy formula bo'lsa, to'liq beta-funksiya yordamida teskari hisobni qo'sh.

   ν_eff kasr bo'lganda k tanlash qoidasi sozlama bo'lsin:
   - "floor" — EA-4/02, Excel'dagi joriy usul;
   - "interpolate";
   - "exact" — kasr ν bilan.

   Standart qiymat Excel bilan mos bo'lgani bo'lsin.

5. Test infratuzilmasi (tashqi bog'liqliksiz, node:test):
   - tests/cases/ papkasi, har bir test misoli alohida JSON fayl:
     { id, title, source: {doc, section, page}, status: "verified"|"unverified", domain, modelSpec, expected: {y, uc, nu_eff, k, U, interval?}, tolerance }
   - tests/run-cases.test.js — barcha "verified" misollarni ishga tushiradi va "unverified" larni hisobotda ko'rsatadi (xato bermaydi);
   - mavjud tests/verify-excel.js dagi 9 nuqtani shu formatga o'tkaz (status: verified, manba — Excel fayli va varaq nomi);
   - package.json'ga "test" skriptini qo'sh.

6. .github/workflows/test.yml — har bir push va PR'da testlar ishga tushadi.

Qabul mezonlari:
- 9 ta Excel nuqtasi refaktordan oldingi bilan bir xil natija beradi (y, u_c, ν_eff, k, U, 1e-9 nisbiy aniqlikda).
- Node'da `import {evaluate} from './src/engine/index.js'` ishlaydi, hech qanday DOM ob'ekti kerak emas.
- Saytda barcha 11 ta shablon avvalgidek ishlaydi. Saqlangan nuqtalar ochiladi.
- docs/ENGINE_API.md bor.

Oxirida: o'zgargan fayllar ro'yxati, test natijasi va eski va yangi natijalar solishtirma jadvali.
```

---

### P02 — Rasmiy test misollari to'plami (manbadan tekshirilgan)

```text
CLAUDE.md'ni o'qi. P02 bosqichi. Branch: test/p02-reference-cases.

Maqsad: hisoblash dvigatelini xalqaro rasmiy misollar bilan tekshirish uchun test to'plamini yaratish. Faqat asl manbadan tekshirilgan raqamlar ishlatiladi.

1. docs/audit/gemini-audit-2026-11.md dagi "8.1. Rasmiy Validatsiya Test To'plami" (T1–T18) jadvalini o'qi. Har bir misol uchun docs/references/ dagi ASL PDF'ni och va kirish ma'lumotlari hamda kutilgan natijalarni o'sha manbadan qayta yoz.
   - Manbada aynan bor bo'lsa — status "verified", source maydonida bo'lim, jadval va sahifa.
   - Gemini raqami manbaga mos kelmasa — manbadagi raqamni ol va tests/cases/DISCREPANCIES.md fayliga farqni yoz.
   - Manba PDF repoda bo'lmasa — status "unverified" va menga qaysi PDF kerakligini ayt. Raqam to'qima.

2. Kamida quyidagilarni tayyorla (manba ruxsat bergancha):
   - JCGM 100 H.1 (KMD kalibrlash);
   - JCGM 100 H.2 (bir vaqtda R, X, Z — korrelyatsiya);
   - JCGM 100 H.3 (termometr kalibrlash, chiziqli regressiya — P06'gacha "pending");
   - JCGM 101 §9.2 (additive model), §9.3 (massa kalibrlash), §9.4 (mikroto'lqinli quvvat — korrelyatsiya bilan);
   - EA-4/02 S-misollari (raqamlanishini manbadan tekshir);
   - NIST Uncertainty Machine qo'llanmasidagi misollar;
   - Nordtest TR 537 misoli (P07'gacha "pending");
   - EURACHEM QUAM A1 (kalibrlash eritmasi).

   Hozircha dvigatelda yo'q funksiyani talab qiladigan misollarni (regressiya, top-down) "pending" holatida saqla va qaysi bosqichda yoqilishini yoz.

3. Har bir misol uchun tolerance'ni manbadagi xonalar soniga qarab belgila (manbada 2 ta qiymatli raqam bo'lsa, ±0,5 birlik oxirgi xonada). MCM uchun JCGM 101 §8 bo'yicha raqamli toleransni qo'lla.

4. docs/VALIDATION_MATRIX.md (talablarni kuzatish matritsasi, RTM) yarat: me'yoriy talab (band) → dvigatel funksiyasi (fayl::funksiya) → test misoli ID → holat.

5. Hozirgi dvigatelda yiqilgan "verified" testlarni tuzatma. Ularni ro'yxat qilib, sababini tahlil qil va menga ko'rsat. Tuzatish keyingi bosqichda, mening roziligim bilan bo'ladi.

Qabul mezonlari:
- Kamida 10 ta "verified" misol bor, har birida manba sahifasi ko'rsatilgan.
- DISCREPANCIES.md da Gemini bilan farqlar ro'yxati bor.
- CI'da verified misollar o'tadi yoki yiqilganlar ro'yxati asoslangan holda menga taqdim etilgan.
```

---

### P03 — Hisoblash yadrosini kuchaytirish (birliklar, 2-tartibli hadlar, Monte-Karlo 2.0)

```text
CLAUDE.md'ni o'qi. P03 bosqichi. Branch: feat/p03-engine-correctness. Har bir quyi vazifa alohida commit bo'lsin.

A. Birliklar va o'lchamlik tahlili (JCGM GUM-6:2020 §11; BL-06)
   1. src/engine/units.js — SI asosiy o'lchamliklar vektori [L, M, T, I, Θ, N, J] va prefikslar.
      Birliklar ro'yxati: m, g, kg, s, A, V, Ω, W, Pa, bar, °C, K, mK, L, mL, µL, %, ppm, % об. (hajmiy ulush, o'lchamsiz), mol/L, mg/kg, CFU, dB va h.k.
      Affin birliklarni (°C ↔ K) alohida ishlov bilan qo'sh: harorat farqi va mutlaq harorat farqlansin.
   2. Har bir kirish kattaligi va manbaga ixtiyoriy "unit" maydoni qo'shiladi. AST bo'ylab o'lchamlik hisoblanadi:
      - qo'shish yoki ayirishda o'lchamliklar mos kelmasa — xato;
      - c_i·u(x_i) ning o'lchamligi y ga mos kelmasa — ogohlantirish.
   3. Birlik ko'rsatilmagan eski hisoblar avvalgidek ishlaydi: tekshiruv o'tkazib yuboriladi va kichik eslatma chiqadi.

B. Ikkinchi tartibli hadlar va nochiziqlilik diagnostikasi (JCGM 100 §5.1.2 izohi; BL-11)
   1. Sonli Hessian: ∂²f/∂x_i² va ∂²f/∂x_i∂x_j. Qadam h moslashuvchan tanlanadi, bunda u(x_i) va x_i masshtabi hisobga olinadi.
   2. u_c² ga §5.1.2 izohidagi hadlar qo'shiladi. Bu har bir kirish normal taqsimotli va korrelyatsiyasiz bo'lsa haqiqiy, shu shartni hisobotda yoz.
   3. Nochiziqlilik indeksi: 2-tartibli hadlar ulushi > 1 % (sozlanadigan) bo'lsa ogohlantirish va "Monte-Karlo bilan tekshiring" tavsiyasi. Standart holatda 2-tartibli hadlar QO'SHILMAYDI, faqat diagnostika ko'rsatiladi. Qo'shish laboratoriya sozlamasi bilan yoqiladi.
   4. Test: Y = X², x̄ = 0, u = s holati. Analitik natija u²(y) = 2u⁴(x).

C. Monte-Karlo 2.0 (JCGM 101; BL-10)
   1. Tasodifiy sonlar generatori: urug'li (seed) PRNG (masalan, xoshiro128** yoki JCGM 101 C ilovasidagi Wichmann–Hill). Seed hisobotga yoziladi va natija takrorlanadi.
   2. Taqsimotlar:
      - normal;
      - to'g'ri burchakli;
      - uchburchakli;
      - trapetsiya;
      - egri-trapetsiya (curvilinear trapezoid);
      - arksinus (U-simon);
      - siljitilgan-masshtablangan t (A tur, kichik n, JCGM 101 §6.4.9);
      - log-normal;
      - eksponensial;
      - ko'p o'lchovli normal (Cholesky).
   3. Korrelyatsiya: kovariatsiya matritsasi ko'p o'lchovli normal orqali hisobga olinadi. Normal bo'lmagan taqsimotlar korrelyatsiyalansa, cheklovni ochiq ko'rsat.
   4. Adaptiv M (JCGM 101 §7.9): h = 10⁴ bloklar, n_dig = 2, to'xtash sharti §7.9.4 bo'yicha.
   5. Ehtimoliy simmetrik va eng qisqa qamrov intervali, GUM bilan solishtirish (§8: d_low, d_high ≤ δ).
   6. Hisoblash Web Worker'da bajarilsin, UI qotmasin va jarayon progressi ko'rsatilsin. Worker ham src/engine/montecarlo.js ni import qiladi.
   7. Testlar: JCGM 101 §9.2, §9.3, §9.4 ("verified" bo'lsa) va gazoanalizator 2-nuqtasi: [−0,0111; 0,0469] (qo'llanmadan).

Qabul mezonlari:
- 9 ta Excel nuqtasi o'zgarmagan (2-tartibli hadlar standart holatda o'chiq).
- Yangi testlar o'tadi. Birlik xatosi misoli (mA va % об., c = 1) ogohlantirish beradi.
- MCM bir xil seed bilan aynan bir xil natija beradi.
- ENGINE_VERSION minor versiyaga oshirilgan.
```

---

### P04 — Metrologik linter: foydalanuvchi xatolarini avtomatik aniqlash

```text
CLAUDE.md'ni o'qi. P04 bosqichi. Branch: feat/p04-metrology-linter.

Maqsad: modelSpec va result'ni tekshirib, tipik metrologik xatolarni topuvchi qoidalar dvigatelini yaratish (BL-16).

1. src/engine/linter/ — har bir qoida alohida modul bo'lsin:
   { id, severity: "error"|"warning"|"info", ref: "manba §", check(spec, result) → findings[] }
   Natija result.findings ga yoziladi. "error" darajasidagi topilma tuzatilmaguncha yoki asoslanmaguncha hisobot "rasmiy" deb chop etilmaydi.

2. Qoidalar. docs/audit/gemini-audit-2026-11.md §9 (X1–X12) dagi g'oyalarni asos qilib ol, lekin har bir qoidani manba bilan tekshirib, o'zing aniq yoz:
   - X1  — calibration rejimida MPE yoki "ruxsat etilgan xato" deb nomlangan manba byudjetda turibdi;
   - X2  — "sertifikat" yoki "certificate" turidagi manba normal taqsimotda, lekin k = 1 yoki √3 bo'luvchi bilan kiritilgan;
   - X3  — ↑/↓ o'qishlar bor, lekin A tur barcha o'qishlardan hisoblangan va histerezis ham alohida qo'shilgan (ikki marta hisob);
   - X4  — juftlangan kuzatuvlarda |r| > 0,5, lekin korrelyatsiya o'chiq; yoki ikki kirish bir xil etalondan, lekin kovariatsiya = 0;
   - X5  — rezolyutsiya manbasi uchun √3 bo'luvchi ishlatilgan (2√3 o'rniga) yoki boshqa noodatiy bo'luvchi;
   - X6  — birlik mos emas, c = 1 (P03'dagi o'lchamlik tahlilidan foydalan);
   - X7  — k = 2 qat'iy olingan, lekin ν_eff < 30 yoki A tur ulushi > 30 % va n < 10;
   - X8  — U = 0, u_c = 0, U < CMC; s = 0 va rezolyutsiya manbasi yo'q;
   - X9  — U > 2 ta qiymatli raqam bilan yaxlitlangan yoki y va U o'nlik xonalari mos emas (hisobot qatlamida);
   - X10 — kalibrlash rejimida etalon bor, lekin drift yoki uzoq muddatli barqarorlik manbasi yo'q (info darajasida);
   - X11 — top-down rejimida u(R_w) bilan birga takrorlanuvchanlik manbalari ham bor (P07 da yoqiladi);
   - X12 — empirik kattalikda usul bias'i qo'shilgan (P07 da yoqiladi);
   - qo'shimcha qoidalar:
     - bitta manba ulushi > 90 %;
     - n < 3;
     - ν_i noto'g'ri (≤ 0);
     - kuzatuvlarda Grubbs bo'yicha chetga chiquvchi qiymat (ISO 5725-2) — info darajasida.

3. Har bir qoidaning matni i18n'da 3 tilda bo'lsin. Matnda quyidagilar bo'ladi:
   - nima topildi (aniq manba nomi va raqam);
   - nima uchun bu xato (manba bilan);
   - qanday tuzatish kerak.

4. UI: natijalar sahifasida "Tekshiruv natijalari" bloki. Ranglar: qizil — error, sariq — warning, ko'k — info. Foydalanuvchi ogohlantirishni "asoslangan holda qabul qilish" mumkin, bunda izoh yozish majburiy. Izoh hisobotga ham chiqadi.

5. Testlar: har bir qoida uchun kamida 1 ta ijobiy va 1 ta salbiy holat. Gazoanalizator qo'llanmasidagi asl protsedura xatolari (MPE byudjetda, nol nuqtada U = 0) qoidalarni ishga tushirishi kerak.

Qabul mezonlari:
- 9 ta to'g'ri Excel nuqtasida "error" yo'q.
- Har bir qoida bo'yicha testlar o'tadi.
- Qoidalar ro'yxati, ref'lari bilan, docs/LINTER_RULES.md da.
```

---

### P05 — Universal shablon (metodika) dvigateli va kutubxona

```text
CLAUDE.md'ni o'qi. P05 bosqichi. Branch: feat/p05-template-engine.

Maqsad: yangi parametr yoki metodikani kod yozmasdan, JSON shablon orqali qo'shish (BL-05). Bu "istalgan laboratoriya uchun" degan maqsadning asosiy kaliti.

1. schemas/methodology.schema.json (JSON Schema). Gemini hisobotidagi §3.4 sxemasini asos qil, lekin soddalashtirib, quyidagilarni qamra:
   - meta: id, version (semver), status (DRAFT|REVIEWED|APPROVED|RETIRED), domain (CALIBRATION|TESTING), field (soha kodi), title{uz,ru,en}, normativeRefs[], isEmpiricalMeasurand, author, timestamps;
   - evaluationMode: GUM_BOTTOM_UP | REGRESSION | TOP_DOWN | QUALITATIVE (hozircha faqat GUM ishlaydi, qolganlari keyingi bosqichlarda);
   - measurand: nomi, belgisi, birligi, model formulasi;
   - inputs[]: belgi, nomi{3 til}, birlik, turi (kuzatuv | o'zgarmas | etalon | ta'sir kattaligi), A tur usuli, ↑/↓ rejimi;
   - typeBSources[]: nomi{3 til}, qaysi kirishga tegishli, taqsimot, yarim kenglik (son yoki formula), bo'luvchi, ν, sezgirlik, manba turi (sertifikat | spetsifikatsiya | rezolyutsiya | drift | atrof-muhit | boshqa);
   - correlations[];
   - points[]: ko'p nuqtali kalibrlash nuqtalari;
   - decisionRule: turi, MPE formulasi, guard band;
   - reporting: P, k qoidasi, yaxlitlash, hisobot turi;
   - locked: APPROVED holatida qaysi maydonlar qulflanadi (formula, bo'luvchilar, taqsimotlar).

2. src/templates/interpreter.js: shablon → modelSpec → evaluate(). Shablonni validatsiya qilish uchun kichik o'z validatoring yetarli, kutubxona shart emas.

3. Mavjud 11 ta shablonni JSON'ga ko'chir (templates/builtin/*.json). Har biri uchun testlar:
   - zichlik, gazoanalizator va termometr — Excel natijasi bilan aynan mos;
   - qolgan 8 tasi — oldingi kod bergan natija bilan aynan mos (snapshot test).

4. Shablon muharriri (UI):
   - yangi shablon yaratish, nusxa olish, tahrirlash;
   - formula uchun sintaksis va o'lchamlik tekshiruvi (P03);
   - holat oqimi DRAFT → REVIEWED → APPROVED. Hozircha holat lokal saqlanadi, rollar P11 da;
   - APPROVED shablonda qulflangan maydonlar tahrirlanmaydi. O'zgartirish faqat yangi versiya yaratish orqali;
   - JSON eksport va import (tashkilot ichida ulashish uchun).

5. Laboratoriya standart sozlamalari (org settings): P, k qoidasi (floor/interpolate/exact, qat'iy k), yaxlitlash usuli, standart qaror qoidasi, 2-tartibli hadlar yoqilganmi, CMC ogohlantirish rejimi. Hisob boshlanganda shu sozlamalar qo'llanadi.

6. docs/TEMPLATE_GUIDE.md — metrolog uchun yangi shablon yaratish yo'riqnomasi, o'zbek tilida, 2 ta misol bilan.

7. Kutubxonani kengaytirish: Gemini hisobotidagi §3.3 jadvalidan (30 ta parametr) faqat GUM_BOTTOM_UP rejimidagi va manbasi ochiq bo'lgan kalibrlash shablonlaridan 5 tasini qo'sh. Masalan:
   - elektron tarozi (EURAMET cg-18);
   - manometr (EURAMET cg-17);
   - mikropipetka (ISO 8655-6);
   - shtangensirkul yoki mikrometr;
   - termostat yoki klimatik kamera.

   Har biri uchun manbadan olingan model va kamida 1 ta misol bo'lsin. Manbaga ega bo'lmasang, shablonni "DRAFT — tekshirish kerak" holatida qo'y va menga ro'yxatini ber.

Qabul mezonlari:
- 11 ta eski shablon JSON'dan ishlaydi va natijalar o'zgarmagan.
- Kod o'zgartirmasdan yangi shablon qo'shib, hisob qilish mumkin (PR tavsifida qadam-baqadam ko'rsat).
- Sxema docs/ va schemas/ da.
```

---

### P06 — Kalibrlash egri chizig'i va regressiya (ISO/TS 28037/28038)

```text
CLAUDE.md'ni o'qi. P06 bosqichi. Branch: feat/p06-regression.

Maqsad: REGRESSION rejimi (BL-02). Bu analitik asboblar (AAS, ICP, HPLC, GC, fotometr), datchiklar va termometrlar uchun kerak.

1. src/engine/regression/:
   - OLS — teng vaznlar;
   - WLS — har xil u(y_i);
   - WTLS — u(x_i) va u(y_i), iterativ (ISO/TS 28037 §7 algoritmi);
   - GLS — y_i lar orasida kovariatsiya (ISO/TS 28037 §10), agar vaqt yetsa;
   - polinomial (ISO/TS 28038 yondashuvi) — 2- va 3-darajali, OLS/WLS;
   - natija: parametrlar, ularning kovariatsiya matritsasi, χ²_obs, ν = m − n_param, model yaroqliligi (χ² testi P = 0,95), qoldiqlar (residuals).

2. Teskari baholash (inverse prediction): y_0 (n marta o'lchangan) → x̂_0 va u(x̂_0). Bunda u(a), u(b), cov(a,b) va u(y_0) hisobga olinadi (ISO/TS 28037 §6.3 va GUM H.3 yondashuvi).

3. Bashorat: x berilganda Y(x) va u(Y(x)). Bu GUM H.3 tipidagi termometr tuzatmasi uchun.

4. "U — diapazon" funksiyasi: ko'p nuqtali kalibrlashda U_j nuqtalari bo'yicha U(X) = a + b·X yoki chegaralovchi konservativ ifoda. Sertifikat ilovasi uchun.

5. UI:
   - (x_i, u(x_i), y_i, u(y_i)) jadvali, Excel'dan nusxalab qo'yish (paste) bilan;
   - grafik: nuqtalar, xatolik chiziqlari, egri chiziq, qoldiqlar. Kichik SVG yetarli;
   - teskari baholash oynasi.

6. Testlar: P02'dagi "pending" regressiya misollarini (GUM H.3, ISO/TS 28037 misollari) yoq. Faqat manbadan "verified" bo'lganlarini. Ekstremal holatlar ham test qilinsin: m = 2, vertikal chiziq, u = 0.

7. Shablon sxemasiga REGRESSION rejimi uchun maydonlar qo'sh. Bitta namunaviy shablon yarat (masalan, fotometrik kalibrlash egri chizig'i).

Qabul mezonlari:
- Verified regressiya misollari belgilangan toleransda o'tadi.
- χ² testi yiqilganda foydalanuvchiga ogohlantirish chiqadi.
- Hisobotda regressiya bo'limi bor.
```

---

### P07 — Sinov laboratoriyalari: Top-down, bias/recovery va empirik kattaliklar

```text
CLAUDE.md'ni o'qi. P07 bosqichi. Branch: feat/p07-top-down.

Maqsad: TOP_DOWN rejimi (BL-01, BL-08). Bu sinov laboratoriyalarining asosiy ehtiyoji.

1. src/engine/topdown/:
   a) Nordtest TR 537 yondashuvi:
      - u(R_w) — nazorat namunasi qatoridan (s), dublikatlar farqidan (s = √(Σd²/2n)) yoki nisbiy shkalada;
      - u(bias) = √(RMS_bias² + u(C_ref)²) — CRM, PT raundlari yoki spike/recovery'dan;
      - u_c = √(u(R_w)² + u(bias)²); U = k·u_c; mutlaq va nisbiy (%) ko'rinishda.
   b) ISO 21748 yondashuvi: standart usuldagi s_r, s_R (yoki r, R = 2,8·s), laboratoriya s_r'ni tekshirish (F yoki χ²), u(δ̂) va qo'shimcha hissalar c_i·u(x_i).
   c) EURACHEM QUAM: tiklanish (recovery) R_m, u(R_m), R_m ning 1 dan ahamiyatli farqini t-test bilan tekshirish, tuzatilgan yoki tuzatilmagan bias'ni hisobga olish.
   d) Konsentratsiyaga bog'liq noaniqlik: u(x) = √(s_0² + (x·s_1)²) (EURACHEM/CITAC muvofiqlik qo'llanmasi yondashuvi).
   e) Gibrid: top-down asosiga faqat u(R_w) qamramagan omillarni qo'shish. Ikki marta hisoblash linter X11 bilan nazorat qilinadi.

2. Empirik (usul bilan belgilanadigan) kattaliklar rejimi: isEmpiricalMeasurand = true bo'lsa, usul bias'i ta'rif bo'yicha 0 bo'ladi (X12 qoidasi). Noaniqlik s_r va s_R hamda rejim parametrlari bardoshliligi (harorat, vaqt, tezlik) hissalaridan hisoblanadi. ISO 6892-1 J ilovasi yondashuvini (manba mavjud bo'lsa) misol qil.

3. UI: Top-down ustasi (wizard):
   - 1-qadam: ma'lumot turi (QC qatori / dublikatlar / CRM / PT / validatsiya hisoboti);
   - 2-qadam: jadvalni kiritish yoki Excel'dan nusxalab qo'yish;
   - 3-qadam: byudjet va natija;
   - natija sinov protokoli uchun ILAC G17 / ISO/IEC 17025 7.8.3.1(c) ga mos ko'rinishda.

4. Shablonlar (manbadan misol bo'lsa "verified", aks holda DRAFT):
   - suvdagi ammoniy (Nordtest misoli);
   - oziq-ovqatdagi namlik (empirik);
   - beton siqilishdagi mustahkamligi (empirik, F/A + rejim);
   - og'ir metallar (AAS) — P06 regressiyasi bilan birgalikda.

5. Linter X11 va X12 qoidalarini yoq.

Qabul mezonlari:
- Nordtest misoli (manbadan verified bo'lsa) va QUAM misollaridan kamida bittasi o'tadi.
- Top-down natijasida y, U, nisbiy U % va qo'llanilgan yondashuv nomi hisobotda bor.
```

---

### P08 — Maxsus sohalar: mikrobiologiya, tibbiy laboratoriya, namuna olish, sifatli testlar

```text
CLAUDE.md'ni o'qi. P08 bosqichi. Branch: feat/p08-special-domains.

Har bir quyi modul alohida commit bo'lsin. Har biri manbasi bilan test qilinsin. Manba mavjud bo'lmasa, modulni "beta" deb belgilab, menga xabar ber.

A. Mikrobiologiya (ISO 19036 yondashuvi; BL-09)
   - log10 shkalada ishlash;
   - texnik noaniqlik (dublikatlarning log farqlaridan), matritsa hissasi va Puasson (hisoblash) hissasi: u = 0,4343/√ΣC;
   - natija: log10 da y ± U va oddiy shkalada asimmetrik interval [10^(y−U); 10^(y+U)] CFU/g;
   - past sanoqlarda (ΣC kichik) ogohlantirish.

B. Tibbiy laboratoriya (ISO 20914 yondashuvi)
   - u(y) = √(u_cal² + u_Rw²); kerak bo'lsa bias;
   - IQC darajalari (L1/L2/L3) bo'yicha CV_Rw;
   - natija nisbiy (%) va mutlaq ko'rinishda.

C. Namuna olish noaniqligi (EURACHEM UfS, 2-nashr; BL-15)
   - muvozanatli dublikat dizayn (≥ 8 ob'ekt × 2 namuna × 2 tahlil);
   - klassik ichma-ich (nested) ANOVA: s_samp, s_anal, s_meas; ixtiyoriy ravishda robust ANOVA (RANOVA);
   - U_meas va nisbiy U %;
   - manfiy dispersiya bahosi bo'lsa — 0 ga tenglash va ogohlantirish.

D. Sifatli (binar) testlar (QUALITATIVE rejimi; BL-18 ning bir qismi)
   - 2×2 jadval: sezgirlik (Se), spetsifiklik (Sp), PPV, NPV;
   - ularning Clopper–Pearson ishonch intervallari;
   - noto'g'ri musbat va noto'g'ri manfiy ehtimolliklari;
   - LOD_95 (agar daraja bo'yicha ma'lumot bo'lsa, oddiy logistik yoki probit modeli, ixtiyoriy).

Har biri uchun: shablon sxemasiga rejim maydonlari, UI oynasi, hisobot bo'limi, 3 tilda matnlar.

Qabul mezonlari:
- Har bir modulda kamida 1 ta manbadan tekshirilgan misol yoki analitik test (masalan, ANOVA'ni qo'lda hisoblangan kichik misol bilan).
- Hisobotda qo'llanilgan yondashuv va cheklovlar yozilgan.
```

---

### P09 — Laboratoriya jarayonlari: uskunalar, CMC, QC, PT, usul validatsiyasi, qaror qoidasi

```text
CLAUDE.md'ni o'qi. P09 bosqichi. Branch: feat/p09-lab-processes.

Maqsad: noaniqlik bilan bog'liq ISO/IEC 17025 jarayonlarini qo'llab-quvvatlash ("LIMS-lite"): BL-07, BL-13, BL-14 va J1–J10. Ma'lumotlar hozircha lokal saqlanadi (P11'da serverga ko'chishga tayyor ma'lumotlar qatlami orqali). Hisoblash qismlari src/engine/ ichida va test qilingan bo'lsin.

1. Etalonlar va uskunalar reestri (6.4, 6.5, ILAC P10):
   - kartochka: nomi, turi, zavod №, diapazon, sertifikat №, kalibrlovchi tashkilot, akkreditatsiya belgisi yoki kodi, kalibrlash sanasi, amal qilish muddati, kalibrlash nuqtalari (X_j, tuzatma, U_j, k_j);
   - B tur manbasini reestrdan tanlash: U/k, tuzatma va sertifikat raqami avtomatik tortiladi;
   - muddati o'tgan etalon — "error" (linter);
   - drift: tarixdagi kalibrlashlardan |ΔC| yoki chiziqli trend → drift manbasi taklifi (u = |ΔC|/√3, sozlanadigan);
   - kuzatuvchanlik maydonlari (ILAC P10 yo'li).

2. Akkreditatsiya sohasi va CMC jadvali (ILAC P14):
   - parametr, diapazon, CMC (son yoki formula), metodika (shablon) ID;
   - hisobda U < CMC(X) bo'lsa — laboratoriya sozlamasiga ko'ra bloklash yoki ogohlantirish. Avtomatik almashtirish YO'Q. Foydalanuvchi asoslangan qaror qabul qiladi va bu qaror hisobotga yoziladi.

3. Ichki sifat nazorati (7.7.1; ISO 7870-2):
   - Shewhart X va R kartalari, ±2s va ±3s chegaralari, Westgard qoidalari (1_3s, 2_2s, R_4s, 4_1s, 10_x);
   - kartadan s_Rw'ni top-down byudjetiga (P07) uzatish.

4. Malaka sinovlari va laboratoriyalararo solishtirishlar (7.7.2; ISO 13528):
   - E_n, z, z′, ζ;
   - baholash chegaralari: |E_n| ≤ 1; |z| ≤ 2 qoniqarli, 2–3 shubhali, ≥ 3 qoniqarsiz;
   - PT tarixini jadval va grafikda ko'rsatish.

5. Usul validatsiyasi va verifikatsiyasi (7.2.2; ISO 5725-2):
   - Grubbs va Cochran testlari;
   - bir omilli ANOVA (s_r, s_I yoki s_Rw);
   - recovery t-testi;
   - chiziqlilik (P06);
   - LOD/LOQ (blank s yoki s_y/x/b);
   - natijadan avtomatik top-down shablon qoralamasi.

6. Qaror qoidasi kengaytmasi (7.1.3, 7.8.6; ILAC G8; JCGM 106):
   - guard band w = r·U (r sozlanadi: 0; 0,83; 1 va h.k.);
   - TUR = MPE/U;
   - normal taqsimot uchun muvofiqlik ehtimoli p_c va bir o'lchov uchun noto'g'ri qabul ehtimoli (JCGM 106 §7–9);
   - ikki va bir tomonlama chegaralar;
   - qaror qoidasi va mijoz bilan kelishuv raqami hisobotga yoziladi.

7. Kalibrlash intervali (ILAC G24) — oddiy usul: drift trendidan MPE chegarasiga yetish vaqtini bashorat qilish (faqat tavsiya).

Har bir modul uchun hisoblash testlari, UI va 3 tilda matnlar bo'lsin. docs/VALIDATION_MATRIX.md yangilansin.

Qabul mezonlari:
- E_n, z, ζ, Grubbs va ANOVA testlari qo'lda hisoblangan yoki manbadagi misollar bilan o'tadi.
- Muddati o'tgan etalon tanlansa, hisob "rasmiy" bo'lmaydi.
- CMC tekshiruvi ishlaydi.
```

---

### P10 — Import/eksport va rasmiy hisobot shakllari

```text
CLAUDE.md'ni o'qi. P10 bosqichi. Branch: feat/p10-io-reports.

1. Import:
   - kuzatuvlar jadvalini Excel'dan nusxalab qo'yish (paste) — barcha jadvallarda;
   - .xlsx va .csv fayldan import (SheetJS, vendor/ ga aniq versiya va litsenziya bilan). Ustunlarni moslash oynasi bo'lsin.

2. Eksport:
   - .json — to'liq hisob: shablon ID va versiyasi, kirishlar, natija, engineVersion;
   - .xlsx — byudjet jadvali va natijalar. Tuzilmani laboratoriya Excel'lariga o'xshatishga harakat qil;
   - .csv.

3. Hisobot shakllari (HTML → chop etish / PDF). Shablon sifatida, laboratoriya rekvizitlari va logotipi sozlanadigan:
   - kalibrlash sertifikati ilovasi (ISO/IEC 17025 7.8.2 va 7.8.4, ILAC P14 §5 izohi bilan);
   - sinov protokoli bo'limi (7.8.2, 7.8.3; noaniqlik ko'rsatiladigan holatlar);
   - noaniqlik byudjeti asosnomasi (CMC asosnomasi uchun);
   - muvofiqlik bayonoti (7.8.6).
   Hisobot ko'p nuqtali bo'lsa: avval umumiy jadval, keyin har bir nuqta.

4. Majburiy maydonlar tekshiruvi: 7.8.2.1 dagi rekvizitlar to'ldirilmagan bo'lsa, ogohlantirish chiqadi.

5. Hisobotning pastki qismi:
   - dastur nomi, ENGINE_VERSION, build (commit qisqa SHA);
   - shablon ID va versiyasi;
   - hisob sanasi;
   - kanonik JSON'dan SHA-256 xesh;
   - QR-kod (vendor qrcode): hozircha xesh va hisob ID'si, P11'dan keyin /verify sahifasiga havola.

6. Hisobot tiliga qarab normativ havolalar chiqsin. Masalan, rus tilida "ГОСТ 34100.3-2017 (ISO/IEC Guide 98-3:2008)".

7. (P2, ixtiyoriy) PTB DCC XML eksportining minimal versiyasi: administrativeData va measurementResults bo'limlari. Rasmiy XSD bilan validatsiya qil (XSD vendor/ ga).

Qabul mezonlari:
- Gazoanalizator va termometr ko'p nuqtali hisobotlari Excel'dagi jadval bilan mos.
- JSON eksport → import → hisob natijasi bit darajasida bir xil.
- Xesh kanonik: kalitlar tartibi o'zgarsa ham bir xil chiqadi (testi bilan).
```

---

### P11 — Ma'lumotlar yaxlitligi: saqlash qatlami, audit izi, rollar; server arxitekturasi

**Bu bosqichdan oldin 3.4-bo'limdagi qarorlarni Claude Code'ga yozing.**

```text
CLAUDE.md'ni o'qi. P11 bosqichi. Branch: feat/p11-data-integrity.

Men qabul qilgan qarorlar:
- shaxsiy ma'lumotlar saqlanadigan joy: [SHU YERGA QARORINGIZNI YOZING];
- server: [hozir yoki keyinroq; provayder];
- elektron imzo: [yo'q yoki E-IMZO keyinroq].

1. Ma'lumotlar qatlami (src/storage/):
   - StorageAdapter interfeysi: hisoblar, shablonlar, reestrlar, audit;
   - LocalAdapter — IndexedDB. localStorage'dan avtomatik migratsiya qilinadi, eski ma'lumot yo'qolmaydi, migratsiya testi bo'lsin;
   - RemoteAdapter — REST API uchun skelet. Server tayyor bo'lganda ulanadi.

2. Audit izi (ISO/IEC 17025 7.5, 7.11, 8.4; ALCOA+):
   - faqat qo'shiladigan (append-only) jurnal: kim, qachon, nima, eski qiymat, yangi qiymat, sabab;
   - har bir yozuv oldingisining xeshi bilan zanjirlanadi (hash chain), yaxlitlikni tekshirish funksiyasi bo'ladi;
   - tasdiqlangan hisobdagi qiymatni o'zgartirish faqat yangi reviziya orqali va sabab yozish bilan;
   - audit izini ko'rish va eksport qilish oynasi.

3. Rollar va oqim: bajaruvchi → tekshiruvchi → tasdiqlovchi. Shablonlar va hisoblar uchun DRAFT → REVIEWED → APPROVED. Bitta odam o'z hisobini tasdiqlay olmaydi (sozlanadigan). Lokal rejimda bu "tashkilot ichida" faqat ogohlantirish darajasida ishlaydi. To'liq nazorat server bilan bo'ladi — buni UI'da ochiq yoz.

4. Firebase:
   - Firebase'ga yoziladigan maydonlarni audit qil;
   - shaxsiy ma'lumotlarni (F.I.Sh., telefon, email, STIR/INN) yangi kod Firebase'ga YOZMAYDI;
   - mavjud oqim uchun ko'chirish rejasini docs/DATA_RESIDENCY.md ga yoz: qaysi maydon, qayerga, qanday migratsiya, O'RQ-547 27¹-modda va pd.gov.uz reestridan o'tish bo'yicha nima qilish kerak;
   - menga kerakli qarorlar ro'yxatini ber.

5. Server arxitekturasi hujjati (docs/SERVER_DESIGN.md), kod emas yoki minimal prototip:
   - Node.js servis, src/engine/ ni aynan o'zi import qiladi;
   - POST /api/v1/evaluate — kirish ma'lumotlaridan mustaqil qayta hisob va natijalarni solishtirish;
   - POST /api/v1/certificates — tasdiqlash, xesh, QR, saqlash;
   - GET /verify/{id} — ochiq tekshirish sahifasi;
   - PostgreSQL sxemasi (append-only jadvallar), zaxira nusxa, TLS, autentifikatsiya, rollar;
   - O'zbekistonda hosting talablari.

6. Xavfsizlik:
   - foydalanuvchi ma'lumoti chiqadigan barcha innerHTML joylarini tekshir va escape qil;
   - Content-Security-Policy meta tegi;
   - parser'ga zararli kirishlar uchun testlar (juda uzun ifoda, chuqur qavslar, prototype kalitlari).

Qabul mezonlari:
- localStorage'dagi eski hisoblar IndexedDB'ga ko'chadi va ochiladi.
- Audit zanjiri buzilganda (testda bitta yozuv qo'lda o'zgartiriladi) tekshiruv buni aniqlaydi.
- DATA_RESIDENCY.md va SERVER_DESIGN.md tayyor.
```

---

### P12 — Dasturiy ta'minot validatsiyasi paketi (ISO/IEC 17025 7.11.2)

```text
CLAUDE.md'ni o'qi. P12 bosqichi. Branch: docs/p12-validation-package.

Maqsad: akkreditatsiya organiga taqdim etiladigan "dastur validatsiyasi" paketini avtomatik va hujjat ko'rinishida tayyorlash (BL-04). Uslub WELMEC 7.2, OIML D 31 va GAMP 5 tamoyillariga tayansin. Bu hujjatlardan iqtibos keltirma, faqat tuzilma g'oyasini ol.

1. docs/validation/ (o'zbek tilida, kerak bo'lsa ruscha nusxasi bilan):
   - VALIDATION_PLAN.md: tizim tavsifi, qamrov, xavf bahosi, qabul mezonlari, IQ/OQ/PQ yondashuvi, rollar;
   - REQUIREMENTS.md: funksional talablar ro'yxati (ID bilan);
   - VALIDATION_MATRIX.md (RTM): talab → kod → test → natija. Avtomatik yangilanadigan qismi bo'lsin;
   - CHANGE_CONTROL.md: versiyalash qoidalari, hisoblashga ta'sir qiluvchi o'zgarishlar tartibi, regressiya talabi;
   - PQ_PROTOCOL_TEMPLATE.md: laboratoriya o'z metodikasini platformada Excel yoki qo'lda hisob bilan parallel tekshirishi uchun shablon;
   - USER_REQUIREMENTS_TEMPLATE.md: laboratoriya to'ldiradigan URS.

2. scripts/validation-report.js: CI'da barcha test misollari bajarilgach, HTML/PDF "Validation Summary Report" yaratadi. Unda bo'ladi:
   - sana, ENGINE_VERSION, commit SHA;
   - misollar ro'yxati, manbasi va kutilgan/olingan qiymatlar;
   - farqlar va o'tdi/o'tmadi holati;
   - verified/unverified/pending statistikasi.
   GitHub Actions bu faylni artifact sifatida saqlasin.

3. Saytda "Validatsiya" sahifasi: oxirgi validatsiya hisobotini ko'rish va yuklab olish, dvigatel versiyasi, o'zgarishlar tarixi.

4. Akkreditatsiya eksperti savollariga javoblar (docs/validation/ASSESSOR_FAQ.md). Gemini hisobotidagi 10 ta savolni asos qil, lekin javoblarda FAQAT haqiqatan amalga oshirilgan narsalarni yoz. Hali yo'q imkoniyatlarni "rejalashtirilgan" deb belgila.

Qabul mezonlari:
- CI har push'da validatsiya hisobotini yaratadi.
- Hujjatlarda hali bajarilmagan imkoniyat "bajarilgan" deb yozilmagan.
```

---

### P13 — AI yordamchi (ixtiyoriy, oxirgi bosqich; ISO/IEC 42001 tamoyillari)

```text
CLAUDE.md'ni o'qi. P13 bosqichi. Branch: feat/p13-ai-assistant.

Asosiy tamoyil: AI hech qachon sonli natija (u_c, ν_eff, k, U) hisoblamaydi va natijani o'zgartirmaydi. AI faqat shablon qoralamasi yoki matn taklif qiladi. Barcha hisobni deterministik dvigatel bajaradi. Har bir AI taklifi inson tasdig'idan o'tadi.

1. Arxitektura hujjati (docs/AI_DESIGN.md):
   - qaysi model yoki API ishlatiladi; API kalitlari brauzerda saqlanmaydi, server orqali chaqiriladi;
   - qanday ma'lumot yuboriladi; shaxsiy va mijoz ma'lumotlari yuborilmaydi;
   - xavflar: gallyutsinatsiya, noto'g'ri birlik, yashirin tuzatma;
   - nazorat mexanizmlari;
   - ISO/IEC 42001 (hayotiy sikl, inson nazorati, ma'lumot sifati) bo'yicha talablar.
   Kod yozishdan oldin bu hujjatni menga tasdiqlatish uchun ko'rsat.

2. Funksiyalar (tasdiqlangandan keyin, bosqichma-bosqich):
   a) metodika yoki standart matnidan shablon qoralamasi:
      - AI JSON qaytaradi, u methodology.schema.json bo'yicha validatsiya qilinadi;
      - o'lchamlik tekshiruvi va linter ishga tushadi;
      - shablon "AI_DRAFT" holatida ochiladi, faqat metrolog tasdiqlagandan keyin DRAFT holatiga o'tadi;
   b) kalibrlash sertifikatidan (PDF/rasm) U, k, tuzatma va sanani ajratish:
      - har bir qiymat yonida manba joyi ko'rsatiladi;
      - foydalanuvchi har bir qiymatni tasdiqlaydi;
   c) natijani oddiy tilda tushuntirish (3 tilda):
      - faqat ichki ilova sifatida beriladi;
      - sertifikatning rasmiy matni shablondan chiqadi, AI uni yozmaydi.

3. Har bir AI chaqiruvi audit iziga yoziladi: model, prompt versiyasi, sana, kim tasdiqladi.

Qabul mezonlari:
- AI o'chirib qo'yilganda platforma to'liq ishlaydi.
- AI taklifi tasdiqlanmaguncha hisob "rasmiy" bo'lmaydi.
- Yuboriladigan ma'lumotda shaxsiy ma'lumot yo'qligi testi bor.
```

---

## 6. Bosqichlar orasida yordamchi promptlar

**Natija buzilganda:**
```text
9 ta etalon Excel nuqtasidan biri o'zgardi (test chiqishini ko'r). Oxirgi commit'lardan qaysi biri sabab bo'lganini git bisect yoki diff bilan aniqla. Sababini metrologik nuqtai nazardan tushuntir. O'zgarish asoslimi (masalan, oldingi xato tuzatildimi) yoki regressiyami? Asoslangan bo'lsa ham, mening roziligimsiz test kutilgan qiymatini o'zgartirma.
```

**Yangi shablon qo'shish (P05'dan keyin, har bir yangi parametr uchun):**
```text
CLAUDE.md'ni o'qi. Quyidagi metodika bo'yicha yangi JSON shablon yarat: [metodika nomi / standart raqami, fayl docs/references/ da]. Model, kirishlar, B tur manbalari va qaror qoidasini metodikadan ol. Metodikadagi metrologik xatolarni (MPE byudjetda, k ga bo'linmagan U va h.k.) alohida ro'yxat qil, ularni shablonga ko'chirma. Metodikada raqamli misol bo'lsa, uni test misoliga aylantir. Shablonni DRAFT holatida qoldir.
```

**Bosqich oxiri hisoboti:**
```text
Ushbu bosqichni yakunla:
- docs/PLAN.md da holatni yangila;
- CHANGELOG.md'ga yoz;
- ENGINE_VERSION'ni tekshir;
- testlar va validatsiya hisobotini ishga tushir;
- PR tavsifiga quyidagilarni yoz: nima qilindi, qanday tekshirildi (testlar soni, verified misollar), ma'lum cheklovlar, keyingi bosqichdan oldin men hal qilishim kerak bo'lgan savollar.
```
