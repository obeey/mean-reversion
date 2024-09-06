import { ethers } from "ethers";
import { ChainId, Token, WETH9, CurrencyAmount } from '@uniswap/sdk-core'
import { Pair, Route } from '@uniswap/v2-sdk'
import FARMabi from './abi/FARMWETH.json'
console.log(`The chainId of mainnet is ${ChainId.MAINNET}.`)

const HTTP_PROVIDER_LINK = `https://eth-mainnet.g.alchemy.com/v2/HqMqCcOiNeA_LwLQWHo9ZIgU1V1IG8Q3`;

const provider = new ethers.JsonRpcProvider(HTTP_PROVIDER_LINK, ChainId.MAINNET);
// const signer = provider.getSigner();


/*
async function getDecimals(chainId: ChainId, tokenAddress: string): Promise<number> {
  // Setup provider, import necessary ABI ...
  const tokenContract = new ethers.Contract(tokenAddress, erc20abi, provider)
  return tokenContract["decimals"]()
}
*/

const chainId = ChainId.MAINNET
const tokenAddress = '0x6db6fdb5182053eecec778afec95e0814172a474' // must be checksummed
const decimals = 18

const DAI = new Token(chainId, tokenAddress, decimals)

async function createPair(DAI: Token): Promise<Pair> {
  const pairAddress = Pair.getAddress(DAI, WETH9[DAI.chainId])

  // Setup provider, import necessary ABI ...
  const pairContract = new ethers.Contract(pairAddress, FARMabi, provider)
  const reserves = await pairContract["getReserves"]()
  const [reserve0, reserve1] = reserves

  const tokens = [DAI, WETH9[DAI.chainId]]
  const [token0, token1] = tokens[0].sortsBefore(tokens[1]) ? tokens : [tokens[1], tokens[0]]

  const pair = new Pair(CurrencyAmount.fromRawAmount(token0, reserve0.toString()), CurrencyAmount.fromRawAmount(token1, reserve1.toString()))
  return pair
}

async function main() {

const pair = await createPair(DAI)

const route = new Route([pair], WETH9[DAI.chainId], DAI)

console.log(route.midPrice.toSignificant(6)) // 1901.08
console.log(route.midPrice.invert().toSignificant(6))
}

main()