import { ethers } from "ethers";
import { ChainId, Token, WETH9, CurrencyAmount } from '@uniswap/sdk-core'
import { Pair, Route } from '@uniswap/v2-sdk'
import poolabi from '../abi/uniswap-pool.abi.json'
import erc20abi from '../abi/erc20.abi.json'
import HTTP_PROVIDER_LINK from '../constants'


const provider = new ethers.JsonRpcProvider(HTTP_PROVIDER_LINK.HTTP_PROVIDER_LINK, ChainId.MAINNET);

async function getDecimals(chainId: ChainId, tokenAddress: string): Promise<number> {
  const tokenContract = new ethers.Contract(tokenAddress, erc20abi, provider)
  return tokenContract["decimals"]()
}

const chainId = ChainId.MAINNET

async function createPair(token: Token): Promise<Pair> {
  const pairAddress = Pair.getAddress(token, WETH9[token.chainId])

  // Setup provider, import necessary ABI ...
  const pairContract = new ethers.Contract(pairAddress, poolabi, provider)
  const reserves = await pairContract["getReserves"]()
  const [reserve0, reserve1] = reserves

  const tokens = [token, WETH9[token.chainId]]
  const [token0, token1] = tokens[0].sortsBefore(tokens[1]) ? tokens : [tokens[1], tokens[0]]

  const pair = new Pair(CurrencyAmount.fromRawAmount(token0, reserve0.toString()), CurrencyAmount.fromRawAmount(token1, reserve1.toString()))
  return pair
}

async function getMidPrice(tokenAddress: string): Promise<[string, string]> {
  const decimals = await getDecimals(ChainId.MAINNET, tokenAddress)
  // console.log(`decimals ${decimals} ${typeof(decimals)}`)

  const token = new Token(chainId, tokenAddress, Number(decimals))


  const pair = await createPair(token)

  const route = new Route([pair], WETH9[token.chainId], token)

  /*
  console.log(route.midPrice.toSignificant(6)) // 1901.08
  console.log(route.midPrice.invert().toSignificant(6))
  */

  return [route.midPrice.toSignificant(6), route.midPrice.invert().toSignificant(6)]
}

export default {
  getMidPrice: getMidPrice
}