import { Token } from "./src/token.js";
import eth from "./src/utils/eth.js";
import logger from "./src/utils/logger.js";
// import tokens from "./src/tokens.js";
import tokens from "./src/utils/hottokens.js";
import helpers from "./src/utils/helper.js";
import constants from "./src/constants.js";
import { error } from "console";

function main() {
  logger.info("Start profiling...");

  let TRADE_COUNT = 0;
  let TRADE_WIN = 0;

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
      `++++++++++++++++++++++++++ PROFILING(\x1b[33m ${profile
        .toFixed(5)
        .toString()
        .padEnd(
          constants.SYMBAL_PAD
        )} ${totalReturn}% W:${TRADE_WIN} C:${TRADE_COUNT} R:${(TRADE_COUNT ===
      0
        ? 0
        : TRADE_WIN / TRADE_COUNT
      ).toFixed(2)} \x1b[0m) ++++++++++++++++++++++++++`
    );

    tokens.tokens.forEach((token: Token) => {
      logger.info(
        `\x1b[34m ${token.name.padEnd(
          constants.SYMBAL_PAD
        )} ${token.historyPrice.length.toString().padEnd(5)} ${token.tradeWin
          .toString()
          .padEnd(4)} ${token.tradeCount
          .toString()
          .padEnd(4)} ${(token.tradeCount === 0
          ? 0
          : token.tradeWin / token.tradeCount
        )
          .toFixed(2)
          .toString()
          .padEnd(5)} ${token.profit
          .toPrecision(4)
          .toString()
          .padEnd(constants.SYMBAL_PAD + 2)} ${token.buyEthCost
          .toPrecision(4)
          .toString()
          .padEnd(constants.SYMBAL_PAD + 2)} ${token.buyPrice
          .toString()
          .padEnd(constants.PRICE_PAD)} ${token.highPrice} ${
          token.address
        } \x1b[0m`
      );

      try {
        eth
          .getMidPrice(token.address)
          .then(([tokenPrice, ethPrice]: [string, string]) => {
            const curPrice = Number(ethPrice);
            if (!Number.isNaN(token.highPrice) && token.highPrice < curPrice) {
              token.highPrice = curPrice;
            }

            token.historyPrice.push(curPrice);
            if (token.historyPrice.length > constants.MAX_HISTORY_PRICE_LEN) {
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

                eth.sellToken(token.address).then((gasUsed: string) => {
                  const gasUsedNum = Number(gasUsed);
                  if (!Number.isNaN(gasUsedNum)) token.sellGasUsed = gasUsedNum;

                  const profit =
                    returnProfile -
                    token.buyEthCost -
                    token.buyGasUsed -
                    token.sellGasUsed;
                  if (!Number.isNaN(profit)) token.profit += profit;

                  if (profit > 0) {
                    TRADE_WIN++;
                    token.tradeWin++;
                  }
                  TRADE_COUNT++;
                  token.tradeCount++;

                  token.buyEthCost = NaN;

                  logger.info(
                    `\x1b[32m S ${token.name.padEnd(
                      constants.SYMBAL_PAD
                    )} ${returnProfile} ${profit} \x1b[0m`
                  );
                });
              }

              return;
            }

            if (token.buyAmount === 0 && helpers.canBuy(token.historyPrice)) {
              if (
                profile <
                constants.RESERVE_PROFILE + constants.TRADE_AMOUNT_MIN
              ) {
                logger.error(
                  `B Profile too low ${profile} for Buy ${token.name}`
                );
                return;
              }

              const pGlobal = TRADE_COUNT == 0 ? 0.5 : TRADE_WIN / TRADE_COUNT;
              const p =
                token.tradeCount == 0
                  ? pGlobal
                  : token.tradeWin / token.tradeCount;
              const b = helpers.getOdds();
              let kelly = helpers.getKelly(b, p);

              if (kelly > 0.9) {
                logger.info(`Kelly too high K ${kelly} b ${b} p ${p}`);
                kelly = 0.9;
              }

              if (kelly < 0.2) {
                logger.info(`Kelly too low K ${kelly} b ${b} p ${p}`);
                kelly = 0.2;
              }

              let buyEth = profile * kelly;
              if (buyEth < constants.TRADE_AMOUNT_MIN)
                buyEth = constants.TRADE_AMOUNT_MIN;
              helpers.getProfile().then((profile) => {
                if (buyEth > profile - constants.RESERVE_PROFILE) {
                  /*
                logger.error(
                  `B No money buy ${token.name.padEnd(
                    constants.SYMBAL_PAD
                  )} Need: ${buyEth} Remain: ${profile}`
                );
                */
                  throw new Error(
                    `B No money buy ${token.name.padEnd(
                      constants.SYMBAL_PAD
                    )} Need: ${buyEth} Remain: ${profile}`
                  );
                }
              });
              /*
              buyEth =
                profile >= buyEth + constants.RESERVE_PROFILE
                  ? constants.TRADE_AMOUNT
                  : constants.TRADE_AMOUNT_MIN;
              */
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
              token.buyEthCost = buyEth;
              token.buyTimestamp = Date.now();
              token.highPrice = curPrice;
              token.historyPrice.length = 0;
              token.historyPrice.push(curPrice);

              eth
                .buyToken(token.address, buyEth.toString())
                .then((gasUsed: string) => {
                  const buyGasUsedNum = Number(gasUsed);
                  if (!Number.isNaN(buyGasUsedNum))
                    token.buyGasUsed = buyGasUsedNum;
                });

              logger.info(
                `\x1b[31m B ${token.name.padEnd(
                  constants.SYMBAL_PAD
                )} ${buyEth} ${kelly} p ${p} \x1b[0m`
              );
            }
          })
          .catch((error) => {
            logger.error(`Process ${token.name} failed. ${error}`);
            // helpers.fetchBestProvider();
          });
      } catch (error) {
        logger.error(`Process ${token.name} failed.`);
      }
    });
  }, 12000);
}

main();
