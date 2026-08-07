function oilTargetsFor(pyromaniacId) {
      return livingPlayers().filter(player => (player.oiledByIds || []).includes(pyromaniacId));
    }

    function renderPyromaniacAction(action) {
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive) return advanceNightAction();
      const oiled = oilTargetsFor(actor.id);
      const candidates = livingPlayers().filter(player => player.id !== actor.id && !(player.oiledByIds || []).includes(actor.id));
      const firstNight = state.day === 1;

      phasePanel.innerHTML = `
        <h2>🔥 Pyromaan wordt wakker</h2>
        <div class="alert neutral"><strong>${escapeHtml(actor.name)}</strong> hoort bij kamp Pyromaan en is immuun tegen aanvallen van de weerwolven.</div>
        <div class="alert"><strong>Momenteel geolied:</strong> ${oiled.length ? oiled.map(player => escapeHtml(player.name)).join(", ") : "niemand"}</div>
        <p class="step">${firstNight ? "Tijdens de eerste nacht moet de Pyromaan één persoon met olie overgieten." : "Kies één nieuwe persoon voor olie, of verbrand alle eerder door deze Pyromaan geoliede spelers. Beide kan niet."}</p>
        <div class="actions">
          <button id="pyroOilBtn" ${candidates.length ? "" : "disabled"}>Eén persoon oliën</button>
          ${firstNight ? "" : `<button id="pyroBurnBtn" class="danger" ${oiled.length ? "" : "disabled"}>Alle geoliede spelers verbranden</button>`}
        </div>
        <div id="pyroActionArea"></div>`;

      $("pyroOilBtn").addEventListener("click", () => {
        $("pyroActionArea").innerHTML = `
          <label for="pyroOilTarget">Wie krijgt olie?</label>
          <select id="pyroOilTarget">${options(candidates)}</select>
          <button id="confirmPyroOilBtn" style="width:100%;margin-top:9px">Olie bevestigen</button>`;
        $("pyroOilBtn").disabled = true;
        const burn = $("pyroBurnBtn"); if (burn) burn.disabled = true;
        $("confirmPyroOilBtn").addEventListener("click", () => {
          const targetId = $("pyroOilTarget").value;
          if (!targetId) return alert("Kies eerst een speler.");
          const target = getPlayer(targetId);
          target.oiledByIds = target.oiledByIds || [];
          if (!target.oiledByIds.includes(actor.id)) target.oiledByIds.push(actor.id);
          state.night.intel.oilActions.push({ actorId: actor.id, targetId });
          addLog(`${actor.name} goot olie op ${target.name}.`);
          advanceNightAction();
        });
      });

      const burnButton = $("pyroBurnBtn");
      if (burnButton) burnButton.addEventListener("click", () => {
        const targetIds = oiled.map(player => player.id);
        state.night.pyromaniacBurns.push({ actorId: actor.id, targetIds });
        state.night.intel.burnActions.push({ actorId: actor.id, targetIds });
        oiled.forEach(player => {
          player.oiledByIds = (player.oiledByIds || []).filter(id => id !== actor.id);
        });
        addLog(`${actor.name} stak ${oiled.map(player => player.name).join(", ")} in brand.`);
        advanceNightAction();
      });
    }

    function renderDictatorAction(action) {
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🎖️ Dictator wordt wakker</h2>
        <div class="alert"><strong>${escapeHtml(actor.name)}</strong> mag beslissen om morgenochtend een staatsgreep uit te voeren.</div>
        <p class="muted">Bij een coup kiest de Dictator in de ochtend zelf één speler die sterft.</p>
        <div class="actions">
          <button id="dictatorCoupYesBtn" class="danger">Ja, coup plannen</button>
          <button id="dictatorCoupNoBtn" class="secondary">Nee, niets doen</button>
        </div>`;

      $("dictatorCoupYesBtn").addEventListener("click", () => {
        actor.coupPendingNight = state.day;
        addLog(`${actor.name} plande een staatsgreep voor de ochtend.`);
        advanceNightAction();
      });
      $("dictatorCoupNoBtn").addEventListener("click", () => {
        actor.coupPendingNight = null;
        advanceNightAction();
      });
    }

    function renderWolvesAction() {
      const wolves = livingWolves();
      if (!wolves.length) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🐺 Weerwolven worden wakker</h2>
        <div class="alert danger"><strong>Levende weerwolven:</strong> ${wolves.map(player => escapeHtml(player.name)).join(", ")}</div>
        <p class="step">Alle levende weerwolven kiezen samen precies één levende speler. Ze mogen ook een weerwolf kiezen.</p>
        <label for="wolfVictim">Gezamenlijke keuze</label><select id="wolfVictim">${options(livingPlayers())}</select>
        <div class="actions"><button id="confirmWolfBtn" class="danger">Keuze bevestigen</button><button id="wolvesChooseNobodyBtn" class="secondary">Niemand kiezen</button></div>`;

      $("confirmWolfBtn").addEventListener("click", () => {
        const targetId = $("wolfVictim").value;
        if (!targetId) return alert("Kies eerst een speler.");
        state.night.wolfVictimId = targetId;
        state.night.intel.wolfVictimId = targetId;
        addLog(`De weerwolven kozen tijdens nacht ${state.day} één slachtoffer.`);
        advanceNightAction();
      });
      $("wolvesChooseNobodyBtn").addEventListener("click", () => {
        state.night.wolfVictimId = null;
        state.night.intel.wolfVictimId = null;
        addLog(`De weerwolven kozen niemand tijdens nacht ${state.day}.`);
        advanceNightAction();
      });
    }

    function renderWitchAction(action) {
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive || (actor.lifePotionUsed && actor.deathPotionUsed)) return advanceNightAction();

      const victim = state.night.wolfVictimId ? getPlayer(state.night.wolfVictimId) : null;
      const alreadyImmune = victim && (isProtectedTonight(victim.id) || victim.role === "pyromaniac");
      const canSave = !actor.lifePotionUsed && victim && !state.night.wolfVictimSaved && !alreadyImmune;
      const canKill = !actor.deathPotionUsed;

      phasePanel.innerHTML = `
        <h2>🧪 Heks wordt wakker</h2>
        <div class="alert"><strong>${escapeHtml(actor.name)}</strong> mag maximaal één potion gebruiken.</div>
        ${victim ? `<div class="alert danger">De weerwolven kozen <strong>${escapeHtml(victim.name)}</strong>. ${alreadyImmune ? "Deze speler is al immuun of beschermd." : ""}</div>` : `<div class="alert success">De weerwolven kozen niemand.</div>`}
        <div class="alert">💚 Levenspotion: <strong>${actor.lifePotionUsed ? "gebruikt" : "beschikbaar"}</strong><br>☠️ Doodspotion: <strong>${actor.deathPotionUsed ? "gebruikt" : "beschikbaar"}</strong></div>
        <div class="actions">
          <button id="useLifePotionBtn" class="success" ${canSave ? "" : "disabled"}>Levenspotion gebruiken</button>
          <button id="chooseDeathPotionBtn" class="danger" ${canKill ? "" : "disabled"}>Doodspotion gebruiken</button>
          <button id="witchDoNothingBtn" class="secondary">Geen potion</button>
        </div><div id="deathPotionArea"></div>`;

      $("useLifePotionBtn").addEventListener("click", () => {
        actor.lifePotionUsed = true;
        state.night.wolfVictimSaved = true;
        addLog(`${actor.name} gebruikte de levenspotion op ${victim.name}.`);
        advanceNightAction();
      });

      $("chooseDeathPotionBtn").addEventListener("click", () => {
        $("deathPotionArea").innerHTML = `
          <div style="margin-top:13px"><label for="witchKillTarget">Wie krijgt de doodspotion?</label><select id="witchKillTarget">${options(livingPlayers())}</select><button id="confirmDeathPotionBtn" class="danger" style="width:100%;margin-top:9px">Doelwit bevestigen</button></div>`;
        $("useLifePotionBtn").disabled = true;
        $("chooseDeathPotionBtn").disabled = true;
        $("witchDoNothingBtn").disabled = true;
        $("confirmDeathPotionBtn").addEventListener("click", () => {
          const targetId = $("witchKillTarget").value;
          if (!targetId) return alert("Kies eerst een speler.");
          const target = getPlayer(targetId);
          actor.deathPotionUsed = true;
          state.night.witchKillIds.push(targetId);
          state.night.intel.witchAttacks.push({ actorId: actor.id, targetId });
          addLog(`${actor.name} gebruikte de doodspotion op ${target.name}.`);
          advanceNightAction();
        });
      });
      $("witchDoNothingBtn").addEventListener("click", advanceNightAction);
    }

    function renderImposterAction(action) {
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive) return advanceNightAction();
      const candidates = livingPlayers().filter(player => player.id !== actor.id);
      if (!candidates.length) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🎭 Imposter wordt wakker</h2>
        <div class="alert danger"><strong>${escapeHtml(actor.name)}</strong> hoort bij kamp Weerwolven, maar wordt apart wakker.</div>
        <p class="muted">Kies één speler. De app vertelt alleen of die speler de echte rol Weerwolf heeft.</p>
        <label for="imposterTarget">Wie controleren?</label><select id="imposterTarget">${options(candidates)}</select>
        <div id="imposterResult"></div><div class="actions"><button id="checkImposterTargetBtn">Controleren</button></div>`;

      $("checkImposterTargetBtn").addEventListener("click", () => {
        const targetId = $("imposterTarget").value;
        if (!targetId) return alert("Kies eerst een speler.");
        const target = getPlayer(targetId);
        const isWolf = target.role === "wolf";
        $("imposterResult").innerHTML = `
          <div class="role-reveal"><span class="icon">${isWolf ? "🐺" : "❌"}</span><strong>${escapeHtml(target.name)} is ${isWolf ? "een Weerwolf" : "geen Weerwolf"}</strong></div>
          <button id="hideImposterResultBtn" class="success" style="width:100%">Resultaat verbergen en verdergaan</button>`;
        $("checkImposterTargetBtn").disabled = true;
        $("imposterTarget").disabled = true;
        addLog(`${actor.name} controleerde of ${target.name} een Weerwolf was.`);
        $("hideImposterResultBtn").addEventListener("click", advanceNightAction);
      });
    }

    function formatIntelAction(action, targetFields) {
      const actor = getPlayer(action.actorId);
      const targets = targetFields.map(field => getPlayer(action[field])).filter(Boolean);
      return `${actor ? escapeHtml(actor.name) : "Onbekend"} → ${targets.map(target => escapeHtml(target.name)).join(" en ")}`;
    }

    function renderKnowerAction(action) {
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive) return advanceNightAction();
      const intel = state.night.intel;
      const currentlyOiled = livingPlayers().filter(player => (player.oiledByIds || []).length);
      const wolfVictim = intel.wolfVictimId ? getPlayer(intel.wolfVictimId) : null;

      const roleWasInGame = roleKey => (state.initialRoleCounts?.[roleKey] || 0) > 0;
      const sections = [];

      if (roleWasInGame("pyromaniac")) {
        sections.push(["🛢️ Olie gegeven", intel.oilActions.map(item => formatIntelAction(item, ["targetId"]))]);
        sections.push(["🔥 Verbrandingskeuze", intel.burnActions.map(item => {
          const pyromaniac = getPlayer(item.actorId);
          const names = item.targetIds.map(getPlayer).filter(Boolean).map(player => escapeHtml(player.name)).join(", ");
          return `${pyromaniac ? escapeHtml(pyromaniac.name) : "Onbekend"} → ${names || "niemand"}`;
        })]);
      }
      if (roleWasInGame("wolf")) sections.push(["🐺 Keuze van de weerwolven", [wolfVictim ? escapeHtml(wolfVictim.name) : "niemand"]]);
      if (roleWasInGame("witch")) sections.push(["☠️ Aanval van de heks", intel.witchAttacks.map(item => formatIntelAction(item, ["targetId"]))]);
      if (roleWasInGame("guard")) sections.push(["🛡️ Bescherming van de Guard", intel.guardActions.map(item => formatIntelAction(item, ["targetId"]))]);
      if (roleWasInGame("detective")) sections.push(["🕵️ Keuzes van de Detective", intel.detectiveActions.map(item => formatIntelAction(item, ["firstId", "secondId"]))]);
      if (roleWasInGame("seer")) sections.push(["🔮 Keuze van de Ziener", intel.seerActions.map(item => formatIntelAction(item, ["targetId"]))]);
      if (roleWasInGame("vampireHunter")) sections.push(["🗡️ Doelwit van de Vampierenjager", intel.vampireHunterActions.map(item => formatIntelAction(item, ["targetId"]))]);

      phasePanel.innerHTML = `
        <h2>🧠 Betweter wordt wakker</h2>
        <div class="alert"><strong>${escapeHtml(actor.name)}</strong> ziet wie welke doelen koos, maar nooit welke rol of welk kamp daarbij ontdekt werd. Alleen rollen die echt bij de start van dit spel aanwezig waren, worden hier getoond.</div>
        ${sections.length ? sections.map(([title, lines]) => `<div class="alert"><strong>${title}</strong><br>${lines.length ? lines.join("<br>") : "geen actie"}</div>`).join("") : `<div class="alert">Er zijn deze nacht geen relevante rollen om informatie over te tonen.</div>`}
        ${roleWasInGame("pyromaniac") ? `<div class="alert neutral"><strong>Momenteel met olie:</strong><br>${currentlyOiled.length ? currentlyOiled.map(player => escapeHtml(player.name)).join(", ") : "niemand"}</div>` : ""}
        <button id="closeKnowerBtn" class="success" style="width:100%">Informatie verbergen en verdergaan</button>`;
      $("closeKnowerBtn").addEventListener("click", advanceNightAction);
    }

    function oldestLivingVampire() {
      return [...livingVampires()].sort((a, b) => (a.vampireOrder ?? 999999) - (b.vampireOrder ?? 999999))[0] || null;
    }

    function convertToVampire(target) {
      target.role = "vampire";
      target.forcedCampKey = null;
      target.vampireOrder = state.nextVampireOrder++;
      target.convertedNight = state.day;
      target.coupPendingNight = null;
      target.wasConvertedToVampire = true;
    }

    function renderVampiresAction() {
      const vampires = livingVampires();
      if (!vampires.length || state.day % 2 === 0) return advanceNightAction();
      const candidates = livingPlayers().filter(player => player.role !== "vampire");
      if (!candidates.length) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🧛 Vampieren worden wakker</h2>
        <div class="alert danger"><strong>Levende vampieren:</strong> ${vampires.map(player => escapeHtml(player.name)).join(", ")}</div>
        <p class="step">In nacht ${state.day} kiezen de vampieren samen één speler om permanent in een Vampier te veranderen. Bescherming houdt dit niet tegen.</p>
        <label for="vampireTarget">Wie wordt omgevormd?</label><select id="vampireTarget">${options(candidates)}</select>
        <div id="vampireResultArea"></div><div class="actions"><button id="confirmVampireTargetBtn" class="danger">Transformatie uitvoeren</button></div>`;

      $("confirmVampireTargetBtn").addEventListener("click", () => {
        const targetId = $("vampireTarget").value;
        if (!targetId) return alert("Kies eerst een speler.");
        const target = getPlayer(targetId);
        let message;

        if (target.role === "vampireHunter") {
          const oldest = oldestLivingVampire();
          if (oldest) {
            if (!state.night.vampireRetaliationIds.includes(oldest.id)) state.night.vampireRetaliationIds.push(oldest.id);
            message = `${target.name} is de Vampierenjager en is immuun. In plaats daarvan sterft de oudste vampier: ${oldest.name}.`;
            addLog(`De vampieren probeerden ${target.name} om te vormen. ${oldest.name}, de oudste vampier, zal in de plaats sterven.`);
          } else {
            message = `${target.name} is de Vampierenjager en kan niet worden omgevormd.`;
          }
        } else {
          convertToVampire(target);
          message = `${target.name} is nu permanent een Vampier en hoort bij kamp Vampieren.`;
          addLog(`${target.name} werd in nacht ${state.day} door de vampieren omgevormd.`);
        }

        state.night.vampireResult = message;
        $("vampireResultArea").innerHTML = `
          <div class="role-reveal"><span class="icon">🧛</span><strong>${escapeHtml(message)}</strong></div>
          <button id="closeVampireResultBtn" class="success" style="width:100%">Resultaat verbergen en naar de dageraad</button>`;
        $("confirmVampireTargetBtn").disabled = true;
        $("vampireTarget").disabled = true;
        $("closeVampireResultBtn").addEventListener("click", advanceNightAction);
      });
    }

    function isProtectedTonight(id) {
      return state.night.hiddenIds.includes(id) || state.night.guardedIds.includes(id);
    }

    function protectionDescription(id) {
      const reasons = [];
      if (state.night.hiddenIds.includes(id)) reasons.push("de schuilplaats van de Survivor");
      if (state.night.guardedIds.includes(id)) reasons.push("de bescherming van de Guard");
      return reasons.join(" en ");
    }

    function renderDawn() {
      const victim = state.night.wolfVictimId ? getPlayer(state.night.wolfVictimId) : null;
      const poisonTargets = [...new Set(state.night.witchKillIds)].map(getPlayer).filter(Boolean);
      const vampireHunterTargets = [...new Set(state.night.vampireHunterKillIds)].map(getPlayer).filter(Boolean);
      const burnTargets = [...new Set(state.night.pyromaniacBurns.flatMap(item => item.targetIds))].map(getPlayer).filter(Boolean);
      const retaliationTargets = [...new Set(state.night.vampireRetaliationIds)].map(getPlayer).filter(Boolean);

      let wolfResult = "De weerwolven kozen niemand.";
      let wolfDies = false;
      if (victim) {
        if (victim.role === "pyromaniac") {
          wolfResult = `${escapeHtml(victim.name)} werd gekozen, maar de Pyromaan is immuun tegen de weerwolven.`;
        } else if (state.night.wolfVictimSaved) {
          wolfResult = `${escapeHtml(victim.name)} werd gekozen, maar is gered met een levenspotion.`;
        } else if (isProtectedTonight(victim.id)) {
          wolfResult = `${escapeHtml(victim.name)} werd gekozen, maar overleeft dankzij ${protectionDescription(victim.id)}.`;
        } else {
          wolfResult = `${escapeHtml(victim.name)} werd gekozen en zal sterven.`;
          wolfDies = true;
        }
      }

      phasePanel.innerHTML = `
        <h2>🌅 De volgende dag</h2>
        <p class="step">Alle nachtelijke aanvallen worden nu uitgevoerd. Vampiertransformaties zijn al onmiddellijk gebeurd.</p>
        <div class="alert ${wolfDies ? "danger" : "success"}"><strong>Weerwolven:</strong> ${wolfResult}</div>
        <div class="alert ${poisonTargets.length ? "danger" : ""}"><strong>Doodspotion:</strong> ${poisonTargets.length ? poisonTargets.map(player => escapeHtml(player.name)).join(", ") : "niet gebruikt"}</div>
        <div class="alert ${vampireHunterTargets.length ? "danger" : ""}"><strong>Vampierenjager:</strong> ${vampireHunterTargets.length ? vampireHunterTargets.map(player => escapeHtml(player.name)).join(", ") : "geen Vampier gevonden"}</div>
        <div class="alert ${burnTargets.length ? "danger" : ""}"><strong>Brandstichting:</strong> ${burnTargets.length ? burnTargets.map(player => escapeHtml(player.name)).join(", ") : "niemand verbrand"}</div>
        <div class="alert ${retaliationTargets.length ? "danger" : ""}"><strong>Reactie op de Vampierenjager:</strong> ${retaliationTargets.length ? retaliationTargets.map(player => escapeHtml(player.name)).join(", ") : "geen"}</div>
        ${state.night.vampireResult ? `<div class="alert neutral"><strong>Vampieren:</strong> ${escapeHtml(state.night.vampireResult)}</div>` : ""}
        <div class="actions"><button id="resolveDawnBtn" class="success">Dageraad uitvoeren</button></div>`;

      $("resolveDawnBtn").addEventListener("click", () => {
        state.deathQueue = [];
        state.pendingActions = [];
        state.nightDeathResults = [];
        state.morningDeathsAnnounced = false;
        state.nightResolutionActive = true;
        state.afterMorningPhase = state.mayorElectionDone ? "day" : "mayorElection";
        state.morningQueue = livingByRole("dictator").filter(player => player.coupPendingNight === state.day).map(player => player.id);
        state.resumePhase = "morningActions";

        if (victim) {
          if (victim.role === "pyromaniac") addLog(`${victim.name} overleefde de weerwolfaanval door pyromaan-immuniteit.`);
          else if (state.night.wolfVictimSaved) addLog(`${victim.name} overleefde dankzij een levenspotion.`);
          else state.deathQueue.push({ id: victim.id, reason: "werd door de weerwolven opgegeten" });
        }
        poisonTargets.forEach(target => state.deathQueue.push({ id: target.id, reason: "stierf door de doodspotion van een heks" }));
        vampireHunterTargets.forEach(target => state.deathQueue.push({ id: target.id, reason: "werd gedood door de Vampierenjager" }));
        burnTargets.forEach(target => state.deathQueue.push({ id: target.id, reason: "werd door de Pyromaan verbrand" }));
        retaliationTargets.forEach(target => state.deathQueue.push({ id: target.id, reason: "stierf als oudste Vampier na een mislukte transformatie van de Vampierenjager", ignoreProtection: true }));
        processResolution();
      });
    }


    function renderMorningResult() {
      const deaths = state.nightDeathResults || [];
      const hasSpecialActions = (state.pendingActions || []).length > 0;

      phasePanel.innerHTML = `
        <h2>📣 Doden van deze nacht</h2>
        <p class="step">Maak nu onmiddellijk bekend wie tijdens de nacht werkelijk gestorven is. Daarna worden eventuele speciale doodsacties afgehandeld.</p>

        ${deaths.length
          ? `<div class="morning-death-list">
              ${deaths.map(death => `
                <div class="morning-death-card">
                  <strong>${death.roleIcon} ${escapeHtml(death.name)} — ${escapeHtml(death.roleLabel)}</strong>
                  <div class="muted">Kamp: ${escapeHtml(death.camp)}</div>
                  <div style="margin-top:5px">${escapeHtml(death.reason)}</div>
                </div>`).join("")}
             </div>`
          : `<div class="alert success"><strong>Niemand stierf tijdens de nacht.</strong></div>`
        }

        ${hasSpecialActions
          ? `<div class="alert warning">Er zijn nog speciale doodsacties. Een Jager kan alleen kiezen uit spelers die na deze volledige nachtafhandeling nog leven.</div>`
          : ""
        }

        <div class="actions">
          <button id="continueAfterNightDeathsBtn" class="success">
            ${hasSpecialActions ? "Speciale doodsacties afhandelen" : "Verder met de ochtend"}
          </button>
        </div>`;

      $("continueAfterNightDeathsBtn").addEventListener("click", () => {
        processResolution();
      });
    }
