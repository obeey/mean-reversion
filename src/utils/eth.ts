import fs from "fs";
import { Pair, Route, Trade } from "@uniswap/v2-sdk";
import {
  ChainId,
  Token,
  CurrencyAmount,
  TradeType,
  Percent,
} from "@uniswap/sdk-core";
import { ethers } from "ethers";
import poolabi from "../abi/uniswap-pool.abi.json" assert { type: "json" };
import erc20abi from "../abi/erc20.abi.json" assert { type: "json" };
import constants from "../constants.js";
import logger from "./logger.js";
import helper from "./helper.js";

async function getDecimals(
  chainId: ChainId,
  tokenAddress: string
): Promise<number> {
  const tokenContract = new ethers.Contract(
    tokenAddress,
    erc20abi,
    constants.getProvider()
  );
  return tokenContract["decimals"]();
}

async function getReserves(token0: Token, token1: Token) {
  const pairAddress = Pair.getAddress(token0, token1);

  const pairContract = new ethers.Contract(
    pairAddress,
    poolabi,
    constants.getProvider()
  );

  return pairContract["getReserves"]();
}

async function createPair(token0: Token, token1: Token): Promise<Pair> {
  const [reserve0, reserve1] = await getReserves(token0, token1);

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

async function getPoolEthWei(tokenAddress: string): Promise<bigint> {
  const token0 = constants.WETH;
  const decimals = Number(await getDecimals(constants.chainId, tokenAddress));
  const token1 = new Token(constants.chainId, tokenAddress, decimals);

  // console.log(`getMaxTradeEth ${token0.symbol} ${tokenAddress}`);
  const [reserve0, reserve1]: [bigint, bigint] = await getReserves(
    token0,
    token1
  );

  const reserve = token0.sortsBefore(token1) ? reserve0 : reserve1;
  return reserve;
}

async function getPoolEth(tokenAddress: string): Promise<Number> {
  const wei = BigInt(await getPoolEthWei(tokenAddress));
  const ethStr = ethers.formatEther(wei);
  const ethAmount = Number(ethStr);
  return ethAmount;
}

async function getMaxTradeEth(tokenAddress: string): Promise<string> {
  const reserve = await getPoolEthWei(tokenAddress);

  const wei = reserve / BigInt(constants.TRADE_RAISE_PERCENT_DIVISOR);
  const eth = ethers.formatEther(wei);
  // console.log(`wei ${wei} eth ${eth}`);

  return eth;
}

async function getMidPrice(tokenAddress: string): Promise<[string, string]> {
  const decimals = Number(await getDecimals(constants.chainId, tokenAddress));
  // console.log(`decimals ${decimals} ${typeof(decimals)}`)

  const token = new Token(constants.chainId, tokenAddress, decimals);

  const pair = await createPair(token, constants.WETH);

  const route = new Route([pair], constants.WETH, token);

  /*
  console.log(route.midPrice.toSignificant(6)) // 1901.08
  console.log(route.midPrice.invert().toSignificant(6))
  */

  return [
    route.midPrice.toSignificant(6),
    route.midPrice.invert().toSignificant(6),
  ];
}

// Uniswap V2 Router 合约地址
const UNISWAP_V2_ROUTER_ADDRESS = constants.UNISWAP_ROUTER_ADDRESS; // Uniswap V2 Router地址
const router = new ethers.Contract(
  UNISWAP_V2_ROUTER_ADDRESS,
  [
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
    "function WETH() external pure returns (address)",
  ],
  constants.getWallet()
);

async function calculateAmountOutMin(
  tokenAddress: string,
  amountInETH: number,
  slippage: number
): Promise<ethers.BigNumberish> {
  // 获取路径
  const path = [await router.WETH(), tokenAddress];

  // 获取可以得到的代币数量
  const amountsOut = await router.getAmountsOut(
    ethers.parseEther(amountInETH.toString()),
    path
  );

  // amountsOut[1] 是你能得到的代币数量
  const amountOut = ethers.getBigInt(amountsOut[1]);

  // 根据滑点计算最小输出数量
  const slippageAmount =
    (amountOut * ethers.getBigInt(1000 - slippage * 10)) /
    ethers.getBigInt(1000);
  return slippageAmount; // 返回最小输出数量
}

async function buyTokenMainnet(
  tokenAddress: string,
  amountInETH: number,
  slippage: number = 0.5
): Promise<string> {
  const wallet = constants.getWallet();

  const amountInWei = ethers.parseEther(amountInETH.toString());
  const balanceWei = await getEthBalance();
  if (amountInWei >= balanceWei) {
    logger.error(
      `B ETH not enough. Except: ${amountInWei} Have: ${balanceWei}`
    );
    return "0";
  }

  const amountOutMin = await calculateAmountOutMin(
    tokenAddress,
    amountInETH,
    slippage
  );
  const path = [await router.WETH(), tokenAddress]; // ETH -> 代币
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 截止时间为20分钟后

  const tx = await router.swapExactETHForTokens(
    amountOutMin,
    path,
    wallet.address,
    deadline,
    {
      value: ethers.parseEther(amountInETH.toString()),
      gasLimit: 178775,
    }
  );

  logger.info(`Buy transaction hash: ${tx.hash}`);

  const reciept = await tx.wait();
  const gasUsed = ethers.getBigInt(reciept.gasUsed);
  const gasPrice = ethers.getBigInt(reciept.gasPrice);
  const transactionFee = ethers.formatUnits(gasUsed * gasPrice); // ETH string
  logger.info(`Buy confirmed! Fee ${transactionFee}`);

  return transactionFee;
}

async function sellTokenMainnet(
  tokenAddress: string,
  slippage: number = 0.5
): Promise<string> {
  const wallet = constants.getWallet();

  const amountIn = await getErc20Balanceof(tokenAddress);
  // console.log(`typeof balanceOf return ${typeof amountIn}`);
  if (amountIn === undefined || amountIn === ethers.getBigInt(0)) {
    logger.error(`S No token in account`);
    return "0";
  }

  const path = [tokenAddress, await router.WETH()]; // 代币 -> ETH
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 截止时间为20分钟后

  // 获取可以得到的 ETH 数量
  const amountsOut = await router.getAmountsOut(amountIn, path);
  const amountOut = ethers.getBigInt(amountsOut[1]);

  // 根据滑点计算最小输出数量
  const slippageAmount =
    (amountOut * ethers.getBigInt(1000 - slippage * 10)) /
    ethers.getBigInt(1000);

  // 先授权 Uniswap Router 合约
  /*
  const tokenContract = new ethers.Contract(
    tokenAddress,
    ["function approve(address spender, uint256 amount) public returns (bool)"],
    wallet
  );

  const approvalTx = await tokenContract.approve(
    UNISWAP_V2_ROUTER_ADDRESS,
    amountIn
  );
  await approvalTx.wait();
  */

  const decimals = Number(await getDecimals(constants.chainId, tokenAddress));
  const token = new Token(constants.chainId, tokenAddress, decimals);
  await approveAmountIn(token, amountIn);

  // 执行卖出交易
  const tx = await router.swapExactTokensForETH(
    amountIn,
    slippageAmount,
    path,
    wallet.address,
    deadline,
    {
      gasLimit: 200000, // 根据需要设置
    }
  );

  logger.info(`Sell transaction hash: ${tx.hash}`);

  const reciept = await tx.wait();
  logger.info(`gasUsed ${reciept.gasUsed} gasPrice ${reciept.gasPrice}`);
  const gasUsed = ethers.getBigInt(reciept.gasUsed);
  const gasPrice = ethers.getBigInt(reciept.gasPrice);
  const transactionFee = ethers.formatUnits(gasUsed * gasPrice); // ETH string
  logger.info(`Sell confirmed! Fee ${transactionFee}ETH`);

  return transactionFee;
}

/**
 *
 * @param tokenAddress
 * @param amountInETH
 * @returns GasUsed
 */
/*
async function buyTokenMainnet(
  tokenAddress: string,
  amountInETH: string
): Promise<string> {
  const amountInWei = ethers.parseEther(amountInETH);
  const balanceWei = await getEthBalance();
  if (amountInWei >= balanceWei) {
    logger.error(
      `B ETH not enough. Except: ${amountInWei} Have: ${balanceWei}`
    );
    return "0";
  }

  const decimals = Number(await getDecimals(constants.chainId, tokenAddress));
  const token = new Token(constants.chainId, tokenAddress, decimals);

  try {
    const txn = await swapTokens(token, constants.WETH, amountInETH);
    const reciept = await txn.wait();
    const gasUsed = ethers.getBigInt(reciept.gasUsed);
    const gasPrice = ethers.getBigInt(txn.gasPrice);
    const transactionFee = ethers.formatUnits(gasUsed * gasPrice); // ETH string

    console.log(
      `Buy Transaction sent: hash: ${reciept.hash} BN: ${reciept.blockNumber} transactionFee: ${transactionFee}`
    );
    return transactionFee;
  } catch (error) {
    logger.error(`B ${error}`);
    return buyTokenMainnet(tokenAddress, amountInETH);
  }
}

async function sellTokenMainnet(tokenAddress: string): Promise<string> {
  const amountIn = await getErc20Balanceof(tokenAddress);
  if (amountIn === undefined || amountIn === "" || amountIn === "0") {
    logger.error(`S No token in account`);
    return "0";
  }

  const decimals = Number(await getDecimals(constants.chainId, tokenAddress));
  const token = new Token(constants.chainId, tokenAddress, decimals);

  try {
    const txn = await swapTokens(
      constants.WETH,
      token,
      ethers.formatUnits(amountIn, decimals)
    );
    const reciept = await txn.wait();
    const gasUsed = ethers.getBigInt(reciept.gasUsed);
    const gasPrice = ethers.getBigInt(txn.gasPrice);
    const transactionFee = ethers.formatUnits(gasUsed * gasPrice); // ETH string

    console.log(
      `Sell Transaction sent: ${reciept.hash} BN: ${reciept.blockNumber} transactionFee: ${transactionFee}`
    );
    return transactionFee;
  } catch (error) {
    logger.error(`S: ${error}`);
    // return sellTokenMainnet(tokenAddress);
  }

  return "0";
}
*/

async function updateGasFee(gasUsed: bigint): Promise<string> {
  const gasPrice = (await constants.getProvider().getFeeData().catch())
    .gasPrice;
  if (null == gasPrice) {
    logger.error("B Get gasPrice failed.");
    return "0";
  }
  const transactionFee = gasPrice * gasUsed;
  const feeETH = ethers.formatEther(transactionFee.toString());
  logger.info(`Gas used ${feeETH} ETH`);
  helper.subProfile(Number(feeETH));

  return feeETH;
}

async function buyTokenTest(
  tokenAddress: string,
  amountIn: number
): Promise<string> {
  const GAS_USED = 145832;
  return updateGasFee(BigInt(GAS_USED));
}
async function sellTokenTest(tokenAddress: string): Promise<string> {
  const GAS_USED = 197554;
  return updateGasFee(BigInt(GAS_USED));
}

function getErc20Contract(tokenAddress: string) {
  const tokenAbi = fs.readFileSync("src/abi/erc20.abi.json").toString();
  const tokenContract = new ethers.Contract(
    tokenAddress,
    tokenAbi,
    constants.getProvider()
  );

  return tokenContract;
}

/*
 * @return - wei
 */
async function getErc20Balanceof(tokenAddress: string): Promise<bigint> {
  return getErc20Contract(tokenAddress).balanceOf(
    constants.getWallet().address
  );
}

/*
 * @return - wei
 */
function getEthBalance() {
  return constants
    .getProvider()
    .getBalance(constants.getWallet().address)
    .catch();
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
      constants.getProvider()
    ); //creating instances of a pair
    // const route = new Route([pair], token, WETH9[ChainId.MAINNET]);
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
    // console.log(`T0: ${token0} T1: ${token1}`);
    const pair = await createPair(token0, token1);

    const route = new Route([pair], token1, token0);

    const amountIn = ethers.parseEther(amount); //helper function to convert ETH to Wei
    const amountInWeiStr = amountIn.toString();
    logger.info(`Amount in ${amount} ETH ${amountInWeiStr} wei`);

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
    const to = constants.getWallet().address; // should be a checksummed recipient address
    const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from the current Unix time
    const value = trade.inputAmount.quotient; // // needs to be converted to e.g. hex
    const valueHex = ethers.toBeHex(value.toString());

    let ret;
    if (token0 === constants.WETH) {
      logger.info(`swapExactTokensForETH`);

      await approveAmountIn(token1, amountIn);

      const gasLimit = ethers.hexlify(new Uint8Array([0x3, 0x96, 0x4c])); // 设定 gas 限制
      let gasPrice = (await constants.getProvider().getFeeData()).gasPrice;
      if (gasPrice) gasPrice += BigInt(300000000); // wei(0.1GWEI)

      ret = constants.UNISWAP_ROUTER_CONTRACT.swapExactTokensForETH(
        valueHex,
        amountOutMinHex,
        path,
        to,
        deadline,
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice,
        }
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
    let sendTxn = (await constants.getWallet()).sendTransaction(rawTxn);
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
  const ownerAddress = constants.getWallet().address; // 代币拥有者的地址
  const spenderAddress = constants.UNISWAP_ROUTER_ADDRESS; // Router 合约地址
  const tokenContract = new ethers.Contract(
    token1.address,
    erc20abi,
    constants.getWallet()
  );
  // 检查当前的 allowance
  const currentAllowance = await tokenContract.allowance(
    ownerAddress,
    spenderAddress
  );

  const decimals = Number(await getDecimals(constants.chainId, token1.address));
  logger.info(
    `Current Allowance: ${ethers.formatUnits(
      currentAllowance,
      decimals
    )} Require: ${ethers.formatUnits(amountIn, decimals)}`
  );

  // 如果当前的 allowance 小于要批准的数量，则进行批准
  if (currentAllowance < amountIn) {
    logger.info(
      `Approving tokens... Current Allowance ${currentAllowance} AmountIn ${amountIn}`
    );
    const approveTx = await tokenContract.approve(
      spenderAddress,
      (amountIn * BigInt(10000)).toString()
    );
    await approveTx.wait(); // 等待交易确认
    logger.info("Approval transaction confirmed.");
  } else {
    logger.info("Sufficient allowance already granted.");
  }
}

async function tradetest() {
  const tokenAddress = "0x28561b8a2360f463011c16b6cc0b0cbef8dbbcad"; // MOODENG

  buyTokenMainnet(tokenAddress, 0.01)
    .then((buyFeeUsed) => {
      console.log(`Buy gas fee ${buyFeeUsed}`);
      sellTokenMainnet(tokenAddress)
        .then((sellFeeUsed) => {
          console.log(`Sell gas fee ${sellFeeUsed}`);
        })
        .catch((err) => {
          console.error(`Sell ${err}`);
        });
    })
    .catch((err) => {
      console.error(`Buy ${err}`);
    });

  /*
  sellTokenMainnet(tokenAddress)
    .then((sellGasUsed) => {
      console.log(`Sell gas ${sellGasUsed}`);
    })
    .catch((err) => {
      console.error(`Sell ${err}`);
    });
   */
}

// tradetest();
// buyTokenTest("", "");
// sellTokenTest("");

export default {
  getMidPrice: getMidPrice,
  buyToken: buyTokenMainnet,
  sellToken: sellTokenMainnet,
  // buyToken: buyTokenTest,
  // sellToken: sellTokenTest,
  getEthBalance,
  getPoolEthWei,
  getPoolEth,
  getMaxTradeEth,
  tradetest,
};
