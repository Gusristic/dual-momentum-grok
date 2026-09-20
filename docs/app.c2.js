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

  function renderBacktest() {
    const bt = runBacktest(state.model, state.filter);
    const m = bt.metrics;
    const grid = document.getElementById('bt-metrics');
    if (!m) { grid.innerHTML = '<div class="metric"><div class="k">Sin datos</div></div>'; return; }
    const items = [
      ['CAGR', m.cagr != null ? (m.cagr * 100).toFixed(1) + '%' : '—'],
      ['Vol', (m.vol * 100).toFixed(1) + '%'],
      ['Sharpe', m.sharpe != null ? m.sharpe.toFixed(2) : '—'],
      ['Max DD', (m.max_dd * 100).toFixed(1) + '%'],
      ['Total', (m.total_return * 100).toFixed(0) + '%'],
      ['Meses', String(m.n_obs)],
    ];
    grid.innerHTML = items.map(([k, v]) =>
      '<div class="metric"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'
    ).join('');
    drawChart(bt.equity);
    const tbody = document.querySelector('#bt-history tbody');
    tbody.innerHTML = bt.signals.slice(-18).reverse().map((s) =>
      '<tr><td class="num">' + s.date + '</td><td class="name-cell">' + short(s.asset_isin) +
      '</td><td>' + (s.rotated ? '↻' : '·') + '</td><td class="num">' +
      (s.score != null ? (s.score * 100).toFixed(2) + '%' : '—') +
      '</td><td class="muted small">' + s.reason + '</td></tr>'
    ).join('');
  }

  function drawChart(equity) {
    const canvas = document.getElementById('bt-chart');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 640, h = 220;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!equity || equity.length < 2) return;
    const vals = equity.map((e) => e.v);
    const min = Math.min(...vals) * 0.98, max = Math.max(...vals) * 1.02;
    const pad = { l: 48, r: 12, t: 12, b: 28 };
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    ctx.strokeStyle = '#1a2230'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad.t + (ih * g) / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      const v = max - ((max - min) * g) / 4;
      ctx.fillStyle = '#5c6b80'; ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText(v.toFixed(2), 4, y + 4);
    }
    ctx.beginPath();
    equity.forEach((e, i) => {
      const x = pad.l + (iw * i) / (equity.length - 1);
      const y = pad.t + ih * (1 - (e.v - min) / (max - min));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3d9cf0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineTo(pad.l + iw, pad.t + ih); ctx.lineTo(pad.l, pad.t + ih); ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ih);
    grad.addColorStop(0, 'rgba(61,156,240,0.35)'); grad.addColorStop(1, 'rgba(61,156,240,0)');
    ctx.fillStyle = grad; ctx.fill();
