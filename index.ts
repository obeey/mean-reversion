import eth from "./src/utils/eth";
import logger from "./src/utils/logger";
import tokens from "./src/tokens";
import { canBuy, canSell } from "./src/utils/helper";

const SYMBAL_PAD = 8;
const PRICE_PAD = 15;

const INIT_PROFILE = 0.03;
let profile: number = INIT_PROFILE;

function main() {
  logger.info("Start profiling...");

  setInterval(() => {
    const curProfile =
      tokens.tokens
        .filter((token) => token.buyAmount > 0)
        .map(
          (token) =>
            token.buyAmount * token.historyPrice[token.historyPrice.length - 1]
        )
        .reduce(
          (previousValue, currentValue) => previousValue + currentValue,
          0
        ) + profile;

    const totalReturn = (
      ((curProfile - INIT_PROFILE) / INIT_PROFILE) *
      100
    ).toPrecision(2);

    logger.info(
      `+++++++++++++++++++++++++++++++ PROFILING(\x1b[33m ${profile
        .toString()
        .padEnd(
          PRICE_PAD
        )} ${totalReturn}% \x1b[0m) +++++++++++++++++++++++++++++++`
    );

    tokens.tokens.forEach((token) => {
      logger.info(
        `\x1b[34m ${token.name.padEnd(SYMBAL_PAD)} ${token.historyPrice.length
          .toString()
          .padEnd(5)} ${token.buyAmount
          .toPrecision(4)
          .toString()
          .padEnd(SYMBAL_PAD + 2)} ${token.buyPrice
          .toString()
          .padEnd(PRICE_PAD)} ${token.highPrice} \x1b[0m`
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
        const downPercent = ((curPrice - prevPrice) / prevPrice) * 100;
        const tradeProfilePercent =
          ((token.buyPrice - curPrice) / token.buyPrice) * 100;
        logger.info(
          `\x1b[35m ${token.name.padEnd(SYMBAL_PAD)} ${tokenPrice
            .toString()
            .padEnd(PRICE_PAD - 4)} ${ethPrice
            .toString()
            .padEnd(PRICE_PAD + 4)} ${downPercent
            .toPrecision(4)
            .toString()
            .padStart(PRICE_PAD)}% ${tradeProfilePercent
            .toPrecision(4)
            .toString()
            .padStart(PRICE_PAD)}% \x1b[0m`
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
