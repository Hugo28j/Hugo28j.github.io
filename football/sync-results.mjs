import fs from "node:fs/promises";
const OUT=new URL("./matches.json",import.meta.url);
const SOURCES=[
["jpl","bel.1"],["epl","eng.1"],["laliga","esp.1"],["bundesliga","ger.1"],["ligue1","fra.1"],["eredivisie","ned.1"],["primeira","por.1"],["seriea","ita.1"],
["ucl","uefa.champions"],["ucl","uefa.champions_qual"],["uel","uefa.europa"],["uel","uefa.europa_qual"],["uecl","uefa.europa.conf"],["uecl","uefa.europa.conf_qual"]
];
const ymd=d=>`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,"0")}${String(d.getUTCDate()).padStart(2,"0")}`;
const add=(d,n)=>{const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x};
const iso=s=>{const d=new Date(s);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10)};
function chunks(a,b,n=31){const out=[];let x=new Date(a);while(x<=b){let y=add(x,n-1);if(y>b)y=new Date(b);out.push([new Date(x),new Date(y)]);x=add(y,1)}return out}
async function get(url){const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 club-rating-sync/1.0","accept":"application/json"}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json()}
function extract(e,competition,slug){
 const c=e?.competitions?.[0],status=e?.status?.type;if(!c)return null;
 const home=(c.competitors||[]).find(x=>x.homeAway==="home"),away=(c.competitors||[]).find(x=>x.homeAway==="away");if(!home||!away)return null;
 const completed=!!(status?.completed||status?.state==="post"),hs=completed?Number(home.score):null,as=completed?Number(away.score):null;
 let penaltyWinner=null;if(completed&&hs===as){if(home.winner===true&&away.winner!==true)penaltyWinner="home";if(away.winner===true&&home.winner!==true)penaltyWinner="away"}
 const kickoff=c.date||e.date||null,d=kickoff?new Date(kickoff):null;
 return{competition,sourceLeague:slug,sourceEventId:String(e.id||c.id||""),date:iso(kickoff),time:d&&!Number.isNaN(d.getTime())?d.toISOString().slice(11,16):"",kickoff,
 home:home.team?.displayName||home.team?.shortDisplayName||"",away:away.team?.displayName||away.team?.shortDisplayName||"",
 round:Number(e.week?.number||c.week?.number)||null,stage:e.seasonType?.name||c.type?.text||"",completed,
 homeScore:completed&&Number.isFinite(hs)?hs:null,awayScore:completed&&Number.isFinite(as)?as:null,penaltyWinner};
}
let old={fixtures:[]};try{old=JSON.parse(await fs.readFile(OUT,"utf8"))}catch{}
const map=new Map((old.fixtures||[]).map(x=>[`${x.competition}|${x.sourceEventId}`,x]));
const now=new Date(),full=process.env.FULL_SYNC==="true",start=full?new Date(Date.UTC(2026,6,1)):add(now,-4),end=full?new Date(Date.UTC(2027,5,30)):add(now,21);
let requests=0,failures=[];
for(const [competition,slug] of SOURCES)for(const [a,b] of chunks(start,end,31)){
 const url=`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${ymd(a)}-${ymd(b)}&limit=500`;
 try{const data=await get(url);requests++;for(const e of data.events||[]){const x=extract(e,competition,slug);if(x?.date&&x.sourceEventId)map.set(`${competition}|${x.sourceEventId}`,x)}}catch(err){failures.push(`${slug} ${ymd(a)}-${ymd(b)}: ${err.message}`)}
}
const fixtures=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.competition.localeCompare(b.competition)||a.home.localeCompare(b.home));
await fs.writeFile(OUT,JSON.stringify({generatedAt:new Date().toISOString(),source:"ESPN public scoreboard endpoints (unofficial / undocumented)",fullSync:full,requests,failures,fixtures},null,2)+"\n");
console.log(`Saved ${fixtures.length} fixtures; ${fixtures.filter(x=>x.completed).length} completed; ${failures.length} failures.`);
