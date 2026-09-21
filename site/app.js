(function () {
  Promise.all(
    ['app.c0.js', 'app.c1.js', 'app.c2.js', 'app.c3.js'].map(function (src) {
      return fetch(src, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('No se pudo cargar ' + src);
        return r.text();
      });
    })
  )
    .then(function (parts) {
      var s = document.createElement('script');
      s.textContent = parts.join('');
      document.body.appendChild(s);
    })
    .catch(function (err) {
      var main = document.querySelector('.main');
      if (main) {
        main.innerHTML =
          '<div class="warn"><strong>Error motor:</strong> ' +
          (err.message || err) +
          '</div>';
      }
    });
})();
