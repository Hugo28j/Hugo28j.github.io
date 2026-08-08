function beginDayDeath(id, reason, voteCount = null) {
      const target = getPlayer(id);
      const role = ROLES[target.role];
      state.dayResult = {
        targetId: id,
        name: target.name,
        role: target.role,
        roleLabel: role.label,
        roleIcon: role.icon,
        camp: campLabel(target),
        voteCount,
        noDeath: false,
        jesterWin: target.role === "jester",
        additionalDeaths: []
      };

      if (target.role === "jester") {
        state.pendingWinner = { type: "jester", ids: [target.id] };
        addLog(`${target.name} werd overdag uit het dorp gestemd en wint als Jester.`);
      }

      state.deathQueue = [{ id, reason, ignoreProtection: true }];
      state.pendingActions = [];
      state.resumePhase = "dayResult";
      state.nightResolutionActive = false;
      processResolution();
    }

    function showNoDeathDayResult(message) {
      state.dayResult = { noDeath: true, message };
      state.phase = "dayResult";
      save();
      renderGame();
    }

    function isNightImmune(id) {
      return state.nightResolutionActive && isProtectedTonight(id);
    }

    function resetStolenRoleResources(thief, stolenRole) {
      const keepCoupleCamp = thief.forcedCampKey === "couple";

      thief.role = stolenRole;
      if (!keepCoupleCamp) thief.forcedCampKey = null;

      // De gestolen rol start met zijn eigen persoonlijke krachten opnieuw vers.
      thief.hunterUsed = false;
      thief.hideUsed = false;
      thief.lifePotionUsed = false;
      thief.deathPotionUsed = false;
      thief.lastProtectedId = null;
      thief.cupidUsed = false;
      thief.coupPendingNight = null;
      thief.coupUsed = false;
      thief.chameleonChoice = null;
      thief.chameleonRevealed = false;
      thief.wasConvertedToVampire = false;
      thief.preVampireRole = null;
      thief.preVampireCampKey = null;
      thief.vampireOrder = null;
      thief.convertedNight = null;

      // De Dief krijgt nooit een tweede eerste-nachtkeuze wanneer hij later de rol Dief steelt.
      thief.thiefUsed = true;
      thief.thiefTargetId = null;

      if (stolenRole === "vampire") {
        thief.vampireOrder = state.nextVampireOrder++;
        thief.convertedNight = state.day;
      }
    }

    function resolveThievesForDeadTarget(deadPlayer, stolenRole) {
      const thieves = state.players.filter(player =>
        player.alive &&
        player.role === "thief" &&
        player.thiefTargetId === deadPlayer.id
      );

      thieves.forEach(thief => {
        const role = ROLES[stolenRole];
        resetStolenRoleResources(thief, stolenRole);
        addLog(`${thief.name} stal na de dood van ${deadPlayer.name} de rol ${role.label}. Alle persoonlijke krachten van die rol zijn opnieuw vers beschikbaar, voor zover de timing van de rol nog toelaat dat ze gebruikt worden.`);
      });
    }

    function killPlayer(id, reason, options = {}) {
      const player = getPlayer(id);
      if (!player || !player.alive) return;

      const wasMayor = player.mayor;
      const stolenRole = player.role;
      player.alive = false;
      player.mayor = false;
      addLog(`${player.name} stierf: ${reason}.`);

      if (state.nightResolutionActive) {
        const role = ROLES[player.role];
        state.nightDeathResults = state.nightDeathResults || [];
        if (!state.nightDeathResults.some(death => death.id === player.id)) {
          state.nightDeathResults.push({
            id: player.id,
            name: player.name,
            roleLabel: role.label,
            roleIcon: role.icon,
            camp: campLabel(player),
            reason
          });
        }
      }

      if (state.dayResult && state.dayResult.targetId !== player.id) {
        const role = ROLES[player.role];
        state.dayResult.additionalDeaths = state.dayResult.additionalDeaths || [];
        if (!state.dayResult.additionalDeaths.some(death => death.id === player.id)) {
          state.dayResult.additionalDeaths.push({ id: player.id, name: player.name, roleLabel: role.label, roleIcon: role.icon, camp: campLabel(player), reason });
        }
      }

      // Een levende Dief die precies deze speler koos, steelt nu pas diens actuele rol.
      resolveThievesForDeadTarget(player, stolenRole);

      const livingLovers = (player.loverIds || []).map(getPlayer).filter(lover => lover && lover.alive);
      livingLovers.reverse().forEach(lover => {
        state.deathQueue.unshift({
          id: lover.id,
          reason: `pleegde zelfmoord omdat geliefde ${player.name} stierf`,
          ignoreProtection: true,
          immediate: true,
          suppressMayorSuccessor: Boolean(options.suppressMayorSuccessor)
        });
      });

      if (wasMayor && !options.suppressMayorSuccessor) state.pendingActions.push({ type: "mayorSuccessor", actorId: player.id });
      if (player.role === "hunter" && !player.hunterUsed) state.pendingActions.push({ type: "hunterShot", actorId: player.id });

      if (player.role === "wolf") maybePromoteWolfChameleons();
    }

    function processResolution() {
      while (true) {
        // Tijdens de dageraad worden eerst ALLE nachtelijke slachtoffers verwerkt.
        // Speciale doodsacties, zoals het schot van de Jager, komen pas daarna.
        if (state.nightResolutionActive && !state.morningDeathsAnnounced) {
          if (state.deathQueue.length) {
            const death = state.deathQueue.shift();
            const player = getPlayer(death.id);
            if (!player || !player.alive) continue;

            if (death.reason === "werd door de weerwolven opgegeten" && player.role === "pyromaniac") {
              addLog(`${player.name} overleefde de weerwolfaanval omdat de speler op dat moment Pyromaan was.`);
              continue;
            }
            if (!death.ignoreProtection && isNightImmune(player.id)) {
              addLog(`${player.name} overleefde ${death.reason}, dankzij ${protectionDescription(player.id)}.`);
              continue;
            }

            killPlayer(player.id, death.reason, death);
            continue;
          }

          state.morningDeathsAnnounced = true;
          state.phase = "morningResult";
          save();
          renderGame();
          return;
        }

        if (state.deathQueue.length && state.deathQueue[0].immediate) {
          const death = state.deathQueue.shift();
          const player = getPlayer(death.id);
          if (player && player.alive) killPlayer(player.id, death.reason, death);
          continue;
        }

        if (state.pendingActions.length) {
          const action = state.pendingActions[0];
          const actor = getPlayer(action.actorId);
          if (!actor) { state.pendingActions.shift(); continue; }

          if (action.type === "mayorSuccessor") {
            if (!livingPlayers().length) {
              state.pendingActions.shift();
              addLog(`${actor.name} kon geen opvolger kiezen omdat niemand meer leefde.`);
              continue;
            }
            state.phase = "mayorSuccessor";
            save(); renderGame(); return;
          }

          if (action.type === "hunterShot") {
            if (actor.hunterUsed || !livingPlayers().length) {
              actor.hunterUsed = true;
              state.pendingActions.shift();
              continue;
            }
            state.phase = "hunterShot";
            save(); renderGame(); return;
          }

          state.pendingActions.shift();
          continue;
        }

        if (state.deathQueue.length) {
          const death = state.deathQueue.shift();
          const player = getPlayer(death.id);
          if (!player || !player.alive) continue;
          if (death.reason === "werd door de weerwolven opgegeten" && player.role === "pyromaniac") {
            addLog(`${player.name} overleefde de weerwolfaanval omdat de speler op dat moment Pyromaan was.`);
            continue;
          }
          if (!death.ignoreProtection && isNightImmune(player.id)) {
            addLog(`${player.name} overleefde ${death.reason}, dankzij ${protectionDescription(player.id)}.`);
            continue;
          }
          killPlayer(player.id, death.reason, death);
          continue;
        }

        finishResolution();
        return;
      }
    }

    function finishResolution() {
      const next = state.resumePhase;
      state.nightResolutionActive = false;

      if ((state.chameleonRevealPending || []).length && next !== "dayResult") {
        state.phase = "chameleonReveal";
        save(); renderGame(); return;
      }

      state.resumePhase = null;

      if (next === "dayResult") {
        if (state.pendingWinner) {
          state.winner = state.pendingWinner.type;
          state.winnerIds = state.pendingWinner.ids || [];
          state.pendingWinner = null;
        }
        state.phase = "dayResult";
        save(); renderGame(); return;
      }

      if (next === "morningActions") {
        continueMorningActions();
        return;
      }

      const winner = checkWinner();
      if (winner) {
        state.winner = winner;
        state.winnerIds = [];
        state.phase = "finished";
        save(); renderGame(); return;
      }

      state.phase = next || "day";
      save(); renderGame();
    }

    function renderChameleonReveal() {
      const players = (state.chameleonRevealPending || []).map(getPlayer).filter(Boolean);
      if (!players.length) {
        state.chameleonRevealPending = [];
        return finishResolution();
      }

      phasePanel.innerHTML = `
        <h2>🐺 Kameleon onthuld</h2>
        <p class="step">Maak nu bekend dat ${players.length === 1 ? "deze Kameleon" : "deze Kameleons"} tijdens nacht 2 voor de kant van de Weerwolven ${players.length === 1 ? "koos" : "kozen"}.</p>
        <div class="morning-death-list">
          ${players.map(player => `
            <div class="morning-death-card">
              <strong>🦎 ${escapeHtml(player.name)} → 🐺 Weerwolf</strong>
              <div class="muted">Alle gewone Weerwolven zijn verdwenen. De rol verandert nu openbaar naar Weerwolf met alle Weerwolf-abilities.</div>
            </div>`).join("")}
        </div>
        <div class="actions"><button id="continueAfterChameleonRevealBtn" class="success">Verder</button></div>`;

      $("continueAfterChameleonRevealBtn").addEventListener("click", () => {
        state.chameleonRevealPending = [];
        save();
        finishResolution();
      });
    }

    function continueMorningActions() {
      if (state.pendingCoupMayorId) {
        const dictator = getPlayer(state.pendingCoupMayorId);
        if (dictator && dictator.alive) {
          state.players.forEach(player => player.mayor = player.id === dictator.id);
          addLog(`${dictator.name} werd burgemeester na een geslaagde staatsgreep.`);
        }
        state.pendingCoupMayorId = null;
      }

      while (state.morningQueue.length) {
        const id = state.morningQueue[0];
        const dictator = getPlayer(id);
        if (!dictator || !dictator.alive || dictator.role !== "dictator" || dictator.coupPendingNight !== state.day) {
          state.morningQueue.shift();
          continue;
        }
        state.phase = "dictatorCoup";
        save(); renderGame(); return;
      }

      const winner = checkWinner();
      if (winner) {
        state.winner = winner;
        state.winnerIds = [];
        state.phase = "finished";
      } else {
        state.phase = state.afterMorningPhase || "day";
      }
      state.afterMorningPhase = null;
      save(); renderGame();
    }

    function renderDictatorCoup() {
      const dictatorId = state.morningQueue[0];
      const dictator = getPlayer(dictatorId);
      if (!dictator || !dictator.alive || dictator.role !== "dictator") {
        state.morningQueue.shift();
        return continueMorningActions();
      }

      const candidates = livingPlayers().filter(player => player.id !== dictator.id);
      if (!candidates.length) {
        dictator.coupPendingNight = null;
        state.morningQueue.shift();
        return continueMorningActions();
      }

      phasePanel.innerHTML = `
        <h2>🎖️ Staatsgreep van de Dictator</h2>
        <div class="alert danger"><strong>${escapeHtml(dictator.name)}</strong> voert de geplande coup uit en kiest zelf één speler die onmiddellijk sterft.</div>
        <p class="muted">Is het doelwit effectief kamp Dorp, dan sterft de Dictator ook. Is het doelwit geen kamp Dorp, dan wordt de Dictator burgemeester en volgt daarna de gewone stemming.</p>
        <label for="coupTarget">Wie wordt geëxecuteerd?</label><select id="coupTarget">${options(candidates)}</select>
        <div class="actions"><button id="confirmCoupTargetBtn" class="danger">Doelwit bevestigen</button></div>`;

      $("confirmCoupTargetBtn").addEventListener("click", () => {
        const targetId = $("coupTarget").value;
        if (!targetId) return alert("Kies eerst een speler.");
        const target = getPlayer(targetId);
        state.pendingCoupExecution = {
          dictatorId: dictator.id,
          targetId: target.id,
          targetIsVillage: effectiveCamp(target) === "village"
        };
        dictator.coupPendingNight = null;
        state.morningQueue.shift();
        state.phase = "dictatorCoupReveal";
        save();
        renderGame();
      });
    }

    function renderDictatorCoupReveal() {
      const execution = state.pendingCoupExecution;
      if (!execution) { state.phase = "day"; save(); renderGame(); return; }

      const dictator = getPlayer(execution.dictatorId);
      const target = getPlayer(execution.targetId);
      if (!dictator || !target) {
        state.pendingCoupExecution = null;
        return continueMorningActions();
      }

      const role = ROLES[target.role];
      phasePanel.innerHTML = `
        <h2>🎖️ Doelwit van de staatsgreep</h2>
        <p class="muted">Toon/lees dit resultaat voordat je de gevolgen van de coup afhandelt.</p>
        <div class="result-name">${escapeHtml(target.name)}</div>
        <div class="role-reveal">
          <span class="icon">${role.icon}</span>
          <strong>${escapeHtml(role.label)}</strong>
          <div class="muted" style="margin-top:6px">Kamp: ${escapeHtml(campLabel(target))}</div>
        </div>
        <div class="actions"><button id="executeCoupAfterRevealBtn" class="danger">Coup uitvoeren en verdergaan</button></div>`;

      $("executeCoupAfterRevealBtn").addEventListener("click", () => {
        state.pendingCoupExecution = null;
        state.deathQueue = [];
        state.pendingActions = [];
        state.resumePhase = "morningActions";
        state.nightResolutionActive = false;

        if (execution.targetIsVillage) {
          addLog(`${dictator.name} executeerde ${target.name}, maar het doelwit hoorde bij kamp Dorp. De Dictator sterft ook.`);
          state.deathQueue.push({ id: target.id, reason: `werd geëxecuteerd tijdens de coup van ${dictator.name}`, ignoreProtection: true });
          state.deathQueue.push({ id: dictator.id, reason: "stierf omdat de coup een lid van kamp Dorp trof", ignoreProtection: true });
        } else {
          addLog(`${dictator.name} executeerde ${target.name}, die niet bij kamp Dorp hoorde.`);
          state.pendingCoupMayorId = dictator.id;
          state.deathQueue.push({ id: target.id, reason: `werd geëxecuteerd tijdens de coup van ${dictator.name}`, ignoreProtection: true, suppressMayorSuccessor: true });
        }
        processResolution();
      });
    }

    function renderMayorElection() {
      phasePanel.innerHTML = `
        <h2>👑 Burgemeester kiezen</h2>
        <p class="step">Na de eerste nacht kiest het dorp één levende speler als burgemeester.</p>
        <p class="muted">De burgemeester beslist alleen bij een gelijke hoogste stemming.</p>
        <label for="mayorSelect">Nieuwe burgemeester</label><select id="mayorSelect">${options(livingPlayers())}</select>
        <div class="actions"><button id="confirmMayorBtn" class="warning">Burgemeester bevestigen</button></div>`;
      $("confirmMayorBtn").addEventListener("click", () => {
        const id = $("mayorSelect").value;
        if (!id) return alert("Kies eerst een speler.");
        appointMayor(id);
        state.mayorElectionDone = true;
        state.phase = "day";
        save(); renderGame();
      });
    }

    function appointMayor(id) {
      const player = getPlayer(id);
      if (!player || !player.alive) return;
      state.players.forEach(p => p.mayor = p.id === id);
      addLog(`${player.name} werd burgemeester.`);
    }

    function renderDay() {
      const mayor = currentMayor();
      phasePanel.innerHTML = `
        <h2>☀️ Dag ${state.day}</h2>
        <p class="step">De levende spelers overleggen. Daarna stemt iedereen op één levende speler.</p>
        ${mayor ? `<div class="alert warning"><strong>Burgemeester:</strong> ${escapeHtml(mayor.name)} beslist bij een gelijkstand.</div>` : `<div class="alert danger">Er is momenteel geen levende burgemeester.</div>`}
        <div class="actions"><button id="startVoteBtn">Stemming starten</button><button id="skipVoteBtn" class="secondary">Stemming overslaan</button></div>`;
      $("startVoteBtn").addEventListener("click", () => {
        state.players.forEach(player => player.voteTargetId = null);
        state.phase = "vote";
        renderGame();
      });
      $("skipVoteBtn").addEventListener("click", () => {
        addLog(`Dag ${state.day}: de dorpsstemming werd overgeslagen.`);
        showNoDeathDayResult("De stemming werd overgeslagen. Niemand sterft.");
      });
    }

    function renderVote() {
      const living = livingPlayers();
      phasePanel.innerHTML = `
        <h2>🗳️ Stemmen invoeren</h2>
        <p class="muted">Een speler kan niet op zichzelf stemmen. Niet ingevulde stemmen tellen niet mee.</p>
        <div class="vote-list">${living.map(voter => `<div class="vote-row"><div class="voter">${escapeHtml(voter.name)} ${voter.mayor ? `<span class="pill mayor">👑</span>` : ""}</div><select data-voter-id="${voter.id}">${options(living.filter(target => target.id !== voter.id), voter.voteTargetId || "")}</select></div>`).join("")}</div>
        <div class="actions"><button id="countVotesBtn" class="danger">Stemmen tellen</button><button id="backToDayBtn" class="secondary">Terug</button></div>`;

      phasePanel.querySelectorAll("[data-voter-id]").forEach(select => {
        select.addEventListener("change", event => {
          const voter = getPlayer(event.target.dataset.voterId);
          if (voter) voter.voteTargetId = event.target.value || null;
          save();
        });
      });
      $("backToDayBtn").addEventListener("click", () => { state.phase = "day"; renderGame(); });
      $("countVotesBtn").addEventListener("click", () => {
        const counts = {};
        living.forEach(voter => {
          if (voter.voteTargetId) counts[voter.voteTargetId] = (counts[voter.voteTargetId] || 0) + 1;
        });
        const entries = Object.entries(counts);
        if (!entries.length) return alert("Er zijn nog geen stemmen ingevoerd.");
        const highest = Math.max(...entries.map(([, count]) => count));
        const leaders = entries.filter(([, count]) => count === highest).map(([id]) => id);
        if (leaders.length === 1) {
          const target = getPlayer(leaders[0]);
          addLog(`${target.name} kreeg de meeste stemmen (${highest}) en wordt uit het dorp gezet.`);
          beginDayDeath(target.id, "werd uit het dorp gestemd", highest);
        } else {
          state.voteTieIds = leaders;
          state.phase = "tie";
          addLog(`Gelijke stemming tussen ${leaders.map(id => getPlayer(id).name).join(", ")}.`);
          renderGame();
        }
      });
    }

    function renderTie() {
      const mayor = currentMayor();
      const tied = state.voteTieIds.map(getPlayer).filter(player => player && player.alive);
      phasePanel.innerHTML = `
        <h2>⚖️ Gelijke stemming</h2>
        <div class="alert warning">${mayor ? `<strong>${escapeHtml(mayor.name)}</strong> kiest als burgemeester.` : "Er is geen levende burgemeester. Kies als verteller."}</div>
        <label for="tieChoice">Keuze uit de gelijk geëindigde spelers</label><select id="tieChoice">${options(tied)}</select>
        <div class="actions"><button id="confirmTieBtn" class="danger">Keuze bevestigen</button><button id="tieNoDeathBtn" class="secondary">Niemand sterft</button></div>`;
      $("confirmTieBtn").addEventListener("click", () => {
        const id = $("tieChoice").value;
        if (!id) return alert("Kies eerst een speler.");
        const target = getPlayer(id);
        addLog(`${target.name} verloor de gelijkstand.`);
        state.voteTieIds = [];
        beginDayDeath(id, "werd uit het dorp gestemd na een gelijkstand");
      });
      $("tieNoDeathBtn").addEventListener("click", () => {
        state.voteTieIds = [];
        addLog(`Dag ${state.day}: door de gelijkstand stierf niemand.`);
        showNoDeathDayResult("Door de gelijkstand werd niemand uit het dorp gezet.");
      });
    }

    function renderDayResult() {
      const result = state.dayResult;
      if (!result) { state.phase = "day"; renderGame(); return; }

      const revealedChameleons = (state.chameleonRevealPending || []).map(getPlayer).filter(Boolean);
      const chameleonNotice = revealedChameleons.length
        ? `<div class="alert danger"><strong>🐺 Kameleon onthuld:</strong><br>${revealedChameleons.map(player => `${escapeHtml(player.name)} koos in nacht 2 voor de Weerwolven en is nu een echte Weerwolf.`).join("<br>")}</div>`
        : "";

      if (result.noDeath) {
        phasePanel.innerHTML = `<div class="center"><h2>📣 Resultaat van de stemming</h2><div class="role-reveal"><span class="icon">🤝</span><strong>Niemand sterft</strong><div class="muted" style="margin-top:8px">${escapeHtml(result.message)}</div></div>${chameleonNotice}<button id="goToNightBtn" class="success" style="width:100%">Ga naar de nacht</button></div>`;
      } else {
        phasePanel.innerHTML = `
          <div class="center"><h2>📣 Resultaat van de stemming</h2><div class="result-name">${escapeHtml(result.name)}</div>
          <div class="role-reveal"><span class="icon">${result.roleIcon}</span><strong>${escapeHtml(result.roleLabel)}</strong><div class="muted" style="margin-top:6px">Kamp: ${escapeHtml(result.camp)}</div>${result.voteCount !== null && result.voteCount !== undefined ? `<div class="muted" style="margin-top:6px">${result.voteCount} stem(men)</div>` : ""}</div>
          ${(result.additionalDeaths || []).length ? `<div class="alert danger"><strong>Ook gestorven:</strong><br>${result.additionalDeaths.map(death => `${escapeHtml(death.name)} — ${death.roleIcon} ${escapeHtml(death.roleLabel)} (${escapeHtml(death.reason)})`).join("<br>")}</div>` : ""}
          ${chameleonNotice}
          ${result.jesterWin ? `<div class="alert neutral"><strong>🃏 De Jester wint!</strong><br>${escapeHtml(result.name)} werd overdag uit het dorp gestemd.</div><button id="showJesterWinBtn" class="warning" style="width:100%">Toon einde</button>` : `<button id="goToNightBtn" class="success" style="width:100%">Ga naar de nacht</button>`}
          </div>`;
      }

      const go = $("goToNightBtn");
      if (go) go.addEventListener("click", () => {
        state.dayResult = null;
        state.chameleonRevealPending = [];
        const winner = checkWinner();
        if (winner) {
          state.winner = winner;
          state.winnerIds = [];
          state.phase = "finished";
          renderGame(); return;
        }
        state.players.forEach(player => player.voteTargetId = null);
        state.day += 1;
        prepareNight();
      });
      const jester = $("showJesterWinBtn");
      if (jester) jester.addEventListener("click", () => { state.dayResult = null; state.chameleonRevealPending = []; state.phase = "finished"; renderGame(); });
    }

    function renderMayorSuccessor() {
      const action = state.pendingActions[0];
      const deceasedMayor = getPlayer(action.actorId);
      phasePanel.innerHTML = `
        <h2>👑 Opvolger van de burgemeester</h2>
        <div class="alert warning"><strong>${escapeHtml(deceasedMayor.name)}</strong> kiest als overleden burgemeester een levende opvolger.</div>
        <label for="successorSelect">Gekozen opvolger</label><select id="successorSelect">${options(livingPlayers())}</select>
        <div class="actions"><button id="confirmSuccessorBtn" class="warning">Opvolger bevestigen</button></div>`;
      $("confirmSuccessorBtn").addEventListener("click", () => {
        const id = $("successorSelect").value;
        if (!id) return alert("Kies eerst een opvolger.");
        const successor = getPlayer(id);
        state.players.forEach(player => player.mayor = player.id === id);
        state.pendingActions.shift();
        addLog(`${deceasedMayor.name} duidde ${successor.name} aan als opvolgend burgemeester.`);
        processResolution();
      });
    }

    function renderHunterShot() {
      const action = state.pendingActions[0];
      const hunter = getPlayer(action.actorId);
      phasePanel.innerHTML = `
        <h2>🔫 Laatste kogel</h2>
        <div class="alert danger"><strong>${escapeHtml(hunter.name)}</strong> mag één speler meenemen die na de volledige nacht nog leeft. Het jagerschot gaat altijd door elke bescherming heen.</div>
        <label for="hunterTarget">Levend doelwit</label><select id="hunterTarget">${options(livingPlayers())}</select>
        <div class="actions"><button id="hunterShootBtn" class="danger">Schieten</button><button id="hunterSkipBtn" class="secondary">Niet schieten</button></div>`;
      $("hunterShootBtn").addEventListener("click", () => {
        const targetId = $("hunterTarget").value;
        if (!targetId) return alert("Kies eerst een doelwit.");
        const target = getPlayer(targetId);
        hunter.hunterUsed = true;
        state.pendingActions.shift();
        addLog(`${hunter.name} gebruikte de laatste kogel op ${target.name}.`);
        state.deathQueue.unshift({ id: targetId, reason: `werd geraakt door de laatste kogel van ${hunter.name}`, ignoreProtection: true, immediate: true });
        processResolution();
      });
      $("hunterSkipBtn").addEventListener("click", () => {
        hunter.hunterUsed = true;
        state.pendingActions.shift();
        addLog(`${hunter.name} gebruikte de laatste kogel niet.`);
        processResolution();
      });
    }

    function renderFinished() {
      const losingThieves = livingByRole("thief").filter(thief => {
        const target = thief.thiefTargetId ? getPlayer(thief.thiefTargetId) : null;
        return !target || target.alive;
      });
      const thiefLossHtml = losingThieves.length
        ? `<div class="alert neutral"><strong>🥷 Dief verliest:</strong> ${losingThieves.map(player => escapeHtml(player.name)).join(", ")} ${losingThieves.length === 1 ? "heeft" : "hebben"} de gekozen speler niet vóór het einde zien sterven en heeft dus geen rol/kamp kunnen stelen.</div>`
        : "";

      if (state.winner === "jester") {
        const winners = state.winnerIds.map(getPlayer).filter(Boolean);
        phasePanel.innerHTML = `<div class="center"><h2>🃏 De Jester wint</h2><div class="alert neutral">${winners.length ? winners.map(player => escapeHtml(player.name)).join(", ") : "Een Jester"} werd overdag uit het dorp gestemd.</div>${thiefLossHtml}<button id="finishedNewGameBtn">Nieuw spel starten</button></div>`;
      } else {
        const survivors = livingByRole("survivor").filter(player => effectiveCamp(player) === "survivor");
        const titles = {
          village: "🏆 Het dorp wint",
          wolves: "🐺 De weerwolven winnen",
          vampires: "🧛 De vampieren winnen",
          pyromaniac: "🔥 De Pyromaan wint",
          couple: "❤️ Het koppel wint"
        };
        const messages = {
          village: "Alle vijandige kampen zijn uitgeschakeld.",
          wolves: "Kamp Weerwolven heeft de overhand en er leeft geen concurrerend vijandig kamp meer.",
          vampires: "Kamp Vampieren heeft de overhand en er leeft geen concurrerend vijandig kamp meer.",
          pyromaniac: `${livingByCamp("pyromaniac").map(player => escapeHtml(player.name)).join(", ")} bleef als kamp Pyromaan over.`,
          couple: `${livingByCamp("couple").map(player => escapeHtml(player.name)).join(" en ")} bleef als kamp Koppel over.`
        };
        phasePanel.innerHTML = `
          <div class="center"><h2>${titles[state.winner] || "🏆 Spel afgelopen"}</h2>
          <div class="alert ${state.winner === "village" ? "success" : state.winner === "wolves" || state.winner === "vampires" ? "danger" : "neutral"}">${messages[state.winner] || "Het spel is afgelopen."}</div>
          ${survivors.length ? `<div class="alert neutral"><strong>Survivor-overwinning:</strong> ${survivors.map(player => escapeHtml(player.name)).join(", ")}</div>` : ""}
          ${thiefLossHtml}
          <button id="finishedNewGameBtn">Nieuw spel starten</button></div>`;
      }
      $("finishedNewGameBtn").addEventListener("click", resetGame);
    }
