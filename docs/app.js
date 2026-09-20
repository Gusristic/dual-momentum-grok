(function(){
  fetch('app.complete.js').then(r=>r.text()).then(t=>{
    const s=document.createElement('script'); s.textContent=t; document.body.appendChild(s);
  }).catch(e=>{ document.querySelector('.main').innerHTML='<div class="warn">Error: '+e+'</div>'; });
})();
