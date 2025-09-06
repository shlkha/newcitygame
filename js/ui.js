// ----- UI Module -----
const UI = {
  log(msg) {
    const logDiv = document.getElementById("log");
    if (!logDiv) return;
    logDiv.innerHTML += msg + "<br>";
    logDiv.scrollTop = logDiv.scrollHeight;
  },
  createBuildingButtons() {
    const container = document.getElementById("buildingButtons");
    for (const key in Buildings) {
      const btn = document.createElement("button");
      btn.textContent = "Build " + Buildings[key].name;
        btn.addEventListener("click", () => {
          Buildings[key].build();
        });
      container.appendChild(btn);
    }
  },
  updateStats() {
    const statsDiv = document.getElementById("stats");
    if (!statsDiv) return;
    statsDiv.innerHTML = `Population: <b>${City.population}</b> / ${City.populationCap} &nbsp; | &nbsp; Money: <b>${City.money}</b> &nbsp; | &nbsp; Food: <b>${City.food}</b>`;
  },
  createInstanceDropdown(building, instanceId) {
    const container = document.getElementById("dropdown-container");
    if (dropdownConfig.replaceOnDropdown) {
      container.innerHTML = '';
      activeDropdowns = [];
    }
    activeDropdowns = activeDropdowns.filter(d => {
      if(d.dataset.instanceId==instanceId && d.dataset.buildingName==building.name){ d.remove(); return false; }
      return true;
    });

    const div = document.createElement("div");
    div.className = "instance-dropdown";
    div.dataset.instanceId = instanceId;
    div.dataset.buildingName = building.name;

    const select = document.createElement("select");
    select.innerHTML = `
      <option value="default">Default (1 per 2s)</option>
      <option value="2x">2x per 3s</option>
      <option value="30x">30x per 25s</option>
      <option value="100x">100x per 80s</option>
      <option value="500x">500x per 350s</option>
    `;
    div.appendChild(select);
    container.appendChild(div);
    activeDropdowns.push(div);
  },
  toggleTutorialPanel() {
    const panel = document.getElementById("tutorial-panel");
    panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
  }
};

// Initialize building buttons and tutorial toggle
UI.createBuildingButtons();
document.getElementById("toggleTutorialBtn").addEventListener("click", () => UI.toggleTutorialPanel());
