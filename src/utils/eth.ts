import fs from "fs";
import { ethers } from "ethers";
import {
  ChainId,
  Token,
  WETH9,
  CurrencyAmount,
  TradeType,
  Percent,
} from "@uniswap/sdk-core";
import { Pair, Route, Trade } from "@uniswap/v2-sdk";
import poolabi from "../abi/uniswap-pool.abi.json";
import erc20abi from "../abi/erc20.abi.json";
import constants from "../constants";
import logger from "./logger";

async function getDecimals(
  chainId: ChainId,
  tokenAddress: string
): Promise<number> {
  const tokenContract = new ethers.Contract(
    tokenAddress,
    erc20abi,
    constants.provider
  );
  return tokenContract["decimals"]();
}

const chainId = ChainId.MAINNET;

async function createPair(token: Token): Promise<Pair> {
  const pairAddress = Pair.getAddress(token, WETH9[token.chainId]);

  // Setup provider, import necessary ABI ...
  const pairContract = new ethers.Contract(
    pairAddress,
    poolabi,
    constants.provider
  );
  const reserves = await pairContract["getReserves"]();
  const [reserve0, reserve1] = reserves;

  const tokens = [token, WETH9[token.chainId]];
  const [token0, token1] = tokens[0].sortsBefore(tokens[1])
    ? tokens
    : [tokens[1], tokens[0]];

  const pair = new Pair(
    CurrencyAmount.fromRawAmount(token0, reserve0.toString()),
    CurrencyAmount.fromRawAmount(token1, reserve1.toString())
  );
  return pair;
}

async function getMidPrice(tokenAddress: string): Promise<[string, string]> {
  const decimals = await getDecimals(ChainId.MAINNET, tokenAddress);
  // console.log(`decimals ${decimals} ${typeof(decimals)}`)

  const token = new Token(chainId, tokenAddress, Number(decimals));

  const pair = await createPair(token);

  const route = new Route([pair], WETH9[token.chainId], token);

  /*
  console.log(route.midPrice.toSignificant(6)) // 1901.08
  console.log(route.midPrice.invert().toSignificant(6))
  */

  return [
    route.midPrice.toSignificant(6),
    route.midPrice.invert().toSignificant(6),
  ];
}

// amountInETH = ETH
async function buyTokenMainnet(tokenAddress: string, amountInETH: string) {
  const decimals = await getDecimals(ChainId.MAINNET, tokenAddress);
  const token = new Token(ChainId.MAINNET, tokenAddress, decimals);

  const amountInWei = ethers.parseEther(amountInETH);
  const balanceWei = await getEthBalance();
  const amountInWeiStr = (
    balanceWei >= amountInWei ? amountInWei : balanceWei
  ).toString();
  const pair = await createPair(token);

  const route = new Route([pair], WETH9[token.chainId], token);

  const trade = new Trade(
    route,
    CurrencyAmount.fromRawAmount(WETH9[token.chainId], amountInWeiStr),
    TradeType.EXACT_INPUT
  );

  const slippageTolerance = new Percent("50", "10000"); // 50 bips, or 0.50%

  const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact(); // needs to be converted to e.g. decimal string
  const path = [WETH9[token.chainId].address, token.address];
  const to = constants.wallet.address;
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from the current Unix time
  const value = trade.inputAmount.toExact(); // // needs to be converted to e.g. decimal string
  const valueHex = ethers.toBeHex(value);

  constants.UNISWAP_ROUTER_CONTRACT.getFunction("swapExactETHForTokens")
    ?.call(amountOutMin, path, to, deadline, {
      value: valueHex,
    })
    .then((rawTxn) => {
      //Returns a Promise which resolves to the transaction.
      constants.wallet.sendTransaction(rawTxn).then((trans) => {
        getErc20Balanceof(tokenAddress).then((balance) => {
          const amountOut = ethers.formatUnits(balance, decimals);
          logger.info(
            ` - Mined : ${trans.hash} Block Number: ${
              trans.blockNumber
            } Swap ${ethers.formatEther(amountInWeiStr)}ETH for ${amountOut}`
          );
        });
      });
    });
}

async function sellTokenMainnet(tokenAddress: string) {
  const amountIn = await getErc20Balanceof(tokenAddress);

  const decimals = await getDecimals(ChainId.MAINNET, tokenAddress);
  const token = new Token(ChainId.MAINNET, tokenAddress, decimals);

  // See the Fetching Data guide to learn how to get Pair data
  const pair = await createPair(token);

  const route = new Route([pair], token, WETH9[token.chainId]);

  const trade = new Trade(
    route,
    CurrencyAmount.fromRawAmount(token, amountIn),
    TradeType.EXACT_INPUT
  );

  const slippageTolerance = new Percent("50", "10000"); // 50 bips, or 0.50%

  const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact(); // needs to be converted to e.g. decimal string
  const path = [token.address, WETH9[token.chainId].address];
  const to = constants.wallet.address;
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from the current Unix time
  const value = trade.inputAmount.toExact(); // // needs to be converted to e.g. decimal string
  const valueHex = ethers.toBeHex(value);

  constants.UNISWAP_ROUTER_CONTRACT.getFunction("swapExactTokensForETH")
    ?.call(amountOutMin, path, to, deadline, {
      value: valueHex,
    })
    .then((rawTxn) => {
      //Returns a Promise which resolves to the transaction.
      constants.wallet.sendTransaction(rawTxn).then((trans) => {
        logger.info(
          ` - Mined : ${trans.hash} Block Number: ${
            trans.blockNumber
          } Swap ${ethers.formatUnits(
            amountIn,
            decimals
          )} for ${ethers.formatEther(amountOutMin)}ETH`
        );
      });
    });
}

async function buyTokenTest(tokenAddress: string, amountIn: string) {}
async function sellTokenTest(tokenAddress: string, amountIn: string) {}

function getErc20Contract(tokenAddress: string) {
  const tokenAbi = fs.readFileSync("src/abi/erc20.abi.json").toString();
  const tokenContract = new ethers.Contract(
    tokenAddress,
    tokenAbi,
    constants.provider
  );

  return tokenContract;
}

async function getErc20Balanceof(tokenAddress: string) {
  return getErc20Contract(tokenAddress)
    .getFunction("balanceOf")
    .call(constants.wallet.address);
}

function getEthBalance() {
  return constants.provider.getBalance(constants.wallet.address);
}

function main() {
  buyTokenMainnet("0xb60fdf036f2ad584f79525b5da76c5c531283a1b", "0.001");
  sellTokenMainnet("0xb60fdf036f2ad584f79525b5da76c5c531283a1b");
}

// main();

export default {
  getMidPrice: getMidPrice,
  buyToken: buyTokenTest,
  sellToken: sellTokenTest,
};
