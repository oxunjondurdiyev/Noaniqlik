# Hisoblash dvigateli API (`src/engine/`) — ENGINE_VERSION 2.0.0

> Holat: P03, 2026-11-13. Dvigatel — sof ES modullar. Ular DOM'ga, global brauzer obyektiga va brauzer xotirasiga bog'liq emas (`grep -r "document\|window\|localStorage" src/engine` — bo'sh). Bir xil kod brauzerda, Node'da va (P15) serverda ishlaydi.
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
| `montecarlo.js` | MCM (P01 dagi bilan bir xil; Monte-Karlo 2.0 — P06) | JCGM 101:2008 |
| `util.js` | `toNum`, `isBlank`, `pairKey` | — |

Bog'liqlik: `engine` hech narsaga bog'liq emas. `report → engine` (faqat natija maydonlari), `ui → report, engine`.

## 2. Kirish: `modelSpec`

Dvigatel uch ko'rinishni qabul qiladi (`spec.js::normalize`):

1. **`uc-model/1`** — kanonik format (P04 shablon interpreteri shuni yaratadi);
2. **`{ format: 'calc-state/v2', state }`** — UI holati (`uc_state_v2`), test misollari (`tests/cases/**.json`);
3. **format maydonisiz** `state` obyekti — P00 dagi `Calc.evaluate(state)` bilan moslik.

```js
/**
 * @typedef {Object} ModelSpec            // format 'uc-model/1'
 * @property {'uc-model/1'} format
 * @property {OutputSpec[]} outputs       // hozir aynan bitta element (P07 — vektor chiqish)
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
 * @property {{code:string, param?:string, value?:any}[]} warnings
 * @property {{code:string}[]} notes      // ma'lumot (masalan units_unchecked)
 * @property {Object|null} conf           // { mpe, ratio, simple, guarded } — oddiy/himoyalangan qabul
 * @property {number|null} gamma          // keltirilgan xato, %
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
