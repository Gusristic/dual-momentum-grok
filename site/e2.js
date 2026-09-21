      const mx = xs.reduce((p, c) => p + c, 0) / n, my = ys.reduce((p, c) => p + c, 0) / n;
      let num = 0, dx = 0, dy = 0;
      for (let i = 0; i < n; i++) {
        const ax = xs[i] - mx, ay = ys[i] - my;
        num += ax * ay; dx += ax * ax; dy += ay * ay;
      }
      return dx === 0 || dy === 0 ? null : num / Math.sqrt(dx * dy);
    }
    const matrix = {};
    for (const a of isins) {
      matrix[a] = {};
      for (const b of isins) matrix[a][b] = a === b ? 1 : corr(rets[a], rets[b]);
    }
    return { isins, matrix };
  }

  function loadSlots() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch (e) {}
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
        if (u.topK === 1 || u.topK === 2) state.topK = u.topK;
      }
    } catch (e) {}
  }
  function saveUi() {
    localStorage.setItem(STORAGE_UI, JSON.stringify({ model: state.model, filter: state.filter, topK: state.topK }));
  }

  function renderAll() {
    document.getElementById('sel-model').value = state.model;
    document.getElementById('sel-filter').value = state.filter;
    const tk = document.getElementById('sel-topk');
    if (tk) tk.value = String(state.topK);
    renderDecision(); renderRanking(); renderVentanas(); renderBacktest(); renderCorr(); renderSlots();
  }

  function renderDecision() {
    const i = lastValidIndex();
    const el = document.getElementById('decision-cards');
    const models = ['equilibrado', 'm12', 'm12_1', 'agresivo'];
    const kLabel = 'top-' + (state.topK || 1);
    el.innerHTML = models.map((mid) => {
      const rk = rankAt(mid, state.filter, i);
      const isCash = rk.picks.length === 1 && rk.picks[0].isin === META.cashIsin;
      const pickLabel = rk.picks.map((p) => short(p.isin) + (rk.picks.length > 1 ? ' ' + Math.round(p.w * 100) + '%' : '')).join(' + ');
      const pickNames = rk.picks.map((p) => name(p.isin)).join(' · ');
      return '<div class="model-card' + (mid === state.model ? ' active' : '') + (isCash ? ' cash-pick' : '') +
        '" data-model="' + mid + '"><div class="mc-label">' + META.models[mid].name +
        '</div><div class="mc-pick">' + pickLabel + '</div><div class="mc-isin">' + pickNames +
        '</div><div class="mc-score">' + (rk.pickScore != null ? (rk.pickScore * 100).toFixed(2) + '% score' : '—') +
        '</div><span class="mc-chip">' + (isCash ? 'cash' : kLabel + ' · ' + rk.eligCount + ' elegibles') +
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
      '». Filtro «' + filterLabel + '». Asignación «' + kLabel + '». ';
    if (rk.picks.length === 1 && rk.picks[0].isin === META.cashIsin) {
      why += 'Ningún fondo superó al cash → 100% cash.';
    } else {
      why += rk.picks.map((p) => name(p.isin) + ' ' + Math.round(p.w * 100) + '% (score ' +
        (p.score != null ? (p.score * 100).toFixed(2) + '%' : '—') + ')').join('; ') + '. ';
      if (rk.rotatedMeta) why += 'Margen vs siguiente (' + short(rk.rotatedMeta.second) + '): ' +
        (rk.rotatedMeta.delta * 100).toFixed(2) + ' pp. ';
      why += 'Cash score=' + (rk.cashScore != null ? (rk.cashScore * 100).toFixed(2) + '%' : '—') + '.';
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
