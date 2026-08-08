function addSetupPlayer() {
      const nameInput = $("playerName");
      const name = nameInput.value.trim();
      if (!name) { alert("Vul eerst een naam in."); nameInput.focus(); return; }
      const duplicate = state.setupPlayers.some(player => player.name.toLowerCase() === name.toLowerCase());
      if (duplicate && !confirm("Deze naam bestaat al. Toch toevoegen?")) return;
      state.setupPlayers.push({ id: uid(), name, role: $("playerRole").value });
      nameInput.value = "";
      nameInput.focus();
      save(); renderSetup();
    }

    function createPlayer(player, index, vampireCounter) {
      const isVampire = player.role === "vampire";
      const vampireOrder = isVampire ? vampireCounter.value++ : null;
      return {
        id: player.id,
        name: player.name,
        role: player.role,
        initialRole: player.role,
        alive: true,
        mayor: false,
        hunterUsed: false,
        hideUsed: false,
        lifePotionUsed: false,
        deathPotionUsed: false,
        lastProtectedId: null,
        thiefUsed: false,
        cupidUsed: false,
        thiefTargetId: null,
        loverIds: [],
        forcedCampKey: null,
        voteTargetId: null,
        oiledByIds: [],
        coupPendingNight: null,
        coupUsed: false,
        vampireOrder,
        convertedNight: isVampire ? 0 : null,
        wasConvertedToVampire: false,
        preVampireRole: null,
        preVampireCampKey: null,
        chameleonChoice: null,
        chameleonRevealed: false,
        setupIndex: index
      };
    }

    function startGame() {
      if (state.setupPlayers.length < 3) return alert("Voeg minstens 3 spelers toe.");
      const counter = { value: 1 };
      const players = state.setupPlayers.map((player, index) => createPlayer(player, index, counter));
      state = {
        ...freshState(),
        setupPlayers: state.setupPlayers.map(player => ({ ...player })),
        narratorMode: state.narratorMode,
        rolePool: normalizeRolePool(state.rolePool),
        alwaysShownRoles: [...state.alwaysShownRoles],
        initialRoleCounts: roleCountsFromPlayers(state.setupPlayers),
        gameStarted: true,
        players,
        nextVampireOrder: counter.value
      };
      addLog(`Spel gestart met ${state.players.length} spelers.`);
      prepareNight();
    }

    function resetGame() {
      if (!confirm("Zeker dat je een volledig nieuw spel wilt starten?")) return;
      localStorage.removeItem(STORAGE_KEY);
      state = freshState();
      renderSetup();
    }

    function normalizePlayer(player) {
      return {
        initialRole: player.initialRole || player.role || "villager",
        hunterUsed: false,
        hideUsed: false,
        lifePotionUsed: false,
        deathPotionUsed: false,
        lastProtectedId: null,
        thiefUsed: false,
        cupidUsed: false,
        thiefTargetId: null,
        loverIds: [],
        forcedCampKey: null,
        voteTargetId: null,
        oiledByIds: [],
        coupPendingNight: null,
        coupUsed: false,
        vampireOrder: null,
        convertedNight: null,
        wasConvertedToVampire: false,
        preVampireRole: null,
        preVampireCampKey: null,
        chameleonChoice: null,
        chameleonRevealed: false,
        ...player
      };
    }

    $("randomizeRolesBtn").addEventListener("click", randomizeSetupRoles);
    $("copyCurrentRolesBtn").addEventListener("click", () => {
      state.rolePool = roleCountsFromPlayers();
      save();
      renderSetup();
    });
    $("clearRolePoolBtn").addEventListener("click", () => {
      state.rolePool = emptyRolePool();
      save();
      renderSetup();
    });
    $("selectAllShownBtn").addEventListener("click", () => {
      state.alwaysShownRoles = [...NIGHT_ACTION_ORDER];
      save();
      renderSetup();
    });
    $("clearShownBtn").addEventListener("click", () => {
      state.alwaysShownRoles = [];
      save();
      renderSetup();
    });

    document.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button || button.id === "undoBtn") return;
      checkpoint();
    }, true);

    $("undoBtn").addEventListener("click", restorePreviousState);

    $("addPlayerBtn").addEventListener("click", addSetupPlayer);
    $("playerName").addEventListener("keydown", event => { if (event.key === "Enter") addSetupPlayer(); });
    $("startGameBtn").addEventListener("click", startGame);
    $("newGameBtn").addEventListener("click", resetGame);

    $("resumeGameBtn").addEventListener("click", () => {
      const saved = loadSaved();
      if (!saved || !saved.gameStarted) return;
      state = { ...freshState(), ...saved };
      state.rolePool = normalizeRolePool(saved.rolePool || {});
      state.initialRoleCounts = normalizeRolePool(saved.initialRoleCounts || {});
      state.alwaysShownRoles = Array.isArray(saved.alwaysShownRoles) ? saved.alwaysShownRoles.filter(type => NIGHT_ACTION_ORDER.includes(type)) : [];
      state.night = { ...emptyNight(), ...(saved.night || {}), intel: { ...emptyIntel(), ...((saved.night || {}).intel || {}) } };
      state.players = (state.players || []).map(normalizePlayer);
      renderGame();
    });

    const saved = loadSaved();
    if (saved && saved.gameStarted) {
      state = { ...freshState(), ...saved };
      state.rolePool = normalizeRolePool(saved.rolePool || {});
      state.initialRoleCounts = normalizeRolePool(saved.initialRoleCounts || {});
      state.alwaysShownRoles = Array.isArray(saved.alwaysShownRoles) ? saved.alwaysShownRoles.filter(type => NIGHT_ACTION_ORDER.includes(type)) : [];
      state.night = { ...emptyNight(), ...(saved.night || {}), intel: { ...emptyIntel(), ...((saved.night || {}).intel || {}) } };
      state.players = (state.players || []).map(normalizePlayer);
      renderGame();
    } else {
      if (saved) {
        state = { ...freshState(), ...saved };
        state.rolePool = normalizeRolePool(saved.rolePool || {});
        state.initialRoleCounts = normalizeRolePool(saved.initialRoleCounts || {});
        state.alwaysShownRoles = Array.isArray(saved.alwaysShownRoles) ? saved.alwaysShownRoles.filter(type => NIGHT_ACTION_ORDER.includes(type)) : [];
      }
      renderSetup();
    }
