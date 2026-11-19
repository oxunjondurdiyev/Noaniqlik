# NIST Uncertainty Machine (NUM) bilan mustaqil o'zaro tekshiruv

> **Holat: `pending`.** Kirish ma'lumotlari tayyor; NUM ni **loyiha egasi** ishga tushiradi va natijalarni shu papkadagi fayllarga kiritadi. Platforma kodi NUM ni ishga tushirmaydi va tarmoqqa chiqmaydi.
> NUM foydalanuvchi qo'llanmasi repoda yo'q (egasi qo'shadi) — NUM ga oid quyidagi ko'rsatmalar **(unverified)**: taqsimot nomlari, parametrlar tartibi va chiqish maydonlari NUM versiyasiga qarab farq qilishi mumkin; ishga tushirishdan oldin NUM ning o'z hujjati bilan solishtiring.

## Nima uchun

Platformaning avtomatik testlari kutilgan qiymatlarni me'yoriy hujjat misollaridan oladi (`tests/cases/`). Bu yerda esa **boshqa, mustaqil dastur** (NIST Uncertainty Machine) bilan solishtiriladi: bir xil model va kirish taqsimotlari → GUM (Gauss formulasi) va Monte-Karlo natijalari.

## Misollar (5 ta, har bir tur uchun bittadan — mavjud `verified` misollardan)

| Fayl | Asos misol | Tur |
|---|---|---|
| `num-01-linear.json` | `jcgm101-9-2-2-mcm` | chiziqli model, Gauss kirishlar |
| `num-02-nonlinear.json` | `jcgm101-9-3-mcm` | nochiziqli model, Gauss va to'g'ri burchakli kirishlar |
| `num-03-correlated.json` | `jcgm101-9-4-mcm-x001-r09` | korrelyatsiyali kirishlar (r = 0,9) |
| `num-04-t-input.json` | `excel-gas-p2-mc` | t-taqsimotli kirish (A tur, ν = 2) |
| `num-05-mcm-needed.json` | `jcgm101-9-4-mcm-x0-r0` | MCM ga muhtoj model (LPU yaroqsiz) |

Fayllar `node tests/tools/gen-num-inputs.js` bilan misollardan **avtomatik** yaratilgan (raqamlar qo'lda yozilmagan; `tests/validation/crosscheck.test.js` fayl ↔ misol mosligini har `npm test` da tekshiradi). Qayta yaratilganda siz kiritgan `status` va `results` saqlanadi.

## Fayl tuzilmasi

- `num.expression` — chiqish kattaligining ifodasi (R sintaksisiga yaqin: `+ - * / ^`, qavslar).
- `num.inputs[]` — kirish kattaliklari. Bir kirishning bir nechta noaniqlik manbasi bo'lsa, har biri alohida o'zgaruvchi (`I`, `I_b1`, `I_b2` …) va ifodada yig'indi sifatida yozilgan.
  - `gaussian`: `mean`, `sd`;
  - `rectangular`: `lower`, `upper`;
  - `student-t`: `center` (siljish), `scale` (masshtab), `df` (erkinlik darajalari) — siljitilgan va masshtablangan t-taqsimot (JCGM 101:2008 §6.4.9).
- `num.correlations[]` — `{ a, b, r }` korrelyatsiya koeffitsiyenti.
- `num.coverage` — qamrov ehtimoli; `num.nrep` — Monte-Karlo sinovlari soni (10⁶).

## Egasi bajaradigan qadamlar

1. NUM ni oching (NIST sayti; dastur nomi — "NIST Uncertainty Machine"). Versiyasini / sanani yozib qo'ying.
2. Har bir fayl uchun: kirish kattaliklari sonini, nomlarini, taqsimot va parametrlarini `num.inputs` dan kiriting; chiqish ifodasini `num.expression` dan; korrelyatsiya bo'lsa — `num.correlations` dan; sinovlar soni 1 000 000; qamrov ehtimoli `num.coverage`.
3. Hisobni ishga tushiring. NUM chiqishidagi sonlarni **ko'rsatilgan raqamlari bilan aynan** (satr sifatida, yaxlitlamasdan va raqam qo'shmasdan) faylga yozing:

```json
"status": "owner-run",
"results": {
  "numVersion": "…", "date": "2026-…", "nrep": 1000000, "seed": "…",
  "gum.y": "…", "gum.u": "…",
  "mc.mean": "…", "mc.sd": "…",
  "mc.low": "…", "mc.high": "…",
  "intervalType": "symmetric"
}
```

   - `gum.*` — NUM ning Gauss formulasi (GUM) natijasi: baho va standart noaniqlik; `mc.*` — Monte-Karlo: o'rtacha, standart og'ish, qamrov intervali uchlari.
   - `intervalType`: NUM bergan interval ehtimollik bo'yicha simmetrik bo'lsa `"symmetric"`, eng qisqa bo'lsa `"shortest"` (NUM hujjatidan aniqlang — unverified).
   - NUM bermagan kattalikni yozmang (maydonni tashlab keting). NUM chiqishining to'liq matnini ham shu papkaga `num-0N-output.txt` qilib qo'shsangiz — yaxshi.
4. `npm test` — `tests/validation/crosscheck.test.js` kiritilgan natijalarni platforma natijasi bilan solishtiradi.

## Solishtirish toleransi (`lib.js::compare`)

- NUM ko'rsatgan oxirgi xonaning ±½ birligi; **va** Monte-Karlo kattaliklari uchun ikki mustaqil MCM ning tarqoqligi: o'rtacha — 4·√2·u/√M, standart og'ish — 4·√2·u/√(2M), interval uchlari — 3 baravar kengroq (kvantil bahosi). Koeffitsiyentlar — loyiha qarori; egasi birinchi natijalarni kiritganda qayta ko'rib chiqiladi (`docs/RISKS.md` R-27 (3)). Tolerans "o'tkazish uchun" kengaytirilmaydi: farq bo'lsa — tahlil va `tests/cases/DISCREPANCIES.md`.
- `num-04-t-input`: ν = 2 da u(y) aniqlanmagan (JCGM 101:2008 §6.4.9.4) — platforma standart og'ishni bermaydi, faqat interval solishtiriladi.

## Qilinmagan

- PTB TraCIM bilan tekshiruv — rejalashtirilgan (`docs/validation/KNOWN_LIMITATIONS.md`).
- `ctrap`, `ushape` va boshqa taqsimotli misollar (JCGM 101 §9.5) — tayyorlovchi hozircha Gauss, to'g'ri burchakli va t-taqsimotni qo'llaydi.
