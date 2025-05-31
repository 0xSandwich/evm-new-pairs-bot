const { Telegraf } = require('telegraf');
const { ethers } = require("ethers");
const fs = require("fs");
require('dotenv').config();

const ERC20_ABI = require("./abis/erc20_mini.json");
const FACTORY_V2_ABI = require("./abis/hyperSwapV2Factory.json");
const FACTORY_V3_ABI = require("./abis/hyperSwapV3Factory.json");

const rpcUrls = process.env.RPC_URLS.split(",").map(url => url.trim());
let rpcIndex = 0;
let provider = new ethers.JsonRpcProvider(rpcUrls[rpcIndex]);

const bot = new Telegraf(process.env.TG_BOT_TOKEN);
const chatId = process.env.TG_CHAT_ID;

let factoryV2 = new ethers.Contract(process.env.FACTORY_V2_ADDRESS, FACTORY_V2_ABI, provider);
let factoryV3 = new ethers.Contract(process.env.FACTORY_V3_ADDRESS, FACTORY_V3_ABI, provider);

const lastBlockRefV2 = { value: 0 };
const lastBlockRefV3 = { value: 0 };

// --- Known Tokens Storage ---
const knownTokensPath = "knownTokens.json";
let knownTokens = new Set();

try {
  knownTokens = new Set(JSON.parse(fs.readFileSync(knownTokensPath, "utf8")));
} catch {
  knownTokens = new Set();
}

function saveKnownTokens() {
  fs.writeFileSync(knownTokensPath, JSON.stringify([...knownTokens]));
}

// --- Helpers ---

function loadLastBlock(label) {
  try {
    return parseInt(fs.readFileSync(`lastBlock.${label}.json`, "utf8"));
  } catch {
    return 0;
  }
}

function saveLastBlock(block, label) {
  fs.writeFileSync(`lastBlock.${label}.json`, block.toString());
}

async function getTokenInfo(address) {
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
    return { address, name: "?", symbol: "?", decimals: 18 };
  }
}

async function switchProvider() {
  rpcIndex = (rpcIndex + 1) % rpcUrls.length;
  provider = new ethers.JsonRpcProvider(rpcUrls[rpcIndex]);
  factoryV2 = new ethers.Contract(process.env.FACTORY_V2_ADDRESS, FACTORY_V2_ABI, provider);
  factoryV3 = new ethers.Contract(process.env.FACTORY_V3_ADDRESS, FACTORY_V3_ABI, provider);
  console.warn(`🔁 Switched to fallback RPC: ${rpcUrls[rpcIndex]}`);
}

async function pollFactory(factory, eventName, typeLabel, lastBlockRef) {
  const latestBlock = await provider.getBlockNumber();

  if (lastBlockRef.value === 0) {
    lastBlockRef.value = loadLastBlock(typeLabel) || latestBlock;
    return;
  }

  const from = lastBlockRef.value + 1;
  const to = latestBlock;
  if (to <= from) return;

  console.log(`📦 Scanning blocks ${from} → ${to} for ${typeLabel}`);

  const maxRange = 1000;
  for (let start = from; start <= to; start += maxRange) {
    const end = Math.min(start + maxRange - 1, to);
    let logs = [];

    try {
      logs = await factory.queryFilter(eventName, start, end);
    } catch (err) {
      console.warn(`⚠️ queryFilter failed for ${start}→${end}: ${err.message}`);
      continue;
    }

    for (const log of logs) {
      const args = log.args;
      const token0 = args.token0.toLowerCase();
      const token1 = args.token1.toLowerCase();
      const pair = args.pair || args.pool || "unknown";

      const [info0, info1] = await Promise.all([
        getTokenInfo(token0),
        getTokenInfo(token1),
      ]);

      const isNewToken0 = !knownTokens.has(token0);
      const isNewToken1 = !knownTokens.has(token1);

      if (!isNewToken0 && !isNewToken1) continue;

      if (isNewToken0) knownTokens.add(token0);
      if (isNewToken1) knownTokens.add(token1);
      saveKnownTokens();

      const msg = `
🆕 New pair ${typeLabel} detected !

📦 Token0: $${info0.symbol} - ${info0.name} (${info0.address})
📦 Token1: $${info1.symbol} - ${info1.name} (${info1.address})
🧪 LP address: ${pair}
🔢 Block: ${log.blockNumber}
`;
      console.log(msg);
      await bot.telegram.sendMessage(chatId, msg.trim());
    }

    lastBlockRef.value = end;
    saveLastBlock(end, typeLabel);
  }
}

async function safePoll() {
  try {
    await pollFactory(factoryV2, "PairCreated", "V2", lastBlockRefV2);
    await pollFactory(factoryV3, "PoolCreated", "V3", lastBlockRefV3);
  } catch (err) {
    console.error(`⚠️ Polling error (${rpcUrls[rpcIndex]}):`, err.message);
    await switchProvider();
  }
}

setInterval(safePoll, 5_000);
console.log("🚀 Listening for new HyperSwap V2/V3 pairs...");

// Optional bot interactions
bot.start((ctx) => ctx.reply("🤖 HyperSwap V2/V3 monitoring bot started."));
bot.help((ctx) => ctx.reply("This bot detects new pairs on HyperEVM."));
bot.command("ping", (ctx) => ctx.reply("🏓 Still alive!"));
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
