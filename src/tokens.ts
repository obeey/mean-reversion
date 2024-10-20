import { Token } from "./token.d.js";

let tokens: Token[] = [];

let largeLossTokens: Token[] = [
  {
    name: "CULT",
    address: "0x3d2c4f3789010a8c8d4b5bb566e5d0a91ffb8c3d",
    buyTimestamp: NaN,
    historyPrice: [],
    pricePercent: [],
    pricePercentMa: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: 0,
    buyGasUsed: 0,
    sellGasUsed: 0,
    sellPending: false,
    buyPending: false,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
];
export default { tokens, largeLossTokens };
