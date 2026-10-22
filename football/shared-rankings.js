// Shared, read-only public ranking controls and safe access to legacy backups.
(function(){
  function lockMatchForm(c){
    const root=document.getElementById(c+"-matchList");
    if(!root)return;
    root.querySelectorAll(".match .score input, .match .score select").forEach(el=>{
      el.disabled=true;
      el.title="Official matches and results are updated for everyone through GitHub.";
    });
  }
  const oldRenderMatchList=renderMatchList;
  renderMatchList=function(c,...args){
    const out=oldRenderMatchList(c,...args);
    lockMatchForm(c);
    return out;
  };
  const oldRenderTeams=renderTeams;
  renderTeams=function(c,...args){
    const out=oldRenderTeams(c,...args);
    document.querySelectorAll("#"+c+"-teams input[type=number]").forEach(el=>{
      el.disabled=true;
      el.title="Starting ratings are shared and defined in GitHub.";
    });
    return out;
  };

  // Editing/saving local values is misleading in a shared league. Keep the
  // underlying legacy backup accessible instead of deleting users' data.
  for(const id of ["exportBtn","importFile"]){
    const el=document.getElementById(id);
    if(el){const wrapper=el.closest("label.button")||el;wrapper.hidden=true;wrapper.style.display="none";}
  }
  const backupKey=LEGACY_RATINGS_BACKUP_KEY;
  let oldData=null;
  try{oldData=localStorage.getItem(backupKey)}catch{}
  if(oldData){
    const bar=document.querySelector("header .toolbar");
    if(bar){
      const button=document.createElement("button");
      button.type="button";
      button.textContent="Download previous local backup";
      button.title="Older device-specific settings and results are saved here. They are not used in shared rankings.";
      button.onclick=()=>{
        const blob=new Blob([oldData],{type:"application/json"});
        const url=URL.createObjectURL(blob);
        const link=document.createElement("a");
        link.href=url;link.download="football-local-backup-before-shared.json";
        document.body.appendChild(link);link.click();link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      };
      bar.appendChild(button);
    }
  }

  // A sleeping phone tab otherwise stays on yesterday's snapshot; refresh when
  // returning to the tab, and periodically while it is open.
  let lastRefresh=Date.now();
  const MIN_INTERVAL=5*60*1000;
  function syncIfStale(){
    if(document.hidden||Date.now()-lastRefresh<MIN_INTERVAL)return;
    lastRefresh=Date.now();
    refreshData(false);
  }
  document.addEventListener("visibilitychange",syncIfStale);
  window.addEventListener("focus",syncIfStale);
  setInterval(syncIfStale,MIN_INTERVAL);
})();
