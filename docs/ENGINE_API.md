# Hisoblash dvigateli API (`src/engine/`) — ENGINE_VERSION 2.9.0

> Holat: P07b, 2026-11-19 (2.9.0: oshkor bo'lmagan model, atan2, eng kichik qamrov sohasi — §13.4–13.5; 2.8.0: laboratoriya jarayonlari — [§14](#14-laboratoriya-jarayonlari-p11); 2.7.0: vektor chiqish, JCGM 102:2011 — [§13](#13-kop-ozgaruvchili-modellar-p07); 2.6.0: Monte-Karlo 2.0 — [§12](#12-monte-karlo-20-p06); 2.5.0: qaror qoidasi, hisob hujjati — [§11](#11-qaror-qoidasi-hisob-hujjati-va-hisobot-shakllari-p05b); 2.4.0: linter — `result.findings`, model turi — [§10](#10-linter-resultfindings-va-model-turi-p05a); 2.3.0: maxsus rejimlar — [§9](#9-maxsus-rejimlar-p10); 2.2.0: TOP_DOWN rejimi — [§8](#8-top_down-rejimi-uc-topdown1-p09); 2.1.0: REGRESSION rejimi — [§7](#7-regression-rejimi-uc-regression1-p08); §1–§6 dagi bir o'lchamli GUM yo'li 2.0.0 dan beri o'zgarmagan, natijalar bit darajasida bir xil). Dvigatel — sof ES modullar. Ular DOM'ga, global brauzer obyektiga va brauzer xotirasiga bog'liq emas (`grep -r "document\|window\|localStorage" src/engine` — bo'sh). Bir xil kod brauzerda, Node'da va (P15) serverda ishlaydi.
> Yaxlitlash dvigatelda **yo'q**: u hisobot qatlamida bajariladi (`src/report/rounding.js`, CLAUDE.md).

```js
// Node (≥ 20.19 / 22.12) yoki brauzer
import { evaluate, monteCarlo, ENGINE_VERSION } from './src/engine/index.js';
import { roundResult } from './src/report/rounding.js';

const r = evaluate(modelSpec);            // → Result | { error, detail }
const rr = roundResult(r.y, r.U, r.roundUp);  // → { Uround, yround, digits, resultText }
```

CommonJS'dan: `require('./src/engine/index.js')` (Node `require(esm)`; `src/engine/package.json` → `"type": "module"`).
Brauzer UI uchun moslik qatlami: `src/js/calc.js` (`<script type="module">`) P00 dagi `window.Calc` API'sini saqlaydi.

## 1. Modullar

| Fayl | Vazifasi | Asosiy manba |
|---|---|---|
| `index.js` | yagona eksport nuqtasi | — |
| `version.js` | `ENGINE_VERSION` (semver) | CLAUDE.md |
| `spec.js` | `normalize(spec)`, `toModel(state)` — modelSpec formatlari | — |
| `evaluate.js` | `evaluate(spec)` — to'liq GUM baholashi | JCGM 100:2008 §4–§6, Annex G |
| `parser.js` | tokenizer → AST → kompilyatsiya; `derivative(ast, x)` simvolik hosila | §4.1, §5.1.3 |
| `sensitivity.js` | c_i (simvolik + sonli o'zaro tekshiruv), 2- va 3-tartibli hosilalar, 5.1.2 Note hadlari | §5.1.2 Note, §5.1.3 |
| `typeA.js` | `typeA`, `typeAx` (1/2/3-usul, ↑/↓), `correlation` | §4.2, §5.2.3 |
| `typeB.js` | taqsimot bo'luvchilari, `typeB`, `valueOrExpr` | §4.3, F.2.2.1 |
| `coverage.js` | `coverage(P, ν, rule)` — k = t_P(ν_eff) | G.3, G.4.1 Note 1 |
| `special.js` | ln Γ, ln B, I_x(a,b), Φ, Φ⁻¹ (Wichura AS241), t-taqsimot CDF/kvantil | A&S 26.5, 26.7 |
| `units.js` | birliklarni tahlil qilish, o'lchamlik vektori, affin °C ↔ K, AST bo'yicha o'lchamlik | GUM-6 §11 (tekshirilmagan) |
| `conformity.js` | MPE bilan muvofiqlik, ko'p nuqtali bir xil k | ISO/IEC 17025 §7.8.6; COOMET §5.7.3 (tekshirilmagan) |
| `montecarlo.js` | `monteCarlo`, `createMonteCarlo` — adaptiv / qat'iy M, intervallar, GUM tekshiruvi, korrelyatsiya (P06), §12 | JCGM 101:2008 §7.7, §7.9, §8 |
| `mc/rng.js` | R(0, 1): kengaytirilgan Wichmann–Hill; `xorshift32` (faqat eski natijani takrorlash) | JCGM 101:2008 C.3.3, Table C.2 |
| `mc/distributions.js` | tanlash: to'g'ri burchakli, egri trapetsiya, trapetsiya, uchburchak, arksinus, Gauss, t, eksponensial, log-normal (unverified), ko'p o'lchovli Gauss (Cholesky) | JCGM 101:2008 §6.4, C.4–C.6 |
| `mc/legacy.js` | ENGINE ≤ 2.5.0 dagi MCM — o'zgarishsiz (audit izi) | — |
| `regression/index.js` | `evaluateRegression(spec)` — REGRESSION rejimi (P08), §7 | JCGM 100:2008 H.3; QUAM:2012 E.4 |
| `regression/fit.js`, `linalg.js` | polinom (1–3-daraja) OLS / WLS / GLS — oqartirish + Householder QR | H.3.2 Eq. (H.13); QUAM Eq. (E3.4) |
| `regression/wtls.js` | to'g'ri chiziq, u(x_i) va u(y_i) (iterativ WTLS) | York et al. 2004 (repoda yo'q — unverified) |
| `regression/predict.js` | to'g'ri bashorat Y(x), teskari bashorat x̂₀ | H.3.4 Eq. (H.15); QUAM Eq. (E3.2)–(E3.5) |
| `regression/chi2.js` | χ² CDF va kvantil (model yaroqliligi testi) | A&S 6.5.29, 6.5.31, 26.4 |
| `regression/urange.js` | "U — diapazon" ifodasi | ILAC P14 (repoda yo'q — unverified) |
| `topdown/index.js` | `evaluateTopDown(spec)` — TOP_DOWN rejimi (P09), §8; X11 / X12 ogohlantirishlari | Nordtest TR 537 ed. 4 §3.2; QUAM:2012 §7.6, §7.7, §7.9 |
| `topdown/scale.js` | nisbiy / mutlaq shkala nazorati (`unit` yoki `relative: true`), birlik o'tkazish | Nordtest TR 537 §4.3 |
| `topdown/rw.js` | u(R_w): nazorat namunasi qatori, dublikatlar, nazorat chegaralari, tayyor s / CV | Nordtest TR 537 §5, Appendix 5–6 |
| `topdown/bias.js` | u(bias): CRM, PT raundlari, recovery (RMS) | Nordtest TR 537 §6, Appendix 4 |
| `topdown/recovery.js` | R_m, u(R_m), t-test, tuzatilgan / tuzatilmagan | QUAM:2012 A4; §7.7.8–7.7.9, §7.16 |
| `topdown/reproducibility.js` | s_R asosida; laboratoriya s_r tekshiruvi, u(δ̂) | QUAM:2012 §7.6, A6; Nordtest §7; ISO 21748 (repoda yo'q — unverified) |
| `topdown/level.js` | u(x) = √(s₀² + (x·s₁)²), s₀ va s₁ ni aniqlash | QUAM:2012 E.5.2.1 Eq. [1], E.5.5.2 |
| `sampling/index.js` | `evaluateSampling` — dublikat usuli, klassik va robust ichma-ich ANOVA, U′, ᶠU (P10), §9.1 | EURACHEM/CITAC UfS:2019 §9.4–9.5, A1, A2 |
| `qualitative/index.js` | `evaluateQualitative` — 2×2 jadval, SS, SP, LR, posterior, Wilson va Clopper–Pearson (P10), §9.2 | EURACHEM/CITAC AQA:2021 §3.2, §4.2–4.4 |
| `micro/index.js` | `evaluateMicro` — log₁₀ sanoq: texnik, matritsa, Puasson (P10, **BETA**), §9.3 | ISO 19036 (repoda yo'q — unverified) |
| `medical/index.js` | `evaluateMedical` — IQC darajalari: u = √(u_cal² + u_Rw²) (P10, **BETA**), §9.4 | ISO/TS 20914 (repoda yo'q — unverified) |
| `linter/index.js`, `linter/rules/*.js` | `lint(spec, result, ctx)` — metrologik linter: X1–X12, A1–A4, M1, D1, W1, W2 (P05a, P05b); M2–M4 — Monte-Karlo natijasi uchun (P06), §10, §12 | [LINTER_RULES.md](LINTER_RULES.md) |
| `util.js` | `toNum`, `isBlank`, `pairKey` | — |

Bog'liqlik: `engine` hech narsaga bog'liq emas. `report → engine` (faqat natija maydonlari), `ui → report, engine`.

## 2. Kirish: `modelSpec`

REGRESSION rejimi alohida format bilan beriladi — `uc-regression/1` (§7); `evaluate()` uni `evaluateRegression()` ga uzatadi. TOP_DOWN rejimi — `uc-topdown/1` (§8), `evaluateTopDown()`. Maxsus rejimlar (P10) — `uc-sampling/1`, `uc-qualitative/1`, `uc-micro/1`, `uc-medical/1` (§9). Quyidagi uch ko'rinish — bir o'lchamli GUM baholashi uchun (`spec.js::normalize`):

1. **`uc-model/1`** — kanonik format (P04 shablon interpreteri shuni yaratadi);
2. **`{ format: 'calc-state/v2', state }`** — UI holati (`uc_state_v2`), test misollari (`tests/cases/**.json`);
3. **format maydonisiz** `state` obyekti — P00 dagi `Calc.evaluate(state)` bilan moslik.

```js
/**
 * @typedef {Object} ModelSpec            // format 'uc-model/1'
 * @property {'uc-model/1'} format
 * @property {OutputSpec[]} outputs       // bitta element — bir o'lchovli natija (o'zgarmagan); bir nechta — vektor natija (§13)
 * @property {InputSpec[]} inputs
 * @property {('↑'|'↓'|'')[]} [directions] // qatorlar bo'yicha o'qish yo'nalishi (barcha kirishlar uchun umumiy)
 * @property {TypeBSpec[]} [typeB]
 * @property {Object<string, number>} [covB]  // B tur kovariatsiyalar: { 'a|b': u(a,b) }
 * @property {Settings} [settings]
 *
 * @typedef {Object} OutputSpec
 * @property {string} formula             // "ρ = m / V" yoki "m / V"; bitta kirish bo'lsa bo'sh bo'lishi mumkin
 * @property {string} [unit]              // natija birligi ("g/cm³")
 *
 * @typedef {Object} InputSpec
 * @property {string} name
 * @property {string} [unit]              // ixtiyoriy; berilsa o'lchamlik tekshiriladi
 * @property {(number|string)[]} observations   // kuzatuvlar (bitta qiymat — o'zgarmas/etalon qiymat)
 * @property {{method?:1|2|3, sp?:number, nup?:number, directional?:boolean}} [typeA]
 *
 * @typedef {Object} TypeBSpec
 * @property {string} name
 * @property {string} input               // qaysi kirishga tegishli (calc-state da: `param`)
 * @property {number|string} halfWidth    // yarim kenglik a yoki kirish o'rtachalaridan ifoda ("0.0002*I + 0.002")
 * @property {'rect'|'normal'|'triang'|'ushape'|'resol'} distribution
 * @property {number} [k]                 // normal uchun bo'luvchi (standart 2)
 * @property {number} [nu]                // erkinlik darajasi (bo'sh — ∞, GUM G.4.2)
 * @property {number} [sensitivity]       // birlik o'tkazuvchi ko'paytuvchi (model c_i dan ALOHIDA)
 * @property {string} [unit]
 *
 * @typedef {Object} Settings
 * @property {number} [P=0.9545]          // qamrov ehtimoli
 * @property {'nu'|'k2'} [kMethod='nu']   // 'nu' — t_P(ν_eff); 'k2' — k = 2 qat'iy (EA-4/02 §5)
 * @property {'floor'|'interpolate'|'exact'} [nuRule='floor']  // ν_eff kasr bo'lsa (GUM G.4.1 Note 1)
 * @property {boolean} [paired=true]      // juftlangan qatorlardan korrelyatsiya (GUM 5.2.3)
 * @property {boolean} [secondOrder=false]// 5.1.2 Note dagi 2-tartibli hadlarni u_c ga qo'shish
 * @property {number} [nonlinThreshold=0.01] // nochiziqlilik indeksi chegarasi (ogohlantirish)
 * @property {'error'|'value'|'unknown'} [modelKind='unknown']  // model natijasi: xato E = X − X_ref | qiymat Y (nominal bilan) — §10
 * @property {number|string} [nominal]    // modelKind = 'value' uchun nominal
 * @property {string|number} [mpe]        // MPE (son yoki ifoda) — muvofiqlik; byudjetga KIRMAYDI
 * @property {number} [range]             // keltirilgan xato uchun diapazon
 * @property {number} [cmc]               // U < CMC → ogohlantirish
 * @property {'normal'|'up'} [rounding]   // faqat hisobot qatlami uchun uzatiladi (result.roundUp)
 */
```

`calc-state/v2` (`uc_state_v2`) ↔ `uc-model/1` moslik: `params` ↔ `inputs[].name`, `measurements[p]` ↔ `inputs[].observations`, `settings.typeA[p]` ↔ `inputs[].typeA`, `typeB[].param` ↔ `typeB[].input`, `model` ↔ `outputs[0]`, ixtiyoriy `units[p]` ↔ `inputs[].unit`. O'tkazish: `toModel(state)`.

## 3. Chiqish: `Result`

```js
/**
 * @typedef {Object} Result
 * @property {string} engineVersion       // '2.0.0'
 * @property {OutputResult[]} outputs     // hozir bitta element; yuqori darajadagi y, uc, … — outputs[0] bilan bir xil
 * @property {number} y                   // natija bahosi (yaxlitlanmagan)
 * @property {number} uc                  // yig'indi standart noaniqlik
 * @property {number} uc2                 // u_c² (secondOrder.included bo'lsa — 2-tartibli hadlar bilan)
 * @property {number} uc2FirstOrder       // faqat 1-tartibli hadlar (GUM Eq. 10/13)
 * @property {number} nuEff               // Welch–Satterthwaite (∞ bo'lishi mumkin; P03 dan cap yo'q)
 * @property {number} k                   // qamrov koeffitsiyenti
 * @property {number} U                   // kengaytirilgan noaniqlik (yaxlitlanmagan)
 * @property {Coverage} coverage
 * @property {InputResult[]} inputs       // x̄, s, u_A, u_B, u, c, cMethod, ν, …
 * @property {PairResult[]} pairs         // r, kovariatsiyalar, 2·c_i·c_j·u(x_i,x_j)
 * @property {BudgetRow[]} budget         // kind: 'A' | 'B' | 'corr' | 'second'; contrib, share (%)
 * @property {SecondOrder|null} secondOrder
 * @property {{checked:boolean, output:string|null}} units   // o'lchamlik tahlili (output — masalan 'L^-3·M')
 * @property {Finding[]} findings         // P05a: linter topilmalari (§10)
 * @property {'error'|'value'|'unknown'} modelKind, {number|null} nominal, {number|null} deviation   // og'ish: E yoki Y − Y_nom; ko'rsatilmagan — null
 * @property {{code:string, param?:string, value?:any}[]} warnings   // DEPRECATED (2.4.0): findings dan foydalaning; bir versiya davomida qoladi
 * @property {{code:string}[]} notes      // ma'lumot (masalan units_unchecked)
 * @property {Object|null} conf           // { mpe, ratio, simple, guarded, pending? } — oddiy/himoyalangan qabul; model turi (yoki nominal)
 *                                        //   ko'rsatilmagan bo'lsa simple = guarded = 'na', pending = 'model_kind' | 'nominal'
 * @property {number|null} gamma          // keltirilgan xato, % (= |deviation| / range · 100; deviation yo'q bo'lsa null)
 * @property {Object|null} verify         // GUM H.2, 2-yondashuv: u_A to'g'ridan-to'g'ri va formula bo'yicha
 * @property {boolean} roundUp            // hisobot qatlami uchun: settings.rounding === 'up'
 * @property {string} symbol, formulaText, unit, kMethod, nuRule
 * @property {number} P, ucNoCorr, corrEffectPct, relUc, relU
 *
 * @typedef {Object} Coverage
 * @property {'t'|'normal'|'k2'} method   // ν = ∞ → 'normal' (aniq Φ⁻¹)
 * @property {'floor'|'interpolate'|'exact'} nuRule
 * @property {number} nuUsed              // k uchun ishlatilgan ν (floor: ⌊ν_eff⌋, ν < 1 → 1)
 * @property {number} P
 *
 * @typedef {Object} SecondOrder          // JCGM 100:2008 §5.1.2 Note
 * @property {number} u2                  // Σ_i Σ_j [½(∂²f/∂x_i∂x_j)² + ∂f/∂x_i·∂³f/∂x_i∂x_j²]·u²(x_i)·u²(x_j)
 * @property {number} index               // u2 / u_c²(1-tartibli)
 * @property {number} threshold
 * @property {boolean} included           // settings.secondOrder
 * @property {boolean} validCondition     // kirishlar korrelyatsiyasiz (manbadagi shart; normal taqsimot — foydalanuvchi mas'uliyati)
 * @property {boolean} numeric            // simvolik hosila cheksiz bo'lib, sonli zaxira ishlatilganmi
 * @property {{a:string, b:string, value:number}[]} terms
 */
```

Xato: `{ error, detail? }`. Kodlar: `need_formula`, `bad_formula`, `need_data`, `formula_eval`, `bad_halfwidth`, `bad_mpe`, **`negative_variance`** (P03), **`bad_correlation`** (|r| > 1 yoki u = 0 kirishga kovariatsiya; P03), **`unit_mismatch`**, **`unit_fn_arg`** (P03), **`multi_output`** (P07 gacha), `bad_spec`.

Ogohlantirishlar (`warnings[].code`; UI matni `w_<code>`, uch tilda): `zero_s`, `n_small`, `dir_missing`, `sp_missing`, `coomet_small`, `below_cmc`, `zero_u` (P00) va P03 da qo'shilganlari — `c_zero`, `c_nan`, `c_numeric`, `c_mismatch`, `nonlinear`, `nu_lt1`, `unit_affine`, `unit_pow`, `unit_output`, `unit_budget`. Eslatmalar (`notes`, `n_<code>`): `units_unchecked`, `units_partial`.

## 4. Metrologik qoidalar (qisqa)

- **c_i** — AST bo'yicha simvolik hosila, x̄ da baholanadi; sonli markaziy ayirma (h = ε^⅓·max(|x_i|, u(x_i))) bilan o'zaro tekshiriladi (`c_mismatch`); simvolik cheksiz/NaN → sonli (`c_numeric`); ikkalasi ham bo'lmasa c = 0 (`c_nan`); c = 0 → `c_zero`.
- **k** — egasi qarori Q-1(a): har doim t_P(⌊ν_eff⌋); ν_eff = ∞ → aniq normal kvantil (AS241). Normal kvantilga o'tish chegarasi yo'q. t-kvantil: ν < 2000 — to'liqmas beta funksiyasini teskari yechish; ν ≥ 2000 — Cornish–Fisher yoyilmasi (A&S 26.7.5, qoldiq < 3·10⁻¹⁵). Bu chegara usul almashinuvi, natija uzluksiz (test).
- **ν_eff** — Welch–Satterthwaite, har bir A va B komponent alohida had; B tur ν ko'rsatilmasa ∞ (G.4.2). Excel ν_B = 10⁹ konventsiyasi qo'llanmaydi (D-03, Q-2).
- **2-tartibli hadlar** — faqat diagnostika (indeks > `nonlinThreshold` → `nonlinear`); `secondOrder: true` bo'lsa u_c² ga qo'shiladi va byudjetda `kind: 'second'` qatori chiqadi.
- **Birliklar** — kirishlarning birligi berilmasa tekshiruv o'tkazilmaydi (`units_unchecked`). Berilsa: + / − da o'lchamlik mos kelmasa — xato; c·u(x) o'lchamligi mos kelmasa (B manba birligi ≠ kirish birligi, ko'paytuvchi 1) — `unit_budget`; natija birligi model formulasiga mos kelmasa — `unit_output`.
- **Manfiy dispersiya / |r| > 1** — xato (P00 da jimgina 0 ga kesilardi).

## 5. Hisobot qatlami (`src/report/`)

`roundResult(y, U, mode)` — U ko'pi bilan 2 qiymatli raqam (yuqoriga yaxlitlashdan keyin ham: 0,0999 → **0,10**), y — round half away from zero (−0,125 → **−0,13**), U ning oxirgi xonasigacha. `roundHalfAway`, `roundUpAway` — Excel ROUND/ROUNDUP bilan mos (15 qiymatli raqamgacha ikkilik xatoni tuzatadi). `format.js` — `fmt`, `fmtSci`.

Saqlangan eski natijalar (`uc_state_v2.combined`, `points[].result`, ENGINE 1.0.0) dagi `Uround`, `yround`, `resultText` e'tiborsiz qoldiriladi — hisobot ularni `y`, `U`, `roundUp` dan qayta yaxlitlaydi.

## 6. Tekshiruv

`npm test`: `tests/engine/*.test.js` (kvantillar — mpmath va GUM Table G.2; simvolik hosila; 2-tartibli hadlar; birliklar; yaxlitlash; API va tozalik), `tests/run-cases.test.js` (manba misollari), `tests/security/static.test.js` (dvigatel xeshi `tests/security/engine.sha256.json` — o'zgarsa `ENGINE_VERSION`/CHANGELOG, keyin `node tests/tools/engine-hash.js --write`).

## 7. REGRESSION rejimi: `uc-regression/1` (P08)

Kalibrlash egri chizig'i y = a + b·θ [+ c·θ² + d·θ³], θ = x − x_ref. `evaluate(spec)` yoki `evaluateRegression(spec)`. Natija **yaxlitlanmaydi** (hisobot bo'limi — `src/js/report.js::regressionSection`).

```js
/**
 * @typedef {Object} RegressionSpec
 * @property {'uc-regression/1'} format
 * @property {'OLS'|'WLS'|'WTLS'|'GLS'} [method='OLS']
 * @property {{degree?:1|2|3, xRef?:number}} [model]   // WTLS — faqat degree = 1
 * @property {{x:number|string, ux?:number, y:number|string, uy?:number}[]} points   // "0,5" (o'nlik vergul) qabul qilinadi
 * @property {number[][]} [covY]            // GLS: y_i kovariatsiya matritsasi (m × m, simmetrik, musbat aniqlangan)
 * @property {{x?:string, y?:string}} [units]
 * @property {Object} [settings]
 *   @property {number} [settings.P=0.9545]     // bashoratlar uchun qamrov ehtimoli (k = t_P(ν))
 *   @property {'floor'|'interpolate'|'exact'} [settings.nuRule='floor']
 *   @property {number} [settings.chi2P=0.95]   // χ² testi ehtimoli
 *   @property {'prior'|'posterior'} [settings.sigma]  // kovariatsiya asosi (berilmasa — avtomatik, pastga qarang)
 *   @property {number} [settings.uy]           // OLS: barcha y_i uchun umumiy u(y)
 * @property {{x:number}[]} [predict]       // to'g'ri bashorat
 * @property {{y0:number|number[], p?:number, uy0?:number, nuY0?:number}[]} [inverse]  // teskari bashorat
 * @property {{points:{x:number,U:number}[], mode?:'linear'|'max'}} [uRange]           // "U — diapazon" (unverified)
 *
 * @typedef {Object} RegressionResult
 * @property {string} engineVersion, {'REGRESSION'} mode, {'uc-regression/1'} format
 * @property {string} method, {number} degree, xRef, m, nParam, nu      // ν = m − n_param
 * @property {{name:'a'|'b'|'c'|'d', value:number, u:number}[]} params
 * @property {number[][]} covariance, correlation
 * @property {'prior'|'posterior'} covarianceBasis
 * @property {number[]} fitted, residuals, weightedResiduals
 * @property {number} ssr, s                 // s: OLS — qoldiq standart og'ishi (y birligida); vaznli — √(χ²/ν)
 * @property {{applicable:boolean, obs:number|null, nu:number, P:number, crit:number|null, pValue:number|null, pass:boolean|null}} chi2
 * @property {{x, y, u, nu, k, U, extrapolated}[]} predictions
 * @property {({y0, p, uy0, uy0Source:'given'|'residual'|'common', x0, u, nu, k, U, components:{y0, calibration}, extrapolated} | {y0, p, error, detail?})[]} inverse
 * @property {{mode, a, b, shift, range, points, unverified:true}|{error}|null} uRange
 * @property {{iterations:number, adjustedX:number[]}|null} wtls
 * @property {{code:string, severity:'info'|'warning', ref:string, value?:string}[]} warnings
 */
```

**Usullar.**

| Usul | Minimallashtiriladi | Manba |
|---|---|---|
| OLS | Σ(y_i − ŷ_i)² | JCGM 100:2008 H.3.2, Eq. (H.13a)–(H.13g) |
| WLS | Σ(y_i − ŷ_i)²/u²(y_i) | EURACHEM/CITAC QUAM:2012 E.4.3, Eq. (E3.4) |
| GLS | (y − Ap)ᵀV⁻¹(y − Ap) | Aitken (1935); ISO/TS 28037 §10 pullik — **unverified** |
| WTLS | ΣW_i(y_i − a − bθ_i)², W_i = 1/[u²(y_i) + b²u²(x_i)] (iterativ) | York et al., Am. J. Phys. 72 (2004) 367, Eq. (13); Krystek & Anton (2007); ISO/TS 28037 §7 pullik — **unverified** |

**Kovariatsiya asosi** (`covarianceBasis`, hisobotda yoziladi):

- `posterior` — cov(p) = s²·(AᵀV⁻¹A)⁻¹, s² = χ²/ν (GUM H.13c–f; QUAM E3.4). Standart holat: OLS, u(y) berilmagan. Bashoratlarda ν = m − n (H.3.4).
- `prior` — cov(p) = (AᵀV⁻¹A)⁻¹, kiritilgan noaniqliklardan; χ² testi bajariladi. Standart holat: WLS, WTLS, GLS va OLS (umumiy u(y) berilgan). Bashoratlarda ν = ∞ (yoki `nuY0` bilan Welch–Satterthwaite).

**χ² testi** (faqat u(y) ma'lum bo'lganda): χ²_obs ≤ χ²_P(ν), P = 0,95. Yiqilsa — `warnings[]` da `regression_chi2_fail`. OLS (u(y) noma'lum) da χ²/ν ≡ 1 — test qo'llanmaydi (`chi2.applicable = false`, `regression_chi2_na`).

**Teskari bashorat** (to'g'ri chiziq): x̂₀ = x_ref + (y₀ − a)/b, u²(x̂₀) = [u²(y₀) + u²(a) + θ₀²u²(b) + 2θ₀·cov(a, b)]/b² (QUAM Eq. E3.3; OLS da u²(y₀) = s²/p → Eq. E3.5, A5 dagi c₀ formulasi). u(y₀): berilgan `uy0`; OLS-posterior da s/√p; OLS + umumiy u(y) da u(y)/√p; boshqa hollarda **xato** `regression_need_uy0` (0 deb olinmaydi). Polinomda f(θ₀) = y₀ kalibrlash diapazonida sonli yechiladi.

*Eslatma:* GUM H.3 misolining o'zi **to'g'ri** bashorat (b(30 °C) va u_c); teskari bashorat formulasi QUAM E.4 dan, noaniqlikning tarqalish qonuni (GUM 5.2.2) va H.3.4 dagi kovariatsiyadan foydalanish tamoyili bilan.

**Xato kodlari** (`{error, detail}`; teskari bashoratda — `inverse[i].error`): `regression_too_few_points` (m < n_param + 1), `regression_x_degenerate` (har xil x soni < n_param — vertikal chiziq), `regression_zero_u` (WLS/GLS da u = 0 yoki bo'sh; WTLS da u(x) = u(y) = 0; `detail` — qator), `regression_bad_data`, `regression_bad_method`, `regression_bad_degree`, `regression_bad_covariance`, `regression_no_convergence`, `regression_need_uy`, `regression_need_uy0`, `regression_slope_zero` (|b| ≤ u(b)), `regression_inverse_no_root`, `regression_inverse_ambiguous`, `urange_too_few_points`, `urange_bad_data`, `urange_x_degenerate`, `urange_nonpositive`, `urange_bad_mode`.

**Ogohlantirishlar** (`warnings[]`, har birida `{code, severity, ref}`; UI matni `w_<code>`, uch tilda; P05 da linter qoidalariga ko'chiriladi): `regression_chi2_fail`, `regression_slope_weak` (|b| < 3u(b), GUM H.3.3), `regression_extrapolation`, `regression_ux_ignored`, `regression_uy_unequal`, `regression_inverse_failed` (warning); `regression_chi2_na`, `regression_posterior_scale`, `regression_method_unverified` (WTLS, GLS), `urange_unverified`, `urange_shifted` (info).

**"U — diapazon"** (`uRangeFunction(points, mode)`): `linear` — (|X_j|, U_j) bo'yicha OLS chizig'i, barcha nuqtalarda U(X_j) ≥ U_j bo'ladigan qilib yuqoriga surilgan; `max` — U = max U_j. Diapazondan tashqarida qiymat berilmaydi. **Unverified** (ILAC P14 PDF repoda yo'q) — natijada `unverified: true` va hisobotda belgi.

Testlar: `tests/cases/jcgm100/jcgm100-h3.json`, `tests/cases/quam/quam-a5-calibration.json` (verified), `tests/cases/regression/york-pearson-wtls.json` (unverified), `tests/engine/regression.test.js`, `tests/engine/regression-wtls.test.js`.

## 8. TOP_DOWN rejimi: `uc-topdown/1` (P09)

Validatsiya va sifat nazorati ma'lumotlaridan noaniqlik. `evaluate(spec)` yoki `evaluateTopDown(spec)`. Natija **yaxlitlanmaydi** (hisobot bo'limi — `src/js/report.js::topdownSection`).

**Shkala qoidasi.** Har bir kattalikda `unit` (mutlaq) **yoki** `relative: true` (nisbiy) bo'ladi. Bitta baholashda barcha hissalar bitta shkalada (`spec.scale`). Boshqa shkaladagi qiymat jimgina o'tkazilmaydi — xato `topdown_mixed_scale`; ikkalasi ham yo'q — `topdown_need_scale` (Nordtest TR 537 §4.3, p. 14). Xom ma'lumot (nazorat namunasi qatori, dublikatlar, sertifikat va PT qiymatlari) `unit` bilan beriladi va nisbiy baholashda o'z o'rtachasiga / tayanch qiymatiga nisbatan olinadi. Nisbiy qiymatlar `relativeUnit` birligida: `'%'` (standart) yoki `'1'` (ulush). Mutlaq birliklar mos o'lchamlikda bo'lsa o'tkaziladi (`mg/L` → `µg/L`), aks holda `topdown_unit_mismatch`. Mutlaq va nisbiy hissa aniq birlashtiriladigan yagona joy — `LEVEL_DEPENDENT` (x orqali).

```js
/**
 * @typedef {Object} TopDownSpec
 * @property {'uc-topdown/1'} format
 * @property {'NORDTEST'|'QUAM_RECOVERY'|'REPRODUCIBILITY'|'LEVEL_DEPENDENT'} approach
 * @property {{relative:true}|{unit:string}} scale       // baholash shkalasi
 * @property {'%'|'1'} [relativeUnit='%']
 * @property {boolean} [isEmpiricalMeasurand=false]     // usul bias'i ta'rif bo'yicha 0 (QUAM §7.9.2)
 * @property {{value:number, unit:string}} [measurement] // y (ixtiyoriy; LEVEL_DEPENDENT da majburiy)
 * @property {{components:RwComponent[], covers?:string[]}} [rw]        // NORDTEST, QUAM_RECOVERY
 * @property {BiasSpec} [bias]                           // NORDTEST
 * @property {{mean?,s?,n?,values?:number[],correction?:'applied'|'not_applied',P?:number,referenceMethod?:'same'|'other'}} [recovery]   // QUAM_RECOVERY
 * @property {{sR?,R?,sr?,r?,relative?|unit?,covers?:string[],pLabs?,nRep?}} [reproducibility]   // REPRODUCIBILITY (R, r — chegaralar: s = chegara/2,8)
 * @property {{s?,n?,values?,relative?|unit?,P?,adjust?:boolean}} [labRepeatability]   // unverified
 * @property {{include?:boolean,uDelta?,relative?|unit?,referenceMethod?:'same'|'other'}} [methodBias]   // unverified
 * @property {{s0:{value,unit}, s1:{value,relative:true}} | {points:{x,u}[], unit}} [levelModel]   // LEVEL_DEPENDENT
 * @property {{id?,name?,category?,u?,sensitivity?,uParam?,relative?|unit?}[]} [additional]   // gibrid: asos QAMRAMAGAN omillar
 * @property {{k?:number, P?:number, rounding?:'normal'|'up'}} [settings]   // k standart 2; P (standart 0,9545) — faqat t_P(⌊ν_eff⌋) taklifi uchun
 *
 * RwComponent (type):
 *   control_series  { values[], unit | relative:true }          u = s (mutlaq) yoki F·s/x̄ (nisbiy)
 *   duplicates      { pairs[[x1,x2]…], unit, relativeMethod? }  s = √(Σd²/(2n)); nisbiy: 'per_pair' | 'pooled_over_mean'
 *   control_limits  { limit, sigmas=2, unit | relative:true }   u = limit / sigmas
 *   stated          { s, n?, unit | relative:true }             tayyor s yoki CV
 * BiasSpec: { type:'crm'|'pt'|'recovery', relative:true | unit, referenceMethod?:'same'|'other', … }   // referenceByMethod: true — 'same' ning eski ko'rinishi
 *   crm      items[{ bias | (certified, mean), uRef | (certified, U, k=2), sBias, n }]
 *   pt       rounds[{ bias | (assigned, result), uRef | (U, k=2) | (sR, nLab) }], robust?, uRef?
 *   recovery recoveries[], uRef | uRefComponents[{u}]
 *
 * @typedef {Object} TopDownResult
 * @property {string} engineVersion, {'TOP_DOWN'} mode, {'uc-topdown/1'} format
 * @property {string} approach, approachRef        // yondashuv nomi va manbasi (hisobotda yoziladi)
 * @property {boolean} hybrid, isEmpiricalMeasurand
 * @property {'relative'|'absolute'} scale, {string} unit, relativeUnit   // uc va U birligi
 * @property {number|null} y, {string} yUnit, {number|null} yCorrected    // yCorrected — y·F/R_m (tuzatish qo'llansa)
 * @property {number} uc, uc2, k, U                 // baholash shkalasida, yaxlitlanmagan
 * @property {number} nuEff, {number|null} kSuggested, {number} P   // ν_eff (Welch–Satterthwaite) — faqat ma'lumot; kSuggested = t_P(⌊ν_eff⌋), ν_eff < 30 bo'lsa; k O'ZGARMAYDI
 * @property {number|null} relUc, relU              // har doim foizda (mutlaq baholashda — y berilgan bo'lsa)
 * @property {number|null} absUc, absU, {string} absUnit   // mutlaq (nisbiy baholashda — y berilgan bo'lsa)
 * @property {{u, nu, components:{type,id,u,n,nu,mean,s,ref}[]}|null} rw
 * @property {{type,u,rms,uRef,sMean,n,items:{id,bias,uRef}[],formula:'single_crm'|'rms',meanBias?,nu,included,referenceMethod}|null} bias
 * @property {{Rm,s,n,nu,uRm,t,tCrit,P,significant,correction,u,biasFraction,included}|null} recovery
 * @property {{sR,sr,sRUsed,lab:{s,n,nu,ratio,chi2,chi2Crit,P,pass,adjusted}|null,uDelta,unverified:string[]}|null} reproducibility
 * @property {{s0,s1,x,constant,proportional,u,fit}|null} level
 * @property {{id,name,category,u,doubleCounted}[]} additional, {string[]} covers
 * @property {{id,kind,u,nu,variance,share,included,flag?:'X11'|'X12',name?,category?}[]} budget
 * @property {{code,severity:'info'|'warning',ref,rule?:'X11'|'X12',value?}[]} warnings
 */
```

**Yondashuvlar.**

| `approach` | Formula | Manba | Holat |
|---|---|---|---|
| `NORDTEST` | u_c = √(u(R_w)² + u(bias)²); u(bias) = √(RMS_bias² + u(C_ref)²); bitta CRM: √(bias² + (s_bias/√n)² + u(C_ref)²) | Nordtest TR 537 ed. 4 §3.2 (p. 10), §5 (pp. 15–18), §6 (pp. 19–23), Appendix 4–6 | **verified** |
| `QUAM_RECOVERY` | R_m, u(R_m) = s/√n; t = \|1 − R_m\|/u(R_m) ≥ t_crit(n − 1; 95 %) → ahamiyatli; tuzatish qo'llansa hissa u(R_m)/R_m va y/R_m, qo'llanmasa u(R_m) | QUAM:2012 Example A4 (pp. 65–68); §7.7.8–7.7.9, §7.16 | **verified** |
| `REPRODUCIBILITY` | u_c = √(s_R² + Σu_i²); s_R = R/2,8 | QUAM:2012 §7.6 (p. 18), Example A6 (pp. 84–86); Nordtest §7 (pp. 24–25) | **verified** |
| ↳ laboratoriya s_r tekshiruvi (χ²), s_R′² = s_R² − s_r² + s_lab², u(δ̂) = √((s_R² − (1 − 1/n)s_r²)/p) | | ISO 21748 (pullik, repoda yo'q) | **unverified** (`topdown_unverified`) |
| `LEVEL_DEPENDENT` | u(x) = √(s₀² + (x·s₁)²); s₀ = √c, s₁ = √m (u² = m·x² + c) | QUAM:2012 E.5.2.1 Eq. [1] (p. 117), E.5.5.2 (p. 119) | formula manbadan; manbada raqamli misol yo'q |

**Gibrid** (`additional[]`): har qanday yondashuvga asos **qamramagan** omillar qo'shiladi — tayyor `u` yoki `|sensitivity|·uParam` (QUAM Table A6.3, Note 4). Har bir hissada `category` (`TOPDOWN_CATEGORIES`).

**Empirik kattalik** (`isEmpiricalMeasurand: true`, QUAM §7.9): usul bias'i ta'rif bo'yicha 0. Noaniqlik s_R / u(R_w) va rejim parametrlari (`temperature`, `time`, `speed`) bardoshliligi hissalaridan. `bias`, `recovery` yoki `methodBias` berilsa, **"tayanch qiymat qaysi usul bilan olingan"** savoliga javob (`referenceMethod`) hal qiladi (egasi qarori 2026-11-17, R-20):

| `referenceMethod` | Hissa | Ogohlantirish | Asos |
|---|---|---|---|
| berilmagan | u_c ga **qo'shiladi** (konservativ); byudjetda `flag: 'X12'` | `x12_empirical_bias` (warning) | javob majburiy |
| `'other'` — boshqa usul / ta'rif | chiqarib tashlanadi (`included: false`, `flag: 'X12'`) | `x12_bias_excluded` (info) | QUAM §7.9.2 |
| `'same'` — shu usul (yoki `referenceByMethod: true`) | qo'shiladi | — | QUAM §7.9.3 |

**X11 va X12** (P05 linteri yo'qligi sababli hozircha shu modulning `warnings[]` da; P05 da linterga ko'chiriladi):

| Kod | `rule` | Qachon | Hisobga ta'siri |
|---|---|---|---|
| `x11_double_counting` | X11 | qo'shimcha hissa toifasi asos qamragan toifalar ichida: `repeatability`, `intermediate_precision` (har doim), `reproducibility` (s_R), `reference_material` (bias hisobga kirgan bo'lsa), `recovery`, hamda `rw.covers[]` / `reproducibility.covers[]` | hissa hisobda qoladi (qaror foydalanuvchida), byudjetda `flag: 'X11'` |
| `x12_empirical_bias` | X12 | empirik kattalikda bias / recovery / u(δ̂) berilgan, `referenceMethod` ko'rsatilmagan | hissa u_c ga **qo'shiladi** (konservativ) |
| `x12_bias_excluded` (info) | X12 | empirik kattalik, `referenceMethod: 'other'` | hissa u_c ga kirmaydi |

**Boshqa ogohlantirishlar:** `topdown_no_bias` (NORDTEST da bias berilmagan, kattalik empirik emas — Nordtest §6), `topdown_few_pt_rounds` (< 6 raund — §6.2), `topdown_bias_significant` (R_m ahamiyatli farq qiladi, tuzatish qo'llanmagan — QUAM §7.7.9, §7.16.2), `topdown_sr_check_failed`, `topdown_nu_low` (ν_eff < 30), `zero_u` (warning); `x12_bias_excluded`, `topdown_unverified`, `topdown_level_few` (info). UI matni `w_<code>`, uch tilda (`src/js/i18n-topdown.js`).

**Xato kodlari** (`{error, detail}`; `detail` — maydon yo'li): `topdown_bad_spec`, `topdown_bad_approach`, `topdown_bad_data` (qiymat yo'q yoki son emas — bo'sh maydon 0 deb olinmaydi), `topdown_mixed_scale`, `topdown_need_scale`, `topdown_unit_mismatch`, `topdown_zero_mean`, `topdown_too_few`, `topdown_need_rw`, `topdown_need_bias`, `topdown_need_uref`, `topdown_need_recovery`, `topdown_need_reproducibility`, `topdown_need_level`, `topdown_level_fit_negative`.

**k va ν_eff** (egasi qarori 2026-11-17). Standart k = 2 (Nordtest §3.2, 6-qadam; QUAM A6); hisobotda "k = 2, P ≈ 95 %". Boshqa qiymat — `settings.k`. ν_eff **ma'lumot uchun** hisoblanadi (JCGM 100:2008 G.4.1 Eq. G.2b): ν_eff = u_c⁴ / Σ(u_i⁴/ν_i), bunda ν(R_w) — manbalari bo'yicha Welch–Satterthwaite (nazorat qatori n − 1; dublikatlar — juftliklar soni; tayyor s — n − 1 yoki ∞; chegaralar — ∞), ν(bias) = N − 1 (PT raundlari / CRM lar / recovery soni; bitta CRM — o'lchashlar soni − 1; kamida 1), recovery R_m — n − 1, qolganlari ∞; chiqarilgan hissalar kirmaydi. ν_eff < 30 (`NU_EFF_WARN_BELOW`) bo'lsa — `topdown_nu_low` va `kSuggested = t_P(⌊ν_eff⌋)` (P = `settings.P`, standart 0,9545). **k avtomatik o'zgarmaydi.**

Testlar: `tests/cases/nordtest/*.json` (6 ta verified), `tests/cases/quam/quam-a4-recovery.json`, `quam-a6-empirical.json` (verified), `tests/engine/topdown.test.js`, `tests/ui/topdown.test.js`, `tests/ui/topdown-app.test.js`, `tests/templates/topdown.test.js`.

## 9. Maxsus rejimlar (P10)

To'rt mustaqil modul; har biri o'z formati bilan, `evaluate(spec)` formatga qarab uzatadi. Natijalar **yaxlitlanmaydi** (hisobot — `src/js/report.js::specialSection`). Har birida `{engineVersion, mode, format, approach, approachRef, warnings[{code, severity, ref}]}`; xato — `{error, detail}`.

### 9.1. Namuna olish: `uc-sampling/1` — verified

Dublikat usuli, muvozanatli dizayn: n ob'ekt × 2 namuna × 2 tahlil (UfS:2019 §9.4–9.5).

```js
/** @typedef {Object} SamplingSpec
 * @property {'uc-sampling/1'} format
 * @property {({id?:string, values:[S1A1,S1A2,S2A1,S2A2]} | number[])[]} targets
 * @property {'classical'|'robust'} [method='classical']
 * @property {boolean} [logTransform]          // ᶠU = exp(k·s_G,meas) (UfS Eq. 5)
 * @property {string} [unit], {{value:number}} [measurement], {{k?:number}} [settings]   // k standart 2
 *
 * @typedef {Object} SamplingResult
 * @property {'SAMPLING'} mode, {'DUPLICATE_CLASSICAL_ANOVA'|'DUPLICATE_ROBUST_ANOVA'} approach
 * @property {Summary} classical, robust       // ikkalasi ham har doim hisoblanadi (taqqoslash uchun)
 *   Summary: { mean, s:{between, sampling, analysis, measurement, total}, variancePct:{…}, relU:{sampling, analysis, measurement}, negative:string[], ss? }
 * @property {number} mean, sBetween, sSamp, sAnal, sTotal, uc (= s_meas), k, U, relU, relUSamp, relUAnal   // tanlangan usul bo'yicha
 * @property {{meanLog, geometricMean, sG:{…}, uncertaintyFactor:{sampling, analysis, measurement}}|null} log
 * @property {number|null} y, absU             // absU = |y|·relU/100
 */
```

| Formula | Manba | Holat |
|---|---|---|
| Klassik ichma-ich ANOVA: SS, MS; σ_a² = MS_a; σ_s² = (MS_s − MS_a)/2; σ_t² = (MS_t − MS_s)/4 | UfS:2019 Appendix C3; Figure A1.2 (p. 41), Figure A2.2 (p. 48) | **verified** (to'liq aniqlikda) |
| s_meas² = s_samp² + s_anal²; U′ = 2·100·s_meas/x̄ | UfS:2019 Eq. 1–2 (§9.5.2), Eq. 4 (p. 20) | **verified** |
| ᶠU = exp(2·s_G,meas) (loge qiymatlarda klassik ANOVA) | UfS:2019 Eq. 5 (§9.5.3); Table A2.3 (p. 49) | **verified** (2,6207) |
| Robust ANOVA (Huber, c = 1,5; β = 0,7785) | UfS:2019 Appendix C3, [53] RANOVA — kod repoda yo'q | **verified 4 qiymatli raqamgacha** (qayta tiklangan algoritm, RISKS R-21) |

Manfiy dispersiya bahosi 0 ga tenglanadi va `sampling_negative_variance` chiqadi (jimgina emas). Boshqa ogohlantirishlar: `sampling_few_targets` (< 8), `sampling_fitness` (o'lchash dispersiyasi > 20 %), `sampling_robust_reconstructed`, `sampling_robust_no_convergence`, `sampling_bias_not_included` (har doim), `zero_u`. Xatolar: `sampling_bad_spec`, `sampling_bad_data`, `sampling_too_few`, `sampling_unbalanced`, `sampling_bad_method`, `sampling_log_nonpositive`, `sampling_zero_mean`.

### 9.2. Sifatli (binar) testlar: `uc-qualitative/1` — verified

```js
/** @typedef {Object} QualitativeSpec
 * @property {'uc-qualitative/1'} format
 * @property {{tp:number, fn:number, fp:number, tn:number}} [table]   // yoki
 * @property {{fp:number, fn:number}} [rates]                          // ulushlar (0…1), jadvalsiz
 * @property {number} [prevalence]             // P(+), 0…1 — posterior ehtimollar uchun
 * @property {{P?:number, ciMethod?:'wilson'|'clopper_pearson'}} [settings]   // P — ishonch darajasi (standart 0,95);
 *                                            // ciMethod — hisobotdagi interval usuli (standart 'wilson'; laboratoriya sozlamasi)
 *
 * @typedef {Object} QualitativeResult
 * @property {'QUALITATIVE'} mode
 * @property {Rate} sensitivity, specificity, falsePositiveRate, falseNegativeRate, {Rate|null} ppvStudy, npvStudy
 * @property {'wilson'|'clopper_pearson'} ciMethod   // qo'llanilgan usul — hisobotda nomi va P bilan yoziladi
 *   Rate: { value, x, n, ci:{low, high}, wilson:{low, high}, clopperPearson:{low, high} }   // ci — tanlangan usul intervali
 * @property {number} lrPositive (TP/FP), lrNegative (FN/TN), {number|null} studyPrevalence, prevalence, posteriorPositive, posteriorNegative
 */
```

| Formula | Manba | Holat |
|---|---|---|
| SS = tp/(tp + fn); SP = tn/(tn + fp); FP = 1 − SP; FN = 1 − SS | AQA:2021 §3.2 | **verified** |
| Wilson score intervali | AQA:2021 §4.4 Eq. (8)–(11); Table E6.2 (p. 36) | **verified** |
| LR(+) = TP/FP; PP = O·LR/(O·LR + 1) | AQA:2021 §4.2, §4.3 Eq. (6); Example E3 (p. 28) | **verified** |
| Clopper–Pearson (aniq binomial) — loyiha qo'shimchasi (AQA:2021 da yo'q) | mustaqil ochiq dastur: SciPy 1.18.1 — `scipy.stats.binomtest(x, n).proportion_ci(confidence_level=P, method="exact")` | tekshirilgan — 7 nuqta, 10⁻¹⁰ (qiymatlar sessiyada hisoblangan; RISKS R-21) + analitik: x = n → (α/2)^(1/n) |

**Interval usuli (egasi qarori 2026-11-18, RISKS R-21).** Standart — Wilson; `settings.ciMethod: 'clopper_pearson'` — laboratoriya sozlamasi (`LAB_DEFAULTS.ciMethod`, "Laboratoriya sozlamalari" oynasi). `Rate.ci` — tanlangan usul intervali; `wilson` va `clopperPearson` har doim natijada saqlanadi (ekrandagi solishtirish uchun). Bosma hisobotda faqat tanlangan usul intervali, usul nomi va P chiqadi. Noto'g'ri `ciMethod` → `qualitative_bad_data`. Ogohlantirishlar: `qualitative_zero_false`, `qualitative_small_n` (< 30 holat), `qualitative_prevalence_study`, `qualitative_cp_project_addition` (info; faqat Clopper–Pearson tanlanganda). Xatolar: `qualitative_bad_spec`, `qualitative_bad_data`, `qualitative_no_positive_cases`, `qualitative_no_negative_cases`.

### 9.3. Mikrobiologiya: `uc-micro/1` — BETA, unverified

`{ result:{value, sumCounts}, technical?:{pairs:[[x1,x2]…]} | {s}, matrix?:{u}, unit?, settings?:{k=2, lowCountThreshold=10} }` → `{ mode:'MICROBIOLOGY', unverified:true, y (= log₁₀ N), uTech, uMatrix, uPoisson (= 0,4343/√ΣC), uc, k, U, interval:{low: 10^(y−U), high: 10^(y+U)}, intervalLog, budget[] }`. Har doim `micro_unverified` (warning); `micro_low_count`, `micro_no_technical`, `micro_few_pairs`. Xatolar: `micro_bad_spec`, `micro_bad_data`, `micro_zero_count`, `micro_need_result`.

### 9.4. Tibbiy laboratoriya: `uc-medical/1` — BETA, unverified

`{ unit, levels:[{id?, values[] | (mean, cv | sd, n?), uCal?, uBias?}], uCal?:{value, relative:true | unit}, uBias?, measurement?:{value}, settings?:{k=2} }` → `{ mode:'MEDICAL', unverified:true, levels:[{id, mean, n, sd, cv, uRw, uCal, uBias, u:{abs, rel}, U:{abs, rel}, budget[]}], y, appliedLevel, absU, relU }`. Nisbiy ↔ mutlaq o'tkazish har bir darajaning o'z o'rtachasi orqali; kattalikda `unit` yoki `relative: true` bo'lmasa — `medical_need_scale`, aralash — `medical_mixed_scale`. Har doim `medical_unverified` (warning); `medical_no_calibrator`, `medical_few_iqc`, `zero_u`.

Testlar: `tests/cases/ufs/*.json` (4), `tests/cases/aqa/*.json` (4) — verified; `tests/engine/special-modes.test.js`, `tests/ui/special.test.js`.

## 10. Linter: `result.findings` va model turi (P05a)

`evaluate(spec)` har bir muvaffaqiyatli natijaga `findings` ni qo'shadi (`lint(spec, result)`); rejim funksiyalari (`evaluateRegression`, `evaluateTopDown`, …) to'g'ridan-to'g'ri chaqirilsa `findings` bo'lmaydi — `lint()` ni alohida chaqiring. Linter natijaning boshqa maydonlarini o'zgartirmaydi. Qoidalar, manbalar va loyiha qarorlari — [LINTER_RULES.md](LINTER_RULES.md).

```js
/**
 * @typedef {Object} Finding
 * @property {string} id          // barqaror kalit: '<qoida>/<kod>[:<kirish>/<manba>]' — qabul qilish shu bo'yicha
 * @property {string} rule        // 'X1' … 'X12', 'A1' … 'A4', 'M1', 'W1' (GUM ogohlantirishlari), 'W2' (modul ogohlantirishlari)
 * @property {string} code        // matn kaliti: w_<code>, why_<code>, fix_<code>
 * @property {'error'|'warning'|'info'} severity
 * @property {string} ref         // manba bandi; repoda yo'q hujjat — "(unverified)"
 * @property {'GUM'|'REGRESSION'|'TOP_DOWN'|'SAMPLING'|'QUALITATIVE'|'MICRO'|'MEDICAL'} mode
 * @property {string} [param], [source], [value]   // kirish, manba nomi, raqam (matndagi {p}, {s}, {v})
 * @property {boolean} [unverified]                // hech bir manbasi repoda yo'q
 */
lint(spec, result, ctx?)            // → Finding[] (error, warning, info tartibida); ctx.reported = {y, U} — X9
lintReported({ y, U }, mode?)       // hisobot qatlami: chop etiladigan satrlar (X9)
withAcceptances(findings, acc)      // har biriga accepted: null | {comment, role, at}
reportStatus(findings, acc)         // { official, openErrors[], mustFlag, critical[], counts }
validateAcceptance(comment)         // { ok, comment } | { ok: false, error: 'accept_comment_short' }  (MIN_ACCEPT_COMMENT = 10)
LINTER_RULES, FINDING_CODES, LINTER_MODES, LINTER_THRESHOLDS, SEVERITIES
```

**`warnings[]` — deprecated.** GUM, regressiya, top-down va maxsus rejimlarning `warnings[]` maydoni 2.4.0 da o'zgarmagan holda qoladi (moslik); yangi kod `findings` dan foydalanadi. Kodlar bir xil; farqlar: `zero_u` va `below_cmc` topilma sifatida **error**; `zero_s` → rezolyutsiya manbasi bo'lmasa `x8_zero_s_no_resolution`; `n_small` (info) / `n_lt3` (warning).

**Model turi (RISKS R-07).** `settings.modelKind`:

| Qiymat | Ma'nosi | Muvofiqlik (MPE bilan) | `deviation` |
|---|---|---|---|
| `'error'` | ko'rsatish xatosi E = X − X_ref | \|E\| ≤ MPE | y |
| `'value'` | kattalik qiymati Y, nominal bilan (`settings.nominal`) | \|Y − nominal\| ≤ MPE | y − nominal (nominal yo'q — null) |
| `'unknown'` (yoki berilmagan) | ko'rsatilmagan (eski hisoblar) | **berilmaydi**: `conf.simple = conf.guarded = 'na'`, `conf.pending = 'model_kind'`; topilma `model_kind_unknown` | null |

`gamma` ham `deviation` dan. `multiPointCoverage(results, uniformK)` har bir natijaning `deviation` maydonidan foydalanadi; maydon yo'q (ENGINE ≤ 2.3.0 da saqlangan natija) yoki `conf.pending` bo'lsa — hukm bermaydi. y, u_c, ν_eff, k, U model turiga bog'liq emas.

**Saqlash qatlami** (`src/storage/`): `acceptFinding(store, {scope, calcId, finding, comment, role})`, `revokeAcceptance`, `acceptancesFromAudit(entries, scope, calcId)` — audit zanjiri; `upgradeCalcState(state)` — eski hisoblarga `modelKind: 'unknown'`; `LAB_DEFAULTS.criticalMode: 'mark' | 'block'`.

**Hisobot qatlami** (`src/report/findings.js`, sof): `findingsBlockHTML(findings, {t, esc, acceptances, print, canAccept, scope})`, `findingsStatus`, `watermarkHTML`, `criticalMarkHTML`, `reportMarks(result, {t, mc})` (ν qoidasi, MC seed va M, BETA / unverified, dvigatel versiyasi), `modelKindText`.

Testlar: `tests/engine/linter.test.js`, `tests/engine/linter-fixtures.test.js`, `tests/storage/acceptance.test.js`, `tests/ui/findings.test.js`.

## 11. Qaror qoidasi, hisob hujjati va hisobot shakllari (P05b)

### 11.1. `result.decision` — verified (JCGM 106:2012 §7–8; ILAC G8:09/2019)

Kirish (`settings`): `decisionRule` (`'simple'` | `'guard_band'` | bo'sh), `guardR` (w = r·U), `decisionStatement` (`'binary'` | `'non_binary'`), `tolLower` / `tolUpper` (bir yoki ikki tomonlama chegara; berilmasa — ±MPE model turiga ko'ra), `agreement` (mijoz bilan kelishuv raqami).

```js
/** result.decision:
 *   null                         — chegara ham, MPE ham yo'q
 *   { pending: 'rule'|'limit'|'model_kind'|'nominal', lower, upper }   — bayonot berilmaydi
 *   { error }                    — decision_bad_limits, decision_guard_exceeds, …
 *   { type, lower, upper, tolerance, rule, r, w, statement, acceptLower, acceptUpper,
 *     value, u, U, tur, cm, pc, pNonConf, verdict, accepted, specificRisk, riskKind,
 *     maxFalseAccept, assumption: 'normal', agreement, pending: null }
 */
```

`decide(o)`, `conformanceProbability(y, u, lower, upper)`, `decisionInput(settings, ctx)`, `decisionPreset({template, lab})` (2.5.1: shablon / laboratoriya qoidasini tanlov oynasiga oldindan qo'yish — tasdiqlanmaguncha `settings` ga yozilmaydi), `DECISION_RULES`, `DECISION_STATEMENTS`, `GUARD_PRESETS` — `src/engine/decision.js`. Hukm U (hisobotdagi k bilan) bo'yicha; `multiPointCoverage` yagona k bilan qayta hisoblaydi. `conf` (P05a) — moslik uchun qoladi; hisobot faqat `decision` dan hukm chiqaradi.

### 11.2. Hisob hujjati `uc-calc/1` (`src/io/calc-json.js`)

`buildCalcDoc({id, createdAt, input, result, template, points, acceptances, ui})` → `{format, app, engineVersion, id, createdAt, template, input, result, findings, acceptances, points, hash}`; `hash` — hujjatning (xesh maydonisiz) RFC 8785 kanonik JSON'i SHA-256 (`src/storage/canonical.js::canonicalizeJcs`, `jcsHash`; ±∞ → `{"$num":"Infinity"}`). `parseCalcDoc(text)` — hajm chegarasi, format, taqiqlangan kalitlar (`__proto__` …), xesh tekshiruvi; `reproduce(parsed, evaluate, engineVersion)` — qayta hisob va bit darajasida solishtirish.

### 11.3. Jadval importi / eksporti (`src/io/`)

`import.js` (`LIMITS`, `precheck`, `zipInfo`, `xlsxSheet`, `csvTable`, `openTableFile`), `csv.js` (`parseCsv`, `toCsv`, `neutralize`), `table-text.js` (`parseGrid`, `matchColumns`, `planTablePaste`), `export-table.js` (`buildExportModel`, `flattenModel`), `xlsx-write.js`, `calc-state.js`. Vendor kutubxonalar faqat `vendor.js` (`loadXlsx`, `loadQr`) orqali, dinamik `import()` bilan.

### 11.4. Hisobot shakllari (`src/report/`)

`createSections({t, esc, acceptances, canAccept, lab})` — bo'limlar (GUM, regressiya, top-down, maxsus); `summaryRows(points, uniformK)`; `buildReport({form, mode, lang, t, esc, result, points, requisites, footer, …})` — `REPORT_FORMS = ['calibration_certificate', 'test_report', 'budget', 'conformity']`; `missingRequisites(form, req)`; `normativeRefs(lang, {form, mode, decision, monteCarlo})`; `footerModel`, `footerHTML`, `qrSvg`, `qrPayload(id, hash)`. Hammasi sof (DOM siz); DOM ulanishi — `src/js/report.js`, sozlamalar — `src/ui/report/app.js` (`window.UCReport`).

Testlar: `tests/engine/decision.test.js`, `tests/io/*.test.js`, `tests/report/forms.test.js`, `tests/ui/io.test.js`, `tests/security/vendor.test.js`.

## 12. Monte-Karlo 2.0 (P06)

Manba: JCGM 101:2008 (`docs/references/JCGM_101_2008_GUM-S1_MonteCarlo.pdf`). Har bir formula ustida `// Ref: JCGM 101:2008 §…`.

```js
import { monteCarlo, createMonteCarlo } from './src/engine/index.js';

const mc = monteCarlo(modelSpec);                       // standart: adaptiv, n_dig = 2, eng qisqa interval, urug' 20261110
const mc2 = monteCarlo(modelSpec, { mode: 'fixed', M: 1e6, interval: 'symmetric', seed: 7 });
const old = monteCarlo(modelSpec, { rng: 'xorshift32-legacy', M: 200000 });   // 2.5.0 natijasi — bit darajasida
monteCarlo(modelSpec, 200000);                          // eski imzo: son = qat'iy M (yangi generator bilan)

// bo'laklab (Web Worker / asosiy oqim): natija bo'laklarga bog'liq emas
const job = createMonteCarlo(modelSpec, opts);          // → { error } | { step, result, options, blockSize }
let info; do { info = job.step(1); } while (!info.done);   // info: { done, M, target, expected, blocks, progress, ratio }
const res = job.result();
```

### 12.1. Sozlamalar (`opts`; standart — `MC_DEFAULTS`; hisob / laboratoriya sozlamasi — `settings.mc`, `opts` ustun)

| Maydon | Qiymat | Standart | Izoh |
|---|---|---|---|
| `mode` | `'adaptive'` \| `'fixed'` | `'adaptive'` | §7.9.4; qat'iy M — laboratoriya sozlamasi |
| `nDig` | 1 … 4 | 2 | §7.9.2: δ = ½·10^l |
| `M` | 10⁴ … 2·10⁷ | 10⁶ | faqat `fixed` |
| `maxM` | 2·10⁴ … 2·10⁷ | 10⁷ | adaptiv rejim chegarasi; yetilsa `mc_not_converged` |
| `interval` | `'shortest'` \| `'symmetric'` | `'shortest'` | barqarorlik mezoni va §8 tekshiruvi shu tur bo'yicha; natijada ikkalasi ham bor |
| `seed` | butun 0 … 2³² − 1 yoki `[i1, i2, i3, i4]` | 20261110 | natijada va hisobotda yoziladi |
| `rng` | `'wichmann-hill-2006'` \| `'xorshift32-legacy'` | `'wichmann-hill-2006'` | legacy — faqat takrorlash (qat'iy M, korrelyatsiyasiz) |
| `validation` | `true` \| `false` | `true` | `true` — GUM natijasini tekshirish (§8): MCM toleransi δ/5 (§8.2); `false` — oddiy MCM: δ, `validated: null` (egasi qarori Q-8) |
| `tolDivisor` | ≥ 1 | `validation ? 5 : 1` | tekshiruvda 5 dan kichik qiymat — laboratoriya sozlamasi ("δ ga tushirish"): `validation.lowered`, hisobotda belgi |
| `criteria` | `'auto'` \| `'all'` \| `'interval'` | `'auto'` | `'all'` — §7.9.4 k) (y, u(y), y_low, y_high); `'interval'` — faqat interval uchlari, δ GUM u_c dan; `'auto'` — ν ≤ 2 bo'lgan t-kirish bo'lsa `'interval'`, aks holda `'all'` (egasi qarori Q-5) |
| `nonNormalCorrelation` | `'refuse'` \| `'gaussian'` | `'refuse'` | §12.4 |
| `onProgress`, `shouldCancel` | funksiya | — | har blokdan keyin; bekor qilinsa `{ error: 'mc_cancelled' }` |

Noto'g'ri qiymat → `{ error: 'mc_bad_option', detail: <maydon> }`.

### 12.2. Natija

```js
{
  engineVersion, mode: 'MC',
  rng: { name: 'wichmann-hill-2006', seed }, seed,        // + M — hisobotga
  M, blocks, blockSize, P,
  mean, u,                                                // §7.6 Eq. (16), (17) — barcha M qiymatdan; ν ≤ 2 li t-kirish bo'lsa u: null
  uDefined, uSample,                                      // uDefined: false → "u(y) aniqlanmagan (ν ≤ 2), faqat qamrov intervali"; uSample — tanlanma s.o. (ma'lumot uchun)
  interval: 'shortest' | 'symmetric',
  low, high,                                              // eng qisqa interval (§7.7.2)
  symLow, symHigh,                                        // ehtimollik bo'yicha simmetrik
  intervalLow, intervalHigh, mcHalf,                      // tanlangan tur
  adaptive: { enabled, nDig, maxM, tolDivisor, criteria, criteriaAuto, converged, reachedMax, nDigAchieved, delta, s: { y, u, low, high } },
  nDig, nDigAchieved,                                     // yetilgan n_dig: 2·max(s) ≤ δ(n_dig) bajariladigan eng katta qiymat
  gumY, gumUc, gumU, gumLow, gumHigh,
  delta, dLow, dHigh, validated,                          // §8.1.3; δ — GUM u_c dan, n_dig bo'yicha; validation: false → validated: null
  validation: { requested, tolDivisor, required, achieved, met, lowered },   // talab (δ/5 yoki δ) va erishilgan tolerans (2·max s)
  correlated, correlation: { handled, groups: [{ inputs, method: 'mvn' | 'gaussian-approx', nonNormal }] },
  varianceUndefined: [{ input, source, nu }],             // t, ν ≤ 2 (§7.6 Note 2)
  sampling: [{ input, joint, parts: [{ kind: 'A' | 'B', name, dist, nu? }] }],
  findings: [...]                                         // M2–M4 (docs/LINTER_RULES.md)
}
```

Xatolar: `mc_nonnormal_correlation` (+ `findings`), `invalid_covariance`, `mc_nonfinite` (model ayrim sinovlarda aniqlanmagan), `mc_lognormal_nonpositive`, `bad_dist_param`, `mc_bad_option`, `mc_cancelled` va `evaluate()` xatolari.

### 12.3. Kirish taqsimotlari

X_i = x_i + (A tur qismi) + Σ (B tur manbalari · ko'paytuvchi); har bir qism — o'rtachasi 0.

| Qism | Taqsimot | Ref |
|---|---|---|
| A tur, usul 1 | (s/√n)·t₍n−1₎ | §6.4.9.2, §6.4.9.5 |
| A tur, usul 2 (s_p) | (s_p/√n)·t₍ν_p₎ | §6.4.9.6 |
| A tur, usul 3 | (s/√n)·t₍n−1₎ — standart og'ishi u_A (Eq. 13); egasi tasdiqladi (2026-11-18) | §6.4.9.4 |
| A tur, ↑/↓ | (s_p/√n)·t₍n−2₎ + histerezis R(−h/2, h/2) | §6.4.9.6, §6.4.2 |
| `normal` | N(0, (a/k)²); `nu` chekli → t_ν(0, (a/k)²) | §6.4.7, §6.4.9.7–8 |
| `rect`, `resol` | R(−a, a); R(−a/2, a/2) | §6.4.2 |
| `triang` | T(−a, a) | §6.4.5 |
| `ushape` | U(−a, a) | §6.4.6 |
| `trap` (`beta`) | Trap(−a, a, β), 0 ≤ β ≤ 1; u = a·√((1 + β²)/6) | §6.4.4 |
| `ctrap` (`d`) | CTrap(−a, a, d), 0 < d < a; u = √(a²/3 + d²/9) | §6.4.3 |
| `exp` | Ex(1/a) − a (a — kattalik bahosi x); u = a | §6.4.10 |
| `lognorm` | E = x_i, V = (a/k)²; x_i > 0 shart | **unverified** (JCGM 101 da yo'q) |

`rect` + `nu` MCM da avtomatik `ctrap` ga aylantirilmaydi (§9.5.2.9 dagi d = a·(ishonchsizlik ulushi) — foydalanuvchi `ctrap` ni o'zi tanlaydi).

### 12.4. Korrelyatsiya

`result.pairs[].cov ≠ 0` bo'lgan kirishlar guruhlanadi (bog'langan komponentlar).

- Guruhdagi **barcha** kirishlar normal (A tur qismi yo'q yoki ν = ∞; B tur — faqat `normal`, ν siz) → N(x, U_x), Cholesky U_x = RᵀR, X = x + Rᵀz (§6.4.8, C.5, Table C.4).
- Aks holda: `nonNormalCorrelation: 'refuse'` → `{ error: 'mc_nonnormal_correlation', detail, findings: [M2] }` — natija **berilmaydi**; `'gaussian'` → guruh N(x, U_x) bilan yaqinlashtiriladi (U_x: u²(x_i) va cov), natijada `method: 'gaussian-approx'` va M2 ogohlantirishi. Topilma matni: "LPU (GUM) natijasi amal qiladi". Copula qo'shilmaydi.
- **Juftlangan A tur kuzatuvlari (2.7.0):** guruhdagi barcha kirishlar usul 1, n bir xil, bo'sh katak yo'q, guruh ichida B tur kovariatsiyasi yo'q bo'lsa — **ko'p o'lchovli t** t_ν(x̄, S/n), ν = n − N (JCGM 102:2011 §5.3.2): ξ = x̄ + L·z·√(ν / w), S/n = L·Lᵀ, w ~ χ²_ν; natijada `inputCorrelation.groups[].method: 'multivariate-t'`, `nu`, `n`. B tur manbalari mustaqil qo'shiladi. n ≤ N → `{ error: 'mc_t_dof' }`. ν ≤ 2 → Q-5 qoidasi (`u: null`). Bu yo'l `'gaussian'` sozlamasidan ustun.
- U_x musbat (yarim) aniqlanmagan → `{ error: 'invalid_covariance' }`; "tuzatish" (C.5.2 Note 2) qo'llanilmaydi. r = ±1 (rang yetishmaydigan, lekin yaroqli matritsa) — qabul qilinadi (C.5.2 Note 3).

### 12.5. Takrorlanuvchanlik

- Bir xil kirish + bir xil `seed` + bir xil sozlama → aynan bir xil natija (bloklarga / worker'ga bog'liq emas).
- R(0, 1) ketma-ketligi faqat IEEE 754 amallaridan (×, mod, ÷, +, ⌊⌋) iborat — har qanday JS muhitida bit darajasida bir xil. Gauss, t, arksinus, eksponensial, log-normal `Math.log / sin / cos / pow / exp` dan foydalanadi: ECMAScript ularning oxirgi bitini kafolatlamaydi. **Node 22 va Chromium (V8) da natijalar bit darajasida bir xil — tekshirildi**; boshqa dvigatellarda (SpiderMonkey, JavaScriptCore) oxirgi xonalarda farq bo'lishi mumkin (tekshirilmagan — P13 da tekshiriladi, R-23).
- Eski hisob: `{ rng: 'xorshift32-legacy', M }` — 2.5.0 natijasi.

### 12.6. Brauzer (`src/ui/mc/`)

`window.UCMonteCarlo.run(spec, opts, onProgress)` → `{ promise, cancel(), via() }`. Modulli Web Worker (`src/ui/mc/worker.js` → `src/engine/index.js`); worker yuklanmasa — asosiy oqimda ≈ 25 ms li bo'laklar. CSP: `script-src 'self'` (o'zgarmagan).

Laboratoriya sozlamalari (`LAB_DEFAULTS`, sozlamalar oynasi): `mcMode` (`adaptive` \| `fixed`), `mcNDig` (1 \| 2), `mcTolerance` (`delta5` \| `delta`) — panel shulardan boshlanadi; `delta` tanlansa tekshiruv `tolDivisor: 1` bilan bajariladi va hisobotda belgilanadi.

## 13. Ko'p o'zgaruvchili modellar (P07)

Manba: JCGM 102:2011 (`docs/references/`). Modullar: `src/engine/multivariate/` — `linalg.js`, `lpu.js`, `region.js`, `montecarlo.js`. `evaluate()` va `monteCarlo()` chiqishlar soni > 1 bo'lsa shu yo'lga o'tadi (`isMultiOutput(state)`); bitta chiqishda kod yo'li va natija 2.6.0 bilan bit darajasida bir xil.

### 13.1. Kirish

- `uc-model/1`: `outputs: [{ symbol, formula, unit?, settings? }, …]` (kamida 1; 0 → `multi_output`).
- `calc-state/v2`: `state.outputs = [{ formula: 'R = …', unit }, …]`; birinchi element `state.model` bilan bir xil. `outputs` yo'q yoki uzunligi 1 — bir o'lchovli hisob.
- Chiqishga xos sozlamalar (`OUTPUT_SETTINGS`: `mpe`, `modelKind`, `nominal`, `range`, `cmc`, qaror qoidasi maydonlari) faqat `outputs[j].settings` orqali; umumiy `settings` dagi shu maydonlar vektor hisobda e'tiborga olinmaydi (bitta MPE bir nechta kattalikka qo'llanilmasin).

### 13.2. Natija (`mode: 'MULTIVARIATE'`)

```js
{ engineVersion, mode: 'MULTIVARIATE', P, m, N, symbols, outputs: [{ symbol, unit, y, u, k, U, nuEff, … }],
  results: [/* har bir chiqishning to'liq bir o'lchovli natijasi (byudjet bilan) */],
  inputs, pairs, sensitivity /* C_x, m × N */, inputCovariance /* U_x */, y,
  covariance /* U_y */, correlation, coverageRegion, findings }
```

- **U_y = C_x·U_x·C_xᵀ** — §6.2.1.3, Eq. (3). C_x — bir o'lchovli yo'ldagi sezgirlik koeffitsiyentlari; U_x — u²(x_i) va `pairs[].cov` dan.
- `coverageRegion` (§6.5): `{ P, m, distribution: 'gaussian', ellipsoid: { kp, kp2 }, rectangle: { q, kq, intervals }, lambdaMax, lambdaMin, singular, ellipse? }`; k_p² = χ²_{m;P} (Table 1), k_q = Φ⁻¹((1 + q)/2), q = 1 − (1 − P)/m (Table 2). `ellipse` (faqat m = 2): yarim o'qlar, burchak, yuz. `singular` — λ_min / λ_max < 10⁻⁹ (chiqishlar chiziqli bog'liq, masalan Z² = R² + X²).
- `outputs[j].U` — har bir chiqishning **alohida** kengaytirilgan noaniqligi (bir o'lchovli qoida bo'yicha); birgalikdagi qamrov — faqat `coverageRegion`. Hisobot ikkalasini ajratib yozadi.
- Xatolar: `invalid_covariance`, `duplicate_output`; chiqishga xos xato `output: j` bilan.

### 13.3. Ko'p o'lchovli Monte-Karlo

`monteCarlo(spec, opts)` / `createMonteCarlo` — §12 dagi sozlamalar; natija `multivariate: true`:

```js
{ mode: 'MC', multivariate: true, rng, M, blocks, P, m, symbols, y, u, covariance, correlation,
  coverageRegion: { distribution: 'mcm', ellipsoid: { kp }, rectangle: { kq, intervals }, marginal: { q, intervals }, … },
  adaptive, nDig, validation, comparison, validated, findings }
```

- Ellipsoid: (η − y)ᵀ·U_y⁻¹·(η − y) ≤ k_p², k_p — d² qiymatlarining P-kvantili (§7.7.2). To'g'ri burchakli soha — §7.7.3.
- Adaptiv protsedura — §7.8: kamida `MC_MIN_BLOCKS` = 10 blok; barqarorlik y_j, u(y_j), λ_max, k_p, k_q bo'yicha. M chegarasi — `maxTrialsFor(m)` = ⌊2·10⁷ / (m + 1)⌋.
- §8 tekshiruvi: y_j, u(y_j), k_p, k_q bo'yicha (`comparison[]`), standart tolerans δ/5.
- ν ≤ 2 bo'lgan t-kirishda: adaptiv yo'q, `u`, `covariance`, ellipsoid, to'g'ri burchakli soha — `null`; faqat `marginal.intervals`.
- Eski generator (`xorshift32-legacy`) — `mc_bad_option`.

### 13.4. Oshkor bo'lmagan model h(Y, X) = 0 (P07b, 2.9.0)

```js
state.implicit = { unknowns: [{ name: 'θ', start: 20, unit: '°C', settings? }], equations: ['(1 + A*θ + B*θ^2)*R0 - r*RS'], tol?, maxIter? }
```

- Tenglama — kirishlar (`state.params`) va noma'lumlar nomidan ifoda, `= 0` ma'nosida; `"chap = o'ng"` ham qabul qilinadi. Tenglamalar soni = noma'lumlar soni. `uc-model/1` da ham `implicit` (bu holda `outputs` bo'sh bo'lishi mumkin).
- **Nyuton** (§6.3.1.2): y⁽ᵏ⁺¹⁾ = y⁽ᵏ⁾ − C_y⁻¹·h; `start` majburiy (o'ylab topilmaydi). To'xtash: `'step'` — |Δy_j| ≤ `tol`·max(|y_j|, |start_j|) (standart 10⁻¹²) yoki `'stagnation'` — qadam yaxlitlash darajasida to'xtab qolgan (≤ 10⁻⁸ nisbiy va kichraymayapti); aks holda `maxIter` (50) dan keyin `implicit_no_convergence`. **Mezon — loyiha qarori, egasi tasdig'ini kutadi.**
- **U_y** (§6.3.1.3, Eq. (8)–(10)): C_y·C = C_x LU (qisman tanlov) bilan; sezgirlik c = −C; so'ng Y_j = y_j + Σ c_ji·(X_i − x_i) chiziqli ekvivalenti mavjud yo'ldan (`evaluate` / `evaluateMultivariate`) o'tadi. C_y singular (bosh element < 10⁻¹³·max|C_y|) → `implicit_singular`.
- Natija: m = 1 — bir o'lchovli natija (`symbol`, `formulaText` = tenglama); m > 1 — `mode: 'MULTIVARIATE'`. Ikkalasida `implicit: { equations, unknowns, start, y, iterations, residual, criterion, lastStep, tol, maxIter, Cy, Cx, sensitivity }`, `notes: [{ code: 'implicit_model' }]`, `secondOrder: null` (2-tartibli diagnostika yo'q), o'lchamlik tekshirilmaydi.
- `monteCarlo()` → `{ error: 'implicit_mc_unsupported' }`.
- API: `evaluateImplicit`, `isImplicit`, `newtonSolve`, `luSolve`, `IMPLICIT_DEFAULTS`, `IMPLICIT_ERRORS`.

### 13.5. `atan2` va eng kichik qamrov sohasi (P07b)

- `atan2(y; x)` yoki `atan2(y, x)` — to'rt kvadrantli arktangens (§9.3.1.1); ikki raqam orasidagi vergul — o'nlik belgi, shuning uchun sonli argumentlarda `;`. AST: `{ k: 'fn2', f: 'atan2', a, b }`.
- Ikki chiqishli MCM: `coverageRegion.smallest = { mesh, bounds: [[min1, max1], [min2, max2]], cellArea, cells, area, count, fraction, M, rows }` (§7.7.4; `rows[iy]` — tanlangan kataklar oraliqlari). Sozlama `smallestMesh` (`opts` yoki `settings.mc`): 10…500, standart 100, 0 — hisoblanmaydi. `smallestRegion(a, b, n, P, mesh)` — sof funksiya.

### 13.6. Qilinmagan (RISKS R-24)

Oshkormas model uchun Monte-Karlo va UI kiritish shakli; eng kichik qamrov sohasi m > 2 uchun; ko'p chiqish + ko'p nuqta.

## 14. Laboratoriya jarayonlari (P11)

Modullar: `src/engine/lab/` — `registry.js`, `drift.js`, `cmc.js`, `qc.js`, `westgard.js`, `interval.js`, `dates.js` (hammasi `src/engine/index.js` dan eksport qilinadi). Sof: DOM, brauzer xotirasi va **soat o'qilmaydi** — "bugungi sana" har doim tashqaridan beriladi. Saqlash — `src/storage/registry.js`; import / eksport — `src/io/registry.js`.

### 14.1. Etalonlar reestri (`uc-registry/1`, `kind: 'standard'`)

```js
{ id, format: 'uc-registry/1', kind: 'standard', version, name, type, serial, unit, range: { min, max }, limit?,
  calibrations: [{ certificate, calibrator /* tashkilot */, accreditation, route, traceability, date, validUntil,
                   points: [{ x, correction, U, k, nu }] }] }
```

- `route` — `TRACEABILITY_ROUTES`: `nmi_cipm`, `accredited`, `nmi_other`, `lab_other`, `crm` (ILAC P10:07/2020 §2, 1) – 3b); 4) – 6)).
- `cleanStandard(s)` — noma'lum maydonlarni tashlaydi (shaxsiy ma'lumot tasodifan yozilmaydi). `currentCalibration(std)` — eng so'nggi sanali.
- `pointAt(calibration, x)` → `{ x, correction, U, k, nu, interpolated, between? }`: nuqtada — aynan; oraliqda — tuzatma chiziqli, **U — ikki qo'shni nuqtadan standart noaniqligi kattasi** (loyiha qarori); tashqarida — `registry_out_of_range` (ekstrapolyatsiya yo'q). Interpolyatsiyaning o'z noaniqligi hisoblanmaydi — alohida manba sifatida taklif qilinadi, qiymatini foydalanuvchi kiritadi.
- `sourceFromStandard(std, { x, param })` → `{ component, snapshot }`: `component` — `typeB[]` elementi (normal, yarim kenglik = U, bo'luvchi = k; k yo'q bo'lsa `kRequired`, 2 deb faraz qilinmaydi) + `registry: snapshot`. **Dvigatel faqat shu nusxadan o'qiydi** — reestr keyin o'zgarsa ham eski hisob o'zgarmaydi. `limit` (MPE / tolerans) hech qachon manba bo'lmaydi.
- `validityStatus(validUntil, asOf, warnDays = 30)` → `{ status: 'valid' | 'expiring' | 'expired' | 'unknown', daysLeft }`; `hasTraceabilityEvidence(snapshot)`.

Hisobda: `typeB[i].registry` (nusxa) va `settings.measurementDate` ('YYYY-MM-DD' — etalon shu sanaga nisbatan tekshiriladi). Natijada `budget[i].registry`, `result.measurementDate`.

### 14.2. Drift

`correctionHistory(std, x)` → `[{ date, day, correction, certificate, U, k }]`; `driftProposal(history, { method: 'last_two' | 'trend', distribution: 'rect' | 'triang' | 'ushape' | 'normal', k, asOf })` → `{ proposal: { halfWidth, distribution, divisorLabel, u, deltaC, basis } }` yoki `{ error: 'drift_need_two' }`. Standart: a = |ΔC| (oxirgi ikki kalibrlash), to'g'ri burchakli, u = a/√3. `trend`: a = |b|·Δt (OLS og'maligi × oxirgi kalibrlashdan `asOf` gacha). `driftComponent(proposal, ctx)` — foydalanuvchi **tasdiqlagandan keyin** `typeB[]` elementi (`drift: basis`); natijada `budget[i].drift`.

### 14.3. CMC jadvali

Qator: `{ id, quantity, min, max, unit, type, value | a, b | cmcMin, cmcMax, method, note }`; `type`: `abs` (CMC = value), `rel` (value % · |X|), `linear` (a + b·|X|), `range` (min da cmcMin … max da cmcMax, chiziqli). `cmcAt(row, x)` → `{ cmc, inRange, x }` (chegaralar kiradi; tashqarida `cmc: null`); `findCmc(rows, x, { quantity, method })`; `cmcCheck(row, x, U)`; `cmcCheckRows(rows, x, U)`.

Hisobda: `settings.cmcRows` (massiv — X ga mos qator avtomatik) yoki `settings.cmcRow`, `settings.cmcX` (son yoki ifoda). Natija: `result.cmcCheck = { rowId, tableVersion, quantity, method, type, min, max, unit, x, cmc, inRange, below, pending? }`, `result.cmc` = CMC(X) (jadval qo'lda kiritilgan `settings.cmc` dan ustun). Diapazondan tashqarida — CMC bilan solishtirilmaydi (`cmc: null`) va L2 `outside_scope`. Xatolar: `bad_cmc_x`, `cmc_bad_row`.

### 14.4. QC kartalari va Westgard

- `individualsChart(values)` → `{ type: 'imr', x: { center, sigma, ucl, lcl, uwl, lwl }, r: { center, ucl, lcl }, mr, out }` (σ̂ = MR̄/d₂(2)).
- `xbarRChart(subgroups)` → X̿ ± A₂·R̄; R: D₃R̄ … D₄R̄; `sigmaWithin = R̄/d₂`. Kichik guruh hajmi 2…10, hammasi bir xil.
- `targetLimits({ mean, s })`, `zScores(values, m, s)`, `SHEWHART_CONSTANTS[n] = { d2, d3, A2, D3, D4 }`.
- `sRwFromChart(points)` → `{ sRw, mean, n, nu: n − 1, values }` — top-down `control_series` ga uzatiladi.
- `westgard(z, { rules?, runs? })` → `{ violations: [{ rule, indices }], flagged, inControl }`; alohida: `rule13s`, `rule22s`, `ruleR4s(z, runs?)`, `rule41s`, `rule10x`. Natija o'chirilmaydi — faqat belgilanadi. R₄s seriya belgisisiz (`runs` yo'q) ketma-ket juftlikka qo'llansa — `violations[].approximation: true` (loyiha yaqinlashuvi).

### 14.5. Kalibrlash intervali

`intervalRecommendation(history, { limit, includeU = true })` → `{ recommendation: true, status: 'ok' | 'exceeded' | 'never', days, date, slopePerYear, margin }` yoki `{ error: 'interval_need_three' | 'interval_bad_limit' }`. Faqat tavsiya — amal qilish muddatini o'zgartirmaydi.

### 14.6. Saqlash va rol (`src/storage/registry.js`)

`saveRegistry(store, rec, { role, reason })` (versiya + 1, audit; yozuvga `savedBy` — rol; `guest` bo'lsa nusxada `enteredBy: 'guest'` → info `registry_unauthenticated` / `cmc_unauthenticated`), `removeRegistry`, `listRegistry(store, kind)`, `registryHistory(store, id)`, `canEditRegistry(kind, role)`: etalon va CMC — xodim (`employee`) tahrirlay olmaydi; QC kartasi — hamma. `migrateSchema(store)` — saqlangan hisoblar sxemasi → `CALC_STATE_SCHEMA` = 3.
