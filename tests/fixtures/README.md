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

## `iso20914/` — ISO/TS 20914:2019 (M9, tibbiy laboratoriya) — P18

`G1.json … G11.json`: ISO/TS 20914:2019 (E), 1-nashr, Annex A va Annex C ishlangan misollarining **raqamli kirish va kutilgan qiymatlari** (band havolasi bilan). Standart pullik: PDF repoda **yo'q** va joylanmaydi; qiymatlarni egasi bergan (standart jadvallaridan ko'chirilgan va mustaqil qayta hisoblangan, 20.11.2026).

| Maydon | Mazmun |
|---|---|
| `id`, `source`, `clause`, `title` | misol, manba (`ISO/TS 20914:2019`), band / jadval |
| `input` (yoki `runs`) | `uc-medical/1` kirishi (`docs/ENGINE_API.md` §9.4) |
| `expected[]` | `{ path, value, tol }`; `tol` — manbada oxirgi ko'rsatilgan xonaning ½ birligi; `kind: "standard-rounded"` — standart jadvalidagi yaxlitlangan qiymat; `factor` — solishtirishdan oldin ko'paytuvchi (U = 2·u); `discrepancy` — ma'lum farq (`tests/cases/DISCREPANCIES.md`) |
| `equals[]`, `warnings` | aniq qiymatlar (tanlangan daraja, ahamiyatlilik) va chiqishi / chiqmasligi kerak bo'lgan ogohlantirishlar |
| `note` | manbada berilmagan to'ldiruvchi qiymatlar (birlik belgisi, tekshirilmaydigan o'rtacha) — ochiq yozilgan |

Kutilgan qiymat yoki tolerans "o'tsin" deb o'zgartirilmaydi — mos kelmasa farq egasiga yoziladi (hozir: D-23, G9 ning ikki qatori). Test: `tests/engine/medical.iso20914.test.js`.
