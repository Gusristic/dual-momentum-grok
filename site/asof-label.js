(function(){
  function fmt(iso){
    if(!iso) return '—';
    var p=iso.split('-');
    return p[2]+'/'+p[1]+'/'+p[0];
  }
  function run(){
    var m=window.DM_META||{};
    var el=document.querySelector('.brand-sub');
    if(el){
      el.innerHTML='Datos Yahoo · mes cerrado <strong>'+fmt(m.dataAsOf||'2026-08-31')+
        '</strong> · scrape '+fmt(m.dataScraped||'2026-09-21');
    }
    var info=document.querySelector('#page-info .card:last-of-type ul.bullets');
    if(info && !document.getElementById('asof-li')){
      var li=document.createElement('li');
      li.id='asof-li';
      li.innerHTML='<strong>Última actualización efectiva:</strong> mes cerrado <strong>'+
        fmt(m.dataAsOf||'2026-08-31')+'</strong> (scrape '+fmt(m.dataScraped||'2026-09-21')+
        '). Sin mes en curso incompleto.';
      var first=info.querySelector('li');
      if(first && first.nextSibling) info.insertBefore(li, first.nextSibling);
      else info.appendChild(li);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
