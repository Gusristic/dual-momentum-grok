(function () {
  function loadScript(src) {
    return fetch(src, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('No se pudo cargar ' + src);
      return r.text();
    });
  }
  function gunzipB64(b64) {
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Response(
      new Blob([arr]).stream().pipeThrough(new DecompressionStream('gzip'))
    ).text();
  }
  loadScript('engine_data.js')
    .then(function (code) {
      (0, eval)(code);
      if (!window.__DM_ENGINE_B64) throw new Error('engine_data sin B64');
      return gunzipB64(window.__DM_ENGINE_B64);
    })
    .then(function (engine) {
      var s = document.createElement('script');
      s.textContent = engine;
      document.body.appendChild(s);
    })
    .catch(function (err) {
      // fallback a chunks antiguos
      return Promise.all(
        ['app.c0.js', 'app.c1.js', 'app.c2.js', 'app.c3.js'].map(function (src) {
          return loadScript(src);
        })
      ).then(function (parts) {
        var s = document.createElement('script');
        s.textContent = parts.join('');
        document.body.appendChild(s);
      }).catch(function (e2) {
        var main = document.querySelector('.main');
        if (main) {
          main.innerHTML =
            '<div class="warn"><strong>Error motor:</strong> ' +
            (err.message || err) +
            ' / ' +
            (e2.message || e2) +
            '</div>';
        }
      });
    });
})();
