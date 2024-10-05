import * as fs from "fs";
import { ethers } from "ethers";
import { ChainId } from "@uniswap/sdk-core";

import dotenv from "dotenv";
dotenv.config();
// require("dotenv").config();

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("私钥未定义，请在 .env 文件中设置 PRIVATE_KEY");
}

let HTTP_PROVIDER_LINK =
  "https://go.getblock.io/a35061b4762843e899c5547dc64e890c";

let provider = new ethers.JsonRpcProvider(HTTP_PROVIDER_LINK, ChainId.MAINNET);
let wallet = new ethers.Wallet(privateKey, provider);

function setProvider(url: string) {
  HTTP_PROVIDER_LINK = url;

  provider = new ethers.JsonRpcProvider(url, ChainId.MAINNET);
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
const PRICE_PAD = 15;

const MAX_HISTORY_PRICE_LEN = 16; // 3min: 15+1. 15*12=180sec

const POOL_ETH_MIN = 50;
const INIT_PROFILE = 1;
const RESERVE_PROFILE = 0.05;
const TRADE_RAISE_PERCENT_DIVISOR = 100; // 百分比的倒数,比如 1% 就是 100
const TRADE_AMOUNT_MIN = 0.45;
const MAX_TOKEN_HOLD_SECONDS = 3600;
const STOP_LOSS = 0.03;
const TAKE_PROFIT = 0.05;
const ODDS = TAKE_PROFIT / STOP_LOSS;
const BUY_DOWN_PERCENT = 0.1;

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
  getRpcProviderLink,
  getProvider,
  getWallet,
  SYMBAL_PAD,
  PRICE_PAD,
  MAX_HISTORY_PRICE_LEN,
  POOL_ETH_MIN,
  INIT_PROFILE,
  RESERVE_PROFILE,
  TRADE_RAISE_PERCENT_DIVISOR,
  TRADE_AMOUNT_MIN,
  STOP_LOSS,
  TAKE_PROFIT,
  ODDS,
  BUY_DOWN_PERCENT,
  MAX_TOKEN_HOLD_SECONDS,
  UNISWAP_ROUTER_ADDRESS,
  UNISWAP_ROUTER_CONTRACT,
  setProvider,
};
