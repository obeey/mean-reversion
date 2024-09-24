import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Pools, PoolTokenInfo } from "./pools.js";
import { Token } from "../token.js";
import logger from "./logger.js";
import constants from "../constants.js";

const PROXY_URL = "http://127.0.0.1:7890";

let hotTokens: Token[] = [];

function getHotTokens() {
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
    .then(function (response: AxiosResponse) {
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
            token.symbol !== "WETH" &&
            !/[\u4e00-\u9fa5]/.test(token.symbol) &&
            token.reserve_in_usd > 100000 &&
            token.symbol &&
            token.address
        );

      hotTokens.filter(
        (token) =>
          token.buyAmount > 0 ||
          poolTokens.find((pool) => token.name === pool.symbol)
      );

      logger.info(
        "------------------------- hot tokens -------------------------"
      );
      poolTokens.forEach((pool) => {
        logger.info(
          `${pool.symbol.padEnd(constants.SYMBAL_PAD)} ${pool.address}`
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
    })
    .catch(function (error) {
      console.error(error);
    });
}

getHotTokens();
setInterval(() => getHotTokens(), 3600000);

export default {
  tokens: hotTokens,
  getHotTokens,
};
