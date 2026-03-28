/**
 * eligibility.js — Bank eligibility, LTV, LTI
 *
 * Answers: "Would a bank approve this loan?"
 */

/** Calculate bank eligibility (max EMI, max loan) */
function calculateEligibility(income, existingEMI, rate, tenure, incomeType) {
  var maxFactor  = CONFIG.ELIG_MAX_FACTOR[incomeType]  || 0.50;
  var safeFactor = CONFIG.ELIG_SAFE_FACTOR[incomeType] || 0.40;
  var maxEMI  = Math.max(0, income * maxFactor - existingEMI);
  var safeEMI = Math.max(0, income * safeFactor - existingEMI);

  return {
    maxEMI:     maxEMI,
    safeEMI:    safeEMI,
    maxLoan:    maxLoanForEMI(maxEMI, rate, tenure),
    safeLoan:   maxLoanForEMI(safeEMI, rate, tenure),
    maxFactor:  maxFactor,
    safeFactor: safeFactor
  };
}

/** Calculate Loan-to-Value ratio with RBI compliance check */
function calculateLTV(loanAmount, propertyValue) {
  if (propertyValue <= 0) return null;
  var ltv = loanAmount / propertyValue;
  var maxLTV = 0.75; // default for > 75L

  for (var i = 0; i < CONFIG.LTV_SLABS.length; i++) {
    if (propertyValue <= CONFIG.LTV_SLABS[i].maxLoan) {
      maxLTV = CONFIG.LTV_SLABS[i].maxLTV;
      break;
    }
  }

  return {
    ltv:       ltv,
    maxLTV:    maxLTV,
    compliant: ltv <= maxLTV,
    equity:    1 - ltv
  };
}

/** Calculate Loan-to-Income ratio */
function calculateLTI(loanAmount, monthlyIncome) {
  var annual = monthlyIncome * 12;
  return annual > 0 ? loanAmount / annual : Infinity;
}