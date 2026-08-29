let FIXTURES=[],ACTIVE_COMP="ucl";
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fmt=x=>Number(x).toFixed(2);
const signfmt=x=>(x>0?"+":"")+Number(x).toFixed(2);
const parseUTC=s=>new Date(`${s}T00:00:00Z`);
const addDaysISO=(s,n)=>{const d=parseUTC(s);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
function niceDate(s){if(!s)return"";return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(parseUTC(s))}
function teamLeague(t){for(const [k,a] of Object.entries(TEAMS_BY_LEAGUE))if(a.includes(t))return k;return null}
function tracked(t){return ALL_TRACKED.includes(t)}
function defaultState(){return{officialDataVersion:OFFICIAL_DATA_VERSION,starts:clone(DEFAULT_STARTS),otherRatings:clone(DEFAULT_OTHER_RATINGS),scores:{},penalties:{},customFixtures:[],settings:clone(DEFAULT_SETTINGS)}}
function loadState(){
  try{
    const x=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!x)return defaultState();
    const d=defaultState();
    const applyOfficial=Number(x.officialDataVersion||0)<OFFICIAL_DATA_VERSION;
    return{
      officialDataVersion:OFFICIAL_DATA_VERSION,
      starts:applyOfficial?clone(d.starts):Object.assign(d.starts,x.starts||{}),
      otherRatings:applyOfficial?clone(d.otherRatings):Object.assign(d.otherRatings,x.otherRatings||{}),
      scores:Object.assign({},x.scores||{}),
      penalties:Object.assign({},x.penalties||{}),
      customFixtures:Array.isArray(x.customFixtures)?x.customFixtures:[],
      settings:applyOfficial?clone(d.settings):Object.assign(d.settings,x.settings||{})
    };
  }catch{return defaultState()}
}
let state=loadState();
const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
function compFactor(c){return Number(state.settings["factor_"+c]??1)}
function normalized(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[.'’`´\-_/]/g," ").replace(/\b(fc|cf|afc|sc|sv|sk|kv|kvc|krc|rsc|rc|cd|ac|as|ssc|ss|fk|club|royal|royale)\b/g," ").replace(/\s+/g," ").trim()}
const ALIASES={"bayern munich":"FC Bayern München","inter milan":"Internazionale","athletic bilbao":"Athletic Club","atletico madrid":"Atlético de Madrid","sporting lisbon":"Sporting CP","psv eindhoven":"PSV","nec nijmegen":"N.E.C. Nijmegen","st truiden":"STVV","sint truiden":"STVV","union saint gilloise":"Royale Union Saint-Gilloise","union st gilloise":"Royale Union Saint-Gilloise","anderlecht":"RSC Anderlecht","antwerp":"Royal Antwerp FC","gent":"KAA Gent","genk":"KRC Genk","mechelen":"KV Mechelen","kortrijk":"KV Kortrijk","westerlo":"KVC Westerlo","charleroi":"Sporting Charleroi","zulte waregem":"SV Zulte Waregem","beveren":"SK Beveren","lommel":"Lommel SK","standard liege":"Standard de Liège","la louviere":"RAAL La Louvière","paris sg":"Paris Saint-Germain","psg":"Paris Saint-Germain","marseille":"Olympique de Marseille","lyon":"Olympique Lyonnais","monaco":"AS Monaco","ac milan":"Milan","as roma":"Roma"};
function canonicalName(s){const raw=String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[.'’`´\-_/]/g," ").replace(/\s+/g," ").trim();return ALIASES[raw]||s}
function similarity(a,b){a=normalized(canonicalName(a));b=normalized(canonicalName(b));if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return .92;const A=new Set(a.split(" ")),B=new Set(b.split(" "));let n=0;A.forEach(x=>B.has(x)&&n++);return n/new Set([...A,...B]).size}
function otherTeams(){const s=new Set();FIXTURES.filter(f=>COMP[f.competition]?.type==="europe").forEach(f=>{if(!tracked(f.home))s.add(f.home);if(!tracked(f.away))s.add(f.away)});state.customFixtures.filter(f=>COMP[f.competition]?.type==="europe").forEach(f=>{if(!tracked(f.home))s.add(f.home);if(!tracked(f.away))s.add(f.away)});return[...s]}
function otherStartRating(t){return clamp(Number(state.otherRatings[t]??state.settings.externalRating),Number(state.settings.minRating),Number(state.settings.maxRating))}
function startsMap(){const o={};ALL_TRACKED.forEach(t=>o[t]=clamp(Number(state.starts[t]??60),Number(state.settings.minRating),Number(state.settings.maxRating)));otherTeams().forEach(t=>o[t]=otherStartRating(t));return o}
function allFixtures(){return[...FIXTURES,...state.customFixtures.map(f=>({...f,completed:false,source:"manual"}))]}
function scoreValue(f){const s=state.scores[f.id];if(s&&s.h!==""&&s.a!==""){const h=Number(s.h),a=Number(s.a);if(Number.isInteger(h)&&Number.isInteger(a)&&h>=0&&a>=0)return[h,a]}if(f.completed&&Number.isFinite(Number(f.homeScore))&&Number.isFinite(Number(f.awayScore)))return[Number(f.homeScore),Number(f.awayScore)];return null}
function penaltyValue(f){return state.penalties[f.id]||f.penaltyWinner||""}
function expectation(a,b){return 1/(1+Math.pow(10,(b-a)/Number(state.settings.scale)))}
function scoreOutcome(h,a){return h>a?[1,0]:h<a?[0,1]:[.5,.5]}
function marginMultiplier(h,a){const d=Math.abs(h-a);return Number(state.settings["margin"+Math.min(5,Math.max(1,d))])}
function strengthFactor(rh,ra,h,a){if(h===a||Math.abs(rh-ra)<1e-9)return 1;const strongerHome=rh>ra,homeWon=h>a;return ((strongerHome&&homeWon)||(!strongerHome&&!homeWon))?Number(state.settings.favoriteFactor):Number(state.settings.upsetFactor)}
function venueFactor(home,h,a,delta){const s=state.settings;if(h>a)return home?Number(s.homeWinFactor):Number(s.awayLossFactor);if(h<a)return home?Number(s.homeLossFactor):Number(s.awayWinFactor);if(delta>0)return home?Number(s.homeDrawGainFactor):Number(s.awayDrawGainFactor);if(delta<0)return home?Number(s.homeDrawLossFactor):Number(s.awayDrawLossFactor);return 1}
function damp(delta,r){const s=state.settings,g=Number(s.goodThreshold),t=Number(s.topThreshold),e=Number(s.eliteThreshold);if(delta>0){let f=1;if(e>0&&r>=e)f*=Number(s.eliteWinFactor);else if(t>0&&r>=t)f*=Number(s.topWinFactor);else if(g>0&&r>=g)f*=Number(s.goodWinFactor);return delta*f}if(delta<0){let f=1;if(e>0&&r>=e)f*=Number(s.eliteLossFactor);else if(t>0&&r>=t)f*=Number(s.topLossFactor);else if(g>0&&r>=g)f*=Number(s.goodLossFactor);return delta*f}return 0}
function chronological(fs=allFixtures()){return[...fs].sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.kickoff||"").localeCompare(b.kickoff||"")||a.id.localeCompare(b.id))}
function recalc(cutoff=null){const ratings=startsMap(),stats=Object.fromEntries(ALL_TRACKED.map(t=>[t,{g:0,w:0,d:0,l:0,gf:0,ga:0}])),domesticStats=clone(stats),details={};const other=new Set(otherTeams());for(const f of chronological()){if(cutoff&&f.date>cutoff)continue;const sc=scoreValue(f);if(!sc)continue;const [hg,ag]=sc,hr=tracked(f.home)||other.has(f.home),ar=tracked(f.away)||other.has(f.away);if(!hr&&!ar)continue;const rh=hr?ratings[f.home]:Number(state.settings.externalRating),ra=ar?ratings[f.away]:Number(state.settings.externalRating),eh=expectation(rh,ra),ea=1-eh,[sh,sa]=scoreOutcome(hg,ag),m=marginMultiplier(hg,ag),str=strengthFactor(rh,ra,hg,ag),cf=compFactor(f.competition),rawH=Number(state.settings.k)*(sh-eh)*m*str*cf,rawA=Number(state.settings.k)*(sa-ea)*m*str*cf,vh=venueFactor(true,hg,ag,rawH),va=venueFactor(false,hg,ag,rawA);let dh=hr?damp(rawH*vh,rh):0,da=ar?damp(rawA*va,ra):0,ph=0,pa=0;const pen=hg===ag?penaltyValue(f):"";if(pen==="home"||pen==="away"){const hh=pen==="home"?1:0,aa=pen==="home"?0:1,[psh,psa]=scoreOutcome(hh,aa),pm=Number(state.settings.margin1),pst=strengthFactor(rh,ra,hh,aa),prh=Number(state.settings.k)*(psh-eh)*pm*pst*cf,pra=Number(state.settings.k)*(psa-ea)*pm*pst*cf;ph=hr?.1*damp(prh*venueFactor(true,hh,aa,prh),rh):0;pa=ar?.1*damp(pra*venueFactor(false,hh,aa,pra),ra):0;dh+=ph;da+=pa}const min=Number(state.settings.minRating),max=Number(state.settings.maxRating);if(hr)ratings[f.home]=clamp(rh+dh,min,max);if(ar)ratings[f.away]=clamp(ra+da,min,max);details[f.id]={rh,ra,nh:hr?ratings[f.home]:rh,na:ar?ratings[f.away]:ra,dh:hr?ratings[f.home]-rh:0,da:ar?ratings[f.away]-ra:0,eh,ea,m,str,cf,vh,va,pen,ph,pa,hg,ag};for(const [team,home] of [[f.home,true],[f.away,false]])if(tracked(team)){const s=stats[team],gf=home?hg:ag,ga=home?ag:hg;s.g++;s.gf+=gf;s.ga+=ga;gf>ga?s.w++:gf<ga?s.l++:s.d++;if(f.competition===teamLeague(team)){const d=domesticStats[team];d.g++;d.gf+=gf;d.ga+=ga;gf>ga?d.w++:gf<ga?d.l++:d.d++}}}return{ratings,stats,domesticStats,details}}
function ordered(a,r){return[...a].sort((x,y)=>(r[y]??-999)-(r[x]??-999)||x.localeCompare(y,"en"))}
function lastRoundDate(c,r){const a=allFixtures().filter(f=>f.competition===c&&Number(f.round)===Number(r));return a.length?a.map(f=>f.date).sort().at(-1):null}
function prevRoundDate(c,r){return Number(r)<=1?"1900-01-01":lastRoundDate(c,Number(r)-1)||"1900-01-01"}
function worldWeekInfo(){const ds=allFixtures().map(f=>f.date).filter(Boolean).sort();if(!ds.length)return null;const first=ds[0],last=ds.at(-1),n=Math.floor((parseUTC(last)-parseUTC(first))/86400000/7)+1;return{first,last,weeks:n}}
function worldWeekBounds(n){const i=worldWeekInfo();if(!i)return null;return{start:addDaysISO(i.first,(n-1)*7),end:addDaysISO(i.first,n*7-1),prevEnd:addDaysISO(i.first,(n-1)*7-1)}}
function relevantTeams(c){if(COMP[c].type==="domestic")return TEAMS_BY_LEAGUE[c];const s=new Set();allFixtures().filter(f=>f.competition===c).forEach(f=>{s.add(f.home);s.add(f.away)});return[...s]}
function playedGames(team,cutoff=null){const c=recalc(cutoff);return chronological().filter(f=>(f.home===team||f.away===team)&&(!cutoff||f.date<=cutoff)&&scoreValue(f)&&c.details[f.id]).map(f=>({f,d:c.details[f.id],s:scoreValue(f)}))}
async function loadFixtures(){const r=await fetch(`matches.json?v=${Date.now()}`,{cache:"no-store"});if(!r.ok)throw new Error(`matches.json ${r.status}`);const d=await r.json();FIXTURES=(d.fixtures||[]).map(x=>({...x,id:`espn|${x.competition}|${x.sourceEventId}`}));return d}
function findNewFixture(oldId){const p=oldId.split("|");if(p[0]!=="base")return null;let c,date,round,home,away;if(p.length>=6&&/^\d{4}-\d\d-\d\d$/.test(p[3])){c=p[1];date=p[3];home=p[4];away=p.slice(5).join("|")}else{c=p[1];round=Number(p[2]);home=p[3];away=p.slice(4).join("|")}let best=null,bs=0;for(const f of FIXTURES.filter(x=>x.competition===c)){if(date&&Math.abs((parseUTC(f.date)-parseUTC(date))/86400000)>1)continue;if(round&&f.round&&Number(f.round)!==round)continue;const s=(similarity(home,f.home)+similarity(away,f.away))/2;if(s>bs){bs=s;best=f}}return bs>=.62?best:null}
function importState(x){
  const d=defaultState();
  state={
    officialDataVersion:OFFICIAL_DATA_VERSION,
    starts:Object.assign(d.starts,x.starts||{}),
    otherRatings:Object.assign(d.otherRatings,x.otherRatings||{}),
    scores:{},
    penalties:{},
    customFixtures:Array.isArray(x.customFixtures)?x.customFixtures:[],
    settings:Object.assign(d.settings,x.settings||{})
  };
  for(const [id,v] of Object.entries(x.scores||{})){
    if(id.startsWith("custom|"))state.scores[id]=v;
    else{const f=FIXTURES.find(x=>x.id===id)||findNewFixture(id);if(f)state.scores[f.id]=v}
  }
  for(const [id,v] of Object.entries(x.penalties||{})){
    if(id.startsWith("custom|"))state.penalties[id]=v;
    else{const f=FIXTURES.find(x=>x.id===id)||findNewFixture(id);if(f)state.penalties[f.id]=v}
  }
  save();
}
