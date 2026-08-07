"use strict";

    const STORAGE_KEY = "weerwolven_verteller_v11";
    const HISTORY_KEY = "weerwolven_verteller_v11_history";

    const ROLES = {
      villager: { label: "Burger", icon: "👤", camp: "Dorp", campKey: "village", campClass: "village" },
      doppelganger: { label: "Dubbelganger", icon: "🪞", camp: "Dubbelganger", campKey: "doppelganger", campClass: "neutral" },
      cupid: { label: "Cupido", icon: "💘", camp: "Dorp", campKey: "village", campClass: "village" },
      chameleon: { label: "Kameleon", icon: "🦎", camp: "Dorp", campKey: "village", campClass: "village" },
      wolf: { label: "Weerwolf", icon: "🐺", camp: "Weerwolven", campKey: "wolves", campClass: "wolf" },
      imposter: { label: "Imposter", icon: "🎭", camp: "Weerwolven", campKey: "wolves", campClass: "wolf" },
      vampire: { label: "Vampier", icon: "🧛", camp: "Vampieren", campKey: "vampires", campClass: "wolf" },
      vampireHunter: { label: "Vampierenjager", icon: "🗡️", camp: "Dorp", campKey: "village", campClass: "village" },
      hunter: { label: "Jager", icon: "🔫", camp: "Dorp", campKey: "village", campClass: "village" },
      seer: { label: "Ziener", icon: "🔮", camp: "Dorp", campKey: "village", campClass: "village" },
      detective: { label: "Detective", icon: "🕵️", camp: "Dorp", campKey: "village", campClass: "village" },
      guard: { label: "Guard", icon: "🛡️", camp: "Dorp", campKey: "village", campClass: "village" },
      witch: { label: "Heks", icon: "🧪", camp: "Dorp", campKey: "village", campClass: "village" },
      pyromaniac: { label: "Pyromaan", icon: "🔥", camp: "Pyromaan", campKey: "pyromaniac", campClass: "neutral" },
      dictator: { label: "Dictator", icon: "🎖️", camp: "Dorp", campKey: "village", campClass: "village" },
      knower: { label: "Betweter", icon: "🧠", camp: "Dorp", campKey: "village", campClass: "village" },
      survivor: { label: "Survivor", icon: "🏕️", camp: "Survivor", campKey: "survivor", campClass: "neutral" },
      jester: { label: "Jester", icon: "🃏", camp: "Jester", campKey: "jester", campClass: "neutral" }
    };


    const NIGHT_ACTION_ORDER = [
      "doppelganger", "cupid", "survivor", "seer", "detective", "guard",
      "vampireHunter", "pyromaniac", "dictator", "chameleon", "wolves", "witch",
      "imposter", "knower", "vampires"
    ];

    const NIGHT_ACTION_ROLE_KEY = {
      doppelganger: "doppelganger",
      cupid: "cupid",
      survivor: "survivor",
      seer: "seer",
      detective: "detective",
      guard: "guard",
      vampireHunter: "vampireHunter",
      pyromaniac: "pyromaniac",
      dictator: "dictator",
      chameleon: "chameleon",
      wolves: "wolf",
      witch: "witch",
      imposter: "imposter",
      knower: "knower",
      vampires: "vampire"
    };

    const NIGHT_ACTION_META = {
      doppelganger: { icon: "🪞", label: "Dubbelganger", call: "Dubbelganger, word wakker. Bekijk tijdens de eerste nacht de rol van één andere speler en neem die rol over." },
      cupid: { icon: "💘", label: "Cupido", call: "Cupido, word wakker. Kies tijdens de eerste nacht twee spelers die verliefd worden." },
      survivor: { icon: "🏕️", label: "Survivor", call: "Survivor, word wakker. Kies of je jouw eenmalige schuilplaats deze nacht gebruikt." },
      seer: { icon: "🔮", label: "Ziener", call: "Ziener, word wakker en kies één speler van wie je de rol wilt bekijken." },
      detective: { icon: "🕵️", label: "Detective", call: "Detective, word wakker en kies twee verschillende spelers om hun kampen te vergelijken." },
      guard: { icon: "🛡️", label: "Guard", call: "Guard, word wakker en kies één speler die je deze nacht beschermt." },
      vampireHunter: { icon: "🗡️", label: "Vampierenjager", call: "Vampierenjager, word wakker en kies één levende speler als doelwit. Als die speler een Vampier is, dood je die." },
      pyromaniac: { icon: "🔥", label: "Pyromaan", call: "Pyromaan, word wakker. Kies of je iemand met olie overgiet of eerder geoliede spelers verbrandt." },
      dictator: { icon: "🎖️", label: "Dictator", call: "Dictator, word wakker en kies of je voor de volgende ochtend een staatsgreep plant." },
      chameleon: { icon: "🦎", label: "Kameleon", call: "Kameleon, word wakker. Alleen tijdens nacht 2 kies je of je bij het Dorp blijft of in het geheim de kant van de Weerwolven kiest." },
      wolves: { icon: "🐺", label: "Weerwolven", call: "Weerwolven, word wakker en kies samen één levende speler om op te eten." },
      witch: { icon: "🧪", label: "Heks", call: "Heks, word wakker. Bekijk het doelwit van de weerwolven en kies of je maximaal één potion gebruikt." },
      imposter: { icon: "🎭", label: "Imposter", call: "Imposter, word wakker en kies één speler om te controleren of die een echte Weerwolf is." },
      knower: { icon: "🧠", label: "Betweter", call: "Betweter, word wakker en bekijk welke spelers deze nacht gekozen, bekeken, aangevallen of beschermd werden." },
      vampires: { icon: "🧛", label: "Vampieren", call: "Vampieren, word wakker en kies samen één speler die in een Vampier verandert." }
    };

    function emptyRolePool() {
      return Object.fromEntries(Object.keys(ROLES).map(roleKey => [roleKey, 0]));
    }

    function emptyIntel() {
      return {
        oilActions: [],
        burnActions: [],
        wolfVictimId: null,
        witchAttacks: [],
        guardActions: [],
        detectiveActions: [],
        seerActions: [],
        vampireHunterActions: []
      };
    }

    function emptyNight() {
      return {
        queue: [],
        index: 0,
        hiddenIds: [],
        guardedIds: [],
        wolfVictimId: null,
        wolfVictimSaved: false,
        witchKillIds: [],
        vampireHunterKillIds: [],
        pyromaniacBurns: [],
        vampireRetaliationIds: [],
        vampireResult: "",
        intel: emptyIntel()
      };
    }

    function freshState() {
      return {
        setupPlayers: [],
        narratorMode: "normal",
        rolePool: emptyRolePool(),
        alwaysShownRoles: [],
        initialRoleCounts: emptyRolePool(),
        gameStarted: false,
        players: [],
        phase: "nightAction",
        day: 1,
        night: emptyNight(),
        mayorElectionDone: false,
        voteTieIds: [],
        pendingActions: [],
        deathQueue: [],
        resumePhase: null,
        nightResolutionActive: false,
        dayResult: null,
        winner: null,
        winnerIds: [],
        pendingWinner: null,
        morningQueue: [],
        afterMorningPhase: null,
        pendingCoupMayorId: null,
        pendingCoupExecution: null,
        chameleonRevealPending: [],
        nextVampireOrder: 1,
        nightDeathResults: [],
        morningDeathsAnnounced: false,
        log: []
      };
    }

    let state = freshState();
    let undoHistory = loadUndoHistory();

    const $ = id => document.getElementById(id);
    const setupScreen = $("setupScreen");
    const gameScreen = $("gameScreen");
    const setupPlayerList = $("setupPlayerList");
    const rolePoolGrid = $("rolePoolGrid");
    const rolePoolSummary = $("rolePoolSummary");
    const alwaysShownPanel = $("alwaysShownPanel");
    const alwaysShownRolesGrid = $("alwaysShownRolesGrid");
    const phasePanel = $("phasePanel");
    const topStatus = $("topStatus");
    const playersOverview = $("playersOverview");
    const gameLog = $("gameLog");

    function uid() {
      return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function loadUndoHistory() {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    function saveUndoHistory() {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(undoHistory.slice(-25)));
      } catch {
        undoHistory = undoHistory.slice(-10);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(undoHistory)); } catch {}
      }
      updateUndoButton();
    }

    function updateUndoButton() {
      const button = $("undoBtn");
      if (!button) return;
      button.classList.toggle("hidden", undoHistory.length === 0);
      button.disabled = undoHistory.length === 0;
    }

    function checkpoint() {
      const snapshot = JSON.stringify(state);
      if (undoHistory[undoHistory.length - 1] !== snapshot) {
        undoHistory.push(snapshot);
        if (undoHistory.length > 25) undoHistory.shift();
        saveUndoHistory();
      }
    }

    function restorePreviousState() {
      const current = JSON.stringify(state);
      let snapshot = null;

      while (undoHistory.length) {
        const candidate = undoHistory.pop();
        if (candidate !== current) {
          snapshot = candidate;
          break;
        }
      }

      saveUndoHistory();
      if (!snapshot) return;

      try {
        const restored = JSON.parse(snapshot);
        state = { ...freshState(), ...restored };
        state.night = { ...emptyNight(), ...(restored.night || {}) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        if (state.gameStarted) renderGame();
        else renderSetup();
      } catch {
        alert("De vorige stap kon niet worden hersteld.");
      }
    }

    function save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      updateResumeButton();
      updateUndoButton();
    }

    function loadSaved() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function updateResumeButton() {
      const saved = loadSaved();
      $("resumeGameBtn").classList.toggle("hidden", !(saved && saved.gameStarted));
    }

    function getPlayer(id) {
      return state.players.find(player => player.id === id);
    }

    function livingPlayers() {
      return state.players.filter(player => player.alive);
    }

    function livingByRole(role) {
      return livingPlayers().filter(player => player.role === role);
    }

    function livingWolves() {
      return livingByRole("wolf");
    }

    function livingVampires() {
      return livingByRole("vampire");
    }

    function currentMayor() {
      return state.players.find(player => player.alive && player.mayor) || null;
    }

    function addLog(text) {
      state.log.unshift({
        id: uid(),
        time: new Date().toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" }),
        text
      });
      save();
    }

    function options(players, selected = "") {
      return `<option value="">Kies een speler…</option>` +
        players.map(player =>
          `<option value="${player.id}" ${player.id === selected ? "selected" : ""}>${escapeHtml(player.name)}</option>`
        ).join("");
    }

    function effectiveCamp(player) {
      if (player.forcedCampKey === "couple") return "couple";
      if (player.role === "chameleon" && player.chameleonChoice === "wolves") return "wolves";
      return player.forcedCampKey || ROLES[player.role].campKey;
    }

    function campLabel(player) {
      if (player.forcedCampKey === "couple") return "Koppel";
      if (player.role === "chameleon" && player.chameleonChoice === "wolves") return "Weerwolven";
      return ROLES[player.role].camp;
    }

    function campClass(player) {
      if (player.forcedCampKey === "couple") return "neutral";
      if (player.role === "chameleon" && player.chameleonChoice === "wolves") return "wolf";
      return ROLES[player.role].campClass;
    }

    function roleWasTakenByVampires(roleKey) {
      return state.players.some(player => player.wasConvertedToVampire && player.preVampireRole === roleKey);
    }

    function maybePromoteWolfChameleons() {
      if (livingByRole("wolf").length > 0) return [];

      const promoted = livingPlayers().filter(player =>
        player.role === "chameleon" &&
        player.chameleonChoice === "wolves" &&
        !player.chameleonRevealed
      );

      if (!promoted.length) return [];

      state.chameleonRevealPending = state.chameleonRevealPending || [];
      promoted.forEach(player => {
        player.role = "wolf";
        player.chameleonRevealed = true;
        if (player.forcedCampKey !== "couple") player.forcedCampKey = null;
        if (!state.chameleonRevealPending.includes(player.id)) state.chameleonRevealPending.push(player.id);
        addLog(`${player.name} had in nacht 2 voor kamp Weerwolven gekozen en wordt nu onthuld als Weerwolf.`);
      });

      return promoted;
    }

    function livingByCamp(campKey) {
      return livingPlayers().filter(player => effectiveCamp(player) === campKey);
    }

    function neutralSpectators(player) {
      return effectiveCamp(player) === "survivor" || effectiveCamp(player) === "jester";
    }

    function checkWinner() {
      const living = livingPlayers();
      if (!living.length) return null;

      const active = living.filter(player => !neutralSpectators(player));
      const activeCount = active.length;
      const coupleCount = active.filter(player => effectiveCamp(player) === "couple").length;
      const pyroCount = active.filter(player => effectiveCamp(player) === "pyromaniac").length;
      const wolfCount = livingByCamp("wolves").length;
      const vampireCount = livingByCamp("vampires").length;
      const villageCount = livingByCamp("village").length;

      if (coupleCount > 0 && coupleCount === activeCount) return "couple";
      if (pyroCount > 0 && pyroCount === activeCount) return "pyromaniac";

      const noOtherHostiles = coupleCount === 0 && pyroCount === 0;
      if (villageCount > 0 && wolfCount === 0 && vampireCount === 0 && noOtherHostiles) return "village";

      if (wolfCount > 0 && vampireCount === 0 && noOtherHostiles && wolfCount >= living.length - wolfCount) {
        return "wolves";
      }

      if (vampireCount > 0 && wolfCount === 0 && noOtherHostiles && vampireCount >= living.length - vampireCount) {
        return "vampires";
      }

      return null;
    }

    function roleCountsFromPlayers(players = state.setupPlayers) {
      const counts = emptyRolePool();
      players.forEach(player => {
        if (Object.prototype.hasOwnProperty.call(counts, player.role)) counts[player.role] += 1;
      });
      return counts;
    }

    function normalizeRolePool(pool) {
      const normalized = emptyRolePool();
      Object.keys(normalized).forEach(roleKey => {
        const value = Number(pool?.[roleKey] ?? 0);
        normalized[roleKey] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      });
      return normalized;
    }

    function renderRolePool() {
      state.rolePool = normalizeRolePool(state.rolePool);
      rolePoolGrid.innerHTML = Object.entries(ROLES).map(([roleKey, role]) => `
        <div class="role-count-row">
          <label for="pool-${roleKey}" style="margin:0;color:var(--text)">${role.icon} ${role.label}</label>
          <input id="pool-${roleKey}" data-pool-role="${roleKey}" type="number" inputmode="numeric" min="0" max="99" value="${state.rolePool[roleKey]}">
        </div>`).join("");

      rolePoolGrid.querySelectorAll("[data-pool-role]").forEach(input => {
        input.addEventListener("input", event => {
          const roleKey = event.target.dataset.poolRole;
          const value = Math.max(0, Math.floor(Number(event.target.value) || 0));
          state.rolePool[roleKey] = value;
          updateRolePoolSummary();
          save();
        });
      });

      updateRolePoolSummary();
    }

    function updateRolePoolSummary() {
      const total = Object.values(state.rolePool || {}).reduce((sum, count) => sum + (Number(count) || 0), 0);
      const playerCount = state.setupPlayers.length;
      const difference = total - playerCount;
      let message = `${total} rolkaart(en) in de pool voor ${playerCount} speler(s).`;
      if (difference > 0) message += ` Na het randomiseren blijven ${difference} willekeurige kaart(en) ongebruikt.`;
      if (difference < 0) message += ` Voeg nog ${Math.abs(difference)} kaart(en) toe om te kunnen randomiseren.`;
      if (difference === 0 && playerCount > 0) message += " Alle kaarten worden uitgedeeld.";
      rolePoolSummary.textContent = message;
    }

    function renderAlwaysShownRoles() {
      alwaysShownPanel.classList.toggle("hidden", state.narratorMode !== "customGhost");
      alwaysShownRolesGrid.innerHTML = NIGHT_ACTION_ORDER.map(actionType => {
        const meta = NIGHT_ACTION_META[actionType];
        const checked = state.alwaysShownRoles.includes(actionType) ? "checked" : "";
        const timing = actionType === "doppelganger" || actionType === "cupid"
          ? "alleen nacht 1"
          : actionType === "vampires" ? "alleen nacht 1, 3, 5, …" : "iedere nacht";
        return `
          <label class="role-toggle-row">
            <input type="checkbox" data-shown-role="${actionType}" ${checked}>
            <span><strong>${meta.icon} ${meta.label}</strong><br><span class="muted">${timing}</span></span>
          </label>`;
      }).join("");

      alwaysShownRolesGrid.querySelectorAll("[data-shown-role]").forEach(input => {
        input.addEventListener("change", event => {
          const actionType = event.target.dataset.shownRole;
          if (event.target.checked) {
            if (!state.alwaysShownRoles.includes(actionType)) state.alwaysShownRoles.push(actionType);
          } else {
            state.alwaysShownRoles = state.alwaysShownRoles.filter(type => type !== actionType);
          }
          save();
        });
      });
    }

    function shuffle(values) {
      const array = [...values];
      for (let index = array.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
      }
      return array;
    }

    function randomizeSetupRoles() {
      if (!state.setupPlayers.length) return alert("Voeg eerst spelers toe.");

      const bag = [];
      Object.entries(state.rolePool).forEach(([roleKey, count]) => {
        for (let index = 0; index < count; index += 1) bag.push(roleKey);
      });

      if (bag.length < state.setupPlayers.length) {
        return alert(`De rollenpool bevat ${bag.length} kaarten voor ${state.setupPlayers.length} spelers. Voeg nog ${state.setupPlayers.length - bag.length} kaarten toe.`);
      }

      const selectedRoles = shuffle(bag).slice(0, state.setupPlayers.length);
      const shuffledRoles = shuffle(selectedRoles);
      state.setupPlayers.forEach((player, index) => {
        player.role = shuffledRoles[index];
      });

      save();
      renderSetup();
    }

    function renderSetup() {
      setupScreen.classList.remove("hidden");
      gameScreen.classList.add("hidden");

      document.querySelectorAll('input[name="narratorMode"]').forEach(input => {
        input.checked = input.value === state.narratorMode;
        input.onchange = event => {
          state.narratorMode = event.target.value;
          save();
          renderSetup();
        };
      });

      if (!state.setupPlayers.length) {
        setupPlayerList.innerHTML = `<div class="alert">Nog geen spelers toegevoegd.</div>`;
      } else {
        setupPlayerList.innerHTML = state.setupPlayers.map((player, index) => `
          <div class="player-row">
            <div class="player-name">${index + 1}. ${escapeHtml(player.name)}</div>
            <select data-role-id="${player.id}">
              ${Object.entries(ROLES).map(([key, role]) =>
                `<option value="${key}" ${player.role === key ? "selected" : ""}>${role.icon} ${role.label}</option>`
              ).join("")}
            </select>
            <button class="danger small" data-remove-id="${player.id}">Verwijderen</button>
          </div>`).join("");
      }

      setupPlayerList.querySelectorAll("[data-role-id]").forEach(select => {
        select.addEventListener("change", event => {
          const player = state.setupPlayers.find(p => p.id === event.target.dataset.roleId);
          if (player) player.role = event.target.value;
          save();
        });
      });

      setupPlayerList.querySelectorAll("[data-remove-id]").forEach(button => {
        button.addEventListener("click", () => {
          state.setupPlayers = state.setupPlayers.filter(p => p.id !== button.dataset.removeId);
          save();
          renderSetup();
        });
      });

      renderRolePool();
      renderAlwaysShownRoles();
      updateResumeButton();
      updateUndoButton();
    }

    function renderGame() {
      setupScreen.classList.add("hidden");
      gameScreen.classList.remove("hidden");
      renderTopStatus();
      renderPhase();
      renderPlayersOverview();
      renderLog();
      save();
    }

    function renderTopStatus() {
      const mayor = currentMayor();
      const phaseLabels = {
        nightAction: "🌙 Nacht",
        dawn: "🌅 Dageraad",
        morningResult: "📣 Nachtelijke doden",
        dictatorCoup: "🎖️ Staatsgreep",
        mayorElection: "👑 Burgemeester",
        day: "☀️ Dag",
        vote: "🗳️ Stemming",
        tie: "⚖️ Gelijkstand",
        dayResult: "📣 Stemresultaat",
        mayorSuccessor: "👑 Opvolger",
        hunterShot: "🔫 Jager",
        finished: "🏆 Einde"
      };

      topStatus.innerHTML = `
        <div class="status-left">
          <span class="pill"><strong>Dag ${state.day}</strong></span>
          <span class="pill">${phaseLabels[state.phase] || "Spel"}</span>
          <span class="pill">${state.narratorMode === "normal" ? "Normale modus" : state.narratorMode === "hideDead" ? "Dode rollen verborgen" : "Schijnrollen actief"}</span>
        </div>
        <div class="status-right">
          <span class="pill">${livingPlayers().length} levend</span>
          ${mayor ? `<span class="pill mayor">👑 ${escapeHtml(mayor.name)}</span>` : ""}
        </div>
      `;
    }

    function abilityBadges(player) {
      const loverNames = (player.loverIds || [])
        .map(getPlayer)
        .filter(Boolean)
        .map(lover => escapeHtml(lover.name));

      const relationBadges = `
        ${player.wasDoppelganger ? `<span class="pill neutral">🪞 Gekopieerde rol</span>` : ""}
        ${loverNames.length ? `<span class="pill neutral">❤️ ${loverNames.join(", ")}</span>` : ""}
        ${player.forcedCampKey === "couple" ? `<span class="pill neutral">Kamp Koppel</span>` : ""}
      `;

      if (player.role === "witch") {
        return `${relationBadges}
          <span class="pill ${player.lifePotionUsed ? "used" : "village"}">💚 Leven ${player.lifePotionUsed ? "gebruikt" : "beschikbaar"}</span>
          <span class="pill ${player.deathPotionUsed ? "used" : "wolf"}">☠️ Dood ${player.deathPotionUsed ? "gebruikt" : "beschikbaar"}</span>`;
      }

      if (player.role === "survivor") {
        return `${relationBadges}<span class="pill ${player.hideUsed ? "used" : "neutral"}">🏕️ Schuilen ${player.hideUsed ? "gebruikt" : "beschikbaar"}</span>`;
      }

      if (player.role === "hunter") {
        return `${relationBadges}<span class="pill ${player.hunterUsed ? "used" : "village"}">🔫 Kogel ${player.hunterUsed ? "gebruikt" : "beschikbaar"}</span>`;
      }

      if (player.role === "guard" && player.lastProtectedId) {
        const protectedPlayer = getPlayer(player.lastProtectedId);
        return `${relationBadges}<span class="pill used">Vorige nacht: ${protectedPlayer ? escapeHtml(protectedPlayer.name) : "onbekend"}</span>`;
      }

      if (player.role === "pyromaniac") {
        const count = state.players.filter(target => (target.oiledByIds || []).includes(player.id)).length;
        return `${relationBadges}<span class="pill neutral">🛢️ ${count} geolied</span>`;
      }

      if (player.role === "dictator" && player.coupPendingNight === state.day) {
        return `${relationBadges}<span class="pill warning">Coup gepland</span>`;
      }

      if (player.role === "vampire") {
        return `${relationBadges}<span class="pill wolf">Ouderdom #${player.vampireOrder ?? "?"}</span>`;
      }

      return relationBadges;
    }
