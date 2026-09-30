function renderTeams(c){const root=$(`#${c}-teams`),calc=recalc(),a=ordered(relevantTeams(c),calc.ratings);root.innerHTML=`<div class="card"><div class="section-title"><h3>${COMP[c].name} teams</h3><span>${a.length} clubs</span></div><p>${COMP[c].type==="europe"?"UEFA-only clubs can be assigned their own starting rating here and remain outside the World Ranking.":"Edit each tracked club's starting rating."}</p><div class="team-grid" id="${c}-teamGrid"></div></div>`;const g=$(`#${c}-teamGrid`);a.forEach(t=>{const tr=tracked(t),edit=COMP[c].type==="domestic"||!tr;if(!tr&&state.otherRatings[t]==null)state.otherRatings[t]=state.settings.externalRating;const start=tr?state.starts[t]:otherStartRating(t),cur=calc.ratings[t]??start,el=document.createElement("div");el.className="team-card";el.innerHTML=`<div><button class="club-link">${t}</button><small>${tr?(teamLeague(t)?COMP[teamLeague(t)].name:"Tracked club"):"UEFA-only club"}</small></div><input type="number" step=".01" value="${fmt(start)}" ${edit?"":"disabled"}><div><small>Current</small><b>${fmt(cur)}</b></div>`;el.querySelector(".club-link").onclick=()=>openClub(t);if(edit)el.querySelector("input").onchange=e=>{const v=clamp(Number(e.target.value)||state.settings.externalRating,state.settings.minRating,state.settings.maxRating);tr?state.starts[t]=v:state.otherRatings[t]=v;save();renderTeams(c)};g.appendChild(el)});save()}
function scoreSource(f){return state.scores[f.id]?"manual":f.completed?"auto":""}
function fixtureMoment(f){
  if(f?.kickoff){const t=Date.parse(f.kickoff);if(Number.isFinite(t))return t}
  if(!f?.date)return Infinity;
  const time=/^\d{1,2}:\d{2}$/.test(String(f.time||""))?f.time:"23:59";
  const t=Date.parse(`${f.date}T${time}:00`);
  return Number.isFinite(t)?t:Date.parse(`${f.date}T23:59:59`);
}
function renderMatches(c){
  const root=$(`#${c}-matches`),oldTeam=$(`#${c}-teamFilter`)?.value||"",oldRound=$(`#${c}-roundFilter`)?.value||"all",oldOpen=$(`#${c}-openOnly`)?.checked||false,
    a=allFixtures().filter(f=>f.competition===c),rounds=[...new Set(a.map(f=>f.round).filter(Boolean))].sort((x,y)=>x-y);
  root.innerHTML=`<div class="card filters">${rounds.length?`<select id="${c}-roundFilter"><option value="all">All matchdays</option>${rounds.map(r=>`<option value="${r}">Matchday ${r}</option>`).join("")}</select>`:""}<input id="${c}-teamFilter" placeholder="Search club…"><label><input id="${c}-openOnly" type="checkbox"> unentered only</label></div><div id="${c}-matchList"></div>`;
  if(rounds.length)$(`#${c}-roundFilter`).value=oldRound;
  $(`#${c}-teamFilter`).value=oldTeam;$(`#${c}-openOnly`).checked=oldOpen;
  [...root.querySelectorAll("select,input")].forEach(x=>x.oninput=()=>renderMatchList(c,false));
  renderMatchList(c,true);
}
function renderMatchList(c,autoScroll=false){
  const q=($(`#${c}-teamFilter`)?.value||"").toLowerCase(),r=$(`#${c}-roundFilter`)?.value||"all",open=$(`#${c}-openOnly`)?.checked||false,calc=recalc(),
    a=chronological(allFixtures().filter(f=>f.competition===c)).filter(f=>(r==="all"||String(f.round)===r)&&(!q||f.home.toLowerCase().includes(q)||f.away.toLowerCase().includes(q))&&(!open||!scoreValue(f))),
    root=$(`#${c}-matchList`);
  if(!a.length){root.innerHTML='<div class="card muted">No matches for this filter.</div>';return}
  const now=Date.now();
  const next=a.find(f=>!scoreValue(f)&&!f.postponed&&fixtureMoment(f)>=now)||
    a.find(f=>!scoreValue(f)&&!f.postponed&&f.date>=new Date().toISOString().slice(0,10));
  root.innerHTML="";let last="",nextEl=null;
  for(const f of a){
    const group=f.round?`Matchday ${f.round}`:(f.stage||niceDate(f.date));
    if(group!==last){root.insertAdjacentHTML("beforeend",`<h3 class="round-title">${group}</h3>`);last=group}
    const s=scoreValue(f),manual=state.scores[f.id],h=manual?.h??(f.completed?f.homeScore:""),aa=manual?.a??(f.completed?f.awayScore:""),d=calc.details[f.id],pen=penaltyValue(f),
      tied=h!==""&&aa!==""&&Number(h)===Number(aa),el=document.createElement("div");
    el.className="match"+(s?" scored":"")+(f===next?" next-fixture":"");
    el.innerHTML=`<div class="date">${niceDate(f.date)}<small>${f.time||""}</small><em>${f===next?"next":(scoreSource(f)||"scheduled")}</em></div><div class="home">${f.home}</div><div class="score"><div><input type="number" min="0" value="${h}"><b>–</b><input type="number" min="0" value="${aa}"></div>${tied?`<select><option value="">No shoot-out</option><option value="home" ${pen==="home"?"selected":""}>${f.home} wins pens</option><option value="away" ${pen==="away"?"selected":""}>${f.away} wins pens</option></select>`:""}</div><div>${f.away}</div><div class="impact">${d?`${fmt(d.rh)} → <b>${fmt(d.nh)}</b> <span class="${d.dh>=0?"up":"down"}">${signfmt(d.dh)}</span><br>${fmt(d.ra)} → <b>${fmt(d.na)}</b> <span class="${d.da>=0?"up":"down"}">${signfmt(d.da)}</span>`:"Enter a result to calculate impact."}</div>`;
    const ins=el.querySelectorAll(".score input");
    ins.forEach(x=>x.onchange=()=>{const hv=ins[0].value,av=ins[1].value;if(hv===""&&av===""){delete state.scores[f.id];delete state.penalties[f.id]}else{state.scores[f.id]={h:hv,a:av};if(hv!==""&&av!==""&&Number(hv)!==Number(av))delete state.penalties[f.id]}save();renderMatchList(c,false)});
    el.querySelector(".score select")?.addEventListener("change",e=>{e.target.value?state.penalties[f.id]=e.target.value:delete state.penalties[f.id];save();renderMatchList(c,false)});
    root.appendChild(el);if(f===next)nextEl=el;
  }
  if(autoScroll&&nextEl)requestAnimationFrame(()=>nextEl.scrollIntoView({behavior:"auto",block:"center"}));
}
const EUROPE_PHASE_BOUNDS={
  ucl:["2026-09-08","2027-01-27"],
  uel:["2026-09-16","2027-01-28"],
  uecl:["2026-10-15","2026-12-17"]
};
function renderEuropeanStandings(c){
  const root=$(`#${c}-standings`),bounds=EUROPE_PHASE_BOUNDS[c]||["0000-01-01","9999-12-31"],
    fs=chronological(allFixtures().filter(f=>f.competition===c&&f.date>=bounds[0]&&f.date<=bounds[1]&&!String(f.sourceLeague||"").endsWith("_qual"))),
    teams=[...new Set(fs.flatMap(f=>[canonicalName(f.home),canonicalName(f.away)]).filter(Boolean))];
  if(!teams.length){
    root.innerHTML=`<div class="card"><div class="section-title"><h3>${COMP[c].name} standings</h3></div><p class="muted">No league-phase fixtures are available yet.</p></div>`;
    return;
  }
  const stats=Object.fromEntries(teams.map(t=>[t,{mp:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}])),calc=recalc();
  for(const f of fs){
    const h=canonicalName(f.home),a=canonicalName(f.away),score=scoreValue(f);if(!score||!stats[h]||!stats[a])continue;
    const [hg,ag]=score,H=stats[h],A=stats[a];H.mp++;A.mp++;H.gf+=hg;H.ga+=ag;A.gf+=ag;A.ga+=hg;
    if(hg>ag){H.w++;A.l++;H.pts+=3}else if(hg<ag){A.w++;H.l++;A.pts+=3}else{H.d++;A.d++;H.pts++;A.pts++}
  }
  const rows=[...teams].sort((a,b)=>{const A=stats[a],B=stats[b],gdA=A.gf-A.ga,gdB=B.gf-B.ga;return B.pts-A.pts||gdB-gdA||B.gf-A.gf||B.w-A.w||(Number(calc.ratings[b])||0)-(Number(calc.ratings[a])||0)||a.localeCompare(b,"en")});
  root.innerHTML=`<div class="card"><div class="section-title"><h3>${COMP[c].name} standings</h3><span>${rows.length} clubs</span></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Club</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody id="${c}-europeBody"></tbody></table></div></div>`;
  const body=$(`#${c}-europeBody`);
  rows.forEach((t,i)=>{const s=stats[t],gd=s.gf-s.ga,tr=document.createElement("tr");tr.innerHTML=`<td>${i+1}</td><td><button class="club-link">${t}</button></td><td>${s.mp}</td><td>${s.w}</td><td>${s.d}</td><td>${s.l}</td><td>${s.gf}</td><td>${s.ga}</td><td>${gd>0?"+":""}${gd}</td><td><b>${s.pts}</b></td>`;tr.querySelector(".club-link").onclick=()=>openClub(t);body.appendChild(tr)});
}
function renderStandings(c){if(COMP[c].type==="europe")return renderEuropeanStandings(c);const root=$(`#${c}-standings`),old=$(`#${c}-period`)?.value||"all",rounds=[...new Set(allFixtures().filter(f=>f.competition===c).map(f=>f.round).filter(Boolean))].sort((a,b)=>a-b);root.innerHTML=`<div class="card filters"><select id="${c}-period"><option value="all">Overall / current</option>${rounds.map(r=>`<option value="${r}">Matchday ${r}</option>`).join("")}</select></div><div class="card"><table><thead id="${c}-head"></thead><tbody id="${c}-body"></tbody></table></div>`;if([...$(`#${c}-period`).options].some(o=>o.value===old))$(`#${c}-period`).value=old;$(`#${c}-period`).onchange=()=>renderStandingRows(c);renderStandingRows(c)}
function renderStandingRows(c){const p=$(`#${c}-period`).value,teams=TEAMS_BY_LEAGUE[c];let after,before=null;if(p==="all")after=recalc();else{const d=lastRoundDate(c,p);after=recalc(d);before=recalc(prevRoundDate(c,p))}const world=ordered(ALL_TRACKED,after.ratings),wp=Object.fromEntries(world.map((t,i)=>[t,i+1])),rows=ordered(teams,after.ratings),body=$(`#${c}-body`);$(`#${c}-head`).innerHTML=p==="all"?'<tr><th># League</th><th># World</th><th>Club</th><th>Rating</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th></tr>':'<tr><th># League</th><th># World</th><th>Club</th><th>Rating</th><th>Δ</th><th>Move</th><th>MP</th><th>W</th><th>D</th><th>L</th></tr>';let bp={};if(before)ordered(teams,before.ratings).forEach((t,i)=>bp[t]=i+1);body.innerHTML="";rows.forEach((t,i)=>{const s=after.domesticStats[t],tr=document.createElement("tr"),club=`<button class="club-link">${t}</button>`;if(p==="all"){const gd=s.gf-s.ga;tr.innerHTML=`<td>${i+1}</td><td>${wp[t]}</td><td>${club}</td><td><b>${fmt(after.ratings[t])}</b></td><td>${s.g}</td><td>${s.w}</td><td>${s.d}</td><td>${s.l}</td><td>${gd>0?"+":""}${gd}</td>`}else{const delta=after.ratings[t]-before.ratings[t],mv=bp[t]-(i+1);tr.innerHTML=`<td>${i+1}</td><td>${wp[t]}</td><td>${club}</td><td><b>${fmt(after.ratings[t])}</b></td><td>${signfmt(delta)}</td><td>${movement(mv)}</td><td>${s.g}</td><td>${s.w}</td><td>${s.d}</td><td>${s.l}</td>`}tr.querySelector(".club-link").onclick=()=>openClub(t);body.appendChild(tr)})}
function worldPanel(){return`<section id="main-world" class="main-panel"><div class="page-head"><div><span>All tracked domestic clubs</span><h2>World Ranking</h2></div><b>${ALL_TRACKED.length} clubs</b></div><div class="card filters"><select id="worldPeriod"><option value="all">Overall / current</option></select><input id="worldSearch" placeholder="Search clubs…"><button id="worldAll">All leagues</button></div><div class="card"><div id="leagueFilters" class="chips"></div></div><div class="card"><table><thead id="worldHead"></thead><tbody id="worldBody"></tbody></table></div></section>`}
let LEAGUE_FILTER=new Set(Object.keys(TEAMS_BY_LEAGUE));
