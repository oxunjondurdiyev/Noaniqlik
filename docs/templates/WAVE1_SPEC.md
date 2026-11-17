# 1-to'lqin shablonlari — o'lchash modellari va noaniqlik manbalari (24 ta)

> **Maqom:** barcha shablonlar **DRAFT**. Test standartlarining (GOST, O'z DSt) to'liq matni repoda yo'q. Shuning uchun formulalarni laboratoriya standartning amaldagi nashri bo'yicha tekshirishi kerak (⚠ belgili joylar alohida). Raqamli qiymatlar (yarim kenglik, sertifikat U) **berilmagan**: ularni laboratoriya o'z asbob sertifikati va pasportidan kiritadi. Shablon faqat tuzilmani beradi.
> **APPROVED holatiga o'tish sharti:** laboratoriyaning real hisobi (Excel yoki qo'lda) bilan solishtirilgan kamida bitta misol (CLAUDE.md qoidasi).
> **Tanlov asosi:** akkred.uz reestri, 200 ta sinov laboratoriyasi (05_SINOV_METODLARI_TAHLILI.md). Qavs ichidagi raqam — shu standartni qo'llaydigan laboratoriyalar soni.

## Umumiy qoidalar (barcha shablonlar uchun)

- **Sinov asbobining** (tarozi, press, mikrometr, pH-metr va h.k.) sertifikat U'si yoki ruxsat etilgan xatoligi — B tur manba. Bu taqiq ostidagi "kalibrlanayotgan asbob MPE'si" bilan bir narsa emas.
- **Takrorlanuvchanlik (A tur):** parallel aniqlashlar asosida olinadi (`s/√n`, n — natijaga kiradigan parallellar soni). Laboratoriyada R_w ma'lumoti bo'lsa, uni `pooled` usuli bilan kiritish tavsiya etiladi.
- **Namunaning o'zgaruvchanligi** (masalan, turli kublar orasidagi farq) mahsulot xossasi, o'lchash noaniqligi emas. Shablonda u alohida belgi bilan ko'rsatiladi va standart holatda kiritilmaydi.
- **Standartdagi natijani yaxlitlash qoidasi** (masalan, "0,1 MPa gacha") hisobot qatlamida qo'llanadi, noaniqlik byudjetiga kirmaydi.
- **Belgilar:** `rect` — to'g'ri burchakli, `norm` — normal (sertifikat, U/k), `res` — raqamli ajratish (d/(2√3)), `tri` — uchburchak.

---

## A. Qurilish materiallari va metallar

### T-01. Metall cho'zilishi: vaqtinchalik qarshilik va oquvchanlik chegarasi — ГОСТ 1497 (34), ГОСТ 12004 (39), ГОСТ 34028 (20)
- **Model:** `σ = F / S0`. Doiraviy kesim: `S0 = π·d0²/4`; to'g'ri burchakli kesim: `S0 = a0·b0`.
- **Kirishlar:** F — kuch, N (F_max yoki F_T); d0 yoki a0, b0 — o'lcham, mm. Natija MPa.
- **Manbalar:**
  - F: sinov mashinasining kuch o'lchash sinfi yoki sertifikati (`norm`/`rect`), ko'rsatkich ajratish qobiliyati (`res`);
  - d0 (a0, b0): mikrometr yoki shtangensirkul sertifikati (`norm`), ajratish qobiliyati (`res`), takroriy o'lchash (A tur);
  - namunaning o'zgaruvchanligi — kiritilmaydi.
- ⚠ Kuch o'lchash sinfining manbasi (ISO 7500-1 / ГОСТ 28840) tekshirilsin.

### T-02. Metall nisbiy uzayishi — ГОСТ 1497, ГОСТ 12004
- **Model:** `δ = (lk − l0) / l0 · 100`, %.
- **Manbalar:** lk va l0 uchun — chizg'ich, shtangensirkul yoki ekstensometr sertifikati (`norm`) va ajratish qobiliyati (`res`); belgini qo'yish va qismlarni birlashtirish noaniqligi (`rect`, laboratoriya baholaydi).
- l0 va lk bitta asbob bilan o'lchansa, **korrelyatsiya r = +1** (umumiy sistematik xato). Shablon buni so'rashi kerak.

### T-03. Beton siqilishdagi mustahkamligi — ГОСТ 10180 (39)
- **Model:** `R = α · F / A`, `A = a·b`, MPa.
- **Kirishlar:** α — masshtab koeffitsienti, standart jadvalidan olinadigan o'zgarmas (noaniqligi 0). ⚠ α jadvali va ГОСТ 10180-2012 dagi qo'shimcha koeffitsientlar tekshirilsin.
- **Manbalar:** pressning kuch sinfi (`norm`/`rect`), ko'rsatkich ajratish qobiliyati (`res`), a va b — shtangensirkul (`norm` + `res`), namuna geometriyasidan chetlanish (`rect`, laboratoriya baholaydi).

### T-04. Beton qorishmasi: konus cho'kishi va zichligi — ГОСТ 10181 (36)
- **Model 1 (cho'kish):** `OK = h0 − h1`, sm (ikkala balandlik bitta chizg'ich bilan, r = +1).
- **Model 2 (zichlik):** `ρ = (m1 − m0) / V`, kg/m³.
- **Manbalar:**
  - chizg'ich: sertifikat (`norm`) va ajratish qobiliyati (`res`);
  - tarozi: sertifikat (`norm`) va ajratish qobiliyati (`res`), m0 va m1 korrelyatsiyasi;
  - idish hajmi V: kalibrlash yoki o'lchab hisoblash (`norm`/`rect`);
  - takroriylik (A tur).

### T-05. Qurilish qorishmasi: o'rtacha zichlik va harakatchanlik — ГОСТ 5802 (23)
- **Model:** `ρ = (m − m1) / V`; harakatchanlik — konusning botish chuqurligi `P = h`, sm.
- **Manbalar:** T-04 bilan bir xil. Harakatchanlik uchun shkala ajratish qobiliyati (`res`) va A tur.

### T-06. Chaqiq tosh / qum: donador tarkib (elakdagi xususiy qoldiq) — ГОСТ 8269.0 (33), ГОСТ 8735 (32)
- **Model:** `a_i = m_i / m · 100`, %. To'liq qoldiq: `A_i = Σ a_j` (j ≤ i).
- **Manbalar:** tarozi sertifikati va ajratish qobiliyati (m_i va m uchun, korrelyatsiya bilan); elash jarayoni (yo'qotish yoki qolib ketish, `rect`, laboratoriya baholaydi); A tur.
- ⚠ Bir nechta korrelyatsiyalangan chiqish (barcha a_i) — to'liq yechim P07 (JCGM 102) da. Hozircha har bir a_i alohida hisoblanadi.

### T-07. Qumning yiriklik moduli — ГОСТ 8735
- **Model:** `Mk = (A2,5 + A1,25 + A0,63 + A0,315 + A0,16) / 100`.
- **Manbalar:** A_i — T-06 natijalari. ⚠ A_i lar umumiy m va bir xil m_j orqali korrelyatsiyalangan, bu e'tiborga olinishi kerak. Soddalashtirilgan variant: Mk to'g'ridan-to'g'ri m_i lar orqali yoziladi, `Mk = (Σ_k Σ_{j≤k} m_j) / (100·m) · 100`, va LPU avtomatik korrelyatsiyani hisobga oladi.

### T-08. Chaqiq tosh maydalanuvchanligi; chang va loy zarralari miqdori — ГОСТ 8269.0
- **Model:** `X = (m − m1) / m · 100`, %.
- **Manbalar:** tarozi (`norm` + `res`, m va m1 korrelyatsiyasi), press yuklamasi (maydalanuvchanlik uchun bilvosita, `rect`), A tur.

### T-09. Sochma zichlik (chaqiq tosh, qum) — ГОСТ 8269.0, ГОСТ 8735
- **Model:** `ρ_n = (m1 − m) / V`, kg/m³.
- **Manbalar:** tarozi, o'lchov idishi hajmi (`norm`), to'ldirish usuli (A tur orqali).

### T-10. Beton va g'isht o'rtacha zichligi — ГОСТ 12730.1 (31), ГОСТ 7025 (31)
- **Model:** `ρ = m / (a·b·c) · 1000`, kg/m³ (o'lchamlar mm da, massa g da).
- **Manbalar:** tarozi (`norm` + `res`); a, b, c — shtangensirkul yoki chizg'ich (`norm` + `res`); shakl nuqsoni (`rect`); A tur.

### T-11. Suv shimuvchanlik (beton, g'isht, plitka) — ГОСТ 12730.3, ГОСТ 7025, ГОСТ 27180
- **Model:** `W = (m1 − m) / m · 100`, %.
- **Manbalar:** tarozi (m va m1 bitta tarozida, r = +1), sirtni artish operatsiyasi (`rect`, laboratoriya baholaydi), A tur.

### T-12. Namlik (beton, grunt) — ГОСТ 12730.2, ГОСТ 5180 (25)
- **Model (grunt):** `W = (m1 − m0) / (m0 − m) · 100`, % (m — byuks, m1 — nam, m0 — quritilgan).
- **Manbalar:** tarozi (barcha massalar orasida korrelyatsiya), quritish rejimi va doimiy massaga yetkazish (`rect`), A tur.

### T-13. G'isht siqilish va egilishdagi mustahkamligi — ГОСТ 8462 (31)
- **Model:** siqilish `R = F / A`; egilish `R = 3·P·l / (2·b·h²)`, MPa.
- **Manbalar:** press kuchi, oraliq l (chizg'ich yoki shablon), b va h (shtangensirkul) — `norm` + `res`, A tur.
- Egilish modeli h ga juda sezgir (c ∝ h⁻³). Ustun hissa ogohlantirishi kutiladi.

### T-14. Geometrik o'lchamlar va chetlanishlar — ГОСТ 26433.1 (33)
- **Model:** `Δ = x_o'lch − x_loyiha`.
- **Manbalar:** ruletka, chizg'ich yoki nivelir sertifikati (`norm`), ajratish qobiliyati (`res`), harorat ta'siri (ruletka uchun `ΔL = L·α·Δt`, `rect`), o'qish va o'rnatish (`rect`), A tur.

### T-15. Plastmassa cho'zilishi — ГОСТ 11262 (27)
- **Model:** `σ = F / (b·h)`; `ε = ΔL / L0 · 100`.
- **Manbalar:** T-01 va T-02 ga o'xshash. Namunaning qalinligi h ustun hissa bo'lishi mumkin.

### T-16. Rokvell qattiqligi — ГОСТ 9013 (21)
- **Model:** `H = H_o'q + Δ_et` (Δ_et — etalon plitka bo'yicha tuzatma).
- **Manbalar:** etalon qattiqlik plitkasi sertifikati (`norm`); qattiqlik o'lchagichning etalon plitkadagi chetlanishi (`rect`); ajratish qobiliyati (`res`); A tur (kamida 3 ta iz).
- ⚠ ГОСТ 9013 / ISO 6508-1 dagi noaniqlik ilovasi tekshirilsin.

## B. Oziq-ovqat, kimyo, maishiy kimyo

### T-17. Titrlash (umumiy shablon): kislotalik, ishqoriylik, xloridlar, SAV — ГОСТ 3624 (24), ГОСТ 5898 (31), ГОСТ 5670 (24), ГОСТ 26878 (22), ГОСТ 4245 (20), ГОСТ 22567.6 (26)
- **Model:** `X = (V − V0) · c · K · f / m`.
- **Kirishlar:** V va V0 — titrant hajmi (namuna va bo'sh tajriba); c — titrant konsentratsiyasi; K — titrga tuzatma; m — namuna massasi yoki hajmi; f — standartdagi o'zgarmas koeffitsient (masalan, ekvivalent massa, 100, 1000), noaniqligi 0.
- **Manbalar:**
  - byuretka: kalibrlash yoki sinfi (`tri`), harorat (`rect`, `V·γ·Δt`);
  - ekvivalentlik nuqtasini aniqlash (A tur orqali);
  - titrant konsentratsiyasi c va K (standartlashtirish noaniqligi, `norm`);
  - m — tarozi yoki pipetka;
  - A tur.
- Har bir standart uchun f qiymati alohida, pastki shablon (`variant`) sifatida beriladi. ⚠ f qiymatlari har bir standartdan tekshirilsin.
- Asos: EURACHEM QUAM A2 tuzilmasi (NaOH titrlash).

### T-18. Quritish usulida namlik va uchuvchan moddalar — ГОСТ 29188.4 (21), ГОСТ 13586.5, ГОСТ 5900
- **Model:** `X = (m1 − m2) / (m1 − m0) · 100`, % (m0 — byuks, m1 — namuna bilan, m2 — quritilgandan keyin).
- **Manbalar:** tarozi (uchala massa korrelyatsiyalangan); quritish shkafi harorati va vaqti (`rect`, laboratoriya validatsiyasi); A tur (2 ta parallel).

### T-19. Kul miqdori — oziq-ovqat va don standartlari
- **Model:** `X = (m2 − m0) / (m1 − m0) · 100`.
- **Manbalar:** T-18 bilan bir xil. Qo'shimcha: kuydirish to'liqligi (`rect`).

### T-20. pH (suvli eritma yoki ekstrakt) — ГОСТ 22567.5 (30), ГОСТ 29188.2 (25)
- **Model:** `pH = pH_o'q + δ_bufer + δ_T + δ_drift`.
- **Manbalar:** bufer eritmalar sertifikati (`norm`); pH-metrning ajratish qobiliyati (`res`); harorat kompensatsiyasi (`rect`); elektrod dreyfi (`rect`); A tur.
- ⚠ Kalibrlashda ishlatilgan ikki bufer pH qiymatiga bog'liq interpolyatsiya — ilg'or variant (P08).

### T-21. Gravimetrik massa ulushi (erimaydigan aralashmalar, sovun komponentlari) — ГОСТ 790 (28), ГОСТ 22567.7
- **Model:** `X = (m2 − m1) / m · 100`.
- **Manbalar:** tarozi (korrelyatsiya bilan), filtrlash va yuvishdagi yo'qotish (`rect`), A tur.

## C. Elektr xavfsizligi (IEC 60335 (25), 60204 (25), 60950 (22), 60598 (21), 60065 (21); ГОСТ 3940, 2933)

### T-22. Izolyatsiya qarshiligi va oqish toki
- **Model:** `Y = Y_o'q` (to'g'ridan-to'g'ri o'qish).
- **Manbalar:** megaommetr yoki oqish toki o'lchagich sertifikati yoki ruxsat etilgan xatoligi (`rect`, odatda `±(a%·o'qish + b raqam)`, formula sifatida kiritiladi); ajratish qobiliyati (`res`); A tur.
- Natija odatda chegara bilan solishtiriladi (masalan, ≥ X MΩ). Qaror qoidasi (P05) majburiy.

### T-23. Elektr mustahkamlik: sinov kuchlanishi
- **Model:** `U_sin = U_o'q`.
- **Manbalar:** yuqori kuchlanish o'lchagichi (`rect`/`norm`), ajratish qobiliyati (`res`). Natija — "teshilmadi / teshildi". Noaniqlik **qo'llangan kuchlanishga** tegishli: kuchlanish talab qilinganidan past bo'lmasligi kerak (bir tomonlama qaror qoidasi).

### T-24. Qizish (harorat oshishi), qarshilik usuli — IEC 60335-1, 11-band
- **Model:** `Δt = (R2 − R1)/R1 · (k + t1) − (t2 − t1)`. Mis uchun k = 234,5; alyuminiy uchun 225.
- **Manbalar:** R1, R2 — ommetr (`norm` + `res`, korrelyatsiya r ≈ +1); t1, t2 — termometr (`norm` + `res`); o'chirishdan keyin o'lchashgacha o'tgan vaqt tufayli sovish (`rect`, laboratoriya baholaydi).
- Termojuft usuli uchun variant: `Δt = t_obekt − t_atrof`.
- ⚠ k qiymatlari va band raqami IEC 60335-1 ning amaldagi nashridan tekshirilsin.

---

## Keyingi to'lqinga qoldirilganlar
- ГОСТ 10060 (sovuqqa chidamlilik) — mustahkamliklar nisbati va qaror; T-03 dan keyin.
- ГОСТ 22690 (buzmasdan sinash) — kalibrlash bog'liqligi kerak (P08).
- ГОСТ 33 (kinematik qovushqoqlik, `ν = C·τ`), chaqnash harorati — 2-to'lqin, neft laboratoriyalari uchun.
- Organoleptik, mikrobiologiya, AAS/HPLC — P08–P10.
