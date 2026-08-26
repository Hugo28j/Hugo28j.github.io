import fs from "node:fs/promises";

const OUT=new URL("./matches.json",import.meta.url);
const UEFA_AUDIT_OUT=new URL("./uefa-audit.json",import.meta.url);

const SOURCES=[
  ["jpl","bel.1"],["epl","eng.1"],["laliga","esp.1"],["bundesliga","ger.1"],
  ["ligue1","fra.1"],["eredivisie","ned.1"],["primeira","por.1"],["seriea","ita.1"],
  ["ucl","uefa.champions_qual"],["uel","uefa.europa_qual"],["uecl","uefa.europa.conf_qual"],
  ["ucl","uefa.champions"],["uel","uefa.europa"],["uecl","uefa.europa.conf"]
];

// Official UEFA 2026/27 competition windows. Main competition feeds are ignored during
// qualifying; qualifier feeds are ignored once the league phase starts. This prevents
// a provider cross-listing a qualifier in the wrong UEFA competition on the site.
const UEFA_WINDOWS={
  ucl:{qualEnd:"2026-08-26",leagueStart:"2026-09-08"},
  uel:{qualEnd:"2026-08-27",leagueStart:"2026-09-16"},
  uecl:{qualEnd:"2026-08-27",leagueStart:"2026-10-15"}
};

const ymd=d=>`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,"0")}${String(d.getUTCDate()).padStart(2,"0")}`;
const add=(d,n)=>{const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x};
const iso=s=>{const d=new Date(s);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10)};
function chunks(a,b,n=31){const out=[];let x=new Date(a);while(x<=b){let y=add(x,n-1);if(y>b)y=new Date(b);out.push([new Date(x),new Date(y)]);x=add(y,1)}return out}
async function get(url){const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 club-rating-sync/1.2","accept":"application/json"}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json()}

function statusInfo(status){
  const name=String(status?.name||"");
  const description=String(status?.description||status?.detail||status?.shortDetail||"");
  const state=String(status?.state||"");
  const text=`${name} ${description} ${state}`.toLowerCase();
  const postponed=/postpon|cancel|abandon|suspend|delayed|called off|interrupted/.test(text);
  const completed=status?.completed===true&&!postponed;
  return{name,description,state,postponed,completed};
}

function extract(e,competition,slug){
  const c=e?.competitions?.[0],status=e?.status?.type;if(!c)return null;
  const home=(c.competitors||[]).find(x=>x.homeAway==="home"),away=(c.competitors||[]).find(x=>x.homeAway==="away");if(!home||!away)return null;
  const st=statusInfo(status),completed=st.completed;
  const hs=completed?Number(home.score):null,as=completed?Number(away.score):null;
  let penaltyWinner=null;
  if(completed&&hs===as){if(home.winner===true&&away.winner!==true)penaltyWinner="home";if(away.winner===true&&home.winner!==true)penaltyWinner="away"}
  const kickoff=c.date||e.date||null,d=kickoff?new Date(kickoff):null;
  return{
    competition,sourceLeague:slug,sourceEventId:String(e.id||c.id||""),date:iso(kickoff),
    time:d&&!Number.isNaN(d.getTime())?d.toISOString().slice(11,16):"",kickoff,
    home:home.team?.displayName||home.team?.shortDisplayName||"",
    away:away.team?.displayName||away.team?.shortDisplayName||"",
    round:Number(e.week?.number||c.week?.number)||null,stage:e.seasonType?.name||c.type?.text||"",
    completed,postponed:st.postponed,statusName:st.name,statusDescription:st.description,statusState:st.state,
    homeScore:completed&&Number.isFinite(hs)?hs:null,awayScore:completed&&Number.isFinite(as)?as:null,penaltyWinner
  };
}

function isUefa(x){return x&&UEFA_WINDOWS[x.competition]}
function uefaSourceAllowed(x){
  if(!isUefa(x)||!x.date)return true;
  const w=UEFA_WINDOWS[x.competition],qual=String(x.sourceLeague||"").endsWith("_qual");
  return qual?x.date<=w.qualEnd:x.date>=w.leagueStart;
}

let old={fixtures:[]};try{old=JSON.parse(await fs.readFile(OUT,"utf8"))}catch{}
const now=new Date(),full=process.env.FULL_SYNC==="true";
const start=full?new Date(Date.UTC(2026,6,1)):add(now,-4),end=full?new Date(Date.UTC(2027,5,30)):add(now,21);

const domesticMap=new Map();
const uefaCandidates=new Map();
function addUefaCandidate(x,origin="sync"){
  if(!x?.sourceEventId||!uefaSourceAllowed(x))return;
  const key=String(x.sourceEventId);
  if(!uefaCandidates.has(key))uefaCandidates.set(key,[]);
  const arr=uefaCandidates.get(key);
  const same=arr.find(y=>y.competition===x.competition&&y.sourceLeague===x.sourceLeague);
  const rec={...x,_origin:origin};
  if(same)arr[arr.indexOf(same)]=rec;else arr.push(rec);
}

// Incremental sync keeps previously known fixtures, but every UEFA fixture still passes
// the strict source-window and global event-ID conflict checks below. A full sync rebuilds
// UEFA from scratch so stale cross-competition records disappear permanently.
for(const x of old.fixtures||[]){
  if(isUefa(x)){if(!full)addUefaCandidate(x,"old");}
  else if(x?.sourceEventId)domesticMap.set(`${x.competition}|${x.sourceEventId}`,x);
}

let requests=0,failures=[];
for(const [competition,slug] of SOURCES){
  for(const [a,b] of chunks(start,end,31)){
    const url=`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${ymd(a)}-${ymd(b)}&limit=500`;
    try{
      const data=await get(url);requests++;
      for(const e of data.events||[]){
        const x=extract(e,competition,slug);if(!x?.date||!x.sourceEventId)continue;
        if(isUefa(x))addUefaCandidate(x,"sync");
        else domesticMap.set(`${competition}|${x.sourceEventId}`,x);
      }
    }catch(err){failures.push(`${slug} ${ymd(a)}-${ymd(b)}: ${err.message}`)}
  }
}

const uefaFixtures=[];
const conflicts=[];
const filteredSourceRecords=[];
for(const [eventId,records] of uefaCandidates){
  const allowed=records.filter(uefaSourceAllowed);
  const byCompetition=new Map();
  for(const r of allowed){
    if(!byCompetition.has(r.competition))byCompetition.set(r.competition,[]);
    byCompetition.get(r.competition).push(r);
  }
  if(byCompetition.size===0)continue;
  if(byCompetition.size>1){
    conflicts.push({sourceEventId:eventId,records:allowed.map(({_origin,...r})=>r)});
    continue; // correctness first: never guess a UEFA competition for a conflicted event.
  }
  const list=[...byCompetition.values()][0];
  // Prefer freshly synced record, then qualifier feed during qualifying.
  list.sort((a,b)=>(a._origin==="sync"?-1:1)-(b._origin==="sync"?-1:1)||
    (String(a.sourceLeague).endsWith("_qual")?-1:1)-(String(b.sourceLeague).endsWith("_qual")?-1:1));
  const {_origin,...chosen}=list[0];uefaFixtures.push(chosen);
  if(records.length!==allowed.length)filteredSourceRecords.push({sourceEventId:eventId,removed:records.length-allowed.length});
}

const fixtures=[...domesticMap.values(),...uefaFixtures].sort((a,b)=>
  (a.date||"").localeCompare(b.date||"")||a.competition.localeCompare(b.competition)||(a.home||"").localeCompare(b.home||""));
const postponed=fixtures.filter(x=>x.postponed).length;

await fs.writeFile(OUT,JSON.stringify({
  generatedAt:new Date().toISOString(),source:"ESPN public scoreboard endpoints (unofficial / undocumented)",
  fullSync:full,requests,failures,postponed,uefaConflictsBlocked:conflicts.length,fixtures
},null,2)+"\n");

const auditFixtures={ucl:[],uel:[],uecl:[]};
for(const x of uefaFixtures)auditFixtures[x.competition].push({
  sourceEventId:x.sourceEventId,date:x.date,home:x.home,away:x.away,completed:x.completed,
  homeScore:x.homeScore,awayScore:x.awayScore,sourceLeague:x.sourceLeague,statusName:x.statusName
});
await fs.writeFile(UEFA_AUDIT_OUT,JSON.stringify({
  generatedAt:new Date().toISOString(),
  policy:"Qualifier feeds only during qualifying; main feeds only from league-phase Matchday 1. Cross-competition duplicate event IDs are blocked, not guessed.",
  officialWindows:UEFA_WINDOWS,conflicts,filteredSourceRecords,fixtures:auditFixtures
},null,2)+"\n");

console.log(`Saved ${fixtures.length} fixtures; ${fixtures.filter(x=>x.completed).length} completed; ${postponed} postponed/cancelled; ${failures.length} failures.`);
console.log(`UEFA: ${uefaFixtures.length} accepted; ${conflicts.length} cross-competition conflicts blocked.`);
