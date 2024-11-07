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
import { Token as MyToken } from "../token.js";

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

async function getPoolContract(tokenAddress: string): Promise<ethers.Contract> {
  const token0 = constants.WETH;
  const decimals = Number(await getDecimals(constants.chainId, tokenAddress));
  const token1 = new Token(constants.chainId, tokenAddress, decimals);
  const pairAddress = Pair.getAddress(token0, token1);

  const pairContract = new ethers.Contract(
    pairAddress,
    poolabi,
    constants.getProvider()
  );

  return pairContract;
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

async function getPoolEth(tokenAddress: string): Promise<number> {
  const wei = BigInt(await getPoolEthWei(tokenAddress));
  const ethStr = ethers.formatEther(wei);
  const ethAmount = Number(ethStr);
  return ethAmount;
}

function getMaxTradeEth(token: MyToken): number {
  return token.poolETH * constants.TRADE_POOL_ETH_PERCENT;
}

async function getRealPrice(
  myToken: MyToken
): Promise<[priceETH: number, reserveETH: number, reserveToken: number]> {
  const token0 = constants.WETH;
  // const decimals = Number(await getDecimals(constants.chainId, tokenAddress));
  const token1 = new Token(
    constants.chainId,
    myToken.address,
    myToken.decimals
  );

  const [reserve0, reserve1]: [bigint, bigint] = await myToken.poolContract[
    "getReserves"
  ]();

  const [reserveETH, reserveToken] = token0.sortsBefore(token1)
    ? [reserve0, reserve1]
    : [reserve1, reserve0];

  const eth = Number(reserveETH) / 10 ** 18;
  const token = Number(reserveToken) / 10 ** myToken.decimals;

  // console.log( `${tokenAddress} ETH: ${eth} token: ${token} decimal: ${decimals}`);

  return [eth / token, eth, token];
}
/**
 *  只能以 ETH 的价格表示，否则涨跌的方向是反的
 * @param tokenAddress token's address
 * @returns ETH price
 */
/*
async function getRealPrice(
  tokenAddress: string,
  decimals: number
): Promise<[priceETH: number, reserveETH: number, reserveToken: number]> {
  const token0 = constants.WETH;
  // const decimals = Number(await getDecimals(constants.chainId, tokenAddress));
  const token1 = new Token(constants.chainId, tokenAddress, decimals);

  const [reserve0, reserve1]: [bigint, bigint] = await getReserves(
    token0,
    token1
  );

  const [reserveETH, reserveToken] = token0.sortsBefore(token1)
    ? [reserve0, reserve1]
    : [reserve1, reserve0];

  const eth = Number(reserveETH) / 10 ** 18;
  const token = Number(reserveToken) / 10 ** decimals;

  // console.log( `${tokenAddress} ETH: ${eth} token: ${token} decimal: ${decimals}`);

  return [eth / token, eth, token];
}
*/

async function getMidPrice(
  tokenAddress: string,
  decimals: number
): Promise<[priceETH: number, reserveETH: number, reserveToken: number]> {
  // const decimals = Number(await getDecimals(constants.chainId, tokenAddress));
  // console.log(`decimals ${decimals} ${typeof(decimals)}`)

  const token = new Token(constants.chainId, tokenAddress, decimals);

  const pair = await createPair(token, constants.WETH);

  const route = new Route([pair], constants.WETH, token);

  return [Number(route.midPrice.invert().toSignificant(6)), 0, 0];
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
  slippage: number = 0.1
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

  let curGasPrice = (await constants.getProvider().getFeeData()).gasPrice;
  if (curGasPrice) curGasPrice += 3000000000n; // wei(1GWEI)

  const tx = await router.swapExactETHForTokens(
    amountOutMin,
    path,
    wallet.address,
    deadline,
    {
      value: ethers.parseEther(amountInETH.toString()),
      gasLimit: 178775,
      gasPrice: curGasPrice,
    }
  );

  logger.warn(`Buy tx: ${tx.hash}`);

  const reciept = await tx.wait();
  const gasUsed = ethers.getBigInt(reciept.gasUsed);
  const gasPrice = ethers.getBigInt(reciept.gasPrice);
  const transactionFee = ethers.formatUnits(gasUsed * gasPrice); // ETH string
  logger.warn(
    `Buy confirmed! Fee ${transactionFee}ETH gasUsed ${reciept.gasUsed} gasPrice ${reciept.gasPrice}`
  );

  return transactionFee;
}

async function sellTokenMainnet(
  tokenAddress: string,
  decimals: number,
  slippage: number = 0.1
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

  // const decimals = Number(await getDecimals(constants.chainId, tokenAddress));
  const token = new Token(constants.chainId, tokenAddress, decimals);
  await approveAmountIn(token, decimals, amountIn);

  let curGasPrice = (await constants.getProvider().getFeeData()).gasPrice;
  if (curGasPrice) curGasPrice += 3000000000n; // wei(1GWEI)

  // 执行卖出交易
  const tx = await router.swapExactTokensForETH(
    amountIn,
    slippageAmount,
    path,
    wallet.address,
    deadline,
    {
      gasLimit: 200000, // 根据需要设置
      gasPrice: curGasPrice,
    }
  );

  logger.warn(`Sell tx: ${tx.hash}`);

  const reciept = await tx.wait();

  const gasUsed = ethers.getBigInt(reciept.gasUsed);
  const gasPrice = ethers.getBigInt(reciept.gasPrice);
  const transactionFee = ethers.formatUnits(gasUsed * gasPrice); // ETH string
  logger.info(
    `Sell confirmed! Fee ${transactionFee}ETH gasUsed ${reciept.gasUsed} gasPrice ${reciept.gasPrice}`
  );

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

  const transactionFee = (gasPrice + 3000000000n) * gasUsed;
  const feeETH = ethers.formatEther(transactionFee.toString());
  logger.info(`Gas used ${feeETH} ETH`);
  helper.subProfile(Number(feeETH));

  return feeETH;
}

async function buyTokenTest(
  tokenAddress: string,
  amountIn: number
): Promise<string> {
  const balance = await helper.getProfile();

  if (amountIn >= balance) {
    throw Error(`Not enough money ${balance} buy ${amountIn} ${tokenAddress}`);
  }

  const GAS_USED = 145832;
  return updateGasFee(BigInt(GAS_USED));
}
async function sellTokenTest(
  tokenAddress: string,
  decimals: number
): Promise<string> {
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
/*
async function swapTokens(
  token0: Token,
  token1: Token,
  amount: string,
  slippage = "50"
) {
  try {
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
  } catch (e) {
    console.log(e);
  }
}
*/

async function approveAmountIn(
  token1: Token,
  decimals: number,
  amountIn: bigint
) {
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

  // const decimals = Number(await getDecimals(constants.chainId, token1.address));
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

// 创建工厂合约实例
const factoryContract = new ethers.Contract(
  constants.UNISWAP_V2_FACTORY_ADDRESS,
  [
    "event PairCreated(address indexed token0, address indexed token1, address pair, uint)",
    "function getPair(address tokenA, address tokenB) view returns (address)",
  ],
  constants.getProvider()
);

// 获取创建时间
async function getPairCreationTime(tokenAddress: string) {
  const provider = constants.getProvider();
  const wethAddress = constants.WETH.address; // WETH 地址

  // 获取与 Token 相关的 Pair 地址
  const pairAddress = await factoryContract.getPair(tokenAddress, wethAddress);

  if (pairAddress === ethers.ZeroAddress) {
    console.log("Pair does not exist for this token.");
    return;
  }

  const blockNumber = await provider.getBlockNumber();

  const batchSize = 2000; // 设置每次请求的区块数量

  for (let i = 0; i < (7 * 24 * 3600) / 12; i += batchSize) {
    const fromBlock = blockNumber - (i + batchSize);
    const toBlock = blockNumber - i;

    const filter = factoryContract.filters.PairCreated(null, null, null);

    const logEvents = await provider.getLogs({
      fromBlock,
      toBlock,
      address: constants.UNISWAP_V2_FACTORY_ADDRESS,
      topics: await filter.getTopicFilter(),
    });

    // 在 events 中找到创建该 Pair 的事件
    const pairCreatedEvent = logEvents.find((event) => {
      const decoded = factoryContract.interface.decodeEventLog(
        "PairCreated",
        event.data,
        event.topics
      );
      return decoded.pair.toLowerCase() === pairAddress.toLowerCase();
    });

    if (pairCreatedEvent) {
      const block = await provider.getBlock(pairCreatedEvent.blockNumber);
      return block?.timestamp;
    }
  }

  logger.info(`No PairCreated event found for ${tokenAddress}.`);
}

async function getPairCreationTimeTest() {
  const timestamp = await getPairCreationTime(
    "0x5200b34e6a519f289f5258de4554ebd3db12e822"
  );
  if (timestamp)
    logger.info(`Pair created at: ${new Date(timestamp * 1000).toISOString()}`);
  else logger.info("token create loog loog ago.");
}

// getPairCreationTimeTest();

async function tradetest() {
  const tokenAddress = "0x28561b8a2360f463011c16b6cc0b0cbef8dbbcad"; // MOODENG

  buyTokenMainnet(tokenAddress, 0.01)
    .then((buyFeeUsed) => {
      console.log(`Buy gas fee ${buyFeeUsed}`);
      sellTokenMainnet(tokenAddress, 9)
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
  getPrice: getRealPrice,
  buyToken: buyTokenMainnet,
  sellToken: sellTokenMainnet,
  // buyToken: buyTokenTest,
  // sellToken: sellTokenTest,
  getEthBalance,
  getErc20Balanceof,
  getPoolEthWei,
  getPoolEth,
  getMaxTradeEth,
  getDecimals,
  getPoolContract,
  getPairCreationTime,
};
