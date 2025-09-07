(function(ns){
  if(ns.UI && ns.UI._dropdownsAttached) return;
  ns.UI._dropdownsAttached = true;

  ns.UI.createInstanceDropdown = function(building, instanceId){
    if(building.buildingType && building.buildingType.toLowerCase()==='house'){ ns.UI.log(`Not available for ${building.name}`); return; }
    const container = document.getElementById('dropdown-container'); if(!container) return;
    const div = document.createElement('div'); div.className='instance-dropdown';
    div.dataset.buildingName = building.name; div.dataset.instanceId = instanceId;
    const header = document.createElement('div'); header.style.fontWeight='700'; header.textContent = `${building.name} #${instanceId}`; div.appendChild(header);

    if(building.production){
      const select = document.createElement('select'); select.className='production-dropdown';
      const base = building.production.amount || 1;
      (ns.PRESET_OPTIONS||[]).forEach(o=>{ const opt=document.createElement('option'); opt.value=o.key; opt.textContent = `${o.label} → ${base*o.mult}`; select.appendChild(opt); });
      select.addEventListener('change', ()=>{ const sel = ns.PRESET_OPTIONS.find(p=>p.key===select.value); const amount=base*sel.mult; const interval=sel.interval; building.configureInstance ? building.configureInstance(instanceId, amount, interval) : (building.instances[instanceId-1].amount=amount, building.instances[instanceId-1].interval=interval); ns.UI.log(`Set ${building.name}#${instanceId} → ${amount} / ${interval}s`); ns.UI.updateStats(); });
      div.appendChild(select);
    } else {
      const lbl = document.createElement('label'); lbl.textContent='Population increase:'; const inp = document.createElement('input'); inp.type='number'; inp.value = building.populationIncrease||0; lbl.appendChild(inp); div.appendChild(lbl);
      const btn = document.createElement('button'); btn.className='building-btn'; btn.textContent='Apply'; btn.addEventListener('click', ()=>{ const v=parseInt(inp.value)||0; for(const inst of building.instances) inst.populationIncrease = v; ns.UI.updateStats(); }); div.appendChild(btn);
    }

    const close = document.createElement('button'); close.className='building-btn'; close.textContent='Close'; close.addEventListener('click', ()=>div.remove()); div.appendChild(close);
    container.appendChild(div);
  };

  ns.UI.createRangeDropdown = function(building,start,end){
    // reuse instance-dropdown style, apply to range
    const container = document.getElementById('dropdown-container'); if(!container) return;
    const div = document.createElement('div'); div.className='instance-dropdown'; div.dataset.buildingName = building.name; div.dataset.range = `${start}-${end}`;
    const header = document.createElement('div'); header.style.fontWeight='700'; header.textContent = `${building.name} #${start} → #${end}`; div.appendChild(header);

    if(building.production){
      const select = document.createElement('select'); const base = building.production.amount || 1;
      (ns.PRESET_OPTIONS||[]).forEach(o=>{ const opt=document.createElement('option'); opt.value=o.key; opt.textContent = `${o.label} → ${base*o.mult}`; select.appendChild(opt); });
      select.addEventListener('change', ()=>{ const sel=ns.PRESET_OPTIONS.find(p=>p.key===select.value); const amount=base*sel.mult; const interval=sel.interval; for(let i=start;i<=end;i++){ const inst=building.instances[i-1]; if(inst){ inst.amount=amount; inst.interval=interval; inst.timer=0; }} ns.UI.log(`Applied ${amount}/${interval}s to ${building.name} #${start}-#${end}`); ns.UI.updateStats(); });
      div.appendChild(select);
    } else {
      const inp = document.createElement('input'); inp.type='number'; inp.value = building.populationIncrease || 0; div.appendChild(inp);
      const btn = document.createElement('button'); btn.className='building-btn'; btn.textContent='Apply to range'; btn.addEventListener('click', ()=>{ const v=parseInt(inp.value)||0; for(let i=start;i<=end;i++){ const inst=building.instances[i-1]; if(inst) inst.populationIncrease = v; } ns.UI.updateStats(); }); div.appendChild(btn);
    }

    const close = document.createElement('button'); close.className='building-btn'; close.textContent='Close'; close.addEventListener('click', ()=>div.remove()); div.appendChild(close);
    container.appendChild(div);
  };

})(window.Game);
