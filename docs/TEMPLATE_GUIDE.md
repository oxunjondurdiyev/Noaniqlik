# Metodika shablonini yaratish — metrolog uchun yo'riqnoma (P04)

Shablon — bitta o'lchash yoki sinov metodikasining JSON tavsifi: o'lchash modeli (formula), kirishlar va ularning birliklari, B tur noaniqlik manbalari, o'zgarmaslar, variantlar va korrelyatsiyalar. Dastur shablondan hisob holatini yig'adi va GUM dvigatelida (`src/engine/`) hisoblaydi. **Shablon qo'shish uchun kod yozish shart emas.**

- Sxema: [`schemas/methodology.schema.json`](../schemas/methodology.schema.json) (format `uc-template/1`).
- Ichki shablonlar: [`templates/builtin/`](../templates/builtin/) (ro'yxat — `index.json`).
- 1-to'lqin spetsifikatsiyasi: [`docs/templates/WAVE1_SPEC.md`](templates/WAVE1_SPEC.md); tasdiqlash tartibi: [`docs/templates/APPROVAL_CHECKLIST.md`](templates/APPROVAL_CHECKLIST.md).

## 1. Asosiy qoidalar

1. **Raqam o'ylab topilmaydi.** Shablonda yarim kenglik (`halfWidth`), sertifikat k si va kuzatuvlar bo'sh (`null`) qoldiriladi. Ularni laboratoriya o'z asbob sertifikati va pasportidan kiritadi; har bir manbada `hint` — qayerdan olish kerakligi (uch tilda).
2. **Bo'sh maydon bilan hisob qilinmaydi.** Bo'sh yarim kenglik 0 deb, bo'sh k esa 2 deb jimgina olinmaydi — dastur to'ldirilmagan maydonlar ro'yxatini ko'rsatadi.
3. **Barcha matnlar uch tilda** (`{"uz": …, "ru": …, "en": …}`). Bittasi bo'lmasa — sxema xatosi.
4. **Kalibrlanayotgan asbobning MPE si manba emas.** Sinov asbobining (tarozi, press, mikrometr) sertifikat U si yoki ruxsat etilgan xatoligi — B tur manba.
5. **Namunaning o'zgaruvchanligi** mahsulot xossasi: `"kind": "sample_variability"`, `"includeByDefault": false`.
6. Yangi shablon har doim **DRAFT**. Hisobotda "Shablon tasdiqlanmagan (DRAFT)" belgisi chiqadi. APPROVED ga o'tish — [APPROVAL_CHECKLIST](templates/APPROVAL_CHECKLIST.md) bo'yicha.

## 2. Shablon tuzilmasi (qisqa)

| Maydon | Ma'nosi |
|---|---|
| `id`, `version`, `status` | ID (fayl nomi bilan bir xil), semver, `DRAFT` → `REVIEWED` → `APPROVED` (→ `RETIRED`) |
| `section` | katalog bo'limi: `construction`, `food_chem`, `electrical`, `calibration`, `general` |
| `title`, `standards[]`, `labCount` | nomi; standart shifri va bandi (qidiruv shifr bo'yicha ishlaydi); reestrdagi laboratoriyalar soni |
| `measurand` | natija belgisi, nomi, **birligi** |
| `model.formula` | `y = f(x…)`: `+ − * / ^ ( )`, `sqrt ln log exp sin cos tan abs pi` |
| `inputs[]` | `symbol`, `name`, **`unit`**, `kind` (`observation`, `reference`, `influence`, `nominal`), `typeA` (`method`: 1 — s/√n, 2 — pooled s_p) |
| `constants[]` | o'zgarmas (noaniqligi 0): `value: null` — laboratoriya standartdan kiritadi. `ref` (qiymat manbasi): faqat belgi bo'lsa (`"ГОСТ 10180"`, `"EURACHEM QUAM A2"`) — satr; izohli matn bo'lsa — uch tildagi obyekt `{uz, ru, en}` (ekranda ko'rsatiladi). Formulada bo'lsa — kirish sifatida (u = 0); faqat manba formulasida bo'lsa — son sifatida qo'yiladi |
| `variants[]` | bitta modelning standartga xos ko'rinishlari: `formula`, `inputs`, `constants` (masalan `{"f": null}`), ixtiyoriy `measurand`, `excludeSources`, `decisionRule` |
| `typeBSources[]` | `id`, `input`, `name`, `kind`, `distribution` (`normal` — U/k; `rect` — a/√3; `triang` — a/√6; `resol` — d/(2√3); `ushape` — a/√2; P06: `trap` — a·√((1+β²)/6), maydon `beta` (0…1); `ctrap` — √(a²/3+d²/9), maydon `d` (0 < d < a); `exp` — u = x; `lognorm` — U/k, **unverified**), `halfWidth` (son, **formula** — `"0.0002*I + 0.002"`, yoki `null`), `k`, `nu`, `unit`, `instrument`, `correlated`, `includeByDefault`, `hint` |
| `correlations[]` | bitta asbob bilan o'lchangan kirishlar: `inputs`, `r`, `sharedInstrument`, `ask: true` (UI so'raydi), `question` |
| `openQuestions[]` | hal qilinmagan savollar (⚠ belgili joylar shu yerga) |
| `decisionRule` | qaror qoidasi (to'liq — P05) |
| `evaluationMode`, `regression` | `GUM_BOTTOM_UP` (standart) yoki `REGRESSION` — kalibrlash egri chizig'i ([9-bo'lim](#9-regression-rejimi-p08)) |
| `evaluationMode: "TOP_DOWN"`, `topDown`, `isEmpiricalMeasurand` | validatsiya va sifat nazorati ma'lumotlaridan noaniqlik ([10-bo'lim](#10-top_down-rejimi-p09)) |
| `evaluationMode: "SAMPLING"` / `"QUALITATIVE"` / `"MICROBIOLOGY"` / `"MEDICAL"`, `special` | maxsus rejimlar ([11-bo'lim](#11-maxsus-rejimlar-p10)) |

**Bitta asbob korrelyatsiyasi** — batafsil [8-bo'lim](#8-bitta-asbob-korrelyatsiyasi-p04b). Qisqasi: asbob kalibrlash manbasi ikki qatorga bo'linadi — umumiy qism (`share: "common"`, `correlated: true`) va nuqtaga xos qism (`share: "point"`, `correlated: false`). Korrelyatsiyaga faqat umumiy qism kiradi. Ajratish qobiliyati (`resol`) va jarayon manbalari — `correlated: false`.

## 3. Kod yozmasdan yangi shablon qo'shish

**Brauzerda (tavsiya):**
1. "Shablonlar katalogi" → "Yangi shablon" (yoki mavjud shablonda "Muharrir" → "Nusxa olish").
2. Formula, natija birligi, kirishlar va birliklar maydonlarini to'ldiring; qolganini "Shablon (JSON)" maydonida tahrirlang. "Tekshirish" — sxema, formula va o'lchamlik tekshiruvi.
3. "Kim" va "O'zgartirish sababi" ni yozib "Saqlash". Shablon brauzerdagi IndexedDB ga, o'zgarish audit jurnaliga yoziladi.
4. Katalogda kartadagi "Hisoblash" → kuzatuvlar, yarim kengliklar, k va o'zgarmaslarni kiriting → "Yig'indi noaniqlikni hisoblash".
5. Tashkilot ichida ulashish: muharrirda "JSON yuklab olish"; boshqa kompyuterda "Shablonni import (JSON)".

**Repozitoriyga (ichki shablon):** JSON faylni `templates/builtin/<id>.json` ga qo'ying va nomini `templates/builtin/index.json` ga qo'shing. `npm test` uni sxema va semantik tekshiruvdan avtomatik o'tkazadi.

## 4. 1-misol: suyuqlik zichligi (piknometr) — o'zgarmas va korrelyatsiya bilan

To'liq fayl: [`docs/templates/examples/LAB-EXAMPLE-01.json`](templates/examples/LAB-EXAMPLE-01.json) (o'quv misoli; `tests/templates/guide-example.test.js` uni kodsiz yo'l bilan hisoblaydi).

Model: ρ = (m2 − m0) / (m1 − m0) · ρ_w, bu yerda m0 — bo'sh piknometr, m1 — suv bilan, m2 — suyuqlik bilan, ρ_w — suv zichligi (jadvaldan).

```json
"measurand": { "symbol": "ρ", "name": {"uz": "Suyuqlik zichligi", "ru": "…", "en": "…"}, "unit": "g/cm³" },
"model": { "formula": "ρ = (m2 - m0) / (m1 - m0) * rho_w" },
"constants": [{ "symbol": "rho_w", "unit": "g/cm³", "value": null, "ref": {"uz": "ma'lumotnoma jadvali", "ru": "справочная таблица", "en": "reference table"}, "name": {…}, "hint": {…} }],
"inputs": [
  { "symbol": "m0", "unit": "g", "kind": "observation", "typeA": {"method": 1}, "name": {…} },
  { "symbol": "m1", "unit": "g", … }, { "symbol": "m2", "unit": "g", … }
],
"typeBSources": [
  { "id": "m0_cal_common", "input": "m0", "kind": "certificate", "distribution": "normal", "halfWidth": null, "k": null,
    "unit": "g", "instrument": "balance", "correlated": true, "share": "common", "certificateU": null, "certificateK": null, … },
  { "id": "m0_cal_point", "input": "m0", "kind": "specification", "distribution": "rect", "halfWidth": null,
    "unit": "g", "instrument": "balance", "correlated": false, "share": "point", … },
  { "id": "m0_res", "input": "m0", "kind": "resolution", "distribution": "resol", "halfWidth": null,
    "unit": "g", "instrument": "balance", "correlated": false, … }
  … m1, m2 uchun xuddi shunday …
],
"correlations": [{ "id": "masses", "inputs": ["m0", "m1", "m2"], "r": 1, "sharedInstrument": "balance", "ask": true, "defaultEnabled": true, "split": "known", "question": {…} }]
```

Natija: birliklar tekshiriladi (g/g · g/cm³ = g/cm³ ✓); hisob sahifasida ρ_w maydoni va "m0, m1, m2 bitta tarozida tortiladimi?" savoli chiqadi; javob "ha" bo'lsa uchta juftlik uchun kovariatsiya qo'shiladi — faqat tarozi kalibrlashining umumiy qismidan (8-bo'lim).

## 5. 2-misol: variantlar va formula ko'rinishidagi yarim kenglik (T-22 asosida)

Izolyatsiya qarshiligi va oqish toki bitta shablonda, ikki variant bilan. Asbobning ruxsat etilgan xatoligi pasportda ±(a %·o'qish + b raqam) ko'rinishida beriladi — bu yarim kenglik formula sifatida yoziladi, a, b, d esa o'zgarmaslar (laboratoriya pasportdan kiritadi):

```json
"constants": [
  { "symbol": "a_rel", "unit": "%", "value": null, … },
  { "symbol": "b_dig", "unit": "1", "value": null, … },
  { "symbol": "d", "unit": "", "value": null, … }
],
"variants": [
  { "id": "insulation", "formula": "R_iz = R", "inputs": ["R"], "title": {…},
    "decisionRule": { "type": "one_sided_lower", "required": true, "limit": null } },
  { "id": "leakage", "formula": "I_oq = I", "inputs": ["I"], "title": {…},
    "measurand": { "symbol": "I_oq", "unit": "mA", "name": {…} },
    "decisionRule": { "type": "one_sided_upper", "required": true, "limit": null } }
],
"typeBSources": [
  { "id": "R_spec", "input": "R", "distribution": "rect", "halfWidth": "a_rel / 100 * R + b_dig * d", … },
  { "id": "R_res",  "input": "R", "distribution": "resol", "halfWidth": "d", … }
]
```

Formuladagi `R` — kirishning o'rtacha qiymati; `a_rel`, `b_dig`, `d` — o'zgarmaslar. Tanlangan variantga tegishli bo'lmagan kirish va manbalar avtomatik chiqarib tashlanadi. Standartga xos o'zgarmasni variantda berish ham mumkin: T-24 da `{"k": 234.5}` (mis) va `{"k": 225}` (alyuminiy); T-17 da har bir standart varianti `{"f": null}` — f ni laboratoriya standartdan kiritadi.

## 6. Holat oqimi va qulflash

- DRAFT → REVIEWED → APPROVED (REVIEWED → DRAFT qaytarish; APPROVED → RETIRED).
- APPROVED da `model`, `variants`, `constants`, `inputs`, `typeBSources`, `correlations`, `measurand` qulflanadi (`locked`). O'zgartirish — faqat "Yangi versiya" orqali (minor + 1, holat DRAFT, oldingi versiya saqlanadi).
- Lokal rejimda rollar faqat ogohlantirish darajasida (bitta odam tekshirib, tasdiqlay oladi — ogohlantirish chiqadi). To'liq nazorat — server bilan (P15).

## 7. Laboratoriya sozlamalari

"Laboratoriya sozlamalari": P, k usuli (t_P(ν_eff) yoki k = 2), ν_eff kasr qoidasi (`floor` — standart, `interpolate`, `exact`), U ni yaxlitlash, standart qaror qoidasi, 2-tartibli hadlar, U < CMC bo'lganda (ogohlantirish yoki hisobotni bloklash). Ustunlik tartibi: dastur standarti < laboratoriya < shablon `settings` < hisob sahifasida foydalanuvchi.

## 8. Bitta asbob korrelyatsiyasi (P04b)

Egasining qarori (2026-11-17). Manba: JCGM 100:2008 §5.2.2 Eq. (13)–(14), F.1.2.3 Eq. (F.2); EA-4/02 M:2022 Ilova D — D4–D5 (Eq. D.6, D.8, D.9), D7 (Eq. D.10).

**Muammo.** Bir xil asbob (tarozi, chizg'ich, ommetr) bilan o'lchangan ikki kirish korrelyatsiyalangan, lekin har doim ham to'liq emas. EA-4/02 D5 ga ko'ra: x₁ = q_S − z₁, x₂ = q_S − z₂ bo'lsa u(x₁, x₂) = u²(q_S), r = u²(q_S)/(u²(q_S) + u²(z)) — 0 dan +1 gacha. Korrelyatsiyani faqat **umumiy** ta'sir (q_S — sertifikatdagi ofset yoki sezgirlik xatosi) beradi. Nuqtaga xos ta'sirlar (z — nochiziqlilik, ekssentriklik, nuqtalar orasidagi interpolyatsiya) har bir o'lchash uchun mustaqil.

**Qachon r = +1 to'g'ri, qachon emas.**

| Model | c₁·c₂ | Butun sertifikat U ni r = 1 bilan olish |
|---|---|---|
| Ayirma yoki nisbat: w = (m − m₁)/m₁, Δt = (R₂ − R₁)/R₁·(k + t₁) − …, OK = h₀ − h₁ | < 0 | kalibrlash hissasi **qisqaradi**. Agar xato yuklamaga qarab o'zgarsa (nochiziqlilik), **U kam baholanadi** |
| Yig'indi: y = m₁ + m₂; T-07 Mk = Σ_k Σ_{j≤k} m_j / m (ijobiy hissalar ustun) | > 0 | hissalar qo'shiladi — r = 1 konservativ |

**Shablonda.** Har bir `sharedInstrument` kirishida ikki qator bo'ladi:

1. `"<asbob>: kalibrlash — umumiy qism (ofset/sezgirlik)"` — `share: "common"`, `correlated: true`, normal taqsimot, U va k sertifikatdan.
2. `"<asbob>: kalibrlash — nuqtaga xos qism (nochiziqlilik, ekssentriklik, interpolyatsiya)"` — `share: "point"`, `correlated: false`. Qiymat manbasi: sertifikat jadvalidagi nuqtalar orasidagi farq, nochiziqlilik yoki ekssentriklik sinovi, yoki pasport (±a).

Kovariatsiya u(xᵢ, xⱼ) = r · u_umumiy(xᵢ) · u_umumiy(xⱼ). Nuqtaga xos qism hech qachon kovariatsiyaga kirmaydi (r = 0). Ikkala qatorning yarim kengligi shablonda bo'sh, ularni laboratoriya kiritadi.

**Ikki marta hisoblamaslik.** Sertifikatda faqat bitta umumiy U bo'lsa, uni ikki qatorga bo'lish mumkin. Bunda u²(umumiy) + u²(nuqta) = u²(sertifikat) bo'lishi shart. Sertifikatning to'liq U va k sini umumiy qatorning "Sertifikatdagi to'liq U" va "k" maydonlariga yozing. Yig'indi oshib ketsa, dastur ogohlantiradi.

**Bo'lishni bilmasangiz — `split: "unknown"`** (hisob sahifasida "Sertifikat qismlari: Noma'lum"):

- umumiy qatorga sertifikatning to'liq U si yoziladi, nuqtaga xos qator e'tiborsiz qoldiriladi;
- dastur ikki hisob bajaradi: r = 0 va r = 1, va **katta u_c(y)** ni oladi;
- hisobotda: "Korrelyatsiya noma'lum — konservativ chegara: r = 0" (yoki r = 1).

u_c² r ga chiziqli bog'liq. Shuning uchun r ∈ [0, 1] dagi maksimum chetki nuqtalardan birida bo'ladi. Bitta asbob uchun r ning 0…+1 oralig'ida bo'lishi EA-4/02 D5 dan kelib chiqadi. Yuqori chegara g'oyasi esa EA-4/02 D7 (D.10) dan. **Bu loyiha qarori, me'yoriy talab emas.** Bir nechta noma'lum guruh bo'lsa, ularning hammasi bir vaqtda 0 yoki 1 olinadi.

**Misol** (qo'lda hisob, `tests/templates/correlation.test.js`). w = (m − m₁)/m₁:

- kirishlar: m = 105,3 g, m₁ = 100,1 g (har biri 3 ta o'lchash, s = 0,1 g);
- umumiy qism: U = 0,004 g, k = 2;
- nuqtaga xos qism: a = 0,003 g, to'g'ri burchakli taqsimot;
- ajratish qobiliyati: d = 0,001 g.

Hisob:

- c_m = 1/m₁, c_m₁ = −m/m₁²;
- u²(x) = (s/√3)² + (U/k)² + (a/√3)² + (d/(2√3))²;
- u(m, m₁) = (U/k)² = 4·10⁻⁶ g²;
- u_c² = c_m²·u²(m) + c_m₁²·u²(m₁) + 2·c_m·c_m₁·u(m, m₁).

Dvigatel natijasi shu formula bilan 1e-12 aniqlikda mos keladi. "Noma'lum" rejimida bu model uchun r = 0 tanlanadi; y = m + m₁ yig'indi modelida va T-07 da r = 1 tanlanadi.

**Eski nusxalar.** P04 da saqlangan bitta qatorli shablon va hisoblar avtomatik ravishda `split: "unknown"` ga o'tadi (`migrateTemplate`, `upgradeState`). Kiritilgan qiymatlar o'zgarmaydi.

## 9. REGRESSION rejimi (P08)

Kalibrlash egri chizig'i bilan ishlaydigan metodikalar (fotometriya, AAS, ICP, xromatografiya, datchiklar) uchun `"evaluationMode": "REGRESSION"`. Hisob: shablon → `buildRegressionSpec` → `uc-regression/1` → `evaluate()` ([ENGINE_API §7](ENGINE_API.md#7-regression-rejimi-uc-regression1-p08)). Shablon "Regressiya" yorlig'ida ochiladi.

```json
"evaluationMode": "REGRESSION",
"measurand": { "symbol": "c0", "name": {…}, "unit": "mg/L" },
"model": { "formula": "A = B0 + B1 * c", "note": {…} },
"inputs": [
  { "symbol": "c", "unit": "mg/L", "kind": "reference", "name": {…} },
  { "symbol": "A", "unit": "1", "kind": "observation", "name": {…} }
],
"typeBSources": [],
"regression": {
  "method": "OLS", "allowedMethods": ["OLS", "WLS", "WTLS"], "degree": 1, "xRef": null,
  "x": "c", "y": "A", "sigma": "auto",
  "calibrationPoints": [],
  "inverse": { "enabled": true, "replicates": null, "uy0": null, "hint": {…} },
  "predict": { "enabled": false }
}
```

Qoidalar:

1. `regression.x` va `regression.y` — `inputs[]` dagi belgilar (birliklari grafik va hisobotda ishlatiladi). `model.formula` bu rejimda **tavsifiy** (tahlil qilinmaydi).
2. **Raqam o'ylab topilmaydi:** `calibrationPoints` bo'sh (`[]`), `xRef`, `uy0`, `replicates` — `null`. Namunaviy nuqtalar faqat `"demo": true` va `demoSource` (manba) bilan; UI va hisobotda "Namunaviy ma'lumot — real emas" chiqadi. `demo` siz son bo'lsa — sxema/semantik xato.
3. `typeBSources` va `variants` bu rejimda ishlatilmaydi: u(x_i), u(y_i) har bir nuqta uchun jadvalda kiritiladi.
4. WTLS faqat `degree: 1` bilan.
5. Bo'sh maydon bilan hisob qilinmaydi: nuqtalar kiritilmagan bo'lsa `template_incomplete` (`regression_points`).
6. u(c₀) — faqat kalibrlash va signal hissasi. Yakuniy natijaning boshqa manbalari (suyultirish, massa, recovery) alohida GUM shablonida qo'shiladi — buni `openQuestions` da yozing.

Misol: [`templates/builtin/R-01.json`](../templates/builtin/R-01.json) (DRAFT; namunaviy nuqtalar — EURACHEM/CITAC QUAM:2012 Table A5.2). Test: `tests/templates/regression.test.js`.

## 10. TOP_DOWN rejimi (P09)

Sinov laboratoriyalari uchun: noaniqlik o'lchash modelidan emas, **validatsiya va sifat nazorati ma'lumotlaridan** (nazorat namunasi, dublikatlar, CRM, PT, recovery, standart usuldagi s_R) baholanadi — `"evaluationMode": "TOP_DOWN"`. Shablon "Top-down" yorlig'idagi ustada ochiladi: shablon → `buildTopDownState` → usta → `uc-topdown/1` → `evaluate()` ([ENGINE_API §8](ENGINE_API.md#8-top_down-rejimi-uc-topdown1-p09)).

```json
"evaluationMode": "TOP_DOWN",
"isEmpiricalMeasurand": true,
"measurand": { "symbol": "R", "name": {…}, "unit": "MPa" },
"model": { "formula": "u_c = sqrt(u_Rw^2 + u_inst^2 + u_v^2)", "note": {…} },
"inputs": [{ "symbol": "R", "unit": "MPa", "kind": "observation", "name": {…} }],
"typeBSources": [],
"topDown": {
  "basis": "within",
  "rwSources": ["duplicates"],
  "biasSource": "none",
  "scale": "relative",
  "covers": [],
  "linkedTemplate": "T-03",
  "additional": [
    { "id": "u_v", "category": "speed", "u": null, "name": {…}, "hint": {…} }
  ],
  "hint": {…}
}
```

| Maydon | Ma'nosi |
|---|---|
| `basis` | `within` — o'z laboratoriyasi ma'lumoti (u(R_w) + bias; Nordtest TR 537, QUAM §7.7); `sR` — standart usul / validatsiya hisobotidagi s_R, s_r (QUAM §7.6, A6); `level` — u(x) = √(s₀² + (x·s₁)²) (QUAM E.5) |
| `rwSources[]` | u(R_w) manbalari (`basis: within`): `control_series`, `duplicates`, `control_limits`, `stated` — bir nechtasi kvadratlar yig'indisi bilan birlashtiriladi |
| `biasSource` | `none`, `crm`, `pt`, `recovery` (Nordtest RMS), `recovery_quam` (R_m, t-test) |
| `scale` | `relative` (%) yoki `absolute` (kattalik birligida — `measurand.unit` majburiy). Nisbiy va mutlaq hissalar aralashtirilmaydi |
| `covers[]` | nazorat namunasi (yoki s_R) **qamraydigan** omillar toifalari (takrorlanuvchanlik va oraliq aniqlik har doim qamralgan) |
| `additional[]` | asos **qamramagan** omillar ro'yxati: `id`, `name`, `category`, `hint`; **`u` har doim `null`** — laboratoriya kiritadi |
| `linkedTemplate` | bog'langan GUM shabloni (model va asbob manbalari o'sha yerda — bu shablonda takrorlanmaydi) |
| `regressionTemplate` | kalibrlash egri chizig'i shabloni (`REGRESSION`) |
| `isEmpiricalMeasurand` (yuqori daraja) | usul bilan belgilanadigan kattalik: usul bias'i ta'rif bo'yicha 0 |

Qoidalar:

1. **Raqam o'ylab topilmaydi.** `topDown` bo'limida son umuman yo'q; `additional[].u` — faqat `null` (sxema boshqasini rad etadi). Bo'sh maydon bilan hisob qilinmaydi: qo'shimcha hissa qatori qoldirilib, `u` kiritilmasa — xato.
2. **X11 (ikki marta hisoblash).** `additional[]` dagi toifa `covers[]` da yoki ta'rif bo'yicha qamralgan toifalarda (`repeatability`, `intermediate_precision`; `sR` da `reproducibility`) bo'lsa — semantik xato. Hisob vaqtida foydalanuvchi shunday qator qo'shsa — natijada X11 ogohlantirishi.
3. **X12 (empirik kattalikda bias).** `isEmpiricalMeasurand: true` bo'lsa odatda `biasSource: "none"`: noaniqlik s_r, s_R va rejim parametrlari (`temperature`, `time`, `speed`) bardoshliligi hissalaridan tuziladi (QUAM §7.9.4, A6). Bias manbasi ko'rsatilsa — semantik **ogohlantirish** (xato emas): usta "Tayanch qiymat qaysi usul bilan olingan?" savolini majburiy beradi. Javobsiz — hissa qo'shiladi va X12 chiqadi; "boshqa usul / ta'rif" — hissa chiqariladi (§7.9.2); "shu usul" — qo'shiladi (§7.9.3). Egasi qarori 2026-11-17.
4. `typeBSources` va `variants` bu rejimda ishlatilmaydi; `model.formula` **tavsifiy** (tahlil qilinmaydi).
5. `recovery`, `recovery_quam` — faqat `scale: "relative"`; `basis: "level"` — faqat `scale: "absolute"`.
6. Bog'langan shablon natijasi avtomatik ko'chirilmaydi: masalan, TD-03 da T-03 dan faqat B tur (asbob) qismi qo'lda `additional` qatoriga kiritiladi — A tur qismi R_w ichida (aks holda X11).

Ichki shablonlar (hammasi **DRAFT**, raqamli maydonlari bo'sh):

| ID | Metodika | Asos | Manba |
|---|---|---|---|
| [`TD-01`](../templates/builtin/TD-01.json) | Suvda ammoniy azoti (NH₄-N) | u(R_w) + PT | Nordtest TR 537 ed. 4 §3.2 (p. 10), Appendix 4 (p. 40) |
| [`TD-02`](../templates/builtin/TD-02.json) | Oziq-ovqat namligi (empirik) | s_R + quritish harorati va vaqti | QUAM:2012 §7.6, §7.9, Example A6 |
| [`TD-03`](../templates/builtin/TD-03.json) | Beton siqilishdagi mustahkamligi (empirik) | dublikatlar + asbob (T-03 dan) + tezlik, harorat, yosh | QUAM:2012 §7.9; Nordtest §5.3; `linkedTemplate: "T-03"` |
| [`TD-04`](../templates/builtin/TD-04.json) | Og'ir metallar (AAS) | u(R_w) + CRM; kalibrlash R_w ichida | Nordtest §3.2, §6.1; `regressionTemplate: "R-01"` |

Test: `tests/templates/topdown.test.js`.

## 11. Maxsus rejimlar (P10)

To'rt rejim "Maxsus rejimlar" yorlig'ida ochiladi: shablon → `buildSpecialState` → oyna → `evaluate()` ([ENGINE_API §9](ENGINE_API.md#9-maxsus-rejimlar-p10)).

| `evaluationMode` | Mazmun | Manba | Holat |
|---|---|---|---|
| `SAMPLING` | namuna olish noaniqligi: dublikat usuli, ichma-ich ANOVA | EURACHEM/CITAC UfS:2019 | verified |
| `QUALITATIVE` | sifatli (binar) test: 2×2 jadval, SS, SP, ishonch intervallari | EURACHEM/CITAC AQA:2021 | verified |
| `MICROBIOLOGY` | mikrobiologik sanoq, log₁₀ shkala | ISO 19036 (repoda yo'q) | **BETA** |
| `MEDICAL` | tibbiy laboratoriya, IQC darajalari | ISO/TS 20914 (repoda yo'q) | **BETA** |

```json
"evaluationMode": "SAMPLING",
"measurand": { "symbol": "c", "name": {…}, "unit": "mg/kg" },
"model": { "formula": "s_meas = sqrt(s_samp^2 + s_anal^2)", "note": {…} },
"inputs": [{ "symbol": "c", "unit": "mg/kg", "kind": "observation", "name": {…} }],
"typeBSources": [],
"special": { "method": "classical", "logTransform": false, "hint": {…} }
```

Qoidalar:

1. `special` bo'limi majburiy. Maydonlari: `hint` (uch tilda); faqat `SAMPLING` uchun — `method` (`classical` / `robust`) va `logTransform`. **Raqamli maydon yo'q** — o'lchashlar, sanoqlar va IQC ma'lumotini laboratoriya oynada kiritadi.
2. `typeBSources` va `variants` ishlatilmaydi; `model.formula` tavsifiy.
3. `MEDICAL` uchun `measurand.unit` majburiy (nisbiy ↔ mutlaq o'tkazish birlik bilan bajariladi).
4. **BETA rejimlar** (`MICROBIOLOGY`, `MEDICAL`) manba misoli bilan tasdiqlanmagan: shablon tekshiruvi ogohlantirish beradi, **APPROVED holatiga o'tkazish — xato**. Natija va bosma hisobotda "BETA" belgisi va `*_unverified` ogohlantirishi chiqadi.

Ichki shablonlar (hammasi **DRAFT**, raqamsiz): [`SP-01`](../templates/builtin/SP-01.json) (namuna olish), [`SP-02`](../templates/builtin/SP-02.json) (sifatli test), [`SP-03`](../templates/builtin/SP-03.json) (mikrobiologiya, BETA), [`SP-04`](../templates/builtin/SP-04.json) (tibbiy laboratoriya, BETA). Test: `tests/ui/special.test.js`.

## 12. Vektor model: bir nechta chiqish (P07)

Bir o'lchashdan bir nechta kattalik olinsa (masalan R, X, Z — JCGM 100 H.2), shablonga ixtiyoriy `outputs` massivi qo'shiladi. Asosiy chiqish — odatdagi `model` (o'zgarmagan); `outputs` — **qo'shimcha** chiqishlar:

```json
"outputs": [
  { "symbol": "X", "name": { "uz": "…", "ru": "…", "en": "…" }, "unit": "Ω", "formula": "X = V / I * sin(phi)" }
]
```

- `symbol` va `formula` majburiy; belgilar takrorlanmasligi kerak (`duplicate_output`).
- Barcha chiqishlar bir xil kirish kattaliklaridan foydalanadi; chiqishlar orasidagi kovariatsiya avtomatik hisoblanadi (U_y = C_x·U_x·C_xᵀ, JCGM 102:2011 §6.2).
- Hisobotda: har bir chiqish alohida qator (y, u, k, U), korrelyatsiya matritsasi va qamrov sohasi (ellipsoid k_p, to'g'ri burchakli k_q).
- MPE va qaror qoidasi vektor hisobda umumiy sozlamadan olinmaydi (ENGINE_API §13.1).
- `outputs` siz shablonlar — o'zgarmagan. Namuna: `templates/builtin/MV-01.json` (DRAFT, raqamsiz). Shablon muharririda `outputs` maydoni hali yo'q — JSON orqali.

### 12.1. Muharrirda qo'shimcha chiqishlar (P07b)

Shablon muharririda (GUM rejimi) "Qo'shimcha chiqish kattaliklari" jadvali bor: har bir qator — belgi, birlik, formula va nom. "Chiqish qo'shish" band bo'lmagan belgi bilan (`y2`, `y3` …) bo'sh qator ochadi; belgi o'zgarsa formulaning chap tomoni ham yangilanadi; oxirgi qator o'chirilsa `outputs` maydoni olib tashlanadi. Tekshiruv (`checkTemplate`): belgi takrorlanmasligi va kirish / konstanta belgisi bilan to'qnashmasligi, formula tahlil qilinishi va faqat ma'lum belgilardan iborat bo'lishi, formulaning chap tomoni belgiga mos kelishi. APPROVED shablonda `outputs` qulflangan — o'zgartirish faqat yangi versiya orqali. Formulalarda `atan2(y; x)` ishlatish mumkin (masalan, faza). Raqamlar (kuzatuv, yarim kenglik) avvalgidek qo'shilmaydi.
