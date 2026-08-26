// Canonical UEFA club names.
// Exact aliases only: this avoids duplicate identities without fuzzy-guessing a different club.
Object.assign(ALIASES,{
  "bodo glimt":"Bodø/Glimt",
  "fk bodo glimt":"Bodø/Glimt",
  "bodo/glimt":"Bodø/Glimt",
  "sparta prague":"Sparta Praha",
  "ac sparta praha":"Sparta Praha",
  "heart of midlothian":"Hearts",
  "heart of midlothian fc":"Hearts",
  "agf":"Aarhus",
  "agf aarhus":"Aarhus",
  "aarhus gf":"Aarhus",
  "dac dunajska streda":"DAC 1904",
  "dac 1904 dunajska streda":"DAC 1904",
  "fc dac 1904":"DAC 1904",
  "austria vienna":"Austria Wien",
  "fk austria wien":"Austria Wien",
  "tromso":"Tromsø",
  "tromso il":"Tromsø",
  "cfr cluj":"CFR Cluj",
  "cfr 1907 cluj":"CFR Cluj",
  "dinamo minsk":"Dinamo-Minsk",
  "dinamo-minsk":"Dinamo-Minsk",
  "qarabag":"Qarabağ",
  "qarabag fk":"Qarabağ",
  "omonia nicosia":"Omonia",
  "ac omonia":"Omonia",
  "ifk goteborg":"IFK Göteborg",
  "ifk gothenburg":"IFK Göteborg",
  "gornik zabrze":"Górnik Zabrze",
  "rapid vienna":"SK Rapid",
  "sk rapid wien":"SK Rapid",
  "hapoel tel aviv":"Hapoel Tel-Aviv"
});

// The domestic resolver intentionally only returns tracked clubs. For UEFA we also need
// one canonical identity for non-ranked opponents, otherwise Bodo/Glimt and Bodø/Glimt
// can appear as two different clubs with two different ratings.
const __resolveFixtureNameBeforeUefaPatch=resolveTrackedFixtureName;
resolveTrackedFixtureName=function(name,competition){
  const aliased=canonicalName(name);
  if(COMP[competition]?.type==="europe"&&aliased!==name)return aliased;
  return __resolveFixtureNameBeforeUefaPatch(name,competition);
};

// Migrate previously saved UEFA-only ratings to the canonical spelling.
(function migrateUefaOnlyRatings(){
  let changed=false;
  for(const oldName of Object.keys(state.otherRatings||{})){
    const canonical=canonicalName(oldName);
    if(canonical!==oldName){
      if(state.otherRatings[canonical]==null)state.otherRatings[canonical]=state.otherRatings[oldName];
      delete state.otherRatings[oldName];
      changed=true;
    }
  }
  if(changed)save();
})();
