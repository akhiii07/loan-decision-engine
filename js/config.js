/**
 * config.js — Constants, thresholds, and RBI data
 *
 * Single source of truth for all magic numbers.
 * Change a threshold here → changes everywhere.
 */

var CONFIG = {

  // ── RBI Rate Data (as of March 2026) ──
  REPO_CURRENT:   5.25,
  REPO_10YR_AVG:  6.15,
  REPO_PEAK:      6.50,   // Feb 2023 – Jan 2025
  BANK_SPREAD:    2.75,   // avg spread over repo

  // ── RBI LTV Slabs ──
  LTV_SLABS: [
    { maxLoan: 3000000,  maxLTV: 0.90 },
    { maxLoan: 7500000,  maxLTV: 0.80 },
    { maxLoan: Infinity, maxLTV: 0.75 }
  ],

  // ── EMI / FOIR Thresholds by income type ──
  THRESHOLDS: {
    salaried:      { green: 0.35, warn: 0.45, risky: 0.50 },
    'self-employed': { green: 0.30, warn: 0.40, risky: 0.45 }
  },

  // ── Eligibility factors ──
  ELIG_MAX_FACTOR:  { salaried: 0.50, 'self-employed': 0.45 },
  ELIG_SAFE_FACTOR: { salaried: 0.40, 'self-employed': 0.35 },

  // ── Income stability ──
  STABILITY_FACTOR: { salaried: 1.0, 'self-employed': 0.80 },

  // ── Behavioral survival multiplier ──
  BEHAVIORAL_FACTOR: 0.70,

  // ── Liquidity quality weights ──
  LIQUIDITY: { cash: 1.0, fd: 0.70, other: 0.30 },

  // ── Buffer targets (months) ──
  BUFFER_TARGET: { salaried: 6, 'self-employed': 9 },

  // ── Score weights (must sum to 1.0) ──
  SCORE_WEIGHTS: {
    residual:    0.30,
    emi:         0.22,
    eligibility: 0.15,
    buffer:      0.10,
    survival:    0.08,
    lti:         0.10,
    ltv:         0.05
  },

  // ── Score caps ──
  SCORE_MAX:              95,
  SCORE_CAP_ZERO_SAV:     20,
  SCORE_CAP_NEG_RESID:    15,
  SCORE_CAP_DEFICIT:      25,
  SCORE_CAP_NEG_AMORT:    20,

  // ── Score penalties ──
  PENALTY_INT_RATIO_HIGH: 12,  // intRatio > 1
  PENALTY_INT_RATIO_MED:  5,   // intRatio > 0.7
  PENALTY_RATE_NORM:      5,
  PENALTY_NEG_AMORT:      20,
  PENALTY_EARLY_STAGE:    5,
  PENALTY_UNSEC_HIGH:     15,  // > 25%
  PENALTY_UNSEC_MED:      8,   // > 15%
  PENALTY_HIGH_DEPS:      5,   // >= 3 dependents

  // ── Inflation crossover growth rates ──
  INCOME_GROWTH:    [ 0.07, 0.05, 0.03 ],  // yr 1-10, 11-20, 21-30
  EXPENSE_GROWTH:   { essential: 0.06, semiFixed: 0.05, lifestyle: 0.05 },

  // ── Loan purpose risk profiles ──
  LOAN_PURPOSE: {
    home:     { riskAdj: 0,   bufAdj: 0, label: 'Home Loan (asset-backed)' },
    auto:     { riskAdj: -5,  bufAdj: 0, label: 'Auto Loan (depreciating asset)' },
    personal: { riskAdj: -15, bufAdj: 1, label: 'Personal Loan (unsecured)' }
  },

  // ── Dependent factors ──
  DEP_EXPENSE_FACTORS: [ 1.0, 1.15, 1.30, 1.45, 1.60 ],  // 0,1,2,3,4+
  DEP_SURVIVAL_PENALTY: [ 1.0, 0.85, 0.85, 0.70, 0.70 ],  // 0,1,2,3,4+

  // ── Recovery thresholds ──
  RECOVERY_MAX_ESSENTIAL_CUT: 0.40,  // max 40% of essentials can be cut
  RECOVERY_UNREALISTIC_THRESHOLD: 0.30  // deficit > 30% income = unrealistic
};