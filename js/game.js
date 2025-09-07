// ----- Cleaned game.js: single source for autocomplete & commands -----

// Dropdown & config
let dropdownConfig = { replaceOnDropdown: false };
let activeDropdowns = [];

// template cache
let cachedTemplates = null;
function invalidateTemplates(){ cachedTemplates = null; }
window.invalidateTemplates = invalidateTemplates;

// DOM refs (may be null during build; guard usage)
const commandInput = document.getElementById("commandInput");
const autoDropdown = document.getElementById("autocompleteDropdown");
const executeBtn = document.getElementById("executeCommandBtn");

// Helpers
function escapeForRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function levenshtein(a,b){
  if(a===b) return 0;
  const al=a.length, bl=b.length;
  if(al===0) return bl;
  if(bl===0) return al;
  const dp = Array(al+1).fill(null).map(()=>Array(bl+1).fill(0));
  for(let i=0;i<=al;i++) dp[i][0]=i;
  for(let j=0;j<=bl;j++) dp[0][j]=j;
  for(let i=1;i<=al;i++){
    for(let j=1;j<=bl;j++){
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
      if(i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) dp[i][j] = Math.min(dp[i][j], dp[i-2][j-2]+cost);
    }
  }
  return dp[al][bl];
}
function commandMatchesPrefix(template, input){
  const t = template.toLowerCase().split(/\s+/);
  const p = input.toLowerCase().trim().split(/\s+/);
  if(p.length===1 && p[0]==='') return false;
  for(let i=0;i<p.length;i++){
    if(i>=t.length) return false;
    if(!t[i].startsWith(p[i])) return false;
  }
  return true;
}
function getBuilding(name){
  if(!name) return null;
  const keys = Object.keys(Buildings);
  const ln = name.toLowerCase();
  for(const key of keys){
    if(key.toLowerCase()===ln) return Buildings[key];
    if(key.toLowerCase().startsWith(ln)) return Buildings[key];
  }
  return null;
}

// Fast filter parsing
function applyFilters(instances, filterStr){
  if(!filterStr) return instances;
  const cleaned = filterStr.replace(/\s+/g,' ').trim();
  const regex = /^([a-zA-Z_]+)\s*(<=|>=|<|>)\s*([+-]?\d+(\.\d+)?)$/;
  const m = cleaned.match(regex);
  if(!m){
    const m2 = filterStr.match(/([a-zA-Z_]+)(<=|>=|<|>)([+-]?\d+(\.\d+)?)/);
    if(!m2) return instances;
    return applyFilters(instances, `${m2[1]}${m2[2]}${m2[3]}`);
  }
  let attr = m[1], op = m[2], val = parseFloat(m[3]);
  const lower = attr.toLowerCase();
  if(lower === 'pop' || lower === 'population') attr = 'populationIncrease';
  else if(lower === 'populationincrease') attr = 'populationIncrease';
  else if(lower === 'amt') attr = 'amount';
  else if(lower === 'int' || lower === 'intervals') attr = 'interval';
  const out = [];
  if(op === '>'){
    for(let i=0;i<instances.length;i++){ const v = instances[i][attr]; if(v!==undefined && v>val) out.push(instances[i]); }
  } else if(op === '>='){
    for(let i=0;i<instances.length;i++){ const v = instances[i][attr]; if(v!==undefined && v>=val) out.push(instances[i]); }
  } else if(op === '<'){
    for(let i=0;i<instances.length;i++){ const v = instances[i][attr]; if(v!==undefined && v<val) out.push(instances[i]); }
  } else if(op === '<='){
    for(let i=0;i<instances.length;i++){ const v = instances[i][attr]; if(v!==undefined && v<=val) out.push(instances[i]); }
  }
  return out;
}
function paginate(list,page=1,pageSize=10){ const start=(page-1)*pageSize; return list.slice(start,start+pageSize); }

// Templates (cached)
function generateCommandTemplates(){
  if(cachedTemplates) return cachedTemplates;
  const templates = new Set([
    "stats","help",
    "dropdown hide all","dropdown hide abr",
    "dropdown config replaceOnDropdown true","dropdown config replaceOnDropdown false"
  ]);
  for(const key in Buildings){
    const b = Buildings[key];
    const base = b.name; const count = b.instances.length;
    for(let i=1;i<=count;i++){
      if(!(b.buildingType && b.buildingType.toLowerCase()==='house')) templates.add(`${base}${i} request dropdown`);
      templates.add(`${base}${i} view`);
    }
    if(count>1){
      if(!(b.buildingType && b.buildingType.toLowerCase()==='house')) templates.add(`${base}(1-${count}) request dropdown`);
      templates.add(`${base}(1-${count}) view`);
    }
    if(count>0 && !(b.buildingType && b.buildingType.toLowerCase()==='house')) templates.add(`${base}..all request dropdown`);
    templates.add(`list amount ${base}`);
    templates.add(`${base} view`);
    if(b.production){ templates.add(`${base} view interval>`); templates.add(`${base} view amount>`); }
    else if(b.populationIncrease){ templates.add(`${base} view populationIncrease>`); }
    templates.add(`build ${base}`);
  }
  cachedTemplates = Array.from(templates);
  return cachedTemplates;
}
function shouldAutocorrect(raw, score){ if(/[0-9]/.test(raw)) return false; return score <= 2; }

// Autocomplete rendering & behavior
let selectedIndex = -1, tabResetTimeout;
function updateSelection(){
  const options = autoDropdown.querySelectorAll("div");
  options.forEach(o=>o.classList.remove("selected"));
  if(selectedIndex>=0 && options[selectedIndex]) options[selectedIndex].classList.add("selected");
  const sel = options[selectedIndex];
  if(sel) {
    const top = sel.offsetTop, bottom = top + sel.offsetHeight;
    if(top < autoDropdown.scrollTop) autoDropdown.scrollTop = top;
    else if(bottom > autoDropdown.scrollTop + autoDropdown.clientHeight) autoDropdown.scrollTop = bottom - autoDropdown.clientHeight;
  }
}

if(commandInput){
  commandInput.addEventListener("input", ()=>{
    const raw = commandInput.value;
    const val = raw.trim().toLowerCase();
    if(!val){ if(autoDropdown) autoDropdown.style.display='none'; return; }
    const templates = generateCommandTemplates();
    let matches = [];
    for(const t of templates) if(commandMatchesPrefix(t,val)) matches.push(t);

    const filterMatch = val.match(/^(\w+)\s+view\s+(interval|amount|population(?:increase)?|pop(?:ulation)?)([><]=?)?$/);
    if(filterMatch){
      const b = getBuilding(filterMatch[1]); const fieldRaw = filterMatch[2]; const op = filterMatch[3]||'';
      if(b){
        const field = fieldRaw.startsWith('pop') ? 'populationIncrease' : fieldRaw;
        if(field === 'populationIncrease' && b.populationIncrease){
          const vals = new Set();
          if(b.instances && b.instances.length>0) b.instances.forEach(inst => { if(inst.populationIncrease!==undefined) vals.add(inst.populationIncrease); });
          if(vals.size===0 && b.populationIncrease) vals.add(b.populationIncrease);
          vals.forEach(v => matches.push(`${b.name} view ${field}${op}${v}`));
        } else if((field==='interval' || field==='amount') && b.production){
          b.instances.forEach(inst => { if(inst[field]!==undefined) matches.push(`${b.name} view ${field}${op}${inst[field]}`); });
        }
      }
    }

    if(matches.length===0){
      const scored = [];
      for(const t of templates){
        if(t.toLowerCase().includes(val)){ scored.push({t,score:0}); continue; }
        const s = levenshtein(val, t.toLowerCase());
        if(s<=3) scored.push({t,score:s});
      }
      scored.sort((a,b)=>a.score-b.score);
      matches = scored.slice(0,10).map(x=>x.t);
    } else matches = matches.slice(0,10);

    if(matches.length===0){ if(autoDropdown) autoDropdown.style.display='none'; return; }
    autoDropdown.innerHTML = '';
    const esc = escapeForRegex(val);
    const re = new RegExp(esc,'i');
    matches.forEach(s=>{
      const div = document.createElement('div');
      div.className = 'suggestion';
      div.innerHTML = s.replace(re, m=>`<mark>${m}</mark>`);
      div.addEventListener('click', ()=>{ commandInput.value = s; if(autoDropdown) autoDropdown.style.display='none'; commandInput.focus(); });
      autoDropdown.appendChild(div);
    });
    selectedIndex = -1;
    autoDropdown.style.display = 'block';
  });

  commandInput.addEventListener("keydown", e=>{
    const options = autoDropdown.querySelectorAll("div");
    if(e.key === "Tab"){ e.preventDefault(); if(options.length===0) return; selectedIndex = (selectedIndex+1)%options.length; updateSelection(); clearTimeout(tabResetTimeout); tabResetTimeout = setTimeout(()=>{selectedIndex=-1;},1000); }
    if(e.key === "ArrowDown"){ e.preventDefault(); if(options.length===0) return; selectedIndex = Math.min(options.length-1, selectedIndex+1); updateSelection(); }
    if(e.key === "ArrowUp"){ e.preventDefault(); if(options.length===0) return; selectedIndex = Math.max(0, selectedIndex-1); updateSelection(); }
    if(e.key === "Enter" && autoDropdown.style.display==='block' && selectedIndex>=0){ e.preventDefault(); options[selectedIndex].click(); }
  });
}

// Click outside closes suggestions
document.addEventListener("click", e=>{
  if(commandInput && !commandInput.contains(e.target) && autoDropdown && !autoDropdown.contains(e.target)) autoDropdown.style.display='none';
});

// Game loop
setInterval(()=>{
  if(City.population < City.populationCap) City.addPopulation(1);
  City.changeMoney(City.population * 2);
  for(const k in Buildings){
    const b = Buildings[k];
    if(b.production) b.instances.forEach(inst=>{ inst.timer++; if(inst.timer >= inst.interval){ City.food += inst.amount; inst.timer = 0; }});
  }
  if(typeof UI !== 'undefined' && UI.updateStats) UI.updateStats();
},1000);

// City stat lookup helper
function findCityKeyCaseInsensitive(name){
  const lower = name.toLowerCase();
  for(const k of Object.keys(City)) if(k.toLowerCase() === lower) return k;
  return null;
}

// processCommand (single)
function processCommand(cmd){
  if(!cmd) return true;
  let match, page, filter, b, rangeStart, rangeEnd;

  if(/^dropdown hide all$/i.test(cmd)){ document.getElementById("dropdown-container").innerHTML=''; activeDropdowns=[]; UI.log("✅ All dropdowns removed"); return true; }
  if(/^dropdown hide abr$/i.test(cmd)){ if(activeDropdowns.length>1){ const mostRecent=activeDropdowns[activeDropdowns.length-1]; activeDropdowns.slice(0,-1).forEach(d=>d.remove()); activeDropdowns=[mostRecent]; } UI.log("✅ All but most recent dropdown removed"); return true; }
  if(/^dropdown config replaceOnDropdown true$/i.test(cmd)){ dropdownConfig.replaceOnDropdown=true; document.getElementById("dropdown-container").innerHTML=''; activeDropdowns=[]; UI.log("✅ replaceOnDropdown TRUE & all dropdowns cleared"); return true; }
  if(/^dropdown config replaceOnDropdown false$/i.test(cmd)){ dropdownConfig.replaceOnDropdown=false; UI.log("✅ replaceOnDropdown FALSE"); return true; }

  if(/^stats\s*$/i.test(cmd)){ UI.updateStats(); UI.log("✅ Stats updated"); return true; }
  if(match = cmd.match(/^stats\s+([^\s]+)$/i)){
    const rawKey = match[1];
    const key = findCityKeyCaseInsensitive(rawKey);
    if(key !== null) UI.log(`${key}: ${City[key]}`); else UI.log(`Stat "${rawKey}" not found`);
    return true;
  }

  if(/^help$/i.test(cmd)){ document.getElementById("tutorial-panel").style.display='block'; UI.log("✅ Tutorial opened"); return true; }

  if(match = cmd.match(/^list amount (\w+)(?:\s+(.+))?/i)){
    b = getBuilding(match[1]); if(!b){ UI.log("❌ Building not found"); return true; }
    filter = match[2] ? match[2] : null;
    let instances = applyFilters(b.instances, filter);
    UI.log(`${b.name}: ${instances.length} instance(s)`); UI.log("✅ Command executed successfully");
    return true;
  }

  if(match = cmd.match(/^(\w+)(\d+)\s+request dropdown$/i)){
    b = getBuilding(match[1]); const id = parseInt(match[2]);
    if(!b){ UI.log("❌ Building not found"); return true; }
    if(b.buildingType && b.buildingType.toLowerCase()==='house'){ UI.log("❌ Request dropdown not available for house-type buildings"); return true; }
    UI.createInstanceDropdown(b, id);
    UI.log("✅ Command executed successfully");
    return true;
  }

  if(match = cmd.match(/^(\w+)(\d+)\s+view$/i)){
    b = getBuilding(match[1]); const id = parseInt(match[2]);
    if(!b){ UI.log("❌ Building not found"); return true; }
    b.viewInstance(id);
    UI.log("✅ Command executed successfully");
    return true;
  }

  if(match = cmd.match(/^(\w+)\((\d+)-(\d+)\)\s+request dropdown$/i)){
    b = getBuilding(match[1]); rangeStart = parseInt(match[2]); rangeEnd = parseInt(match[3]);
    if(!b){ UI.log("❌ Building not found"); return true; }
    if(b.buildingType && b.buildingType.toLowerCase()==='house'){ UI.log("❌ Range dropdown not available for house-type buildings"); return true; }
    UI.createRangeDropdown(b, rangeStart, rangeEnd);
    UI.log("✅ Range dropdown created");
    return true;
  }

  if(match = cmd.match(/^(\w+)\.\.all\s+request dropdown$/i)){
    b = getBuilding(match[1]);
    if(!b){ UI.log("❌ Building not found"); return true; }
    if(b.buildingType && b.buildingType.toLowerCase()==='house'){ UI.log("❌ Range dropdown not available for house-type buildings"); return true; }
    if(b.instances.length===0){ UI.log("❌ No instances to configure"); return true; }
    UI.createRangeDropdown(b, 1, b.instances.length);
    UI.log("✅ Range dropdown created for all instances");
    return true;
  }

  if(match = cmd.match(/^build\s+(\w+)$/i)){
    b = getBuilding(match[1]);
    if(b){ b.build(); UI.createBuildingButtons(); UI.updateStats(); UI.refreshTutorial(); return true; }
  }

  return false;
}
