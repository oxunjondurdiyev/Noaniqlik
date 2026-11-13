# Test misollari (`tests/cases/`) — P01

Har bir misol — bitta JSON fayl. Ishga tushirish: `npm test` (`tests/run-cases.test.js`), manba bilan qayta tekshirish: `tests/fixture-refs.test.js`.

## Qoidalar (CLAUDE.md)

- Kutilgan qiymatlar **faqat asl manbadan**: `docs/references/` dagi PDF (bo'lim, jadval, sahifa) yoki `tests/fixtures/` dagi laboratoriya Excel'i (**katak havolasi** `Varaq!Katak`).
- Gemini hisobotidagi raqamlar kutilgan qiymat sifatida ishlatilmaydi. Ular manba bilan solishtirilgan, farqlar [DISCREPANCIES.md](DISCREPANCIES.md) da.
- Hozirgi dvigatelda yiqilgan `verified` kattalik **tuzatilmaydi**. U `knownDiscrepancies` ga D-ID bilan yoziladi va egasiga ko'rsatiladi.

## Format

```jsonc
{
  "id": "jcgm100-h1",                     // yagona
  "title": "…",
  "status": "verified" | "unverified" | "pending",
  "enabledIn": "P08",                     // pending uchun majburiy
  "statusReason": "…",                    // unverified/pending sababi
  "domain": "uzunlik",
  "source": {
    "doc": "JCGM 100:2008 (GUM)", "section": "Annex H.1 …", "page": "79–84",
    "file": "tests/fixtures/….xlsx|.docx",          // fayl manbasi bo'lsa
    "inputRefs": { "measurements.I": "Kirish!D32:M32" }, // kirish ↔ Excel katagi (qayta tekshiriladi)
    "quotes": ["[−0,0111; 0,0469]"]                // .docx dagi iqtibos (qayta tekshiriladi)
  },
  "modelSpec": { "format": "calc-state/v2", "state": { … } }, // hozirgi src/js/calc.js kirishi; P03 da ENGINE_API.md formatiga o'tadi
  "run": { "method": "evaluate" | "monteCarlo", "M": 1000000, "interval": "symmetric" | "shortest" },
  "expected": {                           // har bir qiymat manba havolasi bilan
    "y":  { "value": 50000838, "ref": "H.1.5 (p. 83)" },
    "uc": { … }, "nu_eff": { … }, "k": { … }, "U": { … },
    "u":  { … },                          // MCM standart og'ishi
    "interval": { "low": …, "high": …, "ref": "…" }  // MCM qamrov intervali
  },
  "expectedDisplay": { "U": {…}, "y": {…} },      // hisobotdagi yaxlitlangan qiymatlar (Excel kataklari)
  "expectedWarnings": ["zero_u"],
  "tolerance": { "default": { "rel": 1e-9 }, "uc": { "abs": 0.5, "reason": "…" } },
  "knownDiscrepancies": { "k": "D-01" }          // DISCREPANCIES.md ID — todo sifatida ishlaydi
}
```

## Tolerans qoidasi

| Manba turi | Tolerans | Asos |
|---|---|---|
| Laboratoriya Excel'i (to'liq aniqlikdagi katak qiymati) | nisbiy 1·10⁻⁹ (y, u_c, ν_eff, k, U) | PLAN P01/P03 |
| Excel'dagi yaxlitlangan qiymat (`expectedDisplay`) | aniq tenglik | hisobot ko'rinishi o'zgarmasligi (CLAUDE.md) |
| Hujjatdagi (PDF) qiymat | oxirgi ko'rsatilgan xonaning ±½ birligi | `docs/prompts` P02 §3 |
| Manba qiymatni **yaxlitlangan oraliq qiymatdan** hisoblagan (masalan, U = k × yaxlitlangan u_c) | ±½ birlik + oraliq yaxlitlashning tarqalishi (har bir misolda `reason` bilan) | manbaning o'z hisob yo'li; **egasi tasdiqlashi kerak** (DISCREPANCIES.md, savol Q-4) |
| Monte-Karlo | JCGM 101:2008 7.9.2: δ = ½·10^ℓ (manba bergan n_dig yoki δ) | JCGM 101 §8 |
| ν_eff "∞" | Excel B tur uchun ν = 10⁹ ni ishlatadi. Kutilgan ≥ 10⁶ bo'lsa, natija ≥ 10⁶ (yoki ∞) bo'lishi kifoya | Excel konventsiyasi; dvigatel 10⁶ cap |

## Misollar ro'yxati

Holat va manbalar bo'yicha to'liq jadval: [docs/VALIDATION_MATRIX.md](../../docs/VALIDATION_MATRIX.md).

`tests/cases/excel/*.json` (9 ta Excel nuqtasi) `node tests/tools/build-excel-cases.js` bilan Excel'dan yaratilgan. Qo'lda o'zgartirmang: kerak bo'lsa skriptni o'zgartirib, qayta yarating va diff'ni ko'rib chiqing.
