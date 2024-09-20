import fs from "fs";
import readline from "readline";
import logger from "./logger.js";
import tokens from "../tokens.js";
import { Token } from "../token.js";
import constants from "../constants.js";
import eth from "./eth.js";
import { ethers } from "ethers";

let profile: number = constants.INIT_PROFILE;

function canBuy(historyPrice: number[]): boolean {
  const MA = 5;

  if (!historyPrice || historyPrice.length < MA + 2) {
    logger.debug("B history too short");

    return false;
  }

  const priceDifferencesPercent = historyPrice
    .map((price, index, array) => {
      if (index === 0) return null; // 第一个元素没有前一个元素
      const prevPrice = array[index - 1];
      return (price - prevPrice) / prevPrice;
    })
    .filter((diff) => diff !== null); // 过滤掉 null 值

  /*
  const newest = priceDifferences.pop();
  if (newest === undefined || 0 > newest) {
    logger.debug(`B Continue down ${newest}`);
    return false;
  }
    */

  logger.debug(`B Diff: ${priceDifferencesPercent}`);

  const allLargerOrEqualZero = priceDifferencesPercent.every((num) => num >= 0);
  if (allLargerOrEqualZero) {
    return false;
  }

  const priceMa = priceDifferencesPercent
    .map((priceDiff, index, array) => {
      if (index < MA) return null;
      let sum = 0;
      let i;
      for (i = 0; i < MA; i++) {
        sum += array[index - i];
      }
      return sum / MA;
    })
    .filter((diff) => diff !== null); // 过滤掉 null 值

  logger.debug(`B MA: ${priceMa}`);

  const allLessThanOrEqualToZero = priceMa.every((num) => num <= 0);
  if (!allLessThanOrEqualToZero) {
    return false;
  }

  const highPrice = Math.max(...historyPrice);
  const lowPrice = Math.min(...historyPrice);
  const deltaPrice = highPrice - lowPrice;
  const downPercent = deltaPrice / highPrice;

  const lastMa = priceMa.pop();
  const variance = calculateVariance(priceDifferencesPercent.slice(-5));

  logger.debug(
    `B H ${highPrice} L ${lowPrice} -${(downPercent * 100).toPrecision(
      4
    )}% ${variance}`
  );
  if (
    downPercent > 0.05 &&
    ((lastMa !== undefined && lastMa > 0.005) || variance < 1)
  ) {
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
  if (diffSeconds > constants.MAX_TOKEN_HOLD_SECONDS) {
    logger.info(`S ${token.name} hold to long: ${diffSeconds} seconds`);
    return true;
  }

  const newestPrice = historyPrice[historyPrice.length - 1];

  const profilePercent = (newestPrice - buyPrice) / buyPrice;
  if (profilePercent > constants.TAKE_PROFIT) {
    logger.info(`S Large return ${(profilePercent * 100).toPrecision(4)}%`);
    return true;
  }

  if (profilePercent + constants.STOP_LOSS < 0) {
    logger.info(`S Large LOSS ${(profilePercent * 100).toPrecision(4)}%`);
    return true;
  }

  const deltaPrice = highPrice - newestPrice;
  const downPercent = deltaPrice / highPrice;

  if (historyPrice.length < constants.MAX_HISTORY_PRICE_LEN) {
    // Down too much.
    if (downPercent > constants.STOP_LOSS) {
      return true;
    }
    return false;
  }

  logger.debug(`S H ${highPrice} L ${newestPrice} -${downPercent * 100}%`);
  if (downPercent > 0.01 && profilePercent > 0) {
    return true;
  }

  const priceDifferences = historyPrice
    .map((price, index, array) => {
      if (index === 0) return null;
      const prevPrice = array[index - 1];
      return price - prevPrice;
    })
    .filter((diff) => diff !== null);

  const priceVariance = calculateVariance(priceDifferences);
  logger.debug(
    `S Price Variance: ${priceVariance} ${(profilePercent * 100).toPrecision(
      4
    )}%`
  );
  if ((profilePercent > 0.01 && priceVariance < 1) || profilePercent > 0.05) {
    return true;
  }

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

  return variance;
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
  profile += delta;
}

function subProfileTest(delta: number) {
  profile -= delta;
}

function addProfileMainnet(delta: number) {}

function subProfileMainnet(delta: number) {}

interface UrlResponseTime {
  url: string;
  responseTime: number;
}

/*
function fetchBestProvider() {
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
*/

function fetchBestProvider() {
  getAllProvider().then(async (providers) => {
    const newProvider = providers[getRandomInt(0, providers.length)];
    constants.setProvider(newProvider);
    logger.info(`Set provider to ${newProvider}`);
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

// fetchBestProvider();
setInterval(() => fetchBestProvider(), 300000);

function main() {
  const historyPrice = [
    100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 35,
  ];
  console.log(canBuy(historyPrice));
}

// main();

export default {
  canBuy,
  canSell,
  // getInitProfile: getInitProfileMamiNet,
  // getProfile: getProfileMainnet,
  getInitProfile: getInitProfileTest,
  getProfile: getProfileTest,
  addProfile: addProfileTest,
  subProfile: subProfileTest,
  getOdds,
  getKelly,
};
