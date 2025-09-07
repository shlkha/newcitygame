(function(ns){
  if(ns.createBuilding && ns.Buildings) return; // already initialized

  function createBuilding({name,cost,populationIncrease=0,production=null,buildingType='generic'}){
    return {
      name,cost,populationIncrease,production,buildingType,instances:[],
      build(){
        if(ns.City.money < this.cost){ ns.UI && ns.UI.log(`Not enough money for ${this.name}`); return; }
        ns.City.changeMoney(-this.cost);
        ns.City.populationCap += this.populationIncrease;
        let instance = { id: this.instances.length + 1 };
        if(this.production){
          instance.amount = this.production.amount;
          instance.interval = this.production.interval;
          instance.timer = 0;
        } else if(this.populationIncrease){
          instance.populationIncrease = this.populationIncrease;
        }
        this.instances.push(instance);
        ns.UI && ns.UI.log(`Built ${this.name}#${instance.id}`);
        if(ns.UI) { ns.UI.createBuildingButtons(); ns.UI.updateStats(); if(typeof ns.UI.refreshTutorial === 'function') ns.UI.refreshTutorial(); }
      },
      configureInstance(id,amount,interval){
        const inst = this.instances.find(i=>i.id===id);
        if(!inst){ ns.UI && ns.UI.log(`${this.name}#${id} not found`); return; }
        if(!this.production){ ns.UI && ns.UI.log(`${this.name}#${id} cannot be configured`); return; }
        inst.amount = amount; inst.interval = interval; inst.timer = 0;
        ns.UI && ns.UI.log(`${this.name}#${id} set to ${amount} every ${interval}s`);
        if(ns.UI && typeof ns.UI.refreshTutorial === 'function') ns.UI.refreshTutorial();
      },
      configureRange(start,end,amount,interval){ for(let i=start;i<=end;i++) this.configureInstance(i,amount,interval); },
      viewInstance(id){ const inst=this.instances.find(i=>i.id===id); if(!inst){ ns.UI && ns.UI.log(`${this.name}#${id} not found`); return;}
        if(this.production){ ns.UI && ns.UI.log(`${this.name}#${id} → Producing ${inst.amount} food every ${inst.interval}s`); }
        else{ ns.UI && ns.UI.log(`${this.name}#${id} → Population increase: ${this.populationIncrease}`); }
      },
      viewRange(start,end){ for(let i=start;i<=end;i++) this.viewInstance(i); },
      viewAll(){ if(this.instances.length===0){ ns.UI && ns.UI.log(`No ${this.name} built yet`); return;} this.instances.forEach(inst=>this.viewInstance(inst.id)); }
    };
  }

  ns.createBuilding = createBuilding;

  ns.Buildings = ns.Buildings || {
    House: createBuilding({name:"House",cost:100,populationIncrease:5, buildingType: 'house'}),
    Apartment: createBuilding({name:"Apartment",cost:250,populationIncrease:8, buildingType: 'house'}),
    Villa: createBuilding({name:"Villa",cost:600,populationIncrease:15, buildingType: 'house'}),
    Cottage: createBuilding({name:"Cottage",cost:70,populationIncrease:3, buildingType: 'house'}),
    Farm: createBuilding({name:"Farm",cost:200,production:{amount:1,interval:2}, buildingType: 'farm'}),
    Big_Farm: createBuilding({name:"Big_Farm",cost:200,production:{amount:3,interval:2}, buildingType: 'farm'}),
    Mega_Farm: createBuilding({name:"Mega_Farm",cost:800,production:{amount:10,interval:2}, buildingType: 'farm'}),
  };
})(window.Game = window.Game || {});
};
