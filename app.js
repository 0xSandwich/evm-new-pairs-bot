const { Telegraf } = require('telegraf');
const { ethers } = require("ethers");
require('dotenv').config();

const config = require('./config.json');
const { escapeMarkdownV2 } = require('./functions/misc');
const { initializeFactories } = require('./functions/contracts');
const { pollFactory } = require('./functions/polling');

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const bot = new Telegraf(process.env.TG_BOT_TOKEN);
const chatId = process.env.ENVIRONMENT === 'prod' ? process.env.TG_CHAT_ID : process.env.TG_DEV_CHAT_ID;

// Initialize factories and last block refs
const factories = initializeFactories(provider);
const lastBlockRefs = {};

config.dexConfig.forEach(dex => {
  lastBlockRefs[dex.name] = { value: 0 };
});

async function safePoll() {
  try {
    for (const dex of config.dexConfig) {
      await pollFactory(
        factories[dex.name],
        dex.createdPairMethodName,
        dex.name,
        lastBlockRefs[dex.name],
        provider,
        bot,
        chatId,
        escapeMarkdownV2
      );
    }
  } catch (err) {
    console.error(`⚠️ Polling error:`, err.message);
  }
}

setInterval(safePoll, 5_000);
console.log("🚀 Listening for new pairs...");

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
