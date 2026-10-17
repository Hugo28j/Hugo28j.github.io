// Promote every non-domestic club in the 2026/27 UEFA league phases into the
// global World Ranking. Domestic clubs keep their normal league membership.
(function(){
  const UEFA_LEAGUE_PHASE_TEAMS={
    ucl:[
      "AEK Athens","Arsenal","Aston Villa","Atlético de Madrid","FC Barcelona","FC Bayern München",
      "Bodø/Glimt","Borussia Dortmund","Club Brugge","Como","Fenerbahçe","Feyenoord",
      "Galatasaray","Internazionale","LASK","RB Leipzig","RC Lens","LOSC Lille",
      "Liverpool","Manchester City","Manchester United","Napoli","Paris Saint-Germain","FC Porto",
      "PSV","Real Betis","Real Madrid","Roma","Sabah FK","Shakhtar Donetsk",
      "Slavia Praha","Slovan Bratislava","Sporting CP","VfB Stuttgart","Viking","Villarreal CF"
    ],
    uel:[
      "AFC Bournemouth","AZ","Ararat-Armenia","Bayer 04 Leverkusen","SL Benfica","Besiktas",
      "RC Celta","Celtic","Crystal Palace","Dinamo Zagreb","Ferencvaros","Hapoel Be'er",
      "Jagiellonia Bialystok","Juventus","Lech Poznan","Levski Sofia","Lillestrom","Milan",
      "N.E.C. Nijmegen","NK Celje","OFI Crete","Olympiacos","Olympique Lyonnais",
      "Olympique de Marseille","Omonia Nicosia","RB Salzburg","RSC Anderlecht","Real Sociedad",
      "Royale Union Saint-Gilloise","SK Sturm Graz","Sparta Prague","Stade Rennais FC",
      "Sunderland","TSG Hoffenheim","Torreense","Viktoria Plzen"
    ],
    uecl:[
      "AGF","AS Monaco","Ajax","Atalanta","Borac Banja Luka","SC Braga",
      "Brighton & Hove Albion","CSKA Sofia","CSU Craiova","Egnatia","F.C. København",
      "FC Lugano","FC Midtjylland","FC Nordsjælland","FC Thun","FC Twente","Getafe CF",
      "Hajduk Split","Heart of Midlothian","Iberia 1999","Inter D'Escaldes","Jablonec",
      "KAA Gent","Kairat Almaty","Kauno Zalgiris","KuPS Kuopio","Lincoln Red Imps",
      "Mjällby AIF","Pafos","Panathinaikos","Red Star Belgrade","Riga FC","SC Freiburg",
      "SK Brann","STVV","Trabzonspor"
    ]
  };

  const INITIAL_RATINGS={
    // Champions League extras already used by the site.
    "AEK Athens":60,"Bodø/Glimt":75,"Fenerbahçe":65,"Galatasaray":77,"LASK":55,
    "Sabah FK":50,"Shakhtar Donetsk":57,"Slavia Praha":60,"Slovan Bratislava":50,"Viking":55,

    // Europa League extras.
    "Ararat-Armenia":48,"Besiktas":62,"Celtic":68,"Dinamo Zagreb":62,"Ferencvaros":58,
    "Hapoel Be'er":52,"Jagiellonia Bialystok":55,"Lech Poznan":57,"Levski Sofia":52,
    "Lillestrom":53,"NK Celje":52,"OFI Crete":51,"Olympiacos":67,"Omonia Nicosia":53,
    "RB Salzburg":66,"SK Sturm Graz":60,"Sparta Prague":62,"Torreense":47,"Viktoria Plzen":60,

    // Conference League extras.
    "AGF":56,"Borac Banja Luka":48,"CSKA Sofia":53,"CSU Craiova":52,"Egnatia":46,
    "F.C. København":64,"FC Lugano":56,"FC Midtjylland":61,"FC Nordsjælland":58,
    "FC Thun":53,"Hajduk Split":57,"Heart of Midlothian":54,"Iberia 1999":46,
    "Inter D'Escaldes":42,"Jablonec":52,"Kairat Almaty":53,"Kauno Zalgiris":46,
    "KuPS Kuopio":50,"Lincoln Red Imps":42,"Mjällby AIF":57,"Pafos":58,
    "Panathinaikos":63,"Red Star Belgrade":62,"Riga FC":52,"SK Brann":58,"Trabzonspor":62
  };

  Object.assign(ALIASES,{
    // UCL source variants
    "aek athens":"AEK Athens","bodo glimt":"Bodø/Glimt","fk bodo glimt":"Bodø/Glimt",
    "fenerbahce":"Fenerbahçe","fenerbahce sk":"Fenerbahçe","galatasaray":"Galatasaray",
    "galatasaray sk":"Galatasaray","lask":"LASK","lask linz":"LASK","sabah":"Sabah FK",
    "sabah fk":"Sabah FK","shakhtar donetsk":"Shakhtar Donetsk","fc shakhtar donetsk":"Shakhtar Donetsk",
    "slavia prague":"Slavia Praha","slavia praha":"Slavia Praha","sk slavia praha":"Slavia Praha",
    "slovan bratislava":"Slovan Bratislava","sk slovan bratislava":"Slovan Bratislava",
    "viking":"Viking","viking fk":"Viking",

    // UEL / UECL variants and domestic-source names
    "az alkmaar":"AZ","benfica":"SL Benfica","bayer leverkusen":"Bayer 04 Leverkusen",
    "celtic":"Celtic","ferencvaros":"Ferencvaros","hapoel be er":"Hapoel Be'er",
    "omonia":"Omonia Nicosia","omonia nicosia":"Omonia Nicosia","rb salzburg":"RB Salzburg",
    "sparta prague":"Sparta Prague","sparta praha":"Sparta Prague","stade rennais":"Stade Rennais FC",
    "ajax amsterdam":"Ajax","braga":"SC Braga","getafe":"Getafe CF","heart of midlothian":"Heart of Midlothian",
    "hearts":"Heart of Midlothian","f c københavn":"F.C. København","fc københavn":"F.C. København",
    "fc copenhagen":"F.C. København","mjallby aif":"Mjällby AIF","inter d escaldes":"Inter D'Escaldes"
  });

  const domestic=new Set(Object.entries(TEAMS_BY_LEAGUE)
    .filter(([k])=>k!=="uefa_ranked")
    .flatMap(([,teams])=>teams));

  const EXTRA_RANKED_TEAMS=[...new Set(
    Object.values(UEFA_LEAGUE_PHASE_TEAMS).flat().filter(t=>!domestic.has(t))
  )];

  TEAMS_BY_LEAGUE.uefa_ranked=EXTRA_RANKED_TEAMS;
  COMP.uefa_ranked={name:"UEFA league-phase clubs",short:"UEFA",type:"ranked-external",league:"uefa_ranked",country:"UEFA"};

  for(const t of EXTRA_RANKED_TEAMS){
    if(!ALL_TRACKED.includes(t))ALL_TRACKED.push(t);
    if(DEFAULT_STARTS[t]==null)DEFAULT_STARTS[t]=INITIAL_RATINGS[t]??50;
  }

  // Preserve any rating the user already gave a club while it was UEFA-only.
  const hadExplicitStart={};
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
    for(const t of EXTRA_RANKED_TEAMS)hadExplicitStart[t]=raw.starts?.[t]!=null;
  }catch{}

  for(const oldName of Object.keys(state.otherRatings||{})){
    const canonical=canonicalName(oldName);
    if(!EXTRA_RANKED_TEAMS.includes(canonical))continue;
    if(!hadExplicitStart[canonical]&&Number.isFinite(Number(state.otherRatings[oldName]))){
      state.starts[canonical]=Number(state.otherRatings[oldName]);
    }
    delete state.otherRatings[oldName];
  }

  for(const t of EXTRA_RANKED_TEAMS){
    if(!Number.isFinite(Number(state.starts[t])))state.starts[t]=INITIAL_RATINGS[t]??50;
  }
  save();

  window.UEFA_LEAGUE_PHASE_TEAMS=UEFA_LEAGUE_PHASE_TEAMS;
  window.EXTRA_RANKED_TEAMS=EXTRA_RANKED_TEAMS;
  window.UEFA_INITIAL_RATINGS=INITIAL_RATINGS;
})();