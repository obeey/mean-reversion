export interface Token {
  name: string;
  buyTimestamp: number;
  address: string;
  historyPrice: number[];
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
