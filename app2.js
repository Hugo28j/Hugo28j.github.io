function renderPlayersOverview() {
      const sorted = [...state.players].sort((a, b) => Number(b.alive) - Number(a.alive));

      playersOverview.innerHTML = `
        <div class="player-list">
          ${sorted.map(player => {
            const role = ROLES[player.role];
            return `
              <div class="player-row" style="${player.alive ? "" : "opacity:.58"}">
                <div class="player-name">${escapeHtml(player.name)}</div>
                <div>
                  <span class="pill ${campClass(player)}">${role.icon} ${role.label}</span>
                  ${player.mayor ? `<span class="pill mayor">👑 Burgemeester</span>` : ""}
                  ${abilityBadges(player)}
                </div>
                <span class="pill ${player.alive ? "village" : "dead"}">${player.alive ? "Levend" : "Dood"}</span>
              </div>`;
          }).join("")}
        </div>`;
    }

    function renderLog() {
      gameLog.innerHTML = state.log.length
        ? state.log.map(entry => `<div class="log-entry"><strong>${escapeHtml(entry.time)}</strong> — ${escapeHtml(entry.text)}</div>`).join("")
        : `<div class="muted">Nog geen gebeurtenissen.</div>`;
    }

    function renderPhase() {
      switch (state.phase) {
        case "nightAction": renderNightAction(); break;
        case "dawn": renderDawn(); break;
        case "morningResult": renderMorningResult(); break;
        case "dictatorCoup": renderDictatorCoup(); break;
        case "dictatorCoupReveal": renderDictatorCoupReveal(); break;
        case "chameleonReveal": renderChameleonReveal(); break;
        case "mayorElection": renderMayorElection(); break;
        case "day": renderDay(); break;
        case "vote": renderVote(); break;
        case "tie": renderTie(); break;
        case "dayResult": renderDayResult(); break;
        case "mayorSuccessor": renderMayorSuccessor(); break;
        case "hunterShot": renderHunterShot(); break;
        case "finished": renderFinished(); break;
        default: prepareNight();
      }
    }

    function nightActionAppliesTonight(actionType) {
      if (actionType === "thief" || actionType === "cupid") return state.day === 1;
      if (actionType === "chameleon") return state.day === 2;
      if (actionType === "vampires") return state.day % 2 === 1;
      return true;
    }

    function queueActionType(action) {
      return action.type === "ghost" ? action.ghostType : action.type;
    }

    function actionActors(action, roleKey = null) {
      const ids = Array.isArray(action.actorIds)
        ? action.actorIds
        : (action.actorId ? [action.actorId] : []);
      return ids
        .map(getPlayer)
        .filter(player => player && player.alive && (!roleKey || player.role === roleKey));
    }

    function actionActorNames(action, roleKey = null) {
      return actionActors(action, roleKey).map(player => escapeHtml(player.name)).join(", ");
    }

    function shouldShowGhostAction(actionType) {
      if (!nightActionAppliesTonight(actionType)) return false;

      const roleKey = NIGHT_ACTION_ROLE_KEY[actionType];
      // Als de Vampieren een nachtrol hebben overgenomen, blijft die rol bewust
      // als lege vertellerstap terugkomen zodat niemand de transformatie kan afleiden.
      if (roleWasTakenByVampires(roleKey)) return true;

      if (state.narratorMode === "hideDead") {
        return (state.initialRoleCounts?.[roleKey] || 0) > 0;
      }

      if (state.narratorMode === "customGhost") {
        const existedAtStart = (state.initialRoleCounts?.[roleKey] || 0) > 0;
        return existedAtStart || state.alwaysShownRoles.includes(actionType);
      }

      return false;
    }

    function addNarratorPlaceholders(queue) {
      NIGHT_ACTION_ORDER.forEach(actionType => {
        const alreadyPresent = queue.some(action => queueActionType(action) === actionType);
        if (!alreadyPresent && shouldShowGhostAction(actionType)) {
          queue.push({ type: "ghost", ghostType: actionType });
        }
      });

      return queue
        .map((action, originalIndex) => ({ action, originalIndex }))
        .sort((left, right) => {
          const orderDifference = NIGHT_ACTION_ORDER.indexOf(queueActionType(left.action)) - NIGHT_ACTION_ORDER.indexOf(queueActionType(right.action));
          return orderDifference || left.originalIndex - right.originalIndex;
        })
        .map(item => item.action);
    }

    function buildNightQueue() {
      const queue = [];

      if (state.day === 1) {
        livingByRole("thief").filter(player => !player.thiefUsed)
          .forEach(player => queue.push({ type: "thief", actorId: player.id }));

        const cupids = livingByRole("cupid").filter(player => !player.cupidUsed);
        if (cupids.length) queue.push({ type: "cupid", actorIds: cupids.map(player => player.id) });
      }

      livingByRole("survivor").filter(player => !player.hideUsed)
        .forEach(player => queue.push({ type: "survivor", actorId: player.id }));

      const seers = livingByRole("seer");
      if (seers.length) queue.push({ type: "seer", actorIds: seers.map(player => player.id) });

      const detectives = livingByRole("detective");
      if (detectives.length) queue.push({ type: "detective", actorIds: detectives.map(player => player.id) });

      const guards = livingByRole("guard");
      if (guards.length) queue.push({ type: "guard", actorIds: guards.map(player => player.id) });

      const vampireHunters = livingByRole("vampireHunter");
      if (vampireHunters.length) queue.push({ type: "vampireHunter", actorIds: vampireHunters.map(player => player.id) });

      livingByRole("pyromaniac").forEach(player => queue.push({ type: "pyromaniac", actorId: player.id }));
      livingByRole("dictator").forEach(player => queue.push({ type: "dictator", actorId: player.id }));

      if (state.day === 2) {
        const chameleons = livingByRole("chameleon").filter(player => !player.chameleonChoice);
        if (chameleons.length) queue.push({ type: "chameleon", actorIds: chameleons.map(player => player.id), chameleonIndex: 0 });
      }

      if (livingWolves().length) queue.push({ type: "wolves" });

      const witches = livingByRole("witch").filter(player => !player.lifePotionUsed || !player.deathPotionUsed);
      if (witches.length) queue.push({ type: "witch", actorIds: witches.map(player => player.id), witchIndex: 0 });

      const imposters = livingByRole("imposter");
      if (imposters.length) queue.push({ type: "imposter", actorIds: imposters.map(player => player.id) });

      const knowers = livingByRole("knower");
      if (knowers.length) queue.push({ type: "knower", actorIds: knowers.map(player => player.id) });

      if (state.day % 2 === 1 && livingVampires().length) queue.push({ type: "vampires" });
      return addNarratorPlaceholders(queue);
    }


    function prepareNight() {
      const winner = checkWinner();
      if (winner) {
        state.winner = winner;
        state.winnerIds = [];
        state.phase = "finished";
        renderGame();
        return;
      }

      state.night = { ...emptyNight(), queue: buildNightQueue() };
      state.phase = state.night.queue.length ? "nightAction" : "dawn";
      save();
      renderGame();
    }

    function currentNightAction() {
      return state.night.queue[state.night.index] || null;
    }

    function advanceNightAction() {
      const completedAction = currentNightAction();
      state.night.index += 1;


      state.phase = state.night.index >= state.night.queue.length ? "dawn" : "nightAction";
      save();
      renderGame();
    }

    function renderNightAction() {
      const action = currentNightAction();
      if (!action) {
        state.phase = "dawn";
        renderGame();
        return;
      }

      if (action.type === "ghost") {
        renderGhostNightAction(action);
        return;
      }

      const renderers = {
        thief: renderDiefAction,
        cupid: renderCupidAction,
        survivor: renderSurvivorAction,
        seer: renderSeerAction,
        detective: renderDetectiveAction,
        guard: renderGuardAction,
        vampireHunter: renderVampireHunterAction,
        pyromaniac: renderPyromaniacAction,
        dictator: renderDictatorAction,
        chameleon: renderChameleonAction,
        wolves: renderWolvesAction,
        witch: renderWitchAction,
        imposter: renderImposterAction,
        knower: renderKnowerAction,
        vampires: renderVampiresAction
      };

      const renderer = renderers[action.type];
      if (renderer) renderer(action);
      else advanceNightAction();
    }

    function renderGhostNightAction(action) {
      const meta = NIGHT_ACTION_META[action.ghostType];
      if (!meta || !nightActionAppliesTonight(action.ghostType)) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>${meta.icon} ${meta.label}</h2>
        <div class="alert ghost-step">
          <strong>Wat je als verteller zegt:</strong><br>
          “${escapeHtml(meta.call)}”
        </div>
        <p class="step">Wacht even alsof deze rol een normale keuze maakt. Er hoeft niets ingevuld te worden.</p>
        <div class="actions">
          <button id="ghostNextBtn" class="secondary">Volgende</button>
        </div>`;

      $("ghostNextBtn").addEventListener("click", advanceNightAction);
    }

    function renderDiefAction(action) {
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive || actor.thiefUsed || actor.role !== "thief") return advanceNightAction();

      const candidates = livingPlayers().filter(player => player.id !== actor.id);
      if (!candidates.length) {
        actor.thiefUsed = true;
        return advanceNightAction();
      }

      phasePanel.innerHTML = `
        <h2>🥷 Dief wordt wakker</h2>
        <div class="alert neutral"><strong>${escapeHtml(actor.name)}</strong> kiest tijdens de eerste nacht één andere speler.</div>
        <p class="step">De Dief bekijkt nu alleen de rol van die speler. Hij blijft zelf Dief en heeft nog geen kamp. Pas wanneer dit gekozen doelwit later sterft, steelt de Dief de rol die het doelwit op dat moment heeft.</p>
        <label for="thiefTarget">Wiens rol bekijken en als doelwit vastleggen?</label>
        <select id="thiefTarget">${options(candidates)}</select>
        <div id="thiefRevealArea"></div>
        <div class="actions"><button id="inspectRoleBtn">Rol bekijken</button></div>`;

      $("inspectRoleBtn").addEventListener("click", () => {
        const targetId = $("thiefTarget").value;
        if (!targetId) return alert("Kies eerst een speler.");
        const target = getPlayer(targetId);
        const role = ROLES[target.role];

        actor.thiefUsed = true;
        actor.thiefTargetId = target.id;

        $("thiefRevealArea").innerHTML = `
          <div class="role-reveal">
            <span class="icon">${role.icon}</span>
            <strong>${escapeHtml(target.name)} is ${role.label}</strong>
            <div class="muted" style="margin-top:6px">${escapeHtml(actor.name)} blijft voorlopig Dief. De gestolen rol wordt pas actief wanneer ${escapeHtml(target.name)} later sterft.</div>
          </div>
          <button id="hideThiefResultBtn" class="success" style="width:100%">Rol verbergen en verdergaan</button>`;
        $("inspectRoleBtn").disabled = true;
        $("thiefTarget").disabled = true;
        addLog(`${actor.name} koos ${target.name} als doelwit van de Dief en bekeek diens rol (${role.label}).`);
        $("hideThiefResultBtn").addEventListener("click", advanceNightAction);
      });
    }

    function renderCupidAction(action) {
      const cupids = actionActors(action, "cupid").filter(player => !player.cupidUsed);
      if (!cupids.length || state.day !== 1) return advanceNightAction();

      const candidates = livingPlayers().filter(player => !(player.loverIds || []).length);
      if (candidates.length < 2) {
        cupids.forEach(cupid => cupid.cupidUsed = true);
        addLog(`Cupido kon geen twee vrije spelers meer koppelen.`);
        return advanceNightAction();
      }

      phasePanel.innerHTML = `
        <h2>💘 Cupido wordt wakker</h2>
        <div class="alert"><strong>${cupids.map(cupid => escapeHtml(cupid.name)).join(", ")}</strong> kiezen samen één koppel.</div>
        <p class="muted">Alle levende Cupido's delen dus dezelfde keuze. De geliefden zien elkaars rol. Hebben ze verschillende kampen, dan vormen ze kamp Koppel.</p>
        <label for="cupidFirst">Eerste geliefde</label>
        <select id="cupidFirst">${options(candidates)}</select>
        <label for="cupidSecond" style="margin-top:11px">Tweede geliefde</label>
        <select id="cupidSecond">${options(candidates)}</select>
        <div id="cupidRevealArea"></div>
        <div class="actions"><button id="confirmCupidBtn">Koppel vormen</button></div>`;

      $("confirmCupidBtn").addEventListener("click", () => {
        const firstId = $("cupidFirst").value;
        const secondId = $("cupidSecond").value;
        if (!firstId || !secondId) return alert("Kies twee spelers.");
        if (firstId === secondId) return alert("Kies twee verschillende spelers.");
        const first = getPlayer(firstId);
        const second = getPlayer(secondId);
        if ((first.loverIds || []).length || (second.loverIds || []).length) return alert("Eén speler is al verliefd.");

        const sameCamp = effectiveCamp(first) === effectiveCamp(second);
        first.loverIds = [...(first.loverIds || []), second.id];
        second.loverIds = [...(second.loverIds || []), first.id];
        if (!sameCamp) {
          first.forcedCampKey = "couple";
          second.forcedCampKey = "couple";
        }
        cupids.forEach(cupid => cupid.cupidUsed = true);

        const firstRole = ROLES[first.role];
        const secondRole = ROLES[second.role];
        $("cupidRevealArea").innerHTML = `
          <div class="role-reveal">
            <span class="icon">❤️</span>
            <strong>${escapeHtml(first.name)} en ${escapeHtml(second.name)} zijn verliefd</strong>
            <div style="margin-top:12px"><strong>${escapeHtml(first.name)}:</strong> ${firstRole.icon} ${firstRole.label}</div>
            <div style="margin-top:7px"><strong>${escapeHtml(second.name)}:</strong> ${secondRole.icon} ${secondRole.label}</div>
            <div class="muted" style="margin-top:10px">Kamp: ${sameCamp ? escapeHtml(campLabel(first)) : "Koppel"}</div>
          </div>
          <button id="hideCupidResultBtn" class="success" style="width:100%">Rollen verbergen en verdergaan</button>`;
        $("confirmCupidBtn").disabled = true;
        $("cupidFirst").disabled = true;
        $("cupidSecond").disabled = true;
        addLog(`Cupido maakte ${first.name} en ${second.name} verliefd.${sameCamp ? " Zij bleven in hetzelfde kamp." : " Zij vormen kamp Koppel."}`);
        $("hideCupidResultBtn").addEventListener("click", advanceNightAction);
      });
    }

    function renderSurvivorAction(action) {
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive || actor.hideUsed) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🏕️ Survivor wordt wakker</h2>
        <div class="alert neutral"><strong>${escapeHtml(actor.name)}</strong> mag één keer tijdens het spel gaan schuilen.</div>
        <p class="step">De Survivor is dan deze nacht immuun tegen alle nachtelijke doden, behalve het altijd dodelijke jagerschot.</p>
        <div class="actions">
          <button id="survivorHideBtn" class="success">Deze nacht schuilen</button>
          <button id="survivorWaitBtn" class="secondary">Kracht bewaren</button>
        </div>`;

      $("survivorHideBtn").addEventListener("click", () => {
        actor.hideUsed = true;
        state.night.hiddenIds.push(actor.id);
        addLog(`${actor.name} gebruikte de schuilplaats in nacht ${state.day}.`);
        advanceNightAction();
      });
      $("survivorWaitBtn").addEventListener("click", advanceNightAction);
    }

    function renderSeerAction(action) {
      const actors = actionActors(action, "seer");
      if (!actors.length) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🔮 Zieners worden wakker</h2>
        <div class="alert"><strong>${actors.map(actor => escapeHtml(actor.name)).join(", ")}</strong> kiezen samen één levende speler en zien allemaal dezelfde rolkaart.</div>
        <label for="seerTarget">Kaart van welke speler bekijken?</label>
        <select id="seerTarget">${options(livingPlayers())}</select>
        <div id="seerRevealArea"></div>
        <div class="actions"><button id="revealRoleBtn">Kaart bekijken</button></div>`;

      $("revealRoleBtn").addEventListener("click", () => {
        const targetId = $("seerTarget").value;
        if (!targetId) return alert("Kies eerst een speler.");
        const target = getPlayer(targetId);
        const role = ROLES[target.role];
        state.night.intel.seerActions.push({ actorIds: actors.map(actor => actor.id), targetId });
        $("seerRevealArea").innerHTML = `
          <div class="role-reveal"><span class="icon">${role.icon}</span><strong>${escapeHtml(target.name)} is ${role.label}</strong><div class="muted" style="margin-top:6px">Kamp: ${escapeHtml(campLabel(target))}</div></div>
          <button id="hideCardBtn" class="success" style="width:100%">Kaart verbergen en verdergaan</button>`;
        $("revealRoleBtn").disabled = true;
        $("seerTarget").disabled = true;
        addLog(`De Zieners bekeken de kaart van ${target.name}.`);
        $("hideCardBtn").addEventListener("click", advanceNightAction);
      });
    }

    function renderDetectiveAction(action) {
      const actors = actionActors(action, "detective");
      if (!actors.length) return advanceNightAction();

      const actorIds = new Set(actors.map(actor => actor.id));
      const candidates = livingPlayers().filter(player => !actorIds.has(player.id));
      if (candidates.length < 2) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🕵️ Detectives worden wakker</h2>
        <div class="alert"><strong>${actors.map(actor => escapeHtml(actor.name)).join(", ")}</strong> kiezen samen twee verschillende spelers.</div>
        <p class="muted">Ze krijgen samen alleen te weten of de effectieve kampen gelijk zijn. Geen van de Detectives kan als doelwit gekozen worden.</p>
        <label for="detectiveFirst">Eerste speler</label><select id="detectiveFirst">${options(candidates)}</select>
        <label for="detectiveSecond" style="margin-top:11px">Tweede speler</label><select id="detectiveSecond">${options(candidates)}</select>
        <div id="detectiveResultArea"></div>
        <div class="actions"><button id="detectiveCheckBtn">Kampen vergelijken</button></div>`;

      $("detectiveCheckBtn").addEventListener("click", () => {
        const firstId = $("detectiveFirst").value;
        const secondId = $("detectiveSecond").value;
        if (!firstId || !secondId) return alert("Kies twee spelers.");
        if (firstId === secondId) return alert("Kies twee verschillende spelers.");
        const first = getPlayer(firstId);
        const second = getPlayer(secondId);
        const sameCamp = effectiveCamp(first) === effectiveCamp(second);
        state.night.intel.detectiveActions.push({ actorIds: actors.map(actor => actor.id), firstId, secondId });
        $("detectiveResultArea").innerHTML = `
          <div class="role-reveal"><span class="icon">${sameCamp ? "✅" : "❌"}</span><strong>${sameCamp ? "Dezelfde kamp" : "Niet dezelfde kamp"}</strong><div class="muted" style="margin-top:6px">${escapeHtml(first.name)} en ${escapeHtml(second.name)}</div></div>
          <button id="hideDetectiveResultBtn" class="success" style="width:100%">Resultaat verbergen en verdergaan</button>`;
        $("detectiveFirst").disabled = true;
        $("detectiveSecond").disabled = true;
        $("detectiveCheckBtn").disabled = true;
        addLog(`De Detectives vergeleken de kampen van ${first.name} en ${second.name}.`);
        $("hideDetectiveResultBtn").addEventListener("click", advanceNightAction);
      });
    }

    function renderGuardAction(action) {
      const actors = actionActors(action, "guard");
      if (!actors.length) return advanceNightAction();

      const blockedIds = new Set(actors.map(actor => actor.lastProtectedId).filter(Boolean));
      const candidates = livingPlayers().filter(player => !blockedIds.has(player.id));
      if (!candidates.length) return advanceNightAction();

      const previousNames = [...blockedIds].map(getPlayer).filter(Boolean).map(player => escapeHtml(player.name));

      phasePanel.innerHTML = `
        <h2>🛡️ Guards worden wakker</h2>
        <div class="alert"><strong>${actors.map(actor => escapeHtml(actor.name)).join(", ")}</strong> kiezen samen één levende speler om deze nacht te beschermen.</div>
        <p class="muted">De gezamenlijke keuze mag geen speler zijn die één van deze Guards de vorige nacht heeft beschermd.</p>
        ${previousNames.length ? `<div class="alert warning">Vorige nacht beschermd: <strong>${previousNames.join(", ")}</strong></div>` : ""}
        <label for="guardTarget">Wie beschermen?</label><select id="guardTarget">${options(candidates)}</select>
        <div class="actions"><button id="confirmGuardBtn" class="success">Bescherming bevestigen</button></div>`;

      $("confirmGuardBtn").addEventListener("click", () => {
        const targetId = $("guardTarget").value;
        if (!targetId) return alert("Kies eerst een speler.");
        const target = getPlayer(targetId);
        actors.forEach(actor => actor.lastProtectedId = targetId);
        if (!state.night.guardedIds.includes(targetId)) state.night.guardedIds.push(targetId);
        state.night.intel.guardActions.push({ actorIds: actors.map(actor => actor.id), targetId });
        addLog(`De Guards beschermden ${target.name}.`);
        advanceNightAction();
      });
    }

    function randomChoice(items) {
      if (!items.length) return null;
      if (crypto.getRandomValues) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return items[array[0] % items.length];
      }
      return items[Math.floor(Math.random() * items.length)];
    }

    function renderVampireHunterAction(action) {
      const actors = actionActors(action, "vampireHunter");
      if (!actors.length) return advanceNightAction();

      const actorIds = new Set(actors.map(actor => actor.id));
      const candidates = livingPlayers().filter(player => !actorIds.has(player.id));
      if (!candidates.length) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🗡️ Vampierenjagers worden wakker</h2>
        <div class="alert"><strong>${actors.map(actor => escapeHtml(actor.name)).join(", ")}</strong> kiezen samen één levende speler als doelwit.</div>
        <p class="muted">Is het gekozen doelwit een Vampier, dan wordt die deze nacht gedood. Anders gebeurt er niets.</p>
        <label for="vampireHunterTarget">Doelwit</label>
        <select id="vampireHunterTarget">${options(candidates)}</select>
        <div id="vampireHunterResult"></div>
        <div class="actions"><button id="confirmVampireHunterTargetBtn">Doelwit bevestigen</button></div>`;

      $("confirmVampireHunterTargetBtn").addEventListener("click", () => {
        const targetId = $("vampireHunterTarget").value;
        if (!targetId) return alert("Kies eerst een doelwit.");
        const target = getPlayer(targetId);
        const isVampire = target.role === "vampire";
        state.night.intel.vampireHunterActions.push({ actorIds: actors.map(actor => actor.id), targetId: target.id });
        if (isVampire && !state.night.vampireHunterKillIds.includes(target.id)) state.night.vampireHunterKillIds.push(target.id);
        $("vampireHunterResult").innerHTML = `
          <div class="role-reveal"><span class="icon">${isVampire ? "🧛" : "✅"}</span><strong>${escapeHtml(target.name)}</strong><div class="muted" style="margin-top:7px">${isVampire ? "Dit is een Vampier en wordt deze nacht gedood." : "Dit is geen Vampier. Er gebeurt niets."}</div></div>
          <button id="closeVampireHunterResultBtn" class="success" style="width:100%">Resultaat verbergen en verdergaan</button>`;
        $("confirmVampireHunterTargetBtn").disabled = true;
        $("vampireHunterTarget").disabled = true;
        addLog(`De Vampierenjagers kozen ${target.name} als doelwit.`);
        $("closeVampireHunterResultBtn").addEventListener("click", advanceNightAction);
      });
    }
