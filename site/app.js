(function(){
  function inflate(b64){
    var bin=atob(b64);
    var bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).text();
  }
  fetch('engine.b64',{cache:'no-store'}).then(function(r){
    if(!r.ok) throw new Error('engine.b64');
    return r.text();
  }).then(function(b64){
    return inflate(b64.trim());
  }).then(function(code){
    var s=document.createElement('script');
    s.textContent=code;
    document.body.appendChild(s);
  }).catch(function(err){
    console.error(err);
    return Promise.all(['e0.js','e1.js','e2.js','e3.js','e4.js','e5.js'].map(function(s){
      return fetch(s,{cache:'no-store'}).then(function(r){ return r.ok?r.text():''; });
    })).then(function(parts){
      var s=document.createElement('script');
      s.textContent=parts.join('');
      document.body.appendChild(s);
    });
  });
})();
