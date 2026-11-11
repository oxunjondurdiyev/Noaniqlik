# Gemini Deep Research uchun prompt — UncertaintyCalc platformasi auditi

> Quyidagi chiziqdan pastdagi butun matnni nusxalab, Gemini Deep Research'ga bering.

---

## Rol

Sen metrologiya (o'lchash noaniqligi), ISO/IEC 17025:2017 bo'yicha akkreditatsiya va laboratoriya dasturiy ta'minotini validatsiya qilish bo'yicha mustaqil ekspertsan. Vazifang — quyida tasvirlangan veb-platformani **audit qilish**: hozirgi holatini xalqaro me'yoriy hujjatlar va bozordagi analog dasturlar bilan solishtirish, kamchiliklarni aniqlash va platformani **istalgan turdagi noaniqlik hisobini bajara oladigan, moslashuvchan va optimal** holatga keltirish uchun nimalar qo'shish kerakligini ustuvorlik tartibida ko'rsatish.

Javobni **o'zbek tilida** yoz. Texnik atamalar (GUM, ν_eff, CMC, MPE va h.k.) asl ko'rinishida qolsin. Har bir xulosa uchun manba (hujjat nomi, bo'lim raqami, havola) ko'rsat. Ingliz va rus tilidagi manbalardan ham foydalan.

## Platforma

- **Nomi:** UncertaintyCalc
- **Havola (sinab ko'rish uchun):** https://oxunjondurdiyev.github.io/Noaniqlik/
- **Maqsad:** O'zbekistondagi sinov va kalibrlash laboratoriyalari uchun o'lchash noaniqligini GUM bo'yicha hisoblash va ISO/IEC 17025 talabiga mos hisobot chiqarish.
- **Texnologiya:** brauzerda ishlaydigan SPA (vanilla JavaScript, framework yo'q), GitHub Pages'da joylashgan. Hisob-kitob to'liq brauzerda bajariladi. Firebase (Firestore) faqat ro'yxatdan o'tish, tashkilotlar va to'lov holati uchun. Interfeys 3 tilda: o'zbek, rus, ingliz.
- **Asosiy hujjatlar:** JCGM 100:2008 (GUM), JCGM 101:2008 (Monte-Karlo), EA-4/02 M:2022, ILAC P14:09/2020, COOMET R/GM/32, ILAC G8, JCGM 106.

## Hozirgi imkoniyatlar (2026-yil noyabr holati)

### 1. O'lchash modeli
- Istalgan funksiya y = f(x₁…xₙ): `+ − × / ^`, qavslar, `sqrt ln log exp sin cos tan abs pi`. Xavfsiz parser ishlatiladi (`eval` yo'q).
- Sezgirlik koeffitsiyentlari cᵢ o'rtacha qiymat nuqtasida markaziy ayirma bilan sonli hisoblanadi, ya'ni faqat **birinchi tartibli** Teylor yaqinlashuvi.
- Parametrlar soni cheklanmagan. Bitta qiymat kiritilgan parametr o'zgarmas deb qabul qilinadi (masalan, etalon qiymati).

### 2. A tur baholash (har bir parametr uchun usul tanlanadi)
- **1-usul:** s/√n, ν = n−1.
- **2-usul:** oldindan aniqlangan s_p va ν_p.
- **3-usul:** COOMET kichik tanlama tuzatmasi.
- **↑/↓ yo'nalishli o'qishlar:**
  - x̄ = (x̄↑ + x̄↓)/2;
  - takrorlanuvchanlik yo'nalish ichida hisoblanadi (s_p, ν = n−2);
  - histerezis h = |x̄↓ − x̄↑| avtomatik B tur manba sifatida qo'shiladi (a = h/2, to'g'ri burchakli taqsimot).
- **Juftlangan o'lchashlar:** kirishlar orasidagi korrelyatsiya r ma'lumotlardan hisoblanadi. Qo'shimcha ravishda B tur kovariatsiyani qo'lda kiritish mumkin.

### 3. B tur baholash
- **Taqsimotlar va bo'luvchilari:**
  - to'g'ri burchakli — √3;
  - normal — k (sertifikatdagi);
  - uchburchakli — √6;
  - U-simon — √2;
  - diskretlik (ajratish qobiliyati) — 2√3.
- **Chegara (yarim kenglik) qiymati:** son yoki parametrlar formulasi bo'lishi mumkin, masalan `0.0002*I + 0.002`.
- Har bir manba uchun cheklangan ν kiritish mumkin. Bo'sh qoldirilsa ν = ∞.
- Har bir manbaga ko'paytuvchi (sezgirlik) berish mumkin.

### 4. Natija
- **Hisoblash zanjiri:**
  - u_c (korrelyatsiya hadlari bilan);
  - Welch–Satterthwaite bo'yicha ν_eff;
  - k = t(P; ν_eff) yoki qat'iy k = 2;
  - P tanlovi: 95 %, 95,45 %, 99 %, 99,73 %.
- **Yaxlitlash:** U 2 qiymatli raqamgacha, "odatiy" yoki "yuqoriga" usulida.
- **Natijalar sahifasida:**
  - noaniqlik byudjeti jadvali (har bir manbaning ulushi bilan);
  - korrelyatsiya jadvali;
  - GUM H.2 bo'yicha to'g'ridan-to'g'ri tekshiruv;
  - ILAC P14 standart izoh matni.
- **Ogohlantirishlar quyidagi holatlarda chiqadi:**
  - s = 0;
  - n < 5;
  - U < CMC;
  - U = 0;
  - U > MPE.

### 5. Muvofiqlik va kalibrlash
- **Muvofiqlik baholash:**
  - MPE son yoki formula ko'rinishida kiritiladi;
  - oddiy qabul |E| ≤ MPE;
  - himoyalangan qabul |E| + U ≤ MPE, "noaniq zona" bilan;
  - keltirilgan xato γ.
- **Ko'p nuqtali kalibrlash:**
  - nuqtalarni saqlash, ochish va o'chirish;
  - sertifikat ilovasi jadvali;
  - barcha nuqtalar uchun bir xil (eng katta) k qo'llash.
- **Monte-Karlo tekshiruvi (JCGM 101):**
  - M = 10⁵ … 10⁶;
  - eng qisqa qamrov intervali;
  - GUM natijasi bilan §8 bo'yicha avtomatik solishtirish;
  - **cheklov:** korrelyatsiya hisobga olinmaydi.

### 6. Hisobot va shablonlar
- **Chop etiladigan hisobot:** model, kuzatuvlar, kirish kattaliklari, byudjet, hisoblash qadamlari, muvofiqlik va yakuniy natija. Ko'p nuqtali hisobotda avval umumiy jadval, keyin har bir nuqta alohida sahifada.
- **Tayyor shablonlar:**
  - massa;
  - hajm;
  - zichlik (ρ = m/V);
  - kuchlanish;
  - qarshilik;
  - quvvat;
  - uzunlik;
  - yuza;
  - harorat;
  - gazoanalizator kalibrlash (3 nuqta);
  - manometrik termometr kalibrlash (5 nuqta).

### 7. Validatsiya (bajarilgan)
- Uchta real Excel hisob-varag'i (zichlik, KEDR-07 gazoanalizatori, MS-MK-3 termometri) bo'yicha barcha 9 nuqta platforma natijasi bilan aynan mos keldi.
- Monte-Karlo natijasi qo'llanmadagi qiymat bilan mos keldi: [−0,0113; 0,0465] va qo'llanmada [−0,0111; 0,0469].
- Avtomatik test: `tests/verify-excel.js`.

### Ma'lum bo'lgan kamchiliklar
- Faqat bitta chiqish kattaligi bor: ko'p o'zgaruvchili model (JCGM 102) qo'llab-quvvatlanmaydi.
- Ikkinchi tartibli hadlar (GUM 5.1.2 izohi) hisobga olinmaydi. Kuchli nochiziqli modellarda bu xato beradi.
- Monte-Karlo korrelyatsiyani hisobga olmaydi. Adaptiv M (JCGM 101 §7.9) yo'q.
- O'lchov birliklari tekshirilmaydi: birliklar konversiyasi va o'lchamlik tahlili yo'q.
- Ma'lumotlarni Excel/CSV'dan import qilish va natijani Excel/CSV/PDF'ga eksport qilish yo'q. Hisobot faqat brauzer orqali chop etiladi.
- Hisoblar faqat brauzer xotirasida (localStorage) saqlanadi. Bulutda tarix, versiyalash, audit izi va elektron imzo yo'q.
- Laboratoriya resurslari uchun ma'lumotnomalar yo'q: etalonlar, sertifikatlar va drift tarixi, CMC jadvali, metodikalar kutubxonasi.
- Malaka sinovlari (PT/ILC) yo'q: En, z, ζ-score hisoblanmaydi.
- Kalibrlash egri chizig'i (regressiya, ISO/TS 28037), bir nechta nuqta orasida interpolyatsiya va "noaniqlik — diapazon" funksiyasi yo'q.
- Sinov laboratoriyalariga xos yondashuvlar yo'q:
  - top-down (validatsiya ma'lumotlaridan, ISO 21748, Nordtest TR 537, EURACHEM/CITAC);
  - namuna olish noaniqligi.
- Dasturiy ta'minot validatsiyasi to'g'risida rasmiy hujjat yo'q (ISO/IEC 17025 6.2.2/7.11 talabiga ko'ra).

## Tadqiqot savollari

1. **Me'yoriy muvofiqlik.** Yuqoridagi imkoniyatlar quyidagi hujjatlarning qaysi talablarini to'liq, qisman yoki umuman qoplamaydi: GUM, JCGM 101/102/106, EA-4/02, ILAC P14, ILAC G8, ISO/IEC 17025:2017 (7.6, 7.8.6, 7.11), EURACHEM/CITAC QUAM. Jadval ko'rinishida: talab → holat → yetishmayotgan qism.
2. **Bozor tahlili.** Analog dasturlar bilan solishtirish: GUM Workbench, Metrodata GUM Workbench Pro, NIST Uncertainty Machine, Fluke MET/TEAM, Uncertainty Calculator (Beamex), METBASE, QMSys GUM, LabSoft LIMS modullari va boshqalar. Har birida bor-u, bizda yo'q funksiyalar ro'yxati; narx va litsenziya modeli.
3. **"Istalgan turdagi noaniqlik".** Kalibrlash va sinov laboratoriyalarida uchraydigan baholash turlarining to'liq tasnifi:
   - bottom-up;
   - top-down;
   - regressiya;
   - Monte-Karlo;
   - ko'p o'zgaruvchili;
   - kimyoviy va mikrobiologik;
   - namuna olish;
   - sifatli (binar) testlar.

   Har bir tur uchun platformaga nima qo'shish kerakligini yoz: hisoblash usuli va kerakli kirish ma'lumotlari.
4. **Moslashuvchanlik.** Foydalanuvchi o'z modeli, shabloni va metodikasini yaratib, saqlab, tashkilot ichida ulashishi uchun qanday arxitektura kerak? Masalan: shablon kutubxonasi, versiyalash, laboratoriya darajasidagi standart sozlamalar.
5. **Ishonchlilik va validatsiya.** Hisoblash dvigatelini mustaqil tekshirish uchun qaysi rasmiy test misollari mavjud? Masalan: GUM H.1–H.6, JCGM 101 misollari, EA-4/02 S-misollari, NIST va PTB test datasetlari. Platformani akkreditatsiya organi oldida "validatsiyalangan dastur" deb ko'rsatish uchun nima kerak?
6. **Mintaqaviy talablar.** O'zbekiston akkreditatsiya markazi (O'zAK), COOMET va GOST R 54500 (GUM'ning rus versiyasi), RMG 43 va MI 2083 talablari. Mahalliy laboratoriyalar uchun qaysi hisobot shakllari majburiy yoki odatiy?
7. **Foydalanuvchi tajribasi.** Noaniqlik hisobida eng ko'p uchraydigan foydalanuvchi xatolari qaysilar? Masalan:
   - MPE'ni byudjetga qo'shish;
   - sertifikatdagi U'ni k ga bo'lmaslik;
   - ikki marta hisobga olish;
   - korrelyatsiyani e'tiborsiz qoldirish.

   Platforma ularni qanday avtomatik aniqlay oladi?
8. **Biznes model.** O'zbekiston va MDH bozorida laboratoriyalar soni, to'lov qobiliyati va SaaS yoki litsenziya modeli. Qaysi funksiyalar pullik tarifga arziydi?

## Kerakli javob formati

1. **Qisqa xulosa:** platforma hozir qaysi darajada (masalan, "kalibrlash laboratoriyasi uchun 70 % tayyor") va asosiy 5 ta xavf.
2. **Muvofiqlik matritsasi** (1-savol bo'yicha jadval).
3. **Raqobatchilar bilan solishtirish jadvali.**
4. **Qo'shiladigan funksiyalar ro'yxati.** Har bir funksiya uchun quyidagilar ko'rsatilsin:
   - ustuvorlik: P0 (akkreditatsiya uchun majburiy), P1 (raqobat uchun muhim), P2 (qulaylik);
   - qisqa tavsif;
   - qaysi me'yoriy hujjat talab qiladi;
   - murakkablik: S, M yoki L;
   - foydalanuvchiga foydasi.
5. **Validatsiya to'plami:** platformada sinab ko'rish uchun 10–15 ta rasmiy test misoli. Har biri uchun kirish ma'lumotlari va kutilgan natija (y, u_c, ν_eff, k, U) manbasi bilan berilsin.
6. **6 oylik yo'l xaritasi:** bosqichlarga bo'lingan reja.
7. **Manbalar ro'yxati.**

## Qo'shimcha ko'rsatma

Platformani o'zing ochib, kamida quyidagi stsenariylarni bajarib ko'r va kuzatganlaringni xulosaga qo'sh:

- **Zichlik shabloni:** "Zichlik" shablonini yuklab, natijani tekshir. Kutilgan natija ρ = 0,9982 ± 0,0013 g/cm³.
- **Gazoanalizator shabloni:** "Gazoanalizator (3 nuqta)" shablonini yuklab, nuqtalar jadvalini, Monte-Karlo tugmasini va "bir xil k" tanlovini sinab ko'r.
- **Termometr shabloni:** "Termometr (5 nuqta)" shablonini yuklab, ↑/↓ ustunini va noaniq zona xulosasini tekshir.
- **O'z modeling:** yangi sessiya ochib, nochiziqli model kirit (masalan, `P = U^2 / R`) va natijani NIST Uncertainty Machine bilan solishtir.
