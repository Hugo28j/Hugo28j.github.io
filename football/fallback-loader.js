const OF_CALENDARS={
 jpl:"https://raw.githubusercontent.com/openfootball/belgium/master/2026-27/be1.txt",
 epl:"https://raw.githubusercontent.com/openfootball/england/master/2026-27/1-premierleague.txt",
 laliga:"https://raw.githubusercontent.com/openfootball/espana/master/2026-27/1-liga.txt",
 bundesliga:"https://raw.githubusercontent.com/openfootball/deutschland/master/2026-27/1-bundesliga.txt",
 ligue1:"https://raw.githubusercontent.com/openfootball/europe/master/france/2026-27_fr1.txt",
 eredivisie:"https://raw.githubusercontent.com/openfootball/europe/master/netherlands/2026-27_nl1.txt",
 primeira:"https://raw.githubusercontent.com/openfootball/europe/master/portugal/2026-27_pt1.txt",
 seriea:"https://raw.githubusercontent.com/openfootball/italy/master/2026-27/1-seriea.txt",
 tur:"https://raw.githubusercontent.com/openfootball/europe/master/turkey/2026-27_tr1.txt",
 gre:"https://raw.githubusercontent.com/openfootball/europe/master/greece/2026-27_gr1.txt"
};
const OF_NAMES={
 laliga:{
  "Club Atlético de Madrid":"Atlético de Madrid",
  "Real Racing Club de Santander":"Racing Santander",
  "Real Madrid CF":"Real Madrid",
  "Real Sociedad de Fútbol":"Real Sociedad",
  "RCD Espanyol de Barcelona":"RCD Espanyol",
  "Rayo Vallecano de Madrid":"Rayo Vallecano",
  "RC Deportivo La Coruña":"RC Deportivo",
  "RC Celta de Vigo":"RC Celta",
  "Real Betis Balompié":"Real Betis"
 },
 bundesliga:{"SV 07 Elversberg":"SV Elversberg","TSG 1899 Hoffenheim":"TSG Hoffenheim"},
 ligue1:{"Racing Club de Lens":"RC Lens","Lille OSC":"LOSC Lille","Le Havre AC":"Havre Athletic Club","AS Monaco FC":"AS Monaco","Paris Saint-Germain FC":"Paris Saint-Germain","Stade Rennais FC 1901":"Stade Rennais FC","ES Troyes AC":"Estac Troyes"},
 eredivisie:{"AFC Ajax":"Ajax","FC Twente '65":"FC Twente","Feyenoord Rotterdam":"Feyenoord","NEC":"N.E.C. Nijmegen","SC Cambuur-Leeuwarden":"SC Cambuur","SC Heerenveen":"sc Heerenveen","SBV Excelsior":"Excelsior Rotterdam","Telstar 1963":"Telstar","Willem II Tilburg":"Willem II"},
 primeira:{"Académico de Viseu FC":"Académico","GD Estoril Praia":"Estoril Praia","CF Estrela da Amadora":"Estrela Amadora","CS Marítimo":"Marítimo M.","CD Santa Clara":"Santa Clara","Sporting Clube de Braga":"SC Braga","Sport Lisboa e Benfica":"SL Benfica","Sporting Clube de Portugal":"Sporting CP","Vitória Guimarães":"Vitória SC"},
 seriea:{"Atalanta BC":"Atalanta","Bologna FC 1909":"Bologna","Cagliari Calcio":"Cagliari","Como 1907":"Como","ACF Fiorentina":"Fiorentina","Frosinone Calcio":"Frosinone","Genoa CFC":"Genoa","FC Internazionale Milano":"Internazionale","Juventus FC":"Juventus","SS Lazio":"Lazio","US Lecce":"Lecce","AC Milan":"Milan","AC Monza":"Monza","SSC Napoli":"Napoli","Parma Calcio 1913":"Parma","AS Roma":"Roma","US Sassuolo Calcio":"Sassuolo","Torino FC":"Torino","Udinese Calcio":"Udinese","Venezia FC":"Venezia"}
};
const ADDITIONAL_DOMESTIC_NAMES={
 tur:{
  "Galatasaray":"Galatasaray","Fenerbahçe":"Fenerbahçe","Beşiktaş":"Besiktas",
  "Trabzonspor":"Trabzonspor","Samsunspor":"Samsunspor",
  "İstanbul Başakşehir":"Istanbul Basaksehir","Göztepe":"Goztepe",
  "Kocaelispor":"Kocaelispor","Gaziantep FK":"Gaziantep FK",
  "Aytemiz Alanyaspor":"Alanyaspor","Çaykur Rizespor":"Caykur Rizespor",
  "Atiker Konyaspor":"Konyaspor","Kasimpasa":"Kasimpasa",
  "Gençlerbirligi":"Genclerbirligi","Eyüpspor":"Eyupspor",
  "BB Erzurumspor":"Erzurumspor","Amed":"Amed SFK","Çorum":"Corum FK"
 },
 gre:{
  "Olympiakos Piraeus":"Olympiacos","PAOK":"PAOK","AEK":"AEK Athens",
  "Panathinaikos":"Panathinaikos","Aris Thessaloniki":"Aris",
  "OFI":"OFI Crete","Levadiakos":"Levadiakos","Atromitos":"Atromitos",
  "Asteras Tripolis":"Asteras Tripolis","Volos":"Volos",
  "Panetolikos":"Panetolikos","Kifisia":"Kifisia",
  "Iraklis 1908":"Iraklis","Kalamata":"Kalamata"
 }
};
Object.assign(OF_NAMES,ADDITIONAL_DOMESTIC_NAMES);
function ofMonth(m){return{Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12}[m]}
function ofDate(y,m,d){return`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function ofName(c,n){n=String(n||"").replace(/\s+/g," ").trim();return OF_NAMES[c]?.[n]||n}
function parseOpenFootball(txt,c){
 let round=null,date=null,year=2026,lastMonth=null;const raw=[];
 for(const rawLine of String(txt||"").split(/\r?\n/)){
  const line=rawLine.trim();if(!line)continue;
  let m=line.match(/^▪\s*(?:Matchday\s+)?(\d+)(?:\.\s*Round)?/i);
  if(m){
   round=Number(m[1]);
   // Never let the previous round's date leak into a TBC round.
   date=null;
   continue;
  }
  m=line.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?$/);
  if(m){
   const month=ofMonth(m[1]);
   if(m[3])year=Number(m[3]);
   else if(lastMonth!=null&&month<lastMonth-6)year++;
   lastMonth=month;
   date=ofDate(year,month,Number(m[2]));
   continue;
  }
  if(round==null||! /\s+v\s+/.test(line))continue;
  let part=line,time="TBD";const tm=part.match(/^(\d{1,2}:\d{2})\s+/);if(tm){time=tm[1];part=part.slice(tm[0].length)}
  const sides=part.split(/\s+v\s+/,2);if(sides.length!==2)continue;
  let home=ofName(c,sides[0]),awayRaw=sides[1].trim();
  const result=awayRaw.match(/\s+(\d+)\s*-\s*(\d+)(?:\s*\([^)]*\))?\s*$/),completed=!!result;
  const homeScore=completed?Number(result[1]):null,awayScore=completed?Number(result[2]):null;
  let away=awayRaw.replace(/\s+\d+\s*-\s*\d+(?:\s*\([^)]*\))?\s*$/,'').trim();away=ofName(c,away);
  if(!home||!away)continue;
  raw.push({competition:c,round,date,time,home,away,stage:`Matchday ${round}`,completed,homeScore,awayScore,provisional:!date||time==="TBD",source:"openfootball"});
 }
 const unique=new Map();for(const f of raw)unique.set(`${f.round}|${f.home}|${f.away}`,f);
 return[...unique.values()].map(f=>({...f,id:`fallback|${f.competition}|${f.round}|${f.home}|${f.away}`}));
}
// Turkey and Greece use the OpenFootball "Regular Season - N" layout with
// inline final scores (Team 2-1 (1-0) Team), unlike some other league files.
function parseOpenFootballDomesticSeason(txt,c){
 let round=null,date=null,year=2026,lastMonth=null;
 const raw=[];
 for(const line of String(txt||"").split(/\r?\n/)){
  let m=line.trim().match(/^▪\s*Regular Season\s*-\s*(\d+)\s*$/i);
  if(m){round=Number(m[1]);date=null;continue;}
  m=line.trim().match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?$/);
  if(m){
   const month=ofMonth(m[1]);
   if(m[3])year=Number(m[3]);
   else if(lastMonth!=null&&month<lastMonth-6)year++;
   lastMonth=month;
   date=ofDate(year,month,Number(m[2]));
   continue;
  }
  if(round==null||!date)continue;
  let time="TBD",home="",away="",homeScore=null,awayScore=null;
  // A completed fixture, optional kickoff time and half-time score.
  m=line.match(/^\s*(?:(\d{1,2}:\d{2})\s+)?(.+?)\s{2,}(\d+)\s*-\s*(\d+)(?:\s*\([^)]*\))?\s{2,}(.+?)\s*$/);
  if(m){
   time=m[1]||"TBD";home=m[2].trim();homeScore=Number(m[3]);
   awayScore=Number(m[4]);away=m[5].trim();
  }else{
   // Future fixture, possibly without an announced time.
   m=line.match(/^\s*(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\s+(.+?)\s*$/);
   if(!m)continue;
   time=m[1]||"TBD";home=m[2].trim();away=m[3].trim();
  }
  home=ofName(c,home);away=ofName(c,away);
  if(!home||!away||home===away)continue;
  raw.push({competition:c,round,date,time,home,away,
   stage:"Matchday "+round,completed:homeScore!==null,homeScore,awayScore,
   provisional:time==="TBD",source:"openfootball"});
 }
 const unique=new Map();
 for(const f of raw)unique.set(f.round+"|"+f.home+"|"+f.away,f);
 return [...unique.values()].map(f=>({...f,
  id:"fallback|"+f.competition+"|"+f.round+"|"+f.home+"|"+f.away}));
}
function uefaFallback(){const out=[];for(const [c,arr] of Object.entries(window.UEFA_FALLBACK_FIXTURES||{}))(arr||[]).forEach((f,i)=>out.push({...f,stage:f.phase||f.stage||"UEFA",completed:false,source:"uefa-fallback",id:`fallback|${c}|${i}|${f.date}|${f.home}|${f.away}`}));return out}

// A synced result may only be merged into a calendar fixture when BOTH clubs match.
// This prevents one exact club plus one weak substring match from attaching a result
// to the wrong fixture (for example Espanyol -> FC Barcelona).
function fixtureMergeScore(a,b){
 if(a.competition!==b.competition)return-1;
 const hs=similarity(a.home,b.home),as=similarity(a.away,b.away);
 const domestic=COMP[a.competition]?.type==="domestic";
 const minSide=domestic?.70:.78;
 if(hs<minSide||as<minSide)return-1;
 const pair=(hs+as)/2;

 // A home/away pair occurs only once in a domestic league season. This lets a
 // TBC calendar round (or a postponed/rescheduled match) inherit ESPN's real date,
 // time and final score without losing its correct matchday number.
 if(domestic&&hs>=.82&&as>=.82&&(!a.date||!b.date))return pair-.05;

 if(!a.date||!b.date)return-1;
 const dd=Math.abs((parseUTC(a.date)-parseUTC(b.date))/86400000);
 if(dd<=3)return pair-dd*.04;

 // Keep strong exact-pair matching for rescheduled domestic games.
 if(domestic&&hs>=.90&&as>=.90)return pair-Math.min(dd,90)*.002;
 return-1;
}
function mergeEspn(base,synced){
 const all=[...base];
 const sourceEventTargets=new Map();
 for(const s of synced||[]){
  let best=null,bs=-1;
  for(const f of all){
   const v=fixtureMergeScore(f,s);
   if(v>bs){bs=v;best=f}
  }
  if(best&&bs>=.60){
   const key=`${s.competition}|${s.sourceEventId||""}`;
   const previous=sourceEventTargets.get(key);
   if(previous&&previous!==best.id){
    console.warn("Duplicate source event mapping blocked",key,previous,best.id);
    continue;
   }
   sourceEventTargets.set(key,best.id);
   const syncedFinal=!!s.completed&&Number.isFinite(Number(s.homeScore))&&Number.isFinite(Number(s.awayScore)),fallbackFinal=!!best.completed&&Number.isFinite(Number(best.homeScore))&&Number.isFinite(Number(best.awayScore));
   Object.assign(best,{
    date:s.date||best.date,kickoff:s.kickoff||best.kickoff,time:s.time||best.time,
    sourceEventId:s.sourceEventId||best.sourceEventId,
    sourceLeague:s.sourceLeague||best.sourceLeague,
    completed:syncedFinal||fallbackFinal,
    postponed:!!s.postponed,
    statusName:s.statusName||best.statusName||"",
    statusDescription:s.statusDescription||best.statusDescription||"",
    statusState:s.statusState||best.statusState||"",
    homeScore:syncedFinal?Number(s.homeScore):(fallbackFinal?Number(best.homeScore):null),
    awayScore:syncedFinal?Number(s.awayScore):(fallbackFinal?Number(best.awayScore):null),
    penaltyWinner:syncedFinal?(s.penaltyWinner||null):(best.penaltyWinner||null),syncedStage:s.stage||null,
    syncedHome:s.home,syncedAway:s.away,syncedDate:s.date,
    source:syncedFinal?"espn+fallback":fallbackFinal?"openfootball+espn-schedule":"espn+fallback"
   });
  }else if(s?.competition&&s?.home&&s?.away&&s?.date){
   all.push({...s,id:`espn|${s.competition}|${s.sourceEventId||`${s.date}|${s.home}|${s.away}`}`,syncedHome:s.home,syncedAway:s.away,syncedDate:s.date,source:"espn"});
  }
 }
 return all.sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||"")||a.id.localeCompare(b.id));
}
// ONE canonical snapshot, generated by GitHub Actions, is used everywhere.
// Live third-party fallback calendars vary by device/time and used to give
// different results on phones and laptops; never merge those into public scores.
async function loadFixtures(){
  const response=await fetch("matches.json?v="+Date.now(),{cache:"no-store"});
  if(!response.ok)throw new Error("Shared match feed unavailable: HTTP "+response.status);
  const data=await response.json();
  if(!Array.isArray(data.fixtures)||!data.fixtures.length)
    throw new Error("Shared match feed is incomplete; keeping existing data.");
  const staticUefa=uefaFallback(); // published in this site's source code
  const merged=mergeEspn(staticUefa,data.fixtures);
  // Only publish a fully parsed snapshot. Failure must not clear the last one.
  assignUefaLeaguePhaseRounds(merged);
  FIXTURES=merged;
  return {...data,totalFixtures:FIXTURES.length,fallbackCount:staticUefa.length};
}

function assignUefaLeaguePhaseRounds(fixtures){
 const phases={
  ucl:{start:"2026-09-08",end:"2027-01-27",source:"uefa.champions"},
  uel:{start:"2026-09-16",end:"2027-01-28",source:"uefa.europa"},
  uecl:{start:"2026-10-15",end:"2026-12-17",source:"uefa.europa.conf"}
 };
 for(const [c,p] of Object.entries(phases)){
  const phase=fixtures.filter(f=>f.competition===c&&f.sourceLeague===p.source&&f.date>=p.start&&f.date<=p.end&&f.date).sort((a,b)=>a.date.localeCompare(b.date));
  const dates=[...new Set(phase.map(f=>f.date))].sort();
  if(!dates.length)continue;
  const groups=[];let current=[];
  for(const date of dates){
   if(current.length){
    const prev=current[current.length-1],gap=(parseUTC(date)-parseUTC(prev))/86400000;
    if(gap>3){groups.push(current);current=[]}
   }
   current.push(date);
  }
  if(current.length)groups.push(current);
  const roundByDate={};groups.forEach((g,i)=>g.forEach(d=>roundByDate[d]=i+1));
  phase.forEach(f=>{if(!f.round)f.round=roundByDate[f.date]||null;if(!f.stage&&f.round)f.stage=`Matchday ${f.round}`});
 }
}
