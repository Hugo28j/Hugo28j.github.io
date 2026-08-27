// Champions League 2026/27 league-phase standings.
// The 36 participants are fixed from UEFA's confirmed league-phase line-up.
(function(){
  const UCL_LEAGUE_PHASE_TEAMS=[
    "AEK Athens","Arsenal","Aston Villa","Atlético de Madrid","FC Barcelona","FC Bayern München",
    "Bodø/Glimt","Borussia Dortmund","Club Brugge","Como","Fenerbahçe","Feyenoord",
    "Galatasaray","Internazionale","LASK","RB Leipzig","RC Lens","LOSC Lille",
    "Liverpool","Manchester City","Manchester United","Napoli","Paris Saint-Germain","FC Porto",
    "PSV","Real Betis","Real Madrid","Roma","Sabah FK","Shakhtar Donetsk",
    "Slavia Praha","Slovan Bratislava","Sporting CP","VfB Stuttgart","Viking","Villarreal CF"
  ];
  const PHASE_START="2026-09-08",PHASE_END="2027-01-27";
  window.UCL_LEAGUE_PHASE_TEAMS=UCL_LEAGUE_PHASE_TEAMS;

  // The generic UEFA Teams tab normally derives its clubs from loaded fixtures.
  // League-phase fixtures may not exist yet, so directly qualified clubs would
  // otherwise be missing and their starting rating could not be viewed/edited.
  const relevantTeamsBeforeUclParticipants=relevantTeams;
  relevantTeams=function(c){
    const teams=relevantTeamsBeforeUclParticipants(c);
    if(c!=="ucl")return teams;
    return [...new Set([...UCL_LEAGUE_PHASE_TEAMS,...teams])];
  };

  function ensureUclStandingsUI(){
    const section=document.querySelector("#main-ucl");
    if(!section)return;
    const tabs=section.querySelector(".subtabs");
    if(!tabs)return;

    let button=tabs.querySelector('[data-sub="ucl|standings"]');
    if(!button){
      button=document.createElement("button");
      button.dataset.sub="ucl|standings";
      button.textContent="Standings";
      tabs.appendChild(button);
      button.onclick=()=>{
        section.querySelectorAll("[data-sub]").forEach(x=>x.classList.remove("active"));
        section.querySelectorAll(".subpanel").forEach(x=>x.classList.remove("active"));
        button.classList.add("active");
        const panel=document.querySelector("#ucl-standings");
        if(panel)panel.classList.add("active");
        renderUclLeagueStandings();
      };
    }

    if(!document.querySelector("#ucl-standings")){
      const panel=document.createElement("div");
      panel.id="ucl-standings";
      panel.className="subpanel";
      section.appendChild(panel);
    }
  }

  function leaguePhaseFixtures(){
    return allFixtures().filter(f=>{
      if(f.competition!=="ucl"||!f.date||f.date<PHASE_START||f.date>PHASE_END)return false;
      return f.sourceLeague==="uefa.champions"||String(f.id||"").startsWith("custom|");
    });
  }

  function calculateUclStats(){
    const stats=Object.fromEntries(UCL_LEAGUE_PHASE_TEAMS.map(t=>[t,{mp:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]));
    const allowed=new Set(UCL_LEAGUE_PHASE_TEAMS);
    for(const f of chronological(leaguePhaseFixtures())){
      const home=canonicalName(f.home),away=canonicalName(f.away),score=scoreValue(f);
      if(!score||!allowed.has(home)||!allowed.has(away))continue;
      const [hg,ag]=score,hs=stats[home],as=stats[away];
      hs.mp++;as.mp++;hs.gf+=hg;hs.ga+=ag;as.gf+=ag;as.ga+=hg;
      if(hg>ag){hs.w++;as.l++;hs.pts+=3}
      else if(hg<ag){as.w++;hs.l++;as.pts+=3}
      else{hs.d++;as.d++;hs.pts++;as.pts++}
    }
    return stats;
  }

  function renderUclLeagueStandings(){
    ensureUclStandingsUI();
    const root=document.querySelector("#ucl-standings");
    if(!root)return;

    const calc=recalc(),stats=calculateUclStats(),world=ordered(ALL_TRACKED,calc.ratings);
    const worldPos=Object.fromEntries(world.map((t,i)=>[t,i+1]));
    const rows=[...UCL_LEAGUE_PHASE_TEAMS].sort((a,b)=>{
      const A=stats[a],B=stats[b],gdA=A.gf-A.ga,gdB=B.gf-B.ga;
      return B.pts-A.pts||gdB-gdA||B.gf-A.gf||B.w-A.w||
        (Number(calc.ratings[b])||0)-(Number(calc.ratings[a])||0)||a.localeCompare(b,"en");
    });

    root.innerHTML=`<div class="card">
      <div class="section-title"><h3>Champions League league phase standings</h3><span>36 clubs</span></div>
      <p>Only league-phase matches count here; qualifying results are excluded. Before teams are separated by league-phase results, current coefficient is used as the final ordering tiebreak.</p>
      <div class="table-wrap"><table>
        <thead><tr><th># UCL</th><th># World</th><th>Club</th><th>Rating</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody id="uclLeagueBody"></tbody>
      </table></div>
    </div>`;

    const body=root.querySelector("#uclLeagueBody");
    rows.forEach((t,i)=>{
      const s=stats[t],gd=s.gf-s.ga,tr=document.createElement("tr");
      tr.innerHTML=`<td>${i+1}</td><td>${worldPos[t]??"—"}</td><td><button class="club-link">${t}</button></td><td><b>${fmt(calc.ratings[t]??startsMap()[t])}</b></td><td>${s.mp}</td><td>${s.w}</td><td>${s.d}</td><td>${s.l}</td><td>${gd>0?"+":""}${gd}</td><td><b>${s.pts}</b></td>`;
      tr.querySelector(".club-link").onclick=()=>openClub(t);
      body.appendChild(tr);
    });
  }

  ensureUclStandingsUI();

  const previousRenderCompetition=renderCompetition;
  renderCompetition=function(c){
    ensureUclStandingsUI();
    const active=document.querySelector(`#main-${c} [data-sub].active`)?.dataset.sub?.split("|")[1];
    if(c==="ucl"&&active==="standings")return renderUclLeagueStandings();
    return previousRenderCompetition(c);
  };

  // Keep the table live when a score is edited/refreshed while the standings tab is open.
  const previousRenderMatchList=renderMatchList;
  renderMatchList=function(c){
    const out=previousRenderMatchList(c);
    if(c==="ucl"&&document.querySelector('#main-ucl [data-sub="ucl|standings"]')?.classList.contains("active"))renderUclLeagueStandings();
    return out;
  };
})();
