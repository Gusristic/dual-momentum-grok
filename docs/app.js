(function(){
  function load(src){return fetch(src).then(r=>r.text());}
  Promise.all([load('app.p1.js'),load('app.p2.js')]).then(([a,b])=>{
    const s=document.createElement('script');
    s.textContent=a+b;
    document.body.appendChild(s);
  }).catch(e=>{
    document.querySelector('.main').innerHTML='<div class="warn">Error cargando motor: '+e+'</div>';
  });
})();
