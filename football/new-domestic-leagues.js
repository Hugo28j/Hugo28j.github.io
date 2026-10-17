// Resolve ESPN/OpenFootball names for the two new domestic competitions.
// Preserve user-customised coefficients; migrate only previously installed defaults.
(function(){
  Object.assign(ALIASES,{
    // Turkish Süper Lig
    "besiktas":"Besiktas","besiktas jk":"Besiktas",
    "galatasaray sk":"Galatasaray","fenerbahce sk":"Fenerbahçe",
    "samsunspor":"Samsunspor","samsunspor fc":"Samsunspor",
    "trabzonspor":"Trabzonspor","istanbul basaksehir":"Istanbul Basaksehir",
    "istanbul basaksehir fk":"Istanbul Basaksehir","basaksehir":"Istanbul Basaksehir",
    "istanbul buyuksehir belediyespor":"Istanbul Basaksehir",
    "goztepe":"Goztepe","goztepe sk":"Goztepe",
    "kocaelispor":"Kocaelispor","gaziantep":"Gaziantep FK","gaziantep fk":"Gaziantep FK",
    "alanyaspor":"Alanyaspor","aytemiz alanyaspor":"Alanyaspor",
    "caykur rizespor":"Caykur Rizespor","rizespor":"Caykur Rizespor",
    "atiker konyaspor":"Konyaspor","konyaspor":"Konyaspor",
    "kasimpasa":"Kasimpasa","kasimpasa sk":"Kasimpasa",
    "genclerbirligi":"Genclerbirligi","genclerbirligi sk":"Genclerbirligi",
    "eyupspor":"Eyupspor","eyupspor":"Eyupspor",
    "erzurumspor":"Erzurumspor","bb erzurumspor":"Erzurumspor","erzurum bb":"Erzurumspor",
    "erzurumspor fk":"Erzurumspor",
    "amed":"Amed SFK","amedspor":"Amed SFK","amed sfk":"Amed SFK",
    "corum":"Corum FK","corum fk":"Corum FK",
    // Greek Super League
    "olympiacos":"Olympiacos","olympiakos":"Olympiacos",
    "olympiakos piraeus":"Olympiacos","olympiacos piraeus":"Olympiacos",
    "paok salonika":"PAOK","paok thessaloniki":"PAOK",
    "aek":"AEK Athens","aek athens":"AEK Athens",
    "panathinaikos":"Panathinaikos",
    "aris thessaloniki":"Aris","aris salonika":"Aris","aris":"Aris",
    "ofi":"OFI Crete","ofi crete":"OFI Crete",
    "levadiakos":"Levadiakos","levadieiakos":"Levadiakos",
    "atromitos":"Atromitos",
    "asteras tripoli":"Asteras Tripolis","asteras tripolis":"Asteras Tripolis",
    "volos":"Volos","volos nfc":"Volos","volos fc":"Volos",
    "panetolikos":"Panetolikos",
    "kifisia":"Kifisia","ae kifisia":"Kifisia","a e kifisia":"Kifisia",
    "iraklis":"Iraklis","iraklis 1908":"Iraklis",
    "kalamata":"Kalamata"
  });

  // Previous defaults are stored in localStorage by older versions of this site.
  // Only upgrade exact default values. Changed personal settings are left alone.
  const formerDefaults={
    "Galatasaray":77,"Fenerbahçe":65,"Besiktas":62,
    "Olympiacos":67,"AEK Athens":60,"Panathinaikos":63,"OFI Crete":51
  };
  const marker="football_tur_gre_defaults_20261017_v1";
  if(!localStorage.getItem(marker)){
    for(const [name,previousValue] of Object.entries(formerDefaults)){
      if(Number(state.starts[name])===previousValue){
        state.starts[name]=Number(DEFAULT_STARTS[name]);
      }
    }
    // UEFA-only clubs that already had a custom start must keep it when they
    // gain domestic league membership (unless it was their unmodified default).
    for(const name of [...TEAMS_BY_LEAGUE.tur,...TEAMS_BY_LEAGUE.gre]){
      const old=state.otherRatings?.[name];
      if(old===undefined)continue;
      const oldDefault=DEFAULT_OTHER_RATINGS[name];
      if(oldDefault!==undefined && Number(old)!==Number(oldDefault)){
        state.starts[name]=Number(old);
      }
      delete state.otherRatings[name];
    }
    save();
    localStorage.setItem(marker,"1");
  }
})();
