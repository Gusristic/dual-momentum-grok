(function(){
  var files=['e0.js','e1.js','e2.js','e3.js','e4.js','e5.js'];
  Promise.all(files.map(function(s){
    return fetch(s,{cache:'no-store'}).then(function(r){
      if(!r.ok) throw new Error(s); return r.text();
    });
  })).then(function(parts){
    var s=document.createElement('script');
    s.textContent=parts.join('');
    document.body.appendChild(s);
  }).catch(function(e){
    return Promise.all(['app.c0.js','app.c1.js','app.c2.js','app.c3.js'].map(function(s){
      return fetch(s,{cache:'no-store'}).then(function(r){return r.text();});
    })).then(function(parts){
      var s=document.createElement('script'); s.textContent=parts.join(''); document.body.appendChild(s);
    });
  });
})();
