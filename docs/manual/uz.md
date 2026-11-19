# UncertaintyCalc — foydalanuvchi qo'llanmasi

Bu qo'llanma UncertaintyCalc platformasida o'lchash noaniqligini hisoblash tartibini tushuntiradi. Har bir rejim uchun misol raqamlari faqat tekshirilgan (`verified`) test misollaridan olingan; har bir misolda manba hujjati va test identifikatori (`tests/cases/` dagi `id`) ko'rsatilgan. Qo'llanmadagi tugma va yorliq nomlari interfeysning o'zbek tilidagi matniga mos.

Qo'llanma dvigatelning 2.10.0 versiyasi holatiga ko'ra yozilgan. Joriy versiya har bir hisobot pastida ko'rsatiladi.

## 1. Kirish

### 1.1. Platforma nima qiladi

UncertaintyCalc — brauzerda ishlaydigan dastur. U o'lchash natijasi `y`, yig'ma standart noaniqlik `u_c`, samarali erkinlik darajalari soni `ν_eff`, qamrov koeffitsiyenti `k` va kengaytirilgan noaniqlik `U` ni hisoblaydi, noaniqlik byudjetini tuzadi va bosma hisobot tayyorlaydi. Interfeys uch tilda: o'zbek, rus, ingliz.

Ish oynasida yettita yorliq bor: **Ma'lumot kiritish**, **B-tip** va **Natijalar** (GUM rejimi, Monte-Karlo, vektor modellar), **Regressiya**, **Top-down**, **Maxsus rejimlar** va **Laboratoriya**.

### 1.2. Me'yoriy asos

| Hujjat | Platformada nima uchun |
|---|---|
| JCGM 100:2008 (GUM) | A va B tur baholash, tarqalish qonuni, ν_eff, k |
| JCGM 101:2008 | Monte-Karlo usuli |
| JCGM 102:2011 | bir nechta chiqish kattaligi, qamrov sohasi, oshkor bo'lmagan model |
| JCGM 106:2012 | muvofiqlikni baholash, qaror qoidasi |
| EA-4/02 M:2022 | kalibrlashda noaniqlik, k = 2 |
| ILAC P14:09/2020 | U ni yaxlitlash, CMC |
| ILAC G8:09/2019 | qaror qoidalari va muvofiqlik bayonoti |

ISO/IEC 17025:2017 matni repozitoriyda yo'q (pullik standart). Dasturdagi unga havolalar (masalan, hisobot rekvizitlari ro'yxati) standart matni bilan solishtirilmagan va **tekshirilmagan** deb hisoblanadi.

### 1.3. Brauzer talablari

ES modullarini qo'llaydigan brauzer kerak (2018-yildan keyingi versiyalar). Eski brauzerda faqat ogohlantirish chiqadi. Brauzerlar bo'yicha tekshiruv holati — [ma'lum cheklovlar](../validation/KNOWN_LIMITATIONS.md) da.

### 1.4. Ma'lumot qayerda saqlanadi

- Joriy hisob, til va interfeys sozlamalari — brauzerning `localStorage` xotirasida.
- Shablonlar, etalonlar reestri, CMC jadvali, QC kartalari, malaka sinovlari va validatsiya to'plamlari, audit izi — brauzerning IndexedDB xotirasida.
- Laboratoriya rekvizitlari (nom, manzil, akkreditatsiya raqami, logotip) — `localStorage` da. Buyurtmachi va tasdiqlovchi ma'lumotlari — faqat joriy sessiyada (`sessionStorage`), oyna yopilganda o'chadi.
- Firebase faqat ro'yxatdan o'tish, tashkilotlar va to'lov uchun ishlatiladi. Hisoblar, kuzatuvlar, reestr va hisobotlar serverga yuborilmaydi.

Bundan kelib chiqadi: brauzer ma'lumotlari tozalansa yoki boshqa kompyuterga o'tilsa, hisoblar yo'qoladi. Muhim hisobni **JSON eksport** tugmasi bilan faylga saqlang (11-bo'lim), omborni esa **Ma'lumotlar: eksport / import / audit** orqali eksport qiling.

## 2. Tezkor boshlash

1. **Tilni tanlang.** Bosh sahifaning yuqori qismida **UZ / RU / EN** tugmalari bor. Tanlov brauzerda saqlanadi.
2. **Kalkulyatorni oching.** **Kalkulyatorni ochish** tugmasini bosing. Ro'yxatdan o'tmasdan 7 ta bepul hisoblash bajarish mumkin; qolgan soni sozlash sahifasida ko'rsatiladi. Undan keyin **Ro'yxatdan o'tish** yoki **Kirish** kerak.
3. **Hisobni sozlang.** **Hisoblashni sozlash** sahifasida **O'lchashlar soni (n)** va **Parametrlar soni (p)** ni kiriting. Tayyor namunadan boshlash uchun **Sozlamani yuklash** ro'yxatidan tanlang yoki **Shablonlar katalogi** ni oching. Keyin **Hisoblashni boshlash →**.
4. **Kuzatuvlarni kiriting.** **Ma'lumot kiritish** yorlig'idagi jadvalga o'lchash qiymatlarini yozing. Excel dan nusxalab qo'yish (Ctrl+V) yoki **Fayldan import (.xlsx, .csv)** ham mumkin. Chap paneldagi **Parametr qo'shish** bilan kirish kattaliklari qo'shiladi.
5. **Model formulasini yozing.** **O'lchash modeli** bo'limida **Formula y = f(x₁…xₙ)** maydoniga, masalan, `ρ = m / V` deb yozing va **Natija birligi** ni ko'rsating. Bitta parametrli to'g'ridan-to'g'ri o'lchashda formulani bo'sh qoldirish mumkin (y = x).
6. **A turni hisoblang.** **A-tip noaniqlikni hisoblash →**.
7. **B tur manbalarini kiriting.** **B-tip** yorlig'ida **Komponent qo'shish** (yoki **Reestrdan tanlash**) bilan har bir manbani qo'shing: parametr, taqsimot, yarim kenglik yoki sertifikatdagi U va k. Shu yorliqda hisob sozlamalari ham bor: **Ishonch ehtimoli P**, **Qamrov koeffitsiyenti k**, **Model turi**, **Ruxsat etilgan xato MPE (±)**, CMC, **Qaror qoidasi**.
8. **Natijani oling.** **Umumiy noaniqlikni hisoblash →**. **Natijalar** yorlig'ida noaniqlik byudjeti, natija va **Tekshiruv natijalari** (linter topilmalari) chiqadi.
9. **Hisobot.** **Hisobot shakli** ni tanlang, **Rekvizitlar** ni to'ldiring va **Hisobot chop etish** ni bosing.

Yangi hisobni boshlash uchun — **Yangi sessiya**.

### 2.1. Shablonlar

**Shablonlar katalogi** da metodika shablonlari turadi. Kartochkadagi **Hisoblash** tugmasi shablonni hisobga yuklaydi, **Muharrir** shablonni tahrirlash uchun ochadi, **Yangi shablon** va **Shablonni import (JSON)** o'z shabloningizni qo'shadi.

Shablon holati: `DRAFT` → `REVIEWED` → `APPROVED`. Dastur bilan birga keladigan barcha shablonlar hozir `DRAFT` holatida va ularda raqamli qiymatlar (yarim kenglik, U, k) yo'q — bu qiymatlarni laboratoriya o'z sertifikatlari va metodikasidan kiritadi. Shablon tuzish tartibi — [shablon yo'riqnomasi](../TEMPLATE_GUIDE.md) da.

**Laboratoriya sozlamalari** oynasida laboratoriya uchun standart qiymatlar belgilanadi (P, k usuli, ν_eff qoidasi, yaxlitlash, standart qaror qoidasi, Monte-Karlo sozlamalari va boshqalar). Ustunlik tartibi: dastur standarti, keyin laboratoriya, keyin shablon, keyin hisob sahifasida foydalanuvchi kiritgan qiymat.

## 3. GUM rejimi (noaniqlikning tarqalish qonuni)

### 3.1. A tur baholash

Har bir kirish kattaligi uchun kuzatuvlar qatoridan o'rtacha, standart og'ish `s` va o'rtachaning standart noaniqligi `u_A = s / √n` hisoblanadi, erkinlik darajalari soni `ν = n − 1` (JCGM 100:2008 §4.2). Jadval ostida o'rtacha, dispersiya, `s` va `u_A` ko'rsatiladi.

Agar kuzatuv bitta bo'lsa yoki takrorlanuvchanlik oldindan ma'lum bo'lsa (yig'ma standart og'ish `s_p`), uni B tur manbasi sifatida kiriting — quyidagi misolda shunday qilingan.

### 3.2. B tur taqsimotlari

| Interfeysdagi nom | Standart noaniqlik |
|---|---|
| To'rtburchak (bir xil) | a / √3 |
| Normal (Gauss) | U / k |
| Uchburchak | a / √6 |
| U-shaklli (arksinusli) | a / √2 |
| Diskretlik / bo'linma qiymati d | d / (2√3) |
| Trapetsiya | a·√((1 + β²) / 6) |
| Egri trapetsiya — chegaralari noaniq | √(a² / 3 + d² / 9) |
| Eksponensial — manfiy bo'lmagan kattalik | u = x |
| Log-normal | U / k |

Birinchi beshtasi JCGM 100:2008 §4.3 va JCGM 101:2008 §6.4 bo'yicha; trapetsiya, egri trapetsiya va eksponensial — JCGM 101:2008 §6.4. Log-normal taqsimot manba misoli bilan tasdiqlanmagan (**unverified**).

Yarim kenglik maydoniga son yoki ifoda yozish mumkin (masalan, `25 / sqrt(3)`). **Ko'paytuvchi** maydoni manbani parametr birligiga o'tkazadi; modelning sezgirlik koeffitsiyenti ∂y/∂x avtomatik hisoblanadi.

**Muhim qoida.** Kalibrlanayotgan asbobning ruxsat etilgan xatosi (MPE) hech qachon avtomatik ravishda noaniqlik manbai bo'lmaydi. MPE faqat muvofiqlikni baholash uchun kiritiladi (10-bo'lim). Etalon reestridagi MPE / tolerans ham manba sifatida taklif qilinmaydi.

### 3.3. Korrelyatsiya

- **O'lchashlar juftlangan** belgisi qo'yilsa, korrelyatsiya koeffitsiyenti kuzatuvlardan hisoblanadi (A tur).
- **B turi kovariatsiyasi u_B(xᵢ,xⱼ)** faqat ikkala kattalik umumiy etalon, asbob yoki tuzatmaga bog'liq bo'lganda kiritiladi (JCGM 100:2008 §5.2.4, F.1.2.3). Aks holda 0 qoldiring.

Natijalarda korrelyatsiyaning u_c ga ta'siri alohida ko'rsatiladi.

### 3.4. ν_eff va qamrov koeffitsiyenti k

`ν_eff` Welch–Satterthwaite formulasi bilan hisoblanadi (JCGM 100:2008 G.4.1). **Qamrov koeffitsiyenti k** sozlamasi:

- **Styudent bo'yicha, ν_eff dan** — k = t_P(ν_eff);
- **k = 2 (qat'iy)** — EA-4/02 M:2022 bo'yicha.

ν_eff kasr bo'lganda standart qoida — **Pastga butunlash (⌊ν⌋)**: k = t_P(⌊ν_eff⌋) (JCGM 100:2008 G.4.1, 1-izoh). **Interpolyatsiya** — ixtiyoriy laboratoriya sozlamasi. Qo'llanilgan qoida hisobotda yoziladi.

### 3.5. Yaxlitlash

Oraliq hisoblar yaxlitlanmaydi. Yaxlitlash faqat hisobotda bajariladi:

- U — ko'pi bilan 2 ta qiymatli raqam (ILAC P14:09/2020 §5). Yuqoriga yaxlitlashdan keyin ham 2 ta raqam qoladi: 0,0999 → 0,10.
- y — U ning oxirgi xonasigacha, "yarimni noldan uzoqqa" qoidasi bilan (Excel ROUND bilan mos): −0,125 → −0,13.

Eksport fayllarida sonlar yaxlitlanmagan holda beriladi, yaxlitlangan ko'rinish alohida qatorda turadi.

### 3.6. Model turi va MPE

**Model turi** sozlamasi model natijasi nima ekanini bildiradi: **ko'rsatish xatosi E = X − X_ref**, **kattalik qiymati Y (nominal bilan)** (bunda **Nominal qiymat** ham kiritiladi) yoki **ko'rsatilmagan**.

Dastur natijani o'zicha "xato" deb faraz qilmaydi. Model turi ko'rsatilmagan bo'lsa, muvofiqlik bayonoti berilmaydi. Eski saqlangan hisoblarda model turi — "ko'rsatilmagan".

### 3.7. Tekshiruv natijalari (linter) va asoslangan qabul

Har bir hisobdan keyin dastur natijani qoidalar bo'yicha tekshiradi va **Tekshiruv natijalari** bo'limida topilmalarni ko'rsatadi. Daraja uch xil: **Xato**, **Ogohlantirish**, **Ma'lumot**. Har bir topilmada "Nima uchun" va "Qanday tuzatish" izohi hamda manba bandi bor. Qoidalar ro'yxati — [linter qoidalari](../LINTER_RULES.md) da.

Xato yoki ogohlantirishni tuzatib bo'lmasa, uni **Asoslangan holda qabul qilish** mumkin: **Asos** maydoniga kamida 10 belgili izoh yoziladi va **Tasdiqlash** bosiladi. Izoh audit iziga (rol va vaqt bilan) yoziladi va hisobotda chiqadi.

- Qabul qilinmagan "xato" darajasidagi topilma bo'lsa, hisobot **RASMIY EMAS** suv belgisi bilan chiqadi.
- Barcha topilmalar bosma hisobotda ko'rinadi; ularni yashiradigan sozlama yo'q.
- U = 0 yoki U < CMC bo'lgan natija ogohlantirishsiz hisobotga chiqmaydi. Laboratoriya sozlamasi: **Hisobotda aniq belgilash** (standart) yoki **Hisobotni bloklash**.

### 3.8. Misol: 10 kg tosh kalibrlash

Manba: EA-4/02 M:2022, Supplement 1, S2.2–S2.11 (S2.9 byudjet jadvali), 29–30-betlar. Test misoli: `ea4-02-s2` (verified).

Model: `mX = mS + mD + dm + mC + B`, natija birligi mg. Sozlamalar: P = 0,9545, **k = 2 (qat'iy)**.

Kirish qiymatlari: mS = 10 000 005 mg, dm = 20 mg, qolganlari 0.

| Manba | Parametr | Taqsimot | Qiymat |
|---|---|---|---|
| m_S: sertifikat U = 45 mg, k = 2 (S2.3) | mS | Normal | U = 45, k = 2 |
| m_D: ±15 mg (S2.4) | mD | To'rtburchak | a = 15 |
| δm: s_p = 25 mg, n = 3 (S2.8) | dm | Normal | `25 / sqrt(3)`, k = 1 |
| δm_C: ±10 mg (S2.5) | mC | To'rtburchak | a = 10 |
| δB: ±10 mg (S2.6) | B | To'rtburchak | a = 10 |

Manbadagi natija:

| Kattalik | Manba qiymati | Manba bandi |
|---|---|---|
| m_X | 10 000,025 g | S2.9 |
| u(m_X) | 29,2 mg | S2.9 |
| k | 2 | S2.10 |
| U | 58 mg | S2.10 |

Izoh: manba U ni yaxlitlangan u = 29,2 mg dan hisoblagan (2 × 29,2 ≈ 58). Dastur oraliq qiymatlarni yaxlitlamaydi: u_c = 29,26 mg, U = 58,52 mg, hisobotda 2 ta qiymatli raqamgacha — 59 mg. Farq manbaning oraliq yaxlitlashidan; test toleransida shu sabab yozilgan.

ν_eff qoidasiga misol: `jcgm100-h1` (JCGM 100:2008, H.1, 79–84-betlar) — ν_eff = 16,7, P = 99 % da k = t₉₉(16) = 2,92, u_c = 32 nm, U₉₉ = 93 nm. Bu yerda ν_eff 16 ga pastga butunlanadi.

## 4. Monte-Karlo usuli (JCGM 101:2008)

**Natijalar** yorlig'idagi **Monte-Karlo tekshiruvi (JCGM 101:2008)** bo'limida **Simulyatsiyani boshlash** bosiladi. Hisob fon oqimida bajariladi, jarayon ko'rsatiladi, **Bekor qilish** bilan to'xtatish mumkin.

### 4.1. Sozlamalar

| Sozlama | Tanlov | Izoh |
|---|---|---|
| Hisob maqsadi | **GUM tekshiruvi (δ/5)** yoki **Oddiy MCM (δ)** | standart — GUM tekshiruvi |
| Sinovlar soni M | **Adaptiv M** yoki **Qat'iy M** | standart — adaptiv (JCGM 101:2008 §7.9.4); M chegarasi 10⁷ |
| n_dig | u(y) dagi ishonchli qiymatli raqamlar soni | standart 2; sonli tolerans δ shundan olinadi (§7.9.2) |
| Interval turi | **Eng qisqa interval** yoki **Simmetrik interval** | standart — eng qisqa |
| **Urug' (seed)** | butun son | standart 20261110 |

Generator — kengaytirilgan Wichmann–Hill (JCGM 101:2008 C.3.3). A tur kirishlari siljitilgan Styudent t taqsimotidan (§6.4.9), B tur kirishlari o'z taqsimotidan olinadi.

### 4.2. GUM natijasini tekshirish

GUM tekshiruvida Monte-Karlo intervali GUM intervali bilan solishtiriladi (JCGM 101:2008 §8). Bunda Monte-Karlo sonli toleransi δ/5 bo'lishi kerak (§8.2). Natija: **GUM natijasi tasdiqlandi** yoki **GUM natijasi tasdiqlanmadi**. Tasdiqlanmasa, hisobotda natija sifatida Monte-Karlo intervali ko'rsatiladi.

- M chegarasiga yetilsa yoki qat'iy M yetarli bo'lmasa — "barqarorlashmadi" topilmasi chiqadi va hisobotda "erishilgan 2s" yoziladi. n_dig = 2 va δ/5 bilan bu ko'p hisobda kutilgan holat.
- Toleransni δ ga tushirish — faqat laboratoriya sozlamasi; hisobotda belgi bilan chiqadi.
- **Oddiy MCM** da δ va §8 xulosasi berilmaydi.
- Erkinlik darajasi ν ≤ 2 bo'lgan t-kirishda u(y) aniqlanmagan — faqat qamrov intervali beriladi.
- Korrelyatsiyalangan kirishlar orasida normal bo'lmagan taqsimot bo'lsa, Monte-Karlo natijasi berilmaydi (GUM natijasi amal qiladi). Istisno — juftlangan A tur kuzatuvlari.

### 4.3. Takrorlanuvchanlik

Bir xil urug' va bir xil sozlamalar bir xil natija beradi. Urug', generator nomi, M va n_dig hisobotda yoziladi.

Turli brauzer dvigatellarida xom (yaxlitlanmagan) qiymat oxirgi xonada farq qilishi mumkin — nisbiy farq 1·10⁻¹⁴ dan oshmaydi; yaxlitlangan natija bir xil. Sababi: tasodifiy sonlar ketma-ketligi hamma joyda bir xil, lekin `log`, `sin`, `cos` funksiyalari dvigatellarda oxirgi xonada farq qiladi. Bit darajasidagi takrorlanuvchanlik faqat bir xil JS dvigateli versiyasi ichida kafolatlanadi. Hisobotda hisob bajarilgan brauzer qayd etiladi. Chegara (1·10⁻¹⁴) avtomatik tekshiriladi (Chromium, Firefox, WebKit); shartlanganligi yomon ayrim hosila kattaliklar (masalan, deyarli singular kovariatsiya matritsasining eng kichik xos qiymati) bundan mustasno — ularning ro'yxati va o'lchangan farqlar validatsiya hisobotida. Brauzerning faqat qisqa nomi va versiyasi yoziladi (hisob fayli va bosma hisobot pastida).

Dvigatelning 2.6.0 versiyasidan oldin saqlangan Monte-Karlo natijalari eski generator bilan aynan takrorlanadi; yangi hisoblar faqat Wichmann–Hill generatorida bajariladi.

### 4.4. Misol: to'rtta normal kirishli additiv model

Manba: JCGM 101:2008, §9.2.2, Table 2, 35–37-betlar. Test misoli: `jcgm101-9-2-2-mcm-adaptive` (verified).

Model: `Y = X1 + X2 + X3 + X4`. Har bir kirish: baho 0, normal taqsimot, standart noaniqlik 1. P = 0,95. Sozlamalar: adaptiv M, n_dig = 2, GUM tekshiruvi (δ/5), simmetrik interval.

| Kattalik | Manba qiymati (Table 2, Adaptive MCM) |
|---|---|
| y | 0,00 |
| u(y) | 2,00 |
| 95 % qamrov intervali | [−3,92; 3,92] |
| M | 1,23·10⁶ va 1,02·10⁶ (manbaning ikki qo'llanishi) |
| GUM tekshiruvi | tasdiqlangan |

M tasodifiy kattalik, shuning uchun faqat tartibi solishtiriladi. Xuddi shu model qat'iy M = 10⁶ bilan — `jcgm101-9-2-2-mcm`.

## 5. Ko'p chiqishli va oshkor bo'lmagan modellar (JCGM 102:2011)

### 5.1. Bir nechta chiqish kattaligi

**O'lchash modeli** bo'limida **Chiqish formulasi qo'shish** bilan ikkinchi va keyingi formulalar qo'shiladi. Natija — vektor: har bir chiqish uchun y, u, U, chiqishlar orasidagi kovariatsiya va **Chiqishlarning korrelyatsiya matritsasi r(y_i, y_j)** avtomatik hisoblanadi (U_y = C_x·U_x·C_xᵀ, JCGM 102:2011 §6.2).

- Har bir chiqishning U qiymati — alohida, o'z bir o'lchovli qoidasi bilan.
- Birgalikdagi qamrov faqat **Qamrov sohasi** orqali beriladi: ellips yoki ellipsoid (k_p) va to'g'ri burchakli soha (k_q) — JCGM 102:2011 §6.5. Ikki chiqishda ellips chizmasi ko'rsatiladi.
- Bitta chiqishli hisobning natijasi va hisob yo'li o'zgarmagan.
- Ko'p o'lchovli Monte-Karlo ham bor (JCGM 102:2011 §7). Ikki chiqishda Monte-Karlo natijasidan **Eng kichik qamrov sohasi (yaqinlashuv)** ham ko'rsatiladi.

### 5.2. Oshkor bo'lmagan model

h(Y, X) = 0 ko'rinishidagi model (JCGM 102:2011 §6.3) qo'llab-quvvatlanadi, lekin hozircha faqat hisob fayli (JSON) yoki shablon orqali kiritiladi — asosiy ekranda kiritish shakli yo'q. Har bir noma'lum uchun boshlang'ich qiymat majburiy: dastur uni o'ylab topmaydi. Yechim yaqinlashmasa yoki tenglamalar sistemasi singular bo'lsa, natija o'rniga xato topilmasi chiqadi.

### 5.3. Cheklovlar

- Oshkor bo'lmagan model uchun Monte-Karlo yo'q: dastur jimgina chiziqlashtirmaydi, xato beradi.
- Eng kichik qamrov sohasi — faqat ikki chiqish uchun.
- Ko'p chiqish va ko'p kalibrlash nuqtasi birga bo'lsa, yagona k yo'q; birgalikdagi qamrov har bir nuqta uchun alohida.
- Chiqishlar korrelyatsiyasi bo'yicha linter chegarasi (|r| > 0,5) egasi tasdig'ini kutmoqda.

### 5.4. Misol: ikki chiqishli additiv model

Manba: JCGM 102:2011, §9.2.2, Table 3, 36-bet. Test misoli: `jcgm102-9-2-2-guf` (verified).

Model: `Y1 = X1 + X3`, `Y2 = X2 + X3`. Har bir kirish: baho 0, normal taqsimot, standart noaniqlik 1. P = 0,95.

| Kattalik | Manba qiymati (Table 3, GUF) |
|---|---|
| y1, y2 | 0,000; 0,000 |
| u(y1), u(y2) | 1,414; 1,414 |
| r(y1, y2) | 0,500 |
| k_p (ellips) | 2,45 |
| k_q (to'rtburchak) | 2,24 |

Chiqishlar umumiy X3 kirishi tufayli korrelyatsiyalangan.

## 6. Regressiya (kalibrlash egri chizig'i)

**Regressiya** yorlig'ida **Kalibrlash nuqtalari** jadvaliga x va y qiymatlari kiritiladi (Excel dan nusxalab qo'yish mumkin: 2 ustun — x, y; 3 ustun — x, y, u(y); 4 ustun — x, u(x), y, u(y)). **Usul** va **Model** tanlanadi, kerak bo'lsa **To'g'ri bashorat: x → Y(x)** va **Teskari bashorat: y₀ → x̂₀** maydonlari to'ldiriladi, keyin **Hisoblash**.

| Usul | Holat |
|---|---|
| OLS va bashoratlar | verified (JCGM 100:2008 H.3; QUAM:2012 A5, E.4) |
| WLS, GLS, WTLS | unverified — manba repozitoriyda yo'q |
| 2- va 3-darajali polinom | unverified |

Tasdiqlanmagan usul ishlatilsa, hisobotda belgi chiqadi.

### 6.1. Misol: termometr kalibrlash

Manba: JCGM 100:2008, Annex H.3 (H.3.3, Table H.6, H.3.4), 89–92-betlar. Test misoli: `jcgm100-h3` (verified).

Usul — OLS, 1-darajali model, tayanch nuqta t₀ = 20 °C, 30 °C da to'g'ri bashorat. Kalibrlash nuqtalari (Table H.6, 2- va 3-ustunlar):

| t_k, °C | b_k, °C |
|---|---|
| 21,521 | −0,171 |
| 22,012 | −0,169 |
| 22,512 | −0,166 |
| 23,003 | −0,159 |
| 23,507 | −0,164 |
| 23,999 | −0,165 |
| 24,513 | −0,156 |
| 25,002 | −0,157 |
| 25,503 | −0,159 |
| 26,010 | −0,161 |
| 26,511 | −0,160 |

| Kattalik | Manba qiymati | Manba bandi |
|---|---|---|
| y₁ (kesishma) | −0,1712 °C | H.3.3 |
| s(y₁) | 0,0029 °C | H.3.3 |
| y₂ (qiyalik) | 0,00218 | H.3.3 |
| s(y₂) | 0,00067 | H.3.3 |
| r(y₁, y₂) | −0,930 | H.3.3 |
| s | 0,0035 °C | H.3.3 |
| ν | 9 | H.3.4 |
| b(30 °C) | −0,1494 °C | H.3.4 |
| u_c[b(30 °C)] | 0,0041 °C | H.3.4 |

30 °C kalibrlash diapazonidan tashqarida, shuning uchun dastur ekstrapolyatsiya haqida ogohlantiradi.

## 7. Top-down

**Top-down** yorlig'i uch qadamli usta: **Ma'lumot turi**, **Ma'lumot kiritish**, **Byudjet va natija**. Noaniqlik validatsiya va sifat nazorati ma'lumotlaridan baholanadi: Nordtest TR 537 bo'yicha u(R_w) (laboratoriya ichidagi takrorlanuvchanlik) va u(bias); QUAM:2012 bo'yicha recovery R_m va t-test, darajaga bog'liq noaniqlik, empirik (usul bilan belgilanadigan) kattalik. u(R_w) manbalari: nazorat namunasi qatori, dublikatlar farqi, nazorat kartasi chegaralari, tayyor s yoki CV %. Bias manbalari: sertifikatlangan namuna (CRM), malaka sinovi raundlari (PT), recovery.

Qoidalar:

- Har bir kattalik yo birlikda, yo nisbiy shkalada beriladi; nisbiy va mutlaq qiymatlarni aralashtirish — xato.
- k = 2 (P ≈ 95 %). ν_eff hisoblanadi va ko'rsatiladi; ν_eff < 30 bo'lsa ogohlantirish va t_P(⌊ν_eff⌋) taklifi chiqadi, lekin k avtomatik o'zgarmaydi.
- Bir omil ikki marta hisoblangan bo'lsa, ogohlantirish chiqadi va bosma hisobotda ham ko'rinadi.
- Empirik kattalikda bias kiritilsa, tayanch qiymat qaysi usul bilan olingani so'raladi.

ISO 21748 ga tayanadigan qismlar (laboratoriya s_r tekshiruvi, s_R ni moslash) — unverified: standart repozitoriyda yo'q.

### 7.1. Misol: suvda ammoniy azoti (NH₄-N)

Manba: Nordtest TR 537 ed. 4 (2017), §3.2 (1–6-qadamlar), §3.3, Appendix 4; 10, 11, 40-betlar. Test misoli: `nordtest-tr537-nh4n` (verified).

Nisbiy shkala (%). u(R_w) — nazorat kartasi chegaralaridan: ±3,34 % (2s). Bias — 6 ta PT raundidan:

| Raund | Bias, % | s_R, % | Laboratoriyalar soni |
|---|---|---|---|
| 1999-1 | 2,5 | 10 | 31 |
| 1999-2 | 2,7 | 7 | 36 |
| 2000-1 | 1,9 | 8 | 32 |
| 2000-2 | 1,4 | 10 | 35 |
| 2001-1 | 1,8 | 7 | 36 |
| 2001-2 | 2,9 | 11 | 34 |

| Kattalik | Manba qiymati | Manba bandi |
|---|---|---|
| u(R_w) | 1,67 % | §3.2, 4-qadam |
| RMS_bias | 2,26 % | Appendix 4 |
| u(C_ref) | 1,52 % | Appendix 4 |
| u(bias) | 2,73 % | §3.2, 4-qadam |
| u_c | 3,20 % | §3.2, 5-qadam |
| k | 2 | §3.2, 6-qadam |
| U | 6,40 % | §3.2, 6-qadam |

Manba yakuniy qiymatni 7 % gacha yuqoriga yaxlitlagan.

## 8. Maxsus rejimlar

**Maxsus rejimlar** yorlig'ida to'rtta rejim bor. Hisobotda har doim yondashuv nomi va cheklovlar yoziladi.

### 8.1. Namuna olish (UfS:2019) — verified

Dublikat usuli: har bir ob'ektdan ikki namuna, har bir namunada ikki tahlil. Klassik va robust ichma-ich ANOVA namuna olish va tahlil tarkibiy qismlarini ajratadi. Klassik ANOVA manba bilan to'liq aniqlikda mos; robust ANOVA — 4 ta qiymatli raqamgacha (algoritm manba tavsifidan qayta tiklangan).

Misol. Manba: EURACHEM/CITAC UfS:2019, Example A1 (Table A1.1, Figure A1.2), 40–41-betlar. Test misoli: `ufs-a1-nitrate-classical` (verified). Issiqxona salatida nitrat, mg/kg; 8 ob'ekt × 2 namuna × 2 tahlil:

| Ob'ekt | S1A1 | S1A2 | S2A1 | S2A2 |
|---|---|---|---|---|
| A | 3898 | 4139 | 4466 | 4693 |
| B | 3910 | 3993 | 4201 | 4126 |
| C | 5708 | 5903 | 4061 | 3782 |
| D | 5028 | 4754 | 5450 | 5416 |
| E | 4640 | 4401 | 4248 | 4191 |
| F | 5182 | 5023 | 4662 | 4839 |
| G | 3028 | 3224 | 3023 | 2901 |
| H | 3966 | 4283 | 4131 | 3788 |

| Kattalik | Manba qiymati (Figure A1.2, klassik ANOVA) |
|---|---|
| O'rtacha | 4345,5625 |
| s (jami) | 774,5296 |
| s (ob'ektlar orasida) | 556,2804 |
| s (namuna olish) | 518,16089 |
| s (tahlil) | 148,18063 |

### 8.2. Sifatli testlar (AQA:2021) — verified

2×2 jadvaldan sezgirlik, o'ziga xoslik, ehtimollik nisbati (LR) va posterior ehtimol hisoblanadi. Ishonch intervali: standart bo'yicha hisobotda faqat Wilson intervali; Clopper–Pearson — laboratoriya sozlamasi, tanlansa hisobotda faqat u chiqadi. Usul nomi va P hisobotda yoziladi.

Misol. Manba: EURACHEM/CITAC AQA:2021, Example E3 (Table E3.1, Eq. E3.1), §4.3 Eq. (6); 17 va 28-betlar. Test misoli: `aqa-e3-emit-cocaine` (verified). Kirish: noto'g'ri musbat ulushi FP = 0,009, noto'g'ri manfiy ulushi FN = 0,056, tarqalganlik P(+) = 0,2. Manbadagi natija: musbat natijaning posterior ehtimoli PP = 0,963.

### 8.3. Mikrobiologiya — BETA

BETA, tekshirilmagan: ISO 19036 matni repozitoriyda yo'q, hisob manba misoli bilan tasdiqlanmagan. Natijada har doim ogohlantirish chiqadi; bu rejimdagi shablon `APPROVED` bo'la olmaydi. Misol raqamlari berilmaydi. Natijani rasmiy hisobotda ishlatishdan oldin standart bilan solishtiring.

### 8.4. Tibbiy laboratoriya — BETA

BETA, tekshirilmagan: ISO/TS 20914 matni repozitoriyda yo'q. Shartlar mikrobiologiya bilan bir xil; misol raqamlari berilmaydi.

## 9. Laboratoriya

**Laboratoriya** yorlig'ida beshta bo'lim bor: **Etalonlar**, **CMC**, **QC kartalari**, **Malaka sinovlari**, **Validatsiya**. Barcha yozuvlar faqat shu brauzerda (IndexedDB) saqlanadi; har bir yaratish, tahrirlash va o'chirish audit iziga rol va vaqt bilan tushadi.

Rollar: etalonlar va CMC jadvalini laboratoriya administratori tahrirlaydi; xodim QC kartasiga natija qo'shadi va PT / validatsiya ma'lumotini kiritadi. Lokal (mehmon) rejimda rol bo'yicha cheklov ogohlantirish darajasida; mehmon kiritgan reestr yozuvi yoki CMC jadvali hisobotda "ma'lumot" darajasidagi topilma bilan belgilanadi.

### 9.1. Etalonlar reestri

Har bir etalon kartochkasida kalibrlash sertifikatlari saqlanadi (**Kalibrlash qo'shish**): nuqtalar, U, k, amal qilish muddati, kuzatuvchanlik. Kalibrlovchi sifatida faqat tashkilot nomi saqlanadi. **Fayldan import**, **Eksport JSON**, **Eksport CSV** mavjud.

**B-tip** yorlig'idagi **Reestrdan tanlash** hisobga sertifikatning nusxasini yozadi (reestr identifikatori va versiyasi bilan). Reestr keyin o'zgarsa, eski hisob o'zgarmaydi. U, k, ν yoki taqsimot qo'lda o'zgartirilsa, reestr bilan bog'lanish uziladi.

- Muddat o'lchash sanasiga nisbatan tekshiriladi (bugungi sanaga emas). Muddati o'tgan etalon — "xato" darajasidagi topilma, hisobot **RASMIY EMAS** bo'ladi; 30 kun qolganda — ma'lumot.
- Drift va interpolyatsiya manbalari faqat taklif qilinadi: driftni foydalanuvchi belgilab tasdiqlaydi, interpolyatsiya manbasiga raqamni foydalanuvchi kiritadi.
- Kalibrlash intervali tavsiyasi — loyihaning o'z formulasi (ILAC G24 formula bermaydi).

### 9.2. CMC

CMC jadvali — akkreditatsiya sohasi qatorlari. Hisobda CMC kattaligi va X qiymati tanlansa, dastur U ni CMC(X) bilan solishtiradi (ILAC P14:09/2020 §5.5). U < CMC bo'lsa topilma chiqadi; U avtomatik almashtirilmaydi. Soha tashqarisida CMC bilan solishtirilmaydi, alohida topilma chiqadi.

### 9.3. QC kartalari va Westgard qoidalari

Ikki xil Shewhart kartasi bor: **Individual qiymatlar (I–MR)** va **Kichik guruhlar (X̄–R)**. Karta koeffitsiyentlari NIST/SEMATECH e-Handbook §6.3.2.1–6.3.2.2 bilan tekshirilgan. Westgard qoidalari Westgard 1981 bo'yicha; 1₂s darvozasi standart bo'yicha yoqilgan (laboratoriya sozlamasi). R₄s qoidasi seriya belgisisiz ketma-ket juftlikka qo'llansa, bu "loyiha yaqinlashuvi" deb belgilanadi. Bir nechta nazorat materialini guruhlash interfeysda hali yo'q.

### 9.4. Malaka sinovlari (PT)

PT seriyasiga raundlar qo'shiladi (**Raund qo'shish** yoki **Fayldan import**): natija x, tayinlangan qiymat x_pt, σ_pt, noaniqliklar. Dastur z, z′, ζ va E_n ballarini hisoblaydi. Hisoblab bo'lmaydigan ball bo'sh qoladi va sababi ko'rsatiladi; ball avtomatik boshqasiga almashtirilmaydi. PT raundlarini top-down ustasiga bias manbasi sifatida uzatish mumkin.

Ball formulalari va baholash chegaralari (|z| ≤ 2, |z| ≥ 3, |E_n| ≤ 1) ISO 13528 ga tayanadi — standart repozitoriyda yo'q, shuning uchun **unverified**; natijada bu haqda har doim ma'lumot chiqadi. PT uchun tekshirilgan manba misoli hozircha yo'q, shu sababli bu yerda raqamli misol berilmaydi.

### 9.5. Usul validatsiyasi

Validatsiya to'plamiga testlar qo'shiladi (**Test qo'shish**):

| Test | Holat |
|---|---|
| Grubbs testi (bitta chetga chiquvchi) | verified — NIST e-Handbook §1.3.5.17.1 |
| Bir omilli ANOVA (s_r, s_b, s_I) | verified — NIST §7.4.3, §2.4.4 |
| Ikki tanlanma t-testi | verified — NIST §1.3.5.3 |
| F-test (ikki dispersiya) | verified — NIST §1.3.5.9 |
| Tiklanish (recovery) t-testi | verified — QUAM:2012 A4 |
| Chiziqlilik (regressiya) | OLS — verified (6-bo'lim) |
| Cochran C testi | unverified — ISO 5725-2 repozitoriyda yo'q |
| LOD / LOQ | unverified |

**Dastur qiymatni o'zi o'chirmaydi.** Grubbs testi shubhali qiymatni faqat ko'rsatadi. Uni hisobdan **Chiqarish** — foydalanuvchi qarori: kamida 10 belgili izoh kerak, faqat laboratoriya administratori bajaradi, amal audit iziga yoziladi. Takroriy Grubbs testi avtomatik bajarilmaydi.

**Top-down shablon qoralamasi** bo'limida ANOVA va tiklanish natijalaridan foydalanuvchining shaxsiy top-down shabloni (`DRAFT`) yaratiladi (**Qoralama yaratish**).

Misol. Manba: NIST/SEMATECH e-Handbook of Statistical Methods, §1.3.5.17.1 (Grubbs testi). Tekshiruv: `tests/engine/validation.test.js` (verified). Sakkizta qiymat: 199,31; 199,53; 200,19; 200,82; 201,92; 201,95; 202,18; 245,57. Yuqori bir tomonlama test, α = 0,05. Manbadagi natija: G = 2,4687, kritik qiymat 2,032 — eng katta qiymat (245,57) chetga chiquvchi deb belgilanadi. Izoh: manba G ni to'rt xonagacha kesib bergan (dastur qiymati 2,46876…).

## 10. Qaror qoidasi va muvofiqlik bayonoti

Muvofiqlik JCGM 106:2012 §7–8 va ILAC G8:09/2019 bo'yicha baholanadi. **B-tip** yorlig'idagi sozlamalar:

- **Ruxsat etilgan xato MPE (±)** yoki aniq chegaralar — **Pastki chegara**, **Yuqori chegara** (bir yoki ikki tomonlama);
- **Qaror qoidasi**: **tanlanmagan**, **Oddiy qabul (w = 0)**, **Himoya zonasi w = r·U** (**Ko'paytuvchi r** bilan);
- **Bayonot turi**: **Binar (muvofiq / nomuvofiq)** yoki **Binar bo'lmagan (shartli natijalar bilan)**;
- **Mijoz bilan kelishuv (raqami)**.

Dastur qabul oralig'ini, TUR = T / (2U) ni va muvofiqlik ehtimoli p_c ni (normal taqsimot farazida) hisoblaydi.

**Asosiy qoida: qaror qoidasi, chegara yoki model turi ko'rsatilmagan bo'lsa, muvofiqlik bayonoti berilmaydi.** Laboratoriya sozlamasidagi yoki shablondagi standart qoida tanlov maydoniga oldindan qo'yiladi, lekin hisobga faqat foydalanuvchi tasdiqlagandan keyin yoziladi.

TUR bo'yicha topilmalar: TUR < 1 — ogohlantirish; 1 ≤ TUR < 4 — ma'lumot (4:1 nisbati — amaliyot, manba bilan tasdiqlanmagan).

## 11. Hisobot, import va eksport

### 11.1. Hisobot shakllari

**Hisobot shakli** ro'yxatida to'rtta shakl bor: **Kalibrlash sertifikati ilovasi**, **Sinov protokoli bo'limi**, **Noaniqlik byudjeti asosnomasi (CMC)**, **Muvofiqlik bayonoti**.

**Rekvizitlar** oynasida laboratoriya va hujjat rekvizitlari to'ldiriladi. To'ldirilmagan rekvizitlar hisobotda ko'rsatiladi. Rekvizitlar ro'yxati ISO/IEC 17025 §7.8.2.1 ga tayanadi — tekshirilmagan (1.2-bo'lim). Rekvizitlar serverga yuborilmaydi (1.4-bo'lim).

### 11.2. Hisobot pasti

Har bir hisobot pastida quyidagilar chiqadi: dastur va dvigatel versiyasi (`ENGINE_VERSION`), **Build (dvigatel xeshi)**, shablon (yoki "shablonsiz"), **Hisob ID va sanasi**, **SHA-256 (kanonik JSON, RFC 8785)** va QR kod (hisob ID va shu xesh bilan). Xesh hisobning to'liq JSON eksportidan olinadi: kirishlar yoki natija o'zgarsa, xesh ham o'zgaradi.

### 11.3. Eksport

**Natijalar**, **Regressiya**, **Top-down** va **Maxsus rejimlar** yorliqlarida:

- **JSON eksport** — hisob hujjati `uc-calc/1` formatida: kirishlar, sozlamalar, natija va xesh;
- **Excel eksport (.xlsx)** va **CSV eksport** — natija, kirishlar, byudjet, topilmalar. Sonlar yaxlitlanmagan; hisobotdagi yaxlitlangan ko'rinish alohida beriladi.

### 11.4. Import

- **Fayldan import (.xlsx, .csv)** — jadvalga kuzatuvlarni yuklaydi. Varaq, ajratuvchi va ustunlar moslashtiriladi, oldindan ko'rish bor. Chegaralar: 5 MB, 10 000 qator, 200 ustun. Fayl faqat brauzerda o'qiladi; formulalar bajarilmaydi — faqat faylda saqlangan qiymatlar olinadi.
- **Hisob faylini ochish (JSON)** — `uc-calc/1` faylini tekshiradi: xesh solishtiriladi va hisob qayta bajariladi.

### 11.5. Eksport → import → qayta hisob

JSON faylni ochganda dastur hisobni kirishlardan qayta bajaradi va saqlangan natija bilan solishtiradi:

- "Xesh tekshirildi — fayl o'zgartirilmagan" va "Qayta hisoblandi: natija aynan bir xil hosil bo'ldi" — fayl butun va natija takrorlanadi;
- "Xesh mos kelmadi" — fayl o'zgartirilgan yoki buzilgan;
- "natija saqlangan natijadan FARQ QILADI" yoki "Fayl boshqa dvigatel versiyasida yaratilgan" — fayldagi va joriy dvigatel versiyalarini solishtiring.

Keyin hisobni **Muharrirda ochish** mumkin. Bu tekshiruv laboratoriyaning o'z validatsiyasi uchun ham qulay (12-bo'lim).

## 12. Validatsiya va versiya

### 12.1. "Validatsiya" sahifasi

Saytdagi "Validatsiya" sahifasi (`validation.html`) joriy dvigatel versiyasini, build identifikatorini va validatsiya hisobotiga havolani ko'rsatadi. Sahifada: joriy versiya (dvigatel versiyasi, build, yig'ilgan vaqt, dvigatel xeshi, sizning brauzeringiz), hujjatlar (validatsiya hisoboti, validatsiya rejasi, talablar va izlanuvchanlik matritsasi, o'zgarishlarni boshqarish, ma'lum cheklovlar, ekspert uchun savol-javoblar, PQ va URS shablonlari, shu qo'llanma), ma'lum cheklovlar (qisqacha) va versiyalar tarixi. Hujjatlar va versiyalar tarixi faqat GitHub Actions orqali yig'ilgan saytda ko'rinadi; build qadamisiz nusxada sahifa buni eslatadi.

Dasturning o'z tekshiruvi quyidagilardan iborat: me'yoriy hujjatlardagi misollar (har bir kutilgan qiymat manba bandi bilan), laboratoriya Excel fayllaridan olingan 9 ta etalon nuqta va dvigatel fayllarining xeshi. Qamrov jadvali — [validatsiya matritsasi](../validation/RTM.md) da.

### 12.2. Yangi versiya banneri

Saytda yangi versiya chiqqanda sahifada banner ko'rsatiladi. Sahifani o'zingiz yangilaysiz: kiritilgan ma'lumot yo'qolmasligi uchun sahifa avtomatik yangilanmaydi. Yangilashdan oldin joriy hisobni **JSON eksport** bilan saqlang. Banner matni: "Yangi versiya chiqdi — sahifani yangilang…"; uni **Yopish** tugmasi bilan yopish mumkin (shu versiya uchun qayta chiqmaydi).

Hisoblash natijasiga ta'sir qiladigan har qanday o'zgarishda dvigatel versiyasi oshiriladi va [o'zgarishlar jurnali](../../CHANGELOG.md) da qayd etiladi.

### 12.3. Laboratoriyaning o'z tekshiruvi (PQ)

Dasturni ish jarayoniga kiritishdan oldin va har bir yangi dvigatel versiyasidan keyin laboratoriya o'z misollarida tekshiruv o'tkazishi kerak. Buning uchun [PQ bayonnomasi andozasi](../validation/PQ_PROTOCOL_TEMPLATE.md) dan foydalaning. Tavsiya etilgan tartib:

1. O'z metodikangiz bo'yicha mustaqil hisoblangan (masalan, Excel da) kamida bitta misolni tanlang.
2. Uni dasturda hisoblang va y, u_c, ν_eff, k, U ni solishtiring.
3. Hisobni **JSON eksport** bilan saqlang; bayonnomaga dvigatel versiyasi, build va SHA-256 xeshini yozing.
4. Yangi versiyadan keyin shu faylni **Hisob faylini ochish (JSON)** bilan oching va natija aynan takrorlanishini tekshiring.

## 13. Cheklovlar

Eng muhim cheklovlar (to'liq ro'yxat — [ma'lum cheklovlar](../validation/KNOWN_LIMITATIONS.md)):

- **ISO/IEC 17025:2017** matni repozitoriyda yo'q — unga havolalar va hisobot rekvizitlari ro'yxati tekshirilmagan.
- **BETA rejimlar:** mikrobiologiya (ISO 19036) va tibbiy laboratoriya (ISO/TS 20914) — manba misoli bilan tasdiqlanmagan.
- **Unverified usullar:** regressiyada WLS, GLS, WTLS va polinom; top-down da ISO 21748 ga tayanadigan qismlar; log-normal taqsimot; PT ball formulalari va chegaralari (ISO 13528); Cochran testi; LOD / LOQ; kalibrlash intervali formulasi.
- **Oshkor bo'lmagan model:** Monte-Karlo yo'q; asosiy ekranda kiritish shakli yo'q.
- **Eng kichik qamrov sohasi** — faqat ikki chiqish uchun.
- **Monte-Karlo:** bit darajasidagi takrorlanuvchanlik faqat bir xil JS dvigateli versiyasi ichida; n_dig = 2 va δ/5 bilan hisob ko'pincha M chegarasiga yetadi (ogohlantirish bilan).
- **Kirish birliklari** uchun interfeysda alohida maydon yo'q.
- **Shablonlar:** dastur bilan keladigan barcha shablonlar `DRAFT` holatida va raqamsiz.
- **Laboratoriya bo'limi:** CMC ning matritsa / grafik ko'rinishi, reestrning `.xlsx` eksporti, PT trend qoidalari va raundni joyida tahrirlash yo'q.
- **Rollar:** lokal rejimda rol bo'yicha cheklov ogohlantirish darajasida.
- **Brauzerda qo'lda ko'rilmagan:** bosma hisobotning ayrim shakllari, maxsus rejimlar oynasi, malaka sinovlari va validatsiya bo'limlari (faqat avtomatik testlar bilan tekshirilgan).
- **Ma'lumot faqat brauzerda:** brauzer xotirasi tozalansa, eksport qilinmagan hisoblar va reestr yo'qoladi.
- **Mas'uliyat:** dastur metrologning qarorini almashtirmaydi — manbalar ro'yxati, taqsimotlar va qaror qoidasi uchun laboratoriya javob beradi.
