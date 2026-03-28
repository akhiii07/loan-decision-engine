/**
 * utils.js — Formatting, DOM helpers, color mappers
 *
 * Pure functions with no side effects.
 * Every other module can safely import these.
 */

/** Format number as ₹ with Indian locale */
function formatRupees(n) {
  if (!isFinite(n) || isNaN(n)) return '—';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

/** Format large amounts as ₹X.XXL or ₹X.XXCr */
function formatLakh(n) {
  if (!isFinite(n) || isNaN(n)) return '—';
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + 'Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + 'L';
  return formatRupees(n);
}

/** Format ratio as percentage string */
function formatPct(ratio) {
  return (ratio * 100).toFixed(1) + '%';
}

/** Read numeric value from input, default 0, floor 0 */
function readInput(id) {
  var v = parseFloat(document.getElementById(id).value);
  return isNaN(v) ? 0 : Math.max(0, v);
}

/** Shorthand for getElementById */
function el(id) {
  return document.getElementById(id);
}

/** Compute usable savings with liquidity quality weights */
function usableSavings(cash, fd, other) {
  var w = CONFIG.LIQUIDITY;
  return cash * w.cash + fd * w.fd + other * w.other;
}

/** Get EMI thresholds for income type */
function getThresholds(incomeType) {
  return CONFIG.THRESHOLDS[incomeType] || CONFIG.THRESHOLDS.salaried;
}

/** Map EMI ratio to color class */
function emiColor(ratio, incomeType) {
  var th = getThresholds(incomeType);
  if (ratio <= th.green) return 'ok';
  if (ratio <= th.warn) return 'warn';
  return 'bad';
}

/** Map buffer months to color class */
function bufferColor(buf) {
  var v = isFinite(buf) ? buf : 99;
  if (v >= 6) return 'ok';
  if (v >= 3) return 'warn';
  return 'bad';
}

/** Map survival months to color class */
function survivalColor(surv) {
  var v = isFinite(surv) ? surv : 99;
  if (v >= 9) return 'ok';
  if (v >= 3) return 'warn';
  return 'bad';
}

/** Resolve shock % with self-employed floor */
function resolveShock(rawShock, incomeType) {
  return incomeType === 'self-employed' ? Math.max(rawShock, 40) : rawShock;
}

/** Get income stability factor */
function stabilityFactor(incomeType) {
  return CONFIG.STABILITY_FACTOR[incomeType] || 1.0;
}

/** Compute behavioral (realistic) survival */
function realisticSurvival(theoretical, incomeType, dependents) {
  if (!isFinite(theoretical)) return Infinity;
  var sf = stabilityFactor(incomeType);
  var depIdx = Math.min(dependents, CONFIG.DEP_SURVIVAL_PENALTY.length - 1);
  var dp = CONFIG.DEP_SURVIVAL_PENALTY[depIdx];
  return theoretical * CONFIG.BEHAVIORAL_FACTOR * sf * dp;
}

/** Get loan stage label */
function loanStage(monthsPaid, tenure) {
  if (tenure <= 0) return 'new';
  var prog = monthsPaid / tenure;
  if (prog < 0.20) return 'early';
  if (prog < 0.50) return 'mid';
  return 'late';
}

/** Get unsecured debt ratio */
function unsecuredRatio(unsecuredEMI, income) {
  return income > 0 ? unsecuredEMI / income : 0;
}

/** Get loan purpose risk profile */
function loanPurposeRisk(purpose) {
  return CONFIG.LOAN_PURPOSE[purpose] || CONFIG.LOAN_PURPOSE.home;
}

/** Get dependent expense multiplier */
function dependentExpenseFactor(dependents) {
  var idx = Math.min(dependents, CONFIG.DEP_EXPENSE_FACTORS.length - 1);
  return CONFIG.DEP_EXPENSE_FACTORS[idx];
}