// Final standings presentation patch.
// Runs after the main UI scripts so cached/older render functions cannot remove these behaviours.
(function(){
  function colourDeltaCell(cell){
    if(!cell)return;
    const value=Number(String(cell.textContent||"").replace("+","").trim());
    cell.classList.remove("up","down","muted");
    if(!Number.isFinite(value))return;
    cell.classList.add(value>1e-9?"up":value<-1e-9?"down":"muted");
  }

  // Domestic league standings: colour Δ on every selected matchday.
  const previousStandingRows=renderStandingRows;
  renderStandingRows=function(c){
    previousStandingRows(c);
    const period=document.querySelector(`#${c}-period`)?.value||"all";
    if(period==="all")return;
    document.querySelectorAll(`#${c}-body tr`).forEach(row=>colourDeltaCell(row.children?.[4]));
  };

  // World Ranking: weekly Δ colours + extra W/D/L/GD only in Overall/current.
  const previousWorldRows=renderWorldRows;
  renderWorldRows=function(){
    previousWorldRows();
    const period=document.querySelector("#worldPeriod")?.value||"all";

    if(period!=="all"){
      document.querySelectorAll("#worldBody tr").forEach(row=>colourDeltaCell(row.children?.[4]));
      return;
    }

    const head=document.querySelector("#worldHead");
    const body=document.querySelector("#worldBody");
    if(!head||!body)return;

    head.innerHTML='<tr><th># World</th><th>Club</th><th>League</th><th>Rating</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th></tr>';
    const calc=recalc();

    body.querySelectorAll("tr").forEach(row=>{
      const team=row.querySelector(".club-link")?.textContent?.trim();
      if(!team)return;
      const s=calc.stats?.[team]||{g:0,w:0,d:0,l:0,gf:0,ga:0};
      const gd=Number(s.gf||0)-Number(s.ga||0);
      row.insertAdjacentHTML("beforeend",`<td>${s.w||0}</td><td>${s.d||0}</td><td>${s.l||0}</td><td>${gd>0?"+":""}${gd}</td>`);
    });
  };
})();
