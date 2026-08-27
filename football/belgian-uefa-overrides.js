// Official UEFA overrides for Belgian clubs when ESPN/qualifier validation misses a fixture.
// These fixtures are confirmed by UEFA and are injected after normal sync loading.
(function(){
  const OFFICIAL_BELGIAN_UEFA_FIXTURES=[
    {
      competition:"uel",sourceLeague:"uefa-official-override",sourceEventId:"official-stvv-omonia-20260820",
      date:"2026-08-20",time:"18:30",kickoff:"2026-08-20T18:30:00Z",
      home:"STVV",away:"Omonia",round:null,stage:"Play-off round",
      completed:true,postponed:false,statusName:"STATUS_FULL_TIME",statusDescription:"Full Time",statusState:"post",
      homeScore:1,awayScore:0,penaltyWinner:null
    },
    {
      competition:"uel",sourceLeague:"uefa-official-override",sourceEventId:"official-omonia-stvv-20260827",
      date:"2026-08-27",time:"17:00",kickoff:"2026-08-27T17:00:00Z",
      home:"Omonia",away:"STVV",round:null,stage:"Play-off round",
      completed:true,postponed:false,statusName:"STATUS_FULL_TIME",statusDescription:"Full Time",statusState:"post",
      homeScore:4,awayScore:2,penaltyWinner:null
    },
    {
      competition:"ucl",sourceLeague:"uefa-official-override",sourceEventId:"official-union-bodo-20260804",
      date:"2026-08-04",time:"18:00",kickoff:"2026-08-04T18:00:00Z",
      home:"Royale Union Saint-Gilloise",away:"Bodø/Glimt",round:null,stage:"Third qualifying round",
      completed:true,postponed:false,statusName:"STATUS_FULL_TIME",statusDescription:"Full Time",statusState:"post",
      homeScore:3,awayScore:3,penaltyWinner:null
    },
    {
      competition:"ucl",sourceLeague:"uefa-official-override",sourceEventId:"official-bodo-union-20260811",
      date:"2026-08-11",time:"18:00",kickoff:"2026-08-11T18:00:00Z",
      home:"Bodø/Glimt",away:"Royale Union Saint-Gilloise",round:null,stage:"Third qualifying round",
      completed:true,postponed:false,statusName:"STATUS_FINAL_AET",statusDescription:"Final Score - After Extra Time",statusState:"post",
      homeScore:3,awayScore:2,penaltyWinner:null
    }
  ];

  function sameFixture(a,b){
    if(a.competition!==b.competition||a.date!==b.date)return false;
    const ah=canonicalName(a.home),aa=canonicalName(a.away),bh=canonicalName(b.home),ba=canonicalName(b.away);
    return ah===bh&&aa===ba;
  }

  function injectOfficialBelgianUefaFixtures(){
    for(const official of OFFICIAL_BELGIAN_UEFA_FIXTURES){
      const existing=FIXTURES.find(f=>sameFixture(f,official));
      const record={...official,id:`espn|${official.competition}|${official.sourceEventId}`};
      if(existing){
        // Preserve an existing id/manual override if present, but correct names/status/score.
        Object.assign(existing,record,{id:existing.id});
      }else FIXTURES.push(record);
    }
    FIXTURES.sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.kickoff||"").localeCompare(b.kickoff||"")||String(a.id).localeCompare(String(b.id)));
  }

  const previousLoadFixtures=loadFixtures;
  loadFixtures=async function(){
    const info=await previousLoadFixtures();
    injectOfficialBelgianUefaFixtures();
    return {...info,officialBelgianUefaOverrides:OFFICIAL_BELGIAN_UEFA_FIXTURES.length};
  };

  window.OFFICIAL_BELGIAN_UEFA_FIXTURES=OFFICIAL_BELGIAN_UEFA_FIXTURES;
})();
