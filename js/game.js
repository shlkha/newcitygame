// ----- City -----
const City = { population:0, populationCap:1000, food:0, money:0, 
  addPopulation(n){ this.population=Math.min(this.population+n,this.populationCap); }, 
  changeMoney(n){ this.money+=n; } 
};

// ----- Dropdown & Config -----
let dropdownConfig = { replaceOnDropdown: false };
let activeDropdowns = [];

// ----- Command Execution -----
const commandInput = document.getElementById("commandInput");
const autoDropdown = document.getElementById("autocompleteDropdown");

document.getElementById("executeCommandBtn").addEventListener("click", () => {
  const cmd = commandInput.value.trim();
  if(cmd){ UI.log("> "+cmd); processCommand(cmd); }
  commandInput.value = '';
  autoDropdown.style.display = 'none';
});

// RETURN key executes command
commandInput.addEventListener("keydown", e => { if(e.key==="Enter") document.getElementById("executeCommandBtn").click(); });

// Tab navigation
let selectedIndex = 0, tabResetTimeout;
commandInput.addEventListener("keydown", e => {
  if(e.key==="Tab"){
    e.preventDefault();
    const options = autoDropdown.querySelectorAll("div");
    if(options.length===0) return;
    options.forEach(opt => opt.classList.remove("selected"));
    options[selectedIndex].classList.add("selected");
    scrollDropdownIntoView(autoDropdown, options[selectedIndex]);
    commandInput.value = options[selectedIndex].textContent;
    selectedIndex++; if(selectedIndex>=options.length) selectedIndex=0;
    clearTimeout(tabResetTimeout); tabResetTimeout=setTimeout(()=>{selectedIndex=0;},1000);
  }
});

// Scroll helper
function scrollDropdownIntoView(container, element){
  const top = element.offsetTop, bottom = top + element.offsetHeight;
  if(top<container.scrollTop) container.scrollTop = top;
  else if(bottom>container.scrollTop+container.clientHeight) container.scrollTop = bottom - container.clientHeight;
}

// Autocomplete suggestions
commandInput.addEventListener("input", () => {
  const val = commandInput.value.toLowerCase();
  if(!val){ autoDropdown.style.display='none'; return; }

  const templates = generateCommandTemplates();
  const filtered = templates.filter(cmd => cmd.toLowerCase().startsWith(val));

  // Dynamic filter values
  ["interval>","interval>=","interval<","interval<=","amount>","amount>=","amount<","amount<="].forEach(f => {
    if(f.startsWith(val)){
      Buildings.Farm.instances.forEach(inst=>filtered.push(val+inst.interval));
    }
  });

  if(filtered.length===0){ autoDropdown.style.display='none'; return; }
  autoDropdown.innerHTML='';
  filtered.forEach(s=>{
    const div=document.createElement("div");
    div.innerHTML = s.replace(new RegExp(val,"i"), m=>`<mark>${m}</mark>`);
    div.addEventListener("click",()=>{ commandInput.value = s; autoDropdown.style.display='none'; commandInput.focus(); });
    autoDropdown.appendChild(div);
  });
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
  UI.updateStats();
},1000);

// ----- Helpers -----
function getBuilding(name){
  const keys = Object.keys(Buildings);
  name = name.toLowerCase();
  for(const key of keys){ if(key.toLowerCase()===name) return Buildings[key]; if(key.toLowerCase().startsWith(name)) return Buildings[key]; }
  return null;
}
function applyFilters(instances, filterStr){
  if(!filterStr) return instances;
  const regex=/(\w+)([><]=?)(\d+)/;
  const match=filterStr.match(regex);
  if(!match) return instances;
  const attr=match[1], op=match[2], val=parseFloat(match[3]);
  return instances.filter(inst=>{
    if(inst[attr]===undefined) return false;
    if(op=='>') return inst[attr]>val;
    if(op=='>=') return inst[attr]>=val;
    if(op=='<') return inst[attr]<val;
    if(op=='<=') return inst[attr]<=val;
    return false;
  });
}
function paginate(instances,page=1,pageSize=10){ const start=(page-1)*pageSize; return instances.slice(start,start+pageSize); }
function generateCommandTemplates(){
  const templates=["stats","help","dropdown hide all","dropdown hide abr","dropdown config replaceOnDropdown true","dropdown config replaceOnDropdown false"];
  for(const key in Buildings){
    const b=Buildings[key]; const base=b.name; const count=b.instances.length;
    if(count>0) for(let i=1;i<=count;i++){ templates.push(`${base}${i} request dropdown`); templates.push(`${base}${i} view`); }
    if(count>1){ templates.push(`${base}(1-${count}) request dropdown`); templates.push(`${base}(1-${count}) view`); }
    if(count>0) templates.push(`${base}..all request dropdown`);
    templates.push(`list amount ${base}`);
  }
  return templates;
}

// ----- Command Processor -----
function processCommand(cmd){
  if(!cmd) return; let match, page, filter, b, rangeStart, rangeEnd;

  if(/^dropdown hide all$/i.test(cmd)){ document.getElementById("dropdown-container").innerHTML=''; activeDropdowns=[]; UI.log("✅ All dropdowns removed"); return; }
  if(/^dropdown hide abr$/i.test(cmd)){ if(activeDropdowns.length>1){ const mostRecent=activeDropdowns[activeDropdowns.length-1]; activeDropdowns.slice(0,-1).forEach(d=>d.remove()); activeDropdowns=[mostRecent]; } UI.log("✅ All but most recent dropdown removed"); return; }
  if(/^dropdown config replaceOnDropdown true$/i.test(cmd)){ dropdownConfig.replaceOnDropdown=true; document.getElementById("dropdown-container").innerHTML=''; activeDropdowns=[]; UI.log("✅ replaceOnDropdown TRUE & all dropdowns cleared"); return; }
  if(/^dropdown config replaceOnDropdown false$/i.test(cmd)){ dropdownConfig.replaceOnDropdown=false; UI.log("✅ replaceOnDropdown FALSE"); return; }
  if(cmd.toLowerCase()=='stats'){ UI.updateStats(); UI.log("✅ Stats updated"); return; }
  if(cmd.toLowerCase()=='help'){ document.getElementById("tutorial-panel").style.display='block'; UI.log("✅ Tutorial opened"); return; }

  if(match=cmd.match(/^list amount (\w+)(?:\s+(\w+[><]=?\d+))?/i)){
    b=getBuilding(match[1]); if(!b){ UI.log("❌ Building not found"); return; }
    filter=match[2]?match[2]:null; let instances=applyFilters(b.instances,filter);
    UI.log(`${b.name}: ${instances.length} instance(s)`); UI.log("✅ Command executed successfully"); return;
  }

  if(match=cmd.match(/^(\w+)(\d+)\s+request dropdown$/i)){ b=getBuilding(match[1]); const id=parseInt(match[2]); if(b) UI.createInstanceDropdown(b,id); UI.log("✅ Command executed successfully"); return; }
  if(match=cmd.match(/^(\w+)(\d+)\s+view$/i)){ b=getBuilding(match[1]); const id=parseInt(match[2]); if(b) b.viewInstance(id); UI.log("✅ Command executed successfully"); return; }
  if(match=cmd.match(/^(\w+)\((\d+)-(\d+)\)\s+request dropdown$/i)){ b=getBuilding(match[1]); rangeStart=parseInt(match[2]); rangeEnd=parseInt(match[3]); if(b) for(let i=rangeStart;i<=rangeEnd;i++) UI.createInstanceDropdown(b,i); UI.log("✅ Command executed successfully"); return; }
  if(match=cmd.match(/^(\w+)(?:\((\d+)-(\d+)\))?\s+view(?:\s+(\w+[><]=?\d+))?(?:\s+page\s+(\d+))?/i)){
    b=getBuilding(match[1]); if(!b){ UI.log("❌ Building not found"); return; }
    rangeStart=match[2]?parseInt(match[2]):1; rangeEnd=match[3]?parseInt(match[3]):b.instances.length;
    filter=match[4]?match[4]:null; page=match[5]?parseInt(match[5]):1;
    let instances=b.instances.slice(rangeStart-1,rangeEnd); instances=applyFilters(instances,filter); instances=paginate(instances,page);
    if(instances.length===0){ UI.log("❌ No instances match criteria"); return; }
    instances.forEach(inst=>UI.log(`${b.name} #${inst.id}`));
    UI.log("✅ Command executed successfully"); return;
  }

  if(match=cmd.match(/^(\w+)\.\.all\s+request dropdown$/i)){ b=getBuilding(match[1]); if(!b){ UI.log("❌ Building not found"); return; } b.instances.forEach(inst=>UI.createInstanceDropdown(b,inst.id)); UI.log("✅ Command executed successfully"); return; }

  UI.log("❌ Command not recognized. Type 'help' to view tutorial.");
}
