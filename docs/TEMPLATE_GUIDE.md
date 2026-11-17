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
| `constants[]` | o'zgarmas (noaniqligi 0): `value: null` — laboratoriya standartdan kiritadi. Formulada bo'lsa — kirish sifatida (u = 0); faqat manba formulasida bo'lsa — son sifatida qo'yiladi |
| `variants[]` | bitta modelning standartga xos ko'rinishlari: `formula`, `inputs`, `constants` (masalan `{"f": null}`), ixtiyoriy `measurand`, `excludeSources`, `decisionRule` |
| `typeBSources[]` | `id`, `input`, `name`, `kind`, `distribution` (`normal` — U/k; `rect` — a/√3; `triang` — a/√6; `resol` — d/(2√3); `ushape` — a/√2), `halfWidth` (son, **formula** — `"0.0002*I + 0.002"`, yoki `null`), `k`, `nu`, `unit`, `instrument`, `correlated`, `includeByDefault`, `hint` |
| `correlations[]` | bitta asbob bilan o'lchangan kirishlar: `inputs`, `r`, `sharedInstrument`, `ask: true` (UI so'raydi), `question` |
| `openQuestions[]` | hal qilinmagan savollar (⚠ belgili joylar shu yerga) |
| `decisionRule` | qaror qoidasi (to'liq — P05) |

**Bitta asbob korrelyatsiyasi.** `instrument` bir xil va `correlated: true` bo'lgan manbalar umumiy sistematik ta'sir hisoblanadi: u(xᵢ, xⱼ) = r · u_X(xᵢ) · u_X(xⱼ) (JCGM 100:2008 §5.2.2, F.1.2.3). Ajratish qobiliyati (`resol`) har bir o'qishda mustaqil — `correlated: false`.

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
"constants": [{ "symbol": "rho_w", "unit": "g/cm³", "value": null, "ref": "ma'lumotnoma jadvali", "name": {…}, "hint": {…} }],
"inputs": [
  { "symbol": "m0", "unit": "g", "kind": "observation", "typeA": {"method": 1}, "name": {…} },
  { "symbol": "m1", "unit": "g", … }, { "symbol": "m2", "unit": "g", … }
],
"typeBSources": [
  { "id": "m0_cert", "input": "m0", "kind": "certificate", "distribution": "normal", "halfWidth": null, "k": null,
    "unit": "g", "instrument": "balance", "correlated": true, "name": {…}, "hint": {…} },
  { "id": "m0_res", "input": "m0", "kind": "resolution", "distribution": "resol", "halfWidth": null,
    "unit": "g", "instrument": "balance", "correlated": false, … }
  … m1, m2 uchun xuddi shunday …
],
"correlations": [{ "id": "masses", "inputs": ["m0", "m1", "m2"], "r": 1, "sharedInstrument": "balance", "ask": true, "defaultEnabled": true, "question": {…} }]
```

Natija: birliklar tekshiriladi (g/g · g/cm³ = g/cm³ ✓); hisob sahifasida ρ_w maydoni va "m0, m1, m2 bitta tarozida tortiladimi?" savoli chiqadi; javob "ha" bo'lsa uchta juftlik uchun kovariatsiya qo'shiladi.

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
