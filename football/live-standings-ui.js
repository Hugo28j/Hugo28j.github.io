// Final live presentation layer for all ranking tables.
// It watches the rendered DOM, so colours remain correct after filters, weeks,
// matchdays, refreshes, imports, or other scripts rebuild a table.
(function(){
  const style=document.createElement("style");
  style.textContent=`
    td.live-delta-positive{color:#62d59b!important;font-weight:900!important}
    td.live-delta-negative{color:#ff7c89!important;font-weight:900!important}
    td.live-delta-neutral{color:#93a6c8!important;font-weight:800!important}
  `;
  document.head.appendChild(style);

  function numberFromCell(cell){
    const raw=String(cell?.textContent||"").replace(/[^0-9+\-.]/g,"").trim();
    const v=Number(raw);
    return Number.isFinite(v)?v:null;
  }

  function colourDeltaColumns(){
    document.querySelectorAll("table").forEach(table=>{
      const headers=[...table.querySelectorAll("thead th")];
      headers.forEach((th,index)=>{
        const label=String(th.textContent||"").trim().toLowerCase();
        if(!(label==="δ"||label.startsWith("δ ")||label==="delta"||label.startsWith("delta ")))return;
        table.querySelectorAll("tbody tr").forEach(row=>{
          const cell=row.children[index];if(!cell)return;
          const v=numberFromCell(cell);if(v===null)return;
          cell.classList.remove("live-delta-positive","live-delta-negative","live-delta-neutral","up","down");
          cell.classList.add(v>1e-9?"live-delta-positive":v<-1e-9?"live-delta-negative":"live-delta-neutral");
        });
      });
    });
  }

  function worldOverallStats(){
    const period=document.querySelector("#worldPeriod")?.value||"all";
    if(period!=="all")return;
    const head=document.querySelector("#worldHead"),body=document.querySelector("#worldBody");
    if(!head||!body)return;

    const headerRow=head.querySelector("tr");
    if(!headerRow)return;
    const labels=[...headerRow.children].map(x=>String(x.textContent||"").trim());
    for(const name of ["W","D","L","GD"]){
      if(!labels.includes(name))headerRow.insertAdjacentHTML("beforeend",`<th>${name}</th>`);
    }

    const calc=recalc();
    body.querySelectorAll("tr").forEach(row=>{
      const team=row.querySelector(".club-link")?.textContent?.trim();if(!team)return;
      const s=calc.stats?.[team]||{g:0,w:0,d:0,l:0,gf:0,ga:0};
      const gd=Number(s.gf||0)-Number(s.ga||0);
      const cells=[...row.children];
      // Base Overall table has 5 columns: # World, Club, League, Rating, MP.
      if(cells.length<9){
        row.insertAdjacentHTML("beforeend",`<td>${s.w||0}</td><td>${s.d||0}</td><td>${s.l||0}</td><td>${gd>0?"+":""}${gd}</td>`);
      }else{
        cells[5].textContent=s.w||0;
        cells[6].textContent=s.d||0;
        cells[7].textContent=s.l||0;
        cells[8].textContent=(gd>0?"+":"")+gd;
      }
    });
  }

  let queued=false;
  function apply(){
    queued=false;
    worldOverallStats();
    colourDeltaColumns();
  }
  function queue(){
    if(queued)return;queued=true;
    requestAnimationFrame(apply);
  }

  const root=document.querySelector("#panels")||document.body;
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  document.addEventListener("change",queue,true);
  document.addEventListener("input",queue,true);
  setTimeout(queue,0);
  setTimeout(queue,700);
  setTimeout(queue,1800);
})();
