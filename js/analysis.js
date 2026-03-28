/**
 * analysis.js — Build the explanation HTML
 *
 * Impact-first: stressed metrics → shock detail → rate → purpose → dependents → cost
 * Uses CSS classes: text-bad, text-warn, text-ok
 */

function buildAnalysisHTML(ctx) {
  var h = '';
  var base = ctx.base, iShk = ctx.incomeShock, rShk = ctx.rateShock, rNrm = ctx.rateNorm;
  var inp = ctx.inp, th = ctx.thresholds;
  var stressEmiR = ctx.stressEmiRatio;
  var realSurv = ctx.realisticSurvival;
  var theoSurv = ctx.theoreticalSurvival;
  var zeroSav = ctx.zeroSavings;
  var savMask = ctx.savingsMasking;
  var iS = iShk.survival;

  // ── Baseline deficit (most critical signal) ──
  if (base.deficit > 0) {
    h += '<span class="text-bad"><strong>⚠ You are already losing ' + formatRupees(base.deficit)
      + '/month before any stress event.</strong>';
    if (savMask)
      h += ' Your ' + formatRupees(inp.savings) + ' usable savings are delaying failure, not preventing it — exhausted in '
        + (isFinite(base.buffer) ? Math.floor(base.buffer) : '∞') + ' months.';
    h += '</span><br>';
  }

  // ── Income shock (lead story) ──
  h += '<span class="text-bad"><strong>Under ' + iShk.shockPct + '% income shock:</strong></span><br>';
  if (iShk.deficit > 0) {
    h += '<span class="text-bad">Income drops to ' + formatRupees(iShk.shockedIncome)
      + '. Outflow unchanged at ' + formatRupees(base.outflow)
      + '. Deficit: <strong>' + formatRupees(iShk.deficit) + '/mo</strong>. ';
    h += 'EMI ratio jumps from ' + formatPct(base.emiRatio) + ' to <strong>' + formatPct(stressEmiR) + '</strong>. ';
    if (zeroSav)
      h += 'With zero usable savings: <strong>instant default</strong>.';
    else {
      h += 'Theoretical survival: ' + Math.round(theoSurv) + ' months. ';
      h += '<strong>Realistic: ~' + Math.floor(realSurv) + ' months</strong> (behavioral + '
        + (inp.incomeType === 'self-employed' ? 'self-employed volatility' : 'delayed action')
        + (inp.dependents > 0 ? ' + ' + inp.dependents + ' dependents' : '') + ').';
    }
    h += '</span><br>';
  } else {
    h += '<span class="text-ok">Surplus of ' + formatRupees(iShk.net) + '/mo even under shock.</span><br>';
  }

  // ── Rate shock ──
  if (rShk) {
    if (rShk.negAmort)
      h += '<span class="text-bad"><strong>Debt trap at +2%:</strong> Interest (' + formatRupees(rShk.monthlyInterest)
        + ') > EMI (' + formatRupees(inp.newEMI) + '). Debt grows monthly.</span><br>';
    else if (rShk.deficit > 0)
      h += '<span class="text-warn"><strong>Rate +2%:</strong> Creates deficit of '
        + formatRupees(rShk.deficit) + '/mo.</span><br>';
  }

  // ── Loan purpose ──
  var lpR = loanPurposeRisk(inp.loanPurpose);
  if (inp.loanPurpose === 'personal')
    h += '<span class="text-bad"><strong>Unsecured loan:</strong> Personal loans carry highest default risk — no asset backing.</span><br>';
  else if (inp.loanPurpose === 'auto')
    h += '<span class="text-warn"><strong>Depreciating asset:</strong> Vehicle value drops ~15-20%/yr while loan balance decreases slowly.</span><br>';
  else
    h += '<span class="text-ok"><strong>Asset-backed:</strong> Home loans carry relatively lower structural risk.</span><br>';

  // ── Dependents ──
  if (inp.dependents > 0) {
    var cls = inp.dependents >= 3 ? 'text-bad' : 'text-warn';
    var depF = dependentExpenseFactor(inp.dependents);
    h += '<span class="' + cls + '"><strong>Dependents (' + inp.dependents + '):</strong> Essentials adjusted +'
      + Math.round((depF - 1) * 100) + '% to reflect real household cost.';
    if (inp.essentialRaw !== inp.essential)
      h += ' (' + formatRupees(inp.essentialRaw) + ' → ' + formatRupees(inp.essential) + ')';
    h += '</span><br>';
  }

  // ── Unsecured debt ──
  if (inp.unsecuredRatio > 0.05) {
    var uc = inp.unsecuredRatio > 0.25 ? 'text-bad' : inp.unsecuredRatio > 0.15 ? 'text-warn' : 'text-ok';
    h += '<span class="' + uc + '"><strong>Unsecured debt:</strong> ' + formatPct(inp.unsecuredRatio)
      + ' of income. ' + (inp.unsecuredRatio > 0.25 ? '#1 default driver in India.' :
        inp.unsecuredRatio > 0.15 ? 'Elevated risk.' : 'Within safe range.') + '</span><br>';
  }

  // ── Liquidity quality ──
  if (ctx.totalRawSavings > inp.savings * 1.3)
    h += '<span class="text-warn"><strong>Liquidity quality:</strong> Total savings '
      + formatRupees(ctx.totalRawSavings) + ', but only ' + formatRupees(inp.savings)
      + ' usable in emergency.</span><br>';

  // ── Loan stage ──
  if (inp.stage === 'early')
    h += '<span class="text-warn"><strong>Early-stage risk:</strong> First 20% of tenure — most EMI goes to interest. Vulnerability highest now.</span><br>';

  // ── Rate normalization ──
  if (rNrm && rNrm.applicable && !rNrm.aboveNorm)
    h += '<span class="' + emiColor(rNrm.normRatio, inp.incomeType)
      + '"><strong>Rate reality:</strong> ' + inp.rate.toFixed(1) + '% benefits from cyclical low. At normalized '
      + rNrm.normRate.toFixed(1) + '%: ratio ' + formatPct(rNrm.normRatio) + '.</span><br>';
  if (rNrm && rNrm.applicable && rNrm.aboveNorm)
    h += '<span class="text-ok"><strong>Rate upside:</strong> Your ' + inp.rate.toFixed(1)
      + '% is above avg — rate drops save ' + formatRupees(Math.abs(rNrm.normDelta) * 12) + '/yr.</span><br>';

  // ── Interest cost ──
  if (ctx.interestRatio > 0.5) {
    var cls2 = ctx.interestRatio > 1 ? 'text-bad' : 'text-warn';
    h += '<span class="' + cls2 + '"><strong>Cost:</strong> Interest ' + formatLakh(ctx.totalInterest)
      + ' (' + Math.round(ctx.interestRatio * 100) + '% of principal). Total: '
      + formatLakh(inp.newEMI * inp.tenure) + ' for ' + formatLakh(inp.loanAmount) + '.</span><br>';
  }

  return h;
}