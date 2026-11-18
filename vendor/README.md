# vendor/ — tashqi kutubxonalar

Qoida (CLAUDE.md): tashqi kutubxonalar faqat shu papkada, **aniq versiya**, **LICENSE fayli** va **SHA-256** bilan. CDN'dan skript yuklanmaydi (CSP `script-src 'self'`). Fayllar o'zgartirilmagan nusxalar; xeshlar — [`SHA256SUMS.txt`](SHA256SUMS.txt) (`tests/security/vendor.test.js` har safar qayta hisoblab solishtiradi).

| Kutubxona | Versiya | Fayl | Litsenziya | Manba | Qachon yuklanadi |
|---|---|---|---|---|---|
| Firebase JS SDK (compat) | 9.23.0 | `firebase/9.23.0/*.js` | Apache-2.0 (protobuf — BSD-3-Clause) | npm `firebase@9.23.0` — [`firebase/9.23.0/README.md`](firebase/9.23.0/README.md) | sahifa ochilganda (`<script>`) |
| SheetJS Community Edition | **0.20.3** | `sheetjs/0.20.3/xlsx.js` | Apache-2.0 — [`sheetjs/0.20.3/LICENSE`](sheetjs/0.20.3/LICENSE) | rasmiy tarqatma `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (arxivdagi `package/xlsx.mjs` va `package/LICENSE`) | faqat `.xlsx` import / eksport bosilganda (`import()`) |
| qrcode-generator | **2.0.4** | `qrcode-generator/2.0.4/qrcode.js` | MIT — [`qrcode-generator/2.0.4/LICENSE`](qrcode-generator/2.0.4/LICENSE) | npm `qrcode-generator@2.0.4` (`package/dist/qrcode.mjs`) | faqat hisobot ochilganda (`import()`) |

**Fayl nomi.** Asl arxivlardagi `xlsx.mjs` va `qrcode.mjs` shu yerda `.js` kengaytmasi bilan saqlangan (mazmuni baytma-bayt o'zgarmagan — SHA-256 arxivdagi fayl bilan bir xil). Sabab: ba'zi statik serverlar `.mjs` ni `application/octet-stream` deb beradi va brauzer modulni rad etadi; `.js` har doim JavaScript MIME turi bilan beriladi. Node uchun har bir papkada `package.json` (`"type": "module"`).

## SHA-256

| Fayl | SHA-256 |
|---|---|
| `xlsx-0.20.3.tgz` (yuklab olingan arxiv) | `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8` |
| `sheetjs/0.20.3/xlsx.js` | `1a0fb062ee9781b13f6687371b202aaefc53b6ce55b530c027e01f9c087b77db` |
| `qrcode-generator-2.0.4.tgz` (npm arxivi) | `02e2e18a99a90b02dad940851f59b7c3c5fd1ab79cbdece8595cb06328878159` |
| `qrcode-generator/2.0.4/qrcode.js` | `ea91d7118a5395289170da848b7c6758b996163bfbccf312591ab65a4911b7c0` |

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
