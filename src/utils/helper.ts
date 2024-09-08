import logger from "./logger";

export function canBuy(historyPrice: number[]): boolean {
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

  const allZero = priceDifferencesPercent.every((num) => num === 0);
  if (allZero) {
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
  logger.debug(`B H ${highPrice} L ${lowPrice} -${downPercent * 100}%`);

  const lastMa = priceMa.pop();
  if (
    downPercent > 0.05 &&
    lastMa !== undefined &&
    Math.abs(lastMa) < 0.00003
  ) {
    return true;
  }

  return false;
}

export function canSell(historyPrice: number[]): boolean {
  const newestPrice = historyPrice[historyPrice.length - 1];
  const highPrice = Math.max(...historyPrice);
  const deltaPrice = highPrice - newestPrice;
  const downPercent = deltaPrice / highPrice;

  logger.debug(`S H ${highPrice} L ${newestPrice} -${downPercent * 100}%`);
  if (downPercent > 0.02) {
    return true;
  }

  return false;
}

function main() {
  const historyPrice = [
    100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 35,
  ];
  console.log(canBuy(historyPrice));
}

// main();
