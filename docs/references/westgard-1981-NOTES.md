# Westgard qoidalari — manba qaydnomasi (P11)

**Manba:** Westgard J.O., Barry P.L., Hunt M.R., Groth T. "A multi-rule Shewhart chart for quality control in
clinical chemistry". *Clin. Chem.* 27/3 (1981) 493–501.

**PDF repoda yo'q.** Maqola © 1981 American Association for Clinical Chemistry — egasidagi nusxa
"qayta nashr ruxsati bilan" belgilangan; ommaviy repoga joylanmaydi. Egasi 2026-11-19 da nusxani taqdim etdi; quyidagi
qaydlar shu nusxa bilan solishtirib yozilgan (loyiha muallifi qayta aytib bergan, iqtibos emas). Tekshiruvchi nusxani
egasidan oladi.

## 1. Qoidalar ta'rifi (493–494-betlar, "Control Rules (Decision Criteria)")

| Qoida | Maqoladagi ma'no (qayta aytilgan) | Qo'llanish sohasi |
|---|---|---|
| 1₂s | bitta nazorat kuzatuvi x̄ ± 2s dan oshadi — **ogohlantirish**; boshqa qoidalarni ishga tushiradi | seriya ichida |
| 1₃s | bitta kuzatuv x̄ ± 3s dan oshadi → rad | seriya ichida |
| 2₂s | ketma-ket ikki kuzatuv **bir xil** chegaradan (x̄ + 2s yoki x̄ − 2s) oshadi → rad | seriya ichida ikki material bo'ylab ("across") **yoki** bir materialda ketma-ket ikki seriya ("within") |
| R₄s | bir seriyadagi ikki kuzatuv: biri x̄ + 2s dan, ikkinchisi x̄ − 2s dan oshadi (farq 4s dan katta) → rad | **faqat seriya ichida**, materiallar bo'ylab |
| 4₁s | ketma-ket to'rt kuzatuv bir xil x̄ ± 1s chegaradan oshadi → rad | bir materialda 4 seriya yoki ikki materialda 2 seriya |
| 10ₓ | ketma-ket o'n kuzatuv x̄ ning bir tomonida → rad | bir materialda 10 seriya yoki ikki materialda 5 seriya |

Taqriz izohi (494-bet): R₄s ni "farq > 4s" (masalan +2,5s va −1,5s) sifatida qo'llash ham to'g'ri bo'lardi, lekin
mualliflar ikkala nuqta ±2s dan oshgan shaklni tanlagan.

**Protsedura (495–496-betlar, 1-rasm va "Control Procedure" 2–5-bandlar):** avval 1₂s; ikkala kuzatuv x̄ ± 2s ichida
bo'lsa — seriya **qabul qilinadi** (boshqa qoidalar tekshirilmaydi). Kamida bittasi ±2s dan oshsa — 1₃s, 2₂s, R₄s
(seriya ichida), so'ng 2₂s, 4₁s, 10ₓ (seriyalar bo'ylab) tekshiriladi; hech biri buzilmasa — qabul.
Xato turi talqini (495, 496-betlar): 1₃s, R₄s — asosan tasodifiy; 2₂s, 4₁s, 10ₓ — sistematik.

Chegaralar (495-bet, (3)–(5) tenglamalar): x̄ ± 3s, x̄ ± 2s, x̄ ± 1s; x̄ va s — (1), (2) tenglamalar
(s — n − 1 maxrajli namuna standart og'ishi), dastlabki baho n ≈ 20 dan, keyin yig'ma qiymatlar bilan yangilanadi.

## 2. Sonli misol — 495-bet, 1–3-jadvallar

1-jadval (bitta nazorat materiali, 5 oy × 20 kun):

```
oy1: 98 97 95 103 100 104 92 94 102 95 100 93 100 106 112 94 96 97 103 104
oy2: 100 109 102 104 97 105 98 100 96 103 97 97 96 97 104 99 105 94 95 97
oy3: 97 98 102 92 104 100 95 100 104 101 101 99 97 112 92 105 105 101 95 100
oy4: 101 100 99 100 96 100 98 97 103 107 104 96 104 105 101 102 102 102 101 104
oy5: 100 96 101 102 104 100 96 101 99 105 100 95 101 99 90 98 106 100 101 97
```

2-jadval — oylik qiymatlar (mustaqil qayta hisoblandi, **hammasi mos**):

| Oy | Σx | Σx² | x̄ | s |
|---|---|---|---|---|
| 1 | 1985 | 197 507 | 99,25 | 5,11 |
| 2 | 1995 | 199 319 | 99,75 | 4,09 |
| 3 | 2000 | 200 434 | 100,00 | 4,78 |
| 4 | 2022 | 204 592 | 101,10 | 2,97 |
| 5 | 1991 | 198 457 | 99,55 | 3,65 |

Yig'ma qiymatlar (n = 100): x̄ = 99,93, s = 4,15 — mos. 3-jadvaldagi oylik chegaralar ham shu x̄, s dan
(masalan 1-oy x̄ ± 2s = 89,0–109,5).

**Maqoladagi bosma xatolar (test kutilgan qiymati sifatida OLINMAYDI):**
- 2-oy yig'masi: Σx² = 396 825 (to'g'ri 396 826), s = 4,46 — jadvaldagi yig'indilardan s = 4,57 chiqadi;
  3-jadvaldagi (90,6–108,4) ham 4,46 ga tayangan.
- 4-oy yig'masi: Σx = 9002 (to'g'ri 8002), x̄ = 100,00 (to'g'ri 100,03); s = 4,29 — mos.
Testda faqat oylik qiymatlar, 1-, 3-, 5-oy yig'malari ishlatiladi; 2- va 4-oy yig'malari — `DISCREPANCIES.md` ga.

3-rasm (497-bet) — ikki materialli kartada talqin misollari (5, 6, 8, 11, 13, 14, 17, 25, 27, 29-kunlar). Nuqtalar
faqat grafikda, raqam yo'q — sonli test sifatida ishlatilmaydi, lekin ssenariy testlari uchun namuna
(masalan 6-kun: faqat 1₂s ogohlantirish, boshqa qoida buzilmagan → qabul; 17-kun: 4₁s ikki material bo'ylab;
27-kun: 10ₓ bitta materialda).

## 3. `src/engine/lab/westgard.js` (ENGINE 2.8.0) bilan solishtirish

| # | Masala | Maqola | Kod | Holat |
|---|---|---|---|---|
| W-1 | Chegara | "exceeds" | qat'iy `>` | mos |
| W-2 | 1₃s, 2₂s (bir material ichida), 4₁s, 10ₓ ta'rifi | yuqorida | mos | mos |
| W-3 | R₄s | seriya ichida, ikki material | `runs` bilan — mos; `runs` siz ketma-ket juftlik — loyiha yaqinlashuvi (R-25) | mos / belgilangan |
| W-4 | **1₂s darvozasi** | seriyada ±2s dan oshish bo'lmasa — qabul, boshqa qoida tekshirilmaydi | 2.8.1: standart `gate: true` (maqoladagidek); laboratoriya sozlamasi `westgardGate: false` — mustaqil rejim, belgi bilan | **yopildi** (egasi qarori 2026-11-19) |
| W-5 | Materiallar bo'ylab ("across") qoidalar | 2₂s, 4₁s, 10ₓ ikki materialda | 2.8.1: `westgardMulti` (dvigatel, testlar bilan); 3+ material — `generalized`; UI da kartalarni guruhlash — keyingi bosqich | **dvigatelda yopildi** |
| W-6 | 10ₓ da aynan x̄ dagi nuqta | aytilmagan | ketma-ketlikni uzadi (R-25) | loyiha qarori |
