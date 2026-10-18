// UEFA-style league table for all ten domestic competitions.
(function () {
  function calculateDomesticLeagueTable(c, round) {
    const teams = TEAMS_BY_LEAGUE[c] || [];
    const stats = Object.fromEntries(teams.map(t => [t, { mp:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 }]));
    const allowed = new Set(teams);
    const chosenRound = round === "all" ? null : Number(round);
    for (const f of chronological(allFixtures().filter(f => f.competition === c))) {
      // Use actual matchday numbers, not only dates, for matchday snapshots.
      if (chosenRound !== null && !(Number(f.round) >= 1 && Number(f.round) <= chosenRound)) continue;
      const result = scoreValue(f);
      if (!result) continue;
      const home = typeof resolveTrackedFixtureName === "function"
        ? resolveTrackedFixtureName(f.home, c) : canonicalName(f.home);
      const away = typeof resolveTrackedFixtureName === "function"
        ? resolveTrackedFixtureName(f.away, c) : canonicalName(f.away);
      if (home === away || !allowed.has(home) || !allowed.has(away)) continue;
      const H = stats[home], A = stats[away], hg = result[0], ag = result[1];
      H.mp++; A.mp++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
      if (hg > ag) { H.w++; A.l++; H.pts += 3; }
      else if (ag > hg) { A.w++; H.l++; A.pts += 3; }
      else { H.d++; A.d++; H.pts++; A.pts++; }
    }
    const endDate = chosenRound === null ? null : lastRoundDate(c, chosenRound);
    const ratings = endDate ? recalc(endDate).ratings : recalc().ratings;
    const worldRank = Object.fromEntries(ordered(ALL_TRACKED, ratings).map((t, i) => [t, i + 1]));
    const rows = teams.slice().sort((a, b) => {
      const A = stats[a], B = stats[b];
      return B.pts - A.pts || (B.gf - B.ga) - (A.gf - A.ga) ||
        B.gf - A.gf || B.w - A.w ||
        (Number(ratings[b]) || 0) - (Number(ratings[a]) || 0) || a.localeCompare(b, "en");
    });
    return { rows, stats, ratings, worldRank };
  }

  function updateDomesticLeagueTable(c) {
    const root = document.getElementById(c + "-standings");
    const table = root && root.querySelector(".domestic-points-table");
    if (!table) return;
    const round = root.querySelector("#" + c + "-period").value;
    const data = calculateDomesticLeagueTable(c, round);
    const fragment = document.createDocumentFragment();

    data.rows.forEach((team, idx) => {
      const s = data.stats[team], tr = document.createElement("tr");
      const diff = s.gf - s.ga;
      const values = [idx + 1, data.worldRank[team] ?? "—", team,
        fmt(data.ratings[team]), s.mp, s.w, s.d, s.l,
        (diff > 0 ? "+" : "") + diff, s.pts];
      values.forEach((value, i) => {
        const td = document.createElement("td");
        if (i === 2) {
          const btn = document.createElement("button");
          btn.className = "club-link";
          btn.textContent = team;
          btn.onclick = () => openClub(team);
          td.appendChild(btn);
          td.className = "domestic-club-col";
        } else if (i === 3 || i === 9) {
          const b = document.createElement("b");
          b.textContent = String(value);
          td.appendChild(b);
        } else td.textContent = String(value);
        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });

    table.tBodies[0].replaceChildren(fragment);
    const hint = root.querySelector(".domestic-table-intro");
    if (hint) hint.textContent = round === "all"
      ? "Domestic league matches only. Final scores update this table and every club's global coefficient automatically."
      : "Standings through matchday " + round + ". League points use fixtures through that matchday; rating and World Rank use the historical date.";
  }

  function renderDomesticLeagueTable(c) {
    const root = document.getElementById(c + "-standings");
    if (!root) return;
    const prior = root.querySelector("#" + c + "-period");
    const selected = prior ? prior.value : "all";
    const rounds = [...new Set(allFixtures().filter(f => f.competition === c)
      .map(f => Number(f.round)).filter(r => Number.isInteger(r) && r > 0))]
      .sort((a, b) => a - b);

    root.innerHTML = '<div class="card domestic-standings-card">' +
      '<div class="section-title"><h3>' + COMP[c].name + ' standings</h3><span>' +
      (TEAMS_BY_LEAGUE[c] || []).length + ' clubs</span></div>' +
      '<p class="domestic-table-intro"></p>' +
      '<div class="domestic-period-bar"><label for="' + c + '-period">Standings after</label>' +
      '<select id="' + c + '-period"><option value="all">Overall / current</option>' +
      rounds.map(r => '<option value="' + r + '">Matchday ' + r + '</option>').join("") +
      '</select></div>' +
      '<div class="table-wrap" role="region" tabindex="0" aria-label="' +
      COMP[c].name + ' standings">' +
      '<table class="domestic-points-table"><thead><tr>' +
      '<th>#</th><th># World</th><th class="domestic-club-col">Club</th>' +
      '<th>Rating</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>' +
      '</tr></thead><tbody id="' + c + '-body"></tbody></table></div>' +
      '<small class="domestic-swipe-hint">Scroll sideways to see all columns →</small>' +
      '</div>';

    const select = root.querySelector("#" + c + "-period");
    if ([...select.options].some(o => o.value === selected)) select.value = selected;
    select.addEventListener("change", () => updateDomesticLeagueTable(c));
    updateDomesticLeagueTable(c);
  }

  // UEFA standings and the fixtures tabs retain their existing renderers.
  const earlierRenderStandings = renderStandings;
  renderStandings = function (c) {
    return COMP[c]?.type === "domestic"
      ? renderDomesticLeagueTable(c) : earlierRenderStandings(c);
  };

  window.footballDomesticStandingsData = calculateDomesticLeagueTable;
})();
