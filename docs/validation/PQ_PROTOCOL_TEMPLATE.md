# PQ bayonnomasi — shablon (laboratoriya to'ldiradi)

> **PQ (Performance Qualification)** — laboratoriya UncertaintyCalc natijasini **o'z metodikasida** mustaqil hisob bilan solishtiradi. Bu shablonni platforma ishlab chiquvchisi to'ldirmaydi.
> Yondashuv — [VALIDATION_PLAN.md](VALIDATION_PLAN.md) §5; ma'lum cheklovlar — [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).
> To'ldiriladigan joylar `____` bilan belgilangan. Kerak bo'lmagan bo'lim "qo'llanilmaydi" deb yoziladi (bo'sh qoldirilmaydi).

Bayonnoma №: `____`    Sana: `____`    Laboratoriya: `____`

---

## 1. Maqsad

UncertaintyCalc platformasining `____` metodikasi bo'yicha hisob natijalari mustaqil hisob natijalari bilan mos kelishini tasdiqlash.

Sabab (belgilang):

- [ ] birinchi marta foydalanishga kiritish
- [ ] platformaning yangi versiyasi (avvalgi: `____` → yangi: `____`)
- [ ] metodika yoki shablon o'zgardi
- [ ] brauzer / qurilma o'zgardi
- [ ] boshqa: `____`

## 2. Qamrov

| Band | Qiymat |
|---|---|
| Metodika (kodi, nomi, nashri) | `____` |
| Platformadagi shablon (ID, versiyasi, holati: DRAFT / REVIEWED / APPROVED) | `____` |
| Rejim | [ ] GUM (LPU)  [ ] Monte-Karlo  [ ] vektor (bir nechta chiqish)  [ ] regressiya  [ ] top-down  [ ] namuna olish  [ ] sifatli test  [ ] boshqa: `____` |
| O'lchanadigan kattalik, birlik, diapazon | `____` |
| Qamrov ehtimoli P | `____` |
| ν_eff qoidasi (`floor` — standart / `interpolate`) | `____` |
| Qaror qoidasi (ishlatilsa) | `____` |
| CMC (ishlatilsa) | `____` |

BETA rejimlar (mikrobiologiya, tibbiy laboratoriya) va "unverified" belgili funksiyalar uchun PQ yagona tekshiruv bo'lib qoladi — buni xulosada alohida yozing.

## 3. Muhit

| Band | Qiymat | Qayerdan olinadi |
|---|---|---|
| Sayt manzili | `____` | brauzer manzil satri |
| Build identifikatori (`shortSha`) | `____` | saytdagi `build.json`; bosma hisobot pastki qismi |
| `ENGINE_VERSION` | `____` | `build.json` (`engineVersion`); bosma hisobot pastki qismi |
| Dvigatel xeshi (`engineHash`) | `____` | `build.json` |
| Brauzer nomi va versiyasi | `____` | brauzerning "dastur haqida" oynasi; bosma hisobotdagi "hisoblagan muhit" |
| Operatsion tizim va versiyasi | `____` | — |
| Qurilma | `____` | — |
| Interfeys tili | `____` | — |

Bir nechta brauzer yoki qurilma ishlatilsa — har biri uchun alohida ustun yoki jadval.

## 4. Mustaqil hisob vositasi

| Band | Qiymat |
|---|---|
| Vosita | [ ] Excel  [ ] qo'lda hisob  [ ] boshqa dastur: `____` |
| Versiyasi | `____` |
| Fayl nomi / hujjat raqami | `____` |
| Kim tayyorlagan va qachon tekshirilgan | `____` |
| Vositaning o'zi qanday tekshirilgan | `____` |

Mustaqil hisob platformadan olingan oraliq qiymatlarni ishlatmasligi kerak — faqat bir xil kirish ma'lumotlari.

## 5. Test nuqtalari

Kamida: diapazonning quyi, o'rta va yuqori nuqtalari; A tur ustun bo'lgan (kam kuzatuvli) holat; B tur ustun bo'lgan holat; metodikada korrelyatsiya bo'lsa — korrelyatsiyali holat. Soni: `____`.

### 5.1. Kirish ma'lumotlari

| № | Nuqta tavsifi | Kirish ma'lumotlari manbasi (bayonnoma №, fayl, sana) | Hisob fayli (`uc-calc/1`) nomi | Hisob ID |
|---|---|---|---|---|
| 1 | `____` | `____` | `____` | `____` |
| 2 | `____` | `____` | `____` | `____` |
| 3 | `____` | `____` | `____` | `____` |

### 5.2. Xom (yaxlitlanmagan) natijalar

Platformaning xom qiymatlari — `uc-calc/1` faylidan yoki jadval eksportidan (eksportda sonlar yaxlitlanmaydi).

| № | Kattalik | Platforma | Mustaqil hisob | Farq (mutlaq) | Farq (nisbiy) |
|---|---|---|---|---|---|
| 1 | y | `____` | `____` | `____` | `____` |
| 1 | u_c | `____` | `____` | `____` | `____` |
| 1 | ν_eff | `____` | `____` | `____` | `____` |
| 1 | k | `____` | `____` | `____` | `____` |
| 1 | U | `____` | `____` | `____` | `____` |
| 2 | … | `____` | `____` | `____` | `____` |

Xom qiymatlar uchun laboratoriya belgilagan chegara (nisbiy): `____`. Asos: `____`.

### 5.3. Yaxlitlangan (hisobotdagi) natijalar

| № | Platforma: y ± U | Mustaqil hisob: y ± U | k (platforma / mustaqil) | Aynan mos (ha / yo'q) |
|---|---|---|---|---|
| 1 | `____` | `____` | `____` | `____` |
| 2 | `____` | `____` | `____` | `____` |
| 3 | `____` | `____` | `____` | `____` |

### 5.4. Byudjet (kamida bitta nuqta uchun)

| Manba | u(x_i): platforma / mustaqil | c_i: platforma / mustaqil | u_i(y): platforma / mustaqil | ν_i |
|---|---|---|---|---|
| `____` | `____` | `____` | `____` | `____` |

## 6. Qabul mezoni

1. **Yaxlitlangan U va y aynan mos** — har bir nuqtada. Yaxlitlash qoidalari (platformada — `src/report/rounding.js`; ILAC P14:09/2020 §5 va egasi qabul qilgan qarorlar):
   - U — ko'pi bilan 2 ta qiymatli raqam; yuqoriga yaxlitlashdan keyin ham 2 ta qoladi: 0,0999 → **0,10** (0,100 emas);
   - y — U ning oxirgi xonasigacha, **round half away from zero** (Excel `ROUND` bilan mos): −0,125 → −0,13.
   Mustaqil hisobda ham shu qoidalar qo'llanishi kerak; boshqa qoida qo'llangan bo'lsa — farq §7 da "yaxlitlash qoidasi" toifasida izohlanadi.
2. **k** — bir xil ν_eff qoidasi bilan mos (platformada standart: k = t_P(⌊ν_eff⌋); qo'llanilgan qoida hisobotda yoziladi).
3. Xom qiymatlardagi farq §5.2 da belgilangan chegaradan oshmaydi.
4. Platforma hisobotida qabul qilinmagan `error` darajasidagi topilma yo'q ("RASMIY EMAS" belgisi chiqmagan). Chiqqan barcha topilmalar ro'yxati: `____`.
5. Qo'shimcha (laboratoriya belgilaydi): `____`.

## 7. Farqlar tahlili

Har bir "yo'q" yoki chegaradan oshgan farq uchun alohida qator.

| № | Nuqta / kattalik | Farq | Sabab toifasi | Tushuntirish | Xulosa (qabul / rad / platforma ishlab chiquvchisiga xabar) |
|---|---|---|---|---|---|
| `____` | `____` | `____` | `____` | `____` | `____` |

Sabab toifalari:

| Toifa | Nimani tekshirish kerak |
|---|---|
| Yaxlitlash qoidasi | U ning qiymatli raqamlari soni; yuqoriga yaxlitlash; y uchun half away from zero; oraliq qiymatlar mustaqil hisobda yaxlitlanganmi |
| ν_eff qoidasi | `floor` yoki `interpolate`; B tur manbalariga ν = ∞ yoki katta chekli son (masalan 10⁹) qo'yilganmi |
| k ni tanlash | t_P(ν_eff) yoki qat'iy k = 2; katta ν_eff da normal kvantilga o'tish chegarasi; P (95 % yoki 95,45 %) |
| Taqsimot bo'luvchisi | to'g'ri burchakli √3, uchburchak √6, U-simon √2; sertifikatdagi U ni k ga bo'lish; rezolyutsiya (to'liq qadam yoki yarim qadam) |
| Korrelyatsiya | korrelyatsiya hisobga olinganmi; r qanday olingan (juftlangan kuzatuvlar, umumiy etalon) |
| Sezgirlik koeffitsiyenti | hosila; birliklarni o'tkazish koeffitsiyenti |
| A tur usuli | s/√n, oldindan aniqlangan s_p, kichik tanlanma tuzatmasi |
| Kirish xatosi | kiritilgan qiymat, birlik, o'nlik belgi, kuzatuvlar soni |
| Boshqa | `____` |

Sabab topilmasa — natija qabul qilinmaydi; platforma ishlab chiquvchisiga `uc-calc/1` fayli va mustaqil hisob bilan xabar beriladi.

## 8. Monte-Karlo (ishlatilsa)

| Band | Qiymat |
|---|---|
| Generator (hisobotdan) | `____` |
| Urug' (seed) | `____` |
| Rejim: adaptiv / qat'iy M | `____` |
| M (bajarilgan sinovlar soni) | `____` |
| n_dig | `____` |
| Tolerans: δ va tekshiruvda δ/5 yoki δ (hisobotdan) | `____` |
| Interval turi: eng qisqa / simmetrik | `____` |
| `mc_not_converged` chiqdimi; chiqqan bo'lsa "erishilgan 2s" | `____` |
| GUM tekshiruvi xulosasi (LPU tasdiqlandi / tasdiqlanmadi) | `____` |

| Tekshiruv | Natija |
|---|---|
| Bir xil brauzerda bir xil urug' va M bilan takror hisob — natija bir xil | `____` |
| Boshqa urug' bilan takror hisob — yaxlitlangan y, u(y), interval uchlari farqi | `____` |
| Ikki xil brauzerda (nomi, versiyasi: `____` / `____`) bir xil urug' va M — **yaxlitlangan** y, U / interval uchlari aynan bir xil | `____` |
| Mustaqil MCM vositasi (bo'lsa: `____`) bilan solishtiruv, statistik tarqoqlikni hisobga olib | `____` |

Eslatma: turli JS dvigatellarida MCM ning **xom** qiymatlari oxirgi xonalarda farq qilishi mumkin (KL-150); mezon — yaxlitlangan natijaning bir xilligi. MCM natijasi berilmaydigan holatlar (masalan normal bo'lmagan kirish korrelyatsiyada, oshkormas model) — [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) §2, §3.

## 9. Safari (macOS / iOS) tekshiruvi

Platformaning avtomatik brauzerlararo testlari Safari'ni qamramaydi (Linux dagi WebKit — Safari emas, KL-152). Laboratoriyada Safari ishlatilsa:

| Band | Qiymat |
|---|---|
| Safari ishlatiladimi | [ ] ha  [ ] yo'q (bo'lim qo'llanilmaydi) |
| Qurilma, macOS / iOS versiyasi, Safari versiyasi | `____` |
| §5 dagi nuqtalar Safari'da qayta hisoblandi; yaxlitlangan y, U, k boshqa brauzer bilan aynan bir xil | `____` |
| MCM (ishlatilsa): yaxlitlangan natija boshqa brauzer bilan aynan bir xil | `____` |
| Sahifa xatosiz ochiladi; bosma hisobot ko'rinishi to'g'ri | `____` |

## 10. Eksport → import → qayta hisob

| Qadam | Natija |
|---|---|
| Hisob `uc-calc/1` fayliga eksport qilindi (fayl nomi) | `____` |
| Fayldagi kanonik xesh (RFC 8785 SHA-256) — bosma hisobot pastki qismidagi xesh / QR bilan mos | `____` |
| Fayl qayta import qilindi; xesh tekshiruvi o'tdi | `____` |
| Qayta hisob natijasi saqlangan natija bilan bir xil (platforma xabari) | `____` |
| Boshqa brauzer / qurilmada import va qayta hisob (ishlatilsa) | `____` |
| Faylga qo'lda bitta qiymat o'zgartirilgan nusxa import qilinganda rad etildi | `____` |

Eslatma: hisob xeshi hujjat rekvizitlarini (laboratoriya nomi, buyurtmachi va h.k.) qamramaydi (KL-117).

## 11. Ma'lumotlarni saqlash tekshiruvi (tavsiya)

| Qadam | Natija |
|---|---|
| Laboratoriya eksport / zaxira tartibi belgilangan (hujjat №) | `____` |
| To'liq eksport qilindi va boshqa brauzer profilida tiklandi | `____` |

## 12. Xulosa

- Tekshirilgan nuqtalar soni: `____`; mezonga mos: `____`; mos emas: `____`.
- Ochiq qolgan farqlar: `____`.
- Qo'llanilgan cheklovlar ([KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) dagi ID lar): `____`.
- Xulosa: [ ] platforma shu metodika va shu muhit uchun foydalanishga qabul qilinadi  [ ] shartli qabul (shartlar: `____`)  [ ] qabul qilinmaydi.
- Amal qilish doirasi: `ENGINE_VERSION` `____`, build `____`. Qayta PQ shartlari: `____`.

## 13. Imzolar

| Vazifa | Lavozim | Imzo | Sana |
|---|---|---|---|
| Bajardi | `____` | `____` | `____` |
| Tekshirdi | `____` | `____` | `____` |
| Tasdiqladi | `____` | `____` | `____` |

## Ilovalar

1. `uc-calc/1` hisob fayllari: `____`
2. Mustaqil hisob fayllari: `____`
3. Bosma hisobotlar (PDF): `____`
4. `build.json` nusxasi: `____`
