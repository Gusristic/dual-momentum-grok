(function(){
  Promise.all(['e0.js','e1.js','e2.js','e3.js','e4.js'].map(function(s){
    return fetch(s,{cache:'no-store'}).then(function(r){
      if(!r.ok) throw new Error(s); return r.text();
    });
  })).then(function(parts){
    var s=document.createElement('script');
    s.textContent=parts.join('');
    document.body.appendChild(s);
  }).catch(function(err){
    var main=document.querySelector('.main');
    if(main) main.innerHTML='<div class="warn"><strong>Error motor:</strong> '+(err.message||err)+'</div>';
  });
})();
