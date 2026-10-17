// Fixed 2026/27 UEFA league-phase standings for UCL, UEL and UECL.
// Participant lists come from extra-ranked.js; synchronized ESPN fixtures supply scores.
(function(){
  const PHASES={
    ucl:{start:"2026-09-08",end:"2027-01-27",sourceLeague:"uefa.champions",label:"Champions League"},
    uel:{start:"2026-09-16",end:"2027-01-28",sourceLeague:"uefa.europa",label:"Europa League"},
    uecl:{start:"2026-10-15",end:"2026-12-17",sourceLeague:"uefa.europa.conf",label:"Conference League"}
  };

  function teamsFor(c){return window.UEFA_LEAGUE_PHASE_TEAMS?.[c]||[]}

  function phaseFixtures(c){
    const p=PHASES[c];if(!p)return[];
    return allFixtures().filter(f=>
      f.competition===c&&f.date>=p.start&&f.date<=p.end&&
      (f.sourceLeague===p.sourceLeague||String(f.id||"").startsWith("custom|"))
    );
  }

  function calculateStats(c){
    const teams=teamsFor(c),stats=Object.fromEntries(teams.map(t=>[t,{mp:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]));
    const allowed=new Set(teams);
    for(const f of chronological(phaseFixtures(c))){
      const home=canonicalName(f.home),away=canonicalName(f.away),score=scoreValue(f);
      if(!score||!allowed.has(home)||!allowed.has(away))continue;
      const [hg,ag]=score,H=stats[home],A=stats[away];
      H.mp++;A.mp++;H.gf+=hg;H.ga+=ag;A.gf+=ag;A.ga+=hg;
      if(hg>ag){H.w++;A.l++;H.pts+=3}
      else if(hg<ag){A.w++;H.l++;A.pts+=3}
      else{H.d++;A.d++;H.pts++;A.pts++}
    }
    return stats;
  }

  function renderUefaLeagueStandings(c){
    const root=document.querySelector(`#${c}-standings`),teams=teamsFor(c),phase=PHASES[c];
    if(!root||!phase||!teams.length)return;
    const calc=recalc(),stats=calculateStats(c),world=ordered(ALL_TRACKED,calc.ratings);
    const worldPos=Object.fromEntries(world.map((t,i)=>[t,i+1]));
    const rows=[...teams].sort((a,b)=>{
      const A=stats[a],B=stats[b],gdA=A.gf-A.ga,gdB=B.gf-B.ga;
      return B.pts-A.pts||gdB-gdA||B.gf-A.gf||B.w-A.w||
        (Number(calc.ratings[b])||0)-(Number(calc.ratings[a])||0)||a.localeCompare(b,"en");
    });

    root.innerHTML=`<div class="card">
      <div class="section-title"><h3>${phase.label} league phase standings</h3><span>${rows.length} clubs</span></div>
      <p>League-phase matches only. Synced final scores update this table and every club's global coefficient automatically.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th># World</th><th>Club</th><th>Rating</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody id="${c}LeagueBody"></tbody>
      </table></div>
    </div>`;

    const body=root.querySelector(`#${c}LeagueBody`);
    rows.forEach((t,i)=>{
      const s=stats[t],gd=s.gf-s.ga,tr=document.createElement("tr");
      tr.innerHTML=`<td>${i+1}</td><td>${worldPos[t]??"—"}</td><td><button class="club-link">${t}</button></td><td><b>${fmt(calc.ratings[t]??startsMap()[t])}</b></td><td>${s.mp}</td><td>${s.w}</td><td>${s.d}</td><td>${s.l}</td><td>${gd>0?"+":""}${gd}</td><td><b>${s.pts}</b></td>`;
      tr.querySelector(".club-link").onclick=()=>openClub(t);
      body.appendChild(tr);
    });
  }

  const previousRenderCompetition=renderCompetition;
  renderCompetition=function(c){
    const active=document.querySelector(`#main-${c} [data-sub].active`)?.dataset.sub?.split("|")[1];
    if(PHASES[c]&&active==="standings")return renderUefaLeagueStandings(c);
    return previousRenderCompetition(c);
  };

  const previousRenderMatchList=renderMatchList;
  renderMatchList=function(c,...args){
    const out=previousRenderMatchList(c,...args);
    if(PHASES[c]&&document.querySelector(`#main-${c} [data-sub="${c}|standings"]`)?.classList.contains("active")){
      renderUefaLeagueStandings(c);
    }
    return out;
  };

  window.renderUefaLeagueStandings=renderUefaLeagueStandings;
})();