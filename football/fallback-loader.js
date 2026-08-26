const OF_CALENDARS={
 jpl:"https://raw.githubusercontent.com/openfootball/belgium/master/2026-27/be1.txt",
 epl:"https://raw.githubusercontent.com/openfootball/england/master/2026-27/1-premierleague.txt",
 laliga:"https://raw.githubusercontent.com/openfootball/espana/master/2026-27/1-liga.txt",
 bundesliga:"https://raw.githubusercontent.com/openfootball/deutschland/master/2026-27/1-bundesliga.txt",
 ligue1:"https://raw.githubusercontent.com/openfootball/europe/master/france/2026-27_fr1.txt",
 eredivisie:"https://raw.githubusercontent.com/openfootball/europe/master/netherlands/2026-27_nl1.txt",
 primeira:"https://raw.githubusercontent.com/openfootball/europe/master/portugal/2026-27_pt1.txt",
 seriea:"https://raw.githubusercontent.com/openfootball/italy/master/2026-27/1-seriea.txt"
};
const OF_NAMES={
 bundesliga:{"SV 07 Elversberg":"SV Elversberg","TSG 1899 Hoffenheim":"TSG Hoffenheim"},
 ligue1:{"Racing Club de Lens":"RC Lens","Lille OSC":"LOSC Lille","Le Havre AC":"Havre Athletic Club","AS Monaco FC":"AS Monaco","Paris Saint-Germain FC":"Paris Saint-Germain","Stade Rennais FC 1901":"Stade Rennais FC","ES Troyes AC":"Estac Troyes"},
 eredivisie:{"AFC Ajax":"Ajax","FC Twente '65":"FC Twente","Feyenoord Rotterdam":"Feyenoord","NEC":"N.E.C. Nijmegen","SC Cambuur-Leeuwarden":"SC Cambuur","SC Heerenveen":"sc Heerenveen","SBV Excelsior":"Excelsior Rotterdam","Telstar 1963":"Telstar","Willem II Tilburg":"Willem II"},
 primeira:{"Académico de Viseu FC":"Académico","GD Estoril Praia":"Estoril Praia","CF Estrela da Amadora":"Estrela Amadora","CS Marítimo":"Marítimo M.","CD Santa Clara":"Santa Clara","Sporting Clube de Braga":"SC Braga","Sport Lisboa e Benfica":"SL Benfica","Sporting Clube de Portugal":"Sporting CP","Vitória Guimarães":"Vitória SC"},
 seriea:{"Atalanta BC":"Atalanta","Bologna FC 1909":"Bologna","Cagliari Calcio":"Cagliari","Como 1907":"Como","ACF Fiorentina":"Fiorentina","Frosinone Calcio":"Frosinone","Genoa CFC":"Genoa","FC Internazionale Milano":"Internazionale","Juventus FC":"Juventus","SS Lazio":"Lazio","US Lecce":"Lecce","AC Milan":"Milan","AC Monza":"Monza","SSC Napoli":"Napoli","Parma Calcio 1913":"Parma","AS Roma":"Roma","US Sassuolo Calcio":"Sassuolo","Torino FC":"Torino","Udinese Calcio":"Udinese","Venezia FC":"Venezia"}
};
function ofMonth(m){return{Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12}[m]}
function ofDate(y,m,d){return`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function ofName(c,n){n=String(n||"").replace(/\s+/g," ").trim();return OF_NAMES[c]?.[n]||n}
function parseOpenFootball(txt,c){
 let round=null,date=null,year=2026;const raw=[];
 for(const rawLine of String(txt||"").split(/\r?\n/)){
  const line=rawLine.trim();if(!line)continue;
  let m=line.match(/^▪\s*(?:Matchday\s+)?(\d+)(?:\.\s*Round)?/i);if(m){round=Number(m[1]);continue}
  m=line.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?$/);
  if(m){if(m[3])year=Number(m[3]);date=ofDate(year,ofMonth(m[1]),Number(m[2]));continue}
  if(round==null||!date||! /\s+v\s+/.test(line))continue;
  let part=line,time="TBD";const tm=part.match(/^(\d{1,2}:\d{2})\s+/);if(tm){time=tm[1];part=part.slice(tm[0].length)}
  const sides=part.split(/\s+v\s+/,2);if(sides.length!==2)continue;
  let home=ofName(c,sides[0]),away=sides[1].trim();
  away=away.replace(/\s+\d+\s*-\s*\d+(?:\s*\([^)]*\))?\s*$/,'').trim();away=ofName(c,away);
  if(!home||!away)continue;
  raw.push({competition:c,round,date,time,home,away,stage:`Matchday ${round}`,completed:false,provisional:time==="TBD",source:"openfootball"});
 }
 const unique=new Map();for(const f of raw)unique.set(`${f.round}|${f.home}|${f.away}`,f);
 return[...unique.values()].map(f=>({...f,id:`fallback|${f.competition}|${f.round}|${f.home}|${f.away}`}));
}
function uefaFallback(){const out=[];for(const [c,arr] of Object.entries(window.UEFA_FALLBACK_FIXTURES||{}))(arr||[]).forEach((f,i)=>out.push({...f,stage:f.phase||f.stage||"UEFA",completed:false,source:"uefa-fallback",id:`fallback|${c}|${i}|${f.date}|${f.home}|${f.away}`}));return out}
function fixtureMergeScore(a,b){if(a.competition!==b.competition)return-1;const dd=Math.abs((parseUTC(a.date)-parseUTC(b.date))/86400000);if(dd>2)return-1;return((similarity(a.home,b.home)+similarity(a.away,b.away))/2)-dd*.04}
function mergeEspn(base,synced){const all=[...base];for(const s of synced||[]){let best=null,bs=0;for(const f of all){const v=fixtureMergeScore(f,s);if(v>bs){bs=v;best=f}}if(best&&bs>=.62){Object.assign(best,{kickoff:s.kickoff||best.kickoff,time:s.time||best.time,sourceEventId:s.sourceEventId||best.sourceEventId,sourceLeague:s.sourceLeague||best.sourceLeague,completed:!!s.completed,homeScore:s.homeScore,awayScore:s.awayScore,penaltyWinner:s.penaltyWinner||null,syncedStage:s.stage||null,source:"espn+fallback"})}else if(s?.competition&&s?.home&&s?.away&&s?.date){all.push({...s,id:`espn|${s.competition}|${s.sourceEventId||`${s.date}|${s.home}|${s.away}`}`,source:"espn"})}}return all.sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||"")||a.id.localeCompare(b.id))}
async function loadFixtures(){
 const base=uefaFallback();
 const domestic=await Promise.all(Object.entries(OF_CALENDARS).map(async([c,url])=>{try{const r=await fetch(`${url}?v=${Date.now()}`,{cache:"no-store"});if(!r.ok)throw new Error(String(r.status));return parseOpenFootball(await r.text(),c)}catch(e){console.warn(`Fallback calendar failed for ${c}`,e);return[]}}));
 domestic.forEach(a=>base.push(...a));
 let d={generatedAt:null,source:"Fallback calendars",fixtures:[]};try{const r=await fetch(`matches.json?v=${Date.now()}`,{cache:"no-store"});if(r.ok)d=await r.json()}catch(e){console.warn("matches.json unavailable",e)}
 FIXTURES=mergeEspn(base,d.fixtures||[]);return{...d,totalFixtures:FIXTURES.length,fallbackCount:base.length};
}
