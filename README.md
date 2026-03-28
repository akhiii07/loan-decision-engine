# Loan Decision Engine

A comprehensive, India-focused loan stress testing and decision engine that answers four critical questions:

1. **Can I get this loan?** — Bank eligibility (FOIR, LTV, LTI)
2. **Can I afford this loan?** — Affordability (residual income, expense ratio)
3. **Can I survive this loan?** — Stress testing (income shock, rate shock, expense shock)
4. **Should I take this loan?** — Composite decision (score 0–95, verdict, action plan)

## Features

- **RBI-compliant** LTV slabs, FOIR thresholds, floating rate norms
- **Behavioral realism** — liquidity quality haircuts, income stability factors, dependent scaling
- **6 stress scenarios** — income shock, rate shock (+2%), expense spike, combined, rate normalization, inflation crossover
- **Negative amortization detection** — flags debt traps where EMI < monthly interest
- **Recovery feasibility engine** — computes exact cuts needed and whether they're realistic
- **Decision delta** — tells you exactly what to change (reduce loan by ₹X, save ₹Y more)
- **Debt mix risk** — separates secured vs unsecured EMIs (unsecured > 15% = elevated risk)
- **Loan purpose context** — home vs auto vs personal carry different risk profiles
- **Impact-first output** — shows stressed metrics prominently, baseline as reference

## Tech Stack

Pure HTML + CSS + JavaScript. No frameworks, no build tools, no dependencies.

## Project Structure

```
loan-decision-engine/
├── index.html              Entry point
├── css/
│   ├── variables.css       Design tokens
│   ├── layout.css          Grid, responsive
│   ├── components.css      UI components
│   └── results.css         Results-specific styles
├── js/
│   ├── config.js           Constants & thresholds
│   ├── utils.js            Formatting & helpers
│   ├── emi.js              EMI math
│   ├── snapshot.js         Cashflow model
│   ├── eligibility.js      Bank eligibility
│   ├── scenarios.js        Stress scenarios
│   ├── recovery.js         Recovery & decision delta
│   ├── scoring.js          Score calculation
│   ├── verdict.js          Verdict hierarchy
│   ├── analysis.js         Explanation builder
│   ├── renderer.js         DOM rendering
│   └── main.js             Orchestrator
├── README.md
├── LICENSE
└── .gitignore
```

## How It Works

1. User enters financial profile (income, expenses, loan details, savings)
2. `main.js` reads inputs and builds an input object
3. `snapshot.js` computes baseline cashflow
4. `scenarios.js` runs all 6 stress tests using raw expenses (no silent adjustments)
5. `recovery.js` computes what cuts would be needed and whether they're feasible
6. `scoring.js` computes a weighted 0–95 score with hard caps for dangerous conditions
7. `verdict.js` applies a 3-layer hierarchy (hard failures → structural risk → dynamic stress)
8. `renderer.js` displays everything impact-first: stressed metrics → scenarios → analysis → action plan → baseline reference

## Key Design Decisions

- **Expenses are never silently adjusted** in scenarios. The user sees raw impact, then the recovery plan shows what cuts would be needed.
- **Score always aligns with verdict.** Hard caps prevent green scores on dangerous cases.
- **Behavioral survival** multiplies theoretical by 0.7 (delayed action, panic spending) × income stability factor × dependent penalty.
- **Liquidity quality**: Cash = 100%, FD = 70%, Other investments = 30% usable in emergency.
- **Buffer uses drain rate** when baseline deficit exists (savings/deficit, not savings/outflow).

## Data Sources

- RBI repo rate history (2014–2026), current 5.25%
- RBI LTV slabs: ≤30L→90%, 30-75L→80%, >75L→75%
- India salary hike data: median 9.4% (WTW, EY, Mercer 2024-25)
- CPI inflation: healthcare 3.6%, education 3.4%, housing 3.0%
- FOIR norms: 40-50% salaried, 35-45% self-employed

## License

MIT