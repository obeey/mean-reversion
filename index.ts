import eth from "./src/utils/eth";
import logger from "./src/utils/logger";
import tokens from "./src/tokens";

let profile: number = 0.01;

function main() {
  logger.info("Starting profile...");

  setInterval(() => {
    tokens.forEach((token) => {
      logger.info(
        `${token.name} ${token.address} $${token.prevPrice} ${token.buyAmount}`
      );

      eth.getMidPrice(token.address).then(([tokenPrice, ethPrice]) => {
        const curNum = Number(ethPrice);
        if (Number.isNaN(token.prevPrice)) {
          token.prevPrice = curNum;
          return;
        }

        const downPercent = (curNum - token.prevPrice) / token.prevPrice;
        logger.info(`${token.name} ${tokenPrice} ${ethPrice} ${downPercent} `);

        // const preNum = Number(prevPrice);

        if (curNum >= token.prevPrice) {
          token.prevPrice = curNum;
          return;
        }

        if (downPercent >= 0.05 && token.buyAmount > 0) {
          const returnProfile = (token.buyAmount * curNum) / Number(tokenPrice);
          token.buyAmount = 0;
          profile += returnProfile;
          logger.info(`S ${token.name} ${returnProfile} ${profile}`);
        }

        if (downPercent <= -0.1 && token.buyAmount === 0) {
          const buyEth = profile >= 0.01 ? 0.01 : profile;
          const buyNum = Number(tokenPrice) * buyEth;
          profile -= buyEth;
          logger.info(`B ${token.name} ${buyNum} ${profile}`);
        }

        token.prevPrice = curNum;
      });
    });
  }, 12000 * 6);
}

main();
