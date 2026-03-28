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
  var th=ctx.thresholds, iS=iShk.survival, zS=ctx.zeroSavings;
  var shP=iShk.shockPct, elOk=inp.newEMI<=elig.maxEMI;
  var realSurv=ctx.realisticSurvival, theoSurv=ctx.theoreticalSurvival;
  var vC=verdictColor(verdict);

  // ═══ SCORE ═══
  el('scoreBlock').innerHTML=
    '<div class="score-ring v-'+verdict+'">'+score+'</div>'
    +'<div class="score-details"><div class="score-label">Decision Score</div>'
    +'<div class="score-verdict" style="color:var(--color-'+vC+')">'+verdict+'</div>'
    +'<div class="score-sub">'+decSt+'</div></div>';

  // ═══ BANNER ═══
  var ban=el('decisionBanner');
  ban.className='decision-banner '+verdict.toLowerCase();
  ban.textContent=verdictText(verdict);

  // ═══ FLAGS ═══
  var fl=buildFlags(ctx);
  var fE=el('flagsBlock');
  if(fl.length>0){fE.style.display='flex';fE.innerHTML=fl.map(function(f){return'<span class="risk-flag '+f.level+'">'+f.text+'</span>'}).join('')}
  else fE.style.display='none';

  // ═══ IMPACT DASHBOARD ═══
  var stEmiR=ctx.stressEmiRatio;
  el('impactHeader').innerHTML='⚠ IMPACT: What happens under '+shP+'% income shock';
  var ig='';
  ig+=tile('EMI Ratio',formatPct(stEmiR),emiColor(stEmiR,inp.incomeType),'was '+formatPct(base.emiRatio),'neg');
  ig+=tile('Monthly Net',formatRupees(iShk.net),iShk.net>=0?'ok':'bad','was '+formatRupees(base.net),iShk.net<base.net?'neg':'pos');
  var ttf=zS?'0':(isFinite(realSurv)?Math.floor(realSurv)+'mo':'∞');
  var ttfSub=isFinite(theoSurv)&&theoSurv!==realSurv?'theoretical: '+Math.round(theoSurv)+'mo':'';
  ig+=tile('Time to Failure',ttf,zS?'bad':survivalColor(realSurv),ttfSub,'neu');
  ig+=tile('Buffer',(isFinite(iShk.buffer)?iShk.buffer.toFixed(1):'∞'),bufferColor(iShk.buffer),'was '+(isFinite(base.buffer)?base.buffer.toFixed(1):'∞'),iShk.buffer<base.buffer?'neg':'neu');
  el('impactGrid').innerHTML=ig;
  function tile(l,v,vc,sub,sc){return'<div class="impact-tile"><div class="tile-label">'+l+'</div><div class="tile-value '+vc+'">'+v+'</div><div class="tile-change '+sc+'">'+sub+'</div></div>'}

  // ═══ SCENARIOS ═══
  var sh='<div class="block-label">All Stress Scenarios</div>';
  var shNote=iShk.wasOverridden?' (entered '+iShk.userShock+'%, floor '+shP+'%)':'';
  sh+=sRow('S1 · Income −'+shP+'%'+shNote,'Income → '+formatRupees(iShk.shockedIncome),
    iShk.deficit===0?{t:'Surplus '+formatRupees(iShk.net),c:'ok'}:(zS?{t:'INSTANT DEFAULT',c:'bad'}:{t:'~'+Math.floor(realSurv)+'mo realistic · '+formatRupees(iShk.deficit)+'/mo',c:survivalColor(realSurv)}));
  if(rShk){if(rShk.negAmort)sh+=sRow('S2 · Rate +2% → '+rShk.shockedRate.toFixed(1)+'%','Int '+formatRupees(rShk.monthlyInterest)+' > EMI '+formatRupees(inp.newEMI),{t:'DEBT TRAP',c:'bad'});
  else{var tn2=isFinite(rShk.tenureDelta)&&rShk.tenureDelta>0?' · +'+rShk.tenureDelta+'mo':'';sh+=sRow('S2 · Rate +2%','EMI +'+formatRupees(rShk.emiDelta),{t:'Ratio '+formatPct(rShk.emiRatio)+tn2,c:emiColor(rShk.emiRatio,inp.incomeType)})}}
  else sh+=sRow('S2 · Rate +2%','Fixed',{t:'N/A',c:'na'});
  sh+=sRow('S3 · Expense 1.5×','Essential → '+formatRupees(eShk.essential)+' (+'+formatRupees(eShk.expenseDelta)+')',{t:'Buffer '+(isFinite(eShk.buffer)?eShk.buffer.toFixed(1):'∞')+'mo',c:bufferColor(eShk.buffer)});
  var cSv=comb.survival;var cReal=isFinite(cSv)?realisticSurvival(cSv,inp.incomeType,inp.dependents):Infinity;
  sh+=sRow('S4 · Combined','Income −'+comb.shockPct+'% + 1.5× exp',comb.deficit===0?{t:'No deficit',c:'ok'}:{t:'~'+Math.floor(cReal)+'mo · '+formatRupees(comb.deficit)+'/mo',c:survivalColor(cReal)});
  if(rNrm&&rNrm.applicable){if(rNrm.aboveNorm)sh+=sRow('S5 · Rate Norm ↓','Your '+inp.rate+'% > avg',{t:'EMI drops '+formatRupees(Math.abs(rNrm.normDelta)),c:'positive'});
  else sh+=sRow('S5 · Rate Norm ↑','To avg '+rNrm.normRate.toFixed(1)+'%',{t:'EMI +'+formatRupees(rNrm.normDelta)+' · '+formatPct(rNrm.normRatio),c:emiColor(rNrm.normRatio,inp.incomeType)})}
  if(cross.crossoverYear)sh+=sRow('S6 · Inflation Yr '+cross.crossoverYear,'Expenses outpace income',{t:'Net negative',c:'bad'});
  else{var lr=cross.table[cross.table.length-1];sh+=sRow('S6 · Inflation','Through yr '+cross.years,{t:'Net +ve '+formatRupees(lr.net),c:'ok'})}
  el('scenarioBlock').innerHTML=sh;
  function sRow(l,d,r){return'<div class="scenario-row"><div><span class="scenario-label">'+l+'</span><div class="scenario-detail">'+d+'</div></div><span class="scenario-value '+r.c+'">'+r.t+'</span></div>'}

  // ═══ ANALYSIS ═══
  el('analysisText').innerHTML=buildAnalysisHTML(ctx);

  // ═══ RECOVERY ═══
  var rB=el('recoveryBlock');
  if(rec){rB.style.display='block';
    var fc='f-'+rec.feasibility.replace(/[- ]/g,'');
    rB.innerHTML='<div class="recovery-title">Realistic Survival Plan</div><div class="recovery-feasibility '+fc+'">'+rec.feasibility.toUpperCase().replace(/-/g,' ')+'</div><div class="recovery-steps">Deficit: '+formatRupees(rec.needed)+'/mo<br>'+rec.note+'</div>'}
  else rB.style.display='none';

  // ═══ RECOMMENDATIONS ═══
  var recs=buildRecommendations(ctx);
  el('recoList').innerHTML=recs.map(function(x){return'<li>'+x+'</li>'}).join('');

  // ═══ DECISION DELTA ═══
  var ddB=el('deltaBlock');
  if(delta.length>0){ddB.style.display='block';
    var dH='<div class="block-label">What to Change to Improve</div>';
    dH+='<div style="font-family:var(--font-mono);font-size:10px;color:var(--color-muted);margin-bottom:6px">Minimum adjustments to move toward safety:</div>';
    delta.slice(0,4).forEach(function(d,i){dH+='<div class="scenario-row"><div><span class="scenario-label" style="color:var(--color-accent)">'+(i+1)+'. '+d.type+'</span></div><span class="scenario-value" style="color:var(--color-text)">'+d.message+'</span></div>'});
    ddB.innerHTML=dH;}
  else ddB.style.display='none';

  // ═══ PREPAYMENT ═══
  var pB=el('prepayBlock');
  if(pp){pB.style.display='block';pB.innerHTML='<div class="block-label">Prepayment Impact</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7">Annual: '+formatRupees(pp.annualPrepay)+' · Tenure: '+pp.origTenure+' → '+pp.newTenure+'mo (−'+pp.savedYears+'yrs) · Saved: <strong style="color:var(--color-safe)">'+formatLakh(pp.savedInterest)+'</strong></div>'}
  else{if(ctx.interestRatio>.7&&base.net>0){var sug=Math.round(base.net*12*.2);var sSim=simulatePrepayment(inp.loanAmount,inp.rate,inp.tenure,sug);
    if(sSim&&sSim.savedMonths>6){pB.style.display='block';pB.innerHTML='<div class="block-label">Prepayment Suggestion</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7">Prepay '+formatRupees(sug)+'/yr (20% surplus): saves '+sSim.savedYears+' years, '+formatLakh(sSim.savedInterest)+' interest.</div>'}
    else pB.style.display='none'}
  else pB.style.display='none'}

  // ═══ CROSSOVER TABLE ═══
  var cB=el('crossoverBlock');
  var sY=[0,1,3,5,10,Math.ceil(inp.tenure/12)];
  sY=sY.filter(function(y,i,a){return y<=cross.years&&a.indexOf(y)===i}).sort(function(a,b){return a-b});
  var tb='<div class="block-label">Inflation Crossover</div><div style="font-size:10px;color:var(--color-muted);margin-bottom:4px;font-family:var(--font-mono)">Income: 7→5→3%/yr · Expenses: 6%</div><div style="overflow-x:auto"><table class="crossover-table"><thead><tr><th>Yr</th><th>Income</th><th>Outflow</th><th>Net</th><th>EMI%</th></tr></thead><tbody>';
  for(var i=0;i<sY.length;i++){var rw=cross.table[sY[i]];if(!rw)continue;var nc=rw.net>=0?(rw.net<20000?'cell-warn':'cell-ok'):'cell-bad';
  tb+='<tr><td>'+rw.year+'</td><td>'+formatRupees(rw.income)+'</td><td>'+formatRupees(rw.outflow)+'</td><td class="'+nc+'">'+formatRupees(rw.net)+'</td><td>'+formatPct(rw.emiRatio)+'</td></tr>'}
  tb+='</tbody></table></div>';cB.innerHTML=tb;cB.style.display='block';

  // ═══ BASELINE REFERENCE ═══
  el('baselineRef').innerHTML='<div class="ref-label">Current state (before stress)</div><div class="baseline-grid"><div class="bg-item">EMI: <strong>'+formatPct(base.emiRatio)+'</strong></div><div class="bg-item">Residual: <strong>'+formatRupees(base.residual)+'</strong></div><div class="bg-item">Buffer: <strong>'+(isFinite(base.buffer)?base.buffer.toFixed(1):'∞')+'mo</strong></div><div class="bg-item">Net: <strong>'+formatRupees(base.net)+'</strong></div></div>';

  // ═══ ELIGIBILITY ═══
  var lti=ctx.lti;
  var eH='<div class="block-label">Bank Eligibility</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7">';
  eH+='Bank max EMI: <strong>'+formatRupees(elig.maxEMI)+'</strong> · Yours: <strong style="color:var(--color-'+(elOk?'safe':'danger')+')">'+formatRupees(inp.newEMI)+'</strong>';
  if(!elOk)eH+=' <span style="color:var(--color-danger)">exceeds by '+formatRupees(inp.newEMI-elig.maxEMI)+'</span>';
  eH+='<br>Max eligible: '+formatLakh(elig.maxLoan)+' · LTI: <strong>'+lti.toFixed(1)+'×</strong>';
  if(ltv)eH+=' · LTV: <strong style="color:var(--color-'+(ltv.compliant?'safe':'danger')+')">'+formatPct(ltv.ltv)+'</strong>/'+formatPct(ltv.maxLTV);
  eH+='<br>Usable savings: <strong>'+formatRupees(inp.savings)+'</strong>'+(ctx.totalRawSavings>inp.savings*1.3?' (from '+formatRupees(ctx.totalRawSavings)+' — liquidity adjusted)':'');
  eH+='</div>';el('eligBlock').innerHTML=eH;

  // ═══ EMI TREND ═══
  if(trend.length>0){var tH='<div class="block-label">EMI Burden Over Time</div><div style="display:flex;gap:10px;flex-wrap:wrap">';
  trend.forEach(function(p){var c=emiColor(p.ratio,inp.incomeType);tH+='<div style="font-family:var(--font-mono);font-size:10px;padding:4px 8px;background:var(--color-surface-2);border:1px solid var(--color-border)"><span style="color:var(--color-muted)">Yr '+p.year+':</span> <span style="font-weight:600;color:var(--color-'+(c==='ok'?'safe':c==='warn'?'warning':'danger')+')">'+formatPct(p.ratio)+'</span></div>'});
  tH+='</div>';el('trendBlock').innerHTML=tH;el('trendBlock').style.display='block'}
  else el('trendBlock').style.display='none';

  // ═══ BREAKPOINTS ═══
  var bp=[];
  bp.push({k:'EMI vs bank limit',v:formatRupees(inp.newEMI)+' / '+formatRupees(elig.maxEMI),c:elOk?'':'text-bad'});
  var safeInc=base.outflow/(1-shP/100);
  bp.push({k:'Income for '+shP+'% shock',v:formatRupees(safeInc),c:inp.income<safeInc?'text-bad':'text-ok'});
  if(isFinite(realSurv)&&iShk.deficit>0)bp.push({k:'Realistic time to failure',v:'~'+Math.floor(realSurv)+' months',c:realSurv<6?'text-bad':realSurv<12?'text-warn':'text-ok'});
  bp.push({k:'Total cost',v:formatLakh(inp.newEMI*inp.tenure)+' (int '+Math.round(ctx.interestRatio*100)+'%)',c:ctx.interestRatio>1?'text-warn':''});
  if(inp.unsecuredRatio>.05)bp.push({k:'Unsecured ratio',v:formatPct(inp.unsecuredRatio),c:inp.unsecuredRatio>.25?'text-bad':inp.unsecuredRatio>.15?'text-warn':'text-ok'});
  el('breakpointRows').innerHTML=bp.map(function(b){return'<div class="breakpoint-row"><span class="breakpoint-key">'+b.k+'</span><span class="breakpoint-val '+b.c+'">'+b.v+'</span></div>'}).join('');

  // ═══ PERSPECTIVE ═══
  var yI=(inp.newEMI*inp.tenure)/(inp.income*12);
  var ps='<div class="block-label">Perspective</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7;color:var(--color-muted)">';
  ps+='Committing <strong style="color:var(--color-text)">'+yI.toFixed(1)+' years</strong> of income. Total: <strong>'+formatLakh(inp.newEMI*inp.tenure)+'</strong> ('+(1+ctx.interestRatio).toFixed(1)+'× loan).';
  if(ctx.interestRatio>1)ps+=' <span style="color:var(--color-danger)">Interest exceeds principal.</span>';
  if(pp&&pp.savedMonths>12)ps+='<br>Prepayment saves <strong style="color:var(--color-safe)">'+pp.savedYears+' yrs, '+formatLakh(pp.savedInterest)+'</strong>.';
  ps+='</div>';el('perspectiveBlock').innerHTML=ps;el('perspectiveBlock').style.display='block';

  // Show results, hide placeholder
  el('placeholderPanel').style.display='none';
  el('resultsPanel').style.display='block';
  if(window.innerWidth<=720)el('resultsPanel').scrollIntoView({behavior:'smooth',block:'start'});
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