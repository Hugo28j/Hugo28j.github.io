import fs from "node:fs/promises";

const OUT=new URL("./matches.json",import.meta.url);
const UEFA_AUDIT_OUT=new URL("./uefa-audit.json",import.meta.url);

const SOURCES=[
  ["jpl","bel.1"],["epl","eng.1"],["laliga","esp.1"],["bundesliga","ger.1"],
  ["ligue1","fra.1"],["eredivisie","ned.1"],["primeira","por.1"],["seriea","ita.1"],
  ["ucl","uefa.champions_qual"],["uel","uefa.europa_qual"],["uecl","uefa.europa.conf_qual"],
  ["ucl","uefa.champions"],["uel","uefa.europa"],["uecl","uefa.europa.conf"]
];

const UEFA_WINDOWS={
  ucl:{qualEnd:"2026-08-26",leagueStart:"2026-09-08"},
  uel:{qualEnd:"2026-08-27",leagueStart:"2026-09-16"},
  uecl:{qualEnd:"2026-08-27",leagueStart:"2026-10-15"}
};

// Canonical official UEFA qualifier pages. During July/August these pages are the
// authority for which two clubs actually belong to which UEFA competition.
const UEFA_OFFICIAL_URLS={
  ucl:"https://www.uefa.com/uefachampionsleague/news/02a6-20e5a8be4e63-ae971c582f8c-1000--champions-league-qualifying-fixtures-dates-how-it-works/",
  uel:"https://www.uefa.com/uefaeuropaleague/news/02a6-20e5db0029dd-8241a8d00925-1000--europa-league-qualifying-fixtures-dates-how-it-works/",
  uecl:"https://www.uefa.com/uefaconferenceleague/news/02a6-20e5e911587f-cc10425958b3-1000--conference-league-qualifying-fixtures-dates-how-it-works/"
};

const ymd=d=>`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,"0")}${String(d.getUTCDate()).padStart(2,"0")}`;
const add=(d,n)=>{const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x};
const iso=s=>{const d=new Date(s);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10)};
function chunks(a,b,n=31){const out=[];let x=new Date(a);while(x<=b){let y=add(x,n-1);if(y>b)y=new Date(b);out.push([new Date(x),new Date(y)]);x=add(y,1)}return out}
async function get(url){const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 club-rating-sync/1.3","accept":"application/json,text/html;q=0.9,*/*;q=0.8"}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r}
async function getJson(url){return (await get(url)).json()}

function statusInfo(status){
  const name=String(status?.name||""),description=String(status?.description||status?.detail||status?.shortDetail||""),state=String(status?.state||"");
  const text=`${name} ${description} ${state}`.toLowerCase();
  const postponed=/postpon|cancel|abandon|suspend|delayed|called off|interrupted/.test(text);
  return{name,description,state,postponed,completed:status?.completed===true&&!postponed};
}

function extract(e,competition,slug){
  const c=e?.competitions?.[0],status=e?.status?.type;if(!c)return null;
  const home=(c.competitors||[]).find(x=>x.homeAway==="home"),away=(c.competitors||[]).find(x=>x.homeAway==="away");if(!home||!away)return null;
  const st=statusInfo(status),completed=st.completed,hs=completed?Number(home.score):null,as=completed?Number(away.score):null;
  let penaltyWinner=null;if(completed&&hs===as){if(home.winner===true&&away.winner!==true)penaltyWinner="home";if(away.winner===true&&home.winner!==true)penaltyWinner="away"}
  const kickoff=c.date||e.date||null,d=kickoff?new Date(kickoff):null;
  return{competition,sourceLeague:slug,sourceEventId:String(e.id||c.id||""),date:iso(kickoff),time:d&&!Number.isNaN(d.getTime())?d.toISOString().slice(11,16):"",kickoff,
    home:home.team?.displayName||home.team?.shortDisplayName||"",away:away.team?.displayName||away.team?.shortDisplayName||"",
    round:Number(e.week?.number||c.week?.number)||null,stage:e.seasonType?.name||c.type?.text||"",completed,postponed:st.postponed,
    statusName:st.name,statusDescription:st.description,statusState:st.state,
    homeScore:completed&&Number.isFinite(hs)?hs:null,awayScore:completed&&Number.isFinite(as)?as:null,penaltyWinner};
}

function isUefa(x){return x&&UEFA_WINDOWS[x.competition]}
function uefaSourceAllowed(x){
  if(!isUefa(x)||!x.date)return true;
  const w=UEFA_WINDOWS[x.competition],qual=String(x.sourceLeague||"").endsWith("_qual");
  return qual?x.date<=w.qualEnd:x.date>=w.leagueStart;
}

function decodeHtml(s){return String(s||"").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&ndash;|&mdash;/gi,"-").replace(/&ouml;/gi,"ö").replace(/&auml;/gi,"ä").replace(/&uuml;/gi,"ü").replace(/&oslash;/gi,"ø").replace(/&aring;/gi,"å");}
function plainOfficialHtml(html){return decodeHtml(String(html||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim()}
function norm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ø/g,"o").replace(/ð/g,"d").replace(/þ/g,"th").replace(/æ/g,"ae").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim()}
const GENERIC=new Set(["fc","fk","cf","ac","sc","sk","sv","club","football","united","city","athletic","de","the"]);
const UEFA_NAME_HINTS={
  "csu craiova":["universitatea craiova","craiova"],"universitatea craiova":["craiova"],
  "drita gjilan":["drita"],"inter d escaldes":["inter club d escaldes","escaldes"],
  "ki klaksvik":["klaksvik"],"gyori eto fc":["gyori eto"],"fk sutjeska":["sutjeska"],
  "flora":["flora tallinn"],"iberia 1999":["iberia tbilisi","iberia 1999"],
  "heart of midlothian":["hearts"],"agf":["aarhus","agf"],"az alkmaar":["az alkmaar"],
  "bodo glimt":["bodo glimt"],"nec nijmegen":["n e c","nec"],"fenerbahce":["fenerbahce"],
  "gornik zabrze":["gornik zabrze"],"dinamo zagreb":["gnk dinamo","dinamo"],
  "sparta prague":["sparta praha"],"slovan bratislava":["slovan bratislava"],
  "tromso il":["tromso"],"le havre ac":["le havre"]
};
function teamKeys(name){
  const n=norm(name),out=new Set([n]);
  for(const h of UEFA_NAME_HINTS[n]||[])out.add(norm(h));
  const words=n.split(" ").filter(w=>w.length>=4&&!GENERIC.has(w));
  words.sort((a,b)=>b.length-a.length);
  if(words[0])out.add(words[0]);
  if(words.length>=2)out.add(`${words[0]} ${words[1]}`);
  return [...out].filter(x=>x.length>=3);
}
function pairAppearsInOfficialText(f,text){
  const t=norm(text),A=teamKeys(f.home),B=teamKeys(f.away),MAX=180;
  for(const a of A)for(const b of B){
    let pos=t.indexOf(a);
    while(pos>=0){
      const from=Math.max(0,pos-MAX),to=Math.min(t.length,pos+a.length+MAX),slice=t.slice(from,to);
      if(slice.includes(b))return true;
      pos=t.indexOf(a,pos+1);
    }
  }
  return false;
}

const officialTexts={},officialFetch={};
for(const [c,url] of Object.entries(UEFA_OFFICIAL_URLS)){
  try{const html=await (await get(url)).text(),text=plainOfficialHtml(html);officialTexts[c]=text;officialFetch[c]={ok:text.length>1000,length:text.length,url};}
  catch(err){officialTexts[c]="";officialFetch[c]={ok:false,length:0,url,error:err.message};}
}

let old={fixtures:[]};try{old=JSON.parse(await fs.readFile(OUT,"utf8"))}catch{}
const now=new Date(),full=process.env.FULL_SYNC==="true",start=full?new Date(Date.UTC(2026,6,1)):add(now,-4),end=full?new Date(Date.UTC(2027,5,30)):add(now,21);
const domesticMap=new Map(),uefaCandidates=new Map();
function addUefaCandidate(x,origin="sync"){
  if(!x?.sourceEventId||!uefaSourceAllowed(x))return;
  const key=String(x.sourceEventId);if(!uefaCandidates.has(key))uefaCandidates.set(key,[]);
  const arr=uefaCandidates.get(key),rec={...x,_origin:origin},same=arr.find(y=>y.competition===x.competition&&y.sourceLeague===x.sourceLeague);
  if(same)arr[arr.indexOf(same)]=rec;else arr.push(rec);
}
for(const x of old.fixtures||[]){if(isUefa(x)){if(!full)addUefaCandidate(x,"old");}else if(x?.sourceEventId)domesticMap.set(`${x.competition}|${x.sourceEventId}`,x);}

let requests=0,failures=[];
for(const [competition,slug] of SOURCES)for(const [a,b] of chunks(start,end,31)){
  const url=`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${ymd(a)}-${ymd(b)}&limit=500`;
  try{const data=await getJson(url);requests++;for(const e of data.events||[]){const x=extract(e,competition,slug);if(!x?.date||!x.sourceEventId)continue;if(isUefa(x))addUefaCandidate(x,"sync");else domesticMap.set(`${competition}|${x.sourceEventId}`,x)}}
  catch(err){failures.push(`${slug} ${ymd(a)}-${ymd(b)}: ${err.message}`)}
}

const uefaFixtures=[],conflicts=[],rejectedByUefa=[],unverifiedBecauseOfficialUnavailable=[];
for(const [eventId,records] of uefaCandidates){
  const allowed=records.filter(uefaSourceAllowed),byCompetition=new Map();
  for(const r of allowed){if(!byCompetition.has(r.competition))byCompetition.set(r.competition,[]);byCompetition.get(r.competition).push(r)}
  if(byCompetition.size===0)continue;
  if(byCompetition.size>1){conflicts.push({sourceEventId:eventId,records:allowed.map(({_origin,...r})=>r)});continue}
  const list=[...byCompetition.values()][0];
  list.sort((a,b)=>(a._origin==="sync"?-1:1)-(b._origin==="sync"?-1:1)||(String(a.sourceLeague).endsWith("_qual")?-1:1)-(String(b.sourceLeague).endsWith("_qual")?-1:1));
  const {_origin,...chosen}=list[0];

  // Qualifiers MUST be confirmed by the corresponding official UEFA page.
  if(String(chosen.sourceLeague).endsWith("_qual")){
    if(officialFetch[chosen.competition]?.ok){
      if(!pairAppearsInOfficialText(chosen,officialTexts[chosen.competition])){
        rejectedByUefa.push(chosen);continue;
      }
    }else unverifiedBecauseOfficialUnavailable.push(chosen);
  }
  // Explicit AZ safety invariant, independently confirmed by UEFA: AZ are not in
  // 2026/27 Champions League or Conference League.
  const az=/^az(?: alkmaar)?$/i;
  if((chosen.competition==="ucl"||chosen.competition==="uecl")&&(az.test(chosen.home)||az.test(chosen.away))){rejectedByUefa.push({...chosen,rejectionReason:"AZ competition invariant"});continue}
  uefaFixtures.push(chosen);
}

const fixtures=[...domesticMap.values(),...uefaFixtures].sort((a,b)=>(a.date||"").localeCompare(b.date||"")||a.competition.localeCompare(b.competition)||(a.home||"").localeCompare(b.home||""));
const postponed=fixtures.filter(x=>x.postponed).length;
await fs.writeFile(OUT,JSON.stringify({generatedAt:new Date().toISOString(),source:"ESPN scores + official UEFA qualifier pairing validation",fullSync:full,requests,failures,postponed,uefaConflictsBlocked:conflicts.length,uefaPairingsRejected:rejectedByUefa.length,fixtures},null,2)+"\n");

const auditFixtures={ucl:[],uel:[],uecl:[]};for(const x of uefaFixtures)auditFixtures[x.competition].push({sourceEventId:x.sourceEventId,date:x.date,home:x.home,away:x.away,completed:x.completed,homeScore:x.homeScore,awayScore:x.awayScore,sourceLeague:x.sourceLeague,statusName:x.statusName});
await fs.writeFile(UEFA_AUDIT_OUT,JSON.stringify({generatedAt:new Date().toISOString(),policy:"ESPN supplies scores; every qualifier pairing must also appear on the official UEFA qualifying page for that competition. Cross-competition event conflicts are blocked.",officialWindows:UEFA_WINDOWS,officialFetch,conflicts,rejectedByUefa,unverifiedBecauseOfficialUnavailable,fixtures:auditFixtures},null,2)+"\n");
console.log(`Saved ${fixtures.length} fixtures; ${fixtures.filter(x=>x.completed).length} completed; ${postponed} postponed/cancelled; ${failures.length} failures.`);
console.log(`UEFA accepted ${uefaFixtures.length}; official UEFA rejected ${rejectedByUefa.length}; conflicts blocked ${conflicts.length}.`);
console.log("Official UEFA fetch:",officialFetch);
