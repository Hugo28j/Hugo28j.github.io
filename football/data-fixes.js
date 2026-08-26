// Runtime data-quality fixes for synced football fixtures.
// Fixture IDs stay unchanged so manual/imported scores keep working.

Object.assign(ALIASES,{
  "man utd":"Manchester United",
  "man united":"Manchester United",
  "manchester utd":"Manchester United",
  "man city":"Manchester City",
  "tottenham":"Tottenham Hotspur",
  "spurs":"Tottenham Hotspur",
  "newcastle":"Newcastle United",
  "brighton":"Brighton & Hove Albion",
  "bournemouth":"AFC Bournemouth",
  "nottm forest":"Nottingham Forest",
  "nottingham":"Nottingham Forest",
  "leeds":"Leeds United",
  "ipswich":"Ipswich Town",
  "coventry":"Coventry City",
  "hull":"Hull City",

  "barcelona":"FC Barcelona",
  "atletico":"Atlético de Madrid",
  "atletico madrid":"Atlético de Madrid",
  "celta vigo":"RC Celta",
  "alaves":"Deportivo Alavés",
  "espanyol":"RCD Espanyol",
  "rd espanyol":"RCD Espanyol",
  "rcd espanyol de barcelona":"RCD Espanyol",
  "osasuna":"CA Osasuna",
  "deportivo la coruna":"RC Deportivo",

  "bayern":"FC Bayern München",
  "bayern munich":"FC Bayern München",
  "bayer leverkusen":"Bayer 04 Leverkusen",
  "leverkusen":"Bayer 04 Leverkusen",
  "dortmund":"Borussia Dortmund",
  "monchengladbach":"Borussia Mönchengladbach",
  "borussia monchengladbach":"Borussia Mönchengladbach",
  "mainz":"1. FSV Mainz 05",
  "mainz 05":"1. FSV Mainz 05",
  "union berlin":"1. FC Union Berlin",
  "cologne":"1. FC Köln",
  "koln":"1. FC Köln",
  "werder bremen":"SV Werder Bremen",
  "hoffenheim":"TSG Hoffenheim",
  "schalke":"FC Schalke 04",
  "schalke 04":"FC Schalke 04",

  "psg":"Paris Saint-Germain",
  "paris saint germain":"Paris Saint-Germain",
  "marseille":"Olympique de Marseille",
  "lyon":"Olympique Lyonnais",
  "lille":"LOSC Lille",
  "rennes":"Stade Rennais FC",
  "strasbourg":"RC Strasbourg Alsace",
  "brest":"Stade Brestois 29",
  "auxerre":"AJ Auxerre",
  "nice":"OGC Nice",
  "le havre":"Havre Athletic Club",
  "le havre ac":"Havre Athletic Club",
  "havre ac":"Havre Athletic Club",

  "twente":"FC Twente",
  "utrecht":"FC Utrecht",
  "groningen":"FC Groningen",
  "heerenveen":"sc Heerenveen",
  "nec":"N.E.C. Nijmegen",
  "nec nijmegen":"N.E.C. Nijmegen",
  "go ahead":"Go Ahead Eagles",

  "porto":"FC Porto",
  "benfica":"SL Benfica",
  "sporting lisbon":"Sporting CP",
  "braga":"SC Braga",
  "gil vicente":"Gil Vicente FC",
  "vitoria guimaraes":"Vitória SC",
  "vitoria de guimaraes":"Vitória SC",
  "famalicao":"FC Famalicão",
  "arouca":"FC Arouca",

  "inter":"Internazionale",
  "inter milan":"Internazionale",
  "ac milan":"Milan",
  "juve":"Juventus",
  "roma":"Roma",
  "fiorentina":"Fiorentina",
  "atalanta bc":"Atalanta",
  "napoli":"Napoli",

  "sint truidense":"STVV",
  "sint truidense vv":"STVV",
  "sint truiden":"STVV",
  "st truiden":"STVV",
  "stvv":"STVV",
  "union sg":"Royale Union Saint-Gilloise",
  "union saint gilloise":"Royale Union Saint-Gilloise",
  "union st gilloise":"Royale Union Saint-Gilloise",
  "union st gilloise":"Royale Union Saint-Gilloise",
  "waasland beveren":"SK Beveren",
  "cercle brugge ksv":"Cercle Brugge",
  "club bruges":"Club Brugge",
  "club brugge kv":"Club Brugge",
  "anderlecht":"RSC Anderlecht",
  "royal antwerp":"Royal Antwerp FC",
  "antwerp":"Royal Antwerp FC",
  "gent":"KAA Gent",
  "genk":"KRC Genk",
  "mechelen":"KV Mechelen",
  "standard liege":"Standard de Liège",
  "westerlo":"KVC Westerlo",
  "zulte waregem":"SV Zulte Waregem",
  "charleroi":"Sporting Charleroi",
  "oud heverlee leuven":"OH Leuven"
});

function resolveTrackedFixtureName(name,competition){
  if(tracked(name))return name;
  const aliased=canonicalName(name);
  if(tracked(aliased))return aliased;

  const domestic=COMP[competition]?.type==="domestic";
  const candidates=domestic?(TEAMS_BY_LEAGUE[competition]||[]):ALL_TRACKED;
  if(!candidates.length)return name;

  const targetNorm=normalized(aliased);
  const exact=candidates.find(t=>normalized(t)===targetNorm);
  if(exact)return exact;

  let best=null,bestScore=0,secondScore=0;
  for(const t of candidates){
    const s=similarity(aliased,t);
    if(s>bestScore){secondScore=bestScore;bestScore=s;best=t}
    else if(s>secondScore)secondScore=s;
  }

  // Domestic data must be reasonably certain. If two candidates are too close,
  // leave the original name untouched instead of guessing the wrong club.
  const threshold=domestic?.72:.86;
  const margin=domestic?.12:.08;
  return best&&bestScore>=threshold&&(bestScore-secondScore>=margin||bestScore>=.98)?best:name;
}

const __loadFixturesWithOriginalNames=loadFixtures;
loadFixtures=async function(){
  const info=await __loadFixturesWithOriginalNames();
  let fixedNames=0;
  const unresolvedDomestic=[];
  const suspiciousMappings=[];

  FIXTURES=FIXTURES.map(f=>{
    const originalHome=f.home,originalAway=f.away;
    const home=resolveTrackedFixtureName(originalHome,f.competition);
    const away=resolveTrackedFixtureName(originalAway,f.competition);
    if(home!==originalHome)fixedNames++;
    if(away!==originalAway)fixedNames++;
    const nf={...f,home,away};

    if(COMP[f.competition]?.type==="domestic"){
      if(!tracked(home))unresolvedDomestic.push(`${COMP[f.competition].name}: ${originalHome}`);
      if(!tracked(away))unresolvedDomestic.push(`${COMP[f.competition].name}: ${originalAway}`);
      if(home===away)suspiciousMappings.push(`${COMP[f.competition].name}: ${originalHome} vs ${originalAway} resolved to the same club`);

      // New merged fixtures remember the original synced club names. Verify that
      // source and calendar still resolve to the same two tracked teams.
      if(f.syncedHome&&f.syncedAway){
        const sh=resolveTrackedFixtureName(f.syncedHome,f.competition);
        const sa=resolveTrackedFixtureName(f.syncedAway,f.competition);
        if(tracked(sh)&&tracked(sa)&&(sh!==home||sa!==away)){
          suspiciousMappings.push(`${COMP[f.competition].name}: calendar ${home} vs ${away}; source ${sh} vs ${sa}`);
        }
      }
    }
    return nf;
  });

  const uniqueUnresolved=[...new Set(unresolvedDomestic)];
  const uniqueSuspicious=[...new Set(suspiciousMappings)];
  window.FOOTBALL_NAME_DIAGNOSTICS={fixedNames,unresolvedDomestic:uniqueUnresolved,suspiciousMappings:uniqueSuspicious};
  if(uniqueUnresolved.length)console.warn("Unresolved domestic club names",uniqueUnresolved);
  if(uniqueSuspicious.length)console.warn("Suspicious fixture mappings",uniqueSuspicious);
  return {...info,fixedNames,unresolvedDomestic:uniqueUnresolved,suspiciousMappings:uniqueSuspicious};
};
