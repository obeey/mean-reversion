import eth from "./src/utils/eth";
import logger from "./src/utils/logger";

const tokenAddress = "0x6db6fdb5182053eecec778afec95e0814172a474"; // FARM

let prevPriceNum: number = NaN;

setInterval(() => {
  eth.getMidPrice(tokenAddress).then(([tokenPrice, ethPrice]) => {
    const curNum = Number(ethPrice);

    if (Number.isNaN(prevPriceNum)) {
      prevPriceNum = curNum;
      return;
    }

    // const preNum = Number(prevPrice);

    if (curNum >= prevPriceNum) {
      prevPriceNum = curNum;
      return;
    }

    const downPercent = (prevPriceNum - curNum) / prevPriceNum;

    if (downPercent >= 0.1) {
      logger.info(`${tokenPrice} ${ethPrice} ${downPercent}`);
    }

    prevPriceNum = curNum;
  });
}, 12000 * 6);
