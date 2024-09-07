export function canBuy(historyPrice: number[]): boolean {
  const MA = 3;

  if (!historyPrice || historyPrice.length < MA + 2) {
    return false;
  }

  const priceDifferences = historyPrice
    .map((price, index, array) => {
      if (index === 0) return null; // 第一个元素没有前一个元素
      return price - array[index - 1];
    })
    .filter((diff) => diff !== null); // 过滤掉 null 值

  const newest = priceDifferences.pop();
  if (!newest || 0 > newest) {
    return false;
  }

  const priceMa = priceDifferences
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

  const allLessThanOrEqualToZero = priceMa.every((num) => num <= 0);
  if (!allLessThanOrEqualToZero) {
    return false;
  }

  const highPrice = Math.max(...historyPrice);
  const lowPrice = Math.min(...historyPrice);
  const deltaPrice = highPrice - lowPrice;
  const downPercent = deltaPrice / highPrice;
  if (downPercent > 0.1) {
    return true;
  }

  return false;
}

export function canSell(historyPrice: number[]): boolean {
  const newestPrice = historyPrice[historyPrice.length - 1];
  const highPrice = Math.max(...historyPrice);
  const deltaPrice = highPrice - newestPrice;
  const downPercent = deltaPrice / highPrice;

  if (downPercent > 0.03) {
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
