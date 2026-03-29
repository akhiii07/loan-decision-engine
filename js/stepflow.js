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

    /* ── Field format helper ── */
    function rvFmt(val, fmt) {
      var n = parseFloat(val) || 0;
      if (fmt === "inr")    return n > 0 ? "₹" + n.toLocaleString("en-IN") : "₹0";
      if (fmt === "pct")    return (n || "—") + "%";
      if (fmt === "months") return n > 0 ? n + " mo" : "—";
      return val || "—";
    }

    /* ── Quick Preview: EMI + FOIR ── */
    function rvUpdatePreview() {
      var prev = $("rvPreview");
      if (!prev) return;
      var inc = parseFloat($("income") && $("income").value) || 0;
      if (inc <= 0) { prev.innerHTML = ""; return; }
      var html = "";
      var sec  = parseFloat($("securedEMI")   && $("securedEMI").value)   || 0;
      var usec = parseFloat($("unsecuredEMI") && $("unsecuredEMI").value) || 0;
      if (userIntent === "new") {
        var la = parseFloat($("loanAmount")   && $("loanAmount").value)   || 0;
        var ir = parseFloat($("interestRate") && $("interestRate").value) || 0;
        var tn = parseFloat($("tenure")       && $("tenure").value)       || 0;
        if (la > 0 && ir > 0 && tn > 0) {
          var r   = (ir / 12) / 100;
          var emi = la * r * Math.pow(1 + r, tn) / (Math.pow(1 + r, tn) - 1);
          var total = emi + sec + usec;
          var ratio = (total / inc * 100).toFixed(1);
          var cls = ratio <= 40 ? "rv-prev-ok" : ratio <= 55 ? "rv-prev-warn" : "rv-prev-bad";
          html = '<span class="rv-prev-label">Est. New EMI</span>' +
                 '<span class="rv-prev-val">₹' + Math.round(emi).toLocaleString("en-IN") + '</span>' +
                 '<span class="rv-prev-sep">·</span>' +
                 '<span class="rv-prev-label">FOIR</span>' +
                 '<span class="rv-prev-val ' + cls + '">' + ratio + '%</span>';
        }
      } else {
        var total2 = sec + usec;
        if (total2 > 0) {
          var ratio2 = (total2 / inc * 100).toFixed(1);
          var cls2 = ratio2 <= 40 ? "rv-prev-ok" : ratio2 <= 55 ? "rv-prev-warn" : "rv-prev-bad";
          html = '<span class="rv-prev-label">Total EMI</span>' +
                 '<span class="rv-prev-val">₹' + total2.toLocaleString("en-IN") + '</span>' +
                 '<span class="rv-prev-sep">·</span>' +
                 '<span class="rv-prev-label">FOIR</span>' +
                 '<span class="rv-prev-val ' + cls2 + '">' + ratio2 + '%</span>';
        }
      }
      prev.innerHTML = html;
    }

    /* ── Validation status ── */
    function rvCheckValid() {
      var statusEl = $("rvStatus");
      if (!statusEl) return;
      var issues = [];
      var inc = parseFloat($("income") && $("income").value) || 0;
      if (inc <= 0) issues.push("income missing");
      if (userIntent === "new") {
        if (!(parseFloat($("loanAmount")   && $("loanAmount").value)   > 0)) issues.push("loan amount");
        if (!(parseFloat($("interestRate") && $("interestRate").value) > 0)) issues.push("interest rate");
        if (!(parseFloat($("tenure")       && $("tenure").value)       > 0)) issues.push("tenure");
        if (!(parseFloat($("propertyValue")&& $("propertyValue").value)> 0)) issues.push("property value");
      }
      if (issues.length === 0) {
        statusEl.innerHTML = '<span class="rv-status-ok">✔ All fields look good</span>';
      } else {
        statusEl.innerHTML = '<span class="rv-status-warn">⚠ Missing: ' + issues.join(", ") + '</span>';
      }
    }

    /* ── Inline edit wiring ── */
    function rvWireEdit(valueEl, fieldId, fieldType, fmt, options) {
      valueEl.classList.add("rv-editable");
      valueEl.addEventListener("click", function () {
        if (valueEl.classList.contains("rv-editing")) return;
        valueEl.classList.add("rv-editing");
        var realEl   = $(fieldId);
        var savedVal = realEl ? realEl.value : "";
        var inp;
        if (fieldType === "select" && options) {
          inp = document.createElement("select");
          inp.className = "rv-inline-input";
          for (var o = 0; o < options.length; o++) {
            var opt = document.createElement("option");
            opt.value       = options[o][0];
            opt.textContent = options[o][1];
            if (options[o][0] === savedVal) opt.selected = true;
            inp.appendChild(opt);
          }
        } else {
          inp = document.createElement("input");
          inp.type      = "text";
          inp.className = "rv-inline-input";
          inp.value     = parseFloat(savedVal) || "";
        }
        valueEl.innerHTML = "";
        valueEl.appendChild(inp);
        inp.focus();
        if (inp.select) inp.select();

        function saveEdit() {
          if (!valueEl.classList.contains("rv-editing")) return;
          valueEl.classList.remove("rv-editing");
          var newVal = inp.value;
          if (realEl) realEl.value = newVal;
          if (fieldType === "select" && options) {
            var label = newVal;
            for (var k = 0; k < options.length; k++) {
              if (options[k][0] === newVal) { label = options[k][1]; break; }
            }
            valueEl.textContent = label || "—";
          } else {
            valueEl.textContent = rvFmt(newVal, fmt);
          }
          rvUpdatePreview();
          rvCheckValid();
          updateLiveIndicators();
        }

        inp.addEventListener("blur", saveEdit);
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter")  { inp.blur(); }
          if (e.key === "Escape") {
            valueEl.classList.remove("rv-editing");
            if (fieldType === "select" && options) {
              var label2 = savedVal;
              for (var k2 = 0; k2 < options.length; k2++) {
                if (options[k2][0] === savedVal) { label2 = options[k2][1]; break; }
              }
              valueEl.textContent = label2 || "—";
            } else {
              valueEl.textContent = rvFmt(savedVal, fmt);
            }
          }
        });
      });
    }

    /* ── Section definitions ── */
    var sections = [
      {
        id: "rv-income", title: "Income", icon: "₹",
        fields: [
          { l: "Net Monthly Income", id: "income",      type: "number", fmt: "inr" },
          { l: "Income Type",        id: "incomeType",  type: "select", fmt: "raw",
            options: [["salaried","Salaried"],["self_employed","Self-Employed"],["business","Business"]] },
          { l: "Income Shock",       id: "incomeShock", type: "number", fmt: "pct" },
          { l: "Annual Bonus",       id: "annualBonus", type: "number", fmt: "inr" }
        ]
      },
      {
        id: "rv-emis", title: "EMIs & Expenses", icon: "⊟",
        fields: [
          { l: "Secured EMIs",       id: "securedEMI",   type: "number", fmt: "inr" },
          { l: "Unsecured EMIs",     id: "unsecuredEMI", type: "number", fmt: "inr" },
          { l: "Existing Tenure",    id: "existingTenure",type:"number", fmt: "months" },
          { l: "Essential Expenses", id: "essentialExp", type: "number", fmt: "inr" },
          { l: "Lifestyle Expenses", id: "lifestyleExp", type: "number", fmt: "inr" },
          { l: "Semi-Fixed Expenses",id: "semiFixedExp", type: "number", fmt: "inr" }
        ]
      },
      {
        id: "rv-savings", title: "Savings & Liquidity", icon: "◈",
        fields: [
          { l: "Cash + Bank",        id: "cashBalance",  type: "number", fmt: "inr" },
          { l: "Fixed Deposits",     id: "fdBalance",    type: "number", fmt: "inr" },
          { l: "Other Investments",  id: "otherSavings", type: "number", fmt: "inr" },
          { l: "Dependents",         id: "dependents",   type: "number", fmt: "raw" }
        ]
      }
    ];

    if (userIntent === "new") {
      sections.push({
        id: "rv-loan", title: "New Loan", icon: "⬡",
        fields: [
          { l: "Loan Amount",         id: "loanAmount",   type: "number", fmt: "inr" },
          { l: "Interest Rate",       id: "interestRate", type: "number", fmt: "pct" },
          { l: "Tenure (months)",     id: "tenure",       type: "number", fmt: "months" },
          { l: "Loan Purpose",        id: "loanPurpose",  type: "select", fmt: "raw",
            options: [["home","Home Loan"],["car","Car Loan"],["personal","Personal"],["education","Education"],["business","Business"]] },
          { l: "Rate Type",           id: "rateType",     type: "select", fmt: "raw",
            options: [["floating","Floating"],["fixed","Fixed"]] },
          { l: "Months Already Paid", id: "monthsPaid",   type: "number", fmt: "months" }
        ]
      });
      sections.push({
        id: "rv-property", title: "Property", icon: "⌂",
        fields: [
          { l: "Property Value", id: "propertyValue", type: "number", fmt: "inr" },
          { l: "Down Payment",   id: "downPayment",   type: "number", fmt: "inr" }
        ]
      });
    }

    /* ── Build HTML ── */
    var html = "";
    for (var s = 0; s < sections.length; s++) {
      var sec = sections[s];
      html += '<div class="rv-card" id="' + sec.id + '">';
      html += '<div class="rv-card-header">' +
              '<span class="rv-card-icon">' + sec.icon + '</span>' +
              '<span class="rv-card-title">' + sec.title + '</span>' +
              '</div>';
      html += '<div class="rv-fields-grid">';
      for (var f = 0; f < sec.fields.length; f++) {
        var fld    = sec.fields[f];
        var realEl = $(fld.id);
        var rawVal = realEl ? realEl.value : "";
        var disp   = "";
        if (fld.type === "select" && fld.options) {
          disp = rawVal;
          for (var op = 0; op < fld.options.length; op++) {
            if (fld.options[op][0] === rawVal) { disp = fld.options[op][1]; break; }
          }
          if (!disp) disp = "—";
        } else {
          disp = rvFmt(rawVal, fld.fmt);
        }
        html += '<div class="rv-field">' +
                '<div class="rv-field-label">' + fld.l + '</div>' +
                '<div class="rv-field-value" data-fid="' + fld.id + '" data-fmt="' + fld.fmt + '">' + disp + '</div>' +
                '</div>';
      }
      html += '</div></div>';
    }
    grid.innerHTML = html;

    /* ── Wire inline editing after DOM insert ── */
    var allValueEls = grid.querySelectorAll(".rv-field-value");
    for (var ci = 0; ci < allValueEls.length; ci++) {
      var vEl  = allValueEls[ci];
      var fid  = vEl.getAttribute("data-fid");
      var ffmt = vEl.getAttribute("data-fmt");
      var fcfg = null;
      outer: for (var ss = 0; ss < sections.length; ss++) {
        for (var ff = 0; ff < sections[ss].fields.length; ff++) {
          if (sections[ss].fields[ff].id === fid) { fcfg = sections[ss].fields[ff]; break outer; }
        }
      }
      if (fcfg) rvWireEdit(vEl, fid, fcfg.type, ffmt, fcfg.options || null);
    }

    /* ── Wire CTA button → existing goNext flow ── */
    var ctaBtn = $("rvCtaBtn");
    if (ctaBtn) {
      ctaBtn.onclick = function () { if (sfBtnNext) sfBtnNext.click(); };
    }

    rvUpdatePreview();
    rvCheckValid();
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
