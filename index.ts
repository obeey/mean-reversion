import eth from "./src/utils/eth";
import logger from "./src/utils/logger";
import tokens from "./src/tokens";

const SYMBAL_PAD = 8;
const PRICE_PAD = 15;

let profile: number = 0.01;

function main() {
  logger.info("Starting profile...");

  setInterval(() => {
    logger.info(
      "++++++++++++++++++++++++++++++++++++++ PROFILING... ++++++++++++++++++++++++++++++++++++++"
    );

    tokens.forEach((token) => {
      logger.info(
        `\x1b[35m ${token.name.padEnd(SYMBAL_PAD)} $${token.prevPrice
          .toString()
          .padEnd(PRICE_PAD)} ${token.buyAmount} \x1b[0m`
      );

      eth.getMidPrice(token.address).then(([tokenPrice, ethPrice]) => {
        const curNum = Number(ethPrice);
        if (Number.isNaN(token.prevPrice)) {
          token.prevPrice = curNum;
          return;
        }

        const downPercent = (curNum - token.prevPrice) / token.prevPrice;
        logger.info(
          `\x1b[34m ${token.name.padEnd(SYMBAL_PAD)} ${tokenPrice
            .toString()
            .padEnd(PRICE_PAD)} ${ethPrice
            .toString()
            .padEnd(PRICE_PAD)} ${downPercent} \x1b[0m`
        );

        // const preNum = Number(prevPrice);

        if (curNum >= token.prevPrice) {
          token.prevPrice = curNum;
          return;
        }

        if (downPercent >= 0.05 && token.buyAmount > 0) {
          const returnProfile = (token.buyAmount * curNum) / Number(tokenPrice);
          token.buyAmount = 0;
          profile += returnProfile;
          logger.info(
            `\x1b[32mS ${token.name.padEnd(
              SYMBAL_PAD
            )} ${returnProfile} ${profile} \x1b[0m`
          );
        }

        if (downPercent <= -0.1 && token.buyAmount === 0) {
          const buyEth = profile >= 0.01 ? 0.01 : profile;
          const buyNum = Number(tokenPrice) * buyEth;
          profile -= buyEth;
          logger.info(
            `\x1b[31mB ${token.name.padEnd(
              SYMBAL_PAD
            )} ${buyNum} ${profile} \x1b[0m`
          );
        }

        token.prevPrice = curNum;
      });
    });
  }, 12000 * 6);
}

main();
