export interface PoolTokenInfo {
  symbol: string;
  address: string;
}

export interface Pools {
  id: string;
  type: string;
  attributes: Attributes;
  relationships: Relationships;
}

interface Attributes {
  base_token_price_usd: number;
  base_token_price_native_currency: number;
  quote_token_price_usd: number;
  quote_token_price_native_currency: number;
  base_token_price_quote_token: number;
  quote_token_price_base_token: number;
  address: string;
  name: string;
  pool_created_at: date;
  fdv_usd: number;
  market_cap_usd: number;
  price_change_percentage: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  transactions: {
    m5: {
      buys: number;
      sells: number;
      buyers: number;
      sellers: number;
    };
    m15: {
      buys: number;
      sells: number;
      buyers: number;
      sellers: number;
    };
    m30: {
      buys: number;
      sells: number;
      buyers: number;
      sellers: number;
    };
    h1: {
      buys: number;
      sells: number;
      buyers: number;
      sellers: number;
    };
    h24: {
      buys: number;
      sells: number;
      buyers: number;
      sellers: number;
    };
  };
  volume_usd: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  reserve_in_usd: number;
}

interface Relationships {
  base_token: {
    data: {
      id: string;
      type: string;
    };
  };
  quote_token: {
    data: {
      id: string;
      type: string;
    };
  };
  dex: {
    data: {
      id: string;
      type: string;
    };
  };
}
