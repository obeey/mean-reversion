import { Token } from "./token.d.js";

let tokens: Token[] = [
  {
    name: "HANA",
    address: "0xb3912b20b3abc78c15e85e13ec0bf334fbb924f7",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0n,
    buyEthCost: 0,
    buyGasUsed: 0,
    sellGasUsed: 0,
    sellPending: false,
    buyPending: false,
    profit: 0,
    tradeWin: 28,
    tradeCount: 33,
  },
  {
    name: "CSI",
    address: "0x888c1a341ce9d9ae9c2d2a75a72a7f0d2551a2dc",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0n,
    buyEthCost: 0,
    buyGasUsed: 0,
    sellGasUsed: 0,
    sellPending: false,
    buyPending: false,
    profit: 0,
    tradeWin: 20,
    tradeCount: 31,
  },
];

let largeLossTokens: Token[] = [
  {
    name: "CULT",
    address: "0x3d2c4f3789010a8c8d4b5bb566e5d0a91ffb8c3d",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0n,
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
