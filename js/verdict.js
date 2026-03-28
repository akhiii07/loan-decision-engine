/**
 * verdict.js — 3-layer hierarchical verdict
 *
 * Layer 1: HARD FAILURES (override everything → DANGEROUS)
 * Layer 2: STRUCTURAL RISK (→ RISKY)
 * Layer 3: DYNAMIC STRESS (→ SAFE / MODERATE)
 */

function determineVerdict(base, incomeShock, combined, recovery, rateNorm, rateShock, inp) {
  var th = getThresholds(inp.incomeType);

  // ═══ LAYER 1: HARD FAILURES ═══
  if (inp.savings === 0 && inp.totalEMI > 0)  return 'DANGEROUS';
  if (base.residual < 0)                       return 'DANGEROUS';
  if (base.deficit > 0)                        return 'DANGEROUS';
  if (rateShock && rateShock.negAmort)          return 'DANGEROUS';
  if (base.emiRatio > th.risky)                return 'DANGEROUS';

  if (recovery && (recovery.feasibility === 'impossible' ||
                   recovery.feasibility === 'no-runway' ||
                   recovery.feasibility === 'unrealistic')) return 'DANGEROUS';

  var iS = isFinite(incomeShock.survival) ? incomeShock.survival : 99;
  if (iS < 3)                                 return 'DANGEROUS';
  if (inp.unsecuredRatio > 0.25)               return 'DANGEROUS';

  // ═══ LAYER 2: STRUCTURAL RISK ═══
  if (rateNorm && rateNorm.applicable && !rateNorm.aboveNorm && rateNorm.normRatio > th.risky)
    return 'RISKY';
  if (recovery && recovery.feasibility === 'extreme') return 'RISKY';
  if (iS < 6)                                 return 'RISKY';
  if (base.emiRatio > th.warn)                 return 'RISKY';
  var buf = isFinite(base.buffer) ? base.buffer : 99;
  if (buf < 3)                                 return 'RISKY';
  if (inp.unsecuredRatio > 0.15)               return 'RISKY';

  // ═══ LAYER 3: SAFE vs MODERATE ═══
  var lpRisk = loanPurposeRisk(inp.loanPurpose);
  var safeBuf = (CONFIG.BUFFER_TARGET[inp.incomeType] || 6) + lpRisk.bufAdj;

  if (iS > 9 && base.emiRatio <= th.green && buf > safeBuf && base.residual > 0)
    return 'SAFE';

  return 'MODERATE';
}

/** Verdict display text */
function verdictText(verdict) {
  return {
    SAFE:      '✓  Proceed with confidence.',
    MODERATE:  '~  Improve weak areas first.',
    RISKY:     '⚠  Significant financial risk.',
    DANGEROUS: '✕  High probability of distress.'
  }[verdict];
}

/** Build combined decision statement */
function buildDecisionStatement(verdict, elig, base, inp) {
  var eligible = elig && inp.newEMI <= elig.maxEMI;
  var affordable = base.deficit === 0 && base.residual > 0;

  if (eligible && affordable && verdict === 'SAFE')
    return 'ELIGIBLE, AFFORDABLE, STRESS-SAFE.';
  if (eligible && affordable && verdict === 'MODERATE')
    return 'ELIGIBLE & AFFORDABLE, but stress resilience weak.';
  if (eligible && !affordable)
    return 'Bank may APPROVE, but you CANNOT AFFORD this.';
  if (!eligible && affordable)
    return 'AFFORDABLE, but bank may REJECT this amount.';
  if (!eligible && !affordable)
    return 'NEITHER ELIGIBLE NOR AFFORDABLE.';
  if (eligible && verdict === 'RISKY')
    return 'ELIGIBLE but HIGH RISK under stress.';
  if (eligible && verdict === 'DANGEROUS')
    return 'May be approved, but will cause DISTRESS.';

  return verdictText(verdict).slice(2);
}

/** Map verdict to CSS color variable name */
function verdictColor(verdict) {
  return {
    SAFE: 'safe', MODERATE: 'moderate', RISKY: 'warning', DANGEROUS: 'danger'
  }[verdict] || 'danger';
}