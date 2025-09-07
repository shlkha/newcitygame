(function(ns){
  if(ns.createBuilding && ns.Buildings) return;

  function createBuilding({name,cost,populationIncrease=0,production=null,buildingType='generic'}){
    return {
      name,cost,populationIncrease,production,buildingType,instances:[],
      build(){
        if(!ns.City){ console.warn("City not initialized"); return; }
        if(ns.City.money < this.cost){ ns.UI && ns.UI.log(`Not enough money for ${this.name}`); return; }
        ns.City.changeMoney(-this.cost);
        ns.City.populationCap += this.populationIncrease;
        const instance = { id: this.instances.length + 1 };
        if(this.production){ instance.amount = this.production.amount; instance.interval = this.production.interval; instance.timer = 0; }
        else if(this.populationIncrease){ instance.populationIncrease = this.populationIncrease; }
        this.instances.push(instance);
        ns.UI && ns.UI.log(`Built ${this.name}#${instance.id}`);
        ns.UI && ns.UI.createBuildingButtons();
        ns.UI && ns.UI.updateStats();
      },
      configureInstance(id,amount,interval){
        const inst = this.instances[id-1];
        if(!inst){ ns.UI && ns.UI.log(`${this.name}#${id} not found`); return; }
        if(!this.production){ ns.UI && ns.UI.log(`${this.name}#${id} cannot be configured`); return; }
        inst.amount = amount; inst.interval = interval; inst.timer = 0;
        ns.UI && ns.UI.log(`${this.name}#${id} set to ${amount} every ${interval}s`);
      },
      configureRange(start,end,amount,interval){ for(let i=start;i<=end;i++) this.configureInstance(i,amount,interval); },
      viewInstance(id){ const inst=this.instances[id-1]; if(!inst){ ns.UI && ns.UI.log(`${this.name}#${id} not found`); return; } if(this.production) ns.UI && ns.UI.log(`${this.name}#${id} → ${inst.amount} every ${inst.interval}s`); else ns.UI && ns.UI.log(`${this.name}#${id} → +${this.populationIncrease} pop`); },
      viewAll(){ this.instances.forEach(i=> this.viewInstance(i.id)); }
    };
  }

  ns.createBuilding = createBuilding;

  ns.Buildings = ns.Buildings || {
    House: createBuilding({name:"House",cost:100,populationIncrease:5, buildingType: 'house'}),
    Apartment: createBuilding({name:"Apartment",cost:250,populationIncrease:8, buildingType: 'house'}),
    Farm: createBuilding({name:"Farm",cost:200,production:{amount:1,interval:2}, buildingType: 'farm'}),
    Mega_Farm: createBuilding({name:"Mega_Farm",cost:800,production:{amount:10,interval:2}, buildingType: 'farm'})
  };
})(window.Game);
