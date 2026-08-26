// UI diagnostics and visual fixes layered on top of the main app.

(function(){
  const style=document.createElement("style");
  style.textContent=`
    .delta-positive{color:var(--good)!important;font-weight:900}
    .delta-negative{color:var(--bad)!important;font-weight:900}
    .delta-neutral{color:var(--muted)!important;font-weight:800}
    .zero-impact-warning{display:block;margin-top:6px;padding:6px 8px;border:1px solid #715e2e;border-radius:8px;background:#2a2414;color:#ffe6a3;font-size:11px;line-height:1.35}
  `;
  document.head.appendChild(style);
})();

function deltaClass(v){return v>1e-9?"delta-positive":v<-1e-9?"delta-negative":"delta-neutral"}

const __openClubBeforeDeltaColors=openClub;
openClub=function(team){
  __openClubBeforeDeltaColors(team);
  const overlay=$("#clubOverlay");
  if(!overlay)return;

  // Colour the summary Rating Δ value.
  overlay.querySelectorAll(".metrics>div").forEach(box=>{
    const label=box.querySelector("small")?.textContent?.trim();
    if(label==="Rating Δ"){
      const value=Number(String(box.querySelector("b")?.textContent||"").replace("+",""));
      const b=box.querySelector("b");if(b)b.classList.add(deltaClass(value));
    }
  });

  // Colour every per-match delta in the club history table.
  overlay.querySelectorAll(".table-wrap tbody tr").forEach(row=>{
    const cell=row.lastElementChild;
    if(!cell)return;
    const value=Number(String(cell.textContent||"").replace("+",""));
    if(Number.isFinite(value))cell.classList.add(deltaClass(value));
  });
};

function activeZeroTierReason(r,positive){
  const s=state.settings;
  const levels=[
    ["Elite",Number(s.eliteThreshold),positive?Number(s.eliteWinFactor):Number(s.eliteLossFactor)],
    ["Top club",Number(s.topThreshold),positive?Number(s.topWinFactor):Number(s.topLossFactor)],
    ["Good club",Number(s.goodThreshold),positive?Number(s.goodWinFactor):Number(s.goodLossFactor)]
  ];
  for(const [name,threshold,factor] of levels){
    if(threshold>0&&r>=threshold)return factor===0?`${name} ${positive?"win":"loss"} factor is ×0`:null;
  }
  return null;
}

function zeroImpactReason(f,d,homeSide){
  if(Number(state.settings.k)===0)return "Reaction speed K is 0 in Management.";
  if(Number(compFactor(f.competition))===0)return `${COMP[f.competition].name} competition weight is ×0 in Management.`;
  const [hg,ag]=scoreValue(f)||[null,null];
  if(hg==null)return null;
  const home=homeSide;
  const won=home?hg>ag:ag>hg;
  const lost=home?hg<ag:ag<hg;
  const rating=home?d.rh:d.ra;
  const expectationSide=home?d.eh:d.ea;
  let positive;
  if(won)positive=true;
  else if(lost)positive=false;
  else positive=(.5-expectationSide)>0;
  const tier=activeZeroTierReason(rating,positive);
  if(tier)return `${tier}.`;
  const venue=home?Number(d.vh):Number(d.va);
  if(venue===0)return `${home?"Home":"Away"} result factor is ×0 in Management.`;
  return null;
}

function visibleCompetitionFixtures(c){
  const q=($(`#${c}-teamFilter`)?.value||"").toLowerCase();
  const r=$(`#${c}-roundFilter`)?.value||"all";
  const open=$(`#${c}-openOnly`)?.checked||false;
  return chronological(allFixtures().filter(f=>f.competition===c)).filter(f=>(r==="all"||String(f.round)===r)&&(!q||f.home.toLowerCase().includes(q)||f.away.toLowerCase().includes(q))&&(!open||!scoreValue(f)));
}

const __renderMatchListBeforeDiagnostics=renderMatchList;
renderMatchList=function(c){
  __renderMatchListBeforeDiagnostics(c);
  const root=$(`#${c}-matchList`);if(!root)return;
  const rows=[...root.querySelectorAll(".match")],fixtures=visibleCompetitionFixtures(c),calc=recalc();
  rows.forEach((row,i)=>{
    const f=fixtures[i];if(!f||!scoreValue(f))return;
    const impact=row.querySelector(".impact");if(!impact)return;
    const d=calc.details[f.id];
    if(!d){
      impact.insertAdjacentHTML("beforeend",`<span class="zero-impact-warning">⚠ This completed result is not linked to a tracked rating. Synced club names: <b>${f.home}</b> / <b>${f.away}</b>. Use Refresh results after the newest site version loads.</span>`);
      return;
    }
    const homeZero=Math.abs(Number(d.dh))<1e-9,awayZero=Math.abs(Number(d.da))<1e-9;
    if(!homeZero&&!awayZero)return;
    // A perfectly even draw between equally rated clubs can legitimately be 0 / 0.
    const sc=scoreValue(f),legitEvenDraw=sc&&sc[0]===sc[1]&&Math.abs(Number(d.rh)-Number(d.ra))<1e-9;
    if(legitEvenDraw)return;
    const reasons=[];
    if(homeZero){const x=zeroImpactReason(f,d,true);if(x)reasons.push(`${f.home}: ${x}`)}
    if(awayZero){const x=zeroImpactReason(f,d,false);if(x)reasons.push(`${f.away}: ${x}`)}
    if(reasons.length)impact.insertAdjacentHTML("beforeend",`<span class="zero-impact-warning">⚠ Zero rating impact detected. ${reasons.join(" ")}</span>`);
  });
};

const __refreshDataBeforeDiagnostics=refreshData;
refreshData=async function(notify=true){
  const result=await __refreshDataBeforeDiagnostics(notify);
  const diag=window.FOOTBALL_NAME_DIAGNOSTICS;
  const status=$("#syncStatus");
  if(status&&diag){
    const extra=`Name links fixed: ${diag.fixedNames}. Unresolved domestic names: ${diag.unresolvedDomestic.length}.`;
    status.title=(status.title?status.title+"\n":"")+extra+(diag.unresolvedDomestic.length?`\n${diag.unresolvedDomestic.slice(0,12).join("\n")}`:"");
  }
  return result;
};
