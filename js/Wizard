/**
 * wizard.js — Step-based flow controller
 *
 * Controls WHEN inputs are shown and navigated.
 * Does NOT touch any calculation functions.
 * Triggers existing #analyzeBtn on final step.
 */

(function() {

  /* ─────────────────────────────────────
     STATE
  ───────────────────────────────────── */
  var currentStep = 0;   // 0 = intent screen
  var userIntent  = null; // 'new' | 'existing'

  // Steps for "new loan" intent:   0,1,2,3,4,5,6,7
  // Steps for "existing" intent:   0,1,2,3,4,7
  // Step 0 = intent (no indicator)
  // Step 7 = review

  function stepsForIntent(intent) {
    if (intent === 'new') return [0,1,2,3,4,5,6,7];
    return [0,1,2,3,4,7];
  }

  function totalContentSteps(intent) {
    // excludes intent step (0), counts numbered steps
    return stepsForIntent(intent).length - 1;
  }

  function contentStepIndex() {
    // position among content steps (1-based)
    var seq = stepsForIntent(userIntent);
    var pos = seq.indexOf(currentStep);
    return pos; // 0 = intent, 1..N = content
  }

  /* ─────────────────────────────────────
     DOM REFERENCES
  ───────────────────────────────────── */
  var wizardHeader = document.getElementById('wizardHeader');
  var stepIndicator = document.getElementById('stepIndicator');
  var stepBarFill   = document.getElementById('stepBarFill');
  var wizardNav     = document.getElementById('wizardNav');
  var btnBack       = document.getElementById('btnBack');
  var btnNext       = document.getElementById('btnNext');

  /* ─────────────────────────────────────
     RENDER STEP
  ───────────────────────────────────── */
  function renderStep() {
    // Hide all steps
    var allSteps = document.querySelectorAll('.wizard-step');
    for (var i = 0; i < allSteps.length; i++) {
      allSteps[i].classList.remove('active');
    }

    // Show current step
    var activeEl = document.getElementById('step-' + currentStep);
    if (activeEl) activeEl.classList.add('active');

    // Intent screen: hide header + nav
    if (currentStep === 0) {
      wizardHeader.classList.add('hidden');
      wizardNav.classList.add('hidden');
      return;
    }

    wizardHeader.classList.remove('hidden');
    wizardNav.classList.remove('hidden');

    // Progress indicator
    var seq = stepsForIntent(userIntent);
    var pos = seq.indexOf(currentStep);           // 0=intent,1..N
    var total = seq.length - 1;                   // excludes intent step
    var current = pos;                            // 1-based display

    stepIndicator.textContent = 'Step ' + current + ' of ' + total;
    stepBarFill.style.width   = Math.round((current / total) * 100) + '%';

    // Back button
    btnBack.style.display = pos <= 1 ? 'none' : '';

    // Next / Analyze button
    var isLastStep = currentStep === 7;
    if (isLastStep) {
      btnNext.textContent = '▶ Run Analysis';
      btnNext.classList.add('btn-analyze-final');
    } else {
      btnNext.textContent = 'Next →';
      btnNext.classList.remove('btn-analyze-final');
    }

    // Live hints
    updateLiveHints();

    // Review step
    if (currentStep === 7) renderReview();
  }

  /* ─────────────────────────────────────
     NAVIGATION
  ───────────────────────────────────── */
  function goNext() {
    var seq = stepsForIntent(userIntent);
    var pos = seq.indexOf(currentStep);
    if (pos === -1 || pos >= seq.length - 1) return;

    // Validate before advancing
    if (!validateStep(currentStep)) return;

    currentStep = seq[pos + 1];
    renderStep();
  }

  function goBack() {
    var seq = stepsForIntent(userIntent);
    var pos = seq.indexOf(currentStep);
    if (pos <= 1) return; // can't go back past step 1
    currentStep = seq[pos - 1];
    renderStep();
  }

  /* ─────────────────────────────────────
     VALIDATION
  ───────────────────────────────────── */
  function showErr(msg) {
    var e = document.getElementById('errorMsg');
    e.textContent = msg;
    e.style.display = 'block';
    setTimeout(function() { e.style.display = 'none'; }, 3000);
  }

  function r(id) {
    var v = parseFloat(document.getElementById(id).value);
    return isNaN(v) ? 0 : v;
  }

  function validateStep(step) {
    if (step === 1) {
      if (r('income') <= 0) { showErr('⚠ Enter your net monthly income.'); return false; }
    }
    if (step === 5) {
      if (r('loanAmount') <= 0) { showErr('⚠ Enter loan amount.'); return false; }
      if (r('interestRate') <= 0) { showErr('⚠ Enter interest rate.'); return false; }
      if (r('tenure') <= 0) { showErr('⚠ Enter tenure.'); return false; }
    }
    return true;
  }

  /* ─────────────────────────────────────
     LIVE HINTS
  ───────────────────────────────────── */
  function updateLiveHints() {

    // Step 2: EMI ratio hint
    if (currentStep === 2) {
      var inc   = r('income');
      var sEMI  = r('securedEMI');
      var uEMI  = r('unsecuredEMI');
      var total = sEMI + uEMI;
      var hint  = document.getElementById('emiHint');
      if (inc > 0 && total > 0) {
        var ratio = total / inc;
        var pct   = (ratio * 100).toFixed(1);
        var cls   = ratio <= 0.35 ? 'hint-ok' : ratio <= 0.45 ? 'hint-warn' : 'hint-bad';
        hint.textContent = 'Existing EMI ratio: ' + pct + '% of income';
        hint.className = 'live-hint ' + cls;
      } else {
        hint.textContent = 'No existing EMIs — you have full capacity for new debt.';
        hint.className = 'live-hint';
      }
    }

    // Step 3: Expense ratio hint
    if (currentStep === 3) {
      var inc  = r('income');
      var ess  = r('essentialExp');
      var lf   = r('lifestyleExp');
      var sf   = r('semiFixedExp');
      var hint = document.getElementById('expHint');
      if (inc > 0 && (ess + lf + sf) > 0) {
        var expRatio = (ess + lf + sf) / inc;
        var pct = (expRatio * 100).toFixed(1);
        var cls = expRatio <= 0.50 ? 'hint-ok' : expRatio <= 0.70 ? 'hint-warn' : 'hint-bad';
        hint.textContent = 'Total expenses: ' + pct + '% of income';
        hint.className = 'live-hint ' + cls;
      } else {
        hint.textContent = 'Enter your monthly expenses above.';
        hint.className = 'live-hint';
      }
    }

    // Step 4: Savings buffer hint
    if (currentStep === 4) {
      var cash  = r('cashBalance');
      var fd    = r('fdBalance');
      var other = r('otherSavings');
      var hint  = document.getElementById('savingsHint');
      var w = CONFIG.LIQUIDITY;
      var usable = cash * w.cash + fd * w.fd + other * w.other;

      var inc    = r('income');
      var sEMI   = r('securedEMI');
      var uEMI   = r('unsecuredEMI');
      var ess    = r('essentialExp');
      var sf     = r('semiFixedExp');
      var lf     = r('lifestyleExp');
      var approxBurn = (sEMI + uEMI) + ess + sf + lf;

      if (usable > 0 && approxBurn > 0) {
        var bufMo = usable / approxBurn;
        var cls   = bufMo >= 6 ? 'hint-ok' : bufMo >= 3 ? 'hint-warn' : 'hint-bad';
        hint.textContent = 'Usable savings: ₹' + Math.round(usable).toLocaleString('en-IN')
          + ' · Buffer: ~' + bufMo.toFixed(1) + ' months';
        hint.className = 'live-hint ' + cls;
      } else {
        hint.textContent = 'Savings build your emergency runway. Target: 6+ months of outflow.';
        hint.className = 'live-hint';
      }
    }

    // Step 5: Live EMI calculation
    if (currentStep === 5) {
      var la   = r('loanAmount');
      var rate = r('interestRate');
      var tn   = r('tenure');
      var hint = document.getElementById('emiLiveHint');
      if (la > 0 && rate > 0 && tn > 0) {
        var emi   = calculateEMI(la, rate, tn);
        var inc   = r('income');
        var sEMI  = r('securedEMI');
        var uEMI  = r('unsecuredEMI');
        var total = sEMI + uEMI + emi;
        var ratio = inc > 0 ? total / inc : 0;
        var pct   = (ratio * 100).toFixed(1);
        var cls   = ratio <= 0.40 ? 'hint-ok' : ratio <= 0.50 ? 'hint-warn' : 'hint-bad';
        hint.innerHTML = 'EMI: <strong>₹' + Math.round(emi).toLocaleString('en-IN')
          + '/mo</strong> · Total EMI ratio: ' + pct + '%';
        hint.className = 'live-hint ' + cls;
      } else {
        hint.textContent = 'Enter loan amount, rate and tenure to see live EMI.';
        hint.className = 'live-hint';
      }
    }

    // Step 6: LTV hint
    if (currentStep === 6) {
      var la   = r('loanAmount');
      var pv   = r('propertyValue');
      var hint = document.getElementById('ltvHint');
      if (la > 0 && pv > 0) {
        var ltv    = la / pv;
        var ltvPct = (ltv * 100).toFixed(1);
        var maxLTV = 0.75;
        for (var i = 0; i < CONFIG.LTV_SLABS.length; i++) {
          if (la <= CONFIG.LTV_SLABS[i].maxLoan) { maxLTV = CONFIG.LTV_SLABS[i].maxLTV; break; }
        }
        var compliant = ltv <= maxLTV;
        var cls = compliant ? 'hint-ok' : 'hint-bad';
        hint.textContent = 'LTV: ' + ltvPct + '% · RBI max: ' + (maxLTV * 100).toFixed(0)
          + '% · ' + (compliant ? '✓ Compliant' : '✕ Exceeds RBI limit');
        hint.className = 'live-hint ' + cls;
      } else {
        hint.textContent = 'Optional — enter property value and loan to check LTV.';
        hint.className = 'live-hint';
      }
    }
  }

  /* ─────────────────────────────────────
     REVIEW STEP RENDERER
  ───────────────────────────────────── */
  function fmtR(n) {
    if (!n || n === 0) return '—';
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  function renderReview() {
    var grid = document.getElementById('reviewGrid');
    var inc  = r('income');
    var sEMI = r('securedEMI');
    var uEMI = r('unsecuredEMI');
    var ess  = r('essentialExp');
    var lf   = r('lifestyleExp');
    var sf   = r('semiFixedExp');
    var cash = r('cashBalance');
    var fd   = r('fdBalance');
    var other= r('otherSavings');
    var w    = CONFIG.LIQUIDITY;
    var usable = cash * w.cash + fd * w.fd + other * w.other;

    var html = '';

    // Income
    html += section('Income', [
      ['Net Monthly Income',   fmtR(inc)],
      ['Income Type',          document.getElementById('incomeType').value],
      ['Income Shock %',       r('incomeShock') + '%'],
      ['Annual Bonus',         fmtR(r('annualBonus'))],
      ['Dependents',           r('dependents')]
    ]);

    // Existing EMIs
    html += section('Existing EMIs', [
      ['Secured EMIs/mo',      fmtR(sEMI)],
      ['Unsecured EMIs/mo',    fmtR(uEMI)]
    ]);

    // Expenses
    html += section('Monthly Expenses', [
      ['Essential',            fmtR(ess)],
      ['Lifestyle',            fmtR(lf)],
      ['Semi-Fixed',           fmtR(sf)]
    ]);

    // Savings
    html += section('Savings', [
      ['Cash + Bank',          fmtR(cash)],
      ['Fixed Deposits',       fmtR(fd)],
      ['Other Investments',    fmtR(other)],
      ['Usable Savings',       '₹' + Math.round(usable).toLocaleString('en-IN')]
    ]);

    // Loan (new intent only)
    if (userIntent === 'new') {
      var la   = r('loanAmount');
      var rate = r('interestRate');
      var tn   = r('tenure');
      var emi  = (la > 0 && rate > 0 && tn > 0) ? calculateEMI(la, rate, tn) : 0;
      html += section('New Loan', [
        ['Loan Amount',          fmtR(la)],
        ['EMI',                  emi > 0 ? fmtR(emi) + '/mo' : '—'],
        ['Rate',                 rate + '% ' + document.getElementById('rateType').value],
        ['Tenure',               tn + ' months'],
        ['Purpose',              document.getElementById('loanPurpose').value]
      ]);

      var pv = r('propertyValue');
      if (pv > 0) {
        var ltv = la > 0 ? ((la / pv) * 100).toFixed(1) + '%' : '—';
        html += section('Property', [
          ['Property Value',       fmtR(pv)],
          ['Down Payment',         fmtR(r('downPayment'))],
          ['LTV',                  ltv]
        ]);
      }
    } else {
      // For existing intent, put in a dummy loan section so main.js doesn't fail
      html += '<div style="display:none" id="reviewExistingNote"></div>';
    }

    grid.innerHTML = html;

    function section(title, rows) {
      var s = '<div class="review-section"><div class="review-section-title">' + title + '</div>';
      rows.forEach(function(row) {
        s += '<div class="review-row"><span class="review-key">' + row[0]
           + '</span><span class="review-val">' + row[1] + '</span></div>';
      });
      s += '</div>';
      return s;
    }
  }

  /* ─────────────────────────────────────
     INTENT BUTTONS
  ───────────────────────────────────── */
  var intentBtns = document.querySelectorAll('.intent-btn');
  for (var i = 0; i < intentBtns.length; i++) {
    intentBtns[i].addEventListener('click', function() {
      userIntent  = this.getAttribute('data-intent');
      currentStep = 1;

      // For 'existing' intent, set default loan values so main.js doesn't fail
      if (userIntent === 'existing') {
        var la = document.getElementById('loanAmount');
        var rt = document.getElementById('interestRate');
        var tn = document.getElementById('tenure');
        if (!la.value || parseFloat(la.value) === 0) la.value = '1';
        if (!rt.value || parseFloat(rt.value) === 0) rt.value = '8.5';
        if (!tn.value || parseFloat(tn.value) === 0) tn.value = '1';
      }

      renderStep();
    });
  }

  /* ─────────────────────────────────────
     NAV BUTTONS
  ───────────────────────────────────── */
  document.getElementById('btnNext').addEventListener('click', function() {
    if (currentStep === 7) {
      // Final step — trigger analysis
      document.getElementById('analyzeBtn').click();
    } else {
      goNext();
    }
  });

  document.getElementById('btnBack').addEventListener('click', goBack);

  /* ─────────────────────────────────────
     INCOME TYPE HINT (live)
  ───────────────────────────────────── */
  document.getElementById('incomeType').addEventListener('change', function() {
    document.getElementById('shockHint').style.display =
      this.value === 'self-employed' ? 'block' : 'none';
  });

  /* ─────────────────────────────────────
     LIVE UPDATES ON INPUT CHANGE
  ───────────────────────────────────── */
  var inputs = document.querySelectorAll('input[type="number"], select');
  for (var j = 0; j < inputs.length; j++) {
    inputs[j].addEventListener('input', function() { updateLiveHints(); });
    inputs[j].addEventListener('change', function() { updateLiveHints(); });
  }

  /* ─────────────────────────────────────
     COLLAPSIBLE TOGGLE
  ───────────────────────────────────── */
  document.getElementById('detailToggle').addEventListener('click', function() {
    this.classList.toggle('open');
    document.getElementById('detailBody').classList.toggle('open');
  });

  /* ─────────────────────────────────────
     INIT
  ───────────────────────────────────── */
  renderStep();

})();
