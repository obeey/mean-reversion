import { Token } from "./src/token.js";
import eth from "./src/utils/eth.js";
import logger from "./src/utils/logger.js";
import tokens from "./src/utils/hottokens.js";
import helpers from "./src/utils/helper.js";
import constants from "./src/constants.js";

function main() {
  logger.info("Start profiling...");

  let TRADE_COUNT = 0;
  let TRADE_WIN = 0;
  let totalProfit = 0;
  let winProfit = 0;
  let lossProfit = 0;

  let runLoops = 0;
  // let startSkip = 0;
  setInterval(async () => {
    // if (startSkip > 0) {
    //   runLoops++;
    //   startSkip--;
    //   return;
    // }

    const profile = await helpers.getProfile();

    if (runLoops % 12 == 0) {
      const curProfile =
        tokens
          .getHotTokens()
          .filter((token: Token) => token.buyAmount > 0)
          .map(
            (token: Token) =>
              token.buyAmount *
              token.historyPrice[token.historyPrice.length - 1]
          )
          .reduce(
            (previousValue: any, currentValue: any) =>
              previousValue + currentValue,
            0
          ) + profile;

      const totalReturn = (
        ((curProfile - constants.INIT_PROFILE) / constants.INIT_PROFILE) *
        100
      ).toFixed(2);

      logger.info(
        ` ++++++++++++++++++++++++++++++++++++++ PROFILING(\x1b[33m ${totalProfit
          .toFixed(5)
          .toString()
          .padEnd(constants.SYMBAL_PAD)} ${curProfile
          .toFixed(5)
          .toString()
          .padEnd(constants.SYMBAL_PAD)} ${profile
          .toFixed(5)
          .toString()
          .padEnd(
            constants.SYMBAL_PAD
          )} ${totalReturn}% W:${TRADE_WIN} C:${TRADE_COUNT} R:${(TRADE_COUNT ===
        0
          ? 0
          : TRADE_WIN / TRADE_COUNT
        ).toFixed(2)} ${(lossProfit == 0 || TRADE_WIN == 0
          ? 0
          : (winProfit * (TRADE_COUNT - TRADE_WIN)) / (lossProfit * TRADE_WIN)
        ).toFixed(2)} \x1b[0m) ++++++++++++++++++++++++++++++++++++++`
      );
    }

    tokens.getHotTokens().forEach((token: Token) => {
      if (runLoops % 12 == 0) {
        const curPrice = token.historyPrice[token.historyPrice.length - 1];
        const tradeProfilePercent: number =
          ((curPrice - token.buyPrice) / token.buyPrice) * 100;

        logger.info(
          `\x1b[34m ${token.name.padEnd(constants.SYMBAL_PAD + 8)} ${
            token.address
          } ${token.poolETH
            .toFixed(4)
            .padEnd(constants.SYMBAL_PAD)} ${token.historyPrice.length
            .toString()
            .padEnd(5)} ${token.tradeWin
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
            .toFixed(4)
            .toString()
            .padEnd(constants.SYMBAL_PAD + 2)} ${token.buyEthCost
            .toFixed(4)
            .toString()
            .padEnd(constants.SYMBAL_PAD + 2)} ${token.buyPrice
            .toString()
            .padEnd(constants.PRICE_PAD + 2)} ${tradeProfilePercent.toFixed(
            4
          )}% \x1b[0m`
        );
      }

      try {
        eth
          // .getPrice(token.address, token.decimals)
          .getPrice(token)
          .then(
            async ([ethPrice, reserveETH, reserveToken]: [
              number,
              number,
              number
            ]) => {
              const curPrice = ethPrice;

              if (curPrice == token.historyPrice[token.historyPrice.length - 1])
                return;

              token.buyPriceNum++;
              // startSkip = 10;

              if (
                !Number.isNaN(token.highPrice) &&
                token.highPrice < curPrice
              ) {
                token.highPrice = curPrice;
              }

              token.historyPrice.push(curPrice);
              if (token.historyPrice.length > constants.MAX_HISTORY_PRICE_LEN) {
                token.historyPrice.shift();
              }

              // let highPrice = Math.max(...token.historyPrice);
              /*
              let prevPrice = token.historyPrice[token.historyPrice.length - 1];
              if (curPrice == prevPrice) {
                prevPrice = token.historyPrice[token.historyPrice.length - 2];
              }
              */

              // const downPercent: number =
              //   ((curPrice - highPrice) / highPrice) * 100;
              // const tradeProfilePercent: Number = ((curPrice - token.buyPrice) / token.buyPrice) * 100;

              if (!helpers.calcPrice(token)) {
                return;
              }

              const curPercentPrice =
                token.pricePercent[token.pricePercent.length - 1];
              logger.info(
                `\x1b[35m ${token.name.padEnd(constants.SYMBAL_PAD)} ${
                  token.address
                } ${ethPrice.toString().padEnd(constants.PRICE_PAD + 5)} \t ${(
                  curPercentPrice * 100
                ).toFixed(4)}% ${token.buyPending} \t ${
                  token.sellPending
                } \x1b[0m`
              );

              const buyAmount = await helpers.getBuyAmount(token);
              if (buyAmount === 0n && token.buyAmount !== 0) {
                logger.warn(
                  `\x1b[31m ${token.name.padEnd(constants.SYMBAL_PAD)} ${
                    token.address
                  } set buy amount( ${token.buyAmount} ) to 0 \x1b[0m`
                );

                token.buyAmount = 0;
              }

              if (!token.sellPending && buyAmount > 0) {
                if (helpers.canSell(token)) {
                  token.sellPending = true;

                  eth
                    .sellToken(token.address, token.decimals)
                    .then((gasUsed: string) => {
                      token.sellPending = false;

                      const gasUsedNum = Number(gasUsed);
                      if (!Number.isNaN(gasUsedNum))
                        token.sellGasUsed = gasUsedNum;

                      const returnProfile =
                        reserveETH -
                        (reserveETH * reserveToken) /
                          (reserveToken + token.buyAmount * 0.997);
                      token.buyTimestamp = NaN;
                      token.buyAmount = 0;
                      token.buyPrice = NaN;
                      token.highPrice = NaN;

                      helpers.addProfile(returnProfile);
                      const profit =
                        returnProfile -
                        token.buyEthCost -
                        token.buyGasUsed -
                        token.sellGasUsed;
                      if (!Number.isNaN(profit)) {
                        token.profit += profit;
                        totalProfit += profit;
                      } else {
                        logger.error("Sell Profit not add.");
                      }

                      if (profit > 0) {
                        winProfit += profit;
                        token.profitWin += profit;
                        TRADE_WIN++;
                        token.tradeWin++;
                      } else {
                        lossProfit -= profit;
                        token.profitLoss -= profit;
                      }

                      TRADE_COUNT++;
                      token.tradeCount++;

                      token.buyEthCost = 0;

                      logger.warn(
                        `\x1b[32m S ${token.name.padEnd(
                          constants.SYMBAL_PAD
                        )} ${
                          token.address
                        } Return ${returnProfile} Profit ${profit} Price ${curPrice} GAS ${gasUsed}ETH \x1b[0m`
                      );
                    })
                    .catch((error) => {
                      token.sellPending = false;
                      logger.warn(
                        `\x1b[32m S ${token.name.padEnd(
                          constants.SYMBAL_PAD
                        )} ${token.address} ${curPrice} ETH failed. \x1b[0m`
                      );
                      logger.error(error);
                    });
                }

                return;
              }

              if (
                !token.buyPending &&
                buyAmount === 0n &&
                helpers.canBuy(token)
              ) {
                /*
                if (
                  profile <
                  constants.RESERVE_PROFILE + constants.TRADE_AMOUNT_MIN
                ) {
                  logger.warn(
                    `B Profile too low ${profile} for Buy ${token.name}`
                  );
                  return;
                }

                const pGlobal =
                  TRADE_COUNT < constants.KELLY_DEFAULT
                    ? constants.KELLY_P
                    : TRADE_WIN / TRADE_COUNT;
                const bGlobal =
                  TRADE_COUNT < constants.KELLY_DEFAULT ||
                    lossProfit == 0 ||
                    winProfit == 0
                    ? helpers.getOdds()
                    : (winProfit * (TRADE_COUNT - TRADE_WIN)) /
                    (lossProfit * TRADE_WIN);
                const p =
                  token.tradeCount < constants.KELLY_TOKEN_DEFAULT
                    ? pGlobal
                    : token.tradeWin / token.tradeCount;
                const b =
                  token.tradeCount < constants.KELLY_TOKEN_DEFAULT ||
                    token.profitLoss == 0 ||
                    token.profitWin == 0
                    ? bGlobal
                    : (token.profitWin * (token.tradeCount - token.tradeWin)) /
                    (token.profitLoss * token.tradeWin);
                let kelly = helpers.getKelly(b, p);

                if (kelly > 0.9) {
                  logger.info(`Kelly too high K ${kelly} b ${b} p ${p}`);
                  kelly = 0.9;
                }

                let buyEth = profile * kelly;
                if (buyEth < constants.TRADE_AMOUNT_MIN) {
                  logger.warn(
                    `${token.name} Kelly too low K ${kelly} b ${b} p ${p} to buy ${buyEth}ETH`
                  );
                  // buyEth = constants.TRADE_AMOUNT_MIN;
                  return;
                }

                const nowProfile = await helpers.getProfile();
                if (buyEth > nowProfile - constants.RESERVE_PROFILE) {
                  logger.warn(
                    `B No money buy ${token.name.padEnd(
                      constants.SYMBAL_PAD
                    )} Need: ${buyEth} Remain: ${profile}`
                  );
                  return;
                }
                */

                const nowProfile = await helpers.getProfile();
                let buyEth = nowProfile - constants.RESERVE_PROFILE;
                const maxEthBuy = eth.getMaxTradeEth(token);
                if (
                  maxEthBuy < constants.TRADE_AMOUNT_MIN ||
                  buyEth < constants.TRADE_AMOUNT_MIN
                ) {
                  logger.warn(
                    `B ${token.name} Max ETH to buy ${maxEthBuy} or ${buyEth} less then MIN ${constants.TRADE_AMOUNT_MIN}`
                  );
                  return;
                }

                if (buyEth > maxEthBuy) {
                  buyEth = maxEthBuy;
                }

                /*
              buyEth =
                profile >= buyEth + constants.RESERVE_PROFILE
                  ? constants.TRADE_AMOUNT
                  : constants.TRADE_AMOUNT_MIN;
              */
                const buyNum =
                  reserveToken -
                  (reserveETH * reserveToken) / (reserveETH + buyEth * 0.997);
                if (buyNum <= 0) {
                  logger.error(
                    `B No money buy ${token.name.padEnd(
                      constants.SYMBAL_PAD
                    )} ${profile}`
                  );
                  return;
                }

                token.buyPending = true;

                eth
                  .buyToken(token.address, buyEth)
                  .then(async (gasUsed: string) => {
                    token.buyPending = false;

                    const newPrice = curPrice;
                    token.buyAmount += buyNum;
                    token.buyPrice = newPrice;
                    token.buyEthCost += buyEth;
                    token.buyTimestamp = Date.now();
                    token.highPrice = newPrice;
                    token.buyPriceNum = 0;
                    // token.historyPrice.length = 0;
                    // token.historyPrice.push(newPrice);

                    logger.warn(
                      ` B ${token.name} ${buyEth}ETH for Price ${token.buyPrice} GAS ${gasUsed}`
                    );

                    const buyGasUsedNum = Number(gasUsed);
                    if (!Number.isNaN(buyGasUsedNum)) {
                      token.buyGasUsed = buyGasUsedNum;
                    }
                    helpers.subProfile(buyEth);
                  })
                  .catch((error) => {
                    token.buyPending = false;
                    logger.error(error);
                  });

                // logger.warn(
                //   `\x1b[31m B ${token.name.padEnd(constants.SYMBAL_PAD)} ${token.address
                //   } ${buyEth} k ${kelly} b ${b} p ${p} ${curPrice} ETH\x1b[0m`
                // );
                logger.warn(
                  `\x1b[31m B ${token.name.padEnd(constants.SYMBAL_PAD)} ${
                    token.address
                  } ${buyEth} ${curPrice} ETH\x1b[0m`
                );
              }
            }
          )
          .catch((error) => {
            logger.error(`Process ${token.name} failed. ${error}`);
            // helpers.fetchBestProvider();
          });
      } catch (error) {
        logger.error(`Process ${token.name} failed.`);
      }
    });

    runLoops++;
  }, 1000);
}

main();
