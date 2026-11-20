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
  "modelSpec": { "format": "calc-state/v2", "state": { … } }, // docs/ENGINE_API.md (uc-model/1 ham qabul qilinadi)
  "run": { "method": "evaluate" | "monteCarlo" | "regression" | "topdown" | "path", "M": 1000000, "interval": "symmetric" | "shortest" },
                                          // "path" (P10): maxsus rejimlar (uc-sampling/1, uc-qualitative/1, uc-micro/1, uc-medical/1) —
                                          // kattalik nomi natijadagi yo'l: classical.s.sampling, sSamp, relU, log.uncertaintyFactor.measurement,
                                          // sensitivity.wilson.low, posteriorPositive …
                                          // "topdown" (P09): modelSpec — format "uc-topdown/1"; kattalik nomi — natijadagi yo'l:
                                          // uc, U, k, relU, rw.u, rw.components.N.u|s|n|mean, bias.rms|uRef|u|meanBias, bias.items.N.uRef,
                                          // recovery.uRm|t|tCrit|u|significant (mantiqiy → 0/1), yCorrected, absUc;
                                          // "part": "bias" — manba faqat u(bias) ni bergan bo'lim (bias qismi alohida hisoblanadi)
                                          // "regression" (P08): modelSpec — format "uc-regression/1"; kattaliklar: a, b, c, d, u_a…, r_ab, s, nu, chi2,
                                          // x_min_u, fitted.N, residuals.N, predict.N.y|u|nu, inverse.N.x0|u|nu (N noldan);
                                          // "inverseAtX": [{x, p}] — manba y₀ ni bermagan bo'lsa, y₀ moslangan chiziqdan tiklanadi
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
| ν_eff "∞" | Excel B tur uchun ν = 10⁹ ni ishlatadi. Kutilgan ≥ 10⁶ bo'lsa, natija ≥ 10⁶ (yoki ∞) bo'lishi kifoya | Excel konventsiyasi; dvigatel ν_B = ∞ (P03 dan cap yo'q) |
| k, U: Excel ν_eff ≥ 1000 da z ishlatgan nuqtalar (`excel-term-p2/-p3/-p5`) | nisbiy 1·10⁻³ (`reason` bilan) | egasi qarori Q-1(a) — GUM G.4.1: k = t(⌊ν_eff⌋) (D-02) |

## Misollar ro'yxati

Talab → kod → test → holat: [docs/validation/RTM.md](../../docs/validation/RTM.md) (avtomatik; manba — `REQUIREMENTS.md` + `rtm.map.json`). Har bir misolning kutilgan / olingan qiymatlari — validatsiya hisobotida (`node scripts/validation-report.js`).

`tests/cases/excel/*.json` (9 ta Excel nuqtasi) `node tests/tools/build-excel-cases.js` bilan Excel'dan yaratilgan. Qo'lda o'zgartirmang: kerak bo'lsa skriptni o'zgartirib, qayta yarating va diff'ni ko'rib chiqing.

## Monte-Karlo misollari (P06)

`run.method: "monteCarlo"` bo'lgan misollarda:

- `run.interval` — `"shortest"` yoki `"symmetric"` (kutilgan interval shu tur bilan solishtiriladi);
- `run.mc` — `monteCarlo()` sozlamalari (`docs/ENGINE_API.md` §12.1): masalan `{ "mode": "adaptive", "nDig": 2, "tolDivisor": 5 }` yoki `{ "mode": "fixed", "M": 1000000 }`. `run.mc` bo'lmasa — qat'iy `run.M` (eski misollar);
- qo'shimcha kattaliklar: `M` (sinovlar soni), `d_low`, `d_high`, `validated` (0 / 1), `converged` (0 / 1);
- generator — Wichmann–Hill, urug' 20261110 (natija takrorlanuvchan).

**Tolerans qoidasi.** Manbadagi natija nechta raqam bilan berilgan bo'lsa — shunga mos (½ oxirgi xona yoki manbadagi δ). Manba bitta simulyatsiya natijasini bergan va δ ni ko'rsatmagan bo'lsa, ustiga ikki mustaqil simulyatsiya farqining ikki standart og'ishi (2·√2·s) qo'shiladi; s `tests/tools/mc-scatter.js` bilan o'lchanadi va `tolerance.*.reason` da yoziladi. Tolerans misolni "o'tkazish uchun" kengaytirilmaydi — o'tmagan misol `knownDiscrepancies` ga yoziladi (masalan D-04).

