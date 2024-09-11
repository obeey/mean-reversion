const {
  ChainId,
  Token,
  WETH9,
  CurrencyAmount,
  TradeType,
  Percent,
} = require("@uniswap/sdk-core");

const { ethers } = require("ethers");
const UNISWAP = require("@uniswap/sdk");
const fs = require("fs");
const {
  WETH,
  Fetcher,
  Pair,
  Route,
  Trade,
  TokenAmount,
} = require("@uniswap/v2-sdk");

import poolabi from "../abi/uniswap-pool.abi.json";
import erc20abi from "../abi/erc20.abi.json";
import constants from "../constants";
import logger from "./logger";

async function getDecimals(
  chainId: typeof ChainId,
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

async function createPair(token: typeof Token): Promise<typeof Pair> {
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
  logger.info(`decimals ${decimals}`);
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

/*
 * @param token0 - token we want
 * @param token1 - token we have
 * @param amount - the amount we want
 */
async function swapTokens(
  token0: typeof Token,
  token1: typeof Token,
  amount: number,
  slippage = "50"
) {
  try {
    const pair = await Fetcher.fetchPairData(
      token0,
      token1,
      constants.provider
    ); //creating instances of a pair
    // const route = new Route([pair], token, WETH9[token.chainId]);
    const route = await new Route([pair], token1); // a fully specified path from input token to output token
    let amountIn = ethers.parseEther(amount.toString()); //helper function to convert ETH to Wei
    amountIn = amountIn.toString();

    const slippageTolerance = new Percent(slippage, "10000"); // 50 bips, or 0.50% - Slippage tolerance

    const trade = new Trade( //information necessary to create a swap transaction.
      route,
      new TokenAmount(token1, amountIn),
      TradeType.EXACT_INPUT
    );

    const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw; // needs to be converted to e.g. hex
    const amountOutMinHex = ethers.BigNumber.from(
      amountOutMin.toString()
    ).toHexString();
    const path = [token1.address, token0.address]; //An array of token addresses
    const to = constants.wallet.address; // should be a checksummed recipient address
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
    const value = trade.inputAmount.raw; // // needs to be converted to e.g. hex
    const valueHex = await ethers.BigNumber.from(
      value.toString()
    ).toHexString(); //convert to hex string

    //Return a copy of transactionRequest, The default implementation calls checkTransaction and resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related operations on Signer.
    const rawTxn = await constants.UNISWAP_ROUTER_CONTRACT.getFunction(
      "swapExactETHForTokens"
    ).call(amountOutMinHex, path, to, deadline, {
      value: valueHex,
    });

    //Returns a Promise which resolves to the transaction.
    let sendTxn = (await constants.wallet).sendTransaction(rawTxn);

    //Resolves to the TransactionReceipt once the transaction has been included in the chain for x confirms blocks.
    let reciept = (await sendTxn).wait();

    //Logs the information about the transaction it has been mined.
    if (reciept) {
      console.log(
        " - Transaction is mined - " + "\n" + "Transaction Hash:",
        (await sendTxn).hash +
          "\n" +
          "Block Number: " +
          (await reciept)?.blockNumber +
          "\n" +
          "Navigate to https://etherscan.io/tx/" +
          (await sendTxn).hash,
        "to see your transaction"
      );
    } else {
      console.log("Error submitting transaction");
    }
  } catch (e) {
    console.log(e);
  }
}

function main() {
  buyTokenMainnet("0xb60fdf036f2ad584f79525b5da76c5c531283a1b", "0.001");
  // sellTokenMainnet("0xb60fdf036f2ad584f79525b5da76c5c531283a1b");
}

main();

export default {
  getMidPrice: getMidPrice,
  buyToken: buyTokenTest,
  sellToken: sellTokenTest,
};
