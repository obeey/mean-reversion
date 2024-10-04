import { Token } from "./token.d.js";

let tokens: Token[] = [
  /*
  {
    name: "3AC",
    address: "0x2de1218c31a04e1040fc5501b89e3a58793b3ddf",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "MARS",
    address: "0xb8d6196d71cdd7d90a053a7769a077772aaac464",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "DOGGO",
    address: "0x240cd7b53d364a208ed41f8ced4965d11f571b7a",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "TERMINUS",
    address: "0xcbde0453d4e7d748077c1b0ac2216c011dd2f406",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "GOU",
    address: "0xed89fc0f41d8be2c98b13b7e3cd3e876d73f1d30",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "DOGE",
    address: "0x1121acc14c63f3c872bfca497d10926a6098aac5",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  */
  {
    name: "INCEPT",
    address: "0x1c43cd666f22878ee902769fccda61f401814efb",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 5,
    tradeCount: 7,
  },
  {
    name: "HANA",
    address: "0xb3912b20b3abc78c15e85e13ec0bf334fbb924f7",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 20,
    tradeCount: 25,
  },
  {
    name: "EDOGE",
    address: "0x786f112c9a6bc840cdc07cfd840105efd6ef2d4b",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 7,
    tradeCount: 9,
  },
  {
    name: "MOODENG",
    address: "0x28561b8a2360f463011c16b6cc0b0cbef8dbbcad",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 10,
    tradeCount: 10,
  },
  /*
  {
    name: "Neiro",
    address: "0x812ba41e071c7b7fa4ebcfb62df5f45f6fa853ee",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "SPX",
    address: "0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "Marvin",
    address: "0x85bea4ee627b795a79583fcede229e198aa57055",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "PEPE",
    address: "0x6982508145454ce325ddbe47a25d4ec3d2311933",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "HONK",
    address: "0xd8e8438cf7beed13cfabc82f300fb6573962c9e3",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "PEXE",
    address: "0xb48c6946fe97a79ae39e8fa5e297a8b9651e00f8",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "melo",
    address: "0x0da2082905583cedfffd4847879d0f1cf3d25c36",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  {
    name: "SATO",
    address: "0x5de758bba013e58dae2693aea3f0b12b31a3023d",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 0,
    tradeCount: 0,
  },
  */
  {
    name: "ESTEE",
    address: "0x4298e4ad48be89bf63a6fdc470a4b4fe9ce633b1",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: 0,
    sellGasUsed: 0,
    profit: 0,
    tradeWin: 6,
    tradeCount: 11,
  },
  /*
  {
    name: "FARM",
    address: "0x6db6fdb5182053eecec778afec95e0814172a474",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "COLON",
    address: "0xD09Eb9099faC55eDCbF4965e0A866779ca365a0C",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "GME",
    address: "0xc56C7A0eAA804f854B536A5F3D5f49D2EC4B12b8",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "Neiro",
    address: "0x812Ba41e071C7b7fA4EBcFB62dF5F45f6fA853Ee",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "BIAO",
    address: "0x9Fd9278f04f01c6a39a9d1c1CD79f7782C6ADe08",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "$yawn",
    address: "0x881d4C8618D68872fA404518B2460eA839A02a6a",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "BIRDDOG",
    address: "0xF6Ce4BE313EaD51511215F1874c898239A331E37",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "EBULL",
    address: "0x71297312753EA7A2570a5a3278eD70D9a75F4f44",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "SPX",
    address: "0xE0f63A424a4439cBE457D80E4f4b51aD25b2c56C",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "NEMO",
    address: "0xb60FDF036F2ad584f79525B5da76C5c531283A1B",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "FAC",
    address: "0x1a3A8Cf347b2bF5890D3D6A1B981c4f4432C8661",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "WUKONG",
    address: "0x132B96b1152bb6Be197501E8220A74D3e63E4682",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "DOGE",
    address: "0x1121acc14c63f3c872bfca497d10926a6098aac5",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "HARRIS",
    address: "0x155788dd4b3ccd955a5b2d461c7d6504f83f71fa",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "MOON",
    address: "0x446e30f35aab8bd4267139559e526af349c14aff",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "PEIPEI",
    address: "0x3ffeea07a27fab7ad1df5297fa75e77a43cb5790",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "MADA",
    address: "0xf41A7B7C79840775F70A085C1fC5A762bBc6B180",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "CATALORIAN",
    address: "0x8bAF5d75CaE25c7dF6d1E0d26C52d19Ee848301a",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  {
    name: "OLAS",
    address: "0x0001A500A6B18995B03f44bb040A5fFc28E45CB0",
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 0,
    buyEthCost: NaN,
    buyGasUsed: "",
    sellGasUsed: "",
    buyTimestamp: NaN,
  },
  */
];

export default { tokens };
