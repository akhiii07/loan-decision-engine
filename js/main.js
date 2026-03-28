/**
 * main.js — Orchestrator
 *
 * Reads inputs, builds the input object, runs all calculations,
 * assembles the context, and calls the renderer.
 *
 * This is the ONLY file that knows about input IDs.
 * Every other file works with plain objects.
 */

// ── UI Event: self-employed hint ──
el('incomeType').addEventListener('change', function() {
  el('shockHint').style.display = this.value === 'self-employed' ? 'block' : 'none';
});

// ── Main analysis ──
el('analyzeBtn').addEventListener('click', function() {
  try {
    var errEl = el('errorMsg');
    errEl.style.display = 'none';

    // ── READ ALL INPUTS ──
    var income      = readInput('income');
    var rawShock    = readInput('incomeShock');
    var incomeType  = el('incomeType').value;
    var rateType    = el('rateType').value;
    var bonus       = readInput('annualBonus');

    var securedEMI   = readInput('securedEMI');
    var unsecuredEMI = readInput('unsecuredEMI');
    var existingEMI  = securedEMI + unsecuredEMI;

    var loanAmount  = readInput('loanAmount');
    var rate        = readInput('interestRate');
    var tenure      = readInput('tenure');
    var monthsPaid  = readInput('monthsPaid');
    var loanPurpose = el('loanPurpose').value;

    var propertyVal = readInput('propertyValue');
    var downPayment = readInput('downPayment');

    var dependents  = Math.round(readInput('dependents'));
    var essentialRaw = readInput('essentialExp');
    var lifestyleAmt = readInput('lifestyleExp');
    var semiFixedAmt = readInput('semiFixedExp');

    var rawCash = readInput('cashBalance');
    var rawFD   = readInput('fdBalance');
    var rawOther = readInput('otherSavings');

    // ── VALIDATE ──
    if (income <= 0)     return showError('⚠ Income must be > 0.');
    if (loanAmount <= 0) return showError('⚠ Enter loan amount.');
    if (rate <= 0)       return showError('⚠ Enter interest rate.');
    if (tenure <= 0)     return showError('⚠ Enter tenure.');

    function showError(msg) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }

    // ── DERIVED VALUES ──
    var newEMI   = calculateEMI(loanAmount, rate, tenure);
    var totalEMI = existingEMI + newEMI;

    // Liquidity quality
    var savings     = usableSavings(rawCash, rawFD, rawOther);
    var totalRawSav = rawCash + rawFD + rawOther;

    // Dependents: adjust essential expenses
    var depFactor = dependentExpenseFactor(dependents);
    var essential = Math.round(essentialRaw * depFactor);

    // Risk metrics
    var unsecRatio = unsecuredRatio(unsecuredEMI, income);
    var stage      = loanStage(monthsPaid, tenure);
    var th         = getThresholds(incomeType);

    // ── BUILD INPUT OBJECT ──
    // This is the single object that every module receives.
    var inp = {
      income:        income,
      rawShock:      rawShock,
      incomeType:    incomeType,
      rateType:      rateType,
      existingEMI:   existingEMI,
      loanAmount:    loanAmount,
      rate:          rate,
      tenure:        tenure,
      newEMI:        newEMI,
      totalEMI:      totalEMI,
      essential:     essential,
      essentialRaw:  essentialRaw,
      lifestyle:     lifestyleAmt,
      semiFixed:     semiFixedAmt,
      savings:       savings,
      unsecuredEMI:  unsecuredEMI,
      unsecuredRatio: unsecRatio,
      stage:         stage,
      loanPurpose:   loanPurpose,
      dependents:    dependents
    };

    // ── RUN ALL CALCULATIONS ──
    var base      = scenarioBaseline(inp);
    var incShock  = scenarioIncomeShock(inp);
    var rateShock = scenarioRateShock(inp);
    var expShock  = scenarioExpenseShock(inp);
    var combined  = scenarioCombined(inp);
    var rateNorm  = scenarioRateNormalization(inp);
    var crossover = scenarioInflationCrossover(inp);

    var recovery    = buildRecoveryPlan(incShock, inp);
    var eligibility = calculateEligibility(income, existingEMI, rate, tenure, incomeType);
    var lti         = calculateLTI(loanAmount, income);
    var ltv         = propertyVal > 0 ? calculateLTV(loanAmount, propertyVal) : null;
    var prepay      = simulatePrepayment(loanAmount, rate, tenure, bonus > 0 ? bonus * 0.6 : 0);
    var trend       = emiTrend(totalEMI, income);

    var verdict          = determineVerdict(base, incShock, combined, recovery, rateNorm, rateShock, inp);
    var score            = calculateScore(base, incShock, recovery, eligibility, lti, ltv, rateShock, rateNorm, inp);
    var decisionStatement = buildDecisionStatement(verdict, eligibility, base, inp);
    var delta            = computeDecisionDelta(inp, base, eligibility, verdict, incShock);

    // Behavioral survival
    var theoSurv = isFinite(incShock.survival) ? incShock.survival : Infinity;
    var realSurv = realisticSurvival(theoSurv, incomeType, dependents);

    // Derived context
    var totalInterest = newEMI * tenure - loanAmount;
    var interestRatio = loanAmount > 0 ? totalInterest / loanAmount : 0;
    var stressEmiR    = incShock.shockedIncome > 0 ? totalEMI / incShock.shockedIncome : Infinity;
    var zeroSav       = savings <= 0 && totalEMI > 0;
    var savMask       = base.deficit > 0 && savings > base.deficit * 6;

    // ── ASSEMBLE CONTEXT ──
    // Single object passed to renderer — contains everything.
    var ctx = {
      inp:                inp,
      base:               base,
      incomeShock:        incShock,
      rateShock:          rateShock,
      expenseShock:       expShock,
      combined:           combined,
      rateNorm:           rateNorm,
      crossover:          crossover,
      recovery:           recovery,
      eligibility:        eligibility,
      lti:                lti,
      ltv:                ltv,
      prepay:             prepay,
      trend:              trend,
      verdict:            verdict,
      score:              score,
      decisionStatement:  decisionStatement,
      delta:              delta,
      thresholds:         th,
      theoreticalSurvival: theoSurv,
      realisticSurvival:  realSurv,
      totalInterest:      totalInterest,
      interestRatio:      interestRatio,
      stressEmiRatio:     stressEmiR,
      zeroSavings:        zeroSav,
      savingsMasking:     savMask,
      totalRawSavings:    totalRawSav
    };

    // ── RENDER ──
    renderResults(ctx);

    // ── ENHANCED OUTPUT (additive — does not touch core render) ──
    renderCoreReason(ctx);
    renderWorstCase(ctx);
    renderDeltaSummary(ctx);

  } catch (ex) {
    var errEl = el('errorMsg');
    errEl.textContent = '⚠ Error: ' + ex.message;
    errEl.style.display = 'block';
    console.error(ex);
  }
});
