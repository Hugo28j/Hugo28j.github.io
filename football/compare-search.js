// Search/filter clubs in the Compare panel without changing the existing compare logic.
(function(){
  function ensureSearch(){
    const select=document.querySelector("#compareSelect");
    if(!select)return null;
    let input=document.querySelector("#compareSearch");
    if(input)return input;

    input=document.createElement("input");
    input.id="compareSearch";
    input.type="search";
    input.placeholder="Search club…";
    input.autocomplete="off";
    input.setAttribute("aria-label","Search club to compare");
    select.parentNode.insertBefore(input,select);

    input.addEventListener("input",()=>applyCompareSearch());
    input.addEventListener("keydown",e=>{
      if(e.key!=="Enter")return;
      e.preventDefault();
      const t=select.value;
      if(t&&!COMPARE.includes(t)&&COMPARE.length<8){
        COMPARE.push(t);
        input.value="";
        renderCompare();
      }
    });
    return input;
  }

  function applyCompareSearch(){
    const input=ensureSearch(),select=document.querySelector("#compareSelect");
    if(!input||!select)return;
    const q=input.value.trim().toLocaleLowerCase("en");
    const clubs=ALL_TRACKED
      .filter(t=>!COMPARE.includes(t))
      .filter(t=>!q||t.toLocaleLowerCase("en").includes(q))
      .sort((a,b)=>a.localeCompare(b,"en"));

    select.innerHTML=clubs.length
      ?clubs.map(t=>`<option>${t}</option>`).join("")
      :'<option value="">No clubs found</option>';
    select.disabled=!clubs.length;
    const add=document.querySelector("#compareAdd");
    if(add)add.disabled=!clubs.length||COMPARE.length>=8;
  }

  const previousRenderCompare=renderCompare;
  renderCompare=function(){
    const out=previousRenderCompare();
    ensureSearch();
    applyCompareSearch();
    return out;
  };

  // buildShell() has already created the Compare panel by the time this patch loads.
  ensureSearch();
  applyCompareSearch();
})();
