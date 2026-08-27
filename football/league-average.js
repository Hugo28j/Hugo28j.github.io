// Show current average coefficients in domestic league headers and the World Ranking header.
(function(){
  function averageFor(teams){
    const ratings=recalc().ratings;
    const values=(teams||[]).map(t=>Number(ratings[t])).filter(Number.isFinite);
    return values.length?values.reduce((sum,v)=>sum+v,0)/values.length:null;
  }

  function currentLeagueAverage(c){
    if(COMP[c]?.type!=="domestic")return null;
    return averageFor(TEAMS_BY_LEAGUE[c]||[]);
  }

  function currentWorldAverage(){return averageFor(ALL_TRACKED)}

  function updateLeagueHeader(c){
    const head=document.querySelector(`#main-${c} .page-head`);
    if(!head)return;

    let metrics=head.querySelector(".competition-head-metrics");
    if(!metrics){
      const factor=head.querySelector(":scope > b");
      if(!factor)return;
      metrics=document.createElement("div");
      metrics.className="competition-head-metrics";
      head.appendChild(metrics);
      metrics.appendChild(factor);
    }

    const factor=metrics.querySelector("b:not(.league-average-badge)");
    if(factor)factor.textContent=`×${compFactor(c).toFixed(2)}`;

    if(COMP[c]?.type!=="domestic"){
      metrics.querySelector(".league-average-badge")?.remove();
      return;
    }

    let average=metrics.querySelector(".league-average-badge");
    if(!average){
      average=document.createElement("b");
      average.className="league-average-badge";
      metrics.insertBefore(average,metrics.firstChild);
    }
    const value=currentLeagueAverage(c);
    average.textContent=Number.isFinite(value)?`Avg coefficient ${value.toFixed(2)}`:"Avg coefficient —";
  }

  function updateWorldHeader(){
    const head=document.querySelector("#main-world .page-head");
    if(!head)return;
    let metrics=head.querySelector(".world-head-metrics");
    if(!metrics){
      const clubs=head.querySelector(":scope > b");
      metrics=document.createElement("div");
      metrics.className="world-head-metrics";
      head.appendChild(metrics);
      if(clubs)metrics.appendChild(clubs);
    }
    let average=metrics.querySelector(".world-average-badge");
    if(!average){
      average=document.createElement("b");
      average.className="world-average-badge";
      metrics.insertBefore(average,metrics.firstChild);
    }
    const value=currentWorldAverage();
    average.textContent=Number.isFinite(value)?`Avg coefficient ${value.toFixed(2)}`:"Avg coefficient —";
  }

  const style=document.createElement("style");
  style.textContent=`
    .competition-head-metrics,.world-head-metrics{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
    .competition-head-metrics>b,.world-head-metrics>b{background:#0d1c32;border:1px solid var(--line);border-radius:999px;padding:8px 11px;white-space:nowrap}
    .league-average-badge,.world-average-badge{color:#d9e8ff}
    @media(max-width:620px){.competition-head-metrics,.world-head-metrics{justify-content:flex-start}}
  `;
  document.head.appendChild(style);

  COMP_ORDER.forEach(updateLeagueHeader);
  updateWorldHeader();

  // Keep values live whenever ratings can have changed or a ranking is re-rendered.
  const oldRenderCompetition=renderCompetition;
  renderCompetition=function(c){const out=oldRenderCompetition(c);updateLeagueHeader(c);return out};

  const oldRenderTeams=renderTeams;
  renderTeams=function(c){const out=oldRenderTeams(c);updateLeagueHeader(c);return out};

  const oldRenderMatchList=renderMatchList;
  renderMatchList=function(c){const out=oldRenderMatchList(c);updateLeagueHeader(c);updateWorldHeader();return out};

  const oldRenderStandingRows=renderStandingRows;
  renderStandingRows=function(c){const out=oldRenderStandingRows(c);updateLeagueHeader(c);return out};

  const oldRenderWorld=renderWorld;
  renderWorld=function(){const out=oldRenderWorld();updateWorldHeader();return out};

  const oldRenderWorldRows=renderWorldRows;
  renderWorldRows=function(){const out=oldRenderWorldRows();updateWorldHeader();return out};
})();
