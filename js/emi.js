/**
 * emi.js — EMI math: calculation, tenure, max loan
 *
 * All formulas are standard Indian banking EMI formulas:
 * EMI = P × r × (1+r)^N / ((1+r)^N - 1)
 */

/** Calculate monthly EMI */
function calculateEMI(principal, annualRate, tenureMonths) {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  var r = annualRate / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  var f = Math.pow(1 + r, tenureMonths);
  return principal * r * f / (f - 1);
}

/** Calculate tenure (months) for given EMI at given rate */
function calculateTenure(principal, annualRate, emi) {
  if (principal <= 0 || emi <= 0) return 0;
  var r = annualRate / 12 / 100;
  if (r === 0) return Math.ceil(principal / emi);
  if (emi <= principal * r) return Infinity; // can never repay
  return Math.ceil(-Math.log(1 - (principal * r / emi)) / Math.log(1 + r));
}

/** Max loan amount for a given EMI capacity */
function maxLoanForEMI(emi, annualRate, tenureMonths) {
  if (emi <= 0 || tenureMonths <= 0) return 0;
  var r = annualRate / 12 / 100;
  if (r === 0) return emi * tenureMonths;
  var f = Math.pow(1 + r, tenureMonths);
  return emi * (f - 1) / (r * f);
}

/** Simulate prepayment impact */
function simulatePrepayment(principal, annualRate, tenureMonths, annualPrepay) {
  if (annualPrepay <= 0) return null;
  var r = annualRate / 12 / 100;
  var balance = principal;
  var totalPaid = 0;
  var months = 0;
  var origEMI = calculateEMI(principal, annualRate, tenureMonths);
  var origTotal = origEMI * tenureMonths;

  while (balance > 0 && months < tenureMonths * 2) {
    var interest = balance * r;
    var princPaid = Math.min(origEMI - interest, balance);
    if (princPaid < 0) break;
    balance -= princPaid;
    totalPaid += origEMI;
    months++;
    // Annual lump-sum prepayment
    if (months % 12 === 0 && balance > 0) {
      var pp = Math.min(annualPrepay, balance);
      balance -= pp;
      totalPaid += pp;
    }
    if (balance <= 0) break;
  }

  return {
    origTenure:    tenureMonths,
    newTenure:     months,
    savedMonths:   tenureMonths - months,
    savedYears:    ((tenureMonths - months) / 12).toFixed(1),
    origTotal:     origTotal,
    newTotal:      totalPaid,
    savedInterest: origTotal - totalPaid,
    annualPrepay:  annualPrepay
  };
}