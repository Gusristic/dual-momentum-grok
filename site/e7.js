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
