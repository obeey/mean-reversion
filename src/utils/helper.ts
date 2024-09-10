import logger from "./logger";
import tokens from "../tokens";
import { Token } from "../token";
import constants from "../constants";

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
  if (profilePercent > 0.08) {
    logger.info(`S Large return ${(profilePercent * 100).toPrecision(4)}%`);
    return true;
  }

  const deltaPrice = highPrice - newestPrice;
  const downPercent = deltaPrice / highPrice;

  if (historyPrice.length < tokens.MAX_HISTORY_PRICE_LEN) {
    // Down too much.
    if (downPercent > 0.03) {
      return true;
    }
    return false;
  }

  logger.debug(`S H ${highPrice} L ${newestPrice} -${downPercent * 100}%`);
  if (downPercent > 0.01) {
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

function getInitProfileTest() {
  return constants.INIT_PROFILE;
}

function getProfileTest() {
  return profile;
}

function addProfileTest(delta: number) {
  profile += delta;
}

function subProfileTest(delta: number) {
  profile -= delta;
}

function addProfileMainnet(delta: number) {}

function subProfileMainnet(delta: number) {}

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
  getInitProfile: getInitProfileTest,
  getProfile: getProfileTest,
  addProfile: addProfileTest,
  subProfile: subProfileTest,
};
