// Strict UEFA fixture integrity layer for 2026/27.
// 1) The old hardcoded UEFA fallback is disabled: UEFA fixtures must come from the sync.
// 2) European club names are resolved only by exact/canonical aliases, never fuzzy-guessed.
// This prevents unrelated UEFA clubs from being turned into tracked clubs such as AZ.

if(typeof uefaFallback === "function"){
  uefaFallback=function(){return[]};
}

Object.assign(ALIASES,{
  "az alkmaar":"AZ",
  "az":"AZ",
  "ajax amsterdam":"Ajax",
  "psv eindhoven":"PSV",
  "bodo glimt":"Bodø/Glimt",
  "fk bodo glimt":"Bodø/Glimt",
  "sparta prague":"Sparta Praha",
  "heart of midlothian":"Hearts",
  "heart of midlothian fc":"Hearts",
  "agf":"Aarhus",
  "agf aarhus":"Aarhus",
  "dac dunajska streda":"DAC 1904",
  "dac 1904 dunajska streda":"DAC 1904",
  "austria vienna":"Austria Wien",
  "tromso":"Tromsø",
  "tromso il":"Tromsø",
  "qarabag":"Qarabağ",
  "qarabag fk":"Qarabağ",
  "ifk gothenburg":"IFK Göteborg",
  "ifk goteborg":"IFK Göteborg",
  "gornik zabrze":"Górnik Zabrze"
});

const __resolverBeforeStrictUefa=resolveTrackedFixtureName;
resolveTrackedFixtureName=function(name,competition){
  if(COMP[competition]?.type!=="europe")return __resolverBeforeStrictUefa(name,competition);
  if(tracked(name))return name;

  const canonical=canonicalName(name);
  if(canonical!==name)return canonical;

  // Only accept a unique exact-normalized tracked-club match in UEFA.
  // Do NOT use similarity/fuzzy matching for European opponents.
  const n=normalized(name);
  const exact=ALL_TRACKED.filter(t=>normalized(t)===n);
  if(exact.length===1)return exact[0];
  return name;
};

// Remove obsolete duplicate UEFA-only rating spellings without changing the rating value.
(function migrateStrictUefaRatings(){
  let changed=false;
  for(const oldName of Object.keys(state.otherRatings||{})){
    const canonical=canonicalName(oldName);
    if(canonical!==oldName){
      if(state.otherRatings[canonical]==null)state.otherRatings[canonical]=state.otherRatings[oldName];
      delete state.otherRatings[oldName];changed=true;
    }
  }
  if(changed)save();
})();
