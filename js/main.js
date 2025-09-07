(function(ns){
  function init(){
    if(!ns.UI || !ns.App || !ns.City || !ns.Buildings) return;
    ns.UI.createBuildingButtons();
    ns.UI.updateStats();
    ns.UI.refreshTutorial && ns.UI.refreshTutorial();

    const exec = document.getElementById('executeCommandBtn');
    const input = document.getElementById('commandInput');

    function executeFromInput(){
      const raw = (input && input.value||'').trim();
      if(!raw) return;
      ns.UI.log("> "+raw);
      const ok = ns.App.processCommand(raw);
      if(!ok){
        const tpl = ns.App.generateCommandTemplates();
        let best=null,bestScore=Infinity;
        for(const t of tpl){ const s = (ns.App && typeof ns.App.levenshtein==='function') ? ns.App.levenshtein(raw.toLowerCase(), t.toLowerCase()) : 999; if(s<bestScore){ bestScore=s; best=t; } }
        if(best && ns.App.shouldAutocorrect(raw,bestScore)){ ns.UI.log(`Autocorrect → "${best}" (distance ${bestScore}). Executing…`); ns.App.processCommand(best); }
        else ns.UI.log("❌ Command not recognized. Type 'help'.");
      }
      if(input) input.value='';
      const dd = document.getElementById('autocompleteDropdown'); if(dd) dd.style.display='none';
    }

    exec && exec.addEventListener('click', executeFromInput);
    // Enter key triggers execute (works on mac/other OS)
    input && input.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); executeFromInput(); } });

    // game loop
    setInterval(()=>{
      if(ns.City.population < ns.City.populationCap) ns.City.addPopulation(1);
      ns.City.changeMoney(ns.City.population * 2);
      for(const k in ns.Buildings){ const b = ns.Buildings[k]; if(b.production) b.instances.forEach(inst=>{ inst.timer++; if(inst.timer>=inst.interval){ ns.City.food += inst.amount; inst.timer = 0; } }); }
      ns.UI.updateStats();
    },1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.Game);
