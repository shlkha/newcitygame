// ----- Presets used by instance & range dropdowns -----
const PRESET_OPTIONS = [
  { key: 'default', label: 'Default (1 per 2s)', amount: 1, interval: 2 },
  { key: '2x',      label: '2x per 3s',         amount: 2, interval: 3 },
  { key: '30x',     label: '30x per 25s',       amount: 30, interval: 25 },
  { key: '100x',    label: '100x per 80s',      amount: 100, interval: 80 },
  { key: '500x',    label: '500x per 350s',     amount: 500, interval: 350 },
];

// ----- UI Module -----
const UI = {
  log(msg){
    // Append to on-page log (and console for dev)
    const logEl = document.getElementById("log");
    if(logEl){
      const p = document.createElement("div");
      p.textContent = msg;
      logEl.appendChild(p);
      logEl.scrollTop = logEl.scrollHeight;
    }
    console.log(msg);
  },
  createBuildingButtons() {
    const container = document.getElementById("buildingButtons");
    if(!container) return;
    container.innerHTML = '';
    for (const key in Buildings) {
      const b = Buildings[key];
      const btn = document.createElement("button");
      // show name, cost, population increase and count if any
      const count = b.instances ? b.instances.length : 0;
      let label = `${b.name} • ${b.cost}€`;
      if(b.populationIncrease) label += ` • +${b.populationIncrease} pop`;
      if(count) label += ` • built: ${count}`;
      btn.textContent = label;
      btn.className = "building-btn";
      btn.title = `Click to build ${b.name}`;
      btn.addEventListener("click", () => {
        b.build();
        UI.createBuildingButtons();
        UI.updateStats();
        UI.refreshTutorial();
        // ensure autocomplete templates update after building changes
        if(window.invalidateTemplates) window.invalidateTemplates();
      });
      container.appendChild(btn);
    }
    // also invalidate templates after buttons rebuilt (catch other callers)
    if(window.invalidateTemplates) window.invalidateTemplates();
  },
  updateStats() {
    const stats = document.getElementById("stats");
    if(!stats) return;
    // show relevant City values (fallbacks if undefined)
    const pop = City.population ?? 0;
    const cap = City.populationCap ?? 0;
    const money = City.money ?? 0;
    const food = City.food ?? 0;
    const happy = City.happiness ?? '—';
    stats.innerHTML = `Population: ${pop} / ${cap} &nbsp; | &nbsp; Money: ${money} &nbsp; | &nbsp; Food: ${food} &nbsp; | &nbsp; Happiness: ${happy}`;
    // also update console for dev
    console.log(`Stats → Population: ${pop}/${cap}, Money: ${money}, Food: ${food}, Happiness: ${happy}`);
  },
  createInstanceDropdown(building, instanceId) {
    const container = document.getElementById("dropdown-container");
    if (!container) return;
    if (dropdownConfig.replaceOnDropdown) {
      container.innerHTML = '';
      activeDropdowns = [];
    }
    activeDropdowns = activeDropdowns.filter(d => {
      if(d.dataset && d.dataset.instanceId==instanceId && d.dataset.buildingName==building.name){ d.remove(); return false; }
      return true;
    });

    const div = document.createElement("div");
    div.className = "instance-dropdown";
    div.dataset.instanceId = instanceId;
    div.dataset.buildingName = building.name;

    // Header
    const header = document.createElement("div");
    header.style.fontWeight = '700';
    header.style.marginBottom = '6px';
    header.textContent = `${building.name} #${instanceId} — quick presets`;
    div.appendChild(header);

    // Select using same presets as screenshot
    const select = document.createElement("select");
    select.className = "production-dropdown";
    PRESET_OPTIONS.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt.key;
      o.textContent = opt.label;
      select.appendChild(o);
    });

    // If building has custom instance values, try to match to a preset
    const inst = building.instances[instanceId-1];
    if(inst && inst.amount !== undefined && inst.interval !== undefined){
      const matched = PRESET_OPTIONS.find(p => p.amount===inst.amount && p.interval===inst.interval);
      if(matched) select.value = matched.key;
    }

    // apply preset on change (immediate)
    select.addEventListener("change", () => {
      const sel = PRESET_OPTIONS.find(p => p.key === select.value);
      if(!sel){ UI.log("Invalid preset"); return; }
      const amount = sel.amount, interval = sel.interval;
      if(typeof building.configureInstance === 'function'){
        building.configureInstance(instanceId, amount, interval);
      } else {
        const inst = building.instances[instanceId-1];
        if(inst){ inst.amount = amount; inst.interval = interval; inst.timer = 0; }
      }
      UI.log(`Set ${building.name}#${instanceId} → ${amount} every ${interval}s`);
      UI.updateStats();
      if(typeof UI.refreshTutorial === 'function') UI.refreshTutorial();
    });

    div.appendChild(select);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.className = "building-btn";
    closeBtn.style.marginTop = '8px';
    closeBtn.addEventListener("click", () => { div.remove(); activeDropdowns = activeDropdowns.filter(d=>d!==div); });
    div.appendChild(closeBtn);

    container.appendChild(div);
    activeDropdowns.push(div);
  },
  toggleTutorialPanel() {
    const panel = document.getElementById("tutorial-panel");
    if(!panel) return;
    panel.style.display = (panel.style.display === 'none' || panel.style.display==='') ? 'block' : 'none';
  },
  refreshTutorial() {
    const panel = document.getElementById("tutorial-panel");
    if(!panel) return;
    panel.innerHTML = ''; // rebuild dynamically
    const title = document.createElement('h3');
    title.textContent = 'Tutorial & Commands';
    panel.appendChild(title);

    // Quick commands
    const quick = document.createElement('div');
    quick.innerHTML = `<strong>Quick commands:</strong><ul>
      <li><code>stats</code> — show stats</li>
      <li><code>help</code> — open tutorial</li>
      <li><code>dropdown hide all</code> / <code>dropdown hide abr</code></li>
      <li><code>dropdown config replaceOnDropdown true|false</code></li>
    </ul>`;
    panel.appendChild(quick);

    // Per-building dynamic sections
    for(const key in Buildings){
      const b = Buildings[key];
      const section = document.createElement('div');
      section.className = 'tutorial-category';
      const h = document.createElement('h4');
      h.style.cursor='pointer';
      h.textContent = `${b.name} (built: ${b.instances.length})`;
      h.addEventListener('click', ()=>{ ul.style.display = (ul.style.display==='none')?'block':'none'; });
      section.appendChild(h);

      const ul = document.createElement('ul');
      ul.style.display='block';
      // example commands tailored to this building
      if(b.instances.length>0){
        const ex1 = document.createElement('li'); ex1.textContent = `${b.name}1 request dropdown — configure first instance`;
        ul.appendChild(ex1);
        const ex2 = document.createElement('li'); ex2.textContent = `${b.name}1 view — view first instance`;
        ul.appendChild(ex2);
        if(b.production){
          const ex3 = document.createElement('li'); ex3.textContent = `${b.name} view interval>10 — filter by interval`;
          ul.appendChild(ex3);
        } else if(b.populationIncrease){
          // For houses/non-production buildings show populationIncrease filter example
          const exPop = document.createElement('li'); exPop.textContent = `${b.name} view populationIncrease>0 — filter by population increase`;
          ul.appendChild(exPop);
        }
        if(b.instances.length>1){
          const ex4 = document.createElement('li'); ex4.textContent = `${b.name}(1-${b.instances.length}) request dropdown — configure range`;
          ul.appendChild(ex4);
          const ex5 = document.createElement('li'); ex5.textContent = `${b.name}..all request dropdown — configure all`;
          ul.appendChild(ex5);
        }
      } else {
        const ex = document.createElement('li'); ex.textContent = `Build using button above: Build ${b.name}`;
        ul.appendChild(ex);
      }
      section.appendChild(ul);
      panel.appendChild(section);
    }

    // helpful footer
    const footer = document.createElement('div');
    footer.style.marginTop='8px';
    footer.style.opacity='0.9';
    footer.innerHTML = `<small>Autocomplete will suggest commands as you type. Press ↑/↓ to navigate, Enter to accept, Tab to cycle.</small>`;
    panel.appendChild(footer);
  },
  // Create a single dropdown that configures a range of instances (start..end)
  createRangeDropdown(building, start, end) {
    const container = document.getElementById("dropdown-container");
    if (!container) return;
    if (dropdownConfig.replaceOnDropdown) {
      container.innerHTML = '';
      activeDropdowns = [];
    }

    // Remove any existing identical range dropdown for same building & range
    activeDropdowns = activeDropdowns.filter(d => {
      if (d.dataset && d.dataset.buildingName === building.name && d.dataset.range === `${start}-${end}`) {
        d.remove(); return false;
      }
      return true;
    });

    const div = document.createElement("div");
    div.className = "instance-dropdown";
    div.dataset.buildingName = building.name;
    div.dataset.range = `${start}-${end}`;

    // Header
    const header = document.createElement("div");
    header.style.fontWeight = '700';
    header.style.marginBottom = '6px';
    header.textContent = `${building.name} — configure #${start} to #${end}`;
    div.appendChild(header);

    // If production: show the same preset select (selecting applies to entire range)
    if (building.production) {
      const select = document.createElement("select");
      select.className = "production-dropdown";
      PRESET_OPTIONS.forEach(opt => {
        const o = document.createElement("option");
        o.value = opt.key;
        o.textContent = opt.label;
        select.appendChild(o);
      });
      // optional: detect if all instances share a preset and preselect it
      const firstInst = building.instances[start-1];
      if(firstInst){
        const matched = PRESET_OPTIONS.find(p => p.amount===firstInst.amount && p.interval===firstInst.interval);
        if(matched) select.value = matched.key;
      }

      // immediate apply to whole range when user changes selection
      select.addEventListener("change", () => {
        const sel = PRESET_OPTIONS.find(p => p.key === select.value);
        if(!sel){ UI.log("Invalid preset"); return; }
        const amount = sel.amount, interval = sel.interval;
        if(typeof building.configureRange === 'function'){
          building.configureRange(start, end, amount, interval);
        } else {
          for(let i=start;i<=end;i++){
            const inst = building.instances[i-1];
            if(inst){ inst.amount = amount; inst.interval = interval; inst.timer = 0; }
          }
        }
        UI.log(`Applied preset "${sel.label}" → ${amount} every ${interval}s to ${building.name} #${start}-#${end}`);
        UI.updateStats();
        if(typeof UI.refreshTutorial === 'function') UI.refreshTutorial();
      });

      div.appendChild(select);

      // Add close button
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "Close";
      closeBtn.className = "building-btn";
      closeBtn.style.marginTop = '8px';
      closeBtn.addEventListener("click", () => { div.remove(); activeDropdowns = activeDropdowns.filter(d=>d!==div); });
      div.appendChild(closeBtn);

    } else {
      // Non-production building: keep populationIncrease input (unchanged)
      const lblPop = document.createElement("label");
      lblPop.textContent = "Population increase:";
      const inpPop = document.createElement("input");
      inpPop.type = "number"; inpPop.min = "0"; inpPop.value = building.populationIncrease ?? building.instances[start-1]?.populationIncrease ?? 0;
      lblPop.appendChild(inpPop);
      div.appendChild(lblPop);

      const btnBar = document.createElement("div");
      btnBar.style.marginTop = '8px';
      const apply = document.createElement("button");
      apply.textContent = "Apply to range";
      apply.className = "building-btn";
      apply.addEventListener("click", () => {
        const popVal = parseInt(inpPop.value) || 0;
        for(let i=start;i<=end;i++){
          const inst = building.instances[i-1];
          if(inst){ inst.populationIncrease = popVal; }
        }
        UI.log(`Set populationIncrease=${popVal} for ${building.name} #${start}-#${end}`);
        UI.updateStats();
        if(typeof UI.refreshTutorial === 'function') UI.refreshTutorial();
      });
      btnBar.appendChild(apply);

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "Close";
      closeBtn.className = "building-btn";
      closeBtn.style.marginLeft = '8px';
      closeBtn.addEventListener("click", () => { div.remove(); activeDropdowns = activeDropdowns.filter(d=>d!==div); });
      btnBar.appendChild(closeBtn);

      div.appendChild(btnBar);
    }

    container.appendChild(div);
    activeDropdowns.push(div);
  }
};

// Initialize building buttons and tutorial toggle
document.addEventListener("DOMContentLoaded", () => {
  UI.createBuildingButtons();
  const toggleBtn = document.getElementById("toggleTutorialBtn");
  if(toggleBtn) toggleBtn.addEventListener("click", () => UI.toggleTutorialPanel());
  UI.updateStats();
  UI.refreshTutorial();
  UI.log("Welcome to the Text-Based City Game!");
});
