// Keep Good / Top / Elite adjustments symmetric across both clubs in a match.
// If a tier rule changes one club's gain/loss, the same multiplier is applied
// to the opponent's opposite rating change as well. This keeps the rating pool
// close to zero-sum over time (apart from hard min/max clamps).
(function(){
  function tierAdjustmentFactor(delta,rating){
    if(!delta)return 1;
    const s=state.settings;
    const good=Number(s.goodThreshold),top=Number(s.topThreshold),elite=Number(s.eliteThreshold);
    if(delta>0){
      if(elite>0&&rating>=elite)return Number(s.eliteWinFactor);
      if(top>0&&rating>=top)return Number(s.topWinFactor);
      if(good>0&&rating>=good)return Number(s.goodWinFactor);
      return 1;
    }
    if(elite>0&&rating>=elite)return Number(s.eliteLossFactor);
    if(top>0&&rating>=top)return Number(s.topLossFactor);
    if(good>0&&rating>=good)return Number(s.goodLossFactor);
    return 1;
  }

  // Keep this function available for older diagnostics/UI patches.
  damp=function(delta,rating){return delta*tierAdjustmentFactor(delta,rating)};

  recalc=function(cutoff=null){
    const ratings=startsMap(),
      stats=Object.fromEntries(ALL_TRACKED.map(t=>[t,{g:0,w:0,d:0,l:0,gf:0,ga:0}])),
      domesticStats=clone(stats),details={};
    const other=new Set(otherTeams());

    for(const f of chronological()){
      if(cutoff&&f.date>cutoff)continue;
      const sc=scoreValue(f);if(!sc)continue;
      const [hg,ag]=sc,
        hr=tracked(f.home)||other.has(f.home),
        ar=tracked(f.away)||other.has(f.away);
      if(!hr&&!ar)continue;

      const rh=hr?ratings[f.home]:Number(state.settings.externalRating),
        ra=ar?ratings[f.away]:Number(state.settings.externalRating),
        eh=expectation(rh,ra),ea=1-eh,
        [sh,sa]=scoreOutcome(hg,ag),
        m=marginMultiplier(hg,ag),
        str=strengthFactor(rh,ra,hg,ag),
        cf=compFactor(f.competition),
        rawH=Number(state.settings.k)*(sh-eh)*m*str*cf,
        rawA=Number(state.settings.k)*(sa-ea)*m*str*cf,
        vh=venueFactor(true,hg,ag,rawH),
        va=venueFactor(false,hg,ag,rawA),
        baseH=rawH*vh,
        baseA=rawA*va,
        tierH=hr?tierAdjustmentFactor(baseH,rh):1,
        tierA=ar?tierAdjustmentFactor(baseA,ra):1,
        tierPair=tierH*tierA;

      let dh=hr?baseH*tierPair:0,
        da=ar?baseA*tierPair:0,
        ph=0,pa=0,penTierPair=1;

      const pen=hg===ag?penaltyValue(f):"";
      if(pen==="home"||pen==="away"){
        const hh=pen==="home"?1:0,aa=pen==="home"?0:1,
          [psh,psa]=scoreOutcome(hh,aa),
          pm=Number(state.settings.margin1),
          pst=strengthFactor(rh,ra,hh,aa),
          prh=Number(state.settings.k)*(psh-eh)*pm*pst*cf,
          pra=Number(state.settings.k)*(psa-ea)*pm*pst*cf,
          pbaseH=prh*venueFactor(true,hh,aa,prh),
          pbaseA=pra*venueFactor(false,hh,aa,pra),
          pTierH=hr?tierAdjustmentFactor(pbaseH,rh):1,
          pTierA=ar?tierAdjustmentFactor(pbaseA,ra):1;
        penTierPair=pTierH*pTierA;
        ph=hr?.1*pbaseH*penTierPair:0;
        pa=ar?.1*pbaseA*penTierPair:0;
        dh+=ph;da+=pa;
      }

      const min=Number(state.settings.minRating),max=Number(state.settings.maxRating);
      if(hr)ratings[f.home]=clamp(rh+dh,min,max);
      if(ar)ratings[f.away]=clamp(ra+da,min,max);

      details[f.id]={rh,ra,nh:hr?ratings[f.home]:rh,na:ar?ratings[f.away]:ra,
        dh:hr?ratings[f.home]-rh:0,da:ar?ratings[f.away]-ra:0,
        eh,ea,m,str,cf,vh,va,tierH,tierA,tierPair,pen,penTierPair,ph,pa,hg,ag};

      for(const [team,home] of [[f.home,true],[f.away,false]])if(tracked(team)){
        const s=stats[team],gf=home?hg:ag,ga=home?ag:hg;
        s.g++;s.gf+=gf;s.ga+=ga;gf>ga?s.w++:gf<ga?s.l++:s.d++;
        if(f.competition===teamLeague(team)){
          const d=domesticStats[team];d.g++;d.gf+=gf;d.ga+=ga;gf>ga?d.w++:gf<ga?d.l++:d.d++;
        }
      }
    }
    return{ratings,stats,domesticStats,details};
  };
})();
