// Runtime data-quality fixes for synced football fixtures.
// Fixture IDs stay unchanged so manual/imported scores remain compatible.

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
  "club atletico de madrid":"Atlético de Madrid",
  "celta vigo":"RC Celta",
  "rc celta de vigo":"RC Celta",
  "alaves":"Deportivo Alavés",
  "espanyol":"RCD Espanyol",
  "rcd espanyol de barcelona":"RCD Espanyol",
  "real madrid cf":"Real Madrid",
  "real sociedad de futbol":"Real Sociedad",
  "real racing club de santander":"Racing Santander",
  "rayo vallecano de madrid":"Rayo Vallecano",
  "rc deportivo la coruna":"RC Deportivo",
  "real betis balompie":"Real Betis",
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

// Identity matching must not rely on substring containment. A long name such as
// "RCD Espanyol de Barcelona" contains "Barcelona", but that does not make it FC Barcelona.
function safeNameSimilarity(a,b){
  const aa=normalized(canonicalName(a)),bb=normalized(canonicalName(b));
  if(!aa||!bb)return 0;
  if(aa===bb)return 1;
  const A=new Set(aa.split(" ").filter(Boolean)),B=new Set(bb.split(" ").filter(Boolean));
  let inter=0;A.forEach(x=>B.has(x)&&inter++);
  const union=new Set([...A,...B]).size;
  return union?inter/union:0;
}

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

  const ranked=candidates
    .map(t=>({team:t,score:safeNameSimilarity(aliased,t)}))
    .sort((a,b)=>b.score-a.score);
  const best=ranked[0],second=ranked[1]||{score:0};
  const threshold=domestic?.62:.78;
  const margin=domestic?.12:.10;

  // If two clubs are almost equally plausible, do not guess.
  return best&&best.score>=threshold&&(best.score-second.score)>=margin?best.team:name;
}

// Old HTML backups also need strict two-sided matching when their fixture IDs
// are migrated to the current ESPN/fallback fixture IDs.
findNewFixture=function(oldId){
  const p=String(oldId||"").split("|");if(p[0]!=="base")return null;
  let c,date,round,home,away;
  if(p.length>=6&&/^\d{4}-\d\d-\d\d$/.test(p[3])){
    c=p[1];date=p[3];home=p[4];away=p.slice(5).join("|");
  }else{
    c=p[1];round=Number(p[2]);home=p[3];away=p.slice(4).join("|");
  }
  let best=null,bestScore=-1;
  for(const f of FIXTURES.filter(x=>x.competition===c)){
    if(date&&Math.abs((parseUTC(f.date)-parseUTC(date))/86400000)>1)continue;
    if(round&&f.round&&Number(f.round)!==round)continue;
    const hs=safeNameSimilarity(home,f.home),as=safeNameSimilarity(away,f.away);
    if(hs<.70||as<.70)continue;
    const score=(hs+as)/2;
    if(score>bestScore){bestScore=score;best=f}
  }
  return bestScore>=.70?best:null;
};

function auditFixtureIntegrity(){
  const unresolvedDomestic=[],pairMismatches=[],sameTeam=[],duplicateSourceEvents=[];
  const sourceIds=new Map();

  for(const f of FIXTURES){
    if(COMP[f.competition]?.type!=="domestic")continue;
    const leagueTeams=new Set(TEAMS_BY_LEAGUE[f.competition]||[]);

    if(!leagueTeams.has(f.home))unresolvedDomestic.push(`${COMP[f.competition].name}: ${f.home}`);
    if(!leagueTeams.has(f.away))unresolvedDomestic.push(`${COMP[f.competition].name}: ${f.away}`);
    if(f.home===f.away)sameTeam.push(`${COMP[f.competition].name}: ${f.date} ${f.home}`);

    if(f.syncedHome&&f.syncedAway){
      const sourceHome=resolveTrackedFixtureName(f.syncedHome,f.competition);
      const sourceAway=resolveTrackedFixtureName(f.syncedAway,f.competition);
      if(sourceHome!==f.home||sourceAway!==f.away){
        pairMismatches.push(
          `${COMP[f.competition].name}: ${f.date} calendar ${f.home}–${f.away} / source ${f.syncedHome}–${f.syncedAway}`
        );
      }
    }

    if(f.sourceEventId){
      const key=`${f.competition}|${f.sourceEventId}`;
      const pair=`${f.home}|${f.away}|${f.date}`;
      if(sourceIds.has(key)&&sourceIds.get(key)!==pair)duplicateSourceEvents.push(`${key}: ${sourceIds.get(key)} <> ${pair}`);
      else sourceIds.set(key,pair);
    }
  }

  return{
    unresolvedDomestic:[...new Set(unresolvedDomestic)],
    pairMismatches:[...new Set(pairMismatches)],
    sameTeam:[...new Set(sameTeam)],
    duplicateSourceEvents:[...new Set(duplicateSourceEvents)]
  };
}

const __loadFixturesWithOriginalNames=loadFixtures;
loadFixtures=async function(){
  const info=await __loadFixturesWithOriginalNames();
  let fixedNames=0;
  const unresolvedBeforeAudit=[];

  FIXTURES=FIXTURES.map(f=>{
    const home=resolveTrackedFixtureName(f.home,f.competition);
    const away=resolveTrackedFixtureName(f.away,f.competition);
    if(home!==f.home)fixedNames++;
    if(away!==f.away)fixedNames++;
    const nf={...f,home,away};

    if(COMP[f.competition]?.type==="domestic"){
      if(!(TEAMS_BY_LEAGUE[f.competition]||[]).includes(home))unresolvedBeforeAudit.push(`${COMP[f.competition].name}: ${f.home}`);
      if(!(TEAMS_BY_LEAGUE[f.competition]||[]).includes(away))unresolvedBeforeAudit.push(`${COMP[f.competition].name}: ${f.away}`);
    }
    return nf;
  });

  const integrity=auditFixtureIntegrity();
  const uniqueUnresolved=[...new Set([...unresolvedBeforeAudit,...integrity.unresolvedDomestic])];
  window.FOOTBALL_NAME_DIAGNOSTICS={fixedNames,unresolvedDomestic:uniqueUnresolved};
  window.FOOTBALL_DATA_INTEGRITY={...integrity,unresolvedDomestic:uniqueUnresolved};

  if(uniqueUnresolved.length||integrity.pairMismatches.length||integrity.sameTeam.length||integrity.duplicateSourceEvents.length){
    console.warn("Football fixture integrity warnings",window.FOOTBALL_DATA_INTEGRITY);
  }else{
    console.info("Football fixture integrity audit passed.");
  }

  return{
    ...info,fixedNames,unresolvedDomestic:uniqueUnresolved,
    pairMismatches:integrity.pairMismatches,
    duplicateSourceEvents:integrity.duplicateSourceEvents
  };
};
