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
  var stEmiDisplay=isFinite(stEmiR)?formatPct(stEmiR):'∞';
  var stEmiClass=isFinite(stEmiR)?emiColor(stEmiR,inp.incomeType):'bad';
  var allFlags=buildFlags(ctx);

  // ═══ SECTION 1: HERO ═══
  var hSel=el('heroScore');
  hSel.className='hero-score v-'+verdict;
  animateCounter(hSel,score,1200);

  var htag=el('heroVerdictTag');
  htag.textContent=verdict;
  htag.className='hero-tag v-'+verdict;

  var hv=el('heroVerdict');
  hv.textContent=verdictText(verdict);
  hv.className='hero-verdict v-'+verdict;

  el('heroOneliner').textContent=decSt;
  el('heroTruth').textContent=generateCoreTruth(ctx);

  var heroEl=el('hero');
  heroEl.className='v-'+verdict;

  // ═══ SECTION 2: SAFETY BAR ═══
  el('sbScore').textContent=score+' / 100';
  var sbF=el('sbFill'),sbC=el('sbCursor');
  var barColor=verdict==='SAFE'?'var(--color-safe)':verdict==='MODERATE'?'var(--color-moderate)':verdict==='RISKY'?'#fbbf24':'var(--color-danger)';
  sbF.style.background=barColor;
  setTimeout(function(){sbF.style.width=score+'%';sbC.style.left=score+'%';},300);
  var hint='';
  if(verdict==='SAFE') hint='In the safe zone. Consider prepayments to reduce total interest cost.';
  else if(verdict==='MODERATE') hint='Score '+(70-score)+' points more to reach SAFE. '+(delta&&delta.length>0?delta[0].type+' is your fastest path.':'');
  else if(verdict==='RISKY') hint='Significant changes needed. Start with '+(delta&&delta.length>0?delta[0].type:'reducing loan or building savings')+'.';
  else hint='Immediate action required. Multiple critical risk factors are active.';
  el('sbHint').textContent=hint;

  // ═══ SECTION 3: CORE METRICS ═══
  var ttf=zS?'0 mo':(isFinite(realSurv)?'~'+Math.floor(realSurv)+' mo':'∞');

  var bufStr=isFinite(base.buffer)?base.buffer.toFixed(1)+' mo':'\u221e';
  var cmN=el('cmNet');
  cmN.textContent=bufStr;
  cmN.className='mc-value '+bufferColor(base.buffer);
  el('cmNetMeaning').textContent=bufferToMeaning(base.buffer,iShk.buffer);

  var cmSv=el('cmSurvival');
  cmSv.textContent=ttf;
  cmSv.className='mc-value '+(zS?'bad':survivalColor(realSurv));
  el('cmSurvivalMeaning').textContent=survivalToMeaning(realSurv,zS);

  var stEmiDispStr=isFinite(stEmiR)?formatPct(stEmiR):'∞';
  var cmE=el('cmEmi');
  cmE.textContent=stEmiDispStr;
  cmE.className='mc-value '+stEmiClass;
  el('cmEmiMeaning').textContent=emiToMeaning(stEmiR,inp.incomeType);

  el('expand-net').innerHTML=buildBufferExpand(base,iShk,shP);
  el('expand-survival').innerHTML=buildSurvivalExpand(ctx,ttf,theoSurv,realSurv,shP);
  el('expand-emi').innerHTML=buildEmiExpand(base,iShk,inp,stEmiR,stEmiDispStr,stEmiClass,elOk,elig);

  // ═══ SECTION 4: WORST CASE ═══
  el('wcShockLabel').textContent=shP+'% income drop scenario';

  var wg='';
  wg+='<div class="wc-stat"><div class="wcs-val">'+formatRupees(iShk.shockedIncome)+'</div><div class="wcs-label">Shocked Income</div><div class="wcs-delta">from '+formatRupees(inp.income)+'</div></div>';
  wg+=iShk.deficit>0
    ?'<div class="wc-stat"><div class="wcs-val bad">\u2212'+formatRupees(iShk.deficit)+'</div><div class="wcs-label">Monthly Gap</div><div class="wcs-delta">shortfall per month</div></div>'
    :'<div class="wc-stat"><div class="wcs-val ok">Surplus</div><div class="wcs-label">Monthly Gap</div><div class="wcs-delta">still positive</div></div>';
  var survTxt=zS?'Instant':(isFinite(realSurv)?'~'+Math.floor(realSurv)+' mo':'Indefinite');
  var survCls2=zS?'bad':(isFinite(realSurv)&&realSurv<6?'bad':isFinite(realSurv)&&realSurv<12?'warn':'ok');
  wg+='<div class="wc-stat"><div class="wcs-val '+survCls2+'">'+survTxt+'</div><div class="wcs-label">Runway</div><div class="wcs-delta">realistic estimate</div></div>';
  wg+='<div class="wc-stat"><div class="wcs-val '+stEmiClass+'">'+stEmiDispStr+'</div><div class="wcs-label">Stressed EMI</div><div class="wcs-delta">of shocked income</div></div>';
  el('wcStatsGrid').innerHTML=wg;

  var impacts=generateLifeImpact(ctx);
  el('wcLifeImpact').innerHTML=impacts.map(function(t){return'<div class="wc-life-item">'+t+'</div>';}).join('');

  // ═══ SECTION 5: TOP RISKS ═══
  var topRisks=pickTopRisks(allFlags,4);
  if(topRisks.length>0){
    el('topRisksTags').innerHTML=topRisks.map(function(f){return'<span class="risk-tag risk-'+f.level+'">'+f.text+'</span>';}).join('');
    el('top-risks').style.display='block';
  } else {
    el('topRisksTags').innerHTML='<span class="risk-tag risk-ok">No critical risks</span>';
    el('top-risks').style.display='block';
  }

  // ═══ SECTION 6: DECISION DELTA ═══
  el('ddHeader').textContent='To become '+(verdict==='SAFE'?'SAFER':'SAFE');
  el('ddSubtitle').textContent=delta&&delta.length>0
    ?'Ranked by impact — implement in order for fastest improvement'
    :'Your finances are healthy. Consider these optimizations.';
  var ddH='';
  if(delta&&delta.length>0){
    delta.slice(0,3).forEach(function(d,i){
      var isPrimary=i===0;
      ddH+='<div class="dd-option'+(isPrimary?' dd-primary':'')+'"><div class="dd-rank-col">'
        +(isPrimary?'<div class="dd-star">\u2605</div>':'')
        +'<div class="dd-num">'+(i+1)+'</div></div>'
        +'<div class="dd-body"><div class="dd-type">'
        +(isPrimary?'<span class="dd-primary-tag">Best Option</span>':'')
        +d.type+'</div><div class="dd-message">\u2192 '+d.message+'</div></div></div>';
    });
  } else {
    ddH='<div class="dd-option dd-primary"><div class="dd-rank-col"><div class="dd-star">\u2605</div><div class="dd-num">1</div></div><div class="dd-body"><div class="dd-type"><span class="dd-primary-tag">Optimize</span>Consider prepayments</div><div class="dd-message">\u2192 Reduces total interest and shortens loan tenure</div></div></div>';
  }
  el('ddOptions').innerHTML=ddH;

  // ═══ COMPAT / EXPANDABLE TARGETS ═══
  el('scoreBlock').innerHTML='<div class="score-hero-ring v-'+verdict+'">'+score+'</div>';
  var ban=el('decisionBanner');
  ban.className='decision-banner '+verdict.toLowerCase();
  ban.textContent=verdictText(verdict);
  var fE=el('flagsBlock');
  if(allFlags.length>0) fE.innerHTML=allFlags.map(function(f){return'<span class="risk-flag '+f.level+'">'+f.text+'</span>';}).join('');

  el('impactHeader').innerHTML='Under '+shP+'% income shock';
  function tile(l,v,vc,sub,sc){return'<div class="impact-tile"><div class="tile-label">'+l+'</div><div class="tile-value '+vc+'">'+v+'</div><div class="tile-change '+sc+'">'+sub+'</div></div>';}
  var ig='',ttfSub=isFinite(theoSurv)&&theoSurv!==realSurv?'theoretical: '+Math.round(theoSurv)+'mo':'';
  ig+=tile('EMI Ratio',stEmiDispStr,stEmiClass,'was '+formatPct(base.emiRatio),'neg');
  ig+=tile('Monthly Net',formatRupees(iShk.net),iShk.net>=0?'ok':'bad','was '+formatRupees(base.net),iShk.net<base.net?'neg':'pos');
  ig+=tile('Time to Failure',ttf,zS?'bad':survivalColor(realSurv),ttfSub,'neu');
  ig+=tile('Buffer',(isFinite(iShk.buffer)?iShk.buffer.toFixed(1):'∞'),bufferColor(iShk.buffer),'was '+(isFinite(base.buffer)?base.buffer.toFixed(1):'∞'),iShk.buffer<base.buffer?'neg':'neu');
  el('impactGrid').innerHTML=ig;

  function sRow(l,d,r){return'<div class="scenario-row"><div><span class="scenario-label">'+l+'</span><div class="scenario-detail">'+d+'</div></div><span class="scenario-value '+r.c+'">'+r.t+'</span></div>';}
  var sh='<div class="block-label">All Stress Scenarios</div>';
  var shNote=iShk.wasOverridden?' (entered '+iShk.userShock+'%, floor '+shP+'%)':'';
  sh+=sRow('S1 \u00b7 Income \u2212'+shP+'%'+shNote,'Income \u2192 '+formatRupees(iShk.shockedIncome),
    iShk.deficit===0?{t:'Surplus '+formatRupees(iShk.net),c:'ok'}:(zS?{t:'INSTANT DEFAULT',c:'bad'}:{t:'~'+Math.floor(realSurv)+'mo \u00b7 '+formatRupees(iShk.deficit)+'/mo',c:survivalColor(realSurv)}));
  if(rShk){if(rShk.negAmort)sh+=sRow('S2 \u00b7 Rate +2% \u2192 '+rShk.shockedRate.toFixed(1)+'%','Int '+formatRupees(rShk.monthlyInterest)+' > EMI '+formatRupees(inp.newEMI),{t:'DEBT TRAP',c:'bad'});
  else{var tn2=isFinite(rShk.tenureDelta)&&rShk.tenureDelta>0?' \u00b7 +'+rShk.tenureDelta+'mo':'';sh+=sRow('S2 \u00b7 Rate +2%','EMI +'+formatRupees(rShk.emiDelta),{t:'Ratio '+formatPct(rShk.emiRatio)+tn2,c:emiColor(rShk.emiRatio,inp.incomeType)});}}
  else sh+=sRow('S2 \u00b7 Rate +2%','Fixed',{t:'N/A',c:'na'});
  sh+=sRow('S3 \u00b7 Expense 1.5\u00d7','Essential \u2192 '+formatRupees(eShk.essential)+' (+'+formatRupees(eShk.expenseDelta)+')',{t:'Buffer '+(isFinite(eShk.buffer)?eShk.buffer.toFixed(1):'\u221e')+'mo',c:bufferColor(eShk.buffer)});
  var cSvv=comb.survival,cReal=isFinite(cSvv)?realisticSurvival(cSvv,inp.incomeType,inp.dependents):Infinity;
  sh+=sRow('S4 \u00b7 Combined','Income \u2212'+comb.shockPct+'% + 1.5\u00d7 exp',comb.deficit===0?{t:'No deficit',c:'ok'}:{t:'~'+Math.floor(cReal)+'mo \u00b7 '+formatRupees(comb.deficit)+'/mo',c:survivalColor(cReal)});
  if(rNrm&&rNrm.applicable){if(rNrm.aboveNorm)sh+=sRow('S5 \u00b7 Rate Norm \u2193','Your '+inp.rate+'% > avg',{t:'EMI drops '+formatRupees(Math.abs(rNrm.normDelta)),c:'positive'});
  else sh+=sRow('S5 \u00b7 Rate Norm \u2191','To avg '+rNrm.normRate.toFixed(1)+'%',{t:'EMI +'+formatRupees(rNrm.normDelta)+' \u00b7 '+formatPct(rNrm.normRatio),c:emiColor(rNrm.normRatio,inp.incomeType)});}
  if(cross.crossoverYear)sh+=sRow('S6 \u00b7 Inflation Yr '+cross.crossoverYear,'Expenses outpace income',{t:'Net negative',c:'bad'});
  else{var lr=cross.table[cross.table.length-1];sh+=sRow('S6 \u00b7 Inflation','Through yr '+cross.years,{t:'Net +ve '+formatRupees(lr.net),c:'ok'});}
  el('scenarioBlock').innerHTML=sh;

  el('analysisText').innerHTML=buildAnalysisHTML(ctx);

  var rB=el('recoveryBlock');
  if(rec){rB.style.display='block';var fc='f-'+rec.feasibility.replace(/[- ]/g,'');
    rB.innerHTML='<div class="recovery-title">Realistic Survival Plan</div><div class="recovery-feasibility '+fc+'">'+rec.feasibility.toUpperCase().replace(/-/g,' ')+'</div><div class="recovery-steps">Deficit: '+formatRupees(rec.needed)+'/mo<br>'+rec.note+'</div>';}
  else rB.style.display='none';

  var recs=buildRecommendations(ctx);
  el('recoList').innerHTML=recs.map(function(x){return'<li>'+x+'</li>';}).join('');

  var ddB=el('deltaBlock');
  if(delta&&delta.length>0){ddB.style.display='block';var dH='<div class="block-label">What to Change</div>';
    delta.slice(0,4).forEach(function(d,i){dH+='<div class="scenario-row"><div><span class="scenario-label" style="color:var(--color-accent)">'+(i+1)+'. '+d.type+'</span></div><span class="scenario-value">'+d.message+'</span></div>';});
    ddB.innerHTML=dH;}
  else ddB.style.display='none';

  var pB=el('prepayBlock');
  if(pp){pB.style.display='block';pB.innerHTML='<div class="block-label">Prepayment Impact</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7">Annual: '+formatRupees(pp.annualPrepay)+' \u00b7 Tenure: '+pp.origTenure+' \u2192 '+pp.newTenure+'mo (\u2212'+pp.savedYears+'yrs) \u00b7 Saved: <strong style="color:var(--color-safe)">'+formatLakh(pp.savedInterest)+'</strong></div>';}
  else{if(ctx.interestRatio>.7&&base.net>0){var sug=Math.round(base.net*12*.2);var sSim=simulatePrepayment(inp.loanAmount,inp.rate,inp.tenure,sug);
    if(sSim&&sSim.savedMonths>6){pB.style.display='block';pB.innerHTML='<div class="block-label">Prepayment Suggestion</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7">Prepay '+formatRupees(sug)+'/yr (20% surplus): saves '+sSim.savedYears+' years, '+formatLakh(sSim.savedInterest)+' interest.</div>';}
    else pB.style.display='none';}
  else pB.style.display='none';}

  var cB=el('crossoverBlock');
  cB.innerHTML='<div class="rp-graph-title">Inflation Crossover</div><div class="rp-graph-sub">Income: 7%\u21925%\u21923%/yr growth \u00b7 Expenses: 6%/yr \u00b7 EMI held constant</div>'+buildCrossoverSVG(cross);
  cB.style.display='block';

  el('baselineRef').innerHTML='<div class="ref-label">Current state (before stress)</div><div class="baseline-grid"><div class="bg-item">EMI: <strong>'+formatPct(base.emiRatio)+'</strong></div><div class="bg-item">Residual: <strong>'+formatRupees(base.residual)+'</strong></div><div class="bg-item">Buffer: <strong>'+(isFinite(base.buffer)?base.buffer.toFixed(1):'\u221e')+'mo</strong></div><div class="bg-item">Net: <strong>'+formatRupees(base.net)+'</strong></div></div>';

  var lti=ctx.lti;
  var eH='<div class="block-label">Bank Eligibility</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7">';
  eH+='Bank max EMI: <strong>'+formatRupees(elig.maxEMI)+'</strong> \u00b7 Yours: <strong style="color:var(--color-'+(elOk?'safe':'danger')+')">'+formatRupees(inp.newEMI)+'</strong>';
  if(!elOk)eH+=' <span style="color:var(--color-danger)">exceeds by '+formatRupees(inp.newEMI-elig.maxEMI)+'</span>';
  eH+='<br>Max eligible: '+formatLakh(elig.maxLoan)+' \u00b7 LTI: <strong>'+lti.toFixed(1)+'\u00d7</strong>';
  if(ltv)eH+=' \u00b7 LTV: <strong style="color:var(--color-'+(ltv.compliant?'safe':'danger')+')">'+formatPct(ltv.ltv)+'</strong>/'+formatPct(ltv.maxLTV);
  eH+='<br>Usable savings: <strong>'+formatRupees(inp.savings)+'</strong>'+(ctx.totalRawSavings>inp.savings*1.3?' (from '+formatRupees(ctx.totalRawSavings)+' \u2014 liquidity adjusted)':'');
  eH+='</div>';el('eligBlock').innerHTML=eH;

  if(trend.length>0){el('trendBlock').innerHTML='<div class="rp-graph-title">EMI Burden Over Time</div><div class="rp-graph-sub">How EMI burden eases as income grows over the loan tenure</div>'+buildTrendSVG(trend,inp.incomeType);el('trendBlock').style.display='block';}
  else el('trendBlock').style.display='none';

  var bp=[];
  bp.push({k:'EMI vs bank limit',v:formatRupees(inp.newEMI)+' / '+formatRupees(elig.maxEMI),c:elOk?'':'text-bad'});
  var safeInc=base.outflow/(1-shP/100);
  bp.push({k:'Income for shock',v:formatRupees(safeInc),c:inp.income<safeInc?'text-bad':'text-ok'});
  if(isFinite(realSurv)&&iShk.deficit>0)bp.push({k:'Realistic failure',v:'~'+Math.floor(realSurv)+' months',c:realSurv<6?'text-bad':realSurv<12?'text-warn':'text-ok'});
  el('breakpointRows').innerHTML=bp.map(function(b){return'<div class="breakpoint-row"><span class="breakpoint-key">'+b.k+'</span><span class="breakpoint-val '+b.c+'">'+b.v+'</span></div>';}).join('');

  var yI=inp.newEMI>0?(inp.newEMI*inp.tenure)/(inp.income*12):0;
  var ps='<div class="block-label">Perspective</div><div style="font-family:var(--font-mono);font-size:11px;line-height:1.7;color:var(--color-muted)">';
  if(yI>0){ps+='Committing <strong style="color:var(--color-text)">'+yI.toFixed(1)+' years</strong> of income. Total: <strong>'+formatLakh(inp.newEMI*inp.tenure)+'</strong> ('+(1+ctx.interestRatio).toFixed(1)+'\u00d7 loan).';
    if(ctx.interestRatio>1)ps+=' <span style="color:var(--color-danger)">Interest exceeds principal.</span>';
    if(pp&&pp.savedMonths>12)ps+='<br>Prepayment saves <strong style="color:var(--color-safe)">'+pp.savedYears+' yrs, '+formatLakh(pp.savedInterest)+'</strong>.';}
  ps+='</div>';el('perspectiveBlock').innerHTML=ps;

  // ═══ INTERACTIONS ═══
  document.querySelectorAll('.metric-card').forEach(function(card){
    card.onclick=function(){
      var id='expand-'+card.dataset.expand,detailEl=el(id);
      if(!detailEl) return;
      var isOpen=detailEl.style.display!=='none';
      ['expand-net','expand-survival','expand-emi'].forEach(function(did){var d=el(did);if(d)d.style.display='none';});
      document.querySelectorAll('.metric-card').forEach(function(c){c.classList.remove('active');});
      if(!isOpen){detailEl.style.display='block';card.classList.add('active');}
    };
  });
  var expBtn=el('expandToggleBtn');
  if(expBtn){expBtn.onclick=function(){
    var content=el('expandContent'),arrow=el('expandArrow');
    if(content.style.display==='none'){content.style.display='block';arrow.textContent='\u2191';}
    else{content.style.display='none';arrow.textContent='\u2193';}
  };}

  el('placeholderPanel').style.display='none';
  el('inputPanel').style.display='none';
  el('resultsPanel').style.display='block';
  var cont=document.querySelector('.container');
  cont.classList.remove('wide');
  cont.classList.add('results-full');
  el('resultsPanel').scrollIntoView({behavior:'smooth',block:'start'});
  window._ldeCtx=ctx;
  initSimSliders(ctx);
}

/** Animated number counter */
function animateCounter(domEl,target,duration){
  var startTime=null;
  domEl.textContent='0';
  function step(ts){
    if(!startTime) startTime=ts;
    var p=Math.min((ts-startTime)/duration,1);
    var e=1-Math.pow(1-p,3);
    domEl.textContent=Math.round(e*target);
    if(p<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Safety Buffer meaning */
function bufferToMeaning(buf,shkBuf){
  if(!isFinite(buf)||buf>36) return 'Excellent \u2014 savings far exceed risk horizon';
  if(buf>=12) return 'Good buffer \u2014 12+ months of expenses covered';
  if(buf>=6)  return 'Adequate \u2014 build toward 12 months for safety';
  if(buf>=3)  return 'Thin \u2014 vulnerable to income disruption';
  return 'Critical \u2014 less than 3 months of expenses covered';
}

/** Buffer expand panel (replaces net expand for card 1) */
function buildBufferExpand(base,iShk,shP){
  var bBase=isFinite(base.buffer)?base.buffer.toFixed(1)+' mo':'\u221e';
  var bShk=isFinite(iShk.buffer)?iShk.buffer.toFixed(1)+' mo':'\u221e';
  var approxSav=isFinite(base.buffer)&&base.outflow>0?(base.buffer*base.outflow):null;
  return '<div class="ep-grid">'
    +'<div class="ep-item"><span class="ep-l">Current safety buffer</span><span class="ep-v '+bufferColor(base.buffer)+'">'+bBase+'</span></div>'
    +'<div class="ep-item"><span class="ep-l">Under '+shP+'% income shock</span><span class="ep-v '+bufferColor(iShk.buffer)+'">'+bShk+'</span></div>'
    +'<div class="ep-item"><span class="ep-l">Monthly outflow (baseline)</span><span class="ep-v">'+formatRupees(base.outflow)+'</span></div>'
    +(approxSav?'<div class="ep-item"><span class="ep-l">Usable savings</span><span class="ep-v">'+formatRupees(approxSav)+'</span></div>':'')
    +'</div><div class="ep-why">Buffer = usable savings \u00f7 monthly outflow. Target 12+ months. Under 3 months is critical \u2014 any disruption triggers a cash crisis within one quarter.</div>';
}

/** Simulate score proxy — directional only, not exact */
function computeSimScore(adjFOIR,adjBuf,adjTTF){
  var s=100;
  var fp=adjFOIR*100;
  if(fp>70) s-=45; else if(fp>60) s-=35; else if(fp>50) s-=25;
  else if(fp>45) s-=15; else if(fp>35) s-=5; else if(fp<=25) s+=5;
  var buf=isFinite(adjBuf)?adjBuf:99;
  if(buf<1) s-=35; else if(buf<3) s-=20; else if(buf<6) s-=10;
  else if(buf<12) s+=0; else s+=5;
  var ttf=isFinite(adjTTF)?adjTTF:99;
  if(ttf<1) s-=25; else if(ttf<3) s-=15; else if(ttf<6) s-=5;
  else if(ttf>=12) s+=5;
  return Math.max(0,Math.min(100,Math.round(s)));
}

/** Initialize simulation sliders */
function initSimSliders(ctx){
  var inp=ctx.inp,base=ctx.base;
  var isNew=(inp.newEMI>0);
  var shockPct=ctx.incomeShock.shockPct;

  var loanWrap=el('simLoanWrap');
  if(loanWrap) loanWrap.style.display=isNew?'flex':'none';

  var sLoan=el('simLoan'),sSav=el('simSavings'),sInc=el('simIncome');
  if(!sLoan||!sSav||!sInc) return;

  // Set ranges
  var la=inp.loanAmount||0;
  sLoan.min=Math.round(la*0.3/10000)*10000;
  sLoan.max=Math.round(la*1.8/10000)*10000||5000000;
  sLoan.step=Math.max(10000,Math.round(la*0.02/10000)*10000);
  sLoan.value=la;

  var sv=inp.savings||0;
  sSav.min=0;
  sSav.max=Math.round(Math.max(sv*2.5,300000)/10000)*10000;
  sSav.step=Math.max(10000,Math.round(sv*0.04/10000)*10000)||50000;
  sSav.value=sv;

  var inc=inp.income||0;
  sInc.min=Math.round(inc*0.4/1000)*1000;
  sInc.max=Math.round(inc*2/1000)*1000||200000;
  sInc.step=Math.max(1000,Math.round(inc*0.02/1000)*1000);
  sInc.value=inc;

  function fmtK(n){return n>=100000?'\u20b9'+(n/100000).toFixed(1)+'L':'\u20b9'+Math.round(n/1000)+'K';}

  function update(){
    var adjLoan=isNew?parseFloat(sLoan.value)||0:la;
    var adjSav=parseFloat(sSav.value)||0;
    var adjInc=parseFloat(sInc.value)||1;

    if(el('simLoanVal')) el('simLoanVal').textContent=fmtK(adjLoan);
    if(el('simSavingsVal')) el('simSavingsVal').textContent=fmtK(adjSav);
    if(el('simIncomeVal')) el('simIncomeVal').textContent=fmtK(adjInc);

    // Compute adjusted EMI for new loan
    var adjEMI=0;
    if(isNew&&adjLoan>0&&inp.rate>0&&inp.tenure>0){
      var r=(inp.rate/12)/100;
      adjEMI=adjLoan*r*Math.pow(1+r,inp.tenure)/(Math.pow(1+r,inp.tenure)-1);
    }
    // Replace newEMI in outflow, keep rest constant
    var adjOutflow=adjEMI+(base.outflow-(inp.newEMI||0));
    adjOutflow=Math.max(adjOutflow,1);
    var adjFOIR=adjOutflow/adjInc;
    var adjBuf=adjSav/adjOutflow;
    var shockInc=adjInc*(1-shockPct/100);
    var shockNet=shockInc-adjOutflow;
    var adjTTF=shockNet>=0?Infinity:(adjSav>0?adjSav/Math.abs(shockNet):0);

    var foirPct=Math.round(adjFOIR*100);
    var origFoir=Math.round(base.emiRatio*100);
    var foirDelta=foirPct-origFoir;
    var foirCls=adjFOIR<=0.4?'ok':adjFOIR<=0.5?'warn':'bad';

    var bufStr=isFinite(adjBuf)?adjBuf.toFixed(1)+' mo':'\u221e';
    var bufCls=bufferColor(adjBuf);

    var ttfStr=(!isFinite(adjTTF)||adjTTF>36)?'Stable':(adjTTF<1?'< 1 mo':'~'+Math.floor(adjTTF)+' mo');
    var ttfCls=(!isFinite(adjTTF)||adjTTF>=12)?'ok':(adjTTF>=6?'warn':'bad');

    var simScore=computeSimScore(adjFOIR,adjBuf,adjTTF);
    var origScore=ctx.score;
    var sdelta=simScore-origScore;
    var sdeltaStr=(sdelta>0?'+':'')+sdelta;
    var sdeltaCls=sdelta>5?'ok':sdelta<-5?'bad':'muted';
    var sScoreCls=simScore>=70?'ok':simScore>=50?'warn':'bad';

    var liveEl=el('simLiveMetrics');
    if(!liveEl) return;
    liveEl.innerHTML=
      '<div class="sim-badge"><div class="sim-badge-val '+foirCls+'">'+foirPct+'%</div>'
      +'<div class="sim-badge-label">EMI Ratio</div>'
      +(foirDelta!==0?'<div class="sim-badge-delta '+(foirDelta>0?'bad':'ok')+'">'+(foirDelta>0?'+':'')+foirDelta+'%p</div>':'')
      +'</div>'
      +'<div class="sim-badge"><div class="sim-badge-val '+bufCls+'">'+bufStr+'</div>'
      +'<div class="sim-badge-label">Safety Buffer</div>'
      +'</div>'
      +'<div class="sim-badge"><div class="sim-badge-val '+ttfCls+'">'+ttfStr+'</div>'
      +'<div class="sim-badge-label">Time to Failure</div>'
      +'</div>'
      +'<div class="sim-badge sim-score-badge"><div class="sim-badge-val '+sScoreCls+'">'+simScore+'</div>'
      +'<div class="sim-badge-label">Sim Score</div>'
      +'<div class="sim-badge-delta '+sdeltaCls+'">'+sdeltaStr+'</div>'
      +'</div>';
  }

  sLoan.addEventListener('input',update);
  sSav.addEventListener('input',update);
  sInc.addEventListener('input',update);

  var rBtn=el('simReset');
  if(rBtn){rBtn.onclick=function(){sLoan.value=la;sSav.value=sv;sInc.value=inc;update();};}

  update();
}

/** Core Truth — brutally honest behavioral insight */
function generateCoreTruth(ctx){
  var base=ctx.base,inp=ctx.inp,iShk=ctx.incomeShock;
  var verdict=ctx.verdict,emiPct=Math.round(base.emiRatio*100);
  var realSurv=ctx.realisticSurvival,zS=ctx.zeroSavings;
  if(verdict==='DANGEROUS'){
    if(base.deficit>0) return 'Your outflow already exceeds income before any shock. This is not a future risk \u2014 it is a current one. The loan is not viable at your current income.';
    if(zS) return 'Any income disruption triggers immediate default \u2014 you have no savings buffer. The math works today, but a single event breaks it.';
    return 'EMI at '+emiPct+'% leaves almost nothing for life. Under stress, finances collapse within months. This is high-risk territory.';
  }
  if(verdict==='RISKY'){
    if(isFinite(realSurv)&&realSurv<6) return 'You can manage payments today. But if income drops, savings last only ~'+Math.floor(realSurv)+' months. The gap between stable and struggling is narrow.';
    return emiPct+'% of your income is locked into EMI. You are one unexpected event away from financial strain. This works \u2014 but with limited room.';
  }
  if(verdict==='MODERATE') return 'You are in a manageable position, not a comfortable one. '+emiPct+'% EMI is within limits, but your real safety comes from keeping your savings buffer strong and income stable.';
  if(emiPct<30) return 'Strong financial position. EMI at '+emiPct+'% leaves real breathing room. Your buffer absorbs shocks well. Focus on prepayments to cut long-term interest.';
  return 'You can afford this loan and your finances are resilient. EMI is controlled at '+emiPct+'%. Continue building your buffer as a priority.';
}

/** Life impact bullets for worst case */
function generateLifeImpact(ctx){
  var items=[],base=ctx.base,inp=ctx.inp,iShk=ctx.incomeShock;
  var realSurv=ctx.realisticSurvival,emiPct=Math.round(base.emiRatio*100);
  if(ctx.zeroSavings) items.push('Any single month of missed income creates an immediate crisis');
  else if(isFinite(realSurv)&&realSurv<6) items.push('No flexibility to switch jobs or take a salary cut');
  else if(isFinite(realSurv)&&realSurv<12) items.push('Limited room to take career risks \u2014 runway is short');
  if(emiPct>40) items.push('Unexpected expenses (medical, car, home repair) have almost no buffer');
  if(iShk.deficit>0) items.push('Monthly savings would stop entirely during any income shock');
  if(inp.unsecuredRatio>0.15) items.push('Unsecured debt adds fragility \u2014 pay it off before adding this loan');
  if(ctx.rateShock&&ctx.rateShock.negAmort) items.push('Rate rise creates a debt trap \u2014 debt grows faster than payments');
  if(items.length===0){
    items.push('Your loan structure is sound \u2014 no major lifestyle chokepoints identified');
    items.push('Maintain your buffer and consider regular prepayments');
  }
  return items.slice(0,3);
}

/** Number to meaning — Monthly Net */
function netToMeaning(net,income){
  if(net<0) return 'Negative \u2014 you fall short under stress';
  var pct=Math.round((net/income)*100);
  if(pct<10) return 'Almost nothing left \u2014 very thin margin';
  if(pct<20) return 'Tight margin \u2014 limited shock absorption';
  return 'Positive buffer \u2014 some flexibility remains';
}

/** Number to meaning — Survival */
function survivalToMeaning(realSurv,zS){
  if(zS) return 'Zero buffer \u2014 instant failure on any income drop';
  if(!isFinite(realSurv)) return 'Savings sustain indefinitely \u2014 no failure risk';
  if(realSurv<3) return 'Less than 3 months of runway \u2014 critical';
  if(realSurv<6) return 'Short runway \u2014 high income dependency';
  if(realSurv<12) return 'Moderate runway \u2014 build this number up';
  return 'Good runway \u2014 solid protection against disruption';
}

/** Number to meaning — EMI Ratio */
function emiToMeaning(ratio,incomeType){
  if(!isFinite(ratio)) return 'Cannot compute under current shock';
  var pct=Math.round(ratio*100);
  if(pct<25) return 'Well within safe limits \u2014 healthy';
  if(pct<35) return 'Manageable \u2014 keep your buffer strong';
  if(pct<45) return 'High \u2014 nearly half your income in EMI';
  if(pct<55) return 'Very high \u2014 half your income locked in';
  return 'Critical \u2014 over half your income in EMI';
}

/** Metric expand panel builders */
function buildNetExpand(base,iShk,inp,shP){
  return '<div class="ep-grid">'
    +'<div class="ep-item"><span class="ep-l">Baseline monthly net</span><span class="ep-v">'+formatRupees(base.net)+'</span></div>'
    +'<div class="ep-item"><span class="ep-l">Under '+shP+'% income shock</span><span class="ep-v '+(iShk.net>=0?'ok':'bad')+'">'+formatRupees(iShk.net)+'</span></div>'
    +'<div class="ep-item"><span class="ep-l">Monthly deficit if shocked</span><span class="ep-v '+(iShk.deficit>0?'bad':'ok')+'">'+(iShk.deficit>0?'\u2212'+formatRupees(iShk.deficit):'No deficit')+'</span></div>'
    +'<div class="ep-item"><span class="ep-l">Shocked income</span><span class="ep-v">'+formatRupees(iShk.shockedIncome)+'</span></div>'
    +'</div><div class="ep-why">How much cushion remains after a job disruption. Negative means you draw down savings every month until they run out.</div>';
}

function buildSurvivalExpand(ctx,ttf,theoSurv,realSurv,shP){
  var zS=ctx.zeroSavings,iShk=ctx.incomeShock,inp=ctx.inp;
  return '<div class="ep-grid">'
    +'<div class="ep-item"><span class="ep-l">Realistic survival window</span><span class="ep-v '+(zS?'bad':survivalColor(realSurv))+'">'+ttf+'</span></div>'
    +(isFinite(theoSurv)&&theoSurv!==realSurv?'<div class="ep-item"><span class="ep-l">Theoretical (unadjusted)</span><span class="ep-v">~'+Math.round(theoSurv)+' mo</span></div>':'<div class="ep-item"><span class="ep-l">Adjustment applied</span><span class="ep-v">None needed</span></div>')
    +'<div class="ep-item"><span class="ep-l">Usable savings</span><span class="ep-v">'+formatRupees(inp.savings)+'</span></div>'
    +'<div class="ep-item"><span class="ep-l">Monthly deficit during shock</span><span class="ep-v '+(iShk.deficit>0?'bad':'ok')+'">'+(iShk.deficit>0?formatRupees(iShk.deficit)+'/mo':'None')+'</span></div>'
    +'</div><div class="ep-why">Realistic survival accounts for behavioral inertia \u2014 it is harder to cut spending than the math suggests. Target 12+ months of runway for real safety.</div>';
}

function buildEmiExpand(base,iShk,inp,stEmiR,stEmiDispStr,stEmiClass,elOk,elig){
  return '<div class="ep-grid">'
    +'<div class="ep-item"><span class="ep-l">Baseline EMI ratio</span><span class="ep-v '+emiColor(base.emiRatio,inp.incomeType)+'">'+formatPct(base.emiRatio)+'</span></div>'
    +'<div class="ep-item"><span class="ep-l">Stressed EMI ratio</span><span class="ep-v '+stEmiClass+'">'+stEmiDispStr+'</span></div>'
    +(inp.newEMI>0?'<div class="ep-item"><span class="ep-l">New loan EMI</span><span class="ep-v">'+formatRupees(inp.newEMI)+'</span></div>':'<div class="ep-item"><span class="ep-l">New loan EMI</span><span class="ep-v">None</span></div>')
    +'<div class="ep-item"><span class="ep-l">Bank eligibility limit</span><span class="ep-v '+(elOk?'ok':'bad')+'">'+formatRupees(elig.maxEMI)+' max</span></div>'
    +'</div><div class="ep-why">Banks cap EMI at 40\u201350% of income (FOIR). Above this, approval risk rises and stress becomes dangerous. Target: stay below 35%.</div>';
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
