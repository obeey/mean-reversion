import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Pools } from "./pools.js";
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

      hotTokens.filter((token) => token.buyAmount > 0);

      pools.forEach((pool) => {
        const symbol = pool.attributes.name.split(" / ")[0].trim();
        const address = pool.relationships.base_token.data.id
          .split("_")[1]
          .trim();

        const regex = /[\u4e00-\u9fa5]/; // 汉字的 Unicode 范围
        if (symbol === "WETH" || regex.test(symbol)) {
          return;
        }

        logger.info(`${symbol.padEnd(constants.SYMBAL_PAD)} ${address}`);

        if (
          symbol &&
          address &&
          !hotTokens.find((token) => token.name === symbol)
        ) {
          let token: Token = {
            name: symbol,
            address: address,
            historyPrice: [],
            buyPrice: NaN,
            highPrice: NaN,
            buyAmount: 0,
            buyEthCost: NaN,
            buyGasUsed: "",
            sellGasUsed: "",
            buyTimestamp: NaN,
          };
          hotTokens.push(token);
        }
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
