# vendor/ — tashqi kutubxonalar

Qoida (CLAUDE.md): tashqi kutubxonalar faqat shu papkada, **aniq versiya**, **LICENSE fayli** va **SHA-256** bilan. CDN'dan skript yuklanmaydi (CSP `script-src 'self'`). Fayllar o'zgartirilmagan nusxalar; xeshlar — [`SHA256SUMS.txt`](SHA256SUMS.txt) (`tests/security/vendor.test.js` har safar qayta hisoblab solishtiradi).

| Kutubxona | Versiya | Fayl | Litsenziya | Manba | Qachon yuklanadi |
|---|---|---|---|---|---|
| Firebase JS SDK (compat) | 9.23.0 | `firebase/9.23.0/*.js` | Apache-2.0 (protobuf — BSD-3-Clause) | npm `firebase@9.23.0` — [`firebase/9.23.0/README.md`](firebase/9.23.0/README.md) | sahifa ochilganda (`<script>`) |
| SheetJS Community Edition | **0.20.3** | `sheetjs/0.20.3/xlsx.js` | Apache-2.0 — [`sheetjs/0.20.3/LICENSE`](sheetjs/0.20.3/LICENSE) | rasmiy tarqatma `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (arxivdagi `package/xlsx.mjs` va `package/LICENSE`) | faqat `.xlsx` import / eksport bosilganda (`import()`) |
| qrcode-generator | **2.0.4** | `qrcode-generator/2.0.4/qrcode.js` | MIT — [`qrcode-generator/2.0.4/LICENSE`](qrcode-generator/2.0.4/LICENSE) | npm `qrcode-generator@2.0.4` (`package/dist/qrcode.mjs`) | faqat hisobot ochilganda (`import()`) |
| Inter (o'zgaruvchan shrift) | **5.3.0** (Fontsource yig'masi) | `fonts/inter/5.3.0/*.woff2` (lotin, kirill, yunon) | SIL OFL 1.1 — [`fonts/inter/5.3.0/LICENSE`](fonts/inter/5.3.0/LICENSE) | npm `@fontsource-variable/inter@5.3.0` (`package/files/`) | sahifa ochilganda (`@font-face`, `src/css/tokens.css`) |
| Space Grotesk (o'zgaruvchan) | **5.3.0** (Fontsource yig'masi) | `fonts/space-grotesk/5.3.0/*.woff2` (lotin; **kirill to'plami shriftda yo'q**) | SIL OFL 1.1 — [`fonts/space-grotesk/5.3.0/LICENSE`](fonts/space-grotesk/5.3.0/LICENSE) | npm `@fontsource-variable/space-grotesk@5.3.0` | sarlavhalar |
| JetBrains Mono (o'zgaruvchan) | **5.3.0** (Fontsource yig'masi) | `fonts/jetbrains-mono/5.3.0/*.woff2` (lotin, kirill) | SIL OFL 1.1 — [`fonts/jetbrains-mono/5.3.0/LICENSE`](fonts/jetbrains-mono/5.3.0/LICENSE) | npm `@fontsource-variable/jetbrains-mono@5.3.0` | raqamlar (tabular) |

**Fayl nomi.** Asl arxivlardagi `xlsx.mjs` va `qrcode.mjs` shu yerda `.js` kengaytmasi bilan saqlangan (mazmuni baytma-bayt o'zgarmagan — SHA-256 arxivdagi fayl bilan bir xil). Sabab: ba'zi statik serverlar `.mjs` ni `application/octet-stream` deb beradi va brauzer modulni rad etadi; `.js` har doim JavaScript MIME turi bilan beriladi. Node uchun har bir papkada `package.json` (`"type": "module"`).

## SHA-256

| Fayl | SHA-256 |
|---|---|
| `xlsx-0.20.3.tgz` (yuklab olingan arxiv) | `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8` |
| `sheetjs/0.20.3/xlsx.js` | `1a0fb062ee9781b13f6687371b202aaefc53b6ce55b530c027e01f9c087b77db` |
| `qrcode-generator-2.0.4.tgz` (npm arxivi) | `02e2e18a99a90b02dad940851f59b7c3c5fd1ab79cbdece8595cb06328878159` |
| `qrcode-generator/2.0.4/qrcode.js` | `ea91d7118a5395289170da848b7c6758b996163bfbccf312591ab65a4911b7c0` |

## Shriftlar (P16)

Inter (matn), Space Grotesk (sarlavhalar), JetBrains Mono (raqamlar) — hammasi **SIL Open Font License 1.1**; fayllar npm dagi Fontsource paketlaridan baytma-bayt o'zgarmagan holda olingan (`package/files/<nom>-<to'plam>-wght-normal.woff2`, `package/LICENSE`). **Lotin va kirill** to'plamlari; Inter uchun qo'shimcha **yunon** to'plami (egasi qarori 2026-11-20: ν, σ, ρ tizim shriftiga tushmasin — Space Grotesk va JetBrains Mono zanjirida ham Inter turadi). Matematik belgilar (√, ≤, pastki indekslar) tizim shriftidan olinadi. Space Grotesk da kirill yo'q — kirill sarlavhalar `unicode-range` orqali avtomatik Inter bilan chiziladi.

Shu sababli **Google Fonts ishlatilmaydi**: CSP dan `fonts.googleapis.com` / `fonts.gstatic.com` olib tashlangan (`font-src 'self'`), foydalanuvchining IP manzili uchinchi tomonga ketmaydi (`tests/security/vendor.test.js`).

| Fayl | SHA-256 |
|---|---|
| `fontsource-variable-inter-5.3.0.tgz` (npm arxivi) | `d26710dd38e7217484a1d47ee76c024977ec550548876f26d06ed1844af09a14` |
| `fonts/inter/5.3.0/inter-cyrillic-wght-normal.woff2` | `71d5ee93cc1e9f1d520a3a8b66456de18c7879d8df09d57fcd2eaff75fef0075` |
| `fonts/inter/5.3.0/inter-greek-wght-normal.woff2` | `1be3448e292fbf05ffe176fe1e43f135013d50b1e7d324ad1a558f623d3bb6f6` |
| `fonts/inter/5.3.0/inter-latin-wght-normal.woff2` | `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62` |
| `fontsource-variable-jetbrains-mono-5.3.0.tgz` (npm arxivi) | `996fe6368a480c9ce15d4de22a2682b7c40b403718fee2b15e7272f244fd993f` |
| `fonts/jetbrains-mono/5.3.0/jetbrains-mono-cyrillic-wght-normal.woff2` | `d274604c40757f98f07df623a8b8fb5194508a6fa4f5413a7a107f09e3b7452a` |
| `fonts/jetbrains-mono/5.3.0/jetbrains-mono-latin-wght-normal.woff2` | `18be452724bfdc236c074ca94a249a7f41a86752c7d04ab258ce9ed5651f6a7e` |
| `fontsource-variable-space-grotesk-5.3.0.tgz` (npm arxivi) | `47d1b51d64ed541b7e74f38e9e682a8ff1bbfd1b68bfd7fff74ac9175058e73c` |
| `fonts/space-grotesk/5.3.0/space-grotesk-latin-wght-normal.woff2` | `0640890476fc1198ab4de571fb658de443c4d85b66466ec09534a8737ab1ce9d` |

## SheetJS: nima uchun npm'dagi `xlsx` emas

npm reestridagi `xlsx` paketi **0.18.5** da to'xtagan va unda tuzatilmagan zaifliklar bor: CVE-2023-30533 (prototype pollution; 0.19.3 da tuzatilgan) va CVE-2024-22363 (ReDoS; 0.20.2 da tuzatilgan). Shuning uchun faqat rasmiy `cdn.sheetjs.com` tarqatmasi, **0.20.2 dan past bo'lmagan** versiya ishlatiladi. `package.json` da `xlsx` bog'liqligi **yo'q** (test `tests/security/vendor.test.js` tekshiradi); testlardagi `.xlsx` o'qish — devDependency `exceljs`.

Qo'shimcha himoya (kutubxonadan tashqari, `src/io/`): fayl hajmi va qatorlar soni chegarasi; formulalar bajarilmaydi — faqat saqlangan qiymatlar o'qiladi; o'qilgan matn HTML ga faqat `escHtml` orqali tushadi; fayl faqat brauzerda o'qiladi (tarmoqqa yuborilmaydi).

## qrcode-generator

npm paketida alohida LICENSE fayli yo'q: `package.json` da `"license": "MIT"` va manba sarlavhasida "Copyright (c) 2009 Kazuhiko Arase … Licensed under the MIT license". `LICENSE` fayli shu asosda MIT matni bilan tuzilgan. "QR Code" — DENSO WAVE INCORPORATED ning ro'yxatdan o'tgan savdo belgisi.

## Yangilash

1. Arxivni rasmiy manbadan yuklab oling, SHA-256 ni yozib qo'ying.
2. Faylni `vendor/<nom>/<versiya>/` ga o'zgartirmasdan nusxalang, LICENSE bilan.
3. `cd vendor && sha256sum … > SHA256SUMS.txt`; shu jadvalni va `src/io/vendor.js` dagi yo'llarni yangilang.
4. `npm test`.
