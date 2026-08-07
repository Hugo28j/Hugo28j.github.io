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
      if (actionType === "doppelganger" || actionType === "cupid") return state.day === 1;
      if (actionType === "vampires") return state.day % 2 === 1;
      return true;
    }

    function queueActionType(action) {
      return action.type === "ghost" ? action.ghostType : action.type;
    }

    function shouldShowGhostAction(actionType) {
      if (!nightActionAppliesTonight(actionType)) return false;

      if (state.narratorMode === "hideDead") {
        const roleKey = NIGHT_ACTION_ROLE_KEY[actionType];
        return (state.initialRoleCounts?.[roleKey] || 0) > 0;
      }

      if (state.narratorMode === "customGhost") {
        const roleKey = NIGHT_ACTION_ROLE_KEY[actionType];
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
        livingByRole("doppelganger").filter(player => !player.doppelgangerUsed)
          .forEach(player => queue.push({ type: "doppelganger", actorId: player.id }));
        livingByRole("cupid").filter(player => !player.cupidUsed)
          .forEach(player => queue.push({ type: "cupid", actorId: player.id }));
      }

      livingByRole("survivor").filter(player => !player.hideUsed)
        .forEach(player => queue.push({ type: "survivor", actorId: player.id }));
      livingByRole("seer").forEach(player => queue.push({ type: "seer", actorId: player.id }));
      livingByRole("detective").forEach(player => queue.push({ type: "detective", actorId: player.id }));
      livingByRole("guard").forEach(player => queue.push({ type: "guard", actorId: player.id }));
      livingByRole("vampireHunter").forEach(player => queue.push({ type: "vampireHunter", actorId: player.id }));
      livingByRole("pyromaniac").forEach(player => queue.push({ type: "pyromaniac", actorId: player.id }));
      livingByRole("dictator").forEach(player => queue.push({ type: "dictator", actorId: player.id }));

      if (livingWolves().length) queue.push({ type: "wolves" });

      livingByRole("witch").filter(player => !player.lifePotionUsed || !player.deathPotionUsed)
        .forEach(player => queue.push({ type: "witch", actorId: player.id }));
      livingByRole("imposter").forEach(player => queue.push({ type: "imposter", actorId: player.id }));
      livingByRole("knower").forEach(player => queue.push({ type: "knower", actorId: player.id }));

      if (state.day % 2 === 1 && livingVampires().length) queue.push({ type: "vampires" });
      return addNarratorPlaceholders(queue);
    }

    function rebuildNightQueueAfterDoppelgangers() {
      const completed = state.night.queue.slice(0, state.night.index);
      const remaining = buildNightQueue().filter(action => queueActionType(action) !== "doppelganger");
      state.night.queue = [...completed, ...remaining];
      state.night.index = completed.length;
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

      if (completedAction && completedAction.type === "doppelganger") {
        const nextAction = state.night.queue[state.night.index];
        if (!nextAction || nextAction.type !== "doppelganger") rebuildNightQueueAfterDoppelgangers();
      }

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
        doppelganger: renderDoppelgangerAction,
        cupid: renderCupidAction,
        survivor: renderSurvivorAction,
        seer: renderSeerAction,
        detective: renderDetectiveAction,
        guard: renderGuardAction,
        vampireHunter: renderVampireHunterAction,
        pyromaniac: renderPyromaniacAction,
        dictator: renderDictatorAction,
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

    function renderDoppelgangerAction(action) {
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive || actor.doppelgangerUsed) return advanceNightAction();

      const candidates = livingPlayers().filter(player => player.id !== actor.id);
      if (!candidates.length) {
        actor.doppelgangerUsed = true;
        return advanceNightAction();
      }

      phasePanel.innerHTML = `
        <h2>🪞 Dubbelganger wordt wakker</h2>
        <div class="alert neutral"><strong>${escapeHtml(actor.name)}</strong> kiest tijdens de eerste nacht één andere speler.</div>
        <p class="step">De Dubbelganger bekijkt die rol en verandert onmiddellijk in dezelfde rol en het basiskamp van die rol.</p>
        <label for="doppelTarget">Wiens rol kopiëren?</label>
        <select id="doppelTarget">${options(candidates)}</select>
        <div id="doppelRevealArea"></div>
        <div class="actions"><button id="copyRoleBtn">Rol bekijken en kopiëren</button></div>`;

      $("copyRoleBtn").addEventListener("click", () => {
        const targetId = $("doppelTarget").value;
        if (!targetId) return alert("Kies eerst een speler.");
        const target = getPlayer(targetId);
        const copiedRole = target.role;
        const role = ROLES[copiedRole];

        actor.doppelgangerUsed = true;
        actor.wasDoppelganger = true;
        actor.copiedFromId = target.id;
        actor.role = copiedRole;
        actor.forcedCampKey = null;
        if (copiedRole === "vampire" && !actor.vampireOrder) {
          actor.vampireOrder = state.nextVampireOrder++;
          actor.convertedNight = state.day;
        }

        $("doppelRevealArea").innerHTML = `
          <div class="role-reveal">
            <span class="icon">${role.icon}</span>
            <strong>${escapeHtml(target.name)} is ${role.label}</strong>
            <div class="muted" style="margin-top:6px">${escapeHtml(actor.name)} is nu ook ${role.label} — kamp ${escapeHtml(campLabel(actor))}</div>
          </div>
          <button id="hideDoppelResultBtn" class="success" style="width:100%">Rol verbergen en verdergaan</button>`;
        $("copyRoleBtn").disabled = true;
        $("doppelTarget").disabled = true;
        addLog(`${actor.name} kopieerde de rol van ${target.name} en werd ${role.label}.`);
        $("hideDoppelResultBtn").addEventListener("click", advanceNightAction);
      });
    }

    function renderCupidAction(action) {
      const cupid = getPlayer(action.actorId);
      if (!cupid || !cupid.alive || cupid.cupidUsed || state.day !== 1) return advanceNightAction();

      const candidates = livingPlayers().filter(player => !(player.loverIds || []).length);
      if (candidates.length < 2) {
        cupid.cupidUsed = true;
        addLog(`${cupid.name} kon geen twee vrije spelers meer koppelen.`);
        return advanceNightAction();
      }

      phasePanel.innerHTML = `
        <h2>💘 Cupido wordt wakker</h2>
        <div class="alert"><strong>${escapeHtml(cupid.name)}</strong> kiest twee verschillende spelers die verliefd worden.</div>
        <p class="muted">De geliefden zien elkaars rol. Hebben ze verschillende kampen, dan vormen ze kamp Koppel.</p>
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
        cupid.cupidUsed = true;

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
        addLog(`${cupid.name} maakte ${first.name} en ${second.name} verliefd.${sameCamp ? " Zij bleven in hetzelfde kamp." : " Zij vormen kamp Koppel."}`);
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
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🔮 Ziener wordt wakker</h2>
        <div class="alert"><strong>${escapeHtml(actor.name)}</strong> kiest één levende speler en bekijkt diens rolkaart.</div>
        <label for="seerTarget">Kaart van welke speler bekijken?</label>
        <select id="seerTarget">${options(livingPlayers())}</select>
        <div id="seerRevealArea"></div>
        <div class="actions"><button id="revealRoleBtn">Kaart bekijken</button></div>`;

      $("revealRoleBtn").addEventListener("click", () => {
        const targetId = $("seerTarget").value;
        if (!targetId) return alert("Kies eerst een speler.");
        const target = getPlayer(targetId);
        const role = ROLES[target.role];
        state.night.intel.seerActions.push({ actorId: actor.id, targetId });
        $("seerRevealArea").innerHTML = `
          <div class="role-reveal"><span class="icon">${role.icon}</span><strong>${escapeHtml(target.name)} is ${role.label}</strong><div class="muted" style="margin-top:6px">Kamp: ${escapeHtml(campLabel(target))}</div></div>
          <button id="hideCardBtn" class="success" style="width:100%">Kaart verbergen en verdergaan</button>`;
        $("revealRoleBtn").disabled = true;
        $("seerTarget").disabled = true;
        addLog(`${actor.name} bekeek de kaart van ${target.name}.`);
        $("hideCardBtn").addEventListener("click", advanceNightAction);
      });
    }

    function renderDetectiveAction(action) {
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive) return advanceNightAction();
      const candidates = livingPlayers().filter(player => player.id !== actor.id);
      if (candidates.length < 2) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🕵️ Detective wordt wakker</h2>
        <div class="alert"><strong>${escapeHtml(actor.name)}</strong> kiest twee verschillende spelers.</div>
        <p class="muted">Hij krijgt alleen te weten of hun effectieve kampen gelijk zijn en mag zichzelf niet kiezen.</p>
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
        state.night.intel.detectiveActions.push({ actorId: actor.id, firstId, secondId });
        $("detectiveResultArea").innerHTML = `
          <div class="role-reveal"><span class="icon">${sameCamp ? "✅" : "❌"}</span><strong>${sameCamp ? "Dezelfde kamp" : "Niet dezelfde kamp"}</strong><div class="muted" style="margin-top:6px">${escapeHtml(first.name)} en ${escapeHtml(second.name)}</div></div>
          <button id="hideDetectiveResultBtn" class="success" style="width:100%">Resultaat verbergen en verdergaan</button>`;
        $("detectiveFirst").disabled = true;
        $("detectiveSecond").disabled = true;
        $("detectiveCheckBtn").disabled = true;
        addLog(`${actor.name} vergeleek de kampen van ${first.name} en ${second.name}.`);
        $("hideDetectiveResultBtn").addEventListener("click", advanceNightAction);
      });
    }

    function renderGuardAction(action) {
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive) return advanceNightAction();
      const candidates = livingPlayers().filter(player => player.id !== actor.lastProtectedId);
      const previous = actor.lastProtectedId ? getPlayer(actor.lastProtectedId) : null;
      if (!candidates.length) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🛡️ Guard wordt wakker</h2>
        <div class="alert"><strong>${escapeHtml(actor.name)}</strong> beschermt één levende speler tegen alle nachtelijke doden behalve het jagerschot en de vampiertransformatie.</div>
        <p class="muted">De Guard mag zichzelf beschermen, maar niet dezelfde persoon als vorige nacht.</p>
        ${previous ? `<div class="alert warning">Vorige nacht: <strong>${escapeHtml(previous.name)}</strong></div>` : ""}
        <label for="guardTarget">Wie beschermen?</label><select id="guardTarget">${options(candidates)}</select>
        <div class="actions"><button id="confirmGuardBtn" class="success">Bescherming bevestigen</button></div>`;

      $("confirmGuardBtn").addEventListener("click", () => {
        const targetId = $("guardTarget").value;
        if (!targetId) return alert("Kies eerst een speler.");
        const target = getPlayer(targetId);
        actor.lastProtectedId = targetId;
        if (!state.night.guardedIds.includes(targetId)) state.night.guardedIds.push(targetId);
        state.night.intel.guardActions.push({ actorId: actor.id, targetId });
        addLog(`${actor.name} beschermde ${target.name}.`);
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
      const actor = getPlayer(action.actorId);
      if (!actor || !actor.alive) return advanceNightAction();
      const candidates = livingPlayers().filter(player => player.id !== actor.id);
      if (!candidates.length) return advanceNightAction();

      phasePanel.innerHTML = `
        <h2>🗡️ Vampierenjager wordt wakker</h2>
        <div class="alert"><strong>${escapeHtml(actor.name)}</strong> krijgt één willekeurig levend doelwit.</div>
        <p class="muted">Is het doelwit een Vampier, dan wordt die deze nacht aangevallen. Anders gebeurt niets.</p>
        <div id="vampireHunterResult"></div>
        <div class="actions"><button id="drawVampireHunterTargetBtn">Kies willekeurig doelwit</button></div>`;

      $("drawVampireHunterTargetBtn").addEventListener("click", () => {
        const target = randomChoice(candidates);
        const isVampire = target.role === "vampire";
        state.night.intel.vampireHunterActions.push({ actorId: actor.id, targetId: target.id });
        if (isVampire && !state.night.vampireHunterKillIds.includes(target.id)) state.night.vampireHunterKillIds.push(target.id);
        $("vampireHunterResult").innerHTML = `
          <div class="role-reveal"><span class="icon">${isVampire ? "🧛" : "✅"}</span><strong>${escapeHtml(target.name)}</strong><div class="muted" style="margin-top:7px">${isVampire ? "Dit is een Vampier en wordt aangevallen." : "Dit is geen Vampier. Er gebeurt niets."}</div></div>
          <button id="closeVampireHunterResultBtn" class="success" style="width:100%">Resultaat verbergen en verdergaan</button>`;
        $("drawVampireHunterTargetBtn").disabled = true;
        addLog(`${actor.name} controleerde willekeurig ${target.name}.`);
        $("closeVampireHunterResultBtn").addEventListener("click", advanceNightAction);
      });
    }
