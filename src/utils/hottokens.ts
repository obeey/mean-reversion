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
      largeLossTokens = largeLossTokens.concat(
        hotTokens.filter((token) => token.profit <= constants.TOKEN_LARGE_LOSS)
      );
      hotTokens = hotTokens.filter(
        (token) =>
          token.profit > constants.TOKEN_LARGE_LOSS || token.buyAmount > 0
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
          const ethAmount = await eth.getPoolEth(t.address);

          t.poolETH = ethAmount;

          if (Number.isNaN(t.decimals)) {
            t.decimals = await eth.getDecimals(constants.chainId, t.address);
          }
        }, delays++ * 1000)
      );

      logger.info(
        "------------------------------------ hot tokens ------------------------------------"
      );
      delays = 0;
      const promises = poolTokens.map(async (pool) =>
        setTimeout(async () => {
          const ethAmount = await eth.getPoolEth(pool.address);
          if (ethAmount.valueOf() > constants.POOL_ETH_MIN) {
            if (
              hotTokens.find((token) => token.name === pool.symbol) ||
              largeLossTokens.find((token) => token.name === pool.symbol)
            ) {
              return;
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
            hotTokens.push(token);

            logger.info(
              `${pool.symbol.padEnd(constants.SYMBAL_PAD + 8)} ${
                pool.address
              } ${ethAmount}`
            );
          }
        }, delays++ * 1000)
      );

      await Promise.all(promises);

      if (hotTokens.length > constants.MAX_TRACE_TOKENS) {
        /*
        const hotTokensTmp = await Promise.all(
          hotTokens.map(async (token) => {
            const poolEthValue = await eth.getPoolEth(token.address);
            return { ...token, poolEthValue: poolEthValue.valueOf() };
          })
        );

        // 按照 pool 中的 ETH 倒序，也就是 ETH 最多的 pool 踢出去
        hotTokens = hotTokensTmp
          .filter((t) => t.poolEthValue >= constants.POOL_ETH_MIN)
          .sort((a, b) => b.poolEthValue - a.poolEthValue)
          .slice(0, constants.MAX_TRACE_TOKENS)
          .map(({ poolEthValue, ...token }) => token);
        */
        hotTokens = hotTokens
          .filter((t) => t.poolETH >= constants.POOL_ETH_MIN || t.buyAmount > 0)
          .sort((a, b) => b.poolETH - a.poolETH + a.buyAmount)
          .slice(0, constants.MAX_TRACE_TOKENS);
      }

      if (largeLossTokens.length > 0) {
        logger.info(
          "----------------------------- large loss tokens ----------------------------"
        );
        largeLossTokens.forEach((token) =>
          logger.info(
            `${token.name.padEnd(constants.SYMBAL_PAD + 8)} ${token.address} ${
              token.profit
            }`
          )
        );
      }

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
setTimeout(() => {
  updateHotTokens(2);
  setInterval(() => updateHotTokens(2), 3600000);
}, 60000);

function getHotTokens() {
  return hotTokens;
}

export default {
  getHotTokens,
};
