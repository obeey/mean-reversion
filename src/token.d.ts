export interface Token {
  name: string;
  address: string;
  historyPrice: number[];
  buyPrice: number;
  highPrice: number;
  buyAmount: number;
  buyEthCost: number;
  buyGasUsed: string;
  sellGasUsed: string;
  buyTimestamp: number;
}
