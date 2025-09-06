function createBuilding({name,cost,populationIncrease=0,production=null}){
  return {
    name,cost,populationIncrease,production,instances:[],
    build(){
      if(City.money<this.cost){ UI.log(`Not enough money for ${this.name}`); return;}
      City.changeMoney(-this.cost);
      City.populationCap+=this.populationIncrease;
      let instance={id:this.instances.length+1};
      if(this.production){ instance.amount=this.production.amount; instance.interval=this.production.interval; instance.timer=0; }
      this.instances.push(instance);
      UI.log(`Built ${this.name}#${instance.id}`);
    },
    configureInstance(id,amount,interval){
      const inst=this.instances.find(i=>i.id===id);
      if(!inst){ UI.log(`${this.name}#${id} not found`); return;}
      if(!this.production){ UI.log(`${this.name}#${id} cannot be configured`); return;}
      inst.amount=amount; inst.interval=interval; inst.timer=0;
      UI.log(`${this.name}#${id} set to ${amount} every ${interval}s`);
    },
    configureRange(start,end,amount,interval){ for(let i=start;i<=end;i++) this.configureInstance(i,amount,interval); },
    viewInstance(id){ const inst=this.instances.find(i=>i.id===id); if(!inst){ UI.log(`${this.name}#${id} not found`); return;}
      if(this.production){ UI.log(`${this.name}#${id} → Producing ${inst.amount} food every ${inst.interval}s`);}
      else{ UI.log(`${this.name}#${id} → Population increase: ${this.populationIncrease}`); }
    },
    viewRange(start,end){ for(let i=start;i<=end;i++) this.viewInstance(i); },
    viewAll(){ if(this.instances.length===0){ UI.log(`No ${this.name} built yet`); return;} this.instances.forEach(inst=>this.viewInstance(inst.id)); }
  };
}

const Buildings={
  House:createBuilding({name:"House",cost:100,populationIncrease:5}),
  Farm:createBuilding({name:"Farm",cost:200,production:{amount:1,interval:2}}),
  Big_Farm:createBuilding({name:"Big_Farm",cost:200,production:{amount:3,interval:2}}),
};
