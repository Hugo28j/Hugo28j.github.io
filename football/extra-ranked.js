// Promote the 10 selected Champions League clubs into the global World Ranking
// without adding a new domestic competition page.
(function(){
  const EXTRA_RANKED_TEAMS=[
    "AEK Athens",
    "Bodø/Glimt",
    "Fenerbahçe",
    "Galatasaray",
    "LASK",
    "Sabah FK",
    "Shakhtar Donetsk",
    "Slavia Praha",
    "Slovan Bratislava",
    "Viking"
  ];

  // Canonical source-name aliases for the newly ranked UEFA clubs.
  Object.assign(ALIASES,{
    "aek athens":"AEK Athens",
    "bodo glimt":"Bodø/Glimt",
    "fk bodo glimt":"Bodø/Glimt",
    "bodo/glimt":"Bodø/Glimt",
    "fenerbahce":"Fenerbahçe",
    "fenerbahce sk":"Fenerbahçe",
    "galatasaray":"Galatasaray",
    "galatasaray sk":"Galatasaray",
    "lask":"LASK",
    "lask linz":"LASK",
    "sabah":"Sabah FK",
    "sabah fk":"Sabah FK",
    "shakhtar donetsk":"Shakhtar Donetsk",
    "fc shakhtar donetsk":"Shakhtar Donetsk",
    "slavia prague":"Slavia Praha",
    "slavia praha":"Slavia Praha",
    "sk slavia praha":"Slavia Praha",
    "slovan bratislava":"Slovan Bratislava",
    "sk slovan bratislava":"Slovan Bratislava",
    "viking":"Viking",
    "viking fk":"Viking"
  });

  // Keep them outside the eight domestic leagues, but give them a group label so
  // World Ranking / Compare / club detail can display them safely.
  TEAMS_BY_LEAGUE.uefa_ranked=EXTRA_RANKED_TEAMS;
  COMP.uefa_ranked={name:"UEFA ranked clubs",short:"UEFA",type:"ranked-external",league:"uefa_ranked",country:"UEFA"};

  EXTRA_RANKED_TEAMS.forEach(t=>{if(!ALL_TRACKED.includes(t))ALL_TRACKED.push(t)});
  EXTRA_RANKED_TEAMS.forEach(t=>{if(DEFAULT_STARTS[t]==null)DEFAULT_STARTS[t]=40});

  // Preserve a rating the user already assigned while the club was UEFA-only.
  // If no individual value existed, use the current default external rating.
  const hadExplicitStart={};
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
    for(const t of EXTRA_RANKED_TEAMS)hadExplicitStart[t]=raw.starts?.[t]!=null;
  }catch{}

  for(const oldName of Object.keys(state.otherRatings||{})){
    const canonical=canonicalName(oldName);
    if(!EXTRA_RANKED_TEAMS.includes(canonical))continue;
    if(!hadExplicitStart[canonical])state.starts[canonical]=Number(state.otherRatings[oldName]);
    delete state.otherRatings[oldName];
  }

  for(const t of EXTRA_RANKED_TEAMS){
    if(!Number.isFinite(Number(state.starts[t])))state.starts[t]=Number(state.settings.externalRating);
  }
  save();

  // Expose the list for small UI patches loaded later.
  window.EXTRA_RANKED_TEAMS=EXTRA_RANKED_TEAMS;
})();
