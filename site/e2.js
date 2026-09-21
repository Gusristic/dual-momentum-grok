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
    const w = canvas.clientWidth || 640, h = 220;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!equity || equity.length < 2) return;
    const vals = equity.map((e) => e.v);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (benchEq) {
      for (const e of benchEq) if (e.v != null) { min = Math.min(min, e.v); max = Math.max(max, e.v); }
    }
    min *= 0.98; max *= 1.02;
    const pad = { l: 48, r: 12, t: 16, b: 28 };
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
    equity.forEach((e, idx) => {
      const x = pad.l + (iw * idx) / (equity.length - 1);
      const y = pad.t + ih * (1 - (e.v - min) / (max - min));
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#3d9cf0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineTo(pad.l + iw, pad.t + ih); ctx.lineTo(pad.l, pad.t + ih); ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ih);
    grad.addColorStop(0, 'rgba(61,156,240,0.35)'); grad.addColorStop(1, 'rgba(61,156,240,0)');
    ctx.fillStyle = grad; ctx.fill();
    if (benchEq && benchEq.length === equity.length) {
      ctx.beginPath();
      let started = false;
      benchEq.forEach((e, idx) => {
        if (e.v == null) return;
        const x = pad.l + (iw * idx) / (equity.length - 1);
        const y = pad.t + ih * (1 - (e.v - min) / (max - min));
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.75; ctx.setLineDash([5, 4]); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#5c6b80'; ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(equity[0].d.slice(0, 7), pad.l, h - 8);
    ctx.fillText(equity[equity.length - 1].d.slice(0, 7), w - pad.r - 48, h - 8);
    ctx.font = '10px DM Sans, sans-serif';
    ctx.fillStyle = '#3d9cf0'; ctx.fillRect(pad.l, 4, 10, 3);
    ctx.fillStyle = '#8b9bb0'; ctx.fillText('Estrategia', pad.l + 14, 10);
    if (benchEq) {
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(pad.l + 90, 4, 10, 3);
      ctx.fillStyle = '#8b9bb0'; ctx.fillText('MSCI World', pad.l + 104, 10);
    }
  }

  function renderCorr() {
    const { isins, matrix } = correlationMatrix();
    let html = '<table class="data-table corr-table"><thead><tr><th></th>';
    isins.forEach((i) => { html += '<th>' + short(i).slice(0, 10) + '</th>'; });
    html += '</tr></thead><tbody>';
    isins.forEach((a) => {
      html += '<tr><td class="name-cell">' + short(a) + '</td>';
      isins.forEach((b) => {
        const c = matrix[a][b];
        let bg = 'transparent', tx = '—';
        if (c != null) {
          tx = c.toFixed(2);
          const t = Math.max(-1, Math.min(1, c));
          bg = t >= 0
            ? 'rgba(52, 211, 153,' + (0.08 + t * 0.45) + ')'
            : 'rgba(248, 113, 113,' + (0.08 + -t * 0.45) + ')';
        }
        html += '<td class="num" style="background:' + bg + '">' + tx + '</td>';
      });
      html += '</tr>';
    });
    document.getElementById('corr-wrap').innerHTML = html + '</tbody></table>';
  }

  function renderSlots() {
    const el = document.getElementById('slots-list');
    el.innerHTML = META.defaultIsins.map((isin) => {
      const isCash = isin === META.cashIsin, on = state.active[isin] !== false;
      return '<div class="slot' + (on ? '' : ' disabled') + '">' +
        '<button type="button" class="toggle' + (on ? ' on' : '') + '" data-isin="' + isin + '"' +
        (isCash ? ' disabled title="Cash siempre activo"' : '') + '></button>' +
        '<div style="flex:1"><div class="slot-name">' + short(isin) + (isCash ? ' · cash' : '') +
        '</div><div class="slot-isin">' + name(isin) + ' · ' + isin + ' · Yahoo ' +
        (META.yahooMap[isin] || '—') + '</div></div>' +
        '<div class="num muted small">' + ((NAV[isin] || []).length || 0) + ' pts</div></div>';
    }).join('');
    el.querySelectorAll('.toggle:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => {
        const isin = btn.getAttribute('data-isin');
        state.active[isin] = !(state.active[isin] !== false);
        saveSlots(); renderAll();
      });
    });
  }

  function showPage(id) {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    const page = document.getElementById('page-' + id);
    if (page) page.classList.add('active');
    const tab = document.querySelector('.tab[data-page="' + id + '"]');
    if (tab) tab.classList.add('active');
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    if (id === 'backtest') setTimeout(() => renderBacktest(), 30);
  }

  function initNav() {
    document.querySelectorAll('.tab').forEach((t) => {
      t.addEventListener('click', () => showPage(t.getAttribute('data-page')));
    });
    showPage((location.hash || '#decision').replace('#', '') || 'decision');
    window.addEventListener('hashchange', () =>
      showPage((location.hash || '#decision').replace('#', '') || 'decision')
    );
  }
  function initControls() {
    document.getElementById('sel-model').addEventListener('change', (e) => {
      state.model = e.target.value; saveUi(); renderAll();
    });
    document.getElementById('sel-filter').addEventListener('change', (e) => {
      state.filter = e.target.value; saveUi(); renderAll();
    });
    const tk = document.getElementById('sel-topk');
    if (tk) tk.addEventListener('change', (e) => {
      state.topK = parseInt(e.target.value, 10) === 2 ? 2 : 1;
      saveUi(); renderAll();
    });
  }

  async function boot() {
    loadSlots(); loadUi(); initNav(); initControls();
    try {
      await loadNav();
      renderAll();
    } catch (err) {
      document.querySelector('.main').innerHTML =
        '<div class="warn"><strong>Error:</strong> ' + (err.message || err) +
        '. Comprueba site/nav/*.json en GitHub Pages.</div>';
    }
  }
  boot();
})();
