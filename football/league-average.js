// Show the current average coefficient of the active domestic league next to its match factor.
(function(){
  function currentLeagueAverage(c){
    if(COMP[c]?.type!=="domestic")return null;
    const teams=TEAMS_BY_LEAGUE[c]||[];
    if(!teams.length)return null;
    const ratings=recalc().ratings;
    const values=teams.map(t=>Number(ratings[t])).filter(Number.isFinite);
    return values.length?values.reduce((sum,v)=>sum+v,0)/values.length:null;
  }

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

  const style=document.createElement("style");
  style.textContent=`
    .competition-head-metrics{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
    .competition-head-metrics>b{background:#0d1c32;border:1px solid var(--line);border-radius:999px;padding:8px 11px;white-space:nowrap}
    .league-average-badge{color:#d9e8ff}
    @media(max-width:620px){.competition-head-metrics{justify-content:flex-start}}
  `;
  document.head.appendChild(style);

  // The shell already exists when this patch loads; update it immediately.
  COMP_ORDER.forEach(updateLeagueHeader);

  // Keep the value live after scores, starting ratings or competition views are re-rendered.
  const oldRenderCompetition=renderCompetition;
  renderCompetition=function(c){const out=oldRenderCompetition(c);updateLeagueHeader(c);return out};

  const oldRenderTeams=renderTeams;
  renderTeams=function(c){const out=oldRenderTeams(c);updateLeagueHeader(c);return out};

  const oldRenderMatchList=renderMatchList;
  renderMatchList=function(c){const out=oldRenderMatchList(c);updateLeagueHeader(c);return out};

  const oldRenderStandingRows=renderStandingRows;
  renderStandingRows=function(c){const out=oldRenderStandingRows(c);updateLeagueHeader(c);return out};
})();
