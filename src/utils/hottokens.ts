import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Pools, PoolTokenInfo } from "./pools.js";
import { Token } from "../token.js";
import logger from "./logger.js";
import constants from "../constants.js";
import eth from "./eth.js";
import tokens from "../tokens.js";

const PROXY_URL = "http://127.0.0.1:7890";

// let hotTokens: Token[] = [];
let hotTokens: Token[] = tokens.tokens;

function getHotTokens() {
  // 更新周期里面一次交易机会都没有的不参与后续跟踪
  hotTokens = hotTokens.filter((token) => token.tradeCount > 0);

  const options: AxiosRequestConfig = {
    method: "GET",
    url: "https://api.geckoterminal.com/api/v2/networks/eth/dexes/uniswap_v2/pools?page=1",
    headers: {
      accept: "application/json",
    },
    httpsAgent: new HttpsProxyAgent(PROXY_URL),
    proxy: false,
  };

  axios
    .request(options)
    .then(async function (response: AxiosResponse) {
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
      logger.info(
        "------------------------------------ hot tokens ------------------------------------"
      );
      const promises = poolTokens.map(async (pool) => {
        const ethAmount = await eth.getPoolEth(pool.address);
        if (ethAmount.valueOf() > constants.POOL_ETH_MIN) {
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

          logger.info(
            `${pool.symbol.padEnd(constants.SYMBAL_PAD + 8)} ${
              pool.address
            } ${ethAmount}`
          );
        }
      });

      await Promise.all(promises);

      // 亏损太多的暂时删除
      hotTokens = hotTokens.filter((token) => token.profit > -0.1);

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

getHotTokens();
setInterval(() => getHotTokens(), 3600000 * 4);

export default {
  tokens: hotTokens,
  getHotTokens,
};
