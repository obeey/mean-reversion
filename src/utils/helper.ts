import fs from "fs";
import readline from "readline";
import logger from "./logger.js";
import tokens from "../tokens.js";
import { Token } from "../token.js";
import constants from "../constants.js";
import eth from "./eth.js";
import { ethers } from "ethers";
import { error } from "console";

let profile: number = constants.INIT_PROFILE;

function calcPrice(token: Token): boolean {
  const MA = constants.MA;

  const historyPrice = token.historyPrice;

  if (!historyPrice || historyPrice.length < 2) {
    token.pricePercent.push(NaN);
    token.pricePercentMa.push(NaN);
    return false;
  }

  const lastIdx = historyPrice.length - 1;
  const curPrice = historyPrice[lastIdx];
  const prePrice = historyPrice[lastIdx - 1];
  const curDownPercent = (curPrice - prePrice) / prePrice;
  token.pricePercent.push(curDownPercent);
  if (token.pricePercent.length > constants.MAX_HISTORY_PRICE_LEN) {
    token.pricePercent.shift();
  }

  if (!historyPrice || historyPrice.length < MA + 2) {
    logger.debug("B history too short");
    token.pricePercentMa.push(NaN);

    return false;
  }

  let sum = 0;
  let i;
  const array = token.pricePercent;
  for (i = 0; i < MA; i++) {
    sum += array[lastIdx - i];
  }
  const curPricePercentMa = sum / MA;
  token.pricePercentMa.push(curPricePercentMa);
  if (token.pricePercentMa.length > constants.MAX_HISTORY_PRICE_LEN) {
    token.pricePercentMa.shift();
  }

  return true;
}

function getHighPriceAndNum(token: Token): [highPrice: number, num: number] {
  let idx = token.pricePercentMa.length - 1;
  const lastMa = token.pricePercentMa[idx];
  let curPriceMa = lastMa;
  let prePriceMa = token.pricePercentMa[idx - 1];
  while (idx > 1 && prePriceMa > curPriceMa) {
    idx -= 1;
    curPriceMa = prePriceMa;
    prePriceMa = token.pricePercentMa[idx - 1];
  }
  idx = idx >= constants.MA - 1 ? idx - (constants.MA - 1) : 0;

  const downNum = token.historyPrice.length - idx;
  const highPriceRecent = Math.max(...token.historyPrice.slice(-downNum));

  return [highPriceRecent, downNum];
}

function mapValue(x: number): number {
  const x1 = 50;
  const y1 = 0.15;
  const x2 = 2000;
  const y2 = 0.05;

  if (x < x1) {
    return y1; // 小于 50 的情况
  } else if (x > x2) {
    return y2; // 大于 2000 的情况
  } else {
    // 线性插值
    return y1 + ((y2 - y1) / (x2 - x1)) * (x - x1);
  }
}

function canBuy(token: Token): boolean {
  /*
  const calcPriceOk = calcPrice(token);
  if (!calcPriceOk) {
    return false;
  }
  */

  const curDownPercent = token.pricePercent[token.pricePercent.length - 1];
  // 单区块下跌
  const downPercentThrehold = mapValue(token.poolETH);
  if (curDownPercent < -downPercentThrehold) {
    logger.warn(
      `B current down ${(curDownPercent * 100).toFixed(4)}% Threshold ${(
        downPercentThrehold * 100
      ).toFixed(4)}%`
    );
    return true;
  }

  const newestPrice = token.historyPrice[token.historyPrice.length - 1];
  /*
  const [highPriceRecent, downNum] = getHighPriceAndNum(token);
  if (downNum > 0) {
    const continuseDownPercentAvg =
      (highPriceRecent - newestPrice) / newestPrice / downNum;
    logger.debug(
      `B continuse down -${(continuseDownPercentAvg * 100).toFixed(
        4
      )}% down number ${downNum}`
    );
    if (continuseDownPercentAvg > 0.03 && downNum > 3) {
      logger.warn(
        `B continuse down -${(continuseDownPercentAvg * 100).toFixed(
          4
        )}% down number ${downNum}`
      );
      return true;
    }
  }
  */

  const recentHistoryPrice = token.historyPrice.slice(
    -constants.RECENT_HISTORY_PRICE_LEN
  );
  const highPrice = Math.max(...recentHistoryPrice);
  const lowPrice = Math.min(...recentHistoryPrice);
  const deltaPrice = highPrice - lowPrice;
  const downPercent = deltaPrice / highPrice;
  const curRaisePercent = (newestPrice - lowPrice) / lowPrice;

  // const variance = calculateVariance(token.pricePercent.slice(-5)) * 10000;

  const idx = token.pricePercentMa.length - 1;
  const lastMa = token.pricePercentMa[idx];
  logger.debug(
    `B H ${highPrice} L ${lowPrice} -${(downPercent * 100).toFixed(4)}% U ${(
      curDownPercent * 100
    ).toFixed(4)}% MA ${lastMa} Threshold ${(downPercentThrehold * 100).toFixed(
      4
    )}%`
  );

  //  1. 当前价格没有上涨太多；2. 价格下降幅度够大；3. 最后价格上涨或者平稳；
  if (
    newestPrice > lowPrice &&
    curRaisePercent < 0.01 &&
    downPercent > constants.BUY_DOWN_PERCENT &&
    lastMa !== undefined &&
    lastMa > -0.01
  ) {
    logger.warn(
      `B rebound. down -${(downPercent * 100).toFixed(4)}% last MA ${lastMa}`
    );
    return true;
  }

  return false;
}

function canSell(token: Token): boolean {
  const historyPrice = token.historyPrice;
  const buyPrice = token.buyPrice;
  const highPrice = token.highPrice;
  const buyTimestamp = token.buyTimestamp;

  const diffSeconds = (Date.now() - buyTimestamp) / 1000;
  if (diffSeconds < 12) {
    return false;
  }

  if (diffSeconds > constants.MAX_TOKEN_HOLD_SECONDS) {
    logger.warn(`S ${token.name} hold to long: ${diffSeconds} seconds`);
    return true;
  }

  const newestPrice = historyPrice[historyPrice.length - 1];
  const profilePercent = (newestPrice - buyPrice) / buyPrice;
  const downPercentTotal = (highPrice - newestPrice) / highPrice;
  logger.debug(
    `S profit ${(profilePercent * 100).toFixed(4)}% D -${(
      downPercentTotal * 100
    ).toFixed(4)}%`
  );
  /*
  const lowPriceTotal = Math.min(...historyPrice);
  const downPercentTotal = (highPriceTotal - lowPriceTotal) / highPriceTotal;

  logger.debug(
    `S return ${(profilePercent * 100).toFixed(4)}% Large Down: ${(
      downPercentTotal * 100
    ).toFixed(4)}%`
  );

  if (profilePercent > downPercentTotal / 2) {
    logger.warn(
      `S Large return ${(profilePercent * 100).toFixed(4)}% Large Down: ${(
        downPercentTotal * 100
      ).toFixed(4)}%`
    );
    return true;
  }
  */

  if (downPercentTotal > constants.STOP_LOSS) {
    logger.warn(
      `S profit ${(profilePercent * 100).toFixed(4)}% D -${(
        downPercentTotal * 100
      ).toFixed(4)}%`
    );
    return true;
  }

  /*
  const deltaPrice = highPrice - newestPrice;
  const downPercent = deltaPrice / highPrice;

  if (historyPrice.length < constants.RECENT_HISTORY_PRICE_LEN) {
    // Down too much.
    if (downPercent > constants.STOP_LOSS) {
      logger.warn(`S down too much ${(downPercent * 100).toFixed(4)}%`);
      return true;
    }
    return false;
  }

  logger.debug(`S H ${highPrice} L ${newestPrice} -${downPercent * 100}%`);
  if (downPercent > 0.01 && profilePercent > 0) {
    logger.warn(
      `S start down ${(downPercent * 100).toFixed(4)}% and profit positive ${(
        profilePercent * 100
      ).toFixed(4)}%.`
    );
    return true;
  }

  const priceDifferences = historyPrice
    .slice(-5)
    .map((price, index, array) => {
      if (index === 0) return null;
      const prevPrice = array[index - 1];
      return price - prevPrice;
    })
    .filter((diff) => diff !== null);

  const priceVariance = calculateVariance(historyPrice.slice(-5)) * 10000;
  logger.debug(
    `S Price Variance: ${priceVariance} ${(profilePercent * 100).toFixed(4)}%`
  );
  if ((profilePercent > 0.03 && priceVariance < 5) || profilePercent > 0.05) {
    logger.warn(
      `S rebound ${(profilePercent * 100).toFixed(
        4
      )}% or variance ${priceVariance} low.`
    );
    return true;
  }
  */

  return false;
}

function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  // 计算平均值
  const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;

  // 计算每个元素与平均值的差的平方，并求平均
  const variance =
    numbers.reduce((sum, value) => {
      const diff = value - mean;
      return sum + diff * diff;
    }, 0) / numbers.length;

  return Math.sqrt(variance);
}

/**
 *
 * @returns 赔率
 */
function getOdds() {
  return constants.ODDS;
}

/**
 *
 * @param b - 赔率
 * @param p - 胜率
 * @returns
 */
function getKelly(b: number, p: number): number {
  return (b * p - (1 - p)) / b;
}

async function getInitProfileTest() {
  return constants.INIT_PROFILE;
}

async function getInitProfileMamiNet() {
  return Number(ethers.formatEther(await eth.getEthBalance()));
}

async function getProfileTest() {
  return profile;
}

async function getProfileMainnet() {
  return Number(ethers.formatEther(await eth.getEthBalance()));
}

function addProfileTest(delta: number) {
  if (!Number.isNaN(delta)) {
    profile += delta;
  }
}

function subProfileTest(delta: number) {
  if (!Number.isNaN(delta)) {
    profile -= delta;
  }
}

function addProfileMainnet(delta: number) {}

function subProfileMainnet(delta: number) {}

async function getBuyAmountTest(token: Token): Promise<bigint> {
  try {
    if (Number.isNaN(token.decimals)) {
      token.decimals = await eth.getDecimals(constants.chainId, token.address);
    }

    const decimals = token.decimals;
    return ethers.parseUnits(token.buyAmount.toFixed(decimals), decimals);
  } catch (error) {
    logger.error(`getBuyAmountTest failed: ${error}`);
    return 0n;
  }
}

/*
function buyAmountTest() {
  const token: Token = {
    name: "KLAUS",
    address: "0xb612bfc5ce2fb1337bd29f5af24ca85dbb181ce2",
    buyTimestamp: NaN,
    historyPrice: [],
    buyPrice: NaN,
    highPrice: NaN,
    buyAmount: 38255.95608911452,
    buyEthCost: 0,
    buyGasUsed: 0,
    sellGasUsed: 0,
    sellPending: false,
    buyPending: false,
    profit: 0,
    tradeWin: 28,
    tradeCount: 33,
  };

  getBuyAmountTest(token).then((amount) => {
    console.log(amount);
  });
}
buyAmountTest();
*/

async function getBuyAmountMainnet(token: Token): Promise<bigint> {
  return eth.getErc20Balanceof(token.address);
}

interface UrlResponseTime {
  url: string;
  responseTime: number;
}

function fetchBestProviderByDelay() {
  getAllProvider().then(async (providers) => {
    const results = await Promise.all(
      providers.map((url) => sendPostRequestAndMeasureTime(url))
    );
    results.sort((a, b) => a.responseTime - b.responseTime);
    let result = results[0];
    logger.info(`O ${constants.getRpcProviderLink()} N ${result.url}`);

    // 下次轮到另一个 provider
    if (result.url === constants.getRpcProviderLink()) {
      result = results[1];
    }
    const newProvider = result.url;
    constants.setProvider(newProvider);
    logger.info(
      `Set provider to ${newProvider} ${result.responseTime.toFixed(2)}ms`
    );
  });
}

function fetchBestProviderByRandom() {
  getAllProvider()
    .then(async (providers) => {
      const newProvider = providers[getRandomInt(0, providers.length)];
      constants.setProvider(newProvider);
      logger.info(`Set provider to ${newProvider}`);
    })
    .catch((error) => {
      logger.error(error);
    });
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

async function getAllProvider(): Promise<string[]> {
  let providers: string[] = [];

  const fileStream = fs.createReadStream("src/utils/providers.txt");

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const url of rl) {
    providers.push(url);
  }

  return providers;
}

async function sendOptionsAndMeasureTime(url: string): Promise<number> {
  const startTime = performance.now(); // 记录开始时间

  try {
    const response = await fetch(url, {
      method: "OPTIONS", // 设置请求方法为 OPTIONS
    });

    const endTime = performance.now(); // 记录结束时间
    const responseTime = endTime - startTime; // 计算响应时间

    if (!response.ok) {
      throw new Error(`Failed to fetch. Status: ${response.status} ${url}`);
    }

    // console.log(`Response time: ${responseTime.toFixed(2)} ms`);
    return responseTime;
  } catch (error) {
    // console.error(`Error: ${error}`);
    throw error;
  }
}

async function sendPostRequestAndMeasureTime(
  url: string
): Promise<UrlResponseTime> {
  const requestBody = {
    jsonrpc: "2.0",
    method: "eth_getBlockByNumber",
    params: ["latest", false],
    id: 1,
  };

  const startTime = performance.now(); // 记录开始时间

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // 设置请求头，声明消息体为 JSON 格式
      },
      body: JSON.stringify(requestBody), // 将消息体序列化为 JSON 字符串
    });

    const endTime = performance.now(); // 记录结束时间
    let responseTime = endTime - startTime; // 计算响应时间

    // const jsonResponse = await response.json(); // 解析响应数据为 JSON

    if (!response.ok) {
      logger.error(`Request failed with status ${response.status} ${url}`);
      responseTime += 1000;
    }

    // console.log("Response data:", jsonResponse); // 打印响应数据
    // console.log(`Response time: ${responseTime.toFixed(2)} ms`); // 打印响应时间

    return { url, responseTime };
  } catch (error) {
    logger.error(`Provider POST failed. ${url}`);

    const responseTime = 10000;
    return { url, responseTime };
    // throw error;
  }
}

const fetchBestProvider = fetchBestProviderByRandom;
// fetchBestProvider();
setInterval(() => fetchBestProvider(), 300000);

export default {
  canBuy,
  canSell,
  // getInitProfile: getInitProfileMamiNet,
  // getProfile: getProfileMainnet,
  // getBuyAmount: getBuyAmountMainnet,
  getInitProfile: getInitProfileTest,
  getProfile: getProfileTest,
  getBuyAmount: getBuyAmountTest,
  addProfile: addProfileTest,
  subProfile: subProfileTest,
  getOdds,
  getKelly,
  fetchBestProvider,
  calcPrice,
};
