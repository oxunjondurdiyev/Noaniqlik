# Foydalanuvchi talablari (URS) — shablon (laboratoriya to'ldiradi)

> Maqsad: laboratoriya noaniqlik hisobi dasturiga o'z talablarini yozadi va UncertaintyCalc ularni qondirish-qondirmasligini o'zi baholaydi. Bu hujjat [PQ_PROTOCOL_TEMPLATE.md](PQ_PROTOCOL_TEMPLATE.md) uchun asos bo'ladi.
> To'ldiriladigan joylar `____` bilan. **"Platforma qondiradimi" ustuni ataylab bo'sh** — uni laboratoriya `ha` / `qisman` / `yo'q` deb to'ldiradi ([KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) va platforma qo'llanmasi `docs/manual/` asosida).
> Jadvallardagi satrlar — namuna: keraksizini o'chiring, o'zingiznikini qo'shing. Talab ID si laboratoriyaniki (masalan `URS-01`).

Hujjat №: `____`    Sana: `____`    Laboratoriya: `____`    Platforma versiyasi (`ENGINE_VERSION` / build): `____`

---

## 1. Laboratoriya faoliyat sohasi

| Band | Qiymat |
|---|---|
| Laboratoriya turi | [ ] kalibrlash  [ ] sinov  [ ] tibbiy  [ ] boshqa: `____` |
| Akkreditatsiya sohasi (qisqacha) | `____` |
| O'lchash / sinov turlari va diapazonlari | `____` |
| Oyiga taxminiy hisoblar soni | `____` |
| Dasturdan foydalanuvchilar soni | `____` |

## 2. Metodikalar va hisob rejimlari

### 2.1. Metodikalar

| № | Metodika (kodi, nomi, nashri) | O'lchanadigan kattalik | Model (formula) | Kerakli rejim (§2.2) |
|---|---|---|---|---|
| 1 | `____` | `____` | `____` | `____` |
| 2 | `____` | `____` | `____` | `____` |

### 2.2. Platformadagi mavjud rejimlar — keraklisini belgilang

Holat ustuni — [VALIDATION_PLAN.md](VALIDATION_PLAN.md) §2 dan.

| Kerak | Rejim | Platformadagi holati |
|---|---|---|
| [ ] | GUM (LPU), bitta chiqish kattaligi (JCGM 100:2008) | verified |
| [ ] | Monte-Karlo (JCGM 101:2008) | verified |
| [ ] | Bir nechta chiqish kattaligi, qamrov sohasi (JCGM 102:2011) | qisman |
| [ ] | Oshkor bo'lmagan model h(Y, X) = 0 | qisman (Monte-Karlo yo'q; muharrirda kiritish shakli yo'q) |
| [ ] | Regressiya: OLS, to'g'ri / teskari bashorat | verified |
| [ ] | Regressiya: WLS, GLS, WTLS, polinom, "U — diapazon" | unverified |
| [ ] | Top-down: Nordtest TR 537 (u(R_w) + u(bias)), QUAM recovery | verified |
| [ ] | Top-down: s_R asosida (ISO 21748 ga xos hisoblar) | unverified |
| [ ] | Namuna olish noaniqligi (dublikat usuli, ANOVA) | verified (robust — qayta tiklangan algoritm) |
| [ ] | Sifatli testlar (2×2 jadval, Wilson intervali) | verified |
| [ ] | Mikrobiologiya (log₁₀ sanoq) | BETA |
| [ ] | Tibbiy laboratoriya (IQC darajalari) | BETA |
| [ ] | Etalonlar reestri, drift taklifi, kalibrlash intervali tavsiyasi | qisman |
| [ ] | CMC jadvali va U < CMC tekshiruvi | verified (ILAC P14:09/2020 §4.1–4.3, §5.5) |
| [ ] | QC kartalari (Shewhart), Westgard qoidalari | verified |
| [ ] | Malaka sinovlari (PT): z, z′, ζ, E_n | qisman (formulalar va chegaralar — unverified) |
| [ ] | Usul validatsiyasi: Grubbs, ANOVA, t / F testlari | verified (NIST misollari) |
| [ ] | Usul validatsiyasi: Cochran, LOD / LOQ | unverified |
| [ ] | Qaror qoidasi va muvofiqlik bayonoti (JCGM 106:2012, ILAC G8:09/2019) | verified |
| [ ] | Metodika shablonlari (DRAFT → REVIEWED → APPROVED, qulflash) | bor; barcha ichki shablonlar DRAFT |

Platformada yo'q, lekin laboratoriyaga kerak bo'lgan rejim / funksiya: `____`

## 3. Me'yoriy talablar

| ID | Hujjat (nashri bilan) | Laboratoriya uchun majburiymi | Dasturga qo'yiladigan talab | Platforma qondiradimi (ha / qisman / yo'q) | Izoh |
|---|---|---|---|---|---|
| `____` | JCGM 100:2008 | `____` | `____` | | |
| `____` | EA-4/02 M:2022 | `____` | `____` | | |
| `____` | ILAC P14:09/2020 | `____` | `____` | | |
| `____` | ILAC G8:09/2019 | `____` | `____` | | |
| `____` | ISO/IEC 17025:2017 (platforma repozitoriysida yo'q — platformadagi havolalar "unverified") | `____` | `____` | | |
| `____` | Akkreditatsiya organining hujjatlari: `____` | `____` | `____` | | |
| `____` | Soha standartlari: `____` | `____` | `____` | | |

## 4. Noaniqlik hisobi talablari

| ID | Talab | Laboratoriya qiymati / qoidasi | Platforma qondiradimi (ha / qisman / yo'q) | Izoh |
|---|---|---|---|---|
| `____` | Qamrov ehtimoli P | `____` | | |
| `____` | k ni tanlash qoidasi (t_P(ν_eff) / qat'iy k = 2 / ko'p nuqtada yagona k) | `____` | | |
| `____` | ν_eff kasr bo'lsa (platformada: `floor` — standart, `interpolate` — sozlama; qo'llanilgan qoida hisobotda yoziladi) | `____` | | |
| `____` | A tur baholash usuli | `____` | | |
| `____` | B tur taqsimotlari | `____` | | |
| `____` | Korrelyatsiya | `____` | | |
| `____` | Yaxlitlash: U (platformada: ko'pi bilan 2 qiymatli raqam, 0,0999 → 0,10) | `____` | | |
| `____` | Yaxlitlash: y (platformada: U ning oxirgi xonasigacha, round half away from zero, −0,125 → −0,13) | `____` | | |
| `____` | Oraliq hisoblar yaxlitlanmasligi | `____` | | |
| `____` | Birliklar va o'lchamlik tekshiruvi | `____` | | |
| `____` | Kalibrlanayotgan asbobning MPE'si byudjetga avtomatik kirmasligi | `____` | | |
| `____` | U = 0 holati (platformada: belgi yoki bloklash — laboratoriya sozlamasi) | `____` | | |
| `____` | CMC: qiymat yoki jadval; U < CMC holati | `____` | | |
| `____` | Qaror qoidasi (oddiy qabul / himoya zonasi w = r·U; binar / nobinar bayonot; bir / ikki tomonlama chegara) | `____` | | |
| `____` | Monte-Karlo: generator, urug', M, tolerans hisobotda ko'rsatilishi | `____` | | |
| `____` | Ogohlantirishlar (linter topilmalari) bosma hisobotda ko'rinishi | `____` | | |
| `____` | Ogohlantirishni asos bilan qabul qilish va uning izi | `____` | | |
| `____` | Boshqa: `____` | `____` | | |

## 5. Ma'lumotlar

Platformaning hozirgi holati (to'ldirishdan oldin o'qing): hisob to'liq brauzerda bajariladi; hisoblar, shablonlar, reestr, QC, PT va validatsiya ma'lumotlari **foydalanuvchining brauzerida** (IndexedDB va `localStorage`) saqlanadi; serverda saqlash va markaziy zaxira yo'q (rejalashtirilgan — KL-134, KL-173). Firebase'da faqat ro'yxatdan o'tish, tashkilot va to'lov ma'lumotlari (`docs/DATA_RESIDENCY.md`).

| ID | Talab | Laboratoriya talabi | Platforma qondiradimi (ha / qisman / yo'q) | Izoh |
|---|---|---|---|---|
| `____` | Saqlash joyi (brauzer / laboratoriya serveri / bulut) | `____` | | |
| `____` | Saqlash muddati | `____` | | |
| `____` | Zaxira nusxa (kim, qanchalik tez-tez, qayerga) — platformada: foydalanuvchi eksporti orqali | `____` | | |
| `____` | Bitta hisobni faylga eksport / import (`uc-calc/1`, xesh bilan) | `____` | | |
| `____` | To'liq eksport / import (`uc-export/1`) | `____` | | |
| `____` | Kuzatuvlarni `.xlsx` / `.csv` dan import | `____` | | |
| `____` | Natija va byudjetni jadval ko'rinishida eksport | `____` | | |
| `____` | O'zgarishlar izi (audit) — platformada: lokal xesh zanjiri, buzilishni aniqlash darajasida | `____` | | |
| `____` | Eski hisobni qayta tiklash (versiya, xesh, qayta hisob) | `____` | | |
| `____` | Bir nechta qurilma / foydalanuvchi o'rtasida ma'lumot almashish | `____` | | |
| `____` | Shaxsiy ma'lumotlar: qaysilari kiritiladi, qayerda saqlanishi mumkin | `____` | | |
| `____` | Mijoz ma'lumotlari maxfiyligi | `____` | | |
| `____` | Internet uzilganda ishlash | `____` | | |
| `____` | Boshqa: `____` | `____` | | |

## 6. Rollar va kirish huquqlari

Platformadagi rollar: `superadmin` (platforma egasi), `admin` (tashkilot admini), `employee` (xodim), `guest` (tizimga kirmagan, lokal rejim). Lokal rejimda rol himoyasi ogohlantirish darajasida (KL-086).

| ID | Talab | Laboratoriya talabi | Platforma qondiradimi (ha / qisman / yo'q) | Izoh |
|---|---|---|---|---|
| `____` | Kim hisob kiritadi | `____` | | |
| `____` | Kim shablonni tasdiqlaydi (APPROVED); tasdiqlangan shablonda nima qulflanadi | `____` | | |
| `____` | Kim etalonlar reestri va CMC jadvalini tahrirlaydi | `____` | | |
| `____` | Kim ogohlantirishni qabul qiladi | `____` | | |
| `____` | Kim chetga chiquvchi qiymatni chiqaradi (usul validatsiyasi) | `____` | | |
| `____` | Tekshiruvchi / tasdiqlovchi bosqichlari, elektron imzo | `____` | | |
| `____` | Parol siyosati, hisobni bloklash | `____` | | |
| `____` | Boshqa: `____` | `____` | | |

## 7. Brauzerlar va qurilmalar

Platforma talabi: ES modullarni qo'llab-quvvatlaydigan brauzer (2018+); eski brauzerda faqat ogohlantirish chiqadi. Avtomatik brauzerlararo testlar: Chromium, Firefox, WebKit (Linux). Safari (macOS / iOS) avtomatik tekshirilmaydi — laboratoriya PQ da tekshiradi (KL-152).

| ID | Brauzer va versiyasi | Operatsion tizim | Qurilma | Platforma qondiradimi (ha / qisman / yo'q) | Izoh |
|---|---|---|---|---|---|
| `____` | `____` | `____` | `____` | | |
| `____` | `____` | `____` | `____` | | |

Bosma hisobot (printer / PDF) talablari: `____`

## 8. Hisobot shakllari

Platformadagi 4 shakl (`src/report/forms.js`) — keraklisini belgilang:

| Kerak | Shakl | Laboratoriya hujjati (nomi, №) | Platforma qondiradimi (ha / qisman / yo'q) | Izoh |
|---|---|---|---|---|
| [ ] | Kalibrlash sertifikati ilovasi | `____` | | |
| [ ] | Sinov protokoli bo'limi | `____` | | |
| [ ] | Noaniqlik byudjeti asosnomasi (CMC) | `____` | | |
| [ ] | Muvofiqlik bayonoti | `____` | | |

| ID | Talab | Laboratoriya talabi | Platforma qondiradimi (ha / qisman / yo'q) | Izoh |
|---|---|---|---|---|
| `____` | Majburiy rekvizitlar ro'yxati (platformadagi ro'yxat unverified — KL-116) | `____` | | |
| `____` | Hisobot tili (uz / ru / en) | `____` | | |
| `____` | Dastur versiyasi, build, hisob ID, xesh, QR hisobotda | `____` | | |
| `____` | Normativ havolalar (jumladan milliy / davlatlararo ekvivalentlar — KL-008) | `____` | | |
| `____` | Ko'p nuqtali natijalar jadvali | `____` | | |
| `____` | Qo'llanilgan qoidalar hisobotda (ν qoidasi, k, P, qaror qoidasi) | `____` | | |
| `____` | Elektron imzo, DCC XML, PDF/A (platformada qilinmagan — KL-120) | `____` | | |
| `____` | Boshqa: `____` | `____` | | |

## 9. Qabul mezonlari

| ID | Mezon | Qiymat |
|---|---|---|
| `____` | PQ da tekshiriladigan metodikalar va nuqtalar soni | `____` |
| `____` | Yaxlitlangan y va U mustaqil hisob bilan aynan mos | ha (majburiy) / `____` |
| `____` | Xom qiymatlar uchun ruxsat etilgan nisbiy farq | `____` |
| `____` | "qisman" deb baholangan talablar uchun kompensatsiya choralari | `____` |
| `____` | "yo'q" deb baholangan majburiy talablar soni (qabul uchun 0 bo'lishi kerakmi) | `____` |
| `____` | Platforma yangi versiyasida qayta baholash tartibi | `____` |

## 10. Ma'lum cheklovlar bilan tanishganlik

- [ ] [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) o'qildi (hujjat holati: `ENGINE_VERSION` `____`, sana `____`).
- [ ] Laboratoriya ishlatadigan rejimlarga tegishli cheklovlar (ID lar): `____`
- [ ] Har biri uchun laboratoriya qarori (qabul qilinadi / kompensatsiya chorasi / rejim ishlatilmaydi): `____`
- [ ] BETA va "unverified" belgili funksiyalar rasmiy natija uchun ishlatiladimi: [ ] yo'q  [ ] ha, asos: `____`

## 11. Xulosa va imzolar

Talablar soni: `____`; "ha": `____`; "qisman": `____`; "yo'q": `____`.

Xulosa: `____`

| Vazifa | Lavozim | Imzo | Sana |
|---|---|---|---|
| Tuzdi | `____` | `____` | `____` |
| Tekshirdi | `____` | `____` | `____` |
| Tasdiqladi | `____` | `____` | `____` |
