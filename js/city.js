const City = {
  population:0,
  populationCap:20,
  money:1000,
  food:100,
  happiness:100,
  addPopulation(amount){ this.population = Math.min(this.population + amount, this.populationCap); },
  changeMoney(amount){ this.money += amount; },
  changeFood(amount){ this.food += amount; }
};
