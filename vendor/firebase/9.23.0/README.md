# Firebase JS SDK 9.23.0 (compat) — vendor nusxasi

- Manba: npm paketi `firebase@9.23.0` (`https://registry.npmjs.org/firebase/-/firebase-9.23.0.tgz`), fayllar o'zgartirilmagan.
- Litsenziya: Apache-2.0 (protobuf qismi — BSD-3-Clause), to'liq matn: [LICENSE](LICENSE).
- Nima uchun vendor: CLAUDE.md qoidasi (tashqi kutubxonalar `vendor/` da, aniq versiya va litsenziya bilan) va CSP `script-src 'self'` (RISKS R-14).

| Fayl | SHA-256 |
|---|---|
| firebase-app-compat.js | `1586b85e7ecc265235f1e224c1ac1b44a2f3edb19e50e0ed369491f9bb239478` |
| firebase-auth-compat.js | `1242c193650f903910325afa222e364b8db720057cf4f6159692f3eb61bf2c9a` |
| firebase-firestore-compat.js | `b206cb711185de987a37eca683dce8cbd905403581bc994277419b18c2811f47` |

Tekshirish (`tests/security/vendor.test.js` ham shuni qiladi):

```bash
sha256sum vendor/firebase/9.23.0/*.js
```

Yangilash: yangi versiyani `vendor/firebase/<versiya>/` ga qo'yish, ushbu jadval va `tests/security/vendor.test.js` dagi xeshlarni yangilash, HTML'lardagi yo'llarni almashtirish.
