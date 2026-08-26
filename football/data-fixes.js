// Runtime data-quality fixes for synced football fixtures.
// This file intentionally leaves fixture IDs unchanged so manual/imported scores keep working.

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
  "vitoria guimaraes":"Vitória SC",
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
  "union sg":"Royale Union Saint-Gilloise",
  "union saint gilloise":"Royale Union Saint-Gilloise",
  "club bruges":"Club Brugge",
  "club brugge kv":"Club Brugge",
  "anderlecht":"RSC Anderlecht",
  "royal antwerp":"Royal Antwerp FC",
  "antwerp":"Royal Antwerp FC",
  "gent":"KAA Gent",
  "genk":"KRC Genk",
  "mechelen":"KV Mechelen",
  "standard liege":"Standard de Liège",
  "sint truiden":"STVV",
  "st truiden":"STVV",
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

  let best=null,bestScore=0;
  for(const t of candidates){
    const s=similarity(aliased,t);
    if(s>bestScore){bestScore=s;best=t}
  }
  // Domestic sources should contain clubs from that domestic league, so a slightly
  // lower threshold is safe there. UEFA matching stays stricter to avoid false links.
  const threshold=domestic?.72:.86;
  return best&&bestScore>=threshold?best:name;
}

const __loadFixturesWithOriginalNames=loadFixtures;
loadFixtures=async function(){
  const info=await __loadFixturesWithOriginalNames();
  let fixedNames=0;
  const unresolvedDomestic=[];
  FIXTURES=FIXTURES.map(f=>{
    const home=resolveTrackedFixtureName(f.home,f.competition);
    const away=resolveTrackedFixtureName(f.away,f.competition);
    if(home!==f.home)fixedNames++;
    if(away!==f.away)fixedNames++;
    const nf={...f,home,away};
    if(COMP[f.competition]?.type==="domestic"){
      if(!tracked(home))unresolvedDomestic.push(`${COMP[f.competition].name}: ${f.home}`);
      if(!tracked(away))unresolvedDomestic.push(`${COMP[f.competition].name}: ${f.away}`);
    }
    return nf;
  });
  const uniqueUnresolved=[...new Set(unresolvedDomestic)];
  window.FOOTBALL_NAME_DIAGNOSTICS={fixedNames,unresolvedDomestic:uniqueUnresolved};
  return {...info,fixedNames,unresolvedDomestic:uniqueUnresolved};
};
