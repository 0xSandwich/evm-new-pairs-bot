const { ethers } = require("ethers");
const config = require("../config.json");

function initializeFactories(provider) {
  const factories = {};
  config.dexConfig.forEach(dex => {
    const factoryAbi = require(`../abis/${dex.factoryAbiPath.split('/').pop()}`);
    factories[dex.name] = new ethers.Contract(dex.factoryAddress, factoryAbi, provider);
  });
  return factories;
}

module.exports = {
  initializeFactories
}; 