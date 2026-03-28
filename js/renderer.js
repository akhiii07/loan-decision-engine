/**
 * renderer.js — All DOM rendering
 *
 * Takes computed results and writes them to the page.
 * Only file that touches the DOM (besides main.js for input reading).
 */

function renderResults(ctx) {
  var base=ctx.base, iShk=ctx.incomeShock, rShk=ctx.rateShock, eShk=ctx.expenseShock,
      comb=ctx.combined, rNrm=ctx.rateNorm, cross=ctx.crossover,
      rec=ctx.recovery, elig=ctx.eligibility, ltv=ctx.ltv, pp=ctx.prepay,
      trend=ctx.trend, delta=ctx.delta, inp=ctx.inp,
      verdict=ctx.verdict, score=ctx.score, decSt=ctx.decisionStatement;
  var th=ctx.thresholds, zS=ctx.zeroSavings;
  var shP=iShk.shockPct, elOk=inp.newEMI<=elig.maxEMI;
  var realSurv=ctx.realisticSurvival, theoSurv=ctx.theoreticalSurvival;
  var vC=verdictColor(verdict);
  var stEmiR=ctx.stressEmiRatio;

  // ═══════════════════════════════════════
  // SECTION 1: HERO
  // ═══════════════════════════════════════
  var hS=el('heroScore');
  hS.textContent=score;
  hS.className='hero-score v-'+verdict;
  var hV=el('heroVerdict');
  hV.textContent=verdict;
  hV.style.color='var(--color-'+vC+')';
  el('heroSummary').textContent=decSt;

  // ═══════════════════════════════════════
  // SECTION 2: 3 CORE METRICS
  // ═══════════════════════════════════════
  var cmN=el('cmNet');
  cmN.textContent=formatRupees(iShk.net);
  cmN.className='metric-value '+(iShk.net>=0?'ok':'bad');

  var ttf=zS?'0 mo':(isFinite(realSurv)?'~'+Math.floor(realSurv)+' mo':'∞');
  var cmSv=el('cmSurvival');
  cmSv.textContent=ttf;
  cmSv.className='metric-value '+(zS?'bad':survivalColor(realSurv));

  var stEmiDisplay=isFinite(stEmiR)?formatPct(stEmiR):'∞';
  var stEmiClass=isFinite(stEmiR)?emiColor(stEmiR,inp.incomeType):'bad';
  var cmE=el('cmEmi');
  cmE.textContent=stEmiDisplay;
  cmE.className='metric-value '+stEmiClass;

  // ─ Metric expand details ─
  el('expand-net').innerHTML=
    '<div class="mde-row"><span class="mde-label">Baseline Net</span><span class="mde-val">'+formatRupees(base.net)+'</span></div>'
    +'<div class="mde-row"><span class="mde-label">Under '+shP+'% Shock</span><span class="mde-val '+(iShk.net>=0?'ok':'bad')+'">'+formatRupees(iShk.net)+'</span></div>'
    +'<div class="mde-row"><span class="mde-label">Monthly Gap</span><span class="mde-val '+(iShk.deficit>0?'bad':'ok')+'">'+(iShk.deficit>0?'−'+formatRupees(iShk.deficit):'Surplus')+'</span></div>'
    +'<div class="mde-row"><span class="mde-label">Shocked Income</span><span class="mde-val">'+formatRupees(iShk.shockedIncome)+'</span></div>';

  var survDetail=(isFinite(theoSurv)&&theoSurv!==realSurv)
    ?'<div class="mde-row"><span class="mde-label">Theoretical</span><span class="mde-val">~'+Math.round(theoSurv)+' mo</span></div>':'';
  el('expand-survival').innerHTML=
    '<div class="mde-row"><span class="mde-label">Realistic Survival</span><span class="mde-val '+(zS?'bad':survivalColor(realSurv))+'">'+ttf+'</span></div>'
    +survDetail
    +'<div class="mde-row"><span class="mde-label">Usable Savings</span><span class="mde-val">'+formatRupees(inp.savings)+'</span></div>'
    +'<div class="mde-row"><span class="mde-label">Shock Applied</span><span class="mde-val">−'+shP+'% income</span></div>';

  el('expand-emi').innerHTML=
    '<div class="mde-row"><span class="mde-label">Baseline EMI Ratio</span><span class="mde-val '+emiColor(base.emiRatio,inp.incomeType)+'">'+formatPct(base.emiRatio)+'</span></div>'
    +'<div class="mde-row"><span class="mde-label">Under Shock</span><span class="mde-val '+stEmiClass+'">'+stEmiDisplay+'</span></div>'
    +(inp.newEMI>0?'<div class="mde-row"><span class="mde-label">New EMI</span><span class="mde-val">'+formatRupees(inp.newEMI)+'</span></div>':'')
    +'<div class="mde-row"><span class="mde-label">Bank Limit (FOIR)</span><span class="mde-val '+(elOk?'ok':'bad')+'">'+formatRupees(elig.maxEMI)+'</span></div>';

  // ═══════════════════════════════════════
  // SECTION 3: WORST CASE
  // ═══════════════════════════════════════
  var wcH='Income drops to <strong>'+formatRupees(iShk.shockedIncome)+'</strong>';
  if(iShk.deficit>0) wcH+=' → You lose <strong>'+formatRupees(iShk.deficit)+'/month</strong>';
  else wcH+=' → Surplus maintained';
  wcH+='<br>';
  if(zS) wcH+='No usable savings — <strong style="color:var(--color-danger)">instant default risk</strong>';
  else if(isFinite(realSurv)) wcH+='Savings run out in approximately <strong>'+Math.floor(realSurv)+' months</strong>';
  else wcH+='Savings sustain the shock period <strong style="color:var(--color-safe)">indefinitely</strong>';
  wcH+='<br>EMI becomes <strong>'+stEmiDisplay+'</strong> of shocked income';
  el('wcContent').innerHTML=wcH;

  // ═══════════════════════════════════════
  // SECTION 4: TOP RISKS (max 3)
  // ═══════════════════════════════════════
  var allFlags=buildFlags(ctx);
  var topRisks=pickTopRisks(allFlags,3);
  el('topRisksItems').innerHTML=topRisks.length>0
    ?topRisks.map(function(f){return'<div class="risk-item risk-'+f.level+'">'+f.text+'</div>';}).join('')
    :'<div class="risk-item risk-ok">No critical risks identified</div>';
  el('top-risks').style.display='block';

  // ═══════════════════════════════════════
  // SECTION 5: DECISION DELTA
  // ═══════════════════════════════════════
  el('ddTitle').textContent='How to Become '+(verdict==='SAFE'?'SAFER':'SAFE');
  var ddH='';
  if(delta&&delta.length>0){
    delta.slice(0,3).forEach(function(d,i){
      ddH+='<div class="dd-option">'
        +'<div class="dd-rank">'+(i+1)+'</div>'
        +'<div class="dd-content"><strong>'+d.type+'</strong><br><span>→ '+d.message+'</span></div>'
        +'</div>';
    });
  } else {
    ddH='<div class="dd-option"><div class="dd-rank">✓</div><div class="dd-content"><strong>All indicators healthy</strong><br><span>→ Consider prepayments to save on interest</span></div></div>';
  }
  el('ddOptions').innerHTML=ddH;

  // ═══════════════════════════════════════
  // COMPAT: HIDDEN + EXPANDABLE TARGETS
  // ═══════════════════════════════════════
  // Score block (hidden)
  el('scoreBlock').innerHTML=
    '<div class="score-hero-label">Decision Score</div>'
    +'<div class="score-hero-ring v-'+verdict+'">'+score+'</div>'
    +'<div class="score-hero-verdict" style="color:var(--color-'+vC+')">'+verdict+'</div>'
    +'<div class="score-hero-sub">'+decSt+'</div>';

  // Decision banner (hidden)
  var ban=el('decisionBanner');
  ban.className='decision-banner '+verdict.toLowerCase();
  ban.textContent=verdictText(verdict);

  // Flags (hidden)
  var fE=el('flagsBlock');
  if(allFlags.length>0){fE.style.display='flex';fE.innerHTML=allFlags.map(function(f){return'<span class="risk-flag '+f.level+'">'+f.text+'</span>'}).join('');}
  else fE.style.display='none';

  // Impact header + grid (hidden)
  el('impactHeader').innerHTML='&#9888; IMPACT: What happens under '+shP+'% income shock';
  function tile(l,v,vc,sub,sc){return'<div class="impact-tile"><div class="tile-label">'+l+'</div><div class="tile-value '+vc+'">'+v+'</div><div class="tile-change '+sc+'">'+sub+'</div></div>';}
  var ig='';
  ig+=tile('EMI Ratio',stEmiDisplay,stEmiClass,'was '+formatPct(base.emiRatio),'neg');
  ig+=tile('Monthly Net',formatRupees(iShk.net),iShk.net>=0?'ok':'bad','was '+formatRupees(base.net),iShk.net<base.net?'neg':'pos');
  var ttfSub=isFinite(theoSurv)&&theoSurv!==realSurv?'theoretical: '+Math.round(theoSurv)+'mo':'';
  ig+=tile('Time to Failure',ttf,zS?'bad':survivalColor(realSurv),ttfSub,'neu');
  ig+=tile('Buffer',(isFinite(iShk.buffer)?iShk.buffer.toFixed(1):'∞'),bufferColor(iShk.buffer),'was '+(isFinite(base.buffer)?base.buffer.toFixed(1):'∞'),iShk.buffer<base.buffer?'neg':'neu');
  el('impactGrid').innerHTML=ig;

  // Scenarios (in expandable)
  function sRow(l,d,r){return'<div class="scenario-row"><div><span class="scenario-label">'+l+'</span><div class="scenario-detail">'+d+'</div></div><span class="scenario-value '+r.c+'">'+r.t+'</span></div>';}
  var sh='<div class="block-label">All Stress Scenarios</div>';
  var shNote=iShk.wasOverridden?' (entered '+iShk.userShock+'%, floor '+shP+'%)':'';
  sh+=sRow('S1 · Income −'+shP+'%'+shNote,'Income → '+formatRupees(iShk.shockedIncome),
    iShk.deficit===0?{t:'Surplus '+formatRupees(iShk.net),c:'ok'}:(zS?{t:'INSTANT DEFAULT',c:'bad'}:{t:'~'+Math.floor(realSurv)+'mo realistic · '+formatRupees(iShk.deficit)+'/mo',c:survivalColor(realSurv)}));
  if(rShk){if(rShk.negAmort)sh+=sRow('S2 · Rate +2% → '+rShk.shockedRate.toFixed(1)+'%','Int '+formatRupees(rShk.monthlyInterest)+' > EMI '+formatRupees(inp.newEMI),{t:'DEBT TRAP',c:'bad'});
  else{var tn2=isFinite(rShk.tenureDelta)&&rShk.tenureDelta>0?' · +'+rShk.tenureDelta+'mo':'';sh+=sRow('S2 · Rate +2%','EMI +'+formatRupees(rShk.emiDelta),{t:'Ratio '+formatPct(rShk.emiRatio)+tn2,c:emiColor(rShk.emiRatio,inp.incomeType)});}}
  else sh+=sRow('S2 · Rate +2%','Fixed',{t:'N/A',c:'na'});
  sh+=sRow('S3 · Expense 1.5×','Essential → '+formatRupees(eShk.essential)+' (+'+formatRupees(eShk.expenseDelta)+')',{t:'Buffer '+(isFinite(eShk.buffer)?eShk.buffer.toFixed(1):'∞')+'mo',c:bufferColor(eShk.buffer)});
  var cSv=comb.survival;var cReal=isFinite(cSv)?realisticSurvival(cSv,inp.incomeType,inp.dependents):Infinity;
  sh+=sRow('S4 · Combined','Income −'+comb.shockPct+'% + 1.5× exp',comb.deficit===0?{t:'No deficit',c:'ok'}:{t:'~'+Math.floor(cReal)+'mo · '+formatRupees(comb.deficit)+'/mo',c:survivalColor(cReal)});
  if(rNrm&&rNrm.applicable){if(rNrm.aboveNorm)sh+=sRow('S5 · Rate Norm ↓','Your '+inp.rate+'% > avg',{t:'EMI drops '+formatRupees(Math.abs(rNrm.normDelta)),c:'positive'});
  else sh+=sRow('S5 · Rate Norm ↑','To avg '+rNrm.normRate.toFixed(1)+'%',{t:'EMI +'+formatRupees(rNrm.normDelta)+' · '+formatPct(rNrm.normRatio),c:emiColor(rNrm.normRatio,inp.incomeType)});}
  if(cross.crossoverYear)sh+=sRow('S6 · Inflation Yr '+cross.crossoverYear,'Expenses outpace income',{t:'Net negative',c:'bad'});
  else{var lr=cross.table[cross.table.length-1];sh+=sRow('S6 · Inflation','Through yr '+cross.years,{t:'Net +ve '+formatRupees(lr.net),c:'ok'});}
  el('scenarioBlock').innerHTML=sh;

  // Analysis (hidden)
  el('analysisText').innerHTML=buildAnalysisHTML(ctx);

  // Recovery (in expandable)
  var rB=el('recoveryBlock');
  if(rec){rB.style.display='block';
    var fc='f-'+rec.feasibility.replace(/[- ]/g,'');
    rB.innerHTML='<div class="recovery-title">Realistic Survival Plan</div><div class="recovery-feasibility '+fc+'">'+rec.feasibility.toUpperCase().replace(/-/g,' ')+'</div><div class="recovery-steps">Deficit: '+formatRupees(rec.needed)+'/mo<br>'+rec.note+'</div>';}
  else rB.style.display='none';

  // Reco list (hidden compat)
  var recs=buildRecommendations(ctx);
  el('recoList').innerHTML=recs.map(function(x){return'<li>'+x+'</li>';}).join('');

  // Delta block (hidden compat)
  var ddB=el('deltaBlock');
  if(delta&&delta.length>0){ddB.style.display='block';
    var dH='<div class="block-label">What to Change to Improve</div>';
    delta.slice(0,4).forEach(function(d,i){dH+='<div class="scenario-row"><div><span class="scenario-label" style="color:var(--color-accent)">'+(i+1)+'. '+d.type+'</span></div><span class="scenario-value" style="color:var(--color-text)">'+d.message+'</span></div>';});
    ddB.innerHTML=dH;}
  else ddB.style.display='none';

  // Prepayment (in expandable)
  var pB=el('prepayBlock');
  if(pp){pB.style.display='block';pB.innerHTML='<div class="block-label">Prepayment Impact</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7">Annual: '+formatRupees(pp.annualPrepay)+' · Tenure: '+pp.origTenure+' → '+pp.newTenure+'mo (−'+pp.savedYears+'yrs) · Saved: <strong style="color:var(--color-safe)">'+formatLakh(pp.savedInterest)+'</strong></div>';}
  else{if(ctx.interestRatio>.7&&base.net>0){var sug=Math.round(base.net*12*.2);var sSim=simulatePrepayment(inp.loanAmount,inp.rate,inp.tenure,sug);
    if(sSim&&sSim.savedMonths>6){pB.style.display='block';pB.innerHTML='<div class="block-label">Prepayment Suggestion</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7">Prepay '+formatRupees(sug)+'/yr (20% surplus): saves '+sSim.savedYears+' years, '+formatLakh(sSim.savedInterest)+' interest.</div>';}
    else pB.style.display='none';}
  else pB.style.display='none';}

  // Crossover SVG (in expandable)
  var cB=el('crossoverBlock');
  cB.innerHTML='<div class="rp-graph-title">Inflation Crossover</div>'
    +'<div class="rp-graph-sub">Income: 7%→5%→3%/yr growth &nbsp;·&nbsp; Expenses: 6%/yr &nbsp;·&nbsp; EMI held constant</div>'
    +buildCrossoverSVG(cross);
  cB.style.display='block';

  // Baseline ref (in expandable)
  el('baselineRef').innerHTML='<div class="ref-label">Current state (before stress)</div><div class="baseline-grid"><div class="bg-item">EMI: <strong>'+formatPct(base.emiRatio)+'</strong></div><div class="bg-item">Residual: <strong>'+formatRupees(base.residual)+'</strong></div><div class="bg-item">Buffer: <strong>'+(isFinite(base.buffer)?base.buffer.toFixed(1):'∞')+'mo</strong></div><div class="bg-item">Net: <strong>'+formatRupees(base.net)+'</strong></div></div>';

  // Eligibility (in expandable)
  var lti=ctx.lti;
  var eH='<div class="block-label">Bank Eligibility</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7">';
  eH+='Bank max EMI: <strong>'+formatRupees(elig.maxEMI)+'</strong> · Yours: <strong style="color:var(--color-'+(elOk?'safe':'danger')+')">'+formatRupees(inp.newEMI)+'</strong>';
  if(!elOk)eH+=' <span style="color:var(--color-danger)">exceeds by '+formatRupees(inp.newEMI-elig.maxEMI)+'</span>';
  eH+='<br>Max eligible: '+formatLakh(elig.maxLoan)+' · LTI: <strong>'+lti.toFixed(1)+'×</strong>';
  if(ltv)eH+=' · LTV: <strong style="color:var(--color-'+(ltv.compliant?'safe':'danger')+')">'+formatPct(ltv.ltv)+'</strong>/'+formatPct(ltv.maxLTV);
  eH+='<br>Usable savings: <strong>'+formatRupees(inp.savings)+'</strong>'+(ctx.totalRawSavings>inp.savings*1.3?' (from '+formatRupees(ctx.totalRawSavings)+' — liquidity adjusted)':'');
  eH+='</div>';el('eligBlock').innerHTML=eH;

  // EMI Trend SVG (in expandable)
  if(trend.length>0){
    el('trendBlock').innerHTML='<div class="rp-graph-title">EMI Burden Over Time</div>'
      +'<div class="rp-graph-sub">How EMI burden eases as income grows over the loan tenure</div>'
      +buildTrendSVG(trend,inp.incomeType);
    el('trendBlock').style.display='block';
  } else el('trendBlock').style.display='none';

  // Breakpoints (hidden)
  var bp=[];
  bp.push({k:'EMI vs bank limit',v:formatRupees(inp.newEMI)+' / '+formatRupees(elig.maxEMI),c:elOk?'':'text-bad'});
  var safeInc=base.outflow/(1-shP/100);
  bp.push({k:'Income for '+shP+'% shock',v:formatRupees(safeInc),c:inp.income<safeInc?'text-bad':'text-ok'});
  if(isFinite(realSurv)&&iShk.deficit>0)bp.push({k:'Realistic time to failure',v:'~'+Math.floor(realSurv)+' months',c:realSurv<6?'text-bad':realSurv<12?'text-warn':'text-ok'});
  bp.push({k:'Total cost',v:formatLakh(inp.newEMI*inp.tenure)+' (int '+Math.round(ctx.interestRatio*100)+'%)',c:ctx.interestRatio>1?'text-warn':''});
  if(inp.unsecuredRatio>.05)bp.push({k:'Unsecured ratio',v:formatPct(inp.unsecuredRatio),c:inp.unsecuredRatio>.25?'text-bad':inp.unsecuredRatio>.15?'text-warn':'text-ok'});
  el('breakpointRows').innerHTML=bp.map(function(b){return'<div class="breakpoint-row"><span class="breakpoint-key">'+b.k+'</span><span class="breakpoint-val '+b.c+'">'+b.v+'</span></div>';}).join('');

  // Perspective (hidden)
  var yI=inp.newEMI>0?(inp.newEMI*inp.tenure)/(inp.income*12):0;
  var ps='<div class="block-label">Perspective</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7;color:var(--color-muted)">';
  if(yI>0){
    ps+='Committing <strong style="color:var(--color-text)">'+yI.toFixed(1)+' years</strong> of income. Total: <strong>'+formatLakh(inp.newEMI*inp.tenure)+'</strong> ('+(1+ctx.interestRatio).toFixed(1)+'× loan).';
    if(ctx.interestRatio>1)ps+=' <span style="color:var(--color-danger)">Interest exceeds principal.</span>';
    if(pp&&pp.savedMonths>12)ps+='<br>Prepayment saves <strong style="color:var(--color-safe)">'+pp.savedYears+' yrs, '+formatLakh(pp.savedInterest)+'</strong>.';
  }
  ps+='</div>';el('perspectiveBlock').innerHTML=ps;

  // ═══════════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════════
  document.querySelectorAll('.metric-card').forEach(function(card){
    card.onclick=function(){
      var id='expand-'+card.dataset.expand;
      var detailEl=el(id);
      if(!detailEl) return;
      var isOpen=detailEl.style.display!=='none';
      ['expand-net','expand-survival','expand-emi'].forEach(function(did){
        var d=el(did);if(d) d.style.display='none';
      });
      document.querySelectorAll('.metric-card').forEach(function(c){c.classList.remove('active');});
      if(!isOpen){detailEl.style.display='block';card.classList.add('active');}
    };
  });

  var expBtn=el('expandToggleBtn');
  if(expBtn){
    expBtn.onclick=function(){
      var content=el('expandContent');
      var arrow=el('expandArrow');
      if(content.style.display==='none'){content.style.display='block';arrow.textContent='↑';}
      else{content.style.display='none';arrow.textContent='↓';}
    };
  }

  // Show results full-width
  el('placeholderPanel').style.display='none';
  el('inputPanel').style.display='none';
  el('resultsPanel').style.display='block';
  var cont=document.querySelector('.container');
  cont.classList.remove('wide');
  cont.classList.add('results-full');
  el('resultsPanel').scrollIntoView({behavior:'smooth',block:'start'});
}

/** Pick top N risks prioritised by severity (bad first, then warn) */
function pickTopRisks(flags, max) {
  var bad=flags.filter(function(f){return f.level==='bad';});
  var warn=flags.filter(function(f){return f.level==='warn';});
  return bad.concat(warn).slice(0,max);
}

/** Build flags array */
function buildFlags(ctx){
  var fl=[],base=ctx.base,inp=ctx.inp,th=ctx.thresholds,rShk=ctx.rateShock,rNrm=ctx.rateNorm,rec=ctx.recovery,cross=ctx.crossover;
  if(base.deficit>0)fl.push({text:'Baseline deficit: '+formatRupees(base.deficit)+'/mo',level:'bad'});
  if(base.residual<0)fl.push({text:'Negative residual',level:'bad'});
  if(ctx.zeroSavings)fl.push({text:'Zero usable savings',level:'bad'});
  if(rShk&&rShk.negAmort)fl.push({text:'Neg. amortization trap',level:'bad'});
  if(base.emiRatio>th.risky)fl.push({text:'EMI > '+formatPct(th.risky),level:'bad'});
  else if(base.emiRatio>th.warn)fl.push({text:'EMI > '+formatPct(th.warn),level:'warn'});
  if(inp.newEMI>ctx.eligibility.maxEMI)fl.push({text:'Exceeds bank limit',level:'bad'});
  if(ctx.savingsMasking)fl.push({text:'Savings delaying failure',level:'bad'});
  if(inp.unsecuredRatio>.25)fl.push({text:'Unsecured > 25%',level:'bad'});
  else if(inp.unsecuredRatio>.15)fl.push({text:'Unsecured > 15%',level:'warn'});
  if(inp.stage==='early')fl.push({text:'Early-stage loan',level:'warn'});
  if(rec&&(rec.feasibility==='impossible'||rec.feasibility==='no-runway'||rec.feasibility==='unrealistic'))fl.push({text:'Recovery: '+rec.feasibility.replace(/-/g,' '),level:'bad'});
  else if(rec&&rec.feasibility==='extreme')fl.push({text:'Recovery: extreme',level:'bad'});
  if(ctx.lti>5)fl.push({text:'Loan > 5× income',level:'warn'});
  if(ctx.ltv&&!ctx.ltv.compliant)fl.push({text:'LTV > RBI limit',level:'bad'});
  if(ctx.interestRatio>1)fl.push({text:'Interest > principal',level:'warn'});
  if(rNrm&&rNrm.applicable&&!rNrm.aboveNorm&&rNrm.normRatio>th.warn)fl.push({text:'Rate norm risk',level:'warn'});
  if(cross.crossoverYear&&cross.crossoverYear<=10)fl.push({text:'Inflation crossover yr '+cross.crossoverYear,level:cross.crossoverYear<=5?'bad':'warn'});
  if(inp.loanPurpose==='personal')fl.push({text:'Unsecured personal loan',level:'warn'});
  if(inp.dependents>=3)fl.push({text:inp.dependents+' dependents',level:'warn'});
  else if(inp.dependents>=1)fl.push({text:inp.dependents+' dependent'+(inp.dependents>1?'s':''),level:'info'});
  if(ctx.totalRawSavings>inp.savings*1.3)fl.push({text:'Savings haircut applied',level:'info'});
  return fl;
}

/** Build recommendations array */
function buildRecommendations(ctx){
  var r=[],base=ctx.base,inp=ctx.inp,th=ctx.thresholds,iShk=ctx.incomeShock,
      rShk=ctx.rateShock,rNrm=ctx.rateNorm,rec=ctx.recovery,cross=ctx.crossover,pp=ctx.prepay;
  var exR=(inp.essential+inp.semiFixed+inp.lifestyle)/inp.income;
  if(base.deficit>0&&base.emiRatio<.4)r.push('Deficit from expenses ('+formatPct(exR)+'), not loan (EMI '+formatPct(base.emiRatio)+'). Fix expenses first.');
  else if(base.deficit>0)r.push('Outflow exceeds income by '+formatRupees(base.deficit)+'/mo. Not viable.');
  if(inp.newEMI>ctx.eligibility.maxEMI)r.push('EMI '+formatRupees(inp.newEMI)+' > bank limit '+formatRupees(ctx.eligibility.maxEMI)+'. Max: '+formatLakh(ctx.eligibility.maxLoan)+'.');
  if(inp.totalEMI>inp.income*th.warn)r.push('Total EMI > '+formatPct(th.warn)+'. Reduce by '+formatRupees(inp.totalEMI-inp.income*th.warn)+'/mo.');
  if(ctx.zeroSavings)r.push('Build '+formatRupees(base.outflow*3)+' (3 months) BEFORE committing.');
  else if(isFinite(base.buffer)&&base.buffer<(CONFIG.BUFFER_TARGET[inp.incomeType]||6)&&base.deficit===0){var tgt=base.outflow*(CONFIG.BUFFER_TARGET[inp.incomeType]||6);r.push('Buffer '+base.buffer.toFixed(1)+'mo. Save '+formatRupees(tgt-inp.savings)+' more.')}
  if(inp.unsecuredRatio>.15)r.push('Unsecured at '+formatPct(inp.unsecuredRatio)+'. Pay off before new secured debt.');
  if(rec){if(rec.feasibility==='no-runway')r.push('Under shock: build emergency fund FIRST.');
  else if(rec.feasibility==='unrealistic')r.push('Under shock: deficit is '+formatPct(iShk.deficit/inp.income)+' of income. Reduce loan or increase income.');
  else if(rec.feasibility==='achievable')r.push('Under shock: cut '+formatRupees(rec.lifeCut)+' from lifestyle ('+rec.lifePct+'%). Keep '+formatRupees(iShk.deficit*6)+' buffer.');
  else if(rec.feasibility==='difficult')r.push('Under shock: all lifestyle + semi-fixed needed. Build '+formatRupees(iShk.deficit*12)+' emergency fund.');
  else if(rec.feasibility==='extreme')r.push('Under shock: extreme cuts. Reduce loan or get term insurance ('+formatLakh(inp.loanAmount)+').');
  else r.push('Under shock: '+formatRupees(rec.remainder)+'/mo uncoverable. Smaller loan needed.')}
  if(ctx.savingsMasking)r.push('Savings buying time ('+Math.floor(base.buffer)+'mo), not safety. Eliminate '+formatRupees(base.deficit)+'/mo drain.');
  if(rShk&&rShk.negAmort)r.push('At +2%, debt grows. Fix rate, shorter tenure, or smaller loan.');
  if(rNrm&&rNrm.applicable&&!rNrm.aboveNorm&&rNrm.normRatio>th.warn)r.push('Rate norm → '+formatPct(rNrm.normRatio)+'. Budget +'+formatRupees(rNrm.normDelta)+'/mo or fix rate.');
  if(ctx.ltv&&!ctx.ltv.compliant)r.push('LTV '+formatPct(ctx.ltv.ltv)+' > RBI max. Increase down payment.');
  if(cross.crossoverYear&&cross.crossoverYear<=10)r.push('Inflation crossover yr '+cross.crossoverYear+'. Prepay early.');
  if(ctx.interestRatio>1)r.push('Interest > principal. Shorter tenure or prepayments.');
  if(inp.stage==='early')r.push('Early-stage: extra payments now have maximum impact.');
  if(r.length===0)r.push('All indicators healthy. Consider prepayments for optimization.');
  return r;
}
/* ═══════════════════════════════════════════════════
   ENHANCED OUTPUT — Core Reason, Worst Case, Delta
   These functions are ADDITIVE — they do not change
   any existing calculation or rendering logic.
═══════════════════════════════════════════════════ */

/**
 * renderCoreReason — Why is this verdict what it is?
 * Extracts the single most important signal.
 */
function renderCoreReason(ctx) {
  var base = ctx.base, iShk = ctx.incomeShock, inp = ctx.inp;
  var block = document.getElementById('coreReasonBlock');
  var html = '<div class="core-reason-title">Why This Verdict</div>';

  if (base.deficit > 0) {
    html += '<div class="core-reason-item bad">▸ You are already losing <strong>'
      + formatRupees(base.deficit) + '/month</strong> before any shock event.</div>';
  }

  if (ctx.zeroSavings) {
    html += '<div class="core-reason-item bad">▸ Zero usable savings — any income disruption causes <strong>instant default</strong>.</div>';
  }

  if (ctx.realisticSurvival < 3 && !ctx.zeroSavings) {
    html += '<div class="core-reason-item bad">▸ Under income stress, savings last only <strong>~'
      + Math.floor(ctx.realisticSurvival) + ' months</strong> (realistic estimate).</div>';
  } else if (ctx.realisticSurvival < 6 && !ctx.zeroSavings && base.deficit === 0) {
    html += '<div class="core-reason-item warn">▸ Under income stress, realistic survival window is <strong>~'
      + Math.floor(ctx.realisticSurvival) + ' months</strong>.</div>';
  }

  if (base.emiRatio > ctx.thresholds.risky) {
    html += '<div class="core-reason-item bad">▸ EMI ratio <strong>' + formatPct(base.emiRatio)
      + '</strong> exceeds danger threshold of ' + formatPct(ctx.thresholds.risky) + '.</div>';
  } else if (base.emiRatio > ctx.thresholds.warn) {
    html += '<div class="core-reason-item warn">▸ EMI ratio <strong>' + formatPct(base.emiRatio)
      + '</strong> is in the warning zone (safe: ' + formatPct(ctx.thresholds.green) + ').</div>';
  }

  if (ctx.rateShock && ctx.rateShock.negAmort) {
    html += '<div class="core-reason-item bad">▸ <strong>Debt trap detected</strong> — at +2% rate, monthly interest exceeds your EMI.</div>';
  }

  if (inp.unsecuredRatio > 0.25) {
    html += '<div class="core-reason-item bad">▸ Unsecured debt is <strong>' + formatPct(inp.unsecuredRatio)
      + '</strong> of income — the #1 default driver in India.</div>';
  }

  if (ctx.verdict === 'SAFE') {
    html += '<div class="core-reason-item ok">▸ All three key indicators (EMI ratio, buffer, survival) are within safe thresholds.</div>';
  }

  block.innerHTML = html;
}

/**
 * renderWorstCase — Clean worst-case summary from income shock scenario
 */
function renderWorstCase(ctx) {
  var iShk = ctx.incomeShock, inp = ctx.inp;
  var block = document.getElementById('worstCaseBlock');
  var shP   = iShk.shockPct;

  var html = '<div class="worst-case-header">⚠ Worst Case: ' + shP + '% Income Shock</div>';
  html += '<div class="worst-case-grid">';

  // Income after shock
  html += '<div class="wc-tile"><div class="wc-label">Shocked Income</div>'
    + '<div class="wc-value warn">₹' + Math.round(iShk.shockedIncome).toLocaleString('en-IN') + '</div>'
    + '<div class="wc-sub">from ₹' + Math.round(inp.income).toLocaleString('en-IN') + '</div></div>';

  // Monthly deficit
  var defVal = iShk.deficit > 0
    ? '<div class="wc-value bad">₹' + Math.round(iShk.deficit).toLocaleString('en-IN') + '/mo</div>'
    : '<div class="wc-value ok">Surplus</div>';
  html += '<div class="wc-tile"><div class="wc-label">Monthly Gap</div>'
    + defVal + '<div class="wc-sub">shortfall during shock</div></div>';

  // Realistic time to failure
  var realS = ctx.realisticSurvival;
  var survText, survCls;
  if (ctx.zeroSavings) {
    survText = 'INSTANT'; survCls = 'bad';
  } else if (!isFinite(realS)) {
    survText = '∞'; survCls = 'ok';
  } else {
    survText = '~' + Math.floor(realS) + ' mo'; survCls = survivalColor(realS);
  }
  html += '<div class="wc-tile"><div class="wc-label">Time to Failure</div>'
    + '<div class="wc-value ' + survCls + '">' + survText + '</div>'
    + '<div class="wc-sub">realistic estimate</div></div>';

  html += '</div>';
  block.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════
   SVG GRAPH BUILDERS
   ═══════════════════════════════════════════════════════ */

function buildCrossoverSVG(cross) {
  var data = cross.table;
  if (!data || data.length === 0) return '';
  var W=820, H=250, pL=72, pR=24, pT=32, pB=44;
  var plotW=W-pL-pR, plotH=H-pT-pB;
  var maxVal=0;
  data.forEach(function(r){ if(r.income>maxVal) maxVal=r.income; if(r.outflow>maxVal) maxVal=r.outflow; });
  maxVal=Math.ceil(maxVal/50000)*50000;
  var maxYr=data[data.length-1].year;
  if(maxYr===0) return '';
  function xS(y){ return pL+(y/maxYr)*plotW; }
  function yS(v){ return pT+plotH-(v/maxVal)*plotH; }

  var svg='<svg width="100%" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-top:8px">';

  // Gridlines + Y labels
  for(var gi=0;gi<=4;gi++){
    var gv=(maxVal/4)*gi, gy=yS(gv).toFixed(1);
    svg+='<line x1="'+pL+'" y1="'+gy+'" x2="'+(W-pR)+'" y2="'+gy+'" stroke="#2a2d31" stroke-width="1"/>';
    svg+='<text x="'+(pL-8)+'" y="'+(parseFloat(gy)+4)+'" text-anchor="end" fill="#7a7f87" font-size="10" font-family="IBM Plex Mono,monospace">'+formatLakh(gv)+'</text>';
  }

  // X ticks
  data.forEach(function(r){
    if(r.year===0||r.year%5===0){
      var gx=xS(r.year).toFixed(1);
      svg+='<line x1="'+gx+'" y1="'+pT+'" x2="'+gx+'" y2="'+(H-pB)+'" stroke="#2a2d31" stroke-width="1" stroke-dasharray="2,5"/>';
      svg+='<text x="'+gx+'" y="'+(H-pB+16)+'" text-anchor="middle" fill="#7a7f87" font-size="10" font-family="IBM Plex Mono,monospace">Yr '+r.year+'</text>';
    }
  });

  // Income area fill
  var area='M'+xS(data[0].year).toFixed(1)+','+(H-pB);
  data.forEach(function(r){ area+=' L'+xS(r.year).toFixed(1)+','+yS(r.income).toFixed(1); });
  area+=' L'+xS(data[data.length-1].year).toFixed(1)+','+(H-pB)+' Z';
  svg+='<path d="'+area+'" fill="#34d399" opacity="0.06"/>';

  // Outflow line
  var od=data.map(function(r,i){ return(i===0?'M':'L')+xS(r.year).toFixed(1)+','+yS(r.outflow).toFixed(1); }).join(' ');
  svg+='<path d="'+od+'" fill="none" stroke="#fb923c" stroke-width="2.5" stroke-linejoin="round"/>';

  // Income line
  var id2=data.map(function(r,i){ return(i===0?'M':'L')+xS(r.year).toFixed(1)+','+yS(r.income).toFixed(1); }).join(' ');
  svg+='<path d="'+id2+'" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linejoin="round"/>';

  // Crossover marker
  if(cross.crossoverYear!==null&&cross.crossoverYear!==undefined){
    var cx=xS(cross.crossoverYear).toFixed(1);
    var cy=yS(cross.table[cross.crossoverYear]?cross.table[cross.crossoverYear].income:0).toFixed(1);
    svg+='<line x1="'+cx+'" y1="'+pT+'" x2="'+cx+'" y2="'+(H-pB)+'" stroke="#f87171" stroke-width="1.5" stroke-dasharray="5,3"/>';
    svg+='<circle cx="'+cx+'" cy="'+cy+'" r="5" fill="#f87171"/>';
    svg+='<text x="'+(parseFloat(cx)+8)+'" y="'+(pT+14)+'" fill="#f87171" font-size="10" font-family="IBM Plex Mono,monospace">Crossover Yr '+cross.crossoverYear+'</text>';
  }

  // Data dots at key years
  data.forEach(function(r){
    if(r.year%5===0||r.year===0){
      svg+='<circle cx="'+xS(r.year).toFixed(1)+'" cy="'+yS(r.income).toFixed(1)+'" r="3.5" fill="#34d399" stroke="#141618" stroke-width="1.5"/>';
      svg+='<circle cx="'+xS(r.year).toFixed(1)+'" cy="'+yS(r.outflow).toFixed(1)+'" r="3.5" fill="#fb923c" stroke="#141618" stroke-width="1.5"/>';
    }
  });

  // Legend
  var lx=W-140, ly=pT+4;
  svg+='<rect x="'+lx+'" y="'+ly+'" width="12" height="3" fill="#34d399" rx="1"/>';
  svg+='<text x="'+(lx+16)+'" y="'+(ly+5)+'" fill="#9ca3af" font-size="10" font-family="IBM Plex Mono,monospace">Income</text>';
  svg+='<rect x="'+lx+'" y="'+(ly+16)+'" width="12" height="3" fill="#fb923c" rx="1"/>';
  svg+='<text x="'+(lx+16)+'" y="'+(ly+21)+'" fill="#9ca3af" font-size="10" font-family="IBM Plex Mono,monospace">Outflow</text>';

  svg+='</svg>';
  return svg;
}

function buildTrendSVG(trend, incomeType) {
  if(!trend||trend.length===0) return '';
  var th=getThresholds(incomeType);
  var W=700, barH=38, barGap=10, pL=52, pR=90, pT=40, pB=12;
  var H=pT+trend.length*(barH+barGap)-barGap+pB;
  var plotW=W-pL-pR;
  var maxR=Math.max(th.risky+0.12, (trend[0]?trend[0].ratio:0.6)+0.08);
  function xS(r){ return pL+(r/maxR)*plotW; }

  var svg='<svg width="100%" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-top:8px">';

  // Background zones
  svg+='<rect x="'+pL+'" y="0" width="'+(xS(th.green)-pL).toFixed(1)+'" height="'+H+'" fill="#34d399" opacity="0.05"/>';
  svg+='<rect x="'+xS(th.green).toFixed(1)+'" y="0" width="'+(xS(th.warn)-xS(th.green)).toFixed(1)+'" height="'+H+'" fill="#fbbf24" opacity="0.05"/>';
  svg+='<rect x="'+xS(th.warn).toFixed(1)+'" y="0" width="'+(xS(th.risky)-xS(th.warn)).toFixed(1)+'" height="'+H+'" fill="#f87171" opacity="0.05"/>';

  // Threshold lines + top labels
  [[th.green,'#34d399','Safe'],[th.warn,'#fbbf24','Warn'],[th.risky,'#f87171','Risky']].forEach(function(t){
    var tx=xS(t[0]).toFixed(1);
    svg+='<line x1="'+tx+'" y1="0" x2="'+tx+'" y2="'+H+'" stroke="'+t[1]+'" stroke-width="1" opacity="0.4"/>';
    svg+='<text x="'+tx+'" y="18" text-anchor="middle" fill="'+t[1]+'" font-size="9" font-family="IBM Plex Mono,monospace" opacity="0.8">'+t[2]+' '+formatPct(t[0])+'</text>';
  });

  // Bars
  trend.forEach(function(p,i){
    var y=pT+i*(barH+barGap);
    var bw=Math.max(0,Math.min(xS(p.ratio)-pL,plotW));
    var col=p.ratio<=th.green?'#34d399':p.ratio<=th.warn?'#fbbf24':'#f87171';
    svg+='<text x="'+(pL-6)+'" y="'+(y+barH/2+5)+'" text-anchor="end" fill="#7a7f87" font-size="11" font-family="IBM Plex Mono,monospace">Yr '+p.year+'</text>';
    svg+='<rect x="'+pL+'" y="'+y+'" width="'+plotW+'" height="'+barH+'" fill="'+col+'" opacity="0.07" rx="3"/>';
    svg+='<rect x="'+pL+'" y="'+y+'" width="'+bw.toFixed(1)+'" height="'+barH+'" fill="'+col+'" opacity="0.75" rx="3"/>';
    svg+='<text x="'+(pL+bw+8)+'" y="'+(y+barH/2+5)+'" fill="'+col+'" font-size="13" font-weight="600" font-family="IBM Plex Mono,monospace">'+formatPct(p.ratio)+'</text>';
  });

  svg+='</svg>';
  return svg;
}

/**
 * renderDeltaSummary — Top 3 actionable changes (concise version for above-fold)
 */
function renderDeltaSummary(ctx) {
  var block = document.getElementById('deltaSummaryBlock');
  if (ctx.verdict === 'SAFE' || !ctx.delta || ctx.delta.length === 0) {
    block.innerHTML = '';
    return;
  }

  var html = '<div class="delta-title">What to Change</div>';
  var items = ctx.delta.slice(0, 3);

  items.forEach(function(d) {
    html += '<div class="delta-item">'
      + '<div class="delta-left">'
      + '<div class="delta-type">' + d.type + '</div>'
      + '<div class="delta-value">' + d.message + '</div>'
      + '</div></div>';
  });

  block.innerHTML = html;
}
