import * as fs from "fs";
import { ethers } from "ethers";
import { ChainId } from "@uniswap/sdk-core";

require("dotenv").config();

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("私钥未定义，请在 .env 文件中设置 PRIVATE_KEY");
}

let HTTP_PROVIDER_LINK = "https://eth-pokt.nodies.app";

let provider = new ethers.JsonRpcProvider(HTTP_PROVIDER_LINK, ChainId.MAINNET);
let wallet = new ethers.Wallet(privateKey, provider);

function setProvider(url: string) {
  HTTP_PROVIDER_LINK = url;

  provider = new ethers.JsonRpcProvider(HTTP_PROVIDER_LINK, ChainId.MAINNET);
  wallet = new ethers.Wallet(privateKey as string, provider);
}

const SYMBAL_PAD = 10;
const PRICE_PAD = 15;

const INIT_PROFILE = 0.6;
const RESERVE_PROFILE = 0.05;
const TRADE_AMOUNT = 0.5;
const TRADE_AMOUNT_MIN = 0.3;
const MAX_TOKEN_HOLD_SECONDS = 3600;
const STOP_LOSS = 0.03;
const TAKE_PROFIT = 0.08;
const ODDS = TAKE_PROFIT / STOP_LOSS;

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
  RESERVE_PROFILE,
  TRADE_AMOUNT,
  TRADE_AMOUNT_MIN,
  STOP_LOSS,
  TAKE_PROFIT,
  ODDS,
  MAX_TOKEN_HOLD_SECONDS,
  UNISWAP_ROUTER_ADDRESS,
  UNISWAP_ROUTER_CONTRACT,
  setProvider,
};
