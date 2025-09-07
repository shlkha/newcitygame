(function(ns){
  ns.PRESET_OPTIONS = ns.PRESET_OPTIONS || [
    { key: '1x', mult:1, interval:2, label:'1x per 2s' },
    { key: '3x', mult:3, interval:5, label:'3x per 5s' },
    { key: '5x', mult:5, interval:12, label:'5x per 12s' },
    { key: '30x', mult:30, interval:35, label:'30x per 35s' },
    { key: '100x', mult:100, interval:90, label:'100x per 90s' },
    { key: '500x', mult:500, interval:400, label:'500x per 400s' }
  ];

  if(ns.UI) return;

  ns.UI = {
    log(msg){
      const el = document.getElementById('log');
      if(el){ const d=document.createElement('div'); d.textContent=msg; el.appendChild(d); el.scrollTop = el.scrollHeight; }
      console.log(msg);
    },
    createBuildingButtons(){
      const container = document.getElementById('buildingButtons');
      if(!container || !ns.Buildings) return;
      container.innerHTML='';
      for(const k in ns.Buildings){
        const b = ns.Buildings[k];
        const btn = document.createElement('button');
        btn.className='building-btn';
        const count = b.instances.length || 0;
        btn.textContent = `${b.name} • ${b.cost}€${b.populationIncrease?` • +${b.populationIncrease} pop`:''}${count?` • built: ${count}`:''}`;
        btn.addEventListener('click', ()=>{ b.build(); });
        container.appendChild(btn);
      }
    },
    updateStats(){
      const s = document.getElementById('stats'); if(!s || !ns.City) return;
      const parts = [];
      for(const k of Object.keys(ns.City)){
        const val = ns.City[k];
        if(typeof val === 'function') continue; // skip methods
        parts.push(`${k}: ${val}`);
      }
      s.innerHTML = parts.join(' &nbsp; | &nbsp; ');
    },
    toggleTutorialPanel(){
      const p = document.getElementById('tutorial-panel'); if(!p) return;
      p.style.display = (p.style.display==='block') ? 'none' : 'block';
    },
    refreshTutorial(){
      const panel = document.getElementById('tutorial-panel'); if(!panel || !ns.Buildings) return;
      panel.innerHTML = '<h3>Tutorial & Commands</h3>';
      const help = document.createElement('div');
      help.innerHTML = `<strong>Quick commands:</strong><ul>
        <li><code>stats</code></li><li><code>help</code></li><li><code>dropdown hide all</code></li></ul>`;
      panel.appendChild(help);
      for(const k in ns.Buildings){
        const b = ns.Buildings[k];
        const item = document.createElement('div');
        item.className='tutorial-category';
        item.innerHTML = `<h4>${b.name} (built: ${b.instances.length})</h4>`;
        panel.appendChild(item);
      }
    }
  };

})(window.Game);
