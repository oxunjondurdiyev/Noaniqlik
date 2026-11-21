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

## `iso20914/` — ISO/TS 20914:2019 etalon misollari (P18)

`G1.json` … `G11.json` — tibbiy laboratoriya rejimi (`uc-medical/1`) uchun raqamli etalon qiymatlar va band havolalari.
Manba: ISO/TS 20914:2019 (E), 1-nashr. **Standart PDF'i repoda yo'q va qo'shilmaydi** (pullik, litsenziyali nusxa — tarqatish taqiqlangan);
qiymatlar egasidagi nusxadan olingan (egasi bergan, P18) va mustaqil qayta hisoblangan. Bu "9 ta etalon nuqta" ga kirmaydi.

| Fayl | Band | Mazmun |
|---|---|---|
| G1 | A.2.2, Table A.1 | u = √(u_Rw² + u_cal²), uch daraja |
| G2 | A.2.3, Table A.2 | takrorlanuvchanlik; daraja qo'llanish oraliqlari |
| G3 | A.2.4, Rule 1, Example 1 | u_cal, u_bias, u_Rw — mutlaq birliklarda |
| G4 | A.3.1 Formula (A.8); A.3.2, Table A.3 | reagent lotlari bo'yicha pooled u_Rw |
| G5 | A.3.3 | pooled u_Rw, lot o'rtachalarining o'rtachasi |
| G6 | A.4, Table A.5 | bir nechta bir xil o'lchash tizimi |
| G7 | A.7, Table A.11 | davrlar bo'yicha pooling |
| G8 | C.5.2 | u_bias CRM dan, ahamiyatlilik testi |
| G9 | C.6.1, Table C.1 | natriy: u_bias qo'shilgan (ma'lum farq D-23) |
| G10 | C.6.2, Table C.2 | kreatinin: ikki IQC loti alohida |
| G11 | A.10, Table A.15 | log₁₀ o'lchanuvchi |

Fayl tuzilmasi: `{ id, source, clause, input, expected[], expectedStd[]?, equals?, warnings?, knownDiscrepancies[]?, extra[]?, tolerance }`;
har bir qatorda `{ path, value, tol, factor? }` — `tol` oxirgi ko'rsatilgan xonaning ½ birligi. `expectedStd` — standartda bosilgan (yaxlitlangan) qiymatlar.
Qiymat yoki toleransni "test o'tsin" deb o'zgartirish taqiqlanadi. Test: `tests/engine/medical.iso20914.test.js`.
