# UncertaintyCalc — User Manual

This manual explains how to evaluate measurement uncertainty on the UncertaintyCalc platform. The numbers in the example for each mode are taken only from verified (`verified`) test cases; each example states the source document and the test identifier (`id` in `tests/cases/`). Button and tab names in this manual match the English text of the interface.

The manual describes engine version 2.10.0. The current version is shown at the bottom of every report.

## 1. Introduction

### 1.1. What the platform does

UncertaintyCalc is a program that runs in the browser. It calculates the measurement result `y`, the combined standard uncertainty `u_c`, the effective degrees of freedom `ν_eff`, the coverage factor `k` and the expanded uncertainty `U`, builds the uncertainty budget and prepares a printable report. The interface is available in three languages: Uzbek, Russian and English.

The working window has seven tabs: **Data Entry**, **Type B** and **Results** (GUM mode, Monte Carlo, vector models), **Regression**, **Top-down**, **Special modes** and **Laboratory**.

### 1.2. Normative basis

| Document | Used on the platform for |
|---|---|
| JCGM 100:2008 (GUM) | Type A and Type B evaluation, law of propagation, ν_eff, k |
| JCGM 101:2008 | Monte Carlo method |
| JCGM 102:2011 | several output quantities, coverage region, implicit model |
| JCGM 106:2012 | conformity assessment, decision rule |
| EA-4/02 M:2022 | uncertainty in calibration, k = 2 |
| ILAC P14:09/2020 | rounding of U, CMC |
| ILAC G8:09/2019 | decision rules and statements of conformity |

The text of ISO/IEC 17025:2017 is not in the repository (it is a paid standard). References to it in the program (for example, the list of report details) have not been compared with the text of the standard and are treated as **unverified**.

### 1.3. Browser requirements

A browser that supports ES modules is required (versions released after 2018). An older browser shows only a warning. The status of browser checks is given in the [known limitations](../validation/KNOWN_LIMITATIONS.md).

### 1.4. Where data is stored

- The current calculation, the language and the interface settings are kept in the browser's `localStorage`.
- Templates, the registry of standards, the CMC table, QC charts, proficiency testing and validation sets, and the audit trail are kept in the browser's IndexedDB.
- Laboratory details (name, address, accreditation number, logo) are kept in `localStorage`. Customer and authoriser details are kept only for the current session (`sessionStorage`) and are deleted when the window is closed.
- Firebase is used only for registration, organisations and payment. Calculations, observations, the registry and reports are not sent to a server.

It follows that calculations are lost if the browser data is cleared or you move to another computer. Save an important calculation to a file with **Export JSON** (section 11), and export the store through **Data: export / import / audit**.

## 2. Quick start

1. **Choose the language.** The **UZ / RU / EN** buttons are at the top of the home page. The choice is saved in the browser.
2. **Open the calculator.** Press **Open Calculator**. Without registering you can run 7 free calculations; the number left is shown on the set-up page. After that you need to **Register** or **Sign in**.
3. **Set up the calculation.** On the **Set Up Your Calculation** page enter the **Number of measurements (n)** and the **Number of parameters (p)**. To start from a ready-made sample, choose one in the **Load a preset** list or open the **Template catalogue**. Then press **Start Calculation →**.
4. **Enter the observations.** On the **Data Entry** tab type the measured values into the table. You can paste from Excel (Ctrl+V) or use **Import from file (.xlsx, .csv)**. Input quantities are added with **Add Parameter** in the left panel.
5. **Write the model formula.** In the **Measurement model** box, type a formula such as `ρ = m / V` into the **Formula y = f(x₁…xₙ)** field and give the **Result unit**. For a direct measurement with one parameter the formula may be left empty (y = x).
6. **Calculate Type A.** **Calculate Type A Uncertainty →**.
7. **Enter the Type B sources.** On the **Type B** tab add each source with **Add Component** (or **Select from registry**): parameter, distribution, half-width or the U and k from a certificate. The calculation settings are on the same tab: **Coverage probability P**, **Coverage factor k**, **Model type**, **Maximum permissible error MPE (±)**, CMC, **Decision rule**.
8. **Get the result.** **Calculate Combined Uncertainty →**. The **Results** tab shows the uncertainty budget, the result and the **Check results** (linter findings).
9. **Report.** Choose the **Report form**, fill in the **Report details** and press **Print Report**.

To start a new calculation, press **New Session**.

### 2.1. Templates

The **Template catalogue** holds method templates. The **Calculate** button on a card loads the template into a calculation, **Editor** opens the template for editing, and **New template** and **Import template (JSON)** add your own template.

Template status: `DRAFT` → `REVIEWED` → `APPROVED`. All templates supplied with the program currently have the status `DRAFT` and contain no numerical values (half-width, U, k) — the laboratory enters these values from its own certificates and method. How to write a template is described in the [template guide](../TEMPLATE_GUIDE.md).

The **Laboratory settings** window sets the laboratory defaults (P, k method, ν_eff rule, rounding, default decision rule, Monte Carlo settings and others). Order of precedence: the program default, then the laboratory, then the template, then the value entered by the user on the calculation page.

## 3. GUM mode (law of propagation of uncertainty)

### 3.1. Type A evaluation

For each input quantity the mean, the standard deviation `s` and the standard uncertainty of the mean `u_A = s / √n` are calculated from the series of observations, with `ν = n − 1` degrees of freedom (JCGM 100:2008 §4.2). The mean, variance, `s` and `u_A` are shown below the table.

If there is a single observation, or the repeatability is known in advance (pooled standard deviation `s_p`), enter it as a Type B source — this is done in the example below.

### 3.2. Type B distributions

| Name in the interface | Standard uncertainty |
|---|---|
| Rectangular (uniform) | a / √3 |
| Normal (Gaussian) | U / k |
| Triangular | a / √6 |
| U-shape (arcsine) | a / √2 |
| Resolution / scale division d | d / (2√3) |
| Trapezoidal | a·√((1 + β²) / 6) |
| Curvilinear trapezoid — inexact limits | √(a² / 3 + d² / 9) |
| Exponential — non-negative quantity | u = x |
| Log-normal | U / k |

The first five follow JCGM 100:2008 §4.3 and JCGM 101:2008 §6.4; the trapezoidal, curvilinear trapezoid and exponential distributions follow JCGM 101:2008 §6.4. The log-normal distribution has not been confirmed against a source example (**unverified**).

The half-width field accepts a number or an expression (for example, `25 / sqrt(3)`). The **Multiplier** field converts the source into the units of its parameter; the model sensitivity coefficient ∂y/∂x is calculated automatically.

**Important rule.** The maximum permissible error (MPE) of the instrument being calibrated never becomes an uncertainty source automatically. The MPE is entered only for conformity assessment (section 10). The MPE / tolerance held in the registry of standards is not offered as a source either.

### 3.3. Correlation

- If **Measurements are paired** is ticked, the correlation coefficient is calculated from the observations (Type A).
- A **Type B covariance u_B(xᵢ,xⱼ)** is entered only when both quantities depend on a common standard, instrument or correction (JCGM 100:2008 §5.2.4, F.1.2.3). Otherwise leave 0.

The results show the effect of correlation on u_c separately.

### 3.4. ν_eff and the coverage factor k

`ν_eff` is calculated with the Welch–Satterthwaite formula (JCGM 100:2008 G.4.1). The **Coverage factor k** setting:

- **Student's t from ν_eff** — k = t_P(ν_eff);
- **k = 2 (fixed)** — according to EA-4/02 M:2022.

When ν_eff is fractional the default rule is **Truncate (⌊ν⌋)**: k = t_P(⌊ν_eff⌋) (JCGM 100:2008 G.4.1, Note 1). **Interpolate** is an optional laboratory setting. The rule applied is stated in the report.

### 3.5. Rounding

Intermediate calculations are not rounded. Rounding is done only in the report:

- U — at most 2 significant digits (ILAC P14:09/2020 §5). Two digits also remain after rounding up: 0.0999 → 0.10.
- y — to the last digit of U, using round half away from zero (consistent with Excel ROUND): −0.125 → −0.13.

Export files give unrounded numbers; the rounded form is given on a separate line.

### 3.6. Model type and MPE

The **Model type** setting states what the model result is: **error of indication E = X − X_ref**, **quantity value Y (with a nominal)** (in which case the **Nominal value** is also entered) or **not specified**.

The program does not assume on its own that the result is an "error". If the model type is not specified, no statement of conformity is given. In older saved calculations the model type is "not specified".

### 3.7. Check results (linter) and acceptance with justification

After every calculation the program checks the result against a set of rules and shows the findings in the **Check results** box. There are three severity levels: **Error**, **Warning** and **Info**. Each finding has a "Why" and a "How to fix" explanation and a source clause. The list of rules is in the [linter rules](../LINTER_RULES.md).

If an error or warning cannot be fixed, the finding can be accepted with **Accept with justification**: a comment of at least 10 characters is entered in the **Justification** field and **Confirm** is pressed. The comment is written to the audit trail (with the role and time) and appears in the report.

- If there is an unaccepted finding at the "error" level, the report is printed with a **NOT OFFICIAL** watermark.
- All findings are visible in the printed report; there is no setting that hides them.
- A result with U = 0 or U < CMC does not reach the report without a warning. Laboratory setting: **Mark clearly in the report** (default) or **Block the report**.

### 3.8. Example: calibration of a 10 kg weight

Source: EA-4/02 M:2022, Supplement 1, S2.2–S2.11 (budget table S2.9), pp. 29–30. Test case: `ea4-02-s2` (verified).

Model: `mX = mS + mD + dm + mC + B`, result unit mg. Settings: P = 0.9545, **k = 2 (fixed)**.

Input values: mS = 10 000 005 mg, dm = 20 mg, the others 0.

| Source | Parameter | Distribution | Value |
|---|---|---|---|
| m_S: certificate U = 45 mg, k = 2 (S2.3) | mS | Normal | U = 45, k = 2 |
| m_D: ±15 mg (S2.4) | mD | Rectangular | a = 15 |
| δm: s_p = 25 mg, n = 3 (S2.8) | dm | Normal | `25 / sqrt(3)`, k = 1 |
| δm_C: ±10 mg (S2.5) | mC | Rectangular | a = 10 |
| δB: ±10 mg (S2.6) | B | Rectangular | a = 10 |

Result in the source:

| Quantity | Source value | Source clause |
|---|---|---|
| m_X | 10 000.025 g | S2.9 |
| u(m_X) | 29.2 mg | S2.9 |
| k | 2 | S2.10 |
| U | 58 mg | S2.10 |

Note: the source calculated U from the rounded u = 29.2 mg (2 × 29.2 ≈ 58). The program does not round intermediate values: u_c = 29.26 mg, U = 58.52 mg, and the report shows 59 mg after rounding to 2 significant digits. The difference comes from the intermediate rounding in the source; this reason is recorded in the test tolerance.

Example of the ν_eff rule: `jcgm100-h1` (JCGM 100:2008, H.1, pp. 79–84) — ν_eff = 16.7, at P = 99 % k = t₉₉(16) = 2.92, u_c = 32 nm, U₉₉ = 93 nm. Here ν_eff is truncated to 16.

## 4. Monte Carlo method (JCGM 101:2008)

On the **Results** tab, in the **Monte Carlo check (JCGM 101:2008)** box, press **Run simulation**. The calculation runs in a background thread, progress is shown, and it can be stopped with **Cancel**.

### 4.1. Settings

| Setting | Choice | Note |
|---|---|---|
| Purpose of the calculation | **GUM validation (δ/5)** or **Plain MCM (δ)** | default — GUM validation |
| Number of trials M | **Adaptive M** or **Fixed M** | default — adaptive (JCGM 101:2008 §7.9.4); the M limit is 10⁷ |
| n_dig | number of significant digits of u(y) regarded as reliable | default 2; the numerical tolerance δ is derived from it (§7.9.2) |
| Interval type | **Shortest interval** or **Symmetric interval** | default — shortest |
| **Seed** | integer | default 20261110 |

The generator is the enhanced Wichmann–Hill generator (JCGM 101:2008 C.3.3). Type A inputs are drawn from a scaled and shifted Student's t distribution (§6.4.9); Type B inputs are drawn from their own distribution.

### 4.2. Validating the GUM result

In GUM validation the Monte Carlo interval is compared with the GUM interval (JCGM 101:2008 §8). For this the Monte Carlo numerical tolerance must be δ/5 (§8.2). The outcome is **GUM result validated** or **GUM result not validated**. If it is not validated, the report gives the Monte Carlo interval as the result.

- If the M limit is reached, or the fixed M is not sufficient, a "not stabilized" finding appears and the report states "achieved 2s". With n_dig = 2 and δ/5 this is expected for many calculations.
- Lowering the tolerance to δ is a laboratory setting only; it is marked in the report.
- In **Plain MCM** no δ and no §8 conclusion are given.
- For a t-distributed input with ν ≤ 2 degrees of freedom, u(y) is undefined — only the coverage interval is given.
- If there is a non-normal distribution among correlated inputs, no Monte Carlo result is given (the GUM result applies). The exception is paired Type A observations.

### 4.3. Reproducibility

The same seed and the same settings give the same result. The seed, the generator name, M and n_dig are stated in the report.

In different browser engines the raw (unrounded) value may differ in the last digit — the relative difference does not exceed 1·10⁻¹⁴; the rounded result is the same. The reason: the sequence of random numbers is the same everywhere, but the `log`, `sin` and `cos` functions differ in the last digit between engines. Bit-level reproducibility is guaranteed only within the same JS engine version. The report records the browser in which the calculation was run. The limit (1·10⁻¹⁴) is checked automatically (Chromium, Firefox, WebKit); a few ill-conditioned derived quantities (for example the smallest eigenvalue of a nearly singular covariance matrix) are excepted — their list and the measured differences are given in the validation report. Only the short browser name and version are recorded (in the calculation file and in the footer of the printed report).

Monte Carlo results saved before engine version 2.6.0 are reproduced exactly with the old generator; new calculations use the Wichmann–Hill generator only.

### 4.4. Example: additive model with four normal inputs

Source: JCGM 101:2008, §9.2.2, Table 2, pp. 35–37. Test case: `jcgm101-9-2-2-mcm-adaptive` (verified).

Model: `Y = X1 + X2 + X3 + X4`. Each input: estimate 0, normal distribution, standard uncertainty 1. P = 0.95. Settings: adaptive M, n_dig = 2, GUM validation (δ/5), symmetric interval.

| Quantity | Source value (Table 2, Adaptive MCM) |
|---|---|
| y | 0.00 |
| u(y) | 2.00 |
| 95 % coverage interval | [−3.92, 3.92] |
| M | 1.23·10⁶ and 1.02·10⁶ (two applications in the source) |
| GUM validation | validated |

M is a random quantity, so only its order of magnitude is compared. The same model with a fixed M = 10⁶ is case `jcgm101-9-2-2-mcm`.

## 5. Multi-output and implicit models (JCGM 102:2011)

### 5.1. Several output quantities

In the **Measurement model** box, **Add an output formula** adds a second and further formulas. The result is a vector: for each output y, u and U are calculated, together with the covariance between outputs and the **Correlation matrix of the output quantities r(y_i, y_j)** (U_y = C_x·U_x·C_xᵀ, JCGM 102:2011 §6.2).

- The U of each output is separate, obtained with that output's own univariate rule.
- Joint coverage is given only through the **Coverage region**: an ellipse or ellipsoid (k_p) and a rectangular region (k_q) — JCGM 102:2011 §6.5. For two outputs a drawing of the ellipse is shown.
- The result and the calculation path of a single-output calculation are unchanged.
- A multivariate Monte Carlo method is also available (JCGM 102:2011 §7). For two outputs the Monte Carlo result also gives the **Smallest coverage region (approximation)**.

### 5.2. Implicit model

A model of the form h(Y, X) = 0 (JCGM 102:2011 §6.3) is supported, but for now it can be entered only through a calculation file (JSON) or a template — there is no entry form on the main screen. A starting value is mandatory for every unknown: the program does not invent one. If the solution does not converge, or the system of equations is singular, an error finding is shown instead of a result.

### 5.3. Limitations

- There is no Monte Carlo method for an implicit model: the program does not silently linearise, it reports an error.
- The smallest coverage region is available for two outputs only.
- With several outputs and several calibration points there is no single k; joint coverage is given separately for each point.
- The linter threshold for output correlation (|r| > 0.5) is awaiting the owner's confirmation.

### 5.4. Example: additive model with two outputs

Source: JCGM 102:2011, §9.2.2, Table 3, p. 36. Test case: `jcgm102-9-2-2-guf` (verified).

Model: `Y1 = X1 + X3`, `Y2 = X2 + X3`. Each input: estimate 0, normal distribution, standard uncertainty 1. P = 0.95.

| Quantity | Source value (Table 3, GUF) |
|---|---|
| y1, y2 | 0.000, 0.000 |
| u(y1), u(y2) | 1.414, 1.414 |
| r(y1, y2) | 0.500 |
| k_p (ellipse) | 2.45 |
| k_q (rectangle) | 2.24 |

The outputs are correlated because of the common input X3.

## 6. Regression (calibration curve)

On the **Regression** tab, the x and y values are entered in the **Calibration points** table (you can paste from Excel: 2 columns — x, y; 3 columns — x, y, u(y); 4 columns — x, u(x), y, u(y)). Choose the **Method** and the **Model**, fill in **Forward prediction: x → Y(x)** and **Inverse prediction: y₀ → x̂₀** if needed, then press **Calculate**.

| Method | Status |
|---|---|
| OLS and predictions | verified (JCGM 100:2008 H.3; QUAM:2012 A5, E.4) |
| WLS, GLS, WTLS | unverified — the source is not in the repository |
| Polynomial of degree 2 and 3 | unverified |

When an unverified method is used, the report carries a mark.

### 6.1. Example: thermometer calibration

Source: JCGM 100:2008, Annex H.3 (H.3.3, Table H.6, H.3.4), pp. 89–92. Test case: `jcgm100-h3` (verified).

Method — OLS, model of degree 1, reference point t₀ = 20 °C, forward prediction at 30 °C. Calibration points (Table H.6, columns 2 and 3):

| t_k, °C | b_k, °C |
|---|---|
| 21.521 | −0.171 |
| 22.012 | −0.169 |
| 22.512 | −0.166 |
| 23.003 | −0.159 |
| 23.507 | −0.164 |
| 23.999 | −0.165 |
| 24.513 | −0.156 |
| 25.002 | −0.157 |
| 25.503 | −0.159 |
| 26.010 | −0.161 |
| 26.511 | −0.160 |

| Quantity | Source value | Source clause |
|---|---|---|
| y₁ (intercept) | −0.1712 °C | H.3.3 |
| s(y₁) | 0.0029 °C | H.3.3 |
| y₂ (slope) | 0.00218 | H.3.3 |
| s(y₂) | 0.00067 | H.3.3 |
| r(y₁, y₂) | −0.930 | H.3.3 |
| s | 0.0035 °C | H.3.3 |
| ν | 9 | H.3.4 |
| b(30 °C) | −0.1494 °C | H.3.4 |
| u_c[b(30 °C)] | 0.0041 °C | H.3.4 |

30 °C lies outside the calibration range, so the program warns about extrapolation.

## 7. Top-down

The **Top-down** tab is a three-step wizard: **Data type**, **Data entry**, **Budget and result**. Uncertainty is evaluated from validation and quality control data: according to Nordtest TR 537, u(R_w) (within-laboratory reproducibility) and u(bias); according to QUAM:2012, recovery R_m with a t-test, level-dependent uncertainty and an empirical (method-defined) measurand. Sources of u(R_w): a control sample series, differences of duplicates, control chart limits, a stated s or CV %. Bias sources: a certified reference material (CRM), proficiency test rounds (PT), recovery.

Rules:

- Each quantity is given either in a unit or on the relative scale; mixing relative and absolute values is an error.
- k = 2 (P ≈ 95 %). ν_eff is calculated and shown; if ν_eff < 30 a warning and a suggestion of t_P(⌊ν_eff⌋) appear, but k is not changed automatically.
- If a factor is counted twice, a warning appears; it is also visible in the printed report.
- If a bias is entered for an empirical measurand, the program asks by which method the reference value was obtained.

The parts that rely on ISO 21748 (check of the laboratory s_r, adjustment of s_R) are unverified: the standard is not in the repository.

### 7.1. Example: ammonium nitrogen (NH₄-N) in water

Source: Nordtest TR 537 ed. 4 (2017), §3.2 (steps 1–6), §3.3, Appendix 4; pp. 10, 11, 40. Test case: `nordtest-tr537-nh4n` (verified).

Relative scale (%). u(R_w) — from control chart limits: ±3.34 % (2s). Bias — from 6 PT rounds:

| Round | Bias, % | s_R, % | Number of laboratories |
|---|---|---|---|
| 1999-1 | 2.5 | 10 | 31 |
| 1999-2 | 2.7 | 7 | 36 |
| 2000-1 | 1.9 | 8 | 32 |
| 2000-2 | 1.4 | 10 | 35 |
| 2001-1 | 1.8 | 7 | 36 |
| 2001-2 | 2.9 | 11 | 34 |

| Quantity | Source value | Source clause |
|---|---|---|
| u(R_w) | 1.67 % | §3.2, step 4 |
| RMS_bias | 2.26 % | Appendix 4 |
| u(C_ref) | 1.52 % | Appendix 4 |
| u(bias) | 2.73 % | §3.2, step 4 |
| u_c | 3.20 % | §3.2, step 5 |
| k | 2 | §3.2, step 6 |
| U | 6.40 % | §3.2, step 6 |

The source rounded the final value up to 7 %.

## 8. Special modes

The **Special modes** tab has four modes. The report always states the name of the approach and its limitations.

### 8.1. Sampling (UfS:2019) — verified

Duplicate method: two samples from each target, two analyses of each sample. Classical and robust nested ANOVA separate the sampling and analytical components. Classical ANOVA agrees with the source to full precision; robust ANOVA to 4 significant digits (the algorithm was reconstructed from the description in the source).

Example. Source: EURACHEM/CITAC UfS:2019, Example A1 (Table A1.1, Figure A1.2), pp. 40–41. Test case: `ufs-a1-nitrate-classical` (verified). Nitrate in glasshouse lettuce, mg/kg; 8 targets × 2 samples × 2 analyses:

| Target | S1A1 | S1A2 | S2A1 | S2A2 |
|---|---|---|---|---|
| A | 3898 | 4139 | 4466 | 4693 |
| B | 3910 | 3993 | 4201 | 4126 |
| C | 5708 | 5903 | 4061 | 3782 |
| D | 5028 | 4754 | 5450 | 5416 |
| E | 4640 | 4401 | 4248 | 4191 |
| F | 5182 | 5023 | 4662 | 4839 |
| G | 3028 | 3224 | 3023 | 2901 |
| H | 3966 | 4283 | 4131 | 3788 |

| Quantity | Source value (Figure A1.2, classical ANOVA) |
|---|---|
| Mean | 4345.5625 |
| s (total) | 774.5296 |
| s (between-target) | 556.2804 |
| s (sampling) | 518.16089 |
| s (analysis) | 148.18063 |

### 8.2. Qualitative tests (AQA:2021) — verified

Sensitivity, specificity, the likelihood ratio (LR) and the posterior probability are calculated from a 2×2 table. Confidence interval: by default the report gives only the Wilson interval; Clopper–Pearson is a laboratory setting and, if chosen, is the only interval in the report. The method name and P are stated in the report.

Example. Source: EURACHEM/CITAC AQA:2021, Example E3 (Table E3.1, Eq. E3.1), §4.3 Eq. (6); pp. 17 and 28. Test case: `aqa-e3-emit-cocaine` (verified). Inputs: false positive rate FP = 0.009, false negative rate FN = 0.056, prevalence P(+) = 0.2. Result in the source: posterior probability of a positive result PP = 0.963.

### 8.3. Microbiology — BETA

BETA, unverified: the text of ISO 19036 is not in the repository and the calculation has not been confirmed against a source example. The result always carries a warning; a template in this mode cannot become `APPROVED`. No example numbers are given. Compare the result with the standard before using it in an official report.

### 8.4. Medical laboratory — BETA

BETA, unverified: the text of ISO/TS 20914 is not in the repository. The same conditions apply as for microbiology; no example numbers are given.

## 9. Laboratory

The **Laboratory** tab has five sections: **Standards**, **CMC**, **QC charts**, **Proficiency testing** and **Validation**. All records are stored only in this browser (IndexedDB); every creation, edit and deletion is written to the audit trail with the role and time.

Roles: standards and the CMC table are edited by the laboratory administrator; an employee adds results to a QC chart and enters PT / validation data. In local (guest) mode the role restriction works at warning level; a registry record or CMC table entered by a guest is marked in the report with an "info" finding.

### 9.1. Registry of standards

Each standard's card holds its calibration certificates (**Add calibration**): points, U, k, validity period, traceability. Only the organisation name is stored for the calibration provider. **Import from file**, **Export JSON** and **Export CSV** are available.

**Select from registry** on the **Type B** tab writes a copy of the certificate into the calculation (with the registry identifier and version). If the registry changes later, the old calculation does not change. If U, k, ν or the distribution is changed by hand, the link to the registry is broken.

- Validity is checked against the measurement date (not today's date). An expired standard is an "error" finding and the report becomes **NOT OFFICIAL**; within 30 days of expiry it is an info finding.
- Drift and interpolation sources are only suggested: the user ticks and confirms drift, and the user enters the number for an interpolation source.
- The calibration interval recommendation uses the project's own formula (ILAC G24 gives no formula).

### 9.2. CMC

The CMC table holds the rows of the scope of accreditation. If a CMC quantity and an X value are selected in a calculation, the program compares U with CMC(X) (ILAC P14:09/2020 §5.5). If U < CMC a finding appears; U is not replaced automatically. Outside the scope no comparison with the CMC is made and a separate finding appears.

### 9.3. QC charts and Westgard rules

There are two kinds of Shewhart chart: **Individuals (I–MR)** and **Subgroups (X̄–R)**. The chart factors have been checked against the NIST/SEMATECH e-Handbook §6.3.2.1–6.3.2.2. The Westgard rules follow Westgard 1981; the 1₂s gate is on by default (laboratory setting). If the R₄s rule is applied to a consecutive pair without a run marker, this is flagged as a "project approximation". Grouping of several control materials is not yet available in the interface.

### 9.4. Proficiency testing (PT)

Rounds are added to a PT series (**Add a round** or **Import from file**): result x, assigned value x_pt, σ_pt, uncertainties. The program calculates the z, z′, ζ and E_n scores. A score that cannot be calculated is left empty and the reason is shown; a score is not replaced by another one automatically. PT rounds can be passed to the top-down wizard as a bias source.

The score formulas and the evaluation limits (|z| ≤ 2, |z| ≥ 3, |E_n| ≤ 1) rely on ISO 13528 — the standard is not in the repository, so they are **unverified**; the result always carries an info finding about this. There is no verified source example for PT yet, so no numerical example is given here.

### 9.5. Method validation

Tests are added to a validation set (**Add a test**):

| Test | Status |
|---|---|
| Grubbs test (single outlier) | verified — NIST e-Handbook §1.3.5.17.1 |
| One-way ANOVA (s_r, s_b, s_I) | verified — NIST §7.4.3, §2.4.4 |
| Two-sample t-test | verified — NIST §1.3.5.3 |
| F-test (two variances) | verified — NIST §1.3.5.9 |
| Recovery t-test | verified — QUAM:2012 A4 |
| Linearity (regression) | OLS — verified (section 6) |
| Cochran C test | unverified — ISO 5725-2 is not in the repository |
| LOD / LOQ | unverified |

**The program does not delete values by itself.** The Grubbs test only points out a suspect value. To **Exclude** it from the calculation is the user's decision: a comment of at least 10 characters is required, only the laboratory administrator can do it, and the action is written to the audit trail. A repeated Grubbs test is not run automatically.

In the **Top-down template draft** box, a personal top-down template (`DRAFT`) is created from the ANOVA and recovery results with **Create draft**.

Example. Source: NIST/SEMATECH e-Handbook of Statistical Methods, §1.3.5.17.1 (Grubbs test). Check: `tests/engine/validation.test.js` (verified). Eight values: 199.31, 199.53, 200.19, 200.82, 201.92, 201.95, 202.18, 245.57. Upper one-tailed test, α = 0.05. Result in the source: G = 2.4687, critical value 2.032 — the largest value (245.57) is flagged as an outlier. Note: the source gives G truncated to four decimal places (the program value is 2.46876…).

## 10. Decision rule and statement of conformity

Conformity is assessed according to JCGM 106:2012 §7–8 and ILAC G8:09/2019. Settings on the **Type B** tab:

- **Maximum permissible error MPE (±)** or explicit limits — **Lower limit**, **Upper limit** (one- or two-sided);
- **Decision rule**: **not selected**, **Simple acceptance (w = 0)**, **Guard band w = r·U** (with the **Multiplier r**);
- **Type of statement**: **Binary (pass / fail)** or **Non-binary (with conditional results)**;
- **Agreement with the customer (reference)**.

The program calculates the acceptance interval, TUR = T / (2U) and the conformance probability p_c (assuming a normal distribution).

**Main rule: if the decision rule, the limit or the model type is not specified, no statement of conformity is given.** The default rule from the laboratory settings or the template is pre-filled in the selection field, but it is written into the calculation only after the user confirms it.

TUR findings: TUR < 1 — warning; 1 ≤ TUR < 4 — info (the 4:1 ratio is common practice and is not confirmed by a source).

## 11. Report, import and export

### 11.1. Report forms

The **Report form** list has four forms: **Annex to the calibration certificate**, **Test report section**, **Uncertainty budget justification (CMC)**, **Statement of conformity**.

The **Report details** window is used to fill in the laboratory and document details. Details left empty are listed in the report. The list of details relies on ISO/IEC 17025 §7.8.2.1 — unverified (section 1.2). The details are not sent to a server (section 1.4).

### 11.2. Report footer

The bottom of every report shows: the software and engine version (`ENGINE_VERSION`), the **Build (engine hash)**, the template (or "no template"), the **Calculation ID and date**, the **SHA-256 (canonical JSON, RFC 8785)** and a QR code (with the calculation ID and that hash). The hash is taken from the full JSON export of the calculation: if the inputs or the result change, the hash changes too.

### 11.3. Export

On the **Results**, **Regression**, **Top-down** and **Special modes** tabs:

- **Export JSON** — the calculation document in the `uc-calc/1` format: inputs, settings, result and hash;
- **Export Excel (.xlsx)** and **Export CSV** — result, inputs, budget, findings. The numbers are not rounded; the rounded form as shown in the report is given separately.

### 11.4. Import

- **Import from file (.xlsx, .csv)** loads observations into the table. You choose the sheet, the delimiter and the column mapping, and a preview is shown. Limits: 5 MB, 10 000 rows, 200 columns. The file is read only in the browser; formulas are not evaluated — only the values stored in the file are taken.
- **Open calculation file (JSON)** checks a `uc-calc/1` file: the hash is compared and the calculation is run again.

### 11.5. Export → import → recalculation

When a JSON file is opened, the program runs the calculation again from the inputs and compares it with the stored result:

- "Hash verified — the file has not been changed" and "Recalculated: the result is reproduced identically." — the file is intact and the result is reproduced;
- "Hash mismatch" — the file was changed or is corrupt;
- "the result DIFFERS from the stored one" or "The file was created with a different engine version." — compare the engine version in the file with the current one.

After that the calculation can be opened with **Open in the editor**. This check is also convenient for the laboratory's own validation (section 12).

## 12. Validation and version

### 12.1. The "Validation" page

The "Validation" page of the site (`validation.html`) shows the current engine version, the build identifier and a link to the validation report. The page shows: the current version (engine version, build, build time, engine hash, your browser), the documents (validation report, validation plan, requirements and traceability matrix, change control, known limitations, questions and answers for the assessor, PQ and URS templates, this manual), the known limitations (summary) and the version history. The documents and the version history are visible only on the site built by GitHub Actions; a copy running without the build step says so on the page.

The program's own verification consists of examples from normative documents (each expected value with its source clause), 9 reference points from laboratory Excel files, and a hash of the engine files. The coverage table is in the [validation matrix](../validation/RTM.md).

### 12.2. New version banner

When a new version is published on the site, a banner is shown on the page. You refresh the page yourself: the page is not refreshed automatically, so that data you have entered is not lost. Before refreshing, save the current calculation with **Export JSON**. The banner reads "A new version is available — reload the page…"; it can be closed with the **Dismiss** button (it is not shown again for that version).

Whenever a change affects a calculation result, the engine version is increased and the change is recorded in the [changelog](../../CHANGELOG.md).

### 12.3. The laboratory's own check (PQ)

Before the program is put into routine use, and after every new engine version, the laboratory should run a check on its own examples. Use the [PQ protocol template](../validation/PQ_PROTOCOL_TEMPLATE.md) for this. Recommended procedure:

1. Choose at least one example for your own method that has been calculated independently (for example, in Excel).
2. Calculate it in the program and compare y, u_c, ν_eff, k and U.
3. Save the calculation with **Export JSON**; record the engine version, the build and the SHA-256 hash in the protocol.
4. After a new version is released, open that file with **Open calculation file (JSON)** and check that the result is reproduced identically.

## 13. Limitations

The most important limitations (the full list is in the [known limitations](../validation/KNOWN_LIMITATIONS.md)):

- **ISO/IEC 17025:2017** — the text is not in the repository; references to it and the list of report details are unverified.
- **BETA modes:** microbiology (ISO 19036) and medical laboratory (ISO/TS 20914) — not confirmed against a source example.
- **Unverified methods:** WLS, GLS, WTLS and polynomial in regression; the parts of top-down that rely on ISO 21748; the log-normal distribution; PT score formulas and limits (ISO 13528); the Cochran test; LOD / LOQ; the calibration interval formula.
- **Implicit model:** no Monte Carlo method; no entry form on the main screen.
- **Smallest coverage region** — for two outputs only.
- **Monte Carlo:** bit-level reproducibility only within the same JS engine version; with n_dig = 2 and δ/5 a calculation often reaches the M limit (with a warning).
- **Units of input quantities:** there is no separate field in the interface.
- **Templates:** all templates supplied with the program have the status `DRAFT` and contain no numbers.
- **Laboratory section:** no matrix / chart view of the CMC, no `.xlsx` export of the registry, no PT trend rules and no in-place editing of a round.
- **Roles:** in local mode the role restriction works at warning level.
- **Not reviewed by hand in a browser:** some printed report forms, the special modes window, and the proficiency testing and validation sections (checked by automated tests only).
- **Data in the browser only:** if the browser storage is cleared, calculations and registry data that were not exported are lost.
- **Responsibility:** the program does not replace the metrologist's judgement — the laboratory is responsible for the list of sources, the distributions and the decision rule.

## 14. Interface (2.0)

The interface adapts to phones, tablets and desktops. The calculation methods and results are unchanged — only the appearance is new.

### 14.1. Shell and navigation

- **Top bar:** breadcrumb (section / calculation ID), command search, language (UZ / RU / EN), theme (dark / light), profile menu, "Report".
- **Command search:** Ctrl+K finds a section, template or action by name; choose with the arrow keys, Enter opens, Esc closes.
- **Left menu** (wide screens): "Calculation" (GUM, Monte Carlo, multi-output model), "Methods" (regression, top-down, special modes), "Laboratory" (QC charts, standards registry, proficiency tests, validation). On tablets it becomes a narrow icon rail; on phones — a bottom navigation bar and a primary action button.
- **Steps:** Model → Type A → Type B → Result → Report. A completed step has a green mark, the current one is highlighted.
- **Session settings** (number of measurements, parameters, presets) are under the "Session" button on the input page.

### 14.2. Results screen

- **Main result card:** y ± U (rounded), k, P, ν_eff and the rule used for it.
- **Uncertainty ribbon:** the horizontal axis is the deviation from y (in units of U); the curve is the N(y, u_c) density; the amber frame is y ± U. If a Monte Carlo run exists, its coverage intervals (shortest and probabilistically symmetric) are drawn below. No histogram is drawn.
- **Indicator tiles:** u_c, ν_eff, k, U and the dominant source share (marked when above 50 %).
- **Budget:** "Table" or "Pareto" (sources in decreasing order of share). The table has a νᵢ column; a small ν (below 10) is shown in amber.
- **Right panel** (below on narrow screens): check results, calculation settings, comparison with Monte Carlo.

### 14.3. Entering a Type B source

"Edit" on a source card opens a sheet: from the bottom on phones, from the right on wide screens. The distribution is chosen from a row of buttons, and the standard uncertainty is shown immediately while the value is typed. A comma is accepted as the decimal separator. "Select from registry" is also available inside the sheet. Esc or "Done" closes the sheet.

### 14.4. Report view and printing

The "Report" step shows the document on a white A4 page. The form (one of four) is switched with the buttons at the top. "Print" opens the browser print dialog; for "PDF" choose "Save as PDF" in that dialog. In print the table header repeats on every page and the footer (engine version, build, hash, QR) appears on every page.

### 14.5. Visual lab

A teaching tool: live Monte Carlo view, conformity simulator, extreme cases, QC drift, correlation and budget sensitivity. The numbers come from the calculation engine. Every mode carries a "teaching sample" label; results from here are not saved and do not appear in the report.

### 14.6. Accessibility

Everything can be operated from the keyboard, and focus is visible. Clickable elements are at least 44 px tall. When the system setting "reduce motion" is on, animations are switched off. The theme choice is stored in the browser.
