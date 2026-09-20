(function(){
  Promise.all(['app.c0.js','app.c1.js','app.c2.js','app.c3.js'].map(s=>fetch(s).then(r=>r.text())))
    .then(parts=>{ const s=document.createElement('script'); s.textContent=parts.join(''); document.body.appendChild(s); })
    .catch(e=>{ document.querySelector('.main').innerHTML='<div class="warn">Error: '+e+'</div>'; });
})();
