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
