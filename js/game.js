// ----- City -----
// removed inline City definition to use the central city.js definition

// ----- Dropdown & Config -----
let dropdownConfig = { replaceOnDropdown: false };
let activeDropdowns = [];

// cache for templates to avoid rebuilding every keystroke
let cachedTemplates = null;
function invalidateTemplates(){ cachedTemplates = null; }
window.invalidateTemplates = invalidateTemplates; // UI can call this when buildings change

// ----- Command Execution -----
const commandInput = document.getElementById("commandInput");
const autoDropdown = document.getElementById("autocompleteDropdown");

document.getElementById("executeCommandBtn").addEventListener("click", () => {
  const rawCmd = commandInput.value.trim();
  if(!rawCmd) return;
  UI.log("> "+rawCmd);

  const executed = processCommand(rawCmd);
  if(!executed){
    const templates = generateCommandTemplates();
    let best = null, bestScore = Infinity;
    for(const t of templates){
      const dist = levenshtein(rawCmd.toLowerCase(), t.toLowerCase());
      if(dist < bestScore){ bestScore = dist; best = t; }
    }
    if(best && shouldAutocorrect(rawCmd,bestScore)){
      UI.log(`Autocorrect → "${best}" (distance ${bestScore}). Executing…`);
      commandInput.value = best;
      processCommand(best);
    } else {
      UI.log("❌ Command not recognized. Type 'help' to view tutorial.");
    }
  }
  commandInput.value = '';
  if(autoDropdown) autoDropdown.style.display = 'none';
});

// RETURN key executes command
commandInput.addEventListener("keydown", e => {
  if(e.key==="Enter"){ e.preventDefault(); document.getElementById("executeCommandBtn").click(); }
});

// Tab navigation and arrow keys for suggestions
let selectedIndex = -1, tabResetTimeout;
commandInput.addEventListener("keydown", e => {
  const options = autoDropdown.querySelectorAll("div");
  if(e.key==="Tab"){ e.preventDefault(); if(options.length===0) return; selectedIndex = (selectedIndex+1)%options.length; updateSelection(); clearTimeout(tabResetTimeout); tabResetTimeout=setTimeout(()=>{selectedIndex=-1;},1000); }
  if(e.key==="ArrowDown"){ e.preventDefault(); if(options.length===0) return; selectedIndex = Math.min(options.length-1, selectedIndex+1); updateSelection(); }
  if(e.key==="ArrowUp"){ e.preventDefault(); if(options.length===0) return; selectedIndex = Math.max(0, selectedIndex-1); updateSelection(); }
  if(e.key==="Enter" && autoDropdown.style.display==='block' && selectedIndex>=0){ e.preventDefault(); options[selectedIndex].click(); }
});

function updateSelection(){
  const options = autoDropdown.querySelectorAll("div");
  options.forEach(o=>o.classList.remove("selected"));
  if(selectedIndex>=0 && options[selectedIndex]) options[selectedIndex].classList.add("selected");
  const sel = options[selectedIndex];
  if(sel) scrollDropdownIntoView(autoDropdown, sel);
}

// Scroll helper
function scrollDropdownIntoView(container, element){
  const top = element.offsetTop, bottom = top + element.offsetHeight;
  if(top<container.scrollTop) container.scrollTop = top;
  else if(bottom>container.scrollTop+container.clientHeight) container.scrollTop = bottom - container.clientHeight;
}

// ----- Helpers -----
function getBuilding(name){
  const keys = Object.keys(Buildings);
  name = name.toLowerCase();
  for(const key of keys){ if(key.toLowerCase()===name) return Buildings[key]; if(key.toLowerCase().startsWith(name)) return Buildings[key]; }
  return null;
}

// Faster, robust filter parser + evaluator
function applyFilters(instances, filterStr){
  if(!filterStr) return instances;
  // normalize spaces, allow "attr > 3" or "attr>3" or "attr >= 3"
  const cleaned = filterStr.replace(/\s+/g, ' ').trim();
  const regex = /^([a-zA-Z_]+)\s*(<=|>=|<|>)\s*([+-]?\d+(\.\d+)?)$/;
  const match = cleaned.match(regex);
  if(!match) {
    // try compact form without spaces and mixed case (fallback)
    const m2 = filterStr.match(/([a-zA-Z_]+)(<=|>=|<|>)([+-]?\d+(\.\d+)?)/);
    if(!m2) return instances; // cannot parse -> return unfiltered
    // else reuse m2
    return applyFilters(instances, `${m2[1]}${m2[2]}${m2[3]}`);
  }
  let attr = match[1];
  const op = match[2];
  const val = parseFloat(match[3]);

  // normalize common aliases
  const lower = attr.toLowerCase();
  if(lower === 'pop' || lower === 'population') attr = 'populationIncrease';
  else if(lower === 'populationincrease') attr = 'populationIncrease';
  else if(lower === 'amt') attr = 'amount';
  else if(lower === 'int' || lower === 'intervals') attr = 'interval';
  // Now filter quickly using a simple for loop (faster than .filter for large arrays)
  const out = [];
  if(op === '>') {
    for(let i=0;i<instances.length;i++){ const inst=instances[i]; const v = inst[attr]; if(v!==undefined && v>val) out.push(inst); }
  } else if(op === '>=') {
    for(let i=0;i<instances.length;i++){ const inst=instances[i]; const v = inst[attr]; if(v!==undefined && v>=val) out.push(inst); }
  } else if(op === '<') {
    for(let i=0;i<instances.length;i++){ const inst=instances[i]; const v = inst[attr]; if(v!==undefined && v<val) out.push(inst); }
  } else if(op === '<=') {
    for(let i=0;i<instances.length;i++){ const inst=instances[i]; const v = inst[attr]; if(v!==undefined && v<=val) out.push(inst); }
  }
  return out;
}

// Build a strict, up-to-date list of valid command templates (cached)
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

    // instance level commands
    for(let i=1;i<=count;i++){
      templates.add(`${base}${i} request dropdown`);
      templates.add(`${base}${i} view`);
    }

    // range commands if applicable
    if(count>1){
      templates.add(`${base}(1-${count}) request dropdown`);
      templates.add(`${base}(1-${count}) view`);
    }

    // all-instances command
    if(count>0) templates.add(`${base}..all request dropdown`);

    // listing and view with possible filters/pages
    templates.add(`list amount ${base}`);
    templates.add(`${base} view`);

    if(b.production){
      templates.add(`${base} view interval>`); templates.add(`${base} view amount>`);
    } else if(b.populationIncrease){
      templates.add(`${base} view populationIncrease>`);
    }

    templates.add(`build ${base}`);
  }

  cachedTemplates = Array.from(templates);
  return cachedTemplates;
}

// Levenshtein distance (unchanged)
function levenshtein(a,b){
  // ...existing implementation ...
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

// token-wise prefix matcher (unchanged)
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
function escapeForRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

// Autocomplete + autocorrect logic (optimized)
commandInput.addEventListener("input", () => {
  const raw = commandInput.value;
  const val = raw.trim().toLowerCase();
  if(!val){ autoDropdown.style.display='none'; return; }

  const templates = generateCommandTemplates();

  // First: strong token-prefix matches
  let prefixMatches = [];
  for(const t of templates){
    if(commandMatchesPrefix(t, val)) prefixMatches.push(t);
  }

  // Contextual filter completions (unchanged behavior but efficient)
  const filterMatch = val.match(/^(\w+)\s+view\s+(interval|amount|population(?:increase)?|pop(?:ulation)?)([><]=?)?$/);
  if(filterMatch){
    const bname = filterMatch[1];
    const fieldRaw = filterMatch[2];
    const op = filterMatch[3] || '';
    const b = getBuilding(bname);
    if(b){
      const field = fieldRaw.startsWith('pop') ? 'populationIncrease' : fieldRaw;
      if(field === 'populationIncrease' && b.populationIncrease){
        const vals = new Set();
        if(b.instances && b.instances.length>0){
          b.instances.forEach(inst => { if(inst.populationIncrease!==undefined) vals.add(inst.populationIncrease); });
        }
        if(vals.size===0 && b.populationIncrease) vals.add(b.populationIncrease);
        vals.forEach(v => prefixMatches.push(`${b.name} view ${field}${op}${v}`));
      } else if((field === 'interval' || field === 'amount') && b.production){
        b.instances.forEach(inst => { if(inst[field]!==undefined) prefixMatches.push(`${b.name} view ${field}${op}${inst[field]}`); });
      }
    }
  }

  let matches = prefixMatches;

  // If not enough prefix matches, fall back to efficient fuzzy scoring but limit candidates
  if(matches.length === 0){
    const scored = [];
    for(const t of templates){
      // quick contains check first (very cheap)
      if(t.toLowerCase().includes(val)) { scored.push({t,score:0}); continue; }
      const score = levenshtein(val, t.toLowerCase());
      if(score<=3) scored.push({t,score});
    }
    scored.sort((a,b)=>a.score-b.score);
    matches = scored.slice(0,10).map(s=>s.t);
  } else {
    // limit prefix matches to 10 most relevant
    matches = matches.slice(0,10);
  }

  if(matches.length===0){ autoDropdown.style.display='none'; return; }

  // render suggestions (safe highlighting)
  autoDropdown.innerHTML='';
  const esc = escapeForRegex(val);
  const re = new RegExp(esc,"i");
  for(const s of matches){
    const div=document.createElement("div");
    div.innerHTML = s.replace(re, m=>`<mark>${m}</mark>`);
    div.className = 'suggestion';
    div.addEventListener("click",()=>{ commandInput.value = s; autoDropdown.style.display='none'; commandInput.focus(); });
    autoDropdown.appendChild(div);
  }
  selectedIndex = -1;
  autoDropdown.style.display='block';
});

// Close autocomplete on click outside
document.addEventListener("click", e => { if(!commandInput.contains(e.target)&&!autoDropdown.contains(e.target)) autoDropdown.style.display='none'; });

// ----- Game Loop -----
setInterval(()=>{
  if(City.population<City.populationCap) City.addPopulation(1);
  City.changeMoney(City.population*2);
  for(const key in Buildings){
    const b = Buildings[key];
    if(b.production) b.instances.forEach(inst=>{ inst.timer++; if(inst.timer>=inst.interval){ City.food+=inst.amount; inst.timer=0; }});
  }
  if(typeof UI !== 'undefined' && UI.updateStats) UI.updateStats();
},1000);

// ----- Command Processor -----
// Return true if command handled, false otherwise
function processCommand(cmd){
  if(!cmd) return true; let match, page, filter, b, rangeStart, rangeEnd;

  if(/^dropdown hide all$/i.test(cmd)){ document.getElementById("dropdown-container").innerHTML=''; activeDropdowns=[]; UI.log("✅ All dropdowns removed"); return true; }
  if(/^dropdown hide abr$/i.test(cmd)){ if(activeDropdowns.length>1){ const mostRecent=activeDropdowns[activeDropdowns.length-1]; activeDropdowns.slice(0,-1).forEach(d=>d.remove()); activeDropdowns=[mostRecent]; } UI.log("✅ All but most recent dropdown removed"); return true; }
  if(/^dropdown config replaceOnDropdown true$/i.test(cmd)){ dropdownConfig.replaceOnDropdown=true; document.getElementById("dropdown-container").innerHTML=''; activeDropdowns=[]; UI.log("✅ replaceOnDropdown TRUE & all dropdowns cleared"); return true; }
  if(/^dropdown config replaceOnDropdown false$/i.test(cmd)){ dropdownConfig.replaceOnDropdown=false; UI.log("✅ replaceOnDropdown FALSE"); return true; }
  if(cmd.toLowerCase()=='stats'){ UI.updateStats(); UI.log("✅ Stats updated"); return true; }
  if(cmd.toLowerCase()=='help'){ document.getElementById("tutorial-panel").style.display='block'; UI.log("✅ Tutorial opened"); return true; }

  if(match=cmd.match(/^list amount (\w+)(?:\s+(\w+[><]=?\d+))?/i)){
    b=getBuilding(match[1]); if(!b){ UI.log("❌ Building not found"); return true; }
    filter=match[2]?match[2]:null; let instances=applyFilters(b.instances,filter);
    UI.log(`${b.name}: ${instances.length} instance(s)`); UI.log("✅ Command executed successfully"); return true;
  }

  if(match=cmd.match(/^(\w+)(\d+)\s+request dropdown$/i)){ b=getBuilding(match[1]); const id=parseInt(match[2]); if(b) UI.createInstanceDropdown(b,id); UI.log("✅ Command executed successfully"); return true; }
  if(match=cmd.match(/^(\w+)(\d+)\s+view$/i)){ b=getBuilding(match[1]); const id=parseInt(match[2]); if(b) b.viewInstance(id); UI.log("✅ Command executed successfully"); return true; }
  if(match=cmd.match(/^(\w+)\((\d+)-(\d+)\)\s+request dropdown$/i)){
    b=getBuilding(match[1]); rangeStart=parseInt(match[2]); rangeEnd=parseInt(match[3]);
    if(!b){ UI.log("❌ Building not found"); return true; }
    // create one dropdown that configures the whole range
    UI.createRangeDropdown(b, rangeStart, rangeEnd);
    UI.log("✅ Range dropdown created");
    return true;
  }
  if(match=cmd.match(/^(\w+)\.\.all\s+request dropdown$/i)){
    b=getBuilding(match[1]);
    if(!b){ UI.log("❌ Building not found"); return true; }
    if(b.instances.length===0){ UI.log("❌ No instances to configure"); return true; }
    UI.createRangeDropdown(b, 1, b.instances.length);
    UI.log("✅ Range dropdown created for all instances");
    return true;
  }

  // treat "build X" by name as shorthand for button press
  if(match = cmd.match(/^build\s+(\w+)$/i)){
    b = getBuilding(match[1]);
    if(b){ b.build(); UI.createBuildingButtons(); UI.updateStats(); UI.refreshTutorial(); return true; }
  }

  return false; // not recognized
}
