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

This project is deployed on **GitHub Pages** from the `claude/create-uncertainty-platform-y5EVM` branch.

To deploy your own fork:
1. Fork this repository
2. Go to **Settings → Pages**
3. Set source to the root of your branch
4. Access at `https://<username>.github.io/uncertainty-platform`

---

## License

MIT — Free to use for educational, research, and commercial laboratory applications.

---

*Built for metrology professionals in Uzbekistan and worldwide.*
