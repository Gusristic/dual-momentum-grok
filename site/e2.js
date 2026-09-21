    state.active = {};
    for (const isin of META.defaultIsins) {
      if (isin === META.cashIsin) state.active[isin] = true;
      else state.active[isin] = saved && typeof saved[isin] === 'boolean' ? saved[isin] : true;
    }
  }
  function saveSlots() { localStorage.setItem(STORAGE, JSON.stringify(state.active)); }
  function loadUi() {
    try {
      const u = JSON.parse(localStorage.getItem(STORAGE_UI) || 'null');
      if (u) {
        if (u.model && META.models[u.model]) state.model = u.model;
        if (u.filter === 'score' || u.filter === 'r12') state.filter = u.filter;
      }
    } catch (e) {}
  }
  function saveUi() {
    localStorage.setItem(STORAGE_UI, JSON.stringify({ model: state.model, filter: state.filter }));
  }

  function renderAll() {
    document.getElementById('sel-model').value = state.model;
    document.getElementById('sel-filter').value = state.filter;
    renderDecision(); renderRanking(); renderVentanas(); renderBacktest(); renderCorr(); renderSlots();
  }

  function renderDecision() {
    const i = lastValidIndex();
    const el = document.getElementById('decision-cards');
    const models = ['equilibrado', 'm12', 'm12_1', 'agresivo'];
    el.innerHTML = models.map((mid) => {
      const rk = rankAt(mid, state.filter, i);
      const isCash = rk.pick === META.cashIsin;
      return '<div class="model-card' + (mid === state.model ? ' active' : '') + (isCash ? ' cash-pick' : '') +
        '" data-model="' + mid + '"><div class="mc-label">' + META.models[mid].name +
        '</div><div class="mc-pick">' + short(rk.pick) + '</div><div class="mc-isin">' + name(rk.pick) +
        '</div><div class="mc-score">' + (rk.pickScore != null ? (rk.pickScore * 100).toFixed(2) + '% score' : '—') +
        '</div><span class="mc-chip">' + (isCash ? 'cash' : 'top-1 · ' + rk.eligCount + ' elegibles') +
        '</span></div>';
    }).join('');
    el.querySelectorAll('.model-card').forEach((card) => {
      card.addEventListener('click', () => { state.model = card.getAttribute('data-model'); saveUi(); renderAll(); });
    });
    const rk = rankAt(state.model, state.filter, i);
    const filterLabel = state.filter === 'score'
      ? 'A: score(activo) > score(cash) con pesos del modelo'
      : 'B: solo R12(activo) > R12(cash)';
    let why = 'Fecha datos: ' + DATES[i] + '. Modelo «' + META.models[state.model].name +
      '». Filtro «' + filterLabel + '». ';
    if (rk.pick === META.cashIsin) why += 'Ningún fondo superó al cash → 100% cash.';
    else {
      why += 'Gana ' + name(rk.pick) + ' (score ' + (rk.pickScore * 100).toFixed(2) + '%). ';
      if (rk.rotatedMeta) why += 'Ventaja vs 2º (' + short(rk.rotatedMeta.second) + '): ' +
        (rk.rotatedMeta.delta * 100).toFixed(2) + ' pp. ';
      why += 'Cash score=' + (rk.cashScore != null ? (rk.cashScore * 100).toFixed(2) + '%' : '—') +
        ', R12 cash=' + (rk.cashR12 != null ? (rk.cashR12 * 100).toFixed(2) + '%' : '—') + '.';
    }
    document.getElementById('decision-why').textContent = why;
  }

  function renderRanking() {
    const i = lastValidIndex();
    const rk = rankAt(state.model, state.filter, i);
    const tbody = document.querySelector('#rank-table tbody');
    let html = '<tr class="cash-row"><td>—</td><td class="name-cell">' + short(META.cashIsin) +
      '<span class="isin-sub">' + name(META.cashIsin) + '</span></td><td class="num">' +
      (rk.cashScore != null ? (rk.cashScore * 100).toFixed(2) + '%' : '—') +
      '</td><td class="num ' + pctClass(rk.cashR12) + '">' + pct(rk.cashR12) +
      '</td><td class="num">' + pct(retAt(META.cashIsin, i, 6)) +
      '</td><td class="num">' + pct(retAt(META.cashIsin, i, 3)) +
      '</td><td><span class="badge ok">ref</span></td><td class="num">—</td></tr>';
    const eligScores = rk.rows.filter((r) => r.eligible && r.score != null);
    rk.rows.forEach((r, idx) => {
      const isWin = r.eligible && idx === 0 && eligScores.length;
      let delta = '—';
      if (r.eligible && r.score != null && eligScores.length) {
        if (idx === 0 && eligScores.length > 1) delta = '+' + ((r.score - eligScores[1].score) * 100).toFixed(2) + ' pp';
        else if (idx > 0) delta = ((r.score - eligScores[0].score) * 100).toFixed(2) + ' pp';
      }
      html += '<tr class="' + (isWin ? 'winner' : '') + '"><td>' + r.rank +
