import { Token } from "./src/token";
import eth from "./src/utils/eth";
import logger from "./src/utils/logger";
import tokens from "./src/tokens";
import helpers from "./src/utils/helper";
import constants from "./src/constants";

function main() {
  logger.info("Start profiling...");

  setInterval(async () => {
    const profile = await helpers.getProfile();

    const curProfile =
      tokens.tokens
        .filter((token: Token) => token.buyAmount > 0)
        .map(
          (token: Token) =>
            token.buyAmount * token.historyPrice[token.historyPrice.length - 1]
        )
        .reduce(
          (previousValue: any, currentValue: any) =>
            previousValue + currentValue,
          0
        ) + profile;

    const totalReturn = (
      ((curProfile - constants.INIT_PROFILE) / constants.INIT_PROFILE) *
      100
    ).toPrecision(2);

    logger.info(
      `+++++++++++++++++++++++++++++++ PROFILING(\x1b[33m ${profile
        .toString()
        .padEnd(
          constants.PRICE_PAD
        )} ${totalReturn}% \x1b[0m) +++++++++++++++++++++++++++++++`
    );

    tokens.tokens.forEach((token: Token) => {
      logger.info(
        `\x1b[34m ${token.name.padEnd(
          constants.SYMBAL_PAD
        )} ${token.historyPrice.length.toString().padEnd(5)} ${token.buyAmount
          .toPrecision(4)
          .toString()
          .padEnd(constants.SYMBAL_PAD + 2)} ${token.buyPrice
          .toString()
          .padEnd(constants.PRICE_PAD)} ${token.highPrice} \x1b[0m`
      );

      eth
        .getMidPrice(token.address)
        .then(([tokenPrice, ethPrice]: [string, string]) => {
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
            ((curPrice - token.buyPrice) / token.buyPrice) * 100;
          logger.info(
            `\x1b[35m ${token.name.padEnd(constants.SYMBAL_PAD)} ${tokenPrice
              .toString()
              .padEnd(constants.PRICE_PAD - 4)} ${ethPrice
              .toString()
              .padEnd(constants.PRICE_PAD + 4)} ${downPercent
              .toPrecision(4)
              .toString()
              .padStart(constants.PRICE_PAD)}% ${tradeProfilePercent
              .toPrecision(4)
              .toString()
              .padStart(constants.PRICE_PAD)}% \x1b[0m`
          );

          if (token.buyAmount > 0) {
            if (helpers.canSell(token)) {
              const returnProfile = token.buyAmount / Number(tokenPrice);
              token.buyAmount = 0;
              token.buyPrice = NaN;
              token.buyTimestamp = NaN;
              token.highPrice = NaN;
              helpers.addProfile(returnProfile);

              eth.sellToken(token.address);

              logger.info(
                `\x1b[32m S ${token.name.padEnd(
                  constants.SYMBAL_PAD
                )} ${returnProfile} ${profile} \x1b[0m`
              );
            }

            return;
          }

          if (token.buyAmount === 0 && helpers.canBuy(token.historyPrice)) {
            if (profile < constants.RESERVE_PROFILE) {
              logger.error(
                `B Profile too low ${profile} for Buy ${token.name}`
              );
            }

            const buyEth =
              profile >= constants.TRADE_AMOUNT
                ? constants.TRADE_AMOUNT
                : profile;
            const buyNum = Number(tokenPrice) * buyEth;
            if (buyNum <= 0) {
              logger.error(
                `B No money buy ${token.name.padEnd(
                  constants.SYMBAL_PAD
                )} ${profile}`
              );
              return;
            }

            helpers.subProfile(buyEth);
            token.buyAmount += buyNum;
            token.buyPrice = curPrice;
            token.buyTimestamp = Date.now();
            token.highPrice = curPrice;
            token.historyPrice.length = 0;
            token.historyPrice.push(curPrice);

            eth.buyToken(token.address, buyEth.toString());

            logger.info(
              `\x1b[31m B ${token.name.padEnd(
                constants.SYMBAL_PAD
              )} ${buyNum} ${profile} \x1b[0m`
            );
          }
        });
    });
  }, 12000);
}

main();
