export interface Token {
  name: string;
  decimals: number;
  poolETH: number;
  buyTimestamp: number;
  address: string;
  historyPrice: number[];
  pricePercent: number[];
  pricePercentMa: number[];
  buyPrice: number;
  highPrice: number;
  buyAmount: number;
  buyEthCost: number;
  buyGasUsed: number;
  sellGasUsed: number;
  sellPending: boolean;
  buyPending: boolean;
  profit: number;
  tradeWin: number;
  tradeCount: number;
}
