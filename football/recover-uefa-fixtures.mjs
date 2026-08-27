import fs from "node:fs/promises";

const MATCHES=new URL("./matches.json",import.meta.url);
const AUDIT=new URL("./uefa-audit.json",import.meta.url);

const EXPECTED_QUALIFIER_FIXTURES={ucl:90,uel:80,uecl:258};

const matches=JSON.parse(await fs.readFile(MATCHES,"utf8"));
const audit=JSON.parse(await fs.readFile(AUDIT,"utf8"));
const originalRejected=Array.isArray(audit.rejectedByUefa)?audit.rejectedByUefa:[];
const conflicts=new Set((audit.conflicts||[]).map(x=>String(x.sourceEventId)));

function norm(s){
  return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}
function isAz(name){return /^az(?: alkmaar)?$/.test(norm(name))}
function explicitlyBlocked(f){
  if(conflicts.has(String(f.sourceEventId)))return "cross-competition event conflict";
  if((f.competition==="ucl"||f.competition==="uecl")&&(isAz(f.home)||isAz(f.away)))return "AZ competition invariant";
  return "";
}

const map=new Map((matches.fixtures||[]).map(f=>[`${f.competition}|${f.sourceEventId}`,f]));
const recovered=[],blocked=[];
for(const f of originalRejected){
  const reason=explicitlyBlocked(f);
  if(reason){blocked.push({...f,recoveryBlockReason:reason});continue}
  const key=`${f.competition}|${f.sourceEventId}`;
  const existing=map.get(key);
  // A rejected qualifier came from the competition-specific ESPN endpoint. The old
  // official-text matcher was only an audit heuristic and produced many false negatives
  // because UEFA/ESPN use different club spellings (Union SG, Crvena Zvezda, DAC 1904...).
  // Restore the actual source event instead of silently deleting a real match.
  map.set(key,existing?{...existing,...f}:{...f});
  recovered.push(f);
}

const fixtures=[...map.values()].sort((a,b)=>(a.date||"").localeCompare(b.date||"")||String(a.competition).localeCompare(String(b.competition))||String(a.home).localeCompare(String(b.home)));
matches.fixtures=fixtures;
matches.uefaRecoveredFromFalseValidation=recovered.length;
matches.uefaHardBlocked=blocked.length;
matches.uefaPairingsRejected=blocked.length;

const qualifierCounts={ucl:0,uel:0,uecl:0};
for(const f of fixtures){
  if(!(f.competition in qualifierCounts))continue;
  if(String(f.sourceLeague||"").endsWith("_qual"))qualifierCounts[f.competition]++;
}
const qualifierMissing={};
for(const c of Object.keys(EXPECTED_QUALIFIER_FIXTURES))qualifierMissing[c]=Math.max(0,EXPECTED_QUALIFIER_FIXTURES[c]-qualifierCounts[c]);

// Keep the old false negatives visible as warnings for diagnosis, but no longer remove
// them from the website. Only genuine hard blocks stay in rejectedByUefa.
audit.validationWarnings=originalRejected;
audit.rejectedByUefa=blocked;
audit.recovery={
  policy:"Competition-specific ESPN qualifier events are retained. UEFA text matching is diagnostic only because club-name variants caused false rejections. Cross-competition conflicts and explicit safety invariants remain blocked.",
  recoveredCount:recovered.length,
  hardBlockedCount:blocked.length,
  expectedQualifierFixtures:EXPECTED_QUALIFIER_FIXTURES,
  qualifierCounts,
  qualifierMissing,
  recovered:recovered.map(f=>({competition:f.competition,sourceEventId:f.sourceEventId,date:f.date,home:f.home,away:f.away,completed:f.completed,homeScore:f.homeScore,awayScore:f.awayScore})),
  blocked:blocked.map(f=>({competition:f.competition,sourceEventId:f.sourceEventId,date:f.date,home:f.home,away:f.away,recoveryBlockReason:f.recoveryBlockReason}))
};

await fs.writeFile(MATCHES,JSON.stringify(matches,null,2)+"\n");
await fs.writeFile(AUDIT,JSON.stringify(audit,null,2)+"\n");
console.log(`Recovered ${recovered.length} UEFA qualifier events previously rejected by the text matcher; hard-blocked ${blocked.length}.`);
console.log("Qualifier counts:",qualifierCounts,"expected:",EXPECTED_QUALIFIER_FIXTURES,"missing:",qualifierMissing);
