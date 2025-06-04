const fs = require("fs");

// --- Known Tokens Storage ---
const knownTokensPath = "history/knownTokens.json";
let knownTokens = new Set();
try {
  knownTokens = new Set(JSON.parse(fs.readFileSync(knownTokensPath, "utf8")));
} catch {
  knownTokens = new Set();
}

// --- Known Pairs Storage ---
const knownPairsPath = "history/knownPairs.json";
let knownPairs = new Set();
try {
  knownPairs = new Set(JSON.parse(fs.readFileSync(knownPairsPath, "utf8")));
} catch {
  knownPairs = new Set();
}

function getPairKey(tokenA, tokenB) {
  return [tokenA, tokenB].sort().join("-");
}

function loadLastBlock(label) {
  try {
    return parseInt(fs.readFileSync(`history/lastBlock.${label}.json`, "utf8"));
  } catch {
    return 0;
  }
}

function saveLastBlock(block, label) {
  fs.writeFileSync(`history/lastBlock.${label}.json`, block.toString());
}

function saveKnownTokens() {
  fs.writeFileSync(knownTokensPath, JSON.stringify([...knownTokens]));
}

function saveKnownPairs() {
  fs.writeFileSync(knownPairsPath, JSON.stringify([...knownPairs]));
}

module.exports = {
  knownTokens,
  knownPairs,
  getPairKey,
  loadLastBlock,
  saveLastBlock,
  saveKnownTokens,
  saveKnownPairs
}; 