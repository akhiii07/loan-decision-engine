# Loan Decision Engine

A comprehensive, India-focused loan stress testing and decision engine that answers four critical questions:

1. **Can I get this loan?** — Bank eligibility (FOIR, LTV, LTI)
2. **Can I afford this loan?** — Affordability (residual income, expense ratio)
3. **Can I survive this loan?** — Stress testing (income shock, rate shock, expense shock)
4. **Should I take this loan?** — Composite decision (score 0–95, verdict, action plan)

---

## Running Locally

> **Important:** Open via a local server — not by double-clicking the file.
> Browsers block script interactions between `file://` URLs.

```bash
# Python (recommended)
python -m http.server 8080

# Then open
http://localhost:8080
```

---

## UI Flow

The app uses an **intent-first, step-by-step wizard** UI:

1. **Landing** — Choose your goal:
   - *Can I afford a home loan?* — runs full eligibility + affordability + stress flow
   - *Am I financially safe right now?* — stress-tests current finances without a new loan

2. **Step wizard** — Guided multi-step form (Income → EMIs → Expenses → Savings → Loan → Property → Review), showing only one section at a time with a live progress bar

3. **Decision Report** — Appears alongside the form only after analysis runs, expanding the layout to a two-column view

---

## Features

- **RBI-compliant** LTV slabs, FOIR thresholds, floating rate norms
- **Behavioral realism** — liquidity quality haircuts, income stability factors, dependent scaling
- **6 stress scenarios** — income shock, rate shock (+2%), expense spike, combined, rate normalization, inflation crossover
- **Negative amortization detection** — flags debt traps where EMI < monthly interest
- **Recovery feasibility engine** — computes exact cuts needed and whether they're realistic
- **Decision delta** — tells you exactly what to change (reduce loan by ₹X, save ₹Y more)
- **Debt mix risk** — separates secured vs unsecured EMIs (unsecured > 15% = elevated risk)
- **Loan purpose context** — home vs auto vs personal carry different risk profiles
- **Live indicators** — EMI preview, LTV ratio, and survival runway update as you type
- **Impact-first output** — stressed metrics shown prominently, baseline as reference

---

## Tech Stack

Pure HTML + CSS + JavaScript. No frameworks, no build tools, no dependencies.

---

## Project Structure

```
loan-decision-engine/
├── index.html              Entry point
├── css/
│   ├── variables.css       Design tokens (colors, fonts, spacing)
│   ├── layout.css          Container grid, header, responsive breakpoints
│   ├── components.css      Panels, form fields, buttons, flags
│   ├── results.css         Results panel styles
│   ├── stepflow.css        Step wizard UI (progress bar, nav, live indicators)
│   └── Wizard.css          Wizard component styles
├── js/
│   ├── config.js           Constants & thresholds
│   ├── utils.js            Formatting & helpers
│   ├── emi.js              EMI math
│   ├── snapshot.js         Cashflow model
│   ├── eligibility.js      Bank eligibility checks
│   ├── scenarios.js        6 stress scenarios
│   ├── recovery.js         Recovery & decision delta
│   ├── scoring.js          Weighted 0–95 score
│   ├── verdict.js          3-layer verdict hierarchy
│   ├── analysis.js         Explanation builder
│   ├── renderer.js         DOM rendering + results panel reveal
│   ├── main.js             Orchestrator
│   ├── stepflow.js         Step wizard controller (intent, navigation, live updates)
│   └── Wizard.js           Wizard component logic
├── README.md
├── LICENSE
└── .gitignore
```

---

## How It Works

1. User picks an intent (new loan vs. existing finances)
2. `stepflow.js` builds a step sequence tailored to the intent and drives the wizard
3. On the Review step, user confirms inputs — `stepflow.js` calls `analyzeBtn` to trigger the engine
4. `main.js` reads all inputs and builds an input object
5. `snapshot.js` computes baseline cashflow
6. `scenarios.js` runs all 6 stress tests using raw expenses (no silent adjustments)
7. `recovery.js` computes what cuts would be needed and whether they're feasible
8. `scoring.js` computes a weighted 0–95 score with hard caps for dangerous conditions
9. `verdict.js` applies a 3-layer hierarchy (hard failures → structural risk → dynamic stress)
10. `renderer.js` renders everything impact-first and reveals the Decision Report panel, expanding the layout to two columns

---

## Key Design Decisions

- **Expenses are never silently adjusted** in scenarios. The user sees raw impact, then the recovery plan shows what cuts would be needed.
- **Score always aligns with verdict.** Hard caps prevent green scores on dangerous cases.
- **Behavioral survival** multiplies theoretical by 0.7 (delayed action, panic spending) × income stability factor × dependent penalty.
- **Liquidity quality**: Cash = 100%, FD = 70%, Other investments = 30% usable in emergency.
- **Buffer uses drain rate** when baseline deficit exists (savings/deficit, not savings/outflow).
- **Decision Report hidden on load** — the right panel only appears after analysis runs to keep the initial experience focused.

---

## Data Sources

- RBI repo rate history (2014–2026), current 5.25%
- RBI LTV slabs: ≤30L → 90%, 30–75L → 80%, >75L → 75%
- India salary hike data: median 9.4% (WTW, EY, Mercer 2024–25)
- CPI inflation: healthcare 3.6%, education 3.4%, housing 3.0%
- FOIR norms: 40–50% salaried, 35–45% self-employed

---

## License

MIT
