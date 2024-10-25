import * as fs from "fs";
import { ethers } from "ethers";
import { ChainId, Token, WETH9 } from "@uniswap/sdk-core";

import dotenv from "dotenv";
dotenv.config();
// require("dotenv").config();

const chainId = ChainId.MAINNET;
let HTTP_PROVIDER_LINK =
  "https://eth-mainnet.g.alchemy.com/v2/HqMqCcOiNeA_LwLQWHo9ZIgU1V1IG8Q3";
const UNISWAP_ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

/*
const chainId = ChainId.SEPOLIA;
let HTTP_PROVIDER_LINK =
  "https://eth-sepolia.g.alchemy.com/v2/HqMqCcOiNeA_LwLQWHo9ZIgU1V1IG8Q3";
const UNISWAP_ROUTER_ADDRESS = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";
*/

function getWETH9(chainId: ChainId): Token {
  const weth9 = WETH9[chainId];
  if (weth9) {
    return weth9;
  }

  if (chainId === ChainId.SEPOLIA) {
    return new Token(chainId, "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", 18);
  }

  return WETH9[ChainId.MAINNET];
}

const WETH = getWETH9(chainId);

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("私钥未定义，请在 .env 文件中设置 PRIVATE_KEY");
}

let provider = new ethers.JsonRpcProvider(HTTP_PROVIDER_LINK, chainId);
let wallet = new ethers.Wallet(privateKey, provider);

function setProvider(url: string) {
  HTTP_PROVIDER_LINK = url;

  provider = new ethers.JsonRpcProvider(url, chainId);
  wallet = new ethers.Wallet(privateKey as string, provider);
}

function getRpcProviderLink() {
  return HTTP_PROVIDER_LINK;
}

function getProvider() {
  return provider;
}
function getWallet() {
  return wallet;
}

const SYMBAL_PAD = 10;
const PRICE_PAD = 20;

const MAX_HISTORY_PRICE_LEN = 100;
const RECENT_HISTORY_PRICE_LEN = 16;
const MA = 5;

const POOL_ETH_MIN = 50;
const INIT_PROFILE = 0.8;
const RESERVE_PROFILE = 0.01;
const TRADE_RAISE_PERCENT_DIVISOR = 100; // 百分比的倒数,比如 1% 就是 100
const TRADE_AMOUNT_MIN = 0.45;
const MAX_TOKEN_HOLD_SECONDS = 3600;
const STOP_LOSS = 0.013;
const TAKE_PROFIT = 0.1;
const ODDS = 1.5;
const BUY_DOWN_PERCENT = 0.2;
const TOKEN_LARGE_LOSS = -0.1;

const MAX_TRACE_TOKENS = 20;

const BIGINT_PRECISION = 1000000000000000n; // bigint division point precision.

const UNISWAP_ROUTER_ABI = fs
  .readFileSync("src/abi/uniswap-router.abi.json")
  .toString();
const UNISWAP_ROUTER_CONTRACT = new ethers.Contract(
  UNISWAP_ROUTER_ADDRESS,
  UNISWAP_ROUTER_ABI,
  wallet
);

export default {
  getRpcProviderLink,
  getProvider,
  getWallet,
  SYMBAL_PAD,
  PRICE_PAD,
  MAX_HISTORY_PRICE_LEN,
  RECENT_HISTORY_PRICE_LEN,
  MA,
  POOL_ETH_MIN,
  INIT_PROFILE,
  RESERVE_PROFILE,
  TRADE_RAISE_PERCENT_DIVISOR,
  TRADE_AMOUNT_MIN,
  STOP_LOSS,
  TAKE_PROFIT,
  ODDS,
  BUY_DOWN_PERCENT,
  TOKEN_LARGE_LOSS,
  MAX_TRACE_TOKENS,
  BIGINT_PRECISION,
  MAX_TOKEN_HOLD_SECONDS,
  UNISWAP_ROUTER_ADDRESS,
  UNISWAP_ROUTER_CONTRACT,
  setProvider,
  chainId,
  WETH,
};
