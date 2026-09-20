(function(){
  Promise.all(['app.e0.js','app.e1.js','app.e2.js','app.e3.js','app.e4.js'].map(s=>fetch(s).then(r=>r.text())))
    .then(parts=>{const s=document.createElement('script');s.textContent=parts.join('');document.body.appendChild(s);})
    .catch(e=>{document.querySelector('.main').innerHTML='<div class="warn">Error motor: '+e+'</div>';});
})();
