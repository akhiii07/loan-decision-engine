/**
 * recovery.js — Recovery plan + Decision delta
 *
 * Recovery: Given a deficit, what cuts are needed and are they realistic?
 * Delta: What minimum changes move the user toward SAFE?
 */

/**
 * Build recovery plan for a stressed scenario
 * @param {Object} stressedSnapshot - snapshot under income shock
 * @param {Object} inp - input parameters
 * @returns {Object|null} recovery plan or null if no deficit
 */
function buildRecoveryPlan(stressedSnapshot, inp) {
  var deficit = stressedSnapshot.deficit;
  if (deficit <= 0) return null;

  // Zero savings = no runway to execute any cuts
  if (inp.savings <= 0) {
    return {
      needed: deficit,
      feasibility: 'no-runway',
      lifeCut: 0, semiCut: 0, essCut: 0, remainder: 0,
      lifePct: 0, semiPct: 0, essPct: 0,
      note: 'Zero usable savings — instant default. No time to execute cuts.'
    };
  }

  // Deficit > 30% of income = unrealistic regardless of math
  if (deficit > inp.income * CONFIG.RECOVERY_UNREALISTIC_THRESHOLD) {
    return {
      needed: deficit,
      feasibility: 'unrealistic',
      lifeCut: 0, semiCut: 0, essCut: 0, remainder: deficit,
      lifePct: 0, semiPct: 0, essPct: 0,
      note: 'Deficit (' + formatRupees(deficit) + ') exceeds 30% of income. No realistic cuts can close this.'
    };
  }

  var gap = deficit;
  var result = { needed: deficit, lifeCut: 0, semiCut: 0, essCut: 0, remainder: 0,
                 lifePct: 0, semiPct: 0, essPct: 0, feasibility: '', note: '' };

  // Step 1: Cut lifestyle
  if (gap <= inp.lifestyle) {
    result.lifeCut = gap;
    result.lifePct = inp.lifestyle > 0 ? Math.round(gap / inp.lifestyle * 100) : 0;
    result.feasibility = 'achievable';
    result.note = 'Cut ' + formatRupees(gap) + ' from lifestyle (' + result.lifePct + '%).';
    return result;
  }
  result.lifeCut = inp.lifestyle;
  result.lifePct = 100;
  gap -= inp.lifestyle;

  // Step 2: Cut semi-fixed
  if (gap <= inp.semiFixed) {
    result.semiCut = gap;
    result.semiPct = inp.semiFixed > 0 ? Math.round(gap / inp.semiFixed * 100) : 0;
    result.feasibility = 'difficult';
    result.note = 'All lifestyle + ' + result.semiPct + '% semi-fixed (' + formatRupees(gap) + ').';
    return result;
  }
  result.semiCut = inp.semiFixed;
  result.semiPct = 100;
  gap -= inp.semiFixed;

  // Step 3: Cut essentials (max 40%)
  var maxEssCut = inp.essential * CONFIG.RECOVERY_MAX_ESSENTIAL_CUT;
  if (gap <= maxEssCut) {
    result.essCut = gap;
    result.essPct = inp.essential > 0 ? Math.round(gap / inp.essential * 100) : 0;
    result.feasibility = 'extreme';
    result.note = 'Zero lifestyle/semi-fixed + ' + result.essPct + '% essential cut (' + formatRupees(gap) + ').';
    return result;
  }

  // Step 4: Even max cuts can't close it
  result.essCut = maxEssCut;
  result.essPct = 40;
  result.remainder = gap - maxEssCut;
  result.feasibility = 'impossible';
  result.note = 'Max cuts leave ' + formatRupees(result.remainder) + '/mo uncoverable.';
  return result;
}

/**
 * Compute Decision Delta — minimum changes to improve
 * @param {Object} inp - input parameters
 * @param {Object} base - baseline snapshot
 * @param {Object} elig - eligibility result
 * @param {string} verdict - current verdict
 * @param {Object} incomeShock - income shock snapshot
 * @returns {Array} sorted list of action items
 */
function computeDecisionDelta(inp, base, elig, verdict, incomeShock) {
  if (verdict === 'SAFE') return [];

  var delta = [];
  var th = getThresholds(inp.incomeType);
  var lpRisk = loanPurposeRisk(inp.loanPurpose);

  // 1. EMI reduction needed
  var safeEMI = Math.max(0, inp.income * th.green - inp.existingEMI);
  if (inp.newEMI > safeEMI) {
    var reducedLoan = maxLoanForEMI(safeEMI, inp.rate, inp.tenure);
    delta.push({
      type: 'Reduce loan',
      priority: inp.newEMI - safeEMI,
      message: 'Reduce EMI by ' + formatRupees(inp.newEMI - safeEMI)
               + '/mo (loan from ' + formatLakh(inp.loanAmount)
               + ' to ' + formatLakh(Math.max(0, reducedLoan)) + ')'
    });
  }

  // 2. Savings gap
  var bufTarget = base.outflow * (CONFIG.BUFFER_TARGET[inp.incomeType] || 6);
  bufTarget += base.outflow * lpRisk.bufAdj;
  if (inp.savings < bufTarget) {
    delta.push({
      type: 'Build savings',
      priority: bufTarget - inp.savings,
      message: 'Increase usable savings by ' + formatRupees(bufTarget - inp.savings)
               + ' (target: ' + formatRupees(bufTarget) + ')'
    });
  }

  // 3. Expense reduction (if deficit)
  if (base.deficit > 0) {
    delta.push({
      type: 'Cut expenses',
      priority: base.deficit,
      message: 'Reduce monthly expenses by ' + formatRupees(base.deficit) + ' to break even'
    });
  }

  // 4. Income needed for shock safety
  if (incomeShock && incomeShock.deficit > 0) {
    var safeIncome = base.outflow / (1 - incomeShock.shockPct / 100);
    if (inp.income < safeIncome) {
      delta.push({
        type: 'Increase income',
        priority: (safeIncome - inp.income) * 0.5,
        message: 'Grow income by ' + formatRupees(safeIncome - inp.income)
                 + '/mo to survive ' + incomeShock.shockPct + '% shock'
      });
    }
  }

  // 5. Unsecured debt payoff
  if (inp.unsecuredRatio > 0.15) {
    delta.push({
      type: 'Clear unsecured debt',
      priority: inp.unsecuredEMI * 12,
      message: 'Pay off unsecured EMIs (' + formatRupees(inp.unsecuredEMI)
               + '/mo) before new secured debt'
    });
  }

  // Sort by priority (highest impact first)
  delta.sort(function(a, b) { return b.priority - a.priority; });
  return delta;
}