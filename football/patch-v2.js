/* Compatibility and diagnostics patch for the football site. */
(function(){
  const UNMATCHED_KEY="europeClubCoeff2026_27_unmatched_import_v2";

  function legacyDescriptor(id){
    const p=String(id||"").split("|");
    if(p[0]!=="base"&&p[0]!=="fallback")return null;
    if(p[0]==="base"){
      if(p.length>=6&&/^\d{4}-\d\d-\d\d$/.test(p[3])){
        return{competition:p[1],date:p[3],home:p[4],away:p.slice(5).join("|")};
      }
      if(p.length>=5){
        return{competition:p[1],round:Number(p[2])||null,home:p[3],away:p.slice(4).join("|")};
      }
    }
    if(p[0]==="fallback"){
      const competition=p[1];
      if(p.length>=7&&/^\d{4}-\d\d-\d\d$/.test(p[3]))return{competition,date:p[3],home:p[4],away:p.slice(5).join("|")};
      if(p.length>=5)return{competition,round:Number(p[2])||null,home:p[3],away:p.slice(4).join("|")};
    }
    return null;
  }

  function fixtureForOldId(id){
    const exact=allFixtures().find(f=>f.id===id);
    if(exact)return exact;
    const d=legacyDescriptor(id);
    if(!d)return null;
    let best=null,bestScore=-99;
    for(const f of FIXTURES){
      if(f.competition!==d.competition)continue;
      const names=(similarity(d.home,f.home)+similarity(d.away,f.away))/2;
      if(names<.45)continue;
      let score=names;
      if(d.date&&f.date){
        const dd=Math.abs((parseUTC(f.date)-parseUTC(d.date))/86400000);
        if(dd<=1)score+=.18;
        else if(dd<=7)score+=.10;
        else if(dd<=21)score+=.03;
        else score-=Math.min(.22,dd/365);
      }
      if(d.round&&f.round){
        if(Number(d.round)===Number(f.round))score+=.10;
        else score-=Math.min(.08,Math.abs(Number(d.round)-Number(f.round))*.01);
      }
      if(score>bestScore){bestScore=score;best=f;}
    }
    return bestScore>=.60?best:null;
  }

  async function robustImport(backup){
    if(!backup||typeof backup!=="object")throw new Error("Backup is not a JSON object.");
    if(!FIXTURES.length){
      const d=await loadFixtures();
      if(!FIXTURES.length)throw new Error("No fixtures are loaded, so old match IDs cannot be migrated yet.");
      console.log("Fixtures loaded for migration",d);
    }

    const d=defaultState();
    const next={
      starts:Object.assign(d.starts,backup.starts||{}),
      otherRatings:Object.assign({},backup.otherRatings||{}),
      scores:{},penalties:{},
      customFixtures:Array.isArray(backup.customFixtures)?backup.customFixtures:[],
      settings:Object.assign(d.settings,backup.settings||{})
    };
    const unmatchedScores={},unmatchedPens={};
    let scoreTotal=0,scoreMatched=0,penTotal=0,penMatched=0;

    for(const [id,v] of Object.entries(backup.scores||{})){
      scoreTotal++;
      if(id.startsWith("custom|")){next.scores[id]=v;scoreMatched++;continue;}
      const f=fixtureForOldId(id);
      if(f){next.scores[f.id]=v;scoreMatched++;}
      else unmatchedScores[id]=v;
    }
    for(const [id,v] of Object.entries(backup.penalties||{})){
      penTotal++;
      if(id.startsWith("custom|")){next.penalties[id]=v;penMatched++;continue;}
      const f=fixtureForOldId(id);
      if(f){next.penalties[f.id]=v;penMatched++;}
      else unmatchedPens[id]=v;
    }

    state=next;save();
    localStorage.setItem(UNMATCHED_KEY,JSON.stringify({savedAt:new Date().toISOString(),scores:unmatchedScores,penalties:unmatchedPens}));
    return{scoreTotal,scoreMatched,scoreUnmatched:scoreTotal-scoreMatched,penTotal,penMatched,penUnmatched:penTotal-penMatched};
  }

  function bindImport(){
    const input=document.getElementById("importFile");
    if(!input)return;
    input.onchange=async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{
        const backup=JSON.parse(await file.text());
        const r=await robustImport(backup);
        showPanel("world");
        alert(`Import complete.\n\nOld scores found: ${r.scoreTotal}\nScores migrated: ${r.scoreMatched}\nUnmatched scores: ${r.scoreUnmatched}\nPenalty choices migrated: ${r.penMatched}/${r.penTotal}\n\nUnmatched entries are kept safely in browser storage and are not silently deleted.`);
      }catch(err){
        console.error(err);
        alert(`Import failed: ${err.message||err}`);
      }finally{input.value="";}
    };
  }

  async function diagnostics(){
    const status=document.getElementById("syncStatus");
    try{
      if(!FIXTURES.length)await loadFixtures();
      const finals=FIXTURES.filter(f=>f.completed&&Number.isFinite(Number(f.homeScore))&&Number.isFinite(Number(f.awayScore))).length;
      if(status){
        status.textContent=`Loaded ${FIXTURES.length} fixtures · ${finals} final scores`;
        status.classList.toggle("warn",FIXTURES.length===0);
        status.classList.toggle("ok",FIXTURES.length>0);
        status.title="Fixture data is loaded from football/matches.json and fallback calendars.";
      }
      const active=document.querySelector(".main-panel.active")?.id?.replace("main-","");
      if(active&&COMP[active])renderCompetition(active);
      else if(active==="world")renderWorld();
    }catch(err){
      console.error("Football diagnostics failed",err);
      if(status){status.textContent="Fixture loading failed — press Refresh results";status.classList.add("warn");status.title=String(err);}
    }
  }

  // app-ui-4 starts an async init before this patch file is evaluated.
  // Rebind after it has had time to build the page and load match data.
  setTimeout(()=>{bindImport();diagnostics();},1200);
  setTimeout(bindImport,4000);
  window.robustFootballImport=robustImport;
})();
