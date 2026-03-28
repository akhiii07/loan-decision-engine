/**
 * scenarios.js — All 6 stress scenarios
 *
 * Every scenario uses RAW expenses (no silent adjustments).
 * Each returns a snapshot + scenario-specific metadata.
 */

/** S0: Baseline — current state, no shock */
function scenarioBaseline(inp) {
  var s = createSnapshot(inp.income, inp.totalEMI, inp.essential, inp.semiFixed, inp.lifestyle);
  s.buffer   = calculateBuffer(inp.savings, s.outflow, s.deficit);
  s.survival = s.deficit > 0 ? calculateSurvival(inp.savings, s.deficit) : Infinity;
  return s;
}

/** S1: Income shock — income drops, everything else unchanged */
function scenarioIncomeShock(inp) {
  var shockPct     = resolveShock(inp.rawShock, inp.incomeType);
  var shockedIncome = inp.income * (1 - shockPct / 100);

  var s = createSnapshot(shockedIncome, inp.totalEMI, inp.essential, inp.semiFixed, inp.lifestyle);
  s.buffer   = calculateBuffer(inp.savings, s.outflow, s.deficit);
  s.survival = calculateSurvival(inp.savings, s.deficit);

  s.shockPct      = shockPct;
  s.shockedIncome = shockedIncome;
  s.wasOverridden = (shockPct !== inp.rawShock);
  s.userShock     = inp.rawShock;
  return s;
}

/** S2: Rate shock — floating rate +2% */
function scenarioRateShock(inp) {
  if (inp.rateType !== 'floating') return null;

  var shockedRate = inp.rate + 2;
  var shockedNewEMI = calculateEMI(inp.loanAmount, shockedRate, inp.tenure);
  var emiDelta = shockedNewEMI - inp.newEMI;
  var shockedTotalEMI = inp.existingEMI + shockedNewEMI;

  var s = createSnapshot(inp.income, shockedTotalEMI, inp.essential, inp.semiFixed, inp.lifestyle);
  s.buffer   = calculateBuffer(inp.savings, s.outflow, s.deficit);
  s.survival = s.deficit > 0 ? calculateSurvival(inp.savings, s.deficit) : Infinity;

  // Tenure extension at same EMI
  var extTenure = calculateTenure(inp.loanAmount, shockedRate, inp.newEMI);

  // Negative amortization check
  var monthlyInterest = inp.loanAmount * (shockedRate / 12 / 100);

  s.emiDelta       = emiDelta;
  s.shockedRate    = shockedRate;
  s.tenureDelta    = isFinite(extTenure) ? extTenure - inp.tenure : Infinity;
  s.negAmort       = inp.newEMI < monthlyInterest;
  s.monthlyInterest = monthlyInterest;
  return s;
}

/** S3: Expense shock — essentials 1.5× */
function scenarioExpenseShock(inp) {
  var shockedEssential = inp.essential * 1.5;

  var s = createSnapshot(inp.income, inp.totalEMI, shockedEssential, inp.semiFixed, inp.lifestyle);
  s.buffer   = calculateBuffer(inp.savings, s.outflow, s.deficit);
  s.survival = s.deficit > 0 ? calculateSurvival(inp.savings, s.deficit) : Infinity;

  s.expenseDelta = shockedEssential - inp.essential;
  return s;
}

/** S4: Combined — income shock + expense shock */
function scenarioCombined(inp) {
  var shockPct = resolveShock(inp.rawShock, inp.incomeType);
  var shockedIncome = inp.income * (1 - shockPct / 100);
  var shockedEssential = inp.essential * 1.5;

  var s = createSnapshot(shockedIncome, inp.totalEMI, shockedEssential, inp.semiFixed, inp.lifestyle);
  s.buffer   = calculateBuffer(inp.savings, s.outflow, s.deficit);
  s.survival = calculateSurvival(inp.savings, s.deficit);

  s.shockPct = shockPct;
  return s;
}

/** S5: Rate normalization — repo returns to 10-year average */
function scenarioRateNormalization(inp) {
  if (inp.rateType !== 'floating') return null;

  var normRate = CONFIG.REPO_10YR_AVG + CONFIG.BANK_SPREAD;
  var normEMI  = calculateEMI(inp.loanAmount, normRate, inp.tenure);
  var normTotal = inp.existingEMI + normEMI;

  var s = createSnapshot(inp.income, normTotal, inp.essential, inp.semiFixed, inp.lifestyle);

  return {
    applicable: true,
    normRate:   normRate,
    normDelta:  normEMI - inp.newEMI,
    normRatio:  s.emiRatio,
    aboveNorm:  inp.rate >= normRate,
    repoNow:    CONFIG.REPO_CURRENT,
    repoAvg:    CONFIG.REPO_10YR_AVG
  };
}

/** S6: Inflation crossover — project income vs expenses over tenure */
function scenarioInflationCrossover(inp) {
  var years = Math.min(Math.ceil(inp.tenure / 12), 30);
  var table = [];
  var crossoverYear = null;
  var growthRates = CONFIG.INCOME_GROWTH;
  var expGrowth = CONFIG.EXPENSE_GROWTH;

  var inc = inp.income, ess = inp.essential, sf = inp.semiFixed, lf = inp.lifestyle, emi = inp.totalEMI;

  for (var y = 0; y <= years; y++) {
    var out = emi + ess + sf + lf;
    var net = inc - out;

    table.push({
      year: y, income: inc, emi: emi,
      outflow: out, net: net,
      emiRatio: inc > 0 ? emi / inc : Infinity
    });

    if (net < 0 && crossoverYear === null && y > 0) {
      crossoverYear = y;
    }

    if (y < years) {
      var g = y < 10 ? growthRates[0] : (y < 20 ? growthRates[1] : growthRates[2]);
      inc *= (1 + g);
      ess *= (1 + expGrowth.essential);
      sf  *= (1 + expGrowth.semiFixed);
      lf  *= (1 + expGrowth.lifestyle);
    }
  }

  return {
    table:         table,
    crossoverYear: crossoverYear,
    years:         years
  };
}

/** Compute EMI-to-income ratio trend at key years */
function emiTrend(totalEMI, income) {
  var points = [];
  var inc = income;
  var growthRates = CONFIG.INCOME_GROWTH;

  for (var y = 0; y <= 15; y += 5) {
    points.push({ year: y, ratio: inc > 0 ? totalEMI / inc : 0 });
    var g = y < 10 ? growthRates[0] : growthRates[1];
    for (var i = 0; i < 5 && y < 15; i++) inc *= (1 + g);
  }
  return points;
}