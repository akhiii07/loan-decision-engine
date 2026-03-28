/* ═══════════════════════════════════════════════════════
   STEPFLOW CONTROLLER  v2
   -  All DOM classes use sf- prefix to avoid collisions
   -  Uses sf-active class toggling with !important CSS
   -  Does NOT touch any calculation/scoring/verdict logic
   ═══════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ─── State ──────────────────────────────────── */
  var userIntent = null;   // "new" | "existing"
  var currentStep = 0;
  var stepOrder = [];

  /* ─── Helpers ────────────────────────────────── */
  function $(id) { return document.getElementById(id); }

  function gN(v) { return parseFloat(v) || 0; }

  function fmtINR(v) {
    var n = gN(v);
    return "₹" + n.toLocaleString("en-IN");
  }

  /* ─── DOM refs ───────────────────────────────── */
  var sfNav      = $("sfNav");
  var sfBtnBack  = $("sfBtnBack");
  var sfBtnNext  = $("sfBtnNext");
  var sfProgress = $("sfProgress");
  var sfLabel    = $("sfLabel");
  var errMsg     = $("errorMsg");
  var analyzeBtn = $("analyzeBtn");

  // Gather all sf-step elements
  var allSteps = document.querySelectorAll(".sf-step");

  /* ─── Step mapping ───────────────────────────── */
  var STEP_LABELS = {
    0:        "Intent",
    1:        "Income",
    2:        "Existing EMIs",
    3:        "Expenses",
    4:        "Savings",
    5:        "Loan Details",
    6:        "Property",
    "review": "Review"
  };

  function buildStepOrder() {
    if (userIntent === "new") {
      stepOrder = [0, 1, 2, 3, 4, 5, 6, "review"];
    } else {
      stepOrder = [0, 1, 2, 3, 4, "review"];
    }
  }

  /* ─── Show / Hide Steps ──────────────────────── */

  function showStep(sid) {
    // Hide ALL steps
    for (var i = 0; i < allSteps.length; i++) {
      allSteps[i].classList.remove("sf-active");
    }
    // Show the target
    var target = $("sf-step-" + sid);
    if (target) {
      target.classList.add("sf-active");
    }
    clearError();
    updateNav();
    updateProgress();
    updateLiveIndicators();
    if (sid === "review") buildReview();
    // Scroll step into view
    if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function getIdx() {
    return stepOrder.indexOf(currentStep);
  }
  function totalSteps() {
    return stepOrder.length;
  }
  function isLast() {
    return getIdx() === totalSteps() - 1;
  }

  /* ─── Navigation ─────────────────────────────── */

  function goNext() {
    // If on review → trigger analysis
    if (currentStep === "review") {
      triggerAnalysis();
      return;
    }
    if (!validateStep()) return;
    var idx = getIdx();
    if (idx < totalSteps() - 1) {
      currentStep = stepOrder[idx + 1];
      showStep(currentStep);
    }
  }

  function goBack() {
    var idx = getIdx();
    if (idx > 0) {
      currentStep = stepOrder[idx - 1];
      showStep(currentStep);
    }
  }

  function updateNav() {
    if (currentStep === 0) {
      // Intent screen — hide nav entirely
      sfNav.classList.remove("sf-nav-visible");
      return;
    }
    sfNav.classList.add("sf-nav-visible");

    // Back button visibility
    if (getIdx() <= 1) {
      // On first input step (step 1) — show back to go to intent
      sfBtnBack.classList.remove("sf-hidden");
    } else {
      sfBtnBack.classList.remove("sf-hidden");
    }
    // Actually hide back only on intent (already handled above)

    // Next / Analyze label
    if (isLast()) {
      sfBtnNext.textContent = "▶ Analyze";
      sfBtnNext.classList.add("sf-btn-analyze");
    } else {
      sfBtnNext.textContent = "Next →";
      sfBtnNext.classList.remove("sf-btn-analyze");
    }
  }

  function updateProgress() {
    if (currentStep === 0) {
      sfProgress.innerHTML = "";
      sfLabel.textContent = "";
      return;
    }
    var idx = getIdx();
    var stepsAfterIntent = totalSteps() - 1; // exclude step 0

    var html = "";
    for (var i = 1; i < stepOrder.length; i++) {
      var sid = stepOrder[i];
      var cls = "sf-dot";
      if (i < idx) cls += " sf-dot-done";
      else if (i === idx) cls += " sf-dot-active";
      html += '<div class="' + cls + '">' + i + '</div>';
      if (i < stepOrder.length - 1) {
        var lineCls = "sf-line";
        if (i < idx) lineCls += " sf-line-done";
        html += '<div class="' + lineCls + '"></div>';
      }
    }
    sfProgress.innerHTML = html;
    sfLabel.textContent = "Step " + idx + " of " + stepsAfterIntent + " — " + (STEP_LABELS[currentStep] || "Review");
  }

  /* ─── Validation ─────────────────────────────── */

  function clearError() { if (errMsg) errMsg.textContent = ""; }

  function validateStep() {
    clearError();
    if (currentStep === 1) {
      if (gN($("income") && $("income").value) <= 0) {
        showError("Please enter your net monthly income.");
        return false;
      }
    }
    if (currentStep === 3) {
      if (gN($("essentialExp") && $("essentialExp").value) <= 0) {
        showError("Please enter your essential monthly expenses.");
        return false;
      }
    }
    if (currentStep === 5 && userIntent === "new") {
      var la = gN($("loanAmount") && $("loanAmount").value);
      var rt = gN($("interestRate") && $("interestRate").value);
      var tn = gN($("tenure") && $("tenure").value);
      if (la <= 0) { showError("Please enter the loan amount."); return false; }
      if (rt <= 0) { showError("Please enter the interest rate."); return false; }
      if (tn <= 0) { showError("Please enter the loan tenure."); return false; }
    }
    return true;
  }

  function showError(msg) {
    if (errMsg) {
      errMsg.textContent = msg;
      errMsg.style.display = "block";
    }
  }

  /* ─── Trigger Analysis ───────────────────────── */

  function triggerAnalysis() {
    // For "existing" intent → zero out loan fields so engine runs without new loan
    if (userIntent === "existing") {
      setVal("loanAmount", "0");
      if (!$("interestRate") || !$("interestRate").value) setVal("interestRate", "8.5");
      if (!$("tenure") || !$("tenure").value) setVal("tenure", "240");
      setVal("propertyValue", "0");
      setVal("downPayment", "0");
    }

    // Click the original hidden analyze button inside try/catch
    // so renderer.js errors don't break the step flow
    try {
      if (analyzeBtn) analyzeBtn.click();
    } catch (e) {
      console.warn("[stepflow] analyzeBtn.click() threw:", e);
    }

    // After a delay (let renderer.js finish), inject new output sections
    setTimeout(function () {
      try { injectCoreReason(); } catch (e) { console.warn("[stepflow] injectCoreReason:", e); }
      try { injectWorstCase(); } catch (e) { console.warn("[stepflow] injectWorstCase:", e); }
      try { injectTTF(); } catch (e) { console.warn("[stepflow] injectTTF:", e); }
      try { injectDelta(); } catch (e) { console.warn("[stepflow] injectDelta:", e); }
    }, 300);
  }

  function setVal(id, val) {
    var el = $(id);
    if (el) el.value = val;
  }

  /* ─── Intent Selection ───────────────────────── */

  function selectIntent(intent) {
    userIntent = intent;
    buildStepOrder();

    // Highlight selected button
    var btns = document.querySelectorAll(".sf-intent-btn");
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove("sf-selected");
    var sel = intent === "new" ? $("intentNew") : $("intentExisting");
    if (sel) sel.classList.add("sf-selected");

    // Small delay so user sees selection, then advance
    setTimeout(function () {
      currentStep = stepOrder[1]; // first input step
      showStep(currentStep);
    }, 250);
  }

  /* ─── Live Indicators ────────────────────────── */

  function updateLiveIndicators() {
    updateSurvival();
    updateEMI();
    updateLTV();
  }

  function updateSurvival() {
    var el = $("survivalText");
    if (!el) return;
    var cash  = gN($("cashBalance") && $("cashBalance").value);
    var fd    = gN($("fdBalance") && $("fdBalance").value);
    var other = gN($("otherSavings") && $("otherSavings").value);
    var ess   = gN($("essentialExp") && $("essentialExp").value);
    var semi  = gN($("semiFixedExp") && $("semiFixedExp").value);
    var sEMI  = gN($("securedEMI") && $("securedEMI").value);
    var uEMI  = gN($("unsecuredEMI") && $("unsecuredEMI").value);

    var liq = cash + (fd * 0.7) + (other * 0.3);
    var outflow = ess + semi + sEMI + uEMI;

    if (liq <= 0 || outflow <= 0) {
      el.textContent = "Enter savings to see survival estimate";
      el.className = "sf-live-text";
      return;
    }
    var months = Math.floor(liq / outflow);
    var cls = months >= 6 ? "sf-good" : months >= 3 ? "sf-warn" : "sf-danger";
    el.textContent = "Estimated survival: " + months + " months";
    el.className = "sf-live-text " + cls;
  }

  function updateEMI() {
    var el = $("emiText");
    if (!el) return;
    var la = gN($("loanAmount") && $("loanAmount").value);
    var rt = gN($("interestRate") && $("interestRate").value);
    var tn = gN($("tenure") && $("tenure").value);

    if (la <= 0 || rt <= 0 || tn <= 0) {
      el.textContent = "Enter loan details to see estimated EMI";
      el.className = "sf-live-text";
      return;
    }
    var emi;
    if (typeof cEMI === "function") {
      emi = cEMI(la, rt, tn);
    } else {
      var r = rt / 12 / 100;
      emi = la * r * Math.pow(1 + r, tn) / (Math.pow(1 + r, tn) - 1);
    }
    el.textContent = "Estimated EMI: ₹" + Math.round(emi).toLocaleString("en-IN");
    el.className = "sf-live-text";
  }

  function updateLTV() {
    var el = $("ltvText");
    if (!el) return;
    var pv = gN($("propertyValue") && $("propertyValue").value);
    var la = gN($("loanAmount") && $("loanAmount").value);

    if (pv <= 0) {
      el.textContent = "Enter property value to see LTV ratio";
      el.className = "sf-live-text";
      return;
    }
    var ltv = ((la / pv) * 100).toFixed(1);
    var cls = ltv <= 75 ? "sf-good" : ltv <= 85 ? "sf-warn" : "sf-danger";
    el.textContent = "Loan-to-Value: " + ltv + "%";
    el.className = "sf-live-text " + cls;
  }

  /* ─── Review Builder ─────────────────────────── */

  function buildReview() {
    var grid = $("sfReviewGrid");
    if (!grid) return;

    var rows = [
      { l: "Mode", v: userIntent === "new" ? "New Loan Check" : "Financial Health Check" },
      { l: "Net Monthly Income", v: fmtINR($("income") && $("income").value) },
      { l: "Income Type", v: ($("incomeType") && $("incomeType").value) || "salaried" },
      { l: "Income Shock", v: (($("incomeShock") && $("incomeShock").value) || "30") + "%" },
      { l: "Annual Bonus", v: fmtINR($("annualBonus") && $("annualBonus").value) },
      { l: "Secured EMIs", v: fmtINR($("securedEMI") && $("securedEMI").value) },
      { l: "Unsecured EMIs", v: fmtINR($("unsecuredEMI") && $("unsecuredEMI").value) },
      { l: "Dependents", v: ($("dependents") && $("dependents").value) || "0" },
      { l: "Essential Expenses", v: fmtINR($("essentialExp") && $("essentialExp").value) },
      { l: "Lifestyle", v: fmtINR($("lifestyleExp") && $("lifestyleExp").value) },
      { l: "Semi-Fixed", v: fmtINR($("semiFixedExp") && $("semiFixedExp").value) },
      { l: "Cash + Bank", v: fmtINR($("cashBalance") && $("cashBalance").value) },
      { l: "Fixed Deposits", v: fmtINR($("fdBalance") && $("fdBalance").value) },
      { l: "Other Investments", v: fmtINR($("otherSavings") && $("otherSavings").value) }
    ];

    if (userIntent === "new") {
      rows.push(
        { l: "Loan Amount", v: fmtINR($("loanAmount") && $("loanAmount").value) },
        { l: "Loan Purpose", v: ($("loanPurpose") && $("loanPurpose").value) || "home" },
        { l: "Interest Rate", v: (($("interestRate") && $("interestRate").value) || "0") + "%" },
        { l: "Tenure", v: (($("tenure") && $("tenure").value) || "0") + " months" },
        { l: "Rate Type", v: ($("rateType") && $("rateType").value) || "floating" },
        { l: "Months Paid", v: ($("monthsPaid") && $("monthsPaid").value) || "0" },
        { l: "Property Value", v: fmtINR($("propertyValue") && $("propertyValue").value) },
        { l: "Down Payment", v: fmtINR($("downPayment") && $("downPayment").value) }
      );
    }

    var html = "";
    for (var i = 0; i < rows.length; i++) {
      html += '<div class="sf-review-row">' +
        '<span class="sf-review-label">' + rows[i].l + '</span>' +
        '<span class="sf-review-value">' + rows[i].v + '</span>' +
        '</div>';
    }
    grid.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════
     POST-ANALYSIS OUTPUT INJECTION
     Reads from already-rendered DOM elements
     ═══════════════════════════════════════════════ */

  function injectCoreReason() {
    var block = $("sfCoreReason");
    if (!block) return;
    var at = $("analysisText");
    if (!at) return;
    var text = at.textContent || "";
    if (text.length < 10) { block.style.display = "none"; return; }

    var reasons = [];
    // Look for deficit
    var m1 = text.match(/deficit[^.]*?₹[\d,]+/i) || text.match(/losing[^.]*?₹[\d,]+/i) || text.match(/shortfall[^.]*?₹[\d,]+/i);
    if (m1) reasons.push(m1[0].trim());
    // Look for survival
    var m2 = text.match(/surviv[^.]*?\d+\s*month/i);
    if (m2) reasons.push(m2[0].trim());
    // Fallback: first sentence
    if (reasons.length === 0) {
      var first = text.split(".")[0];
      if (first && first.length > 10) reasons.push(first.trim());
    }
    if (reasons.length === 0) { block.style.display = "none"; return; }

    var h = '<div class="sf-block-label">⚡ Core Issue</div>';
    for (var i = 0; i < reasons.length; i++) {
      h += '<div class="sf-reason-item">' + reasons[i] + '</div>';
    }
    block.innerHTML = h;
    block.style.display = "block";
  }

  function injectWorstCase() {
    var block = $("sfWorstCase");
    if (!block) return;
    var ig = $("impactGrid");
    if (!ig || ig.innerHTML.trim() === "") { block.style.display = "none"; return; }

    // Try to extract metric pairs from impact grid children
    var children = ig.children;
    var metrics = [];
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      var labelEl = c.querySelector("small, .metric-label, .impact-label, [class*='label']");
      var valueEl = c.querySelector("strong, .metric-value, .impact-value, [class*='value'], b");
      if (!labelEl) {
        // Try text content split — many metric cards use div > small + strong
        var smalls = c.querySelectorAll("small");
        var strongs = c.querySelectorAll("strong");
        if (smalls.length && strongs.length) {
          labelEl = smalls[0];
          valueEl = strongs[0];
        }
      }
      if (labelEl && valueEl) {
        metrics.push({ l: labelEl.textContent.trim(), v: valueEl.textContent.trim() });
      }
    }
    if (metrics.length === 0) { block.style.display = "none"; return; }

    var h = '<div class="sf-block-label">⚠️ Worst-Case Scenario</div><div class="sf-wc-grid">';
    var max = Math.min(metrics.length, 4);
    for (var j = 0; j < max; j++) {
      h += '<div class="sf-wc-item"><div class="sf-wc-label">' + metrics[j].l + '</div><div class="sf-wc-value">' + metrics[j].v + '</div></div>';
    }
    h += '</div>';
    block.innerHTML = h;
    block.style.display = "block";
  }

  function injectTTF() {
    var block = $("sfTTF");
    if (!block) return;
    var at = $("analysisText");
    if (!at) { block.style.display = "none"; return; }
    var text = at.textContent || "";

    var m = text.match(/(\d+\.?\d*)\s*months?\s*(?:of\s+)?surviv/i) ||
            text.match(/surviv[a-z]*\s*[:=]?\s*(\d+\.?\d*)\s*month/i) ||
            text.match(/(\d+\.?\d*)\s*months?\s*(?:before|until)/i);

    if (!m) { block.style.display = "none"; return; }

    var months = parseFloat(m[1]);
    var cls, msg;
    if (months === 0) {
      cls = "sf-ttf-danger";
      msg = "Instant default — zero months survival";
    } else {
      cls = months >= 6 ? "sf-ttf-safe" : months >= 3 ? "sf-ttf-warn" : "sf-ttf-danger";
      msg = "Under stress: ~" + months.toFixed(1) + " months before reserves depleted";
    }

    block.innerHTML = '<div class="sf-block-label">⏱ Time to Failure</div>' +
      '<div class="sf-ttf-value ' + cls + '">' + msg + '</div>';
    block.style.display = "block";
  }

  function injectDelta() {
    var block = $("sfDelta");
    if (!block) return;

    var deltas = [];

    // Try recovery block
    var rb = $("recoveryBlock");
    if (rb && rb.style.display !== "none") {
      var items = rb.querySelectorAll("li, p, .recovery-item");
      for (var i = 0; i < items.length; i++) {
        var t = items[i].textContent.trim();
        if (t.length > 5 && deltas.length < 5) deltas.push(t);
      }
    }

    // Try recommendations
    if (deltas.length === 0) {
      var rl = $("recoList");
      if (rl) {
        var lis = rl.querySelectorAll("li");
        for (var j = 0; j < lis.length && deltas.length < 4; j++) {
          var txt = lis[j].textContent.trim();
          if (txt.length > 5) deltas.push(txt);
        }
      }
    }

    // Try original delta block
    if (deltas.length === 0) {
      var db = $("deltaBlock");
      if (db && db.style.display !== "none") {
        var dItems = db.querySelectorAll("li, p, .delta-item");
        for (var k = 0; k < dItems.length; k++) {
          var dt = dItems[k].textContent.trim();
          if (dt.length > 5) deltas.push(dt);
        }
      }
    }

    if (deltas.length === 0) { block.style.display = "none"; return; }

    var h = '<div class="sf-block-label">🎯 What Should You Change?</div><div class="sf-delta-list">';
    for (var d = 0; d < deltas.length; d++) {
      h += '<div class="sf-delta-item"><span class="sf-delta-num">' + (d + 1) + '</span><span>' + deltas[d] + '</span></div>';
    }
    h += '</div>';
    block.innerHTML = h;
    block.style.display = "block";
  }

  /* ─── Event Listeners ────────────────────────── */

  // Intent buttons
  if ($("intentNew")) $("intentNew").addEventListener("click", function () { selectIntent("new"); });
  if ($("intentExisting")) $("intentExisting").addEventListener("click", function () { selectIntent("existing"); });

  // Nav buttons
  if (sfBtnNext) sfBtnNext.addEventListener("click", goNext);
  if (sfBtnBack) sfBtnBack.addEventListener("click", goBack);

  // Enter key to advance
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && currentStep !== 0) {
      e.preventDefault();
      goNext();
    }
  });

  // Live indicator updates
  var liveFields = ["cashBalance", "fdBalance", "otherSavings", "essentialExp",
    "semiFixedExp", "securedEMI", "unsecuredEMI", "loanAmount", "interestRate",
    "tenure", "propertyValue"];
  for (var i = 0; i < liveFields.length; i++) {
    var el = $(liveFields[i]);
    if (el) el.addEventListener("input", updateLiveIndicators);
  }

  // Income type → shock hint
  var itEl = $("incomeType");
  if (itEl) {
    itEl.addEventListener("change", function () {
      var hint = $("shockHint");
      if (this.value === "self-employed") {
        if (hint) hint.style.display = "block";
        var sh = $("incomeShock");
        if (sh && gN(sh.value) < 40) sh.value = "40";
      } else {
        if (hint) hint.style.display = "none";
      }
    });
  }

  /* ─── Initialize ─────────────────────────────── */
  // Default step order (will be rebuilt on intent select)
  stepOrder = [0, 1, 2, 3, 4, 5, 6, "review"];
  currentStep = 0;
  showStep(0);

})();
