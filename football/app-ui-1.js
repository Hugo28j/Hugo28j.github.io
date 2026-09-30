const $=s=>document.querySelector(s);
function movement(n){return n>0?`<span class="up">▲ +${n}</span>`:n<0?`<span class="down">▼ ${n}</span>`:`<span class="muted">—</span>`}
function activateCompetitionTab(c,s="standings"){
  const panel=$("#main-"+c);if(!panel)return;
  panel.querySelectorAll("[data-sub]").forEach(x=>x.classList.remove("active"));
  panel.querySelectorAll(".subpanel").forEach(x=>x.classList.remove("active"));
  panel.querySelector(`[data-sub="${c}|${s}"]`)?.classList.add("active");
  $(`#${c}-${s}`)?.classList.add("active");
}
function showPanel(k){
  document.querySelectorAll(".main-panel").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".nav-action").forEach(x=>x.classList.remove("active"));
  if(COMP[k]){
    ACTIVE_COMP=k;
    $("#main-"+k).classList.add("active");
    activateCompetitionTab(k,"standings");
    renderCompetition(k);
    updatePicker();
  }else if(k==="world"||k==="compare"){
    $("#main-"+k).classList.add("active");
    document.querySelector(`.nav-action[data-main="${k}"]`)?.classList.add("active");
    k==="world"?renderWorld():renderCompare();
  }
  $("#compMenu")?.classList.remove("open");
}
function updatePicker(){$("#pickerName").textContent=COMP[ACTIVE_COMP].name;$("#pickerMeta").textContent=COMP[ACTIVE_COMP].type==="europe"?"UEFA":COMP[ACTIVE_COMP].country;document.querySelectorAll("[data-comp-pick]").forEach(b=>b.classList.toggle("active",b.dataset.compPick===ACTIVE_COMP))}
function competitionPanel(c){const e=COMP[c].type==="europe";return`<section id="main-${c}" class="main-panel"><div class="page-head"><div><span>${e?"UEFA":COMP[c].country}</span><h2>${COMP[c].name}</h2></div><b>×${compFactor(c).toFixed(2)}</b></div><nav class="subtabs"><button data-sub="${c}|standings" class="active">Standings</button><button data-sub="${c}|matches">Fixtures</button></nav><div id="${c}-standings" class="subpanel active"></div><div id="${c}-matches" class="subpanel"></div></section>`}
function buildShell(){
  const u=UEFA_NAV_ORDER.map(c=>`<button data-comp-pick="${c}"><span>${COMP[c].name}</span><small>UEFA</small></button>`).join(""),
    countries=COUNTRY_NAV_ORDER.map(([country,c])=>`<button data-comp-pick="${c}"><span>${country}</span><small>${COMP[c].name}</small></button>`).join("");
  $("#mainNav").innerHTML=`<div class="picker"><button id="pickerBtn"><span><strong id="pickerName"></strong><small id="pickerMeta"></small></span><b>⌄</b></button><div id="compMenu"><h4>UEFA competitions</h4>${u}<h4>Countries</h4>${countries}</div></div><button class="nav-action" data-main="world">World Ranking</button><button class="nav-action" data-main="compare">Compare</button>`;
  $("#panels").innerHTML=COMP_ORDER.map(competitionPanel).join("")+worldPanel()+comparePanel();
  $("#pickerBtn").onclick=e=>{e.stopPropagation();$("#compMenu").classList.toggle("open")};
  document.querySelectorAll("[data-comp-pick]").forEach(b=>b.onclick=()=>showPanel(b.dataset.compPick));
  document.querySelectorAll(".nav-action").forEach(b=>b.onclick=()=>showPanel(b.dataset.main));
  document.querySelectorAll("[data-sub]").forEach(b=>b.onclick=()=>{
    const[c,s]=b.dataset.sub.split("|");
    activateCompetitionTab(c,s);
    renderCompetition(c);
  });
  document.addEventListener("click",e=>{if(!e.target.closest(".picker"))$("#compMenu")?.classList.remove("open")});
  updatePicker();
}
function renderCompetition(c){
  const s=document.querySelector(`#main-${c} [data-sub].active`)?.dataset.sub.split("|")[1]||"standings";
  s==="matches"?renderMatches(c):renderStandings(c);
}
