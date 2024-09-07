import eth from "./src/utils/eth";
import logger from "./src/utils/logger";

const tokenAddress = "0x6db6fdb5182053eecec778afec95e0814172a474"; // FARM

let prevPriceNum: number = NaN;
let buyNum: number = 0;
let profile: number = 0.01;

function main() {
  logger.info("Starting profile...");

  setInterval(() => {
    eth.getMidPrice(tokenAddress).then(([tokenPrice, ethPrice]) => {
      const curNum = Number(ethPrice);
      if (Number.isNaN(prevPriceNum)) {
        prevPriceNum = curNum;
        return;
      }

      const downPercent = (curNum - prevPriceNum) / prevPriceNum;
      logger.info(`${tokenPrice} ${ethPrice} ${downPercent} `);

      // const preNum = Number(prevPrice);

      if (curNum >= prevPriceNum) {
        prevPriceNum = curNum;
        return;
      }

      if (downPercent >= 0.05 && buyNum > 0) {
        const returnProfile = (buyNum * curNum) / Number(tokenPrice);
        buyNum = 0;
        profile += returnProfile;
        logger.info(`S ${returnProfile} ${profile}`);
      }

      if (downPercent <= -0.1 && buyNum === 0) {
        const buyNum = Number(tokenPrice) / 100;
        profile -= 0.01;
        logger.info(`B ${buyNum} ${profile}`);
      }

      prevPriceNum = curNum;
    });
  }, 12000 * 6);
}

main();
