import fs from "fs";
import { Pair, Route, Trade } from "@uniswap/v2-sdk";
import {
  ChainId,
  Token,
  WETH9,
  CurrencyAmount,
  TradeType,
  Percent,
} from "@uniswap/sdk-core";
import { ethers, Wallet } from "ethers";
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

async function createPair(token0: Token, token1: Token): Promise<Pair> {
  const pairAddress = Pair.getAddress(token0, token1);

  // Setup provider, import necessary ABI ...
  const pairContract = new ethers.Contract(
    pairAddress,
    poolabi,
    constants.provider
  );
  const reserves = await pairContract["getReserves"]();
  const [reserve0, reserve1] = reserves;

  const tokens = [token0, token1];
  const [t0, t1] = tokens[0].sortsBefore(tokens[1])
    ? tokens
    : [tokens[1], tokens[0]];

  const pair = new Pair(
    CurrencyAmount.fromRawAmount(t0, reserve0.toString()),
    CurrencyAmount.fromRawAmount(t1, reserve1.toString())
  );
  return pair;
}

async function getMidPrice(tokenAddress: string): Promise<[string, string]> {
  const decimals = Number(await getDecimals(ChainId.MAINNET, tokenAddress));
  // console.log(`decimals ${decimals} ${typeof(decimals)}`)

  const token = new Token(chainId, tokenAddress, decimals);

  const pair = await createPair(token, WETH9[ChainId.MAINNET]);

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

/**
 *
 * @param tokenAddress
 * @param amountInETH
 * @returns
 */
async function buyTokenMainnet(tokenAddress: string, amountInETH: string) {
  const amountInWei = ethers.parseEther(amountInETH);
  const balanceWei = await getEthBalance();
  if (amountInWei >= balanceWei) {
    logger.error(
      `B ETH not enough. Except: ${amountInWei} Have: ${balanceWei}`
    );
    return;
  }

  const decimals = Number(await getDecimals(ChainId.MAINNET, tokenAddress));
  // logger.info(`decimals ${decimals} ${typeof decimals}`);
  const token = new Token(ChainId.MAINNET, tokenAddress, decimals);
  // const token = new Token(ChainId.MAINNET, tokenAddress, 9);

  swapTokens(token, WETH9[token.chainId], amountInETH).then((txn) => {
    /*
    txn?.wait().then((reciept) => {
      getErc20Balanceof(tokenAddress).then((balance) => {
        const amountOut = ethers.formatUnits(balance, decimals);
        logger.info(
          ` - Mined : ${txn.hash} Block Number: ${txn.blockNumber} fee ${reciept?.fee} Swap ${amountInETH}ETH for ${amountOut}`
        );
      });
    });
    */
    console.log("Transaction sent:", txn);
  });

  /*
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
  */
}

async function sellTokenMainnet(tokenAddress: string) {
  const amountIn = await getErc20Balanceof(tokenAddress);
  if (amountIn === undefined || amountIn === "" || amountIn === "0") {
    logger.error(`S No token in account`);
    return;
  }

  const decimals = Number(await getDecimals(ChainId.MAINNET, tokenAddress));
  const token = new Token(ChainId.MAINNET, tokenAddress, decimals);

  swapTokens(
    WETH9[token.chainId],
    token,
    ethers.formatUnits(amountIn, decimals)
  ).then((txn) => {
    /*
      txn?.wait().then((reciept) => {
        logger.info(
          ` - Mined : ${txn.hash} Block Number: ${txn.blockNumber} fee ${
            reciept?.fee
          } Swap ${ethers.formatUnits(amountIn, decimals)} for ETH`
        );
      });
      */
    console.log("Transaction sent:", txn);
  });

  /*

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
  */
}

async function buyTokenTest(tokenAddress: string, amountIn: string) {}
async function sellTokenTest(tokenAddress: string) {}

function getErc20Contract(tokenAddress: string) {
  const tokenAbi = fs.readFileSync("src/abi/erc20.abi.json").toString();
  const tokenContract = new ethers.Contract(
    tokenAddress,
    tokenAbi,
    constants.provider
  );

  return tokenContract;
}

/*
 * @return - wei
 */
async function getErc20Balanceof(tokenAddress: string) {
  return getErc20Contract(tokenAddress).balanceOf(constants.wallet.address);
}

/*
 * @return - wei
 */
function getEthBalance() {
  return constants.provider.getBalance(constants.wallet.address);
}

/**
 *
 * @param token0 - token we want
 * @param token1 - token we have
 * @param amount - the amount we want
 */
async function swapTokens(
  token0: Token,
  token1: Token,
  amount: string,
  slippage = "50"
) {
  try {
    /*
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
    */

    // const token = token0 == WETH9[ChainId.MAINNET] ? token1 : token0;
    const pair = await createPair(token0, token1);

    const route = new Route([pair], token1, token0);

    const amountIn = ethers.parseEther(amount); //helper function to convert ETH to Wei
    const amountInWeiStr = amountIn.toString();
    logger.info(`Amount in ${amountInWeiStr} wei`);

    const slippageTolerance = new Percent(slippage, "10000"); // 50 bips, or 0.50% - Slippage tolerance
    const trade = new Trade(
      route,
      CurrencyAmount.fromRawAmount(token1, amountInWeiStr),
      TradeType.EXACT_INPUT
    );

    const amountOutMin = trade.minimumAmountOut(slippageTolerance).quotient; // needs to be converted to e.g. hex
    const amountOutMinHex = ethers.toBeHex(amountOutMin.toString());
    /*
    const amountOutMinHex = ethers.BigNumber.from(
      amountOutMin.toString()
    ).toHexString();
    */
    const path = [token1.address, token0.address]; //An array of token addresses
    const to = constants.wallet.address; // should be a checksummed recipient address
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time
    const value = trade.inputAmount.quotient; // // needs to be converted to e.g. hex
    const valueHex = ethers.toBeHex(value.toString());

    let ret;
    if (token0 === WETH9[chainId]) {
      logger.info(`swapExactTokensForETH`);

      await approveAmountIn(token1, amountIn);

      ret = constants.UNISWAP_ROUTER_CONTRACT.swapExactTokensForETH(
        valueHex,
        amountOutMinHex,
        path,
        to,
        deadline
      );
    } else {
      logger.info(`swapExactETHForTokens`);
      ret = constants.UNISWAP_ROUTER_CONTRACT.swapExactETHForTokens(
        amountOutMinHex,
        path,
        to,
        deadline,
        {
          value: valueHex,
        }
      );
    }
    return ret;

    // console.log("Transaction sent:", txn);

    /*
    //Return a copy of transactionRequest, The default implementation calls checkTransaction and resolves to if it is an ENS name, adds gasPrice, nonce, gasLimit and chainId based on the related operations on Signer.
    const rawTxn = await constants.UNISWAP_ROUTER_CONTRACT.getFunction(
      "swapExactETHForTokens"
    ).call(amountOutMinHex, path, to, deadline, {
      value: valueHex,
    });

    //Returns a Promise which resolves to the transaction.
    let sendTxn = (await constants.wallet).sendTransaction(rawTxn);
    return sendTxn;

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
      */
  } catch (e) {
    console.log(e);
  }
}

async function approveAmountIn(token1: Token, amountIn: bigint) {
  const ownerAddress = constants.wallet.address; // 代币拥有者的地址
  const spenderAddress = constants.UNISWAP_ROUTER_ADDRESS; // Router 合约地址
  const tokenContract = new ethers.Contract(
    token1.address,
    erc20abi,
    constants.wallet
  );
  // 检查当前的 allowance
  const currentAllowance = await tokenContract.allowance(
    ownerAddress,
    spenderAddress
  );

  const decimals = Number(await getDecimals(chainId, token1.address));
  logger.info(
    `Current Allowance: ${ethers.formatUnits(
      currentAllowance,
      decimals
    )} Require: ${ethers.formatUnits(amountIn, decimals)}`
  );

  // 如果当前的 allowance 小于要批准的数量，则进行批准
  if (currentAllowance < amountIn) {
    logger.info("Approving tokens...");
    const approveTx = await tokenContract.approve(
      spenderAddress,
      amountIn.toString()
    );
    await approveTx.wait(); // 等待交易确认
    logger.info("Approval transaction confirmed.");
  } else {
    logger.info("Sufficient allowance already granted.");
  }
}

function tradetest() {
  // const tokenAddress = "0xb60fdf036f2ad584f79525b5da76c5c531283a1b"; // NEMO
  // const tokenAddress = "0x132b96b1152bb6be197501e8220a74d3e63e4682"; // WUKONG
  const tokenAddress = "0x1121acc14c63f3c872bfca497d10926a6098aac5"; // DOGE
  // buyTokenMainnet(tokenAddress, "0.001");
  sellTokenMainnet(tokenAddress);
}

// tradetest();

export default {
  getMidPrice: getMidPrice,
  buyToken: buyTokenTest,
  sellToken: sellTokenTest,
  tradetest,
};
