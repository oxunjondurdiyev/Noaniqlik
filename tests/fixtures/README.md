# Etalon fayllar (test fixtures)

| Fayl | Mazmun | Nuqtalar |
|---|---|---|
| `Zichlik_noaniqligi_hisobi.xlsx` | ρ = m/V, juftlangan o'lchashlar (korrelyatsiya), GUM H.2 tekshiruvi | 1 |
| `Noaniqlik_hisobi_gazoanalizator_KEDR-07.xlsx` | KEDR-07 gazoanalizatori kalibrlash (C75.QM asosida) | 3 |
| `Noaniqlik_hisobi_termometr_MS-MK-3.xlsx` | Manometrik termometr kalibrlash (MS-MK-3 asosida), ↑/↓ va histerezis | 5 |
| `Qollanma_noaniqlik_gazoanalizator_C75QM.docx` | Gazoanalizator hisobi bo'yicha qo'llanma, shu jumladan Monte-Karlo tekshiruvi | — |
| `Qollanma_noaniqlik_termometr_MS-MK-3.docx` | Termometr hisobi bo'yicha qo'llanma | — |

"9 ta etalon nuqta" = zichlik 1 + gazoanalizator 3 + termometr 5.

Eslatma: termometr faylidagi kuzatuvlar o'quv maqsadidagi namuna qiymatlar (MS-MK-3 da raqamli misol yo'q). Ular dvigatelni tekshirish uchun yaroqli, lekin real laboratoriya ma'lumoti emas.

## `iso19036/` — ISO 19036:2019 misollari (P17)

`F1.json … F11.json` (+ `F5b.json`): mikrobiologiya (M8) uchun etalon qiymatlar. **Standart matni / PDF bu yerda YO'Q va qo'shilmaydi** (pullik, mualliflik huquqi; repo ochiq) — faqat raqamli qiymatlar va band havolalari. Qiymatlar egasi bergan ro'yxatdan (standartning lokal nusxasidan olingan). Har bir fayl: `{ id, source, clause, title, input, expected: { kattalik: { value, tol } } }`; `tol` — manbadagi oxirgi xona birligining yarmi (o'zgartirilmaydi). `knownDiscrepancies` — `tests/cases/DISCREPANCIES.md` (D-23…D-25); `F2` — `status: "pending"` (jadval ma'lumoti kutilmoqda). `F5b` — standart misoli emas, mustaqil hisob. Test: `tests/engine/micro.iso19036.test.js`.
