const { getTokenInfo } = require("./tokenInfo");
const { 
  knownPairs, 
  knownTokens, 
  getPairKey, 
  saveKnownPairs, 
  saveKnownTokens, 
  saveLastBlock,
  loadLastBlock 
} = require("./storage");
const { createAndSendPairMessage } = require("./message");
const { getTokenDeployerInfo } = require("./deployerInfo");
const { ethers } = require("ethers");

async function pollFactory(factory, eventName, typeLabel, lastBlockRef, provider, bot, chatId) {
  const latestBlock = await provider.getBlockNumber();

  if (lastBlockRef.value === 0) {
    lastBlockRef.value = loadLastBlock(typeLabel) || latestBlock;
    return;
  }

  const from = lastBlockRef.value + 1;
  const to = latestBlock;
  if (to <= from) return;

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📦 Scanning blocks ${from} → ${to} for ${typeLabel}`);

  const maxRange = 1000;
  for (let start = from; start <= to; start += maxRange) {
    const end = Math.min(start + maxRange - 1, to);
    let logs = [];

    try {
      logs = await factory.queryFilter(eventName, start, end);
    } catch (err) {
      console.warn(`[${timestamp}] ⚠️ queryFilter failed for ${start}→${end}: ${err.message}`);
      continue;
    }

    for (const log of logs) {
      const args = log.args;
      const token0 = args.token0.toLowerCase();
      const token1 = args.token1.toLowerCase();
      const pair = args.pair || args.pool || "unknown";
      const deployer = log.transactionHash ? (await provider.getTransaction(log.transactionHash)).from : "unknown";
      const deployerBalance = deployer !== "unknown" ? ethers.formatEther(await provider.getBalance(deployer)) : "unknown";

      const pairKey = getPairKey(token0, token1);
      if (knownPairs.has(pairKey)) continue;

      knownPairs.add(pairKey);
      saveKnownPairs();

      const [info0, info1] = await Promise.all([
        getTokenInfo(token0, provider),
        getTokenInfo(token1, provider),
      ]);

      const isNewToken0 = !knownTokens.has(token0);
      const isNewToken1 = !knownTokens.has(token1);

      if (isNewToken0) knownTokens.add(token0);
      if (isNewToken1) knownTokens.add(token1);
      saveKnownTokens();

      // Get deployer info for each token if not wrapped native token
      console.log(`[${timestamp}] Checking if tokens are wrapped native:`, {
        token0,
        token1,
        wrappedNative: process.env.WRAPPED_NATIVE_TOKEN_CA.toLowerCase()
      });
      
      const [token0DeployerInfo, token1DeployerInfo] = await Promise.all([
        token0 !== process.env.WRAPPED_NATIVE_TOKEN_CA.toLowerCase() ? 
          getTokenDeployerInfo(token0, provider, log.blockNumber) : null,
        token1 !== process.env.WRAPPED_NATIVE_TOKEN_CA.toLowerCase() ? 
          getTokenDeployerInfo(token1, provider, log.blockNumber) : null
      ]);

      console.log(`[${timestamp}] Deployer info retrieved:`, {
        token0: token0DeployerInfo ? "found" : "not found",
        token1: token1DeployerInfo ? "found" : "not found"
      });

      await createAndSendPairMessage(
        bot, 
        chatId, 
        info0, 
        info1, 
        pair, 
        log.blockNumber, 
        typeLabel, 
        deployer, 
        deployerBalance,
        token0DeployerInfo,
        token1DeployerInfo
      );
    }

    lastBlockRef.value = end;
    saveLastBlock(end, typeLabel);
  }
}

module.exports = {
  pollFactory
}; 