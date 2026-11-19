# Deploy — versiyalangan yig'ish va GitHub Pages (P13)

> Egasi qarori A (2026-11-19, `docs/RISKS.md` R-22 (b)): deploy GitHub Actions orqali; yig'ishda har bir mahalliy modul havolasiga `?v=<commit SHA, 12 belgi>` qo'shiladi; `build.json` yoziladi. **Repodagi manba kodi build qadamisiz ishlashda davom etadi** (lokal ishlab chiqish).

## 1. Nima uchun

Avval sayt branch'dan to'g'ridan-to'g'ri (build qadamisiz) chiqar edi. Deploy'dan keyin ~10 daqiqa brauzer keshida eski va yangi ES modullar aralashib, konsolda `export` xatosi chiqardi. Endi bitta build ning barcha fayllari bitta versiya (`?v=…`) bilan yuklanadi; sahifa `build.json` orqali yangi versiya chiqqanini biladi va banner ko'rsatadi (avtomatik qayta yuklash yo'q — kiritilgan ma'lumot yo'qolmasin).

## 2. Zanjir (`.github/workflows/deploy.yml`)

Asosiy branch'ga (`claude/create-uncertainty-platform-y5EVM` yoki `main`) push →

1. **test** (`test.yml`, `workflow_call`): `npm test`; Firestore qoidalari (Emulator); **validation** — Playwright (Chromium, Firefox, WebKit) da brauzerlararo tekshiruv, validatsiya hisoboti (`_validation/`, artifact `validation-report`, 90 kun), yig'ilgan sayt tutun-testi.
2. **build**: `node scripts/build-site.js --out=_site --validation=_validation` — oq ro'yxat bo'yicha nusxa, `?v=<sha12>`, `build.json`, qo'llanma va validatsiya hujjatlari (markdown → skriptsiz HTML), validatsiya hisoboti; yakuniy tekshiruv (uzilgan / versiyasiz havola, taqiqlangan fayl bo'lsa — build to'xtaydi). Natija — Pages artifact.
3. **deploy**: `actions/deploy-pages` — **faqat** repozitoriy o'zgaruvchisi `PAGES_DEPLOY = actions` bo'lsa (quyida).

Ruxsatlar minimal: `contents: read`; deploy job'da qo'shimcha `pages: write`, `id-token: write`. Asosiy branch'ga push'da `test.yml` alohida ishga tushmaydi (testlar `deploy.yml` ichida bir marta yuradi); boshqa branch va PR larda — avvalgidek.

## 3. Saytga nima chiqadi (oq ro'yxat — `scripts/build-site.js::WHITELIST`)

| Chiqadi | Chiqmaydi |
|---|---|
| `index.html`, `admin.html`, `superadmin.html`, `validation.html`, `.nojekyll`, `LICENSE` | `tests/`, `docs/` (jumladan `docs/references/` dagi PDF lar), `scripts/`, `node_modules/`, `.github/` |
| `src/`, `vendor/` (bayt darajasida o'zgarmagan), `schemas/`, `templates/builtin/` | `package.json`, `package-lock.json`, `firestore.rules`, `firebase.json`, `CLAUDE.md`, `README.md`, `CHANGELOG.md` |
| yaratiladi: `build.json`, `manual/{uz,ru,en}.html`, `validation/docs/*.html`, `validation/validation-report.{html,json}` | `.xlsx`, `.docx`, `.pdf` fayllar |

**Diqqat:** hozir (branch'dan deploy) butun repozitoriy saytda ochiq — jumladan `docs/`, `tests/`. "GitHub Actions" ga o'tgach ular saytda bo'lmaydi (GitHub'dagi repozitoriyda qoladi). Oq ro'yxat va validatsiya hisobotini ommaviy qilish — egasi tasdig'ini kutadi (`docs/RISKS.md` R-27 (2)).

`build.json`:

```json
{ "format": "uc-build/1", "commit": "<40 hex>", "shortSha": "<12 hex>", "engineVersion": "2.10.0",
  "engineHash": "<64 hex — src/engine + src/report, MANBADAN>", "builtAt": "<UTC>", "node": "v22…",
  "versions": [{ "version": "2.10.0", "date": "2026-11-19", "title": "…" }] }
```

`engineHash` yig'ilgan fayllardan emas, manbadan hisoblanadi va `tests/security/engine.sha256.json` bilan mos bo'lishi tekshiriladi. `versions` — `CHANGELOG.md` sarlavhalaridan.

## 4. Egasi bajaradigan amallar (bir marta)

1. GitHub → repozitoriy → **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.
2. GitHub → **Settings → Secrets and variables → Actions → Variables → New repository variable**: nom `PAGES_DEPLOY`, qiymat `actions`.
3. (Agar so'ralsa) **Settings → Environments → github-pages → Deployment branches**: asosiy branch ruxsat etilganini tekshiring.
4. Asosiy branch'ga keyingi push'da (yoki **Actions → deploy → Run workflow**) sayt yig'ilgan holda chiqadi.

**O'tkazilguncha:** 2-qadam bajarilmaguncha `deploy` job o'tkazib yuboriladi (qizil emas), sayt avvalgidek **branch'dan, build qadamisiz** chiqadi va ishlayveradi: `build.json` yo'q → banner chiqmaydi, hisobot pastida build "dev" (dvigatel xeshi) deb ko'rsatiladi, "Validatsiya" sahifasi "build qadamisiz" eslatmasini beradi, kesh muammosi (Ctrl+F5) saqlanadi. `test` va `build` job'lari baribir ishlaydi — yig'ish har push'da tekshiriladi, validatsiya hisoboti artifact sifatida saqlanadi.

Tartib muhim: avval 1-qadam, keyin 2-qadam (aksincha bo'lsa `deploy` job "Pages manbasi GitHub Actions emas" xatosi bilan yiqiladi).

## 5. Birinchi deploy'dan keyingi tekshiruv ro'yxati (IQ)

- [ ] `https://<sayt>/build.json` ochiladi; `commit` — asosiy branch'dagi oxirgi commit; `engineVersion` — `src/engine/version.js` dagi; `engineHash` — `tests/security/engine.sha256.json` dagi.
- [ ] Sayt ochiladi, brauzer konsolida xato yo'q (F12 → Console).
- [ ] F12 → Network: `src/…/*.js` va `*.css` so'rovlarining hammasida `?v=<shortSha>` bor.
- [ ] "Validatsiya" sahifasi (`validation.html`): build, yig'ilgan vaqt, dvigatel xeshi ko'rinadi; "Validatsiya hisoboti" havolasi ochiladi; hisobot boshida "Barcha avtomatik tekshiruvlar o'tdi".
- [ ] Qo'llanma havolalari (uz / ru / en) ochiladi.
- [ ] Hisob bajarib, bosma hisobot pastida **Build = `<shortSha>`** ("dev" belgisisiz) va **Hisoblangan muhit** (brauzer nomi va versiyasi) chiqishini tekshiring; JSON eksportda `env` va `build` maydonlari bor.
- [ ] Monte-Karlo ishlaydi (progress ko'rinadi — Web Worker versiyalangan manzildan yuklangan).
- [ ] Banner: saytni ochiq qoldiring → asosiy branch'ga yangi commit → deploy tugagach yorliqqa qayting (yoki ≈ 10 daqiqadan keyin) → "Yangi versiya chiqdi — sahifani yangilang" banneri chiqadi; sahifa o'zi yangilanmaydi; yangilagach banner yo'qoladi.
- [ ] Eski manzillar: `…/docs/…`, `…/tests/…` endi 404 (kutilgan).
- [ ] Firebase kirish (login) ishlaydi — CSP o'zgarmagan.

Natijani `docs/validation/PQ_PROTOCOL_TEMPLATE.md` dagi "muhit" bo'limiga yozib qo'ying.

## 6. Lokal ishlatish

```bash
npm ci
npm test                                   # RTM, build testlari ham shu yerda
npx playwright install chromium firefox webkit   # bir marta (brauzerlararo tekshiruv uchun)
npm run test:browsers                      # crossbrowser-results.json
node scripts/validation-report.js --crossbrowser=crossbrowser-results.json   # _validation/
node scripts/build-site.js                 # _site/  (hisobotsiz sinov: --no-report)
npm run test:site                          # yig'ilgan sayt tutun-testi (Playwright)
```

`_site/`, `_validation/`, `crossbrowser-results.json` — `.gitignore` da. Build manba fayllarini o'zgartirmaydi (skript `git status` bilan tekshiradi).

## 7. Qayta tiklash (rollback)

Xato deploy'da: asosiy branch'da xato commit'ni qaytaring (`git revert`) — yangi push yangi build chiqaradi. Oldingi build artifact'ini qayta deploy qilish uchun: **Actions → deploy → kerakli (oldingi) ishga tushirish → Re-run jobs**. Favqulodda holatda 4-bo'limdagi 2-qadamni bekor qilish (`PAGES_DEPLOY` ni o'chirish) va Pages manbasini yana branch'ga qaytarish mumkin — sayt build qadamisiz ishlaydi.

## 8. Cheklovlar

- `templates/builtin/*.json` va `schemas/*.json` runtime'da `cache: 'no-cache'` bilan o'qiladi (har safar qayta tekshiriladi) — ularga `?v=` qo'shilmaydi.
- HTML sahifaning o'zi (`index.html`) GitHub Pages keshida ≈ 10 daqiqa qolishi mumkin: bu vaqtda eski sahifa **eski versiyali** modullarni so'raydi — aralashuv bo'lmaydi; `build.json` yangi bo'lgani uchun banner chiqadi.
- Linux dagi Playwright WebKit — Safari emas; Safari (macOS / iOS) qo'lda tekshiriladi (PQ).
- GitHub Actions `action` lari teg bo'yicha (`@v4`, `@v3`) ko'rsatilgan, commit SHA bo'yicha qotirilmagan.
