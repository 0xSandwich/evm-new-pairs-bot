const { ethers } = require("ethers");
const ERC20_ABI = require("../abis/erc20_mini.json");

// Cache for deployer token counts
const deployerTokenCounts = new Map();

async function getTokenDeployerInfo(tokenAddress, provider, blockNumber) {
  console.log("Getting token deployer info for", tokenAddress);
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const startBlock = Math.max(1, blockNumber - 100);

    // Get Transfer event logs
    const transferEventSignature = ethers.id("Transfer(address,address,uint256)");
    console.log("Looking for Transfer events from block", startBlock, "to", blockNumber);
    const logs = await provider.getLogs({
      fromBlock: startBlock,
      toBlock: blockNumber,
      address: tokenAddress,
      topics: [transferEventSignature]
    });
    console.log("Found", logs.length, "Transfer events");

    let deployerAddress = null;
    for (const log of logs) {
      const fromAddress = ethers.getAddress(log.topics[1].slice(-40));
      const toAddress = ethers.getAddress(log.topics[2].slice(-40));
      console.log("Transfer from", fromAddress, "to", toAddress);
      
      if (fromAddress === ethers.ZeroAddress) {
        console.log("Found initial transfer, getting transaction details");
        const tx = await provider.getTransaction(log.transactionHash);
        deployerAddress = tx.from;
        console.log("Deployer address:", deployerAddress);
        break;
      }
    }

    if (deployerAddress) {
      // Update deployer token count
      const currentCount = deployerTokenCounts.get(deployerAddress) || 0;
      deployerTokenCounts.set(deployerAddress, currentCount + 1);

      // Get native token balance
      const nativeBalance = await provider.getBalance(deployerAddress);
      const nativeBalanceFormatted = ethers.formatEther(nativeBalance);
      console.log("Deployer balance:", nativeBalanceFormatted, "tokens created:", currentCount + 1);

      return {
        deployerAddress,
        tokenCount: currentCount + 1,
        nativeBalance: nativeBalanceFormatted
      };
    }

    console.log("No deployer found for token", tokenAddress);
    return null;
  } catch (err) {
    console.warn(`⚠️ Error getting token deployer info for ${tokenAddress}: ${err.message}`);
    console.error(err);
    return null;
  }
}

module.exports = {
  getTokenDeployerInfo
}; 