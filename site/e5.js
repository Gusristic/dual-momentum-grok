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
