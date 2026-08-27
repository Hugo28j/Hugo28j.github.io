// UI support for the 10 UEFA clubs promoted into the World Ranking.
(function(){
  const extras=window.EXTRA_RANKED_TEAMS||[];
  const extraSet=new Set(extras);

  function addUefaWorldFilter(){
    const filters=document.querySelector("#leagueFilters");
    if(!filters||filters.querySelector('[data-l="uefa_ranked"]'))return;
    const b=document.createElement("button");
    b.dataset.l="uefa_ranked";
    b.textContent="UEFA ranked";
    b.classList.toggle("active",LEAGUE_FILTER.has("uefa_ranked"));
    b.onclick=()=>{
      LEAGUE_FILTER.has("uefa_ranked")?LEAGUE_FILTER.delete("uefa_ranked"):LEAGUE_FILTER.add("uefa_ranked");
      renderWorld();
    };
    filters.appendChild(b);
  }

  function updateWorldCopy(){
    const small=document.querySelector("#main-world .page-head > div > span");
    if(small)small.textContent="Domestic clubs + selected UEFA clubs";
  }

  function enableExtraRatingEdits(c){
    if(COMP[c]?.type!=="europe")return;
    document.querySelectorAll(`#${c}-teamGrid .team-card`).forEach(card=>{
      const team=card.querySelector(".club-link")?.textContent?.trim();
      if(!extraSet.has(team))return;
      const input=card.querySelector('input[type="number"]');
      if(!input)return;
      input.disabled=false;
      input.onchange=e=>{
        const v=clamp(Number(e.target.value)||state.settings.externalRating,state.settings.minRating,state.settings.maxRating);
        state.starts[team]=v;
        save();
        renderTeams(c);
      };
      const label=card.querySelector("small");
      if(label)label.textContent="Ranked UEFA club";
    });
  }

  const previousRenderWorld=renderWorld;
  renderWorld=function(){
    const out=previousRenderWorld();
    addUefaWorldFilter();
    updateWorldCopy();
    return out;
  };

  const previousRenderTeams=renderTeams;
  renderTeams=function(c){
    const out=previousRenderTeams(c);
    enableExtraRatingEdits(c);
    return out;
  };

  const previousOpenClub=openClub;
  openClub=function(team){
    const out=previousOpenClub(team);
    if(extraSet.has(team)){
      const metrics=document.querySelectorAll("#clubOverlay .metrics > div");
      const leagueRankLabel=metrics[3]?.querySelector("small");
      if(leagueRankLabel)leagueRankLabel.textContent="UEFA group rank";
    }
    return out;
  };

  addUefaWorldFilter();
  updateWorldCopy();
})();
