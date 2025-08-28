const { escapeMarkdownV2 } = require("./misc");

function escapeNumber(number) {
  return escapeMarkdownV2(number.toString());
}

function formatBalance(balance) {
  return Number(balance).toFixed(2);
}

async function createAndSendPairMessage(bot, chatId, info0, info1, pair, blockNumber, typeLabel, deployer, deployerBalance, token0DeployerInfo, token1DeployerInfo) {
  const isToken0Wrapped = info0.address.toLowerCase() === process.env.WRAPPED_NATIVE_TOKEN_CA.toLowerCase();
  const isToken1Wrapped = info1.address.toLowerCase() === process.env.WRAPPED_NATIVE_TOKEN_CA.toLowerCase();

  const token0Section = !isToken0Wrapped ? `*📦 $${escapeMarkdownV2(info0.symbol)} \\- ${escapeMarkdownV2(info0.name)}*  
[\`${escapeMarkdownV2(info0.address)}\`](tg://copy?text=${escapeMarkdownV2(info0.address)})
👨‍💻 ${token0DeployerInfo ? `*Deployer:* [\`${escapeMarkdownV2(token0DeployerInfo.deployerAddress)}\`](tg://copy?text=${escapeMarkdownV2(token0DeployerInfo.deployerAddress)})
💎 *Balance:* ${escapeNumber(formatBalance(token0DeployerInfo.nativeBalance))} ${escapeMarkdownV2(process.env.NATIVE_TOKEN_NAME)}
🔢 *Tokens created:* ${escapeNumber(token0DeployerInfo.tokenCount)}` : 'Deployer not found'}` : '';

  const token1Section = !isToken1Wrapped ? `*📦 $${escapeMarkdownV2(info1.symbol)} \\- ${escapeMarkdownV2(info1.name)}*  
[\`${escapeMarkdownV2(info1.address)}\`](tg://copy?text=${escapeMarkdownV2(info1.address)})
👨‍💻 ${token1DeployerInfo ? `*Deployer:* [\`${escapeMarkdownV2(token1DeployerInfo.deployerAddress)}\`](tg://copy?text=${escapeMarkdownV2(token1DeployerInfo.deployerAddress)})
💎 *Balance:* ${escapeNumber(formatBalance(token1DeployerInfo.nativeBalance))} ${escapeMarkdownV2(process.env.NATIVE_TOKEN_NAME)}
🔢 *Tokens created:* ${escapeNumber(token1DeployerInfo.tokenCount)}` : 'Deployer not found'}` : '';

  const msg = `*⭐ New pair $${escapeMarkdownV2(info0.symbol)} / $${escapeMarkdownV2(info1.symbol)}*
🌐 ${typeLabel}

${token0Section}${token0Section && token1Section ? '\n' : ''}${token1Section}

*🧪 LP address*  
[\`${escapeMarkdownV2(pair)}\`](tg://copy?text=${escapeMarkdownV2(pair)})

*👨‍💻 LP added by*  
[\`${escapeMarkdownV2(deployer)}\`](tg://copy?text=${escapeMarkdownV2(deployer)})
💎 Balance: ${escapeNumber(formatBalance(deployerBalance))} ${escapeMarkdownV2(process.env.NATIVE_TOKEN_NAME)}

🔢 Block ${blockNumber}

🔗 [DEX](${process.env.DEXSCREENER_BASIS_URL}${pair}) \\| [EXPLORER](${process.env.EXPLORER_BASIS_URL}${pair})`;
  
  console.log(`Sending message for LP $${escapeMarkdownV2(info0.symbol)} / $${escapeMarkdownV2(info1.symbol)}`);
  await bot.telegram.sendMessage(chatId, msg.trim(), {
    parse_mode: "MarkdownV2",
    disable_web_page_preview: true,
  });
}

module.exports = {
  createAndSendPairMessage
}; 