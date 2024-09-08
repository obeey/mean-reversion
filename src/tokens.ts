import { Token } from "./token.d";

const MAX_HISTORY_PRICE_LEN = 16; // 3min: 15+1. 15*12=180sec

let tokens: Token[] = [
  {
    name: "FARM",
    address: "0x6db6fdb5182053eecec778afec95e0814172a474",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "COLON",
    address: "0xD09Eb9099faC55eDCbF4965e0A866779ca365a0C",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "GME",
    address: "0xc56C7A0eAA804f854B536A5F3D5f49D2EC4B12b8",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "Neiro",
    address: "0x812Ba41e071C7b7fA4EBcFB62dF5F45f6fA853Ee",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "BIAO",
    address: "0x9Fd9278f04f01c6a39a9d1c1CD79f7782C6ADe08",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "$yawn",
    address: "0x881d4C8618D68872fA404518B2460eA839A02a6a",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "BIRDDOG",
    address: "0xF6Ce4BE313EaD51511215F1874c898239A331E37",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "EBULL",
    address: "0x71297312753EA7A2570a5a3278eD70D9a75F4f44",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "SPX",
    address: "0xE0f63A424a4439cBE457D80E4f4b51aD25b2c56C",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "NEMO",
    address: "0xb60FDF036F2ad584f79525B5da76C5c531283A1B",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "FAC",
    address: "0x1a3A8Cf347b2bF5890D3D6A1B981c4f4432C8661",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "WUKONG",
    address: "0x132B96b1152bb6Be197501E8220A74D3e63E4682",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "DOGE",
    address: "0x1121acc14c63f3c872bfca497d10926a6098aac5",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "HARRIS",
    address: "0x155788dd4b3ccd955a5b2d461c7d6504f83f71fa",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "MOON",
    address: "0x446e30f35aab8bd4267139559e526af349c14aff",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
  {
    name: "PEIPEI",
    address: "0x3ffeea07a27fab7ad1df5297fa75e77a43cb5790",
    historyPrice: [],
    buyPrice: NaN,
    buyAmount: 0,
  },
];

export default { tokens, MAX_HISTORY_PRICE_LEN };
