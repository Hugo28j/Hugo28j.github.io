function renderManagement(){
  document.querySelectorAll("[data-set]").forEach(e=>e.value=state.settings[e.dataset.set]);
  $("#saveSettings").onclick=()=>{
    const n={...state.settings};
    for(const e of document.querySelectorAll("[data-set]"))n[e.dataset.set]=Number(e.value);
    if(n.maxRating<=n.minRating)return alert("Maximum rating must be higher than minimum rating.");
    state.settings=n;save();alert("Settings saved.");renderManagement();
  };
  $("#resetSettings").onclick=()=>{if(confirm("Restore formula defaults?")){state.settings=clone(DEFAULT_SETTINGS);state.officialDataVersion=OFFICIAL_DATA_VERSION;save();renderManagement()}};
  $("#customAdd").onclick=()=>{
    const c=$("#customComp").value,date=$("#customDate").value,time=$("#customTime").value||"20:00",home=$("#customHome").value.trim(),away=$("#customAway").value.trim();
    if(!date||!home||!away)return alert("Enter date, home club and away club.");
    state.customFixtures.push({id:`custom|${Date.now()}`,competition:c,date,time,home,away,stage:"Manual"});save();renderManagement();
  };
  $("#customList").innerHTML=state.customFixtures.map(f=>`<div class="custom-row">${niceDate(f.date)} · ${COMP[f.competition].short} · ${f.home} – ${f.away}<button data-del="${f.id}">Remove</button></div>`).join("");
  $("#customList").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{state.customFixtures=state.customFixtures.filter(f=>f.id!==b.dataset.del);delete state.scores[b.dataset.del];delete state.penalties[b.dataset.del];save();renderManagement()});
  $("#clearScores").onclick=()=>{if(confirm("Clear only your manual score overrides? Automatic final scores will still appear.")){state.scores={};state.penalties={};save();alert("Manual overrides cleared.")}};
  $("#resetStarts").onclick=()=>{if(confirm("Restore starting ratings?")){state.starts=clone(DEFAULT_STARTS);state.otherRatings=clone(DEFAULT_OTHER_RATINGS);state.officialDataVersion=OFFICIAL_DATA_VERSION;save();renderManagement()}};
}

// Positions are calculated from the same historical coefficient snapshots as the chart.
function clubRankingHistory(team){
  const points=timeline();
  const league=teamLeague(team);
  const teams=league?(TEAMS_BY_LEAGUE[league]||[]):[];
  if(teams.includes(team)){
    for(const point of points)point.leaguePosition=ordered(teams,point.r).indexOf(team)+1;
  }
  return points;
}
function bestClubPosition(points,selector){
  const ranks=points.map(selector).filter(n=>Number.isInteger(n)&&n>=1);
  return ranks.length?Math.min(...ranks):null;
}

function openClub(team){
  const calc=recalc(),ranked=tracked(team),world=ordered(ALL_TRACKED,calc.ratings),league=teamLeague(team),lr=league?ordered(TEAMS_BY_LEAGUE[league],calc.ratings):[],games=playedGames(team),start=startsMap()[team]??otherStartRating(team),current=calc.ratings[team]??start;
  const points=clubRankingHistory(team);
  const bestWorld=ranked?bestClubPosition(points,p=>p.p?.[team]):null;
  const bestLeague=league?bestClubPosition(points,p=>p.leaguePosition):null;
  let st={g:0,w:0,d:0,l:0,gf:0,ga:0};
  games.forEach(({f,s})=>{const home=f.home===team,gf=home?s[0]:s[1],ga=home?s[1]:s[0];st.g++;st.gf+=gf;st.ga+=ga;gf>ga?st.w++:gf<ga?st.l++:st.d++});

  const o=$("#clubOverlay");
  o.innerHTML=`<div class="modal">
    <div class="modal-head">
      <div><small>${ranked?COMP[league].country+" · "+COMP[league].name:"UEFA-only club"}</small><h2>${team}</h2></div>
      <button id="closeClub">Close</button>
    </div>
    <div class="metrics">
      <div><small>Rating</small><b>${fmt(current)}</b></div>
      <div><small>Matches</small><b>${st.g}</b></div>
      <div><small>W-D-L</small><b>${st.w}-${st.d}-${st.l}</b></div>
      <div><small>Goals</small><b>${st.gf}-${st.ga}</b></div>
      <div><small>World rank</small><b>${ranked?"#"+(world.indexOf(team)+1):"Not ranked"}</b></div>
      <div><small>Highest world rank</small><b>${bestWorld?"#"+bestWorld:"—"}</b></div>
      <div><small>League rank</small><b>${league?"#"+(lr.indexOf(team)+1):"UEFA only"}</b></div>
      <div><small>Highest league rank</small><b>${bestLeague?"#"+bestLeague:"—"}</b></div>
    </div>
    <div class="card" style="margin:14px 0;padding:12px">
      <div class="filters" style="margin-bottom:8px">
        <label><b>Chart</b>
          <select id="clubChartMode">
            <option value="rating">Rating / coefficient over time</option>
            ${ranked?'<option value="rank">World rank over time</option>':''}
            ${bestLeague?'<option value="league">League rank over time</option>':''}
          </select>
        </label>
        <span id="clubChartHint" class="muted">Rating after each day with an entered or automatic final result.</span>
      </div>
      <canvas id="clubChart"></canvas>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Date</th><th>Competition</th><th>Opponent</th><th>Score</th><th>Rating</th><th>Δ</th></tr></thead><tbody>${games.map(({f,d,s})=>{const home=f.home===team;return`<tr><td>${niceDate(f.date)}</td><td>${COMP[f.competition].short}</td><td>${home?f.away:f.home}</td><td>${s[0]}-${s[1]}</td><td>${fmt(home?d.nh:d.na)}</td><td>${signfmt(home?d.dh:d.da)}</td></tr>`}).join("")||'<tr><td colspan="6">No entered or automatic final results yet.</td></tr>'}</tbody></table></div>
  </div>`;
  o.hidden=false;
  $("#closeClub").onclick=closeClub;
  o.onclick=e=>{if(e.target===o)closeClub()};

  const mode=$("#clubChartMode");
  const draw=()=>{
    const selected=mode.value;
    $("#clubChartHint").textContent=selected==="rank"
      ?"World rank after each day with a completed result. A lower number is better; the axis follows the club's actual ranking range."
      :selected==="league"?"Position within the club's league after each completed day. A lower number is better."
      :"Rating / coefficient after each day with a completed result.";
    requestAnimationFrame(()=>drawClubChart(points,team,selected));
  };
  mode.onchange=draw;
  draw();
}

function closeClub(){$("#clubOverlay").hidden=true;$("#clubOverlay").innerHTML=""}

function drawClubChart(points,team,mode="rating"){
  const c=$("#clubChart");if(!c)return;
  const ctx=c.getContext("2d"),W=Math.max(600,c.getBoundingClientRect().width),H=350,dpr=devicePixelRatio||1;
  c.width=W*dpr;c.height=H*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
  const isRank=mode==="rank"||mode==="league";
  const series=points.map(p=>({
    date:p.date,value:mode==="rank"?p.p?.[team]:mode==="league"?p.leaguePosition:p.r?.[team]
  })).filter(p=>Number.isFinite(p.value));
  if(!series.length){ctx.fillStyle="#95a6c7";ctx.font="14px system-ui";ctx.fillText("No chart data available yet.",20,35);return}
  const xs=series.map(x=>parseUTC(x.date).getTime()),minX=Math.min(...xs),maxX=Math.max(...xs,Math.min(...xs)+86400000);
  let minY,maxY;
  if(isRank){
    const best=Math.min(...series.map(x=>x.value)),worst=Math.max(...series.map(x=>x.value));
    const margin=Math.max(1,Math.ceil((worst-best)*0.08));
    const maxPossible=mode==="rank"?ALL_TRACKED.length:(TEAMS_BY_LEAGUE[teamLeague(team)]||[]).length;
    // #1 is best; zoom to THIS club's observed range rather than always #1.
    minY=Math.max(1,best-margin);
    maxY=Math.min(maxPossible,worst+margin);
    if(maxY<=minY){minY=Math.max(1,minY-1);maxY=Math.min(maxPossible,minY+2);}
  }else{
    minY=Math.min(...series.map(x=>x.value))-1;maxY=Math.max(...series.map(x=>x.value))+1;
    if(maxY-minY<4){minY-=2;maxY+=2}
  }
  const x=v=>50+(v-minX)/(maxX-minX)*(W-70);
  const y=v=>isRank?20+(v-minY)/(maxY-minY)*(H-55):20+(maxY-v)/(maxY-minY)*(H-55);
  ctx.strokeStyle="#263756";ctx.fillStyle="#95a6c7";ctx.font="11px system-ui";ctx.lineWidth=1;
  const axisTicks=isRank?Math.min(5,maxY-minY+1):5;
  for(let i=0;i<axisTicks;i++){
    const v=isRank?Math.round(minY+(maxY-minY)*i/Math.max(1,axisTicks-1)):minY+(maxY-minY)*i/4,yy=y(v);
    ctx.beginPath();ctx.moveTo(50,yy);ctx.lineTo(W-20,yy);ctx.stroke();
    ctx.fillText(isRank?"#"+v:v.toFixed(1),5,yy+4);
  }
  ctx.strokeStyle="#74a9ff";ctx.lineWidth=2.5;ctx.beginPath();
  series.forEach((p,i)=>{const xx=x(parseUTC(p.date).getTime()),yy=y(p.value);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.stroke();
  ctx.fillStyle="#74a9ff";
  series.forEach(p=>{const xx=x(parseUTC(p.date).getTime()),yy=y(p.value);ctx.beginPath();ctx.arc(xx,yy,2.7,0,Math.PI*2);ctx.fill()});
  ctx.fillStyle="#95a6c7";
  const ticks=Math.min(6,series.length);
  for(let i=0;i<ticks;i++){
    const idx=Math.round(i*(series.length-1)/Math.max(1,ticks-1)),p=series[idx],xx=x(parseUTC(p.date).getTime());
    ctx.fillText(niceDate(p.date).replace(/ 20\d\d/,""),Math.max(2,Math.min(W-75,xx-24)),H-12);
  }
}

async function refreshData(notify=true){const b=$("#refreshBtn"),s=$("#syncStatus");try{b.disabled=true;s.textContent="Refreshing…";const d=await loadFixtures();s.textContent=`Synced ${d.generatedAt?new Date(d.generatedAt).toLocaleString():"waiting for first sync"} · ${FIXTURES.length} fixtures`;s.className="badge ok";const active=document.querySelector(".main-panel.active")?.id.replace("main-","");if(COMP[active])renderCompetition(active);else active==="world"?renderWorld():active==="compare"?renderCompare():renderManagement();if(notify)alert(`Refresh complete: ${FIXTURES.length} fixtures loaded.`)}catch(e){s.textContent="Score sync unavailable";s.className="badge warn";if(notify)alert("Could not refresh score data yet. Run the GitHub full sync and try again.")}finally{b.disabled=false}}

function setupDataButtons(){
  $("#refreshBtn").onclick=()=>refreshData(true);
  $("#fullSyncBtn").onclick=()=>window.open(SCORE_SYNC_WORKFLOW,"_blank","noopener");
  $("#exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="club-rating-backup.json";a.click();URL.revokeObjectURL(a.href)};
  $("#importFile").onchange=async e=>{try{const x=JSON.parse(await e.target.files[0].text());importState(x);alert("Import completed. Old fixture IDs were migrated where possible.");showPanel("world")}catch{alert("Invalid backup file.")}};
  document.addEventListener("keydown",e=>e.key==="Escape"&&closeClub());
}

async function init(){
  buildShell();setupDataButtons();
  try{const d=await loadFixtures();$("#syncStatus").textContent=d.generatedAt?`Synced ${new Date(d.generatedAt).toLocaleString()} · ${FIXTURES.length} fixtures`:"Waiting for first automatic sync";$("#syncStatus").classList.add(d.generatedAt?"ok":"warn")}
  catch{$("#syncStatus").textContent="Waiting for first automatic sync";$("#syncStatus").classList.add("warn")}
  showPanel("world");
}
init();
