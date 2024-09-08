import eth from "./src/utils/eth";
import logger from "./src/utils/logger";
import tokens from "./src/tokens";
import { canBuy, canSell } from "./src/utils/helper";

const SYMBAL_PAD = 8;
const PRICE_PAD = 15;

let profile: number = 0.03;

function main() {
  logger.info("Start profiling...");

  setInterval(() => {
    logger.info(
      `+++++++++++++++++++++++++++++++ PROFILING(\x1b[33m ${profile} \x1b[0m) +++++++++++++++++++++++++++++++`
    );

    tokens.tokens.forEach((token) => {
      logger.info(
        `\x1b[34m ${token.name.padEnd(SYMBAL_PAD)} ${token.historyPrice.length
          .toString()
          .padEnd(5)} ${token.buyAmount.toString().padEnd(SYMBAL_PAD + 2)} ${
          token.buyPrice
        } \x1b[0m`
      );

      eth.getMidPrice(token.address).then(([tokenPrice, ethPrice]) => {
        const curPrice = Number(ethPrice);
        if (!Number.isNaN(token.highPrice) && token.highPrice < curPrice) {
          token.highPrice = curPrice;
        }

        token.historyPrice.push(curPrice);
        if (token.historyPrice.length > tokens.MAX_HISTORY_PRICE_LEN) {
          token.historyPrice.shift();
        }

        const prevPrice = token.historyPrice[token.historyPrice.length - 2];
        const downPercent = (curPrice - prevPrice) / prevPrice;
        logger.info(
          `\x1b[35m ${token.name.padEnd(SYMBAL_PAD)} ${tokenPrice
            .toString()
            .padEnd(PRICE_PAD - 4)} ${ethPrice
            .toString()
            .padEnd(PRICE_PAD + 4)} ${downPercent * 100}% \x1b[0m`
        );

        if (token.buyAmount > 0) {
          if (canSell(token.historyPrice, token.buyPrice, token.highPrice)) {
            const returnProfile = token.buyAmount / Number(tokenPrice);
            token.buyAmount = 0;
            token.buyPrice = NaN;
            token.highPrice = NaN;
            profile += returnProfile;

            logger.info(
              `\x1b[32m S ${token.name.padEnd(
                SYMBAL_PAD
              )} ${returnProfile} ${profile} \x1b[0m`
            );
          }

          return;
        }

        if (token.buyAmount === 0 && canBuy(token.historyPrice)) {
          const buyEth = profile >= 0.01 ? 0.01 : profile;
          const buyNum = Number(tokenPrice) * buyEth;
          profile -= buyEth;
          token.buyAmount += buyNum;
          token.buyPrice = curPrice;
          token.highPrice = curPrice;
          token.historyPrice.length = 0;
          token.historyPrice.push(curPrice);

          logger.info(
            `\x1b[31m B ${token.name.padEnd(
              SYMBAL_PAD
            )} ${buyNum} ${profile} \x1b[0m`
          );
        }
      });
    });
  }, 12000);
}

main();
