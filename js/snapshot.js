/**
 * snapshot.js — Monthly cashflow snapshot
 *
 * THE single source of truth for all financial state.
 * Every scenario calls this with different parameters.
 * Downstream metrics (buffer, survival) derive from this.
 */

/**
 * Create a cashflow snapshot
 * @param {number} income     - Monthly income
 * @param {number} totalEMI   - All EMIs (existing + new)
 * @param {number} essential  - Essential expenses
 * @param {number} semiFixed  - Semi-fixed obligations
 * @param {number} lifestyle  - Lifestyle expenses
 * @returns {Object} snapshot with all derived metrics
 */
function createSnapshot(income, totalEMI, essential, semiFixed, lifestyle) {
  var outflow = totalEMI + essential + semiFixed + lifestyle;
  var net = income - outflow;

  return {
    income:    income,
    totalEMI:  totalEMI,
    essential: essential,
    semiFixed: semiFixed,
    lifestyle: lifestyle,
    outflow:   outflow,
    net:       net,
    emiRatio:  income > 0 ? totalEMI / income : Infinity,
    residual:  income - (totalEMI + essential + semiFixed),
    deficit:   net < 0 ? -net : 0
  };
}

/**
 * Calculate buffer months
 * Uses drain-based calculation when baseline deficit exists.
 * @param {number} savings  - Usable savings
 * @param {number} outflow  - Total monthly outflow
 * @param {number} deficit  - Monthly deficit (0 if no deficit)
 * @returns {number} months of buffer
 */
function calculateBuffer(savings, outflow, deficit) {
  if (savings <= 0) return 0;
  if (deficit > 0) return savings / deficit;  // drain-based
  if (outflow <= 0) return Infinity;
  return savings / outflow;                   // zero-income runway
}

/**
 * Calculate survival months
 * @param {number} savings - Usable savings
 * @param {number} deficit - Monthly deficit
 * @returns {number} months until savings exhausted
 */
function calculateSurvival(savings, deficit) {
  if (deficit <= 0) return Infinity;
  if (savings <= 0) return 0;
  return savings / deficit;
}