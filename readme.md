
# evm-newpairs-bot

A simple bot polling new pairs and sending notifications on a Telegram channel.

## Installation

- Clone the repos
- Create a Telegram bot with Botfather
- Add the bot to your channel as admin
- Create a .env at the root with the following variables:
```
ENVIRONMENT="prod"
TG_BOT_TOKEN=
TG_CHAT_ID=
TG_DEV_CHAT_ID=
RPC_URL=
NATIVE_TOKEN_NAME=
WRAPPED_NATIVE_TOKEN_CA=
DEXSCREENER_BASIS_URL=https://dexscreener.com/hyperevm/
EXPLORER_BASIS_URL=https://purrsec.com/address/
```
Replace Dexscreener URL, Explorer and other variables according to the chain you want to pole.

If you switch to "dev" environment, messages will be sent to TG_DEV_CHAT_ID instead of TG_CHAT_ID.

- Go to /config.js and add configurations for each DEX you want to pole
- Add the DEX factory contracts ABIs  in /abis

- To start the bot, use
```
npm run start
```

The bot will likely not work on a public RPC with low rate limits. You should get a private RPC.