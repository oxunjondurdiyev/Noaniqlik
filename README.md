# Measurement Uncertainty Calculator

**ISO/IEC 17025:2017 · GUM:2008 Compliant**

A professional, multi-file measurement uncertainty calculator for metrology laboratories and calibration professionals.

🌐 **Live Demo:** [https://oxunjondurdiyev.github.io/uncertainty-platform](https://oxunjondurdiyev.github.io/uncertainty-platform)

---

## Features

### Core Functionality
- **Type A Uncertainty** — Automatic statistical analysis (mean, standard deviation, standard uncertainty of the mean)
- **Type B Uncertainty** — 4 distribution methods with interactive component table
- **Combined Uncertainty** — Law of propagation of uncertainty (GUM 5.1)
- **Expanded Uncertainty** — k=2 (≈95%) and k=3 (≈99%) coverage factors
- **Welch-Satterthwaite** — Effective degrees of freedom calculation
- **ISO/IEC 17025 Print Report** — Professional printable uncertainty budget

### User Interface
- **Dark / Light theme** toggle (eye-friendly: dark `#1e2235`, light `#f5f7fa`)
- **Language switcher** — Uzbek (UZ), Russian (RU), English (EN), saved in localStorage
- **Welcome screen** — Configure n (measurements) and p (parameters count)
- **Sidebar** — Edit parameters, add/remove, resize measurement table at any time
- **Auto-detect derived quantities** — density (m/V), power (U·I), area (L·W), resistance (U/I)

### Type B Distributions (GUM 4.3)

| Distribution | Divisor | Typical Use |
|---|---|---|
| **Rectangular (uniform)** | √3 | Resolution, limits from specs |
| **Normal (Gaussian)** | 2 (k=2) | Calibration certificates |
| **Triangular** | √6 | Two-sided limit with mode at center |
| **U-shape (arcsine)** | √2 | Oscillation, cyclical variation |

### Presets

| Category | Presets |
|---|---|
| **Mass & Volume** | Mass, Volume, Density (ρ = m/V) |
| **Electrical** | DC Voltage, Resistance, Power (P = U·I) |
| **Dimensional** | Length, Area (A = L·W), Temperature |

---

## Project Structure

```
uncertainty-platform/
├── index.html              # Main SPA entry point
├── src/
│   ├── css/
│   │   ├── theme.css       # Dark/light theme CSS variables
│   │   ├── layout.css      # App shell, sidebar, content layout
│   │   └── components.css  # Buttons, inputs, tables, cards
│   ├── js/
│   │   ├── i18n.js         # Internationalization (UZ/RU/EN)
│   │   ├── state.js        # Centralized app state management
│   │   ├── calc.js         # GUM formulas: Type A, B, combined
│   │   ├── table.js        # Dynamic measurement data table
│   │   ├── typeB.js        # Type B component manager (4 methods)
│   │   ├── report.js       # Results display + ISO print report
│   │   └── app.js          # Main controller, bootstrap
│   └── data/
│       └── presets.js      # Lab measurement presets
└── README.md
```

---

## Standards & References

- **ISO/IEC 17025:2017** — General requirements for testing and calibration laboratories
- **GUM:2008** — Guide to the Expression of Uncertainty in Measurement (JCGM 100:2008)
- **EURACHEM/CITAC CG4** — Quantifying Uncertainty in Analytical Measurement

### Key Formulas

**Type A (GUM 4.2):**
```
x̄ = (1/n) Σ xᵢ
s²(x) = [1/(n-1)] Σ(xᵢ − x̄)²
u_A = s(x) / √n
```

**Type B (GUM 4.3):**
```
u_B = a / k    where k = √3 (rect), 2 (normal), √6 (triang), √2 (U-shape)
```

**Combined (GUM 5.1):**
```
u_c² = u_A² + Σ(cᵢ · u_Bᵢ)²
```

**Expanded (GUM 5.2):**
```
U = k · u_c    (k=2: ~95%, k=3: ~99%)
```

**Welch-Satterthwaite (GUM G.4):**
```
ν_eff = u_c⁴ / Σ[(cᵢ · uᵢ)⁴ / νᵢ]
```

---

## Usage

### Quick Start
1. Open the app (or visit the GitHub Pages URL)
2. Enter the number of measurements (n ≥ 2) and parameters
3. Optionally load a preset for your measurement type
4. Click **Start Calculation**

### Data Entry Tab
- Enter measurement values in the table
- Deviations and statistics are auto-calculated
- Click **Calculate Type A Uncertainty** to proceed

### Type B Tab
- Click **Add Component** for each uncertainty source
- Select distribution type (rect/normal/triangular/U-shape)
- Enter the half-width (a) from the certificate or specification
- Set the sensitivity coefficient (cᵢ = ∂y/∂xᵢ) for derived quantities

### Results Tab
- View the full uncertainty budget
- Combined and expanded uncertainties displayed
- Click **Print Report** for ISO/IEC 17025 formatted output

---

## Deployment

The site is published on **GitHub Pages**. Since P13 the intended path is a **versioned build via GitHub Actions** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), [`scripts/build-site.js`](scripts/build-site.js)): every local module / script / stylesheet reference gets `?v=<commit SHA, 12 chars>`, a `build.json` is written, and only a whitelist of files is published. The source tree still runs **without any build step** (local development, or Pages served straight from the branch).

- Owner steps to switch Pages to "GitHub Actions", what is published, and the post-deploy checklist: [docs/DEPLOY.md](docs/DEPLOY.md). Until the switch is made, the site keeps being served from the `claude/create-uncertainty-platform-y5EVM` branch without the build step.
- Local build: `node scripts/build-site.js --no-report` → `_site/`.

---

## Validation package (P13)

Software-validation material intended for an accreditation body (ISO/IEC 17025:2017 §7.11.2 — *unverified*: the standard is not in this repository):

| What | Where |
|---|---|
| Validation plan, change control, known limitations, PQ / URS templates, assessor FAQ (Uzbek) | [docs/validation/](docs/validation/) |
| Requirements with stable IDs and the traceability matrix (requirement → code → test → status) | [REQUIREMENTS.md](docs/validation/REQUIREMENTS.md), [RTM.md](docs/validation/RTM.md) (generated: `node scripts/rtm.js --write`) |
| Automatic validation report (tests, every reference case with source / expected / actual / tolerance, RTM coverage, cross-browser section) | `node scripts/validation-report.js` → `_validation/validation-report.html` (script-free) and `.json`; CI artifact `validation-report`; on the built site under `validation/` |
| Cross-browser reproducibility (Chromium, Firefox, WebKit via Playwright; rounded results must be identical, raw values within 1·10⁻¹⁴ — measured values are in the report) | `npm run test:browsers`, [tests/crossbrowser/](tests/crossbrowser/) |
| Bit-level regression check between two states of the code | `node scripts/cases-snapshot.js --out a.json` … `--compare a.json b.json` |
| Independent cross-check with the NIST Uncertainty Machine (inputs prepared; results **pending** — to be run by the owner) | [tests/crosscheck/num/](tests/crosscheck/num/README.md) |
| User manual (uz / ru / en) | [docs/manual/](docs/manual/) |

Not done: cross-check with PTB TraCIM (planned); Safari is checked manually (Playwright's Linux WebKit is not Safari). Open owner decisions: [docs/RISKS.md](docs/RISKS.md) R-27. The complete list of unverified / BETA / not-implemented items: [docs/validation/KNOWN_LIMITATIONS.md](docs/validation/KNOWN_LIMITATIONS.md).

---

## Development & security (P02)

```bash
npm install          # devDependencies only — nothing from node_modules is served
npm test             # reference Excel points, source cases, security, RTM, build and validation-report checks
npm run test:all     # + Firestore rules tests in the Firebase Emulator (needs Java 11+)
```

- Authentication: Firebase Authentication (login → synthetic email), Firestore access controlled by [`firestore.rules`](firestore.rules).
- Console setup for the project owner: [docs/SECURITY_SETUP.md](docs/SECURITY_SETUP.md); migrating existing users: [docs/AUTH_MIGRATION.md](docs/AUTH_MIGRATION.md); personal data inventory: [docs/DATA_RESIDENCY.md](docs/DATA_RESIDENCY.md).
- Firebase SDK is vendored in `vendor/firebase/` (Apache-2.0); the pages use a CSP with `script-src 'self'`.

---

## License

Copyright © 2026 Oxunjon Durdiyev. All rights reserved — see [LICENSE](LICENSE).
Barcha huquqlar himoyalangan — [LICENSE](LICENSE) ga qarang. Third-party components in `vendor/` and documents in `docs/references/` keep their own terms.

---

*Built for metrology professionals in Uzbekistan and worldwide.*
