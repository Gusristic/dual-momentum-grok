    const eligScores = rk.rows.filter((r) => r.eligible && r.score != null);
    rk.rows.forEach((r, idx) => {
      const isWin = r.eligible && idx === 0 && eligScores.length;
      let delta = '—';
      if (r.eligible && r.score != null && eligScores.length) {
        if (idx === 0 && eligScores.length > 1) delta = '+' + ((r.score - eligScores[1].score) * 100).toFixed(2) + ' pp';
        else if (idx > 0) delta = ((r.score - eligScores[0].score) * 100).toFixed(2) + ' pp';
      }
      html += '<tr class="' + (isWin ? 'winner' : '') + '"><td>' + r.rank +
        '</td><td class="name-cell">' + short(r.isin) + '<span class="isin-sub">' + name(r.isin) +
        ' · ' + r.isin + '</span></td><td class="num">' +
        (r.score != null ? (r.score * 100).toFixed(2) + '%' : '—') +
        '</td><td class="num ' + pctClass(r.r12) + '">' + pct(r.r12) +
        '</td><td class="num ' + pctClass(r.r6) + '">' + pct(r.r6) +
        '</td><td class="num ' + pctClass(r.r3) + '">' + pct(r.r3) +
        '</td><td><span class="badge ' + (r.eligible ? 'ok' : 'no') + '">' +
        (r.eligible ? 'sí' : 'no') + '</span></td><td class="num">' + delta + '</td></tr>';
    });
    tbody.innerHTML = html;
  }

  function renderVentanas() {
    const i = lastValidIndex();
    document.getElementById('ventanas-asof').textContent =
      'Última fecha NAV: ' + DATES[i] + ' · puntos Yahoo 1mo';
    const tbody = document.querySelector('#ventanas-table tbody');
    const rows = META.defaultIsins.filter((x) => SERIES[x]).map((isin) => {
      const r12 = retAt(isin, i, 12), r6 = retAt(isin, i, 6), r3 = retAt(isin, i, 3);
      const sc = r12 != null && r6 != null && r3 != null ? 0.5 * r12 + 0.3 * r6 + 0.2 * r3 : null;
      return { isin, r12, r6, r3, sc, pts: (NAV[isin] || []).length };
    });
    rows.sort((a, b) => (b.sc ?? -999) - (a.sc ?? -999));
    tbody.innerHTML = rows.map((r) =>
      '<tr' + (r.isin === META.cashIsin ? ' class="cash-row"' : '') +
      '><td class="name-cell">' + short(r.isin) + '<span class="isin-sub">' + name(r.isin) +
      '</span></td><td class="num ' + pctClass(r.r12) + '">' + pct(r.r12) +
      '</td><td class="num ' + pctClass(r.r6) + '">' + pct(r.r6) +
      '</td><td class="num ' + pctClass(r.r3) + '">' + pct(r.r3) +
      '</td><td class="num">' + (r.sc != null ? (r.sc * 100).toFixed(2) + '%' : '—') +
      '</td><td class="num">' + r.pts + '</td></tr>'
    ).join('');
  }


  function buildBenchEquity(equity) {
    if (!BENCH || !equity || equity.length < 2) return null;
    const startYm = equity[0].d.slice(0, 7);
    const startIdx = DATES.indexOf(startYm);
    if (startIdx < 0 || BENCH[startIdx] == null || BENCH[startIdx] === 0) return null;
    const base = BENCH[startIdx];
    return equity.map((e) => {
      const i = DATES.indexOf(e.d.slice(0, 7));
      if (i < 0 || BENCH[i] == null) return { d: e.d, v: null };
      return { d: e.d, v: BENCH[i] / base };
    });
  }

  function renderBacktest() {
    const bt = runBacktest(state.model, state.filter);
    const m = bt.metrics;
    const grid = document.getElementById('bt-metrics');
    if (!m) { grid.innerHTML = '<div class="metric"><div class="k">Sin datos</div></div>'; return; }
    const benchEq = buildBenchEquity(bt.equity);
    let benchCagr = null, benchTotal = null;
    if (benchEq) {
      const valid = benchEq.filter((e) => e.v != null);
      if (valid.length >= 2) {
        const years = (valid.length - 1) / 12;
        benchTotal = valid[valid.length - 1].v / valid[0].v - 1;
        benchCagr = years > 0 ? Math.pow(valid[valid.length - 1].v / valid[0].v, 1 / years) - 1 : null;
      }
    }
    const items = [
      ['CAGR', m.cagr != null ? (m.cagr * 100).toFixed(1) + '%' : '—'],
      ['Vol', (m.vol * 100).toFixed(1) + '%'],
      ['Sharpe', m.sharpe != null ? m.sharpe.toFixed(2) : '—'],
      ['Max DD', (m.max_dd * 100).toFixed(1) + '%'],
      ['Total', (m.total_return * 100).toFixed(0) + '%'],
      ['Meses', String(m.n_obs)],
      ['World CAGR', benchCagr != null ? (benchCagr * 100).toFixed(1) + '%' : '—'],
      ['World Tot', benchTotal != null ? (benchTotal * 100).toFixed(0) + '%' : '—'],
    ];
    grid.innerHTML = items.map(([k, v]) =>
      '<div class="metric"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'
    ).join('');
    drawChart(bt.equity, benchEq);
    const tbody = document.querySelector('#bt-history tbody');
    tbody.innerHTML = bt.signals.slice(-18).reverse().map((s) =>
      '<tr><td class="num">' + s.date + '</td><td class="name-cell">' + (s.label || short(s.asset_isin)) +
      '</td><td>' + (s.rotated ? '↻' : '·') + '</td><td class="num">' +
      (s.score != null ? (s.score * 100).toFixed(2) + '%' : '—') +
      '</td><td class="muted small">' + s.reason + '</td></tr>'
    ).join('');
  }

  function drawChart(equity, benchEq) {
    const canvas = document.getElementById('bt-chart');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
