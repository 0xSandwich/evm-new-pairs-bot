const { ethers } = require("ethers");
const ERC20_ABI = require("../abis/erc20_mini.json");

async function getTokenInfo(address, provider) {
  const token = new ethers.Contract(address, ERC20_ABI, provider);
  try {
    const [name, symbol, decimals] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
    ]);
    return { address, name, symbol, decimals };
  } catch (err) {
    console.warn(`⚠️ Could not get token info for ${address}: ${err.message}`);
    console.log(err);
    return { address, name: "?", symbol: "? (Couldn't get info, be careful)", decimals: 18 };
  }
}

module.exports = {
  getTokenInfo
}; 