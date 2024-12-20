import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Pools, PoolTokenInfo } from "./pools.js";
import { Token } from "../token.js";
import logger from "./logger.js";
import constants from "../constants.js";
import eth from "./eth.js";
import tokens from "../tokens.js";
import { time } from "console";

const PROXY_URL = "http://127.0.0.1:7890";

let largeLossTokens: Token[] = tokens.largeLossTokens;
let hotTokens: Token[] = tokens.tokens;

function updateHotTokens(page: number = 1) {
  // 更新周期里面一次交易机会都没有的不参与后续跟踪
  // hotTokens = hotTokens.filter((token) => token.tradeCount > 0);

  const options: AxiosRequestConfig = {
    method: "GET",
    url:
      "https://api.geckoterminal.com/api/v2/networks/eth/dexes/uniswap_v2/pools?page=" +
      page,
    headers: {
      accept: "application/json",
    },
    httpsAgent: new HttpsProxyAgent(PROXY_URL),
    proxy: false,
  };

  axios
    .request(options)
    .then(async function (response: AxiosResponse) {
      // 亏损太多的暂时删除
      /*
      largeLossTokens = largeLossTokens.concat(
        hotTokens.filter((token) => token.profit <= constants.TOKEN_LARGE_LOSS)
      );
      */

      hotTokens = hotTokens.filter(
        (token) => token.poolETH > constants.POOL_ETH_MIN || token.buyAmount > 0
      );

      const pools = response.data.data as Pools[];
      // console.log(response.data.data);

      let poolTokens: PoolTokenInfo[] = pools
        .map((pool) => {
          const symbol = pool.attributes.name.split(" / ")[0].trim();
          const address = pool.relationships.base_token.data.id
            .split("_")[1]
            .trim();
          const reserve_in_usd = pool.attributes.reserve_in_usd;
          return { symbol, address, reserve_in_usd };
        })
        .filter(
          (token) =>
            token.symbol &&
            token.address &&
            token.symbol !== "WETH" &&
            !/[\u4e00-\u9fa5]/.test(token.symbol)
        );

      // let poolTokens: PoolTokenInfo[] = [];
      let delays = 0;
      hotTokens.forEach((t) =>
        setTimeout(async () => {
          try {
            const ethAmount = await eth.getPoolEth(t.address);

            t.poolETH = ethAmount;

            if (Number.isNaN(t.decimals)) {
              t.decimals = await eth.getDecimals(constants.chainId, t.address);
            }
          } catch (error) {
            logger.error(error);
          }
        }, delays++ * 1000)
      );

      let newTokens: Token[] = [];
      let doubleTokens: Token[] = [];
      logger.info(
        "------------------------------------ hot tokens ------------------------------------"
      );
      delays = 0;
      const promises = poolTokens.map(async (pool) =>
        setTimeout(async () => {
          try {
            const ethAmount = await eth.getPoolEth(pool.address);
            if (ethAmount.valueOf() > constants.POOL_ETH_MIN) {
              for (let i = hotTokens.length - 1; i >= 0; i--) {
                const token = hotTokens[i];
                if (token.name === pool.symbol) {
                  doubleTokens.push(token); // 将符合条件的 token 加入 doubleTokens
                  hotTokens.splice(i, 1); // 从 hotTokens 中删除该 token
                  return;
                }
              }

              const ts = await eth.getPairCreationTime(pool.address);
              if (ts) {
                logger.error(
                  `${pool.symbol} ${pool.address} Pair created at: ${new Date(
                    ts * 1000
                  ).toISOString()} . Too young.`
                );
                return;
              }

              let token: Token = {
                name: pool.symbol,
                decimals: Number(
                  await eth.getDecimals(constants.chainId, pool.address)
                ),
                poolETH: ethAmount,
                poolContract: await eth.getPoolContract(pool.address),
                buyTimestamp: NaN,
                buyPriceNum: 0,
                address: pool.address,
                historyPrice: [],
                pricePercent: [],
                pricePercentMa: [],
                buyPrice: NaN,
                highPrice: NaN,
                buyAmount: 0,
                buyEthCost: 0,
                buyGasUsed: 0,
                sellGasUsed: 0,
                sellPending: false,
                buyPending: false,
                profit: 0,
                tradeWin: 0,
                tradeCount: 0,
                profitWin: 0,
                profitLoss: 0,
              };
              // hotTokens.push(token);
              newTokens.push(token);

              logger.info(
                `${pool.symbol.padEnd(constants.SYMBAL_PAD + 8)} ${
                  pool.address
                } ${ethAmount}`
              );
            }
          } catch (error) {
            logger.error(error);
          }
        }, delays++ * 1000)
      );

      Promise.all(promises).finally(() =>
        setTimeout(() => {
          logger.info(
            `Tokens have ${hotTokens.length} double hit ${doubleTokens.length} new tokens ${newTokens.length} MAX ${constants.MAX_TRACE_TOKENS}`
          );

          // put double hit tokens to the front
          hotTokens = doubleTokens.concat(hotTokens);

          const totalTokens = hotTokens.length + newTokens.length;
          if (totalTokens <= constants.MAX_TRACE_TOKENS) {
            hotTokens = newTokens.concat(hotTokens);
            return;
          }

          const tokensToRemove = totalTokens - constants.MAX_TRACE_TOKENS;

          // 计算需要移除的元素数量
          let removedCount = 0;

          // 从后往前遍历 hotTokens
          for (let i = hotTokens.length - 1; i >= 0; i--) {
            if (removedCount >= tokensToRemove) {
              break; // 如果已经移除足够的元素，停止
            }

            // 检查 buyAmount 字段
            const token = hotTokens[i];
            if (token.buyAmount > 0) {
              continue; // 如果 buyAmount 大于 0，跳过当前元素
            }

            logger.info(
              `${token.name} \t\t ${token.address} ${token.profit} Removed`
            );

            hotTokens.splice(i, 1); // 移除当前元素
            removedCount++;
          }

          hotTokens = newTokens.concat(hotTokens);
        }, 180000)
      );

      /*
      hotTokens.filter(
        (token) =>
          token.buyAmount > 0 ||
          poolTokens.find((pool) => token.name === pool.symbol)
      );

      poolTokens.forEach((pool) => {
        logger.info(
          `${pool.symbol.padEnd(constants.SYMBAL_PAD + 8)} ${pool.address}`
        );
        if (hotTokens.find((token) => token.name === pool.symbol)) {
          return;
        }

        let token: Token = {
          name: pool.symbol,
          buyTimestamp: NaN,
          address: pool.address,
          historyPrice: [],
          buyPrice: NaN,
          highPrice: NaN,
          buyAmount: 0,
          buyEthCost: NaN,
          buyGasUsed: 0,
          sellGasUsed: 0,
          profit: 0,
          tradeWin: 0,
          tradeCount: 0,
        };
        hotTokens.push(token);
      });
      */
    })
    .catch(function (error) {
      console.error(error);
    });
}

updateHotTokens(1);
setInterval(() => updateHotTokens(1), 3600000);

/*
setTimeout(() => {
  updateHotTokens(2);
  setInterval(() => updateHotTokens(2), 3600000);
}, 60000);
*/

function getHotTokens() {
  return hotTokens;
}

export default {
  getHotTokens,
};
