# AI yordamchi (P14) — loyiha hujjati

> **Holat: QORALAMA — egasi tasdig'ini kutadi (2026-11-19).** Tasdiqgacha repoda faqat shu hujjat va sof `src/ai/payload.js` (+ `tests/ai/payload.test.js`) bor; UI, prompt shablonlari, javob validatori, API chaqiruvi, CSP o'zgarishi — **yozilmagan**.
> Zid kelsa `CLAUDE.md`, `docs/PLAN.md` va egasining javoblari ustun. Ochiq savollar — §13.
> ISO/IEC 42001 — pullik, repoda yo'q: unga tayangan har bir band **(unverified)**, iqtibos keltirilmaydi.

## 1. Maqsad va qamrov

AI yordamchi — ixtiyoriy, standart holatda **o'chirilgan** qo'shimcha. U metrologning qo'l mehnatini kamaytiradi (matnni o'qish, qoralama tayyorlash, tushuntirish), lekin hisob va qaror zanjiriga kirmaydi.

| # | Funksiya | Kirish | Chiqish (har doim inson tasdig'idan o'tadi) |
|---|---|---|---|
| a | Metodika / standart matnidan shablon qoralamasi | foydalanuvchi yuklagan matn + `schemas/methodology.schema.json` | `AI_DRAFT` holatidagi foydalanuvchi shabloni |
| b | Kalibrlash sertifikatidan reestr yozuvi qoralamasi | sertifikat matni yoki rasmi / PDF | P11 reestr kartochkasi qoralamasi (`source: 'ai'`) |
| c | Natija va topilmalarni oddiy tilda tushuntirish (uz / ru / en) | faqat tuzilma (§4) | ekrandagi "AI izohi — rasmiy emas" matni |
| d | Byudjet uchun manba taklifi | model va mavjud manbalar turi | manba nomi + turi ro'yxati, **qiymatsiz** |

## 2. AI nima QILMAYDI (o'zgarmas tamoyillar)

1. **Hisoblamaydi.** y, u_c, ν_eff, k, U, interval, ball, statistik test — faqat deterministik dvigatel (`src/engine/`). P14 da `src/engine/` va `src/report/` ga **tegilmaydi**: `tests/security/engine.sha256.json` va `ENGINE_VERSION` (2.10.0) o'zgarmaydi; barcha misollar bit darajasida bir xil qoladi. AI javobidagi har qanday son — natija emas, **tasdiqlanadigan kirish taklifi** (faqat a va b da, manba parchasi bilan).
2. **O'zgartirmaydi.** AI hisobga, shablonga, reestrga, hisobotga o'zi yoza olmaydi. Javob faqat **qoralama maydonlarini** to'ldiradi; saqlash — foydalanuvchi tugmasi bilan, mavjud saqlash funksiyalari orqali (rol tekshiruvi va audit bilan).
3. **Majburiy emas.** `aiEnabled: false` (standart) da platforma to'liq ishlaydi; AI kodi faqat dinamik `import()` bilan, yoqilgandagina yuklanadi.
4. **Ishonchsiz ma'lumot.** AI javobi va yuklangan hujjat — ishonchsiz kirish: qat'iy `JSON.parse` + sxema; DOM ga faqat `escHtml` / `textContent`; `eval`, `Function`, `innerHTML` ga xom matn — yo'q. Hujjat ichidagi "ko'rsatma" hech qanday amalni ishga tushira olmaydi (§6, X-5).
5. **Rasmiy matn manbai emas.** Sertifikat / protokolning rasmiy matni faqat shablon va `src/report/` dan chiqadi.

## 3. Arxitektura

```
src/ai/                 SOF qism (DOM, window, saqlash, tarmoq yo'q; Node'da test qilinadi)
  payload.js            yuboriladigan ma'lumotni yig'ish + qo'riqchi (allowlist)      ← YOZILGAN
  prompts/*.js          prompt shablonlari: { id, version (semver), build(payload), responseSchemaId }
  response.js           javob validatori: JSON parse → schemas/ai/*.json → mazmun tekshiruvlari (§6)
  schema.js             JSON Schema ning ishlatiladigan qismi uchun kichik validator (kutubxonasiz)
  transport-api.js      "o'z kaliti" rejimi: so'rov tanasini yig'ish (sof); fetch tashqaridan beriladi
schemas/ai/*.json       javob sxemalari (har bir funksiya uchun)
src/ui/ai/              DOM qismi: oyna, ko'rinish (preview), tasdiqlash ro'yxati, kalit maydoni
src/js/i18n-ai.js       barcha matnlar uch tilda
src/storage/ai-audit.js audit yozuvlari (mavjud xesh zanjiriga, §7)
```

`src/ai/` dvigatelni **import qilmaydi** (natija obyektini argument sifatida oladi) va `src/engine/` uni import qilmaydi. `src/ui/ai/` — yagona kirish nuqtasi; uni faqat `aiEnabled` yoqilganda dinamik `import()` yuklaydi (test: AI o'chiq holatda `src/ai/` va `src/ui/ai/` modullari so'ralmaydi).

### 3.1. Ikki rejim (egasi qarori A)

| | **Nusxa-qo'y** (asosiy) | **O'z kaliti** (ixtiyoriy) |
|---|---|---|
| Tarmoq | **yo'q** (test: `fetch` chaqirilmaydi) | brauzer → `https://api.anthropic.com/v1/messages` |
| Kalit | yo'q | foydalanuvchining o'z Anthropic API kaliti, faqat `sessionStorage` |
| Oqim | prompt ko'rsatiladi → "Nusxalash" → foydalanuvchi o'zi tanlagan AI ga qo'yadi → javob JSON ini ilovaga qaytarib qo'yadi | prompt ko'rsatiladi → "Yuborish" → javob avtomatik qabul qilinadi |
| Rasm (b) | foydalanuvchi rasmni AI ga o'zi biriktiradi; ilova faqat matnli promptni beradi | rasm so'rovga biriktiriladi |
| Model | noma'lum (auditda `mode: 'paste'`, model yozilmaydi) | sozlamadagi model (auditda nomi) |

Ikkala rejimda ham javob **bir xil** validatordan (§6) o'tadi — nusxa-qo'y rejimida javobni kim bergani noma'lum, shuning uchun unga ishonch yo'q.

**Server orqali chaqiruv** — rejalashtirilgan, P15 dan keyin (kalit serverda, brauzerda emas). Hozir qilinmaydi.

### 3.2. Ma'lumot oqimi

```
hisob holati / natija ──► payload.js: quruvchi (faqat ruxsat etilgan maydonlar)
                              │
                              ▼
                        assertAllowed (shakl, son yo'q, shaxsiy ma'lumot yo'q) ──✗──► xato, hech narsa ketmaydi
                              │
                              ▼
        prompts/<id>@<versiya>: prompt = qat'iy matn + payload JSON (+ javob sxemasi)
                              │
                              ▼
      ┌──────── FOYDALANUVCHI TO'LIQ MATNNI KO'RADI ────────┐      audit: ai_prepare (xesh)
      │  [Nusxalash]                         [Yuborish]     │
      └──────┬──────────────────────────────────┬───────────┘      audit: ai_copy / ai_send (xesh)
             ▼                                  ▼
     tashqi AI (foydalanuvchi tanlagan)   api.anthropic.com
             │  javobni qo'lda qo'yadi          │
             └──────────────┬───────────────────┘
                            ▼
      response.js: JSON.parse → sxema → mazmun tekshiruvlari ──✗──► rad (sabab ko'rsatiladi)   audit: ai_response (xesh)
                            ▼
      QORALAMA oynasi: har bir qiymat alohida [Tasdiqlash] / [Rad etish]                        audit: ai_accept / ai_reject
                            ▼
      foydalanuvchi "Saqlash" ni bosadi ──► mavjud saqlash yo'li (rol, audit, AI_DRAFT / source:'ai')
                            ▼
      hisob — har doim dvigatelda; AI_DRAFT shablon bilan hisobot — "RASMIY EMAS"
```

## 4. Ma'lumot siyosati (egasi qarori B)

**Tashqariga faqat tuzilma ketadi.** Amalga oshirish — `src/ai/payload.js`, ikki qatlam:

1. **Quruvchi** (`buildExplainPayload`, `buildSourceSuggestPayload`, `buildTemplateDraftPayload`, `buildCertificatePayload`) holatdan faqat ruxsat etilgan maydonlarni **oladi** — qolgani ko'chirilmaydi ("hammasini olib, keraksizini o'chirish" emas).
2. **Qo'riqchi** (`assertAllowed`) tayyor payload ni shakl tavsifi (`PAYLOAD_SHAPES`) bo'yicha qayta tekshiradi. Shakl tavsifida **`number` turi yo'q** — son tipidagi har qanday qiymat xato (`ai_payload_number`). Noma'lum kalit, ro'yxatda yo'q qiymat, chegaradan uzun matn, shaxsiy ma'lumotga o'xshash matn — xato. `serializePayload` qo'riqchini har doim chaqiradi, ya'ni tekshirilmagan matn chiqa olmaydi.

### 4.1. Ruxsat ro'yxati (ALLOWLIST)

| Maydon | Qayerdan | Funksiya |
|---|---|---|
| Model formulasi / tenglamalar matni (konstantalari bilan), chiqish belgisi va birligi | `model`, `outputs[]`, `implicit.equations` | c, d |
| Kattalik nomlari (belgi) va birliklari; A tur kuzatuvi bor / yo'q (mantiqiy) | `params`, `units`, `implicit.unknowns[].name` | c, d |
| Model turi (`error` / `value` / `unknown`), korrelyatsiya bor / yo'q (mantiqiy), rejim (`GUM`, `TOP_DOWN` …) | `settings.modelKind`, `paired`, `covB` | c, d |
| Manba: neytral belgi (`B1`, `B2` …), kirish, taqsimot turi, manba turi, birlik, reestrdan olingan / yo'q | `typeB[]` | c, d |
| Topilma: kod, qoida, daraja, me'yoriy havola, kirish belgisi, qabul qilingan / yo'q | `result.findings[]` | c |
| Topilma matni — i18n **shabloni** (`{p}`, `{s}`, `{v}` to'ldirilmagan) | `src/js/i18n-linter.js` | c |
| Hissalar **tartibi** (kattadan kichikka): tur, kirish, manba belgisi — raqamsiz | `result.budget[]` | c |
| Shablon sxemasi identifikatori (sxemaning o'zi — ochiq, statik) | `schemas/methodology.schema.json` | a |
| Foydalanuvchi yuklagan hujjat matni yoki rasmi | foydalanuvchi | **faqat a, b — alohida tasdiq bilan** |
| Javob tili (`uz` / `ru` / `en`) | interfeys | hammasi |

### 4.2. Yuborilmaydi

O'lchov qiymatlari va kuzatuvlar; yarim kenglik, U, k, ν, sezgirlik koeffitsiyenti; natijalar (y, u_c, U, k, ν_eff, hissa va ulush, ballar, p_c, TUR); MPE / tolerans / CMC qiymatlari; `P`; y⁽⁰⁾ boshlang'ich qiymatlari; nuqta yorliqlari; mijoz / buyurtmachi; shaxs ismlari; laboratoriya rekvizitlari; akkreditatsiya raqami; sertifikat raqami va kalibrlovchi tashkilot (reestr nusxasidan); sanalar; hisob ID / xesh; login va rol; qabul izohlari; topilmaning `value` va `source` maydonlari; fayl nomi.

**Manba nomi** (erkin matn) standart holatda yuborilmaydi — o'rniga `B1`, `B2` …: etalon misollarning o'zida nomda raqam bor ("Tarozi kalibrlovi (U, k=2)"), shaxs ismi yoki sertifikat raqami ham bo'lishi mumkin. Nomni qo'shish — `includeSourceNames` (§13, S-1).

### 4.3. Redaksiya

- Tuzilma maydonlarida (formula, belgi, birlik, nom) email, telefon, STIR / INN yoki API kalitiga o'xshash matn topilsa — payload **rad etiladi** (`ai_payload_sensitive`); foydalanuvchiga qaysi maydon ekani ko'rsatiladi.
- Hujjat matnida (a, b) shunday parchalar topilsa — **ogohlantirish** (toifa va soni); matn avtomatik o'zgartirilmaydi (avtomatik "tozalash" yolg'on xavfsizlik hissi beradi va ismlarni ishonchli topa olmaydi). Foydalanuvchi matnni ko'rinish oynasida o'zi tahrirlashi mumkin. API kalitiga o'xshash matn hujjatda ham **bloklanadi**.
- Chegaralar — `AI_LIMITS` (yagona joy): hujjat 400 000 belgi, rasm ≈ 6 MB.

### 4.4. Foydalanuvchi ko'rinishi va tasdig'i

Har ikki rejimda yuborish / nusxalashdan oldin **to'liq matn** ko'rsatiladi (`previewPayload` — matnli payload uchun `serializePayload` bilan aynan bir xil; test tekshiradi). Rasm bo'lsa — rasmning o'zi ko'rsatiladi. Tugma: "Yuborish" yoki "Nusxalash". a va b da qo'shimcha belgi qo'yiladigan tasdiq: *"Hujjatda shaxs ismlari bo'lishi mumkin; nusxa-qo'y rejimida o'zingiz olib tashlashingiz mumkin"* — belgilanmasa payload qurilmaydi (`ai_document_consent_required`).

## 5. Funksiyalar bo'yicha tafsilot

### a) Shablon qoralamasi
- Javob → `schemas/ai/template-draft.schema.json` → `schemas/methodology.schema.json` (mavjud `src/templates/validator.js`) → o'lchamlik tekshiruvi (P04 birliklar) → linter.
- Yangi holat **`AI_DRAFT`** (sxemaga qo'shiladi): `AI_DRAFT → DRAFT` faqat metrolog tasdig'i bilan (admin; audit). `AI_DRAFT` dan to'g'ridan-to'g'ri `APPROVED` ga o'tish **yo'q** (`AI_DRAFT → DRAFT → REVIEWED → APPROVED` — mavjud zanjir). `AI_DRAFT` shablon bilan hisob — "RASMIY EMAS" suv belgisi. Builtin shablonda `AI_DRAFT` taqiqlangan (`validationBasis` kabi).
- **Har bir raqam** (`halfWidth`, `k`, `nu`, `settings.mpe` …) javobda `evidence: { quote, section }` bilan keladi. Dastur `quote` kirish matnida **aynan** borligini tekshiradi (bo'shliqlar normallashtirilgan holda) va raqamning o'zi shu parchada uchrashini tekshiradi; topilmasa — qiymat tashlanadi, maydon bo'sh qoladi. Foydalanuvchi har birini alohida tasdiqlaydi.
- 1-to'lqin qoidasi saqlanadi: tasdiqlanmagan raqam shablonga yozilmaydi.

### b) Sertifikatdan reestr yozuvi
- Ajratiladi: sertifikat raqami, kalibrlovchi **tashkilot** nomi, sana, amal qilish muddati, kuzatuvchanlik yo'li, nuqtalar (X, tuzatma, U, k). Har biri `evidence` (sahifa, parcha) bilan; matnli kirishda parcha tekshiriladi, rasmli kirishda parcha faqat foydalanuvchiga ko'rsatiladi (dastur tekshira olmaydi — oynada shunday yoziladi).
- Tasdiqlanmagan maydon bo'sh qoladi. `k` berilmagan bo'lsa — bo'sh (2 deb faraz qilinmaydi — P11 qoidasi).
- Javob sxemasida shaxs ismi uchun maydon **yo'q**; saqlashdan oldin `cleanStandard` (noma'lum maydonlar tashlanadi). Yozuvga `source: 'ai'` (yangi ixtiyoriy maydon, `cleanStandard` ga qo'shiladi — bu `src/engine/lab/` da; **§13, S-4**).
- Saqlash — mavjud `saveRegistry` (rol: `employee` etalonni tahrirlay olmaydi).

### c) Tushuntirish
- Kirish faqat §4.1. Javob: `{ summary, items: [{ code, text }] }`; `code` faqat yuborilgan kodlardan biri bo'lishi shart (aks holda band tashlanadi).
- Javob matnida **raqam bo'lishi mumkin emas** degan qat'iy filtr qo'yilmaydi (me'yoriy band raqamlari bor), lekin promptda natija qiymatlari yo'q — AI ularni bilmaydi. Ekranda: "AI izohi — rasmiy emas; raqamlar uchun hisobotga qarang".
- Bosma hisobotga faqat foydalanuvchi tanlasa, alohida ichki ilova sifatida, belgi bilan; hisob hujjati (`uc-calc/1`) va uning xeshiga **kirmaydi**.

### d) Manba taklifi
- Javob: `[{ input, name, kind, distribution?, why }]` — son maydoni sxemada yo'q. Qo'shilsa, manba **qiymatsiz** qo'shiladi (P11 interpolyatsiya manbasi kabi).
- **MPE filtri:** `kind: 'specification'` va kirish kalibrlanayotgan asbobga tegishli bo'lsa, yoki nom / izohda MPE, "ruxsat etilgan xato", "допускаемая погрешность", "maximum permissible error", "klass" kabi belgilar bo'lsa — taklif ko'rsatilmaydi (kalibrlanayotgan asbobning MPE si manba emas — `CLAUDE.md`). Qolganlari uchun ham linter X1 amal qiladi.

## 6. Xavflar va nazorat

| # | Xavf | Nazorat | Test |
|---|---|---|---|
| X-1 | Gallyutsinatsiya — raqam o'ylab topish | raqam faqat a, b da; har biri `evidence.quote` bilan, parcha kirishda aynan topilishi shart; alohida tasdiq | `response.test.js`: parcha yo'q → rad |
| X-2 | Noto'g'ri birlik / o'lchamlik | shablon validatori + P04 o'lchamlik tekshiruvi + linter (X6); xato bo'lsa qoralama saqlanmaydi | `response.test.js`: birlik mos emas |
| X-3 | Yashirin tuzatma (AI natijani "yaxshilaydi") | AI ga natija yuborilmaydi; javob sxemasida natija maydoni yo'q; dvigatel xeshi o'zgarmagan | `payload.test.js`, `static.test.js` |
| X-4 | Manba havolasini to'qish (yo'q band, yo'q standart) | c da me'yoriy havola faqat linterning `ref` maydonidan ko'rsatiladi (AI matnidan emas); a da `standards[]` foydalanuvchi tasdig'isiz kirmaydi; `CLAUDE.md` dagi nashrlar ro'yxatidan tashqari havola — "(unverified)" | `response.test.js` |
| X-5 | Prompt injection (hujjat ichidagi "ko'rsatma") | javob faqat ma'lumot: qat'iy sxema, `additionalProperties: false`; amal bajaruvchi maydon yo'q; URL / skript matn sifatida escape qilinadi; saqlash faqat foydalanuvchi tugmasi bilan | `response.test.js`: HTML / skript, ortiqcha maydon |
| X-6 | Kalit sizishi | faqat `sessionStorage`; `type=password`; hech qayerga yozilmaydi; xato matnlarida kalit yo'q; CSP `connect-src` faqat bitta yangi domen | `key.test.js`, `tests/security/` |
| X-7 | Model versiyasi o'zgarishi | model — sozlama; auditda model nomi va prompt versiyasi; javob har doim validatordan o'tadi, ya'ni model o'zgarsa ham noto'g'ri javob kirmaydi | `response.test.js` |
| X-8 | Ma'lumot chiqib ketishi | §4 allowlist + qo'riqchi + ko'rinish | `payload.test.js` (kanareyka, barcha misollar) |
| X-9 | AI_DRAFT shablonning rasmiy hisobotga tushishi | holat `AI_DRAFT` → "RASMIY EMAS"; builtin da taqiqlangan | `tests/templates/` |
| X-10 | Foydalanuvchi AI ga ortiqcha ishonishi | belgilar ("AI taklifi", "rasmiy emas"); har bir qiymat alohida tasdiq; "Hammasini tasdiqlash" tugmasi **yo'q** (§13, S-5) | UI testi |
| X-11 | Javobda juda katta / chuqur JSON | hajm chegarasi (parse dan oldin), massiv uzunliklari sxemada | `response.test.js` |

## 7. Audit izi

Mavjud xesh zanjiriga (`src/storage/audit.js`, `store.appendAudit`) yoziladi; `entity: 'ai'`.

| Amal | Qachon |
|---|---|
| `ai_prepare` | prompt tayyorlandi va ko'rsatildi |
| `ai_copy` / `ai_send` | nusxalandi / API ga yuborildi |
| `ai_response` | javob qabul qilindi (validatsiya natijasi: `ok` / rad kodi) |
| `ai_accept` / `ai_reject` | har bir qiymat (maydon yo'li bilan) |
| `ai_enable` / `ai_disable` | laboratoriya sozlamasi o'zgardi |

Yozuv `after`: `{ fn, mode: 'paste' | 'api', model (faqat api), promptId, promptVersion, payloadHash, responseHash, field?, outcome? }`; `actor` — **rol** (`cleanRole`), ism emas. Xeshlar — SHA-256 (`src/storage/canonical.js`).

**Yozilmaydi:** API kaliti, prompt matni, javob matni, hujjat matni / rasmi, tasdiqlangan qiymatning o'zi (u o'z yozuvida — shablon / reestr auditida — qoladi). Test: audit eksportida kanareyka matnlari yo'q.

## 8. Rollar va o'chirib qo'yish

- Laboratoriya sozlamasi **`aiEnabled`** (`LAB_DEFAULTS`, standart `false`) va `aiModel`. Faqat `admin` / `superadmin` o'zgartiradi; lokal `guest` rejimida — P11 dagi kabi ogohlantirish darajasida (§13, S-6).
- `employee`: c va d dan foydalanadi; a va b qoralamasini tayyorlay oladi, lekin saqlash mavjud rol qoidalari bo'yicha (shablonni `DRAFT` ga o'tkazish va etalonni saqlash — admin).
- O'chirilganda: menyu bandi ko'rinmaydi, modullar yuklanmaydi, kalit `sessionStorage` dan o'chiriladi.

## 9. "O'z kaliti" rejimi — API tafsilotlari

Manba: platform.claude.com hujjatlari, **2026-11-19 da tekshirildi**.

| Band | Qiymat | Manba |
|---|---|---|
| So'rov | `POST https://api.anthropic.com/v1/messages` | API overview |
| Sarlavhalar | `x-api-key: <kalit>`, `anthropic-version: 2026-10-21`, `content-type: application/json` | API overview; Authentication |
| Brauzerdan chaqirish | `anthropic-dangerous-direct-browser-access: true` — busiz CORS so'rovi qabul qilinmaydi | Authentication → "Browser-based applications" |
| Javob shakli | `output_config: { format: { type: 'json_schema', schema } }` (beta sarlavhasiz); sxemada `additionalProperties: false`; `minimum` / `maxLength` / `oneOf` qo'llab-quvvatlanmaydi | Structured outputs |
| Standart model | **`claude-opus-5-5`** — hujjat tavsiyasi: "If you're unsure which model to use, start with Claude Opus 5.5" | Models overview |
| Boshqa modellar (sozlama) | `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-fable-5-2` | Models overview |
| Rasm / PDF | barcha joriy modellar rasm kirishini qo'llaydi; `image` / `document` bloki (base64) | Models overview |
| Yuborilmaydigan parametrlar | `temperature`, `top_p`, `top_k` (2026-10-21 da 400); `thinking` (ko'rsatilmaydi — adaptiv); majburiy `tool_choice` | API version migration; Errors |
| `stop_reason` | `end_turn` dan boshqasi (`refusal`, `max_tokens`) — javob rad etiladi, foydalanuvchiga sabab | Messages API |
| Xatolar | 401 (kalit; yoki `CORS requests are not allowed for this Organization` — tashkilot sozlamasi, kalit xatosi emas), 429, 529 — matn i18n orqali, kalit ko'rsatilmaydi | Errors |

**SDK ishlatilmaydi** — `fetch` bilan to'g'ridan-to'g'ri so'rov. Sabab: loyiha qoidasi — framework yo'q, tashqi kutubxona faqat `vendor/` da aniq versiya bilan; bitta `POST` uchun SDK ni vendor qilish ta'minot zanjiri xavfini (R-14) oshiradi. SDK ning brauzer rejimi ham aynan yuqoridagi sarlavhani yuboradi.

**Anthropic ogohlantirishi (hujjatdan):** API ni brauzerdan emas, o'z serveringizdan chaqiring — sahifadagi kalitni sahifadan foydalanuvchi o'qiy oladi. Bizda bu xavf torroq, chunki kalit **foydalanuvchining o'ziniki** va faqat uning brauzerida, tab yopilguncha turadi; lekin XSS bo'lsa kalit o'g'irlanishi mumkin — shuning uchun CSP (`script-src 'self'`), `innerHTML` qoidasi va X-6 nazoratlari. To'liq yechim — server orqali chaqiruv (P15 dan keyin).

**Rad etilganda zaxira model** (`fallbacks`) — beta parametr; qo'shilmaydi: rad etilgan so'rov foydalanuvchiga ko'rsatiladi, u nusxa-qo'y rejimidan foydalanishi mumkin.

**CSP:** `connect-src` ga faqat `https://api.anthropic.com` qo'shiladi (uchta HTML da ham; `tests/security/` tekshiradi). Eslatma: CSP `<meta>` da bo'lgani uchun u AI o'chiq holatda ham amal qiladi — ya'ni ruxsat doim bor, lekin uni ishlatadigan kod yuklanmaydi (§13, S-7).

**Kalit:** `sessionStorage['uc_ai_key_v1']`; maydon `type="password"`, `autocomplete="off"`; "Kalitni o'chirish" tugmasi; `aiEnabled` o'chirilsa — o'chiriladi. `localStorage`, IndexedDB, Firebase, eksport, audit, konsol logi — **hech qachon**.

## 10. ISO/IEC 42001 tamoyillari bo'yicha (unverified)

| Tamoyil | Bu loyihada |
|---|---|
| Hayotiy sikl, o'zgarishlarni boshqarish | prompt shablonlari `id` + semver; o'zgarsa versiya oshadi va `CHANGELOG.md` da "ilova" yozuvi; tartib — [validation/CHANGE_CONTROL.md](validation/CHANGE_CONTROL.md) (AI bandi qo'shiladi); auditda prompt versiyasi |
| Inson nazorati | har bir taklif tasdiqdan o'tadi; saqlash faqat foydalanuvchi amali; `AI_DRAFT → DRAFT` metrolog tasdig'i |
| Ma'lumot sifati va minimallashtirish | §4 allowlist; raqam uchun manba parchasi |
| Shaffoflik | "AI taklifi" / "AI izohi — rasmiy emas" belgilari; `AI_DRAFT`; `source: 'ai'`; yuboriladigan matn to'liq ko'rinadi |
| Audit va javobgarlik | §7; rol bo'yicha |
| Xavfni baholash | §6; `docs/RISKS.md` R-28 |
| O'chirib qo'yish | `aiEnabled`, standart `false` |

## 11. Shaxsiy ma'lumotlar

- Tuzilma payload ida shaxsiy ma'lumot yo'q (§4). Xavf — faqat a va b dagi **foydalanuvchi yuklagan hujjat**da (imzolovchi ismi va h.k.).
- "O'z kaliti" rejimida ma'lumot **chet eldagi xizmatga** (Anthropic) ketadi; nusxa-qo'y rejimida — foydalanuvchi o'zi tanlagan xizmatga. O'RQ-547 (O'RQ-1125 tahriri) bo'yicha **yuridik baho egasida** (`docs/DATA_RESIDENCY.md`); dastur ogohlantiradi va tasdiq so'raydi, yuridik xulosa bermaydi.
- Yangi shaxsiy maydon hech qayerga yozilmaydi; Firebase'ga AI bilan bog'liq hech narsa yozilmaydi.

Ogohlantirish matni (taklif — §13, S-3): *"Yuboriladigan matn Anthropic (AQSh) xizmatiga jo'natiladi va ushbu ilovadan tashqarida qayta ishlanadi. Matnda shaxsga doir ma'lumot bo'lmasligi kerak — hujjatni yuborishdan oldin tekshiring. Kalit faqat shu brauzer oynasida saqlanadi va oyna yopilganda o'chadi."*

## 12. Testlar va qabul mezonlari

| Fayl | Nima isbotlanadi | Holat |
|---|---|---|
| `tests/ai/payload.test.js` | allowlist: barcha GUM misollari (9 etalon nuqta bilan) va kanareyka qiymatlar (o'lchov, natija, ism, mijoz, rekvizit, hisob ID, P11 / P12 yozuvlari) — payload da yo'q; payload da son yo'q; qo'riqchi; hujjat tasdig'i; modul sof | **yozilgan, yashil** |
| `tests/ai/response.test.js` | noto'g'ri JSON, sxemaga mos emas, parcha yo'q raqam, birlik mos emas, MPE taklifi, HTML / skript | tasdiqdan keyin |
| `tests/ai/key.test.js` | kalit faqat `sessionStorage` da; nusxa-qo'y rejimida `fetch` yo'q | tasdiqdan keyin |
| `tests/security/` | CSP `connect-src` — faqat bitta yangi domen; inline skript yo'q; i18n uch tilda | tasdiqdan keyin |
| mavjud UI testlari | AI o'chiq holatda o'zgarishsiz; AI modullari yuklanmaydi | tasdiqdan keyin |

Haqiqiy API ga test chaqiruvi yo'q (faqat mock). Qabul: `npm test` yashil; `engine.sha256.json` o'zgarmagan; `docs/validation/` (REQUIREMENTS, RTM, KNOWN_LIMITATIONS, ASSESSOR_FAQ), `CLAUDE.md`, `docs/RISKS.md` R-28, `CHANGELOG.md`, `docs/PLAN.md` yangilangan.

## 13. Egasidan so'raladiganlar

**Majburiy to'xtash nuqtasi: shu hujjat tasdig'i.** Quyidagilarga javob kerak (tavsiya birinchi turadi):

| # | Savol | Variantlar |
|---|---|---|
| S-1 | Manba **nomi** (erkin matn) c va d da yuborilsinmi? | **(a) yo'q — faqat `B1`, `B2` + tur va taqsimot** (hozir shunday); (b) foydalanuvchi har safar belgilasa — ha (ko'rinishda ko'radi); (c) har doim. (a) da d funksiya "bu manba allaqachon bor" ekanini faqat turidan biladi — takliflar biroz takrorlanishi mumkin. |
| S-2 | Standart model | **(a) `claude-opus-5-5`** (hujjat tavsiyasi); (b) `claude-sonnet-5-5` (arzonroq, tezroq); (c) `claude-haiku-5-5`. Sozlamada o'zgartiriladi. |
| S-3 | "O'z kaliti" ogohlantirish matni | §11 dagi matn — tasdiqlash yoki tahrir. |
| S-4 | `source: 'ai'` belgisi reestr yozuvida | `cleanStandard` noma'lum maydonni tashlaydi va u `src/engine/lab/` da — **dvigatelga tegilmaydi** tamoyili bilan to'qnashadi. **(a) belgi faqat audit izida va saqlash qatlamida** (`src/storage/registry.js` yozuvga `origin: 'ai'` qo'shadi; dvigatel o'zgarmaydi; `cleanStandard` dan keyin o'qilsa belgi yo'qolmasligi uchun saqlash qatlami uni alohida olib o'tadi); (b) `cleanStandard` ga ixtiyoriy `source` maydoni qo'shiladi — natijaga ta'sir qilmaydi, lekin dvigatel xeshi o'zgaradi (ENGINE_VERSION patch). |
| S-5 | "Hammasini tasdiqlash" tugmasi | **(a) yo'q** — har bir qiymat alohida (sertifikatda 20 nuqta bo'lsa — 80 ta bosish); (b) nuqtalar jadvali uchun "qatorni tasdiqlash" (X, tuzatma, U, k birga); (c) "hammasini". |
| S-6 | Lokal `guest` rejimida AI ni yoqish | **(a) ruxsat, auditda `guest`** (P11 dagi kabi); (b) faqat tizimga kirgan admin. |
| S-7 | CSP dagi `https://api.anthropic.com` | CSP `<meta>` da — AI o'chiq laboratoriyalarda ham ruxsat ochiq turadi (kod yuklanmaydi). **(a) qabul qilinadi**; (b) "o'z kaliti" rejimi alohida sahifada (`ai.html`, o'z CSP si bilan) — asosiy sahifalar CSP si o'zgarmaydi. |
| S-8 | `AI_DRAFT → DRAFT` o'tkazishda izoh | **(a) majburiy izoh ≥ 10 belgi** (topilmani qabul qilish kabi); (b) izohsiz. |
| S-9 | Asos branch | `claude/create-uncertainty-platform-y5EVM` da P13 **birlashtirilmagan** (PR ochilmagan; `feat/p13-validation-package` alohida turibdi). Bu branch P13 uchidan (`7a34766`) olingan. **(a) avval P13 birlashtiriladi, keyin shu PR asosiy branchga qaratiladi**; (b) boshqa tartib. |
