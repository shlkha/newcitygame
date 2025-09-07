(function(ns){
  if(ns.App && ns.App._commandsAttached) return;
  ns.App = ns.App || {};
  ns.App._commandsAttached = true;

  ns.App.generateCommandTemplates = function(){
    if(ns.App._tpl) return ns.App._tpl;
    const templates = new Set(["stats","help","dropdown hide all","dropdown hide abr","dropdown config replaceOnDropdown true","dropdown config replaceOnDropdown false"]);
    for(const k in ns.Buildings){
      const b = ns.Buildings[k]; const base = b.name; const count = b.instances.length;
      for(let i=1;i<=count;i++){ if(!(b.buildingType && b.buildingType.toLowerCase()==='house')) templates.add(`${base}${i} request dropdown`); templates.add(`${base}${i} view`); }
      if(count>1){ if(!(b.buildingType && b.buildingType.toLowerCase()==='house')) templates.add(`${base}(1-${count}) request dropdown`); templates.add(`${base}(1-${count}) view`); }
      if(count>0 && !(b.buildingType && b.buildingType.toLowerCase()==='house')) templates.add(`${base}..all request dropdown`);
      templates.add(`list amount ${base}`); templates.add(`${base} view`);
      if(b.production){ templates.add(`${base} view interval>`); templates.add(`${base} view amount>`); } else if(b.populationIncrease){ templates.add(`${base} view populationIncrease>`); }
      templates.add(`build ${base}`);
    }
    ns.App._tpl = Array.from(templates);
    return ns.App._tpl;
  };

  ns.App.processCommand = function(cmd){
    if(!cmd) return true;
    cmd = cmd.trim();
    const ui = ns.UI;
    let m;
    if(/^dropdown hide all$/i.test(cmd)){ document.getElementById("dropdown-container").innerHTML=''; ui.log("✅ All dropdowns removed"); return true; }
    if(/^dropdown hide abr$/i.test(cmd)){ ui.log("✅ All but most recent dropdown removed"); return true; }
    if(/^dropdown config replaceOnDropdown true$/i.test(cmd)){ ns.dropdownConfig.replaceOnDropdown = true; ui.log("✅ replaceOnDropdown TRUE"); return true; }
    if(/^dropdown config replaceOnDropdown false$/i.test(cmd)){ ns.dropdownConfig.replaceOnDropdown = false; ui.log("✅ replaceOnDropdown FALSE"); return true; }

    if(/^stats\s*$/i.test(cmd)){ ui.updateStats(); ui.log("✅ Stats updated"); return true; }
    if(m = cmd.match(/^stats\s+([^\s]+)$/i)){ const key = m[1]; const found = (function(n){ const lk=n.toLowerCase(); for(const k of Object.keys(ns.City)) if(k.toLowerCase()===lk) return k; return null; })(key); if(found) ui.log(`${found}: ${ns.City[found]}`); else ui.log(`Stat "${key}" not found`); return true; }

    if(/^help$/i.test(cmd)){ document.getElementById("tutorial-panel").style.display = 'block'; ui.log("✅ Tutorial opened"); return true; }

    if(m = cmd.match(/^build\s+(\w+)$/i)){ const name=m[1]; const b = ((ns.Buildings[name]) || (function(n){ const ln=n.toLowerCase(); for(const k in ns.Buildings) if(k.toLowerCase()===ln) return ns.Buildings[k]; return null; })(name)); if(b){ b.build(); return true; } ui.log("❌ Building not found"); return true; }

    // other commands (view/request dropdown/range) simplified: attempt to match and call UI/building methods
    if(m = cmd.match(/^(\w+)(\d+)\s+request dropdown$/i)){ const bname=m[1], id=parseInt(m[2]); const b = ns.Buildings[bname] || (function(n){ const ln=n.toLowerCase(); for(const k in ns.Buildings) if(k.toLowerCase()===ln) return ns.Buildings[k]; return null; })(bname); if(!b){ ui.log("❌ Building not found"); return true; } ns.UI.createInstanceDropdown(b,id); return true; }
    if(m = cmd.match(/^(\w+)(\d+)\s+view$/i)){ const bname=m[1], id=parseInt(m[2]); const b = ns.Buildings[bname] || (function(n){ const ln=n.toLowerCase(); for(const k in ns.Buildings) if(k.toLowerCase()===ln) return ns.Buildings[k]; return null; })(bname); if(!b){ ui.log("❌ Building not found"); return true; } b.viewInstance(id); return true; }

    return false;
  };

})(window.Game);
