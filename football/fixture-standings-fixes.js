// Consistent 2026/27 fixtures, UEFA participant identities, and sortable tables.
// Keep ESPN event IDs unchanged so saved manual scores continue to match.
(function () {
  // These exact participant names are defined in extra-ranked.js. Earlier
  // compatibility scripts accidentally remapped them to unranked aliases.
  Object.assign(ALIASES, {
    "agf": "AGF", "agf aarhus": "AGF", "aarhus": "AGF", "aarhus gf": "AGF",
    "heart of midlothian": "Heart of Midlothian",
    "heart of midlothian fc": "Heart of Midlothian",
    "hearts": "Heart of Midlothian",
    "sparta prague": "Sparta Prague", "sparta praha": "Sparta Prague",
    "ac sparta praha": "Sparta Prague",
    "omonia": "Omonia Nicosia", "omonia nicosia": "Omonia Nicosia",
    "ac omonia": "Omonia Nicosia",
    "nordsjaelland": "FC Nordsjælland",
    "fc nordsjaelland": "FC Nordsjælland",
    "fc nordsjælland": "FC Nordsjælland",
    "kaa gent": "KAA Gent", "aa gent": "KAA Gent", "gent": "KAA Gent"
  });

  const phaseDays = {
    ucl: {
      source: "uefa.champions",
      days: [
        ["2026-09-08", "2026-09-10"], ["2026-10-13", "2026-10-14"],
        ["2026-10-20", "2026-10-21"], ["2026-11-03", "2026-11-04"],
        ["2026-11-24", "2026-11-25"], ["2026-12-08", "2026-12-09"],
        ["2027-01-19", "2027-01-20"], ["2027-01-27", "2027-01-27"]
      ]
    },
    uel: {
      source: "uefa.europa",
      days: [
        ["2026-09-16", "2026-09-17"], ["2026-10-15", "2026-10-15"],
        ["2026-10-22", "2026-10-22"], ["2026-11-05", "2026-11-05"],
        ["2026-11-26", "2026-11-26"], ["2026-12-10", "2026-12-10"],
        ["2027-01-21", "2027-01-21"], ["2027-01-28", "2027-01-28"]
      ]
    },
    uecl: {
      source: "uefa.europa.conf",
      days: [
        ["2026-10-15", "2026-10-15"], ["2026-10-22", "2026-10-22"],
        ["2026-11-05", "2026-11-05"], ["2026-11-26", "2026-11-26"],
        ["2026-12-10", "2026-12-10"], ["2026-12-17", "2026-12-17"]
      ]
    }
  };
  const qualifyNames = ["First qualifying round", "Second qualifying round",
    "Third qualifying round", "Play-off round"];

  function qualifierIndex(date) {
    if (!date) return -1;
    if (date <= "2026-07-17") return 0;
    if (date <= "2026-08-01") return 1;
    if (date <= "2026-08-15") return 2;
    if (date <= "2026-08-28") return 3;
    return -1;
  }

  function normalizeEuropeanFixture(f) {
    f.home = canonicalName(f.home);
    f.away = canonicalName(f.away);
    const phase = phaseDays[f.competition];
    if (!phase) return;
    if (f.sourceLeague === phase.source) {
      const index = phase.days.findIndex(pair => f.date >= pair[0] && f.date <= pair[1]);
      if (index >= 0) {
        f.round = index + 1; // source ESPN week.number is absent or unreliable
        f.stage = "League phase";
        f.fixturePhase = "league";
        return;
      }
    }
    if (String(f.sourceLeague || "").endsWith("_qual") ||
        f.sourceLeague === "uefa-official-override") {
      const qi = qualifierIndex(f.date);
      f.round = null; // UEFA qualification rounds are NOT league matchdays
      f.fixturePhase = "qualifying";
      if (qi >= 0) f.stage = qualifyNames[qi];
    }
  }

  function normalizeDomesticRounds() {
    for (const [c, teams] of Object.entries(TEAMS_BY_LEAGUE)) {
      if (COMP[c]?.type !== "domestic") continue;
      const maxRound = teams.length === 20 ? 38 : 34;
      const games = FIXTURES.filter(f => f.competition === c && f.home && f.away);
      // Assign the ordinal appearance for each team in the complete season
      // schedule (not merely among completed games). The two ordinals are equal
      // for normal matchdays; they can differ after a postponed match.
      const orderedGames = games.slice().sort((a, b) =>
        (a.date || "9999").localeCompare(b.date || "9999") ||
        (a.kickoff || "").localeCompare(b.kickoff || "") ||
        String(a.id).localeCompare(String(b.id))
      );
      const played = new Map();
      for (const f of orderedGames) {
        const home = canonicalName(f.home), away = canonicalName(f.away);
        const h = (played.get(home) || 0) + 1;
        const a = (played.get(away) || 0) + 1;
        played.set(home, h); played.set(away, a);
        // Calendar-provided official rounds take precedence if they are valid.
        const fromCalendar = Number(f.round);
        if (Number.isInteger(fromCalendar) && fromCalendar >= 1 && fromCalendar <= maxRound) {
          f.round = fromCalendar;
        } else {
          f.round = Math.min(maxRound, Math.max(1, Math.round((h + a) / 2)));
        }
        f.stage = "Matchday " + f.round;
      }
    }
  }

  function repairLoadedFixtures() {
    FIXTURES.forEach(f => {
      if (COMP[f.competition]?.type === "europe") normalizeEuropeanFixture(f);
    });
    normalizeDomesticRounds();
  }

  const loadBeforeFixtureRepair = loadFixtures;
  loadFixtures = async function () {
    const result = await loadBeforeFixtureRepair();
    repairLoadedFixtures();

    // Migrate old non-participant spelling ratings, respecting an explicit
    // participant rating that the manager has already saved.
    const replacements = {
      "Aarhus": "AGF", "Hearts": "Heart of Midlothian",
      "Sparta Praha": "Sparta Prague", "Omonia": "Omonia Nicosia"
    };
    let changed = false;
    for (const [oldName, participant] of Object.entries(replacements)) {
      if (Object.prototype.hasOwnProperty.call(state.otherRatings || {}, oldName)) {
        // Defaults for promoted clubs are already in state.starts.
        if (!Object.prototype.hasOwnProperty.call(state.starts, participant))
          state.starts[participant] = Number(state.otherRatings[oldName]);
        delete state.otherRatings[oldName];
        changed = true;
      }
    }
    if (changed) save();
    return Object.assign({}, result, { normalizedMatchdays: true });
  };

  // Retain original input elements, attached events and diagnostic warnings,
  // but display the games together under their actual round, even when a
  // postponed fixture has a different date from the other games in that round.
  const renderBeforeRoundGrouping = renderMatchList;
  renderMatchList = function (c, autoScroll) {
    const result = renderBeforeRoundGrouping(c, autoScroll);
    const root = document.getElementById(c + "-matchList");
    if (!root) return result;
    const rows = Array.from(root.querySelectorAll(".match"));
    if (!rows.length) return result;

    const filter = document.getElementById(c + "-roundFilter");
    const r = filter ? filter.value : "all";
    const q = String(document.getElementById(c + "-teamFilter")?.value || "").toLowerCase();
    const open = Boolean(document.getElementById(c + "-openOnly")?.checked);
    const fixtures = chronological(allFixtures().filter(f => f.competition === c))
      .sort((a, b) => (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31") ||
        (a.kickoff || "").localeCompare(b.kickoff || ""))
      .filter(f => (r === "all" || String(f.round) === r) &&
        (!q || f.home.toLowerCase().includes(q) || f.away.toLowerCase().includes(q)) &&
        (!open || !scoreValue(f)));
    if (fixtures.length !== rows.length) return result;

    function groupFor(f) {
      if (COMP[c]?.type === "europe") {
        if (f.fixturePhase === "qualifying") return f.stage || "Qualifying";
        if (f.fixturePhase === "league") return "League phase · Matchday " + f.round;
        return f.round ? "Matchday " + f.round : (f.stage || niceDate(f.date));
      }
      return f.round ? "Matchday " + f.round : (f.stage || niceDate(f.date));
    }
    function groupNumber(f) {
      if (COMP[c]?.type === "europe") {
        if (f.fixturePhase === "qualifying") return qualifierIndex(f.date) - 10;
        if (f.fixturePhase === "league") return Number(f.round);
      }
      return f.round ? Number(f.round) : 999;
    }

    const paired = fixtures.map((f, i) => ({ f, node: rows[i], i }));
    paired.sort((a, b) => groupNumber(a.f) - groupNumber(b.f) ||
      (a.f.date || "9999").localeCompare(b.f.date || "9999") ||
      (a.f.kickoff || "").localeCompare(b.f.kickoff || "") || a.i - b.i);

    const fragment = document.createDocumentFragment();
    let group = null;
    for (const item of paired) {
      const nextGroup = groupFor(item.f);
      if (nextGroup !== group) {
        const title = document.createElement("h3");
        title.className = "round-title";
        title.textContent = nextGroup;
        fragment.appendChild(title);
        group = nextGroup;
      }
      fragment.appendChild(item.node);
    }
    root.replaceChildren(fragment);
    if (autoScroll) {
      const next = root.querySelector(".next-fixture");
      if (next) requestAnimationFrame(() => next.scrollIntoView({ behavior: "auto", block: "center" }));
    }
    return result;
  };

  // Delegated sorting works on freshly-rendered competition, world and compare
  // tables. Keep the chosen column/direction when filters rebuild their rows.
  const activeSort = new Map();
  const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
  function tableKey(table) {
    const panel = table.closest(".main-panel");
    if (panel) return panel.id;
    return table.closest("#clubOverlay") ? "club-history" : null;
  }
  function isTextColumn(header) {
    return /^(club|league|opponent|competition|date|score)$/i.test(header.trim());
  }
  function cellValue(row, index, header) {
    const text = String(row.children[index]?.textContent || "").trim();
    if (isTextColumn(header)) {
      if (/^date$/i.test(header)) {
        const date = Date.parse(text);
        return Number.isFinite(date) ? date : text;
      }
      return text;
    }
    const stripped = text.replace(/[^0-9+\-.,]/g, "").replace(",", ".");
    const n = Number(stripped);
    return stripped && Number.isFinite(n) ? n : text;
  }
  function sortTable(table) {
    const key = tableKey(table);
    if (!key) return;
    const headers = Array.from(table.querySelectorAll("thead th"));
    const state = activeSort.get(key);
    headers.forEach(th => {
      th.classList.add("click-sort");
      th.tabIndex = 0;
      th.setAttribute("role", "button");
      th.setAttribute("aria-sort", state && th.textContent.trim() === state.header ?
        (state.desc ? "descending" : "ascending") : "none");
    });
    if (!state) return;
    const index = headers.findIndex(th => th.textContent.trim() === state.header);
    if (index < 0) return;
    const body = table.tBodies[0];
    if (!body) return;
    const rows = Array.from(body.rows);
    if (rows.some(tr => tr.cells.length !== headers.length)) return;
    const values = rows.map((row, i) => ({ row, i, value: cellValue(row, index, state.header) }));
    values.sort((a, b) => {
      let compare;
      if (typeof a.value === "number" && typeof b.value === "number") {
        compare = a.value - b.value;
      } else {
        compare = collator.compare(String(a.value), String(b.value));
      }
      return (state.desc ? -compare : compare) || a.i - b.i;
    });
    if (values.some((entry, i) => entry.row !== rows[i]))
      values.forEach(entry => body.appendChild(entry.row));
  }
  function prepareSortables() {
    document.querySelectorAll("#panels table, #clubOverlay table").forEach(sortTable);
  }
  function selectSort(th) {
    const table = th.closest("table"), key = table && tableKey(table);
    if (!key || !table.tHead) return;
    const label = th.textContent.trim();
    const current = activeSort.get(key);
    const defaultDesc = !isTextColumn(label) && !label.startsWith("#");
    const desc = current?.header === label ? !current.desc : defaultDesc;
    activeSort.set(key, { header: label, desc });
    sortTable(table);
  }
  document.addEventListener("click", event => {
    const th = event.target.closest?.("#panels table thead th, #clubOverlay table thead th");
    if (th) selectSort(th);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const th = event.target.closest?.("#panels table thead th, #clubOverlay table thead th");
    if (th) { event.preventDefault(); selectSort(th); }
  });
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; prepareSortables(); });
  });
  const panels = document.getElementById("panels");
  if (panels) observer.observe(panels, { childList: true, subtree: true });

  // app-ui-4 invokes init() before this script is parsed. That first call may
  // already be awaiting its JSON fetch, so it has captured the previous
  // loadFixtures function. Apply the same repair immediately when it finishes.
  const syncLabel = document.getElementById("syncStatus");
  if (syncLabel) {
    const initialLoadObserver = new MutationObserver(() => {
      if (!FIXTURES.length) return;
      repairLoadedFixtures();
      const active = document.querySelector(".main-panel.active")?.id?.replace("main-", "");
      if (active && COMP[active]) renderCompetition(active);
      else if (active === "world") renderWorld();
    });
    initialLoadObserver.observe(syncLabel, { childList: true, subtree: true, characterData: true });
  }
  if (FIXTURES.length) repairLoadedFixtures();
  prepareSortables();
})();
