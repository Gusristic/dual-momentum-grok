(function(){
  function inflate(b64){
    var bin=atob(b64);
    var bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  Promise.all(['gz0.txt','gz1.txt','gz2.txt'].map(function(s){
    return fetch(s,{cache:'no-store'}).then(function(r){
      if(!r.ok) throw new Error(s); return r.text();
    });
  })).then(function(parts){
    return inflate(parts.join('').replace(/\s/g,''));
  }).then(function(code){
    var s=document.createElement('script');
    s.textContent=code;
    document.body.appendChild(s);
  }).catch(function(err){
    var main=document.querySelector('.main');
    if(main) main.innerHTML='<div class="warn"><strong>Error motor:</strong> '+(err.message||err)+'</div>';
    console.error(err);
  });
})();
