import * as fs from "fs";
import { ethers } from "ethers";
import { ChainId } from "@uniswap/sdk-core";

require("dotenv").config();

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("私钥未定义，请在 .env 文件中设置 PRIVATE_KEY");
}

const HTTP_PROVIDER_LINK = `https://eth-mainnet.g.alchemy.com/v2/HqMqCcOiNeA_LwLQWHo9ZIgU1V1IG8Q3`;
// const HTTP_PROVIDER_LINK =
//   "https://eth-mainnet.g.alchemy.com/v2/HqMqCcOiNeA_LwLQWHo9ZIgU1V1IG8Q3";
// const HTTP_PROVIDER_LINK =
//   "https://eth-mainnet.g.alchemy.com/v2/hWT7tiQl88VfR5ob5m3XxYUU8CLaoqp7";
// const HTTP_PROVIDER_LINK = `https://mainnet.infura.io/v3/73eabea1ee6a42be90b28d1f30d12b97`;
// const HTTP_PROVIDER_LINK = "https://rpc.mevblocker.io";

const provider = new ethers.JsonRpcProvider(
  HTTP_PROVIDER_LINK,
  ChainId.MAINNET
);
const wallet = new ethers.Wallet(privateKey, provider);

const SYMBAL_PAD = 8;
const PRICE_PAD = 15;

const INIT_PROFILE = 0.03;
const TRADE_AMOUNT = 0.01;
const MAX_TOKEN_HOLD_SECONDS = 3600;

const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const UNISWAP_ROUTER_ABI = fs
  .readFileSync("src/abi/uniswap-router.abi.json")
  .toString();
const UNISWAP_ROUTER_CONTRACT = new ethers.Contract(
  UNISWAP_ROUTER_ADDRESS,
  UNISWAP_ROUTER_ABI,
  wallet
);

export default {
  HTTP_PROVIDER_LINK,
  provider,
  wallet,
  SYMBAL_PAD,
  PRICE_PAD,
  INIT_PROFILE,
  TRADE_AMOUNT,
  MAX_TOKEN_HOLD_SECONDS,
  UNISWAP_ROUTER_CONTRACT,
};
