        const mNew = scoreAt(modelId, target, i), mOld = scoreAt(modelId, holding, i);
        if (mOld == null || mNew == null) {
          rotated = true; reason = 'rotar (dato ausente)'; holding = target;
        } else if (mNew - mOld > META.rotationThreshold) {
          rotated = true;
          reason = 'rotar · Δ ' + (mNew - mOld).toFixed(4) + ' > umbral';
          holding = target;
        } else {
          rotated = false;
          reason = 'mantener · Δ ' + (mNew - mOld).toFixed(4) + ' ≤ umbral';
          target = holding;
        }
      }
      if (i > start) {
        const prev = signals[signals.length - 1].asset_isin;
        const a = SERIES[prev][i - 1], b = SERIES[prev][i];
        if (a != null && b != null && a !== 0) eq *= b / a;
        equity.push({ d: DATES[i], v: eq });
      } else equity.push({ d: DATES[i], v: 1.0 });
      signals.push({
        date: DATES[i], asset_isin: target, score: scoreAt(modelId, target, i),
        rotated, reason, r12: retAt(target, i, 12), r6: retAt(target, i, 6), r3: retAt(target, i, 3),
      });
    }
    return { equity, signals, metrics: computeMetrics(equity) };
  }

  function correlationMatrix() {
    const isins = activeRiskIsins().concat([META.cashIsin]).filter((i) => SERIES[i]);
    const rets = {};
    for (const isin of isins) {
      const s = SERIES[isin], r = [];
      for (let i = 1; i < s.length; i++) {
        if (s[i] != null && s[i - 1] != null && s[i - 1] !== 0) r.push({ i, v: s[i] / s[i - 1] - 1 });
      }
      rets[isin] = r;
    }
    function corr(a, b) {
      const mapB = new Map(b.map((x) => [x.i, x.v]));
      const xs = [], ys = [];
      for (const x of a) if (mapB.has(x.i)) { xs.push(x.v); ys.push(mapB.get(x.i)); }
      if (xs.length < 24) return null;
      const n = xs.length;
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
