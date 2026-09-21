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
