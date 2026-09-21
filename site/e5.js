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
    const copyBtn = document.getElementById('checklist-copy');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const line = buildChecklistLine();
      if (!line) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(line).then(() => {
          copyBtn.textContent = 'Copiado';
          setTimeout(() => { copyBtn.textContent = 'Copiar línea'; }, 1500);
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = line; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); copyBtn.textContent = 'Copiado'; } catch (e) {}
        document.body.removeChild(ta);
        setTimeout(() => { copyBtn.textContent = 'Copiar línea'; }, 1500);
      }
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
