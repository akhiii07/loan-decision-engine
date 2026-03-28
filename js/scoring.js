/**
 * scoring.js — Composite decision score (0–95)
 *
 * Computes weighted component scores, applies penalties,
 * then enforces hard caps so score NEVER contradicts verdict.
 */

function calculateScore(base, incomeShock, recovery, elig, lti, ltv, rateShock, rateNorm, inp) {
  var th = getThresholds(inp.incomeType);
  var totalInterest = inp.newEMI * inp.tenure - inp.loanAmount;
  var interestRatio = inp.loanAmount > 0 ? totalInterest / inp.loanAmount : 0;
  var W = CONFIG.SCORE_WEIGHTS;

  // ── Component scores (0–100 each) ──

  var emiScore = base.emiRatio <= th.green ? 100 :
                 base.emiRatio <= th.warn  ? 65  :
                 base.emiRatio <= th.risky ? 35  : 5;

  var residualScore = base.residual <= 0               ? 0  :
                      base.residual < base.lifestyle    ? 25 :
                      base.residual < base.lifestyle * 2 ? 60 : 100;

  var bufVal = isFinite(base.buffer) ? base.buffer : 12;
  var bufferScore = bufVal >= 9 ? 100 : bufVal >= 6 ? 70 : bufVal >= 3 ? 35 :
                    inp.savings === 0 ? 0 : 10;

  // Survival: penalized when baseline deficit exists (savings ≠ safety)
  var iS = isFinite(incomeShock.survival) ? incomeShock.survival : 99;
  var survivalScore;
  if (base.deficit > 0) {
    survivalScore = Math.min(30, iS >= 12 ? 30 : iS >= 6 ? 20 : 10);
  } else if (incomeShock.deficit === 0) {
    survivalScore = 100;
  } else {
    survivalScore = iS >= 12 ? 100 : iS >= 6 ? 55 : iS >= 3 ? 25 : 0;
  }

  var eligScore = 100;
  if (elig) eligScore = inp.newEMI <= elig.safeEMI ? 100 : inp.newEMI <= elig.maxEMI ? 45 : 5;

  var ltiScore = 100;
  if (isFinite(lti)) ltiScore = lti <= 3 ? 100 : lti <= 5 ? 55 : 25;

  var ltvScore = 100;
  if (ltv) ltvScore = ltv.compliant ? (ltv.ltv <= 0.7 ? 100 : 75) : 20;

  // ── Weighted composite ──
  var raw = Math.round(
    residualScore * W.residual +
    emiScore      * W.emi +
    eligScore     * W.eligibility +
    bufferScore   * W.buffer +
    survivalScore * W.survival +
    ltiScore      * W.lti +
    ltvScore      * W.ltv
  );

  // ── Penalties ──
  if (interestRatio > 1)        raw -= CONFIG.PENALTY_INT_RATIO_HIGH;
  else if (interestRatio > 0.7) raw -= CONFIG.PENALTY_INT_RATIO_MED;

  if (rateNorm && rateNorm.applicable && !rateNorm.aboveNorm && rateNorm.normRatio > th.green)
    raw -= CONFIG.PENALTY_RATE_NORM;

  if (rateShock && rateShock.negAmort) raw -= CONFIG.PENALTY_NEG_AMORT;
  if (inp.stage === 'early')           raw -= CONFIG.PENALTY_EARLY_STAGE;

  if (inp.unsecuredRatio > 0.25)      raw -= CONFIG.PENALTY_UNSEC_HIGH;
  else if (inp.unsecuredRatio > 0.15) raw -= CONFIG.PENALTY_UNSEC_MED;

  if (inp.dependents >= 3)            raw -= CONFIG.PENALTY_HIGH_DEPS;

  // Loan purpose
  raw += loanPurposeRisk(inp.loanPurpose).riskAdj;

  // ── Clamp to 0–95 ──
  raw = Math.min(CONFIG.SCORE_MAX, Math.max(0, raw));

  // ── Hard caps (ensure score aligns with verdict) ──
  if (inp.savings === 0 && inp.totalEMI > 0) raw = Math.min(raw, CONFIG.SCORE_CAP_ZERO_SAV);
  if (base.residual < 0)                      raw = Math.min(raw, CONFIG.SCORE_CAP_NEG_RESID);
  if (base.deficit > 0)                        raw = Math.min(raw, CONFIG.SCORE_CAP_DEFICIT);
  if (rateShock && rateShock.negAmort)          raw = Math.min(raw, CONFIG.SCORE_CAP_NEG_AMORT);

  return Math.max(0, raw);
}